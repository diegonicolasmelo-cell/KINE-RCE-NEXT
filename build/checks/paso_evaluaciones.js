// paso_evaluaciones.js — El paso 2 muestra lo del episodio y se cruza barato
// (tanda C del rediseño; decisiones de Diego del 16-sep-2026).
//
// EL RIESGO QUE ATIENDE. Las escalas NO se miden todos los turnos, y son 12 a
// 20 camas por turno. Un paso 2 que obligue a llenar algo se abandona en tres
// días: el equipo aprende a apretar «siguiente» sin mirar, y entonces el paso
// no sirvió de nada. Tiene que poder cruzarse en UN clic y, aun así, dejar
// visto qué le falta al episodio.
//
// LO QUE FIJA:
//   1 · los chips del episodio con su valor, su fecha y la FIRMA de quien
//       midió — procedencia, no propiedad;
//   2 · ★ lo que falta se ve distinto de lo que está medido;
//   3 · ★ «No medí nada este turno» cruza en un clic Y guarda;
//   4 · tocar un chip abre su calculadora de siempre;
//   5 · ★ la regla del SBC YA NO rechaza (D6 de Diego): con el camino
//       secuencial el FSS se mide en el paso 2, o sea DESPUÉS de marcar la
//       KTM — rechazar en el paso 1 sería rechazar algo que no podía estar.
//
// 🪤 Las fechas se inventan desde el reloj de la página; nada anclado a un día
// fijo, o la guardia cambia de resultado según cuándo se corra.
//
// Uso: node build/checks/paso_evaluaciones.js
const path = require('path');
const { chromium } = require('playwright-core');
const V2 = path.resolve(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.__llamadas = [];
    window.google = { script: { run: { withSuccessHandler(okF) { return { withFailureHandler() { return {
      api(a, d) {
        window.__llamadas.push({ a: a, d: d });
        const R = { GET_CONFIG_UI: { NUM_CAMAS: 12, BANNERS: {} } };
        setTimeout(() => okF({ ok: true, data: R[a] !== undefined ? R[a] : null }), 5);
      }
    }; } }; } } } };
  });
  await p.goto('file://' + path.join(V2, 'index.html'));
  await p.waitForTimeout(800);

  // Episodio con MRC medido hace dos días por MCC, y el FSS nunca medido.
  await p.evaluate(() => {
    const hb = n => { const d = new Date(hoy() + 'T12:00:00'); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
    DB = [{ ID_CAMA: '5', OCUPADA: true, PATIENT_ID: 'p5', NOMBRE: 'PACIENTE PRUEBA', EDAD: 58, SEXO: 'F',
            VIA_AEREA: 'TQT', SOPORTE: 'VM', FECHA_INGRESO: hb(4),
            ULT_MRC: '36', ULT_MRC_FECHA: hb(2), ULT_MRC_FIRMA: 'MCC',
            ULT_FSS: '', ULT_FSS_FECHA: '', ULT_FSS_FIRMA: '',
            ULT_DINAMO: '11.4', BARTHEL: '80' }];
    window.recargarSilencioso = () => {};
    renderGrid(); abrirPanel('5', false, false);
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    $('fVA').value = 'TQT'; cascadeVA();
    $('fSop').value = 'VM'; cascadeSop();
    $('fModo').value = 'CPAP/PS'; renderParams();
    /* 🪤 19-sep-2026 · El equipo se SIEMBRA, porque ya no viene en el código:
       los nombres se mudaron a la hoja KINESIOLOGOS y el selector de firma nace
       vacío hasta que el arranque lo llena. Antes bastaba con añadir una opción
       si no había ninguna; ahora siempre hay una (el aviso «falta cargar el
       equipo»), así que ese truco dejaba el selector sin la firma y el guardado
       no salía. Se usa la puerta de verdad: Turnos.setRoster(). */
    const f = $('fFirma'); if (f) { if (window.Turnos) Turnos.setRoster([{ f: 'DMV', n: 'Kinesiólogo de prueba', t: 'Klgo.' }]); f.value = 'DMV'; }
    /* 🪤 TURNO CONGELADO. Desde el 19-sep («KTM A») la pantalla cambia según
       el turno: de noche la KTM se apaga y los chips del pool quedan en solo
       lectura. Sin fijar SHIFT esta guardia sale verde de día y roja de
       noche — que es la trampa del reloj, otra vez. */
    SHIFT = 'Dia';
    if (typeof aplicarGatesEval === 'function') aplicarGatesEval();
    pasoIr(3);   // 🗂️ las evaluaciones pasaron del 2 al 3 (entró la prevención)
  });
  await p.waitForTimeout(300);

  const txt = sel => p.evaluate(s => ((document.querySelector(s) || {}).textContent || ''), sel);
  const ver = sel => p.evaluate(s => { const e = document.querySelector(s); return !!e && e.offsetParent !== null; }, sel);

  console.log('\n1 · Los chips del episodio, con firma');
  si('★ el paso 2 pinta los chips del episodio', await ver('#pasoEvalChips'));
  const chips = await txt('#pasoEvalChips');
  si('★ el MRC muestra su valor', /36/.test(chips));
  si('★ …y la FIRMA de quien lo midió', /MCC/.test(chips));
  si('…y su fecha', /\d{2}-\d{2}/.test(chips));
  si('★ el FSS, que nunca se midió, se ofrece como pendiente', /FSS/.test(chips));
  si('la dinamometría medida también aparece', /11[.,]4/.test(chips));
  eq('★ lo pendiente se ve distinto de lo medido',
     await p.evaluate(() => {
       const pend = document.querySelectorAll('#pasoEvalChips .a-pend').length;
       const hecho = document.querySelectorAll('#pasoEvalChips .a-eval').length;
       return pend > 0 && hecho > 0;
     }), true);

  console.log('\n2 · Tocar un chip abre su calculadora');
  await p.evaluate(() => {
    const c = Array.from(document.querySelectorAll('#pasoEvalChips [data-esc]'))
      .find(x => x.dataset.esc === 'mrc');
    if (c) c.click();
  });
  await p.waitForTimeout(300);
  si('★ se abre la calculadora del MRC', await p.evaluate(() => {
    const m = document.getElementById('mMrc'); return !!m && m.classList.contains('on');
  }));
  await p.evaluate(() => { const m = document.getElementById('mMrc'); if (m) m.classList.remove('on'); });

  console.log('\n3 · ★ «No medí nada este turno» cruza en UN clic, y guarda');
  si('el botón está a la vista en el paso 2', await ver('#pasoEvalNada'));
  si('…y dice lo que hace', /no med/i.test(await txt('#pasoEvalNada')));
  await p.evaluate(() => { window.__llamadas.length = 0; $('pasoEvalNada').click(); });
  await p.waitForTimeout(700);
  si('★★ guarda', (await p.evaluate(() => window.__llamadas.filter(x => x.a === 'GUARDAR_EVOLUCION').length)) > 0);
  eq('★★ …y lleva al relato (paso 4 desde el 17-sep-2026)', await p.evaluate(() => {
    const t = document.querySelector('#spPasos [aria-selected="true"]'); return t ? t.dataset.p : '';
  }), '4');
  no('★ …sin escribir NADA en la serie (no midió nada)',
     (await p.evaluate(() => window.__llamadas.filter(x => x.a === 'EVAL_REGISTRAR').length)) > 0);

  console.log('\n4 · ★ D6 · la regla del SBC ya no rechaza');
  await p.evaluate(() => {
    abrirPanel('5', false, false);
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    $('fVA').value = 'TQT'; cascadeVA();
    $('fSop').value = 'VM'; cascadeSop();
    $('fModo').value = 'CPAP/PS'; renderParams();
    const f = $('fFirma'); if (f) { if (window.Turnos) Turnos.setRoster([{ f: 'DMV', n: 'Kinesiólogo de prueba', t: 'Klgo.' }]); f.value = 'DMV'; }
    // KTM nivel 3 (sedente al borde de la cama) SIN ningún FSS en el episodio
    if (typeof setKTMstate === 'function') setKTMstate('r');
    const n = $('fKTMniv'); if (n) { n.value = '3'; n.dispatchEvent(new Event('change')); }
    window.__llamadas.length = 0;
    /* 🪤 TURNO CONGELADO. Desde el 19-sep («KTM A») la pantalla cambia según
       el turno: de noche la KTM se apaga y los chips del pool quedan en solo
       lectura. Sin fijar SHIFT esta guardia sale verde de día y roja de
       noche — que es la trampa del reloj, otra vez. */
    SHIFT = 'Dia';
    if (typeof aplicarGatesEval === 'function') aplicarGatesEval();
    pasoIr(3);   // 🗂️ las evaluaciones pasaron del 2 al 3 (entró la prevención)
  });
  await p.waitForTimeout(200);
  await p.evaluate(() => $('pasoEvalNada').click());
  await p.waitForTimeout(700);
  si('★★ guarda igual, sin exigir el FSS',
     (await p.evaluate(() => window.__llamadas.filter(x => x.a === 'GUARDAR_EVOLUCION').length)) > 0);

  console.log('\n5 · Y la regla salió del código, no quedó dormida');
  const fs = require('fs');
  const dom = fs.readFileSync(path.join(V2, 'dominio_validacion.gs'), 'utf8');
  no('★ validarSBC ya no existe en el dominio', /function validarSBC/.test(dom));
  const evo = fs.readFileSync(path.join(V2, 'svc_evoluciones.gs'), 'utf8');
  no('★ …ni se llama desde el guardado', /validarSBC/.test(evo));

  eq('sin errores de JavaScript', errs.join(' | '), '');
  await b.close();
  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
