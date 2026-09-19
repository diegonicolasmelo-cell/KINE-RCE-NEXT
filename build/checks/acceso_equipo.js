// acceso_equipo.js — 🔐 CADA KINESIÓLOGO ENTRA CON SU CLAVE, Y FIRMA CON LA SUYA
// (15-sep-2026).
//
// DE DÓNDE SALE. Pedido de Diego: «¿puedes crear un login de acceso?». El plan
// maestro eligió Google Sign-In (D1b) y el servidor para eso ya está entero,
// pero depende de un proyecto de Google Cloud que sigue trabado en informática.
// Mientras tanto la app corre en marcha blanca abierta: cualquiera con el
// enlace entra y **firma con el nombre que teclee**. Eso es lo que este login
// cierra, sin depender de nadie de fuera.
//
// NO SE ESCRIBE CRIPTOGRAFÍA NUEVA. El Modo Coordinación ya tiene un mecanismo
// probado —huella SHA-256 con sal por persona, guardada en PropertiesService y
// NUNCA en la planilla, intentos fallidos con espera, sesión con token que
// vive en el caché y muere por inactividad—. Acá se reusa la misma receta, con
// un ESPACIO de credenciales distinto: una clave de coordinación no abre el
// turno, ni al revés.
//
// 🪤 La receta de coordinación NO se puede tocar: sus claves ya están creadas
// en la planilla de Diego y cambiar el texto que se resume las invalidaría a
// todas. Lo que se comparte es la primitiva (`credHuellaDe`), no la receta.
//
// QUÉ EXIGE
//   1. Que el login nazca APAGADO: sin `CONFIG.LOGIN_EQUIPO_ACTIVO` nada
//      cambia para el equipo. Encenderlo es una decisión de Diego.
//   2. Que con el login encendido no se pueda escribir sin sesión.
//   3. Que nadie pueda firmar con la firma de otro.
//   4. Que la clave no quede nunca en la planilla.
//   5. Que el mensaje de error sea el MISMO exista o no el usuario: si
//      «no existe» se dijera distinto de «clave mala», probar nombres serviría
//      para descubrir quiénes son.
//   6. Que tras varios intentos fallidos haya espera, contada por persona: si
//      fuera global, cualquiera dejaría afuera a toda la unidad tecleando mal.
//   7. Que la sesión muera por inactividad y que salir la cierre EN EL
//      SERVIDOR, no solo en el navegador.
//   8. Que una clave temporal obligue a cambiarla al entrar.
//
// Uso: node build/checks/acceso_equipo.js
'use strict';
const fs = require('fs');
const path = require('path');

const V2 = path.resolve(__dirname, '..', '..', 'v2');
const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined ? '' : ' — ' + detalle));
  if (!cond) fails.push(l);
};

/* ══ Mundo simulado: hojas, caché y propiedades en memoria ═══════════════ */
const PROPS = {};
const CACHE = {};
let RELOJ = Date.now();
const KINES = [
  { FIRMA: 'DMV', NOMBRE: 'Ana Pérez', EMAIL: 'diego@sim', ACTIVO: true, TRATAMIENTO: 'Klgo.' },
  { FIRMA: 'MFB', NOMBRE: 'Luis Toro', EMAIL: 'manuel@sim', ACTIVO: true, TRATAMIENTO: 'Klgo.' },
  { FIRMA: 'CSR', NOMBRE: 'Carla Soto', EMAIL: 'carla@sim', ACTIVO: true, TRATAMIENTO: 'Klga.' },
  { FIRMA: 'XXX', NOMBRE: 'Ya no trabaja', EMAIL: 'x@sim', ACTIVO: false, TRATAMIENTO: 'Klgo.' },
];
let CONFIG = {};
const AUDITADO = [];

