// contraste_tokens.js — EL TEXTO SECUNDARIO Y LOS TÍTULOS LLEGAN A CONTRASTE AA SOBRE LOS FONDOS QUE DE VERDAD USAN (tanda 5 ·
// cambio 2 del plan de limpieza del registro de evolución, oct-2026).
//
// EL FALLO. `--muted` (#5B7793 en la piel institucional, que es la única) es el gris azulado de TODO el texto secundario: etiquetas
// de campo, textos de ayuda, «Disponible» de la cama libre, edad y sexo de la tarjeta, resúmenes. Sobre el fondo de la app
// (#EEF3F9) da 4,18:1 y sobre el manila de la carpeta de la cama (#f3e4ba) 3,69:1, y el mínimo AA para texto pequeño es 4,5:1.
// Con luz de sala o una pantalla vieja eso se pierde, y es justo lo que se lee de pie al lado de la cama. Lo mismo pasaba con los
// títulos de tarjeta de tres dominios (hemodinamia, terapia física, IMT), con el diagnóstico de la tarjeta (`.bdx`), con el icono de
// traslado (`.bmov`, 1,99:1 sobre el manila: casi invisible), con «Egr.» (`.balt`) y con el botón principal cuando está desactivado.
//
// 🪤 Por qué NO basta `piel.js`: sus pares de contraste usan hex ESCRITOS EN LA GUARDIA (`#5B7793` sobre `#fff`), no leen el CSS.
// Se puede oscurecer o aclarar el token y esa guardia sigue verde. Ésta mide con `getComputedStyle` sobre el fondo REAL que pinta
// el navegador (capas, degradados y opacidad compuestos), así que ve lo que ve el kinesiólogo.
//
// LO QUE FIJA (Chromium, a 1400 px y a 390 px, reloj congelado, datos ficticios).
//   A. BARRIDO DE `--muted`: todo texto visible cuyo color computado ES `--muted` (en el tablero y en los seis pasos del panel, más
//      el ingreso) tiene contraste ≥ 4,5 sobre su fondo efectivo. No es una lista de selectores: si mañana alguien pone
//      `color:var(--muted)` sobre un fondo nuevo y oscuro, esto lo ve.
//   B. LISTA CERRADA de pares que no son `--muted` (agregar uno es una decisión consciente, no se «ajusta» la lista para que pase):
//      · el título de cada tarjeta del panel (`.fcard-title`, un color por dominio)
//      · `.bdx`, `.bmov`, `.balt` de la tarjeta de cama
//      · `#gFalta`, la línea «Falta:» de la barra de acciones
//      · el botón principal DESACTIVADO (`#pasoAvanza`, `#btnGuardar`, `.btn-p`), con su opacidad compuesta
//   C. No es una guardia vacía: exige haber medido un mínimo de textos `--muted` y haber VISTO los usos que más fallaban (etiqueta
//      de campo, edad/sexo de la tarjeta, «Disponible»).
//
// 🪤 El ámbar y el rojo con significado clínico (alertas, VM prolongada, «Falta:» heredado) NO se oscurecen para pasar un número:
//    esta tanda solo toca grises, títulos y el desactivado. `#gFalta` entra en la lista porque su color es de la barra, no una
//    alarma de un dato.
// 🪤 Tema claro y UNA piel: no se agrega ningún bloque `prefers-color-scheme: dark` ni `[data-theme="dark"]` (lo mide la sección D).
// 🪤 Reloj congelado: martes 10-mar-2026 10:00 con `clock.setFixedTime` (fecha inventada, fuera de las ventanas trampa).
//
// Uso: node build/checks/contraste_tokens.js
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright-core');
const S = require(path.join(__dirname, '..', 'sim', 'sim_srv.js'));

const AA = 4.5;

const pad = n => String(n).padStart(2, '0');
const HOY = new Date(2026, 2, 10, 10, 0, 0);
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const menosDias = n => iso(new Date(HOY.getTime() - n * 86400000));
S.SIM.fecha = iso(HOY);
S.SIM.hora = '10:00:00';

