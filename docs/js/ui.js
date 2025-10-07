import { svg } from './icons.js';

export function renderFooterIcons(){
  const put = (id, name)=> {
    const el = document.getElementById(id);
    if (el) el.innerHTML = svg(name, 'w-5 h-5');
  };
  put('ico-home','home');
  put('ico-cats','folder');
  put('ico-fav','star');
  put('ico-settings','settings');
}



export function injectSearchIcon(){
  const wrap = document.querySelector('.input-icon');
  if (!wrap || wrap.querySelector('svg')) return;
  wrap.insertAdjacentHTML('afterbegin', svg('search','w-5 h-5'));
}

export function renderCategoryPills(categories, links, activeId=''){
  const el = document.getElementById('cat-pills');
  if (!el) return;

  const counts = {};
  links.forEach(l => (l.categoryIds || []).forEach(id => counts[id]=(counts[id]||0)+1));

  const pill = (id, label, icon, active, count)=>`
    <button class="pill ${active?'active':''}" data-id="${id}">
      ${svg(icon,'w-4 h-4')}
      <span>${label}</span>
      <span class="count">${count}</span>
    </button>`;

  let html = pill('', 'Todas', 'globe', activeId==='', links.length);
  categories.forEach(c => {
    const name = c.name || 'Categoria';
    const count = counts[c.id] || 0;
    const icon = guessIcon(name);
    html += pill(c.id, name, icon, activeId===c.id, count);
  });
  el.innerHTML = html;
}

function guessIcon(n=''){ n=n.toLowerCase();
  if (n.includes('tec')||n.includes('dev')||n.includes('code')) return 'code';
  if (n.includes('not')||n.includes('news')) return 'news';
  if (n.includes('estu')||n.includes('leit')||n.includes('book')) return 'book';
  if (n.includes('entre')||n.includes('tv')) return 'tv';
  if (n.includes('fin')||n.includes('invest')) return 'chart';
  return 'globe';
}

export function populateCategoriesSelect(categories){
  const sel = document.getElementById('add-category'); if(!sel) return;
  sel.innerHTML = '<option value="">Sem categoria</option>';
  categories.forEach(c => {
    const o = document.createElement('option');
    o.value = c.id; o.textContent = c.name;
    sel.appendChild(o);
  });
}

// docs/js/ui.js 
export function renderLinks(list = [], categories = [], compact = false) {
  const grid = document.getElementById("grid");
  if (!grid) return;

  // aplica/remover modo compacto
  grid.classList.toggle("compact", !!compact);

    grid.classList.toggle("compact", !!compact);

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const esc = (s = "") =>
    String(s).replace(
      /[&<>"]/g,
      (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m])
    );

  let html = "";
  for (const link of list) {
    const title = esc(link.title || link.url || "");
    const desc = esc(link.description || "");
    const host = (() => {
      try {
        return new URL(link.url).hostname;
      } catch {
        return "";
      }
    })();

    const catId =
      (link.categoryIds && link.categoryIds[0]) || link.categoryId || null;
    const cat = catId ? catMap.get(catId) : null;
    const catBadge = cat ? `<span class="tag">${esc(cat.name)}</span>` : "";

    const coverStyle = link.previewImage
      ? `style="background-image:url('${esc(link.previewImage)}');"`
      : "";

    html += `
    <article class="link-card relative" data-id="${link.id}">
      <div class="card-cover" ${coverStyle}></div>

      <div class="card-actions">
        <button data-action="fav" title="Favorito">★</button>
        <button data-action="del" title="Apagar">🗑</button>
      </div>

      <div class="card-body">
        <div class="card-meta">${esc(host)}</div>
        <h3 class="card-title">${title}</h3>
        ${desc ? `<p class="card-desc">${desc}</p>` : ""}

        <div class="card-meta" style="justify-content:space-between; margin-top:6px;">
          <div class="flex items-center gap-6">
            ${catBadge}
          </div>
          <a href="${esc(
            link.url
          )}" target="_blank" rel="noopener" class="open-btn">Abrir</a>
        </div>
      </div>
    </article>`;
  }

  grid.innerHTML =
    html || `<div class="empty">Sem links ainda. Usa “+ Link”.</div>`;
}



export function openModal(){ const m=document.getElementById('modal-add'); if(!m) return; m.classList.remove('hidden'); m.classList.add('flex'); }
export function closeModal(){ const m=document.getElementById('modal-add'); if(!m) return; m.classList.add('hidden'); m.classList.remove('flex'); }
