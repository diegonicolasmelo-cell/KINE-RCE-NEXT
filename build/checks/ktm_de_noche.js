// ktm_de_noche.js — Opción A: de noche la KTM SE VE y NO SE LLENA (19-sep-2026).
//
// LA DECISIÓN ES DE DIEGO. Registró un turno real de noche y avisó: «en turno
// no aparece KTM aunque lo estoy probando de noche». Le puse tres caminos —
// A: se ve pero no se llena · B: se puede llenar igual · C: se queda oculta —
// y eligió: «KTM A».
//
// 🔴 ESTO CAMBIA UNA CONVENCIÓN ANTERIOR, a propósito. En agosto se acordó que
// de noche la tarjeta se escondía entera, y `regresion_ui.js` lo exigía
// («noche: KTM forzada a "no realizada" y tarjeta oculta»). Esconderla le hizo
// perder tiempo buscando algo que el sistema había guardado sin decirlo. La
// regla nueva manda; la vieja queda contada acá y en la bitácora.
//
// LO QUE NO CAMBIA: de noche la KTM sigue sin registrarse. El estado nace
// NEUTRO —ni «realizada» ni «no realizada»—, porque forzar 'n' hacía que cada
// evolución nocturna narrara «KTM no realizada.» y marcara un estado que la
// estadística manual nunca tuvo. La opción B se descartó por eso mismo: si a
// veces hay dato de noche y a veces no, el porcentaje de cumplimiento deja de
// querer decir algo.
//
// Y ARRASTRA EL TERCER DEFECTO que quedó anotado sin arreglar: de noche el pool
// de chips se sigue viendo —vive fuera de la tarjeta que se esconde— pero los
// que abren un formulario no tenían dónde abrirlo, y tocarlos no hacía nada.
// Con la opción A quedan apagados y se dice por qué.
//
// 🪤 EL RELOJ VA CONGELADO: la fecha se INVENTA y el turno se fuerza en SHIFT.

const path = require('path');
const V2 = path.join(__dirname, '..', '..', 'v2');
const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!okk) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); }
};
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

const { chromium } = require('playwright-core');

