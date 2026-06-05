// Email via Resend HTTP API (no SMTP ports needed — works on Railway)
// Free: 100 emails/day at resend.com

const RESEND_KEY = process.env.RESEND_API_KEY;

const BRAND = {
  name: "Nepton Engineering & Contracting",
  tagline: "Creativity in Every Step",
  taglineAr: "الابداع في كل خطوة",
  website: "https://neptonsystems.com",
  email: "info@neptonsystems.com",
  phone: "+20 1050123570",
  suggestion: "567309964",
  facebook: "https://facebook.com/neptonsystems1",
  instagram: "https://instagram.com/nepton_co",
  linkedin: "https://linkedin.com/company/nepton-for-engineering-contracting",
  twitter: "https://x.com/Nepton_Co",
  tiktok: "https://tiktok.com/@nepton_co",
  youtube: "https://youtube.com/channel/UC-7DUZNqh-AQ0TyiQijvR4A",
};

function socialIcons() {
  const icons = [
    { url: BRAND.facebook, label: "f", color: "#1877F2" },
    { url: BRAND.instagram, label: "📷", color: "#E4405F" },
    { url: BRAND.linkedin, label: "in", color: "#0A66C2" },
    { url: BRAND.twitter, label: "𝕏", color: "#1DA1F2" },
    { url: BRAND.tiktok, label: "♪", color: "#000000" },
    { url: BRAND.youtube, label: "▶", color: "#FF0000" },
  ];
  return icons.map(i => 
    `<a href="${i.url}" style="display:inline-block;width:32px;height:32px;border-radius:50%;background:${i.color};color:#fff;text-decoration:none;text-align:center;line-height:32px;font-size:12px;font-weight:700;margin:0 4px">${i.label}</a>`
  ).join("");
}

function footer() {
  return `<div style="background:#050d1a;padding:24px;text-align:center;border-top:1px solid #1a2d4a">
    <div style="margin-bottom:16px">${socialIcons()}</div>
    <p style="color:#90caf9;font-size:13px;font-weight:600;margin:0 0 4px">${BRAND.name}</p>
    <p style="color:#38bdf8;font-size:11px;margin:0 0 8px;font-style:italic">${BRAND.taglineAr} — ${BRAND.tagline}</p>
    <p style="color:#546E7A;font-size:11px;margin:0 0 4px">
      <a href="${BRAND.website}" style="color:#38bdf8;text-decoration:none">${BRAND.website}</a> · 
      <a href="mailto:${BRAND.email}" style="color:#38bdf8;text-decoration:none">${BRAND.email}</a>
    </p>
    <p style="color:#546E7A;font-size:11px;margin:0">📞 ${BRAND.phone} · Suggestions: ${BRAND.suggestion}</p>
    <div style="margin-top:12px;padding-top:12px;border-top:1px solid #0d1f3c">
      <p style="color:#37474F;font-size:9px;margin:0">Automated notification — Nepton IT Support. Do not reply to this email.</p>
    </div>
  </div>`;
}

