// guardado_seguro_episodio_g14.js — EL CANDADO DE EPISODIO EN TODAS LAS PUERTAS QUE ACTÚAN SOBRE UNA CAMA
// (tanda 2 del guardado seguro, G14; esta guardia nace en el paso 2 con la SECCIÓN A, la regla pura).
//
// 🔴 DE DÓNDE SALE. G14 (episodio_al_guardar.js) cerró UNA puerta: guardarEvolucion compara el paciente que el
// formulario abrió con el que ocupa la cama, dentro del lock y antes de escribir. Las otras quince puertas que
// actúan sobre «quien esté en la cama» (alta, limpiar, intercambiar, mover, anular un evento, anexar, anular un
// anexo, confirmar dispositivos, agregar un hito, medir, escalas, pendientes, asignar un gas) siguen atribuyendo
// lo que hacen al ocupante de AHORA. Un diálogo que quedó abierto mientras la cama se daba de alta y se reingresaba
// a OTRO paciente limpia la cama del nuevo, anula el evento del nuevo o le confirma los dispositivos al nuevo.
// Esta guardia va a ir sumando, puerta por puerta, el caso «formulario abierto para P, entremedio alta de P e
// ingreso de Q: la puerta rechaza con CERO escrituras». Hoy (paso 2) fija lo que todas van a compartir:
//
//   A1 · ERR.CONFLICTO existe y no movió a ningún otro código.
//   A2 · validarEpisodioPuerta(abierto, pidCama, idCama, estricto): la TABLA DE VERDAD. Ausente (undefined/null) no
//        compara; vacío no reclama episodio; con valor, igualdad EXACTA con la cama; en modo estricto el ausente se
//        rechaza y el vacío no se acepta sobre una cama con paciente. Es PURA: se prueba en un contexto vacío, sin
//        ningún global de Apps Script, y dice «cambió de paciente» —la frase por la que la pantalla reconoce el
//        rechazo (_EP_CAMBIO_RE)— sin nombrar ni dar el identificador del otro paciente.
//   A3 · decidirEpisodioPuerta(puerta, e): el «ya hecho». Un reintento cuyo primer intento sí aterrizó no puede
//        confundirse con un conflicto: alta (cama libre u ocupada por otro Y fila del paciente en
//        ARCHIVO_PACIENTES), limpiar (cama libre), intercambio (A tiene el pid de B y B el de A), mover (el destino
//        ya tiene el pid y el origen está libre). Y lo que NO es un reintento: limpiar la cama que ya ocupa OTRO
//        paciente es CONFLICTO (nunca se limpia al ocupante nuevo).
//   A4 · El dispatcher: _auditar deja <ACCION>_RECHAZADO para VALIDACION y también para CONFLICTO, y anota
//        « [sin episodio]» en las puertas de episodio que llegan sin EPISODIO_ABIERTO (para medir cuántas llamadas
//        siguen sin candado y decidir cuándo encender el modo estricto). _epDeDatos(datos) arma ep={a,b,estricto,
//        ausente}; el modo estricto sale de CONFIG.CONTRATO_ESTRICTO (nace apagado, sin columna nueva).
//   A5 · La forma: la regla vive en dominio_validacion.gs (validarEpisodioAbierto se queda en svc_evoluciones.gs,
//        porque los bancos antiguos cargan una lista FIJA de archivos), y ni EPISODIO_ABIERTO_B ni
//        CONTRATO_ESTRICTO son columnas.
//
// Uso: node build/checks/guardado_seguro_episodio_g14.js
//
// 🪤 EL RELOJ VA CONGELADO. Las fechas se INVENTAN (SIM.fecha = 2026-08-10, un lunes lejos de Fiestas Patrias y a las
// 12:00, lejos del cambio de turno) y `Date` se congela en el proceso.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CONGELADO = new Date('2026-08-10T12:00:00').getTime();
const Real = Date;
function Falso(...a) { return a.length ? new Real(...a) : new Real(CONGELADO); }
Falso.now = () => CONGELADO; Falso.parse = Real.parse; Falso.UTC = Real.UTC; Falso.prototype = Real.prototype;
global.Date = Falso;

const V2 = path.resolve(__dirname, '..', '..', 'v2');
const leer = f => fs.readFileSync(path.join(V2, f), 'utf8');

const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g) + (okk ? '' : ' (esperado ' + JSON.stringify(w) + ')'));
  if (!okk) fails.push(l);
};
const si = (l, c) => eq(l, !!c, true);
const no = (l, c) => eq(l, !!c, false);
const terminar = () => {
  console.log(fails.length ? `\n❌ ${fails.length} fallos:\n  - ${fails.join('\n  - ')}`
    : '\n✅ guardado_seguro_episodio_g14: la regla pura del episodio y su rastro en la bitácora.');
  process.exit(fails.length ? 1 : 0);
};

