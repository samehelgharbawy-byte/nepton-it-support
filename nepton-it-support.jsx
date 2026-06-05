import { useState, useEffect, useCallback, useRef, useMemo, useReducer } from "react";

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    NEPTON IT SUPPORT — ENTERPRISE EDITION                   ║
// ║                                                                             ║
// ║  A comprehensive multi-portal IT ticketing system featuring:                ║
// ║  • Employee Portal — Submit, track, and manage support requests             ║
// ║  • Tech Support Portal — Accept, diagnose, and resolve tickets              ║
// ║  • Admin Portal — Full analytics dashboard, team management, AI assistant   ║
// ║                                                                             ║
// ║  Built for Nepton Engineering & Contracting                                 ║
// ║  Managing Director: Sameh Elgharbawy                                        ║
// ║  Est. 2012 — MEP Construction — Cairo & Dhahran                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 1: STORAGE KEYS & CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STORAGE_KEYS = {
  tickets: "nepton-tickets-v3",
  techName: "nepton-tech-name",
  activityLog: "nepton-activity-log",
  aiConversation: "nepton-ai-history",
  settings: "nepton-settings",
  slaConfig: "nepton-sla-config",
  userPrefs: "nepton-user-prefs",
  knowledgeBase: "nepton-kb-articles",
};

const APP_CONFIG = {
  version: "3.0.0",
  appName: "Nepton IT Support",
  company: "Nepton Engineering & Contracting",
  established: 2012,
  managingDirector: "Sameh Elgharbawy",
  ticketPrefix: "NPN",
  maxScreenshots: 8,
  maxNoteLength: 2000,
  toastDuration: 4000,
  refreshInterval: 5000,
  animationDuration: 350,
  maxTicketsPerPage: 50,
  aiModel: "claude-sonnet-4-20250514",
  aiMaxTokens: 1000,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 2: DATA DEFINITIONS — Categories, Priorities, Statuses, SLA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CATEGORIES = [
  { id: "hardware",  label: "Hardware Issue",      icon: "🖥️",  color: "#6366f1", description: "Physical equipment, peripherals, workstation problems" },
  { id: "software",  label: "Software / App",      icon: "💿",  color: "#8b5cf6", description: "Application errors, installation, licensing issues" },
  { id: "network",   label: "Network / Internet",  icon: "🌐",  color: "#06b6d4", description: "Connectivity, VPN, Wi-Fi, network access problems" },
  { id: "email",     label: "Email / Outlook",     icon: "📧",  color: "#ec4899", description: "Email client issues, calendar sync, mailbox problems" },
  { id: "access",    label: "Access / Permissions", icon: "🔐", color: "#f97316", description: "Login issues, permission requests, account lockouts" },
  { id: "printer",   label: "Printer / Scanner",   icon: "🖨️",  color: "#14b8a6", description: "Print queue, scanner setup, driver issues" },
  { id: "security",  label: "Security",            icon: "🛡️",  color: "#ef4444", description: "Suspicious activity, malware, data breach concerns" },
  { id: "database",  label: "Database / Server",   icon: "🗄️",  color: "#a855f7", description: "Database connectivity, server errors, data recovery" },
  { id: "phone",     label: "Phone / VoIP",        icon: "📱",  color: "#22d3ee", description: "Desk phone, mobile device, VoIP system issues" },
  { id: "other",     label: "Other",               icon: "📋",  color: "#64748b", description: "General IT requests not covered above" },
];

const PRIORITY_LEVELS = [
  { id: "low",      label: "Low",      color: "#22c55e", bgColor: "#052e16", icon: "▽", weight: 1, slaHours: 72, description: "Minor inconvenience, workaround available" },
  { id: "medium",   label: "Medium",   color: "#eab308", bgColor: "#422006", icon: "◇", weight: 2, slaHours: 24, description: "Impacting productivity, no workaround" },
  { id: "high",     label: "High",     color: "#f97316", bgColor: "#431407", icon: "△", weight: 3, slaHours: 8,  description: "Major business impact, urgent attention needed" },
  { id: "critical", label: "Critical", color: "#ef4444", bgColor: "#450a0a", icon: "⬆", weight: 4, slaHours: 2,  description: "System down, entire team or business affected" },
];

const STATUS_FLOW = {
  open:        { label: "Open",        color: "#3b82f6", bgColor: "#172554", icon: "○", ring: "#3b82f680", next: ["in_progress", "closed"] },
  in_progress: { label: "In Progress", color: "#f59e0b", bgColor: "#451a03", icon: "◐", ring: "#f59e0b80", next: ["resolved", "open", "closed"] },
  resolved:    { label: "Resolved",    color: "#22c55e", bgColor: "#052e16", icon: "◉", ring: "#22c55e80", next: ["closed", "open"] },
  closed:      { label: "Closed",      color: "#64748b", bgColor: "#1e293b", icon: "●", ring: "#64748b80", next: ["open"] },
};

const DEPARTMENTS = [
  { id: "engineering",  name: "Engineering",       icon: "⚙️",  head: "Technical Director" },
  { id: "sales",        name: "Sales",             icon: "💼",  head: "Sales Manager" },
  { id: "marketing",    name: "Marketing",         icon: "📢",  head: "Marketing Lead" },
  { id: "finance",      name: "Finance",           icon: "💰",  head: "CFO" },
  { id: "hr",           name: "Human Resources",   icon: "👥",  head: "HR Manager" },
  { id: "operations",   name: "Operations",        icon: "🏗️",  head: "Operations Director" },
  { id: "legal",        name: "Legal",             icon: "⚖️",  head: "Legal Counsel" },
  { id: "support",      name: "Customer Support",  icon: "🎧",  head: "Support Lead" },
  { id: "management",   name: "Management",        icon: "👔",  head: "Managing Director" },
  { id: "it",           name: "IT Department",     icon: "🖥️",  head: "IT Manager" },
  { id: "procurement",  name: "Procurement",       icon: "📦",  head: "Procurement Manager" },
  { id: "quality",      name: "Quality Assurance",  icon: "✅", head: "QA Manager" },
];

const RESOLUTION_TEMPLATES = [
  { id: "restart",     label: "System Restart",        text: "Issue resolved by restarting the system/application. Verified functionality restored." },
  { id: "update",      label: "Software Update",       text: "Applied latest software updates/patches. System tested and verified working." },
  { id: "permission",  label: "Permission Granted",    text: "Access permissions have been updated. User can now access the requested resources." },
  { id: "replacement", label: "Hardware Replacement",  text: "Faulty hardware has been replaced with new equipment. Tested and operational." },
  { id: "config",      label: "Configuration Fix",     text: "System configuration has been corrected. Settings verified and tested." },
  { id: "training",    label: "User Training",         text: "Provided user guidance on correct procedure. Issue was due to incorrect usage." },
  { id: "network",     label: "Network Reset",         text: "Network connection has been reset/reconfigured. Connectivity verified." },
  { id: "escalated",   label: "Escalated to Vendor",   text: "Issue has been escalated to the vendor/third-party support for resolution." },
];

const KNOWLEDGE_BASE = [
  { id: "kb001", category: "network",   title: "VPN Connection Troubleshooting",   steps: ["Check internet connectivity", "Restart VPN client", "Clear VPN cache", "Verify credentials", "Contact IT if issue persists"] },
  { id: "kb002", category: "email",     title: "Outlook Not Syncing",              steps: ["Check internet connection", "Restart Outlook", "Clear Outlook cache", "Remove and re-add account", "Update Outlook to latest version"] },
  { id: "kb003", category: "printer",   title: "Printer Not Responding",           steps: ["Check printer is powered on", "Verify cable/network connection", "Restart print spooler service", "Remove and re-add printer", "Update printer drivers"] },
  { id: "kb004", category: "access",    title: "Account Locked Out",               steps: ["Wait 15 minutes for auto-unlock", "Try password reset via self-service", "Clear browser cache and cookies", "Contact IT to manually unlock", "Verify caps lock is off"] },
  { id: "kb005", category: "hardware",  title: "Computer Running Slow",            steps: ["Close unnecessary applications", "Clear temporary files", "Check disk space (need >10% free)", "Run malware scan", "Check for pending system updates"] },
  { id: "kb006", category: "software",  title: "Application Crashes on Launch",    steps: ["Restart the application", "Check for updates", "Run as administrator", "Reinstall the application", "Check system requirements"] },
  { id: "kb007", category: "security",  title: "Suspicious Email Received",        steps: ["Do NOT click any links", "Do NOT download attachments", "Report to IT Security immediately", "Mark as phishing in email client", "Delete the email after reporting"] },
  { id: "kb008", category: "network",   title: "Wi-Fi Keeps Disconnecting",        steps: ["Forget and reconnect to network", "Update wireless drivers", "Move closer to access point", "Reset network settings", "Check for interference sources"] },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 3: DESIGN SYSTEM — Tokens, Themes, Typography, Animations
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DESIGN_TOKENS = {
  // Radius scale
  radius: { xs: "4px", sm: "6px", md: "10px", lg: "14px", xl: "20px", pill: "9999px", circle: "50%" },
  // Spacing scale (4px base)
  space: { xxs: "2px", xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "24px", xxl: "32px", xxxl: "48px" },
  // Shadow scale
  shadow: {
    sm: "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
    md: "0 4px 12px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)",
    lg: "0 8px 32px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.2)",
    xl: "0 16px 48px rgba(0,0,0,0.5), 0 8px 16px rgba(0,0,0,0.3)",
    glow: (color) => `0 0 20px ${color}40, 0 0 60px ${color}20`,
    neon: (color) => `0 0 8px ${color}60, 0 0 24px ${color}30, inset 0 0 12px ${color}10`,
  },
  // Font scale
  font: {
    display: "'Syne', sans-serif",
    heading: "'Plus Jakarta Sans', sans-serif",
    body: "'DM Sans', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  fontSize: { xxs: "9px", xs: "10px", sm: "11px", md: "13px", lg: "15px", xl: "18px", xxl: "24px", display: "36px" },
  // Transitions
  transition: {
    fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
    base: "250ms cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "400ms cubic-bezier(0.4, 0, 0.2, 1)",
    spring: "500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
    bounce: "600ms cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  },
};

const THEME = {
  // Core surfaces
  bg:           "#060a13",
  bgSurface:    "#0c1220",
  bgElevated:   "#111927",
  bgOverlay:    "#161f30",
  bgHover:      "#1a2540",
  bgActive:     "#1e2d4a",
  // Borders
  border:       "#1e293b",
  borderHover:  "#334155",
  borderActive: "#475569",
  // Text
  text:         "#e2e8f0",
  textSecondary:"#94a3b8",
  textTertiary: "#64748b",
  textMuted:    "#475569",
  // Accent colors
  blue:         "#3b82f6",
  blueLight:    "#60a5fa",
  blueDark:     "#1d4ed8",
  cyan:         "#06b6d4",
  cyanLight:    "#22d3ee",
  amber:        "#f59e0b",
  amberLight:   "#fbbf24",
  amberDark:    "#d97706",
  emerald:      "#10b981",
  emeraldLight: "#34d399",
  emeraldDark:  "#059669",
  red:          "#ef4444",
  redLight:     "#f87171",
  redDark:      "#dc2626",
  violet:       "#8b5cf6",
  violetLight:  "#a78bfa",
  pink:         "#ec4899",
  orange:       "#f97316",
  // Semantic
  success:      "#22c55e",
  warning:      "#eab308",
  error:        "#ef4444",
  info:         "#3b82f6",
};

// Portal-specific accent palettes
const PORTAL_THEMES = {
  employee: {
    accent:     "#06b6d4",
    accentHover:"#22d3ee",
    accentDark: "#0891b2",
    accentBg:   "#06b6d410",
    gradient:   "linear-gradient(135deg, #06b6d4, #0891b2, #0e7490)",
    gradientText: "linear-gradient(135deg, #22d3ee, #06b6d4)",
    label:      "EMPLOYEE",
    headerBg:   "linear-gradient(135deg, #0c1220 0%, #0c1a28 50%, #0c1220 100%)",
    headerBorder: "#164e63",
  },
  tech: {
    accent:     "#f59e0b",
    accentHover:"#fbbf24",
    accentDark: "#d97706",
    accentBg:   "#f59e0b10",
    gradient:   "linear-gradient(135deg, #f59e0b, #d97706, #b45309)",
    gradientText: "linear-gradient(135deg, #fbbf24, #f59e0b)",
    label:      "TECH SUPPORT",
    headerBg:   "linear-gradient(135deg, #0c1220 0%, #1a1400 50%, #0c1220 100%)",
    headerBorder: "#78350f",
  },
  admin: {
    accent:     "#10b981",
    accentHover:"#34d399",
    accentDark: "#059669",
    accentBg:   "#10b98110",
    gradient:   "linear-gradient(135deg, #10b981, #059669, #047857)",
    gradientText: "linear-gradient(135deg, #34d399, #10b981)",
    label:      "ADMIN",
    headerBg:   "linear-gradient(135deg, #0c1220 0%, #0a1f16 50%, #0c1220 100%)",
    headerBorder: "#064e3b",
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 4: GLOBAL STYLESHEET
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Syne:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: ${DESIGN_TOKENS.font.body};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  input, select, textarea, button {
    font-family: ${DESIGN_TOKENS.font.body};
  }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: ${THEME.border};
    border-radius: 10px;
    transition: background 0.2s;
  }
  ::-webkit-scrollbar-thumb:hover { background: ${THEME.borderHover}; }

  /* ── Selection ── */
  ::selection {
    background: ${THEME.cyan}40;
    color: ${THEME.text};
  }

  /* ── Placeholder ── */
  ::placeholder {
    color: ${THEME.textMuted};
    opacity: 1;
  }

  /* ── Focus ring ── */
  :focus-visible {
    outline: 2px solid ${THEME.cyan}80;
    outline-offset: 2px;
  }

  /* ══════════════════════════════════════════════════
     KEYFRAME ANIMATIONS
     ══════════════════════════════════════════════════ */

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeInDown {
    from { opacity: 0; transform: translateY(-12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeInScale {
    from { opacity: 0; transform: scale(0.92); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(24px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-24px); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.85); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes popIn {
    0% { opacity: 0; transform: scale(0.6); }
    70% { transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 4px currentColor; }
    50% { box-shadow: 0 0 16px currentColor, 0 0 32px currentColor; }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  @keyframes breathe {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.05); opacity: 1; }
  }

  @keyframes morphBg {
    0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
    50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
  }

  @keyframes toastIn {
    from { opacity: 0; transform: translateX(100%) scale(0.8); }
    to { opacity: 1; transform: translateX(0) scale(1); }
  }

  @keyframes toastOut {
    from { opacity: 1; transform: translateX(0) scale(1); }
    to { opacity: 0; transform: translateX(100%) scale(0.8); }
  }

  @keyframes progressBar {
    from { width: 100%; }
    to { width: 0%; }
  }

  @keyframes countUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes gridHighlight {
    0% { background: transparent; }
    50% { background: ${THEME.cyan}08; }
    100% { background: transparent; }
  }

  @keyframes borderPulse {
    0%, 100% { border-color: ${THEME.border}; }
    50% { border-color: ${THEME.borderHover}; }
  }

  @keyframes skeletonLoad {
    0% { background-position: -200px 0; }
    100% { background-position: calc(200px + 100%) 0; }
  }

  @keyframes ripple {
    0% { transform: scale(0); opacity: 0.5; }
    100% { transform: scale(4); opacity: 0; }
  }

  @keyframes drawLine {
    from { stroke-dashoffset: 100; }
    to { stroke-dashoffset: 0; }
  }

  @keyframes typewriter {
    from { width: 0; }
    to { width: 100%; }
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  @keyframes orbitSlow {
    from { transform: rotate(0deg) translateX(120px) rotate(0deg); }
    to { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
  }

  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes dotPulse {
    0%, 80%, 100% { transform: scale(0); opacity: 0; }
    40% { transform: scale(1); opacity: 1; }
  }

  @keyframes mascotWave {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(15deg); }
    75% { transform: rotate(-10deg); }
  }

  @keyframes mascotBlink {
    0%, 90%, 100% { transform: scaleY(1); }
    95% { transform: scaleY(0.1); }
  }

  @keyframes particleDrift {
    0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
    10% { opacity: 0.6; }
    90% { opacity: 0.6; }
    100% { transform: translateY(-100vh) translateX(50px) rotate(720deg); opacity: 0; }
  }
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 5: UTILITY FUNCTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Generate a unique ticket ID like NPN-4827 */
function generateTicketId() {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${APP_CONFIG.ticketPrefix}-${num}`;
}

/** Generate a unique random ID for internal use */
function generateUUID() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/** Escape HTML entities to prevent XSS */
function escapeHTML(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/** Format a date string into a human-readable relative or absolute format */
function formatDate(dateStr, options = {}) {
  if (!dateStr) return "—";
  const { relative = true, showTime = false } = options;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  
  if (relative) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  }
  
  const opts = { month: "short", day: "numeric" };
  if (date.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  if (showTime) { opts.hour = "2-digit"; opts.minute = "2-digit"; }
  return date.toLocaleDateString("en-US", opts);
}

/** Format a number with thousand separators */
function formatNumber(num) {
  if (typeof num !== "number" || isNaN(num)) return "0";
  return num.toLocaleString("en-US");
}

/** Calculate percentage with safety check */
function calcPercent(part, total) {
  if (!total || total === 0) return 0;
  return Math.round((part / total) * 100);
}

/** Calculate SLA status for a ticket */
function calculateSLA(ticket) {
  if (!ticket || !ticket.createdAt) return { status: "unknown", remaining: 0, elapsed: 0, percentage: 0 };
  
  const priority = PRIORITY_LEVELS.find(p => p.id === ticket.priority);
  if (!priority) return { status: "unknown", remaining: 0, elapsed: 0, percentage: 0 };
  
  const created = new Date(ticket.createdAt);
  const now = new Date();
  const deadline = new Date(created.getTime() + priority.slaHours * 3600000);
  const elapsedMs = now - created;
  const totalMs = priority.slaHours * 3600000;
  const remainingMs = deadline - now;
  const percentage = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
  
  if (ticket.status === "resolved" || ticket.status === "closed") {
    return { status: "met", remaining: 0, elapsed: elapsedMs, percentage: 100 };
  }
  
  if (remainingMs <= 0) {
    return { status: "breached", remaining: 0, elapsed: elapsedMs, percentage: 100 };
  }
  
  if (percentage >= 75) {
    return { status: "warning", remaining: remainingMs, elapsed: elapsedMs, percentage };
  }
  
  return { status: "ok", remaining: remainingMs, elapsed: elapsedMs, percentage };
}

/** Format SLA remaining time */
function formatSLATime(ms) {
  if (ms <= 0) return "Overdue";
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/** Calculate average resolution time from tickets */
function calcAvgResolutionTime(tickets) {
  const resolved = tickets.filter(t => (t.status === "resolved" || t.status === "closed") && t.resolvedAt && t.createdAt);
  if (resolved.length === 0) return null;
  const total = resolved.reduce((sum, t) => {
    return sum + (new Date(t.resolvedAt) - new Date(t.createdAt));
  }, 0);
  return total / resolved.length;
}

/** Format milliseconds to readable duration */
function formatDuration(ms) {
  if (!ms || ms <= 0) return "—";
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins} min`;
}

/** Debounce function */
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Truncate text with ellipsis */
function truncate(str, maxLen = 60) {
  if (!str || str.length <= maxLen) return str || "";
  return str.substring(0, maxLen - 3) + "…";
}

/** Get initials from a name */
function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().substring(0, 2);
}

/** Generate a consistent color from a string (for avatars) */
function stringToColor(str) {
  if (!str) return THEME.textMuted;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#06b6d4", "#10b981", "#eab308", "#ef4444", "#14b8a6", "#a855f7"];
  return colors[Math.abs(hash) % colors.length];
}

/** Sort tickets by priority weight (critical first) then by date */
function sortTickets(tickets, sortBy = "priority") {
  return [...tickets].sort((a, b) => {
    if (sortBy === "priority") {
      const wA = PRIORITY_LEVELS.find(p => p.id === a.priority)?.weight || 0;
      const wB = PRIORITY_LEVELS.find(p => p.id === b.priority)?.weight || 0;
      if (wB !== wA) return wB - wA;
    }
    if (sortBy === "status") {
      const order = { open: 0, in_progress: 1, resolved: 2, closed: 3 };
      if ((order[a.status] || 0) !== (order[b.status] || 0)) return (order[a.status] || 0) - (order[b.status] || 0);
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

/** Generate sparkline data points from ticket history */
function generateSparklineData(tickets, days = 7) {
  const data = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const count = tickets.filter(t => {
      const d = new Date(t.createdAt);
      return d >= dayStart && d <= dayEnd;
    }).length;
    data.push(count);
  }
  return data;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 6: STORAGE HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function storageGet(key) {
  try {
    const result = await window.storage.get(key);
    if (result && result.value) return JSON.parse(result.value);
  } catch (e) { /* key doesn't exist */ }
  return null;
}

async function storageSet(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Storage write failed [${key}]:`, e);
    return false;
  }
}

async function loadTickets() {
  const data = await storageGet(STORAGE_KEYS.tickets);
  return Array.isArray(data) ? data : [];
}

async function saveTickets(tickets) {
  return storageSet(STORAGE_KEYS.tickets, tickets);
}

async function loadActivityLog() {
  const data = await storageGet(STORAGE_KEYS.activityLog);
  return Array.isArray(data) ? data : [];
}

async function saveActivityLog(log) {
  // Keep only last 200 entries
  const trimmed = log.slice(0, 200);
  return storageSet(STORAGE_KEYS.activityLog, trimmed);
}

async function logActivity(action, details = {}) {
  const log = await loadActivityLog();
  log.unshift({
    id: generateUUID(),
    action,
    ...details,
    timestamp: new Date().toISOString(),
  });
  await saveActivityLog(log);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 7: CUSTOM HOOKS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * useTickets — Central ticket state management with auto-refresh
 * Handles loading, saving, and live-syncing of ticket data
 */
function useTickets(refreshMs = APP_CONFIG.refreshInterval) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const ticketsRef = useRef(tickets);
  ticketsRef.current = tickets;

  // Initial load
  useEffect(() => {
    loadTickets().then(t => {
      setTickets(t);
      setLoading(false);
      setLastSync(new Date());
    });
  }, []);

  // Auto-refresh from storage (other portals may have updated)
  useEffect(() => {
    const interval = setInterval(async () => {
      const t = await loadTickets();
      setTickets(t);
      setLastSync(new Date());
    }, refreshMs);
    return () => clearInterval(interval);
  }, [refreshMs]);

  // Atomic update: load latest → apply transform → save
  const update = useCallback(async (transformFn) => {
    const latest = await loadTickets();
    const updated = transformFn(latest);
    setTickets(updated);
    await saveTickets(updated);
    setLastSync(new Date());
    return updated;
  }, []);

  // Computed statistics
  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter(t => t.status === "open").length;
    const inProgress = tickets.filter(t => t.status === "in_progress").length;
    const resolved = tickets.filter(t => t.status === "resolved").length;
    const closed = tickets.filter(t => t.status === "closed").length;
    const critical = tickets.filter(t => t.priority === "critical" && t.status !== "resolved" && t.status !== "closed").length;
    const high = tickets.filter(t => t.priority === "high" && t.status !== "resolved" && t.status !== "closed").length;
    const unassigned = tickets.filter(t => !t.assignedTo && t.status !== "resolved" && t.status !== "closed").length;
    const breachedSLA = tickets.filter(t => {
      const sla = calculateSLA(t);
      return sla.status === "breached";
    }).length;
    const avgResolution = calcAvgResolutionTime(tickets);
    const todayCount = tickets.filter(t => {
      const d = new Date(t.createdAt);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    }).length;

    // Resolution rate
    const resolutionRate = total > 0 ? calcPercent(resolved + closed, total) : 0;

    // SLA compliance rate
    const slaTickets = tickets.filter(t => t.status === "resolved" || t.status === "closed");
    const slaMet = slaTickets.filter(t => {
      const p = PRIORITY_LEVELS.find(pr => pr.id === t.priority);
      if (!p || !t.resolvedAt) return false;
      const elapsed = new Date(t.resolvedAt) - new Date(t.createdAt);
      return elapsed <= p.slaHours * 3600000;
    }).length;
    const slaCompliance = slaTickets.length > 0 ? calcPercent(slaMet, slaTickets.length) : 100;

    return {
      total, open, inProgress, resolved, closed,
      critical, high, unassigned, breachedSLA,
      avgResolution, todayCount, resolutionRate, slaCompliance,
    };
  }, [tickets]);

  return { tickets, loading, lastSync, stats, update, setTickets };
}

/**
 * useNotification — Toast notification system with queue support
 */
function useNotification() {
  const [notifications, setNotifications] = useState([]);
  
  const show = useCallback((msg, type = "success") => {
    const id = generateUUID();
    setNotifications(prev => [...prev, { id, msg, type, exiting: false }]);
    
    // Start exit animation
    setTimeout(() => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, exiting: true } : n));
    }, APP_CONFIG.toastDuration - 300);
    
    // Remove
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, APP_CONFIG.toastDuration);
    
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, exiting: true } : n));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 300);
  }, []);

  return { notifications, show, dismiss };
}

/**
 * useActivityLog — Track and display system activity
 */
function useActivityLog() {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivityLog().then(l => { setLog(l); setLoading(false); });
    const iv = setInterval(async () => {
      const l = await loadActivityLog();
      setLog(l);
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  const addEntry = useCallback(async (action, details = {}) => {
    await logActivity(action, details);
    const updated = await loadActivityLog();
    setLog(updated);
  }, []);

  return { log, loading, addEntry };
}

/**
 * useKeyboardShortcuts — Global keyboard shortcut handler
 */
function useKeyboardShortcuts(shortcuts = {}) {
  useEffect(() => {
    const handler = (e) => {
      // Don't trigger in inputs
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      
      const key = [
        e.ctrlKey || e.metaKey ? "ctrl" : "",
        e.shiftKey ? "shift" : "",
        e.altKey ? "alt" : "",
        e.key.toLowerCase(),
      ].filter(Boolean).join("+");
      
      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);
}

/**
 * useSearch — Filtered ticket search with debounce
 */
function useSearch(tickets, delay = 200) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), delay);
    return () => clearTimeout(timer);
  }, [query, delay]);

  const filtered = useMemo(() => {
    let result = tickets;

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(t => t.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      result = result.filter(t => t.priority === priorityFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter(t => t.category === categoryFilter);
    }

    // Department filter
    if (departmentFilter !== "all") {
      result = result.filter(t => t.department === departmentFilter);
    }

    // Assignee filter
    if (assigneeFilter !== "all") {
      if (assigneeFilter === "unassigned") {
        result = result.filter(t => !t.assignedTo);
      } else {
        result = result.filter(t => t.assignedTo === assigneeFilter);
      }
    }

    // Search query
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(t =>
        (t.subject || "").toLowerCase().includes(q) ||
        (t.id || "").toLowerCase().includes(q) ||
        (t.employeeName || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q) ||
        (t.department || "").toLowerCase().includes(q)
      );
    }

    // Sort
    result = sortTickets(result, sortBy);

    return result;
  }, [tickets, statusFilter, priorityFilter, categoryFilter, departmentFilter, assigneeFilter, debouncedQuery, sortBy]);

  const clearFilters = useCallback(() => {
    setQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setCategoryFilter("all");
    setDepartmentFilter("all");
    setAssigneeFilter("all");
    setSortBy("priority");
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== "all") count++;
    if (priorityFilter !== "all") count++;
    if (categoryFilter !== "all") count++;
    if (departmentFilter !== "all") count++;
    if (assigneeFilter !== "all") count++;
    if (query.trim()) count++;
    return count;
  }, [statusFilter, priorityFilter, categoryFilter, departmentFilter, assigneeFilter, query]);

  return {
    query, setQuery, statusFilter, setStatusFilter, priorityFilter, setPriorityFilter,
    categoryFilter, setCategoryFilter, departmentFilter, setDepartmentFilter,
    assigneeFilter, setAssigneeFilter, sortBy, setSortBy,
    filtered, clearFilters, activeFilterCount,
  };
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 8: SHARED UI COMPONENTS — Design System Building Blocks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Common Styles ──

const baseInputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: DESIGN_TOKENS.radius.md,
  border: `1px solid ${THEME.border}`,
  background: THEME.bg,
  color: THEME.text,
  fontSize: DESIGN_TOKENS.fontSize.md,
  fontFamily: DESIGN_TOKENS.font.body,
  outline: "none",
  transition: `all ${DESIGN_TOKENS.transition.fast}`,
};

const baseLabelStyle = {
  display: "block",
  fontSize: DESIGN_TOKENS.fontSize.xs,
  fontWeight: 600,
  color: THEME.textTertiary,
  textTransform: "uppercase",
  letterSpacing: "1px",
  marginBottom: 6,
  fontFamily: DESIGN_TOKENS.font.body,
};

const baseCardStyle = {
  background: THEME.bgSurface,
  borderRadius: DESIGN_TOKENS.radius.lg,
  border: `1px solid ${THEME.border}`,
  transition: `all ${DESIGN_TOKENS.transition.base}`,
};

// ── Notification Toast System ──

function NotificationStack({ notifications, onDismiss }) {
  if (!notifications || notifications.length === 0) return null;

  const typeConfig = {
    success: { icon: "✓", bg: "#052e16", border: "#22c55e", color: "#86efac", barColor: "#22c55e" },
    error:   { icon: "✕", bg: "#450a0a", border: "#ef4444", color: "#fca5a5", barColor: "#ef4444" },
    warning: { icon: "⚠", bg: "#422006", border: "#eab308", color: "#fde68a", barColor: "#eab308" },
    info:    { icon: "ℹ", bg: "#172554", border: "#3b82f6", color: "#93c5fd", barColor: "#3b82f6" },
  };

  return (
    <div style={{
      position: "fixed", top: 16, right: 16, zIndex: 99999,
      display: "flex", flexDirection: "column", gap: 8, maxWidth: 420,
    }}>
      {notifications.map((n, idx) => {
        const cfg = typeConfig[n.type] || typeConfig.success;
        return (
          <div key={n.id} style={{
            background: cfg.bg,
            border: `1px solid ${cfg.border}40`,
            borderLeft: `4px solid ${cfg.border}`,
            borderRadius: DESIGN_TOKENS.radius.md,
            padding: "14px 18px 14px 16px",
            color: cfg.color,
            fontSize: DESIGN_TOKENS.fontSize.md,
            fontFamily: DESIGN_TOKENS.font.body,
            boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${cfg.border}20`,
            animation: n.exiting ? "toastOut 0.3s ease forwards" : `toastIn 0.35s ease ${idx * 0.06}s both`,
            display: "flex", alignItems: "center", gap: 12,
            position: "relative", overflow: "hidden",
            cursor: "pointer",
            backdropFilter: "blur(12px)",
          }}
          onClick={() => onDismiss?.(n.id)}>
            <span style={{
              width: 24, height: 24, borderRadius: DESIGN_TOKENS.radius.circle,
              background: `${cfg.border}20`, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "12px", fontWeight: 700,
              flexShrink: 0, border: `1px solid ${cfg.border}40`,
            }}>{cfg.icon}</span>
            <span style={{ flex: 1, lineHeight: 1.4, fontWeight: 500 }}>{n.msg}</span>
            {/* Progress bar */}
            {!n.exiting && (
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
                background: `${cfg.barColor}20`,
              }}>
                <div style={{
                  height: "100%", background: cfg.barColor,
                  animation: `progressBar ${APP_CONFIG.toastDuration}ms linear forwards`,
                }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Status Badge ──

function StatusBadge({ status, size = "sm", showIcon = true, interactive = false, onClick }) {
  const s = STATUS_FLOW[status];
  if (!s) return null;

  const sizes = {
    xs: { padding: "2px 8px", fontSize: "8px", iconSize: "7px", gap: 3 },
    sm: { padding: "4px 12px", fontSize: "10px", iconSize: "8px", gap: 4 },
    md: { padding: "6px 16px", fontSize: "11px", iconSize: "9px", gap: 5 },
    lg: { padding: "8px 20px", fontSize: "12px", iconSize: "10px", gap: 6 },
  };
  const sz = sizes[size] || sizes.sm;

  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: sz.gap,
        padding: sz.padding, borderRadius: DESIGN_TOKENS.radius.pill,
        fontSize: sz.fontSize, fontWeight: 600,
        background: s.bgColor, color: s.color,
        border: `1px solid ${s.color}30`,
        textTransform: "uppercase", letterSpacing: "0.8px",
        whiteSpace: "nowrap",
        cursor: interactive ? "pointer" : "default",
        transition: `all ${DESIGN_TOKENS.transition.fast}`,
        fontFamily: DESIGN_TOKENS.font.body,
      }}>
      {showIcon && <span style={{ fontSize: sz.iconSize, lineHeight: 1 }}>{s.icon}</span>}
      {s.label}
    </span>
  );
}

// ── Priority Indicator ──

function PriorityIndicator({ priority, variant = "dot", showLabel = false, size = "sm" }) {
  const p = PRIORITY_LEVELS.find(l => l.id === priority);
  if (!p) return null;

  const sizes = { xs: 6, sm: 8, md: 10, lg: 12 };
  const dotSize = sizes[size] || 8;

  if (variant === "badge") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 10px", borderRadius: DESIGN_TOKENS.radius.pill,
        background: p.bgColor, color: p.color,
        border: `1px solid ${p.color}30`,
        fontSize: DESIGN_TOKENS.fontSize.xs, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.5px",
      }}>
        <span style={{ fontSize: "8px" }}>{p.icon}</span>
        {p.label}
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{
        width: dotSize, height: dotSize,
        borderRadius: DESIGN_TOKENS.radius.circle,
        background: p.color,
        boxShadow: `0 0 ${dotSize}px ${p.color}60`,
        flexShrink: 0,
        animation: priority === "critical" ? "pulseGlow 2s ease-in-out infinite" : "none",
      }} />
      {showLabel && (
        <span style={{
          fontSize: DESIGN_TOKENS.fontSize.sm,
          color: p.color,
          fontWeight: 600,
          fontFamily: DESIGN_TOKENS.font.body,
        }}>{p.label}</span>
      )}
    </span>
  );
}

// ── SLA Indicator ──

function SLAIndicator({ ticket, compact = false }) {
  const sla = calculateSLA(ticket);
  const priority = PRIORITY_LEVELS.find(p => p.id === ticket.priority);

  const statusConfig = {
    ok:       { color: "#22c55e", bg: "#052e16", label: "On Track", icon: "✓" },
    warning:  { color: "#eab308", bg: "#422006", label: "At Risk",  icon: "⚠" },
    breached: { color: "#ef4444", bg: "#450a0a", label: "Breached", icon: "✕" },
    met:      { color: "#22c55e", bg: "#052e16", label: "Met",      icon: "✓" },
    unknown:  { color: "#64748b", bg: "#1e293b", label: "N/A",      icon: "—" },
  };

  const cfg = statusConfig[sla.status] || statusConfig.unknown;

  if (compact) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 8px", borderRadius: DESIGN_TOKENS.radius.pill,
        background: cfg.bg, color: cfg.color,
        fontSize: "9px", fontWeight: 600,
        border: `1px solid ${cfg.color}20`,
      }}>
        <span>{cfg.icon}</span>
        {sla.status === "ok" || sla.status === "warning"
          ? formatSLATime(sla.remaining)
          : cfg.label
        }
      </span>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 12px", borderRadius: DESIGN_TOKENS.radius.md,
      background: cfg.bg, border: `1px solid ${cfg.color}20`,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: DESIGN_TOKENS.radius.circle,
        background: `${cfg.color}15`, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: "12px", color: cfg.color,
        fontWeight: 700,
      }}>{cfg.icon}</div>
      <div>
        <div style={{ fontSize: "10px", color: cfg.color, fontWeight: 600, marginBottom: 2 }}>
          SLA: {cfg.label}
        </div>
        <div style={{ fontSize: "9px", color: THEME.textTertiary }}>
          {priority ? `${priority.slaHours}h target` : "—"}
          {(sla.status === "ok" || sla.status === "warning") && ` • ${formatSLATime(sla.remaining)} remaining`}
        </div>
      </div>
      {/* Progress bar */}
      <div style={{
        flex: 1, height: 4, background: `${THEME.border}`,
        borderRadius: 2, overflow: "hidden", minWidth: 40,
      }}>
        <div style={{
          height: "100%",
          width: `${Math.min(100, sla.percentage)}%`,
          background: cfg.color,
          borderRadius: 2,
          transition: `width ${DESIGN_TOKENS.transition.base}`,
        }} />
      </div>
    </div>
  );
}

