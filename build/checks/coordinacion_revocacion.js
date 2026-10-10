// coordinacion_revocacion.js — 🔐 LA SESIÓN DE COORDINACIÓN TAMBIÉN SE PUEDE CORTAR
// (4-oct-2026, revisión adversarial de la ronda G20).
//
// DE DÓNDE SALE. El acceso del TURNO ya cortaba sus sesiones al cambiar o
// restablecer una clave (ver acceso_revocacion.js): una versión por persona que
// vive en las propiedades. El Modo Coordinación se quedó afuera, y es el permiso
// MÁS ALTO: una sesión de coordinación corrige la fecha de ingreso, el RUT o el
// nombre de CUALQUIER paciente de la unidad, y deja la ficha marcada. Hasta hoy
// `_coordGuardarClave` no revocaba nada y `coordSesion` solo miraba que el token
// existiera en el caché: restablecerle la clave a quien «se le filtró» o perdió
// la tablet dejaba viva la sesión de esa tablet durante 30 minutos renovables
// por uso, o sea indefinidamente mientras alguien la siguiera tocando.
//
// QUÉ EXIGE
//   1. Control positivo: una sesión válida corrige, y la corrección se escribe.
//   2. 🔴 Cambiar la clave (`COORD_CAMBIAR_CLAVE`) corta las OTRAS sesiones de esa
//      persona. La que hizo el cambio SIGUE viva: la pantalla sigue trabajando con
//      ese mismo token (`COORD_TK`) después de «Clave cambiada», y la clave
//      temporal OBLIGA a cambiarla al entrar. Un cambio que falla no corta nada.
//   3. 🔴 Restablecer la clave de otra persona (`COORD_RESTABLECER`) corta TODAS las
//      sesiones de esa persona, y no toca la de quien restableció ni la de la
//      tercera.
//   4. 🔴 Recuperar la clave por correo (`COORD_RECUPERAR`) corta todas las sesiones
//      de esa persona. Con el interruptor APAGADO nada de esto existe: se rechaza
//      sin mandar correo, sin cambiar la clave y SIN cortar ninguna sesión.
//   5. Repartir claves iniciales (`coordSembrarClaves`) no corta a quien ya tenía.
//   6. 🔒 ESPACIOS SEPARADOS: cortar las sesiones del turno de DMV no corta las de
//      coordinación de coord2, ni al revés; los dos sellos viven en propiedades
//      distintas y un token de un espacio no abre el otro.
//   7. Una sesión abierta ANTES de esta versión (sin sello) sigue valiendo hasta el
//      primer corte real: pegar el archivo no puede sacar a nadie de la app.
//   8. 🔴 La criptografía NO se tocó: el texto que se resume es `sal|usuario|clave`,
//      con un vector fijo calculado aparte. Las claves de coordinación ya existen en
//      la planilla de Diego y cualquier cambio las invalidaría todas de una vez.
//   9. Cuesta poco, y cerrar sesión no depende de nada: un token que no existe no
//      lee ninguna propiedad; una válida lee UNA (su versión); `COORD_SALIR` quita el
//      token aunque las propiedades no respondan; y si no responden al USAR una
//      sesión, se rechaza como error interno —no como «expiró»— y sin cortarla.
//  10. La renovación no re-escribe un valor viejo: una sesión cerrada mientras otra
//      llamada suya comprobaba su versión no resucita, y ver la versión vieja
//      justo cuando se cambió la clave no borra el token que sobrevive.
//
// 🪤 Qué NO tiene coordinación: un concepto de «persona activa». `COORD_USUARIOS` es
// una tabla del código (coord1/2/3 → MCC/DMV/MFB) y `coordEntrar` no mira la casilla
// ACTIVO de KINESIOLOGOS. Por eso acá el corte es por CLAVE (cambiar, restablecer,
// recuperar) y no por baja; dar de baja a alguien en la hoja no corta su sesión de
// coordinación. Es una decisión de producto de Diego, no un descuido de esta guardia.
//
// Reloj: nada depende de la fecha (las sesiones duran 30 min y la guardia corre en
// milisegundos); la fecha de la hoja es inventada y fija.
//
// Uso: node build/checks/coordinacion_revocacion.js
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const S = require(path.join(__dirname, '..', 'sim', 'sim_srv.js'));
const { api, DB, SIM, CONFIG, MAILS } = S;

