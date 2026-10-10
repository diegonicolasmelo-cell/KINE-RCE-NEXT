// piso_letra_celular.js — A 390 px NINGÚN TEXTO VISIBLE BAJA DE 11 PX (tanda 5 · cambio 3 del plan de limpieza del registro de
// evolución, oct-2026).
//
// EL FALLO. Medido con un navegador de verdad (build/pantallazos.js --solo-registro, que vuelca `medidas.json`), a 390 px, con
// el reloj congelado y datos ficticios: la letra más chica que se VE era de 9,3 px, y no era un caso suelto. Bajo 11 px quedaban
// la barra inferior (`.mnav button`, .58rem = 9,3 px), los chips de ventilador y de equipos de la tarjeta de cama (`.vmtag` 9,9 y
// `.eqtag` 9,6), los chips de evaluaciones y pendientes (`.abadge`, .67rem = 10,7 px), las TRES PALABRAS DE ESTADO de cada tarjeta
// del Turno («Sin registrar» / «Registrado» / «Requiere revisión», `.mpal`, 9,9 px: la tanda 3 las puso para que se lean de un
// vistazo y quedaron en el tamaño menos legible de la pantalla), las etiquetas de casi todos los campos (`.col label`, 10,6 px) y
// los títulos de sub-bloque (10,9 px). El kinesiólogo lee de pie, con una mano, con luz de sala: 9 a 10 px está bajo el mínimo
// razonable, y el texto corrido ya estaba sobre 12.
//
// POR QUÉ UN PISO POR CSS Y NO REESCRIBIR EL HTML. Hay ~1.750 atributos `style` en línea sin un patrón dominante, y 217 con un
// tamaño de .6 a .69rem. Convertirlos a clases sería un cambio enorme y riesgoso (cada uno puede cambiar la apariencia). Un piso
// dentro de `@media (max-width:740px)` —con selectores de atributo para los tamaños en línea, la misma técnica que ya usa la
// regla de los títulos en línea— lo resuelve en unas pocas líneas y NO cambia nada en escritorio.
//
// LO QUE ESTA GUARDIA FIJA (Chromium, 390×844, táctil).
//   1. Tablero (Camas): cabecera, barra inferior, tarjetas ocupadas con el máximo de chips (ventilador, equipos del paciente,
//      prono, KTM suspendida, evaluaciones envejecidas y pendientes), cama libre, modo traslado y vista retrospectiva.
//   2. Panel de evolución de una cama ocupada: los SEIS pasos (Prevención, Turno, Evaluaciones, Terapia física, Planes, Relato)
//      con TODAS las tarjetas desplegadas (el acordeón del celular las trae plegadas y un texto dentro de una tarjeta plegada
//      no se ve), con los sub-bloques de Respiratorio abiertos y los <details> abiertos.
//   3. El paso 0 (ingreso de un paciente nuevo, cama libre): es el mismo panel, otro paso.
//   4. Vale lo que se VE: se descartan los nodos con `display:none`, `visibility:hidden`, `opacity:0` (el panel cerrado sigue en
//      el DOM con opacity 0) y la hoja «Más» cerrada, que vive debajo de la pantalla. El panel se mide solo dentro de `#sp`.
//   5. LO QUE CUESTA SUBIR LA LETRA NO SE ROMPE (se midió en las capturas del antes y el después): con letra más grande una etiqueta
//      que cabía en dos líneas pasa a tres (le pasó a «Fijación · cm de arcada dental», justo el caso por el que existe
//      legibilidad.js, que mide solo a 1400 px), un chip puede pisar a otro (el ventilador y los equipos del paciente se apilan en
//      posición absoluta con alturas fijas), la pantalla puede salirse por la derecha o un texto quedar cortado sin avisar.
//   6. No es una guardia vacía: exige haber medido un mínimo de textos por pantalla y haber VISTO las clases que más se
//      quedaban abajo (barra inferior, chips, palabra de estado, etiquetas). Si un cambio las esconde, esto se pone rojo en vez
//      de pasar medio vacío.
//
// 🪤 LISTA CERRADA DE EXCEPCIONES: una entrada se agrega con su motivo escrito y es una decisión consciente (ver EXCEPCIONES).
// 🪤 NO se mide en escritorio ni se baja el piso para que pase: si un chip desborda con la letra más grande, se le da espacio a ESE
//    chip (max-width, envoltura), no se achica la letra. Piso acordado: 11 px (.7rem = 11,2 px).
// 🪤 Reloj congelado: martes 10-mar-2026 10:00 con `clock.setFixedTime` (la fecha se INVENTA, fuera de las ventanas trampa:
//    Fiestas Patrias, cumpleaños, cierre de año y la media hora previa a cada cambio de turno). Solo datos ficticios.
//
// Uso: node build/checks/piso_letra_celular.js
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright-core');
const S = require(path.join(__dirname, '..', 'sim', 'sim_srv.js'));

