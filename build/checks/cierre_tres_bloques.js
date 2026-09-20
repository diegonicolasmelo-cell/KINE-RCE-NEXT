// cierre_tres_bloques.js — El cierre del turno son TRES bloques, cada uno con
// su reloj, y el pendiente SIEMPRE se puede escribir libre (20-sep-2026).
//
// DE DÓNDE SALE. Diego, sobre el cierre: «pendientes del turno, anotaciones del
// turno y dejar pendientes para el turno que viene… en realidad ahí debería
// agruparse en uno solo. Una cosa dirigida a narrar qué pasó hoy y otra a dejar
// pendientes. El plan kinésico… debería ser algo aparte».
//
// Al ir a mirar el código no eran tres cajas: eran CINCO, y hacían dos cosas
// distintas sin decirlo. Tres de ellas SE NARRAN en la evolución (anotaciones,
// Nota del Turno y Plan, que además cierra el texto por pedido de Manuel) y dos
// NO se narran (los chips del turno y los pendientes del episodio).
//
// LO QUE QUEDA, y que esta guardia fija:
//   A · «Qué pasó hoy»  — las anotaciones, que ABSORBEN la Nota del Turno:
//       una nota es exactamente una anotación sin hora, y así además deja hito.
//   B · «Plan para el próximo turno» — aparte, pegado al relato y no a los
//       pendientes: un pendiente se cierra, un plan no. Si viviera con ellos
//       quedaría abierto para siempre y ensuciaría la cuenta de cumplidos.
//   C · «Lo que queda pendiente» — UNA sola lista, la del episodio: la que
//       cruza el turno y que cualquiera puede cerrar.
//
// 🔴 Y EL DETALLE QUE PIDIÓ DIEGO, que no es cosmético: «que el pendiente sea
// libre, porque a veces la opción no está y se termina anotando en notas o
// anotaciones». Sin campo libre A LA VISTA, un encargo real termina en una caja
// que muere en 12 horas y que nadie puede cerrar. El campo libre es lo que
// impide esa fuga, así que se mide que esté visible JUNTO a los atajos.
//
// 🪤 Los chips viejos morían a las 12 horas —está escrito en el código: «por
// eso nadie podía cerrarlos»— y los pendientes del episodio nacieron para
// arreglarlo. Convivían el problema y su arreglo, con nombres casi iguales.
//
// 🪤 El reloj va congelado: fecha inventada y SHIFT forzado.

