const CACHE_NAME = "stacklink-v1";
const RUNTIME = "runtime";

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/styles.css",
  "/app.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME && k !== RUNTIME)
            .map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

// SWR para navegação/app shell
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache de imagens/ícones (Cache-First)
  if (request.destination === "image" || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        cache.put(request, response.clone());
        return response;
      })()
    );
    return;
  }

  // Stale-While-Revalidate para o resto
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((res) => {
          cache.put(request, res.clone());
          return res;
        })
        .catch(() => cached || caches.match("/index.html"));
      return cached || networkFetch;
    })()
  );
});
