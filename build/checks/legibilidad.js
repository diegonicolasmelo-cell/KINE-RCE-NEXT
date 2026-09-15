// legibilidad.js — 🔴 NINGÚN TEXTO DE LA INTERFAZ QUEDA CORTADO (15-sep-2026).
//
// DE DÓNDE SALE. Mirando la aplicación en pantalla, no leyéndola:
//
//   · El RIEL DE SECCIONES del panel (196 px) llevaba cada nombre en una sola
//     línea con puntos suspensivos. CUATRO de las diez secciones quedaban
//     ilegibles: «Sedación y Concie…», «Respiratorio — 💨 …», «IMT / ⚡ EMS —
//     En…», «Procedimientos de…». Un índice que no dice a dónde lleva no es un
//     índice: hay que abrir la sección para saber si era la que se buscaba.
//   · La etiqueta «Fijación · cm de arcada dental» —30 caracteres— vivía en
//     una columna de 70 px y envolvía en TRES líneas, estirando la fila entera
//     para que un campo numérico de dos dígitos tuviera título.
//
// Las dos se arreglaron cambiando el ANCHO y el número de líneas, sin tocar
// una palabra del texto: lo que dice la pantalla es decisión de la unidad, no
// del que acomoda la caja.
//
// QUÉ EXIGE. Se abre el panel en un navegador de verdad y se mide el DOM:
//   1. Ningún nombre del riel de secciones queda cortado, ni a lo ancho ni a
//      lo alto. Si mañana nace una sección con nombre más largo, esto falla y
//      hay que decidir a conciencia: acortar el nombre o ensanchar el riel.
//   2. Ninguna etiqueta del formulario envuelve en tres o más líneas.
//   3. Ningún texto de las tarjetas de cama se desborda de su caja.
//
// 🪤 No se mide contando caracteres: se mide `scrollWidth`/`scrollHeight`
// contra `clientWidth`/`clientHeight`, que es lo que el navegador realmente
// recortó. Contar caracteres habría dado verde con una fuente distinta.
//
// Uso: node build/checks/legibilidad.js
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');
const S = require(path.join(__dirname, '..', 'sim', 'sim_srv.js'));
const fs = require('fs');

const pad = n => String(n).padStart(2, '0');
const HOY = new Date();
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
S.SIM.fecha = iso(HOY);
S.SIM.hora = pad(HOY.getHours()) + ':' + pad(HOY.getMinutes()) + ':00';

// Una unidad sembrada con nombres y diagnósticos LARGOS: si algo se corta, se
// corta acá. Con «Paciente 1» no se enteraría nadie.
const NOMBRES = ['María Soledad Contreras Villagrán', 'Juan Bautista Echeverría Ossandón',
  'Rosa Elena Pizarro Olguín', 'Jorge Andrés Vega Muñoz', 'Carmen Gloria Ríos Tapia',
  'Bernardita Alejandra Fuenzalida Prat', 'Luis Alberto Márquez Soto', 'Ana María Fuentes Lagos',
  'Héctor Manuel Rojas Díaz'];
const DX = 'Neumonía grave adquirida en la comunidad con derrame paraneumónico';
for (let i = 1; i <= 9; i++) {
  const c = S.DB.CAMAS_ESTADO.find(x => String(x.ID_CAMA) === String(i));
  Object.assign(c, { OCUPADA: true, STATUS_CAMA: 'Ocupada', PATIENT_ID: 'p' + i, COD_PACIENTE: 'C' + i,
    NOMBRE: NOMBRES[i - 1], EDAD: 60 + i, SEXO: i % 2 ? 'M' : 'F', DIAGNOSTICO: DX,
    VIA_AEREA: 'TOT', SOPORTE: 'VM', MODO: 'ACVC', TALLA_CM: 170,
    FECHA_INGRESO: iso(new Date(HOY - 6 * 864e5)), FECHA_INICIO_SOPORTE: iso(new Date(HOY - 6 * 864e5)),
    FECHA_INICIO_VA: iso(new Date(HOY - 6 * 864e5)), FIRMA_KINE: 'DMV' });
}

