// puerta_http.js — 🔌 LA APP INSTALADA PUEDE HABLAR CON EL SERVIDOR
// (16-sep-2026).
//
// DE DÓNDE SALE. Hoy la pantalla y los datos viajan por el MISMO tubo:
// `google.script.run`, que solo existe dentro del iframe de Apps Script. Por
// eso la app no se puede servir desde otro sitio: abriría y se quedaría sin
// servidor. El PRD de la PWA pide justamente separarlos —«la pantalla se sirve
// desde un sitio propio y Apps Script solo contesta datos»— y esto es esa
// puerta.
//
// 🪤 LA TRAMPA QUE DEFINE LA FORMA DE LA PUERTA. Un navegador, antes de mandar
// un POST desde otro dominio con `Content-Type: application/json`, pregunta
// primero con una petición OPTIONS. **Apps Script no contesta OPTIONS**, así
// que esa llamada muere sin llegar nunca al código. La salida conocida es
// mandar el cuerpo como `text/plain`, que el navegador considera una petición
// simple y despacha directo. Por eso `doPost` lee `e.postData.contents` y lo
// interpreta él mismo: no es descuido, es la única forma que llega.
//
// QUÉ EXIGE
//   1. Que exista `doPost` y devuelva JSON.
//   2. Que NO duplique el dispatcher: la puerta llama al MISMO `api()`, así
//      una acción nueva sirve en los dos caminos sin tocar nada.
//   3. Que herede el candado: con el acceso del turno puesto, una llamada sin
//      sesión se rechaza igual que dentro del iframe.
//   4. Que un cuerpo roto no reviente el servidor: responde error, no se cae.
//   5. Que la respuesta no lleve nunca el cuerpo de la petición de vuelta —
//      una clave tecleada no puede volver en el eco de un error.
//
// Uso: node build/checks/puerta_http.js
'use strict';
const fs = require('fs');
const path = require('path');

const V2 = path.resolve(__dirname, '..', '..', 'v2');
const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined ? '' : ' — ' + detalle));
  if (!cond) fails.push(l);
};

si('existe v2/api_web.gs', fs.existsSync(path.join(V2, 'api_web.gs')), 'es la puerta HTTP');
if (fails.length) { console.log('\n❌ ' + fails.length + ' FALLOS'); process.exit(1); }

/* ══ Mundo simulado ═══════════════════════════════════════════════════════ */
let SALIDA = null;
let LLAMADAS = [];
const sandbox = {
  // El dispatcher real se dobla acá: lo que se prueba es la PUERTA, no `api()`
  // (que ya tiene sus propias guardias). Se registra QUÉ le llega.
  api: (accion, datos, token) => {
    LLAMADAS.push({ accion, datos, token });
    if (accion === 'EXPLOTA') throw new Error('fallo interno simulado');
    if (accion === 'SIN_SESION') return { ok: false, error: 'Entra con tu clave para registrar.', codigo: 'NO_AUTORIZADO' };
    return { ok: true, data: { eco: accion, recibido: datos } };
  },
  ContentService: {
    createTextOutput: t => { SALIDA = { texto: t, mime: null }; return {
      setMimeType(m) { SALIDA.mime = m; return this; },
    }; },
    MimeType: { JSON: 'JSON', TEXT: 'TEXT' },
  },
  console: { log: () => {}, warn: () => {}, error: () => {} },
};
const SRC = fs.readFileSync(path.join(V2, 'api_web.gs'), 'utf8');
let API;
try {
  API = new Function(...Object.keys(sandbox),
    SRC + '\n;const _t = n => (eval("typeof " + n) === "function" ? eval(n) : null);' +
    '\n;return { doPost: _t("doPost") };')(...Object.values(sandbox));
} catch (e) {
  si('api_web.gs es JavaScript válido', false, e.message);
  console.log('\n❌ ' + fails.length + ' FALLOS'); process.exit(1);
}
si('existe doPost()', typeof API.doPost === 'function');
if (fails.length) { console.log('\n❌ ' + fails.length + ' FALLOS'); process.exit(1); }

