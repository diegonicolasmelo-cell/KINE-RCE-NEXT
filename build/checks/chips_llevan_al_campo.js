// chips_llevan_al_campo.js — Tocar un chip de «Lo que este episodio lleva medido» abre SU campo,
// de día y de noche, aunque la KTM no esté «realizada» (2-oct-2026).
//
// LO QUE ENCONTRÓ LA REVISIÓN A MÁXIMA EXIGENCIA, y al medirlo resultó más ancho de lo que decía:
//   · Desde la tanda F (evaluaciones en «cajones») los campos viven DENTRO de una familia, y la familia
//     está cerrada hasta que se toca su cajón. `pasoEvalMedir` hacía scroll y foco a un campo que no se
//     veía: tocar el chip de PIM, PEM, FEmáx, ecografía, deglución o dinamometría no hacía NADA.
//   · El IMS tenía además otro problema: su control vivía dentro del panel «Realizada» de la KTM
//     (`#dKTMr`), que está oculto cuando la KTM no está «realizada» —y de noche parte neutra—. Medir el
//     IMS de noche (las evaluaciones sí se hacen de noche) obligaba a declarar una KTM que no se hizo.
//
// 🔴 LA REGLA QUE QUEDA
//   · Cada chip que NO abre un modal lleva a un campo que SE VE al tocarlo: abre la familia que lo
//     contiene y, si hace falta, cambia de paso.
//   · El IMS es una evaluación FUNCIONAL: su control vive en la familia «Funcionales» de Evaluaciones
//     (con FSS-ICU y CPAx, como dice el rótulo de su cajón), NO dentro de la tarjeta de KTM. Así no
//     depende del estado de la KTM ni de que la tarjeta esté a la vista (AET IIIC, BNM).
//
// 🪤 «Cada cosa se mide donde vive»; reloj congelado (fecha inventada, turno forzado).
//
// Uso: node build/checks/chips_llevan_al_campo.js
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
  const p = await b.newPage({ viewport: { width: 1200, height: 1500 }, locale: 'es-CL' });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window._ll = [];
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
      api(a, d) { window._ll.push({ a, d }); let data = null; if (a === 'GET_CONFIG_UI') data = { NUM_CAMAS: 12, BANNERS: {} };
        else if (a === 'GET_EVO_TURNO') data = { actual: null, previa: null, pronoAbierto: '' };
        setTimeout(() => ok({ ok: true, data }), 5); } }; } }; } } } };
  });
  await p.goto('file://' + path.join(v2, 'index.html'));
  await p.waitForTimeout(800);

  const abrir = turno => p.evaluate(async x => {
    $('kf').reset(); $('gDate').value = '2026-08-12'; SHIFT = x.turno;
    window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', EDAD: 61, SEXO: 'M', VIA_AEREA: 'TQT', SOPORTE: 'VM',
      FECHA_INGRESO: '2026-08-05', TS_INGRESO: '2026-08-05 23:00:00', FECHA_INICIO_VA: '2026-08-08', TS_INICIO_VA: '2026-08-08 10:00:00',
      FECHA_INICIO_SOPORTE: '2026-08-08', TS_INICIO_SOPORTE: '2026-08-08 10:00:00' }];
    window.recargarSilencioso = () => {}; renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 800));
    if (typeof aplicarGatesEval === 'function') aplicarGatesEval();
    pasoIr(3); await new Promise(r => setTimeout(r, 150));
  }, { turno });
  const vis = id => p.evaluate(i => { const e = document.getElementById(i); if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    for (let a = e; a && a !== document.body; a = a.parentElement) { if (getComputedStyle(a).display === 'none') return false; }
    return cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0); }, id);
  /* los chips que NO abren un modal: la lista sale del código, no se enumera a mano */
  const chips = () => p.evaluate(() => _PASO_SERIE.filter(e => !e.modal).map(e => ({ k: e.k, campo: e.campo })));
  const tocar = k => p.evaluate(async x => { pasoIr(3); evReset(); $('cEgr').checked = false; hEgr(); pasoEvalMedir(x); await new Promise(r => setTimeout(r, 60)); return PASO_ACTUAL; }, k);

  for (const turno of ['Dia', 'Noche']) {
    console.log('\n1 · 🔴 Cada chip lleva a su campo — turno ' + turno);
    await abrir(turno);
    const lista = await chips();
    si('(hay chips sin modal que probar)', lista.length >= 6);
    for (const c of lista) {
      await tocar(c.k);
      si('★★ «' + c.k + '» deja a la vista su campo (' + c.campo + ')', await vis(c.campo));
    }
  }

  console.log('\n2 · 🔴 El IMS es una evaluación FUNCIONAL: vive en Evaluaciones, no dentro de la KTM');
  await abrir('Noche');
  no('★★ su control NO está dentro de la tarjeta de KTM', await p.evaluate(() => !!$('imsBtn').closest('#fcKtmCard')));
  eq('★★ está en el paso de las evaluaciones (3)', await p.evaluate(() => { const d = $('imsBtn').closest('[data-paso]'); return d ? d.dataset.paso : '(sin dueño)'; }), '3');
  eq('★★ …dentro de la familia «Funcionales»', await p.evaluate(() => { const f = $('imsBtn').closest('.evFam'); return f ? f.dataset.fam : '(ninguna)'; }), 'funcionales');

  console.log('\n3 · 🔴 Medir el IMS NO depende de la KTM');
  for (const [etq, armar] of [
    ['con la KTM neutra (como parte de noche)', "() => { setKTMstate(null); }"],
    ['con la KTM «no realizada»', "() => { setKTMstate('n'); }"],
    ['con la KTM «contraindicada»', "() => { setKTMstate('s'); }"],
    ['con AET grupo IIIC (la tarjeta de KTM se esconde)', "() => { $('cAET').checked = true; $('fAETnivel').value = 'IIIC'; hAET(); aplicarGatesEval(); }"]]) {
    await abrir('Noche');
    await p.evaluate(fn => new Function('return (' + fn + ')')()(), armar);
    await tocar('ims');
    si('★★ ' + etq + ': el IMS se alcanza', await vis('imsBtn'));
  }
  await abrir('Noche');
  const viaja = await p.evaluate(async () => {
    $('fFirma').appendChild(Object.assign(document.createElement('option'), { value: 'K.T.', textContent: 'K.T.' })); $('fFirma').value = 'K.T.';
    const he = $('fHEst'); if (he && !he.value) he.value = 'Estable'; const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos';
    _transAvisoOk = true; setIMS(7); window._ll.length = 0; guardar(); await new Promise(r => setTimeout(r, 400));
    const c = window._ll.find(x => x.a === 'GUARDAR_EVOLUCION');
    return c ? { ims: c.d.EVAL_IMS, ktm: c.d.KTM_REALIZADA } : null; });
  eq('★★ el IMS medido de noche, con la KTM neutra, viaja al guardado y no inventa una KTM', viaja && (viaja.ims + '|' + viaja.ktm), '7|false');

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ chips_llevan_al_campo: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
