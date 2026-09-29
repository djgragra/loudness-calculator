/* Loudness Target Calculator — service worker: caches the app shell so the
   calculator keeps working offline.
   © 2026 Graziano Melzi · OnAir Garage — MIT License

   Bump CACHE_VERSION whenever any file below changes; old caches are
   dropped on activate. */
const CACHE_VERSION = "v1.0.0";
const CACHE_NAME = "loudnesscalculator-" + CACHE_VERSION;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./style.css",
  "./fonts.css",
  "./calc.js",
  "./standards.js",
  "./i18n.js",
  "./app.js",
  "./analyzer.js",
  "./analyzer-worker.js",
  "./measure.js",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./fonts/share-tech-mono-400-latin.woff2",
  "./fonts/barlow-condensed-400-latin.woff2",
  "./fonts/barlow-condensed-600-latin.woff2",
  "./fonts/barlow-condensed-700-latin.woff2"
];

self.addEventListener("install", (event) => {
  // No skipWaiting() here: on an update the new worker waits until the page
  // asks for it (banner "new version ready"). On a first install this has no effect.
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// Cache-first: instant offline loads.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
