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

export function renderLinks(list, categories, compact=false){
  const grid = document.getElementById('grid'); grid.innerHTML='';
  if (!list.length){ grid.innerHTML = `<div class="text-slate-500 p-10">Sem links ainda. Usa “+ Adicionar Link”.</div>`; return; }

  list.forEach(link=>{
    const cat = categories.find(c => link.categoryIds?.includes(c.id));
    const host = (()=>{ try{ return new URL(link.url).host.replace(/^www\./,''); }catch{return ''} })();
    const fav = !!link.isFavorite;

    const header = `
      <div class="card-header">
        <div class="flex items-center gap-2 text-slate-500">
          <span class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200">${svg('globe','w-3.5 h-3.5')}</span>
          <span class="text-sm">${host || '—'}</span>
        </div>
        <div class="flex items-center gap-1">
          <button class="icon-btn fav ${fav?'active':''}" data-action="fav" title="Favorito">${fav?svg('starFill'):svg('star')}</button>
          <a class="icon-btn" href="${link.url}" target="_blank" rel="noopener" title="Abrir">${svg('external')}</a>
          <button class="icon-btn danger" data-action="del" title="Apagar">${svg('trash')}</button>
        </div>
      </div>`;

    const media = compact ? '' : `
      <div class="card-media">
        ${link.previewImage ? `<img src="${link.previewImage}" alt="" class="w-full h-full object-cover" loading="lazy">` : ''}
      </div>`;

    const body = `
      <div class="card-body">
        <div class="card-title">${link.title || link.url}</div>
        ${link.description ? `<p class="card-sub">${link.description}</p>` : ''}
        <div class="card-foot">
          <div class="text-sm">
            ${cat ? `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200">${svg(guessIcon(cat.name),'w-3.5 h-3.5')}<span>${cat.name}</span></span>` : ''}
          </div>
          <a class="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:underline" href="${link.url}" target="_blank" rel="noopener">
            ${svg('external','w-4 h-4')} Abrir
          </a>
        </div>
      </div>`;

    const el = document.createElement('article');
    el.className = `card`;
    el.dataset.id = link.id;
    el.innerHTML = header + media + body;
    grid.appendChild(el);
  });
}


export function openModal(){ const m=document.getElementById('modal-add'); if(!m) return; m.classList.remove('hidden'); m.classList.add('flex'); }
export function closeModal(){ const m=document.getElementById('modal-add'); if(!m) return; m.classList.add('hidden'); m.classList.remove('flex'); }
