// relato_espejo.js — El relato que VE el colega y el que QUEDA ESCRITO son el
// mismo texto (17-sep-2026).
//
// POR QUÉ EXISTE. El relato se arma en DOS lados: el navegador lo muestra en
// vivo mientras se llena el formulario, y el servidor lo REGENERA para la
// entrega de turno y la hoja impresa. Son dos motores distintos sobre los
// mismos datos, y se fueron separando sin que nadie lo notara, porque nadie
// mira las dos salidas a la vez. La revisión campo por campo con Diego
// (17-sep-2026) encontró cuatro divergencias vivas:
//
//   · «(día ?)» en toda evolución con vía aérea artificial — el navegador
//     calcula los días y los muestra, pero NUNCA los manda en el guardado;
//   · el IMT: en pantalla «Se realiza IMT.», en el servidor la frase entera
//     con series, porcentaje de PiMáx, minutos y descanso;
//   · la EMS: en pantalla sin parámetros, en el servidor con Hz, mA, ancho de
//     pulso y minutos;
//   · «(20 min)» contra «durante 20 minutos».
//
// El colega llena ocho parámetros, los ve desaparecer en pantalla y reaparecen
// después en un papel que él no escribió. Diego decidió unificar HACIA EL DEL
// SERVIDOR: si se tomó el trabajo de anotar la intensidad, que la vea.
//
// 🪤 Nada de comparar los dos textos «a ojo» en una sesión: esta guardia arma
// UN solo juego de datos, se lo da a los dos motores y exige que digan lo
// mismo. Es la única forma de que la próxima divergencia salga el día que se
// escribe y no seis meses después.
//
// 🪤 El reloj va congelado: las fechas se INVENTAN y viajan por parámetro.