// El acceso del turno hace falta SOLO para probar que los dos espacios no se pisan.
// 🪤 Un solo eval: sus `const` (ERR) no cuelgan de globalThis con eval indirecto.
const V2 = path.resolve(__dirname, '..', '..', 'v2');
(0, eval)(['infra_respuesta.gs', 'infra_auth.gs', 'svc_acceso.gs']
  .map(f => fs.readFileSync(path.join(V2, f), 'utf8')).join('\n;\n'));

SIM.fecha = '2026-07-01';
SIM.hora = '10:00:00';

const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined ? '' : ' — ' + detalle));
  if (!cond) fails.push(l);
};

/* ══ Instrumentos ═════════════════════════════════════════════════════════ */
// · LECT_PROPS: cuánto cuesta cada llamada.
// · PROPS_CAIDAS: PropertiesService no responde al leer la versión de coordinación.
// · EN_VERSION: lo que pasa EN OTRA LLAMADA justo antes de que se lea la versión.
// · EN_RELECTURA: lo que pasa EN OTRA LLAMADA justo en la PRIMERA lectura del token que
//   ocurre DESPUÉS de haber mirado la versión: la ventana entre «comprobé» y «renuevo».
// · TRAZA: el orden en que se toca el caché de sesiones y las propiedades.
let LECT_PROPS = 0, PROPS_CAIDAS = false, EN_VERSION = null, EN_RELECTURA = null, VERSION_LEIDA = false, TRAZANDO = false;
const TRAZA = [];
const _props = global.PropertiesService.getScriptProperties;
global.PropertiesService = { getScriptProperties: () => {
  const p = _props();
  return {
    getProperty: k => {
      LECT_PROPS++;
      if (TRAZANDO) TRAZA.push('prop');
      if (/^coord_ver_/.test(k)) {
        VERSION_LEIDA = true;
        if (PROPS_CAIDAS) throw new Error('sim: las propiedades no responden');
        if (EN_VERSION) { const f = EN_VERSION; EN_VERSION = null; f(); }
      }
      return p.getProperty(k);
    },
    setProperty: (k, v) => p.setProperty(k, v),
    deleteProperty: k => p.deleteProperty(k),
  };
} };
const P = _props();                        // lectura SIN instrumentar, para mirar sin contar
const _cacheDe = global.CacheService.getScriptCache;
global.CacheService = { getScriptCache: () => {
  const c = _cacheDe();
  const de = k => /^coordses_/.test(k);
  return {
    get: k => {
      if (EN_RELECTURA && VERSION_LEIDA && de(k)) { const f = EN_RELECTURA; EN_RELECTURA = null; f(); }
      if (TRAZANDO && de(k)) TRAZA.push('get');
      return c.get(k);
    },
    put: (k, v, seg) => { if (TRAZANDO && de(k)) TRAZA.push('put'); return c.put(k, v, seg); },
    remove: k => { if (TRAZANDO && de(k)) TRAZA.push('remove'); return c.remove(k); },
  };
} };
const cache = global.CacheService.getScriptCache();
const midiendo = fn => { LECT_PROPS = 0; const r = fn(); return { r: r, props: LECT_PROPS }; };

