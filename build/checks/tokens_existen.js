// tokens_existen.js — Ningún var(--token) apunta a un token que no existe
// (16-sep-2026).
//
// EL BUG QUE LA TRAJO. Al armar la barra de los tres pasos escribí
// `background:var(--acc)`. Ese token NO existe en este proyecto —el de acento
// se llama `--primary`—, así que el fondo cayó a transparente y el número del
// paso quedó BLANCO SOBRE BLANCO. En el escritorio se notaba poco; en el
// teléfono, donde el rótulo se esconde y solo queda el número, el paso en el
// que estabas se veía como un hueco vacío.
//
// 🔑 Un token mal escrito NO da error: CSS se lo traga y pinta con el valor
// inicial de la propiedad. No hay consola roja, no hay nada roto que mirar —
// solo un color que no aparece. Por eso esto se caza leyendo, no mirando.
//
// Un `var(--x, algo)` con respaldo escrito es seguro y no se acusa: ahí el
// autor dijo qué hacer si el token falta.
//
// Uso: node build/checks/tokens_existen.js
const path = require('path');
const fs = require('fs');
const V2 = path.resolve(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };

const html = fs.readFileSync(path.join(V2, 'index.html'), 'utf8');

// Solo el CSS: dentro de <script> hay cadenas que hablan de variables sin
// definirlas, y no son reglas de estilo.
const estilos = (html.match(/<style[\s\S]*?<\/style>/g) || []).join('\n');
eq('se leyó el CSS de la pantalla', estilos.length > 1000, true);

// Definidos: en cualquier parte (:root, html[data-piel], media queries, y
// también en atributos style="--x:…" de la propia pantalla).
const definidos = new Set();
(estilos.match(/(--[a-zA-Z0-9-]+)\s*:/g) || []).forEach(m => definidos.add(m.replace(/\s*:$/, '')));
(html.match(/style="[^"]*?(--[a-zA-Z0-9-]+)\s*:/g) || []).forEach(m => {
  const t = m.match(/(--[a-zA-Z0-9-]+)\s*:$/); if (t) definidos.add(t[1]);
});
// 🪤 …y los que define el JAVASCRIPT en vivo: `--own-bar` se pinta con
// setProperty al armar cada tarjeta de cama, y es tan real como los del
// :root. Sin esta línea la guardia acusaba un token que sí existe.
(html.match(/setProperty\(\s*['"](--[a-zA-Z0-9-]+)['"]/g) || []).forEach(m => {
  const t = m.match(/['"](--[a-zA-Z0-9-]+)['"]$/); if (t) definidos.add(t[1]);
});
eq('se encontraron los tokens del proyecto', definidos.size > 20, true);

// Usados SIN respaldo: var(--x) a secas. Con coma hay respaldo y no se acusa.
const usados = new Map();   // token → cuántas veces
const lineas = estilos.split('\n');
lineas.forEach((ln, i) => {
  const re = /var\(\s*(--[a-zA-Z0-9-]+)\s*\)/g;
  let m;
  while ((m = re.exec(ln)) !== null) {
    if (!usados.has(m[1])) usados.set(m[1], i + 1);
  }
});
eq('se encontraron usos de tokens', usados.size > 10, true);

const huerfanos = Array.from(usados.keys()).filter(t => !definidos.has(t));
eq('★★ tokens usados que NO están definidos en ninguna parte',
   huerfanos.join(', '), '');
if (huerfanos.length) {
  console.log('   (un token inexistente no da error: CSS lo ignora y el color\n' +
              '    simplemente no aparece — texto invisible, fondo transparente)');
}

console.log(fails.length ? '\n❌ ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
process.exit(fails.length ? 1 : 0);
