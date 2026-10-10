// estado_del_bloque.js — EL ESTADO DE CADA BLOQUE SE CALCULA DE LOS DATOS (tanda 3 · cambio 4 del plan de limpieza del
// registro de evolución, oct-2026).
//
// EL FALLO. El encabezado de cada tarjeta del celular decía «✓ / — / !» con `_mResumen`, un scrape genérico: copiaba hasta cuatro
// controles <input>/<select>/<textarea> que se vieran y se saltaba el resto. Lo que no es uno de esos tres controles no existía
// para él, y un bloque CON datos podía decir «— sin registrar». Medido en Chromium a 390 px antes de tocar nada:
//   · «Eventos de vía aérea» tras responder la PVE «Sí»  → «— sin registrar»  (la respuesta vive en <input type=hidden id=fPVEval>
//     y en el style de un botón);
//   · «Eventos de vía aérea» tras declarar la decanulación → «— sin registrar» (la casilla «Ocurrió…» es display:none);
//   · un 0 tecleado (PEEP 0, PS 0, PAM 0) → «sin registrar»: el scrape tiraba todo '0' pensando en los desplegables sin elegir;
//   · el prono, las secreciones (los botones − + ++ +++), la fase clínica, los sedantes y los procedimientos añadidos a mano.
// Y la regla transversal del proyecto dice lo contrario: un 0 se guarda como 0, y vacío no es 0.
//
// LO QUE ESTA GUARDIA FIJA.
//   1. Existe `estadoBloque(contenedor)` → { estado: 'sin'|'reg'|'rev', resumen, falta } y la constante ÚNICA de palabras
//      `ESTADO_PALABRAS` = «Sin registrar» / «Registrado» / «Requiere revisión».
//   2. 'rev' = hay un elemento de `_obligatoriosPendientes()` DENTRO del bloque (la misma regla del «!» de siempre) y `falta` es
//      ese elemento. Hemodinamia vacía → 'rev'; llena → 'reg'.
//   3. 'reg' = hay un dato: un control a la vista con valor (incluido el 0 de un <input>), una casilla marcada, o una FUENTE que
//      no es un control a la vista y el bloque declara en `data-fuentes` (la PVE respondida, un evento de vía aérea declarado,
//      el prono, las secreciones, la fase, los sedantes, los procedimientos). 'sin' = nada de eso.
//   4. Un 0 de un <select> NO es dato (la KTR nace en 0 y no tiene opción en blanco: «decisión 4» de Diego, aún abierta).
//   5. LO HEREDADO CUENTA COMO «Registrado», igual que hoy: lo que la réplica del turno anterior deja puesto por código no se
//      distingue de lo tecleado (marcar lo heredado es la decisión 2, pendiente de Diego). Se mide poniendo un valor por código.
//   6. La función SOLO LEE: ningún valor del formulario cambia por calcularla.
//   7. COBERTURA ESTRUCTURAL: todo <input type=hidden> y todo botón de las tarjetas del Turno aparece en algún `data-fuentes` (o
//      cuelga de un elemento que lo declara), o está en la lista de EXENTOS de esta guardia CON SU MOTIVO. Es la red para el
//      widget que se agregue mañana: si no se declara, vuelve a contarse como vacío, y esta guardia lo caza.
//   8. En el celular los encabezados (✓ / — / !) salen de la MISMA función: los falsos «—» de arriba pasan a ✓.
//
// 🪤 Reloj congelado: lunes 10-ago-2026 11:00 (fuera de las ventanas trampa: Fiestas Patrias, cierre de año, cumpleaños y la media
// hora previa al cambio de turno). Se inventa la fecha, no se espera. Solo datos ficticios.
//
// Uso: node build/checks/estado_del_bloque.js
const path = require('path');
const { chromium } = require('playwright-core');
const v2 = path.join(__dirname, '..', '..', 'v2');

const PALABRAS = { sin: 'Sin registrar', reg: 'Registrado', rev: 'Requiere revisión' };

