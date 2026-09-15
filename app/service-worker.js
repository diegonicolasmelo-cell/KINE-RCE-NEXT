const CACHE_NAME = 'rce-kine-next-shell-v4';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon.svg',
  './src/main.js',
  './src/controllers/bed-board-controller.js',
  './src/services/bed-board-service.js',
  './src/model/bed.js',
  './src/repositories/synthetic-bed-repository.js',
  './src/views/bed-board-view.js'
  ,'./src/controllers/clinical-controller.js'
  ,'./src/repositories/clinical-repository.js'
  ,'./src/model/clinical-record.js'
  ,'./src/views/clinical-view.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('rce-kine-next-shell-') && key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});

self.addEventListener('fetch', event => {
  const allowed = new Set(SHELL.map(path => new URL(path, self.registration.scope).href));
  if (event.request.method !== 'GET' || !allowed.has(event.request.url)) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