/* ══ Mundo: tres personas, sus claves y una ficha para corregir ═══════════ */
const CLAVES = { coord1: 'clave-uno-ocho', coord2: 'clave-dos-ocho', coord3: 'clave-tres-ocho' };
DB.ARCHIVO_PACIENTES.push({
  ID_ARCHIVO: 'ARCH_REV', PATIENT_ID: 'PID_REV', CAMA_ORIGEN: '4',
  NOMBRE: 'Paciente Ficticio Uno', RUT: '11.111.111-1', EDAD: 60, SEXO: 'M',
  DIAGNOSTICO: 'Diagnóstico ficticio',
  FECHA_INGRESO: '2026-06-10', TS_INGRESO: '2026-06-10 08:00',
  FECHA_EGRESO: '2026-06-25', DIAS_TOTAL: 15, DIAS_VM_TOTAL: 1, DIAS_VA_TOTAL: 1,
  CORRECCIONES_JSON: '',
});
const ficha = () => DB.ARCHIVO_PACIENTES.find(a => a.PATIENT_ID === 'PID_REV');
const tomaFoto = () => JSON.stringify({ DB: DB, CONFIG: CONFIG });
let N = 0;
const corregir = tok => api('COORD_CORREGIR', { token: tok, patientId: 'PID_REV',
  cambios: { FECHA_INGRESO: '2026-06-' + String(11 + (++N) % 10).padStart(2, '0') } }, null);
const entrarC = (u, clave) => {
  const r = api('COORD_ENTRAR', { usuario: u, clave: clave || CLAVES[u] }, null);
  return r.ok ? r.data.token : '';
};
const vive = tok => api('COORD_FICHA', { token: tok, patientId: 'PID_REV' }, null).ok === true;
const rechazada = tok => {
  const r = api('COORD_FICHA', { token: tok, patientId: 'PID_REV' }, null);
  return r.ok === false && r.codigo === 'NO_AUTORIZADO';
};

/** Claves puestas y sesiones abiertas: dos de coord1 (tablet y celular), una de coord2 y una de coord3. */
function montar() {
  for (const u of Object.keys(CLAVES)) global._coordGuardarClave(u, CLAVES[u]);
  return { c1a: entrarC('coord1'), c1b: entrarC('coord1'), c2a: entrarC('coord2'), c3a: entrarC('coord3') };
}

/* ══ 0 · Las piezas existen ═══════════════════════════════════════════════ */
for (const n of ['coordSesion', 'coordEstado', 'coordCerrarSesion', '_coordGuardarClave', '_coordHuella',
  'coordCambiarClave', 'coordRestablecerClave', 'coordRecuperarConCodigo', 'coordSembrarClaves',
  'accesoDefinirClave', 'accesoEntrar', 'accesoSesion']) {
  si('existe ' + n + '()', typeof global[n] === 'function');
}
if (fails.length) { console.log('\n❌ ' + fails.length + ' FALLOS'); process.exit(1); }

/* ══ 1 · Control positivo: una sesión válida corrige, y se escribe ════════ */
let T = montar();
const antes = ficha().FECHA_INGRESO;
const c1 = corregir(T.c1a);
si('una sesión recién abierta corrige la ficha', c1.ok === true, JSON.stringify(c1));
si('…y de verdad se escribió', ficha().FECHA_INGRESO !== antes, ficha().FECHA_INGRESO);
si('…y COORD_ESTADO la da por viva', api('COORD_ESTADO', { token: T.c1a }, null).data.viva === true);
si('las cuatro sesiones sirven', vive(T.c1a) && vive(T.c1b) && vive(T.c2a) && vive(T.c3a));

/* ══ 2 · 🔴 Cambiar la clave corta las demás sesiones, no la de quien cambia ══ */
T = montar();
const falla = api('COORD_CAMBIAR_CLAVE', { token: T.c1a, actual: 'no-es-esta', nueva: 'clave-nueva-ocho' }, null);
si('un cambio con la clave actual equivocada se rechaza', falla.ok === false, JSON.stringify(falla));
si('🔴 …y un cambio que falla NO corta ninguna sesión', vive(T.c1a) && vive(T.c1b));
const cambio = api('COORD_CAMBIAR_CLAVE', { token: T.c1a, actual: CLAVES.coord1, nueva: 'clave-nueva-ocho' }, null);
si('se puede cambiar la clave desde la sesión abierta', cambio.ok === true, JSON.stringify(cambio));
const fotoCambio = tomaFoto();
si('🔴 cambiada la clave, la OTRA sesión de esa persona muere (NO_AUTORIZADO)', rechazada(T.c1b));
si('🔴 …y por api() no escribe ni deja rastro', corregir(T.c1b).ok === false && tomaFoto() === fotoCambio);
si('…y COORD_ESTADO la da por muerta', api('COORD_ESTADO', { token: T.c1b }, null).data.viva === false);
si('🔴 la sesión de quien hizo el cambio SIGUE viva (la pantalla sigue con ese mismo token)', vive(T.c1a),
  'cortarla sacaría a quien acaba de elegir su clave');
