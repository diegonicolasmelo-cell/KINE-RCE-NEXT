/**
 * sim_srv.js — Servidor GAS REAL corriendo en Node con hojas EN MEMORIA.
 * Evalúa los .gs de v2/ (dominio + servicios + api) reemplazando solo la capa
 * repo/infra que depende de Google (Sheets, Lock, Auth, Drive). Expone:
 *   api(accion, datos, token) — el dispatcher real
 *   DB      — las "hojas" en memoria (inspectables)
 *   SIM     — reloj simulado { fecha, hora } (hoyISO/ahoraTS lo leen)
 *   CONFIG  — mapa de configuración
 */
const fs = require('fs');
const path = require('path');
const v2 = path.join(__dirname, '..', '..', 'v2');

// ── Hojas en memoria ──
const DB = {
  CAMAS_ESTADO: [], EVOLUCIONES: [], EVOLUCIONES_ARCHIVO: [], PROCEDIMIENTOS: [],
  TIMELINE: [], ARCHIVO_PACIENTES: [], VENTILADORES: [], MOVIMIENTOS_VM: [],
  FALLAS_VM: [], CATALOGOS: [], KINESIOLOGOS: [], CONFIG: [], AUDIT_LOG: [],
  REINTUBACIONES: [], ENTREGAS_TURNO: [], TURNOS_ASIGNACION: [], CAT_MATRICES: [],
  INDICADORES_HISTORICO: [], REM_MENSUAL: [], EVENTOS_ANEXOS: [],
};
const CONFIG = { AUTH_DEV_MODE: 'TRUE', NUM_CAMAS: '12' };
const SIM = { fecha: '2026-07-01', hora: '10:00:00' };

// ── Capa repo en memoria (misma semántica que repo.gs) ──
global.repoLeerTodos = (h, campo, valor) => {
  let filas = (DB[h] || []).slice();
  if (campo !== undefined) filas = filas.filter(r => String(r[campo]) === String(valor));
  return filas;
};
// Lectura por columnas (Ola 3). El doble RECORTA de verdad: si un cálculo usa
// un campo que no declaró, aquí lo ve vacío igual que en producción, y el
// número sale mal en la simulación en vez de salir mal en la UCI.
// Y viene MARCADO como parcial: guardarlo dejaría en blanco las columnas que
// no se leyeron, así que aquí también se frena, igual que en repo.gs.
global.repoLeerColumnas = (h, campos) => (DB[h] || []).map(o => {
  if (!campos || !campos.length) return Object.assign({}, o);
  const r = {};
  campos.forEach(c => { r[c] = (o[c] === undefined) ? '' : o[c]; });
  Object.defineProperty(r, '_PARCIAL', { value: { hoja: h, campos }, enumerable: false });
  return r;
});
global._colsExigirCompleto = (h, obj, quien) => {
  if (obj && typeof obj === 'object' && obj._PARCIAL) {
    throw new Error(quien + ': se intentó escribir en ' + h + ' un registro leído a medias.');
  }
};
// Misma semántica que repo.gs: el predicado recibe el valor de la columna.
// (Faltaba desde v5.21: sin él, obtenerEvosDelDia fallaba en silencio dentro
// de la simulación y el registro diario simulado quedaba sin cobertura.)
global.repoLeerFiltrado = (h, colKey, pred) =>
  (DB[h] || []).filter(r => pred(r[colKey]));
