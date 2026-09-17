// sedacion_la_dice_el_sas.js — La profundidad de la sedación la dice el SAS, no
// una casilla ni el fármaco (17-sep-2026).
//
// LO QUE SE SACÓ. La casilla «😌 Sedación vigil / control de agitación — no es
// sedación profunda» era un campo que había que rellenar para decir algo que
// los otros tres ya decían. Diego: «si un paciente está en escalón 6 con
// Precedex y tiene un SAS 4, yo sé que está sedado porque tiene Precedex y que
// está vigil porque está en SAS 4. Se entiende; ya sería rellenar algo de más».
//
// 🔴 PERO NO ERA DECORATIVA. De ella dependía la FECHA DE SUSPENSIÓN DE LA
// SEDACIÓN PROFUNDA de la entrega de turno — la que sirve para interpretar
// después el Glasgow y la respuesta al retiro de hipnóticos. Hay una nota de
// Diego de agosto: antes, anotar Precedex para controlar la agitación contaba
// como «volver a sedar» y esa fecha desaparecía. La casilla fue el parche.
// Sacarla sin más habría devuelto ese bug.
//
// LO QUE LA REEMPLAZA: el SAS. SAS 1-2 es sedación profunda; 3 o más, no.
//   · Es el mismo corte que gobierna los gates de cooperación, S5Q y CAM-ICU,
//     así que queda UNA sola definición de «sedación profunda» en toda la app.
//   · No la define el FÁRMACO, y eso lo corrigió Diego: «hemos tenido pacientes
//     con fentanilo y propofol en dosis altas pero con un SAS 3-4, por lo tanto
//     han estado sedados vigil; depende más de eso que del tipo de fármaco».
//     Yo había propuesto una lista de hipnóticos: estaba equivocado.
//
// 🔴 COMPATIBLE HACIA ATRÁS: las evoluciones ya guardadas traen la casilla y
// pueden no traer SAS. Esas se siguen leyendo por la casilla. La columna
// SED_VIGIL no se borra —las posiciones del esquema son fijas—, se deja de
// escribir.

const fs = require('fs');
const path = require('path');
const v2 = path.join(__dirname, '..', '..', 'v2');
const idx = fs.readFileSync(path.join(v2, 'index.html'), 'utf8');
const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!okk) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); }
};
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

