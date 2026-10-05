// episodio_al_guardar.js — EL EPISODIO SE COMPRUEBA AL GUARDAR (G14, 4-oct-2026).
//
// 🔴 DE DÓNDE SALE. `guardarEvolucion` decidía a quién pertenecía lo que se guarda con una sola línea:
//
//        let patientId = datos.PATIENT_ID || cama.PATIENT_ID || '';
//
// o sea «el paciente que tenga la cama AHORA». Nada comparaba ese paciente con el que el formulario había
// abierto. Un formulario que quedaba abierto —el celular sobre el velador, la pestaña olvidada en el PC de
// la unidad— mientras la cama se daba de alta y se reingresaba a OTRO paciente escribía la evolución del
// anterior sobre el ocupante nuevo, SIN AVISAR: la fila quedaba con el PATIENT_ID del nuevo, y
// `_syncCamaDesdeEvolucion` le copiaba a su tarjeta los parámetros del paciente que ya no estaba. Es el
// peor error de un registro clínico: dato verdadero atribuido a la persona equivocada, y que nadie ve.
//
// EL CONTRATO (G14 del plan):
//   1. La pantalla manda, junto al guardado, el episodio que abrió: `EPISODIO_ABIERTO` (el PATIENT_ID de la
//      tarjeta tal como estaba al ABRIR el formulario, no al guardar). No es columna de ninguna hoja.
//   2. El servidor lo compara con el episodio actual de la cama DENTRO del lock y ANTES de cualquier
//      escritura. Si no coincide —la cama pasó a otro paciente, o quedó libre— RECHAZA, y el rechazo no
//      deja ninguna escritura parcial (ni fila, ni cama, ni hito, ni hoja alguna; solo la huella en
//      AUDIT_LOG, que es justamente el rastro del rechazo).
//   3. El mensaje dice en palabras simples que la cama cambió de paciente y que hay que reabrirla, sin
//      nombrar a nadie.
//   4. El formulario de la pantalla se CONSERVA: sigue lleno, con su franja de error persistente. Y como
//      «reabrir la cama» devolvería el borrador local del paciente anterior al formulario del nuevo, el
//      borrador lleva el episodio al que pertenece y NO se restaura sobre otro.
//
// F2 (revisión adversarial, 4-oct-2026) — TRES SALIDAS QUE FALTABAN, secciones 8 a 10:
//   · 8  La vista RETROSPECTIVA. La tarjeta de «Ver / editar» se arma con lo registrado ESE día, pero el formulario
//        reclamaba el episodio del censo EN VIVO: con la cama hoy de otro paciente, el turno pasado de K se
//        escribía sobre L, y el servidor lo aceptaba. Ahora reclama el de la tarjeta que se MOSTRÓ. Se prueba
//        TOCANDO el botón de la tarjeta (no llamando a abrirPanel a mano) y contra el servidor real.
//        🔴 DECISIÓN DE DIEGO, PENDIENTE: ¿se debe poder corregir el turno pasado de un paciente ya egresado cuando
//        su cama ya la ocupa otro? Por omisión el servidor lo RECHAZA con el mensaje acordado: es lo seguro.
//   · 9  La salida del rechazo: «Reintentar» reenvía lo mismo y recibe lo mismo; lo principal es cerrar la cama.
//   · 10 El «borrador sin guardar» del aviso de fin de turno cuenta solo el borrador DE ESE paciente.
//
// LAS REGLAS FINAS, y por qué:
//   · Campo AUSENTE (llamadas por API sin navegador: smoke tests, build/sim, medidores) ⇒ no rechaza. Es
//     compatibilidad. El cliente real SIEMPRE lo manda.
//   · Formulario que abrió SIN episodio (`''`: ingreso en cama libre, o episodio sin ingreso formal) ⇒ no
//     reclama ninguno, y guarda como hoy. 🪤 A propósito: si ese `''` rechazara cuando la cama ya tiene
//     paciente, el reintento automático de un INGRESO (el primer intento aterrizó y la respuesta se perdió)
//     se vería igual que «otro ingreso en la misma cama» y se rechazaría por error. Lo que sí se hace es que,
//     al guardar bien, la pantalla toma el episodio que el servidor le devuelve: desde ahí el formulario ya
//     es de ese paciente y queda protegido.
//     🔴 RECONCILIADO el 5-oct-2026 (tanda 2 del guardado seguro, G15, paso 16). Ese `''` solo es «como hoy» cuando el
//     ingreso NO trae identidad propia (pantalla vieja, API sin navegador, modo tolerante): ahí no hay con qué distinguir el
//     reintento propio de un ingreso ajeno, y el servidor sigue dejándolo pasar. La pantalla de ahora acuña un PATIENT_ID
//     al abrir el ingreso sobre una cama LIBRE y lo manda junto al `''`; CON él sí se distingue: cama libre o con ESE mismo
//     pid sigue (el reintento propio, sin duplicar nada), cama con OTRO pid es CONFLICTO sin escribir. Esta guardia ata las
//     dos mitades (4b en el servidor, 6 en la pantalla); la carrera completa la ata guardado_seguro_ingreso_g15.js.
//   · Episodio con valor ⇒ tiene que ser EL de la cama. Cama de otro paciente, o libre (alta, traslado,
//     limpieza): se rechaza.
//
// Uso: node build/checks/episodio_al_guardar.js (requiere playwright-core)
//
// 🪤 EL RELOJ VA CONGELADO. Las fechas se INVENTAN (2026-08-10, un lunes lejos de Fiestas Patrias y del
// cambio de turno) y en la pantalla se congela `Date` a las 12:00 de ese día.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const V2 = path.resolve(__dirname, '..', '..', 'v2');
const S = require('../sim/sim_srv.js');
const { api, DB, SIM, CONFIG } = S;

SIM.fecha = '2026-08-10'; SIM.hora = '12:00:00';

const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g) + (okk ? '' : ' (esperado ' + JSON.stringify(w) + ')'));
  if (!okk) fails.push(l);
};
const si = (l, c) => eq(l, !!c, true);
const no = (l, c) => eq(l, !!c, false);

const TK = '2026-08-10-Dia';
const camaDe = id => DB.CAMAS_ESTADO.find(c => String(c.ID_CAMA) === String(id)) || {};
const filasCama = id => DB.EVOLUCIONES.filter(e => String(e.ID_CAMA) === String(id));
// La base COMPLETA menos la bitácora: la huella del rechazo en AUDIT_LOG es lo único que se espera de más.
const sinBitacora = () => {
  const o = {}; Object.keys(DB).forEach(k => { if (k !== 'AUDIT_LOG') o[k] = DB[k]; });
  o.__CONFIG = CONFIG;
  return JSON.stringify(o);
};

// Espía de ESCRITURAS: cuenta cada llamada a la capa que escribe en hojas. «Que la base quede igual» no
// distingue «no escribió» de «escribió y deshizo»; esto sí.
const ESCRITORES = ['repoActualizar', 'repoActualizarDonde', 'repoInsertar', 'repoUpsert', 'repoUpsertEnFila',
  'repoEscribirFila', 'repoEliminarDonde', 'repoEliminarFilas', 'repoEliminarPorCols', 'repoInsertarVarios', 'escribirConfig'];
let ESCRITURAS = [];
ESCRITORES.forEach(n => {
  const orig = global[n];
  global[n] = function () { ESCRITURAS.push(n + '(' + String(arguments[0]) + ')'); return orig.apply(this, arguments); };
});
// Gancho del candado: lo que pase «mientras otra petición tenía el lock» ocurre ANTES de que corra el cuerpo.
const conLockOrig = global.conLock;
let ANTES_DEL_CUERPO = null;
global.conLock = fn => {
  if (ANTES_DEL_CUERPO) { const h = ANTES_DEL_CUERPO; ANTES_DEL_CUERPO = null; h(); }
  return conLockOrig(fn);
};

