const root = () => document.getElementById("toast-root");

export function toast(message, type = "default", duration = 2400) {
  const r = root();
  if (!r) return;
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.textContent = message;
  r.appendChild(node);
  setTimeout(() => {
    node.style.transition = "opacity 0.2s, transform 0.2s";
    node.style.opacity = "0";
    node.style.transform = "translateY(8px)";
    setTimeout(() => node.remove(), 220);
  }, duration);
}