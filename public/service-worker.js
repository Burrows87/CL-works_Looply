const CACHE_NAME = "looply-cache-v1";
const urlsToCache = ["./index.html","./manifest.json"];

self.addEventListener("install", e => e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(urlsToCache))));
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => e.respondWith(caches.match(e.request).then(r=>r || fetch(e.request))));

self.addEventListener("message", event => {
  if(event.data && event.data.type==="MATCH_FOUND"){
    self.registration.showNotification("Looply",{
      body:event.data.text,
      icon:"./icon.png",
      badge:"./icon.png"
    });
  }
});
