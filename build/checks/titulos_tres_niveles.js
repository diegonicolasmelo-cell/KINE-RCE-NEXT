// titulos_tres_niveles.js — UN SOLO ESTILO DE TÍTULO DE BLOQUE, EN TRES NIVELES QUE SE DISTINGUEN (tanda 5 · cambio 4 del plan de
// limpieza del registro de evolución, oct-2026).
//
// EL FALLO. Medido en un navegador de verdad (build/pantallazos.js --solo-registro y la exploración de esta guardia), el título de
// un sub-bloque («Terapia ventilatoria», «GCS», «Lo que este episodio lleva medido», «Antes de la terapia») salía en SEIS
// combinaciones de tamaño, peso, espaciado y color según quién lo escribió: `.sub-sec-title` (.68rem, .06em, a veces en el color del
// dominio puesto en línea), `.pe2-t` (.68rem, .08em), `.pv-sep span` (.66rem, .08em), `#fcId .bloqueT` (.68rem, peso 700, gris
// de otro token), `#aetTurno .aetT-tit` (.68rem, peso 700, morado), los títulos escritos en línea con peso 800 y mayúsculas —que una
// regla global aplastaba a .62rem, 9,9 px— y, en el celular, `.msub-t` (.68rem, azul). Más los tres bloques de Planes (`.cg-t`),
// que tenían su propia forma: .8rem, sin mayúsculas, un color por bloque, MÁS GRANDES que el título de su propia tarjeta.
// Resultado: el título de un sub-bloque (9,9 px) quedaba más chico que la etiqueta de cualquiera de sus campos (10,9 px). El título
// no mandaba, y el ojo no encontraba el bloque antes que el campo.
//
// LA REGLA (tres niveles, escalera de a un escalón; el color de DOMINIO sigue en el punto y en el borde de la tarjeta):
//   T1 · título de TARJETA  `.fcard-title`  .78rem · 800 · mayúsculas · .08em · color de dominio (`--fc-t`/`--fc`) + punto.
//   T2 · título de SUB-BLOQUE (UNA sola tupla)  .72rem · 800 · mayúsculas · .06em · `--muted`.
//   T3 · etiqueta de CAMPO  `.col label`  (no se toca: .68rem / 700 / .05em en escritorio, .7rem / .03em en el celular por el piso).
//
// 🔴 LO QUE ESTA GUARDIA FIJA (Chromium, a 1400 y a 390 px, reloj congelado, datos ficticios, las seis pestañas del panel con TODO
//    desplegado y las ramas ocultas destapadas, más el ingreso de un paciente nuevo):
//   1. Hay UNA sola tupla (tamaño, peso, mayúsculas, espaciado, color) para T2, en TODAS las familias de títulos de sub-bloque
//      (clases, títulos escritos en línea con peso 800 + mayúsculas, y los tres bloques de Planes), y su color ES el token `--muted`.
//   2. Hay UNA sola tupla para T1 salvo el color de dominio (que es justamente lo que lo distingue), y T3 es una sola por ancho.
//   3. La escalera se nota: T1 > T2 > T3 en tamaño, con un escalón mínimo entre niveles, y el título de un sub-bloque NUNCA es más
//      chico que la etiqueta normal de un campo.
//   4. Un título de T1 no se corta ni pasa de dos líneas en el celular (subirlo a .78rem podía partir «Respiratorio — Terapia
//      ventilatoria» en tres), y ningún título de sub-bloque queda cortado.
//   5. BARRIDO, no lista de selectores: cualquier otro texto en mayúsculas y peso ≥ 700 dentro del panel que no esté clasificado ni en
//      la lista cerrada de excepciones se informa, para que un QUINTO estilo de título no entre sin que nadie lo decida.
//   6. No es una guardia vacía: exige haber VISTO cada familia de título (y `.msub-t` en el celular, `.bloqueT` en el ingreso).
//
// 🪤 LISTA CERRADA DE EXCEPCIONES (barrido): cada entrada lleva su motivo; agregar una es una decisión consciente.
// 🪤 NO se baja un nivel para que pase: si un título largo envuelve, se le da espacio a ESE título, no se achica la escalera.
// 🪤 Reloj congelado: martes 10-mar-2026 10:00 con `clock.setFixedTime` (la fecha se INVENTA, fuera de las ventanas trampa:
//    Fiestas Patrias, cumpleaños, cierre de año y la media hora previa a cada cambio de turno). Solo datos ficticios.
//
// Uso: node build/checks/titulos_tres_niveles.js
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright-core');
const S = require(path.join(__dirname, '..', 'sim', 'sim_srv.js'));