si('…y sigue pudiendo corregir', corregir(T.c1a).ok === true);
si('…y COORD_ESTADO la da por viva', api('COORD_ESTADO', { token: T.c1a }, null).data.viva === true);
si('el cambio de coord1 no toca a coord2 ni a coord3', vive(T.c2a) && vive(T.c3a));
si('la clave vieja ya no entra', entrarC('coord1', CLAVES.coord1) === '');
si('con la clave nueva se entra y esa sesión sirve', vive(entrarC('coord1', 'clave-nueva-ocho')));
// El «que sobreviva» solo re-sella la sesión de ESA persona: el sello de otro usuario no se toca.
T = montar();
global._coordRevocarSesiones('coord2', T.c1a);        // se pide conservar un token que NO es de coord2
si('🔴 conservar un token ajeno no lo re-sella con la versión de otro usuario (la de coord1 sigue valiendo)', vive(T.c1a));
si('…y las sesiones de coord2 sí quedaron cortadas', !vive(T.c2a));

/* ══ 3 · 🔴 Restablecer la clave de otra persona corta TODAS sus sesiones ═══ */
T = montar();
const c2b = entrarC('coord2');
const rest = api('COORD_RESTABLECER', { token: T.c1a, usuario: 'coord2' }, null);
si('coord1 le puede restablecer la clave a coord2', rest.ok === true && !!rest.data.temporal, JSON.stringify(rest));
si('🔴 las DOS sesiones de la persona restablecida mueren', rechazada(T.c2a) && rechazada(c2b));
si('…la de quien restableció SIGUE (no es su clave la que cambió), con sus dos sesiones', vive(T.c1a) && vive(T.c1b));
si('…y la de la tercera persona también', vive(T.c3a));
const conTemp = api('COORD_ENTRAR', { usuario: 'coord2', clave: rest.ok ? rest.data.temporal : '' }, null);
si('con la temporal se entra y obliga a cambiarla', conTemp.ok === true && conTemp.data.debeCambiarClave === true);
const tokTemp = conTemp.ok ? conTemp.data.token : '';
const elige = api('COORD_CAMBIAR_CLAVE', { token: tokTemp, actual: '', nueva: 'la-mia-ahora-77' }, null);
si('…y se elige una propia', elige.ok === true, JSON.stringify(elige));
si('🔴 …y esa sesión SIGUE viva después de elegirla (si no, la temporal sacaría de la app a todos)', vive(tokTemp));

/* ══ 4 · 🔴 Recuperar por correo corta las sesiones; apagado, no hace nada ═══ */
T = montar();
const m0 = MAILS.length;
const pedOff = api('COORD_PEDIR_CODIGO', { usuario: 'coord3' }, null);
si('apagada, pedir el código se rechaza y NO manda correo', pedOff.ok === false && MAILS.length === m0, JSON.stringify(pedOff));
const recOff = api('COORD_RECUPERAR', { usuario: 'coord3', codigo: '123456', nueva: 'otra-clave-larga' }, null);
si('apagada, recuperar con código también se rechaza', recOff.ok === false, JSON.stringify(recOff));
si('🔴 …y un intento rechazado NO corta nada: las sesiones de esa persona siguen', vive(T.c3a));
si('…ni cambia su clave', entrarC('coord3') !== '');

