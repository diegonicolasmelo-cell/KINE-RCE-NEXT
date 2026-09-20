// prono_hora_se_elige.js — «Y se selecciona con horario» (20-sep-2026).
//
// LO QUE PIDIÓ DIEGO, en cuatro palabras: la hora del prono **se selecciona**.
// No la pone el programa.
//
// 🔴 POR QUÉ IMPORTA, Y POR QUÉ NO ES UN DETALLE. Hasta acá, al tocar «Pronar»
// el campo se rellenaba solo con la hora del reloj. En la ronda eso es falso la
// mitad de las veces: el colega registra a las 10:00 lo que pasó a las 08:00, y
// como el campo ya venía lleno, nadie lo corrige. Es EXACTAMENTE la misma
// trampa que la fijación del TOT — Diego, 19-sep: «la fijación ojalá no
// sugiriera nada, ya que la gente no anota; si sugiere 22, no anotan nada». La
// sugerencia se vuelve el dato.
//
// Y acá el daño es peor que un número mal anotado: de esa hora salen las HORAS
// EN PRONO, que son las que deciden cuándo supinar al paciente.
//
// 🪤 LA TRAMPA DEL ARREGLO. Dejar la hora vacía sin más sería cambiar un dato
// falso por otro: `_tsEventoTurno` tiene un respaldo que, sin hora, asume las
// 15:00 de día y las 03:00 de noche. Un ciclo sellado contra una hora inventada
// es indistinguible de uno real. Por eso esta guardia mide las dos mitades:
//   · la pantalla nace VACÍA y avisa que falta;
//   · y el servidor NO sella el ciclo cuando la hora no vino.
// Mejor un ciclo que dice «falta la hora» que uno que miente con 15:00.
//
// 🪤 EL RELOJ VA CONGELADO, y acá con más razón que nunca: la prueba consiste
// justamente en que el reloj NO se cuele en el dato.

const fs = require('fs');
const path = require('path');
const V2 = path.join(__dirname, '..', '..', 'v2');
const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!okk) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); }
};
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

/* ══ 1 · SERVIDOR · sin hora no se sella un momento inventado ═══════════ */
console.log('\n1 · 🔴 El servidor no inventa la hora que no vino');
const src = ['infra_util.gs', 'infra_fechas.gs']
  .map(f => fs.readFileSync(path.join(V2, f), 'utf8')).join('\n;\n');
global.leerConfig = (k, d) => d;
(0, eval)(src);
// Solo la función del sello: svc_evoluciones entero arrastra medio servidor.
const svc = fs.readFileSync(path.join(V2, 'svc_evoluciones.gs'), 'utf8');
const fn = (svc.match(/function _pronoSellarCiclo\([\s\S]*?\n\}/) || [''])[0];
si('   la función del sello se pudo aislar', fn.length > 0);
global._pronoAbiertoTS = () => '';
(0, eval)(fn);

const conHora = { RESP_PRONO_EVENTO: true, RESP_PRONO_HORA: '08:00' };
_pronoSellarCiclo('3', '2026-08-10#Dia', '2026-08-10', 'Dia', conHora, []);
eq('★ con hora, el ciclo se sella normal', conHora.PRONO_INICIO_TS, '2026-08-10 08:00');

const sinHora = { RESP_PRONO_EVENTO: true, RESP_PRONO_HORA: '' };
_pronoSellarCiclo('3', '2026-08-10#Dia', '2026-08-10', 'Dia', sinHora, []);
eq('★★ SIN hora no se inventan las 15:00', sinHora.PRONO_INICIO_TS || '', '');

const supSinHora = { RESP_SUPINO_EVENTO: true, RESP_SUPINO_HORA: '', PRONO_INICIO_TS: '2026-08-09 21:30' };
_pronoSellarCiclo('3', '2026-08-10#Dia', '2026-08-10', 'Dia', supSinHora, []);
eq('★★ ni las 03:00 al supinar', supSinHora.SUPINO_TS || '', '');
eq('★ y el total del ciclo queda en blanco, no en un número falso', supSinHora.PRONO_HORAS || '', '');

/* ══ 2 · PANTALLA · la hora nace vacía y se avisa ═══════════════════════ */
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.google = { script: { run: { withSuccessHandler(okF) { return { withFailureHandler() { return {
      api(a) { setTimeout(() => okF({ ok: true, data: (a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null) }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.resolve(V2, 'index.html'));
  await p.waitForTimeout(600);

  const preparar = () => p.evaluate(async () => {
    $('kf').reset(); $('gDate').value = '2026-08-10'; SHIFT = 'Dia';
    window._pronoAbierto = '';
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM' }];
    renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 380));
    if (typeof pasoIr === 'function') pasoIr(2);
    await new Promise(r => setTimeout(r, 140));
    $('fVA').value = 'TOT'; cascadeVA(); $('fSop').value = 'VM'; cascadeSop();
    await new Promise(r => setTimeout(r, 100));
  });
  const mirar = () => p.evaluate(() => {
    const vis = el => { if (!el) return false; const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && !!(r.width || r.height); };
    return {
      horaP: document.getElementById('fPronoHora').value,
      horaS: document.getElementById('fSupinoHora').value,
      selectorALaVista: vis(document.getElementById('pronoHoraBox')),
      falta: vis(document.getElementById('pronoFaltaHora')),
      estado: (document.getElementById('pronoEstado') || {}).textContent || ''
    };
  });

  console.log('\n2 · 🔴 Al pronar, la hora NACE VACÍA');
  await preparar();
  await p.evaluate(async () => { pronoAccion(); await new Promise(r => setTimeout(r, 60)); });
  let R = await mirar();
  eq('★★ el campo de la hora queda vacío (no la hora del reloj)', R.horaP, '');
  si('★★ el selector de hora está a la vista para elegirla', R.selectorALaVista);
  si('★★ y se avisa que falta', R.falta);
  no('★ el estado no muestra horas mientras no haya hora', /\d+([.,]\d+)?\s*h/.test(R.estado));

  console.log('\n3 · Al elegirla, el aviso se va y el reloj empieza a contar');
  await p.evaluate(async () => {
    const e = document.getElementById('fPronoHoraVis');
    e.value = '08:00'; pronoHoraMano();
    await new Promise(r => setTimeout(r, 60));
  });
  R = await mirar();
  eq('★★ la hora elegida llega al campo que se guarda', R.horaP, '08:00');
  no('★ y el aviso desaparece', R.falta);
  si('★ el estado ya puede mostrar las horas', /prono/i.test(R.estado));

  console.log('\n4 · Lo mismo al supinar');
  await p.evaluate(async () => { pronoAccion(); await new Promise(r => setTimeout(r, 60)); });
  R = await mirar();
  eq('★★ la hora de la supinación también nace vacía', R.horaS, '');
  si('★ con su aviso', R.falta);

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ prono_hora_se_elige: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ prono_hora_se_elige: la hora se elige, y sin ella nadie inventa un momento.');
})();
