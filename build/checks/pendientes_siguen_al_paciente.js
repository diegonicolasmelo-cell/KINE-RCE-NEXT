// pendientes_siguen_al_paciente.js — Los pendientes viajan con el PACIENTE, no
// se quedan en la cama (20-sep-2026).
//
// DE DÓNDE SALE. Diego, leyendo que los pendientes «viven en la cama»:
// «¿si traslado el paciente a otra cama, se quedan los pendientes en la cama y
// no siguen al paciente? Es decir, ¿el que ingrese a esa cama heredará esos
// pendientes?».
//
// La pregunta apunta a un daño real: heredar los encargos del paciente
// ANTERIOR es peor que perderlos, porque nadie duda de un pendiente que
// aparece escrito. Alguien iría a pedir un pabellón que no corresponde.
//
// LA RESPUESTA ES QUE SÍ VIAJAN, y esta guardia existe para que siga siendo
// cierto. Hoy lo es por una razón FRÁGIL: los dos traslados copian la fila
// ENTERA de la cama con Object.assign, así que PENDIENTES_JSON viaja «de
// regalo». El día que alguien reescriba el traslado campo por campo —que es lo
// natural al agregar una columna— los pendientes se quedarían atrás sin que
// nada avise. Por eso se mide el comportamiento, no la implementación.
//
// Tres caminos, y los tres tienen que dejar la cama vieja LIMPIA:
//   · mover a cama vacía (el caso de aislamiento),
//   · intercambiar dos camas ocupadas,
//   · el alta (ya lo cubre alta_no_deja_rastro.js; acá se mira de nuevo porque
//     es el mismo daño y conviene verlo junto).
//
// 🪤 El reloj va congelado: `ahoraTS` y `hoyISO` devuelven fechas inventadas.

const fs = require('fs');
const path = require('path');
const V2 = path.join(__dirname, '..', '..', 'v2');
const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!okk) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); }
};
const si = (l, g) => eq(l, !!g, 'true');

/* ── El banco: dos camas y un repositorio de mentira ──────────────────── */
let CAMAS = {};
const pend = (txs) => JSON.stringify(txs.map((t, i) => ({
  id: 'p' + i, tx: t, ab: 'K.P.', abTs: '2026-08-10 09:00:00', ci: '', ciTs: ''
})));
const textos = (idCama) => {
  try { return (JSON.parse(CAMAS[idCama].PENDIENTES_JSON || '[]') || []).map(p => p.tx).join(', '); }
  catch (e) { return '(json roto)'; }
};

const src = ['infra_respuesta.gs', 'infra_util.gs', 'svc_camas.gs']
  .map(f => fs.readFileSync(path.join(V2, f), 'utf8')).join('\n;\n');
global.repoBuscarPorId = (h, k, id) => CAMAS[String(id)] ? Object.assign({}, CAMAS[String(id)]) : null;
global.repoActualizar = (h, k, id, campos) => {
  CAMAS[String(id)] = Object.assign({}, CAMAS[String(id)] || {}, campos);
  CAMAS[String(id)].ID_CAMA = String(id);
  return 1;
};
global.repoLeerTodos = () => [];
global.repoLeerTodosConFila = () => [];
global.repoEliminarFilas = () => 0;
global.repoInsertar = () => {};
global.repoInsertarVarios = () => 0;
global.conLock = (fn) => fn();
global.hoyISO = () => '2026-08-12';                    // 🪤 fecha inventada
global.ahoraTS = () => '2026-08-12 09:00:00';          // 🪤 «ahora» inventado
global.hoy = () => '2026-08-12';
global.SpreadsheetApp = { flush: () => {} };
global.Utilities = { getUuid: () => 'uuid', formatDate: () => '2026-08-12' };
global.leerConfig = (k, d) => d;
global._agregarHitoInterno = () => {};
global._sincronizarTimelineCama = () => {};
/* 🪤 Los stubs de funciones que el propio svc_camas.gs DECLARA (como
   _reetiquetarEpisodioACama) no sirven: el eval las redefine y corre la real.
   Lo que hay que doblar es lo que ella usa por debajo. */
global.repoActualizarDonde = () => 0;
global.repoEliminarDonde = () => 0;
global._archivarEvolucionesDeCama = () => {};
(0, eval)(src);

const sembrar = () => {
  CAMAS = {
    '3': { ID_CAMA: '3', OCUPADA: 'TRUE', PATIENT_ID: 'pA', NOMBRE: 'Paciente A',
           PENDIENTES_JSON: pend(['Pabellón pendiente', 'GSA de control']) },
    '9': { ID_CAMA: '9', OCUPADA: 'FALSE', PATIENT_ID: '', PENDIENTES_JSON: '' },
    '7': { ID_CAMA: '7', OCUPADA: 'TRUE', PATIENT_ID: 'pB', NOMBRE: 'Paciente B',
           PENDIENTES_JSON: pend(['Extubar']) },
  };
};

/* ══ 1 · Mover a cama vacía ═══════════════════════════════════════════ */
console.log('\n1 · 🔴 A una cama vacía: los pendientes van con el paciente');
sembrar();
let r = moverACamaVacia('3', '9', { firma: 'K.P.' });
si('   el traslado se hizo', r && r.ok);
eq('★★ los pendientes llegaron a la cama nueva', textos('9'), 'Pabellón pendiente, GSA de control');
eq('★★ y la cama vieja quedó SIN pendientes', textos('3') || '(ninguno)', '(ninguno)');
eq('   …y libre', String(CAMAS['3'].OCUPADA), 'false');

/* ══ 2 · Intercambio entre dos ocupadas ═══════════════════════════════ */
console.log('\n2 · 🔴 Intercambio: cada uno se lleva los suyos');
sembrar();
r = intercambiarCamas('3', '7', { firma: 'K.P.' });
si('   el intercambio se hizo', r && r.ok);
eq('★★ el paciente A llegó a la 7 con los suyos', textos('7'), 'Pabellón pendiente, GSA de control');
eq('★★ el paciente B llegó a la 3 con el suyo', textos('3'), 'Extubar');
eq('   …y cada cama tiene a su paciente', CAMAS['7'].PATIENT_ID + '/' + CAMAS['3'].PATIENT_ID, 'pA/pB');

/* ══ 3 · El alta no deja herencia ═════════════════════════════════════ */
console.log('\n3 · Al liberar la cama no queda nada que heredar');
sembrar();
_limpiarCamaInterno('3');
eq('★★ la cama liberada queda sin pendientes', textos('3') || '(ninguno)', '(ninguno)');

if (fails.length) {
  console.log('\n❌ pendientes_siguen_al_paciente: ' + fails.length + ' fallo(s):');
  fails.forEach(f => console.log('   · ' + f));
  process.exit(1);
}
console.log('\n✅ pendientes_siguen_al_paciente: viajan con el paciente y no se heredan.');
