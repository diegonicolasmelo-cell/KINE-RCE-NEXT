// aviso_igual_que_guardar.js — Lo que bloquea el guardado se anuncia ANTES de apretar «Guardar» (tanda 3 · cambio 3 del plan
// de limpieza del registro de evolución, oct-2026).
//
// EL DEFECTO. La línea «Falta:» de arriba (#gFalta) y los encabezados con «!» del celular salen de `rielRender`, y
// `guardar()` tiene su propia lista de obligatorios. Se desajustaron: `guardar()` frena si falta la HEMODINAMIA (estado y
// DVA; pedido de Diego el 20-sep-2026, «HDN pedir antes de avanzar… como la firma») y si la PVE se superó y NO se extubó
// sin decir por qué (la razón, y el detalle si es «Otra»), pero el aviso NO las nombraba. Medido: una evolución nueva con
// la firma y la vía aérea puestas decía «Falta:» en blanco y al apretar Guardar salía «Registra la hemodinamia». El aviso
// mentía por omisión: la persona descubría la falta recién al guardar, justo lo que el aviso existe para evitar.
//
// EL CAMBIO. Esos dos obligatorios entran a `_obligatoriosPendientes()` (la lista única del cambio 2) en el MISMO ORDEN en
// que los exige `guardar()`: firma · hemodinamia · vía aérea · PVE… · razón de la PVE superada sin extubar · KTM… ·
// reintubación. `guardar()` no cambia: no se toca su lista ni su bloqueo.
//
// LO QUE ESTA GUARDIA FIJA (sin editar guardar(): se mide desde afuera).
//   1. La invariante: «si guardar() bloquea, #gFalta no está vacío Y su lista incluye el lugar al que guardar() lleva». El
//      destino se espía en `_irAlCampo`. Se mide en la matriz nueva (hemodinamia vacía, PVE superada sin extubar sin razón,
//      con «Otra» sin detalle) y también en los obligatorios de siempre, para que la próxima deriva no necesite un bug nuevo.
//   2. Qué dice el aviso, palabra por palabra, y en qué orden (la hemodinamia va antes que la vía aérea porque así la exige
//      guardar()).
//   3. Control positivo: con todo en regla el aviso queda vacío Y guardar() guarda (si no, el aviso estaría pidiendo de más).
//   4. En el celular el encabezado de la tarjeta lo nombra (la hemodinamia es de la tarjeta Hemodinamia, la razón de no
//      extubar es de Respiratorio) y no dice el genérico «un dato obligatorio».
//   5. 🔴 (Revisión de la tanda 3, F1 · R4 y R10) Eso vale para TODOS los obligatorios, no solo los tres nuevos. El encabezado
//      buscaba el nombre por id en una SEGUNDA tabla (`_mFaltaTxt`) que conocía diez y para seis campos decía «falta un dato
//      obligatorio» (las razones de la PVE, su «Otra», el tipo de la extubación sin PVE y la hora de la reintubación) mientras la línea «Falta:»
//      de arriba sí los nombraba: la promesa de «una sola lista» no llegaba al texto del encabezado. Ahora el nombre corto vive en la
//      MISMA entrada de `_obligatoriosPendientes()` que el texto y el elemento (`corto`), la tabla paralela ya no existe y un
//      obligatorio nuevo se nombra con su propio texto aunque nadie escriba su forma corta. Se mide en las dos anchuras: en
//      escritorio las tarjetas del Turno muestran el mismo encabezado.
//
// 🪤 «El mismo lugar» se compara por TARJETA, no por id: guardar() lleva a un botón visible (`btnPVESi`) y la lista guarda
// el input oculto que contiene el valor (`fPVEval`); el celular marca la tarjeta que contiene el elemento. Para los tres
// obligatorios nuevos se exige además el id exacto.
// 🪤 Reloj congelado: lunes 10-ago-2026 11:00, fuera de las ventanas trampa (Fiestas Patrias, cierre de año, cumpleaños y la
// media hora previa al cambio de turno), y turno forzado.
//
// Uso: node build/checks/aviso_igual_que_guardar.js
const path = require('path');
const { chromium } = require('playwright-core');
const v2 = path.join(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

/* Marcar la PVE «Sí» → «Superada» → «¿Se extubó?: No». Es la ruta real de la pantalla. */
const SUP_SIN_EXT = "hPVEtoggle('si'); { const r = document.querySelector('input[name=\"pveRes\"][value=\"superada\"]'); r.checked = true; hPVEres(); } " +
  "{ const n = document.querySelector('input[name=\"pveSupExt\"][value=\"no\"]'); n.checked = true; hPveSupExt(); }";

/* LA MATRIZ NUEVA: lo que guardar() exige y el aviso no nombraba. `id` = destino exacto de _irAlCampo en guardar(). */
const NUEVOS = [
  { n: 'hemodinamia vacía (ni estado ni DVA)', natural: true, sinHdn: true, armar: '() => {}',
    id: 'fHEst', aviso: 'Falta: hemodinamia', celular: /falta la hemodinamia/ },
  { n: 'hemodinamia con el estado puesto y la DVA vacía', natural: true, sinHdn: true, armar: "() => { $('fHEst').value = 'Estable'; }",
    id: 'fDVA', aviso: 'Falta: hemodinamia', celular: /falta la hemodinamia/ },
  { n: 'hemodinamia con la DVA puesta y el estado vacío', natural: true, sinHdn: true, armar: "() => { $('fDVA').value = 'Sin requerimientos'; }",
    id: 'fHEst', aviso: 'Falta: hemodinamia', celular: /falta la hemodinamia/ },
  { n: 'PVE superada sin extubar y sin la razón', armar: '() => { ' + SUP_SIN_EXT + ' }',
    id: 'fPveSupRaz', aviso: 'Falta: razón de la PVE superada sin extubar', celular: /falta la razón de no extubar/ },
  { n: 'PVE superada sin extubar con «Otra» sin detalle', armar: '() => { ' + SUP_SIN_EXT + " $('fPveSupRaz').value = 'Otra'; hPveSupExt(); }",
    id: 'fPveSupDet', aviso: 'Falta: motivo de la «Otra» razón de no extubar', celular: /falta el motivo de la «Otra» razón de no extubar/ },
  { n: 'hemodinamia vacía Y PVE sin responder (el ORDEN de guardar(): primero la hemodinamia)', sinHdn: true, armar: '() => {}',
    id: 'fHEst', aviso: 'Falta: hemodinamia y PVE sí / no / no corresponde', celular: /falta la hemodinamia/ },
];

/* LOS DE SIEMPRE: el mismo invariante, para que la próxima deriva no tenga que esperar a un bug. `id` = destino de guardar(). */
const DE_SIEMPRE = [
  { n: 'tubo + VM con la PVE sin responder', armar: '() => {}', id: 'btnPVESi', cab: /^Requiere revisión falta declarar la PVE/ },
  { n: 'PVE «No» sin razón', armar: "() => hPVEtoggle('no')", id: 'fPveSCraz', cab: /falta la razón de la PVE/ },
  { n: 'PVE «No corresponde» sin razón', armar: "() => hPVEtoggle('nc')", id: 'fPveNcRaz', cab: /falta la razón de la PVE/ },
  { n: 'PVE «No» con «Otra» sin motivo', armar: "() => { hPVEtoggle('no'); $('fPveSCraz').value = 'Otra'; hPveSCraz(); }", id: 'fPveSCdet', cab: /falta el motivo de la «Otra» razón de la PVE/ },
  { n: 'PVE «No corresponde» con «Otra» sin motivo', armar: "() => { hPVEtoggle('nc'); $('fPveNcRaz').value = 'Otra'; hPveNcRaz(); }", id: 'fPveNcDet', cab: /falta el motivo de la «Otra» razón de la PVE/ },
  { n: 'extubación sin PVE sin su tipo', armar: "() => { hPVEtoggle('no'); $('cExtSinPve').checked = true; hExtSinPve(); }", id: 'dExtTipoBox', cab: /falta el tipo de la extubación sin PVE/ },
  { n: 'KTM «No realizada» sin razón', armar: "() => { hPVEtoggle('si'); setKTMstate('n'); }", id: 'fKTMnoRaz', cab: /falta la razón de KTM/ },
  { n: 'KTM «Contraindicada» sin contraindicación', armar: "() => { hPVEtoggle('si'); setKTMstate('s'); }", id: 'fKTMcontra', cab: /falta la contraindicación/ },
  { n: 'KTM suspendida en sesión sin criterio', armar: "() => { hPVEtoggle('si'); setKTMstate('r'); $('cKTMalert').checked = true; }", id: 'fKTMalertRaz', cab: /falta el criterio de la suspensión en sesión/ },
  { n: 'KTM «No realizada · Otro» sin fundamento', armar: "() => { hPVEtoggle('si'); setKTMstate('n'); _ktmNoRazonSel('Otro'); }", id: 'fKTMnoCom', cab: /falta el fundamento de la razón/ },
  { n: 'reintubación sin hora', natural: true, armar: "() => { $('cReintubT').checked = true; }", id: 'fReintubHoraT', cab: /falta la hora de la reintubación/ },
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
      window._ll = []; window._destinos = [];
      window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
        api(a, d) { window._ll.push({ a, d }); let data = null; if (a === 'GET_CONFIG_UI') data = { NUM_CAMAS: 12, BANNERS: {} };
          else if (a === 'GET_EVO_TURNO') data = { actual: null, previa: null, pronoAbierto: '' };
          setTimeout(() => ok({ ok: true, data }), 5); } }; } }; } } } };
    });
    await p.goto('file://' + path.join(v2, 'index.html'));
    await p.waitForTimeout(800);
    /* Se ESPÍA _irAlCampo: guardar() lo llama por nombre y el destino es lo que hay que comparar. No se cambia nada de
       guardar(): el espía solo anota. (La rama de la firma hace focus() directo y no pasa por acá.) */
    await p.evaluate(() => { window._irAlCampo = function (x) { window._destinos.push(typeof x === 'string' ? x : (x && x.id)); }; });

    /* Abre el turno de la cama 3 desde cero, con la firma puesta, la hemodinamia puesta salvo `sinHdn`, aplica `armar`,
       recalcula el aviso, aprieta Guardar y devuelve lo que pasó. */
    const intento = (o) => p.evaluate(async x => {
      $('kf').reset(); $('gDate').value = '2026-08-10'; SHIFT = 'Dia';
      window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
      DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', VIA_AEREA: x.natural ? 'Natural' : 'TOT', SOPORTE: x.natural ? 'Ambiente' : 'VM',
        FECHA_INGRESO: '2026-08-03', TS_INGRESO: '2026-08-03 23:00:00', FECHA_INICIO_VA: '2026-08-06', TS_INICIO_VA: '2026-08-06 10:00:00',
        FECHA_INICIO_SOPORTE: '2026-08-06', TS_INICIO_SOPORTE: '2026-08-06 10:00:00' }];
      window.recargarSilencioso = () => {}; renderGrid(); abrirPanel('3', false, false);
      await new Promise(r => setTimeout(r, 800));
      if (!x.sinFirma) { $('fFirma').appendChild(Object.assign(document.createElement('option'), { value: 'K.T.', textContent: 'K.T.' })); $('fFirma').value = 'K.T.'; }
      if (!x.sinHdn) { const he = $('fHEst'); if (he && !he.value) he.value = 'Estable'; const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos'; }
      else { $('fHEst').value = ''; $('fDVA').value = ''; }
      _transAvisoOk = true;
      new Function('return (' + x.armar + ')')()();
      rielRender();
      /* Una tarjeta se identifica por su id y, si no lo tiene (Hemodinamia no lo tiene), por su título. */
      const llave = c => c ? (c.id || ((c.querySelector('.fcard-title') || {}).textContent || '')).trim() : null;
      const r = { gFalta: $('gFalta').textContent, existe: typeof _obligatoriosPendientes === 'function', lista: [], listaOk: false,
        vaTipo: v('fVA'), firma: v('fFirma'), hest: v('fHEst'), dva: v('fDVA') };
      if (r.existe) { const l = _obligatoriosPendientes(); r.listaOk = Array.isArray(l); r.lista = r.listaOk ? l.map(o => ({ id: o && o.el && o.el.id, card: llave(o && o.el && o.el.closest('.fcard')) })) : [];
        r.cortos = r.listaOk ? l.map(o => o && o.corto) : []; }
      window._ll.length = 0; window._destinos.length = 0;
      guardar();
      await new Promise(r2 => setTimeout(r2, 400));
      r.guardo = window._ll.some(l => l.a === 'GUARDAR_EVOLUCION');
      r.destino = window._destinos[0] || null;
      const d = r.destino && document.getElementById(r.destino);
      r.destinoCard = llave(d && d.closest('.fcard'));
      /* Celular: encabezado de cada tarjeta marcada con «!». */
      r.cabeceras = {};
      document.querySelectorAll('#kf .fcard').forEach(c => { const s = c.querySelector('.fcard-hdr .mst'), t = c.querySelector('.fcard-hdr .mres');
        if (s && s.classList.contains('req')) r.cabeceras[llave(c)] = t ? t.textContent : ''; });
      return r;
    }, o);

    console.log('\n1 · 🔴 Lo que guardar() exige y el aviso no nombraba');
    for (const s of NUEVOS) {
      const r = await intento(s);
      no('★★ ' + s.n + ': guardar() NO guarda', r.guardo);
      eq('★★ …y lleva al campo ' + s.id, r.destino, s.id);
      si('★★ …y el aviso #gFalta NO queda vacío', r.gFalta !== '');
      eq('★★ …y dice lo mismo que guardar() exige, con sus palabras', r.gFalta, s.aviso);
      si('★★ …y la lista de elementos incluye el campo al que guardar() lleva (' + s.id + ')', r.lista.some(o => o.id === s.id));
      if (movil) {
        const card = r.destinoCard;
        si('★★ …y en el celular su tarjeta (' + card + ') queda con «!»', card && Object.prototype.hasOwnProperty.call(r.cabeceras, card));
        si('★★ …y su encabezado lo nombra, no dice «un dato obligatorio»', card && s.celular.test(r.cabeceras[card] || ''));
      }
    }

    console.log('\n2 · La invariante en los obligatorios de siempre: si guardar() bloquea, el aviso lo nombra');
    for (const s of DE_SIEMPRE) {
      const r = await intento(s);
      no('★ ' + s.n + ': guardar() NO guarda', r.guardo);
      si('★ …y #gFalta no queda vacío', r.gFalta !== '');
      si('★ …y la lista de elementos incluye el lugar al que guardar() lleva (' + s.id + ')',
        r.lista.some(o => o.id === s.id || (r.destinoCard && o.card === r.destinoCard)));
      /* R4/R10 · el encabezado de la tarjeta que lo contiene NOMBRA lo que falta (no el genérico). En el celular toda tarjeta lo lleva; en
         escritorio, las del Turno (las de otros pasos no pintan estado). */
      const enCab = !!r.destinoCard && Object.prototype.hasOwnProperty.call(r.cabeceras, r.destinoCard);
      if (movil) si('★★ …y en el celular su tarjeta (' + r.destinoCard + ') queda con «!»', enCab);
      if (enCab) {
        si('★★ …y su encabezado lo nombra: ' + s.cab, s.cab.test(r.cabeceras[r.destinoCard] || ''));
        no('★★ …y no dice el genérico «un dato obligatorio»', /un dato obligatorio/.test(r.cabeceras[r.destinoCard] || ''));
      }
      si('★★ …y cada obligatorio de la lista trae su nombre corto (' + JSON.stringify(r.cortos) + ')', r.cortos.length > 0 && r.cortos.every(c => typeof c === 'string' && c.trim() !== ''));
    }

    console.log('\n3 · El orden del aviso es el de guardar(): firma · hemodinamia · vía aérea');
    {
      const r = await intento({ natural: true, sinFirma: true, sinHdn: true, armar: "() => { $('fVA').value = ''; }" });
      eq('★★ evolución en blanco: el aviso nombra firma, hemodinamia y vía aérea, en ese orden', r.gFalta, 'Falta: firma y hemodinamia y vía aérea');
      no('★ …y guardar() no guarda', r.guardo);
    }

    console.log('\n4 · Control positivo: con todo en regla el aviso queda vacío y guardar() guarda');
    {
      const r1 = await intento({ natural: true, armar: '() => {}' });
      eq('vía natural con firma y hemodinamia: el aviso está vacío', r1.gFalta, '');
      si('…y guardar() guarda', r1.guardo);
      const r2 = await intento({ armar: '() => { ' + SUP_SIN_EXT + " $('fPveSupRaz').value = 'Pabellón o procedimiento programado'; hPveSupExt(); setKTMstate('r'); }" });
      eq('★ PVE superada sin extubar CON su razón: el aviso está vacío', r2.gFalta, '');
      si('★ …y guardar() guarda', r2.guardo);
      const r3 = await intento({ armar: '() => { ' + SUP_SIN_EXT + " $('fPveSupRaz').value = 'Otra'; $('fPveSupDet').value = 'aseo quirúrgico a las 12'; hPveSupExt(); setKTMstate('r'); }" });
      eq('★ …con «Otra» y su detalle escrito: el aviso está vacío', r3.gFalta, '');
      si('★ …y guardar() guarda', r3.guardo);
    }
    console.log('\n5 · 🔴 (R4 y R10) UNA sola fuente para el nombre: la tabla paralela ya no existe y un obligatorio sin forma corta se nombra con su texto');
    {
      const e = await p.evaluate(() => {
        const out = { tabla: typeof _mFaltaTxt };
        /* Una función que todavía no acepta entradas no puede tumbar la guardia con una excepción: sale como un fallo con nombre. */
        try {
        /* Una entrada SIN `corto` (un obligatorio que alguien suma mañana y no escribe su forma corta) se nombra con su propio texto. */
        const hemo = [...document.querySelectorAll('#kf .fcard')].find(c => /Hemodinamia/.test((c.querySelector('.fcard-title') || {}).textContent || ''));
        const r = estadoBloque(hemo, [{ el: document.getElementById('fHEst'), texto: 'algo que falta' }]);
        out.sinCorto = r.faltaTxt; out.elemento = r.falta && r.falta.id; out.estado = r.estado;
        /* Una entrada CON `corto` se nombra con él, y la entrada de otra tarjeta no marca ésta. */
        const r2 = estadoBloque(hemo, [{ el: document.getElementById('fHEst'), texto: 'largo del aviso', corto: 'el corto del encabezado' }]);
        out.conCorto = r2.faltaTxt;
        const r3 = estadoBloque(hemo, [{ el: document.getElementById('fFirma'), texto: 'firma', corto: 'la firma' }]);
        out.ajena = r3.falta; out.ajenaEstado = r3.estado;
        } catch (err) { out.error = String(err && err.message || err); }
        return out;
      });
      if (e.error) eq('estadoBloque acepta las entradas {el, texto, corto}', 'ERROR: ' + e.error, 'sin error');
      eq('★★ la segunda tabla de nombres por id (_mFaltaTxt) ya no existe', e.tabla, 'undefined');
      eq('★★ una entrada sin `corto` se nombra con su texto, no con un genérico', e.sinCorto, 'algo que falta');
      eq('…y marca el elemento de la entrada', e.elemento, 'fHEst');
      eq('…y la tarjeta queda «rev»', e.estado, 'rev');
      eq('★ una entrada con `corto` se nombra con él', e.conCorto, 'el corto del encabezado');
      eq('una entrada de OTRA tarjeta no marca ésta', e.ajena, null);
    }
    await p.close();
  }

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ aviso_igual_que_guardar: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ aviso_igual_que_guardar: todo verde');
  process.exit(fails.length ? 1 : 0);
})();