// Datos inventados: ni un nombre ni un identificador reales. Los «pid» parecen lo que son (un uuid corto) para que la
// guardia pueda exigir que NINGÚN mensaje los repita.
const PID_A = 'pid-alfa-0001', PID_B = 'pid-bravo-0002', PID_C = 'pid-charly-0003';
const NOMBRES = ['Alfa', 'Bravo', 'Charly'];
const sinDatosAjenos = (txt) => ![PID_A, PID_B, PID_C].some(p => String(txt).includes(p)) &&
  !NOMBRES.some(n => String(txt).includes(n));

/* ══ A1 · ERR.CONFLICTO ═══════════════════════════════════════════════════ */
console.log('A1 · ERR.CONFLICTO existe y los demás códigos siguen igual');
// El contexto es VACÍO a propósito: infra_respuesta.gs y dominio_validacion.gs no dependen de Sheets ni de nada.
// 🪤 `const ERR` no cuelga del contexto (solo `function` y `var`): se lee evaluando una expresión dentro de él.
const ctxPuro = vm.createContext({});
vm.runInContext(leer('infra_respuesta.gs') + '\n;\n' + leer('dominio_validacion.gs'), ctxPuro);
const ERRP = vm.runInContext('ERR', ctxPuro);
eq('★ ERR.CONFLICTO existe', ERRP.CONFLICTO, 'CONFLICTO');
['LOCK_TIMEOUT', 'VALIDACION', 'NO_AUTORIZADO', 'NO_ENCONTRADO', 'INTERNO'].forEach(k =>
  eq('   …y ERR.' + k + ' sigue diciendo «' + k + '»', ERRP[k], k));
eq('   …y no se coló ningún código más', Object.keys(ERRP).sort().join(','),
  'CONFLICTO,INTERNO,LOCK_TIMEOUT,NO_AUTORIZADO,NO_ENCONTRADO,VALIDACION');

/* ══ A2 · validarEpisodioPuerta: LA TABLA DE VERDAD ═══════════════════════ */
console.log('\nA2 · validarEpisodioPuerta(abierto, pidCama, idCama, estricto): la tabla de verdad');
const tieneRegla = typeof ctxPuro.validarEpisodioPuerta === 'function';
si('★ validarEpisodioPuerta existe (y se evalúa en un contexto SIN globales: es pura)', tieneRegla);

// La frase por la que la pantalla reconoce el rechazo, TAL COMO está en index.html: si se reescribe en un lado y no
// en el otro, este arreglo no se ve en la pantalla y nadie lo nota hasta que alguien toca «Guardar».
const idx = leer('index.html');
const mRe = idx.match(/const _EP_CAMBIO_RE = (\/[^\n;]+\/[a-z]*);/);
si('la pantalla declara _EP_CAMBIO_RE (la frase que reconoce el rechazo)', !!mRe);
const EP_CAMBIO_RE = mRe ? new Function('return ' + mRe[1])() : /cambi[oó] de paciente/i;

