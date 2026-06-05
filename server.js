require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");

const app = express();

// Trust Railway's proxy (needed for HTTPS detection)
app.set("trust proxy", 1);

// Force HTTPS redirect in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production" && req.headers["x-forwarded-proto"] !== "https") {
    return res.redirect(301, "https://" + req.headers.host + req.url);
  }
  next();
});

// Security middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(mongoSanitize());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json({ limit: "20mb" }));

// Rate limiting
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: parseInt(process.env.API_RATE_LIMIT) || 2000, message: { error: "Too many requests, slow down" } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: parseInt(process.env.AUTH_RATE_LIMIT) || 500, message: { error: "Too many login attempts, try again later" } });
app.use("/api/", apiLimiter);
app.use("/api/auth/", authLimiter);

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

app.use(express.static(path.join(__dirname, "public")));

// Routes
// Cloudflare Turnstile CAPTCHA verification
async function verifyCaptcha(token, ip) {
  const secret = process.env.CF_TURNSTILE_SECRET;
  if (!secret) return true; // Skip if not configured
  if (!token) return false;
  try {
    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: ip })
    });
    const data = await resp.json();
    return data.success === true;
  } catch (e) { return true; } // Allow if Cloudflare is down
}

// Serve site key to frontend
app.get("/api/captcha-key", (req, res) => {
  res.json({ siteKey: process.env.CF_TURNSTILE_SITEKEY || "" });
});

app.use("/api/tickets", require("./routes/tickets"));
app.use("/api/auth", require("./routes/auth"));

// Settings API (stores AI access level)

// Fast AI hint for new tickets — minimal tokens, fastest model
app.post("/api/ai/hint", async (req, res) => {
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.json({ hint: "" });
  try {
    const { subject, description, imageData } = req.body;
    if (!subject) return res.json({ hint: "" });
    const isAr = /[\u0600-\u06FF]/.test(subject + description);
    // Check if hint vision is allowed by admin
    const db2 = require("mongoose").connection.db;
    const hintVisionSetting = await db2.collection("settings").findOne({ key: "hint-vision" });
    const hintVisionAllowed = hintVisionSetting?.value !== false;
    const hasImage = hintVisionAllowed && imageData && imageData.startsWith("data:image");
    
    let messages;
    if (hasImage) {
      // Vision model for image diagnosis
      const textPrompt = isAr 
        ? `أنت فني IT. الموظف أبلغ عن: "${subject}". حلل الصورة واعطِ 2-3 خطوات لحل المشكلة. ثلاث جمل فقط.`
        : `You are an IT tech. Employee reported: "${subject}". Analyze the image and give 2-3 quick diagnostic steps. Three sentences max.`;
      messages = [{ role: "user", content: [{ type: "text", text: textPrompt }, { type: "image_url", image_url: { url: imageData } }] }];
    } else {
      const textPrompt = isAr 
        ? `أنت فني IT. الموظف أبلغ عن: "${subject}" - "${(description||"").slice(0,150)}". اعطِ 2-3 خطوات سريعة لحل المشكلة. جملتين فقط.`
        : `You are an IT tech. Employee reported: "${subject}" - "${(description||"").slice(0,150)}". Give 2-3 quick steps to fix it. Two sentences max.`;
      messages = [{ role: "user", content: textPrompt }];
    }
    
    const model = hasImage ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.1-8b-instant";
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + GROQ_KEY },
      body: JSON.stringify({ model, messages, max_tokens: 200, temperature: 0.3 })
    });
    const data = await resp.json();
    const hint = data.choices?.[0]?.message?.content || "";
    res.json({ hint });
  } catch (e) { res.json({ hint: "" }); }
});

