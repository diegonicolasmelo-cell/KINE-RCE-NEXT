// pwa_cache_aislado.js — 🧱 EL SERVICE WORKER SOLO TOCA LO SUYO
// (4-oct-2026).
//
// DE DÓNDE SALE. Al revisar el `sw.js` generado aparecieron dos defectos que
// `pwa_paquete.js` no veía, porque esa guardia lee el archivo con expresiones
// regulares: comprobaba que el service worker BORRARA cachés (`caches.keys()` y
// `caches.delete` aparecen en el texto), no QUÉ borraba ni QUÉ guardaba.
//
//   1. 🔴 En `activate` borraba TODOS los cachés del origen que no fueran el
//      suyo. Un sitio de GitHub Pages comparte origen con todos los demás
//      repositorios de la misma cuenta, así que `caches.keys()` ve los cachés
//      de las OTRAS aplicaciones del origen y las dejaba sin armazón. Debe
//      borrar solo los suyos: los de prefijo `rce-armazon-` que no sean el
//      vigente.
//   2. 🔴 En `fetch` guardaba cualquier GET del propio origen con respuesta ok.
//      El CLAUDE.md dice que el service worker cachea SOLO el armazón (la
//      pantalla, el manifiesto y los iconos): un JSON del mismo origen, o una
//      URL con parámetros (`?token=`), acabarían escritos en el aparato. Debe
//      poner en caché solo las direcciones de su lista ARMAZON, resueltas
//      contra el scope; todo lo demás pasa a la red sin guardarse.
//
// 🪤 Y UN TERCER PUNTO DEL MISMO TIPO: `caches.match()` busca en TODOS los
// cachés del origen, no solo en el suyo. Sin red, un armazón que el service
// worker no tiene se serviría desde la copia de otra aplicación. La lectura
// también va solo al caché propio.
//
// 🪤 «EMPIEZA CON» NO ES «CONTIENE» (revisión del 4-oct-2026). La guardia ya
// probaba el prefijo con un caché sin el guion (`rce-armazonado`), pero ese
// nombre no CONTIENE `rce-armazon-`, así que no distinguía un `indexOf(PREFIJO)
// === 0` de un `indexOf(PREFIJO) !== -1`: con la mutación «contiene» seguía
// verde (se corrió contra una copia del `sw.js`). Un caché ajeno cuyo nombre
// lleve el prefijo en medio (`x-rce-armazon-1`, `xrce-armazon-1`) lo mata: con
// «contiene» activate lo borraría.
//
// CÓMO PRUEBA. Ejecuta el `pwa/sw.js` publicado en un `vm` de Node, con `self`,
// `caches`, `clients` y `fetch` simulados, y le dispara los eventos
// `install`, `activate` y `fetch` como lo haría el navegador. Nada de reloj ni
// de red real: no depende de la hora ni de cuándo se corra.
//
// QUÉ EXIGE
//   1. `install` guarda el armazón completo bajo un caché de prefijo
//      `rce-armazon-`, con direcciones resueltas contra el scope.
//   2. `activate` deja vivo un caché ajeno (y los que solo se le parecen en el
//      nombre: sin el guion, o con el prefijo EN MEDIO), borra el armazón de
//      cualquier OTRA versión y conserva el vigente.
//   3. Un GET del armazón se sirve de la red y deja la copia nueva guardada.
//   4. Un GET que NO es del armazón no se guarda: un JSON del mismo origen, la
//      raíz del origen (otra aplicación), el armazón con parámetros.
//   5. Un POST y un GET de otro origen no se tocan.
//   6. Sin red, el armazón sale del caché propio; los datos no salen de ningún
//      caché; y el caché de otra aplicación no se lee.
//
// Uso: node build/checks/pwa_cache_aislado.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.resolve(__dirname, '..', '..');
const SW = path.join(RAIZ, 'pwa', 'sw.js');
const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined ? '' : ' — ' + detalle));
  if (!cond) fails.push(l);
};

// Todo inventado: un origen de pruebas y un scope con subcarpeta, como el de un
// sitio de proyecto en GitHub Pages. La subcarpeta importa: la raíz del origen
// pertenece a OTRA aplicación.
const ORIGEN = 'https://kine.example.org';
const SCOPE = ORIGEN + '/rce-next/';
const SERVIDOR = 'https://servidor-ajeno.example/exec';

