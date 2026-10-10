// guardado_seguro_ingreso_g15.js — EL INGRESO CONCURRENTE (tanda 2 del guardado seguro, G15; paso 8, 4-oct-2026).
//
// 🔴 DE DÓNDE SALE. Dos kinesiólogos abren el formulario de ingreso sobre la MISMA cama libre, cada uno con su paciente.
// El primero en guardar gana la cama; el segundo guarda DESPUÉS y el servidor no tenía cómo saber que esa cama ya no era
// la que él vio: su `EPISODIO_ABIERTO` iba VACÍO (la tarjeta no tenía episodio al abrir) y el vacío no reclama nada, A
// PROPÓSITO. Si el vacío rechazara sobre una cama con paciente, el REINTENTO de un ingreso cuyo primer intento sí aterrizó
// (la respuesta se perdió, el kinesiólogo toca «Guardar» otra vez) se vería idéntico a «otro ingreso en la misma cama» y se
// rechazaría por error. Resultado de no distinguirlos: el segundo ingreso se escribía encima del primero —el nombre, la
// edad y el diagnóstico de uno con el PATIENT_ID del otro—, o el reintento honesto se rechazaba.
//
// LA SALIDA (diseño de la tanda 2): darle al INGRESO una identidad propia desde ANTES de enviar. La pantalla acuña un
// PATIENT_ID al abrir el formulario sobre una cama LIBRE y lo manda junto con EPISODIO_ABIERTO=''. El servidor, dentro del
// lock y antes de escribir nada:
//   · cama libre (o ocupada SIN PATIENT_ID: un episodio sin ingreso formal) ⇒ entra, y el pid acuñado queda en la cama;
//   · cama con el MISMO pid ⇒ es el reintento de su propio ingreso: sigue, idempotente (un solo hito de ingreso);
//   · cama con OTRO pid ⇒ ERR.CONFLICTO sin escribir nada. Otra persona se adelantó, y no es un reintento.
//
// LO QUE FIJA ESTA GUARDIA:
//   A · LA REGLA PURA: decidirEpisodioPuerta('INGRESO', e) (tabla de verdad, incluido el modo estricto) y el mensaje del
//       CONFLICTO: nombra la cama, dice que no se guardó nada y que el formulario sigue abierto, NO dice «cambió de
//       paciente» (la pantalla lo mostraría con la salida equivocada) y no nombra ni da el identificador del otro paciente
//       (Ley 19.628). Y la forma del PATIENT_ID acuñado: [A-Za-z0-9_-]{8,64}.
//   B · GUARDAR_EVOLUCION con ES_INGRESO, con el candado REAL y el gancho antesDelCuerpo: dos ingresos sobre la misma cama
//       libre con PATIENT_ID distintos ⇒ el primero ok, el segundo CONFLICTO con CERO escrituras y la base idéntica a la de
//       un solo ingreso; el mismo pid dos veces (reintento) ⇒ ok idempotente con UN hito de ingreso; la carrera que ocurre
//       MIENTRAS se espera el candado; el rechazo no se sella (reintentar vuelve a evaluar); sin PATIENT_ID todo como hoy.
//   C · INGRESAR_PACIENTE: sin PATIENT_ID como hoy («ya está ocupada», VALIDACION); con PATIENT_ID la cama lo toma; el mismo
//       pid sobre la cama ocupada ⇒ ok «ya estaba» con cero escrituras (también cuando el sello del caché no está);
//       otro pid ⇒ CONFLICTO.
//   D · MODO ESTRICTO (CONFIG.CONTRATO_ESTRICTO = TRUE, nace APAGADO) en guardarEvolucion: el ausente rechaza («esta pantalla
//       es de una versión anterior»), y el vacío sin identidad propia no se acepta sobre una cama con paciente.
//   E · LA FORMA: la regla va DENTRO del lock, después de validarEpisodioAbierto y antes de la primera escritura; solo se
//       invoca con identidad propia o en modo estricto (los bancos antiguos, con lista fija de archivos, no cargan la regla).
//
// LO QUE SE SUMA EN LA REVISIÓN DE LA TANDA 2 (paso C, 5-oct-2026), secciones F y G:
//   F · H9 · EL INGRESO DE UN PACIENTE QUE YA EGRESÓ. Sin el sello (OP_ID nuevo, caché evaporado) el ingreso reenviado con el
//       PATIENT_ID de alguien ya dado de alta volvía a ocupar la cama con ese pid, y el segundo alta contestaba ok sin escribir su
//       egreso (ARCH_<pid> ya existía): se perdía en silencio el segundo egreso, su motivo y el conteo del REM. Ahora las dos
//       puertas que ingresan contestan CONFLICTO, sin escribir, cuando el pid propio ya tiene fila en ARCHIVO_PACIENTES o un hito
//       de egreso; el reintento legítimo (cama ocupada por ese pid, SIN egreso) sigue convergiendo.
//   G · H14 · LA FORMA Y LA UNICIDAD DEL PATIENT_ID EN GUARDAR_EVOLUCION. Solo validarPayloadIngreso miraba la forma; por la
//       pantalla real un valor como «X Y/../<b>» quedaba de identidad de la cama y de parte de ids derivados (ARCH_<pid>), y
//       el mismo pid podía estar en dos camas. La forma se exige a un pid NUEVO (distinto del de la cama): las camas ya ocupadas
//       con pids antiguos siguen guardando normal.
//
// Uso: node build/checks/guardado_seguro_ingreso_g15.js
//
// 🪤 EL RELOJ VA CONGELADO. Las fechas se INVENTAN (SIM.fecha = 2026-08-10, un lunes lejos de Fiestas Patrias y a las
// 12:00, lejos del cambio de turno) y `Date` se congela en el proceso.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CONGELADO = new Date('2026-08-10T12:00:00').getTime();
const Real = Date;
function Falso(...a) { return a.length ? new Real(...a) : new Real(CONGELADO); }
Falso.now = () => CONGELADO; Falso.parse = Real.parse; Falso.UTC = Real.UTC; Falso.prototype = Real.prototype;
global.Date = Falso;

const V2 = path.resolve(__dirname, '..', '..', 'v2');
const leer = f => fs.readFileSync(path.join(V2, f), 'utf8');

const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g) + (okk ? '' : ' (esperado ' + JSON.stringify(w) + ')'));
  if (!okk) fails.push(l);
};
const si = (l, c) => eq(l, !!c, true);
const no = (l, c) => eq(l, !!c, false);
const terminar = () => {
  console.log(fails.length ? `\n❌ ${fails.length} fallos:\n  - ${fails.join('\n  - ')}`
    : '\n✅ guardado_seguro_ingreso_g15: el ingreso concurrente, con identidad propia, rechaza al segundo sin escribir y reconoce el reintento del primero.');
  process.exit(fails.length ? 1 : 0);
};
// Un tramo que revienta no tumba a los demás: da UN rojo con su razón y la guardia sigue (así el rojo de antes de
// arreglar el código se lee entero, en vez de cortarse en la primera sección).
const tramo = (etiqueta, fn) => {
  try { fn(); } catch (e) { console.log('❌ ' + etiqueta + ': reventó (' + (e && e.message) + ')'); fails.push(etiqueta + ' reventó: ' + (e && e.message)); }
};
const callando = fn => {
  const ce = console.error, cw = console.warn; console.error = () => {}; console.warn = () => {};
  try { return fn(); } finally { console.error = ce; console.warn = cw; }
};

// Datos inventados: ni un nombre ni un identificador reales. Los pid acuñados por la «pantalla» parecen lo que son (un
// uuid) y cumplen la forma [A-Za-z0-9_-]{8,64}; la guardia exige que NINGÚN mensaje de rechazo los repita.
const PID_P = '11111111-aaaa-4aaa-8aaa-000000000001';
const PID_Q = '22222222-bbbb-4bbb-8bbb-000000000002';
const PID_R = '33333333-cccc-4ccc-8ccc-000000000003';
const NOMBRES = ['Alfa', 'Bravo', 'Charly'];
const sinDatosAjenos = (txt) => ![PID_P, PID_Q, PID_R].some(p => String(txt).includes(p)) &&
  !NOMBRES.some(n => String(txt).includes(n));

