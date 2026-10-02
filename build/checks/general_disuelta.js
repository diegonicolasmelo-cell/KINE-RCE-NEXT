// general_disuelta.js — La tarjeta «General» se disuelve: cada cosa va donde se usa
// (Diego, 30-sep-2026).
//
// LO QUE PIDIÓ:
//   · «Barthel, Apache, Charlson, escala clínica de fragilidad: probablemente eso va a ir en
//     evaluaciones. Ya son cosas totalmente distintas.»
//   · «Lo que puede aparecer en turno son los días de estadía, pero no como una casilla, sino
//     como información. No es algo que se pueda rellenar, es un cálculo.»
//   · «Las fases van del turno y podría ser una nueva [tarjeta], en vez de cambiar la general.»
//   · (y, del 17-sep) «Son de ingreso pero no siempre sabemos el dato de ingreso»: a las cuatro de
//     la mañana nadie sabe el Barthel previo. Ninguna es obligatoria y se ve como «pendiente»
//     en ámbar, nunca como un campo vacío que grita.
//
// 🔴 LOS CAMPOS NO CAMBIAN DE ID NI DE DUEÑO DE DATOS: fBarthel, fCharlson, fApache y fEcf siguen
// siendo los mismos y el guardado los lee igual. Solo cambian de casa: pasan a una SEXTA FAMILIA
// de Evaluaciones, «Preingreso».
//
// 🪤 EL PREINGRESO NO ES UNA MEDICIÓN DEL TURNO. Son datos del episodio que llegan con la familia.
// Abrir su cajón NO marca «se evaluó este turno» (EVAL_T_REALIZAR), y tenerlos cargados NO abre
// el cajón solo al reabrir un turno. Si lo hicieran, cada turno de cada paciente con un Barthel
// guardado quedaría contado como «evaluado».
//
// 🪤 NUNCA ROJO. El rojo es de lo que VENCE (MRC, FSS). El preingreso pendiente es ámbar aunque el
// paciente lleve diez días: el dato puede no existir y nadie lo está omitiendo.
//
// 🪤 EL DÍA DE ESTADÍA SE VE EN EL BANNER, no en una casilla. fDias sigue existiendo, oculto,
// porque es el estado que leen el relato y el texto; pero no es algo que se llene.
//
// 🪤 Reloj congelado (12-ago-2026).
//
// Uso: node build/checks/general_disuelta.js
const path = require('path');
const { chromium } = require('playwright-core');
const v2 = path.join(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 1700 }, locale: 'es-CL' });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    const FIJA = new Date(2026, 7, 12, 10, 0, 0).getTime(), RD = Date;
    function FD(...a) { if (!new.target) return new RD(FIJA).toString(); return a.length ? new RD(...a) : new RD(FIJA); }
    FD.prototype = RD.prototype; FD.now = () => FIJA; FD.UTC = RD.UTC; FD.parse = RD.parse; window.Date = FD;
    window._ll = []; window.__evo = null;
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
      api(a, d) { window._ll.push({ a, d }); let data = null;
        if (a === 'GET_CONFIG_UI') data = { NUM_CAMAS: 12, BANNERS: {} };
        else if (a === 'GET_EVO_TURNO') data = { actual: window.__evo, previa: null, pronoAbierto: '' };
        setTimeout(() => ok({ ok: true, data }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.join(v2, 'index.html'));
  await p.waitForTimeout(800);

  const abrir = (o, paso) => p.evaluate(x => {
    window.__evo = null; $('kf').reset();
    DB = [Object.assign({ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', EDAD: 61, SEXO: 'M', VIA_AEREA: 'TOT', SOPORTE: 'VM',
          FECHA_INGRESO: '2026-08-05', TS_INGRESO: '2026-08-05 23:00:00' }, x.extra || {})];
    window.recargarSilencioso = () => {};
    $('gDate').value = '2026-08-12'; SHIFT = x.noche ? 'Noche' : 'Dia';
    renderGrid(); abrirPanel('3', false, false);
  }, o).then(() => p.waitForTimeout(800))
    .then(() => p.evaluate(x => { window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
      if (x.modo) { $('fVA').value = 'TOT'; cascadeVA(); $('fSop').value = 'VM'; cascadeSop(); $('fModo').value = x.modo; renderParams(); updateVAUI(); }
      pasoEvalPintar(); pasoIr(x.paso); }, { paso, modo: o.modo }))
    .then(() => p.waitForTimeout(300));
  const ver = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0); }, sel);
  const badge = fam => p.evaluate(f => { const t = document.querySelector('#evTiles .evTile[data-fam="' + f + '"]');
    if (!t) return null; const e = t.querySelector('.evBadge'); return e ? { t: e.textContent.trim(), c: e.dataset.nivel } : { t: '', c: '' }; }, fam);
  const tocar = f => p.click('#evTiles .evTile[data-fam="' + f + '"]').then(() => p.waitForTimeout(120));
  const casa = id => p.evaluate(i => { const e = document.getElementById(i); if (!e) return '(no existe)';
    const f = e.closest('.evFam'); const c = e.closest('.fcard'); return (f ? 'fam:' + f.dataset.fam : (c ? c.id : '(suelto)')); }, id);

  console.log('\n1 · 🔴 La tarjeta «General» ya no existe');
  await abrir({}, 2);
  no('★★ no hay tarjeta #fcGen', await p.evaluate(() => !!$('fcGen')));
  no('★★ …ni el título «📊 General» en ninguna tarjeta', await p.evaluate(() => Array.from(document.querySelectorAll('.fcard-title')).some(t => /General/.test(t.textContent))));
  no('★ la franja de «plegar la ficha» tampoco (ya no hay escalas que plegar)', await p.evaluate(() => !!$('fPreUci')));

  console.log('\n2 · 🔴 Barthel, ECF, Charlson y APACHE viven en la familia «Preingreso»');
  for (const id of ['fBarthel', 'fEcf', 'fCharlson', 'fApache'])
    eq('★★ ' + id + ' está en Preingreso', await casa(id), 'fam:preingreso');
  await abrir({ modo: 'CPAP/PS' }, 3);
  eq('★★ hay SEIS cajones y Preingreso es el primero', await p.evaluate(() => Array.from(document.querySelectorAll('#evTiles .evTile')).map(t => t.dataset.fam).join(',')),
     'preingreso,funcionales,fuerza,ecograficas,respiratorias,via');
  eq('★★ se llama «Preingreso»', await p.evaluate(() => document.querySelector('#evTiles .evTile[data-fam="preingreso"] .evNom').textContent.trim()), 'Preingreso');
  si('★★ con icono SVG propio (no emoji)', await p.evaluate(() => !!document.querySelector('#evTiles .evTile[data-fam="preingreso"] .evIco svg')));

  console.log('\n3 · 🔴 Pendiente es ÁMBAR, nunca rojo — aunque lleve días');
  let bd = await badge('preingreso');
  eq('★★ sin ningún dato: cuenta las cuatro que faltan', bd && bd.t, '4');
  eq('★★ …en ámbar', bd && bd.c, 'ambar');
  await abrir({ extra: { FECHA_INGRESO: '2026-07-20', TS_INGRESO: '2026-07-20 10:00:00' } }, 3);
  bd = await badge('preingreso');
  eq('★★ 23 días de estadía y sigue ámbar (el rojo es de lo que vence)', bd && bd.c, 'ambar');
  await abrir({ extra: { BARTHEL: 85, CHARLSON: 3 } }, 3);
  bd = await badge('preingreso');
  eq('★★ con dos cargados faltan dos', bd && bd.t, '2');
  await abrir({ extra: { BARTHEL: 85, CHARLSON: 3, APACHE2: 14, ECF: 3 } }, 3);
  bd = await badge('preingreso');
  eq('★★ con las cuatro: visto verde', bd && (bd.t + '/' + bd.c), '✓/verde');

  console.log('\n4 · 🔴 NO es una medición del turno');
  no('★★ tenerlos cargados no abre ningún cajón solo', await ver('#dEgr'));
  no('★★ …ni marca «se evaluó este turno»', await p.evaluate(() => $('cEgr').checked));
  await tocar('preingreso');
  si('★★ al tocar el cajón se ven sus campos', await ver('#fBarthel'));
  no('★★ …y solo los suyos (no el FSS)', await ver('#fFSS'));
  no('★★ 🔴 abrirlo NO marca «se evaluó este turno»', await p.evaluate(() => $('cEgr').checked));
  eq('★ los valores cargados siguen ahí', await p.evaluate(() => v('fBarthel') + '|' + v('fCharlson') + '|' + v('fApache') + '|' + v('fEcf')), '85|3|14|3');
  await tocar('preingreso');
  no('★ tocarlo otra vez lo cierra', await ver('#fBarthel'));
  await tocar('fuerza');
  si('★ y uno de los de siempre sí marca el turno', await p.evaluate(() => $('cEgr').checked));
  no('★ …y NO muestra el preingreso', await ver('#fBarthel'));

  console.log('\n5 · Lo que se llena viaja igual al guardar');
  const viaja = await p.evaluate(async () => {
    $('kf').reset(); $('cBed').value = '4'; DB = [{ ID_CAMA: '4', OCUPADA: true }];
    const o = document.createElement('option'); o.value = 'Klgo. Test'; o.textContent = 'Klgo. Test'; $('fFirma').appendChild(o); $('fFirma').value = 'Klgo. Test';
    const he = $('fHEst'); if (he && !he.value) he.value = 'Estable';
    const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos';
    $('fVA').value = 'TQT'; _transAvisoOk = true;
    $('fBarthel').value = '60'; $('fCharlson').value = '2'; $('fApache').value = '11'; $('fEcf').value = '4';
    window._ll.length = 0; guardar(); await new Promise(r => setTimeout(r, 80));
    const c = window._ll.find(x => x.a === 'GUARDAR_EVOLUCION');
    return c ? [c.d.PAC_BARTHEL, c.d.PAC_CHARLSON, c.d.PAC_APACHE2, c.d.PAC_ECF].join('|') : null; });
  eq('★★ Barthel, Charlson, APACHE II y ECF viajan en el guardado', viaja, '60|2|11|4');
  await abrir({ noche: true, extra: { BARTHEL: 85 } }, 3);
  // 🗂️ 2-oct-2026: de noche la tarjeta SÍ se ve (mismo formato del día, con los cajones apagados), pero
  // sin campos: el Barthel cargado sigue en el formulario y no se puede editar desde ahí.
  si('★ de noche la tarjeta de mediciones se ve, con los cajones apagados', await ver('#fcEval') && await p.evaluate(() => Array.from(document.querySelectorAll('#evTiles .evTile')).every(t => t.disabled)));
  no('★ …y sin campos: el de Barthel no se ve', await ver('#fBarthel'));
  eq('★★ …pero el Barthel cargado sigue en el formulario', await p.evaluate(() => v('fBarthel')), '85');

  console.log('\n6 · 🔴 La fase clínica y la adecuación tienen su propia tarjeta');
  await abrir({}, 2);
  eq('★★ la fase clínica está en «fcFase»', await casa('faseChips'), 'fcFase');
  eq('★★ la adecuación del turno, también', await casa('aetTurno'), 'fcFase');
  si('★★ la tarjeta se ve en el turno', await ver('#fcFase'));
  si('★ y se llama «Fase clínica»', await p.evaluate(() => /Fase clínica/.test($('fcFase').querySelector('.fcard-title').textContent)));
  eq('★ el aislamiento y el reingreso siguen existiendo (estado oculto)', await p.evaluate(() => !!$('cAisl') && !!$('cReing')), 'true');
  no('★ …y no se ven', await ver('#cAisl'));

  console.log('\n7 · 🔴 El día de estadía es INFORMACIÓN, no una casilla');
  no('★★ no hay una casilla de «Día Estadía» a la vista', await ver('#fDias'));
  si('★ el estado sigue existiendo (lo leen el relato y el texto)', await p.evaluate(() => !!$('fDias')));
  eq('★★ y vale lo que corresponde a la fecha (12-ago menos 05-ago = 7)', await p.evaluate(() => v('fDias')), '7');
  si('★★ el banner dice el día', await p.evaluate(() => /Día 7/.test($('epBanner').textContent)));
  si('★★ …y cuándo ingresó, con fecha y hora', await p.evaluate(() => /ingresó 05-08 23:00/.test($('epBanner').textContent)));

  console.log('\n8 · La ficha sigue editable, sin repetir lo que ya se ve');
  await abrir({ extra: { BARTHEL: 85, APACHE2: 14, TALLA_CM: 170 } }, 2);
  si('★★ queda la línea «✏️ Editar ficha»', await ver('#fichaChip'));
  no('★★ ya no está dentro de ninguna tarjeta', await p.evaluate(() => !!$('fichaChip').closest('.fcard')));
  no('★★ 🔴 el resumen NO repite las escalas (viven en Evaluaciones)', await p.evaluate(() => /Barthel|APACHE|Charlson|ECF/.test($('fichaChipTxt').textContent)));
  si('★ pero sí la talla', await p.evaluate(() => /170 cm/.test($('fichaChipTxt').textContent)));
  await p.click('#fichaChip'); await p.waitForTimeout(150);
  si('★★ tocarla destapa la identificación para corregirla', await ver('#fcId'));

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ general_disuelta: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
