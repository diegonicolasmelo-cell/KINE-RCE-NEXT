/**
 * infra.gs — fusión de 6 archivos del repo (infra_respuesta.gs, infra_util.gs, infra_fechas.gs, infra_lock.gs, infra_log.gs, infra_auth.gs).
 * En Apps Script todos los archivos comparten un mismo espacio global:
 * la fusión es organizativa, el código es idéntico.
 */


// ════════════════════════════════════════════════════════════════════
// ── infra_respuesta.gs ──
// ════════════════════════════════════════════════════════════════════

/**
 * infra_respuesta.gs — Respuesta estándar de toda la API.
 * Todas las funciones públicas devuelven {ok:true,data} o {ok:false,error,codigo}.
 */

const ERR = {
  LOCK_TIMEOUT:  'LOCK_TIMEOUT',
  VALIDACION:    'VALIDACION',
  // 🔴 CONFLICTO (G14/G15, 4-oct-2026) — «el mundo cambió mientras yo escribía»: lo que la persona pidió era válido
  // cuando abrió la pantalla y ya no lo es porque OTRA persona se adelantó (ocupó la cama, la limpió, la cambió).
  // No es VALIDACION: un dato mal escrito se corrige y se reintenta, y esto no se arregla corrigiendo nada —lo que
  // hay que hacer es mirar cómo está la cama ahora—. Existe aparte para que la pantalla pueda distinguirlo por el
  // código (no por el texto del mensaje), mostrarlo en rojo y NO reintentarlo solo: reenviar lo mismo recibe lo mismo.
  CONFLICTO:     'CONFLICTO',
  NO_AUTORIZADO: 'NO_AUTORIZADO',
  NO_ENCONTRADO: 'NO_ENCONTRADO',
  INTERNO:       'INTERNO',
};

function ok(data) {
  return { ok: true, data: (data === undefined ? null : data) };
}

function err(msg, codigo, e) {
  if (e) console.error(msg, e);
  return { ok: false, error: msg, codigo: codigo || ERR.INTERNO };
}


// ════════════════════════════════════════════════════════════════════
// ── infra_util.gs ──
// ════════════════════════════════════════════════════════════════════

/**
 * Huella de una clave. Primitiva ÚNICA de todo el proyecto: SHA-256 del texto
 * que se le pase, en base64.
 *
 * 🪤 Recibe el texto YA ARMADO a propósito, en vez de armarlo aquí con
 * usuario+sal. Hay dos espacios de credenciales —el Modo Coordinación y el
 * acceso del turno— y cada uno arma su texto con su propio separador, así una
 * clave de coordinación no abre el turno ni al revés. Si esta función armara
 * el texto, cambiarla para el espacio nuevo habría invalidado TODAS las claves
 * de coordinación que ya existen en la planilla de Diego: nadie habría podido
 * entrar y el motivo no se vería en ninguna parte.
 */
function credHuellaDe(crudo) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(crudo), Utilities.Charset.UTF_8);
  return Utilities.base64Encode(bytes);
}

// 🪤 Vive en infra_util y no en infra_auth, que sería su sitio natural, por una
// razón de arnés: el simulador (`build/sim/sim_srv.js`) y el banco de medición
// NO cargan infra_auth, así que una función de identidad puesta allá revienta
// con «no está definida» en cuanto svc_coordinacion la llama. Se vio al mover
// la huella de las claves el 15-sep-2026.

/**
 * infra_util.gs — Utilidades transversales chicas.
 */

/** TRUE/'TRUE'/'1'/'SI'/'SÍ'/'YES'/1 → true. */
function esVerdadero(v) {
  if (v === true || v === 1) return true;
  if (typeof v === 'string') {
    const s = v.trim().toUpperCase();
    return s === 'TRUE' || s === '1' || s === 'SI' || s === 'SÍ' || s === 'YES';
  }
  return false;
}