// El payload tal como lo manda la pantalla: claves ID_CAMA / TURNO_KEY en mayúsculas.
const evo = (idCama, extra) => Object.assign({
  ID_CAMA: String(idCama), TURNO_KEY: TK, PLAN_FIRMA_KINE: 'DMV',
  VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', VENT_MODO: 'ACVC',
  VENT_VT: 450, VENT_FR: 16, VENT_PEEP: 8, VENT_FIO2: 50, HEMO_ESTADO: 'Estable', SED_TIPO: 'Sin sedación',
}, extra || {});
const ingresar = (idCama, nombre, via, sop) => api('INGRESAR_PACIENTE', { idCama: String(idCama), nombre, edad: 61, sexo: 'M',
  diagnostico: 'Dx de prueba', fechaIngreso: '2026-08-08', viaAerea: via || 'TOT', soporte: sop || 'VM',
  modo: sop === 'Ambiente' ? 'Sin soporte' : 'ACVC', firmaKine: 'DMV' }, null);
const alta = idCama => api('DAR_ALTA', { idCama: String(idCama), motivoEgreso: 'Traslado a sala', destinoEgreso: 'Medicina', firmaKine: 'DMV' }, null);

// Un guardado que DEBE rechazarse: devuelve la respuesta y comprueba el contrato entero.
function rechazado(etiqueta, payload, idCama) {
  const foto = sinBitacora();
  const bitAntes = DB.AUDIT_LOG.length;
  ESCRITURAS = [];
  const r = api('GUARDAR_EVOLUCION', payload, null);
  no('★ ' + etiqueta + ': se RECHAZA', r.ok);
  eq('   …con código de validación', r.codigo, 'VALIDACION');
  si('   …dice que la cama cambió de paciente', /cambi[oó] de paciente/i.test(r.error || ''));
  si('   …y que hay que volver a abrir la cama', /vuelve a abrir la cama/i.test(r.error || ''));
  si('   …nombrando la cama ' + idCama, new RegExp('cama ' + idCama + '\\b').test(r.error || ''));
  eq('★★ ' + etiqueta + ': NINGUNA escritura a ninguna hoja (ni intentada)', ESCRITURAS.join(' | ') || '(ninguna)', '(ninguna)');
  si('★★ ' + etiqueta + ': la base COMPLETA quedó idéntica (salvo la bitácora)', sinBitacora() === foto);
  const nuevas = DB.AUDIT_LOG.slice(bitAntes);
  eq('   …la bitácora gana UNA fila: la huella del rechazo', nuevas.length, 1);
  eq('   …que es «GUARDAR_EVOLUCION_RECHAZADO»', (nuevas[0] || {}).accion, 'GUARDAR_EVOLUCION_RECHAZADO');
  eq('   …y nombra la cama que se intentó escribir', (nuevas[0] || {}).idEntidad, String(idCama));
  return r;
}

