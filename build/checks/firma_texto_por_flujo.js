// firma_texto_por_flujo.js — EL CUADRO QUE PIDE LA FIRMA DICE LO QUE PASA, NO SIEMPRE «¿QUIÉN MIDIÓ?» (tanda 5 · cambio 4 del plan de
// limpieza del registro de evolución, oct-2026; el punto 10 de docs/PENDIENTES.md).
//
// EL FALLO. `_pedirFirma()` abre un cuadro con el título «¿Quién midió?» y el mensaje «La firma viaja con la medición: dice de dónde
// salió el dato». Está bien para quien registra una evaluación (MRC, FSS, CPAx, ECF, Barthel, Charlson), pero la MISMA función la usan
// también los pendientes: al dejar uno («Medir MRC-ss», «Pabellón pendiente», lo que se escriba a mano) y al cerrarlo desde la cama.
// Ahí el cuadro preguntaba quién midió algo que nadie midió: un texto de medición, claramente equivocado. Como la firma del
// formulario es lo primero que mira `_pedirFirma`, el cuadro solo sale cuando todavía no se eligió firma, que es justo el caso de quien
// llega a Planes y deja un pendiente antes de firmar, por eso nadie lo había notado como error.
//
// LO QUE ESTA GUARDIA FIJA (Chromium, reloj congelado, datos ficticios, el cuadro de verdad —no una función sustituida—):
//   1. Dejar un pendiente, por el campo libre («📌 Dejar») y por un atajo, pregunta «¿Quién deja el pendiente?» y su mensaje no habla de
//      medición.
//   2. Cerrar un pendiente desde la cama pregunta «¿Quién cierra el pendiente?», con el mismo cuidado.
//   3. El cuadro de las evaluaciones NO cambió: sigue diciendo «¿Quién midió?» (se mide por el camino real de ECF/Barthel/Charlson
//      desde la tarjeta y por la llamada sin argumentos), porque ahí sí es lo correcto.
//   4. Los dos flujos siguen funcionando: elegir la firma y confirmar deja el pendiente (y lo cierra) en el servidor simulado, con la
//      firma elegida; y cancelar no manda nada.
//
// 🪤 La firma del formulario hace que el cuadro NO se abra (es lo primero que mira `_pedirFirma`): la guardia la deja vacía a propósito.
// 🪤 Reloj congelado: martes 10-mar-2026 10:00 con `clock.setFixedTime` (fecha INVENTADA, fuera de las ventanas trampa).
//
// Uso: node build/checks/firma_texto_por_flujo.js
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright-core');
const S = require(path.join(__dirname, '..', 'sim', 'sim_srv.js'));
const V2 = path.resolve(__dirname, '..', '..', 'v2');

// 🔐 Desde el guardado seguro la pantalla manda un OP_ID con cada escritura y `api()` arma el sello con `_huellaPayload`, que vive en
// infra_lock.gs. El simulador no carga ese archivo (su `conLock` es un juguete) y sin él dejar o cerrar un pendiente reventaba con
// «_huellaPayload is not defined». Se completa acá, igual que en acceso_pantalla.js y terapia_fisica_vuelve_al_reabrir.js, devolviendo
// el juguete: esta guardia prueba el texto del cuadro y que el flujo siga andando, no el sello. (infra_respuesta va primero por las
// `const` de ERR: las `const` no cuelgan de globalThis con eval indirecto.)
{ const conLockJuguete = global.conLock;
  (0, eval)(['infra_respuesta.gs', 'infra_lock.gs'].map(f => fs.readFileSync(path.join(V2, f), 'utf8')).join('\n;\n'));
  global.conLock = conLockJuguete; }

const pad = n => String(n).padStart(2, '0');
const HOY = new Date(2026, 2, 10, 10, 0, 0);
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const menosDias = n => iso(new Date(HOY.getTime() - n * 86400000));
S.SIM.fecha = iso(HOY);
S.SIM.hora = '10:00:00';

{
  const c = S.DB.CAMAS_ESTADO.find(x => String(x.ID_CAMA) === '1');
  Object.assign(c, {
    OCUPADA: true, STATUS_CAMA: 'Ocupada', PATIENT_ID: 'pid-1', COD_PACIENTE: 'C1',
    NOMBRE: 'Rosa Elena Contreras Pino', EDAD: 74, SEXO: 'F', DIAGNOSTICO: 'Neumonía',
    VIA_AEREA: 'TOT', SOPORTE: 'VM', MODO: 'ACVC', TALLA_CM: 158,
    FECHA_INGRESO: menosDias(3), TS_INGRESO: menosDias(3) + ' 08:30',
    FECHA_INICIO_SOPORTE: menosDias(3), FECHA_INICIO_VA: menosDias(3), FIRMA_KINE: 'DMV',
    // Un pendiente abierto por el turno anterior: es el que se cierra desde la cama.
    PENDIENTES_JSON: JSON.stringify([{ id: 'pend-1', tx: 'Pabellón pendiente', ab: 'ARM', abTs: menosDias(1) + ' 20:00', abT: 'Noche' }]),
  });
}

