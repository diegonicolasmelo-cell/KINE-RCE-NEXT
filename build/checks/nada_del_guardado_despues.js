// nada_del_guardado_despues.js — Ningún campo que VIAJA EN EL GUARDADO puede
// vivir en un paso POSTERIOR al que guarda (20-sep-2026).
//
// 🔴 DE DÓNDE SALE. Diego, registrando un turno real: «otra cosa no aparece
// firma, así que no puedo avanzar al relato». Lo atribuí al equipo que faltaba
// en la planilla —cierto, y ya arreglado— pero al ir a mirar el paso 4 apareció
// que ESE NO ERA EL ÚNICO MOTIVO, y el otro es peor:
//
//   · El guardado ocurre al avanzar DEL PASO 3 («💾 Guardar y ver el relato»).
//   · La firma es OBLIGATORIA para guardar.
//   · Pero el selector de firma vivía en `fcPlanes`, marcada `data-paso="4"`.
//
// O sea: al tocar guardar salía «⚠️ Debes seleccionar la firma», el código le
// hacía `focus()` y le pintaba un borde rojo… A UN CAMPO QUE NO SE VE. Un
// callejón sin salida: el sistema exige firmar y no hay dónde firmar. El turno
// no se podía cerrar.
//
// 🪤 Y ARRASTRABA OTROS TRES. En la misma tarjeta viven el Plan Kinésico, la
// Nota del Turno y los pendientes del turno, y los tres viajan en el payload
// (PLAN_PLANES, PLAN_NOTA_TURNO, PLAN_PENDIENTES). Al mostrarse recién DESPUÉS
// de guardar, en un turno nuevo se guardaban SIEMPRE VACÍOS. Tres campos que el
// equipo cree que existen y que no se podían llenar nunca.
//
// LA REGLA QUE QUEDA, y por eso esta guardia mira TODOS los campos y no solo la
// firma: si un dato viaja en el guardado, tiene que poder escribirse ANTES de
// guardar. Un campo del payload en el paso 4 es, por construcción, un campo que
// nadie puede llenar.
//
// 🪤 El reloj va congelado: fecha inventada y SHIFT forzado.

const fs = require('fs');
const path = require('path');
const V2 = path.join(__dirname, '..', '..', 'v2');
const idx = fs.readFileSync(path.join(V2, 'index.html'), 'utf8');
const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!okk) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); }
};
const si = (l, g) => eq(l, !!g, 'true');

/* Los ids que el payload del guardado lee, sacados del código, no de una lista
   escrita a mano: una lista a mano envejece y deja de cubrir lo nuevo. */
const cuerpo = (idx.match(/\n  const datos=\{[\s\S]*?\n  \};/) || [''])[0];
const ids = [...new Set([...cuerpo.matchAll(/\bb?v\('([A-Za-z0-9_]+)'\)/g)].map(m => m[1]))];

const { chromium } = require('playwright-core');
(async () => {
  console.log('\n1 · 🔴 Ningún campo del guardado vive después del guardado');
  si('   se pudo leer el payload del guardado', cuerpo.length > 500);
  si('   …y trae una cantidad creíble de campos', ids.length > 80);

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

  const tardios = await p.evaluate((ids) => {
    // El paso que GUARDA es el 3: `pasoAvanzar` llama a guardar() desde ahí.
    return ids.map(id => {
      const e = document.getElementById(id);
      if (!e) return null;
      const due = e.closest('[data-paso]');
      const paso = due ? String(due.dataset.paso || '') : '';
      return (paso === '4') ? id : null;
    }).filter(Boolean);
  }, ids);
  eq('★★ campos del guardado escondidos en el paso 4', tardios.join(', ') || '(ninguno)', '(ninguno)');

  /* ══ 2 · El caso que lo destapó, de punta a punta ══════════════════════ */
  console.log('\n2 · 🔴 El turno se puede cerrar: la firma está donde se guarda');
  const R = await p.evaluate(async () => {
    const _t = window.toast; window.__toasts = [];
    window.toast = m => { window.__toasts.push(String(m)); if (_t) _t(m); };
    $('kf').reset();
    $('gDate').value = '2026-08-10';          // 🪤 fecha inventada
    SHIFT = 'Dia';                            // 🪤 turno forzado
    /* 🪤 `setRoster` NO es global: vive dentro del módulo `Turnos` y se expone
       como `Turnos.setRoster`. Llamarlo suelto no hace nada y el selector se
       queda con el placeholder — que es justo el síntoma que esta guardia
       investiga, así que confundirlos habría sido cómodo y falso. */
    window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine de prueba' }, { f: 'R.S.', n: 'Otro kine' }]);
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM' }];
    renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 420));
    pasoIr(3);
    await new Promise(r => setTimeout(r, 200));
    const vis = id => {
      const e = document.getElementById(id); if (!e) return false;
      const cs = getComputedStyle(e), r = e.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && !!(r.width || r.height);
    };
    const antes = { firma: vis('fFirma'), planes: vis('fPlanes'), anot: vis('anotTxt'), pend: vis('pendChips') };
    // Se intenta guardar SIN firma: el aviso tiene que poder atenderse.
    pasoAvanzar();
    await new Promise(r => setTimeout(r, 250));
    return {
      antes,
      aviso: window.__toasts.join(' | '),
      firmaTrasElAviso: vis('fFirma'),
      opciones: document.getElementById('fFirma')?.options.length || 0
    };
  });
  si('★★ la firma se ve en el paso que guarda', R.antes.firma);
  si('★★ el Plan Kinésico también', R.antes.planes);
  /* 🗂️ 20-sep-2026 · La «Nota del Turno» dejó de ser una caja: se fundió con
     las anotaciones (Diego dijo que sí). Sigue viajando en el payload como
     campo escondido —una evolución vieja puede traerla y se convierte en
     anotación al cargar—, así que lo que hay que exigir no es que SE VEA, sino
     que haya dónde escribir lo que antes iba ahí. */
  si('★★ y hay dónde escribir lo que antes era la Nota', R.antes.anot);
  si('★ y los pendientes del turno', R.antes.pend);
  si('   el aviso por firma faltante sigue saliendo', /firma/i.test(R.aviso));
  si('★★ …y el campo que pide está A LA VISTA para atenderlo', R.firmaTrasElAviso);
  si('   el selector trae al equipo de la planilla', R.opciones > 1);

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ nada_del_guardado_despues: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ nada_del_guardado_despues: todo lo que se guarda se puede escribir antes.');
})();
