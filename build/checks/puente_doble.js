// puente_doble.js — 🔌 LA MISMA PANTALLA HABLA POR LOS DOS CAMINOS
// (16-sep-2026).
//
// DE DÓNDE SALE. La app tiene que servir en dos sitios a la vez: dentro del
// iframe de Apps Script, como hasta hoy, y como app instalada desde un sitio
// propio, que es lo que pide el PRD de la PWA. Mantener dos pantallas sería
// mantener dos verdades. Entonces es UNA pantalla que detecta dónde está.
//
// 🪤 LA CABECERA ES LO CRÍTICO, Y ES LO QUE MÁS FÁCIL SE «ARREGLA» MAL. Un
// navegador, antes de mandar un POST a otro dominio con
// `Content-Type: application/json`, pregunta primero con una petición OPTIONS.
// **Apps Script no contesta OPTIONS**, así que la llamada muere sin llegar al
// servidor. Lo que se ve en la consola habla de CORS, lo que manda a buscar en
// el lugar equivocado; y como `application/json` es lo que uno escribiría sin
// pensar, este es el error que se va a cometer cada vez que alguien toque esta
// parte. Por eso la guardia lo fija: el cuerpo viaja como `text/plain`.
//
// QUÉ EXIGE
//   1. Dentro del iframe se usa `google.script.run` y NO se llama a fetch.
//   2. Fuera del iframe, sin dirección configurada, la app NO arranca: pide
//      la dirección. Arrancar sin servidor deja una pantalla muerta sin decir
//      por qué.
//   3. Con la dirección puesta, arranca y llama por fetch.
//   4. Que el POST vaya con `text/plain` (ver la trampa de arriba).
//   5. Que el token viaje en el cuerpo: es lo que sostiene la identidad.
//   6. Que la dirección quede guardada en el aparato, y NO en el repositorio.
//
// Uso: node build/checks/puente_doble.js
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const INDEX = path.resolve(__dirname, '..', '..', 'v2', 'index.html');
const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined ? '' : ' — ' + detalle));
  if (!cond) fails.push(l);
};

const CAMAS = [];
for (let i = 1; i <= 6; i++) CAMAS.push({ ID_CAMA: String(i), OCUPADA: i <= 4, NOMBRE: 'Paciente ' + i,
  EDAD: 60 + i, SEXO: 'F', DIAGNOSTICO: 'Dx', PATIENT_ID: 'p' + i, COD_PACIENTE: 'C' + i,
  VIA_AEREA: 'TOT', SOPORTE: 'VM', MODO: 'ACVC', FECHA_INGRESO: '2026-09-10',
  FECHA_INICIO_SOPORTE: '2026-09-10', FECHA_INICIO_VA: '2026-09-10' });
const BOOT = { ahora: '2026-09-16 11:00:00', yo: { email: '', firma: 'DMV', dev: false },
  config: { NUM_CAMAS: 6, BANNERS: {} }, fases: ['Weaning'], camas: CAMAS, evos: [],
  asignacion: { team: [], assign: {} } };

/* El servidor falso vive en la propia página: registra CADA fetch con su
   cabecera y su cuerpo, que es justo lo que hay que fijar. */
const PRELUDIO = ({ boot }) => {
  window.__fetches = [];
  window.__gasRunUsado = false;
  const RESP = { GET_BOOT: boot, GET_ARCHIVADOS: [], ACCESO_ESTADO: { activo: false, dentro: false } };
  window.fetch = function (url, opc) {
    const o = opc || {};
    let cuerpo = null;
    try { cuerpo = JSON.parse(o.body); } catch (e) { cuerpo = o.body; }
    window.__fetches.push({ url: String(url), metodo: o.method || 'GET',
      cabeceras: Object.assign({}, o.headers || {}), cuerpo: cuerpo });
    const a = cuerpo && cuerpo.accion;
    const data = RESP[a] !== undefined ? RESP[a] : null;
    return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ ok: true, data: data })) });
  };
};

