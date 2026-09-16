// rotulos_legibles.js — LA PLANILLA SE LEE SIN SABER PROGRAMAR.
//
// 🔴 DE DÓNDE SALE (Diego, 16-sep-2026, textual): «Te necesito que los nombres
// de la base de datos sean entendibles con tan solo mirarlos, no me sirve una
// abreviación que no sé qué es. Quizás esto para programadores es esencial pero
// para un clínico es necesario ser explícito».
//
// Tenía razón y el ejemplo lo daba él mismo: `EVAL_T_PMANT_VA` es «presión
// cuff», y no hay forma de adivinarlo. Lo mismo con `EXT_PE_SOP`, `PVE_SC_RAZON`
// o `CALC_CESR`. Son 1.166 columnas repartidas en 27 hojas.
//
// LA DECISIÓN (suya, sobre tres opciones): el ENCABEZADO de la planilla muestra
// el rótulo en castellano —corto, como se dice en la unidad: «presión cuff», no
// «presión del manguito de la vía aérea»— y el nombre técnico queda en la NOTA
// de la celda, para quien programe o analice.
//
// POR QUÉ ASÍ Y NO RENOMBRANDO LAS COLUMNAS: el nombre técnico es la llave que
// usan 8.348 lugares entre el código y las guardias. Cambiarlo es posible —la
// planilla de NEXT está vacía, así que no habría migración— pero es una tanda
// aparte. El rótulo da lo que Diego pidió HOY, en las 1.166 columnas, sin tocar
// una sola línea de lo que lee datos: el encabezado NO lo lee nadie (las
// lecturas van por posición, `esquemaFilaAObjeto`).
//
// 🔴 Y EL RÓTULO SALE DEL MISMO `esquema.gs`. Dos listas de nombres para lo
// mismo es exactamente cómo nació el desajuste 119≠132 del sistema viejo.
//
// 🪤 El reloj no se toca: nada de lo que se mide depende de la fecha.
//
// Uso: node build/checks/rotulos_legibles.js
const fs = require('fs');
const path = require('path');
const v2 = path.resolve(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g) + (ok ? '' : ' (esperado ' + JSON.stringify(w) + ')'));
  if (!ok) fails.push(l); };
const si = (l, c) => eq(l, !!c, true);

/* ── Cargar el esquema de verdad, sin Sheets ──────────────────────────────── */
global.SpreadsheetApp = { getActiveSpreadsheet: () => null, flush() {} };
global.PropertiesService = { getScriptProperties: () => ({ getProperty: () => null, setProperty() {} }) };
global.Session = { getScriptTimeZone: () => 'America/Santiago' };
// 🪤 `ESQUEMA` es una `const`: NO cuelga de globalThis con eval indirecto (solo
// `function` y `var`). Por eso se exporta a mano — la misma trampa que ya costó
// un «ERR is not defined» y una prueba que se saltaba en silencio.
(0, eval)(fs.readFileSync(path.join(v2, 'esquema.gs'), 'utf8') +
  '\n;globalThis.ESQUEMA = ESQUEMA;');

const HOJAS = Object.keys(ESQUEMA);

/* ══ 1 · TODA COLUMNA TIENE SU RÓTULO ═══════════════════════════════════════ */
console.log('1 · Ninguna columna se queda sin rótulo');
let totalCols = 0, sinRotulo = [];
HOJAS.forEach(h => ESQUEMA[h].cols.forEach(c => {
  totalCols++;
  if (!c[2] || !String(c[2]).trim()) sinRotulo.push(h + '.' + c[0]);
}));
console.log('   (' + totalCols + ' columnas en ' + HOJAS.length + ' hojas)');
eq('★ columnas sin rótulo', sinRotulo.length + (sinRotulo.length ? ' — p.ej. ' + sinRotulo.slice(0, 6).join(', ') : ''), '0');

/* ══ 2 · EL RÓTULO ESTÁ EN CASTELLANO, NO ES LA SIGLA OTRA VEZ ══════════════
   La prueba de fuego de Diego: «entendible con tan solo mirarlo». Un rótulo que
   repite el nombre técnico, o que es un guion_bajo_en_mayúsculas, no pasa. */
console.log('\n2 · El rótulo es castellano legible, no la sigla de nuevo');
/* 🩺 LAS SIGLAS QUE **SON** LA PALABRA. Ocho rótulos son una sigla y se quedan
   así a propósito: en la unidad nadie dice «presión positiva al final de la
   espiración», dice PEEP, y escribirlo largo haría la planilla MENOS legible —
   lo contrario de lo que pidió Diego. La lista es corta, explícita y con su
   razón; no es una puerta abierta a dejar cualquier sigla:
     PEEP · IPAP · EPAP  — parámetros del ventilador, se leen así en la pantalla
                           del equipo y en el registro de papel
     FSS-ICU · VISAGE    — escalas: su nombre ES la sigla, no hay palabra corta
     RUT                 — documento de identidad chileno
     INR · PCR           — exámenes de laboratorio, así vienen en el informe
   Agregar una entrada acá es una decisión consciente, igual que en
   `rut_minimo.js`: si no se dice así en la unidad, va escrita en palabras. */
