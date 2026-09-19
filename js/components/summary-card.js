import { escapeHtml } from "../utils.js";

export function summaryCard({ label, value, meta, accent = "" }) {
  const el = document.createElement("div");
  el.className = "summary-card" + (accent ? ` accent-${accent}` : "");
  el.innerHTML = `
    <div class="label">${escapeHtml(label)}</div>
    <div class="value">${escapeHtml(value)}</div>
    ${meta ? `<div class="meta">${escapeHtml(meta)}</div>` : ""}
  `;
  return el;
}