/* ══ A · LA REGLA PURA ════════════════════════════════════════════════════ */
console.log('A · decidirEpisodioPuerta(\'INGRESO\', e): la tabla de verdad, el mensaje y la forma del PATIENT_ID');
// El contexto es VACÍO a propósito: infra_respuesta.gs y dominio_validacion.gs no dependen de Sheets ni de nada.
const ctxPuro = vm.createContext({});
vm.runInContext(leer('infra_respuesta.gs') + '\n;\n' + leer('dominio_validacion.gs'), ctxPuro);
const idx = leer('index.html');
const mRe = idx.match(/const _EP_CAMBIO_RE = (\/[^\n;]+\/[a-z]*);/);
si('la pantalla declara _EP_CAMBIO_RE (la frase que reconoce el cambio de paciente)', !!mRe);
const EP_CAMBIO_RE = mRe ? new Function('return ' + mRe[1])() : /cambi[oó] de paciente/i;

tramo('A · regla pura', () => {
  const dec = e => ctxPuro.decidirEpisodioPuerta('INGRESO', Object.assign({ estricto: false, idCama: '6' }, e));
  const caso = (l, e, estado, codigo) => {
    const r = dec(e);
    eq(l, (r && r.estado) + (codigo ? '/' + (r && r.codigo) : ''), estado + (codigo ? '/' + codigo : ''));
    return r;
  };
  const CON = 'CONFLICTO';

  console.log('   · con identidad propia (el PATIENT_ID que la pantalla acuñó al abrir el formulario)');
  caso('★ cama LIBRE: entra', { propio: PID_P, pid: '' }, 'seguir');
  caso('   …y una cama ocupada SIN PATIENT_ID (episodio sin ingreso formal) también: no hay a quién ganarle', { propio: PID_P, pid: undefined }, 'seguir');
  caso('★ cama con el MISMO pid: es el reintento de su propio ingreso (ya hecho)', { propio: PID_P, pid: PID_P }, 'yaHecho');
  caso('   …se recortan los espacios de los dos lados', { propio: '  ' + PID_P, pid: PID_P + ' ' }, 'yaHecho');
  const c1 = caso('★★ cama con OTRO pid: CONFLICTO (otra persona se adelantó, y no es un reintento)', { propio: PID_P, pid: PID_Q }, 'rechazo', CON);
  caso('   …la igualdad es EXACTA: otra capitalización es otro paciente', { propio: PID_P.toUpperCase(), pid: PID_P }, 'rechazo', CON);
  caso('   …ni un prefijo', { propio: PID_P.slice(0, 20), pid: PID_P }, 'rechazo', CON);
  caso('★ modo estricto: con identidad propia sobre cama LIBRE entra igual (la excepción del ingreso)', { propio: PID_P, pid: '', estricto: true }, 'seguir');
  caso('   …y el reintento propio sigue siendo «ya hecho»', { propio: PID_P, pid: PID_P, estricto: true }, 'yaHecho');
  caso('   …y otro pid sigue siendo CONFLICTO', { propio: PID_P, pid: PID_Q, estricto: true }, 'rechazo', CON);

  console.log('   · SIN identidad propia (pantalla vieja o llamada por API sin navegador)');
  caso('★ modo tolerante: no compara (como hoy: es el hueco que el modo estricto cierra)', { propio: '', pid: PID_Q }, 'seguir');
  caso('   …sobre cama libre también', { propio: '', pid: '' }, 'seguir');
  caso('   …y un propio sin definir es lo mismo que vacío', { propio: undefined, pid: PID_Q }, 'seguir');
  caso('★★ modo estricto: vacío sin identidad propia NO se acepta sobre una cama con paciente (CONFLICTO)', { propio: '', pid: PID_Q, estricto: true }, 'rechazo', CON);
  caso('   …un propio solo de espacios cuenta como vacío', { propio: '   ', pid: PID_Q, estricto: true }, 'rechazo', CON);
  caso('   …pero sí sobre una cama libre (el primer ingreso de una pantalla vieja)', { propio: '', pid: '', estricto: true }, 'seguir');
  caso('   …y sobre una ocupada sin PATIENT_ID (no hay a quién reclamar)', { propio: '', pid: undefined, estricto: true }, 'seguir');

  console.log('   · H9: el pid propio de un paciente que YA EGRESÓ (`archivado`, lo que la puerta lee de ARCHIVO_PACIENTES y TIMELINE)');
  const cA = caso('★★ cama LIBRE y el pid propio ya egresó: CONFLICTO (el ingreso no resucita al egresado)', { propio: PID_P, pid: '', archivado: true }, 'rechazo', CON);
  caso('★★ …la cama con ESE MISMO pid y ya egresado (un alta a medias) tampoco es un reintento del ingreso: CONFLICTO', { propio: PID_P, pid: PID_P, archivado: true }, 'rechazo', CON);
  caso('   …sobre una cama ocupada sin PATIENT_ID igual', { propio: PID_P, pid: undefined, archivado: true }, 'rechazo', CON);
  caso('   …en modo estricto también', { propio: PID_P, pid: '', archivado: true, estricto: true }, 'rechazo', CON);
  caso('★ `archivado` en falso no cambia nada: cama libre entra', { propio: PID_P, pid: '', archivado: false }, 'seguir');
  caso('   …ni el reintento propio (ya hecho)', { propio: PID_P, pid: PID_P, archivado: false }, 'yaHecho');
  caso('   …ni `archivado` sin definir (los bancos antiguos no lo mandan)', { propio: PID_P, pid: PID_P }, 'yaHecho');
  caso('   …y SIN identidad propia no hay pid que juzgar: `archivado` no se mira', { propio: '', pid: '', archivado: true }, 'seguir');
  eq('★ el mensaje del egresado es el MISMO del conflicto de ingreso (la pantalla lo muestra tal cual; sin nombres ni identificadores)',
    (cA || {}).error, (c1 || {}).error);

  console.log('   · el mensaje del conflicto');
  const m = (c1 || {}).error || '';
  si('★ dice que la cama «ya fue ocupada por otro paciente» y que fue «mientras llenabas este ingreso»', /ya fue ocupada por otro paciente mientras llenabas este ingreso/.test(m));
  si('   …nombra la cama', /\bcama 6\b/.test(m));
  si('   …dice que no se guardó nada', /No se guard[oó] nada/.test(m));
  si('   …y que el formulario sigue abierto con lo que escribió', /Tu formulario sigue abierto con lo que escribiste/.test(m));
  no('★★ NO dice «cambió de paciente»: la pantalla lo mostraría con la salida «Cerrar la cama» y aquí lo que hay es otra cosa', EP_CAMBIO_RE.test(m));
  si('★★ …sin nombrar a nadie ni dar el identificador del otro paciente (Ley 19.628)', sinDatosAjenos(m));
  eq('   …y es el MISMO texto en modo estricto sin identidad propia', (dec({ propio: '', pid: PID_Q, estricto: true }) || {}).error, m);

  console.log('   · la forma del PATIENT_ID acuñado ([A-Za-z0-9_-]{8,64}) la valida validarPayloadIngreso');
  const base = { idCama: '6', nombre: 'Paciente Alfa', firmaKine: 'DMV', edad: 61, talla: 170 };
  const errs = pid => ctxPuro.validarPayloadIngreso(Object.assign({}, base, pid === undefined ? {} : { PATIENT_ID: pid }));
  eq('sin PATIENT_ID no hay error (como hoy)', errs(undefined).join('|'), '');
  eq('   …vacío tampoco', errs('').join('|'), '');
  eq('   …null tampoco', errs(null).join('|'), '');
  eq('★ un uuid vale', errs(PID_P).join('|'), '');
  eq('   …el mínimo (8 caracteres)', errs('a1_B-c2d').join('|'), '');
  eq('   …y el máximo (64)', errs('k'.repeat(64)).join('|'), '');
  [['corto', 'pid_123'], ['de 65 caracteres', 'o'.repeat(65)], ['con espacios', 'pid con espacios 0001'], ['solo espacios', '        '],
    ['con barra vertical', 'pid|con|barra|01'], ['con tilde', 'pid-ñandú-0001'], ['un número', 12345678], ['un objeto', { a: 1 }], ['una lista', [PID_P]]].forEach(([etq, malo]) => {
    const e = errs(malo);
    si('PATIENT_ID ' + etq + ': se rechaza con un motivo que dice PATIENT_ID', e.length === 1 && /PATIENT_ID/.test(e[0]));
  });
  si('   …y el motivo no repite el valor recibido', !/pid con espacios|barra vertical|ñandú/.test(errs('pid|con|barra|01').join(' ') + errs('pid-ñandú-0001').join(' ')));
});