const path = require('path');
const V2 = path.join(__dirname, '..', '..', 'v2');
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
    window.__api = [];
    window.google = { script: { run: { withSuccessHandler(okF) { return { withFailureHandler() { return {
      api(a, d) { window.__api.push({ a: a, d: d });
        setTimeout(() => okF({ ok: true, data: (a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null) }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.resolve(V2, 'index.html'));
  await p.waitForTimeout(700);

  const abrir = (nota) => p.evaluate(async (nota) => {
    $('kf').reset();
    $('gDate').value = '2026-08-10';                  // 🪤 fecha inventada
    SHIFT = 'Dia';                                    // 🪤 turno forzado
    window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine de prueba' }]);
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM' }];
    renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 420));
    if (nota) fillForm({ PLAN_NOTA_TURNO: nota, ANOTACIONES_JSON: '[]', VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM' });
    pasoIr(3);
    await new Promise(r => setTimeout(r, 200));
    window.__api = [];
  }, nota || '');

  const vis = (id) => p.evaluate((id) => {
    const e = document.getElementById(id); if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && !!(r.width || r.height);
  }, id);

  /* ══ 1 · Tres bloques, y cada uno dice su reloj ═══════════════════════ */
  console.log('\n1 · 🔴 Tres bloques en el cierre, no cinco cajas');
  await abrir('');
  const B = await p.evaluate(() => {
    const g = [...document.querySelectorAll('#fcPlanes .cierre-g')];
    return g.map(x => ({
      id: x.id,
      titulo: (x.querySelector('.cg-t') || {}).innerText ? x.querySelector('.cg-t').innerText.replace(/\s+/g, ' ').trim() : '',
    }));
  });
  eq('★★ hay exactamente tres bloques', B.length, 3);
  si('★ el primero narra lo que pasó hoy', /qué pasó hoy/i.test(B[0] && B[0].titulo || ''));
  si('★ el segundo es el plan, aparte', /plan/i.test(B[1] && B[1].titulo || ''));
  si('★ el tercero, lo que queda pendiente', /pendiente/i.test(B[2] && B[2].titulo || ''));
  si('★★ y cada rótulo dice hasta cuándo vive', B.every(x => /relato|cierra|cierre|lo cierre/i.test(x.titulo)));

  /* ══ 2 · La Nota del Turno ya no es una caja aparte ═══════════════════ */
  console.log('\n2 · 🔴 La Nota del Turno se fusionó con las anotaciones');
  no('★★ no hay caja «Nota del Turno» a la vista', await vis('fNota'));
  si('   las anotaciones sí están', await vis('anotTxt'));

  console.log('\n3 · …y una nota vieja NO se pierde: pasa a ser anotación');
  await abrir('Paciente con familia presente, se educa');
  const N = await p.evaluate(() => ({
    anots: (ANOTS || []).map(a => a.t),
    notaCampo: (document.getElementById('fNota') || {}).value || ''
  }));
  si('★★ la nota vieja aparece entre las anotaciones', N.anots.some(t => /familia presente/i.test(t)));
  eq('★ y el campo viejo queda vacío, para no narrarla dos veces', N.notaCampo, '');

  /* ══ 4 · El pendiente SIEMPRE se puede escribir libre ═════════════════ */
  console.log('\n4 · 🔴 «Que el pendiente sea libre» — el campo, junto a los atajos');
  await abrir('');
  si('★★ el campo libre de pendientes está A LA VISTA', await vis('pasoPendTxt'));
  si('★ y los atajos también', await vis('pendChips'));
  const juntos = await p.evaluate(() => {
    const libre = document.getElementById('pasoPendTxt');
    const g = libre && libre.closest('.cierre-g');
    return !!(g && g.id === 'cgPend' && g.querySelector('#pendChips'));
  });
  si('★★ los dos viven en el MISMO bloque (no en pantallas distintas)', juntos);

  /* ══ 5 · Todo pendiente va al episodio, que es el que se puede cerrar ═ */
  console.log('\n5 · 🔴 Una sola lista: la que cruza el turno');
  const A = await p.evaluate(async () => {
    document.getElementById('fFirma').value = 'K.P.';   // evita el modal de firma
    window.__api = [];
    document.getElementById('pasoPendTxt').value = 'Pedir TAC de control';
    pasoPendEscrito();
    await new Promise(r => setTimeout(r, 200));
    const chip = document.querySelector('#pendChips [data-p]');
    if (chip) chip.click();
    await new Promise(r => setTimeout(r, 200));
    return {
      llamadas: window.__api.filter(x => x.a === 'PEND_ABRIR').map(x => x.d && x.d.texto),
      enTurno: (typeof _PEND_PUESTOS !== 'undefined') ? _PEND_PUESTOS.slice() : null
    };
  });
  si('★★ el texto libre abre pendiente de EPISODIO', A.llamadas.some(t => /Pedir TAC/i.test(t)));
  si('★★ y el atajo también, no una lista que muere', A.llamadas.length >= 2);
  si('★ quedan anotados como puestos en este turno', A.enTurno && A.enTurno.length >= 2);

  /* ══ 6 · La ficha de entrega no pierde nada ═══════════════════════════ */
  console.log('\n6 · La entrega de turno sigue recibiendo los del turno');
  const E = await p.evaluate(() => {
    // lo que viajaría en el guardado
    const s = JSON.stringify(Array.from((typeof _PEND_PUESTOS !== 'undefined') ? _PEND_PUESTOS : []));
    return s;
  });
  si('★★ PLAN_PENDIENTES viaja con lo puesto este turno', /Pedir TAC/i.test(E));

  /* ══ 7 · Ya no está duplicado en el paso 4 ════════════════════════════ */
  console.log('\n7 · El bloque viejo del paso 4 ya no existe aparte');
  const dup = await p.evaluate(() => {
    const e = document.getElementById('pasoPend');
    if (!e) return 'no existe';
    const due = e.closest('[data-paso]');
    return due ? String(due.dataset.paso || '') : 'sin paso';
  });
  no('★ el bloque suelto de pendientes ya no vive en el paso 4', dup === '4');

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ cierre_tres_bloques: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ cierre_tres_bloques: narrar, planear y encargar, cada uno en lo suyo.');
})();
