// vigilia_sin_sedacion.js — El estado de vigilia, SOLO donde el SAS no se pide
// (17-sep-2026, opción B de Diego).
//
// DE DÓNDE SALE. Diego, revisando el panel de Sedación y conciencia: «lo que le
// agregaría serían cosas como que el paciente esté conectado, o sea, que esté
// en sopor superficial, sopor profundo, somnoliento, vigil y cooperador, como
// añadidura a la selección del nivel de conciencia».
//
// 🪤 LA PRIMERA VERSIÓN ERA REDUNDANTE y él mismo la desarmó: «esta vigilia
// casi te discuto, se pisa casi entero con un SAS». Con sedación puesta, el SAS
// ya dice exactamente eso —y desde esta semana lo dice EN PALABRAS—, así que un
// segundo campo sería preguntar dos veces lo mismo. Su conclusión: «que solo
// aparezca en pacientes sin sedación el campo propio, acotado; selección única,
// no múltiple; donde ya no se usa el SAS».
//
// 🔴 Y AHÍ SÍ HAY UN HUECO REAL. Cuando el escalón es «Sin sedación» el
// formulario ESCONDE el SAS —es una escala de sedación-agitación— y el paciente
// se queda sin ningún registro de cuán despierto está. Lo único que queda es el
// Glasgow, que mide otra cosa: en un paciente traqueostomizado, somnoliento y
// que obedece órdenes, el Glasgow es alto y nadie anotó que estaba somnoliento.
//
// LO QUE ESTA GUARDIA FIJA:
//   1. El campo existe, es de selección ÚNICA y trae las palabras de Diego.
//   2. Aparece SOLO sin sedación, y con sedación lo reemplaza el SAS. Nunca
//      los dos a la vez: ese era el pisón que él detectó.
//   3. Al volver a sedar se BORRA, para que no quede un «vigil y cooperador»
//      colgado en la evolución de un paciente en escalón 6.
//   4. Viaja a la planilla y la narran los DOS motores de texto igual.

const fs = require('fs');
const path = require('path');
const v2 = path.join(__dirname, '..', '..', 'v2');
const idx = fs.readFileSync(path.join(v2, 'index.html'), 'utf8');
const esq = fs.readFileSync(path.join(v2, 'esquema.gs'), 'utf8');
const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!okk) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); }
};
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

// Las palabras son de Diego, en su orden: del más despierto al menos.
const VIGILIA = ['Vigil y cooperador', 'Somnoliento', 'Sopor superficial',
                 'Sopor profundo', 'Sin respuesta'];