const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined ? '' : ' — ' + detalle));
  if (!cond) fails.push(l);
};

(async () => {
  const compilado = path.join(__dirname, '..', '_legibilidad.html');
  fs.writeFileSync(compilado, fs.readFileSync(path.join(__dirname, '..', '..', 'v2', 'index.html'), 'utf8')
    .replace(/<\?=[\s\S]*?\?>/g, ''));

  const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 950 } });
  const errores = [];
  pagina.on('pageerror', e => errores.push(e.message));
  await pagina.exposeFunction('__gasApi', (a, d, t) => {
    let r; try { r = S.api(a, d, t); } catch (e) { r = { ok: false, error: e.message }; }
    return JSON.stringify(r);
  });
  await pagina.addInitScript(() => {
    window.google = { script: { run: { withSuccessHandler(o) { return { withFailureHandler(f) { return {
      async api(a, d, t) { const r = JSON.parse(await window.__gasApi(a, d || {}, t || null)); if (r.ok) o(r); else f(r.error); }
    }; } }; } } } };
  });
  await pagina.goto('file://' + compilado);
  await pagina.waitForTimeout(1400);

  /* ── Tarjetas de cama ─────────────────────────────────────────────────── */
  const tarjetas = await pagina.evaluate(() => {
    const cortados = [];
    document.querySelectorAll('#bedGrid .bcard *').forEach(n => {
      if (n.children.length || !n.textContent.trim()) return;
      const cs = getComputedStyle(n);
      if (cs.overflow === 'visible' && cs.overflowX === 'visible') return;   // no recorta nada
      if (n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1) {
        cortados.push(n.textContent.trim().slice(0, 44));
      }
    });
    return { n: document.querySelectorAll('#bedGrid .bcard').length, cortados };
  });
  si('la grilla se pintó con camas para medir', tarjetas.n >= 9, tarjetas.n + ' tarjetas');
  si('ningún texto de las tarjetas de cama queda cortado', tarjetas.cortados.length === 0,
    tarjetas.cortados.join(' · '));

  /* ── Panel: riel de secciones y etiquetas ─────────────────────────────── */
  await pagina.evaluate(() => { setTab('G'); abrirPanel('1', false); });
  await pagina.waitForTimeout(1000);

  const panel = await pagina.evaluate(() => {
    const riel = [...document.querySelectorAll('#spRiel .riel-tx')];
    const cortadoRiel = riel
      .filter(n => n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1)
      .map(n => n.textContent.trim());
    const etiquetas = [...document.querySelectorAll('#sp .col label')].map(n => {
      const alto = n.getBoundingClientRect().height;
      const lh = parseFloat(getComputedStyle(n).lineHeight) || 16;
      return { txt: n.textContent.trim().slice(0, 44), lineas: Math.round(alto / lh) };
    }).filter(x => x.lineas >= 3);
    return { rielN: riel.length, cortadoRiel, etiquetas };
  });
  si('el riel de secciones se pintó', panel.rielN >= 8, panel.rielN + ' secciones');
  si('los ' + panel.rielN + ' nombres del riel se leen enteros', panel.cortadoRiel.length === 0,
    panel.cortadoRiel.join(' · ') + ' — o se acorta el nombre, o se ensancha el riel: no se deja cortado');
  si('ninguna etiqueta del formulario envuelve en tres líneas o más', panel.etiquetas.length === 0,
    panel.etiquetas.map(e => e.txt + ' (' + e.lineas + ' líneas)').join(' · '));

  si('sin errores de JavaScript', errores.length === 0, errores.join(' | '));

  await navegador.close();
  fs.unlinkSync(compilado);
  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLOS' : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
