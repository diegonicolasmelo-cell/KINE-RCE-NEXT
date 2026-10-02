// evaluaciones_de_noche.js — Las evaluaciones SÍ se hacen de noche (Diego, 2-oct-2026).
//
// EL ERROR QUE ESTA GUARDIA CORRIGE (mío, dos veces seguidas). Diego escribió: «De noche las
// evaluaciones se muestran. Quizás para que esto funcione mejor en terapia física de noche que
// salga no corresponde.» Entendí que las evaluaciones no corresponden de noche, y las apagué:
// rótulo «No corresponde de noche», cajones desactivados, chips en solo lectura. Su respuesta,
// mirando el mensaje en pantalla: «dice que las evaluaciones no pueden ser realizadas de turno de
// noche, pero SÍ pueden ser realizadas en turno de noche. Lo que no puede hacerse o registrarse de
// noche es la terapia física.»
//
// 🔴 LA REGLA QUE QUEDA. De noche las evaluaciones funcionan IGUAL que de día: los mismos cajones,
// encendidos, con su numerito; los chips del pool se tocan; los del «Previo a la UCI» también; y
// lo que se mide viaja en el guardado. Lo único de noche es la TERAPIA FÍSICA (ver ktm_de_noche.js).
//
// 🪤 Esto REEMPLAZA a noche_no_corresponde.js (borrada: su premisa era la equivocada) y deshace lo
// de evaluaciones_celular §11 / general_disuelta que daban por hechos los cajones apagados.
//
// 🪤 Reloj congelado: la fecha se INVENTA y el turno se fuerza en SHIFT.
//
// Uso: node build/checks/evaluaciones_de_noche.js
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

  /* «Cada cosa se mide donde vive»: se va al paso que TIENE la tarjeta, sea cual sea su número. */
  const abrir = turno => p.evaluate(async x => {
    $('kf').reset(); $('gDate').value = '2026-08-12'; SHIFT = x.turno;
    window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', EDAD: 61, SEXO: 'M', VIA_AEREA: 'TOT', SOPORTE: 'VM',
      FECHA_INGRESO: '2026-08-05', TS_INGRESO: '2026-08-05 23:00:00', FECHA_INICIO_VA: '2026-08-08', TS_INICIO_VA: '2026-08-08 10:00:00',
      FECHA_INICIO_SOPORTE: '2026-08-08', TS_INICIO_SOPORTE: '2026-08-08 10:00:00', ULT_MRC: 48, ULT_MRC_FECHA: '2026-08-10', ULT_MRC_FIRMA: 'KP' }];
    window.recargarSilencioso = () => {}; renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 800));
    if (typeof aplicarGatesEval === 'function') aplicarGatesEval();
    const d = $('fcEval').closest('[data-paso]') || $('fcEval'); pasoIr(Number(d.dataset.paso || 3));
    await new Promise(r => setTimeout(r, 250));
  }, { turno });
  const ver = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0); }, sel);
  const cajones = () => p.evaluate(() => Array.from(document.querySelectorAll('#evTiles .evTile')).map(t => t.dataset.fam).join(','));

  console.log('\n1 · 🔴 De NOCHE los cajones están encendidos, como de día');
  await abrir('Dia');
  const dia = await cajones();
  si('(de día hay cajones: formato de referencia)', dia.length > 10);
  const badgesDia = await p.evaluate(() => document.querySelectorAll('#evTiles .evBadge').length);
  await abrir('Noche');
  si('★★ la tarjeta de evaluaciones se ve de noche', await ver('#fcEval'));
  eq('★★ con los mismos cajones que de día', await cajones(), dia);
  eq('★★ TODOS encendidos', await p.evaluate(() => Array.from(document.querySelectorAll('#evTiles .evTile')).filter(t => t.disabled).length), '0');
  eq('★★ con su numerito de pendientes, igual que de día', await p.evaluate(() => document.querySelectorAll('#evTiles .evBadge').length), badgesDia);
  no('★★ 🔴 SIN ningún «No corresponde» en Evaluaciones', await p.evaluate(() => /No corresponde de noche/i.test($('pasoEvalChips').innerText + ' ' + $('fcEval').innerText)));
  eq('★★ el botón de seguir dice lo de siempre', await p.evaluate(() => /No medí nada este turno/.test($('pasoEvalNada').innerText)), 'true');

  console.log('\n2 · 🔴 Y se puede medir de noche');
  await p.evaluate(() => { document.querySelector('#evTiles .evTile[data-fam="fuerza"]').click(); });
  await p.waitForTimeout(150);
  si('★★ tocar el cajón de fuerza abre sus campos', await ver('#rowMrc'));
  si('★★ …y marca «se evaluó este turno»', await p.evaluate(() => $('cEgr').checked));
  const viaja = await p.evaluate(async () => {
    $('fFirma').appendChild(Object.assign(document.createElement('option'), { value: 'K.T.', textContent: 'K.T.' })); $('fFirma').value = 'K.T.';
    const he = $('fHEst'); if (he && !he.value) he.value = 'Estable'; const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos';
    hPVEtoggle('si'); _transAvisoOk = true;
    $('fMRC').value = '40'; window._ll.length = 0; guardar(); await new Promise(r => setTimeout(r, 400));
    const c = window._ll.find(x => x.a === 'GUARDAR_EVOLUCION');
    return c ? { mrc: c.d.EVAL_T_MRC, turno: c.d.TURNO_KEY, real: c.d.EVAL_T_REALIZAR } : null; });
  eq('★★ el MRC medido de noche viaja en el guardado', viaja && (viaja.mrc + '|' + /Noche$/.test(viaja.turno) + '|' + viaja.real), '40|true|true');

  console.log('\n3 · 🔴 Los chips del pool y del «Previo a la UCI» se tocan de noche');
  await abrir('Noche');
  const chips = () => p.evaluate(() => {
    const pool = Array.from(document.querySelectorAll('#pasoEvalChips [data-evk]'));
    const prev = Array.from(document.querySelectorAll('#pasoEvalChips .abadge, #epBanner .abadge')).filter(e => /ECF|Barthel|Charlson/.test(e.textContent));
    return { pool: pool.length, poolClic: pool.filter(e => e.getAttribute('onclick')).length, poolApag: pool.filter(e => e.classList.contains('solo-lectura')).length,
             prev: prev.length, prevClic: prev.filter(e => e.getAttribute('onclick')).length, prevApag: prev.filter(e => e.classList.contains('solo-lectura')).length }; });
  let c = await chips();
  eq('★★ los diez chips del pool, con onclick', c.pool + '/' + c.poolClic, '10/10');
  eq('★★ …y ninguno de solo lectura', c.poolApag, '0');
  eq('★★ el «Previo a la UCI» (pool y banner) también se toca', c.prev + '/' + c.prevClic, c.prev + '/' + c.prev);
  eq('★★ …y ninguno de solo lectura', c.prevApag, '0');
  no('★ ni la línea vieja «De noche no se registran mediciones funcionales nuevas»', await p.evaluate(() => /no se registran mediciones/i.test($('pasoEvalChips').innerText)));

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ evaluaciones_de_noche: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
