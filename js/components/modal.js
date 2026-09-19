const modalRoot = () => document.getElementById("modal-root");

export function openModal({ title, body, footer, onClose }) {
  const root = modalRoot();
  if (!root) return { close(){} };

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const modal = document.createElement("div");
  modal.className = "modal";

  const header = document.createElement("div");
  header.className = "modal-header";
  header.innerHTML = `
    <div class="modal-title"></div>
    <button class="btn btn-ghost btn-icon" data-close aria-label="Close">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  header.querySelector(".modal-title").textContent = title || "";

  const bodyEl = document.createElement("div");
  bodyEl.className = "modal-body";
  if (typeof body === "string") bodyEl.innerHTML = body;
  else if (body instanceof Node) bodyEl.appendChild(body);

  modal.appendChild(header);
  modal.appendChild(bodyEl);

  if (footer) {
    const footEl = document.createElement("div");
    footEl.className = "modal-footer";
    if (typeof footer === "string") footEl.innerHTML = footer;
    else if (footer instanceof Node) footEl.appendChild(footer);
    modal.appendChild(footEl);
  }

  backdrop.appendChild(modal);
  root.appendChild(backdrop);

  function close() {
    backdrop.remove();
    document.removeEventListener("keydown", onKey);
    if (onClose) onClose();
  }

  function onKey(e) { if (e.key === "Escape") close(); }

  backdrop.addEventListener("click", e => { if (e.target === backdrop) close(); });
  header.querySelector("[data-close]").addEventListener("click", close);
  document.addEventListener("keydown", onKey);

  return { close, backdrop, modal, body: bodyEl };
}

export function confirmModal({ title, message, confirmLabel = "Confirm", destructive = false }) {
  return new Promise(resolve => {
    const body = document.createElement("div");
    body.innerHTML = `<p style="font-size:14px;color:var(--text-2);">${message}</p>`;

    const footer = document.createElement("div");
    footer.style.display = "flex";
    footer.style.gap = "12px";
    footer.style.width = "100%";
    footer.innerHTML = `
      <button class="btn btn-secondary" data-cancel style="flex:1;">Cancel</button>
      <button class="btn ${destructive ? "btn-danger" : "btn-primary"}" data-ok style="flex:1;">${confirmLabel}</button>
    `;

    const m = openModal({ title, body, footer, onClose: () => resolve(false) });
    footer.querySelector("[data-cancel]").addEventListener("click", () => { m.close(); resolve(false); });
    footer.querySelector("[data-ok]").addEventListener("click", () => { m.close(); resolve(true); });
  });
}