(async () => {
  /* ══ 1 · EL FORMULARIO VIGENTE GUARDA, Y SU REINTENTO NO DUPLICA ══════ */
  console.log('1 · El formulario del episodio vigente guarda como siempre');
  let r = ingresar('6', 'Paciente Alfa');
  eq('ingresa A en la cama 6', r.ok, true);
  const PID_A = camaDe('6').PATIENT_ID;
  r = api('GUARDAR_EVOLUCION', evo('6', { EPISODIO_ABIERTO: PID_A, RESP_KTR_CANT: 2 }), null);
  eq('★ guardar con el episodio vigente PASA', r.ok, true);
  eq('   …la fila lleva el episodio de A', (filasCama('6')[0] || {}).PATIENT_ID, PID_A);
  r = api('GUARDAR_EVOLUCION', evo('6', { EPISODIO_ABIERTO: PID_A, RESP_KTR_CANT: 2 }), null);
  eq('★ el reintento del MISMO payload también pasa (el reintento automático de 3 s)', r.ok, true);
  eq('   …y sigue habiendo UNA fila', filasCama('6').length, 1);

  /* ══ 2 · EL FORMULARIO VIEJO SE RECHAZA, SIN ESCRITURAS ═══════════════ */
  console.log('\n2 · A se da de alta y B ocupa la cama: el formulario de A se rechaza');
  r = alta('6');
  eq('A se da de alta', r.ok, true);
  r = ingresar('6', 'Paciente Bravo');
  eq('ingresa B en la misma cama', r.ok, true);
  const PID_B = camaDe('6').PATIENT_ID;
  si('B tiene un episodio distinto del de A', PID_B && PID_B !== PID_A);
  const rA = rechazado('alta + reingreso', evo('6', { EPISODIO_ABIERTO: PID_A, RESP_KTR_CANT: 9, PLAN_NOTA_TURNO: 'nota de A' }), '6');
  si('   …el mensaje no nombra a nadie ni lleva identificadores de episodio',
    !/Alfa|Bravo/.test(rA.error || '') && !(rA.error || '').includes(PID_A) && !(rA.error || '').includes(PID_B));
  const MSG = rA.error || '';
  eq('   …la cama sigue siendo de B', camaDe('6').NOMBRE, 'Paciente Bravo');
  eq('   …y ninguna fila de la cama 6 lleva el episodio de A', filasCama('6').filter(e => e.PATIENT_ID === PID_A).length, 0);

  console.log('\n   La cama rota SIN alta (limpieza manual): el formulario de B se rechaza');
  r = api('GUARDAR_EVOLUCION', evo('6', { EPISODIO_ABIERTO: PID_B, RESP_KTR_CANT: 3 }), null);
  eq('   el formulario VIGENTE de B pasa', r.ok, true);
  eq('   …y la fila de B lleva su episodio', (filasCama('6').filter(e => e.PATIENT_ID === PID_B)[0] || {}).PATIENT_ID, PID_B);
  const c6 = camaDe('6'); c6.OCUPADA = false; c6.PATIENT_ID = ''; c6.NOMBRE = '';   // efecto de limpiarCamasManual
  r = ingresar('6', 'Paciente Charly');
  eq('   ingresa C en la cama 6 sin que B se haya archivado', r.ok, true);
  const PID_C = camaDe('6').PATIENT_ID;
  rechazado('rotación sin alta', evo('6', { EPISODIO_ABIERTO: PID_B, RESP_KTR_CANT: 7 }), '6');

  console.log('\n   La cama quedó LIBRE (alta): el formulario del paciente que estaba se rechaza');
  r = alta('6');
  eq('   C se da de alta: la cama queda libre', r.ok && !camaDe('6').OCUPADA && !camaDe('6').PATIENT_ID, true);
  rechazado('cama libre tras el alta', evo('6', { EPISODIO_ABIERTO: PID_C, RESP_KTR_CANT: 5 }), '6');

  console.log('\n   El paciente se TRASLADÓ de cama: el formulario de la cama de origen se rechaza');
  r = ingresar('11', 'Paciente Delta');
  const PID_D = camaDe('11').PATIENT_ID;
  r = api('MOVER_A_CAMA_VACIA', { idOrigen: '11', idDestino: '12' }, null);
  eq('   D se traslada de la 11 a la 12', r.ok && !camaDe('11').OCUPADA && camaDe('12').PATIENT_ID === PID_D, true);
  rechazado('traslado de cama', evo('11', { EPISODIO_ABIERTO: PID_D, RESP_KTR_CANT: 4 }), '11');
  r = api('GUARDAR_EVOLUCION', evo('12', { EPISODIO_ABIERTO: PID_D, RESP_KTR_CANT: 4 }), null);
  eq('   y el formulario abierto en la cama NUEVA (mismo episodio) sí pasa', r.ok, true);

  /* ══ 3 · LA COMPARACIÓN ES DENTRO DEL LOCK ════════════════════════════ */
  console.log('\n3 · La cama se lee y se compara DENTRO del lock (otra petición se adelanta)');
  ingresar('5', 'Paciente Eco');
  const PID_E = camaDe('5').PATIENT_ID;
  let fotoTrasElAdelanto = null, bitTrasElAdelanto = 0;
  // Mientras esta petición espera el lock, otra alcanza a dar de alta a E y a ingresar a F. Una comprobación
  // hecha FUERA del lock vería todavía a E en la cama y dejaría pasar el guardado.
  ANTES_DEL_CUERPO = () => {
    alta('5'); ingresar('5', 'Paciente Foxtrot');
    fotoTrasElAdelanto = sinBitacora(); bitTrasElAdelanto = DB.AUDIT_LOG.length; ESCRITURAS = [];
  };
  r = api('GUARDAR_EVOLUCION', evo('5', { EPISODIO_ABIERTO: PID_E, RESP_KTR_CANT: 6 }), null);
  si('el adelanto de la otra petición ocurrió', fotoTrasElAdelanto !== null);
  no('★★ el formulario de E se rechaza aunque la cama cambiara DESPUÉS de llegar la petición', r.ok);
  eq('   …sin ninguna escritura', ESCRITURAS.join(' | ') || '(ninguna)', '(ninguna)');
  si('   …y con la base idéntica a como la dejó la otra petición', sinBitacora() === fotoTrasElAdelanto);
  eq('   …dejando solo la huella del rechazo en la bitácora', DB.AUDIT_LOG.length - bitTrasElAdelanto, 1);

  /* ══ 4 · LAS REGLAS FINAS ═════════════════════════════════════════════ */
  console.log('\n4 · Reglas finas: sin ingreso formal, ingreso nuevo, compatibilidad');
  // a) Episodio SIN ingreso formal: cama ocupada, sin PATIENT_ID, formulario sin episodio.
  Object.assign(camaDe('8'), { OCUPADA: true, STATUS_CAMA: 'Ocupada', PATIENT_ID: '', NOMBRE: 'Paciente sin ingreso formal', EDAD: 70, SEXO: 'M' });
  r = api('GUARDAR_EVOLUCION', evo('8', { EPISODIO_ABIERTO: '', PAC_NOMBRE: 'Paciente sin ingreso formal' }), null);
  eq('★ sin PATIENT_ID en ambos lados: guarda como hoy', r.ok, true);
  si('   …y la cama recibe su episodio (como hoy)', !!camaDe('8').PATIENT_ID);

  // b) Ingreso NUEVO en cama libre, y el re-guardado del mismo formulario.
  no('la cama 9 está libre', camaDe('9').OCUPADA);
  r = api('GUARDAR_EVOLUCION', evo('9', { ES_INGRESO: true, EPISODIO_ABIERTO: '', PAC_NOMBRE: 'Paciente Golf', PAC_EDAD: 55, PAC_SEXO: 'F', PAC_TALLA: 160 }), null);
  eq('★ ingreso nuevo en cama libre (formulario sin episodio): sigue funcionando', r.ok, true);
  const PID_G = (r.data || {}).patientId;
  si('   …el servidor devuelve el episodio recién creado', !!PID_G && PID_G === camaDe('9').PATIENT_ID);
  r = api('GUARDAR_EVOLUCION', evo('9', { EPISODIO_ABIERTO: PID_G, PAC_NOMBRE: 'Paciente Golf' }), null);
  eq('★ re-guardar ese formulario con el episodio que la pantalla recibió: pasa', r.ok, true);
  // El reintento del PROPIO ingreso cuyo primer intento aterrizó y la respuesta se perdió, SIN identidad propia (una
  // pantalla vieja, o una llamada por API): el formulario dice `''` y no trae PATIENT_ID. No hay con qué distinguirlo de
  // un ingreso ajeno, así que NO puede rechazarse por error (el servidor tolerante lo deja pasar como siempre).
  r = api('GUARDAR_EVOLUCION', evo('9', { ES_INGRESO: true, EPISODIO_ABIERTO: '', PAC_NOMBRE: 'Paciente Golf' }), null);
  eq('★ el reintento del propio ingreso SIN identidad propia (pantalla vieja, modo tolerante) NO se rechaza: como siempre', r.ok, true);
  eq('   …y no se abrió una segunda fila: sigue siendo UNA', filasCama('9').length, 1);

  // 🔴 5-oct-2026 · El MISMO `''`, pero con la identidad propia que la pantalla de ahora acuña al abrir el ingreso. Con ella el
  // servidor ya distingue las dos cosas que sin ella se veían idénticas.
  no('la cama 2 está libre', camaDe('2').OCUPADA);
  const PID_PROPIO = 'ing-propio-0002', PID_AJENO = 'ing-ajeno-0002';             // la forma que el servidor acepta: 8 a 64 de [A-Za-z0-9_-]
  const ingresoConIdentidad = (pid, nombre) => api('GUARDAR_EVOLUCION', evo('2', { ES_INGRESO: true, EPISODIO_ABIERTO: '', PATIENT_ID: pid,
    PAC_NOMBRE: nombre, PAC_EDAD: 48, PAC_SEXO: 'M', PAC_TALLA: 170 }), null);
  r = ingresoConIdentidad(PID_PROPIO, 'Paciente Kilo');
  eq('★ ingreso con identidad propia en cama libre: guarda, y la cama queda con ESA identidad', r.ok && camaDe('2').PATIENT_ID === PID_PROPIO, true);
  r = ingresoConIdentidad(PID_PROPIO, 'Paciente Kilo');
  eq('★ el reintento del propio ingreso (el mismo PATIENT_ID, el primero sí aterrizó): pasa', r.ok, true);
  eq('   …y sigue siendo UNA fila', filasCama('2').length, 1);
  {
    const foto = sinBitacora(); ESCRITURAS = [];
    r = ingresoConIdentidad(PID_AJENO, 'Paciente Lima');
    no('★★ OTRO ingreso sobre esa misma cama (otro PATIENT_ID, el mismo `\'\'` vacío): se RECHAZA', r.ok);
    eq('   …con código CONFLICTO (alguien se adelantó: no es un error de la pantalla)', r.codigo, 'CONFLICTO');
    eq('★★ …sin NINGUNA escritura a ninguna hoja (ni intentada)', ESCRITURAS.join(' | ') || '(ninguna)', '(ninguna)');
    si('   …y la base quedó idéntica (salvo la bitácora)', sinBitacora() === foto);
    si('   …sin nombrar al paciente de quien se adelantó (Ley 19.628)', !/Kilo/i.test(r.error || '') && !new RegExp(PID_PROPIO).test(r.error || ''));
    eq('   …la cama sigue siendo del primero', camaDe('2').PATIENT_ID, PID_PROPIO);
  }

  // c) Compatibilidad: sin el campo (API sin navegador), o con él nulo, no se rechaza.
  ingresar('10', 'Paciente Hotel');
  const PID_H = camaDe('10').PATIENT_ID;
  const pAusente = evo('10', {}); delete pAusente.EPISODIO_ABIERTO;
  r = api('GUARDAR_EVOLUCION', pAusente, null);
  eq('★ campo AUSENTE (llamada por API sin navegador): guarda', r.ok, true);
  r = api('GUARDAR_EVOLUCION', evo('10', { EPISODIO_ABIERTO: null }), null);
  eq('   campo en null: guarda', r.ok, true);
  r = api('GUARDAR_EVOLUCION', evo('10', { EPISODIO_ABIERTO: undefined }), null);
  eq('   campo undefined: guarda', r.ok, true);
  eq('   y la fila sigue siendo de H', (filasCama('10')[0] || {}).PATIENT_ID, PID_H);
  r = api('GUARDAR_EVOLUCION', evo('10', { EPISODIO_ABIERTO: PID_H + '-otro' }), null);
  no('   un episodio con valor que no es el de la cama se rechaza (no basta con que «parezca»)', r.ok);

  /* ══ 5 · LA FORMA DEL CONTRATO (estática) ═════════════════════════════ */
  console.log('\n5 · La forma del contrato');
  const svc = fs.readFileSync(path.join(V2, 'svc_evoluciones.gs'), 'utf8');
  const esq = fs.readFileSync(path.join(V2, 'esquema.gs'), 'utf8');
  const cuerpo = svc.slice(svc.indexOf('function guardarEvolucion('));
  const iLock = cuerpo.indexOf('return conLock(');
  const iChk = cuerpo.indexOf('validarEpisodioAbierto(');
  const iEscr = cuerpo.search(/repoUpsertEnFila\(|repoActualizar\(|repoInsertar\(|_syncCamaDesdeEvolucion\(/);
  si('guardarEvolucion llama a la comprobación', iChk > -1);
  si('★ …DENTRO del lock (después de `return conLock(`)', iLock > -1 && iChk > iLock);
  si('★ …y ANTES de la primera escritura', iChk > -1 && iEscr > -1 && iChk < iEscr);
  // 🪤 Los bancos de prueba antiguos (aet_serie, bdt_una_eleccion, eco_pulmonar, via_aerea_previo…) cargan una
  // lista FIJA de archivos con el servicio de evoluciones pero SIN dominio_validacion.gs. Si la regla viviera allá,
  // esos bancos reventarían con «no está definida» — o, peor, la comprobación se saltaría en silencio.
  const soloElServicio = new Function(svc + '\n;return typeof validarEpisodioAbierto;')();
  eq('★ la regla viaja con el servicio: evaluando SOLO svc_evoluciones.gs ya está definida', soloElServicio, 'function');
  no('EPISODIO_ABIERTO NO es columna de ninguna hoja (no entra al esquema)', /EPISODIO_ABIERTO/.test(esq));
  const ESQ = new Function(esq + '\n;return { E: ESQUEMA, f: esquemaObjetoAFila };')();
  const fila = ESQ.f('EVOLUCIONES', { ID_EVOLUCION: 'x', EPISODIO_ABIERTO: 'zzz-no-debe-llegar-a-la-hoja' });
  no('…y aunque viaje en el payload, no llega a la fila de la planilla', fila.some(x => x === 'zzz-no-debe-llegar-a-la-hoja'));

  /* ══ 6 · LA PANTALLA ══════════════════════════════════════════════════ */
  console.log('\n6 · En el navegador: el payload real lleva el episodio que se ABRIÓ');
  const CONGELADO = new Date('2026-08-10T12:00:00').getTime();
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(({ congelado }) => {
    const Real = Date;
    function Falso(...a) { return a.length ? new Real(...a) : new Real(congelado); }
    Falso.now = () => congelado; Falso.parse = Real.parse; Falso.UTC = Real.UTC; Falso.prototype = Real.prototype;
    window.Date = Falso;
    window.google = { script: { run: { withSuccessHandler(okF) { return { withFailureHandler() { return {
      api(a) { setTimeout(() => okF({ ok: true, data: (a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null) }), 5); }
    }; } }; } } } };
  }, { congelado: CONGELADO });
  await p.goto('file://' + path.join(V2, 'index.html'));
  await p.waitForTimeout(700);

  // Banco: la red del navegador simulada. `__modo` decide si el guardado sale bien o es rechazado.
  await p.evaluate(() => {
    localStorage.clear();
    window.__toasts = []; window.toast = m => window.__toasts.push(String(m));
    window.__ll = []; window.__modo = 'ok'; window.__msg = ''; window.__pidResp = '';
    window.recargarSilencioso = () => {};
    window.gs = (a, d, okf) => { window.__ll.push({ a, d }); if (okf) okf(a === 'GET_EVO_TURNO' ? { actual: null, previa: null, pronoAbierto: '' } : null); };
    window.api = (a, d) => {
      window.__ll.push({ a, d: JSON.parse(JSON.stringify(d || {})) });
      if (a !== 'GUARDAR_EVOLUCION') return Promise.resolve(null);
      return window.__modo === 'rechazo' ? Promise.reject(new Error(window.__msg))
        : Promise.resolve({ TEXTO_GENERADO: 'texto', patientId: window.__pidResp });
    };
    // El formulario lleno como lo llenaría un colega (la hemodinamia y la vía aérea son obligatorias y NO se
    // rellenan solas: una guardia que las pusiera sola taparía el caso «nadie la miró»).
    window.__llenar = () => {
      const f = $('fFirma'); if (![...f.options].some(o => o.value === 'KIN')) f.innerHTML = '<option value="KIN">KIN</option>';
      f.value = 'KIN';
      $('fHEst').value = 'Estable'; $('fDVA').value = 'Sin requerimientos';
      $('fVA').value = 'Natural';
      $('fPlanes').value = 'bipedestación asistida';
      _transAvisoOk = true; _formDirty = true;
    };
    window.__abrir = async (id, esIng, tarjeta) => {
      $('gDate').value = '2026-08-10'; SHIFT = 'Dia';
      DB = tarjeta ? [tarjeta] : [{ ID_CAMA: String(id), OCUPADA: false }];
      renderGrid(); abrirPanel(String(id), !!esIng, false);
      await new Promise(r => setTimeout(r, 450));
    };
    window.__guardar = async () => {
      window.__ll.length = 0; guardar();
      await new Promise(r => setTimeout(r, 200));
      return window.__ll.filter(x => x.a === 'GUARDAR_EVOLUCION').map(x => x.d);
    };
    // F2 · Abre la cama COMO LA ABRE LA PERSONA: tocando el botón de la tarjeta que la grilla dibuja (no llamando
    // a abrirPanel con el id a mano, que es justo lo que esconde el defecto). `retro` decide si la vista es la de
    // un día pasado (fecha elegida a mano: sin la marca `turno-hoy`) o la de hoy.
    window.__abrirDesdeTarjeta = async (id, fecha, turno, retro, viva, evoDelDia) => {
      $('gDate').value = fecha; SHIFT = turno;
      if (retro) $('gDate').classList.remove('turno-hoy'); else $('gDate').classList.add('turno-hoy');
      DB = [viva]; EVOS_DIA = evoDelDia ? [evoDelDia] : []; EVO_SET = new Set(evoDelDia ? [String(id)] : []);
      renderGrid();
      const nombre = ((document.querySelector('#bedGrid .bcard .pname') || {}).textContent || '').replace(/\s+/g, ' ').trim();
      const btn = [...document.querySelectorAll('#bedGrid .bcard button.bevo')].find(x => /Ver \/ editar|Evoluci[oó]n|Editar/.test(x.textContent));
      if (!btn) return { sinBoton: true, nombre };
      window.__ll.length = 0; btn.click();
      await new Promise(r => setTimeout(r, 450));
      const ge = window.__ll.filter(x => x.a === 'GET_EVO_TURNO').pop();
      return { sinBoton: false, nombre, boton: btn.textContent.trim(), getEvo: ge ? ge.d : null };
    };
  });

  // La cama 12 del servidor simulado: su episodio real, para mandar el payload REAL al servidor real.
  alta('12'); ingresar('12', 'Paciente India', 'Natural', 'Ambiente');
  const PID_I = camaDe('12').PATIENT_ID;
  const tarjetaDe = (id, pid, nombre) => ({ ID_CAMA: String(id), OCUPADA: true, PATIENT_ID: pid, NOMBRE: nombre, VIA_AEREA: 'Natural', SOPORTE: 'Ambiente' });

  let D = await p.evaluate(async ([pid]) => {
    await __abrir('12', false, { ID_CAMA: '12', OCUPADA: true, PATIENT_ID: pid, NOMBRE: 'Paciente India', VIA_AEREA: 'Natural', SOPORTE: 'Ambiente' });
    __llenar(); window.__pidResp = pid;
    return await __guardar();
  }, [PID_I]);
  eq('el guardado de la pantalla manda UN viaje de guardado', D.length, 1);
  const PAYLOAD_REAL = D[0] || {};
  si('★★ el payload lleva la clave EPISODIO_ABIERTO', 'EPISODIO_ABIERTO' in PAYLOAD_REAL);
  eq('★★ …y es el episodio de la tarjeta que se abrió', PAYLOAD_REAL.EPISODIO_ABIERTO, PID_I);

  // El mismo payload REAL, ahora contra el servidor real.
  ESCRITURAS = [];
  r = api('GUARDAR_EVOLUCION', JSON.parse(JSON.stringify(PAYLOAD_REAL)), null);
  eq('★ el payload real de la pantalla lo acepta el servidor mientras el episodio sigue vigente', r.ok, true);
  eq('   …y la fila quedó a nombre del episodio abierto', (filasCama('12').filter(e => e.TURNO_KEY === TK)[0] || {}).PATIENT_ID, PID_I);
  alta('12'); ingresar('12', 'Paciente Julieta', 'Natural', 'Ambiente');
  const PID_J = camaDe('12').PATIENT_ID;
  const antes = sinBitacora(); ESCRITURAS = [];
  r = api('GUARDAR_EVOLUCION', JSON.parse(JSON.stringify(PAYLOAD_REAL)), null);
  no('★★ el MISMO payload real, con la cama ya dada de alta y reingresada a otro paciente: se rechaza', r.ok);
  eq('   …con el mensaje de siempre', r.error, MSG.replace(/cama 6\b/, 'cama 12'));
  si('   …la base queda idéntica y la cama es de J', sinBitacora() === antes && camaDe('12').PATIENT_ID === PID_J && ESCRITURAS.length === 0);

  // El episodio es el que se ABRIÓ, no el que la tarjeta tenga al guardar.
  D = await p.evaluate(async () => {
    DB = [{ ID_CAMA: '12', OCUPADA: true, PATIENT_ID: 'pid-otro-hoy', NOMBRE: 'Otro', VIA_AEREA: 'Natural', SOPORTE: 'Ambiente' }];   // el censo se refrescó mientras el formulario seguía abierto
    __llenar();
    return await __guardar();
  });
  eq('★★ el censo se refresca con otro paciente y el formulario sigue mandando el episodio que ABRIÓ', (D[0] || {}).EPISODIO_ABIERTO, PID_I);

  // Otra cama no arrastra el episodio de la anterior.
  D = await p.evaluate(async () => {
    await __abrir('7', false, { ID_CAMA: '7', OCUPADA: true, PATIENT_ID: 'pid-siete', NOMBRE: 'Siete', VIA_AEREA: 'Natural', SOPORTE: 'Ambiente' });
    __llenar(); window.__pidResp = 'pid-siete';
    return await __guardar();
  });
  eq('★ abrir otra cama manda el episodio de ESA cama', (D[0] || {}).EPISODIO_ABIERTO, 'pid-siete');

  // Ingreso en cama libre: viaja vacío (presente, no ausente), y al guardar bien toma el episodio recibido.
  D = await p.evaluate(async () => {
    await __abrir('3', true, null);
    __llenar(); window.__pidResp = 'pid-nuevo-ingreso';
    return await __guardar();
  });
  si('★ ingreso en cama libre: la clave VIAJA (no se omite)', D[0] && 'EPISODIO_ABIERTO' in D[0]);
  eq('   …vacía, porque el formulario no abrió ningún episodio', (D[0] || {}).EPISODIO_ABIERTO, '');
  si('★ 5-oct-2026 · …y trae su IDENTIDAD PROPIA: un PATIENT_ID acuñado por la pantalla (8 a 64 de [A-Za-z0-9_-])', /^[A-Za-z0-9_-]{8,64}$/.test((D[0] || {}).PATIENT_ID || ''));
  D = await p.evaluate(async () => { __llenar(); return await __guardar(); });
  eq('★ tras guardar bien, el MISMO formulario manda el episodio que recibió del servidor', (D[0] || {}).EPISODIO_ABIERTO, 'pid-nuevo-ingreso');
  eq('   …y ya no manda la identidad de ingreso: desde ahí vale el episodio', (D[0] || {}).PATIENT_ID, undefined);
  // Un episodio sin ingreso formal (cama OCUPADA, sin PATIENT_ID) no tiene a quién acuñarle nada: el primer guardado fija el que devuelva el servidor.
  D = await p.evaluate(async () => {
    await __abrir('8', false, { ID_CAMA: '8', OCUPADA: true, PATIENT_ID: '', NOMBRE: 'Ocho', VIA_AEREA: 'Natural', SOPORTE: 'Ambiente' });
    __llenar(); window.__pidResp = 'pid-ocho';
    return await __guardar();
  });
  eq('★ sobre una cama OCUPADA sin ingreso formal viaja vacío y SIN identidad propia (no se acuña)', [(D[0] || {}).EPISODIO_ABIERTO, (D[0] || {}).PATIENT_ID].join('|'), '|');

  // El formulario que NO es el abierto no se re-basa con la respuesta tardía de otro guardado.
  D = await p.evaluate(async () => {
    await __abrir('6', false, { ID_CAMA: '6', OCUPADA: true, PATIENT_ID: 'pid-seis', NOMBRE: 'Seis', VIA_AEREA: 'Natural', SOPORTE: 'Ambiente' });
    __llenar();
    let resolver; window.api = (a, d) => { window.__ll.push({ a, d: JSON.parse(JSON.stringify(d || {})) }); return a === 'GUARDAR_EVOLUCION' ? new Promise(res => { resolver = res; }) : Promise.resolve(null); };
    window.__ll.length = 0; guardar();                       // el guardado de la cama 6 queda en vuelo…
    await new Promise(r => setTimeout(r, 100));
    _formDirty = false; cerrarPanel(true);
    await __abrir('4', false, { ID_CAMA: '4', OCUPADA: true, PATIENT_ID: 'pid-cuatro', NOMBRE: 'Cuatro', VIA_AEREA: 'Natural', SOPORTE: 'Ambiente' });
    resolver({ TEXTO_GENERADO: 't', patientId: 'pid-seis' });  // …y su respuesta llega cuando ya se abrió la cama 4
    await new Promise(r => setTimeout(r, 100));
    return { ep: window.__ll.length };
  });
  const rebase = await p.evaluate(async () => {
    window.api = (a, d) => { window.__ll.push({ a, d: JSON.parse(JSON.stringify(d || {})) }); return Promise.resolve(a === 'GUARDAR_EVOLUCION' ? { TEXTO_GENERADO: 't', patientId: 'pid-cuatro' } : null); };
    __llenar();
    return await __guardar();
  });
  eq('★ la respuesta TARDÍA del guardado de otra cama no le cambia el episodio al formulario abierto', (rebase[0] || {}).EPISODIO_ABIERTO, 'pid-cuatro');

  /* ══ 7 · EL RECHAZO EN LA PANTALLA: EL FORMULARIO SE CONSERVA ═════════ */
  console.log('\n7 · El rechazo del servidor: el formulario se conserva y el borrador no viaja a otro paciente');
  const R = await p.evaluate(async ([msg]) => {
    localStorage.clear();
    window.api = (a, d) => { window.__ll.push({ a, d: JSON.parse(JSON.stringify(d || {})) }); return a === 'GUARDAR_EVOLUCION' ? Promise.reject(new Error(msg)) : Promise.resolve(null); };
    window.__toasts = [];
    await __abrir('6', false, { ID_CAMA: '6', OCUPADA: true, PATIENT_ID: 'pid-seis', NOMBRE: 'Seis', VIA_AEREA: 'Natural', SOPORTE: 'Ambiente' });
    __llenar();
    window.__ll.length = 0;
    guardar();
    await new Promise(r => setTimeout(r, 3700));             // más que el reintento automático de 3 s
    const e = $('gEstadoGuardado');
    return {
      viajes: window.__ll.filter(x => x.a === 'GUARDAR_EVOLUCION').length,
      estado: e.dataset.estado, visible: !e.classList.contains('hidden'),
      texto: e.textContent.replace(/\s+/g, ' ').trim(),
      cuadro: $('avErrOvl').classList.contains('on'), cuadroMsg: $('avErrMsg').textContent,
      toast: window.__toasts.join(' | '),
      dirty: _formDirty, planes: $('fPlanes').value,
      borrador: Object.keys(localStorage).filter(k => /^CAMA_6_/.test(k)).length,
      panelAbierto: !!document.querySelector('#sp.on'),
      reconoce: _EP_CAMBIO_RE.test(msg),
    };
  }, [MSG]);
  eq('★ UN solo viaje: un rechazo deliberado no se reintenta solo (mandaría lo mismo y volvería a fallar)', R.viajes, 1);
  eq('★ la franja de error queda persistente', R.estado + '/' + R.visible, 'error/true');
  si('   …con «NO se guardó»', /NO se guardó/.test(R.texto));
  si('★ el cuadro al centro muestra el mensaje del servidor tal cual', R.cuadro && R.cuadroMsg === MSG);
  si('★ el aviso dice la causa y NO manda a revisar la red', /cambi[oó] de paciente/.test(R.toast) && !/revisa la red/i.test(R.toast));
  si('★ la pantalla reconoce el mensaje REAL del servidor por su frase (las dos puntas atadas)', R.reconoce);
  eq('★★ _formDirty sigue en true', R.dirty, true);
  eq('★★ el formulario sigue lleno', R.planes, 'bipedestación asistida');
  eq('   …el panel sigue abierto', R.panelAbierto, true);
  eq('   …y quedó un borrador local por si el equipo se apaga', R.borrador, 1);

  // «Reabrir la cama»: con OTRO paciente, el borrador del anterior NO se restaura; con el mismo, sí.
  const RB = await p.evaluate(async () => {
    window.__toasts = [];
    _formDirty = false; cerrarPanel(true);
    await __abrir('6', false, { ID_CAMA: '6', OCUPADA: true, PATIENT_ID: 'pid-nuevo-ocupante', NOMBRE: 'Nuevo', VIA_AEREA: 'Natural', SOPORTE: 'Ambiente' });
    const otro = { estado: $('gEstadoGuardado').dataset.estado, planes: $('fPlanes').value,
      avisoBorrador: window.__toasts.some(m => /borrador/i.test(m)), dirty: _formDirty };
    _formDirty = false; cerrarPanel(true);
    window.__toasts = [];
    await __abrir('6', false, { ID_CAMA: '6', OCUPADA: true, PATIENT_ID: 'pid-seis', NOMBRE: 'Seis', VIA_AEREA: 'Natural', SOPORTE: 'Ambiente' });
    const mismo = { estado: $('gEstadoGuardado').dataset.estado, planes: $('fPlanes').value };
    return { otro, mismo };
  });
  eq('★★ la cama reabierta con OTRO paciente NO recibe el borrador del anterior (valores)', RB.otro.planes, '');
  eq('   …ni ofrece «borrador recuperado»', RB.otro.estado + '/' + RB.otro.avisoBorrador, '/false');
  eq('   …ni queda marcada con cambios sin guardar', RB.otro.dirty, false);
  eq('★ la cama reabierta con el MISMO paciente sí recupera su borrador', RB.mismo.planes + '/' + RB.mismo.estado, 'bipedestación asistida/borrador');

  // 🔴 RECONCILIADO el 5-oct-2026 (tanda 2, G17). El contraste de este control: el rechazo deliberado de arriba es UN viaje y rojo
  // (el servidor contestó que no); una red caída —el embudo la entrega como `sinRespuesta`, no como un rechazo— se reintenta
  // sola (3 s; luego 10 y 30) y se queda en ÁMBAR «No confirmado», porque el primer intento pudo haber aterrizado: decir «NO se
  // guardó» sería afirmar lo que no se sabe. Antes se simulaba con un `Error` pelado y daba «dos viajes y NO se guardó»: ese camino
  // ya no es el de una red caída. Los 10 y 30 s los ata fallo_guardado_visible.js (con reloj falso) y los OP_ID, guardado_seguro_no_confirmado_g17.js.
  const RN = await p.evaluate(async () => {
    localStorage.clear();
    window.api = (a, d) => { window.__ll.push({ a, d: JSON.parse(JSON.stringify(d || {})) }); return a === 'GUARDAR_EVOLUCION' ? Promise.reject(Object.assign(new Error('red caída'), { sinRespuesta: true })) : Promise.resolve(null); };
    _formDirty = false; cerrarPanel(true);
    await __abrir('6', false, { ID_CAMA: '6', OCUPADA: true, PATIENT_ID: 'pid-seis', NOMBRE: 'Seis', VIA_AEREA: 'Natural', SOPORTE: 'Ambiente' });
    __llenar(); window.__ll.length = 0; guardar();
    await new Promise(r => setTimeout(r, 3700));
    const pil = $('gEstadoGuardado');
    const out = { viajes: window.__ll.filter(x => x.a === 'GUARDAR_EVOLUCION').length, estado: pil.dataset.estado,
      afirma: /NO se guardó|No se guardó|Guardado/.test(pil.textContent), texto: pil.textContent.replace(/\s+/g, ' ').trim() };
    // Se da por terminada la intención: sus reintentos de 10 y 30 s no pueden salir en medio de las secciones que siguen.
    if (_sesionGuardado) _sesionGuardado.cancelar();
    _estadoGuardado(null); _formDirty = false; cerrarPanel(true); avErrCerrar();
    return out;
  });
  eq('control: una caída de RED sí se reintenta sola (dos viajes a los 3,7 s)', RN.viajes, 2);
  eq('★ …y se queda en ÁMBAR «No confirmado»', RN.estado, 'noconfirmado');
  eq('★★ …sin afirmar lo que no sabe: ni «NO se guardó» ni «Guardado»', RN.afirma, false);

  /* ══ 8 · LA VISTA RETROSPECTIVA: EL FORMULARIO RECLAMA AL DE LA TARJETA ═ */
  // 🔴 F2 (hallazgo de la revisión adversarial, 4-oct-2026). `abrirPanel` anotaba el episodio leyendo el censo EN
  // VIVO (`DB`), pero la tarjeta que se toca con «Ver / editar» en la vista de un día pasado NO es la de `DB`: se
  // arma con lo registrado ESE día (`_camaDesdeEvo`). Con la cama hoy de otro paciente, la persona veía a K, tocaba
  // «Ver / editar» y el formulario reclamaba a L: el servidor lo aceptaba (L sí es el de la cama) y el turno pasado
  // de K se escribía sobre L. El episodio que se reclama es el de la tarjeta que se MUESTRA.
  console.log('\n8 · Vista retrospectiva: «Ver / editar» reclama el episodio de la tarjeta que se mostró');
  const RTK = '2026-08-09-Dia';
  no('la cama 4 está libre en el servidor simulado', camaDe('4').OCUPADA);
  ingresar('4', 'Paciente Kilo', 'Natural', 'Ambiente');
  const PID_K = camaDe('4').PATIENT_ID;
  alta('4');
  ingresar('4', 'Paciente Lima', 'Natural', 'Ambiente');
  const PID_L = camaDe('4').PATIENT_ID;
  si('K y L son episodios distintos y la cama 4 es hoy de L', PID_K && PID_L && PID_K !== PID_L && camaDe('4').NOMBRE === 'Paciente Lima');
  const vivaL = tarjetaDe('4', PID_L, 'Paciente Lima');
  const evoDeDia = (pid, nombre, turnoKey) => ({ ID_CAMA: '4', TURNO_KEY: turnoKey || RTK, PATIENT_ID: pid, PAC_NOMBRE: nombre,
    PAC_EDAD: 61, PAC_SEXO: 'M', VENT_VIA_AEREA: 'Natural', VENT_SOPORTE: 'Ambiente', DIA_ESTADIA: 2 });
  const abrirYGuardar = (retro, fecha, turno, viva, evo) => p.evaluate(async ([retro, fecha, turno, viva, evo]) => {
    const o = await __abrirDesdeTarjeta('4', fecha, turno, retro, viva, evo);
    if (o.sinBoton) return o;
    __llenar();
    o.payload = (await __guardar())[0] || null;
    return o;
  }, [retro, fecha, turno, viva, evo]);

  // a) El turno pasado de K, con la cama hoy de L: lo que ve la persona es a K.
  const RK = await abrirYGuardar(true, '2026-08-09', 'Dia', vivaL, evoDeDia(PID_K, 'Paciente Kilo'));
  eq('la tarjeta tiene su botón «Ver / editar»', RK.sinBoton === true ? 'sin botón' : RK.boton, '✏️ Ver / editar');
  si('★ lo que la grilla MUESTRA es el paciente de ese día (K), no el ocupante de hoy (L)',
    /Paciente Kilo/.test(RK.nombre || '') && !/Paciente Lima/.test(RK.nombre || ''));
  eq('★★ GET_EVO_TURNO pide la fila de K (el de la tarjeta), no la del ocupante de hoy', (RK.getEvo || {}).patientId, PID_K);
  eq('★★ el payload del formulario reclama el episodio de K, el que la tarjeta mostró', (RK.payload || {}).EPISODIO_ABIERTO, PID_K);
  eq('   …para el turno pasado que se abrió', (RK.payload || {}).TURNO_KEY, RTK);
  // El mismo payload REAL, contra el servidor real: la cama es hoy de L, así que se rechaza con el mensaje acordado.
  if (RK.payload) {
    rechazado('vista retrospectiva: turno pasado de un paciente que ya no está en la cama', JSON.parse(JSON.stringify(RK.payload)), '4');
    eq('★★ ninguna fila del ocupante de hoy (L) lleva el turno pasado de K',
      filasCama('4').filter(e => e.PATIENT_ID === PID_L && e.TURNO_KEY === RTK).length, 0);
    eq('   …ni de K: no se escribió nada en ese turno', filasCama('4').filter(e => e.TURNO_KEY === RTK).length, 0);
    eq('   …y la cama sigue siendo de L', camaDe('4').PATIENT_ID, PID_L);
  } else fails.push('retro: la pantalla no mandó el guardado');

  // b) Control: el turno pasado del MISMO ocupante de hoy (L, que ya estaba hace dos días) sí se corrige.
  const RL = await abrirYGuardar(true, '2026-08-09', 'Dia', vivaL, evoDeDia(PID_L, 'Paciente Lima'));
  eq('control: la tarjeta de L en su propio turno pasado reclama a L', (RL.payload || {}).EPISODIO_ABIERTO, PID_L);
  if (RL.payload) {
    r = api('GUARDAR_EVOLUCION', JSON.parse(JSON.stringify(RL.payload)), null);
    eq('control: …y el servidor lo acepta (corregir un turno pasado del paciente que SIGUE en la cama)', r.ok, true);
    eq('   …la fila del turno pasado quedó a nombre de L', filasCama('4').filter(e => e.TURNO_KEY === RTK && e.PATIENT_ID === PID_L).length, 1);
  }

  // c) Control: la vista de HOY no se toca. La tarjeta es la viva aunque haya una fila de otro paciente en el día.
  const RH = await abrirYGuardar(false, '2026-08-10', 'Dia', vivaL, evoDeDia(PID_K, 'Paciente Kilo', '2026-08-10-Dia'));
  eq('control: en la vista de HOY el formulario reclama al ocupante vivo de la tarjeta', (RH.payload || {}).EPISODIO_ABIERTO, PID_L);

  // d) Control: una cama sin registro ese día no ofrece «Ver / editar» (no se inventan pacientes hacia atrás).
  const RS = await p.evaluate(async ([viva]) => __abrirDesdeTarjeta('4', '2026-08-01', 'Dia', true, viva, null), [vivaL]);
  eq('control: la cama sin registro ese día no ofrece el botón de editar', RS.sinBoton, true);
  await p.evaluate(() => { _formDirty = false; cerrarPanel(true); $('gDate').value = '2026-08-10'; $('gDate').classList.add('turno-hoy'); SHIFT = 'Dia'; });

  /* ══ 9 · LA SALIDA DEL RECHAZO: CERRAR LA CAMA, NO «REINTENTAR» ═══════ */
  // 🔴 F2 (menor). Tras «la cama cambió de paciente», el botón principal del cuadro y el de la franja seguían siendo
  // «Reintentar»: remanda lo MISMO y recibe lo MISMO. Para ese rechazo concreto el principal es cerrar la cama (para
  // volver a abrirla y verla como está ahora); el formulario no se pierde: queda de borrador de SU paciente.
  console.log('\n9 · Tras el rechazo «cambió de paciente», lo principal es cerrar la cama (no Reintentar)');
  const SAL = await p.evaluate(async ([msg]) => {
    localStorage.clear();
    window.__recargas = 0; window.recargarSilencioso = () => { window.__recargas++; };
    window.api = (a, d) => { window.__ll.push({ a, d: JSON.parse(JSON.stringify(d || {})) }); return a === 'GUARDAR_EVOLUCION' ? Promise.reject(new Error(msg)) : Promise.resolve(null); };
    await __abrir('6', false, { ID_CAMA: '6', OCUPADA: true, PATIENT_ID: 'pid-seis', NOMBRE: 'Seis', VIA_AEREA: 'Natural', SOPORTE: 'Ambiente' });
    __llenar(); window.__ll.length = 0; guardar();
    await new Promise(r => setTimeout(r, 300));
    const pil = $('gEstadoGuardado');
    const antes = {
      cuadro: $('avErrOvl').classList.contains('on'),
      principal: $('avErrReint').textContent.trim(), secundario: $('avErrSec').textContent.trim(),
      botonesFranja: [...pil.querySelectorAll('button')].map(b => b.textContent.trim()),
      franja: pil.textContent.replace(/\s+/g, ' ').trim(),
      reintentoArmado: typeof _reintentoGuardado === 'function',
    };
    $('avErrReint').click();                       // el botón PRINCIPAL del cuadro
    await new Promise(r => setTimeout(r, 250));
    const viajes = window.__ll.filter(x => x.a === 'GUARDAR_EVOLUCION').length;
    const despues = {
      cuadro: $('avErrOvl').classList.contains('on'), panel: !!document.querySelector('#sp.on'),
      dirty: _formDirty, viajes, recargas: window.__recargas,
      borrador: Object.keys(localStorage).filter(k => /^CAMA_6_/.test(k)).length,
    };
    // Se vuelve a abrir la cama con el MISMO paciente: lo escrito sigue ahí (el cierre no lo perdió).
    await __abrir('6', false, { ID_CAMA: '6', OCUPADA: true, PATIENT_ID: 'pid-seis', NOMBRE: 'Seis', VIA_AEREA: 'Natural', SOPORTE: 'Ambiente' });
    const reabierta = $('fPlanes').value;
    _formDirty = false; cerrarPanel(true);
    // Control: un rechazo que NO es de episodio (el servidor contestó, p. ej. VALIDACION) en el MISMO componente vuelve a ofrecer
    // «Reintentar» (el rótulo no se queda pegado). Una red caída ya no pasa por acá: va al ámbar «No confirmado».
    _marcaGuardadoError('Falta la firma del kinesiólogo (prueba)');
    const red = { principal: $('avErrReint').textContent.trim(), botonesFranja: [...$('gEstadoGuardado').querySelectorAll('button')].map(b => b.textContent.trim()) };
    avErrCerrar(); _estadoGuardado(null);
    return { antes, despues, reabierta, red };
  }, [MSG]);
  si('el cuadro al centro se abre', SAL.antes.cuadro);
  eq('★★ el botón PRINCIPAL del cuadro NO es «Reintentar»', /Reintentar/i.test(SAL.antes.principal), false);
  si('★★ …es cerrar la cama', /Cerrar la cama/.test(SAL.antes.principal));
  eq('   …y «Seguir editando» sigue ahí para copiar lo escrito', SAL.antes.secundario, 'Seguir editando');
  eq('★★ la franja tampoco ofrece «Reintentar»: su botón es cerrar la cama', SAL.antes.botonesFranja.join('|'), 'Cerrar la cama');
  si('   …y sigue diciendo «NO se guardó»', /NO se guardó/.test(SAL.antes.franja));
  eq('   …y no queda armado un reintento que reenvíe lo mismo', SAL.antes.reintentoArmado, false);
  eq('★ el botón principal CIERRA la cama: el panel se va', SAL.despues.panel, false);
  eq('   …y el cuadro también', SAL.despues.cuadro, false);
  eq('★★ sin mandar el guardado otra vez (un solo viaje, el del rechazo)', SAL.despues.viajes, 1);
  eq('   …sin cambios «sin guardar» colgando', SAL.despues.dirty, false);
  eq('   …con el censo pedido de nuevo (para ver la cama como está ahora)', SAL.despues.recargas, 1);
  eq('★ lo escrito NO se pierde: queda su borrador local', SAL.despues.borrador, 1);
  eq('   …y al reabrir la cama con el mismo paciente, vuelve', SAL.reabierta, 'bipedestación asistida');
  eq('control: un rechazo que no es de episodio, en el mismo cuadro, sí ofrece «Reintentar» (el rótulo se repone)', SAL.red.principal, 'Reintentar');
  eq('control: …y la franja también', SAL.red.botonesFranja.join('|'), 'Reintentar');

  /* ══ 10 · EL AVISO DE FIN DE TURNO NO CUENTA EL BORRADOR DE OTRO PACIENTE ═ */
  // 🔴 F2 (menor). `_borradorHay` solo miraba que existiera la llave CAMA_<id>_<turno>, sin el episodio `ep` que el
  // borrador lleva desde G14. El aviso de fin de turno decía «borrador sin guardar» por un borrador que
  // `_borradorRestaurar` NO restaura (es de otro paciente): el kinesiólogo lo abría y no encontraba nada. La regla
  // de «¿es de este paciente?» es UNA, y la usan las dos.
  console.log('\n10 · «Borrador sin guardar» del aviso de fin de turno: solo si es de ESE paciente');
  const BH = await p.evaluate(async () => {
    const TKV = _turnoKeyVigente();
    const cama = pid => [{ ID_CAMA: '6', OCUPADA: true, PATIENT_ID: pid, COD_PACIENTE: 'X-6' }];
    const marca = pid => { const f = _aftPendientesDe(cama(pid), [], TKV)[0]; return { borr: f.borr, html: _aftFila(f) }; };
    const out = {};
    localStorage.clear();
    // Un borrador REAL, el que deja un rechazo: lleva el episodio del formulario que lo escribió.
    window.api = (a, d) => a === 'GUARDAR_EVOLUCION' ? Promise.reject(new Error('red caída')) : Promise.resolve(null);
    await __abrir('6', false, { ID_CAMA: '6', OCUPADA: true, PATIENT_ID: 'pid-seis', NOMBRE: 'Seis', VIA_AEREA: 'Natural', SOPORTE: 'Ambiente' });
    __llenar(); _borradorGuardar(); _formDirty = false; cerrarPanel(true);
    const llave = _borradorLlave('6', TKV);
    out.llaveExiste = !!localStorage.getItem(llave);
    out.mismo = marca('pid-seis');
    out.otro = marca('pid-nuevo-ocupante');
    out.libre = marca('');
    // Y la pantalla de verdad: abrir la cama con el otro paciente NO restaura (la regla que el aviso tiene que imitar).
    await __abrir('6', false, { ID_CAMA: '6', OCUPADA: true, PATIENT_ID: 'pid-nuevo-ocupante', NOMBRE: 'Nuevo', VIA_AEREA: 'Natural', SOPORTE: 'Ambiente' });
    out.restauraOtro = $('fPlanes').value !== '';
    _formDirty = false; cerrarPanel(true);
    // Un borrador de ANTES de G14 (sin `ep`) se sigue contando, igual que se sigue restaurando.
    localStorage.setItem(llave, JSON.stringify({ v: 1, hora: '03:10', campos: { fPlanes: 'de antes' } }));
    out.antiguo = marca('pid-cualquiera');
    // Uno ilegible no se restaura y por lo tanto tampoco se cuenta.
    localStorage.setItem(llave, '{esto no es json');
    out.ilegible = marca('pid-seis');
    localStorage.clear();
    out.sinBorrador = marca('pid-seis');
    return out;
  });
  si('el borrador real quedó escrito', BH.llaveExiste);
  eq('★ el borrador del MISMO paciente se cuenta', BH.mismo.borr, true);
  si('   …y la fila del aviso lo dice', /borrador sin guardar/.test(BH.mismo.html));
  eq('★★ el borrador de OTRO paciente NO se cuenta como «borrador sin guardar»', BH.otro.borr, false);
  si('   …ni la fila del aviso lo anuncia', !/borrador sin guardar/.test(BH.otro.html));
  eq('   …y es coherente con la pantalla: abrir la cama con ese otro paciente tampoco lo restaura', BH.restauraOtro, false);
  eq('★ el borrador de un paciente no se cuenta sobre una cama que quedó sin episodio', BH.libre.borr, false);
  eq('compatibilidad: un borrador anterior a G14 (sin `ep`) se sigue contando', BH.antiguo.borr, true);
  eq('un borrador ilegible no se restaura y por eso no se cuenta', BH.ilegible.borr, false);
  eq('sin borrador, no hay marca', BH.sinBorrador.borr, false);

  eq('sin errores JS en la pantalla', errs.join(' | '), '');
  await b.close();
  console.log(fails.length ? `\n❌ ${fails.length} fallos:\n  - ${fails.join('\n  - ')}` : '\n✅ episodio_al_guardar: el formulario de un paciente no se guarda sobre otro.');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('❌ La guardia reventó: ' + (e && e.stack || e)); process.exit(1); });