/**
 * ID único legible con prefijo.
 *
 * 🔐 Con `clave` (G16, tanda 2 del guardado seguro) el id DEJA DE SER AZAROSO cuando hay una operación en curso
 * (`OP_ACTUAL`, la que arma `_auditar` a partir del OP_ID de la pantalla, ver infra_lock.gs):
 *
 *     uid('PROC', '')                          → PROC_<op>
 *     uid('HITO', 'nota|3|<pid>|<texto>')      → HITO_<op>_<huella de la clave>
 *     uid('PROC')                              → PROC_<ms>_<azar>      (como siempre)
 *
 * POR QUÉ. Cuando el sello no está (la corrida murió a medias, el caché se evaporó o expiró a las 6 h), el reintento con
 * el mismo OP_ID tiene que poder reconocer lo que ya escribió su primer intento. Con un id azaroso cada intento inserta
 * una fila nueva y el registro queda duplicado; con el id derivado del OP_ID el reintento calcula el MISMO id, y la
 * puerta puede preguntar «¿ya existe?» (repoBuscarFila) antes de insertar.
 *
 * 🔴 LA CLAVE ES DE CONTENIDO, NO UN CONTADOR. Un reintento que se salta pasos ya hechos correría los números y
 * chocaría con OTRO hito de la misma operación. La clave es lo que identifica al registro en lógica (tipo, cama,
 * paciente, texto): dos hitos distintos de una misma operación tienen claves distintas, y uno idéntico es justo lo que
 * se quiere deduplicar.
 *
 * `clave` ausente (undefined/null) = el formato de siempre: los bancos y los registros antiguos no cambian, y nadie debe
 * parsear ni ordenar por este id. `clave` vacía ('') = un solo registro de ese tipo por operación.
 * 🪤 `typeof OP_ACTUAL` NO es una comprobación de seguridad sino compatibilidad: la variable se declara en infra_lock.gs
 * y los bancos que no lo cargan ni la tienen declarada; ahí cae al formato de siempre.
 */
function uid(prefix, clave) {
  const p = prefix || 'ID';
  if (clave !== undefined && clave !== null && typeof OP_ACTUAL !== 'undefined' && OP_ACTUAL && OP_ACTUAL.id) {
    const k = String(clave);
    return p + '_' + OP_ACTUAL.id + (k === '' ? '' : '_' + _huellaTexto(k));
  }
  return p + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7).toUpperCase();
}

/**
 * Huella de un texto: 53 bits (cyrb53), JS puro, en base 36. NO es criptográfica ni protege nada: sirve para que el mismo
 * contenido dé el mismo número y otro contenido, con casi toda seguridad, otro. La usan el sello de operación (huella del
 * payload) y los ids derivados de `uid(prefijo, clave)`.
 * 🪤 No es `credHuellaDe`, que es SHA-256 de CLAVES y cuyo texto no se toca; y vive acá y no en infra_lock.gs porque
 * `uid` la necesita y los bancos antiguos cargan infra_util.gs pero no infra_lock.gs.
 */