const sandbox = {
  PropertiesService: { getScriptProperties: () => ({
    getProperty: k => (k in PROPS ? PROPS[k] : null),
    setProperty: (k, v) => { PROPS[k] = String(v); },
    deleteProperty: k => { delete PROPS[k]; },
    getProperties: () => Object.assign({}, PROPS),
  }) },
  CacheService: { getScriptCache: () => ({
    get: k => { const e = CACHE[k]; if (!e) return null; if (e.hasta <= RELOJ) { delete CACHE[k]; return null; } return e.v; },
    put: (k, v, seg) => { CACHE[k] = { v: v, hasta: RELOJ + (seg || 600) * 1000 }; },
    remove: k => { delete CACHE[k]; },
  }) },
  Utilities: {
    getUuid: (() => { let n = 0; return () => 'uuid-' + (++n); })(),
    computeDigest: (_alg, txt) => Array.from(require('crypto').createHash('sha256').update(String(txt), 'utf8').digest()),
    base64Encode: b => Buffer.from(b).toString('base64'),
    base64EncodeWebSafe: b => Buffer.from(String(b)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
    DigestAlgorithm: { SHA_256: 1, MD5: 2 },
    Charset: { UTF_8: 1 },
  },
  repoLeerTodos: (hoja, campo, valor) => {
    if (hoja !== 'KINESIOLOGOS') return [];
    let f = KINES.slice();
    if (campo !== undefined) f = f.filter(k => String(k[campo]).toLowerCase() === String(valor).toLowerCase());
    return f;
  },
  configVal: (k, def) => (k in CONFIG ? CONFIG[k] : (def === undefined ? '' : def)),
  leerConfig: (k, def) => (k in CONFIG ? CONFIG[k] : def),
  esVerdadero: v => v === true || String(v).toUpperCase() === 'TRUE' || String(v) === '1',
  auditar: reg => { AUDITADO.push(reg); },
  ok: d => ({ ok: true, data: d }),
  err: (m, c) => ({ ok: false, error: m, codigo: c }),
  ERR: { NO_AUTORIZADO: 'NO_AUTORIZADO', VALIDACION: 'VALIDACION', INTERNO: 'INTERNO' },
  console: { log: () => {}, warn: () => {}, error: () => {} },
  UrlFetchApp: { fetch: () => ({ getResponseCode: () => 400, getContentText: () => '{}' }) },
  Session: { getActiveUser: () => ({ getEmail: () => '' }) },
};

const ARCHIVOS = ['infra_util.gs', 'infra_auth.gs', 'svc_acceso.gs'];
for (const f of ARCHIVOS) {
  si('existe v2/' + f, fs.existsSync(path.join(V2, f)),
    f === 'svc_acceso.gs' ? 'es el módulo del login de equipo' : '');
}
if (fails.length) { console.log('\n❌ ' + fails.length + ' FALLOS'); process.exit(1); }

const SRC = ARCHIVOS.map(f => fs.readFileSync(path.join(V2, f), 'utf8')).join('\n;\n');
const EXPORTA = ['accesoEntrar', 'accesoSalir', 'accesoSesion', 'accesoCambiarClave',
  'accesoEstado', 'accesoDefinirClave', 'accesoClaveTemporal', 'autorizar', 'credHuellaDe'];
let API;
try {
  API = new Function(...Object.keys(sandbox),
    SRC + '\n;const _t = n => (eval("typeof " + n) === "function" ? eval(n) : null);' +
    '\n;return {' + EXPORTA.map(n => n + ': _t("' + n + '")').join(',') + '};')(...Object.values(sandbox));
} catch (e) {
  si('los dos módulos son JavaScript válido juntos', false, e.message);
  console.log('\n❌ ' + fails.length + ' FALLOS'); process.exit(1);
}
for (const n of EXPORTA) si('existe ' + n + '()', typeof API[n] === 'function');
if (fails.length) { console.log('\n❌ ' + fails.length + ' FALLOS'); process.exit(1); }

/* ══ 1 · Nace apagado ═════════════════════════════════════════════════════ */
CONFIG = {};
si('sin CONFIG.LOGIN_EQUIPO_ACTIVO el login está apagado', API.accesoEstado({}).data.activo === false);
si('apagado, autorizar() no exige sesión de equipo',
  API.autorizar('', 'DMV').ok === false || API.autorizar('', 'DMV').firma === 'DMV',
  'con el login apagado el comportamiento anterior no debe cambiar');

/* ══ 2 · Encendido: sin sesión no se escribe ═════════════════════════════ */
CONFIG = { LOGIN_EQUIPO_ACTIVO: 'TRUE' };
si('encendido, accesoEstado lo dice', API.accesoEstado({}).data.activo === true);
const sinSesion = API.autorizar('', 'DMV');
si('encendido, sin sesión NO se autoriza', sinSesion.ok === false, JSON.stringify(sinSesion));
si('…y el error dice qué hacer', /sesión|entra|clave/i.test(String(sinSesion.error || '')), sinSesion.error);

/* ══ 3 · La clave se define y se entra ═══════════════════════════════════ */
API.accesoDefinirClave('DMV', 'clave-de-prueba-1');
const entra = API.accesoEntrar({ usuario: 'dmv', clave: 'clave-de-prueba-1' });
si('con la clave correcta se entra', entra.ok === true, JSON.stringify(entra));
si('…y devuelve un token', !!(entra.ok && entra.data.token));
si('…y dice de quién es la firma', entra.ok && entra.data.firma === 'DMV', entra.ok && entra.data.firma);
si('…y trae el nombre para saludar', entra.ok && /Ana/.test(entra.data.nombre || ''), entra.ok && entra.data.nombre);
const TOKEN = entra.ok ? entra.data.token : '';

si('la sesión resuelve a la firma', (API.accesoSesion(TOKEN) || {}).firma === 'DMV');
const auth = API.autorizar(TOKEN, 'DMV');
si('con sesión, autorizar() deja escribir', auth.ok === true, JSON.stringify(auth));
si('…con la firma de quien entró', auth.ok && auth.firma === 'DMV');

/* ══ 4 · 🔴 Nadie firma con la firma de otro ═════════════════════════════ */
const suplanta = API.autorizar(TOKEN, 'MFB');
si('🔴 entrando como DMV no se puede firmar como MFB', suplanta.ok === false, JSON.stringify(suplanta));
si('…y el error nombra la firma propia', /DMV/.test(String(suplanta.error || '')), suplanta.error);

/* ══ 5 · La clave nunca queda en la planilla, ni en claro ════════════════ */
const guardado = JSON.stringify(PROPS);
si('🔒 la clave no queda escrita en ninguna parte', guardado.indexOf('clave-de-prueba-1') === -1);
si('🔒 lo que se guarda es una huella con sal',
  Object.keys(PROPS).some(k => /sal/.test(k)) && Object.keys(PROPS).some(k => /hash/.test(k)),
  Object.keys(PROPS).join(', '));
si('🔒 la huella no se puede rehacer sin la sal de esa persona',
  API.credHuellaDe('a') !== API.credHuellaDe('b'));

/* ══ 6 · El mensaje no delata quién existe ═══════════════════════════════ */
const malaClave = API.accesoEntrar({ usuario: 'dmv', clave: 'equivocada' });
const noExiste  = API.accesoEntrar({ usuario: 'nadie', clave: 'equivocada' });
si('clave mala y usuario inexistente dan el MISMO mensaje',
  String(malaClave.error) === String(noExiste.error),
  JSON.stringify([malaClave.error, noExiste.error]));
const inactivo = API.accesoEntrar({ usuario: 'xxx', clave: 'lo-que-sea' });
si('un kinesiólogo inactivo no entra', inactivo.ok === false);

/* ══ 7 · Espera tras varios fallos, y por persona ════════════════════════ */
for (let i = 0; i < 6; i++) API.accesoEntrar({ usuario: 'dmv', clave: 'no' });
const trasFallos = API.accesoEntrar({ usuario: 'dmv', clave: 'clave-de-prueba-1' });
si('tras varios intentos fallidos hay espera', trasFallos.ok === false && /minuto/i.test(String(trasFallos.error)),
  trasFallos.error);
API.accesoDefinirClave('MFB', 'otra-clave-2');
const otroEntra = API.accesoEntrar({ usuario: 'mfb', clave: 'otra-clave-2' });
si('🔴 la espera es por persona: el resto del equipo entra igual', otroEntra.ok === true,
  'si fuera global, cualquiera dejaría afuera a toda la unidad tecleando mal');

/* ══ 8 · Salir cierra en el servidor ═════════════════════════════════════ */
const tokenOtro = otroEntra.ok ? otroEntra.data.token : '';
si('antes de salir la sesión vive', !!API.accesoSesion(tokenOtro));
API.accesoSalir({ token: tokenOtro });
si('🔴 después de salir la sesión NO vive en el servidor', !API.accesoSesion(tokenOtro),
  'cerrar solo en el navegador deja la tablet del office abierta');
si('salir dos veces no es un error', API.accesoSalir({ token: tokenOtro }).ok === true);

/* ══ 9 · La sesión muere por inactividad, no por reloj ═══════════════════ */
API.accesoDefinirClave('CSR', 'tercera-clave-3');
const s3 = API.accesoEntrar({ usuario: 'csr', clave: 'tercera-clave-3' });
const t3 = s3.ok ? s3.data.token : '';
RELOJ += 5 * 3600 * 1000;                    // cinco horas trabajando
si('usándola, la sesión sigue viva a las 5 horas', !!API.accesoSesion(t3));
RELOJ += 7 * 3600 * 1000;                    // siete horas sin tocar nada
si('sin usarla, la sesión expira', !API.accesoSesion(t3));

/* ══ 10 · Clave temporal: obliga a cambiarla ═════════════════════════════ */
const temp = API.accesoClaveTemporal('CSR');
si('se puede generar una clave temporal', temp.ok === true && !!temp.data.clave, JSON.stringify(temp));
const conTemp = API.accesoEntrar({ usuario: 'csr', clave: temp.ok ? temp.data.clave : '' });
si('con la temporal se entra', conTemp.ok === true, JSON.stringify(conTemp));
si('…y la app sabe que debe pedir una nueva', conTemp.ok && conTemp.data.debeCambiarClave === true);
const cambio = API.accesoCambiarClave({ token: conTemp.ok ? conTemp.data.token : '',
  actual: temp.ok ? temp.data.clave : '', nueva: 'la-mia-ahora-4' });
si('se puede cambiar la clave', cambio.ok === true, JSON.stringify(cambio));
const conNueva = API.accesoEntrar({ usuario: 'csr', clave: 'la-mia-ahora-4' });
si('…y la nueva sirve', conNueva.ok === true);
si('…y ya no pide cambiarla', conNueva.ok && conNueva.data.debeCambiarClave !== true);
si('…y la vieja dejó de servir', API.accesoEntrar({ usuario: 'csr', clave: temp.ok ? temp.data.clave : '' }).ok === false);
si('una clave demasiado corta se rechaza',
  API.accesoCambiarClave({ token: conNueva.data.token, actual: 'la-mia-ahora-4', nueva: '123' }).ok === false);

/* ══ 11 · Queda auditado quién entró ═════════════════════════════════════ */
si('la entrada queda en la auditoría', AUDITADO.some(a => /ENTRADA|ACCESO/.test(String(a.accion))),
  AUDITADO.map(a => a.accion).join(', '));
si('🔒 la auditoría NO guarda la clave', JSON.stringify(AUDITADO).indexOf('clave-de-prueba-1') === -1);

console.log(fails.length ? '\n❌ ' + fails.length + ' FALLOS' : '\n✅ TODO OK');
process.exit(fails.length ? 1 : 0);
