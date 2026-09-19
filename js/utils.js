// ---------- Money ----------
// All money is stored as integer KSh (no cents). Never use floats for money.

export function formatKsh(amount) {
  const n = Number(amount) || 0;
  return "KSh " + n.toLocaleString("en-KE");
}

export function parseAmountInput(value) {
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/[^0-9]/g, "");
  if (!cleaned) return 0;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : 0;
}

// ---------- Dates ----------
export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() &&
         d.getMonth() === t.getMonth() &&
         d.getDate() === t.getDate();
}

// ---------- ID ----------
let _idCounter = 1;
export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${(_idCounter++).toString(36)}`;
}

// ---------- DOM helpers ----------
export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizePhone(phone) {
  return String(phone || "").replace(/[^0-9+]/g, "");
}

export function initials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

// ---------- Search ----------
export function matchesQuery(haystack, query) {
  if (!query) return true;
  return String(haystack || "").toLowerCase().includes(query.toLowerCase().trim());
}