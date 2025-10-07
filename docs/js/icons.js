// /docs/js/icons.js
export function svg(name, cls = "w-4 h-4") {
  const I = {
    search: `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" stroke-width="1.5"/><path d="m20 20-3.5-3.5" stroke-width="1.5"/></svg>`,
    cats: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h10M7 17h6"/></svg>`,
    globe: `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" stroke-width="1.5"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" stroke-width="1.5"/></svg>`,
    external: `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 3h7v7M21 3l-9 9" stroke-width="1.5"/><path d="M5 12v7h7" stroke-width="1.5"/></svg>`,
    trash: `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke-width="1.5"/></svg>`,
    star: `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m12 17.3-5.6 3 1.1-6.4L3 9.8l6.4-.9L12 3l2.6 5.9 6.4.9-4.5 4.1 1.1 6.4-5.6-3z" stroke-width="1.5"/></svg>`,
    starFill: `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.3 6.4 20.3 7.5 13.9 3 9.8l6.4-.9L12 3l2.6 5.9 6.4.9-4.5 4.1 1.1 6.4z"/></svg>`,
    code: `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 16 4 12l4-4M16 8l4 4-4 4" stroke-width="1.5"/></svg>`,
    news: `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="14" height="16" rx="2" stroke-width="1.5"/><path d="M7 8h6M7 12h6M7 16h6" stroke-width="1.5"/><path d="M17 8h4v12a2 2 0 0 1-2 2H7" stroke-width="1.5"/></svg>`,
    fav: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17.5 6.9 20a1 1 0 0 1-1.45-1.05l1-5.8-4.2-4.1A1 1 0 0 1 2.8 7l5.9-.85L11.3.9a1 1 0 0 1 1.8 0l2.6 5.25 5.9.85a1 1 0 0 1 .56 1.7l-4.2 4.1 1 5.8A1 1 0 0 1 18.1 20Z"/></svg>`,
    book: `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 5h12a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2z" stroke-width="1.5"/><path d="M8 5v14" stroke-width="1.5"/></svg>`,
    tv: `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="6" width="18" height="12" rx="2" stroke-width="1.5"/><path d="M8 6 12 3l4 3" stroke-width="1.5"/></svg>`,
    chart: `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19V5M8 19v-6M12 19V9M16 19V7M20 19V11" stroke-width="1.5"/></svg>`,
    home: `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 10.5 12 3l9 7.5v9.5H3zM9 21v-6h6v6" stroke-width="1.5"/></svg>`,
    folder: `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7h6l2 2h10v10H3z" stroke-width="1.5"/></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3" stroke-width="1.5"/><path d="M19.4 15a7.8 7.8 0 0 0 .1-6M4.5 9a7.8 7.8 0 0 0 0 6M9 4.6a7.8 7.8 0 0 0 6 0M15 19.4a7.8 7.8 0 0 0-6 0" stroke-width="1.5"/></svg>`,
  };
  return I[name] || "";
}
export function renderFooterIcons() {
  const map = {
    "ico-home": "home",
    "ico-cats": "cats",
    "ico-fav": "fav",
    "ico-settings": "settings",
  };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = FOOTER_ICONS[key];
  });
}