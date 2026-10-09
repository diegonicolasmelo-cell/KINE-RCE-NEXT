/**
 * infra_lock.gs — Concurrencia. Envuelve escrituras en un lock de script.
 * Regla: SOLO las funciones públicas del dispatcher usan conLock().
 * Dentro del lock se llaman versiones internas SIN lock (evita deadlock).
 *
 * ── 🔐 EL SELLO DE OPERACIÓN (G16, tanda 2 del guardado seguro, 4-oct-2026) ──────────────────────────────────────────
 * El mismo guardado puede llegar DOS VECES: el reintento automático de la pantalla (a los 3 s) y los dos dedos del
 * kinesiólogo. Re-guardar un turno es inocuo (actualiza), pero ingresar a la misma cama contesta «ya está ocupada» al
 * reintento de su propio éxito, una evaluación se inserta dos veces, una entrega de turno nace con `'ENT_' + Date.now()`
 * y un ajuste de stock suma dos veces: ninguna puerta tiene cómo saber que «esto ya lo hice».
 *
 * La pantalla acuña un `OP_ID` por INTENCIÓN (no por clic: ver el embudo de index.html) y viaja en `datos.OP_ID`, un
 * campo transitorio que NO es columna de ninguna hoja —igual que `EPISODIO_ABIERTO`—. `_auditar` (api.gs) lo arma como
 * `OP_ACTUAL` ANTES de llamar al servicio, y este archivo hace el resto: dentro del PRIMER `conLock` de la petición,
 * apenas se tiene el candado, mira si esa operación ya terminó bien con ese mismo contenido; si sí, devuelve lo que
 * contestó (con `repetida: true`) sin tocar ninguna hoja. Si no, corre el cuerpo y, solo si salió limpio, la sella.
 *
 *   · DENTRO del lock, para leer y para escribir. Fuera de él, el reintento que esperaba el candado mientras el original
 *     terminaba no vería el sello, y los dos ejecutarían.
 *   · El sello se escribe DESPUÉS de `SpreadsheetApp.flush()`. Sellar antes dejaba un hueco: un corte entre el sello y
 *     el flush deja un «ya hecho» que NO está escrito en la planilla, y el reintento no la haría nunca.
 *   · SOLO si `ok` y sin `data.advertencias`. Un rechazo no se sella (reintentar vuelve a evaluar: la cama pudo
 *     liberarse), y una respuesta con avisos tampoco (las colas que fallaron las tiene que completar el reintento).
 *   · FAIL-OPEN. El caché es una ayuda, no una puerta: sin OP_ID, con uno mal formado, o si CacheService lanza (al leer o
 *     al escribir), la operación corre exactamente como hoy. Lo que cubre la falta del sello son los ids derivados y el
 *     «insertar si no existe» de cada puerta (`uid(prefijo, clave)`, infra_util.gs).
 *   · Lo guardado son ids y banderas (`_selloDepurar`), nunca un nombre, un RUT ni un texto: el sello vive 6 horas en la
 *     memoria temporal del propio proyecto de Apps Script y no tiene por qué cargar nada clínico. (Tampoco la `accion` de la
 *     respuesta: en el ➕ es el texto de quien anota. Ver `_SELLO_CLAVES`.)
 *
 * 🪤 Es `var` y no `const` por una razón de arnés: las const no cuelgan de globalThis con el eval indirecto del
 * simulador, y `api.gs` la asigna desde otro archivo. En Apps Script da igual (un solo ámbito global).
 */

/**
 * La operación de ESTA petición, o null si no trae OP_ID válido: `{id, accion, h, texto, tomado, repetida}`.
 * La arma `_auditar` (api.gs) y la devuelve a lo que era cuando el servicio termina, salga como salga.
 *   id        el OP_ID tal como llegó
 *   accion    la acción del dispatcher (el OP_ID de otra acción es otra operación)
 *   h         la huella del payload (sin OP_ID), tomada ANTES de que el servicio mute los datos
 *   texto     el TEXTO_GENERADO del payload, capturado antes de la mutación (guardarEvolucion lo reescribe)
 *   tomado    ya participó el primer conLock de la petición
 *   repetida  este conLock devolvió la respuesta sellada (api.gs no vuelve a auditar la acción)
 */
