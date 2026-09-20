// interfaz_estado_final.js — TRAS UN EVENTO, EL DISPOSITIVO TAMBIÉN VIAJA.
//
// 🔴 DE DÓNDE SALE. Los tres ejes del respiratorio (16-sep-2026) partieron el
// estado del turno en vía aérea · soporte · INTERFAZ. Dos sitios quedaron sin
// el tercer eje, y Diego aprobó cerrarlos:
//
//   1. Los paneles «queda con» de INTUBACIÓN, REINTUBACIÓN y TRAQUEOSTOMÍA
//      preguntaban soporte y modo, nada más. Un paciente que se traqueostomiza
//      y queda en oxigenoterapia NO TENÍA DÓNDE anotar si quedó con HME, tubo
//      en T, CTAF, CNAF o válvula de fonación: el dato se perdía.
//   2. El estado FINAL del turno no tenía columna de interfaz, así que el
//      dispositivo terminaba escrito en `VENT_MODO_FINAL` — la forma vieja, la
//      que los tres ejes vinieron a corregir.
//
// 🔴 Y EL CASO QUE ESTO DESTAPA: al quedar el modo vacío (la oxigenoterapia no
// tiene modo ventilatorio), el sincronizador de la cama hacía
// `MODO: val(modoFin, cama.MODO)` — con el modo final vacío se queda con el
// ANTERIOR. O sea: un paciente extubado a naricera heredaba el «CPAP/PS» de
// cuando estaba en VM, y el turno siguiente abría con ese modo puesto. Es la
// misma trampa del respaldo de `cascadeSop`, y acá cruza el turno.
//
// 🪤 Reloj: el simulador lo tiene congelado (SIM).
//
// Uso: node build/checks/interfaz_estado_final.js (requiere playwright-core)
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const v2 = path.resolve(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g) + (ok ? '' : ' (esperado ' + JSON.stringify(w) + ')'));
  if (!ok) fails.push(l); };
const si = (l, c) => eq(l, !!c, true);