/* ══ El banco: sim_srv con el candado REAL y la muerte/foto de sim_muerte ═ */
const S = require('../sim/sim_srv.js');
const { api, DB, SIM, CONFIG } = S;
SIM.fecha = '2026-08-10'; SIM.hora = '12:00:00';
const ctl = S.activarLockReal();
const M = require('../sim/sim_muerte.js');
const FOTO0 = M.foto();
// «El script vuelve a empezar»: la base de partida, el conteo de escrituras, el caché y el modo en su valor de siempre.
const volver = () => {
  M.restaurar(FOTO0); M.reiniciar();
  SIM.fecha = '2026-08-10'; SIM.hora = '12:00:00';
  ctl.antesDelCuerpo = null; ctl.cache.fallar(false);
  delete CONFIG.CONTRATO_ESTRICTO;
  PUTS.length = 0;
};
// Los put que llegan al caché (el sello de operación): un rechazo NO debe dejar ninguno.
const PUTS = [];
const cacheBase = global.CacheService;
global.CacheService = { getScriptCache: () => {
  const c = cacheBase.getScriptCache();
  return Object.assign({}, c, { put: (k, v, seg) => { PUTS.push(k); return c.put(k, v, seg); } });
} };
const ESTRICTO = () => { CONFIG.CONTRATO_ESTRICTO = 'TRUE'; };

const TK = '2026-08-10-Dia';
const camaDe = id => DB.CAMAS_ESTADO.find(c => String(c.ID_CAMA) === String(id)) || {};
const evo = (idCama, extra) => Object.assign({
  ID_CAMA: String(idCama), TURNO_KEY: TK, PLAN_FIRMA_KINE: 'DMV',
  VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', VENT_MODO: 'ACVC',
  VENT_VT: 450, VENT_FR: 16, VENT_PEEP: 8, VENT_FIO2: 50, HEMO_ESTADO: 'Estable', SED_TIPO: 'Sin sedación',
}, extra || {});
// Lo que la pantalla manda al ingresar: EPISODIO_ABIERTO vacío (la tarjeta estaba libre) y el PATIENT_ID que acuñó al abrir.
const ingresoGE = (idCama, pid, extra) => evo(idCama, Object.assign({
  ES_INGRESO: true, EPISODIO_ABIERTO: '', PATIENT_ID: pid,
  PAC_NOMBRE: 'Paciente Alfa', PAC_EDAD: 55, PAC_SEXO: 'F', PAC_TALLA: 160,
}, extra || {}));
const ingresoAPI = (idCama, extra) => Object.assign({ idCama: String(idCama), nombre: 'Paciente Alfa', edad: 61, sexo: 'M',
  diagnostico: 'Dx de prueba', fechaIngreso: '2026-08-08', viaAerea: 'TOT', soporte: 'VM', modo: 'ACVC', firmaKine: 'DMV' }, extra || {});
const llama = (accion, datos) => callando(() => api(accion, datos, null));
const darAlta = idCama => llama('DAR_ALTA', { idCama: String(idCama), motivoEgreso: 'Traslado a sala', destinoEgreso: 'Medicina', firmaKine: 'DMV' });
const sinBit = () => M.instantanea({ sinHojas: ['AUDIT_LOG'] });
const ingresosDe = pid => DB.TIMELINE.filter(h => h.TIPO === 'ingreso' && h.PATIENT_ID === pid).length;
const filasDe = (idCama, pid) => DB.EVOLUCIONES.filter(e => String(e.ID_CAMA) === String(idCama) && (pid === undefined || e.PATIENT_ID === pid));

// El contrato de un CONFLICTO de ingreso: sin éxito, con su código y su frase, sin escribir NADA y dejando la huella.
function conflicto(etiqueta, r, escrituras, igual, bit, accion, idCama) {
  no('★ ' + etiqueta + ': se RECHAZA', r.ok);
  eq('   …con código CONFLICTO', r.codigo, 'CONFLICTO');
  si('   …con el motivo del ingreso concurrente', /ya fue ocupada por otro paciente mientras llenabas este ingreso/.test(r.error || ''));
  si('   …nombra la cama ' + idCama + ' y dice que no se guardó nada', new RegExp('\\bcama ' + idCama + '\\b').test(r.error || '') && /No se guard[oó] nada/.test(r.error || ''));
  no('★★ …y NO dice «cambió de paciente»', EP_CAMBIO_RE.test(r.error || ''));
  si('★★ …sin nombrar a nadie ni dar el identificador de ningún paciente (Ley 19.628)', sinDatosAjenos(r.error || ''));
  eq('★★ ' + etiqueta + ': NINGUNA escritura aterrizó', escrituras.join(' | ') || '(ninguna)', '(ninguna)');
  si('★★ …y la base COMPLETA quedó idéntica (salvo la bitácora)', igual);
  eq('   …la bitácora gana UNA fila: <ACCION>_RECHAZADO', bit.map(f => f.accion).join(','), accion + '_RECHAZADO');
  eq('   …que nombra la cama del intento', (bit[0] || {}).idEntidad, String(idCama));
}

/* ══ B · GUARDAR_EVOLUCION con ES_INGRESO ═════════════════════════════════ */
console.log('\nB · GUARDAR_EVOLUCION de un ingreso: dos ingresos sobre la misma cama libre');

tramo('B1 dos ingresos con PATIENT_ID distintos', () => {
  console.log('   · B1 · dos ingresos sobre la misma cama libre, con PATIENT_ID distintos acuñados por la pantalla');
  // La base de UN solo ingreso, para comparar: lo que el rechazo NO puede mover.
  volver();
  const rSolo = llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_P));
  si('(el montaje) el ingreso de P entra', rSolo.ok);
  const soloP = sinBit();
  volver();
  const r1 = llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_P));
  eq('★ el PRIMER ingreso entra', r1.ok, true);
  eq('   …y la cama 6 es de P (el pid que la pantalla acuñó, no uno inventado por el servidor)', camaDe('6').PATIENT_ID, PID_P);
  eq('   …con su evolución y su hito de ingreso', filasDe('6', PID_P).length + '/' + ingresosDe(PID_P), '1/1');
  eq('   …y la respuesta devuelve ese mismo patientId (la pantalla lo toma como su episodio)', (r1.data || {}).patientId, PID_P);
  M.reiniciar();
  const a0 = DB.AUDIT_LOG.length;
  const r2 = llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_Q, { PAC_NOMBRE: 'Paciente Bravo', PAC_EDAD: 70 }));
  conflicto('el SEGUNDO ingreso (otro pid) sobre la cama que ya ocupa P', r2, M.registro(), sinBit() === soloP,
    DB.AUDIT_LOG.slice(a0).filter(f => String(f.accion).indexOf('GUARDAR_EVOLUCION') === 0), 'GUARDAR_EVOLUCION', '6');
  eq('★ …la base es la de UN solo ingreso: la cama sigue siendo de P', camaDe('6').PATIENT_ID + '/' + camaDe('6').NOMBRE, PID_P + '/Paciente Alfa');
  eq('   …sin evolución ni hito de Q', filasDe('6', PID_Q).length + '/' + ingresosDe(PID_Q), '0/0');
  eq('   …y el ingreso de P sigue siendo UNO', filasDe('6', PID_P).length + '/' + ingresosDe(PID_P), '1/1');
  eq('   …el rechazo no deja sello en el caché (reintentar vuelve a evaluar)', PUTS.filter(k => /^op\|/.test(k)).length, 0);
});

tramo('B2 el mismo pid dos veces', () => {
  console.log('   · B2 · el REINTENTO del propio ingreso (mismo PATIENT_ID): ok idempotente, un solo hito');
  volver();
  const r1 = llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_P));
  si('(el primer intento aterriza y su respuesta «se pierde»)', r1.ok);
  M.reiniciar();
  const r2 = llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_P));
  eq('★ el reintento (mismo pid, formulario todavía sin episodio) contesta OK, no un conflicto', r2.ok, true);
  eq('   …con el mismo patientId', (r2.data || {}).patientId, PID_P);
  eq('★★ …y sigue habiendo UNA evolución del turno', filasDe('6').length, 1);
  eq('★★ …y UN solo hito de ingreso (el ingreso único por pid de _timelineDelGuardado)', ingresosDe(PID_P), 1);
  eq('   …y la cama sigue siendo de P', camaDe('6').PATIENT_ID, PID_P);
  const r3 = llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_P));
  eq('   …y un tercero igual', r3.ok + '/' + filasDe('6').length + '/' + ingresosDe(PID_P), 'true/1/1');
});

