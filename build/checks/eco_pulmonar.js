// eco_pulmonar.js — Ecografía pulmonar: POCUS (1, 2 y PLAPS) y LUS (12 zonas),
// sobre una figura, con serie por turno (Diego, 1-oct-2026).
//
// LO QUE PIDIÓ: «anotar las dos, como pruebas separadas dentro del módulo de
// ecografía pulmonar: evaluación LUS y evaluación según POCUS; uno aprieta POCUS
// y despliega POCUS, uno aprieta LUS y despliega LUS. Para que se vea más gráfico,
// poner la imagen de un pulmón y los puntos, y que al seleccionarlo yo anote en
// la zona 1 y así.» Y: «POCUS: que marque 1, 2 y PLAPS, esto en contexto UCI.»
// Y de la fecha: «que se sepa que ese día se evaluó… algo episódico si se vuelve
// a evaluar.» → se anota en el turno y se guarda como serie.
//
// 🔴 EL POCUS NO RELLENA EL LUS EN SILENCIO. Los puntos del BLUE son referencias
// anatómicas; las zonas del LUS son regiones, y el PLAPS cae en el BORDE entre dos
// de ellas. Pasar de POCUS a LUS ofrece los valores EN ÁMBAR, como sugerencia, y
// hay que confirmarlos: copiarlos callado metería un valor aproximado dentro de un
// puntaje con cortes publicados (misma regla por la que los gases nacen en blanco).
//
// 🪤 EL PUNTAJE SOLO SE INTERPRETA COMPLETO. Con menos de 12 zonas es un subtotal:
// se muestra como «parcial» y NO se le pone etiqueta clínica, porque un 9 de 6
// zonas no es un 9 de 12.
//
// 🪤 12 TOQUES NO PUEDEN SER 12 MODALES: el selector aparece junto al punto y se
// cierra al elegir.
//
// 🪤 El lado se DIBUJA, no se deduce: cada torso lleva su D y su I escritas.
//
// 🪤 El servidor no se fía del cliente: sanea el JSON (solo claves y valores
// conocidos) y la serie del episodio es idempotente por turno y por tipo.
//
// 🪤 Reloj congelado; las evaluaciones viven tras «Se evaluó este turno».
//
// Uso: node build/checks/eco_pulmonar.js
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

/* ══ PARTE 1 · Servidor ═══════════════════════════════════════════════════ */
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
                  VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', VENT_MODO: 'CPAP/PS' }, campos),
  { firma: 'DMV', email: 'x@y' });
const evo = tk => DB.EVOLUCIONES.find(e => e.TURNO_KEY === tk);
const serie = tk => JSON.parse((evo(tk) || {}).ECO_PULM_SERIE || '[]');
const reset = () => { DB.EVOLUCIONES.length = 0;
  DB.CAMAS_ESTADO = [{ ID_CAMA: '4', OCUPADA: 'TRUE', PATIENT_ID: 'p4', NOMBRE: 'P',
    FECHA_INGRESO: '2026-08-01', FECHA_INICIO_VA: '2026-08-01', VIA_AEREA: 'TOT', SOPORTE: 'VM' }]; };
const LUS12 = { AS_D: 0, AS_I: 1, AI_D: 1, AI_I: 1, LS_D: 1, LI_D: 2, LS_I: 1, LI_I: 2, PS_I: 2, PS_D: 2, PI_I: 2, PI_D: 3 };   // 18
const POC = { p: { '1D': 'A', '1I': 'B', '2D': 'A', '2I': 'B+', PD: 'C', PI: 'B+' }, d: ['PD'] };

console.log('\n── PARTE 1 · El servidor ──');
const esq = fs.readFileSync(path.join(v2, 'esquema.gs'), 'utf8');
console.log('\n1 · Las dos columnas existen');
si('★★ ECO_PULM_JSON está en el esquema', /ECO_PULM_JSON/.test(esq));
si('★★ ECO_PULM_SERIE está en el esquema', /ECO_PULM_SERIE/.test(esq));