if (tieneRegla) {
  const vp = (abierto, pid, estricto) => ctxPuro.validarEpisodioPuerta(abierto, pid, '7', estricto);
  const CAMBIO = vp(PID_A, PID_B, false);
  const hayMensaje = (l, g) => si(l, typeof g === 'string' && g.length > 20);
  const ok_ = (l, abierto, pid, estricto) => eq(l, vp(abierto, pid, estricto), '');
  const cambio = (l, abierto, pid, estricto) => eq(l, vp(abierto, pid, estricto), CAMBIO);

  console.log('   · modo tolerante (CONTRATO_ESTRICTO apagado: lo que pasa hoy mientras haya pantallas viejas)');
  ok_('AUSENTE (undefined) no compara', undefined, PID_B, false);
  ok_('AUSENTE (null) no compara', null, PID_B, false);
  ok_('AUSENTE sobre cama libre tampoco', undefined, '', false);
  ok_('★ VACÍO no reclama episodio (ingreso en cama libre; el reintento de un ingreso no es un conflicto)', '', PID_B, false);
  ok_('   …tampoco un vacío de solo espacios', '   ', PID_B, false);
  ok_('   …ni sobre una cama libre', '', '', false);
  ok_('IGUAL pasa', PID_A, PID_A, false);
  ok_('   …se recortan los espacios de los dos lados', '  ' + PID_A + ' ', PID_A + '  ', false);
  ok_('   …un número y su texto son el mismo episodio (como en validarEpisodioAbierto)', 123, '123', false);
  hayMensaje('★ DISTINTO se rechaza con un mensaje', CAMBIO);
  cambio('   …cama libre (undefined) con un episodio reclamado: se rechaza', PID_A, undefined, false);
  cambio('   …cama libre (null): se rechaza', PID_A, null, false);
  cambio('   …cama libre (vacío): se rechaza', PID_A, '', false);
  cambio('★ la igualdad es EXACTA: otra capitalización no es el mismo episodio', PID_A.toUpperCase(), PID_A, false);
  cambio('   …ni un prefijo', PID_A.slice(0, 8), PID_A, false);
  cambio('   …ni el mismo texto con algo de más', PID_A + 'x', PID_A, false);
  eq('   …y el 4.º argumento ausente es el modo tolerante (los bancos antiguos llaman con tres)',
    ctxPuro.validarEpisodioPuerta(undefined, PID_B, '7'), '');

  console.log('   · modo estricto (CONFIG.CONTRATO_ESTRICTO = TRUE)');
  const VIEJA = vp(undefined, PID_B, true);
  hayMensaje('★ AUSENTE se rechaza: la pantalla es de una versión anterior', VIEJA);
  eq('   …también con null', vp(null, PID_B, true), VIEJA);
  eq('   …también sobre una cama libre (la pantalla vieja es el problema, no la cama)', vp(undefined, '', true), VIEJA);
  eq('   …y dice que es una versión anterior y que hay que recargar', /versi[oó]n anterior/i.test(VIEJA) && /rec[aá]rgala/i.test(VIEJA), true);
  no('★★ …SIN la frase «cambió de paciente»: la pantalla lo mostraría con la salida equivocada', EP_CAMBIO_RE.test(VIEJA));
  si('   …y sin nombrar ni dar identificadores', sinDatosAjenos(VIEJA));
  cambio('★ VACÍO no se acepta sobre una cama con paciente', '', PID_B, true);
  cambio('   …ni un vacío de solo espacios', '   ', PID_B, true);
  ok_('   …pero sí sobre una cama sin paciente (episodio sin ingreso formal, o cama libre)', '', '', true);
  ok_('   …y sobre una cama con el pid sin definir', '', undefined, true);
  ok_('IGUAL pasa', PID_A, PID_A, true);
  cambio('DISTINTO se rechaza', PID_A, PID_B, true);
  cambio('   …cama libre con un episodio reclamado', PID_A, '', true);

  console.log('   · el mensaje del cambio de paciente');
  no('el mensaje de un episodio vigente es vacío (nada que mostrar)', vp(PID_A, PID_A, false));
  si('★★ dice «cambió de paciente»: la pantalla lo reconoce con _EP_CAMBIO_RE (las dos puntas atadas)', EP_CAMBIO_RE.test(CAMBIO));
  si('   …nombra la cama', /\bcama 7\b/.test(CAMBIO));
  si('   …dice qué hacer (volver a abrir la cama) y que no se guardó nada', /vuelve a abrir la cama/i.test(CAMBIO) && /no se guard[oó] nada/i.test(CAMBIO));
  si('★★ …sin nombrar a nadie ni dar el identificador del otro paciente (Ley 19.628)', sinDatosAjenos(CAMBIO));
  eq('   …el de la cama libre es el mismo texto (la pantalla no distingue)', vp(PID_A, '', false), CAMBIO);
  // El mensaje es UNO: el del guardado de la evolución (G14 original) y el de las demás puertas. Si se separan, el
  // usuario ve dos frases distintas para lo mismo y la pantalla (que reconoce la frase) sigue sirviendo a una sola.
  const svc = leer('svc_evoluciones.gs');
  const validarEpisodioAbierto = new Function(svc + '\n;return validarEpisodioAbierto;')();
  eq('★ …es EXACTAMENTE el de validarEpisodioAbierto (guardarEvolucion): una sola frase para todas las puertas',
    CAMBIO, validarEpisodioAbierto(PID_A, PID_B, '7'));
  eq('   …y para la cama libre también', vp(PID_A, '', false), validarEpisodioAbierto(PID_A, '', '7'));
}

