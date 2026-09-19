// paso_relato.js — El paso 3 cierra el ciclo (tanda D del rediseño;
// decisiones de Diego del 16-sep-2026).
//
// LO QUE FIJA:
//   1 · el paso 3 dice que YA quedó guardado, con la fecha del turno — es lo
//       primero que se necesita saber al llegar ahí;
//   2 · ★ se deja pendiente para el turno que viene, y las sugerencias salen
//       de lo que el paso 2 mostró SIN MEDIR: ahí se cierra el ciclo con la
//       tanda A, y el pendiente vive en el episodio (cruza el turno);
//   3 · también se puede escribir uno a mano;
//   4 · ★ D2 + D3 juntas: el relato se retoca a mano y al volver atrás se
//       regenera — pero si HABÍA retoque, se avisa antes de pisarlo. Nunca se
//       borra trabajo escrito en silencio.
//
// 🪤 Fechas inventadas desde el reloj de la página, nada anclado a un día fijo.
//
// Uso: node build/checks/paso_relato.js
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

  const llegarAlPaso3 = () => p.evaluate(() => {
    const hb = n => { const d = new Date(hoy() + 'T12:00:00'); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
    DB = [{ ID_CAMA: '6', OCUPADA: true, PATIENT_ID: 'p6', NOMBRE: 'PACIENTE PRUEBA', EDAD: 58, SEXO: 'F',
            VIA_AEREA: 'TQT', SOPORTE: 'VM', FECHA_INGRESO: hb(4),
            ULT_MRC: '36', ULT_MRC_FECHA: hb(2), ULT_MRC_FIRMA: 'MCC',
            ULT_FSS: '', ULT_PIM: '' }];
    window.recargarSilencioso = () => {};
    renderGrid(); abrirPanel('6', false, false);
  });

  await llegarAlPaso3();
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
    pasoIr(3);   // 🗂️ evaluaciones: del 2 al 3 (entró la prevención)
  });
  await p.waitForTimeout(200);
  await p.evaluate(() => $('pasoEvalNada').click());
  await p.waitForTimeout(700);

  const ver = sel => p.evaluate(s => { const e = document.querySelector(s); return !!e && e.offsetParent !== null; }, sel);
  // 🪤 El aviso NO se puede medir con offsetParent: es `position:fixed`, y ahí
  // offsetParent es null aunque el modal esté abierto en la cara del colega.
  // Se mide por la clase `.on`, que es el contrato que usa la app.
  const avisoAbierto = () => p.evaluate(() => {
    const e = document.getElementById('ucOvl'); return !!e && e.classList.contains('on');
  });
  const txt = sel => p.evaluate(s => ((document.querySelector(s) || {}).textContent || ''), sel);
  const paso = () => p.evaluate(() => {
    const t = document.querySelector('#spPasos [aria-selected="true"]'); return t ? String(t.dataset.p) : '';
  });

  console.log('\n1 · Lo primero: quedó guardado');
  eq('se llegó al relato', await paso(), '4');   // 🗂️ era el 3 hasta que entró la prevención
  si('★ el paso 3 dice que ya quedó guardado', await ver('#pasoGuardado'));
  const g = await txt('#pasoGuardado');
  si('…con la palabra guardado', /guardad/i.test(g));
  si('★ …y la fecha del turno', await p.evaluate(() => {
    const f = (document.getElementById('gDate') || {}).value || '';
    return ((document.getElementById('pasoGuardado') || {}).textContent || '').indexOf(f.slice(8, 10)) !== -1;
  }));

  console.log('\n2 · ★ Dejar pendiente, con lo que faltó medir');
  si('se ofrece dejar pendiente', await ver('#pasoPend'));
  const sug = await txt('#pasoPend');
  si('★ sugiere medir el FSS, que el paso 2 mostró sin medir', /FSS/.test(sug));
  si('★ …y la Pimáx, que tampoco se midió', /Pim/i.test(sug));
  no('no sugiere el MRC, que SÍ está medido', /MRC/.test(sug));

  await p.evaluate(() => { window.__llamadas.length = 0; });
  await p.evaluate(() => {
    const s = document.querySelector('#pasoPend [data-sug]'); if (s) s.click();
  });
  await p.waitForTimeout(400);
  const abrir = await p.evaluate(() => window.__llamadas.filter(x => x.a === 'PEND_ABRIR'));
  si('★★ tocar una sugerencia manda PEND_ABRIR', abrir.length > 0);
  si('…con la cama', String(((abrir[0] || {}).d || {}).idCama) === '6');
  si('…y el texto de lo que hay que hacer', /FSS|Pim/i.test(String(((abrir[0] || {}).d || {}).texto || '')));

  console.log('\n3 · También se escribe uno a mano');
  await p.evaluate(() => { window.__llamadas.length = 0; });
  await p.evaluate(() => {
    const i = $('pasoPendTxt'); i.value = 'Avisar a fonoaudiología el lunes';
    $('pasoPendBtn').click();
  });
  await p.waitForTimeout(400);
  const libre = await p.evaluate(() => window.__llamadas.filter(x => x.a === 'PEND_ABRIR'));
  eq('★ se manda el texto escrito', String(((libre[0] || {}).d || {}).texto || ''), 'Avisar a fonoaudiología el lunes');
  eq('…y el campo queda limpio para el siguiente', await p.evaluate(() => v('pasoPendTxt')), '');

  console.log('\n4 · ★ D2 + D3 · el retoque no se pisa en silencio');
  // Sin retoque: volver atrás no pregunta nada.
  await p.evaluate(() => { window.__avisos = 0; });
  await p.evaluate(() => $('pasoAtras').click());
  await p.waitForTimeout(300);
  eq('sin retoque a mano, volver atrás no pregunta nada', await paso(), '3');
  no('…y no se abrió ningún aviso', await avisoAbierto());

  // Con retoque: avisa antes de pisarlo.
  // 🪤 `_textoManual` es una `let` del ámbito del script: asignarla desde
  // evaluate() crea OTRA variable en window y la de adentro sigue en false.
  // El retoque se marca por la vía real, con la función que usa la app.
  await p.evaluate(() => {
    pasoIr(4);   // 🗂️ el relato: del 3 al 4
    const t = $('rtxt'); t.value = 'Texto escrito a mano por el colega.';
    _setTextoManual(true);
  });
  await p.waitForTimeout(200);
  await p.evaluate(() => $('pasoAtras').click());
  await p.waitForTimeout(400);
  si('★★ con retoque a mano, avisa antes de volver', await avisoAbierto());
  const aviso = await txt('#ucMsg');
  si('…y dice de qué se trata', /retoc|mano|relato/i.test(aviso));
  eq('★ …y todavía NO se movió de paso', await paso(), '4');

  eq('sin errores de JavaScript', errs.join(' | '), '');
  await b.close();
  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