const SIGLAS_QUE_SON_LA_PALABRA = ['PEEP', 'IPAP', 'EPAP', 'FSS-ICU', 'VISAGE', 'RUT', 'INR', 'PCR'];
const malos = [];
HOJAS.forEach(h => ESQUEMA[h].cols.forEach(c => {
  const nom = c[0], rot = String(c[2] || '');
  if (SIGLAS_QUE_SON_LA_PALABRA.indexOf(rot) !== -1) return;
  if (rot === nom) malos.push(h + '.' + nom + ' (repite el nombre técnico)');
  else if (/_/.test(rot)) malos.push(h + '.' + nom + ' → «' + rot + '» (lleva guion bajo)');
  else if (!/[a-záéíóúñ]/.test(rot)) malos.push(h + '.' + nom + ' → «' + rot + '» (sin minúsculas: es una sigla)');
}));
eq('★ rótulos que siguen siendo jerga', malos.length + (malos.length ? ' — p.ej. ' + malos.slice(0, 6).join(' · ') : ''), '0');

/* ══ 3 · CORTO, COMO SE DICE EN LA UNIDAD ═══════════════════════════════════
   «Presión cuff», no «presión del manguito de la vía aérea» (Diego). Un rótulo
   largo no cabe en la celda y se lee peor que la sigla. */
console.log('\n3 · Corto: cabe en la celda y se dice así en la unidad');
const largos = [];
HOJAS.forEach(h => ESQUEMA[h].cols.forEach(c => {
  const rot = String(c[2] || '');
  if (rot.length > 42) largos.push(h + '.' + c[0] + ' → «' + rot + '» (' + rot.length + ')');
}));
eq('★ rótulos de más de 42 caracteres', largos.length + (largos.length ? ' — p.ej. ' + largos.slice(0, 4).join(' · ') : ''), '0');

/* ══ 4 · DOS COLUMNAS NO PUEDEN LEERSE IGUAL ════════════════════════════════
   Si dos rótulos coinciden dentro de una hoja, mirar la planilla ya no dice
   cuál es cuál — que es justo lo que se está arreglando. */
console.log('\n4 · Dentro de una hoja, ningún rótulo se repite');
const repes = [];
HOJAS.forEach(h => {
  const visto = {};
  ESQUEMA[h].cols.forEach(c => {
    const k = String(c[2] || '').toLowerCase();
    if (visto[k]) repes.push(h + ': «' + c[2] + '» (' + visto[k] + ' y ' + c[0] + ')');
    visto[k] = c[0];
  });
});
eq('★ rótulos repetidos', repes.length + (repes.length ? ' — p.ej. ' + repes.slice(0, 5).join(' · ') : ''), '0');

/* ══ 5 · LAS QUE DIEGO NO PODÍA ADIVINAR ════════════════════════════════════
   Muestra a mano: si alguna de estas vuelve a ser críptica, la guardia cae.
   `EVAL_T_PMANT_VA` es el ejemplo que dio él mismo. */
console.log('\n5 · Las que motivaron el pedido');
const rot = (hoja, nom) => {
  const c = (ESQUEMA[hoja] || { cols: [] }).cols.find(x => x[0] === nom);
  return c ? String(c[2] || '') : '(no existe)';
};
const CONTIENE = [
  ['EVOLUCIONES', 'EVAL_T_PMANT_VA', /presi[óo]n cuff/i],
  ['EVOLUCIONES', 'EXT_PE_MODO',     /extubaci[óo]n/i],
  ['EVOLUCIONES', 'EXT_PE_SOP',      /extubaci[óo]n/i],
  ['EVOLUCIONES', 'PVE_SC_RAZON',    /PVE/],
  ['EVOLUCIONES', 'CALC_CESR',       /compliance|distensibilidad/i],
  ['EVOLUCIONES', 'CALC_DP',         /driving|presi[óo]n de distensi/i],
  ['EVOLUCIONES', 'KTM_UMA',         /movilizaci[óo]n|UMA/i],
  ['EVOLUCIONES', 'VENT_VIA_AEREA',  /v[íi]a a[ée]rea/i],
  ['EVOLUCIONES', 'VENT_INTERFAZ',   /interfaz|dispositivo/i],
  ['EVOLUCIONES', 'REINTUB_SOP_PREV', /reintub/i],
  ['EVOLUCIONES', 'PLAN_FIRMA_KINE', /firma/i],
  ['EVOLUCIONES', 'HEMO_DVA',        /vasoactiv/i],
  ['EVOLUCIONES', 'SED_SAS',         /SAS|sedaci[óo]n|agitaci[óo]n/i],
  ['EVOLUCIONES', 'DIAS_VM',         /d[íi]as.*VM|VM.*d[íi]as/i],
  ['CAMAS_ESTADO', 'PATIENT_ID',     /episodio/i],
  ['ARCHIVO_PACIENTES', 'DAUCI',     /debilidad/i],
];
CONTIENE.forEach(([h, n, re]) => {
  const r = rot(h, n);
  eq('  ' + n + ' → «' + r + '»', re.test(r), true);
});

