/**
 * empaquetar_pwa.js — Genera la carpeta que se publica como aplicación
 * instalable: la pantalla, el manifiesto, el service worker y los iconos.
 *
 * ── QUÉ ES Y QUÉ NO ───────────────────────────────────────────────────────
 * Es la mitad «pantalla» de lo que pide el PRD de la PWA. Los DATOS siguen
 * viniendo de Apps Script, que ahora contesta por HTTP (`v2/api_web.gs`). La
 * base de datos no se mueve: sigue siendo la misma planilla.
 *
 * ── SE GENERA, NO SE EDITA ────────────────────────────────────────────────
 * La pantalla es la MISMA de `v2/index.html`: dos copias serían dos verdades.
 * Acá solo se le agrega lo que un teléfono necesita y que dentro del iframe de
 * Apps Script no sirve de nada. La guardia `pwa_paquete.js` compara byte a
 * byte y se pone roja si alguien edita la carpeta a mano o si cambia el fuente
 * y olvida regenerar.
 *
 * 🪤 AQUÍ EL INDEX NO VIAJA COMO COHETE. El cohete existe porque el lector de
 * HTML de Google tumbaba el arranque; fuera de Apps Script ese lector no está,
 * y empaquetar en base64 solo haría la carga más lenta y la depuración peor.
 *
 * 🔒 La dirección del `/exec` NO se escribe acá. Cada aparato la configura la
 * primera vez y queda en su localStorage: el sitio publicado es público y la
 * dirección no tiene por qué estarlo.
 *
 * Uso: node build/empaquetar_pwa.js [carpeta_salida]
 */
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const V2 = path.join(RAIZ, 'v2');
const SALIDA = process.argv[2] || path.join(RAIZ, 'pwa');

// El sello sale del empaquetador del cohete, que es su única fuente en todo el
// proyecto. Aquí se usa para nombrar el caché del service worker.
const VERSION = (/const VERSION = '([^']+)'/.exec(
  fs.readFileSync(path.join(__dirname, 'empaquetar_cohete.js'), 'utf8')) || [])[1];
if (!VERSION) { console.error('No se pudo leer VERSION de build/empaquetar_cohete.js'); process.exit(1); }

const AZUL = '#04345E';
const FONDO = '#EEF3F9';

/* ── 1 · La pantalla ──────────────────────────────────────────────────── */
let idx = fs.readFileSync(path.join(V2, 'index.html'), 'utf8')
  .replace(/<\?=[\s\S]*?\?>/g, '');          // los scriptlets de plantilla de Apps Script

const CABEZA = [
  '<link rel="manifest" href="manifest.webmanifest">',
  '<meta name="theme-color" content="' + AZUL + '">',
  '<link rel="apple-touch-icon" href="iconos/icono-apple-180.png">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<meta name="apple-mobile-web-app-title" content="RCE KINE">',
].join('\n');

if (!/<head>/i.test(idx)) { console.error('El index no tiene <head>: no se puede empaquetar.'); process.exit(1); }
idx = idx.replace(/<head>/i, '<head>\n' + CABEZA);

// El registro del service worker va SOLO acá: dentro del iframe de Apps Script
// no hay service worker posible y el intento ensuciaría la consola.
const REGISTRO = [
  '<script>',
  '/* Registro del service worker. Solo existe en la copia publicada: dentro',
  '   del iframe de Apps Script no hay service worker posible. */',
  'if ("serviceWorker" in navigator) {',
  '  window.addEventListener("load", function () {',
  '    navigator.serviceWorker.register("sw.js").catch(function (e) {',
  '      console.warn("No se pudo registrar el service worker:", e && e.message);',
  '    });',
  '  });',
  '}',
  '</' + 'script>',
].join('\n');
idx = idx.replace(/<\/body>/i, REGISTRO + '\n</body>');

/* ── 2 · El manifiesto ────────────────────────────────────────────────── */
const manifiesto = {
  name: 'RCE KINE · UCI',
  short_name: 'RCE KINE',
  description: 'Registro Clínico Electrónico de Kinesiología UCI',
  start_url: '.',
  scope: '.',
  display: 'standalone',
  orientation: 'any',
  lang: 'es-CL',
  dir: 'ltr',
  theme_color: AZUL,
  background_color: FONDO,
  icons: [
    { src: 'iconos/icono-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'iconos/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'iconos/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

/* ── 3 · El service worker ────────────────────────────────────────────── */
const sw = `/* sw.js — GENERADO por build/empaquetar_pwa.js. No editar a mano.
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
const CACHE = 'rce-armazon-${VERSION}';
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
`;

/* ── 4 · Escribir ─────────────────────────────────────────────────────── */
// 🪤 No se borra la carpeta entera: se llevaría el LEEME.md escrito a mano.
// Pasó con `entrega/`, que estuvo sin su LEEME desde el 15-sep sin que nadie
// lo notara. Se borra solo lo que este script genera.
const _GENERA = ['index.html', 'manifest.webmanifest', 'sw.js', '.nojekyll',
  'iconos/icono-192.png', 'iconos/icono-512.png', 'iconos/icono-apple-180.png'];
fs.mkdirSync(path.join(SALIDA, 'iconos'), { recursive: true });
for (const f of _GENERA) { try { fs.rmSync(path.join(SALIDA, f), { force: true }); } catch (e) {} }
fs.writeFileSync(path.join(SALIDA, 'index.html'), idx);
fs.writeFileSync(path.join(SALIDA, 'manifest.webmanifest'), JSON.stringify(manifiesto, null, 2) + '\n');
fs.writeFileSync(path.join(SALIDA, 'sw.js'), sw);
for (const ico of ['icono-192.png', 'icono-512.png', 'icono-apple-180.png']) {
  fs.copyFileSync(path.join(__dirname, 'iconos_pwa', ico), path.join(SALIDA, 'iconos', ico));
}
// GitHub Pages ignora las carpetas que empiezan con guion bajo si no está esto.
fs.writeFileSync(path.join(SALIDA, '.nojekyll'), '');

const kb = f => (fs.statSync(path.join(SALIDA, f)).size / 1024).toFixed(1) + ' KB';
console.log('\n✅ Paquete instalable en ' + SALIDA + '  ·  sello ' + VERSION);
['index.html', 'manifest.webmanifest', 'sw.js'].forEach(f => console.log('   · ' + f.padEnd(22) + kb(f)));
console.log('   · iconos/               3 archivos');
console.log('\n🔒 La dirección del /exec NO va acá: cada aparato la configura la primera vez.');
