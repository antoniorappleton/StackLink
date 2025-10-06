// public/sw.js
const VERSION = 'v7';                    // ⬅️ sobe 1 sempre que mudares front-end
const CACHE = `stacklink-${VERSION}`;
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
];

// instala: pré-cache shell (ignora falhas individuais)
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(SHELL.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (res.ok) await cache.put(url, res.clone());
      } catch(_) {}
    }));
  })());
  self.skipWaiting(); // pronto para ativar já
});

// ativa: apaga caches antigos e assume controlo
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// receber ordem para “saltar espera”
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Estrategias:
// - HTML -> network-first (para apanhar novas versões)
// - assets same-origin (css/js/img) -> cache-first com atualização em background
// - requests externos/Firestore -> passar direto (não cachear)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ignora métodos não-GET
  if (req.method !== 'GET') return;

  // Não cachear chamadas externas (firebase, gstatic, googleapis) ou /src/
  if (url.origin !== location.origin || url.pathname.startsWith('/src/')) return;

  // HTML: network first
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone()).catch(()=>{});
        return fresh;
      } catch {
        const cached = await caches.match('./index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  // Assets same-origin: cache first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) {
      // atualiza em background
      fetch(req).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(req, res));
      }).catch(()=>{});
      return cached;
    }
    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE);
      if (fresh.ok) cache.put(req, fresh.clone());
      return fresh;
    } catch {
      return Response.error();
    }
  })());
});
