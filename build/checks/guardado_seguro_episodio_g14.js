// guardado_seguro_episodio_g14.js — EL CANDADO DE EPISODIO EN TODAS LAS PUERTAS QUE ACTÚAN SOBRE UNA CAMA
// (tanda 2 del guardado seguro, G14; esta guardia nace en el paso 2 con la SECCIÓN A, la regla pura).
//
// 🔴 DE DÓNDE SALE. G14 (episodio_al_guardar.js) cerró UNA puerta: guardarEvolucion compara el paciente que el
// formulario abrió con el que ocupa la cama, dentro del lock y antes de escribir. Las otras quince puertas que
// actúan sobre «quien esté en la cama» (alta, limpiar, intercambiar, mover, anular un evento, anexar, anular un
// anexo, confirmar dispositivos, agregar un hito, medir, escalas, pendientes, asignar un gas) siguen atribuyendo
// lo que hacen al ocupante de AHORA. Un diálogo que quedó abierto mientras la cama se daba de alta y se reingresaba
// a OTRO paciente limpia la cama del nuevo, anula el evento del nuevo o le confirma los dispositivos al nuevo.
// Esta guardia va sumando, puerta por puerta, el caso «formulario abierto para P, entremedio alta de P e
// ingreso de Q: la puerta rechaza con CERO escrituras». La sección A (paso 2) fija lo que todas comparten; la B
// (paso 4) es la primera puerta, la más grave: ANULAR_EVENTO; la C (paso 5) son las cuatro que MUEVEN la cama (alta,
// limpiar, intercambiar, mover). Las demás se suman en los pasos 6 y 7.
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
////   B  · ANULAR_EVENTO (paso 4), la puerta más grave. Antes leía la evolución, la cama y los turnos posteriores
//        FUERA del lock: un guardado que se adelantaba mientras esperaba el candado quedaba pisado con una fila vieja,
//        y un anular sobre un turno del archivo REINSERTABA la fila en la hoja viva y le ponía OCUPADA:true a la cama
//        (resucitaba al egresado sobre una cama libre o sobre el ocupante nuevo). Su candado de paciente era débil
//        (comparaba la evolución con la cama, nunca con lo que la pantalla abrió) y la resta de DIAS_VM_PREVIOS no era
//        idempotente: anular dos veces restaba dos veces. Se prueba con el candado REAL y el gancho antesDelCuerpo
//        («otra petición se adelantó»):
//          B1 · el episodio vigente anula como siempre, y la pantalla vieja (sin EPISODIO_ABIERTO) también;
//          B2 · formulario abierto para P, entremedio alta de P e ingreso de Q: rechazo con CERO escrituras, tanto si
//               ya pasó como si pasa mientras se esperaba el lock;
//          B3 · un turno del ARCHIVO se rechaza y la cama no se resucita;
//          B4 · las lecturas van dentro del lock: un guardado concurrente del mismo turno no se pisa, y uno de un turno
//               posterior frena la anulación;
//          B5 · anular dos veces: la segunda es «ya estaba», sin escrituras y sin volver a restar;
//          B6 · modo estricto (ausente rechaza);
//          B7 · la forma: nada se lee antes del conLock.
//   C  · LAS PUERTAS QUE MUEVEN LA CAMA (paso 5): DAR_ALTA, LIMPIAR_CAMA, INTERCAMBIAR_CAMAS, MOVER_A_CAMA_VACIA. Antes
//        de este paso no comparaban nada con lo que la pantalla abrió: un diálogo que quedó abierto mientras la cama se
//        daba de alta y se reingresaba a OTRO paciente le daba el alta al nuevo, lo limpiaba, lo movía o lo cruzaba con
//        otra cama. Y el reintento de una respuesta perdida (el alta ya aterrizó, la cama quedó libre) contestaba «ya
//        está libre» a algo que SÍ se hizo —o, peor, un intercambio repetido DESHACÍA el traslado—. Con el candado REAL
//        y el gancho antesDelCuerpo, cada puerta:
//          Cx.a · el episodio vigente y la pantalla vieja siguen pasando (la vieja queda anotada « [sin episodio]»);
//          Cx.b · formulario de P y la cama ya es de otro: rechazo con CERO escrituras y la base idéntica, tanto si ya
//                 pasó como si pasa MIENTRAS se espera el candado; el ocupante nuevo queda intacto;
//          Cx.c · el «ya hecho» (un reintento no es un conflicto): ok «ya estaba» con CERO escrituras;
//          Cx.d · modo estricto (ausente rechaza; el «ya hecho» sigue valiendo).
//        🪤 DAR_ALTA tiene DOS desenlaces según el archivo: si P ya tiene su fila en ARCHIVO_PACIENTES el alta YA se
//        hizo (ok «ya estaba», sin tocar al ocupante nuevo); si no la tiene, P se limpió o se trasladó (rechazo).
//        C5 · la forma: la comparación va DENTRO del lock, antes de la primera escritura, y nada se lee antes.
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
    : '\n✅ guardado_seguro_episodio_g14: la regla pura del episodio, su rastro en la bitácora, ANULAR_EVENTO y las cuatro puertas que mueven la cama con candado.');
  process.exit(fails.length ? 1 : 0);
};
// Un tramo que revienta no tumba a los demás: da UN rojo con su razón y la guardia sigue (así el rojo de antes de
// arreglar el código se lee entero, en vez de cortarse en la primera sección).
const tramo = (etiqueta, fn) => {
  try { fn(); } catch (e) { console.log('❌ ' + etiqueta + ': reventó (' + (e && e.message) + ')'); fails.push(etiqueta + ' reventó: ' + (e && e.message)); }
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
  // 🪤 Una cama OCUPADA sin PATIENT_ID (episodio sin ingreso formal, cargado a mano) tiene el pid vacío igual que una
  // libre: sin saber que está ocupada, «ya hecho» le diría ok a quien pidió limpiar y ahora hay otro adentro.
  const r3b = caso('★★ cama ocupada SIN PATIENT_ID (ocupada:true) no es una cama libre: CONFLICTO, no «ya hecho»',
    'LIMPIAR_CAMA', { abierto: PID_A, pid: '', ocupada: true }, 'rechazo', CON);
  si('   …el mismo mensaje del ocupante nuevo: nombra la cama y no da identificadores', /\bcama 7\b/.test((r3b || {}).error || '') && sinDatosAjenos((r3b || {}).error || ''));
  caso('   …con ocupada:false (o sin la bandera) sigue siendo «ya hecho»', 'LIMPIAR_CAMA', { abierto: PID_A, pid: '', ocupada: false }, 'yaHecho');
  caso('   …y sin reclamo (vacío) sobre esa cama ocupada sin pid: sigue (limpia el episodio sin ingreso formal, como hoy)',
    'LIMPIAR_CAMA', { abierto: '', pid: '', ocupada: true }, 'seguir');

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

/* ══ B · ANULAR_EVENTO: LA PUERTA MÁS GRAVE ═══════════════════════════════ */
console.log('\nB · ANULAR_EVENTO (paso 4): todo dentro del lock, con candado de episodio y sin resucitar a nadie');
tramo('B', () => {
  // El candado REAL (el de v2/infra_lock.gs) y el banco que cuenta cada escritura que aterriza. `activarLockReal` va
  // aquí y no arriba: la sección A prueba funciones puras y el dispatcher con servicios de juguete, y no lo necesita.
  const ctl = S.activarLockReal();
  const M = require('../sim/sim_muerte.js');
  // 🪤 El simulador no deja usar Utilities.formatDate (hoyISO/ahoraTS están pisados a propósito) y anularEvento lo usa
  // para restaurar las fechas de inicio de soporte y de vía aérea. Aquí se le da la única forma que usa, calculada con
  // las partes locales de la fecha: no lee el reloj, la fecha sale del argumento.
  global.Utilities.formatDate = (d) => {
    const p2 = n => ('0' + n).slice(-2);
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  };

  const TK0 = '2026-08-09-Dia', TK1 = '2026-08-10-Dia', TK2 = '2026-08-10-Noche';
  const camaDe = id => DB.CAMAS_ESTADO.find(c => String(c.ID_CAMA) === String(id)) || {};
  const evoDe = (tk, pid) => DB.EVOLUCIONES.find(e => e.TURNO_KEY === tk && (pid === undefined || e.PATIENT_ID === pid));
  const payload = (idCama, tk, extra) => Object.assign({
    ID_CAMA: String(idCama), TURNO_KEY: tk, PLAN_FIRMA_KINE: 'DMV',
    VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', VENT_MODO: 'ACVC',
    VENT_VT: 450, VENT_FR: 16, VENT_PEEP: 8, VENT_FIO2: 50, HEMO_ESTADO: 'Estable', SED_TIPO: 'Sin sedación',
  }, extra || {});
  const ingresa = (idCama, nombre) => api('INGRESAR_PACIENTE', { idCama: String(idCama), nombre, edad: 61, sexo: 'M',
    diagnostico: 'Dx de prueba', fechaIngreso: '2026-08-08', viaAerea: 'TOT', soporte: 'VM', modo: 'ACVC', firmaKine: 'DMV' }, null);
  const darAlta = idCama => api('DAR_ALTA', { idCama: String(idCama), motivoEgreso: 'Traslado a sala', destinoEgreso: 'Medicina', firmaKine: 'DMV' }, null);
  // La extubación del turno 1 (el evento que se anula) y la forma de volver a guardar ese mismo turno SIN perderla
  // (el formulario reabierto manda el estado de salida: sin eso la transición de vía aérea se rechaza).
  const EXT = { EXT_OCURRIO: true, EXT_TIPO: 'protocolo', EXT_HORA: '10:00', VENT_VIA_AEREA_FINAL: 'Natural', VENT_SOPORTE_FINAL: 'Ambiente' };

  // ── El montaje: P ingresa ventilada el 7, tiene turno el 9 y el 10 (con extubación y 9 días de VM previos) ──
  // La VM de P arranca el 7 (la fecha del reloj del banco) para que el turno del evento tenga DIAS_VM > 0: sin eso la
  // resta de DIAS_VM_PREVIOS resta cero y «restar dos veces» no se vería.
  SIM.fecha = '2026-08-07'; SIM.hora = '12:00:00';
  const rIng = ingresa('6', 'Paciente Alfa');
  const PID_P = camaDe('6').PATIENT_ID;
  SIM.fecha = '2026-08-09';
  const rT0 = api('GUARDAR_EVOLUCION', payload('6', TK0, { EPISODIO_ABIERTO: PID_P }), null);
  SIM.fecha = '2026-08-10';
  const rT1 = api('GUARDAR_EVOLUCION', payload('6', TK1, Object.assign({ EPISODIO_ABIERTO: PID_P, DIAS_VM_PREVIOS: 9 }, EXT)), null);
  si('(el montaje) P ingresa y guarda sus dos turnos', rIng.ok && rT0.ok && rT1.ok);
  const DVM = parseInt((evoDe(TK1) || {}).DIAS_VM) || 0;
  si('(el montaje) el turno del evento deja DIAS_VM > 0 (si no, restar dos veces no se vería)', DVM > 0);
  eq('(el montaje) y los días de VM previos que se van a restar', (evoDe(TK1) || {}).DIAS_VM_PREVIOS, 9);
  const FOTO_P = M.foto();
  let PID_Q = '';

  const volver = () => {
    M.restaurar(FOTO_P); M.reiniciar();
    SIM.fecha = '2026-08-10'; SIM.hora = '12:00:00';
    ctl.antesDelCuerpo = null; ctl.cache.fallar(false);
    delete CONFIG.CONTRATO_ESTRICTO;
  };
  const sinBit = () => M.instantanea({ sinHojas: ['AUDIT_LOG'] });
  const anula = extra => Object.assign({ idCama: '6', turnoKey: TK1, tipo: 'pve_ext' }, extra || {});
  const ajenos = () => [PID_P, PID_Q].filter(Boolean);
  const sinDatosAjenosB = txt => !ajenos().some(p => String(txt).includes(p)) && !/Alfa|Bravo/.test(String(txt));

  // Una anulación y todo lo que hay que mirar de ella. `hook` es «la otra petición»: corre DENTRO de la espera del
  // candado, o sea después de lo que se leyó FUERA del lock y antes de lo que se lee DENTRO. Lo que escribe el gancho
  // no cuenta como escritura de la anulación: se descuenta el conteo y la foto de la base al terminar el gancho.
  function intento(datos, hook) {
    M.reiniciar();
    let n0 = 0, foto = sinBit(), hookOk = null;
    if (hook) ctl.antesDelCuerpo = () => { hookOk = hook(); n0 = M.total(); foto = sinBit(); };
    const a0 = DB.AUDIT_LOG.length;
    const r = callando(() => api('ANULAR_EVENTO', datos, null));
    ctl.antesDelCuerpo = null;
    return {
      r, hookOk, escrituras: M.registro().slice(n0), igual: sinBit() === foto,
      bit: DB.AUDIT_LOG.slice(a0).filter(f => String(f.accion).indexOf('ANULAR_EVENTO') === 0),
    };
  }
  // El contrato de un rechazo: sin éxito, con el código y la frase que se espera, sin escribir NADA y dejando la huella.
  function rechazo(etiqueta, i, codigo, frase) {
    no('★ ' + etiqueta + ': se RECHAZA', i.r.ok);
    eq('   …con código ' + codigo, i.r.codigo, codigo);
    si('   …y el motivo que se le muestra a la persona (' + frase + ')', frase.test(i.r.error || ''));
    si('   …nombra la cama 6', /\bcama 6\b/.test(i.r.error || ''));
    si('★★ …sin nombrar a nadie ni dar el identificador de ningún paciente (Ley 19.628)', sinDatosAjenosB(i.r.error || ''));
    eq('★★ ' + etiqueta + ': NINGUNA escritura aterrizó', i.escrituras.join(' | ') || '(ninguna)', '(ninguna)');
    si('★★ …y la base COMPLETA quedó idéntica (salvo la bitácora)', i.igual);
    eq('   …la bitácora gana UNA fila: <ACCION>_RECHAZADO', i.bit.map(f => f.accion).join(','), 'ANULAR_EVENTO_RECHAZADO');
    eq('   …que nombra la cama del intento', (i.bit[0] || {}).idEntidad, '6');
  }

  /* ── B1 · lo de todos los días sigue igual ──────────────────────────── */
  console.log('   · B1 · el episodio vigente anula como siempre (y la pantalla vieja también)');
  volver();
  let i = intento(anula({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente (EPISODIO_ABIERTO = el de la cama) la anulación PASA', i.r.ok);
  eq('   …y no es un «ya estaba»', i.r.data && i.r.data.yaEstaba, undefined);
  eq('   …el evento ya no está en el turno', String(evoDe(TK1).EXT_OCURRIO) + '/' + String(evoDe(TK1).EXT_TIPO), '/');
  eq('   …la vía aérea de salida vuelve a la de entrada', evoDe(TK1).VENT_VIA_AEREA_FINAL, 'TOT');
  eq('   …los días de VM previos pierden los días de VM del turno, UNA vez', evoDe(TK1).DIAS_VM_PREVIOS, 9 - DVM);
  eq('   …la cama vuelve a estar ventilada por TOT', camaDe('6').VIA_AEREA + '/' + camaDe('6').SOPORTE, 'TOT/VM');
  eq('   …y sigue siendo de P', camaDe('6').PATIENT_ID, PID_P);
  eq('   …la bitácora dice «anular_pve_ext» y NO lleva « [sin episodio]» (declaró episodio)', (i.bit[0] || {}).accion + '/' + (i.bit[0] || {}).resumen, 'ANULAR_EVENTO/anular_pve_ext');
  volver();
  i = intento(anula());
  si('★ la pantalla VIEJA (sin EPISODIO_ABIERTO) también pasa en modo tolerante: compatibilidad', i.r.ok);
  eq('   …y la bitácora lo anota « [sin episodio]» para medir cuántas llamadas siguen sin candado', (i.bit[0] || {}).resumen, 'anular_pve_ext [sin episodio]');
  volver();
  i = intento(anula({ EPISODIO_ABIERTO: PID_P, patientId: PID_P }));
  si('   …y declarando además el episodio con patientId (como el ➕) pasa igual', i.r.ok);

  /* ── B2 · formulario abierto para P, entremedio alta de P e ingreso de Q ─ */
  console.log('   · B2 · formulario abierto para P; entremedio, alta de P e ingreso de Q');
  volver();
  let rr = darAlta('6'); si('(la otra persona da el alta a P)', rr.ok);
  rr = ingresa('6', 'Paciente Bravo'); si('(y ingresa a Q en la misma cama)', rr.ok);
  PID_Q = camaDe('6').PATIENT_ID;
  si('(Q es otro episodio)', PID_Q && PID_Q !== PID_P);
  i = intento(anula({ EPISODIO_ABIERTO: PID_P }));
  rechazo('el formulario de P sobre la cama de Q', i, 'VALIDACION', EP_CAMBIO_RE);
  eq('   …la cama 6 sigue siendo de Q', camaDe('6').PATIENT_ID, PID_Q);

  // Lo mismo, pero el alta y el ingreso ocurren MIENTRAS esta petición espera el candado: lo que se leyó antes de tomarlo
  // (la evolución, la cama) está viejo. Con las lecturas fuera del lock esto pasaba; dentro, no.
  volver(); PID_Q = '';
  i = intento(anula({ EPISODIO_ABIERTO: PID_P }), () => {
    const a = darAlta('6'); const b = ingresa('6', 'Paciente Bravo');
    PID_Q = camaDe('6').PATIENT_ID; return a.ok && b.ok;
  });
  si('(la otra petición sí dio el alta e ingresó a Q mientras esta esperaba el candado)', i.hookOk && PID_Q && PID_Q !== PID_P);
  rechazo('el alta y el ingreso llegan MIENTRAS se espera el candado', i, 'VALIDACION', EP_CAMBIO_RE);
  eq('★★ …la cama 6 sigue siendo de Q (no se le copió el estado de P)', camaDe('6').PATIENT_ID, PID_Q);
  eq('   …y la fila de P NO volvió a la hoja viva', DB.EVOLUCIONES.filter(e => e.PATIENT_ID === PID_P).length, 0);
  si('   …sigue en el archivo', DB.EVOLUCIONES_ARCHIVO.some(e => e.PATIENT_ID === PID_P));

  /* ── B3 · un turno del archivo no se anula ni resucita la cama ────────── */
  console.log('   · B3 · el turno está en EVOLUCIONES_ARCHIVO: se rechaza y la cama no se resucita');
  PID_Q = '';
  const libreSinResucitar = etiqueta => {
    eq('★★ ' + etiqueta + ': la cama 6 sigue LIBRE (no se resucitó al egresado)', camaDe('6').OCUPADA + '/' + (camaDe('6').PATIENT_ID || '(vacío)'), 'false/(vacío)');
    eq('★★ …y la hoja viva no ganó ninguna fila de P', DB.EVOLUCIONES.filter(e => e.PATIENT_ID === PID_P).length, 0);
    eq('   …el archivo conserva sus filas de P', DB.EVOLUCIONES_ARCHIVO.filter(e => e.PATIENT_ID === PID_P).length, 2);
  };
  volver(); darAlta('6');
  i = intento(anula({ patientId: PID_P }));
  rechazo('el egresado, nombrado por patientId, con la cama libre', i, 'VALIDACION', /archivad/i);
  libreSinResucitar('con patientId');
  volver(); darAlta('6');
  i = intento(anula());
  rechazo('el egresado, SIN patientId (se resuelve por la clave), con la cama libre', i, 'VALIDACION', /archivad/i);
  libreSinResucitar('sin patientId');
  volver(); darAlta('6');
  i = intento(anula({ EPISODIO_ABIERTO: PID_P }));
  rechazo('el formulario de P con la cama ya libre', i, 'VALIDACION', EP_CAMBIO_RE);
  libreSinResucitar('con el formulario abierto');
  // Control: con la cama ocupada por Q y el turno de P archivado, ya se rechazaba (episodio anterior) y se sigue rechazando.
  volver(); darAlta('6'); ingresa('6', 'Paciente Bravo'); PID_Q = camaDe('6').PATIENT_ID;
  const camaQ = JSON.stringify(camaDe('6'));
  i = intento(anula({ patientId: PID_P }));
  no('control: P nombrado por patientId con la cama de Q se rechaza (como antes)', i.r.ok);
  si('   …con el motivo de siempre (episodio anterior)', /paciente que est[aá] ahora|episodio anterior/i.test(i.r.error || ''));
  eq('   …sin escrituras y con la cama de Q byte a byte igual', i.escrituras.length + '/' + (JSON.stringify(camaDe('6')) === camaQ), '0/true');
  PID_Q = '';

  /* ── B4 · las lecturas van dentro del lock ──────────────────────────── */
  console.log('   · B4 · un guardado que se adelanta mientras se espera el candado no se pisa');
  volver();
  i = intento(anula({ EPISODIO_ABIERTO: PID_P }), () => api('GUARDAR_EVOLUCION', payload('6', TK1,
    Object.assign({ EPISODIO_ABIERTO: PID_P, VENT_FIO2: 77, VENT_VIA_AEREA: 'TOT' }, EXT)), null).ok);
  si('(el guardado de la otra petición, de ese mismo turno, aterrizó)', i.hookOk);
  si('★ la anulación PASA', i.r.ok);
  eq('★★ …y NO pisa lo que la otra petición acababa de escribir (FiO₂ 77, no la 50 que se leyó antes de esperar)', evoDe(TK1).VENT_FIO2, 77);
  eq('   …el evento ya no está', String(evoDe(TK1).EXT_OCURRIO), '');
  eq('   …y una sola fila de P en ese turno', DB.EVOLUCIONES.filter(e => e.TURNO_KEY === TK1 && e.PATIENT_ID === PID_P).length, 1);

  volver();
  i = intento(anula({ EPISODIO_ABIERTO: PID_P }), () => api('GUARDAR_EVOLUCION', payload('6', TK2,
    { EPISODIO_ABIERTO: PID_P, VENT_VIA_AEREA: 'Natural', VENT_SOPORTE: 'Ambiente', VENT_MODO: 'Sin soporte' }), null).ok);
  si('(la otra petición guardó el turno SIGUIENTE de P mientras esta esperaba)', i.hookOk);
  no('★★ la anulación se RECHAZA: ya hay un turno construido sobre ese estado', i.r.ok);
  eq('   …con código de validación', i.r.codigo, 'VALIDACION');
  si('   …y dice que solo se anula desde la última evolución', /[ÚU]LTIMA evoluci[oó]n/i.test(i.r.error || ''));
  eq('★★ …y NINGUNA escritura de la anulación aterrizó', i.escrituras.join(' | ') || '(ninguna)', '(ninguna)');
  si('   …y la base quedó como la dejó la otra petición', i.igual);
  si('   …con el evento todavía en su turno', esVerdaderoB(evoDe(TK1).EXT_OCURRIO));

  /* ── B5 · anular dos veces ──────────────────────────────────────────── */
  console.log('   · B5 · anular dos veces: la segunda es «ya estaba» y no vuelve a restar');
  volver();
  const e0 = evoDe(TK1);
  const prev0 = parseInt(e0.DIAS_VM_PREVIOS);
  i = intento(anula({ EPISODIO_ABIERTO: PID_P }));
  si('(la primera anulación pasa)', i.r.ok);
  const prev1 = parseInt(evoDe(TK1).DIAS_VM_PREVIOS);
  eq('(y resta los días de VM del turno una vez)', prev1, prev0 - DVM);
  const fotoTras1 = sinBit();
  const i2 = intento(anula({ EPISODIO_ABIERTO: PID_P }));
  si('★ la SEGUNDA anulación contesta ok (no es un error: ya estaba hecho)', i2.r.ok);
  eq('   …marcada como «ya estaba»', i2.r.data && i2.r.data.yaEstaba, true);
  eq('★★ …sin volver a restar los días de VM previos', parseInt(evoDe(TK1).DIAS_VM_PREVIOS), prev1);
  eq('★★ …sin NINGUNA escritura', i2.escrituras.join(' | ') || '(ninguna)', '(ninguna)');
  si('   …y la base idéntica a la de después de la primera', sinBit() === fotoTras1);
  si('   …y devuelve lo mismo que una anulación (la pantalla recarga el turno igual)', i2.r.data && i2.r.data.idEvolucion === i.r.data.idEvolucion && i2.r.data.idCama === '6');
  const i3 = intento(anula({ EPISODIO_ABIERTO: PID_P }));
  eq('   …y una tercera también', (i3.r.data || {}).yaEstaba + '/' + parseInt(evoDe(TK1).DIAS_VM_PREVIOS), 'true/' + prev1);

  /* ── B6 · modo estricto ─────────────────────────────────────────────── */
  console.log('   · B6 · modo estricto (CONFIG.CONTRATO_ESTRICTO = TRUE): el ausente rechaza');
  volver(); CONFIG.CONTRATO_ESTRICTO = 'TRUE';
  i = intento(anula());
  no('★ sin EPISODIO_ABIERTO se RECHAZA: la pantalla es de una versión anterior', i.r.ok);
  eq('   …con código de validación', i.r.codigo, 'VALIDACION');
  si('   …y dice que hay que recargar', /versi[oó]n anterior/i.test(i.r.error || '') && /rec[aá]rgala/i.test(i.r.error || ''));
  no('   …SIN la frase «cambió de paciente»', EP_CAMBIO_RE.test(i.r.error || ''));
  eq('★★ …sin escribir nada', i.escrituras.join(' | ') || '(ninguna)', '(ninguna)');
  si('   …y la base idéntica', i.igual);
  i = intento(anula({ EPISODIO_ABIERTO: '' }));
  no('★ el VACÍO tampoco se acepta sobre una cama con paciente', i.r.ok);
  si('   …es el cambio de paciente', EP_CAMBIO_RE.test(i.r.error || ''));
  eq('   …sin escribir nada', i.escrituras.length, 0);
  i = intento(anula({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente PASA también en modo estricto', i.r.ok);
  volver();

  /* ── B7 · la forma ──────────────────────────────────────────────────── */
  console.log('   · B7 · la forma: nada se lee antes del conLock');
  const svc = leer('svc_evoluciones.gs');
  const ini = svc.indexOf('function anularEvento(');
  const fin = svc.indexOf('\n}\n', ini);
  si('anularEvento existe en svc_evoluciones.gs', ini > -1 && fin > ini);
  const cuerpo = svc.slice(ini, fin).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  si('★ recibe el reclamo de episodio como ÚLTIMO parámetro: anularEvento(datos, ctx, ep)', /^function anularEvento\(datos, ctx, ep\)/.test(cuerpo));
  const iLock = cuerpo.indexOf('conLock(');
  si('toma el lock', iLock > -1);
  const antes = cuerpo.slice(0, iLock), dentro = cuerpo.slice(iLock);
  eq('★★ ANTES del conLock no se lee ninguna hoja (ni repo*, ni obtener*, ni el localizador): lo leído fuera del lock queda viejo',
    (antes.match(/\b(repo[A-Za-z]+|obtener[A-Za-z]+|_ubicar[A-Za-z]+)\(/g) || []).join(',') || '(nada)', '(nada)');
  si('★ DENTRO ubica el turno por episodio (_ubicarEvolucionDeTurno)', /_ubicarEvolucionDeTurno\(/.test(dentro));
  si('★ DENTRO compara el episodio (validarEpisodioPuerta)', /validarEpisodioPuerta\(/.test(dentro));
  si('   …y mira si la fila es viva (no resucita al archivado)', /\.vivo\b/.test(dentro));
  no('   …y ya no resuelve por obtenerEvolucion (que leía fuera del lock)', /obtenerEvolucion\(/.test(cuerpo));
});
/* ══ C · LAS PUERTAS QUE MUEVEN LA CAMA (paso 5) ══════════════════════════ */
console.log('\nC · DAR_ALTA, LIMPIAR_CAMA, INTERCAMBIAR_CAMAS y MOVER_A_CAMA_VACIA (paso 5): candado dentro del lock');
tramo('C', () => {
  const ctl = S.activarLockReal();
  const M = require('../sim/sim_muerte.js');
  global.Utilities.formatDate = (d) => {
    const p2 = n => ('0' + n).slice(-2);
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  };

  // ── Datos inventados, en camas que la sección B no tocó: P en la 3, R en la 4, la 5 y la 9 libres ──
  const TK0 = '2026-08-09-Dia', TK1 = '2026-08-10-Dia';
  const camaDe = id => DB.CAMAS_ESTADO.find(c => String(c.ID_CAMA) === String(id)) || {};
  const payload = (idCama, tk, extra) => Object.assign({
    ID_CAMA: String(idCama), TURNO_KEY: tk, PLAN_FIRMA_KINE: 'DMV',
    VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', VENT_MODO: 'ACVC',
    VENT_VT: 450, VENT_FR: 16, VENT_PEEP: 8, VENT_FIO2: 50, HEMO_ESTADO: 'Estable', SED_TIPO: 'Sin sedación',
  }, extra || {});
  const ingresa = (idCama, nombre) => api('INGRESAR_PACIENTE', { idCama: String(idCama), nombre, edad: 61, sexo: 'M',
    diagnostico: 'Dx de prueba', fechaIngreso: '2026-08-08', viaAerea: 'TOT', soporte: 'VM', modo: 'ACVC', firmaKine: 'DMV' }, null);
  // «La otra persona»: lo que pasa entremedio, SIN declarar episodio (es otra pantalla, no la que se prueba).
  const altaDe = idCama => api('DAR_ALTA', { idCama: String(idCama), motivoEgreso: 'Traslado a sala', destinoEgreso: 'Medicina', firmaKine: 'DMV' }, null);
  const limpiaDe = idCama => api('LIMPIAR_CAMA', { idCama: String(idCama) }, null);
  // Q llega a una cama y guarda un turno: así hay algo suyo que una puerta mal hecha podría llevarse.
  let PID_Q = '';
  const entraQ = idCama => {
    const a = ingresa(idCama, 'Paciente Charly');
    PID_Q = camaDe(idCama).PATIENT_ID;
    const b = api('GUARDAR_EVOLUCION', payload(idCama, TK1, { EPISODIO_ABIERTO: PID_Q }), null);
    return a.ok && b.ok;
  };

  // ── El montaje: P (cama 3) y R (cama 4), cada uno con dos turnos ──
  SIM.fecha = '2026-08-07'; SIM.hora = '12:00:00';
  const rIngP = ingresa('3', 'Paciente Alfa'); const PID_P = camaDe('3').PATIENT_ID;
  const rIngR = ingresa('4', 'Paciente Bravo'); const PID_R = camaDe('4').PATIENT_ID;
  SIM.fecha = '2026-08-09';
  const rT0 = [api('GUARDAR_EVOLUCION', payload('3', TK0, { EPISODIO_ABIERTO: PID_P }), null), api('GUARDAR_EVOLUCION', payload('4', TK0, { EPISODIO_ABIERTO: PID_R }), null)];
  SIM.fecha = '2026-08-10';
  const rT1 = [api('GUARDAR_EVOLUCION', payload('3', TK1, { EPISODIO_ABIERTO: PID_P }), null), api('GUARDAR_EVOLUCION', payload('4', TK1, { EPISODIO_ABIERTO: PID_R }), null)];
  si('(el montaje) P y R ingresan y guardan sus dos turnos', rIngP.ok && rIngR.ok && rT0.every(r => r.ok) && rT1.every(r => r.ok));
  si('(el montaje) son dos episodios distintos', PID_P && PID_R && PID_P !== PID_R);
  const FOTO_C = M.foto();

  const volver = () => {
    M.restaurar(FOTO_C); M.reiniciar();
    SIM.fecha = '2026-08-10'; SIM.hora = '12:00:00';
    ctl.antesDelCuerpo = null; ctl.cache.fallar(false);
    delete CONFIG.CONTRATO_ESTRICTO;
    PID_Q = '';
  };
  const sinBit = () => M.instantanea({ sinHojas: ['AUDIT_LOG'] });
  const ajenos = () => [PID_P, PID_R, PID_Q].filter(Boolean);
  const sinDatosAjenosC = txt => !ajenos().some(p => String(txt).includes(p)) && !/Alfa|Bravo|Charly/.test(String(txt));
  const evosDe = pid => DB.EVOLUCIONES.filter(e => e.PATIENT_ID === pid).length;
  const archivoDe = pid => DB.ARCHIVO_PACIENTES.filter(a => a.PATIENT_ID === pid).length;
  const hitosTraslado = () => DB.TIMELINE.filter(h => /^Traslado a Cama/.test(h.TEXTO || '')).length;

  // Una llamada y todo lo que hay que mirar de ella. `hook` es «la otra petición»: corre DENTRO de la espera del candado.
  // Lo que escribe el gancho no cuenta como escritura de la puerta: se descuenta el conteo y la foto al terminar el gancho.
  function corre(accion, datos, hook) {
    M.reiniciar();
    // 🪤 La bitácora también se mide DESPUÉS del gancho: «la otra persona» puede usar la misma puerta (dar el alta, limpiar)
    // y su fila no es la de la llamada que se prueba.
    let n0 = 0, foto = sinBit(), hookOk = null, a0 = DB.AUDIT_LOG.length;
    if (hook) ctl.antesDelCuerpo = () => { hookOk = hook(); n0 = M.total(); foto = sinBit(); a0 = DB.AUDIT_LOG.length; };
    const r = callando(() => api(accion, datos, null));
    ctl.antesDelCuerpo = null;
    return {
      r, hookOk, escrituras: M.registro().slice(n0), igual: sinBit() === foto,
      bit: DB.AUDIT_LOG.slice(a0).filter(f => String(f.accion).indexOf(accion) === 0),
    };
  }
  // El contrato de un rechazo: sin éxito, con el código y la frase que se espera, sin escribir NADA y dejando la huella.
  function rechazo(etiqueta, i, accion, codigo, frase, cama) {
    no('★ ' + etiqueta + ': se RECHAZA', i.r.ok);
    eq('   …con código ' + codigo, i.r.codigo, codigo);
    si('   …y el motivo que se le muestra a la persona (' + frase + ')', frase.test(i.r.error || ''));
    if (cama) si('   …nombra la cama ' + cama, new RegExp('\\bcama ' + cama + '\\b').test(i.r.error || ''));
    si('★★ …sin nombrar a nadie ni dar el identificador de ningún paciente (Ley 19.628)', sinDatosAjenosC(i.r.error || ''));
    eq('★★ ' + etiqueta + ': NINGUNA escritura aterrizó', i.escrituras.join(' | ') || '(ninguna)', '(ninguna)');
    si('★★ …y la base COMPLETA quedó idéntica (salvo la bitácora)', i.igual);
    eq('   …la bitácora gana UNA fila: ' + accion + '_RECHAZADO', i.bit.map(f => f.accion).join(','), accion + '_RECHAZADO');
  }
  // El contrato del «ya hecho»: ok, marcado, sin una sola escritura y dejando constancia de que fue una repetición.
  function yaHecho(etiqueta, i, accion) {
    si('★ ' + etiqueta + ': contesta OK (no es un error: ya estaba hecho)', i.r.ok);
    eq('   …marcada como «ya estaba»', i.r.data && i.r.data.yaEstaba, true);
    eq('★★ …sin NINGUNA escritura', i.escrituras.join(' | ') || '(ninguna)', '(ninguna)');
    si('★★ …y la base idéntica', i.igual);
    eq('   …la bitácora lo dice: «(ya estaba)»', (i.bit[0] || {}).accion + '/' + /\(ya estaba\)/.test((i.bit[0] || {}).resumen || ''), accion + '/true');
  }
  const VAL = 'VALIDACION', CON = 'CONFLICTO';
  const ESTRICTO = () => { CONFIG.CONTRATO_ESTRICTO = 'TRUE'; };
  const VIEJA = /versi[oó]n anterior/i;
  const OCUPADA_POR_OTRO = /ya est[aá] ocupada por otro paciente/i;
  const MARCA_ = ' [sin episodio]';

  /* ═════════ C1 · DAR_ALTA ═════════ */
  console.log('   · C1 · DAR_ALTA');
  const alta = extra => Object.assign({ idCama: '3', motivoEgreso: 'Traslado a sala', destinoEgreso: 'Medicina', firmaKine: 'DMV' }, extra || {});
  volver();
  let i = corre('DAR_ALTA', alta({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente (EPISODIO_ABIERTO = el de la cama) el alta PASA', i.r.ok);
  eq('   …y no es un «ya estaba»', i.r.data && i.r.data.yaEstaba, undefined);
  eq('   …P queda archivado UNA vez y la cama 3 libre', archivoDe(PID_P) + '/' + camaDe('3').OCUPADA, '1/false');
  eq('   …la bitácora dice «alta» y NO lleva « [sin episodio]» (declaró episodio)', (i.bit[0] || {}).accion + '/' + (i.bit[0] || {}).resumen, 'DAR_ALTA/alta');
  volver();
  i = corre('DAR_ALTA', alta());
  si('★ la pantalla VIEJA (sin EPISODIO_ABIERTO) también pasa en modo tolerante: compatibilidad', i.r.ok);
  eq('   …y la bitácora lo anota « [sin episodio]» para medir cuántas llamadas siguen sin candado', (i.bit[0] || {}).resumen, 'alta' + MARCA_);
  volver();
  i = corre('DAR_ALTA', alta({ EPISODIO_ABIERTO: '' }));
  si('   …y un VACÍO sobre una cama con paciente también pasa en tolerante (el vacío no reclama episodio)', i.r.ok);

  // El alta de P ya pasó y entró Q: el formulario de P NO le da el alta a Q.
  // 🪤 Con P ARCHIVADO el alta YA se hizo: ok «ya estaba» (el reintento de una respuesta perdida), y Q queda a salvo.
  volver(); altaDe('3'); entraQ('3');
  si('(montaje) la cama 3 es de Q y P está archivado', camaDe('3').PATIENT_ID === PID_Q && archivoDe(PID_P) === 1);
  i = corre('DAR_ALTA', alta({ EPISODIO_ABIERTO: PID_P }));
  yaHecho('el formulario de P, que ya tiene su alta, sobre la cama de Q', i, 'DAR_ALTA');
  eq('★★ …Q sigue en la cama 3 con su turno', camaDe('3').PATIENT_ID + '/' + evosDe(PID_Q), PID_Q + '/1');
  eq('★★ …y P no se archivó dos veces ni apareció una fila de Q en el archivo', archivoDe(PID_P) + '/' + archivoDe(PID_Q), '1/0');
  eq('   …devuelve el episodio que la pantalla declaró', i.r.data && i.r.data.patientId, PID_P);
  // Lo mismo, pero el alta de P y el ingreso de Q ocurren MIENTRAS esta petición espera el candado.
  volver();
  i = corre('DAR_ALTA', alta({ EPISODIO_ABIERTO: PID_P }), () => { const a = altaDe('3'); return a.ok && entraQ('3'); });
  si('(la otra petición dio el alta a P e ingresó a Q mientras esta esperaba el candado)', i.hookOk && PID_Q && PID_Q !== PID_P);
  yaHecho('el alta y el ingreso llegan MIENTRAS se espera el candado', i, 'DAR_ALTA');
  eq('★★ …Q sigue en la cama 3 y P se archivó UNA vez', camaDe('3').PATIENT_ID + '/' + archivoDe(PID_P), PID_Q + '/1');

  // P NO está archivado (se limpió, no se le dio el alta) y entró Q: no hay alta que reconocer, es un cambio de paciente.
  volver(); limpiaDe('3'); entraQ('3');
  si('(montaje) la cama 3 es de Q y P NO está archivado (se limpió)', camaDe('3').PATIENT_ID === PID_Q && archivoDe(PID_P) === 0);
  i = corre('DAR_ALTA', alta({ EPISODIO_ABIERTO: PID_P }));
  rechazo('el formulario de P (limpiado, sin alta) sobre la cama de Q', i, 'DAR_ALTA', VAL, EP_CAMBIO_RE, '3');
  eq('★★ …Q sigue en la cama 3 con su turno y NO hay egreso de nadie', camaDe('3').PATIENT_ID + '/' + evosDe(PID_Q) + '/' + DB.ARCHIVO_PACIENTES.length, PID_Q + '/1/0');
  volver();
  i = corre('DAR_ALTA', alta({ EPISODIO_ABIERTO: PID_P }), () => { const a = limpiaDe('3'); return a.ok && entraQ('3'); });
  si('(la otra petición limpió la cama de P e ingresó a Q mientras esta esperaba el candado)', i.hookOk && PID_Q && PID_Q !== PID_P);
  rechazo('la limpieza y el ingreso llegan MIENTRAS se espera el candado', i, 'DAR_ALTA', VAL, EP_CAMBIO_RE, '3');
  eq('★★ …Q sigue en la cama 3', camaDe('3').PATIENT_ID + '/' + DB.ARCHIVO_PACIENTES.length, PID_Q + '/0');

  // El reintento de un alta que SÍ aterrizó, sin que nadie haya entrado: cama libre y P en el archivo.
  volver();
  const i1 = corre('DAR_ALTA', alta({ EPISODIO_ABIERTO: PID_P }));
  si('(el primer intento aterriza)', i1.r.ok);
  const fotoTras1 = sinBit();
  i = corre('DAR_ALTA', alta({ EPISODIO_ABIERTO: PID_P }));
  yaHecho('el REINTENTO de un alta que ya aterrizó (cama libre, P en el archivo)', i, 'DAR_ALTA');
  eq('★★ …el egreso NO se duplica (inflaría el REM) y la base es la de después del primero', archivoDe(PID_P) + '/' + (sinBit() === fotoTras1), '1/true');
  // Cama libre SIN fila de archivo: P se trasladó o se limpió; no hay alta que reconocer.
  volver(); limpiaDe('3');
  i = corre('DAR_ALTA', alta({ EPISODIO_ABIERTO: PID_P }));
  rechazo('cama libre y P SIN fila de archivo', i, 'DAR_ALTA', VAL, EP_CAMBIO_RE, '3');

  console.log('      · C1 · modo estricto');
  volver(); ESTRICTO();
  i = corre('DAR_ALTA', alta());
  rechazo('sin EPISODIO_ABIERTO en modo estricto', i, 'DAR_ALTA', VAL, VIEJA, null);
  no('   …SIN la frase «cambió de paciente»', EP_CAMBIO_RE.test(i.r.error || ''));
  i = corre('DAR_ALTA', alta({ EPISODIO_ABIERTO: '' }));
  no('★ el VACÍO tampoco se acepta sobre una cama con paciente', i.r.ok);
  eq('   …sin escribir nada', i.escrituras.length, 0);
  i = corre('DAR_ALTA', alta({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente PASA también en modo estricto', i.r.ok);
  i = corre('DAR_ALTA', alta({ EPISODIO_ABIERTO: PID_P }));
  yaHecho('el «ya hecho» también vale en modo estricto', i, 'DAR_ALTA');

  /* ═════════ C2 · LIMPIAR_CAMA ═════════ */
  console.log('   · C2 · LIMPIAR_CAMA');
  const limpia = extra => Object.assign({ idCama: '3' }, extra || {});
  volver();
  i = corre('LIMPIAR_CAMA', limpia({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente la limpieza PASA y archiva las evoluciones de P', i.r.ok && i.r.data.archivadas === 2);
  eq('   …la cama 3 queda libre y la hoja viva sin filas de P', camaDe('3').OCUPADA + '/' + evosDe(PID_P), 'false/0');
  eq('   …la bitácora dice «limpiar» sin marca', (DB.AUDIT_LOG.filter(f => f.accion === 'LIMPIAR_CAMA').pop() || {}).resumen, 'limpiar');
  volver();
  i = corre('LIMPIAR_CAMA', limpia());
  si('★ la pantalla VIEJA también pasa en modo tolerante', i.r.ok);
  eq('   …y la bitácora la anota « [sin episodio]»', (i.bit.filter(f => f.accion === 'LIMPIAR_CAMA')[0] || {}).resumen, 'limpiar' + MARCA_);

  // El reintento de una limpieza que ya aterrizó: la cama quedó libre.
  volver();
  corre('LIMPIAR_CAMA', limpia({ EPISODIO_ABIERTO: PID_P }));
  i = corre('LIMPIAR_CAMA', limpia({ EPISODIO_ABIERTO: PID_P }));
  yaHecho('el REINTENTO de una limpieza que ya aterrizó (cama libre)', i, 'LIMPIAR_CAMA');
  // 🔴 La cama la ocupa OTRO: nunca se limpia al ocupante nuevo. CONFLICTO, no «ya hecho».
  volver(); altaDe('3'); entraQ('3');
  i = corre('LIMPIAR_CAMA', limpia({ EPISODIO_ABIERTO: PID_P }));
  rechazo('el formulario de P sobre la cama de Q (P dado de alta)', i, 'LIMPIAR_CAMA', CON, OCUPADA_POR_OTRO, '3');
  eq('★★ …Q sigue en la cama 3 con su turno VIVO (no se archivó)', camaDe('3').PATIENT_ID + '/' + evosDe(PID_Q) + '/' + DB.EVOLUCIONES_ARCHIVO.filter(e => e.PATIENT_ID === PID_Q).length, PID_Q + '/1/0');
  volver(); limpiaDe('3'); entraQ('3');
  i = corre('LIMPIAR_CAMA', limpia({ EPISODIO_ABIERTO: PID_P }));
  rechazo('el formulario de P sobre la cama de Q (P limpiado)', i, 'LIMPIAR_CAMA', CON, OCUPADA_POR_OTRO, '3');
  volver();
  i = corre('LIMPIAR_CAMA', limpia({ EPISODIO_ABIERTO: PID_P }), () => { const a = altaDe('3'); return a.ok && entraQ('3'); });
  si('(la otra petición dio el alta a P e ingresó a Q mientras esta esperaba el candado)', i.hookOk && PID_Q && PID_Q !== PID_P);
  rechazo('el alta y el ingreso llegan MIENTRAS se espera el candado', i, 'LIMPIAR_CAMA', CON, OCUPADA_POR_OTRO, '3');
  eq('★★ …Q sigue en la cama 3 con su turno vivo', camaDe('3').PATIENT_ID + '/' + evosDe(PID_Q), PID_Q + '/1');
  // Una cama ocupada SIN PATIENT_ID (episodio sin ingreso formal) tiene el pid vacío igual que una libre.
  volver();
  Object.assign(camaDe('5'), { OCUPADA: true, STATUS_CAMA: 'Ocupada', NOMBRE: 'Carga manual', PATIENT_ID: '' });
  i = corre('LIMPIAR_CAMA', limpia({ idCama: '5', EPISODIO_ABIERTO: PID_P }));
  rechazo('el formulario de P sobre una cama ocupada SIN PATIENT_ID (episodio sin ingreso formal)', i, 'LIMPIAR_CAMA', CON, OCUPADA_POR_OTRO, '5');
  eq('★★ …la cama 5 sigue ocupada (no se tomó por una cama libre)', camaDe('5').OCUPADA + '/' + camaDe('5').NOMBRE, 'true/Carga manual');
  i = corre('LIMPIAR_CAMA', limpia({ idCama: '5', EPISODIO_ABIERTO: '' }));
  si('   …pero con EPISODIO_ABIERTO vacío (la tarjeta no tenía episodio) SÍ se limpia, como hoy', i.r.ok && camaDe('5').OCUPADA === false);

  console.log('      · C2 · modo estricto');
  volver(); ESTRICTO();
  i = corre('LIMPIAR_CAMA', limpia());
  rechazo('sin EPISODIO_ABIERTO en modo estricto', i, 'LIMPIAR_CAMA', VAL, VIEJA, null);
  no('   …SIN la frase «cambió de paciente»', EP_CAMBIO_RE.test(i.r.error || ''));
  i = corre('LIMPIAR_CAMA', limpia({ EPISODIO_ABIERTO: '' }));
  no('★ el VACÍO tampoco se acepta sobre una cama con paciente', i.r.ok);
  i = corre('LIMPIAR_CAMA', limpia({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente PASA también en modo estricto', i.r.ok);
  i = corre('LIMPIAR_CAMA', limpia({ EPISODIO_ABIERTO: PID_P }));
  yaHecho('el «ya hecho» también vale en modo estricto', i, 'LIMPIAR_CAMA');

  /* ═════════ C3 · INTERCAMBIAR_CAMAS ═════════ */
  console.log('   · C3 · INTERCAMBIAR_CAMAS');
  const swap = extra => Object.assign({ idCamaA: '3', idCamaB: '4' }, extra || {});
  volver();
  i = corre('INTERCAMBIAR_CAMAS', swap({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: PID_R }));
  si('★ con las dos camas como se abrieron el intercambio PASA', i.r.ok);
  eq('   …y no es un «ya estaba»', i.r.data && i.r.data.yaEstaba, undefined);
  eq('   …la cama 3 pasa a ser de R y la 4 de P', camaDe('3').PATIENT_ID + '/' + camaDe('4').PATIENT_ID, PID_R + '/' + PID_P);
  eq('   …el episodio viaja: las evoluciones de P quedan en la cama 4 y las de R en la 3',
    DB.EVOLUCIONES.filter(e => e.PATIENT_ID === PID_P).every(e => e.ID_CAMA === '4') + '/' + DB.EVOLUCIONES.filter(e => e.PATIENT_ID === PID_R).every(e => e.ID_CAMA === '3'), 'true/true');
  eq('   …y dejó los dos hitos de traslado', hitosTraslado(), 2);
  eq('   …la bitácora dice «intercambio» sin marca', (i.bit[0] || {}).resumen, 'intercambio');
  volver();
  i = corre('INTERCAMBIAR_CAMAS', swap());
  si('★ la pantalla VIEJA (sin EPISODIO_ABIERTO) también pasa en modo tolerante', i.r.ok);
  eq('   …y la bitácora la anota « [sin episodio]»', (i.bit[0] || {}).resumen, 'intercambio' + MARCA_);
  volver();
  i = corre('INTERCAMBIAR_CAMAS', swap({ EPISODIO_ABIERTO: PID_P }));
  si('   …con A declarada y B ausente también pasa en tolerante (no se le inventa un conflicto a B)', i.r.ok);

  // La cama A cambió de paciente: P tuvo el alta y entró Q.
  volver(); altaDe('3'); entraQ('3');
  i = corre('INTERCAMBIAR_CAMAS', swap({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: PID_R }));
  rechazo('la cama A (3) ya es de Q', i, 'INTERCAMBIAR_CAMAS', VAL, EP_CAMBIO_RE, '3');
  eq('★★ …Q sigue en la 3 y R en la 4, con sus evoluciones', camaDe('3').PATIENT_ID + '/' + camaDe('4').PATIENT_ID + '/' + evosDe(PID_Q) + '/' + evosDe(PID_R), PID_Q + '/' + PID_R + '/1/2');
  volver();
  i = corre('INTERCAMBIAR_CAMAS', swap({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: PID_R }), () => { const a = altaDe('3'); return a.ok && entraQ('3'); });
  si('(la otra petición dio el alta a P e ingresó a Q mientras esta esperaba el candado)', i.hookOk && PID_Q && PID_Q !== PID_P);
  rechazo('el alta y el ingreso llegan MIENTRAS se espera el candado', i, 'INTERCAMBIAR_CAMAS', VAL, EP_CAMBIO_RE, '3');
  eq('★★ …Q sigue en la 3 y R en la 4', camaDe('3').PATIENT_ID + '/' + camaDe('4').PATIENT_ID, PID_Q + '/' + PID_R);
  // La cama B cambió: R tuvo el alta y entró Q a la 4.
  volver(); altaDe('4'); entraQ('4');
  i = corre('INTERCAMBIAR_CAMAS', swap({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: PID_R }));
  rechazo('la cama B (4) ya es de Q', i, 'INTERCAMBIAR_CAMAS', VAL, EP_CAMBIO_RE, '4');
  no('   …y el mensaje NO habla de la cama A (la A sigue siendo la de P)', /\bcama 3\b/.test(i.r.error || ''));
  eq('★★ …P sigue en la 3 y Q en la 4', camaDe('3').PATIENT_ID + '/' + camaDe('4').PATIENT_ID, PID_P + '/' + PID_Q);

  // El reintento de un intercambio que SÍ aterrizó: A ya tiene el paciente de B y B el de A. Repetirlo lo DESHARÍA.
  volver();
  const j1 = corre('INTERCAMBIAR_CAMAS', swap({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: PID_R }));
  si('(el primer intento aterriza)', j1.r.ok);
  const fotoSwap = sinBit();
  i = corre('INTERCAMBIAR_CAMAS', swap({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: PID_R }));
  yaHecho('el REINTENTO de un intercambio que ya aterrizó (A tiene a R y B tiene a P)', i, 'INTERCAMBIAR_CAMAS');
  eq('★★ …las camas siguen cruzadas (repetirlo las habría DESHECHO) y no hay hitos de traslado de más',
    camaDe('3').PATIENT_ID + '/' + camaDe('4').PATIENT_ID + '/' + hitosTraslado() + '/' + (sinBit() === fotoSwap), PID_R + '/' + PID_P + '/2/true');
  // Mitad hecha: A ya tiene el de B, pero B conserva el suyo. Con un solo setValues no debería existir; si existe no es un reintento seguro.
  volver();
  Object.assign(camaDe('3'), { PATIENT_ID: PID_R });
  i = corre('INTERCAMBIAR_CAMAS', swap({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: PID_R }));
  rechazo('mitad hecha (A ya tiene el de B pero B conserva el suyo)', i, 'INTERCAMBIAR_CAMAS', VAL, EP_CAMBIO_RE, '3');

  console.log('      · C3 · modo estricto');
  volver(); ESTRICTO();
  i = corre('INTERCAMBIAR_CAMAS', swap());
  rechazo('sin EPISODIO_ABIERTO en modo estricto', i, 'INTERCAMBIAR_CAMAS', VAL, VIEJA, null);
  i = corre('INTERCAMBIAR_CAMAS', swap({ EPISODIO_ABIERTO: PID_P }));
  no('★ A declarada y B ausente en modo estricto: se rechaza (la pantalla vieja no sabe decir lo de B)', i.r.ok);
  eq('   …sin escribir nada', i.escrituras.length, 0);
  i = corre('INTERCAMBIAR_CAMAS', swap({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: PID_R }));
  si('★ con las dos camas como se abrieron PASA también en modo estricto', i.r.ok);
  i = corre('INTERCAMBIAR_CAMAS', swap({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: PID_R }));
  yaHecho('el «ya hecho» también vale en modo estricto', i, 'INTERCAMBIAR_CAMAS');

  /* ═════════ C4 · MOVER_A_CAMA_VACIA ═════════ */
  console.log('   · C4 · MOVER_A_CAMA_VACIA');
  const mueve = extra => Object.assign({ idOrigen: '3', idDestino: '9' }, extra || {});
  volver();
  i = corre('MOVER_A_CAMA_VACIA', mueve({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: '' }));
  si('★ con el origen como se abrió y el destino libre el traslado PASA', i.r.ok);
  eq('   …y no es un «ya estaba»', i.r.data && i.r.data.yaEstaba, undefined);
  eq('   …P pasa a la cama 9 y la 3 queda libre', camaDe('9').PATIENT_ID + '/' + camaDe('3').OCUPADA, PID_P + '/false');
  eq('   …las evoluciones de P viajan a la 9 y queda UN hito de traslado', DB.EVOLUCIONES.filter(e => e.PATIENT_ID === PID_P).every(e => e.ID_CAMA === '9') + '/' + hitosTraslado(), 'true/1');
  eq('   …la bitácora dice «mover_cama_vacia» sin marca', (i.bit[0] || {}).resumen, 'mover_cama_vacia');
  volver();
  i = corre('MOVER_A_CAMA_VACIA', mueve());
  si('★ la pantalla VIEJA (sin EPISODIO_ABIERTO) también pasa en modo tolerante', i.r.ok);
  eq('   …y la bitácora la anota « [sin episodio]»', (i.bit[0] || {}).resumen, 'mover_cama_vacia' + MARCA_);
  volver();
  i = corre('MOVER_A_CAMA_VACIA', mueve({ EPISODIO_ABIERTO: PID_P }));
  si('   …con el destino SIN declarar también pasa en tolerante (no se le inventa un conflicto)', i.r.ok);

  // El destino lo ocupó OTRO mientras se elegía: CONFLICTO (otra persona se adelantó).
  volver(); entraQ('9');
  i = corre('MOVER_A_CAMA_VACIA', mueve({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: '' }));
  rechazo('el destino (9) lo ocupó Q mientras se elegía', i, 'MOVER_A_CAMA_VACIA', CON, /ya fue ocupada por otro paciente/i, '9');
  eq('★★ …P sigue en la 3 y Q en la 9 con su turno', camaDe('3').PATIENT_ID + '/' + camaDe('9').PATIENT_ID + '/' + evosDe(PID_Q), PID_P + '/' + PID_Q + '/1');
  volver();
  i = corre('MOVER_A_CAMA_VACIA', mueve({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: '' }), () => entraQ('9'));
  si('(la otra petición ingresó a Q en la 9 mientras esta esperaba el candado)', i.hookOk && PID_Q);
  rechazo('Q llega al destino MIENTRAS se espera el candado', i, 'MOVER_A_CAMA_VACIA', CON, /ya fue ocupada por otro paciente/i, '9');
  eq('★★ …P sigue en la 3 y Q en la 9', camaDe('3').PATIENT_ID + '/' + camaDe('9').PATIENT_ID, PID_P + '/' + PID_Q);
  // El origen cambió de paciente: P tuvo el alta y entró Q a la 3.
  volver(); altaDe('3'); entraQ('3');
  i = corre('MOVER_A_CAMA_VACIA', mueve({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: '' }));
  rechazo('el origen (3) ya es de Q', i, 'MOVER_A_CAMA_VACIA', VAL, EP_CAMBIO_RE, '3');
  eq('★★ …Q sigue en la 3 y la 9 sigue libre', camaDe('3').PATIENT_ID + '/' + camaDe('9').OCUPADA, PID_Q + '/false');
  volver();
  i = corre('MOVER_A_CAMA_VACIA', mueve({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: '' }), () => { const a = altaDe('3'); return a.ok && entraQ('3'); });
  si('(la otra petición dio el alta a P e ingresó a Q mientras esta esperaba el candado)', i.hookOk && PID_Q && PID_Q !== PID_P);
  rechazo('el alta y el ingreso llegan MIENTRAS se espera el candado', i, 'MOVER_A_CAMA_VACIA', VAL, EP_CAMBIO_RE, '3');
  // El origen quedó libre pero el destino NO tiene a P (se limpió sin mover): no es «ya hecho».
  volver(); limpiaDe('3');
  i = corre('MOVER_A_CAMA_VACIA', mueve({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: '' }));
  rechazo('el origen quedó libre pero P NO está en el destino', i, 'MOVER_A_CAMA_VACIA', VAL, EP_CAMBIO_RE, '3');

  // El reintento de un traslado que SÍ aterrizó: el destino ya tiene a P y el origen quedó libre.
  volver();
  const k1 = corre('MOVER_A_CAMA_VACIA', mueve({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: '' }));
  si('(el primer intento aterriza)', k1.r.ok);
  const fotoMov = sinBit();
  i = corre('MOVER_A_CAMA_VACIA', mueve({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: '' }));
  yaHecho('el REINTENTO de un traslado que ya aterrizó (P ya está en la 9, la 3 libre)', i, 'MOVER_A_CAMA_VACIA');
  eq('★★ …P sigue en la 9, UN solo hito de traslado y la base es la de después del primero', camaDe('9').PATIENT_ID + '/' + hitosTraslado() + '/' + (sinBit() === fotoMov), PID_P + '/1/true');
  eq('   …devuelve el episodio que la pantalla declaró', i.r.data && i.r.data.patientId, PID_P);

  console.log('      · C4 · modo estricto');
  volver(); ESTRICTO();
  i = corre('MOVER_A_CAMA_VACIA', mueve());
  rechazo('sin EPISODIO_ABIERTO en modo estricto', i, 'MOVER_A_CAMA_VACIA', VAL, VIEJA, null);
  i = corre('MOVER_A_CAMA_VACIA', mueve({ EPISODIO_ABIERTO: PID_P }));
  no('★ el destino SIN declarar en modo estricto se rechaza', i.r.ok);
  eq('   …sin escribir nada', i.escrituras.length, 0);
  i = corre('MOVER_A_CAMA_VACIA', mueve({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: '' }));
  si('★ con origen y destino como se abrieron PASA también en modo estricto', i.r.ok);
  i = corre('MOVER_A_CAMA_VACIA', mueve({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: '' }));
  yaHecho('el «ya hecho» también vale en modo estricto', i, 'MOVER_A_CAMA_VACIA');
  volver();

  /* ═════════ C5 · la forma ═════════ */
  console.log('   · C5 · la forma: la comparación va DENTRO del lock, antes de la primera escritura, y nada se lee antes');
  const svc = leer('svc_camas.gs');
  const cuerpoDe = nombre => {
    const ini = svc.indexOf('function ' + nombre + '(');
    const fin = ini === -1 ? -1 : svc.indexOf('\n}\n', ini);
    return (ini === -1 || fin === -1) ? '' : svc.slice(ini, fin).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  };
  const PUERTAS = [
    ['darAltaPaciente', 'DAR_ALTA', /^function darAltaPaciente\(datos, ctx, ep\)/],
    ['limpiarCama', 'LIMPIAR_CAMA', /^function limpiarCama\(idCama, ep\)/],
    ['intercambiarCamas', 'INTERCAMBIAR_CAMAS', /^function intercambiarCamas\(idA, idB, ctx, ep\)/],
    ['moverACamaVacia', 'MOVER_A_CAMA_VACIA', /^function moverACamaVacia\(idOrigen, idDestino, ctx, ep\)/],
  ];
  PUERTAS.forEach(([fn, puerta, firma]) => {
    const c = cuerpoDe(fn);
    si('★ ' + fn + ' recibe el reclamo de episodio como ÚLTIMO parámetro', firma.test(c));
    const iLock = c.indexOf('conLock(');
    const iDec = c.indexOf("decidirEpisodioPuerta('" + puerta + "'");
    const escritura = c.search(/\b(repoInsertar|repoActualizar|repoActualizarDonde|repoEliminarDonde|repoUpsert|_limpiarCamaInterno|_archivarEvolucionesDeCama|_reetiquetarEpisodioACama|_agregarHitoInterno)\(/);
    si('   …toma el lock y DENTRO decide con decidirEpisodioPuerta(\'' + puerta + '\')', iLock > -1 && iDec > iLock);
    si('★★ …y la decisión va ANTES de la primera escritura', iDec > -1 && escritura > iDec);
    eq('   …y ANTES del conLock no se lee ninguna hoja', (c.slice(0, iLock).match(/\b(repo[A-Za-z]+|obtener[A-Za-z]+)\(/g) || []).join(',') || '(nada)', '(nada)');
    si('   …solo se invoca si el reclamo viene (o está el modo estricto): los bancos antiguos no cargan la regla', /_epReclamado\(ep\)/.test(c));
  });
  si('★ el reclamo se lee de la cama con el helper común (una cama libre tiene pid vacío aunque la fila conserve uno viejo)', /function _pidDeCama\(/.test(svc));
});

function esVerdaderoB(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }

terminar();
