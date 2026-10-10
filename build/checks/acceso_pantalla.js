// acceso_pantalla.js — 🔐 LA PUERTA DEL TURNO, EN UN NAVEGADOR DE VERDAD
// (15-sep-2026).
//
// `acceso_equipo.js` prueba el servidor: claves, sesiones, espera por intentos.
// Esta prueba lo OTRO, que es donde se rompen los login: que con el candado
// puesto la app no se abra sola, que la puerta aparezca, que al entrar con la
// clave correcta se pase, y que una clave temporal obligue a elegir una nueva
// antes de dejar entrar.
//
// 🪤 Por qué hace falta además de la del servidor: un login puede estar
// perfecto por dentro y no servir porque la pantalla nunca lo llama, o porque
// llama a la acción equivocada, o porque el token no viaja. Eso no se ve
// leyendo el código; se ve abriendo la app.
//
// 🪤 El estado arranca APAGADO y se enciende dentro de la propia corrida, con
// el mismo `accesoEncender()` que va a usar Diego. Así se prueba también que
// encenderlo no requiera pegar nada.
//
// 🔴 SESIÓN CORTADA EN PLENO GUARDADO (F3B, revisión adversarial, 4-oct-2026).
// Secciones 6 a 9. Con el candado puesto, el servidor contesta «Entra con tu
// clave para registrar.» a una sesión cortada (cambió su clave, la dieron de baja).
// El guardado de la evolución buscaba otras palabras («Sesión no válida|Inicia
// sesión»; solo `gs()` conocía «Entra con tu clave»), así que no la reconocía: lo
// trataba como red caída, reintentaba solo a los 3 s y terminaba en «revisa la
// red». El kinesiólogo creía que fallaba el internet, no que lo habían sacado.
// El contrato que se fija acá, contra el servidor REAL y en la pantalla real:
//   · sesión cortada → la puerta de entrada, UN solo viaje (no se reintenta solo),
//     el formulario escrito INTACTO y abierto, y tras entrar se puede volver a
//     guardar SIN recargar la página (recargar lo borraba);
//   · «No se pudo comprobar tu sesión» (la planilla no respondió; la sesión puede
//     estar perfecta) → NUNCA la puerta: error reintentable con el formulario
//     intacto. Se prueba con las DOS redacciones, la que el servidor contesta hoy
//     y la que se discutió, para que cambiar la frase no reabra el defecto;
//   · el reconocimiento vive en UN solo lugar y lo usan todos los caminos,
//     incluidos los de Coordinación.
//
// 🪤 EL RELOJ VA CONGELADO (2026-08-10 12:00, un lunes lejos de Fiestas Patrias
// y del cambio de turno): el guardado escribe la evolución del TURNO, y a qué
// turno pertenece depende de la hora. La fecha se INVENTA, no se espera.
//
// Uso: node build/checks/acceso_pantalla.js
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const S = require(path.join(__dirname, '..', 'sim', 'sim_srv.js'));

// El simulador no carga los módulos de identidad: se completan acá igual que
// hace `rut_minimo.js`, sin tocar su lista (otras guardias dependen de ella).
// 🪤 `infra_respuesta.gs` va primero aunque el simulador ya lo cargó: sus
// `const` (ERR y los códigos de error) NO cuelgan de globalThis con eval
// indirecto —solo function y var lo hacen—, así que un servicio evaluado en
// OTRO ámbito revienta con «ERR is not defined» en cuanto toma un camino de
// error. Acá se vio con una clave equivocada: el camino feliz pasaba y el
// mensaje de error moría. Es la misma trampa anotada en CLAUDE.md.
const V2 = path.resolve(__dirname, '..', '..', 'v2');
(0, eval)(['infra_respuesta.gs', 'infra_auth.gs', 'svc_acceso.gs']
  .map(f => fs.readFileSync(path.join(V2, f), 'utf8')).join('\n;\n'));
