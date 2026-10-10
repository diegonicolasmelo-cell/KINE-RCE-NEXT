// ktm_nivel_no_se_cuela.js — El NIVEL de KTM que la CAMA recuerda no se cuela en el formulario de noche ni en el
// primer día tras una noche (acuerdos 8.6 y 8.7 de docs/ACUERDOS_REDISENO.md; tanda 4, cambio 1).
//
// EL DEFECTO (visto leyendo el código, medido con esta guardia). Abrir un turno nuevo corre dos llenados en fila:
//   · fillCama(c)         copia `cama.KTM_NIVEL` al campo oculto `fKTMniv`, sin mirar de qué turno viene;
//   · fillFormReplica(s)  repone SOLO lo heredable (`_tf`): de noche `_tf` es `{}` y, de día tras una noche sin fila de día,
//                         también. Escribía el nivel únicamente `if(_tf.KTM_NIVEL_KTR)`, o sea que cuando NO había nada que
//                         heredar tampoco borraba lo que fillCama había dejado.
// Y la cama SÍ recuerda un nivel de noche: el servidor conserva `cama.KTM_NIVEL` durante la noche, y si la noche hizo KTM,
// se queda con el nivel de la noche (svc_evoluciones.gs, `KTM_NIVEL:` de la fila de la cama). Resultado: un campo oculto con
// un nivel que nadie eligió, sin ningún botón de nivel encendido que lo delate:
//   · de NOCHE, elegir «Realizada» sin elegir nivel mandaba el nivel de la cama (`_ktmDeriva` lee `fKTMniv`), y sin tocar
//     nada mandaba `KTM_NIVEL_KTR` igual (el servidor lo limpia si la KTM no está realizada, pero la pantalla ya lo había
//     mezclado en el relato y en la categorización SOCHIMI);
//   · el primer turno de DÍA tras una noche arrancaba con el nivel de la noche.
// Contradice 8.6 («parte en blanco, sin el nivel del día») y 8.7 («no hereda tampoco hacia el día»), y entra al REM y a las
// atenciones como una KTM que nadie decidió.
//
// LA REGLA QUE QUEDA
//   · El nivel visible y el oculto salen de lo que de verdad se hereda (`_tf`). Si `_tf` no trae nivel, el formulario parte
//     SIN nivel, aunque la cama recuerde uno.
//   · 🔴 El flujo DÍA→DÍA no se toca: si la previa de día trae su nivel, se hereda (BUG 5 de regresion_ui.js).
//   · 🪤 El cambio es de la pantalla de registro, PERO TIENE UN EFECTO LATERAL EN EL DATO DE LA CAMA (lo mide la sección 6).
//     Este encabezado decía «el cambio no toca el dato de la cama» y era falso: como de noche el formulario ya no manda el
//     nivel de la cama, marcar «Realizada» SIN elegir nivel manda el nivel vacío, y el servidor deja entonces la KTM de
//     esa cama sin nivel: el tablero pierde el «KTM 3» de esa cama esa noche. Antes de este cambio se inventaba el nivel
//     del día en la fila y la cama lo conservaba. Una cama cuya noche NO tocó la KTM conserva su nivel, como siempre.
//     El servidor NO se cambió; si la cama debe conservar su nivel cuando la noche marca «Realizada» sin elegirlo es una
//     decisión de Diego (docs/PENDIENTES.md, sección 2e, la 9b), y la sección 6 es el lugar donde cambiaría el caso.
//   · 🔴 La TARJETA ENTERA parte en blanco en TODOS los caminos de apertura (sección 5), no solo el botón de nivel: la
//     asistencia encendida (y su bloque a la vista), la descripción del nivel y la lista de sesiones ya pintada eran del
//     paciente anterior y la pantalla las afirmaba sin que viajaran (hallazgos R12 y R16 de la revisión de la tanda 4).
//     El reinicio vive en `abrirPanel`, que corre en todos los caminos; `fillForm` y `fillFormReplica` repintan después lo
//     que sí corresponde.
//   · Dejar la KTM de DÍA en «Realizada» por defecto es otra decisión (ktmEstadoInicial) y NO se mide acá.
//   · 🪤 Los dos caminos SIN réplica (paciente sin turno previo, o el servidor sin contestar al abrir) solo corren fillCama, que
//     copia el nivel de la cama tal cual. El NIVEL OCULTO que copia ahí NO se mide: no se alcanza con datos reales, porque una
//     cama que recuerda un nivel siempre tiene un turno previo del que abrir la réplica (docs/PENDIENTES.md, 2e, la 12). Si
//     algún día se quiere cerrar también esa puerta, es una condición en fillCama (de noche no copiar) y esta guardia es el
//     lugar para agregar su caso. Lo que SÍ se mide en esos caminos (sección 5) es lo que se VE: botones, bloque de asistencia,
//     descripción y lista de sesiones, que no dependen de la cama.
//
// 🪤 La cama de prueba SÍ trae KTM_NIVEL: ktm_de_noche.js tenía una cama sin él y por eso no veía el defecto.
// 🪤 Reloj congelado: la fecha se INVENTA (12-ago-2026 a las 11:00, lejos de las ventanas trampa) y el turno se fuerza en SHIFT.
//
// Uso: node build/checks/ktm_nivel_no_se_cuela.js
const path = require('path');
const { chromium } = require('playwright-core');
const V2 = path.join(__dirname, '..', '..', 'v2');
const S = require('../sim/sim_srv.js');   // el servidor REAL en memoria: solo la sección 6 (el dato de la cama) lo necesita

