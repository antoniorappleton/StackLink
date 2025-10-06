import './firebase-config.js';
import { listenAuth } from './auth.js';
import { fetchCategories, fetchLinks, addLink, toggleFavorite, removeLink } from './data.js';
import { populateCategoriesSelect, renderLinks, renderCategoryPills, injectSearchIcon, openModal, closeModal } from './ui.js';

// SW
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');

// Tema
const btnTheme = document.getElementById('btn-theme');
const setTheme = (t) => {
  document.documentElement.classList.toggle('dark', t === 'dark');
  document.body.classList.toggle('bg-slate-900', t === 'dark');
  document.body.classList.toggle('text-slate-100', t === 'dark');
  localStorage.setItem('theme', t);
};
setTheme(localStorage.getItem('theme') || 'light');
btnTheme?.addEventListener('click', () => setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark'));

// PWA install
let deferredPrompt;
const btnInstall = document.getElementById('btn-install');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; btnInstall?.classList.remove('hidden'); });
btnInstall?.addEventListener('click', async () => { deferredPrompt?.prompt(); await deferredPrompt?.userChoice; deferredPrompt = null; btnInstall?.classList.add('hidden'); });

// Estado
let CATEGORIES = [];
let LINKS = [];
let ACTIVE_CAT = '';

// Auth → carregar
listenAuth(async (user) => {
  injectSearchIcon();
  if (user) {
    CATEGORIES = await ensureBaseCategories();
    LINKS = await fetchLinks();
    hydrateUI();
  } else {
    CATEGORIES = []; LINKS = []; ACTIVE_CAT = '';
    hydrateUI();
  }
});

function hydrateUI() {
  populateCategoriesSelect(CATEGORIES);
  renderCategoryPills(CATEGORIES, LINKS, ACTIVE_CAT);
  applyFilters();
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

  if (sortBy === 'dateDesc') list.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  if (sortBy === 'nameAsc') list.sort((a,b)=>(a.title||a.url).localeCompare(b.title||b.url));
  if (sortBy === 'popDesc') list.sort((a,b)=> (b.popularity||0)-(a.popularity||0));

  renderLinks(list, CATEGORIES, viewToggle?.checked);
}

// Ações no cartão: favorito / apagar / abrir (abrir já é <a>)
document.getElementById('grid')?.addEventListener('click', async (e) => {
  const card = e.target.closest('article[data-id]');
  if (!card) return;
  const id = card.dataset.id;

  const favBtn = e.target.closest('[data-action="fav"]');
  const delBtn = e.target.closest('[data-action="del"]');

  if (favBtn) {
    const link = LINKS.find(l => l.id === id);
    const next = !link?.isFavorite;
    await toggleFavorite(id, next);
    LINKS = await fetchLinks();
    applyFilters();
  }

  if (delBtn) {
    if (!confirm('Apagar este link?')) return;
    await removeLink(id);
    LINKS = await fetchLinks();
    hydrateUI();
  }
});

// Modal + guardar link
const btnAdd   = document.getElementById('btn-add');
const modal    = document.getElementById('modal-add');
const formAdd  = document.getElementById('form-add');
const btnCancel= document.getElementById('btn-cancel');

btnAdd?.addEventListener('click', () => {
  if (!CATEGORIES.length) { alert('Entra com a tua conta para criar categorias.'); return; }
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
    LINKS = await fetchLinks();
    hydrateUI();
  } catch (err) { console.error(err); alert('Falha ao guardar.'); }
});

// categorias base na primeira vez
import { addCategory } from './data.js';
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