tramo('B3 la carrera mientras se espera el candado', () => {
  console.log('   · B3 · la otra persona ingresa MIENTRAS esta petición espera el candado');
  volver();
  let hook = null, n0 = 0, foto = '', a0 = 0;
  ctl.antesDelCuerpo = () => {
    hook = llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_Q, { PAC_NOMBRE: 'Paciente Bravo' }));
    n0 = M.total(); foto = sinBit(); a0 = DB.AUDIT_LOG.length;
  };
  M.reiniciar();
  const r = llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_P));
  ctl.antesDelCuerpo = null;
  si('(la otra petición ingresó a Q mientras esta esperaba el candado)', hook && hook.ok && camaDe('6').PATIENT_ID === PID_Q);
  conflicto('el formulario de P cuando Q entra MIENTRAS se espera el candado', r, M.registro().slice(n0), sinBit() === foto,
    DB.AUDIT_LOG.slice(a0).filter(f => String(f.accion).indexOf('GUARDAR_EVOLUCION') === 0), 'GUARDAR_EVOLUCION', '6');
  eq('★★ …la cama 6 es de Q (el ganador): no se le escribió encima el ingreso de P', camaDe('6').PATIENT_ID + '/' + camaDe('6').NOMBRE, PID_Q + '/Paciente Bravo');
  eq('   …sin filas de P', filasDe('6', PID_P).length + '/' + ingresosDe(PID_P), '0/0');
});

tramo('B4 el perdedor conserva su OP_ID', () => {
  console.log('   · B4 · el perdedor reintenta con el MISMO OP_ID: el rechazo no se selló, así que vuelve a evaluar');
  volver();
  const OPID = 'op_ingreso_perdedor_01';
  llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_Q, { PAC_NOMBRE: 'Paciente Bravo' }));
  const r1 = llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_P, { OP_ID: OPID }));
  eq('el primer intento de P es un CONFLICTO', r1.ok + '/' + r1.codigo, 'false/CONFLICTO');
  const r1b = llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_P, { OP_ID: OPID }));
  eq('★ el mismo intento, el mismo OP_ID, sigue siendo CONFLICTO (no se selló ni se «repitió»)', r1b.ok + '/' + r1b.codigo + '/' + (r1b.data && r1b.data.repetida), 'false/CONFLICTO/undefined');
  eq('   …y no quedó ningún sello en el caché', PUTS.filter(k => /^op\|/.test(k)).length, 0);
  si('(Q recibe el alta: la cama queda libre)', darAlta('6').ok && !camaDe('6').OCUPADA);
  const r2 = llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_P, { OP_ID: OPID }));
  eq('★ con la cama libre, el MISMO formulario (mismo pid, mismo OP_ID) ahora entra', r2.ok, true);
  eq('   …y no es una respuesta «repetida»: se ejecutó de verdad', (r2.data || {}).repetida, undefined);
  eq('   …la cama es de P', camaDe('6').PATIENT_ID, PID_P);
});

tramo('B5 sin PATIENT_ID todo como hoy', () => {
  console.log('   · B5 · sin PATIENT_ID (API sin navegador, pantalla vieja) y en modo tolerante: como hoy');
  volver();
  const r1 = llama('GUARDAR_EVOLUCION', ingresoGE('6', undefined, { PAC_NOMBRE: 'Paciente Alfa' }));
  si('el ingreso sin PATIENT_ID entra y el servidor acuña el pid (como hoy)', r1.ok && !!camaDe('6').PATIENT_ID);
  const r2 = llama('GUARDAR_EVOLUCION', ingresoGE('6', undefined, { PAC_NOMBRE: 'Paciente Alfa' }));
  eq('★ el reintento del propio ingreso (vacío, sin PATIENT_ID) NO se rechaza (episodio_al_guardar.js lo ata)', r2.ok, true);
  eq('   …y no abre una segunda fila', filasDe('6').length, 1);
  // Es el hueco que el modo tolerante deja abierto a propósito: sin identidad propia no hay cómo distinguir un reintento de
  // otro ingreso. Se documenta aquí para que nadie crea que se cerró: lo cierra la pantalla nueva (PATIENT_ID) y el modo estricto.
  const r3 = llama('GUARDAR_EVOLUCION', ingresoGE('6', undefined, { PAC_NOMBRE: 'Paciente Bravo' }));
  eq('★ (el hueco conocido) otro ingreso SIN PATIENT_ID sobre la cama ocupada pasa en modo tolerante, como hoy', r3.ok, true);
  // EPISODIO_ABIERTO ausente + un PATIENT_ID ajeno: la regla es del VACÍO; el ausente no compara (compatibilidad).
  volver();
  llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_P));
  const sinAb = ingresoGE('6', PID_Q, { PAC_NOMBRE: 'Paciente Bravo' }); delete sinAb.EPISODIO_ABIERTO;
  const r4 = llama('GUARDAR_EVOLUCION', sinAb);
  eq('★ con EPISODIO_ABIERTO AUSENTE el servidor no compara (compatibilidad con llamadas sin navegador)', r4.ok, true);
});

tramo('B6 cama ocupada sin PATIENT_ID y cama libre con un pid viejo', () => {
  console.log('   · B6 · la cama ocupada SIN PATIENT_ID (episodio sin ingreso formal) y la libre con un pid que quedó escrito');
  volver();
  Object.assign(camaDe('8'), { OCUPADA: true, STATUS_CAMA: 'Ocupada', PATIENT_ID: '', NOMBRE: 'Paciente sin ingreso formal', EDAD: 70, SEXO: 'M' });
  const r1 = llama('GUARDAR_EVOLUCION', ingresoGE('8', PID_P, { ES_INGRESO: false, PAC_NOMBRE: 'Paciente sin ingreso formal' }));
  eq('★ con una cama ocupada sin PATIENT_ID no hay a quién ganarle: guarda, y el pid acuñado queda en la cama', r1.ok + '/' + camaDe('8').PATIENT_ID, 'true/' + PID_P);
  volver();
  Object.assign(camaDe('9'), { OCUPADA: false, STATUS_CAMA: 'Libre', PATIENT_ID: PID_R });
  const r2 = llama('GUARDAR_EVOLUCION', ingresoGE('9', PID_P));
  eq('★ una cama LIBRE no tiene dueño aunque la fila conserve un pid viejo: el ingreso entra', r2.ok + '/' + camaDe('9').PATIENT_ID, 'true/' + PID_P);
});

/* ══ C · INGRESAR_PACIENTE ═════════════════════════════════════════════════ */
console.log('\nC · INGRESAR_PACIENTE: PATIENT_ID acuñado por quien llama');