/* ══ A3 · decidirEpisodioPuerta: EL «YA HECHO» ════════════════════════════ */
console.log('\nA3 · decidirEpisodioPuerta(puerta, e): un reintento no es un conflicto, pero un ocupante nuevo sí');
const tieneDecide = typeof ctxPuro.decidirEpisodioPuerta === 'function';
si('★ decidirEpisodioPuerta existe y es pura', tieneDecide);
if (tieneDecide) {
  const ESTADOS = ['seguir', 'yaHecho', 'rechazo'];
  // Defaults de una puerta de UNA cama; cada caso pisa lo suyo.
  const dec = (puerta, e) => ctxPuro.decidirEpisodioPuerta(puerta, Object.assign({ estricto: false, idCama: '7', idCamaB: '8', hayArchivo: false }, e));
  const caso = (l, puerta, e, estado, codigo) => {
    const r = dec(puerta, e);
    eq(l, (r && r.estado) + (codigo ? '/' + (r && r.codigo) : ''), estado + (codigo ? '/' + codigo : ''));
    return r;
  };
  const VAL = 'VALIDACION', CON = 'CONFLICTO';
  si('el veredicto es siempre uno de «seguir», «yaHecho» o «rechazo»',
    ESTADOS.indexOf((dec('DAR_ALTA', { abierto: PID_A, pid: PID_A }) || {}).estado) > -1);

  console.log('   · DAR_ALTA (hayArchivo = ARCHIVO_PACIENTES ya tiene la fila de ese paciente)');
  caso('el diálogo vigente sigue', 'DAR_ALTA', { abierto: PID_A, pid: PID_A }, 'seguir');
  caso('★ cama LIBRE y el paciente ya está archivado: ya hecho (el reintento de un alta que sí aterrizó)',
    'DAR_ALTA', { abierto: PID_A, pid: '', hayArchivo: true }, 'yaHecho');
  caso('★ cama ocupada por OTRO y el paciente ya está archivado: ya hecho (la respuesta se perdió y entró otro)',
    'DAR_ALTA', { abierto: PID_A, pid: PID_B, hayArchivo: true }, 'yaHecho');
  const r1 = caso('★ cama libre SIN fila de archivo: rechazo como hoy (fue un traslado o una limpieza, no un alta)',
    'DAR_ALTA', { abierto: PID_A, pid: '', hayArchivo: false }, 'rechazo', VAL);
  si('   …con la frase de cambio de paciente', EP_CAMBIO_RE.test((r1 || {}).error || ''));
  caso('★ cama ocupada por OTRO sin fila de archivo: rechazo (nunca se le da el alta al ocupante nuevo)',
    'DAR_ALTA', { abierto: PID_A, pid: PID_B, hayArchivo: false }, 'rechazo', VAL);
  caso('ausente (pantalla vieja) en modo tolerante: sigue', 'DAR_ALTA', { abierto: undefined, pid: PID_B }, 'seguir');
  caso('vacío en modo tolerante: sigue', 'DAR_ALTA', { abierto: '', pid: PID_B }, 'seguir');
  caso('★ sin episodio reclamado el «ya hecho» no se inventa: vacío, cama libre y un archivo cualquiera: sigue',
    'DAR_ALTA', { abierto: '', pid: '', hayArchivo: true }, 'seguir');
  const r2 = caso('ausente en modo estricto: rechazo', 'DAR_ALTA', { abierto: undefined, pid: PID_A, estricto: true }, 'rechazo', VAL);
  no('   …y no es la frase del cambio de paciente', EP_CAMBIO_RE.test((r2 || {}).error || ''));
  caso('vacío sobre una cama con paciente en modo estricto: rechazo', 'DAR_ALTA', { abierto: '', pid: PID_B, estricto: true }, 'rechazo', VAL);
  caso('★ el «ya hecho» también vale en modo estricto', 'DAR_ALTA', { abierto: PID_A, pid: '', hayArchivo: true, estricto: true }, 'yaHecho');

  console.log('   · LIMPIAR_CAMA');
  caso('el diálogo vigente sigue', 'LIMPIAR_CAMA', { abierto: PID_A, pid: PID_A }, 'seguir');
  caso('★ cama libre: ya hecho (la limpieza ya aterrizó)', 'LIMPIAR_CAMA', { abierto: PID_A, pid: '' }, 'yaHecho');
  const r3 = caso('★★ cama ocupada por OTRO paciente: CONFLICTO (nunca se limpia al ocupante nuevo)',
    'LIMPIAR_CAMA', { abierto: PID_A, pid: PID_B }, 'rechazo', CON);
  si('   …el mensaje nombra la cama y no nombra a nadie ni da identificadores', /\bcama 7\b/.test((r3 || {}).error || '') && sinDatosAjenos((r3 || {}).error || ''));
  caso('ausente en modo tolerante: sigue', 'LIMPIAR_CAMA', { abierto: undefined, pid: PID_B }, 'seguir');
  caso('ausente en modo estricto: rechazo', 'LIMPIAR_CAMA', { abierto: null, pid: PID_B, estricto: true }, 'rechazo', VAL);
  caso('vacío sobre una cama con paciente en modo estricto: rechazo', 'LIMPIAR_CAMA', { abierto: '', pid: PID_B, estricto: true }, 'rechazo', VAL);

  console.log('   · INTERCAMBIAR_CAMAS (abierto/pid = cama A; abiertoB/pidB = cama B)');
  caso('las dos camas como se abrieron: sigue', 'INTERCAMBIAR_CAMAS', { abierto: PID_A, pid: PID_A, abiertoB: PID_B, pidB: PID_B }, 'seguir');
  caso('★ A ya tiene el paciente de B y B el de A: ya hecho (se salta el cambio y se completan los pasos que falten)',
    'INTERCAMBIAR_CAMAS', { abierto: PID_A, pid: PID_B, abiertoB: PID_B, pidB: PID_A }, 'yaHecho');
  const r4 = caso('★ la cama A cambió de paciente: rechazo, y el mensaje nombra la cama A',
    'INTERCAMBIAR_CAMAS', { abierto: PID_A, pid: PID_C, abiertoB: PID_B, pidB: PID_B }, 'rechazo', VAL);
  si('   …con la frase de cambio de paciente y la cama 7', EP_CAMBIO_RE.test((r4 || {}).error || '') && /\bcama 7\b/.test((r4 || {}).error || ''));
  const r5 = caso('★ la cama B cambió de paciente: rechazo, y el mensaje nombra la cama B',
    'INTERCAMBIAR_CAMAS', { abierto: PID_A, pid: PID_A, abiertoB: PID_B, pidB: PID_C }, 'rechazo', VAL);
  si('   …con la cama 8', /\bcama 8\b/.test((r5 || {}).error || '') && !/\bcama 7\b/.test((r5 || {}).error || ''));
  caso('★ mitad hecha (A ya tiene el de B pero B conserva el suyo): no es «ya hecho», es rechazo',
    'INTERCAMBIAR_CAMAS', { abierto: PID_A, pid: PID_B, abiertoB: PID_B, pidB: PID_B }, 'rechazo', VAL);
  caso('★ el «ya hecho» no se inventa sin episodios: nada reclamado en ninguna cama: sigue',
    'INTERCAMBIAR_CAMAS', { abierto: '', pid: '', abiertoB: '', pidB: '' }, 'seguir');
  caso('ausente en modo tolerante: sigue', 'INTERCAMBIAR_CAMAS', { abierto: undefined, pid: PID_A, abiertoB: undefined, pidB: PID_B }, 'seguir');
  caso('A declarada y B ausente en modo tolerante: sigue', 'INTERCAMBIAR_CAMAS', { abierto: PID_A, pid: PID_A, abiertoB: undefined, pidB: PID_B }, 'seguir');
  caso('A declarada y B ausente en modo estricto: rechazo', 'INTERCAMBIAR_CAMAS', { abierto: PID_A, pid: PID_A, abiertoB: undefined, pidB: PID_B, estricto: true }, 'rechazo', VAL);
  caso('A ausente en modo estricto: rechazo', 'INTERCAMBIAR_CAMAS', { abierto: undefined, pid: PID_A, abiertoB: PID_B, pidB: PID_B, estricto: true }, 'rechazo', VAL);
  caso('★ el «ya hecho» también vale en modo estricto', 'INTERCAMBIAR_CAMAS', { abierto: PID_A, pid: PID_B, abiertoB: PID_B, pidB: PID_A, estricto: true }, 'yaHecho');

  console.log('   · MOVER_A_CAMA_VACIA (abierto/pid = origen; abiertoB/pidB = destino, «» = libre al elegir)');
  caso('origen como se abrió y destino libre: sigue', 'MOVER_A_CAMA_VACIA', { abierto: PID_A, pid: PID_A, abiertoB: '', pidB: '' }, 'seguir');
  caso('★ el destino ya tiene al paciente y el origen quedó libre: ya hecho (el traslado ya aterrizó)',
    'MOVER_A_CAMA_VACIA', { abierto: PID_A, pid: '', abiertoB: '', pidB: PID_A }, 'yaHecho');
  const r6 = caso('★★ el destino lo ocupó OTRO paciente mientras se elegía: CONFLICTO',
    'MOVER_A_CAMA_VACIA', { abierto: PID_A, pid: PID_A, abiertoB: '', pidB: PID_B }, 'rechazo', CON);
  si('   …el mensaje nombra la cama de destino y no nombra a nadie ni da identificadores', /\bcama 8\b/.test((r6 || {}).error || '') && sinDatosAjenos((r6 || {}).error || ''));
  const r7 = caso('el origen cambió de paciente: rechazo, y el mensaje nombra el origen',
    'MOVER_A_CAMA_VACIA', { abierto: PID_A, pid: PID_C, abiertoB: '', pidB: '' }, 'rechazo', VAL);
  si('   …con la frase de cambio de paciente y la cama 7', EP_CAMBIO_RE.test((r7 || {}).error || '') && /\bcama 7\b/.test((r7 || {}).error || ''));
  caso('★ el origen quedó libre pero el destino NO tiene al paciente (se limpió sin mover): no es «ya hecho»',
    'MOVER_A_CAMA_VACIA', { abierto: PID_A, pid: '', abiertoB: '', pidB: '' }, 'rechazo', VAL);
  caso('origen libre y destino de otro: rechazo (se juzga primero el origen)',
    'MOVER_A_CAMA_VACIA', { abierto: PID_A, pid: '', abiertoB: '', pidB: PID_B }, 'rechazo', VAL);
  caso('ausente en modo tolerante: sigue (la comprobación de «ocupada» del servicio queda como hoy)',
    'MOVER_A_CAMA_VACIA', { abierto: undefined, pid: PID_A, abiertoB: undefined, pidB: PID_B }, 'seguir');
  caso('destino sin declarar en modo tolerante: no se le inventa un conflicto', 'MOVER_A_CAMA_VACIA', { abierto: PID_A, pid: PID_A, abiertoB: undefined, pidB: PID_B }, 'seguir');
  caso('ausente en modo estricto: rechazo', 'MOVER_A_CAMA_VACIA', { abierto: undefined, pid: PID_A, abiertoB: '', pidB: '', estricto: true }, 'rechazo', VAL);
  caso('destino sin declarar en modo estricto: rechazo', 'MOVER_A_CAMA_VACIA', { abierto: PID_A, pid: PID_A, abiertoB: undefined, pidB: '', estricto: true }, 'rechazo', VAL);
  caso('★ el «ya hecho» también vale en modo estricto', 'MOVER_A_CAMA_VACIA', { abierto: PID_A, pid: '', abiertoB: '', pidB: PID_A, estricto: true }, 'yaHecho');

  console.log('   · una puerta que no está en la tabla no se decide por adivinanza');
  let revento = false;
  try { dec('OTRA_PUERTA', { abierto: PID_A, pid: PID_A }); } catch (e) { revento = true; }
  si('★ una puerta desconocida REVIENTA fuerte (no devuelve «seguir» en silencio: un candado no se salta callando)', revento);
}

