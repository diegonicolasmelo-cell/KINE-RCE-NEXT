// tres_ejes_respiratorio.js — Vía aérea · soporte · interfaz, cada uno en lo
// suyo (decisión de Diego, 16-sep-2026, revisando el bloque respiratorio).
//
// EL DESORDEN QUE DESHACE. La «interfaz» ya se pedía siempre, pero repartida
// en DOS campos distintos según el caso:
//   · invasiva      → en vía aérea (TOT, TQT)
//   · VNI           → en vía aérea (Full Face, Oronasal)
//   · oxigenoterapia→ en MODO (NRC, MR, MMV, CNAF, tubo T, HME, CTAF…)
// Ninguno de esos «modos» es un modo ventilatorio: son todos dispositivos.
//
// EL MODELO NUEVO (palabras de Diego):
//   · Vía aérea → Natural · TOT · TQT          ← y nada más
//   · Soporte   → Ambiente · Oxigenoterapia · VNI · VMI
//   · Interfaz  → el dispositivo, en su propio campo
//   · Modo      → solo modos ventilatorios, con VNI o VMI
// Así el paciente con tubo en T queda sin campo extra: vía aérea TOT +
// soporte oxigenoterapia + interfaz tubo T.
//
// 🔴 LO QUE SE GUARDA NO CAMBIA. Hay 125 comparaciones contra 'TOT'/'TQT' en
// el código, más el histórico, el REM y los indicadores. `VENT_SOPORTE` sigue
// guardando 'VM' aunque la etiqueta diga VMI, y 'Oxigenoterapia/OAF' aunque
// diga Oxigenoterapia. Cambian los RÓTULOS, no los valores.
//
// 🫁 Y LA REGLA CLÍNICA DE DIEGO: «Full Face y oronasal no son invasivo. Lo
// que podría sumar es días de VNI». Un paciente con VNI tiene vía aérea
// NATURAL: deja de sumar días de vía aérea artificial. Los días de VNI se
// cuentan por el SOPORTE, que no se toca.
//
// Uso: node build/checks/tres_ejes_respiratorio.js
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright-core');
const V2 = path.resolve(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

(async () => {
  console.log('\n1 · El dato: una columna propia para la interfaz');
  const esq = fs.readFileSync(path.join(V2, 'esquema.gs'), 'utf8');
  // 🗂️ 16-sep-2026 · LA TUPLA DEL ESQUEMA AHORA TRAE TRES ELEMENTOS.
  // Cada columna es ['NOMBRE','tipo','Rótulo legible'] desde que la planilla
  // muestra el rótulo en castellano y el nombre técnico en la nota de la celda
  // (pedido de Diego). Los patrones de abajo aceptan el tercer elemento como
  // OPCIONAL: siguen exigiendo exactamente lo mismo —que la columna exista, con
  // su tipo y en su lugar— y no se aflojó nada.
  si('★ EVOLUCIONES tiene VENT_INTERFAZ', /\['VENT_INTERFAZ','texto'(?:,'[^']*')?\]/.test(esq));
  const ce = (esq.match(/\n  CAMAS_ESTADO: \{ headerRows: 2, cols: \[([\s\S]*?)\n  \]\}/) || [])[1] || '';
  si('★ CAMAS_ESTADO también, para el arrastre', ce.indexOf("['INTERFAZ'") !== -1);

  console.log('\n2 · Los tres ejes en pantalla');
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 1200 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.google = { script: { run: { withSuccessHandler(f) { return { withFailureHandler() { return {
      api(a) { setTimeout(() => f({ ok: true, data: a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.join(V2, 'index.html'));
  await p.waitForTimeout(800);

  const montar = (va, sop, extra) => p.evaluate(c => {
    DB = [{ ID_CAMA: '7', OCUPADA: true, PATIENT_ID: 'p7', NOMBRE: 'P', EDAD: 64, SEXO: 'M',
            VIA_AEREA: c.va, SOPORTE: c.sop || 'VM', FECHA_INGRESO: '2026-09-10' }];
    window.recargarSilencioso = () => {};
    renderGrid(); abrirPanel('7', false, false);
    $('fVA').value = c.va; cascadeVA();
    if (c.sop) { $('fSop').value = c.sop; cascadeSop(); }
    if (c.extra) c.extra.split('|').forEach(x => { const [id, val] = x.split('='); const e = $(id); if (e) { e.value = val; e.dispatchEvent(new Event('change')); } });
    const ops = s => Array.from(($(s) || { options: [] }).options).map(o => o.value).filter(Boolean);
    return { vas: ops('fVA'), sops: ops('fSop'), interf: ops('fInterfaz'), modos: ops('fModo'),
             hayInterfaz: !!document.getElementById('fInterfaz') };
  }, { va, sop, extra });

  const nat = await montar('Natural', '');
  await p.waitForTimeout(250);
  eq('★★ la vía aérea son TRES: natural, TOT y TQT', nat.vas.join(' · '), 'Natural · TOT · TQT');
  no('★ ya NO se elige «Full Face» como vía aérea', nat.vas.indexOf('Full Face') !== -1);
  no('★ ni «Oronasal»', nat.vas.indexOf('Oronasal') !== -1);
  si('★★ existe el campo de interfaz', nat.hayInterfaz);

  console.log('\n3 · La VNI: vía aérea natural, soporte VNI, interfaz la máscara');
  const vni = await montar('Natural', 'VNI');
  await p.waitForTimeout(250);
  si('★★ con vía natural se ofrece el soporte VNI', nat.sops.indexOf('VNI') !== -1);
  si('★★ …y sus interfaces son las máscaras', vni.interf.indexOf('Full Face') !== -1 && vni.interf.indexOf('Oronasal') !== -1);
  si('★ …con sus modos propios', ['S/T', 'AVAPS', 'CPAP'].every(m => vni.modos.indexOf(m) !== -1));

  console.log('\n4 · La oxigenoterapia: sus dispositivos son INTERFAZ, no modo');
  const o2 = await montar('Natural', 'Oxigenoterapia/OAF');
  await p.waitForTimeout(250);
  si('★★ naricera, mascarilla y alto flujo son interfaces',
     ['NRC', 'MR', 'CNAF'].every(x => o2.interf.indexOf(x) !== -1));
  no('★★ …y ya NO aparecen como modo ventilatorio',
     o2.modos.indexOf('CNAF') !== -1 || o2.modos.indexOf('NRC') !== -1);

  console.log('\n5 · ★ El tubo en T, sin campo extra');
  const tuboT = await montar('TOT', 'Oxigenoterapia/OAF');
  await p.waitForTimeout(250);
  si('★★ con TOT + oxigenoterapia, el tubo en T es una interfaz', tuboT.interf.indexOf('Tubo T') !== -1);
  si('…y el HME también', tuboT.interf.indexOf('HME') !== -1);

  console.log('\n6 · Lo que se GUARDA no cambia');
  const guarda = await p.evaluate(() => {
    $('fVA').value = 'TOT'; cascadeVA();
    $('fSop').value = 'VM'; cascadeSop();
    $('fModo').value = 'ACVC'; renderParams();
    return { sop: v('fSop'), va: v('fVA') };
  });
  eq('★★ el soporte invasivo sigue guardando «VM», diga VMI el rótulo', guarda.sop, 'VM');
  eq('★ y la vía aérea sigue siendo TOT', guarda.va, 'TOT');

  console.log('\n7 · 🫁 La regla de Diego: la máscara no es vía aérea artificial');
  const svcCamas = fs.readFileSync(path.join(V2, 'svc_camas.gs'), 'utf8');
  no("★★ 'Full Face' ya NO cuenta como vía aérea artificial",
     /tieneVA\s*=[^;]*Full Face/.test(svcCamas));
  si('★ los días de VNI se siguen contando por el SOPORTE',
     /_esVNIDb\s*\?/.test(fs.readFileSync(path.join(V2, 'index.html'), 'utf8')));

  eq('sin errores de JavaScript', errs.join(' | '), '');
  await b.close();
  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