console.log('\n2 · El puntaje se calcula del lado del servidor');
eq('★★ 12 zonas suman 18', _ecoPuntaje(LUS12).total, 18);
eq('★★ …y son 12', _ecoPuntaje(LUS12).n, 12);
eq('★★ con 3 zonas: subtotal y n = 3', JSON.stringify(_ecoPuntaje({ AS_D: 1, AS_I: 2, PI_D: 3 })), '{"total":6,"n":3}');
eq('★ valores fuera de 0-3 no cuentan', _ecoPuntaje({ AS_D: 9, AS_I: -1, PI_D: 2 }).n, 1);

console.log('\n3 · 🪤 El servidor sanea lo que llega');
const sucio = _ecoSanear(JSON.stringify({ lus: { AS_D: 2, ZONA_FALSA: 3, AS_I: 7 }, pocus: { p: { '1D': 'A', '9X': 'C', '2D': 'Z' }, d: ['PD', 'XX'] }, inyeccion: '<script>' }));
const sj = JSON.parse(sucio);
eq('★★ conserva la zona buena', sj.lus.AS_D, 2);
eq('★★ tira la zona inventada', 'ZONA_FALSA' in sj.lus, false);
eq('★★ tira el valor fuera de rango', 'AS_I' in sj.lus, false);
eq('★★ conserva el punto bueno del POCUS', sj.pocus.p['1D'], 'A');
eq('★★ tira el punto y el valor inventados', ('9X' in sj.pocus.p) || ('2D' in sj.pocus.p), false);
eq('★★ el derrame solo en puntos que existen', JSON.stringify(sj.pocus.d), '["PD"]');
eq('★★ y no deja pasar claves ajenas', 'inyeccion' in sj, false);
eq('★ basura → vacío', _ecoSanear('esto no es json'), '');
eq('★ vacío → vacío', _ecoSanear(''), '');

console.log('\n4 · La serie del episodio: una entrada por turno y por tipo');
reset();
guardar('2026-08-11-Noche', { ECO_PULM_JSON: JSON.stringify({ lus: Object.assign({}, LUS12, { PI_D: 3, PS_D: 3, PS_I: 3, PI_I: 3, AS_D: 1 }) }) });
guardar('2026-08-12-Dia', { ECO_PULM_JSON: JSON.stringify({ lus: LUS12, pocus: POC }) });
let s = serie('2026-08-12-Dia');
eq('★★ el turno de hoy ve DOS entradas de LUS y POCUS acumuladas (ayer + hoy)', s.length, 3);
eq('★★ la de ayer sigue ahí', s.filter(x => x.turnoKey === '2026-08-11-Noche' && x.tipo === 'lus').length, 1);
eq('★★ hoy hay un LUS', s.filter(x => x.turnoKey === '2026-08-12-Dia' && x.tipo === 'lus').length, 1);
eq('★★ …con su puntaje del servidor', s.find(x => x.turnoKey === '2026-08-12-Dia' && x.tipo === 'lus').puntaje, 18);
eq('★★ …y con su fecha', s.find(x => x.turnoKey === '2026-08-12-Dia' && x.tipo === 'lus').fecha, '2026-08-12');
eq('★★ hoy hay un POCUS', s.filter(x => x.turnoKey === '2026-08-12-Dia' && x.tipo === 'pocus').length, 1);

console.log('\n5 · Volver a guardar el mismo turno REEMPLAZA, no agrega');
guardar('2026-08-12-Dia', { ECO_PULM_JSON: JSON.stringify({ lus: Object.assign({}, LUS12, { PI_D: 1 }) }) });
s = serie('2026-08-12-Dia');
eq('★★ sigue habiendo UN LUS de hoy', s.filter(x => x.turnoKey === '2026-08-12-Dia' && x.tipo === 'lus').length, 1);
eq('★★ …con el puntaje nuevo', s.find(x => x.turnoKey === '2026-08-12-Dia' && x.tipo === 'lus').puntaje, 16);
eq('★★ el POCUS de hoy se fue (ya no está en el turno)', s.filter(x => x.turnoKey === '2026-08-12-Dia' && x.tipo === 'pocus').length, 0);
eq('★★ y lo de ayer NO se tocó', s.filter(x => x.turnoKey === '2026-08-11-Noche').length, 1);

