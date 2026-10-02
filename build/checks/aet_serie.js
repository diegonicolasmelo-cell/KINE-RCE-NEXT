// aet_serie.js — La AET es una SERIE de tramos: un estado que arrastra y cada cambio
// abre uno nuevo (Diego, 30-sep-2026: «episodio serial»).
//
// LO QUE PIDIÓ: «La adecuación del esfuerzo terapéutico podría ir en ingreso. Ahí se
// podrían definir los grupos de soporte: soporte total, que sería el grupo 1, grupo 2, grupo
// 3A, 3B, 3C. Esto puede ser modificable durante la estadía. Probablemente lo más adecuado
// sería escribirlo en el turno, pero que se guarde como un evento de episodio, como episodio
// serial. Al momento del egreso, si no se modificó durante toda la estadía, que se guarde
// como adecuación al egreso el mismo que se seleccionó al principio.»
//
// 🔴 CONFIRMAR NO ES CAMBIAR. Un toque sin querer no puede quedar como una adecuación nueva en
// la ficha: el tramo solo cambia si el grupo es DISTINTO del vigente. Es la misma regla del
// filtro HME («vigente» no significa «lo cambié»).
//
// 🪤 SIN AET = GRUPO 1. Hoy «AET activa» es una casilla y el grupo I es «Soporte total» (sin
// limitación). En el modelo nuevo todo paciente parte en el grupo 1: con AET desactivada el
// grupo vigente es I. Los valores GUARDADOS no cambian (AET_ACTIVA, AET_NIVEL), así que nada
// de lo viejo se rompe.
//
// 🪤 AL EGRESO NO SE COPIA NADA: la AET al egreso ES el último tramo abierto. Y si no cambió en
// toda la estadía, ese tramo es el del ingreso: exactamente lo que pidió.
//
// 🪤 Cada cambio deja su hito en el historial (con fecha, hora y quién lo registró), como los
// eventos de vía aérea. La AET la decide el médico; el kinesiólogo deja constancia.
//
// 🪤 La AET 3C sigue suspendiendo la KTM (ruta automática de contraindicación).
//
// 🪤 Reloj congelado: fecha inventada (12-ago-2026) y turno forzado.
//
// Uso: node build/checks/aet_serie.js
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
global._agregarHitoInterno = () => {}; global._guardarProcedimientosInterno = () => {};
let HITOS = [];
global._timelineDelGuardado = (a, b, c, d, e, f, g, hitos) => { HITOS = (hitos || []).slice(); return '[]'; };
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

const camaNueva = () => [{ ID_CAMA: '4', OCUPADA: 'TRUE', PATIENT_ID: 'p4', NOMBRE: 'P',
  FECHA_INGRESO: '2026-08-05', TS_INGRESO: '2026-08-05 23:00:00', FECHA_INICIO_VA: '2026-08-05', VIA_AEREA: 'TOT', SOPORTE: 'VM' }];
