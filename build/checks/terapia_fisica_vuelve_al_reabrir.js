// terapia_fisica_vuelve_al_reabrir.js — Reabrir un turno YA GUARDADO devuelve la terapia física tal como se guardó
// (acuerdos 8.6 y 8.7 de docs/ACUERDOS_REDISENO.md; tanda 4, cambio 2).
//
// EL DEFECTO (leyendo el código; lo mide esta guardia, de punta a punta: pantalla real + servidor real en memoria).
// `fillForm()` es el camino que carga un turno guardado para re-editarlo, y de la terapia física dejaba la tarjeta
// ENTERA en blanco: apagaba el estado de la KTM (`setKTMstate(null)`), vaciaba nivel, asistencia y minutos, desmarcaba
// IMT, EMS y válvula de fonación, y el Borg ni lo miraba. Era una herencia de cuando «la KTM era acción diaria y cada
// reapertura partía en blanco»; pero REABRIR es el MISMO turno, no uno nuevo (lo que no hereda es `fillFormReplica`, y
// ése no se toca).
//
// 🪤 EL DATO NO SE PERDÍA SIEMPRE, y por eso costó verlo. Dependía de si el payload «declaraba» algún estado de KTM:
//   · DE NOCHE el payload manda `KTM_NO_REALIZADA: ''` ⇒ el servidor lo toma por silencio y conserva el trío de estados y
//     sus satélites (svc_evoluciones.gs, «LA KTM NO SE PIERDE AL REABRIR»). Pero NO conserva IMT, EMS, válvula, Borg ni
//     las sesiones: la pantalla los manda en `false`/`''` como claves PRESENTES y la fusión solo repone las AUSENTES. Reabrir
//     una noche para corregir la FiO₂ y volver a guardar dejaba el turno SIN su IMT, su EMS y su válvula.
//   · DE DÍA el payload manda `KTM_NO_REALIZADA: true` (ni «realizada» ni «suspendida» apuntadas ⇒ se infiere «no
//     realizada») SIN razón, y el servidor lo RECHAZA: «KTM: indica la razón por la que NO se realizó». Un turno de día con
//     la KTM realizada quedaba imposible de volver a guardar, con el campo de la razón oculto y el error sin dónde apuntar.
//
// LO QUE DEBE PASAR (la regla, y esta guardia mide cada línea):
//   1. La pantalla vuelve a mostrar TODO lo guardado: el estado de la KTM (realizada / contraindicada / no realizada) con su
//      bloque abierto, el nivel, la asistencia, los minutos, el Borg, las sesiones, IMT y EMS con sus parámetros, la válvula
//      con sus minutos, tolerancia y detalle.
//   2. Volver a guardar SIN TOCAR nada manda lo MISMO que se guardó la primera vez, el servidor lo acepta y la fila no cambia.
//      (Declarar el estado deja de ser «silencio»: ahora el payload sobrescribe los satélites, así que TODOS tienen que volver
//      a la pantalla, también la categoría de la contraindicación y el rótulo del fundamento.)
//   3. 🔴 «Reabrir» NO es «heredar»: un turno de noche reabierto sin KTM declarada sigue SIN declararla (no se inventa un
//      «no realizada», que entra al denominador de la estadística), y la tarjeta de noche sigue partiendo en blanco al ABRIR
//      uno nuevo (eso lo fija ktm_de_noche.js y ktm_nivel_no_se_cuela.js, que no se tocan).
//   4. También vale para un turno PASADO (la misma `fillForm`) y para el relato: lo que la pantalla muestra es lo que
//      «Regenerar» vuelve a narrar.
//
//   5. Dos CONTROLES que no estaban rotos y no deben romperse (verdes antes y después del arreglo, secciones 8 y 9): con AET
//      grupo IIIC de día el gate (`aplicarGatesEval`) esconde TODA la tarjeta de rehabilitación y marca la KTM «contraindicada»
//      sola; restaurar el estado ocurre ANTES de ese gate, así que el gate sigue ganando y reabrir no lo contradice. Y la fila de
//      día que nunca declaró estado se reabre sin inventarle uno.
//
// QUÉ NO CUBRE, A PROPÓSITO
//   · Un turno de DÍA que nunca declaró estado alguno (fila anterior al trío, o guardada por API sin pasar por la
//     pantalla) se reabre SIN estado elegido, como hasta hoy: inventarle «realizada» sería inflar el REM y dejarlo en «no
//     realizada» ya es lo que manda `guardar()`, que esta guardia no toca. La pantalla de hoy no puede producir ese caso.
//
// 🪤 Reloj congelado: la fecha se INVENTA (12-ago-2026 a las 11:00, lejos de las ventanas trampa) tanto en la página
// (`Date` fijo) como en el servidor (SIM). El turno que se prueba lo fuerza cada escenario en SHIFT.
//
// Uso: node build/checks/terapia_fisica_vuelve_al_reabrir.js
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const V2 = path.resolve(__dirname, '..', '..', 'v2');
const S = require('../sim/sim_srv.js');
const { api, DB, SIM } = S;

SIM.fecha = '2026-08-12'; SIM.hora = '11:00:00';

// 🔐 Desde el guardado seguro la pantalla manda un OP_ID con cada escritura y `api()` arma el sello con `_huellaPayload`,
// que vive en infra_lock.gs. El simulador no carga ese archivo (su `conLock` es un juguete) y sin él el guardado reventaba
// con «_huellaPayload is not defined». Se completa acá, igual que en acceso_pantalla.js, devolviendo el juguete: esta guardia
// prueba lo que la terapia física hace al reabrir, no el sello. (infra_respuesta va primero por las `const` de ERR.)
{ const conLockJuguete = global.conLock;
  (0, eval)(['infra_respuesta.gs', 'infra_lock.gs'].map(f => fs.readFileSync(path.join(V2, f), 'utf8')).join('\n;\n'));
  global.conLock = conLockJuguete; }

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