async function turno(p, cual, extra) {
  return p.evaluate(async ([cual, extra]) => {
    $('kf').reset();
    $('gDate').value = '2026-08-10';      // 🪤 fecha inventada, no la de hoy
    SHIFT = cual;                         // 🪤 turno forzado, no el del reloj
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM',
            ULT_MRC: '44', ULT_MRC_FECHA: '2026-08-08', ULT_MRC_FIRMA: 'KP' }];
    renderGrid();
    abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 420));
    if (extra === 'aet') { $('cAET').checked = true; $('fAETnivel').value = 'IIIC'; }
    if (typeof aplicarGatesEval === 'function') aplicarGatesEval();

    const visible = el => {
      if (!el) return false;
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && !!(r.width || r.height);
    };

    /* 🪤 CADA COSA SE MIDE DONDE VIVE. La tarjeta de Rehabilitación es del
       PASO 2 (el turno) y los chips del PASO 3: `pasoIr` le pone
       `paso-oculto` a lo que no es del paso actual, así que mirar la tarjeta
       parado en el paso 3 la da por escondida SIEMPRE — y el caso del AET
       pasaba en verde por la razón equivocada. */
    if (typeof pasoIr === 'function') pasoIr(2);
    await new Promise(r => setTimeout(r, 200));
    const card = document.getElementById('fcKtmCard');
    const aviso = document.getElementById('dKTMnoche');
    const imt = document.getElementById('fcImtBox');
    const avisoImt = document.getElementById('dIMTnoche');
    const enPaso2 = {
      imtTarjeta: visible(imt),
      imtVivos: imt ? [...imt.querySelectorAll('input,select,button,textarea')].filter(e => !e.disabled).length : -1,
      imtAviso: visible(avisoImt),
      tarjeta: visible(card),
      cuerpo: card ? card.querySelector('.fcard-body').innerText.replace(/\s+/g, ' ').trim().length : 0,
      estados: ['bKTMr', 'bKTMs', 'bKTMn'].map(id => !!document.getElementById(id)?.disabled),
      estadoElegido: [...document.querySelectorAll('#fcKtmCard .ktm-state.on')].map(b => b.id).join(','),
      vivos: card ? [...card.querySelectorAll('input,select,button,textarea')].filter(e => !e.disabled).length : -1,
      aviso: visible(aviso),
      avisoTxt: aviso ? aviso.innerText.replace(/\s+/g, ' ').trim() : ''
    };

    if (typeof pasoIr === 'function') pasoIr(3);
    await new Promise(r => setTimeout(r, 200));
    const chips = [...document.querySelectorAll('#pasoEvalChips [data-evk]')];
    return Object.assign(enPaso2, {
      nChips: chips.length,
      chipsConClick: chips.filter(c => c.getAttribute('onclick')).length,
      chipsApagados: chips.filter(c => c.classList.contains('solo-lectura')).length,
      pieNoche: (document.getElementById('pasoEvalChips') || {}).innerText || ''
    });
  }, [cual, extra || '']);
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.google = { script: { run: { withSuccessHandler(okF) { return { withFailureHandler() { return {
      api(a) { setTimeout(() => okF({ ok: true, data: (a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null) }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.resolve(V2, 'index.html'));
  await p.waitForTimeout(600);

  /* ══ 1 · De noche SE VE ═══════════════════════════════════════════════ */
  console.log('\n1 · 🔴 «KTM A» — de noche la tarjeta se ve');
  const N = await turno(p, 'Noche');
  si('★★ la tarjeta de Rehabilitación está a la vista', N.tarjeta);
  si('   …y con cuerpo, no un encabezado pelado', N.cuerpo > 0);

  /* ══ 2 · …y NO SE LLENA ═══════════════════════════════════════════════ */
  console.log('\n2 · 🔴 …y no se llena');
  eq('★★ los tres botones de estado, apagados', N.estados.join(','), 'true,true,true');
  eq('★★ ningún control de la tarjeta queda vivo', N.vivos, 0);
  eq('★ el estado nace NEUTRO (ni realizada ni no realizada)', N.estadoElegido, '');

  /* ══ 3 · Y dice por qué, nombrando la KTR ═════════════════════════════ */
  console.log('\n3 · 🔴 Dice por qué, y dónde sí se registra de noche');
  si('★★ sale el aviso', N.aviso);
  si('★★ …y nombra la KTR, que es la que sí va de noche', /KTR/.test(N.avisoTxt));
  si('   …y dice dónde está', /[Rr]espiratorio/.test(N.avisoTxt));

  /* ══ 4 · El pool, en solo lectura ═════════════════════════════════════ */
  console.log('\n4 · 🔴 De noche los chips se ven y no se tocan');
  eq('★ los diez chips siguen a la vista', N.nChips, 10);
  eq('★★ ninguno lleva onclick', N.chipsConClick, 0);
  eq('★★ los diez, marcados de solo lectura', N.chipsApagados, 10);
  si('★ y una línea lo explica', /no se registran|solo lectura|último/i.test(N.pieNoche));

  /* ══ 4b · El IMT/EMS es del mismo paquete y va igual ══════════════════ */
  console.log('\n4b · 🔴 El IMT/EMS es terapia física: se apaga, no desaparece');
  // Diego, 19-sep-2026: «IMT y EMS son parte de la terapia física, es decir es
  // rehabilitación, parte del paquete. Movilización precoz (posicionamiento,
  // movilidad pasiva activa), EMS e IMT. Podría ir de noche apagada.»
  si('★★ la tarjeta de IMT/EMS está a la vista', N.imtTarjeta);
  eq('★★ y ninguno de sus controles queda vivo', N.imtVivos, 0);
  si('★ y dice por qué, sin hacer buscar la explicación en la otra tarjeta', N.imtAviso);

  /* ══ 5 · De día no cambia nada ════════════════════════════════════════ */
  console.log('\n5 · De día sigue todo como estaba');
  const D = await turno(p, 'Dia');
  si('★ la tarjeta se ve', D.tarjeta);
  eq('★★ los botones de estado, vivos', D.estados.join(','), 'false,false,false');
  no('★ sin aviso de noche', D.aviso);
  si('★ el IMT/EMS también se ve', D.imtTarjeta);
  si('★★ …con sus controles vivos', D.imtVivos > 0);
  no('★ …y sin aviso de noche', D.imtAviso);
  eq('★★ los diez chips con onclick', D.chipsConClick, 10);
  eq('★ ninguno marcado de solo lectura', D.chipsApagados, 0);

  /* ══ 6 · El AET IIIC sigue mandando de día ════════════════════════════ */
  console.log('\n6 · El AET Grupo IIIC sigue escondiendo la tarjeta de día');
  const A = await turno(p, 'Dia', 'aet');
  no('★ con AET IIIC la tarjeta se esconde (regla vieja, intacta)', A.tarjeta);

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ ktm_de_noche: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ ktm_de_noche: se ve y no se llena.');
})();
