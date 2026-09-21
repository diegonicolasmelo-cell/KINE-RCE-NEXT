// intubacion_modulo_evento.js — El evento se declara UNA vez y despliega SU
// módulo, con sus preguntas (Diego, 21-sep-2026).
//
// LO QUE DIJO DIEGO: «marcar intubación podría activar lo mismo que "ocurrió
// intubación este turno"… esto como que estuviera repitiéndose dos veces. Lo
// que yo estaba proponiendo era que cada opción que marque un evento
// desplegara distintos módulos o formas de llenar terapia ventilatoria… tienen
// el mismo contenido, solamente que se plantea de otra forma. Pongo "qué pasó
// con la vía aérea este turno: intubación", entonces sale: ¿con qué lo intubé?,
// quizás si fue intubación difícil o no, los parámetros, en qué modo quedó, la
// causa de la intubación y una nota adicional.»
//
// 🔴 DOS COSAS DISTINTAS, LAS DOS SUYAS.
//
//  1. LA DOBLE PREGUNTA QUE QUEDÓ VIVA. El 16-sep-2026 se escondieron las
//     casillas «Ocurrió TQT este turno» y «Ocurrió decanulación este turno»
//     porque la fila de arriba ya declara el evento (ver
//     `evento_sin_doble_pregunta.js`). A la intubación NO se le hizo: su
//     casilla siguió a la vista. Se marca sola al declarar el evento, así que
//     nunca estuvo rota — pero se ve marcada y parece que hubiera que marcarla.
//     Es la misma segunda pregunta, en el único evento donde sobrevivió.
//
//  2. EL MÓDULO ES DEL EVENTO. Declarada la intubación, «Terapia ventilatoria»
//     de arriba se anula y el bloque del evento pide lo suyo, en su idioma:
//     hora, causa, si fue difícil, la nota, con qué tubo queda y en qué modo.
//     Es exactamente lo que la TRAQUEOSTOMÍA ya hacía desde la v5.1
//     (`_gateVentPorTqt`): ahora las tres formas —intubación, reintubación y
//     traqueostomía— son la misma.
//
// 🪤 ESTO INVIERTE LA TANDA 3.7, y a propósito. Ayer Diego eligió «una sola
// planilla: la de arriba», y el panel «queda con» se escondió y se llenaba por
// espejo. Hoy, al verlo, corrigió el rumbo: una sola planilla SÍ, pero la del
// EVENTO. No es una guardia que se aflojó: es un acuerdo que cambió, y queda
// escrito acá y en la bitácora. Lo que NO cambia, y sigue medido en
// `intubar_desde_natural.js`, es la FOTO del estado previo: el registro no
// puede decir que se intubó a un paciente que ya estaba intubado.
//
// 🪤 El reloj va congelado: fecha inventada (12-ago-2026, fuera de las ventanas
// trampa) y turno forzado.
//
// Uso: node build/checks/intubacion_modulo_evento.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const V2 = path.resolve(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

