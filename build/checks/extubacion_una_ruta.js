// extubacion_una_ruta.js — LA EXTUBACIÓN SE PREGUNTA UNA SOLA VEZ.
//
// 🔴 DE DÓNDE SALE (Diego, 16-sep-2026, revisando el bloque respiratorio campo
// por campo): «1 si unifica. Esto resolvería el cómo queda luego de ese evento
// en particular. Y comparte la lógica que ya está».
//
// LO QUE HABÍA. La extubación se llega por dos caminos —con PVE superada y sin
// PVE— y cada camino traía su propia COPIA de las mismas cinco preguntas:
//
//     concepto                  camino PVE        camino sin PVE
//     ─────────────────────────────────────────────────────────────
//     con qué queda             peModo            peModoNo
//     sus parámetros            peParamsBox       peParamsBoxNo
//     evaluación post           fPostExtDet       fPostExtDetNo
//     ¿hubo reintubación?       cReintub          cReintubNo
//     hora de la reintubación   fReintubHoraN1    fReintubHoraN2
//     razón de la reintubación  fReintubRaz       fReintubRazNo
//
// Y con ellas una copia entera del dibujante de parámetros: `renderParamsPEno`
// son sesenta líneas que empiezan diciendo «reutiliza misma lógica que
// renderParamsPE» y no reutilizan nada. Dos lugares para la misma pregunta es
// un lugar donde quedar a medias: la Venturi se arregló en los dos por suerte,
// no por diseño.
//
// LA FORMA BUENA YA ESTABA EN LA CASA: el panel «Queda con» de la reintubación
// es UNO solo y se INSERTA en la rama que esté activa (`_panelReintub`). Esta
// tanda aplica el mismo patrón al resto del bloque.
//
// EL CONTRATO QUE NO PUEDE MOVERSE: los dos caminos ya guardaban EXACTAMENTE lo
// mismo. Esta guardia lo mide campo por campo antes y después, porque unificar
// la pantalla no puede cambiar ni una celda de lo que llega a la planilla.
//
// 🪤 El reloj no se toca: las horas se escriben a mano en el formulario.
//
// Uso: node build/checks/extubacion_una_ruta.js (requiere playwright-core)
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const v2 = path.resolve(__dirname, '..', '..', 'v2');

const DUPLICADOS = ['peModoNo', 'peParamsBoxNo', 'fPostExtDetNo', 'cReintubNo',
                    'dReintubDetNo', 'fReintubHoraN2', 'fReintubRazNo',
                    'peFRNo', 'peLtNo', 'peFNo', 'peIroxNo', 'peIPAPNo', 'peEPAPNo',
                    'peFiO2No', 'peSpO2No'];

// Lo que llega a la planilla. Los dos caminos tienen que coincidir en TODO esto.
const CONTRATO = ['EXT_OCURRIO', 'EXT_HORA', 'EXT_PE_VA', 'EXT_PE_SOP', 'EXT_PE_MODO',
                  'EXT_POST_DET', 'EXT_REINTUB', 'EXT_REINTUB_RAZ', 'REINTUB_HORA',
                  'VENT_VIA_AEREA_FINAL', 'VENT_SOPORTE_FINAL', 'VENT_MODO_FINAL',
                  'VENT_INTERFAZ_FINAL'];

