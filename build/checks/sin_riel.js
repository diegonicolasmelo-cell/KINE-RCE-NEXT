// sin_riel.js — El índice lateral de secciones salió (17-sep-2026).
//
// POR QUÉ EXISTÍA. El panel era un muro de 225 campos en una sola pantalla, y
// el riel era su índice: la única forma de saber qué había más abajo y saltar
// hasta ahí.
//
// POR QUÉ SALE. El muro ya no existe: el camino de cuatro pasos lo partió, y
// cada paso tiene sus tarjetas con su encabezado a la vista. Diego, mirando la
// pantalla armada: «siento que la barra lateral ya no aplicaría en la sección
// turno». Y en los otros pasos era peor que inútil — en el de prevención
// listaba UNA entrada, un índice de un solo ítem.
//
// LO QUE SE GANA: 196 px de ancho que se lleva el formulario, que es lo que de
// verdad se está llenando. En un portátil de 1366 del hospital eso es una
// columna entera de respiro, y va en la misma dirección que todo lo demás de
// esta revisión: menos ruido, menos cosas que mirar.
//
// 🔴 LO QUE NO SE PIERDE, y por eso esta guardia lo exige: en el CELULAR el
// acordeón sigue diciendo qué hay dentro de cada sección plegada, con su ✓ y su
// resumen. Ahí sí hace falta, porque las secciones están cerradas y no se ven.
// El riel nunca se mostró en el teléfono (solo sobre 740 px), así que esto no
// le quita nada a la ronda.

const fs = require('fs');
const path = require('path');
const v2 = path.join(__dirname, '..', '..', 'v2');
const idx = fs.readFileSync(path.join(v2, 'index.html'), 'utf8');
const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!okk) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); }
};
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

console.log('\n1 · El riel no está');
no('★ no queda el elemento del riel', /id="spRiel"/.test(idx));
no('   …ni su hoja de estilo', /#spRiel\s*\{/.test(idx));

const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window._ll = [];
    window.google = { script: { run: { withSuccessHandler(okF) { return { withFailureHandler() { return {
      api(a, d) { window._ll.push({ a, d }); setTimeout(() => okF({ ok: true, data: (a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null) }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.resolve(v2, 'index.html'));
  await p.waitForTimeout(600);

  const montar = async (page, paso) => page.evaluate(async (paso) => {
    $('kf').reset(); $('cBed').value = '7';
    $('gDate').value = '2026-08-10';   // 🪤 fecha inventada
    DB = [{ ID_CAMA: '7', OCUPADA: true, PATIENT_ID: 'p7', VIA_AEREA: 'TOT', SOPORTE: 'VM' }];
    renderGrid(); abrirPanel('7', false, false);
    await new Promise(r => setTimeout(r, 300));
    $('fVA').value = 'TOT'; cascadeVA();
    $('fSop').value = 'VM'; cascadeSop();
    if (typeof pasoIr === 'function') pasoIr(paso);
    await new Promise(r => setTimeout(r, 200));
  }, paso);

  console.log('\n2 · ★ El ancho se lo quedó el formulario');
  await montar(p, 2);
  const A = await p.evaluate(() => {
    const cont = document.querySelector('#sp .pcontent');
    const form = document.getElementById('kf');
    return { riel: !!document.getElementById('spRiel'),
             anchoForm: form ? Math.round(form.getBoundingClientRect().width) : 0,
             anchoCont: cont ? Math.round(cont.getBoundingClientRect().width) : 0,
             // 🪤 No se mide «ocupa todo el ancho»: el formulario tiene un
             // max-width DELIBERADO para compactarse al centro en pantallas
             // grandes, que no tiene nada que ver con el riel. Lo que cambió es
             // que ya no hay una columna reservada a su lado.
             hermanos: cont ? [...cont.children].map(x => x.tagName).join(',') : '' };
  });
  no('★ en el turno ya no hay barra lateral', A.riel);
  eq('★★ …y el formulario es lo único que hay en el panel', A.hermanos, 'FORM');
  si('★ el formulario se llevó el ancho (más de 1200 px en una pantalla de 1400)',
     A.anchoForm > 1200);

  console.log('\n3 · 🔴 En el celular el acordeón sigue diciendo qué hay dentro');
  const m = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  m.on('pageerror', e => errs.push('movil: ' + e.message));
  await m.addInitScript(() => {
    window._ll = [];
    window.google = { script: { run: { withSuccessHandler(okF) { return { withFailureHandler() { return {
      api(a, d) { setTimeout(() => okF({ ok: true, data: (a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null) }), 5); }
    }; } }; } } } };
  });
  await m.goto('file://' + path.resolve(v2, 'index.html'));
  await m.waitForTimeout(600);
  await montar(m, 2);
  const M = await m.evaluate(async () => {
    $('fSed').value = 'Escalón 2'; if (typeof hSed === 'function') hSed();
    if (typeof mAcordeonInit === 'function') mAcordeonInit();
    if (typeof rielRender === 'function') rielRender();
    await new Promise(r => setTimeout(r, 150));
    const hdrs = [...document.querySelectorAll('#kf .fcard .fcard-hdr .mres')];
    return { conResumen: hdrs.filter(h => (h.textContent || '').trim().length > 0).length,
             conEstado: document.querySelectorAll('#kf .fcard .fcard-hdr .mst').length };
  });
  si('🔴 las secciones plegadas siguen diciendo qué llevan dentro', M.conResumen > 0);
  si('🔴 …y su estado (✓ / — / !)', M.conEstado > 0);

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ sin_riel: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ sin_riel: el índice salió y el celular no perdió nada.');
})();
