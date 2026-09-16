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

/** Escribe la clave de una persona. Sal nueva en cada cambio. */
function _accGuardarClave(usuario, clave) {
  const u = _accNorm(usuario);
  const sal = Utilities.getUuid();
  _accProps().setProperty('acc_sal_' + u, sal);
  _accProps().setProperty('acc_hash_' + u, _accHuella(u, clave, sal));
  _accProps().deleteProperty('acc_fallidos_' + u);
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

function _accAbrirSesion(persona) {
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('accses_' + token, JSON.stringify({
    firma: persona.firma, nombre: persona.nombre, desde: Date.now(),
  }), _ACC_SESION_SEG);
  return token;
}

/**
 * Resuelve un token a {firma, nombre}, o null. Renueva la ventana en cada uso:
 * la sesión muere por inactividad, no a las seis horas de haber entrado.
 */
function accesoSesion(token) {
  if (!token) return null;
  const cache = CacheService.getScriptCache();
  const hit = cache.get('accses_' + token);
  if (!hit) return null;
  let s;
  try { s = JSON.parse(hit); } catch (e) { return null; }
  if (!s || !s.firma) return null;
  cache.put('accses_' + token, hit, _ACC_SESION_SEG);
  return s;
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
 */
function accesoSalir(datos) {
  try {
    const token = String((datos && datos.token) || '');
    if (!token) return ok({ cerrada: false, motivo: 'sin token' });
    const s = accesoSesion(token);
    if (!s) return ok({ cerrada: false, motivo: 'la sesión ya no estaba abierta' });
    CacheService.getScriptCache().remove('accses_' + token);
    auditar({ email: 'acceso', firma: s.firma, accion: 'ACCESO_SALIDA',
      entidad: 'ACCESO', idEntidad: _accNorm(s.firma), patientId: '', resumen: 'cerró su sesión' });
    return ok({ cerrada: true, firma: s.firma });
  } catch (e) { return err('accesoSalir: ' + e.message, ERR.INTERNO, e); }
}

/** Cambiar la propia clave. Exige la actual: un token robado no basta. */
function accesoCambiarClave(datos) {
  try {
    const s = accesoSesion(String((datos && datos.token) || ''));
    if (!s) return err('Tu sesión expiró. Vuelve a entrar con tu clave.', ERR.NO_AUTORIZADO);
    const usuario = _accNorm(s.firma);
    const actual = String((datos && datos.actual) || '');
    const nueva = String((datos && datos.nueva) || '');

    if (!_accClaveOk(usuario, actual)) return err('La clave actual no es correcta.', ERR.NO_AUTORIZADO);
    if (nueva.length < _ACC_CLAVE_MIN) {
      return err('La clave nueva debe tener al menos ' + _ACC_CLAVE_MIN + ' caracteres.', ERR.VALIDACION);
    }
    if (nueva === actual) return err('La clave nueva tiene que ser distinta de la actual.', ERR.VALIDACION);

    _accGuardarClave(usuario, nueva);
    _accMarcarTemporal(usuario, false);
    auditar({ email: 'acceso', firma: s.firma, accion: 'ACCESO_CAMBIO_CLAVE',
      entidad: 'ACCESO', idEntidad: usuario, patientId: '', resumen: 'cambió su clave' });
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