(async () => {
  const fails = [];
  const eq = (l, g, w) => { const ok = String(g) === String(w);
    console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g) + (ok ? '' : ' (esperado ' + JSON.stringify(w) + ')'));
    if (!ok) fails.push(l); };
  const si = (l, c) => eq(l, !!c, true);

  /* ══ 1 · NO QUEDA UNA SEGUNDA COPIA DE NINGUNA PREGUNTA ══════════════════ */
  console.log('1 · El formulario pregunta una sola vez');
  const idx = fs.readFileSync(path.join(v2, 'index.html'), 'utf8');
  DUPLICADOS.forEach(id =>
    eq('  ya no existe #' + id, new RegExp('id="' + id + '"').test(idx), false));
  eq('  ★ y el dibujante duplicado se fue', /function renderParamsPEno\b/.test(idx), false);
  eq('  ★ …y su manejador de casilla también', /function hReintubCheckNo\b/.test(idx), false);
  si('  el dibujante que queda sigue ahí', /function renderParamsPE\b/.test(idx));

  /* ══ 2 · LA MÁSCARA DE VNI YA NO ES UNA VÍA AÉREA ════════════════════════
     `_PE_META` traduce «con qué queda» a vía aérea y soporte. Para los tres
     modos de VNI decía `va:'Full Face'` — un valor que dejó de ser vía aérea el
     16-sep-2026 («full face y oronasal no son invasivo», Diego). Quedaba
     escrito en VENT_VIA_AEREA_FINAL de cada extubación a VNI: se lee gracias al
     traductor de compatibilidad, pero se sigue ESCRIBIENDO mal. */
  console.log('\n2 · La extubación a VNI deja vía aérea natural');
  {
    const bloque = (idx.match(/const _PE_META=\{[\s\S]*?\n\};/) || [''])[0];
    si('  el mapa existe', bloque !== '');
    ['S/T', 'AVAPS', 'CPAP'].forEach(m => {
      const linea = (bloque.split('\n').find(l => l.indexOf("'" + m + "'") === 0 || l.trim().indexOf("'" + m + "'") === 0) || '');
      eq('  ★ ' + m + ' deja vía aérea Natural', /va:\s*'Natural'/.test(linea), true);
      eq('    …con soporte VNI', /sop:\s*'VNI'/.test(linea), true);
    });
    eq("  ★★ y ya no se escribe 'Full Face' como vía aérea", /va:\s*'Full Face'/.test(bloque), false);
  }

  /* ══ 3 · LOS DOS CAMINOS GUARDAN LO MISMO ════════════════════════════════ */
  console.log('\n3 · Con PVE y sin PVE: el mismo payload, campo por campo');
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window._ll = [];
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
      api(a, d) { window._ll.push({ a, d }); setTimeout(() => ok({ ok: true, data: (a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null) }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.join(v2, 'index.html'));
  await p.waitForTimeout(500);

  /** Recorre un camino completo por la pantalla y devuelve lo que se mandó. */
  const recorrer = ruta => p.evaluate(async ruta => {
    $('kf').reset(); $('cBed').value = '3'; DB = [{ ID_CAMA: '3' }];
    _vmHistFlag = true; _diasVMPrevios = 3; _diasVMEpisodio = 3; _nReintub = 0; _transIntubEsteTurno = false;
    const opt = document.createElement('option'); opt.value = 'DMV'; opt.textContent = 'DMV';
    $('fFirma').appendChild(opt); $('fFirma').value = 'DMV';
    /* 🔴 20-sep-2026 · La hemodinamia es OBLIGATORIA para guardar (Diego: «HDN pedir antes de avanzar»), así que el banco la llena como la llenaría un colega. 🪤 A propósito NO se rellena sola al cargar la página: eso recrearía dentro del banco justo el bug que se quitó. */
    {const _he=document.getElementById('fHEst'); if(_he&&!_he.value){_he.value='Estable';} const _hd=document.getElementById('fDVA'); if(_hd&&!_hd.value){_hd.value='Sin requerimientos';}}
    /* 🔴 20-sep-2026 · La hemodinamia es OBLIGATORIA para guardar (Diego: «HDN pedir antes de avanzar»), así que el banco la llena como la llenaría un colega. 🪤 A propósito NO se rellena sola al cargar la página: eso recrearía dentro del banco justo el bug que se quitó —el dato puesto por el programa— y las guardias dejarían de ver el caso «nadie la miró». */
    {const _he=document.getElementById('fHEst'); if(_he&&!_he.value){_he.value='Estable';} const _hd=document.getElementById('fDVA'); if(_hd&&!_hd.value){_hd.value='Sin requerimientos';}}
    $('fVA').value = 'TOT'; cascadeVA('VM'); cascadeSop('CPAP/PS');
    updateVAUI();
    const r = {};
    if (ruta === 'si') {
      hPVEtoggle('si');
      const rb = document.querySelector('input[name="pveRes"][value="superada"]');
      if (rb) { rb.checked = true; rb.dispatchEvent(new Event('change', { bubbles: true })); }
      await new Promise(x => setTimeout(x, 80));
      if ($('fExtHora')) $('fExtHora').value = '08:00';
      r.rama = 'dPVESupExtSi';
    } else {
      hPVEtoggle('no');
      const sp = $('cExtSinPve');
      if (sp) { sp.checked = true; sp.dispatchEvent(new Event('change', { bubbles: true })); }
      await new Promise(x => setTimeout(x, 80));
      const t = document.querySelector('input[name="extTipo"]');
      if (t) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); }
      await new Promise(x => setTimeout(x, 80));
      if ($('fExtHoraNo')) $('fExtHoraNo').value = '08:00';
      r.rama = 'dExtNoDetalle';
    }
    // ★ EL PANEL ES UNO SOLO Y SE MUDA A LA RAMA ACTIVA (patrón _panelReintub)
    const panel = $('dExtPost');
    r.panelUnico = !!panel;
    r.panelEnRama = !!(panel && $(r.rama) && $(r.rama).contains(panel));
    r.panelVisible = !!(panel && !panel.classList.contains('hidden'));
    // Las mismas respuestas, en los mismos campos, venga por donde venga
    if ($('peModo')) { $('peModo').value = 'NRC'; renderParamsPE(); }
    if ($('pe_litros')) $('pe_litros').value = '3';
    if ($('fPostExtDet')) $('fPostExtDet').value = 'tolera bien';
    _transAvisoOk = true; window._ll.length = 0;
    guardar();
    await new Promise(x => setTimeout(x, 300));
    const c = _ll.find(x => x.a === 'GUARDAR_EVOLUCION');
    r.d = c ? c.d : null;
    return r;
  }, ruta);

  const A = await recorrer('si');
  const B = await recorrer('no');
  si('  el camino con PVE guarda', !!A.d);
  si('  el camino sin PVE guarda', !!B.d);
  si('  ★ el panel de «cómo queda» es UNO solo', A.panelUnico && B.panelUnico);
  si('  ★ …y vive dentro de la rama con PVE cuando se llega por ahí', A.panelEnRama);
  si('  ★ …y dentro de la rama sin PVE cuando se llega por la otra', B.panelEnRama);
  si('  …visible en las dos', A.panelVisible && B.panelVisible);
  CONTRATO.forEach(k => eq('  ' + k + ' coincide', JSON.stringify((A.d || {})[k]), JSON.stringify((B.d || {})[k])));
  // Y los valores concretos, para que «coinciden» no pueda ser «los dos vacíos»
  eq('  ★★ …y no coinciden en vacío: EXT_PE_MODO', (A.d || {}).EXT_PE_MODO, 'NRC');
  eq('  ★★ …EXT_PE_SOP', (A.d || {}).EXT_PE_SOP, 'Oxigenoterapia/OAF');
  eq('  ★★ …EXT_POST_DET', (A.d || {}).EXT_POST_DET, 'tolera bien');
  /* 🗂️ 17-sep-2026 · EL DISPOSITIVO YA NO VIAJA EN EL MODO FINAL. Esta línea
     pedía `VENT_MODO_FINAL === 'NRC'`, que era la forma vieja: una naricera no
     es un modo ventilatorio, y con los tres ejes el dispositivo tiene su propia
     columna. El cambio es deliberado (aprobado por Diego) y lo cuida
     `interfaz_estado_final.js`; acá se mide que el turno cierre con el
     dispositivo donde va Y con el modo vacío, que es lo que evita que la cama
     del turno siguiente herede un «CPAP/PS» fantasma. */
  eq('  ★★ …y el estado final del turno lleva el dispositivo', (A.d || {}).VENT_INTERFAZ_FINAL, 'NRC');
  eq('  ★★ …con el modo final VACÍO (la oxigenoterapia no tiene modo)', (A.d || {}).VENT_MODO_FINAL || '', '');

  /* ══ 4 · LA REINTUBACIÓN, TAMBIÉN UNA SOLA ═══════════════════════════════ */
  console.log('\n4 · La reintubación desde la extubación: una hora y una razón');
  const conReintub = ruta => p.evaluate(async ruta => {
    $('kf').reset(); $('cBed').value = '3'; DB = [{ ID_CAMA: '3' }];
    _vmHistFlag = true; _diasVMPrevios = 3; _diasVMEpisodio = 3; _nReintub = 0; _transIntubEsteTurno = false;
    const opt = document.createElement('option'); opt.value = 'DMV'; opt.textContent = 'DMV';
    $('fFirma').appendChild(opt); $('fFirma').value = 'DMV';
    /* 🔴 20-sep-2026 · La hemodinamia es OBLIGATORIA para guardar (Diego: «HDN pedir antes de avanzar»), así que el banco la llena como la llenaría un colega. 🪤 A propósito NO se rellena sola al cargar la página: eso recrearía dentro del banco justo el bug que se quitó. */
    {const _he=document.getElementById('fHEst'); if(_he&&!_he.value){_he.value='Estable';} const _hd=document.getElementById('fDVA'); if(_hd&&!_hd.value){_hd.value='Sin requerimientos';}}
    $('fVA').value = 'TOT'; cascadeVA('VM'); cascadeSop('CPAP/PS');
    updateVAUI();
    if (ruta === 'si') {
      hPVEtoggle('si');
      const rb = document.querySelector('input[name="pveRes"][value="superada"]');
      if (rb) { rb.checked = true; rb.dispatchEvent(new Event('change', { bubbles: true })); }
      await new Promise(x => setTimeout(x, 80));
      if ($('fExtHora')) $('fExtHora').value = '08:00';
    } else {
      hPVEtoggle('no');
      const sp = $('cExtSinPve');
      if (sp) { sp.checked = true; sp.dispatchEvent(new Event('change', { bubbles: true })); }
      await new Promise(x => setTimeout(x, 80));
      const t = document.querySelector('input[name="extTipo"]');
      if (t) { t.checked = true; t.dispatchEvent(new Event('change', { bubbles: true })); }
      await new Promise(x => setTimeout(x, 80));
      if ($('fExtHoraNo')) $('fExtHoraNo').value = '08:00';
    }
    $('cReintub').click();
    await new Promise(x => setTimeout(x, 60));
    if (typeof _mrResolver === 'function') _mrResolver(true);
    await new Promise(x => setTimeout(x, 150));
    $('fReintubHoraN1').value = '11:30';
    $('fReintubRaz').value = 'Falla respiratoria post extubación';
    if ($('poReintubModo')) { $('poReintubModo').value = 'ACVC'; }
    _transAvisoOk = true; window._ll.length = 0;
    guardar();
    await new Promise(x => setTimeout(x, 300));
    const c = _ll.find(x => x.a === 'GUARDAR_EVOLUCION');
    return c ? c.d : null;
  }, ruta);
  const RA = await conReintub('si');
  const RB = await conReintub('no');
  si('  se guarda por el camino con PVE', !!RA);
  si('  se guarda por el camino sin PVE', !!RB);
  eq('  ★ la reintubación viaja marcada (con PVE)', (RA || {}).EXT_REINTUB, true);
  eq('  ★ …y sin PVE también', (RB || {}).EXT_REINTUB, true);
  eq('  ★ la hora viaja (con PVE)', (RA || {}).REINTUB_HORA, '11:30');
  eq('  ★ …y sin PVE es la misma casilla', (RB || {}).REINTUB_HORA, '11:30');
  eq('  ★ la razón viaja (con PVE)', (RA || {}).EXT_REINTUB_RAZ, 'Falla respiratoria post extubación');
  eq('  ★ …y sin PVE también', (RB || {}).EXT_REINTUB_RAZ, 'Falla respiratoria post extubación');
  eq('  el paciente queda intubado, no en natural', (RA || {}).VENT_VIA_AEREA_FINAL, 'TOT');

  eq('sin errores de JavaScript', errs.length, 0);
  if (errs.length) errs.forEach(e => console.log('   ' + e));
  await b.close();
  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLO(S)' : '\n✅ TODO OK — una sola extubación');
  process.exit(fails.length ? 1 : 0);
})();