/* ══ El mundo simulado ═════════════════════════════════════════════════════ */
const resp = (cuerpo, ok) => {
  const bien = ok !== false;
  return { ok: bien, status: bien ? 200 : 404, cuerpo: cuerpo, clone() { return resp(cuerpo, bien); } };
};
const urlDe = x => (typeof x === 'string' ? new URL(x, SCOPE).href : x.url);

// La red: responde lo que se le configure; `caida` simula no tener señal.
function crearRed() {
  const red = { caida: false, rutas: {}, llamadas: [] };
  red.fetch = function (x) {
    const url = urlDe(x);
    red.llamadas.push(url);
    if (red.caida) return Promise.reject(new TypeError('Failed to fetch'));
    return Promise.resolve(url in red.rutas ? resp(red.rutas[url]) : resp('no existe', false));
  };
  return red;
}

// CacheStorage mínimo: nombre -> (url -> respuesta). `match` global recorre todos
// los cachés, igual que el real, que es justo lo que hay que vigilar.
function crearAlmacen(red, iniciales) {
  const cachés = new Map();
  Object.keys(iniciales || {}).forEach(n => cachés.set(n, new Map(Object.entries(iniciales[n]))));
  const cacheDe = m => ({
    put(req, r) { m.set(urlDe(req), r); return Promise.resolve(); },
    match(req) { return Promise.resolve(m.get(urlDe(req))); },
    addAll(urls) {
      return Promise.all(urls.map(u => red.fetch(u).then(r => {
        if (!r.ok) throw new TypeError('addAll: ' + urlDe(u) + ' respondió mal');
        m.set(urlDe(u), r);
      })));
    },
  });
  return {
    nombres: () => Array.from(cachés.keys()),
    urls: n => (cachés.has(n) ? Array.from(cachés.get(n).keys()) : []),
    cuerpo: (n, u) => (cachés.has(n) && cachés.get(n).has(u) ? cachés.get(n).get(u).cuerpo : undefined),
    enAlgunCache: u => Array.from(cachés.values()).some(m => m.has(u)),
    api: {
      keys: () => Promise.resolve(Array.from(cachés.keys())),
      delete: n => Promise.resolve(cachés.delete(n)),
      has: n => Promise.resolve(cachés.has(n)),
      open: n => { if (!cachés.has(n)) cachés.set(n, new Map()); return Promise.resolve(cacheDe(cachés.get(n))); },
      match: req => {
        const u = urlDe(req);
        for (const m of cachés.values()) if (m.has(u)) return Promise.resolve(m.get(u));
        return Promise.resolve(undefined);
      },
    },
  };
}

// El service worker corriendo en su propio contexto, con `self` === global como
// en un worker de verdad.
function montar(fuente, iniciales) {
  const red = crearRed();
  const almacen = crearAlmacen(red, iniciales);
  const oyentes = {};
  const marcas = { claim: 0, skipWaiting: 0 };
  const sandbox = {
    URL: URL, console: console,
    caches: almacen.api,
    fetch: red.fetch,
    location: new URL(SCOPE + 'sw.js'),
    registration: { scope: SCOPE },
    clients: { claim() { marcas.claim++; return Promise.resolve(); } },
    skipWaiting() { marcas.skipWaiting++; return Promise.resolve(); },
    addEventListener(tipo, fn) { oyentes[tipo] = fn; },
  };
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fuente, sandbox, { filename: 'pwa/sw.js' });

  const vaciar = () => new Promise(r => setImmediate(r));
  // Dispara un evento y espera lo que el service worker encadene, tanto por
  // waitUntil como por respondWith; después deja correr lo que haya quedado
  // suelto (un `put` que nadie esperó).
  async function disparar(tipo, extra) {
    const pendientes = [];
    const ev = Object.assign({
      waitUntil(p) { pendientes.push(p); },
      respondWith(p) { ev.interceptado = true; ev.promesa = p; },
    }, extra);
    if (!oyentes[tipo]) throw new Error('el service worker no escucha «' + tipo + '»');
    oyentes[tipo](ev);
    await Promise.all(pendientes);
    if (ev.interceptado) {
      try { ev.resultado = await ev.promesa; } catch (e) { ev.error = e; }
    }
    await vaciar(); await vaciar(); await vaciar();
    return ev;
  }
  const pedir = (url, metodo) => disparar('fetch', { request: { url: url, method: metodo || 'GET' } });
  return { red, almacen, marcas, disparar, pedir };
}

