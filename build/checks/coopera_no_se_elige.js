// coopera_no_se_elige.js — La interpretación del nivel de cooperación se LEE,
// no se elige (18-sep-2026).
//
// DE DÓNDE SALE. Diego, revisando el panel: «en S5Q, la interpretación del
// nivel de cooperación no debería seleccionarse, ya que es eso: interpretación».
//
// Tenía razón y el campo era un híbrido peligroso. El formulario YA lo
// completaba solo desde el S5Q (<3 → no cooperador, ≥3 → cooperador), pero lo
// dejaba abierto para escribirle encima. Un selector que se rellena solo y
// además se puede cambiar a mano tiene dos fuentes de verdad, y la que gana es
// la última que se tocó: basta corregir el S5Q después para que queden
// contradiciéndose en la misma evolución, «S5Q ≥3, no cooperador».
//
// 🔴 LO QUE NO SE PUEDE PERDER: «No evaluable». Es una respuesta clínica real
// —el paciente está despierto pero el S5Q no se le puede aplicar: afasia,
// sordera, barrera idiomática— y de ella cuelgan el bloqueo de MRC, FSS y
// dinamometría y la categorización SOCHIMI. Como era una opción de la
// interpretación, al cerrar ese selector había que darle lugar donde de verdad
// corresponde: en el S5Q, que es la evaluación que no se pudo hacer.
//
// LO QUE ESTA GUARDIA FIJA:
//   1. La interpretación no es un selector: se muestra y viaja en un campo
//      oculto. Nadie puede escribirle encima.
//   2. El S5Q ofrece «No evaluable».
//   3. Las tres traducciones salen del S5Q y de nada más.
//   4. Cambiar el S5Q REESCRIBE la interpretación, siempre.
//   5. «No evaluable» sigue bloqueando las escalas que piden cooperación.

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

/* ══ 1 · El campo dejó de ser elegible ══════════════════════════════════ */
console.log('\n1 · La interpretación no se elige');
no('★★ ya no hay un selector de cooperación', /<select id="fCoop"/.test(idx));
si('★ el valor viaja en un campo oculto (sigue llegando a la planilla)',
   /<input[^>]*type="hidden"[^>]*id="fCoop"/.test(idx));
si('   y hay un cuadro que la MUESTRA', /id="lblCoop"/.test(idx));
si('   que sigue guardándose en SED_COOPERACION', /SED_COOPERACION:v\('fCoop'\)/.test(idx));

/* ══ 2 · «No evaluable» se mudó al S5Q ══════════════════════════════════ */
console.log('\n2 · 🔴 Dónde quedó «No evaluable»');
si('★★ el S5Q ofrece «No evaluable»', /<option value="ne">No evaluable<\/option>/.test(idx));
si('   y el comodín de plantilla sabe traducirlo', /ne:'no evaluable'/.test(idx));
si('   y el motor del servidor también',
   /ne/.test(fs.readFileSync(path.join(v2, 'dominio_texto.gs'), 'utf8')
     .match(/const s5qTxt[\s\S]{0,200}/)[0]));

