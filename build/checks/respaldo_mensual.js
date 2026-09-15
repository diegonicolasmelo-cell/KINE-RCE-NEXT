// respaldo_mensual.js — 🔴 LA SERIE DE AÑOS NO SE BORRA SOLA (15-sep-2026).
//
// DE DÓNDE SALE. La decisión D7 del plan maestro dice «30 respaldos diarios
// operativos + 1 snapshot mensual permanente (barato, protege la serie
// estadística)». Al medir la base 7.04 en NEXT estaba solo la primera mitad:
// `backupDiario()` copiaba la planilla y `_rotarBackups()` mandaba a la
// papelera todo lo que pasara de 30. O sea, a los 30 días no quedaba NINGUNA
// foto. La estadística de la unidad se sostiene sobre años de registros;
// contra eso, 30 días de memoria no es un respaldo, es una ventana.
//
// QUÉ EXIGE. Se corre el código REAL de `v2/svc_backup.gs` contra un Drive
// simulado que registra cada copia y cada papelera:
//   1. Que todos los días se cree la diaria, y que roten a las 30.
//   2. Que el primer día del mes nazca la mensual, y una sola por mes aunque
//      el activador corra 31 veces.
//   3. 🔴 Que después de un año de días la mensual siga viva. Esto es lo que
//      la guardia existe para impedir: que una rotación futura —un cambio de
//      prefijo, un `getFiles` que empiece a ver la subcarpeta— se lleve la
//      serie por delante sin que nadie lo note hasta que ya no está.
//   4. Que si la mensual falla, la diaria del día igual se haga.
//
// Uso: node build/checks/respaldo_mensual.js
'use strict';
const fs = require('fs');
const path = require('path');

const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined ? '' : ': ' + detalle));
  if (!cond) fails.push(l);
};

/* ══ Drive simulado ═══════════════════════════════════════════════════════ */
let RELOJ = new Date('2026-01-01T03:30:00');
let SEQ = 0;
let FALLAR_COPIA_MENSUAL = false;

function crearCarpeta(nombre) {
  const carpeta = {
    _nombre: nombre, _archivos: [], _carpetas: [],
    getId: () => 'folder_' + nombre, getUrl: () => 'https://drive/' + nombre,
    isTrashed: () => false,
    getFilesByType() { return iter(carpeta._archivos.filter(f => !f._papelera)); },
    getFilesByName(n) { return iter(carpeta._archivos.filter(f => !f._papelera && f._nombre === n)); },
    getFoldersByName(n) { return iter(carpeta._carpetas.filter(c => c._nombre === n)); },
    createFolder(n) { const c = crearCarpeta(n); carpeta._carpetas.push(c); return c; },
  };
  return carpeta;
}
function iter(arr) { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; }
function crearArchivo(nombre, creado) {
  const f = {
    _nombre: nombre, _papelera: false, _creado: creado,
    getName: () => f._nombre, getId: () => 'file_' + (++SEQ), getUrl: () => 'https://drive/f',
    getDateCreated: () => f._creado, getSize: () => 1000,
    isTrashed: () => f._papelera,
    setTrashed: v => { f._papelera = !!v; },
  };
  return f;
}

const RAIZ = crearCarpeta('RCE_KINE_backups');
const PLANILLA = {
  getId: () => 'planilla_viva',
  makeCopy(nombre, carpeta) {
    if (FALLAR_COPIA_MENSUAL && /mensual/.test(nombre)) throw new Error('Drive caído (simulado)');
    const f = crearArchivo(nombre, new Date(RELOJ));
    carpeta._archivos.push(f);
    return f;
  },
};
const DriveApp = {
  getRootFolder: () => ({ getFoldersByName: () => iter([RAIZ]) }),
  createFolder: n => crearCarpeta(n),
  getFolderById: () => RAIZ,
  getFileById: () => PLANILLA,
};
const PropertiesService = {
  getScriptProperties: () => ({ _p: {}, getProperty(k) { return this._p[k] || null; }, setProperty(k, v) { this._p[k] = v; } }),
};
const CONFIG_ESCRITO = {};

const sandbox = {
  DriveApp, PropertiesService,
  SpreadsheetApp: { getActiveSpreadsheet: () => Object.assign({}, PLANILLA, { getSheetByName: () => null }) },
  MimeType: { GOOGLE_SHEETS: 'sheets' },
  Utilities: {
    formatDate(d, tz, fmt) {
      const p = n => String(n).padStart(2, '0');
      return fmt === 'yyyy-MM' ? `${d.getFullYear()}-${p(d.getMonth() + 1)}`
           : `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}`;
    },
  },
  leerConfig: (k, def) => (k === 'BACKUP_MAX_DIARIOS' ? '30' : (k === 'TIMEZONE' ? 'America/Santiago' : def)),
  ahoraTS: () => '2026-01-01 03:30:00',
  hoyISO: () => '2026-01-01',
  ok: d => ({ ok: true, data: d }),
  err: (m, c) => ({ ok: false, error: m, codigo: c }),
  ERR: { INTERNO: 'INTERNO' },
  console: { log: () => {}, warn: () => {}, error: () => {} },
  _setConfigEspia: (k, v) => { CONFIG_ESCRITO[k] = v; },
};

