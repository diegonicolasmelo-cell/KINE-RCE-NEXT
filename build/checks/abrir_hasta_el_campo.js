// abrir_hasta_el_campo.js — «El error lleva al campo» también cuando el campo está PLEGADO (tanda 3 · cambio 1 y
// tanda 4 · cambio 3 del plan de limpieza del registro de evolución, oct-2026).
//
// EL FALLO. `_irAlCampo` (la que llaman los avisos de «falta esto» de guardar y el ingreso) solo cambiaba de PASO.
// Pero a 390 px el panel es un acordeón: `mAcordeonInit` pliega TODAS las tarjetas (`mcol`) y Respiratorio, además,
// se parte en sub-bloques con tres cerrados de nacimiento (`msub.cerrado`: «Eventos de vía aérea» y «Manejo
// respiratorio»). `_vis` ya trata ese plegado como presentación —por eso el guardado SÍ exige el campo plegado—, pero
// el aviso no lo abría: el toast decía «Define la PVE de este turno» y el foco caía dentro de una tarjeta con
// `display:none`. La PVE y las razones de KTM, que son justo lo que más se olvida, viven en bloques plegados. Lo
// mismo le pasaba al `scrollA` de `setEventoVA`: al apretar «Extubación» en el celular el bloque de la PVE
// (`#dExtSec`) está en «Eventos de vía aérea» (cerrado) y no pasaba nada a la vista. Y, midiéndolo, apareció un
// defecto más viejo en esa misma línea: `setEventoVA('ext')` hacía `scrollA('dPVE')`, un id que NO existe en la
// pantalla (el bloque se llama `dExtSec`), y `scrollA('fPVEval')`, que es un <input type=hidden>. Los dos eran
// no-op: en NINGÚN ancho «Extubación» llevaba a la PVE. Con el id arreglado, el scroll también lo cubre.
//
// LO QUE ESTA GUARDIA FIJA.
//   1. `_abrirHastaCampo(el)` deja a la vista lo que esconde al campo por PRESENTACIÓN: la tarjeta plegada (mcol), el
//      sub-bloque cerrado (msub.cerrado) y los <details> cerrados; devuelve true si abrió algo y false si no hacía
//      falta. Solo abre la cadena del campo: las demás tarjetas plegadas siguen plegadas.
//   2. `_irAlCampo` la usa: el campo queda REALMENTE visible (rectángulo con tamaño y ningún ancestro con
//      display:none; NO `_vis`, que ignora justamente el plegado) y con el foco.
//   3. `setEventoVA('ext')` lleva al bloque de la PVE (`#dExtSec`): el scroll cae en un elemento que existe y se ve, y
//      en el celular abre su tarjeta y su sub-bloque.
//   4. En escritorio no hay plegado: es un no-op (salvo un <details> cerrado, que sí se abre).
//   5. (F2, 10-oct-2026) Las ramas de guardar() que antes avisaban SIN llevar al campo —la FIRMA, los RANGOS fisiológicos
//      (FiO2, VT, FR, SpO2, PEEP, edad, talla) y el APACHE fuera de rango— lo llevan: cambian de paso, abren la cadena
//      que lo esconde y lo enfocan, a 390 y a 1200 px. Cada rama se mide aparte y con el MENSAJE ya escrito (el toast no
//      cambió: solo adónde lleva). Edad y talla viven en la ficha del episodio (plegada fuera del ingreso) y el APACHE
//      en la familia «Preingreso» de Evaluaciones (se cierra al abrir otra): `_abrirHastaCampo` también las abre.
//   6. (F2) «Ir al bloque de …» del aviso de transición (`transOfIr`) lleva a un lugar que se VE: cierra el modal, cambia
//      al paso del bloque y deja con foco el botón del evento en «Eventos de vía aérea». Antes se quedaba en el paso del
//      guardado y apuntaba a un <input type=hidden> (extubación) o a una casilla escondida (intubación, decanulación).
//
// 🪤 «Visible» se mide con la geometría real y con los ancestros, no con `_vis`: `_vis` quita a propósito las clases
// de plegado para preguntar otra cosa, así que daría verde justo donde el campo no se ve.
// 🪤 La rama de FIRMA de guardar() hacía `focus()` directo y no pasaba por `_irAlCampo` (zona cerrada de la tanda 2);
// el bloque 6 la medía como «conocido» sin tumbar la batería. Con F2 pasó a ser una aserción (bloque 6).
// 🪤 Reloj congelado: lunes 10-ago-2026 11:00, fuera de las ventanas trampa (Fiestas Patrias, cierre de año y la
// media hora previa al cambio de turno), y turno forzado. Se inventa la fecha, no se espera.
//
// Uso: node build/checks/abrir_hasta_el_campo.js
const path = require('path');
const { chromium } = require('playwright-core');
const v2 = path.join(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

/* Se inyecta en la página: ¿el elemento se ve DE VERDAD? Rectángulo con tamaño, ningún ancestro con display:none o
   visibility:hidden y ningún <details> cerrado por encima (Chrome le da tamaño al contenido de un details cerrado, por
   eso no basta con el rectángulo). */
const MIDE = () => {
  window._real = el => {
    if (!el || !document.contains(el)) return false;
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    }
    const d = el.closest('details:not([open])');
    if (d && !(el.closest('summary') && el.closest('summary').parentElement === d)) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  window._foco = el => document.activeElement === el;
  window._enPantalla = el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth; };
};

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const errs = [];

  for (const ancho of [390, 1200]) {
    const movil = ancho === 390;
    console.log('\n══════ pantalla de ' + ancho + ' px ══════');
    const p = await b.newPage({ viewport: { width: ancho, height: movil ? 844 : 900 }, locale: 'es-CL', isMobile: movil, hasTouch: movil });
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
    await p.evaluate(MIDE);
    /* El toast se ESPÍA: el mensaje de cada aviso no cambió y esta guardia lo exige (F2 cambia adónde lleva, no qué dice). */
    await p.evaluate(() => { window._toasts = []; const t0 = window.toast; window.toast = function (m, ...r) { window._toasts.push(String(m)); return t0.apply(this, [m, ...r]); }; });

    /* Abre el turno de la cama 3 desde cero (tubo + VM, o vía natural), con la firma y la hemodinamia en regla
       salvo que se pida lo contrario, y se queda en el paso `pasoInicial`. */
    const abrir = (o) => p.evaluate(async x => {
      $('kf').reset(); $('gDate').value = '2026-08-10'; SHIFT = 'Dia';
      window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
      const va0 = x.va || (x.natural ? 'Natural' : 'TOT');
      DB = [{ ID_CAMA: '3', OCUPADA: !x.ingreso, PATIENT_ID: x.ingreso ? '' : 'p3', NOMBRE: x.ingreso ? '' : 'P', VIA_AEREA: va0, SOPORTE: va0 === 'Natural' ? 'Ambiente' : 'VM',
        FECHA_INGRESO: '2026-08-03', TS_INGRESO: '2026-08-03 23:00:00', FECHA_INICIO_VA: '2026-08-06', TS_INICIO_VA: '2026-08-06 10:00:00',
        FECHA_INICIO_SOPORTE: '2026-08-06', TS_INICIO_SOPORTE: '2026-08-06 10:00:00' }];
      window.recargarSilencioso = () => {}; window._ll.length = 0; window._toasts.length = 0; renderGrid(); abrirPanel('3', !!x.ingreso, !!x.ficha);
      await new Promise(r => setTimeout(r, 800));
      /* 🪤 Los sub-bloques de Respiratorio se arman UNA vez por página (`_mSubBloques` sale si «ya armado») y conservan
         lo que el escenario anterior abrió; mAcordeonInit sí vuelve a plegar las tarjetas. Se devuelven a su estado de
         nacimiento para que cada escenario parta igual que una pantalla recién abierta. */
      if (document.getElementById('msEvt')) M_SUBS.forEach(c => { const b = document.getElementById(c.id); if (b) b.classList.toggle('cerrado', !c.abierto); });
      if (!x.sinFirma) { $('fFirma').appendChild(Object.assign(document.createElement('option'), { value: 'K.T.', textContent: 'K.T.' })); $('fFirma').value = 'K.T.'; }
      if (!x.sinHdn) { const he = $('fHEst'); if (he && !he.value) he.value = 'Estable'; const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos'; }
      _transAvisoOk = true;
      /* `armar` va ANTES de la PVE: un escenario que cambia la vía aérea (TOT) tiene que hacerlo antes de contestarla. */
      if (x.armar) new Function('return (' + x.armar + ')')()();
      if (x.pve) { hPVEtoggle('nc'); const r = $('fPveNcRaz'); if (r) { r.value = 'Ventilación mecánica domiciliaria'; hPveNcRaz(); } }   // con TOT hay que contestar la PVE
      pasoIr(x.paso); rielRender();
      await new Promise(r => setTimeout(r, 150));
      return { paso: PASO_ACTUAL };
    }, o);

    /* Estado de un campo: ¿se ve de verdad?, ¿tiene el foco?, ¿está plegada su tarjeta / su sub-bloque / su details? */
    const estado = (id) => p.evaluate(i => {
      const e = document.getElementById(i), c = e && e.closest('.fcard'), sb = e && e.closest('.msub'), d = e && e.closest('details');
      return { existe: !!e, real: _real(e), foco: _foco(e), enPantalla: !!e && _real(e) && _enPantalla(e), paso: PASO_ACTUAL,
        mcol: !!(c && c.classList.contains('mcol')), cerrado: !!(sb && sb.classList.contains('cerrado')), detalle: d ? d.open : null };
    }, id);
    const espera = ms => p.waitForTimeout(ms);
    /* Cuántas tarjetas del panel siguen plegadas, sin contar las que se nombran (las del campo). */
    const plegadasSalvo = (ids) => p.evaluate(i => [...document.querySelectorAll('#sp .fcard.mcol')]
      .filter(c => !i.some(x => c.contains(document.getElementById(x)))).length, ids);
    const totalTarjetas = () => p.evaluate(() => document.querySelectorAll('#sp .fcard').length);

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n1 · 🔴 La PVE sin responder (bloque «Eventos de vía aérea») lleva al botón, aunque esté plegado');
    await abrir({ paso: 3 });                                  // parado en OTRO paso: el aviso tiene que viajar
    const a0 = await estado('btnPVESi');
    si('hay un botón «PVE sí» en la planilla', a0.existe);
    if (movil) {
      si('★ de partida la tarjeta Respiratorio está plegada (mcol)', a0.mcol);
      si('★ …y el sub-bloque «Eventos de vía aérea» está cerrado', a0.cerrado);
    } else {
      no('en escritorio no hay tarjeta plegada', a0.mcol);
    }
    no('★ de partida el botón NO se ve', a0.real);
    const total = await totalTarjetas();
    const plegadasAntes = await plegadasSalvo(['btnPVESi']);
    await p.evaluate(() => { window._ll.length = 0; guardar(); });
    await espera(400);
    const a1 = await estado('btnPVESi');
    no('★★ guardar sin PVE: NO guarda', await p.evaluate(() => window._ll.some(l => l.a === 'GUARDAR_EVOLUCION')));
    eq('★ …y lleva al paso del campo (Turno)', a1.paso, 2);
    si('★★ …y el botón queda REALMENTE visible', a1.real);
    si('★★ …y con el foco', a1.foco);
    si('★ …y DENTRO de la pantalla (el aviso scrollea hasta él)', a1.enPantalla);
    if (movil) {
      no('★ …la tarjeta Respiratorio ya no está plegada', a1.mcol);
      no('★ …ni el sub-bloque «Eventos de vía aérea» cerrado', a1.cerrado);
      eq('★ …y las DEMÁS tarjetas siguen plegadas (solo se abre la cadena del campo)', await plegadasSalvo(['btnPVESi']), plegadasAntes);
      si('(control) había más de una tarjeta plegada para que lo anterior pruebe algo', plegadasAntes >= 2 && plegadasAntes < total + 1);
    }

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n2 · 🔴 La hemodinamia vacía (tarjeta propia) lleva al campo, aunque esté plegada');
    await abrir({ paso: 3, sinHdn: true });
    const h0 = await estado('fHEst');
    if (movil) si('★ de partida la tarjeta de Hemodinamia está plegada', h0.mcol);
    no('★ de partida el campo NO se ve', h0.real);
    await p.evaluate(() => { window._ll.length = 0; guardar(); });
    await espera(400);
    const h1 = await estado('fHEst');
    no('★★ guardar sin hemodinamia: NO guarda', await p.evaluate(() => window._ll.some(l => l.a === 'GUARDAR_EVOLUCION')));
    si('★★ …el campo queda REALMENTE visible', h1.real);
    si('★★ …y con el foco', h1.foco);
    if (movil) no('★ …y su tarjeta ya no está plegada', h1.mcol);

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n3 · 🔴 «Extubación» (setEventoVA) lleva al bloque de la PVE, que vive en «Eventos de vía aérea»');
    /* Dos arranques: con Respiratorio plegada (peor caso, también desde la consola) y con Respiratorio abierta pero
       «Eventos de vía aérea» cerrado (el camino real: la fila de eventos está en la tarjeta ya abierta). El scroll se
       ESPÍA: lo que importa no es solo que el bloque quede abierto sino que el scroll caiga en algo que existe y se ve
       (el id viejo, `dPVE`, no existía, y `fPVEval` es un input escondido). */
    for (const [etq, abrirResp] of [['Respiratorio plegada', false], ['Respiratorio abierta, eventos cerrados', true]]) {
      if (!movil && abrirResp) continue;
      await abrir({ paso: 2 });
      if (abrirResp) await p.evaluate(() => $('fcRespCard').classList.remove('mcol'));
      const e0 = await estado('dExtSec');
      si('(' + etq + ') el bloque de la PVE existe', e0.existe);
      if (movil) no('(' + etq + ') de partida el bloque de la PVE NO se ve', e0.real);
      const sc = await p.evaluate(async () => {
        const vistos = [], orig = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = function () { vistos.push({ id: this.id, real: _real(this) }); };
        try { setEventoVA('ext'); await new Promise(r => setTimeout(r, 300)); } finally { Element.prototype.scrollIntoView = orig; }
        return vistos;
      });
      si('★★ (' + etq + ') «Extubación» scrollea a un elemento que SE VE (hoy scrollea a un id inexistente y a un input escondido): ' + JSON.stringify(sc), sc.some(x => x.real));
      const e1 = await estado('dExtSec');
      si('★★ (' + etq + ') tras «Extubación» el bloque de la PVE se ve', e1.real);
      if (movil) { no('★ (' + etq + ') …su tarjeta no queda plegada', e1.mcol); no('★ (' + etq + ') …ni su sub-bloque cerrado', e1.cerrado); }
    }

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n4 · 🔴 Terapia física y Planes (tanda 4): el obligatorio de una tarjeta plegada lleva al campo');
    const ktm = async (etq, armar, campo, soloVer) => {
      await abrir({ paso: 5, armar });
      const k0 = await estado(campo);
      if (movil) si('★ (' + etq + ') de partida su tarjeta está plegada', k0.mcol);
      no('★ (' + etq + ') de partida el campo NO se ve', k0.real);
      await p.evaluate(() => { window._ll.length = 0; guardar(); });
      await espera(400);
      const k1 = await estado(campo);
      no('★★ (' + etq + ') NO guarda', await p.evaluate(() => window._ll.some(l => l.a === 'GUARDAR_EVOLUCION')));
      eq('★ (' + etq + ') lleva al paso 4 (Terapia física)', k1.paso, 4);
      si('★★ (' + etq + ') el campo queda REALMENTE visible', k1.real);
      if (!soloVer) si('★★ (' + etq + ') …y con el foco', k1.foco);
      si('★ (' + etq + ') …y DENTRO de la pantalla', k1.enPantalla);
      if (movil) no('★ (' + etq + ') …su tarjeta ya no está plegada', k1.mcol);
    };
    await ktm('KTM «No realizada» sin razón', "() => { hPVEtoggle('si'); setKTMstate('n'); }", 'fKTMnoRaz');
    await ktm('KTM «Contraindicada» sin contraindicación', "() => { hPVEtoggle('si'); setKTMstate('s'); }", 'fKTMcontra');
    await ktm('KTM «No realizada · Otro» sin fundamento', "() => { hPVEtoggle('si'); setKTMstate('n'); _ktmNoRazonSel('Otro'); }", 'fKTMnoCom');

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n5 · Un <details> cerrado también se abre, en celular y en escritorio');
    await abrir({ paso: 2 });
    const d0 = await estado('inProc');
    eq('de partida «Otro procedimiento» está cerrado', d0.detalle, false);
    no('★ de partida su campo NO se ve', d0.real);
    await p.evaluate(() => _irAlCampo('inProc'));
    await espera(300);
    const d1 = await estado('inProc');
    si('★★ _irAlCampo abre el <details> y el campo se ve', d1.real);
    si('★ …y recibe el foco', d1.foco);
    eq('★ …el <details> quedó abierto', d1.detalle, true);

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n5b · _abrirHastaCampo por sí sola');
    await abrir({ paso: 2 });
    const u = await p.evaluate(() => {
      const r = { existe: typeof _abrirHastaCampo === 'function' };
      if (!r.existe) return r;
      const el = document.getElementById('btnPVESi');
      r.primera = _abrirHastaCampo(el);          // abre lo que haga falta
      r.vista = _real(el);
      r.segunda = _abrirHastaCampo(el);          // ya no hay nada que abrir
      r.nulo = (() => { try { return _abrirHastaCampo(null); } catch (x) { return 'revienta'; } })();
      const abierto = document.getElementById('fSop');   // un campo de una sub-sección ya abierta (Ventilación)
      r.yaAbierto = _abrirHastaCampo(abierto);
      return r;
    });
    si('existe _abrirHastaCampo', u.existe);
    if (u.existe) {
      eq('abrir lo plegado devuelve ' + (movil ? 'true' : 'false') + ' (' + (movil ? 'abrió algo' : 'en escritorio no hay plegado') + ')', u.primera, movil);
      si('…y el campo se ve', u.vista);
      no('ya abierto: no hay nada que abrir y devuelve false', u.segunda);
      no('un elemento nulo no revienta y devuelve false', u.nulo);
      no('un campo que ya se veía no abre nada', u.yaAbierto);
    }

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n6 · 🔴 (F2) La rama de FIRMA de guardar() lleva al campo, aunque la tarjeta «Cerrar el turno» esté plegada');
    /* Antes: guardar() hacía sel.focus() directo. A 390 px, parado en Planes, el aviso decía «Debes seleccionar la firma» y
       el foco caía en una tarjeta con display:none (la guardia lo dejaba como «conocido»). Ahora pasa por _irAlCampo. */
    await abrir({ paso: 5, sinFirma: true });
    const f0 = await estado('fFirma');
    if (movil) { si('★ de partida la tarjeta «Cerrar el turno» está plegada', f0.mcol); no('★ de partida la firma NO se ve', f0.real); }
    else si('(escritorio) la firma ya está a la vista en Planes: lo que se mide es que conserve el foco', f0.real);
    await p.evaluate(() => { window._ll.length = 0; guardar(); });
    await espera(400);
    const f1 = await estado('fFirma');
    no('la firma sin elegir NO guarda', await p.evaluate(() => window._ll.some(l => l.a === 'GUARDAR_EVOLUCION')));
    eq('el mensaje de siempre', await p.evaluate(() => window._toasts.slice(-1)[0]), '⚠️ Debes seleccionar la firma del kinesiólogo antes de guardar');
    si('★★ la firma queda REALMENTE visible (hoy: ' + (f1.real ? 'visible' : 'NO visible') + ' en ' + ancho + ' px)', f1.real);
    si('★★ …y con el foco', f1.foco);
    si('★ …y DENTRO de la pantalla', f1.enPantalla);
    if (movil) no('★ …y su tarjeta (Cerrar el turno) ya no está plegada', f1.mcol);
    /* Y el camino directo sigue sirviendo (era lo que la guardia ya medía). */
    await abrir({ paso: 5, sinFirma: true });
    await p.evaluate(() => _irAlCampo('fFirma'));
    await espera(300);
    const f2 = await estado('fFirma');
    si('★★ _irAlCampo(\'fFirma\') deja la firma REALMENTE visible', f2.real);
    si('★ …y con el foco', f2.foco);
    if (movil) no('★ …y su tarjeta (Cerrar el turno) ya no está plegada', f2.mcol);

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n7 · 🔴 (F2) Los RANGOS fisiológicos (FiO₂, VT, FR, SpO₂, PEEP) llevan al campo desde Planes');
    /* TOT + VM con la PVE respondida, el valor fuera de rango en Respiratorio y el colega parado en el paso 5 con todas las
       tarjetas plegadas (390 px): el toast decía «FiO₂ (%) fuera de rango (21-100): 5» y no pasaba nada más. El mensaje NO
       cambia; solo adónde lleva. Cada campo se mide en un panel nuevo para que la tarjeta parta plegada. */
    const rango = async (etq, campo, valor, msg, pasoEsperado, extra) => {
      await abrir({ paso: 5, pve: true, ficha: !!(extra && extra.ficha), armar: "() => { document.getElementById('" + campo + "').value = '" + valor + "'; " + ((extra && extra.armar) || '') + " }" });
      const r0 = await estado(campo);
      no('★ (' + etq + ') de partida el campo NO se ve', r0.real);
      if (movil && !(extra && extra.sinPlegada)) si('★ (' + etq + ') de partida su tarjeta está plegada', r0.mcol);
      await p.evaluate(() => { window._ll.length = 0; guardar(); });
      await espera(400);
      const r1 = await estado(campo);
      no('★★ (' + etq + ') NO guarda', await p.evaluate(() => window._ll.some(l => l.a === 'GUARDAR_EVOLUCION')));
      eq('★ (' + etq + ') el mensaje de siempre', await p.evaluate(() => window._toasts.slice(-1)[0]), msg);
      eq('★ (' + etq + ') lleva al paso del campo', r1.paso, pasoEsperado);
      si('★★ (' + etq + ') el campo queda REALMENTE visible', r1.real);
      si('★★ (' + etq + ') …y con el foco', r1.foco);
      si('★ (' + etq + ') …y DENTRO de la pantalla', r1.enPantalla);
      if (movil) no('★ (' + etq + ') …su tarjeta ya no está plegada', r1.mcol);
    };
    await rango('FiO₂', 'r_fio2', '5', '⚠️ FiO₂ (%) fuera de rango (21-100): 5', 2);
    await rango('VT', 'r_vt', '5000', '⚠️ VT (ml) fuera de rango (50-1500): 5000', 2);
    await rango('FR', 'r_fr', '90', '⚠️ FR (rpm) fuera de rango (4-60): 90', 2);
    await rango('SpO₂', 'r_spo2', '150', '⚠️ SpO₂ (%) fuera de rango (0-100): 150', 2);
    await rango('PEEP', 'r_peep', '45', '⚠️ PEEP > 30 cmH₂O — verificar: 45', 2);
    /* La edad y la talla viven en la ficha del episodio: fuera del ingreso está plegada y se destapa a pedido. Con la
       ficha abierta (el colega la abrió para corregir) el campo está en el paso 2; con la ficha cerrada (un valor que quedó
       de antes en la cama) hay que destaparla o el aviso manda a un lugar vacío. */
    await rango('edad, ficha abierta', 'fEdad', '5', '⚠️ Edad fuera de rango (15-110): 5', 2, { ficha: true });
    await rango('talla, ficha abierta', 'fTalla', '50', '⚠️ Talla (cm) fuera de rango (100-230): 50', 2, { ficha: true });
    await rango('edad, ficha CERRADA', 'fEdad', '5', '⚠️ Edad fuera de rango (15-110): 5', 2);
    await rango('talla, ficha CERRADA', 'fTalla', '50', '⚠️ Talla (cm) fuera de rango (100-230): 50', 2);
    /* En el INGRESO la identificación es del paso 0 (único paso donde existe): el colega escribió la edad ahí, avanzó hasta
       Planes y al guardar tiene que volver al 0, no quedarse donde está. */
    await (async () => {
      await abrir({ paso: 5, pve: true, ingreso: true, armar: "() => { document.getElementById('fEdad').value = '5'; }" });
      const i0 = await estado('fEdad');
      eq('(control) de partida el colega está en el paso 5 y la cama es un ingreso', i0.paso + '|' + await p.evaluate(() => v('cIng')), '5|true');
      no('★ (edad, en el ingreso) de partida el campo NO se ve', i0.real);
      await p.evaluate(() => { window._ll.length = 0; guardar(); });
      await espera(400);
      const i1 = await estado('fEdad');
      no('★★ (edad, en el ingreso) NO guarda', await p.evaluate(() => window._ll.some(l => l.a === 'GUARDAR_EVOLUCION')));
      eq('★ (edad, en el ingreso) el mensaje de siempre', await p.evaluate(() => window._toasts.slice(-1)[0]), '⚠️ Edad fuera de rango (15-110): 5');
      eq('★ (edad, en el ingreso) vuelve al paso 0 (Ingreso)', i1.paso, 0);
      si('★★ (edad, en el ingreso) el campo queda REALMENTE visible', i1.real);
      si('★★ (edad, en el ingreso) …y con el foco', i1.foco);
    })();

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n8 · 🔴 (F2) El APACHE fuera de rango lleva al campo, también si su familia de Evaluaciones se cerró');
    /* El APACHE vive en la familia «Preingreso» del cajón de Evaluaciones (paso 3), que se cierra al abrir otra familia
       (un chip de PIM, por ejemplo): escribir el APACHE, medir una Pimáx y apretar Guardar dejaba el aviso sin campo. */
    const apache = async (etq, armar) => {
      await abrir({ paso: 5, pve: true, armar });
      const a0 = await estado('fApache');
      no('★ (' + etq + ') de partida el APACHE NO se ve', a0.real);
      await p.evaluate(() => { window._ll.length = 0; guardar(); });
      await espera(400);
      const a1 = await estado('fApache');
      no('★★ (' + etq + ') NO guarda', await p.evaluate(() => window._ll.some(l => l.a === 'GUARDAR_EVOLUCION')));
      eq('★ (' + etq + ') el mensaje de siempre', await p.evaluate(() => window._toasts.slice(-1)[0]), '⚠️ APACHE II fuera de rango: entero entre 0 y 71 (o déjalo vacío)');
      eq('★ (' + etq + ') lleva al paso 3 (Evaluaciones)', a1.paso, 3);
      si('★★ (' + etq + ') el APACHE queda REALMENTE visible', a1.real);
      si('★★ (' + etq + ') …y con el foco', a1.foco);
      si('★ (' + etq + ') …y DENTRO de la pantalla', a1.enPantalla);
      if (movil) no('★ (' + etq + ') …su tarjeta ya no está plegada', a1.mcol);
    };
    await apache('valor escrito, familia nunca abierta', "() => { document.getElementById('fApache').value = '99'; }");
    await apache('familia «Preingreso» cerrada por otra', "() => { document.getElementById('fApache').value = '99'; evFamAbrir('preingreso'); evFamAbrir('fuerza'); }");
    await apache('valor decimal (no entero)', "() => { document.getElementById('fApache').value = '12.5'; evFamAbrir('preingreso'); evFamAbrir('fuerza'); }");

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n9 · 🔴 (F2) «Ir al bloque de …» (aviso de transición) lleva a un lugar que se ve, desde el paso del guardado');
    /* El aviso sale al apretar Guardar (paso 5) cuando la vía aérea cambió sin evento. Su botón «Ir al bloque de X →»
       cerraba el modal y apuntaba a `_TRANS_EVENTOS[ev].ancla`: un <input type=hidden> (extubación) o una casilla escondida
       (intubación, decanulación). Ni cambiaba de paso ni abría nada: en ningún ancho pasaba NADA a la vista. */
    for (const [ev, va0, va1, etq] of [['ext', 'TOT', 'Natural', 'extubación'], ['intub', 'Natural', 'TOT', 'intubación'], ['decan', 'TQT', 'Natural', 'decanulación']]) {
      await abrir({ paso: 5, va: va0, pve: va1 === 'TOT',
        /* `abrir` deja _transAvisoOk en true (para que guardar() no abra el modal en los demás bloques): acá se necesita el modal. */
        armar: "() => { _transAvisoOk = false; const s = document.getElementById('fVA'); s.value = '" + va1 + "'; s.dispatchEvent(new Event('change', { bubbles: true })); }" });
      const botonEv = () => p.evaluate(e => { const b = document.querySelector('#evVAfila .ev-va[data-ev="' + e + '"]'); if (!b) return { existe: false };
        const sb = b.closest('.msub'), c = b.closest('.fcard');
        return { existe: true, real: _real(b), foco: document.activeElement === b, enPantalla: _real(b) && _enPantalla(b),
          cerrado: !!(sb && sb.classList.contains('cerrado')), mcol: !!(c && c.classList.contains('mcol')) }; }, ev);
      await p.evaluate(() => { window._ll.length = 0; guardar(); });
      await espera(400);
      const modal = () => p.evaluate(() => !!document.getElementById('transAviso')?.classList.contains('on'));
      si('(' + etq + ') apretar Guardar abre el aviso de transición', await modal());
      const hayBoton = await p.evaluate(e => !!([...document.querySelectorAll('#transAvisoLista button')].find(b => (b.getAttribute('onclick') || '').indexOf("transOfIr('" + e + "')") >= 0)), ev);
      si('(' + etq + ') …con su botón «Ir al bloque»', hayBoton);
      const b0 = await botonEv();
      si('(' + etq + ') existe el botón del evento en «Eventos de vía aérea»', b0.existe);
      no('★ (' + etq + ') de partida el botón del evento NO se ve', b0.real);
      await p.evaluate(e => { window._ll.length = 0; const b = [...document.querySelectorAll('#transAvisoLista button')].find(b => (b.getAttribute('onclick') || '').indexOf("transOfIr('" + e + "')") >= 0); if (b) b.click(); }, ev);
      await espera(400);
      const b1 = await botonEv();
      no('★ (' + etq + ') el modal se cerró', await modal());
      no('(' + etq + ') «Ir al bloque» NO guarda', await p.evaluate(() => window._ll.some(l => l.a === 'GUARDAR_EVOLUCION')));
      eq('★★ (' + etq + ') lleva al paso del bloque (Turno)', await p.evaluate(() => PASO_ACTUAL), 2);
      si('★★ (' + etq + ') el botón del evento queda REALMENTE visible', b1.real);
      si('★★ (' + etq + ') …y con el foco', b1.foco);
      si('★ (' + etq + ') …y DENTRO de la pantalla', b1.enPantalla);
      if (movil) { no('★ (' + etq + ') …su tarjeta ya no está plegada', b1.mcol); no('★ (' + etq + ') …ni «Eventos de vía aérea» cerrado', b1.cerrado); }
    }

    await p.close();
  }

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ abrir_hasta_el_campo: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