(async () => {
  let fuente = '';
  try { fuente = fs.readFileSync(SW, 'utf8'); } catch (e) { si('existe pwa/sw.js', false, e.message); }
  if (fails.length) { console.log('\n❌ ' + fails.length + ' FALLOS'); process.exit(1); }

  // Lo que ya había en el teléfono antes de que llegara esta versión: un
  // armazón de una versión vieja de la app, y cachés que NO son de la app.
  const VIEJO = 'rce-armazon-OTRA-VERSION';
  const VIEJO_2 = 'rce-armazon-NEXT-5.3-anterior';   // otra versión anterior, con un nombre de verdad
  const VIEJO_PURO = 'rce-armazon-';                 // el prefijo y nada más: sigue siendo suyo
  const AJENO = 'censo-otra-app-v7';
  const PARECIDO = 'rce-armazonado';
  // 🔴 Contienen el prefijo pero NO empiezan con él: son de otra aplicación.
  const CONTIENE = 'x-rce-armazon-1';
  const PEGADO = 'xrce-armazon-1';
  const OTRO = 'workbox-precache-v2-' + ORIGEN;
  const DATO_AJENO = ORIGEN + '/otra-app/datos.json';
  const iniciales = {};
  iniciales[VIEJO] = { [SCOPE + 'index.html']: resp('pantalla vieja') };
  iniciales[AJENO] = { [DATO_AJENO]: resp('datos de otra aplicación') };
  iniciales[PARECIDO] = { [ORIGEN + '/x']: resp('casi el prefijo, pero no') };
  iniciales[VIEJO_2] = { [SCOPE + 'index.html']: resp('pantalla de una versión anterior') };
  iniciales[VIEJO_PURO] = { [SCOPE + 'index.html']: resp('caché con el prefijo y sin versión') };
  iniciales[CONTIENE] = { [ORIGEN + '/z']: resp('lleva el prefijo en medio: de otra aplicación') };
  iniciales[PEGADO] = { [ORIGEN + '/w']: resp('lleva el prefijo pegado a otra letra: de otra aplicación') };
  iniciales[OTRO] = { [ORIGEN + '/y']: resp('de otra herramienta') };

  const INDEX = SCOPE + 'index.html';
  const m = montar(fuente, iniciales);
  const armazonRed = ['', 'index.html', 'manifest.webmanifest', 'iconos/icono-192.png',
    'iconos/icono-512.png', 'iconos/icono-apple-180.png'];
  armazonRed.forEach(u => { m.red.rutas[new URL(u, SCOPE).href] = 'armazón de red · ' + (u || 'raíz'); });

  /* ── 1 · install ──────────────────────────────────────────────────────── */
  console.log('— install');
  const antes = m.almacen.nombres();
  const ins = await m.disparar('install');
  si('install no revienta', !ins.error);
  const nuevos = m.almacen.nombres().filter(n => antes.indexOf(n) === -1);
  si('install abre UN caché nuevo', nuevos.length === 1, JSON.stringify(nuevos));
  const VIGENTE = nuevos[0] || '';
  si('…y su nombre lleva el prefijo rce-armazon-', VIGENTE.indexOf('rce-armazon-') === 0, VIGENTE);
  const guardadas = m.almacen.urls(VIGENTE);
  const imprescindibles = ['', 'index.html', 'manifest.webmanifest', 'iconos/icono-192.png', 'iconos/icono-512.png']
    .map(u => new URL(u, SCOPE).href);
  si('…con la pantalla, el manifiesto y los iconos, resueltos contra el scope',
    imprescindibles.every(u => guardadas.indexOf(u) !== -1), JSON.stringify(guardadas));
  si('…y nada fuera del scope',
    guardadas.every(u => u.indexOf(SCOPE) === 0), JSON.stringify(guardadas.filter(u => u.indexOf(SCOPE) !== 0)));
  si('install sigue tomando el relevo (skipWaiting)', m.marcas.skipWaiting === 1, String(m.marcas.skipWaiting));

  /* ── 2 · activate ─────────────────────────────────────────────────────── */
  console.log('— activate');
  const act = await m.disparar('activate');
  si('activate no revienta', !act.error);
  const quedan = m.almacen.nombres();
  si('🔴 el caché de otra aplicación del mismo origen sobrevive a activate',
    quedan.indexOf(AJENO) !== -1,
    'activate borraba todo lo que no fuera suyo: dejaba sin armazón a las otras aplicaciones del origen');
  si('…y conserva lo que tenía adentro',
    m.almacen.cuerpo(AJENO, DATO_AJENO) === 'datos de otra aplicación');
  si('🔴 …un caché que solo se parece en el nombre (sin el guion) tampoco se toca',
    quedan.indexOf(PARECIDO) !== -1,
    'el prefijo es «rce-armazon-» completo');
  si('🔴 …ni el de otra herramienta (workbox)', quedan.indexOf(OTRO) !== -1);
  si('🔴 …ni uno que CONTIENE el prefijo sin empezar con él (x-rce-armazon-1)',
    quedan.indexOf(CONTIENE) !== -1 && m.almacen.cuerpo(CONTIENE, ORIGEN + '/z') !== undefined,
    '«empieza con» no es «contiene»: borrar por substring se lleva los cachés de otras aplicaciones');
  si('🔴 …ni uno con el prefijo pegado a otra letra (xrce-armazon-1)',
    quedan.indexOf(PEGADO) !== -1 && m.almacen.cuerpo(PEGADO, ORIGEN + '/w') !== undefined);
  si('el armazón de una versión anterior (rce-armazon-OTRA-VERSION) SÍ se borra',
    quedan.indexOf(VIEJO) === -1,
    'sin limpiar, cada versión deja su copia del armazón ocupando el teléfono');
  si('…y el de otra versión con nombre de verdad (rce-armazon-NEXT-5.3-anterior) también',
    quedan.indexOf(VIEJO_2) === -1);
  si('…y el que es solo el prefijo («rce-armazon-», sin versión) también: empieza con él y no es el vigente',
    quedan.indexOf(VIEJO_PURO) === -1);
  si('el caché vigente sigue en pie con su armazón',
    quedan.indexOf(VIGENTE) !== -1 && m.almacen.urls(VIGENTE).length === guardadas.length);
  si('activate sigue tomando el control de las pestañas (claim)', m.marcas.claim === 1, String(m.marcas.claim));

  /* ── 3 · fetch con red ────────────────────────────────────────────────── */
  console.log('— fetch con red');
  m.red.rutas[INDEX] = 'pantalla NUEVA';
  const nIdx = await m.pedir(INDEX);
  si('un GET del armazón se sirve de la red (red primero)',
    nIdx.interceptado && nIdx.resultado && nIdx.resultado.cuerpo === 'pantalla NUEVA',
    JSON.stringify(nIdx.resultado && nIdx.resultado.cuerpo));
  si('…y deja la copia nueva en el caché propio',
    m.almacen.cuerpo(VIGENTE, INDEX) === 'pantalla NUEVA', String(m.almacen.cuerpo(VIGENTE, INDEX)));

  // El caso que más importa: respuestas del servidor del propio sitio.
  const JSON_MISMO = SCOPE + 'datos/censo.json';
  m.red.rutas[JSON_MISMO] = '{"camas":[{"cama":1}]}';
  const nJson = await m.pedir(JSON_MISMO);
  si('🔴 un JSON del mismo origen NO se guarda en ningún caché',
    !m.almacen.enAlgunCache(JSON_MISMO),
    'cualquier GET del propio origen con respuesta ok acababa escrito en el teléfono');
  si('…y la petición igual se resuelve por la red',
    !nJson.interceptado || (nJson.resultado && nJson.resultado.cuerpo === '{"camas":[{"cama":1}]}'),
    JSON.stringify(nJson.resultado && nJson.resultado.cuerpo));

  const RAIZ_ORIGEN = ORIGEN + '/index.html';
  m.red.rutas[RAIZ_ORIGEN] = 'pantalla de otra aplicación';
  await m.pedir(RAIZ_ORIGEN);
  si('🔴 la raíz del origen (otra aplicación, fuera del scope) NO se guarda',
    !m.almacen.enAlgunCache(RAIZ_ORIGEN),
    'la lista ARMAZON se resuelve contra el scope, no contra el origen entero');

  const CON_PARAMETROS = SCOPE + 'index.html?token=abc';
  m.red.rutas[CON_PARAMETROS] = 'pantalla con parámetros';
  await m.pedir(CON_PARAMETROS);
  si('🔴 una dirección del armazón CON parámetros (?token=) NO se guarda',
    !m.almacen.enAlgunCache(CON_PARAMETROS),
    'lo que viaja en la dirección acabaría escrito en el aparato');

  const antesError = m.almacen.cuerpo(VIGENTE, SCOPE + 'manifest.webmanifest');
  delete m.red.rutas[SCOPE + 'manifest.webmanifest'];     // sin ruta, la red contesta 404
  await m.pedir(SCOPE + 'manifest.webmanifest');
  si('una respuesta con error (404) NO pisa el armazón ya guardado',
    m.almacen.cuerpo(VIGENTE, SCOPE + 'manifest.webmanifest') === antesError,
    String(m.almacen.cuerpo(VIGENTE, SCOPE + 'manifest.webmanifest')));

  /* ── 4 · lo que no se toca ────────────────────────────────────────────── */
  console.log('— lo que no se toca');
  const llamadasAntes = m.red.llamadas.length;
  const estadoAntes = JSON.stringify(m.almacen.nombres().map(n => [n, m.almacen.urls(n)]));
  const nPost = await m.pedir(INDEX, 'POST');
  si('un POST (la llamada al servidor) no se intercepta ni se guarda',
    !nPost.interceptado && m.red.llamadas.length === llamadasAntes);
  m.red.rutas[SERVIDOR] = '{"ok":true,"datos":"censo"}';
  const nAjeno = await m.pedir(SERVIDOR);
  si('un GET de otro origen no se intercepta ni se guarda',
    !nAjeno.interceptado && m.red.llamadas.length === llamadasAntes && !m.almacen.enAlgunCache(SERVIDOR));
  const MISMO_CAMINO_OTRO_ORIGEN = 'https://otro-origen.example/rce-next/index.html';
  m.red.rutas[MISMO_CAMINO_OTRO_ORIGEN] = 'pantalla de otro origen';
  const nOtro = await m.pedir(MISMO_CAMINO_OTRO_ORIGEN);
  si('…aunque la ruta sea idéntica a la del armazón',
    !nOtro.interceptado && !m.almacen.enAlgunCache(MISMO_CAMINO_OTRO_ORIGEN));
  // El estado de los cachés es el mismo que tras el paso 3 (solo cambió lo del
  // armazón al refrescarse): lo único que importa es que estos tres no agregaron nada.
  si('…y los tres no dejaron NADA nuevo en ningún caché',
    JSON.stringify(m.almacen.nombres().map(n => [n, m.almacen.urls(n)])) === estadoAntes);

  /* ── 5 · fetch sin red ────────────────────────────────────────────────── */
  console.log('— fetch sin red');
  m.red.caida = true;
  const sinRedIdx = await m.pedir(INDEX);
  si('sin red, el armazón sale del caché propio',
    sinRedIdx.interceptado && sinRedIdx.resultado && sinRedIdx.resultado.cuerpo === 'pantalla NUEVA',
    JSON.stringify(sinRedIdx.resultado && sinRedIdx.resultado.cuerpo));
  const sinRedJson = await m.pedir(JSON_MISMO);
  si('🔴 sin red, los datos del mismo origen NO salen de ningún caché',
    !sinRedJson.interceptado || !sinRedJson.resultado,
    'la app tiene que decir «sin conexión», no mostrar el censo de la última vez');

  /* ── 6 · el caché de otra aplicación no se lee ────────────────────────── */
  console.log('— lectura aislada');
  const ini2 = {};
  ini2[AJENO] = { [INDEX]: resp('pantalla de OTRA aplicación guardada en su caché') };
  const m2 = montar(fuente, ini2);                         // sin install: este caché propio está vacío
  m2.red.caida = true;
  const nAj = await m2.pedir(INDEX);
  si('🔴 sin red y sin armazón propio, NO sirve la copia que guardó otra aplicación',
    !nAj.interceptado || !nAj.resultado || nAj.resultado.cuerpo !== 'pantalla de OTRA aplicación guardada en su caché',
    '`caches.match()` busca en todos los cachés del origen: la lectura debe ir solo al propio');

  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLOS' : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('❌ la guardia reventó: ' + (e && e.stack || e)); process.exit(1); });