tramo('C INGRESAR_PACIENTE', () => {
  console.log('   · C1 · sin PATIENT_ID: como hoy');
  volver();
  const i1 = llama('INGRESAR_PACIENTE', ingresoAPI('7'));
  eq('el ingreso sin PATIENT_ID entra y el servidor acuña uno', i1.ok + '/' + (!!(i1.data || {}).patientId) + '/' + (camaDe('7').PATIENT_ID === (i1.data || {}).patientId), 'true/true/true');
  const i2 = llama('INGRESAR_PACIENTE', ingresoAPI('7'));
  eq('★ el segundo sobre la cama ocupada sigue siendo VALIDACION «ya está ocupada» (no se volvió CONFLICTO)', i2.ok + '/' + i2.codigo + '/' + /ya est[aá] ocupada/.test(i2.error || ''), 'false/VALIDACION/true');

  console.log('   · C2 · con PATIENT_ID: la cama lo toma');
  volver();
  const j1 = llama('INGRESAR_PACIENTE', ingresoAPI('7', { PATIENT_ID: PID_P }));
  eq('★ el ingreso entra', j1.ok, true);
  eq('   …y el paciente es EL QUE QUIEN LLAMA acuñó (no un uuid del servidor)', camaDe('7').PATIENT_ID + '/' + (j1.data || {}).patientId, PID_P + '/' + PID_P);
  eq('   …con su hito de ingreso', ingresosDe(PID_P), 1);
  eq('   …y sin marcar «ya estaba»', (j1.data || {}).yaEstaba, undefined);

  console.log('   · C3 · el MISMO PATIENT_ID sobre la cama ocupada: ok «ya estaba», sin escribir');
  const foto = sinBit(); M.reiniciar(); const a0 = DB.AUDIT_LOG.length;
  const j2 = llama('INGRESAR_PACIENTE', ingresoAPI('7', { PATIENT_ID: PID_P }));
  eq('★ contesta OK (no «ya está ocupada»)', j2.ok, true);
  eq('   …marcado «ya estaba»', (j2.data || {}).yaEstaba, true);
  eq('   …con el mismo patientId y el mismo código de paciente de la primera respuesta', (j2.data || {}).patientId + '/' + (j2.data || {}).cod, PID_P + '/' + (j1.data || {}).cod);
  eq('★★ …con CERO escrituras', M.registro().join(' | ') || '(ninguna)', '(ninguna)');
  si('   …y la base idéntica a la de después del primero', sinBit() === foto);
  eq('   …y sigue habiendo UN solo hito de ingreso', ingresosDe(PID_P), 1);
  eq('   …la bitácora lo anota como «ingreso (ya estaba)»', DB.AUDIT_LOG.slice(a0).map(f => f.accion + ':' + f.resumen).join(','), 'INGRESAR_PACIENTE:ingreso (ya estaba)');

  console.log('   · C3b · y cuando el sello del caché NO está (la capa durable por pid)');
  volver();
  llama('INGRESAR_PACIENTE', ingresoAPI('7', { PATIENT_ID: PID_P, OP_ID: 'op_ingreso_durable_01' }));
  M.reiniciar();
  ctl.cache.fallar(true);   // el caché se evaporó / falla: el sello no responde
  const j3 = llama('INGRESAR_PACIENTE', ingresoAPI('7', { PATIENT_ID: PID_P, OP_ID: 'op_ingreso_durable_01' }));
  ctl.cache.fallar(false);
  eq('★ con el caché caído el reintento igual reconoce su propio ingreso por el pid: ok «ya estaba»', j3.ok + '/' + (j3.data || {}).yaEstaba + '/' + (j3.data || {}).repetida, 'true/true/undefined');
  eq('   …y no escribió nada', M.registro().join(' | ') || '(ninguna)', '(ninguna)');

  console.log('   · C4 · OTRO PATIENT_ID sobre la cama ocupada: CONFLICTO');
  volver();
  llama('INGRESAR_PACIENTE', ingresoAPI('7', { PATIENT_ID: PID_P }));
  const soloP = sinBit(); M.reiniciar(); const b0 = DB.AUDIT_LOG.length;
  const k1 = llama('INGRESAR_PACIENTE', ingresoAPI('7', { PATIENT_ID: PID_Q, nombre: 'Paciente Bravo' }));
  conflicto('INGRESAR_PACIENTE con otro pid sobre la cama de P', k1, M.registro(), sinBit() === soloP,
    DB.AUDIT_LOG.slice(b0).filter(f => String(f.accion).indexOf('INGRESAR_PACIENTE') === 0), 'INGRESAR_PACIENTE', '7');
  eq('   …y la cama sigue siendo de P', camaDe('7').PATIENT_ID, PID_P);

  console.log('   · C5 · un PATIENT_ID mal formado: VALIDACION, sin escribir');
  volver();
  [['corto', 'pid_123'], ['con espacios', 'pid con espacios 0001'], ['con barra vertical', 'pid|con|barra|01'], ['de 65 caracteres', 'o'.repeat(65)]].forEach(([etq, malo]) => {
    M.reiniciar();
    const r = llama('INGRESAR_PACIENTE', ingresoAPI('7', { PATIENT_ID: malo }));
    eq('PATIENT_ID ' + etq + ': VALIDACION y la cama sigue libre, sin escrituras', r.ok + '/' + r.codigo + '/' + camaDe('7').OCUPADA + '/' + M.total(), 'false/VALIDACION/false/0');
  });

  console.log('   · C6 · una cama ocupada SIN PATIENT_ID no se pisa: «ya está ocupada»');
  volver();
  Object.assign(camaDe('8'), { OCUPADA: true, STATUS_CAMA: 'Ocupada', PATIENT_ID: '', NOMBRE: 'Paciente sin ingreso formal' });
  M.reiniciar();
  const s1 = llama('INGRESAR_PACIENTE', ingresoAPI('8', { PATIENT_ID: PID_P }));
  eq('★ con identidad propia sobre un episodio sin ingreso formal: VALIDACION «ya está ocupada», sin escribir', s1.ok + '/' + s1.codigo + '/' + /ya est[aá] ocupada/.test(s1.error || '') + '/' + M.total(), 'false/VALIDACION/true/0');

  console.log('   · C7 · modo estricto: sin identidad propia sobre una cama con paciente es CONFLICTO');
  volver(); ESTRICTO();
  llama('INGRESAR_PACIENTE', ingresoAPI('7', { PATIENT_ID: PID_P }));
  M.reiniciar();
  const t1 = llama('INGRESAR_PACIENTE', ingresoAPI('7', { nombre: 'Paciente Bravo' }));
  eq('★ ingreso SIN PATIENT_ID sobre la cama de P en modo estricto: CONFLICTO, sin escribir', t1.ok + '/' + t1.codigo + '/' + M.total(), 'false/CONFLICTO/0');
  const t2 = llama('INGRESAR_PACIENTE', ingresoAPI('9'));
  eq('   …pero sobre una cama libre entra igual (el servidor acuña el pid, como hoy)', t2.ok, true);
  const t3 = llama('INGRESAR_PACIENTE', ingresoAPI('7', { PATIENT_ID: PID_P }));
  eq('   …y el reintento propio sigue siendo «ya estaba»', t3.ok + '/' + (t3.data || {}).yaEstaba, 'true/true');
  volver();
});

/* ══ D · MODO ESTRICTO en guardarEvolucion ═════════════════════════════════ */
console.log('\nD · CONTRATO_ESTRICTO = TRUE en guardarEvolucion (nace APAGADO)');

tramo('D estricto', () => {
  // Una vía de montar a P en la cama 6 para los casos con cama ocupada.
  const conP = () => { volver(); const r = llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_P)); si('(el montaje) P ingresa en la cama 6', r.ok); ESTRICTO(); M.reiniciar(); };
  const rechazo = (etq, r, codigo, frase) => {
    no('★ ' + etq + ': se RECHAZA', r.ok);
    eq('   …con código ' + codigo, r.codigo, codigo);
    si('   …y el motivo que se le muestra (' + frase + ')', frase.test(r.error || ''));
    eq('★★ …sin NINGUNA escritura', M.registro().join(' | ') || '(ninguna)', '(ninguna)');
  };

  console.log('   · D1 · el EPISODIO_ABIERTO ausente se rechaza: «esta pantalla es de una versión anterior»');
  volver(); ESTRICTO(); M.reiniciar();
  const sinAb = ingresoGE('6', PID_P); delete sinAb.EPISODIO_ABIERTO;
  const r1 = llama('GUARDAR_EVOLUCION', sinAb);
  rechazo('ausente sobre una cama LIBRE (la pantalla vieja es el problema, no la cama)', r1, 'VALIDACION', /versi[oó]n anterior/i);
  si('   …y dice que hay que recargar', /rec[aá]rgala/i.test(r1.error || ''));
  no('★★ …SIN la frase «cambió de paciente»', EP_CAMBIO_RE.test(r1.error || ''));
  eq('   …y la cama sigue libre', camaDe('6').OCUPADA, false);
  conP();
  const sinAb2 = evo('6', { EPISODIO_ABIERTO: undefined, PAC_NOMBRE: 'Paciente Alfa' }); delete sinAb2.EPISODIO_ABIERTO;
  rechazo('ausente sobre la cama de P', llama('GUARDAR_EVOLUCION', sinAb2), 'VALIDACION', /versi[oó]n anterior/i);
  const nulo = llama('GUARDAR_EVOLUCION', evo('6', { EPISODIO_ABIERTO: null }));
  rechazo('null (que el servidor trata como ausente)', nulo, 'VALIDACION', /versi[oó]n anterior/i);

  console.log('   · D2 · vacío con identidad propia: entra sobre la cama libre y se reconoce a sí mismo');
  volver(); ESTRICTO();
  const r2 = llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_P));
  eq('★ el ingreso con PATIENT_ID propio sobre cama LIBRE entra aunque el vacío no se acepte (la excepción del ingreso)', r2.ok + '/' + camaDe('6').PATIENT_ID, 'true/' + PID_P);
  const r2b = llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_P));
  eq('   …y su reintento (misma cama, mismo pid) también', r2b.ok + '/' + filasDe('6').length + '/' + ingresosDe(PID_P), 'true/1/1');

  console.log('   · D3 · vacío con identidad ajena o sin ella sobre una cama con paciente: CONFLICTO');
  conP();
  rechazo('otro PATIENT_ID sobre la cama de P', llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_Q, { PAC_NOMBRE: 'Paciente Bravo' })), 'CONFLICTO', /ya fue ocupada por otro paciente/);
  conP();
  rechazo('★★ vacío SIN PATIENT_ID sobre la cama de P (la pantalla que no acuña)', llama('GUARDAR_EVOLUCION', ingresoGE('6', undefined, { PAC_NOMBRE: 'Paciente Bravo' })), 'CONFLICTO', /ya fue ocupada por otro paciente/);
  eq('   …la cama sigue siendo de P', camaDe('6').PATIENT_ID, PID_P);

  console.log('   · D4 · vacío sin identidad propia sobre una cama LIBRE, y sobre una ocupada sin PATIENT_ID: pasa');
  volver(); ESTRICTO();
  const r4 = llama('GUARDAR_EVOLUCION', ingresoGE('6', undefined));
  eq('el primer ingreso de una pantalla que no acuña (cama libre) entra: no hay a quién ganarle', r4.ok, true);
  volver(); ESTRICTO();
  Object.assign(camaDe('8'), { OCUPADA: true, STATUS_CAMA: 'Ocupada', PATIENT_ID: '', NOMBRE: 'Paciente sin ingreso formal', EDAD: 70, SEXO: 'M' });
  const r4b = llama('GUARDAR_EVOLUCION', evo('8', { EPISODIO_ABIERTO: '', PAC_NOMBRE: 'Paciente sin ingreso formal' }));
  eq('   …y el episodio sin ingreso formal (cama ocupada sin PATIENT_ID) guarda y recibe su pid, como hoy', r4b.ok + '/' + !!camaDe('8').PATIENT_ID, 'true/true');

  console.log('   · D5 · con valor, la regla de siempre');
  conP();
  const r5 = llama('GUARDAR_EVOLUCION', evo('6', { EPISODIO_ABIERTO: PID_P, PAC_NOMBRE: 'Paciente Alfa' }));
  eq('el episodio vigente guarda', r5.ok, true);
  M.reiniciar();
  rechazo('un episodio que no es el de la cama (cambió de paciente)', llama('GUARDAR_EVOLUCION', evo('6', { EPISODIO_ABIERTO: PID_Q })), 'VALIDACION', EP_CAMBIO_RE);

  console.log('   · D6 · el modo APAGADO (tolerante) no cambió nada de lo de arriba');
  volver();
  llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_P));
  M.reiniciar();
  const ab2 = evo('6', { PAC_NOMBRE: 'Paciente Alfa' }); delete ab2.EPISODIO_ABIERTO;
  eq('★ ausente en modo tolerante: guarda', llama('GUARDAR_EVOLUCION', ab2).ok, true);
  eq('   …y vacío sin PATIENT_ID sobre la cama de P también (el hueco de las pantallas viejas)', llama('GUARDAR_EVOLUCION', ingresoGE('6', undefined)).ok, true);
  CONFIG.CONTRATO_ESTRICTO = 'FALSE';
  eq('   …y con CONTRATO_ESTRICTO = FALSE igual', llama('GUARDAR_EVOLUCION', ingresoGE('6', undefined)).ok, true);
  volver();
});