const PACIENTES = [
  { cama: '1', nombre: 'Rosa Elena Contreras Pino',  edad: 74, sexo: 'F', dx: 'Neumonía grave adquirida en la comunidad', va: 'TOT',     sop: 'VM',   dias: 9,  sopDias: 9 },
  { cama: '2', nombre: 'Luis Alberto Márquez Soto',  edad: 58, sexo: 'M', dx: 'Shock séptico de foco abdominal',          va: 'TOT',     sop: 'VM',   dias: 3,  sopDias: 3 },
  { cama: '3', nombre: 'Marta Inés Pizarro Olguín',  edad: 66, sexo: 'F', dx: 'EPOC reagudizado',                         va: 'Natural', sop: 'VNI',  dias: 5,  sopDias: 2 },
  { cama: '4', nombre: 'Jorge Andrés Vega Muñoz',    edad: 41, sexo: 'M', dx: 'Politraumatismo por accidente de tránsito', va: 'TQT',    sop: 'VM',   dias: 24, sopDias: 21 },
];
for (const p of PACIENTES) {
  const c = S.DB.CAMAS_ESTADO.find(x => String(x.ID_CAMA) === p.cama);
  Object.assign(c, {
    OCUPADA: true, STATUS_CAMA: 'Ocupada', PATIENT_ID: 'pid-' + p.cama, COD_PACIENTE: 'C' + p.cama,
    NOMBRE: p.nombre, EDAD: p.edad, SEXO: p.sexo, DIAGNOSTICO: p.dx,
    VIA_AEREA: p.va, SOPORTE: p.sop, MODO: p.sop === 'VM' ? 'ACVC' : '',
    TALLA_CM: p.sexo === 'F' ? 158 : 173,
    FECHA_INGRESO: menosDias(p.dias - 1), TS_INGRESO: menosDias(p.dias - 1) + ' 08:30',
    FECHA_INICIO_SOPORTE: p.sopDias ? menosDias(p.sopDias - 1) : '',
    FECHA_INICIO_VA: p.sopDias ? menosDias(p.sopDias - 1) : '',
    FIRMA_KINE: 'DMV',
  });
}

const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined ? '' : '\n   ' + detalle));
  if (!cond) fails.push(l);
};

