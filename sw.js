const CACHE_NAME = "aroundwise-v4";
const ASSETS_TO_CACHE = [
  "./",
  "./css/style.css",
  "./js/app.js",
  "./js/icons.js",
  "./js/ui.js",
  "./js/db.js",
  "./js/firebase-init.js",
  "./js/firebase-config.js",
  "./js/auth.js",
  "./js/settings.js",
  "./js/preview.js",
  "./js/share.js",
  "./js/importExport.js",
  "./js/utils.js",
  "./manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-512-maskable.png",
  "./assets/apple-touch-icon.png",
  "./assets/favicon.svg",
  "./assets/favicon-32.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting(); // Force activation
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)),
  );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Take control of all clients immediately
});

self.addEventListener("fetch", (event) => {
  // Never intercept the Firestore/Auth/preview network calls or the
  // public share route - only cache same-origin static assets.
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches
      .match(event.request)
      .then((response) => response || fetch(event.request)),
  );
});
