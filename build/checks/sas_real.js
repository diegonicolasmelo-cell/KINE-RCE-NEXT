// sas_real.js — El SAS que TIENE el paciente y el que se PERSIGUE, y la
// sedación que no es profunda.
//
// 🔴 DE DÓNDE SALE (Diego, 14-ago-2026). Su historia, textual: «tiene un
// paciente en SAS 6, sin embargo el objetivo es lograr el SAS 4, pero a pesar
// de las medidas no se logra de forma consistente. Diego no tiene cómo decir
// que la sedación que tiene es para este fin, ya que si lo anota como sedación
// cuenta como reinicio de sedación para fines de salir de la sedación
// profunda. Lo anota igual y en la entrega se pierde cuando suspenden
// sedación».
//
// Eran DOS defectos encadenados:
//
//  1. UN SOLO CAMPO PARA DOS COSAS. La evolución lo narraba como «meta SAS» y
//     CUATRO decisiones automáticas lo leían como el estado del paciente: el
//     GCS automático con SAS 1, el límite de KTM al nivel 1, el gate de S5Q y
//     CAM-ICU bajo SAS 3, y la categorización SOCHIMI. Con un paciente en 6 y
//     meta 4 no había número correcto: escribiendo el real la evolución mentía
//     sobre el objetivo, y escribiendo la meta la app le abría el S5Q y el
//     CAM-ICU a un paciente agitado.
//     ⇒ `SED_SAS` pasa a ser oficialmente el ACTUAL —que es como esas cuatro
//     decisiones ya lo leían, o sea sin tocarlas— y la meta viaja aparte.
//
//  2. LA FECHA DE SUSPENSIÓN LA BORRABA CUALQUIER SEDACIÓN. Se calculaba con
//     «¿el escalón es distinto de Sin sedación?», así que anotar precedex para
//     controlar la agitación contaba como volver a sedación PROFUNDA y la
//     fecha —el antes y el después para evaluar la respuesta a la suspensión
//     de hipnóticos y para interpretar el GCS— desaparecía de la entrega.
//     ⇒ La regla pasa a preguntar por la sedación PROFUNDA.
//
// Uso: node build/checks/sas_real.js
const fs = require('fs');
const path = require('path');
const v2 = path.join(__dirname, '..', '..', 'v2');
const fails = [];
const eq = (l, g, w) => { const okk = String(g) === String(w); console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g) + (okk ? '' : ' (esperado ' + JSON.stringify(w) + ')')); if (!okk) fails.push(l); };

const idx = fs.readFileSync(path.join(v2, 'index.html'), 'utf8');
const dom = fs.readFileSync(path.join(v2, 'dominio_texto.gs'), 'utf8');
const esq = fs.readFileSync(path.join(v2, 'esquema.gs'), 'utf8');

/* ══ 1 · LAS TRES COLUMNAS, AL FINAL ════════════════════════════════════ */
console.log('\n1 · Esquema');
['SED_SAS_META', 'SED_VIGIL', 'SED_FARMACOS'].forEach(c =>
  eq('  existe ' + c, new RegExp("\\['" + c + "'").test(esq), true));