CONFIG.COORD_RECUPERA_CORREO = 'TRUE';
T = montar();
const m1 = MAILS.length;
const ped = api('COORD_PEDIR_CODIGO', { usuario: 'coord3' }, null);
si('(control) encendida, pedir el código manda UN correo', ped.ok === true && MAILS.length === m1 + 1, JSON.stringify(ped));
const cod = (String((MAILS[MAILS.length - 1] || {}).body || '').match(/\b(\d{6})\b/) || [])[1];
const rec = api('COORD_RECUPERAR', { usuario: 'coord3', codigo: cod, nueva: 'recuperada-ocho' }, null);
si('(control) con el código correcto se fija la clave nueva', rec.ok === true, JSON.stringify(rec));
si('🔴 recuperar la clave por correo corta las sesiones que esa persona tenía abiertas', rechazada(T.c3a),
  'quien la tuviera abierta con la clave vieja no puede sobrevivirle');
si('…y no toca a las otras personas', vive(T.c1a) && vive(T.c2a));
si('…y con la clave recuperada se entra', vive(entrarC('coord3', 'recuperada-ocho')));
CONFIG.COORD_RECUPERA_CORREO = 'FALSE';   // se deja como estaba

/* ══ 5 · Repartir las claves iniciales no corta a quien ya tenía ════════════ */
T = montar();
const sem = global.coordSembrarClaves();
si('sembrar cuando ya todos tienen clave no pisa ninguna', Array.isArray(sem) && sem.every(l => /ya tiene clave/.test(l)), JSON.stringify(sem));
si('🔴 …ni corta a nadie', vive(T.c1a) && vive(T.c1b) && vive(T.c2a) && vive(T.c3a));

/* ══ 6 · 🔒 Los dos espacios (turno y coordinación) no se pisan ═════════════ */
T = montar();
CONFIG.AUTH_DEV_MODE = 'TRUE';
global.accesoDefinirClave('DMV', 'clave-turno-dmv-1');
const turno = global.accesoEntrar({ usuario: 'DMV', clave: 'clave-turno-dmv-1' });
const tokTurno = turno.ok ? turno.data.token : '';
si('(control) DMV tiene una sesión del TURNO abierta', !!tokTurno && !!global.accesoSesion(tokTurno), JSON.stringify(turno));
const verCoordAntes = P.getProperty('coord_ver_coord2');
const verAccAntes = P.getProperty('acc_ver_dmv');
si('🔒 los dos sellos viven en propiedades DISTINTAS', !!verCoordAntes && !!verAccAntes && verCoordAntes !== verAccAntes,
  'coord_ver_coord2=' + verCoordAntes + ' · acc_ver_dmv=' + verAccAntes);
si('🔒 un token de coordinación NO abre el turno, ni el del turno abre coordinación',
  !global.accesoSesion(T.c2a) && !global.coordSesion(tokTurno));
global.accesoDefinirClave('DMV', 'clave-turno-dmv-2');          // corta el TURNO de DMV
si('🔒 cortar el turno de DMV NO corta su sesión de coordinación (coord2)', vive(T.c2a));
si('…ni cambia el sello de coordinación', P.getProperty('coord_ver_coord2') === verCoordAntes);
si('(control) …y el turno de DMV sí quedó cortado', !global.accesoSesion(tokTurno));
const turno2 = global.accesoEntrar({ usuario: 'DMV', clave: 'clave-turno-dmv-2' });
const tokTurno2 = turno2.ok ? turno2.data.token : '';
const verAccMedio = P.getProperty('acc_ver_dmv');
const restDmv = api('COORD_RESTABLECER', { token: T.c1a, usuario: 'coord2' }, null);   // corta COORDINACIÓN de coord2
si('(control) restablecerle la clave a coord2 corta su sesión de coordinación', restDmv.ok === true && rechazada(T.c2a));
si('🔒 …y NO corta la sesión del TURNO de DMV', !!tokTurno2 && !!global.accesoSesion(tokTurno2));
si('…ni cambia el sello del turno', P.getProperty('acc_ver_dmv') === verAccMedio);

