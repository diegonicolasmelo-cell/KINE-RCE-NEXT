// tarjeta_acciones.js — LA TARJETA DE CAMA DICE CUÁL ES LA ACCIÓN DE TODOS LOS TURNOS Y DEJA LAS OTRAS TRES COMO SECUNDARIAS (tanda 5 ·
// cambio 5 del plan de limpieza del registro de evolución, oct-2026).
//
// EL FALLO. El pie de la tarjeta de cama (`.bfoot`) tenía CUATRO botones con el mismo peso en una sola fila, y cada uno envolvía donde
// caía: «📝 Evolución» (la acción de todos los turnos, de todas las camas) medía el 31 % del pie y se leía igual que «🏠 Egr.», que es
// la acción MENOS frecuente y la MÁS difícil de deshacer —y encima iba en verde, el color de «lo bueno»—. El botón de evento (➕) era un
// solo icono de 51 px de ancho sin texto, el más difícil de acertar con el pulgar, pegado al de egreso. Con guantes, de pie y con una
// mano, el toque equivocado más caro estaba al lado del más barato.
//
// LA REGLA. Evolución / Editar va PRIMERO, SOLO en su fila y a todo el ancho. Historial, evento y Egreso van debajo, en UNA segunda
// fila, los tres con el MISMO aspecto neutro (el egreso se distingue por su rótulo completo, «Egreso», no por el color).
//
// 🔴 LO QUE ESTA GUARDIA FIJA (Chromium, a 390 px y a 1400 px, reloj congelado, datos ficticios, la tarjeta de verdad y no una copia):
//   A. En la cama OCUPADA sin evolucionar y en la YA EVOLUCIONADA: el primer botón del pie es `.bevo` («Evolución» / «Editar»), ocupa
//      TODO el ancho útil del pie y NINGÚN otro botón comparte su fila; los demás van debajo, y la acción principal no es más BAJA que
//      los secundarios (al quedar sola en su fila dejó de estirarse con ellos y medía 29 px contra los 31 de abajo: el relleno vertical
//      subió de 7 a 9 px).
//   B. Los tres secundarios (`.btl` Historial, `.btl.ev-cand` evento, `.balt` Egreso) están en la MISMA fila y tienen el MISMO fondo, el
//      mismo borde, el mismo color y la misma letra, y son tres tercios del mismo ancho. El orden es Historial → evento → Egreso, y `.btl` sigue siendo el primer
//      secundario (el recorrido guiado apunta a `#bedGrid .bcard .btl`).
//   C. El egreso dice «Egreso» completo (nunca «Egr.»), en una sola línea y sin cortarse.
//   D. Toques: en el celular NINGÚN botón del pie ni el lápiz de la ficha (`.pname-lap`) mide menos de 36 px de alto o de ancho.
//   E. CAMA LIBRE: «+ Ingresar Paciente» es `.bevo.bevo-libre` (el gris ya no va en el atributo `style`), a todo el ancho y con los
//      mismos colores de siempre, también con el cursor encima (el `:hover` azul de `.bevo` pesa más que la clase sola).
//   F. VISTA RETROSPECTIVA: «Ver / editar» primero y solo; Historial debajo; sin traslado, sin evento y sin egreso.
//   G. MODO TRASLADO: cada `.bevo` (Intercambiar / Cancelar / Mover aquí / Evolución / Ingresar) tiene su propia fila a todo el ancho y
//      los secundarios quedan juntos al final, con el mismo aspecto.
//   H. El peor caso de ancho (una tarjeta de 290 px, el mínimo de la grilla, y un celular de 320 px): ningún botón del pie se corta ni
//      envuelve su rótulo.
//   I. El estado de CANDADO del evento (🔒 ámbar, «corregir el pasado pide clave») NO se pierde por unificar el aspecto: es información,
//      no decoración.
//   J. No es una guardia vacía: exige haber VISTAS las cuatro tarjetas (ocupada sin evolucionar, ya evolucionada, libre, retrospectiva)
//      y la de traslado, en los dos anchos.
//   K. EL BOTÓN DE TRASLADO (`.bmov`, el icono de las dos flechas en la pestaña de la cama) mide al menos 24×24 px en los dos anchos y la
//      pestaña no crece por eso (revisión de la tanda 5, hallazgo R22, 10-oct-2026). La tanda 5 le corrigió el color de reposo pero lo dejó
//      en 21×21 px: bajo los 24 px mínimos de un objetivo táctil, y medido con `getBoundingClientRect` en las 5 camas del tablero, a 390 y a
//      1400 px. Está en la cabecera, lejos del pie y de Egreso: crecer 3 px no lo acerca a ningún botón peligroso. El área de toque crece
//      con `min-width/min-height` y un margen vertical negativo, el mismo truco del lápiz de la ficha (`.pname-lap`): la pestaña NO crece
//      (medía 37 px; con el margen negativo mide 36). El contraste del icono, en reposo y con el cursor encima, lo mide contraste_tokens.js.
//
// 🪤 NO se renombra ninguna clase (`.bevo`, `.btl`, `.balt`, `.bmov`, `.pname-lap`) ni se cambia un onclick ni el orden del DOM: lo
//    sostienen `tutorial.js`, `retro_camas.js`, `mover_camas.js` y `ficha_y_antes.js`.
// 🪤 La palabra «Evolución» / «Editar» NO se toca aquí: es una decisión de la unidad (decisión 2 de la auditoría), no de quien acomoda
//    la caja.
// 🪤 Reloj congelado: martes 10-mar-2026 10:00 con `clock.setFixedTime` (la fecha se INVENTA, fuera de las ventanas trampa: Fiestas
//    Patrias, cumpleaños, cierre de año y la media hora previa a cada cambio de turno). Solo datos ficticios.
//
// Uso: node build/checks/tarjeta_acciones.js
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