(async () => {
  const compilado = path.join(__dirname, '..', '_puente.html');
  fs.writeFileSync(compilado, fs.readFileSync(INDEX, 'utf8').replace(/<\?=[\s\S]*?\?>/g, ''));
  const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });

  const visible = (p, id) => p.evaluate(i => {
    const n = document.getElementById(i); if (!n) return false;
    const r = n.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(n).display !== 'none';
  }, id);

  /* ══ 1 · Dentro del iframe de Apps Script ══════════════════════════════ */
  {
    const p = await navegador.newPage({ viewport: { width: 1280, height: 900 } });
    await p.addInitScript(PRELUDIO, { boot: BOOT });
    await p.addInitScript(({ boot }) => {
      window.google = { script: { run: { withSuccessHandler(o) { return { withFailureHandler() { return {
        api(a) { window.__gasRunUsado = true;
          const R = { GET_BOOT: boot, GET_ARCHIVADOS: [], ACCESO_ESTADO: { activo: false, dentro: false } };
          setTimeout(() => o({ ok: true, data: R[a] !== undefined ? R[a] : null }), 5); }
      }; } }; } } } };
    }, { boot: BOOT });
    await p.goto('file://' + compilado);
    await p.waitForTimeout(1600);
    si('dentro del iframe la app arranca y pinta el censo',
      (await p.evaluate(() => document.querySelectorAll('#bedGrid .bcard').length)) > 0);
    si('🔴 dentro del iframe se usa google.script.run', await p.evaluate(() => window.__gasRunUsado));
    si('🔴 …y NO se llama a fetch', (await p.evaluate(() => window.__fetches.length)) === 0,
      'llamó ' + (await p.evaluate(() => JSON.stringify(window.__fetches.map(f => f.url)))));
    await p.close();
  }

  /* ══ 2 · Fuera del iframe, sin dirección configurada ═══════════════════ */
  let pagina = await navegador.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  pagina.on('pageerror', e => errores.push(e.message));
  await pagina.addInitScript(PRELUDIO, { boot: BOOT });   // sin window.google
  await pagina.goto('file://' + compilado);
  await pagina.waitForTimeout(1600);

  si('🔴 sin dirección del servidor la app NO arranca',
    (await pagina.evaluate(() => document.querySelectorAll('#bedGrid .bcard').length)) === 0,
    'pintó el censo sin tener a quién preguntarle');
  si('…y pide la dirección en pantalla', await visible(pagina, 'cfgForm'),
    'no apareció el formulario de configuración: quedaría una pantalla muerta sin decir por qué');
  si('…sin haber intentado ningún fetch a ninguna parte',
    (await pagina.evaluate(() => window.__fetches.length)) === 0);

  /* ══ 3 · Se configura la dirección y arranca ═══════════════════════════ */
  await pagina.fill('#cfgUrl', 'https://script.google.com/macros/s/EJEMPLO-DE-PRUEBA/exec');
  await pagina.click('#cfgBtn');
  await pagina.waitForTimeout(2200);

  si('con la dirección puesta, la app arranca',
    (await pagina.evaluate(() => document.querySelectorAll('#bedGrid .bcard').length)) > 0,
    'el censo no se pintó');
  const F = await pagina.evaluate(() => window.__fetches.slice());
  si('…y habló por fetch', F.length > 0, '0 llamadas');
  const boot = F.find(f => f.cuerpo && f.cuerpo.accion === 'GET_BOOT');
  si('…pidiendo el arranque al servidor', !!boot, F.map(f => f.cuerpo && f.cuerpo.accion).join(', '));

  if (boot) {
    si('la llamada va a la dirección configurada', /EJEMPLO-DE-PRUEBA\/exec$/.test(boot.url), boot.url);
    si('…por POST', String(boot.metodo).toUpperCase() === 'POST', boot.metodo);
    const ct = Object.keys(boot.cabeceras).reduce((a, k) => (k.toLowerCase() === 'content-type' ? boot.cabeceras[k] : a), '');
    si('🔴 …con el cuerpo como TEXTO PLANO, no application/json',
      /text\/plain/i.test(ct),
      'va como «' + ct + '»: con application/json el navegador pregunta primero con OPTIONS, ' +
      'Apps Script no contesta OPTIONS y la llamada muere sin llegar nunca al servidor');
    si('…y el cuerpo lleva la acción, los datos y el token',
      boot.cuerpo && 'accion' in boot.cuerpo && 'datos' in boot.cuerpo && 'token' in boot.cuerpo,
      JSON.stringify(Object.keys(boot.cuerpo || {})));
  }

  /* ══ 4 · La dirección queda en el aparato, no en el repositorio ════════ */
  si('la dirección quedó guardada en este aparato',
    !!(await pagina.evaluate(() => { try { return localStorage.getItem('rce_exec_url'); } catch (e) { return null; } })));
  si('sin errores de JavaScript', errores.length === 0, errores.slice(0, 3).join(' | '));
  await pagina.close();

  /* ══ 5 · 🔒 La dirección NO viaja en el código del repositorio ═════════ */
  const FUENTE = fs.readFileSync(INDEX, 'utf8');
  const pegadas = FUENTE.match(/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}/g) || [];
  si('🔒 no hay ninguna dirección de implementación escrita en el index',
    pegadas.length === 0,
    'aparece ' + pegadas.join(', ') + ' — la dirección se configura en el aparato, no se publica');

  await navegador.close();
  fs.unlinkSync(compilado);
  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLOS' : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
