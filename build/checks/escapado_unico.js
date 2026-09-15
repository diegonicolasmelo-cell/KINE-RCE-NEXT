// escapado_unico.js — 🔴 UN SOLO ESCAPADO EN TODA LA INTERFAZ (15-sep-2026).
//
// DE DÓNDE SALE. El plan maestro lo pone entre los principios NO negociables
// (§2.3): «todo valor de paciente se inserta con escapeHtml() o vía nodos DOM.
// Cero innerHTML crudo con datos de usuario», y pide una capa `core/escape.js`
// (§9.1). Al importar la base 7.04 en NEXT se midió: `escapeHtml` no existía y
// había SEIS funciones locales llamadas `esc`, ninguna igual a otra —una
// escapaba & < " pero no > ni ', otra solo ", otra & < > pero no ", una
// escapaba metacaracteres de expresión regular y dos citaban campos de CSV—.
// Peor que la cobertura desigual era el nombre compartido: mover una línea de
// un bloque a otro parecía seguro y podía dejar el dato sin escapar. Un `<` en
// un diagnóstico escrito a mano basta para romper la tarjeta.
//
// QUÉ EXIGE
//   1. Que `escapeHtml` exista y escape los CINCO caracteres (& < > " '), no
//      tres: el mismo valor tiene que servir en texto y en atributo.
//   2. Que `escapeJs` resuelva el caso doble (cadena JS dentro de un atributo),
//      donde escapar HTML solo no alcanza porque el navegador decodifica la
//      entidad ANTES de leer el JavaScript.
//   3. Que `hEsc` (el tag de plantilla) escape cada valor interpolado.
//   4. Que NADIE vuelva a definir un escapador de HTML local. Cualquier
//      función que produzca entidades HTML y no sea `escapeHtml` es una
//      regresión, aunque «funcione»: es la sexta `esc` volviendo a nacer.
//   5. Que los que NO escapan HTML no se llamen `esc` (hoy `escRe` y `escCsv`).
//
// Uso: node build/checks/escapado_unico.js
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'v2', 'index.html'), 'utf8');
const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || !detalle ? '' : ' — ' + detalle));
  if (!cond) fails.push(l);
};

/* ── 1 · Las tres funciones del núcleo existen y se pueden ejecutar ───────── */
function extraer(nombre) {
  // Se saca el texto real del archivo y se ejecuta: probar la expectativa
  // contra una copia escrita en la guardia no probaría nada.
  const re = new RegExp('^const ' + nombre + '\\s*=([\\s\\S]*?);\\s*$', 'm');
  const m = re.exec(SRC);
  return m ? m[0] : null;
}
const NUCLEO = ['_ESC_HTML', 'escapeHtml', 'escapeJs', 'hEsc'];
const trozos = [];
for (const n of NUCLEO) {
  const t = extraer(n);
  si('existe ' + n + ' en v2/index.html', !!t, 'no se encontró su definición');
  if (t) trozos.push(t);
}
if (fails.length) { console.log('\n❌ ' + fails.length + ' FALLOS'); process.exit(1); }

let escapeHtml, escapeJs, hEsc;
try {
  ({ escapeHtml, escapeJs, hEsc } = (0, eval)('(function(){' + trozos.join('\n') + '\nreturn {escapeHtml, escapeJs, hEsc};})()'));
} catch (e) {
  si('el núcleo de escapado es JavaScript válido', false, e.message);
  console.log('\n❌ 1 FALLOS'); process.exit(1);
}

/* ── 2 · escapeHtml escapa los cinco, y nada más ──────────────────────────── */
si('escapeHtml · & < > " \' → entidades',
  escapeHtml(`&<>"'`) === '&amp;&lt;&gt;&quot;&#39;', 'dio: ' + escapeHtml(`&<>"'`));
si('escapeHtml · un diagnóstico con < no rompe el marcado',
  escapeHtml('PaFi <100') === 'PaFi &lt;100', 'dio: ' + escapeHtml('PaFi <100'));
si('escapeHtml · null y undefined dan cadena vacía, no "null"',
  escapeHtml(null) === '' && escapeHtml(undefined) === '', 'dio: ' + JSON.stringify([escapeHtml(null), escapeHtml(undefined)]));
