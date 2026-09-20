// ingreso_paso_cero.js — El ingreso es un PASO 0 propio, no toda la planilla
// de una vez (20-sep-2026).
//
// 🔴 DE DÓNDE SALE, y es un reproche justo. Diego, después de pegar:
//   «Revisé el módulo de turno y me di cuenta que está igual que antes, me
//    sigue mostrando toda la planilla, no inicia el modal de identificación al
//    inicio, que sería el paso 0. Recuerda que esto se rediseñó y no debería ir
//    así.»
//
// Tenía razón: el acuerdo 1 se cerró el 19-sep —«el ingreso pasa a ser un modal
// único, paso 0, que abre al ocupar una cama y lleva derecho al turno»— y se
// quedó EN PAPEL. Lo que hacía `abrirPanel` en modo ingreso era un `show('fcId')`:
// la misma planilla entera con una tarjeta más arriba. No existía ningún paso 0
// en el código.
//
// LO QUE ESTA GUARDIA FIJA:
//   1 · hay un paso 0 y al ocupar una cama el panel abre AHÍ, no en el 1;
//   2 · en el paso 0 se ve la identificación y NADA del turno — que es el punto:
//       «me sigue mostrando toda la planilla»;
//   3 · de ahí se va DERECHO al turno (el paso 2), saltando la prevención: un
//       paciente que acaba de llegar todavía no tiene circuito que revisar;
//   4 · en una evolución normal el paso 0 NO existe: nadie vuelve a ingresar a
//       un paciente ya ingresado;
//   5 · el RUT es obligatorio para ingresar (acuerdo 1.1: sin él no se puede
//       cruzar con nada, ni consigo mismo si reingresa);
//   6 · «Ingreso: electivo/urgencia» pasó a ser PROCEDENCIA con sus siete
//       opciones (acuerdo 1.2), y el nombre social existe (acuerdo 1.7).
//
// 🪤 El reloj va congelado: fecha inventada y SHIFT forzado.

const fs = require('fs');
const path = require('path');
const V2 = path.join(__dirname, '..', '..', 'v2');
const idx = fs.readFileSync(path.join(V2, 'index.html'), 'utf8');
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
    window.__toasts = [];
    window.google = { script: { run: { withSuccessHandler(okF) { return { withFailureHandler() { return {
      api(a) { setTimeout(() => okF({ ok: true, data: (a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null) }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.resolve(V2, 'index.html'));
  await p.waitForTimeout(700);

  const abrir = (esIng) => p.evaluate(async (esIng) => {
    const _t = window.toast; window.__toasts = [];
    window.toast = m => { window.__toasts.push(String(m)); if (_t) _t(m); };
    $('kf').reset();
    $('gDate').value = '2026-08-12';         // 🪤 fecha inventada
    SHIFT = 'Dia';                           // 🪤 turno forzado
    window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
    DB = esIng
      ? [{ ID_CAMA: '5', OCUPADA: false }]
      : [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM' }];
    renderGrid();
    abrirPanel(esIng ? '5' : '3', esIng, false);
    await new Promise(r => setTimeout(r, 450));
  }, esIng);

  const vis = (id) => p.evaluate((id) => {
    const e = document.getElementById(id); if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && !!(r.width || r.height);
  }, id);
  const paso = () => p.evaluate(() => PASO_ACTUAL);

  /* ══ 1 · Al ocupar una cama se abre en el paso 0 ══════════════════════ */
  console.log('\n1 · 🔴 «No inicia el modal de identificación al inicio»');
  await abrir(true);
  eq('★★ el ingreso abre en el paso 0', await paso(), 0);
  si('★★ y se ve la identificación', await vis('fcId'));
  si('   con su pestaña en la barra', await vis('pasoTab0'));

  /* ══ 2 · Y NADA del turno ═════════════════════════════════════════════ */
  console.log('\n2 · 🔴 «Me sigue mostrando toda la planilla»');
  for (const [id, nom] of [['fcRespCard', 'Respiratorio'], ['fcKtmCard', 'Rehabilitación'],
                           ['fcPrevNavm', 'Prevención de NAVM'], ['fcPlanes', 'el cierre']]) {
    no('★★ en el paso 0 no se ve ' + nom, await vis(id));
  }

  /* ══ 3 · Del ingreso se va derecho al turno ═══════════════════════════ */
  console.log('\n3 · Del ingreso, derecho al turno (se salta la prevención)');
  const av = await p.evaluate(() => (document.getElementById('pasoAvanza') || {}).textContent || '');
  si('★ el botón anuncia el turno', /turno/i.test(av));
  const T = await p.evaluate(async () => {
    $('fNombre').value = 'PACIENTE DE PRUEBA';
    $('fRut').value = '11111111-1';          // 🔒 RUT inventado, como manda el proyecto
    pasoAvanzar();
    await new Promise(r => setTimeout(r, 250));
    return { paso: PASO_ACTUAL, avisos: window.__toasts.join(' | ') };
  });
  eq('★★ con nombre y RUT, avanza al turno', T.paso, 2);

  /* ══ 4 · El RUT es obligatorio para ingresar ══════════════════════════ */
  console.log('\n4 · 🔴 Sin RUT no se ingresa (acuerdo 1.1)');
  await abrir(true);
  const R = await p.evaluate(async () => {
    $('fNombre').value = 'PACIENTE SIN RUT';
    pasoAvanzar();
    await new Promise(r => setTimeout(r, 250));
    return { paso: PASO_ACTUAL, avisos: window.__toasts.join(' | ') };
  });
  eq('★★ sin RUT no se pasa del paso 0', R.paso, 0);
  si('★ y se dice por qué', /RUT/i.test(R.avisos));

  /* ══ 5 · En una evolución normal el paso 0 no existe ══════════════════ */
  console.log('\n5 · A un paciente ya ingresado no se le vuelve a ingresar');
  await abrir(false);
  no('★★ no hay pestaña de ingreso', await vis('pasoTab0'));
  no('★ ni se ve la identificación', await vis('fcId'));
  eq('★ y abre donde siempre', await paso(), 1);

  /* ══ 6 · Procedencia y nombre social ══════════════════════════════════ */
  console.log('\n6 · Procedencia en vez de «electivo o urgencia», y nombre social');
  await abrir(true);
  const P = await p.evaluate(() => {
    const s = document.getElementById('fProcedencia');
    return { hay: !!s, ops: s ? [...s.options].map(o => o.value).filter(Boolean) : [],
             social: !!document.getElementById('fNombreSocial') };
  });
  si('★★ existe Procedencia', P.hay);
  eq('★★ con las siete que dio Diego', P.ops.length, 7);
  si('   …y «Electivo» es una de ellas, no una categoría aparte', P.ops.indexOf('Electivo') >= 0);
  si('★ y el nombre social existe', P.social);
  no('   el viejo «electivo/urgencia» ya no está', /id="fIngTipo"/.test(idx));

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ ingreso_paso_cero: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ ingreso_paso_cero: el ingreso es su propio paso y lleva al turno.');
})();