// FOTO, no referencia viva: en producción repoBuscarPorId materializa la fila
// desde la hoja, así que mutar la base después NO cambia lo ya leído. La
// simulación debe comportarse igual (una referencia viva escondía el orden
// exacto de operaciones en los traslados).
global.repoBuscarPorId = (h, campo, id) => {
  const r = (DB[h] || []).find(x => String(x[campo]) === String(id));
  return r ? Object.assign({}, r) : null;
};
global.repoBuscarFila = (h, campo, id) => {
  const i = (DB[h] || []).findIndex(r => String(r[campo]) === String(id));
  return i === -1 ? -1 : i + 2;
};
// Las ESCRITURAS sí operan sobre la fila viva (interno, no expuesto a los .gs)
const _filaViva = (h, campo, id) => (DB[h] || []).find(x => String(x[campo]) === String(id)) || null;
global.repoActualizar = (h, campo, id, cambios) => {
  global._colsExigirCompleto(h, cambios, 'repoActualizar');
  const r = _filaViva(h, campo, id);
  if (r) Object.assign(r, cambios);
  return !!r;
};
global.repoActualizarDonde = (h, fil, mut) =>
  (DB[h] || []).forEach(r => {
    if (!fil(r)) return;
    const c = mut(r);
    global._colsExigirCompleto(h, c, 'repoActualizarDonde');
    Object.assign(r, c);
  });
global.repoInsertar = (h, obj) => {
  global._colsExigirCompleto(h, obj, 'repoInsertar');
  (DB[h] = DB[h] || []).push(obj); return obj;
};
global.repoEliminarDonde = (h, fn) => { DB[h] = (DB[h] || []).filter(r => !fn(r)); };
global.repoUpsert = (h, campo, id, obj) => {
  global._colsExigirCompleto(h, obj, 'repoUpsert');
  const r = _filaViva(h, campo, id);
  // Como repo.gs: la fila se REESCRIBE completa (no merge) — un upsert con
  // menos campos borra los que no vengan, igual que en producción.
  if (r) {
    const idx = DB[h].indexOf(r);
    DB[h][idx] = Object.assign({}, obj);
    return 'actualizar';
  }
  global.repoInsertar(h, obj); return 'crear';
};
// ── Primitivas de la Ola 4 (guardado con menos viajes) ──
// La convención de fila del sim es i+2 (repoBuscarFila de arriba): estas
// dobles la comparten para que fila↔índice sea coherente entre todas.
global.repoUpsertEnFila = (h, fila, obj) => {
  global._colsExigirCompleto(h, obj, 'repoUpsertEnFila');
  if (fila === -1) { global.repoInsertar(h, obj); return 'crear'; }
  DB[h][fila - 2] = Object.assign({}, obj);
  return 'actualizar';
};
global.repoLeerFila = (h, fila) => Object.assign({}, DB[h][fila - 2]);
global.repoEscribirFila = (h, fila, obj) => {
  global._colsExigirCompleto(h, obj, 'repoEscribirFila');
  DB[h][fila - 2] = Object.assign({}, obj);
};
global.repoLeerColumnasConFila = (h, campos) => (DB[h] || []).map((o, i) => {
  const obj = {}; campos.forEach(c => { obj[c] = (c in o) ? o[c] : ''; }); return { fila: i + 2, obj };
});
global.repoLeerTodosConFila = h =>
  (DB[h] || []).map((r, i) => ({ obj: Object.assign({}, r), fila: i + 2 }));
global.repoEliminarFilas = (h, filas) => {
  if (!filas || !filas.length) return 0;
  const idx = filas.map(f => f - 2).sort((a, b) => b - a);
  idx.forEach(i => DB[h].splice(i, 1));
  return idx.length;
};
global.repoEliminarPorCols = (h, campos, pred) => {
  const antes = (DB[h] || []).length;
  DB[h] = (DB[h] || []).filter(r => {
    const o = {};
    campos.forEach(c => { o[c] = r[c]; });
    return !pred(o);
  });
  return antes - DB[h].length;
};
global.repoInsertarVarios = (h, objs) => {
  (objs || []).forEach(o => {
    global._colsExigirCompleto(h, o, 'repoInsertarVarios');
    (DB[h] = DB[h] || []).push(Object.assign({}, o));
  });
  return (objs || []).length;
};

