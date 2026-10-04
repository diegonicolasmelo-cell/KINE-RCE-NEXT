/**
 * svc_acceso.gs — ACCESO DEL TURNO: cada kinesiólogo entra con su clave.
 *
 * ── QUÉ PROBLEMA CIERRA ───────────────────────────────────────────────────
 * Hoy la app corre en marcha blanca abierta: cualquiera con el enlace entra y
 * **firma la evolución con el nombre que teclee**. La autoría no prueba nada.
 * El plan maestro resolvió esto con Google Sign-In (D1b) y el servidor para eso
 * ya está entero en `infra_auth.gs`, pero depende de un proyecto de Google
 * Cloud que sigue trabado en informática. Este módulo da identidad real sin
 * depender de nadie de fuera: usuario y clave, dentro de la misma planilla.
 *
 * ── NACE APAGADO ──────────────────────────────────────────────────────────
 * 🔴 Sin `CONFIG.LOGIN_EQUIPO_ACTIVO=TRUE` no cambia NADA para el equipo.
 * Encenderlo es una decisión de Diego, y antes de encenderlo cada kinesiólogo
 * necesita su clave (ver `accesoSembrarClaves` al final). Encenderlo sin eso
 * deja a la unidad sin poder registrar, que es el peor resultado posible.
 *
 * ── NO SE ESCRIBIÓ CRIPTOGRAFÍA NUEVA ─────────────────────────────────────
 * Es la misma receta probada del Modo Coordinación: huella SHA-256 con sal por
 * persona, guardada en PropertiesService y NUNCA en la planilla —CONFIG es una
 * hoja del Sheet y cualquiera con acceso al archivo la lee, o la exporta sin
 * darse cuenta—. La primitiva del resumen es una sola (`credHuellaDe`, en
 * infra_util.gs) y la comparten los dos.
 *
 * 🔴 ESPACIOS SEPARADOS. El texto que se resume lleva el prefijo `acc`, que el
 * de coordinación no tiene: **una clave de coordinación no abre el turno, ni
 * al revés**. Son dos permisos distintos y mezclarlos sería regalar el uno con
 * el otro.
 *
 * ── LA SESIÓN ─────────────────────────────────────────────────────────────
 * Vive en el caché con un token y muere por INACTIVIDAD, no a las N horas de
 * haber entrado: se renueva en cada uso, así que quien está trabajando nunca
 * se queda afuera a mitad de turno.
 * 🪤 Seis horas es el TECHO de CacheService en Apps Script (21.600 s), no una
 * elección: pedir más lo deja en seis igual y en silencio. Como se renueva con
 * el uso, un turno de doce horas trabajando no la agota; seis horas sin tocar
 * nada, sí.
 *
 * ── LA SESIÓN SE PUEDE CORTAR (4-oct-2026, G20) ───────────────────────────
 * 🔴 Que la sesión viva por uso tiene un costo: antes bastaba con que el token
 * existiera en el caché, así que desactivar a alguien en la hoja KINESIOLOGOS o
 * cambiarle la clave NO cerraba lo que ya tenía abierto —una tablet olvidada en
 * el office seguía firmando con su nombre hasta seis horas después—. Ahora
 * `accesoSesion` comprueba DOS cosas además de que el token exista:
 *   1. Que la VERSIÓN con que se abrió siga siendo la vigente de esa persona.
 *      La versión vive en las propiedades (`acc_ver_<firma>`) y NO en el caché:
 *      el caché se puede vaciar en cualquier momento, y una versión que se
 *      borrara con él devolvería la vida a las sesiones cortadas. Cada vez que
 *      cambia la CLAVE de alguien (`_accGuardarClave`: cambio, temporal,
 *      definida a mano) se estrena otra y todas las sesiones anteriores
 *      quedan fuera. Es un UUID y no un contador: tras un reinicio de las
 *      propiedades un contador volvería a «1» y igualaría la de una sesión vieja.
 *   2. Que la persona siga ACTIVA en la hoja. Una baja es un corte: en el primer
 *      rechazo se estrena versión, así que reactivarla después NO resucita
 *      ninguna sesión de antes, ni las que nadie usó mientras estuvo de baja.
 *
 * 🪤 El orden importa por el costo: `autorizar()` corre en CADA acción. Primero
 * el caché (un token que no existe no cuesta nada), después la versión (una
 * lectura de propiedad), y solo si todo eso calza se lee KINESIOLOGOS, una vez.
 * Si esa lectura FALLA (la hoja no responde) la sesión se rechaza pero NO se
 * corta: un tropiezo de Sheets no debe sacar al equipo de sus sesiones para
 * siempre, y aceptar sin poder verificar sería lo peor en un registro clínico.
 *
 * ── CUANDO NO SE PUEDE COMPROBAR, SE DICE (revisión adversarial, 4-oct-2026) ──
 * 🔴 Rechazar es lo correcto; rechazar CON EL MISMO MENSAJE de una sesión cortada
 * no. «Entra con tu clave para registrar» (NO_AUTORIZADO) es justo lo que la
 * pantalla lee como «te sacaron» y la manda a la puerta de entrada: un tropiezo de
 * la planilla le habría cerrado la app a quien tenía una sesión perfectamente
 * válida, y sin motivo que pudiera entender. Por eso `accesoVerificarSesion`
 * distingue los dos casos y `autorizar()` contesta, para «no pude comprobar», un
 * error DISTINTO (código INTERNO, texto «No se pudo comprobar tu sesión…») que
 * ninguno de los patrones de index.html reconoce como sesión cortada. La guardia
 * acceso_revocacion.js lee esos patrones del propio archivo de la pantalla.
 *
 * ── LA RENOVACIÓN NO RE-ESCRIBE LO VIEJO ──────────────────────────────────
 * 🪤 Antes la sesión se leía al principio, se esperaba la lectura (lenta) de la
 * hoja y se volvía a ESCRIBIR lo que se había leído. Esa ventana es justo donde
 * otra llamada corta o cambia la sesión: quien cerraba sesión la veía resucitar
 * (cerrar «no cerraba nada»), y quien acababa de cambiar su clave veía su sello
 * nuevo pisado por el viejo y salía de la app al elegirla. Ahora la comprobación
 * cara va PRIMERO y la renovación vuelve a LEER el token y lo escribe de
 * inmediato, pegado: lo que se renueva es lo que hay ahora, no lo que había. Por
 * la misma razón una versión que no calza ya no BORRA el token: borrar con una
 * vista vieja es la misma carrera (podía llevarse la sesión que una llamada
 * paralela acababa de resellar). Una sesión cortada igual queda rechazada por
 * la versión y se va sola con el caché; no hace falta borrarla para cortarla.
 *
 * 🪤 EL LÍMITE QUE QUEDA: CacheService no tiene compare-and-set. Entre esa última
 * lectura y su escritura sigue habiendo UN viaje al caché, así que una llamada que
 * cierre la sesión JUSTO en ese instante todavía puede verla resucitar. Se bajó la
 * ventana de «lo que tarde la hoja» (cientos de ms, a veces segundos) a «un viaje
 * al caché»; no se eliminó. Cortar por VERSIÓN no tiene ese problema porque no pasa
 * por el caché: es una propiedad, y una sesión de versión vieja no se renueva ni
 * autoriza. Solo el CIERRE voluntario (`accesoSalir`) queda expuesto, y como
 * mucho a esa ventana. Y una llamada que ya venía en vuelo cuando se cambió la
 * clave puede salir rechazada una vez, aunque su sesión sobreviva: es lo que cuesta
 * no ser más estricto que el caché.
 *
 * Las sesiones abiertas ANTES de esta versión no traen sello: valen como la
 * versión «vacía», que es la vigente hasta el primer cambio de clave. Pegar el
 * archivo no saca a nadie de la app.
 */

