/* sw.js — GENERADO por build/empaquetar_pwa.js. No editar a mano.
 *
 * 🔴 ESTE ARCHIVO NO GUARDA NI UN DATO CLÍNICO, Y ESO ES DELIBERADO.
 * Un service worker guarda cosas en el teléfono para que la app abra rápido.
 * Si guardara las RESPUESTAS del servidor, el censo de la UCI —con nombres y
 * diagnósticos— quedaría escrito en el aparato de cada uno, sobreviviría al
 * cierre de sesión y estaría ahí si el teléfono se pierde. El PRD deja
 * «guardar sin conexión» FUERA de alcance justamente por eso.
 * Acá solo se guarda el ARMAZÓN: la pantalla, el manifiesto y los iconos. Los
 * datos se piden siempre, y si no hay red la app lo dice.
 *
 * Dos filtros, y cualquiera de los dos basta:
 *   · solo GET  — las llamadas al servidor son POST;
 *   · solo del propio origen — el servidor vive en otro dominio.
 *
 * 🪤 El nombre del caché lleva el SELLO DE VERSIÓN. Con un nombre fijo, el
 * equipo se queda con la pantalla vieja para siempre y el síntoma es «pegué el
 * archivo y no cambió nada», que es el peor rato de depuración que hay porque
 * el código nuevo SÍ está.
 */
const CACHE = 'rce-armazon-NEXT-3.9-vuelve-al-reabrir';
const ARMAZON = ['.', 'index.html', 'manifest.webmanifest',
  'iconos/icono-192.png', 'iconos/icono-512.png', 'iconos/icono-apple-180.png'];

self.addEventListener('install', function (ev) {
  ev.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARMAZON); }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (ev) {
  // Se borra el armazón de las versiones anteriores: si no, cada versión deja
  // su copia ocupando el teléfono.
  ev.waitUntil(caches.keys().then(function (claves) {
    return Promise.all(claves.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (ev) {
  const req = ev.request;
  if (req.method !== 'GET') return;                               // los datos van por POST
  if (new URL(req.url).origin !== self.location.origin) return;   // el servidor vive en otro dominio

  // Red primero y caché de respaldo: así una versión nueva se ve al tiro y, sin
  // señal, la pantalla igual abre. Lo que abre es el ARMAZÓN; los datos los
  // pedirá y dirá que no hay conexión.
  ev.respondWith(
    fetch(req).then(function (r) {
      if (r && r.ok) { const copia = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copia); }); }
      return r;
    }).catch(function () { return caches.match(req); })
  );
});
