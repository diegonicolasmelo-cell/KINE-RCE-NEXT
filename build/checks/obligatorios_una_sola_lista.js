// obligatorios_una_sola_lista.js — Los obligatorios del aviso viven en UNA sola lista (tanda 3 · cambio 2 del plan de
// limpieza del registro de evolución, oct-2026).
//
// EL DEFECTO. `rielRender` armaba lo que falta DOS veces dentro de sí misma: una lista de textos (la línea «Falta:» de
// #gFalta) y, más abajo, una lista paralela de elementos (el «!» y el «falta …» de los encabezados del celular). Y
// `guardar()` tiene una tercera con los mismos obligatorios. Bastaba agregar un obligatorio a una de las tres para que se
// desajustaran, y así pasó: la hemodinamia y la razón de «PVE superada sin extubar» las exige `guardar()` desde hace
// semanas y el aviso nunca las nombró (ver aviso_igual_que_guardar.js, que es el cambio 3). Con una sola fuente, el aviso de
// arriba y el estado de cada bloque no pueden contradecirse.
//
// EL CAMBIO. Una función `_obligatoriosPendientes()` devuelve `[{ el, texto }]`, en el orden en que se anuncian, y
// `rielRender` la consume para las dos cosas (la línea de #gFalta y `_mPintarSecciones`). `guardar()` NO se toca.
//
// LO QUE ESTA GUARDIA FIJA.
//   1. ESTRUCTURA: `_obligatoriosPendientes` existe, devuelve `{el, texto}` y `rielRender` ya no lleva listas propias.
//   2. EQUIVALENCIA: en una docena de escenarios, #gFalta, la lista de elementos y las tarjetas marcadas con «!» en el
//      celular son idénticas a un ORÁCULO ESCRITO A MANO acá (texto, elemento y orden). El oráculo se escribió contra el
//      comportamiento de ANTES del refactor y da verde antes y después: es lo que prueba que no cambió ni una palabra.
//      Todos los escenarios parten con la hemodinamia puesta (como la pone un colega) porque lo que aquí se mide es
//      «mismo aviso que antes»; la hemodinamia y la razón de no extubar tienen su propia guardia.
//
// 🪤 El oráculo NO se genera llamando a la función que se prueba: es una tabla a mano. Si alguien cambia una frase del
// aviso, esta guardia se pone roja y la persona tiene que decir por qué (y reconciliarla con la razón escrita).
// 🪤 Reloj congelado: lunes 10-ago-2026 11:00, fuera de las ventanas trampa (Fiestas Patrias, cierre de año, cumpleaños y la
// media hora previa al cambio de turno), y turno forzado. La fecha se inventa, no se espera.
//
// Uso: node build/checks/obligatorios_una_sola_lista.js
const path = require('path');
const { chromium } = require('playwright-core');
const v2 = path.join(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

/* El ORÁCULO: por escenario, cómo se arma y qué debe anunciarse, en orden: [texto del aviso, id del elemento]. A mano. */
const ESCENARIOS = [
  { n: 'sin firma ni vía aérea (vía natural, en blanco)', natural: true, sinFirma: true, armar: "() => { $('fVA').value = ''; }",
    debe: [['firma', 'fFirma'], ['vía aérea', 'fVA']] },
  { n: 'firma puesta y vía natural: no falta nada', natural: true, armar: "() => {}", debe: [] },
  { n: 'tubo + VM con la PVE sin responder', armar: "() => {}",
    debe: [['PVE sí / no / no corresponde', 'fPVEval']] },
  { n: 'PVE «No» sin razón', armar: "() => hPVEtoggle('no')",
    debe: [['razón de la PVE no realizada', 'fPveSCraz']] },
  { n: 'PVE «No corresponde» sin razón', armar: "() => hPVEtoggle('nc')",
    debe: [['razón de «PVE no corresponde»', 'fPveNcRaz']] },
  { n: 'PVE «No» con «Otra» sin motivo', armar: "() => { hPVEtoggle('no'); $('fPveSCraz').value = 'Otra'; hPveSCraz(); }",
    debe: [['motivo de la «Otra» razón de PVE', 'fPveSCdet']] },
  { n: 'PVE «No corresponde» con «Otra» sin motivo', armar: "() => { hPVEtoggle('nc'); $('fPveNcRaz').value = 'Otra'; hPveNcRaz(); }",
    debe: [['motivo de la «Otra» razón de PVE', 'fPveNcDet']] },
  { n: 'extubación sin PVE sin su tipo', armar: "() => { hPVEtoggle('no'); $('cExtSinPve').checked = true; hExtSinPve(); }",
    debe: [['tipo de la extubación sin PVE', 'dExtTipoBox']] },
  { n: 'KTM «No realizada» sin razón', armar: "() => { hPVEtoggle('si'); setKTMstate('n'); }",
    debe: [['razón de KTM no realizada', 'fKTMnoRaz']] },
  { n: 'KTM «Contraindicada» sin contraindicación', armar: "() => { hPVEtoggle('si'); setKTMstate('s'); }",
    debe: [['contraindicación de KTM', 'fKTMraz']] },
  { n: 'KTM suspendida en sesión sin criterio', armar: "() => { hPVEtoggle('si'); setKTMstate('r'); $('cKTMalert').checked = true; }",
    debe: [['criterio de la suspensión de KTM en sesión', 'fKTMalertRaz']] },
  { n: 'KTM «No realizada · Otro» sin fundamento', armar: "() => { hPVEtoggle('si'); setKTMstate('n'); _ktmNoRazonSel('Otro'); }",
    debe: [['fundamento de la razón de KTM', 'fKTMnoCom']] },
  { n: 'reintubación sin hora', natural: true, armar: "() => { $('cReintubT').checked = true; }",
    debe: [['hora de la reintubación', 'fReintubHoraT']] },
  { n: 'varios a la vez: sin firma, PVE «No» sin razón y KTM sin razón (el ORDEN)', sinFirma: true,
    armar: "() => { hPVEtoggle('no'); setKTMstate('n'); }",
    debe: [['firma', 'fFirma'], ['razón de la PVE no realizada', 'fPveSCraz'], ['razón de KTM no realizada', 'fKTMnoRaz']] },
];

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const errs = [];

  for (const ancho of [1200, 390]) {
    const movil = ancho === 390;
    console.log('\n══════ pantalla de ' + ancho + ' px ══════');
    const p = await b.newPage({ viewport: { width: ancho, height: movil ? 844 : 1500 }, locale: 'es-CL', isMobile: movil, hasTouch: movil });
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => {
      const FIJA = new Date(2026, 7, 10, 11, 0, 0).getTime(), RD = Date;
      function FD(...a) { if (!new.target) return new RD(FIJA).toString(); return a.length ? new RD(...a) : new RD(FIJA); }
      FD.prototype = RD.prototype; FD.now = () => FIJA; FD.UTC = RD.UTC; FD.parse = RD.parse; window.Date = FD;
      window._ll = [];
      window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
        api(a, d) { window._ll.push({ a, d }); let data = null; if (a === 'GET_CONFIG_UI') data = { NUM_CAMAS: 12, BANNERS: {} };
          else if (a === 'GET_EVO_TURNO') data = { actual: null, previa: null, pronoAbierto: '' };
          setTimeout(() => ok({ ok: true, data }), 5); } }; } }; } } } };
    });
    await p.goto('file://' + path.join(v2, 'index.html'));
    await p.waitForTimeout(800);

    /* Abre el turno de la cama 3 desde cero (tubo + VM o vía natural), con la hemodinamia puesta, la firma puesta salvo
       que se pida lo contrario, aplica `armar` y deja el aviso recalculado. Devuelve lo que se ve. */
    const medir = (o) => p.evaluate(async x => {
      $('kf').reset(); $('gDate').value = '2026-08-10'; SHIFT = 'Dia';
      window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
      DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', VIA_AEREA: x.natural ? 'Natural' : 'TOT', SOPORTE: x.natural ? 'Ambiente' : 'VM',
        FECHA_INGRESO: '2026-08-03', TS_INGRESO: '2026-08-03 23:00:00', FECHA_INICIO_VA: '2026-08-06', TS_INICIO_VA: '2026-08-06 10:00:00',
        FECHA_INICIO_SOPORTE: '2026-08-06', TS_INICIO_SOPORTE: '2026-08-06 10:00:00' }];
      window.recargarSilencioso = () => {}; window._ll.length = 0; renderGrid(); abrirPanel('3', false, false);
      await new Promise(r => setTimeout(r, 800));
      if (!x.sinFirma) { $('fFirma').appendChild(Object.assign(document.createElement('option'), { value: 'K.T.', textContent: 'K.T.' })); $('fFirma').value = 'K.T.'; }
      const he = $('fHEst'); if (he && !he.value) he.value = 'Estable'; const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos';
      _transAvisoOk = true;
      new Function('return (' + x.armar + ')')()();
      rielRender();
      const r = { gFalta: $('gFalta').textContent, existe: typeof _obligatoriosPendientes === 'function', lista: null, tarjetas: [] };
      if (r.existe) { const l = _obligatoriosPendientes(); r.lista = Array.isArray(l) ? l.map(o => [o && o.texto, o && o.el && o.el.id]) : 'no es un arreglo'; }
      /* Celular: qué tarjetas quedaron con «!» (las que contienen un elemento de la lista). */
      document.querySelectorAll('#kf .fcard').forEach(c => { const s = c.querySelector('.fcard-hdr .mst'); if (s && s.classList.contains('req')) r.tarjetas.push(c.id || (c.querySelector('.fcard-title') || {}).textContent); });
      return r;
    }, o);

    console.log('\n1 · Estructura: una sola lista, y rielRender la consume');
    const E = await p.evaluate(() => {
      const src = typeof rielRender === 'function' ? rielRender.toString() : '';
      return { fn: typeof _obligatoriosPendientes === 'function', riel: !!src,
        sinFaltas: !/\bfaltas\s*\.\s*push\b/.test(src), sinFaltaEls: !/\bfaltaEls\b/.test(src),
        usa: /_obligatoriosPendientes\s*\(/.test(src) };
    });
    si('★★ existe _obligatoriosPendientes()', E.fn);
    si('rielRender sigue existiendo (se conserva el nombre a propósito)', E.riel);
    si('★★ rielRender ya no arma su propia lista de textos', E.sinFaltas);
    si('★★ …ni su lista paralela de elementos', E.sinFaltaEls);
    si('★★ …y consume _obligatoriosPendientes()', E.usa);

    console.log('\n2 · Equivalencia: mismo aviso, mismo orden, mismas tarjetas marcadas que el oráculo');
    for (const s of ESCENARIOS) {
      const r = await medir(s);
      const aviso = s.debe.length ? 'Falta: ' + s.debe.map(d => d[0]).join(' y ') : '';
      eq('★ ' + s.n + ' · #gFalta', r.gFalta, aviso);
      eq('★ ' + s.n + ' · la lista de textos y elementos, en orden', JSON.stringify(r.lista), JSON.stringify(s.debe));
      if (movil) {
        /* En el celular cada obligatorio marca con «!» la tarjeta que lo contiene: se mide con el DOM, sin pasar por la función. */
        const esperadas = await p.evaluate(ids => {
          const ts = new Set(); ids.forEach(id => { const c = document.getElementById(id) && document.getElementById(id).closest('.fcard'); if (c) ts.add(c.id || (c.querySelector('.fcard-title') || {}).textContent); });
          return [...ts];
        }, s.debe.map(d => d[1]));
        eq('★ ' + s.n + ' · en el celular marca con «!» las tarjetas que los contienen', JSON.stringify(r.tarjetas.slice().sort()), JSON.stringify(esperadas.slice().sort()));
      }
    }
    await p.close();
  }

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ obligatorios_una_sola_lista: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ obligatorios_una_sola_lista: todo verde');
  process.exit(fails.length ? 1 : 0);
})();
