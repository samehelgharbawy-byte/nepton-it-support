const express = require("express");
const router = express.Router();
const Ticket = require("../models/Ticket");
const mail = require("../utils/mail");
const { encrypt, decrypt, decryptFields } = require("../utils/crypto");
const Notification = require("../models/Notification");

const SENSITIVE = ["employeeName", "email"];

function genId() { return "NPN-" + String(Math.floor(Math.random() * 9000) + 1000); }
function sanitize(str) { return typeof str === "string" ? str.replace(/[<>]/g, "").trim().slice(0, 2000) : ""; }

router.get("/", async (req, res) => {
  try {
    const query = {};
    if (req.query.createdBy) query.createdBy = req.query.createdBy;
    const raw = await Ticket.find(query).sort({ createdAt: -1 }).limit(500).lean();
    const tickets = raw.map(t => decryptFields(t, SENSITIVE));
    res.json(tickets);
  } catch (e) { res.status(500).json({ error: "Server error" }); }
});

router.post("/", async (req, res) => {
  try {
    const { employeeName, department, email, category, priority, subject, description, createdBy, attachments } = req.body;
    if (!employeeName || !department || !email || !category || !subject || !description)
      return res.status(400).json({ error: "All fields required" });
    const plainEmail = sanitize(email);
    const plainName = sanitize(employeeName);
    const ticket = new Ticket({
      ticketId: genId(),
      employeeName: encrypt(plainName),
      department: sanitize(department),
      email: encrypt(plainEmail),
      category: sanitize(category), priority: sanitize(priority) || "medium",
      subject: sanitize(subject), description: sanitize(description),
      createdBy: createdBy ? sanitize(createdBy) : null,
      attachments: Array.isArray(attachments) ? attachments.slice(0, 3) : []
    });
    await ticket.save();
    const decrypted = decryptFields(ticket, SENSITIVE);
    res.status(201).json(decrypted);
    // Email disabled on ticket creation — only on first admin reply
  } catch (e) { res.status(400).json({ error: "Invalid data" }); }
});

router.put("/:id", async (req, res) => {
  try {
    const allowed = {};
    if (req.body.status) allowed.status = sanitize(req.body.status);
    if (req.body.assignedTo) allowed.assignedTo = sanitize(req.body.assignedTo);
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, allowed, { new: true }).lean();
    if (!ticket) return res.status(404).json({ error: "Not found" });
    const decrypted = decryptFields(ticket, SENSITIVE);
    res.json(decrypted);
    // Email disabled on status change — only on first admin reply + mention/call
  } catch (e) { res.status(400).json({ error: "Invalid request" }); }
});

router.put("/:id/note", async (req, res) => {
  try {
    const note = sanitize(req.body.note);
    if (!note) return res.status(400).json({ error: "Empty note" });
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, { $push: { notes: note } }, { new: true }).lean();
    if (!ticket) return res.status(404).json({ error: "Not found" });
    const decrypted = decryptFields(ticket, SENSITIVE);
    res.json(decrypted);
    // Only email on first admin/tech note
    const isAdminOrTech = note.startsWith("[Admin]") || (!note.startsWith("[AI") && !note.startsWith("[Reply:") && !note.startsWith("[Employee"));
    const existingAdminNotes = (decrypted.notes || []).filter(n => n.startsWith("[Admin]") || (!n.startsWith("[AI") && !n.startsWith("[Reply:") && !n.startsWith("[AI Hint]") && !n.startsWith("[Employee")));
    const isFirstReply = isAdminOrTech && existingAdminNotes.length <= 1;
    if (isFirstReply) mail.notifyNoteAdded(decrypted, note).catch(() => {});
    
    // In-app notifications
    if (note.startsWith("[Admin]") || note.startsWith("[AI Assistant]")) {
      // Notify employee when admin/AI replies
      if (decrypted.createdBy) {
        const cleanNote = note.replace(/\[(Admin|AI Assistant)\]/g,"").replace(/\[T:[^\]]+\]/g,"").replace(/\[REPLY:\d+\]/g,"").trim().slice(0,100);
        Notification.create({ recipient: decrypted.createdBy, type: "note", ticketId: decrypted.ticketId, title: "New reply on " + decrypted.ticketId, message: cleanNote }).catch(()=>{});
      }
    }
    if (note.startsWith("[Employee Mention]")) {
      // Notify admin when employee mentions
      const cleanMsg = note.replace(/\[Employee Mention\]/g,"").replace(/\[T:[^\]]+\]/g,"").trim().slice(0,100);
      Notification.create({ recipient: "admin", type: "mention", ticketId: decrypted.ticketId, title: (decrypted.employeeName||"Employee") + " needs attention", message: decrypted.ticketId + ": " + cleanMsg }).catch(()=>{});
      Notification.create({ recipient: "tech", type: "mention", ticketId: decrypted.ticketId, title: (decrypted.employeeName||"Employee") + " needs attention", message: decrypted.ticketId + ": " + cleanMsg }).catch(()=>{});
    }
  } catch (e) { res.status(400).json({ error: "Invalid request" }); }
});

router.delete("/:id", async (req, res) => {
  try { await Ticket.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: "Invalid request" }); }
});

router.delete("/", async (req, res) => {
  try { await Ticket.deleteMany({}); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: "Server error" }); }
});

module.exports = router;
