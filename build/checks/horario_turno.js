// horario_turno.js — El cambio de turno de la app es a las 08:00 y a las 20:00,
// que es cuando cambia el equipo (Diego, 2-oct-2026: «corregir horario»).
//
// EL PROBLEMA. La app cambiaba a Noche a las 21:00 y a Día a las 09:00, pero el
// equipo cambia a las 20:00 y a las 08:00. Entre las 20 y las 21 (y entre las 8 y
// las 9) la app seguía en el turno anterior: el kinesiólogo de noche abría la
// pantalla y veía las evaluaciones completas del turno de día. Diego lo notó
// probando «de noche».
//
// 🔴 ESTA ES LA HORA DE GRACIA QUE SE PIERDE, a propósito y con su visto bueno: el
// código tenía el 9/21 como ventana para escribir atrasado. Elegido el 2-oct
// (opción «cambiar a 08:00 y 20:00»): quien termina de escribir a las 20:15 verá
// el turno Noche y lo pasa a Día con el botón del turno.
//
// 🪤 LAS FILAS DE CONFIG QUE YA EXISTEN no se enteran de un cambio de default: una
// planilla armada con 9/21 seguiría con 9/21 aunque el código diga 8/20. Por eso
// crearORepararEstructura() corrige UNA SOLA VEZ las dos filas, y solo si todavía
// tienen los valores viejos (9 y 21). Un horario que alguien puso a propósito
// (por ejemplo 10 y 22) no se toca, y como queda una marca, tampoco se vuelve a
// pisar si alguien decide volver al 9/21 más adelante.
//
// 🪤 La HORA DE SALIDA del equipo (SALIDA_TURNO_*) sigue siendo otra cosa: es de
// cuándo avisa el cierre del turno, y no se deriva de ésta.
//
// 🪤 Reloj congelado: aquí la hora se PASA como dato, no se espera.
//
// Uso: node build/checks/horario_turno.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const v2 = path.join(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');

/* ══ PARTE 1 · Servidor ═══════════════════════════════════════════════════ */
console.log('\n── PARTE 1 · El servidor ──');
let CONFIG = {};
global.leerConfig = (k, d) => (CONFIG[k] !== undefined ? CONFIG[k] : d);
global.ahoraTS = () => '2026-08-12 10:00:00'; global.hoyISO = () => '2026-08-12';
global.esVerdadero = x => x === true || x === 'TRUE' || x === 'true';
global.ok = d => d; global.err = m => m;
global._tz = () => 'America/Santiago';
global.Utilities = { formatDate: (d, tz, f) => { const z = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); } };   // solo 'yyyy-MM-dd', que es lo que usa _restarDias
global.catMatrices = () => ({}); global.vmPorHoras = () => true;   // solo para que _configUI() corra: no se miden aquí
eval(['infra_fechas.gs', 'esquema.gs', 'api.gs'].map(f => fs.readFileSync(path.join(v2, f), 'utf8')).join('\n;\n'));
// 🪤 esquema.gs trae su PROPIO leerConfig (el que lee la planilla) y pisa el de arriba: se vuelve a
// asignar DESPUÉS del eval, sobre el mismo nombre, para que todas las funciones usen el de la guardia.
leerConfig = (k, d) => (CONFIG[k] !== undefined ? CONFIG[k] : d);
_tz = () => 'America/Santiago';   // ídem: esquema.gs también trae su _tz

