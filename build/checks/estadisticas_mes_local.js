// estadisticas_mes_local.js — El mes que Estadísticas sugiere al entrar es el
// del CALENDARIO DE CHILE, no el de UTC (4-oct-2026).
//
// EL DEFECTO (revisión adversarial de la vuelta de ceros / fecha UTC, hallazgo
// menor). Al abrir la pestaña Estadísticas, `setTab('D')` rellena el mes de
// referencia de los indicadores (`indMes`) y el del REM (`remMes`) con
// `new Date().toISOString().slice(0,7)`. `toISOString()` es UTC y Chile va 3 o
// 4 horas atrás: el ÚLTIMO DÍA de cada mes, pasadas las 20-21 h, el campo
// sugería el mes SIGUIENTE. Con el REM, que se cierra por mes, sugerir
// noviembre el 31 de octubre a las 21:30 es sugerir una planilla que todavía no
// existe. Es el mismo defecto de `fillForm` (eval_hoy_fecha_del_turno.js), en
// otra línea: esa se corrigió y ésta quedó.
//
// 🪤 POR QUÉ NADIE LO VIO: el equipo de desarrollo y el servidor de pruebas
// corren en UTC, donde `hoy()` y `toISOString()` dicen LO MISMO. Solo se ve en
// un huso con diferencia y en la franja de la noche del último día del mes. La
// guardia fija `America/Santiago` en la página, congela el reloj y lo pone en
// esa franja; con el huso suelto saldría verde sobre el código roto, que es la
// peor guardia posible.
//
// 🔴 LA FUENTE DE «HOY» ES `hoy()` (fecha local del aparato, la misma que usan
// el selector de fecha del turno y los botones «Mes actual» / «Mes anterior»
// de esta misma pestaña: `dashPreset`). La pantalla no puede decir dos meses
// distintos a la vez.
//
// 🪤 EL RELOJ VA CONGELADO y la fecha se INVENTA (patrón de fiestas_patrias.js
// y eval_hoy_fecha_del_turno.js): `window.__FIJA` se mueve entre casos. Chile en
// octubre-diciembre va en UTC-3 (horario de verano desde el 6-sep-2026).
//
// QUÉ EXIGE
//   1. El escenario es el que rompe: a las 21:30 del 31-oct, Chile dice
//      octubre y UTC ya dice noviembre.
//   2. 🔴 Casos A, B, E: noche del último día del mes (y del año) → el mes
//      sugerido es el MISMO mes, en `indMes` y en `remMes`.
//   3. Controles: pasada la medianoche local el mes SÍ cambia (C); un día
//      cualquiera no cambia nada (D); lo que la persona ya eligió no se pisa.
//   4. De punta a punta: con ese mes por defecto, «Mes» y «12 meses» piden al
//      servidor el rango correcto. Son las líneas vecinas (`new Date(a, mm, 0)`
//      y `toISOString()`): en Chile quedan bien porque la medianoche local es
//      03:00-04:00 UTC del mismo día; la guardia lo deja medido, no supuesto.
//
// Uso: node build/checks/estadisticas_mes_local.js
const path = require('path');
const { chromium } = require('playwright-core');
const v2 = path.join(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };

// Instantes inventados (UTC-3 en Chile para estas fechas).
const T_31OCT_21_30 = Date.UTC(2026, 10, 1, 0, 30, 0);    // 31-oct 21:30 Chile · UTC ya dice 1-nov
const T_31OCT_23_59 = Date.UTC(2026, 10, 1, 2, 59, 0);    // 31-oct 23:59 Chile · UTC dice 1-nov
const T_1NOV_00_00  = Date.UTC(2026, 10, 1, 3, 0, 0);     // 1-nov 00:00 Chile  · ya es noviembre en los dos
const T_15OCT_12_00 = Date.UTC(2026, 9, 15, 15, 0, 0);    // 15-oct 12:00 Chile · UTC y Chile dicen octubre
const T_31DIC_21_30 = Date.UTC(2027, 0, 1, 0, 30, 0);     // 31-dic-2026 21:30 Chile · UTC ya dice 2027

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
  }, T_31OCT_21_30);
  await p.addInitScript(() => {
    window._ll = [];
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
      api(a, d) { window._ll.push({ a, d });
        // GET_INDICADORES no contesta: lo que se mide es el PEDIDO, no el dibujo del tablero.
        if (a === 'GET_INDICADORES') return;
        const data = a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null;
        setTimeout(() => ok({ ok: true, data }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.join(v2, 'index.html'));
  await p.waitForTimeout(800);

  // Entra a Estadísticas con el reloj en `t` y los campos de mes como se indique.
  // `_statsLoaded` e `_indAuto` van puestos: aíslan el mes por defecto de los
  // viajes automáticos (mismo recurso que eventos_ui.js).
  const entrar = (t, previo) => p.evaluate(([t, previo]) => {
    window.__FIJA = t; window._statsLoaded = true; window._indAuto = true; window._ll.length = 0;
    $('indMes').value = (previo && previo.ind) || ''; $('remMes').value = (previo && previo.rem) || '';
    setTab('G'); setTab('D');
    return { ind: $('indMes').value, rem: $('remMes').value };
  }, [t, previo || null]);

  console.log('\n0 · El escenario es el que rompe: a las 21:30 del 31-oct, Chile es octubre y UTC ya es noviembre');
  const rel = await p.evaluate(t => { window.__FIJA = t; return {
    local: hoy(), utc: new Date().toISOString().slice(0, 10) }; }, T_31OCT_21_30);
  eq('★ la fecha de Chile a las 21:30 (hoy())', rel.local, '2026-10-31');
  eq('★ …y la de UTC en ese mismo instante', rel.utc, '2026-11-01');

  console.log('\nA · 🔴 Noche del 31-oct (21:30): el mes sugerido sigue siendo octubre');
  const a = await entrar(T_31OCT_21_30);
  eq('★★ indicadores: octubre, no noviembre', a.ind, '2026-10');
  eq('★★ REM: octubre, no noviembre', a.rem, '2026-10');

  console.log('\nB · 🔴 Último minuto del 31-oct (23:59)');
  const bb = await entrar(T_31OCT_23_59);
  eq('★★ indicadores: octubre', bb.ind, '2026-10');
  eq('★★ REM: octubre', bb.rem, '2026-10');

  console.log('\nE · 🔴 Noche del 31-dic: el mes sugerido es diciembre del 2026, no enero del 2027');
  const e = await entrar(T_31DIC_21_30);
  eq('★★ indicadores: 2026-12', e.ind, '2026-12');
  eq('★★ REM: 2026-12', e.rem, '2026-12');

  console.log('\nC · Control: a la medianoche de Chile el mes SÍ cambia');
  const c = await entrar(T_1NOV_00_00);
  eq('★★ indicadores: noviembre', c.ind, '2026-11');
  eq('★★ REM: noviembre', c.rem, '2026-11');

  console.log('\nD · Control: un día cualquiera, a mediodía, sigue igual');
  const d = await entrar(T_15OCT_12_00);
  eq('★★ indicadores: octubre', d.ind, '2026-10');
  eq('★★ REM: octubre', d.rem, '2026-10');

  console.log('\nF · Control: lo que la persona ya eligió no se pisa');
  const f = await entrar(T_31OCT_21_30, { ind: '2026-03', rem: '2026-04' });
  eq('★★ indicadores sigue en el mes elegido (marzo)', f.ind, '2026-03');
  eq('★★ REM sigue en el mes elegido (abril)', f.rem, '2026-04');

  console.log('\nG · De punta a punta: con ese mes por defecto, el servidor recibe el rango correcto');
  await entrar(T_31OCT_21_30);
  const rangos = await p.evaluate(() => {
    const ult = () => { const x = window._ll.filter(y => y.a === 'GET_INDICADORES'); return x[x.length - 1] ? x[x.length - 1].d : null; };
    const r = {};
    indCalcular('mes');  r.mes = ult();
    indCalcular('anio'); r.anio = ult();
    indCalcular('12m');  r.doce = ult();
    return r;
  });
  eq('★★ «Mes»: del 1 al 31 de octubre', JSON.stringify(rangos.mes), JSON.stringify({ desde: '2026-10-01', hasta: '2026-10-31' }));
  eq('★★ «Año»: del 1-ene al 31-oct', JSON.stringify(rangos.anio), JSON.stringify({ desde: '2026-01-01', hasta: '2026-10-31' }));
  eq('★★ «12 meses»: desde el 1-nov-2025 hasta el 31-oct-2026', JSON.stringify(rangos.doce), JSON.stringify({ desde: '2025-11-01', hasta: '2026-10-31' }));

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ estadisticas_mes_local: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
