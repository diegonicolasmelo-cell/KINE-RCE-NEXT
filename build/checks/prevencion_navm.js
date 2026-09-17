// prevencion_navm.js — Guardia del PASO 1 · Prevención de NAVM (17-sep-2026).
//
// POR QUÉ EXISTE. El bloque «Dispositivos» vivía en medio del paso del turno
// con tres calendarios que se escribían a mano y 534 caracteres de párrafo. Esa
// tercera copia de la fecha era una SEGUNDA PUERTA al mismo reloj: la fecha se
// escribía desde el formulario del turno Y desde el evento ➕. Dos puertas a un
// mismo dato es lo que este proyecto ya pagó tres veces (el desajuste 119≠132,
// los nueve escapadores, las dos rutas de la extubación).
//
// El paso nuevo va PRIMERO porque es el orden real del trabajo (Diego,
// 17-sep-2026): «llegas, miras: está con tubo, está ventilado, tiene el cuff
// bien… y después me voy a revisar lo ventilatorio». Si fuera al final se
// completaría de memoria al cerrar la evolución, en vez de mirando al paciente.
//
// 🪤 EL RELOJ VA CONGELADO. El módulo mira fechas («vence hoy», «vence
// mañana»), así que las fechas se INVENTAN y se pasan por parámetro: nunca se
// espera a que el calendario real caiga en el día conveniente. Ya se pagó tres
// veces (el hoyISO sombreado, el arranque de los 30 minutos previos al cambio
// de turno, y tutorial.js rojo del 16 al 20 de septiembre).

const fs = require('fs');
const path = require('path');
const v2 = path.join(__dirname, '..', '..', 'v2');
const idx = fs.readFileSync(path.join(v2, 'index.html'), 'utf8');
const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!okk) fails.push(l);
};

/* ══ A · El camino pasa de tres pasos a cuatro ══════════════════════════ */

const barra = (idx.match(/<div id="spPasos"[\s\S]*?<\/div>\s*<div class="pcontent">/) || [''])[0];
eq('A1 · la barra tiene CUATRO pestañas', (barra.match(/class="paso-t"/g) || []).length, 4);
eq('A2 · la primera es Prevención', /data-p="1"[\s\S]{0,220}?Prevención/.test(barra), true);
eq('A3 · el turno pasó a ser el paso 2', /data-p="2"[\s\S]{0,220}?Turno/.test(barra), true);
eq('A4 · evaluaciones el 3', /data-p="3"[\s\S]{0,220}?Evaluaciones/.test(barra), true);
eq('A5 · el relato el 4', /data-p="4"[\s\S]{0,220}?Relato/.test(barra), true);

// 🪤 LA TRAMPA DE LA RENUMERACIÓN. `pasoIr` reparte las tarjetas por
// `data-paso`, y la que no lo declara «cae en el turno». Mientras el turno fue
// el paso 1 ese default era '1'. Al meter la prevención delante, dejar el '1'
// mandaría TODAS las tarjetas sin dueño (que son casi todas) al paso de
// prevención, y el turno aparecería vacío. El default sigue al TURNO, no al
// número uno.
eq('A6 · 🪤 la tarjeta sin dueño cae en el TURNO (ahora el 2), no en el paso 1',
   /dataset\.paso\s*\|\|\s*'2'/.test(idx), true);
