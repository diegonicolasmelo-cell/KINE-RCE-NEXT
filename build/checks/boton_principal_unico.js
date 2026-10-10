// boton_principal_unico.js — UN SOLO BOTÓN PRINCIPAL: el azul institucional, plano, igual en la tarjeta de cama, en los botones `.btn-p` y en la
// barra de abajo del panel (tanda 5 · cambio 6, segunda parte, oct-2026). Va en su propio commit para poder revertirse sola.
//
// DE DÓNDE SALE. La decisión 1 de la auditoría decía: «hoy hay DOS botones principales con colores distintos: azul institucional (Evolución de
// la tarjeta y los botones `.btn-p`) e ÍNDIGO con sombra (Guardar y Siguiente de la barra)». La auditoría leyó el CSS base, sin correrlo.
//
// 🪤 LO QUE SE MIDIÓ, que no es lo que decía la auditoría. En el navegador, con la piel institucional —que es la ÚNICA: el alternador no
// existe y `data-piel="inst"` se pone al arrancar—, el índigo NO se ve en ningún estado: lo pisa la piel con el mismo azul. Las reglas base
// `#btnGuardar,#pasoAvanza{background:linear-gradient(135deg,#5856d6,#4338ca)…}` son CÓDIGO MUERTO: nadie las ve, pero siguen escritas y son
// una trampa (quien algún día toque la piel recupera un botón índigo). Lo que SÍ distinguía el botón de la barra de los demás, medido:
//   · Relleno: degradado `#0058A0 → #04345E` con sombra azul `0 5px 16px`; la tarjeta (`.bevo`) y `.btn-p` son planos `#0058A0`.
//   · Con el cursor encima: `.bevo` y `.btn-p` se OSCURECEN (a `#04345E`); «Siguiente» se ACLARA (`brightness(1.08)`) y «Guardar» usa OTRO
//     degradado más claro (`#0d69b6 → #0058A0`). Tres hover distintos entre cinco botones «principales».
//
// LA REGLA. Un botón principal es azul institucional plano (`--primary`), se oscurece a `--pdark` con el cursor encima y no lleva sombra ni
// degradado ni filtro. El de la barra conserva SU TAMAÑO —52 px de alto y 1,02rem de letra: pedido de Diego del 15-ago-2026— y su radio de
// 12 px: lo que se unifica es el aspecto, no el tamaño. El desactivado (gris claro con letra oscura, del paso 5.2) no cambia.
//
// 🔴 LO QUE ESTA GUARDIA FIJA (Chromium, reloj congelado, datos ficticios, lo que PINTA el navegador y no el texto del CSS):
//   A. Ningún botón principal se pinta con índigo o violeta, ni en reposo ni con el cursor encima (se mide el tono de cada color computado).
//      (Verde desde el principio: la hipótesis de la auditoría —que el índigo se veía— NO se confirmó. Se deja de candado.)
//   B. Los cuatro principales que se ven (`.bevo` de la tarjeta, una muestra `.btn.btn-p`, `#pasoAvanza` y `#btnGuardar`) tienen EL MISMO
//      relleno plano en reposo y EL MISMO al pasar el cursor, sin degradado, sin sombra y sin filtro.
//   C. El botón de la barra conserva su tamaño grande: ≥ 52 px de alto y ≥ 1,02rem, a 1400 y a 390 px (y su radio de 12 px).
//   D. El desactivado sigue siendo gris claro con letra oscura, sin sombra ni degradado.
//   E. No queda índigo ESCRITO en ninguna regla del botón de la barra (código muerto que era una trampa): ninguna regla cuyo selector nombre
//      `#btnGuardar` o `#pasoAvanza` trae un color de tono índigo o violeta (se juzga por el tono, no por el hex: el navegador devuelve `rgb()`).
//      Y sin la piel institucional el botón sigue azul y plano.
//   F. No es una guardia vacía: exige haber VISTO los cuatro botones y su estado con el cursor encima.
//
// 🪤 No se toca `_guardadoBotones`, `guardar()`, la franja `#gEstadoGuardado`, ni el HTML de ningún botón. Es CSS.
// 🪤 `.fc-proc{--fc:#4338ca}` (el color de la tarjeta de Procedimientos) es un índigo LEGÍTIMO de un dominio clínico y no es un botón: por eso E
//    mira solo las reglas del botón de la barra y no todo el archivo.
// 🪤 Reloj congelado: martes 10-mar-2026 10:00 con `clock.setFixedTime` (fecha INVENTADA, fuera de las ventanas trampa). Solo datos ficticios.
//
// Uso: node build/checks/boton_principal_unico.js
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright-core');
const S = require(path.join(__dirname, '..', 'sim', 'sim_srv.js'));

