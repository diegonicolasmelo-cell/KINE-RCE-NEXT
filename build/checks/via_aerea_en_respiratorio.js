// via_aerea_en_respiratorio.js — El tubo y la traqueostomía viven donde se
// usan, y cada paciente ve solo el contador que le corresponde (17-sep-2026).
//
// POR QUÉ. Al listar «📊 General» campo por campo con Diego aparecieron 36
// campos, y el orden del formulario ya seguía el orden en que él narra —día y
// motivo, sedación, hemodinamia, auscultación, respiratorio— salvo por una
// cosa: los datos del TUBO estaban en General, **tres secciones antes de donde
// se usan**. Diego: «podría quizás juntarse todo en un bloque de respiratorio…
// yo creo que podría moverse».
//
// Y los contadores: «que diga lo que corresponda… si está intubado, que diga
// los días de tubo; si está con VNI, los días de VNI; los días de TQT si está
// traqueostomizado. Y los días de ventilación mecánica total». Fuera el de
// «vía aérea artificial»: «tubo y TQT son vía aérea artificial, eso se repite».
//
// 🪤 LA FIJACIÓN ERA UN CAMPO FANTASMA. `fTOTfij` estaba escondido, se cargaba
// al abrir desde la evolución anterior… y al guardar se escribía la CONSTANTE
// 'Arcada dental' ignorando lo cargado. O sea que leía un dato, lo guardaba en
// una variable y nunca lo usaba. El estándar de la unidad es arcada dental y el
// texto ya lo dice; el campo sobra entero.

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

/* ══ 1 · La fijación fantasma ya no está ════════════════════════════════ */
console.log('\n1 · 🪤 El campo fantasma de la fijación');
no('★ ya no existe el campo escondido fTOTfij', /id="fTOTfij"/.test(idx));
no('   …ni se carga al abrir la cama', /set\('fTOTfij'/.test(idx));
si('   control · el guardado sigue escribiendo la norma de la unidad',
   /TOT_FIJACION:\s*'Arcada dental'/.test(idx));
si('   control · y la pantalla sigue pidiendo los cm de arcada dental',
   /id="fTOTcm"/.test(idx) && /arcada dental/.test(idx));

/* ══ 2 · Fuera el contador que repetía ══════════════════════════════════ */
console.log('\n2 · «Tubo y TQT son vía aérea artificial, eso se repite»');
no('★ ya no está el contador de días de vía aérea artificial', /id="colDiasVAA"/.test(idx));
no('   …ni su casilla de días previos', /id="cVAExtPrev"/.test(idx));
si('   control · el valor sigue calculándose para el relato (día N)', /id="fDiasVA"/.test(idx));

/* ══ 3 · El tubo y la TQT viven en Respiratorio ═════════════════════════ */
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

  console.log('\n3 · ★ Los datos del tubo están donde se usan');
  const D = await p.evaluate(() => {
    const dueno = (id) => {
      const e = document.getElementById(id);
      if (!e) return '(no existe)';
      const c = e.closest('.fcard');
      return c ? c.id : '(sin tarjeta)';
    };
    return { tot: dueno('dTOT'), tqt: dueno('dTQT'), totCm: dueno('fTOTcm'),
             cambioTot: dueno('cCambioTOT'), cambioTqt: dueno('cCambioTQT') };
  });
  eq('★★ el bloque del TOT vive en Respiratorio', D.tot, 'fcRespCard');
  eq('★★ …y el de la TQT también', D.tqt, 'fcRespCard');
  eq('★ los cm de arcada dental, con el tubo', D.totCm, 'fcRespCard');
  eq('★ el cambio de tubo, con el tubo', D.cambioTot, 'fcRespCard');
  eq('★ el cambio de cánula, con la TQT', D.cambioTqt, 'fcRespCard');

  /* ══ 4 · Cada paciente ve SOLO el contador que le toca ════════════════ */
  console.log('\n4 · ★★ «Que diga lo que corresponda»');
  const escena = async (va, sop) => p.evaluate(async ([va, sop]) => {
    $('kf').reset(); $('cBed').value = '3';
    // 🪤 Fecha inventada: ningún contador puede depender del día de la corrida.
    $('gDate').value = '2026-08-10';
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: va, SOPORTE: sop,
            FECHA_INICIO_VA: '2026-08-04', FECHA_INICIO_SOPORTE: '2026-08-04' }];
    renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 300));
    if (typeof pasoIr === 'function') pasoIr(2);
    $('fVA').value = va; cascadeVA();
    $('fSop').value = sop; cascadeSop();
    if (typeof actualizarContadores === 'function') actualizarContadores();
    await new Promise(r => setTimeout(r, 60));
    const ve = (id) => { const e = document.getElementById(id); return !!e && !!e.offsetParent; };
    return { tot: ve('colDiasTOT'), tqt: ve('colDiasTQT'), vni: ve('colDiasVNI'), vm: ve('colDiasVM') };
  }, [va, sop]);

  const tot = await escena('TOT', 'VM');
  eq('★ intubado: se ven los días de TUBO', tot.tot, true);
  no('   …y no los de traqueostomía', tot.tqt);
  no('   …ni los de VNI', tot.vni);
  si('★ …y los días de VM, que van siempre', tot.vm);

  const tqt = await escena('TQT', 'VM');
  eq('★ traqueostomizado: se ven los días de TQT', tqt.tqt, true);
  no('   …y no los de tubo', tqt.tot);
  si('   …y los de VM', tqt.vm);

  // 🪤 «Full Face» NO es una vía aérea: con el modelo de tres ejes es una
  // INTERFAZ. La vía aérea de un paciente en VNI es Natural y la VNI es el
  // soporte. Pedir el escenario con la forma vieja dejaba la guardia probando
  // un caso que no existe en la pantalla.
  const vni = await escena('Natural', 'VNI');
  eq('★ con VNI: se ven los días de VNI', vni.vni, true);
  no('   …y no los de tubo', vni.tot);
  no('   …ni los de traqueostomía', vni.tqt);

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ via_aerea_en_respiratorio: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ via_aerea_en_respiratorio: el tubo vive donde se usa.');
})();
