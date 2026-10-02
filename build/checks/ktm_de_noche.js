// ktm_de_noche.js — De noche la terapia física SE MUESTRA, SE PUEDE LLENAR y NO HEREDA
// (Diego, 2-oct-2026).
//
// 🔴 ESTO CAMBIA UNA CONVENCIÓN, a propósito y con su palabra. Hasta hoy valía «KTM A» (19-sep):
// de noche la tarjeta se veía apagada, con todos sus controles desactivados y un aviso. El 2-oct
// Diego lo cambió: «Se puede llenar todo en realidad, podría hacerse KTM aunque no es lo habitual.
// Pero si se presenta de alguna forma en la que se seleccione y no herede, para que no se registre
// algo que no se hizo: que se muestre pero no herede.»
//
// LA REGLA QUE QUEDA
//   · Se MUESTRA y se puede LLENAR: la KTM, el IMT, el EMS y la válvula de fonación, de noche como
//     de día. (Antes de esto yo había puesto «No corresponde» en la tarjeta: era un error mío —lo
//     que no corresponde es que se HEREDE, no que se haga—.)
//   · NO HEREDA. De noche el bloque parte EN BLANCO: ni estado, ni nivel, ni IMT ni EMS del turno de
//     día. Si heredara, quedarían registradas sesiones que nadie hizo (el motivo del acuerdo de
//     jul-2026, que sigue en pie: contadas en REM y en procedimientos). Un aviso lo dice.
//   · Y NO SE MARCA «NO REALIZADA» SOLA. De noche, sin tocar nada, el turno no declara KTM —ni «hecha»
//     ni «no hecha»— porque «no realizada» entra en el denominador de la estadística y nadie
//     decidió que no se hizo. Solo cuenta lo que alguien elige.
//   · Las reglas que cierran la KTM (AET grupo IIIC, BNM) valen también de noche.
//
// 🪤 «No hereda» NO es «no existe»: lo que se llene de noche se guarda y entra al REM como cualquier
// otra sesión. La réplica del turno de día sigue saltándose la noche (svc_evoluciones.gs).
//
// 🪤 CADA COSA SE MIDE DONDE VIVE: se va al paso que tiene la tarjeta, sea cual sea su número.
// 🪤 Reloj congelado: la fecha se INVENTA y el turno se fuerza en SHIFT.
//
// Uso: node build/checks/ktm_de_noche.js
const path = require('path');
const { chromium } = require('playwright-core');
const V2 = path.join(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!okk) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