// El reloj del código bajo prueba tiene que ser el SIMULADO: si leyera el real,
// la guardia diría cosas distintas según el día en que se corra (esa trampa ya
// costó una sesión en este proyecto).
let SRC = fs.readFileSync(path.resolve(__dirname, '..', '..', 'v2', 'svc_backup.gs'), 'utf8');
SRC = SRC.replace(/new Date\(\)/g, 'RELOJ_SIM()')
         .replace(/function _setConfig\(clave, valor\) \{/, 'function _setConfig(clave, valor) { _setConfigEspia(clave, valor); return;');
// Se exporta por nombre-si-existe: si alguien borra `backupMensual`, la
// guardia tiene que decirlo con un ❌ legible, no reventar con un ReferenceError.
const API = new Function(...Object.keys(sandbox), 'RELOJ_SIM',
  SRC + '\n;const _t = n => (eval("typeof " + n) === "function" ? eval(n) : null);' +
        '\n;return { backupDiario: _t("backupDiario"), backupMensual: _t("backupMensual"),' +
        ' listarBackups: _t("listarBackups"), _obtenerCarpetaMensual: _t("_obtenerCarpetaMensual") };')
  (...Object.values(sandbox), () => new Date(RELOJ));

for (const n of ['backupDiario', 'backupMensual', 'listarBackups', '_obtenerCarpetaMensual']) {
  si('existe ' + n + '() en v2/svc_backup.gs', typeof API[n] === 'function',
    n === 'backupMensual' ? 'es la mitad permanente de D7: sin ella, a los 30 días no queda ninguna foto' : 'no está');
}
if (fails.length) { console.log('\n❌ ' + fails.length + ' FALLOS'); process.exit(1); }

const vivos = c => c._archivos.filter(f => !f._papelera).map(f => f._nombre);
const carpetaMensual = () => RAIZ._carpetas.find(c => c._nombre === 'mensuales');
const avanzarUnDia = () => { RELOJ = new Date(RELOJ.getTime() + 24 * 3600 * 1000); };

/* ══ 1 · Un mes de días ═══════════════════════════════════════════════════ */
for (let d = 0; d < 31; d++) { API.backupDiario(); avanzarUnDia(); }
si('31 días → 30 diarias vivas (la más vieja rotó)', vivos(RAIZ).length === 30, vivos(RAIZ).length);
si('existe la subcarpeta de mensuales', !!carpetaMensual());
si('una sola mensual en enero, no 31',
  carpetaMensual() && vivos(carpetaMensual()).length === 1, carpetaMensual() && vivos(carpetaMensual()).length);
si('la mensual se llama por su mes', vivos(carpetaMensual())[0] === 'RCE_KINE_mensual_2026-01', vivos(carpetaMensual())[0]);
si('CONFIG registra el mes de la última mensual', CONFIG_ESCRITO.ULTIMO_BACKUP_MENSUAL === '2026-01', CONFIG_ESCRITO.ULTIMO_BACKUP_MENSUAL);

/* ══ 2 · El mes siguiente trae la suya ════════════════════════════════════ */
API.backupDiario();   // ya estamos en febrero
si('febrero crea su propia mensual', vivos(carpetaMensual()).length === 2, vivos(carpetaMensual()));

/* ══ 3 · 🔴 Un año entero de rotación no se lleva la serie ════════════════ */
for (let d = 0; d < 365; d++) { avanzarUnDia(); API.backupDiario(); }
const mensuales = vivos(carpetaMensual());
si('tras 397 días siguen VIVAS todas las mensuales (12 meses + los 2 iniciales)',
  mensuales.length >= 13, mensuales.length + ' → ' + mensuales.join(', '));
si('la mensual del PRIMER mes sigue ahí (es lo que la rotación no debe tocar)',
  mensuales.indexOf('RCE_KINE_mensual_2026-01') >= 0, mensuales.join(', '));
si('las diarias siguen acotadas a 30', vivos(RAIZ).length === 30, vivos(RAIZ).length);
si('hay una mensual por mes, sin repetidas', new Set(mensuales).size === mensuales.length);

/* ══ 4 · Si la mensual falla, la diaria del día igual se hace ═════════════ */
FALLAR_COPIA_MENSUAL = true;
RELOJ = new Date('2027-06-15T03:30:00');
const antes = vivos(RAIZ).length;
const r = API.backupDiario();
si('con la mensual caída, la diaria igual se crea y responde ok', !!(r && r.ok));
si('…y la diaria del día está en la carpeta',
  vivos(RAIZ).some(n => n.indexOf('RCE_KINE_backup_2027-06-15') === 0), vivos(RAIZ).slice(-2));
si('…sin perder ninguna diaria por el fallo', vivos(RAIZ).length === Math.min(30, antes + 1), vivos(RAIZ).length);
FALLAR_COPIA_MENSUAL = false;

/* ══ 5 · listarBackups separa las dos mitades ═════════════════════════════ */
const l = API.listarBackups();
si('listarBackups responde ok', !!(l && l.ok));
si('…y distingue diarias de mensuales',
  !!(l.ok && l.data.diarios && l.data.mensuales && l.data.mensuales.length >= 13),
  l.ok ? (l.data.diarios || []).length + ' diarias / ' + (l.data.mensuales || []).length + ' mensuales' : '');

console.log(fails.length ? '\n❌ ' + fails.length + ' FALLOS' : '\n✅ TODO OK');
process.exit(fails.length ? 1 : 0);