// 🔐 Desde el paso 12 del guardado seguro (5-oct-2026) la pantalla manda un OP_ID con cada escritura y `api()` (api.gs) arma el
// sello con `_huellaPayload`, que vive en infra_lock.gs. El simulador no carga ese archivo (su `conLock` es un juguete), y sin él
// el guardado reventaba con «_huellaPayload is not defined» —el banco no tenía el módulo que la app real siempre tiene—. Se
// completa acá, como los módulos de identidad de arriba y por la misma razón (la lista del simulador no se toca). 🪤 Evaluar
// infra_lock.gs también define su `conLock` de verdad, que pide LockService: se devuelve el juguete, porque este banco prueba
// la puerta del turno y no el sello (eso lo hace guardado_seguro_operacion_g16.js con el candado real).
{ const conLockJuguete = global.conLock;
  (0, eval)(fs.readFileSync(path.join(V2, 'infra_lock.gs'), 'utf8'));
  global.conLock = conLockJuguete; }

const pad = n => String(n).padStart(2, '0');
// Reloj INVENTADO y congelado también en la pantalla (ver `addInitScript` más abajo).
const HOY = new Date(2026, 7, 10, 12, 0, 0);
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
S.SIM.fecha = iso(HOY);
S.SIM.hora = '11:00:00';
for (let i = 1; i <= 4; i++) {
  const c = S.DB.CAMAS_ESTADO.find(x => String(x.ID_CAMA) === String(i));
  Object.assign(c, { OCUPADA: true, STATUS_CAMA: 'Ocupada', PATIENT_ID: 'p' + i, COD_PACIENTE: 'C' + i,
    NOMBRE: 'Paciente ' + i, EDAD: 60 + i, SEXO: 'F', DIAGNOSTICO: 'Neumonía grave',
    VIA_AEREA: 'TOT', SOPORTE: 'VM', MODO: 'ACVC', TALLA_CM: 165,
    FECHA_INGRESO: iso(new Date(HOY - 5 * 864e5)), FIRMA_KINE: 'DMV' });
}
// La cama 5 es la del guardado (secciones 6 a 9): vía aérea natural, para que el
// formulario real se llene con lo mínimo y el servidor real lo acepte.
Object.assign(S.DB.CAMAS_ESTADO.find(x => String(x.ID_CAMA) === '5'), {
  OCUPADA: true, STATUS_CAMA: 'Ocupada', PATIENT_ID: 'p5', COD_PACIENTE: 'C5',
  NOMBRE: 'Paciente 5', EDAD: 65, SEXO: 'F', DIAGNOSTICO: 'Neumonía',
  VIA_AEREA: 'Natural', SOPORTE: 'Ambiente', MODO: '', TALLA_CM: 165,
  FECHA_INGRESO: iso(new Date(HOY - 5 * 864e5)), FIRMA_KINE: 'DMV' });

// Instrumentos del servidor simulado:
//  · LLAMADAS: qué acciones llegaron al servidor, en orden (cuántos viajes de guardado hubo).
//  · HOJA_CAIDA: Sheets no responde al leer KINESIOLOGOS (la misma simulación que usa
//    acceso_revocacion.js). Es la forma de que el servidor REAL conteste «No se pudo
//    comprobar tu sesión» en vez de que la guardia invente el texto.
const LLAMADAS = [];
const llamadas = a => LLAMADAS.filter(x => x === a).length;
let HOJA_CAIDA = false;
const _repoLeerTodos = global.repoLeerTodos;
global.repoLeerTodos = function (hoja) {
  if (hoja === 'KINESIOLOGOS' && HOJA_CAIDA) throw new Error('sim: la hoja KINESIOLOGOS no responde');
  return _repoLeerTodos.apply(null, arguments);
};

const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined ? '' : ' — ' + detalle));
  if (!cond) fails.push(l);
};