/* ══ 7 · Una sesión de antes de esta versión no se corta por el despliegue ═ */
// El mundo de «antes de pegar el archivo»: una persona con su clave ya creada (sal y huella)
// pero SIN sello de versión, y una sesión abierta que tampoco lo trae. Se arma a mano, sin
// pasar por ninguna función que estrene versión: justo eso es lo que existe el día del despliegue.
T = montar();
global.COORD_USUARIOS.coord9 = 'ZZZ';
const salLeg = 'sal-de-antes';
P.setProperty('coord_sal_coord9', salLeg);
P.setProperty('coord_hash_coord9', global.credHuellaDe(salLeg + '|coord9|clave-de-antes'));
cache.put('coordses_token-de-antes', JSON.stringify({ usuario: 'coord9', firma: 'ZZZ', desde: 1 }), 1800);
si('(control) la persona de antes no tiene sello de versión', !P.getProperty('coord_ver_coord9'));
si('una sesión abierta ANTES de esta versión (sin sello) sigue valiendo', !!global.coordSesion('token-de-antes'),
  'pegar el archivo sacaría a coordinación de la app');
si('…y esa persona puede entrar con la clave de antes, con una sesión nueva que también vale',
  vive(entrarC('coord9', 'clave-de-antes')));
const restLeg = api('COORD_RESTABLECER', { token: T.c1a, usuario: 'coord9' }, null);
si('(control) se le restablece la clave', restLeg.ok === true, JSON.stringify(restLeg));
si('…y el primer corte real también alcanza a la sesión de antes', !global.coordSesion('token-de-antes'));
delete global.COORD_USUARIOS.coord9;
['sal', 'hash', 'temp', 'ver', 'fallidos'].forEach(k => P.deleteProperty('coord_' + k + '_coord9'));

/* ══ 8 · 🔴 La criptografía NO se tocó ═════════════════════════════════════ */
T = montar();
const huellaAparte = (sal, u, clave) => crypto.createHash('sha256').update(sal + '|' + u + '|' + clave, 'utf8').digest('base64');
si('el texto que se resume sigue siendo sal|usuario|clave (vector fijo, calculado aparte)',
  global._coordHuella('coord1', 'clave-fija-de-prueba', 'sal-fija-de-prueba') === 'xQq6iR/gootUw0FrywJLaGFqgCgWL5OJ1ssmIKfKB+w=',
  global._coordHuella('coord1', 'clave-fija-de-prueba', 'sal-fija-de-prueba'));
si('…y el usuario se normaliza como siempre (mayúsculas y espacios)',
  global._coordHuella(' COORD1 ', 'clave-fija-de-prueba', 'sal-fija-de-prueba') === 'xQq6iR/gootUw0FrywJLaGFqgCgWL5OJ1ssmIKfKB+w=');
si('lo guardado para coord1 es exactamente esa receta',
  P.getProperty('coord_hash_coord1') === huellaAparte(P.getProperty('coord_sal_coord1'), 'coord1', CLAVES.coord1));
si('🔒 la clave no queda en claro en ninguna propiedad de coord1',
  ['sal', 'hash', 'ver', 'temp', 'fallidos'].every(k => String(P.getProperty('coord_' + k + '_coord1') || '').indexOf(CLAVES.coord1) === -1));
si('🔒 la huella de coordinación NO es la del turno (prefijo distinto): una clave no abre el otro espacio',
  P.getProperty('coord_hash_coord1') !== global.credHuellaDe(P.getProperty('coord_sal_coord1') + '|acc|coord1|' + CLAVES.coord1));
si('las claves nuevas siguen entrando con la misma receta tras un cambio',
  (() => {
    api('COORD_CAMBIAR_CLAVE', { token: T.c1a, actual: CLAVES.coord1, nueva: 'cambiada-ocho-8' }, null);
    return P.getProperty('coord_hash_coord1') === huellaAparte(P.getProperty('coord_sal_coord1'), 'coord1', 'cambiada-ocho-8')
      && entrarC('coord1', 'cambiada-ocho-8') !== '';
  })());