console.log('\n6 · Un turno sin ecografía no borra la serie de los anteriores');
guardar('2026-08-13-Dia', {});
s = serie('2026-08-13-Dia');
eq('★★ el turno siguiente, sin eco, hereda la serie para poder compararse', s.length >= 1, 'true');

console.log('\n7 · El turno anterior viaja con su serie (para mostrar «22 → 18»)');
const rp = obtenerEvolucionPrevia('4', '2026-08-14-Dia', DB.EVOLUCIONES);
si('★★ obtenerEvolucionPrevia trae la serie', rp.ok && rp.data && JSON.parse(rp.data._ECO_SERIE || rp.data.ECO_PULM_SERIE || '[]').length >= 1);

console.log('\n8 · El relato del servidor');
const tx = generarTextoEvolucion({ TURNO: 'Dia', VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM',
  ECO_PULM_JSON: JSON.stringify({ lus: LUS12, pocus: POC }) });
si('★★ narra el LUS completo', /LUS 18\/36/.test(tx));
si('★★ narra el POCUS con sus puntos', /POCUS/.test(tx) && /PLAPS consolidaci[oó]n con derrame/.test(tx));
const txp = generarTextoEvolucion({ TURNO: 'Dia', VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM',
  ECO_PULM_JSON: JSON.stringify({ lus: { AS_D: 1, AS_I: 2, PI_D: 3 } }) });
si('★★ un LUS incompleto se dice PARCIAL, no 6/36', /LUS parcial 6 \(3\/12 zonas\)/.test(txp) && !/LUS 6\/36/.test(txp));

