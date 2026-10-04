/**
 * sim_muerte.js — «Matar» una corrida a medias, y comparar el estado en que queda (tanda 2 del guardado seguro).
 *
 * 🔴 EL PROBLEMA QUE RESUELVE. Un script de Apps Script que muere (tiempo agotado, corte, el usuario cierra la
 * pestaña en mal momento) deja las escrituras que ya hizo y NINGUNA más. En Node, un error lanzado en la escritura
 * N no mata nada: los servicios están llenos de `try { … } catch (e) { return err(…) }` y de colas que se tragan
 * el error a propósito, así que la escritura N+1 aterriza igual, escrita por el código que se suponía muerto, y la
 * «muerte» queda como una excepción más. Aquí el bloqueo es PERMANENTE: desde la escritura N toda escritura
 * posterior lanza, la trague quien la trague, hasta que `reiniciar()` dice «el script vuelve a correr». Así una
 * matriz «muere tras la escritura N, reintenta con el mismo OP_ID, y el estado final tiene que ser el de una
 * corrida limpia» mide lo que dice medir.
 *
 * Qué cuenta como escritura (una por llamada del servicio, aunque el doble de repo llame a otro escritor por
 * dentro, igual que en producción una llamada a repoUpsert es UNA escritura lógica):
 *   · los escritores de la capa de repo y `escribirConfig` (la lista de episodio_al_guardar.js);
 *   · `CacheService.put` y `.remove`: el sello de operación es una escritura, y la última. Si una corrida
 *     «muerta» pudiera sellar, el reintento vería «ya hecho» sobre un estado a medias y la matriz saldría verde sin
 *     probar nada; y un corte justo entre la última escritura a hojas y el sello es EL caso que el id derivado y el
 *     «insertar si no existe» tienen que cubrir.
 * Solo cuenta lo que ATERRIZA (la llamada terminó sin lanzar). Las lecturas no se bloquean nunca: la corrida que
 * reintenta lee, y la muerta también puede leer sin que cambie nada.
 *
 * Uso (después de sim_srv.js; el orden con activarLockReal() no importa):
 *   const M = require('../sim/sim_muerte.js');
 *   const f = M.foto();                         // el estado de partida
 *   M.restaurar(f); op(); const limpio = M.instantanea({ sinHojas: ['AUDIT_LOG'] }); const total = M.total();
 *   for (let n = 0; n <= total + 1; n++) {
 *     M.restaurar(f); M.muereTrasLaEscritura(n); op();      // la muerta: su respuesta no importa
 *     M.reiniciar(); op();                                  // el reintento
 *     M.instantanea({ sinHojas: ['AUDIT_LOG'] }) === limpio // lo que se exige
 *   }
 */
'use strict';
const S = require('./sim_srv.js');
const { DB, CONFIG } = S;

const CODIGO = 'SIM_MUERTE';
// La MISMA lista que usa episodio_al_guardar.js para su espía de escrituras (la guardia del banco lo ata) y que la de
// repo.gs derivada del fuente (un escritor nuevo allá que no esté acá da rojo, en vez de cortes que no cortan).
const ESCRITORES = ['repoActualizar', 'repoActualizarDonde', 'repoInsertar', 'repoUpsert', 'repoUpsertEnFila',
  'repoEscribirFila', 'repoEliminarDonde', 'repoEliminarFilas', 'repoEliminarPorCols', 'repoInsertarVarios', 'escribirConfig'];
const ESCRITORES_CACHE = ['put', 'remove'];

class MuerteSimulada extends Error {
  constructor(msg) { super(msg); this.name = 'MuerteSimulada'; this.codigo = CODIGO; }
}

const E = { aterrizadas: [], bloqueadas: [], limite: null, murio: false, profundidad: 0 };

// Todas las escrituras pasan por aquí. `profundidad` evita contar dos veces a un escritor del simulador que llama a
// otro por dentro (repoUpsert → repoInsertar): hacia afuera es UNA escritura, y ni el conteo ni la muerte pueden
// caer «en medio» de ella.
function escribir(nombre, arg0, ejecutar) {
  if (E.profundidad > 0) return ejecutar();
  const etiqueta = nombre + '(' + String(arg0) + ')';
  if (E.murio) {
    E.bloqueadas.push(etiqueta);
    throw new MuerteSimulada('sim_muerte: la corrida murió tras la escritura ' + E.limite + '; ' + etiqueta + ' NO se hizo');
  }
  let r;
  E.profundidad++;
  try { r = ejecutar(); } finally { E.profundidad--; }
  E.aterrizadas.push(etiqueta);
  if (E.limite !== null && E.aterrizadas.length >= E.limite) E.murio = true;
  return r;
}

// ── Envolver (una sola vez por proceso) ──
ESCRITORES.forEach(n => {
  const orig = global[n];
  if (typeof orig !== 'function') throw new Error('sim_muerte: no existe el escritor global «' + n + '» (¿cambió sim_srv.js?)');
  global[n] = function () { return escribir(n, arguments[0], () => orig.apply(this, arguments)); };
});
// El caché se envuelve como el sim lo entrega, sea quien sea el que lo haya envuelto antes o lo envuelva después.
const cacheAnterior = global.CacheService;
global.CacheService = { getScriptCache: () => {
  const c = cacheAnterior.getScriptCache();
  return Object.assign({}, c, {
    put: (k, v, seg) => escribir('CacheService.put', k, () => c.put(k, v, seg)),
    remove: k => escribir('CacheService.remove', k, () => c.remove(k)),
  });
} };

