import { auth, provider } from './firebase-config.js';
import {
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const $login  = document.getElementById('btn-login');
const $logout = document.getElementById('btn-logout');
const $chip   = document.getElementById('user-chip');

export function initAuth(autoAnon = true) {
  // tenta autenticar anonimamente para que Firestore funcione já
  if (autoAnon) {
    // só se ainda não houver sessão
    if (!auth.currentUser) {
      signInAnonymously(auth).catch(console.warn);
    }
  }
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      const isAnon = user.isAnonymous;
      $chip.textContent = isAnon
        ? 'Sessão temporária'
        : `Olá, ${user.displayName || 'utilizador'}`;
      $chip.classList.remove('hidden');
      $logout.classList.remove('hidden');
      $login.classList.toggle('hidden', !isAnon); // mostra "Entrar" mesmo com anónimo
    } else {
      $chip.classList.add('hidden');
      $logout.classList.add('hidden');
      $login.classList.remove('hidden');
    }
    _notifyAuthListeners(user);
  });
}

$login?.addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error(e);
    alert('Falha no login. Verifica o provider Google nas definições do Firebase.');
  }
});

$logout?.addEventListener('click', async () => {
  try {
    await signOut(auth);
    // volta a sessão anónima para não “matar” o app
    await signInAnonymously(auth);
  } catch (e) { console.error(e); }
});

// listeners externos (main.js)
const _listeners = new Set();
export function listenAuth(cb) { _listeners.add(cb); return () => _listeners.delete(cb); }
function _notifyAuthListeners(user){ _listeners.forEach(fn => { try { fn(user); } catch(_){} }); }