var _ACC_SESION_SEG    = 21600;  // 6 h — el techo de CacheService, renovable por uso
var _ACC_MAX_INTENTOS  = 5;      // fallidos antes de la espera
var _ACC_ESPERA_MIN    = 10;     // minutos de espera tras agotarlos
var _ACC_CLAVE_MIN     = 6;      // largo mínimo de una clave elegida por la persona

/** ¿El acceso del turno está encendido? */
function accesoActivo() {
  try { return esVerdadero(configVal('LOGIN_EQUIPO_ACTIVO', 'FALSE')); }
  catch (e) { return false; }
}

/** Normaliza el usuario: es la firma clínica en minúsculas y sin espacios. */
function _accNorm(u) { return String(u || '').toLowerCase().trim(); }

function _accProps() { return PropertiesService.getScriptProperties(); }

/**
 * Quién puede entrar: los kinesiólogos ACTIVOS del catálogo. Se resuelve
 * contra la hoja y no contra una lista escrita en el código, para que dar de
 * alta o de baja a alguien sea marcar una casilla y no pegar un archivo.
 */
function _accPersona(usuario) {
  const u = _accNorm(usuario);
  if (!u) return null;
  const kines = repoLeerTodos('KINESIOLOGOS').filter(function (k) {
    return _accNorm(k.FIRMA) === u && esVerdadero(k.ACTIVO);
  });
  if (!kines.length) return null;
  const k = kines[0];
  return { firma: String(k.FIRMA).toUpperCase(), nombre: String(k.NOMBRE || k.FIRMA),
           tratamiento: String(k.TRATAMIENTO || 'Klgo.') };
}

