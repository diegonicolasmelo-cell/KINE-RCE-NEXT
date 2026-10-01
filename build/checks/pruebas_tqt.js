// pruebas_tqt.js — «Pruebas de traqueostomía»: un bloque propio, SOLO con
// traqueostomía (Diego, 1-oct-2026).
//
// LO QUE PIDIÓ: «las pruebas son presión mantenida de la vía aérea y Blue Dye
// Test, porque la tolerancia no es una prueba: describe cómo está aguantando el
// uso, pero no es un test. La presión mantenida sí es un test; el Blue Dye Test,
// su nombre lo dice, es una prueba. Sería otro bloque que aparecería solamente
// en caso de que el paciente esté traqueostomizado.»
//
// 🔵 LAS DOS YA EXISTÍAN, en el cajón equivocado: dentro de «Tos y deglución».
// La presión mantenida ya aparecía solo con TQT; el BDT se ofrecía siempre,
// incluso con un paciente sin cánula, donde la prueba no se puede hacer.
//
// 🪤 UN EVENTO DECLARADO MANTIENE SU BLOQUE A LA VISTA. La presión mantenida es
// justamente de las pruebas que se hacen ANTES de decanular. Si el bloque
// dependiera solo de la vía aérea final, declarar la decanulación (que deja al
// paciente en natural) escondería las pruebas que se acaban de anotar. Es la
// misma regla que `updateVAUI` ya aplica a extubación y decanulación.
//
// 🪤 La válvula de fonación y su tolerancia NO entran: es USO, no una prueba.
// Siguen donde estaban (en lo que se hizo durante el turno).
//
// 🪤 Reloj congelado; las evaluaciones viven tras «Se evaluó este turno» (cEgr).
//
// Uso: node build/checks/pruebas_tqt.js
const path = require('path');
const { chromium } = require('playwright-core');
const v2 = path.join(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 1500 }, locale: 'es-CL' });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    const FIJA = new Date(2026, 7, 12, 10, 0, 0).getTime(), RD = Date;
    function FD(...a) { if (!new.target) return new RD(FIJA).toString(); return a.length ? new RD(...a) : new RD(FIJA); }
    FD.prototype = RD.prototype; FD.now = () => FIJA; FD.UTC = RD.UTC; FD.parse = RD.parse;
    window.Date = FD;
  });
  await p.addInitScript(() => {
    window._ll = []; window.__evo = null;
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
      api(a, d) { window._ll.push({ a, d }); let data = null;
        if (a === 'GET_CONFIG_UI') data = { NUM_CAMAS: 12, BANNERS: {} };
        else if (a === 'GET_EVO_TURNO') data = { actual: window.__evo, previa: null, pronoAbierto: '' };
        setTimeout(() => ok({ ok: true, data }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.join(v2, 'index.html'));
  await p.waitForTimeout(800);

  const abrir = (va, sop) => p.evaluate(x => {
    window.__evo = null; $('kf').reset();
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', EDAD: 61, SEXO: 'M',
            VIA_AEREA: x.va, SOPORTE: x.sop, FECHA_INGRESO: '2026-08-07' }];
    window.recargarSilencioso = () => {};
    $('gDate').value = '2026-08-12'; SHIFT = 'Dia';
    renderGrid(); abrirPanel('3', false, false);
  }, { va, sop }).then(() => p.waitForTimeout(800))
    .then(() => p.evaluate(x => { window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
      $('fVA').value = x.va; cascadeVA(); $('fSop').value = x.sop; cascadeSop(); updateVAUI();
      const c = $('cEgr'); c.checked = true; hEgr(); pasoIr(3); }, { va, sop }))
    .then(() => p.waitForTimeout(350));
  const ver = sel => p.evaluate(s => { const e = document.querySelector(s);
    if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0);
  }, sel);
  const abrirBloque = () => p.evaluate(() => { const d = $('dxTqt'); if (d) d.open = true; });

  console.log('\n1 · 🔴 Con traqueostomía, el bloque está y trae las dos pruebas');
  await abrir('TQT', 'Oxigenoterapia/OAF');
  await abrirBloque();
  si('★★ el bloque «Pruebas de traqueostomía» se ve', await ver('#dxTqt'));
  si('★★ …y se llama así', await p.evaluate(() => /Pruebas de traqueostom[ií]a/.test($('dxTqt')?.textContent || '')));
  si('★★ vive dentro de la tarjeta de Evaluaciones', await p.evaluate(() => !!$('dxTqt')?.closest('#dEgr')));
  si('★★ trae la presión mantenida', await ver('#fPVA'));
  si('★★ …con su semáforo', await ver('#pttChip'));
  si('★★ trae el test de azul', await ver('#btnBdtNeg'));
  si('★★ …los dos botones', await ver('#btnBdtPos'));

  console.log('\n2 · 🔴 Sin traqueostomía, NINGUNA de las dos se ofrece');
  await abrir('TOT', 'VM');
  no('★★ con tubo, el bloque no está', await ver('#dxTqt'));
  no('★★ …ni el test de azul (no hay cánula por donde aspirar el azul)', await ver('#btnBdtNeg'));
  await abrir('Natural', 'Oxigenoterapia/OAF');
  no('★★ con vía aérea natural tampoco', await ver('#dxTqt'));

  console.log('\n3 · «Tos y deglución» ya no las lleva');
  await abrir('TQT', 'Oxigenoterapia/OAF');
  eq('★★ el BDT no está dentro de «Tos y deglución»', await p.evaluate(() => !!$('dxTos')?.querySelector('#dBdt')), false);
  eq('★★ la presión mantenida tampoco', await p.evaluate(() => !!$('dxTos')?.querySelector('#fPVA')), false);
  si('★ el FEM y la deglución siguen donde estaban', await p.evaluate(() => !!$('dxTos')?.querySelector('#fFEM') && !!$('dxTos')?.querySelector('#fDeglPres')));

  console.log('\n4 · 🔴 Declarar la decanulación mantiene las pruebas a la vista');
  await abrir('TQT', 'Oxigenoterapia/OAF');
  await abrirBloque();
  await p.evaluate(() => { $('fPVA').value = '8'; interpPTT(); });
  await p.evaluate(() => { $('fVA').value = 'Natural'; cascadeVA(); updateVAUI(); });
  no('control · con la vía aérea ya natural y sin evento, el bloque se va', await ver('#dxTqt'));
  await p.evaluate(() => { $('fVA').value = 'TQT'; cascadeVA(); updateVAUI(); });
  await p.evaluate(() => { const c = $('cDecanOcurrio'); if (c) { c.checked = true; hDecan(); } $('fVA').value = 'Natural'; cascadeVA(); updateVAUI(); });
  si('★★ con la decanulación declarada, el bloque sigue a la vista', await ver('#dxTqt'));
  eq('★★ …y la presión que se acababa de anotar sigue ahí', await p.evaluate(() => v('fPVA')), '8');

  console.log('\n5 · El semáforo de la presión mantenida sigue andando');
  await abrir('TQT', 'Oxigenoterapia/OAF');
  const chip = x => p.evaluate(n => { $('fPVA').value = n; interpPTT(); return $('pttChip').className.replace('disp-chip ', ''); }, x);
  eq('★ 8 cmH₂O → permeable', await chip('8'), 'disp-ok');
  eq('★ 11 cmH₂O → límite', await chip('11'), 'disp-warn');
  eq('★ 15 cmH₂O → sugiere obstrucción', await chip('15'), 'disp-bad');

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ pruebas_tqt: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