const PISO = 11;   // px

/* Lista cerrada: selector (de la etiqueta que contiene el texto) → motivo. Vacía a propósito: hoy no hay nada que se quede chico
   con razón. Si una subíndice/superíndice tipográfico (<sub>, <sup>) aparece, se anota acá con su motivo. */
const EXCEPCIONES = [
  { sel: 'sub, sup', motivo: 'subíndices y superíndices (FiO₂, cmH₂O): el navegador los reduce a propósito, son tipografía y no texto de lectura' },
];

const pad = n => String(n).padStart(2, '0');
const HOY = new Date(2026, 2, 10, 10, 0, 0);
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const menosDias = n => iso(new Date(HOY.getTime() - n * 86400000));
S.SIM.fecha = iso(HOY);
S.SIM.hora = '10:00:00';

/* Una unidad con nombres largos y de perfiles distintos; las camas 8, 10 y 12 quedan libres. */
const PACIENTES = [
  { cama: '1', nombre: 'Rosa Elena Contreras Pino',  edad: 74, sexo: 'F', dx: 'Neumonía grave adquirida en la comunidad con derrame', va: 'TOT',     sop: 'VM',   dias: 9,  sopDias: 9 },
  { cama: '2', nombre: 'Luis Alberto Márquez Soto',  edad: 58, sexo: 'M', dx: 'Shock séptico de foco abdominal',                     va: 'TOT',     sop: 'VM',   dias: 3,  sopDias: 3 },
  { cama: '3', nombre: 'Marta Inés Pizarro Olguín',  edad: 66, sexo: 'F', dx: 'EPOC reagudizado',                                    va: 'Natural', sop: 'VNI',  dias: 5,  sopDias: 2 },
  { cama: '4', nombre: 'Jorge Andrés Vega Muñoz',    edad: 41, sexo: 'M', dx: 'Politraumatismo por accidente de tránsito',           va: 'TQT',     sop: 'VM',   dias: 24, sopDias: 21 },
  { cama: '5', nombre: 'Carmen Gloria Ríos Tapia',   edad: 81, sexo: 'F', dx: 'Insuficiencia cardíaca descompensada',                va: 'Natural', sop: 'CNAF', dias: 2,  sopDias: 2 },
  { cama: '6', nombre: 'Pedro Antonio Silva Cortés', edad: 63, sexo: 'M', dx: 'Hemorragia subaracnoidea',                            va: 'TOT',     sop: 'VM',   dias: 12, sopDias: 12 },
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

/** Corre en la página. Cada texto que se VE, con el tamaño computado de la etiqueta que lo contiene. */
const MEDIR = ({ raiz, excepciones }) => {
  const vistos = [];
  const w = document.createTreeWalker(raiz ? document.querySelector(raiz) : document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = w.nextNode());) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement;
    if (!el || /^(SCRIPT|STYLE|NOSCRIPT|OPTION|TEXTAREA)$/.test(el.tagName)) continue;
    if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (el.closest('.msheet:not(.on), .mvelo.hidden')) continue;
    if (excepciones.some(s => el.closest(s))) continue;
    vistos.push({
      tam: Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10,
      texto: n.nodeValue.trim().slice(0, 36),
      sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
    });
  }
  return vistos;
};

/** Agrupa lo que queda bajo el piso por selector: es lo que hay que arreglar, no cada instancia. */
const bajoElPiso = vistos => {
  const por = {};
  vistos.filter(x => x.tam < PISO).forEach(x => { const k = x.sel + ' · ' + x.tam + ' px'; (por[k] = por[k] || []).push(x.texto); });
  return Object.entries(por).sort((a, b) => parseFloat(a[0].split('· ')[1]) - parseFloat(b[0].split('· ')[1]))
    .map(([k, t]) => k + '  (' + t.length + ' texto' + (t.length > 1 ? 's' : '') + ', p. ej. «' + t[0] + '»)');
};