const fs = require('fs');
const path = require('path');
const v2 = path.join(__dirname, '..', '..', 'v2');
const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!okk) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); }
};
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window._ll = [];
    window.google = { script: { run: { withSuccessHandler(okF) { return { withFailureHandler() { return {
      api(a, d) { window._ll.push({ a, d }); setTimeout(() => okF({ ok: true, data: (a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null) }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.resolve(v2, 'index.html'));
  await p.waitForTimeout(600);

  /* ══ El escenario: UN solo juego de datos para los dos motores ═════════ */
  const C = await p.evaluate(async () => {
    $('kf').reset(); $('cBed').value = '3';
    // 🪤 Fecha INVENTADA: el «día N» de la vía aérea no puede depender de
    // cuándo se corra la batería. Intubado el 04-08, turno del 10-08 ⇒ día 6.
    $('gDate').value = '2026-08-10';
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'PACIENTE PRUEBA',
            VIA_AEREA: 'TOT', SOPORTE: 'VM', FECHA_INICIO_VA: '2026-08-04',
            FECHA_INICIO_SOPORTE: '2026-08-04', DIA_ESTADIA: 6 }];
    // 🪤 Los contadores de días (_diasTOTBase) los siembra abrirPanel desde la
    // cama: montando el formulario a mano quedaban en 0 y el «día N» salía
    // vacío por culpa del escenario, no del código.
    renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 300));
    if (typeof pasoIr === 'function') pasoIr(2);
    $('gDate').value = '2026-08-10';

    $('fVA').value = 'TOT'; cascadeVA();
    $('fSop').value = 'VM'; cascadeSop();
    $('fModo').value = 'ACVC'; renderParams();
    if ($('fTOTn')) $('fTOTn').value = '7.5';
    if ($('fTOTcm')) $('fTOTcm').value = '22';
    $('r_vt').value = '450'; $('r_fr').value = '18'; $('r_peep').value = '8';
    $('r_fio2').value = '40'; $('r_spo2').value = '96';
    $('fDias').value = '6';
    if (typeof actualizarContadores === 'function') actualizarContadores();

    // Rehabilitación: KTM realizada, con nivel, asistencia, minutos y Borg.
    if (typeof setKTMstate === 'function') setKTMstate('r');
    if (typeof setKTMniv === 'function') setKTMniv(2); else $('fKTMniv').value = '2';
    if (typeof setKTMasis === 'function') setKTMasis('Mínima'); else $('fKTMasis').value = 'Mínima';
    $('fKTMt').value = '20';
    if ($('fBorg')) $('fBorg').value = '3';
    // IMT con sus cuatro parámetros…
    if ($('cIMT')) { $('cIMT').checked = true; $('cIMT').dispatchEvent(new Event('change')); }
    [['fIMTfreq', '3'], ['fIMTint', '40'], ['fIMTt', '10'], ['fIMTdes', '60']]
      .forEach(([id, val]) => { const e = $(id); if (e) { e.value = val; e.dispatchEvent(new Event('change')); } });
    // …y EMS con los suyos.
    if ($('cEMS')) { $('cEMS').checked = true; $('cEMS').dispatchEvent(new Event('change')); }
    [['fEMSgrupo', 'Cuádriceps'], ['fEMSfreq', '50'], ['fEMSint', '25'],
     ['fEMSpulso', '300'], ['fEMSt', '30']]
      .forEach(([id, val]) => { const e = $(id); if (e) { e.value = val; e.dispatchEvent(new Event('change')); } });

    // Lo mínimo que el guardado exige, para poder capturar el payload real.
    const firma = $('fFirma');
    if (firma) { if (!firma.options.length) firma.add(new Option('DMV', 'DMV')); firma.value = 'DMV'; }
    if (typeof hPVEtoggle === 'function') hPVEtoggle('nc');
    const texto = (typeof genTexto === 'function') ? String(genTexto() || '') : '';

    // 🪤 El payload NO se arma en una función aparte: se construye dentro de
    // guardar(). Se captura el que REALMENTE viaja, por el puente, en vez de
    // rearmar una copia que podría divergir del de verdad.
    window._ll.length = 0;
    if (typeof guardar === 'function') { try { guardar(); } catch (e) {} }
    await new Promise(r => setTimeout(r, 400));
    const env = window._ll.find(x => x.a === 'GUARDAR_EVOLUCION');
    return { texto: texto, payload: env ? env.d : null, diasVA: v('fDiasVA'),
             ids: { ktmT: !!$('fKTMt'), imt: !!$('fIMTfreq'), ems: !!$('fEMSfreq') } };
  });

  console.log('\n0 · El escenario se montó de verdad');
  si('los campos del escenario existen', C.ids.ktmT && C.ids.imt && C.ids.ems);
  eq('★ la pantalla calculó el día 6 de vía aérea (fecha inventada, no el reloj)', C.diasVA, '6');
  si('el texto del navegador se armó', C.texto.length > 0);
  si('★ el guardado se pudo armar', !!C.payload);

  /* ══ 1 · El «día N» llega al servidor ════════════════════════════════ */
  console.log('\n1 · 🔴 «(día ?)» — el número se calcula y no se guarda');
  si('★ el navegador narra el día de la vía aérea', /\(día 6\)/.test(C.texto));
  eq('★★ …y DIAS_VA VIAJA en el guardado (acá se rompía)',
     C.payload ? String(C.payload.DIAS_VA) : '(sin payload)', '6');

  /* ══ 2 · Los dos motores, el mismo juego de datos ════════════════════ */
  console.log('\n2 · ★★ El servidor regenera el MISMO texto');
  // 🪤 Las `const` NO cuelgan de globalThis con eval indirecto: los dominios
  // están escritos con `var`/`function` justamente por esto.
  (0, eval)(['infra_util.gs', 'infra_fechas.gs', 'dominio_calculos.gs', 'dominio_texto.gs']
    .map(f => fs.readFileSync(path.join(v2, f), 'utf8')).join('\n;\n'));
  const S = String(generarTextoEvolucion(C.payload || {}) || '');
  si('el servidor produjo texto', S.length > 0);
  si('★★ el servidor también dice «(día 6)», no «(día ?)»', /\(día 6\)/.test(S));
  no('   …y ya no queda ningún «día ?» en el relato del servidor', /\(día \?\)/.test(S));

  console.log('\n3 · ★ IMT y EMS: lo que se anota, se lee');
  si('★ el navegador narra los parámetros del IMT', /3 series al 40% de PiM[áa]x/.test(C.texto));
  si('★ …y los de la EMS', /50 Hz/.test(C.texto) && /25 mA/.test(C.texto) && /300 µs/.test(C.texto));
  si('★★ el servidor dice lo mismo del IMT', /3 series al 40% de PiM[áa]x/.test(S));
  si('★★ …y lo mismo de la EMS', /50 Hz/.test(S) && /25 mA/.test(S) && /300 µs/.test(S));

  console.log('\n4 · Las redacciones que diferían');
  si('★ los minutos se narran «durante 20 minutos» en pantalla', /durante 20 minutos/.test(C.texto));
  si('★★ …y también en el servidor', /durante 20 minutos/.test(S));
  no('   ya no queda la forma vieja «(20 min)»', /\(20 min\)/.test(C.texto) || /\(20 min\)/.test(S));
  no('★ no se repite «asistencia» en pantalla', /asistencia [Aa]sistencia/.test(C.texto));
  no('★★ …ni en el servidor', /asistencia [Aa]sistencia/.test(S));

  /* ══ 5 · Subíndices: una sola forma en todo el relato ════════════════ */
  console.log('\n5 · 🪤 Los subíndices: la misma evolución los usaba de las dos formas');
  const subs = t => (t.match(/[₀-₉]/g) || []).length;
  eq('★ el navegador no usa subíndices Unicode', subs(C.texto), 0);
  eq('★★ el servidor tampoco', subs(S), 0);
  // El fuente completo: no basta con que este caso salga limpio.
  const fuentes = ['dominio_texto.gs', 'dominio_calculos.gs', 'svc_entrega.gs']
    .map(f => fs.readFileSync(path.join(v2, f), 'utf8')).join('\n');
  const idx = fs.readFileSync(path.join(v2, 'index.html'), 'utf8');
  // Se miran solo las FRASES del relato (FiO₂/SpO₂/cmH₂O/O₂), no las etiquetas
  // de la pantalla: en un <label> el subíndice se ve bien y es correcto. Lo
  // que no puede pasar es que el TEXTO CLÍNICO diga las dos cosas.
  const malas = (fuentes.match(/(FiO₂|SpO₂|cmH₂O|PaO₂|PiM[áa]x₂)/g) || []);
  eq('★★ el motor de texto del servidor no mezcla las dos formas', malas.join(','), '');
  si('   control · el motor sí usa la forma llana', /cmH2O/.test(fuentes) && /FiO2/.test(fuentes));

  /* ══ 6 · UPOT: sin afirmaciones fuertes automáticas ══════════════════ */
  console.log('\n6 · UPOT dice lo que es, y nada más');
  // 🪤 Esto NO se mide grepeando el fuente: los comentarios que explican el
  // arreglo contienen la frase, y la guardia se ponía roja por su propia
  // documentación. Se mide lo que los dos motores ESCRIBEN.
  const U = await p.evaluate(() => {
    const c = $('cUPOT'); if (c) { c.checked = true; c.dispatchEvent(new Event('change')); }
    return (typeof genTexto === 'function') ? String(genTexto() || '') : '';
  });
  const US = String(generarTextoEvolucion(Object.assign({}, C.payload || {}, { UPOT_ACTIVO: true })) || '');
  si('el escenario activó UPOT en los dos lados',
     /seguimiento por UPOT/.test(U) && /seguimiento por UPOT/.test(US));
  no('★ la pantalla no afirma sola la sospecha de muerte cerebral', /sospecha de muerte cerebral/i.test(U));
  no('★★ …ni el servidor', /sospecha de muerte cerebral/i.test(US));

  /* ══ 7 · Ningún emoji posterior a 2019 en lo que se imprime ══════════ */
  console.log('\n7 · 🪤 Emojis: el Chrome del hospital corre en Windows 10');
  // 🩻 es de 2021 y en el hospital salió como un cuadrado (Diego, 6-sep). La
  // regla es para ELEGIR un ícono nuevo, no para barrer los comentarios que
  // recuerdan por qué no se usa: se miran solo las CADENAS que se imprimen.
  const enCadena = (txt) => /(['"`])[^'"`\n]*🩻/.test(txt);
  no('★ el 🩻 (2021) ya no se imprime en la entrega', enCadena(fuentes));
  no('★ …ni en la pantalla', enCadena(idx));
  si('   control · el comentario que explica por qué no se usa sigue ahí', /🩻/.test(idx));

  /* ══ 8 · Los procedimientos del turno, en los dos lados ══════════════
     🔴 El RCP se narraba SOLO en el servidor. Un paro cardiorrespiratorio no
     salía en la evolución que el colega lee y guarda, y aparecía después en la
     entrega de turno. Es el hecho más grave que puede ocurrir en el turno.
     Y los tres traslados (imagenología, pabellón, asistencia médica) no se
     narraban en NINGUNO de los dos: solo llegaban a la entrega. Un traslado a
     pabellón es justo lo que explica por qué no hubo kinesiterapia. */
  console.log('\n8 · ★★ El paro y los traslados se cuentan en los dos lados');
  const P = await p.evaluate(async () => {
    const marcar = (id) => { const e = $(id); if (e) { e.checked = true; e.dispatchEvent(new Event('change')); } };
    marcar('cProcRCP');
    const set = (id, val) => { const e = $(id); if (e) { e.value = val; e.dispatchEvent(new Event('change')); } };
    set('fRCPciclos', '3'); set('fRCPhora', '14:20');
    marcar('cProcImagen'); marcar('cProcPabellon'); marcar('cProcAsistMed');
    const txt = (typeof genTexto === 'function') ? String(genTexto() || '') : '';
    window._ll.length = 0;
    if (typeof guardar === 'function') { try { guardar(); } catch (e) {} }
    await new Promise(r => setTimeout(r, 400));
    const env = window._ll.find(x => x.a === 'GUARDAR_EVOLUCION');
    return { txt: txt, payload: env ? env.d : null };
  });
  si('el escenario marcó el RCP y los tres traslados',
     !!P.payload && P.payload.PROC_RCP === true && P.payload.PROC_PABELLON === true);
  const PS = String(generarTextoEvolucion(P.payload || {}) || '');
  si('★★ la PANTALLA narra el paro (acá se rompía)', /reanimación cardiopulmonar/i.test(P.txt));
  si('★ …con la hora y los ciclos', /14:20/.test(P.txt) && /3 ciclos/.test(P.txt));
  si('★★ …y el servidor dice lo mismo', /reanimación cardiopulmonar/i.test(PS) && /14:20/.test(PS));
  si('★★ la pantalla narra el traslado a pabellón', /pabell[óo]n/i.test(P.txt));
  si('★★ …y el servidor también', /pabell[óo]n/i.test(PS));
  si('★ la pantalla narra el traslado a imagenología', /imagenolog/i.test(P.txt));
  si('★★ …y el servidor también', /imagenolog/i.test(PS));
  si('★ la pantalla narra la asistencia médica', /asistencia m[ée]dica/i.test(P.txt));
  si('★★ …y el servidor también', /asistencia m[ée]dica/i.test(PS));

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');

  await b.close();
  if (fails.length) {
    console.log('\n❌ relato_espejo: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ relato_espejo: los dos motores cuentan lo mismo.');
})();
