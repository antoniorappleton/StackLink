// src/js/main.js
import { initFirebase, OFFLINE } from './firebase-config.js';
import { initAuth, listenAuth } from './auth.js';
import { fetchCategories, fetchLinks, addLink, toggleFavorite, removeLink, addCategory } from './data.js';
import { populateCategoriesSelect, renderLinks, renderCategoryPills, injectSearchIcon, openModal, closeModal, renderFooterIcons } from './ui.js';


// SW (a página corre a partir de /public)
if ('serviceWorker' in navigator) {
  const reg = await navigator.serviceWorker.register("sw.js?v=11", {
    scope: "./",
  }); // ← mesma versão
  // quando houver update, troca imediatamente e recarrega
  function reloadWhenReady() {
    if (!navigator.serviceWorker.controller) return;
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
    reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
  }
  reg.addEventListener('updatefound', () => {
    const sw = reg.installing;
    if (!sw) return;
    sw.addEventListener('statechange', () => {
      if (sw.state === 'installed' && navigator.serviceWorker.controller) reloadWhenReady();
    });
  });
  // caso o SW novo já esteja à espera
  if (reg.waiting) reloadWhenReady();
}


// Tema
const btnTheme = document.getElementById('btn-theme');
const setTheme = (t) => {
  document.documentElement.classList.toggle('dark', t === 'dark');
  document.body.classList.toggle('bg-slate-900', t === 'dark');
  document.body.classList.toggle('text-slate-100', t === 'dark');
  localStorage.setItem('theme', t);
};
setTheme(localStorage.getItem('theme') || 'light');
btnTheme?.addEventListener('click', () =>
  setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark')
);

// PWA install
let deferredPrompt;
const btnInstall = document.getElementById('btn-install');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  btnInstall?.classList.remove('hidden');
});
btnInstall?.addEventListener('click', async () => {
  deferredPrompt?.prompt();
  await deferredPrompt?.userChoice;
  deferredPrompt = null;
  btnInstall?.classList.add('hidden');
});

// Estado
let CATEGORIES = [];
let LINKS = [];
let ACTIVE_CAT = '';

function toast(msg){
  const t = document.getElementById('toast'); const s = document.getElementById('toast-text');
  if (!t || !s) return; s.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.add('hidden'), 2500);
}

// ---------- BOOT ----------
await initFirebase();   // inicializa Firebase (ou fica OFFLINE se falhar/config ausente)
await initAuth();       // sem anónimo automático
injectSearchIcon();
renderFooterIcons();


listenAuth(async (user) => {
  try {
    if (user || OFFLINE) {
      CATEGORIES = await ensureBaseCategories();
      LINKS = await fetchLinks();
    } else {
      CATEGORIES = []; LINKS = []; ACTIVE_CAT='';
    }
    hydrateUI();
  } catch (e) { console.error(e); toast('Falha ao carregar dados'); }
});

function setActiveFooter(id){
  ['ft-home','ft-cats','ft-fav','ft-settings'].forEach(x=>{
    const el = document.getElementById(x);
    if (el) el.classList.toggle('active', x===id);
  });
}
function hydrateUI() {
  populateCategoriesSelect(CATEGORIES);
  renderCategoryPills(CATEGORIES, LINKS, ACTIVE_CAT);
  applyFilters();
  setActiveFooter('ft-home');
}


// Filtros
const search = document.getElementById('search');
const sort = document.getElementById('filter-sort');
const viewToggle = document.getElementById('view-toggle');
[search, sort, viewToggle].forEach(el=>el?.addEventListener('input', applyFilters));

document.getElementById('cat-pills')?.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;
  ACTIVE_CAT = btn.dataset.id || '';
  renderCategoryPills(CATEGORIES, LINKS, ACTIVE_CAT);
  applyFilters();
});

function applyFilters(){
  const q = (search?.value || '').toLowerCase();
  const sortBy = sort?.value || 'dateDesc';

  let list = LINKS.filter(l =>
    (!ACTIVE_CAT || l.categoryIds?.includes(ACTIVE_CAT)) &&
    ((l.title||'').toLowerCase().includes(q) || (l.description||'').toLowerCase().includes(q) || (l.url||'').toLowerCase().includes(q))
  );

  if (sortBy === 'dateDesc') list.sort((a,b)=>(b.createdAt?.seconds||b.createdAt||0)-(a.createdAt?.seconds||a.createdAt||0));
  if (sortBy === 'nameAsc') list.sort((a,b)=>(a.title||a.url).localeCompare(b.title||b.url));
  if (sortBy === 'popDesc') list.sort((a,b)=> (b.popularity||0)-(a.popularity||0));

  renderLinks(list, CATEGORIES, viewToggle?.checked);
}