/* ══ PARTE 2 · La pantalla ═══════════════════════════════════════════════ */
(async () => {
  console.log('\n── PARTE 2 · La pantalla ──');
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
    window._ll = []; window.__evo = null; window.__previa = null;
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
      api(a, d) { window._ll.push({ a, d }); let data = null;
        if (a === 'GET_CONFIG_UI') data = { NUM_CAMAS: 12, BANNERS: {} };
        else if (a === 'GET_EVO_TURNO') data = { actual: window.__evo, previa: window.__previa, pronoAbierto: '' };
        setTimeout(() => ok({ ok: true, data }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.join(v2, 'index.html'));
  await p.waitForTimeout(800);

  const abrir = (evoGuardada, previa) => p.evaluate(x => {
    window.__evo = x.evo; window.__previa = x.previa; $('kf').reset();
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', EDAD: 61, SEXO: 'M',
            VIA_AEREA: 'TOT', SOPORTE: 'VM', FECHA_INGRESO: '2026-08-07' }];
    window.recargarSilencioso = () => {};
    $('gDate').value = '2026-08-12'; SHIFT = 'Dia';
    renderGrid(); abrirPanel('3', false, false);
  }, { evo: evoGuardada || null, previa: previa || null }).then(() => p.waitForTimeout(800))
    .then(() => p.evaluate(() => { window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
      const c = $('cEgr'); c.checked = true; hEgr(); pasoIr(3);
      const d = $('dxEcoPulm'); if (d) d.open = true; }))
    .then(() => p.waitForTimeout(350));
  const ver = sel => p.evaluate(s => { const e = document.querySelector(s);
    if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0);
  }, sel);
  const est = () => p.evaluate(() => { try { return JSON.parse($('fEcoPulm').value || '{}'); } catch (e) { return { error: String(e) }; } });
  /* Elige como lo haría un colega: toca el punto y toca la opción del selector. */
  const tocar = async (id, valor) => {
    await p.click('#ecoPt_' + id);
    await p.waitForTimeout(60);
    await p.click('#ecoPop [data-v="' + valor + '"]');
    await p.waitForTimeout(60);
  };

  await abrir();

  console.log('\n9 · 🔴 El módulo, con sus dos pruebas');
  si('★★ el módulo «Ecografía pulmonar» está en Evaluaciones', await p.evaluate(() => !!$('dxEcoPulm')?.closest('#dEgr')));
  si('★★ botón POCUS', await ver('#btnEcoPocus'));
  si('★★ botón LUS', await ver('#btnEcoLus'));
  no('★★ sin elegir ninguna, no hay figura', await ver('#ecoHost'));
  await p.click('#btnEcoPocus'); await p.waitForTimeout(100);
  si('★★ al apretar POCUS se despliega la figura', await ver('#ecoHost'));
  si('★★ …con el torso de FRENTE y el de ESPALDA', await p.evaluate(() => /Frente/.test($('ecoHost').textContent) && /Espalda/.test($('ecoHost').textContent)));
  eq('★★ 🪤 el lado se dibuja: cada torso lleva su D y su I', await p.evaluate(() => ($('ecoHost').textContent.match(/\bD\b/g) || []).length >= 2 && ($('ecoHost').textContent.match(/\bI\b/g) || []).length >= 2), 'true');

  console.log('\n10 · POCUS: seis puntos (1, 2 y PLAPS por lado), no doce');
  eq('★★ hay 6 puntos', await p.evaluate(() => document.querySelectorAll('#ecoHost .ecoPt[data-modo="pocus"]:not(.hidden)').length), 6);
  for (const id of ['1D', '1I', '2D', '2I', 'PD', 'PI']) si('★ existe el punto ' + id, await ver('#ecoPt_' + id));
  no('★★ las zonas del LUS NO se ven en modo POCUS', await ver('#ecoPt_AS_D'));

  console.log('\n11 · 🔴 Tocar un punto abre el selector JUNTO al punto (no un modal) y se cierra al elegir');
  await p.click('#ecoPt_1D'); await p.waitForTimeout(60);
  si('★★ el selector aparece', await ver('#ecoPop'));
  eq('★★ ofrece los 4 hallazgos', await p.evaluate(() => Array.from(document.querySelectorAll('#ecoPop [data-v]')).map(e => e.getAttribute('data-v')).join(',')), 'A,B,B+,C');
  si('★★ 🪤 NO es un modal: no hay fondo que tape la pantalla', await p.evaluate(() => { const e = $('ecoPop'); return getComputedStyle(e).position === 'absolute'; }));
  await p.click('#ecoPop [data-v="A"]'); await p.waitForTimeout(60);
  no('★★ al elegir, el selector se cierra solo', await ver('#ecoPop'));
  eq('★★ el punto 1D quedó en A', (await est()).pocus.p['1D'], 'A');
  eq('★ …y el botón del punto lo muestra', await p.evaluate(() => $('ecoPt_1D').textContent.trim()), 'A');

  console.log('\n12 · El POCUS completo, con derrame');
  await tocar('1I', 'B'); await tocar('2D', 'A'); await tocar('2I', 'B+'); await tocar('PD', 'C'); await tocar('PI', 'B+');
  await p.click('#ecoPt_PD'); await p.waitForTimeout(60);
  await p.click('#btnEcoDerr'); await p.waitForTimeout(60);
  let e = await est();
  eq('★★ los 6 puntos quedaron', Object.keys(e.pocus.p).length, 6);
  eq('★★ el derrame quedó marcado en el PLAPS derecho', JSON.stringify(e.pocus.d), '["PD"]');
  await p.keyboard.press('Escape'); await p.waitForTimeout(60);
  no('★ Escape cierra el selector', await ver('#ecoPop'));
  await p.click('#ecoPt_1D'); await p.click('#btnEcoQuitar'); await p.waitForTimeout(60);
  eq('★★ «quitar» borra un punto puesto por error', 'p' in (await est()).pocus && '1D' in (await est()).pocus.p, false);
  await tocar('1D', 'A');

  console.log('\n13 · 🔴 Pasar a LUS: lo del POCUS llega EN ÁMBAR y NO se copia solo');
  await p.click('#btnEcoLus'); await p.waitForTimeout(150);
  si('★★ aparecen las 12 zonas', await p.evaluate(() => document.querySelectorAll('#ecoHost .ecoPt[data-modo="lus"]:not(.hidden)').length === 12));
  no('★★ los puntos del POCUS se esconden', await ver('#ecoPt_1D'));
  eq('★★ 🔴 el LUS NO se rellenó solo', Object.keys((await est()).lus || {}).length, 0);
  eq('★★ seis zonas llegan sugeridas', await p.evaluate(() => document.querySelectorAll('#ecoHost .ecoPt.sug').length), 6);
  eq('★★ la sugerencia de AS_D es lo del punto 1D (A → 0)', await p.evaluate(() => $('ecoPt_AS_D').textContent.trim()), '0');
  eq('★★ …y la de PI_D, la del PLAPS derecho (C → 3)', await p.evaluate(() => $('ecoPt_PI_D').textContent.trim()), '3');
  si('★★ la zona sugerida se distingue (ámbar, punteada)', await p.evaluate(() => { const c = getComputedStyle($('ecoPt_AS_D')); return /dashed/.test(c.borderStyle); }));
  eq('★★ y el puntaje sigue en 0/12 mientras no se confirme nada', await p.evaluate(() => $('ecoScore').textContent.replace(/\s+/g, ' ').trim().startsWith('0')), 'true');
  await p.click('#btnEcoSug'); await p.waitForTimeout(100);
  eq('★★ «Aceptar las sugeridas» las confirma de una vez', Object.keys((await est()).lus || {}).length, 6);
  eq('★ …ya no quedan sugeridas', await p.evaluate(() => document.querySelectorAll('#ecoHost .ecoPt.sug').length), 0);

  console.log('\n14 · El puntaje: parcial hasta que están las 12');
  const sc = () => p.evaluate(() => ({ t: $('ecoScore').textContent.replace(/\s+/g, ' ').trim(), i: $('ecoInterp').textContent.replace(/\s+/g, ' ').trim(), iv: !!$('ecoInterp').offsetParent }));
  let r = await sc();
  si('★★ con 6 zonas dice «parcial»', /parcial/i.test(r.t) && /6\/12/.test(r.t));
  no('★★ 🪤 y NO le pone etiqueta clínica a un subtotal', r.iv && r.i.length > 0);
  for (const z of ['LS_D', 'LS_I', 'LI_D', 'LI_I', 'PS_D', 'PS_I']) await tocar(z, '1');   // las 6 que el POCUS no sugiere
  r = await sc();
  si('★★ con las 12, ya es un puntaje de 12/12', /12\/12/.test(r.t) && !/parcial/i.test(r.t));
  const tot = await p.evaluate(() => parseInt(($('ecoScore').textContent.match(/(\d+)\s*\/\s*36/) || [])[1]));
  eq('★★ el puntaje se suma solo', tot, 0 + 0 + 0 + 0 + 0 + 0 + 0 + 0 + 0 + 0 + 0 + 0 + (await p.evaluate(() => { const l = JSON.parse($('fEcoPulm').value).lus; return Object.values(l).reduce((a, b) => a + b, 0); })));
  si('★★ con las 12 sí hay interpretación', (await sc()).iv && (await sc()).i.length > 0);
  await tocar('PI_D', '3'); await tocar('PI_I', '3'); await tocar('PS_D', '3'); await tocar('PS_I', '3');
  r = await sc();
  si('★★ un puntaje alto se rotula como pérdida importante', /importante/i.test(r.i));
  await tocar('PI_D', '0'); await tocar('PI_I', '0'); await tocar('PS_D', '0'); await tocar('PS_I', '0');
  r = await sc();
  si('★★ uno bajo se rotula distinto', !/importante/i.test(r.i));

  console.log('\n15 · Lo que se anota viaja en el guardado, y vuelve al reabrir');
  const viaja = await p.evaluate(async () => {
    $('cBed').value = '3';
    const o = document.createElement('option'); o.value = 'Klgo. Test'; o.textContent = 'Klgo. Test';
    if (!Array.from($('fFirma').options).some(x => x.value === 'Klgo. Test')) $('fFirma').appendChild(o);
    $('fFirma').value = 'Klgo. Test';
    const he = $('fHEst'); if (he && !he.value) he.value = 'Estable';
    const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos';
    $('fVA').value = 'TOT'; $('fSop').value = 'VM';
    { const pv = $('fPVEval'); if (pv && !pv.value) { hPVEtoggle('nc'); const r = $('fPveNcRaz'); if (r) { r.value = 'Ventilación mecánica domiciliaria'; hPveNcRaz(); } } }
    _transAvisoOk = true; window._ll.length = 0; guardar();
    await new Promise(r => setTimeout(r, 90));
    const c = window._ll.find(x => x.a === 'GUARDAR_EVOLUCION');
    return c ? c.d.ECO_PULM_JSON : null;
  });
  si('★★ ECO_PULM_JSON viaja', viaja);
  const vj = JSON.parse(viaja || '{}');
  eq('★★ …con el LUS', Object.keys(vj.lus || {}).length, 12);
  eq('★★ …y con el POCUS', Object.keys((vj.pocus || {}).p || {}).length, 6);
  await abrir({ ID_CAMA: '3', TURNO_KEY: '2026-08-12-Dia', PATIENT_ID: 'p3', PAC_NOMBRE: 'P', PLAN_FIRMA_KINE: 'K.P.',
    VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', EVAL_FECHA: '2026-08-12', EVAL_T_REALIZAR: true, ECO_PULM_JSON: viaja });
  eq('★★ al reabrir, el LUS vuelve', Object.keys((await est()).lus || {}).length, 12);
  eq('★★ …y el POCUS', Object.keys(((await est()).pocus || {}).p || {}).length, 6);
  await p.click('#btnEcoPocus'); await p.waitForTimeout(100);
  eq('★★ …y se ve en la figura', await p.evaluate(() => $('ecoPt_PD').textContent.trim().startsWith('C')), 'true');

  console.log('\n16 · 🪤 NO se replica al turno siguiente');
  await abrir();
  await p.evaluate(() => { try { fillFormReplica({ ID_CAMA: '3', VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', ECO_PULM_JSON: '{"lus":{"AS_D":2}}' }); } catch (e) {} });
  eq('★★ la ecografía de ayer NO aparece hoy', await p.evaluate(() => $('fEcoPulm').value), '');

  console.log('\n17 · Contra el turno anterior');
  await abrir(null, { ID_CAMA: '3', TURNO_KEY: '2026-08-11-Noche', ECO_PULM_SERIE: JSON.stringify([
    { turnoKey: '2026-08-11-Noche', fecha: '2026-08-11', tipo: 'lus', puntaje: 22, n: 12 }]) });
  await p.click('#btnEcoLus'); await p.waitForTimeout(100);
  for (const z of Object.keys(LUS12)) await tocar(z, String(LUS12[z]));
  const ant = await p.evaluate(() => $('ecoAnt').textContent.replace(/\s+/g, ' ').trim());
  si('★★ muestra el anterior (22)', /22/.test(ant));
  si('★★ …y el de hoy (18)', /18/.test(ant));
  si('★★ …y dice que ganó aireación', /aireaci[oó]n/i.test(ant));

  console.log('\n18 · El relato de la pantalla');
  const txt = await p.evaluate(() => genTexto());
  si('★★ narra el LUS', /LUS 18\/36/.test(txt));

  console.log('\n19 · 🪤 El cliente y el servidor dicen LO MISMO (el cálculo y el texto están escritos dos veces)');
  const muestras = [{ lus: LUS12, pocus: POC }, { lus: { AS_D: 1, AS_I: 2, PI_D: 3 } },
    { pocus: { p: { '1D': 'A' }, d: ['PI'] } }, { pocus: { p: {}, d: ['PD'] } }, { lus: { AS_D: 3 } }, {}];
  for (const m of muestras) {
    const cli = await p.evaluate(x => ecoTexto(x).join(' | '), m);
    const srv = _ecoTexto(JSON.stringify(m)).join(' | ');
    eq('★★ el texto coincide para ' + JSON.stringify(m).slice(0, 50), cli, srv);
    const pc = await p.evaluate(x => JSON.stringify(ecoPuntaje(x.lus || {})), m);
    eq('★★ el puntaje coincide para ' + JSON.stringify(m.lus || {}).slice(0, 30), pc, JSON.stringify(_ecoPuntaje(m.lus || {})));
  }

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ eco_pulmonar: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