/* ══ 9 · Cuesta poco, y cerrar sesión no depende de nada ═══════════════════ */
T = montar();
const inexistente = midiendo(() => global.coordSesion('token-que-no-existe'));
si('un token que no existe se rechaza', inexistente.r === null);
si('…sin leer ninguna propiedad', inexistente.props === 0, inexistente.props + ' lecturas');
si('…y sin token tampoco', midiendo(() => global.coordSesion('')).props === 0);
const valida = midiendo(() => global.coordSesion(T.c3a));
si('una sesión válida resuelve', !!valida.r && valida.r.firma === 'MFB');
si('…y lee UNA propiedad como máximo: la versión de esa persona', valida.props <= 1, valida.props + ' lecturas');
api('COORD_RESTABLECER', { token: T.c1a, usuario: 'coord3' }, null);
const cortada = midiendo(() => global.coordSesion(T.c3a));
si('una sesión cortada se rechaza leyendo una sola propiedad', cortada.r === null && cortada.props <= 1, cortada.props + ' lecturas');

T = montar();
PROPS_CAIDAS = true;
const salCaida = api('COORD_SALIR', { token: T.c1a }, null);
PROPS_CAIDAS = false;
si('🔴 con las propiedades caídas, cerrar sesión responde ok y dice que cerró', salCaida.ok === true && salCaida.data.cerrada === true,
  JSON.stringify(salCaida));
si('🔴 …y el token ya NO sirve (cerrar no puede depender de que se pueda leer la versión)', rechazada(T.c1a));
si('…cerrar UNA sesión no cierra las otras', vive(T.c1b) && vive(T.c2a) && vive(T.c3a));
si('…y quedó en la auditoría, firmada por su dueño',
  DB.AUDIT_LOG.some(a => a.accion === 'COORD_SALIDA' && a.firma === 'MCC'));
si('cerrar dos veces no es un error, y la segunda avisa que no había nada',
  (r => r.ok === true && r.data.cerrada === false)(api('COORD_SALIR', { token: T.c1a }, null)));

T = montar();
const verAntes2 = P.getProperty('coord_ver_coord2');
const fotoCaida = tomaFoto();
PROPS_CAIDAS = true;
const usoCaido = api('COORD_FICHA', { token: T.c2a, patientId: 'PID_REV' }, null);
const escCaida = corregir(T.c2a);
PROPS_CAIDAS = false;
si('con las propiedades caídas al USAR una sesión, la acción se rechaza', usoCaido.ok === false && escCaida.ok === false,
  JSON.stringify(usoCaido).slice(0, 160));
si('🔴 …como error interno, NO como «expiró» ni NO_AUTORIZADO (la sesión puede estar perfecta)',
  usoCaido.codigo !== 'NO_AUTORIZADO' && !/expir/i.test(String(usoCaido.error || '')), JSON.stringify(usoCaido).slice(0, 160));
si('🔴 …sin cortar nada: ni el sello ni el token', P.getProperty('coord_ver_coord2') === verAntes2 && !!cache.get('coordses_' + T.c2a));
si('…y sin escribir nada', tomaFoto() === fotoCaida);
si('🔴 vuelven las propiedades y la MISMA sesión sirve', vive(T.c2a) && corregir(T.c2a).ok === true);

/* ══ 10 · 🔴 La renovación NO re-escribe un valor que pudo cambiar ══════════ */
// (a) Una llamada lee la sesión y va a mirar su versión; en medio, el dueño CIERRA la sesión.
T = montar();
let disparo = false;
EN_VERSION = () => { disparo = true; api('COORD_SALIR', { token: T.c1b }, null); };
global.coordSesion(T.c1b);
EN_VERSION = null;
si('(control) la carrera se produjo: otra llamada cerró la sesión en medio de la comprobación', disparo === true,
  'sin la lectura de la versión no hay ventana que probar');
