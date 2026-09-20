// intubar_desde_natural.js — Intubar a un paciente que llegó con vía aérea
// natural: UNA sola planilla y un estado previo que no miente (20-sep-2026).
//
// LO QUE REPORTÓ DIEGO: «no puedo intubar a un paciente que llegó con natural
// … sí pude pero se debía declarar arriba y me deja 2 historias, y necesito
// intubar y luego seguir con ese flujo».
//
// 🔴 LO QUE SE ENCONTRÓ MIRANDO, QUE ERA PEOR. Con un paciente en Natural ·
// Ambiente, apretar 🫁 Intubación dejaba esto:
//
//     la cama decía         Natural · Ambiente
//     «📍 Estado previo»    TOT · VM · ACVC        ← falso
//     INTUB_SOP_PREVIO      VM                     ← falso, y se GUARDA
//
// O sea: la evolución afirmaba que se intubó a un paciente que YA estaba
// intubado. Pasa porque `setEventoVA('intub')` fija la vía aérea arriba (a TOT)
// ANTES de que el bloque de abajo lea el estado previo, y ese bloque lo copia
// de arriba. El comentario del código de julio dice «el bloque de arriba NO se
// toca»; el código de septiembre lo tocaba. Las dos historias son el mismo
// hecho: arriba y abajo terminaban preguntando TOT · VM.
//
// LA DECISIÓN DE DIEGO (20-sep-2026), elegida entre dos opciones: UNA SOLA
// PLANILLA. Declara la intubación arriba y sigue en el mismo módulo de
// siempre; justo antes de cambiar la vía aérea el sistema le saca una FOTO al
// estado previo y la guarda solo. El bloque del evento se queda con lo suyo:
// hora, contexto y el estado previo en solo lectura.
//
// 🔴 LOS CAMPOS `po*` NO SE BORRAN, SE ESCONDEN Y SE ESPEJAN — igual que las
// casillas del prono. Son los que arman el payload (INTUB_VA_POST,
// VENT_VIA_AEREA_FINAL, TQT_SOP_POST…) y los lee el servidor: borrarlos
// obligaría a reescribir el guardado entero. Lo que se va es la SEGUNDA
// PREGUNTA, no el dato.
//
// 🪤 El reloj va congelado: la fecha se INVENTA (12-ago-2026, fuera de las
// ventanas trampa) y el turno se fuerza.
//
// Uso: node build/checks/intubar_desde_natural.js
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

  /* Abre una cama con el estado ventilatorio de llegada que se le pida.
     🪤 La fecha se INVENTA y el turno se fuerza: sin eso la guardia da
     distinto según cuándo se corra. */
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
    if (x.modo) { $('fModo').value = x.modo; renderParams(); }
    _snapIniEstado();
  }, { va, sop, modo: '' })).then(() => p.waitForTimeout(250));

  /* 🪤 CADA COSA SE MIDE DONDE VIVE: las tarjetas del turno están
     `paso-oculto` fuera del paso 2, así que medirlas desde otro paso da
     «oculto» sin que nada esté roto. Ya pasó tres veces en este proyecto. */
  const ver = sel => p.evaluate(s => { const e = document.querySelector(s);
    if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0);
  }, sel);

  /* ══ 1 · El estado previo dice la verdad ═══════════════════════════════ */
  console.log('\n1 · 🔴 El «📍 Estado previo» no miente');
  await abrir('Natural', 'Ambiente');
  await p.evaluate(() => setEventoVA('intub'));
  await p.waitForTimeout(350);
  const prev = await p.evaluate(() => ({
    txt: (document.getElementById('lblIntubPrevio') || {}).textContent || '',
    hid: (document.getElementById('fIntubSopPrevio') || {}).value || '',
  }));
  si('★★ el estado previo dice Natural (así llegó el paciente)', /Natural/.test(prev.txt));
  no('★★ …y NO dice TOT', /TOT/.test(prev.txt));
  no('★★ …ni VM', /\bVM\b/.test(prev.txt));
  eq('★★ el soporte previo que se GUARDA es Ambiente', prev.hid, 'Ambiente');

  /* ══ 2 · Una sola planilla ═════════════════════════════════════════════ */
  console.log('\n2 · 🔴 Una sola planilla: el evento no repregunta el ventilador');
  si('★ arriba sigue el módulo ventilatorio de siempre', await ver('#paramsBox'));
  no('★★ el módulo ventilatorio DUPLICADO de la intubación no se ve', await ver('#paramsBoxIntub'));
  no('★★ …ni su selector de vía aérea', await ver('#poIntubVA'));
  no('★★ …ni su selector de soporte', await ver('#poIntubSop'));
  si('★ pero lo propio del evento sí: la hora', await ver('#fIntubHora'));
  si('★ …y el contexto', await ver('#fIntubDet'));
  si('★ …y el estado previo, para leerlo', await ver('#lblIntubPrevio'));

  console.log('\n2b · Los campos escondidos SIGUEN en el documento (los lee el guardado)');
  si('poIntubVA existe', await p.evaluate(() => !!document.getElementById('poIntubVA')));
  si('poIntubSop existe', await p.evaluate(() => !!document.getElementById('poIntubSop')));
  si('paramsBoxIntub existe', await p.evaluate(() => !!document.getElementById('paramsBoxIntub')));

  /* ══ 3 · «y luego seguir con ese flujo» ════════════════════════════════ */
  console.log('\n3 · 🔴 Declarada la intubación, el turno sigue como paciente intubado');
  eq('★★ arriba queda en TOT', await p.evaluate(() => v('fVA')), 'TOT');
  si('★★ …y la succión endotraqueal se ofrece', await ver('#dSET'));
  si('★ …y el bloque de la intubación sigue a la vista', await ver('#dIntubSec'));
  /* 🪤 CADA COSA SE MIDE DONDE VIVE: el cuff es del paquete de prevención de
     NAVM y vive en el PASO 1 (`fcPrevNavm`, data-paso="1"). Medirlo desde el
     paso 2 lo da «oculto» sin que nada esté roto — la trampa que este proyecto
     ya pagó tres veces. */
  await p.evaluate(() => pasoIr(1)); await p.waitForTimeout(200);
  si('★★ aparece el cuff (paquete de prevención de NAVM)', await ver('#dCuff'));
  await p.evaluate(() => pasoIr(2)); await p.waitForTimeout(200);

  /* ══ 4 · El espejo: lo que se llena arriba es lo que se guarda abajo ═══ */
  console.log('\n4 · 🔴 El espejo — lo escrito ARRIBA viaja como estado posterior');
  const pay = await p.evaluate(async () => {
    $('fSop').value = 'VM'; cascadeSop();
    $('fModo').value = 'ACVC'; renderParams();
    $('fTOTn').value = '7.5'; $('fTOTcm').value = '22';
    ['r_vt:480', 'r_fr:16', 'r_peep:8', 'r_fio2:50', 'r_spo2:96'].forEach(par => {
      const [id, val] = par.split(':'); const e = document.getElementById(id); if (e) e.value = val;
    });
    $('fIntubHora').value = '14:20'; $('fIntubDet').value = 'insuficiencia respiratoria';
    // lo mínimo que `guardar()` exige para llegar a mandar
    { const he = document.getElementById('fHEst'); if (he && !he.value) he.value = 'Estable';
      const hd = document.getElementById('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos'; }
    const ff = document.getElementById('fFirma');
    let of = Array.from(ff.options).find(o => o.value);
    if (!of) { of = document.createElement('option'); of.value = 'K.P.'; of.textContent = 'K.P.'; ff.appendChild(of); }
    ff.value = of.value;
    /* 🪤 Al quedar en TOT el bloque de PVE/extubación entra en juego y el
       guardado exige declararla. No es de este arreglo (pasa igual desde antes),
       pero sin esto el banco nunca llega a mandar y la guardia mediría el vacío. */
    { const pv = document.getElementById('fPVEval'); if (pv && !pv.value) { pv.value = 'nc'; if (typeof hPVE === 'function') hPVE(); } }
    _transAvisoOk = true;
    window.__api = [];
    try { guardar(); } catch (e) { return { error: String(e && e.message || e) }; }
    await new Promise(r => setTimeout(r, 400));
    const g = window.__api.filter(x => x.a === 'GUARDAR_EVOLUCION').pop();
    return g ? g.d : { error: 'no se mandó nada (faltas: ' + (typeof _faltas === 'function' ? '' : '?') + ')' };
  });
  if (pay.error) { fails.push('el guardado no llegó a mandarse'); console.log('❌ ' + pay.error); }
  eq('★★ INTUB_VA_POST sale de arriba', pay.INTUB_VA_POST, 'TOT');
  eq('★★ INTUB_SOP_POST sale de arriba', pay.INTUB_SOP_POST, 'VM');
  eq('★★ INTUB_MODO_POST sale de arriba', pay.INTUB_MODO_POST, 'ACVC');
  eq('★★ INTUB_TOT_N sale de arriba', String(pay.INTUB_TOT_N), '7.5');
  eq('★★ INTUB_TOT_CM sale de arriba', String(pay.INTUB_TOT_CM), '22');
  eq('★★ INTUB_VT sale del ventilador de arriba', String(pay.INTUB_VT), '480');
  eq('★★ INTUB_PEEP sale del ventilador de arriba', String(pay.INTUB_PEEP), '8');
  eq('★★ el soporte PREVIO guardado sigue siendo Ambiente', pay.INTUB_SOP_PREVIO, 'Ambiente');
  eq('★★ la vía aérea previa guardada es Natural', pay.INTUB_VA_PREVIA, 'Natural');
  eq('★ el estado FINAL del turno es TOT', pay.VENT_VIA_AEREA_FINAL, 'TOT');
  eq('★ …en VM', pay.VENT_SOPORTE_FINAL, 'VM');
  eq('★ …y la hora del evento viaja', pay.INTUB_HORA, '14:20');

  /* ══ 5 · TQT y reintubación: NUNCA dos módulos a la vista ══════════════
     🪤 La TQT resolvió lo mismo AL REVÉS y hace tiempo: esconde el módulo de
     arriba (`_gateVentPorTqt`) y deja el suyo. Las dos formas cumplen «una sola
     planilla», así que la guardia no exige cuál sobrevive: exige que no haya
     DOS. Unificarlas es una decisión de Diego, no un arreglo. */
  console.log('\n5 · 🔴 Traqueostomía: una sola planilla (la suya)');
  await abrir('TOT', 'VM');
  await p.evaluate(() => setEventoVA('tqt'));
  await p.waitForTimeout(350);
  const dosTqt = (await ver('#paramsBox')) && (await ver('#paramsBoxTqt'));
  no('★★ NO hay dos módulos ventilatorios a la vista', dosTqt);
  si('★ el módulo que sobrevive es el de la TQT', await ver('#poTqtSop'));
  no('★ …y el de arriba se anula', await ver('#dVentBloque'));
  si('★ la hora del evento se pide', await ver('#fTqtHora'));
  si('★ …y la técnica', await ver('#fTqtTec'));

  console.log('\n5b · 🔴 Reintubación: tampoco');
  await abrir('Natural', 'Oxigenoterapia/OAF');
  await p.evaluate(() => {
    // historial de VM del episodio: es lo que convierte «intubación» en «reintubación»
    _diasVMPrevios = 4; updateVAUI();
  });
  await p.waitForTimeout(250);
  await p.evaluate(() => { window.confirmarReintubacion = () => Promise.resolve(true); setEventoVA('reintub'); });
  await p.waitForTimeout(450);
  no('★★ el módulo ventilatorio duplicado de la reintubación no se ve', await ver('#paramsBoxReintub'));
  no('★★ …ni su selector de soporte', await ver('#poReintubSop'));
  si('★ y el módulo de arriba sigue siendo el que se llena', await ver('#dVentBloque'));

  /* ══ 6 · El previo se olvida al deshacer el evento ═════════════════════ */
  console.log('\n6 · Volver a «Nada» olvida la foto (si no, el próximo evento heredaría un previo viejo)');
  await abrir('Natural', 'Ambiente');
  await p.evaluate(() => setEventoVA('intub'));
  await p.waitForTimeout(300);
  await p.evaluate(() => setEventoVA('nada'));
  await p.waitForTimeout(300);
  eq('★ la vía aérea vuelve a la de llegada', await p.evaluate(() => v('fVA')), 'Natural');
  await p.evaluate(() => { $('fSop').value = 'VNI'; cascadeSop(); setEventoVA('intub'); });
  await p.waitForTimeout(350);
  eq('★★ la foto nueva es la de AHORA, no la de antes',
     await p.evaluate(() => (document.getElementById('fIntubSopPrevio') || {}).value || ''), 'VNI');

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ intubar_desde_natural: ' + fails.length + ' FALLO(S): ' + fails.join(' · ')
                           : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
