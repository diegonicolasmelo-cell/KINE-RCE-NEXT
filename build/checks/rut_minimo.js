// rut_minimo.js — 🔒 EL RUT SOLO VIAJA DONDE HACE FALTA (15-sep-2026).
//
// DE DÓNDE SALE. El plan maestro decidió en D9 sacar el RUT de todas las hojas
// y reemplazarlo por COD_PACIENTE. Después de esa decisión (jul/ago-2026) el
// RUT volvió al sistema con CUATRO trabajos concretos que nadie más hace hoy:
// emparejar los gases que llegan del laboratorio, detectar reingresos, el
// buscador («al que solo tenía el RUT a mano no le servía de nada») y el botón
// que lo copia para abrir el laboratorio. Sacarlo hoy rompería esas cuatro
// cosas, así que la decisión de fondo es de Diego (ver docs/archivo/ESTADO_PLAN.md §G4).
//
// Lo que NO depende de esa decisión es la minimización (§10 del plan): que el
// RUT no salga en ninguna respuesta que no lo necesite. Eso ya se cuidaba
// caso por caso —hay 25 guardias que lo mencionan— pero NADIE lo miraba de
// forma sistemática: cada respuesta nueva empieza sin revisar, y la única
// forma de enterarse era que alguien la leyera.
//
// QUÉ HACE. Siembra un RUT conocido (sintético) en las camas y en el archivo,
// llama al dispatcher REAL acción por acción, y exige que ese RUT no aparezca
// en la respuesta salvo en la lista corta de abajo. La lista es la parte
// importante de la guardia: agregar una acción ahí es una decisión consciente
// que queda escrita, no un descuido.
//
// Uso: node build/checks/rut_minimo.js
'use strict';
const fs = require('fs');
const path = require('path');
const { montar } = require('../medir_guardado.js');

// El banco de medición carga los servicios que necesita para MEDIR el guardado,
// no todos. Acá se completan los que faltan sin tocar su lista: cambiarla
// movería el A/B de `guardado_viajes.js`, que corre este mismo banco contra un
// árbol histórico. Los que no existan se saltan, igual que hace el banco.
const V2 = path.resolve(__dirname, '..', '..', 'v2');
// 🪤 `infra_respuesta.gs` va primero aunque el banco ya lo cargó: sus `const`
// (ERR, los códigos de error) NO cuelgan de globalThis —solo function y var lo
// hacen con eval indirecto—, así que un servicio evaluado en OTRO ámbito no las
// ve y revienta con «ERR is not defined». Sin esto, GENERAR_REM se saltaba en
// silencio y el informe más delicado del proyecto se quedaba sin revisar.
const EXTRA = ['infra_respuesta.gs',
               'svc_rem.gs', 'svc_rem_plantilla.gs', 'svc_notificaciones.gs',
               'svc_evaluaciones.gs', 'svc_plantillas.gs', 'svc_gsa.gs', 'svc_docs.gs'];
(0, eval)(EXTRA.map(f => path.join(V2, f)).filter(f => fs.existsSync(f))
  .map(f => fs.readFileSync(f, 'utf8')).join('\n;\n'));

const RUT_SEMILLA = '11222333-4';         // sintético, dígito verificador válido
const RUT_ARCHIVO = '22333444-5';

/* ── Las ÚNICAS acciones que pueden devolver un RUT, y por qué ───────────── */
const PERMITIDAS = {
  GET_RUT_PREVIO: 'el aviso de reingreso: se pregunta POR un RUT',
  GET_CAMA: 'la ficha del paciente en su cama: es donde se escribe y se lee',
  GET_BUSCAR_PACIENTE: 'el buscador acepta un RUT como término',
  COORD_FICHA: 'corrección de ficha por coordinación: el RUT es un campo editable',
  GET_GSA_PENDIENTES: 'la bandeja de gases sin emparejar muestra el RUT que trae el informe',
  // 🔴 Las dos que reparten el censo entero. Medido el 15-sep-2026: no es un
  // descuido, el navegador lo USA en seis lugares —el formulario de la ficha,
  // los botones de Synapse y del laboratorio, y las hojas impresas del día,
  // PVE y APK, donde el RUT va en su casilla por convención del papel—. Y la
  // app NUNCA pide una cama suelta: `GET_CAMA` no se llama desde el front,
  // todo sale de `DB`, que es este censo. Sacar el RUT de aquí obliga a
  // inventar ese viaje por paciente en una app que pasó un año quitando
  // viajes. Es una decisión de diseño de Diego, no una fuga que tapar: está
  // planteada en docs/archivo/ESTADO_PLAN.md §G4.
  GET_BOOT: 'el censo del arranque: el navegador lo usa en la ficha, los botones de laboratorio y las hojas impresas',
  GET_TODAS_CAMAS: 'el mismo censo por la ruta clásica de arranque (_bootLegacy)',
};

const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined ? '' : ' — ' + detalle));
  if (!cond) fails.push(l);
};

montar();
// El RUT se escribe por el mismo camino que la app: nada de tocar celdas.
global.repoActualizar('CAMAS_ESTADO', 'ID_CAMA', '5', { RUT: RUT_SEMILLA });
global.repoInsertar('ARCHIVO_PACIENTES', {
  ID_ARCHIVO: 'ARCH_sim', PATIENT_ID: 'pid-90', CAMA_ORIGEN: '9', COD_PACIENTE: 'P90',
  NOMBRE: 'Egresado Sintético', EDAD: 70, SEXO: 'M', RUT: RUT_ARCHIVO,
  FECHA_INGRESO: '2026-07-20', FECHA_EGRESO: '2026-08-02', DIAS_TOTAL: 13,
  DIAGNOSTICO: 'Neumonía grave', MOTIVO_EGRESO: 'Alta', DESTINO_EGRESO: 'Sala',
});

