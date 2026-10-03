// validacion_entre_pasos.js — Un obligatorio que vive en OTRO paso también bloquea el
// guardado, y lleva a quien guarda hasta él (2-oct-2026).
//
// EL FALLO QUE SE ENCONTRÓ (midiéndolo, no por un reporte). Con el camino de pasos, el
// guardado ocurre al salir del último paso de datos, pero la PVE, la razón de «KTM no
// realizada» y la contraindicación viven en pasos anteriores. Las comprobaciones de
// «obligatorio» preguntaban `el campo se ve en pantalla` (offsetParent): un campo de otro
// paso está oculto POR EL PASO, así que daban «no se ve, no se exige» y el turno se guardaba
// sin PVE y sin razón. Medido: tubo + VM con la PVE sin responder, guardar desde el paso 3 →
// guardó. Nadie lo vio porque las guardias que probaban cada obligatorio lo hacían parados
// en el paso del campo, que es justo el único lugar donde funcionaba.
//
// LA REGLA QUE QUEDA. «Se ve» tiene dos preguntas distintas: «¿lo esconde la lógica del
// formulario?» (una rama que no aplica) y «¿lo esconde el paso en que estoy?». Un obligatorio
// solo se salta por la primera. Y si falta, el guardado lleva al paso del campo.
//
// 🪤 CADA OBLIGATORIO SE PRUEBA DESDE OTRO PASO. Probarlo parado en su propio paso es lo que
// dejó pasar el fallo.
//
// 🪤 Reloj congelado: fecha inventada y turno forzado.
//
// Uso: node build/checks/validacion_entre_pasos.js
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
  const errs = [];
  /* 🪤 LA SEGUNDA PANTALLA ES EL CELULAR. A 390 px las tarjetas del panel están PLEGADAS (acordeón), y eso también
     esconde el contenido «por presentación»: la primera versión de _vis lo contó como «oculto por la lógica» y en el
     teléfono la PVE y las razones de KTM siguieron sin exigirse (hallazgo de la revisión a máxima exigencia). */
  for (const ancho of [1200, 390]) {
  console.log('\n══════ pantalla de ' + ancho + ' px ══════');
  const p = await b.newPage({ viewport: { width: ancho, height: 1500 }, locale: 'es-CL' });
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    const FIJA = new Date(2026, 7, 12, 10, 0, 0).getTime(), RD = Date;
    function FD(...a) { if (!new.target) return new RD(FIJA).toString(); return a.length ? new RD(...a) : new RD(FIJA); }
    FD.prototype = RD.prototype; FD.now = () => FIJA; FD.UTC = RD.UTC; FD.parse = RD.parse; window.Date = FD;
    window._ll = [];
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
      api(a, d) { window._ll.push({ a, d }); let data = null; if (a === 'GET_CONFIG_UI') data = { NUM_CAMAS: 12, BANNERS: {} };
        else if (a === 'GET_EVO_TURNO') data = { actual: null, previa: null, pronoAbierto: '' };
        setTimeout(() => ok({ ok: true, data }), 5); } }; } }; } } } };
  });
  await p.goto('file://' + path.join(v2, 'index.html'));
  await p.waitForTimeout(800);

  /* Abre el turno, deja TODO lo demás en regla, aplica `armar`, se para en OTRO paso y guarda. */
  const intento = (armar, campo, natural) => p.evaluate(async x => {
    $('kf').reset(); $('gDate').value = '2026-08-12'; SHIFT = 'Dia';
    window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', VIA_AEREA: x.natural ? 'Natural' : 'TOT', SOPORTE: x.natural ? 'Ambiente' : 'VM',
      FECHA_INGRESO: '2026-08-05', TS_INGRESO: '2026-08-05 23:00:00', FECHA_INICIO_VA: '2026-08-08', TS_INICIO_VA: '2026-08-08 10:00:00',
      FECHA_INICIO_SOPORTE: '2026-08-08', TS_INICIO_SOPORTE: '2026-08-08 10:00:00' }];
    window.recargarSilencioso = () => {}; renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 800));
    $('fFirma').appendChild(Object.assign(document.createElement('option'), { value: 'K.T.', textContent: 'K.T.' })); $('fFirma').value = 'K.T.';
    const he = $('fHEst'); if (he && !he.value) he.value = 'Estable'; const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos';
    _transAvisoOk = true;
    new Function('return (' + x.armar + ')')()();
    // el paso del campo (el que tiene su propio data-paso, o el 2 si no lo trae)
    const e = x.campo ? $(x.campo) : null, d = e && e.closest('[data-paso]');
    const suPaso = d ? Number(d.dataset.paso) : 2;
    pasoIr(suPaso === 1 ? 2 : 1);                 // parado en OTRO paso
    window._ll.length = 0; rielRender();
    const faltas = ($('gFalta') || {}).textContent || '';
    guardar(); await new Promise(r => setTimeout(r, 400));
    return { guardo: window._ll.some(l => l.a === 'GUARDAR_EVOLUCION'), paso: PASO_ACTUAL, suPaso, faltas };
  }, { armar, campo, natural: !!natural });

  const bloquea = async (etq, armar, campo, pedazoFalta) => {
    const r = await intento(armar, campo);
    no('★★ ' + etq + ': NO guarda', r.guardo);
    eq('★★ …y lleva al paso del campo', r.paso, r.suPaso);
    if (pedazoFalta) si('★ …y el «Falta:» lo nombra aunque esté en otro paso (' + pedazoFalta + ')', r.faltas.indexOf(pedazoFalta) !== -1);
  };

  console.log('\n1 · 🔴 La PVE obligatoria bloquea desde otro paso');
  await bloquea('tubo + VM con la PVE sin responder', "() => {}", 'fPVEval', 'PVE');
  await bloquea('PVE «No» sin decir por qué', "() => hPVEtoggle('no')", 'fPveSCraz', 'razón de la PVE no realizada');
  await bloquea('PVE «No corresponde» sin decir por qué', "() => hPVEtoggle('nc')", 'fPveNcRaz', 'razón de «PVE no corresponde»');

  console.log('\n2 · 🔴 La KTM obligatoria bloquea desde otro paso');
  await bloquea('KTM «No realizada» sin razón', "() => { hPVEtoggle('si'); setKTMstate('n'); }", 'fKTMnoRaz', 'razón de KTM no realizada');
  await bloquea('KTM «Contraindicada» sin contraindicación', "() => { hPVEtoggle('si'); setKTMstate('s'); }", 'fKTMcontra', 'contraindicación de KTM');
  await bloquea('KTM «No realizada · Otro» sin fundamento', "() => { hPVEtoggle('si'); setKTMstate('n'); _ktmNoRazonSel('Otro'); }", 'fKTMnoCom', 'fundamento');

  console.log('\n2b · Lo que NO aplica no se exige, aunque esté en otro paso');
  const nat = await intento("() => { setKTMstate('r'); }", 'fPVEval', true);
  si('★★ sin tubo no hay PVE que exigir: guarda desde otro paso', nat.guardo);

  console.log('\n3 · Con todo en regla SÍ guarda (control positivo)');
  const ok = await intento("() => { hPVEtoggle('si'); setKTMstate('r'); }", 'fPVEval');
  si('★ PVE respondida y KTM realizada: guarda desde otro paso', ok.guardo);

  await p.close();
  }
  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ validacion_entre_pasos: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