const pad = n => String(n).padStart(2, '0');
const HOY = new Date(2026, 2, 10, 10, 0, 0);
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const menosDias = n => iso(new Date(HOY.getTime() - n * 86400000));
S.SIM.fecha = iso(HOY);
S.SIM.hora = '10:00:00';
Object.assign(S.DB.CAMAS_ESTADO.find(x => String(x.ID_CAMA) === '1'), {
  OCUPADA: true, STATUS_CAMA: 'Ocupada', PATIENT_ID: 'pid-1', COD_PACIENTE: 'C1', NOMBRE: 'Rosa Elena Contreras Pino', EDAD: 74, SEXO: 'F',
  DIAGNOSTICO: 'Neumonía grave adquirida en la comunidad', VIA_AEREA: 'TOT', SOPORTE: 'VM', MODO: 'ACVC', TALLA_CM: 158,
  FECHA_INGRESO: menosDias(8), TS_INGRESO: menosDias(8) + ' 08:30', FECHA_INICIO_SOPORTE: menosDias(8), FECHA_INICIO_VA: menosDias(8), FIRMA_KINE: 'DMV',
});

const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined || detalle === '' ? '' : '\n   ' + detalle));
  if (!cond) fails.push(l);
};

/** Tono (0–360) y saturación (0–1) de cada color `rgb()`/`rgba()` que aparece en un texto de CSS computado. */
const colores = txt => [...String(txt).matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/g)].map(m => {
  const [r, g, b] = [m[1], m[2], m[3]].map(x => +x / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { rgb: m[0], tono: Math.round(h * 60), sat: mx ? d / mx : 0, alfa: m[4] === undefined ? 1 : +m[4] };
});
/** Luminosidad relativa media (0–1) de los colores de un texto de CSS: para saber si algo se OSCURECE de verdad al pasar el cursor. */
const luz = txt => {
  const cs = colores(txt); if (!cs.length) return null;
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return cs.reduce((a, c) => { const m = c.rgb.match(/\d+/g).map(Number); return a + 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); }, 0) / cs.length;
};
// Índigo o violeta: tono entre 235° y 300° con color de verdad (el azul institucional #0058A0 está en 207°; el índigo #4338ca en 244°).
const esIndigo = c => c.tono >= 235 && c.tono <= 300 && c.sat > 0.25 && c.alfa > 0;

/* ── En la página ─────────────────────────────────────────────────────────────────────────────────── */
const LEER = sel => {
  const e = document.querySelector(sel); if (!e) return null;
  const c = getComputedStyle(e), r = e.getBoundingClientRect();
  return {
    fondoImagen: c.backgroundImage, fondoColor: c.backgroundColor, sombra: c.boxShadow, filtro: c.filter, radio: c.borderRadius,
    alto: Math.round(r.height * 10) / 10, letraPx: parseFloat(c.fontSize), color: c.color, visible: r.width > 0 && r.height > 0, desactivado: !!e.disabled,
  };
};
const FONDO_TXT = x => x.fondoImagen !== 'none' ? x.fondoImagen : x.fondoColor;
/** El texto de TODA regla (también dentro de @media) cuyo selector nombra un botón de la barra. 🪤 El navegador devuelve los colores ya como
    `rgb()`, no como se escribieron (`#4338ca` sale `rgb(67, 56, 202)`), así que el índigo se juzga después, por su tono, y no buscando el hex. */
const REGLAS_DEL_BOTON = () => {
  const out = [];
  const mira = reglas => { for (const r of reglas) {
    if (r.cssRules && !r.selectorText) { mira(r.cssRules); continue; }
    if (r.selectorText && /btnGuardar|pasoAvanza/.test(r.selectorText)) out.push(r.cssText);
  } };
  for (const h of document.styleSheets) { try { mira(h.cssRules); } catch (e) { /* hoja de otro origen: no es la nuestra */ } }
  return out;
};

