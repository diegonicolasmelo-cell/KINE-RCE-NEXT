// prono_un_boton.js — El prono es un EVENTO que arrastra el estado hasta que
// «Supinar» lo cierra. Un solo botón por turno (19-sep-2026).
//
// LA DECISIÓN ES DE DIEGO, y la formuló él mejor de lo que yo la había
// propuesto:
//
//   «El prono como evento puede arrastrar estado hasta que se suspenda con
//    supinar? Eso en vez de tener varios botones porque prono y se prono este
//    turno puede confundir.»
//
// EL PROBLEMA. Había SEIS controles para una sola cosa: «Prono», «Se prona
// este turno», «Supino», «Se supina este turno» y dos horas. Dos de ellos se
// llaman casi igual que los otros dos, y el colega tenía que acordarse de
// desmarcar uno y marcar el otro para que el registro quedara coherente.
//
// 🪤 Y OJO CON LA CICATRIZ QUE HAY DEBAJO. La casilla «se prona este turno»
// existe porque Diego reportó el bug (v5.32): estar en prono NO es haber
// pronado, y sin separarlas el sistema contaba una pronación en CADA turno que
// el paciente siguiera boca abajo. Este cambio NO la reabre — la resuelve
// mejor: el evento se registra UNA vez (el turno en que se toca «Pronar») y el
// estado se arrastra del ciclo abierto que el servidor ya guarda
// (PRONO_INICIO_TS sin SUPINO_TS). Nunca se cuentan dos pronaciones.
//
// 🔴 LAS COLUMNAS NO CAMBIAN. RESP_POS_PRONO, RESP_PRONO_EVENTO,
// RESP_POS_SUPINO, RESP_SUPINO_EVENTO y las horas siguen escribiéndose igual
// que antes: lo que cambió es QUIÉN las marca. Por eso el servidor, la
// entrega, la timeline y el texto clínico siguen intactos. Esta guardia lo
// comprueba estado por estado.
//
// 🪤 EL RELOJ VA CONGELADO: fecha inventada y SHIFT forzado. Además la hora
// del evento se pone a mano en vez de dejar que la tome del reloj real.

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

/** Abre una cama en VM con (o sin) un ciclo de prono abierto de antes. */
async function abrir(p, abiertoTS) {
  return p.evaluate(async (abiertoTS) => {
    $('kf').reset();
    $('gDate').value = '2026-08-10';       // 🪤 fecha inventada
    SHIFT = 'Dia';                         // 🪤 turno forzado
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM' }];
    renderGrid();
    abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 350));
    /* 🪤 LA FRANJA VIVE EN EL PASO 2. Parado en el paso 1 está `paso-oculto` y
       «no se ve ninguna casilla» sale verde sin probar nada — el mismo falso
       verde que ya mordió en ktm_de_noche.js. */
    if (typeof pasoIr === 'function') pasoIr(2);
    await new Promise(r => setTimeout(r, 120));
    $('fVA').value = 'TOT'; cascadeVA();
    $('fSop').value = 'VM'; cascadeSop();
    window._pronoAbierto = abiertoTS || '';
    if (typeof pronoPintar === 'function') pronoPintar();
    await new Promise(r => setTimeout(r, 80));
  }, abiertoTS || '');
}

