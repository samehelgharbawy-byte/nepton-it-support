const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  employeeName: { type: String, required: true },
  department: { type: String, required: true },
  email: { type: String, required: true },
  category: { type: String, required: true },
  priority: { type: String, default: "medium" },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, default: "open" },
  assignedTo: { type: String, default: null },
  notes: [{ type: String }],
  attachments: [{ name: String, size: Number, type: String, data: String }],
  createdBy: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Ticket", ticketSchema);
