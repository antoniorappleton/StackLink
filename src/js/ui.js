import { svg } from './icons.js';

export function injectSearchIcon() {
  const wrap = document.querySelector('.input-icon');
  if (!wrap || wrap.querySelector('svg')) return;
  wrap.insertAdjacentHTML('afterbegin', svg('search', 'w-5 h-5'));
}

export function renderCategoryPills(categories, links, activeId = '') {
  const el = document.getElementById('cat-pills');
  if (!el) return;

  const counts = {};
  links.forEach(l => (l.categoryIds || []).forEach(id => counts[id] = (counts[id] || 0) + 1));
  const total = links.length;

  const pillHtml = (id, label, iconName, isActive, count) => `
    <button class="pill ${isActive ? 'active' : ''}" data-id="${id}">
      ${svg(iconName, 'w-4 h-4')}
      <span>${label}</span>
      <span class="count">${count}</span>
    </button>
  `;

  let html = pillHtml('', 'Todas', 'globe', activeId === '', total);
  categories.forEach(c => {
    const iconName = guessIconFromName(c.name);
    html += pillHtml(c.id, c.name, iconName, activeId === c.id, counts[c.id] || 0);
  });

  el.innerHTML = html;
}

function guessIconFromName(name='') {
  const n = name.toLowerCase();
  if (n.includes('tec') || n.includes('dev') || n.includes('code')) return 'code';
  if (n.includes('not') || n.includes('news')) return 'news';
  if (n.includes('estud') || n.includes('leitur') || n.includes('book')) return 'book';
  if (n.includes('entreten') || n.includes('media') || n.includes('tv')) return 'tv';
  if (n.includes('fin') || n.includes('invest')) return 'chart';
  return 'globe';
}

export function populateCategoriesSelect(categories) {
  const addSel = document.getElementById('add-category');
  if (!addSel) return;
  addSel.innerHTML = '<option value="">Sem categoria</option>';
  categories.forEach(c => {
    const o = document.createElement('option');
    o.value = c.id; o.textContent = c.name;
    addSel.appendChild(o);
  });
}

export function renderLinks(list, categories, compact=false) {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  if (!list.length) {
    grid.innerHTML = `<div class="text-slate-500 p-8">Sem links. Adiciona um com “+ Link”.</div>`;
    return;
  }
  list.forEach(link => {
    const cat = categories.find(c => link.categoryIds?.includes(c.id));
    const host = safeHost(link.url);
    const fav = !!link.isFavorite;

    const header = `
      <div class="flex items-start justify-between p-4">
        <div class="flex items-center gap-2 text-slate-500">
          ${svg('globe','w-4 h-4')}
          <span class="text-sm">${host || '—'}</span>
        </div>
        <div class="flex items-center gap-1">
          <button class="icon-btn fav ${fav ? 'active':''}" data-action="fav" title="Favorito">${fav ? svg('starFill') : svg('star')}</button>
          <a class="icon-btn" href="${link.url}" target="_blank" rel="noopener" title="Abrir">${svg('external')}</a>
          <button class="icon-btn danger" data-action="del" title="Apagar">${svg('trash')}</button>
        </div>
      </div>`;

    const media = compact ? '' : `
      <div class="aspect-video bg-slate-100">
        ${link.previewImage ? `<img src="${link.previewImage}" alt="" class="w-full h-full object-cover" loading="lazy" />` : ''}
      </div>`;

    const body = `
      <div class="p-4 pt-0">
        <h3 class="text-lg font-semibold mb-1 break-words">${link.title || link.url}</h3>
        ${link.description ? `<p class="text-slate-600 text-sm mb-3">${link.description}</p>` : ''}
        <div class="flex items-center justify-between pt-3 border-t">
          <div class="text-sm text-slate-500">
            ${cat ? `<span class="px-2 py-1 rounded-lg" style="background:${cat.color}20;color:${cat.color}">${cat.name}</span>` : ''}
          </div>
          <a class="card-cta" href="${link.url}" target="_blank" rel="noopener">${svg('external','w-4 h-4')} Abrir</a>
        </div>
      </div>`;

    const el = document.createElement('article');
    el.className = `card rounded-2xl border overflow-hidden`;
    el.dataset.id = link.id;
    el.innerHTML = header + media + body;
    grid.appendChild(el);
  });
}

function safeHost(u='') {
  try { return new URL(u).host.replace(/^www\./,''); } catch { return ''; }
}