const fails = [];
const eq = (l, g, w) => { const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!okk) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };

// La cama recuerda el nivel '3' (el de la última KTM realizada, noche incluida).
const NIVEL_CAMA = '3';
// Una fila de NOCHE con KTM realizada: lo que dejaría la KTM de la noche (la previa de un día sin fila de día).
const NOCHE_HECHA = { ID_CAMA: '3', TURNO_KEY: '2026-08-11-Noche', TURNO: 'Noche', PATIENT_ID: 'p3', PAC_NOMBRE: 'P', PLAN_FIRMA_KINE: 'K.P.',
  VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', PLAN_PLANES: 'PLAN-NOCHE', KTM_REALIZADA: true, KTM_NIVEL_KTR: '3' };
// Una fila de DÍA con KTM realizada: lo que la réplica de DÍA hereda.
const DIA_HECHO = Object.assign({}, NOCHE_HECHA, { TURNO_KEY: '2026-08-12-Dia', TURNO: 'Dia', PLAN_PLANES: 'PLAN-DIA', KTM_NIVEL_KTR: '3' });

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 1500 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    /* Reloj congelado: `Date` fijo en el 12-ago-2026 a las 11:00 (ni cumpleaños, ni Fiestas Patrias, ni cierre de año, ni la media
       hora previa a un cambio de turno). El turno que se prueba lo fuerza cada escenario en SHIFT. */
    const FIJA = new Date(2026, 7, 12, 11, 0, 0).getTime(), RD = Date;
    function FD(...a) { if (!new.target) return new RD(FIJA).toString(); return a.length ? new RD(...a) : new RD(FIJA); }
    FD.prototype = RD.prototype; FD.now = () => FIJA; FD.UTC = RD.UTC; FD.parse = RD.parse; window.Date = FD;
    window._ll = []; window.__previa = null; window.__actual = null; window.__falla = false;
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler(f) { return {
      api(a, d) { window._ll.push({ a, d }); let data = null; if (a === 'GET_CONFIG_UI') data = { NUM_CAMAS: 12, BANNERS: {} };
        else if (a === 'GET_EVO_TURNO') {
          // El servidor que no contesta al abrir (sección 5): la pantalla cae al camino de solo fillCama.
          if (window.__falla) { setTimeout(() => f({ message: 'sin red' }), 5); return; }
          data = { actual: window.__actual, previa: window.__previa, pronoAbierto: '' }; }
        setTimeout(() => ok({ ok: true, data }), 5); } }; } }; } } } };
  });
  await p.goto('file://' + path.join(V2, 'index.html'));
  await p.waitForTimeout(800);

  /* Abre el turno `cual` de la cama 3 —que recuerda el nivel NIVEL_CAMA— con la previa dada, y mide lo que quedó en el formulario.
     Los botones de nivel parten APAGADOS (una pantalla recién cargada), salvo `o.arrastre`: el escenario en que quedó
     encendido el del paciente anterior, que ni el reset del formulario ni abrirPanel apagan. */
  const turno = (cual, o) => p.evaluate(async ([cual, o, nivelCama]) => {
    window.__previa = o.previa || null; window.__actual = o.actual || null; window.__falla = !!o.falla;
    if (!o.arrastre) document.querySelectorAll('.ktm-niv-btn').forEach(b => b.classList.remove('on'));
    $('kf').reset(); $('gDate').value = '2026-08-12'; SHIFT = cual;
    window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', VIA_AEREA: 'TOT', SOPORTE: 'VM', FECHA_INGRESO: '2026-08-05', TS_INGRESO: '2026-08-05 23:00:00',
      FECHA_INICIO_VA: '2026-08-08', TS_INICIO_VA: '2026-08-08 10:00:00', FECHA_INICIO_SOPORTE: '2026-08-08', TS_INICIO_SOPORTE: '2026-08-08 10:00:00',
      KTM_NIVEL: nivelCama, KTM_SUSP: 'FALSE' }];
    window.recargarSilencioso = () => {}; renderGrid();
    const grilla = document.body.innerText;
    abrirPanel('3', !!o.ingreso, false);
    await new Promise(r => setTimeout(r, 800));
    const card = $('fcKtmCard'), dp = card.closest('[data-paso]'); pasoIr(Number(dp ? dp.dataset.paso : 2));
    await new Promise(r => setTimeout(r, 250));
    return { plan: v('fPlanes'), nivel: v('fKTMniv'), derivado: _ktmDeriva().nivel,
      botones: Array.from(document.querySelectorAll('.ktm-niv-btn.on')).map(x => x.dataset.niv).join(','),
      estado: Array.from(document.querySelectorAll('#fcKtmCard .ktm-state.on')).map(x => x.id).join(','),
      desc: ($('ktmNivDesc') || {}).textContent || '', grilla: /KTM\s*3/.test(grilla),
      // La tarjeta ENTERA (sección 5): asistencia, su bloque y la lista de sesiones, lo que se VE.
      asis: v('fKTMasis'), asisBotones: Array.from(document.querySelectorAll('.ktm-asis-btn.on')).map(x => x.dataset.asis).join(','),
      verAsis: (() => { const e = $('dKTMasis'); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; })(),
      sesiones: v('fKtmSesiones'), listaFilas: ($('ktmListaSes') || { children: [] }).children.length, lista: (($('ktmListaSes') || {}).innerText || '').trim() };
  }, [cual, o || {}, NIVEL_CAMA]);

  /* Guarda desde donde esté y devuelve lo que viajó (y el relato que la pantalla compone antes de guardar). */
  const guarda = armar => p.evaluate(async fn => {
    $('fFirma').appendChild(Object.assign(document.createElement('option'), { value: 'K.T.', textContent: 'K.T.' })); $('fFirma').value = 'K.T.';
    const he = $('fHEst'); if (he && !he.value) he.value = 'Estable'; const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos';
    hPVEtoggle('si'); _transAvisoOk = true;
    new Function('return (' + fn + ')')()();
    const relato = genTexto();
    window._ll.length = 0; guardar(); await new Promise(r => setTimeout(r, 400));
    const c = window._ll.find(x => x.a === 'GUARDAR_EVOLUCION');
    return c ? { r: c.d.KTM_REALIZADA, niv: c.d.KTM_NIVEL_KTR, cant: c.d.KTM_CANT, relato } : null; }, armar);

  console.log('\n1 · 🔴 DE NOCHE el nivel de la cama no entra al formulario');
  let T = await turno('Noche', { previa: DIA_HECHO });
  eq('(control: la réplica sí corrió, trajo el plan del día)', T.plan, 'PLAN-DIA');
  eq('★★ el campo oculto del nivel parte VACÍO', T.nivel, '');
  eq('★★ …y ningún botón de nivel encendido', T.botones, '');
  eq('★★ …y el nivel que la pantalla deriva, vacío', T.derivado, '');
  eq('(control: la KTM de noche parte sin estado elegido)', T.estado, '');
  eq('(control: la cama SÍ muestra su nivel en el tablero)', T.grilla, true);
  let g = await guarda('() => {}');
  eq('★★ sin tocar nada, no viaja el nivel de la cama', g && String(g.niv), '');
  T = await turno('Noche', { previa: DIA_HECHO });
  g = await guarda("() => setKTMstate('r')");
  eq('★★ elegir «Realizada» SIN nivel no manda el nivel de la cama', g && (g.r + '/' + g.niv), 'true/');
  eq('★★ …ni lo cuenta como sesión con ese nivel en el relato', /nivel 3/i.test(g && g.relato), false);
  T = await turno('Noche', { previa: DIA_HECHO });
  g = await guarda("() => { setKTMstate('r'); setKTMniv('2'); }");
  eq('(control: si SE ELIGE un nivel de noche, ese viaja)', g && (g.r + '/' + g.niv), 'true/2');

  console.log('\n2 · 🔴 EL PRIMER DÍA TRAS UNA NOCHE no arranca con el nivel de la noche');
  // Sin fila de día, el servidor no manda `_PREVIA_DIA` y la previa es la NOCHE (8.7: no hereda tampoco hacia el día).
  T = await turno('Dia', { previa: NOCHE_HECHA });
  eq('(control: la réplica sí corrió, trajo el plan de la noche)', T.plan, 'PLAN-NOCHE');
  eq('★★ el nivel parte VACÍO', T.nivel, '');
  eq('★★ …y ningún botón de nivel encendido', T.botones, '');
  g = await guarda('() => {}');
  eq('★★ y no viaja el nivel de la noche aunque la KTM de día parta «realizada»', g && String(g.niv), '');
  eq('(control: de día la KTM sigue partiendo «realizada»: ese default no se tocó)', g && String(g.r), 'true');
  // Con fila de día NO realizada de por medio (sin nivel que heredar) y una noche con KTM después: la cama recuerda el nivel de
  // la noche, pero lo heredable (la última fila de DÍA) no trae nivel.
  T = await turno('Dia', { previa: Object.assign({}, NOCHE_HECHA, { _PREVIA_DIA: Object.assign({}, DIA_HECHO,
    { KTM_REALIZADA: false, KTM_NO_REALIZADA: true, KTM_NO_RAZON: 'Rechazo del paciente', KTM_NIVEL_KTR: '' }) }) });
  eq('★★ la última fila de día sin nivel: tampoco el de la noche (la cama lo recuerda)', T.nivel, '');
  eq('★★ …ni botón encendido', T.botones, '');

  console.log('\n3 · 🔴 DÍA → DÍA sigue heredando el nivel (BUG 5 de regresion_ui.js)');
  T = await turno('Dia', { previa: DIA_HECHO });
  eq('(control: la réplica sí corrió, trajo el plan del día)', T.plan, 'PLAN-DIA');
  eq('★★ el nivel del día anterior SE HEREDA', T.nivel, '3');
  eq('★★ …con su botón encendido', T.botones, '3');
  eq('★★ …y la descripción del nivel a la vista', /Sedente/.test(T.desc), true);
  g = await guarda('() => {}');
  eq('★★ …y viaja', g && (g.r + '/' + g.niv), 'true/3');
  // La noche de por medio: la previa inmediata es la NOCHE con nivel 3, la fila de día traía el 2. Hereda el del DÍA.
  T = await turno('Dia', { previa: Object.assign({}, NOCHE_HECHA, { _PREVIA_DIA: Object.assign({}, DIA_HECHO, { KTM_NIVEL_KTR: '2' }) }) });
  eq('★★ con una noche de por medio hereda el nivel del DÍA (2), no el de la noche ni el de la cama (3)', T.nivel + '|' + T.botones, '2|2');

  console.log('\n4 · 🔴 El botón de nivel que quedó encendido del paciente anterior no se arrastra');
  // El reset del formulario vacía el campo oculto, pero no apaga los botones: el nivel elegido para un paciente seguía
  // iluminado al abrir el siguiente, con el campo vacío por debajo. La pantalla afirmaba un nivel que no iba a viajar.
  await turno('Dia', { previa: DIA_HECHO });
  await p.evaluate(() => setKTMniv('4'));
  T = await turno('Noche', { previa: DIA_HECHO, arrastre: true });
  eq('★★ de noche no queda encendido el 4 del paciente anterior', T.botones, '');
  eq('★★ …ni su descripción a la vista', T.desc, '');
  await turno('Dia', { previa: DIA_HECHO });
  await p.evaluate(() => setKTMniv('4'));
  T = await turno('Dia', { previa: Object.assign({}, NOCHE_HECHA, { _PREVIA_DIA: Object.assign({}, DIA_HECHO, { KTM_NIVEL_KTR: '' }) }), arrastre: true });
  eq('★★ de día sin nivel que heredar tampoco', T.botones + '|' + T.nivel, '|');
  await turno('Noche', { previa: DIA_HECHO });
  await p.evaluate(() => setKTMniv('4'));
  T = await turno('Dia', { previa: DIA_HECHO, arrastre: true });
  eq('(control: de día con nivel que heredar, el botón es el HEREDADO (3), no el 4 que quedó)', T.botones + '|' + T.nivel, '3|3');

  console.log('\n5 · 🔴 La TARJETA ENTERA parte en blanco en TODOS los caminos de apertura (R12 y R16 de la revisión de la tanda 4)');
  // 4.1 apagó los botones de NIVEL, pero la asistencia encendida, su bloque a la vista, la descripción del nivel y la lista de
  // sesiones ya pintada seguían siendo del paciente anterior. El valor oculto está vacío (el reset lo vacía), así que la pantalla
  // AFIRMABA una asistencia («Máxima» en rojo) y unas sesiones que no viajaban: la kinesióloga no las vuelve a tocar y el dato
  // se pierde sin aviso. Un camino con réplica apagaba el nivel (fillFormReplica) pero no la asistencia; los caminos sin réplica
  // (sin turno previo, el servidor que no contesta, un ingreso) no apagaban NADA: abrirPanel es lo único que corre en todos.
  /* Deja la tarjeta como la dejó el paciente ANTERIOR: dos sesiones pintadas en la lista y, en los campos sueltos, el nivel 4 y la
     asistencia «Moderada» encendidos con su bloque a la vista (justo el estado de quien va a agregar una tercera sesión). */
  const ensuciar = () => p.evaluate(() => {
    setKTMstate('r'); setKTMniv('2'); setKTMasis('Máxima'); $('fKTMt').value = '20'; $('fBorg').value = '3'; ktmAgregarSesion();
    setKTMniv('3'); setKTMasis('Total'); $('fKTMt').value = '15'; ktmAgregarSesion();
    setKTMniv('4'); setKTMasis('Moderada'); });
  /* Lo que la tarjeta tiene que mostrar al abrir OTRO paciente sin nada que heredar de la asistencia ni de las sesiones. */
  const enBlanco = (etq, T, o) => {
    eq('★★ ' + etq + ': ningún botón de asistencia queda encendido (el «Moderada» del paciente anterior)', T.asisBotones, '');
    eq('★★ …y el valor de la asistencia, vacío (lo que se ve es lo que viaja)', T.asis, '');
    eq('★★ …ni un botón de nivel encendido', T.botones, '');
    eq('★★ …ni la descripción del nivel anterior', T.desc, '');
    eq('★★ …ni sesiones del paciente anterior pintadas en la lista', T.listaFilas + '|' + T.lista, '0|');
    eq('★★ …y la lista de sesiones, vacía por debajo', T.sesiones, '');
    if (!o || o.bloqueCerrado !== false) eq('★★ …y el bloque de asistencia no queda a la vista (nadie eligió nivel)', T.verAsis, false);
  };
  await turno('Dia', { previa: DIA_HECHO });
  await ensuciar();
  let T5 = await turno('Dia', { previa: DIA_HECHO, arrastre: true });
  eq('(control: la réplica de DÍA sí corrió)', T5.plan, 'PLAN-DIA');
  eq('★★ réplica de DÍA: ningún botón de asistencia encendido', T5.asisBotones, '');
  eq('★★ …y el valor de la asistencia, vacío', T5.asis, '');
  eq('★★ …ni sesiones del paciente anterior pintadas', T5.listaFilas + '|' + T5.lista, '0|');
  eq('(control: el nivel HEREDADO (3) sí queda encendido, y con él su bloque de asistencia a la vista)', T5.botones + '|' + T5.verAsis, '3|true');
  await ensuciar();
  T5 = await turno('Noche', { previa: DIA_HECHO, arrastre: true });
  eq('(control: la réplica de NOCHE sí corrió)', T5.plan, 'PLAN-DIA');
  enBlanco('réplica de NOCHE', T5);
  await ensuciar();
  T5 = await turno('Dia', { previa: null, arrastre: true });
  enBlanco('SIN turno previo (solo fillCama)', T5);
  await ensuciar();
  T5 = await turno('Noche', { previa: null, arrastre: true });
  enBlanco('SIN turno previo, de noche', T5);
  await ensuciar();
  T5 = await turno('Dia', { falla: true, arrastre: true });
  enBlanco('el servidor sin contestar al abrir', T5);
  await ensuciar();
  T5 = await turno('Dia', { ingreso: true, arrastre: true });
  enBlanco('un INGRESO', T5);
  // Reabrir un turno ya guardado (fillForm) ya lo hacía bien: control para que nadie «arregle» abrirPanel y rompa el que andaba.
  await ensuciar();
  T5 = await turno('Dia', { actual: Object.assign({}, DIA_HECHO, { KTM_ASISTENCIA: '', KTM_NIVEL_KTR: '' }), arrastre: true });
  eq('(control: reabrir un turno guardado sin asistencia ni sesiones: sin botón de asistencia)', T5.asisBotones + '|' + T5.asis, '|');
  eq('(control: …y sin sesiones del paciente anterior)', T5.listaFilas + '|' + T5.sesiones, '0|');
  // Y lo que SÍ trae el turno que se reabre sigue pintándose: abrirPanel limpia ANTES de que llegue la fila, no después.
  await ensuciar();
  T5 = await turno('Dia', { actual: Object.assign({}, DIA_HECHO, { KTM_ASISTENCIA: 'Mínima', KTM_NIVEL_KTR: '3',
    KTM_SESIONES_JSON: JSON.stringify([{ niv: '2', asis: 'Mínima', min: 10, borg: '' }, { niv: '3', asis: 'Total', min: 12, borg: '' }]) }), arrastre: true });
  eq('(control: el turno reabierto con dos sesiones las pinta, las suyas y no las del paciente anterior)', T5.listaFilas + '|' + /nivel 2/.test(T5.lista) + '|' + /Máxima/.test(T5.lista), '2|true|false');
  eq('(control: …y su asistencia suelta queda encendida con su bloque a la vista)', T5.asisBotones + '|' + T5.verAsis, 'Mínima|true');

  console.log('\n6 · 🪤 EFECTO LATERAL DOCUMENTADO (R18): de noche «Realizada» sin nivel deja la KTM de la cama sin nivel');
  // El servidor REAL en memoria. Esto NO es un defecto que se arregle acá: es lo que pasa hoy, y qué debe pasar es una decisión de
  // Diego (docs/PENDIENTES.md, 2e, la 9b). Está medido para que ningún encabezado vuelva a decir que el dato de la cama no cambia, y
  // para que, si Diego decide que la cama conserve su nivel, el cambio del servidor (svc_evoluciones.gs, el `KTM_NIVEL:` de la fila
  // de la cama) obligue a venir a cambiar este caso a propósito. La sección 1 mide que la pantalla manda ese nivel VACÍO.
  { const { api, SIM } = S;
    SIM.fecha = '2026-08-12'; SIM.hora = '11:00:00';
    [3, 4, 5].forEach(id => { const r = api('INGRESAR_PACIENTE', { idCama: String(id), nombre: 'Paciente Ficticio ' + id, edad: 61, sexo: 'M', diagnostico: 'NAC grave',
      fechaIngreso: '2026-08-07', viaAerea: 'TOT', soporte: 'VM', modo: 'ACVC', firmaKine: 'DMV' }, null);
      if (!r.ok) throw new Error('no se pudo ingresar la cama ' + id + ': ' + r.error); });
    const base = { VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', VENT_MODO: 'ACVC', VENT_VT: 450, VENT_FR: 16, VENT_PEEP: 8, VENT_FIO2: 40,
      HEMO_ESTADO: 'Estable', HEMO_DVA: 'Sin requerimientos', PLAN_FIRMA_KINE: 'DMV' };
    const nivelCama = id => String((api('GET_TODAS_CAMAS', {}, null).data.find(c => String(c.ID_CAMA) === String(id)) || {}).KTM_NIVEL);
    const guardaServ = (id, turno, extra) => api('GUARDAR_EVOLUCION', Object.assign({}, base, { idCama: String(id), turnoKey: '2026-08-12-' + turno }, extra), null);
    [3, 4, 5].forEach(id => eq('(control: el día de la cama ' + id + ' se guardó con KTM nivel 3)', guardaServ(id, 'Dia', { KTM_REALIZADA: true, KTM_NIVEL_KTR: '3', KTM_CANT: '1' }).ok, true));
    eq('(control: las tres camas recuerdan el nivel 3 tras el día)', [3, 4, 5].map(nivelCama).join(','), '3,3,3');
    SIM.hora = '21:00:00';
    eq('(control: el servidor acepta la noche de la cama 3: «Realizada» sin nivel)', guardaServ(3, 'Noche', { KTM_REALIZADA: true, KTM_NIVEL_KTR: '', KTM_CANT: '1', KTM_NO_REALIZADA: '' }).ok, true);
    eq('★★ …y la cama 3 queda SIN nivel (el tablero pierde el «KTM 3»: el efecto lateral)', nivelCama(3), '');
    eq('(control: la noche de la cama 4 no tocó la KTM)', guardaServ(4, 'Noche', { KTM_NO_REALIZADA: '' }).ok, true);
    eq('★★ …y la cama 4 CONSERVA su nivel 3 (el servidor no lo borra si la noche no declaró KTM)', nivelCama(4), '3');
    eq('(control: la noche de la cama 5 eligió el nivel 2)', guardaServ(5, 'Noche', { KTM_REALIZADA: true, KTM_NIVEL_KTR: '2', KTM_CANT: '1', KTM_NO_REALIZADA: '' }).ok, true);
    eq('(control: …y la cama 5 pasa a recordar el 2)', nivelCama(5), '2');
  }

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ ktm_nivel_no_se_cuela: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