// ── Infra que no se evalúa: config, lock, auth, log ──
global.leerConfig = (k, d) => (k in CONFIG && String(CONFIG[k]).trim() !== '') ? String(CONFIG[k]) : d;
global.escribirConfig = (k, v) => { CONFIG[k] = v; };
global.configVal = (k, d) => (k in CONFIG) ? String(CONFIG[k]) : (d !== undefined ? d : '');
global.conLock = fn => fn();
global.autorizar = (t, firmaDecl) => ({ ok: true, email: 'sim@rce.cl', firma: firmaDecl || 'Klgo. Simulador', dev: true });
global.auditar = a => { DB.AUDIT_LOG.push(Object.assign({ TS: SIM.fecha + ' ' + SIM.hora }, a)); };
global._tz = () => 'America/Santiago';

// ── GAS globals ──
global.SpreadsheetApp = { flush: () => {}, getActiveSpreadsheet: () => { throw new Error('sim: sin Sheets'); } };
let uuidN = 0;
const _crypto = require('crypto');
global.Utilities = {
  getUuid: () => 'uuid-' + (++uuidN),
  formatDate: () => { throw new Error('sim: formatDate no debe usarse (hoyISO/ahoraTS overrideados)'); },
  base64Decode: s => s, newBlob: (b, m, n) => ({ b, m, n }),
  sleep: () => {},
  // Digest real (ago-2026): el modo Coordinación guarda la HUELLA de la clave,
  // no la clave. Con un digest de mentira la guardia «la clave no se guarda en
  // ninguna parte» pasaría en verde sin probar nada.
  DigestAlgorithm: { SHA_256: 'sha256', MD5: 'md5' },
  Charset: { UTF_8: 'utf8' },
  computeDigest: (alg, texto) => Array.from(_crypto.createHash(alg).update(String(texto), 'utf8').digest()),
  base64Encode: b => Buffer.from(Array.isArray(b) ? b : Buffer.from(String(b))).toString('base64'),
};
global.DriveApp = {
  getFolderById: () => ({ createFile: () => ({ getUrl: () => 'https://drive.sim/f/1' }) }),
  createFolder: () => ({ getId: () => 'SIM_FOLDER', createFile: () => ({ getUrl: () => 'https://drive.sim/f/1' }) }),
};
// Caché con memoria real (ago-2026): antes devolvía null siempre, o sea que no
// era un caché sino su ausencia. Las sesiones del modo Coordinación viven aquí,
// así que sin memoria ninguna guardia podría probar que expiran o que se atan a
// una firma. Respeta el TTL en segundos, como el de Apps Script.
const _CACHE = {};
global.CacheService = { getScriptCache: () => ({
  get: k => { const e = _CACHE[k]; if (!e) return null; if (e.hasta <= Date.now()) { delete _CACHE[k]; return null; } return e.v; },
  put: (k, v, seg) => { _CACHE[k] = { v: String(v), hasta: Date.now() + (seg || 600) * 1000 }; },
  remove: k => { delete _CACHE[k]; },
}) };
global.__simCacheReset = () => { for (const k in _CACHE) delete _CACHE[k]; };
// MailApp doble (ago-2026): la recuperacion por correo del modo Coordinacion
// esta escrita pero APAGADA. Sin este doble no se podria probar ni que manda el
// codigo cuando se enciende, ni —lo que mas importa— que NO manda nada mientras
// siga apagada. Los envios quedan en MAILS para inspeccionarlos.
const MAILS = [];
global.MailApp = {
  sendEmail: o => { MAILS.push(typeof o === 'string' ? { to: o } : o); },
  getRemainingDailyQuota: () => 1500,
};
global.__simMails = MAILS;
global.LockService = { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) };
const PROPS = {};
global.PropertiesService = { getScriptProperties: () => ({ getProperty: k => (k in PROPS ? PROPS[k] : null), setProperty: (k, v) => { PROPS[k] = String(v); }, deleteProperty: k => { delete PROPS[k]; } }) };