/* ══ 6 · LO QUE SE ESCRIBE EN LA PLANILLA ═══════════════════════════════════
   No basta con tener el rótulo guardado: `crearORepararEstructura` tiene que
   ESCRIBIRLO en el encabezado y dejar el nombre técnico en la nota. Se corre de
   verdad, contra una planilla de mentira que anota lo que recibe. */
console.log('\n6 · crearORepararEstructura escribe el rótulo (y la nota técnica)');
const escrito = {};
function hojaFalsa(nombre) {
  const H = { _v: {}, _n: {}, _frozen: 0, _maxCols: 5, _maxRows: 100 };
  H.getMaxColumns = () => H._maxCols;
  H.getMaxRows = () => H._maxRows;
  H.insertColumnsAfter = (_, k) => { H._maxCols += k; };
  H.setFrozenRows = r => { H._frozen = r; };
  H.getLastRow = () => 0;
  H.getRange = (f, c, nf, nc) => ({
    setValue(x) { H._v[f + ',' + c] = x; return this; },
    setValues(m) { m[0].forEach((x, i) => { H._v[f + ',' + (c + i)] = x; }); return this; },
    setNotes(m) { m[0].forEach((x, i) => { H._n[f + ',' + (c + i)] = x; }); return this; },
    setNote(x) { H._n[f + ',' + c] = x; return this; },
    setNumberFormat() { return this; },
    getValue: () => H._v[f + ',' + c] || '',
    getValues: () => [[H._v[f + ',' + c] || '']],
  });
  escrito[nombre] = H;
  return H;
}
global.SpreadsheetApp = {
  getActiveSpreadsheet: () => ({
    getSheetByName: n => escrito[n] || hojaFalsa(n),
    insertSheet: n => hojaFalsa(n),
  }),
  flush() {},
};
_sembrar = function () {};   // la siembra toca CONFIG y catálogos: aquí no aplica
let reventó = '';
try { crearORepararEstructura(); } catch (e) { reventó = e.message; }
eq('  corre sin reventar', reventó, '');

const filaRot = h => (ESQUEMA[h].headerRows >= 2 ? 2 : 1);
['EVOLUCIONES', 'CAMAS_ESTADO', 'ARCHIVO_PACIENTES', 'TIMELINE'].forEach(h => {
  const H = escrito[h]; if (!H) { eq('  ' + h + ' se escribió', false, true); return; }
  const f = filaRot(h);
  const primera = ESQUEMA[h].cols[0];
  eq('  ★ ' + h + ' · el encabezado dice el rótulo', H._v[f + ',1'], primera[2]);
  eq('  ★ ' + h + ' · …y la nota guarda el nombre técnico', H._n[f + ',1'], primera[0]);
  // una del medio, para que no sea solo la primera
  const i = Math.floor(ESQUEMA[h].cols.length / 2), medio = ESQUEMA[h].cols[i];
  eq('    …también a mitad de la hoja (' + medio[0] + ')', H._v[f + ',' + (i + 1)], medio[2]);
  eq('    …con su nota', H._n[f + ',' + (i + 1)], medio[0]);
});
eq('  ★ y el título de la hoja sigue en A1 de la fila 1 (EVOLUCIONES)',
   escrito.EVOLUCIONES ? escrito.EVOLUCIONES._v['1,1'] : '', 'EVOLUCIONES');

/* ══ 7 · LA HERRAMIENTA DE REPARACIÓN SIGUE ENCONTRANDO LA FILA ═════════════
   `cuadrarEncabezados` ubica la fila de nombres buscando el PRIMER NOMBRE en la
   columna A. Si el encabezado ahora dice el rótulo y nadie lo avisa, la
   herramienta contesta «no se encontró la fila de nombres — revisar a mano» en
   las 27 hojas, y es la herramienta que arregla la planilla cuando se desalinea. */
console.log('\n7 · cuadrarEncabezados reconoce el encabezado nuevo');
const mant = fs.readFileSync(path.join(v2, 'mantenimiento.gs'), 'utf8');
si('★ busca también por el rótulo, no solo por el nombre técnico',
   /def\.cols\[0\]\[2\]/.test(mant));

console.log(fails.length ? '\n❌ ' + fails.length + ' FALLO(S)' : '\n✅ TODO OK — la planilla se lee sin saber programar');
process.exit(fails.length ? 1 : 0);