/* ── CLAVES ─────────────────────────────────────────────────────────────── */

/** Huella de una clave del TURNO. El prefijo `acc` separa este espacio. */
function _accHuella(usuario, clave, sal) {
  return credHuellaDe(String(sal) + '|acc|' + _accNorm(usuario) + '|' + String(clave));
}

/**
 * Escribe la clave de una persona. Sal nueva en cada cambio.
 *
 * 🔴 Y CORTA sus sesiones: toda clave nueva pasa por aquí (cambio propio, clave
 * temporal, definida a mano), así que ningún camino puede olvidarse de revocar.
 * Quien tenía la clave vieja no tiene por qué conservar el acceso, y una clave
 * restablecida porque «se filtró» o «se perdió la tablet» que dejara viva la
 * sesión de esa tablet no habría restablecido nada.
 *
 * `tokenQueSigue` es la ÚNICA excepción, y solo la usa `accesoCambiarClave`: la
 * sesión de quien acaba de probar su clave actual, en esa misma llamada, y que
 * está trabajando. No es una cortesía: la pantalla recarga tras el cambio con
 * ese MISMO token (`accAdentro`), y la clave temporal OBLIGA a cambiarla al
 * entrar. Si el cambio matara a quien lo hace, cada persona saldría de la app
 * justo después de elegir su clave. Lo que se busca cortar son las OTRAS
 * sesiones —las de quien no conoce la clave nueva—, no la propia.
 */
function _accGuardarClave(usuario, clave, tokenQueSigue) {
  const u = _accNorm(usuario);
  const sal = Utilities.getUuid();
  _accProps().setProperty('acc_sal_' + u, sal);
  _accProps().setProperty('acc_hash_' + u, _accHuella(u, clave, sal));
  _accProps().deleteProperty('acc_fallidos_' + u);
  _accRevocarSesiones(u, tokenQueSigue);
  return true;
}

function _accClaveOk(usuario, clave) {
  const u = _accNorm(usuario);
  const sal = _accProps().getProperty('acc_sal_' + u);
  const hash = _accProps().getProperty('acc_hash_' + u);
  if (!sal || !hash) return false;
  return _accHuella(u, clave, sal) === hash;
}

function _accTieneClave(usuario) {
  return !!_accProps().getProperty('acc_hash_' + _accNorm(usuario));
}

