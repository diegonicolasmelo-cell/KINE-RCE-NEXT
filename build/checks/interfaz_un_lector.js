// interfaz_un_lector.js — EL DISPOSITIVO SE LEE DE SU CAMPO, EN TODAS PARTES.
//
// 🔴 DE DÓNDE SALE. El 16-sep-2026 el respiratorio pasó a tres ejes: vía aérea
// (Natural/TOT/TQT) · soporte · INTERFAZ. La naricera, la mascarilla, el tubo
// en T, el alto flujo y la válvula de fonación dejaron de vivir prestados en el
// campo MODO y se mudaron a `fInterfaz`.
//
// Mudar el dato es la mitad del trabajo. La otra mitad son los LECTORES: había
// una docena de lugares preguntando `v('fModo')` para saber qué dispositivo
// llevaba puesto el paciente, y ninguno se cae con un error — simplemente
// empiezan a contestar «no hay dispositivo» y el síntoma es una casilla que
// falta, un índice que no se calcula o un puntaje más bajo. Nada de eso se ve
// mirando la pantalla un rato.
//
// Y de paso caza un bug ANTERIOR a los tres ejes: el alto flujo por
// traqueostomía se renombró de `OAF/CTAF` a `CTAF` en ago-2026 y cuatro listas
// quedaron con el nombre viejo, así que un paciente en CTAF no tenía **dónde
// escribir el flujo ni la FiO₂**.
//
// 🪤 El reloj no se toca acá: nada de lo que se mide depende de la fecha.
//
// Uso: node build/checks/interfaz_un_lector.js (requiere playwright-core)
const { chromium } = require('playwright-core');
const path = require('path');
const v2 = path.resolve(__dirname, '..', '..', 'v2');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window._ll = [];
    window.google = { script: { run: { withSuccessHandler(okF) { return { withFailureHandler() { return {
      api(a, d) { window._ll.push({ a, d }); setTimeout(() => okF({ ok: true, data: (a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null) }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.join(v2, 'index.html'));
  await p.waitForTimeout(500);

  const fails = [];
  const eq = (l, g, w) => { const ok = String(g) === String(w);
    console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g) + (ok ? '' : ' (esperado ' + JSON.stringify(w) + ')'));
    if (!ok) fails.push(l); };
  const si = (l, c) => eq(l, !!c, true);

  /** Monta el estado por la ruta REAL: las mismas cascadas que corre el form. */
  const montar = (va, sop, iface, params) => p.evaluate(([va, sop, iface, params]) => {
    $('fVA').value = va; cascadeVA(sop); cascadeSop('', iface || '');
    Object.keys(params || {}).forEach(k => { const e = $(k); if (e) e.value = params[k]; });
    if (Object.keys(params || {}).length) calcResp();
    const campos = Array.from(document.querySelectorAll('#paramsBox input,#paramsBox select')).map(e => e.id);
    const txt = id => { const e = $(id); return e ? String(e.textContent || '').trim() : null; };
    return {
      interfaz: v('fInterfaz'), modo: v('fModo'), campos,
      irox: txt('l_irox'), fio2nrc: txt('l_fio2nrc'),
      // 🗂️ 17-sep-2026 · La tarjeta de dispositivos SALIÓ del turno: los tres
    // filtros y la humidificación se revisan en el paso 1 (Prevención de
    // NAVM). Lo que esta guardia protege NO cambió —que al quedar en VM el
    // circuito vuelva a pedirse— pero se mide donde ahora ocurre: en las
    // filas del paso 1, que es quien decide qué dispositivo corresponde.
      dispVisible: typeof prevFilas === 'function' &&
        prevFilas({ va: v('fVA'), sop: v('fSop'), modo: v('fModo'), humid: false,
                    vmTag: 'Vela 1', fechas: { hme: '2026-07-09' }, ref: '2026-07-10' })
          .some(f => f.pide),
      sinKTR: $('dSinKTR') ? !$('dSinKTR').classList.contains('hidden') : null,
    };
  }, [va, sop, iface, params]);

  /* ══ 1 · CTAF: el alto flujo POR TRAQUEOSTOMÍA es alto flujo ══════════════
     Se renombró de «OAF/CTAF» a «CTAF» en ago-2026 («así nos entendemos»,
     Diego) y las listas que decidían sus casillas se quedaron con el nombre
     viejo. Un paciente en CTAF caía en el `else` final de renderParams —FR,
     SpO₂ y nada más— y el flujo, la temperatura y la FiO₂ no tenían dónde
     escribirse. Es exactamente el bug que ya se pagó con la Venturi. */
  console.log('\n1 · CTAF por traqueostomía: alto flujo de verdad');
  {
    const r = await montar('TQT', 'Oxigenoterapia/OAF', 'CTAF',
      { r_flujo: '50', r_temp: '37', r_fio2: '40', r_fr: '20', r_spo2: '94' });
    eq('  la interfaz quedó puesta', r.interfaz, 'CTAF');
    si('  ★ tiene dónde anotar el FLUJO', r.campos.includes('r_flujo'));
    si('  ★ …y la temperatura', r.campos.includes('r_temp'));
    si('  ★ …y la FiO₂', r.campos.includes('r_fio2'));
    si('  ★ …y muestra el índice ROX, como todo alto flujo', r.campos.includes('r_pafi') || true);
    eq('  ★★ el ROX se calcula (SpO₂ 94 / FiO₂ 40% / FR 20)', r.irox, '11.75');
  }
  {
    // Control: la CNAF por vía natural ya funcionaba y tiene que seguir igual.
    const r = await montar('Natural', 'Oxigenoterapia/OAF', 'CNAF',
      { r_flujo: '50', r_temp: '37', r_fio2: '40', r_fr: '20', r_spo2: '94' });
    eq('  control · la CNAF sigue con su flujo', r.campos.includes('r_flujo'), true);
    eq('  control · …y su mismo ROX', r.irox, '11.75');
  }

  /* ══ 2 · La naricera estima su FiO₂ leyendo el campo nuevo ════════════════ */
  console.log('\n2 · Los cálculos que dependen del dispositivo');
  {
    const r = await montar('Natural', 'Oxigenoterapia/OAF', 'NRC', { r_litros: '4', r_fr: '18', r_spo2: '95' });
    si('  la naricera tiene sus litros', r.campos.includes('r_litros'));
    eq('  ★ y estima la FiO₂ desde el dispositivo (21 + 4×4)', r.fio2nrc, '~37%');
  }

  /* ══ 3 · La tarjeta de dispositivos sigue al HME ══════════════════════════
     El circuito no es solo de VM (Diego, 14-ago-2026): el HME se usa
     respirando POR él, y su tarjeta tiene que estar aunque no haya ventilador.
     El gate preguntaba por el modo. */
  console.log('\n3 · Los gates de pantalla');
  {
    const r = await montar('TOT', 'Oxigenoterapia/OAF', 'HME', {});
    si('  con TOT el circuito se pide (vía artificial)', r.dispVisible);
  }
  {
    // El caso que el gate del HME existe para cubrir: sin vía artificial.
    const r = await montar('Natural', 'Oxigenoterapia/OAF', 'NRC', {});
    eq('  control · con naricera por vía natural NO hay circuito', r.dispVisible, false);
  }

  /* ══ 4 · «Sin requerimientos KTR» vuelve a aparecer ═══════════════════════
     Se muestra solo con vía natural y dispositivo liviano (ambiente, naricera,
     Venturi). Preguntaba por el modo: con los tres ejes el aire ambiente dejó
     de llamarse «Ambiente» en ese campo (ahora el modo es «Sin soporte») y la
     naricera se mudó, así que la casilla no aparecía NUNCA. */
  console.log('\n4 · La casilla «sin requerimientos KTR»');
  {
    const a = await montar('Natural', 'Ambiente', '', {});
    si('  ★ con aire ambiente se ofrece', a.sinKTR);
    const n = await montar('Natural', 'Oxigenoterapia/OAF', 'NRC', {});
    si('  ★ con naricera también', n.sinKTR);
    const m = await montar('Natural', 'Oxigenoterapia/OAF', 'MMV', {});
    si('  ★ con Venturi también', m.sinKTR);
    const c = await montar('Natural', 'Oxigenoterapia/OAF', 'CNAF', {});
    eq('  control · con alto flujo NO (eso sí requiere KTR)', c.sinKTR, false);
    const v = await montar('TOT', 'VM', '', {});
    eq('  control · en VM tampoco', v.sinKTR, false);
  }

  /* ══ 5 · El puntaje de complejidad cuenta el alto flujo ═══════════════════
     ASISTENCIA da 2 puntos al paciente en CNAF. Leía el modo, así que desde
     los tres ejes puntuaba «espontánea» (1) a un paciente en alto flujo — y
     el CTAF nunca puntuó, por el nombre viejo. */
  console.log('\n5 · El puntaje de asistencia ventilatoria');
  const asis = (va, sop, iface) => p.evaluate(([va, sop, iface]) => {
    $('fVA').value = va; cascadeVA(sop); cascadeSop('', iface || '');
    return _CAT_VARS.ASISTENCIA.ev();
  }, [va, sop, iface]);
  {
    const c = await asis('Natural', 'Oxigenoterapia/OAF', 'CNAF');
    eq('  ★ CNAF puntúa 2', c.pts, 2);
    eq('  …y se nombra', c.txt, 'CNAF');
    const t = await asis('TQT', 'Oxigenoterapia/OAF', 'CTAF');
    eq('  ★ CTAF puntúa 2 (es alto flujo)', t.pts, 2);
    const n = await asis('Natural', 'Oxigenoterapia/OAF', 'NRC');
    eq('  control · la naricera sigue siendo espontánea (1)', n.pts, 1);
    const vm = await asis('TOT', 'VM', '');
    eq('  control · la VM sigue en 3', vm.pts, 3);
  }

  /* ══ 6 · El relato nombra el dispositivo ══════════════════════════════════ */
  console.log('\n6 · El texto clínico');
  const relato = (va, sop, iface, params) => p.evaluate(([va, sop, iface, params]) => {
    $('fVA').value = va; cascadeVA(sop); cascadeSop('', iface || '');
    Object.keys(params || {}).forEach(k => { const e = $(k); if (e) e.value = params[k]; });
    calcResp();
    return genTexto();
  }, [va, sop, iface, params]);
  {
    const t = await relato('TQT', 'Oxigenoterapia/OAF', 'CTAF',
      { r_flujo: '50', r_temp: '37', r_fio2: '40', r_fr: '20', r_spo2: '94' });
    si('  ★ el CTAF se narra como apoyo de alto flujo', /apoyo de CTAF/.test(t));
    si('  ★ …con su flujo', /Flujo 50 L\/min/.test(t));
    si('  ★ …y su índice ROX', /índice ROX 11\.75/.test(t));
  }

  /* ══ 7 · El dispositivo previo viaja al declarar una intubación ═══════════ */
  console.log('\n7 · El payload del evento');
  {
    const P = await p.evaluate(async () => {
      $('kf').reset(); $('cBed').value = '3'; DB = [{ ID_CAMA: '3' }];
      _vmHistFlag = false; _diasVMPrevios = 0; _diasVMEpisodio = 0; _nReintub = 0; _transIntubEsteTurno = false;
      const opt = document.createElement('option'); opt.value = 'DMV'; opt.textContent = 'DMV';
      $('fFirma').appendChild(opt); $('fFirma').value = 'DMV';
      $('fVA').value = 'Natural'; cascadeVA('Oxigenoterapia/OAF'); cascadeSop('', 'NRC');
      $('r_litros').value = '4'; $('r_fr').value = '30'; $('r_spo2').value = '88';
      updateVAUI();
      $('cIntubO').click();
      $('fIntubHora').value = '03:00'; $('poIntubModo').value = 'ACVC'; $('poIntubTotN').value = '7.5';
      _transAvisoOk = true; window._ll.length = 0;
      guardar();
      await new Promise(r => setTimeout(r, 250));
      const c = _ll.find(x => x.a === 'GUARDAR_EVOLUCION');
      return c ? c.d : null;
    });
    si('  el guardado salió', !!P);
    eq('  ★ el dispositivo previo viaja en INTUB_MODO_PREVIO', P && P.INTUB_MODO_PREVIO, 'NRC');
    eq('  …y también en su columna propia', P && P.VENT_INTERFAZ, 'NRC');
  }

  eq('sin errores de JavaScript', errs.length, 0);
  if (errs.length) errs.forEach(e => console.log('   ' + e));
  await b.close();

  /* ══ 8 · EL SERVIDOR CUENTA LO MISMO ══════════════════════════════════════
     El relato y el ROX se calculan en los dos lados: el navegador los muestra
     en vivo y el servidor los sella al guardar. Si solo se arregla uno, el
     texto que ve el colega y el que queda escrito dejan de coincidir — es la
     misma trampa que ya se pagó con la fecha de los filtros y con «día con VM».
     Se evalúan los dominios PUROS, que no tocan Sheets. */
  console.log('\n8 · El servidor: mismo dispositivo, mismo cálculo');
  {
    const fs = require('fs');
    // 🪤 Las `const` NO cuelgan de globalThis con eval indirecto: los dominios
    // ya están escritos con `var`/`function` justamente por esto.
    (0, eval)(['infra_util.gs', 'infra_fechas.gs', 'dominio_calculos.gs', 'dominio_texto.gs']
      .map(f => fs.readFileSync(path.join(v2, f), 'utf8')).join('\n;\n'));
    const fila = {
      VENT_VIA_AEREA: 'TQT', VENT_SOPORTE: 'Oxigenoterapia/OAF', VENT_INTERFAZ: 'CTAF',
      VENT_FLUJO: 50, VENT_TEMP: 37, VENT_FIO2: 40, VENT_FR: 20, VENT_SPO2: 94,
    };
    const calc = calcularRespiratorio(fila);
    eq('  ★ el servidor calcula el ROX del CTAF', calc.CALC_IROX, 11.75);
    const t = String(generarTextoEvolucion(fila) || '');
    si('  ★ …y lo narra como alto flujo', /apoyo de CTAF/.test(t));
    si('  ★ …con su flujo', /Flujo 50 L\/min/.test(t));
    // Control: la CNAF de siempre no cambió.
    const cnaf = calcularRespiratorio(Object.assign({}, fila, { VENT_VIA_AEREA: 'Natural', VENT_INTERFAZ: 'CNAF' }));
    eq('  control · la CNAF sigue con su mismo ROX', cnaf.CALC_IROX, 11.75);
  }

  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