/* ══ 1 · La columna, al final del esquema ═══════════════════════════════ */
console.log('\n1 · Dónde se guarda');
si('★ existe la columna SED_VIGILIA', /\['SED_VIGILIA'/.test(esq));
{
  // 🔴 Columna nueva = AL FINAL. Meterla al medio corre todas las de la
  // derecha y desalinea las filas ya escritas: así nació el 119≠132 del
  // sistema viejo.
  const bloque = esq.slice(esq.indexOf('const _COLS_EVOLUCIONES'), esq.indexOf('const ESQUEMA'));
  const cols = [...bloque.matchAll(/\['([A-Z0-9_]+)','[a-z]+'(?:,'[^']*')?\]/g)].map(m => m[1]);
  /* 🗂️ 20-sep-2026 · Ya no es la última: detrás entró PAC_NOMBRE_SOCIAL, y esa
     es justamente la regla funcionando —las columnas nuevas van AL FINAL—. Lo
     que hay que exigir no es que SED_VIGILIA sea la última para siempre, sino
     que se haya agregado al final y no INSERTADO en medio, que es lo que
     desalinea los datos ya guardados. Se mide contra una columna vieja. */
  /* 🪤 La columna vieja de referencia tiene que ser DE ESTA HOJA: la primera
     que elegí (FIRMA_KINE) vive en CAMAS_ESTADO y daba -1, así que la
     comparación se cumplía sola y la guardia no probaba nada. */
  const _iVig = cols.indexOf('SED_VIGILIA'), _iVieja = cols.indexOf('PAC_CHARLSON');
  eq('★ SED_VIGILIA se agregó al final, no en medio de las viejas',
     _iVig > _iVieja && _iVieja >= 0, true);
  eq('★ …y sigue en la zona final de EVOLUCIONES',
     _iVig >= cols.length - 5, true);
  si('   con su rótulo legible en castellano',
     /\['SED_VIGILIA','[a-z]+','[^']{4,42}'\]/.test(esq));
}

/* ══ 2 · Selección única, y las cinco palabras ══════════════════════════ */
console.log('\n2 · El campo, tal como lo pidió');
si('★ es un selector, NO casillas (selección única, no múltiple)',
   /<select id="fVigilia"/.test(idx));
VIGILIA.forEach(o => si('   está «' + o + '»',
  new RegExp('<option[^>]*>' + o + '</option>').test(idx)));

/* ══ 3 · El relato lo narra, en los dos motores ═════════════════════════ */
console.log('\n3 · ★ El relato, servidor');
// 🪤 Las `const` no cuelgan de globalThis con eval indirecto: se cargan los
// dominios completos, como hacen las demás guardias de texto.
(0, eval)(['infra_util.gs', 'infra_fechas.gs', 'dominio_calculos.gs', 'dominio_texto.gs']
  .map(f => fs.readFileSync(path.join(v2, f), 'utf8')).join('\n;\n'));
const rel = (extra) => String(generarTextoEvolucion(Object.assign({
  VENT_VIA_AEREA: 'TQT', VENT_SOPORTE: 'VM', SED_TIPO: 'Sin sedación'
}, extra || {})) || '');

/* 🗂️ 18-sep-2026 · «Sin sedación», no «Sin sedoanalgesia» (Diego). El
   selector de arriba se llama así y la evolución decía otra cosa: quien la lee
   tiene que traducir. */
si('★ sin sedación y somnoliento: lo dice',
   /Sin sedación, somnoliento\./.test(rel({ SED_VIGILIA: 'Somnoliento' })));
si('   vigil y cooperador también',
   /Sin sedación, vigil y cooperador\./.test(rel({ SED_VIGILIA: 'Vigil y cooperador' })));
si('   y sin el dato, la frase de siempre',
   /Sin sedación\./.test(rel({})));
// 🔴 Con sedación puesta manda el SAS y el campo no se narra: si una fila vieja
// lo trajera escrito, narrarlo sería contradecir al SAS en la misma frase.
no('★ con sedación puesta NO se narra la vigilia, manda el SAS',
   /somnoliento\b/i.test(rel({ SED_TIPO: 'Escalón 6', SED_SAS: '4',
                               SED_VIGILIA: 'Somnoliento' })));

/* ══ 4 · La pantalla: aparece solo donde toca, y se borra al sedar ══════ */
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

  console.log('\n4 · ★★ En pantalla');
  const R = await p.evaluate(async () => {
    const vis = id => { const e = document.getElementById(id); return !!e && !e.classList.contains('hidden'); };
    $('kf').reset(); $('cBed').value = '3';
    $('gDate').value = '2026-08-10';   // 🪤 fecha inventada, no la de hoy
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TQT', SOPORTE: 'VM' }];
    renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 300));
    if (typeof pasoIr === 'function') pasoIr(2);
    $('fVA').value = 'TQT'; cascadeVA();
    $('fSop').value = 'VM'; cascadeSop();

    // (a) arranca sin sedación: se pide la vigilia, no el SAS
    $('fSed').value = 'Sin sedación'; hSed();
    const sinSed = { vigilia: vis('gVigilia'), sas: vis('gSAS'), meta: vis('gSASmeta'),
                     bnm: vis('gBNM') };
    $('fVigilia').value = 'Somnoliento';
    const txtSin = String(genTexto() || '');

    // (b) se seda: desaparece la vigilia, aparece el SAS, y el dato se borra
    $('fSed').value = 'Escalón 6'; hSed();
    const conSed = { vigilia: vis('gVigilia'), sas: vis('gSAS'), meta: vis('gSASmeta'),
                     bnm: vis('gBNM'), valor: $('fVigilia').value };

    // (b2) el BNM marcado con sedación tiene que APAGARSE al sacarla: no se
    //      puede bloquear a un paciente que no está sedado.
    $('cBNM').checked = true;
    $('fSed').value = 'Sin sedación'; hSed();
    const bnmTrasSacar = { visible: vis('gBNM'), marcado: $('cBNM').checked };

    // (c) vuelve a quedar sin sedación y se guarda de verdad: el payload no
    // se arma en una función aparte, se arma dentro de guardar().
    $('fSed').value = 'Sin sedación'; hSed();
    $('fVigilia').value = 'Sopor superficial';
    /* 🪤 19-sep-2026 · El equipo se SIEMBRA, porque ya no viene en el código:
       los nombres se mudaron a la hoja KINESIOLOGOS y el selector de firma nace
       vacío hasta que el arranque lo llena. Antes bastaba con añadir una opción
       si no había ninguna; ahora siempre hay una (el aviso «falta cargar el
       equipo»), así que ese truco dejaba el selector sin la firma y el guardado
       no salía. Se usa la puerta de verdad: Turnos.setRoster(). */
    if (window.Turnos) Turnos.setRoster([{ f: 'KIN', n: 'Kinesiólogo de prueba', t: 'Klgo.' }]);
    const f = document.getElementById('fFirma'); if (f) f.value = 'KIN';
    /* 🔴 20-sep-2026 · La hemodinamia es OBLIGATORIA para guardar (Diego: «HDN pedir antes de avanzar»), así que el banco la llena como la llenaría un colega. 🪤 A propósito NO se rellena sola al cargar la página: eso recrearía dentro del banco justo el bug que se quitó —el dato puesto por el programa— y las guardias dejarían de ver el caso «nadie la miró». */
    {const _he=document.getElementById('fHEst'); if(_he&&!_he.value){_he.value='Estable';} const _hd=document.getElementById('fDVA'); if(_hd&&!_hd.value){_hd.value='Sin requerimientos';}}
    window._ll = []; const _t = window.toast; window.toast = () => {};
    try { guardar(); } catch (e) { /* lo dice el assert de abajo */ }
    window.toast = _t;
    await new Promise(r => setTimeout(r, 150));
    const pay = (window._ll.find(x => x.a === 'GUARDAR_EVOLUCION') || {}).d || null;
    return { sinSed, conSed, bnmTrasSacar, txtSin,
             enviado: pay ? pay.SED_VIGILIA : '(no salió el guardado)' };
  });

  si('★★ sin sedación se pide el estado de vigilia', R.sinSed.vigilia);
  no('   …y NO el SAS (es escala de sedación; ahí no se usa)', R.sinSed.sas);
  no('   …ni la meta', R.sinSed.meta);
  si('★★ al sedar aparece el SAS…', R.conSed.sas);
  no('   …y se va la vigilia: nunca los dos a la vez (el pisón de Diego)', R.conSed.vigilia);
  eq('★ y el dato se BORRA al sedar, no queda colgado', R.conSed.valor, '');
  /* 🔴 18-sep-2026 · EL BNM TAMBIÉN SE VA. Diego: «sin sedación desaparece
     igual BNM, porque solo puede ser bloqueado con sedación». Un bloqueo
     neuromuscular sin sedación es un paciente paralizado y despierto: no es una
     casilla que deba poder marcarse por descuido. */
  no('★★ sin sedación no se puede bloquear: el BNM no está', R.sinSed.bnm);
  si('   …y con sedación vuelve', R.conSed.bnm);
  no('★ al sacar la sedación el BNM desaparece…', R.bnmTrasSacar.visible);
  no('   …y se DESMARCA, no queda marcado a escondidas', R.bnmTrasSacar.marcado);
  si('★★ la pantalla narra igual que el servidor',
     /Sin sedación, somnoliento\./.test(R.txtSin));
  eq('★ y el dato viaja a la planilla', R.enviado, 'Sopor superficial');

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ vigilia_sin_sedacion: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ vigilia_sin_sedacion: el campo vive donde el SAS no llega.');
})();