const postear = cuerpo => {
  SALIDA = null;
  const r = API.doPost({ postData: { contents: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo) } });
  let json = null;
  try { json = JSON.parse(SALIDA ? SALIDA.texto : ''); } catch (e) {}
  return { salida: SALIDA, json: json, devuelto: r };
};

/* ══ 1 · Una llamada normal ═══════════════════════════════════════════════ */
LLAMADAS = [];
let r = postear({ accion: 'GET_BOOT', datos: { fecha: '2026-09-16' }, token: 'tk-1' });
si('responde algo', !!r.salida);
si('…y lo marca como JSON', r.salida && r.salida.mime === 'JSON', r.salida && r.salida.mime);
si('…que se puede interpretar', !!r.json, r.salida && String(r.salida.texto).slice(0, 80));
si('…con la respuesta del dispatcher', !!(r.json && r.json.ok && r.json.data.eco === 'GET_BOOT'), JSON.stringify(r.json));

/* ══ 2 · 🔴 No duplica el dispatcher ══════════════════════════════════════ */
si('🔴 la puerta llama al MISMO api(), no a una copia', LLAMADAS.length === 1, LLAMADAS.length + ' llamadas');
si('…y le pasa la acción tal cual', LLAMADAS[0] && LLAMADAS[0].accion === 'GET_BOOT');
si('…los datos tal cual', !!(LLAMADAS[0] && LLAMADAS[0].datos && LLAMADAS[0].datos.fecha === '2026-09-16'));
si('…y el token, que es lo que sostiene la identidad',
  LLAMADAS[0] && LLAMADAS[0].token === 'tk-1', LLAMADAS[0] && LLAMADAS[0].token);
const FUENTE = SRC.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
si('🔴 la puerta NO trae su propio switch de acciones',
  !/case\s+'[A-Z_]{3,}'/.test(FUENTE),
  'duplicar el catálogo haría que una acción nueva sirva en un camino y no en el otro');

/* ══ 3 · Hereda el candado ════════════════════════════════════════════════ */
r = postear({ accion: 'SIN_SESION', datos: {}, token: '' });
si('🔴 sin sesión, la puerta devuelve el mismo rechazo que el iframe',
  !!(r.json && r.json.ok === false && /clave/i.test(r.json.error)), JSON.stringify(r.json));

/* ══ 4 · Lo roto no tumba el servidor ═════════════════════════════════════ */
for (const malo of ['', 'esto no es json', '{"accion":', '[]', 'null']) {
  r = postear(malo);
  si('un cuerpo inválido ' + JSON.stringify(malo.slice(0, 18)) + ' responde error, no revienta',
    !!(r.json && r.json.ok === false), r.salida ? String(r.salida.texto).slice(0, 70) : '(sin respuesta)');
}
r = postear({ accion: 'EXPLOTA', datos: {} });
si('si el dispatcher lanza, la puerta lo convierte en error',
  !!(r.json && r.json.ok === false), JSON.stringify(r.json));
SALIDA = null;
let sinPost = null;
try { API.doPost({}); sinPost = SALIDA; } catch (e) { sinPost = null; }
si('una petición sin cuerpo tampoco revienta', !!sinPost, 'doPost lanzó una excepción');

/* ══ 5 · 🔒 El error no devuelve lo que se mandó ══════════════════════════ */
r = postear({ accion: 'EXPLOTA', datos: { clave: 'la-clave-secreta-del-turno' } });
si('🔒 un error NO devuelve el cuerpo de la petición',
  JSON.stringify(r.json).indexOf('la-clave-secreta-del-turno') === -1,
  'la clave tecleada volvería en el eco del error: ' + JSON.stringify(r.json).slice(0, 110));

console.log(fails.length ? '\n❌ ' + fails.length + ' FALLOS' : '\n✅ TODO OK');
process.exit(fails.length ? 1 : 0);