/* ══ A4 · EL DISPATCHER: LA BITÁCORA Y ep ═════════════════════════════════ */
console.log('\nA4 · api.gs: _auditar audita VALIDACION y CONFLICTO, anota « [sin episodio]»; _epDeDatos arma ep');
const S = require('../sim/sim_srv.js');
const { api, DB, SIM, CONFIG } = S;
SIM.fecha = '2026-08-10'; SIM.hora = '12:00:00';
// 🪤 `ERR` es una `const` y ni `globalThis` ni otro eval la ven (una const de un eval indirecto vive solo en ese eval).
// Los códigos son TEXTOS, y los mismos de infra_respuesta.gs: se toman del contexto puro de arriba (A1), que evalúa el
// mismo archivo. Lo que se prueba es que api.gs reconoce el TEXTO que devuelve un servicio.
const ERRG = ERRP;
const callando = fn => { const ce = console.error; console.error = () => {}; try { return fn(); } finally { console.error = ce; } };

// Una puerta que contesta lo que se le diga: se reemplaza la función de servicio (global) un instante.
function conServicio(nombre, resp, fn) {
  const orig = global[nombre]; global[nombre] = () => resp;
  try { return fn(); } finally { global[nombre] = orig; }
}
const ultimaFila = (desde) => DB.AUDIT_LOG.slice(desde);

