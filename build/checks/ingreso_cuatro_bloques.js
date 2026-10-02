// ingreso_cuatro_bloques.js — El paso 0 son cuatro bloques, cada uno una pregunta
// distinta, y la fecha y la hora de llegada son OBLIGATORIAS (Diego, 30-sep/1-oct-2026).
//
// LO QUE PIDIÓ: «En identificación, podríamos también dividirlos: nombre, RUT, nombre
// social. Abajo de eso, no en la misma fila, la edad, el sexo y la talla. El horario de
// ingreso podría ir junto a la procedencia, con la fecha de ingreso. Puede que no sea la
// misma en la cual yo estoy ingresando al paciente.» Y: «hay que hacer la fecha de
// ingreso obligatoria en el paso 0.»
//
// 🔴 ES CUÁNDO LLEGÓ EL PACIENTE, NO CUÁNDO LO ESTÁS ANOTANDO. Llegó a las 23:00 y se
// registra a la 01:00 → va 23:00. De ahí salen el día de estadía y los bloques de 24 h
// de VM; por eso no puede quedar en blanco.
//
// 🪤 Se SUGIERE con el momento actual y se corrige a mano. Por eso obligar no cuesta un
// toque en el caso normal: solo frena si alguien la borra a propósito.
//
// 🪤 La obligatoriedad vive en el CLIENTE, igual que la del RUT (acuerdo 1.1): el servidor
// sigue tolerando un episodio sin fecha (se ancla al primer turno) para no romper
// ingresos viejos ni clientes sin actualizar.
//
// 🪤 Los CAMPOS no cambiaron de id ni de columna: solo de lugar. Lo que se mueve es la
// fecha y la hora, que vivían en «General» (paso 2), tres tarjetas lejos de donde se ingresa.
//
// Uso: node build/checks/ingreso_cuatro_bloques.js
const path = require('path');
const { chromium } = require('playwright-core');
const V2 = path.join(__dirname, '..', '..', 'v2');
const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 1300 }, locale: 'es-CL' });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    const FIJA = new Date(2026, 7, 12, 23, 10, 0).getTime(), RD = Date;   // 12-ago-2026 23:10, fuera de las ventanas trampa
    function FD(...a) { if (!new.target) return new RD(FIJA).toString(); return a.length ? new RD(...a) : new RD(FIJA); }
    FD.prototype = RD.prototype; FD.now = () => FIJA; FD.UTC = RD.UTC; FD.parse = RD.parse;
    window.Date = FD;
    window.__toasts = [];
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
      api(a) { setTimeout(() => ok({ ok: true, data: (a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null) }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.join(V2, 'index.html'));
  await p.waitForTimeout(700);

  const abrir = esIng => p.evaluate(async esIng => {
    const _t = window.toast; window.__toasts = [];
    window.toast = m => { window.__toasts.push(String(m)); if (_t) _t(m); };
    $('kf').reset();
    $('gDate').value = '2026-08-12'; SHIFT = 'Noche';
    window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
    DB = esIng ? [{ ID_CAMA: '5', OCUPADA: false }]
               : [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM', FECHA_INGRESO: '2026-08-07', TS_INGRESO: '2026-08-07 14:30:00' }];
    renderGrid(); abrirPanel(esIng ? '5' : '3', esIng, false);
    await new Promise(r => setTimeout(r, 450));
  }, esIng);
  const vis = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && !!(r.width || r.height); }, sel);
  const bloque = id => p.evaluate(i => (document.getElementById(i)?.closest('[data-bloque]') || {}).dataset?.bloque || null, id);

  await abrir(true);
  console.log('\n1 · 🔴 Cuatro bloques, en este orden');
  eq('★★ identificación · demográficos · ingreso clínico · llegada',
     await p.evaluate(() => Array.from(document.querySelectorAll('#fcId [data-bloque]')).map(e => e.dataset.bloque).join(',')),
     'identificacion,demograficos,clinico,llegada');
  eq('★★ cada uno lleva su título', await p.evaluate(() => Array.from(document.querySelectorAll('#fcId [data-bloque] .bloqueT')).map(e => e.textContent.trim()).join(' | ')),
     'Identificación | Demográficos | Ingreso clínico | Llegada');

  console.log('\n2 · Cada campo, en su bloque');
  for (const [id, bl] of [['fNombre', 'identificacion'], ['fRut', 'identificacion'], ['fNombreSocial', 'identificacion'],
                          ['fEdad', 'demograficos'], ['fSexo', 'demograficos'], ['fTalla', 'demograficos'],
                          ['fDx', 'clinico'], ['fRem', 'clinico'],
                          ['fProcedencia', 'llegada'], ['fFechaIng', 'llegada'], ['fHoraIng', 'llegada']])
    eq('★ ' + id + ' → ' + bl, await bloque(id), bl);
  eq('★★ la edad, el sexo y la talla van ABAJO, no en la misma fila que el nombre',
     await p.evaluate(() => $('fEdad').closest('.row') !== $('fNombre').closest('.row')), 'true');

  console.log('\n3 · 🔴 La fecha y la hora salieron de «General»');
  eq('★★ la fecha de ingreso ya no está en la tarjeta General', await p.evaluate(() => !!$('fcGen').querySelector('#fFechaIng')), false);
  eq('★★ la hora tampoco', await p.evaluate(() => !!$('fcGen').querySelector('#fHoraIng')), false);

  console.log('\n4 · 🔴 Se sugieren con el momento de AHORA, y son obligatorias');
  eq('★★ la fecha sugerida es la de hoy', await p.evaluate(() => v('fFechaIng')), '2026-08-12');
  eq('★★ la hora sugerida es la de ahora', await p.evaluate(() => v('fHoraIng')), '23:10');
  si('★★ el rótulo de la fecha dice que es obligatoria', await p.evaluate(() => /obligatori/i.test($('fFechaIng').closest('.col').querySelector('label').textContent)));
  si('★★ el de la hora también', await p.evaluate(() => /obligatori/i.test($('fHoraIng').closest('.col').querySelector('label').textContent)));
  si('★ el bloque explica que es cuándo LLEGÓ, no cuándo se anota', await p.evaluate(() => /llegó/i.test(document.querySelector('#fcId [data-bloque="llegada"]').textContent)));

  console.log('\n5 · 🔴 Sin fecha o sin hora, del ingreso no se sale');
  const salir = campos => p.evaluate(async c => {
    window.__toasts.length = 0;
    $('fNombre').value = 'PACIENTE DE PRUEBA'; $('fRut').value = '11.111.111-1';
    $('fFechaIng').value = c.fecha; $('fHoraIng').value = c.hora;
    pasoAvanzar();
    await new Promise(r => setTimeout(r, 120));
    return { paso: PASO_ACTUAL, toast: window.__toasts.join(' | ') };
  }, campos);
  let r = await salir({ fecha: '', hora: '23:10' });
  eq('★★ sin fecha: se queda en el paso 0', r.paso, 0);
  si('★★ …y avisa por qué', /fecha/i.test(r.toast));
  r = await salir({ fecha: '2026-08-12', hora: '' });
  eq('★★ sin hora: se queda en el paso 0', r.paso, 0);
  si('★★ …y avisa por qué', /hora/i.test(r.toast));
  r = await salir({ fecha: '2026-08-12', hora: '23:10' });
  eq('★★ con las dos, sigue al turno', r.paso, 2);

  console.log('\n6 · Corregirla a mano (llegó antes de anotarlo)');
  await abrir(true);
  const corr = await p.evaluate(async () => {
    $('fNombre').value = 'PACIENTE DE PRUEBA'; $('fRut').value = '11.111.111-1';
    $('fFechaIng').value = '2026-08-12'; $('fHoraIng').value = '21:00';
    pasoAvanzar(); await new Promise(r => setTimeout(r, 120));
    return { paso: PASO_ACTUAL, fecha: v('fFechaIng'), hora: v('fHoraIng') };
  });
  eq('★ se puede escribir una hora anterior y se acepta', corr.paso, 2);
  eq('★ …y se conserva', corr.hora, '21:00');

  console.log('\n7 · Pasado el ingreso, la fecha se ve y no se edita');
  await abrir(false);
  eq('★★ fuera del ingreso la fecha queda bloqueada', await p.evaluate(() => $('fFechaIng').disabled), 'true');
  eq('★ …y muestra la guardada', await p.evaluate(() => v('fFechaIng')), '2026-08-07');
  eq('★ la hora guardada también', await p.evaluate(() => v('fHoraIng')), '14:30');

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ ingreso_cuatro_bloques: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