console.log('\n1 · 🔴 Sin nada en CONFIG, el turno cambia a las 08:00 y a las 20:00');
const lg = (f, h) => { const t = turnoLogicoServidor(f, h); return t.turno + ' ' + t.fecha; };
eq('07:59 sigue siendo la NOCHE del día anterior', lg('2026-08-12', '07:59'), 'Noche 2026-08-11');
eq('08:00 ya es el turno de DÍA', lg('2026-08-12', '08:00'), 'Dia 2026-08-12');
eq('19:59 todavía es DÍA', lg('2026-08-12', '19:59'), 'Dia 2026-08-12');
eq('★★ 20:00 ya es NOCHE (antes seguía siendo Día hasta las 21)', lg('2026-08-12', '20:00'), 'Noche 2026-08-12');
eq('★★ 20:30, también', lg('2026-08-12', '20:30'), 'Noche 2026-08-12');
eq('23:30 es noche del mismo día', lg('2026-08-12', '23:30'), 'Noche 2026-08-12');
eq('03:00 es la noche del día anterior', lg('2026-08-12', '03:00'), 'Noche 2026-08-11');
eq('★ el turno Día «parte» a las 08:00', _tsInicioTurno('2026-08-12', 'Dia'), '2026-08-12 08:00');
eq('★ el turno Noche «parte» a las 20:00', _tsInicioTurno('2026-08-12', 'Noche'), '2026-08-12 20:00');
const cfgUI = _configUI();
eq('★★ la pantalla recibe 08 y 20 cuando CONFIG no dice nada', cfgUI.TURNO_DIA_INICIO + '/' + cfgUI.TURNO_NOCHE_INICIO, '8/20');
eq('★ y la hora de salida del equipo sigue aparte (20:00 y 08:00)', cfgUI.SALIDA_TURNO_DIA + '/' + cfgUI.SALIDA_TURNO_NOCHE, '20:00/08:00');

console.log('\n2 · Lo que alguien puso a propósito en CONFIG se respeta');
CONFIG = { TURNO_DIA_INICIO: '10', TURNO_NOCHE_INICIO: '22' };
eq('con 10 y 22 escritos, 21:30 es DÍA', lg('2026-08-12', '21:30'), 'Dia 2026-08-12');
eq('…y 09:30 es noche', lg('2026-08-12', '09:30'), 'Noche 2026-08-11');
CONFIG = {};

console.log('\n3 · 🔴 Una planilla nueva nace con 8 y 20');
const sembradas = {};
const hojaCfg = (() => { const filas = [['CLAVE', 'VALOR']];
  return { filas, getLastRow: () => filas.length, appendRow: r => { filas.push(r.slice()); sembradas[r[0]] = r[1]; },
    getRange: (f, c, n, m) => ({ getValues: () => filas.slice(f - 1, f - 1 + (n || 1)).map(r => r.slice(c - 1, c - 1 + (m || 1))),
      setValue: x => { filas[f - 1][c - 1] = x; } }) }; })();
const noop = new Proxy(function () {}, { get: (t, k) => (k === 'getLastRow' ? () => 0 : k === 'getValues' ? () => [] : noop), apply: () => noop });
const ssFalso = { getSheetByName: n => (n === 'CONFIG' ? hojaCfg : noop) };
let sembroOk = true;
try { _sembrar(ssFalso); } catch (e) { sembroOk = false; console.log('   (sembrar falló: ' + e.message + ')'); }
si('el sembrado corre sobre una planilla vacía', sembroOk);
eq('★★ TURNO_DIA_INICIO nace en 8', sembradas.TURNO_DIA_INICIO, '8');
eq('★★ TURNO_NOCHE_INICIO nace en 20', sembradas.TURNO_NOCHE_INICIO, '20');

console.log('\n4 · 🔴 Una planilla que YA tiene 9 y 21 se corrige UNA vez');
const hoja = (d, n, marca) => { const filas = [['CLAVE', 'VALOR'], ['NUM_CAMAS', '18']];
  if (d !== null) filas.push(['TURNO_DIA_INICIO', d]); if (n !== null) filas.push(['TURNO_NOCHE_INICIO', n]);
  if (marca !== undefined) filas.push(['HORARIO_TURNO_AJUSTADO', marca]);
  return { filas, getLastRow: () => filas.length, appendRow: r => filas.push(r.slice()),
    getRange: (f, c, n2, m) => ({ getValues: () => filas.slice(f - 1, f - 1 + (n2 || 1)).map(r => r.slice(c - 1, c - 1 + (m || 1))),
      setValue: x => { filas[f - 1][c - 1] = x; } }) }; };