// 🪤 Aquí decía `/EVOLUCIONES !== 390/`: el número de aquella tanda, escrito a
// mano. Se puso rojo el 22-ago-2026 al sumar las columnas de neuromonitoreo,
// sin que nada estuviera mal — la guardia protegía un valor, no una propiedad.
// Lo que de verdad hay que vigilar es que el total de testEsquema **coincida
// con las columnas realmente declaradas**: ese desajuste es el que hace que la
// prueba acuse a la planilla de un error que no tiene.
{
  const bloque = esq.slice(esq.indexOf('const _COLS_EVOLUCIONES'), esq.indexOf('const ESQUEMA'));
// 🗂️ 16-sep-2026 · LA TUPLA TRAE TRES ELEMENTOS. Cada columna es
// ['NOMBRE','tipo','Rótulo legible'] desde que la planilla muestra el rótulo en
// castellano y el nombre técnico en la nota (pedido de Diego). Los dos patrones
// de abajo cuentan y ordenan columnas, así que el tercer elemento va como
// OPCIONAL: exigen lo mismo que antes.
  const declaradas = [...bloque.matchAll(/\['[A-Z0-9_]+','[a-z]+'(?:,'[^']*')?\]/g)].length;
  const escrito = (esq.match(/TOTAL_COLS\.EVOLUCIONES !== (\d+)/) || [])[1];
  eq('el total de testEsquema calza con las columnas declaradas (' + declaradas + ')',
     String(escrito), String(declaradas));
}
// Regla de la casa: las columnas nuevas van SIEMPRE al final (la reparación
// reescribe encabezados y meterlas al medio desalinea los datos guardados).
const cols = [...esq.matchAll(/\['([A-Z0-9_]+)','(?:texto|bool|entero|decimal|fecha|ts|uuid|email)'(?:,'[^']*')?\]/g)].map(m => m[1]);
const iSnt = cols.lastIndexOf('RESP_SNT');
eq('★ y van DESPUÉS de la última columna anterior (RESP_SNT)',
  cols.slice(iSnt + 1, iSnt + 4).join(','), 'SED_SAS_META,SED_VIGIL,SED_FARMACOS');

/* ══ 2 · EL FORMULARIO ══════════════════════════════════════════════════ */
console.log('\n2 · Formulario: actual, meta, vigil y sedantes');
eq('el casillero de siempre pasó a decir «SAS actual»', /<label>SAS actual<\/label>/.test(idx), true);
eq('hay un casillero para la meta', /id="fSASmeta"/.test(idx), true);
// 🗂️ 17-sep-2026 · La casilla de sedación vigil SALIÓ y el SAS se narra en
// palabras. Diego: «si está en escalón 6 con Precedex y tiene un SAS 4, yo sé
// que está sedado y que está vigil; ya sería rellenar algo de más». La
// profundidad la decide el SAS (1-2 profunda), que es el mismo corte de los
// gates: una sola definición. Lo fija sedacion_la_dice_el_sas.js.
eq('la casilla de sedación vigil YA NO está', /id="cSedVigil"/.test(idx), false);
// «Fentanyl» pasó a «Fentanilo» (castellano) y entró Lorazepam, que se usa
// en continuo con abuso de sustancias.
['Fentanilo', 'Propofol', 'Midazolam', 'Ketamina', 'Precedex', 'Lorazepam'].forEach(f =>
  eq('  sedante ' + f, new RegExp('data-f="' + f + '"').test(idx), true));
eq('la meta y los sedantes viajan en el guardado',
  /SED_SAS_META:v\('fSASmeta'\)/.test(idx) &&
  /SED_FARMACOS:JSON\.stringify\(_sedFarmLista\(\)\)/.test(idx), true);
// 🔴 La columna SED_VIGIL se conserva —las posiciones del esquema son fijas y
// las filas ya escritas la usan— pero se dejó de escribir desde el turno.
eq('…y SED_VIGIL se dejó de escribir', /SED_VIGIL:bv\(/.test(idx), false);
// Sin sedación no hay meta ni sedantes que declarar.
eq('«Sin sedación» limpia y esconde el bloque',
  /const m=\$\('fSASmeta'\);if\(m\)m\.value='';hide\('gSASmeta'\);/.test(idx), true);

console.log('\n2b · Las CUATRO decisiones automáticas siguen leyendo el ACTUAL');
// No se tocan a propósito: ya leían `fSAS`, que ahora es oficialmente el
// actual. Ese es el motivo de haber elegido este reparto y no el inverso.
eq('  GCS automático con SAS 1', /const sas=parseInt\(v\('fSAS'\)\)\|\|0;/.test(idx), true);
eq('  KTM limitada al nivel 1', /const sas1 = parseInt\(v\('fSAS'\)\)===1;/.test(idx), true);
eq('  gate de S5Q y CAM-ICU', /const sas=parseInt\(v\('fSAS'\)\);/.test(idx), true);
eq('  matriz SOCHIMI', /const s=parseInt\(v\('fSAS'\)\)\|\|0;/.test(idx), true);
eq('★ y NINGUNA lee la meta', /parseInt\(v\('fSASmeta'\)\)/.test(idx), false);

/* ══ 3 · LA NARRATIVA, EN LOS DOS GENERADORES ═══════════════════════════ */
console.log('\n3 · Cliente y servidor dicen lo mismo');
// Es el patrón de las secreciones: dos generadores de la misma frase que se
// separan. Se comprueba leyendo los dos fuentes, no un texto.
/* 🪤 17-sep-2026 · SE MIDE EL CÓDIGO, NO SU DOCUMENTACIÓN. Esta guardia se
   puso roja sola al escribir el comentario que explica el cambio: la nota de
   dominio_texto.gs dice que ya no se narra la casilla, y el grep la encontraba
   ahí. Es la tercera vez que pasa (ver relato_espejo.js y glasgow_medido.js).
   Se quitan antes de buscar los bloques de comentario y las líneas que
   EMPIEZAN con dos barras; las de media línea se dejan, porque cortarlas se
   llevaría por delante URLs y código real. */
const sinNotas = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
[['cliente', sinNotas(idx)], ['servidor', sinNotas(dom)]].forEach(([quien, src]) => {
  // 🗂️ 17-sep-2026 · El SAS se narra EN PALABRAS y la meta con coma:
  // «con SAS 4 (vigil, tranquilo y cooperador), meta SAS 1». Lo que esta
  // sección protege no cambió —que el SAS ACTUAL y la META no se confundan,
  // que es por lo que se separaron en dos campos— y se sigue leyendo en los
  // dos fuentes. La «sedación vigil» ya no se nombra aparte: el propio SAS lo
  // dice, y la casilla salió.
  eq('  ' + quien + ': narra el SAS en palabras',
    /_?sasEnPalabras\(sas\)/.test(src), true);
  eq('  ' + quien + ': …con la meta separada, no en otro paréntesis',
    /meta SAS \$\{_?meta\}/.test(src), true);
  eq('  ' + quien + ': y ya no nombra la casilla de sedación vigil',
    /vigil \(control de agitación\)/.test(src), false);
  eq('  ' + quien + ': lista los sedantes', /farmTxt|_farmTxt/.test(src), true);
});

/* ══ 4 · LA FECHA DE SUSPENSIÓN ES DE LA SEDACIÓN PROFUNDA ══════════════ */
console.log('\n4 · La historia de Diego, turno a turno');

const DB = {
  CAMAS_ESTADO: [{ ID_CAMA: '12', OCUPADA: 'TRUE', PATIENT_ID: 'p12', NOMBRE: 'Ejemplo',
    DIAGNOSTICO: 'TEC grave', FECHA_INGRESO: '2026-08-01', VIA_AEREA: 'TQT', SOPORTE: 'VM' }],
  EVOLUCIONES: [], PROCEDIMIENTOS: [],
};
const evo = (d, extra) => Object.assign({
  ID_CAMA: '12', PATIENT_ID: 'p12', FECHA: '2026-08-' + String(d).padStart(2, '0'),
  TURNO_KEY: '2026-08-' + String(d).padStart(2, '0') + '-Dia', TURNO: 'Dia',
  VENT_VIA_AEREA: 'TQT', VENT_SOPORTE: 'VM', PLAN_FIRMA_KINE: 'Klgo. Diego Melo',
}, extra);

global.repoLeerTodos = (h, c, v) => { let f = (DB[h] || []).slice(); if (c !== undefined) f = f.filter(r => String(r[c]) === String(v)); return f; };
global.repoLeerFiltrado = (h, col, pred) => (DB[h] || []).filter(r => pred(r[col]));
global.repoBuscarPorId = (h, c, id) => (DB[h] || []).find(r => String(r[c]) === String(id)) || null;
global.esVerdadero = v => v === true || v === 'TRUE' || v === 'true';
global.leerConfig = (k, d) => d;
global.hoyISO = () => '2026-08-08';
global.ahoraTS = () => '2026-08-08 10:00:00';
global._tz = () => 'America/Santiago';
global.Utilities = { formatDate: () => '2026-08-08' };
global.ok = d => ({ ok: true, data: d });
global.err = (m, c) => ({ ok: false, error: m, codigo: c });
global.ERR = { VALIDACION: 'V', INTERNO: 'I' };
global._statISO = f => String(f || '').slice(0, 10);
// 🗂️ 17-sep-2026 · `dominio_calculos.gs` entra al arnés: svc_entrega.gs
// pasó a usar sedacionProfunda() de ahí, en vez de reimplementar la regla.
// En Apps Script todos los .gs comparten ámbito global y esto no hace
// falta; el arnés carga solo lo que se le nombra, y sin el dominio la
// llamada reventaba por dentro y la entrega volvía vacía.
eval(['infra_fechas.gs', 'svc_eventos.gs', 'svc_stats.gs', 'dominio_calculos.gs', 'svc_entrega.gs']
  .map(f => fs.readFileSync(path.join(v2, f), 'utf8')).join('\n;\n'));

const ficha = (evos) => {
  DB.EVOLUCIONES = evos;
  return obtenerEntregaTurno(['12'], evos[evos.length - 1].TURNO_KEY.slice(0, 10), 'Dia').data.fichas[0];
};

// Sedado profundo el 01 y el 02 (SAS 2); el 03 baja a escalón 2 y despierta a
// SAS 3; el 04 sin sedación; y del 05 al 08 con PRECEDEX para controlar la
// agitación: SAS 6 con meta 4. Ése es, entero, el caso que contó Diego.
const historia = [
  evo(1, { SED_TIPO: 'Escalón 3', SED_SAS: '2', SED_SAS_META: '2' }),
  evo(2, { SED_TIPO: 'Escalón 3', SED_SAS: '2', SED_SAS_META: '2' }),
  evo(3, { SED_TIPO: 'Escalón 2', SED_SAS: '3', SED_SAS_META: '3' }),
  evo(4, { SED_TIPO: 'Sin sedación', SED_SAS: '', SED_SAS_META: '' }),
];
for (let d = 5; d <= 8; d++) {
  historia.push(evo(d, {
    SED_TIPO: 'Fuera de escalón', SED_SAS: '6', SED_SAS_META: '4',
    SED_VIGIL: 'TRUE', SED_FARMACOS: '["Precedex"]',
  }));
}
const f1 = ficha(historia);
/* 🔴 18-sep-2026 · QUÉ DÍA SE SUSPENDIÓ, lo zanjó Diego y no es el día en que
   el paciente despierta: «el día de suspensión de sedación es el día de retiro de
   fármacos, cuando efectivamente le suspenden. Sería el día que el colega no
   marque medicamentos clasificados con efecto sedante y en el turno anterior
   sí estaban marcados».
   Son DOS preguntas distintas y cada una tiene su fuente:
     · ¿Está profundamente sedado HOY?  → lo dice el SAS (1-2 sí, 3 o más no).
     · ¿Qué día se le suspendió?        → el día que se retiraron los fármacos.
   Confundirlas fue mi error: con el escalón 2 todavía puesto y SAS 3, la fecha
   se había adelantado un día a un paciente que seguía con la sedación corriendo.
   🪤 Y la fecha SÍ se borra si vuelve a sedación PROFUNDA —ahí manda el SAS—:
   por eso el precedex de la agitación, con SAS 6, no la toca. Ese era el caso
   de agosto que dio origen a todo esto. */
eq('★★ la fecha es la del RETIRO de los fármacos, no la del despertar', f1.sedSusp, '04-08');
eq('la entrega muestra el SAS ACTUAL', f1.sas, '6');
eq('…y la meta al lado', f1.sasMeta, '4');
eq('…y las filas ya escritas conservan su marca SED_VIGIL', f1.sedVigil, true);
eq('…y qué sedante tiene puesto', (f1.sedFarmacos || []).join(','), 'Precedex');

// ★ EL PAR QUE LO DEMUESTRA: el día 3 despierta a SAS 3 pero el escalón 2
// sigue corriendo. Con SAS 2 ese mismo día la fecha NO se mueve: en los dos
// casos la suspensión es el 04, el día que se retiran los fármacos.
const sigueProfundo = historia.map(e => e.FECHA === '2026-08-03'
  ? Object.assign({}, e, { SED_SAS: '2', SED_SAS_META: '2' }) : e);
eq('★ despertar con la sedación puesta no adelanta la fecha',
  ficha(sigueProfundo).sedSusp, '04-08');

// ★ CONTROL NEGATIVO: el mismo episodio, pero el precedex del 05 viene con un
// SAS 2 —volvió a estar profundo—. Ahí la fecha SÍ tiene que borrarse; si no,
// la guardia estaría pasando por no mirar nada.
// 🪤 Antes este control se hacía BORRANDO la casilla SED_VIGIL, y desde que
// la casilla no decide nada eso ya no cambiaba el resultado: el control
// pasaba a estar apagado sin avisar.
const control = historia.map(e => e.SED_SAS === '6'
  ? Object.assign({}, e, { SED_SAS: '2', SED_SAS_META: '2' }) : e);
eq('★ control: si el día 5 vuelve a SAS 2, la fecha SÍ se borra',
  ficha(control).sedSusp, '');

// Y el caso de siempre: nunca volvió a sedarse ⇒ la fecha se mantiene.
eq('sin volver a sedar, la fecha se mantiene',
  ficha(historia.slice(0, 4)).sedSusp, '04-08');

// ★★ Un episodio que pasa de profunda DIRECTO a vigil, sin «Sin sedación» de
// por medio: NUNCA se retiraron los fármacos, así que no hay suspensión que
// anotar. Le cambiaron la sedación, no se la sacaron. 🪤 Antes esto daba el
// 03-08 —el día que despertó— y era una fecha inventada.
const directo = [
  evo(1, { SED_TIPO: 'Escalón 3', SED_SAS: '2' }),
  evo(2, { SED_TIPO: 'Escalón 3', SED_SAS: '2' }),
  evo(3, { SED_TIPO: 'Fuera de escalón', SED_SAS: '5', SED_SAS_META: '4', SED_VIGIL: 'TRUE' }),
];
eq('★★ de profunda a vigil SIN retirar fármacos: no hay suspensión',
  ficha(directo).sedSusp, '');

// Sin ningún registro de sedación no se inventa una fecha.
eq('sin dato de sedación, no se inventa fecha',
  ficha([evo(1, {}), evo(2, {})]).sedSusp, '');

console.log(fails.length ? `\n❌ ${fails.length} FALLOS` : '\n✅ TODO OK');
process.exit(fails.length ? 1 : 0);
