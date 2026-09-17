// sedacion_prono_ppc.js — Tres decisiones clínicas de la revisión campo por
// campo con Diego (17-sep-2026).
//
// 1 · EL PRONO NO ES ASUNTO DE LA TRAQUEOSTOMÍA. Vivían pegados en la misma
//     franja y no tienen ninguna relación. Diego: «prono y supino viven junto
//     a TQT; eso es un procedimiento en caso de falla respiratoria catastrófica
//     y es un evento aparte, no relacionado con TQT». Los tres
//     posicionamientos son cosas distintas y van separados:
//       · decúbito lateral → técnica del turno, para favorecer un pulmón;
//       · cabecera 30-45°  → prevención de NAVM (se fue al paso 1);
//       · prono / supino   → evento que trasciende el turno.
//
// 2 · LOS GATES DE SEDACIÓN POR EL EXTREMO ALTO. El extremo bajo ya
//     funcionaba (con SAS 1-2 no se pide cooperación ni S5Q: el paciente está
//     profundamente sedado). Faltaba el alto: en SAS 6-7 tampoco hay
//     cooperación evaluable —Diego: «son agitaciones que no se logran calmar,
//     muerde el tubo»— pero el CAM-ICU SÍ se pide, porque ahí es justo donde
//     vive el delirium hiperactivo, que es el más frecuente en UCI.
//     🔴 El CAM-ICU tiene PISO pero no TECHO: se esconde con sedación
//     profunda, nunca por agitación.
//
// 3 · LA PPC SE CALCULA, NO SE ESCRIBE. Es PAM − PIC. Eran dos números
//     independientes y se podía anotar una presión de perfusión que no cuadra
//     con los otros dos de la misma fila.
//
// 🪤 El sedente se saca del relato (no alimenta ningún indicador ni el REM) y
//     el decúbito lateral sí se narra.

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

  const montar = async () => p.evaluate(async () => {
    $('kf').reset(); $('cBed').value = '3';
    $('gDate').value = '2026-08-10';   // 🪤 fecha inventada
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM' }];
    renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 300));
    if (typeof pasoIr === 'function') pasoIr(2);
    $('fVA').value = 'TOT'; cascadeVA();
    $('fSop').value = 'VM'; cascadeSop();
    $('fModo').value = 'ACVC'; renderParams();
  });

  /* ══ 1 · El prono, separado de la traqueostomía ════════════════════════ */
  console.log('\n1 · 🔴 El prono no es asunto de la traqueostomía');
  await montar();
  const A = await p.evaluate(() => {
    const strip = document.getElementById('dPronoStrip');
    const tqt = document.getElementById('dTqtSec');
    return {
      existe: !!strip,
      // 🪤 Lo que se mide es que NO compartan la misma sub-sección: pegados,
      // marcar la traqueostomía movía de sitio el prono, y un prono es una
      // falla respiratoria catastrófica que no depende de la vía aérea.
      juntoATqt: !!strip && !!tqt && strip.closest('.sub-sec') === tqt.closest('.sub-sec'),
      sedenteFuera: !document.getElementById('cPosSed')
    };
  });
  si('el bloque del prono existe', A.existe);
  no('★★ …y ya NO comparte sección con la traqueostomía', A.juntoATqt);
  si('★ el sedente salió del formulario (no alimenta indicador ni REM)', A.sedenteFuera);

  /* ══ 2 · Los gates de sedación, por los dos extremos ═══════════════════ */
  console.log('\n2 · ★★ Los gates por el extremo alto (SAS 6-7)');
  const gates = async (sas) => p.evaluate(async (sas) => {
    $('fSed').value = 'Escalón 6'; if (typeof hSed === 'function') hSed();
    $('fSAS').value = String(sas);
    $('fSAS').dispatchEvent(new Event('change'));
    if (typeof aplicarGatesEval === 'function') aplicarGatesEval();
    await new Promise(r => setTimeout(r, 60));
    const ve = (id) => { const e = document.getElementById(id); return !!e && !!e.offsetParent; };
    return { coop: ve('fCoop'), s5q: ve('fS5Q'), cam: ve('fCAMICU'), gcs: ve('fGCSO') };
  }, sas);

  const s1 = await gates(1);
  no('SAS 1 · no se pide cooperación', s1.coop);
  no('SAS 1 · ni S5Q', s1.s5q);
  no('SAS 1 · ni CAM-ICU (piso: sedación profunda)', s1.cam);
  si('🔴 SAS 1 · el Glasgow SÍ sigue a la vista (da 3, y eso es un dato)', s1.gcs);

  const s4 = await gates(4);
  si('SAS 4 · se pide cooperación', s4.coop);
  si('SAS 4 · y S5Q', s4.s5q);
  si('SAS 4 · y CAM-ICU', s4.cam);

  const s5 = await gates(5);
  si('★ SAS 5 · todavía hay cooperación (se calma a la contención verbal)', s5.coop);

  const s6 = await gates(6);
  no('★★ SAS 6 · ya NO se pide cooperación (no se calma, muerde el tubo)', s6.coop);
  no('★★ SAS 6 · ni S5Q', s6.s5q);
  si('🔴 SAS 6 · pero el CAM-ICU SÍ: ahí vive el delirium hiperactivo', s6.cam);

  const s7 = await gates(7);
  no('★★ SAS 7 · sin cooperación', s7.coop);
  si('🔴 SAS 7 · con CAM-ICU (el CAM tiene piso, no techo)', s7.cam);

  /* ══ 3 · La PPC se calcula ═════════════════════════════════════════════ */
  console.log('\n3 · ★ La PPC es PAM − PIC, no un tercer número suelto');
  const C = await p.evaluate(async () => {
    const c = document.getElementById('cPICcaptor');
    if (c) { c.checked = true; c.dispatchEvent(new Event('change')); }
    await new Promise(r => setTimeout(r, 60));
    const set = (id, val) => { const e = document.getElementById(id); if (e) { e.value = val; e.dispatchEvent(new Event('input')); } };
    set('fPAMmed', '80'); set('fPIC', '15');
    await new Promise(r => setTimeout(r, 80));
    const ppc = document.getElementById('fPPC');
    return { ppc: ppc ? ppc.value : '(no existe)',
             editable: ppc ? !ppc.readOnly && !ppc.disabled : null,
             // 🪤 No se mide con offsetParent: la tarjeta de Neurología entera se
             // pliega según el diagnóstico, así que un campo correcto salía
             // «invisible» por el estado de su tarjeta padre y no por su propio
             // gate. Lo que se comprueba es que el captor lo destape.
             pamGate: !document.getElementById('gPAMmed').classList.contains('hidden') };
  });
  eq('★★ con PAM 80 y PIC 15, la PPC sale 65 sola', C.ppc, '65');
  no('★ …y no se puede escribir a mano (dos números ya la determinan)', C.editable);
  si('★ con captor, la PAM se pide siempre', C.pamGate);

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ sedacion_prono_ppc: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ sedacion_prono_ppc: las tres decisiones clínicas están puestas.');
})();