console.log('   · el rechazo se audita');
for (const cod of ['VALIDACION', 'CONFLICTO']) {   // el TEXTO del código, tal como lo devuelve un servicio
  const n0 = DB.AUDIT_LOG.length;
  const r = callando(() => conServicio('guardarSugerencia', { ok: false, error: 'rechazo de prueba ' + cod, codigo: cod },
    () => api('GUARDAR_SUGERENCIA', { idCama: '3' }, null)));
  eq('«' + cod + '»: la respuesta se devuelve tal cual', r.codigo, cod);
  const filas = ultimaFila(n0);
  eq('★ …y deja UNA fila en la bitácora', filas.length, 1);
  eq('   …que se llama GUARDAR_SUGERENCIA_RECHAZADO', (filas[0] || {}).accion, 'GUARDAR_SUGERENCIA_RECHAZADO');
  eq('   …con el motivo tal como se le mostró a la persona', (filas[0] || {}).resumen, 'rechazo de prueba ' + cod);
  eq('   …y la cama del payload', (filas[0] || {}).idEntidad, '3');
}
{
  const n0 = DB.AUDIT_LOG.length;
  callando(() => conServicio('guardarSugerencia', { ok: false, error: 'una excepción', codigo: ERRG.INTERNO }, () => api('GUARDAR_SUGERENCIA', {}, null)));
  eq('control: un INTERNO NO se audita aquí (ya queda en el log de ejecuciones; llenaría la bitácora de ruido)', ultimaFila(n0).length, 0);
  const n1 = DB.AUDIT_LOG.length;
  callando(() => conServicio('guardarSugerencia', { ok: false, error: 'sin permiso', codigo: ERRG.NO_AUTORIZADO }, () => api('GUARDAR_SUGERENCIA', {}, null)));
  eq('control: ni un NO_AUTORIZADO', ultimaFila(n1).length, 0);
  const n2 = DB.AUDIT_LOG.length;
  callando(() => conServicio('guardarSugerencia', { ok: true, data: { entidad: 'SUGERENCIAS', id: 'S1', accion: 'sugerencia' } }, () => api('GUARDAR_SUGERENCIA', {}, null)));
  eq('control: un éxito sigue dejando su fila de siempre', (ultimaFila(n2)[0] || {}).accion + '/' + (ultimaFila(n2)[0] || {}).resumen, 'GUARDAR_SUGERENCIA/sugerencia');
}