function _accMarcarTemporal(usuario, es) {
  const k = 'acc_temp_' + _accNorm(usuario);
  if (es) _accProps().setProperty(k, '1'); else _accProps().deleteProperty(k);
}
function _accEsTemporal(usuario) {
  return _accProps().getProperty('acc_temp_' + _accNorm(usuario)) === '1';
}

/* ── INTENTOS FALLIDOS ──────────────────────────────────────────────────── */

/**
 * 🔴 Se cuentan POR PERSONA, nunca globales: si fueran globales, cualquiera
 * dejaría afuera a toda la unidad tecleando mal a propósito, y en un turno de
 * noche eso es quedarse sin registrar.
 */
function _accFallidos(usuario) {
  const v = _accProps().getProperty('acc_fallidos_' + _accNorm(usuario));
  if (!v) return { n: 0, hasta: 0 };
  try { return JSON.parse(v); } catch (e) { return { n: 0, hasta: 0 }; }
}

function _accSumarFallido(usuario) {
  const u = _accNorm(usuario);
  const est = _accFallidos(u);
  est.n = (est.n || 0) + 1;
  if (est.n >= _ACC_MAX_INTENTOS) { est.hasta = Date.now() + _ACC_ESPERA_MIN * 60000; est.n = 0; }
  _accProps().setProperty('acc_fallidos_' + u, JSON.stringify(est));
  return est;
}

/** Minutos que faltan de espera, o 0 si puede intentar. */
function _accEsperaRestante(usuario) {
  const est = _accFallidos(usuario);
  if (!est.hasta || est.hasta <= Date.now()) return 0;
  return Math.ceil((est.hasta - Date.now()) / 60000);
}

/* ── SESIÓN ─────────────────────────────────────────────────────────────── */

/** La versión vigente de las sesiones de una persona ('' si nunca se cortaron). */
function _accVersion(usuario) {
  return _accProps().getProperty('acc_ver_' + _accNorm(usuario)) || '';
}

/**
 * Corta TODAS las sesiones de una persona estrenando una versión nueva. Las que
 * se abrieron con otra dejan de valer en su próximo uso, sin recorrer el caché.
 * `tokenQueSigue` (opcional) es la sesión que se re-sella con la versión nueva
 * para que sobreviva; ver `_accGuardarClave` por qué existe esa excepción.
 */
function _accRevocarSesiones(usuario, tokenQueSigue) {
  const u = _accNorm(usuario);
  const ver = Utilities.getUuid();
  _accProps().setProperty('acc_ver_' + u, ver);
  if (!tokenQueSigue) return;
  const cache = CacheService.getScriptCache();
  const hit = cache.get('accses_' + tokenQueSigue);
  if (!hit) return;
  try {
    const s = JSON.parse(hit);
    // Solo si la sesión es de ESA persona: el sello de otra no se toca.
    if (s && _accNorm(s.firma) === u) {
      s.ver = ver;
      cache.put('accses_' + tokenQueSigue, JSON.stringify(s), _ACC_SESION_SEG);
    }
  } catch (e) { /* una sesión ilegible ya no valía */ }
}

function _accAbrirSesion(persona) {
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('accses_' + token, JSON.stringify({
    firma: persona.firma, nombre: persona.nombre, desde: Date.now(),
    ver: _accVersion(persona.firma),
  }), _ACC_SESION_SEG);
  return token;
}

/**
 * Resuelve un token a `{ sesion, noSePudo }`.
 *   · `sesion`  → `{firma, nombre, …}` si el token vale, o null.
 *   · `noSePudo` → true si NO se pudo comprobar (la hoja o las propiedades
 *     fallaron). Es la diferencia entre «tu sesión no vale» y «no pude mirar si
 *     vale»: con `noSePudo` la sesión no se acepta, pero tampoco se corta ni se
 *     le dice a la persona que salió (ver el encabezado, «CUANDO NO SE PUEDE
 *     COMPROBAR, SE DICE»).
 *
 * Renueva la ventana en cada uso: la sesión muere por inactividad, no a las seis
 * horas de haber entrado. Y se puede CORTAR desde fuera: no vale si la persona
 * cambió de clave desde que se abrió o si ya no está activa («LA SESIÓN SE PUEDE
 * CORTAR»). Quien la llama no distingue el motivo del corte: para el equipo es
 * siempre «Entra con tu clave», y no decir por qué tampoco delata quiénes
 * trabajan acá.
 */