/* ── En la página: contraste real sobre el fondo real ─────────────────────────────────────────────── */
const EN_PAGINA = () => {
  const rgba = s => {
    const m = String(s).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/);
    if (!m) return null;
    let a = m[4] === undefined ? 1 : (String(m[4]).endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
    return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), a];
  };
  const sobre = (c, base) => [c[0] * c[3] + base[0] * (1 - c[3]), c[1] * c[3] + base[1] * (1 - c[3]), c[2] * c[3] + base[2] * (1 - c[3]), 1];
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const razon = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const hex = c => '#' + c.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

  /* Fondos posibles de un nodo: se sube por los ancestros juntando capas (color y degradado) hasta una opaca, y se compone de abajo
     hacia arriba sobre blanco. Un degradado aporta una alternativa por cada parada de color: se mide la PEOR. */
  const fondos = el => {
    const capas = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      let opaca = false;
      const bc = rgba(cs.backgroundColor);
      if (bc && bc[3] > 0) { capas.push([bc]); if (bc[3] === 1) opaca = true; }
      if (/gradient/.test(cs.backgroundImage)) {
        const paradas = [...cs.backgroundImage.matchAll(/rgba?\([^)]*\)/g)].map(m => rgba(m[0])).filter(Boolean);
        if (paradas.length) { capas.push(paradas); if (paradas.every(p => p[3] === 1)) opaca = true; }
      }
      if (opaca) break;
    }
    let base = [[255, 255, 255, 1]];
    for (let i = capas.length - 1; i >= 0; i--) {
      const sig = [];
      base.forEach(b => capas[i].forEach(c => sig.push(sobre(c, b))));
      base = sig;
    }
    return base;
  };
  const opacidad = el => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; };

  /** Peor contraste del texto de `el` sobre su fondo efectivo (con la opacidad compuesta sobre blanco). */
  const medir = el => {
    const cs = getComputedStyle(el);
    const fg = rgba(cs.color); if (!fg) return null;
    const al = opacidad(el), blanco = [255, 255, 255, 1];
    let peor = null;
    fondos(el).forEach(bg => {
      const f = sobre(fg, bg);
      const fE = sobre([f[0], f[1], f[2], al], blanco), bE = sobre([bg[0], bg[1], bg[2], al], blanco);
      const r = razon(fE, bE);
      if (!peor || r < peor.r) peor = { r: Math.round(r * 1000) / 1000, fg: hex(fE), bg: hex(bE) };   // 3 decimales: 4,499 NO pasa por redondeo
    });
    return peor;
  };
  const nombre = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '');
  const visible = el => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && el.getBoundingClientRect().width >= 1 && el.getBoundingClientRect().height >= 1
    && !el.closest('.msheet:not(.on), .mvelo.hidden');

  return {
    /** Todo texto visible cuyo color computado ES --muted. */
    barrerMuted(raiz) {
      const m = rgba(getComputedStyle(document.documentElement).getPropertyValue('--muted').trim().replace(/^#([0-9a-f]{6})$/i, (_, h) => 'rgb(' + [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).join(',') + ')'));
      const claro = 'rgb(' + m.slice(0, 3).join(', ') + ')';
      const salida = [];
      const w = document.createTreeWalker(raiz ? document.querySelector(raiz) : document.body, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) {
        if (!n.nodeValue.trim()) continue;
        const el = n.parentElement;
        if (!el || /^(SCRIPT|STYLE|NOSCRIPT|OPTION|TEXTAREA)$/.test(el.tagName) || !visible(el)) continue;
        if (getComputedStyle(el).color !== claro) continue;
        const r = medir(el); if (!r) continue;
        salida.push({ sel: nombre(el), texto: n.nodeValue.trim().slice(0, 30), r: r.r, bg: r.bg });
      }
      return { muted: hex(m), n: salida.length, salida };
    },
    /** Pares de la lista cerrada: cada elemento que cumpla el selector y se vea. */
    pares(selector, raiz) {
      return [...(raiz ? document.querySelector(raiz) : document).querySelectorAll(selector)].filter(visible)
        .map(el => { const r = medir(el); return r && { sel: nombre(el), texto: (el.textContent || '').trim().slice(0, 26), r: r.r, fg: r.fg, bg: r.bg }; }).filter(Boolean);
    },
    /** Una muestra de laboratorio: el HTML se pone un momento en el <body> (sin ancestros con opacidad) y se mide su estilo real. */
    parSonda(html) {
      const d = document.createElement('div'); d.innerHTML = html; document.body.appendChild(d);
      const el = d.firstElementChild, r = medir(el), t = (el.textContent || '').trim().slice(0, 26);
      d.remove();
      return r && { sel: nombre(el), texto: t, r: r.r, fg: r.fg, bg: r.bg };
    },
    /** Par de un elemento aunque no se vea (botón oculto) o en un estado forzado. */
    parForzado(selector, forzar) {
      const el = document.querySelector(selector); if (!el) return null;
      const antes = { disabled: el.disabled, dsp: el.style.display };
      if (forzar === 'desactivado') el.disabled = true;
      el.style.display = '';   // un botón con display:none no pinta, pero su estilo computado sigue valiendo
      const r = medir(el);
      el.disabled = antes.disabled; el.style.display = antes.dsp;
      return r && { sel: nombre(el), r: r.r, fg: r.fg, bg: r.bg };
    },
  };
};

const resumen = (lista, max = 8) => {
  const por = {};
  lista.filter(x => x.r < AA).forEach(x => { const k = x.sel + ' sobre ' + (x.bg || '?') + ' → ' + x.r + ':1'; (por[k] = por[k] || []).push(x.texto); });
  const filas = Object.entries(por).sort((a, b) => parseFloat(a[0].split('→ ')[1]) - parseFloat(b[0].split('→ ')[1]))
    .map(([k, t]) => k + '  (' + t.length + ' texto' + (t.length > 1 ? 's' : '') + ', p. ej. «' + t[0] + '»)');
  return filas.slice(0, max).concat(filas.length > max ? ['… y ' + (filas.length - max) + ' más'] : []);
};

(async () => {
  const compilado = path.join(__dirname, '..', '_contraste.html');
  fs.writeFileSync(compilado, fs.readFileSync(path.join(__dirname, '..', '..', 'v2', 'index.html'), 'utf8').replace(/<\?=[\s\S]*?\?>/g, ''));
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
    /* 🪤 EL SALUDO «¿Primera vez por acá?» (#tutHola) aparece a los 1,8 s del arranque con un fundido de .35 s (`tutPop`). Medir su × justo
       ahí lo pillaba a MEDIO APARECER —la opacidad compuesta daba 1,38:1— y la guardia se ponía roja SOLO bajo carga (la batería con
       `-j 2`) y verde corrida sola: otra guardia que depende de CUÁNDO se mide. No se esconde el saludo (su × también es texto en
       `--muted` y tiene que seguir midiéndose): se espera a que esté visible con su animación terminada; si no sale en 6 s (porque ya
       se vio y quedó la bandera), se sigue sin él. */
    await pag.waitForFunction(() => { const h = document.getElementById('tutHola'); return !!h && !h.classList.contains('hidden') && h.getAnimations().every(a => a.playState === 'finished'); },
      null, { timeout: 6000, polling: 50 }).catch(() => {});
    await pag.evaluate(src => { window.__C = (new Function('return ' + src))()(); }, EN_PAGINA.toString());
    return pag;
  }

  const sweep = {};   // acumulado del barrido de --muted: { sel+bg → ... }
  const usos = new Set();
  let medidos = 0, mutedHex = '';
  const barrer = async (pag, donde, raiz) => {
    const r = await pag.evaluate(rz => window.__C.barrerMuted(rz), raiz || null);
    mutedHex = r.muted; medidos += r.n;
    r.salida.forEach(x => { usos.add(x.sel); sweep[donde + ' · ' + x.sel + ' sobre ' + x.bg + ' → ' + x.r + ':1'] = (sweep[donde + ' · ' + x.sel + ' sobre ' + x.bg + ' → ' + x.r + ':1'] || { r: x.r, t: [] }); sweep[donde + ' · ' + x.sel + ' sobre ' + x.bg + ' → ' + x.r + ':1'].t.push(x.texto); });
    return r;
  };
  const titulos = [], bd = [], bm = [], ba = [], falta = [], desact = [];
  const juntar = (dest, donde) => lista => lista.forEach(x => dest.push(Object.assign({ donde }, x)));

  for (const ancho of [1400, 390]) {
    const movil = ancho <= 740;
    console.log('\n' + (movil ? 'CELULAR 390 px' : 'ESCRITORIO 1400 px'));
    const pag = await abrir(ancho);
    const donde = String(ancho);

    /* ── Tablero ────────────────────────────────────────────────────────────────────────────────── */
    await pag.evaluate(() => { EVO_SET.add('4'); renderGrid(); document.querySelectorAll('.toast, .tut-hola, .tut-bubble').forEach(n => n.remove()); });
    await pag.waitForTimeout(300);
    await barrer(pag, donde + ' tablero');
    juntar(bd, donde)(await pag.evaluate(() => window.__C.pares('#bedGrid .bdx')));
    juntar(bm, donde)(await pag.evaluate(() => window.__C.pares('#bedGrid .bmov')));
    juntar(ba, donde)(await pag.evaluate(() => window.__C.pares('#bedGrid .balt')));

    /* ── Panel: seis pasos ─────────────────────────────────────────────────────────────────────── */
    await pag.evaluate(() => { setTab('G'); abrirPanel('1', false); });
    await pag.waitForTimeout(1000);
    await pag.evaluate(() => {
      const poner = (id, val) => { const e = document.getElementById(id); if (e) { e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); } };
      poner('fSed', 'Escalón 2'); poner('r_vt', '420'); poner('r_peep', '8'); poner('r_fio2', '40');
      if (typeof _rielDeb === 'function') _rielDeb();
    });
    for (let n = 1; n <= 6; n++) {
      await pag.evaluate(paso => {
        pasoIr(paso);
        document.querySelectorAll('#sp .fcard.mcol').forEach(f => f.classList.remove('mcol'));
        document.querySelectorAll('#sp .msub.cerrado').forEach(f => f.classList.remove('cerrado'));
        document.querySelectorAll('#sp details').forEach(d => { d.open = true; });
      }, n);
      await pag.waitForTimeout(250);
      await barrer(pag, donde + ' paso ' + n, '#sp');
      juntar(titulos, donde + ' paso ' + n)(await pag.evaluate(() => window.__C.pares('#sp .fcard-title', '#sp')));
      juntar(falta, donde + ' paso ' + n)(await pag.evaluate(() => [window.__C.parForzado('#gFalta')].filter(Boolean)));
      if (n === 1) juntar(desact, donde + ' «Siguiente» sin poder avanzar (paso 1)')(await pag.evaluate(() => {
        const b = document.getElementById('pasoAvanza');
        return b && b.disabled ? [Object.assign({ texto: b.textContent.trim().slice(0, 26) }, window.__C.parForzado('#pasoAvanza'))] : [];
      }));
    }
    /* El «Falta:» necesita texto para que sea de verdad el que se lee: se fuerza una línea y se mide el mismo nodo. */
    juntar(falta, donde + ' «Falta:» con texto')(await pag.evaluate(() => {
      const g = document.getElementById('gFalta'); if (!g) return [];
      const t = g.textContent; g.textContent = 'Falta: hemodinamia y PVE sí / no / no corresponde';
      const r = window.__C.pares('#gFalta'); g.textContent = t; return r;
    }));
    juntar(desact, donde + ' #btnGuardar desactivado (forzado)')(await pag.evaluate(() => [Object.assign({ texto: 'Guardar' }, window.__C.parForzado('#btnGuardar', 'desactivado'))].filter(x => x.r)));
    /* Los 37 `.btn-p` del HTML: una muestra desactivada suelta, porque los de verdad viven dentro de ventanas cerradas (opacidad 0). */
    juntar(desact, donde + ' .btn-p desactivado (muestra suelta)')(await pag.evaluate(() => [window.__C.parSonda('<button class="btn btn-p" disabled>Guardar ventilador</button>')].filter(Boolean)));

    /* ── Ingreso (paso 0) ──────────────────────────────────────────────────────────────────────── */
    await pag.evaluate(() => { try { cerrarPanel(); } catch (e) {} });
    await pag.waitForTimeout(400);
    await pag.evaluate(() => { abrirPanel('8', true); });
    await pag.waitForTimeout(900);
    await pag.evaluate(() => { document.querySelectorAll('#sp .fcard.mcol').forEach(f => f.classList.remove('mcol')); });
    await barrer(pag, donde + ' ingreso', '#sp');
    juntar(titulos, donde + ' ingreso')(await pag.evaluate(() => window.__C.pares('#sp .fcard-title', '#sp')));
    await pag.close();
  }

  /* ── A. Barrido de --muted ───────────────────────────────────────────────────────────────────── */
  console.log('\nA · Barrido de --muted (' + mutedHex + ')');
  si('se midieron al menos 150 textos en --muted (' + medidos + ')', medidos >= 150, medidos + ' textos');
  si('…y se VIERON los usos que más fallaban: etiqueta de campo, texto de la cama libre y edad/sexo de la tarjeta',
    ['label', 'empty-txt'].every(s => [...usos].some(u => u.includes(s))) && [...usos].some(u => /^div$/.test(u)),
    'usos vistos: ' + [...usos].slice(0, 12).join(', '));
  const malos = Object.entries(sweep).filter(([, v]) => v.r < AA).sort((a, b) => a[1].r - b[1].r);
  si('ningún texto en --muted queda bajo ' + AA + ':1 sobre su fondo real', malos.length === 0,
    malos.slice(0, 14).map(([k, v]) => k + '  (' + v.t.length + ' texto' + (v.t.length > 1 ? 's' : '') + ', p. ej. «' + v.t[0] + '»)').join('\n   ') + (malos.length > 14 ? '\n   … y ' + (malos.length - 14) + ' más' : ''));
  const peorMuted = Object.values(sweep).reduce((m, v) => Math.min(m, v.r), 99);
  console.log('   (el peor par de --muted mide ' + peorMuted + ':1)');

  /* ── B. Lista cerrada ────────────────────────────────────────────────────────────────────────── */
  console.log('\nB · Pares de la lista cerrada');
  const lista = [
    ['el título de cada tarjeta del panel (.fcard-title, un color por dominio)', titulos, 10],
    ['el diagnóstico de la tarjeta de cama (.bdx)', bd, 1],
    ['el icono de traslado (.bmov)', bm, 1],
    ['«Egreso» de la tarjeta de cama (.balt; antes «Egr.», en verde)', ba, 1],
    ['la línea «Falta:» (#gFalta)', falta, 1],
    ['el botón principal DESACTIVADO (#pasoAvanza, #btnGuardar, .btn-p)', desact, 3],
  ];
  for (const [nombre, medidas, minimo] of lista) {
    si(nombre + ': se midió (' + medidas.length + ')', medidas.length >= minimo, medidas.length + ' medidos, se esperaban ≥ ' + minimo);
    const mal = medidas.filter(x => x.r < AA);
    const peor = medidas.reduce((m, x) => Math.min(m, x.r), 99);
    si(nombre + ': contraste ≥ ' + AA + ':1 (el peor mide ' + peor + ':1)', mal.length === 0,
      mal.map(x => (x.donde ? x.donde + ' · ' : '') + x.sel + (x.texto ? ' «' + x.texto + '»' : '') + ' ' + x.fg + ' sobre ' + x.bg + ' → ' + x.r + ':1').slice(0, 10).join('\n   '));
  }

  /* ── D. Tema claro y una piel ───────────────────────────────────────────────────────────────── */
  console.log('\nD · Tema claro');
  const fuente = fs.readFileSync(path.join(__dirname, '..', '..', 'v2', 'index.html'), 'utf8');
  si('no hay bloque @media (prefers-color-scheme: dark) ni [data-theme="dark"]', !/prefers-color-scheme\s*:\s*dark/.test(fuente) && !/data-theme\s*=\s*["']dark/.test(fuente), '');

  await navegador.close();
  fs.unlinkSync(compilado);
  si('sin errores de JavaScript en la página', errores.length === 0, errores.join(' | '));
  if (fails.length) { console.log('\n❌ ' + fails.length + ' fallan'); process.exit(1); }
  console.log('\n✅ todo verde');
})().catch(e => { console.error('❌ la guardia reventó: ' + (e && e.stack || e)); process.exit(1); });
