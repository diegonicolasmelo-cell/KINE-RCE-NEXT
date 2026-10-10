// act_bar_390.js — LA BARRA DE ACCIONES DEL PANEL CABE EN UN CELULAR: el botón principal se lee entero y la barra no tapa lo que se está
// escribiendo (tanda 5 · cambio 6, primera parte, oct-2026).
//
// EL FALLO (medido en Chromium a 390 px, no calculado). La barra de abajo del panel (`.act-bar`) reparte UNA fila entre hasta cuatro
// hijos: la insignia «⚠️ Sin guardar», «← Atrás», el botón principal y —en una fila propia— la franja del último guardado. La insignia
// aparece apenas la persona toca un campo, o sea que NO es un caso raro: es la barra que se ve TODO el turno mientras se evoluciona.
// Con la insignia puesta, «Atrás» (87 px) y la insignia (104 px) se llevaban 205 de los 354 px útiles y el botón principal quedaba de
// 141 px: «Siguiente: evaluaciones →» y «Siguiente: terapia física →» se partían en TRES líneas (55 px de texto dentro de un botón de
// 52): el texto sobresalía 2,5 px por arriba y 1,5 por abajo y la flecha caía sola en la tercera línea. En los pasos 4 a 6 entraba en
// dos líneas, justo (7 px de margen). Y la auditoría traía la hipótesis de arreglarlo solo con `line-height` y `white-space:normal`:
// medido, con 141 px y tres líneas seguiría sobresaliendo (3 × 18,8 = 56 px). Lo que hay que sacar de la fila es la insignia.
//
// LA REGLA. En el celular la insignia ocupa SU PROPIA fila (como ya hace la franja del guardado, que es de la misma familia: dice cómo
// va el guardado) y «Atrás» + el principal se reparten la fila de abajo. El botón principal sigue siendo GRANDE (52 px de alto y 1,02rem:
// pedido de Diego del 15-ago-2026, no se achica para que entre nada) y su texto nunca pasa de dos líneas.
//
// 🔴 LO QUE ESTA GUARDIA FIJA (Chromium a 390, 360 y 320 px, reloj congelado, datos ficticios, el panel de verdad en sus SEIS pasos y en
//    cuatro estados de la barra: limpia, «Sin guardar», «Sin guardar» + franja ámbar, «Sin guardar» + franja de aviso):
//   R1. Nada de la barra se sale de la pantalla (hijos dentro de [0, ancho]; la barra, el panel y la página no se deslizan de lado).
//   R2. El botón principal se LEE entero: a lo más dos líneas, su texto cabe dentro de su caja (ni cortado ni sobresaliendo) y con
//       margen arriba y abajo.
//   R3. Sigue siendo GRANDE: al menos 52 px de alto y 1,02rem de letra (lo pidió Diego).
//   R4. Nadie queda montado sobre nadie, y ni la insignia ni la franja comparten fila con el principal.
//   R5. El principal toma lo que sobra de la fila: al menos la mitad del ancho útil de la barra (antes, 141 de 354 px).
//   R6. Al llegar al final del paso, ningún campo queda bajo la barra.
//   R7. Un campo ENFOCADO (con el teclado o con el dedo) no queda tapado por la barra: el navegador no sabe que una barra pegajosa le
//       come el borde de abajo, así que un campo que ya «se ve» bajo ella no se desplaza; el panel le dice cuánto reservar
//       (`scroll-padding-bottom`). Medido antes: «Sedación» y «Vigilia» del paso 2 y el relato del paso 6 quedaban bajo la barra.
//   R8. ESCRITORIO NO CAMBIA: a 1400 px la insignia sigue en la misma fila que el principal y el panel no reserva nada abajo.
//   R9. No es una guardia vacía: exige haber MEDIDO los seis pasos en los cuatro estados y los tres anchos, con la insignia, la franja y
//       «Atrás» realmente a la vista donde corresponde.
//
// 🪤 No se toca la franja `#gEstadoGuardado` (zona del otro flujo: su flex-wrap y su botón de 32+ px siguen como los dejó la revisión de
//    la tanda 2), ni `_guardadoBotones`, ni `#btnCerrarPost`, ni ningún id, `data-estado`, onclick u orden del DOM. Es CSS del celular.
// 🪤 Por debajo de 390 px la CABECERA del panel desborda —con un diagnóstico largo en una sola línea, el título y la ✕ de cerrar terminan en
//    x = 380: 20 px fuera de la pantalla a 360 px y 60 a 320 px— y el foco de la ✕ al abrir desliza el panel entero hacia la izquierda: la
//    barra aparece corrida (a 320 px se vio en las dos primeras medidas, con la barra en x = −42). Es de la cabecera, no de la barra, y está
//    fuera de este paso: la guardia devuelve el panel a su sitio antes de medir y NO le exige a 360 ni a 320 px que el panel no se deslice
//    (a 390 px sí, y ahí se cumple). Queda anotado en BITACORA.md para que Diego decida.
// 🪤 Reloj congelado: martes 10-mar-2026 10:00 con `clock.setFixedTime` (la fecha se INVENTA, fuera de las ventanas trampa: Fiestas
//    Patrias, cumpleaños, cierre de año y la media hora previa a cada cambio de turno). Solo datos ficticios.
// 🪤 «Sin guardar» lo prende un temporizador de 2 s (`_tickSinGuardar`): se llama a mano antes de medir, y se exige haberlo VISTO.
//
// Uso: node build/checks/act_bar_390.js
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

