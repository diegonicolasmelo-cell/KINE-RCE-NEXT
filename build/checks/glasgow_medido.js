// glasgow_medido.js — El Glasgow que aparece en la evolución es el que ALGUIEN
// MIDIÓ, no el que traía la pantalla de fábrica (17-sep-2026).
//
// EL BUG. Los tres desplegables del Glasgow nacían con `selected` puesto:
// O:4, V:5, M:6. O sea que toda evolución abría con **GCS 15** ya escrito y se
// guardaba así aunque nadie hubiera evaluado al paciente. Un 15 de fábrica en
// la ficha de un paciente sedado no es un dato faltante: es un dato FALSO, y
// se lee igual que uno medido.
//
// LO QUE DIEGO PIDIÓ (17-sep-2026): «lo mejor es que arranque vacío y el
// relato solo lo nombre si alguien lo midió… si yo lo mido hoy, que lo arrastre
// al siguiente turno».
//
// Y lo que NO se hace, porque él lo corrigió expresamente: el Glasgow **no se
// esconde nunca** por estar profundamente sedado. «El Glasgow igual uno lo
// puede evaluar en caso de que un paciente esté profundamente sedado, ya que
// la evaluación ahí me va a dar el puntaje mínimo, que son tres puntos… podría
// ser SAS 1 Glasgow 3».

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

const idx = fs.readFileSync(path.join(v2, 'index.html'), 'utf8');

/* ══ 1 · El HTML no trae un Glasgow puesto ═══════════════════════════════ */
console.log('\n1 · 🔴 Ningún valor de fábrica en el HTML');
['fGCSO', 'fGCSV', 'fGCSM'].forEach(id => {
  const sel = (idx.match(new RegExp('<select id="' + id + '"[\\s\\S]*?</select>')) || [''])[0];
  si('   ' + id + ' existe en la pantalla', sel.length > 0);
  no('★ ' + id + ' no nace con una opción `selected`', /selected/.test(sel));
  si('★ …y su primera opción está vacía', /<option[^>]*>\s*<\/option>|<option value=""/.test(sel));
});

/* ══ 2 · Se hereda del turno anterior ════════════════════════════════════ */
console.log('\n2 · Lo medido ayer se arrastra a hoy');
const her = (idx.match(/const _HER_CAMPOS\s*=\s*\[[\s\S]*?\]/) || [''])[0];
si('★ los tres están en la lista de herencia', /fGCSO/.test(her) && /fGCSV/.test(her) && /fGCSM/.test(her));

/* ══ 3 · El relato solo lo nombra si se midió ════════════════════════════ */
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

  const montar = async () => p.evaluate(async () => {
    $('kf').reset(); $('cBed').value = '3';
    // 🪤 Fecha inventada: nada de esta guardia puede depender del día en que corra.
    $('gDate').value = '2026-08-10';
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'PACIENTE PRUEBA',
            VIA_AEREA: 'TOT', SOPORTE: 'VM' }];
    renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 300));
    if (typeof pasoIr === 'function') pasoIr(2);
    $('fVA').value = 'TOT'; cascadeVA();
    $('fSop').value = 'VM'; cascadeSop();
    $('fSed').value = 'Escalón 6'; if (typeof hSed === 'function') hSed();
    $('fSAS').value = '1';
    // 🪤 calcGCS se llama en un setTimeout(…, 0): sin esperarlo se lee el
    // rótulo anterior y la guardia miente sobre el total.
    if (typeof calcGCS === 'function') calcGCS();
    await new Promise(r => setTimeout(r, 60));
  });

  console.log('\n3 · ★ Sin medir, el Glasgow no existe');
  await montar();
  const A = await p.evaluate(() => ({
    o: v('fGCSO'), vv: v('fGCSV'), m: v('fGCSM'),
    lbl: ($('lblGCS') || {}).textContent || '',
    txt: (typeof genTexto === 'function') ? String(genTexto() || '') : '',
    visible: !!$('fGCSO') && !!$('fGCSO').offsetParent
  }));
  // 🪤 La VERBAL no arranca vacía y está bien: con vía aérea artificial el
  // propio formulario la pone en 1T y la bloquea, porque un paciente intubado
  // no puede emitir respuesta verbal. Eso NO es un valor de fábrica, es una
  // deducción clínica correcta — y por eso tampoco cuenta como medición: lo
  // que alguien evalúa es la OCULAR y la MOTORA.
  eq('★ la ocular y la motora arrancan vacías', [A.o, A.m].join('|'), '|');
  eq('   …y la verbal la deduce la vía aérea artificial', A.vv, '1T');
  no('★★ …y el relato NO nombra el Glasgow', /GCS/.test(A.txt));
  no('   …ni escribe un «GCS ?»', /GCS \?/.test(A.txt));
  // 🔴 Diego lo corrigió expresamente: con SAS 1 el Glasgow SIGUE VISIBLE.
  si('🔴 con SAS 1 el Glasgow sigue a la vista (se puede medir: da 3)', A.visible);
  // 🪤 Al dejar de estar intubado la verbal saltaba sola a 5 («orientado»),
  // que es el mejor puntaje posible y nadie lo había evaluado.
  const D = await p.evaluate(async () => {
    $('fVA').value = 'Natural'; cascadeVA();
    if (typeof calcGCS === 'function') calcGCS();
    await new Promise(r => setTimeout(r, 60));
    return { vv: v('fGCSV') };
  });
  eq('★ al salir de la vía aérea artificial la verbal queda VACÍA, no en 5', D.vv, '');
  await montar();

  console.log('\n4 · Medido, se narra — y el servidor dice lo mismo');
  const B = await p.evaluate(async () => {
    const set = (id, val) => { const e = $(id); if (e) { e.value = val; e.dispatchEvent(new Event('change')); } };
    set('fGCSO', '1'); set('fGCSV', '1T'); set('fGCSM', '1');
    if (typeof calcGCS === 'function') calcGCS();
    await new Promise(r => setTimeout(r, 60));
    const firma = $('fFirma');
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
    return { txt: txt, lbl: ($('lblGCS') || {}).textContent || '', payload: env ? env.d : null };
  });
  si('★ medido, la pantalla lo narra', /GCS/.test(B.txt));
  si('★ el paciente intubado suma con T (3T, no 3)', /GCS 3T/.test(B.txt));
  si('★ el guardado lo lleva', !!B.payload && String(B.payload.SED_GCS_TOT) === '3T');

  // 🪤 Las `const` NO cuelgan de globalThis con eval indirecto.
  (0, eval)(['infra_util.gs', 'infra_fechas.gs', 'dominio_calculos.gs', 'dominio_texto.gs']
    .map(f => fs.readFileSync(path.join(v2, f), 'utf8')).join('\n;\n'));
  const S = String(generarTextoEvolucion(B.payload || {}) || '');
  si('★★ el servidor lo narra igual', /GCS 3T/.test(S));

  console.log('\n5 · ★★ Y el servidor tampoco inventa uno cuando no se midió');
  const vacio = Object.assign({}, B.payload || {},
    { SED_GCS_O: '', SED_GCS_V: '', SED_GCS_M: '', SED_GCS_TOT: '' });
  const SV = String(generarTextoEvolucion(vacio) || '');
  no('★★ el servidor no nombra el Glasgow sin medición', /GCS/.test(SV));
  no('   …ni escribe «GCS ?» ni «(O:?, V:?, M:?)»', /GCS \?|O:\?/.test(SV));

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ glasgow_medido: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ glasgow_medido: el Glasgow de la ficha es el que alguien midió.');
})();
