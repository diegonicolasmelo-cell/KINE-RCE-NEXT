// modos_simv.js — Los modos de VM son NUEVE: faltaban los dos SIMV
// (decisión de Diego, 16-sep-2026, revisando el bloque respiratorio).
//
// LO QUE FALTABA. La lista de modos de ventilación mecánica tenía siete:
// ACVC · ACPC · CPAP/PS · CPAP · S/T · AVAPS · CFLEX. Faltan **SIMV VC** y
// **SIMV PC**, que la unidad sí usa. Un modo que no está en la lista se
// registra como otro parecido, y el parámetro que lo distingue se pierde.
//
// QUÉ PARÁMETROS PIDE CADA UNO. SIMV es un modo MIXTO: tiene respiraciones
// mandatorias (como ACVC o ACPC según la variante) y respiraciones
// espontáneas, que llevan presión de soporte. Por eso:
//   · SIMV VC = los parámetros de ACVC + PS
//   · SIMV PC = los parámetros de ACPC + PS
// La PS es lo que los distingue de sus modos controlados puros; sin ella no
// se puede saber con cuánta ayuda respiraba el paciente entre mandatorias.
//
// 🪤 Nada de columnas nuevas: VENT_PS, VENT_VT y VENT_PINSP ya existen. Esto
// es la lista de modos y qué campos muestra cada uno, no el modelo de datos.
//
// Uso: node build/checks/modos_simv.js
const path = require('path');
const { chromium } = require('playwright-core');
const V2 = path.resolve(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 1200 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.__llamadas = [];
    window.google = { script: { run: { withSuccessHandler(f) { return { withFailureHandler() { return {
      api(a, d) { window.__llamadas.push({ a: a, d: d });
        setTimeout(() => f({ ok: true, data: a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.join(V2, 'index.html'));
  await p.waitForTimeout(800);

  // Qué modos ofrece VM con cada vía aérea invasiva
  const modosCon = va => p.evaluate(x => {
    DB = [{ ID_CAMA: '7', OCUPADA: true, PATIENT_ID: 'p7', NOMBRE: 'P', VIA_AEREA: x, SOPORTE: 'VM' }];
    window.recargarSilencioso = () => {};
    renderGrid(); abrirPanel('7', false, false);
    // 🗂️ 17-sep-2026 · El camino ganó el paso 1 (Prevención de NAVM), así que
    // abrirPanel ya no deja el turno a la vista: hay que pararse en él. La
    // guardia mide lo mismo de siempre, solo desde donde ahora se ve.
    pasoIr(2);
    $('fVA').value = x; cascadeVA();
    $('fSop').value = 'VM'; cascadeSop();
    return Array.from($('fModo').options).map(o => o.value).filter(Boolean);
  }, va);

  console.log('\n1 · Los nueve modos de VM');
  const tot = await modosCon('TOT');
  await p.waitForTimeout(200);
  si('★★ TOT ofrece SIMV VC', tot.indexOf('SIMV VC') !== -1);
  si('★★ TOT ofrece SIMV PC', tot.indexOf('SIMV PC') !== -1);
  si('…y sigue ofreciendo los de antes', ['ACVC', 'ACPC', 'CPAP/PS'].every(m => tot.indexOf(m) !== -1));
  const tqt = await modosCon('TQT');
  await p.waitForTimeout(200);
  si('★★ TQT ofrece SIMV VC', tqt.indexOf('SIMV VC') !== -1);
  si('★★ TQT ofrece SIMV PC', tqt.indexOf('SIMV PC') !== -1);
  eq('★ TQT llega a nueve modos de VM', tqt.length, 9);
  si('…y conserva los de vía invasiva (S/T, AVAPS, CFLEX son VMI por TQT)',
     ['S/T', 'AVAPS', 'CFLEX', 'CPAP'].every(m => tqt.indexOf(m) !== -1));

  console.log('\n2 · Qué parámetros pide cada uno');
  const params = modo => p.evaluate(m => {
    $('fVA').value = 'TOT'; cascadeVA();
    $('fSop').value = 'VM'; cascadeSop();
    $('fModo').value = m; renderParams();
    const v = [];
    document.querySelectorAll('#fcRespCard input,#fcRespCard select').forEach(el => {
      if (el.type !== 'hidden' && el.offsetParent !== null && /^r_/.test(el.id)) v.push(el.id.slice(2));
    });
    return v;
  }, modo);

  const vc = await params('SIMV VC');
  await p.waitForTimeout(200);
  si('★ SIMV VC pide el volumen de las mandatorias (VT)', vc.indexOf('vt') !== -1);
  si('★ …la frecuencia', vc.indexOf('fr') !== -1);
  si('★★ …y la PRESIÓN DE SOPORTE de las espontáneas', vc.indexOf('ps') !== -1);
  si('…con PEEP y FiO₂', vc.indexOf('peep') !== -1 && vc.indexOf('fio2') !== -1);
  si('…y la mecánica del modo controlado (Ppl, AutoPEEP)',
     vc.indexOf('ppl') !== -1 && vc.indexOf('autopeep') !== -1);

  const pc = await params('SIMV PC');
  await p.waitForTimeout(200);
  si('★ SIMV PC pide la presión inspiratoria', pc.indexOf('pinsp') !== -1);
  si('★ …la frecuencia', pc.indexOf('fr') !== -1);
  si('★★ …y la PRESIÓN DE SOPORTE', pc.indexOf('ps') !== -1);
  si('…con PEEP y FiO₂', pc.indexOf('peep') !== -1 && pc.indexOf('fio2') !== -1);

  console.log('\n3 · Lo registrado llega al guardado');
  const payload = await p.evaluate(() => {
    $('fVA').value = 'TOT'; cascadeVA();
    $('fSop').value = 'VM'; cascadeSop();
    $('fModo').value = 'SIMV VC'; renderParams();
    const set = (id, val) => { const e = document.getElementById(id); if (e) e.value = val; };
    set('r_vt', '450'); set('r_fr', '12'); set('r_ps', '10'); set('r_peep', '8'); set('r_fio2', '40');
    return (typeof armarPayload === 'function') ? armarPayload() : (typeof _payload === 'function' ? _payload() : null);
  });
  if (payload) {
    eq('★ el modo viaja', String(payload.VENT_MODO || ''), 'SIMV VC');
    eq('★ el volumen viaja', String(payload.VENT_VT || ''), '450');
    eq('★★ la presión de soporte viaja', String(payload.VENT_PS || ''), '10');
    eq('…y la PEEP', String(payload.VENT_PEEP || ''), '8');
  } else {
    console.log('ℹ️  no se pudo armar el payload desde acá; se mide por los campos');
    eq('★ los campos quedaron con lo puesto',
       await p.evaluate(() => v('r_vt') + '|' + v('r_ps')), '450|10');
  }

  console.log('\n4 · El relato nombra el modo');
  si('★ el texto generado dice SIMV VC',
     /SIMV VC/.test(await p.evaluate(() => { try { return genTexto(); } catch (e) { return ''; } })));

  eq('sin errores de JavaScript', errs.join(' | '), '');
  await b.close();
  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