// ── Avatar ──

function Avatar({ name, size = 32, showTooltip = false }) {
  const bgColor = stringToColor(name);
  const initials = getInitials(name);

  return (
    <div
      title={showTooltip ? name : undefined}
      style={{
        width: size, height: size,
        borderRadius: DESIGN_TOKENS.radius.circle,
        background: `${bgColor}20`,
        border: `1.5px solid ${bgColor}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.35, fontWeight: 700,
        color: bgColor,
        fontFamily: DESIGN_TOKENS.font.heading,
        flexShrink: 0,
        transition: `all ${DESIGN_TOKENS.transition.fast}`,
      }}>
      {initials}
    </div>
  );
}

// ── Sparkline Chart (mini) ──

function Sparkline({ data, width = 80, height = 24, color = THEME.cyan, fill = true }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  const fillPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      {fill && (
        <polygon
          points={fillPoints}
          fill={`${color}15`}
          stroke="none"
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}40)` }}
      />
      {/* End dot */}
      {data.length > 0 && (() => {
        const lastX = width;
        const lastY = height - ((data[data.length - 1] - min) / range) * (height - 4) - 2;
        return <circle cx={lastX} cy={lastY} r="2.5" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color}80)` }} />;
      })()}
    </svg>
  );
}

// ── Donut Chart ──

function DonutChart({ segments, size = 120, thickness = 14, centerLabel, centerValue }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={(size-thickness)/2} fill="none" stroke={THEME.border} strokeWidth={thickness} />
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" fill={THEME.textMuted} fontSize="11" fontFamily={DESIGN_TOKENS.font.body}>No data</text>
      </svg>
    );
  }

  const radius = (size - thickness) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = -circumference / 4; // Start from top

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke={THEME.border} strokeWidth={thickness} opacity="0.3" />
        {/* Segments */}
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const dashLen = circumference * pct;
          const dashGap = circumference - dashLen;
          const currentOffset = offset;
          offset += dashLen;
          return (
            <circle key={i}
              cx={center} cy={center} r={radius}
              fill="none" stroke={seg.color} strokeWidth={thickness}
              strokeDasharray={`${dashLen} ${dashGap}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="round"
              style={{
                transition: `all ${DESIGN_TOKENS.transition.slow}`,
                filter: `drop-shadow(0 0 4px ${seg.color}30)`,
              }}
            />
          );
        })}
      </svg>
      {/* Center label */}
      {(centerLabel || centerValue !== undefined) && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          {centerValue !== undefined && (
            <span style={{
              fontSize: size * 0.2, fontWeight: 800,
              color: THEME.text, fontFamily: DESIGN_TOKENS.font.heading,
              lineHeight: 1.1,
            }}>{centerValue}</span>
          )}
          {centerLabel && (
            <span style={{
              fontSize: size * 0.08, color: THEME.textTertiary,
              fontWeight: 500, textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>{centerLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Bar Chart ──

function BarChart({ data, height = 140, barColor, showValues = true, maxBars = 10 }) {
  if (!data || data.length === 0) return <div style={{ color: THEME.textMuted, fontSize: "11px", textAlign: "center", padding: 20 }}>No data</div>;

  const displayData = data.slice(0, maxBars);
  const maxVal = Math.max(...displayData.map(d => d.value), 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height, padding: "0 4px" }}>
      {displayData.map((d, i) => {
        const barH = Math.max(4, (d.value / maxVal) * (height - 30));
        const color = d.color || barColor || THEME.cyan;
        return (
          <div key={i} style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", gap: 4, minWidth: 0,
          }}>
            {showValues && (
              <span style={{
                fontSize: "9px", fontWeight: 600, color: THEME.textSecondary,
                fontFamily: DESIGN_TOKENS.font.mono,
              }}>{d.value}</span>
            )}
            <div style={{
              width: "100%", height: barH,
              background: `linear-gradient(180deg, ${color}, ${color}80)`,
              borderRadius: "4px 4px 2px 2px",
              transition: `height ${DESIGN_TOKENS.transition.slow}`,
              animation: `fadeInUp 0.4s ease ${i * 0.05}s both`,
              boxShadow: `0 0 8px ${color}20`,
              minHeight: 4,
            }} />
            <span style={{
              fontSize: "8px", color: THEME.textTertiary,
              textAlign: "center", lineHeight: 1.1,
              overflow: "hidden", textOverflow: "ellipsis",
              whiteSpace: "nowrap", width: "100%",
            }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Heatmap (7-day activity) ──

function ActivityHeatmap({ tickets, days = 28 }) {
  const now = new Date();
  const cells = [];

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const count = tickets.filter(t => {
      const d = new Date(t.createdAt);
      return d >= day && d <= dayEnd;
    }).length;

    cells.push({
      date: day,
      count,
      label: day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    });
  }

  const maxCount = Math.max(...cells.map(c => c.count), 1);

  return (
    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
      {cells.map((cell, i) => {
        const intensity = cell.count / maxCount;
        const bg = cell.count === 0
          ? THEME.bgElevated
          : `rgba(6, 182, 212, ${0.15 + intensity * 0.7})`;
        return (
          <div key={i} title={`${cell.label}: ${cell.count} tickets`} style={{
            width: 14, height: 14,
            borderRadius: 3,
            background: bg,
            border: `1px solid ${cell.count > 0 ? THEME.cyan + "20" : THEME.border}`,
            transition: `all ${DESIGN_TOKENS.transition.fast}`,
            cursor: "default",
          }} />
        );
      })}
    </div>
  );
}

// ── Progress Bar ──

function ProgressBar({ value, max = 100, color, height = 6, showLabel = false, label, animated = true }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const barColor = color || (pct >= 80 ? THEME.emerald : pct >= 50 ? THEME.amber : THEME.red);

  return (
    <div>
      {showLabel && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "10px" }}>
          <span style={{ color: THEME.textSecondary }}>{label || ""}</span>
          <span style={{ color: barColor, fontWeight: 600, fontFamily: DESIGN_TOKENS.font.mono }}>{Math.round(pct)}%</span>
        </div>
      )}
      <div style={{
        width: "100%", height,
        background: THEME.bgElevated,
        borderRadius: height / 2,
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
          borderRadius: height / 2,
          transition: animated ? `width ${DESIGN_TOKENS.transition.slow}` : "none",
          boxShadow: `0 0 8px ${barColor}30`,
        }} />
      </div>
    </div>
  );
}

// ── Empty State ──

function EmptyState({ icon = "📭", title, subtitle, action, actionLabel, accentColor = THEME.cyan }) {
  return (
    <div style={{
      textAlign: "center", padding: "48px 24px",
      animation: "fadeIn 0.5s ease",
    }}>
      <div style={{
        fontSize: "48px", marginBottom: 16,
        filter: "grayscale(0.3)",
        animation: "float 3s ease-in-out infinite",
      }}>{icon}</div>
      <h4 style={{
        fontFamily: DESIGN_TOKENS.font.heading,
        fontSize: DESIGN_TOKENS.fontSize.lg,
        color: THEME.textSecondary,
        fontWeight: 600,
        marginBottom: 6,
      }}>{title || "Nothing here yet"}</h4>
      {subtitle && (
        <p style={{
          fontSize: DESIGN_TOKENS.fontSize.sm,
          color: THEME.textTertiary,
          maxWidth: 300, margin: "0 auto",
          lineHeight: 1.5,
        }}>{subtitle}</p>
      )}
      {action && (
        <button onClick={action} style={{
          marginTop: 20, padding: "10px 24px",
          borderRadius: DESIGN_TOKENS.radius.md,
          border: `1px solid ${accentColor}40`,
          background: `${accentColor}10`,
          color: accentColor,
          fontSize: DESIGN_TOKENS.fontSize.sm,
          fontWeight: 600, cursor: "pointer",
          fontFamily: DESIGN_TOKENS.font.body,
          transition: `all ${DESIGN_TOKENS.transition.fast}`,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = `${accentColor}20`; e.currentTarget.style.borderColor = `${accentColor}60`; }}
        onMouseLeave={e => { e.currentTarget.style.background = `${accentColor}10`; e.currentTarget.style.borderColor = `${accentColor}40`; }}
        >{actionLabel || "Get started"}</button>
      )}
    </div>
  );
}

// ── Loading Skeleton ──

function Skeleton({ width, height = 16, borderRadius = 6, count = 1 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          width: width || "100%",
          height,
          borderRadius,
          background: `linear-gradient(90deg, ${THEME.bgElevated} 25%, ${THEME.bgOverlay} 50%, ${THEME.bgElevated} 75%)`,
          backgroundSize: "200px 100%",
          animation: "skeletonLoad 1.5s ease-in-out infinite",
        }} />
      ))}
    </div>
  );
}