/* Los cuatro estados de la barra. Cada uno parte del anterior: «limpio» primero (después de tocar un campo ya no se puede volver a limpio
   sin reiniciar la bandera, que es lo que hace la guardia a propósito). La franja se pone con las funciones REALES de la app. */
const ESTADOS = [
  { id: 'limpia', n: 'barra limpia', dirty: false, franja: null },
  { id: 'sin-guardar', n: '«Sin guardar»', dirty: true, franja: null },
  { id: 'ambar', n: '«Sin guardar» + franja ámbar', dirty: true, franja: 'ambar' },
  { id: 'aviso', n: '«Sin guardar» + franja de aviso', dirty: true, franja: 'aviso' },
];

/* ── En la página ─────────────────────────────────────────────────────────────────────────────────── */
const PONER_ESTADO = ({ dirty, franja }) => {
  document.querySelectorAll('.toast').forEach(n => n.remove());
  _estadoGuardado('');
  if (dirty) {
    // Un toque de verdad: el evento llega al oyente del formulario (`#kf`), igual que cuando alguien escribe.
    const e = document.getElementById('r_vt');
    e.value = '420'; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true }));
  } else { _formDirty = false; }
  _tickSinGuardar();
  if (franja === 'ambar') _marcaNoConfirmado(true);
  if (franja === 'aviso') _marcaGuardadoAviso(['La serie de mediciones quedó a medias.', 'Vuelve a guardar el turno para completarla.'], new Date());
  document.querySelectorAll('.toast').forEach(n => n.remove());
};