/* ══ F · H9 · EL INGRESO DE UN PACIENTE QUE YA EGRESÓ ═════════════════════ */
console.log('\nF · H9: un ingreso con el PATIENT_ID de un paciente ya egresado NO resucita la cama');
const OP_A = 'op_ingreso_h9_a0001', OP_B = 'op_ingreso_h9_b0002';
const filasArchivo = pid => DB.ARCHIVO_PACIENTES.filter(a => a.PATIENT_ID === pid);
const egresosDe = pid => DB.TIMELINE.filter(h => h.TIPO === 'egreso' && h.PATIENT_ID === pid).length;
const libre = idCama => !camaDe(idCama).OCUPADA;

tramo('F1 GUARDAR_EVOLUCION', () => {
  console.log('   · F1 · GUARDAR_EVOLUCION: ingreso, alta y el MISMO ingreso reenviado con otro OP_ID (el sello no está)');
  volver();
  const r1 = llama('GUARDAR_EVOLUCION', ingresoGE('9', PID_P, { OP_ID: OP_A }));
  const a1 = darAlta('9');
  si('(el montaje) el ingreso entra, se da el alta y queda UN egreso de P con su hito', r1.ok && a1.ok && libre('9') && filasArchivo(PID_P).length === 1 && egresosDe(PID_P) === 1);
  const base = sinBit(); M.reiniciar(); const a0 = DB.AUDIT_LOG.length;
  const r2 = llama('GUARDAR_EVOLUCION', ingresoGE('9', PID_P, { OP_ID: OP_B }));
  conflicto('el ingreso de un paciente ya egresado (otro OP_ID)', r2, M.registro(), sinBit() === base,
    DB.AUDIT_LOG.slice(a0).filter(f => String(f.accion).indexOf('GUARDAR_EVOLUCION') === 0), 'GUARDAR_EVOLUCION', '9');
  eq('★★ la cama 9 SIGUE libre (el ingreso no resucitó al egresado)', libre('9') + '/' + (camaDe('9').PATIENT_ID || '(vacío)'), 'true/(vacío)');
  eq('   …y el egreso de P sigue siendo UNO', filasArchivo(PID_P).length + '/' + egresosDe(PID_P), '1/1');
  eq('   …el rechazo no deja sello en el caché (reintentar vuelve a evaluar)', PUTS.filter(k => /^op\|/.test(k) && k.indexOf(OP_B) !== -1).length, 0);

  // La respuesta SELLADA del primer ingreso sigue valiendo: es lo que el reintento legítimo recibe, sin escribir.
  M.reiniciar();
  const r3 = llama('GUARDAR_EVOLUCION', ingresoGE('9', PID_P, { OP_ID: OP_A }));
  eq('   …y el MISMO OP_ID del primer ingreso (el sello sigue) devuelve la respuesta sellada, sin escribir', r3.ok + '/' + (r3.data || {}).repetida + '/' + M.total(), 'true/true/0');
  eq('   …y la cama sigue libre', libre('9'), true);

  // Con una segunda alta posterior de OTRO paciente en la misma cama nada se mezcla: Q entra normal.
  const q = llama('GUARDAR_EVOLUCION', ingresoGE('9', PID_Q, { PAC_NOMBRE: 'Paciente Bravo' }));
  eq('   …y un paciente NUEVO (otro pid) puede ocupar esa cama con normalidad', q.ok + '/' + camaDe('9').PATIENT_ID, 'true/' + PID_Q);
});

tramo('F2 INGRESAR_PACIENTE', () => {
  console.log('   · F2 · INGRESAR_PACIENTE: la misma secuencia');
  volver();
  const i1 = llama('INGRESAR_PACIENTE', ingresoAPI('7', { PATIENT_ID: PID_P, OP_ID: OP_A }));
  const a1 = darAlta('7');
  si('(el montaje) el ingreso entra, se da el alta y queda UN egreso de P', i1.ok && a1.ok && libre('7') && filasArchivo(PID_P).length === 1);
  const base = sinBit(); M.reiniciar(); const a0 = DB.AUDIT_LOG.length;
  const i2 = llama('INGRESAR_PACIENTE', ingresoAPI('7', { PATIENT_ID: PID_P, OP_ID: OP_B }));
  conflicto('INGRESAR_PACIENTE de un paciente ya egresado (otro OP_ID)', i2, M.registro(), sinBit() === base,
    DB.AUDIT_LOG.slice(a0).filter(f => String(f.accion).indexOf('INGRESAR_PACIENTE') === 0), 'INGRESAR_PACIENTE', '7');
  eq('★★ la cama 7 SIGUE libre y el egreso de P sigue siendo UNO', libre('7') + '/' + filasArchivo(PID_P).length, 'true/1');
  // Sin OP_ID (sin sello posible) lo mismo.
  M.reiniciar();
  const i3 = llama('INGRESAR_PACIENTE', ingresoAPI('7', { PATIENT_ID: PID_P }));
  eq('   …y sin OP_ID también', i3.ok + '/' + i3.codigo + '/' + M.total() + '/' + libre('7'), 'false/CONFLICTO/0/true');
});

tramo('F3 hito de egreso sin fila de archivo', () => {
  console.log('   · F3 · el egreso también se reconoce por su HITO (aunque la fila del archivo no esté)');
  volver();
  llama('GUARDAR_EVOLUCION', ingresoGE('9', PID_P, { OP_ID: OP_A }));
  darAlta('9');
  DB.ARCHIVO_PACIENTES.length = 0;
  si('(el montaje) el hito de egreso de P sigue y la fila del archivo no', egresosDe(PID_P) === 1 && filasArchivo(PID_P).length === 0);
  const base = sinBit(); M.reiniciar();
  const r = llama('GUARDAR_EVOLUCION', ingresoGE('9', PID_P, { OP_ID: OP_B }));
  eq('★ GUARDAR_EVOLUCION: CONFLICTO, sin escribir y la cama libre', r.ok + '/' + r.codigo + '/' + M.total() + '/' + libre('9') + '/' + (sinBit() === base), 'false/CONFLICTO/0/true/true');
  const i = llama('INGRESAR_PACIENTE', ingresoAPI('9', { PATIENT_ID: PID_P, OP_ID: OP_B }));
  eq('★ INGRESAR_PACIENTE: igual', i.ok + '/' + i.codigo + '/' + M.total() + '/' + libre('9') + '/' + (sinBit() === base), 'false/CONFLICTO/0/true/true');
});