// ── Loading Screen ──

function LoadingScreen({ portalType = "employee" }) {
  const theme = PORTAL_THEMES[portalType] || PORTAL_THEMES.employee;
  return (
    <div style={{
      minHeight: "100vh", background: THEME.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 20,
    }}>
      <div style={{
        width: 48, height: 48,
        border: `3px solid ${THEME.border}`,
        borderTopColor: theme.accent,
        borderRadius: DESIGN_TOKENS.radius.circle,
        animation: "spin 0.8s linear infinite",
      }} />
      <span style={{
        fontSize: DESIGN_TOKENS.fontSize.sm,
        color: THEME.textTertiary,
        fontFamily: DESIGN_TOKENS.font.body,
        animation: "pulse 1.5s ease-in-out infinite",
      }}>Loading {APP_CONFIG.appName}…</span>
    </div>
  );
}

// ── Portal Header ──

function PortalHeader({ portalType, onBack, techName, rightContent }) {
  const theme = PORTAL_THEMES[portalType] || PORTAL_THEMES.employee;
  const portalLabels = {
    employee: { icon: "👤", subtitle: "Employee Portal" },
    tech:     { icon: "🛠️", subtitle: techName ? `Tech Support — ${techName}` : "Tech Support" },
    admin:    { icon: "⚙️", subtitle: "Admin Portal" },
  };
  const info = portalLabels[portalType] || portalLabels.employee;

  return (
    <header style={{
      background: theme.headerBg,
      borderBottom: `1px solid ${theme.headerBorder}`,
      padding: "12px 20px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "sticky", top: 0, zIndex: 100,
      backdropFilter: "blur(16px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{
          background: "none",
          border: `1px solid ${theme.headerBorder}`,
          color: THEME.textTertiary,
          borderRadius: DESIGN_TOKENS.radius.sm,
          padding: "6px 12px",
          cursor: "pointer",
          fontSize: DESIGN_TOKENS.fontSize.xs,
          fontFamily: DESIGN_TOKENS.font.body,
          transition: `all ${DESIGN_TOKENS.transition.fast}`,
          display: "flex", alignItems: "center", gap: 4,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.color = theme.accent; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = theme.headerBorder; e.currentTarget.style.color = THEME.textTertiary; }}
        >← Portals</button>

        {/* Logo mark */}
        <div style={{
          width: 34, height: 34,
          borderRadius: DESIGN_TOKENS.radius.md,
          background: theme.gradient,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "14px", fontWeight: 800, color: "#fff",
          fontFamily: DESIGN_TOKENS.font.heading,
          boxShadow: `0 2px 12px ${theme.accent}40`,
        }}>N</div>

        <div>
          <h1 style={{
            fontFamily: DESIGN_TOKENS.font.heading,
            fontSize: DESIGN_TOKENS.fontSize.lg,
            fontWeight: 700, color: THEME.text,
            lineHeight: 1.2,
          }}>{APP_CONFIG.appName}</h1>
          <p style={{
            fontSize: DESIGN_TOKENS.fontSize.xxs,
            color: THEME.textTertiary,
            lineHeight: 1,
          }}>{info.icon} {info.subtitle}</p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {rightContent}
        <span style={{
          padding: "4px 12px",
          borderRadius: DESIGN_TOKENS.radius.pill,
          fontSize: DESIGN_TOKENS.fontSize.xxs,
          fontWeight: 700,
          background: `${theme.accent}12`,
          color: theme.accent,
          border: `1px solid ${theme.accent}30`,
          letterSpacing: "1px",
        }}>{theme.label}</span>
      </div>
    </header>
  );
}

// ── Stat Card ──