/* Los selectores que SON título de sub-bloque (T2). La clase aislada no basta: los títulos escritos en línea no tienen clase. */
const T2_CLASES = ['.sub-sec-title', '.pe2-t', '.msub-t', '.pv-sep span', '#fcId .bloqueT', '#aetTurno .aetT-tit', '.cg-t'];
const T2_EN_LINEA = '#sp [style*="font-weight:800"][style*="text-transform:uppercase"]';
/* Lo que el panel DEBE mostrar en algún momento de la corrida: si desaparece, la guardia estaría midiendo en el vacío. */
const FAMILIAS_ESCRITORIO = ['.sub-sec-title', '.pe2-t', '.pv-sep span', '#aetTurno .aetT-tit', '.cg-t', 'en línea'];
const FAMILIAS_CELULAR = FAMILIAS_ESCRITORIO.concat(['.msub-t']);
const FAMILIAS_INGRESO = ['#fcId .bloqueT'];

/* Mínimos de la escalera, en píxeles (a 16 px por rem): T1 .78rem = 12,48 · T2 .72rem = 11,52 · T3 .68rem = 10,88 en escritorio y
   .7rem = 11,2 en el celular (piso de 11 px de la tanda 5, cambio 3: ahí T2 y T3 quedan a .32 px, y los separa el peso, el espaciado y
   la posición). El escalón T1→T2 se exige de casi un píxel; el T2→T3, de .3. */
const ESCALON_T1_T2 = 0.8;
const ESCALON_T2_T3 = 0.3;

/* Lista cerrada del barrido: selector (del elemento, o de un ancestro) → motivo. */
const EXCEPCIONES = [
  { sel: 'label, label *', motivo: 'etiquetas de campo (T3): algunas llevan tamaño propio en línea y no son título de bloque' },
  { sel: '.cg-r', motivo: 'rótulo del reloj de cada bloque de Planes («va al relato de hoy», «cierra el relato», «hasta que alguien lo cierre»): una etiqueta mono, no un título' },
  { sel: 'button, .abadge, .pill, .mpal, .mst, .mres, summary *', motivo: 'botones, insignias y palabras de estado: llevan su propio estilo de control' },
  { sel: 'div[style*="font-weight:700"][style*="text-transform:uppercase"]', motivo: 'rótulos de COLUMNA dentro de la tarjeta de Permeabilización («Técnica», «Secreciones», 700): nivel de etiqueta de campo, no de bloque' },
  { sel: '.fcard-title', motivo: 'T1: se mide aparte' },
];

const pad = n => String(n).padStart(2, '0');
const HOY = new Date(2026, 2, 10, 10, 0, 0);
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const menosDias = n => iso(new Date(HOY.getTime() - n * 86400000));
S.SIM.fecha = iso(HOY);
S.SIM.hora = '10:00:00';

