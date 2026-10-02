// ingreso_soporte.js — «Cómo llega»: el soporte de ingreso se pregunta en el paso 0
// (Diego, 30-sep-2026).
//
// LO QUE PIDIÓ: «lo otro que agregaría es el soporte de ingreso: quiero discriminar si
// llega con ventilación mecánica invasiva o no invasiva, o si llega con apoyo de
// oxigenoterapia o sin apoyo, y qué tipo.» Y la lógica de fondo (1-oct): «una cosa es
// cómo llegó —puede haber llegado con vía aérea natural y podríamos haberlo intubado en
// el camino— y otra cómo está. El cómo está te dice que está con tubo; el cómo llegó,
// que estaba con vía aérea natural.»
//
// 🔵 NO ES UN DATO NUEVO: es una puerta nueva a los tres selectores de siempre (vía aérea
// · soporte · interfaz). Una sola fuente de verdad: si fuera un campo aparte, podría
// contradecir al del turno. Por eso los botones LEEN esos selectores y los ESCRIBEN.
//
// 🪤 SOLO EN EL INGRESO. Pasado el ingreso el soporte cambia por eventos (intubación,
// extubación…), y «cómo llegó» ya no se puede preguntar sin mentir.
//
// 🪤 LA LÍNEA FINA SE CONSERVA: en el ingreso la vía aérea está LIBRE (no hay evento que
// declarar: se registra el estado de llegada). Esta puerta no la bloquea.
//
// 🪤 Las combinaciones compuestas (tubo con tubo en T, traqueostomía con alto flujo…) no
// caben en cuatro botones: quedan sin botón marcado y se resuelven en Respiratorio.
//
// Uso: node build/checks/ingreso_soporte.js
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
    const FIJA = new Date(2026, 7, 12, 10, 0, 0).getTime(), RD = Date;
    function FD(...a) { if (!new.target) return new RD(FIJA).toString(); return a.length ? new RD(...a) : new RD(FIJA); }
    FD.prototype = RD.prototype; FD.now = () => FIJA; FD.UTC = RD.UTC; FD.parse = RD.parse; window.Date = FD;
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
      api(a) { setTimeout(() => ok({ ok: true, data: (a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null) }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.join(V2, 'index.html'));
  await p.waitForTimeout(700);
  const abrir = esIng => p.evaluate(async esIng => {
    $('kf').reset(); $('gDate').value = '2026-08-12'; SHIFT = 'Dia';
    window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
    DB = esIng ? [{ ID_CAMA: '5', OCUPADA: false }]
               : [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM', FECHA_INGRESO: '2026-08-07', TS_INGRESO: '2026-08-07 14:30:00' }];
    renderGrid(); abrirPanel(esIng ? '5' : '3', esIng, false);
    await new Promise(r => setTimeout(r, 450));
  }, esIng);
  const vis = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && !!(r.width || r.height); }, sel);
  const est = () => p.evaluate(() => ({ va: v('fVA'), sop: v('fSop'), itz: v('fInterfaz') }));
  const pres = k => p.evaluate(x => document.querySelector('#ingSoporte [data-k="' + x + '"]')?.getAttribute('aria-pressed'), k);
  const tipo = () => p.evaluate(() => Array.from($('fIngSopTipo').options).map(o => o.value).filter(Boolean).join(','));
  const toca = k => p.click('#ingSoporte [data-k="' + k + '"]').then(() => p.waitForTimeout(120));

  await abrir(true);
  console.log('\n1 · 🔴 En el ingreso se pregunta cómo llega, con cuatro opciones');
  si('★★ el bloque «Cómo llega» se ve', await vis('#ingSoporte'));
  eq('★★ las cuatro: VM invasiva · VM no invasiva · Oxigenoterapia · Sin apoyo',
     await p.evaluate(() => Array.from(document.querySelectorAll('#ingSoporte [data-k]')).map(e => e.textContent.trim()).join(' | ')),
     'VM invasiva | VM no invasiva | Oxigenoterapia | Sin apoyo');
  si('★★ vive en el bloque «Llegada»', await p.evaluate(() => !!$('ingSoporte').closest('[data-bloque="llegada"]')));
  eq('★★ al abrir no hay ninguna marcada: lo decide quien recibe', await p.evaluate(() => document.querySelectorAll('#ingSoporte [aria-pressed="true"]').length), 0);

  console.log('\n2 · 🔴 VM invasiva: tubo o traqueostomía');
  await toca('vmi');
  let e = await est();
  eq('★★ la vía aérea queda TOT', e.va, 'TOT');
  eq('★★ el soporte queda VM', e.sop, 'VM');
  eq('★ el botón queda marcado', await pres('vmi'), 'true');
  eq('★★ pregunta el tipo: tubo o traqueostomía', await tipo(), 'TOT,TQT');
  await p.selectOption('#fIngSopTipo', 'TQT'); await p.waitForTimeout(100);
  e = await est();
  eq('★★ al elegir traqueostomía, la vía aérea pasa a TQT', e.va, 'TQT');
  eq('★★ …y sigue en VM', e.sop, 'VM');

  console.log('\n3 · VM no invasiva: con qué máscara');
  await toca('vni');
  e = await est();
  eq('★★ vía aérea NATURAL (la máscara no es vía aérea)', e.va, 'Natural');
  eq('★★ soporte VNI', e.sop, 'VNI');
  eq('★★ pregunta la interfaz', await tipo(), 'Full Face,Oronasal');
  await p.selectOption('#fIngSopTipo', 'Oronasal'); await p.waitForTimeout(100);
  eq('★★ la interfaz elegida llega al selector de siempre', (await est()).itz, 'Oronasal');

  console.log('\n4 · Oxigenoterapia: con qué dispositivo');
  await toca('o2');
  e = await est();
  eq('★★ vía aérea natural', e.va, 'Natural');
  eq('★★ soporte oxigenoterapia', e.sop, 'Oxigenoterapia/OAF');
  eq('★★ pregunta el dispositivo', await tipo(), 'NRC,MMV,MR,CNAF');
  await p.selectOption('#fIngSopTipo', 'CNAF'); await p.waitForTimeout(100);
  eq('★★ el dispositivo llega a la interfaz', (await est()).itz, 'CNAF');

  console.log('\n5 · Sin apoyo');
  await toca('ambiente');
  e = await est();
  eq('★★ vía aérea natural', e.va, 'Natural');
  eq('★★ soporte ambiente', e.sop, 'Ambiente');
  no('★★ no hay nada más que preguntar: sin tipo', await vis('#fIngSopTipo'));

  console.log('\n6 · 🪤 Una sola fuente de verdad: si se cambia en Respiratorio, los botones lo siguen');
  await p.evaluate(() => { $('fVA').value = 'TOT'; cascadeVA('VM'); updateVAUI(); });
  await p.waitForTimeout(150);
  eq('★★ cambiar la vía aérea abajo marca «VM invasiva» arriba', await pres('vmi'), 'true');
  eq('★ y suelta la anterior', await pres('ambiente'), 'false');
  await p.evaluate(() => { $('fVA').value = 'TOT'; cascadeVA('Oxigenoterapia/OAF'); updateVAUI(); });
  await p.waitForTimeout(150);
  eq('★★ una combinación compuesta (tubo con O₂) no marca ningún botón', await p.evaluate(() => document.querySelectorAll('#ingSoporte [aria-pressed="true"]').length), 0);

  console.log('\n7 · 🔴 La vía aérea sigue LIBRE en el ingreso (línea fina)');
  eq('★★ el selector de vía aérea no está bloqueado', await p.evaluate(() => $('fVA').disabled), 'false');

  console.log('\n8 · Pasado el ingreso, la pregunta no existe');
  await abrir(false);
  no('★★ en un turno de un paciente ya ingresado, «Cómo llega» no se ofrece', await vis('#ingSoporte'));

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ ingreso_soporte: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