/** Lo que se ve, y lo que quedaría en las columnas. */
async function leer(p) {
  return p.evaluate(() => {
    const visible = el => {
      if (!el) return false;
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && !!(r.width || r.height);
    };
    const btn = document.getElementById('btnProno');
    return {
      // lo que ve el colega
      /* 🔃 19-sep-2026 · «Un solo botón» pasó a ser «un solo botón de ACCIÓN».
         Diego pidió que tras pronar apareciera «Supinar» al tiro, y eso dejó
         sin lugar al «Deshacer» que antes ocupaba el botón principal: bajó a
         enlace subrayado, deliberadamente chico, para que un toque por error
         se pueda borrar sin competir con la acción. Se cuentan los botones de
         acción; el enlace se mide aparte. */
      botones: [...document.querySelectorAll('#dPronoStrip button')].filter(visible)
                 .filter(b => b.id !== 'btnPronoDeshacer').map(b => b.textContent.trim()),
      deshacerALaVista: visible(document.getElementById('btnPronoDeshacer')),
      textoBoton: btn ? btn.textContent.trim() : '(no hay)',
      estado: (document.getElementById('pronoEstado') || {}).textContent
                ? document.getElementById('pronoEstado').textContent.replace(/\s+/g, ' ').trim() : '',
      casillasALaVista: ['cProno', 'cPronoEv', 'cSupino', 'cSupinoEv']
        .filter(id => visible(document.getElementById(id))),
      // lo que va a las columnas (mismos ids de siempre)
      col: {
        POS_PRONO:      !!document.getElementById('cProno')?.checked,
        PRONO_EVENTO:   !!document.getElementById('cProno')?.checked && !!document.getElementById('cPronoEv')?.checked,
        POS_SUPINO:     !!document.getElementById('cSupino')?.checked,
        SUPINO_EVENTO:  !!document.getElementById('cSupino')?.checked && !!document.getElementById('cSupinoEv')?.checked,
        PRONO_HORA:     document.getElementById('fPronoHora')?.value || '',
        SUPINO_HORA:    document.getElementById('fSupinoHora')?.value || ''
      }
    };
  });
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.google = { script: { run: { withSuccessHandler(okF) { return { withFailureHandler() { return {
      api(a) { setTimeout(() => okF({ ok: true, data: (a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null) }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.resolve(V2, 'index.html'));
  await p.waitForTimeout(600);

  /* ══ 1 · Las cuatro casillas salen de la vista ════════════════════════ */
  console.log('\n1 · 🔴 «Prono» y «se pronó este turno» dejan de convivir');
  await abrir(p, '');
  let R = await leer(p);
  eq('★★ ninguna de las cuatro casillas se ve', R.casillasALaVista.join(',') || '(ninguna)', '(ninguna)');
  eq('★★ y hay UN solo botón', R.botones.length, 1);

  /* ══ 2 · Sin prono: el botón invita a pronar ══════════════════════════ */
  console.log('\n2 · Paciente en supino');
  si('★ el botón dice «Pronar»', /pronar/i.test(R.textoBoton));
  no('   …y nada marcado todavía', R.col.POS_PRONO || R.col.POS_SUPINO);

  /* ══ 3 · Pronar: un toque escribe evento Y estado ═════════════════════ */
  console.log('\n3 · 🔴 Un toque prona: el EVENTO y el ESTADO salen juntos');
  await p.evaluate(async () => {
    pronoAccion();
    document.getElementById('fPronoHora').value = '21:30';  // 🪤 hora a mano, no del reloj
    if (typeof pronoPintar === 'function') pronoPintar();
    await new Promise(r => setTimeout(r, 60));
  });
  R = await leer(p);
  si('★★ RESP_POS_PRONO queda en sí', R.col.POS_PRONO);
  si('★★ RESP_PRONO_EVENTO también (se pronó ESTE turno)', R.col.PRONO_EVENTO);
  no('★ y el supino no se marcó de rebote', R.col.POS_SUPINO || R.col.SUPINO_EVENTO);
  eq('★ la hora quedó guardada', R.col.PRONO_HORA, '21:30');
  si('★ la pantalla dice que está en prono', /prono/i.test(R.estado));
  eq('★★ y sigue habiendo UN solo botón', R.botones.length, 1);
  si('★★ y ya ofrece supinar en el mismo turno (Diego, 19-sep)', /supinar/i.test(R.textoBoton));
  si('★ con el enlace para deshacer si fue un toque por error', R.deshacerALaVista);

  /* ══ 4 · El estado se arrastra solo al turno siguiente ════════════════ */
  console.log('\n4 · 🔴 El ciclo abierto arrastra el estado, sin volver a marcarlo');
  await abrir(p, '2026-08-09 21:30');   // pronado ayer, ciclo sin cerrar
  R = await leer(p);
  si('★★ el paciente aparece en prono sin que nadie lo marque', R.col.POS_PRONO);
  no('★★ pero NO se cuenta una pronación nueva (la cicatriz v5.32)', R.col.PRONO_EVENTO);
  si('★★ el botón ahora dice «Supinar»', /supinar/i.test(R.textoBoton));
  eq('★ y sigue siendo uno solo', R.botones.length, 1);
  si('★ la pantalla muestra las horas que lleva', /\dh|\d h|\d,\d/.test(R.estado));

  /* ══ 5 · Supinar cierra el ciclo ══════════════════════════════════════ */
  console.log('\n5 · Supinar cierra el ciclo');
  await p.evaluate(async () => {
    pronoAccion();
    document.getElementById('fSupinoHora').value = '12:00';  // 🪤 hora a mano
    if (typeof pronoPintar === 'function') pronoPintar();
    await new Promise(r => setTimeout(r, 60));
  });
  R = await leer(p);
  si('★★ RESP_SUPINO_EVENTO queda en sí', R.col.SUPINO_EVENTO);
  no('★★ y el paciente deja de estar en prono', R.col.POS_PRONO);
  eq('★ con su hora', R.col.SUPINO_HORA, '12:00');
  eq('★ y un solo botón', R.botones.length, 1);

  /* ══ 6 · Fuera de VM la franja no existe (decisión de agosto) ═════════ */
  console.log('\n6 · 🔒 Sin VM no hay franja — el prono vigil quedó descartado');
  const sinVM = await p.evaluate(async () => {
    $('fSop').value = 'Ambiente'; cascadeSop();
    if (typeof _gatePronoStrip === 'function') _gatePronoStrip();
    await new Promise(r => setTimeout(r, 60));
    const el = document.getElementById('dPronoStrip');
    return el ? getComputedStyle(el).display !== 'none' : false;
  });
  no('★ con el paciente fuera de VM la franja no se ve', sinVM);

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ prono_un_boton: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ prono_un_boton: un evento, un estado arrastrado, un botón.');
})();
