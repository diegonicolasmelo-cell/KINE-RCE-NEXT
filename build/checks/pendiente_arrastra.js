// pendiente_arrastra.js — Un pendiente dura lo que tenga que durar, se ve
// cuánto lleva, y no se duplica al volver a tocarlo (20-sep-2026).
//
// DE DÓNDE SALE. Diego: «un pendiente se puede arrastrar más de 12 horas, hay
// veces que está pabellón pendiente en 2 días».
//
// Que dure ya estaba resuelto —los pendientes viven en el EPISODIO desde que se
// fusionaron las dos listas—, pero su ejemplo destapa DOS cosas que faltaban:
//
//  1. 🔴 SE DUPLICABAN, y lo introduje yo. Al hacer que los atajos abrieran
//     pendiente de episodio, los chips solo se marcaban con lo puesto en ESTE
//     turno. «Pabellón pendiente» abierto ayer aparecía sin marcar, alguien lo
//     tocaba de nuevo… y quedaban dos pendientes idénticos abiertos. Con un
//     pendiente que dura dos días, eso pasa el segundo día, siempre.
//     La defensa va en los DOS lados: la pantalla no ofrece abrir lo que ya
//     está abierto, y el servidor lo rechaza igual — dos teléfonos pueden
//     tocar el mismo chip a la vez y la pantalla no sabe del otro.
//
//  2. 🔵 NO SE VEÍA CUÁNTO LLEVA. «Pabellón pendiente» de hoy y uno de hace dos
//     días son la misma línea en pantalla, y no son lo mismo: el de dos días es
//     el que hay que ir a empujar. Ahora cada pendiente dice sus días, con la
//     misma regla de 24 horas completas que ya se acordó para la vía aérea, la
//     VM y la estadía (acuerdo 2.7).
//
// 🪤 Un pendiente CERRADO sí se puede volver a abrir: pabellón el lunes y otra
// vez el jueves son dos encargos distintos, no un duplicado.
//
// 🪤 EL RELOJ VA CONGELADO: las fechas de apertura se INVENTAN a partir de un
// «ahora» fijo, no se esperan del calendario.

const fs = require('fs');
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

/* ══ 1 · SERVIDOR · no se abre dos veces lo mismo ══════════════════════ */
console.log('\n1 · 🔴 El servidor rechaza el pendiente repetido');
const src = ['infra_respuesta.gs', 'infra_util.gs', 'svc_pendientes.gs']
  .map(f => fs.readFileSync(path.join(V2, f), 'utf8')).join('\n;\n');
let CAMA = { ID_CAMA: '3', OCUPADA: 'TRUE', PATIENT_ID: 'p3', PENDIENTES_JSON: '[]' };
global.repoLeerTodos = () => [CAMA];
global.repoBuscarPorId = () => CAMA;
global.repoActualizar = (h, k, v, campos) => { Object.assign(CAMA, campos); return 1; };
global.conLock = (fn) => fn();
global.ahoraTS = () => '2026-08-12 09:00:00';           // 🪤 «ahora» inventado
global.Utilities = { getUuid: () => 'u-' + Math.random().toString(16).slice(2, 10) };
global.SpreadsheetApp = { flush: () => {} };
global.leerConfig = (k, d) => d;
(0, eval)(src);

const abiertos = () => { try { return (JSON.parse(CAMA.PENDIENTES_JSON) || []).filter(p => !p.ci); } catch (e) { return []; } };
let r = pendAbrir({ idCama: '3', texto: 'Pabellón pendiente', firma: 'K.P.' }, {});
si('   el primero entra', r && r.ok);
eq('   …y queda uno abierto', abiertos().length, 1);

r = pendAbrir({ idCama: '3', texto: 'Pabellón pendiente', firma: 'R.S.' }, {});
no('★★ el mismo texto NO se abre otra vez', r && r.ok);
eq('★★ …y sigue habiendo uno solo', abiertos().length, 1);

r = pendAbrir({ idCama: '3', texto: '  pabellón   PENDIENTE ', firma: 'R.S.' }, {});
no('★ ni escrito con otra caja o espacios de más', r && r.ok);
eq('   …sigue uno solo', abiertos().length, 1);

