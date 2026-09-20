// hdn_y_upot.js — La hemodinamia se pide, y el UPOT se reparte donde vive
// cada cosa (20-sep-2026).
//
// DOS DECISIONES DE DIEGO, después de revisar los cinco módulos:
//
//  1. 🔴 «HDN pedir antes de avanzar. Si no se anota.»
//     El hallazgo: los dos campos nacían puestos —Estado «Estable», DVA «Sin
//     requerimientos»— y NINGUNO tenía opción vacía, así que no existía la
//     forma de decir «no lo miré». Y no se quedaba en la pantalla: la
//     evolución escribía «HDN estable s/DVA» sola.
//     🪤 Había DOS redes que afirmaban lo mismo: además de los valores por
//     defecto, los dos generadores de texto —servidor y cliente— dicen «si no
//     viene estado, usa Estable». Arreglar solo la pantalla habría dejado el
//     agujero abierto por el otro lado, igual que con la hora del prono. Por
//     eso esta guardia mide las tres cosas: los campos, la validación y el
//     texto.
//     Es la afirmación clínica más fuerte que el sistema hacía por su cuenta:
//     un paciente inestable cuyo turno no bajó a hemodinamia quedaba con una
//     evolución que decía que estaba estable.
//
//  2. 🔵 «UPOT podríamos marcar "en seguimiento por UPOT" en neuro, y el test
//     de apnea, al ser una evaluación, que quede en evaluaciones en estos
//     casos.»
//     La tarjeta propia desaparece y cada cosa se va a donde pertenece: el
//     seguimiento es estado neurológico, y el test de apnea es una MEDICIÓN,
//     así que vive en el pool con las demás.
//     🪤 Con una trampa que había que cubrir: la tarjeta de Neurología aparece
//     por diagnóstico neuro o por la fase de neuroprotección, y las
//     condiciones de UPOT (vía aérea artificial + GCS ≤ 7 + sin sedación) NO
//     las implican — un paro cardiorrespiratorio sin diagnóstico neuro
//     escrito. Si no se suma ese disparador, la casilla se muda a un lugar
//     que no se ve y el seguimiento UPOT desaparece del sistema.
//
// 🔴 Las columnas no cambian: UPOT_ACTIVO, UPOT_MEDIDAS y APNEA_TEST se siguen
// escribiendo igual. Lo que cambia es dónde se tocan.
//
// 🪤 El reloj va congelado: fecha inventada y SHIFT forzado.

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

