// arranque_un_viaje.js — 🔴 EL ARRANQUE HACE UN SOLO GET_BOOT, SEA LA HORA QUE
// SEA (15-sep-2026).
//
// DE DÓNDE SALE. `checks/rendimiento.js` ya exigía «un solo viaje de datos al
// arrancar», y pasaba. El 15-sep-2026 a las 19:39 empezó a fallar sin que
// nadie tocara el arranque: a las 10:00 daba verde y a las 19:39, rojo.
//
// La causa: `window.onload` llamaba a `_aftIniciar()` —el aviso de fin de
// turno— ANTES del arranque, y ese aviso armaba su lista con su PROPIO
// GET_BOOT. Pero solo dispara dentro de la ventana de aviso: los 30 minutos
// previos a la salida del turno (20:00 el día, 08:00 la noche). Fuera de esa
// ventana no pedía nada y el arranque parecía limpio. Dentro, salían DOS
// GET_BOOT idénticos con 1 ms de diferencia — el mismo viaje dos veces, en la
// hora de MÁS gente conectada, que es justo cuando cambia el turno.
//
// 🪤 LA TRAMPA DE FONDO, que es lo que esta guardia cierra: una guardia que
// lee el reloj REAL da distinto según la hora a la que se corra. Es la misma
// familia del `hoyISO` sombreado que ya costó una sesión. Acá el reloj del
// navegador se CONGELA dentro de la ventana de aviso: el caso peor se prueba
// siempre, no cuando toca.
//
// Uso: node build/checks/arranque_un_viaje.js
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

const INDEX = path.resolve(__dirname, '..', '..', 'v2', 'index.html');
// 19:45 — dentro de los 30 min previos a la salida del turno día (20:00).
const CONGELADO = new Date('2026-07-28T19:45:00').getTime();

(async () => {
  const fails = [];
  const si = (l, cond, detalle) => {
    console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined ? '' : ': ' + detalle));
    if (!cond) fails.push(l);
  };

  const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pagina = await navegador.newPage({ viewport: { width: 1200, height: 850 } });
  const errores = [];
  pagina.on('pageerror', e => errores.push(e.message));

  await pagina.addInitScript(({ congelado }) => {
    /* ── Reloj congelado dentro de la ventana de aviso ──────────────────── */
    const Real = Date;
    function Falso(...a) { return a.length ? new Real(...a) : new Real(congelado); }
    Falso.now = () => congelado;
    Falso.parse = Real.parse; Falso.UTC = Real.UTC;
    Falso.prototype = Real.prototype;
    window.Date = Falso;

    /* ── Servidor simulado que cuenta cada acción ───────────────────────── */
    window.__acciones = [];
    const CAMAS = [], EVOS = [];
    for (let i = 1; i <= 18; i++) CAMAS.push({ ID_CAMA: String(i), OCUPADA: i <= 12,
      NOMBRE: 'Paciente ' + i, EDAD: 60 + i, SEXO: i % 2 ? 'M' : 'F', DIAGNOSTICO: 'Dx ' + i,
      VIA_AEREA: i % 3 ? 'TOT' : 'Natural', SOPORTE: i % 3 ? 'VM' : 'CNAF', MODO: 'ACVC',
      PATIENT_ID: 'P' + i, COD_PACIENTE: 'C' + i,
      FECHA_INGRESO: '2026-07-25', FECHA_INICIO_SOPORTE: '2026-07-25', FECHA_INICIO_VA: '2026-07-25' });
    const BOOT = { ahora: '2026-07-28 19:45:00', yo: { email: '', firma: 'DEV', dev: true },
      config: { NUM_CAMAS: 18, BANNERS: {} }, fases: ['Weaning'], camas: CAMAS, evos: EVOS,
      asignacion: { team: [], assign: {} } };
    const RESP = { GET_BOOT: BOOT, GET_ARCHIVADOS: [], GET_CONFIG_UI: { NUM_CAMAS: 18, BANNERS: {} },
      GET_TODAS_CAMAS: CAMAS, GET_CATALOGO: ['Weaning'], GET_EVOS_DEL_DIA: EVOS,
      GET_ASIGNACION_TURNO: { team: [], assign: {} } };
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
      api(a) { window.__acciones.push(a);
        setTimeout(() => ok({ ok: true, data: RESP[a] !== undefined ? RESP[a] : null }), 5); }
    }; } }; } } } };
  }, { congelado: CONGELADO });

  await pagina.goto('file://' + INDEX);
  await pagina.waitForTimeout(1800);
  const acciones = await pagina.evaluate(() => window.__acciones.slice());
  const boots = acciones.filter(a => a === 'GET_BOOT').length;

  si('el reloj congelado cae DENTRO de la ventana de aviso (si no, la guardia no prueba nada)',
    await pagina.evaluate(() => {
      try { return _aftMinutosParaSalida(new Date(), 'Dia', _aftCfg()) <= _aftCfg().min; } catch (e) { return false; }
    }), 'el aviso de fin de turno no se dispararía a esta hora');
  si('un solo GET_BOOT al arrancar, también en la ventana de aviso', boots === 1, boots + ' — ' + acciones.join(', '));
  si('el aviso de fin de turno igual se armó (no se apagó para pasar la guardia)',
    await pagina.evaluate(() => !!document.getElementById('aftOvl')?.classList.contains('on')),
    'el modal de fin de turno no apareció');
  si('sin errores de JavaScript', errores.length === 0, errores.join(' | '));

  await navegador.close();
  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLOS' : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