const MEDIR = () => {
  const r1 = x => Math.round(x * 10) / 10;
  const rect = e => { const r = e.getBoundingClientRect(); return { id: e.id || e.tagName, x: r1(r.left), r: r1(r.right), t: r1(r.top), b: r1(r.bottom), w: r1(r.width), h: r1(r.height) }; };
  const visible = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('.hidden') && getComputedStyle(e).display !== 'none'; };
  const lineas = b => {
    const rg = document.createRange(); rg.selectNodeContents(b);
    const rs = [...rg.getClientRects()].filter(r => r.width > 0 && r.height > 0).sort((x, y) => x.top - y.top);
    if (!rs.length) return 0;
    let n = 1, fondo = rs[0].bottom;
    for (const r of rs.slice(1)) { if (r.top >= fondo - 1) { n++; fondo = r.bottom; } else fondo = Math.max(fondo, r.bottom); }
    return n;
  };
  const bar = document.querySelector('#sp .act-bar'), av = document.getElementById('pasoAvanza'), pc = document.querySelector('#sp .pcontent');
  const hijos = [...bar.children].filter(visible).map(rect);
  const cs = getComputedStyle(av), br = av.getBoundingClientRect();
  const rg = document.createRange(); rg.selectNodeContents(av);
  const tr = [...rg.getClientRects()].filter(r => r.width > 0);
  const csBar = getComputedStyle(bar);
  const sin = document.getElementById('gSinGuardar'), est = document.getElementById('gEstadoGuardado'), atras = document.getElementById('pasoAtras');
  return {
    ancho: innerWidth, alto: innerHeight,
    barra: rect(bar), hijos,
    utilBarra: r1(bar.getBoundingClientRect().width - parseFloat(csBar.paddingLeft) - parseFloat(csBar.paddingRight)),
    barraScrollW: bar.scrollWidth, barraClientW: bar.clientWidth, pcScrollW: pc.scrollWidth, spScrollW: document.getElementById('sp').scrollWidth, docScrollW: document.documentElement.scrollWidth,
    av: Object.assign(rect(av), {
      texto: av.textContent.trim(), lineas: lineas(av), scrollH: av.scrollHeight, clientH: av.clientHeight, scrollW: av.scrollWidth, clientW: av.clientWidth,
      arriba: tr.length ? r1(Math.min(...tr.map(r => r.top)) - br.top) : null, abajo: tr.length ? r1(br.bottom - Math.max(...tr.map(r => r.bottom))) : null,
      letraPx: parseFloat(cs.fontSize), disabled: av.disabled,
    }),
    sinVisible: visible(sin), estVisible: visible(est), atrasVisible: visible(atras),
    sin: visible(sin) ? rect(sin) : null, est: visible(est) ? rect(est) : null,
    scrollPaddingBottom: getComputedStyle(pc).scrollPaddingBottom,
  };
};

/** Con el panel desplazado al final: ¿algún campo queda bajo la barra? Y, uno por uno: ¿un campo enfocado queda tapado? */
const TAPA = async probarFoco => {
  const pc = document.querySelector('#sp .pcontent'), bar = document.querySelector('#sp .act-bar');
  // 🪤 `checkVisibility` y no solo el rectángulo: el campo de un `<details>` cerrado (el «Escribir procedimiento…» del paso 2) conserva su
  // rectángulo aunque el navegador no lo pinta, y medirlo hacía creer que la barra tapaba un campo que nadie ve.
  const visible = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.checkVisibility({ checkVisibilityCSS: true }); };
  const campos = [...document.querySelectorAll('#sp input:not([type=hidden]), #sp select, #sp textarea')].filter(e => visible(e) && !bar.contains(e));
  const esperar = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const nom = c => c.id || c.name || c.tagName;
  // 🪤 Un CUADRO de texto (el plan, el relato, la anotación) se enfoca con el cursor en su primera línea: el navegador desplaza hasta ese
  // cursor y no hasta el borde de abajo del cuadro, que puede seguir 3 px bajo la barra sin que nadie escriba a ciegas (medido: `fPlanes`,
  // de 52 px, con la primera línea 25 px sobre la barra). Para los cuadros se mira la primera línea (24 px); para todo lo demás
  // (selectores, casillas, textos de una línea) se mira el campo entero, porque ahí el cursor ES el campo.
  const zona = c => {
    const r = c.getBoundingClientRect();
    return c.tagName === 'TEXTAREA' ? { t: r.top, b: r.top + 24 } : { t: r.top, b: r.bottom };
  };
  const bajo = c => { const z = zona(c), b = bar.getBoundingClientRect(); return c.getBoundingClientRect().height > 0 && z.b > b.top + 1 && z.t < b.bottom; };
  pc.scrollTop = pc.scrollHeight; await esperar();
  const alFinal = campos.filter(bajo).map(c => nom(c) + ' (' + Math.round(c.getBoundingClientRect().bottom) + ' > ' + Math.round(bar.getBoundingClientRect().top) + ')');
  const enfocados = [];
  if (probarFoco) {
    for (const c of campos) {
      pc.scrollTop = 0; await esperar();
      c.focus(); await esperar();
      if (bajo(c)) { const cr = c.getBoundingClientRect(); enfocados.push(nom(c) + ' (' + c.tagName.toLowerCase() + ' ' + Math.round(cr.top) + '-' + Math.round(cr.bottom) + ' > barra ' + Math.round(bar.getBoundingClientRect().top) + '; panel ' + Math.round(pc.scrollTop) + '/' + Math.round(pc.scrollHeight - pc.clientHeight) + ')'); }
    }
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  pc.scrollTop = 0;
  return { n: campos.length, alFinal, enfocados };
};

