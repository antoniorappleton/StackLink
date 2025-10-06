// src/js/icons.js
export function svg(name, cls = "w-5 h-5") {
  const base = {
    globe: `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke-width="1.5"/><path d="M2 12h20M12 2c3.5 3.5 3.5 16.5 0 20  M12 2C8.5 5.5 8.5 18.5 12 22" stroke-width="1.5"/></svg>`,
    star:  `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m12 17.3-5.6 3 1.1-6.4L3 9.8l6.4-0.9L12 3l2.6 5.9 6.4 0.9-4.5 4.1 1.1 6.4-5.6-3z" stroke-width="1.5"/></svg>`,
    starFill:`<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="currentColor"><path d="m12 17.3-5.6 3 1.1-6.4L3 9.8l6.4-0.9L12 3l2.6 5.9 6.4 0.9-4.5 4.1 1.1 6.4-5.6-3z"/></svg>`,
    external:`<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 3h7v7M10 14 21 3M21 14v7h-7" stroke-width="1.5"/></svg>`,
    trash: `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" stroke-width="1.5"/></svg>`,
    search:`<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" stroke-width="1.5"/><path d="m20 20-3.5-3.5" stroke-width="1.5"/></svg>`,
    // ícones de categoria
    code:  `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m8 9-4 3 4 3M16 9l4 3-4 3M13 7l-2 10" stroke-width="1.5"/></svg>`,
    news:  `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="14" height="16" rx="2" stroke-width="1.5"/><path d="M7 8h6M7 12h6M19 7v10a3 3 0 0 1-3 3H7" stroke-width="1.5"/></svg>`,
    book:  `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 5a2 2 0 0 1 2-2h11v16H6a2 2 0 0 0-2 2zM17 3v16" stroke-width="1.5"/></svg>`,
    tv:    `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="6" width="18" height="11" rx="2" stroke-width="1.5"/><path d="M8 3l4 3 4-3" stroke-width="1.5"/></svg>`,
    chart: `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19V5M20 19H4M7 15v-4M12 19V7M17 19v-7" stroke-width="1.5"/></svg>`
  };
  return base[name] || base.globe;
}
