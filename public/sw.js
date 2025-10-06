// public/sw.js
const CACHE = "stacklink-v5";
const SHELL = [
  "./",              // index.html
  "./index.html",
  "./manifest.json",
  "./styles.css",
  "./app.js"
  // NÃO adiciones ficheiros de /src aqui; o SW só vê o que está em /public
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // adiciona um por um; ignora falhas (evita addAll falhar por 404)
    await Promise.all(
      SHELL.map(async (url) => {
        try {
          const res = await fetch(url, { cache: "no-cache" });
          if (res.ok) await cache.put(url, res.clone());
        } catch (_) { /* ignora */ }
      })
    );
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Network-first com fallback para cache
self.addEventListener("fetch", (event) => {
  const req = event.request;
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone()).catch(()=>{});
      return res;
    } catch {
      const cached = await caches.match(req);
      return cached || (req.mode === "navigate" ? caches.match("./index.html") : Response.error());
    }
  })());
});