// ── Evaluar el código REAL del servidor ──
const ARCHIVOS = [
  'infra_respuesta.gs', 'infra_util.gs', 'infra_fechas.gs',
  'dominio_validacion.gs', 'dominio_calculos.gs', 'dominio_texto.gs',
  'svc_camas.gs', 'svc_evoluciones.gs', 'svc_procedimientos.gs', 'svc_timeline.gs',
  'svc_evaluaciones.gs',   // 🗂️ rama episodio/turno: serie fechada + escalas del episodio
  'svc_pendientes.gs',     // 📌 rediseño tres pasos: pendientes del episodio
  'svc_turnos.gs', 'svc_stats.gs', 'svc_indicadores.gs', 'svc_auditoria.gs',
  'svc_entrega.gs', 'svc_eventos.gs', 'svc_equipos.gs', 'svc_rem.gs',
  'svc_coordinacion.gs',
  'api.gs',
];
const codigo = ARCHIVOS.map(f => fs.readFileSync(path.join(v2, f), 'utf8')).join('\n;\n');
(0, eval)(codigo);   // eval indirecto → define en global

// Reloj simulado: hoyISO/ahoraTS del servidor leen SIM (pisan infra_fechas)
global.hoyISO = () => SIM.fecha;
global.ahoraTS = () => SIM.fecha + ' ' + SIM.hora;

// ── Semillas (mismas que crearORepararEstructura) ──
['Reanimación inicial', 'Protección pulmonar', 'Neuroprotección', 'Postoperatorio inmediato',
 'Espera de second look', 'Weaning', 'Consolidación de weaning', 'Rehabilitación', 'Cuidados postparo']
  .forEach((f, i) => DB.CATALOGOS.push({ TIPO: 'FASE_CLINICA', VALOR: f, ORDEN: i + 1, ACTIVO: true }));
for (let i = 1; i <= 12; i++) DB.CAMAS_ESTADO.push({ ID_CAMA: String(i), OCUPADA: false });
DB.KINESIOLOGOS.push(
  { FIRMA: 'DMV', NOMBRE: 'Diego Melo Villagrán', TRATAMIENTO: 'Klgo.', EMAIL: 'diego@sim', ACTIVO: true },
  { FIRMA: 'MFB', NOMBRE: 'Manuel Fuentes Blanco', TRATAMIENTO: 'Klgo.', EMAIL: 'manuel@sim', ACTIVO: true },
  { FIRMA: 'CSR', NOMBRE: 'Carla Soto Rojas', TRATAMIENTO: 'Klga.', EMAIL: 'carla@sim', ACTIVO: true },
);
DB.VENTILADORES.push(
  { ID_VM: 'vm1', NOMBRE: 'AVEA-01', MARCA: 'Vyaire', ESTADO: 'Operativo', ACTIVO: true, UBIC_TIPO: 'BODEGA', UBIC_DETALLE: '' },
  { ID_VM: 'vm2', NOMBRE: 'PB-840', MARCA: 'Medtronic', ESTADO: 'Operativo', ACTIVO: true, UBIC_TIPO: 'BODEGA', UBIC_DETALLE: '' },
);

