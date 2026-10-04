// acceso_revocacion.js — 🔐 UNA SESIÓN SE PUEDE CORTAR (4-oct-2026).
//
// DE DÓNDE SALE. `accesoSesion(token)` solo miraba que el token existiera en el
// CacheService. Resultado: desactivar a un kinesiólogo en la hoja KINESIOLOGOS
// (casilla ACTIVO) o cambiarle la clave **no cerraba las sesiones ya abiertas**,
// que viven hasta 6 horas renovables por uso. Una tablet olvidada abierta en el
// office, o la sesión de alguien que ya no trabaja en la unidad, seguían
// firmando evoluciones con su nombre durante horas, y desactivar a la persona
// no servía de nada hasta que el caché la soltara. Es el contrato G20 del plan:
// una sesión revocada o de una persona desactivada se rechaza en `autorizar()`,
// sin guardar nada y con el mismo mensaje de «Entra con tu clave».
//
// QUÉ EXIGE
//   1. Sesión válida ⇒ entra, y la acción SE ESCRIBE (control positivo: sin él,
//      «no se guardó nada» pasaría también si el dispatcher no guardara nunca).
//   2. 🔴 Desactivar a la persona ⇒ la MISMA sesión se rechaza, todas las suyas,
//      y no se guarda NADA (ni datos, ni configuración, ni auditoría). Las de
//      las demás personas siguen vivas: el corte es por persona.
//   3. 🔴 Cambiar la clave ⇒ las OTRAS sesiones de esa persona mueren. La que
//      hizo el cambio SIGUE viva, y no es una cortesía: la pantalla, tras
//      `ACCESO_CAMBIAR_CLAVE`, recarga con el MISMO token (`accAdentro`). Si el
//      cambio matara a quien lo hace, la clave temporal —que obliga a cambiarla
//      al entrar— lo sacaría de la app justo después de elegirla.
//      Un cambio que falla (clave actual equivocada) no corta nada.
//   4. 🔴 Restablecer a clave temporal (`accesoClaveTemporal`), definirla a mano
//      (`accesoDefinirClave`) o rehacerlas todas (`accesoSembrarClaves(true)`)
//      corta las sesiones. Repartir claves SIN rehacer no corta a quien ya
//      tenía: sembrar para dar de alta a una persona nueva no puede sacar a
//      todo el equipo de la app a mitad de turno.
//   5. Con el candado APAGADO no cambia NADA: ni el resultado de `autorizar()`
//      ni una sola lectura de la hoja o de las propiedades. Nace apagado.
//   6. El candado del turno sigue yendo PRIMERO: con AUTH_DEV_MODE olvidado en
//      TRUE, una sesión cortada igual se rechaza (si cayera al modo desarrollo,
//      cortar sesiones no protegería nada y ese olvido no se ve en pantalla).
//   7. Cuesta poco: `autorizar()` corre en CADA acción, así que un token que no
//      existe no lee la hoja, una sesión cortada por versión tampoco, y una
//      válida lee KINESIOLOGOS como máximo una vez.
//   8. Una sesión abierta ANTES de esta versión (sin sello de versión) sigue
//      valiendo: pegar el archivo no puede sacar a todo el equipo.
//   9. La criptografía no se tocó: la huella del turno sigue siendo la misma
//      receta (`sal|acc|usuario|clave`), la clave no queda en claro, y
//      `accesoEncender()` se sigue negando si algún activo queda sin clave.
//  10. 🔴 Si Sheets NO responde al comprobar la sesión (revisión adversarial,
//      4-oct-2026), `autorizar()` no contesta «Entra con tu clave» con
//      NO_AUTORIZADO: la pantalla lo lee como sesión cortada y manda a la puerta
//      a quien tenía una sesión VÁLIDA, por un tropiezo de la planilla. Contesta
//      un error DISTINTO y honesto («No se pudo comprobar tu sesión»), con un
//      código y un texto que no disparan la salida, y NO corta nada: ni la versión
//      de sus sesiones ni el token. Lo mismo vale para cambiar la clave. Los
//      patrones que sacan a la gente de la app se LEEN de v2/index.html en vez de
//      copiarse acá: así la guardia mide contra la pantalla de verdad.
//  11. 🔴 Cerrar sesión quita el token SIEMPRE, con la hoja caída, con la sesión
//      ya cortada o con la persona dada de baja. Antes validaba primero con
//      `accesoSesion`: si la lectura de KINESIOLOGOS fallaba, contestaba
//      `cerrada:false` y el token quedaba vivo en el caché, o sea que la tablet
//      del office no se cerraba justo cuando la planilla andaba mal.
//  12. 🔴 Concurrencia: la renovación de la sesión no re-escribe un valor viejo.
//      `accesoSesion` leía el token, esperaba la lectura (lenta) de la hoja y
//      volvía a ESCRIBIR lo que había leído al principio. Una llamada que cerró
//      la sesión mientras tanto la dejaba resucitada, y una que acababa de
//      cambiar la clave veía su sello nuevo pisado por el viejo (y salía de la app
//      justo después de elegirla). Ahora la comprobación cara va ANTES de la
//      lectura que se renueva, y esa lectura y su escritura van pegadas.
//      🪤 Límite que queda: CacheService no tiene compare-and-set, así que entre
//      esa última lectura y su escritura sigue habiendo UN viaje al caché. No se
//      puede probar que cierre del todo; se prueba que ya no es el de la lectura
//      de la hoja, y que cortar por VERSIÓN no depende del caché.
//
// 🪤 Qué NO prueba: la política de qué pasa con el trabajo escrito en pantalla
// cuando se corta la sesión (conservarlo o no) no está decidida; esta guardia
// solo exige que el servidor NO acepte la escritura.
//
// Reutiliza el mundo del simulador (`sim_srv.js`: hojas y caché en memoria, el
// `api()` real) en vez de armar otro sandbox, y completa los módulos de
// identidad igual que `acceso_pantalla.js`. Pasa por `api()` y no solo por
// `autorizar()` para probar lo que de verdad importa: que el dispatcher frena
// ANTES de tocar nada.
//
// Uso: node build/checks/acceso_revocacion.js
'use strict';
const fs = require('fs');
const path = require('path');
const S = require(path.join(__dirname, '..', 'sim', 'sim_srv.js'));