var OP_ACTUAL = null;

/** Lo que dura un sello: 6 horas, el máximo que admite CacheService. */
var _SELLO_TTL_SEG = 21600;
/** Un sello de más de esto se descarta: el caché admite 100 KB por valor y un put que lanza no puede tumbar nada. */
var _SELLO_MAX_CHARS = 90000;
/**
 * Lo único que se recuerda de una respuesta: ids. Las banderas (verdadero/falso) pasan aparte.
 *
 * 🔴 `accion` y `entidad` NO están (revisión de la tanda 2, H10 y H15). Parecían inocuas —una etiqueta corta— y no lo son: en
 * ANEXAR_EVENTO la acción ES el texto clínico libre de quien anota («evento rápido: <la nota, el hallazgo del cultivo, el detalle>») y en
 * ANULAR_ANEXO lleva el nombre del anexo, y cortarla a 80 caracteres dejaba igual el principio del texto en el caché seis horas. Tampoco
 * hacen falta: la bitácora ya las anotó en la primera respuesta (la repetida no vuelve a auditar) y ningún sitio de la pantalla las lee de una
 * respuesta (build/checks/guardado_seguro_operacion_g16.js, sección 29, lo ata). La regla: una clave nueva en esta lista tiene que ser un ID,
 * jamás un texto que alguien escribió.
 */
var _SELLO_CLAVES = ['idCama', 'idEvolucion', 'id', 'patientId', 'turnoKey'];
/**
 * Los números que se recuerdan de UNA acción (H13): la pantalla los lee de la respuesta y la repetida los perdería. El lote de ventiladores
 * dice «N ventiladores movidos» con `total`, y sin él una respuesta repetida decía «0». Es un CONTEO; el mismo nombre en otra acción puede ser
 * otra cosa (en EVAL_REGISTRAR `total` es el puntaje de una escala del paciente, un dato clínico), por eso va POR ACCIÓN y no en la lista de arriba.
 */
var _SELLO_NUMEROS = { MOVER_VENTILADORES_LOTE: ['total'] };

function conLock(fn) {
  // El sello es del PRIMER conLock de la petición: los servicios hacen uno por acción, y si algún día hicieran dos
  // seguidos, el segundo no tendría por qué devolver la respuesta guardada del primero. Se toma ANTES de esperar el
  // candado: lo que ocurra mientras se espera (otra petición que se adelanta) no debe cambiar de qué operación se trata.
  const op = (OP_ACTUAL && !OP_ACTUAL.tomado) ? OP_ACTUAL : null;
  if (op) op.tomado = true;

  const lock = LockService.getScriptLock();
  let got = false;
  try {
    got = lock.tryLock(10000); // no lanza excepción: devuelve boolean
    if (!got) return err('Sistema ocupado (otra escritura en curso). Reintenta.', ERR.LOCK_TIMEOUT);
    if (!op) return fn();

    const sello = _selloLeer(op);
    if (sello && sello.h === op.h) { op.repetida = true; return _selloRepetida(op, sello); }
    // Misma OP_ID con otra huella: el usuario editó entre un intento y otro. Es otra intención: se ejecuta, y el sello
    // nuevo REEMPLAZA al viejo (no se rechaza: lo que se escribió es lo que vale).
    const r = fn();
    _selloGuardar(op, r);
    return r;
  } finally {
    if (got) lock.releaseLock();
  }
}

/** Clave del sello en el caché. Un OP_ID válido no lleva «|», así que la clave no se puede confundir con otra. */
function _selloClave(op) { return 'op|' + op.accion + '|' + op.id; }

/** Lo sellado de esta operación, o null: sin sello, ilegible, o con el caché caído (fail-open). */
function _selloLeer(op) {
  try {
    const crudo = CacheService.getScriptCache().get(_selloClave(op));
    if (!crudo) return null;
    const s = JSON.parse(crudo);
    return (s && typeof s === 'object' && typeof s.h === 'string') ? s : null;
  } catch (e) { return null; }
}