console.log('   · « [sin episodio]»: las puertas de episodio que llegan sin EPISODIO_ABIERTO se anotan');
const MARCA = ' [sin episodio]';
const resumenDe = (accion, datos) => {
  const n0 = DB.AUDIT_LOG.length;
  callando(() => api(accion, datos, null));
  return (ultimaFila(n0).filter(f => String(f.accion).indexOf(accion) === 0)[0] || {}).resumen;
};
const camaLibre = DB.CAMAS_ESTADO.find(c => !c.OCUPADA).ID_CAMA;
eq('★ LIMPIAR_CAMA sin EPISODIO_ABIERTO (pantalla vieja): el resumen lo dice', resumenDe('LIMPIAR_CAMA', { idCama: camaLibre }), 'limpiar' + MARCA);
eq('   …con null (que el servidor trata como ausente) también', resumenDe('LIMPIAR_CAMA', { idCama: camaLibre, EPISODIO_ABIERTO: null }), 'limpiar' + MARCA);
eq('★ con EPISODIO_ABIERTO vacío NO se anota: el vacío es una declaración («no había episodio»), no una ausencia',
  resumenDe('LIMPIAR_CAMA', { idCama: camaLibre, EPISODIO_ABIERTO: '' }), 'limpiar');
eq('★ una puerta SIN episodio (SET_BANNER) no se anota nunca', resumenDe('SET_BANNER', { tab: 'G', valor: 'x' }), 'portada G');
eq('★ el rechazo de una puerta de episodio sin EPISODIO_ABIERTO también se anota',
  String(resumenDe('DAR_ALTA', { idCama: camaLibre })).endsWith(MARCA), true);
eq('   …y con EPISODIO_ABIERTO declarado no',
  String(resumenDe('DAR_ALTA', { idCama: camaLibre, EPISODIO_ABIERTO: '' })).endsWith(MARCA), false);
{
  // 🪤 GUARDAR_EVOLUCION NO se anota, y es una EXCEPCIÓN a propósito. Su fila de AUDIT_LOG es la que
  // guardado_viajes.js compara byte a byte contra el árbol de antes de la Ola 4 (con payloads sin navegador, o sea sin
  // EPISODIO_ABIERTO): anotarla ponía roja esa A/B por una diferencia que no tiene nada que ver con los viajes, y las
  // guardias existentes no se aflojan. Además es la única puerta que YA compara el episodio hoy (G14 original).
  const n0 = DB.AUDIT_LOG.length;
  callando(() => conServicio('guardarEvolucion', { ok: true, data: { entidad: 'EVOLUCIONES', idEvolucion: 'E1', accion: 'guardar' } },
    () => api('GUARDAR_EVOLUCION', { idCama: '3' }, null)));
  eq('★ GUARDAR_EVOLUCION sin EPISODIO_ABIERTO: su fila de bitácora queda como siempre (la A/B de guardado_viajes la compara)',
    (ultimaFila(n0)[0] || {}).resumen, 'guardar');
  const n1 = DB.AUDIT_LOG.length;
  callando(() => conServicio('guardarEvolucion', { ok: false, error: 'motivo de prueba', codigo: ERRG.VALIDACION },
    () => api('GUARDAR_EVOLUCION', { idCama: '3' }, null)));
  eq('   …y su rechazo también', (ultimaFila(n1)[0] || {}).resumen, 'motivo de prueba');
}
{
  // El motivo largo se acota a 300 y la marca va DESPUÉS: nunca se corta la marca.
  const largo = 'x'.repeat(400);
  const n0 = DB.AUDIT_LOG.length;
  callando(() => conServicio('anularAnexo', { ok: false, error: largo, codigo: ERRG.VALIDACION }, () => api('ANULAR_ANEXO', { idCama: '3' }, null)));
  const f = ultimaFila(n0)[0] || {};
  eq('★ un motivo largo se acota a 300 y la marca no se pierde', String(f.resumen).length + '/' + String(f.resumen).endsWith(MARCA), (300 + MARCA.length) + '/true');
}

