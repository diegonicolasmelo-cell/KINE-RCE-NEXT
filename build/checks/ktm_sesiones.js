// ktm_sesiones.js — Cada sesión de KTM lleva lo suyo (17-sep-2026).
//
// EL PROBLEMA. La KTM del turno se guardaba como UN solo juego de datos: un
// nivel, una asistencia, unos minutos, un Borg… y aparte un contador de
// sesiones. Diego: «2 KTM, una nivel 2 y otra nivel 3, y pueden rendir de
// forma diferente». Con el modelo viejo la segunda sesión desaparecía: el
// contador decía «2» y el relato narraba una sola, con los datos de la última
// que se escribió encima de la anterior.
//
// EL DISEÑO (decidido con él):
//   · una columna con la LISTA de sesiones, cada una con su nivel, asistencia,
//     minutos y Borg;
//   · la CANTIDAD se deriva de la lista, así el REM (sesiones = KTR + KTM) y
//     los indicadores de atenciones siguen contando igual, sin tocarlos;
//   · manda el NIVEL MÁS ALTO para la entrega, la cama y la categorización
//     SOCHIMI: es el que marca la progresión («manda el nivel más alto»);
//   · el relato las narra INDIVIDUALIZADAS, para poder editarlas y describir
//     más: «Primera sesión: nivel 2 con asistencia mínima durante 20 minutos.
//     Segunda sesión: nivel 3 con supervisión durante 15 minutos.»
//
// 🔴 LO QUE NO PUEDE ROMPERSE: una evolución GUARDADA CON EL MODELO VIEJO
// —un nivel suelto y un contador— tiene que seguir leyéndose y narrándose
// igual. Son meses de turnos ya escritos.
//
// Diego avisó que el diseño «no me gusta mucho, lo modificaré cuando lo vea en
// vivo». Se construye así y se retoca con la pantalla delante.

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

/* ══ 1 · La columna nueva, al final y aditiva ═══════════════════════════ */
console.log('\n1 · El modelo');
const esq = fs.readFileSync(path.join(v2, 'esquema.gs'), 'utf8');
si('★ existe la lista de sesiones', /KTM_SESIONES_JSON/.test(esq));
si('   control · las columnas viejas siguen ahí (las filas ya escritas las usan)',
   /KTM_CANT/.test(esq) && /KTM_ASISTENCIA/.test(esq) && /KTM_TIEMPO_MIN/.test(esq));

/* ══ 2 · La derivación: cantidad y nivel que manda ══════════════════════ */
console.log('\n2 · ★ La cantidad se DERIVA, el nivel que manda es el más alto');
// 🪤 Las `const` NO cuelgan de globalThis con eval indirecto.
(0, eval)(['infra_util.gs', 'infra_fechas.gs', 'dominio_calculos.gs', 'dominio_texto.gs']
  .map(f => fs.readFileSync(path.join(v2, f), 'utf8')).join('\n;\n'));

si('existe ktmSesiones(), el ÚNICO lector de la lista', typeof ktmSesiones === 'function');
if (typeof ktmSesiones === 'function') {
  const dos = ktmSesiones({ KTM_SESIONES_JSON: JSON.stringify([
    { niv: '2', asis: 'Mínima', min: 20, borg: '3' },
    { niv: '3', asis: 'Supervisado', min: 15, borg: '4' }
  ]) });
  eq('★ dos sesiones se cuentan como dos', dos.cant, 2);
  eq('★★ …y manda el nivel MÁS ALTO (marca la progresión)', dos.nivel, '3');
  eq('   los minutos se suman', dos.minutos, 35);

  /* 🔴 La compatibilidad hacia atrás: meses de turnos ya escritos. */
  const viejo = ktmSesiones({ KTM_CANT: 2, KTM_NIVEL_KTR: '2', KTM_ASISTENCIA: 'Mínima',
                              KTM_TIEMPO_MIN: 20, KTM_BORG: '3' });
  eq('🔴 una evolución VIEJA sigue contando sus sesiones', viejo.cant, 2);
  eq('🔴 …y conserva su nivel', viejo.nivel, '2');
  eq('🔴 …y sus minutos', viejo.minutos, 20);
  const nada = ktmSesiones({});
  eq('sin KTM, cero sesiones', nada.cant, 0);
  eq('   …y sin nivel inventado', nada.nivel, '');
}

