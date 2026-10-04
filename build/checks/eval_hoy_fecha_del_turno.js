// eval_hoy_fecha_del_turno.js — Al reabrir un turno guardado, sus evaluaciones
// se reponen según la FECHA DEL TURNO, no según el reloj (4-oct-2026).
//
// EL DEFECTO (docs/PENDIENTES.md, sección 4): `fillForm()` decide si repone las
// evaluaciones comparando `EVAL_FECHA` con `new Date().toISOString().slice(0,10)`,
// y `toISOString()` es UTC. Chile va 3 o 4 horas atrás: pasadas las 21 h, para
// esa línea «hoy» ya es MAÑANA. Un colega que reabre su turno de DÍA del 4-oct a
// las 21:30 veía el turno vacío de evaluaciones —MRC, FSS, PIM, BDT, todo—
// aunque la planilla las tuviera. Y al guardar de nuevo, la pantalla mandaba
// esos campos en blanco.
//
// 🪤 POR QUÉ NADIE LO VIO: el servidor de pruebas y el equipo de desarrollo
// corren en UTC, donde `hoy()` y `toISOString()` dicen LO MISMO. El defecto solo
// existe en un huso horario con diferencia, así que la guardia fija
// `America/Santiago` en la página y deja el reloj en una hora donde UTC y Chile
// caen en días distintos. Con el huso suelto, la guardia saldría verde sobre el
// código roto, que es la peor guardia posible.
//
// 🔴 LA FECHA DE REFERENCIA ES LA DEL TURNO (`gDate`), la misma con que
// `guardar()` fecha `EVAL_FECHA`: lo que se guardó con la fecha del turno se
// compara con la fecha del turno. Compararla con la fecha LOCAL del reloj
// tampoco sirve: un turno de NOCHE del 4-oct reabierto a las 02:00 del 5-oct
// seguiría fallando (caso B).
//
// 🪤 EL RELOJ VA CONGELADO y la fecha se INVENTA (patrón de fiestas_patrias.js).
// El reloj se mueve entre casos con `window.__FIJA`.
//
// Uso: node build/checks/eval_hoy_fecha_del_turno.js
const path = require('path');
const { chromium } = require('playwright-core');
const v2 = path.join(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

// Instantes inventados. Chile en octubre va en UTC-3 (horario de verano desde el 6-sep-2026).
const T_NOCHE_21_30   = Date.UTC(2026, 9, 5, 0, 30, 0);   // 4-oct 21:30 en Chile · UTC ya dice 5-oct
const T_MADRUGADA_02  = Date.UTC(2026, 9, 5, 5, 0, 0);    // 5-oct 02:00 en Chile · UTC y Chile dicen 5-oct
const T_MEDIODIA      = Date.UTC(2026, 9, 4, 15, 0, 0);   // 4-oct 12:00 en Chile · UTC y Chile dicen 4-oct

// Un turno guardado con evaluaciones de ese turno (todo ficticio).
const evo = (turnoKey, fechaEval) => ({
  ID_CAMA: '4', TURNO_KEY: turnoKey, PATIENT_ID: 'p4', PAC_NOMBRE: 'Paciente de prueba',
  VENT_VIA_AEREA: 'TQT', VENT_SOPORTE: 'Oxigenoterapia/OAF', PLAN_FIRMA_KINE: 'K.P.',
  EVAL_FECHA: fechaEval, EVAL_T_REALIZAR: true,
  EVAL_T_PIM: '65', EVAL_T_PEM: '80', EVAL_T_FEM: '4.2', EVAL_T_DINAMO: '25',
  EVAL_MRC_D1: '4', EVAL_MRC_D2: '4', EVAL_MRC_D3: '4', EVAL_MRC_D4: '4', EVAL_MRC_D5: '4', EVAL_MRC_D6: '4',
  EVAL_MRC_I1: '4', EVAL_MRC_I2: '4', EVAL_MRC_I3: '4', EVAL_MRC_I4: '4', EVAL_MRC_I5: '4', EVAL_MRC_I6: '4',
  EVAL_FSS_IT1: '6', EVAL_FSS_IT2: '6', EVAL_FSS_IT3: '6', EVAL_FSS_IT4: '6', EVAL_FSS_IT5: '6',
});

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  // 🔴 El huso va fijo: sin él la guardia depende de la máquina donde corra.
  const p = await b.newPage({ viewport: { width: 1400, height: 1400 }, locale: 'es-CL', timezoneId: 'America/Santiago' });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(t0 => {
    window.__FIJA = t0; const RD = Date;
    function FD(...a) { if (!new.target) return new RD(window.__FIJA).toString(); return a.length ? new RD(...a) : new RD(window.__FIJA); }
    FD.prototype = RD.prototype; FD.now = () => window.__FIJA; FD.UTC = RD.UTC; FD.parse = RD.parse;
    window.Date = FD;
  }, T_NOCHE_21_30);
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

  // Reabre el turno (fecha, turno) con la evolución guardada `e`, con el reloj en `t`.
  const reabrir = async (t, fechaTurno, turno, e) => {
    await p.evaluate(([t, f, s, x]) => {
      window.__FIJA = t; window.__evo = x;
      DB = [{ ID_CAMA: '4', OCUPADA: true, PATIENT_ID: 'p4', NOMBRE: 'P', EDAD: 61, SEXO: 'M',
              VIA_AEREA: 'TQT', SOPORTE: 'Oxigenoterapia/OAF', FECHA_INGRESO: '2026-10-01' }];
      window.recargarSilencioso = () => {};
      $('gDate').value = f; SHIFT = s;
      renderGrid(); abrirPanel('4', false, false);
    }, [t, fechaTurno, turno, e]);
    await p.waitForTimeout(800);
    return p.evaluate(() => ({
      marcada: !!$('cEgr')?.checked,
      visible: !$('dEgr')?.classList.contains('hidden'),
      pim: $('fPIM')?.value || '', pem: $('fPEM')?.value || '', fem: $('fFEM')?.value || '',
      dinamo: $('fPrension')?.value || '', mrc: $('fMRC')?.value || '', fss: $('fFSS')?.value || '',
    }));
  };
  const repuesto = (cual, s) => {
    si(cual + ' · ★★ queda marcado «se evaluó este turno»', s.marcada);
    si(cual + ' · ★★ …y el cajón de evaluaciones se muestra', s.visible);
    eq(cual + ' · ★★ PIM / PEM / FEM vuelven', [s.pim, s.pem, s.fem].join(' / '), '65 / 80 / 4.2');
    eq(cual + ' · ★★ la dinamometría vuelve', s.dinamo, '25');
    eq(cual + ' · ★★ el MRC vuelve (suma de sus 12 ítems)', s.mrc, '48');
    eq(cual + ' · ★★ el FSS vuelve (suma de sus 5 ítems)', s.fss, '30');
  };

  console.log('\n0 · El escenario es el que rompe: en Chile es 4-oct, en UTC ya es 5-oct');
  const rel = await p.evaluate(t => { window.__FIJA = t; return {
    local: hoy(), utc: new Date().toISOString().slice(0, 10) }; }, T_NOCHE_21_30);
  eq('★ la fecha de Chile a las 21:30 (hoy())', rel.local, '2026-10-04');
  eq('★ …y la de UTC en ese mismo instante', rel.utc, '2026-10-05');

  console.log('\nA · 🔴 Turno de DÍA del 4-oct reabierto a las 21:30 (UTC ya es el 5)');
  repuesto('A', await reabrir(T_NOCHE_21_30, '2026-10-04', 'Dia', evo('2026-10-04-Dia', '2026-10-04')));

  console.log('\nB · 🔴 Turno de NOCHE del 4-oct reabierto a las 02:00 del 5-oct');
  repuesto('B', await reabrir(T_MADRUGADA_02, '2026-10-04', 'Noche', evo('2026-10-04-Noche', '2026-10-04')));

  console.log('\nC · Control: un día cualquiera, a mediodía, sigue igual');
  repuesto('C', await reabrir(T_MEDIODIA, '2026-10-04', 'Dia', evo('2026-10-04-Dia', '2026-10-04')));

  console.log('\nD · Control: lo fechado en OTRO día no se repone (el turno no hereda evaluaciones)');
  const d = await reabrir(T_NOCHE_21_30, '2026-10-04', 'Dia', evo('2026-10-04-Dia', '2026-10-03'));
  no('★★ con EVAL_FECHA del 3-oct no se marca «se evaluó este turno»', d.marcada);
  eq('★★ …no vuelve el PIM', d.pim, '');
  eq('★★ …ni el MRC', d.mrc, '');

  console.log('\nE · 🔴 Lo fechado con el día de UTC («mañana» para Chile) tampoco es de este turno');
  // Es el espejo del caso A: el código roto daba por buena justo esta fecha.
  const e5 = await reabrir(T_NOCHE_21_30, '2026-10-04', 'Dia', evo('2026-10-04-Dia', '2026-10-05'));
  no('★★ con EVAL_FECHA del 5-oct no se marca «se evaluó este turno» en el turno del 4-oct', e5.marcada);
  eq('★★ …no vuelve el MRC', e5.mrc, '');

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ eval_hoy_fecha_del_turno: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
