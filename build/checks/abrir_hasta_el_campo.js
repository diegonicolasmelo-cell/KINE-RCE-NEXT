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
//
// 🪤 «Visible» se mide con la geometría real y con los ancestros, no con `_vis`: `_vis` quita a propósito las clases
// de plegado para preguntar otra cosa, así que daría verde justo donde el campo no se ve.
// 🪤 La rama de FIRMA de guardar() hace `focus()` directo y no pasa por `_irAlCampo` (zona ya cerrada de la tanda 2):
// se mide aparte, como «conocido», sin tumbar la batería. Ver el bloque 6.
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

    /* Abre el turno de la cama 3 desde cero (tubo + VM, o vía natural), con la firma y la hemodinamia en regla
       salvo que se pida lo contrario, y se queda en el paso `pasoInicial`. */
    const abrir = (o) => p.evaluate(async x => {
      $('kf').reset(); $('gDate').value = '2026-08-10'; SHIFT = 'Dia';
      window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
      DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', VIA_AEREA: x.natural ? 'Natural' : 'TOT', SOPORTE: x.natural ? 'Ambiente' : 'VM',
        FECHA_INGRESO: '2026-08-03', TS_INGRESO: '2026-08-03 23:00:00', FECHA_INICIO_VA: '2026-08-06', TS_INICIO_VA: '2026-08-06 10:00:00',
        FECHA_INICIO_SOPORTE: '2026-08-06', TS_INICIO_SOPORTE: '2026-08-06 10:00:00' }];
      window.recargarSilencioso = () => {}; window._ll.length = 0; renderGrid(); abrirPanel('3', false, false);
      await new Promise(r => setTimeout(r, 800));
      /* 🪤 Los sub-bloques de Respiratorio se arman UNA vez por página (`_mSubBloques` sale si «ya armado») y conservan
         lo que el escenario anterior abrió; mAcordeonInit sí vuelve a plegar las tarjetas. Se devuelven a su estado de
         nacimiento para que cada escenario parta igual que una pantalla recién abierta. */
      if (document.getElementById('msEvt')) M_SUBS.forEach(c => { const b = document.getElementById(c.id); if (b) b.classList.toggle('cerrado', !c.abierto); });
      if (!x.sinFirma) { $('fFirma').appendChild(Object.assign(document.createElement('option'), { value: 'K.T.', textContent: 'K.T.' })); $('fFirma').value = 'K.T.'; }
      if (!x.sinHdn) { const he = $('fHEst'); if (he && !he.value) he.value = 'Estable'; const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos'; }
      _transAvisoOk = true;
      if (x.armar) new Function('return (' + x.armar + ')')()();
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
    console.log('\n6 · La rama de FIRMA de guardar() (conocido, no tumba la batería)');
    /* guardar() hace sel.focus() directo sobre la firma y no pasa por _irAlCampo: a 390 px, parado en Planes, el
       aviso dice «Debes seleccionar la firma» y el foco cae en una tarjeta plegada. guardar() es zona cerrada de la
       tanda 2 y esta tanda no la edita; se deja medido para que se vea. El día que esa rama use _irAlCampo, esto
       pasa a ✅ solo y conviene volverlo una aserción. */
    await abrir({ paso: 5, sinFirma: true });
    const f0 = await estado('fFirma');
    await p.evaluate(() => { window._ll.length = 0; guardar(); });
    await espera(400);
    const f1 = await estado('fFirma');
    no('la firma sin elegir NO guarda', await p.evaluate(() => window._ll.some(l => l.a === 'GUARDAR_EVOLUCION')));
    console.log((f1.real ? '✅' : 'ℹ️ ') + ' (conocido) la firma vía guardar() queda ' + (f1.real ? 'visible' : 'NO visible') +
      ' en ' + ancho + ' px · tarjeta plegada al partir: ' + f0.mcol);
    /* Lo que SÍ se fija: si alguien llama a _irAlCampo('fFirma') (el camino que se le ofrecería a la rama de firma),
       la firma queda a la vista y con el foco. */
    await p.evaluate(() => _irAlCampo('fFirma'));
    await espera(300);
    const f2 = await estado('fFirma');
    si('★★ _irAlCampo(\'fFirma\') deja la firma REALMENTE visible', f2.real);
    si('★ …y con el foco', f2.foco);
    if (movil) no('★ …y su tarjeta (Cerrar el turno) ya no está plegada', f2.mcol);

    await p.close();
  }

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ abrir_hasta_el_campo: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
