// ceros_de_punta_a_punta.js — EL CERO SE CONSERVA DE EXTREMO A EXTREMO (G06, 4-oct-2026).
//
// EL CONTRATO (acuerdo del plan, G06). Cuatro frases, y esta guardia las mide una por una:
//   1. Un 0 válido se conserva: pantalla → servidor → fila de EVOLUCIONES → cama → lo que lee la pantalla.
//   2. Un vacío NO se transforma en cero. «Nadie midió» y «midió cero» no son lo mismo.
//   3. Un valor que no es número (NaN, Infinity) no se guarda: se rechaza con un mensaje que dice cuál campo.
//   4. Los decimales se conservan (7,38 no es 7; 1,2 s no es 1).
//
// DE DÓNDE SALE. Tres defectos medidos en el código de 4-oct, los tres de la misma familia que
// `docs/LO_ESENCIAL.md` llama «un campo vacío tratado como un cero con significado»… pero al revés y al
// derecho: el programa confundía vacío con cero, en las dos direcciones.
//
//   a) LA PANTALLA BORRABA EL CERO. `guardar()` armaba los números con `parseFloat(x)||null`, y como 0 es
//      falso, un PEEP de 0, un AutoPEEP de 0, una PIC de 0 o un exceso de base de 0 salían como `null` y se
//      guardaban VACÍOS. Peor: al REABRIR un turno, el 0 vuelve a la casilla como «0», y re-guardar lo
//      borraba — el dato se perdía sin que nadie tocara nada. (El EB 0 es el valor más común de un gas sano.)
//   b) LA CAMA PERDÍA EL CERO DE RESPALDO. `_syncCamaDesdeEvolucion` arrastra «lo del turno, y si el turno no
//      dijo nada, lo de la cama» con `val = (a, b) => … : (b || '')`. Con un 0 numérico en la cama (Sheets
//      devuelve el 0 de una celda numérica como número, que es falso) el respaldo lo volvía '' y el siguiente
//      guardado que no traía ese campo borraba Barthel 0, Charlson 0, APACHE 0, MRC 0, FSS 0, dinamometría 0…
//      Barthel 0 y FSS 0 son los pacientes más dependientes: justo los que no se pueden perder.
//   c) EL VACÍO SE VOLVÍA CERO. El snapshot de KTR de la cama (`KTR_DIA`/`KTR_NOCHE`) hacía
//      `parseInt(RESP_KTR_CANT)||0`: un turno que no anotó sesiones quedaba como «0 sesiones».
//
//   d) LAS RUTAS HERMANAS (F1, 4-oct-2026). La revisión independiente encontró el MISMO defecto en las rutas que
//      LEEN o ARCHIVAN lo que ya se guardaba bien, y con él el cero «que sí se guarda» seguía invisible:
//        · el ALTA (`darAltaPaciente`): `datos.fssEgreso || ult.EVAL_T_FSS || ''` borraba el 0 que el bucle de
//          arriba SÍ había conservado, y en ARCHIVO_PACIENTES quedaba vacío el FSS 0, el MRC 0, la dinamometría 0,
//          el CPAx 0 y el Barthel de egreso 0 — los pacientes más dependientes, archivados «sin evaluar»;
//        · el HISTORIAL (Hoja UCI) pintaba en blanco el PEEP 0, la PS 0, el AutoPEEP 0, el MRC 0, el FSS 0, el
//          CPAx 0, la dinamometría 0 y la PIM 0; y con la fila «colapsada» por no tener datos;
//        · el EGRESO (`egreso()`) abría la casilla de Barthel en blanco para un Barthel 0, y la ficha del
//          archivado (`arcDetalle`) mostraba «—» donde el egreso decía 0;
//        · la TABLA DINÁMICA (`datosPivot`) exportaba `|| ''` para PEEP, MRC, FiO₂, PaFi, CPAx y Día de estadía
//          (el día del ingreso ES el día 0), y al revés `|| 0` para KTR: «nadie anotó sesiones» salía como cero.
//
// LO QUE NO ES UN DEFECTO, y esta guardia lo deja dicho para que nadie lo «arregle»:
//   · FiO₂ 0 NO es un valor válido (el rango clínico es 21-100: aire ambiente es 21%). Se RECHAZA con su
//     mensaje de rango; lo que no puede pasar es que se guarde vacío en silencio. Lo mismo VT, FR y Edad.
//   · `PAC_APACHE2` es entero 0-71: «12.5» se rechaza a propósito (ver `apache.js`); no se trunca.
//
// LO QUE ESTA GUARDIA NO FIJA, A PROPÓSITO (decisión de Diego, no de código): si el RELATO debe narrar
// «PEEP 0 cmH2O» o «AutoPEEP 0», y si un PEEP medido de 0 califica como candidato a PVE. Hoy el relato
// omite los ceros de esos campos y el tamizaje pide PEEP > 0; queda escrito en el informe de la tanda.
//
// 🪤 EL RELOJ VA CONGELADO. Las fechas se INVENTAN (2026-08-10, un lunes lejos de Fiestas Patrias y del
// cambio de turno) y en la pantalla se congela `Date` a las 12:00 de ese día. Nada de lo que se mide aquí
// depende de la hora, pero una guardia que lee el reloj real da distinto según cuándo se corra.
//
// Uso: node build/checks/ceros_de_punta_a_punta.js (requiere playwright-core)
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const V2 = path.resolve(__dirname, '..', '..', 'v2');
const S = require('../sim/sim_srv.js');
const { api, DB, SIM } = S;

SIM.fecha = '2026-08-10'; SIM.hora = '12:00:00';

// El esquema, SOLO para leer rótulos y tipos de columna. Se evalúa aislado en una función para que sus
// funciones (leerConfig, etc.) no pisen las del simulador; y se cuelga de global porque el validador
// consulta `typeof ESQUEMA` (en Apps Script todos los .gs comparten ámbito, así que ahí siempre está).
const ESQ = new Function(fs.readFileSync(path.join(V2, 'esquema.gs'), 'utf8') + '\n;return ESQUEMA;')();
global.ESQUEMA = ESQ;
const COLS_EVO = {}; ESQ.EVOLUCIONES.cols.forEach(c => { COLS_EVO[c[0]] = c; });
const rotulo = k => (COLS_EVO[k] && COLS_EVO[k][2]) || k;

const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g) + (okk ? '' : ' (esperado ' + JSON.stringify(w) + ')'));
  if (!okk) fails.push(l);
};
const si = (l, c) => eq(l, !!c, true);
const no = (l, c) => eq(l, !!c, false);

