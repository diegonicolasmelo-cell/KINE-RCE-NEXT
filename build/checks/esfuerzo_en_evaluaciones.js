// esfuerzo_en_evaluaciones.js — P0.1, ΔPocc y Pmusc se evalúan en EVALUACIONES, y
// la deglución dice primero si está presente o ausente (Diego, 1-oct-2026).
//
// LO QUE PIDIÓ: «P0.1 y ΔPocc podrían evaluarse a Evaluaciones. Y después en el
// texto agrupar todo, porque son evaluaciones puntuales.» Y: «también faltan las
// pruebas del esfuerzo respiratorio; solamente aparecería en ventilación
// espontánea.» Y de la deglución: «presente, ausente».
//
// 🔵 «PMI» NO ES UNA PRUEBA NUEVA. Al dictar la primera vez salió «Pmusc y ΔPocc
// o PMI»; la segunda, «P0.1 y ΔPocc». Era el P0.1 mal transcrito. No se creó
// ningún campo PMI: el PIM (presión inspiratoria máxima) ya existe aparte.
//
// 🪤 LA PUERTA NO SE MUDA SOLA. Antes «solo en CPAP/PS» salía GRATIS: el bloque
// se dibujaba dentro del generador de parámetros por modo. En Evaluaciones hay
// que escribirla otra vez, o el bloque aparece siempre, también con un paciente
// en ACVC donde la maniobra de oclusión no se puede hacer.
//
// 🪤 YA NO SE REPLICAN. Antes viajaban a ámbar de un turno al siguiente como
// «mediciones puntuales heredadas». Una evaluación puntual es de ESE turno.
//
// 🪤 DEGLUCIÓN SIN COLUMNA NUEVA: EVAL_DEGLUCION guarda UN valor legible
// (Ausente · Presente · Adecuada · Alterada leve · Alterada severa · No
// evaluable) y la pantalla lo parte en dos preguntas al abrirlo. Un turno viejo
// con «Adecuada» se abre como «presente · adecuada».
//
// 🪤 Reloj congelado; las evaluaciones viven tras «Se evaluó este turno» (cEgr).
//
// Uso: node build/checks/esfuerzo_en_evaluaciones.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const v2 = path.join(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

/* ══ PARTE 1 · el relato del servidor ════════════════════════════════════ */
global.esVerdadero = v => v === true || v === 'TRUE' || v === 'true';
global.leerConfig = (k, d) => d;
eval(fs.readFileSync(path.join(v2, 'dominio_texto.gs'), 'utf8'));
console.log('\n── PARTE 1 · el relato del servidor ──');
console.log('\n1 · Los tres índices se narran, agrupados con las evaluaciones');
const tx = generarTextoEvolucion({ TURNO: 'Dia', VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', VENT_MODO: 'CPAP/PS',
  VENT_P01: 2.1, VENT_DPOCC: 8, VENT_PMUSC: 6 });
const linea = (tx.split('\n').find(l => /^Evaluaciones funcionales:/.test(l)) || '');
si('★★ hay una línea de evaluaciones', linea);
si('★★ P0.1 está en ella', /P0\.1 2[.,]1 cmH2O/.test(linea));
si('★★ ΔPocc está en ella', /ΔPocc 8 cmH2O/.test(linea));
si('★★ Pmusc está en ella', /Pmusc 6 cmH2O/.test(linea));

