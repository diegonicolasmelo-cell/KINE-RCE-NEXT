// alta_no_deja_rastro.js — Al liberar la cama no puede quedar NADA del
// paciente que se fue (16-sep-2026).
//
// EL BUG QUE LA TRAJO. `_limpiarCamaInterno` enumera a mano los campos que
// deja en blanco. Cada columna nueva de CAMAS_ESTADO se agrega «SIEMPRE AL
// FINAL»… y nadie se acuerda de sumarla también acá. Encontrado midiendo:
// quince columnas se arrastraban, entre ellas **AET_ACTIVA y AET_NIVEL**. Un
// paciente recién ingresado aparecía con la adecuación del esfuerzo
// terapéutico de quien ocupó la cama antes — y la AET IIIC es una ruta
// automática de contraindicación de kinesiterapia.
//
// Ya había pasado idéntico con los relojes TS_* (4-ago-2026), y está escrito
// en el propio código. Volvió a pasar porque el arreglo fue agregar esos tres
// nombres, no impedir el olvido siguiente.
//
// 🔑 POR ESO LA PARTE 1 ES GENÉRICA: no enumera columnas, las DERIVA del
// esquema. La columna 84 que alguien agregue mañana pone esta guardia roja
// sola si se olvida del limpiador. Enumerar habría dejado el mismo agujero.
//
// Uso: node build/checks/alta_no_deja_rastro.js
const path = require('path');
const fs = require('fs');
const V2 = path.resolve(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');

console.log('\n1 · Toda columna de CAMAS_ESTADO se limpia (derivado del esquema)');
const esq = fs.readFileSync(path.join(V2, 'esquema.gs'), 'utf8');
const ce = (esq.match(/\n  CAMAS_ESTADO: \{ headerRows: 2, cols: \[([\s\S]*?)\n  \]\}/) || [])[1] || '';
const cols = (ce.match(/\['([A-Z0-9_]+)'/g) || []).map(s => s.slice(2, -1));
si('se leyeron las columnas de CAMAS_ESTADO', cols.length > 50);

const sv = fs.readFileSync(path.join(V2, 'svc_camas.gs'), 'utf8');
const vacCrudo = (sv.match(/function _limpiarCamaInterno[\s\S]*?const vacio = \{([\s\S]*?)\n  \};/) || [])[1] || '';
si('se leyó el objeto `vacio` de _limpiarCamaInterno', vacCrudo.length > 100);
// 🪤 Los comentarios de ese bloque están llenos de MAYÚSCULAS (nombres de
// columnas citados, y palabras como EPISODIO): sin quitarlos, la guardia lee
// claves que no existen y se pone roja por su propia culpa.
const vac = vacCrudo.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
const limpia = new Set((vac.match(/([A-Z0-9_]+):/g) || []).map(s => s.slice(0, -1)));

// ID_CAMA es la identidad de la fila: es por lo que se la busca, no un dato
// del paciente. Es la ÚNICA excepción legítima, y va escrita acá para que
// agregar otra sea una decisión consciente y no un descuido.
const EXCEPCIONES = new Set(['ID_CAMA']);
const faltan = cols.filter(c => !limpia.has(c) && !EXCEPCIONES.has(c));
eq('★ columnas que el alta NO limpia (tienen que ser cero)', faltan.join(', '), '');

// Al revés: un nombre en `vacio` que ya no existe en el esquema es una
// columna renombrada o borrada, y deja el limpiador mintiendo.
const sobran = Array.from(limpia).filter(c => cols.indexOf(c) === -1);
eq('…y ninguna que se limpie sin existir en el esquema', sobran.join(', '), '');

console.log('\n2 · En vivo: el paciente nuevo no hereda nada del anterior');
const { api, DB, SIM } = require('../sim/sim_srv.js');
const cama = id => DB.CAMAS_ESTADO.find(c => String(c.ID_CAMA) === String(id)) || {};
const ingresar = (id, nombre) => api('INGRESAR_PACIENTE', { idCama: String(id), nombre: nombre,
  edad: 70, sexo: 'M', diagnostico: 'NAC', fechaIngreso: SIM.fecha, viaAerea: 'TOT',
  soporte: 'VM', modo: 'ACVC', firmaKine: 'DMV' }, null);

ingresar(2, 'Paciente que se va');
// Se le carga de todo lo que vive en el episodio: adecuación del esfuerzo,
// seguimiento UPOT, una medición con firma y un pendiente.
api('GUARDAR_EVOLUCION', { idCama: '2', turnoKey: SIM.fecha + '-Dia', FECHA: SIM.fecha, TURNO: 'Dia',
  VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', VENT_MODO: 'ACVC', VENT_VT: 450, VENT_FR: 16,
  VENT_PEEP: 8, VENT_FIO2: 50, SED_TIPO: 'Escalón 2', HEMO_ESTADO: 'Estable',
  PLAN_PLANES: 'Protección pulmonar', PLAN_FIRMA_KINE: 'DMV',
  AET_ACTIVA: true, AET_NIVEL: 'IIIC', UPOT_ACTIVO: true, UPOT_MEDIDAS: true,
  EVAL_T_PIM: -30, EVAL_T_MRC: 40 }, null);
api('PEND_ABRIR', { idCama: '2', texto: 'Encargo del episodio que se va', firma: 'MCC' }, null);

const antes = cama(2);
si('el primero quedó con AET activa', antes.AET_ACTIVA === true || String(antes.AET_ACTIVA) === 'true');
si('…y con UPOT', antes.UPOT_ACTIVO === true || String(antes.UPOT_ACTIVO) === 'true');
si('…y con su Pimáx medida', String(antes.ULT_PIM || '') !== '');

api('DAR_ALTA', { idCama: '2', motivoEgreso: 'Traslado a sala', destinoEgreso: 'Medicina',
  firmaResponsable: 'DMV', fechaEgreso: SIM.fecha }, null);
ingresar(2, 'Paciente que llega');
const c = cama(2);

const vacio = v => v === '' || v === false || v == null || String(v) === 'false';
eq('★★ el paciente NUEVO no tiene AET heredada', vacio(c.AET_ACTIVA), true);
eq('★ …ni el nivel de esa AET', String(c.AET_NIVEL || ''), '');
eq('★ …ni la fecha', String(c.AET_FECHA || ''), '');
eq('★ …ni el seguimiento UPOT', vacio(c.UPOT_ACTIVO), true);
eq('…ni sus medidas', vacio(c.UPOT_MEDIDAS), true);
eq('★ …ni la Pimáx del otro', String(c.ULT_PIM || ''), '');
eq('…ni la firma de quien la midió', String(c.ULT_PIM_FIRMA || ''), '');
eq('…ni la firma del MRC', String(c.ULT_MRC_FIRMA || ''), '');
eq('…ni la presión de soporte', String(c.ULT_PS || ''), '');
eq('★ …ni los pendientes del episodio anterior', String(c.PENDIENTES_JSON || ''), '');
eq('…ni el APACHE II', String(c.APACHE2 || ''), '');
eq('…ni las correcciones de coordinación', String(c.CORRECCIONES_JSON || ''), '');
eq('…ni la confirmación de dispositivos', vacio(c.DISP_CONFIRMADO), true);
eq('y sí tiene lo suyo: su nombre', String(c.NOMBRE || ''), 'Paciente que llega');

console.log(fails.length ? '\n❌ ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
process.exit(fails.length ? 1 : 0);