// ── Control de la muerte ──
/** «El script vuelve a correr»: borra el conteo, la anotación y la muerte armada. */
function reiniciar() { E.aterrizadas = []; E.bloqueadas = []; E.limite = null; E.murio = false; E.profundidad = 0; }
/** La escritura N (1, 2, …) SÍ aterriza; desde ahí toda escritura lanza. N=0: muere antes de la primera. */
function muereTrasLaEscritura(n) {
  reiniciar();
  E.limite = n;
  if (n <= 0) E.murio = true;
}
const total = () => E.aterrizadas.length;
const registro = () => E.aterrizadas.slice();
const murio = () => E.murio;
const intentosTrasLaMuerte = () => E.bloqueadas.slice();

// ── La foto comparable ──
// Los ids que el sistema GENERA (contador del simulador, uid() con el reloj y un sufijo al azar, UUID reales) cambian
// de una corrida a otra aunque hagan lo mismo. Se renombran por orden de aparición en toda la foto: un renombre, no un
// borrado, así que «el mismo id en dos filas» y «dos ids distintos» siguen siendo distintos.
const VOLATILES = new Set(['TIMESTAMP', 'TS']);
const RE_ID_GENERADO = new RegExp([
  '\\buuid-?\\d+\\b',                                                                       // Utilities.getUuid() del simulador
  '\\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\b',                       // un UUID de verdad (crypto.randomUUID)
  '\\b[A-Za-z][A-Za-z0-9]*_\\d{13}(?:_[A-Z0-9]{5})?\\b',                                      // uid(): PREFIJO_<ms>_<5 al azar>, 'ENT_<ms>'
].join('|'), 'g');

function ordenado(v) {
  if (Array.isArray(v)) return v.map(ordenado);
  if (v && typeof v === 'object') { const o = {}; Object.keys(v).sort().forEach(k => { o[k] = ordenado(v[k]); }); return o; }
  return v;
}
function sinVolatiles(fila) {
  const o = {}; Object.keys(fila).forEach(k => { if (!VOLATILES.has(k)) o[k] = fila[k]; }); return o;
}

/**
 * Una línea por fila (HOJA {json}) y una por clave de CONFIG, en un orden estable, sin TIMESTAMP ni TS y con los ids
 * generados renombrados. Dos corridas iguales dan el MISMO texto, así que se compara con ===.
 * El orden físico de las filas CUENTA. @param {{sinHojas?: string[]}} [opts] sinHojas: hojas que no entran
 * (típicamente AUDIT_LOG, que en una matriz de muerte tiene filas de más por construcción; '__CONFIG' deja fuera
 * la configuración).
 */
function instantanea(opts) {
  const sin = new Set((opts && opts.sinHojas) || []);
  const lineas = [];
  Object.keys(DB).sort().forEach(h => {
    if (sin.has(h)) return;
    (DB[h] || []).forEach(fila => lineas.push(h + ' ' + JSON.stringify(ordenado(sinVolatiles(fila)))));
  });
  if (!sin.has('__CONFIG')) Object.keys(CONFIG).sort().forEach(k => lineas.push('__CONFIG ' + k + ' = ' + JSON.stringify(CONFIG[k])));
  const mapa = new Map();
  return lineas.join('\n').replace(RE_ID_GENERADO, id => {
    if (!mapa.has(id)) mapa.set(id, '<id' + (mapa.size + 1) + '>');
    return mapa.get(id);
  });
}

/**
 * Qué líneas sobran y cuáles faltan entre dos instantáneas ('- ' solo en a, '+ ' solo en b). Es para leer una matriz
 * roja sin comparar a ojo dos fotos largas. Cero líneas con textos distintos = solo cambió el ORDEN de las filas.
 */
function diferencias(a, b) {
  const contar = t => { const m = new Map(); String(t).split('\n').forEach(l => m.set(l, (m.get(l) || 0) + 1)); return m; };
  const A = contar(a), B = contar(b), out = [];
  A.forEach((n, l) => { const d = n - (B.get(l) || 0); if (d > 0) out.push('- ' + l + (d > 1 ? '  (x' + d + ')' : '')); });
  B.forEach((n, l) => { const d = n - (A.get(l) || 0); if (d > 0) out.push('+ ' + l + (d > 1 ? '  (x' + d + ')' : '')); });
  return out;
}

// ── Volver al mismo punto de partida cuantas veces haga falta ──
/** Copia del estado del servidor simulado: hojas y CONFIG. (El caché no se copia: cada escenario parte vacío.) */
function foto() { return { DB: structuredClone(DB), CONFIG: structuredClone(CONFIG) }; }
/**
 * Devuelve el mundo EXACTO de la foto: hojas (las listas se rellenan en sitio, para que una referencia a
 * `DB.CAMAS_ESTADO` no quede apuntando a una hoja vieja; las hojas que no estaban se quitan), CONFIG y caché
 * vacío. La misma foto sirve más de una vez. Reinicia la muerte: es otro escenario, no el reintento.
 * 🪤 NO se llama entre la corrida muerta y su reintento: el caché (el sello) y las hojas tienen que llegar tal cual.
 */
function restaurar(f) {
  Object.keys(DB).forEach(h => { if (!(h in f.DB)) delete DB[h]; });
  Object.keys(f.DB).forEach(h => {
    const dest = DB[h] || (DB[h] = []);
    dest.length = 0;
    structuredClone(f.DB[h]).forEach(r => dest.push(r));
  });
  Object.keys(CONFIG).forEach(k => delete CONFIG[k]);
  Object.assign(CONFIG, structuredClone(f.CONFIG));
  global.__simCacheReset();
  reiniciar();
}

module.exports = {
  CODIGO, ESCRITORES, ESCRITORES_CACHE, MuerteSimulada,
  muereTrasLaEscritura, reiniciar, total, registro, murio, intentosTrasLaMuerte,
  instantanea, diferencias, foto, restaurar,
};