const vacio = x => x === '' || x === null || x === undefined;
const esCero = x => !vacio(x) && Number(x) === 0;          // 0, '0' y 0.0 son cero; '' y null NO
const camaDe = id => DB.CAMAS_ESTADO.find(c => String(c.ID_CAMA) === String(id)) || {};
const filaDe = (idCama, tk) => DB.EVOLUCIONES.find(e => String(e.ID_CAMA) === String(idCama) && String(e.TURNO_KEY) === tk) || {};
const ocupar = (idCama, pid, extra) => Object.assign(camaDe(idCama), {
  OCUPADA: true, STATUS_CAMA: 'Ocupada', PATIENT_ID: pid, COD_PACIENTE: 'C' + idCama, NOMBRE: 'Paciente Cero ' + idCama,
  EDAD: 60, SEXO: 'M', TALLA_CM: 170, DIAGNOSTICO: 'Dx de prueba', VIA_AEREA: 'TOT', SOPORTE: 'VM', MODO: 'ACVC',
  FECHA_INGRESO: '2026-08-08', TS_INGRESO: '2026-08-08 10:00:00', FECHA_INICIO_SOPORTE: '2026-08-08',
  TS_INICIO_SOPORTE: '2026-08-08 10:00:00', FECHA_INICIO_VA: '2026-08-08', TS_INICIO_VA: '2026-08-08 10:00:00',
  FIRMA_KINE: 'DMV',
}, extra || {});
const base = (idCama, tk, extra) => Object.assign({
  idCama: String(idCama), turnoKey: tk, PLAN_FIRMA_KINE: 'DMV',
  VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', VENT_MODO: 'ACVC',
  VENT_VT: 450, VENT_FR: 16, VENT_FIO2: 40, HEMO_ESTADO: 'Estable', SED_TIPO: 'Sin sedación',
}, extra || {});

// Los campos donde el 0 es un valor clínico válido, tal como los manda la pantalla: los de `n()` van como
// número, los de `v()` como texto (los selectores y campos de la ficha viajan como cadena).
const CEROS_EVO = {
  VENT_PEEP: 0, VENT_PS: 0, VENT_AUTOPEEP: 0, VENT_P01: 0, HEMO_PIC: 0, NEURO_DVE_ALTURA: 0, GSA_EB: 0,
  CAT_RESP_PJE: 0, CAT_MOTOR_PJE: 0,
  PAC_BARTHEL: '0', PAC_CHARLSON: '0', PAC_APACHE2: '0', EVAL_T_MRC: '0', EVAL_T_FSS: '0',
  EVAL_T_DINAMO: '0', EVAL_T_PIM: '0', RESP_KTR_CANT: '0',
};
// Lo que el guardado de la evolución lleva a la CAMA como «último valor» o ficha del episodio.
const CEROS_CAMA = ['BARTHEL', 'CHARLSON', 'APACHE2', 'ULT_MRC', 'ULT_FSS', 'ULT_DINAMO', 'ULT_PS', 'ULT_PIM',
  'CAT_RESP_PJE', 'CAT_MOTOR_PJE'];