/* ══ 3 · En pantalla: el S5Q manda y nadie le escribe encima ════════════ */
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

  console.log('\n3 · ★★ El S5Q es la única fuente');
  const R = await p.evaluate(async () => {
    const vis = id => { const e = document.getElementById(id); return !!e && !e.classList.contains('hidden'); };
    const poner = s5 => { $('fS5Q').value = s5; $('fS5Q').dispatchEvent(new Event('change', { bubbles: true })); };
    const leer = () => ({ val: $('fCoop').value, txt: ($('lblCoop') || {}).textContent || '' });
    $('kf').reset(); $('cBed').value = '3';
    $('gDate').value = '2026-08-10';   // 🪤 fecha inventada, no la de hoy
    /* 🪤 Y EL TURNO SE CONGELA. `SHIFT` se deduce del reloj real, y de noche
       aplicarGatesEval() se va por la primera línea sin tocar MRC ni FSS: esta
       guardia habría pasado en el turno de día y fallado en el de noche sin que
       nada estuviera mal. Se vio a las 23:30. */
    SHIFT = 'Dia';
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TQT', SOPORTE: 'VM' }];
    renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 300));
    if (typeof pasoIr === 'function') pasoIr(2);
    $('fVA').value = 'TQT'; cascadeVA(); $('fSop').value = 'VM'; cascadeSop();
    // Un paciente DESPIERTO: sin esto los gates esconden la fila entera.
    $('fSed').value = 'Sin sedación'; hSed();
    $('fGCSO').value = '4'; $('fGCSM').value = '6'; calcGCS(); autoCoopera();

    const vacio = leer();
    poner('lt3');  const bajo = leer();
    poner('gte3'); const alto = leer();
    poner('ne');   const noEv = leer();
    // ★ Con «No evaluable» las escalas que piden cooperación se bloquean.
    const escalas = { mrc: vis('rowMrc'), fss: vis('rowFss'),
                      prension: !!($('fPrension') || {}).disabled };
    // ★ Y volver a «≥3» las devuelve: el gate se mueve con el S5Q.
    poner('gte3');
    const vuelta = { coop: leer(), mrc: vis('rowMrc') };
    poner('');     const borrado = leer();
    /* 🪤 EL AUTOMATISMO SE SUELTA. Marcar el BNM pone «S5Q <3» solo —el
       paciente bloqueado no obedece órdenes—, y al desmarcarlo eso tiene que
       irse: si no, queda escrito «No cooperador» en alguien a quien nadie
       evaluó. Es la familia del Glasgow 15 de fábrica. */
    $('cBNM').checked = true;  autoCoopera();
    const conBnm = { s5q: $('fS5Q').value, coop: $('fCoop').value };
    $('cBNM').checked = false; autoCoopera();
    const trasBnm = { s5q: $('fS5Q').value, coop: $('fCoop').value };
    // …pero un <3 elegido A MANO no se toca: no es del automatismo.
    poner('lt3');
    $('cBNM').checked = true;  autoCoopera();
    $('cBNM').checked = false; autoCoopera();
    const aMano = { s5q: $('fS5Q').value, coop: $('fCoop').value };
    poner('');
    /* 🪤 La primera versión de esto quedó escrita DENTRO de autoCoopera() y
       la carga de un turno guardado —fillFormReplica, que también la llama—
       moría con «_coopDerivar is not defined», con el panel a medio abrir.
       Esta guardia no lo vio porque solo tocaba el S5Q, desde donde sí estaba
       en ámbito; lo cazó regresion_ui.js. */
    const global = typeof window._coopDerivar === 'function';
    return { vacio, bajo, alto, noEv, escalas, vuelta, borrado, global,
             conBnm, trasBnm, aMano };
  });

  eq('★★ S5Q <3  → No cooperador', R.bajo.val, 'No cooperador');
  eq('★★ S5Q ≥3  → Cooperador', R.alto.val, 'Cooperador');
  eq('★★ S5Q «no evaluable» → No evaluable', R.noEv.val, 'No evaluable');
  eq('   sin S5Q no se inventa nada', R.vacio.val, '');
  eq('   …y el cuadro lo dice con una raya, no en blanco', R.vacio.txt.trim(), '—');
  eq('★ lo que se ve es lo que se guarda', R.alto.txt.trim(), 'Cooperador');
  eq('★ borrar el S5Q borra la interpretación (no queda el valor viejo)',
     R.borrado.val, '');
  si('🪤 y la función vive en el ámbito global, no dentro de autoCoopera()',
     R.global);

  console.log('\n4 · 🔴 «No evaluable» sigue cerrando las escalas');
  no('★ con «No evaluable» no se pide MRC', R.escalas.mrc);
  no('   …ni FSS', R.escalas.fss);
  si('   …ni prensión', R.escalas.prension);
  si('★ y volver a ≥3 las devuelve', R.vuelta.mrc);
  eq('   con la interpretación al día', R.vuelta.coop.val, 'Cooperador');

  console.log('\n5 · 🪤 Lo que pone el automatismo, el automatismo lo suelta');
  eq('con BNM el S5Q se pone en <3 solo…', R.conBnm.s5q, 'lt3');
  eq('   …y la interpretación lo sigue', R.conBnm.coop, 'No cooperador');
  eq('★★ al sacar el BNM el S5Q se suelta', R.trasBnm.s5q, '');
  eq('★★ …y no queda «No cooperador» en quien nadie evaluó', R.trasBnm.coop, '');
  eq('★ pero un <3 elegido a mano sobrevive al BNM', R.aMano.s5q, 'lt3');
  eq('   con su interpretación', R.aMano.coop, 'No cooperador');

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ coopera_no_se_elige: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ coopera_no_se_elige: la interpretación la escribe el S5Q, nadie más.');
})();
