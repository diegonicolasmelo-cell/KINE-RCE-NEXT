// fallo_guardado_visible.js — PRD «que no quede ninguna evolución sin guardar», O3b.
//
// Requisito de Manuel (13-sep-2026): un guardado que FALLA no puede avisarse
// solo con un toast de 3,2 s — si el kinesiólogo estaba mirando al paciente, el
// error se apaga solo y el botón vuelve a decir «💾 Guardar Evolución» como si
// nada. Aquí se fuerza el fallo y se exige: franja PERSISTENTE con su botón,
// _formDirty en true, el texto del formulario intacto, borrador local, y un
// reintento manual que remande los MISMOS datos sin duplicar viajes.
//
// 🔴 RECONCILIADA el 5-oct-2026 (tanda 2 del guardado seguro, G16/G17, paso 16), porque la CONVENCIÓN cambió de
// verdad y no para taparla. Hasta ayer esta guardia simulaba «la red cayó» con un `Error` pelado, esperaba UN reintento
// a los 3 s y exigía el texto «NO se guardó». Pero «la red cayó» NO es «no se guardó»: el primer intento pudo haber
// aterrizado y solo perderse la respuesta, y decir «NO se guardó» es la certeza falsa que hace que una evolución se
// escriba dos veces (o que se dé por perdida una que sí está). Desde el paso 12 el embudo `api()` distingue:
//
//   · el servidor NO contestó (red caída, tiempo agotado: `e.sinRespuesta`) → ÁMBAR «No confirmado», reintentos
//     automáticos a los 3, 10 y 30 s con la MISMA foto del paquete, y al agotarse queda en ámbar con «Reintentar ahora».
//     NUNCA pasa por sí solo a «NO se guardó» ni a «Guardado».
//   · el servidor CONTESTÓ que no (`e.codigo`: VALIDACION, CONFLICTO…) → ROJO «NO se guardó», un solo viaje (reenviar
//     lo mismo recibe lo mismo), con su «Reintentar».
//   · un Error que NO salió del embudo (un fallo de la propia pantalla): lo de siempre, un reintento a los 3 s y rojo.
//     Es el camino de compatibilidad que esta guardia usaba para TODO; se conserva atado en la sección C para que nadie
//     lo quite sin querer, pero ya no es lo que le pasa a una red caída de verdad.
//
// Lo que NO cambió, y por eso sigue exigido en las tres: la franja no se apaga sola, `_formDirty` sigue en true, el
// texto no se toca, queda borrador, y «Reintentar» manda los MISMOS datos y, al salir bien, pasa a «✓ Guardado hh:mm».
// Los detalles finos del ámbar (OP_ID, doble clic, éxito tardío, 45 s) los ata guardado_seguro_no_confirmado_g17.js.
//
// 🪤 RELOJ CONGELADO. Los 3, 10, 30 y 45 s no se esperan: `page.clock` de Playwright dobla Date y temporizadores, y se
// avanza a mano en un día INVENTADO (lunes 10-ago-2026, 11:00: ni Fiestas Patrias, ni cambio de turno, ni cierre de año).
// Antes esta guardia corría con el reloj real y esperaba segundos de verdad.
//
// Uso: node build/checks/fallo_guardado_visible.js (requiere playwright-core)
const { chromium } = require('playwright-core');
const path = require('path');
const IDX = path.resolve(__dirname, '..', '..', 'v2', 'index.html');
const T0 = new Date('2026-08-10T11:00:00').getTime();
const ANTES_DE_PAUSAR = 3600 * 1000;   // cuánto antes de T0 se instala el reloj falso (ver abrir())
// 🪤 DEMORA REAL DE PRUEBA. `RCE_DEMORA_REAL_MS=1500 node build/checks/fallo_guardado_visible.js` mete una pausa REAL (reloj de pared)
// antes de CADA `runFor`, que es lo que hace una máquina cargada entre dos pasos de la guardia. Con el reloj de verdad congelado no
// cambia nada; con un reloj que sigue corriendo, los reintentos de 3/10/30 s salen antes de lo esperado y la guardia se pone roja.
const DEMORA_REAL = Math.max(0, parseInt(process.env.RCE_DEMORA_REAL_MS || '0', 10) || 0);

