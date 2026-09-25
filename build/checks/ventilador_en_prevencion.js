// ventilador_en_prevencion.js — El ventilador se anota donde se revisa el
// paquete de prevención de NAVM (Diego, 25-sep-2026).
//
// LO QUE PIDIÓ: «que se pueda anotar el VM en el apartado de prevención de
// NAVM si es que aplica VM». Y antes, explicando por qué ahí: «medida de
// prevención de neumonía asociada a ventilación mecánica con el ventilador que
// tiene… el ventilador que tiene no predispone a la neumonía, sin embargo es
// como un buen lugar para anotarlo; aquí se van a anotar los filtros y todo
// eso».
//
// 🔴 EL EQUIPO NO SE INVENTA NI SE DUPLICA. El inventario de ventiladores ya
// existe (hoja VENTILADORES, 33 equipos, con su ubicación por cama) y la cama
// ya sabe cuál tiene (`VM_TAG`). Lo que faltaba era poder ANOTARLO desde el
// turno, sin salir a la pestaña Ventiladores. Así que esta fila no guarda un
// dato nuevo: mueve el equipo en el MISMO inventario, con `MOVER_VENTILADOR`,
// y el movimiento queda en el libro con su fecha y su firma. Un segundo lugar
// donde escribir «qué ventilador tiene» sería la copia que se contradice.
//
// 🔴 VA ARRIBA DE LOS FILTROS, no al final: el HEPA fijo depende del EQUIPO
// (`_hepaFijoEquipo`), así que saber cuál es viene antes que preguntar por su
// filtro.
//
// 🔴 SOLO CON VM INVASIVA. El esquema lo dice: un VM «es parte de la sala y
// OCUPA la cama»; el VNI y el CNAF «van al PACIENTE — queda en una cama pero
// no vive ahí». Ofrecer la fila sin VM sería pedir que se asigne a la cama un
// equipo que no es de la cama.
//
// 🪤 El reloj va congelado: fecha inventada (12-ago-2026, fuera de las
// ventanas trampa) y turno forzado.
//
// Uso: node build/checks/ventilador_en_prevencion.js
const path = require('path');
const { chromium } = require('playwright-core');
const V2 = path.resolve(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

/* Inventario de mentira: dos de cama (uno libre, uno en OTRA cama), uno en
   esta cama y uno de apoyo que NO debe ofrecerse. */
const EQUIPOS = [
  { id: 'v1', nombre: 'Vela 1', marca: 'Vyaire', modelo: 'Vela', ubicTipo: 'CAMA', ubicDetalle: '3',
    estado: 'Operativo', activo: true, categoria: 'VM', deCama: true },
  { id: 'v2', nombre: 'Vela 2', marca: 'Vyaire', modelo: 'Vela', ubicTipo: 'BODEGA', ubicDetalle: '',
    estado: 'Operativo', activo: true, categoria: 'VM', deCama: true },
  { id: 'v3', nombre: 'PB 1', marca: 'Puritan Bennett', modelo: '', ubicTipo: 'CAMA', ubicDetalle: '7',
    estado: 'Operativo', activo: true, categoria: 'VM', deCama: true },
  { id: 'a1', nombre: 'Aerogen 2', marca: 'Aerogen', modelo: '', ubicTipo: 'BODEGA', ubicDetalle: '',
    estado: 'Operativo', activo: true, categoria: 'APOYO', deCama: false },
];

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 1200 }, locale: 'es-CL' });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(eqs => {
    window.__api = [];
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
      api(a, d) { window.__api.push({ a: a, d: d });
        let data = null;
        if (a === 'GET_CONFIG_UI') data = { NUM_CAMAS: 12, BANNERS: {} };
        else if (a === 'GET_VENTILADORES') data = eqs;
        else if (a === 'MOVER_VENTILADOR') data = { resumen: 'Movido' };
        setTimeout(() => ok({ ok: true, data }), 5); }
    }; } }; } } } };
  }, EQUIPOS);
  await p.goto('file://' + path.join(V2, 'index.html'));
  await p.waitForTimeout(800);

  /* Abre la cama 3 (que en el inventario de mentira ya tiene «Vela 1»). */
  const abrir = (va, sop, vmTag) => p.evaluate(x => {
    $('kf').reset();
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', EDAD: 61, SEXO: 'M',
            VIA_AEREA: x.va, SOPORTE: x.sop, VM_TAG: x.vmTag, VM_TAG_ESTADO: 'Operativo' }];
    window.recargarSilencioso = () => {};
    renderGrid(); abrirPanel('3', false, false);
  }, { va, sop, vmTag }).then(() => p.waitForTimeout(500)).then(() => p.evaluate(x => {
    $('gDate').value = '2026-08-12'; SHIFT = 'Dia';
    window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
    $('fVA').value = x.va; cascadeVA();
    $('fSop').value = x.sop; cascadeSop();
    _snapIniEstado();
    /* 🪤 CADA COSA SE MIDE DONDE VIVE: el paquete de prevención es el PASO 1.
       Medirlo desde el 2 lo da «oculto» sin que nada esté roto. */
    pasoIr(1);
  }, { va, sop })).then(() => p.waitForTimeout(450));

  const ver = sel => p.evaluate(s => { const e = document.querySelector(s);
    if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0);
  }, sel);

  /* ══ 1 · Con VM, la fila está ═══════════════════════════════════════ */
  console.log('\n1 · 🔴 Con el paciente en VM, el ventilador se anota acá');
  await abrir('TOT', 'VM', 'Vela 1');
  si('★★ la fila del ventilador se ve en el paso 1', await ver('#pvVM'));
  si('★★ …con su selector', await ver('#fPrevVM'));
  eq('★★ y muestra el que la cama ya tiene', await p.evaluate(() => v('fPrevVM')), 'v1');

  console.log('\n1b · Va ARRIBA de los filtros (el HEPA fijo depende del equipo)');
  si('★★ el ventilador va antes que la lista de filtros',
     await p.evaluate(() => {
       const a = document.getElementById('pvVM'), b2 = document.getElementById('pvLista');
       return !!(a && b2 && (a.compareDocumentPosition(b2) & Node.DOCUMENT_POSITION_FOLLOWING));
     }));

  /* ══ 2 · Solo ofrece equipos de cama ════════════════════════════════ */
  console.log('\n2 · 🔴 Ofrece los equipos DE CAMA, no los de apoyo');
  const ops = await p.evaluate(() => Array.from(document.getElementById('fPrevVM').options)
    .map(o => ({ v: o.value, t: o.textContent })));
  si('★★ ofrece los tres ventiladores de cama',
     ['v1', 'v2', 'v3'].every(id => ops.some(o => o.v === id)));
  no('★★ …y NO el equipo de apoyo (Aerogen no ocupa cama)', ops.some(o => o.v === 'a1'));
  si('★ hay una opción para dejarlo sin asignar', ops.some(o => o.v === ''));
  si('★★ el que está en OTRA cama lo dice, para no moverlo sin darse cuenta',
     ops.some(o => o.v === 'v3' && /cama\s*7/i.test(o.t)));

  /* ══ 3 · Elegir uno lo mueve en el MISMO inventario ═════════════════ */
  console.log('\n3 · 🔴 Anotarlo mueve el equipo en el inventario de siempre');
  const env = await p.evaluate(async () => {
    window.__api = [];
    const s = document.getElementById('fPrevVM');
    s.value = 'v2'; prevVMelegir();
    await new Promise(r => setTimeout(r, 400));
    const m = window.__api.filter(x => x.a === 'MOVER_VENTILADOR').pop();
    return m ? m.d : { error: 'no se mandó nada' };
  });
  eq('★★ manda MOVER_VENTILADOR con el equipo elegido', env.idVm, 'v2');
  eq('★★ …a esta cama', env.tipo, 'CAMA');
  eq('★★ …con su número', String(env.detalle), '3');
  eq('★ …con la fecha del turno, no la del reloj', env.fecha, '2026-08-12');
  si('★ …y un motivo que dice de dónde salió', /turno|prevenci/i.test(String(env.motivo || '')));

  /* ══ 4 · Sin VM, la fila no se ofrece ══════════════════════════════ */
  console.log('\n4 · 🔴 Sin VM invasiva no se ofrece (el equipo es de la cama, no del paciente)');
  await abrir('Natural', 'Ambiente', '');
  no('★★ con vía aérea natural y ambiente, la fila NO se ve', await ver('#pvVM'));
  await abrir('Natural', 'Oxigenoterapia/OAF', '');
  no('★★ …ni con oxigenoterapia', await ver('#pvVM'));
  await abrir('TQT', 'VM', '');
  si('★★ pero con TQT en VM sí (sigue ocupando un ventilador)', await ver('#pvVM'));

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ ventilador_en_prevencion: ' + fails.length + ' FALLO(S): ' + fails.join(' · ')
                           : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