si('la siembra quedó puesta (si no, la guardia no probaría nada)',
  global.repoBuscarPorId('CAMAS_ESTADO', 'ID_CAMA', '5').RUT === RUT_SEMILLA,
  'la cama 5 no quedó con el RUT sembrado');

/* ── Acciones de lectura que alimentan al navegador ──────────────────────── */
const LECTURAS = [
  ['GET_BOOT', { fecha: '2026-08-07', key: '2026-08-07-Dia' }],
  ['GET_TODAS_CAMAS', {}],
  ['GET_EVOS_DEL_DIA', { fecha: '2026-08-07' }],
  ['GET_EVOLUCION', { idCama: '5', turnoKey: '2026-08-07-Dia' }],
  ['GET_EVOLUCION_PREVIA', { idCama: '5', turnoKey: '2026-08-07-Noche' }],
  ['GET_HISTORIAL_PACIENTE', { patientId: 'pid-5' }],
  ['GET_TIMELINE', { patientId: 'pid-5' }],
  ['GET_PROCEDIMIENTOS', { idCama: '5', turnoKey: '2026-08-07-Dia' }],
  ['GET_ENTREGA_TURNO', { idCamas: ['1','2','3','4','5'], fecha: '2026-08-07', turno: 'Dia' }],
  ['GET_ENTREGAS_TURNO', {}],
  ['GET_STATS', { desde: '2026-08-01', hasta: '2026-08-31' }],
  ['GET_INDICADORES', { desde: '2026-08-01', hasta: '2026-08-31' }],
  ['GET_PIVOT', { desde: '2026-08-01', hasta: '2026-08-31' }],
  ['GET_ARCHIVADOS', { desde: '2026-07-01', hasta: '2026-08-31', limite: 40 }],
  ['GET_EVOLUCIONES_RECIENTES', { idCama: '5' }],
  ['GET_ALERTAS', { fecha: '2026-08-07' }],
  ['GET_NOTIFICACIONES', {}],
  ['GET_ASIGNACION_TURNO', { key: '2026-08-07-Dia' }],
  ['GET_CAMBIOS_NOCHE', { fecha: '2026-08-07' }],
  ['GET_EVALUACIONES', { patientId: 'pid-5', idCama: '5' }],
  ['GET_AUDITORIA', { limite: 50 }],
  // GENERAR_REM queda FUERA a propósito, no por descuido: escribe una hoja
  // nueva con la plantilla oficial (`ss.insertSheet`, `merge`, bordes…) y
  // simularla aquí sería otro banco entero. Su privacidad la cubren las
  // guardias propias del REM —`rem.js` y `rem_conciliacion.js`—, que asertan
  // que no lleva RUT. Dicho acá para que nadie lo lea como un hueco.
];

const RE_RUT = /\b\d{7,8}\s?-\s?[\dkK]\b|\b\d{1,2}\.\d{3}\.\d{3}\s?-\s?[\dkK]\b/;
let probadas = 0, saltadas = [];

for (const [accion, datos] of LECTURAS) {
  if (PERMITIDAS[accion]) continue;
  let r;
  try { r = global.api(accion, datos, null); }
  catch (e) { saltadas.push(accion + ' (excepción: ' + e.message + ')'); continue; }
  if (!r || r.ok === false) { saltadas.push(accion + ' (' + ((r && r.error) || 'sin respuesta') + ')'); continue; }
  probadas++;
  const texto = JSON.stringify(r.data === undefined ? r : r.data);
  const halla = RE_RUT.exec(texto);
  si('sin RUT en la respuesta de ' + accion, !halla,
    halla ? ('aparece «' + halla[0] + '» — si es correcto que viaje, agregá ' + accion + ' a PERMITIDAS con su motivo') : '');
}

si('se probó un número razonable de lecturas (' + probadas + ')', probadas >= 15,
  'solo ' + probadas + ' respondieron ok; saltadas: ' + saltadas.join(', '));
if (saltadas.length) console.log('   ℹ️ sin respuesta útil en esta siembra: ' + saltadas.join(', '));

/* ── La lista de permitidas no se llena sola ─────────────────────────────── */
si('cada acción permitida tiene su motivo escrito',
  Object.values(PERMITIDAS).every(m => typeof m === 'string' && m.length > 20));
// El tope no es decoración: es lo que convierte «agregar una permitida» en una
// decisión que alguien tiene que tomar a mano y justificar, en vez de un
// renglón más que pasa desapercibido en una revisión.
si('la lista de permitidas sigue siendo corta (' + Object.keys(PERMITIDAS).length + ')',
  Object.keys(PERMITIDAS).length <= 7,
  'si crece, el RUT está volviendo a repartirse por el sistema');

/* ── Y las permitidas existen de verdad en el dispatcher ─────────────────── */
const API_SRC = fs.readFileSync(path.resolve(__dirname, '..', '..', 'v2', 'api.gs'), 'utf8');
const inexistentes = Object.keys(PERMITIDAS).filter(a => API_SRC.indexOf("'" + a + "'") === -1);
si('ninguna permitida quedó huérfana en el dispatcher', inexistentes.length === 0, inexistentes.join(', '));

console.log(fails.length ? '\n❌ ' + fails.length + ' FALLOS' : '\n✅ TODO OK');
process.exit(fails.length ? 1 : 0);