{
  /* Cama 1 ocupada y ventilada (panel completo: las seis pestañas). La 8 queda libre (ingreso de un paciente nuevo). */
  const c = S.DB.CAMAS_ESTADO.find(x => String(x.ID_CAMA) === '1');
  Object.assign(c, {
    OCUPADA: true, STATUS_CAMA: 'Ocupada', PATIENT_ID: 'pid-1', COD_PACIENTE: 'C1',
    NOMBRE: 'Rosa Elena Contreras Pino', EDAD: 74, SEXO: 'F', DIAGNOSTICO: 'Neumonía grave adquirida en la comunidad',
    VIA_AEREA: 'TOT', SOPORTE: 'VM', MODO: 'ACVC', TALLA_CM: 158,
    FECHA_INGRESO: menosDias(8), TS_INGRESO: menosDias(8) + ' 08:30',
    FECHA_INICIO_SOPORTE: menosDias(8), FECHA_INICIO_VA: menosDias(8), FIRMA_KINE: 'DMV',
  });
}

const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined ? '' : '\n   ' + detalle));
  if (!cond) fails.push(l);
};

/** Corre en la página. Mide los títulos visibles del panel: T1, T2 (por clase y en línea), T3 y el barrido de lo no clasificado. */
const MEDIR = ({ t2Clases, t2EnLinea, excepciones }) => {
  const nom = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '');
  const ver = el => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && el.getBoundingClientRect().width >= 1 && el.getBoundingClientRect().height >= 1;
  const propio = el => [...el.childNodes].filter(n => n.nodeType === 3 && n.nodeValue.trim()).map(n => n.nodeValue.trim()).join(' ');
  const mover = el => { const cs = getComputedStyle(el); const tam = parseFloat(cs.fontSize); return {
    tam: Math.round(tam * 100) / 100, peso: cs.fontWeight, trans: cs.textTransform,
    esp: cs.letterSpacing === 'normal' ? 0 : Math.round(parseFloat(cs.letterSpacing) / tam * 1000) / 1000, color: cs.color }; };
  const lineas = el => { const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.25; return Math.round(el.getBoundingClientRect().height / lh); };
  const cortado = el => el.scrollWidth > el.clientWidth + 1;
  const base = (el, texto) => Object.assign({ sel: nom(el), texto: (texto || propio(el) || el.textContent).replace(/\s+/g, ' ').trim().slice(0, 34) }, mover(el));
  // El token de --muted tal como lo resuelve el navegador (mismo formato que getComputedStyle).
  const probe = document.createElement('i'); probe.style.color = 'var(--muted)'; document.body.appendChild(probe);
  const muted = getComputedStyle(probe).color; probe.remove();

  const sp = document.querySelector('#sp');
  const R = { muted, t1: [], t2: [], t3: [], suelto: [], familias: [] };
  // T1
  sp.querySelectorAll('.fcard-title').forEach(el => { if (ver(el)) R.t1.push(Object.assign(base(el), { lineas: lineas(el), cortado: cortado(el) })); });
  // T2: por clase, y los escritos en línea (peso 800 + mayúsculas) que no tienen clase.
  const yaT2 = new Set();
  const poner = (el, fam) => { if (yaT2.has(el) || !ver(el)) return; yaT2.add(el); R.t2.push(Object.assign(base(el), { familia: fam, cortado: cortado(el) })); if (!R.familias.includes(fam)) R.familias.push(fam); };
  t2Clases.forEach(s => sp.querySelectorAll(s).forEach(el => poner(el, s)));
  sp.querySelectorAll(t2EnLinea.replace(/^#sp /, '')).forEach(el => { if (!el.closest('.fcard-title')) poner(el, 'en línea'); });
  // T3: la etiqueta normal de un campo (sin tamaño propio en línea).
  sp.querySelectorAll('.col label:not([style])').forEach(el => { if (ver(el)) R.t3.push(base(el)); });
  // Barrido: mayúsculas con peso ≥ 700 que nadie clasificó.
  sp.querySelectorAll('*').forEach(el => {
    if (!propio(el) || !ver(el) || yaT2.has(el)) return;
    if (/^(SCRIPT|STYLE|OPTION)$/.test(el.tagName)) return;
    // Un texto DENTRO de un título ya clasificado (p. ej. el <span>📏 Evaluaciones</span> de un .sub-sec-title) hereda su estilo.
    for (let a = el.parentElement; a && a !== sp; a = a.parentElement) if (yaT2.has(a)) return;
    const cs = getComputedStyle(el);
    if (cs.textTransform !== 'uppercase' || parseInt(cs.fontWeight, 10) < 700) return;
    if (excepciones.some(s => el.matches(s))) return;
    R.suelto.push(base(el));
  });
  return R;
};

/** Agrupa por tupla y la cuenta; es lo que se imprime cuando hay más de una. */
const tupla = x => [x.tam + ' px', 'peso ' + x.peso, x.trans, x.esp + ' em', x.color].join(' · ');
const tuplas = lista => {
  const por = {};
  lista.forEach(x => { const k = tupla(x); (por[k] = por[k] || []).push(x); });
  return por;
};
const informe = lista => Object.entries(tuplas(lista)).sort((a, b) => b[1].length - a[1].length)
  .map(([k, v]) => k + '   ×' + v.length + '  (p. ej. ' + [...new Set(v.map(x => x.sel.replace(/^(\w+)\./, '.') + ' «' + x.texto + '»'))].slice(0, 2).join('; ') + ')').join('\n   ');

(async () => {
  const compilado = path.join(__dirname, '..', '_titulos_tres_niveles.html');
  fs.writeFileSync(compilado, fs.readFileSync(path.join(__dirname, '..', '..', 'v2', 'index.html'), 'utf8').replace(/<\?=[\s\S]*?\?>/g, ''));
  const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const errores = [];

  const abrir = async ancho => {
    const pag = await navegador.newPage(ancho < 800
      ? { viewport: { width: ancho, height: 844 }, isMobile: true, hasTouch: true }
      : { viewport: { width: ancho, height: 950 } });
    pag.on('pageerror', e => errores.push(e.message));
    await pag.clock.setFixedTime(HOY);   // Date congelado; los temporizadores siguen corriendo
    await pag.exposeFunction('__gasApi', (a, d, t) => {
      let r; try { r = S.api(a, d, t); } catch (e) { r = { ok: false, error: e.message }; }
      return JSON.stringify(r);
    });
    await pag.addInitScript(() => {
      window.google = { script: { run: { withSuccessHandler(o) { return { withFailureHandler(f) { return {
        async api(a, d, t) { const r = JSON.parse(await window.__gasApi(a, d || {}, t || null)); if (r.ok) o(r); else f(r.error); }
      }; } }; } } } };
    });
    await pag.goto('file://' + compilado);
    await pag.waitForTimeout(1500);
    return pag;
  };
  const medir = pag => pag.evaluate(MEDIR, { t2Clases: T2_CLASES, t2EnLinea: T2_EN_LINEA, excepciones: EXCEPCIONES.map(e => e.sel) });
  const desplegar = pag => pag.evaluate(() => {
    document.querySelectorAll('#sp .fcard.mcol').forEach(f => f.classList.remove('mcol'));
    document.querySelectorAll('#sp .msub.cerrado').forEach(f => f.classList.remove('cerrado'));
    document.querySelectorAll('#sp details').forEach(d => { d.open = true; });
  });
  /* Las ramas que nacen con `.hidden` (PVE sí/no, extubación, TQT, AET, procedimientos…) se destapan un momento: un título de
     sub-bloque puede vivir en una rama que la corrida no abrió. Se miden y se vuelven a tapar. */
  const destapar = pag => pag.evaluate(() => {
    const q = [...document.querySelectorAll('#sp .fcard:not(.paso-oculto) .hidden, #sp [data-paso]:not(.paso-oculto) .hidden')];
    q.forEach(e => e.classList.remove('hidden')); window.__q = q; return q.length;
  });
  const tapar = pag => pag.evaluate(() => { (window.__q || []).forEach(e => e.classList.add('hidden')); });

  /** Recorre las seis pestañas del panel (cama 1) y el ingreso (cama 8) y junta TODO lo medido en un solo informe. */
  const recorrer = async ancho => {
    const pag = await abrir(ancho);
    const todo = { muted: '', t1: [], t2: [], t3: [], suelto: [], familias: [], ingresoFamilias: [], pasos: 0 };
    const sumar = (R, ingreso) => {
      todo.muted = R.muted;
      todo.t1.push(...R.t1); todo.t2.push(...R.t2); todo.t3.push(...R.t3); todo.suelto.push(...R.suelto);
      (ingreso ? todo.ingresoFamilias : todo.familias).push(...R.familias);
    };
    await pag.evaluate(() => { setTab('G'); abrirPanel('1', false); });
    await pag.waitForTimeout(1000);
    for (let n = 1; n <= 6; n++) {
      await pag.evaluate(paso => pasoIr(paso), n);
      await desplegar(pag);
      await pag.waitForTimeout(300);
      sumar(await medir(pag), false);
      await destapar(pag);
      sumar(await medir(pag), false);
      await tapar(pag);
      todo.pasos++;
    }
    await pag.evaluate(() => { try { cerrarPanel(); } catch (e) {} });
    await pag.waitForTimeout(500);
    await pag.evaluate(() => { abrirPanel('8', true); });
    await pag.waitForTimeout(1000);
    await desplegar(pag);
    sumar(await medir(pag), true);
    await destapar(pag);
    sumar(await medir(pag), true);
    await pag.close();
    return todo;
  };

  for (const [etiqueta, ancho, familias] of [['escritorio (1400 px)', 1400, FAMILIAS_ESCRITORIO], ['celular (390 px)', 390, FAMILIAS_CELULAR]]) {
    console.log('\n' + etiqueta);
    const M = await recorrer(ancho);
    const u = x => [...new Set(x)];
    si('se midió el panel entero (seis pasos) y se VIERON todas las familias de título de sub-bloque: ' + familias.join(', '),
      M.pasos === 6 && familias.every(f => M.familias.includes(f)), 'faltan: ' + familias.filter(f => !M.familias.includes(f)).join(', ') + ' · vistas: ' + u(M.familias).join(', '));
    si('…y en el ingreso (paso 0) se VIO el título de bloque «' + FAMILIAS_INGRESO[0] + '»', FAMILIAS_INGRESO.every(f => M.ingresoFamilias.includes(f)), 'vistas: ' + u(M.ingresoFamilias).join(', '));
    si('…y hay títulos de tarjeta y etiquetas de campo de sobra (T1 ≥ 10, T3 ≥ 25)', u(M.t1.map(x => x.sel + x.texto)).length >= 10 && M.t3.length >= 25, 'T1: ' + M.t1.length + ' · T3: ' + M.t3.length);

    // 1 · una sola tupla de T2
    const t2 = tuplas(M.t2);
    si('T2 · los ' + M.t2.length + ' títulos de sub-bloque comparten UNA sola tupla (tamaño, peso, mayúsculas, espaciado, color)', Object.keys(t2).length === 1,
      Object.keys(t2).length + ' tuplas distintas:\n   ' + informe(M.t2));
    si('T2 · su color es el token --muted', M.t2.length > 0 && M.t2.every(x => x.color === M.muted), 'esperado ' + M.muted + ' · ' + u(M.t2.filter(x => x.color !== M.muted).map(x => x.color)).join(', '));
    si('T2 · peso 800 y mayúsculas', M.t2.length > 0 && M.t2.every(x => x.peso === '800' && x.trans === 'uppercase'), u(M.t2.filter(x => x.peso !== '800' || x.trans !== 'uppercase').map(x => x.sel + ' peso ' + x.peso + ' ' + x.trans)).join(' | '));

    // 2 · T1 una sola tupla salvo el color de dominio; T3 una sola por ancho
    const sinColor = lista => lista.map(x => Object.assign({}, x, { color: '(dominio)' }));
    const t1 = tuplas(sinColor(M.t1));
    si('T1 · los ' + M.t1.length + ' títulos de tarjeta comparten una sola tupla salvo el color de dominio', Object.keys(t1).length === 1, Object.keys(t1).length + ' tuplas distintas:\n   ' + informe(sinColor(M.t1)));
    const t3 = tuplas(M.t3);
    si('T3 · las etiquetas normales de campo comparten una sola tupla', Object.keys(t3).length === 1, Object.keys(t3).length + ' tuplas distintas:\n   ' + informe(M.t3));

    // 3 · la escalera (con los EXTREMOS de cada nivel: el más chico de T1 sobre el más grande de T2, y el más chico de T2 sobre el de T3)
    if (M.t1.length && M.t2.length && M.t3.length) {
      const mn = l => Math.min(...l.map(x => x.tam)), mx = l => Math.max(...l.map(x => x.tam));
      const rango = l => mn(l) === mx(l) ? mn(l) + ' px' : mn(l) + ' a ' + mx(l) + ' px';
      si('la escalera se nota: T1 (' + rango(M.t1) + ') > T2 (' + rango(M.t2) + ') > T3 (' + rango(M.t3) + ')', mn(M.t1) > mx(M.t2) && mn(M.t2) > mx(M.t3),
        'T1 ' + rango(M.t1) + ' · T2 ' + rango(M.t2) + ' · T3 ' + rango(M.t3));
      si('…con un escalón de al menos ' + ESCALON_T1_T2 + ' px de T1 a T2 y ' + ESCALON_T2_T3 + ' px de T2 a T3',
        mn(M.t1) - mx(M.t2) >= ESCALON_T1_T2 && mn(M.t2) - mx(M.t3) >= ESCALON_T2_T3,
        'T1−T2 = ' + (mn(M.t1) - mx(M.t2)).toFixed(2) + ' px · T2−T3 = ' + (mn(M.t2) - mx(M.t3)).toFixed(2) + ' px');
    }
    const chicos = M.t2.filter(x => M.t3.length && x.tam < Math.max(...M.t3.map(y => y.tam)));
    si('el título de un sub-bloque NUNCA es más chico que la etiqueta normal de sus campos', chicos.length === 0,
      u(chicos.map(x => x.sel + ' «' + x.texto + '» ' + x.tam + ' px < ' + Math.max(...M.t3.map(y => y.tam)) + ' px')).join('\n   '));

    // 4 · nada se corta
    const largos = M.t1.filter(x => x.lineas > 2 || x.cortado);
    si('ningún título de tarjeta pasa de dos líneas ni queda cortado', largos.length === 0, u(largos.map(x => '«' + x.texto + '» ' + x.lineas + ' líneas' + (x.cortado ? ', cortado' : ''))).join('\n   '));
    const cortados = M.t2.filter(x => x.cortado);
    si('ningún título de sub-bloque queda cortado', cortados.length === 0, u(cortados.map(x => x.sel + ' «' + x.texto + '»')).join('\n   '));

    // 5 · barrido
    const sueltos = tuplas(M.suelto);
    si('barrido: ningún otro texto en mayúsculas y peso ≥ 700 del panel queda sin clasificar (ni es un quinto estilo de título)', M.suelto.length === 0,
      Object.entries(sueltos).map(([k, v]) => k + '  ×' + v.length + '  (p. ej. ' + u(v.map(x => x.sel + ' «' + x.texto + '»')).slice(0, 3).join('; ') + ')').join('\n   '));
  }

  await navegador.close();
  fs.unlinkSync(compilado);
  si('sin errores de JavaScript en la página', errores.length === 0, errores.join(' | '));
  if (fails.length) { console.log('\n❌ ' + fails.length + ' fallan'); process.exit(1); }
  console.log('\n✅ todo verde');
})().catch(e => { console.error('❌ la guardia reventó: ' + (e && e.stack || e)); process.exit(1); });