/* ══ 1 · La casilla se fue; la columna se queda ═════════════════════════ */
console.log('\n1 · La casilla que había que rellenar');
no('★ ya no está la casilla de sedación vigil', /id="cSedVigil"/.test(idx));
no('   …ni se escribe desde el turno', /SED_VIGIL\s*:\s*bv\(/.test(idx));
si('   control · la columna sigue en el esquema (las filas viejas la usan)',
   /SED_VIGIL/.test(fs.readFileSync(path.join(v2, 'esquema.gs'), 'utf8')));

/* ══ 2 · Los sedantes: lorazepam, y «fentanilo» en castellano ═══════════ */
console.log('\n2 · Los sedantes que se usan de verdad');
si('★ está Lorazepam (benzodiazepina continua, abuso de sustancias)',
   /data-f="Lorazepam"/.test(idx));
si('   …y los cinco de antes', ['Propofol', 'Midazolam', 'Ketamina', 'Precedex']
   .every(f => new RegExp('data-f="' + f + '"').test(idx)));
// 🪤 Estaba escrito en inglés y la decisión de pasarlo a castellano llevaba
// tomada desde la revisión campo por campo, sin aplicarse.
si('★ el fentanilo se llama «Fentanilo», no «Fentanyl»', /data-f="Fentanilo"/.test(idx));
no('   …y no queda el nombre en inglés', /Fentanyl/.test(idx));

/* ══ 3 · La fecha de suspensión: el SAS manda, la casilla es el respaldo ═ */
console.log('\n3 · 🔴 De qué depende ahora la fecha de suspensión');
// 🪤 No se grepea el fuente de la entrega: la lógica se mudó al dominio puro
// para que el relato, los gates y la entrega usen LA MISMA. Se prueba el
// comportamiento, que además dice más que un texto encontrado.
(0, eval)(['infra_util.gs', 'infra_fechas.gs', 'dominio_calculos.gs']
  .map(f => fs.readFileSync(path.join(v2, f), 'utf8')).join('\n;\n'));
const prof = (x) => sedacionProfunda(x);
si('★★ SAS 2 con sedación puesta es profunda', prof({ SED_TIPO: 'Escalón 6', SED_SAS: '2' }));
no('★★ SAS 4 con la misma sedación NO lo es', prof({ SED_TIPO: 'Escalón 6', SED_SAS: '4' }));
no('   sin sedación nunca es profunda', prof({ SED_TIPO: 'Sin sedación', SED_SAS: '1' }));
// 🪤 El caso que corrigió Diego: el fármaco no la define.
no('🪤 fentanilo + propofol en dosis altas con SAS 4 es sedación VIGIL',
   prof({ SED_TIPO: 'Escalón 6', SED_SAS: '4',
          SED_FARMACOS: JSON.stringify(['Fentanilo', 'Propofol']) }));
si('   …y los mismos fármacos con SAS 1 sí son profunda',
   prof({ SED_TIPO: 'Escalón 6', SED_SAS: '1',
          SED_FARMACOS: JSON.stringify(['Fentanilo', 'Propofol']) }));
// 🔴 Las filas de antes del 17-sep no traen SAS: se leen por la casilla.
no('🔴 fila vieja marcada como vigil: no es profunda',
   prof({ SED_TIPO: 'Escalón 6', SED_VIGIL: true }));
si('🔴 fila vieja sin marcar: sí lo es', prof({ SED_TIPO: 'Escalón 6' }));
// …y la entrega usa esa misma función, no una copia suya.
const ent = fs.readFileSync(path.join(v2, 'svc_entrega.gs'), 'utf8');
si('★ la entrega llama al dominio, no reimplementa la regla',
   /sedacionProfunda\(/.test(ent));

/* ══ 4 · El relato traduce el SAS a palabras ════════════════════════════ */
console.log('\n4 · ★ El relato dice el SAS en palabras, no solo el número');
// 🪤 Las `const` NO cuelgan de globalThis con eval indirecto. Los dominios de
// cálculo ya se cargaron arriba; acá se suma el de texto.
(0, eval)(fs.readFileSync(path.join(v2, 'dominio_texto.gs'), 'utf8'));

const rel = (sas, extra) => String(generarTextoEvolucion(Object.assign({
  SED_TIPO: 'Escalón 6', SED_SAS: String(sas),
  SED_FARMACOS: JSON.stringify(['Propofol']),
  VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM'
}, extra || {})) || '');

si('SAS 1 · sin respuesta', /SAS 1 \(sin respuesta/.test(rel(1)));
si('SAS 2 · sopor profundo', /SAS 2 \(sopor profundo/.test(rel(2)));
si('★ SAS 3 · somnoliento, despierta al llamado', /SAS 3 \(somnoliento/.test(rel(3)));
si('★ SAS 4 · vigil, tranquilo y cooperador', /SAS 4 \(vigil/.test(rel(4)));
si('SAS 5 · agitado, se calma a la contención verbal', /SAS 5 \(agitado/.test(rel(5)));
si('SAS 6 · no se calma', /SAS 6 \(/.test(rel(6)));
si('SAS 7 · agitación peligrosa', /SAS 7 \(agitación peligrosa/.test(rel(7)));
si('   el número no se pierde: sigue estando', /SAS 4/.test(rel(4)));
no('★ y ya no se escribe «vigil (control de agitación)» desde la casilla',
   /control de agitación/.test(rel(4, { SED_VIGIL: true })));

/* ══ 5 · Los dos motores dicen lo mismo ═════════════════════════════════ */
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

  console.log('\n5 · ★★ La pantalla lo narra igual que el servidor');
  const C = await p.evaluate(async () => {
    $('kf').reset(); $('cBed').value = '3';
    $('gDate').value = '2026-08-10';   // 🪤 fecha inventada
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM' }];
    renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 300));
    if (typeof pasoIr === 'function') pasoIr(2);
    $('fVA').value = 'TOT'; cascadeVA();
    $('fSop').value = 'VM'; cascadeSop();
    $('fSed').value = 'Escalón 6'; if (typeof hSed === 'function') hSed();
    $('fSAS').value = '4'; $('fSAS').dispatchEvent(new Event('change'));
    // el lorazepam se puede tocar
    const bl = document.querySelector('#sedFarmacos [data-f="Lorazepam"]');
    if (bl) bl.click();
    await new Promise(r => setTimeout(r, 80));
    return { txt: (typeof genTexto === 'function') ? String(genTexto() || '') : '',
             farm: (typeof _sedFarmLista === 'function') ? _sedFarmLista().join(',') : '' };
  });
  si('★★ la pantalla traduce el SAS 4', /SAS 4 \(vigil/.test(C.txt));
  eq('★ y el lorazepam queda registrado', C.farm, 'Lorazepam');

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ sedacion_la_dice_el_sas: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ sedacion_la_dice_el_sas: el SAS manda y no hay casilla que rellenar.');
})();
