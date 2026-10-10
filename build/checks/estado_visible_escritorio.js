// estado_visible_escritorio.js — LA PALABRA DE ESTADO SE VE EN CADA TARJETA DEL TURNO, EN ESCRITORIO Y EN CELULAR (tanda 3 ·
// cambio 5 del plan de limpieza del registro de evolución, oct-2026).
//
// EL FALLO. El plan pide que cada desplegable diga «Sin registrar» / «Registrado» / «Requiere revisión». Hoy el estado solo existía
// en el celular (✓ / — / ! y un resumen que dice «sin registrar» en minúscula) y en escritorio, donde hay MÁS bloques abiertos a la
// vez (6 tarjetas), no había forma de ver desde fuera qué estaba hecho y qué no: `.mst` y `.mres` eran `display:none` y
// `_mPintarSecciones` salía si `!esMovil()`. Cumple lo que acordó el 7.9 para los cajones de evaluaciones: un bloque que debe
// algo se nota desde fuera, sin abrirlo.
//
// LO QUE ESTA GUARDIA FIJA (a 1200 px y a 390 px).
//   1. Cada tarjeta del paso Turno que se ve muestra EXACTAMENTE una de las tres palabras de `ESTADO_PALABRAS` (comparación exacta,
//      con mayúscula inicial), en su encabezado y a la vista, y esa palabra coincide con `estadoBloque()` del mismo bloque.
//   2. Hemodinamia en blanco dice «Requiere revisión» y NOMBRA la hemodinamia; llena, «Registrado». Auscultación vacía, «Sin
//      registrar».
//   3. En el celular cada sub-bloque de Respiratorio dice lo mismo, y con el PEEP en 0 tecleado y nada más dice «Registrado».
//   4. Las tarjetas de OTROS pasos NO muestran la palabra (esta tanda solo toca el Turno: el resto toma las mismas palabras cuando
//      le toque su tanda, para no mezclar vocabularios), y en escritorio no se ve ningún ✓ ni resumen fuera del Turno.
//   5. La palabra sale de UNA constante: `_mPintarSecciones` no escribe las palabras a mano.
//   6. El encabezado se repinta al tocar un BOTÓN (PVE, prono, eventos): esos controles no disparan input ni change, y sin esto la
//      palabra quedaba vieja hasta el siguiente tecleo.
//   7. El encabezado no se desarma: nada se sale de la pantalla y el alto se mantiene.
//   8. 🔴 El resumen del encabezado NO interpreta HTML: antes el texto tecleado entraba por `innerHTML` sin escapar (solo escapaba
//      la rama «falta»), o sea que un valor con <etiquetas> del turno anterior de otro colega corría en la pantalla de quien abre.
//
// 🪤 Reloj congelado: lunes 10-ago-2026 11:00 (fuera de las ventanas trampa: Fiestas Patrias, cierre de año, cumpleaños y la media
// hora previa al cambio de turno). Solo datos ficticios.
//
// Uso: node build/checks/estado_visible_escritorio.js
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright-core');
const v2 = path.join(__dirname, '..', '..', 'v2');