const PACIENTES = [
  { cama: '1', nombre: 'Rosa Elena Contreras Pino', edad: 74, sexo: 'F', dx: 'Neumonía grave adquirida en la comunidad', va: 'TOT', sop: 'VM', dias: 9, sopDias: 9 },
  { cama: '2', nombre: 'Luis Alberto Márquez Soto', edad: 58, sexo: 'M', dx: 'Shock séptico de foco abdominal', va: 'TOT', sop: 'VM', dias: 3, sopDias: 3 },
  { cama: '3', nombre: 'Marta Inés Pizarro Olguín', edad: 66, sexo: 'F', dx: 'EPOC reagudizado', va: 'Natural', sop: 'VNI', dias: 5, sopDias: 2 },
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
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined || detalle === '' ? '' : '\n   ' + detalle));
  if (!cond) fails.push(l);
};

/* ── En la página: mide el pie de UNA tarjeta ─────────────────────────────────────────────────────── */
const EN_PAGINA = () => {
  const num = s => parseFloat(s) || 0;
  /** Líneas que ocupa el texto de un botón: se agrupan los rectángulos del texto por solapamiento vertical. */
  const lineas = b => {
    const rg = document.createRange(); rg.selectNodeContents(b);
    const rs = [...rg.getClientRects()].filter(r => r.width > 0 && r.height > 0).sort((x, y) => x.top - y.top);
    if (!rs.length) return 0;
    let n = 1, fondo = rs[0].bottom;
    for (const r of rs.slice(1)) { if (r.top >= fondo - 1) { n++; fondo = r.bottom; } else fondo = Math.max(fondo, r.bottom); }
    return n;
  };
  return {
    pie(card) {
      const pie = card.querySelector('.bfoot'); if (!pie) return null;
      const cs = getComputedStyle(pie), pr = pie.getBoundingClientRect();
      const interior = pr.width - num(cs.paddingLeft) - num(cs.paddingRight) - num(cs.borderLeftWidth) - num(cs.borderRightWidth);
      return {
        interior: Math.round(interior * 10) / 10,
        alto: Math.round(card.getBoundingClientRect().height),
        botones: [...pie.children].map(b => {
          const r = b.getBoundingClientRect(), s = getComputedStyle(b);
          return {
            clase: b.className, texto: (b.textContent || '').trim().replace(/\s+/g, ' '),
            estiloEnLinea: b.getAttribute('style') || '',
            onclick: b.getAttribute('onclick') || '',
            top: Math.round(r.top * 10) / 10, bottom: Math.round(r.bottom * 10) / 10, left: Math.round(r.left * 10) / 10,
            ancho: Math.round(r.width * 10) / 10, alto: Math.round(r.height * 10) / 10,
            visible: r.width > 0 && r.height > 0,
            fondo: s.backgroundColor, color: s.color, borde: s.borderTopWidth + ' ' + s.borderTopStyle + ' ' + s.borderTopColor,
            letra: s.fontSize + ' / ' + s.fontWeight,
            cortado: b.scrollWidth > b.clientWidth + 1,
            lineas: lineas(b),
          };
        }),
        traslado: (() => { const b = card.querySelector('.bmov'), h = card.querySelector('.bhdr'); if (!b) return null; const r = b.getBoundingClientRect(); return { ancho: Math.round(r.width * 10) / 10, alto: Math.round(r.height * 10) / 10, pestana: h ? Math.round(h.getBoundingClientRect().height * 10) / 10 : null }; })(),
        lapiz: (() => { const l = card.querySelector('.pname-lap'); if (!l) return null; const r = l.getBoundingClientRect(); return { ancho: Math.round(r.width * 10) / 10, alto: Math.round(r.height * 10) / 10 }; })(),
        filaNombre: (() => { const n = card.querySelector('.pname'); return n ? Math.round(n.getBoundingClientRect().height * 10) / 10 : null; })(),
      };
    },
  };
};