// Todo lo que viaja de la terapia física en el payload de `guardar()` (con sus satélites). Lo que la pantalla manda de esto
// al volver a guardar tiene que ser LO MISMO que mandó la primera vez.
const CLAVES_TF = ['KTM_REALIZADA', 'KTM_SUSPENDIDA', 'KTM_NO_REALIZADA', 'KTM_NO_RAZON', 'KTM_NO_COMENTARIO',
  'KTM_CONTRA_TIPO', 'KTM_CONTRA_CAT', 'KTM_CONTRA_RAZON', 'KTM_CONTRA_MANUAL', 'KTM_NIVEL_KTR', 'KTM_ASISTENCIA',
  'KTM_TIEMPO_MIN', 'KTM_SESIONES_JSON', 'KTM_BORG', 'KTM_CANT', 'EDU_REALIZADA', 'KTM_ALERTA', 'KTM_ALERTA_CAT', 'KTM_ALERTA_RAZ',
  'KTM_IMT', 'KTM_IMT_FREQ', 'KTM_IMT_INT', 'KTM_IMT_T', 'KTM_IMT_DES',
  'KTM_EMS', 'KTM_EMS_FREQ', 'KTM_EMS_INT', 'KTM_EMS_PULSO', 'KTM_EMS_T', 'KTM_EMS_GRUPO',
  'VFON_USADA', 'VFON_MIN', 'VFON_TOL', 'VFON_DET',
  // 🪤 Los procedimientos automáticos (IMT, EMS, educación) se derivan de estas casillas y también viajan guardados en
  // PROC_JSON: al reabrir vuelven por los dos lados. Es un conjunto (no suma dos veces), y esta guardia exige que no cambie.
  'PROC_JSON', 'PROC_RESUMEN', 'PROC_CANTIDAD'];
// Un booleano guardado como «false» o como vacío es lo mismo para la fila: se normaliza antes de comparar.
const norm = x => (x === false || x === 'FALSE' || x === 'false' || x === null || x === undefined) ? '' : String(x);

// Cada escenario trabaja en SU cama (un paciente ficticio con traqueostomía, para que la válvula de fonación esté a la vista).
const ingresar = (id) => {
  const r = api('INGRESAR_PACIENTE', { idCama: String(id), nombre: 'Paciente Ficticio ' + id, edad: 61, sexo: 'M', diagnostico: 'NAC grave',
    fechaIngreso: '2026-08-07', viaAerea: 'TQT', soporte: 'VM', modo: 'ACVC', firmaKine: 'DMV' }, null);
  if (!r.ok) throw new Error('no se pudo ingresar la cama ' + id + ': ' + r.error);
};
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].forEach(ingresar);

