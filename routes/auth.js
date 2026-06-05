const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { decrypt } = require("../utils/crypto");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "nept0n_s3cur3_k3y_2024!";

// Register - employee self-registration
router.post("/register", async (req, res) => {
  try {
    const { username, password, displayName, department } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    if (username.length < 3) return res.status(400).json({ error: "Username must be at least 3 characters" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    if (!department) return res.status(400).json({ error: "Department is required" });
    // Cloudflare Turnstile verification
    const cfToken2 = req.body.cfToken;
    if (process.env.CF_TURNSTILE_SECRET) {
      try {
        const cfResp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret: process.env.CF_TURNSTILE_SECRET, response: cfToken2 || "", remoteip: req.ip })
        });
        const cfData = await cfResp.json();
        if (!cfData.success) return res.status(403).json({ error: "CAPTCHA verification failed. Please try again." });
      } catch (e) { /* Allow if Cloudflare is down */ }
    }
    const exists = await User.findOne({ username, role: "employee" });
    if (exists) return res.status(409).json({ error: "Username already taken" });
    const user = new User({ username, password, role: "employee", displayName: displayName || username, department });
    await user.save();
    const token = jwt.sign({ id: user._id, role: "employee", username: user.username, displayName: user.displayName, department: user.department }, JWT_SECRET, { expiresIn: "8h" });
    res.status(201).json({ success: true, token, role: "employee", username: user.username, displayName: user.displayName, department: user.department });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// Login - returns JWT token
router.post("/login", async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) return res.status(400).json({ error: "Missing fields" });
    // Cloudflare Turnstile verification
  const cfToken = req.body.cfToken;
  if (process.env.CF_TURNSTILE_SECRET) {
    try {
      const cfResp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: process.env.CF_TURNSTILE_SECRET, response: cfToken || "", remoteip: req.ip })
      });
      const cfData = await cfResp.json();
      if (!cfData.success) return res.status(403).json({ error: "CAPTCHA verification failed. Please try again." });
    } catch (e) { /* Allow if Cloudflare is down */ }
  }
  const user = await User.findOne({ username, role });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user._id, role: user.role, username: user.username, displayName: user.displayName || user.username, department: user.department || "" }, JWT_SECRET, { expiresIn: "8h" });
    res.json({ success: true, token, role: user.role, username: user.username, displayName: decrypt(user.displayName) || user.username, department: user.department || "" });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// Reset password - requires OTP verification (handled client-side for demo)
router.post("/update-department", async (req, res) => {
  try {
    const { username, department } = req.body;
    if (!username || !department) return res.status(400).json({ error: "Missing fields" });
    const user = await User.findOne({ username, role: "employee" });
    if (!user) return res.status(404).json({ error: "User not found" });
    user.department = department;
    await user.save();
    res.json({ success: true, department: user.department });
  } catch (e) { res.status(500).json({ error: "Server error" }); }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { role, newPassword } = req.body;
    if (!role || !newPassword) return res.status(400).json({ error: "Missing fields" });
    if (newPassword.length < 6) return res.status(400).json({ error: "Password too short" });
    const user = await User.findOne({ role });
    if (!user) return res.status(404).json({ error: "User not found" });
    user.password = newPassword;
    await user.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