function accesoVerificarSesion(token) {
  const SIN = { sesion: null, noSePudo: false };
  if (!token) return SIN;
  try {
    const cache = CacheService.getScriptCache();
    const clave = 'accses_' + token;
    // Primera lectura: solo para saber DE QUIÉN es, y con qué versión se abrió.
    // Lo que se renueve al final NO es esto (ver el paso 3).
    const hit = cache.get(clave);
    if (!hit) return SIN;
    let s;
    try { s = JSON.parse(hit); } catch (e) { return SIN; }
    if (!s || !s.firma) return SIN;

    // 1 · ¿Sigue siendo la versión vigente? Es una lectura de propiedad: va ANTES
    // de la hoja para que una sesión ya cortada no cueste leer KINESIOLOGOS. Si no
    // calza se rechaza y NADA MÁS: no se borra el token (una llamada paralela puede
    // haberlo resellado, y borrar con una vista vieja se lo llevaría).
    if (String(s.ver || '') !== _accVersion(s.firma)) return SIN;

    // 2 · ¿Sigue activa? Se lee la hoja una vez, y es lo lento: `_accPersona` solo
    // devuelve a los ACTIVOS. La baja corta TODAS sus sesiones (no solo esta): si
    // no, volver a marcarla activa resucitaría las que nadie alcanzó a usar. Acá sí
    // se borra el token: la hoja acaba de decir que la persona no está, y nadie
    // puede estar resellando una sesión suya (cambiar la clave exige una sesión
    // válida, y de alguien dado de baja ya no hay ninguna).
    if (!_accPersona(s.firma)) {
      cache.remove(clave);
      _accRevocarSesiones(s.firma);
      return SIN;
    }

    // 3 · Renovar. 🔴 Se vuelve a LEER el token y se escribe LO QUE HAY AHORA, de
    // inmediato: durante el paso 2 otra llamada pudo cerrar la sesión (si ya no está,
    // no se resucita) o cambiar la clave resellándola (si cambió, se conserva el
    // sello nuevo en vez de pisarlo con el viejo). Entre esta lectura y la escritura
    // no va nada más: no hay hoja ni propiedades. El límite que queda —un viaje al
    // caché, porque no hay compare-and-set— está en el encabezado.
    const fresco = cache.get(clave);
    if (!fresco) return SIN;
    let vigente;
    try { vigente = JSON.parse(fresco); } catch (e) { return SIN; }
    if (!vigente || !vigente.firma) return SIN;
    cache.put(clave, fresco, _ACC_SESION_SEG);
    return { sesion: vigente, noSePudo: false };
  } catch (e) {
    // No se pudo comprobar: se rechaza SIN cortarla (ver encabezado).
    console.warn('accesoVerificarSesion: no se pudo comprobar: ' + e.message);
    return { sesion: null, noSePudo: true };
  }
}

/** Resuelve un token a {firma, nombre}, o null. La versión corta de `accesoVerificarSesion`. */
function accesoSesion(token) { return accesoVerificarSesion(token).sesion; }

/**
 * La respuesta para «no pude comprobar tu sesión». Es de este módulo para que el
 * texto y el código vivan en UN lugar, y la usan `autorizar()` y quien más
 * verifique una sesión. 🔴 Ni el código (INTERNO, no NO_AUTORIZADO) ni el texto
 * pueden coincidir con lo que la pantalla lee como sesión cortada: lo fija
 * acceso_revocacion.js leyendo los patrones del propio index.html.
 */
function accesoRespuestaNoVerificable() {
  return { ok: false, error: 'No se pudo comprobar tu sesión. Intenta de nuevo en unos segundos.',
           codigo: ERR.INTERNO };
}