function StatCard({ label, value, icon, color, trend, sparklineData, delay = 0, onClick }) {
  const [displayValue, setDisplayValue] = useState(0);

  // Animated count-up
  useEffect(() => {
    const numValue = typeof value === "number" ? value : parseInt(value) || 0;
    if (numValue === 0) { setDisplayValue(0); return; }

    const duration = 600;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(numValue * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  return (
    <div
      onClick={onClick}
      style={{
        ...baseCardStyle,
        padding: "16px 18px",
        cursor: onClick ? "pointer" : "default",
        animation: `fadeInUp 0.4s ease ${delay}s both`,
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.borderColor = color || THEME.borderHover;
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = `0 8px 24px ${(color || THEME.cyan)}15`;
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          e.currentTarget.style.borderColor = THEME.border;
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }
      }}
    >
      {/* Ambient glow */}
      {color && (
        <div style={{
          position: "absolute", top: -20, right: -20,
          width: 60, height: 60,
          background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{
            fontSize: DESIGN_TOKENS.fontSize.xxs,
            color: THEME.textTertiary,
            fontWeight: 500,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: "0.8px",
          }}>{label}</p>
          <p style={{
            fontSize: "22px",
            fontWeight: 800,
            color: color || THEME.text,
            fontFamily: DESIGN_TOKENS.font.heading,
            lineHeight: 1,
          }}>{typeof value === "string" ? value : displayValue}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          {icon && (
            <span style={{
              fontSize: "18px", opacity: 0.7,
              filter: "grayscale(0.2)",
            }}>{icon}</span>
          )}
          {sparklineData && <Sparkline data={sparklineData} color={color || THEME.cyan} width={60} height={20} />}
        </div>
      </div>

      {trend !== undefined && (
        <div style={{
          marginTop: 8,
          fontSize: DESIGN_TOKENS.fontSize.xxs,
          color: trend >= 0 ? THEME.emerald : THEME.red,
          fontWeight: 600,
          display: "flex", alignItems: "center", gap: 3,
        }}>
          <span>{trend >= 0 ? "↑" : "↓"}</span>
          {Math.abs(trend)}% vs last week
        </div>
      )}
    </div>
  );
}

// ── Category Icon ──

function CategoryIcon({ categoryId, size = 28 }) {
  const cat = CATEGORIES.find(c => c.id === categoryId);
  if (!cat) return null;

  return (
    <div style={{
      width: size, height: size,
      borderRadius: DESIGN_TOKENS.radius.md,
      background: `${cat.color}15`,
      border: `1px solid ${cat.color}20`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.5,
      flexShrink: 0,
    }}>{cat.icon}</div>
  );
}

// ── Modal ──

function Modal({ isOpen, onClose, title, children, maxWidth = 500, accentColor }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      background: "rgba(0,0,0,0.8)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
      animation: "fadeIn 0.2s ease",
    }}
    onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div style={{
        background: THEME.bgSurface,
        borderRadius: DESIGN_TOKENS.radius.xl,
        border: `1px solid ${THEME.border}`,
        padding: "28px",
        maxWidth,
        width: "100%",
        maxHeight: "85vh",
        overflow: "auto",
        animation: "scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        boxShadow: DESIGN_TOKENS.shadow.xl,
      }}>
        {title && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 20, paddingBottom: 16,
            borderBottom: `1px solid ${THEME.border}`,
          }}>
            <h3 style={{
              fontFamily: DESIGN_TOKENS.font.heading,
              fontSize: DESIGN_TOKENS.fontSize.xl,
              fontWeight: 700, color: THEME.text,
            }}>{title}</h3>
            <button onClick={onClose} style={{
              width: 32, height: 32,
              borderRadius: DESIGN_TOKENS.radius.md,
              border: `1px solid ${THEME.border}`,
              background: "transparent",
              color: THEME.textTertiary,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px",
              fontFamily: DESIGN_TOKENS.font.body,
              transition: `all ${DESIGN_TOKENS.transition.fast}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = THEME.bgElevated; e.currentTarget.style.color = THEME.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = THEME.textTertiary; }}
            >✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ── Confirmation Dialog ──

function ConfirmDialog({ isOpen, onConfirm, onCancel, title, message, confirmLabel = "Confirm", danger = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} maxWidth={400}>
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div style={{
          width: 56, height: 56,
          borderRadius: DESIGN_TOKENS.radius.circle,
          background: danger ? `${THEME.red}15` : `${THEME.cyan}15`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
          fontSize: "24px",
          border: `1px solid ${danger ? THEME.red : THEME.cyan}20`,
        }}>{danger ? "⚠️" : "❓"}</div>
        <h4 style={{
          fontFamily: DESIGN_TOKENS.font.heading,
          fontSize: DESIGN_TOKENS.fontSize.xl,
          fontWeight: 700, color: THEME.text,
          marginBottom: 8,
        }}>{title || "Are you sure?"}</h4>
        <p style={{
          fontSize: DESIGN_TOKENS.fontSize.md,
          color: THEME.textSecondary,
          lineHeight: 1.5,
          marginBottom: 24,
        }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancel} style={{
            padding: "10px 24px",
            borderRadius: DESIGN_TOKENS.radius.md,
            border: `1px solid ${THEME.border}`,
            background: "transparent",
            color: THEME.textSecondary,
            fontSize: DESIGN_TOKENS.fontSize.md,
            fontWeight: 600, cursor: "pointer",
            fontFamily: DESIGN_TOKENS.font.body,
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: "10px 24px",
            borderRadius: DESIGN_TOKENS.radius.md,
            border: "none",
            background: danger ? THEME.red : THEME.cyan,
            color: "#fff",
            fontSize: DESIGN_TOKENS.fontSize.md,
            fontWeight: 600, cursor: "pointer",
            fontFamily: DESIGN_TOKENS.font.body,
          }}>{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Tabs Component ──

function TabBar({ tabs, activeTab, onTabChange, accentColor = THEME.cyan }) {
  return (
    <div style={{
      display: "flex",
      borderBottom: `1px solid ${THEME.border}`,
      gap: 0,
      overflowX: "auto",
    }}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <button key={tab.key}
            onClick={() => onTabChange(tab.key)}
            style={{
              padding: "12px 18px",
              fontSize: DESIGN_TOKENS.fontSize.sm,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? accentColor : THEME.textTertiary,
              background: "transparent",
              border: "none",
              borderBottom: `2px solid ${isActive ? accentColor : "transparent"}`,
              cursor: "pointer",
              fontFamily: DESIGN_TOKENS.font.body,
              transition: `all ${DESIGN_TOKENS.transition.fast}`,
              whiteSpace: "nowrap",
              position: "relative",
              display: "flex", alignItems: "center", gap: 6,
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = THEME.textSecondary; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = THEME.textTertiary; }}
          >
            {tab.icon && <span style={{ fontSize: "13px" }}>{tab.icon}</span>}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span style={{
                padding: "1px 6px",
                borderRadius: DESIGN_TOKENS.radius.pill,
                background: tab.badgeColor || `${accentColor}20`,
                color: tab.badgeColor || accentColor,
                fontSize: "9px", fontWeight: 700,
                minWidth: 18, textAlign: "center",
              }}>{tab.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Filter Chip ──

function FilterChip({ label, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 14px",
        borderRadius: DESIGN_TOKENS.radius.pill,
        border: `1px solid ${active ? (color || THEME.cyan) + "50" : THEME.border}`,
        background: active ? `${color || THEME.cyan}15` : "transparent",
        color: active ? (color || THEME.cyan) : THEME.textTertiary,
        fontSize: DESIGN_TOKENS.fontSize.xs,
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        fontFamily: DESIGN_TOKENS.font.body,
        transition: `all ${DESIGN_TOKENS.transition.fast}`,
        whiteSpace: "nowrap",
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = THEME.borderHover; e.currentTarget.style.color = THEME.textSecondary; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.color = THEME.textTertiary; } }}
    >{label}</button>
  );
}

// ── Nepton Mascot SVG ──

function NeptonMascot({ mood = "idle", size = 48 }) {
  const eyeAnim = mood === "think" ? "none" : "mascotBlink 4s ease-in-out infinite";
  const bodyColor = mood === "error" ? "#ef4444" : mood === "success" ? "#22c55e" : "#06b6d4";
  const armAnim = mood === "wave" ? "mascotWave 1s ease-in-out infinite" : "none";

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <rect x="16" y="20" width="32" height="28" rx="8" fill={bodyColor} opacity="0.9">
        {mood === "idle" && <animate attributeName="opacity" values="0.85;1;0.85" dur="3s" repeatCount="indefinite" />}
      </rect>
      {/* Head */}
      <rect x="14" y="6" width="36" height="20" rx="10" fill={bodyColor}>
        {mood === "think" && <animateTransform attributeName="transform" type="rotate" values="-3,32,16;3,32,16;-3,32,16" dur="2s" repeatCount="indefinite" />}
      </rect>
      {/* Eyes */}
      <g style={{ animation: eyeAnim }}>
        <circle cx="24" cy="16" r="3" fill="#fff" />
        <circle cx="40" cy="16" r="3" fill="#fff" />
        <circle cx={mood === "think" ? "25" : "24"} cy="16" r="1.5" fill="#0a0e17" />
        <circle cx={mood === "think" ? "41" : "40"} cy="16" r="1.5" fill="#0a0e17" />
      </g>
      {/* Mouth */}
      {mood === "success" || mood === "wave" ? (
        <path d="M26 21 Q32 26 38 21" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      ) : mood === "error" ? (
        <path d="M26 24 Q32 20 38 24" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      ) : (
        <line x1="27" y1="22" x2="37" y2="22" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      )}
      {/* Antenna */}
      <line x1="32" y1="6" x2="32" y2="2" stroke={bodyColor} strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="1" r="2" fill={bodyColor}>
        <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
      </circle>
      {/* Arms */}
      <g style={{ transformOrigin: "16px 30px", animation: armAnim }}>
        <rect x="8" y="28" width="8" height="4" rx="2" fill={bodyColor} opacity="0.8" />
      </g>
      <rect x="48" y="28" width="8" height="4" rx="2" fill={bodyColor} opacity="0.8" />
      {/* Legs */}
      <rect x="22" y="48" width="6" height="8" rx="3" fill={bodyColor} opacity="0.8" />
      <rect x="36" y="48" width="6" height="8" rx="3" fill={bodyColor} opacity="0.8" />
      {/* Screen/chest detail */}
      <rect x="24" y="28" width="16" height="12" rx="3" fill="#0a0e17" opacity="0.4" />
      <rect x="27" y="31" width="10" height="2" rx="1" fill="#fff" opacity="0.3" />
      <rect x="27" y="35" width="7" height="2" rx="1" fill="#fff" opacity="0.2" />
    </svg>
  );
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 9: EMPLOYEE PORTAL
//  Submit tickets, track status, view IT responses, attach screenshots
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function EmployeePortal({ onBack }) {
  const { tickets, loading, stats, update } = useTickets(5000);
  const { notifications, show, dismiss } = useNotification();
  const [page, setPage] = useState("list");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [form, setForm] = useState({
    employeeName: "", department: "", email: "",
    category: "", priority: "medium", subject: "", description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const accent = PORTAL_THEMES.employee;

  // Sync selected ticket with live data
  useEffect(() => {
    if (selectedTicket) {
      const fresh = tickets.find(t => t.id === selectedTicket.id);
      if (fresh) setSelectedTicket(fresh);
    }
  }, [tickets]);

  // Submit new ticket
  const handleSubmit = async () => {
    const { employeeName, department, email, category, subject, description } = form;
    if (!employeeName || !department || !email || !category || !subject || !description) {
      show("Please fill in all required fields.", "error");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      show("Please enter a valid email address.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const ticket = {
        ...form,
        id: generateTicketId(),
        status: "open",
        createdAt: new Date().toISOString(),
        assignedTo: null,
        notes: [],
        screenshots: [...screenshots],
        tags: [],
        watchers: [email],
      };

      await update(prev => [ticket, ...prev]);
      await logActivity("ticket_created", { ticketId: ticket.id, by: employeeName });

      setForm({ employeeName: "", department: "", email: "", category: "", priority: "medium", subject: "", description: "" });
      setScreenshots([]);
      setPage("list");
      show(`Ticket ${ticket.id} submitted successfully! IT Support has been notified.`);
    } catch (e) {
      show("Failed to submit ticket. Please try again.", "error");
    }
    setSubmitting(false);
  };

  // Screenshot handling
  const handleFiles = (files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (screenshots.length + imageFiles.length > APP_CONFIG.maxScreenshots) {
      show(`Maximum ${APP_CONFIG.maxScreenshots} screenshots allowed.`, "warning");
      return;
    }
    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setScreenshots(prev => [...prev, {
        name: file.name, data: ev.target.result,
        size: file.size, type: file.type,
      }]);
      reader.readAsDataURL(file);
    });
  };

  if (loading) return <LoadingScreen portalType="employee" />;

  return (
    <div style={{ minHeight: "100vh", background: THEME.bg, color: THEME.text, fontFamily: DESIGN_TOKENS.font.body }}>
      <NotificationStack notifications={notifications} onDismiss={dismiss} />
      <PortalHeader portalType="employee" onBack={onBack} />

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
        {/* Page Title + Action */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ fontFamily: DESIGN_TOKENS.font.heading, fontSize: DESIGN_TOKENS.fontSize.xl, fontWeight: 700, color: THEME.text, marginBottom: 2 }}>
              {page === "new" ? "New Support Request" : page === "detail" ? "Ticket Details" : "My Tickets"}
            </h2>
            <p style={{ fontSize: DESIGN_TOKENS.fontSize.xs, color: THEME.textTertiary }}>
              {page === "list" ? `${tickets.length} total tickets` : page === "new" ? "Describe your issue below" : selectedTicket?.id || ""}
            </p>
          </div>
          {page === "list" ? (
            <button onClick={() => setPage("new")} style={{
              padding: "10px 22px", borderRadius: DESIGN_TOKENS.radius.md,
              border: "none", cursor: "pointer",
              background: accent.gradient, color: "#fff",
              fontSize: DESIGN_TOKENS.fontSize.sm, fontWeight: 700,
              fontFamily: DESIGN_TOKENS.font.body,
              boxShadow: `0 4px 16px ${accent.accent}30`,
              transition: `all ${DESIGN_TOKENS.transition.fast}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 6px 24px ${accent.accent}40`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 4px 16px ${accent.accent}30`; }}
            >+ New Ticket</button>
          ) : (
            <button onClick={() => { setPage("list"); setSelectedTicket(null); }} style={{
              padding: "10px 22px", borderRadius: DESIGN_TOKENS.radius.md,
              border: `1px solid ${THEME.border}`, background: "transparent",
              color: THEME.textSecondary, fontSize: DESIGN_TOKENS.fontSize.sm,
              cursor: "pointer", fontFamily: DESIGN_TOKENS.font.body,
            }}>← Back</button>
          )}
        </div>

        {/* ── New Ticket Form ── */}
        {page === "new" && (
          <div style={{ ...baseCardStyle, padding: "28px", animation: "fadeInUp 0.4s ease" }}>
            {/* Personal Info Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div>
                <label style={baseLabelStyle}>Full Name *</label>
                <input value={form.employeeName} onChange={e => setForm(p => ({ ...p, employeeName: e.target.value }))}
                  placeholder="e.g. Ahmed Hassan" style={baseInputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = accent.accent}
                  onBlur={e => e.currentTarget.style.borderColor = THEME.border} />
              </div>
              <div>
                <label style={baseLabelStyle}>Department *</label>
                <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                  style={{ ...baseInputStyle, cursor: "pointer" }}>
                  <option value="">Select department…</option>
                  {DEPARTMENTS.map(d => <option key={d.id} value={d.name}>{d.icon} {d.name}</option>)}
                </select>
              </div>
              <div>
                <label style={baseLabelStyle}>Email Address *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="name@nepton.com" style={baseInputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = accent.accent}
                  onBlur={e => e.currentTarget.style.borderColor = THEME.border} />
              </div>
              <div>
                <label style={baseLabelStyle}>Category *</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  style={{ ...baseInputStyle, cursor: "pointer" }}>
                  <option value="">Select category…</option>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </div>
            </div>

            {/* Priority Selection */}
            <div style={{ marginBottom: 20 }}>
              <label style={baseLabelStyle}>Priority Level</label>
              <div style={{ display: "flex", gap: 8 }}>
                {PRIORITY_LEVELS.map(p => (
                  <button key={p.id} onClick={() => setForm(f => ({ ...f, priority: p.id }))} style={{
                    flex: 1, padding: "10px 12px", borderRadius: DESIGN_TOKENS.radius.md,
                    cursor: "pointer", fontSize: DESIGN_TOKENS.fontSize.xs, fontWeight: 600,
                    fontFamily: DESIGN_TOKENS.font.body,
                    border: form.priority === p.id ? `2px solid ${p.color}` : `1px solid ${THEME.border}`,
                    background: form.priority === p.id ? `${p.color}12` : "transparent",
                    color: form.priority === p.id ? p.color : THEME.textTertiary,
                    transition: `all ${DESIGN_TOKENS.transition.fast}`,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  }}>
                    <span style={{ fontSize: "11px" }}>{p.icon}</span>
                    {p.label}
                  </button>
                ))}
              </div>
              {form.priority && (
                <p style={{ fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textTertiary, marginTop: 6 }}>
                  {PRIORITY_LEVELS.find(p => p.id === form.priority)?.description}
                  {" • SLA: "}{PRIORITY_LEVELS.find(p => p.id === form.priority)?.slaHours}h
                </p>
              )}
            </div>

            {/* Subject */}
            <div style={{ marginBottom: 16 }}>
              <label style={baseLabelStyle}>Subject *</label>
              <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                placeholder="Brief description of the issue" style={baseInputStyle}
                onFocus={e => e.currentTarget.style.borderColor = accent.accent}
                onBlur={e => e.currentTarget.style.borderColor = THEME.border} />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <label style={baseLabelStyle}>Description *</label>
              <textarea rows={5} value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe the issue in detail — what happened, when it started, error messages, steps to reproduce…"
                style={{ ...baseInputStyle, resize: "vertical", lineHeight: 1.6 }}
                onFocus={e => e.currentTarget.style.borderColor = accent.accent}
                onBlur={e => e.currentTarget.style.borderColor = THEME.border} />
            </div>

            {/* Knowledge Base Suggestion */}
            {form.category && (
              <div style={{
                marginBottom: 20, padding: "14px 16px", borderRadius: DESIGN_TOKENS.radius.md,
                background: `${accent.accent}08`, border: `1px solid ${accent.accent}15`,
              }}>
                <p style={{ fontSize: DESIGN_TOKENS.fontSize.xs, fontWeight: 600, color: accent.accent, marginBottom: 8 }}>💡 Quick Solutions</p>
                {KNOWLEDGE_BASE.filter(kb => kb.category === form.category).slice(0, 2).map(kb => (
                  <div key={kb.id} style={{ marginBottom: 8 }}>
                    <p style={{ fontSize: DESIGN_TOKENS.fontSize.sm, color: THEME.textSecondary, fontWeight: 500, marginBottom: 4 }}>{kb.title}</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {kb.steps.slice(0, 3).map((s, i) => (
                        <span key={i} style={{ fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textTertiary, background: THEME.bgElevated, padding: "2px 8px", borderRadius: DESIGN_TOKENS.radius.pill }}>{i + 1}. {s}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {KNOWLEDGE_BASE.filter(kb => kb.category === form.category).length === 0 && (
                  <p style={{ fontSize: DESIGN_TOKENS.fontSize.xs, color: THEME.textTertiary }}>No quick solutions available for this category.</p>
                )}
              </div>
            )}

            {/* Screenshots Upload */}
            <div style={{ marginBottom: 24 }}>
              <label style={baseLabelStyle}>📸 Screenshots (optional, max {APP_CONFIG.maxScreenshots})</label>
              <div
                onClick={() => document.getElementById("emp-upload").click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = accent.accent; e.currentTarget.style.background = `${accent.accent}08`; }}
                onDragLeave={e => { e.preventDefault(); e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.background = THEME.bg; }}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.background = THEME.bg; handleFiles(e.dataTransfer.files); }}
                style={{
                  border: `2px dashed ${THEME.border}`, borderRadius: DESIGN_TOKENS.radius.lg,
                  padding: "28px", textAlign: "center", cursor: "pointer",
                  background: THEME.bg, transition: `all ${DESIGN_TOKENS.transition.fast}`,
                }}>
                <input id="emp-upload" type="file" accept="image/*" multiple style={{ display: "none" }}
                  onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />
                <p style={{ fontSize: "28px", marginBottom: 6 }}>📷</p>
                <p style={{ fontSize: DESIGN_TOKENS.fontSize.sm, color: accent.accent, fontWeight: 500 }}>Click or drag & drop images</p>
                <p style={{ fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textMuted, marginTop: 4 }}>PNG, JPG, GIF up to 5MB each</p>
              </div>
              {screenshots.length > 0 && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  {screenshots.map((s, i) => (
                    <div key={i} style={{ position: "relative", borderRadius: DESIGN_TOKENS.radius.md, overflow: "hidden", border: `1px solid ${THEME.border}`, animation: `popIn 0.3s ease ${i * 0.05}s both` }}>
                      <img src={s.data} alt={s.name} style={{ width: 100, height: 75, objectFit: "cover", display: "block" }} />
                      <button onClick={e => { e.stopPropagation(); setScreenshots(p => p.filter((_, j) => j !== i)); }}
                        style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: DESIGN_TOKENS.radius.circle, background: THEME.red, border: "none", color: "#fff", fontSize: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <button onClick={handleSubmit} disabled={submitting} style={{
              width: "100%", padding: "14px", borderRadius: DESIGN_TOKENS.radius.md,
              border: "none", cursor: submitting ? "wait" : "pointer",
              fontSize: DESIGN_TOKENS.fontSize.md, fontWeight: 700,
              background: submitting ? THEME.bgElevated : accent.gradient,
              color: submitting ? THEME.textMuted : "#fff",
              fontFamily: DESIGN_TOKENS.font.body,
              boxShadow: submitting ? "none" : `0 4px 20px ${accent.accent}30`,
              transition: `all ${DESIGN_TOKENS.transition.fast}`,
            }}>{submitting ? "Submitting…" : "🚀 Submit Ticket"}</button>
          </div>
        )}

        {/* ── Ticket List ── */}
        {page === "list" && (
          tickets.length === 0
            ? <EmptyState icon="📭" title="No tickets yet" subtitle="Click '+ New Ticket' to submit your first support request." action={() => setPage("new")} actionLabel="+ New Ticket" accentColor={accent.accent} />
            : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tickets.map((t, i) => {
                  const cat = CATEGORIES.find(c => c.id === t.category);
                  const sla = calculateSLA(t);
                  return (
                    <div key={t.id} onClick={() => { setSelectedTicket(t); setPage("detail"); }}
                      style={{
                        ...baseCardStyle, padding: "16px 20px", cursor: "pointer",
                        animation: `fadeInUp 0.35s ease ${i * 0.04}s both`,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = accent.accent + "60"; e.currentTarget.style.background = THEME.bgElevated; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.background = THEME.bgSurface; }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                          <CategoryIcon categoryId={t.category} size={32} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                              <span style={{ fontSize: DESIGN_TOKENS.fontSize.xs, color: accent.accent, fontWeight: 700, fontFamily: DESIGN_TOKENS.font.mono }}>{t.id}</span>
                              <span style={{ fontSize: DESIGN_TOKENS.fontSize.md, color: THEME.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</span>
                            </div>
                            <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textTertiary }}>
                              <span>{cat?.icon} {cat?.label}</span>
                              <span>•</span>
                              <span>{formatDate(t.createdAt)}</span>
                              {t.screenshots?.length > 0 && <span style={{ color: accent.accent }}>📎 {t.screenshots.length}</span>}
                              {t.assignedTo && <span>🛠️ {t.assignedTo}</span>}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <SLAIndicator ticket={t} compact />
                          <StatusBadge status={t.status} />
                          <PriorityIndicator priority={t.priority} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
        )}

        {/* ── Ticket Detail ── */}
        {page === "detail" && selectedTicket && (() => {
          const cat = CATEGORIES.find(c => c.id === selectedTicket.category);
          return (
            <div style={{ ...baseCardStyle, padding: "28px", animation: "fadeInUp 0.3s ease" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <CategoryIcon categoryId={selectedTicket.category} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ color: accent.accent, fontWeight: 700, fontFamily: DESIGN_TOKENS.font.mono, fontSize: DESIGN_TOKENS.fontSize.sm }}>{selectedTicket.id}</span>
                    <StatusBadge status={selectedTicket.status} size="md" />
                    <PriorityIndicator priority={selectedTicket.priority} variant="badge" />
                  </div>
                  <h3 style={{ fontFamily: DESIGN_TOKENS.font.heading, fontSize: DESIGN_TOKENS.fontSize.xl, color: THEME.text, fontWeight: 700 }}>{selectedTicket.subject}</h3>
                </div>
              </div>

              {/* SLA Bar */}
              <SLAIndicator ticket={selectedTicket} />

              {/* Description */}
              <div style={{ background: THEME.bg, borderRadius: DESIGN_TOKENS.radius.md, padding: "16px", fontSize: DESIGN_TOKENS.fontSize.md, lineHeight: 1.7, color: THEME.textSecondary, margin: "16px 0", border: `1px solid ${THEME.border}` }}>
                {selectedTicket.description}
              </div>

              {/* Meta grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, padding: "16px", background: THEME.bg, borderRadius: DESIGN_TOKENS.radius.md, marginBottom: 16, border: `1px solid ${THEME.border}` }}>
                {[
                  ["Submitted", formatDate(selectedTicket.createdAt, { showTime: true, relative: false })],
                  ["Category", `${cat?.icon || ""} ${cat?.label || "—"}`],
                  ["Assigned To", selectedTicket.assignedTo || "Pending assignment"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span style={{ fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
                    <p style={{ fontSize: DESIGN_TOKENS.fontSize.sm, color: THEME.textSecondary, marginTop: 3, fontWeight: 500 }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Screenshots */}
              {selectedTicket.screenshots?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ ...baseLabelStyle, marginBottom: 8 }}>📸 Attachments ({selectedTicket.screenshots.length})</label>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "12px", background: THEME.bg, borderRadius: DESIGN_TOKENS.radius.md, border: `1px solid ${THEME.border}` }}>
                    {selectedTicket.screenshots.map((s, i) => (
                      <img key={i} src={s.data} alt={s.name} style={{ width: 140, height: 105, objectFit: "cover", borderRadius: DESIGN_TOKENS.radius.md, border: `1px solid ${THEME.border}`, cursor: "pointer" }} />
                    ))}
                  </div>
                </div>
              )}

              {/* IT Notes / Updates */}
              {selectedTicket.notes?.length > 0 && (
                <div>
                  <label style={{ ...baseLabelStyle, marginBottom: 8 }}>💬 IT Updates ({selectedTicket.notes.length})</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {selectedTicket.notes.map((n, i) => (
                      <div key={i} style={{
                        background: THEME.bgElevated, borderRadius: DESIGN_TOKENS.radius.md,
                        padding: "12px 16px", fontSize: DESIGN_TOKENS.fontSize.sm,
                        color: THEME.textSecondary, borderLeft: `3px solid ${accent.accent}`,
                        animation: `fadeInUp 0.3s ease ${i * 0.05}s both`,
                      }}>🛠️ {n}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 10: TECH SUPPORT PORTAL
//  Accept tickets, update status, add resolution notes, manage queue
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TechSupportPortal({ onBack }) {
  const { tickets, loading, stats, update } = useTickets(4000);
  const { notifications, show, dismiss } = useNotification();
  const search = useSearch(tickets);
  const [page, setPage] = useState("list");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newNote, setNewNote] = useState("");
  const [techName, setTechName] = useState("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const accent = PORTAL_THEMES.tech;

  // Load tech name
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEYS.techName);
        if (r && r.value) setTechName(r.value);
        else setShowNameModal(true);
      } catch { setShowNameModal(true); }
    })();
  }, []);

  // Sync selected ticket
  useEffect(() => {
    if (selectedTicket) {
      const fresh = tickets.find(t => t.id === selectedTicket.id);
      if (fresh) setSelectedTicket(fresh);
    }
  }, [tickets]);

  const handleAccept = async (id) => {
    const result = await update(prev => prev.map(t =>
      t.id === id ? { ...t, assignedTo: techName || "IT Tech", status: "in_progress" } : t
    ));
    setSelectedTicket(result.find(t => t.id === id));
    await logActivity("ticket_accepted", { ticketId: id, by: techName });
    show(`Ticket ${id} assigned to ${techName || "you"}`);
  };

  const handleStatus = async (id, newStatus) => {
    const timestamp = new Date().toISOString();
    const result = await update(prev => prev.map(t =>
      t.id === id ? {
        ...t, status: newStatus,
        ...(newStatus === "resolved" || newStatus === "closed" ? { resolvedAt: timestamp } : {}),
      } : t
    ));
    setSelectedTicket(result.find(t => t.id === id));
    await logActivity("status_changed", { ticketId: id, newStatus, by: techName });
    show(`${id} → ${STATUS_FLOW[newStatus]?.label}`);
  };

  const handleNote = async (id) => {
    const noteText = newNote.trim();
    if (!noteText) return;
    if (noteText.length > APP_CONFIG.maxNoteLength) {
      show(`Note too long (max ${APP_CONFIG.maxNoteLength} chars)`, "warning");
      return;
    }
    const note = `[${techName || "Tech"}] ${noteText}`;
    const result = await update(prev => prev.map(t =>
      t.id === id ? { ...t, notes: [...(t.notes || []), note] } : t
    ));
    setSelectedTicket(result.find(t => t.id === id));
    setNewNote("");
    setSelectedTemplate("");
    await logActivity("note_added", { ticketId: id, by: techName });
    show("Note added successfully");
  };

  if (loading) return <LoadingScreen portalType="tech" />;

  return (
    <div style={{ minHeight: "100vh", background: THEME.bg, color: THEME.text, fontFamily: DESIGN_TOKENS.font.body }}>
      <NotificationStack notifications={notifications} onDismiss={dismiss} />

      {/* Tech Name Modal */}
      <Modal isOpen={showNameModal} title="🛠️ Welcome, Technician" maxWidth={400}>
        <p style={{ fontSize: DESIGN_TOKENS.fontSize.sm, color: THEME.textTertiary, marginBottom: 16 }}>
          Enter your name so employees can see who's handling their ticket.
        </p>
        <input value={techName} onChange={e => setTechName(e.target.value)}
          placeholder="e.g. Omar" style={{ ...baseInputStyle, marginBottom: 16 }}
          onKeyDown={e => { if (e.key === "Enter" && techName.trim()) { window.storage.set(STORAGE_KEYS.techName, techName.trim()); setShowNameModal(false); } }} />
        <button onClick={async () => {
          if (!techName.trim()) return;
          await window.storage.set(STORAGE_KEYS.techName, techName.trim());
          setShowNameModal(false);
        }} style={{
          width: "100%", padding: "12px", borderRadius: DESIGN_TOKENS.radius.md,
          border: "none", cursor: "pointer", background: accent.gradient,
          color: "#fff", fontWeight: 700, fontSize: DESIGN_TOKENS.fontSize.md,
          fontFamily: DESIGN_TOKENS.font.body,
        }}>Start Working →</button>
      </Modal>

      <PortalHeader portalType="tech" onBack={onBack} techName={techName} />

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "24px 16px" }}>
        {page === "list" && (
          <>
            {/* Stats Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 24 }}>
              {[
                { l: "Total",       v: stats.total,       c: THEME.textSecondary, icon: "📊" },
                { l: "Open",        v: stats.open,        c: THEME.blue,          icon: "○" },
                { l: "In Progress", v: stats.inProgress,  c: THEME.amber,         icon: "◐" },
                { l: "Resolved",    v: stats.resolved + stats.closed, c: THEME.emerald, icon: "◉" },
                { l: "Critical",    v: stats.critical,    c: THEME.red,           icon: "⬆" },
              ].map((s, i) => (
                <StatCard key={s.l} label={s.l} value={s.v} color={s.c} icon={s.icon} delay={i * 0.06} />
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <input placeholder="🔍 Search tickets…" value={search.query}
                onChange={e => search.setQuery(e.target.value)}
                style={{ ...baseInputStyle, flex: 1, minWidth: 180 }} />
              <select value={search.statusFilter} onChange={e => search.setStatusFilter(e.target.value)}
                style={{ ...baseInputStyle, width: 150, cursor: "pointer" }}>
                <option value="all">All Statuses</option>
                {Object.entries(STATUS_FLOW).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
              <select value={search.priorityFilter} onChange={e => search.setPriorityFilter(e.target.value)}
                style={{ ...baseInputStyle, width: 140, cursor: "pointer" }}>
                <option value="all">All Priorities</option>
                {PRIORITY_LEVELS.map(p => <option key={p.id} value={p.id}>{p.icon} {p.label}</option>)}
              </select>
              {search.activeFilterCount > 0 && (
                <button onClick={search.clearFilters} style={{
                  padding: "8px 14px", borderRadius: DESIGN_TOKENS.radius.md,
                  border: `1px solid ${THEME.red}30`, background: `${THEME.red}10`,
                  color: THEME.red, fontSize: DESIGN_TOKENS.fontSize.xs,
                  cursor: "pointer", fontFamily: DESIGN_TOKENS.font.body,
                }}>✕ Clear ({search.activeFilterCount})</button>
              )}
            </div>

            {/* Ticket List */}
            {search.filtered.length === 0
              ? <EmptyState icon="📭" title={tickets.length === 0 ? "No tickets yet" : "No matches"} subtitle={tickets.length === 0 ? "Waiting for employee submissions…" : "Try adjusting your filters."} accentColor={accent.accent} />
              : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {search.filtered.map((t, i) => {
                    const cat = CATEGORIES.find(c => c.id === t.category);
                    const pri = PRIORITY_LEVELS.find(p => p.id === t.priority);
                    return (
                      <div key={t.id} onClick={() => { setSelectedTicket(t); setPage("detail"); }}
                        style={{
                          ...baseCardStyle, padding: "14px 18px", cursor: "pointer",
                          borderLeft: `4px solid ${pri?.color || THEME.border}`,
                          animation: `fadeInUp 0.3s ease ${i * 0.03}s both`,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = THEME.bgElevated; }}
                        onMouseLeave={e => { e.currentTarget.style.background = THEME.bgSurface; }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                            <Avatar name={t.employeeName} size={30} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                                <span style={{ fontSize: DESIGN_TOKENS.fontSize.xs, color: accent.accent, fontWeight: 700, fontFamily: DESIGN_TOKENS.font.mono }}>{t.id}</span>
                                <span style={{ fontSize: DESIGN_TOKENS.fontSize.md, color: THEME.text, fontWeight: 600 }}>{truncate(t.subject, 50)}</span>
                              </div>
                              <div style={{ display: "flex", gap: 10, fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textTertiary, flexWrap: "wrap" }}>
                                <span>👤 {t.employeeName}</span>
                                <span>🏢 {t.department}</span>
                                <span>{cat?.icon} {cat?.label}</span>
                                {t.assignedTo && <span>🛠️ {t.assignedTo}</span>}
                                {t.screenshots?.length > 0 && <span style={{ color: accent.accent }}>📎 {t.screenshots.length}</span>}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <SLAIndicator ticket={t} compact />
                            <StatusBadge status={t.status} />
                            <PriorityIndicator priority={t.priority} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
            }
          </>
        )}

        {/* ── Tech Detail View ── */}
        {page === "detail" && selectedTicket && (() => {
          const cat = CATEGORIES.find(c => c.id === selectedTicket.category);
          return (
            <div style={{ animation: "fadeInUp 0.3s ease" }}>
              <button onClick={() => { setPage("list"); setSelectedTicket(null); }} style={{
                marginBottom: 16, padding: "8px 18px", borderRadius: DESIGN_TOKENS.radius.md,
                border: `1px solid ${THEME.border}`, background: "transparent",
                color: THEME.textSecondary, fontSize: DESIGN_TOKENS.fontSize.xs,
                cursor: "pointer", fontFamily: DESIGN_TOKENS.font.body,
              }}>← Back to Queue</button>

              <div style={{ ...baseCardStyle, padding: "28px" }}>
                {/* Ticket Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <Avatar name={selectedTicket.employeeName} size={40} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ color: accent.accent, fontWeight: 700, fontFamily: DESIGN_TOKENS.font.mono }}>{selectedTicket.id}</span>
                      <StatusBadge status={selectedTicket.status} size="md" />
                      <PriorityIndicator priority={selectedTicket.priority} variant="badge" />
                    </div>
                    <h3 style={{ fontFamily: DESIGN_TOKENS.font.heading, fontSize: DESIGN_TOKENS.fontSize.xl, color: THEME.text, fontWeight: 700 }}>{selectedTicket.subject}</h3>
                  </div>
                </div>

                {/* SLA */}
                <div style={{ marginBottom: 16 }}>
                  <SLAIndicator ticket={selectedTicket} />
                </div>

                {/* Info Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16, background: THEME.bg, borderRadius: DESIGN_TOKENS.radius.md, padding: "16px", border: `1px solid ${THEME.border}` }}>
                  {[
                    ["Employee", `👤 ${selectedTicket.employeeName}`],
                    ["Department", `🏢 ${selectedTicket.department}`],
                    ["Email", `📧 ${selectedTicket.email}`],
                    ["Category", `${cat?.icon || ""} ${cat?.label || ""}`],
                    ["Submitted", formatDate(selectedTicket.createdAt, { showTime: true, relative: false })],
                    ["Assigned", selectedTicket.assignedTo ? `🛠️ ${selectedTicket.assignedTo}` : "⚠️ Unassigned"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span style={{ fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
                      <p style={{ fontSize: DESIGN_TOKENS.fontSize.sm, color: THEME.textSecondary, marginTop: 3, fontWeight: 500 }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <div style={{ background: THEME.bg, borderRadius: DESIGN_TOKENS.radius.md, padding: "16px", fontSize: DESIGN_TOKENS.fontSize.md, lineHeight: 1.7, color: THEME.textSecondary, marginBottom: 16, border: `1px solid ${THEME.border}` }}>
                  {selectedTicket.description}
                </div>

                {/* Screenshots */}
                {selectedTicket.screenshots?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ ...baseLabelStyle, marginBottom: 8 }}>📸 Screenshots ({selectedTicket.screenshots.length})</label>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "12px", background: THEME.bg, borderRadius: DESIGN_TOKENS.radius.md, border: `1px solid ${THEME.border}` }}>
                      {selectedTicket.screenshots.map((s, i) => <img key={i} src={s.data} alt="" style={{ width: 160, height: 120, objectFit: "cover", borderRadius: DESIGN_TOKENS.radius.md, border: `1px solid ${THEME.border}` }} />)}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "16px", background: THEME.bg, borderRadius: DESIGN_TOKENS.radius.md, marginBottom: 16, border: `1px solid ${THEME.border}` }}>
                  {!selectedTicket.assignedTo && (
                    <button onClick={() => handleAccept(selectedTicket.id)} style={{
                      padding: "8px 16px", borderRadius: DESIGN_TOKENS.radius.md,
                      border: `1px solid ${accent.accent}`, background: `${accent.accent}15`,
                      color: accent.accent, fontSize: DESIGN_TOKENS.fontSize.xs,
                      fontWeight: 600, cursor: "pointer", fontFamily: DESIGN_TOKENS.font.body,
                    }}>✋ Accept & Assign to Me</button>
                  )}
                  {Object.entries(STATUS_FLOW).map(([key, val]) => key !== selectedTicket.status && (
                    <button key={key} onClick={() => handleStatus(selectedTicket.id, key)} style={{
                      padding: "8px 16px", borderRadius: DESIGN_TOKENS.radius.md,
                      border: `1px solid ${val.color}40`, background: `${val.color}10`,
                      color: val.color, fontSize: DESIGN_TOKENS.fontSize.xs,
                      fontWeight: 600, cursor: "pointer", fontFamily: DESIGN_TOKENS.font.body,
                    }}>{val.icon} → {val.label}</button>
                  ))}
                </div>

                {/* Resolution Notes Section */}
                <div>
                  <label style={{ ...baseLabelStyle, marginBottom: 8 }}>📝 Resolution Notes</label>

                  {/* Existing Notes */}
                  {selectedTicket.notes?.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                      {selectedTicket.notes.map((n, i) => (
                        <div key={i} style={{
                          background: THEME.bgElevated, borderRadius: DESIGN_TOKENS.radius.md,
                          padding: "12px 16px", fontSize: DESIGN_TOKENS.fontSize.sm,
                          color: THEME.textSecondary, borderLeft: `3px solid ${accent.accent}`,
                        }}>🛠️ {n}</div>
                      ))}
                    </div>
                  )}

                  {/* Quick Templates */}
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textMuted, marginBottom: 6, display: "block" }}>Quick Templates:</label>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {RESOLUTION_TEMPLATES.map(tmpl => (
                        <button key={tmpl.id} onClick={() => { setSelectedTemplate(tmpl.id); setNewNote(tmpl.text); }}
                          style={{
                            padding: "4px 10px", borderRadius: DESIGN_TOKENS.radius.pill,
                            border: `1px solid ${selectedTemplate === tmpl.id ? accent.accent + "50" : THEME.border}`,
                            background: selectedTemplate === tmpl.id ? `${accent.accent}10` : "transparent",
                            color: selectedTemplate === tmpl.id ? accent.accent : THEME.textTertiary,
                            fontSize: DESIGN_TOKENS.fontSize.xxs, cursor: "pointer",
                            fontFamily: DESIGN_TOKENS.font.body,
                          }}>{tmpl.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Note Input */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={newNote} onChange={e => { setNewNote(e.target.value); setSelectedTemplate(""); }}
                      placeholder="Add note (visible to employee)…"
                      onKeyDown={e => { if (e.key === "Enter") handleNote(selectedTicket.id); }}
                      style={{ ...baseInputStyle, flex: 1 }} />
                    <button onClick={() => handleNote(selectedTicket.id)} style={{
                      padding: "10px 20px", borderRadius: DESIGN_TOKENS.radius.md,
                      border: "none", cursor: "pointer", background: accent.gradient,
                      color: "#fff", fontSize: DESIGN_TOKENS.fontSize.sm, fontWeight: 600,
                      fontFamily: DESIGN_TOKENS.font.body,
                    }}>Add</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 20: NOTIFICATION CENTER (Full-page overlay)
//  Shows all recent activity as rich notification cards
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function NotificationCenter({ isOpen, onClose, tickets }) {
  const activityLog = useActivityLog();

  if (!isOpen) return null;

  const getActivityIcon = (action) => {
    if (action.includes("created")) return "🎫";
    if (action.includes("accepted") || action.includes("assigned")) return "✋";
    if (action.includes("resolved") || action.includes("closed")) return "✅";
    if (action.includes("deleted")) return "🗑️";
    if (action.includes("note")) return "📝";
    if (action.includes("status")) return "🔄";
    if (action.includes("cleared")) return "⚠️";
    return "📋";
  };

  const getActivityColor = (action) => {
    if (action.includes("created")) return THEME.blue;
    if (action.includes("resolved") || action.includes("closed")) return THEME.emerald;
    if (action.includes("deleted") || action.includes("cleared")) return THEME.red;
    if (action.includes("accepted") || action.includes("assigned")) return THEME.cyan;
    if (action.includes("note")) return THEME.violet;
    return THEME.amber;
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9998,
      display: "flex", justifyContent: "flex-end",
    }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        animation: "fadeIn 0.2s ease",
      }} />

      {/* Panel */}
      <div style={{
        position: "relative", width: 380, maxWidth: "90vw",
        background: THEME.bgSurface,
        borderLeft: `1px solid ${THEME.border}`,
        boxShadow: `-12px 0 40px ${THEME.shadow}`,
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.3s ease",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 20px",
          borderBottom: `1px solid ${THEME.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <h3 style={{
              fontFamily: DESIGN_TOKENS.font.heading,
              fontSize: DESIGN_TOKENS.fontSize.lg,
              fontWeight: 700,
              color: THEME.text,
            }}>Notifications</h3>
            <p style={{ fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textTertiary, marginTop: 2 }}>
              {activityLog.log.length} recent activities
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: DESIGN_TOKENS.radius.circle,
            border: `1px solid ${THEME.border}`, background: "transparent",
            color: THEME.textTertiary, fontSize: "14px", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Notifications List */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
          {activityLog.loading ? (
            <Skeleton height={60} count={5} />
          ) : activityLog.log.length === 0 ? (
            <EmptyState icon="🔔" title="No notifications" subtitle="Activity will appear here as tickets are created and updated." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {activityLog.log.slice(0, 40).map((entry, i) => {
                const color = getActivityColor(entry.action);
                const relatedTicket = entry.ticketId ? tickets.find(t => t.id === entry.ticketId) : null;
                return (
                  <div key={entry.id} style={{
                    padding: "12px 14px",
                    borderRadius: DESIGN_TOKENS.radius.md,
                    background: THEME.bg,
                    border: `1px solid ${THEME.border}`,
                    borderLeft: `3px solid ${color}`,
                    animation: `fadeInUp 0.3s ease ${i * 0.03}s both`,
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <span style={{ fontSize: "16px", flexShrink: 0, marginTop: 1 }}>
                        {getActivityIcon(entry.action)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: DESIGN_TOKENS.fontSize.sm,
                          color: THEME.text,
                          fontWeight: 500,
                          marginBottom: 3,
                        }}>
                          {entry.action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div style={{
                          fontSize: DESIGN_TOKENS.fontSize.xxs,
                          color: THEME.textTertiary,
                          display: "flex", gap: 8, flexWrap: "wrap",
                        }}>
                          {entry.ticketId && (
                            <span style={{
                              color: THEME.cyan,
                              fontFamily: DESIGN_TOKENS.font.mono,
                              fontWeight: 600,
                            }}>{entry.ticketId}</span>
                          )}
                          {entry.by && <span>by {entry.by}</span>}
                          {entry.newStatus && (
                            <span style={{ color }}>→ {STATUS_FLOW[entry.newStatus]?.label || entry.newStatus}</span>
                          )}
                        </div>
                        {relatedTicket && (
                          <p style={{
                            fontSize: DESIGN_TOKENS.fontSize.xxs,
                            color: THEME.textMuted,
                            marginTop: 4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {relatedTicket.subject}
                          </p>
                        )}
                      </div>
                      <span style={{
                        fontSize: DESIGN_TOKENS.fontSize.xxs,
                        color: THEME.textMuted,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}>
                        {formatDate(entry.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 21: TICKET TIMELINE COMPONENT
//  Visual timeline showing ticket lifecycle events
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TicketTimeline({ ticket }) {
  if (!ticket) return null;

  const events = [];

  // Created event
  events.push({
    timestamp: ticket.createdAt,
    label: "Ticket Created",
    description: `Submitted by ${ticket.employeeName} (${ticket.department})`,
    icon: "🎫",
    color: THEME.blue,
  });

  // Assignment event
  if (ticket.assignedTo) {
    events.push({
      timestamp: ticket.createdAt, // approximate
      label: "Assigned",
      description: `Assigned to ${ticket.assignedTo}`,
      icon: "✋",
      color: THEME.cyan,
    });
  }

  // In progress event
  if (ticket.status === "in_progress" || ticket.status === "resolved" || ticket.status === "closed") {
    events.push({
      timestamp: ticket.createdAt,
      label: "Work Started",
      description: "Technician began working on this ticket",
      icon: "🔧",
      color: THEME.amber,
    });
  }

  // Notes events
  if (ticket.notes?.length > 0) {
    ticket.notes.forEach((note, i) => {
      events.push({
        timestamp: ticket.createdAt,
        label: `Note Added (#${i + 1})`,
        description: truncate(note, 60),
        icon: "📝",
        color: THEME.violet,
      });
    });
  }

  // Resolved event
  if (ticket.status === "resolved" || ticket.status === "closed") {
    events.push({
      timestamp: ticket.resolvedAt || ticket.createdAt,
      label: ticket.status === "resolved" ? "Resolved" : "Closed",
      description: ticket.resolvedAt
        ? `Completed in ${formatDuration(new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime())}`
        : "Ticket has been resolved",
      icon: ticket.status === "resolved" ? "✅" : "🔒",
      color: THEME.emerald,
    });
  }

  return (
    <div style={{ padding: "4px 0" }}>
      <label style={{ ...baseLabelStyle, marginBottom: 12 }}>📅 Ticket Timeline</label>
      <div style={{ position: "relative", paddingLeft: 28 }}>
        {/* Vertical line */}
        <div style={{
          position: "absolute", left: 11, top: 8, bottom: 8,
          width: 2, background: THEME.border,
          borderRadius: 1,
        }} />

        {events.map((event, i) => (
          <div key={i} style={{
            position: "relative",
            marginBottom: i < events.length - 1 ? 20 : 0,
            animation: `fadeInUp 0.3s ease ${i * 0.08}s both`,
          }}>
            {/* Dot */}
            <div style={{
              position: "absolute", left: -22, top: 3,
              width: 14, height: 14,
              borderRadius: DESIGN_TOKENS.radius.circle,
              background: THEME.bg,
              border: `3px solid ${event.color}`,
              boxShadow: `0 0 0 3px ${THEME.bg}, 0 0 8px ${event.color}30`,
              zIndex: 2,
            }} />

            {/* Content */}
            <div>
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 3,
              }}>
                <span style={{ fontSize: "12px" }}>{event.icon}</span>
                <span style={{
                  fontSize: DESIGN_TOKENS.fontSize.sm,
                  fontWeight: 600,
                  color: THEME.text,
                }}>{event.label}</span>
              </div>
              <p style={{
                fontSize: DESIGN_TOKENS.fontSize.xs,
                color: THEME.textTertiary,
                lineHeight: 1.5,
              }}>{event.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 22: SYSTEM HEALTH PANEL
//  Shows system operational status indicators
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SystemHealthPanel({ stats, lastSync }) {
  const healthChecks = [
    {
      name: "Ticket Database",
      status: "operational",
      detail: `${stats.total} records stored`,
      icon: "🗄️",
    },
    {
      name: "AI Engine (Claude Sonnet 4)",
      status: "operational",
      detail: "Connected via Anthropic API",
      icon: "🤖",
    },
    {
      name: "Real-time Sync",
      status: lastSync ? "operational" : "degraded",
      detail: lastSync ? `Last sync: ${formatDate(lastSync.toISOString())}` : "Waiting for first sync",
      icon: "🔄",
    },
    {
      name: "SLA Monitoring",
      status: stats.slaCompliance >= 80 ? "operational" : stats.slaCompliance >= 60 ? "degraded" : "critical",
      detail: `${stats.slaCompliance}% compliance rate`,
      icon: "📋",
    },
    {
      name: "Notification System",
      status: "operational",
      detail: "Toast notifications active",
      icon: "🔔",
    },
    {
      name: "Data Export",
      status: "operational",
      detail: "CSV export available",
      icon: "📤",
    },
  ];

  const statusColors = {
    operational: THEME.emerald,
    degraded: THEME.amber,
    critical: THEME.red,
  };

  const statusLabels = {
    operational: "Operational",
    degraded: "Degraded",
    critical: "Critical",
  };

  const allOperational = healthChecks.every(h => h.status === "operational");

  return (
    <div style={{ ...baseCardStyle, padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h4 style={{
          fontFamily: DESIGN_TOKENS.font.heading,
          fontSize: DESIGN_TOKENS.fontSize.md,
          color: THEME.text, fontWeight: 700,
        }}>🏥 System Health</h4>
        <span style={{
          padding: "4px 12px",
          borderRadius: DESIGN_TOKENS.radius.pill,
          fontSize: DESIGN_TOKENS.fontSize.xxs,
          fontWeight: 600,
          background: allOperational ? `${THEME.emerald}15` : `${THEME.amber}15`,
          color: allOperational ? THEME.emerald : THEME.amber,
          border: `1px solid ${allOperational ? THEME.emerald : THEME.amber}30`,
        }}>
          {allOperational ? "All Systems Operational" : "Some Issues Detected"}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {healthChecks.map((check, i) => (
          <div key={check.name} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px",
            borderRadius: DESIGN_TOKENS.radius.md,
            background: THEME.bg,
            border: `1px solid ${THEME.border}`,
            animation: `fadeInUp 0.3s ease ${i * 0.05}s both`,
          }}>
            <span style={{ fontSize: "16px", flexShrink: 0 }}>{check.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: DESIGN_TOKENS.fontSize.sm,
                color: THEME.text,
                fontWeight: 500,
                marginBottom: 2,
              }}>{check.name}</div>
              <div style={{
                fontSize: DESIGN_TOKENS.fontSize.xxs,
                color: THEME.textMuted,
              }}>{check.detail}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 8, height: 8,
                borderRadius: DESIGN_TOKENS.radius.circle,
                background: statusColors[check.status],
                boxShadow: `0 0 6px ${statusColors[check.status]}40`,
                animation: check.status === "operational" ? "none" : "pulse 2s ease-in-out infinite",
              }} />
              <span style={{
                fontSize: DESIGN_TOKENS.fontSize.xxs,
                color: statusColors[check.status],
                fontWeight: 600,
              }}>{statusLabels[check.status]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 23: TREND ANALYSIS ENGINE
//  Calculates and displays ticket trend data with arrows and percentages
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TrendIndicator({ current, previous, label, invert = false }) {
  if (previous === 0 && current === 0) {
    return (
      <span style={{ fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textMuted }}>
        — No data
      </span>
    );
  }

  const change = previous > 0 ? ((current - previous) / previous * 100) : current > 0 ? 100 : 0;
  const isPositive = invert ? change < 0 : change > 0;
  const isNeutral = change === 0;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      fontSize: DESIGN_TOKENS.fontSize.xxs,
    }}>
      <span style={{
        color: isNeutral ? THEME.textMuted : isPositive ? THEME.emerald : THEME.red,
        fontWeight: 600,
        fontFamily: DESIGN_TOKENS.font.mono,
      }}>
        {isNeutral ? "→" : change > 0 ? "↑" : "↓"} {Math.abs(change).toFixed(0)}%
      </span>
      {label && (
        <span style={{ color: THEME.textMuted }}>{label}</span>
      )}
    </div>
  );
}

function TrendAnalysisPanel({ tickets }) {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeek = tickets.filter(t => new Date(t.createdAt) >= oneWeekAgo);
  const lastWeek = tickets.filter(t => {
    const d = new Date(t.createdAt);
    return d >= twoWeeksAgo && d < oneWeekAgo;
  });

  const thisWeekResolved = thisWeek.filter(t => t.status === "resolved" || t.status === "closed").length;
  const lastWeekResolved = lastWeek.filter(t => t.status === "resolved" || t.status === "closed").length;

  const thisWeekCritical = thisWeek.filter(t => t.priority === "critical").length;
  const lastWeekCritical = lastWeek.filter(t => t.priority === "critical").length;

  const metrics = [
    { label: "New Tickets", current: thisWeek.length, previous: lastWeek.length, invert: true },
    { label: "Resolved", current: thisWeekResolved, previous: lastWeekResolved },
    { label: "Critical", current: thisWeekCritical, previous: lastWeekCritical, invert: true },
  ];

  return (
    <div style={{ ...baseCardStyle, padding: "20px" }}>
      <h4 style={{
        fontFamily: DESIGN_TOKENS.font.heading,
        fontSize: DESIGN_TOKENS.fontSize.md,
        color: THEME.text, fontWeight: 700, marginBottom: 16,
      }}>📈 Weekly Trends</h4>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {metrics.map((m, i) => (
          <div key={m.label} style={{
            textAlign: "center",
            padding: "14px",
            borderRadius: DESIGN_TOKENS.radius.md,
            background: THEME.bg,
            border: `1px solid ${THEME.border}`,
            animation: `fadeInUp 0.3s ease ${i * 0.08}s both`,
          }}>
            <div style={{
              fontSize: DESIGN_TOKENS.fontSize.xxl,
              fontWeight: 800,
              color: THEME.text,
              fontFamily: DESIGN_TOKENS.font.mono,
              marginBottom: 4,
            }}>
              <AnimatedCounter value={m.current} duration={800} />
            </div>
            <div style={{
              fontSize: DESIGN_TOKENS.fontSize.xs,
              color: THEME.textSecondary,
              fontWeight: 500,
              marginBottom: 6,
            }}>{m.label}</div>
            <TrendIndicator current={m.current} previous={m.previous} label="vs last week" invert={m.invert} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 24: ONBOARDING TIPS
//  First-run help tips for new users
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function OnboardingTips({ portalType, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);

  const tips = {
    employee: [
      { title: "Submit a Ticket", description: "Click '+ New Ticket' to report an IT issue. Fill in all required fields and select the appropriate category.", icon: "🎫" },
      { title: "Track Your Tickets", description: "All your submitted tickets appear on the main list. Click any ticket to see detailed status and IT responses.", icon: "👁️" },
      { title: "Attach Screenshots", description: "Drag & drop screenshots when submitting a ticket to help IT understand your issue faster.", icon: "📸" },
      { title: "Knowledge Base", description: "When selecting a category, quick solutions will appear — try them before submitting!", icon: "💡" },
    ],
    tech: [
      { title: "Accept Tickets", description: "Click on any unassigned ticket and use 'Accept & Assign to Me' to take ownership.", icon: "✋" },
      { title: "Resolution Templates", description: "Use quick templates to add common resolution notes faster.", icon: "📝" },
      { title: "Filter Your Queue", description: "Use status and priority filters to focus on what matters most.", icon: "🔍" },
      { title: "Update Status", description: "Change ticket status as you progress — employees see updates in real-time.", icon: "🔄" },
    ],
    admin: [
      { title: "Dashboard Overview", description: "The dashboard shows real-time metrics, urgent tickets, and technician workload at a glance.", icon: "📊" },
      { title: "AI Assistant", description: "Ask Nepton AI about ticket patterns, performance insights, or troubleshooting suggestions.", icon: "🤖" },
      { title: "Export Data", description: "Use the CSV export to download ticket data for external analysis or reporting.", icon: "📤" },
      { title: "Analytics Tab", description: "View category breakdowns, status distribution, and performance metrics in interactive charts.", icon: "📈" },
    ],
  };

  const portalTips = tips[portalType] || [];

  if (dismissed || portalTips.length === 0) return null;

  const tip = portalTips[currentTip];

  return (
    <div style={{
      ...baseCardStyle,
      padding: "18px 20px",
      marginBottom: 16,
      background: `${THEME.cyan}06`,
      borderColor: `${THEME.cyan}20`,
      animation: "fadeInUp 0.4s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{
            fontSize: "24px",
            width: 40, height: 40,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: DESIGN_TOKENS.radius.md,
            background: `${THEME.cyan}10`,
            flexShrink: 0,
          }}>{tip.icon}</span>
          <div>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 4,
            }}>
              <span style={{
                fontSize: DESIGN_TOKENS.fontSize.xxs,
                color: THEME.cyan,
                fontWeight: 600,
                fontFamily: DESIGN_TOKENS.font.mono,
                textTransform: "uppercase",
              }}>TIP {currentTip + 1}/{portalTips.length}</span>
            </div>
            <h4 style={{
              fontSize: DESIGN_TOKENS.fontSize.md,
              color: THEME.text,
              fontWeight: 700,
              marginBottom: 4,
            }}>{tip.title}</h4>
            <p style={{
              fontSize: DESIGN_TOKENS.fontSize.sm,
              color: THEME.textTertiary,
              lineHeight: 1.5,
            }}>{tip.description}</p>
          </div>
        </div>
        <button onClick={() => {
          setDismissed(true);
          onDismiss?.();
        }} style={{
          background: "transparent", border: "none", color: THEME.textMuted,
          cursor: "pointer", fontSize: "14px", padding: 4,
        }}>✕</button>
      </div>

      {/* Navigation dots */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 6, marginTop: 14,
      }}>
        {portalTips.map((_, i) => (
          <button key={i} onClick={() => setCurrentTip(i)} style={{
            width: i === currentTip ? 20 : 6,
            height: 6,
            borderRadius: 3,
            background: i === currentTip ? THEME.cyan : THEME.border,
            border: "none", cursor: "pointer",
            transition: `all ${DESIGN_TOKENS.transition.fast}`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 25: QUICK STATS BANNER
//  Compact horizontal stats bar used inside portals
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function QuickStatsBanner({ stats, accentColor = THEME.cyan }) {
  const items = [
    { label: "Total", value: stats.total, color: THEME.textSecondary },
    { label: "Open", value: stats.open, color: THEME.blue },
    { label: "In Progress", value: stats.inProgress, color: THEME.amber },
    { label: "Resolved", value: stats.resolved + stats.closed, color: THEME.emerald },
    { label: "Critical", value: stats.critical, color: THEME.red },
    { label: "SLA", value: `${stats.slaCompliance}%`, color: stats.slaCompliance >= 80 ? THEME.emerald : THEME.red },
  ];

  return (
    <div style={{
      display: "flex", gap: 2,
      padding: "8px 12px",
      borderRadius: DESIGN_TOKENS.radius.lg,
      background: THEME.bgSurface,
      border: `1px solid ${THEME.border}`,
      marginBottom: 16,
    }}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <div style={{ width: 1, background: THEME.border, margin: "0 8px" }} />}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "2px 8px",
          }}>
            <span style={{
              fontSize: DESIGN_TOKENS.fontSize.xxs,
              color: THEME.textMuted,
            }}>{item.label}</span>
            <span style={{
              fontSize: DESIGN_TOKENS.fontSize.sm,
              fontWeight: 700,
              color: item.color,
              fontFamily: DESIGN_TOKENS.font.mono,
            }}>{item.value}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 11: AI ASSISTANT ENGINE
//  Powered by Claude API — context-aware IT support intelligence
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AIAssistant({ tickets, stats, accentColor = THEME.emerald }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildSystemPrompt = () => {
    const ticketSummary = tickets.slice(0, 20).map(t => {
      const sla = calculateSLA(t);
      return `[${t.id}] ${t.subject} | Status: ${t.status} | Priority: ${t.priority} | SLA: ${sla.status} | Assigned: ${t.assignedTo || "Unassigned"} | By: ${t.employeeName} (${t.department})`;
    }).join("\n");

    return `You are Nepton AI — the intelligent IT support assistant for ${APP_CONFIG.company}.
You have access to the current ticket data and analytics. Be concise, professional, and actionable.

CURRENT STATISTICS:
- Total tickets: ${stats.total} | Open: ${stats.open} | In Progress: ${stats.inProgress}
- Resolved: ${stats.resolved} | Critical: ${stats.critical} | Unassigned: ${stats.unassigned}
- SLA Compliance: ${stats.slaCompliance}% | Resolution Rate: ${stats.resolutionRate}%
- Today's new tickets: ${stats.todayCount}
- Avg Resolution Time: ${stats.avgResolution ? formatDuration(stats.avgResolution) : "N/A"}

RECENT TICKETS:
${ticketSummary || "No tickets yet."}

CAPABILITIES:
- Analyze ticket patterns, trends, and bottlenecks
- Provide resolution suggestions based on ticket category
- Identify SLA risks and recommend prioritization
- Generate performance reports and insights
- Suggest workflow improvements
- Help with troubleshooting common IT issues

Company Info: ${APP_CONFIG.company}, est. ${APP_CONFIG.established}, MEP construction, offices in Cairo & Dhahran.
Managing Director: ${APP_CONFIG.managingDirector}.

Respond concisely with actionable insights. Use bullet points for lists. Format numbers clearly.`;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: APP_CONFIG.aiModel,
          max_tokens: APP_CONFIG.aiMaxTokens,
          system: buildSystemPrompt(),
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      const aiText = data.content?.map(c => c.text || "").join("") || "Sorry, I couldn't process that request.";
      setMessages(prev => [...prev, { role: "assistant", content: aiText }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "⚠️ Connection error. Please check your network and try again.",
      }]);
    }
    setLoading(false);
  };

  const quickPrompts = [
    { label: "📊 Status Overview", prompt: "Give me a quick status overview of all tickets" },
    { label: "🚨 Critical Issues", prompt: "What critical issues need immediate attention?" },
    { label: "📈 Performance", prompt: "How is our IT support performance? Any bottlenecks?" },
    { label: "💡 Suggestions", prompt: "Suggest improvements based on current ticket patterns" },
  ];

  return (
    <div style={{
      ...baseCardStyle, overflow: "hidden",
      display: "flex", flexDirection: "column",
      height: isExpanded ? 520 : 56,
      transition: `height ${DESIGN_TOKENS.transition.slow}`,
    }}>
      {/* AI Header */}
      <div onClick={() => setIsExpanded(!isExpanded)} style={{
        padding: "14px 18px",
        background: `linear-gradient(135deg, ${accentColor}08, ${THEME.bgSurface})`,
        borderBottom: `1px solid ${THEME.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: "pointer", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <NeptonMascot mood={loading ? "think" : messages.length > 0 ? "wave" : "idle"} size={28} />
          <div>
            <span style={{ fontSize: DESIGN_TOKENS.fontSize.sm, fontWeight: 700, color: THEME.text }}>Nepton AI</span>
            <span style={{ fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textTertiary, marginLeft: 8 }}>
              {loading ? "Thinking…" : "IT Intelligence Assistant"}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {messages.length > 0 && (
            <button onClick={e => { e.stopPropagation(); setMessages([]); }} style={{
              padding: "4px 10px", borderRadius: DESIGN_TOKENS.radius.pill,
              border: `1px solid ${THEME.border}`, background: "transparent",
              color: THEME.textTertiary, fontSize: DESIGN_TOKENS.fontSize.xxs,
              cursor: "pointer", fontFamily: DESIGN_TOKENS.font.body,
            }}>Clear</button>
          )}
          <span style={{ color: THEME.textTertiary, fontSize: "14px", transform: isExpanded ? "rotate(180deg)" : "none", transition: `transform ${DESIGN_TOKENS.transition.fast}` }}>▾</span>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Messages Area */}
          <div style={{
            flex: 1, overflow: "auto", padding: "16px",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <NeptonMascot mood="wave" size={48} />
                <p style={{ fontSize: DESIGN_TOKENS.fontSize.sm, color: THEME.textSecondary, marginTop: 12, marginBottom: 16 }}>
                  Hi! I'm Nepton AI. Ask me about tickets, analytics, or IT troubleshooting.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  {quickPrompts.map(qp => (
                    <button key={qp.label} onClick={() => { setInput(qp.prompt); }} style={{
                      padding: "6px 14px", borderRadius: DESIGN_TOKENS.radius.pill,
                      border: `1px solid ${accentColor}30`, background: `${accentColor}08`,
                      color: accentColor, fontSize: DESIGN_TOKENS.fontSize.xxs,
                      cursor: "pointer", fontFamily: DESIGN_TOKENS.font.body,
                      transition: `all ${DESIGN_TOKENS.transition.fast}`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${accentColor}15`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${accentColor}08`; }}
                    >{qp.label}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{
                display: "flex", gap: 10,
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                animation: "fadeInUp 0.3s ease",
              }}>
                {msg.role === "assistant" && <NeptonMascot mood="idle" size={24} />}
                <div style={{
                  maxWidth: "80%", padding: "12px 16px",
                  borderRadius: DESIGN_TOKENS.radius.lg,
                  background: msg.role === "user" ? `${accentColor}15` : THEME.bgElevated,
                  border: `1px solid ${msg.role === "user" ? accentColor + "30" : THEME.border}`,
                  fontSize: DESIGN_TOKENS.fontSize.sm,
                  color: THEME.textSecondary,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", gap: 10, alignItems: "center", animation: "fadeIn 0.3s" }}>
                <NeptonMascot mood="think" size={24} />
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: DESIGN_TOKENS.radius.circle,
                      background: accentColor,
                      animation: `dotPulse 1.4s ease-in-out ${i * 0.16}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "12px 16px",
            borderTop: `1px solid ${THEME.border}`,
            display: "flex", gap: 8,
            background: THEME.bgSurface,
            flexShrink: 0,
          }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              placeholder="Ask Nepton AI anything…"
              onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
              style={{ ...baseInputStyle, flex: 1 }} />
            <button onClick={sendMessage} disabled={loading || !input.trim()} style={{
              padding: "10px 18px", borderRadius: DESIGN_TOKENS.radius.md,
              border: "none", cursor: loading ? "wait" : "pointer",
              background: input.trim() ? accentColor : THEME.bgElevated,
              color: input.trim() ? "#fff" : THEME.textMuted,
              fontSize: DESIGN_TOKENS.fontSize.sm, fontWeight: 600,
              fontFamily: DESIGN_TOKENS.font.body,
              transition: `all ${DESIGN_TOKENS.transition.fast}`,
            }}>Send</button>
          </div>
        </>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 12: ADMIN PORTAL
//  Full dashboard, analytics, ticket management, AI assistant, activity feed
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AdminPortal({ onBack }) {
  const { tickets, loading, stats, update, lastSync } = useTickets(3000);
  const { notifications, show, dismiss } = useNotification();
  const activityLog = useActivityLog();
  const search = useSearch(tickets);
  const [tab, setTab] = useState("dashboard");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newNote, setNewNote] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  const accent = PORTAL_THEMES.admin;

  // Sync selected ticket
  useEffect(() => {
    if (selectedTicket) {
      const fresh = tickets.find(t => t.id === selectedTicket.id);
      if (fresh) setSelectedTicket(fresh);
    }
  }, [tickets]);

  // Computed analytics data
  const analytics = useMemo(() => {
    const catBreak = CATEGORIES.map(c => ({
      ...c, count: tickets.filter(t => t.category === c.id).length,
      open: tickets.filter(t => t.category === c.id && t.status === "open").length,
    })).filter(c => c.count > 0).sort((a, b) => b.count - a.count);

    const deptBreak = [...new Set(tickets.map(t => t.department).filter(Boolean))].map(d => ({
      name: d, count: tickets.filter(t => t.department === d).length,
      open: tickets.filter(t => t.department === d && t.status === "open").length,
      icon: DEPARTMENTS.find(dept => dept.name === d)?.icon || "🏢",
    })).sort((a, b) => b.count - a.count);

    const techBreak = [...new Set(tickets.map(t => t.assignedTo).filter(Boolean))].map(a => ({
      name: a, total: tickets.filter(t => t.assignedTo === a).length,
      resolved: tickets.filter(t => t.assignedTo === a && (t.status === "resolved" || t.status === "closed")).length,
      inProgress: tickets.filter(t => t.assignedTo === a && t.status === "in_progress").length,
    })).sort((a, b) => b.total - a.total);

    const sparkline = generateSparklineData(tickets, 7);

    const priorityBreak = PRIORITY_LEVELS.map(p => ({
      ...p, count: tickets.filter(t => t.priority === p.id).length,
      active: tickets.filter(t => t.priority === p.id && t.status !== "resolved" && t.status !== "closed").length,
    }));

    const statusBreak = Object.entries(STATUS_FLOW).map(([key, val]) => ({
      key, ...val,
      count: tickets.filter(t => t.status === key).length,
    }));

    return { catBreak, deptBreak, techBreak, sparkline, priorityBreak, statusBreak };
  }, [tickets]);

  // Admin ticket actions
  const handleStatus = async (id, s) => {
    const timestamp = new Date().toISOString();
    const r = await update(prev => prev.map(t =>
      t.id === id ? { ...t, status: s, ...(s === "resolved" || s === "closed" ? { resolvedAt: timestamp } : {}) } : t
    ));
    setSelectedTicket(r.find(t => t.id === id));
    await logActivity("status_changed", { ticketId: id, newStatus: s, by: "Admin" });
    show(`${id} → ${STATUS_FLOW[s]?.label}`);
  };

  const handleAssign = async (id, assignee) => {
    const r = await update(prev => prev.map(t =>
      t.id === id ? { ...t, assignedTo: assignee, status: t.status === "open" ? "in_progress" : t.status } : t
    ));
    setSelectedTicket(r.find(t => t.id === id));
    await logActivity("ticket_assigned", { ticketId: id, assignedTo: assignee, by: "Admin" });
    show(`${id} assigned to ${assignee}`);
  };

  const handleDelete = async (id) => {
    await update(prev => prev.filter(t => t.id !== id));
    setSelectedTicket(null);
    setTab("tickets");
    await logActivity("ticket_deleted", { ticketId: id, by: "Admin" });
    show(`${id} deleted`);
  };

  const handleNote = async (id) => {
    if (!newNote.trim()) return;
    const r = await update(prev => prev.map(t =>
      t.id === id ? { ...t, notes: [...(t.notes || []), `[Admin] ${newNote.trim()}`] } : t
    ));
    setSelectedTicket(r.find(t => t.id === id));
    setNewNote("");
    show("Note added");
  };

  const handleClearAll = async () => {
    await update(() => []);
    await logActivity("all_tickets_cleared", { by: "Admin" });
    show("All tickets cleared");
    setConfirmAction(null);
  };

  // CSV Export
  const exportCSV = () => {
    const headers = "ID,Subject,Status,Priority,Category,Employee,Department,Assigned To,Created,Description\n";
    const rows = tickets.map(t =>
      `"${t.id}","${t.subject}","${t.status}","${t.priority}","${t.category}","${t.employeeName}","${t.department}","${t.assignedTo || ""}","${t.createdAt}","${(t.description || "").replace(/"/g, '""')}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `nepton-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    show("CSV exported successfully");
  };

  const adminTabs = [
    { key: "dashboard", label: "Dashboard", icon: "📊", badge: stats.critical, badgeColor: stats.critical > 0 ? THEME.red : undefined },
    { key: "tickets",   label: "Tickets",   icon: "🎫", badge: stats.open },
    { key: "analytics", label: "Analytics",  icon: "📈" },
    { key: "ai",        label: "AI Assistant", icon: "🤖" },
    { key: "activity",  label: "Activity",   icon: "📋" },
    { key: "settings",  label: "Settings",   icon: "⚙️" },
  ];

  if (loading) return <LoadingScreen portalType="admin" />;

  return (
    <div style={{ minHeight: "100vh", background: THEME.bg, color: THEME.text, fontFamily: DESIGN_TOKENS.font.body }}>
      <NotificationStack notifications={notifications} onDismiss={dismiss} />
      <ConfirmDialog isOpen={!!confirmAction} title={confirmAction?.title} message={confirmAction?.message}
        confirmLabel={confirmAction?.label} danger={confirmAction?.danger}
        onConfirm={() => { confirmAction?.onConfirm?.(); setConfirmAction(null); }}
        onCancel={() => setConfirmAction(null)} />

      <PortalHeader portalType="admin" onBack={onBack}
        rightContent={
          <span style={{ fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textMuted }}>
            Last sync: {lastSync ? formatDate(lastSync.toISOString()) : "—"}
          </span>
        } />

      {/* Tab Navigation */}
      <div style={{ background: THEME.bgSurface, paddingLeft: 16 }}>
        <TabBar tabs={adminTabs} activeTab={tab === "detail" ? "tickets" : tab}
          onTabChange={t => { setTab(t); setSelectedTicket(null); }}
          accentColor={accent.accent} />
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>

        {/* ═══ DASHBOARD ═══ */}
        {tab === "dashboard" && (
          <div style={{ animation: "fadeIn 0.4s" }}>
            {/* Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 24 }}>
              {[
                { l: "Total",        v: stats.total,        c: THEME.textSecondary, icon: "📊", sparklineData: analytics.sparkline },
                { l: "Open",         v: stats.open,         c: THEME.blue,          icon: "○" },
                { l: "In Progress",  v: stats.inProgress,   c: THEME.amber,         icon: "◐" },
                { l: "Resolved",     v: stats.resolved,     c: THEME.emerald,       icon: "◉" },
                { l: "Critical",     v: stats.critical,     c: THEME.red,           icon: "🚨" },
                { l: "Unassigned",   v: stats.unassigned,   c: THEME.violet,        icon: "⚠️" },
                { l: "SLA Compliance", v: `${stats.slaCompliance}%`, c: stats.slaCompliance >= 80 ? THEME.emerald : THEME.red, icon: "📋" },
              ].map((s, i) => (
                <StatCard key={s.l} label={s.l} value={s.v} color={s.c} icon={s.icon}
                  sparklineData={s.sparklineData} delay={i * 0.05} />
              ))}
            </div>

            {/* Two-column: Needs Attention + Technician Workload */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              {/* Needs Attention */}
              <div style={{ ...baseCardStyle, padding: "20px" }}>
                <h3 style={{ fontFamily: DESIGN_TOKENS.font.heading, fontSize: DESIGN_TOKENS.fontSize.md, color: THEME.text, marginBottom: 14, fontWeight: 700 }}>🚨 Needs Attention</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {tickets.filter(t => (t.priority === "critical" || t.priority === "high" || !t.assignedTo) && t.status !== "resolved" && t.status !== "closed")
                    .slice(0, 5).map((t, i) => {
                      const pri = PRIORITY_LEVELS.find(p => p.id === t.priority);
                      return (
                        <div key={t.id} onClick={() => { setSelectedTicket(t); setTab("detail"); }}
                          style={{
                            padding: "10px 14px", borderRadius: DESIGN_TOKENS.radius.md,
                            background: THEME.bg, border: `1px solid ${THEME.border}`,
                            borderLeft: `3px solid ${pri?.color || THEME.border}`,
                            cursor: "pointer", animation: `fadeInUp 0.3s ease ${i * 0.06}s both`,
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = THEME.bgElevated}
                          onMouseLeave={e => e.currentTarget.style.background = THEME.bg}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                <span style={{ fontSize: DESIGN_TOKENS.fontSize.xxs, color: accent.accent, fontWeight: 700, fontFamily: DESIGN_TOKENS.font.mono }}>{t.id}</span>
                                <span style={{ fontSize: DESIGN_TOKENS.fontSize.sm, color: THEME.text, fontWeight: 500 }}>{truncate(t.subject, 35)}</span>
                              </div>
                              <span style={{ fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textTertiary }}>
                                👤 {t.employeeName} • {t.assignedTo ? `🛠️ ${t.assignedTo}` : "⚠️ Unassigned"}
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <StatusBadge status={t.status} size="xs" />
                              <PriorityIndicator priority={t.priority} size="sm" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {tickets.filter(t => (t.priority === "critical" || t.priority === "high" || !t.assignedTo) && t.status !== "resolved" && t.status !== "closed").length === 0 && (
                    <div style={{ textAlign: "center", padding: 20, color: THEME.textTertiary, fontSize: DESIGN_TOKENS.fontSize.sm }}>✅ All clear — no urgent tickets</div>
                  )}
                </div>
              </div>

              {/* Technician Workload */}
              <div style={{ ...baseCardStyle, padding: "20px" }}>
                <h3 style={{ fontFamily: DESIGN_TOKENS.font.heading, fontSize: DESIGN_TOKENS.fontSize.md, color: THEME.text, marginBottom: 14, fontWeight: 700 }}>👥 Technician Workload</h3>
                {analytics.techBreak.length === 0
                  ? <div style={{ textAlign: "center", padding: 20, color: THEME.textTertiary, fontSize: DESIGN_TOKENS.fontSize.sm }}>No technicians assigned yet</div>
                  : analytics.techBreak.map((tech, i) => (
                    <div key={tech.name} style={{ marginBottom: 14, animation: `fadeInUp 0.3s ease ${i * 0.06}s both` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <Avatar name={tech.name} size={28} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: DESIGN_TOKENS.fontSize.sm, color: THEME.text, fontWeight: 600 }}>{tech.name}</span>
                          <div style={{ fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textTertiary }}>
                            {tech.total} total • {tech.resolved} resolved • {tech.inProgress} active
                          </div>
                        </div>
                        <span style={{ fontSize: DESIGN_TOKENS.fontSize.sm, fontWeight: 700, color: accent.accent, fontFamily: DESIGN_TOKENS.font.mono }}>
                          {tech.total > 0 ? calcPercent(tech.resolved, tech.total) : 0}%
                        </span>
                      </div>
                      <ProgressBar value={tech.resolved} max={tech.total} color={accent.accent} height={5} />
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Activity Heatmap */}
            <div style={{ ...baseCardStyle, padding: "20px", marginBottom: 24 }}>
              <h3 style={{ fontFamily: DESIGN_TOKENS.font.heading, fontSize: DESIGN_TOKENS.fontSize.md, color: THEME.text, marginBottom: 14, fontWeight: 700 }}>📅 28-Day Activity</h3>
              <ActivityHeatmap tickets={tickets} days={28} />
              <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textTertiary }}>
                <span>Less</span>
                {[0.1, 0.3, 0.5, 0.7, 1].map((intensity, i) => (
                  <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: `rgba(6, 182, 212, ${0.1 + intensity * 0.7})` }} />
                ))}
                <span>More</span>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TICKETS TAB ═══ */}
        {tab === "tickets" && (
          <div style={{ animation: "fadeIn 0.4s" }}>
            {/* Action bar */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 10, flex: 1, flexWrap: "wrap" }}>
                <input placeholder="🔍 Search…" value={search.query} onChange={e => search.setQuery(e.target.value)} style={{ ...baseInputStyle, flex: 1, minWidth: 180 }} />
                <select value={search.statusFilter} onChange={e => search.setStatusFilter(e.target.value)} style={{ ...baseInputStyle, width: 150, cursor: "pointer" }}>
                  <option value="all">All Statuses</option>
                  {Object.entries(STATUS_FLOW).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select value={search.priorityFilter} onChange={e => search.setPriorityFilter(e.target.value)} style={{ ...baseInputStyle, width: 140, cursor: "pointer" }}>
                  <option value="all">All Priorities</option>
                  {PRIORITY_LEVELS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <button onClick={exportCSV} style={{
                padding: "8px 16px", borderRadius: DESIGN_TOKENS.radius.md,
                border: `1px solid ${THEME.border}`, background: "transparent",
                color: THEME.textSecondary, fontSize: DESIGN_TOKENS.fontSize.xs,
                cursor: "pointer", fontFamily: DESIGN_TOKENS.font.body, marginLeft: 10,
              }}>📤 Export CSV</button>
            </div>

            {search.filtered.length === 0
              ? <EmptyState icon="📭" title="No tickets found" accentColor={accent.accent} />
              : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {search.filtered.map((t, i) => {
                    const cat = CATEGORIES.find(c => c.id === t.category);
                    const pri = PRIORITY_LEVELS.find(p => p.id === t.priority);
                    return (
                      <div key={t.id} onClick={() => { setSelectedTicket(t); setTab("detail"); }}
                        style={{
                          ...baseCardStyle, padding: "14px 18px", cursor: "pointer",
                          borderLeft: `4px solid ${pri?.color || THEME.border}`,
                          animation: `fadeInUp 0.3s ease ${i * 0.03}s both`,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = THEME.bgElevated}
                        onMouseLeave={e => e.currentTarget.style.background = THEME.bgSurface}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                            <Avatar name={t.employeeName} size={30} />
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                                <span style={{ fontSize: DESIGN_TOKENS.fontSize.xs, color: accent.accent, fontWeight: 700, fontFamily: DESIGN_TOKENS.font.mono }}>{t.id}</span>
                                <span style={{ fontSize: DESIGN_TOKENS.fontSize.md, color: THEME.text, fontWeight: 600 }}>{truncate(t.subject, 50)}</span>
                              </div>
                              <div style={{ display: "flex", gap: 10, fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textTertiary }}>
                                <span>👤 {t.employeeName}</span>
                                <span>🏢 {t.department}</span>
                                <span>{cat?.icon} {cat?.label}</span>
                                {t.assignedTo && <span>🛠️ {t.assignedTo}</span>}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <SLAIndicator ticket={t} compact />
                            <StatusBadge status={t.status} />
                            <PriorityIndicator priority={t.priority} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        )}

        {/* ═══ TICKET DETAIL ═══ */}
        {tab === "detail" && selectedTicket && (() => {
          const cat = CATEGORIES.find(c => c.id === selectedTicket.category);
          return (
            <div style={{ animation: "fadeInUp 0.3s ease" }}>
              <button onClick={() => setTab("tickets")} style={{
                marginBottom: 16, padding: "8px 18px", borderRadius: DESIGN_TOKENS.radius.md,
                border: `1px solid ${THEME.border}`, background: "transparent",
                color: THEME.textSecondary, fontSize: DESIGN_TOKENS.fontSize.xs,
                cursor: "pointer", fontFamily: DESIGN_TOKENS.font.body,
              }}>← Back</button>

              <div style={{ ...baseCardStyle, padding: "28px" }}>
                {/* Header + Delete */}
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: accent.accent, fontWeight: 700, fontFamily: DESIGN_TOKENS.font.mono }}>{selectedTicket.id}</span>
                    <StatusBadge status={selectedTicket.status} size="md" />
                    <PriorityIndicator priority={selectedTicket.priority} variant="badge" />
                  </div>
                  <button onClick={() => setConfirmAction({
                    title: "Delete Ticket", message: `Permanently delete ${selectedTicket.id}? This cannot be undone.`,
                    label: "Delete", danger: true, onConfirm: () => handleDelete(selectedTicket.id),
                  })} style={{
                    padding: "6px 14px", borderRadius: DESIGN_TOKENS.radius.md,
                    border: `1px solid ${THEME.red}40`, background: `${THEME.red}10`,
                    color: THEME.red, fontSize: DESIGN_TOKENS.fontSize.xxs,
                    fontWeight: 600, cursor: "pointer", fontFamily: DESIGN_TOKENS.font.body,
                  }}>🗑️ Delete</button>
                </div>

                <h3 style={{ fontFamily: DESIGN_TOKENS.font.heading, fontSize: DESIGN_TOKENS.fontSize.xl, color: THEME.text, fontWeight: 700, marginBottom: 16 }}>{selectedTicket.subject}</h3>

                {/* SLA */}
                <div style={{ marginBottom: 16 }}><SLAIndicator ticket={selectedTicket} /></div>

                {/* Info Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16, padding: "16px", background: THEME.bg, borderRadius: DESIGN_TOKENS.radius.md, border: `1px solid ${THEME.border}` }}>
                  {[
                    ["Employee", `👤 ${selectedTicket.employeeName}`],
                    ["Department", `🏢 ${selectedTicket.department}`],
                    ["Email", `📧 ${selectedTicket.email}`],
                    ["Category", `${cat?.icon || ""} ${cat?.label || ""}`],
                    ["Submitted", formatDate(selectedTicket.createdAt, { showTime: true, relative: false })],
                    ["Assigned", selectedTicket.assignedTo ? `🛠️ ${selectedTicket.assignedTo}` : "⚠️ Unassigned"],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <span style={{ fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textMuted, textTransform: "uppercase" }}>{l}</span>
                      <p style={{ fontSize: DESIGN_TOKENS.fontSize.sm, color: THEME.textSecondary, marginTop: 3, fontWeight: 500 }}>{v}</p>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <div style={{ background: THEME.bg, borderRadius: DESIGN_TOKENS.radius.md, padding: "16px", fontSize: DESIGN_TOKENS.fontSize.md, lineHeight: 1.7, color: THEME.textSecondary, marginBottom: 16, border: `1px solid ${THEME.border}` }}>{selectedTicket.description}</div>

                {/* Screenshots */}
                {selectedTicket.screenshots?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={baseLabelStyle}>📸 Screenshots</label>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", padding: "12px", background: THEME.bg, borderRadius: DESIGN_TOKENS.radius.md, border: `1px solid ${THEME.border}` }}>
                      {selectedTicket.screenshots.map((s, i) => <img key={i} src={s.data} alt="" style={{ width: 160, height: 120, objectFit: "cover", borderRadius: DESIGN_TOKENS.radius.md, border: `1px solid ${THEME.border}` }} />)}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "16px", background: THEME.bg, borderRadius: DESIGN_TOKENS.radius.md, marginBottom: 16, border: `1px solid ${THEME.border}` }}>
                  {!selectedTicket.assignedTo && (
                    <button onClick={() => handleAssign(selectedTicket.id, "IT Tech Support")} style={{
                      padding: "8px 16px", borderRadius: DESIGN_TOKENS.radius.md,
                      border: `1px solid ${accent.accent}40`, background: `${accent.accent}10`,
                      color: accent.accent, fontSize: DESIGN_TOKENS.fontSize.xs,
                      fontWeight: 600, cursor: "pointer", fontFamily: DESIGN_TOKENS.font.body,
                    }}>📨 Assign to Tech</button>
                  )}
                  {Object.entries(STATUS_FLOW).map(([k, v]) => k !== selectedTicket.status && (
                    <button key={k} onClick={() => handleStatus(selectedTicket.id, k)} style={{
                      padding: "8px 16px", borderRadius: DESIGN_TOKENS.radius.md,
                      border: `1px solid ${v.color}40`, background: `${v.color}10`,
                      color: v.color, fontSize: DESIGN_TOKENS.fontSize.xs,
                      fontWeight: 600, cursor: "pointer", fontFamily: DESIGN_TOKENS.font.body,
                    }}>{v.icon} → {v.label}</button>
                  ))}
                </div>

                {/* Notes */}
                <div>
                  <label style={baseLabelStyle}>📝 Notes</label>
                  {selectedTicket.notes?.length > 0 && selectedTicket.notes.map((n, i) => (
                    <div key={i} style={{ background: THEME.bgElevated, borderRadius: DESIGN_TOKENS.radius.md, padding: "12px 16px", fontSize: DESIGN_TOKENS.fontSize.sm, color: THEME.textSecondary, marginBottom: 6, borderLeft: `3px solid ${accent.accent}` }}>{n}</div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Admin note…" onKeyDown={e => { if (e.key === "Enter") handleNote(selectedTicket.id); }} style={{ ...baseInputStyle, flex: 1 }} />
                    <button onClick={() => handleNote(selectedTicket.id)} style={{ padding: "10px 20px", borderRadius: DESIGN_TOKENS.radius.md, border: "none", cursor: "pointer", background: accent.accent, color: "#fff", fontSize: DESIGN_TOKENS.fontSize.sm, fontWeight: 600, fontFamily: DESIGN_TOKENS.font.body }}>Add</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═══ ANALYTICS ═══ */}
        {tab === "analytics" && (
          <div style={{ animation: "fadeIn 0.4s" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              {/* By Category */}
              <div style={{ ...baseCardStyle, padding: "20px" }}>
                <h4 style={{ fontFamily: DESIGN_TOKENS.font.heading, fontSize: DESIGN_TOKENS.fontSize.md, color: THEME.text, marginBottom: 16, fontWeight: 700 }}>📂 By Category</h4>
                <BarChart data={analytics.catBreak.map(c => ({ label: c.label.split(" ")[0], value: c.count, color: c.color }))} height={150} />
              </div>

              {/* By Department */}
              <div style={{ ...baseCardStyle, padding: "20px" }}>
                <h4 style={{ fontFamily: DESIGN_TOKENS.font.heading, fontSize: DESIGN_TOKENS.fontSize.md, color: THEME.text, marginBottom: 16, fontWeight: 700 }}>🏢 By Department</h4>
                <BarChart data={analytics.deptBreak.map(d => ({ label: d.name.split(" ")[0], value: d.count, color: THEME.blue }))} height={150} />
              </div>

              {/* Status Distribution */}
              <div style={{ ...baseCardStyle, padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <h4 style={{ fontFamily: DESIGN_TOKENS.font.heading, fontSize: DESIGN_TOKENS.fontSize.md, color: THEME.text, marginBottom: 16, fontWeight: 700, alignSelf: "flex-start" }}>📊 Status Distribution</h4>
                <DonutChart
                  segments={analytics.statusBreak.map(s => ({ value: s.count, color: s.color }))}
                  size={160} thickness={18}
                  centerValue={stats.total} centerLabel="Total"
                />
                <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
                  {analytics.statusBreak.map(s => (
                    <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textSecondary }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                      {s.label}: {s.count}
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority Distribution */}
              <div style={{ ...baseCardStyle, padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <h4 style={{ fontFamily: DESIGN_TOKENS.font.heading, fontSize: DESIGN_TOKENS.fontSize.md, color: THEME.text, marginBottom: 16, fontWeight: 700, alignSelf: "flex-start" }}>⚡ Priority Distribution</h4>
                <DonutChart
                  segments={analytics.priorityBreak.map(p => ({ value: p.count, color: p.color }))}
                  size={160} thickness={18}
                  centerValue={stats.critical + stats.high} centerLabel="Urgent"
                />
                <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap", justifyContent: "center" }}>
                  {analytics.priorityBreak.map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textSecondary }}>
                      <div style={{ width: 8, height: 8, borderRadius: DESIGN_TOKENS.radius.circle, background: p.color }} />
                      {p.label}: {p.count} ({p.active} active)
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div style={{ ...baseCardStyle, padding: "20px" }}>
              <h4 style={{ fontFamily: DESIGN_TOKENS.font.heading, fontSize: DESIGN_TOKENS.fontSize.md, color: THEME.text, marginBottom: 16, fontWeight: 700 }}>🎯 Performance Metrics</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
                <div>
                  <ProgressBar value={stats.resolutionRate} showLabel label="Resolution Rate" color={stats.resolutionRate >= 70 ? THEME.emerald : THEME.amber} height={8} />
                </div>
                <div>
                  <ProgressBar value={stats.slaCompliance} showLabel label="SLA Compliance" color={stats.slaCompliance >= 80 ? THEME.emerald : THEME.red} height={8} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: DESIGN_TOKENS.fontSize.xs }}>
                    <span style={{ color: THEME.textSecondary }}>Avg Resolution</span>
                    <span style={{ color: THEME.cyan, fontWeight: 600, fontFamily: DESIGN_TOKENS.font.mono }}>{formatDuration(stats.avgResolution)}</span>
                  </div>
                  <div style={{ height: 8, background: THEME.bgElevated, borderRadius: 4 }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ AI ASSISTANT ═══ */}
        {tab === "ai" && (
          <div style={{ animation: "fadeIn 0.4s" }}>
            <AIAssistant tickets={tickets} stats={stats} accentColor={accent.accent} />
          </div>
        )}

        {/* ═══ ACTIVITY LOG ═══ */}
        {tab === "activity" && (
          <div style={{ animation: "fadeIn 0.4s" }}>
            <div style={{ ...baseCardStyle, padding: "20px" }}>
              <h3 style={{ fontFamily: DESIGN_TOKENS.font.heading, fontSize: DESIGN_TOKENS.fontSize.md, color: THEME.text, marginBottom: 16, fontWeight: 700 }}>📋 Recent Activity</h3>
              {activityLog.loading
                ? <Skeleton height={40} count={5} />
                : activityLog.log.length === 0
                  ? <EmptyState icon="📋" title="No activity yet" subtitle="Actions like ticket creation, status changes, and assignments will appear here." />
                  : <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {activityLog.log.slice(0, 30).map((entry, i) => (
                        <div key={entry.id} style={{
                          padding: "12px 16px",
                          background: i % 2 === 0 ? THEME.bg : "transparent",
                          borderRadius: DESIGN_TOKENS.radius.sm,
                          display: "flex", alignItems: "center", gap: 12,
                          fontSize: DESIGN_TOKENS.fontSize.sm,
                          animation: `fadeInUp 0.3s ease ${i * 0.02}s both`,
                        }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: DESIGN_TOKENS.radius.circle,
                            background: entry.action.includes("delete") ? THEME.red
                              : entry.action.includes("resolved") || entry.action.includes("closed") ? THEME.emerald
                              : entry.action.includes("created") ? THEME.blue
                              : THEME.amber,
                            flexShrink: 0,
                          }} />
                          <span style={{ color: THEME.textSecondary, flex: 1 }}>
                            <span style={{ fontWeight: 600, color: THEME.text }}>{entry.action.replace(/_/g, " ")}</span>
                            {entry.ticketId && <span style={{ color: accent.accent, fontFamily: DESIGN_TOKENS.font.mono }}> {entry.ticketId}</span>}
                            {entry.by && <span> by {entry.by}</span>}
                            {entry.newStatus && <span> → {STATUS_FLOW[entry.newStatus]?.label}</span>}
                          </span>
                          <span style={{ fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textMuted, whiteSpace: "nowrap" }}>
                            {formatDate(entry.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
              }
            </div>
          </div>
        )}

        {/* ═══ SETTINGS ═══ */}
        {tab === "settings" && (
          <div style={{ animation: "fadeIn 0.4s", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ ...baseCardStyle, padding: "20px" }}>
              <h4 style={{ fontFamily: DESIGN_TOKENS.font.heading, fontSize: DESIGN_TOKENS.fontSize.md, color: THEME.text, marginBottom: 8, fontWeight: 700 }}>🗑️ Data Management</h4>
              <p style={{ fontSize: DESIGN_TOKENS.fontSize.sm, color: THEME.textTertiary, marginBottom: 16 }}>Permanently delete all tickets. This action cannot be undone.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setConfirmAction({
                  title: "Clear All Tickets",
                  message: "This will permanently delete ALL tickets. This cannot be undone.",
                  label: "Delete All", danger: true, onConfirm: handleClearAll,
                })} style={{
                  padding: "10px 22px", borderRadius: DESIGN_TOKENS.radius.md,
                  border: `1px solid ${THEME.red}40`, background: `${THEME.red}10`,
                  color: THEME.red, fontSize: DESIGN_TOKENS.fontSize.sm,
                  fontWeight: 600, cursor: "pointer", fontFamily: DESIGN_TOKENS.font.body,
                }}>🗑️ Clear All Tickets</button>
                <button onClick={exportCSV} style={{
                  padding: "10px 22px", borderRadius: DESIGN_TOKENS.radius.md,
                  border: `1px solid ${THEME.border}`, background: "transparent",
                  color: THEME.textSecondary, fontSize: DESIGN_TOKENS.fontSize.sm,
                  fontWeight: 600, cursor: "pointer", fontFamily: DESIGN_TOKENS.font.body,
                }}>📤 Export All as CSV</button>
              </div>
            </div>

            <div style={{ ...baseCardStyle, padding: "20px" }}>
              <h4 style={{ fontFamily: DESIGN_TOKENS.font.heading, fontSize: DESIGN_TOKENS.fontSize.md, color: THEME.text, marginBottom: 8, fontWeight: 700 }}>ℹ️ System Information</h4>
              <div style={{ fontSize: DESIGN_TOKENS.fontSize.sm, color: THEME.textTertiary, lineHeight: 2.2 }}>
                <p><span style={{ color: THEME.textSecondary, fontWeight: 500 }}>Application:</span> {APP_CONFIG.appName} v{APP_CONFIG.version}</p>
                <p><span style={{ color: THEME.textSecondary, fontWeight: 500 }}>Company:</span> {APP_CONFIG.company}</p>
                <p><span style={{ color: THEME.textSecondary, fontWeight: 500 }}>Managing Director:</span> {APP_CONFIG.managingDirector}</p>
                <p><span style={{ color: THEME.textSecondary, fontWeight: 500 }}>Total Tickets:</span> {stats.total}</p>
                <p><span style={{ color: THEME.textSecondary, fontWeight: 500 }}>Storage:</span> Persistent shared storage (real-time sync)</p>
                <p><span style={{ color: THEME.textSecondary, fontWeight: 500 }}>AI Engine:</span> Claude Sonnet 4</p>
                <p><span style={{ color: THEME.textSecondary, fontWeight: 500 }}>Portals:</span> Employee (Cyan) • Tech Support (Amber) • Admin (Emerald)</p>
                <p><span style={{ color: THEME.textSecondary, fontWeight: 500 }}>Categories:</span> {CATEGORIES.length} • Departments: {DEPARTMENTS.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 13: PARTICLE BACKGROUND ENGINE
//  Animated floating particle system for the landing page
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ParticleBackground({ count = 40, color = THEME.cyan }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2.5 + 0.8,
      opacity: Math.random() * 0.4 + 0.1,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.02 + 0.005,
    }));

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.addEventListener("mousemove", handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      particles.forEach((p, i) => {
        // Update pulse
        p.pulse += p.pulseSpeed;
        const currentOpacity = p.opacity + Math.sin(p.pulse) * 0.15;

        // Mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120 && dist > 0) {
          const force = (120 - dist) / 120 * 0.8;
          p.vx += (dx / dist) * force * 0.1;
          p.vy += (dy / dist) * force * 0.1;
        }

        // Damping
        p.vx *= 0.995;
        p.vy *= 0.995;

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
        if (p.y < -10) p.y = canvas.height + 10;
        if (p.y > canvas.height + 10) p.y = -10;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${color}${Math.round(Math.max(0, currentOpacity) * 255).toString(16).padStart(2, "0")}`;
        ctx.fill();

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const cdx = p.x - p2.x;
          const cdy = p.y - p2.y;
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
          if (cdist < 130) {
            const lineOpacity = (1 - cdist / 130) * 0.12;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `${color}${Math.round(lineOpacity * 255).toString(16).padStart(2, "0")}`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [count, color]);

  return (
    <canvas ref={canvasRef} style={{
      position: "absolute", top: 0, left: 0,
      width: "100%", height: "100%",
      pointerEvents: "all", zIndex: 0,
    }} />
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 14: ANIMATED COUNTER
//  Smooth count-up animation for landing page statistics
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AnimatedCounter({ value, duration = 1200, suffix = "", prefix = "" }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const numVal = typeof value === "number" ? value : parseInt(value) || 0;
    if (numVal === 0) { setDisplay(0); return; }

    const startVal = 0;
    startRef.current = performance.now();

    const tick = (now) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + (numVal - startVal) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [value, duration]);

  return <span>{prefix}{display.toLocaleString()}{suffix}</span>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 15: GLASSMORPHISM PORTAL CARD
//  Interactive 3D-tilt portal selection card with hover effects
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function PortalCard({ title, subtitle, icon, description, accentColor, gradient, features, onClick, delay = 0, stats: cardStats }) {
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (y - 0.5) * -8, y: (x - 0.5) * 8 });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      style={{
        background: `${THEME.bgSurface}cc`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${isHovered ? accentColor + "50" : THEME.border}`,
        borderRadius: DESIGN_TOKENS.radius.xl,
        padding: "32px 28px",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${isHovered ? "translateY(-6px) scale(1.01)" : "translateY(0) scale(1)"}`,
        transition: `border-color 0.3s, box-shadow 0.4s, transform 0.2s ease-out`,
        boxShadow: isHovered
          ? `0 20px 60px ${accentColor}20, 0 0 40px ${accentColor}10, inset 0 1px 0 ${accentColor}15`
          : `0 4px 24px ${THEME.shadow}`,
        animation: `fadeInUp 0.6s ease ${delay}s both`,
      }}
    >
      {/* Glow effect */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: isHovered ? 3 : 0,
        background: gradient,
        transition: "height 0.3s ease",
        borderRadius: `${DESIGN_TOKENS.radius.xl} ${DESIGN_TOKENS.radius.xl} 0 0`,
      }} />

      {/* Background accent glow */}
      <div style={{
        position: "absolute", top: -50, right: -50,
        width: 160, height: 160,
        background: `radial-gradient(circle, ${accentColor}${isHovered ? "18" : "08"} 0%, transparent 70%)`,
        borderRadius: DESIGN_TOKENS.radius.circle,
        transition: "all 0.4s ease",
        pointerEvents: "none",
      }} />

      {/* Icon + Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, position: "relative", zIndex: 1 }}>
        <div style={{
          width: 52, height: 52,
          borderRadius: DESIGN_TOKENS.radius.lg,
          background: `${accentColor}12`,
          border: `1px solid ${accentColor}25`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "24px",
          transition: `all ${DESIGN_TOKENS.transition.fast}`,
          transform: isHovered ? "scale(1.08) rotate(-3deg)" : "scale(1)",
        }}>
          {icon}
        </div>
        <div>
          <h3 style={{
            fontFamily: DESIGN_TOKENS.font.display,
            fontSize: DESIGN_TOKENS.fontSize.xxl,
            fontWeight: 800,
            color: THEME.text,
            letterSpacing: "-0.02em",
            marginBottom: 2,
          }}>{title}</h3>
          <p style={{
            fontSize: DESIGN_TOKENS.fontSize.xs,
            color: accentColor,
            fontWeight: 600,
            fontFamily: DESIGN_TOKENS.font.mono,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}>{subtitle}</p>
        </div>
      </div>

      {/* Description */}
      <p style={{
        fontSize: DESIGN_TOKENS.fontSize.sm,
        color: THEME.textTertiary,
        lineHeight: 1.6,
        marginBottom: 20,
        position: "relative", zIndex: 1,
      }}>{description}</p>

      {/* Feature List */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 8,
        marginBottom: 20, position: "relative", zIndex: 1,
      }}>
        {features.map((feat, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            fontSize: DESIGN_TOKENS.fontSize.xs,
            color: THEME.textSecondary,
            opacity: isHovered ? 1 : 0.8,
            transform: isHovered ? `translateX(4px)` : "translateX(0)",
            transition: `all 0.3s ease ${i * 0.05}s`,
          }}>
            <span style={{
              width: 6, height: 6,
              borderRadius: DESIGN_TOKENS.radius.circle,
              background: accentColor,
              flexShrink: 0,
              boxShadow: `0 0 8px ${accentColor}40`,
            }} />
            {feat}
          </div>
        ))}
      </div>

      {/* Stats Row (if provided) */}
      {cardStats && cardStats.length > 0 && (
        <div style={{
          display: "flex", gap: 16,
          padding: "12px 0",
          borderTop: `1px solid ${THEME.border}`,
          position: "relative", zIndex: 1,
        }}>
          {cardStats.map((s, i) => (
            <div key={i} style={{ textAlign: "center", flex: 1 }}>
              <div style={{
                fontSize: DESIGN_TOKENS.fontSize.lg,
                fontWeight: 800,
                color: accentColor,
                fontFamily: DESIGN_TOKENS.font.mono,
              }}>
                <AnimatedCounter value={s.value} duration={1000 + i * 200} suffix={s.suffix || ""} />
              </div>
              <div style={{
                fontSize: DESIGN_TOKENS.fontSize.xxs,
                color: THEME.textMuted,
                marginTop: 2,
              }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginTop: 4, position: "relative", zIndex: 1,
      }}>
        <span style={{
          fontSize: DESIGN_TOKENS.fontSize.sm,
          fontWeight: 700,
          color: accentColor,
          transition: `all ${DESIGN_TOKENS.transition.fast}`,
          transform: isHovered ? "translateX(4px)" : "translateX(0)",
        }}>
          Enter Portal →
        </span>
        <div style={{
          width: 36, height: 36,
          borderRadius: DESIGN_TOKENS.radius.circle,
          background: isHovered ? accentColor : `${accentColor}15`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: `all ${DESIGN_TOKENS.transition.fast}`,
          color: isHovered ? "#fff" : accentColor,
          fontSize: "16px",
        }}>→</div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 16: LIVE STATS TICKER
//  Animated horizontal scrolling stats bar for the landing page
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function LiveStatsTicker({ stats }) {
  const items = [
    { label: "Total Tickets", value: stats.total, color: THEME.cyan },
    { label: "Open", value: stats.open, color: THEME.blue },
    { label: "In Progress", value: stats.inProgress, color: THEME.amber },
    { label: "Resolved", value: stats.resolved, color: THEME.emerald },
    { label: "Critical", value: stats.critical, color: THEME.red },
    { label: "SLA Compliance", value: `${stats.slaCompliance}%`, color: stats.slaCompliance >= 80 ? THEME.emerald : THEME.red },
    { label: "Resolution Rate", value: `${stats.resolutionRate}%`, color: stats.resolutionRate >= 70 ? THEME.emerald : THEME.amber },
  ];

  return (
    <div style={{
      overflow: "hidden",
      background: `${THEME.bgSurface}90`,
      backdropFilter: "blur(10px)",
      borderTop: `1px solid ${THEME.border}`,
      borderBottom: `1px solid ${THEME.border}`,
      padding: "10px 0",
    }}>
      <div style={{
        display: "flex",
        animation: "tickerScroll 30s linear infinite",
        width: "max-content",
      }}>
        {[...items, ...items, ...items].map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "0 28px",
            whiteSpace: "nowrap",
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: DESIGN_TOKENS.radius.circle,
              background: item.color, boxShadow: `0 0 6px ${item.color}50`,
            }} />
            <span style={{ fontSize: DESIGN_TOKENS.fontSize.xxs, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.label}</span>
            <span style={{ fontSize: DESIGN_TOKENS.fontSize.sm, fontWeight: 700, color: item.color, fontFamily: DESIGN_TOKENS.font.mono }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 17: KEYBOARD SHORTCUTS OVERLAY
//  Help modal showing available keyboard shortcuts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function KeyboardShortcuts({ isOpen, onClose }) {
  const shortcuts = [
    { keys: ["1"], action: "Open Employee Portal", group: "Navigation" },
    { keys: ["2"], action: "Open Tech Support Portal", group: "Navigation" },
    { keys: ["3"], action: "Open Admin Portal", group: "Navigation" },
    { keys: ["Esc"], action: "Go back / Close modal", group: "Navigation" },
    { keys: ["?"], action: "Show this help", group: "General" },
    { keys: ["/"], action: "Focus search (in portals)", group: "General" },
    { keys: ["N"], action: "New ticket (Employee Portal)", group: "Actions" },
    { keys: ["E"], action: "Export CSV (Admin Portal)", group: "Actions" },
  ];

  const groups = [...new Set(shortcuts.map(s => s.group))];

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} title="⌨️ Keyboard Shortcuts" onClose={onClose} maxWidth={440}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {groups.map(group => (
          <div key={group}>
            <h4 style={{
              fontSize: DESIGN_TOKENS.fontSize.xxs,
              color: THEME.textMuted,
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: 10,
              paddingBottom: 6,
              borderBottom: `1px solid ${THEME.border}`,
            }}>{group}</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {shortcuts.filter(s => s.group === group).map((s, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: DESIGN_TOKENS.fontSize.sm, color: THEME.textSecondary }}>{s.action}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {s.keys.map((key, j) => (
                      <kbd key={j} style={{
                        padding: "3px 8px",
                        borderRadius: DESIGN_TOKENS.radius.sm,
                        background: THEME.bgElevated,
                        border: `1px solid ${THEME.border}`,
                        color: THEME.text,
                        fontSize: DESIGN_TOKENS.fontSize.xxs,
                        fontFamily: DESIGN_TOKENS.font.mono,
                        fontWeight: 600,
                        minWidth: 24,
                        textAlign: "center",
                        boxShadow: `0 2px 0 ${THEME.border}`,
                      }}>{key}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 18: NEPTON PORTAL HUB — LANDING PAGE
//  The main landing/hub page with animated portal selection
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function NeptonPortalHub({ onSelectPortal, stats }) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Greeting
  useEffect(() => {
    const h = currentTime.getHours();
    setGreeting(h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening");
  }, [currentTime]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "1") onSelectPortal("employee");
      if (e.key === "2") onSelectPortal("tech");
      if (e.key === "3") onSelectPortal("admin");
      if (e.key === "?") setShowShortcuts(prev => !prev);
      if (e.key === "Escape") setShowShortcuts(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSelectPortal]);

  const portals = [
    {
      key: "employee",
      title: "Employee",
      subtitle: "Submit & Track",
      icon: "🎫",
      description: "Submit IT support tickets, track progress in real-time, attach screenshots, and view knowledge base solutions.",
      accentColor: PORTAL_THEMES.employee.accent,
      gradient: PORTAL_THEMES.employee.gradient,
      features: [
        "Smart ticket submission with category detection",
        "Real-time status tracking & SLA countdown",
        "Screenshot attachment (drag & drop)",
        "Knowledge base auto-suggestions",
        "Priority selection with SLA info",
      ],
      stats: [
        { label: "Total", value: stats.total },
        { label: "Open", value: stats.open },
        { label: "Resolved", value: stats.resolved },
      ],
    },
    {
      key: "tech",
      title: "Tech Support",
      subtitle: "Resolve & Manage",
      icon: "🛠️",
      description: "Accept and resolve tickets, add resolution notes with quick templates, manage your queue with advanced filters.",
      accentColor: PORTAL_THEMES.tech.accent,
      gradient: PORTAL_THEMES.tech.gradient,
      features: [
        "One-click ticket acceptance & assignment",
        "Resolution note templates (8 presets)",
        "Multi-filter queue management",
        "SLA status tracking per ticket",
        "Real-time ticket sync across portals",
      ],
      stats: [
        { label: "In Progress", value: stats.inProgress },
        { label: "Unassigned", value: stats.unassigned },
        { label: "Critical", value: stats.critical },
      ],
    },
    {
      key: "admin",
      title: "Admin",
      subtitle: "Analyze & Control",
      icon: "📊",
      description: "Full dashboard with analytics, AI assistant powered by Claude, activity timeline, CSV export, and system management.",
      accentColor: PORTAL_THEMES.admin.accent,
      gradient: PORTAL_THEMES.admin.gradient,
      features: [
        "6-tab command center (Dashboard, Analytics, AI…)",
        "AI Assistant powered by Claude Sonnet 4",
        "Interactive charts (donut, bar, heatmap)",
        "Activity timeline with audit trail",
        "CSV export & data management",
      ],
      stats: [
        { label: "SLA", value: stats.slaCompliance, suffix: "%" },
        { label: "Resolved", value: stats.resolutionRate, suffix: "%" },
        { label: "Categories", value: CATEGORIES.length },
      ],
    },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: THEME.bg,
      color: THEME.text,
      fontFamily: DESIGN_TOKENS.font.body,
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Particle Background */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
        <ParticleBackground count={35} color={THEME.cyan} />
      </div>

      {/* Gradient Overlay */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "50vh",
        background: `linear-gradient(180deg, ${THEME.bg} 0%, transparent 100%)`,
        zIndex: 1, pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "30vh",
        background: `linear-gradient(0deg, ${THEME.bg} 0%, transparent 100%)`,
        zIndex: 1, pointerEvents: "none",
      }} />

      <KeyboardShortcuts isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* ── Top Bar ── */}
      <header style={{
        position: "relative", zIndex: 10,
        padding: "16px 28px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderBottom: `1px solid ${THEME.border}20`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <NeptonMascot mood="wave" size={32} />
          <div>
            <span style={{
              fontFamily: DESIGN_TOKENS.font.display,
              fontSize: DESIGN_TOKENS.fontSize.lg,
              fontWeight: 800,
              color: THEME.text,
              letterSpacing: "-0.03em",
            }}>NEPTON</span>
            <span style={{
              fontSize: DESIGN_TOKENS.fontSize.xxs,
              color: THEME.cyan,
              fontFamily: DESIGN_TOKENS.font.mono,
              marginLeft: 8,
              padding: "2px 8px",
              background: `${THEME.cyan}10`,
              borderRadius: DESIGN_TOKENS.radius.pill,
              border: `1px solid ${THEME.cyan}20`,
            }}>v{APP_CONFIG.version}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{
            fontSize: DESIGN_TOKENS.fontSize.xs,
            color: THEME.textMuted,
            fontFamily: DESIGN_TOKENS.font.mono,
          }}>
            {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button onClick={() => setShowShortcuts(true)} style={{
            padding: "6px 12px",
            borderRadius: DESIGN_TOKENS.radius.md,
            border: `1px solid ${THEME.border}`,
            background: "transparent",
            color: THEME.textTertiary,
            fontSize: DESIGN_TOKENS.fontSize.xxs,
            cursor: "pointer",
            fontFamily: DESIGN_TOKENS.font.mono,
          }}>? Shortcuts</button>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        zIndex: 2,
        padding: "40px 24px 20px",
      }}>
        {/* Greeting */}
        <div style={{
          textAlign: "center",
          marginBottom: 16,
          animation: "fadeInUp 0.6s ease 0.1s both",
        }}>
          <p style={{
            fontSize: DESIGN_TOKENS.fontSize.sm,
            color: THEME.textTertiary,
            marginBottom: 6,
            fontFamily: DESIGN_TOKENS.font.mono,
          }}>{greeting}</p>
          <h1 style={{
            fontFamily: DESIGN_TOKENS.font.display,
            fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            marginBottom: 8,
          }}>
            <span style={{ color: THEME.text }}>IT Support </span>
            <span style={{
              background: `linear-gradient(135deg, ${THEME.cyan}, ${THEME.blue}, ${THEME.violet})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>Command Center</span>
          </h1>
          <p style={{
            fontSize: DESIGN_TOKENS.fontSize.md,
            color: THEME.textTertiary,
            maxWidth: 540,
            margin: "0 auto",
            lineHeight: 1.6,
          }}>
            {APP_CONFIG.company} — Streamlined IT operations with AI-powered intelligence, real-time tracking, and enterprise analytics.
          </p>
        </div>

        {/* Portal Cards Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 20,
          maxWidth: 1060,
          width: "100%",
          marginBottom: 28,
        }}>
          {portals.map((portal, i) => (
            <PortalCard
              key={portal.key}
              {...portal}
              onClick={() => onSelectPortal(portal.key)}
              delay={0.15 + i * 0.12}
            />
          ))}
        </div>

        {/* Company Footer */}
        <div style={{
          textAlign: "center",
          animation: "fadeIn 0.8s ease 0.7s both",
          marginBottom: 12,
        }}>
          <p style={{
            fontSize: DESIGN_TOKENS.fontSize.xxs,
            color: THEME.textMuted,
            marginBottom: 4,
          }}>
            {APP_CONFIG.company} • Est. {APP_CONFIG.established} • MEP Engineering & Contracting
          </p>
          <p style={{
            fontSize: DESIGN_TOKENS.fontSize.xxs,
            color: THEME.textMuted,
          }}>
            📍 Cairo, Egypt — El-Serage Mall Towers, Nasr City &nbsp;|&nbsp; 📍 Dhahran, Saudi Arabia
          </p>
          <p style={{
            fontSize: DESIGN_TOKENS.fontSize.xxs,
            color: `${THEME.textMuted}80`,
            marginTop: 6,
          }}>
            Managing Director: {APP_CONFIG.managingDirector} &nbsp;•&nbsp; Powered by Claude AI
          </p>
        </div>
      </div>

      {/* Live Stats Ticker at bottom */}
      {stats.total > 0 && (
        <div style={{ position: "relative", zIndex: 5 }}>
          <LiveStatsTicker stats={stats} />
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SECTION 19: APP ROOT — DEFAULT EXPORT
//  Main application component with portal routing and global state
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function NeptonITSupport() {
  const [portal, setPortal] = useState("hub");
  const { tickets, loading, stats } = useTickets(5000);

  // Global Escape key to return to hub
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
        if (portal !== "hub") setPortal("hub");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [portal]);

  if (loading && portal === "hub") {
    return <LoadingScreen portalType="hub" />;
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: THEME.bg,
      fontFamily: DESIGN_TOKENS.font.body,
    }}>
      {/* Inject global styles */}
      <NeptonGlobalStyles />

      {portal === "hub" && (
        <NeptonPortalHub
          onSelectPortal={setPortal}
          stats={stats}
        />
      )}
      {portal === "employee" && (
        <EmployeePortal onBack={() => setPortal("hub")} />
      )}
      {portal === "tech" && (
        <TechSupportPortal onBack={() => setPortal("hub")} />
      )}
      {portal === "admin" && (
        <AdminPortal onBack={() => setPortal("hub")} />
      )}
    </div>
  );
}