tramo('F4 alta a medias y reintento legítimo', () => {
  console.log('   · F4 · un alta que murió después de escribir el egreso: el ingreso reenviado NO es un reintento, el ALTA reintentada sí converge');
  volver();
  llama('GUARDAR_EVOLUCION', ingresoGE('9', PID_P, { OP_ID: OP_A }));
  callando(() => { M.muereTrasLaEscritura(1); darAlta('9'); });   // la primera escritura del alta es el egreso en el archivo
  M.reiniciar();
  si('(el montaje) el egreso de P quedó escrito y la cama 9 sigue OCUPADA por P', filasArchivo(PID_P).length === 1 && !libre('9') && camaDe('9').PATIENT_ID === PID_P);
  const base = sinBit(); M.reiniciar();
  const r = llama('GUARDAR_EVOLUCION', ingresoGE('9', PID_P, { OP_ID: OP_B }));
  eq('★ el ingreso reenviado de quien YA TIENE egreso escrito es CONFLICTO, aunque la cama siga ocupada por él: no se vuelve a ingresar', r.ok + '/' + r.codigo + '/' + M.total() + '/' + (sinBit() === base), 'false/CONFLICTO/0/true');
  const a = darAlta('9');
  eq('★★ y el REINTENTO DEL ALTA sí converge: termina (ok), libera la cama y deja UN egreso con UN hito', a.ok + '/' + libre('9') + '/' + filasArchivo(PID_P).length + '/' + egresosDe(PID_P), 'true/true/1/1');
});

tramo('F5 reintento legítimo del ingreso', () => {
  console.log('   · F5 · el reintento legítimo del ingreso (cama ocupada por ese pid, SIN egreso) sigue convergiendo con otro OP_ID o sin sello');
  volver();
  const r1 = llama('GUARDAR_EVOLUCION', ingresoGE('9', PID_P, { OP_ID: OP_A }));
  const r2 = llama('GUARDAR_EVOLUCION', ingresoGE('9', PID_P, { OP_ID: OP_B }));
  eq('GUARDAR_EVOLUCION con otro OP_ID: ok, UNA evolución y UN hito de ingreso', r1.ok + '/' + r2.ok + '/' + filasDe('9').length + '/' + ingresosDe(PID_P), 'true/true/1/1');
  volver();
  llama('INGRESAR_PACIENTE', ingresoAPI('7', { PATIENT_ID: PID_P, OP_ID: OP_A }));
  M.reiniciar();
  const j = llama('INGRESAR_PACIENTE', ingresoAPI('7', { PATIENT_ID: PID_P, OP_ID: OP_B }));
  // (la única «escritura» que cuenta el banco con un OP_ID es el sello del caché; a las hojas no se escribe nada)
  eq('INGRESAR_PACIENTE con otro OP_ID: ok «ya estaba», sin escribir a las hojas', j.ok + '/' + (j.data || {}).yaEstaba + '/' + M.registro().filter(x => !/^CacheService\./.test(x)).length, 'true/true/0');
});

/* ══ G · H14 · LA FORMA Y LA UNICIDAD DEL PATIENT_ID EN GUARDAR_EVOLUCION ══ */
console.log('\nG · H14: el PATIENT_ID nuevo que llega al guardado tiene la forma de siempre y no está en OTRA cama ocupada');

tramo('G1 la forma', () => {
  console.log('   · G1 · un PATIENT_ID mal formado se RECHAZA (VALIDACION) sin escribir');
  const MALOS = [['con espacios y barras', 'X Y/../<b>'], ['con barra vertical', 'pid|con|barra|01'], ['corto', 'pid_123'],
    ['de 65 caracteres', 'o'.repeat(65)], ['con tilde', 'pid-ñandú-0001'], ['un número', 12345678], ['una lista', [PID_P]], ['un objeto', { a: 1 }]];
  MALOS.forEach(([etq, malo]) => {
    volver(); M.reiniciar();
    const r = llama('GUARDAR_EVOLUCION', ingresoGE('6', malo));
    eq('★ ingreso con PATIENT_ID ' + etq + ': VALIDACION, la cama sigue libre y CERO escrituras', r.ok + '/' + r.codigo + '/' + libre('6') + '/' + M.total(), 'false/VALIDACION/true/0');
    si('   …el motivo dice PATIENT_ID y no repite el valor recibido', /PATIENT_ID/.test(r.error || '') && !/X Y|barra vertical|ñandú|pid_123|ooooo/.test(r.error || ''));
  });
  // Y un uuid bien formado entra como siempre.
  volver();
  eq('★ un uuid acuñado por la pantalla entra (la forma no estorba al camino normal)', llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_P)).ok, true);
});

tramo('G2 el pid ya está en otra cama', () => {
  console.log('   · G2 · un PATIENT_ID que YA ocupa OTRA cama se rechaza sin escribir (el mismo paciente no puede estar en dos camas)');
  volver();
  llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_P));
  const base = sinBit(); M.reiniciar();
  const r = llama('GUARDAR_EVOLUCION', ingresoGE('7', PID_P, { PAC_NOMBRE: 'Paciente Bravo' }));
  no('★ el ingreso a la cama 7 con el pid que ya está en la 6: se RECHAZA', r.ok);
  eq('   …sin escribir nada (base idéntica) y la cama 7 sigue libre', M.total() + '/' + (sinBit() === base) + '/' + libre('7'), '0/true/true');
  si('   …con un motivo que dice que ese identificador ya está en otra cama', /otra cama/.test(r.error || ''));
  si('   …sin dar el identificador ni nombrar a nadie (Ley 19.628)', sinDatosAjenos(r.error || ''));
  eq('   …y P sigue ÚNICAMENTE en la cama 6', DB.CAMAS_ESTADO.filter(c => c.PATIENT_ID === PID_P && c.OCUPADA === true).map(c => c.ID_CAMA).join(','), '6');

  console.log('   · G2b · INGRESAR_PACIENTE, la puerta gemela');
  M.reiniciar();
  const i = llama('INGRESAR_PACIENTE', ingresoAPI('7', { PATIENT_ID: PID_P, nombre: 'Paciente Bravo' }));
  eq('★ INGRESAR_PACIENTE con el pid de otra cama ocupada: rechazo, sin escribir y la cama 7 libre', i.ok + '/' + M.total() + '/' + libre('7'), 'false/0/true');

  console.log('   · G2c · una cama LIBRE que conserva ese pid escrito no cuenta (una cama libre no tiene dueño)');
  volver();
  Object.assign(camaDe('9'), { OCUPADA: false, STATUS_CAMA: 'Libre', PATIENT_ID: PID_P });
  const l = llama('GUARDAR_EVOLUCION', ingresoGE('6', PID_P));
  eq('★ el ingreso de P a la cama 6 entra aunque la cama 9 (libre) conserve su pid viejo', l.ok + '/' + camaDe('6').PATIENT_ID, 'true/' + PID_P);
});