// Ações
document.getElementById('grid')?.addEventListener('click', async (e) => {
  const card = e.target.closest('article[data-id]');
  if (!card) return;
  const id = card.dataset.id;

  const favBtn = e.target.closest('[data-action="fav"]');
  const delBtn = e.target.closest('[data-action="del"]');

  try {
    if (favBtn) {
      const link = LINKS.find(l => l.id === id);
      await toggleFavorite(id, !link?.isFavorite);
      LINKS = await fetchLinks(); applyFilters();
    }
    if (delBtn) {
      if (!confirm('Apagar este link?')) return;
      await removeLink(id);
      LINKS = await fetchLinks(); hydrateUI();
    }
  } catch (e) { console.error(e); toast('Ação falhou'); }
});

// Modal + guardar link
const btnAdd   = document.getElementById('btn-add');
const modal    = document.getElementById('modal-add');
const formAdd  = document.getElementById('form-add');
const btnCancel= document.getElementById('btn-cancel');

// --- Modal Nova Categoria ---
const catModal  = document.getElementById('cat-modal');
const catForm   = document.getElementById('cat-form');
const catBtn    = document.getElementById('btn-new-category');
const catCancel = document.getElementById('cat-cancel');

function openCatModal(){ catModal.classList.remove('hidden'); catModal.classList.add('flex'); }
function closeCatModal(){ catModal.classList.add('hidden'); catModal.classList.remove('flex'); }

catBtn?.addEventListener('click', ()=> openCatModal());
catCancel?.addEventListener('click', ()=> closeCatModal());
catModal?.addEventListener('click', (e)=>{ if(e.target===catModal) closeCatModal(); });

catForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name  = document.getElementById('cat-name').value.trim();
  const color = document.getElementById('cat-color').value || '#2563eb';
  const icon  = document.getElementById('cat-icon').value || 'folder';
  if (!name) return;
  try {
    await addCategory({ name, color, icon, order: Date.now() });
    closeCatModal();
    catForm.reset();
    // refresh categorias e pills
    CATEGORIES = await fetchCategories();
    hydrateUI();
    toast('Categoria criada.');
  } catch (err) {
    console.error(err);
    toast('Falha ao criar categoria.');
  }
});


btnAdd?.addEventListener('click', () => {
  if (!CATEGORIES.length) { toast('Cria uma categoria primeiro.'); return; }
  openModal();
});
btnCancel?.addEventListener('click', closeModal);
modal?.addEventListener('click', (e)=>{ if(e.target===modal) closeModal(); });

formAdd?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const url   = document.getElementById('add-url').value.trim();
  const title = document.getElementById('add-title').value.trim();
  const desc  = document.getElementById('add-desc').value.trim();
  const cat   = document.getElementById('add-category').value || null;
  const fav   = document.getElementById('add-fav').checked;
  if (!url) return;

  try {
    await addLink({ url, title, description: desc, categoryId: cat, isFavorite: fav });
    closeModal(); formAdd.reset();
    LINKS = await fetchLinks(); hydrateUI();
  } catch (e) { console.error(e); toast('Não foi possível guardar'); }
});

// categorias base
async function ensureBaseCategories(){
  let cats = await fetchCategories();
  if (cats.length) return cats;
  await addCategory({ name:'Tecnologia',      color:'#2563eb', icon:'</>' , order:10 });
  await addCategory({ name:'Notícias',        color:'#64748b', icon:'📰'  , order:20 });
  await addCategory({ name:'Estudos',         color:'#10b981', icon:'📚'  , order:30 });
  await addCategory({ name:'Entretenimento',  color:'#f59e0b', icon:'🎬'  , order:40 });
  await addCategory({ name:'Finanças',        color:'#0ea5e9', icon:'💹'  , order:50 });
  cats = await fetchCategories();
  return cats;
}