/* ══ 3 · El relato: individualizadas, y el viejo igual que siempre ══════ */
console.log('\n3 · ★★ El relato narra cada sesión');
const base = { KTM_REALIZADA: true, VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM' };
const T = String(generarTextoEvolucion(Object.assign({}, base, {
  KTM_SESIONES_JSON: JSON.stringify([
    { niv: '2', asis: 'Mínima', min: 20, borg: '3' },
    { niv: '3', asis: 'Supervisado', min: 15, borg: '' }
  ])
})) || '');
si('★★ narra la primera sesión con lo suyo',
   /[Pp]rimera sesión: nivel 2 con asistencia mínima durante 20 minutos/.test(T));
si('★★ …y la segunda con lo suyo',
   /[Ss]egunda sesión: nivel 3 con asistencia supervisado durante 15 minutos/.test(T));

const Tuna = String(generarTextoEvolucion(Object.assign({}, base, {
  KTM_SESIONES_JSON: JSON.stringify([{ niv: '2', asis: 'Mínima', min: 20, borg: '3' }])
})) || '');
si('★ con UNA sesión no se numera («Primera sesión» sobra)', /Se realiza KTM nivel 2/.test(Tuna));
no('   …y no aparece la palabra «sesión»', /sesión/i.test(Tuna));

const Tviejo = String(generarTextoEvolucion(Object.assign({}, base, {
  KTM_CANT: 2, KTM_NIVEL_KTR: '2', KTM_ASISTENCIA: 'Mínima', KTM_TIEMPO_MIN: 20
})) || '');
si('🔴 una evolución VIEJA se sigue narrando como antes',
   /Se realizan 2 sesiones de KTM nivel 2/.test(Tviejo));

/* ══ 4 · El Borg va al relato ═══════════════════════════════════════════ */
console.log('\n4 · El Borg deja de ser un dato que nadie lee');
si('★ el Borg se narra', /Borg 3/.test(T));

/* ══ 5 · La pantalla ════════════════════════════════════════════════════ */
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

  console.log('\n5 · ★ En pantalla se puede agregar una segunda sesión');
  const S = await p.evaluate(async () => {
    $('kf').reset(); $('cBed').value = '3';
    $('gDate').value = '2026-08-10';   // 🪤 fecha inventada
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM' }];
    renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 300));
    /* 🪤 TURNO CONGELADO. Desde el 19-sep («KTM A») la pantalla cambia según
       el turno: de noche la KTM se apaga y los chips del pool quedan en solo
       lectura. Sin fijar SHIFT esta guardia sale verde de día y roja de
       noche — que es la trampa del reloj, otra vez. */
    SHIFT = 'Dia';
    if (typeof aplicarGatesEval === 'function') aplicarGatesEval();
    if (typeof pasoIr === 'function') pasoIr(2);
    $('fVA').value = 'TOT'; cascadeVA();
    $('fSop').value = 'VM'; cascadeSop(); $('fModo').value = 'ACVC'; renderParams();
    if (typeof setKTMstate === 'function') setKTMstate('r');
    if (typeof setKTMniv === 'function') setKTMniv('2');
    if (typeof setKTMasis === 'function') setKTMasis('Mínima');
    $('fKTMt').value = '20'; if ($('fBorg')) $('fBorg').value = '3';
    const hayBoton = !!$('btnKtmSesion');
    if (hayBoton) $('btnKtmSesion').click();
    await new Promise(r => setTimeout(r, 80));
    // la segunda sesión se llena en los mismos campos y se agrega
    if (typeof setKTMniv === 'function') setKTMniv('3');
    if (typeof setKTMasis === 'function') setKTMasis('Supervisado');
    $('fKTMt').value = '15'; if ($('fBorg')) $('fBorg').value = '';
    if (hayBoton) $('btnKtmSesion').click();
    await new Promise(r => setTimeout(r, 80));
    const firma = $('fFirma');
    /* 🔴 20-sep-2026 · La hemodinamia es OBLIGATORIA para guardar (Diego: «HDN pedir antes de avanzar»), así que el banco la llena como la llenaría un colega. 🪤 A propósito NO se rellena sola al cargar la página: eso recrearía dentro del banco justo el bug que se quitó. */
    {const _he=document.getElementById('fHEst'); if(_he&&!_he.value){_he.value='Estable';} const _hd=document.getElementById('fDVA'); if(_hd&&!_hd.value){_hd.value='Sin requerimientos';}}
    /* 🪤 19-sep-2026 · El equipo se SIEMBRA, porque ya no viene en el código:
       los nombres se mudaron a la hoja KINESIOLOGOS y el selector de firma nace
       vacío hasta que el arranque lo llena. Antes bastaba con añadir una opción
       si no había ninguna; ahora siempre hay una (el aviso «falta cargar el
       equipo»), así que ese truco dejaba el selector sin la firma y el guardado
       no salía. Se usa la puerta de verdad: Turnos.setRoster(). */
    if (firma) { if (window.Turnos) Turnos.setRoster([{ f: 'DMV', n: 'Kinesiólogo de prueba', t: 'Klgo.' }]); firma.value = 'DMV'; }
    if (typeof hPVEtoggle === 'function') hPVEtoggle('nc');
    const txt = (typeof genTexto === 'function') ? String(genTexto() || '') : '';
    window._ll.length = 0;
    if (typeof guardar === 'function') { try { guardar(); } catch (e) {} }
    await new Promise(r => setTimeout(r, 400));
    const env = window._ll.find(x => x.a === 'GUARDAR_EVOLUCION');
    return { hayBoton: hayBoton, txt: txt, payload: env ? env.d : null,
             listaEnPantalla: ($('ktmListaSes') || {}).textContent || '' };
  });
  si('★ hay cómo agregar una sesión', S.hayBoton);
  si('★ las dos se ven listadas en la pantalla',
     /nivel 2/.test(S.listaEnPantalla) && /nivel 3/.test(S.listaEnPantalla));
  si('★★ la lista viaja en el guardado',
     !!S.payload && (JSON.parse(S.payload.KTM_SESIONES_JSON || '[]').length === 2));
  si('★★ …y la cantidad derivada también, para el REM',
     !!S.payload && String(S.payload.KTM_CANT) === '2');
  si('★★ …y el nivel que manda es el más alto, para la cama y SOCHIMI',
     !!S.payload && String(S.payload.KTM_NIVEL_KTR) === '3');
  si('★ la pantalla narra las dos sesiones', /[Ss]egunda sesión/.test(S.txt));

  /* ══ 6 · Los dos lados derivan IGUAL ═════════════════════════════════
     El servidor no vive en el navegador, así que la derivación está escrita en
     los dos: ktmSesiones (dominio_calculos.gs) y _ktmDeriva (index.html). Se
     les da el MISMO JSON y tienen que devolver lo mismo. 🪤 Antes el cliente
     llamaba a ktmSesiones «si existía» y, como nunca existe ahí, caía siempre
     en un fallback con nivel vacío: el nivel que manda no llegaba a la cama ni
     a la categorización SOCHIMI, sin que nada avisara. */
  console.log('\n6 · ★★ Cliente y servidor derivan lo mismo');
  const CASOS = [
    [{ niv: '2', min: 20 }, { niv: '3', min: 15 }],
    [{ niv: '1', min: 10 }],
    [{ niv: '3', min: 5 }, { niv: '1', min: 5 }, { niv: '2', min: 5 }],
    [{ asis: 'Total', min: 12 }]
  ];
  const D = await p.evaluate((casos) => casos.map(c => {
    const e = document.getElementById('fKtmSesiones');
    if (e) e.value = JSON.stringify(c);
    const r = _ktmDeriva();
    return { cant: r.cant, nivel: r.nivel, minutos: r.minutos };
  }), CASOS);
  CASOS.forEach((c, i) => {
    const serv = ktmSesiones({ KTM_SESIONES_JSON: JSON.stringify(c) });
    eq('★★ caso ' + (i + 1) + ': cliente y servidor dicen lo mismo',
       JSON.stringify(D[i]),
       JSON.stringify({ cant: serv.cant, nivel: serv.nivel, minutos: serv.minutos }));
  });

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ ktm_sesiones: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ ktm_sesiones: cada sesión lleva lo suyo.');
})();