(async () => {
  const compilado = path.join(__dirname, '..', '_act_bar_390.html');
  fs.writeFileSync(compilado, fs.readFileSync(process.env.RCE_INDEX || path.join(__dirname, '..', '..', 'v2', 'index.html'), 'utf8').replace(/<\?=[\s\S]*?\?>/g, ''));
  const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const errores = [];

  async function abrir(ancho) {
    const movil = ancho <= 740;
    const pag = await navegador.newPage({ viewport: { width: ancho, height: movil ? (ancho < 360 ? 640 : 844) : 950 }, isMobile: movil, hasTouch: movil });
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
    // El saludo y la mascota son globos fijos que podrían tapar la barra que se mide: se ocultan por CSS, que no depende de cuándo se mida.
    await pag.addStyleTag({ content: '#tutHola, #tutBtn, .toast, .tut-hola, .tut-bubble { display: none !important; }' });
    await pag.evaluate(() => { setTab('G'); abrirPanel('1', false); });
    await pag.waitForTimeout(900);
    await estable(pag);
    return pag;
  }

  /* 🪤 El panel ENTRA con una transición de CSS que corre con el reloj real y no con el de Playwright: a 320 px la primera medición cayó con la
     barra todavía 42 px corrida a la izquierda y la guardia dio «se sale de la pantalla» por una animación a medias. Se espera a que la barra
     lleve cuatro cuadros seguidos quieta (cuadros y no milisegundos: el reloj de la página está congelado). */
  const estable = pag => pag.evaluate(() => new Promise(res => {
    let prev = null, quieto = 0, cuadros = 0;
    const f = () => {
      const r = document.querySelector('#sp .act-bar').getBoundingClientRect(), k = r.left + '/' + r.top + '/' + r.width;
      if (k === prev) quieto++; else { quieto = 0; prev = k; }
      if (quieto >= 4 || ++cuadros > 400) res(k); else requestAnimationFrame(f);
    };
    f();
  }));

  const cobertura = [];

  /* ── CELULAR: 390 (el de verdad), 360 y 320 (los chicos) ─────────────────────────────────────────── */
  for (const ancho of [390, 360, 320]) {
    const D = ancho + ' px';
    console.log('\nCELULAR ' + D.toUpperCase());
    const pag = await abrir(ancho);
    const med = [];   // { est, n, m }
    const tapa = [];  // { est, n, t }
    for (const est of ESTADOS) {
      for (let n = 1; n <= 6; n++) {
        await pag.evaluate(paso => { pasoIr(paso); document.querySelectorAll('#sp .fcard.mcol').forEach(f => f.classList.remove('mcol')); }, n);
        await pag.evaluate(PONER_ESTADO, est);
        await pag.waitForTimeout(150);
        await pag.evaluate(() => { document.getElementById('sp').scrollLeft = 0; });   // ver la 🪤 de la cabecera a 320 px, arriba
        await estable(pag);
        const m = await pag.evaluate(MEDIR);
        med.push({ est, n, m });
        // El desplazamiento del panel se prueba en los estados sin franja (la franja es un estado de falla, rarísimo) y solo foco en los dos primeros.
        if (!est.franja) tapa.push({ est, n, t: await pag.evaluate(TAPA, true) });
        cobertura.push([D + ' · ' + est.id + ' · paso ' + n, m]);
      }
    }
    await pag.close();
    const etiqueta = x => x.est.id + ' p' + x.n;
    const malos = (f, d) => med.filter(x => !f(x.m, x)).map(x => etiqueta(x) + ' → ' + d(x.m, x));

    // R1
    const r1 = malos(m => m.hijos.every(h => h.x >= -0.5 && h.r <= m.ancho + 0.5) && m.barraScrollW <= m.barraClientW + 1 && m.pcScrollW <= m.ancho && m.docScrollW <= m.ancho && (ancho < 390 || m.spScrollW <= m.ancho),
      m => 'hijos ' + m.hijos.filter(h => h.x < -0.5 || h.r > m.ancho + 0.5).map(h => h.id + ':' + h.x + '-' + h.r).join(',') + ' · barra ' + m.barraScrollW + '/' + m.barraClientW + ' · panel ' + m.pcScrollW + '/' + m.spScrollW + ' · página ' + m.docScrollW + ' de ' + m.ancho);
    si('R1 · ' + D + ': nada de la barra se sale de la pantalla ni la hace deslizarse de lado (' + med.length + ' medidas)', r1.length === 0, r1.join('\n   '));
    // R2
    const r2 = malos(m => m.av.lineas <= 2 && m.av.scrollH <= m.av.clientH + 1 && m.av.scrollW <= m.av.clientW + 1 && m.av.arriba >= 3 && m.av.abajo >= 3,
      m => '«' + m.av.texto + '» ' + m.av.w + '×' + m.av.h + ' px, ' + m.av.lineas + ' línea(s), texto con ' + m.av.arriba + ' px arriba y ' + m.av.abajo + ' abajo, scroll ' + m.av.scrollH + '/' + m.av.clientH);
    si('R2 · ' + D + ': el botón principal se lee ENTERO (a lo más 2 líneas, el texto cabe en su caja, sin cortarse ni sobresalir)', r2.length === 0, r2.join('\n   '));
    // R3
    const r3 = malos(m => m.av.h >= 52 - 0.5 && m.av.letraPx >= 16.3, m => m.av.h + ' px de alto y ' + m.av.letraPx + ' px de letra');
    si('R3 · ' + D + ': el botón principal sigue GRANDE (≥ 52 px de alto y ≥ 1,02rem), lo pidió Diego', r3.length === 0, r3.join('\n   '));
    // R4
    const montado = (a, b) => a.x < b.r - 1 && a.r > b.x + 1 && a.t < b.b - 1 && a.b > b.t + 1;
    const r4 = malos(m => {
      const comparten = [m.sin, m.est].filter(Boolean).some(h => h.t < m.av.b - 1 && h.b > m.av.t + 1);
      const atras = m.hijos.find(h => h.id === 'pasoAtras'), atrasAparte = !!atras && !(atras.t < m.av.b - 1 && atras.b > m.av.t + 1);
      return !comparten && !atrasAparte && m.hijos.every((a, i) => m.hijos.slice(i + 1).every(b => !montado(a, b)));
    }, m => 'hijos ' + m.hijos.map(h => h.id + '@' + h.t + '-' + h.b).join(' ; '));
    si('R4 · ' + D + ': nadie queda montado sobre nadie; ni la insignia ni la franja comparten fila con el principal; y «← Atrás» SÍ está en su fila', r4.length === 0, r4.join('\n   '));
    // R5
    const r5 = malos(m => m.av.w >= 0.5 * m.utilBarra, m => 'el principal mide ' + m.av.w + ' px de ' + m.utilBarra + ' útiles (' + Math.round(100 * m.av.w / m.utilBarra) + ' %)');
    si('R5 · ' + D + ': el principal toma lo que sobra de la fila (al menos la mitad del ancho útil de la barra)', r5.length === 0, r5.join('\n   '));
    // R6
    const r6 = tapa.filter(x => x.t.alFinal.length).map(x => etiqueta(x) + ' → ' + x.t.alFinal.join(', '));
    si('R6 · ' + D + ': al llegar al final del paso ningún campo queda bajo la barra (' + tapa.reduce((a, x) => a + x.t.n, 0) + ' campos revisados)', r6.length === 0, r6.join('\n   '));
    // R7
    const r7 = tapa.filter(x => x.t.enfocados.length).map(x => etiqueta(x) + ' → ' + x.t.enfocados.slice(0, 4).join(', ') + (x.t.enfocados.length > 4 ? ' … (' + x.t.enfocados.length + ')' : ''));
    si('R7 · ' + D + ': un campo ENFOCADO no queda tapado por la barra', r7.length === 0, r7.join('\n   '));

    // Control: la medición vio lo que dice ver.
    const dirty = med.filter(x => x.est.dirty), franjas = med.filter(x => x.est.franja);
    si('R9 · ' + D + ': (control) «Sin guardar» estaba A LA VISTA en los 18 casos con cambios, y la franja en los 12 con franja', dirty.length === 18 && dirty.every(x => x.m.sinVisible) && franjas.length === 12 && franjas.every(x => x.m.estVisible),
      'insignia vista en ' + dirty.filter(x => x.m.sinVisible).length + ' de ' + dirty.length + '; franja en ' + franjas.filter(x => x.m.estVisible).length + ' de ' + franjas.length);
    si('R9 · ' + D + ': (control) «← Atrás» a la vista en los pasos 2 a 6 y oculto en el 1 (no se midió sin él)', med.every(x => x.m.atrasVisible === (x.n >= 2)),
      med.filter(x => x.m.atrasVisible !== (x.n >= 2)).map(etiqueta).join(', '));
    si('R9 · ' + D + ': (control) se midieron los 24 casos (4 estados × 6 pasos) y se revisaron campos en los 12 sin franja', med.length === 24 && tapa.length === 12 && tapa.every(x => x.t.n > 0 || x.n === 3),
      'medidas ' + med.length + ', paneles con campos ' + tapa.filter(x => x.t.n > 0).length + ' de ' + tapa.length);
  }

  /* ── ESCRITORIO: no cambia ────────────────────────────────────────────────────────────────────────── */
  console.log('\nESCRITORIO 1400 PX (no cambia)');
  {
    const pag = await abrir(1400);
    const med = [];
    for (const est of ESTADOS.filter(e => !e.franja)) {
      await pag.evaluate(() => { pasoIr(2); });
      await pag.evaluate(PONER_ESTADO, est);
      await pag.waitForTimeout(150);
      med.push({ est, m: await pag.evaluate(MEDIR) });
    }
    await pag.close();
    for (const { est, m } of med) {
      si('R8 · escritorio · ' + est.n + ': el principal mide 52 px y su texto va en UNA línea (' + m.av.w + '×' + m.av.h + ', ' + m.av.lineas + ' línea)', m.av.h >= 51.5 && m.av.lineas === 1, JSON.stringify(m.av));
      if (est.dirty) si('R8 · escritorio · ' + est.n + ': la insignia sigue EN LA MISMA FILA que el principal y compacta (' + (m.sin && m.sin.w) + ' px, no una franja de ancho completo)', m.sinVisible && m.sin.t < m.av.b - 1 && m.sin.b > m.av.t + 1 && m.sin.w <= 160, JSON.stringify({ sin: m.sin, av: [m.av.t, m.av.b] }));
      si('R8 · escritorio · ' + est.n + ': el panel no reserva espacio abajo para la barra (scroll-padding-bottom: ' + m.scrollPaddingBottom + ')', m.scrollPaddingBottom === 'auto' || m.scrollPaddingBottom === '0px', m.scrollPaddingBottom);
    }
    cobertura.push(['escritorio', med.length]);
  }

  /* ── R9 · no es una guardia vacía ─────────────────────────────────────────────────────────────────── */
  console.log('\nCOBERTURA');
  si('R9 · se MIDIERON los seis pasos en los cuatro estados a los tres anchos (' + cobertura.length + ' medidas, 72 de celular y 1 de escritorio)', cobertura.length === 73,
    String(cobertura.length));

  await navegador.close();
  fs.unlinkSync(compilado);
  si('sin errores de JavaScript en la página', errores.length === 0, errores.join(' | '));
  if (fails.length) { console.log('\n❌ ' + fails.length + ' fallan'); process.exit(1); }
  console.log('\n✅ todo verde');
})().catch(e => { console.error('❌ la guardia reventó: ' + (e && e.stack || e)); process.exit(1); });
