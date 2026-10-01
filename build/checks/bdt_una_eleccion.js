// bdt_una_eleccion.js — El test de azul (BDT) es UNA elección, no dos casillas
// (Diego, 1-oct-2026).
//
// LO QUE PIDIÓ: «el test de azul es positivo o negativo, con la fecha
// obviamente, pero no poner "no realizado" porque no tiene sentido. Si es que
// no se realiza, no lo anoto solamente. Pero si lo realizo, anoto el resultado.
// Y podríamos poner si es positivo el test, tardío o precoz.»
//
// 🔴 EL BUG QUE ESTO CIERRA. Eran dos casillas sueltas, «BDT +» y «BDT −», y
// nada impedía marcar las dos a la vez. Pasaba esto: el relato escribía «BDT
// positivo» y «BDT negativo» uno detrás del otro, y el servidor guardaba el
// positivo EN SILENCIO (`esVerdadero(POS) ? '+' : …`). Una sola elección entre
// dos lo vuelve imposible.
//
// 🪤 «No realizado» NO existe como opción: no marcar YA es no realizado. Pero
// entonces hace falta una forma de DESMARCAR un resultado puesto por error, y
// el escape es que cada botón se apaga al volver a tocarlo.
//
// 🪤 Precoz o tardío SOLO existe si el resultado es positivo, y se borra solo
// si el resultado deja de serlo (un negativo «tardío» no significa nada).
//
// 🔵 EL FEM SE NARRABA EN LA UNIDAD EQUIVOCADA. El rótulo y los cortes del
// código son de L/s (4,5 y 2,7 = los 270 y 160 L/min clásicos) pero el relato
// escribía «L/min»: un 3,5 bien medido quedaba como 210 L/min.
//
// 🪤 La guardia mide la pantalla en el PASO 3 (donde vive «Tos y deglución») y
// el reloj va congelado.
//
// Uso: node build/checks/bdt_una_eleccion.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const v2 = path.join(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

/* ══ PARTE 1 · El servidor ═══════════════════════════════════════════════ */
const DB = { CAMAS_ESTADO: [], EVOLUCIONES: [], TIMELINE: [], PROCEDIMIENTOS: [] };
global.repoLeerTodos = (h, c, v) => { let f = (DB[h] || []).slice(); if (c !== undefined) f = f.filter(r => String(r[c]) === String(v)); return f; };
global.repoBuscarPorId = (h, c, id) => (DB[h] || []).find(r => String(r[c]) === String(id)) || null;
global.repoActualizar = (h, c, id, ch) => { const r = global.repoBuscarPorId(h, c, id); if (r) Object.assign(r, ch); return !!r; };
global.repoInsertar = (h, o) => { (DB[h] = DB[h] || []).push(o); return o; };
global.repoEliminarDonde = () => {}; global.repoActualizarDonde = () => {};
global.repoUpsert = (h, c, id, o) => { const r = global.repoBuscarPorId(h, c, id); if (r) { Object.assign(r, o); return 'actualizar'; } global.repoInsertar(h, o); return 'crear'; };
global.esVerdadero = v => v === true || v === 'TRUE' || v === 'true';
global.leerConfig = (k, d) => d; global.conLock = fn => fn(); global.uid = p => p + '_1';
let AHORA = { fecha: '2026-08-12', hora: '10:00' };
global.hoyISO = () => AHORA.fecha;
global.ahoraTS = () => AHORA.fecha + ' ' + AHORA.hora + ':00';
global._tz = () => 'America/Santiago';
global.Utilities = { getUuid: () => 'u1', formatDate: (d, tz, f) =>
  f === 'HH:mm' ? AHORA.hora : (String(f).indexOf('HH') > -1 ? AHORA.fecha + ' ' + AHORA.hora + ':00' : AHORA.fecha) };