const cuerpoPasoIr = (idx.match(/function pasoIr\(n\)\{[\s\S]{0,400}/) || [''])[0];
eq('A7 · pasoIr acepta hasta el paso 4', /Math\.min\(\s*4\s*,/.test(cuerpoPasoIr), true);

/* ══ B · Una sola puerta al reloj ═══════════════════════════════════════ */

// El payload del turno ya no lleva las fechas de los dispositivos: el cambio
// se registra por el evento que YA existe (svc_eventos.gs), que reinicia el
// reloj en la cama y deja el hito en la línea de tiempo con hora y autor.
eq('B1 · el turno ya NO escribe DISP_HME_FECHA', /DISP_HME_FECHA\s*:\s*v\(/.test(idx), false);
eq('B2 · el turno ya NO escribe DISP_HEPA_FECHA', /DISP_HEPA_FECHA\s*:\s*v\(/.test(idx), false);
// 🪤 El Trach Care NO viaja como DISP_TC_FECHA en el payload del turno: se
// llama VENT_FECHA_SONDA. Medir el nombre bonito daba verde sin haber tocado
// nada — la guardia se veía cumplida antes de existir el código.
eq('B3 · el turno ya NO escribe la fecha del Trach Care', /VENT_FECHA_SONDA\s*:\s*v\(/.test(idx), false);

// La cabecera tenía columna (VENT_CAB_RSS) y un lector en el resumen de NAVM,
// pero NADIE la escribía: el indicador salía siempre vacío. El paso la revive.
eq('B4 · la cabecera ahora SE ESCRIBE (no solo se lee)', /VENT_CAB_RSS\s*:/.test(idx), true);

// 🔴 ANCLAJE, no cambio: estas tres nacen VERDES a propósito y no se vieron
// rojas, porque lo que protegen es que SIGAN verdes ahora que el turno dejó de
// mandar la fecha. CLAUDE.md: «saltarse el paso no puede borrar el reloj de un
// dispositivo instalado». La sincronización a la cama usa val(delTurno, deLaCama),
// que conserva el de la cama cuando el turno llega vacío. Si alguien cambiara
// eso por una asignación directa, un turno sin tocar la prevención BORRARÍA el
// reloj de un filtro instalado, y no se notaría hasta que alguien lo buscara.
const sync = fs.readFileSync(path.join(v2, 'svc_evoluciones.gs'), 'utf8');
eq('B5 · el turno vacío CONSERVA el reloj del HME de la cama',
   /DISP_HME_FECHA:[^\n]*val\(evo\.DISP_HME_FECHA,\s*cama\.DISP_HME_FECHA\)/.test(sync), true);
eq('B6 · …y el del HEPA',
   /DISP_HEPA_FECHA:[^\n]*val\(evo\.DISP_HEPA_FECHA,\s*cama\.DISP_HEPA_FECHA\)/.test(sync), true);
eq('B7 · …y el del Trach Care',
   /DISP_TC_FECHA:[^\n]*val\(evo\.VENT_FECHA_SONDA,\s*cama\.DISP_TC_FECHA\)/.test(sync), true);

/* ══ C · Qué filas aplican — espejo del servidor ════════════════════════ */

const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('c:' + m.text()); });
  await p.addInitScript(() => {
    window._ll = [];
    window.google = { script: { run: { withSuccessHandler(okF) { return { withFailureHandler() { return {
      api(a, d) { window._ll.push({ a, d }); setTimeout(() => okF({ ok: true, data: (a === 'GET_CONFIG_UI' ? { NUM_CAMAS: 12, BANNERS: {} } : null) }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.resolve(v2, 'index.html'));
  await p.waitForTimeout(500);

  const R = await p.evaluate(() => {
    const out = { errores: [] };
    if (typeof prevFilas !== 'function') { out.sinFuncion = true; return out; }

    // 🪤 Reloj congelado: la fecha de referencia se INVENTA y viaja por
    // parámetro. Etiqueta del 15 con frecuencia 2 ⇒ el cambio se ejecuta la
    // madrugada del 17, o sea en el turno cuya fecha es el 16… pero medimos
    // contra el 17 para que el HME salga VENCIDO y el gate tenga algo que
    // bloquear. Nada de esto depende del día en que se corra la batería.
    const REF = '2026-09-17';
    const ctx = (x) => Object.assign({
      va: 'TOT', sop: 'VM', modo: 'ACVC', humid: false, vmTag: 'Vela 1',
      fechas: { hme: '2026-09-15', hepa: '2026-09-16', tc: '2026-09-16' }, ref: REF
    }, x || {});
    const porK = (filas) => { const o = {}; filas.forEach(f => { o[f.k] = f; }); return o; };

    // C1 · paciente intubado, en VM, ventilador sin HEPA fijo
    const a = porK(prevFilas(ctx()));
    out.normal = {
      hme: !!(a.hme && a.hme.pide), hepa: !!(a.hepa && a.hepa.pide), tc: !!(a.tc && a.tc.pide),
      hmeFija: !!(a.hme && a.hme.fija), hepaFija: !!(a.hepa && a.hepa.fija)
    };

    // C2 · humidificación activa: el HME no corresponde y su reloj se apaga
    const h = porK(prevFilas(ctx({ humid: true })));
    out.humid = { hmeAplica: !!(h.hme && h.hme.aplica), hmePide: !!(h.hme && h.hme.pide),
                  tcPide: !!(h.tc && h.tc.pide) };

    // C3 · Puritan Bennett: el HEPA es del equipo. Se MUESTRA (su fecha es la
    // referencia de instalación) pero no pide toque ni bloquea.
    const pb = porK(prevFilas(ctx({ vmTag: 'PB 2' })));
    out.pb = { hepaAplica: !!(pb.hepa && pb.hepa.aplica), hepaFija: !!(pb.hepa && pb.hepa.fija),
               hepaPide: !!(pb.hepa && pb.hepa.pide) };
    const av = porK(prevFilas(ctx({ vmTag: 'Avea 3' })));
    out.avea = { fija: !!(av.hepa && av.hepa.fija), pide: !!(av.hepa && av.hepa.pide) };

    // C4 · sin vía aérea artificial no hay Trach Care; sin VM no hay HEPA
    const nat = porK(prevFilas(ctx({ va: 'Natural', sop: 'Oxigenoterapia/OAF', vmTag: '' })));
    out.natural = { tc: !!(nat.tc && nat.tc.aplica), hepa: !!(nat.hepa && nat.hepa.aplica) };

    // C5 · el chip dice la regla, sin párrafo que la explique
    out.chipHme = (a.hme && a.hme.chip) || '';
    out.chipHepa = (a.hepa && a.hepa.chip) || '';
    return out;
  });

  if (R.sinFuncion) {
    eq('C0 · existe prevFilas(), la ÚNICA que decide qué se pregunta', false, true);
  } else {
    eq('C1 · intubado en VM con equipo común: los tres piden toque',
       R.normal.hme && R.normal.hepa && R.normal.tc, true);
    eq('C2 · con humidificación activa el HME no corresponde…', R.humid.hmeAplica, false);
    eq('C3 · …y por lo tanto no pide toque ni bloquea', R.humid.hmePide, false);
    eq('C4 · …pero el Trach Care sigue pidiéndose', R.humid.tcPide, true);
    eq('C5 · en un Puritan Bennett el HEPA se MUESTRA (su fecha es referencia)', R.pb.hepaAplica, true);
    eq('C6 · …marcado como fijo del equipo', R.pb.hepaFija, true);
    eq('C7 · …y NO pide toque: no se cambia, no se pregunta', R.pb.hepaPide, false);
    eq('C8 · la regla es por prefijo, así que la Avea también', R.avea.fija && !R.avea.pide, true);
    eq('C9 · sin vía aérea artificial no hay Trach Care', R.natural.tc, false);
    eq('C10 · sin VM no hay HEPA', R.natural.hepa, false);
    eq('C11 · el chip dice la regla en dos palabras, no en un párrafo',
       R.chipHme.length > 0 && R.chipHme.length <= 28, true);
  }

  /* ══ D · El gate: obliga, pero se pasa con razón escrita ══════════════ */

  const G = await p.evaluate(() => {
    const out = {};
    if (typeof prevPintar !== 'function' || typeof prevListo !== 'function') { out.sinModulo = true; return out; }
    $('kf').reset(); $('cBed').value = '3';
    // 🪤 misma fecha inventada que arriba: el gate no puede depender del día
    if ($('gDate')) $('gDate').value = '2026-09-17';
    // 🪤 `DB` se declara con `let`, así que NO cuelga de window: asignarle
    // `window.DB` crea otra cosa y la cama queda vacía sin que nada avise.
    // Es la misma trampa que CLAUDE.md documenta para las const y el eval
    // indirecto, y acá dejó la lista de filas en blanco con la guardia en
    // verde en todo lo demás.
    DB = [{ ID_CAMA: '3', VIA_AEREA: 'TOT', SOPORTE: 'VM', VM_TAG: 'Vela 1',
            DISP_HME_FECHA: '2026-09-15', DISP_HEPA_FECHA: '2026-09-16',
            DISP_TC_FECHA: '2026-09-16' }];
    prevPintar();
    out.filas = [...document.querySelectorAll('#pvLista [id^="pvf_"]')].map(e => e.id).join('|');
    out.alInicio = prevListo();
    // 🗂️ 17-sep-2026 · El HME de este escenario está VENCIDO, y desde hoy un
    // filtro vencido no ofrece «vigente»: decir que está vigente algo que
    // venció es una contradicción escrita en la ficha. Se resuelve con «lo
    // cambié», que es lo que de verdad corresponde hacer.
    const tocar = (k, cual) => { const b = $('pvb_' + k + '_' + cual); if (b) b.click(); };
    tocar('hme', 'chg'); tocar('hepa', 'ok'); tocar('tc', 'ok');
    out.trasTocarLosTres = prevListo();
    // se sueltan los tres y se pasa con razón escrita
    tocar('hme', 'chg'); tocar('hepa', 'ok'); tocar('tc', 'ok');
    out.trasSoltar = prevListo();
    if ($('pvNoPude')) $('pvNoPude').click();
    if ($('fPrevRazon')) {
      $('fPrevRazon').value = 'Paciente en pabellón todo el turno; no hubo ventana.';
      $('fPrevRazon').dispatchEvent(new Event('input'));
    }
    out.conRazon = prevListo();
    // cabecera y cuff son OPCIONALES: no tocarlos nunca bloquea
    out.cabOpcional = prevListo();
    out.hayCabecera = !!$('pvb_cab_ok') && !!$('pvb_cab_chg');
    out.hayCuff = !!$('cuffB1') && !!$('cuffB2') && !!$('cuffB3');
    // el cuff se MUDÓ: su tarjeta vive ahora en el paso 1
    const cuffCard = $('dCuff') && $('dCuff').closest('[data-paso]');
    out.cuffEnPaso1 = cuffCard ? cuffCard.dataset.paso : '(sin dueño)';
    return out;
  });

  if (G.sinModulo) {
    eq('D0 · existen prevPintar() y prevListo()', false, true);
  } else {
    eq('D1 · se dibujan las tres filas que aplican', G.filas, 'pvf_hme|pvf_hepa|pvf_tc');
    eq('D2 · sin tocar nada, el paso NO deja avanzar', G.alInicio, false);
    eq('D3 · tocadas las tres, deja avanzar', G.trasTocarLosTres, true);
    eq('D4 · al soltarlas vuelve a bloquear', G.trasSoltar, false);
    eq('D5 · 🔴 con razón escrita se pasa igual (bloquear de verdad hace que se invente una fecha)',
       G.conRazon, true);
    eq('D6 · cabecera y cuff NO bloquean: su omisión ES el dato del cumplimiento',
       G.cabOpcional, true);
    eq('D7 · la cabecera tiene sus dos botones', G.hayCabecera, true);
    eq('D8 · el cuff conserva sus tres estados de un toque', G.hayCuff, true);
    eq('D9 · el cuff se mudó al paso 1 (ya no vive en Respiratorio)', G.cuffEnPaso1, '1');
  }

  /* ══ E · Sin párrafos: el ruido que se vino a cortar ══════════════════ */

  const E = await p.evaluate(() => {
    const card = document.getElementById('fcPrevNavm');
    if (!card) return { sinTarjeta: true };
    // Todo el texto que NO es etiqueta de control: si vuelve a haber párrafos,
    // el paso nuevo pasa a ser la pantalla más ruidosa de la app.
    let n = 0;
    card.querySelectorAll('p, .ayuda, .nota').forEach(e => { n += (e.textContent || '').trim().length; });
    return { sinTarjeta: false, caracteresDeParrafo: n };
  });
  if (E.sinTarjeta) eq('E1 · existe la tarjeta #fcPrevNavm', false, true);
  else eq('E1 · 🔴 el paso no trae párrafos explicativos (hoy Dispositivos tiene 534 caracteres)',
          E.caracteresDeParrafo <= 120, true);

  /* ══ V · «Vigente» y «lo cambié» NO son lo mismo ═════════════════════
     Diego, 17-sep-2026: «si vence mañana y uno aprieta vigente, quiere decir
     que vence mañana, o sea que todavía está vigente; no es que lo cambié».
     Son dos hechos distintos y el reloj tiene que reflejarlo:
       · «vigente»   → lo miré, está bien. El reloj NO se toca.
       · «lo cambié» → hay dispositivo nuevo. El reloj se reinicia.
     Si los dos se leyeran igual, el indicador de NAVM contaría como cambio un
     filtro que nadie tocó, y el reloj del siguiente vencimiento saldría
     corrido. 🔴 Y «vigente» no puede ofrecerse en un filtro VENCIDO: decir que
     está vigente algo que venció es una contradicción escrita en la ficha. */
  const V2 = await p.evaluate(() => {
    const leer = (k) => {
      const c = document.getElementById('pvc_' + k);
      const f = document.getElementById('pvf_' + k);
      return { chip: c ? c.textContent : '(sin chip)',
               ok: !!document.getElementById('pvb_' + k + '_ok'),
               chg: !!document.getElementById('pvb_' + k + '_chg'),
               urge: !!f && f.className.indexOf('pv-urge') !== -1 };
    };
    // La cama del escenario: HME etiquetado el 15 con frecuencia 2 y fecha de
    // turno el 17 ⇒ venció. El HEPA y el Trach Care vencen mañana.
    prevPintar();
    const out = { hepaAntes: leer('hepa'), hmeAntes: leer('hme') };
    // «Vigente» en el que vence MAÑANA: el reloj no se mueve.
    const b = document.getElementById('pvb_hepa_ok'); if (b) b.click();
    out.hepaTrasVigente = leer('hepa');
    out.marcaHepa = prevEstado().hepa;
    // «Lo cambié» en el mismo: ahí sí queda dicho que hay uno nuevo.
    const c = document.getElementById('pvb_hepa_chg'); if (c) c.click();
    out.hepaTrasCambio = leer('hepa');
    out.marcaHepaChg = prevEstado().hepa;
    return out;
  });
  eq('V1 · el HEPA vence mañana', V2.hepaAntes.chip, 'vence mañana');
  eq('V2 · ★ tocando «vigente», el reloj NO se mueve: sigue venciendo mañana',
     V2.hepaTrasVigente.chip, 'vence mañana');
  eq('V3 · …y la marca dice «vigente», no «cambiado»', V2.marcaHepa, 'ok');
  eq('V4 · ★★ tocando «lo cambié», el reloj sí lo dice', V2.hepaTrasCambio.chip, 'cambiado en este turno');
  eq('V5 · …y la marca lo distingue', V2.marcaHepaChg, 'chg');
  eq('V6 · 🔴 en un filtro VENCIDO no se ofrece decir que está vigente',
     V2.hmeAntes.ok, false);
  eq('V7 · …pero sí «lo cambié»', V2.hmeAntes.chg, true);

  /* ══ S · Y el servidor hace la misma distinción ═══════════════════════ */
  {
    const sync = fs.readFileSync(path.join(v2, 'svc_evoluciones.gs'), 'utf8');
    const cuerpo = (sync.match(/const _navm = [\s\S]{0,220}/) || [''])[0];
    eq('S1 · ★ solo la marca «chg» reinicia el reloj en la cama',
       /=== 'chg'/.test(cuerpo), true);
    eq('S2 · …y «ok» deja pasar lo que ya había', /: actual/.test(cuerpo), true);
  }

  /* ══ G · Ningún campo de fecha visible en el turno ═══════════════════
     🔴 Al cortar la segunda puerta, los tres calendarios quedaron en pantalla
     SIN guardar nada. Un campo que se ve, se llena y no va a ninguna parte es
     peor que no tenerlo: el colega cree que registró el cambio de filtro y no
     registró nada.
     🗂️ 17-sep-2026 · La tarjeta que los alojaba SALIÓ ENTERA del turno junto
     con la humidificación activa (Diego: «eso ya está declarado al comienzo»).
     Los campos siguen en el DOM, en un contenedor oculto, porque son la única
     representación que el resto del código consulta — pero no se ven, y el
     único mando es el paso 1. */
  const V = await p.evaluate(() => {
    pasoIr(2);
    const vis = (id) => { const e = $(id); return !!e && !!e.offsetParent; };
    const r = { hme: vis('fFecHME'), hepa: vis('fFecHEPA'), tc: vis('fFecSonda'),
                humid: vis('fFecHumid'), casilla: vis('cHAct'),
                existen: !!$('fFecHME') && !!$('cHAct'), enPaso: PASO_ACTUAL };
    pasoIr(1);
    return r;
  });
  eq('G0 · la medición se hizo parada en el paso del turno', V.enPaso, 2);
  eq('G1 · el calendario del HME no se ve', V.hme, false);
  eq('G2 · ni el del HEPA', V.hepa, false);
  eq('G3 · ni el del Trach Care', V.tc, false);
  eq('G4 · ni la fecha de la humidificación', V.humid, false);
  eq('G5 · ni su casilla: el único mando es el selector del paso 1', V.casilla, false);
  eq('G6 · …pero los campos SIGUEN existiendo (el resto del código los lee)',
     V.existen, true);

  /* ══ H · La humidificación activa se declara UNA vez ══════════════════
     Diego: «saca la humidificación activa del turno, ya que eso ya está
     declarado al comienzo». Tenía una tarjeta propia en el paso del turno —con
     su casilla y su fecha— y a la vez el selector del paso 1. Dos sitios para
     decir el mismo hecho clínico: el que llenara el segundo pisaba al primero,
     y ninguno de los dos avisaba.
     🔴 Sacar la tarjeta NO puede hacer que el dato deje de guardarse: el
     selector del paso 1 es ahora quien lo escribe. */
  const H = await p.evaluate(async () => {
    const out = {};
    out.tarjetaEnTurno = !!document.getElementById('fcDisp');
    pasoIr(1);
    // Al elegir humidificación activa, se fecha (es estado del episodio).
    prevHumid(true);
    await new Promise(r => setTimeout(r, 60));
    out.trasActivar = { fecha: v('fFecHumid'), casilla: !!$('cHAct') && $('cHAct').checked };
    // Y al volver al HME se suelta: el filtro vuelve a correr.
    prevHumid(false);
    await new Promise(r => setTimeout(r, 60));
    out.trasSoltar = { fecha: v('fFecHumid'), casilla: !!$('cHAct') && $('cHAct').checked };
    return out;
  });
  eq('H1 · ★ la tarjeta de humidificación salió del turno', H.tarjetaEnTurno, false);
  // 🪤 La fecha es la EFECTIVA del turno, no «hoy» a secas: en turno Día es el
  // mismo día; en Noche, el siguiente, porque la noche transcurre casi entera
  // en él. Es el mismo criterio del evento ➕ y de autoFechasDispositivos, y
  // este escenario es de día.
  eq('H2 · ★★ elegir «humidificación activa» en el paso 1 la fecha',
     H.trasActivar.fecha, '2026-09-17');
  eq('H3 · …y deja marcada la casilla que el resto del código consulta',
     H.trasActivar.casilla, true);
  eq('H4 · ★ volver al filtro HME la suelta', H.trasSoltar.fecha, '');
  eq('H5 · …y desmarca la casilla', H.trasSoltar.casilla, false);

  /* 🔴 Y una cama que YA viene con humidificación activa abre en esa posición:
     si el selector arrancara siempre en «Filtro HME», el paso pediría cambiar
     un filtro que se retiró. */
  const H2 = await p.evaluate(async () => {
    DB = [{ ID_CAMA: '3', VIA_AEREA: 'TOT', SOPORTE: 'VM', VM_TAG: 'Vela 1',
            DISP_HUMID_FECHA: '2026-09-14', DISP_HEPA_FECHA: '2026-09-16',
            DISP_TC_FECHA: '2026-09-16' }];
    if (typeof prevSembrar === 'function') prevSembrar();
    prevPintar();
    return { humid: prevEstado().humid,
             hayFilaHme: !!document.getElementById('pvf_hme') };
  });
  eq('H6 · 🔴 una cama con humidificación activa abre en esa posición', H2.humid, true);
  eq('H7 · …y no se pide el filtro HME, que está retirado', H2.hayFilaHme, false);

  /* 🔴 Una humidificación que YA estaba activa conserva su fecha de inicio: es
     desde cuándo la lleva el paciente, no desde cuándo se abrió el formulario.
     🪤 Esto casi me hace «arreglar» algo que estaba bien: el escenario de
     arriba dejó puesta una cama con humidificación del 14, y la prueba del
     turno noche devolvía esa fecha en vez del día siguiente. No era un fallo
     del código — era el código haciendo lo correcto con la cama equivocada. */
  const H3 = await p.evaluate(async () => {
    prevHumid(true);
    await new Promise(r => setTimeout(r, 60));
    return v('fFecHumid');
  });
  eq('H8 · 🔴 la que ya venía activa conserva su fecha de inicio', H3, '2026-09-14');

  // 🪤 Y una NUEVA en turno Noche se fecha el día siguiente: la noche
  // transcurre casi entera en él. Es la regla de la unidad.
  const H4 = await p.evaluate(async () => {
    DB = [{ ID_CAMA: '3', VIA_AEREA: 'TOT', SOPORTE: 'VM', VM_TAG: 'Vela 1' }];
    prevSembrar();
    const antes = (typeof SHIFT !== 'undefined') ? SHIFT : 'Dia';
    SHIFT = 'Noche';
    prevHumid(true);
    await new Promise(r => setTimeout(r, 60));
    const f = v('fFecHumid');
    SHIFT = antes; prevHumid(false);
    return f;
  });
  eq('H9 · 🪤 una nueva, en turno Noche, se fecha el día siguiente', H4, '2026-09-18');

  eq('F1 · la pantalla no tira errores', errs.join(' | ') || '(ninguno)', '(ninguno)');

  await b.close();
  if (fails.length) {
    console.log('\n❌ prevencion_navm: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ prevencion_navm: el paso de prevención se comporta como se acordó.');
})();