/** Corre en la página. Lo que se rompe al agrandar la letra: etiquetas en 3+ líneas, pantalla que se sale, texto cortado sin elipsis,
    y chips (ventilador / equipos del paciente) pisándose entre sí. Cada hallazgo es una frase lista para leer. */
const CAJAS = ({ raiz }) => {
  const R = raiz ? document.querySelector(raiz) : document;
  const hall = [];
  const nom = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '');
  const ver = el => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && el.getBoundingClientRect().width >= 1;
  // 1. Etiquetas de campo: 3 líneas o más estiran la fila entera (la razón de legibilidad.js, que mide a 1400 px).
  R.querySelectorAll('.col label').forEach(l => {
    if (!ver(l)) return;
    const lh = parseFloat(getComputedStyle(l).lineHeight) || parseFloat(getComputedStyle(l).fontSize) * 1.2;
    const n = Math.round(l.getBoundingClientRect().height / lh);
    if (n >= 3) hall.push('etiqueta en ' + n + ' líneas: «' + l.textContent.trim().slice(0, 40) + '»');
  });
  // 2. Texto cortado sin elipsis: el navegador recortó y nadie lo dice.
  R.querySelectorAll('*').forEach(n => {
    if (n.children.length || !n.textContent.trim() || !ver(n)) return;
    const cs = getComputedStyle(n);
    if (cs.overflowX === 'visible' && cs.overflowY === 'visible') return;
    if (cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none') return;   // se corta a propósito y lo avisa
    if (n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1) hall.push('texto cortado sin elipsis: ' + nom(n) + ' «' + n.textContent.trim().slice(0, 30) + '»');
  });
  // 3. Chips absolutos de una tarjeta de cama: no se pisan entre sí.
  R.querySelectorAll('.bcard').forEach(c => {
    const chips = [...c.querySelectorAll('.vmtag, .eqtag')].filter(ver).map(e => ({ e, r: e.getBoundingClientRect() }));
    for (let i = 0; i < chips.length; i++) for (let j = i + 1; j < chips.length; j++) {
      const a = chips[i].r, b = chips[j].r;
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1)
        hall.push('chips que se pisan en ' + (c.querySelector('.bnum') || {}).textContent + ': «' + chips[i].e.textContent.trim() + '» y «' + chips[j].e.textContent.trim() + '»');
    }
    // …y las insignias no se salen de la tarjeta por los lados.
    const cr = c.getBoundingClientRect();
    c.querySelectorAll('.abadge, .pill').forEach(b => { if (ver(b)) { const r = b.getBoundingClientRect(); if (r.right > cr.right + 1 || r.left < cr.left - 1) hall.push('insignia fuera de la tarjeta: «' + b.textContent.trim().slice(0, 30) + '»'); } });
  });
  // 4. La pantalla no se sale por la derecha.
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1) hall.push('la pantalla se sale por la derecha (' + de.scrollWidth + ' > ' + de.clientWidth + ')');
  const pc = document.querySelector('#sp .pcontent');
  if (raiz === '#sp' && pc && pc.scrollWidth > pc.clientWidth + 1) hall.push('el panel se desliza de lado (' + pc.scrollWidth + ' > ' + pc.clientWidth + ')');
  return [...new Set(hall)];
};