/* ── ENTRAR, SALIR, CAMBIAR ─────────────────────────────────────────────── */

/**
 * 🔴 El mensaje de error es el MISMO exista o no el usuario. Si «no existe» se
 * dijera distinto de «clave mala», probar nombres serviría para descubrir
 * quiénes trabajan en la unidad.
 */
function accesoEntrar(datos) {
  try {
    const usuario = _accNorm(datos && datos.usuario);
    const clave = String((datos && datos.clave) || '');
    const MAL = 'Usuario o clave incorrectos.';

    const persona = _accPersona(usuario);
    if (!persona) return err(MAL, ERR.NO_AUTORIZADO);

    const espera = _accEsperaRestante(usuario);
    if (espera > 0) {
      return err('Demasiados intentos. Vuelve a probar en ' + espera + ' minuto' + (espera === 1 ? '' : 's') + '.',
        ERR.NO_AUTORIZADO);
    }
    if (!_accClaveOk(usuario, clave)) {
      _accSumarFallido(usuario);
      // Se audita el intento, NUNCA la clave tecleada.
      auditar({ email: 'acceso', firma: persona.firma, accion: 'ACCESO_INTENTO_FALLIDO',
        entidad: 'ACCESO', idEntidad: usuario, patientId: '', resumen: 'clave incorrecta' });
      return err(MAL, ERR.NO_AUTORIZADO);
    }
    _accProps().deleteProperty('acc_fallidos_' + usuario);
    const token = _accAbrirSesion(persona);
    auditar({ email: 'acceso', firma: persona.firma, accion: 'ACCESO_ENTRADA',
      entidad: 'ACCESO', idEntidad: usuario, patientId: '', resumen: 'entró al turno' });
    return ok({
      token: token, firma: persona.firma, nombre: persona.nombre,
      tratamiento: persona.tratamiento,
      horas: Math.round(_ACC_SESION_SEG / 3600),
      debeCambiarClave: _accEsTemporal(usuario),
    });
  } catch (e) { return err('accesoEntrar: ' + e.message, ERR.INTERNO, e); }
}

/**
 * Cierra la sesión EN EL SERVIDOR. Limpiar variables del navegador no cierra
 * nada: el token seguiría vivo en el caché y la tablet del office quedaría
 * abierta. Cerrar algo que ya no existe NO es un error, así el navegador nunca
 * queda atrapado creyendo que tiene una sesión abierta.
 *
 * 🔴 Quita el token SIEMPRE que exista, sin depender de nada más. Una versión
 * validaba primero con `accesoSesion`, y si la lectura de KINESIOLOGOS fallaba
 * contestaba `cerrada:false` y dejaba el token vivo: cerrar sesión no cerraba
 * justo cuando la planilla andaba mal. Por eso acá se lee el caché CRUDO (no la
 * sesión «comprobada»): para borrar una llave no hace falta saber si todavía
 * valía, y una sesión ya cortada o de alguien dado de baja también se limpia. Se
 * borra ANTES de auditar, y la auditoría nunca rompe el cierre.
 */
function accesoSalir(datos) {
  try {
    const token = String((datos && datos.token) || '');
    if (!token) return ok({ cerrada: false, motivo: 'sin token' });
    const cache = CacheService.getScriptCache();
    const clave = 'accses_' + token;
    const hit = cache.get(clave);
    if (!hit) return ok({ cerrada: false, motivo: 'la sesión ya no estaba abierta' });
    cache.remove(clave);
    let firma = '';
    try { firma = String(JSON.parse(hit).firma || ''); } catch (e) { /* ilegible: se borró igual */ }
    auditar({ email: 'acceso', firma: firma, accion: 'ACCESO_SALIDA',
      entidad: 'ACCESO', idEntidad: _accNorm(firma), patientId: '', resumen: 'cerró su sesión' });
    return ok({ cerrada: true, firma: firma });
  } catch (e) { return err('accesoSalir: ' + e.message, ERR.INTERNO, e); }
}