console.log('   · _epDeDatos(datos) arma ep = {a, b, estricto, ausente}');
const tieneEp = typeof global._epDeDatos === 'function';
si('★ _epDeDatos existe en api.gs', tieneEp);
if (tieneEp) {
  const ep = global._epDeDatos;
  delete CONFIG.CONTRATO_ESTRICTO;
  let e = ep({});
  eq('sin nada: ausente, a y b sin definir', [e.ausente, e.a, e.b].join('|'), 'true||');
  eq('   …y el modo estricto apagado (CONFIG sin la clave: nace APAGADO, sin tocar la planilla)', e.estricto, false);
  e = ep(undefined);
  eq('   …y datos sin definir tampoco revienta', e.ausente, true);
  e = ep({ EPISODIO_ABIERTO: null });
  eq('null es ausente', e.ausente, true);
  e = ep({ EPISODIO_ABIERTO: '' });
  eq('★ vacío NO es ausente: declara «no había episodio»', e.ausente + '|' + JSON.stringify(e.a), 'false|""');
  e = ep({ EPISODIO_ABIERTO: PID_A, EPISODIO_ABIERTO_B: PID_B });
  eq('con valor: a y b se pasan tal cual, para que validarEpisodioPuerta decida', [e.ausente, e.a, e.b].join('|'), 'false|' + PID_A + '|' + PID_B);
  e = ep({ EPISODIO_ABIERTO_B: PID_B });
  eq('★ ausente se refiere a la declaración PRINCIPAL (a): una B suelta no la llena', e.ausente, true);
  CONFIG.CONTRATO_ESTRICTO = 'TRUE';
  eq('★ CONFIG.CONTRATO_ESTRICTO = TRUE enciende el modo estricto', ep({}).estricto, true);
  CONFIG.CONTRATO_ESTRICTO = 'FALSE';
  eq('   …FALSE lo apaga', ep({}).estricto, false);
  CONFIG.CONTRATO_ESTRICTO = 'true';
  eq('★ …y no distingue mayúsculas: «true» también lo enciende (un candado de seguridad que se queda apagado por una minúscula parece puesto y no lo está)', ep({}).estricto, true);
  CONFIG.CONTRATO_ESTRICTO = ' TRUE ';
  eq('   …ni espacios', ep({}).estricto, true);
  CONFIG.CONTRATO_ESTRICTO = 'SI';
  eq('   …pero solo TRUE lo enciende: cualquier otra cosa lo deja apagado', ep({}).estricto, false);
  delete CONFIG.CONTRATO_ESTRICTO;
  const antes = JSON.stringify(DB.CONFIG);
  ep({}); ep({ EPISODIO_ABIERTO: PID_A });
  eq('leer el modo no escribe nada en la hoja CONFIG', JSON.stringify(DB.CONFIG), antes);
}

/* ══ A5 · LA FORMA ════════════════════════════════════════════════════════ */
console.log('\nA5 · La forma: dónde vive cada pieza');
const dom = leer('dominio_validacion.gs'), svcEv = leer('svc_evoluciones.gs'), infra = leer('infra_respuesta.gs');
const esq = leer('esquema.gs');
si('validarEpisodioPuerta vive en dominio_validacion.gs (pura, sin Sheets)', /function validarEpisodioPuerta\(/.test(dom));
no('   …y no en svc_evoluciones.gs (que trae su propia validarEpisodioAbierto)', /function validarEpisodioPuerta\(/.test(svcEv));
si('★ validarEpisodioAbierto SE QUEDA en svc_evoluciones.gs (los bancos antiguos cargan una lista fija de archivos)', /function validarEpisodioAbierto\(/.test(svcEv));
no('   …y no se movió a dominio_validacion.gs ni a infra_respuesta.gs', /function validarEpisodioAbierto\(/.test(dom + infra));
no('★ EPISODIO_ABIERTO_B NO es columna de ninguna hoja (viaja transitorio, como EPISODIO_ABIERTO)', /EPISODIO_ABIERTO_B/.test(esq));
no('★ CONTRATO_ESTRICTO NO se siembra en el esquema (se lee con leerConfig y su valor por defecto)', /CONTRATO_ESTRICTO/.test(esq));
si('el modo estricto se lee con leerConfig(\'CONTRATO_ESTRICTO\', \'FALSE\') (nace apagado)', /leerConfig\('CONTRATO_ESTRICTO',\s*'FALSE'\)/.test(leer('api.gs')));

terminar();