/* Lo que NO es una fuente de dato, con su motivo. Agregar una línea acá es una decisión consciente: "este <input type=hidden>
   o este botón no es un dato que el kinesiólogo ponga". Si un widget NUEVO guarda un dato, se declara en `data-fuentes`. */
const EXENTOS_HIDDEN = {
  fAislMicroVal: 'compatibilidad del aislamiento: sin interfaz en el Turno (la tarjeta General se disolvió)',
  fCoop: 'derivado del S5Q (un <select> a la vista que ya cuenta): lo escribe el programa, no la persona',
  cExtOcurrio: 'espejo de #fPVEval ("true" salvo en "no corresponde"): lo escribe hPVEtoggle, no la persona',
  fIntubSopPrevio: 'foto del soporte previo: la toma el programa al declarar un evento, no la persona',
  fDiasVAA: 'contador calculado de días de vía aérea artificial',
  fVAExtDias: 'contador calculado',
  fDiasVA: 'contador calculado de días de vía aérea',
  fPronoTs: 'marca de hora del prono: la escribe hPosEspecial; el prono lo cubre la fuente @prono',
  fSupinoTs: 'marca de hora del supino: la escribe pronoAccion; el prono lo cubre la fuente @prono',
  fCultFechas: 'fechas del cultivo: las escribe el programa al marcar la técnica; el cultivo lo cubren sus casillas',
};
const EXENTOS_BOTON = [
  { sel: '.ev-va', motivo: 'declarar un evento de vía aérea marca la casilla de SU bloque (cTqtO, cDecanOcurrio, cIntubO, cReintubT) o responde la PVE; esas fuentes las declara cada bloque' },
  { sel: '[onclick="addRuidoRow()"]', motivo: 'acción: agrega una fila; el dato queda en los <select> de la fila, que ya cuentan' },
  { sel: '[onclick="addProc()"]', motivo: 'acción: agrega un procedimiento a la lista; la lista la cubre @procs' },
  { sel: '#bPosToggle', motivo: 'acción: abre y cierra el cuerpo del posicionamiento; sus casillas cuentan aunque esté plegado' },
];

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');
/* Una función que todavía no existe no puede tumbar la guardia con una excepción: tiene que salir como un fallo con nombre. */
const seguro = async (p, fn, arg) => { try { return await p.evaluate(fn, arg); } catch (e) { return { __error: String(e && e.message || e).split('\n')[0] }; } };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const errs = [];

  for (const ancho of [1200, 390]) {
    const movil = ancho === 390;
    console.log('\n══════ pantalla de ' + ancho + ' px ══════');
    const p = await b.newPage({ viewport: { width: ancho, height: movil ? 844 : 900 }, locale: 'es-CL', isMobile: movil, hasTouch: movil });
    p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => {
      const FIJA = new Date(2026, 7, 10, 11, 0, 0).getTime(), RD = Date;
      function FD(...a) { if (!new.target) return new RD(FIJA).toString(); return a.length ? new RD(...a) : new RD(FIJA); }
      FD.prototype = RD.prototype; FD.now = () => FIJA; FD.UTC = RD.UTC; FD.parse = RD.parse; window.Date = FD;
      window._ll = [];
      window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
        api(a, d) { window._ll.push({ a, d }); let data = null; if (a === 'GET_CONFIG_UI') data = { NUM_CAMAS: 12, BANNERS: {} };
          else if (a === 'GET_EVO_TURNO') data = { actual: null, previa: null, pronoAbierto: '' };
          setTimeout(() => ok({ ok: true, data }), 5); } }; } }; } } } };
    });
    await p.goto('file://' + path.join(v2, 'index.html'));
    await p.waitForTimeout(800);
    await p.evaluate(() => {
      window._card = re => [...document.querySelectorAll('#kf .fcard')].find(c => re.test((c.querySelector('.fcard-title') || {}).textContent || ''));
      /* Los bloques que se miden, por nombre. Los cuerpos de los sub-bloques del celular (msub-b) son bloques de verdad. */
      window._bl = k => ({
        fase: () => document.getElementById('fcFase'), sed: () => _card(/Sedaci/), hemo: () => _card(/Hemodinamia/),
        ausc: () => _card(/Auscultaci/), resp: () => document.getElementById('fcRespCard'), proc: () => _card(/Procedimientos/),
        prono: () => document.getElementById('dPronoStrip'), pve: () => document.getElementById('dExtSec'),
        decan: () => document.getElementById('dDecanSec'), tqt: () => document.getElementById('dTqtSec'),
        vent: () => document.getElementById('dVentBloque'), man: () => document.getElementById('fKTRcnt').closest('.sub-sec'),
        msVent: () => document.querySelector('#msVent .msub-b'), msEvt: () => document.querySelector('#msEvt .msub-b'),
        msMan: () => document.querySelector('#msMan .msub-b'),
      })[k]();
      window._est = k => { try { const r = estadoBloque(_bl(k)); return { estado: r.estado, resumen: r.resumen, falta: r.falta ? (r.falta.id || '?') : null }; }
        catch (e) { return { error: String(e && e.message || e) }; } };
      window._glifo = id => { const s = document.getElementById(id), g = s && s.querySelector('.msub-h .mst'); return g ? g.textContent : null; };
    });

    /* Abre el turno de la cama 3 desde cero. `va`/`sop`: la vía aérea y el soporte con que llegó. `sinHdn`: la hemodinamia en blanco. */
    const abrir = (o) => p.evaluate(async x => {
      $('kf').reset(); $('gDate').value = '2026-08-10'; SHIFT = 'Dia';
      window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
      DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', VIA_AEREA: x.va || 'TOT', SOPORTE: x.sop || 'VM',
        FECHA_INGRESO: '2026-08-03', TS_INGRESO: '2026-08-03 23:00:00', FECHA_INICIO_VA: '2026-08-06', TS_INICIO_VA: '2026-08-06 10:00:00',
        FECHA_INICIO_SOPORTE: '2026-08-06', TS_INICIO_SOPORTE: '2026-08-06 10:00:00' }];
      window.recargarSilencioso = () => {}; window._ll.length = 0; renderGrid(); abrirPanel('3', false, false);
      await new Promise(r => setTimeout(r, 800));
      if (document.getElementById('msEvt')) M_SUBS.forEach(c => { const bb = document.getElementById(c.id); if (bb) bb.classList.toggle('cerrado', !c.abierto); });
      $('fFirma').appendChild(Object.assign(document.createElement('option'), { value: 'K.T.', textContent: 'K.T.' })); $('fFirma').value = 'K.T.';
      if (!x.sinHdn) { $('fHEst').value = 'Estable'; $('fDVA').value = 'Sin requerimientos'; }
      PROCS.length = 0; FASES_SEL = new Set(); window._pronoAbierto = false; _transAvisoOk = true;
      pasoIr(2); rielRender();
      await new Promise(r => setTimeout(r, 300));
    }, o);
    const est = k => p.evaluate(x => _est(x), k);
    const ejecuta = (fn) => p.evaluate(async f => { new Function('return (' + f + ')')()(); rielRender(); await new Promise(r => setTimeout(r, 380)); }, fn.toString());
    const palabra = (l, got, w) => { eq(l + ' (estado)', got.error ? 'ERROR: ' + got.error : got.estado, w); };

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n1 · 🔴 Existe la función única y la constante única de palabras');
    const c0 = await p.evaluate(() => ({
      fn: typeof estadoBloque, pal: typeof ESTADO_PALABRAS !== 'undefined' ? JSON.stringify(ESTADO_PALABRAS) : null,
      fuentes: typeof ESTADO_FUENTES !== 'undefined' ? Object.keys(ESTADO_FUENTES).sort().join(',') : null }));
    eq('estadoBloque es una función', c0.fn, 'function');
    eq('★ las tres palabras viven en UNA constante (ESTADO_PALABRAS) y son las del plan', c0.pal, JSON.stringify(PALABRAS));
    eq('las fuentes que no son un control a la vista viven en UNA tabla (ESTADO_FUENTES)', c0.fuentes, 'fase,procs,prono,sedantes');

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n2 · Recién abierto el turno (tubo + VM, firma puesta, hemodinamia en blanco)');
    await abrir({ sinHdn: true });
    palabra('Auscultación vacía', await est('ausc'), 'sin');
    palabra('Fase clínica sin fase elegida', await est('fase'), 'sin');
    palabra('Procedimientos sin nada marcado', await est('proc'), 'sin');
    palabra('el prono: supino de partida', await est('prono'), 'sin');
    palabra('Manejo respiratorio con la KTR en 0 (un 0 de <select> no es dato)', await est('man'), 'sin');
    const h0 = await est('hemo');
    palabra('★ Hemodinamia en blanco → requiere revisión', h0, 'rev');
    eq('…y lo que falta es el estado de la hemodinamia', h0.falta, 'fHEst');
    palabra('★ Respiratorio con la PVE sin responder → requiere revisión', await est('resp'), 'rev');
    const e0 = await est('pve');
    palabra('…y el bloque de la PVE también', e0, 'rev');
    eq('…y lo que falta es la PVE', e0.falta, 'fPVEval');
    palabra('Sedación: la opción «Sin sedación» ya viene elegida (como hoy: cuenta)', await est('sed'), 'reg');
    const r0 = await seguro(p, () => { const r = estadoBloque(_bl('ausc')); return { claves: Object.keys(r).sort().join(','), tipo: typeof r.resumen }; });
    eq('la forma del resultado: estado, resumen (texto) y falta', r0.__error ? 'ERROR: ' + r0.__error : r0.claves + '|' + r0.tipo, 'estado,falta,resumen|string');
    if (movil) {
      palabra('sub-bloque «Ventilación» (VM · ACVC)', await est('msVent'), 'reg');
      palabra('sub-bloque «Eventos de vía aérea»: falta la PVE', await est('msEvt'), 'rev');
      palabra('sub-bloque «Manejo respiratorio» vacío', await est('msMan'), 'sin');
    }

    console.log('\n3 · Hemodinamia llena → registrado');
    await ejecuta(() => { $('fHEst').value = 'Estable'; $('fDVA').value = 'Sin requerimientos'; });
    const h1 = await est('hemo');
    palabra('★ con estado y DVA puestos', h1, 'reg');
    si('…y el resumen dice lo que hay', /Estable/.test(h1.resumen || ''));
    eq('…y ya no falta nada', h1.falta, null);
    await ejecuta(() => { $('fDVA').value = ''; });
    palabra('con solo el estado puesto sigue pendiente', await est('hemo'), 'rev');

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n4 · 🔴 FUENTES QUE NO SON UN CONTROL A LA VISTA (el falso «sin registrar» de siempre)');
    await abrir({});
    await ejecuta(() => hPVEtoggle('si'));
    palabra('★★ PVE respondida «Sí» (vive en un <input type=hidden> y en el estilo de un botón) → registrado', await est('pve'), 'reg');
    palabra('★★ …y el bloque de la PVE ya no pide nada', await est('pve'), 'reg');
    if (movil) {
      palabra('★★ …y el sub-bloque «Eventos de vía aérea» deja de decir «sin registrar»', await est('msEvt'), 'reg');
      eq('★★ …y su encabezado del celular pasa de «—» a «✓» (sale de la misma función)', await p.evaluate(() => _glifo('msEvt')), '✓');
    }
    await ejecuta(() => hPVEtoggle('si'));
    palabra('deseleccionar la PVE la devuelve a pendiente', await est('pve'), 'rev');

    await abrir({});
    palabra('el prono: supino de partida', await est('prono'), 'sin');
    await ejecuta(() => pronoAccion());
    palabra('★★ prono declarado hoy (cajas escondidas con display:none) → registrado', await est('prono'), 'reg');
    await ejecuta(() => pronoDeshacer());
    palabra('…y «deshacer» lo devuelve a sin registrar', await est('prono'), 'sin');
    await ejecuta(() => { window._pronoAbierto = true; pronoPintar(); });
    palabra('★★ el prono que VIENE arrastrado del turno anterior también cuenta (como todo lo heredado)', await est('prono'), 'reg');
    await ejecuta(() => { window._pronoAbierto = false; $('cProno').checked = false; pronoPintar(); });

    await abrir({});
    await ejecuta(() => hSecrQty('++'));
    palabra('★★ cantidad de secreciones (botones − + ++ +++ sobre un <input type=hidden>) → registrado', await est('man'), 'reg');
    if (movil) {
      palabra('★★ …y el sub-bloque «Manejo respiratorio» deja de decir «sin registrar»', await est('msMan'), 'reg');
      eq('★★ …y su encabezado pasa de «—» a «✓»', await p.evaluate(() => _glifo('msMan')), '✓');
    }
    await ejecuta(() => hSecrQty('++'));
    palabra('apagar la cantidad la devuelve a sin registrar', await est('man'), 'sin');
    await ejecuta(() => { $('fKTRcnt').value = '2'; });
    palabra('la KTR con sesiones → registrado', await est('man'), 'reg');
    await ejecuta(() => { $('fKTRcnt').value = '0'; });
    palabra('la KTR de vuelta en 0 → sin dato (hasta que Diego decida la opción en blanco)', await est('man'), 'sin');
    await ejecuta(() => { $('cPosDCLD').checked = true; });
    palabra('★ el posicionamiento marcado cuenta aunque el cuerpo esté plegado (#dPosBody.hidden)', await est('man'), 'reg');
    await ejecuta(() => { $('cPosDCLD').checked = false; });

    await abrir({ va: 'TQT', sop: 'VM' });
    palabra('traqueostomizado: la decanulación sin declarar', await est('decan'), 'sin');
    await ejecuta(() => setEventoVA('decan'));
    palabra('★★ decanulación declarada (casilla «Ocurrió» con display:none) → registrado', await est('decan'), 'reg');
    if (movil) {
      palabra('★★ …y el sub-bloque «Eventos de vía aérea» deja de decir «sin registrar»', await est('msEvt'), 'reg');
      eq('★★ …y su encabezado pasa de «—» a «✓»', await p.evaluate(() => _glifo('msEvt')), '✓');
    }
    await ejecuta(() => setEventoVA('nada'));
    palabra('«Nada» deshace el evento y vuelve a sin registrar', await est('decan'), 'sin');

    await abrir({});
    palabra('con tubo: la TQT sin declarar', await est('tqt'), 'sin');
    await ejecuta(() => setEventoVA('tqt'));
    palabra('★★ TQT declarada → registrado', await est('tqt'), 'reg');

    await abrir({});
    await ejecuta(() => { FASES = ['Weaning', 'Estable']; renderFases(); toggleFase('Weaning'); });
    palabra('★★ una fase clínica elegida (botones sobre un Set) → registrado', await est('fase'), 'reg');
    await ejecuta(() => toggleFase('Weaning'));
    palabra('…y al quitarla vuelve a sin registrar', await est('fase'), 'sin');
    await ejecuta(() => aetElegir('IIIA'));
    palabra('★ la AET en un grupo distinto del 1 (casilla escondida) → registrado', await est('fase'), 'reg');
    await ejecuta(() => aetElegir('I'));
    palabra('…y el grupo 1 (el de todo paciente) no es un dato nuevo', await est('fase'), 'sin');

    await abrir({});
    await ejecuta(() => { PROCS.push('Aspiración de prueba'); renderChips(); });
    palabra('★★ un procedimiento agregado a mano (chips) → registrado', await est('proc'), 'reg');
    await ejecuta(() => { PROCS.length = 0; renderChips(); });
    palabra('…y sin él vuelve a sin registrar', await est('proc'), 'sin');
    await ejecuta(() => { $('cProcImagen').checked = true; });
    palabra('una casilla de procedimiento marcada → registrado', await est('proc'), 'reg');

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n4b · 🔴 CADA fuente declarada hace lo suyo, aunque otro control del bloque la enmascare');
    /* Los desplegables que nacen puestos (el soporte previo de la intubación, la técnica del cultivo…) harían 'registrado' a un bloque
       aunque su fuente escondida no estuviera declarada. Acá se vacían los controles del bloque y se prende SOLO la fuente: si el
       bloque sigue en «registrado» es porque la declaró, y si «sin registrar» con la fuente prendida, no la declaró. Además, con el
       bloque cerrado por su gate (clase `hidden`: no corresponde hoy) la fuente NO cuenta. */
    await abrir({});
    const FUENTES = [
      { n: 'TQT (dTqtSec)', sel: 'dTqtSec', fuente: 'cTqtO', tipo: 'check' },
      { n: 'decanulación (dDecanSec)', sel: 'dDecanSec', fuente: 'cDecanOcurrio', tipo: 'check' },
      { n: 'PVE (dExtSec)', sel: 'dExtSec', fuente: 'fPVEval', tipo: 'hidden' },
      { n: 'reintubación (dReintubSec)', sel: 'dReintubSec', fuente: 'cReintubT', tipo: 'check' },
      { n: 'intubación (dIntubSec)', sel: 'dIntubSec', fuente: 'cIntubO', tipo: 'check' },
      { n: 'cultivo (dMue)', sel: 'dMue', fuente: 'fCultVal', tipo: 'hidden' },
      { n: 'cantidad de secreciones', sel: null, fuente: 'fSecrQty', tipo: 'hidden' },
    ];
    for (const f of FUENTES) {
      const r = await seguro(p, (x) => {
        const blk = x.sel ? document.getElementById(x.sel) : document.getElementById(x.fuente).parentElement;
        if (!blk) return { sinBloque: true };
        const padre = blk.parentElement;
        blk.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea').forEach(e => { e.value = ''; });
        blk.querySelectorAll('input[type=checkbox],input[type=radio]').forEach(e => { if (e.id !== x.fuente) e.checked = false; });
        const src = document.getElementById(x.fuente);
        const poner = on => { if (x.tipo === 'check') src.checked = on; else src.value = on ? 'x' : ''; };
        const eraGate = blk.classList.contains('hidden'); blk.classList.remove('hidden');
        poner(false); const apagada = estadoBloque(blk, []).estado;
        poner(true); const prendida = estadoBloque(blk, []).estado;
        let cerrado = 'n/a';
        if (x.sel) { blk.classList.add('hidden'); cerrado = _hayFuenteConDato(padre); blk.classList.remove('hidden'); }
        poner(false); if (eraGate) blk.classList.add('hidden');
        return { apagada, prendida, cerrado };
      }, f);
      if (r.sinBloque) { eq(f.n + ': el bloque existe', 'no existe', 'existe'); continue; }
      if (r.__error) { eq(f.n + ': ' + r.__error, 'error', 'ok'); continue; }
      eq('★★ ' + f.n + ': con la fuente apagada y el bloque vacío → sin registrar', r.apagada, 'sin');
      eq('★★ ' + f.n + ': …y con SOLO la fuente prendida → registrado', r.prendida, 'reg');
      if (f.sel) eq('★ ' + f.n + ': …y con el bloque cerrado por su gate (no corresponde hoy) la fuente no cuenta', r.cerrado, false);
    }
    await abrir({});
    await ejecuta(() => { $('fSed').value = 'Escalón 2'; hSed(); });
    const sf = await seguro(p, () => {
      const g = document.getElementById('gSedFarmacos'), btn = g.querySelector('.sedf-btn');
      return { visible: !g.classList.contains('hidden'), antes: estadoBloque(g, []).estado, hay: !!btn };
    });
    si('con sedación aparecen los sedantes en uso', sf.visible && sf.hay);
    eq('★★ sedantes en uso: ninguno marcado → sin registrar', sf.antes, 'sin');
    await ejecuta(() => document.querySelector('#gSedFarmacos .sedf-btn').click());
    eq('★★ …y uno marcado (botón con clase «on») → registrado', (await seguro(p, () => estadoBloque(document.getElementById('gSedFarmacos'), []).estado)), 'reg');

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n5 · 🔴 Un 0 TECLEADO es dato (vacío no es 0)');
    await abrir({});
    const z = await seguro(p, () => {
      /* Un bloque sintético con la forma de los reales (etiqueta + control en una .col) para medir la REGLA, sin que otros
         controles de la tarjeta la enmascaren. */
      const mk = (html) => { const d = document.createElement('div'); d.id = 'zz'; d.innerHTML = html; document.getElementById('kf').appendChild(d); return d; };
      const out = {};
      let d = mk('<div class="col"><label>PEEP</label><input type="number" id="zIn" value=""></div>');
      out.vacio = estadoBloque(d).estado;
      document.getElementById('zIn').value = '0'; out.cero = estadoBloque(d).estado; out.ceroTxt = estadoBloque(d).resumen;
      document.getElementById('zIn').value = '8'; out.ocho = estadoBloque(d).estado;
      d.remove();
      d = mk('<div class="col"><label>Sesiones</label><select id="zSel"><option value="0">0</option><option>1</option></select></div>');
      out.selCero = estadoBloque(d).estado;
      document.getElementById('zSel').value = '1'; out.selUno = estadoBloque(d).estado;
      d.remove();
      d = mk('<div class="col"><label>Nota</label><textarea id="zTa"></textarea></div>');
      out.taVacio = estadoBloque(d).estado;
      document.getElementById('zTa').value = '0'; out.taCero = estadoBloque(d).estado;
      d.remove();
      d = mk('<div class="col"><label>Dato</label><input type="number" id="zDis" value="0" disabled></div>');
      out.deshabilitado = estadoBloque(d).estado; d.remove();
      d = mk('<div class="col"><label>Dato</label><input type="number" value="5"></div>'); d.classList.add('hidden');
      const padre = document.createElement('div'); padre.id = 'zz2'; document.getElementById('kf').appendChild(padre); padre.appendChild(d);
      out.ocultoPorLogica = estadoBloque(padre).estado; padre.remove();
      return out;
    });
    if (z.__error) fails.push('bloques sintéticos: ' + z.__error);
    eq('un <input> vacío → sin registrar', z.vacio, 'sin');
    eq('★★ un <input> con un 0 tecleado → registrado', z.cero, 'reg');
    si('…y el resumen lo muestra (no queda "Registrado" sin decir qué)', /PEEP\s*0/.test(z.ceroTxt || ''));
    eq('un <input> con 8 → registrado', z.ocho, 'reg');
    eq('★ un <select> en 0 (KTR) sigue sin ser dato', z.selCero, 'sin');
    eq('…y en 1 sí', z.selUno, 'reg');
    eq('un <textarea> vacío → sin registrar', z.taVacio, 'sin');
    eq('★★ un <textarea> con un 0 → registrado', z.taCero, 'reg');
    eq('un campo deshabilitado (contador calculado) no es dato', z.deshabilitado, 'sin');
    eq('lo oculto por LÓGICA (un gate que no corresponde) no es dato', z.ocultoPorLogica, 'sin');
    /* El mismo caso en el bloque real del módulo ventilatorio (PEEP 0 tecleado y nada más): se vacían los tres ejes para que
       los desplegables que nacen puestos no lo enmascaren. */
    const pe = await seguro(p, () => {
      const blk = document.getElementById('dVentBloque');
      ['fSop', 'fInterfaz', 'fModo'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
      const pp = document.getElementById('r_peep'); if (!pp) return { sinPeep: true };
      [...blk.querySelectorAll('input:not([type=hidden])')].forEach(e => { e.value = ''; });
      const vacio = estadoBloque(blk).estado;
      pp.value = '0'; const cero = estadoBloque(blk).estado;
      return { vacio, cero };
    });
    si('el módulo ventilatorio tiene su PEEP', !pe.sinPeep);
    eq('módulo ventilatorio con los tres ejes y los parámetros vacíos → sin registrar', pe.vacio, 'sin');
    eq('★★ …con PEEP 0 tecleado y nada más → registrado', pe.cero, 'reg');

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n6 · Lo heredado cuenta como «Registrado» (como hoy) y la función solo lee');
    await abrir({});
    await ejecuta(() => { $('fMPVal').selectedIndex = 1; });
    palabra('★ un valor puesto POR CÓDIGO (así deja la réplica del turno anterior lo suyo) cuenta como registrado', await est('ausc'), 'reg');
    const sn = await seguro(p, () => {
      const foto = () => [...document.getElementById('kf').elements].map(e => (e.id || e.name) + '=' + (e.type === 'checkbox' || e.type === 'radio' ? e.checked : e.value)).join('|');
      const antes = foto();
      ['fase', 'sed', 'hemo', 'ausc', 'resp', 'proc', 'prono', 'pve', 'man'].forEach(k => estadoBloque(_bl(k)));
      rielRender();
      return { igual: foto() === antes };
    });
    si('★ calcular el estado de todos los bloques no cambia ningún valor del formulario', sn.igual);

    // ─────────────────────────────────────────────────────────────────────────────────────────────
    console.log('\n7 · 🔴 COBERTURA ESTRUCTURAL: ninguna fuente de dato queda sin declarar');
    await abrir({});
    await p.evaluate(() => { FASES = ['Weaning']; renderFases(); PROCS.push('x'); renderChips(); });
    const cob = await p.evaluate(({ exH, exB }) => {
      const turno = [...document.querySelectorAll('#kf .fcard')].filter(c => String(c.dataset.paso || '2') === '2');
      const tokens = new Set(), malos = [];
      turno.forEach(c => [c, ...c.querySelectorAll('[data-fuentes]')].forEach(s => {
        String(s.dataset.fuentes || '').split(/\s+/).filter(Boolean).forEach(t => {
          tokens.add(t);
          const ok = t.charAt(0) === '@' ? (typeof ESTADO_FUENTES !== 'undefined' && typeof ESTADO_FUENTES[t.slice(1)] === 'function') : !!document.getElementById(t);
          if (!ok) malos.push(t);
        });
      }));
      const hiddenSinDeclarar = [], botonesSinDeclarar = [];
      turno.forEach(c => {
        c.querySelectorAll('input[type=hidden]').forEach(h => { if (!tokens.has(h.id) && !Object.prototype.hasOwnProperty.call(exH, h.id)) hiddenSinDeclarar.push(h.id || '(sin id)'); });
        c.querySelectorAll('button').forEach(bt => {
          const declarado = !!bt.closest('[data-fuentes]');
          const exento = exB.some(e => bt.matches(e.sel));
          if (!declarado && !exento) botonesSinDeclarar.push((bt.id || bt.className || 'button') + ' | ' + (bt.getAttribute('onclick') || '').slice(0, 40));
        });
      });
      const exHVivos = Object.keys(exH).filter(id => !document.getElementById(id));
      const exBVivos = exB.filter(e => !turno.some(c => c.querySelector(e.sel))).map(e => e.sel);
      return { tarjetas: turno.length, tokens: [...tokens], malos, hiddenSinDeclarar, botonesSinDeclarar, exHVivos, exBVivos };
    }, { exH: EXENTOS_HIDDEN, exB: EXENTOS_BOTON });
    eq('las tarjetas del Turno son las 7 de siempre (Fase, Sedación, Hemodinamia, Neurología, Auscultación, Respiratorio, Procedimientos)', cob.tarjetas, 7);
    si('★ alguna tarjeta declara sus fuentes (data-fuentes)', cob.tokens.length > 0);
    eq('★★ todo token de data-fuentes apunta a un elemento que existe o a una fuente de ESTADO_FUENTES', cob.malos.join(','), '');
    eq('★★ todo <input type=hidden> del Turno está declarado en data-fuentes o exento con motivo', cob.hiddenSinDeclarar.join(','), '');
    eq('★★ todo botón del Turno cuelga de un bloque que declara sus fuentes o está exento con motivo', cob.botonesSinDeclarar.join(' ;; '), '');
    eq('los exentos de esta guardia siguen existiendo (si no, la lista se pudre): ocultos', cob.exHVivos.join(','), '');
    eq('…y los de botones', cob.exBVivos.join(','), '');

    await p.close();
  }

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ estado_del_bloque: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ estado_del_bloque: el estado de cada bloque sale de los datos.');
})();