/* ══ PARTE 2 · la pantalla ═══════════════════════════════════════════════ */
(async () => {
  console.log('\n── PARTE 2 · la pantalla ──');
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

  const abrir = (va, sop, modo, evoGuardada) => p.evaluate(x => {
    window.__evo = x.evo; $('kf').reset();
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', EDAD: 61, SEXO: 'M',
            VIA_AEREA: x.va, SOPORTE: x.sop, FECHA_INGRESO: '2026-08-07' }];
    window.recargarSilencioso = () => {};
    $('gDate').value = '2026-08-12'; SHIFT = 'Dia';
    renderGrid(); abrirPanel('3', false, false);
  }, { va, sop, evo: evoGuardada || null }).then(() => p.waitForTimeout(800))
    .then(() => p.evaluate(x => { window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
      if (!window.__evo) { $('fVA').value = x.va; cascadeVA(); $('fSop').value = x.sop; cascadeSop();
        if (x.modo) { $('fModo').value = x.modo; renderParams(); } }
      const c = $('cEgr'); c.checked = true; hEgr(); pasoIr(3); }, { va, sop, modo }))
    .then(() => p.waitForTimeout(350));
  const ver = sel => p.evaluate(s => { const e = document.querySelector(s);
    if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0);
  }, sel);

  console.log('\n2 · 🔴 El bloque de esfuerzo vive en Evaluaciones y SOLO con ventilación espontánea');
  await abrir('TOT', 'VM', 'CPAP/PS');
  await p.evaluate(() => { const d = $('dxEsf'); if (d) d.open = true; });
  si('★★ en CPAP/PS, el bloque «Esfuerzo respiratorio» se ve', await ver('#dxEsf'));
  si('★★ …con P0.1', await ver('#fP01'));
  si('★★ …con ΔPocc', await ver('#fDPocc'));
  si('★★ …con Pmusc', await ver('#fPmusc'));
  si('★★ …y vive dentro de la tarjeta de Evaluaciones', await p.evaluate(() => !!$('dxEsf')?.closest('#dEgr')));
  await abrir('TOT', 'VM', 'ACVC');
  no('★★ en ACVC NO aparece (la maniobra de oclusión es de ventilación espontánea)', await ver('#dxEsf'));
  await abrir('Natural', 'Oxigenoterapia/OAF', '');
  no('★★ con oxigenoterapia tampoco', await ver('#dxEsf'));

  console.log('\n3 · 🔴 Ya no están en «Terapia ventilatoria»');
  await abrir('TOT', 'VM', 'CPAP/PS');
  eq('★★ r_p01 ya no se dibuja en los parámetros', await p.evaluate(() => !!document.getElementById('r_p01')), false);
  eq('★★ r_dpocc tampoco', await p.evaluate(() => !!document.getElementById('r_dpocc')), false);
  eq('★★ ni r_pmusc', await p.evaluate(() => !!document.getElementById('r_pmusc')), false);
  no('★ el desplegable «Monitoreo avanzado» desapareció', await p.evaluate(() => /Monitoreo avanzado/.test($('paramsBox')?.innerHTML || '')));

  console.log('\n4 · 🔴 Lo que se mide viaja en el guardado');
  const viaja = async (modo, tecleo) => {
    await abrir('TOT', 'VM', modo);
    return p.evaluate(async t => {
      $('cBed').value = '3';
      const o = document.createElement('option'); o.value = 'Klgo. Test'; o.textContent = 'Klgo. Test';
      $('fFirma').appendChild(o); $('fFirma').value = 'Klgo. Test';
      const he = $('fHEst'); if (he && !he.value) he.value = 'Estable';
      const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos';
      { const pv = $('fPVEval'); if (pv) { pv.value = 'nc'; hPVEtoggle('nc'); const r = $('fPveNcRaz'); if (r) { r.value = 'Ventilación mecánica domiciliaria'; hPveNcRaz(); } } }
      for (const k in t) { const e = $(k); if (e) e.value = t[k]; }
      _transAvisoOk = true; window._ll.length = 0; guardar();
      await new Promise(r => setTimeout(r, 90));
      const c = window._ll.find(x => x.a === 'GUARDAR_EVOLUCION');
      return c ? { p01: c.d.VENT_P01, dp: c.d.VENT_DPOCC, pm: c.d.VENT_PMUSC } : null;
    }, tecleo);
  };
  let g = await viaja('CPAP/PS', { fP01: '2.1', fDPocc: '8', fPmusc: '6' });
  eq('★★ P0.1 viaja', g && g.p01, '2.1');
  eq('★★ ΔPocc viaja', g && g.dp, '8');
  eq('★★ Pmusc viaja', g && g.pm, '6');
  g = await viaja('ACVC', { fP01: '2.1', fDPocc: '8', fPmusc: '6' });
  eq('★★ 🪤 con un modo controlado NO viaja nada (un valor tecleado antes no se cuela)', g && [g.p01, g.dp, g.pm].map(x => x === null ? 'null' : x).join('/'), 'null/null/null');

  console.log('\n5 · 🔴 Al reabrir el turno vuelven');
  await abrir('TOT', 'VM', 'CPAP/PS', { ID_CAMA: '3', TURNO_KEY: '2026-08-12-Dia', PATIENT_ID: 'p3', PAC_NOMBRE: 'P',
    PLAN_FIRMA_KINE: 'K.P.', VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', VENT_MODO: 'CPAP/PS',
    EVAL_FECHA: '2026-08-12', EVAL_T_REALIZAR: true, VENT_P01: 2.1, VENT_DPOCC: 8, VENT_PMUSC: 6 });
  eq('★★ P0.1 vuelve', await p.evaluate(() => v('fP01')), '2.1');
  eq('★★ ΔPocc vuelve', await p.evaluate(() => v('fDPocc')), '8');
  eq('★★ Pmusc vuelve', await p.evaluate(() => v('fPmusc')), '6');

  console.log('\n6 · 🪤 NO se replican al turno siguiente');
  await abrir('TOT', 'VM', 'CPAP/PS');
  await p.evaluate(() => { try { fillFormReplica({ ID_CAMA: '3', VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', VENT_MODO: 'CPAP/PS',
    VENT_P01: 2.1, VENT_DPOCC: 8, VENT_PMUSC: 6, EVAL_T_MRC: 40 }); } catch (e) { window.__errRep = String(e); } });
  eq('★★ P0.1 queda vacío', await p.evaluate(() => v('fP01')), '');
  eq('★★ ΔPocc queda vacío', await p.evaluate(() => v('fDPocc')), '');
  eq('★★ Pmusc queda vacío', await p.evaluate(() => v('fPmusc')), '');

  console.log('\n7 · El relato de la pantalla los agrupa con las evaluaciones');
  await abrir('TOT', 'VM', 'CPAP/PS');
  await p.evaluate(() => { $('fP01').value = '2.1'; $('fDPocc').value = '8'; $('fPmusc').value = '6'; });
  const txt = await p.evaluate(() => genTexto());
  const lin = (txt.split('\n').find(l => /Evaluaciones funcionales:/.test(l)) || '');
  si('★★ hay una línea de evaluaciones', lin);
  si('★★ …con P0.1', /P0\.1 2[.,]1 cmH2O/.test(lin));
  si('★★ …con ΔPocc', /ΔPocc 8 cmH2O/.test(lin));
  si('★★ …y con Pmusc', /Pmusc 6 cmH2O/.test(lin));
  await p.evaluate(() => { $('fModo').value = 'ACVC'; renderParams(); });
  no('★★ 🪤 si el modo pasa a controlado, el relato deja de narrarlos', /P0\.1/.test(await p.evaluate(() => genTexto())));

  console.log('\n8 · 🔴 Deglución: primero presente o ausente');
  await abrir('TOT', 'VM', 'CPAP/PS');
  await p.evaluate(() => { const d = $('dxTos'); if (d) d.open = true; });
  si('★★ existe la pregunta «presente / ausente»', await ver('#fDeglPres'));
  no('★★ la calidad NO se ve hasta que está presente', await ver('#fDeglucion'));
  await p.evaluate(() => { $('fDeglPres').value = 'presente'; hDegl(); });
  si('★★ con «presente» se pregunta la calidad', await ver('#fDeglucion'));
  await p.evaluate(() => { $('fDeglucion').value = 'Alterada leve'; });
  const degl = () => p.evaluate(async () => {
    $('cBed').value = '3';
    const o = document.createElement('option'); o.value = 'Klgo. Test'; o.textContent = 'Klgo. Test';
    if (!Array.from($('fFirma').options).some(x => x.value === 'Klgo. Test')) $('fFirma').appendChild(o);
    $('fFirma').value = 'Klgo. Test';
    const he = $('fHEst'); if (he && !he.value) he.value = 'Estable';
    const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos';
    { const pv = $('fPVEval'); if (pv && !pv.value) { hPVEtoggle('nc'); const r = $('fPveNcRaz'); if (r) { r.value = 'Ventilación mecánica domiciliaria'; hPveNcRaz(); } } }
    _transAvisoOk = true; window._ll.length = 0; guardar();
    await new Promise(r => setTimeout(r, 90));
    const c = window._ll.find(x => x.a === 'GUARDAR_EVOLUCION');
    return c ? c.d.EVAL_DEGLUCION : null;
  });
  eq('★★ presente + calidad viaja la calidad', await degl(), 'Alterada leve');
  await p.evaluate(() => { $('fDeglPres').value = 'ausente'; hDegl(); });
  no('★★ con «ausente» la calidad se esconde', await ver('#fDeglucion'));
  eq('★★ …y se borra', await p.evaluate(() => v('fDeglucion')), '');
  eq('★★ ausente viaja como «Ausente»', await degl(), 'Ausente');
  const t2 = await p.evaluate(() => genTexto());
  si('★★ el relato dice «Deglución: Ausente»', /Deglución: Ausente/.test(t2));

  console.log('\n9 · 🪤 Un turno VIEJO («Adecuada», sin presencia) se abre como presente · adecuada');
  await abrir('TOT', 'VM', 'CPAP/PS', { ID_CAMA: '3', TURNO_KEY: '2026-08-12-Dia', PATIENT_ID: 'p3', PAC_NOMBRE: 'P',
    PLAN_FIRMA_KINE: 'K.P.', VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', EVAL_DEGLUCION: 'Adecuada' });
  eq('★★ la presencia se deduce: presente', await p.evaluate(() => v('fDeglPres')), 'presente');
  eq('★★ …y la calidad vuelve', await p.evaluate(() => v('fDeglucion')), 'Adecuada');
  await abrir('TOT', 'VM', 'CPAP/PS', { ID_CAMA: '3', TURNO_KEY: '2026-08-12-Dia', PATIENT_ID: 'p3', PAC_NOMBRE: 'P',
    PLAN_FIRMA_KINE: 'K.P.', VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', EVAL_DEGLUCION: 'Ausente' });
  eq('★★ «Ausente» vuelve como ausente', await p.evaluate(() => v('fDeglPres')), 'ausente');
  await abrir('TOT', 'VM', 'CPAP/PS', { ID_CAMA: '3', TURNO_KEY: '2026-08-12-Dia', PATIENT_ID: 'p3', PAC_NOMBRE: 'P',
    PLAN_FIRMA_KINE: 'K.P.', VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', EVAL_DEGLUCION: 'No evaluable' });
  eq('★★ «No evaluable» sigue siendo una respuesta', await p.evaluate(() => v('fDeglPres')), 'no_evaluable');

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ esfuerzo_en_evaluaciones: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