(async () => {
  /* ══ 1 · LAS CUATRO COLUMNAS, AL FINAL ════════════════════════════════════ */
  console.log('1 · El esquema');
  const esq = fs.readFileSync(path.join(v2, 'esquema.gs'), 'utf8');
  const COLS = (() => {
    const m = /_COLS_EVOLUCIONES\s*=\s*\[([\s\S]*?)\n\];/.exec(esq);
    return m ? Array.from(m[1].matchAll(/\['([A-Z_0-9]+)'/g)).map(x => x[1]) : [];
  })();
  const i = n => COLS.indexOf(n);
  ['INTUB_INTERFAZ_POST', 'REINTUB_INTERFAZ_POST', 'TQT_INTERFAZ_POST', 'VENT_INTERFAZ_FINAL']
    .forEach(n => si('  existe ' + n, i(n) >= 0));
  si('  ★ las cuatro entraron DESPUÉS de VENT_INTERFAZ, no al medio',
     i('INTUB_INTERFAZ_POST') > i('VENT_INTERFAZ') &&
     i('REINTUB_INTERFAZ_POST') > i('VENT_INTERFAZ') &&
     i('TQT_INTERFAZ_POST') > i('VENT_INTERFAZ') &&
     i('VENT_INTERFAZ_FINAL') > i('VENT_INTERFAZ'));
  si('  ★ y el total declarado está al día', /TOTAL_COLS\.EVOLUCIONES !== 409/.test(esq));
  si('  ★ las cuatro traen su rótulo legible',
     ['INTUB_INTERFAZ_POST', 'REINTUB_INTERFAZ_POST', 'TQT_INTERFAZ_POST', 'VENT_INTERFAZ_FINAL']
       .every(n => new RegExp("\\['" + n + "','texto','[^']+'\\]").test(esq)));

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

  /* ══ 2 · LOS TRES PANELES OFRECEN EL TERCER EJE ═══════════════════════════
     Y lo ofrecen desde el MISMO catálogo (VMAPS), no con una lista aparte: un
     segundo catálogo haría que un dispositivo nuevo aparezca en el turno y no
     tras el evento. Se esconde cuando no hay nada que elegir: con VM invasiva
     la vía aérea ya dice cuál es la interfaz. */
  console.log('\n2 · Los paneles «queda con» ofrecen la interfaz');
  const panel = (quien, sop) => p.evaluate(([quien, sop]) => {
    $('kf').reset(); $('cBed').value = '3'; DB = [{ ID_CAMA: '3' }];
    _vmHistFlag = true; _diasVMPrevios = 3; _diasVMEpisodio = 3; _nReintub = 0;
    $('fVA').value = 'TOT'; cascadeVA('VM'); cascadeSop('CPAP/PS'); updateVAUI();
    const cfg = {
      intub:   { chk: 'cIntubO',       sop: 'poIntubSop',    iface: 'poIntubInterfaz',    w: 'wIntubInterfaz',    render: () => renderParamsIntub() },
      tqt:     { chk: 'cTqtO',         sop: 'poTqtSop',      iface: 'poTqtInterfaz',      w: 'wTqtInterfaz',      render: () => renderParamsTqt() },
      reintub: { chk: 'cReintubT',     sop: 'poReintubSop',  iface: 'poReintubInterfaz',  w: 'wReintubInterfaz',  render: () => renderParamsReintub() },
    }[quien];
    const c = $(cfg.chk); if (c && !c.checked) { c.checked = true; }
    if (quien === 'intub' && typeof hIntub === 'function') hIntub();
    if (quien === 'tqt' && typeof hTqt === 'function') hTqt();
    if (quien === 'reintub' && typeof _panelReintub === 'function') _panelReintub('dReintubDetT');
    const s = $(cfg.sop); if (s) s.value = sop;
    cfg.render();
    const sel = $(cfg.iface);
    const caja = $(cfg.w);
    return {
      existe: !!sel,
      opciones: sel ? Array.from(sel.options).map(o => o.value).filter(Boolean) : [],
      visible: caja ? caja.style.display !== 'none' : null,
    };
  }, [quien, sop]);
  {
    const t = await panel('tqt', 'Oxigenoterapia/OAF');
    si('  ★ la traqueostomía ofrece interfaz al quedar en oxigenoterapia', t.existe && t.visible);
    eq('  ★ …con el catálogo de la TQT, el mismo del turno',
       t.opciones.join(','), 'HME,Tubo T,CTAF,CNAF,Válvula de fonación');
    const tvm = await panel('tqt', 'VM');
    eq('  control · en VM no hay interfaz que elegir (el tubo ya la dice)', tvm.visible, false);
    const it = await panel('intub', 'Oxigenoterapia/OAF');
    si('  ★ la intubación también', it.existe && it.visible);
    eq('  ★ …con el catálogo del TOT', it.opciones.join(','), 'HME,Tubo T,CNAF');
    const rt = await panel('reintub', 'Oxigenoterapia/OAF');
    si('  ★ y la reintubación', rt.existe && rt.visible);
    eq('  ★ …también con el del TOT', rt.opciones.join(','), 'HME,Tubo T,CNAF');
  }

  /* ══ 3 · EL PAYLOAD LLEVA EL DISPOSITIVO ══════════════════════════════════ */
  console.log('\n3 · Lo que se guarda tras cada evento');
  const guardar = cfg => p.evaluate(async cfg => {
    $('kf').reset(); $('cBed').value = '3'; DB = [{ ID_CAMA: '3' }];
    _vmHistFlag = true; _diasVMPrevios = 3; _diasVMEpisodio = 3; _nReintub = 0; _transIntubEsteTurno = false;
    const opt = document.createElement('option'); opt.value = 'DMV'; opt.textContent = 'DMV';
    $('fFirma').appendChild(opt); $('fFirma').value = 'DMV';
    /* 🔴 20-sep-2026 · La hemodinamia es OBLIGATORIA para guardar (Diego: «HDN pedir antes de avanzar»), así que el banco la llena como la llenaría un colega. 🪤 A propósito NO se rellena sola al cargar la página: eso recrearía dentro del banco justo el bug que se quitó —el dato puesto por el programa— y las guardias dejarían de ver el caso «nadie la miró». */
    {const _he=document.getElementById('fHEst'); if(_he&&!_he.value){_he.value='Estable';} const _hd=document.getElementById('fDVA'); if(_hd&&!_hd.value){_hd.value='Sin requerimientos';}}
    $('fVA').value = cfg.va; cascadeVA(cfg.sop); cascadeSop(cfg.modo || '', cfg.iface || '');
    updateVAUI();
    if (cfg.pasos) await (new Function('cfg', 'return (async()=>{' + cfg.pasos + '})()'))(cfg);
    _transAvisoOk = true; window._ll.length = 0;
    guardar();
    await new Promise(r => setTimeout(r, 300));
    const c = _ll.find(x => x.a === 'GUARDAR_EVOLUCION');
    return c ? c.d : null;
  }, cfg);

  {
    // Traqueostomía que queda en oxigenoterapia con CTAF
    // 🪤 Se marca con click(), como lo hace el formulario: poner `.checked` a
    // mano no dispara el manejador y la transición TOT→TQT queda sin evento
    // declarado, así que el aviso de cambio sin evento frena el guardado.
    const d = await guardar({ va: 'TOT', sop: 'VM', modo: 'CPAP/PS', pasos: `
      hPVEtoggle('nc');   // con TOT el turno exige declarar la PVE
      await new Promise(x => setTimeout(x, 60));
      $('cTqtO').click();
      $('fTqtHora').value = '11:00'; $('fTqtTec').value = 'Percutánea';
      $('poTqtSop').value = 'Oxigenoterapia/OAF'; renderParamsTqt();
      $('poTqtInterfaz').value = 'CTAF'; renderParamsTqt();
    ` });
    si('  la traqueostomía guarda', !!d);
    eq('  ★ TQT_INTERFAZ_POST lleva el dispositivo', d && d.TQT_INTERFAZ_POST, 'CTAF');
    eq('  ★★ y el estado final del turno también', d && d.VENT_INTERFAZ_FINAL, 'CTAF');
    eq('  ★ …con el modo VACÍO: la oxigenoterapia no tiene modo', d && (d.VENT_MODO_FINAL || ''), '');
    eq('  …y la vía aérea final es TQT', d && d.VENT_VIA_AEREA_FINAL, 'TQT');
  }
  {
    // Intubación: queda en VM invasiva → no hay interfaz
    const d = await guardar({ va: 'Natural', sop: 'Oxigenoterapia/OAF', iface: 'NRC', pasos: `
      $('cIntubO').click();
      $('fIntubHora').value = '02:00'; $('poIntubModo').value = 'ACVC';
    ` });
    si('  la intubación guarda', !!d);
    eq('  ★ en VM invasiva la interfaz final va vacía', d && (d.VENT_INTERFAZ_FINAL || ''), '');
    eq('  …y el modo final es el ventilatorio', d && d.VENT_MODO_FINAL, 'ACVC');
    eq('  …mientras el PREVIO conserva su dispositivo', d && d.VENT_INTERFAZ, 'NRC');
  }
  {
    // Sin ningún evento: el final es el del turno
    const d = await guardar({ va: 'TQT', sop: 'Oxigenoterapia/OAF', iface: 'Válvula de fonación' });
    si('  un turno sin eventos guarda', !!d);
    eq('  ★ la interfaz final es la del turno', d && d.VENT_INTERFAZ_FINAL, 'Válvula de fonación');
  }
  {
    // Extubación a naricera: el dispositivo va a la interfaz, no al modo
    const d = await guardar({ va: 'TOT', sop: 'VM', modo: 'CPAP/PS', pasos: `
      hPVEtoggle('si');
      const rb = document.querySelector('input[name="pveRes"][value="superada"]');
      if (rb) { rb.checked = true; rb.dispatchEvent(new Event('change', { bubbles: true })); }
      await new Promise(x => setTimeout(x, 80));
      $('fExtHora').value = '08:00';
      $('peModo').value = 'NRC'; renderParamsPE();
    ` });
    si('  la extubación guarda', !!d);
    eq('  ★ tras extubar a naricera, el dispositivo va en la interfaz final', d && d.VENT_INTERFAZ_FINAL, 'NRC');
    eq('  ★★ …y NO en el modo final', d && (d.VENT_MODO_FINAL || ''), '');
    eq('  …con soporte oxigenoterapia', d && d.VENT_SOPORTE_FINAL, 'Oxigenoterapia/OAF');
  }

  eq('sin errores de JavaScript', errs.length, 0);
  if (errs.length) errs.forEach(e => console.log('   ' + e));
  await b.close();

  /* ══ 4 · LA CAMA HEREDA EL DISPOSITIVO, Y NO HEREDA EL MODO VIEJO ═════════
     Es la parte que cruza el turno: si la cama se queda con el modo anterior,
     el colega del turno siguiente abre el formulario con «CPAP/PS» puesto en
     un paciente que está con naricera. */
  console.log('\n4 · Servidor: la cama del turno siguiente');
  {
    const { api, DB, SIM } = require('../sim/sim_srv.js');
    const cama = id => DB.CAMAS_ESTADO.find(c => String(c.ID_CAMA) === String(id)) || {};
    let r = api('INGRESAR_PACIENTE', { idCama: '7', nombre: 'Paciente Interfaz', edad: 60, sexo: 'M',
      diagnostico: 'NAC', fechaIngreso: SIM.fecha, viaAerea: 'TOT', soporte: 'VM', modo: 'CPAP/PS',
      firmaKine: 'DMV' }, null);
    si('  ingresa un paciente en VM', r.ok);
    eq('  …y la cama queda en CPAP/PS', cama(7).MODO, 'CPAP/PS');
    r = api('GUARDAR_EVOLUCION', {
      idCama: '7', turnoKey: SIM.fecha + '-Dia', FECHA: SIM.fecha, TURNO: 'Dia',
      VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', VENT_MODO: 'CPAP/PS',
      VENT_PS: 10, VENT_PEEP: 6, VENT_FIO2: 30,
      EXT_OCURRIO: true, EXT_HORA: '08:00', EXT_TIPO: 'protocolo',
      EXT_PE_VA: 'Natural', EXT_PE_SOP: 'Oxigenoterapia/OAF', EXT_PE_MODO: 'NRC',
      VENT_VIA_AEREA_FINAL: 'Natural', VENT_SOPORTE_FINAL: 'Oxigenoterapia/OAF',
      VENT_MODO_FINAL: '', VENT_INTERFAZ_FINAL: 'NRC',
      SED_TIPO: 'Sin sedación', HEMO_ESTADO: 'Estable', PLAN_FIRMA_KINE: 'DMV',
    }, null);
    si('  el turno que extuba guarda', r.ok);
    eq('  ★ la cama queda con vía aérea natural', cama(7).VIA_AEREA, 'Natural');
    eq('  ★ …y con la naricera como interfaz', cama(7).INTERFAZ, 'NRC');
    eq('  ★★ …y el modo se VACÍA: ya no hay modo ventilatorio',
       String(cama(7).MODO || ''), '');
  }

  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLO(S)' : '\n✅ TODO OK — el dispositivo cruza el evento y el turno');
  process.exit(fails.length ? 1 : 0);
})();