tramo('G3 pids antiguos', () => {
  console.log('   · G3 · las camas YA ocupadas con un pid antiguo (que no tiene la forma acuñada) siguen guardando normal');
  volver();
  Object.assign(camaDe('8'), { OCUPADA: true, STATUS_CAMA: 'Ocupada', PATIENT_ID: 'PID-ANT', NOMBRE: 'Paciente Antiguo', EDAD: 70, SEXO: 'M' });
  const g1 = llama('GUARDAR_EVOLUCION', evo('8', { EPISODIO_ABIERTO: 'PID-ANT', PAC_NOMBRE: 'Paciente Antiguo' }));
  eq('★ un guardado normal de esa cama (episodio abierto = su pid antiguo, sin PATIENT_ID) guarda', g1.ok + '/' + camaDe('8').PATIENT_ID, 'true/PID-ANT');
  const g2 = llama('GUARDAR_EVOLUCION', evo('8', { EPISODIO_ABIERTO: 'PID-ANT', PATIENT_ID: 'PID-ANT', PAC_NOMBRE: 'Paciente Antiguo' }));
  eq('★ y mandando ese MISMO pid en el payload (no es un pid nuevo: no se le exige la forma) también', g2.ok + '/' + camaDe('8').PATIENT_ID, 'true/PID-ANT');
  const g3 = llama('GUARDAR_EVOLUCION', ingresoGE('8', 'PID-ANT', { ES_INGRESO: false, PAC_NOMBRE: 'Paciente Antiguo' }));
  eq('   …y el reintento de un ingreso sobre esa cama con ese mismo pid antiguo (vacío + pid de la cama) tampoco se rechaza por la forma', g3.ok, true);
  // El cambio de identidad con un pid nuevo mal formado sí se rechaza, aunque la cama tenga un pid antiguo.
  M.reiniciar();
  const g4 = llama('GUARDAR_EVOLUCION', evo('8', { EPISODIO_ABIERTO: 'PID-ANT', PATIENT_ID: 'X Y/../<b>', PAC_NOMBRE: 'Paciente Antiguo' }));
  eq('★ pero un pid NUEVO mal formado sobre esa cama se rechaza (VALIDACION) sin escribir', g4.ok + '/' + g4.codigo + '/' + M.total(), 'false/VALIDACION/0');
});

/* ══ E · LA FORMA ═════════════════════════════════════════════════════════ */
console.log('\nE · La forma: la regla va DENTRO del lock, después de validarEpisodioAbierto y antes de la primera escritura');
tramo('E forma', () => {
  const cuerpoDeEn = (archivo, nombre) => {
    const src = leer(archivo);
    const ini = src.indexOf('function ' + nombre + '(');
    const fin = ini === -1 ? -1 : src.indexOf('\n}\n', ini);
    return (ini === -1 || fin === -1) ? '' : src.slice(ini, fin).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  };
  const ge = cuerpoDeEn('svc_evoluciones.gs', 'guardarEvolucion');
  si('★ guardarEvolucion recibe el reclamo de episodio como ÚLTIMO parámetro', /^function guardarEvolucion\(datos, ctx, ep\)/.test(ge));
  const iLock = ge.indexOf('conLock(');
  const iAbierto = ge.indexOf('validarEpisodioAbierto(');
  const iIngreso = ge.indexOf('_candadoDeIngreso(');
  const iEsc = ge.search(/\brepo(Actualizar|Insertar|Upsert|UpsertEnFila|InsertarVarios)\(/);
  si('   …toma el lock y DENTRO compara el episodio abierto (validarEpisodioAbierto)', iLock > -1 && iAbierto > iLock);
  si('★ …y la regla del ingreso va DESPUÉS de validarEpisodioAbierto', iIngreso > iAbierto && iAbierto > -1);
  si('★★ …y ANTES de la primera escritura', iIngreso > -1 && iEsc > iIngreso);
  eq('   …y ANTES del conLock no se lee ninguna hoja (solo la validación pura del payload)',
    (ge.slice(0, iLock).match(/\b(repo[A-Za-z]+|obtener[A-Za-z]+|_ubicar[A-Za-z]+)\(/g) || []).join(',') || '(nada)', '(nada)');
  const ci = cuerpoDeEn('svc_evoluciones.gs', '_candadoDeIngreso');
  si('★ _candadoDeIngreso solo invoca la regla con identidad propia o en modo estricto (los bancos antiguos no cargan dominio_validacion.gs)',
    /decidirEpisodioPuerta\('INGRESO'/.test(ci) && /estricto/.test(ci) && /propio/.test(ci));
  si('   …y el ausente en modo estricto se rechaza con la regla de las demás puertas (validarEpisodioPuerta)', /validarEpisodioPuerta\(/.test(ci));

  const ip = cuerpoDeEn('svc_camas.gs', 'ingresarPaciente');
  si('★ ingresarPaciente recibe el reclamo de episodio como ÚLTIMO parámetro', /^function ingresarPaciente\(datos, ctx, ep\)/.test(ip));
  const jLock = ip.indexOf('conLock('), jDec = ip.indexOf("decidirEpisodioPuerta('INGRESO'");
  const jEsc = ip.search(/\brepoActualizar\(/);
  si('   …compara DENTRO del lock y ANTES de la primera escritura', jLock > -1 && jDec > jLock && jEsc > jDec);
  si('   …y solo invoca la regla con identidad propia o en modo estricto', /propio/.test(ip) && /estricto/.test(ip));
  si('   …y toma el PATIENT_ID que le dan en vez de acuñar siempre uno', /const patientId = propio \|\| Utilities\.getUuid\(\)/.test(ip) || /patientId = propio/.test(ip));
  no('★ el PATIENT_ID acuñado NO es columna nueva (viaja con las que ya existen; sin migración de esquema)', /PATIENT_ID_ACUNADO|PID_ACUNADO/.test(leer('esquema.gs')));
  const dom = leer('dominio_validacion.gs');
  si('★ la regla del ingreso vive en dominio_validacion.gs, en la misma tabla de puertas que las demás', /case 'INGRESO':/.test(dom));
  si('   …y su mensaje no es el del cambio de paciente (la pantalla distingue los dos por la frase)', /function _msgIngresoConflicto\(/.test(dom));
  // H14 · el pid nuevo (forma y otra cama) se comprueba DENTRO del lock, tras comparar el episodio y antes de la regla del ingreso
  // y de la primera escritura; la forma sale de UNA sola función de dominio (la misma de validarPayloadIngreso).
  const iPidNuevo = ge.indexOf('_candadoDePidNuevo(');
  si('★ H14 · guardarEvolucion llama a _candadoDePidNuevo DENTRO del lock, DESPUÉS de validarEpisodioAbierto y ANTES de la regla del ingreso',
    iPidNuevo > iAbierto && iAbierto > -1 && iPidNuevo < iIngreso);
  const cpn = cuerpoDeEn('svc_evoluciones.gs', '_candadoDePidNuevo');
  si('   …que exige la forma solo a un pid DISTINTO del de la cama (las camas con pids antiguos siguen guardando)',
    /cama\.PATIENT_ID/.test(cpn) && cpn.indexOf('_errPatientIdAcunado(') > cpn.indexOf('cama.PATIENT_ID'));
  si('   …y mira las otras camas con la función compartida (la misma en INGRESAR_PACIENTE)',
    /_pidEnOtraCamaOcupada\(/.test(cpn) && /_pidEnOtraCamaOcupada\(/.test(ip));
  si('   …y la forma sale de UNA función de dominio que validarPayloadIngreso también usa',
    /function _errPatientIdAcunado\(/.test(dom) && /_errPatientIdAcunado\(d\.PATIENT_ID\)/.test(dom));
  // H9 · el egresado se lee solo con identidad propia y la regla pura decide.
  si('★ H9 · _candadoDeIngreso lee si el pid propio ya egresó SOLO con identidad propia y se lo da a la regla (archivado)',
    /propio \? _episodioYaEgresado\(propio\)/.test(ci) && /archivado: archivado/.test(ci));
  si('   …igual que ingresarPaciente (las dos puertas que ingresan deciden con la misma fila)',
    /archivado: propio \? _episodioYaEgresado\(propio\)/.test(ip));
  // H18 · el reintento «ya estaba» completa lo que falte ANTES de contestar.
  const iYa = ip.indexOf("d.estado === 'yaHecho'");
  const iCompl = ip.indexOf('_ingresoCompletarSiFalta(');
  const iOkYa = ip.indexOf("accion: 'ingreso (ya estaba)'");
  si('★ H18 · la rama «ya estaba» de ingresarPaciente completa el hito y la tarjeta ANTES de contestar', iYa > -1 && iCompl > iYa && iOkYa > iCompl);
  // H9 · darAltaPaciente rechaza la fila de archivo de OTRA estadía antes de la primera escritura.
  const da = cuerpoDeEn('svc_camas.gs', 'darAltaPaciente');
  const iMisma = da.indexOf('_esLaMismaEstadia('), iIns = da.indexOf("repoInsertar('ARCHIVO_PACIENTES'");
  si('★ H9 · darAltaPaciente rechaza la fila de archivo de otra estadía ANTES de escribir el egreso', iMisma > -1 && iIns > iMisma);
  const api_ = leer('api.gs');
  si('★ api.gs le pasa el reclamo a las dos puertas (GUARDAR_EVOLUCION e INGRESAR_PACIENTE)',
    /guardarEvolucion\(datos, ctx, _epDeDatos\(datos\)\)/.test(api_) && /ingresarPaciente\(datos, ctx, _epDeDatos\(datos\)\)/.test(api_));
});

terminar();
