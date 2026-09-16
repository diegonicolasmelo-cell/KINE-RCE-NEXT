// id_no_pisa_funcion.js — Dentro del formulario, un id NO puede llamarse igual
// que una función (16-sep-2026).
//
// EL BUG QUE LA TRAJO. El botón del paso 2 quedó con `id="pasoEvalNada"` y la
// función que lo atiende se llamó igual. Al tocarlo: «pasoEvalNada is not a
// function». No falla al cargar la página — falla solo al APRETAR el botón, y
// en una batería que no lo apriete nunca, jamás aparece.
//
// 🔑 EL MECANISMO, medido y no deducido. Un handler inline (`onclick="…"`) no
// se evalúa en el ámbito global: su cadena pasa primero por el elemento,
// DESPUÉS POR SU FORMULARIO, después por el documento y recién ahí por el
// global. Y un `<form>` expone sus controles por id como si fueran
// propiedades suyas. Así que dentro de `#kf`, `pasoEvalNada` resolvía al BOTÓN
// —un objeto— y no a la función.
//
// Por eso la guardia mira SOLO los ids dentro del formulario. Las funciones
// que comparten nombre con un id de FUERA del formulario no chocan: ahí gana
// la declaración de función. Al escribir esto había cinco de esas (sugMias,
// plantModNota, plantPreview, plantModRetirar, stkResumen) y se comprobó una
// por una en el navegador que resuelven a `function`. Acusarlas sería ruido.
//
// Uso: node build/checks/id_no_pisa_funcion.js
const path = require('path');
const { chromium } = require('playwright-core');
const V2 = path.resolve(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  await p.addInitScript(() => {
    window.google = { script: { run: { withSuccessHandler(f) { return { withFailureHandler() { return {
      api(a) { setTimeout(() => f({ ok: true, data: a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.join(V2, 'index.html'));
  await p.waitForTimeout(900);

  const r = await p.evaluate(() => {
    const kf = document.getElementById('kf');
    if (!kf) return { sinForm: true };
    const ids = [];
    kf.querySelectorAll('[id]').forEach(e => ids.push(e.id));
    // Choca si el nombre es una función global Y el formulario lo expone:
    // en un handler inline el formulario gana.
    const choques = ids.filter(n => typeof window[n] === 'function' && kf[n] !== undefined);
    return { ids: ids.length, choques: choques };
  });

  si('se encontró el formulario del panel', !r.sinForm);
  si('…con sus controles', r.ids > 100);
  // La demostración de que el mecanismo es real, no una teoría: el propio
  // formulario expone un control suyo por id.
  si('★ el formulario EXPONE sus controles por id (por eso pisa)',
     await p.evaluate(() => typeof document.getElementById('kf').pasoEvalNada === 'object'));
  eq('★★ ids del formulario que pisan una función (tienen que ser cero)',
     (r.choques || []).join(', '), '');
  if ((r.choques || []).length) {
    console.log('   Al tocar ese control, el onclick recibe el ELEMENTO en vez de\n' +
                '   la función: «… is not a function». Renombra la función, no el id.');
  }

  await b.close();
  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