global.SpreadsheetApp = { flush: () => {} };
global.validarPayloadEvolucion = () => []; global.validarPayloadIngreso = () => [];
global.generarCodPaciente = () => 'PAC'; global._codUnico = c => c; global._rutNormal = r => String(r || '');
global._agregarHitoInterno = () => {}; global._guardarProcedimientosInterno = () => {}; global._timelineDelGuardado = () => '[]';
global.repoBuscarFila = (h, c, id) => { const i = (DB[h] || []).findIndex(r => String(r[c]) === String(id)); return i === -1 ? -1 : i + 2; };
global.repoLeerFila = (h, f2) => Object.assign({}, DB[h][f2 - 2]);
const _reemplazarFila = (h, f2, o) => { const r = DB[h][f2 - 2]; Object.keys(r).forEach(k => delete r[k]); Object.assign(r, o); };
global.repoUpsertEnFila = (h, f2, o) => { if (f2 === -1) { global.repoInsertar(h, o); return 'crear'; } _reemplazarFila(h, f2, o); return 'actualizar'; };
global.repoEscribirFila = (h, f2, o) => _reemplazarFila(h, f2, o);
global.repoLeerTodosConFila = h => (DB[h] || []).map((r, i) => ({ obj: Object.assign({}, r), fila: i + 2 }));
global.repoLeerColumnasConFila = (h, campos) => (DB[h] || []).map((r, i) => { const o = {}; campos.forEach(c => { o[c] = (c in r) ? r[c] : ''; }); return { obj: o, fila: i + 2 }; });
global.repoEliminarFilas = (h, fl) => { (fl || []).map(f2 => f2 - 2).sort((a, b) => b - a).forEach(i => DB[h].splice(i, 1)); return (fl || []).length; };
global.repoEliminarPorCols = (h, cs, pred) => { const a = (DB[h] || []).length; DB[h] = (DB[h] || []).filter(r => { const o = {}; cs.forEach(c => { o[c] = r[c]; }); return !pred(o); }); return a - DB[h].length; };
global.repoInsertarVarios = (h, os) => { (os || []).forEach(o => (DB[h] = DB[h] || []).push(o)); return (os || []).length; };
global._registrarReintubacion = () => {}; global.calcularPI = () => 60; global.calcularRespiratorio = () => ({});
global.ok = d => ({ ok: true, data: d }); global.err = (m, c) => ({ ok: false, error: m, codigo: c });
global.ERR = { VALIDACION: 'V', INTERNO: 'I', NO_ENCONTRADO: 'NE' };
eval(['infra_fechas.gs', 'dominio_texto.gs', 'svc_camas.gs', 'svc_coordinacion.gs', 'svc_evoluciones.gs']
  .map(f => fs.readFileSync(path.join(v2, f), 'utf8')).join('\n;\n'));

const guardar = (tk, campos) => guardarEvolucion(
  Object.assign({ ID_CAMA: '4', TURNO_KEY: tk, PLAN_FIRMA_KINE: 'DMV', PAC_NOMBRE: 'X',
                  VENT_VIA_AEREA: 'TQT', VENT_SOPORTE: 'Oxigenoterapia/OAF' }, campos),
  { firma: 'DMV', email: 'x@y' });
const evo = tk => DB.EVOLUCIONES.find(e => e.TURNO_KEY === tk);
const serie = tk => JSON.parse(evo(tk).BDT_JSON || '[]');
const reset = () => {
  DB.EVOLUCIONES.length = 0;
  DB.CAMAS_ESTADO = [{ ID_CAMA: '4', OCUPADA: 'TRUE', PATIENT_ID: 'p4', NOMBRE: 'P',
    FECHA_INGRESO: '2026-08-01', FECHA_INICIO_VA: '2026-08-01', VIA_AEREA: 'TQT', SOPORTE: 'Oxigenoterapia/OAF' }];
};

console.log('\n── PARTE 1 · El servidor guarda una sola elección ──');
console.log('\n1 · 🔴 La columna del momento existe');
const esq = fs.readFileSync(path.join(v2, 'esquema.gs'), 'utf8');
si('★★ EVAL_T_BDT_MOMENTO está en el esquema', /EVAL_T_BDT_MOMENTO/.test(esq));

console.log('\n2 · Positivo precoz se guarda con su momento');
reset();
guardar('2026-08-12-Dia', { EVAL_T_BDT_POS: true, EVAL_T_BDT_MOMENTO: 'precoz' });
eq('★★ la serie lleva el resultado', serie('2026-08-12-Dia')[0].resultado, '+');
eq('★★ …y el momento', serie('2026-08-12-Dia')[0].momento, 'precoz');
eq('★★ el último queda a mano con su momento', evo('2026-08-12-Dia').BDT_ULTIMO, '+ precoz (2026-08-12)');

console.log('\n3 · Negativo NO arrastra un momento');
reset();
guardar('2026-08-12-Dia', { EVAL_T_BDT_NEG: true, EVAL_T_BDT_MOMENTO: 'tardio' });
eq('★★ el resultado es negativo', serie('2026-08-12-Dia')[0].resultado, '-');
eq('★★ y un negativo no puede ser «tardío»', serie('2026-08-12-Dia')[0].momento || '', '');
eq('★ el último no lleva momento', evo('2026-08-12-Dia').BDT_ULTIMO, '- (2026-08-12)');

console.log('\n4 · 🔴 Las dos a la vez: gana el positivo y ya no es en silencio');
reset();
guardar('2026-08-12-Dia', { EVAL_T_BDT_POS: true, EVAL_T_BDT_NEG: true });
eq('★★ queda positivo (el más prudente)', serie('2026-08-12-Dia')[0].resultado, '+');
eq('★★ y NO se guardan las dos marcas a la vez',
   [evo('2026-08-12-Dia').EVAL_T_BDT_POS, evo('2026-08-12-Dia').EVAL_T_BDT_NEG].map(x => x === true || x === 'TRUE').join('/'),
   'true/false');

