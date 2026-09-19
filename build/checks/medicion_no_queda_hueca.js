// medicion_no_queda_hueca.js — Ninguna tarjeta con encabezado y sin cuerpo,
// y el pool se pinta también en el turno de ingreso (19-sep-2026).
//
// EL PROBLEMA. Diego registró un turno real de noche y escribió: «en registrar
// una evaluación no sale nada». No era un permiso ni una carga lenta: eran DOS
// fallas encima.
//
//   1) De noche, `hEgr()` esconde el CONTENIDO de la tarjeta de evaluaciones
//      (#fcEgrCard) pero no la tarjeta. Queda «📏 REGISTRAR UNA MEDICIÓN»
//      flotando sobre 26 píxeles de nada. El encabezado promete algo que no
//      está y nadie te dice por qué.
//
//   2) En el turno de INGRESO el pool sale con CERO chips. `pasoEvalPintar()`
//      cortaba con `if(!c.PATIENT_ID)`, y el PATIENT_ID se asigna al ocupar la
//      cama, o sea DESPUÉS: mientras se ingresa, la cama todavía no lo tiene.
//      Justo el momento en que el pool más sirve —un paciente nuevo, nada
//      medido, las diez por medir— es el único en que no aparecía.
//
// LA REGLA QUE QUEDA. Una tarjeta con encabezado visible tiene cuerpo con algo
// adentro; si no hay nada que mostrar, se esconde la tarjeta entera. Es una
// familia de fallas, no un caso: el cuerpo de varias tarjetas depende del
// turno, de la cooperación o del BNM, y cualquiera puede quedar hueca sin que
// se note hasta que alguien la busca a las tres de la mañana.
//
// 🪤 EL RELOJ VA CONGELADO: la fecha se INVENTA (2026-08-10) y el turno se
// fuerza en SHIFT. Sin eso la guardia diría cosas distintas según la hora a la
// que se corra, que es como ya nos mordió tres veces.

const path = require('path');
const V2 = path.join(__dirname, '..', '..', 'v2');
const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!okk) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); }
};
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

const { chromium } = require('playwright-core');

/** Abre el panel en un escenario y devuelve qué se ve en el paso 3. */
async function escena(p, turno, ingreso) {
  return p.evaluate(async ([turno, ingreso]) => {
    $('kf').reset();
    $('gDate').value = '2026-08-10';          // 🪤 fecha inventada, no la de hoy
    SHIFT = turno;                            // 🪤 turno forzado, no el del reloj
    DB = ingreso
      ? [{ ID_CAMA: '5', OCUPADA: false }]
      : [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM',
           ULT_MRC: '44', ULT_MRC_FECHA: '2026-08-08', ULT_MRC_FIRMA: 'KP' }];
    renderGrid();
    abrirPanel(ingreso ? '5' : '3', ingreso, false);
    await new Promise(r => setTimeout(r, 420));
    if (typeof aplicarGatesEval === 'function') aplicarGatesEval();
    if (typeof pasoIr === 'function') pasoIr(3);
    await new Promise(r => setTimeout(r, 200));

    // Tarjetas con encabezado a la vista y cuerpo sin nada adentro.
    const huecas = [];
    document.querySelectorAll('.fcard').forEach(c => {
      const cs = getComputedStyle(c), r = c.getBoundingClientRect();
      if (cs.display === 'none' || (!r.width && !r.height)) return;
      const hdr = c.querySelector('.fcard-hdr');
      const body = c.querySelector('.fcard-body');
      if (!hdr || getComputedStyle(hdr).display === 'none') return;
      const txt = body ? body.innerText.replace(/\s+/g, ' ').trim() : '';
      if (!txt) huecas.push((c.id || c.className) + ' → «' + hdr.innerText.trim() + '»');
    });

    return {
      huecas,
      nChips: document.querySelectorAll('#pasoEvalChips [data-evk]').length,
      sinMedir: document.querySelectorAll('#pasoEvalChips [data-evk].a-pend').length,
      poolTxt: (document.getElementById('pasoEvalChips') || {}).textContent || ''
    };
  }, [turno, ingreso]);
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.google = { script: { run: { withSuccessHandler(okF) { return { withFailureHandler() { return {
      api(a) { setTimeout(() => okF({ ok: true, data: (a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null) }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.resolve(V2, 'index.html'));
  await p.waitForTimeout(600);

  /* ══ 1 · Ninguna tarjeta promete algo que no está ═════════════════════ */
  console.log('\n1 · 🔴 Encabezado a la vista = cuerpo con algo adentro');
  for (const [turno, ing] of [['Día', false], ['Noche', false], ['Día', true], ['Noche', true]]) {
    const R = await escena(p, turno, ing);
    eq('★★ ' + turno + (ing ? ' · ingreso' : ' · paciente ya ingresado') + ': tarjetas huecas',
       R.huecas.join(' | ') || '(ninguna)', '(ninguna)');
  }

  /* ══ 2 · El pool se pinta cuando el paciente está recién entrando ═════ */
  console.log('\n2 · 🔴 El pool también en el turno de ingreso');
  for (const turno of ['Día', 'Noche']) {
    const R = await escena(p, turno, true);
    eq('★★ ' + turno + ' · ingreso: chips del pool', R.nChips, 10);
    eq('   …y las diez salen «sin medir» (paciente nuevo)', R.sinMedir, 10);
  }

  /* ══ 3 · Con paciente sigue como estaba (no romper lo que andaba) ═════ */
  console.log('\n3 · Con paciente ingresado el pool no cambia');
  for (const turno of ['Día', 'Noche']) {
    const R = await escena(p, turno, false);
    eq('★ ' + turno + ': chips del pool', R.nChips, 10);
    si('   …y el MRC muestra su valor con fecha y firma', /44 · 08-08 · KP/.test(R.poolTxt));
  }

  /* ══ 4 · Una cama vacía que NO se está ingresando no pinta pool ═══════ */
  console.log('\n4 · Una cama sin paciente y sin ingreso no pinta nada');
  const L = await p.evaluate(async () => {
    $('kf').reset(); $('gDate').value = '2026-08-10'; SHIFT = 'Día';
    DB = [{ ID_CAMA: '7', OCUPADA: false }];
    renderGrid();
    if (typeof pasoEvalPintar === 'function') { $('cIng').value = ''; $('cBed').value = '7'; pasoEvalPintar(); }
    await new Promise(r => setTimeout(r, 120));
    return document.querySelectorAll('#pasoEvalChips [data-evk]').length;
  });
  eq('★ sin paciente y sin ingreso: cero chips', L, 0);

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ medicion_no_queda_hueca: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ medicion_no_queda_hueca: ninguna tarjeta hueca y el pool se pinta desde el ingreso.');
})();