app.get("/api/settings/ai-access", async (req, res) => {
  try {
    const Ticket = require("./models/Ticket");
    // Use a special "settings" document in tickets collection (hacky but works without new model)
    const db = require("mongoose").connection.db;
    const settings = await db.collection("settings").findOne({ key: "ai-access" });
    res.json({ level: settings?.value || "admin" });
  } catch (e) { res.json({ level: "admin" }); }
});
app.post("/api/settings/ai-access", async (req, res) => {
  try {
    const db = require("mongoose").connection.db;
    await db.collection("settings").updateOne({ key: "ai-access" }, { $set: { key: "ai-access", value: req.body.level || "admin" } }, { upsert: true });
    res.json({ success: true, level: req.body.level });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// Vision AI access setting
app.get("/api/settings/vision-access", async (req, res) => {
  try {
    const db = require("mongoose").connection.db;
    const s = await db.collection("settings").findOne({ key: "vision-access" });
    res.json({ level: s?.value || "all" });
  } catch (e) { res.json({ level: "all" }); }
});
app.post("/api/settings/vision-access", async (req, res) => {
  try {
    const db = require("mongoose").connection.db;
    await db.collection("settings").updateOne({ key: "vision-access" }, { $set: { key: "vision-access", value: req.body.level || "all" } }, { upsert: true });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══ NOTIFICATION SYSTEM ═══
const Notification = require("./models/Notification");

// Get notifications for a user
app.get("/api/notifications", async (req, res) => {
  try {
    const user = req.query.user || "admin";
    const notifs = await Notification.find({ recipient: user }).sort({ createdAt: -1 }).limit(50).lean();
    const unread = await Notification.countDocuments({ recipient: user, read: false });
    res.json({ notifications: notifs, unread });
  } catch (e) { res.json({ notifications: [], unread: 0 }); }
});

// Mark notifications as read
app.post("/api/notifications/read", async (req, res) => {
  try {
    const user = req.body.user || "admin";
    await Notification.updateMany({ recipient: user, read: false }, { $set: { read: true } });
    res.json({ success: true });
  } catch (e) { res.json({ success: false }); }
});

// Create notification (internal helper)
async function notify(recipient, type, ticketId, title, message) {
  try {
    await Notification.create({ recipient, type, ticketId, title, message });
  } catch (e) { console.error("Notification error:", e.message); }
}

// Encrypt all existing plain-text data in database
app.get("/api/migrate-encrypt", async (req, res) => {
  try {
    const Ticket = require("./models/Ticket");
    const User = require("./models/User");
    const { encrypt, decrypt } = require("./utils/crypto");
    
    let ticketsFixed = 0, usersFixed = 0;
    
    // Encrypt ticket personal data
    const tickets = await Ticket.find().lean();
    for (const t of tickets) {
      const updates = {};
      if (t.employeeName && !t.employeeName.startsWith("E:")) {
        updates.employeeName = encrypt(t.employeeName);
      }
      if (t.email && !t.email.startsWith("E:")) {
        updates.email = encrypt(t.email);
      }
      if (Object.keys(updates).length > 0) {
        await Ticket.updateOne({ _id: t._id }, { $set: updates });
        ticketsFixed++;
      }
    }
    
    // Encrypt user personal data (displayName, department, username for employees)
    const users = await User.find({ role: "employee" }).lean();
    for (const u of users) {
      const updates = {};
      if (u.displayName && !u.displayName.startsWith("E:")) {
        updates.displayName = encrypt(u.displayName);
      }
      if (Object.keys(updates).length > 0) {
        await User.updateOne({ _id: u._id }, { $set: updates });
        usersFixed++;
      }
    }
    
    res.json({ 
      success: true, 
      message: "Migration complete!",
      ticketsEncrypted: ticketsFixed,
      totalTickets: tickets.length,
      usersEncrypted: usersFixed,
      totalUsers: users.length
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Email test endpoint (uses Resend HTTP API)
app.get("/api/test-email", async (req, res) => {
  const key = process.env.RESEND_API_KEY;
  if (!key) return res.json({ error: "RESEND_API_KEY not set. Add it to Railway variables. Get free key at resend.com" });
  
  const to = req.query.to || "delivered@resend.dev";
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({
        from: "Nepton IT <onboarding@resend.dev>",
        to: [to],
        subject: "Nepton IT Support — Email Test",
        html: "<div style='font-family:Arial;padding:20px;background:#0a1929;color:#e2e8f0;border-radius:10px'><h2 style='color:#38bdf8'>Email Working! ✅</h2><p>Nepton IT email notifications are configured correctly.</p></div>"
      })
    });
    const data = await resp.json();
    res.json(data.id ? { success: true, id: data.id, sent_to: to } : { error: data });
  } catch (e) { res.json({ error: e.message }); }
});

// Notify/Call employee by email
app.post("/api/tickets/:id/notify", async (req, res) => {
  try {
    const Ticket = require("./models/Ticket");
    const mail = require("./utils/mail");
    const { decryptFields } = require("./utils/crypto");
    const raw = await Ticket.findById(req.params.id).lean();
    if (!raw) return res.status(404).json({ error: "Ticket not found" });
    const ticket = decryptFields(raw, ["employeeName", "email"]);
    const type = req.body.type || "mention"; // mention or call
    const sender = req.body.sender || "IT Support";
    const message = req.body.message || "";
    await mail.notifyMention(ticket, sender, type, message);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Employee notify admin (1 per ticket)
app.post("/api/tickets/:id/notify-admin", async (req, res) => {
  try {
    const Ticket = require("./models/Ticket");
    const mail = require("./utils/mail");
    const { decryptFields } = require("./utils/crypto");
    const raw = await Ticket.findById(req.params.id).lean();
    if (!raw) return res.status(404).json({ error: "Ticket not found" });
    const ticket = decryptFields(raw, ["employeeName", "email"]);
    const sender = req.body.sender || "Employee";
    const message = req.body.message || "";
    
    // Send to admin email (SMTP_USER or admin's email)
    const adminEmail = process.env.SMTP_USER || process.env.ADMIN_EMAIL || "";
    if (adminEmail) {
      await mail.send(adminEmail, 
        "📢 Employee " + sender + " needs attention — " + ticket.ticketId,
        mail.buildAdminNotify ? mail.buildAdminNotify(ticket, sender, message) :
        "<div style='font-family:Arial;padding:20px;background:#0a1929;color:#e2e8f0;border-radius:10px'>" +
        "<h2 style='color:#38bdf8'>📢 Employee Mention</h2>" +
        "<p><strong>" + sender + "</strong> is requesting attention on ticket <strong>" + ticket.ticketId + "</strong></p>" +
        "<p>Subject: " + ticket.subject + "</p>" +
        (message ? "<p>Message: " + message + "</p>" : "") +
        "<p style='color:#546E7A;font-size:11px;margin-top:16px'>Nepton IT Support</p></div>"
      );
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Hint vision toggle
app.get("/api/settings/hint-vision", async (req, res) => {
  try {
    const db = require("mongoose").connection.db;
    const s = await db.collection("settings").findOne({ key: "hint-vision" });
    res.json({ enabled: s?.value !== false });
  } catch (e) { res.json({ enabled: true }); }
});
app.post("/api/settings/hint-vision", async (req, res) => {
  try {
    const db = require("mongoose").connection.db;
    await db.collection("settings").updateOne({ key: "hint-vision" }, { $set: { key: "hint-vision", value: req.body.enabled !== false } }, { upsert: true });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI daily message limit per employee
const empAIUsage = {}; // { username: { count: N, date: "YYYY-MM-DD" } }
function getToday() { return new Date().toISOString().split("T")[0]; }
function getUsage(username) {
  const today = getToday();
  if (!empAIUsage[username] || empAIUsage[username].date !== today) empAIUsage[username] = { count: 0, date: today };
  return empAIUsage[username];
}

app.get("/api/settings/ai-limit", async (req, res) => {
  try {
    const db = require("mongoose").connection.db;
    const s = await db.collection("settings").findOne({ key: "ai-limit" });
    res.json({ limit: s?.value || 50 });
  } catch (e) { res.json({ limit: 50 }); }
});
app.post("/api/settings/ai-limit", async (req, res) => {
  try {
    const db = require("mongoose").connection.db;
    const limit = parseInt(req.body.limit) || 50;
    await db.collection("settings").updateOne({ key: "ai-limit" }, { $set: { key: "ai-limit", value: limit } }, { upsert: true });
    res.json({ success: true, limit });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get all employees with their AI usage today
app.get("/api/ai/usage", async (req, res) => {
  try {
    const User = require("./models/User");
    const employees = await User.find({ role: "employee" }).select("username displayName").lean();
    const { decrypt } = require("./utils/crypto");
    employees.forEach(e => { if (e.displayName) e.displayName = decrypt(e.displayName); });
    const today = getToday();
    const db = require("mongoose").connection.db;
    const globalS = await db.collection("settings").findOne({ key: "ai-limit" });
    const globalLimit = globalS?.value || 50;
    // Get all per-employee limits in one query
    const allLimits = await db.collection("settings").find({ key: { $regex: /^ai-limit-/ } }).toArray();
    const limitsMap = {};
    allLimits.forEach(s => { limitsMap[s.key.replace("ai-limit-", "")] = s.value; });
    const usage = employees.map(e => ({
      username: e.username,
      name: e.displayName || e.username,
      used: (empAIUsage[e.username]?.date === today ? empAIUsage[e.username].count : 0),
      limit: limitsMap[e.username] ?? globalLimit,
      custom: limitsMap[e.username] !== undefined
    }));
    res.json({ employees: usage, globalLimit, today });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Set per-employee AI limit
app.post("/api/ai/usage/limit", async (req, res) => {
  try {
    const db = require("mongoose").connection.db;
    const { username, limit } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });
    if (limit === null || limit === undefined || limit === "") {
      // Remove custom limit — fall back to global
      await db.collection("settings").deleteOne({ key: "ai-limit-" + username });
      return res.json({ success: true, message: "Reset to global limit" });
    }
    await db.collection("settings").updateOne({ key: "ai-limit-" + username }, { $set: { key: "ai-limit-" + username, value: parseInt(limit) } }, { upsert: true });
    res.json({ success: true, limit: parseInt(limit) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI action execution endpoint — supports ALL ticket operations
app.post("/api/ai/action", async (req, res) => {
  try {
    const Ticket = require("./models/Ticket");
    const { action } = req.body;

    // CREATE new ticket
    if (action === "create") {
      const { employeeName, department, email, category, priority, subject, description } = req.body;
      const ticketId = "NPN-" + String(Math.floor(Math.random() * 9000) + 1000);
      const ticket = new Ticket({
        ticketId, employeeName: employeeName || "AI Created", department: department || "IT",
        email: email || "ai@nepton.com", category: category || "other",
        priority: priority || "medium", subject: subject || "New Ticket",
        description: description || "", createdBy: "AI Assistant"
      });
      await ticket.save();
      return res.json({ success: true, message: "Created ticket " + ticketId, ticketId });
    }

    // DELETE ticket
    if (action === "delete") {
      const { ticketId } = req.body;
      if (!ticketId) return res.status(400).json({ error: "Missing ticketId" });
      const result = await Ticket.findOneAndDelete({ ticketId });
      if (!result) return res.status(404).json({ error: "Ticket not found: " + ticketId });
      return res.json({ success: true, message: "Deleted ticket " + ticketId });
    }

    // DELETE ALL tickets
    if (action === "delete_all") {
      await Ticket.deleteMany({});
      return res.json({ success: true, message: "All tickets deleted" });
    }

    // All other actions need a ticketId
    const { ticketId } = req.body;
    if (!ticketId) return res.status(400).json({ error: "Missing ticketId" });
    const ticket = await Ticket.findOne({ ticketId });
    if (!ticket) return res.status(404).json({ error: "Ticket not found: " + ticketId });

    // ADD NOTE
    if (action === "note" && req.body.note) {
      const noteText = req.body.note;
      const hasReply = noteText.match(/^\[REPLY:\d+\]/);
      const cleanNote = hasReply ? noteText.replace(/^\[REPLY:\d+\]\s*/, "") : noteText;
      const replyMarker = hasReply ? hasReply[0] + " " : "";
      const formattedNote = "[AI Assistant] [T:" + new Date().toISOString() + "] " + replyMarker + cleanNote;
      ticket.notes.push(formattedNote);
      await ticket.save();
      return res.json({ success: true, message: "Note added to " + ticketId });
    }

    // CHANGE STATUS
    if (action === "status" && req.body.status) {
      ticket.status = req.body.status;
      await ticket.save();
      return res.json({ success: true, message: ticketId + " → " + req.body.status });
    }

    // ASSIGN
    if (action === "assign" && req.body.assignTo) {
      ticket.assignedTo = req.body.assignTo;
      if (ticket.status === "open") ticket.status = "in_progress";
      await ticket.save();
      return res.json({ success: true, message: ticketId + " assigned to " + req.body.assignTo });
    }

    // RENAME (change subject)
    if (action === "rename" && req.body.newSubject) {
      ticket.subject = req.body.newSubject;
      await ticket.save();
      return res.json({ success: true, message: ticketId + " renamed to: " + req.body.newSubject });
    }

    // EDIT PRIORITY
    if (action === "priority" && req.body.priority) {
      ticket.priority = req.body.priority;
      await ticket.save();
      return res.json({ success: true, message: ticketId + " priority → " + req.body.priority });
    }

    // EDIT CATEGORY
    if (action === "category" && req.body.category) {
      ticket.category = req.body.category;
      await ticket.save();
      return res.json({ success: true, message: ticketId + " category → " + req.body.category });
    }

    // EDIT DEPARTMENT
    if (action === "department" && req.body.department) {
      ticket.department = req.body.department;
      await ticket.save();
      return res.json({ success: true, message: ticketId + " department → " + req.body.department });
    }

    // EDIT EMPLOYEE NAME
    if (action === "employee" && req.body.employeeName) {
      ticket.employeeName = req.body.employeeName;
      await ticket.save();
      return res.json({ success: true, message: ticketId + " employee → " + req.body.employeeName });
    }

    // EDIT EMAIL
    if (action === "email" && req.body.email) {
      ticket.email = req.body.email;
      await ticket.save();
      return res.json({ success: true, message: ticketId + " email → " + req.body.email });
    }

    // EDIT DESCRIPTION
    if (action === "description" && req.body.description) {
      ticket.description = req.body.description;
      await ticket.save();
      return res.json({ success: true, message: ticketId + " description updated" });
    }

    // SCHEDULE — add a note with scheduled time
    if (action === "schedule") {
      const { scheduleTime, scheduleNote } = req.body;
      ticket.notes.push("[AI Scheduled — " + (scheduleTime || "TBD") + "] " + (scheduleNote || "Scheduled follow-up"));
      await ticket.save();
      return res.json({ success: true, message: ticketId + " scheduled: " + (scheduleTime || "TBD") });
    }

    res.status(400).json({ error: "Unknown action: " + action });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// AI Assistant endpoint (Groq free, Gemini free, or Anthropic paid)
app.post("/api/ai", async (req, res) => {
  /* Handle client disconnection gracefully */
  let clientDisconnected = false;
  req.on("close", () => { clientDisconnected = true; });
  const GROQ_KEY = process.env.GROQ_API_KEY;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const CLAUDE_KEY = process.env.ANTHROPIC_API_KEY;
  if (!GROQ_KEY && !GEMINI_KEY && !CLAUDE_KEY) return res.status(500).json({ error: "AI not configured. Add GROQ_API_KEY (free) to Railway variables." });
  try {
    const aiRole = req.body.aiRole || "admin";
    
    // Check daily message limit for employees only (admin and tech are unlimited)
    if (aiRole === "employee") {
      const username = req.body.empUsername || req.body.username || "unknown";
      const db = require("mongoose").connection.db;
      const globalS = await db.collection("settings").findOne({ key: "ai-limit" });
      const userS = await db.collection("settings").findOne({ key: "ai-limit-" + username });
      const limit = userS?.value ?? globalS?.value ?? 50;
      const usage = getUsage(username);
      if (usage.count >= limit) {
        return res.json({ response: (req.body.messages?.[0]?.content?.match(/[\u0600-\u06FF]/) ? 
          `⚠️ لقد وصلت إلى الحد اليومي (${limit} رسالة). حاول مرة أخرى غداً.` : 
          `⚠️ You've reached your daily limit (${limit} messages). Try again tomorrow.`) });
      }
      usage.count++;
    }
    
    let systemPrompt = "";

    if (aiRole === "admin") {
      // ADMIN: Full access — lazy ticket loading for speed
      const lastMsg = (req.body.messages || []).slice(-1)[0]?.content || "";
      const needsTickets = /ticket|NPN|تذكر|حالة|assign|status|resolve|close|open|priority|note|reply|delete|create|ملاحظ|عيّن|أغلق|احذف|كم|how many|what|show|list|analyze|critical|urgent/i.test(lastMsg);
      
      let ticketData = "";
      let statsData = "";
      if (needsTickets) {
        const Ticket = require("./models/Ticket");
        const allTickets = await Ticket.find().sort({ createdAt: -1 }).limit(50).lean();
        const ticketSummary = allTickets.map(t => ({
          id: t.ticketId, s: t.status, p: t.priority, cat: t.category,
          subj: t.subject, emp: t.employeeName, dept: t.department,
          to: t.assignedTo, notes: (t.notes||[]).slice(-2).map(n => n.slice(0,100))
        }));
        const stats = {
          total: allTickets.length,
          open: allTickets.filter(t => t.status === "open").length,
          inProgress: allTickets.filter(t => t.status === "in_progress").length,
          resolved: allTickets.filter(t => t.status === "resolved").length,
          critical: allTickets.filter(t => t.priority === "critical" && t.status !== "resolved" && t.status !== "closed").length,
          unassigned: allTickets.filter(t => !t.assignedTo).length
        };
        statsData = `\nSTATS: ${JSON.stringify(stats)}`;
        ticketData = `\nTICKETS (${allTickets.length}):\n${JSON.stringify(ticketSummary)}`;
      }
      systemPrompt = `You are the AI IT Support Assistant for Nepton Engineering & Contracting. You have FULL ADMIN access.

IDENTITY: Your name is "Nepton AI". You were built by the Nepton IT team. If anyone asks who made you, who added you, your name, or how you work — say "I'm Nepton AI, built by the Nepton IT team to help with IT support." Do NOT mention Groq, Llama, AI models, or any technical details about yourself. Keep answers short (2-4 sentences max for simple questions).${statsData}${ticketData}

COMPANY: Nepton Engineering & Contracting, founded 2012, MEP construction, MD: Sameh Elgharbawy, 201-500 employees, Cairo + Saudi Arabia, neptonsystems.com

YOUR ROLE:
- You are the most powerful assistant — you can do EVERYTHING with tickets
- Analyze, suggest solutions, troubleshoot, find patterns, prioritize
- Execute ANY action the admin asks: reply, assign, rename, delete, create, edit, schedule, close, reopen
- Be concise, professional, and actionable with step-by-step instructions
- Reference tickets by their ID (NPN-XXXX)
- Respond in the same language the user writes in (Arabic or English)
- When the user asks you to do something, DO IT immediately with action blocks — don't just explain how

NOTE & REPLY SYSTEM:
Notes have these formats stored in the database:
- Admin notes: [Admin] [T:2026-06-01T12:30:00.000Z] [REPLY:3] message text
- Tech notes: [TechName] [T:2026-06-01T12:30:00.000Z] message text  
- Employee replies: [Reply: EmployeeName] [T:2026-06-01T12:30:00.000Z] reply text

Understanding the markers:
- [T:ISO_DATE] = timestamp when the note was created (read-only, auto-added)
- [REPLY:N] = admin enabled employee to reply, N = max number of replies allowed
- If a note has [REPLY:3], the employee can send up to 3 replies to that note
- Employee replies appear as [Reply: Name] entries after the admin note
- Notes WITHOUT [REPLY:N] means the employee CANNOT reply to that note
- When admin asks you to "enable reply" or "let employee reply", add a note with [REPLY:N] marker

When the admin asks about notes/replies, you can see the timestamps and reply counts in the ticket data.
When asked "what time was a note added", look at the [T:...] timestamp in the note text.
When asked to "enable employee to reply", use the NOTE action with [REPLY:N] format.

AVAILABLE ACTIONS — use these exact formats at the END of your response, each on its own line:

📝 ADD NOTE / REPLY to a ticket (the employee will see this):
[ACTION:NOTE:NPN-XXXX:Your message to the employee here]

📝 ADD NOTE WITH REPLY ENABLED (employee can reply back, N = max replies):
[ACTION:NOTE:NPN-XXXX:[REPLY:N] Your message to the employee here]
Example: [ACTION:NOTE:NPN-1234:[REPLY:3] We are working on your issue. Please reply if you have more details.]

🔄 CHANGE STATUS:
[ACTION:STATUS:NPN-XXXX:open]
[ACTION:STATUS:NPN-XXXX:in_progress]
[ACTION:STATUS:NPN-XXXX:resolved]
[ACTION:STATUS:NPN-XXXX:closed]

👤 ASSIGN ticket to someone:
[ACTION:ASSIGN:NPN-XXXX:Person Name]

✏️ RENAME ticket (change subject):
[ACTION:RENAME:NPN-XXXX:New subject text here]

🔥 CHANGE PRIORITY:
[ACTION:PRIORITY:NPN-XXXX:low/medium/high/critical]

📂 CHANGE CATEGORY:
[ACTION:CATEGORY:NPN-XXXX:hardware/software/network/email/access/printer/other]

🏢 CHANGE DEPARTMENT:
[ACTION:DEPARTMENT:NPN-XXXX:Engineering/Sales/Marketing/Finance/HR/Operations/Legal/Customer Support/Management]

👤 CHANGE EMPLOYEE NAME:
[ACTION:EMPLOYEE:NPN-XXXX:New Name]

📧 CHANGE EMAIL:
[ACTION:EMAIL:NPN-XXXX:new@email.com]

📝 CHANGE DESCRIPTION:
[ACTION:DESCRIPTION:NPN-XXXX:New description text here]

🗑️ DELETE a ticket:
[ACTION:DELETE:NPN-XXXX]

🗑️ DELETE ALL tickets:
[ACTION:DELETE_ALL]

📅 SCHEDULE a follow-up:
[ACTION:SCHEDULE:NPN-XXXX:Tomorrow 10:00 AM:Follow-up note here]

🆕 CREATE a new ticket:
[ACTION:CREATE:Employee Name|Department|email@nepton.com|category|priority|Subject|Description]

EXAMPLES:
- "rename NPN-2343 to Moaz" → [ACTION:RENAME:NPN-2343:Moaz]
- "assign NPN-1234 to Omar" → [ACTION:ASSIGN:NPN-1234:Omar]
- "reply to NPN-5678 saying we fixed it" → [ACTION:NOTE:NPN-5678:We have fixed the issue. Please confirm it's working on your end.]
- "delete NPN-9999" → [ACTION:DELETE:NPN-9999]
- "make NPN-1234 critical" → [ACTION:PRIORITY:NPN-1234:critical]
- "close all resolved tickets" → Multiple [ACTION:STATUS:NPN-XXXX:closed] for each resolved ticket
- "create a ticket for Ahmed in Engineering about a broken monitor" → [ACTION:CREATE:Ahmed|Engineering|ahmed@nepton.com|hardware|medium|Broken Monitor|Employee reports a broken monitor that needs replacement]
- "schedule a follow-up for NPN-1234 tomorrow at 2pm" → [ACTION:SCHEDULE:NPN-1234:Tomorrow 2:00 PM:Follow up on this issue to check resolution status]
- "reply to all open tickets telling them we're working on it" → Multiple [ACTION:NOTE:NPN-XXXX:...] blocks
- "change NPN-1234 category to network" → [ACTION:CATEGORY:NPN-1234:network]
- "enable employee to reply on NPN-1234" → [ACTION:NOTE:NPN-1234:[REPLY:1] You can now reply to this note. Please share any additional details.]
- "let the employee reply 3 times on NPN-5678" → [ACTION:NOTE:NPN-5678:[REPLY:3] We need more information. You have 3 replies available to respond.]
- "what time was the last note on NPN-1234?" → Look at [T:...] timestamps in the ticket notes and tell the user
- "how many replies did the employee use?" → Count [Reply:...] notes and compare with [REPLY:N] limit

RULES:
1. ALWAYS ASK FOR CONFIRMATION before executing ANY action. Never execute without user approval.
2. If user says "hi", "hello" — just greet. Do NOT touch any tickets.
3. For EVERY action request, first DESCRIBE what you will do, then ASK "Should I proceed?"
4. Only include [ACTION:] blocks AFTER the user confirms with "yes", "ok", "do it", "proceed", etc.

CONFIRMATION FLOW:
- User: "reply to NPN-1234" → You: "What would you like me to reply to NPN-1234?"
- User: "tell them it's fixed" → You: "I'll add this note to NPN-1234: 'It's fixed'. Should I proceed?" 
- User: "yes" → Execute [ACTION:NOTE:NPN-1234:It's fixed]

- User: "close all resolved tickets" → You: "I found 3 resolved tickets (NPN-1234, NPN-5678, NPN-9012). Should I close all of them?"
- User: "yes" → Execute actions

- User: "assign NPN-1234 to Omar" → You: "I'll assign NPN-1234 to Omar. Should I proceed?"
- User: "yes" → Execute

- User: "delete NPN-5678" → You: "⚠️ This will permanently delete NPN-5678. Are you sure?"
- User: "yes" → Execute

5. Put ALL action blocks at the END of your response, each on its own line
6. NEVER make up reply content — always ask the user what to say
7. NEVER execute actions on first message — always confirm first
8. CRITICAL: When asking "Should I proceed?" do NOT include any [ACTION:] blocks in that message. Only include [ACTION:] blocks AFTER the user says "yes"/"ok"/"do it". If you include [ACTION:] while asking for confirmation, the system will execute them prematurely.

RESOURCES — When providing technical solutions, troubleshooting steps, or IT advice, ALWAYS include helpful resources at the END of your response using this exact format:

[RESOURCE:Title of the resource|URL|Brief description of what this resource covers]

Examples:
[RESOURCE:Microsoft Office Troubleshooting|https://support.microsoft.com/office|Official Microsoft guide for fixing Office issues]
[RESOURCE:How to Fix Printer Not Responding|https://support.hp.com/printers|HP support page for printer troubleshooting]
[RESOURCE:Network Connectivity Guide|https://support.google.com/chrome/answer/6098869|Steps to diagnose internet connection problems]
[RESOURCE:Active Directory Password Reset|https://learn.microsoft.com/en-us/windows-server/identity/ad-ds|Microsoft docs for AD password management]

Include 2-4 relevant resources per response when giving technical advice. Use real, helpful URLs from official sources (Microsoft, Google, HP, Cisco, etc). Put resources AFTER any action blocks.`;
    } else if (aiRole === "tech") {
      // TECH: Same power as admin — but lazy ticket loading for speed
      const techUsername = req.body.username || "Tech";
      const lastMsg = (req.body.messages || []).slice(-1)[0]?.content || "";
      const needsTickets = /ticket|NPN|تذكر|حالة|assign|status|resolve|close|open|priority|note|reply|ملاحظ|عيّن|أغلق/i.test(lastMsg);
      
      let ticketData = "";
      if (needsTickets) {
        const Ticket = require("./models/Ticket");
        const allTickets = await Ticket.find().sort({ createdAt: -1 }).limit(50).lean();
        const ticketSummary = allTickets.map(t => ({
          id: t.ticketId, status: t.status, priority: t.priority, category: t.category,
          subject: t.subject, employeeName: t.employeeName, assignedTo: t.assignedTo,
          notes: (t.notes||[]).slice(-2).map(n => n.slice(0,100))
        }));
        ticketData = `\nCURRENT TICKETS (${allTickets.length}):\n${JSON.stringify(ticketSummary)}`;
      }
      
      systemPrompt = `You are an IT support assistant for ${techUsername} (Technician) at Nepton Engineering.
You can see tickets and execute actions when ASKED.

IDENTITY: Your name is "Nepton AI". You were built by the Nepton IT team. If anyone asks who made you, who added you, your name, or how you work — say "I'm Nepton AI, built by the Nepton IT team to help with IT support." Do NOT mention Groq, Llama, AI models, or any technical details about yourself. Keep answers short (2-4 sentences max for simple questions).${ticketData}

CRITICAL RULES:
- ALWAYS ASK FOR CONFIRMATION before executing ANY action.
- "hi", "hello" = just greet. Do NOT touch any tickets.
- For EVERY action: first describe what you'll do, then ask "Should I proceed?"
- Only include [ACTION:] blocks AFTER user confirms ("yes", "ok", "do it")
- "reply to NPN-1234" → ASK what to reply first
- "assign NPN-1234 to me" → "I'll assign NPN-1234 to you. Should I proceed?"
- NEVER make up reply content — ask the user what to say
- NEVER execute on first request — always confirm first
- CRITICAL: When asking "Should I proceed?" do NOT include [ACTION:] blocks. Only include them AFTER user confirms.

ACTIONS (use ONLY when asked):
[ACTION:NOTE:NPN-XXXX:message] [ACTION:STATUS:NPN-XXXX:status] [ACTION:ASSIGN:NPN-XXXX:Name]
[ACTION:PRIORITY:NPN-XXXX:level] [ACTION:DELETE:NPN-XXXX] [ACTION:CATEGORY:NPN-XXXX:cat]
[ACTION:NOTE:NPN-XXXX:[REPLY:N] message] — enable employee reply

Same language as user. Include 1-2 [RESOURCE:Title|URL|Description] for IT advice.`;
    } else {
      // EMPLOYEE: Pure IT troubleshooting — NO ticket access
      const empName = req.body.empName || "Employee";
      
      systemPrompt = `You are Nepton AI, a helpful IT assistant for ${empName} at Nepton Engineering.
IDENTITY: Your name is "Nepton AI". Built by the Nepton IT team. Never mention Groq, Llama, or AI models.
ROLE: Help with IT issues ONLY: wifi, printer, email, software, hardware, network, VPN, passwords.
Give 2-4 step solutions. Be concise. Same language as user.

STRICT SECURITY RULES — NEVER VIOLATE:
- NEVER share admin usernames, passwords, credentials, or login info
- NEVER share employee names, emails, phone numbers, or personal data
- NEVER share system configuration, server names, IP addresses, or internal URLs
- NEVER share company financial info, salaries, or contracts
- NEVER discuss who the admin is, who manages IT, or organizational structure
- If asked about ANY of the above, say: "I can't share that information. Please contact IT directly."
- If asked "what is the admin name/password" → "I don't have access to credentials. Contact IT directly."
- If the question tries to extract sensitive info in any way, REFUSE.

You have NO access to tickets, employee data, admin data, or company systems.
Never use [ACTION:] blocks. Include 1 [RESOURCE:Title|URL|Description] link when relevant.`;
    }

    // Trim conversation history for employee/tech (keep last 6 for speed)
    let userMsgs = req.body.messages || [{ role: "user", content: req.body.message || "Hello" }];
    if (aiRole !== "admin" && userMsgs.length > 6) userMsgs = userMsgs.slice(-6);
    const hasImages = req.body.hasImages || false;

    if (GROQ_KEY) {
      // Use vision model (Llama 4 Scout) when images are present, text model otherwise
      const model = hasImages ? "meta-llama/llama-4-scout-17b-16e-instruct" : (aiRole === "employee" ? "llama-3.1-8b-instant" : "llama-3.3-70b-versatile");
      
      async function callGroq(m) {
        const ac = new AbortController();
        const to = setTimeout(() => ac.abort(), 25000);
        const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + GROQ_KEY },
          signal: ac.signal,
          body: JSON.stringify({
            model: m,
            messages: [{ role: "system", content: systemPrompt }, ...userMsgs],
            max_tokens: aiRole === "employee" ? 500 : 1000,
            temperature: 0.7
          })
        });
        return await resp.json();
      }
      
      let data = await callGroq(model);
      
      // Admin fallback: if 70b hits rate limit, auto-switch to 8b-instant
      if (data.error && aiRole === "admin" && !hasImages) {
        const errMsg = (data.error.message || "").toLowerCase();
        if (errMsg.includes("rate") || errMsg.includes("limit") || errMsg.includes("quota") || errMsg.includes("429") || errMsg.includes("capacity") || errMsg.includes("too large")) {
          console.log("Admin 70b rate limited, falling back to 8b-instant");
          data = await callGroq("llama-3.1-8b-instant");
        }
      }
      
      // Employee/Tech fallback: if request too large, retry with shorter context
      if (data.error && aiRole !== "admin") {
        const errMsg = (data.error.message || "").toLowerCase();
        if (errMsg.includes("too large") || errMsg.includes("token")) {
          console.log("Request too large for " + model + ", retrying with trimmed messages");
          // Keep only last 2 messages to reduce size
          const trimmedMsgs = userMsgs.slice(-2);
          const shortResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + GROQ_KEY },
            body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "system", content: systemPrompt.slice(0, 2000) }, ...trimmedMsgs], max_tokens: 1000, temperature: 0.7 })
          });
          data = await shortResp.json();
        }
      }
      
      if (data.error) {
        console.error("Groq error:", data.error.message, "| model:", model, "| role:", aiRole, "| prompt length:", systemPrompt.length);
        const friendly = aiRole === "admin" ? data.error.message : (userMsgs.some(m => (m.content||"").match(/[\u0600-\u06FF]/)) ? "⚠️ عذراً، حدث خطأ. حاول مرة أخرى بسؤال أقصر." : "⚠️ Sorry, something went wrong. Try again with a shorter question.");
        return res.json({ response: friendly });
      }
      const text = data.choices?.[0]?.message?.content || "No response";
      if (clientDisconnected) return;
      return res.json({ response: text });
    }

    if (GEMINI_KEY) {
      const geminiMsgs = [];
      const firstUserIdx = userMsgs.findIndex(m => m.role === "user");
      for (let i = 0; i < userMsgs.length; i++) {
        const m = userMsgs[i];
        let content = m.content;
        if (i === firstUserIdx) content = systemPrompt + "\n\n---\nUSER QUESTION: " + content;
        geminiMsgs.push({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: content }] });
      }
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: geminiMsgs, generationConfig: { maxOutputTokens: 1500, temperature: 0.7 } })
      });
      const data = await resp.json();
      if (data.error) return res.status(400).json({ error: data.error.message || "AI error" });
      const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "No response";
      return res.json({ response: text });
    }

    if (CLAUDE_KEY) {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": CLAUDE_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, system: systemPrompt, messages: userMsgs })
      });
      const data = await resp.json();
      if (data.error) return res.status(400).json({ error: data.error.message || "AI error" });
      const text = data.content?.map(c => c.text || "").join("") || "No response";
      return res.json({ response: text });
    }
  } catch (e) {
    console.error("AI error:", e.message);
    res.status(500).json({ error: "AI service error: " + e.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// MongoDB + seed
const User = require("./models/User");

async function seedUsers() {
  try {
    const techUser = process.env.TECH_USER || "tech";
    const techPass = process.env.TECH_PASS || "tech";
    const adminUser = process.env.ADMIN_USER || "sameh@nepton";
    const adminPass = process.env.ADMIN_PASS || "sameh.sameh";
    console.log("Seeding tech user:", techUser, "pass length:", techPass.length);
    console.log("Seeding admin user:", adminUser, "pass length:", adminPass.length);
    await User.deleteMany({ role: "tech" });
    const techDoc = await User.create({ username: techUser, password: techPass, role: "tech" });
    console.log("Tech user seeded OK, id:", techDoc._id);
    await User.deleteMany({ role: "admin" });
    const adminDoc = await User.create({ username: adminUser, password: adminPass, role: "admin" });
    console.log("Admin user seeded OK, id:", adminDoc._id);
    // Verify password works
    const verifyTech = await techDoc.comparePassword(techPass);
    const verifyAdmin = await adminDoc.comparePassword(adminPass);
    console.log("Tech password verify:", verifyTech, "Admin password verify:", verifyAdmin);
    // List all users
    const allUsers = await User.find({}, "username role");
    console.log("All users in DB:", JSON.stringify(allUsers));
  } catch (e) {
    console.log("Seed ERROR:", e.message, e.stack);
  }
}

// Temp debug endpoint - shows users in DB (REMOVE AFTER FIXING)
app.get("/api/debug-users", async (req, res) => {
  try {
    const users = await User.find({}, "username role displayName");
    // Test passwords
    const techUser = await User.findOne({ username: "tech", role: "tech" });
    const adminUser = await User.findOne({ username: "sameh@nepton", role: "admin" });
    let techOk = false, adminOk = false;
    if (techUser) techOk = await techUser.comparePassword("tech");
    if (adminUser) adminOk = await adminUser.comparePassword("sameh.sameh");
    res.json({ 
      users, 
      techExists: !!techUser, techPasswordOk: techOk,
      adminExists: !!adminUser, adminPasswordOk: adminOk,
      envTech: process.env.TECH_USER || "micheal (default)", 
      envAdmin: process.env.ADMIN_USER || "Admin (default)" 
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Force reset passwords
app.get("/api/force-reset", async (req, res) => {
  try {
    await User.deleteMany({ role: "tech" });
    await User.deleteMany({ role: "admin" });
    const techDoc = await User.create({ username: "tech", password: "tech", role: "tech", displayName: "Tech Support" });
    const adminDoc = await User.create({ username: "sameh@nepton", password: "sameh.sameh", role: "admin", displayName: "Sameh" });
    const verifyTech = await techDoc.comparePassword("tech");
    const verifyAdmin = await adminDoc.comparePassword("sameh.sameh");
    res.json({ 
      success: true, 
      message: "Users reset!", 
      techVerify: verifyTech, 
      adminVerify: verifyAdmin,
      tech: { username: "tech", password: "tech" },
      admin: { username: "sameh@nepton", password: "sameh.sameh" }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => { console.log("MongoDB connected"); return seedUsers(); })
  .then(() => app.listen(PORT, () => console.log(`Nepton IT running on ${PORT}`)))
  .catch((err) => { console.error("DB error:", err.message); process.exit(1); });
