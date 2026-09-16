// evento_sin_doble_pregunta.js — El evento se declara UNA vez, arriba
// (decisión de Diego, 16-sep-2026: «sácalo y deja solo eventos»).
//
// LA DOBLE PREGUNTA. El paso 1 abre con «¿Qué pasó hoy con la vía aérea?» y
// sus seis botones. Pero más abajo, dentro del bloque respiratorio, seguían
// dos casillas preguntando lo MISMO: «Ocurrió TQT este turno» y «Ocurrió
// decanulación este turno». Dos lugares para el mismo hecho es dos lugares
// donde se puede quedar a medias: declarar arriba y no marcar abajo, o al
// revés, y el turno queda contando una historia distinta según dónde se mire.
//
// 🔴 LAS CASILLAS NO SE BORRAN, SE ESCONDEN. El payload las lee (`cTqtO`,
// `cDecanOcurrio` alimentan TQT_OCURRIO y DECAN_OCURRIO) y la fila de eventos
// las marca por dentro. Borrarlas obligaría a reescribir el guardado y los
// consumidores del REM. Lo que se va es la SEGUNDA PREGUNTA, no el dato.
//
// Uso: node build/checks/evento_sin_doble_pregunta.js
const path = require('path');
const { chromium } = require('playwright-core');
const V2 = path.resolve(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

(async () => {
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

  const abrir = va => p.evaluate(x => {
    DB = [{ ID_CAMA: '7', OCUPADA: true, PATIENT_ID: 'p7', NOMBRE: 'P', EDAD: 64, SEXO: 'M',
            VIA_AEREA: x, SOPORTE: 'VM' }];
    window.recargarSilencioso = () => {};
    renderGrid(); abrirPanel('7', false, false);
    $('fVA').value = x; cascadeVA();
    $('fSop').value = 'VM'; cascadeSop();
    $('fModo').value = 'CPAP/PS'; renderParams();
    _snapIniEstado();
  }, va);
  const ver = sel => p.evaluate(s => { const e = document.querySelector(s); return !!e && e.offsetParent !== null; }, sel);

  console.log('\n1 · La pregunta vive UNA sola vez');
  await abrir('TQT');
  await p.waitForTimeout(400);
  si('★ la fila de eventos está a la vista', await ver('#evVAfila'));
  no('★★ la casilla «Ocurrió TQT este turno» ya NO se ofrece', await ver('#cTqtO'));
  no('★★ ni la de «Ocurrió decanulación este turno»', await ver('#cDecanOcurrio'));

  console.log('\n2 · Pero el dato sigue estando: la casilla vive, escondida');
  si('la casilla de TQT sigue en el documento', await p.evaluate(() => !!document.getElementById('cTqtO')));
  si('…y la de decanulación también', await p.evaluate(() => !!document.getElementById('cDecanOcurrio')));

  console.log('\n3 · Declarar el evento arriba abre su bloque');
  await p.evaluate(() => setEventoVA('decan'));
  await p.waitForTimeout(350);
  si('★★ al declarar decanulación, la casilla queda marcada por dentro',
     await p.evaluate(() => !!document.getElementById('cDecanOcurrio').checked));
  si('★ …y se abre su bloque de detalle', await ver('#dDecanDet'));
  eq('★ …y la vía aérea queda en Natural', await p.evaluate(() => v('fVA')), 'Natural');

  console.log('\n4 · Y volver a «Nada» lo deshace entero');
  await p.evaluate(() => setEventoVA('nada'));
  await p.waitForTimeout(350);
  no('★ la casilla se desmarca', await p.evaluate(() => !!document.getElementById('cDecanOcurrio').checked));
  eq('★ …y la vía aérea vuelve a la de llegada', await p.evaluate(() => v('fVA')), 'TQT');

  console.log('\n4b · ★★ El evento declarado NO se lleva su propio bloque');
  // 🪤 BUG ENCONTRADO EL 16-sep-2026, anterior a este cambio (se comprobó
  // contra el commit 1e88f60). Las secciones de evento se mostraban SOLO
  // según la vía aérea del momento: extubación con TOT, decanulación con TQT.
  // Pero declarar una extubación DEJA al paciente en natural, así que en
  // cuanto la vía aérea cambiaba el formulario escondía el bloque donde había
  // que escribir la hora, el tipo y con qué quedaba. La traqueostomía se
  // salvaba de casualidad: deja al paciente en TQT.
  for (const c of [{ va:'TQT', ev:'decan', sec:'#dDecanSec', nom:'decanulación' },
                   { va:'TOT', ev:'ext',   sec:'#dExtSec',   nom:'extubación' },
                   { va:'TOT', ev:'tqt',   sec:'#dTqtSec',   nom:'traqueostomía' }]) {
    await abrir(c.va);
    await p.waitForTimeout(300);
    await p.evaluate(e => setEventoVA(e), c.ev);
    await p.waitForTimeout(350);
    si('★★ declarada la ' + c.nom + ', su bloque sigue a la vista', await ver(c.sec));
  }

  console.log('\n5 · La casilla marcada manda, aunque la vía aérea ya cambió');
  // 🪤 Acá NO se usa fillForm: los campos de evento no se reponen desde la
  // réplica a propósito (un evento no se hereda del turno anterior), así que
  // una prueba montada con fillForm no probaría nada. Se marca la casilla
  // directamente, que es lo que hace la carga de un turno guardado, y se
  // cambia la vía aérea a natural como quedaría después de decanular.
  await abrir('TQT');
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const c = document.getElementById('cDecanOcurrio');
    c.checked = true; hDecan();
    const h = document.getElementById('fDecanHora'); if (h) h.value = '11:30';
    $('fVA').value = 'Natural'; cascadeVA();
    if (typeof updateVAUI === 'function') updateVAUI();
  });
  await p.waitForTimeout(400);
  si('★★ con la casilla marcada, la sección se ve aunque la vía aérea sea natural',
     await ver('#dDecanSec'));
  si('★ …y el detalle también', await ver('#dDecanDet'));
  eq('…con su hora intacta', await p.evaluate(() => v('fDecanHora')), '11:30');

  eq('sin errores de JavaScript', errs.join(' | '), '');
  await b.close();
  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
