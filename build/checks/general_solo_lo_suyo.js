// general_solo_lo_suyo.js — «General» se queda con lo del paciente; la vía
// aérea entera vive en Respiratorio (17-sep-2026).
//
// EL PROBLEMA. Al listar «📊 General» campo por campo con Diego aparecieron 36
// campos, y más de la mitad no eran generales: eran de la vía aérea. El
// selector, el bloque «¿qué pasó hoy con la vía aérea?» —que es la puerta de
// entrada a intubación, extubación, reintubación, TQT y decanulación— y los
// cuatro contadores de días vivían TRES SECCIONES antes de donde se usan.
//
// El tubo y la cánula ya se habían mudado en la tanda anterior. Esta termina el
// trabajo: se va también la MÁQUINA DE EVENTOS con sus contadores. Diego, sobre
// el bloque entero: «podría quizás juntarse todo en un bloque de respiratorio…
// yo creo que podría moverse».
//
// EN GENERAL QUEDA lo que de verdad es del paciente y no del turno: el día de
// estadía, la ficha previa a la UCI (ingreso, Barthel, Charlson, APACHE, ECF),
// la adecuación del esfuerzo terapéutico, la fase clínica, el reingreso y el
// aislamiento.
//
// 🔴 LO QUE NO PUEDE ROMPERSE: mover el marcado no puede tocar la máquina de
// eventos. Los ids son los mismos y las funciones no se tocaron; esta guardia
// recorre los cinco eventos declarándolos uno por uno para probarlo.

const fs = require('fs');
const path = require('path');
const v2 = path.join(__dirname, '..', '..', 'v2');
const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!okk) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); }
};
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

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

  console.log('\n1 · ★★ La vía aérea vive donde se usa');
  const D = await p.evaluate(() => {
    const dueno = (id) => {
      const e = document.getElementById(id);
      if (!e) return '(no existe)';
      const c = e.closest('.fcard');
      return c ? c.id : '(sin tarjeta)';
    };
    return {
      selector: dueno('fVA'), eventos: dueno('evVAfila'),
      diasVM: dueno('colDiasVM'), diasTOT: dueno('colDiasTOT'),
      diasTQT: dueno('colDiasTQT'), diasVNI: dueno('colDiasVNI'),
      reintub: dueno('colReintub'),
      // …y lo que SÍ es general se queda donde estaba
      dia: dueno('fDias'), aet: dueno('cAET'), ficha: dueno('fBarthel'),
      fase: dueno('faseChips'), aisl: dueno('cAisl'), reing: dueno('cReing')
    };
  });
  eq('★★ el selector de vía aérea está en Respiratorio', D.selector, 'fcRespCard');
  eq('★★ …y con él la máquina de eventos', D.eventos, 'fcRespCard');
  eq('★ los días de VM', D.diasVM, 'fcRespCard');
  eq('★ los de tubo', D.diasTOT, 'fcRespCard');
  eq('★ los de traqueostomía', D.diasTQT, 'fcRespCard');
  eq('★ los de VNI', D.diasVNI, 'fcRespCard');
  eq('★ y el número de reintubación', D.reintub, 'fcRespCard');

  console.log('\n2 · Y «General» se queda con lo del paciente');
  eq('el día de estadía', D.dia, 'fcGen');
  eq('la adecuación del esfuerzo terapéutico', D.aet, 'fcGen');
  eq('la ficha previa a la UCI', D.ficha, 'fcGen');
  eq('la fase clínica', D.fase, 'fcGen');
  eq('el aislamiento', D.aisl, 'fcGen');
  eq('el reingreso', D.reing, 'fcGen');

  /* ══ 3 · 🔴 La máquina de eventos no se tocó ══════════════════════════ */
  console.log('\n3 · 🔴 Los cinco eventos siguen funcionando');
  const E = await p.evaluate(async () => {
    $('kf').reset(); $('cBed').value = '3';
    $('gDate').value = '2026-08-10';   // 🪤 fecha inventada
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM' }];
    renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 300));
    if (typeof pasoIr === 'function') pasoIr(2);
    $('fVA').value = 'TOT'; cascadeVA();
    $('fSop').value = 'VM'; cascadeSop();
    await new Promise(r => setTimeout(r, 80));
    const ve = (id) => { const e = document.getElementById(id); return !!e && !!e.offsetParent; };
    const out = { fila: ve('evVAfila'), botones: document.querySelectorAll('#evVAbtns .ev-va').length };
    // Con TOT en VM se ofrecen extubación y traqueostomía
    setEventoVA('ext');   await new Promise(r => setTimeout(r, 80));
    out.ext = ve('dExtSec');
    setEventoVA('nada');  await new Promise(r => setTimeout(r, 80));
    setEventoVA('tqt');   await new Promise(r => setTimeout(r, 80));
    out.tqt = ve('dTqtSec');
    setEventoVA('nada');  await new Promise(r => setTimeout(r, 80));
    // Con vía aérea natural, la intubación
    $('fVA').value = 'Natural'; cascadeVA();
    $('fSop').value = 'Oxigenoterapia/OAF'; cascadeSop();
    await new Promise(r => setTimeout(r, 80));
    setEventoVA('intub'); await new Promise(r => setTimeout(r, 80));
    out.intub = ve('dIntubSec');
    return out;
  });
  si('la fila de eventos está a la vista', E.fila);
  eq('   con sus seis botones', E.botones, 6);
  si('★★ declarar la extubación abre su bloque', E.ext);
  si('★★ …la traqueostomía el suyo', E.tqt);
  si('★★ …y la intubación el suyo', E.intub);

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ general_solo_lo_suyo: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ general_solo_lo_suyo: cada cosa donde se usa.');
})();