const guardar = (tk, campos) => guardarEvolucion(
  Object.assign({ ID_CAMA: '4', TURNO_KEY: tk, PLAN_FIRMA_KINE: 'K.P.', PAC_NOMBRE: 'X', VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM' }, campos),
  { firma: 'K.P.', email: 'x@y' });
const serie = () => JSON.parse(DB.CAMAS_ESTADO[0].AET_SERIE || '[]');
const reset = () => { DB.EVOLUCIONES.length = 0; DB.CAMAS_ESTADO = camaNueva(); HITOS = []; };
const aetHito = () => HITOS.filter(h => /AET|adecuaci/i.test(h.texto || ''));

console.log('\n── PARTE 1 · El servidor ──');
console.log('\n1 · La columna existe en la cama y en el archivo');
const esq = fs.readFileSync(path.join(v2, 'esquema.gs'), 'utf8');
eq('★★ CAMAS_ESTADO tiene AET_SERIE', (esq.match(/AET_SERIE/g) || []).length >= 2, 'true');
const camasSrc = fs.readFileSync(path.join(v2, 'svc_camas.gs'), 'utf8');
si('★★ al dar el alta se archiva la serie', /AET_SERIE:\s*cama\.AET_SERIE/.test(camasSrc));
si('★★ y la cama liberada la deja vacía', /AET_SERIE:\s*''/.test(camasSrc));

console.log('\n2 · 🔴 El primer tramo es el del ingreso: grupo I (soporte total)');
reset();
guardar('2026-08-05-Noche', { ES_INGRESO: true, AET_ACTIVA: false, AET_NIVEL: '' });
let s = serie();
eq('★★ hay UN tramo', s.length, 1);
eq('★★ en el grupo I', s[0].g, 'I');
eq('★★ que empieza al INGRESO (no en el momento de anotarlo)', s[0].desde, '2026-08-05 23:00:00');
eq('★★ y sigue abierto', s[0].hasta || '', '');
eq('★ no deja hito: no hubo ningún cambio', aetHito().length, 0);

console.log('\n3 · 🔴 Un cambio cierra el tramo y abre otro, con su hito');
guardar('2026-08-09-Dia', { AET_ACTIVA: true, AET_NIVEL: 'IIIB' });
s = serie();
eq('★★ ahora son DOS tramos', s.length, 2);
eq('★★ el primero se cerró', !!s[0].hasta, 'true');
eq('★★ el segundo es el grupo IIIB', s[1].g, 'IIIB');
eq('★★ …abierto', s[1].hasta || '', '');
eq('★★ …con el turno en que se registró', s[1].tk, '2026-08-09-Dia');
eq('★★ …y quién lo registró', s[1].f, 'K.P.');
eq('★★ deja UN hito en el historial', aetHito().length, 1);
si('★★ …que dice de qué grupo a cuál', /I.*IIIB|IIIB/.test((aetHito()[0] || {}).texto || ''));

console.log('\n4 · 🔴 CONFIRMAR NO ES CAMBIAR');
HITOS = [];
guardar('2026-08-10-Dia', { AET_ACTIVA: true, AET_NIVEL: 'IIIB' });
guardar('2026-08-10-Noche', { AET_ACTIVA: true, AET_NIVEL: 'IIIB' });
eq('★★ guardar dos turnos más con el mismo grupo NO abre tramos', serie().length, 2);
eq('★★ …ni deja hitos', aetHito().length, 0);

console.log('\n5 · Corregir en el MISMO turno no abre un tercer tramo');
guardar('2026-08-11-Dia', { AET_ACTIVA: true, AET_NIVEL: 'IIIC' });
eq('★ el 11 abrió el tercero (IIIC)', serie().length, 3);
guardar('2026-08-11-Dia', { AET_ACTIVA: true, AET_NIVEL: 'IIIA' });
s = serie();
eq('★★ re-guardar el mismo turno con otro grupo REEMPLAZA, no agrega', s.length, 3);
eq('★★ …y el tramo de ese turno es el nuevo', s[2].g, 'IIIA');
guardar('2026-08-11-Dia', { AET_ACTIVA: true, AET_NIVEL: 'IIIB' });
s = serie();
eq('★★ volver al grupo anterior en el mismo turno borra el tramo propio', s.length, 2);
eq('★★ …y REABRE el anterior', s[1].hasta || '', '');
eq('★★ …que sigue siendo IIIB', s[1].g, 'IIIB');

console.log('\n6 · Retirar la AET vuelve al grupo I');
guardar('2026-08-12-Dia', { AET_ACTIVA: false, AET_NIVEL: '' });
s = serie();
eq('★★ el tramo vigente es el grupo I otra vez', s[s.length - 1].g, 'I');

console.log('\n7 · Un episodio VIEJO (con AET y sin serie) no se queda sin tramo');
reset();
Object.assign(DB.CAMAS_ESTADO[0], { AET_ACTIVA: 'TRUE', AET_NIVEL: 'II', AET_FECHA: '2026-08-08' });
guardar('2026-08-12-Dia', { AET_ACTIVA: true, AET_NIVEL: 'II' });
s = serie();
eq('★★ se abre un tramo con el grupo que ya tenía', s.length >= 1 && s[s.length - 1].g, 'II');

/* ══ PARTE 2 · La pantalla ═══════════════════════════════════════════════ */
(async () => {
  console.log('\n── PARTE 2 · La pantalla ──');
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 1500 }, locale: 'es-CL' });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    const FIJA = new Date(2026, 7, 12, 10, 0, 0).getTime(), RD = Date;
    function FD(...a) { if (!new.target) return new RD(FIJA).toString(); return a.length ? new RD(...a) : new RD(FIJA); }
    FD.prototype = RD.prototype; FD.now = () => FIJA; FD.UTC = RD.UTC; FD.parse = RD.parse; window.Date = FD;
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
  const abrir = (esIng, cama, evo) => p.evaluate(async x => {
    window.__evo = x.evo; $('kf').reset(); $('gDate').value = '2026-08-12'; SHIFT = 'Dia';
    window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
    DB = x.esIng ? [{ ID_CAMA: '5', OCUPADA: false }]
                 : [Object.assign({ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM', FECHA_INGRESO: '2026-08-05', TS_INGRESO: '2026-08-05 23:00:00' }, x.cama || {})];
    window.recargarSilencioso = () => {};
    renderGrid(); abrirPanel(x.esIng ? '5' : '3', x.esIng, false);
    await new Promise(r => setTimeout(r, 800));
    window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
    pasoIr(x.esIng ? 0 : 2);      // la AET vive en el paso 0 (ingreso) o en el 2 (turno)
  }, { esIng, cama, evo: evo || null });
  const vis = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && !!(r.width || r.height); }, sel);
  const est = () => p.evaluate(() => ({ act: !!$('cAET').checked, niv: v('fAETnivel') }));
  const pres = (c, g) => p.evaluate(a => document.querySelector(a.c + ' [data-g="' + a.g + '"]')?.getAttribute('aria-pressed'), { c, g });
  const ROT = c => p.evaluate(x => Array.from(document.querySelectorAll(x + ' [data-g]')).map(e => e.textContent.trim()).join(' | '), c);

  console.log('\n8 · 🔴 En el ingreso: cinco grupos, y el 1 por defecto');
  await abrir(true);
  si('★★ el bloque de AET se ve en el ingreso (paso 0)', await vis('#aetIng'));
  eq('★★ los cinco grupos con sus nombres', await ROT('#aetIng'), '1 · Soporte total | 2 | 3A | 3B | 3C');
  eq('★★ el grupo 1 viene marcado (todo paciente parte con soporte total)', await pres('#aetIng', 'I'), 'true');
  eq('★ …y la AET sigue desactivada', (await est()).act, 'false');
  await p.click('#aetIng [data-g="IIIB"]'); await p.waitForTimeout(100);
  let e = await est();
  eq('★★ elegir 3B activa la AET', e.act, 'true');
  eq('★★ …con el nivel de siempre (IIIB)', e.niv, 'IIIB');
  eq('★ el botón queda marcado', await pres('#aetIng', 'IIIB'), 'true');
  eq('★ y suelta el 1', await pres('#aetIng', 'I'), 'false');
  await p.click('#aetIng [data-g="IIIC"]'); await p.waitForTimeout(100);
  si('★★ 3C sigue suspendiendo la KTM', await p.evaluate(() => $('bKTMr').disabled));
  await p.click('#aetIng [data-g="I"]'); await p.waitForTimeout(100);
  eq('★★ volver al 1 desactiva la AET', (await est()).act, 'false');
  no('★ …y la KTM se libera', await p.evaluate(() => $('bKTMr').disabled));

  console.log('\n9 · 🔴 En el turno: el grupo vigente, y se cambia SOLO con «La cambiaron»');
  await abrir(false);
  no('★★ pasado el ingreso, el bloque de ingreso no está', await vis('#aetIng'));
  si('★★ en el turno hay una tarjeta de adecuación', await vis('#aetTurno'));
  si('★★ dice cuál es el vigente', await p.evaluate(() => /Grupo 1|Soporte total/.test($('aetTurno').textContent)));
  no('★★ 🔴 los cinco botones NO están a la vista (un toque sin querer no cambia nada)', await vis('#aetTurno [data-g]'));
  si('★★ hay un botón «La cambiaron»', await vis('#btnAetCambio'));
  await p.click('#btnAetCambio'); await p.waitForTimeout(100);
  si('★★ al apretarlo aparecen los cinco', await vis('#aetTurno [data-g="IIIA"]'));
  await p.click('#aetTurno [data-g="IIIA"]'); await p.waitForTimeout(100);
  e = await est();
  eq('★★ elegir 3A activa la AET en el turno', e.act + '/' + e.niv, 'true/IIIA');
  si('★★ y avisa que es un cambio y de qué a qué', await p.evaluate(() => /cambia|de .*a/i.test($('aetTurno').textContent) && /3A/.test($('aetTurno').textContent)));
  await p.click('#btnAetDejar'); await p.waitForTimeout(100);
  e = await est();
  eq('★★ «Dejar igual» vuelve al estado con que se abrió', e.act + '/' + e.niv, 'false/');

  console.log('\n10 · Reabrir un turno guardado');
  await abrir(false, { AET_ACTIVA: 'TRUE', AET_NIVEL: 'IIIB', AET_SERIE: JSON.stringify([
      { g: 'I', desde: '2026-08-05 23:00:00', hasta: '2026-08-09 11:20:00', tk: '2026-08-05-Noche', f: 'K.P.' },
      { g: 'IIIB', desde: '2026-08-09 11:20:00', hasta: '', tk: '2026-08-09-Dia', f: 'M.V.' }]) });
  e = await est();
  eq('★★ la cama dice 3B y la pantalla lo muestra', e.act + '/' + e.niv, 'true/IIIB');
  si('★★ la tarjeta dice 3B', await p.evaluate(() => /3B/.test($('aetTurno').textContent)));
  si('★★ …desde cuándo y quién lo registró', await p.evaluate(() => /09-08/.test($('aetTurno').textContent) && /M\.V\./.test($('aetTurno').textContent)));

  console.log('\n11 · El relato');
  const t = await p.evaluate(() => genTexto());
  si('★ el relato dice que tiene AET y el grupo', /AET/.test(t) && /IIIB/.test(t));

  console.log('\n10b · Reabrir el turno QUE HIZO el cambio');
  await abrir(false, { AET_ACTIVA: 'TRUE', AET_NIVEL: 'IIIA', AET_SERIE: JSON.stringify([
      { g: 'I', desde: '2026-08-05 23:00:00', hasta: '2026-08-12 15:00', tk: '2026-08-05-Noche', f: 'K.P.' },
      { g: 'IIIA', desde: '2026-08-12 15:00', hasta: '', tk: '2026-08-12-Dia', f: 'K.P.' }]) });
  si('★★ dice que el cambio fue en ESTE turno, de qué a qué', await p.evaluate(() => /Cambió en este turno/.test($('aetTurno').textContent) && /grupo 1 a grupo 3A/.test($('aetTurno').textContent)));
  await p.click('#btnAetCambio'); await p.click('#btnAetDejar'); await p.waitForTimeout(100);
  e = await est();
  eq('★★ «Dejar igual» deshace el cambio de este turno (vuelve al grupo anterior)', e.act + '/' + e.niv, 'false/');

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ aet_serie: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