// El turno de DÍA de ese mismo día, con terapia física hecha: lo que la réplica traería.
const PREVIA_DIA = { ID_CAMA: '3', TURNO_KEY: '2026-08-12-Dia', TURNO: 'Dia', PATIENT_ID: 'p3', PAC_NOMBRE: 'P', PLAN_FIRMA_KINE: 'K.P.',
  VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', PLAN_PLANES: 'PLAN-REPLICADO',
  KTM_REALIZADA: true, KTM_NIVEL_KTR: '3', KTM_IMT: true, KTM_IMT_FREQ: '3', KTM_EMS: true, KTM_EMS_FREQ: '50' };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 1500 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window._ll = []; window.__previa = null; window.__actual = null;
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
      api(a, d) { window._ll.push({ a, d }); let data = null; if (a === 'GET_CONFIG_UI') data = { NUM_CAMAS: 12, BANNERS: {} };
        else if (a === 'GET_EVO_TURNO') data = { actual: window.__actual, previa: window.__previa, pronoAbierto: '' };
        setTimeout(() => ok({ ok: true, data }), 5); } }; } }; } } } };
  });
  await p.goto('file://' + path.join(V2, 'index.html'));
  await p.waitForTimeout(800);

  /* Abre un turno y devuelve lo que se ve en la tarjeta de terapia física. */
  const turno = (cual, o) => p.evaluate(async ([cual, o]) => {
    window.__previa = o.previa || null; window.__actual = o.actual || null;
    $('kf').reset(); $('gDate').value = '2026-08-12'; SHIFT = cual;
    window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM', FECHA_INGRESO: '2026-08-05', TS_INGRESO: '2026-08-05 23:00:00',
      FECHA_INICIO_VA: '2026-08-08', TS_INICIO_VA: '2026-08-08 10:00:00', FECHA_INICIO_SOPORTE: '2026-08-08', TS_INICIO_SOPORTE: '2026-08-08 10:00:00' }];
    window.recargarSilencioso = () => {}; renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 800));
    if (o.aet) { $('cAET').checked = true; $('fAETnivel').value = 'IIIC'; hAET(); }
    if (typeof aplicarGatesEval === 'function') aplicarGatesEval();
    const visible = el => { if (!el) return false; const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && !!(r.width || r.height); };
    const card = $('fcKtmCard'), imt = $('fcImtBox');
    const dp = card.closest('[data-paso]'); pasoIr(Number(dp ? dp.dataset.paso : 2));
    await new Promise(r => setTimeout(r, 250));
    const vivos = el => el ? Array.from(el.querySelectorAll('input,select,button,textarea')).filter(e => !e.disabled).length : -1;
    const aviso = $('dKTMnoche');
    return { tarjeta: visible(card), cuerpo: card.querySelector('.fcard-body').innerText.replace(/\s+/g, ' ').trim().length,
      vivos: vivos(card), estados: ['bKTMr', 'bKTMs', 'bKTMn'].map(id => !!$(id).disabled).join(','),
      estadoElegido: Array.from(document.querySelectorAll('#fcKtmCard .ktm-state.on')).map(x => x.id).join(','),
      nivel: v('fKTMniv'), imt: !!$('cIMT').checked, ems: !!$('cEMS').checked, plan: v('fPlanes'),
      imtTarjeta: visible(imt), imtVivos: vivos(imt),
      aviso: visible(aviso), avisoTxt: aviso ? aviso.innerText.replace(/\s+/g, ' ').trim() : '',
      pastilla: !!$('ktmNoCorresp'), avisoImt: !!$('dIMTnoche') };
  }, [cual, o || {}]);

  /* Guarda desde donde esté y devuelve lo que viajó. */
  const guarda = armar => p.evaluate(async fn => {
    $('fFirma').appendChild(Object.assign(document.createElement('option'), { value: 'K.T.', textContent: 'K.T.' })); $('fFirma').value = 'K.T.';
    const he = $('fHEst'); if (he && !he.value) he.value = 'Estable'; const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos';
    hPVEtoggle('si'); _transAvisoOk = true;
    new Function('return (' + fn + ')')()();
    window._ll.length = 0; guardar(); await new Promise(r => setTimeout(r, 400));
    const c = window._ll.find(x => x.a === 'GUARDAR_EVOLUCION');
    return c ? { r: c.d.KTM_REALIZADA, n: c.d.KTM_NO_REALIZADA, s: c.d.KTM_SUSPENDIDA, niv: c.d.KTM_NIVEL_KTR } : null; }, armar);

  console.log('\n1 · 🔴 De noche SE MUESTRA y SE PUEDE LLENAR');
  const N = await turno('Noche', {});
  si('★★ la tarjeta de terapia física está a la vista', N.tarjeta);
  si('   …con cuerpo, no un encabezado pelado', N.cuerpo > 0);
  eq('★★ los tres botones de estado, ENCENDIDOS', N.estados, 'false,false,false');
  si('★★ y sus controles están vivos', N.vivos > 0);
  si('★★ el IMT/EMS se ve', N.imtTarjeta);
  si('★★ …y se puede llenar', N.imtVivos > 0);

  console.log('\n2 · 🔴 NO HEREDA: de noche parte EN BLANCO');
  const H = await turno('Noche', { previa: PREVIA_DIA });
  eq('(control: la réplica sí corrió, trajo el plan del día)', H.plan, 'PLAN-REPLICADO');
  eq('★★ sin estado elegido (ni «realizada» heredada)', H.estadoElegido, '');
  eq('★★ sin nivel heredado', H.nivel, '');
  no('★★ el IMT del día NO se hereda', H.imt);
  no('★★ el EMS del día NO se hereda', H.ems);
  const D = await turno('Dia', { previa: PREVIA_DIA });
  eq('(control: de DÍA sí hereda el estado)', D.estadoElegido, 'bKTMr');
  eq('(control: …y el nivel)', D.nivel, '3');
  si('(control: …y el IMT)', D.imt);

  console.log('\n3 · 🔴 Un aviso lo dice, SIN «No corresponde»');
  await turno('Noche', {});
  const A = await turno('Noche', {});
  si('★★ sale el aviso de noche', A.aviso);
  si('★★ dice que no es lo habitual', /no es lo habitual/i.test(A.avisoTxt));
  si('★★ …y que parte en blanco y no hereda', /en blanco/i.test(A.avisoTxt) && /hered/i.test(A.avisoTxt));
  no('★★ 🔴 NO dice «No corresponde» (sí se puede hacer)', /No corresponde/i.test(A.avisoTxt));
  si('★ y sigue nombrando la KTR respiratoria, que se registra arriba', /KTR/.test(A.avisoTxt));
  no('★★ la marca «No corresponde» del encabezado ya no existe', A.pastilla);
  no('★ ni el aviso aparte de la tarjeta del IMT', A.avisoImt);
  const Dd = await turno('Dia', {});
  no('★ de día no sale el aviso de noche', Dd.aviso);

  console.log('\n4 · 🔴 Solo cuenta lo que alguien ELIGE');
  await turno('Noche', {});
  let g = await guarda('() => {}');
  eq('★★ sin tocar nada no se declara KTM (ni hecha…)', g && String(g.r), 'false');
  eq('★★ …ni «NO realizada»: no se inventa un incumplimiento', g && String(g.n), '');
  await turno('Noche', {});
  g = await guarda("() => { setKTMstate('r'); setKTMniv('2'); }");
  eq('★★ si se elige «realizada» de noche, viaja con su nivel', g && (g.r + '/' + g.niv), 'true/2');
  await turno('Noche', {});
  g = await guarda("() => { setKTMstate('n'); _ktmNoRazonSel('Rechazo del paciente'); }");
  eq('★★ y si se elige «no realizada» con su razón, también viaja', g && String(g.n), 'true');

  console.log('\n5 · Un turno guardado se reabre igual de noche que de día');
  const ACT = { ID_CAMA: '3', PATIENT_ID: 'p3', PAC_NOMBRE: 'P', PLAN_FIRMA_KINE: 'K.P.', VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM',
    KTM_REALIZADA: true, KTM_NIVEL_KTR: '2', KTM_CANT: 1 };
  const sN = await turno('Noche', { actual: Object.assign({ TURNO_KEY: '2026-08-12-Noche', TURNO: 'Noche' }, ACT) });
  const sD = await turno('Dia', { actual: Object.assign({ TURNO_KEY: '2026-08-12-Dia', TURNO: 'Dia' }, ACT) });
  eq('★★ el estado con que se reabre es el MISMO de noche y de día', sN.estadoElegido + '|' + sN.nivel, sD.estadoElegido + '|' + sD.nivel);

  console.log('\n6 · Las reglas que cierran la KTM valen también de noche');
  const Ac = await turno('Noche', { aet: true });
  no('★★ con AET grupo IIIC la tarjeta se esconde, como de día', Ac.tarjeta);

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ ktm_de_noche: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