(async () => {
  /* ── Se enciende con la misma función que usará Diego ─────────────────── */
  const sembradas = global.accesoSembrarClaves();
  si('accesoSembrarClaves reparte una clave por kinesiólogo activo',
    sembradas.length >= 3, sembradas.length + ' claves');
  const CLAVE_TEMP = String(sembradas.find(x => /^DMV/.test(x)) || '').split('→ ').pop().trim();
  si('la clave temporal de DMV se pudo leer del reparto', CLAVE_TEMP.length >= 6, CLAVE_TEMP);
  si('🔴 accesoEncender() funciona una vez repartidas', global.accesoEncender() === true);
  si('…y la configuración quedó encendida', global.accesoActivo() === true);

  const compilado = path.join(__dirname, '..', '_acceso.html');
  fs.writeFileSync(compilado, fs.readFileSync(path.join(V2, 'index.html'), 'utf8').replace(/<\?=[\s\S]*?\?>/g, ''));

  const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  pagina.on('pageerror', e => errores.push(e.message));
  await pagina.exposeFunction('__gasApi', (a, d, t) => {
    LLAMADAS.push(a);
    let r; try { r = global.api(a, d, t); } catch (e) { r = { ok: false, error: 'EXCEPCIÓN: ' + e.message }; }
    return JSON.stringify(r);
  });
  await pagina.addInitScript(({ congelado }) => {
    // Reloj congelado (la forma de `fiestas_patrias.js` y `episodio_al_guardar.js`).
    const Real = Date;
    function Falso(...a) { return a.length ? new Real(...a) : new Real(congelado); }
    Falso.now = () => congelado; Falso.parse = Real.parse; Falso.UTC = Real.UTC; Falso.prototype = Real.prototype;
    window.Date = Falso;
    window.google = { script: { run: { withSuccessHandler(o) { return { withFailureHandler(f) { return {
      async api(a, d, t) { const r = JSON.parse(await window.__gasApi(a, d || {}, t || null)); if (r.ok) o(r); else f(r.error); }
    }; } }; } } } };
  }, { congelado: HOY.getTime() });
  await pagina.goto('file://' + compilado);
  await pagina.waitForTimeout(1800);

  const visible = id => pagina.evaluate(i => {
    const n = document.getElementById(i); if (!n) return false;
    const r = n.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(n).display !== 'none';
  }, id);

  /* ── 1 · Con el candado puesto, la app no se abre sola ────────────────── */
  si('🔴 con el acceso puesto la app NO entra sola: aparece la puerta', await visible('loginOvl'),
    'la pantalla de acceso no se mostró y el censo quedó a la vista de cualquiera');
  si('…y la puerta es la del turno, no la de Google', await visible('accForm'));
  si('…con su campo de firma y su campo de clave',
    (await visible('accUsr')) && (await visible('accClave')));
  si('…y NO se dibujó la grilla de camas detrás',
    (await pagina.evaluate(() => document.querySelectorAll('#bedGrid .bcard').length)) === 0,
    'el censo se pintó igual: el candado no está frenando la carga');

  /* ── 2 · Una clave equivocada no entra, y lo dice ─────────────────────── */
  await pagina.fill('#accUsr', 'DMV');
  await pagina.fill('#accClave', 'no-es-esta');
  await pagina.click('#accBtn');
  await pagina.waitForTimeout(700);
  si('con la clave equivocada no se entra', await visible('accForm'));
  si('…y la pantalla explica por qué',
    /incorrect/i.test(await pagina.textContent('#loginMsg') || ''),
    await pagina.textContent('#loginMsg'));

  /* ── 3 · La clave temporal obliga a elegir una nueva ──────────────────── */
  await pagina.fill('#accClave', CLAVE_TEMP);
  await pagina.click('#accBtn');
  await pagina.waitForTimeout(900);
  si('🔴 con una clave temporal NO se entra de largo: pide una propia',
    await visible('accNuevaBox'),
    'entró con la clave que le repartió otra persona');
  si('…y lo dice con todas sus letras',
    /temporal/i.test(await pagina.textContent('#loginMsg') || ''),
    await pagina.textContent('#loginMsg'));

  /* ── 4 · Con la clave nueva se entra y la identidad queda puesta ──────── */
  await pagina.fill('#accNueva', 'mi-clave-propia');
  await pagina.click('#accBtn');
  await pagina.waitForTimeout(2200);          // cambia la clave y recarga

  si('tras elegir su clave, la puerta se cierra', !(await visible('loginOvl')));
  si('…y ahora sí se pinta el censo',
    (await pagina.evaluate(() => document.querySelectorAll('#bedGrid .bcard').length)) > 0);
  si('🔴 la cabecera muestra la firma de quien entró, no «Sin usuario»',
    (await pagina.textContent('#hSesUsrTxt') || '').trim() === 'DMV',
    'dice: ' + (await pagina.textContent('#hSesUsrTxt') || ''));
  si('el token quedó guardado para sobrevivir a un F5',
    !!(await pagina.evaluate(() => { try { return sessionStorage.getItem('rce_acceso_token'); } catch (e) { return null; } })));

  /* ── 5 · La clave vieja ya no sirve, y el servidor lo confirma ────────── */
  si('la clave temporal dejó de servir',
    global.accesoEntrar({ usuario: 'dmv', clave: CLAVE_TEMP }).ok === false);
  si('la clave elegida por la persona sirve',
    global.accesoEntrar({ usuario: 'dmv', clave: 'mi-clave-propia' }).ok === true);

  /* ══ 6 · 🔴 La sesión se corta en pleno guardado ═══════════════════════════
     Una persona escribe su evolución; mientras tanto le cambian la clave (o la
     dan de baja), que es lo que corta sus sesiones. Aprieta 💾. El servidor REAL
     contesta «Entra con tu clave para registrar.». */
  const TEXTO_FORM = 'bipedestación asistida con apoyo';
  const NO_VERIF_REAL = global.accesoRespuestaNoVerificable().error;
  const NO_VERIF_OTRA = 'No se pudo comprobar tu sesión, intenta de nuevo';
  /** Toca un botón si se deja tocar; si no, no se cuelga esperándolo (la guardia tiene que poder ponerse roja). */
  const tocarSiHay = async sel => {
    try { await pagina.click(sel, { timeout: 4000 }); return true; }
    catch (e) { si('(no se pudo seguir) no se pudo tocar ' + sel, false, String(e.message).split('\n')[0]); return false; }
  };
  const tokenDe = () => pagina.evaluate(() => { try { return sessionStorage.getItem('rce_acceso_token'); } catch (e) { return null; } });
  const borradores = () => pagina.evaluate(() => Object.keys(localStorage).filter(k => /^CAMA_5_/.test(k)).length);
  /** Lo que hay en pantalla alrededor del guardado. */
  const estado = () => pagina.evaluate(() => {
    const e = document.getElementById('gEstadoGuardado'), sp = document.getElementById('sp');
    const modal = document.getElementById('avErrOvl');
    return {
      panelAbierto: !!(sp && sp.classList.contains('on')),
      cama: (document.getElementById('cBed') || {}).value,
      planes: (document.getElementById('fPlanes') || {}).value,
      sucio: typeof _formDirty !== 'undefined' && _formDirty === true,
      franja: e ? e.dataset.estado : null,
      hayReintento: typeof _reintentoGuardado === 'function',
      modalAbierto: !!(modal && modal.classList.contains('on')),
      modalTexto: (document.getElementById('avErrMsg') || {}).textContent || '',
      toasts: (window.__toasts || []).slice(),
      marca: window.__marca || null,
      botonGuardar: (document.getElementById('btnGuardar') || {}).textContent || '',
    };
  });

  await pagina.evaluate(async () => {
    window.__marca = 'misma-pagina';      // si la página se recarga, esto desaparece
    window.__toasts = []; window.toast = m => window.__toasts.push(String(m));
    abrirPanel('5', false, false);
    await new Promise(r => setTimeout(r, 700));
    // El formulario lleno como lo llenaría un colega: la hemodinamia y la vía aérea son OBLIGATORIAS y no se
    // rellenan solas (una guardia que las pusiera sola taparía el caso «nadie la miró»).
    const f = $('fFirma'); if (![...f.options].some(o => o.value === 'DMV')) f.innerHTML += '<option value="DMV">DMV</option>';
    f.value = 'DMV';
    $('fHEst').value = 'Estable'; $('fDVA').value = 'Sin requerimientos';
    if (!$('fVA').value) $('fVA').value = 'Natural';
    $('fPlanes').value = 'bipedestación asistida con apoyo';
    if (typeof _transAvisoOk !== 'undefined') _transAvisoOk = true;
    _formDirty = true;
  });
  const antesPanel = await estado();
  si('(control) el formulario real de la cama 5 quedó abierto, lleno y sin guardar',
    antesPanel.panelAbierto && antesPanel.cama === '5' && antesPanel.planes === TEXTO_FORM && antesPanel.sucio,
    JSON.stringify(antesPanel));

  global.accesoDefinirClave('DMV', 'mi-clave-propia');          // corta TODAS las sesiones de DMV, también la de la pantalla
  const viajes0 = llamadas('GUARDAR_EVOLUCION');
  await pagina.evaluate(() => { guardar(); });
  await pagina.waitForTimeout(1200);
  const cortada1 = await estado();
  si('🔴 sesión cortada al guardar: aparece la puerta de entrada', (await visible('loginOvl')) && (await visible('accForm')),
    'la pantalla creyó que era la red: ' + JSON.stringify(cortada1.toasts));
  si('🔴 …y el formulario se CONSERVA: el panel sigue abierto, con lo escrito y sin guardar',
    cortada1.panelAbierto && cortada1.cama === '5' && cortada1.planes === TEXTO_FORM && cortada1.sucio,
    JSON.stringify({ panel: cortada1.panelAbierto, cama: cortada1.cama, planes: cortada1.planes, sucio: cortada1.sucio }));
  si('…el botón 💾 volvió a quedar disponible', /Guardar Evoluci/.test(cortada1.botonGuardar), cortada1.botonGuardar);
  si('…y la franja dice que NO se guardó, con su Reintentar listo', cortada1.franja === 'error' && cortada1.hayReintento,
    cortada1.franja + ' / reintento: ' + cortada1.hayReintento);
  si('…y deja borrador local por si el equipo se apaga ahora', (await borradores()) === 1);
  const foco = await pagina.evaluate(() => (document.activeElement && document.activeElement.id) || '(nada)');
  si('…y el cursor queda EN la puerta (no en el «Reintentar» del cuadro que quedó tapado detrás)',
    foco === 'accUsr' || foco === 'accClave', 'el foco está en: ' + foco);
  await pagina.waitForTimeout(3300);                            // pasa el plazo del reintento automático de 3 s
  si('🔴 UN solo viaje de guardado: una sesión cortada no es una red que parpadeó, no se reintenta sola',
    llamadas('GUARDAR_EVOLUCION') - viajes0 === 1, (llamadas('GUARDAR_EVOLUCION') - viajes0) + ' viajes');
  const cortada2 = await estado();
  si('🔴 …y el aviso NO manda a «revisar la red»: dice que es la sesión',
    !cortada2.toasts.some(t => /revisa la red/i.test(t)) && cortada2.toasts.some(t => /sesi[oó]n/i.test(t)),
    JSON.stringify(cortada2.toasts));
  si('…el cuadro «No se guardó» lo dice con palabras de sesión (se ve apenas se cierra la puerta)',
    cortada2.modalAbierto && /sesi[oó]n/i.test(cortada2.modalTexto) && /clave/i.test(cortada2.modalTexto), cortada2.modalTexto);

  /* ══ 7 · Entra de nuevo y la evolución SIGUE AHÍ, lista para guardarse ═════ */
  const token0 = await tokenDe();
  // Si la puerta no apareció (el defecto de la sección 6) no hay dónde teclear: se anota y se sigue, para que
  // el resto de la guardia también se vea roja en vez de morir por un tiempo de espera.
  if (await visible('accForm')) {
    await pagina.fill('#accUsr', 'DMV');
    await pagina.fill('#accClave', 'mi-clave-propia');
    await pagina.click('#accBtn');
    await pagina.waitForTimeout(1200);
  } else {
    si('(no se pudo seguir) no hay puerta donde entrar con la clave', false, 'las secciones 7 a 9 se miden igual, y salen rojas');
  }
  const dentro = await estado();
  si('al entrar con su clave la puerta se cierra', !(await visible('loginOvl')));
  si('🔴 …SIN recargar la página (recargar borraba lo escrito)', dentro.marca === 'misma-pagina', String(dentro.marca));
  si('🔴 …y el formulario sigue abierto, con lo escrito y sin guardar',
    dentro.panelAbierto && dentro.cama === '5' && dentro.planes === TEXTO_FORM && dentro.sucio, JSON.stringify(dentro));
  si('…con la sesión NUEVA puesta (el token cambió)', !!(await tokenDe()) && (await tokenDe()) !== token0);
  si('…y la cabecera muestra la firma de quien entró', (await pagina.textContent('#hSesUsrTxt') || '').trim() === 'DMV',
    'dice: ' + (await pagina.textContent('#hSesUsrTxt') || ''));
  si('…y el cuadro «No se guardó» queda a la vista, con su Reintentar', dentro.modalAbierto && (await visible('avErrReint')));
  await tocarSiHay('#avErrReint');
  await pagina.waitForTimeout(1200);
  const guardado = await estado();
  si('🔴 Reintentar tras entrar GUARDA: la franja pasa a «Guardado»', guardado.franja === 'ok', guardado.franja);
  si('…y ya no queda trabajo sin guardar', guardado.sucio === false);
  si('…el servidor recibió el segundo viaje, y ahora sí lo aceptó',
    llamadas('GUARDAR_EVOLUCION') - viajes0 === 2, (llamadas('GUARDAR_EVOLUCION') - viajes0) + ' viajes');
  const filasCama5 = () => S.DB.EVOLUCIONES.filter(e => String(e.ID_CAMA) === '5');
  si('…y la evolución quedó en la planilla, firmada por quien entró',
    filasCama5().length === 1 && filasCama5()[0].PLAN_PLANES === TEXTO_FORM && filasCama5()[0].PLAN_FIRMA_KINE === 'DMV',
    JSON.stringify(filasCama5().map(e => [e.PLAN_PLANES, e.PLAN_FIRMA_KINE])));
  si('…y el borrador local se descartó (ya está en el servidor)', (await borradores()) === 0);

  /* ══ 8 · 🔴 «No se pudo comprobar tu sesión» NO es una sesión cortada ═══════
     La planilla no respondió: la sesión puede estar perfecta. Mandar a la puerta
     a quien tenía una sesión válida, por un tropiezo de Sheets, es sacarlo de su
     trabajo sin motivo. Es un error REINTENTABLE, con el formulario intacto. */
  si('(control) el servidor responde «No se pudo comprobar» con la hoja caída: es el texto REAL, y no es «Entra con tu clave»',
    /No se pudo comprobar/i.test(NO_VERIF_REAL) && !/Entra con tu clave/i.test(NO_VERIF_REAL), NO_VERIF_REAL);
  const token1 = await tokenDe();
  await pagina.evaluate(() => {
    // Se vuelve a armar el registro de avisos: si la página se hubiera recargado (el defecto de la sección 7) ya no está.
    window.__toasts = []; window.toast = m => window.__toasts.push(String(m));
    $('fPlanes').value = 'sigue con apoyo'; _formDirty = true;
  });
  HOJA_CAIDA = true;
  const viajes1 = llamadas('GUARDAR_EVOLUCION');
  await pagina.evaluate(() => { guardar(); });
  await pagina.waitForTimeout(1200);
  si('🔴 con la hoja caída NO aparece la puerta de entrada', !(await visible('loginOvl')),
    'se sacó de la app a una persona con sesión válida');
  const nv1 = await estado();
  si('…y el formulario sigue intacto', nv1.panelAbierto && nv1.planes === 'sigue con apoyo' && nv1.sucio, JSON.stringify(nv1));
  await pagina.waitForTimeout(3300);
  si('🔴 …es un error REINTENTABLE: se reintenta solo UNA vez (2 viajes)',
    llamadas('GUARDAR_EVOLUCION') - viajes1 === 2, (llamadas('GUARDAR_EVOLUCION') - viajes1) + ' viajes');
  const nv2 = await estado();
  si('…termina en «NO se guardó» con su Reintentar', nv2.franja === 'error' && nv2.hayReintento, nv2.franja);
  si('…el cuadro muestra el texto REAL del servidor («comprobar»), no una sesión cortada',
    nv2.modalAbierto && nv2.modalTexto === NO_VERIF_REAL, nv2.modalTexto);
  si('🔴 …nunca llegó a la puerta, ni siquiera tras el reintento', !(await visible('loginOvl')));
  si('…y la sesión sigue puesta: el token del aparato no se tocó', (await tokenDe()) === token1);
  HOJA_CAIDA = false;
  await tocarSiHay('#avErrReint');
  await pagina.waitForTimeout(1200);
  const nv3 = await estado();
  si('…y al volver la planilla, Reintentar guarda con los mismos datos', nv3.franja === 'ok' && nv3.sucio === false, nv3.franja);
  si('…actualiza la misma evolución, no la duplica',
    filasCama5().length === 1 && filasCama5()[0].PLAN_PLANES === 'sigue con apoyo',
    JSON.stringify(filasCama5().map(e => e.PLAN_PLANES)));

  /* ══ 9 · El reconocimiento es UNO, y lo usan todos los caminos ═════════════
     Una por una, las frases que el servidor puede contestar, por los DOS caminos
     de la pantalla (el guardado y `gs()`), con una red simulada que rechaza con
     esa frase. Cortadas → la puerta. «No se pudo comprobar» (en las dos
     redacciones) y errores comunes → nunca la puerta. */
  const CORTADAS = [
    ['la de siempre del turno', 'Entra con tu clave para registrar.'],
    ['la sesión que expiró', 'Tu sesión expiró. Vuelve a entrar con tu clave.'],
    ['la de Google', 'Sesión no válida. Inicia sesión con Google.'],
  ];
  const NO_CORTADAS = [
    ['«No se pudo comprobar» (la que contesta hoy el servidor)', NO_VERIF_REAL],
    ['«No se pudo comprobar» (la otra redacción)', NO_VERIF_OTRA],
    ['un error cualquiera del servidor', 'Error en GUARDAR_EVOLUCION: algo falló.'],
  ];
  const SALIDA = (msg, camino) => pagina.evaluate(async ([m, cam]) => {
    const apiReal = window.api;
    document.getElementById('loginOvl').style.display = 'none';
    avErrCerrar();
    window.__toasts = []; window.toast = x => window.__toasts.push(String(x));
    window.__viajes = 0;
    window.api = () => { window.__viajes++; return Promise.reject(new Error(m)); };
    let falla = null;
    try {
      if (cam === 'gs') {
        gs('ACCION_DE_PRUEBA', {}, () => {}, x => { falla = x; });
        await new Promise(r => setTimeout(r, 120));
      } else {
        $('fPlanes').value = 'texto de la matriz'; _formDirty = true;
        guardar();
        await new Promise(r => setTimeout(r, 400));   // más que los 60 ms del foco del cuadro y los 120 del de la puerta
      }
      const d1 = getComputedStyle(document.getElementById('loginOvl')).display !== 'none';
      return { puerta: d1, falla, panel: document.getElementById('sp').classList.contains('on'),
        planes: $('fPlanes').value, sucio: _formDirty, toasts: window.__toasts.slice(), viajes: window.__viajes,
        foco: (document.activeElement && document.activeElement.id) || '(nada)' };
    } finally { window.api = apiReal; }
  }, [msg, camino]);

  for (const [quien, msg] of CORTADAS) {
    const g = await SALIDA(msg, 'gs');
    si('gs(): ' + quien + ' → la puerta', g.puerta === true, JSON.stringify(g));
    si('   …y avisa a quien llamó (su `fail` recibe el mensaje)', g.falla === msg, String(g.falla));
    const s = await SALIDA(msg, 'guardar');
    si('🔴 guardado: ' + quien + ' → la puerta', s.puerta === true, JSON.stringify(s));
    si('   …con UN solo viaje (no se reintenta solo)', s.viajes === 1, s.viajes + ' viajes');
    si('   …y el formulario intacto', s.panel && s.planes === 'texto de la matriz' && s.sucio, JSON.stringify(s));
    // 🪤 La puerta ya es conocida (`__ACC_ACTIVO`): se abre ANTES que el cuadro «No se guardó», que enfoca su botón a
    // los 60 ms. Si el foco de la puerta no llega después, el cursor queda en un «Reintentar» tapado y la clave no se escribe.
    si('🔴    …y el cursor queda EN la puerta, no en el «Reintentar» tapado', s.foco === 'accUsr' || s.foco === 'accClave',
      'el foco está en: ' + s.foco);
  }
  for (const [quien, msg] of NO_CORTADAS) {
    const g = await SALIDA(msg, 'gs');
    si('gs(): ' + quien + ' → NO va a la puerta', g.puerta === false, JSON.stringify(g));
    si('   …y avisa con un ❌ en pantalla', g.toasts.some(t => /❌/.test(t)), JSON.stringify(g.toasts));
  }
  // El guardado con una red simulada que rechaza SIEMPRE con la otra redacción: reintenta una vez y termina
  // con el formulario intacto, sin pasar nunca por la puerta. (La redacción real ya se midió en la sección 8.)
  {
    await pagina.evaluate(() => {
      const apiReal = window.api; window.__apiReal = apiReal;
      document.getElementById('loginOvl').style.display = 'none'; avErrCerrar();
      window.__viajes = 0; window.__puerta = false;
      window.api = () => { window.__viajes++; return Promise.reject(new Error('No se pudo comprobar tu sesión, intenta de nuevo')); };
      $('fPlanes').value = 'texto de la otra redacción'; _formDirty = true;
      guardar();
    });
    await pagina.waitForTimeout(3700);
    const o = await pagina.evaluate(() => {
      const r = { puerta: getComputedStyle(document.getElementById('loginOvl')).display !== 'none', viajes: window.__viajes,
        planes: $('fPlanes').value, sucio: _formDirty, franja: document.getElementById('gEstadoGuardado').dataset.estado,
        hayReintento: typeof _reintentoGuardado === 'function' };
      window.api = window.__apiReal; avErrCerrar();
      return r;
    });
    si('🔴 guardado: «No se pudo comprobar» (la otra redacción) → NUNCA la puerta', o.puerta === false, JSON.stringify(o));
    si('   …se reintenta UNA vez y termina en error reintentable (2 viajes, franja roja, Reintentar listo)',
      o.viajes === 2 && o.franja === 'error' && o.hayReintento, JSON.stringify(o));
    si('   …con el formulario intacto', o.planes === 'texto de la otra redacción' && o.sucio === true);
  }

  // Coordinación tiene SU sesión (otro espacio: una clave de coordinación no abre el turno ni al revés). Acá
  // el reconocimiento cierra la sesión de coordinación DE LA PANTALLA, no va a la puerta del turno. Pero la
  // acción de coordinación también pasa primero por la identidad del turno: con la hoja caída el servidor le
  // contesta «No se pudo comprobar tu sesión», y eso NO puede botar al coordinador de su modo.
  const COORD = await pagina.evaluate(async ([cortada, sinComprobar, otra]) => {
    const apiReal = window.api, salida = {};
    for (const [k, msg] of [['cortada', cortada], ['sinComprobar', sinComprobar], ['otraRedaccion', otra]]) {
      document.getElementById('loginOvl').style.display = 'none';
      COORD_TK = 'token-de-prueba'; COORD_FIRMA = 'DMV';
      window.api = () => Promise.reject(new Error(msg));
      coordAbrir('pid-de-prueba', '5');
      await new Promise(r => setTimeout(r, 120));
      salida[k] = { sesion: COORD_TK, puerta: getComputedStyle(document.getElementById('loginOvl')).display !== 'none' };
    }
    COORD_TK = null; COORD_FIRMA = ''; window.api = apiReal; coordInit();
    return salida;
  }, ['Tu sesión de coordinación expiró. Vuelve a entrar con tu clave.', NO_VERIF_REAL, NO_VERIF_OTRA]);
  si('coordinación: «Tu sesión de coordinación expiró» sigue cerrando SU sesión (comportamiento de siempre)',
    COORD.cortada.sesion === null, JSON.stringify(COORD.cortada));
  si('   …y sin pasar por la puerta del turno', COORD.cortada.puerta === false);
  si('🔴 coordinación: «No se pudo comprobar tu sesión» NO bota al coordinador de su modo',
    COORD.sinComprobar.sesion === 'token-de-prueba' && COORD.otraRedaccion.sesion === 'token-de-prueba', JSON.stringify(COORD));
  si('   …ni lo manda a la puerta del turno', COORD.sinComprobar.puerta === false && COORD.otraRedaccion.puerta === false);

  // El código: UN solo lugar. Sin esto, la próxima frase nueva se agrega «donde duele» y los otros caminos
  // quedan con la lista vieja: exactamente cómo el guardado se quedó sin «Entra con tu clave».
  const INDEX = fs.readFileSync(path.join(V2, 'index.html'), 'utf8').split('\n');
  const conTest = INDEX.filter(l => /\.test\(/.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l));
  const lineasFrases = conTest.filter(l => /Entra con tu clave|Sesión no válida|Inicia sesión|Tu sesión expiró/.test(l));
  si('el código reconoce la «sesión cortada» del turno en UN solo lugar (una sola línea de patrones)',
    lineasFrases.length === 1, lineasFrases.length + ' líneas:\n' + lineasFrases.map(l => '   ' + l.trim().slice(0, 140)).join('\n'));
  const lineasSesion = conTest.filter(l => /\/sesi[oó]n\/i?\.test\(/.test(l));
  si('…y el de Coordinación en UN solo lugar también (ningún `/sesión/` suelto en los manejadores)',
    lineasSesion.length === 1, lineasSesion.length + ' líneas:\n' + lineasSesion.map(l => '   ' + l.trim().slice(0, 140)).join('\n'));

  si('sin errores de JavaScript en toda la corrida', errores.length === 0, errores.slice(0, 3).join(' | '));

  await navegador.close();
  fs.unlinkSync(compilado);
  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLOS' : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