(async () => {
  const fails = [];
  const eq = (l, g, w) => { const ok = String(g) === String(w); console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g)); if (!ok) fails.push(l); };

  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const errs = [];

  // Una página nueva por escenario, en un contexto propio: su localStorage, su franja y su cuadro no se mezclan con los de otro.
  async function abrir() {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('c:' + m.text()); });
    /* 🪤 `install` NO congela: el reloj falso sigue corriendo con el de pared y cualquier demora real entre dos pasos (una máquina cargada)
       se suma al tiempo falso, así que el reintento de 3, 10 o 30 s sale antes de lo que la guardia espera. `pauseAt` lo detiene y desde
       ahí solo `runFor` lo mueve. Contrapartida: un `setTimeout(…, 0)` de la página tampoco dispara solo, así que todo lo que espera una
       respuesta del doble de `google.script.run` va seguido de un `runFor`.
       🪤 Y se instala UNA HORA ANTES de T0: `pauseAt` solo viaja hacia adelante («Cannot fast-forward to the past»), y entre `install` y
       `pauseAt` el reloj corre con el de pared. Instalar en T0 y pausar en T0 funciona sin carga y revienta con ella, según cuánto tarde
       el segundo viaje; instalar antes deja un margen que ninguna demora real alcanza a gastar, y el reloj queda parado en T0 EXACTO. */
    await p.clock.install({ time: T0 - ANTES_DE_PAUSAR });   // Date y temporizadores falsos desde ANTES de cargar la página
    await p.clock.pauseAt(T0);
    if (DEMORA_REAL) { const avanzar = p.clock.runFor.bind(p.clock); p.clock.runFor = async ms => { await p.waitForTimeout(DEMORA_REAL); return avanzar(ms); }; }
    await p.addInitScript(() => {
      window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
        api(a) { setTimeout(() => ok({ ok: true, data: (a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : []) }), 5); }
      }; } }; } } } };
    });
    await p.goto('file://' + IDX);
    await p.clock.runFor(1500);
    p.cerrar = () => ctx.close();
    return p;
  }

  /* Deja el formulario como lo llenaría un colega y aprieta guardar. `modo` decide qué contesta el «servidor»:
       'red'      no contestó (lo que el embudo entrega para una red caída): Error con `sinRespuesta`
       'rechazo'  contestó que no: Error con `codigo` (VALIDACION)
       'sinBandera' un Error que no salió del embudo (el camino de compatibilidad) */
  const guardarFallando = (p, modo) => p.evaluate(m => {
    localStorage.clear();
    window.__toasts = []; window.toast = x => window.__toasts.push(x);
    window.__viajes = 0; window.__fotos = [];
    $('sp').classList.add('on'); $('cBed').value = '11'; $('cIng').value = 'false';
    const f = $('fFirma'); f.innerHTML = '<option value="KIN">KIN</option>'; f.value = 'KIN';
    /* 🔴 20-sep-2026 · La hemodinamia es OBLIGATORIA para guardar (Diego: «HDN pedir antes de avanzar»), así que el banco la llena como la llenaría un colega. 🪤 A propósito NO se rellena sola al cargar la página: eso recrearía dentro del banco justo el bug que se quitó —el dato puesto por el programa— y las guardias dejarían de ver el caso «nadie la miró». */
    {const _he=document.getElementById('fHEst'); if(_he&&!_he.value){_he.value='Estable';} const _hd=document.getElementById('fDVA'); if(_hd&&!_hd.value){_hd.value='Sin requerimientos';}}
    const va = $('fVA'); va.value = [...va.options].map(o => o.value).filter(Boolean)[0];
    $('fPlanes').value = 'bipedestación asistida'; _formDirty = true;
    window.gs = (a, d, ok) => ok([]);
    window.api = (a, d) => {
      window.__viajes++; window.__fotos.push(JSON.stringify(d));
      if (m === 'red') return Promise.reject(Object.assign(new Error('red caída'), { sinRespuesta: true }));
      if (m === 'rechazo') return Promise.reject(Object.assign(new Error('Falta la firma del kinesiólogo.'), { codigo: 'VALIDACION' }));
      return Promise.reject(new Error('red caída'));
    };
    guardar();
  }, modo);

  // Todo lo que se ve de la pantalla en este instante.
  const ver = p => p.evaluate(() => {
    const e = $('gEstadoGuardado');
    return {
      viajes: window.__viajes,
      fotosIguales: window.__fotos.length > 0 && new Set(window.__fotos).size === 1,
      toasts: window.__toasts.join(' | '),
      visible: !e.classList.contains('hidden'),
      estado: e.dataset.estado,
      texto: e.textContent.replace(/\s+/g, ' ').trim(),
      botones: [...e.querySelectorAll('button')].map(x => x.textContent.trim()).join('|'),
      botonGuardar: $('btnGuardar').textContent.trim(),
      cuadro: $('avErrOvl').classList.contains('on'),
      cuadroTit: $('avErrTit').textContent.trim(),
      dirty: _formDirty,
      sinGuardarVisible: (_tickSinGuardar(), !$('gSinGuardar').classList.contains('hidden')),
      texto_form: $('fPlanes').value,
      borrador: Object.keys(localStorage).filter(k => /^CAMA_11_/.test(k)).length,
    };
  });

  // Reintentar a mano: los MISMOS datos, un solo viaje, y al salir bien la franja pasa a ✓ con hora.
  async function reintentarAMano(p, etiqueta) {
    await p.evaluate(() => {
      window.__viajes = 0; window.__payload = null;
      window.api = (a, d) => { window.__viajes++; window.__payload = d; return Promise.resolve({ TEXTO_GENERADO: 'ok' }); };
      $('gEstadoGuardado').querySelector('button').click();
    });
    await p.clock.runFor(400);
    const r = await p.evaluate(() => {
      const e = $('gEstadoGuardado');
      return {
        viajes: window.__viajes,
        mismosDatos: !!(window.__payload && window.__payload.PLAN_PLANES === 'bipedestación asistida'),
        estado: e.dataset.estado,
        texto: e.textContent.trim(),
        dirty: _formDirty,
        cuadro: $('avErrOvl').classList.contains('on'),
        borrador: Object.keys(localStorage).filter(k => /^CAMA_11_/.test(k)).length,
      };
    });
    eq(etiqueta + ': Reintentar manda UN viaje (no se suma a los automáticos)', r.viajes, 1);
    eq('…con los MISMOS datos del intento fallido', r.mismosDatos, true);
    eq('al salir bien la franja pasa a la confirmación con hora', /^✓ Guardado \d{2}:\d{2}$/.test(r.texto), true);
    eq('…en estado «ok»', r.estado, 'ok');
    eq('…_formDirty vuelve a false', r.dirty, false);
    eq('…el cuadro del centro se cierra solo', r.cuadro, false);
    eq('…y el borrador local se descarta (ya está en el servidor)', r.borrador, 0);
  }

  /* ══ 0 · EL RELOJ ESTÁ DE VERDAD CONGELADO ══════════════════════════════════════════════════════════════════════ */
  console.log('0 · El reloj falso solo se mueve con runFor (1,5 s REALES sin runFor no mueven nada)');
  {
    const p = await abrir();
    const antes = await p.evaluate(() => { window.__sono = false; setTimeout(() => { window.__sono = true; }, 100); return Date.now(); });
    await p.waitForTimeout(1500);                 // 1,5 s de pared, sin tocar el reloj falso
    const quieto = await p.evaluate(() => ({ t: Date.now(), sono: window.__sono }));
    eq('★ el reloj parte EXACTO en el día inventado (T0 + los 1,5 s de arranque que avanzó runFor), no una hora antes de la instalación', antes, T0 + 1500);
    eq('★ pasados 1,5 s REALES sin runFor, Date.now() de la página no se movió', quieto.t - antes, 0);
    eq('★ …y un temporizador de 100 ms NO disparó solo', quieto.sono, false);
    await p.clock.runFor(100);
    const despues = await p.evaluate(() => ({ t: Date.now(), sono: window.__sono }));
    eq('…solo runFor lo mueve: tras runFor(100) pasaron exactamente 100 ms falsos', despues.t - antes, 100);
    eq('…y el temporizador de 100 ms disparó', despues.sono, true);
    await p.cerrar();
  }

  /* ══ A · LA RED CAYÓ DE VERDAD (el servidor no contestó): ÁMBAR, con reintentos a los 3, 10 y 30 s ═══════════════ */
  console.log('A · Sin respuesta del servidor: «No confirmado», nunca «NO se guardó»');
  {
    const p = await abrir();
    await guardarFallando(p, 'red');
    await p.clock.runFor(100);
    let v = await ver(p);
    eq('al primer fallo ya avisa: «Sin respuesta del servidor — reintentando»', /Sin respuesta del servidor/.test(v.toasts), true);
    eq('la franja del botón 💾 pasa a ÁMBAR («No confirmado»), no a rojo', v.estado, 'noconfirmado');
    eq('…visible', v.visible, true);
    eq('…dice que está reintentando', /No confirmado · Reintentando/.test(v.texto), true);
    eq('…y NO afirma lo que no sabe: ni «NO se guardó» ni «Guardado»', /NO se guardó|No se guardó|Guardado/.test(v.texto), false);
    eq('…ni en el aviso', /No se guardó|NO se guardó|No se pudo guardar/.test(v.toasts), false);
    eq('…con su botón «Reintentar ahora»', v.botones, 'Reintentar ahora');
    eq('el botón de guardar queda apagado mientras reintenta', v.botonGuardar, '⏳ Reintentando…');

    await p.clock.runFor(3400);   // t = 3,5 s
    v = await ver(p);
    eq('a los 3 s sale el primer reintento: dos viajes', v.viajes, 2);
    eq('…y sigue en ámbar', v.estado, 'noconfirmado');
    await p.clock.runFor(7000);   // t = 10,5 s
    v = await ver(p);
    eq('a los 10 s, el segundo: tres viajes', v.viajes, 3);
    eq('…y sigue en ámbar (la franja no se apaga sola pasados los 3,2 s del aviso)', v.visible && v.estado === 'noconfirmado', true);
    await p.clock.runFor(20000);  // t = 30,5 s
    v = await ver(p);
    eq('a los 30 s, el tercero: cuatro viajes (el intento y tres reintentos)', v.viajes, 4);
    eq('los cuatro salieron con la MISMA foto del paquete', v.fotosIguales, true);
    eq('agotados los reintentos queda en ÁMBAR: no pasó a «error»', v.estado, 'noconfirmado');
    eq('…ya sin «Reintentando»', /Reintentando/.test(v.texto), false);
    eq('…y sigue sin afirmar nada («NO se guardó» sería mentir si el primer intento aterrizó)', /NO se guardó|No se guardó|Guardado/.test(v.texto), false);
    eq('…con su botón «Reintentar ahora»', v.botones, 'Reintentar ahora');
    eq('el cuadro del centro avisa «No confirmado»', v.cuadro + '/' + v.cuadroTit, 'true/No confirmado');
    eq('el botón de guardar vuelve a quedar disponible', v.botonGuardar, '💾 Guardar Evolución');
    eq('_formDirty SIGUE en true', v.dirty, true);
    eq('…así que «⚠️ Sin guardar» no se apagó', v.sinGuardarVisible, true);
    eq('el texto escrito no se tocó', v.texto_form, 'bipedestación asistida');
    eq('se dejó borrador local por si el equipo se apaga ahora', v.borrador, 1);

    await p.clock.runFor(20000);  // t = 50,5 s: pasados los 45 s
    v = await ver(p);
    eq('pasados los 45 s no salen más viajes solos (después, solo manual)', v.viajes, 4);
    eq('…y la franja sigue en ámbar: no se apaga ni cambia por su cuenta', v.visible && v.estado === 'noconfirmado', true);

    await reintentarAMano(p, 'A');
    await p.cerrar();
  }

  /* ══ B · EL SERVIDOR CONTESTÓ QUE NO: ROJO «NO se guardó», un solo viaje ═════════════════════════════════════════ */
  console.log('\nB · El servidor contestó un rechazo: «NO se guardó» (esto SÍ se sabe)');
  {
    const p = await abrir();
    await guardarFallando(p, 'rechazo');
    await p.clock.runFor(100);
    let v = await ver(p);
    eq('un viaje: un rechazo del servidor no se reintenta solo (mandaría lo mismo y recibiría lo mismo)', v.viajes, 1);
    eq('el aviso dice la causa que contestó el servidor', /No se guardó: Falta la firma del kinesiólogo/.test(v.toasts), true);
    eq('la franja queda en estado de ERROR', v.estado, 'error');
    eq('…visible', v.visible, true);
    eq('…con el texto «NO se guardó»', /NO se guardó/.test(v.texto), true);
    eq('…y su botón Reintentar', v.botones, 'Reintentar');
    eq('el cuadro del centro dice «No se guardó»', v.cuadro + '/' + v.cuadroTit, 'true/No se guardó');
    eq('el botón de guardar vuelve a quedar disponible', v.botonGuardar, '💾 Guardar Evolución');
    eq('_formDirty SIGUE en true', v.dirty, true);
    eq('…así que «⚠️ Sin guardar» no se apagó', v.sinGuardarVisible, true);
    eq('el texto escrito no se tocó', v.texto_form, 'bipedestación asistida');
    eq('se dejó borrador local por si el equipo se apaga ahora', v.borrador, 1);
    await p.clock.runFor(50000);
    v = await ver(p);
    eq('pasados los 3,2 s del aviso y los 45 s, sigue en «error» (no se apaga solo)', v.visible && v.estado === 'error', true);
    eq('…y no salió ningún viaje más', v.viajes, 1);
    await reintentarAMano(p, 'B');
    await p.cerrar();
  }

  /* ══ C · UN ERROR QUE NO SALIÓ DEL EMBUDO: lo de siempre (compatibilidad) ═══════════════════════════════════════ */
  console.log('\nC · Un Error sin bandera (no salió del embudo): un reintento a los 3 s y rojo, como siempre');
  {
    const p = await abrir();
    await guardarFallando(p, 'sinBandera');
    await p.clock.runFor(3500);   // intento + reintento automático de 3 s
    let v = await ver(p);
    eq('un intento + un reintento automático: dos viajes, no más', v.viajes, 2);
    eq('el toast ❌ sigue avisando al tiro', /No se pudo guardar/.test(v.toasts), true);
    eq('la franja del botón 💾 queda en estado de ERROR', v.estado, 'error');
    eq('…visible', v.visible, true);
    eq('…con el texto «NO se guardó»', /NO se guardó/.test(v.texto), true);
    eq('…y su botón Reintentar', v.botones === 'Reintentar' && /Reintentar/.test(v.texto), true);
    eq('_formDirty SIGUE en true', v.dirty, true);
    eq('…así que «⚠️ Sin guardar» no se apagó', v.sinGuardarVisible, true);
    eq('el texto escrito no se tocó', v.texto_form, 'bipedestación asistida');
    eq('se dejó borrador local por si el equipo se apaga ahora', v.borrador, 1);
    await p.clock.runFor(3600);
    v = await ver(p);
    eq('el estado de error sigue ahí pasados los 3,2 s del toast', v.visible, true);
    eq('…y sigue siendo «error» (no se apaga solo)', v.estado, 'error');
    await reintentarAMano(p, 'C');
    await p.cerrar();
  }

  eq('sin errores JS', errs.filter(e => !/favicon/.test(e)).join(' | '), '');
  await b.close();
  console.log(fails.length ? `\n❌ ${fails.length} FALLOS` : '\n✅ fallo_guardado_visible OK');
  process.exit(fails.length ? 1 : 0);
})();
