// noche_no_corresponde.js — De noche, Evaluaciones y Terapia física DICEN «No corresponde»
// (Diego, 2-oct-2026).
//
// LO QUE DIJO: «De noche las evaluaciones se muestran. Quizás para que esto funcione mejor
// en terapia física de noche que salga no corresponde. Corregir horario.»
//
// LO QUE SE MIDIÓ: de noche el paso Evaluaciones no queda vacío —la lista de lo último medido
// sigue ahí (acuerdo «KTM A», 19-sep: se ve y no se llena)— y con cosas como «FSS-ICU sin medir»
// en beige se lee como una tarea que está debiendo, justo cuando nada de eso se puede hacer. Y el
// botón de abajo decía «No medí nada este turno», como si hubiera podido medir.
//
// 🔴 ELEGIDO EL 2-OCT: «Evaluaciones y terapia física, dejando lo último medido». O sea:
//   · se agrega el rótulo «No corresponde de noche» —NO se quita la lista de lo último medido,
//     que el 19-sep pidió ver y sigue en solo lectura—;
//   · el botón de seguir dice «No corresponde de noche», no «No medí nada»;
//   · la tarjeta de Terapia física lleva un «No corresponde» a la vista en su encabezado.
//
// 🪤 ES SOLO PANTALLA. No cambia lo que se guarda ni las estadísticas: de noche la KTM sigue
// naciendo NEUTRA (ni «realizada» ni «no realizada»), porque «No corresponde» no es «No
// realizada» —este último entra en el denominador y el primero no—. Y el relato no lo nombra.
//
// 🪤 LA PRIMERA MITAD DE ESTE PEDIDO ERA EL RELOJ: a las 20:30 la app todavía creía que era de
// día y no había nada que decir. Con el horario corregido (horario_turno.js) a las 20:30 ya es
// noche, y aquí se mide ese camino entero: reloj → turno → rótulo.
//
// 🪤 Reloj congelado: la fecha se INVENTA y el turno se fuerza (salvo en la parte del reloj, que
// es justo lo que mide).
//
// Uso: node build/checks/noche_no_corresponde.js
const path = require('path');
const { chromium } = require('playwright-core');
const v2 = path.join(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

const PUENTE = () => {
  window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
    api(a) { let data = null; if (a === 'GET_CONFIG_UI') data = { NUM_CAMAS: 12, BANNERS: {} };
      else if (a === 'GET_EVO_TURNO') data = { actual: null, previa: null, pronoAbierto: '' };
      setTimeout(() => ok({ ok: true, data }), 5); } }; } }; } } } };
};

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1200, height: 1500 }, locale: 'es-CL' });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(PUENTE);
  await p.goto('file://' + path.join(v2, 'index.html'));
  await p.waitForTimeout(800);

  const abrir = (turno, paso) => p.evaluate(async x => {
    $('kf').reset(); $('gDate').value = '2026-08-12'; SHIFT = x.turno;
    window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', EDAD: 61, SEXO: 'M', VIA_AEREA: 'TOT', SOPORTE: 'VM',
            FECHA_INGRESO: '2026-08-05', TS_INGRESO: '2026-08-05 23:00:00', ULT_MRC: 48, ULT_MRC_FECHA: '2026-08-10', ULT_MRC_FIRMA: 'KP' }];
    window.recargarSilencioso = () => {};
    renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 800));
    if (typeof aplicarGatesEval === 'function') aplicarGatesEval();
    pasoIr(x.paso);
    await new Promise(r => setTimeout(r, 250));
  }, { turno, paso });
  const ver = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0); }, sel);
  const txt = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : '(no existe)'; }, sel);

  console.log('\n1 · 🔴 De NOCHE, el paso Evaluaciones dice «No corresponde»');
  await abrir('Noche', 3);
  si('★★ hay un rótulo «No corresponde de noche» a la vista', await ver('#pasoEvalChips .pe2-nocorresp'));
  eq('★★ y el rótulo lo dice con esas palabras', await p.evaluate(() => /^No corresponde de noche/.test(($('pasoEvalChips').querySelector('.pe2-nocorresp') || {}).innerText || '')), 'true');
  si('★ explica qué se hace de día', /terapia física/i.test(await txt('#pasoEvalChips .pe2-nocorresp')) && /día/i.test(await txt('#pasoEvalChips .pe2-nocorresp')));
  si('★★ 🔴 y SIGUE a la vista lo último medido (el 19-sep pidió verlo)', /MRC/.test(await txt('#pasoEvalChips')) && /48/.test(await txt('#pasoEvalChips')));
  eq('★★ …en solo lectura: ninguno se puede tocar', await p.evaluate(() => Array.from(document.querySelectorAll('#pasoEvalChips [data-evk]')).filter(c => c.getAttribute('onclick')).length), '0');
  eq('★★ el botón de seguir dice «No corresponde de noche»', await p.evaluate(() => ($('pasoEvalNadaT').textContent || '').trim()), 'No corresponde de noche');
  no('★★ y YA NO dice «No medí nada»', await p.evaluate(() => /No medí nada/.test($('pasoEvalNada').innerText)));
  si('★ el botón explica que sigue al relato', /relato/i.test(await txt('#pasoEvalNada')));
  si('★ y sigue funcionando: apunta a la misma acción', await p.evaluate(() => /pasoSinMedir/.test($('pasoEvalNada').getAttribute('onclick') || '')));

  console.log('\n2 · 🔴 De DÍA no sale nada de eso');
  await abrir('Dia', 3);
  no('★★ ni rótulo', await ver('#pasoEvalChips .pe2-nocorresp'));
  eq('★★ y el botón dice lo de siempre', await p.evaluate(() => ($('pasoEvalNadaT').textContent || '').trim()), 'No medí nada este turno');
  si('★ las evaluaciones se ofrecen', await ver('#evTiles'));
  await abrir('Noche', 3);
  await abrir('Dia', 3);
  no('★★ pasar de noche a día NO deja el rótulo pegado', await ver('#pasoEvalChips .pe2-nocorresp'));
  eq('★★ …ni el botón cambiado', await p.evaluate(() => ($('pasoEvalNadaT').textContent || '').trim()), 'No medí nada este turno');

  console.log('\n3 · 🔴 De NOCHE, la terapia física dice «No corresponde»');
  await abrir('Noche', 2);
  si('★★ el encabezado de la tarjeta lleva «No corresponde»', await ver('#ktmNoCorresp'));
  eq('★★ con esas palabras', await txt('#ktmNoCorresp'), 'No corresponde');
  si('★★ y está DENTRO de la tarjeta de terapia física', await p.evaluate(() => !!$('ktmNoCorresp').closest('#fcKtmCard')));
  si('★ el aviso de abajo empieza por «No corresponde»', /^🌙?\s*No corresponde/.test(await txt('#dKTMnoche')));
  si('★ …y sigue nombrando la KTR, que sí va de noche', /KTR/.test(await txt('#dKTMnoche')));
  si('★ la tarjeta del IMT/EMS también lo dice', /No corresponde/.test(await txt('#dIMTnoche')));
  eq('★★ la tarjeta sigue a la vista y apagada, como se acordó', await p.evaluate(() => Array.from($('fcKtmCard').querySelectorAll('input,select,button,textarea')).filter(e => !e.disabled).length), '0');
  await abrir('Dia', 2);
  no('★★ de día no hay «No corresponde» en la tarjeta', await ver('#ktmNoCorresp'));

  console.log('\n4 · 🪤 Es SOLO pantalla: lo que se guarda no cambia');
  await abrir('Noche', 2);
  const g = await p.evaluate(async () => {
    $('fFirma').appendChild(Object.assign(document.createElement('option'), { value: 'Klgo. Test', textContent: 'Klgo. Test' })); $('fFirma').value = 'Klgo. Test';
    const he = $('fHEst'); if (he && !he.value) he.value = 'Estable'; const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos';
    _transAvisoOk = true; window._ll = []; guardar(); await new Promise(r => setTimeout(r, 80));
    return { relato: genTexto(), ktmNo: $('bKTMn').classList.contains('on') };
  });
  no('★★ el relato NO dice «No corresponde de noche»', /No corresponde de noche/i.test(g.relato));
  no('★★ la KTM sigue NEUTRA: no queda marcada como «no realizada»', g.ktmNo);

  console.log('\n5 · 🔴 El camino entero: a las 20:30 la app arranca en NOCHE y lo dice');
  const reloj = async (h, m) => {
    const q = await b.newPage({ viewport: { width: 1200, height: 1500 }, locale: 'es-CL' });
    await q.addInitScript(([h, m]) => {
      const FIJA = new Date(2026, 7, 12, h, m, 0).getTime(), RD = Date;
      function FD(...a) { if (!new.target) return new RD(FIJA).toString(); return a.length ? new RD(...a) : new RD(FIJA); }
      FD.prototype = RD.prototype; FD.now = () => FIJA; FD.UTC = RD.UTC; FD.parse = RD.parse; window.Date = FD;
    }, [h, m]);
    await q.addInitScript(PUENTE);
    await q.goto('file://' + path.join(v2, 'index.html')); await q.waitForTimeout(800);
    const r = await q.evaluate(async () => {
      window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
      DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', VIA_AEREA: 'TOT', SOPORTE: 'VM', FECHA_INGRESO: '2026-08-05', TS_INGRESO: '2026-08-05 23:00:00' }];
      window.recargarSilencioso = () => {}; renderGrid(); abrirPanel('3', false, false);
      await new Promise(r => setTimeout(r, 800)); if (typeof aplicarGatesEval === 'function') aplicarGatesEval(); pasoIr(3);
      await new Promise(r => setTimeout(r, 250));
      return { turno: SHIFT, rotulo: !!$('pasoEvalChips').querySelector('.pe2-nocorresp') };
    });
    await q.close(); return r;
  };
  let r = await reloj(20, 30);
  eq('★★ 20:30 → la app está en Noche', r.turno, 'Noche');
  si('★★ …y el paso Evaluaciones dice «No corresponde de noche»', r.rotulo);
  r = await reloj(19, 45);
  eq('19:45 → sigue en Día', r.turno, 'Dia');
  no('…y no dice nada', r.rotulo);
  r = await reloj(8, 15);
  eq('★ 08:15 → ya es Día (antes seguía en Noche hasta las 09)', r.turno, 'Dia');

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ noche_no_corresponde: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