/* ══ 1 · El texto del SERVIDOR no inventa la hemodinamia ═══════════════ */
console.log('\n1 · 🔴 El servidor no escribe «HDN estable» por su cuenta');
const dom = fs.readFileSync(path.join(V2, 'dominio_texto.gs'), 'utf8');
no("★★ ya no está el «si no viene estado, usa Estable»", /HEMO_ESTADO'\)\s*\|\|\s*'Estable'/.test(dom));
const idx = fs.readFileSync(path.join(V2, 'index.html'), 'utf8');
no("★★ …ni su espejo en el cliente", /gv\('fHEst'\)\s*\|\|\s*'Estable'/.test(idx));
no("★★ …ni el del DVA", /gv\('fDVA'\)\s*\|\|\s*'Sin requerimientos'/.test(idx));

const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.__toasts = [];
    window.google = { script: { run: { withSuccessHandler(okF) { return { withFailureHandler() { return {
      api(a) { setTimeout(() => okF({ ok: true, data: (a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null) }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.resolve(V2, 'index.html'));
  await p.waitForTimeout(700);

  const abrir = (extra) => p.evaluate(async (extra) => {
    const _t = window.toast; window.__toasts = [];
    window.toast = m => { window.__toasts.push(String(m)); if (_t) _t(m); };
    $('kf').reset();
    $('gDate').value = '2026-08-12';               // 🪤 fecha inventada
    SHIFT = 'Dia';                                 // 🪤 turno forzado
    window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM' }];
    renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 450));
    $('fVA').value = 'TOT'; cascadeVA(); $('fSop').value = 'VM'; cascadeSop();
    if (extra) extra.split('|').forEach(par => { const [k, val] = par.split('='); const e = $(k); if (e) e.value = val; });
    /* 🪤 El GCS del gate NO sale de los campos: sale del total que se PINTA en
       `#lblGCS`. Poner fGCSO/fGCSM con `.value` no lo recalcula, así que el
       total seguía en 15 y el caso UPOT nunca se daba — la guardia habría
       dicho «no aparece» por la razón equivocada. */
    if (typeof calcGCS === 'function') calcGCS();
    if (typeof aplicarGatesNeuro === 'function') aplicarGatesNeuro();
    /* 🪤 Y AL PASO 2, que es donde viven Hemodinamia y Neurología. Parado en
       el 1 están `paso-oculto` y la medición diría «no aparece» por la razón
       equivocada. Es la tercera vez hoy que esta trampa muerde (ktm_de_noche,
       prono_un_boton y ésta): cada cosa se mide DONDE VIVE. */
    if (typeof pasoIr === 'function') pasoIr(2);
    await new Promise(r => setTimeout(r, 220));
  }, extra || '');

  const vis = (id) => p.evaluate((id) => {
    const e = document.getElementById(id); if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && !!(r.width || r.height);
  }, id);

  /* ══ 2 · Los campos nacen vacíos ════════════════════════════════════ */
  console.log('\n2 · 🔴 «No lo miré» ahora existe');
  await abrir('');
  const C = await p.evaluate(() => ({
    est: $('fHEst').value, dva: $('fDVA').value,
    estVacia: [...$('fHEst').options].some(o => o.value === ''),
    dvaVacia: [...$('fDVA').options].some(o => o.value === '')
  }));
  eq('★★ el Estado nace vacío', C.est, '');
  eq('★★ el DVA también', C.dva, '');
  si('   …porque ahora tienen opción vacía', C.estVacia && C.dvaVacia);

  /* ══ 3 · Y se piden antes de avanzar ════════════════════════════════ */
  console.log('\n3 · 🔴 «Pedir antes de avanzar»');
  const G = await p.evaluate(async () => {
    $('fFirma').value = 'K.P.';
    window.__toasts = [];
    guardar();
    await new Promise(r => setTimeout(r, 250));
    return { avisos: window.__toasts.join(' | ') };
  });
  si('★★ guardar sin hemodinamia avisa', /hemodinami|HDN/i.test(G.avisos));
  /* 🪤 El guardado ocurre al salir del paso 3 y la hemodinamia vive en el 2:
     avisar y enfocar algo de otro paso deja al colega mirando un aviso sin
     nada que tocar — lo mismo que pasaba con la firma. El aviso tiene que
     LLEVARLO al campo. */
  si('★★ …y el aviso lo lleva hasta el campo, que queda a la vista', await vis('fHEst'));

  const G2 = await p.evaluate(async () => {
    $('fHEst').value = 'Inestable'; $('fDVA').value = 'DVA dosis alta';
    window.__toasts = [];
    guardar();
    await new Promise(r => setTimeout(r, 250));
    return { avisos: window.__toasts.join(' | ') };
  });
  no('★★ con la hemodinamia puesta ya no se queja de ella', /hemodinami|HDN/i.test(G2.avisos));

  /* ══ 4 · UPOT repartido ═════════════════════════════════════════════ */
  console.log('\n4 · 🔵 El UPOT se va a donde vive cada cosa');
  no('★★ la tarjeta propia de UPOT ya no existe', await p.evaluate(() => !!document.getElementById('fcUpot')));
  const D = await p.evaluate(() => {
    const c = document.getElementById('cUPOT');
    const enNeuro = !!(c && c.closest('#fcNeuro'));
    const ap = document.getElementById('fApneaTest');
    const enEval = !!(ap && ap.closest('#fcEval'));
    return { enNeuro, enEval, hayCasilla: !!c, hayApnea: !!ap };
  });
  si('★★ la casilla «en seguimiento por UPOT» vive en Neurología', D.enNeuro);
  si('★★ y el test de apnea, en Evaluaciones', D.enEval);

  /* ══ 5 · La trampa: Neurología tiene que aparecer en el caso UPOT ═══ */
  console.log('\n5 · 🪤 Un UPOT sin diagnóstico neuro escrito igual ve la casilla');
  await abrir('fDx=PARO CARDIORRESPIRATORIO RECUPERADO|fGCSO=1|fGCSM=1|fSed=Sin sedación');
  si('★★ Neurología aparece por las condiciones de UPOT', await vis('fcNeuro'));
  si('★★ …y con ella la casilla de seguimiento', await vis('cUPOT'));

  console.log('\n6 · Sin esas condiciones y sin Dx neuro, no aparece');
  await abrir('fDx=NEUMONIA ADQUIRIDA EN LA COMUNIDAD');
  no('★ Neurología sigue escondida', await vis('fcNeuro'));

  /* ══ 7 · Las columnas no cambian ════════════════════════════════════ */
  console.log('\n7 · El guardado sigue escribiendo lo mismo');
  si('★ UPOT_ACTIVO sigue en el payload', /UPOT_ACTIVO:\s*bv\('cUPOT'\)/.test(idx));
  si('★ UPOT_MEDIDAS también', /UPOT_MEDIDAS:\s*bv\('cUPOTmed'\)/.test(idx));
  si('★ y APNEA_TEST', /APNEA_TEST:\s*v\('fApneaTest'\)/.test(idx));

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ hdn_y_upot: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ hdn_y_upot: la hemodinamia se pide y el UPOT vive donde corresponde.');
})();