/**
 * Sella la operación que acaba de terminar, o no hace nada. Nunca lanza: si el caché falla, la operación ya está
 * hecha y contesta igual. Es la ÚLTIMA escritura de la petición: va después del flush.
 */
function _selloGuardar(op, r) {
  try {
    if (!r || r.ok !== true) return;                         // un rechazo no se sella: reintentar vuelve a evaluar
    const adv = r.data && r.data.advertencias;
    if (adv && (!Array.isArray(adv) || adv.length)) return;  // quedó algo a medias: el reintento tiene que completarlo
    const valor = JSON.stringify({ h: op.h, d: _selloDepurar(r.data, op.accion), t: Date.now() });
    if (valor.length > _SELLO_MAX_CHARS) return;
    SpreadsheetApp.flush();                                  // primero lo escrito, recién después el «ya hecho»
    CacheService.getScriptCache().put(_selloClave(op), valor, _SELLO_TTL_SEG);
  } catch (e) { /* fail-open: ver arriba */ }
}

/** La respuesta de la repetición: lo sellado, la bandera y el texto del payload de ESTA petición (no se sella). */
function _selloRepetida(op, sello) {
  const d = Object.assign({}, sello.d || {});
  if ('TEXTO_GENERADO' in d) d.TEXTO_GENERADO = op.texto || '';
  d.repetida = true;
  return ok(d);
}

/**
 * De la respuesta `data`, solo lo que puede viajar al caché: ids (de las claves de `_SELLO_CLAVES`), banderas booleanas y, de
 * ciertas acciones, un conteo (`_SELLO_NUMEROS`). Nunca un nombre, un RUT, un diagnóstico ni un texto, ni un objeto ni una lista: el
 * sello no tiene por qué cargar nada clínico. `TEXTO_GENERADO` queda como marca vacía para que la repetición sepa que debe devolver el
 * del payload. `accion` y `entidad` NO pasan, ni acotadas: la primera lleva texto escrito por la persona (ver `_SELLO_CLAVES`).
 *
 * @param d       la `data` de la respuesta.
 * @param accion  la acción del dispatcher, para los números que solo esa acción puede sellar (opcional: sin ella no pasa ninguno).
 */
function _selloDepurar(d, accion) {
  const o = {};
  if (!d || typeof d !== 'object' || Array.isArray(d)) return o;
  const numeros = (accion && _SELLO_NUMEROS[accion]) || [];
  Object.keys(d).forEach(function (k) {
    const v = d[k];
    if (typeof v === 'boolean') { o[k] = v; return; }
    if (k === 'TEXTO_GENERADO') { o[k] = ''; return; }
    if (numeros.indexOf(k) !== -1) { if (typeof v === 'number' && isFinite(v)) o[k] = v; return; }
    if (_SELLO_CLAVES.indexOf(k) === -1) return;
    if ((typeof v === 'number' && isFinite(v)) || typeof v === 'string') o[k] = v;
  });
  return o;
}

/**
 * Huella del CONTENIDO de un payload, sin el OP_ID: JSON canónico (claves ordenadas, también las anidadas) resumido con
 * `_huellaTexto`. El mismo contenido da la misma huella llegue como llegue; otro contenido, otra. Es JS puro y NO
 * `credHuellaDe`, que es la primitiva de las CLAVES y cuyo texto no se toca (ver infra_util.gs).
 */
function _huellaPayload(datos) {
  const d = {};
  Object.keys(datos || {}).forEach(function (k) { if (k !== 'OP_ID') d[k] = datos[k]; });
  const t = _canonico(d);
  return _huellaTexto(t) + '.' + t.length.toString(36);
}

/** JSON con las claves ordenadas. `undefined` y las funciones no viajan por JSON: una clave con undefined es una ausente. */
function _canonico(v) {
  if (v === undefined || v === null || typeof v === 'function') return 'null';
  if (Array.isArray(v)) return '[' + v.map(_canonico).join(',') + ']';
  if (typeof v === 'object') {
    return '{' + Object.keys(v).sort()
      .filter(function (k) { return v[k] !== undefined && typeof v[k] !== 'function'; })
      .map(function (k) { return JSON.stringify(k) + ':' + _canonico(v[k]); }).join(',') + '}';
  }
  return JSON.stringify(v);
}
