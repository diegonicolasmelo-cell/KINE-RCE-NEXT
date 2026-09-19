// cuatro_pasos.js — El modal deja de ser un muro y pasa a ser un camino
// (tanda B del rediseño; decisiones de Diego del 16-sep-2026).
//
// 🗂️ 17-sep-2026 · SE LLAMABA tres_pasos.js. La convención cambió de verdad,
// no se ablandó la guardia: entró el paso 1 de Prevención de NAVM delante del
// turno, porque ese es el orden real del trabajo (Diego: «llegas, miras: está
// con tubo, está ventilado, tiene el cuff bien… y después me voy a revisar lo
// ventilatorio»). Turno, evaluaciones y relato corrieron al 2, 3 y 4. Lo que
// esta guardia protege no cambió: que cada paso muestre LO SUYO, que el
// guardado ocurra al salir del paso de evaluaciones y que volver no borre.
//
// EL PROBLEMA. Un solo modal con 225 campos donde conviven cuatro cosas: lo
// que pasó en el turno, lo que se midió, los eventos y el relato. El MRC es un
// campo entre 225 y se saltea sin que nadie lo note.
//
// LO QUE ESTA GUARDIA FIJA:
//   1 · hay cuatro pasos y se abre en el primero que aplique;
//   2 · ★ cada paso muestra LO SUYO y esconde lo de los otros — que es lo
//       único que hace que esto sea un camino y no una pestaña decorativa;
//   3 · los pendientes que dejó el turno anterior abren el paso del turno, y
//       se cierran desde ahí (tanda A puesta en pantalla);
//   4 · ★ el guardado ocurre al SALIR DE LAS EVALUACIONES, no al final: en la
//       UCI se sale corriendo y el relato ya no puede perder nada;
//   5 · volver atrás conserva lo escrito.
//
// 🪤 Nada anclado a un día fijo: las fechas se arman desde el reloj de la
// página, no se esperan.
//
// Uso: node build/checks/cuatro_pasos.js
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
  await p.waitForTimeout(700);

  // Una cama con dos pendientes del episodio: uno abierto y uno ya cerrado.
  await p.evaluate(() => {
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'PACIENTE PRUEBA',
            EDAD: 64, SEXO: 'M', VIA_AEREA: 'TQT', SOPORTE: 'VM',
            PENDIENTES_JSON: JSON.stringify([
              { id: 'aa1', tx: 'Solicitar evaluación fonoaudiológica', ab: 'MCC', abTs: '', ci: '', ciTs: '' },
              { id: 'bb2', tx: 'Esto ya se hizo', ab: 'ARM', abTs: '', ci: 'DMV', ciTs: '' },
            ]) }];
    window.recargarSilencioso = () => {};
    renderGrid();
    abrirPanel('3', false, false);
  });
  await p.waitForTimeout(400);

  const ver = sel => p.evaluate(s => { const e = document.querySelector(s); return !!e && e.offsetParent !== null; }, sel);
  const paso = () => p.evaluate(() => {
    const t = document.querySelector('#spPasos [aria-selected="true"]');
    return t ? String(t.dataset.p) : '';
  });

  console.log('\n1 · El armazón');
  si('existe la barra de pasos', await ver('#spPasos'));
  eq('★ hay CUATRO pasos', await p.evaluate(() => document.querySelectorAll('#spPasos [data-p]').length), 4);
  // Esta cama está con TQT y en VM, así que SÍ hay algo que prevenir y el
  // camino arranca en el paso 1. (Sin vía aérea artificial ni ventilación la
  // pestaña se esconde y se abre directo en el turno — lo fija
  // prevencion_navm.js; acá interesa el caso con prevención.)
  eq('★ el panel se abre en la prevención', await paso(), '1');
  no('…y «atrás» no se ofrece en el primero', await ver('#pasoAtras'));
  si('★ el botón de avanzar anuncia a dónde lleva',
     /turno/i.test(await p.evaluate(() => ($('pasoAvanza') || {}).textContent || '')));

  console.log('\n2 · ★ Cada paso muestra lo suyo y esconde lo de los otros');
  si('prevención: se ve el paquete de NAVM', await ver('#fcPrevNavm'));
  no('prevención: NO se ve el bloque respiratorio', await ver('#fcRespCard'));

  // El paso 1 no deja avanzar sin revisar lo que está a cargo de kinesiología.
  // Esta cama pide el HME (en VM, sin humidificación activa) y el Trach Care
  // (TQT). El HEPA no: la cama no tiene ventilador asignado.
  await p.evaluate(() => {
    ['hme', 'tc'].forEach(k => { const b = $('pvb_' + k + '_ok'); if (b) b.click(); });
  });
  await p.evaluate(() => $('pasoAvanza').click());
  await p.waitForTimeout(250);
  eq('★ resuelta la prevención, se pasa al turno', await paso(), '2');
  si('turno: se ve el bloque respiratorio', await ver('#fcRespCard'));
  no('turno: NO se ven las evaluaciones', await ver('#fcEval'));
  no('turno: NO se ven los planes', await ver('#fcPlanes'));
  no('turno: NO se ve el relato', await ver('#rarea'));

  // Se llena lo mínimo del turno para poder guardar al salir del paso 2.
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
    const pl = $('fPlanes'); if (pl) pl.value = 'Progresar sedestación';
  });

  await p.evaluate(() => $('pasoAvanza').click());
  await p.waitForTimeout(300);
  eq('★ avanzar lleva a las evaluaciones', await paso(), '3');
  si('evaluaciones: se ven', await ver('#fcEval'));
  no('evaluaciones: ya NO se ve el bloque respiratorio', await ver('#fcRespCard'));
  no('evaluaciones: tampoco los planes', await ver('#fcPlanes'));
  si('…y ahora sí se ofrece «atrás»', await ver('#pasoAtras'));

  console.log('\n3 · Volver atrás conserva lo escrito');
  await p.evaluate(() => $('pasoAtras').click());
  await p.waitForTimeout(250);
  eq('atrás vuelve al turno', await paso(), '2');
  eq('★ el modo ventilatorio sigue donde estaba', await p.evaluate(() => v('fModo')), 'CPAP/PS');
  si('…y se ve otra vez el respiratorio', await ver('#fcRespCard'));

  console.log('\n4 · Los pendientes del episodio abren el paso del turno');
  si('★ se pinta la caja de pendientes', await ver('#pendEpi'));
  eq('★ solo se ofrece el que sigue ABIERTO',
     await p.evaluate(() => document.querySelectorAll('#pendEpi [data-pend]').length), 1);
  si('…y dice de qué se trata',
     /fonoaudiol/i.test(await p.evaluate(() => ($('pendEpi') || {}).textContent || '')));
  si('…con la firma de quien lo dejó',
     /MCC/.test(await p.evaluate(() => ($('pendEpi') || {}).textContent || '')));
  no('el que ya estaba cerrado no se ofrece de nuevo',
     /Esto ya se hizo/.test(await p.evaluate(() => ($('pendEpi') || {}).textContent || '')));
  await p.evaluate(() => document.querySelector('#pendEpi [data-pend]').click());
  await p.waitForTimeout(250);
  const cerrar = await p.evaluate(() => window.__llamadas.filter(x => x.a === 'PEND_CERRAR'));
  eq('★ cerrarlo manda PEND_CERRAR con la cama y el id',
     JSON.stringify((cerrar[0] || {}).d || {}).replace(/"firma":"[^"]*"/, '"firma":"?"'),
     JSON.stringify({ idCama: '3', id: 'aa1', firma: '?' }));

  console.log('\n5 · ★ El guardado ocurre al SALIR DE LAS EVALUACIONES');
  await p.evaluate(() => { window.__llamadas.length = 0; $('pasoAvanza').click(); });
  await p.waitForTimeout(300);
  no('en el turno→evaluaciones todavía NO se guarda',
     (await p.evaluate(() => window.__llamadas.filter(x => x.a === 'GUARDAR_EVOLUCION').length)) > 0);
  await p.evaluate(() => $('pasoAvanza').click());
  await p.waitForTimeout(600);
  si('★★ al salir de las evaluaciones sale GUARDAR_EVOLUCION',
     (await p.evaluate(() => window.__llamadas.filter(x => x.a === 'GUARDAR_EVOLUCION').length)) > 0);
  eq('★ y se llega al relato', await paso(), '4');

  console.log('\n6 · El último paso es el relato y el plan');
  si('relato: se ve', await ver('#rarea'));
  si('relato: se ven los planes', await ver('#fcPlanes'));
  no('relato: ya no se ven las evaluaciones', await ver('#fcEval'));
  no('relato: ni el respiratorio', await ver('#fcRespCard'));

  eq('sin errores de JavaScript', errs.join(' | '), '');
  await b.close();
  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
