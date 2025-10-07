// Service Worker — cache control para Pages
const VERSION = 'v11';
const CACHE = `stacklink-${VERSION}`;
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./js/main.js",
  "./manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const c = await caches.open(CACHE);
      await Promise.all(
        SHELL.map(async (u) => {
          try {
            const r = await fetch(u, { cache: "no-cache" });
            if (r.ok) await c.put(u, r.clone());
          } catch (_) {}
        })
      );
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET") return;

  // não cachear firebase/gstatic/googleapis nem /js fora do docs root
  if (url.origin !== location.origin) return;
  if (url.pathname.includes("/src/")) return;

  // HTML -> network-first
  if (
    req.mode === "navigate" ||
    req.headers.get("accept")?.includes("text/html")
  ) {
    e.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          (await caches.open(CACHE))
            .put("./index.html", fresh.clone())
            .catch(() => {});
          return fresh;
        } catch {
          return (await caches.match("./index.html")) || Response.error();
        }
      })()
    );
    return;
  }

  // assets same-origin -> cache-first
  e.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) {
        fetch(req)
          .then((r) => {
            if (r.ok) caches.open(CACHE).then((c) => c.put(req, r));
          })
          .catch(() => {});
        return cached;
      }
      try {
        const fresh = await fetch(req);
        if (fresh.ok) (await caches.open(CACHE)).put(req, fresh.clone());
        return fresh;
      } catch {
        return Response.error();
      }
    })()
  );
});