function base(headerBg, icon, title, sub, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#060e1a;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;background:#0a1929;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.5)">
  <div style="background:${headerBg};padding:28px 30px">
    <div style="font-size:36px;margin-bottom:8px">${icon}</div>
    <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700">${title}</h1>
    <p style="color:rgba(255,255,255,.75);margin:4px 0 0;font-size:12px">${sub}</p>
  </div>
  <div style="padding:28px 30px">${body}</div>
  ${footer()}
</div></body></html>`;
}

async function send(to, subject, html) {
  if (!RESEND_KEY || !to) { console.log("📧 Skip: no RESEND_API_KEY or no recipient"); return; }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + RESEND_KEY },
      body: JSON.stringify({
        from: "Nepton IT <onboarding@resend.dev>",
        to: [to],
        subject: "🔔 " + subject,
        html: html
      })
    });
    const data = await resp.json();
    if (data.id) console.log("📧 Email sent to:", to, "id:", data.id);
    else console.error("📧 Email error:", JSON.stringify(data));
  } catch (e) { console.error("📧 Email error:", e.message); }
}

async function notifyTicketCreated(ticket) {
  await send(ticket.email, `Ticket ${ticket.ticketId} Submitted — ${ticket.subject}`,
    base("linear-gradient(135deg,#1B8EBF,#0077b6)", "🎫", "Ticket Submitted Successfully", "Your request has been received",
    `<p style="color:#e2e8f0;font-size:15px;margin:0 0 16px">Hi <strong style="color:#38bdf8">${ticket.employeeName}</strong>,</p>
    <p style="color:#90a4ae;font-size:14px;line-height:1.7;margin:0 0 20px">Thank you for submitting your IT support request. Our team will review and respond soon.</p>
    <div style="background:#132F4C;border-radius:12px;padding:20px;margin:0 0 20px;border:1px solid #1a3d5c">
      <span style="color:#38bdf8;font-weight:800;font-size:16px">${ticket.ticketId}</span>
      <table style="width:100%;margin-top:12px">
        <tr><td style="padding:5px 0;color:#546E7A;font-size:12px;width:90px">Subject</td><td style="color:#e2e8f0;font-size:13px;font-weight:600">${ticket.subject}</td></tr>
        <tr><td style="padding:5px 0;color:#546E7A;font-size:12px">Category</td><td style="color:#90caf9;font-size:13px">${ticket.category}</td></tr>
        <tr><td style="padding:5px 0;color:#546E7A;font-size:12px">Priority</td><td style="color:${ticket.priority==="critical"?"#ef5350":ticket.priority==="high"?"#ff7043":"#66bb6a"};font-size:13px;font-weight:700;text-transform:uppercase">${ticket.priority}</td></tr>
      </table>
    </div>
    <div style="background:#0d2137;border-radius:10px;padding:16px;border-left:4px solid #1B8EBF">
      <p style="color:#38bdf8;font-size:12px;font-weight:700;margin:0 0 6px">📋 What happens next?</p>
      <p style="color:#90a4ae;font-size:12px;line-height:1.8;margin:0">1. IT team reviews your ticket<br>2. A technician will be assigned<br>3. You'll get email updates on every change</p>
    </div>
    <p style="color:#546E7A;font-size:11px;margin:20px 0 0;text-align:center">Need urgent help? Call: <a href="tel:${BRAND.phone}" style="color:#38bdf8;text-decoration:none;font-weight:700">${BRAND.phone}</a></p>`));
}

async function notifyNoteAdded(ticket, note) {
  if (note.startsWith("[AI Hint]") || note.startsWith("[Reply:")) return;
  const sender = note.startsWith("[Admin]") ? "Admin" : note.startsWith("[AI Assistant]") ? "AI Assistant" : "IT Support";
  const color = note.startsWith("[Admin]") ? "#10b981" : note.startsWith("[AI Assistant]") ? "#a78bfa" : "#f59e0b";
  const icon = note.startsWith("[Admin]") ? "⚙️" : note.startsWith("[AI Assistant]") ? "🤖" : "🛠️";
  const clean = note.replace(/\[(Admin|AI Assistant|Reply:[^\]]+)\]/g,"").replace(/\[T:[^\]]+\]/g,"").replace(/\[REPLY:\d+\]/g,"").trim();
  
  await send(ticket.email, `${ticket.ticketId} — Reply from ${sender}: ${ticket.subject}`,
    base(`linear-gradient(135deg,${color},${color}cc)`, icon, `New Reply from ${sender}`, `Ticket ${ticket.ticketId}`,
    `<p style="color:#e2e8f0;font-size:15px;margin:0 0 16px">Hi <strong style="color:#38bdf8">${ticket.employeeName}</strong>,</p>
    <p style="color:#90a4ae;font-size:14px;margin:0 0 20px"><strong style="color:${color}">${sender}</strong> replied to your ticket <strong>"${ticket.subject}"</strong>:</p>
    <div style="background:#0d2137;border-radius:12px;padding:20px;border-left:4px solid ${color};margin:0 0 20px">
      <div style="margin-bottom:10px"><span style="font-size:14px">${icon}</span> <span style="color:${color};font-size:12px;font-weight:700">${sender}</span></div>
      <p style="color:#e2e8f0;font-size:14px;line-height:1.8;margin:0">${clean}</p>
    </div>
    <p style="color:#546E7A;font-size:11px;text-align:center">Log in to the portal to view and reply.</p>`));
}

async function notifyStatusChange(ticket) {
  const cfg = {
    open: { label:"Open", color:"#3b82f6", icon:"🔵", msg:"Your ticket is open and waiting for assignment." },
    in_progress: { label:"In Progress", color:"#f59e0b", icon:"⚡", msg:"A technician is working on your issue." },
    resolved: { label:"Resolved", color:"#10b981", icon:"✅", msg:"Your issue has been resolved! If the problem persists, reopen the ticket." },
    closed: { label:"Closed", color:"#6b7280", icon:"📁", msg:"This ticket is closed. Create a new ticket if needed." },
  };
  const s = cfg[ticket.status] || cfg.open;
  
  await send(ticket.email, `${ticket.ticketId} — Status: ${s.label} — ${ticket.subject}`,
    base(`linear-gradient(135deg,${s.color},${s.color}cc)`, s.icon, `Status: ${s.label}`, `Ticket ${ticket.ticketId}`,
    `<p style="color:#e2e8f0;font-size:15px;margin:0 0 16px">Hi <strong style="color:#38bdf8">${ticket.employeeName}</strong>,</p>
    <p style="color:#90a4ae;font-size:14px;margin:0 0 24px">${s.msg}</p>
    <div style="text-align:center;margin:0 0 24px">
      <span style="display:inline-block;padding:14px 40px;border-radius:30px;background:${s.color}15;border:2px solid ${s.color}44;color:${s.color};font-size:20px;font-weight:800">${s.icon} ${s.label.toUpperCase()}</span>
    </div>
    <div style="background:#132F4C;border-radius:12px;padding:16px;border:1px solid #1a3d5c">
      <table style="width:100%">
        <tr><td style="padding:4px 0;color:#546E7A;font-size:12px;width:90px">Ticket</td><td style="color:#38bdf8;font-size:13px;font-weight:700">${ticket.ticketId}</td></tr>
        <tr><td style="padding:4px 0;color:#546E7A;font-size:12px">Subject</td><td style="color:#e2e8f0;font-size:13px">${ticket.subject}</td></tr>
        <tr><td style="padding:4px 0;color:#546E7A;font-size:12px">Assigned</td><td style="color:#90caf9;font-size:13px">${ticket.assignedTo||"Pending"}</td></tr>
      </table>
    </div>
    <p style="color:#546E7A;font-size:11px;margin:20px 0 0;text-align:center">Call IT: <a href="tel:${BRAND.phone}" style="color:#38bdf8;text-decoration:none;font-weight:700">${BRAND.phone}</a></p>`));
}

async function notifyMention(ticket, sender, type, message) {
  const isCall = type === "call";
  const color = isCall ? "#ef5350" : "#38bdf8";
  const icon = isCall ? "📞" : "📢";
  const title = isCall ? `${sender} is calling you!` : `${sender} mentioned you`;
  
  await send(ticket.email, isCall ? `📞 URGENT: ${sender} calling — ${ticket.ticketId}` : `📢 ${sender} mentioned you — ${ticket.ticketId}`,
    base(`linear-gradient(135deg,${color},${color}cc)`, icon, title, `Ticket ${ticket.ticketId}`,
    `<p style="color:#e2e8f0;font-size:15px;margin:0 0 16px">Hi <strong style="color:#38bdf8">${ticket.employeeName}</strong>,</p>
    <div style="text-align:center;margin:0 0 24px">
      <div style="display:inline-block;padding:20px 40px;border-radius:16px;background:${color}15;border:2px solid ${color}44">
        <p style="font-size:40px;margin:0 0 8px">${icon}</p>
        <p style="color:${color};font-size:18px;font-weight:800;margin:0">${title}</p>
      </div>
    </div>
    ${message ? `<div style="background:#0d2137;border-radius:12px;padding:18px;border-left:4px solid ${color};margin:0 0 20px">
      <p style="color:#546E7A;font-size:10px;font-weight:700;margin:0 0 8px">MESSAGE FROM ${sender.toUpperCase()}</p>
      <p style="color:#e2e8f0;font-size:14px;line-height:1.8;margin:0">${message}</p>
    </div>` : ""}
    <div style="background:#132F4C;border-radius:12px;padding:16px;border:1px solid #1a3d5c">
      <table style="width:100%">
        <tr><td style="padding:4px 0;color:#546E7A;font-size:12px;width:90px">Ticket</td><td style="color:#38bdf8;font-size:13px;font-weight:700">${ticket.ticketId}</td></tr>
        <tr><td style="padding:4px 0;color:#546E7A;font-size:12px">Subject</td><td style="color:#e2e8f0;font-size:13px">${ticket.subject}</td></tr>
      </table>
    </div>
    <p style="color:#546E7A;font-size:11px;margin:20px 0 0;text-align:center">Call IT: <a href="tel:${BRAND.phone}" style="color:#38bdf8;text-decoration:none;font-weight:700">${BRAND.phone}</a></p>`));
}

module.exports = { send, notifyTicketCreated, notifyNoteAdded, notifyStatusChange, notifyMention };