const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined ? '' : '\n   ' + detalle));
  if (!cond) fails.push(l);
};

(async () => {
  const compilado = path.join(__dirname, '..', '_firma_texto.html');
  fs.writeFileSync(compilado, fs.readFileSync(path.join(__dirname, '..', '..', 'v2', 'index.html'), 'utf8').replace(/<\?=[\s\S]*?\?>/g, ''));
  const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pag = await navegador.newPage({ viewport: { width: 1400, height: 950 } });
  const errores = [];
  pag.on('pageerror', e => errores.push(e.message));
  await pag.clock.setFixedTime(HOY);
  const llamadas = [];
  await pag.exposeFunction('__gasApi', (a, d, t) => {
    llamadas.push({ a, d });
    let r; try { r = S.api(a, d, t); } catch (e) { r = { ok: false, error: e.message }; }
    return JSON.stringify(r);
  });
  await pag.addInitScript(() => {
    window.google = { script: { run: { withSuccessHandler(o) { return { withFailureHandler(f) { return {
      async api(a, d, t) { const r = JSON.parse(await window.__gasApi(a, d || {}, t || null)); if (r.ok) o(r); else f(r.error); }
    }; } }; } } } };
  });
  await pag.goto('file://' + compilado);
  await pag.waitForTimeout(1500);

  const modal = () => pag.evaluate(() => ({
    abierto: document.getElementById('ucOvl').classList.contains('on'),
    titulo: document.getElementById('ucTit').textContent.trim(),
    mensaje: document.getElementById('ucMsg').textContent.trim(),
  }));
  const cancelar = async () => { await pag.evaluate(() => _ucFin(false)); await pag.waitForTimeout(150); };
  const sinFirma = () => pag.evaluate(() => { const f = document.getElementById('fFirma'); f.value = ''; return f.value; });
  const veApi = a => llamadas.filter(x => x.a === a);

  /* ── el panel de la cama 1, en Planes, SIN firma elegida ───────────────────────────────────────────── */
  await pag.evaluate(() => { setTab('G'); abrirPanel('1', false); });
  await pag.waitForTimeout(1000);
  await pag.evaluate(() => pasoIr(5));
  await pag.waitForTimeout(300);
  si('el escenario es el que dice ser: Planes abierto, firma del formulario vacía, un pendiente abierto por el turno anterior',
    (await pag.evaluate(() => PASO_ACTUAL)) === 5 && (await sinFirma()) === '' && (await pag.locator('#pendEpi .pe-btn').count()) === 1, '');
  /* y la guardia no deja la firma puesta por el camino: `abrirPanel` ya la dejó vacía (se vuelve a vaciar en cada caso) */

  console.log('\n1 · Dejar un pendiente');
  await pag.fill('#pasoPendTxt', 'Revisar la bomba de infusión');
  await pag.click('#pasoPendBtn');
  await pag.waitForTimeout(200);
  let m = await modal();
  si('por el campo libre («📌 Dejar»): el cuadro se abre y pregunta «¿Quién deja el pendiente?»', m.abierto && m.titulo === '¿Quién deja el pendiente?', JSON.stringify(m));
  si('…y su mensaje no habla de medición ni de dato medido', m.abierto && !/medici|midi|dato/i.test(m.mensaje) && m.mensaje.length > 0, JSON.stringify(m));
  await cancelar();
  si('cancelar no manda nada al servidor', veApi('PEND_ABRIR').length === 0, JSON.stringify(veApi('PEND_ABRIR')));

  /* Un atajo que NO esté ya abierto (el de «Pabellón pendiente» ya lo dejó el turno anterior y solo avisa que sigue abierto). */
  await pag.click('#pendChips button:not(.on)');
  await pag.waitForTimeout(200);
  m = await modal();
  si('por un atajo (chip): también «¿Quién deja el pendiente?»', m.abierto && m.titulo === '¿Quién deja el pendiente?', JSON.stringify(m));
  await cancelar();

  console.log('\n2 · Cerrar un pendiente desde la cama');
  /* «Te dejaron pendiente» vive en el paso 2 (Turno), donde se abre la cama: ahí se cierra. */
  await pag.evaluate(() => pasoIr(2));
  await pag.waitForTimeout(300);
  await pag.click('#pendEpi .pe-btn');
  await pag.waitForTimeout(200);
  m = await modal();
  si('el cuadro pregunta «¿Quién cierra el pendiente?»', m.abierto && m.titulo === '¿Quién cierra el pendiente?', JSON.stringify(m));
  si('…y su mensaje no habla de medición ni de dato medido', m.abierto && !/medici|midi|dato/i.test(m.mensaje) && m.mensaje.length > 0, JSON.stringify(m));
  await cancelar();
  si('cancelar no manda nada al servidor', veApi('PEND_CERRAR').length === 0, JSON.stringify(veApi('PEND_CERRAR')));

  console.log('\n3 · Las evaluaciones siguen preguntando «¿Quién midió?»');
  /* El camino real: una escala del episodio desde la tarjeta (ECF) llama a `_pedirFirma()` cuando se aplica el valor. */
  await pag.evaluate(() => { escalaDesdeTarjeta('1', 'ecf'); });
  await pag.waitForTimeout(250);
  await pag.evaluate(() => { _escalaOnApply(4, ''); });
  await pag.waitForTimeout(250);
  m = await modal();
  si('la escala del episodio (ECF) desde la tarjeta: «¿Quién midió?» con su mensaje de medición', m.abierto && m.titulo === '¿Quién midió?' && /medici/i.test(m.mensaje), JSON.stringify(m));
  await cancelar();
  await pag.evaluate(() => { try { cerrarEscala && cerrarEscala(); } catch (e) {} document.querySelectorAll('.modal.on, .ovl.on').forEach(x => { if (x.id !== 'ucOvl') x.classList.remove('on'); }); });
  const directo = await pag.evaluate(() => { _pedirFirma(); return new Promise(r => setTimeout(() => r({
    titulo: document.getElementById('ucTit').textContent.trim(), mensaje: document.getElementById('ucMsg').textContent.trim() }), 150)); });
  si('la llamada sin argumentos (lo que usan las demás evaluaciones) sigue siendo «¿Quién midió?»', directo.titulo === '¿Quién midió?' && /medici/i.test(directo.mensaje), JSON.stringify(directo));
  await cancelar();

  console.log('\n4 · Los flujos siguen funcionando con el texto nuevo');
  await pag.evaluate(() => { document.getElementById('fFirma').value = ''; pasoIr(5); });
  await pag.waitForTimeout(300);
  await pag.fill('#pasoPendTxt', 'Revisar la bomba de infusión');
  await pag.click('#pasoPendBtn');
  await pag.waitForTimeout(200);
  /* El simulador no trae la lista de firmas del equipo: se le agrega una opción al selector del cuadro (la pantalla real la llena). */
  const elegir = () => pag.evaluate(() => { const s = document.getElementById('epFirmaSel'); s.insertAdjacentHTML('beforeend', '<option value="DMV">DMV</option>'); s.value = 'DMV'; return s.value; });
  const elegida = await elegir();
  await pag.click('#ucOk');
  await pag.waitForTimeout(500);
  const ab = veApi('PEND_ABRIR');
  si('elegir la firma y confirmar deja el pendiente en el servidor, con la firma elegida y con el texto escrito',
    ab.length === 1 && ab[0].d.texto === 'Revisar la bomba de infusión' && ab[0].d.firma === elegida && elegida !== '', JSON.stringify(ab));
  await pag.evaluate(() => { const f = document.getElementById('fFirma'); f.value = ''; try { localStorage.removeItem('rce_firma_tarjeta'); } catch (e) {} pasoIr(2); });
  await pag.waitForTimeout(300);
  await pag.click('#pendEpi .pe-btn');
  await pag.waitForTimeout(200);
  await elegir();
  await pag.click('#ucOk');
  await pag.waitForTimeout(500);
  const ce = veApi('PEND_CERRAR');
  si('elegir la firma y confirmar cierra el pendiente en el servidor', ce.length === 1 && ce[0].d.id === 'pend-1' && !!ce[0].d.firma, JSON.stringify(ce));

  await navegador.close();
  fs.unlinkSync(compilado);
  si('sin errores de JavaScript en la página', errores.length === 0, errores.join(' | '));
  if (fails.length) { console.log('\n❌ ' + fails.length + ' fallan'); process.exit(1); }
  console.log('\n✅ todo verde');
})().catch(e => { console.error('❌ la guardia reventó: ' + (e && e.stack || e)); process.exit(1); });
