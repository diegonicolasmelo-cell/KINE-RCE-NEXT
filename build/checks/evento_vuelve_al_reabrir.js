// evento_vuelve_al_reabrir.js — Lo que se registró VUELVE a la pantalla cuando
// se reabre el turno (Diego, 21-sep-2026).
//
// LO QUE CONTÓ DIEGO, del hospital: «ayer una extubación… yo no había
// registrado una extubación porque mi plan no era extubarlo y terminé
// extubando un paciente igual dos horas después de haber evolucionado la
// primera vez, y pasó que ya no me ofrecía el modal de extubación, y eso me
// causó cuidado; y luego cuando logré entre comillas registrar, no me aparecía
// en la extubación contada. Lo que yo necesito es un flujo en que lo que anote
// pueda seguir registrando después.»
//
// 🔴 LO QUE SE ENCONTRÓ. `fillForm()` —el camino que carga un turno YA
// GUARDADO para re-editarlo— repone la intubación y la traqueostomía enteras,
// pero del bloque PVE/EXTUBACIÓN y del de DECANULACIÓN no repone NADA. Se
// reprodujo con un turno que traía la extubación completa (PVE superada, hora
// 19:10, motivo, evaluación post, queda con CNAF):
//
//     el bloque de extubación   oculto
//     la PVE declarada          vacía
//     la hora, el motivo, el post   vacíos
//     _extOcurrio()             false
//
// O sea: el colega no ve lo que registró, no lo puede corregir, y si extubó
// DESPUÉS de evolucionar tiene que reconstruir el camino a ciegas.
//
// 🪤 EL DATO NO SE PIERDE EN LA PLANILLA, y eso es lo que hizo que nadie lo
// notara antes: el cliente quita esos campos del payload (`del()`), el
// servidor fusiona con la fila anterior (`if (!(k in datos)) datos[k] =
// _prev[k]`) y la extubación sobrevive en la hoja. Lo que se pierde es la
// PANTALLA — que es donde el colega decide si quedó registrado o no. Por eso
// la guardia mide la pantalla y el `_extOcurrio()`, no la hoja.
//
// 🪤 El reloj va congelado: fecha inventada (12-ago-2026, fuera de las ventanas
// trampa) y turno forzado.
//
// Uso: node build/checks/evento_vuelve_al_reabrir.js
const path = require('path');
const { chromium } = require('playwright-core');
const V2 = path.resolve(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

const BASE = {
  ID_CAMA: '3', TURNO_KEY: '2026-08-12-Dia', PATIENT_ID: 'p3', ES_INGRESO: false,
  PAC_NOMBRE: 'P', PAC_EDAD: 61, PAC_SEXO: 'M',
  VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', VENT_MODO: 'CPAP/PS',
  VENT_TOT_NUM: '7.5', VENT_TOT_CM: '22',
  HEMO_ESTADO: 'Estable', HEMO_DVA: 'Sin requerimientos',
  PLAN_FIRMA_KINE: 'K.P.', DIAS_VM: 5, DIAS_VA: 5,
};
const evo = x => Object.assign({}, BASE, x);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 1200 }, locale: 'es-CL' });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.__evo = null;
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
      api(a) { let data = null;
        if (a === 'GET_CONFIG_UI') data = { NUM_CAMAS: 12, BANNERS: {} };
        else if (a === 'GET_EVO_TURNO') data = { actual: window.__evo, previa: null, pronoAbierto: '' };
        setTimeout(() => ok({ ok: true, data }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.join(V2, 'index.html'));
  await p.waitForTimeout(800);

  /* Reabre la cama con ese turno YA guardado, como hace el colega al volver. */
  const reabrir = g => p.evaluate(x => {
    window.__evo = x;
    $('kf').reset();
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', EDAD: 61, SEXO: 'M',
            VIA_AEREA: 'TOT', SOPORTE: 'VM', FECHA_INGRESO: '2026-08-07' }];
    window.recargarSilencioso = () => {};
    $('gDate').value = '2026-08-12'; SHIFT = 'Dia';
    renderGrid(); abrirPanel('3', false, false);
  }, g).then(() => p.waitForTimeout(850))
       .then(() => p.evaluate(() => { window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]); pasoIr(2); }))
       .then(() => p.waitForTimeout(400));

  /* 🪤 CADA COSA SE MIDE DONDE VIVE: fuera del paso 2 las tarjetas del turno
     están `paso-oculto` y dan «oculto» sin que nada esté roto. */
  const ver = sel => p.evaluate(s => { const e = document.querySelector(s);
    if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0);
  }, sel);

  /* ══ 1 · Una extubación CON protocolo vuelve entera ═══════════════════ */
  console.log('\n1 · 🔴 La extubación con PVE superada vuelve a la pantalla');
  await reabrir(evo({
    PVE_VAL: 'si', PVE_RESULTADO: 'superada',
    EXT_OCURRIO: true, EXT_HORA: '19:10', EXT_TIPO: 'Programada',
    EXT_MOTIVO: 'Indicación médica', EXT_POST_DET: 'sin estridor, voz conservada',
    EXT_PE_MODO: 'CNAF',
    VENT_VIA_AEREA_FINAL: 'Natural', VENT_SOPORTE_FINAL: 'Oxigenoterapia/OAF',
  }));
  si('★★ el bloque de extubación se ve (aunque la vía aérea ya sea natural)', await ver('#dExtSec'));
  eq('★★ la PVE declarada vuelve', await p.evaluate(() => v('fPVEval')), 'si');
  si('★★ …y su rama está abierta', await ver('#dPVESiRama'));
  eq('★★ el resultado de la PVE vuelve',
     await p.evaluate(() => document.querySelector('input[name="pveRes"]:checked')?.value || ''), 'superada');
  eq('★★ la hora de extubación vuelve', await p.evaluate(() => v('fExtHora')), '19:10');
  si('★★ …y la app vuelve a saber que hubo extubación',
     await p.evaluate(() => _extOcurrio()));
  eq('★ la evaluación post vuelve', await p.evaluate(() => v('fPostExtDet')), 'sin estridor, voz conservada');
  eq('★ …y con qué quedó', await p.evaluate(() => v('peModo')), 'CNAF');

  /* ══ 2 · Una extubación SIN protocolo vuelve con su tipo ══════════════ */
  console.log('\n2 · 🔴 La extubación sin PVE vuelve con su tipo');
  await reabrir(evo({
    PVE_VAL: 'no', PVE_SC_RAZON: 'Agitación psicomotora',
    EXT_OCURRIO: true, EXT_HORA: '03:40', EXT_TIPO: 'autoextubacion',
    EXT_MOTIVO: 'Agitación psicomotora',
    VENT_VIA_AEREA_FINAL: 'Natural', VENT_SOPORTE_FINAL: 'Oxigenoterapia/OAF',
  }));
  eq('★★ la PVE «no» vuelve', await p.evaluate(() => v('fPVEval')), 'no');
  si('★★ …y la casilla «hubo extubación sin PVE» queda marcada',
     await p.evaluate(() => !!document.getElementById('cExtSinPve').checked));
  eq('★★ el tipo vuelve',
     await p.evaluate(() => document.querySelector('input[name="extTipo"]:checked')?.value || ''), 'autoextubacion');
  eq('★★ la hora vuelve', await p.evaluate(() => v('fExtHoraNo')), '03:40');
  si('★★ …y la app sabe que hubo extubación', await p.evaluate(() => _extOcurrio()));

  /* ══ 3 · La decanulación también ══════════════════════════════════════ */
  console.log('\n3 · 🔴 La decanulación vuelve entera');
  await reabrir(evo({
    VENT_VIA_AEREA: 'TQT', VENT_VIA_AEREA_FINAL: 'Natural',
    DECAN_OCURRIO: true, DECAN_HORA: '11:30', DECAN_TIPO: 'protocolo',
    DECAN_QUEDA_DISP: 'Cánula nasal', DECAN_QUEDA_SPO2: '96',
    DECAN_DET: 'estoma limpio, sin disnea',
  }));
  si('★★ la casilla de decanulación vuelve marcada',
     await p.evaluate(() => !!document.getElementById('cDecanOcurrio').checked));
  eq('★★ la hora vuelve', await p.evaluate(() => v('fDecanHora')), '11:30');
  eq('★★ el tipo vuelve',
     await p.evaluate(() => document.querySelector('input[name="decanTipo"]:checked')?.value || ''), 'protocolo');
  eq('★ con qué quedó vuelve', await p.evaluate(() => v('fDecanQueda')), 'Cánula nasal');
  eq('★ y el detalle', await p.evaluate(() => v('fDecanDet')), 'estoma limpio, sin disnea');

  /* ══ 4 · El caso de Diego: extubar DESPUÉS de haber evolucionado ══════ */
  console.log('\n4 · 🔴 El caso de Diego: se evolucionó sin extubar, y se extubó después');
  await reabrir(evo({ PVE_VAL: 'nc' }));
  eq('★★ la PVE «no corresponde» que había declarado vuelve',
     await p.evaluate(() => v('fPVEval')), 'nc');
  si('★ el bloque de extubación está a la vista', await ver('#dExtSec'));
  // Ahora declara la extubación que ocurrió dos horas más tarde
  await p.evaluate(() => { hPVEtoggle('no'); });
  await p.waitForTimeout(300);
  si('★★ al pasar la PVE a «no», se ofrece declarar la extubación', await ver('#cExtSinPve'));
  await p.evaluate(() => {
    document.getElementById('cExtSinPve').checked = true; hExtSinPve();
    const r = document.querySelector('input[name="extTipo"][value="sin_protocolo"]');
    r.checked = true; hExtTipo();
    $('fExtHoraNo').value = '21:15';
  });
  await p.waitForTimeout(300);
  si('★★ y la app la cuenta', await p.evaluate(() => _extOcurrio()));
  eq('★★ …con su hora', await p.evaluate(() => _extHora()), '21:15');

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ evento_vuelve_al_reabrir: ' + fails.length + ' FALLO(S): ' + fails.join(' · ')
                           : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
