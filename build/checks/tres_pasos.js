// tres_pasos.js — El modal deja de ser un muro y pasa a ser un camino
// (tanda B del rediseño; decisiones de Diego del 16-sep-2026).
//
// EL PROBLEMA. Un solo modal con 225 campos donde conviven cuatro cosas: lo
// que pasó en el turno, lo que se midió, los eventos y el relato. El MRC es un
// campo entre 225 y se saltea sin que nadie lo note.
//
// LO QUE ESTA GUARDIA FIJA:
//   1 · hay tres pasos y se abre en el primero;
//   2 · ★ cada paso muestra LO SUYO y esconde lo de los otros — que es lo
//       único que hace que esto sea un camino y no una pestaña decorativa;
//   3 · los pendientes que dejó el turno anterior abren el paso 1, y se
//       cierran desde ahí (tanda A puesta en pantalla);
//   4 · ★ el guardado ocurre al SALIR DEL PASO 2, no al final: en la UCI se
//       sale corriendo y el paso 3 ya no puede perder nada;
//   5 · volver atrás conserva lo escrito.
//
// 🪤 Nada anclado a un día fijo: las fechas se arman desde el reloj de la
// página, no se esperan.
//
// Uso: node build/checks/tres_pasos.js
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
  eq('★ hay TRES pasos', await p.evaluate(() => document.querySelectorAll('#spPasos [data-p]').length), 3);
  eq('★ el panel se abre en el paso 1', await paso(), '1');
  no('…y «atrás» no se ofrece en el primero', await ver('#pasoAtras'));
  si('★ el botón de avanzar anuncia a dónde lleva',
     /evaluacion/i.test(await p.evaluate(() => ($('pasoAvanza') || {}).textContent || '')));

  console.log('\n2 · ★ Cada paso muestra lo suyo y esconde lo de los otros');
  si('paso 1: se ve el bloque respiratorio', await ver('#fcRespCard'));
  no('paso 1: NO se ven las evaluaciones', await ver('#fcEval'));
  no('paso 1: NO se ven los planes', await ver('#fcPlanes'));
  no('paso 1: NO se ve el relato', await ver('#rarea'));

  // Se llena lo mínimo del turno para poder guardar al salir del paso 2.
  await p.evaluate(() => {
    $('fVA').value = 'TQT'; cascadeVA();
    $('fSop').value = 'VM'; cascadeSop();
    $('fModo').value = 'CPAP/PS'; renderParams();
    const f = $('fFirma'); if (f) { if (!f.options.length) f.add(new Option('DMV', 'DMV')); f.value = 'DMV'; }
    const pl = $('fPlanes'); if (pl) pl.value = 'Progresar sedestación';
  });

  await p.evaluate(() => $('pasoAvanza').click());
  await p.waitForTimeout(300);
  eq('★ avanzar lleva al paso 2', await paso(), '2');
  si('paso 2: se ven las evaluaciones', await ver('#fcEval'));
  no('paso 2: ya NO se ve el bloque respiratorio', await ver('#fcRespCard'));
  no('paso 2: tampoco los planes', await ver('#fcPlanes'));
  si('…y ahora sí se ofrece «atrás»', await ver('#pasoAtras'));

  console.log('\n3 · Volver atrás conserva lo escrito');
  await p.evaluate(() => $('pasoAtras').click());
  await p.waitForTimeout(250);
  eq('atrás vuelve al paso 1', await paso(), '1');
  eq('★ el modo ventilatorio sigue donde estaba', await p.evaluate(() => v('fModo')), 'CPAP/PS');
  si('…y se ve otra vez el respiratorio', await ver('#fcRespCard'));

  console.log('\n4 · Los pendientes del episodio abren el paso 1');
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

  console.log('\n5 · ★ El guardado ocurre al SALIR DEL PASO 2');
  await p.evaluate(() => { window.__llamadas.length = 0; $('pasoAvanza').click(); });
  await p.waitForTimeout(300);
  no('en el paso 1→2 todavía NO se guarda',
     (await p.evaluate(() => window.__llamadas.filter(x => x.a === 'GUARDAR_EVOLUCION').length)) > 0);
  await p.evaluate(() => $('pasoAvanza').click());
  await p.waitForTimeout(600);
  si('★★ al salir del paso 2 sale GUARDAR_EVOLUCION',
     (await p.evaluate(() => window.__llamadas.filter(x => x.a === 'GUARDAR_EVOLUCION').length)) > 0);
  eq('★ y se llega al paso 3', await paso(), '3');

  console.log('\n6 · El paso 3 es el relato y el plan');
  si('paso 3: se ve el relato', await ver('#rarea'));
  si('paso 3: se ven los planes', await ver('#fcPlanes'));
  no('paso 3: ya no se ven las evaluaciones', await ver('#fcEval'));
  no('paso 3: ni el respiratorio', await ver('#fcRespCard'));

  eq('sin errores de JavaScript', errs.join(' | '), '');
  await b.close();
  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
