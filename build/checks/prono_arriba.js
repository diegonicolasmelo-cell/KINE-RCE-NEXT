// prono_arriba.js — La franja del prono va ARRIBA, se ve en la tarjeta, y
// pronar y supinar caben en el mismo turno (19-sep-2026).
//
// TRES COSAS QUE PIDIÓ DIEGO, y una cuarta que decidió NO pedir.
//
//  1. «Sube la franja a la primera fila.» Venía al final del bloque
//     respiratorio, después de todos los parámetros del ventilador: en el
//     teléfono, scroll. El prono es un estado del paciente que dura días, como
//     la vía aérea y el soporte — va donde van ellos.
//
//  2. «Si muestra.» El prono en curso se ve en la TARJETA de la cama, con las
//     horas, sin abrir la evolución. La entrega de turno ya lo escribía; la
//     tarjeta no.
//
//  3. «Podría ser que se marquen prono y la hora y aparezca botón supino
//     inmediatamente.» Antes, tras pronar el botón ofrecía «Deshacer» y no
//     había forma de supinar en el mismo turno — un prono que no se tolera y
//     se revierte a las dos horas no se podía registrar entero.
//     🔵 EL SERVIDOR YA LO SOPORTABA: `_pronoSellarCiclo` dice «si se pronó y
//     supinó en el mismo turno, el inicio es el de esta misma fila». La
//     limitación era solo de la pantalla.
//
//  4. 🔒 «No hay corte.» No existe un número de horas que dispare un aviso, así
//     que NO se inventa uno. Esta guardia lo fija midiendo que el chip se vea
//     IGUAL con 5 horas que con 40: si alguien —yo en tres meses— le pone un
//     umbral de colores, se pone roja y hay que venir a leer esto.
//
// 🪤 EL RELOJ VA CONGELADO: fecha inventada, SHIFT forzado y las horas de los
// eventos puestas a mano.

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
    window.google = { script: { run: { withSuccessHandler(okF) { return { withFailureHandler() { return {
      api(a) { setTimeout(() => okF({ ok: true, data: (a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null) }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.resolve(V2, 'index.html'));
  await p.waitForTimeout(600);

  /* ══ 1 · La franja va arriba ══════════════════════════════════════════ */
  console.log('\n1 · 🔴 «Sube la franja a la primera fila»');
  const orden = await p.evaluate(async () => {
    $('kf').reset(); $('gDate').value = '2026-08-10'; SHIFT = 'Dia';
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM' }];
    renderGrid(); abrirPanel('3', false, false);
    await new Promise(r => setTimeout(r, 380));
    if (typeof pasoIr === 'function') pasoIr(2);
    await new Promise(r => setTimeout(r, 140));
    $('fVA').value = 'TOT'; cascadeVA();
    $('fSop').value = 'VM'; cascadeSop();
    await new Promise(r => setTimeout(r, 120));
    // Posición en el DOM: 4 = el nodo va DESPUÉS del de referencia.
    const pos = (a, bb) => {
      const x = document.getElementById(a), y = document.getElementById(bb);
      if (!x || !y) return 'falta ' + (x ? bb : a);
      return (x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING) ? 'antes' : 'después';
    };
    const tope = el => Math.round(document.getElementById(el).getBoundingClientRect().top);
    return {
      vsTubo:  pos('dPronoStrip', 'dVADet'),      // el tubo y la cánula
      vsModo:  pos('dPronoStrip', 'fModo'),       // los parámetros del ventilador
      masArribaQueElTubo: tope('dPronoStrip') < tope('dVADet')
    };
  });
  eq('★★ la franja va ANTES del tubo y la cánula', orden.vsTubo, 'antes');
  eq('★★ …y antes de los parámetros del ventilador', orden.vsModo, 'antes');
  si('★ y en pantalla queda más arriba que el tubo', orden.masArribaQueElTubo);

  /* ══ 2 · Tras pronar, «Supinar» de inmediato ══════════════════════════ */
  console.log('\n2 · 🔴 «Que aparezca botón supino inmediatamente»');
  const tras = await p.evaluate(async () => {
    window._pronoAbierto = '';
    pronoAccion();                                   // Pronar
    $('fPronoHora').value = '08:00';                 // 🪤 hora a mano
    pronoPintar();
    await new Promise(r => setTimeout(r, 60));
    const vis = el => { if (!el) return false; const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && !!(r.width || r.height); };
    return {
      boton: $('btnProno').textContent.trim(),
      hayDeshacer: !!document.getElementById('btnPronoDeshacer') && vis(document.getElementById('btnPronoDeshacer'))
    };
  });
  si('★★ el botón pasa a «Supinar» al tiro', /supinar/i.test(tras.boton));
  si('★ y queda una salida para deshacer si fue un error', tras.hayDeshacer);

  /* ══ 3 · Pronar y supinar en el MISMO turno ═══════════════════════════ */
  console.log('\n3 · 🔴 Un prono que no se tolera y se revierte el mismo turno');
  const mismo = await p.evaluate(async () => {
    pronoAccion();                                   // Supinar
    $('fSupinoHora').value = '10:00';                // 🪤 hora a mano
    pronoPintar();
    await new Promise(r => setTimeout(r, 60));
    return {
      PRONO_EVENTO:  !!$('cPronoEv')?.checked,
      SUPINO_EVENTO: !!$('cSupino')?.checked && !!$('cSupinoEv')?.checked,
      POS_PRONO:     !!$('cProno')?.checked,
      horaP: v('fPronoHora'), horaS: v('fSupinoHora'),
      ciclo: _pronoHorasCiclo()
    };
  });
  si('★★ el evento de pronación SOBREVIVE a la supinación', mismo.PRONO_EVENTO);
  si('★★ y el de supinación también', mismo.SUPINO_EVENTO);
  no('★ el paciente queda supino al cerrar el turno', mismo.POS_PRONO);
  eq('★ con sus dos horas', mismo.horaP + ' → ' + mismo.horaS, '08:00 → 10:00');
  eq('★★ y el ciclo se cierra en 2 horas, no en blanco', mismo.ciclo, 2);

  /* ══ 4 · El prono se ve en la tarjeta de la cama ══════════════════════ */
  console.log('\n4 · 🔴 «Si muestra» — el chip en la tarjeta');
  const tarjeta = await p.evaluate(async () => {
    cerrarPanel && cerrarPanel();
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM',
            PRONO_DESDE: '2026-08-09 21:30' }];
    renderGrid();
    await new Promise(r => setTimeout(r, 160));
    const card = document.querySelector('[data-cama="3"], #cama3, .cama[data-id="3"]') ||
                 [...document.querySelectorAll('.cam,.cama,.bed')].find(e => /\b3\b/.test(e.textContent));
    const txt = document.getElementById('grid') ? document.getElementById('grid').innerText : document.body.innerText;
    return { texto: txt.replace(/\s+/g, ' ') };
  });
  si('★★ la tarjeta dice que está en prono', /en prono/i.test(tarjeta.texto));
  si('★★ …y con las horas, que es lo que decide cuándo supinar', /\d+([.,]\d+)?\s*h/.test(tarjeta.texto));

  /* ══ 5 · No hay corte de horas: nadie inventa un umbral ═══════════════ */
  console.log('\n5 · 🔒 «No hay corte» — el chip se ve igual con 5 h que con 40 h');
  const corte = await p.evaluate(async () => {
    const pinta = async (desde) => {
      DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', VIA_AEREA: 'TOT', SOPORTE: 'VM', PRONO_DESDE: desde }];
      renderGrid();
      await new Promise(r => setTimeout(r, 140));
      const chip = [...document.querySelectorAll('.abadge')].find(e => /en prono/i.test(e.textContent));
      if (!chip) return null;
      const cs = getComputedStyle(chip);
      return cs.color + '|' + cs.backgroundColor + '|' + cs.borderColor;
    };
    const d = new Date();
    const menos = (h) => { const x = new Date(d.getTime() - h * 3600000);
      const z = n => String(n).padStart(2, '0');
      return `${x.getFullYear()}-${z(x.getMonth() + 1)}-${z(x.getDate())} ${z(x.getHours())}:${z(x.getMinutes())}`; };
    return { corto: await pinta(menos(5)), largo: await pinta(menos(40)) };
  });
  si('   el chip existe en los dos casos', corte.corto && corte.largo);
  eq('★★ y se ve EXACTAMENTE igual (ningún umbral inventado)', corte.corto, corte.largo);

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ prono_arriba: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ prono_arriba: arriba, en la tarjeta, y sin umbrales inventados.');
})();