/* ══ 0 · Las columnas nuevas viven en el esquema, y AL FINAL ═══════════ */
console.log('\n0 · Las columnas nuevas nacen en esquema.gs');
const esq = fs.readFileSync(path.join(V2, 'esquema.gs'), 'utf8');
si('★ INTUB_CAUSA está declarada', /\['INTUB_CAUSA'/.test(esq));
si('★ INTUB_DIFICIL está declarada', /\['INTUB_DIFICIL'/.test(esq));

/* ══ El texto del servidor narra la causa y la nota ════════════════════ */
console.log('\n0b · El relato del SERVIDOR cuenta por qué se intubó');
const dom = fs.readFileSync(path.join(V2, 'dominio_texto.gs'), 'utf8');
si('★★ el generador lee INTUB_CAUSA', /INTUB_CAUSA/.test(dom));
si('★ …y si fue difícil', /INTUB_DIFICIL/.test(dom));

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 1200 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.__api = [];
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
      api(a, d) { window.__api.push({ a: a, d: d });
        setTimeout(() => ok({ ok: true, data: a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.join(V2, 'index.html'));
  await p.waitForTimeout(800);

  const abrir = (va, sop) => p.evaluate(x => {
    $('kf').reset();
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', EDAD: 61, SEXO: 'M',
            VIA_AEREA: x.va, SOPORTE: x.sop }];
    window.recargarSilencioso = () => {};
    renderGrid(); abrirPanel('3', false, false);
  }, { va, sop }).then(() => p.waitForTimeout(450)).then(() => p.evaluate(x => {
    $('gDate').value = '2026-08-12'; SHIFT = 'Dia';
    window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
    pasoIr(2);
    $('fVA').value = x.va; cascadeVA();
    $('fSop').value = x.sop; cascadeSop();
    _snapIniEstado();
  }, { va, sop })).then(() => p.waitForTimeout(250));

  /* 🪤 CADA COSA SE MIDE DONDE VIVE: fuera del paso 2 las tarjetas del turno
     están `paso-oculto` y dan «oculto» sin que nada esté roto. */
  const ver = sel => p.evaluate(s => { const e = document.querySelector(s);
    if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0);
  }, sel);

  /* ══ 1 · La segunda pregunta se va ════════════════════════════════════ */
  console.log('\n1 · 🔴 «Ocurrió intubación este turno» ya no se pregunta');
  await abrir('Natural', 'Ambiente');
  no('★★ la casilla NO se ofrece', await ver('#cIntubO'));
  si('★ …pero sigue en el documento (la lee el guardado)',
     await p.evaluate(() => !!document.getElementById('cIntubO')));
  await p.evaluate(() => setEventoVA('intub'));
  await p.waitForTimeout(400);
  si('★★ al declarar el evento, la casilla queda marcada por dentro',
     await p.evaluate(() => !!document.getElementById('cIntubO').checked));
  no('★★ …y sigue sin verse', await ver('#cIntubO'));

  /* 🪤 Y LA ÚLTIMA QUE QUEDABA. Al revisar los cinco eventos apareció que
     «↩️ Ocurrió reintubación este turno» (`cReintubT`) seguía a la vista: el
     mismo defecto que Diego reportó en la intubación, en el único sitio donde
     sobrevivía. Se ve además con extubación y decanulación, porque el bloque
     de reintubación se ofrece en cuanto hay historial de VM.
     🔴 `cReintub` —la reintubación ANIDADA en el flujo PVE— NO entra acá: ahí
     la fila de arriba ya está declarando la extubación, así que esa casilla es
     el ÚNICO lugar donde el hecho se anota. Esconderla perdería el dato. */
  console.log('\n1b · 🔴 …y la reintubación tampoco se pregunta dos veces');
  await abrir('Natural', 'Oxigenoterapia/OAF');
  await p.evaluate(() => { _diasVMPrevios = 4; updateVAUI(); window.confirmarReintubacion = () => Promise.resolve(true); });
  await p.waitForTimeout(250);
  no('★★ «Ocurrió reintubación este turno» no se ofrece', await ver('#cReintubT'));
  si('★ …pero sigue en el documento', await p.evaluate(() => !!document.getElementById('cReintubT')));
  await p.evaluate(() => setEventoVA('reintub'));
  await p.waitForTimeout(500);
  si('★★ declarada arriba, queda marcada por dentro',
     await p.evaluate(() => !!document.getElementById('cReintubT').checked));
  si('★ la casilla ANIDADA en el flujo PVE sigue existiendo (ahí no hay doble pregunta)',
     await p.evaluate(() => !!document.getElementById('cReintub')));
  await abrir('Natural', 'Ambiente');
  await p.evaluate(() => setEventoVA('intub'));
  await p.waitForTimeout(400);

  /* ══ 2 · El módulo es el del evento ═══════════════════════════════════ */
  console.log('\n2 · 🔴 Declarada la intubación, manda SU módulo');
  no('★★ «Terapia ventilatoria» de arriba se anula', await ver('#dVentBloque'));
  si('★★ …y el panel «queda con» del evento sí se ve', await ver('#poIntubSop'));
  si('★★ …con su módulo ventilatorio', await ver('#paramsBoxIntub'));
  si('★ …y avisa dónde quedó registrada la ventilación', await ver('#avisoVentIntub'));

  console.log('\n2b · …y pregunta lo que Diego pidió, en su idioma');
  si('★★ el N° de tubo se pide en el bloque', await ver('#poIntubTotN'));
  si('★★ …y la fijación en cm', await ver('#poIntubTotCm'));
  si('★★ …la CAUSA de la intubación', await ver('#fIntubCausa'));
  si('★★ …si fue intubación DIFÍCIL', await ver('#cIntubDificil'));
  si('★★ …y una nota aparte, con sus palabras', await ver('#fIntubDet'));
  si('★ la hora sigue estando', await ver('#fIntubHora'));
  si('★ …y el estado previo, para leerlo', await ver('#lblIntubPrevio'));

  console.log('\n2c · La causa es una lista, no un campo suelto');
  const causas = await p.evaluate(() => {
    const s = document.getElementById('fIntubCausa');
    return s ? Array.from(s.options).map(o => o.value).filter(Boolean) : [];
  });
  si('★★ ofrece varias causas', causas.length >= 5);
  si('★★ …entre ellas «mal manejo de secreciones» (el ejemplo de Diego)',
     causas.some(c => /secreciones/i.test(c)));
  si('★ …y «protección de vía aérea»', causas.some(c => /protecci/i.test(c)));
  si('★ …y nace en blanco (nadie la elige por ti)',
     await p.evaluate(() => document.getElementById('fIntubCausa').value === ''));

  /* ══ 3 · Lo llenado en el bloque es lo que se guarda ══════════════════ */
  console.log('\n3 · 🔴 El guardado recoge todo lo del bloque');
  const pay = await p.evaluate(async () => {
    $('fIntubHora').value = '14:20';
    const c = document.getElementById('fIntubCausa');
    c.value = Array.from(c.options).map(o => o.value).find(v => /secreciones/i.test(v));
    document.getElementById('cIntubDificil').checked = true;
    $('fIntubDet').value = 'taquipneico, desaturando, se procede a intubar';
    $('poIntubTotN').value = '7.5'; $('poIntubTotCm').value = '22';
    $('poIntubSop').value = 'VM'; renderParamsIntub();
    $('poIntubModo').value = 'ACVC'; renderParams({ P: 'pi_', L: 'pl_', box: 'paramsBoxIntub' });
    $('pi_vt').value = '480'; $('pi_fr').value = '16'; $('pi_peep').value = '8';
    $('pi_fio2').value = '50'; $('pi_spo2').value = '96';
    { const he = document.getElementById('fHEst'); if (he && !he.value) he.value = 'Estable';
      const hd = document.getElementById('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos'; }
    const ff = document.getElementById('fFirma');
    let of = Array.from(ff.options).find(o => o.value);
    if (!of) { of = document.createElement('option'); of.value = 'K.P.'; of.textContent = 'K.P.'; ff.appendChild(of); }
    ff.value = of.value;
    /* 🪤 Al quedar en TOT el bloque de PVE entra en juego y el guardado la
       exige. No es de este arreglo; sin esto el banco nunca llega a mandar. */
    { const pv = document.getElementById('fPVEval'); if (pv && !pv.value) { pv.value = 'nc'; if (typeof hPVE === 'function') hPVE(); } }
    _transAvisoOk = true;
    window.__api = [];
    try { guardar(); } catch (e) { return { error: String(e && e.message || e) }; }
    await new Promise(r => setTimeout(r, 400));
    const g = window.__api.filter(x => x.a === 'GUARDAR_EVOLUCION').pop();
    return g ? g.d : { error: 'no se mandó nada' };
  });
  if (pay.error) { fails.push('el guardado no llegó a mandarse'); console.log('❌ ' + pay.error); }
  si('★★ INTUB_CAUSA viaja', /secreciones/i.test(String(pay.INTUB_CAUSA || '')));
  eq('★★ INTUB_DIFICIL viaja', pay.INTUB_DIFICIL, true);
  si('★★ la nota viaja con las palabras del colega', /taquipneico/.test(String(pay.INTUB_DET || '')));
  eq('★★ el N° de tubo viaja', String(pay.INTUB_TOT_N), '7.5');
  eq('★★ la fijación viaja', String(pay.INTUB_TOT_CM), '22');
  eq('★★ el modo posterior viaja', pay.INTUB_MODO_POST, 'ACVC');
  eq('★★ el VT del bloque viaja', String(pay.INTUB_VT), '480');
  eq('★ el estado final del turno es TOT', pay.VENT_VIA_AEREA_FINAL, 'TOT');
  eq('★ …en VM', pay.VENT_SOPORTE_FINAL, 'VM');
  eq('★★ y el soporte PREVIO sigue siendo Ambiente (la foto de la 3.7)',
     pay.INTUB_SOP_PREVIO, 'Ambiente');

  /* ══ 4 · El relato del cliente cuenta la misma historia ═══════════════ */
  console.log('\n4 · 🔴 El relato narra por qué se intubó');
  const txt = await p.evaluate(() => (typeof genTexto === 'function' ? genTexto() : ''));
  si('★★ el relato nombra la causa', /secreciones/i.test(txt));
  si('★★ …y la nota del colega', /taquipneico/.test(txt));
  si('★ …y que fue difícil', /dif[ií]cil/i.test(txt));
  /* 🪤 EL SIGNO DE PREGUNTA. Al anular el módulo genérico, el N° de tubo y la
     fijación pasaron a vivir SOLO en el bloque del evento — y la línea «VAA
     mediante TOT N° … a … cm» seguía leyéndolos de arriba, que ahora está
     vacío. La evolución salía «TOT N° ? a ? cm». Es el mismo signo de pregunta
     que el 17-sep-2026 costó cazar con los días de vía aérea, y se vio igual:
     mirando el relato, no con una guardia. Ahora sí hay guardia. */
  no('★★ el relato NO sale con signos de pregunta en el tubo', /TOT N° \?|a \? cm/.test(txt));
  si('★★ …la línea de arriba toma el N° del bloque del evento', /TOT N° 7\.5 a 22 cm/.test(txt));
  si('★ el payload también', String(pay.VENT_TOT_NUM) === '7.5' && String(pay.VENT_TOT_CM) === '22');

  /* ══ 5 · Deshacer el evento devuelve la pantalla ══════════════════════ */
  console.log('\n5 · Volver a «Nada» devuelve «Terapia ventilatoria»');
  await p.evaluate(() => setEventoVA('nada'));
  await p.waitForTimeout(400);
  si('★★ el módulo de arriba vuelve', await ver('#dVentBloque'));
  no('★ …y el aviso se apaga', await ver('#avisoVentIntub'));
  no('★ la casilla queda desmarcada', await p.evaluate(() => !!document.getElementById('cIntubO').checked));

  /* ══ 6 · Las tres formas son la misma ═════════════════════════════════ */
  console.log('\n6 · 🔴 Intubación, reintubación y TQT: la misma forma');
  for (const c of [{ va: 'TOT', sop: 'VM', ev: 'tqt', panel: '#poTqtSop', nom: 'traqueostomía' },
                   { va: 'Natural', sop: 'Oxigenoterapia/OAF', ev: 'reintub', panel: '#poReintubSop', nom: 'reintubación' }]) {
    await abrir(c.va, c.sop);
    if (c.ev === 'reintub') {
      await p.evaluate(() => { _diasVMPrevios = 4; updateVAUI(); window.confirmarReintubacion = () => Promise.resolve(true); });
      await p.waitForTimeout(200);
    }
    await p.evaluate(e => setEventoVA(e), c.ev);
    await p.waitForTimeout(500);
    no('★★ con ' + c.nom + ', «Terapia ventilatoria» de arriba se anula', await ver('#dVentBloque'));
    si('★★ …y manda el panel del evento', await ver(c.panel));
  }

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ intubacion_modulo_evento: ' + fails.length + ' FALLO(S): ' + fails.join(' · ')
                           : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