// Cerrado → se puede volver a encargar: son dos cosas distintas.
const lista = JSON.parse(CAMA.PENDIENTES_JSON);
lista[0].ci = 'K.P.'; lista[0].ciTs = '2026-08-12 10:00:00';
CAMA.PENDIENTES_JSON = JSON.stringify(lista);
r = pendAbrir({ idCama: '3', texto: 'Pabellón pendiente', firma: 'R.S.' }, {});
si('★ una vez CERRADO sí se puede volver a encargar', r && r.ok);
eq('   …y ahora hay uno abierto de nuevo', abiertos().length, 1);

/* ══ 2 · PANTALLA · se ve cuánto lleva y no se ofrece duplicar ═════════ */
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

  const R = await p.evaluate(async () => {
    /* 🪤 El «ahora» de la página se congela: los días del pendiente se miden
       contra él, y si dependiera del reloj real esta guardia diría distinto
       según cuándo se corra. */
    window._horaAhoraCli = () => '09:00';
    $('kf').reset();
    $('gDate').value = '2026-08-12';
    SHIFT = 'Dia';
    window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine de prueba' }]);
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM',
            PENDIENTES_JSON: JSON.stringify([
              { id: 'a1', tx: 'Pabellón pendiente', ab: 'K.P.', abTs: '2026-08-10 09:00:00', ci: '', ciTs: '' },
              { id: 'a2', tx: 'EEG',                ab: 'K.P.', abTs: '2026-08-12 07:00:00', ci: '', ciTs: '' },
              { id: 'a3', tx: 'Traslado',           ab: 'K.P.', abTs: '2026-08-09 09:00:00', ci: 'R.S.', ciTs: '2026-08-10 09:00:00' }
            ]) }];
    renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 420));
    $('fFirma').value = 'K.P.';
    pasoIr(3);
    await new Promise(r => setTimeout(r, 220));
    window.__api = [];

    const chip = t => [...document.querySelectorAll('#pendChips [data-p]')]
      .find(c => String(c.dataset.p) === t);
    const pab = chip('Pabellón pendiente'), eeg = chip('EEG'), tra = chip('Traslado');
    const antes = { pab: pab && pab.textContent.trim(), eeg: eeg && eeg.textContent.trim(),
                    tra: tra && tra.textContent.trim() };
    // Tocar uno ya abierto no debe abrir nada
    if (pab) pab.click();
    await new Promise(r => setTimeout(r, 180));
    const trasChip = window.__api.filter(x => x.a === 'PEND_ABRIR').length;
    // Escribir el mismo texto a mano tampoco
    $('pasoPendTxt').value = 'Pabellón pendiente';
    pasoPendEscrito();
    await new Promise(r => setTimeout(r, 200));
    const trasLibre = window.__api.filter(x => x.a === 'PEND_ABRIR').length;
    // Uno nuevo sí
    $('pasoPendTxt').value = 'Pedir TAC';
    pasoPendEscrito();
    await new Promise(r => setTimeout(r, 200));
    return { antes, trasChip, trasLibre, trasNuevo: window.__api.filter(x => x.a === 'PEND_ABRIR').length };
  });

  console.log('\n2 · 🔵 Se ve cuánto lleva cada uno');
  si('★★ «Pabellón pendiente» sale marcado, no como si no existiera', /✓/.test(R.antes.pab || ''));
  si('★★ …y dice que lleva 2 días', /2 días/.test(R.antes.pab || ''));
  si('★ el de hoy dice «hoy», no «0 días»', /hoy/i.test(R.antes.eeg || ''));
  no('★ el que ya se cerró vuelve a ofrecerse limpio', /✓/.test(R.antes.tra || ''));

  console.log('\n3 · 🔴 Y no se duplica');
  eq('★★ tocar un chip ya abierto no abre nada', R.trasChip, 0);
  eq('★★ escribirlo a mano tampoco', R.trasLibre, 0);
  eq('★ uno nuevo sí se abre', R.trasNuevo, 1);

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ pendiente_arrastra: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ pendiente_arrastra: dura, se ve cuánto lleva, y no se duplica.');
})();
