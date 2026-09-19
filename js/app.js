import { initState, getState, subscribe, navigate, setCurrentUserFromSession, setLocalOnlyUser } from "./state.js";
import { startRouter, registerRoute } from "./router.js";
import { initSupabase, isConfigured } from "./db.js";
import { getSession, onAuthChange } from "./auth.js";

import { renderLogin } from "./views/login.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderDebts } from "./views/debts.js";
import { renderAddDebt } from "./views/add-debt.js";
import { renderDebtDetails } from "./views/debt-details.js";
import { renderPayments } from "./views/payments.js";
import { renderCustomers } from "./views/customers.js";
import { renderSettings } from "./views/settings.js";

import { renderSidebar } from "./components/sidebar.js";
import { renderBottomNav } from "./components/bottom-nav.js";
import { renderTopbar } from "./components/topbar.js";

// === Connect this to your own Supabase project ===
// Project Settings -> API in your Supabase dashboard gives you both values.
const SUPABASE_URL = "https://cdfwbdneoqousipzcved.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZndiZG5lb3FvdXNpcHpjdmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3OTQxODIsImV4cCI6MjEwNTM3MDE4Mn0.OEaRqppby1y-qdWs09cb-PEgibNedizxjAbhHTsCCh4";

const appEl = document.getElementById("app");

async function mount() {
  initSupabase(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Offline-first: load whatever this device already has before we even
  // know whether we're online or logged in.
  await initState();

  if (isConfigured()) {
    const session = await getSession();
    setCurrentUserFromSession(session);
    if (session && getState().route === "login") navigate("dashboard");

    onAuthChange((session) => {
      setCurrentUserFromSession(session);
      if (session) {
        if (getState().route === "login") navigate("dashboard");
      } else {
        navigate("login");
      }
    });
  } else {
    // No backend wired up yet — skip the login gate so the app is still
    // usable locally while you're setting Supabase up.
    setLocalOnlyUser();
    navigate("dashboard");
  }

  subscribe((state) => rebuildShell(state));
  registerRoutes();
  rebuildShell(getState());
}

function registerRoutes() {
  registerRoute("dashboard",     renderDashboard);
  registerRoute("debts",         renderDebts);
  registerRoute("add-debt",      renderAddDebt);
  registerRoute("debt-details",  renderDebtDetails);
  registerRoute("payments",      renderPayments);
  registerRoute("customers",     renderCustomers);
  registerRoute("settings",      renderSettings);
}

let currentShellType = null; // "login" | "app"

function rebuildShell(state) {
  if (state.route === "login") {
    if (currentShellType !== "login") {
      currentShellType = "login";
      appEl.innerHTML = "";
      appEl.appendChild(renderLogin());
    }
    return;
  }

  // Build app shell only once
  if (currentShellType !== "app") {
    currentShellType = "app";
    appEl.innerHTML = "";

    const shell = document.createElement("div");
    shell.className = "app-shell";

    // Sidebar (desktop)
    const sidebar = renderSidebar();
    shell.appendChild(sidebar);

    const main = document.createElement("div");
    main.className = "app-main";

    // Mobile topbar
    main.appendChild(renderTopbar());

    const content = document.createElement("div");
    content.className = "app-content";
    content.id = "route-content";
    main.appendChild(content);

    shell.appendChild(main);
    appEl.appendChild(shell);

    // Bottom nav (mobile)
    appEl.appendChild(renderBottomNav());

    // Start router into content
    startRouter(content, () => {
      // Route changed — sidebar/bottom nav re-render via their own subscriptions.
    });
  }
}

// Because views like the sidebar subscribe to state independently,
// we also make sure navigation clicks work even if shell is built once.
window.__cynthia_navigate = navigate;

mount();