// 🪤 `infra_respuesta.gs` primero aunque el simulador ya lo cargó: sus `const`
// (ERR y los códigos de error) no cuelgan de globalThis con eval indirecto, y
// un servicio evaluado en OTRO ámbito revienta con «ERR is not defined» en
// cuanto toma un camino de error (ver CLAUDE.md).
const V2 = path.resolve(__dirname, '..', '..', 'v2');
(0, eval)(['infra_respuesta.gs', 'infra_auth.gs', 'svc_acceso.gs']
  .map(f => fs.readFileSync(path.join(V2, f), 'utf8')).join('\n;\n'));

// Fecha inventada y fija: nada de esto depende del reloj, pero la auditoría del
// simulador la lee y así la corrida es la misma hoy que dentro de un año.
S.SIM.fecha = '2026-07-01';
S.SIM.hora = '10:00:00';

const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined ? '' : ' — ' + detalle));
  if (!cond) fails.push(l);
};

/* ══ Instrumentos: cuánto cuesta cada llamada ═════════════════════════════ */
let LECT_KINES = 0, LECT_PROPS = 0;
// Fallas y carreras SIMULADAS (revisión adversarial, 4-oct-2026):
//  · HOJA_CAIDA: Sheets no responde (cuota, timeout) al leer KINESIOLOGOS.
//  · EN_LECTURA: lo que pasa EN OTRA LLAMADA mientras una lectura de la hoja está
//    en curso. Es la forma de volver determinista una carrera real: la lectura
//    lenta de la hoja es justo la ventana en la que otra llamada corta o cambia
//    la sesión. Se dispara UNA vez, al empezar esa lectura.
//  · EN_VERSION: lo mismo, pero justo antes de que se lea la versión de la persona.
//  · TRAZA: el orden en que `accesoSesion` toca el caché, las propiedades y la hoja.
let HOJA_CAIDA = false, EN_LECTURA = null, EN_VERSION = null, TRAZANDO = false;
const TRAZA = [];
const _repoLeerTodos = global.repoLeerTodos;
global.repoLeerTodos = function (hoja) {
  if (hoja === 'KINESIOLOGOS') {
    LECT_KINES++;
    if (TRAZANDO) TRAZA.push('hoja');
    if (HOJA_CAIDA) throw new Error('sim: la hoja KINESIOLOGOS no responde');
    if (EN_LECTURA) { const f = EN_LECTURA; EN_LECTURA = null; f(); }
  }
  return _repoLeerTodos.apply(null, arguments);
};
const _props = global.PropertiesService.getScriptProperties;
global.PropertiesService = { getScriptProperties: () => {
  const p = _props();
  return {
    getProperty: k => {
      LECT_PROPS++;
      if (TRAZANDO) TRAZA.push('prop');
      if (EN_VERSION && /^acc_ver_/.test(k)) { const f = EN_VERSION; EN_VERSION = null; f(); }
      return p.getProperty(k);
    },
    setProperty: (k, v) => p.setProperty(k, v),
    deleteProperty: k => p.deleteProperty(k),
  };
} };
const _cacheDe = global.CacheService.getScriptCache;
global.CacheService = { getScriptCache: () => {
  const c = _cacheDe();
  const de = k => /^accses_/.test(k);
  return {
    get: k => { if (TRAZANDO && de(k)) TRAZA.push('get'); return c.get(k); },
    put: (k, v, seg) => { if (TRAZANDO && de(k)) TRAZA.push('put'); return c.put(k, v, seg); },
    remove: k => { if (TRAZANDO && de(k)) TRAZA.push('remove'); return c.remove(k); },
  };
} };
const midiendo = fn => {
  LECT_KINES = 0; LECT_PROPS = 0;
  const r = fn();
  return { r: r, kines: LECT_KINES, props: LECT_PROPS };
};