(async () => {
  /* ══ 1 · EL CERO LLEGA A LA FILA, A LA CAMA Y A LO QUE LEE LA PANTALLA ══ */
  console.log('1 · Un guardado con ceros: fila, cama y lecturas de la pantalla');
  const PID1 = 'pid-cero-1', TK1 = '2026-08-10-Dia';
  ocupar('1', PID1);
  let r = api('GUARDAR_EVOLUCION', base('1', TK1, CEROS_EVO), null);
  eq('el guardado con ceros se acepta', r.ok, true);
  const f1 = filaDe('1', TK1);
  Object.keys(CEROS_EVO).forEach(k => si('★ EVOLUCIONES.' + k + ' conserva el cero (' + rotulo(k) + ')', esCero(f1[k])));
  CEROS_CAMA.forEach(k => si('★ la cama sincronizada conserva ' + k + ' = 0', esCero(camaDe('1')[k])));
  si('★ el snapshot de KTR de la cama dice 0 sesiones (KTR_DIA)', esCero(camaDe('1').KTR_DIA));

  r = api('GET_EVO_TURNO', { idCama: '1', turnoKey: TK1, patientId: PID1 }, null);
  const act = (r.data && r.data.actual) || {};
  ['VENT_PEEP', 'VENT_PS', 'VENT_AUTOPEEP', 'GSA_EB', 'PAC_BARTHEL', 'EVAL_T_MRC', 'RESP_KTR_CANT']
    .forEach(k => si('★ lo que la pantalla lee al reabrir el turno: ' + k + ' = 0', esCero(act[k])));
  r = api('GET_EVO_TURNO', { idCama: '1', turnoKey: '2026-08-10-Noche', patientId: PID1 }, null);
  const prev = (r.data && r.data.previa) || {};
  ['VENT_PEEP', 'VENT_PS', 'VENT_AUTOPEEP'].forEach(k => si('★ la réplica del turno anterior trae ' + k + ' = 0', esCero(prev[k])));
  r = api('GET_TODAS_CAMAS', {}, null);
  const tarjeta = ((r.data || []).find(c => String(c.ID_CAMA) === '1')) || {};
  ['BARTHEL', 'CHARLSON', 'APACHE2', 'ULT_MRC', 'ULT_PS'].forEach(k => si('★ la tarjeta de cama que lee la pantalla: ' + k + ' = 0', esCero(tarjeta[k])));

  /* ══ 2 · EL RESPALDO DE LA CAMA NO PIERDE EL CERO ═════════════════════ */
  console.log('\n2 · Un turno que no trae esos campos no le borra los ceros a la cama');
  // 🪤 Sheets devuelve el 0 de una celda NUMÉRICA como el número 0 (falso). El simulador guarda lo que se le
  // da, así que el 0 numérico se siembra a mano: es lo que de verdad hay en la planilla.
  CEROS_CAMA.forEach(k => { camaDe('1')[k] = 0; });
  // Unos campos no viajan (cliente o API que no los conoce: Barthel, Charlson, APACHE, PEEP…) y otros viajan
  // vacíos (formulario sin tocar: los de abajo). Así llega el turno siguiente.
  const sinCampos = base('1', '2026-08-10-Noche', {});
  ['EVAL_T_MRC', 'EVAL_T_FSS', 'EVAL_T_DINAMO', 'EVAL_T_PIM', 'VENT_PS', 'CAT_RESP_PJE', 'CAT_MOTOR_PJE'].forEach(k => { sinCampos[k] = ''; });
  r = api('GUARDAR_EVOLUCION', sinCampos, null);
  eq('el turno siguiente (sin esos campos) se guarda', r.ok, true);
  CEROS_CAMA.forEach(k => si('★★ la cama CONSERVA ' + k + ' = 0 aunque el turno no lo traiga', esCero(camaDe('1')[k])));
  // 🪤 Lo que importa es lo que LEE la pantalla, no lo que hay en la hoja: se mide por las dos puertas de lectura
  // (la lista de camas del tablero y la cama suelta), con el 0 numérico sembrado como lo devuelve Sheets.
  r = api('GET_TODAS_CAMAS', {}, null);
  const tarjeta2 = ((r.data || []).find(c => String(c.ID_CAMA) === '1')) || {};
  CEROS_CAMA.forEach(k => si('★★ lo que la pantalla lee en la lista de camas: ' + k + ' = 0 tras el turno sin esos campos', esCero(tarjeta2[k])));
  r = api('GET_CAMA', { idCama: '1' }, null);
  const camaSuelta = r.data || {};
  CEROS_CAMA.forEach(k => si('★★ lo que la pantalla lee de la cama suelta: ' + k + ' = 0 tras el turno sin esos campos', esCero(camaSuelta[k])));

  /* ══ 3 · EL VACÍO SE QUEDA VACÍO ══════════════════════════════════════ */
  console.log('\n3 · Un campo vacío queda vacío: nunca se vuelve cero');
  ocupar('2', 'pid-cero-2', { BARTHEL: '', CHARLSON: '', APACHE2: '', ULT_MRC: '', ULT_FSS: '', ULT_DINAMO: '', ULT_PS: '', ULT_PIM: '',
    CAT_RESP_PJE: '', CAT_MOTOR_PJE: '' });
  const vaciosEvo = {};
  Object.keys(CEROS_EVO).forEach(k => { vaciosEvo[k] = ''; });
  r = api('GUARDAR_EVOLUCION', base('2', '2026-08-10-Dia', vaciosEvo), null);
  eq('el guardado con todo vacío se acepta', r.ok, true);
  const f2 = filaDe('2', '2026-08-10-Dia');
  Object.keys(CEROS_EVO).forEach(k => si('EVOLUCIONES.' + k + ' queda vacío (no 0)', vacio(f2[k])));
  CEROS_CAMA.forEach(k => si('la cama deja ' + k + ' vacío (no 0)', vacio(camaDe('2')[k])));
  si('★ sin sesiones anotadas, el snapshot de KTR queda VACÍO (no «0 sesiones»)', vacio(camaDe('2').KTR_DIA));
  r = api('GUARDAR_EVOLUCION', base('2', '2026-08-10-Noche', { RESP_KTR_CANT: '' }), null);
  si('★ ni de noche: KTR_NOCHE queda vacío', vacio(camaDe('2').KTR_NOCHE));
  r = api('GUARDAR_EVOLUCION', base('2', '2026-08-11-Dia', { RESP_KTR_CANT: '3' }), null);
  eq('y con 3 sesiones anotadas dice 3', String(camaDe('2').KTR_DIA), '3');

  /* ══ 4 · NaN E INFINITY SE RECHAZAN, CON EL CAMPO EN EL MENSAJE ═══════ */
  console.log('\n4 · Lo que no es número no se guarda, y el mensaje dice cuál campo');
  ocupar('3', 'pid-cero-3');
  const CASOS = [
    ['VENT_PEEP', NaN, 'NaN (número)'], ['VENT_PS', Infinity, 'Infinity (número)'], ['VENT_PS', -Infinity, '-Infinity (número)'],
    ['GSA_EB', 'NaN', 'texto «NaN»'], ['VENT_PMAX', 'Infinity', 'texto «Infinity»'],
    ['EVAL_T_MRC', '1e999', 'texto «1e999» (desborda)'], ['HEMO_PIC', NaN, 'NaN (número)'],
  ];
  CASOS.forEach(([campo, valor, desc]) => {
    const antes = DB.EVOLUCIONES.length, camaAntes = JSON.stringify(camaDe('3'));
    const res = api('GUARDAR_EVOLUCION', base('3', '2026-08-12-Dia', { [campo]: valor }), null);
    no('★ ' + campo + ' = ' + desc + ' se rechaza', res.ok);
    si('   …el mensaje dice «' + rotulo(campo) + '» y que no es un número válido',
      new RegExp(rotulo(campo).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(res.error || '') && /n[uú]mero v[aá]lido/i.test(res.error || ''));
    eq('   …no se escribió ninguna fila', DB.EVOLUCIONES.length, antes);
    si('   …y la cama quedó intacta', JSON.stringify(camaDe('3')) === camaAntes);
  });
  r = api('GUARDAR_EVOLUCION', base('3', '2026-08-12-Dia', { VENT_PEEP: 5, VENT_PS: 8, GSA_EB: '-1.5', EVAL_T_MRC: '44' }), null);
  eq('control: con números de verdad el mismo payload se guarda', r.ok, true);
  r = api('GUARDAR_EVOLUCION', base('3', '2026-08-13-Dia', { PAC_NOMBRE: 'Nan', PAC_DIAGNOSTICO: 'NaN', PLAN_NOTA_TURNO: 'Infinity' }), null);
  eq('un TEXTO que dice «NaN» o «Infinity» sigue siendo texto (apellido, diagnóstico, nota)', r.ok, true);
  eq('…y se guarda tal cual', [filaDe('3', '2026-08-13-Dia').PAC_NOMBRE, filaDe('3', '2026-08-13-Dia').PAC_DIAGNOSTICO].join('|'), 'Nan|NaN');

  /* ══ 5 · LOS DECIMALES SE CONSERVAN ═══════════════════════════════════ */
  console.log('\n5 · Los decimales no se truncan');
  ocupar('4', 'pid-cero-4');
  const DEC = { VENT_TI: 1.2, VENT_P01: 0.8, GSA_PH: 7.38, VENT_PS: 7.5, PAC_TALLA: 172.5, EVAL_T_DINAMO: '12.5', EVAL_T_PIM: '-35.5' };
  r = api('GUARDAR_EVOLUCION', base('4', '2026-08-10-Dia', DEC), null);
  eq('el guardado con decimales se acepta', r.ok, true);
  const f4 = filaDe('4', '2026-08-10-Dia');
  Object.keys(DEC).forEach(k => eq('EVOLUCIONES.' + k + ' conserva ' + DEC[k], String(f4[k]), String(DEC[k])));
  eq('la cama conserva la talla 172.5', String(camaDe('4').TALLA_CM), '172.5');
  eq('la cama conserva la dinamometría 12.5', String(camaDe('4').ULT_DINAMO), '12.5');
  eq('la cama conserva la Pimáx -35.5', String(camaDe('4').ULT_PIM), '-35.5');
  eq('la cama conserva la PS 7.5', String(camaDe('4').ULT_PS), '7.5');

  /* ══ 6 · LO QUE NO ES CERO VÁLIDO SE RECHAZA, NO SE VACÍA ═════════════ */
  console.log('\n6 · FiO₂ 0 no es un valor válido: se rechaza con su rango, no se guarda vacío');
  ocupar('5', 'pid-cero-5');
  const antesF = DB.EVOLUCIONES.length;
  r = api('GUARDAR_EVOLUCION', base('5', '2026-08-10-Dia', { VENT_FIO2: 0 }), null);
  no('FiO₂ = 0 se rechaza', r.ok);
  si('   …con el mensaje de su rango (21-100)', /FiO₂.*21-100/.test(r.error || ''));
  eq('   …y no se escribió ninguna fila', DB.EVOLUCIONES.length, antesF);

  /* ══ 7 · LA PANTALLA: EL PAYLOAD NO CONVIERTE 0 EN VACÍO ═══════════════ */
  console.log('\n7 · En el navegador: lo que `guardar()` arma conserva el cero');
  const CONGELADO = new Date('2026-08-10T12:00:00').getTime();
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(({ congelado }) => {
    const Real = Date;
    function Falso(...a) { return a.length ? new Real(...a) : new Real(congelado); }
    Falso.now = () => congelado; Falso.parse = Real.parse; Falso.UTC = Real.UTC; Falso.prototype = Real.prototype;
    window.Date = Falso;
    window._ll = [];
    window._resp = {};   // respuestas a medida por acción (las secciones 8 a 12 las llenan con lo que sirvió el servidor)
    window.google = { script: { run: { withSuccessHandler(okF) { return { withFailureHandler() { return {
      api(a, d) { window._ll.push({ a, d }); setTimeout(() => okF({ ok: true, data: (a in window._resp ? window._resp[a] : (a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null)) }), 5); }
    }; } }; } } } };
  }, { congelado: CONGELADO });
  await p.goto('file://' + path.join(V2, 'index.html'));
  await p.waitForTimeout(500);

  // Monta el formulario como lo llenaría un colega (TOT, VM, SIMV VC: ahí viven PEEP, PS y AutoPEEP) y
  // devuelve el payload que `guardar()` mandó. `valores` = {idDelCampo: 'texto'}; `antes` corre tras montar.
  const guardarCon = (valores, opciones) => p.evaluate(async ([valores, opciones]) => {
    const set = (id, val) => { const e = $(id); if (e) e.value = val; };
    $('cBed').value = '3'; DB = [{ ID_CAMA: '3' }];
    if (![...$('fFirma').options].some(o => o.value === 'Klgo. Test')) {
      const opt = document.createElement('option'); opt.value = 'Klgo. Test'; opt.textContent = 'Klgo. Test'; $('fFirma').appendChild(opt);
    }
    $('fFirma').value = 'Klgo. Test';
    // 🪤 La hemodinamia es obligatoria y NO se rellena sola: el banco la llena como la llenaría un colega.
    $('fHEst').value = 'Estable'; $('fDVA').value = 'Sin requerimientos';
    $('fVA').value = 'TOT'; cascadeVA('VM'); cascadeSop('SIMV VC');
    set('fPVEval', 'nc'); set('fPveNcRaz', 'Causa de base no resuelta');   // con TOT hay que contestar la PVE
    // Todo en blanco primero: cada escenario declara SOLO lo que tiene.
    ['r_vt', 'r_fr', 'r_peep', 'r_pmax', 'r_pmedia', 'r_ppl', 'r_ps', 'r_autopeep', 'r_fio2', 'r_spo2', 'r_pafi', 'r_flujo', 'r_ti',
      'fPIC', 'fPPC', 'fDVEalt', 'fPAMmed', 'fGsaPh', 'fGsaEb', 'fGsaLact', 'fGsaPao2', 'fBarthel', 'fCharlson', 'fApache']
      .forEach(id => set(id, ''));
    $('cGSA').checked = !!opciones.gsa;
    if (opciones.antes) (new Function('return ' + opciones.antes))()();
    Object.keys(valores).forEach(id => set(id, valores[id]));
    _transAvisoOk = true; window._ll.length = 0;
    window.toast = () => {};
    guardar();
    await new Promise(r => setTimeout(r, 120));
    const call = _ll.find(x => x.a === 'GUARDAR_EVOLUCION');
    return call ? call.d : null;
  }, [valores, opciones || {}]);

  const D0 = await guardarCon({ r_peep: '0', r_ps: '0', r_autopeep: '0', fPIC: '0', fPPC: '0', fDVEalt: '0',
    fGsaEb: '0', fBarthel: '0', fCharlson: '0', fApache: '0' }, { gsa: true });
  si('el guardado llegó a armar el payload', !!D0);
  if (D0) {
    ['VENT_PEEP', 'VENT_PS', 'VENT_AUTOPEEP', 'HEMO_PIC', 'HEMO_PPC', 'NEURO_DVE_ALTURA', 'GSA_EB']
      .forEach(k => eq('★★ ' + k + ' viaja como 0 (la casilla dice 0)', D0[k], 0));
    ['PAC_BARTHEL', 'PAC_CHARLSON', 'PAC_APACHE2'].forEach(k => eq('★ ' + k + ' viaja como «0»', D0[k], '0'));
  }

  const DV = await guardarCon({}, { gsa: false });
  if (DV) {
    ['VENT_PEEP', 'VENT_PS', 'VENT_AUTOPEEP', 'HEMO_PIC', 'NEURO_DVE_ALTURA'].forEach(k =>
      si('un campo en blanco viaja VACÍO, no 0: ' + k, vacio(DV[k]) && DV[k] !== 0));
    si('y el bloque de gases sin marcar no manda números: GSA_EB', vacio(DV.GSA_EB));
  }

  const DD = await guardarCon({ r_fr: '16.5', r_vt: '450.5', r_pmax: '28.5', r_peep: '5.5', fGsaPh: '7.38', fGsaLact: '1.4' }, { gsa: true });
  if (DD) {
    eq('decimal: FR 16.5', DD.VENT_FR, 16.5); eq('decimal: VT 450.5', DD.VENT_VT, 450.5);
    eq('decimal: Pmax 28.5', DD.VENT_PMAX, 28.5); eq('decimal: PEEP 5.5', DD.VENT_PEEP, 5.5);
    eq('decimal: pH 7.38', DD.GSA_PH, 7.38); eq('decimal: lactato 1.4', DD.GSA_LACTATO, 1.4);
  }

  // Lo registrado vuelve a la pantalla y se RE-GUARDA: el 0 no puede perderse por el camino de ida y vuelta.
  const DR = await guardarCon({}, { antes: '() => _fillParamsVent({ VENT_PEEP: 0, VENT_PS: 0, VENT_AUTOPEEP: 0, VENT_FR: 16 })' });
  if (DR) {
    ['VENT_PEEP', 'VENT_PS', 'VENT_AUTOPEEP'].forEach(k => eq('★★ reabrir y re-guardar: ' + k + ' sigue en 0', DR[k], 0));
  }

  // Un valor no finito que llegara hasta el armado (un campo que dejó de ser numérico, un pegado programático):
  // no viaja. Se usan PIC y la altura de la DVE porque NO tienen chequeo de rango en la pantalla: con PEEP
  // 'Infinity' el aviso «PEEP > 30» frenaba el guardado antes y la prueba no medía el armado del payload.
  const DN = await guardarCon({ fPIC: 'Infinity', fDVEalt: '-Infinity', fPPC: 'NaN' },
    { antes: '() => { $("fPIC").type = "text"; $("fDVEalt").type = "text"; $("fPPC").type = "text"; }' });
  si('el guardado con valores no finitos llegó a armar el payload', !!DN);
  if (DN) {
    ['HEMO_PIC', 'NEURO_DVE_ALTURA', 'HEMO_PPC'].forEach(k => si('★ «' + k + '» no finito NO viaja como número no finito (viaja vacío)',
      vacio(DN[k]) && !(typeof DN[k] === 'number')));
  }

  /* ══ 8 · EL ALTA: LOS CEROS LLEGAN AL ARCHIVO ════════════════════════ */
  console.log('\n8 · El alta: el 0 de las evaluaciones llega a ARCHIVO_PACIENTES (no se vuelve vacío)');
  // 🪤 Las evaluaciones del episodio se SIEMBRAN en la hoja con el 0 NUMÉRICO que devuelve Sheets (falso en JS):
  // pasarlas por GUARDAR_EVOLUCION las dejaría como texto y no mediría lo que el alta lee en producción.
  const siembraEvo = (idCama, pid, turnoKey, extra) => DB.EVOLUCIONES.push(Object.assign({
    ID_CAMA: String(idCama), PATIENT_ID: pid, TURNO_KEY: turnoKey, FECHA: turnoKey.slice(0, 10), TURNO: turnoKey.slice(11),
    VENT_SOPORTE: 'VM', VENT_VIA_AEREA: 'TOT',
  }, extra || {}));
  const altaDe = (idCama, datos) => api('DAR_ALTA', Object.assign(
    { idCama: String(idCama), motivoEgreso: 'Traslado a sala', destinoEgreso: 'Medicina', firmaKine: 'DMV' }, datos || {}), null);
  const archivoDe = pid => DB.ARCHIVO_PACIENTES.find(a => String(a.PATIENT_ID) === pid) || {};
  const EGRESO_CAMPOS = [['FSS_EGRESO', 'FSS'], ['MRC_SS_EGRESO', 'MRC'], ['DINAMO_EGRESO', 'dinamometría'], ['CPAX_EGRESO', 'CPAx'], ['BARTHEL_EGRESO', 'Barthel de egreso']];

  // A · Lo último que midió el episodio fue 0 (y antes algo distinto de cero): ese 0 es el del egreso.
  ocupar('6', 'pid-cero-6', { BARTHEL: 0 });
  siembraEvo('6', 'pid-cero-6', '2026-08-08-Dia', { EVAL_T_FSS: 18, EVAL_T_MRC: 50, EVAL_T_DINAMO: 14, CPAX_TOTAL: 30 });
  siembraEvo('6', 'pid-cero-6', '2026-08-09-Dia', { EVAL_T_FSS: 0, EVAL_T_MRC: 0, EVAL_T_DINAMO: 0, CPAX_TOTAL: 0 });
  r = altaDe('6', { barthelEgreso: 0 });
  eq('A · el alta con las últimas evaluaciones en 0 se acepta', r.ok, true);
  const a6 = archivoDe('pid-cero-6');
  EGRESO_CAMPOS.forEach(([k, d]) => si('★ A · ARCHIVO_PACIENTES.' + k + ' conserva el cero (' + d + ')', esCero(a6[k])));
  si('★ A · y el Barthel de ingreso 0 de la cama también llega', esCero(a6.BARTHEL_INGRESO));
  si('★ A · las interpretaciones del 0 se calculan (MRC 0 = DAUCI severa, FSS 0 = dependencia severa)',
    /severa/i.test(a6.MRC_INTERP || '') && /severa/i.test(a6.FSS_INTERP || '') && a6.DAUCI === true);
  si('★ A · …y la dinamometría 0 se interpreta', /DAUCI/.test(a6.DINAMO_INTERP || ''));

  // B · El 0 que manda la pantalla viaja como TEXTO («0»): ya funcionaba, y no puede dejar de funcionar.
  ocupar('7', 'pid-cero-7', { BARTHEL: '0' });
  r = altaDe('7', { barthelEgreso: '0', fssEgreso: '0', mrcSsEgreso: '0', dinamoEgreso: '0' });
  eq('B · el alta con ceros como texto se acepta', r.ok, true);
  const a7 = archivoDe('pid-cero-7');
  ['BARTHEL_EGRESO', 'FSS_EGRESO', 'MRC_SS_EGRESO', 'DINAMO_EGRESO'].forEach(k => si('B · ARCHIVO_PACIENTES.' + k + ' conserva «0»', esCero(a7[k])));

  // C · Un 0 EXPLÍCITO en el egreso gana a una medición vieja distinta de cero (no se cae a «lo anterior»).
  ocupar('8', 'pid-cero-8');
  siembraEvo('8', 'pid-cero-8', '2026-08-09-Dia', { EVAL_T_FSS: 20, EVAL_T_MRC: 50, EVAL_T_DINAMO: 15, CPAX_TOTAL: 33 });
  r = altaDe('8', { fssEgreso: 0, mrcSsEgreso: 0, dinamoEgreso: 0 });
  eq('C · el alta con ceros explícitos sobre mediciones viejas se acepta', r.ok, true);
  const a8 = archivoDe('pid-cero-8');
  [['FSS_EGRESO', 'FSS'], ['MRC_SS_EGRESO', 'MRC'], ['DINAMO_EGRESO', 'dinamometría']].forEach(([k, d]) =>
    si('★ C · ' + k + ' = 0 del egreso gana a la medición vieja (' + d + ')', esCero(a8[k])));
  eq('C · …y lo que el egreso no trae sigue saliendo del episodio (CPAx 33)', String(a8.CPAX_EGRESO), '33');

  // D · El vacío CAE al último del episodio, y un valor distinto de cero del egreso gana: no cambia nada.
  ocupar('9', 'pid-cero-9');
  siembraEvo('9', 'pid-cero-9', '2026-08-09-Dia', { EVAL_T_FSS: 20, EVAL_T_MRC: 52, EVAL_T_DINAMO: 15, CPAX_TOTAL: 33 });
  r = altaDe('9', { fssEgreso: '', dinamoEgreso: 16, barthelEgreso: '' });
  eq('D · el alta con vacíos se acepta', r.ok, true);
  const a9 = archivoDe('pid-cero-9');
  eq('D · FSS del egreso vacío → el último del episodio (20)', String(a9.FSS_EGRESO), '20');
  eq('D · MRC que el egreso no trae → el último del episodio (52)', String(a9.MRC_SS_EGRESO), '52');
  eq('D · dinamometría 16 del egreso gana a la del episodio (15)', String(a9.DINAMO_EGRESO), '16');
  eq('D · CPAx → el último del episodio (33)', String(a9.CPAX_EGRESO), '33');
  si('D · Barthel de egreso vacío queda vacío (no 0)', vacio(a9.BARTHEL_EGRESO));

  // E · Nada medido y nada informado: todo queda VACÍO. «Nadie midió» no es «midió cero».
  ocupar('10', 'pid-cero-10');
  r = altaDe('10', {});
  eq('E · el alta sin ninguna evaluación se acepta', r.ok, true);
  const a10 = archivoDe('pid-cero-10');
  EGRESO_CAMPOS.forEach(([k, d]) => si('E · ' + k + ' queda vacío, no 0 (' + d + ')', vacio(a10[k])));
  si('E · sin MRC no hay interpretación inventada', vacio(a10.MRC_INTERP) && vacio(a10.DAUCI));

  /* ══ 9 · LO QUE SIRVE EL ARCHIVO A LA PANTALLA ════════════════════════ */
  console.log('\n9 · Archivados: el servidor sirve el 0 y la ficha lo pinta');
  r = api('GET_ARCHIVADOS', {}, null);
  eq('GET_ARCHIVADOS responde', r.ok, true);
  const filaArch = ((r.data || []).find(x => String(x.patientId) === 'pid-cero-6')) || {};
  ['barthelIn', 'barthelEg', 'mrc', 'fss', 'dinamo', 'cpax'].forEach(k => si('★ el archivado que lee la pantalla: ' + k + ' = 0', esCero(filaArch[k])));
  const ARC = await p.evaluate(a => {
    window.toast = () => {};
    ARC_VIEW = [a];
    arcRender();
    const fila = document.getElementById('arcBody').textContent.replace(/\s+/g, ' ');
    arcDetalle(0);
    const chips = {};
    [...document.querySelectorAll('#arcModBody > div:first-child > div')].forEach(c => {
      if (c.children.length === 2) chips[c.children[0].textContent.trim()] = c.children[1].textContent.trim();
    });
    return { fila, chips };
  }, filaArch);
  si('la grilla de archivados dice MRC 0 · FSS 0 · CPAx 0', /MRC 0 · FSS 0 · CPAx 0/.test(ARC.fila));
  eq('★★ la ficha dice «Barthel in/eg» 0 / 0 (el egreso no se pinta como «—»)', ARC.chips['Barthel in/eg'], '0 / 0');
  eq('la ficha dice MRC egreso 0', ARC.chips['MRC egreso'], '0');
  eq('la ficha dice FSS egreso 0', ARC.chips['FSS egreso'], '0');
  eq('la ficha dice CPAx egreso 0', ARC.chips['CPAx egreso'], '0');
  const ARC2 = await p.evaluate(() => {
    ARC_VIEW = [{ nombre: 'Paciente Vacío', cod: 'C0', barthelIn: '', barthelEg: '', mrc: '', fss: '', cpax: '' }];
    arcDetalle(0);
    const chips = {};
    [...document.querySelectorAll('#arcModBody > div:first-child > div')].forEach(c => {
      if (c.children.length === 2) chips[c.children[0].textContent.trim()] = c.children[1].textContent.trim();
    });
    return chips;
  });
  eq('la ficha SIN evaluaciones dice «— / —» (un vacío sigue siendo vacío)', ARC2['Barthel in/eg'], '— / —');
  si('…y no inventa chips de MRC/FSS/CPAx', !('MRC egreso' in ARC2) && !('FSS egreso' in ARC2) && !('CPAx egreso' in ARC2));

  /* ══ 10 · EL HISTORIAL (HOJA UCI): EL CERO SE PINTA ═══════════════════ */
  console.log('\n10 · Historial: la grilla, su tendencia y el detalle pintan el 0');
  const evoH = (fecha, turno, extra) => Object.assign({
    ID_CAMA: '3', PATIENT_ID: 'pid-cero-h', TURNO_KEY: fecha + '-' + turno, FECHA: fecha, TURNO: turno, PLAN_FIRMA_KINE: 'DMV',
    VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', VENT_MODO: 'ACVC', DIA_ESTADIA: 1,
  }, extra || {});
  const CEROS_LIMBOS = {};
  for (let i = 1; i <= 6; i++) { CEROS_LIMBOS['EVAL_MRC_D' + i] = 0; CEROS_LIMBOS['EVAL_MRC_I' + i] = 0; }
  for (let i = 1; i <= 5; i++) CEROS_LIMBOS['EVAL_FSS_IT' + i] = 0;
  const MRC_D1_CERO = { EVAL_T_MRC: 40, EVAL_MRC_D1: 0, EVAL_MRC_I1: 0 };
  [2, 3, 4, 5, 6].forEach(i => { MRC_D1_CERO['EVAL_MRC_D' + i] = 4; MRC_D1_CERO['EVAL_MRC_I' + i] = 4; });
  // 🪤 Los 0 van como NÚMERO: es lo que la pantalla recibe de Sheets (y es falso en JS).
  const EVOS_H = [
    evoH('2026-08-03', 'Dia', Object.assign({ VENT_PEEP: 0, VENT_PS: 0, VENT_AUTOPEEP: 0, EVAL_T_MRC: 0, EVAL_T_FSS: 0, EVAL_T_DINAMO: 0,
      CPAX_TOTAL: 0, EVAL_T_PIM: 0 }, CEROS_LIMBOS)),
    evoH('2026-08-03', 'Noche', { VENT_PEEP: '', VENT_EPAP: 5, VENT_PS: '', VENT_IPAP: 12 }),            // BiPAP: el caso EPAP/IPAP
    evoH('2026-08-04', 'Dia', Object.assign({ VENT_PEEP: 8, VENT_PS: 10 }, MRC_D1_CERO)),
    evoH('2026-08-04', 'Noche', { VENT_PEEP: 0, VENT_EPAP: 5, VENT_PS: 0, VENT_IPAP: 12 }),            // el 0 del PEEP gana al EPAP
    evoH('2026-08-05', 'Dia', { VENT_PEEP: 6, VENT_PS: 8 }),
  ];
  const HJ = await p.evaluate(evos => {
    window.CFG = { NUM_CAMAS: 12, BANNERS: {}, FREC_HME_DIAS: 2, FREC_HEPA_DIAS: 3, FREC_SONDA_DIAS: 3, PTT_OK: 10, PTT_ALERTA: 12 };
    TL_EVOS = evos; TL_HITOS = []; TL_GSA = []; HJ_SEG = 'todo'; HJ_RANGO = 7; HJ_VACIAS = true;
    setTLtab('hoja');
    const norm = t => t.replace(/\s+/g, ' ').trim();
    const fila = l => [...document.querySelectorAll('#tlBody tr[data-hjf]')].find(t => t.querySelector('.par').textContent.trim() === l);
    const celdas = l => { const f = fila(l); return f ? [...f.querySelectorAll('td')].map(td => norm(td.textContent)) : null; };
    const puntos = l => { const f = fila(l); const pl = f && f.querySelector('polyline'); return pl ? pl.getAttribute('points').trim().split(/\s+/).length : 0; };
    return {
      peep: celdas('PEEP / EPAP'), ps: celdas('P. Soporte / IPAP'), apeep: celdas('Auto PEEP'),
      mrc: celdas('MRC-ss ( /60)'), fss: celdas('FSS-ICU ( /35)'), cpax: celdas('CPAx ( /50)'), dina: celdas('Dinamometría'),
      pim: celdas('PIM / PEM / FEM'), dauci: celdas('Debilidad UCI (≤48)'),
      puntosPeep: puntos('PEEP / EPAP'), puntosPs: puntos('P. Soporte / IPAP'),
      sparkPeep0: HJ_F.peep.spark({ VENT_PEEP: 0, VENT_EPAP: 5 }), sparkPeepEpap: HJ_F.peep.spark({ VENT_PEEP: '', VENT_EPAP: 5 }),
      sparkPs0: HJ_F.ps.spark({ VENT_PS: 0, VENT_IPAP: 12 }), sparkPsIpap: HJ_F.ps.spark({ VENT_PS: '', VENT_IPAP: 12 }),
      sparkVacio: HJ_F.peep.spark({ VENT_PEEP: '', VENT_EPAP: '' }),
    };
  }, EVOS_H);
  const celda = (arr, i) => (arr ? arr[i] : null);
  // Una fila por TURNO tiene 2 celdas por fecha (Día, Noche); una fila por DÍA, 1 (ocupa las dos).
  eq('★★ PEEP 0 se pinta «0» (Día 3-ago)', celda(HJ.peep, 0), '0');
  eq('PEEP vacío con EPAP 5 sigue mostrando el EPAP (Noche 3-ago)', celda(HJ.peep, 1), '5');
  eq('PEEP 8 normal (Día 4-ago)', celda(HJ.peep, 2), '8');
  eq('★★ PEEP 0 con EPAP 5: el 0 del PEEP gana (Noche 4-ago)', celda(HJ.peep, 3), '0');
  eq('★★ PS 0 se pinta «0» (Día 3-ago)', celda(HJ.ps, 0), '0');
  eq('PS vacía con IPAP 12 sigue mostrando el IPAP (Noche 3-ago)', celda(HJ.ps, 1), '12');
  eq('★★ PS 0 con IPAP 12: el 0 de la PS gana (Noche 4-ago)', celda(HJ.ps, 3), '0');
  eq('★★ AutoPEEP 0 se pinta «0» (y la fila no se esconde como «sin datos»)', celda(HJ.apeep, 0), '0');
  eq('★★ MRC 0 se pinta «0» con su botón de desglose', celda(HJ.mrc, 0), '0 ▸ ver');
  eq('MRC 40 normal (4-ago)', celda(HJ.mrc, 1), '40 ▸ ver');
  eq('★★ FSS 0 se pinta «0» con su botón de desglose', celda(HJ.fss, 0), '0 ▸ ver');
  eq('★★ CPAx 0 se pinta «0»', celda(HJ.cpax, 0), '0');
  eq('★★ dinamometría 0 se pinta «0 kg»', celda(HJ.dina, 0), '0 kg');
  eq('★★ PIM 0 se pinta «0» (y PEM/FEM vacíos «—»)', celda(HJ.pim, 0), '0 / — / —');
  eq('con MRC 0 la debilidad UCI sale «SÍ» (ya andaba: control)', celda(HJ.dauci, 0), '✕ SÍ');
  eq('★★ la tendencia del PEEP incluye los ceros (5 puntos)', HJ.puntosPeep, 5);
  eq('★★ la tendencia de la PS incluye los ceros (5 puntos)', HJ.puntosPs, 5);
  eq('★ la serie del PEEP toma el 0 (no cae al EPAP)', HJ.sparkPeep0, 0);
  eq('la serie del PEEP vacío toma el EPAP', HJ.sparkPeepEpap, 5);
  eq('★ la serie de la PS toma el 0 (no cae al IPAP)', HJ.sparkPs0, 0);
  eq('la serie de la PS vacía toma el IPAP', HJ.sparkPsIpap, 12);
  si('la serie con todo vacío no inventa un punto', HJ.sparkVacio === null);

  // El desglose se lee CELDA por CELDA: el texto de una fila de tabla sale pegado («Flexión de codo44») y una
  // expresión regular sobre eso mediría el formato, no el cero.
  const DET = await p.evaluate(() => {
    const norm = t => t.replace(/\s+/g, ' ').trim();
    const leer = (tipo, fecha) => {
      hjVer(tipo, fecha);
      const filas = {};
      document.querySelectorAll('#hjDet table tr').forEach(tr => {
        const c = [...tr.children].map(td => norm(td.textContent));
        filas[c[0]] = c.slice(1).join('|');
      });
      const total = [...document.querySelectorAll('#hjDet > div')].map(d => norm(d.textContent)).find(t => /TOTAL/.test(t)) || '';
      return { filas, total };
    };
    return { mrc: leer('mrc', '2026-08-04'), mrcCero: leer('mrc', '2026-08-03'), fss: leer('fss', '2026-08-03') };
  });
  eq('★★ el desglose del MRC pinta el 0 del movimiento 1 (hombro derecho | izquierdo)', DET.mrc.filas['1. Abducción de hombro'], '0|0');
  eq('el desglose del MRC pinta los otros movimientos como siempre', DET.mrc.filas['2. Flexión de codo'], '4|4');
  si('el desglose del MRC con total 40 dice «40 / 60»', /MRC SUM SCORE TOTAL: 40 \/ 60/.test(DET.mrc.total));
  eq('★★ el desglose del MRC con todo en 0 pinta 0|0 en cada movimiento',
    [1, 2, 3, 4, 5, 6].map(i => DET.mrcCero.filas[Object.keys(DET.mrcCero.filas)[i]]).join(' '), '0|0 0|0 0|0 0|0 0|0 0|0');
  si('★★ el desglose del MRC con total 0 dice «0 / 60»', /MRC SUM SCORE TOTAL: 0 \/ 60/.test(DET.mrcCero.total));
  eq('★★ el desglose del FSS pinta el 0 de cada actividad',
    Object.keys(DET.fss.filas).filter(k => /^\d\./.test(k)).map(k => DET.fss.filas[k]).join(' '), '0 0 0 0 0');
  si('★★ el desglose del FSS con total 0 dice «0 / 35» (no «— / 35»)', /TOTAL: 0 \/ 35/.test(DET.fss.total));

  /* ══ 11 · EL EGRESO: LA CASILLA DE BARTHEL ═════════════════════════════ */
  console.log('\n11 · Egreso: la casilla de Barthel se abre con el valor de la cama, también si es 0');
  const EGR = await p.evaluate(() => {
    window.toast = () => {};
    const out = {};
    [['cero numérico', 0], ['cero texto', '0'], ['vacío', ''], ['45', 45], ['null', null], ['sin dato', undefined]].forEach(([k, val]) => {
      DB = [{ ID_CAMA: '7', OCUPADA: true, NOMBRE: 'Paciente Cero 7', BARTHEL: val }];
      egreso('7');
      out[k] = document.getElementById('egBarthel').value;
    });
    return out;
  });
  eq('★★ Barthel 0 (número) abre la casilla en «0»', EGR['cero numérico'], '0');
  eq('Barthel «0» (texto) abre la casilla en «0»', EGR['cero texto'], '0');
  eq('Barthel 45 abre la casilla en «45»', EGR['45'], '45');
  eq('Barthel vacío abre la casilla en blanco (no en 0)', EGR['vacío'], '');
  eq('Barthel null abre la casilla en blanco (no en 0)', EGR['null'], '');
  eq('cama sin Barthel abre la casilla en blanco (no en 0)', EGR['sin dato'], '');

  /* ══ 12 · LA TABLA DINÁMICA ═══════════════════════════════════════════ */
  console.log('\n12 · Tabla dinámica: el 0 se exporta y el vacío no se vuelve 0');
  const siembraPiv = (turnoKey, extra) => DB.EVOLUCIONES.push(Object.assign({
    ID_CAMA: '11', TURNO_KEY: turnoKey, FECHA: turnoKey.slice(0, 10), TURNO: turnoKey.slice(11), PAC_SEXO: 'M', PAC_EDAD: 60, VENT_SOPORTE: 'VM',
  }, extra || {}));
  // Fechas inventadas (junio y julio) y rango propio: no se mezcla con lo que sembraron las secciones de arriba.
  siembraPiv('2026-06-30-Dia', {});                                                                    // nadie anotó nada
  siembraPiv('2026-07-06-Dia', { RESP_KTR_CANT: '', VENT_PEEP: 0, EVAL_T_MRC: 0, CPAX_TOTAL: 0, VENT_FIO2: 0, VENT_PAFI: 0, DIA_ESTADIA: 0 });
  siembraPiv('2026-07-06-Noche', { RESP_KTR_CANT: 0, VENT_PEEP: 8, EVAL_T_MRC: 48, CPAX_TOTAL: 30, DIA_ESTADIA: 0 });
  siembraPiv('2026-07-07-Dia', { RESP_KTR_CANT: 3, DIA_ESTADIA: 1 });
  r = api('GET_PIVOT', { desde: '2026-06-30', hasta: '2026-07-07' }, null);
  eq('GET_PIVOT responde', r.ok, true);
  const filasPiv = (r.data && r.data.filas) || [];
  eq('el rango trae solo las cuatro filas sembradas', filasPiv.length, 4);
  const filaPiv = (f, t) => filasPiv.find(x => x.FECHA === f && x.TURNO === t) || {};
  const pDia = filaPiv('2026-07-06', 'Dia'), pNoche = filaPiv('2026-07-06', 'Noche'), pSig = filaPiv('2026-07-07', 'Dia'), pVacia = filaPiv('2026-06-30', 'Dia');
  ['PEEP', 'MRC', 'CPAX', 'FIO2', 'PAFI', 'DIA_ESTADIA'].forEach(k => si('★★ pivot: ' + k + ' = 0 se exporta como 0', esCero(pDia[k])));
  si('★★ pivot: KTR sin sesiones anotadas sale VACÍO (no 0)', vacio(pDia.KTR));
  si('★★ pivot: KTR 0 anotado sale 0', esCero(pNoche.KTR) && !vacio(pNoche.KTR));
  eq('pivot: KTR 3 sale 3 (número, como antes)', pSig.KTR, 3);
  ['KTR', 'PEEP', 'MRC', 'CPAX', 'FIO2', 'PAFI', 'DIA_ESTADIA'].forEach(k => si('pivot: ' + k + ' vacío queda vacío (no 0)', vacio(pVacia[k])));
  eq('pivot: el valor distinto de cero no cambia (PEEP 8)', pNoche.PEEP, 8);

  // El cruce de la pantalla con esas filas: el vacío NO suma ni entra al divisor; el 0 SÍ.
  const PIV = await p.evaluate(async filas => {
    window._resp.GET_PIVOT = { filas, total: filas.length, truncado: false };
    pivCargar();
    await new Promise(r2 => setTimeout(r2, 100));
    const tabla = (f, c, vv) => {
      document.getElementById('pivF').value = f; document.getElementById('pivC').value = c; document.getElementById('pivV').value = vv; pivRender();
      return [...document.querySelectorAll('#pivOut tr')].map(tr => [...tr.children].map(td => td.textContent.trim()).join('|'));
    };
    return { conteo: tabla('MES', '', ''), sumaKtr: tabla('MES', '', 'S:KTR'), promKtr: tabla('MES', '', 'P:KTR'),
      promPeep: tabla('MES', '', 'P:PEEP'), promMrc: tabla('MES', '', 'P:MRC'), promCpax: tabla('MES', '', 'P:CPAX'),
      promDia: tabla('MES', '', 'P:DIA_ESTADIA') };
  }, filasPiv);
  const fil = (t, mes) => t.find(x => x.indexOf(mes + '|') === 0) || '';
  const tot = t => t.find(x => x.indexOf('TOTAL|') === 0) || '';
  eq('conteo de turnos por mes (junio 1, julio 3, total 4)', [fil(PIV.conteo, '2026-06'), fil(PIV.conteo, '2026-07'), tot(PIV.conteo)].join(' · '),
    '2026-06|1|1 · 2026-07|3|3 · TOTAL|4|4');
  eq('★★ suma de KTR: junio «—» (nadie anotó), julio 3, total 3', [fil(PIV.sumaKtr, '2026-06'), fil(PIV.sumaKtr, '2026-07'), tot(PIV.sumaKtr)].join(' · '),
    '2026-06|—|— · 2026-07|3|3 · TOTAL|3|3');
  eq('★★ promedio de KTR: solo cuentan los turnos que anotaron (0 y 3 → 1,5; el vacío no es 0)',
    [fil(PIV.promKtr, '2026-06'), fil(PIV.promKtr, '2026-07'), tot(PIV.promKtr)].join(' · '), '2026-06|—|— · 2026-07|1,5|1,5 · TOTAL|1,5|1,5');
  eq('★★ promedio de PEEP incluye el 0 (0 y 8 → 4)', fil(PIV.promPeep, '2026-07'), '2026-07|4|4');
  eq('★★ promedio de MRC incluye el 0 (0 y 48 → 24)', fil(PIV.promMrc, '2026-07'), '2026-07|24|24');
  eq('★★ promedio de CPAx incluye el 0 (0 y 30 → 15)', fil(PIV.promCpax, '2026-07'), '2026-07|15|15');
  eq('★★ promedio del día de estadía incluye el día 0 del ingreso (0, 0 y 1 → 0,3)', fil(PIV.promDia, '2026-07'), '2026-07|0,3|0,3');
  si('ninguna tabla del cruce muestra «NaN»', !/NaN/.test(JSON.stringify(PIV)));

  eq('sin errores JS en la pantalla', errs.join(' | '), '');
  await b.close();
  console.log(fails.length ? `\n❌ ${fails.length} fallos: ${fails.join(' · ')}` : '\n✅ Todo OK');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('❌ La guardia reventó: ' + (e && e.stack || e)); process.exit(1); });