/** Cambiar la propia clave. Exige la actual: un token robado no basta. */
function accesoCambiarClave(datos) {
  try {
    const token = String((datos && datos.token) || '');
    const v = accesoVerificarSesion(token);
    // Si la hoja no respondió NO se dice «expiró»: la sesión puede estar perfecta.
    if (v.noSePudo) return accesoRespuestaNoVerificable();
    const s = v.sesion;
    if (!s) return err('Tu sesión expiró. Vuelve a entrar con tu clave.', ERR.NO_AUTORIZADO);
    const usuario = _accNorm(s.firma);
    const actual = String((datos && datos.actual) || '');
    const nueva = String((datos && datos.nueva) || '');

    if (!_accClaveOk(usuario, actual)) return err('La clave actual no es correcta.', ERR.NO_AUTORIZADO);
    if (nueva.length < _ACC_CLAVE_MIN) {
      return err('La clave nueva debe tener al menos ' + _ACC_CLAVE_MIN + ' caracteres.', ERR.VALIDACION);
    }
    if (nueva === actual) return err('La clave nueva tiene que ser distinta de la actual.', ERR.VALIDACION);

    // Corta las demás sesiones de esta persona; la de quien cambia SIGUE viva
    // (ver `_accGuardarClave`: la pantalla recarga con este mismo token).
    _accGuardarClave(usuario, nueva, token);
    _accMarcarTemporal(usuario, false);
    auditar({ email: 'acceso', firma: s.firma, accion: 'ACCESO_CAMBIO_CLAVE',
      entidad: 'ACCESO', idEntidad: usuario, patientId: '',
      resumen: 'cambió su clave (cerró sus otras sesiones)' });
    return ok({ cambiada: true });
  } catch (e) { return err('accesoCambiarClave: ' + e.message, ERR.INTERNO, e); }
}

/**
 * Estado para la pantalla, ANTES de entrar. No dice quiénes existen ni si
 * alguien tiene clave: solo si el candado está puesto y, con un token, quién
 * es el que ya entró.
 */
function accesoEstado(datos) {
  try {
    const s = accesoSesion(String((datos && datos.token) || ''));
    return ok({
      activo: accesoActivo(),
      dentro: !!s,
      firma: s ? s.firma : '',
      nombre: s ? s.nombre : '',
    });
  } catch (e) { return err('accesoEstado: ' + e.message, ERR.INTERNO, e); }
}

/* ── ADMINISTRACIÓN — se corre A MANO desde el editor ───────────────────── */

/**
 * Define la clave de una persona. Para usar desde el editor de Apps Script,
 * no desde la app: es la operación que reparte el acceso.
 *   accesoDefinirClave('DMV', 'la-que-elija')
 * 🔴 Corta TODAS las sesiones de esa persona (no hay una «sesión de quien
 * cambia» que conservar: lo corre Diego desde el editor).
 */
function accesoDefinirClave(firma, clave) {
  const persona = _accPersona(firma);
  if (!persona) { console.warn('No hay un kinesiólogo ACTIVO con la firma ' + firma); return false; }
  _accGuardarClave(persona.firma, String(clave));
  _accMarcarTemporal(persona.firma, false);
  console.log('🔑 Clave definida para ' + persona.firma + ' (' + persona.nombre + ')');
  return true;
}

/**
 * Genera una clave TEMPORAL para una persona y la devuelve. Quien entre con
 * ella tendrá que cambiarla de inmediato. Sirve para repartir el acceso la
 * primera vez y para cuando alguien la olvida.
 *
 * 🪤 La clave se devuelve UNA vez y no se puede volver a leer: lo que queda
 * guardado es su huella. Si se pierde, se genera otra.
 * 🔴 Restablecer corta TODAS las sesiones de esa persona: es lo que se hace
 * cuando la clave se olvidó o se filtró, y una sesión abierta con la clave
 * vieja no puede sobrevivirle.
 */