// ── El candado REAL, solo para quien lo pida (tanda 2 del guardado seguro, paso 1) ──
// 🔴 POR QUÉ NO ES EL DEFECTO. `global.conLock = fn => fn()` de arriba es un juguete: no toma nada, no devuelve
// LOCK_TIMEOUT, no suelta si el cuerpo lanza, y es reentrante. Sirve para los ~145 bancos de siempre —que anidan
// sin saberlo— y por eso NO se cambia. Las guardias del guardado seguro necesitan el de v2/infra_lock.gs, porque el
// sello de operación va a vivir DENTRO de él, y piden el real con `activarLockReal()`. Cada guardia corre en su
// propio proceso, así que pedirlo no contamina a nadie.
//
// Lo que instala:
//   · el texto REAL de infra_lock.gs (no una copia): si el candado cambia, el banco cambia con él;
//   · un doble de LockService con estado: UN solo candado, NO reentrante (un segundo tryLock con el candado tomado
//     devuelve false, como un proceso ajeno que lo tiene; en un solo hilo no se puede esperar de verdad);
//   · el gancho `antesDelCuerpo`: «mientras esta petición esperaba el candado, otra se adelantó». En un solo hilo
//     eso es correr la otra petición ENTERA —con su propio conLock— dentro de la espera de la nuestra, o sea
//     dentro de `tryLock`, con el candado libre; cuando tryLock vuelve, el mundo ya cambió. Una lectura hecha FUERA
//     del lock no ve ese cambio; una hecha dentro, sí. Corre UNA vez (se consume antes de correr, para que el
//     conLock de la otra petición no lo dispare de nuevo);
//   · un CacheService que se puede hacer fallar (`ctl.cache.fallar(true)`): el sello de operación tiene que ser
//     fail-open y esa promesa no se prueba sin un caché que falle.
//
// 🪤 `ERR` es una `const` y las `const` no cuelgan de globalThis con eval indirecto: evaluar infra_lock.gs SOLO daría
// «ERR is not defined» en el primer LOCK_TIMEOUT. Por eso se evalúa junto a infra_respuesta.gs, en el mismo eval (que
// vuelve a definir ok/err, idénticas). Y se evalúa en el ámbito global, no en un `new Function`, porque el paso 3
// pone `var OP_ACTUAL` en este mismo archivo y api.gs lo asigna: si viviera en un ámbito propio, el candado leería
// una variable y la API escribiría otra.
let _CTL_REAL = null;
function activarLockReal(opts) {
  if (!_CTL_REAL) {
    const E = { tomado: false, enEspera: false, llamadas: 0, tomas: 0, rechazos: 0, liberaciones: 0, ganchos: 0, timeouts: [] };
    const ctl = {
      antesDelCuerpo: null,
      estado: () => Object.assign({}, E, { timeouts: E.timeouts.slice() }),
      cache: { falla: false, fallar: b => { ctl.cache.falla = (b !== false); } },
    };
    const tryLock = ms => {
      E.llamadas++; E.timeouts.push(ms);
      if (E.tomado) { E.rechazos++; return false; }
      const gancho = ctl.antesDelCuerpo;
      if (gancho) {
        ctl.antesDelCuerpo = null; E.ganchos++; E.enEspera = true;
        try { gancho(); } finally { E.enEspera = false; }
        if (E.tomado) { E.rechazos++; return false; }          // la «otra petición» dejó el candado tomado: esta no lo obtiene
      }
      E.tomado = true; E.tomas++;
      return true;
    };
    const lock = {
      tryLock,
      waitLock: ms => { if (!tryLock(ms)) throw new Error('sim: Lock timeout'); },
      releaseLock: () => { if (E.tomado) { E.tomado = false; E.liberaciones++; } },
      hasLock: () => E.tomado,
    };
    global.LockService = { getScriptLock: () => lock };

    const cacheAnterior = global.CacheService;
    global.CacheService = { getScriptCache: () => {
      const c = cacheAnterior.getScriptCache();
      const falla = op => { if (ctl.cache.falla) throw new Error('sim: CacheService no disponible (' + op + ')'); };
      return Object.assign({}, c, {
        get: k => { falla('get'); return c.get(k); },
        put: (k, v, seg) => { falla('put'); return c.put(k, v, seg); },
        remove: k => { falla('remove'); return c.remove(k); },
      });
    } };

    (0, eval)(fs.readFileSync(path.join(v2, 'infra_respuesta.gs'), 'utf8') + '\n;\n' + fs.readFileSync(path.join(v2, 'infra_lock.gs'), 'utf8'));
    _CTL_REAL = ctl;
  }
  if (opts && Object.prototype.hasOwnProperty.call(opts, 'antesDelCuerpo')) _CTL_REAL.antesDelCuerpo = opts.antesDelCuerpo || null;
  return _CTL_REAL;
}

module.exports = { api: global.api, DB, SIM, CONFIG, MAILS, activarLockReal };
