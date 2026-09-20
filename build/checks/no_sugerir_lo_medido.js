// no_sugerir_lo_medido.js — Lo que se MIDE no se sugiere, y un campo que nadie
// lee no se queda en el formulario (20-sep-2026).
//
// LA REGLA ES DE DIEGO, y nació con la fijación del TOT (19-sep):
//   «La fijación ojalá no sugiriera nada, ya que la gente no anota; si sugiere
//    22, no anotan nada.»
// El daño no es que se guarde el 22: es que el colega VE un número gris, lo lee
// como si ya estuviera anotado, y el campo queda vacío. La sugerencia no rellena
// el dato — impide que alguien lo escriba.
//
// 🔴 PERO NO TODO PLACEHOLDER ES EL MISMO PROBLEMA, y por eso esta guardia
// lleva una LISTA y no una regla automática:
//   · lo que se MIDE en el paciente (fijación del TOT, ciclos de RCP) no se
//     sugiere: el número tiene que salir de mirar;
//   · un FORMATO de ejemplo (el RUT «12.345.678-5») sí ayuda — enseña la forma,
//     no afirma un valor;
//   · los PARÁMETROS de un equipo (frecuencia del EMS, carga del IMT) son
//     configuración que se repite, y ahí sugerir el habitual ahorra trabajo.
// La lista crece cuando Diego decide que un campo más entra. No se automatiza:
// barrer todos los placeholders decidiría por él sobre quince campos donde la
// respuesta no es obvia — los gases arteriales, entre otros.
//
// Y LO SEGUNDO: los campos MUERTOS se van. Auscultación tenía dos escondidos
// —calidad y localización del murmullo— declarados y nada más: no se leían, no
// se escribían, no iban a ninguna columna. Restos de cuando el murmullo se
// registraba en tres partes. Es el mismo caso del `fTOTfij` fantasma que se
// limpió en septiembre: un campo que existe sin hacer nada es una trampa para
// el que venga a leer esto en un año.

const fs = require('fs');
const path = require('path');
const V2 = path.join(__dirname, '..', '..', 'v2');
const idx = fs.readFileSync(path.join(V2, 'index.html'), 'utf8');
const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!okk) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); }
};
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

/* Campos donde Diego decidió que NO se sugiere nada, con la razón al lado. */
const SIN_SUGERENCIA = [
  ['fTOTcm',     'fijación del TOT — «si sugiere 22, no anotan nada» (19-sep)'],
  ['fRCPciclos', 'ciclos de RCP — mismo caso, y acá el número no es un detalle (20-sep)'],
];

console.log('\n1 · 🔴 Lo que se mide nace en blanco');
SIN_SUGERENCIA.forEach(([id, razon]) => {
  const tag = (idx.match(new RegExp('<input[^>]*id="' + id + '"[^>]*>')) || [''])[0];
  si('   el campo ' + id + ' existe', tag.length > 0);
  no('★★ ' + id + ' no sugiere nada · ' + razon, /placeholder=/.test(tag));
});

console.log('\n2 · Lo que NO es una medición puede seguir sugiriendo');
const conservan = [
  ['fRut',     'es un formato de ejemplo, no un valor'],
  ['fEMSfreq', 'es un parámetro del equipo, no algo que se mida en el paciente'],
];
conservan.forEach(([id, razon]) => {
  const tag = (idx.match(new RegExp('<input[^>]*id="' + id + '"[^>]*>')) || [''])[0];
  si('★ ' + id + ' conserva su sugerencia · ' + razon, /placeholder=/.test(tag));
});

console.log('\n3 · 🪤 Los campos muertos de auscultación se fueron');
['fMPCalidad', 'fMPLoc'].forEach(id => {
  no('★★ ' + id + ' ya no está en el formulario', new RegExp('id="' + id + '"').test(idx));
  no('   …ni lo nombra nadie', new RegExp("'" + id + "'").test(idx));
});
console.log('   (no se leían, no se escribían, no iban a ninguna columna)');

console.log('\n4 · Y lo que SÍ registra la auscultación sigue en pie');
si('★ el murmullo pulmonar', /id="fMPVal"/.test(idx));
si('★ los ruidos agregados y su localización', /id="fRuidosVal"/.test(idx) && /id="fRuidosLoc"/.test(idx));

if (fails.length) {
  console.log('\n❌ no_sugerir_lo_medido: ' + fails.length + ' fallo(s):');
  fails.forEach(f => console.log('   · ' + f));
  process.exit(1);
}
console.log('\n✅ no_sugerir_lo_medido: lo medido nace en blanco y lo muerto se fue.');