si('🔴 una sesión cerrada mientras otra llamada suya comprobaba NO resucita', !cache.get('coordses_' + T.c1b),
  'cerrar sesión no habría cerrado nada');
si('…y no vuelve a servir', rechazada(T.c1b));
si('…el cierre no tocó a las otras', vive(T.c1a) && vive(T.c2a));

// (b) Una llamada en vuelo del MISMO token mientras esa sesión cambia su clave: aunque ella misma
//     se rechace por ver la versión vieja, NO borra la sesión que sobrevive (borrar con una vista
//     vieja es la misma carrera que re-escribir con una vista vieja).
T = montar();
disparo = false;
EN_VERSION = () => { disparo = true; api('COORD_CAMBIAR_CLAVE', { token: T.c1a, actual: CLAVES.coord1, nueva: 'cambio-en-vuelo-9' }, null); };
global.coordSesion(T.c1a);
EN_VERSION = null;
si('(control) la carrera se produjo: la clave cambió en medio de la comprobación', disparo === true);
si('🔴 ver la versión vieja justo cuando se cambió la clave no BORRA la sesión que sobrevive',
  vive(T.c1a), 'saldría de la app justo después de elegir su clave');
si('…y la otra sesión de esa persona murió, como en cualquier cambio de clave', !vive(T.c1b));

// (c) La ventana más chica que queda: entre «ya comprobé la versión» y «renuevo». Si en ese
//     instante llega un sello nuevo (la clave cambió) o se cierra la sesión, la renovación tiene
//     que escribir lo que hay AHORA, no lo que había al principio.
T = montar();
disparo = false; VERSION_LEIDA = false;
EN_RELECTURA = () => { disparo = true; api('COORD_CAMBIAR_CLAVE', { token: T.c1a, actual: CLAVES.coord1, nueva: 'cambio-en-vuelo-9' }, null); };
global.coordSesion(T.c1a);
EN_RELECTURA = null;
si('(control) la carrera se produjo: la clave cambió entre la comprobación y la renovación', disparo === true,
  'si la renovación no vuelve a leer el token, no hay ventana que probar');
si('🔴 el sello nuevo que llega entre la comprobación y la renovación NO lo pisa el viejo (la sesión sigue viva)',
  vive(T.c1a), 'saldría de la app justo después de elegir su clave');
si('…y la otra sesión de esa persona murió, como en cualquier cambio de clave', !vive(T.c1b));

T = montar();
disparo = false; VERSION_LEIDA = false;
EN_RELECTURA = () => { disparo = true; api('COORD_SALIR', { token: T.c1b }, null); };
global.coordSesion(T.c1b);
EN_RELECTURA = null;
si('(control) la carrera se produjo: la sesión se cerró entre la comprobación y la renovación', disparo === true);
si('🔴 una sesión cerrada en ESE instante tampoco resucita', !cache.get('coordses_' + T.c1b) && rechazada(T.c1b));

// (d) El orden: la versión se mira ANTES de la última lectura del token, y esa lectura queda pegada a su renovación.
T = montar();
TRAZA.length = 0; TRAZANDO = true;
const valida2 = global.coordSesion(T.c3a);
TRAZANDO = false;
const iGet = TRAZA.lastIndexOf('get'), iPut = TRAZA.lastIndexOf('put'), iProp = TRAZA.lastIndexOf('prop');
const orden = TRAZA.join(' > ');
si('una sesión válida resuelve y se renueva UNA sola vez', !!valida2 && TRAZA.filter(x => x === 'put').length === 1, orden);
si('🔴 la versión se mira ANTES de la última lectura del token', iProp >= 0 && iProp < iGet, orden);
si('🔴 …y la renovación va PEGADA a esa lectura: entre las dos no hay propiedades', iPut === iGet + 1, orden);
si('nunca se borra el token de una sesión válida', !TRAZA.includes('remove'), orden);

console.log(fails.length ? '\n❌ ' + fails.length + ' FALLOS' : '\n✅ TODO OK');
process.exit(fails.length ? 1 : 0);
