// identidad_una_vez.js — El nombre del paciente se dice UNA vez, y los pasos
// van debajo (pedido de Diego, 16-sep-2026, mirando la pantalla armada).
//
// LO QUE VIO. En el panel de los tres pasos el nombre aparecía TRES veces:
//   · escritorio → #epBanner, #spTitle («R. FUENZALIDA — Evolución») y el chip
//     de la ficha dentro de GENERAL;
//   · teléfono   → #mPac, #epBanner y #spTitle.
// Tres identificaciones no identifican mejor: gastan el alto de pantalla que
// en un teléfono es lo único escaso, y obligan a leer dos veces para estar
// seguro de que se trata del mismo paciente.
//
// LO QUE FIJA:
//   1 · ★ el nombre se dice UNA sola vez, en las dos pantallas;
//   2 · el que queda es el banner del episodio, que además trae edad, día,
//       vía aérea y soporte — verificar identidad es verificar TODO eso, no
//       solo el nombre;
//   3 · ★ el identificador va ARRIBA y los tres pasos debajo: primero de quién
//       se trata, después qué se va a registrar.
//
// 🪤 Cuenta sobre elementos HOJA visibles: si contara todos los nodos, cada
// div contenedor sumaría el nombre de sus hijos y el número saldría inflado.
//
// Uso: node build/checks/identidad_una_vez.js
const path = require('path');
const { chromium } = require('playwright-core');
const V2 = path.resolve(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');

const NOMBRE = 'R. FUENZALIDA';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });

  const abrir = async (vp) => {
    const p = await b.newPage({ viewport: vp });
    p.on('pageerror', e => { fails.push('JS: ' + e.message); console.log('❌ error de página: ' + e.message); });
    await p.addInitScript(() => {
      window.google = { script: { run: { withSuccessHandler(f) { return { withFailureHandler() { return {
        api(a) { setTimeout(() => f({ ok: true, data: a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null }), 5); }
      }; } }; } } } };
    });
    await p.goto('file://' + path.join(V2, 'index.html'));
    await p.waitForTimeout(900);
    await p.evaluate(nom => {
      DB = [{ ID_CAMA: '7', OCUPADA: true, PATIENT_ID: 'p7', NOMBRE: nom, EDAD: 64, SEXO: 'M',
              VIA_AEREA: 'TQT', SOPORTE: 'VM', FECHA_INGRESO: '2026-09-10', DIAGNOSTICO: 'NAC grave' }];
      window.recargarSilencioso = () => {};
      renderGrid(); abrirPanel('7', false, false);
    }, NOMBRE);
    await p.waitForTimeout(600);
    return p;
  };

  // Cuenta el nombre sobre elementos HOJA visibles, y dice dónde está cada uno.
  const contar = p => p.evaluate(nom => {
    const out = [];
    document.querySelectorAll('#sp *').forEach(el => {
      if (el.offsetParent === null || el.children.length) return;
      if ((el.textContent || '').toUpperCase().indexOf(nom.toUpperCase()) === -1) return;
      let n = el, id = '';
      while (n && n.id !== 'sp') { if (n.id) { id = n.id; break; } n = n.parentElement; }
      out.push(id || '(sin id)');
    });
    return out;
  }, NOMBRE);

  for (const [etiqueta, vp] of [['escritorio', { width: 1400, height: 950 }],
                                ['teléfono',   { width: 390,  height: 844 }]]) {
    console.log('\n── ' + etiqueta);
    const p = await abrir(vp);
    const donde = await contar(p);
    eq('★ el nombre se dice UNA sola vez (' + etiqueta + ')', donde.length, 1);
    if (donde.length !== 1) console.log('   aparece en: ' + donde.join(', '));
    eq('★ …y el que lo dice es el banner del episodio', donde[0] || '', 'epBanner');

    // Identificar es verificar TODO, no solo el nombre.
    const banner = await p.evaluate(() => (document.getElementById('epBanner') || {}).textContent || '');
    si('…que además trae la edad', /64/.test(banner));
    si('…el día de estadía', /Día/.test(banner));
    si('…la vía aérea', /TQT/.test(banner));
    si('…y el soporte', /VM/.test(banner));

    // 🔑 Lo que pidió Diego: primero de quién se trata, después qué se registra.
    const orden = await p.evaluate(() => {
      const e = document.getElementById('epBanner'), s = document.getElementById('spPasos');
      if (!e || !s) return null;
      return { banner: e.getBoundingClientRect().top, pasos: s.getBoundingClientRect().top,
               bannerVisible: e.offsetParent !== null };
    });
    si('el banner está a la vista', orden && orden.bannerVisible);
    si('★★ el identificador va ARRIBA y los pasos debajo (' + etiqueta + ')',
       orden && orden.banner < orden.pasos);
    await p.close();
  }

  await b.close();
  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