function _huellaTexto(texto) {
  const s = String(texto);
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/**
 * Valor de CONFIG por clave (con default opcional).
 *
 * Va por el MISMO memo que `leerConfig` (ver esquema.gs) en vez de consultar la
 * hoja: esta función corre en el camino de autenticación, o sea en TODAS las
 * llamadas al servidor y no solo al arrancar, y cada consulta costaba una
 * lectura completa de CONFIG. La diferencia teórica con la versión anterior
 * (una clave presente pero con valor vacío ahora cae al default en vez de
 * devolver '') no afecta a ningún llamador: los cuatro usos reales pasan '' o
 * nada como default.
 */
function configVal(clave, def) {
  return leerConfig(clave, def !== undefined ? def : '');
}

// ── Configuración y catálogos: una sola lectura por PETICIÓN (ago-2026) ─────
// CONFIG, CATALOGOS y CAT_MATRICES son tablas chicas de configuración que no
// cambian mientras se atiende una petición, pero se volvían a bajar del Sheet
// cada vez que alguien preguntaba (el arranque consulta CONFIG 17 veces). El
// memo vive lo que dura la petición: `api()` lo olvida al entrar y las
// escrituras lo invalidan, así que nadie puede leer configuración vieja.
// Se devuelve siempre una copia para que ningún llamador mute lo memorizado.
var _CAT_MEMO = {};
var _MEMO_OFF = false;   // solo lo levanta medirArranque(), para comparar con/sin

/** ¿Memo desactivado? (medición) */
function _memoApagado() { return _MEMO_OFF === true; }

/** Olvida los catálogos memorizados (tras escribir en ellos). */
function _catInvalidar() { _CAT_MEMO = {}; }

/**
 * Olvida TODO lo memorizado de la petición anterior. Lo llama `api()` al
 * entrar. En Apps Script cada petición es un proceso nuevo y esto no cambia
 * nada; el simulador, en cambio, atiende muchas peticiones en un mismo proceso
 * de Node, y sin este reseteo una prueba vería la configuración de la anterior.
 */
function _memoReset() {
  _CAT_MEMO = {};
  if (typeof _CFG_MEMO !== 'undefined') _CFG_MEMO = null;
  if (typeof _TZ_MEMO !== 'undefined') _TZ_MEMO = null;
}

/** Valores activos de un catálogo (CATALOGOS), ordenados. */
function catalogo(tipo) {
  const k = 'CATALOGOS/' + tipo;
  if (_CAT_MEMO[k] && !_memoApagado()) return _CAT_MEMO[k].slice();
  const out = repoLeerTodos('CATALOGOS', 'TIPO', tipo)
    .filter(r => esVerdadero(r.ACTIVO))
    .sort((a, b) => (parseInt(a.ORDEN) || 0) - (parseInt(b.ORDEN) || 0))
    .map(r => r.VALOR);
  if (!_memoApagado()) _CAT_MEMO[k] = out;
  return out.slice();
}

/**
 * Agrega una fase clínica al catálogo compartido (CATALOGOS/FASE_CLINICA).
 * Valida nombre no vacío y rechaza duplicado (case-insensitive). ORDEN = max+1.
 * @return {Object} ok({ fases:[...], ... }) o err(...)
 */
function agregarFaseClinica(nombre) {
  const nom = String(nombre || '').trim();
  if (!nom) return err('El nombre de la fase no puede estar vacío.', ERR.VALIDACION);
  const filas = repoLeerTodos('CATALOGOS', 'TIPO', 'FASE_CLINICA');
  const dup = filas.some(r => String(r.VALOR || '').trim().toLowerCase() === nom.toLowerCase());
  if (dup) return err('La fase "' + nom + '" ya existe.', ERR.VALIDACION);
  const maxOrden = filas.reduce((m, r) => Math.max(m, parseInt(r.ORDEN) || 0), 0);
  repoInsertar('CATALOGOS', { TIPO: 'FASE_CLINICA', VALOR: nom, ORDEN: maxOrden + 1, ACTIVO: true });
  _catInvalidar();   // la fase recién creada tiene que salir en la lista que se devuelve
  return ok({ fases: catalogo('FASE_CLINICA'), entidad: 'CATALOGOS', accion: 'agregar fase: ' + nom });
}

/**
 * Definición activa de las matrices de categorización (hoja CAT_MATRICES),
 * ordenada. null si la hoja no existe aún (el cliente usa su default SOCHIMI).
 */
function catMatrices() {
  if (_CAT_MEMO['CAT_MATRICES'] !== undefined && !_memoApagado()) {
    const m = _CAT_MEMO['CAT_MATRICES'];
    return m ? m.slice() : null;
  }
  try {
    const filas = repoLeerTodos('CAT_MATRICES')
      .filter(r => esVerdadero(r.ACTIVA) && r.MATRIZ && r.VARIABLE)
      .sort((a, b) => (parseInt(a.ORDEN) || 0) - (parseInt(b.ORDEN) || 0))
      .map(r => ({ m: String(r.MATRIZ).trim().toUpperCase(), v: String(r.VARIABLE).trim().toUpperCase(),
                   u2: String(r.UMBRAL_2 || '').trim(), u3: String(r.UMBRAL_3 || '').trim() }));
    const out = filas.length ? filas : null;
    if (!_memoApagado()) _CAT_MEMO['CAT_MATRICES'] = out;
    return out ? out.slice() : null;
  } catch (e) { return null; }
}


// ════════════════════════════════════════════════════════════════════
// ── infra_fechas.gs ──
// ════════════════════════════════════════════════════════════════════

/**
 * infra_fechas.gs — Fechas y tiempos en la zona horaria del sistema.
 * La TZ se lee de CONFIG.TIMEZONE (default America/Santiago) vía _tz() de esquema.gs.
 * Las fechas se manejan como texto ISO "yyyy-MM-dd" y se comparan por string.
 */

function hoyISO() {
  return Utilities.formatDate(new Date(), _tz(), 'yyyy-MM-dd');
}

function ahoraTS() {
  return Utilities.formatDate(new Date(), _tz(), 'yyyy-MM-dd HH:mm:ss');
}

/** Días completos entre dos fechas ISO (>=0). */
function diasEntre(desdeISO, hastaISO) {
  if (!desdeISO || !hastaISO) return 0;
  try {
    const d1 = new Date(String(desdeISO).slice(0, 10) + 'T00:00:00');
    const d2 = new Date(String(hastaISO).slice(0, 10) + 'T00:00:00');
    const diff = d2 - d1;
    return diff < 0 ? 0 : Math.floor(diff / 86400000);
  } catch (e) { return 0; }
}

/**
 * turnoLogicoServidor — ESPEJO de _turnoLogico del cliente (index.html), con
 * los MISMOS cortes de CONFIG (tanda 2b, sep-2026). Existe porque la
 * importación de la GSA corre en el servidor: un gas de las 04:00 pertenece a
 * la NOCHE del día anterior, y si la unidad cambia los horarios en CONFIG los
 * dos lados tienen que moverse juntos (la guardia gsa_importada lo compara).
 * @return {{fecha:string, turno:string, turnoKey:string}}
 */
function turnoLogicoServidor(fechaISO, hora) {
  const dia = parseInt(leerConfig('TURNO_DIA_INICIO', '8'), 10) || 8;
  const noche = parseInt(leerConfig('TURNO_NOCHE_INICIO', '20'), 10) || 20;
  const h = parseInt(String(hora || '00:00').slice(0, 2), 10) || 0;
  let f = String(fechaISO || '').slice(0, 10), turno;
  if (h >= dia && h < noche) turno = 'Dia';
  else { turno = 'Noche'; if (h < dia) f = _restarDias(f, 1); }
  return { fecha: f, turno: turno, turnoKey: f + '-' + turno };
}

/** Hora actual "HH:mm". Se deriva de ahoraTS() para que exista UNA sola
    fuente de reloj (los arneses y la simulación la sustituyen). */
function _horaAhora() {
  const h = String(ahoraTS()).slice(11, 16);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(h) ? h : '00:00';
}

/** Momento actual como 'yyyy-MM-dd HH:mm'. */
function _tsAhora() {
  return hoyISO() + ' ' + _horaAhora();
}

/**
 * Momento a partir de una hora escrita a mano: se asume la ocurrencia MÁS
 * RECIENTE de esa hora (hoy si ya pasó, ayer si todavía no). Así, anotar
 * «02:00» a las 05:00 de la madrugada apunta a hace 3 h, y «23:00» a anoche.
 */
function _tsDesdeHora(hora) {
  const h = _horaValida(hora);
  if (!h) return '';
  const hoy = hoyISO(), ahora = _horaAhora();
  if (h <= ahora) return hoy + ' ' + h;
  const d = new Date(hoy + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10) + ' ' + h;
}

/**
 * ⏱️ DÍAS DE VM POR BLOQUES DE 24 HORAS (Diego, 11-sep-2026: «los días de VM
 * se cuentan respecto a las HORAS de VM: hora de ingreso si vienen ventilados,
 * o fecha y hora de intubación»). La ESTADÍA sigue por calendario, como la
 * lista oficial (BUDA): él lo confirmó ese día («1 sí»).
 * Interruptor CONFIG.VM_POR_HORAS (TRUE): en FALSE vuelve a calendario sin
 * pegar nada, y las guardias prueban las dos reglas.
 */
function vmPorHoras() {
  return String(leerConfig('VM_POR_HORAS', 'TRUE') || 'TRUE').trim().toUpperCase() !== 'FALSE';
}

/** Bloques COMPLETOS de 24 h entre dos momentos 'yyyy-MM-dd HH:mm'. null si no se puede. */
function diasBloques(tsDesde, tsHasta) {
  const h = _horasEntreTS(tsDesde, tsHasta);
  return h === '' ? null : Math.floor(h / 24);
}

/**
 * Momento de referencia de un TURNO para contar bloques: la hora en que PARTE
 * el turno (CONFIG TURNO_DIA_INICIO / TURNO_NOCHE_INICIO), o sea cuando se abre
 * la hoja nueva. Así el número de la hoja del turno es estable (no cambia si se
 * re-guarda a otra hora) y coincide con «se actualiza al cambio de turno».
 */
function _tsInicioTurno(fechaISO, turno) {
  const f = String(fechaISO || '').slice(0, 10);
  if (!f) return '';
  const dia = parseInt(leerConfig('TURNO_DIA_INICIO', '8'), 10) || 8;
  const noche = parseInt(leerConfig('TURNO_NOCHE_INICIO', '20'), 10) || 20;
  const h = String(turno) === 'Noche' ? noche : dia;
  return f + ' ' + (h < 10 ? '0' + h : String(h)) + ':00';
}

/**
 * Días de VM de un tramo: bloques de 24 h desde el momento de inicio
 * (TS_INICIO_SOPORTE) hasta el momento de referencia; si falta la hora —
 * episodios anteriores a la v5.19— o el interruptor está en FALSE, calendario
 * (diasEntre), que es lo que había. Nunca negativo.
 */
function diasVMReloj(tsInicio, fechaInicio, tsRef, fechaRef) {
  if (vmPorHoras() && tsInicio && tsRef) {
    const b = diasBloques(tsInicio, tsRef);
    if (b !== null) return Math.max(0, b);
    if (_msDeTS(tsInicio) !== null && _msDeTS(tsRef) !== null) return 0;   // ref anterior al inicio: aún 0
  }
  return diasEntre(fechaInicio, fechaRef);
}

/** Parte fecha / hora de un momento 'yyyy-MM-dd HH:mm'. */
function _tsFecha(ts) { return String(ts || '').slice(0, 10); }
function _tsHora(ts)  { return _horaValida(String(ts || '').slice(11, 16)); }

/** Normaliza una hora a "HH:mm"; devuelve '' si no es una hora válida. */
function _horaValida(h) {
  const s = String(h == null ? '' : h).trim().slice(0, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : '';
}

/**
 * Días completos por BLOQUES DE 24 HORAS (ago-2026, pedido de Diego: «un
 * paciente que llegó hace un par de horas no puede aparecer con día 1»).
 * Cuenta cuántos bloques de 24 h transcurrieron entre el inicio (fecha+hora)
 * y el momento de referencia. SIN hora de inicio cae al conteo por días
 * calendario de siempre, para no alterar lo ya registrado.
 * Es el mismo criterio del sistema del hospital.
 */
function diasBloques24(desdeTS, fechaCal, hastaISO, hastaHora) {
  // desdeTS: momento real 'yyyy-MM-dd HH:mm'. Si no hay (episodios antiguos),
  // se cuenta por días calendario desde fechaCal, como siempre.
  const desdeISO = _tsFecha(desdeTS), desdeHora = _tsHora(desdeTS);
  if (!desdeISO || !desdeHora) return (fechaCal && hastaISO) ? diasEntre(fechaCal, hastaISO) : 0;
  if (!hastaISO) return 0;
  try {
    const t = function (f, h) {
      const hh = String(h || '00:00').slice(0, 5);
      return new Date(String(f).slice(0, 10) + 'T' + (/^\d{2}:\d{2}$/.test(hh) ? hh : '00:00') + ':00');
    };
    const diff = t(hastaISO, hastaHora || '00:00') - t(desdeISO, desdeHora);
    return diff < 0 ? 0 : Math.floor(diff / 86400000);
  } catch (e) { return diasEntre(desdeISO, hastaISO); }
}

/**
 * Fecha EFECTIVA de un turno: la Noche fecha al día siguiente.
 *
 * El turno de noche transcurre casi entero pasada la medianoche, así que lo
 * que ocurre en él pertenece al día siguiente. Lo usan los relojes de
 * dispositivos (v5.20, «la noche del 31 se anota con el 01») y, desde ago-2026,
 * también los DÍAS DE ESTADÍA / VM / VA: manda la lista oficial del hospital
 * (BUDA), que se actualiza al cambiar el calendario.
 *
 * Vivía en svc_eventos.gs; se mudó aquí al necesitarla svc_evoluciones,
 * svc_entrega y mantenimiento_manuel — es un helper de fechas, no de eventos.
 */
function _fechaEfectivaTurno(fecha, turno) {
  const f = String(fecha || '').slice(0, 10);
  if (String(turno) !== 'Noche') return f;
  const d = new Date(f + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Momento de referencia de un TURNO para contar los bloques de 24 h: la
 * un punto FIJO dentro del turno (Día → 15:00; Noche → 03:00 del día siguiente).
 * No es la mitad exacta y no se mueve con los horarios de CONFIG: así re-editar
 * una evolución —o cambiar el horario— no cambia los días ya contados.
 */
function refTurno(fechaISO, turno) {
  const f = String(fechaISO || '').slice(0, 10);
  if (String(turno) === 'Noche') {
    const d = new Date(f + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return { fecha: d.toISOString().slice(0, 10), hora: '03:00' };
  }
  return { fecha: f, hora: '15:00' };
}

/** Fecha ISO menos N días (para plegar "días previos" en el ancla de un contador). */
function _restarDias(fechaISO, n) {
  try {
    const d = new Date(String(fechaISO).slice(0, 10) + 'T00:00:00');
    d.setDate(d.getDate() - (parseInt(n) || 0));
    return Utilities.formatDate(d, _tz(), 'yyyy-MM-dd');
  } catch (e) { return fechaISO; }
}

/**
 * Momento REAL de un evento anotado con hora dentro de un turno.
 * El turno Noche cruza la medianoche: 20:00 es del día del turno y 03:00 ya es
 * del día siguiente. Sin hora escrita cae a la referencia del turno.
 * Devuelve 'yyyy-MM-dd HH:mm'.
 */
function _tsEventoTurno(fecha, turno, hora) {
  var f = String(fecha || '').slice(0, 10);
  if (!f) return '';
  var h = _horaValida(hora);
  if (!h) { var r = refTurno(f, turno); return r.fecha + ' ' + r.hora; }
  if (String(turno) === 'Noche' && parseInt(h.slice(0, 2), 10) < 12) f = _restarDias(f, -1);
  return f + ' ' + h;
}

/** 'yyyy-MM-dd HH:mm' → milisegundos (sin depender del parser de cada motor). */
function _msDeTS(ts) {
  var m = String(ts || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}

/** Horas entre dos marcas 'yyyy-MM-dd HH:mm' (1 decimal). '' si no se puede. */
function _horasEntreTS(desde, hasta) {
  var a = _msDeTS(desde), b = _msDeTS(hasta);
  if (a === null || b === null || b < a) return '';
  return Math.round((b - a) / 36e5 * 10) / 10;
}


// ════════════════════════════════════════════════════════════════════
// ── infra_lock.gs ──
// ════════════════════════════════════════════════════════════════════

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
 *     memoria temporal del propio proyecto de Apps Script y no tiene por qué cargar nada clínico.
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
/** Lo único que se recuerda de una respuesta: ids. Las banderas (verdadero/falso) pasan aparte. */
var _SELLO_CLAVES = ['idCama', 'idEvolucion', 'id', 'patientId', 'turnoKey', 'accion', 'entidad'];

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
    const valor = JSON.stringify({ h: op.h, d: _selloDepurar(r.data), t: Date.now() });
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
 * De la respuesta `data`, solo lo que puede viajar al caché: ids (de las claves de `_SELLO_CLAVES`) y banderas
 * booleanas. Nunca un nombre, un RUT, un diagnóstico ni un texto, ni un objeto ni una lista: el sello no tiene por qué
 * cargar nada clínico. `TEXTO_GENERADO` queda como marca vacía para que la repetición sepa que debe devolver el del
 * payload. `accion` y `entidad` se acotan: no son un lugar para pegar texto.
 */
function _selloDepurar(d) {
  const o = {};
  if (!d || typeof d !== 'object' || Array.isArray(d)) return o;
  Object.keys(d).forEach(function (k) {
    const v = d[k];
    if (typeof v === 'boolean') { o[k] = v; return; }
    if (k === 'TEXTO_GENERADO') { o[k] = ''; return; }
    if (_SELLO_CLAVES.indexOf(k) === -1) return;
    if (typeof v === 'number' && isFinite(v)) { o[k] = v; return; }
    if (typeof v === 'string') o[k] = (k === 'accion' || k === 'entidad') ? v.slice(0, 80) : v;
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


// ════════════════════════════════════════════════════════════════════
// ── infra_log.gs ──
// ════════════════════════════════════════════════════════════════════

/**
 * infra_log.gs — Auditoría. Registra cada acción de escritura en AUDIT_LOG.
 * La identidad (email) proviene del token GIS verificado (infra_auth.gs), no de getActiveUser().
 */

function auditar(a) {
  try {
    a = a || {};
    repoInsertar('AUDIT_LOG', {
      ID:            'AUD_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7).toUpperCase(),
      TIMESTAMP:     ahoraTS(),
      USUARIO_EMAIL: a.email     || '',
      FIRMA:         a.firma     || '',
      ACCION:        a.accion    || '',
      ENTIDAD:       a.entidad   || '',
      ID_ENTIDAD:    a.idEntidad || '',
      PATIENT_ID:    a.patientId || '',
      RESUMEN:       a.resumen   || '',
    });
  } catch (e) {
    // La auditoría nunca debe romper la operación principal.
    console.warn('auditar:', e.message);
  }
}


// ════════════════════════════════════════════════════════════════════
// ── infra_auth.gs ──
// ════════════════════════════════════════════════════════════════════

/**
 * infra_auth.gs — Identidad y autorización (Google Sign-In, D1b).
 *
 * El frontend obtiene un ID token (JWT) vía Google Identity Services y lo
 * envía en cada request. Aquí se VERIFICA contra Google (endpoint tokeninfo),
 * se comprueba que el `aud` sea nuestro OAUTH_CLIENT_ID y que el email esté
 * verificado, y se resuelve la firma clínica (1:1) desde KINESIOLOGOS.
 *
 * Con cuentas personales `Session.getActiveUser()` no es fiable; por eso NO se usa.
 */

/**
 * Verifica un ID token de GIS. Devuelve {email, name, exp} si es válido, o null.
 * Cachea el resultado hasta poco antes de expirar para no re-verificar cada request.
 */
function verificarToken(idToken) {
  if (!idToken) return null;
  const cache = CacheService.getScriptCache();
  const ckey = 'gis_' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken));
  const hit = cache.get(ckey);
  if (hit) return JSON.parse(hit);

  const url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken);
  let resp;
  try { resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true }); }
  catch (e) { console.warn('verificarToken fetch:', e.message); return null; }
  if (resp.getResponseCode() !== 200) return null;

  let c;
  try { c = JSON.parse(resp.getContentText()); } catch (e) { return null; }

  const clientId = configVal('OAUTH_CLIENT_ID');
  if (!clientId || String(c.aud) !== String(clientId)) return null;
  if (String(c.email_verified) !== 'true' && c.email_verified !== true) return null;
  if (!c.email) return null;

  const claims = { email: String(c.email).toLowerCase(), name: c.name || '', exp: parseInt(c.exp) || 0 };
  const ttl = Math.max(0, Math.min(3600, claims.exp - Math.floor(Date.now() / 1000) - 30));
  if (ttl > 10) cache.put(ckey, JSON.stringify(claims), ttl);
  return claims;
}

/**
 * Firma clínica activa asociada a un email (1:1), o null.
 *
 * Con caché corto (ago-2026, Ola 4): en producción CADA llamada autenticada
 * —cada apertura de paciente, cada guardado, cada refresco del grid— bajaba
 * la hoja KINESIOLOGOS para resolver la misma firma. La lista del staff es
 * configuración (como CONFIG/CATALOGOS), no dato clínico, y cambia un puñado
 * de veces al año; se cachea 5 minutos POR EMAIL.
 *
 * El costo del trade-off, dicho entero: desactivar a un kinesiólogo en la
 * hoja tarda hasta 5 min en propagarse al bloqueo de escritura (su firma
 * sigue resolviendo desde el caché). Solo se cachea el HALLAZGO — un email
 * sin firma se re-consulta siempre, así que dar de alta a alguien nuevo
 * funciona al instante.
 */
var _FIRMA_CACHE_TTL = 300;   // segundos
function firmaDeEmail(email) {
  if (!email) return null;
  const mail = String(email).toLowerCase();
  let cache = null;
  try {
    cache = CacheService.getScriptCache();
    const hit = cache.get('firma_' + mail);
    if (hit) return hit;
  } catch (e) { /* sin caché se resuelve igual, solo más lento */ }
  const kines = repoLeerTodos('KINESIOLOGOS', 'EMAIL', mail)
    .filter(k => esVerdadero(k.ACTIVO));
  const firma = kines.length ? String(kines[0].FIRMA) : null;
  if (firma && cache) {
    try { cache.put('firma_' + mail, firma, _FIRMA_CACHE_TTL); } catch (e) {}
  }
  return firma;
}

/**
 * Autoriza una acción de escritura.
 * @param {string} idToken        token GIS enviado por el cliente
 * @param {string} [firmaDeclarada]  firma que el formulario quiere estampar
 * @return {{ok:true,email,firma,nombre} | {ok:false,error,codigo}}
 */
function autorizar(idToken, firmaDeclarada) {
  // ── ACCESO DEL TURNO (clave propia, svc_acceso.gs) ───────────────
  // Va PRIMERO a propósito: cuando el candado del turno está puesto, manda él
  // y no hay puerta de atrás. Si quedara después del modo desarrollo, encender
  // el acceso con AUTH_DEV_MODE=TRUE olvidado en TRUE no protegería nada, y
  // ese olvido no se ve en ninguna pantalla.
  if (typeof accesoActivo === 'function' && accesoActivo()) {
    // La sesión viene vacía no solo si el token no existe o expiró, sino
    // también si fue CORTADA: la persona cambió de clave desde que
    // entró, o la desactivaron en KINESIOLOGOS (G20, 4-oct-2026). Acá no se
    // distingue el motivo a propósito: el equipo ve siempre «Entra con tu
    // clave», y se rechaza ANTES de que el dispatcher toque nada, así que una
    // sesión cortada no deja escrito ni un dato. Guardia: acceso_revocacion.js.
    const verif = accesoVerificarSesion(idToken);
    // 🔴 Si Sheets no respondió NO se contesta «Entra con tu clave»: la pantalla lo
    // lee como sesión cortada y manda a la puerta de entrada a quien tenía una
    // sesión válida, por un tropiezo de la planilla. Se rechaza igual (aceptar sin
    // poder comprobar sería lo peor en un registro clínico) pero con un error
    // DISTINTO y honesto que la pantalla no interpreta como «te sacaron», y la
    // sesión sigue como estaba: no se corta nada.
    if (verif.noSePudo) return accesoRespuestaNoVerificable();
    const ses = verif.sesion;
    if (!ses) {
      return { ok: false, error: 'Entra con tu clave para registrar.', codigo: ERR.NO_AUTORIZADO };
    }
    const declarada = firmaDeclarada ? String(firmaDeclarada).trim().toUpperCase() : '';
    if (declarada && declarada !== ses.firma) {
      return { ok: false, error: 'No puedes firmar como ' + declarada + ': tu firma es ' + ses.firma + '.',
               codigo: ERR.NO_AUTORIZADO };
    }
    return { ok: true, email: 'acceso:' + ses.firma.toLowerCase(), firma: ses.firma, nombre: ses.nombre };
  }

  // ── MODO DESARROLLO ──────────────────────────────────────────────
  // Permite construir/probar la app SIN que GIS funcione todavía.
  // Se activa con CONFIG.AUTH_DEV_MODE = TRUE. ⚠️ Poner FALSE en producción.
  if (esVerdadero(configVal('AUTH_DEV_MODE'))) {
    // Modo prueba: entra cualquiera. Se respeta la firma que cada kinesiólogo
    // declara (para que su evolución quede firmada con SU sigla); si no declara
    // ninguna, cae a AUTH_DEV_FIRMA y luego a 'DEV'.
    const firmaDev = (firmaDeclarada && String(firmaDeclarada).trim()) || configVal('AUTH_DEV_FIRMA') || 'DEV';
    console.warn('AUTH_DEV_MODE activo — identidad simulada: ' + firmaDev);
    return { ok: true, email: 'dev@local', firma: String(firmaDev), nombre: 'Modo prueba', dev: true };
  }
  // ── PRODUCCIÓN (GIS real) ────────────────────────────────────────
  const claims = verificarToken(idToken);
  if (!claims) return { ok: false, error: 'Sesión no válida. Inicia sesión con Google.', codigo: ERR.NO_AUTORIZADO };

  const firma = firmaDeEmail(claims.email);
  if (!firma) return { ok: false, error: 'Tu correo (' + claims.email + ') no está registrado como kinesiólogo.', codigo: ERR.NO_AUTORIZADO };

  const decl = firmaDeclarada ? String(firmaDeclarada).trim() : '';
  if (decl && decl !== firma) {
    return { ok: false, error: 'No puedes firmar como ' + decl + ': tu firma es ' + firma + '.', codigo: ERR.NO_AUTORIZADO };
  }
  return { ok: true, email: claims.email, firma: firma, nombre: claims.name };
}
