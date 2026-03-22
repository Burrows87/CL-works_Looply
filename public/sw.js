const CACHE_NAME = 'looply-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icon.png'
];

// Installa il Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Attiva e pulisce vecchia cache
self.addEventListener('activate', (event) => {
  console.log('Service Worker attivato!');
});

// Gestisce le richieste (indispensabile per l'installazione)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