/* Una fila es «propia» de un botón si ningún otro botón del pie se le superpone en vertical. */
const solapa = (a, b) => a.top < b.bottom - 1 && a.bottom > b.top + 1;
const esBevo = b => /\bbevo\b/.test(b.clase);
const esSec = b => /\b(btl|balt)\b/.test(b.clase);

(async () => {
  const compilado = path.join(__dirname, '..', '_tarjeta_acciones.html');
  fs.writeFileSync(compilado, fs.readFileSync(path.join(__dirname, '..', '..', 'v2', 'index.html'), 'utf8').replace(/<\?=[\s\S]*?\?>/g, ''));
  const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const errores = [];
  const vistas = [];

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
    await pag.evaluate(src => { window.__T = (new Function('return ' + src))()(); }, EN_PAGINA.toString());
    // 🪤 El saludo «¿Primera vez por acá?» (#tutHola) sale a los 1,8 s del arranque y `tutHolaCerrar()` llegaría ANTES de que salga. Aquí no
    // se mide nada de él, pero es un globo fijo sobre la esquina y podría tapar el botón al que se le hace `hover`: se oculta por CSS, que
    // no depende de cuándo se mida.
    await pag.addStyleTag({ content: '#tutHola, #tutBtn, .toast, .tut-hola, .tut-bubble { display: none !important; }' });
    return pag;
  }
  /** Mide la tarjeta número `idx` (posición en la grilla) del tablero. */
  const medir = (pag, idx) => pag.evaluate(i => window.__T.pie(document.querySelectorAll('#bedGrid .bcard')[i]), idx);

  for (const ancho of [390, 1400]) {
    const movil = ancho <= 740;
    const D = (movil ? 'celular ' : 'escritorio ') + ancho + ' px';
    console.log('\n' + D.toUpperCase());
    const pag = await abrir(ancho);

    // Cama 1 = ocupada sin evolucionar, cama 2 = ocupada ya evolucionada, cama 3 = ocupada (origen del traslado), 4.. = libres.
    await pag.evaluate(() => { EVO_SET.add('2'); renderGrid(); document.querySelectorAll('.toast').forEach(n => n.remove()); });
    await pag.waitForTimeout(300);
    const iLibre = await pag.evaluate(() => [...document.querySelectorAll('#bedGrid .bcard')].findIndex(c => !c.classList.contains('occ')));
    const sin = await medir(pag, 0), evo = await medir(pag, 1), libre = await medir(pag, iLibre);
    vistas.push([D + ' · ocupada sin evolucionar', sin && sin.botones.length], [D + ' · ya evolucionada', evo && evo.botones.length], [D + ' · libre', libre && libre.botones.length]);

    /* ── A, B, C, D · las dos camas ocupadas ─────────────────────────────────────────────────── */
    for (const [nombre, m, esperado] of [['ocupada sin evolucionar', sin, /Evoluci[oó]n/], ['ya evolucionada', evo, /Editar/]]) {
      const bs = m.botones, bevo = bs[0], sec = bs.filter(esSec);
      si(D + ' · ' + nombre + ': el pie tiene sus cuatro botones (evolución, historial, evento, egreso)', bs.length === 4 && sec.length === 3,
        bs.map(b => b.clase + '|' + b.texto).join('  ;  '));
      si(D + ' · ' + nombre + ': el PRIMER botón es `.bevo` y dice «' + esperado.source + '»', esBevo(bevo) && esperado.test(bevo.texto), bevo.clase + ' «' + bevo.texto + '»');
      si(D + ' · ' + nombre + ': `.bevo` ocupa TODO el ancho útil del pie (' + bevo.ancho + ' de ' + m.interior + ' px)', bevo.ancho >= m.interior - 1,
        'mide ' + Math.round(100 * bevo.ancho / m.interior) + ' % del pie; debía ser 100 %');
      const comparten = bs.filter(b => b !== bevo && solapa(b, bevo));
      si(D + ' · ' + nombre + ': NINGÚN otro botón comparte la fila de `.bevo`', comparten.length === 0, comparten.map(b => b.clase + '|' + b.texto).join(', ') + ' comparten su fila');
      si(D + ' · ' + nombre + ': historial, evento y egreso van DEBAJO de `.bevo`', sec.length === 3 && sec.every(b => b.top >= bevo.bottom - 1),
        sec.map(b => b.clase + ' top ' + b.top + ' (bevo termina en ' + bevo.bottom + ')').join('  ;  '));
      si(D + ' · ' + nombre + ': la acción principal no es más BAJA que los secundarios (' + bevo.alto + ' contra ' + Math.max(...sec.map(b => b.alto)) + ' px)', sec.length === 3 && bevo.alto >= Math.max(...sec.map(b => b.alto)),
        'el botón principal mide ' + bevo.alto + ' px y un secundario ' + Math.max(...sec.map(b => b.alto)));
      const tops = sec.map(b => b.top);
      si(D + ' · ' + nombre + ': los tres secundarios están en la MISMA fila (tops ' + tops.join(' / ') + ')', sec.length === 3 && Math.max(...tops) - Math.min(...tops) <= 2, tops.join(' / '));
      const anchos = sec.map(b => b.ancho);
      si(D + ' · ' + nombre + ': los tres secundarios son tres tercios iguales (' + anchos.join(' / ') + ' px)', sec.length === 3 && Math.max(...anchos) - Math.min(...anchos) <= 2 && Math.min(...anchos) >= m.interior / 3 - 8,
        anchos.join(' / ') + ' px en un pie de ' + m.interior + ' px');
      const [hist, evt, egr] = sec;
      si(D + ' · ' + nombre + ': orden Historial → evento → Egreso, y `.btl` es el primer secundario (el tutorial apunta ahí)',
        !!hist && !!evt && !!egr && /\bbtl\b/.test(hist.clase) && /Hist/.test(hist.texto) && /abrirTL/.test(hist.onclick) &&
        /ev-cand/.test(evt.clase) && /\bbalt\b/.test(egr.clase) && /egreso\(/.test(egr.onclick),
        sec.map(b => b.clase + '|' + b.texto).join('  ;  '));
      const firma = b => [b.fondo, b.color, b.borde, b.letra].join(' · ');
      si(D + ' · ' + nombre + ': los tres secundarios tienen el MISMO fondo, borde, color y letra', sec.length === 3 && new Set(sec.map(firma)).size === 1,
        sec.map(b => b.clase.split(' ').slice(-1)[0] + ' → ' + firma(b)).join('\n   '));
      si(D + ' · ' + nombre + ': «Egreso» dice la palabra completa (no «Egr.»), en una línea y sin cortarse', !!egr && /Egreso/.test(egr.texto) && !/Egr\./.test(egr.texto) && egr.lineas === 1 && !egr.cortado,
        egr ? '«' + egr.texto + '» · ' + egr.lineas + ' línea(s)' + (egr.cortado ? ' · cortado' : '') : 'sin botón de egreso');
      si(D + ' · ' + nombre + ': ningún botón del pie envuelve su rótulo ni se corta', bs.every(b => b.lineas <= 1 && !b.cortado),
        bs.filter(b => b.lineas > 1 || b.cortado).map(b => '«' + b.texto + '» ' + b.lineas + ' líneas' + (b.cortado ? ' · cortado' : '')).join(', '));
      if (movil) {
        const chicos = bs.filter(b => b.ancho < 36 || b.alto < 36);
        si(D + ' · ' + nombre + ': ningún botón del pie mide menos de 36 px de alto o ancho', chicos.length === 0, chicos.map(b => '«' + b.texto + '» ' + b.ancho + '×' + b.alto).join(', '));
        si(D + ' · ' + nombre + ': el lápiz de la ficha (`.pname-lap`) mide al menos 36×36 px', !!m.lapiz && m.lapiz.ancho >= 36 && m.lapiz.alto >= 36, m.lapiz ? m.lapiz.ancho + '×' + m.lapiz.alto : 'no hay lápiz');
      }
      console.log('   (tarjeta de ' + m.alto + ' px de alto; botones: ' + bs.map(b => b.texto + ' ' + b.ancho + '×' + b.alto).join(' · ') + (m.lapiz ? ' · lápiz ' + m.lapiz.ancho + '×' + m.lapiz.alto : '') + ')');
    }
    /* ── K · el botón de traslado ─────────────────────────────────────────────────────────────────── */
    {
      const tr = sin.traslado;
      si(D + ' · el botón de traslado (`.bmov`) mide al menos 24×24 px (hoy ' + (tr ? tr.ancho + '×' + tr.alto : 'no está') + ')', !!tr && tr.ancho >= 24 && tr.alto >= 24,
        tr ? 'mide ' + tr.ancho + '×' + tr.alto + ' px; un objetivo táctil no baja de 24×24' : 'no hay botón de traslado en la tarjeta');
      si(D + ' · …y la pestaña de la cama no crece por eso (' + (tr ? tr.pestana : '?') + ' px; medía 37)', !!tr && tr.pestana !== null && tr.pestana <= 38, 'la pestaña mide ' + (tr && tr.pestana) + ' px');
    }
    // El lápiz no empuja el nombre: la fila del nombre mide lo mismo con o sin el área táctil de 36 px.
    if (movil) si(D + ' · la fila del nombre no crece por el área táctil del lápiz (' + sin.filaNombre + ' px)', sin.filaNombre <= 24, 'la fila del nombre mide ' + sin.filaNombre + ' px; con el lápiz de 36 px sin margen negativo crecería');

    /* ── E · cama libre ────────────────────────────────────────────────────────────────────────── */
    {
      const b = libre.botones[0];
      si(D + ' · cama libre: un solo botón, `.bevo.bevo-libre`, «+ Ingresar Paciente»', libre.botones.length === 1 && /\bbevo\b/.test(b.clase) && /\bbevo-libre\b/.test(b.clase) && /Ingresar Paciente/.test(b.texto), b.clase + ' «' + b.texto + '»');
      si(D + ' · cama libre: el gris ya no va en el atributo `style` (vive en la clase)', !/background|color/.test(b.estiloEnLinea), 'style="' + b.estiloEnLinea + '"');
      si(D + ' · cama libre: mismos colores de siempre (fondo #e2e8f0, letra #475569)', b.fondo === 'rgb(226, 232, 240)' && b.color === 'rgb(71, 85, 105)', b.fondo + ' / ' + b.color);
      si(D + ' · cama libre: ocupa todo el ancho útil del pie', b.ancho >= libre.interior - 1, b.ancho + ' de ' + libre.interior + ' px');
      if (movil) si(D + ' · cama libre: el botón mide al menos 36 px de alto', b.alto >= 36, b.ancho + '×' + b.alto);
    }

    if (!movil) {
      // `.bevo:hover` (azul oscuro) pesa más que la clase `.bevo-libre` sola: sin su propio `:hover` la letra gris quedaba sobre azul.
      await pag.locator('#bedGrid .bcard:not(.occ) .bevo-libre').first().hover();
      const h = await pag.evaluate(() => { const b = document.querySelector('#bedGrid .bcard:not(.occ) .bevo-libre'); const s = getComputedStyle(b); return { fondo: s.backgroundColor, color: s.color }; });
      si(D + ' · cama libre: con el cursor encima el botón NO cambia de color (la letra gris no cae sobre azul)', h.fondo === 'rgb(226, 232, 240)' && h.color === 'rgb(71, 85, 105)', h.fondo + ' / ' + h.color);
      await pag.mouse.move(0, 0);
    }

    /* ── I · el candado del evento sigue ámbar ──────────────────────────────────────────────────── */
    {
      const r = await pag.evaluate(() => {
        const card = document.querySelectorAll('#bedGrid .bcard')[0];
        const e = card.querySelector('.ev-cand'); if (!e) return null;
        const normal = getComputedStyle(e).color, bordeN = getComputedStyle(e).borderTopColor;
        e.classList.add('ev-lock');
        const cs = getComputedStyle(e), r = { normal, bordeN, color: cs.color, borde: cs.borderTopColor, fondo: cs.backgroundColor, candadoVisible: getComputedStyle(e.querySelector('.ev-cerr')).display !== 'none' };
        e.classList.remove('ev-lock'); return r;
      });
      si(D + ' · el evento con candado (🔒) sigue en ámbar y distinto del normal', !!r && r.color === 'rgb(180, 83, 9)' && r.borde === 'rgb(245, 158, 11)' && r.fondo === 'rgb(255, 247, 237)' && r.candadoVisible,
        r ? JSON.stringify(r) : 'no hay botón de evento');
    }

    /* ── G · modo traslado ───────────────────────────────────────────────────────────────────────── */
    await pag.evaluate(() => { MOVECAMA = null; mover('3'); document.querySelectorAll('.toast').forEach(n => n.remove()); });
    await pag.waitForTimeout(300);
    const tOtra = await medir(pag, 0), tOrigen = await medir(pag, 2), tLibre = await medir(pag, iLibre);
    vistas.push([D + ' · traslado', tOtra && tOrigen && tLibre ? 3 : 0]);
    for (const [nombre, m, minBevo] of [['otra ocupada («Intercambiar»)', tOtra, 2], ['la de origen («Cancelar movimiento»)', tOrigen, 2], ['cama libre («Mover aquí»)', tLibre, 2]]) {
      const bs = m.botones, bevos = bs.filter(esBevo), sec = bs.filter(esSec);
      si(D + ' · traslado, ' + nombre + ': tiene sus botones (' + bs.map(b => b.texto).join(' · ') + ')', bevos.length >= minBevo, 'hay ' + bevos.length + ' `.bevo`');
      const sinFilaPropia = bevos.filter(b => b.ancho < m.interior - 1 || bs.some(o => o !== b && solapa(o, b)));
      si(D + ' · traslado, ' + nombre + ': cada `.bevo` tiene su PROPIA fila a todo el ancho', sinFilaPropia.length === 0,
        sinFilaPropia.map(b => '«' + b.texto + '» ' + b.ancho + ' de ' + m.interior + ' px').join(', '));
      if (sec.length) {
        si(D + ' · traslado, ' + nombre + ': los secundarios quedan juntos, DEBAJO de los `.bevo`, con el mismo aspecto',
          sec.every(b => b.top >= Math.max(...bevos.map(x => x.bottom)) - 1) && new Set(sec.map(b => [b.fondo, b.color, b.borde, b.letra].join('|'))).size === 1,
          sec.map(b => b.clase + ' top ' + b.top + ' ' + b.fondo + '/' + b.color).join('  ;  '));
      }
      si(D + ' · traslado, ' + nombre + ': nada se corta ni envuelve su rótulo', bs.every(b => !b.cortado && b.lineas <= 1), bs.filter(b => b.cortado || b.lineas > 1).map(b => '«' + b.texto + '» ' + b.lineas + ' líneas').join(', '));
      if (movil) {
        const chicos = bs.filter(b => b.ancho < 36 || b.alto < 36);
        si(D + ' · traslado, ' + nombre + ': ningún botón mide menos de 36 px', chicos.length === 0, chicos.map(b => '«' + b.texto + '» ' + b.ancho + '×' + b.alto).join(', '));
      }
    }
    await pag.evaluate(() => { MOVECAMA = null; renderGrid(); });

    /* ── F · vista retrospectiva ─────────────────────────────────────────────────────────────────── */
    await pag.evaluate(() => {
      const d = '2026-03-09', g = document.getElementById('gDate');
      g.value = d; g.classList.remove('turno-hoy');
      EVOS_DIA = [{ ID_CAMA: '1', TURNO_KEY: d + '-' + SHIFT, PAC_NOMBRE: 'Rosa Elena Contreras Pino', PAC_EDAD: 74, PAC_SEXO: 'F',
        PAC_DIAGNOSTICO: 'Neumonía grave adquirida en la comunidad', VENT_SOPORTE: 'VM', VENT_VIA_AEREA: 'TOT', VENT_MODO: 'ACVC',
        DIA_ESTADIA: 8, DIAS_VM: 8, PLAN_FIRMA_KINE: 'DMV', PATIENT_ID: 'pid-1', COD_PACIENTE: 'C1' }];
      EVO_SET = new Set(['1']);
      renderGrid();
    });
    await pag.waitForTimeout(300);
    const retro = await medir(pag, 0);
    vistas.push([D + ' · retrospectiva', retro && retro.botones.length]);
    {
      const bs = retro.botones, bevo = bs[0], hist = bs[1];
      si(D + ' · retrospectiva: «Ver / editar» primero, a todo el ancho y SOLO en su fila', bs.length === 2 && esBevo(bevo) && /Ver \/ editar/.test(bevo.texto) && bevo.ancho >= retro.interior - 1 && !solapa(hist, bevo),
        bs.map(b => b.clase + '|' + b.texto + ' ' + b.ancho + ' de ' + retro.interior + ' top ' + b.top).join('  ;  '));
      si(D + ' · retrospectiva: Historial (`.btl`) debajo, con el aspecto de los secundarios', !!hist && /\bbtl\b/.test(hist.clase) && /Hist/.test(hist.texto) && hist.top >= bevo.bottom - 1 && hist.fondo === 'rgb(255, 255, 255)',
        hist ? hist.clase + '|' + hist.texto + ' top ' + hist.top + ' fondo ' + hist.fondo : 'no hay Historial');
      si(D + ' · retrospectiva: sin egreso, sin evento y sin traslado', !bs.some(b => /balt|ev-cand/.test(b.clase)) && !(await pag.evaluate(() => !!document.querySelector('#bedGrid .bmov:not(.hidden)'))), bs.map(b => b.clase).join(', '));
      if (movil) { const chicos = bs.filter(b => b.ancho < 36 || b.alto < 36); si(D + ' · retrospectiva: ningún botón mide menos de 36 px', chicos.length === 0, chicos.map(b => '«' + b.texto + '» ' + b.ancho + '×' + b.alto).join(', ')); }
    }
    await pag.close();
  }

  /* ── H · el peor caso de ancho ───────────────────────────────────────────────────────────────────── */
  console.log('\nPEOR CASO DE ANCHO');
  {
    // (1) escritorio con la tarjeta en su mínimo (290 px: `minmax(290px,1fr)` de la grilla).
    const pag = await abrir(1400);
    await pag.evaluate(() => {
      EVO_SET.add('2');
      const st = document.createElement('style'); st.id = '__min'; st.textContent = '#bedGrid{grid-template-columns:repeat(auto-fill,290px)!important;}'; document.head.appendChild(st);
      renderGrid();
    });
    await pag.waitForTimeout(300);
    for (const [i, nombre] of [[0, 'sin evolucionar'], [1, 'ya evolucionada']]) {
      const m = await medir(pag, i), bs = m.botones;
      si('tarjeta de 290 px (mínimo de la grilla), ' + nombre + ': el pie mide ' + m.interior + ' px útiles y nada se corta ni envuelve', bs.every(b => !b.cortado && b.lineas <= 1),
        bs.filter(b => b.cortado || b.lineas > 1).map(b => '«' + b.texto + '» ' + b.ancho + ' px, ' + b.lineas + ' líneas' + (b.cortado ? ', cortado' : '')).join(', '));
    }
    await pag.close();
    // (2) un celular chico (320 px).
    const cel = await abrir(320);
    await cel.evaluate(() => { EVO_SET.add('2'); renderGrid(); document.querySelectorAll('.toast').forEach(n => n.remove()); });
    await cel.waitForTimeout(300);
    for (const [i, nombre] of [[0, 'sin evolucionar'], [1, 'ya evolucionada']]) {
      const m = await medir(cel, i), bs = m.botones;
      si('celular de 320 px, ' + nombre + ': el pie mide ' + m.interior + ' px útiles y nada se corta ni envuelve', bs.every(b => !b.cortado && b.lineas <= 1),
        bs.filter(b => b.cortado || b.lineas > 1).map(b => '«' + b.texto + '» ' + b.ancho + ' px, ' + b.lineas + ' líneas' + (b.cortado ? ', cortado' : '')).join(', '));
      si('celular de 320 px, ' + nombre + ': ningún botón mide menos de 36 px', bs.every(b => b.ancho >= 36 && b.alto >= 36), bs.map(b => b.ancho + '×' + b.alto).join(' '));
    }
    await cel.close();
  }

  /* ── J · no es una guardia vacía ─────────────────────────────────────────────────────────────────── */
  console.log('\nCOBERTURA');
  si('se VIERON las tarjetas de los dos anchos: ocupada sin evolucionar, ya evolucionada, libre, traslado y retrospectiva (' + vistas.length + ')',
    vistas.length === 10 && vistas.every(([, n]) => n > 0), vistas.map(([k, n]) => k + ': ' + n).join('\n   '));

  await navegador.close();
  fs.unlinkSync(compilado);
  si('sin errores de JavaScript en la página', errores.length === 0, errores.join(' | '));
  if (fails.length) { console.log('\n❌ ' + fails.length + ' fallan'); process.exit(1); }
  console.log('\n✅ todo verde');
})().catch(e => { console.error('❌ la guardia reventó: ' + (e && e.stack || e)); process.exit(1); });
