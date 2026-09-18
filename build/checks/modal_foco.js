// modal_foco.js — 🔴 EL TECLADO NO SE ESCAPA DEL MODAL, Y VUELVE DE DONDE VINO
// (15-sep-2026).
//
// DE DÓNDE SALE. El plan maestro pide una capa única de modales (§9.1):
// «backdrop único, cierre por Escape, aria-modal, focus trap, retorno de
// foco». Medido sobre la base 7.04: 15 modales ya traían role="dialog" y
// aria-modal, pero NINGUNO tenía nombre —el lector de pantalla anuncia
// «diálogo» y nada más—, cinco superficies bloqueantes no tenían rol siquiera
// (entre ellas la confirmación propia y el cuadro rojo de «No se guardó»), y
// no había ni un manejador de Tab en 18.700 líneas.
//
// QUÉ SIGNIFICA ESO EN LA UNIDAD. Con el panel de evolución abierto, tabular
// sale del formulario hacia los botones de la grilla que están TAPADOS detrás:
// se puede activar un control que no se está viendo. Y al cerrar, el foco
// volvía al principio del documento, así que seguir con el teclado obligaba a
// tabular la página entera.
//
// QUÉ EXIGE ESTA GUARDIA, probado en un navegador de verdad:
//   1. Que todo modal registrado tenga rol, aria-modal y NOMBRE.
//   2. Que al abrirse el foco entre al modal…
//   3. …pero que NO le pise el foco al modal que ya llevó el cursor a su
//      propio campo (si no, el usuario termina en el botón de cerrar en vez
//      de donde iba a escribir).
//   4. Que Tab dé la vuelta dentro del modal y no llegue a lo de atrás.
//   5. Que al cerrar el foco vuelva al botón que lo abrió.
//
// Uso: node build/checks/modal_foco.js
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

const INDEX = path.resolve(__dirname, '..', '..', 'v2', 'index.html');

