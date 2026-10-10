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
 * Tres filtros, y cualquiera de los tres basta:
 *   · solo GET  — las llamadas al servidor son POST;
 *   · solo del propio origen — el servidor vive en otro dominio;
 *   · solo las direcciones de la lista ARMAZON, resueltas contra el scope — un
 *     JSON del mismo sitio, o una dirección con parámetros, pasa a la red y
 *     NO se guarda. «Mismo origen» no quiere decir «armazón»: un sitio de
 *     GitHub Pages comparte origen con los demás repositorios de la cuenta.
 *
 * 🪤 EL CACHÉ ES DEL ORIGEN, NO DE ESTA APLICACIÓN. Otras aplicaciones del
 * mismo origen guardan los suyos al lado. Este archivo solo borra los suyos
 * (prefijo «rce-armazon-» y distintos del vigente) y solo lee del suyo:
 * borrar «todo lo que no sea mío» o buscar con caches.match() global le
 * quitaba el armazón a las demás o servía copias que no son de acá.
 *
 * 🪤 El nombre del caché lleva el SELLO DE VERSIÓN. Con un nombre fijo, el
 * equipo se queda con la pantalla vieja para siempre y el síntoma es «pegué el
 * archivo y no cambió nada», que es el peor rato de depuración que hay porque
 * el código nuevo SÍ está.
 */
const PREFIJO = 'rce-armazon-';
const CACHE = PREFIJO + 'NEXT-5.6-guardado-seguro';
const ARMAZON = ['.', 'index.html', 'manifest.webmanifest',
  'iconos/icono-192.png', 'iconos/icono-512.png', 'iconos/icono-apple-180.png'];
// La misma lista, ya resuelta contra el scope: es contra ESTAS direcciones, y no
// contra el origen entero, que se decide qué entra al caché.
const ARMAZON_URL = ARMAZON.map(function (u) { return new URL(u, self.registration.scope).href; });

self.addEventListener('install', function (ev) {
  ev.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARMAZON_URL); }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (ev) {
  // Se borra el armazón de las versiones anteriores: si no, cada versión deja
  // su copia ocupando el teléfono. SOLO los de este service worker (prefijo
  // «rce-armazon-» y distintos del vigente): los cachés de otras aplicaciones
  // del mismo origen no son míos y no se tocan.
  ev.waitUntil(caches.keys().then(function (claves) {
    return Promise.all(claves.map(function (k) {
      return (k.indexOf(PREFIJO) === 0 && k !== CACHE) ? caches.delete(k) : null;
    }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (ev) {
  const req = ev.request;
  if (req.method !== 'GET') return;                               // los datos van por POST
  if (new URL(req.url).origin !== self.location.origin) return;   // el servidor vive en otro dominio
  if (ARMAZON_URL.indexOf(req.url) === -1) return;                // lo que no es armazón va a la red y no se guarda

  // Red primero y caché de respaldo: así una versión nueva se ve al tiro y, sin
  // señal, la pantalla igual abre. Lo que abre es el ARMAZÓN; los datos los
  // pedirá y dirá que no hay conexión. El respaldo se busca SOLO en el caché
  // propio: caches.match() recorre los de todo el origen.
  ev.respondWith(
    fetch(req).then(function (r) {
      if (r && r.ok) { const copia = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copia); }); }
      return r;
    }).catch(function () { return caches.open(CACHE).then(function (c) { return c.match(req); }); })
  );
});