/* ══ Lo que, en la PANTALLA, manda a la gente a la puerta de entrada ══════ */
// v2/index.html decide por el TEXTO del error (no por el código): cualquier línea
// que llame a `mostrarLogin(` bajo un `/…/.test(…)`. Se leen del archivo y no se
// copian a mano, porque el error que se inventó en el servidor tiene que medirse
// contra lo que la pantalla de verdad hace con él, no contra lo que recordamos.
const INDEX_HTML = fs.readFileSync(path.join(V2, 'index.html'), 'utf8');
const DISPARADORES = [];
INDEX_HTML.split('\n').forEach(linea => {
  if (!/mostrarLogin\(/.test(linea)) return;
  const lit = /\((\/(?:[^\/\\\n]|\\.)+\/[a-z]*)\.test\(/g;
  let m;
  while ((m = lit.exec(linea))) {
    const i = m[1].lastIndexOf('/');
    DISPARADORES.push(new RegExp(m[1].slice(1, i), m[1].slice(i + 1)));
  }
});
const mandaALaPuerta = txt => DISPARADORES.some(re => re.test(String(txt || '')));
// Los códigos que existen de verdad (const ERR no cuelga de globalThis: se lee del fuente).
const CODIGOS_ERR = [...fs.readFileSync(path.join(V2, 'infra_respuesta.gs'), 'utf8')
  .match(/const ERR = \{([^}]*)\}/)[1].matchAll(/'([A-Z_]+)'/g)].map(m => m[1]);

/* ══ Mundo: la gente, las claves y las sesiones ═══════════════════════════ */
const CLAVES = { DMV: 'clave-dmv-uno', MFB: 'clave-mfb-dos', CSR: 'clave-csr-tres' };
const persona = f => S.DB.KINESIOLOGOS.find(k => k.FIRMA === f);
const entrar = (f, clave) => {
  const r = global.accesoEntrar({ usuario: f, clave: clave || CLAVES[f] });
  return r.ok ? r.data.token : '';
};
const tomaFoto = () => JSON.stringify({ DB: S.DB, CONFIG: S.CONFIG });
let BANNER_N = 0;
const escribir = tok => S.api('SET_BANNER', { tab: 'G', valor: 'aviso ' + (++BANNER_N) }, tok);

/** Claves nuevas y sesiones abiertas: dos de DMV (tablet y celular), una de MFB y una de CSR. */
function montar() {
  for (const f of Object.keys(CLAVES)) { persona(f).ACTIVO = true; global.accesoDefinirClave(f, CLAVES[f]); }
  return { dmvTablet: entrar('DMV'), dmvCelular: entrar('DMV'), mfb: entrar('MFB'), csr: entrar('CSR') };
}
const sirve = (tok, firma) => { const a = global.autorizar(tok, firma); return a.ok === true && a.firma === firma; };

/* ══ 0 · Las piezas existen ═══════════════════════════════════════════════ */
for (const n of ['accesoEntrar', 'accesoSesion', 'accesoCambiarClave', 'accesoClaveTemporal',
  'accesoDefinirClave', 'accesoSembrarClaves', 'accesoEncender', 'accesoEstado', 'autorizar']) {
  si('existe ' + n + '()', typeof global[n] === 'function');
}
if (fails.length) { console.log('\n❌ ' + fails.length + ' FALLOS'); process.exit(1); }

/* ══ 1 · Nace apagado: la referencia contra la que se compara todo ════════ */
si('sin CONFIG.LOGIN_EQUIPO_ACTIVO el acceso del turno está apagado', global.accesoActivo() === false);
const REFERENCIA_APAGADO = JSON.stringify(global.autorizar('', 'DMV'));
si('apagado, autorizar() sigue siendo el de siempre (modo desarrollo)',
  /"ok":true/.test(REFERENCIA_APAGADO) && /"dev":true/.test(REFERENCIA_APAGADO), REFERENCIA_APAGADO);

S.CONFIG.LOGIN_EQUIPO_ACTIVO = 'TRUE';   // encendido a mano: lo que se prueba es el corte, no el encendido

/* ══ 2 · Sesión válida ⇒ entra, y escribe ═════════════════════════════════ */
let T = montar();
si('una sesión recién abierta autoriza a su dueño', sirve(T.dmvTablet, 'DMV'));
const antesBanner = S.CONFIG.BANNER_G;
const escrita = escribir(T.dmvTablet);
si('control positivo: con sesión válida la escritura pasa por api()', escrita.ok === true, JSON.stringify(escrita));
si('…y de verdad se escribió', S.CONFIG.BANNER_G !== antesBanner && /^aviso/.test(String(S.CONFIG.BANNER_G)),
  String(S.CONFIG.BANNER_G));
si('…y quedó en la auditoría', S.DB.AUDIT_LOG.some(a => a.accion === 'SET_BANNER'));

/* ══ 3 · 🔴 Desactivar a la persona corta SUS sesiones y no guarda nada ═══ */
T = montar();
const olvidada = entrar('DMV');            // una tablet que nadie toca mientras la persona está de baja
persona('DMV').ACTIVO = false;
const foto = tomaFoto();
const cortada = global.autorizar(T.dmvTablet, 'DMV');
si('🔴 desactivada la persona, la MISMA sesión se rechaza en autorizar()', cortada.ok === false, JSON.stringify(cortada));
si('…con el mensaje de «Entra con tu clave»', /Entra con tu clave/.test(String(cortada.error || '')), cortada.error);
si('…y con el código de no autorizado', cortada.codigo === 'NO_AUTORIZADO', cortada.codigo);
const escCortada = escribir(T.dmvCelular);
si('🔴 por api(), la escritura de una sesión de persona desactivada se rechaza', escCortada.ok === false,
  JSON.stringify(escCortada));
si('🔴 …y NO se guardó nada: ni datos, ni configuración, ni auditoría', tomaFoto() === foto,
  'el dispatcher dejó pasar algo antes de frenar');
si('desactivada, su otra sesión (la del celular) también está cortada', !sirve(T.dmvCelular, 'DMV'));
si('accesoEstado ya no dice que está dentro',
  global.accesoEstado({ token: T.dmvTablet }).data.dentro === false);
si('el corte es por persona: la sesión de otro kinesiólogo sigue viva', sirve(T.mfb, 'MFB') && sirve(T.csr, 'CSR'));
persona('DMV').ACTIVO = true;
si('reactivarla en la hoja NO resucita la sesión que ya se había cortado', !sirve(T.dmvTablet, 'DMV'),
  'una sesión cortada tiene que seguir cortada: para volver, que entre con su clave');
si('…ni la que nadie usó mientras estuvo de baja (la baja corta a todas en el primer rechazo)', !sirve(olvidada, 'DMV'));
si('…y entrando con su clave vuelve a trabajar', sirve(entrar('DMV'), 'DMV'));

/* ══ 4 · 🔴 Cambiar la clave corta las demás, no la de quien la cambia ═════ */
T = montar();
const falla = global.accesoCambiarClave({ token: T.dmvTablet, actual: 'no-es-esta', nueva: 'otra-clave-seis' });
si('un cambio con la clave actual equivocada se rechaza', falla.ok === false);
si('…y un cambio que falla NO corta ninguna sesión', sirve(T.dmvTablet, 'DMV') && sirve(T.dmvCelular, 'DMV'));
const cambio = global.accesoCambiarClave({ token: T.dmvTablet, actual: CLAVES.DMV, nueva: 'clave-nueva-seis' });
si('se puede cambiar la clave desde la sesión abierta', cambio.ok === true, JSON.stringify(cambio));
const fotoCambio = tomaFoto();
const otraCortada = global.autorizar(T.dmvCelular, 'DMV');
si('🔴 cambiada la clave, la OTRA sesión de esa persona muere', otraCortada.ok === false, JSON.stringify(otraCortada));
si('…con el mensaje de «Entra con tu clave»', /Entra con tu clave/.test(String(otraCortada.error || '')), otraCortada.error);
si('🔴 …y por api() no escribe ni deja rastro', escribir(T.dmvCelular).ok === false && tomaFoto() === fotoCambio);
si('🔴 la sesión que hizo el cambio SIGUE viva (la pantalla recarga con ese mismo token)',
  sirve(T.dmvTablet, 'DMV'), 'cortarla sacaría a quien acaba de elegir su clave temporal');
si('…y sigue pudiendo escribir', escribir(T.dmvTablet).ok === true);
si('el cambio de clave de DMV no toca a los demás', sirve(T.mfb, 'MFB') && sirve(T.csr, 'CSR'));
si('con la clave nueva se entra y esa sesión nueva sirve', sirve(entrar('DMV', 'clave-nueva-seis'), 'DMV'));
si('la clave vieja ya no entra', entrar('DMV', CLAVES.DMV) === '');

/* ══ 5 · 🔴 Restablecer a clave temporal corta las sesiones ════════════════ */
T = montar();
const temp = global.accesoClaveTemporal('DMV');
si('se puede restablecer a una clave temporal', temp.ok === true && !!temp.data.clave, JSON.stringify(temp));
si('🔴 restablecida a temporal, sus DOS sesiones mueren', !sirve(T.dmvTablet, 'DMV') && !sirve(T.dmvCelular, 'DMV'));
si('…y las de los demás siguen', sirve(T.mfb, 'MFB') && sirve(T.csr, 'CSR'));
// La clave temporal obliga a cambiarla al entrar: ese cambio NO puede sacar de la app a quien lo hace.
const conTemp = global.accesoEntrar({ usuario: 'DMV', clave: temp.ok ? temp.data.clave : '' });
const tokenTemp = conTemp.ok ? conTemp.data.token : '';
si('con la temporal se entra', conTemp.ok === true && conTemp.data.debeCambiarClave === true);
const elige = global.accesoCambiarClave({ token: tokenTemp, actual: temp.ok ? temp.data.clave : '', nueva: 'la-mia-ahora-7' });
si('…y se elige una propia', elige.ok === true, JSON.stringify(elige));
si('🔴 …y esa sesión sigue viva después de elegirla (si no, la temporal sacaría de la app a todos)',
  sirve(tokenTemp, 'DMV'));

T = montar();
global.accesoDefinirClave('MFB', 'definida-a-mano-8');
si('🔴 definirle la clave a mano (editor) también corta sus sesiones', !sirve(T.mfb, 'MFB'));
si('…y no corta a quien no se le tocó la clave', sirve(T.dmvTablet, 'DMV') && sirve(T.csr, 'CSR'));

T = montar();
global.accesoSembrarClaves();
si('🔴 repartir claves SIN rehacer no corta a quien ya tenía clave (dar de alta a alguien no saca al equipo)',
  sirve(T.dmvTablet, 'DMV') && sirve(T.mfb, 'MFB') && sirve(T.csr, 'CSR'));
global.accesoSembrarClaves(true);
si('rehacer TODAS las claves corta todas las sesiones',
  !sirve(T.dmvTablet, 'DMV') && !sirve(T.mfb, 'MFB') && !sirve(T.csr, 'CSR'));

/* ══ 6 · El candado del turno va PRIMERO, aunque el modo desarrollo esté TRUE ═ */
T = montar();
si('(AUTH_DEV_MODE sigue en TRUE en este mundo)', S.CONFIG.AUTH_DEV_MODE === 'TRUE');
persona('MFB').ACTIVO = false;
const sinDev = global.autorizar(T.mfb, 'MFB');
si('🔴 con el modo desarrollo olvidado en TRUE, una sesión cortada igual se rechaza',
  sinDev.ok === false && sinDev.dev !== true, JSON.stringify(sinDev));
persona('MFB').ACTIVO = true;

/* ══ 7 · Cuesta poco: autorizar() corre en CADA acción ════════════════════ */
T = montar();
const inexistente = midiendo(() => global.autorizar('token-que-no-existe', 'DMV'));
si('un token que no existe se rechaza', inexistente.r.ok === false);
si('…sin leer la hoja KINESIOLOGOS', inexistente.kines === 0, inexistente.kines + ' lecturas');
const valida = midiendo(() => global.autorizar(T.csr, 'CSR'));
si('una sesión válida autoriza', valida.r.ok === true);
si('…leyendo KINESIOLOGOS como máximo UNA vez por llamada', valida.kines <= 1, valida.kines + ' lecturas');
si('…y pocas propiedades (la versión de esa persona, sin recorrerlas todas)', valida.props <= 2, valida.props + ' lecturas');
global.accesoClaveTemporal('CSR');
const porVersion = midiendo(() => global.autorizar(T.csr, 'CSR'));
si('una sesión cortada por cambio de clave se rechaza', porVersion.r.ok === false);
si('…sin leer la hoja (la versión se compara ANTES de preguntar por ACTIVO)', porVersion.kines === 0,
  porVersion.kines + ' lecturas');

/* ══ 8 · Una sesión de antes de esta versión no se corta por el despliegue ═ */
// El mundo de «antes de pegar el archivo»: una persona con su clave ya creada
// (sal y huella en las propiedades) pero SIN sello de versión, y una sesión
// abierta que tampoco lo trae. Se arma a mano, sin pasar por ninguna función
// que estrene versión: justo eso es lo que existe el día del despliegue.
S.DB.KINESIOLOGOS.push({ FIRMA: 'LEG', NOMBRE: 'Previa Al Despliegue', TRATAMIENTO: 'Klgo.', EMAIL: 'l@sim', ACTIVO: true });
const salLeg = 'sal-de-antes';
_props().setProperty('acc_sal_leg', salLeg);
_props().setProperty('acc_hash_leg', global.credHuellaDe(salLeg + '|acc|leg|clave-de-antes'));
const cache = global.CacheService.getScriptCache();
cache.put('accses_token-de-antes', JSON.stringify({ firma: 'LEG', nombre: 'Previa Al Despliegue', desde: 1 }), 21600);
si('una sesión abierta ANTES de esta versión (sin sello) sigue valiendo', sirve('token-de-antes', 'LEG'),
  'pegar el archivo sacaría a todo el equipo de la app');
si('…y esa persona puede entrar con la clave de antes', entrar('LEG', 'clave-de-antes') !== '');
si('…con una sesión nueva que también vale', sirve(entrar('LEG', 'clave-de-antes'), 'LEG'));
global.accesoClaveTemporal('LEG');
si('…y el primer corte real también alcanza a la sesión de antes', !sirve('token-de-antes', 'LEG'));
S.DB.KINESIOLOGOS.pop();

/* ══ 9 · La criptografía y el encendido no se tocaron ═════════════════════ */
T = montar();
const prop = k => _props().getProperty(k);
const sal = prop('acc_sal_dmv'), hash = prop('acc_hash_dmv');
si('la huella del turno sigue siendo la receta de siempre: sal|acc|usuario|clave',
  !!sal && hash === global.credHuellaDe(sal + '|acc|dmv|' + CLAVES.DMV), String(hash));
si('🔒 la clave no queda en claro en ninguna propiedad', (() => {
  for (const k of ['acc_sal_dmv', 'acc_hash_dmv', 'acc_hash_mfb', 'acc_hash_csr']) {
    if (String(prop(k) || '').indexOf(CLAVES.DMV) !== -1) return false;
  }
  return true;
})());
si('🔒 una huella del turno NO es la del espacio de coordinación (prefijo distinto)',
  hash !== global.credHuellaDe(sal + '|coord|dmv|' + CLAVES.DMV) && hash !== global.credHuellaDe(sal + '|dmv|' + CLAVES.DMV));
S.CONFIG.LOGIN_EQUIPO_ACTIVO = 'FALSE';
S.DB.KINESIOLOGOS.push({ FIRMA: 'ZZZ', NOMBRE: 'Sin Clave', TRATAMIENTO: 'Klgo.', EMAIL: 'z@sim', ACTIVO: true });
si('🔴 accesoEncender() se niega si un ACTIVO queda sin clave', global.accesoEncender() === false);
si('…y el candado quedó apagado', global.accesoActivo() === false);
persona('ZZZ').ACTIVO = false;
si('un kinesiólogo DESACTIVADO sin clave no impide encender', global.accesoEncender() === true);
si('…y quedó encendido', global.accesoActivo() === true);
S.DB.KINESIOLOGOS.pop();

/* ══ 10 · Con el candado APAGADO no cambia nada ═══════════════════════════ */
T = montar();
persona('DMV').ACTIVO = false;
global.accesoClaveTemporal('CSR');
S.CONFIG.LOGIN_EQUIPO_ACTIVO = 'FALSE';
const apagado = midiendo(() => JSON.stringify(global.autorizar(T.dmvTablet, 'DMV')));
si('apagado, con la persona desactivada y la sesión «cortada», autorizar() da LO MISMO que siempre',
  apagado.r === REFERENCIA_APAGADO, apagado.r);
si('apagado, no lee la hoja KINESIOLOGOS ni una propiedad', apagado.kines === 0 && apagado.props === 0,
  apagado.kines + ' hoja / ' + apagado.props + ' propiedades');
const escApagado = escribir(null);
si('apagado, la escritura pasa como antes, incluso sin token', escApagado.ok === true, JSON.stringify(escApagado));
si('apagado, accesoActivo() sigue en falso', global.accesoActivo() === false);
persona('DMV').ACTIVO = true;

/* ══ 11 · 🔴 Si Sheets no responde, NO se confunde con «sesión cortada» ═════ */
S.CONFIG.LOGIN_EQUIPO_ACTIVO = 'TRUE';
si('(control) los disparadores se leyeron de la pantalla: son al menos los dos de siempre',
  DISPARADORES.length >= 2, DISPARADORES.length + ' patrones');
si('(control) …y el rechazo de siempre, «Entra con tu clave», SÍ manda a la puerta',
  mandaALaPuerta('Entra con tu clave para registrar.'));
si('(control) …y «Tu sesión expiró» y «Sesión no válida» también',
  mandaALaPuerta('Tu sesión expiró. Vuelve a entrar con tu clave.') && mandaALaPuerta('Sesión no válida. Inicia sesión con Google.'));
si('(control) …mientras que un error cualquiera del servidor no',
  !mandaALaPuerta('Error en GET_BOOT: algo falló.'));
si('(control) leí los códigos de ERR del fuente, y NO_AUTORIZADO e INTERNO están',
  CODIGOS_ERR.includes('NO_AUTORIZADO') && CODIGOS_ERR.includes('INTERNO'), CODIGOS_ERR.join(','));

T = montar();
const verAntes = _props().getProperty('acc_ver_dmv');
HOJA_CAIDA = true;
const fotoCaida = tomaFoto();
const caida = global.autorizar(T.dmvTablet, 'DMV');
si('con la hoja caída, autorizar() rechaza (sin poder comprobar no se acepta)', caida.ok === false, JSON.stringify(caida));
si('🔴 …pero NO con NO_AUTORIZADO: la pantalla lo leería como sesión cortada',
  caida.codigo !== 'NO_AUTORIZADO' && CODIGOS_ERR.includes(caida.codigo), caida.codigo);
si('…con un texto honesto: dice que no se pudo COMPROBAR', /No se pudo comprobar/i.test(String(caida.error || '')), caida.error);
si('🔴 …y ese texto NO dispara la salida de la pantalla (ningún patrón de index.html lo reconoce)',
  !mandaALaPuerta(caida.error), caida.error);
si('…ni dice que la sesión expiró', !/expir/i.test(String(caida.error || '')), caida.error);
si('🔴 rechazar por no poder comprobar NO corta la versión de sus sesiones',
  _props().getProperty('acc_ver_dmv') === verAntes, 'una baja es un corte, un tropiezo de la hoja no');
si('🔴 …ni borra su token del caché (ni el del celular)',
  !!cache.get('accses_' + T.dmvTablet) && !!cache.get('accses_' + T.dmvCelular));
si('…y no deja escrito nada', tomaFoto() === fotoCaida);
const escCaida = escribir(T.dmvTablet);
si('por api(), la escritura también se rechaza con ese error distinto',
  escCaida.ok === false && escCaida.codigo !== 'NO_AUTORIZADO' && !mandaALaPuerta(escCaida.error), JSON.stringify(escCaida));
si('🔴 …y por api() tampoco guarda nada', tomaFoto() === fotoCaida);
const ajena = global.autorizar(T.mfb, 'MFB');
si('la hoja caída no distingue personas: la sesión de otro tampoco se acepta, y por la misma razón',
  ajena.ok === false && ajena.codigo !== 'NO_AUTORIZADO' && !mandaALaPuerta(ajena.error), JSON.stringify(ajena));
const cambioCaida = global.accesoCambiarClave({ token: T.dmvTablet, actual: CLAVES.DMV, nueva: 'clave-nueva-ocho' });
si('cambiar la clave con la hoja caída se rechaza…', cambioCaida.ok === false, JSON.stringify(cambioCaida));
si('🔴 …sin decir que la sesión expiró ni mandar a la puerta',
  cambioCaida.codigo !== 'NO_AUTORIZADO' && !mandaALaPuerta(cambioCaida.error) && !/expir/i.test(String(cambioCaida.error || '')),
  JSON.stringify(cambioCaida));
HOJA_CAIDA = false;
si('🔴 vuelve la hoja y la MISMA sesión sigue valiendo: no se había cortado', sirve(T.dmvTablet, 'DMV'));
si('…y su otra sesión, y las de los demás', sirve(T.dmvCelular, 'DMV') && sirve(T.mfb, 'MFB') && sirve(T.csr, 'CSR'));
si('…y puede escribir de nuevo con el mismo token', escribir(T.dmvTablet).ok === true);
si('…y el cambio de clave que no se hizo NO se hizo: la de antes sigue entrando', entrar('DMV') !== '');
// Lo que sí es una sesión cortada sigue diciendo lo de siempre: el mensaje nuevo no lo reemplaza.
global.accesoClaveTemporal('MFB');
const cortadaDeVerdad = global.autorizar(T.mfb, 'MFB');
si('(control) una sesión CORTADA de verdad sigue diciendo «Entra con tu clave» con NO_AUTORIZADO',
  cortadaDeVerdad.ok === false && cortadaDeVerdad.codigo === 'NO_AUTORIZADO' && /Entra con tu clave/.test(String(cortadaDeVerdad.error || '')),
  JSON.stringify(cortadaDeVerdad));
const inexistenteSimple = global.autorizar('token-que-no-existe', 'DMV');
si('(control) y un token que no existe también', inexistenteSimple.codigo === 'NO_AUTORIZADO' &&
  /Entra con tu clave/.test(String(inexistenteSimple.error || '')), JSON.stringify(inexistenteSimple));

/* ══ 12 · 🔴 Cerrar sesión quita el token SIEMPRE ═══════════════════════════ */
T = montar();
const salidasAntes = S.DB.AUDIT_LOG.filter(a => a.accion === 'ACCESO_SALIDA').length;
HOJA_CAIDA = true;
const salCaida = global.accesoSalir({ token: T.dmvTablet });
HOJA_CAIDA = false;
si('🔴 con la hoja caída, cerrar sesión responde ok y dice que cerró', salCaida.ok === true && salCaida.data && salCaida.data.cerrada === true,
  JSON.stringify(salCaida));
si('🔴 …y el token ya NO está en el caché (cerrar no puede depender de que la hoja responda)',
  !cache.get('accses_' + T.dmvTablet), 'la tablet del office quedaría abierta justo cuando la planilla anda mal');
si('…vuelta la hoja, esa sesión no sirve', !sirve(T.dmvTablet, 'DMV'));
si('…cerrar UNA sesión no cierra las otras: ni la del celular ni las de los demás',
  sirve(T.dmvCelular, 'DMV') && sirve(T.mfb, 'MFB') && sirve(T.csr, 'CSR'));
si('…y la salida quedó en la auditoría, firmada por su dueño',
  S.DB.AUDIT_LOG.filter(a => a.accion === 'ACCESO_SALIDA' && a.firma === 'DMV').length === salidasAntes + 1);
si('cerrar dos veces no es un error, y la segunda avisa que no había nada',
  (r => r.ok === true && r.data.cerrada === false)(global.accesoSalir({ token: T.dmvTablet })));
si('cerrar con un token que nunca existió tampoco',
  (r => r.ok === true && r.data.cerrada === false)(global.accesoSalir({ token: 'nunca-existio' })));
si('…ni sin token', (r => r.ok === true && r.data.cerrada === false)(global.accesoSalir({})));
si('…y ninguna de esas tres ensució la auditoría',
  S.DB.AUDIT_LOG.filter(a => a.accion === 'ACCESO_SALIDA').length === salidasAntes + 1);

T = montar();
global.accesoClaveTemporal('DMV');          // sus sesiones quedan cortadas por versión
const salCortada = global.accesoSalir({ token: T.dmvTablet });
si('cerrar una sesión que ya estaba cortada por versión no es un error', salCortada.ok === true, JSON.stringify(salCortada));
si('…y no deja el token de esa sesión muerta en el caché', !cache.get('accses_' + T.dmvTablet));
si('…sin tocar a las demás personas', sirve(T.mfb, 'MFB') && sirve(T.csr, 'CSR'));
persona('CSR').ACTIVO = false;
const salBaja = global.accesoSalir({ token: T.csr });
persona('CSR').ACTIVO = true;
si('cerrar la sesión de alguien dado de baja tampoco depende de que siga activo', salBaja.ok === true && !cache.get('accses_' + T.csr),
  JSON.stringify(salBaja));

/* ══ 13 · 🔴 La renovación NO re-escribe un valor que pudo cambiar ══════════ */
// (a) Una llamada lee la sesión y espera la hoja; mientras tanto el dueño CIERRA la sesión.
T = montar();
const tokVuelo = T.dmvCelular;
EN_LECTURA = () => global.accesoSalir({ token: tokVuelo });
global.autorizar(tokVuelo, 'DMV');
EN_LECTURA = null;
si('🔴 una sesión cerrada mientras otra llamada suya leía la hoja NO resucita (la renovación no re-escribe lo viejo)',
  !cache.get('accses_' + tokVuelo), 'cerrar sesión no habría cerrado nada');
si('…y no vuelve a servir', !sirve(tokVuelo, 'DMV'));
si('…el cierre no tocó a las otras', sirve(T.dmvTablet, 'DMV') && sirve(T.mfb, 'MFB'));

// (b) Una llamada en vuelo del MISMO token mientras esa sesión cambia su clave: la renovación
//     no puede pisar el sello nuevo con el viejo, o quien eligió su clave sale de la app.
T = montar();
EN_LECTURA = () => {
  const r = global.accesoCambiarClave({ token: T.dmvTablet, actual: CLAVES.DMV, nueva: 'cambio-en-vuelo-9' });
  si('(control) el cambio de clave que ocurre en medio funciona', r.ok === true, JSON.stringify(r));
};
global.autorizar(T.dmvTablet, 'DMV');
EN_LECTURA = null;
si('🔴 la sesión de quien cambió su clave SIGUE viva (el sello nuevo no lo pisa el viejo)',
  sirve(T.dmvTablet, 'DMV'), 'saldría de la app justo después de elegir su clave');
si('…y su otra sesión murió, como en cualquier cambio de clave', !sirve(T.dmvCelular, 'DMV'));

// El «que sobreviva» solo re-sella la sesión de ESA persona: el sello de otra no se toca.
T = montar();
global._accRevocarSesiones('MFB', T.dmvTablet);       // se pide conservar un token que NO es de MFB
si('🔴 conservar un token ajeno no lo re-sella con la versión de otra persona (la de DMV sigue valiendo)',
  sirve(T.dmvTablet, 'DMV'));
si('…y las sesiones de MFB sí quedaron cortadas', !sirve(T.mfb, 'MFB'));

// (c) La llamada ve la versión VIEJA justo cuando se cambió la clave: aunque ella misma
//     se rechace, NO borra el token de la sesión que sobrevive (borrar con una vista vieja
//     es la misma carrera que re-escribir con una vista vieja).
T = montar();
EN_VERSION = () => global.accesoCambiarClave({ token: T.dmvTablet, actual: CLAVES.DMV, nueva: 'cambio-en-vuelo-9' });
global.autorizar(T.dmvTablet, 'DMV');
EN_VERSION = null;
si('🔴 ver la versión vieja justo cuando se cambió la clave no BORRA la sesión que sobrevive',
  sirve(T.dmvTablet, 'DMV'), 'una vista vieja no puede decidir cerrar una sesión que ya está resellada');

// (d) El orden: la hoja ANTES de la última lectura del token, y esa lectura pegada a su renovación.
T = montar();
TRAZA.length = 0; TRAZANDO = true;
const valida2 = global.autorizar(T.csr, 'CSR');
TRAZANDO = false;
const iGet = TRAZA.lastIndexOf('get'), iPut = TRAZA.lastIndexOf('put'), iHoja = TRAZA.lastIndexOf('hoja');
const orden = TRAZA.join(' > ');
si('una sesión válida autoriza y se renueva UNA sola vez', valida2.ok === true && TRAZA.filter(x => x === 'put').length === 1, orden);
si('🔴 la lectura de la hoja va ANTES de la última lectura del token', iHoja >= 0 && iHoja < iGet, orden);
si('🔴 …y la renovación va PEGADA a esa lectura: entre las dos no hay hoja ni propiedades', iPut === iGet + 1, orden);
si('nunca se borra el token de una sesión válida', !TRAZA.includes('remove'), orden);

console.log(fails.length ? '\n❌ ' + fails.length + ' FALLOS' : '\n✅ TODO OK');
process.exit(fails.length ? 1 : 0);
