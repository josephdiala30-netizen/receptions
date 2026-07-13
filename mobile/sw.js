var CACHE = 'kalyx-mobile-v1';

var urlsToCache = [
  '/mobile/',
  '/mobile/index.html',
  '/mobile/executive-it.html',
  '/mobile/executive-task.html',
  '/mobile/executive-path.html',
  '/mobile/admin.html',
  '/mobile/styles/mobile.css',
  '/mobile/js/mobile.js',
  '/mobile/manifest.json',
  '/firebase-config.js',
  '/firebase-data.js',
  '/shared.js',
  '/styles/custom.css'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      var fetchPromise = fetch(event.request).then(function(response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE).then(function(cache) { cache.put(event.request, clone); });
        }
        return response;
      }).catch(function() {
        return cached;
      });
      return cached || fetchPromise;
    })
  );
});