(async () => {
  const fails = [];
  const si = (l, cond, detalle) => {
    console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined ? '' : ': ' + detalle));
    if (!cond) fails.push(l);
  };

  const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  pagina.on('pageerror', e => errores.push(e.message));

  await pagina.addInitScript(() => {
    const CAMAS = [];
    for (let i = 1; i <= 18; i++) CAMAS.push({ ID_CAMA: String(i), OCUPADA: i <= 12,
      NOMBRE: 'Paciente ' + i, EDAD: 60 + i, SEXO: i % 2 ? 'M' : 'F', DIAGNOSTICO: 'Dx ' + i,
      PATIENT_ID: 'P' + i, COD_PACIENTE: 'C' + i, VIA_AEREA: 'TOT', SOPORTE: 'VM', MODO: 'ACVC',
      FECHA_INGRESO: '2026-07-25', FECHA_INICIO_SOPORTE: '2026-07-25', FECHA_INICIO_VA: '2026-07-25' });
    const R = { GET_BOOT: { ahora: '2026-07-28 10:00:00', yo: { email: '', firma: 'DEV', dev: true },
      config: { NUM_CAMAS: 18, BANNERS: {} }, fases: ['Weaning'], camas: CAMAS, evos: [],
      asignacion: { team: [], assign: {} } }, GET_ARCHIVADOS: [] };
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
      api(a) { setTimeout(() => ok({ ok: true, data: R[a] !== undefined ? R[a] : null }), 5); }
    }; } }; } } } };
  });

  await pagina.goto('file://' + INDEX);
  await pagina.waitForTimeout(1200);

  /* ── 1 · Rol, aria-modal y NOMBRE en todos los registrados ──────────────── */
  const aria = await pagina.evaluate(() => {
    const out = { total: 0, vigilados: [], sinNombre: [], sinRol: [], faltantes: [] };
    if (typeof Modal === 'undefined') return null;
    out.vigilados = Modal.vigilados.slice();
    for (const id of Object.keys(Modal.REGISTRO)) {
      const el = document.getElementById(id);
      if (!el) { out.faltantes.push(id); continue; }
      out.total++;
      if (el.getAttribute('role') !== 'dialog' || el.getAttribute('aria-modal') !== 'true') out.sinRol.push(id);
      if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) out.sinNombre.push(id);
    }
    return out;
  });
  si('el módulo core/modal.js está cargado', aria !== null, 'no existe el objeto Modal');
  if (aria === null) { await navegador.close(); console.log('\n❌ 1 FALLOS'); process.exit(1); }
  si('todos los modales del registro existen en el documento', aria.faltantes.length === 0, aria.faltantes.join(', '));
  si('los ' + aria.total + ' tienen role="dialog" y aria-modal', aria.sinRol.length === 0, aria.sinRol.join(', '));
  si('los ' + aria.total + ' tienen NOMBRE para el lector de pantalla', aria.sinNombre.length === 0, aria.sinNombre.join(', '));
  si('el registro no quedó vacío por un cambio de ids', aria.total >= 15, aria.total);

  /* ── 2 · Abrir un modal desde un botón: el foco entra ───────────────────── */
  const abrir = await pagina.evaluate(() => {
    const disparador = document.querySelector('#bedGrid button, #bedGrid .bcard') || document.body;
    if (disparador.setAttribute) disparador.setAttribute('tabindex', '0');
    disparador.id = disparador.id || '_disparadorPrueba';
    disparador.focus();
    const antes = document.activeElement && document.activeElement.id;
    document.getElementById('ayudaMod').classList.add('on');
    return { antes: antes, disparador: disparador.id };
  });
  await pagina.waitForTimeout(80);
  const dentro = await pagina.evaluate(() =>
    document.getElementById('ayudaMod').contains(document.activeElement));
  si('al abrirse, el foco entra al modal', dentro === true,
    'quedó en ' + await pagina.evaluate(() => (document.activeElement && (document.activeElement.id || document.activeElement.tagName)) || 'nada'));
  si('Modal.activo() dice cuál manda el teclado',
    await pagina.evaluate(() => Modal.activo()) === 'ayudaMod');

  /* ── 3 · Tab da la vuelta dentro y no sale ──────────────────────────────── */
  let salidas = 0;
  for (let i = 0; i < 40; i++) {
    await pagina.keyboard.press('Tab');
    if (!(await pagina.evaluate(() => document.getElementById('ayudaMod').contains(document.activeElement)))) salidas++;
  }
  si('40 tabulaciones seguidas y el foco nunca salió del modal', salidas === 0, salidas + ' salidas');
  let salidasAtras = 0;
  for (let i = 0; i < 10; i++) {
    await pagina.keyboard.press('Shift+Tab');
    if (!(await pagina.evaluate(() => document.getElementById('ayudaMod').contains(document.activeElement)))) salidasAtras++;
  }
  si('y tampoco hacia atrás (Shift+Tab)', salidasAtras === 0, salidasAtras + ' salidas');

  /* ── 4 · Al cerrar, el foco vuelve a quien lo abrió ─────────────────────── */
  await pagina.evaluate(() => document.getElementById('ayudaMod').classList.remove('on'));
  await pagina.waitForTimeout(80);
  const vuelto = await pagina.evaluate(() => document.activeElement && document.activeElement.id);
  si('al cerrar, el foco vuelve al elemento que lo abrió', vuelto === abrir.disparador,
    'volvió a «' + vuelto + '», se esperaba «' + abrir.disparador + '»');
  /* 🪤 18-sep-2026 · SE MIDE QUE SALIÓ DE LA PILA, no que la pila esté vacía.
     Sin servidor detrás, el arranque termina mostrando el overlay de login —que
     es un modal legítimo y bien registrado—, así que «vacía» dependía de si el
     arranque había llegado a pintarlo antes de los 1200 ms de espera: la misma
     guardia salía verde con la batería en paralelo (más lenta) y roja corrida
     sola. Lo que esta línea protege es que cerrar un modal lo saque de la pila,
     y eso se mide sin depender de quién más esté abierto. */
  si('el modal cerrado sale de la pila',
    !(await pagina.evaluate(() => Modal.abiertos().indexOf('ayudaMod') >= 0)));

  /* ── 5 · No le pisa el foco al modal que ya lo colocó ───────────────────── */
  const respetado = await pagina.evaluate(async () => {
    const m = document.getElementById('bnMod');
    m.classList.add('on');
    const campo = m.querySelector('input,textarea,select,button');
    if (!campo) return 'sin-campos';
    campo.focus();
    const elegido = campo;
    await new Promise(r => setTimeout(r, 60));
    return document.activeElement === elegido ? 'respetado' : 'pisado';
  });
  si('si el modal ya llevó el foco a su campo, el módulo NO lo mueve',
    respetado === 'respetado' || respetado === 'sin-campos', respetado);
  await pagina.evaluate(() => document.getElementById('bnMod').classList.remove('on'));

  si('sin errores de JavaScript en toda la corrida', errores.length === 0, errores.join(' | '));

  await navegador.close();
  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLOS' : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