(async () => {
  const compilado = path.join(__dirname, '..', '_boton_principal_unico.html');
  fs.writeFileSync(compilado, fs.readFileSync(process.env.RCE_INDEX || path.join(__dirname, '..', '..', 'v2', 'index.html'), 'utf8').replace(/<\?=[\s\S]*?\?>/g, ''));
  const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const errores = [];

  async function abrir(ancho) {
    const movil = ancho <= 740;
    const pag = await navegador.newPage({ viewport: { width: ancho, height: movil ? 844 : 950 }, isMobile: movil, hasTouch: movil });
    pag.on('pageerror', e => errores.push(e.message));
    await pag.clock.setFixedTime(HOY);
    await pag.exposeFunction('__gasApi', (a, d, t) => { let r; try { r = S.api(a, d, t); } catch (e) { r = { ok: false, error: e.message }; } return JSON.stringify(r); });
    await pag.addInitScript(() => {
      window.google = { script: { run: { withSuccessHandler(o) { return { withFailureHandler(f) { return {
        async api(a, d, t) { const r = JSON.parse(await window.__gasApi(a, d || {}, t || null)); if (r.ok) o(r); else f(r.error); }
      }; } }; } } } };
    });
    await pag.goto('file://' + compilado);
    await pag.waitForTimeout(1500);
    await pag.addStyleTag({ content: '#tutHola, #tutBtn, .toast, .tut-hola, .tut-bubble { display: none !important; }' });
    return pag;
  }
  /** Mide reposo y con el cursor encima. El `hover` real, con espera: el botón tiene `transition:all .18s`. */
  async function reposoYHover(pag, sel) {
    await pag.mouse.move(0, 0); await pag.waitForTimeout(300);
    const reposo = await pag.evaluate(LEER, sel);
    await pag.hover(sel); await pag.waitForTimeout(350);
    const hover = await pag.evaluate(LEER, sel);
    await pag.mouse.move(0, 0); await pag.waitForTimeout(300);
    return { reposo, hover };
  }

  const vistos = [];
  for (const ancho of [1400, 390]) {
    const D = ancho + ' px';
    console.log('\n' + (ancho > 740 ? 'ESCRITORIO ' : 'CELULAR ') + D.toUpperCase());
    const pag = await abrir(ancho);
    // Un botón de cada familia: la tarjeta de cama (ocupada), una muestra `.btn.btn-p` suelta, y los dos de la barra del panel.
    await pag.evaluate(() => { setTab('G'); renderGrid(); });
    await pag.waitForTimeout(300);
    const B = {};
    B['tarjeta .bevo (Evolución)'] = await reposoYHover(pag, '#bedGrid .bcard.occ .bevo');
    await pag.evaluate(() => { const b = document.createElement('button'); b.id = '__muestra'; b.className = 'btn btn-p'; b.style.cssText = 'position:fixed;left:20px;top:140px;width:220px;z-index:9999'; b.textContent = 'Muestra .btn-p'; document.body.appendChild(b); });
    B['muestra .btn.btn-p'] = await reposoYHover(pag, '#__muestra');
    await pag.evaluate(() => { document.getElementById('__muestra').remove(); abrirPanel('1', false); });
    await pag.waitForTimeout(900);
    await pag.evaluate(() => { pasoIr(2); });
    await pag.waitForTimeout(400);
    B['barra #pasoAvanza (Siguiente)'] = await reposoYHover(pag, '#pasoAvanza');
    // `#btnGuardar` vive oculto (lo aprieta `#pasoAvanza`): se muestra solo para medirlo, y se vuelve a esconder.
    await pag.evaluate(() => { const g = document.getElementById('btnGuardar'); g.style.display = 'flex'; g.style.position = 'fixed'; g.style.right = '10px'; g.style.top = '10px'; g.style.width = '260px'; g.style.zIndex = '9999'; });
    B['barra #btnGuardar (Guardar)'] = await reposoYHover(pag, '#btnGuardar');
    await pag.evaluate(() => { const g = document.getElementById('btnGuardar'); g.style.cssText = 'display:none;'; });
    const nombres = Object.keys(B);
    for (const n of nombres) vistos.push([D + ' · ' + n, !!(B[n].reposo && B[n].reposo.visible && B[n].hover)]);

    // A · sin índigo ni violeta
    for (const n of nombres) {
      const t = ['reposo', 'hover'].map(k => ({ k, c: colores([FONDO_TXT(B[n][k]), B[n][k].sombra].join(' ')) }));
      const malos = t.flatMap(x => x.c.filter(esIndigo).map(c => x.k + ' ' + c.rgb + ' (tono ' + c.tono + '°)'));
      si('A · ' + D + ' · ' + n + ': no se pinta con índigo ni violeta (reposo ni cursor encima)', malos.length === 0, malos.join(', '));
    }
    // B · el mismo relleno, el mismo hover, sin degradado, sin sombra, sin filtro
    const firma = (m, k) => FONDO_TXT(m[k]);
    const planos = nombres.filter(n => B[n].reposo.fondoImagen === 'none' && B[n].hover.fondoImagen === 'none');
    si('B · ' + D + ': ningún principal lleva degradado (relleno plano en reposo y con el cursor encima)', planos.length === nombres.length,
      nombres.filter(n => !planos.includes(n)).map(n => n + ': ' + B[n].reposo.fondoImagen + ' | hover ' + B[n].hover.fondoImagen).join('\n   '));
    si('B · ' + D + ': ningún principal lleva sombra ni filtro (la barra tenía `0 5px 16px` azul y `brightness(1.08)` al pasar el cursor)', nombres.every(n => ['reposo', 'hover'].every(k => B[n][k].sombra === 'none' && B[n][k].filtro === 'none')),
      nombres.map(n => n + ': sombra ' + B[n].reposo.sombra + ' · filtro hover ' + B[n].hover.filtro).join('\n   '));
    si('B · ' + D + ': los cuatro tienen EL MISMO relleno en reposo (' + firma(B[nombres[0]], 'reposo') + ')', new Set(nombres.map(n => firma(B[n], 'reposo'))).size === 1,
      nombres.map(n => n + ': ' + firma(B[n], 'reposo')).join('\n   '));
    si('B · ' + D + ': los cuatro se OSCURECEN al mismo color con el cursor encima (' + firma(B[nombres[0]], 'hover') + ')', new Set(nombres.map(n => firma(B[n], 'hover'))).size === 1 && nombres.every(n => luz(firma(B[n], 'hover')) < luz(firma(B[n], 'reposo')) - 0.01),
      nombres.map(n => n + ': ' + firma(B[n], 'reposo') + ' → ' + firma(B[n], 'hover')).join('\n   '));
    // C · el tamaño que pidió Diego
    const av = B['barra #pasoAvanza (Siguiente)'].reposo, gu = B['barra #btnGuardar (Guardar)'].reposo;
    si('C · ' + D + ': el principal de la barra sigue GRANDE (' + av.alto + ' px y ' + av.letraPx + ' px de letra; Guardar ' + gu.alto + ' px) y con radio de 12 px', av.alto >= 51.5 && av.letraPx >= 16.3 && gu.alto >= 51.5 && gu.letraPx >= 16.3 && av.radio === '12px' && gu.radio === '12px',
      JSON.stringify({ siguiente: [av.alto, av.letraPx, av.radio], guardar: [gu.alto, gu.letraPx, gu.radio] }));
    if (ancho > 740) {
      // D · el desactivado (paso 1 con la prevención sin hacer, o forzado)
      await pag.evaluate(() => { const b = document.getElementById('pasoAvanza'); b.disabled = true; });
      await pag.waitForTimeout(450);   // 🪤 `.btn{transition:all .18s}`: leerlo al instante da el color a medio camino (transparente con letra blanca)
      const d = await pag.evaluate(LEER, '#pasoAvanza');
      si('D · ' + D + ': el principal desactivado sigue gris claro con letra oscura, sin sombra ni degradado (' + d.fondoColor + ' / ' + d.color + ')', d.desactivado && d.fondoImagen === 'none' && d.fondoColor === 'rgb(226, 232, 240)' && d.color === 'rgb(71, 85, 105)' && d.sombra === 'none',
        JSON.stringify(d));
      await pag.evaluate(() => { document.getElementById('pasoAvanza').disabled = false; });
      await pag.waitForTimeout(450);
      // E · nada de índigo escrito en las reglas del botón de la barra, y sin la piel el botón sigue azul y plano
      const todas = await pag.evaluate(REGLAS_DEL_BOTON);
      const reglas = todas.filter(t => colores(t).some(esIndigo));
      si('E · reglas del botón de la barra con un índigo escrito: ' + reglas.length + ' de ' + todas.length + ' (código muerto que era una trampa)', todas.length >= 4 && reglas.length === 0,
        reglas.map(t => t.slice(0, 150)).join('\n   ') || ('se revisaron solo ' + todas.length + ' reglas'));
      await pag.evaluate(() => { document.documentElement.removeAttribute('data-piel'); });
      await pag.waitForTimeout(450);
      const sinPiel = await pag.evaluate(LEER, '#pasoAvanza');
      const cs = colores([FONDO_TXT(sinPiel), sinPiel.sombra].join(' '));
      si('E · SIN la piel institucional el botón de la barra no se vuelve índigo ni degradado (' + FONDO_TXT(sinPiel) + ')', cs.filter(esIndigo).length === 0 && sinPiel.fondoImagen === 'none' && sinPiel.sombra === 'none',
        JSON.stringify({ fondo: FONDO_TXT(sinPiel), sombra: sinPiel.sombra }));
    }
    await pag.close();
  }

  /* ── F · no es una guardia vacía ─────────────────────────────────────────────────────────────────── */
  console.log('\nCOBERTURA');
  si('F · se VIERON los cuatro botones, en reposo y con el cursor encima, a los dos anchos (' + vistos.filter(v => v[1]).length + ' de 8)', vistos.length === 8 && vistos.every(v => v[1]),
    vistos.map(v => v[0] + ': ' + (v[1] ? 'visto' : 'NO visto')).join('\n   '));

  await navegador.close();
  fs.unlinkSync(compilado);
  si('sin errores de JavaScript en la página', errores.length === 0, errores.join(' | '));
  if (fails.length) { console.log('\n❌ ' + fails.length + ' fallan'); process.exit(1); }
  console.log('\n✅ todo verde');
})().catch(e => { console.error('❌ la guardia reventó: ' + (e && e.stack || e)); process.exit(1); });
