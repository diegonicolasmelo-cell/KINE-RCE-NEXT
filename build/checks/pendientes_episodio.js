// pendientes_episodio.js — El pendiente deja de morir a las 12 horas
// (tanda A del rediseño, decisiones de Diego del 16-sep-2026).
//
// EL PROBLEMA QUE ARREGLA. `PLAN_PENDIENTES` es una lista de chips guardada en
// la FILA DEL TURNO, y el propio esquema dice «NO se replican»: lo que el turno
// de noche deja encargado no existe para el turno de día. No se puede cerrar
// algo que el turno siguiente no ve.
//
// LO QUE ESTA GUARDIA FIJA:
//   1 · el dato: PENDIENTES_JSON en CAMAS_ESTADO (episodio), al FINAL, sin
//       tocar las 396 columnas de EVOLUCIONES ni PLAN_PENDIENTES del turno;
//   2 · abrir deja procedencia (quién y cuándo), igual que la firma de una
//       medición;
//   3 · 🔑 D4 de Diego: CUALQUIERA cierra, no solo quien lo abrió;
//   4 · ★ el pendiente CRUZA el cambio de turno — que es justo lo que
//       PLAN_PENDIENTES no hace, y por eso aquí se comparan los dos;
//   5 · muere con el ALTA, no con el turno.
//
// 🪤 El reloj va congelado por el simulador (SIM, 1-jul-2026): esta guardia
// compara fechas de apertura y cierre, y con el reloj real daría distinto
// según cuándo se corra.
//
// Uso: node build/checks/pendientes_episodio.js
const path = require('path');
const fs = require('fs');
const V2 = path.resolve(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

console.log('\n1 · El dato — aditivo, al final, sin tocar lo de al lado');
const esq = fs.readFileSync(path.join(V2, 'esquema.gs'), 'utf8');
const ce = (esq.match(/\n  CAMAS_ESTADO: \{ headerRows: 2, cols: \[([\s\S]*?)\n  \]\}/) || [])[1] || '';
si('CAMAS_ESTADO tiene PENDIENTES_JSON', ce.indexOf("['PENDIENTES_JSON'") !== -1);
// Al FINAL: la convención del esquema es no insertar al medio para no
// desplazar los índices de lo ya escrito en la planilla.
const ultima = (ce.trim().match(/\['([A-Z0-9_]+)'/g) || []).slice(-1)[0] || '';
eq('★ …y es la ÚLTIMA columna (no se insertó al medio)', ultima, "['PENDIENTES_JSON'");
si('★ EVOLUCIONES sigue en 396 columnas', /TOTAL_COLS\.EVOLUCIONES !== 396/.test(esq));
si('★ PLAN_PENDIENTES del turno sigue existiendo (el REM no cambia de fuente)',
   /\['PLAN_PENDIENTES','json'\]/.test(esq));

console.log('\n2 · Servidor (simulador con hojas en memoria)');
const { api, DB, SIM } = require('../sim/sim_srv.js');
const cama = id => DB.CAMAS_ESTADO.find(c => String(c.ID_CAMA) === String(id)) || {};
const pend = id => { try { return JSON.parse(cama(id).PENDIENTES_JSON || '[]') || []; } catch (e) { return []; } };
const abiertos = id => pend(id).filter(p => !p.ci);
const ingresar = id => api('INGRESAR_PACIENTE', { idCama: String(id), nombre: 'Paciente Pendientes ' + id,
  edad: 61, sexo: 'M', diagnostico: 'NAC', fechaIngreso: SIM.fecha, viaAerea: 'TQT', soporte: 'VM',
  modo: 'CPAP/PS', firmaKine: 'DMV' }, null);

console.log('\n2a · Abrir un pendiente deja procedencia');
ingresar(4);
let r = api('PEND_ABRIR', { idCama: '4', texto: 'Solicitar evaluación fonoaudiológica', firma: 'MCC' }, null);
si('★ PEND_ABRIR responde ok', r.ok);
eq('★ queda UNO abierto en el episodio', abiertos('4').length, 1);
const p0 = abiertos('4')[0] || {};
eq('…con su texto', String(p0.tx), 'Solicitar evaluación fonoaudiológica');
eq('★ …y quién lo abrió', String(p0.ab), 'MCC');
si('…con la fecha de apertura (reloj del simulador)', String(p0.abTs || '').indexOf(SIM.fecha) === 0);
si('…y un id propio, para poder cerrarlo sin ambigüedad', !!String(p0.id || '').length);
no('…todavía sin cerrar', p0.ci);

console.log('\n2b · Lo que NO se acepta');
r = api('PEND_ABRIR', { idCama: '4', texto: '   ', firma: 'MCC' }, null);
no('texto vacío se rechaza', r.ok);
r = api('PEND_ABRIR', { idCama: '11', texto: 'algo', firma: 'MCC' }, null);
no('cama sin paciente se rechaza', r.ok);
r = api('PEND_CERRAR', { idCama: '4', id: 'no-existe', firma: 'MCC' }, null);
no('cerrar un id que no existe se rechaza', r.ok);
eq('…y no tocó los que sí hay', abiertos('4').length, 1);

console.log('\n2c · 🔑 D4 — CUALQUIERA cierra, no solo quien lo abrió');
r = api('PEND_CERRAR', { idCama: '4', id: p0.id, firma: 'ARM' }, null);
si('★ lo cierra ARM, que no fue quien lo abrió', r.ok);
eq('★ ya no cuenta entre los abiertos', abiertos('4').length, 0);
const cerrado = pend('4').find(p => p.id === p0.id) || {};
eq('★ …pero NO se borra: queda quién lo cerró', String(cerrado.ci), 'ARM');
si('…y cuándo', String(cerrado.ciTs || '').indexOf(SIM.fecha) === 0);
eq('…y se conserva quién lo había abierto', String(cerrado.ab), 'MCC');
r = api('PEND_CERRAR', { idCama: '4', id: p0.id, firma: 'DMV' }, null);
eq('★ cerrarlo de nuevo no pisa a quien lo cerró primero',
   String((pend('4').find(p => p.id === p0.id) || {}).ci), 'ARM');

console.log('\n2d · ★ El pendiente CRUZA el turno — PLAN_PENDIENTES no');
ingresar(5);
api('PEND_ABRIR', { idCama: '5', texto: 'Repetir Pimáx cuando baje la presión de soporte', firma: 'MCC' }, null);
const base = (id, tk, extra) => Object.assign({
  idCama: String(id), turnoKey: tk, FECHA: tk.slice(0, 10), TURNO: tk.slice(11),
  VENT_VIA_AEREA: 'TQT', VENT_SOPORTE: 'VM', VENT_MODO: 'CPAP/PS',
  VENT_PS: 12, VENT_PEEP: 6, VENT_FIO2: 35,
  SED_TIPO: 'Sin sedación', HEMO_ESTADO: 'Estable',
  PLAN_PLANES: 'Progresar sedestación', PLAN_FIRMA_KINE: 'MCC',
}, extra || {});
const tkNoche = SIM.fecha + '-Noche';
const tkDia   = SIM.fecha + '-Dia';
r = api('GUARDAR_EVOLUCION', base(5, tkNoche, { PLAN_PENDIENTES: JSON.stringify(['Avisar a fonoaudiología']) }), null);
si('el turno de noche guarda, con su chip de siempre', r.ok);
r = api('GUARDAR_EVOLUCION', base(5, tkDia, { PLAN_FIRMA_KINE: 'ARM' }), null);
si('el turno de día guarda', r.ok);
const evoDia = (DB.EVOLUCIONES || []).find(e => String(e.ID_CAMA) === '5' && e.TURNO_KEY === tkDia) || {};
eq('★ el chip del turno NO cruzó (así es hoy, y así se queda)',
   String(evoDia.PLAN_PENDIENTES || '[]'), '[]');
eq('★★ el pendiente del EPISODIO sí sigue abierto en el turno siguiente', abiertos('5').length, 1);
eq('…y es el mismo texto', String((abiertos('5')[0] || {}).tx), 'Repetir Pimáx cuando baje la presión de soporte');

console.log('\n2e · El pendiente muere con el ALTA, no con el turno');
r = api('DAR_ALTA', { idCama: '5', motivoEgreso: 'Traslado a sala', destinoEgreso: 'Medicina',
  firmaResponsable: 'DMV', fechaEgreso: SIM.fecha }, null);
si('el alta responde ok', r.ok);
eq('★ la cama queda sin pendientes del episodio que se fue', abiertos('5').length, 0);

console.log('\n2f · El guardado del turno no pisa los pendientes del episodio');
eq('la cama 4 conserva su histórico (uno, cerrado)', pend('4').length, 1);
api('GUARDAR_EVOLUCION', base(4, tkDia, {}), null);
eq('★ después de guardar un turno, el histórico sigue ahí', pend('4').length, 1);

console.log(fails.length ? '\n❌ ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
process.exit(fails.length ? 1 : 0);