(async () => {
  const compilado = path.join(__dirname, '..', '_piso_letra.html');
  fs.writeFileSync(compilado, fs.readFileSync(path.join(__dirname, '..', '..', 'v2', 'index.html'), 'utf8').replace(/<\?=[\s\S]*?\?>/g, ''));
  const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pag = await navegador.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errores = [];
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
  const medir = raiz => pag.evaluate(MEDIR, { raiz: raiz || null, excepciones: EXCEPCIONES.map(e => e.sel) });

  /* ── Que el escenario sea el que dice ser ───────────────────────────────────────────────────────── */
  const base = await pag.evaluate(() => ({
    hoy: hoy(), movil: esMovil(), camas: document.querySelectorAll('#bedGrid .bcard').length,
    ocupadas: document.querySelectorAll('#bedGrid .bcard.occ').length,
  }));
  si('el reloj está congelado en la fecha inventada (10-mar-2026) y el navegador se ve como celular', base.hoy === '2026-03-10' && base.movil === true, JSON.stringify(base));
  si('el tablero se pintó con 6 camas ocupadas para medir', base.ocupadas === 6, JSON.stringify(base));

  /* ── 1 · TABLERO ────────────────────────────────────────────────────────────────────────────────── */
  console.log('\n1 · Tablero (Camas) a 390 px');
  await pag.evaluate(() => {
    const por = id => DB.find(c => String(c.ID_CAMA) === String(id));
    // El máximo de chips que compiten por el espacio de una tarjeta, como en la unidad de verdad.
    Object.assign(por('4'), { VM_TAG: 'V60-03', VM_TAG_ESTADO: 'En uso', VM_TAG_ID: 'v3', PRONO_DESDE: '2026-03-09 20:00', KTM_SUSP: 'TRUE',
      EQUIPOS_PACIENTE: [{ c: 'APOYO', n: 'Aspirador', e: 'En uso', id: 'q9' }] });
    Object.assign(por('3'), { EQUIPOS_PACIENTE: [{ c: 'VNI', n: 'Airvo 2 B', e: 'En uso', id: 'q1' }] });
    Object.assign(por('5'), { EQUIPOS_PACIENTE: [{ c: 'CNAF', n: 'Airvo 2 A', e: 'En uso', id: 'q2' }], ULT_COOP: 'Cooperador',
      ULT_MRC: 52, ULT_MRC_FECHA: '2026-03-02', ULT_MRC_FIRMA: 'DMV', ULT_FSS: 31, ULT_FSS_FECHA: '2026-03-09', ULT_FSS_FIRMA: 'DMV' });
    Object.assign(por('6'), { ULT_COOP: 'Cooperador' });
    Object.assign(por('1'), { VM_TAG: 'PB980-01', VM_TAG_ESTADO: 'En uso', VM_TAG_ID: 'v1' });
    EVO_SET.add('4'); EVO_SET.add('5');
    renderGrid();
    document.querySelectorAll('.toast, .tut-hola, .tut-bubble').forEach(n => n.remove());
  });
  await pag.waitForTimeout(300);
  const T1 = await medir();
  const clases = vistos => s => vistos.some(x => x.sel.includes(s));
  si('se midió la pantalla entera (más de 100 textos)', T1.length > 100, T1.length + ' textos');
  si('…y se VIERON la barra inferior, los chips de ventilador y de equipos y los de evaluaciones',
    ['mnav', 'vmtag', 'eqtag', 'abadge'].every(s => clases(T1)(s)), 'faltan: ' + ['mnav', 'vmtag', 'eqtag', 'abadge'].filter(s => !clases(T1)(s)).join(', '));
  let b = bajoElPiso(T1);
  si('tablero: ningún texto visible baja de ' + PISO + ' px', b.length === 0, b.join('\n   '));
  const caja = (raiz) => pag.evaluate(CAJAS, { raiz: raiz || null });
  /* El peor caso de chips: UNA cama con el ventilador, la VNI y un dispositivo de apoyo a la vez (se apilan con alturas fijas). */
  await pag.evaluate(() => {
    const c = DB.find(x => String(x.ID_CAMA) === '2');
    Object.assign(c, { VM_TAG: 'V60-04', VM_TAG_ESTADO: 'En uso', VM_TAG_ID: 'v4', EQUIPOS_PACIENTE: [
      { c: 'VNI', n: 'Airvo 2 C', e: 'En uso', id: 'q3' }, { c: 'APOYO', n: 'Aspirador', e: 'En uso', id: 'q4' }] });
    renderGrid();
  });
  await pag.waitForTimeout(250);
  let cj = await caja();
  si('tablero: nada se rompe al agrandar la letra (chips que se pisan, insignias fuera de la tarjeta, texto cortado, pantalla que se sale)', cj.length === 0, cj.join('\n   '));

  await pag.evaluate(() => { MOVECAMA = null; mover('3'); document.querySelectorAll('.toast').forEach(n => n.remove()); });
  await pag.waitForTimeout(250);
  const T2 = await medir();
  b = bajoElPiso(T2);
  si('tablero en modo traslado (Intercambiar / Mover aquí / Cancelar): ningún texto baja de ' + PISO + ' px', b.length === 0, b.join('\n   '));
  cj = await caja();
  si('tablero en modo traslado: nada se corta ni se sale', cj.length === 0, cj.join('\n   '));
  await pag.evaluate(() => { MOVECAMA = null; renderGrid(); });

  await pag.evaluate(() => {
    const d = '2026-03-09', g = document.getElementById('gDate');
    g.value = d; g.classList.remove('turno-hoy');
    EVOS_DIA = [{ ID_CAMA: '1', TURNO_KEY: d + '-' + SHIFT, PAC_NOMBRE: 'Rosa Elena Contreras Pino', PAC_EDAD: 74, PAC_SEXO: 'F',
      PAC_DIAGNOSTICO: 'Neumonía grave adquirida en la comunidad', VENT_SOPORTE: 'VM', VENT_VIA_AEREA: 'TOT', VENT_MODO: 'ACVC',
      DIA_ESTADIA: 8, DIAS_VM: 8, PLAN_FIRMA_KINE: 'DMV', PATIENT_ID: 'pid-1', COD_PACIENTE: 'C1' }];
    EVO_SET = new Set(['1']);
    renderGrid();
  });
  await pag.waitForTimeout(250);
  const T3 = await medir();
  si('vista retrospectiva: se pintó la franja y la tarjeta reconstruida', T3.some(x => /viendo/i.test(x.texto)) && T3.some(x => /Ver \/ editar/.test(x.texto)), '');
  b = bajoElPiso(T3);
  si('tablero en vista retrospectiva: ningún texto baja de ' + PISO + ' px', b.length === 0, b.join('\n   '));
  await pag.evaluate(() => {
    const g = document.getElementById('gDate'); g.value = '2026-03-10'; g.classList.add('turno-hoy');
    EVOS_DIA = []; EVO_SET = new Set(['4', '5']); renderGrid();
  });

  /* ── 2 · PANEL: LOS SEIS PASOS ──────────────────────────────────────────────────────────────────── */
  console.log('\n2 · Panel de evolución a 390 px: los seis pasos, todo desplegado');
  await pag.evaluate(() => { setTab('G'); abrirPanel('1', false); });
  await pag.waitForTimeout(1000);
  // Lo mismo que movil_panel.js: un paciente ventilado con algunos datos, para que los encabezados digan algo.
  await pag.evaluate(() => {
    const poner = (id, val) => { const e = document.getElementById(id); if (e) { e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); } };
    poner('fSed', 'Escalón 2'); poner('r_vt', '420'); poner('r_peep', '8'); poner('r_fio2', '40');
    if (typeof _rielDeb === 'function') _rielDeb();
  });
  const vistosPanel = [];
  for (let n = 1; n <= 6; n++) {
    await pag.evaluate(paso => {
      pasoIr(paso);
      document.querySelectorAll('#sp .fcard.mcol').forEach(f => f.classList.remove('mcol'));
      document.querySelectorAll('#sp .msub.cerrado').forEach(f => f.classList.remove('cerrado'));
      document.querySelectorAll('#sp details').forEach(d => { d.open = true; });
    }, n);
    await pag.waitForTimeout(300);
    const P = await medir('#sp');
    vistosPanel.push(...P);
    si('paso ' + n + ': se midió el paso (' + P.length + ' textos)', P.length >= 25, P.length + ' textos');
    b = bajoElPiso(P);
    si('paso ' + n + ': ningún texto visible baja de ' + PISO + ' px', b.length === 0, b.join('\n   '));
    cj = await caja('#sp');
    si('paso ' + n + ': con la letra más grande nada se rompe (etiquetas en 3 líneas, texto cortado, panel que se desliza de lado)', cj.length === 0, cj.join('\n   '));
    /* 🔎 Y lo que hoy está TAPADO: el panel abre ramas según lo que se elige (PVE sí / no, extubación, TQT, AET, procedimientos…) y esas
       ramas nacen con `.hidden`. Se destapan todas un momento —solo se mide el tamaño de la letra— para que un texto chico no se esconda
       en una rama que esta corrida no abrió. Se vuelven a tapar enseguida. */
    const destapadas = await pag.evaluate(() => {
      const q = [...document.querySelectorAll('#sp .fcard:not(.paso-oculto) .hidden, #sp [data-paso]:not(.paso-oculto) .hidden')];
      q.forEach(e => e.classList.remove('hidden')); window.__q = q; return q.length;
    });
    b = bajoElPiso(await medir('#sp'));
    await pag.evaluate(() => { (window.__q || []).forEach(e => e.classList.add('hidden')); });
    si('paso ' + n + ': con sus ' + destapadas + ' ramas ocultas destapadas, ningún texto baja de ' + PISO + ' px', b.length === 0, b.join('\n   '));
  }
  si('en los pasos se VIERON la palabra de estado de las tarjetas, las etiquetas de campo y los títulos de sub-bloque',
    ['mpal', 'label', 'sub-sec-title'].every(s => clases(vistosPanel)(s)), 'faltan: ' + ['mpal', 'label', 'sub-sec-title'].filter(s => !clases(vistosPanel)(s)).join(', '));
  si('…y el chip de pendientes (.abadge) que viaja en la cabecera del paciente', clases(vistosPanel)('abadge'), '');

  /* ── 3 · PASO 0: INGRESO ────────────────────────────────────────────────────────────────────────── */
  console.log('\n3 · Ingreso de un paciente (paso 0) a 390 px');
  await pag.evaluate(() => { try { cerrarPanel(); } catch (e) {} });
  await pag.waitForTimeout(500);
  await pag.evaluate(() => { abrirPanel('8', true); });
  await pag.waitForTimeout(1000);
  await pag.evaluate(() => {
    document.querySelectorAll('#sp .fcard.mcol').forEach(f => f.classList.remove('mcol'));
    document.querySelectorAll('#sp .msub.cerrado').forEach(f => f.classList.remove('cerrado'));
    document.querySelectorAll('#sp details').forEach(d => { d.open = true; });
  });
  const P0 = await medir('#sp');
  si('el ingreso abre en el paso 0 y se midió (' + P0.length + ' textos)', (await pag.evaluate(() => PASO_ACTUAL)) === 0 && P0.length >= 25, P0.length + ' textos');
  b = bajoElPiso(P0);
  si('paso 0 (ingreso): ningún texto visible baja de ' + PISO + ' px', b.length === 0, b.join('\n   '));
  cj = await caja('#sp');
  si('paso 0 (ingreso): nada se rompe con la letra más grande', cj.length === 0, cj.join('\n   '));

  /* ── 4 · EL PISO NO SE FILTRA A ESCRITORIO ──────────────────────────────────────────────────────── */
  console.log('\n4 · Escritorio no cambia');
  /* Las reglas del piso viven dentro de `@media (max-width:740px)`. Se mide el tamaño COMPUTADO a 1400 px, que es lo que de
     verdad llega al escritorio: un piso escrito por error FUERA del bloque lo agrandaría también allá y esto se pondría rojo. */
  const pagE = await navegador.newPage({ viewport: { width: 1400, height: 950 } });
  await pagE.clock.setFixedTime(HOY);
  await pagE.exposeFunction('__gasApi', (a, d, t) => { let r; try { r = S.api(a, d, t); } catch (e) { r = { ok: false, error: e.message }; } return JSON.stringify(r); });
  await pagE.addInitScript(() => {
    window.google = { script: { run: { withSuccessHandler(o) { return { withFailureHandler(f) { return {
      async api(a, d, t) { const r = JSON.parse(await window.__gasApi(a, d || {}, t || null)); if (r.ok) o(r); else f(r.error); }
    }; } }; } } } };
  });
  await pagE.goto('file://' + compilado);
  await pagE.waitForTimeout(1200);
  const E = await pagE.evaluate(() => {
    const tam = s => { const e = document.querySelector(s); return e ? Math.round(parseFloat(getComputedStyle(e).fontSize) * 10) / 10 : null; };
    return { abadge: tam('#bedGrid .abadge'), label: (() => { const e = document.querySelector('.col label'); return e ? Math.round(parseFloat(getComputedStyle(e).fontSize) * 10) / 10 : null; })(), eqtag: tam('.eqtag'), vmtag: tam('.vmtag') };
  });
  /* En escritorio las clases conservan su tamaño de siempre: .abadge .67rem (10,7), `.col label` .68rem (10,9). */
  si('escritorio: los chips de evaluaciones siguen en su tamaño de siempre (10,7 px)', E.abadge === 10.7, JSON.stringify(E));
  si('escritorio: las etiquetas de campo siguen en su tamaño de siempre (10,9 px)', E.label === null || E.label === 10.9, JSON.stringify(E));
  await pagE.close();

  await navegador.close();
  fs.unlinkSync(compilado);
  si('sin errores de JavaScript en la página', errores.length === 0, errores.join(' | '));
  if (fails.length) { console.log('\n❌ ' + fails.length + ' fallan'); process.exit(1); }
  console.log('\n✅ todo verde');
})().catch(e => { console.error('❌ la guardia reventó: ' + (e && e.stack || e)); process.exit(1); });
