// docs/js/auth.js
import { app } from "./firebase-config.js";

let _auth = null;
let _onAuthCb = null;

// helpers DOM seguros
const $ = (id) => document.getElementById(id);
const has = (el) => !!el;
const show = (el) =>
  el &&
  el.classList &&
  (el.classList.remove("hidden"), el.classList.add("flex"));
const hide = (el) =>
  el &&
  el.classList &&
  (el.classList.add("hidden"), el.classList.remove("flex"));

function switchTab(mode = "login") {
  const tLogin = $("tab-login");
  const tSignup = $("tab-signup");
  const title = $("auth-title");
  const sub = $("auth-sub");
  const extra = $("auth-extra");

  if (!tLogin || !tSignup || !title || !sub) return;

  if (mode === "login") {
    tLogin.classList.add("bg-white/5", "border-white/10");
    tSignup.classList.remove("bg-white/5");
    title.textContent = "Entrar";
    sub.textContent = "Usa o teu e-mail e palavra-passe.";
    if (extra) extra.classList.add("hidden");
  } else {
    tSignup.classList.add("bg-white/5", "border-white/10");
    tLogin.classList.remove("bg-white/5");
    title.textContent = "Criar conta";
    sub.textContent = "Cria a tua conta com e-mail e palavra-passe.";
    if (extra) extra.classList.remove("hidden");
  }
}

function openAuth() {
  show($("auth-modal"));
}
function closeAuth() {
  hide($("auth-modal"));
}

// exposto ao main
export function listenAuth(cb) {
  _onAuthCb = cb;
}

export async function initAuth() {
  // carrega SDK Auth
  const {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile,
    signOut,
  } = await import(
    "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js"
  );

  _auth = getAuth(app);

  // listeners de UI (se existirem)
  $("tab-login")?.addEventListener("click", () => switchTab("login"));
  $("tab-signup")?.addEventListener("click", () => switchTab("signup"));
  $("auth-close")?.addEventListener("click", closeAuth);

  $("auth-forgot")?.addEventListener("click", async () => {
    const email = $("auth-email")?.value?.trim();
    const msg = $("auth-msg");
    if (!email) {
      if (msg) msg.textContent = "Escreve o teu e-mail para recuperar.";
      return;
    }
    try {
      await sendPasswordResetEmail(_auth, email);
      if (msg) msg.textContent = "Email de recuperação enviado.";
    } catch (e) {
      if (msg) msg.textContent = "Falha ao enviar recuperação.";
      console.error(e);
    }
  });

  $("auth-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("auth-email")?.value?.trim();
    const pass = $("auth-pass")?.value?.trim();
    const name = $("auth-name")?.value?.trim();
    const isSignup = $("tab-signup")?.classList.contains("bg-white/5");
    const msg = $("auth-msg");
    if (msg) msg.textContent = "";

    try {
      if (isSignup) {
        const cred = await createUserWithEmailAndPassword(_auth, email, pass);
        if (name) await updateProfile(cred.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(_auth, email, pass);
      }
      closeAuth();
      $("auth-form")?.reset();
    } catch (err) {
      console.error(err);
      if (msg) msg.textContent = "Credenciais inválidas ou conta inexistente.";
    }
  });

  // estado de autenticação
  onAuthStateChanged(_auth, (user) => {
    // se não estiver autenticado, abre modal (só no primeiro arranque)
    if (!user) {
      switchTab("login");
      openAuth();
    } else {
      closeAuth();
    }
    _onAuthCb?.(user || null);
  });

  // API auxiliar opcional (logout via consola)
  window.__logout = () => signOut(_auth);
}