const PALABRAS = ['Sin registrar', 'Registrado', 'Requiere revisión'];
const POR_ESTADO = { sin: 'Sin registrar', reg: 'Registrado', rev: 'Requiere revisión' };

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');
const seguro = async (p, fn, arg) => { try { return await p.evaluate(fn, arg); } catch (e) { return { __error: String(e && e.message || e).split('\n')[0] }; } };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const errs = [];

  // ── La palabra sale de UNA constante (estático) ──────────────────────────────────────────────
  console.log('0 · La palabra de estado viene de UNA constante');
  const src = fs.readFileSync(path.join(v2, 'index.html'), 'utf8');
  eq('la constante ESTADO_PALABRAS se define una sola vez', (src.match(/const\s+ESTADO_PALABRAS\s*=/g) || []).length, 1);
  /* Las dos funciones que pintan el encabezado: _mPintarSecciones (reparte) y _mPintarEstado (escribe). Ninguna lleva las palabras a mano. */
  const cuerpo = n => { const i = src.indexOf('function ' + n + '('); return i < 0 ? '' : src.slice(i, src.indexOf('\n}\n', i)); };
  const cuerpoPint = cuerpo('_mPintarSecciones') + '\n' + cuerpo('_mPintarEstado');
  si('_mPintarSecciones y _mPintarEstado existen', cuerpo('_mPintarSecciones') !== '' && cuerpo('_mPintarEstado') !== '');
  si('…y el encabezado toma las palabras de ESTADO_PALABRAS', /ESTADO_PALABRAS/.test(cuerpoPint));
  no('…y no escribe «Requiere revisión» a mano', /Requiere revisi[oó]n/.test(cuerpoPint));
  no('…ni «Registrado»', /['"`]Registrado['"`]/.test(cuerpoPint));
  no('…ni «Sin registrar» con mayúscula', /['"`]Sin registrar['"`]/.test(cuerpoPint));

  for (const ancho of [1200, 800, 390]) {
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
    await p.evaluate(() => {
      /* ¿se ve de VERDAD? rectángulo con tamaño y ningún ancestro con display:none / visibility:hidden. */
      window._real = el => {
        if (!el || !document.contains(el)) return false;
        for (let a = el; a && a !== document.documentElement; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden') return false; }
        const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0;
      };
      window._card = re => [...document.querySelectorAll('#kf .fcard')].find(c => re.test((c.querySelector('.fcard-title') || {}).textContent || ''));
      /* Una foto de la cabecera de una tarjeta o de un sub-bloque. */
      window._cab = el => {
        const h = el.querySelector(':scope > .fcard-hdr, :scope > .msub-h');
        const pal = h ? [...h.querySelectorAll('.mpal')] : [];
        const mres = h && h.querySelector('.mres'), mst = h && h.querySelector('.mst');
        const hr = h ? h.getBoundingClientRect() : null, pr = pal[0] ? pal[0].getBoundingClientRect() : null;
        return { n: pal.length, palabra: pal[0] ? pal[0].textContent : null, visible: pal[0] ? _real(pal[0]) : false,
          mstVisible: mst ? _real(mst) : false, glifo: mst ? mst.textContent : null, mresVisible: mres ? _real(mres) : false,
          texto: mres ? mres.textContent : '', alto: hr ? Math.round(hr.height) : 0,
          dentro: !!(pr && hr && pr.left >= hr.left - 1 && pr.right <= hr.right + 1 && pr.right <= innerWidth + 1),
          esperada: (() => { try { return ESTADO_PALABRAS[estadoBloque(el.classList.contains('msub') ? el.querySelector('.msub-b') : el).estado]; } catch (e) { return 'ERROR: ' + e.message; } })() };
      };
    });

    const abrir = (o) => p.evaluate(async x => {
      $('kf').reset(); $('gDate').value = '2026-08-10'; SHIFT = 'Dia';
      window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
      DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', VIA_AEREA: x.va || 'TOT', SOPORTE: x.sop || 'VM',
        FECHA_INGRESO: '2026-08-03', TS_INGRESO: '2026-08-03 23:00:00', FECHA_INICIO_VA: '2026-08-06', TS_INICIO_VA: '2026-08-06 10:00:00',
        FECHA_INICIO_SOPORTE: '2026-08-06', TS_INICIO_SOPORTE: '2026-08-06 10:00:00' }];
      window.recargarSilencioso = () => {}; window._ll.length = 0; renderGrid(); abrirPanel('3', false, false);
      await new Promise(r => setTimeout(r, 800));
      if (document.getElementById('msEvt')) M_SUBS.forEach(c => { const bb = document.getElementById(c.id); if (bb) bb.classList.toggle('cerrado', !c.abierto); });
      $('fFirma').appendChild(Object.assign(document.createElement('option'), { value: 'K.T.', textContent: 'K.T.' })); $('fFirma').value = 'K.T.';
      if (!x.sinHdn) { $('fHEst').value = 'Estable'; $('fDVA').value = 'Sin requerimientos'; }
      PROCS.length = 0; FASES_SEL = new Set(); window._pronoAbierto = false; window.__xss = undefined; _transAvisoOk = true;
      pasoIr(x.paso == null ? 2 : x.paso); rielRender();
      await new Promise(r => setTimeout(r, 300));
    }, o);
    /* Ejecuta algo POR CÓDIGO y repinta el estado a mano (rielRender), como lo haría un teclazo. Lo que se prueba sobre el repintado al
       TOCAR un botón va aparte (sección 3), con un click de verdad. */
    const ejecuta = (fn) => p.evaluate(async f => { new Function('return (' + f + ')')()(); rielRender(); await new Promise(r => setTimeout(r, 450)); }, fn.toString());
    const cab = (re) => seguro(p, r => _cab(_card(new RegExp(r))), re);
    const cabId = (id) => seguro(p, i => _cab(document.getElementById(i)), id);

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n1 · 🔴 Cada tarjeta del Turno muestra UNA de las tres palabras, a la vista');
    await abrir({ sinHdn: true });
    await p.evaluate(() => { FASES_SEL.add('Neuroprotección'); aplicarGatesNeuro(); rielRender(); });
    await p.waitForTimeout(400);
    const todas = await seguro(p, () => [...document.querySelectorAll('#kf .fcard')]
      .filter(c => String(c.dataset.paso || '2') === '2' && !c.classList.contains('hidden'))
      .map(c => Object.assign({ nombre: ((c.querySelector('.fcard-title') || {}).textContent || c.id).replace(/^[^A-Za-zÁ-ú]+/, '').trim() }, _cab(c))));
    eq('las tarjetas del Turno que se ven son 7 (con Neurología abierta por su fase)', Array.isArray(todas) ? todas.length : 'ERROR: ' + (todas.__error || '?'), 7);
    for (const c of (Array.isArray(todas) ? todas : [])) {
      const nombre = c.nombre;
      eq('«' + nombre + '»: exactamente UNA palabra de estado', c.n, 1);
      si('«' + nombre + '»: …es una de las tres del plan (comparación exacta)', PALABRAS.includes(c.palabra));
      si('«' + nombre + '»: …y se VE', c.visible);
      eq('«' + nombre + '»: …y coincide con estadoBloque() del mismo bloque', c.palabra, c.esperada);
      si('«' + nombre + '»: …y el ✓ / — / ! también se ve (se conserva)', c.mstVisible && ['✓', '—', '!'].includes(c.glifo));
      si('«' + nombre + '»: …y cabe dentro del encabezado, sin salirse de la pantalla', c.dentro);
      if (!movil) si('«' + nombre + '»: …y el encabezado no se dispara de alto (<70 px)', c.alto > 0 && c.alto < 70);
    }
    const ancho0 = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    si('nada se desborda de la pantalla', ancho0);
    /* La fase «Neuroprotección» era solo el medio para abrir Neurología: se quita para que Fase clínica vuelva a estar vacía. */
    await ejecuta(() => { FASES_SEL.delete('Neuroprotección'); aplicarGatesNeuro(); rielRender(); });

    console.log('\n2 · Lo que dice cada una');
    const hemoVacia = await cab('Hemodinamia');
    eq('★★ Hemodinamia en blanco → «Requiere revisión»', hemoVacia.palabra, 'Requiere revisión');
    si('★★ …y el encabezado nombra la hemodinamia', /hemodinamia/i.test(hemoVacia.texto || ''));
    eq('…con el «!»', hemoVacia.glifo, '!');
    eq('★ Auscultación vacía → «Sin registrar»', (await cab('Auscultaci')).palabra, 'Sin registrar');
    eq('Fase clínica sin fase → «Sin registrar»', (await cabId('fcFase')).palabra, 'Sin registrar');
    eq('Procedimientos sin nada → «Sin registrar»', (await cab('Procedimientos')).palabra, 'Sin registrar');
    eq('Sedación con su opción «Sin sedación» ya puesta → «Registrado» (como hoy)', (await cab('Sedaci')).palabra, 'Registrado');
    eq('Respiratorio con la PVE sin responder → «Requiere revisión»', (await cabId('fcRespCard')).palabra, 'Requiere revisión');
    await ejecuta(() => { $('fHEst').value = 'Estable'; $('fDVA').value = 'Sin requerimientos'; rielRender(); });
    eq('★★ Hemodinamia con estado y DVA → «Registrado»', (await cab('Hemodinamia')).palabra, 'Registrado');
    eq('…con el «✓»', (await cab('Hemodinamia')).glifo, '✓');
    eq('…y el «Requiere revisión» de Respiratorio sigue (la PVE)', (await cabId('fcRespCard')).palabra, 'Requiere revisión');
    await ejecuta(() => { FASES = ['Weaning']; renderFases(); toggleFase('Weaning'); });
    eq('una fase elegida → Fase clínica «Registrado»', (await cabId('fcFase')).palabra, 'Registrado');
    await ejecuta(() => { PROCS.push('Prueba'); renderChips(); });
    eq('un procedimiento agregado → Procedimientos «Registrado»', (await cab('Procedimientos')).palabra, 'Registrado');

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n3 · 🔴 El encabezado se repinta al TOCAR UN BOTÓN (los botones no disparan input ni change)');
    await abrir({});
    eq('con la PVE sin responder, Respiratorio pide revisión', (await cabId('fcRespCard')).palabra, 'Requiere revisión');
    await p.evaluate(() => document.getElementById('btnPVESi').click());
    await p.waitForTimeout(600);
    eq('★★ tocar «PVE sí» (un botón) → Respiratorio pasa a «Registrado» sin tocar nada más', (await cabId('fcRespCard')).palabra, 'Registrado');
    si('…y el aviso de arriba ya no pide la PVE', await p.evaluate(() => !/PVE/.test(document.getElementById('gFalta').textContent)));

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n4 · Las tarjetas de OTROS pasos no muestran la palabra');
    const otros = await p.evaluate(() => {
      const fuera = [...document.querySelectorAll('#kf .fcard')].filter(c => String(c.dataset.paso || '2') !== '2');
      return { n: fuera.length, conPalabra: fuera.filter(c => c.querySelector('.mpal')).map(c => c.id),
        estadoVisible: fuera.filter(c => [...c.querySelectorAll('.mst,.mres')].some(e => _real(e) || (getComputedStyle(e).display !== 'none' && innerWidth > 740))).map(c => c.id) };
    });
    si('hay tarjetas de otros pasos (Prevención, Evaluaciones, Terapia física, IMT, Cerrar el turno, Ingreso)', otros.n >= 5);
    eq('★ ninguna lleva la palabra de estado', otros.conPalabra.join(','), '');
    if (!movil) eq('★ y en escritorio no se ve ningún ✓ ni resumen fuera del Turno', otros.estadoVisible.join(','), '');
    if (!movil) eq('…ni siquiera se pintan (no se calcula lo que no se muestra)', await p.evaluate(() =>
      [...document.querySelectorAll('#kf .fcard')].filter(c => String(c.dataset.paso || '2') !== '2' && c.querySelector('.fcard-hdr .mst, .fcard-hdr .mres')).map(c => c.id).join(',')), '');

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    if (movil) {
      console.log('\n5 · Los sub-bloques de Respiratorio dicen lo mismo');
      await abrir({ sinHdn: true });
      /* En el celular todas las tarjetas nacen plegadas: los encabezados de los sub-bloques solo se ven con Respiratorio abierta. */
      await p.evaluate(() => document.getElementById('fcRespCard').classList.remove('mcol'));
      for (const id of ['msVent', 'msEvt', 'msMan']) {
        const c = await cabId(id);
        eq('sub-bloque ' + id + ': exactamente una palabra', c.n, 1);
        si('…del plan y a la vista', PALABRAS.includes(c.palabra) && c.visible);
        eq('…y coincide con estadoBloque()', c.palabra, c.esperada);
      }
      eq('★ «Eventos de vía aérea» con la PVE pendiente → «Requiere revisión»', (await cabId('msEvt')).palabra, 'Requiere revisión');
      eq('«Manejo respiratorio» vacío → «Sin registrar»', (await cabId('msMan')).palabra, 'Sin registrar');
      await p.evaluate(() => document.getElementById('btnPVESi').click());
      await p.waitForTimeout(600);
      eq('★★ responder la PVE → «Eventos de vía aérea» pasa a «Registrado» (antes decía «— sin registrar»)', (await cabId('msEvt')).palabra, 'Registrado');
      await p.evaluate(() => document.getElementById('sqBtn2').click());
      await p.waitForTimeout(600);
      eq('★★ la cantidad de secreciones → «Manejo respiratorio» «Registrado»', (await cabId('msMan')).palabra, 'Registrado');
      await p.evaluate(() => {
        ['fSop', 'fInterfaz', 'fModo'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
        document.querySelectorAll('#dVentBloque input:not([type=hidden])').forEach(e => { e.value = ''; });
        rielRender();
      });
      await p.waitForTimeout(450);
      eq('«Ventilación» con los tres ejes y los parámetros vacíos → «Sin registrar»', (await cabId('msVent')).palabra, 'Sin registrar');
      await ejecuta(() => { const pp = document.getElementById('r_peep'); if (pp) { pp.value = '0'; pp.dispatchEvent(new Event('input', { bubbles: true })); } });
      eq('★★ …con PEEP 0 tecleado y nada más → «Registrado»', (await cabId('msVent')).palabra, 'Registrado');
    }

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n5b · 🔴 Un resumen LARGO no ensancha la tarjeta (el panel no se sale por la derecha)');
    await abrir({});
    await ejecuta(() => {
      $('fSed').value = 'Escalón 2'; hSed(); $('fSecrCar').value = 'Mucopurulentas con tinte hemático'; $('fTOTn').value = '7,5';
      $('cPosDCLD').checked = true; $('fPosLibre').value = 'Decúbito lateral derecho con almohada bajo el flanco';
    });
    const largo = await p.evaluate(() => {
      const pc = document.querySelector('#sp .pcontent'), c = document.getElementById('fcRespCard'), h = c.querySelector('.fcard-hdr');
      return { pcontent: pc.scrollWidth - pc.clientWidth, doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        card: Math.round(c.getBoundingClientRect().width), hdr: Math.round(h.getBoundingClientRect().height),
        txt: c.querySelector('.fcard-hdr .mres').textContent, palabra: c.querySelector('.fcard-hdr .mpal') ? c.querySelector('.fcard-hdr .mpal').textContent : null };
    });
    eq('★★ el contenido del panel no se desborda a la derecha con un resumen largo', largo.pcontent <= 0, true);
    eq('…ni la página', largo.doc <= 0, true);
    si('…y el encabezado sigue diciendo la palabra y lo que falta, aunque el resumen se corte', /^Requiere revisión falta declarar la PVE/.test(largo.txt));

    console.log('\n6 · 🔴 El resumen del encabezado NO interpreta HTML');
    await abrir({});
    await ejecuta(() => { const e = document.getElementById('inProc'); e.value = '<img src=x onerror="window.__xss=1">'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await p.waitForTimeout(500);
    const xss = await p.evaluate(() => {
      const c = _card(/Procedimientos/), rs = c && c.querySelector('.fcard-hdr .mres');
      return { xss: window.__xss === 1, img: !!(rs && rs.querySelector('img')), texto: rs ? rs.textContent : null };
    });
    no('★★ una <etiqueta> tecleada NO se ejecuta (window.__xss)', xss.xss);
    no('★★ …ni se convierte en un elemento del encabezado', xss.img);
    si('…se muestra como texto', /<img/.test(xss.texto || ''));

    await p.close();
  }

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ estado_visible_escritorio: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ estado_visible_escritorio: cada tarjeta del Turno dice su estado.');
})();
