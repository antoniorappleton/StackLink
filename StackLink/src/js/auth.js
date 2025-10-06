import { auth, provider } from './firebase-config.js';
import { signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const $login  = document.getElementById('btn-login');
const $logout = document.getElementById('btn-logout');
const $chip   = document.getElementById('user-chip');

export function listenAuth(cb){
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      $chip.textContent = `Olá, ${user.displayName || 'utilizador'}`;
      $chip.classList.remove('hidden');
      $logout.classList.remove('hidden');
      $login.classList.add('hidden');
    } else {
      $chip.classList.add('hidden');
      $logout.classList.add('hidden');
      $login.classList.remove('hidden');
    }
    cb?.(user);
  });
}

$login?.addEventListener('click', async () => {
  await signInWithPopup(auth, provider);
});

$logout?.addEventListener('click', async () => {
  await signOut(auth);
});
