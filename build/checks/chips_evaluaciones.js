// chips_evaluaciones.js — Una escala, un chip, se abre sola (17-sep-2026).
//
// EL PROBLEMA. Los chips del paso de evaluaciones ya funcionaban bien: se abre
// una escala a la vez, mostrando lo que el episodio ya tiene con su fecha y
// quién la midió. Pero debajo quedaba una puerta vieja: al entrar a «registrar
// una medición» se desplegaban DIECISIETE campos de golpe, casi todos de
// escalas que ese turno no iba a medir.
//
// Diego: «las demás escalas también pásalas a un chip que se abran solas de
// forma individual y no que aparezcan todas de golpe… esto hace que cada uno
// seleccione de forma dirigida lo que quiere medir y registrar, ya que no
// siempre se registra todo».
//
// LOS AGRUPAMIENTOS los dio él, y no son arbitrarios: se juntan las que de
// verdad se miden juntas.
//   · ECOGRAFÍA — «el grosor diafragmático, cuádriceps y todo eso debería
//     entrar en ecografía y de ahí desplegar el resto»: es un solo examen con
//     el transductor en la mano.
//   · PROTECCIÓN DE VÍA AÉREA — «deglución y test de azul aparte… lo
//     englobaría en protección de vía aérea»: las dos responden la misma
//     pregunta clínica.
// El resto van solas, una por chip.
//
// 🔴 Y LAS EVALUACIONES SÍ SE PUEDEN OMITIR: «no podemos obligar a los colegas
// a que evalúen el MRC». A diferencia de los filtros del paso 1, que sí son
// obligables porque son medida de IAS y están a cargo de kinesiología.

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

/* ══ 1 · El catálogo tiene las diez ═════════════════════════════════════ */
console.log('\n1 · Una escala, un chip');
const cat = (idx.match(/const _PASO_SERIE\s*=\s*\[[\s\S]*?\n\];/) || [''])[0];
[['mrc', 'MRC'], ['fss', 'FSS'], ['cpax', 'CPAx'], ['pim', 'Pimáx'],
 ['pem', 'PEmáx'], ['fem', 'FEmáx'], ['dinamo', 'Dinamom'],
 ['ims', 'IMS'], ['eco', 'Ecografía'], ['via', 'vía aérea']].forEach(([k, lbl]) => {
  si("★ hay chip de " + lbl, new RegExp("k:'" + k + "'").test(cat));
});

/* ══ 2 · Nada se abre de golpe ══════════════════════════════════════════ */
console.log('\n2 · 🔴 Los diecisiete campos ya no salen todos juntos');
['dxFzaResp', 'dxEco', 'dxTos'].forEach(id => {
  const bloque = (idx.match(new RegExp('<details id="' + id + '"[^>]*>')) || [''])[0];
  si('   existe el desplegable ' + id, bloque.length > 0);
  no('★ ' + id + ' NO nace abierto', /\bopen\b/.test(bloque));
});

/* ══ 3 · El cuff ya no vive acá ═════════════════════════════════════════ */
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

  console.log('\n3 · ★ Tocar un chip abre SOLO lo suyo');
  const R = await p.evaluate(async () => {
    $('kf').reset(); $('cBed').value = '3';
    $('gDate').value = '2026-08-10';   // 🪤 fecha inventada
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM' }];
    renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 300));
    if (typeof pasoIr === 'function') pasoIr(3);
    await new Promise(r => setTimeout(r, 120));
    const abiertos = () => ['dxFzaResp', 'dxEco', 'dxTos']
      .filter(id => { const e = document.getElementById(id); return e && e.open; });
    const out = { alEntrar: abiertos() };
    // la ecografía: un solo examen con el transductor en la mano
    pasoEvalMedir('eco');
    await new Promise(r => setTimeout(r, 80));
    out.trasEco = abiertos();
    // protección de vía aérea: deglución + test de azul
    pasoEvalMedir('via');
    await new Promise(r => setTimeout(r, 80));
    out.trasVia = abiertos();
    out.chipsPintados = [...document.querySelectorAll('#pasoEvalChips [data-evk]')].map(x => x.dataset.evk);
    out.cuffAqui = !!document.getElementById('fcEval') &&
                   !!document.getElementById('fcEval').querySelector('#dCuff');
    return out;
  });
  eq('★★ al entrar al paso NO hay ningún desplegable abierto', R.alEntrar.join(','), '');
  eq('★★ el chip de ecografía abre la ecografía, y solo esa', R.trasEco.join(','), 'dxEco');
  eq('★★ el de protección de vía aérea, solo la suya', R.trasVia.join(','), 'dxTos');
  si('★ los diez chips se pintan', R.chipsPintados.length >= 10);
  no('★ la presión de cuff ya no vive acá (se fue al paso 1)', R.cuffAqui);

  /* ══ 4 · Se pueden omitir ═════════════════════════════════════════════ */
  console.log('\n4 · 🔴 Las evaluaciones se pueden omitir');
  const O = await p.evaluate(async () => {
    const b = document.getElementById('pasoEvalNada');
    return { haysalida: !!b, texto: b ? b.textContent.trim() : '' };
  });
  si('★ la salida «no medí nada» está a la vista, no escondida', O.haysalida);
  si('   …y dice lo que hace, sin jerga', /no med|nada/i.test(O.texto));

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ chips_evaluaciones: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ chips_evaluaciones: una escala, un chip.');
})();
