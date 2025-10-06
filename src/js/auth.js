// src/js/auth.js
import { auth, OFFLINE } from './firebase-config.js';

const listeners = new Set();
export function listenAuth(cb){ listeners.add(cb); return ()=>listeners.delete(cb); }
const notify = (u)=> listeners.forEach(fn=>{ try{ fn(u); }catch{} });

const $ = (id)=> document.getElementById(id);
const toast = (msg)=>{
  const t = $('toast'), s = $('toast-text'); if(!t||!s) return;
  s.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.add('hidden'), 2600);
};

export async function initAuth(){
  const modal   = $('auth-modal');
  const title   = $('auth-title');
  const sub     = $('auth-sub');
  const tabIn   = $('tab-login');
  const tabUp   = $('tab-signup');
  const form    = $('auth-form');
  const email   = $('auth-email');
  const pass    = $('auth-pass');
  const nameIn  = $('auth-name');
  const extra   = $('auth-extra');
  const submit  = $('auth-submit');
  const msg     = $('auth-msg');
  const forgot  = $('auth-forgot');
  const chip    = $('user-chip');
  const btnIn   = $('btn-login');
  const btnOut  = $('btn-logout');
  const btnClose= $('auth-close'); // continua hidden para forçar login

  let mode = 'login'; // 'login' | 'signup'

  function openModal(){
    msg.textContent = '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    email.focus();
  }
  function closeModal(){
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
  function setMode(next){
    mode = next;
    const isUp = mode === 'signup';
    tabIn.classList.toggle('bg-slate-50', !isUp);
    tabUp.classList.toggle('bg-slate-50',  isUp);
    extra.classList.toggle('hidden', !isUp);
    title.textContent = isUp ? 'Criar conta' : 'Entrar';
    sub.textContent   = isUp ? 'Cria a tua conta com e-mail e palavra-passe.'
                             : 'Usa o teu e-mail e palavra-passe.';
    msg.textContent = '';
  }

  if (OFFLINE) {
    // modo dev: não pede login
    chip.textContent = 'Dev mode (offline)';
    chip.classList.remove('hidden');
    btnIn?.classList.add('hidden');
    btnOut?.classList.add('hidden');
    notify(null);
    return;
  }

  const {
    onAuthStateChanged, signOut,
    setPersistence, browserLocalPersistence,
    signInWithEmailAndPassword, createUserWithEmailAndPassword,
    updateProfile, sendPasswordResetEmail
  } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js");

  await setPersistence(auth, browserLocalPersistence);

  // Tab handlers
  tabIn?.addEventListener('click', ()=> setMode('login'));
  tabUp?.addEventListener('click', ()=> setMode('signup'));
  btnClose?.addEventListener('click', closeModal);

  // Forgot password
  forgot?.addEventListener('click', async ()=>{
    msg.textContent = '';
    const addr = email.value.trim();
    if(!addr){ msg.textContent = 'Escreve o teu e-mail para recuperar.'; email.focus(); return; }
    try{ await sendPasswordResetEmail(auth, addr); toast('Email de recuperação enviado.'); }
    catch(e){ msg.textContent = mapAuthError(e); }
  });

  // Form submit
  form?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    msg.textContent = '';
    submit.disabled = true;

    const addr = email.value.trim();
    const pwd  = pass.value.trim();

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, addr, pwd);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, addr, pwd);
        const nick = nameIn.value.trim();
        if (nick) { try { await updateProfile(cred.user, { displayName: nick }); } catch {} }
        toast('Conta criada! Bem-vindo 👋');
      }
    } catch (e) {
      msg.textContent = mapAuthError(e);
    } finally {
      submit.disabled = false;
    }
  });

  // Botões da topbar
  btnIn?.addEventListener('click', ()=> { setMode('login'); openModal(); });
  btnOut?.addEventListener('click', async () => {
      try { await signOut(auth); } catch {}
      // limpa inputs do modal
      (document.getElementById('auth-email')||{}).value = '';
      (document.getElementById('auth-pass')||{}).value  = '';
      (document.getElementById('auth-name')||{}).value  = '';
    });


  // Estado de sessão
  onAuthStateChanged(auth, (user)=>{
    if (user) {
      chip.textContent = user.displayName || user.email || 'Sessão iniciada';
      chip.classList.remove('hidden');
      btnOut?.classList.remove('hidden');
      btnIn?.classList.add('hidden');
      (document.getElementById('auth-email')||{}).value = '';
      (document.getElementById('auth-pass')||{}).value  = '';
      (document.getElementById('auth-name')||{}).value  = '';
      closeModal();
    } else {
      chip.classList.add('hidden');
      btnOut?.classList.add('hidden');
      btnIn?.classList.remove('hidden');
      setMode('login');
      openModal(); // <- força modal ao arrancar sem sessão
    }
    notify(user);
  });
}

function mapAuthError(e){
  const c = e?.code || '';
  if (c==='auth/invalid-email') return 'E-mail inválido.';
  if (c==='auth/missing-password') return 'Senha em falta.';
  if (c==='auth/weak-password') return 'Senha demasiado fraca.';
  if (c==='auth/user-not-found') return 'Utilizador não existe.';
  if (c==='auth/wrong-password') return 'Senha incorreta.';
  if (c==='auth/too-many-requests') return 'Muitas tentativas. Tenta mais tarde.';
  if (c==='auth/network-request-failed') return 'Sem rede.';
  return 'Falha na autenticação.';
}