const filaDe = (id, tk) => DB.EVOLUCIONES.find(e => String(e.ID_EVOLUCION) === 'CAMA_' + id + '_' + tk) || {};

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 1500 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  // La pantalla habla con el servidor REAL (en memoria), no con respuestas armadas: lo que se guarda es lo que el servidor
  // acepta y lo que se reabre es lo que el servidor devuelve.
  await p.exposeFunction('__gasApi', (a, d, t) => {
    let r; try { r = api(a, d, t); } catch (e) { r = { ok: false, error: e.message }; }
    return JSON.stringify(r);
  });
  await p.addInitScript(() => {
    const FIJA = new Date(2026, 7, 12, 11, 0, 0).getTime(), RD = Date;
    function FD(...a) { if (!new.target) return new RD(FIJA).toString(); return a.length ? new RD(...a) : new RD(FIJA); }
    FD.prototype = RD.prototype; FD.now = () => FIJA; FD.UTC = RD.UTC; FD.parse = RD.parse; window.Date = FD;
    window._ll = []; window._toasts = [];
    window.google = { script: { run: { withSuccessHandler(o) { return { withFailureHandler(f) { return {
      async api(a, d, t) { const e = { a, d }; window._ll.push(e);
        const r = JSON.parse(await window.__gasApi(a, d || {}, t || null)); e.r = r; if (r.ok) o(r); else f(r.error); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.join(V2, 'index.html'));
  await p.waitForTimeout(800);

  /* Abre el turno (id, turno, fecha) con lo que el servidor tenga, y deja la pantalla en el paso de terapia física. */
  const abrir = (id, turno, fecha) => p.evaluate(async ([id, turno, fecha]) => {
    window.recargarSilencioso = () => {};
    DB = JSON.parse(await window.__gasApi('GET_TODAS_CAMAS', {}, null)).data;
    $('gDate').value = fecha; SHIFT = turno;
    window.Turnos.setRoster([{ f: 'K.T.', n: 'Kine Test' }]);
    renderGrid(); abrirPanel(String(id), false, false);
    await new Promise(r => setTimeout(r, 900));
    pasoIr(4); await new Promise(r => setTimeout(r, 250));
  }, [id, turno, fecha]);

  /* Hace lo que haría el colega (con los controles de verdad: clics y escritura), sin guardar. */
  const llenar = fn => p.evaluate(fn2 => { new Function('return (' + fn2 + ')')()(); }, fn);

  /* Guarda desde donde esté y devuelve lo que viajó y lo que contestó el servidor. NO toca nada de la terapia física. */
  const guardar = () => p.evaluate(async () => {
    const f = $('fFirma');
    if (![...f.options].some(o => o.value === 'K.T.')) f.appendChild(Object.assign(document.createElement('option'), { value: 'K.T.', textContent: 'K.T.' }));
    if (!f.value) f.value = 'K.T.';
    if (!$('fHEst').value) $('fHEst').value = 'Estable'; if (!$('fDVA').value) $('fDVA').value = 'Sin requerimientos';
    _transAvisoOk = true; window._toasts.length = 0; window.toast = m => { window._toasts.push(String(m)); };
    window._ll.length = 0; guardar();
    await new Promise(r => setTimeout(r, 700));
    const c = window._ll.find(x => x.a === 'GUARDAR_EVOLUCION');
    if (!c) return { sinLlamada: true, toasts: window._toasts.slice(), falta: (($('gFalta') || {}).textContent || '').trim() };
    return { d: c.d, ok: !!(c.r && c.r.ok), error: (c.r && c.r.error) || '', toasts: window._toasts.slice() };
  });

  /* Lo que la pantalla MUESTRA de la terapia física (en el paso 4, donde vive). */
  const pantalla = () => p.evaluate(() => {
    const ver = sel => { const e = document.querySelector(sel); if (!e) return false;
      const cs = getComputedStyle(e), r = e.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0); };
    const on = sel => Array.from(document.querySelectorAll(sel + '.on')).map(x => x.dataset.niv || x.dataset.asis || x.id).join(',');
    return {
      estado: _ktmEstado(), cKTMr: !!$('cKTMr').checked, cKTMs: !!$('cKTMs').checked,
      verR: ver('#dKTMr'), verS: ver('#dKTMs'), verN: ver('#dKTMn'),
      niv: v('fKTMniv'), nivBoton: on('.ktm-niv-btn'), asis: v('fKTMasis'), asisBoton: on('.ktm-asis-btn'), verAsis: ver('#dKTMasis'),
      min: v('fKTMt'), borg: v('fBorg'), edu: !!$('cEduReal').checked,
      sesiones: v('fKtmSesiones'), filasSesion: document.querySelectorAll('#ktmListaSes > div').length,
      derivado: _ktmDeriva().nivel + '/' + _ktmDeriva().cant,
      imt: !!$('cIMT').checked, verImt: ver('#dIMT'), imtP: ['fIMTfreq', 'fIMTint', 'fIMTt', 'fIMTdes'].map(v).join('|'),
      ems: !!$('cEMS').checked, verEms: ver('#dEMS'), emsP: ['fEMSfreq', 'fEMSint', 'fEMSpulso', 'fEMSt', 'fEMSgrupo'].map(v).join('|'),
      vfon: !!$('cVfon').checked, verVfonSec: ver('#dVfonSec'), verVfon: ver('#dVfonDet'), vfonP: ['fVfonMin', 'fVfonTol', 'fVfonDet'].map(v).join('|'),
      contra: v('fKTMcontra'), contraCat: v('fKTMcat'), contraMan: v('fKTMman'),
      noRaz: v('fKTMnoRaz'), noCom: v('fKTMnoCom'),
      rotuloFundamento: ($('lblKTMnoCom') || {}).textContent || '', rotuloRojo: ($('lblKTMnoCom') || { style: {} }).style.color || '',
    };
  });

  /* Un ciclo completo: abrir el turno, llenarlo, guardar, REABRIRLO desde el servidor, medir la pantalla y volver a guardar
     sin tocar nada. Devuelve todo lo que cada paso dejó para que el escenario afirme lo suyo. */
  const ciclo = async (id, turno, fecha, receta) => {
    const tk = fecha + '-' + turno;
    await abrir(id, turno, fecha);
    await llenar(receta);
    const g1 = await guardar();
    const fila1 = Object.assign({}, filaDe(id, tk));
    await abrir(id, turno, fecha);
    const pant = await pantalla();
    const relato = await p.evaluate(() => genTexto());
    const g2 = await guardar();
    const fila2 = Object.assign({}, filaDe(id, tk));
    return { tk, g1, fila1, pant, relato, g2, fila2 };
  };
  // Lo que viajó en un guardado (vacío si ese guardado ni siquiera salió de la pantalla: un «Falta:» o un aviso lo frenó).
  const D = g => (g && g.d) || {};
  const porQueNoSalio = g => (g && g.sinLlamada) ? '   ↳ la pantalla no lo mandó. Avisó: ' + g.toasts.join(' / ') + (g.falta ? ' · ' + g.falta : '') : '';
  const mismoPayload = (etq, c) => {
    si(etq + ': el primer guardado llegó al servidor', c.g1 && c.g1.d);
    if (porQueNoSalio(c.g1)) console.log(porQueNoSalio(c.g1));
    si(etq + ': el servidor aceptó el primer guardado', c.g1 && c.g1.ok);
    si(etq + ': volver a guardar llegó al servidor', c.g2 && c.g2.d);
    if (porQueNoSalio(c.g2)) console.log(porQueNoSalio(c.g2));
    si('★★ ' + etq + ': el servidor ACEPTA volver a guardar sin tocar nada', c.g2 && c.g2.ok);
    if (c.g2 && c.g2.d && !c.g2.ok) console.log('   ↳ el servidor dijo: ' + c.g2.error + (c.g2.toasts.length ? ' · pantalla: ' + c.g2.toasts.join(' / ') : ''));
    if (!(c.g1 && c.g1.d && c.g2 && c.g2.d)) return;
    const dist = CLAVES_TF.filter(k => norm(c.g1.d[k]) !== norm(c.g2.d[k]));
    eq('★★ ' + etq + ': volver a guardar sin tocar manda LO MISMO de la terapia física', dist.map(k => k + ': «' + norm(c.g1.d[k]) + '» → «' + norm(c.g2.d[k]) + '»').join(' · ') || '(idéntico)', '(idéntico)');
    const fdist = CLAVES_TF.filter(k => norm(c.fila1[k]) !== norm(c.fila2[k]));
    eq('★★ ' + etq + ': y la fila del servidor queda igual', fdist.map(k => k + ': «' + norm(c.fila1[k]) + '» → «' + norm(c.fila2[k]) + '»').join(' · ') || '(idéntica)', '(idéntica)');
  };

  /* Las recetas: lo que escribe el colega, con los controles de la pantalla. */
  const REC_COMPLETA = `() => {
    $('bKTMr').click();
    document.querySelector('.ktm-niv-btn[data-niv="3"]').click();
    document.querySelector('.ktm-asis-btn[data-asis="Mínima"]').click();
    $('fKTMt').value = '25'; $('fBorg').value = '4'; $('cEduReal').click();
    $('cIMT').click(); $('fIMTfreq').value = '3'; $('fIMTint').value = '30'; $('fIMTt').value = '10'; $('fIMTdes').value = '60';
    $('cEMS').click(); $('fEMSfreq').value = '50'; $('fEMSint').value = '60'; $('fEMSpulso').value = '400'; $('fEMSt').value = '30'; $('fEMSgrupo').value = 'Cuádriceps bilateral';
    $('cVfon').click(); $('fVfonMin').value = '30'; $('fVfonTol').value = 'Buena'; $('fVfonDet').value = 'Fonación audible, sin desaturación';
  }`;
  const COMPLETA = { estado: 'r', niv: '3', asis: 'Mínima', min: '25', borg: '4',
    imtP: '3|30|10|60', emsP: '50|60|400|30|Cuádriceps bilateral', vfonP: '30|Buena|Fonación audible, sin desaturación' };

  /* Lo que la pantalla tiene que mostrar de una terapia física COMPLETA tras reabrir. */
  const exigirCompleta = (etq, pant) => {
    eq('★★ ' + etq + ': el estado de la KTM vuelve («realizada»)', pant.estado, COMPLETA.estado);
    si('★★ ' + etq + ': …y su bloque está abierto', pant.verR);
    eq('★★ ' + etq + ': el nivel vuelve', pant.niv + '|' + pant.nivBoton, COMPLETA.niv + '|' + COMPLETA.niv);
    eq('★★ ' + etq + ': la asistencia vuelve (con su botón encendido)', pant.asis + '|' + pant.asisBoton, COMPLETA.asis + '|' + COMPLETA.asis);
    si('★ ' + etq + ': …y el bloque de asistencia está a la vista', pant.verAsis);
    eq('★★ ' + etq + ': los minutos vuelven', pant.min, COMPLETA.min);
    eq('★★ ' + etq + ': el Borg vuelve', pant.borg, COMPLETA.borg);
    si('★ ' + etq + ': la educación marcada sigue marcada', pant.edu);
    si('★★ ' + etq + ': IMT vuelve marcada', pant.imt);
    si('★★ ' + etq + ': …con su bloque abierto', pant.verImt);
    eq('★★ ' + etq + ': …y sus cuatro parámetros', pant.imtP, COMPLETA.imtP);
    si('★★ ' + etq + ': EMS vuelve marcada', pant.ems);
    si('★★ ' + etq + ': …con su bloque abierto', pant.verEms);
    eq('★★ ' + etq + ': …y sus cinco parámetros', pant.emsP, COMPLETA.emsP);
    si('(control: la válvula de fonación está a la vista con TQT)', pant.verVfonSec);
    si('★★ ' + etq + ': la válvula vuelve marcada', pant.vfon);
    si('★★ ' + etq + ': …con su detalle abierto', pant.verVfon);
    eq('★★ ' + etq + ': …y sus minutos, tolerancia y detalle', pant.vfonP, COMPLETA.vfonP);
  };

  /* ══ 1 · DÍA, terapia física completa ═══════════════════════════════════════ */
  console.log('\n1 · 🔴 DÍA: la terapia física completa vuelve entera y se puede volver a guardar');
  let c = await ciclo(3, 'Dia', '2026-08-12', REC_COMPLETA);
  console.log('   (control: el servidor guardó nivel «' + c.fila1.KTM_NIVEL_KTR + '», IMT «' + c.fila1.KTM_IMT + '», válvula «' + c.fila1.VFON_USADA + '»)');
  exigirCompleta('día', c.pant);
  mismoPayload('día', c);
  // El relato: «Regenerar» narra lo que la pantalla tiene. Antes narraba una terapia física inexistente.
  si('★ día: el relato que se regenera al reabrir narra la válvula de fonación', /válvula de fonación por 30 minutos/i.test(c.relato));
  si('★ día: …y la KTM con su nivel', /nivel 3/i.test(c.relato));

  /* ══ 2 · DÍA, dos sesiones ═══════════════════════════════════════════════════ */
  console.log('\n2 · 🔴 DÍA: dos sesiones de KTM vuelven como lista, con su cantidad y su nivel más alto');
  const REC_DOS = `() => {
    $('bKTMr').click();
    document.querySelector('.ktm-niv-btn[data-niv="2"]').click(); document.querySelector('.ktm-asis-btn[data-asis="Moderada"]').click();
    $('fKTMt').value = '15'; $('fBorg').value = '3'; $('btnKtmSesion').click();
    document.querySelector('.ktm-niv-btn[data-niv="3"]').click(); document.querySelector('.ktm-asis-btn[data-asis="Mínima"]').click();
    $('fKTMt').value = '20'; $('fBorg').value = '5'; $('btnKtmSesion').click();
  }`;
  c = await ciclo(4, 'Dia', '2026-08-12', REC_DOS);
  console.log('   (control: el servidor guardó nivel «' + c.fila1.KTM_NIVEL_KTR + '» y cantidad «' + c.fila1.KTM_CANT + '»)');
  eq('★★ dos sesiones: el estado vuelve («realizada»)', c.pant.estado, 'r');
  eq('★★ dos sesiones: la lista vuelve con sus dos filas', c.pant.filasSesion, 2);
  eq('★★ …y la pantalla deriva el nivel más alto y la cantidad', c.pant.derivado, '3/2');
  eq('(la siguiente sesión parte en blanco, como después de «Agregar»: el nivel que se re-guarda sale de la lista)', c.pant.niv + '|' + c.pant.nivBoton, '|');
  mismoPayload('dos sesiones', c);
  eq('★★ dos sesiones: el servidor sigue con nivel 3 y cantidad 2', c.fila2.KTM_NIVEL_KTR + '/' + c.fila2.KTM_CANT, '3/2');

  /* ══ 3 · NOCHE, terapia física completa ══════════════════════════════════════ */
  console.log('\n3 · 🔴 NOCHE: la terapia física que se llenó de noche vuelve entera (acuerdo 8.6: «lo que se llene de noche se guarda»)');
  c = await ciclo(5, 'Noche', '2026-08-12', REC_COMPLETA);
  exigirCompleta('noche', c.pant);
  mismoPayload('noche', c);
  eq('★★ noche: el IMT sigue en la fila del servidor tras reabrir y guardar', c.fila2.KTM_IMT + '/' + c.fila2.KTM_IMT_FREQ, 'true/3');
  eq('★★ noche: la EMS sigue', c.fila2.KTM_EMS + '/' + c.fila2.KTM_EMS_PULSO, 'true/400');
  eq('★★ noche: la válvula sigue', c.fila2.VFON_USADA + '/' + c.fila2.VFON_MIN, 'true/30');
  eq('★★ noche: el Borg y los minutos siguen', c.fila2.KTM_BORG + '/' + c.fila2.KTM_TIEMPO_MIN, '4/25');

  /* ══ 4 · NOCHE sin KTM declarada: reabrir no inventa nada ═════════════════════ */
  console.log('\n4 · 🔴 NOCHE sin KTM declarada (solo IMT): reabrir NO inventa una KTM, y el IMT vuelve');
  const REC_SOLO_IMT = `() => { $('cIMT').click(); $('fIMTfreq').value = '3'; $('fIMTint').value = '30'; }`;
  c = await ciclo(6, 'Noche', '2026-08-12', REC_SOLO_IMT);
  eq('(control: el primer guardado no declaró ningún estado de KTM)', [D(c.g1).KTM_REALIZADA, D(c.g1).KTM_SUSPENDIDA, D(c.g1).KTM_NO_REALIZADA].map(norm).join('|'), '||');
  eq('★★ el estado de la KTM sigue sin elegir al reabrir (ningún botón encendido)', c.pant.estado, '');
  no('★★ …y ningún bloque de estado abierto', c.pant.verR || c.pant.verS || c.pant.verN);
  eq('★★ …y no declara KTM al volver a guardar', [D(c.g2).KTM_REALIZADA, D(c.g2).KTM_SUSPENDIDA, D(c.g2).KTM_NO_REALIZADA].map(norm).join('|'), '||');
  si('★★ el IMT vuelve marcada, con su bloque abierto', c.pant.imt && c.pant.verImt);
  eq('★★ …y sus parámetros', c.pant.imtP.split('|').slice(0, 2).join('|'), '3|30');
  mismoPayload('noche sin KTM', c);

  /* ══ 5 · DÍA «contraindicada» y «no realizada» ═══════════════════════════════ */
  console.log('\n5 · 🔴 DÍA: «contraindicada» y «no realizada» vuelven con su razón y se pueden volver a guardar');
  const REC_SUSP = `() => {
    $('bKTMs').click(); const s = $('fKTMcontra'); s.selectedIndex = 1; s.dispatchEvent(new Event('change'));
    $('fKTMman').value = 'Sin estabilidad hemodinámica';
  }`;
  c = await ciclo(7, 'Dia', '2026-08-12', REC_SUSP);
  console.log('   (control: el servidor guardó razón «' + c.fila1.KTM_CONTRA_RAZON + '», categoría «' + c.fila1.KTM_CONTRA_CAT + '», tipo «' + c.fila1.KTM_CONTRA_TIPO + '»)');
  si('(control: la receta dejó una contraindicación elegida)', c.fila1.KTM_CONTRA_RAZON);
  eq('★★ contraindicada: el estado vuelve', c.pant.estado, 's');
  si('★★ …con su bloque abierto', c.pant.verS);
  eq('★★ …la razón elegida', c.pant.contra, c.fila1.KTM_CONTRA_RAZON);
  eq('★★ …y la observación', c.pant.contraMan, 'Sin estabilidad hemodinámica');
  mismoPayload('contraindicada', c);
  eq('★★ contraindicada: la categoría de la contraindicación no se pierde al volver a guardar', c.fila2.KTM_CONTRA_CAT + '|' + c.fila2.KTM_CONTRA_TIPO,
    c.fila1.KTM_CONTRA_CAT + '|' + c.fila1.KTM_CONTRA_TIPO);

  const REC_NO = `() => {
    $('bKTMn').click(); $('fKTMnoRaz').value = 'Otro'; hKTMnoRaz();
    $('fKTMnoCom').value = 'Paciente fuera de la unidad por estudio'; $('fKTMnoCom').dispatchEvent(new Event('input'));
  }`;
  c = await ciclo(8, 'Dia', '2026-08-12', REC_NO);
  eq('★★ no realizada: el estado vuelve', c.pant.estado, 'n');
  si('★★ …con su bloque abierto', c.pant.verN);
  eq('★★ …la razón y el fundamento', c.pant.noRaz + '|' + c.pant.noCom, 'Otro|Paciente fuera de la unidad por estudio');
  eq('★★ …el rótulo del fundamento NO queda en rojo con el texto ya escrito', c.pant.rotuloRojo, '');
  mismoPayload('no realizada', c);

  /* ══ 6 · DÍA con la KTM «realizada» por defecto y nada más ═══════════════════ */
  console.log('\n6 · 🔴 DÍA: lo más común —KTM «realizada» sin tocar nada más— ya no queda rechazado al reabrir');
  c = await ciclo(9, 'Dia', '2026-08-12', '() => {}');
  eq('(control: el primer guardado declaró «realizada»)', [D(c.g1).KTM_REALIZADA, D(c.g1).KTM_NO_REALIZADA].map(norm).join('|'), 'true|');
  eq('★★ el estado vuelve («realizada»)', c.pant.estado, 'r');
  eq('★★ …y no inventa un nivel que nadie eligió', c.pant.niv + '|' + c.pant.nivBoton, '|');
  eq('★★ …y volver a guardar NO manda «no realizada»', norm(D(c.g2).KTM_NO_REALIZADA), '');
  mismoPayload('día por defecto', c);

  /* ══ 7 · UN TURNO PASADO ═════════════════════════════════════════════════════ */
  console.log('\n7 · 🔴 Un turno PASADO (la misma fillForm): vuelve igual');
  c = await ciclo(10, 'Dia', '2026-08-10', REC_COMPLETA);
  exigirCompleta('turno pasado', c.pant);
  mismoPayload('turno pasado', c);

  /* ══ 8 · AET grupo IIIC: la tarjeta sigue escondida y el estado automático sigue mandando ═════════════ */
  console.log('\n8 · AET grupo IIIC de día: la KTM queda «contraindicada» sola, y reabrir no la destapa ni la rompe');
  // aplicarGatesEval esconde TODA la tarjeta de rehabilitación con AET IIIC y marca la KTM como contraindicada. Restaurar el
  // estado guardado ocurre ANTES de ese gate, así que el gate sigue ganando: reabrir no puede esconder lo restaurado ni
  // dejar un estado distinto del que el mismo gate escribió al guardar.
  const REC_AET = `() => { $('cAET').checked = true; $('fAETnivel').value = 'IIIC'; hAET(); aplicarGatesEval(); }`;
  c = await ciclo(11, 'Dia', '2026-08-12', REC_AET);
  eq('(control: el primer guardado declaró la KTM contraindicada por AET)', [D(c.g1).KTM_SUSPENDIDA, D(c.g1).KTM_CONTRA_RAZON].map(norm).join('|'), 'true|AET Grupo IIIC');
  eq('★★ el estado vuelve «contraindicada»', c.pant.estado, 's');
  no('★★ …y la tarjeta de rehabilitación sigue escondida por el AET', await p.evaluate(() => { const e = document.getElementById('fcKtmCard'); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }));
  mismoPayload('AET IIIC', c);

  /* ══ 9 · Una fila de día que NUNCA declaró estado: se reabre sin inventarle uno ═══════════════════════ */
  console.log('\n9 · 🔴 Una fila de DÍA sin KTM declarada (anterior al trío, o guardada por API): reabrir no le inventa estado');
  const rl = api('GUARDAR_EVOLUCION', { idCama: '12', turnoKey: '2026-08-12-Dia', PLAN_FIRMA_KINE: 'DMV', VENT_VIA_AEREA: 'TQT', VENT_SOPORTE: 'VM',
    VENT_MODO: 'ACVC', VENT_VT: 450, VENT_FR: 16, VENT_PEEP: 8, VENT_FIO2: 40, HEMO_ESTADO: 'Estable', HEMO_DVA: 'Sin requerimientos' }, null);
  eq('(control: la fila sembrada se guardó)', rl.ok, true);
  eq('(control: no trae ningún estado de KTM)', ['KTM_REALIZADA', 'KTM_SUSPENDIDA', 'KTM_NO_REALIZADA'].map(k => norm(filaDe(12, '2026-08-12-Dia')[k])).join('|'), '||');
  await abrir(12, 'Dia', '2026-08-12');
  const pl = await pantalla();
  eq('★★ ningún estado de KTM queda elegido (ni «realizada» ni «no realizada» inventadas)', pl.estado, '');
  no('★★ …y ningún bloque de estado abierto', pl.verR || pl.verS || pl.verN);
  eq('★★ …ni nivel, ni IMT, ni EMS, ni válvula inventados', [pl.niv, pl.imt, pl.ems, pl.vfon].join('|'), '|false|false|false');

  /* ══ 10 · Desmarcar IMT / EMS / educación tras reabrir ═══════════════════════ */
  console.log('\n10 · 🔴 Reabrir, DESMARCAR IMT / EMS / educación y guardar: se van de la lista de procedimientos (R13 y R19 de la revisión)');
  // El PROC_JSON guardado trae también los procedimientos AUTOMÁTICOS (IMT, EMS, EDUCACIÓN A USUARIO/FAMILIA), y fillForm lo cargaba
  // entero como procedimientos MANUALES (PROCS). Desde 4.2 reabrir devuelve esas tres casillas marcadas, así que el camino natural
  // de corregir un IMT marcado por error es desmarcarlo… y el chip «IMT×» seguía ahí: la fila quedaba con KTM_IMT falso pero
  // PROC_JSON ["IMT"], PROC_CANTIDAD 1 y una fila IMT en PROCEDIMIENTOS, y la estadística de procedimientos (que cuenta de PROC_JSON)
  // contaba un IMT que nadie hizo. Lo manual de verdad (lo que se escribió a mano) tiene que seguir ahí.
  const NOMBRES_AUTO = ['IMT', 'EMS', 'EDUCACIÓN A USUARIO/FAMILIA'];
  const procs = j => { try { return JSON.parse(j || '[]').slice().sort(); } catch (e) { return ['(JSON ilegible)']; } };
  const chipsManuales = () => p.evaluate(() => Array.from(document.querySelectorAll('#chips .chip')).map(c => c.firstChild.textContent.trim()).join('|'));
  const REC_PROC = `() => {
    $('bKTMr').click(); $('cEduReal').click();
    $('cIMT').click(); $('fIMTfreq').value = '3'; $('fIMTint').value = '30';
    $('cEMS').click(); $('fEMSfreq').value = '50'; $('fEMSint').value = '60';
    $('inProc').value = 'ASPIRACIÓN BRONQUIAL'; addProc();
  }`;
  const REC_DESMARCAR = `() => { if ($('cIMT').checked) $('cIMT').click(); if ($('cEMS').checked) $('cEMS').click(); if ($('cEduReal').checked) $('cEduReal').click(); }`;
  const fechaProc = '2026-08-12', tkProc = fechaProc + '-Dia';
  await abrir(1, 'Dia', fechaProc);
  await llenar(REC_PROC);
  let gp1 = await guardar();
  const fp1 = Object.assign({}, filaDe(1, tkProc));
  eq('(control: el primer guardado lleva los tres automáticos una vez, y el manual)', procs(fp1.PROC_JSON).join('|'),
    ['ASPIRACIÓN BRONQUIAL'].concat(NOMBRES_AUTO).sort().join('|'));
  // Reabrir SIN tocar nada: lo automático sigue ahí (una sola vez) y no vuelve como chip manual.
  await abrir(1, 'Dia', fechaProc);
  eq('★★ al reabrir, los chips manuales son SOLO lo manual (no «IMT×», «EMS×», «EDUCACIÓN…×»)', await chipsManuales(), 'ASPIRACIÓN BRONQUIAL');
  si('(control: …y las tres casillas vuelven marcadas)', await p.evaluate(() => $('cIMT').checked && $('cEMS').checked && $('cEduReal').checked));
  let gp2 = await guardar();
  eq('★★ reabrir y guardar SIN tocar: la lista de procedimientos queda igual (nada se pierde ni se duplica)', procs(D(gp2).PROC_JSON).join('|'), procs(fp1.PROC_JSON).join('|'));
  eq('★★ …y la cantidad', D(gp2).PROC_CANTIDAD + '/' + filaDe(1, tkProc).PROC_CANTIDAD, '4/4');
  // Reabrir, desmarcar las tres y guardar: la lista se queda con lo manual.
  await abrir(1, 'Dia', fechaProc);
  await llenar(REC_DESMARCAR);
  let gp3 = await guardar();
  const fp3 = Object.assign({}, filaDe(1, tkProc));
  si('(control: el guardado tras desmarcar llegó al servidor y lo aceptó)', gp3.d && gp3.ok);
  eq('(control: la pantalla mandó las tres casillas apagadas)', [D(gp3).KTM_IMT, D(gp3).KTM_EMS, D(gp3).EDU_REALIZADA].map(norm).join('|'), '||');
  eq('★★ PROC_JSON que viaja: sin IMT, EMS ni educación (quedó solo lo manual)', procs(D(gp3).PROC_JSON).join('|'), 'ASPIRACIÓN BRONQUIAL');
  eq('★★ …y la fila del servidor igual', procs(fp3.PROC_JSON).join('|'), 'ASPIRACIÓN BRONQUIAL');
  eq('★★ …con su cantidad y su resumen', fp3.PROC_CANTIDAD + '|' + fp3.PROC_RESUMEN, '1|ASPIRACIÓN BRONQUIAL');
  eq('(control: la fila tampoco conserva las casillas)', [fp3.KTM_IMT, fp3.KTM_EMS, fp3.EDU_REALIZADA].map(norm).join('|'), '||');
  // Y volver a marcarlas las suma otra vez (se regeneran solas, no hay que apuntarlas a mano).
  await abrir(1, 'Dia', fechaProc);
  await llenar(`() => { $('cIMT').click(); $('cEduReal').click(); }`);
  let gp4 = await guardar();
  eq('★★ marcar otra vez IMT y la educación las vuelve a sumar (se derivan solas de la casilla)', procs(D(gp4).PROC_JSON).join('|'),
    ['ASPIRACIÓN BRONQUIAL', 'IMT', 'EDUCACIÓN A USUARIO/FAMILIA'].sort().join('|'));

  /* ══ 11 · Una fila del modelo viejo (KTM_CANT > 1 y SIN lista de sesiones) ═════ */
  console.log('\n11 · 🔴 Una fila ANTERIOR a la lista de sesiones (KTM_CANT = 2, sin lista): reabrir y guardar sin tocar NO rebaja la cantidad (R14 y R17)');
  // Antes del modelo de lista, la cantidad vivía solo en KTM_CANT y los datos (nivel, asistencia, minutos) eran de «la» sesión. El
  // servidor sigue leyéndolas así (`ktmSesiones`: cantidad = KTM_CANT, una sola ficha), y el REM suma KTM_CANT. La pantalla, en cambio,
  // deriva la cantidad de la lista y sin lista contaba UNA: reabrir y guardar sin tocar nada bajaba el 2 a 1 en silencio, y con él las
  // sesiones del REM del mes. 🔴 No se inventan sesiones ni minutos: la solución no puede ser fabricar dos sesiones iguales (los minutos
  // se sumarían doble y el relato narraría dos sesiones que nadie escribió). Se conserva la cantidad guardada mientras nadie toque la lista.
  const semilla = (id, turno, extra) => api('GUARDAR_EVOLUCION', Object.assign({ idCama: String(id), turnoKey: '2026-08-12-' + turno, PLAN_FIRMA_KINE: 'DMV',
    VENT_VIA_AEREA: 'TQT', VENT_SOPORTE: 'VM', VENT_MODO: 'ACVC', VENT_VT: 450, VENT_FR: 16, VENT_PEEP: 8, VENT_FIO2: 40,
    HEMO_ESTADO: 'Estable', HEMO_DVA: 'Sin requerimientos' }, extra), null);
  const remKTM = f => (String(f.KTM_REALIZADA) === 'true' || f.KTM_REALIZADA === true) ? Math.min(9, Math.max(1, parseInt(f.KTM_CANT) || 1)) : 0;   // lo que suma svc_rem.gs
  const VIEJA = { KTM_REALIZADA: true, KTM_NIVEL_KTR: '3', KTM_CANT: 2, KTM_ASISTENCIA: 'Mínima', KTM_TIEMPO_MIN: 20 };
  for (const [id, turno, etq] of [[2, 'Dia', 'de día'], [3, 'Noche', 'de noche']]) {
    const tkv = '2026-08-12-' + turno;
    const rs = semilla(id, turno, turno === 'Noche' ? Object.assign({ KTM_NO_REALIZADA: '' }, VIEJA) : VIEJA);
    eq('(control: la fila vieja ' + etq + ' se sembró)', rs.ok, true);
    const f0 = Object.assign({}, filaDe(id, tkv));
    eq('(control: la fila vieja ' + etq + ' no trae lista y dice 2 sesiones)', (f0.KTM_SESIONES_JSON || '') + '|' + f0.KTM_CANT, '|2');
    await abrir(id, turno, '2026-08-12');
    const pv = await pantalla();
    const relatoV = await p.evaluate(() => genTexto());
    eq('(control: reabrir devuelve el estado, el nivel, la asistencia y los minutos de siempre)', [pv.estado, pv.niv, pv.asis, pv.min].join('|'), 'r|3|Mínima|20');
    eq('★★ ' + etq + ': la pantalla NO inventa sesiones (la lista queda vacía)', pv.filasSesion + '|' + pv.sesiones, '0|');
    si('★ ' + etq + ': …y el relato que se regenera dice las 2 sesiones, como las narra el servidor con esta fila', /Se realizan 2 sesiones de KTM nivel 3/.test(relatoV));
    const gv = await guardar();
    si('(control: volver a guardar ' + etq + ' llegó al servidor y lo aceptó)', gv.d && gv.ok);
    const f1 = Object.assign({}, filaDe(id, tkv));
    eq('★★ ' + etq + ': volver a guardar SIN tocar manda la cantidad guardada (2), no 1', String(D(gv).KTM_CANT), '2');
    eq('★★ ' + etq + ': …y la fila del servidor sigue en 2', String(f1.KTM_CANT), '2');
    eq('★★ ' + etq + ': …así que las sesiones que suma el REM no cambian', remKTM(f1), remKTM(f0));
    eq('★★ ' + etq + ': …sin inventar una lista de sesiones', (D(gv).KTM_SESIONES_JSON || '') + '|' + (f1.KTM_SESIONES_JSON || ''), '|');
    eq('★★ ' + etq + ': …ni minutos (siguen siendo los 20 de la única ficha)', String(D(gv).KTM_TIEMPO_MIN) + '|' + f1.KTM_TIEMPO_MIN, '20|20');
    eq('★★ ' + etq + ': …y el nivel y la asistencia no se tocan', f1.KTM_NIVEL_KTR + '|' + f1.KTM_ASISTENCIA, '3|Mínima');
  }
  // Si la persona EDITA la lista de sesiones, la cantidad pasa a salir de la lista (ya no hay nada «viejo» que conservar).
  await abrir(2, 'Dia', '2026-08-12');
  await llenar(`() => { $('btnKtmSesion').click(); }`);
  const pAgr = await pantalla();
  eq('(la lista editada manda: una sesión agregada = una fila)', pAgr.filasSesion + '|' + pAgr.derivado, '1|3/1');
  const gAgr = await guardar();
  eq('★★ …y al guardar la cantidad es la de la lista (1), ya no la vieja', String(D(gAgr).KTM_CANT) + '|' + filaDe(2, '2026-08-12-Dia').KTM_CANT, '1|1');
  // Y si después la persona QUITA esa sesión, la cantidad vieja no «resucita»: tocar la lista la soltó para siempre en este turno.
  // (Otra fila vieja, de noche: la de día ya se reescribió con su lista.)
  eq('(control: otra fila vieja de 2 sesiones, de noche, se sembró)', semilla(2, 'Noche', Object.assign({ KTM_NO_REALIZADA: '' }, VIEJA)).ok, true);
  await abrir(2, 'Noche', '2026-08-12');
  await llenar(`() => { $('btnKtmSesion').click(); ktmQuitarSesion(0); }`);
  const pQui = await pantalla();
  eq('(agregar pasó el nivel a la lista y quitar la dejó vacía: ni lista ni nivel suelto)', pQui.filasSesion + '|' + pQui.sesiones + '|' + pQui.niv, '0||');
  const gQui = await guardar();
  eq('★★ …y la cantidad que viaja es 1, no el 2 viejo que ya se soltó', String(D(gQui).KTM_CANT), '1');
  // Una fila vieja de 1 sesión sigue igual (el caso que ya andaba).
  eq('(control: una fila de una sola sesión sin lista sigue mandando 1)', await (async () => {
    const r = semilla(9, 'Noche', { KTM_NO_REALIZADA: '', KTM_REALIZADA: true, KTM_NIVEL_KTR: '2', KTM_CANT: 1, KTM_TIEMPO_MIN: 15 });
    if (!r.ok) return 'no se sembró: ' + r.error;
    await abrir(9, 'Noche', '2026-08-12'); const g = await guardar(); return String(D(g).KTM_CANT); })(), '1');

  /* ══ 12 · Borg 0 ═════════════════════════════════════════════════════════════ */
  console.log('\n12 · 🔴 Un Borg de 0 es un valor: vuelve como 0 y no se confunde con «vacío» (R15)');
  // «Esfuerzo percibido 0» (reposo) es un dato clínico. El comentario de fillForm lo promete («se escribe tal cual»), pero la guardia
  // solo usaba Borg 4: una versión «simplificada» (`s.KTM_BORG ? String(s.KTM_BORG) : ''`) lo habría descartado y la batería seguía verde.
  const REC_BORG0 = `() => { $('bKTMr').click(); document.querySelector('.ktm-niv-btn[data-niv="2"]').click(); $('fKTMt').value = '20'; $('fBorg').value = '0'; }`;
  c = await ciclo(4, 'Noche', '2026-08-12', REC_BORG0);
  eq('(control: el primer guardado mandó el Borg 0)', String(D(c.g1).KTM_BORG), '0');
  eq('★★ Borg 0: la pantalla lo devuelve como «0», no como vacío', c.pant.borg, '0');
  mismoPayload('Borg 0', c);
  eq('★★ Borg 0: la fila del servidor lo conserva tras reabrir y guardar', String(c.fila2.KTM_BORG), '0');
  // La hoja puede devolver ese 0 como NÚMERO (una celda sin formato de texto, una fila importada): es el valor que más fácil se pierde
  // con un `if (valor)`. Se le da a fillForm la fila real con el Borg como número 0.
  await abrir(4, 'Noche', '2026-08-12');
  const filaB = Object.assign({}, filaDe(4, '2026-08-12-Noche'), { KTM_BORG: 0 });
  eq('★★ Borg 0 devuelto como NÚMERO por la hoja: también vuelve como «0»', await p.evaluate(f => { fillForm(f); return v('fBorg'); }, filaB), '0');
  // …y un Borg vacío sigue vacío (el 0 no se inventa).
  eq('(control: un Borg vacío sigue vacío)', await p.evaluate(f => { fillForm(Object.assign({}, f, { KTM_BORG: '' })); return v('fBorg'); }, filaB), '');

  /* ══ 13 · Asistencia suelta con una lista de sesiones ═══════════════════════ */
  console.log('\n13 · 🔴 Una sesión en la lista MÁS una asistencia suelta (sin nivel): la asistencia vuelve a la vista (R15)');
  // Con una lista de sesiones, el nivel NO vuelve a los campos sueltos (se deriva de la lista) y por eso `setKTMniv` no corre y no
  // abre el bloque de asistencia: quien lo abre es la línea propia de la asistencia en fillForm. Con el nivel también restaurado, esa
  // línea quedaba tapada (setKTMniv ya muestra el bloque) y quitarla no fallaba nunca. Éste es el caso en que SOLO ella lo abre.
  const REC_LISTA_ASIS = `() => {
    $('bKTMr').click(); document.querySelector('.ktm-niv-btn[data-niv="2"]').click(); document.querySelector('.ktm-asis-btn[data-asis="Moderada"]').click();
    $('fKTMt').value = '15'; $('fBorg').value = '3'; $('btnKtmSesion').click();
    document.querySelector('.ktm-asis-btn[data-asis="Mínima"]').click();
  }`;
  c = await ciclo(7, 'Noche', '2026-08-12', REC_LISTA_ASIS);
  eq('(control: el primer guardado mandó una sesión en la lista y la asistencia suelta)', [D(c.g1).KTM_SESIONES_JSON ? JSON.parse(D(c.g1).KTM_SESIONES_JSON).length : 0, D(c.g1).KTM_ASISTENCIA].join('|'), '1|Mínima');
  eq('★★ la lista vuelve con su sesión', c.pant.filasSesion, 1);
  eq('★★ …y el nivel suelto NO se inventa (sale de la lista)', c.pant.niv + '|' + c.pant.nivBoton, '|');
  eq('★★ …la asistencia suelta vuelve, con su botón encendido', c.pant.asis + '|' + c.pant.asisBoton, 'Mínima|Mínima');
  si('★★ …y el bloque de asistencia está A LA VISTA (si no, la asistencia viajaría sin que nadie la vea)', c.pant.verAsis);
  mismoPayload('lista + asistencia suelta', c);

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ terapia_fisica_vuelve_al_reabrir: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