si('escapeHtml · el 0 se conserva (?? y no ||)', escapeHtml(0) === '0', 'dio: ' + JSON.stringify(escapeHtml(0)));
si('escapeHtml · no toca el texto limpio',
  escapeHtml('Neumonía grave, 64a') === 'Neumonía grave, 64a');

/* ── 3 · escapeJs sobrevive al caso doble ─────────────────────────────────── */
// El navegador decodifica las entidades del atributo y RECIÉN ahí lee el JS.
const decodificarHtml = t => t.replace(/&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
for (const valor of ["O'Brien", 'comillas "dobles"', 'barra \\ invertida', "');alert(1);//"]) {
  const atributo = `onclick="f('${escapeJs(valor)}')"`;
  const jsQueLeeElNavegador = decodificarHtml(/onclick="(.*)"/.exec(atributo)[1]);
  let recibido = null;
  try { (0, eval)('(function(f){' + jsQueLeeElNavegador + '})')(x => { recibido = x; }); }
  catch (e) { recibido = 'ERROR: ' + e.message; }
  si('escapeJs · atributo onclick con ' + JSON.stringify(valor), recibido === valor, 'llegó: ' + JSON.stringify(recibido));
}

/* ── 4 · El tag de plantilla escapa lo interpolado ────────────────────────── */
const nombre = 'Pérez <script>';
si('hEsc · escapa el valor interpolado',
  hEsc`<b>${nombre}</b>` === '<b>Pérez &lt;script&gt;</b>', 'dio: ' + hEsc`<b>${nombre}</b>`);
si('hEsc · no toca el marcado fijo', hEsc`<i>x</i>` === '<i>x</i>');

/* ── 5 · Nadie vuelve a definir un escapador de HTML local ────────────────── */
// Cualquier función que fabrique entidades HTML y no sea la única: regresión.
const ENTIDAD = /&(amp|lt|gt|quot|#39);/;
const NUCLEO_OK = new Set(['_ESC_HTML', 'escapeHtml', 'escapeJs', 'hEsc']);
// Solo cuentan las FUNCIONES: en este código `esc` también es abreviatura de
// «escala» y hay variables que llevan una entidad en un texto fijo. Se exige
// que el cuerpo EMPIECE por una función (flecha o `function`), que fabrique
// entidades y que use replace(): eso es un escapador, no un dato.
const ES_FUNCION = /^(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/;
const sospechosas = [];
for (const m of SRC.matchAll(/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^\n]*)$/gm)) {
  const [, nom, crudo] = m;
  const cuerpo = crudo.trim();
  if (NUCLEO_OK.has(nom)) continue;
  if (ES_FUNCION.test(cuerpo) && ENTIDAD.test(cuerpo) && /replace\s*\(/.test(cuerpo)) {
    sospechosas.push(nom + ' → ' + cuerpo.slice(0, 70));
  }
}
si('ningún escapador de HTML local compite con escapeHtml',
  sospechosas.length === 0, sospechosas.join(' · '));

/* ── 6 · Los que no escapan HTML no se llaman `esc` ───────────────────────── */
// Ojo: en este código `esc` también se usa como abreviatura de «escala» para
// guardar datos (const esc=_EP_ESCALAS.find(...)). Eso no es un escapador y no
// se toca: lo que se prohíbe es una FUNCIÓN llamada `esc` que no sea la única.
const escFunciones = [...SRC.matchAll(/^\s*(?:const|let|var)\s+esc\s*=\s*([^\n]*)$/gm)]
  .map(m => m[1].trim())
  .filter(c => ES_FUNCION.test(c) || /^escapeHtml\s*;?$/.test(c));
const mentirosas = escFunciones.filter(c => !/^escapeHtml\s*;?$/.test(c));
si('las ' + escFunciones.length + ' funciones locales `esc` son alias de escapeHtml',
  mentirosas.length === 0, mentirosas.join(' · '));

console.log(fails.length ? '\n❌ ' + fails.length + ' FALLOS' : '\n✅ TODO OK');
process.exit(fails.length ? 1 : 0);