console.log('\n5 · Repetirlo el mismo turno reemplaza, no agrega');
reset();
guardar('2026-08-12-Dia', { EVAL_T_BDT_POS: true, EVAL_T_BDT_MOMENTO: 'precoz' });
// La pantalla manda SIEMPRE las dos marcas (false explícito), y el servidor
// fusiona con la fila anterior: sin el false, el positivo viejo sobreviviría.
guardar('2026-08-12-Dia', { EVAL_T_BDT_POS: false, EVAL_T_BDT_NEG: true });
eq('★ sigue habiendo UN solo registro de ese turno', serie('2026-08-12-Dia').length, 1);
eq('★ …y es el último', serie('2026-08-12-Dia')[0].resultado, '-');

/* ══ PARTE 2 · La pantalla ═══════════════════════════════════════════════ */
(async () => {
  console.log('\n── PARTE 2 · La pantalla ──');
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 1400 }, locale: 'es-CL' });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  /* 🪤 EL RELOJ VA CONGELADO. La recarga de evaluaciones solo ocurre si
     EVAL_FECHA es «hoy» según `new Date()`: con el reloj real la guardia daba
     distinto según el día en que se corriera. Fecha inventada: 12-ago-2026. */
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

  const abrir = evoGuardada => p.evaluate(x => {
    window.__evo = x; $('kf').reset();
    DB = [{ ID_CAMA: '4', OCUPADA: true, PATIENT_ID: 'p4', NOMBRE: 'P', EDAD: 61, SEXO: 'M',
            VIA_AEREA: 'TQT', SOPORTE: 'Oxigenoterapia/OAF', FECHA_INGRESO: '2026-08-01' }];
    window.recargarSilencioso = () => {};
    $('gDate').value = '2026-08-12'; SHIFT = 'Dia';
    renderGrid(); abrirPanel('4', false, false);
  }, evoGuardada).then(() => p.waitForTimeout(800))
    .then(() => p.evaluate(() => { window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]); pasoIr(3); }))
    .then(() => p.waitForTimeout(350));

  const ver = sel => p.evaluate(s => { const e = document.querySelector(s);
    if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0);
  }, sel);
  const est = () => p.evaluate(() => ({
    pos: !!$('fBDTp')?.checked, neg: !!$('fBDTn')?.checked, mom: $('fBDTmom')?.value || '',
    pPos: $('btnBdtPos')?.getAttribute('aria-pressed'), pNeg: $('btnBdtNeg')?.getAttribute('aria-pressed'),
    pPre: $('btnBdtPrecoz')?.getAttribute('aria-pressed'), pTar: $('btnBdtTardio')?.getAttribute('aria-pressed') }));

  await abrir(null);
  /* 🪤 Las evaluaciones viven tras «Se evaluó este turno» (cEgr): hasta marcarla
     la tarjeta está oculta. Se abre como lo haría un colega. */
  // 1-oct-2026 · el BDT se mudó de «Tos y deglución» a «Pruebas de traqueostomía» (Diego).
  await p.evaluate(() => { const c = $('cEgr'); c.checked = true; hEgr(); const d = $('dxTqt'); if (d) d.open = true; });
  await p.waitForTimeout(200);
  if (process.env.DEPURAR) console.log('ANCESTROS', JSON.stringify(await p.evaluate(() => {
    const r = []; let e = $('btnBdtNeg');
    while (e && e !== document.body) { const cs = getComputedStyle(e);
      r.push((e.id || e.className || e.tagName).toString().slice(0, 40) + ':' + cs.display + (e.open === false ? ':CERRADO' : '')); e = e.parentElement; }
    return r; })));

  console.log('\n6 · 🔴 Una sola elección, sin «no realizado»');
  si('★★ el botón Negativo existe y se ve', await ver('#btnBdtNeg'));
  si('★★ el botón Positivo existe y se ve', await ver('#btnBdtPos'));
  no('★★ NO hay opción «no realizado»',
     await p.evaluate(() => /no realizad/i.test(($('dBdt')?.textContent) || '')));
  no('★ las casillas viejas ya no se ven sueltas', await ver('label[for="fBDTp"]'));
  no('★ precoz/tardío NO se ofrecen sin un positivo', await ver('#btnBdtPrecoz'));

  console.log('\n7 · Elegir, cambiar y desmarcar');
  await p.evaluate(() => bdtElegir('pos'));
  let s = await est();
  eq('★★ Positivo marca positivo', s.pos + '/' + s.neg, 'true/false');
  eq('★ …y el botón queda presionado', s.pPos, 'true');
  si('★★ con un positivo SÍ se ofrece precoz/tardío', await ver('#btnBdtPrecoz'));
  await p.evaluate(() => bdtElegir('neg'));
  s = await est();
  eq('★★ Negativo reemplaza al positivo, no se suman', s.pos + '/' + s.neg, 'false/true');
  no('★★ …y precoz/tardío desaparecen', await ver('#btnBdtPrecoz'));
  await p.evaluate(() => bdtElegir('neg'));
  s = await est();
  eq('★★ tocar de nuevo desmarca: queda sin realizar', s.pos + '/' + s.neg, 'false/false');
  eq('★ …y el botón se suelta', s.pNeg, 'false');

  console.log('\n8 · Precoz o tardío, y se borran solos con el resultado');
  await p.evaluate(() => { bdtElegir('pos'); bdtMomento('precoz'); });
  s = await est();
  eq('★★ precoz queda elegido', s.mom, 'precoz');
  await p.evaluate(() => bdtMomento('tardio'));
  s = await est();
  eq('★★ tardío reemplaza a precoz', s.mom, 'tardio');
  await p.evaluate(() => bdtMomento('tardio'));
  s = await est();
  eq('★ tocarlo otra vez lo suelta (es opcional)', s.mom, '');
  await p.evaluate(() => { bdtMomento('precoz'); bdtElegir('neg'); });
  s = await est();
  eq('★★ pasar a negativo borra el momento', s.mom, '');

  console.log('\n9 · 🔴 Lo que se elige viaja en el guardado');
  const viaja = async setup => p.evaluate(async fn => {
    $('kf').reset(); $('cBed').value = '4'; DB = [{ ID_CAMA: '4', OCUPADA: true }];
    const o = document.createElement('option'); o.value = 'Klgo. Test'; o.textContent = 'Klgo. Test';
    $('fFirma').appendChild(o); $('fFirma').value = 'Klgo. Test';
    const he = $('fHEst'); if (he && !he.value) he.value = 'Estable';
    const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos';
    $('fVA').value = 'TQT'; _transAvisoOk = true;
    new Function('return (' + fn + ')')()();
    window._ll.length = 0; guardar();
    await new Promise(r => setTimeout(r, 80));
    const c = window._ll.find(x => x.a === 'GUARDAR_EVOLUCION');
    return c ? { pos: c.d.EVAL_T_BDT_POS, neg: c.d.EVAL_T_BDT_NEG, mom: c.d.EVAL_T_BDT_MOMENTO || '' } : null;
  }, setup);
  let g = await viaja("() => { bdtElegir('pos'); bdtMomento('tardio'); }");
  eq('★★ positivo tardío viaja', g && (g.pos + '/' + g.neg + '/' + g.mom), 'true/false/tardio');
  g = await viaja("() => { bdtElegir('neg'); }");
  eq('★★ negativo viaja sin momento', g && (g.pos + '/' + g.neg + '/' + g.mom), 'false/true/');
  g = await viaja("() => { }");
  eq('★ sin elegir nada viaja vacío (no realizado)', g && (g.pos + '/' + g.neg + '/' + g.mom), 'false/false/');

  console.log('\n10 · 🔴 Al reabrir el turno, la pantalla lo repone');
  await abrir({ ID_CAMA: '4', TURNO_KEY: '2026-08-12-Dia', PATIENT_ID: 'p4', PAC_NOMBRE: 'P',
    VENT_VIA_AEREA: 'TQT', VENT_SOPORTE: 'Oxigenoterapia/OAF',
    EVAL_FECHA: '2026-08-12', EVAL_T_BDT_POS: true, EVAL_T_BDT_MOMENTO: 'precoz', PLAN_FIRMA_KINE: 'K.P.' });
  s = await est();
  eq('★★ el positivo vuelve', s.pos + '/' + s.neg, 'true/false');
  eq('★★ el botón queda presionado', s.pPos, 'true');
  eq('★★ el momento vuelve', s.mom, 'precoz');
  eq('★ y su botón también', s.pPre, 'true');

  console.log('\n11 · El relato');
  await p.evaluate(() => { $('fFEM').value = '3.5'; });
  const txt = await p.evaluate(() => genTexto());
  si('★★ narra «BDT positivo precoz»', /BDT positivo precoz/.test(txt));
  no('★★ ya no puede decir las dos cosas', /BDT negativo/.test(txt));
  si('★★ el FEM se narra en L/s, la unidad en que se mide', /FEM 3[.,]5 L\/s/.test(txt));
  no('★★ …y no en L/min, que daría 210', /FEM [\d.,]+ L\/min/.test(txt));

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ bdt_una_eleccion: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
