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
// limpiar, intercambiar, mover); la D (paso 6) son las de eventos y línea de tiempo (anexar, anular un anexo, confirmar
// dispositivos, agregar un hito); la E (paso 7) son las de evaluaciones, pendientes, gases y coordinación.
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
//   D  · LAS PUERTAS DE EVENTOS Y LÍNEA DE TIEMPO (paso 6): ANEXAR_EVENTO, ANULAR_ANEXO, CONFIRMAR_DISPOSITIVOS y
//        AGREGAR_HITO. El ➕ se abre sobre la tarjeta de P y se envía después: si entremedio P recibió el alta y entró Q a la
//        misma cama, lo anotado se atribuía a Q. Un turno que nadie guardó no tiene fila que ubicar y el ➕ caía a «quien esté
//        en la cama» (reiniciaba el reloj del filtro de Q, le colgaba el cultivo y la nota); un procedimiento hallaba la
//        evolución de Q por la clave del turno (que es de la CAMA) y se sumaba a SU estadística; confirmar dispositivos
//        bastaba con que la cama estuviera ocupada; el hito se atribuía a quien estuviera en la cama. La regla: lo que la
//        pantalla abrió tiene que ser el episodio AL QUE SE ATRIBUYE lo anotado (el de la evolución ubicada, o el de quien
//        ocupa la cama si no hay ninguna), comparado DENTRO del lock y antes de escribir. Con el candado REAL y el gancho
//        antesDelCuerpo, por puerta:
//          Dx.a · el episodio vigente y la pantalla vieja siguen pasando (la vieja queda anotada « [sin episodio]»);
//          Dx.b · formulario de P y la cama ya de Q: rechazo con CERO escrituras y la base idéntica, ya ocurrido y
//                 ocurriendo MIENTRAS se espera el candado (en ANEXAR, para dispositivo, cultivo, «otro» y procedimiento);
//          Dx.c · modo estricto (ausente rechaza; el patientId declarado hace de respaldo en el ➕).
//        🪤 CON EL EPISODIO CERRADO EL CANDADO DE COORDINACIÓN NO SE TOCA: quien anota sobre P ya egresado declara a P, la
//        comparación pasa y la clave se pide igual que antes (sin clave, NO_AUTORIZADO; con clave, entra y el hito es de P).
//        D5 · la forma: la comparación va DENTRO del lock, antes de la primera escritura, y nada se lee antes.
//   E  · EVALUACIONES, ESCALAS, PENDIENTES, GASES Y COORDINACIÓN (paso 7): EVAL_REGISTRAR, EPISODIO_ESCALA, PEND_ABRIR,
//        PEND_CERRAR, GSA_ASIGNAR y COORD_CORREGIR. Cada una escribía sobre «quien esté en la cama»: la medición (y su
//        espejo ULT_* en la cama), la escala previa a la UCI, el encargo del turno que viene, el gas de la bandeja. El
//        formulario de P, abierto mientras P recibía el alta y Q ocupaba la cama, dejaba la medición, la escala, el
//        pendiente o el gas en la ficha de Q. Con el candado REAL y el gancho antesDelCuerpo, por puerta:
//          Ex.a · el episodio vigente y la pantalla vieja siguen pasando (la vieja queda anotada « [sin episodio]»);
//          Ex.b · formulario de P y la cama ya de Q: rechazo con CERO escrituras y la base idéntica, ya ocurrido y
//                 ocurriendo MIENTRAS se espera el candado (con el motivo del cambio de paciente: un pendiente que
//                 Q ya tenía NO se responde «ya está abierto»);
//          Ex.c · modo estricto (ausente rechaza; en EVAL_REGISTRAR un patientId declarado NO hace de reclamo).
//        🪤 COORD_CORREGIR ya traía el episodio (patientId), pero `_coordUbicar` lo ignoraba cuando no lo encontraba en
//        ninguna parte (un episodio que se limpió no queda en ARCHIVO_PACIENTES) y caía a la cama: el cambio se
//        escribía en la ficha de quien estuviera ahora. Con patientId NUNCA se resuelve por cama; en modo estricto, sin
//        patientId se rechaza si la cama tiene paciente.
//        E7 · la forma: la comparación va DENTRO del lock, antes de la primera escritura, y nada se lee antes.
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
    : '\n✅ guardado_seguro_episodio_g14: la regla pura del episodio, su rastro en la bitácora, ANULAR_EVENTO, las cuatro puertas que mueven la cama, las de eventos y línea de tiempo y las de evaluaciones, pendientes, gases y coordinación con candado.');
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
  /* H34(2) (revisión de la tanda 2, 10-oct-2026). El mensaje es UNO para todas las puertas, y varias no abren un formulario sino un
     DIÁLOGO (egreso, mover, intercambiar, anular, escalas, gases): «desde que abriste este formulario… Cierra el formulario» le hablaba a
     quien confirmaba un egreso de algo que no tenía delante. Ahora vale para los dos: dice «ventana». */
  no('★★ …NO habla de «formulario» (lo leen también los diálogos de egreso, mover, intercambiar, anular…, que no son un formulario)', /formulario/i.test(CAMBIO), CAMBIO);
  si('★★ …y le dice lo que hay que hacer con palabras que valen para un diálogo y para un formulario: «Cierra esta ventana y vuelve a abrir la cama»', /Cierra esta ventana y vuelve a abrir la cama/.test(CAMBIO), CAMBIO);
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
  // `cama` es la del intento (la 6 por omisión, la de P en esta sección); los casos de la revisión (B8) prueban otras.
  function rechazo(etiqueta, i, codigo, frase, cama) {
    cama = cama || '6';
    no('★ ' + etiqueta + ': se RECHAZA', i.r.ok);
    eq('   …con código ' + codigo, i.r.codigo, codigo);
    si('   …y el motivo que se le muestra a la persona (' + frase + ')', frase.test(i.r.error || ''));
    si('   …nombra la cama ' + cama, new RegExp('\\bcama ' + cama + '\\b').test(i.r.error || ''));
    si('★★ …sin nombrar a nadie ni dar el identificador de ningún paciente (Ley 19.628)', sinDatosAjenosB(i.r.error || ''));
    eq('★★ ' + etiqueta + ': NINGUNA escritura aterrizó', i.escrituras.join(' | ') || '(ninguna)', '(ninguna)');
    si('★★ …y la base COMPLETA quedó idéntica (salvo la bitácora)', i.igual);
    eq('   …la bitácora gana UNA fila: <ACCION>_RECHAZADO', i.bit.map(f => f.accion).join(','), 'ANULAR_EVENTO_RECHAZADO');
    eq('   …que nombra la cama del intento', (i.bit[0] || {}).idEntidad, cama);
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

  /* ── B8 · los huecos que dejó la revisión (H1, H3, H5, H7) ─────────── */
  console.log('   · B8 · cama libre o sin dueño, el dueño de una cama LIBRE y el ocupante nuevo que comparte la clave del turno');

  // H1 · La cama 7 está LIBRE y un cliente armado a mano declara (patientId) a P, que está vivo en OTRA cama. El localizador hallaba la
  // fila de P por episodio, el rechazo «es de otro episodio» solo corría con la cama OCUPADA, la fila era viva (no archivada) y el sync le
  // escribía el estado de P a la cama libre dejándola OCUPADA: P en dos camas. La pantalla real no manda patientId, pero un payload armado
  // a mano sí, y el modo estricto no lo frena (el vacío sobre una cama libre pasa).
  const FRASE_NO_ESTA = /no est[aá] en la cama/i;
  volver();
  si('(montaje) la cama 7 está LIBRE y P está en la 6 con su turno vivo', camaDe('7').OCUPADA !== true && camaDe('6').PATIENT_ID === PID_P && !!evoDe(TK1, PID_P));
  const cama7 = JSON.stringify(camaDe('7'));
  i = intento(anula({ idCama: '7', patientId: PID_P, EPISODIO_ABIERTO: '' }));
  rechazo('H1 · cama LIBRE + patientId de un paciente vivo en OTRA cama (la pantalla vacía no reclama nada)', i, 'VALIDACION', FRASE_NO_ESTA, '7');
  eq('★★ …la cama 7 sigue LIBRE y sin un solo cambio (P no quedó en dos camas)', camaDe('7').OCUPADA + '|' + (JSON.stringify(camaDe('7')) === cama7), 'false|true');
  eq('   …y P sigue en la 6 con su extubación', camaDe('6').PATIENT_ID + '|' + String(evoDe(TK1, PID_P).EXT_OCURRIO), PID_P + '|true');
  volver();
  i = intento(anula({ idCama: '7', patientId: PID_P }));
  rechazo('H1 · lo mismo con la pantalla VIEJA (sin EPISODIO_ABIERTO)', i, 'VALIDACION', FRASE_NO_ESTA, '7');
  volver();
  i = intento(anula({ idCama: '7', patientId: PID_P, EPISODIO_ABIERTO: PID_P }));
  rechazo('H1 · declarando además a P como episodio abierto: la cama 7 no es de P', i, 'VALIDACION', EP_CAMBIO_RE, '7');
  // …o una cama OCUPADA sin PATIENT_ID (episodio sin ingreso formal): el sync le habría puesto el PATIENT_ID de P (P en dos camas).
  volver();
  Object.assign(camaDe('8'), { OCUPADA: true, STATUS_CAMA: 'Ocupada', NOMBRE: 'Carga manual', PATIENT_ID: '' });
  const cama8 = JSON.stringify(camaDe('8'));
  i = intento(anula({ idCama: '8', patientId: PID_P, EPISODIO_ABIERTO: '' }));
  rechazo('H1 · cama OCUPADA sin PATIENT_ID + patientId de un paciente vivo en otra cama', i, 'VALIDACION', FRASE_NO_ESTA, '8');
  eq('★★ …la cama 8 sigue como estaba (sin el PATIENT_ID de P)', JSON.stringify(camaDe('8')) === cama8, true);

  // H5 · Una cama LIBRE no tiene dueño aunque la fila conserve el PATIENT_ID viejo (la fila editada a mano en la planilla): el reclamo
  // de P NO puede coincidir con quien ya no está. Antes la puerta leía el PATIENT_ID crudo, el reclamo coincidía, `ubic` era la fila
  // viva de P y el sync reocupaba la cama (OCUPADA:true). DAR_ALTA, LIMPIAR_CAMA, INTERCAMBIAR y MOVER ya la trataban como sin dueño.
  volver();
  camaDe('6').OCUPADA = false;                      // libre; PATIENT_ID sigue siendo el de P
  si('(montaje) la cama 6 está LIBRE pero conserva el PATIENT_ID de P, y el turno de P sigue vivo', camaDe('6').PATIENT_ID === PID_P && !!evoDe(TK1, PID_P));
  i = intento(anula({ EPISODIO_ABIERTO: PID_P }));
  rechazo('H5 · el formulario de P sobre una cama LIBRE que conserva su PATIENT_ID', i, 'VALIDACION', EP_CAMBIO_RE);
  eq('★★ …la cama 6 sigue LIBRE (no se reocupó con el estado de P)', camaDe('6').OCUPADA, false);
  volver(); camaDe('6').OCUPADA = false;
  i = intento(anula());
  rechazo('H5 · lo mismo con la pantalla VIEJA: sin reclamo, una evolución viva de alguien que no está en la cama tampoco se anula', i, 'VALIDACION', FRASE_NO_ESTA);
  eq('★★ …la cama 6 sigue LIBRE', camaDe('6').OCUPADA, false);

  // H3 · H7 · Misma cama y mismo turno para dos pacientes: P recibió el alta (su fila va al archivo CONSERVANDO la clave) y Q ingresó a
  // la misma cama y guardó ese turno con una extubación. La clave CAMA_6_<turno> está UNA vez en EVOLUCIONES y UNA en EVOLUCIONES_ARCHIVO.
  // La pantalla manda {idCama, turnoKey, tipo, EPISODIO_ABIERTO} y no patientId: el localizador resolvía por clave, contaba dos y
  // contestaba «dos pacientes»; Q no tenía cómo anular su propio evento. El reclamo (ya comparado con la cama) lo identifica sin duda.
  volver(); darAlta('6');
  rr = ingresa('6', 'Paciente Bravo'); PID_Q = camaDe('6').PATIENT_ID;
  rr = api('GUARDAR_EVOLUCION', payload('6', TK1, Object.assign({ EPISODIO_ABIERTO: PID_Q }, EXT)), null);
  si('(montaje) P salió y Q guardó el MISMO turno con una extubación', rr.ok && PID_Q && PID_Q !== PID_P && String(evoDe(TK1, PID_Q).EXT_OCURRIO) === 'true');
  si('(montaje) la clave del turno está en las DOS hojas (una fila viva de Q y una de archivo de P)',
    DB.EVOLUCIONES.some(e => e.ID_EVOLUCION === 'CAMA_6_' + TK1 && e.PATIENT_ID === PID_Q) && DB.EVOLUCIONES_ARCHIVO.some(e => e.ID_EVOLUCION === 'CAMA_6_' + TK1 && e.PATIENT_ID === PID_P));
  const archivoP = JSON.stringify(DB.EVOLUCIONES_ARCHIVO.filter(e => e.PATIENT_ID === PID_P));
  const fotoDosPacientes = M.foto();
  i = intento(anula({ EPISODIO_ABIERTO: PID_Q }));
  si('★ H3/H7 · Q anula SU evento con lo que manda la pantalla (EPISODIO_ABIERTO, sin patientId): PASA', i.r.ok);
  eq('   …y no es un «ya estaba»', i.r.data && i.r.data.yaEstaba, undefined);
  eq('   …el evento ya no está en el turno de Q', String(evoDe(TK1, PID_Q).EXT_OCURRIO), '');
  eq('★★ …y la fila ARCHIVADA de P quedó como estaba', JSON.stringify(DB.EVOLUCIONES_ARCHIVO.filter(e => e.PATIENT_ID === PID_P)) === archivoP, true);
  eq('   …la cama 6 sigue siendo de Q', camaDe('6').PATIENT_ID, PID_Q);
  M.restaurar(fotoDosPacientes);
  i = intento(anula());
  no('control: un cliente SIN reclamo ni patientId sigue sin poder elegir entre dos pacientes (la ambigüedad queda para él)', i.r.ok);
  si('   …y lo dice', /dos pacientes en ese turno/i.test(i.r.error || ''));
  eq('   …sin escribir nada', i.escrituras.length, 0);
  M.restaurar(fotoDosPacientes);
  i = intento(anula({ EPISODIO_ABIERTO: PID_Q, patientId: PID_P }));
  no('control: un patientId declarado manda sobre el reclamo para ubicar la fila (la de P no es del ocupante: no se anula)', i.r.ok);
  si('   …y lo dice (es de un episodio anterior de la cama)', /episodio anterior/i.test(i.r.error || ''));
  eq('   …sin escribir nada', i.escrituras.length, 0);
  // Una fila ANTIGUA sin PATIENT_ID: el localizador por episodio no la halla, y la puerta tiene que seguir hallándola por la clave
  // como antes (adoptar su identidad no es asunto del reclamo).
  volver();
  evoDe(TK1, PID_P).PATIENT_ID = '';
  i = intento(anula({ EPISODIO_ABIERTO: PID_P }));
  si('★ una fila antigua SIN PATIENT_ID se sigue ubicando por la clave aunque la pantalla declare el episodio', i.r.ok);
  eq('   …y se le anuló el evento', String(DB.EVOLUCIONES.find(e => e.ID_EVOLUCION === 'CAMA_6_' + TK1).EXT_OCURRIO), '');
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

  /* ═════════ C6 · LA CAMA LIBRE NO TIENE DUEÑO Y EL «YA HECHO» NO SE REGALA (H4) ═════════ */
  console.log('   · C6 · una cama LIBRE con el PATIENT_ID viejo no es de nadie, y el «ya hecho» exige las DOS mitades');
  // 🔴 DE DÓNDE SALE. La revisión mutó cada puerta y estas variantes SOBREVIVÍAN con la guardia en verde, porque nadie ejercitaba el
  // caso que el código dice manejar: una cama LIBRE cuya fila conserva un PATIENT_ID (una fila editada a mano en la planilla). Con el
  // mutante «el pid ignora OCUPADA» el reclamo de P coincide con quien ya no está ahí: el alta cambia de mensaje, la limpieza archiva
  // las evoluciones VIVAS de P, el traslado reconoce un «ya hecho» que no ocurrió. Y dos «ya hecho» eran más generosos de lo que dice su
  // tabla: el intercambio evaluando solo la mitad B y el traslado sin exigir que el origen haya quedado libre.
  const libreConPid = (id, pid) => Object.assign(camaDe(id), { OCUPADA: false, PATIENT_ID: pid });

  // — DAR_ALTA —
  volver(); libreConPid('3', PID_P);
  si('(montaje) la cama 3 está LIBRE, conserva el PATIENT_ID de P y P NO está archivado', camaDe('3').OCUPADA === false && camaDe('3').PATIENT_ID === PID_P && archivoDe(PID_P) === 0);
  i = corre('DAR_ALTA', alta({ EPISODIO_ABIERTO: PID_P }));
  rechazo('H4 · alta con el formulario de P sobre una cama LIBRE que conserva su PATIENT_ID (P no está archivado)', i, 'DAR_ALTA', VAL, EP_CAMBIO_RE, '3');
  eq('★★ …P no se archivó y sus evoluciones siguen vivas', archivoDe(PID_P) + '/' + evosDe(PID_P), '0/2');

  // — LIMPIAR_CAMA —
  volver(); libreConPid('3', PID_P);
  i = corre('LIMPIAR_CAMA', limpia({ EPISODIO_ABIERTO: PID_P }));
  yaHecho('H4 · limpiar con el formulario de P sobre una cama LIBRE (no hay nada que limpiar)', i, 'LIMPIAR_CAMA');
  eq('★★ …las evoluciones VIVAS de P NO se archivaron', evosDe(PID_P) + '/' + DB.EVOLUCIONES_ARCHIVO.filter(e => e.PATIENT_ID === PID_P).length, '2/0');

  // — INTERCAMBIAR_CAMAS —
  // El intercambio aterrizó (3 = R, 4 = P); R recibió el alta y entró Q a la 3. El formulario VIEJO manda (P, R): B ya tiene a P, pero A la
  // ocupa un TERCERO. Con el «ya hecho» mirando solo la mitad B contestaba «ya estaba» y anotaba un traslado a nombre de Q.
  volver();
  const sw1 = corre('INTERCAMBIAR_CAMAS', swap({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: PID_R }));
  si('(el intercambio aterriza: 3 = R, 4 = P)', sw1.r.ok && camaDe('3').PATIENT_ID === PID_R && camaDe('4').PATIENT_ID === PID_P);
  altaDe('3'); entraQ('3');
  si('(montaje) R salió, la 3 es de Q y la 4 sigue con P', camaDe('3').PATIENT_ID === PID_Q && camaDe('4').PATIENT_ID === PID_P && archivoDe(PID_R) === 1);
  const trasladosQ0 = () => DB.TIMELINE.filter(h => h.PATIENT_ID === PID_Q && /^Traslado a Cama/.test(h.TEXTO || '')).length;
  i = corre('INTERCAMBIAR_CAMAS', swap({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: PID_R }));
  rechazo('H4 · el formulario VIEJO del intercambio: la B ya tiene a P pero la A la ocupa un TERCERO', i, 'INTERCAMBIAR_CAMAS', VAL, EP_CAMBIO_RE, '3');
  eq('★★ …Q sigue en la 3 y P en la 4, y no se anotó ningún traslado a nombre de Q', camaDe('3').PATIENT_ID + '/' + camaDe('4').PATIENT_ID + '/' + trasladosQ0(), PID_Q + '/' + PID_P + '/0');
  // El simétrico: P recibió el alta y entró Q a la 4. La A (3) ya tiene a R, pero la B la ocupa un tercero.
  volver();
  corre('INTERCAMBIAR_CAMAS', swap({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: PID_R }));
  altaDe('4'); entraQ('4');
  si('(montaje) P salió, la 4 es de Q y la 3 sigue con R', camaDe('4').PATIENT_ID === PID_Q && camaDe('3').PATIENT_ID === PID_R && archivoDe(PID_P) === 1);
  i = corre('INTERCAMBIAR_CAMAS', swap({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: PID_R }));
  rechazo('H4 · el formulario VIEJO del intercambio: la A ya tiene a R pero la B la ocupa un TERCERO', i, 'INTERCAMBIAR_CAMAS', VAL, EP_CAMBIO_RE, '3');
  eq('★★ …R sigue en la 3 y Q en la 4, y no se anotó ningún traslado a nombre de Q', camaDe('3').PATIENT_ID + '/' + camaDe('4').PATIENT_ID + '/' + trasladosQ0(), PID_R + '/' + PID_Q + '/0');
  // Dos camas LIBRES que conservan los PATIENT_ID cruzados: ninguna tiene dueño, así que no hay «ya hecho» que reconocer.
  volver(); libreConPid('3', PID_R); libreConPid('4', PID_P);
  i = corre('INTERCAMBIAR_CAMAS', swap({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: PID_R }));
  rechazo('H4 · dos camas LIBRES con los PATIENT_ID viejos cruzados', i, 'INTERCAMBIAR_CAMAS', VAL, EP_CAMBIO_RE, '3');

  // — MOVER_A_CAMA_VACIA —
  // El traslado aterrizó (P en la 9, la 3 libre) y entró Q a la 3. El formulario viejo manda (P, destino libre): el destino ya tiene a P,
  // pero el ORIGEN lo ocupa otro. Sin exigir el origen libre contestaba «ya estaba» a una cama que ahora es de Q.
  volver();
  const mv1 = corre('MOVER_A_CAMA_VACIA', mueve({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: '' }));
  si('(el traslado aterriza: P en la 9)', mv1.r.ok && camaDe('9').PATIENT_ID === PID_P && camaDe('3').OCUPADA === false);
  entraQ('3');
  si('(montaje) la 3 es de Q y P sigue en la 9', camaDe('3').PATIENT_ID === PID_Q && camaDe('9').PATIENT_ID === PID_P);
  i = corre('MOVER_A_CAMA_VACIA', mueve({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: '' }));
  rechazo('H4 · el destino ya tiene a P pero el ORIGEN lo ocupa OTRO', i, 'MOVER_A_CAMA_VACIA', VAL, EP_CAMBIO_RE, '3');
  eq('★★ …Q sigue en la 3 con su turno y P en la 9', camaDe('3').PATIENT_ID + '/' + evosDe(PID_Q) + '/' + camaDe('9').PATIENT_ID, PID_Q + '/1/' + PID_P);
  // El origen LIBRE que conserva el PATIENT_ID de P: el reclamo de P no coincide con nadie (el motivo es el cambio de paciente, no «la cama
  // origen está libre»).
  volver(); libreConPid('3', PID_P);
  i = corre('MOVER_A_CAMA_VACIA', mueve({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: '' }));
  rechazo('H4 · el origen LIBRE que conserva el PATIENT_ID de P', i, 'MOVER_A_CAMA_VACIA', VAL, EP_CAMBIO_RE, '3');
  // El DESTINO libre que conserva el PATIENT_ID de P, con el origen ya limpio: sin dueño no hay «ya hecho» (reconocerlo reetiquetaba las
  // evoluciones de P a la 9 sin que P se hubiera movido).
  volver(); libreConPid('3', ''); libreConPid('9', PID_P);
  i = corre('MOVER_A_CAMA_VACIA', mueve({ EPISODIO_ABIERTO: PID_P, EPISODIO_ABIERTO_B: '' }));
  rechazo('H4 · el DESTINO libre que conserva el PATIENT_ID de P y el origen ya limpio', i, 'MOVER_A_CAMA_VACIA', VAL, EP_CAMBIO_RE, '3');
  eq('★★ …las evoluciones de P siguen etiquetadas a la cama 3', DB.EVOLUCIONES.filter(e => e.PATIENT_ID === PID_P).every(e => e.ID_CAMA === '3'), true);
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

/* ══ D · LAS PUERTAS DE EVENTOS Y DE LA LÍNEA DE TIEMPO (paso 6) ═══════════ */
console.log('\nD · ANEXAR_EVENTO, ANULAR_ANEXO, CONFIRMAR_DISPOSITIVOS y AGREGAR_HITO (paso 6): candado dentro del lock');
tramo('D', () => {
  const ctl = S.activarLockReal();
  const M = require('../sim/sim_muerte.js');
  global.Utilities.formatDate = (d) => {
    const p2 = n => ('0' + n).slice(-2);
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  };

  // ── Datos inventados, en camas que B y C no tocaron: P en la 7, R en la 8 ──
  // TK2 (la noche del día 10) es un turno donde NADIE guardó evolución: ahí el ➕ de un cultivo o de un cambio de filtro
  // no encuentra turno que ubicar y cae a «quien esté en la cama», que es donde el hueco vivía.
  const TK0 = '2026-08-09-Dia', TK1 = '2026-08-10-Dia', TK2 = '2026-08-10-Noche';
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
  let PID_Q = '';
  const entraQ = (idCama, conTurno) => {
    const a = ingresa(idCama, 'Paciente Charly');
    PID_Q = camaDe(idCama).PATIENT_ID;
    const b = conTurno ? api('GUARDAR_EVOLUCION', payload(idCama, TK1, { EPISODIO_ABIERTO: PID_Q }), null) : { ok: true };
    return a.ok && b.ok;
  };

  // ── El montaje: P (cama 7) con sus dos turnos y un anexo en el segundo; R (cama 8) con el primero y SIN el segundo ──
  SIM.fecha = '2026-08-07'; SIM.hora = '12:00:00';
  const rIngP = ingresa('7', 'Paciente Alfa'); const PID_P = camaDe('7').PATIENT_ID;
  const rIngR = ingresa('8', 'Paciente Bravo'); const PID_R = camaDe('8').PATIENT_ID;
  SIM.fecha = '2026-08-09';
  const rT0 = [api('GUARDAR_EVOLUCION', payload('7', TK0, { EPISODIO_ABIERTO: PID_P }), null), api('GUARDAR_EVOLUCION', payload('8', TK0, { EPISODIO_ABIERTO: PID_R }), null)];
  SIM.fecha = '2026-08-10';
  const rT1 = api('GUARDAR_EVOLUCION', payload('7', TK1, { EPISODIO_ABIERTO: PID_P }), null);
  const rAnexo = api('ANEXAR_EVENTO', { idCama: '7', turnoKey: TK1, tipo: 'procedimiento', proc: 'ECOGRAFÍA', hora: '09:30', firmaKine: 'DMV' }, null);
  si('(el montaje) P y R ingresan, guardan sus turnos y P anota un anexo', rIngP.ok && rIngR.ok && rT0.every(r => r.ok) && rT1.ok && rAnexo.ok);
  si('(el montaje) son dos episodios distintos', PID_P && PID_R && PID_P !== PID_R);
  const ID_PROC_P = ((DB.PROCEDIMIENTOS.filter(p => p.PATIENT_ID === PID_P && p.TIPO_PROC === 'anexo')[0]) || {}).ID_PROC;
  si('(el montaje) el anexo de P quedó en PROCEDIMIENTOS con su id', !!ID_PROC_P);
  const FOTO_D = M.foto();

  const volver = () => {
    M.restaurar(FOTO_D); M.reiniciar();
    SIM.fecha = '2026-08-10'; SIM.hora = '12:00:00';
    ctl.antesDelCuerpo = null; ctl.cache.fallar(false);
    delete CONFIG.CONTRATO_ESTRICTO;
    PID_Q = '';
  };
  const sinBit = () => M.instantanea({ sinHojas: ['AUDIT_LOG'] });
  const ajenos = () => [PID_P, PID_R, PID_Q].filter(Boolean);
  const sinDatosAjenosD = txt => !ajenos().some(p => String(txt).includes(p)) && !/Alfa|Bravo|Charly/.test(String(txt));
  const hitosDe = pid => DB.TIMELINE.filter(h => h.PATIENT_ID === pid);
  const anexosDe = pid => DB.PROCEDIMIENTOS.filter(p => p.PATIENT_ID === pid && p.TIPO_PROC === 'anexo').length;

  // La sesión de coordinación es el CONTRATO que el servicio exige (la real la vigilan las guardias de coordinación,
  // igual que hace candado_mas.js): un solo token bueno, cualquier otro es una sesión vencida o inexistente.
  const conClave = fn => {
    const orig = global.coordExigirSesion;
    global.coordExigirSesion = t => t === 'COORD_OK'
      ? { ok: true, firma: 'MCC', usuario: 'coord1' }
      : { ok: false, error: 'Tu sesión de coordinación expiró. Vuelve a entrar con tu clave.', codigo: 'NO_AUTORIZADO' };
    try { return fn(); } finally { global.coordExigirSesion = orig; }
  };

  // Una llamada y todo lo que hay que mirar de ella. `hook` es «la otra petición»: corre DENTRO de la espera del candado.
  function corre(accion, datos, hook) {
    M.reiniciar();
    let n0 = 0, foto = sinBit(), hookOk = null, a0 = DB.AUDIT_LOG.length;
    if (hook) ctl.antesDelCuerpo = () => { hookOk = hook(); n0 = M.total(); foto = sinBit(); a0 = DB.AUDIT_LOG.length; };
    const r = callando(() => api(accion, datos, null));
    ctl.antesDelCuerpo = null;
    return {
      r, hookOk, escrituras: M.registro().slice(n0), igual: sinBit() === foto,
      bit: DB.AUDIT_LOG.slice(a0).filter(f => String(f.accion).indexOf(accion) === 0),
    };
  }
  function rechazo(etiqueta, i, accion, codigo, frase, cama) {
    no('★ ' + etiqueta + ': se RECHAZA', i.r.ok);
    eq('   …con código ' + codigo, i.r.codigo, codigo);
    si('   …y el motivo que se le muestra a la persona (' + frase + ')', frase.test(i.r.error || ''));
    if (cama) si('   …nombra la cama ' + cama, new RegExp('\\bcama ' + cama + '\\b').test(i.r.error || ''));
    si('★★ …sin nombrar a nadie ni dar el identificador de ningún paciente (Ley 19.628)', sinDatosAjenosD(i.r.error || ''));
    eq('★★ ' + etiqueta + ': NINGUNA escritura aterrizó', i.escrituras.join(' | ') || '(ninguna)', '(ninguna)');
    si('★★ …y la base COMPLETA quedó idéntica (salvo la bitácora)', i.igual);
    eq('   …la bitácora gana UNA fila: ' + accion + '_RECHAZADO', i.bit.map(f => f.accion).join(','), accion + '_RECHAZADO');
  }
  const VAL = 'VALIDACION', NA = 'NO_AUTORIZADO';
  const ESTRICTO = () => { CONFIG.CONTRATO_ESTRICTO = 'TRUE'; };
  const VIEJA = /versi[oó]n anterior/i;
  const MARCA_ = ' [sin episodio]';
  const sinMarca = i => !String((i.bit[0] || {}).resumen || '').endsWith(MARCA_);

  /* ═════════ D1 · ANEXAR_EVENTO ═════════ */
  console.log('   · D1 · ANEXAR_EVENTO');
  // Los tres tipos que escriben sobre «quien esté en la cama» sin pasar por una evolución, y el que sí la necesita.
  const evento = (tipo, extra) => Object.assign({ idCama: '7', turnoKey: TK2, tipo, hora: '14:00', firmaKine: 'DMV' },
    tipo === 'cultivo' ? { cultTipo: 'Aspirado traqueal', cultHallazgo: 'Pendiente' } : {},
    tipo === 'otro' ? { detalle: 'Evento de prueba' } : {},
    tipo === 'procedimiento' ? { proc: 'ECOGRAFÍA' } : {},
    extra || {});
  const SIN_TURNO = ['hme', 'sonda', 'cultivo', 'otro'];   // dos de los tres relojes de dispositivos, el cultivo y «otro»

  // — Lo de todos los días sigue igual —
  SIN_TURNO.forEach(tipo => {
    volver();
    let i = corre('ANEXAR_EVENTO', evento(tipo, { EPISODIO_ABIERTO: PID_P }));
    si('★ «' + tipo + '» con el episodio vigente (EPISODIO_ABIERTO = el de la cama) PASA', i.r.ok);
    si('   …y NO lleva la marca « [sin episodio]» (declaró episodio)', sinMarca(i));
    if (tipo === 'hme' || tipo === 'sonda') {
      const campo = tipo === 'hme' ? 'DISP_HME_FECHA' : 'DISP_TC_FECHA';
      eq('   …reinicia el reloj del dispositivo con la fecha efectiva del turno (la noche del 10 fecha el 11)', camaDe('7')[campo], '2026-08-11');
    } else {
      eq('   …y el hito es de P', hitosDe(PID_P).filter(h => h.TIPO === (tipo === 'cultivo' ? 'cultivo' : 'evento')).length, 1);
    }
    volver();
    i = corre('ANEXAR_EVENTO', evento(tipo));
    si('   …la pantalla VIEJA (sin EPISODIO_ABIERTO) también pasa en tolerante: compatibilidad', i.r.ok);
    eq('   …y la bitácora la anota « [sin episodio]» para medir cuántas llamadas siguen sin candado', String((i.bit[0] || {}).resumen || '').endsWith(MARCA_), true);
  });
  volver();
  let i = corre('ANEXAR_EVENTO', evento('procedimiento', { turnoKey: TK1, EPISODIO_ABIERTO: PID_P }));
  si('★ «procedimiento» con el episodio vigente PASA y suma su anexo a P', i.r.ok && anexosDe(PID_P) === 2);
  volver();
  i = corre('ANEXAR_EVENTO', evento('procedimiento', { turnoKey: TK1 }));
  si('   …la pantalla vieja también', i.r.ok);

  // — EL HUECO: formulario abierto para P, entremedio alta de P e ingreso de Q en la misma cama —
  // Sin episodio que ubicar (nadie guardó la noche), el ➕ caía a «quien esté en la cama» y le escribía a Q: le reiniciaba
  // el reloj del filtro, o le colgaba el cultivo y la nota en la línea de tiempo.
  SIN_TURNO.forEach(tipo => {
    volver(); altaDe('7'); entraQ('7');
    si('(montaje) la cama 7 es de Q y P ya salió', camaDe('7').PATIENT_ID === PID_Q && DB.ARCHIVO_PACIENTES.some(a => a.PATIENT_ID === PID_P));
    const antes = JSON.stringify(camaDe('7')), hitosQ0 = hitosDe(PID_Q).length;
    i = corre('ANEXAR_EVENTO', evento(tipo, { EPISODIO_ABIERTO: PID_P }));
    rechazo('«' + tipo + '» con el formulario de P sobre la cama de Q (sin patientId declarado)', i, 'ANEXAR_EVENTO', VAL, EP_CAMBIO_RE, '7');
    eq('★★ …la cama 7 sigue siendo de Q y NADA de ella cambió (ni el reloj del filtro, ni el cultivo en su tarjeta)', JSON.stringify(camaDe('7')) === antes, true);
    eq('   …y ningún hito nuevo cayó en la línea de tiempo de Q', hitosDe(PID_Q).length, hitosQ0);
    // Lo mismo, pero el alta y el ingreso ocurren MIENTRAS esta petición espera el candado.
    volver();
    i = corre('ANEXAR_EVENTO', evento(tipo, { EPISODIO_ABIERTO: PID_P }), () => { const a = altaDe('7'); return a.ok && entraQ('7'); });
    si('(la otra petición dio el alta a P e ingresó a Q mientras esta esperaba el candado)', i.hookOk && PID_Q && PID_Q !== PID_P);
    rechazo('«' + tipo + '»: el alta y el ingreso llegan MIENTRAS se espera el candado', i, 'ANEXAR_EVENTO', VAL, EP_CAMBIO_RE, '7');
    eq('★★ …la cama 7 sigue siendo de Q', camaDe('7').PATIENT_ID, PID_Q);
  });
  // El procedimiento sí necesita su evolución, y la encuentra por la clave de la cama: la de Q, que guardó ese turno.
  volver(); altaDe('8'); entraQ('8', true);
  si('(montaje) la cama 8 es de Q con su turno guardado y R ya salió', camaDe('8').PATIENT_ID === PID_Q && DB.EVOLUCIONES.some(e => e.PATIENT_ID === PID_Q && e.TURNO_KEY === TK1));
  const procsQ = () => String((DB.EVOLUCIONES.find(e => e.PATIENT_ID === PID_Q && e.TURNO_KEY === TK1) || {}).PROC_JSON);
  const procsQ0 = procsQ();
  i = corre('ANEXAR_EVENTO', evento('procedimiento', { idCama: '8', turnoKey: TK1, EPISODIO_ABIERTO: PID_R }));
  rechazo('«procedimiento» con el formulario de R: el turno que se encuentra es el de Q', i, 'ANEXAR_EVENTO', VAL, EP_CAMBIO_RE, '8');
  eq('★★ …Q no ganó ningún anexo y su lista de procedimientos quedó como estaba', anexosDe(PID_Q) + '/' + (procsQ() === procsQ0), '0/true');
  volver();
  i = corre('ANEXAR_EVENTO', evento('procedimiento', { idCama: '8', turnoKey: TK1, EPISODIO_ABIERTO: PID_R }), () => { const a = altaDe('8'); return a.ok && entraQ('8', true); });
  si('(la otra petición dio el alta a R e ingresó a Q con su turno mientras esta esperaba el candado)', i.hookOk && PID_Q);
  rechazo('«procedimiento»: el alta y el ingreso llegan MIENTRAS se espera el candado', i, 'ANEXAR_EVENTO', VAL, EP_CAMBIO_RE, '8');

  // — Con el episodio CERRADO el candado de coordinación sigue exactamente como hoy (no se toca) —
  console.log('      · D1 · episodio cerrado: la clave de coordinación sigue como hoy');
  volver(); altaDe('7'); entraQ('7');
  const cerrado = (tipo, extra) => evento(tipo, Object.assign({ turnoKey: TK1, EPISODIO_ABIERTO: PID_P, patientId: PID_P }, extra || {}));
  i = corre('ANEXAR_EVENTO', cerrado('cultivo'));
  no('★ P ya salió, patientId declarado, SIN clave de coordinación: se pide la clave (como hoy)', i.r.ok);
  eq('   …con el código de la clave', i.r.codigo, NA);
  si('   …y dice que hace falta la clave de coordinación', /clave de coordinaci[oó]n/i.test(i.r.error || ''));
  eq('★★ …sin escribir nada', i.escrituras.join(' | ') || '(ninguna)', '(ninguna)');
  i = corre('ANEXAR_EVENTO', cerrado('cultivo', { patientId: undefined }));
  no('   …lo mismo si el episodio viaja solo en EPISODIO_ABIERTO (el turno se encuentra por la clave y es el de P)', i.r.ok);
  eq('   …con el código de la clave', i.r.codigo, NA);
  eq('★★ …sin escribir nada', i.escrituras.join(' | ') || '(ninguna)', '(ninguna)');
  i = conClave(() => corre('ANEXAR_EVENTO', cerrado('cultivo', { coordToken: 'COORD_OK' })));
  si('★ CON la clave de coordinación entra: el hito se anota en el turno de P', i.r.ok);
  eq('   …el hito es de P y no de Q', hitosDe(PID_P).filter(h => h.TIPO === 'cultivo').length + '/' + hitosDe(PID_Q).filter(h => h.TIPO === 'cultivo').length, '1/0');
  eq('   …la cama 7 sigue siendo de Q', camaDe('7').PATIENT_ID, PID_Q);
  si('   …y la bitácora dice quién de coordinación abrió el candado', /autorizado por coordinaci[oó]n \(MCC\)/.test((i.bit[0] || {}).resumen || ''));
  volver(); altaDe('7'); entraQ('7');
  i = conClave(() => corre('ANEXAR_EVENTO', cerrado('hme', { coordToken: 'COORD_OK' })));
  no('★ un dispositivo del pasado de P no se anota ni con clave: el reloj es de la cama, que hoy es de Q (como hoy)', i.r.ok);
  si('   …y lo dice (hacia atrás)', /hacia atr[aá]s/i.test(i.r.error || ''));
  eq('★★ …sin escribir nada', i.escrituras.join(' | ') || '(ninguna)', '(ninguna)');

  console.log('      · D1 · modo estricto');
  volver(); ESTRICTO();
  i = corre('ANEXAR_EVENTO', evento('cultivo'));
  rechazo('sin EPISODIO_ABIERTO en modo estricto', i, 'ANEXAR_EVENTO', VAL, VIEJA, null);
  no('   …SIN la frase «cambió de paciente»', EP_CAMBIO_RE.test(i.r.error || ''));
  i = corre('ANEXAR_EVENTO', evento('cultivo', { EPISODIO_ABIERTO: '' }));
  no('★ el VACÍO tampoco se acepta sobre una cama con paciente', i.r.ok);
  eq('   …sin escribir nada', i.escrituras.length, 0);
  i = corre('ANEXAR_EVENTO', evento('cultivo', { EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente PASA también en modo estricto', i.r.ok);
  i = corre('ANEXAR_EVENTO', evento('procedimiento', { turnoKey: TK1, patientId: PID_P }));
  si('★ el patientId declarado hace de respaldo cuando falta EPISODIO_ABIERTO (la pantalla del Registro Diario ya lo mandaba)', i.r.ok);
  volver();

  /* ═════════ D2 · ANULAR_ANEXO ═════════ */
  console.log('   · D2 · ANULAR_ANEXO');
  const anula = extra => Object.assign({ idProc: ID_PROC_P, idCama: '7' }, extra || {});
  volver();
  i = corre('ANULAR_ANEXO', anula({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente el anexo se BORRA', i.r.ok && anexosDe(PID_P) === 0);
  si('   …y NO lleva la marca « [sin episodio]»', sinMarca(i));
  volver();
  i = corre('ANULAR_ANEXO', anula());
  si('★ la pantalla VIEJA (sin EPISODIO_ABIERTO) también pasa en modo tolerante: compatibilidad', i.r.ok);
  eq('   …y la bitácora la anota « [sin episodio]»', String((i.bit[0] || {}).resumen || '').endsWith(MARCA_), true);
  // La pantalla mostraba OTRO episodio: el anexo que se quiere borrar no es de él.
  volver();
  i = corre('ANULAR_ANEXO', anula({ EPISODIO_ABIERTO: PID_R }));
  rechazo('el formulario de R con el anexo de P', i, 'ANULAR_ANEXO', VAL, EP_CAMBIO_RE, '7');
  eq('★★ …el anexo de P sigue en el registro', anexosDe(PID_P), 1);
  // La cama rotó: la tarjeta de Q lista el anexo de P (la clave del turno es de la cama, no de la persona).
  volver(); altaDe('7'); entraQ('7');
  i = corre('ANULAR_ANEXO', anula({ EPISODIO_ABIERTO: PID_Q }));
  rechazo('la tarjeta de Q, que lista el anexo de P, intenta borrarlo (sin clave)', i, 'ANULAR_ANEXO', VAL, EP_CAMBIO_RE, '7');
  eq('★★ …el anexo de P sigue en el registro', anexosDe(PID_P), 1);
  i = conClave(() => corre('ANULAR_ANEXO', anula({ EPISODIO_ABIERTO: PID_Q, coordToken: 'COORD_OK' })));
  no('★★ …y ni con la clave de coordinación: el candado de episodio va antes que el de la clave', i.r.ok);
  eq('   …sin escribir nada', i.escrituras.length, 0);
  // Con el episodio CERRADO y declarado como es debido, la clave sigue siendo lo que manda (como hoy).
  i = corre('ANULAR_ANEXO', anula({ EPISODIO_ABIERTO: PID_P }));
  no('★ el formulario de P (ya salió) sin clave de coordinación: se pide la clave (como hoy)', i.r.ok);
  eq('   …con el código de la clave', i.r.codigo, NA);
  eq('★★ …sin escribir nada', i.escrituras.join(' | ') || '(ninguna)', '(ninguna)');
  i = conClave(() => corre('ANULAR_ANEXO', anula({ EPISODIO_ABIERTO: PID_P, coordToken: 'COORD_OK' })));
  si('★ CON la clave y el episodio de P entra: se borra el anexo de P', i.r.ok && anexosDe(PID_P) === 0);
  eq('   …y la cama 7 sigue siendo de Q', camaDe('7').PATIENT_ID, PID_Q);
  console.log('      · D2 · modo estricto');
  volver(); ESTRICTO();
  i = corre('ANULAR_ANEXO', anula());
  rechazo('sin EPISODIO_ABIERTO en modo estricto', i, 'ANULAR_ANEXO', VAL, VIEJA, null);
  i = corre('ANULAR_ANEXO', anula({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente PASA también en modo estricto', i.r.ok);
  volver();

  /* ═════════ D3 · CONFIRMAR_DISPOSITIVOS ═════════ */
  console.log('   · D3 · CONFIRMAR_DISPOSITIVOS');
  const confirma = extra => Object.assign({ idCama: '7' }, extra || {});
  volver();
  i = corre('CONFIRMAR_DISPOSITIVOS', confirma({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente los dispositivos de P se confirman', i.r.ok && camaDe('7').DISP_CONFIRMADO === true);
  si('   …y NO lleva la marca « [sin episodio]»', sinMarca(i));
  volver();
  i = corre('CONFIRMAR_DISPOSITIVOS', confirma());
  si('★ la pantalla VIEJA (sin EPISODIO_ABIERTO) también pasa en modo tolerante: compatibilidad', i.r.ok);
  eq('   …y la bitácora la anota « [sin episodio]»', String((i.bit[0] || {}).resumen || '').endsWith(MARCA_), true);
  // Hoy basta con que la cama esté ocupada: el formulario de P confirma los dispositivos del ocupante nuevo.
  volver(); altaDe('7'); entraQ('7');
  si('(montaje) los dispositivos de Q todavía no están confirmados', camaDe('7').DISP_CONFIRMADO !== true);
  i = corre('CONFIRMAR_DISPOSITIVOS', confirma({ EPISODIO_ABIERTO: PID_P, fecha: '2026-08-01' }));
  rechazo('el formulario de P sobre la cama de Q', i, 'CONFIRMAR_DISPOSITIVOS', VAL, EP_CAMBIO_RE, '7');
  eq('★★ …los dispositivos de Q siguen sin confirmar y sin fecha puesta', camaDe('7').DISP_CONFIRMADO !== true && camaDe('7').DISP_HME_FECHA !== '2026-08-01', true);
  volver();
  i = corre('CONFIRMAR_DISPOSITIVOS', confirma({ EPISODIO_ABIERTO: PID_P }), () => { const a = altaDe('7'); return a.ok && entraQ('7'); });
  si('(la otra petición dio el alta a P e ingresó a Q mientras esta esperaba el candado)', i.hookOk && PID_Q && PID_Q !== PID_P);
  rechazo('el alta y el ingreso llegan MIENTRAS se espera el candado', i, 'CONFIRMAR_DISPOSITIVOS', VAL, EP_CAMBIO_RE, '7');
  // La cama libre ya se rechazaba («no está ocupada»): se sigue rechazando, con su motivo.
  volver(); altaDe('7');
  i = corre('CONFIRMAR_DISPOSITIVOS', confirma({ EPISODIO_ABIERTO: PID_P }));
  no('control: la cama libre se rechaza (como hoy)', i.r.ok);
  si('   …con su motivo de siempre', /no est[aá] ocupada/i.test(i.r.error || ''));
  eq('   …sin escribir nada', i.escrituras.length, 0);
  console.log('      · D3 · modo estricto');
  volver(); ESTRICTO();
  i = corre('CONFIRMAR_DISPOSITIVOS', confirma());
  rechazo('sin EPISODIO_ABIERTO en modo estricto', i, 'CONFIRMAR_DISPOSITIVOS', VAL, VIEJA, null);
  i = corre('CONFIRMAR_DISPOSITIVOS', confirma({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente PASA también en modo estricto', i.r.ok);
  volver();

  /* ═════════ D4 · AGREGAR_HITO ═════════ */
  console.log('   · D4 · AGREGAR_HITO');
  const hito = extra => Object.assign({ idCama: '7', fecha: '2026-08-10', turno: 'Dia', tipo: 'general', texto: 'Nota de prueba' }, extra || {});
  const hitosDeTexto = pid => hitosDe(pid).filter(h => h.TEXTO === 'Nota de prueba').length;
  volver();
  i = corre('AGREGAR_HITO', hito({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente el hito se agrega y es de P', i.r.ok && hitosDeTexto(PID_P) === 1);
  si('   …y NO lleva la marca « [sin episodio]»', sinMarca(i));
  volver();
  i = corre('AGREGAR_HITO', hito());
  si('★ la pantalla VIEJA (sin EPISODIO_ABIERTO) también pasa en modo tolerante: compatibilidad', i.r.ok && hitosDeTexto(PID_P) === 1);
  eq('   …y la bitácora la anota « [sin episodio]»', String((i.bit[0] || {}).resumen || '').endsWith(MARCA_), true);
  // Hoy el hito se atribuye a quien esté en la cama.
  volver(); altaDe('7'); entraQ('7');
  i = corre('AGREGAR_HITO', hito({ EPISODIO_ABIERTO: PID_P }));
  rechazo('el formulario de P sobre la cama de Q', i, 'AGREGAR_HITO', VAL, EP_CAMBIO_RE, '7');
  eq('★★ …Q no ganó el hito', hitosDeTexto(PID_Q), 0);
  volver();
  i = corre('AGREGAR_HITO', hito({ EPISODIO_ABIERTO: PID_P }), () => { const a = altaDe('7'); return a.ok && entraQ('7'); });
  si('(la otra petición dio el alta a P e ingresó a Q mientras esta esperaba el candado)', i.hookOk && PID_Q && PID_Q !== PID_P);
  rechazo('el alta y el ingreso llegan MIENTRAS se espera el candado', i, 'AGREGAR_HITO', VAL, EP_CAMBIO_RE, '7');
  // Un hito que NOMBRA su episodio es de ese episodio, esté o no en la cama: lo que se compara es a quién se atribuye.
  volver(); altaDe('7'); entraQ('7');
  i = corre('AGREGAR_HITO', hito({ EPISODIO_ABIERTO: PID_P, patientId: PID_P }));
  si('control: el hito que nombra a P (patientId) y reclama a P se atribuye a P, como hoy', i.r.ok && hitosDeTexto(PID_P) === 1 && hitosDeTexto(PID_Q) === 0);
  console.log('      · D4 · modo estricto');
  volver(); ESTRICTO();
  i = corre('AGREGAR_HITO', hito());
  rechazo('sin EPISODIO_ABIERTO en modo estricto', i, 'AGREGAR_HITO', VAL, VIEJA, null);
  i = corre('AGREGAR_HITO', hito({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente PASA también en modo estricto', i.r.ok);
  volver();

  /* ═════════ D6 · UNA CAMA LIBRE NO TIENE DUEÑO, AUNQUE LA FILA CONSERVE UN PATIENT_ID VIEJO (H5, H4) ═════════ */
  console.log('   · D6 · cama LIBRE que conserva el PATIENT_ID de P (fila editada a mano): el ➕ y anular un anexo la tratan como sin dueño');
  // 🔴 DE DÓNDE SALE. Estas puertas tomaban el dueño de la cama con el PATIENT_ID crudo de la fila, no con «solo cuenta si está
  // OCUPADA»: con la cama libre y el PATIENT_ID de P retenido, el reclamo de P coincidía con quien ya no está, `enCama` salía verdadero y
  // el ➕ escribía (y el reloj de un filtro se reiniciaba) sin pedir la clave de coordinación que se le pide a P cuando ya no está en la
  // cama. DAR_ALTA, LIMPIAR_CAMA, INTERCAMBIAR y MOVER ya la trataban como libre; estas dos eran la excepción.
  const libreDeP = () => { volver(); camaDe('7').OCUPADA = false; };
  libreDeP();
  si('(montaje) la cama 7 está LIBRE, conserva el PATIENT_ID de P y el turno de P sigue vivo', camaDe('7').OCUPADA === false && camaDe('7').PATIENT_ID === PID_P && !!DB.EVOLUCIONES.find(e => e.PATIENT_ID === PID_P && e.TURNO_KEY === TK1));
  // Un turno que nadie guardó: no hay fila que ubicar y el ➕ caía a «quien esté en la cama».
  ['otro', 'cultivo'].forEach(tipo => {
    libreDeP();
    i = corre('ANEXAR_EVENTO', evento(tipo, { EPISODIO_ABIERTO: PID_P }));
    rechazo('H4 · «' + tipo + '» sobre un turno sin evolución, con la cama LIBRE que conserva el PATIENT_ID de P', i, 'ANEXAR_EVENTO', VAL, EP_CAMBIO_RE, '7');
  });
  // Un turno con la evolución viva de P: antes el ➕ entraba sin clave como si P estuviera en su cama.
  libreDeP();
  const hitosP0 = hitosDe(PID_P).length;
  i = corre('ANEXAR_EVENTO', evento('otro', { turnoKey: TK1, EPISODIO_ABIERTO: PID_P }));
  no('★ H5 · «otro» sobre el turno vivo de P con la cama LIBRE: NO entra sin clave (P ya no está en su cama)', i.r.ok);
  eq('   …se pide la clave de coordinación, como a cualquier episodio cerrado', i.r.codigo, NA);
  eq('★★ …sin escribir nada', i.escrituras.join(' | ') || '(ninguna)', '(ninguna)');
  libreDeP();
  i = conClave(() => corre('ANEXAR_EVENTO', evento('otro', { turnoKey: TK1, EPISODIO_ABIERTO: PID_P, coordToken: 'COORD_OK' })));
  si('★ …CON la clave entra (el candado de coordinación sigue como hoy): el hito es de P', i.r.ok && hitosDe(PID_P).length === hitosP0 + 1);
  eq('★★ …y NO se reocupa la cama 7 (el hito va sin sincronizar la tarjeta)', camaDe('7').OCUPADA, false);
  // El cambio de un filtro es el reloj de LA CAMA: con la cama libre no hay a quién reiniciárselo.
  libreDeP();
  const disp0 = JSON.stringify([camaDe('7').DISP_HME_FECHA, camaDe('7').DISP_CONFIRMADO]);
  i = corre('ANEXAR_EVENTO', evento('hme', { turnoKey: TK1, EPISODIO_ABIERTO: PID_P }));
  no('★ H5 · el cambio de HME sobre el turno vivo de P con la cama LIBRE: pide la clave de coordinación', i.r.ok);
  eq('   …con el código de la clave', i.r.codigo, NA);
  eq('★★ …sin escribir nada', i.escrituras.join(' | ') || '(ninguna)', '(ninguna)');
  libreDeP();
  i = conClave(() => corre('ANEXAR_EVENTO', evento('hme', { turnoKey: TK1, EPISODIO_ABIERTO: PID_P, coordToken: 'COORD_OK' })));
  no('★ …y ni con la clave: el reloj es de la cama y la cama ya no es de P (no se anota hacia atrás)', i.r.ok);
  si('   …y lo dice (hacia atrás)', /hacia atr[aá]s/i.test(i.r.error || ''));
  eq('★★ …el reloj de la cama 7 no se tocó', JSON.stringify([camaDe('7').DISP_HME_FECHA, camaDe('7').DISP_CONFIRMADO]), disp0);
  // ANULAR_ANEXO: el anexo es de P (su fila lo dice); lo que cambia es si P ESTÁ en su cama, y con la cama libre no está.
  libreDeP();
  i = corre('ANULAR_ANEXO', anula({ EPISODIO_ABIERTO: PID_P }));
  no('★ H5 · anular el anexo de P con la cama LIBRE que conserva su PATIENT_ID: pide la clave de coordinación', i.r.ok);
  eq('   …con el código de la clave', i.r.codigo, NA);
  eq('★★ …sin escribir nada y el anexo sigue en el registro', (i.escrituras.join(' | ') || '(ninguna)') + '/' + anexosDe(PID_P), '(ninguna)/1');
  libreDeP();
  i = conClave(() => corre('ANULAR_ANEXO', anula({ EPISODIO_ABIERTO: PID_P, coordToken: 'COORD_OK' })));
  si('★ …CON la clave se borra el anexo de P', i.r.ok && anexosDe(PID_P) === 0);
  eq('★★ …y la cama 7 sigue LIBRE (no se reocupó)', camaDe('7').OCUPADA, false);
  volver();

  /* ═════════ D5 · la forma ═════════ */
  console.log('   · D5 · la forma: la comparación va DENTRO del lock, antes de la primera escritura, y nada se lee antes');
  const cuerpoDeEn = (archivo, nombre) => {
    const src = leer(archivo);
    const ini = src.indexOf('function ' + nombre + '(');
    const fin = ini === -1 ? -1 : src.indexOf('\n}\n', ini);
    return (ini === -1 || fin === -1) ? '' : src.slice(ini, fin).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  };
  [
    ['svc_eventos.gs', 'anexarEventoRapido', /^function anexarEventoRapido\(datos, ctx, ep\)/],
    ['svc_eventos.gs', 'anularAnexo', /^function anularAnexo\(datos, ctx, ep\)/],
    ['svc_eventos.gs', 'confirmarDispositivos', /^function confirmarDispositivos\(datos, ctx, ep\)/],
    ['svc_timeline.gs', 'agregarHito', /^function agregarHito\(hito, ep\)/],
  ].forEach(([archivo, fn, firma]) => {
    const c = cuerpoDeEn(archivo, fn);
    si('★ ' + fn + ' recibe el reclamo de episodio como ÚLTIMO parámetro', firma.test(c));
    const iLock = c.indexOf('conLock(');
    const iVal = c.indexOf('validarEpisodioPuerta(');
    // G16 (paso 11): el hito y las caras del anexo se escriben ahora por `_hitoDeOperacion` y `_anexoEscribirProcedimiento` (escriben
    // ellas, no la función de la lista): se suman a los escritores para que la guardia siga midiendo contra la primera escritura REAL.
    const escritura = c.search(/\b(repoInsertar|repoActualizar|repoEscribirFila|repoEliminarFilas|repoEliminarDonde|repoUpsert|_agregarHitoInterno|_agregarHitoInternoSinSync|_hitoDeOperacion|_anexoEscribirProcedimiento)\(/);
    si('   …toma el lock y DENTRO compara con validarEpisodioPuerta', iLock > -1 && iVal > iLock);
    si('★★ …y la comparación va ANTES de la primera escritura', iVal > -1 && escritura > iVal);
    eq('   …y ANTES del conLock no se lee ninguna hoja', (c.slice(0, iLock).match(/\b(repo[A-Za-z]+|obtener[A-Za-z]+|_ubicar[A-Za-z]+)\(/g) || []).join(',') || '(nada)', '(nada)');
    si('   …solo se invoca si el reclamo viene (o está el modo estricto): los bancos antiguos no cargan la regla', /estricto === true/.test(c) && /\.a !== undefined/.test(c));
  });
});

/* ══ E · EVALUACIONES, ESCALAS, PENDIENTES, GASES Y COORDINACIÓN (paso 7) ═════ */
console.log('\nE · EVAL_REGISTRAR, EPISODIO_ESCALA, PEND_ABRIR, PEND_CERRAR, GSA_ASIGNAR y COORD_CORREGIR (paso 7): candado dentro del lock');
tramo('E', () => {
  const ctl = S.activarLockReal();
  const M = require('../sim/sim_muerte.js');
  global.Utilities.formatDate = (d) => {
    const p2 = n => ('0' + n).slice(-2);
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  };
  // 🪤 svc_gsa.gs no está en la lista de archivos de sim_srv.js (cambiarla movería los ~145 bancos). Se evalúa aquí,
  // junto a infra_respuesta.gs: sus `const` (ERR…) no cuelgan de globalThis con eval indirecto y un servicio evaluado
  // en otro ámbito revienta con «ERR is not defined» (lo mismo que hace rut_minimo.js).
  (0, eval)(leer('infra_respuesta.gs') + '\n;\n' + leer('svc_gsa.gs'));

  // ── Datos inventados, en camas que B, C y D no tocaron: P en la 1 y R en la 2 ──
  const TK1 = '2026-08-10-Dia';
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
  let PID_Q = '';
  const entraQ = idCama => {
    const a = ingresa(idCama, 'Paciente Charly');
    PID_Q = camaDe(idCama).PATIENT_ID;
    return a.ok;
  };

  // ── El montaje: P (cama 1) y R (cama 2) con su turno; P deja una medición y un pendiente; la bandeja trae un gas ──
  SIM.fecha = '2026-08-07'; SIM.hora = '12:00:00';
  const rIngP = ingresa('1', 'Paciente Alfa'); const PID_P = camaDe('1').PATIENT_ID;
  const rIngR = ingresa('2', 'Paciente Bravo'); const PID_R = camaDe('2').PATIENT_ID;
  SIM.fecha = '2026-08-10';
  const rT1 = [api('GUARDAR_EVOLUCION', payload('1', TK1, { EPISODIO_ABIERTO: PID_P }), null), api('GUARDAR_EVOLUCION', payload('2', TK1, { EPISODIO_ABIERTO: PID_R }), null)];
  const rEval = api('EVAL_REGISTRAR', { idCama: '1', escala: 'MRC', total: '40', firma: 'DMV', fecha: '2026-08-10', turno: 'Dia', EPISODIO_ABIERTO: PID_P }, null);
  const rPend = api('PEND_ABRIR', { idCama: '1', texto: 'Pedir interconsulta', firma: 'DMV', EPISODIO_ABIERTO: PID_P }, null);
  DB.GSA_IMPORTADAS = [{ ID_GSA: 'gas_1', ESTADO: 'sin_emparejar', ARCHIVO: 'gsa1.pdf', ARCHIVO_ID: '', FECHA: '2026-08-10', HORA: '05:00',
    PETICION: '', PATIENT_ID: '', ID_CAMA: '', TURNO_KEY: '', DETALLE: '', TS_IMPORT: '2026-08-10 06:31:00', PH: 7.4 }];
  si('(el montaje) P y R ingresan y guardan su turno; P deja una medición y un pendiente', rIngP.ok && rIngR.ok && rT1.every(r => r.ok) && rEval.ok && rPend.ok);
  si('(el montaje) son dos episodios distintos', PID_P && PID_R && PID_P !== PID_R);
  const ID_EVAL_P = ((DB.EVALUACIONES || []).find(e => e.PATIENT_ID === PID_P && e.ESCALA === 'MRC') || {}).ID_EVAL;
  const ID_PEND_P = ((JSON.parse(camaDe('1').PENDIENTES_JSON || '[]'))[0] || {}).id;
  si('(el montaje) la medición y el pendiente de P tienen su id', !!ID_EVAL_P && !!ID_PEND_P);
  const FOTO_E = M.foto();

  const volver = () => {
    M.restaurar(FOTO_E); M.reiniciar();
    SIM.fecha = '2026-08-10'; SIM.hora = '12:00:00';
    ctl.antesDelCuerpo = null; ctl.cache.fallar(false);
    delete CONFIG.CONTRATO_ESTRICTO;
    PID_Q = '';
  };
  const sinBit = () => M.instantanea({ sinHojas: ['AUDIT_LOG'] });
  const ajenos = () => [PID_P, PID_R, PID_Q].filter(Boolean);
  const sinDatosAjenosE = txt => !ajenos().some(p => String(txt).includes(p)) && !/Alfa|Bravo|Charly/.test(String(txt));
  const evalsDe = pid => (DB.EVALUACIONES || []).filter(e => e.PATIENT_ID === pid);
  const hitosDe = pid => DB.TIMELINE.filter(h => h.PATIENT_ID === pid);
  const pendDe = id => JSON.parse(camaDe(id).PENDIENTES_JSON || '[]');
  const gasDe = () => (DB.GSA_IMPORTADAS || []).find(g => g.ID_GSA === 'gas_1') || {};

  // Una llamada y todo lo que hay que mirar de ella. `hook` es «la otra petición»: corre DENTRO de la espera del candado.
  function corre(accion, datos, hook) {
    M.reiniciar();
    let n0 = 0, foto = sinBit(), hookOk = null, a0 = DB.AUDIT_LOG.length;
    if (hook) ctl.antesDelCuerpo = () => { hookOk = hook(); n0 = M.total(); foto = sinBit(); a0 = DB.AUDIT_LOG.length; };
    const r = callando(() => api(accion, datos, null));
    ctl.antesDelCuerpo = null;
    return {
      r, hookOk, escrituras: M.registro().slice(n0), igual: sinBit() === foto,
      bit: DB.AUDIT_LOG.slice(a0).filter(f => String(f.accion).indexOf(accion) === 0),
    };
  }
  function rechazo(etiqueta, i, accion, codigo, frase, cama) {
    no('★ ' + etiqueta + ': se RECHAZA', i.r.ok);
    eq('   …con código ' + codigo, i.r.codigo, codigo);
    si('   …y el motivo que se le muestra a la persona (' + frase + ')', frase.test(i.r.error || ''));
    if (cama) si('   …nombra la cama ' + cama, new RegExp('\\bcama ' + cama + '\\b').test(i.r.error || ''));
    si('★★ …sin nombrar a nadie ni dar el identificador de ningún paciente (Ley 19.628)', sinDatosAjenosE(i.r.error || ''));
    eq('★★ ' + etiqueta + ': NINGUNA escritura aterrizó', i.escrituras.join(' | ') || '(ninguna)', '(ninguna)');
    si('★★ …y la base COMPLETA quedó idéntica (salvo la bitácora)', i.igual);
    eq('   …la bitácora gana UNA fila: ' + accion + '_RECHAZADO', i.bit.map(f => f.accion).join(','), accion + '_RECHAZADO');
  }
  const VAL = 'VALIDACION';
  const ESTRICTO = () => { CONFIG.CONTRATO_ESTRICTO = 'TRUE'; };
  const VIEJA = /versi[oó]n anterior/i;
  const MARCA_ = ' [sin episodio]';
  const sinMarca = i => !String((i.bit[0] || {}).resumen || '').endsWith(MARCA_);
  const conMarca = i => String((i.bit[0] || {}).resumen || '').endsWith(MARCA_);
  // El alta de P y el ingreso de Q en la misma cama, MIENTRAS esta petición espera el candado.
  const cambioDeDueno = idCama => () => { const a = altaDe(idCama); return a.ok && entraQ(idCama); };

  /* ═════════ E1 · EVAL_REGISTRAR ═════════ */
  console.log('   · E1 · EVAL_REGISTRAR (además escribe el espejo ULT_* en la cama del ocupante actual)');
  const mide = extra => Object.assign({ idCama: '1', escala: 'MRC', total: '45', firma: 'DMV', fecha: '2026-08-10', turno: 'Dia' }, extra || {});
  volver();
  let i = corre('EVAL_REGISTRAR', mide({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente (EPISODIO_ABIERTO = el de la cama) la medición PASA', i.r.ok && evalsDe(PID_P).length === 2);
  eq('   …y el espejo de la cama dice 45', String(camaDe('1').ULT_MRC), '45');
  si('   …y NO lleva la marca « [sin episodio]» (declaró episodio)', sinMarca(i));
  volver();
  i = corre('EVAL_REGISTRAR', mide());
  si('★ la pantalla VIEJA (sin EPISODIO_ABIERTO) también pasa en modo tolerante: compatibilidad', i.r.ok);
  si('   …y la bitácora la anota « [sin episodio]» para medir cuántas llamadas siguen sin candado', conMarca(i));
  volver();
  i = corre('EVAL_REGISTRAR', mide({ EPISODIO_ABIERTO: PID_P, anulaId: ID_EVAL_P }));
  si('★ corregir con anulaId, con el episodio vigente: pasa, agrega la nueva y anula la vieja (nunca se borra)',
    i.r.ok && evalsDe(PID_P).length === 2 && String((evalsDe(PID_P).find(e => e.ID_EVAL === ID_EVAL_P) || {}).ANULADA) === 'true');
  // — EL HUECO: formulario abierto para P, entremedio alta de P e ingreso de Q en la misma cama —
  volver(); altaDe('1'); entraQ('1');
  si('(montaje) la cama 1 es de Q, P ya salió y Q no tiene ninguna medición', camaDe('1').PATIENT_ID === PID_Q && evalsDe(PID_Q).length === 0 && String(camaDe('1').ULT_MRC || '') === '');
  i = corre('EVAL_REGISTRAR', mide({ EPISODIO_ABIERTO: PID_P }));
  rechazo('el formulario de P sobre la cama de Q', i, 'EVAL_REGISTRAR', VAL, EP_CAMBIO_RE, '1');
  eq('★★ …Q no ganó ninguna medición y su cama NO recibió el espejo ULT_* de P', evalsDe(PID_Q).length + '/' + String(camaDe('1').ULT_MRC || '(vacío)'), '0/(vacío)');
  eq('   …y no le cayó ningún hito de «evaluación» en la línea de tiempo', hitosDe(PID_Q).filter(h => h.TIPO === 'evaluacion').length, 0);
  volver(); altaDe('1'); entraQ('1');
  i = corre('EVAL_REGISTRAR', mide({ EPISODIO_ABIERTO: PID_P, anulaId: ID_EVAL_P }));
  rechazo('corregir con anulaId desde el formulario de P sobre la cama de Q (queda bajo el mismo candado)', i, 'EVAL_REGISTRAR', VAL, EP_CAMBIO_RE, '1');
  eq('★★ …y la medición de P que se quería anular NO se anuló', String((evalsDe(PID_P).find(e => e.ID_EVAL === ID_EVAL_P) || {}).ANULADA), 'false');
  volver();
  i = corre('EVAL_REGISTRAR', mide({ EPISODIO_ABIERTO: PID_P }), cambioDeDueno('1'));
  si('(la otra petición dio el alta a P e ingresó a Q mientras esta esperaba el candado)', i.hookOk && PID_Q && PID_Q !== PID_P);
  rechazo('el alta y el ingreso llegan MIENTRAS se espera el candado', i, 'EVAL_REGISTRAR', VAL, EP_CAMBIO_RE, '1');
  eq('★★ …la cama 1 sigue siendo de Q, sin la medición de P', camaDe('1').PATIENT_ID + '/' + evalsDe(PID_Q).length, PID_Q + '/0');
  // La cama quedó LIBRE: el reclamo de P ya no es de nadie.
  volver(); altaDe('1');
  i = corre('EVAL_REGISTRAR', mide({ EPISODIO_ABIERTO: PID_P }));
  rechazo('el formulario de P con la cama ya libre', i, 'EVAL_REGISTRAR', VAL, EP_CAMBIO_RE, '1');
  console.log('      · E1 · modo estricto');
  volver(); ESTRICTO();
  i = corre('EVAL_REGISTRAR', mide());
  rechazo('sin EPISODIO_ABIERTO en modo estricto', i, 'EVAL_REGISTRAR', VAL, VIEJA, null);
  no('   …SIN la frase «cambió de paciente»', EP_CAMBIO_RE.test(i.r.error || ''));
  i = corre('EVAL_REGISTRAR', mide({ patientId: PID_P }));
  no('★ un patientId declarado NO hace de reclamo: la medición escribe el espejo en la CAMA y el reclamo tiene que igualar a su ocupante', i.r.ok);
  eq('   …sin escribir nada', i.escrituras.length, 0);
  i = corre('EVAL_REGISTRAR', mide({ EPISODIO_ABIERTO: '' }));
  no('★ el VACÍO tampoco se acepta sobre una cama con paciente', i.r.ok);
  si('   …es el cambio de paciente', EP_CAMBIO_RE.test(i.r.error || ''));
  eq('   …sin escribir nada', i.escrituras.length, 0);
  i = corre('EVAL_REGISTRAR', mide({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente PASA también en modo estricto', i.r.ok);
  volver();

  /* ═════════ E1b · LO DECLARADO APARTE DEL RECLAMO (H2, H6) Y LA CAMA LIBRE CON PID VIEJO (H4) ═════════ */
  console.log('   · E1b · patientId y anulaId de OTRO paciente no esquivan el reclamo; una cama LIBRE no tiene dueño');
  // 🔴 DE DÓNDE SALE. El candado comparaba EPISODIO_ABIERTO con la CAMA, pero `_evalRegistrarInterno` atribuye la fila a
  // `datos.patientId || datos.PATIENT_ID || cama.PATIENT_ID`, y `anulaId` anula cualquier fila de EVALUACIONES por id sin mirar de quién
  // es. Con el reclamo de quien ocupa la cama (el candado pasa) y OTRO paciente declarado, la medición se escribía a nombre del otro, el
  // espejo ULT_* se copiaba a la ficha del ocupante y el hito de la línea de tiempo quedaba atribuido al ajeno; con un anulaId ajeno se
  // anulaba la medición de otro paciente. La pantalla real no manda ninguno de los dos (hace falta un payload armado a mano), pero la
  // promesa del reclamo es proteger a quien ocupa la cama.
  const evalsP0 = () => evalsDe(PID_P).length;
  volver();
  let ev0 = evalsP0();
  i = corre('EVAL_REGISTRAR', mide({ idCama: '2', EPISODIO_ABIERTO: PID_R, patientId: PID_P }));
  rechazo('H6 · el reclamo es el de la cama 2 (R) pero el payload declara a P (patientId)', i, 'EVAL_REGISTRAR', VAL, EP_CAMBIO_RE, '2');
  eq('★★ …R no ganó el espejo ULT_MRC de P, ni hito, y P no ganó una medición de más', String(camaDe('2').ULT_MRC || '(vacío)') + '/' + hitosDe(PID_R).filter(h => h.TIPO === 'evaluacion').length + '/' + evalsP0(), '(vacío)/0/' + ev0);
  volver();
  i = corre('EVAL_REGISTRAR', mide({ idCama: '2', EPISODIO_ABIERTO: PID_R, PATIENT_ID: PID_P }));
  rechazo('H6 · lo mismo declarado como PATIENT_ID (la forma de las columnas)', i, 'EVAL_REGISTRAR', VAL, EP_CAMBIO_RE, '2');
  volver();
  i = corre('EVAL_REGISTRAR', mide({ idCama: '2', EPISODIO_ABIERTO: PID_R, patientId: PID_R }));
  si('control: declarar ADEMÁS al mismo episodio de la cama no estorba (la medición es de R)', i.r.ok && evalsDe(PID_R).length === 1);
  volver();
  i = corre('EVAL_REGISTRAR', mide({ idCama: '2', EPISODIO_ABIERTO: PID_R, anulaId: ID_EVAL_P }));
  rechazo('H2 · el reclamo es el de la cama 2 (R) pero anulaId es la medición de P', i, 'EVAL_REGISTRAR', VAL, EP_CAMBIO_RE, '2');
  eq('★★ …la medición de P NO se anuló y R no ganó ninguna', String((evalsDe(PID_P).find(e => e.ID_EVAL === ID_EVAL_P) || {}).ANULADA) + '/' + evalsDe(PID_R).length, 'false/0');
  // La corrección PROPIA sigue pasando: R mide y después corrige su propia medición.
  volver();
  const rMide = api('EVAL_REGISTRAR', mide({ idCama: '2', EPISODIO_ABIERTO: PID_R, total: '30' }), null);
  const idEvalR = rMide.ok && rMide.data && rMide.data.idEval;
  i = corre('EVAL_REGISTRAR', mide({ idCama: '2', EPISODIO_ABIERTO: PID_R, total: '32', anulaId: idEvalR }));
  si('control: corregir la medición PROPIA con anulaId sigue pasando (agrega la nueva y anula la vieja)',
    !!idEvalR && i.r.ok && String((DB.EVALUACIONES.find(e => e.ID_EVAL === idEvalR) || {}).ANULADA) === 'true' && evalsDe(PID_R).length === 2);
  // Un anulaId que no existe sigue como hoy: no hay de quién ser, y la puerta no inventa un rechazo.
  volver();
  i = corre('EVAL_REGISTRAR', mide({ idCama: '2', EPISODIO_ABIERTO: PID_R, anulaId: 'EVAL_no_existe' }));
  si('control: un anulaId que no existe no rechaza (la medición nueva se registra, como hoy)', i.r.ok && evalsDe(PID_R).length === 1);

  // H4 · una cama LIBRE que conserva el PATIENT_ID de P: el reclamo de P no coincide con nadie.
  volver(); Object.assign(camaDe('1'), { OCUPADA: false });
  si('(montaje) la cama 1 está LIBRE pero conserva el PATIENT_ID de P', camaDe('1').OCUPADA === false && camaDe('1').PATIENT_ID === PID_P);
  i = corre('EVAL_REGISTRAR', mide({ EPISODIO_ABIERTO: PID_P }));
  rechazo('H4 · el formulario de P sobre una cama LIBRE que conserva su PATIENT_ID', i, 'EVAL_REGISTRAR', VAL, EP_CAMBIO_RE, '1');
  eq('★★ …la cama 1 sigue libre y no ganó el espejo ULT_MRC', camaDe('1').OCUPADA + '/' + String(camaDe('1').ULT_MRC), 'false/40');
  volver();

  /* ═════════ E2 · EPISODIO_ESCALA ═════════ */
  console.log('   · E2 · EPISODIO_ESCALA');
  const escala = extra => Object.assign({ idCama: '1', escala: 'ECF', valor: '5', firma: 'DMV' }, extra || {});
  volver();
  i = corre('EPISODIO_ESCALA', escala({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente la escala se escribe en la ficha de P', i.r.ok && String(camaDe('1').ECF) === '5');
  si('   …y NO lleva la marca « [sin episodio]»', sinMarca(i));
  volver();
  i = corre('EPISODIO_ESCALA', escala());
  si('★ la pantalla VIEJA (sin EPISODIO_ABIERTO) también pasa en modo tolerante: compatibilidad', i.r.ok);
  si('   …y la bitácora la anota « [sin episodio]»', conMarca(i));
  // Hoy escribe sobre la cama que esté ocupada: la ECF de P le quedaba a Q.
  volver(); altaDe('1'); entraQ('1');
  si('(montaje) Q todavía no tiene ECF', String(camaDe('1').ECF || '') === '');
  i = corre('EPISODIO_ESCALA', escala({ EPISODIO_ABIERTO: PID_P }));
  rechazo('el formulario de P sobre la cama de Q', i, 'EPISODIO_ESCALA', VAL, EP_CAMBIO_RE, '1');
  eq('★★ …la ficha de Q NO recibió la ECF de P ni un hito', String(camaDe('1').ECF || '(vacío)') + '/' + hitosDe(PID_Q).filter(h => h.TIPO === 'evaluacion').length, '(vacío)/0');
  volver();
  i = corre('EPISODIO_ESCALA', escala({ EPISODIO_ABIERTO: PID_P }), cambioDeDueno('1'));
  si('(la otra petición dio el alta a P e ingresó a Q mientras esta esperaba el candado)', i.hookOk && PID_Q && PID_Q !== PID_P);
  rechazo('el alta y el ingreso llegan MIENTRAS se espera el candado', i, 'EPISODIO_ESCALA', VAL, EP_CAMBIO_RE, '1');
  // La cama libre ya se rechazaba («no tiene paciente ingresado»): se sigue rechazando, con su motivo.
  volver(); altaDe('1');
  i = corre('EPISODIO_ESCALA', escala({ EPISODIO_ABIERTO: PID_P }));
  no('control: la cama libre se rechaza (como hoy)', i.r.ok);
  si('   …con su motivo de siempre', /no tiene paciente ingresado/i.test(i.r.error || ''));
  eq('   …sin escribir nada', i.escrituras.length, 0);
  console.log('      · E2 · modo estricto');
  volver(); ESTRICTO();
  i = corre('EPISODIO_ESCALA', escala());
  rechazo('sin EPISODIO_ABIERTO en modo estricto', i, 'EPISODIO_ESCALA', VAL, VIEJA, null);
  i = corre('EPISODIO_ESCALA', escala({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente PASA también en modo estricto', i.r.ok);
  volver();

  /* ═════════ E3 · PEND_ABRIR ═════════ */
  console.log('   · E3 · PEND_ABRIR');
  const TXT = 'Solicitar evaluación de fonoaudiología';
  const abre = extra => Object.assign({ idCama: '1', texto: TXT, firma: 'DMV' }, extra || {});
  volver();
  i = corre('PEND_ABRIR', abre({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente el pendiente se abre en la ficha de P', i.r.ok && pendDe('1').length === 2);
  si('   …y NO lleva la marca « [sin episodio]»', sinMarca(i));
  volver();
  i = corre('PEND_ABRIR', abre());
  si('★ la pantalla VIEJA (sin EPISODIO_ABIERTO) también pasa en modo tolerante: compatibilidad', i.r.ok && pendDe('1').length === 2);
  si('   …y la bitácora la anota « [sin episodio]»', conMarca(i));
  volver(); altaDe('1'); entraQ('1');
  si('(montaje) Q no tiene pendientes', pendDe('1').length === 0);
  i = corre('PEND_ABRIR', abre({ EPISODIO_ABIERTO: PID_P }));
  rechazo('el formulario de P sobre la cama de Q', i, 'PEND_ABRIR', VAL, EP_CAMBIO_RE, '1');
  eq('★★ …Q no heredó el encargo de P', pendDe('1').length, 0);
  // 🪤 Q ya tiene ese mismo encargo abierto: el formulario de P NO puede contestar «ya está abierto» (eso le diría a P que su
  // pendiente existe, cuando el que existe es el de OTRA persona). El motivo es el cambio de paciente.
  volver(); altaDe('1'); entraQ('1');
  const rQ = api('PEND_ABRIR', abre({ EPISODIO_ABIERTO: PID_Q }), null);
  si('(Q abre el mismo encargo en su cama)', rQ.ok && pendDe('1').length === 1);
  i = corre('PEND_ABRIR', abre({ EPISODIO_ABIERTO: PID_P }));
  rechazo('el formulario de P pide el mismo texto que Q ya tiene abierto', i, 'PEND_ABRIR', VAL, EP_CAMBIO_RE, '1');
  no('★★ …y NO dice «ya está abierto» (el motivo es el cambio de paciente)', /ya est[aá] abierto/i.test(i.r.error || ''));
  volver();
  i = corre('PEND_ABRIR', abre({ EPISODIO_ABIERTO: PID_P }), cambioDeDueno('1'));
  si('(la otra petición dio el alta a P e ingresó a Q mientras esta esperaba el candado)', i.hookOk && PID_Q && PID_Q !== PID_P);
  rechazo('el alta y el ingreso llegan MIENTRAS se espera el candado', i, 'PEND_ABRIR', VAL, EP_CAMBIO_RE, '1');
  volver(); altaDe('1');
  i = corre('PEND_ABRIR', abre({ EPISODIO_ABIERTO: PID_P }));
  no('control: la cama libre se rechaza (como hoy)', i.r.ok);
  si('   …con su motivo de siempre', /no tiene paciente ingresado/i.test(i.r.error || ''));
  eq('   …sin escribir nada', i.escrituras.length, 0);
  console.log('      · E3 · modo estricto');
  volver(); ESTRICTO();
  i = corre('PEND_ABRIR', abre());
  rechazo('sin EPISODIO_ABIERTO en modo estricto', i, 'PEND_ABRIR', VAL, VIEJA, null);
  i = corre('PEND_ABRIR', abre({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente PASA también en modo estricto', i.r.ok);
  volver();

  /* ═════════ E4 · PEND_CERRAR ═════════ */
  console.log('   · E4 · PEND_CERRAR');
  const cierra = extra => Object.assign({ idCama: '1', id: ID_PEND_P, firma: 'DMV' }, extra || {});
  volver();
  i = corre('PEND_CERRAR', cierra({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente el pendiente de P se cierra', i.r.ok && !!pendDe('1')[0].ci);
  si('   …y NO lleva la marca « [sin episodio]»', sinMarca(i));
  volver();
  i = corre('PEND_CERRAR', cierra());
  si('★ la pantalla VIEJA (sin EPISODIO_ABIERTO) también pasa en modo tolerante: compatibilidad', i.r.ok && !!pendDe('1')[0].ci);
  si('   …y la bitácora la anota « [sin episodio]»', conMarca(i));
  // Ya la protegía el id del pendiente (vive en la cama y se vacía con el alta), pero entonces el rechazo decía «ya no está»
  // —un NO_ENCONTRADO que no explica nada— y el censo tenía una excepción. Ahora el motivo es el cambio de paciente.
  volver(); altaDe('1'); entraQ('1');
  i = corre('PEND_CERRAR', cierra({ EPISODIO_ABIERTO: PID_P }));
  rechazo('el formulario de P sobre la cama de Q', i, 'PEND_CERRAR', VAL, EP_CAMBIO_RE, '1');
  volver();
  i = corre('PEND_CERRAR', cierra({ EPISODIO_ABIERTO: PID_P }), cambioDeDueno('1'));
  si('(la otra petición dio el alta a P e ingresó a Q mientras esta esperaba el candado)', i.hookOk && PID_Q && PID_Q !== PID_P);
  rechazo('el alta y el ingreso llegan MIENTRAS se espera el candado', i, 'PEND_CERRAR', VAL, EP_CAMBIO_RE, '1');
  console.log('      · E4 · modo estricto');
  volver(); ESTRICTO();
  i = corre('PEND_CERRAR', cierra());
  rechazo('sin EPISODIO_ABIERTO en modo estricto', i, 'PEND_CERRAR', VAL, VIEJA, null);
  i = corre('PEND_CERRAR', cierra({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente PASA también en modo estricto', i.r.ok);
  volver();

  /* ═════════ E5 · GSA_ASIGNAR ═════════ */
  console.log('   · E5 · GSA_ASIGNAR');
  const asigna = extra => Object.assign({ idGsa: 'gas_1', idCama: '1' }, extra || {});
  volver();
  i = corre('GSA_ASIGNAR', asigna({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente el gas se asigna a P', i.r.ok && gasDe().ESTADO === 'ok' && gasDe().PATIENT_ID === PID_P);
  si('   …y NO lleva la marca « [sin episodio]»', sinMarca(i));
  volver();
  i = corre('GSA_ASIGNAR', asigna());
  si('★ la pantalla VIEJA (sin EPISODIO_ABIERTO) también pasa en modo tolerante: compatibilidad', i.r.ok && gasDe().PATIENT_ID === PID_P);
  si('   …y la bitácora la anota « [sin episodio]»', conMarca(i));
  // Hoy el gas se adjunta al PATIENT_ID de quien esté en la cama en ese momento.
  volver(); altaDe('1'); entraQ('1');
  i = corre('GSA_ASIGNAR', asigna({ EPISODIO_ABIERTO: PID_P }));
  rechazo('el selector abierto sobre P, con la cama ya de Q', i, 'GSA_ASIGNAR', VAL, EP_CAMBIO_RE, '1');
  eq('★★ …el gas sigue en la bandeja, sin emparejar y sin paciente (NO le quedó a Q)', gasDe().ESTADO + '/' + (gasDe().PATIENT_ID || '(vacío)'), 'sin_emparejar/(vacío)');
  volver();
  i = corre('GSA_ASIGNAR', asigna({ EPISODIO_ABIERTO: PID_P }), cambioDeDueno('1'));
  si('(la otra petición dio el alta a P e ingresó a Q mientras esta esperaba el candado)', i.hookOk && PID_Q && PID_Q !== PID_P);
  rechazo('el alta y el ingreso llegan MIENTRAS se espera el candado', i, 'GSA_ASIGNAR', VAL, EP_CAMBIO_RE, '1');
  volver(); altaDe('1');
  i = corre('GSA_ASIGNAR', asigna({ EPISODIO_ABIERTO: PID_P }));
  no('control: la cama libre se rechaza (como hoy)', i.r.ok);
  si('   …con su motivo de siempre', /no tiene un paciente hospitalizado/i.test(i.r.error || ''));
  eq('   …sin escribir nada', i.escrituras.length, 0);
  console.log('      · E5 · modo estricto');
  volver(); ESTRICTO();
  i = corre('GSA_ASIGNAR', asigna());
  rechazo('sin EPISODIO_ABIERTO en modo estricto', i, 'GSA_ASIGNAR', VAL, VIEJA, null);
  i = corre('GSA_ASIGNAR', asigna({ EPISODIO_ABIERTO: PID_P }));
  si('★ con el episodio vigente PASA también en modo estricto', i.r.ok);
  volver();

  /* ═════════ E6 · COORD_CORREGIR ═════════ */
  console.log('   · E6 · COORD_CORREGIR (el reclamo es patientId; nunca se resuelve por la cama)');
  // La sesión de coordinación es el CONTRATO que el servicio exige (la real la vigilan coordinacion.js y
  // coordinacion_revocacion.js): un solo token bueno.
  const conClave = fn => {
    const orig = global.coordExigirSesion;
    global.coordExigirSesion = t => t === 'COORD_OK'
      ? { ok: true, firma: 'MCC', usuario: 'coord1' }
      : { ok: false, error: 'Tu sesión de coordinación expiró. Vuelve a entrar con tu clave.', codigo: 'NO_AUTORIZADO' };
    try { return fn(); } finally { global.coordExigirSesion = orig; }
  };
  const corrige = extra => Object.assign({ token: 'COORD_OK', cambios: { DIAGNOSTICO: 'Dx corregido de prueba' } }, extra || {});
  const dxDe = id => String(camaDe(id).DIAGNOSTICO);
  const llama = (datos, hook) => conClave(() => {
    M.reiniciar();
    let n0 = 0, hookOk = null;
    if (hook) ctl.antesDelCuerpo = () => { hookOk = hook(); n0 = M.total(); };
    const r = callando(() => api('COORD_CORREGIR', datos, null));
    ctl.antesDelCuerpo = null;
    return { r, hookOk, escrituras: M.registro().slice(n0) };
  });
  // El montaje del hueco: P se LIMPIÓ (no recibió el alta, así que no tiene fila en ARCHIVO_PACIENTES) y Q ocupa su cama.
  // P no está en ninguna parte: ni en las camas ni en el archivo.
  const montajeHueco = () => { volver(); const l = limpiaDe('1'); const q = entraQ('1'); return l.ok && q; };
  si('(montaje) la limpieza de P y el ingreso de Q salen bien', montajeHueco());
  si('(montaje) P no está en ninguna parte: ni en las camas ni en ARCHIVO_PACIENTES', !DB.CAMAS_ESTADO.some(c => c.PATIENT_ID === PID_P) && !DB.ARCHIVO_PACIENTES.some(a => a.PATIENT_ID === PID_P));
  const dxQ0 = dxDe('1');
  let c = llama(corrige({ patientId: PID_P, idCama: '1' }));
  no('★★ un patientId que no está en ninguna parte NO cae a la cama: se rechaza (no se corrige a quien esté ahora)', c.r.ok);
  eq('   …como «no se encontró»', c.r.codigo, 'NO_ENCONTRADO');
  eq('★★ …la ficha de Q quedó como estaba', dxDe('1'), dxQ0);
  eq('   …y no se escribió NADA', c.escrituras.join(' | ') || '(ninguna)', '(ninguna)');
  si('   …sin nombrar a nadie ni dar identificadores', sinDatosAjenosE(c.r.error || ''));
  // _coordUbicar, directamente: la regla en una línea
  eq('★ _coordUbicar(patientId que no existe, cama de Q) = nadie', String(global._coordUbicar(PID_P, '1')), 'null');
  eq('   …_coordUbicar(sin patientId, cama de Q) = la cama de Q (la ficha de un episodio sin ingreso formal se sigue ubicando por la cama)', (global._coordUbicar('', '1') || {}).id + '/' + (global._coordUbicar('', '1') || {}).tipo, '1/activo');
  eq('   …_coordUbicar(patientId de Q, otra cama) = la cama de Q: el paciente manda sobre la cama', (global._coordUbicar(PID_Q, '2') || {}).id, '1');
  // — Lo que sigue funcionando —
  montajeHueco();
  c = llama(corrige({ patientId: PID_Q, idCama: '1' }));
  si('control: con el patientId de Q (que está en esa cama) la corrección PASA y es de Q', c.r.ok && dxDe('1') === 'Dx corregido de prueba');
  montajeHueco();
  c = llama(corrige({ idCama: '1' }));
  si('control: sin patientId, solo con la cama, en modo tolerante: se ubica por la cama como hoy (compatibilidad)', c.r.ok && dxDe('1') === 'Dx corregido de prueba');
  volver(); altaDe('1'); entraQ('1');
  c = llama(corrige({ patientId: PID_P, idCama: '1' }));
  si('control: P egresado (con su fila en el archivo) y la cama ya de Q: la corrección es de P, en el archivo', c.r.ok && c.r.data && c.r.data.tipo === 'egresado');
  eq('   …y la ficha de Q no se tocó', dxDe('1') === 'Dx corregido de prueba' ? 'se tocó' : 'intacta', 'intacta');
  console.log('      · E6 · modo estricto');
  montajeHueco(); ESTRICTO();
  const dxQ1 = dxDe('1');
  c = llama(corrige({ idCama: '1' }));
  no('★ sin patientId (ausente) y solo con la cama: se rechaza, la pantalla es de una versión anterior', c.r.ok);
  si('   …y dice que hay que recargar', VIEJA.test(c.r.error || '') && /rec[aá]rgala/i.test(c.r.error || ''));
  eq('★★ …sin escribir nada y con la ficha de Q intacta', c.escrituras.length + '/' + (dxDe('1') === dxQ1), '0/true');
  c = llama(corrige({ patientId: '', idCama: '1' }));
  no('★ patientId VACÍO sobre una cama con paciente: se rechaza (el vacío no es un reclamo válido ahí)', c.r.ok);
  eq('   …sin escribir nada', c.escrituras.length, 0);
  c = llama(corrige({ patientId: PID_Q, idCama: '1' }));
  si('★ con el patientId de Q PASA también en modo estricto', c.r.ok && dxDe('1') === 'Dx corregido de prueba');
  // 🪤 Esta puerta no recibe `ep` (su reclamo es patientId): lee el modo estricto ELLA, con una copia de la lectura de
  // `_epDeDatos` (api.gs). Las dos copias se atan aquí: para cada valor que alguien pueda escribir en la hoja CONFIG, las
  // dos puertas de entrada al modo estricto tienen que decidir IGUAL. Un interruptor de seguridad que se enciende por un
  // lado y no por el otro no se ve en ninguna pantalla.
  ['TRUE', 'true', ' TRUE ', 'True', 'SI', 'FALSE', '1', ''].forEach(v => {
    montajeHueco(); CONFIG.CONTRATO_ESTRICTO = v;
    const quiereEstricto = global._epDeDatos({}).estricto;
    const dx0 = dxDe('1');
    const r = llama(corrige({ idCama: '1' }));
    eq('   …CONTRATO_ESTRICTO = ' + JSON.stringify(v) + ': coordinación y _epDeDatos deciden igual (' + (quiereEstricto ? 'estricto: rechaza' : 'tolerante: pasa') + ')',
      (r.r.ok ? 'pasa' : 'rechaza') + '/' + (dxDe('1') === dx0 ? 'intacta' : 'corregida'),
      quiereEstricto ? 'rechaza/intacta' : 'pasa/corregida');
  });
  // Un episodio sin ingreso formal (cama ocupada sin PATIENT_ID) no tiene a quién reclamar: el vacío pasa.
  volver(); ESTRICTO();
  camaDe('2').PATIENT_ID = '';
  c = llama(corrige({ patientId: '', idCama: '2' }));
  si('★ cama ocupada SIN PATIENT_ID (episodio sin ingreso formal) con patientId vacío: pasa también en modo estricto', c.r.ok && dxDe('2') === 'Dx corregido de prueba');
  volver();

  /* ═════════ E7 · la forma ═════════ */
  console.log('   · E7 · la forma: la comparación va DENTRO del lock, antes de la primera escritura, y nada se lee antes');
  const cuerpoDeEn = (archivo, nombre) => {
    const src = leer(archivo);
    const ini = src.indexOf('function ' + nombre + '(');
    const fin = ini === -1 ? -1 : src.indexOf('\n}\n', ini);
    return (ini === -1 || fin === -1) ? '' : src.slice(ini, fin).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  };
  [
    // [archivo, función, firma esperada, lo primero que ESCRIBE]
    ['svc_evaluaciones.gs', 'evalRegistrar', /^function evalRegistrar\(datos, ctx, ep\)/, /\b_evalRegistrarInterno\(/],
    ['svc_evaluaciones.gs', 'episodioEscala', /^function episodioEscala\(datos, ctx, ep\)/, /\brepoActualizar\(/],
    ['svc_pendientes.gs', 'pendAbrir', /^function pendAbrir\(datos, ctx, ep\)/, /\brepoActualizar\(/],
    ['svc_pendientes.gs', 'pendCerrar', /^function pendCerrar\(datos, ctx, ep\)/, /\brepoActualizar\(/],
    ['svc_gsa.gs', 'gsaAsignar', /^function gsaAsignar\(datos, ctx, ep\)/, /\brepoActualizar\(/],
  ].forEach(([archivo, fn, firma, escribe]) => {
    const c = cuerpoDeEn(archivo, fn);
    si('★ ' + fn + ' recibe el reclamo de episodio como ÚLTIMO parámetro', firma.test(c));
    const iLock = c.indexOf('conLock(');
    const iVal = c.indexOf('validarEpisodioPuerta(');
    const iEsc = c.search(escribe);
    si('   …toma el lock y DENTRO compara con validarEpisodioPuerta', iLock > -1 && iVal > iLock);
    si('★★ …y la comparación va ANTES de la primera escritura', iVal > -1 && iEsc > iVal);
    eq('   …y ANTES del conLock no se lee ninguna hoja', (c.slice(0, iLock).match(/\b(repo[A-Za-z]+|obtener[A-Za-z]+|_ubicar[A-Za-z]+|_pendCama)\(/g) || []).join(',') || '(nada)', '(nada)');
    si('   …solo se invoca si el reclamo viene (o está el modo estricto): los bancos antiguos no cargan la regla', /estricto === true/.test(c) && /\.a !== undefined/.test(c));
  });
  // G16 (paso 11): la firma ganó un tercer parámetro OPCIONAL, `derivar` (solo lo pasa evalRegistrar para derivar el id de la medición
  // del OP_ID; la cola de guardarEvolucion llama con dos y no cambia). Lo que esta guardia protege —que NO compare el episodio— sigue.
  si('★ _evalRegistrarInterno queda INTACTA: guardarEvolucion ya comparó el episodio y no lo vuelve a comparar',
    /^function _evalRegistrarInterno\(datos, ctx(, derivar)?\)/.test(cuerpoDeEn('svc_evaluaciones.gs', '_evalRegistrarInterno')) &&
    !/validarEpisodioPuerta/.test(cuerpoDeEn('svc_evaluaciones.gs', '_evalRegistrarInterno')));
  {
    const cf = cuerpoDeEn('svc_coordinacion.gs', 'coordCorregirFicha'), ci = cuerpoDeEn('svc_coordinacion.gs', '_coordCorregirFichaInterno');
    si('★ coordCorregirFicha conserva su firma (datos) —no recibe ep: su reclamo es patientId— y corre dentro de conLock',
      /^function coordCorregirFicha\(datos\)/.test(cf) && /conLock\(function \(\) \{ return _coordCorregirFichaInterno\(datos\);/.test(cf));
    si('   …el cuerpo compara DESPUÉS de ubicar al paciente y ANTES de escribir',
      ci.indexOf('_coordUbicar(') > -1 && ci.indexOf('validarEpisodioPuerta(') > ci.indexOf('_coordUbicar(') && ci.search(/\brepoActualizar\(/) > ci.indexOf('validarEpisodioPuerta('));
    si('   …y solo en modo estricto, leído con leerConfig(\'CONTRATO_ESTRICTO\', \'FALSE\') sin distinguir mayúsculas ni espacios (la misma lectura que _epDeDatos)',
      /leerConfig\('CONTRATO_ESTRICTO',\s*'FALSE'\)/.test(ci) && /\.trim\(\)\.toUpperCase\(\) === 'TRUE'/.test(ci));
    const cu = cuerpoDeEn('svc_coordinacion.gs', '_coordUbicar');
    const iPid = cu.indexOf('if (pid) {'), iCama = cu.indexOf('if (idCama)');
    si('★ _coordUbicar: dentro de «if (pid)» devuelve null antes de mirar la cama', iPid > -1 && iCama > iPid && /return null;/.test(cu.slice(iPid, iCama)));
  }
});

function esVerdaderoB(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }

terminar();