function accesoClaveTemporal(firma) {
  try {
    const persona = _accPersona(firma);
    if (!persona) return err('No hay un kinesiólogo activo con la firma ' + firma + '.', ERR.VALIDACION);
    // Sin caracteres que se confundan al dictarla por teléfono (O/0, l/1/I).
    const ABC = 'abcdefghijkmnpqrstuvwxyz23456789';
    let clave = '';
    const uuid = Utilities.getUuid().replace(/-/g, '');
    for (let i = 0; i < 8; i++) clave += ABC[parseInt(uuid.substr(i * 2, 2), 16) % ABC.length];
    _accGuardarClave(persona.firma, clave);
    _accMarcarTemporal(persona.firma, true);
    auditar({ email: 'acceso', firma: persona.firma, accion: 'ACCESO_CLAVE_TEMPORAL',
      entidad: 'ACCESO', idEntidad: _accNorm(persona.firma), patientId: '',
      resumen: 'se generó una clave temporal' });
    return ok({ firma: persona.firma, nombre: persona.nombre, clave: clave });
  } catch (e) { return err('accesoClaveTemporal: ' + e.message, ERR.INTERNO, e); }
}

/**
 * Reparte claves temporales a TODO el equipo activo y las imprime en el
 * registro de ejecución, para copiarlas y entregarlas una por una.
 *
 * 🔴 Correr esto ANTES de encender `LOGIN_EQUIPO_ACTIVO`. Encender el candado
 * sin repartir las llaves deja a la unidad sin poder registrar.
 * 🔴 No deja a nadie sin clave: solo pisa las de quienes NO tengan una, salvo
 * que se llame con `true`, que las rehace todas.
 * 🪤 Por lo mismo tampoco corta sesiones de quien ya tenía clave: se puede
 * correr para dar de alta a una persona nueva sin sacar al equipo de la app.
 * Con `true` sí las corta todas (cada clave rehecha es un restablecimiento).
 */
function accesoSembrarClaves(rehacerTodas) {
  const activos = repoLeerTodos('KINESIOLOGOS').filter(function (k) { return esVerdadero(k.ACTIVO); });
  const salida = [];
  activos.forEach(function (k) {
    const firma = String(k.FIRMA).toUpperCase();
    if (!rehacerTodas && _accTieneClave(firma)) { salida.push(firma + ' · ya tenía clave, no se tocó'); return; }
    const r = accesoClaveTemporal(firma);
    salida.push(r.ok ? (firma + ' · ' + (k.NOMBRE || '') + ' → ' + r.data.clave) : (firma + ' · ERROR ' + r.error));
  });
  console.log('🔑 CLAVES TEMPORALES (cada persona la cambia al entrar):\n  ' + salida.join('\n  '));
  console.log('\nCuando todos tengan la suya, encender el acceso con: accesoEncender()');
  return salida;
}

/** Enciende el acceso del turno. Avisa si alguien del equipo quedaría afuera. */
function accesoEncender() {
  const sinClave = repoLeerTodos('KINESIOLOGOS')
    .filter(function (k) { return esVerdadero(k.ACTIVO) && !_accTieneClave(k.FIRMA); })
    .map(function (k) { return String(k.FIRMA); });
  if (sinClave.length) {
    console.warn('⛔ NO se encendió: quedarían sin poder entrar → ' + sinClave.join(', ') +
      '\n   Corre primero accesoSembrarClaves().');
    return false;
  }
  escribirConfig('LOGIN_EQUIPO_ACTIVO', 'TRUE');
  console.log('🔒 Acceso del turno ENCENDIDO. Desde ahora cada uno entra con su clave.');
  return true;
}

/** Apaga el acceso del turno. Vuelve a la marcha blanca abierta. */
function accesoApagar() {
  escribirConfig('LOGIN_EQUIPO_ACTIVO', 'FALSE');
  console.warn('🔓 Acceso del turno APAGADO: cualquiera con el enlace vuelve a entrar.');
  return true;
}
