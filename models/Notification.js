const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient: { type: String, required: true }, // username or "admin" or "tech"
  type: { type: String, required: true }, // "note", "mention", "status", "reply"
  ticketId: { type: String },
  title: { type: String, required: true },
  message: { type: String, default: "" },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model("Notification", notificationSchema);
