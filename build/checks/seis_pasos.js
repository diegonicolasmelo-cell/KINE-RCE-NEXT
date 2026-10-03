// seis_pasos.js — El turno son SEIS pasos: Prevención, Turno, Evaluaciones, Terapia física,
// Planes y Relato (Diego, 2-oct-2026).
//
// LO QUE PIDIÓ: «Quizás poner como otro paso, KTM, que sea como modular. La terapia física, la
// rehabilitación, que sea como aparte de las evaluaciones. O sea, sea como ingreso, turno,
// evaluaciones, terapia física, planes y después el texto.»
//
// POR QUÉ TIENE SENTIDO. La regla de noche es de UNA cosa —la terapia física no se hereda de
// noche, ver ktm_de_noche.js—, y mezclada con el turno y con las evaluaciones no tenía dónde vivir:
// dos veces la apliqué a lo equivocado. Con un paso propio la regla vive en un solo lugar.
//
// LO QUE QUEDA
//   · 0 Ingreso (solo al ingresar) · 1 Prevención · 2 Turno · 3 Evaluaciones · 4 Terapia física
//     · 5 Planes · 6 Relato.
//   · La terapia física son DOS tarjetas (Rehabilitación: KTM, válvula de fonación, IMS; y IMT/EMS)
//     y se van JUNTAS al paso 4. Planes es la tarjeta «Cerrar el turno» (qué pasó hoy, plan,
//     pendientes y firma).
//   · 🔴 SE GUARDA AL SALIR DE PLANES, no antes: es donde está la firma, que es obligatoria. Salir
//     de Evaluaciones o de Terapia física no guarda nada. Después del guardado se llega al Relato.
//   · «No medí nada este turno» (Evaluaciones) sigue de largo a la terapia física: ya no guarda.
//   · En el CELULAR caben las seis: la pestaña activa muestra su nombre y las demás solo su número.
//
// 🪤 «CADA COSA SE MIDE DONDE VIVE»: aquí se mide justamente dónde vive cada cosa.
// 🪤 Reloj congelado: la fecha se INVENTA y el turno se fuerza en SHIFT.
//
// Uso: node build/checks/seis_pasos.js
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
  window._ll = [];
  window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
    api(a, d) { window._ll.push({ a, d }); let data = null; if (a === 'GET_CONFIG_UI') data = { NUM_CAMAS: 12, BANNERS: {} };
      else if (a === 'GET_EVO_TURNO') data = { actual: null, previa: null, pronoAbierto: '' };
      setTimeout(() => ok({ ok: true, data }), 5); } }; } }; } } } };
};

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const errs = [];
  const nueva = async ancho => { const q = await b.newPage({ viewport: { width: ancho, height: 1500 }, locale: 'es-CL' });
    q.on('pageerror', e => errs.push(e.message)); await q.addInitScript(PUENTE);
    await q.goto('file://' + path.join(v2, 'index.html')); await q.waitForTimeout(800); return q; };
  const p = await nueva(1200);

  const abrir = (pg, turno, ingreso) => pg.evaluate(async x => {
    $('kf').reset(); $('gDate').value = '2026-08-12'; SHIFT = x.turno;
    window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
    DB = x.ingreso ? [{ ID_CAMA: '5', OCUPADA: false }]
      : [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', VIA_AEREA: 'TOT', SOPORTE: 'VM', FECHA_INGRESO: '2026-08-05', TS_INGRESO: '2026-08-05 23:00:00',
          FECHA_INICIO_VA: '2026-08-08', TS_INICIO_VA: '2026-08-08 10:00:00', FECHA_INICIO_SOPORTE: '2026-08-08', TS_INICIO_SOPORTE: '2026-08-08 10:00:00' }];
    if (!window.__toastGancho) { window.__toastGancho = true; const t0 = window.toast; window.toast = function (m) { window.__ultimoToast = String(m); return t0.apply(this, arguments); }; }
    window.__ultimoToast = '';
    window.recargarSilencioso = () => {}; renderGrid(); abrirPanel(x.ingreso ? '5' : '3', !!x.ingreso, false);
    await new Promise(r => setTimeout(r, 800));
    if (typeof aplicarGatesEval === 'function') aplicarGatesEval();
  }, { turno, ingreso: !!ingreso });
  const ver = (pg, sel) => pg.evaluate(s => { const e = document.querySelector(s); if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0); }, sel);
  const paso = id => p.evaluate(i => { const e = document.getElementById(i); const d = e && e.closest('[data-paso]'); return d ? d.dataset.paso : (e ? '2 (sin dueño)' : '(no existe)'); }, id);

  console.log('\n1 · 🔴 La barra tiene seis pasos, en este orden');
  await abrir(p, 'Dia'); await p.evaluate(() => pasoIr(2));
  eq('★★ pestañas visibles y su orden', await p.evaluate(() => Array.from(document.querySelectorAll('#spPasos .paso-t')).filter(t => !t.classList.contains('hidden') && !t.classList.contains('paso-oculto')).map(t => t.dataset.p + ':' + t.querySelector('.paso-et').textContent.trim()).join(' · ')),
     '1:Prevención · 2:Turno · 3:Evaluaciones · 4:Terapia física · 5:Planes · 6:Relato');
  no('★ el ingreso (0) no aparece fuera del ingreso', await ver(p, '#pasoTab0'));

  console.log('\n2 · 🔴 Cada tarjeta vive en su paso');
  eq('★★ Rehabilitación (KTM) → paso 4', await paso('fcKtmCard'), '4');
  eq('★★ IMT/EMS → paso 4, con la KTM', await paso('fcImtBox'), '4');
  eq('★★ Evaluaciones → paso 3', await paso('fcEval'), '3');
  eq('★★ «Cerrar el turno» (con la firma) → paso 5', await paso('fcPlanes'), '5');
  eq('★★ la firma está en Planes', await paso('fFirma'), '5');
  eq('★★ el relato → paso 6', await paso('rarea'), '6');
  eq('★ el aviso de guardado → paso 6', await paso('pasoGuardado'), '6');
  eq('★ Respiratorio sigue en el turno (2)', await paso('fcRespCard'), '2');

  console.log('\n3 · 🔴 En cada paso se ve SOLO lo suyo');
  await p.evaluate(() => pasoIr(4));
  si('★★ paso 4: se ve la terapia física', await ver(p, '#fcKtmCard') && await ver(p, '#fcImtBox'));
  no('★★ …y no las evaluaciones', await ver(p, '#fcEval'));
  no('★★ …ni los planes', await ver(p, '#fcPlanes'));
  no('★ …ni el turno', await ver(p, '#fcRespCard'));
  await p.evaluate(() => pasoIr(5));
  si('★★ paso 5: se ve «Cerrar el turno»', await ver(p, '#fcPlanes'));
  no('★★ …y no la terapia física', await ver(p, '#fcKtmCard'));
  await p.evaluate(() => pasoIr(3));
  si('★★ paso 3: se ven las evaluaciones', await ver(p, '#fcEval'));
  no('★★ …y ya NO «Cerrar el turno» (se fue a Planes)', await ver(p, '#fcPlanes'));

  console.log('\n4 · 🔴 El camino: avanzar de a uno, y guardar SOLO al salir de Planes');
  const guardados = () => p.evaluate(() => window._ll.filter(l => l.a === 'GUARDAR_EVOLUCION').length);
  const txt = () => p.evaluate(() => $('pasoAvanza').textContent.trim());
  await p.evaluate(() => { $('fFirma').appendChild(Object.assign(document.createElement('option'), { value: 'K.T.', textContent: 'K.T.' })); $('fFirma').value = 'K.T.';
    const he = $('fHEst'); if (he && !he.value) he.value = 'Estable'; const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos';
    hPVEtoggle('si'); setKTMstate('r'); _transAvisoOk = true; window._ll.length = 0; pasoIr(2); });
  eq('en el 2 el botón dice «evaluaciones»', await txt(), 'Siguiente: evaluaciones →');
  await p.evaluate(() => pasoAvanzar());
  eq('★★ del 2 se va al 3', await p.evaluate(() => PASO_ACTUAL), '3');
  eq('en el 3 el botón dice «terapia física»', await txt(), 'Siguiente: terapia física →');
  await p.evaluate(() => pasoAvanzar());
  eq('★★ del 3 se va al 4 (y NO se guarda)', await p.evaluate(() => PASO_ACTUAL) + '|' + await guardados(), '4|0');
  eq('en el 4 el botón dice «planes»', await txt(), 'Siguiente: planes →');
  await p.evaluate(() => pasoAvanzar());
  eq('★★ del 4 se va al 5 (y NO se guarda)', await p.evaluate(() => PASO_ACTUAL) + '|' + await guardados(), '5|0');
  eq('★★ en el 5 el botón es el de GUARDAR', await txt(), '💾 Guardar y ver el relato');
  await p.evaluate(() => pasoAvanzar()); await p.waitForTimeout(500);
  eq('★★ al salir del 5 se guarda UNA vez', await guardados(), '1');
  eq('★★ y se llega al relato (6)', await p.evaluate(() => PASO_ACTUAL), '6');
  eq('en el 6 el botón cierra', await txt(), '✖ Cerrar la evolución');

  console.log('\n4b · 🔴 Saltar de paso con las pestañas no deja el botón desactivado');
  // Hallazgo de la revisión a máxima exigencia: en el paso 1 «Siguiente» se desactiva hasta revisar la prevención; al saltar
  // con una pestaña a OTRO paso el botón seguía desactivado (y en el 5 ese botón es el que GUARDA, sin avisar por qué).
  await abrir(p, 'Dia'); await p.evaluate(() => pasoIr(1));
  si('(control: en el paso 1, sin revisar la prevención, «Siguiente» está desactivado)', await p.evaluate(() => $('pasoAvanza').disabled));
  for (const n of [2, 3, 4, 5, 6]) {
    await p.evaluate(x => { pasoIr(1); pasoIr(x); }, n);
    no('★★ tras saltar del 1 al ' + n + ', el botón de avanzar está ACTIVADO', await p.evaluate(() => $('pasoAvanza').disabled));
  }
  no('★ y sin la opacidad de «apagado»', await p.evaluate(() => $('pasoAvanza').style.opacity === '.55'));

  console.log('\n4c · 🔴 La pestaña «6 Relato» NO se abre antes de guardar');
  // Hallazgo de la revisión a máxima exigencia: tocar la pestaña 6 antes de guardar pintaba «✓ Guardado · evolución del
  // turno…» y «✖ Cerrar la evolución», y con el formulario sin cambios cerraba sin avisar: se perdía el turno. En el celular
  // las pestañas 5 y 6 quedan pegadas (44 px cada una) y un toque corrido basta.
  await abrir(p, 'Dia'); await p.evaluate(() => { window._ll.length = 0; pasoIr(5); });
  await p.evaluate(() => document.querySelector('#spPasos [data-p="6"]').click());
  await p.waitForTimeout(150);
  eq('★★ tocar el 6 sin haber guardado NO abre el relato (se queda donde estaba)', await p.evaluate(() => PASO_ACTUAL), '5');
  no('★★ …y no pinta «Guardado»', await p.evaluate(() => /Guardado/.test($('pasoGuardado').textContent)));
  si('★ …y avisa por qué', await p.evaluate(() => /guarda/i.test(document.querySelector('#toasts, .toast, #toastBox')?.textContent || window.__ultimoToast || '')));
  await p.evaluate(() => { $('fFirma').appendChild(Object.assign(document.createElement('option'), { value: 'K.T.', textContent: 'K.T.' })); $('fFirma').value = 'K.T.';
    const he = $('fHEst'); if (he && !he.value) he.value = 'Estable'; const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos';
    hPVEtoggle('si'); setKTMstate('r'); _transAvisoOk = true; pasoAvanzar(); });
  await p.waitForTimeout(500);
  eq('(control: tras guardar se llega al relato)', await p.evaluate(() => PASO_ACTUAL), '6');
  await p.evaluate(() => { pasoIr(5); document.querySelector('#spPasos [data-p="6"]').click(); });
  eq('★★ y ya guardado, la pestaña 6 sí abre', await p.evaluate(() => PASO_ACTUAL), '6');

  console.log('\n5 · Volver paso a paso');
  await p.evaluate(() => pasoRetroceder());
  eq('del 6 se vuelve al 5', await p.evaluate(() => PASO_ACTUAL), '5');
  await p.evaluate(() => pasoRetroceder());
  eq('del 5 al 4', await p.evaluate(() => PASO_ACTUAL), '4');
  await p.evaluate(() => pasoRetroceder());
  eq('del 4 al 3', await p.evaluate(() => PASO_ACTUAL), '3');

  console.log('\n6 · «No medí nada este turno» sigue de largo, sin guardar');
  await p.evaluate(() => { window._ll.length = 0; pasoIr(3); $('pasoEvalNada').click(); });
  await p.waitForTimeout(200);
  eq('★★ lleva a la terapia física', await p.evaluate(() => PASO_ACTUAL), '4');
  eq('★★ y NO guarda', await guardados(), '0');
  si('★ el botón ya no promete ir al relato', !/relato/i.test(await p.evaluate(() => $('pasoEvalNada').innerText)));

  console.log('\n7 · Un obligatorio de la terapia física, mirado desde Planes, lleva al paso 4');
  await abrir(p, 'Dia');
  await p.evaluate(() => { $('fFirma').appendChild(Object.assign(document.createElement('option'), { value: 'K.T.', textContent: 'K.T.' })); $('fFirma').value = 'K.T.';
    const he = $('fHEst'); if (he && !he.value) he.value = 'Estable'; const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos';
    hPVEtoggle('si'); setKTMstate('n'); _transAvisoOk = true; window._ll.length = 0; pasoIr(5); });
  await p.evaluate(() => pasoAvanzar()); await p.waitForTimeout(400);
  eq('★★ guardar desde Planes con la KTM «no realizada» sin razón NO guarda', await guardados(), '0');
  eq('★★ …y te lleva a la Terapia física (4)', await p.evaluate(() => PASO_ACTUAL), '4');

  console.log('\n7b · Los chips de Evaluaciones se quedan en Evaluaciones (el IMS ya no vive en la terapia física)');
  // 🗂️ 2-oct-2026 · el IMS salió de la tarjeta de KTM y está en la familia «Funcionales» (chips_llevan_al_campo.js): ningún
  // chip del paso 3 necesita cruzar de paso, y cada uno llega a su campo (eso lo mide esa guardia).
  await abrir(p, 'Dia'); await p.evaluate(() => pasoIr(3));
  await p.evaluate(() => { document.querySelector('#pasoEvalChips [data-evk="ims"]').click(); });
  await p.waitForTimeout(200);
  eq('★★ tocar «IMS» en Evaluaciones se queda en el paso 3', await p.evaluate(() => PASO_ACTUAL), '3');
  si('★ …y el control del IMS queda a la vista', await ver(p, '#imsBtn'));
  await p.evaluate(() => pasoIr(3));
  await p.evaluate(() => { document.querySelector('#pasoEvalChips [data-evk="fem"]').click(); });
  await p.waitForTimeout(200);
  eq('★ ni el FEmáx cambia de paso', await p.evaluate(() => PASO_ACTUAL), '3');

  console.log('\n8 · El ingreso sigue siendo 0 → 2');
  await abrir(p, 'Dia', true);
  eq('★ se abre en el paso 0', await p.evaluate(() => PASO_ACTUAL), '0');
  si('★ y aparece la pestaña del ingreso', await ver(p, '#pasoTab0'));
  // (la Prevención no aplica a un paciente que acaba de llegar: su pestaña no sale en el ingreso)
  eq('★★ con el ingreso, las pestañas son 0, 2, 3, 4, 5 y 6', await p.evaluate(() => Array.from(document.querySelectorAll('#spPasos .paso-t')).filter(t => !t.classList.contains('hidden') && !t.classList.contains('paso-oculto')).map(t => t.dataset.p).join(',')), '0,2,3,4,5,6');

  console.log('\n9 · 🔴 En el CELULAR caben las seis');
  const m = await nueva(390);
  await abrir(m, 'Dia'); await m.evaluate(() => pasoIr(4));
  const med = await m.evaluate(() => { const bar = $('spPasos'); const tabs = Array.from(bar.querySelectorAll('.paso-t')).filter(t => !t.classList.contains('hidden') && !t.classList.contains('paso-oculto'));
    const act = tabs.find(t => t.getAttribute('aria-selected') === 'true');
    return { desborda: bar.scrollWidth > bar.clientWidth + 1, n: tabs.length, activa: act ? act.querySelector('.paso-et').getBoundingClientRect().width > 20 && getComputedStyle(act.querySelector('.paso-et')).display !== 'none' : false,
      nombreActiva: act ? act.querySelector('.paso-et').textContent.trim() : '', numerosVisibles: tabs.every(t => t.querySelector('.paso-n').getBoundingClientRect().width > 10) }; });
  no('★★ la barra no se sale de la pantalla', med.desborda);
  eq('★ seis pestañas', med.n, 6);
  si('★★ la activa muestra su NOMBRE completo', med.activa && med.nombreActiva === 'Terapia física');
  si('★★ y todas muestran su número', med.numerosVisibles);

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ seis_pasos: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
