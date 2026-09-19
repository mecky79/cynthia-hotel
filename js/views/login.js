import { navigate } from "../state.js";
import { toast } from "../components/toast.js";
import { signIn } from "../auth.js";

export function renderLogin() {
  const wrap = document.createElement("div");
  wrap.className = "login-screen";

  wrap.innerHTML = `
    <form class="login-card" id="login-form" novalidate>
      <div class="brand">
        <div class="brand-mark">CH</div>
        <div class="brand-name">Cynthia Hotel</div>
        <div class="brand-sub">Debt Ledger</div>
      </div>

      <div class="stack">
        <div class="field">
          <label for="login-id">Email</label>
          <input class="input" id="login-id" name="id" type="email" autocomplete="username" placeholder="you@cynthiahotel.co.ke" />
        </div>

        <div class="field">
          <label for="login-pass">Password</label>
          <div class="input-with-addon">
            <input class="input" id="login-pass" name="password" type="password" autocomplete="current-password" placeholder="••••••••" />
            <button type="button" class="input-addon-btn" id="toggle-pass">Show</button>
          </div>
        </div>

        <button class="btn btn-primary btn-lg btn-block" type="submit" id="login-btn">Sign in</button>
      </div>

      <div class="login-foot">
        <a href="#" id="forgot-link">Forgot password?</a>
      </div>
    </form>
  `;

  const passInput = wrap.querySelector("#login-pass");
  const toggle = wrap.querySelector("#toggle-pass");
  toggle.addEventListener("click", () => {
    if (passInput.type === "password") { passInput.type = "text"; toggle.textContent = "Hide"; }
    else { passInput.type = "password"; toggle.textContent = "Show"; }
  });

  wrap.querySelector("#forgot-link").addEventListener("click", (e) => {
    e.preventDefault();
    toast("Ask whoever manages the Supabase project to reset your password from the dashboard.", "warning");
  });

  const form = wrap.querySelector("#login-form");
  const loginBtn = wrap.querySelector("#login-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = wrap.querySelector("#login-id").value.trim();
    const pw = passInput.value;
    if (!id) { toast("Please enter your email.", "error"); return; }
    if (!pw) { toast("Please enter your password.", "error"); return; }

    loginBtn.disabled = true;
    loginBtn.textContent = "Signing in…";
    try {
      await signIn(id, pw);
      toast("Signed in.", "success");
      navigate("dashboard");
    } catch (err) {
      toast(err.message || "Sign in failed.", "error");
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Sign in";
    }
  });

  return wrap;
}
