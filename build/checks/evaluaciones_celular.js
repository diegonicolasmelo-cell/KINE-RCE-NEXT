// evaluaciones_celular.js — Las evaluaciones son cajones cuadrados con icono, como
// las apps del teléfono, y cada uno avisa lo que le falta (Diego, 1-oct-2026).
//
// LO QUE PIDIÓ: «Revisé los cajones de la familia, están bastante buenos. Me
// gustaría que fuera como iconos cuadrados con un icono al medio y con el nombre
// de abajo, como los iconos del celular.» Y: «puede ser que hay cosas que no se
// vayan a rellenar, pero podríamos pedir algunos campos obligatorios, por ejemplo
// las evaluaciones de MRC, FSS. Probablemente va a pasar lo mismo que cuando están
// ocultas.»
//
// 🔴 «OBLIGATORIO» EN TRES NIVELES, NO EN UNO (la propuesta que se le mostró):
//   · BLOQUEA EL CIERRE — solo donde SIEMPRE hay respuesta posible: la PVE evaluada
//     (ya existía). Nunca deja a nadie atrapado.
//   · PENDIENTE QUE VENCE — MRC y FSS: numerito ROJO en su cajón cuando el paciente
//     coopera y no se miden hace días. Molesta a la vista; NO impide guardar.
//   · OPCIONAL — el resto: numerito gris con lo que falta, o visto verde si está al día.
// 🪤 EL MRC NO SE PUEDE EXIGIR SIEMPRE: necesita un paciente que coopere. Si bloqueara
// el cierre, el turno de un sedado quedaría trancado y el equipo aprendería a poner
// cualquier cosa para salir —peor que no tener el dato. (Y el 17-sep Diego mismo dijo
// «no podemos obligar a los colegas a que evalúen el MRC»: esto respeta las dos cosas.)
//
// 🪤 «LO QUE NO SE VE, NO SE LLENA»: el numerito es la respuesta. Un cajón que debe algo
// se nota desde FUERA, sin abrirlo.
//
// 🪤 LOS CAJONES FILTRAN SOLO CUANDO SE TOCAN. Marcar «registrar evaluación» por la vía
// de siempre sigue mostrando todo: así no se rompe lo que ya andaba.
//
// 🪤 Los iconos son SVG propios, no emojis (el Chrome del hospital no dibuja los nuevos).
//
// 🪤 Reloj congelado. Se mide en el PASO 3.
//
// Uso: node build/checks/evaluaciones_celular.js
const path = require('path');
const { chromium } = require('playwright-core');
const v2 = path.join(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 1700 }, locale: 'es-CL' });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    const FIJA = new Date(2026, 7, 12, 10, 0, 0).getTime(), RD = Date;
    function FD(...a) { if (!new.target) return new RD(FIJA).toString(); return a.length ? new RD(...a) : new RD(FIJA); }
    FD.prototype = RD.prototype; FD.now = () => FIJA; FD.UTC = RD.UTC; FD.parse = RD.parse;
    window.Date = FD;
  });
  await p.addInitScript(() => {
    window._ll = []; window.__evo = null;
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
      api(a, d) { window._ll.push({ a, d }); let data = null;
        if (a === 'GET_CONFIG_UI') data = { NUM_CAMAS: 12, BANNERS: {} };
        else if (a === 'GET_EVO_TURNO') data = { actual: window.__evo, previa: null, pronoAbierto: '' };
        setTimeout(() => ok({ ok: true, data }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.join(v2, 'index.html'));
  await p.waitForTimeout(800);

  /* extra = campos de la cama (ULT_MRC_FECHA…); coop = valor de fCoop. */
  const abrir = (o, evoGuardada) => p.evaluate(x => {
    window.__evo = x.evo; $('kf').reset();
    DB = [Object.assign({ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', EDAD: 61, SEXO: 'M',
            VIA_AEREA: x.o.va || 'TOT', SOPORTE: x.o.sop || 'VM', FECHA_INGRESO: x.o.ing || '2026-08-05' }, x.o.extra || {})];
    window.recargarSilencioso = () => {};
    $('gDate').value = '2026-08-12'; SHIFT = x.o.noche ? 'Noche' : 'Dia';
    renderGrid(); abrirPanel('3', false, false);
  }, { o, evo: evoGuardada || null }).then(() => p.waitForTimeout(800))
    .then(() => p.evaluate(x => { window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
      if (!window.__evo) { $('fVA').value = x.va || 'TOT'; cascadeVA(); $('fSop').value = x.sop || 'VM'; cascadeSop();
        if (x.modo) { $('fModo').value = x.modo; renderParams(); } updateVAUI(); }
      const fc = $('fCoop'); if (fc) fc.value = x.coop === undefined ? 'Cooperador' : x.coop;
      if (typeof aplicarGates === 'function') { try { aplicarGates(); } catch (e) {} }
      pasoEvalPintar(); pasoIr(3); }, o))
    .then(() => p.waitForTimeout(300));
  const ver = sel => p.evaluate(s => { const e = document.querySelector(s);
    if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0);
  }, sel);
  const bad = fam => p.evaluate(f => { const t = document.querySelector('#evTiles .evTile[data-fam="' + f + '"]');
    if (!t) return null; const e = t.querySelector('.evBadge');
    return e ? { t: e.textContent.trim(), c: e.dataset.nivel } : { t: '', c: '' }; }, fam);
  const tocar = f => p.click('#evTiles .evTile[data-fam="' + f + '"]').then(() => p.waitForTimeout(120));

  console.log('\n1 · 🔴 Cajones cuadrados, con icono y nombre, a la vista antes de registrar nada');
  await abrir({ va: 'TOT', sop: 'VM', modo: 'CPAP/PS' });
  si('★★ el panel de cajones se ve', await ver('#evTiles'));
  // 🗂️ 30-sep-2026: la sexta familia, «Preingreso», va PRIMERA (Barthel, ECF, Charlson, APACHE II).
  eq('★★ hay cajones para las seis familias', await p.evaluate(() => Array.from(document.querySelectorAll('#evTiles .evTile')).map(t => t.dataset.fam).join(',')),
     'preingreso,funcionales,fuerza,ecograficas,respiratorias,via');
  const t1 = await p.evaluate(() => { const ico = document.querySelector('#evTiles .evTile[data-fam="fuerza"] .evIco');
    const r = ico.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), svg: !!ico.querySelector('svg'),
             nombre: document.querySelector('#evTiles .evTile[data-fam="fuerza"] .evNom').textContent.trim(),
             esBoton: document.querySelector('#evTiles .evTile[data-fam="fuerza"]').tagName };
  });
  eq('★★ el icono es CUADRADO', t1.w === t1.h && t1.w >= 60, 'true');
  si('★★ …y es un SVG propio, no un emoji', t1.svg);
  eq('★★ el nombre va debajo', t1.nombre, 'De fuerza');
  eq('★ y es un botón de verdad (se llega con el teclado)', t1.esBoton, 'BUTTON');
  no('★★ 🪤 ningún emoji en los cajones (el Chrome del hospital no los dibuja)', await p.evaluate(() => /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test($('evTiles').textContent)));
  no('★★ antes de tocar uno, no se despliega ningún campo', await ver('#dEgr'));
  no('★ la casilla vieja «registrar evaluación este turno» ya no estorba', await ver('#cEgr'));

  console.log('\n2 · 🔴 Tocar un cajón abre SOLO su familia');
  await tocar('fuerza');
  si('★★ aparece el MRC', await ver('#rowMrc'));
  si('★★ …y la fuerza respiratoria (PIM/PEM)', await ver('#dxFzaResp'));
  no('★★ pero NO el FSS (es de otra familia)', await ver('#rowFss'));
  no('★★ ni la ecografía', await ver('#dxEco'));
  eq('★ el cajón queda marcado como abierto', await p.evaluate(() => document.querySelector('#evTiles .evTile[data-fam="fuerza"]').getAttribute('aria-pressed')), 'true');
  await tocar('funcionales');
  si('★★ al tocar otro, cambia de familia: aparece el FSS', await ver('#rowFss'));
  no('★★ …y se va el MRC', await ver('#rowMrc'));
  await tocar('funcionales');
  no('★★ tocar el mismo otra vez lo CIERRA', await ver('#dEgr'));

  console.log('\n3 · Cada bloque vive en su familia');
  const fam = id => p.evaluate(i => (document.getElementById(i)?.closest('.evFam') || {}).dataset?.fam || null, id);
  eq('★ MRC → fuerza', await fam('rowMrc'), 'fuerza');
  eq('★ PIM/PEM → fuerza', await fam('dxFzaResp'), 'fuerza');
  eq('★ FSS → funcionales', await fam('rowFss'), 'funcionales');
  eq('★ ecografía muscular → ecográficas', await fam('dxEco'), 'ecograficas');
  eq('★★ ecografía pulmonar → ecográficas', await fam('dxEcoPulm'), 'ecograficas');
  eq('★★ esfuerzo respiratorio → respiratorias', await fam('dxEsf'), 'respiratorias');
  eq('★ tos y deglución → protección de vía aérea', await fam('dxTos'), 'via');
  eq('★★ pruebas de traqueostomía → protección de vía aérea', await fam('dxTqt'), 'via');

  console.log('\n4 · Las familias que no aplican no se ofrecen');
  await abrir({ va: 'TOT', sop: 'VM', modo: 'ACVC' });
  no('★★ en ACVC no hay cajón «Respiratorias» (el esfuerzo es de ventilación espontánea)', await ver('#evTiles .evTile[data-fam="respiratorias"]'));
  si('★ pero las demás sí', await ver('#evTiles .evTile[data-fam="fuerza"]'));
  await abrir({ va: 'TOT', sop: 'VM', modo: 'CPAP/PS' });
  si('★★ en CPAP/PS sí aparece', await ver('#evTiles .evTile[data-fam="respiratorias"]'));

  console.log('\n5 · 🔴 El rojo: MRC y FSS vencidos, SOLO con un paciente que coopera');
  // Ingresó el 5-ago, hoy es 12-ago, no se midió nunca → vencidos
  await abrir({ va: 'TOT', sop: 'VM', modo: 'CPAP/PS', ing: '2026-08-05' });
  let r = await bad('fuerza');
  eq('★★ «De fuerza» lleva un 1 ROJO (el MRC)', r.t + '/' + r.c, '1/rojo');
  r = await bad('funcionales');
  eq('★★ «Funcionales» lleva un 1 ROJO (el FSS)', r.t + '/' + r.c, '1/rojo');
  r = await bad('ecograficas');
  eq('★★ las ecográficas NO son obligatorias: numerito GRIS con lo que falta (2)', r.t + '/' + r.c, '2/gris');
  await abrir({ va: 'TOT', sop: 'VM', modo: 'CPAP/PS', ing: '2026-08-05', coop: 'No cooperador' });
  r = await bad('fuerza');
  eq('★★ con un paciente que NO coopera, el MRC no se exige (no hay rojo)', r.c === 'rojo', 'false');
  await abrir({ va: 'TOT', sop: 'VM', modo: 'CPAP/PS', ing: '2026-08-11' });
  r = await bad('fuerza');
  eq('★★ un paciente que ingresó ayer todavía no debe nada', r.c === 'rojo', 'false');

  console.log('\n6 · Cuándo vence');
  await abrir({ va: 'TOT', sop: 'VM', modo: 'CPAP/PS', ing: '2026-08-01', extra: { ULT_MRC: 48, ULT_MRC_FECHA: '2026-08-11', ULT_FSS: 20, ULT_FSS_FECHA: '2026-08-11' } });
  eq('★★ medido AYER: no vence', (await bad('fuerza')).c === 'rojo', 'false');
  await abrir({ va: 'TOT', sop: 'VM', modo: 'CPAP/PS', ing: '2026-08-01', extra: { ULT_MRC: 48, ULT_MRC_FECHA: '2026-08-07', ULT_FSS: 20, ULT_FSS_FECHA: '2026-08-07' } });
  eq('★★ medido hace 5 días: VENCIDO', (await bad('fuerza')).c, 'rojo');
  eq('★★ el FSS también', (await bad('funcionales')).c, 'rojo');

  console.log('\n7 · Medirlo en este turno apaga el rojo');
  await tocar('fuerza');
  await p.evaluate(() => { const m = $('fMRC'); m.removeAttribute('readonly'); m.value = '52'; m.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.waitForTimeout(150);
  eq('★★ al anotar el MRC de hoy, el rojo se va', (await bad('fuerza')).c === 'rojo', 'false');

  console.log('\n8 · 🔴 El rojo NO impide guardar (solo la PVE lo hace)');
  await abrir({ va: 'TOT', sop: 'VM', modo: 'CPAP/PS', ing: '2026-08-01' });
  eq('control: hay un rojo pendiente', (await bad('fuerza')).c, 'rojo');
  const guarda = await p.evaluate(async () => {
    $('cBed').value = '3';
    const o = document.createElement('option'); o.value = 'Klgo. Test'; o.textContent = 'Klgo. Test';
    if (!Array.from($('fFirma').options).some(x => x.value === 'Klgo. Test')) $('fFirma').appendChild(o);
    $('fFirma').value = 'Klgo. Test';
    const he = $('fHEst'); if (he && !he.value) he.value = 'Estable';
    const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos';
    { const pv = $('fPVEval'); if (pv && !pv.value) { hPVEtoggle('nc'); const r = $('fPveNcRaz'); if (r) { r.value = 'Ventilación mecánica domiciliaria'; hPveNcRaz(); } } }
    _transAvisoOk = true; window._ll.length = 0; guardar();
    await new Promise(r => setTimeout(r, 90));
    return window._ll.some(x => x.a === 'GUARDAR_EVOLUCION');
  });
  si('★★ con el MRC vencido, el turno SE GUARDA igual', guarda);
  eq('★★ y el aviso de lo que falta NO menciona el MRC', await p.evaluate(() => { rielRender(); return /MRC/i.test($('gFalta').textContent); }), 'false');

  console.log('\n9 · El verde y el gris');
  await abrir({ va: 'TOT', sop: 'VM', modo: 'CPAP/PS', ing: '2026-08-11' });
  await tocar('funcionales');
  await p.evaluate(() => { $('fFSS').removeAttribute('readonly'); $('fFSS').value = '20'; $('fFSS').dispatchEvent(new Event('input', { bubbles: true }));
    $('fCpaxTotal').value = '30'; $('fCpaxTotal').dispatchEvent(new Event('input', { bubbles: true }));
    $('fIMS').value = '5'; $('fIMS').dispatchEvent(new Event('input', { bubbles: true })); evTilesPintar(); });
  await p.waitForTimeout(150);
  eq('★★ con las tres funcionales hechas hoy, el cajón lleva el VISTO VERDE', (await bad('funcionales')).c, 'verde');

  console.log('\n10 · Un turno guardado se reabre en la familia que tiene datos');
  await abrir({ va: 'TOT', sop: 'VM', modo: 'CPAP/PS', ing: '2026-08-05' }, { ID_CAMA: '3', TURNO_KEY: '2026-08-12-Dia', PATIENT_ID: 'p3', PAC_NOMBRE: 'P',
    PLAN_FIRMA_KINE: 'K.P.', VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', VENT_MODO: 'CPAP/PS', EVAL_FECHA: '2026-08-12', EVAL_T_REALIZAR: true,
    ECO_PULM_JSON: '{"lus":{"AS_D":1}}' });
  si('★★ se ve la ecografía que se había anotado', await ver('#dxEcoPulm'));
  no('★★ y NO las demás familias (no son diecisiete campos de golpe)', await ver('#rowMrc'));
  eq('★ el cajón de las ecográficas queda abierto', await p.evaluate(() => document.querySelector('#evTiles .evTile[data-fam="ecograficas"]').getAttribute('aria-pressed')), 'true');

  console.log('\n11 · De noche los cajones se ven, APAGADOS');
  // 🗂️ 2-oct-2026 (Diego: «de noche aparezca en evaluaciones el mismo formato del día»). Hasta entonces
  // esta guardia exigía que de noche NO hubiera cajones. La convención cambió a propósito: se ven, pero
  // apagados y sin numerito. Lo mide a fondo noche_no_corresponde.js.
  await abrir({ va: 'TOT', sop: 'VM', modo: 'CPAP/PS', noche: true });
  si('★★ de noche los cajones SÍ se ven (el mismo formato del día)', await ver('#evTiles'));
  eq('★★ …y están todos apagados: de noche no se registran mediciones', await p.evaluate(() => Array.from(document.querySelectorAll('#evTiles .evTile')).filter(t => !t.disabled).length), '0');

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ evaluaciones_celular: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
