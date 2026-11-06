const CACHE_NAME = "diligent-law-v2";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon.svg",
  "./css/styles.css",
  "./css/print-legal.css",
  "./js/app.js",
  "./js/storage.js",
  "./js/sync.js",
  "./js/data/templates-pleadings.js",
  "./js/data/templates-deeds.js",
  "./js/data/state-rules.js",
  "./js/data/legal-maxims.js",
  "./js/data/criminal-codes-2024.js",
  "./js/engines/pdf-generator.js",
  "./js/engines/number-to-words.js",
  "./js/engines/court-suggester.js",
  "./js/engines/validator.js",
  "./js/engines/docx-exporter.js",
  "./js/engines/statutory-calculators.js",
  "./js/engines/upi-qr.js",
  "./js/engines/case-diary.js",
  "./js/engines/efiling-index.js",
  "./js/engines/voice-dictation.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        if (event.request.headers.get("accept")?.includes("text/html")) {
          return caches.match("./index.html");
        }
      });
    })
  );
});