const val = (h, k) => { const r = h.filas.find(x => x[0] === k); return r ? String(r[1]) : '(sin fila)'; };
let h = hoja('9', '21');
_migrarHorarioTurno(h);
eq('★★ con 9 y 21 pasa a 8…', val(h, 'TURNO_DIA_INICIO'), '8');
eq('★★ …y 20', val(h, 'TURNO_NOCHE_INICIO'), '20');
eq('★ deja la marca de que ya se corrigió', val(h, 'HORARIO_TURNO_AJUSTADO'), 'TRUE');
h = hoja(9, 21);
_migrarHorarioTurno(h);
eq('★ también si Sheets guardó los números como número', val(h, 'TURNO_DIA_INICIO') + '/' + val(h, 'TURNO_NOCHE_INICIO'), '8/20');
h = hoja('10', '22');
_migrarHorarioTurno(h);
eq('★★ un horario puesto a propósito (10 y 22) NO se toca', val(h, 'TURNO_DIA_INICIO') + '/' + val(h, 'TURNO_NOCHE_INICIO'), '10/22');
h = hoja('9', '22');
_migrarHorarioTurno(h);
eq('★ ni cuando solo UNA de las dos es la vieja', val(h, 'TURNO_DIA_INICIO') + '/' + val(h, 'TURNO_NOCHE_INICIO'), '9/22');
h = hoja('9', '21', 'TRUE');
_migrarHorarioTurno(h);
eq('★★ ya corregida una vez: si alguien vuelve a 9 y 21, NO se le pisa', val(h, 'TURNO_DIA_INICIO') + '/' + val(h, 'TURNO_NOCHE_INICIO'), '9/21');
h = hoja(null, null);
let corre = true; try { _migrarHorarioTurno(h); } catch (e) { corre = false; }
si('sin esas filas no revienta', corre);
h = hoja('9', '21');
_migrarHorarioTurno(h); _migrarHorarioTurno(h);
eq('★ correrla dos veces da lo mismo (idempotente)', val(h, 'TURNO_DIA_INICIO') + '/' + val(h, 'TURNO_NOCHE_INICIO'), '8/20');

/* ══ PARTE 2 · La pantalla ═══════════════════════════════════════════════ */
(async () => {
  console.log('\n── PARTE 2 · La pantalla ──');
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1200, height: 900 }, locale: 'es-CL' });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
      api(a) { setTimeout(() => ok({ ok: true, data: a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null }), 5); } }; } }; } } } };
  });
  await p.goto('file://' + path.join(v2, 'index.html'));
  await p.waitForTimeout(800);
  const t = (h, m, cfg) => p.evaluate(a => { window.CFG = a.cfg || {};
    const x = _turnoLogico(new Date(2026, 7, 12, a.h, a.m)); return x.turno + ' ' + x.fecha; }, { h, m, cfg });

  console.log('\n5 · 🔴 La pantalla cambia a las 08:00 y a las 20:00');
  eq('07:59 → noche del día anterior', await t(7, 59), 'Noche 2026-08-11');
  eq('08:00 → Día', await t(8, 0), 'Dia 2026-08-12');
  eq('19:59 → Día', await t(19, 59), 'Dia 2026-08-12');
  eq('★★ 20:00 → Noche', await t(20, 0), 'Noche 2026-08-12');
  eq('★★ 20:30 → Noche (aquí se veían las evaluaciones «de noche»)', await t(20, 30), 'Noche 2026-08-12');
  eq('00:30 → noche del día anterior', await t(0, 30), 'Noche 2026-08-11');
  eq('lo que mande CONFIG manda (10 y 22): 21:30 → Día', await t(21, 30, { TURNO_DIA_INICIO: 10, TURNO_NOCHE_INICIO: 22 }), 'Dia 2026-08-12');

  console.log('\n6 · El botón de cambiar de turno respeta el mismo corte');
  const tg = await p.evaluate(() => { window.CFG = {}; $('gDate').classList.add('turno-hoy'); SHIFT = 'Dia';
    // a las 03:00 pasar a «Noche» es la noche que empezó AYER
    const RD = Date; const FIJA = new RD(2026, 7, 12, 3, 0, 0).getTime();
    function FD(...a) { if (!new.target) return new RD(FIJA).toString(); return a.length ? new RD(...a) : new RD(FIJA); }
    FD.prototype = RD.prototype; FD.now = () => FIJA; FD.UTC = RD.UTC; FD.parse = RD.parse; window.Date = FD;
    toggleShift(); const r = SHIFT + ' ' + $('gDate').value; window.Date = RD; return r; });
  eq('★ a las 03:00, «Noche» es la que empezó el día anterior', tg, 'Noche 2026-08-11');

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ horario_turno: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
