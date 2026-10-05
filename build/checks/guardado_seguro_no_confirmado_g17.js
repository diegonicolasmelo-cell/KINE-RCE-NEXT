// guardado_seguro_no_confirmado_g17.js — LA PANTALLA SABE LO QUE SABE (tanda 2 del guardado seguro, G16/G17).
//
// 🔴 DE DÓNDE SALE. Hoy la pantalla trata igual dos cosas que no son iguales: que el servidor CONTESTE «no» (la cama
// cambió de paciente, el dato no valida) y que NO CONTESTE (la red se cayó, el celular pasó por un túnel, Apps Script
// tardó más de la cuenta). Las dos llegan a quien llama como un `Error` con un texto, y la pantalla decide por el
// TEXTO: «sin conexión» y «NO se guardó» le dicen a la persona una certeza que no tiene —el primer intento pudo haber
// aterrizado—. Esa certeza falsa es lo que hace que se guarde dos veces, o que se dé por perdido algo que sí está.
//
// Esta guardia nace en el paso 12 con la parte del EMBUDO (el único `api()` por el que sale toda llamada); los pasos
// 13 a 15 le suman las pantallas (guardar(), el episodio capturado en cada puerta, el ingreso con PATIENT_ID acuñado).
// El paso 13 trae la sección F: guardar(). El paso 14 trae la G: el episodio capturado en cada puerta.
//
//   A · EL MISMO CONTRATO POR LOS DOS CAMINOS. `_apiGas` (google.script.run, dentro del iframe) y `_apiHttp` (fetch
//       `text/plain`, la app instalada) entregan lo mismo: resuelven con los datos, o rechazan con un `Error` que lleva
//       `e.codigo` si el servidor RESPONDIÓ (VALIDACION, CONFLICTO, LOCK_TIMEOUT…) o `e.sinRespuesta === true` si no
//       (red caída, withFailureHandler, algo que no es JSON). Una respuesta `ok:false` es SIEMPRE un rechazo
//       definitivo; `sinRespuesta` es SIEMPRE ambiguo. La tabla es una sola y corre por los dos caminos: si un camino
//       cambia, el otro lo nota.
//   B · EL OP_ID. El embudo le pone a cada ESCRITURA (la lista `_ACC_ESCRITURA`) un `datos.OP_ID` por INTENCIÓN: el
//       mismo contenido sin respuesta reutiliza el mismo (doble clic, reintento, recarga de la página); contenido
//       distinto, uno nuevo; se suelta solo cuando el servidor RESPONDE. Vive en memoria y en localStorage 'rce_ops'
//       (vence a las 6 h), siempre en try/catch: con el almacenamiento caído la pantalla funciona igual.
//       🔒 Lo que queda en localStorage es una huella y un id, nunca el contenido: el paquete lleva texto clínico.
//
//   F · guardar(): UNA INTENCIÓN, VARIOS INTENTOS, Y LA PANTALLA DICE LO QUE SABE (paso 13). A los 45 s sin respuesta la
//       franja pasa a «No confirmado» (ÁMBAR) con el texto conservado, y NUNCA dice «Guardado» ni «No se guardó» (no lo
//       sabe); la llamada original sigue viva: un éxito tardío corrige a «Guardado», un rechazo tardío a «No se guardó».
//       Los reintentos automáticos (3, 10 y 30 s) reenvían la MISMA foto con el MISMO OP_ID. Doble clic y Enter producen
//       UNA llamada. Una respuesta repetida (`data.repetida`) luce igual que una limpia. Lo escrito mientras la llamada
//       volaba no se da por guardado ni se pierde. Un guardado con `advertencias` dice «Guardado con aviso».
//   G · EL EPISODIO SE CAPTURA AL ABRIR, EN CADA PUERTA (paso 14). El servidor ya compara EPISODIO_ABIERTO con quien ocupa
//       la cama (pasos 4 a 8), pero solo si la pantalla lo MANDA. El valor es el PATIENT_ID de la tarjeta TAL COMO ESTABA
//       al abrir el diálogo, y no se relee de `DB` al enviar: `DB` se refresca solo por sondeo (`recargarSilencioso`), y
//       releerlo al enviar mandaría siempre al ocupante NUEVO, o sea vaciaría el candado. Cada puerta se prueba igual: se
//       abre el diálogo para P, un sondeo REAL entrega la cama ya ocupada por Q (control: `DB` dice Q), y lo que sale al
//       servidor tiene que seguir diciendo P. También con la cama de destino libre (viaja vacío, no se omite), y con el
//       rechazo del servidor (CONFLICTO o «cambió de paciente») a la vista EN ROJO y no como un aviso cualquiera.
//
// 🪤 RELOJ CONGELADO. El vencimiento de 6 h depende de la hora: `Date` se congela en la página en un día inventado
// (lunes 10-ago-2026, 11:00; ni Fiestas Patrias, ni cambio de turno, ni cierre de año) y se ADELANTA a mano con
// `window.__t`. No se espera nada. La sección F necesita además temporizadores falsos (45 s no se esperan): usa
// `page.clock` de Playwright, que dobla Date y setTimeout juntos, y avanza el reloj a mano.
//
// Uso: node build/checks/guardado_seguro_no_confirmado_g17.js (requiere playwright-core)
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

const IDX = path.resolve(__dirname, '..', '..', 'v2', 'index.html');
const T0 = new Date('2026-08-10T11:00:00').getTime();
const HORA = 3600 * 1000;
const EXEC_FALSO = 'https://ejemplo.invalid/macros/s/PRUEBA/exec';   // nunca una dirección real: ver CLAUDE.md
const OP_RE = /^op_[A-Za-z0-9_-]{5,61}$/;                           // 'op_' + [A-Za-z0-9_-]{8,64} en total
const SENTINELA = 'SENTINELA-TEXTO-CLINICO-INVENTADO';

const fails = [];
const eq = (l, g, w) => {
  const ok = JSON.stringify(g) === JSON.stringify(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g) + (ok ? '' : ' (esperado ' + JSON.stringify(w) + ')'));
  if (!ok) fails.push(l);
};
// 🪤 Una guardia de «mismo OP_ID» que compara `undefined` con `undefined` da verde sin que exista ningún OP_ID: por eso
// «mismo» y «distinto» exigen SIEMPRE que cada id sea un OP_ID válido (nacieron rojas contra una pantalla sin embudo).
const valido = x => typeof x === 'string' && OP_RE.test(x) && x.length >= 8 && x.length <= 64;
const mismos = ids => ids.length > 0 && ids.every(valido) && new Set(ids).size === 1;
const distintos = (ids, n) => ids.every(valido) && new Set(ids).size === n;
const si = (l, c, d) => { console.log((c ? '✅' : '❌') + ' ' + l + (!c && d !== undefined ? ' — ' + d : '')); if (!c) fails.push(l); };

const CAMAS = [];
for (let i = 1; i <= 6; i++) CAMAS.push({ ID_CAMA: String(i), OCUPADA: i <= 4, NOMBRE: 'Paciente ' + i, EDAD: 60 + i, SEXO: 'F',
  DIAGNOSTICO: 'Dx', PATIENT_ID: 'p' + i, COD_PACIENTE: 'C' + i, VIA_AEREA: 'TOT', SOPORTE: 'VM', MODO: 'ACVC',
  FECHA_INGRESO: '2026-08-05', FECHA_INICIO_SOPORTE: '2026-08-05', FECHA_INICIO_VA: '2026-08-05' });
const BOOT = { ahora: '2026-08-10 11:00:00', yo: { email: '', firma: 'DMV', dev: false }, config: { NUM_CAMAS: 6, BANNERS: {} },
  fases: ['Weaning'], camas: CAMAS, evos: [], asignacion: { team: [], assign: {} } };

/* El «servidor» y el reloj viven en la propia página. Cada llamada que sale queda anotada (con una copia JSON de lo que
   viajó: lo que de verdad llega al servidor es una copia, no el objeto de quien llamó) y la respuesta sale de la cola
   `window.__srv.reglas[ACCION]` (una por llamada) o, si no hay, del defecto: los datos de arranque o un ok vacío.
   Tipos de respuesta: ok · rechazo · falla (el servidor no contestó) · nulo (contestó vacío) · html (solo HTTP) · colgado. */
const PRELUDIO = ({ modo, t0, boot, exec, almacen, sinUUID, relojPW }) => {
  // relojPW: el reloj lo maneja Playwright (page.clock: Date Y temporizadores falsos). Sin él (secciones A a E) solo se dobla Date.
  if (!relojPW) {
    const Real = Date;
    function Falso(...a) { return a.length ? new Real(...a) : new Real(window.__t); }
    Falso.now = () => window.__t; Falso.parse = Real.parse; Falso.UTC = Real.UTC; Falso.prototype = Real.prototype;
    if (window.__t === undefined) window.__t = t0;
    window.Date = Falso;
  }

  if (almacen === 'metodos') {            // el almacenamiento «existe» pero cada uso lanza (cuota llena, sitio bloqueado)
    const boom = function () { throw new Error('SecurityError: almacenamiento no disponible'); };
    Storage.prototype.getItem = boom; Storage.prototype.setItem = boom; Storage.prototype.removeItem = boom;
  } else if (almacen === 'acceso') {      // el propio acceso a `localStorage` lanza (ventana privada de algunos navegadores)
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('denegado', 'SecurityError'); } });
  } else if (modo === 'http') {
    try { localStorage.setItem('rce_exec_url', exec); } catch (e) {}
  }
  if (sinUUID) { try { crypto.randomUUID = undefined; } catch (e) {} }

  const DEFECTO = { GET_BOOT: boot, GET_ARCHIVADOS: [], ACCESO_ESTADO: { activo: false, dentro: false } };
  window.__srv = { llamadas: [], cuerpos: [], reglas: {}, pendientes: [] };
  function decidir(accion, datos, token) {
    window.__srv.llamadas.push({ accion: accion, datos: JSON.parse(JSON.stringify(datos === undefined ? null : datos)), token: token || null });
    const cola = window.__srv.reglas[accion];
    if (cola && cola.length) return cola.shift();
    return { tipo: 'ok', data: DEFECTO[accion] !== undefined ? DEFECTO[accion] : null };
  }
  window.__srv.contestar = (accion, n, x) => {
    const q = window.__srv.pendientes.find(y => y.accion === accion && y.n === n);
    if (!q) return false;
    q.responder(x); return true;
  };
  if (modo === 'gas') {
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler(fail) { return {
      api(accion, datos, token) {
        const r = decidir(accion, datos, token);
        const responder = x => {
          if (x.tipo === 'ok') ok({ ok: true, data: x.data });
          else if (x.tipo === 'rechazo') ok(x.sinCodigo ? { ok: false, error: x.error } : { ok: false, error: x.error, codigo: x.codigo });
          else if (x.tipo === 'falla') fail({ message: x.mensaje || 'boom' });
          else if (x.tipo === 'nulo') ok(null);
        };
        /* colgado: nadie contesta… hasta que la guardia lo decida (`contestar`): así se prueba la respuesta TARDÍA de una
           llamada que parecía perdida. `n` = el orden de esa llamada entre las de su misma acción. */
        if (r.tipo === 'colgado') {
          const n = window.__srv.llamadas.filter(q => q.accion === accion).length - 1;
          window.__srv.pendientes.push({ accion, n, responder });
          return;
        }
        setTimeout(() => responder(r), r.retraso || 0);
      }
    }; } }; } } } };
  } else {
    window.fetch = function (url, opc) {
      const o = opc || {};
      let cuerpo = null; try { cuerpo = JSON.parse(o.body); } catch (e) { cuerpo = null; }
      window.__srv.cuerpos.push({ url: String(url), metodo: o.method || 'GET', cabeceras: Object.assign({}, o.headers || {}) });
      const r = decidir(cuerpo && cuerpo.accion, cuerpo && cuerpo.datos, cuerpo && cuerpo.token);
      if (r.tipo === 'colgado') return new Promise(() => {});
      if (r.tipo === 'falla') return Promise.reject(new TypeError('Failed to fetch'));
      const texto = r.tipo === 'ok' ? JSON.stringify({ ok: true, data: r.data })
        : r.tipo === 'rechazo' ? JSON.stringify(r.sinCodigo ? { ok: false, error: r.error } : { ok: false, error: r.error, codigo: r.codigo })
        : r.tipo === 'nulo' ? 'null' : '<!doctype html><title>Google</title><p>Inicia sesión</p>';
      return new Promise(res => setTimeout(() => res({ ok: true, status: 200, text: () => Promise.resolve(texto) }), r.retraso || 0));
    };
  }
};

(async () => {
  const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const errores = [];

  // Una página nueva por escenario, en un contexto propio: su localStorage no se mezcla con el de otro.
  async function abrir(opc) {
    const o = Object.assign({ modo: 'gas', almacen: null, sinUUID: false, relojPW: false }, opc || {});
    const ctx = await navegador.newContext({ viewport: { width: 1100, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errores.push('[' + o.modo + (o.almacen ? '/' + o.almacen : '') + '] ' + e.message));
    if (o.relojPW) await p.clock.install({ time: T0 });     // Date y temporizadores falsos desde ANTES de cargar la página
    await p.addInitScript(PRELUDIO, { modo: o.modo, t0: T0, boot: BOOT, exec: EXEC_FALSO, almacen: o.almacen, sinUUID: o.sinUUID, relojPW: o.relojPW });
    await p.goto('file://' + IDX);
    if (o.relojPW) await p.clock.runFor(1500); else await p.waitForTimeout(700);
    await p.evaluate(() => { window.__srv.llamadas = []; window.__srv.cuerpos = []; });
    p.cerrar = () => ctx.close();
    return p;
  }
  // Una llamada que se espera a que termine: resume lo que resolvió o cómo rechazó.
  const llamar = (p, accion, datos) => p.evaluate(async ([a, d]) => {
    try { return { resuelve: true, valor: await api(a, d) }; }
    catch (e) { return { resuelve: false, esError: e instanceof Error, mensaje: e && e.message, codigo: e && e.codigo, sinRespuesta: !!(e && e.sinRespuesta) }; }
  }, [accion, datos]);
  // Una llamada que se lanza y se deja volando (el servidor no contesta): solo importa lo que salió.
  const lanzar = (p, accion, datos) => p.evaluate(([a, d]) => { api(a, d).catch(() => {}); return null; }, [accion, datos]).then(() => p.waitForTimeout(40));
  const regla = (p, accion, ...rs) => p.evaluate(([a, r]) => { window.__srv.reglas[a] = r.slice(); }, [accion, rs]);
  const salidas = (p, accion) => p.evaluate(a => window.__srv.llamadas.filter(x => x.accion === a), accion);
  const opIds = (ll) => ll.map(x => x.datos && x.datos.OP_ID);
  const reloj = (p, ms) => p.evaluate(m => { window.__t += m; }, ms);

  /* ══ A · EL MISMO CONTRATO POR LOS DOS CAMINOS ═════════════════════════ */
  console.log('A · El contrato del embudo: los dos caminos entregan lo mismo');
  // Una acción de LECTURA: aquí no interesa el OP_ID sino lo que llega a quien llama.
  const CASOS = [
    { n: 'respuesta ok con datos', r: { tipo: 'ok', data: { x: 1 } } },
    { n: 'respuesta ok vacía', r: { tipo: 'ok', data: null } },
    { n: 'rechazo del servidor con código (CONFLICTO)', r: { tipo: 'rechazo', error: 'La cama ya fue ocupada.', codigo: 'CONFLICTO' } },
    { n: 'rechazo del servidor con código (VALIDACION)', r: { tipo: 'rechazo', error: 'Falta la firma.', codigo: 'VALIDACION' } },
    { n: 'rechazo LOCK_TIMEOUT (no se ejecutó)', r: { tipo: 'rechazo', error: 'Sistema ocupado. Reintenta.', codigo: 'LOCK_TIMEOUT' } },
    { n: 'rechazo del servidor sin código', r: { tipo: 'rechazo', error: 'Algo falló.', sinCodigo: true } },
    { n: 'el servidor no contestó (red caída / withFailureHandler)', r: { tipo: 'falla' } },
    { n: 'el servidor contestó vacío (nada que leer)', r: { tipo: 'nulo' } },
  ];
  const porCamino = {};
  for (const modo of ['gas', 'http']) {
    const p = await abrir({ modo });
    porCamino[modo] = [];
    for (const c of CASOS) {
      await regla(p, 'GET_CONTRATO', c.r);
      porCamino[modo].push(await llamar(p, 'GET_CONTRATO', {}));
    }
    if (modo === 'http') {
      await regla(p, 'GET_CONTRATO', { tipo: 'html' });
      porCamino.html = await llamar(p, 'GET_CONTRATO', {});
    }
    await p.cerrar();
  }
  CASOS.forEach((c, i) => {
    ['gas', 'http'].forEach(modo => {
      const r = porCamino[modo][i];
      const t = c.n + ' · ' + modo;
      if (c.r.tipo === 'ok') {
        eq('★ ' + t + ' → resuelve con los datos', [r.resuelve, r.valor], [true, c.r.data]);
      } else if (c.r.tipo === 'rechazo') {
        const cod = c.r.sinCodigo ? 'INTERNO' : c.r.codigo;
        eq('★ ' + t + ' → rechaza con Error, el texto del servidor, e.codigo y SIN sinRespuesta',
          [r.resuelve, r.esError, r.mensaje, r.codigo, r.sinRespuesta], [false, true, c.r.error, cod, false]);
      } else {
        eq('★ ' + t + ' → rechaza con Error, e.sinRespuesta=true y SIN código (no sabemos qué pasó)',
          [r.resuelve, r.esError, r.codigo === undefined, r.sinRespuesta], [false, true, true, true]);
      }
    });
    // La misma tabla por los dos caminos: lo que le llega a quien llama es igual (salvo el texto de una caída, que cada
    // camino conserva como ya lo hacía: 'offline' del fetch y el mensaje del withFailureHandler).
    const norm = r => ({ resuelve: r.resuelve, valor: r.valor, codigo: r.codigo, sinRespuesta: r.sinRespuesta, msg: (c.r.tipo === 'rechazo') ? r.mensaje : null });
    eq('   …y los dos caminos coinciden: ' + c.n, norm(porCamino.gas[i]), norm(porCamino.http[i]));
  });
  eq('★ HTTP: una página que NO es JSON (no publicada, pide iniciar sesión) es AMBIGUA: sinRespuesta=true',
    [porCamino.html.resuelve, porCamino.html.sinRespuesta, porCamino.html.codigo === undefined], [false, true, true]);
  si('   …y conserva el mensaje que ya existía para ese caso', /no es JSON/.test(porCamino.html.mensaje || ''), porCamino.html.mensaje);
  eq('   …y la caída del fetch conserva su texto de siempre («offline»: lo reconocen otras partes de la pantalla)',
    porCamino.http[CASOS.findIndex(c => c.r.tipo === 'falla')].mensaje, 'offline');

  /* ══ B · EL OP_ID POR CONTENIDO ════════════════════════════════════════ */
  console.log('\nB · El OP_ID: uno por intención, por contenido');
  {
    const p = await abrir({ modo: 'gas' });
    const lista = await p.evaluate(() => (typeof _ACC_ESCRITURA === 'undefined') ? null : [..._ACC_ESCRITURA]);
    si('★ index.html declara la lista _ACC_ESCRITURA (las acciones que escriben y reciben OP_ID)', Array.isArray(lista) && lista.length > 15, lista && lista.length);
    const escritura = 'PEND_ABRIR';

    // B1 · una escritura sale con OP_ID válido y el resto del paquete intacto
    const paquete = { idCama: '2', texto: 'revisar sonda', firma: 'DMV', EPISODIO_ABIERTO: 'p2', anidado: { b: [1, 2], a: 'x' } };
    // El servidor calla las tres primeras salidas (la original, la repetida y la reordenada): «sin respuesta».
    await regla(p, escritura, { tipo: 'colgado' }, { tipo: 'colgado' }, { tipo: 'colgado' });
    await lanzar(p, escritura, paquete);
    let s = await salidas(p, escritura);
    si('★ una escritura sale con datos.OP_ID de la forma «op_…» (8 a 64 caracteres de [A-Za-z0-9_-])',
      s.length === 1 && typeof (s[0].datos || {}).OP_ID === 'string' && OP_RE.test(s[0].datos.OP_ID) && s[0].datos.OP_ID.length >= 8 && s[0].datos.OP_ID.length <= 64,
      JSON.stringify(opIds(s)));
    const sinOp = o => { const c = Object.assign({}, o); delete c.OP_ID; return c; };
    eq('   …y el resto del paquete llega intacto (el embudo solo SUMA el OP_ID)', s[0] ? sinOp(s[0].datos) : null, paquete);
    const id1 = s[0] && s[0].datos.OP_ID;

    // B2 · no se le muta el paquete a quien llama
    const mut = await p.evaluate(async (a) => {
      const d = { idCama: '3', texto: 'x' };
      api(a, d).catch(() => {});
      return Object.keys(d);
    }, escritura);
    eq('★ el objeto de quien llama NO se muta (no queda un OP_ID pegado a su paquete)', mut, ['idCama', 'texto']);

    // B3 · el mismo contenido sin respuesta reutiliza el OP_ID (doble clic, reintento): aunque cambie el orden de las claves
    await lanzar(p, escritura, paquete);
    await lanzar(p, escritura, { anidado: { a: 'x', b: [1, 2] }, EPISODIO_ABIERTO: 'p2', firma: 'DMV', texto: 'revisar sonda', idCama: '2' });
    s = await salidas(p, escritura).then(l => l.filter(x => x.datos.idCama === '2'));
    eq('★ el MISMO contenido sin respuesta reutiliza el MISMO OP_ID (también con las claves en otro orden)',
      mismos(opIds(s)), true);
    eq('   …en las tres salidas (original, repetida y reordenada)', s.length, 3);

    // B4 · contenido distinto = intención nueva
    await lanzar(p, escritura, Object.assign({}, paquete, { texto: 'revisar sonda y fijar' }));
    s = await salidas(p, escritura).then(l => l.filter(x => x.datos.idCama === '2'));
    eq('★ contenido DISTINTO recibe un OP_ID NUEVO', distintos(opIds(s), 2), true);
    // …y no se confunde con la misma carga de OTRA acción
    await lanzar(p, 'PEND_CERRAR', paquete);
    const otra = await salidas(p, 'PEND_CERRAR');
    si('   …y la misma carga en OTRA acción también es otra intención (otro OP_ID)', otra.length === 1 && valido(otra[0].datos.OP_ID) && otra[0].datos.OP_ID !== id1, JSON.stringify(opIds(otra)));

    // B5 · una acción de lectura, o una marcada sin sello, no lleva OP_ID
    await lanzar(p, 'GET_NOTIFICACIONES', { x: 1 });
    await lanzar(p, 'GENERAR_REM', { anio: '2026', mes: '07' });
    await lanzar(p, 'SET_BANNER', { tab: 'G', valor: 'hola' });
    const sinMarca = []
      .concat(await salidas(p, 'GET_NOTIFICACIONES'), await salidas(p, 'GENERAR_REM'), await salidas(p, 'SET_BANNER'));
    eq('★ una lectura y las acciones «sin sello» (idempotentes) salen SIN OP_ID', sinMarca.map(x => x.datos && 'OP_ID' in x.datos), [false, false, false]);

    // B6 · un OP_ID que ya trae el paquete (con forma válida) se respeta; uno inválido se reemplaza
    await lanzar(p, escritura, { idCama: '4', texto: 'a', OP_ID: 'op_PROPIO_del_llamador_01' });
    await lanzar(p, escritura, { idCama: '4', texto: 'b', OP_ID: 'esto no vale | nada' });
    s = await salidas(p, escritura).then(l => l.filter(x => x.datos.idCama === '4'));
    eq('   un OP_ID válido que trae el paquete se respeta tal cual', s[0] && s[0].datos.OP_ID, 'op_PROPIO_del_llamador_01');
    si('   uno inválido (con espacios y «|») se reemplaza por uno acuñado', s[1] && OP_RE.test(s[1].datos.OP_ID), s[1] && s[1].datos.OP_ID);

    // B7 · TODAS las acciones de la lista reciben OP_ID, y solo ellas
    if (lista) {
      await p.evaluate(() => { window.__srv.llamadas = []; });
      for (const a of lista) await lanzar(p, a, { prueba: a });
      const todas = await p.evaluate(() => window.__srv.llamadas.filter(x => x.datos && x.datos.prueba));
      const sin = lista.filter(a => { const x = todas.find(y => y.accion === a); return !x || !OP_RE.test(x.datos.OP_ID || ''); });
      eq('★ cada acción de _ACC_ESCRITURA sale con OP_ID válido', sin, []);
      eq('   …y no hay dos acciones con el mismo OP_ID', new Set(todas.map(x => x.datos.OP_ID)).size, lista.length);
    }
    await p.cerrar();
  }

  /* ══ C · CUÁNDO SE SUELTA EL OP_ID ═════════════════════════════════════ */
  console.log('\nC · El OP_ID se suelta solo cuando el servidor RESPONDE');
  {
    const p = await abrir({ modo: 'gas' });
    const A = 'PEND_ABRIR';
    const pq = n => ({ idCama: '2', texto: 'intención ' + n, EPISODIO_ABIERTO: 'p2' });
    const ids = async (n) => opIds((await salidas(p, A)).filter(x => x.datos.texto === 'intención ' + n));

    // ok → intención cumplida: el mismo contenido de nuevo es una intención NUEVA
    await regla(p, A, { tipo: 'ok', data: { id: 'x' } });
    await llamar(p, A, pq(1));
    await llamar(p, A, pq(1));
    let v = await ids(1);
    si('★ tras una respuesta ok, el MISMO contenido es una intención nueva (OP_ID distinto)', v.length === 2 && distintos(v, 2), JSON.stringify(v));

    // rechazo definitivo → el servidor contestó: también se suelta
    await regla(p, A, { tipo: 'rechazo', error: 'La cama cambió de paciente.', codigo: 'VALIDACION' });
    await llamar(p, A, pq(2));
    await llamar(p, A, pq(2));
    v = await ids(2);
    si('★ tras un rechazo definitivo (VALIDACION) se suelta: reenviar lo mismo es otra intención', v.length === 2 && distintos(v, 2), JSON.stringify(v));
    await regla(p, A, { tipo: 'rechazo', error: 'La cama ya fue ocupada.', codigo: 'CONFLICTO' });
    await llamar(p, A, pq(3));
    await llamar(p, A, pq(3));
    v = await ids(3);
    si('   …y tras un CONFLICTO también', v.length === 2 && distintos(v, 2), JSON.stringify(v));

    // LOCK_TIMEOUT = «no se ejecutó»: el reintento va con el MISMO OP_ID
    await regla(p, A, { tipo: 'rechazo', error: 'Sistema ocupado (otra escritura en curso). Reintenta.', codigo: 'LOCK_TIMEOUT' });
    await llamar(p, A, pq(4));
    await llamar(p, A, pq(4));
    v = await ids(4);
    eq('★ tras LOCK_TIMEOUT («no se ejecutó») el reintento lleva el MISMO OP_ID', [v.length, mismos(v)], [2, true]);

    // sin respuesta = ambiguo: el reintento lleva el MISMO OP_ID (si la primera aterrizó, el servidor lo reconoce)
    await regla(p, A, { tipo: 'falla' }, { tipo: 'falla' }, { tipo: 'ok', data: { id: 'y' } });
    const r1 = await llamar(p, A, pq(5));
    await llamar(p, A, pq(5));
    await llamar(p, A, pq(5));
    v = await ids(5);
    eq('★ tras una llamada SIN respuesta (dos veces) el reintento lleva el MISMO OP_ID', [r1.sinRespuesta, v.length, mismos(v)], [true, 3, true]);
    // …y recién cuando el servidor contesta (la tercera) se suelta: la cuarta es una intención nueva
    await llamar(p, A, pq(5));
    v = await ids(5);
    eq('   …y cuando por fin contesta ok se suelta (la siguiente es intención nueva)', [v.length, distintos(v, 2), v[2] === v[3]], [4, true, false]);

    // un éxito de una intención no suelta la de OTRA
    await regla(p, A, { tipo: 'falla' });
    await llamar(p, A, pq(6));
    await regla(p, A, { tipo: 'ok', data: { id: 'z' } });
    await llamar(p, A, pq(7));
    await llamar(p, A, pq(6));
    v = await ids(6);
    eq('   el éxito de OTRA intención no suelta ésta (la 6 sigue con su OP_ID)', [v.length, mismos(v)], [2, true]);

    // una respuesta TARDÍA de un intento viejo no se lleva la intención nueva del mismo contenido
    // (1: sale y tarda · 2: mismo contenido, contesta rápido y suelta · 3: intención nueva, el servidor calla ·
    //  llega la respuesta tardía de la 1 · 4: el mismo contenido sigue siendo la intención 3)
    await regla(p, A, { tipo: 'ok', data: { id: 'tarde' }, retraso: 350 });
    await lanzar(p, A, pq(9));
    await regla(p, A, { tipo: 'ok', data: { id: 'rapida' } });
    await llamar(p, A, pq(9));
    await regla(p, A, { tipo: 'colgado' });
    await lanzar(p, A, pq(9));
    await p.waitForTimeout(500);
    await regla(p, A, { tipo: 'colgado' });
    await lanzar(p, A, pq(9));
    v = await ids(9);
    eq('★ la respuesta TARDÍA de un intento viejo no suelta la intención NUEVA del mismo contenido (se compara el id)',
      [v.length, v[0] === v[1], v[2] !== v[0], v[3] === v[2], v.every(valido)], [4, true, true, true, true]);

    // el doble clic: dos salidas con el servidor callado llevan el mismo OP_ID (el servidor las colapsa con el sello)
    await regla(p, A, { tipo: 'colgado' }, { tipo: 'colgado' });
    await lanzar(p, A, pq(8));
    await lanzar(p, A, pq(8));
    v = await ids(8);
    eq('   el doble clic con el servidor callado: las dos salidas llevan el mismo OP_ID', [v.length, mismos(v)], [2, true]);
    await p.cerrar();
  }

  /* ══ D · LA MEMORIA: RECARGA, VENCIMIENTO, PRIVACIDAD, ALMACENAMIENTO CAÍDO ═ */
  console.log('\nD · La memoria del embudo: recarga, 6 horas, privacidad, almacenamiento caído');
  {
    const p = await abrir({ modo: 'gas' });
    const A = 'ANEXAR_EVENTO';
    const pq = { idCama: '2', tipo: 'otro', texto: SENTINELA, rutPrueba: '11111111-1', EPISODIO_ABIERTO: 'p2' };
    await regla(p, A, { tipo: 'falla' }, { tipo: 'falla' }, { tipo: 'falla' });
    await llamar(p, A, pq);
    const antes = (await salidas(p, A))[0];
    const guardado = await p.evaluate(() => { try { return localStorage.getItem('rce_ops'); } catch (e) { return 'ERR'; } });
    si('★ el mapa queda en localStorage bajo «rce_ops»', typeof guardado === 'string' && guardado.length > 2 && guardado !== 'ERR', guardado);
    si('★ 🔒 y NO lleva el contenido: ni el texto clínico ni el RUT del paquete (solo huella y OP_ID)',
      typeof guardado === 'string' && guardado.indexOf(SENTINELA) === -1 && guardado.indexOf('11111111') === -1 && guardado.indexOf('p2') === -1, guardado);
    let mapa = null; try { mapa = JSON.parse(guardado); } catch (e) {}
    si('   …y contiene el OP_ID acuñado', !!guardado && !!antes && guardado.indexOf(antes.datos.OP_ID) > -1);
    si('   …sin nada más grande que unas decenas de caracteres por intención', !!guardado && guardado.length < 400, guardado && guardado.length);
    void mapa;

    // recarga de la página: el mismo contenido sin respuesta sigue siendo la misma intención
    await p.reload();
    await p.waitForTimeout(700);
    await p.evaluate(() => { window.__srv.llamadas = []; });
    await regla(p, A, { tipo: 'falla' });
    await llamar(p, A, pq);
    const despues = (await salidas(p, A))[0];
    eq('★ tras RECARGAR la página, el mismo contenido sin respuesta reutiliza el MISMO OP_ID',
      !!(despues && antes) && valido(antes.datos.OP_ID) && despues.datos.OP_ID === antes.datos.OP_ID, true);

    // vence a las 6 horas: 5 h 59 min todavía es la misma; pasadas las 6 h, una nueva
    await reloj(p, 5 * HORA + 59 * 60 * 1000);
    await regla(p, A, { tipo: 'falla' });
    await llamar(p, A, pq);
    const casi = (await salidas(p, A)).slice(-1)[0];
    eq('★ a las 5 h 59 min el OP_ID sigue siendo el mismo', valido(antes.datos.OP_ID) && casi.datos.OP_ID === antes.datos.OP_ID, true);
    await reloj(p, 2 * 60 * 1000);
    await regla(p, A, { tipo: 'falla' });
    await llamar(p, A, pq);
    const vencido = (await salidas(p, A)).slice(-1)[0];
    si('★ pasadas las 6 h el OP_ID VENCE: el mismo contenido recibe uno nuevo', valido(antes.datos.OP_ID) && valido(vencido.datos.OP_ID) && vencido.datos.OP_ID !== antes.datos.OP_ID, vencido.datos.OP_ID);
    const tras = await p.evaluate(() => { try { return localStorage.getItem('rce_ops'); } catch (e) { return 'ERR'; } });
    si('   …y el mapa no arrastra el OP_ID vencido (se poda al escribir)', valido(antes.datos.OP_ID) && typeof tras === 'string' && tras.indexOf(antes.datos.OP_ID) === -1 && tras.indexOf(vencido.datos.OP_ID) > -1, tras);
    await p.cerrar();
  }
  for (const almacen of ['metodos', 'acceso']) {
    const etiqueta = almacen === 'metodos' ? 'cada uso del almacenamiento lanza' : 'el acceso a localStorage lanza';
    const nerr = errores.length;
    const p = await abrir({ modo: 'gas', almacen });
    const A = 'PEND_ABRIR';
    const pq = { idCama: '2', texto: 'sin almacenamiento' };
    await regla(p, A, { tipo: 'falla' }, { tipo: 'falla' });
    await llamar(p, A, pq);
    await llamar(p, A, pq);
    let s = await salidas(p, A);
    si('★ con el almacenamiento caído (' + etiqueta + ') la pantalla arranca y la escritura sale con OP_ID válido', s.length === 2 && s.every(x => OP_RE.test(x.datos.OP_ID || '')), JSON.stringify(opIds(s)));
    eq('   …y el mismo contenido sin respuesta sigue siendo la misma intención (la memoria en RAM alcanza)', mismos(opIds(s)), true);
    await regla(p, A, { tipo: 'ok', data: { id: 'q' } });
    const rok = await llamar(p, A, pq);
    await llamar(p, A, pq);
    s = await salidas(p, A);
    eq('   …y se suelta al responder el servidor', [rok.resuelve, s.length, distintos(opIds(s), 2)], [true, 4, true]);
    eq('   …sin errores de JavaScript por el almacenamiento (' + etiqueta + ')', errores.slice(nerr), []);
    await p.cerrar();
  }
  {
    const p = await abrir({ modo: 'gas', sinUUID: true });
    const ids = new Set();
    for (let i = 0; i < 60; i++) {
      const sale = await p.evaluate(a => { api(a, { idCama: '2', texto: 'sin uuid ' + Math.random() }).catch(() => {}); return null; }, 'PEND_ABRIR');
      void sale;
    }
    await p.waitForTimeout(80);
    const s = await salidas(p, 'PEND_ABRIR');
    s.forEach(x => ids.add(x.datos.OP_ID));
    si('★ SIN crypto.randomUUID (navegador viejo) el respaldo acuña OP_ID válidos y no repetidos',
      s.length === 60 && ids.size === 60 && s.every(x => OP_RE.test(x.datos.OP_ID || '')), s.length + ' salidas, ' + ids.size + ' distintos');
    await p.cerrar();
  }

  /* ══ E · POR LA APP INSTALADA (HTTP): el OP_ID viaja en el cuerpo, text/plain ═ */
  console.log('\nE · Por la app instalada el OP_ID viaja igual');
  {
    const p = await abrir({ modo: 'http' });
    await lanzar(p, 'PEND_ABRIR', { idCama: '2', texto: 'por http' });
    const s = await salidas(p, 'PEND_ABRIR');
    const f = await p.evaluate(() => window.__srv.cuerpos.slice(-1)[0] || null);
    si('★ por el /exec el OP_ID viaja dentro de datos, en el mismo cuerpo', s.length === 1 && OP_RE.test((s[0].datos || {}).OP_ID || ''), JSON.stringify(opIds(s)));
    eq('   …y el POST sigue siendo text/plain (con application/json el navegador pregunta con OPTIONS y Apps Script no contesta)',
      f && (f.cabeceras['Content-Type'] || '').split(';')[0], 'text/plain');
    eq('   …a la dirección configurada en el aparato, no a una escrita en el código', f && f.url, EXEC_FALSO);
    await p.cerrar();
  }

  /* ══ F · guardar(): UNA INTENCIÓN, VARIOS INTENTOS, Y LA PANTALLA DICE LO QUE SABE ═ */
  console.log('\nF · guardar(): 45 s sin respuesta, reintentos 3/10/30 s, una sola llamada y estados honestos');
  const GUARDAR = 'GUARDAR_EVOLUCION';
  const FORM_TXT = 'bipedestación asistida';
  // El formulario lleno como lo llenaría un colega (la hemodinamia y la vía aérea son obligatorias y NO se rellenan solas:
  // una guardia que las pusiera sola taparía el caso «nadie la miró»).
  const llenar = (p, texto) => p.evaluate(t => {
    const f = $('fFirma'); if (![...f.options].some(o => o.value === 'KIN')) f.innerHTML = '<option value="KIN">KIN</option>';
    f.value = 'KIN';
    $('fHEst').value = 'Estable'; $('fDVA').value = 'Sin requerimientos'; $('fVA').value = 'Natural';
    $('fPlanes').value = t; _transAvisoOk = true; _formDirty = true;
  }, texto || FORM_TXT);
  const abrirCama = async (p, cama, pid) => {
    await p.evaluate(([id, pid]) => {
      $('gDate').value = '2026-08-10'; SHIFT = 'Dia';
      DB = [{ ID_CAMA: id, OCUPADA: true, PATIENT_ID: pid, NOMBRE: 'Paciente ' + id, VIA_AEREA: 'Natural', SOPORTE: 'Ambiente' }];
      renderGrid(); abrirPanel(id, false, false);
    }, [cama, pid]);
    await p.clock.runFor(600);
    await llenar(p);
  };
  // Una página nueva con el reloj de Playwright, el panel de la cama abierto y lleno. `p.t` = ms desde que se aprieta guardar.
  async function abrirGuardar(cama, pid) {
    const p = await abrir({ modo: 'gas', relojPW: true });
    await p.evaluate(() => {
      localStorage.clear();
      window.__toasts = []; window.toast = m => window.__toasts.push(String(m));
      window.__recargas = 0; window.recargarSilencioso = () => { window.__recargas++; };
      window.gs = (a, d, okf) => { if (okf) okf(a === 'GET_EVO_TURNO' ? { actual: null, previa: null, pronoAbierto: '' } : null); };
    });
    await abrirCama(p, cama || '2', pid || 'p2');
    p.t = 0;
    return p;
  }
  const irA = async (p, seg) => { const ms = Math.round(seg * 1000) - p.t; if (ms > 0) { await p.clock.runFor(ms); p.t += ms; } };
  const apretar = p => p.evaluate(() => { guardar(); });
  const contestar = (p, n, x) => p.evaluate(([n, x]) => window.__srv.contestar('GUARDAR_EVOLUCION', n, x), [n, x]);
  const llamadasG = p => salidas(p, GUARDAR);
  const pantalla = p => p.evaluate(() => {
    const e = $('gEstadoGuardado'), m = $('avErrOvl');
    return {
      estado: e.dataset.estado, visible: !e.classList.contains('hidden'),
      texto: e.textContent.replace(/\s+/g, ' ').trim(), titulo: e.title || '',
      botones: [...e.querySelectorAll('button')].map(b => b.textContent.trim()),
      modal: m.classList.contains('on'), modalTit: $('avErrTit').textContent.trim(), modalMsg: $('avErrMsg').textContent.trim(),
      modalPrim: $('avErrReint').textContent.trim(), modalSec: $('avErrSec').textContent.trim(),
      btn: $('btnGuardar').textContent.trim(), btnOff: $('btnGuardar').disabled, avanzaOff: $('pasoAvanza').disabled,
      dirty: _formDirty, planes: $('fPlanes').value, paso: PASO_ACTUAL,
      borrador: Object.keys(localStorage).filter(k => /^CAMA_\d+_/.test(k)).length,
      toasts: window.__toasts.slice(), recargas: window.__recargas, reintento: typeof _reintentoGuardado === 'function',
    };
  });
  const OK_DATA = { TEXTO_GENERADO: 'texto del servidor', patientId: 'p2' };
  const mismaFoto = ll => ll.length > 0 && ll.every(x => JSON.stringify(x.datos) === JSON.stringify(ll[0].datos)) && valido(ll[0].datos.OP_ID);
  const exitos = e => e.toasts.filter(t => /Evolución guardada correctamente/.test(t)).length;
  // «Guardado» / «No se guardó» son AFIRMACIONES: en ámbar la pantalla no puede hacer ninguna de las dos.
  const afirma = t => /Guardado|No se guard[oó]|NO se guard[oó]/.test(t);
  // Tema claro = el fondo es claro (luminancia relativa alta). El ámbar #fef3c7 es claro aunque su canal azul sea 199.
  const claro = c => { const n = String(c).match(/\d+/g).map(Number); return (0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2]) / 255 > 0.8; };

  /* ── F0 · las constantes de tiempo viven en UN lugar ── */
  {
    const p = await abrirGuardar();
    const k = await p.evaluate(() => ({ r: typeof GUARDADO_REINTENTOS_MS === 'undefined' ? null : [...GUARDADO_REINTENTOS_MS], e: typeof GUARDADO_ESPERA_MS === 'undefined' ? null : GUARDADO_ESPERA_MS }));
    eq('★ F0 · los reintentos (3, 10 y 30 s) y la espera (45 s) viven en UN lugar, ajustable', k, { r: [3000, 10000, 30000], e: 45000 });
    await p.cerrar();
  }

  /* ── F1 · el servidor no contesta: reintentos 3/10/30 s con la misma foto, y a los 45 s ÁMBAR ── */
  {
    const p = await abrirGuardar();
    await regla(p, GUARDAR, { tipo: 'colgado' }, { tipo: 'colgado' }, { tipo: 'colgado' }, { tipo: 'colgado' });
    await apretar(p);
    let ll = await llamadasG(p), e = await pantalla(p);
    eq('★ F1 · al guardar sale UNA llamada y la franja dice «Guardando…» (neutra) con el botón apagado',
      [ll.length, e.estado, /Guardando/.test(e.texto), e.btnOff], [1, 'guardando', true, true]);
    await irA(p, 2.9); ll = await llamadasG(p);
    eq('   …a los 2,9 s todavía una sola llamada', ll.length, 1);
    await irA(p, 3.1); ll = await llamadasG(p);
    eq('★ a los 3 s sale el primer reintento (2 llamadas)', ll.length, 2);
    await irA(p, 9.9); ll = await llamadasG(p);
    eq('   …a los 9,9 s siguen siendo 2', ll.length, 2);
    await irA(p, 10.1); ll = await llamadasG(p);
    eq('★ a los 10 s sale el segundo (3 llamadas)', ll.length, 3);
    await irA(p, 29.9); ll = await llamadasG(p);
    eq('   …a los 29,9 s siguen siendo 3', ll.length, 3);
    await irA(p, 30.1); ll = await llamadasG(p);
    eq('★ a los 30 s sale el tercero (4 llamadas) y no hay más', ll.length, 4);
    si('★ los cuatro envíos son EXACTAMENTE la misma foto del payload, con el MISMO OP_ID válido', mismaFoto(ll), JSON.stringify(opIds(ll)));
    await irA(p, 44.9); e = await pantalla(p);
    eq('   …a los 44,9 s todavía «Guardando» (nada que afirmar aún), sin cuadro', [e.estado, e.modal], ['guardando', false]);
    await irA(p, 45.1); e = await pantalla(p);
    eq('★★ a los 45 s sin respuesta la franja pasa a «No confirmado» en ÁMBAR', [e.estado, /No confirmado/.test(e.texto), e.visible], ['noconfirmado', true, true]);
    si('★★ …y NUNCA dice «Guardado» ni «No se guardó» (no lo sabe)', !afirma(e.texto) && !afirma(e.modalTit), e.texto + ' | ' + e.modalTit);
    si('   …con su botón «Reintentar ahora»', e.botones.join('|') === 'Reintentar ahora', e.botones.join('|'));
    si('   …y sin «Reintentando…» (ya no queda ningún reintento automático)', !/Reintentando/.test(e.texto), e.texto);
    si('★ el cuadro del centro dice «No confirmado» y explica: no sabemos si se guardó, el texto sigue aquí',
      e.modal && e.modalTit === 'No confirmado' && /No sabemos si se guardó/.test(e.modalMsg) && /Tu texto sigue aquí/.test(e.modalMsg), JSON.stringify([e.modal, e.modalTit, e.modalMsg]));
    eq('   …con «Reintentar ahora» y «Seguir editando»', [e.modalPrim, e.modalSec], ['Reintentar ahora', 'Seguir editando']);
    eq('★ el texto escrito se CONSERVA: el formulario intacto, sin guardar, con borrador local', [e.planes, e.dirty, e.borrador], [FORM_TXT, true, 1]);
    eq('   …y el botón de guardar queda disponible (se puede volver a apretar)', [e.btnOff, e.avanzaOff], [false, false]);
    si('   …y hay un reintento armado', e.reintento);
    si('★ las llamadas siguen vivas: nadie se descartó (los 4 envíos quedaron pendientes de respuesta)', await p.evaluate(() => window.__srv.pendientes.filter(q => q.accion === 'GUARDAR_EVOLUCION').length === 4));
    await irA(p, 120); ll = await llamadasG(p);
    eq('   …y pasado el tiempo NO salen más reintentos solos («después, solo manual»)', ll.length, 4);

    // F2 · un éxito TARDÍO corrige el estado
    await contestar(p, 1, { tipo: 'ok', data: OK_DATA });
    await p.clock.runFor(20);
    e = await pantalla(p);
    eq('★★ F2 · el éxito TARDÍO corrige la franja a «Guardado hh:mm» (verde)', [e.estado, /^✓ Guardado \d{2}:\d{2}$/.test(e.texto)], ['ok', true]);
    eq('   …cierra el cuadro de «No confirmado»', e.modal, false);
    eq('   …y recién ahí el formulario deja de estar sin guardar y el borrador muere', [e.dirty, e.borrador, e.reintento], [false, 0, false]);
    eq('   …con UN solo «Evolución guardada» y UN solo refresco del censo', [exitos(e), e.recargas], [1, 1]);
    // las otras tres llamadas contestan después (repetidas): no se vuelve a aplicar nada
    await contestar(p, 0, { tipo: 'ok', data: Object.assign({ repetida: true }, OK_DATA) });
    await contestar(p, 2, { tipo: 'ok', data: Object.assign({ repetida: true }, OK_DATA) });
    await contestar(p, 3, { tipo: 'ok', data: Object.assign({ repetida: true }, OK_DATA) });
    await p.clock.runFor(20);
    e = await pantalla(p);
    eq('   …y las otras tres respuestas (repetidas) no lo aplican otra vez', [e.estado, exitos(e), e.recargas], ['ok', 1, 1]);
    await p.cerrar();
  }

  /* ── F3 · un RECHAZO tardío pasa a «No se guardó» ── */
  {
    const p = await abrirGuardar();
    await regla(p, GUARDAR, { tipo: 'colgado' }, { tipo: 'colgado' }, { tipo: 'colgado' }, { tipo: 'colgado' });
    await apretar(p);
    await irA(p, 46);
    let e = await pantalla(p);
    eq('F3 · (control) a los 46 s está en ámbar', e.estado, 'noconfirmado');
    await contestar(p, 0, { tipo: 'rechazo', error: 'Falta la firma del kinesiólogo (prueba).', codigo: 'VALIDACION' });
    await p.clock.runFor(20);
    e = await pantalla(p);
    eq('★★ el rechazo TARDÍO pasa la franja a «No se guardó» (rojo): ahora sí lo sabe', [e.estado, /NO se guardó/.test(e.texto)], ['error', true]);
    eq('   …y el cuadro del centro dice «No se guardó» con el motivo del servidor', [e.modal, e.modalTit, e.modalMsg], [true, 'No se guardó', 'Falta la firma del kinesiólogo (prueba).']);
    eq('   …el formulario y el borrador se conservan', [e.planes, e.dirty, e.borrador], [FORM_TXT, true, 1]);
    // y si la llamada de más atrás contestara ok, el éxito corrige también el rojo (el dato SÍ quedó)
    await p.cerrar();
  }

  /* ── F4 · la respuesta REPETIDA del reintento luce igual que una limpia, y corta los reintentos ── */
  {
    const p = await abrirGuardar();
    await regla(p, GUARDAR, { tipo: 'colgado' }, { tipo: 'colgado' });
    await apretar(p);
    await irA(p, 3.1);
    let ll = await llamadasG(p);
    eq('F4 · (control) el primer intento no contestó y salió el reintento', ll.length, 2);
    await contestar(p, 1, { tipo: 'ok', data: Object.assign({ repetida: true }, OK_DATA) });
    await p.clock.runFor(20);
    let e = await pantalla(p);
    eq('★ F4 · la respuesta REPETIDA (`data.repetida`) muestra «Guardado hh:mm» igual que una limpia', [e.estado, /^✓ Guardado \d{2}:\d{2}$/.test(e.texto)], ['ok', true]);
    await irA(p, 120); ll = await llamadasG(p);
    eq('   …y con la respuesta en mano ya no salen los reintentos de 10 y 30 s (se cancelan)', ll.length, 2);
    eq('   …sin duplicar nada: un solo «Evolución guardada»', exitos(await pantalla(p)), 1);
    await p.cerrar();
  }

  /* ── F5 · doble clic y Enter producen UNA llamada ── */
  {
    const p = await abrirGuardar();
    await regla(p, GUARDAR, { tipo: 'colgado' });
    await p.evaluate(() => { pasoIr(5); });
    const misma = await p.evaluate(() => { window.__a = guardar(); window.__b = guardar(); return { igual: window.__a === window.__b, esPromesa: !!window.__a && typeof window.__a.then === 'function' }; });
    eq('★ F5 · un segundo guardar() devuelve LA MISMA promesa (no abre otra llamada)', misma, { igual: true, esPromesa: true });
    await p.evaluate(() => { $('btnGuardar').click(); $('btnGuardar').click(); const a = $('pasoAvanza'); a.click(); a.click(); });
    await p.evaluate(() => { $('pasoAvanza').focus(); });
    await p.keyboard.press('Enter'); await p.keyboard.press('Enter');
    await p.clock.runFor(100);
    const ll = await llamadasG(p), e = await pantalla(p);
    eq('★ F5 · doble clic en los dos botones y Enter: UNA sola llamada al servidor', ll.length, 1);
    eq('   …y el botón del camino queda apagado mientras vuela', [e.avanzaOff, e.btnOff], [true, true]);
    await p.cerrar();
  }

  /* ── F6 · los reintentos reenvían la FOTO; lo escrito mientras vuela no se da por guardado ni se pierde ── */
  {
    const p = await abrirGuardar();
    await regla(p, GUARDAR, { tipo: 'colgado' }, { tipo: 'colgado' }, { tipo: 'colgado' }, { tipo: 'colgado' });
    await p.evaluate(() => { pasoIr(5); });     // en el paso 5 el guardado bueno SALTA al relato (paso 6): con cambios en vuelo no debe
    await apretar(p);
    await p.evaluate(() => { const t = $('fPlanes'); t.value = 'agregué esto con la llamada en vuelo'; t.dispatchEvent(new Event('input', { bubbles: true })); });
    await irA(p, 31);
    const ll = await llamadasG(p);
    eq('F6 · (control) salieron los 4 envíos', ll.length, 4);
    si('★ los reintentos reenvían la FOTO de lo que se apretó (no lo que se escribió después), con el mismo OP_ID',
      mismaFoto(ll) && ll.every(x => x.datos.PLAN_PLANES === FORM_TXT), JSON.stringify(ll.map(x => x.datos.PLAN_PLANES)));
    await contestar(p, 0, { tipo: 'ok', data: OK_DATA });
    await p.clock.runFor(20);
    const e = await pantalla(p);
    eq('★★ F6 · el guardado confirma la foto, pero lo escrito DESPUÉS sigue sin guardar (el formulario no se da por guardado)', [e.estado, e.dirty], ['ok', true]);
    eq('   …el texto nuevo sigue en pantalla', e.planes, 'agregué esto con la llamada en vuelo');
    const bor = await p.evaluate(() => { const k = Object.keys(localStorage).filter(x => /^CAMA_2_/.test(x))[0]; return k ? (JSON.parse(localStorage.getItem(k)).campos || {}).fPlanes : null; });
    eq('★★ …y el borrador local NO se borra: queda con lo último que se escribió', bor, 'agregué esto con la llamada en vuelo');
    eq('   …y la pantalla no salta de paso por un guardado que ya no es el formulario (sigue en el mismo paso)', e.paso, 5);
    await p.cerrar();
  }

  /* ── F7 · el servidor no contestó rápido (la red cayó): ámbar de inmediato, reintentando 3/10/30 s, y al agotarse sigue en ámbar ── */
  {
    const p = await abrirGuardar();
    await regla(p, GUARDAR, { tipo: 'falla' }, { tipo: 'falla' }, { tipo: 'falla' }, { tipo: 'falla' });
    await apretar(p);
    await p.clock.runFor(10); p.t += 10;
    let e = await pantalla(p), ll = await llamadasG(p);
    eq('★ F7 · apenas falla la primera (sin respuesta): «No confirmado» ámbar y dice que sigue reintentando', [ll.length, e.estado, /Reintentando/.test(e.texto)], [1, 'noconfirmado', true]);
    eq('   …todavía sin el cuadro del centro (quedan reintentos)', e.modal, false);
    si('   …y todavía no dice «Guardado» ni «No se guardó»', !afirma(e.texto), e.texto);
    await irA(p, 3.1); await irA(p, 10.1); await irA(p, 31);
    ll = await llamadasG(p); e = await pantalla(p);
    eq('★ a los 31 s salieron los 4 envíos con la misma foto y el mismo OP_ID', [ll.length, mismaFoto(ll)], [4, true]);
    eq('★★ agotados, se queda en ÁMBAR (nunca «No se guardó»): sin «Reintentando…», con el cuadro y «Reintentar ahora»',
      [e.estado, /Reintentando/.test(e.texto), e.modal, e.modalTit, e.botones.join('|')], ['noconfirmado', false, true, 'No confirmado', 'Reintentar ahora']);
    si('   …ni «Guardado» ni «No se guardó» en ninguna parte', !afirma(e.texto) && !afirma(e.modalTit) && !afirma(e.btn), e.texto + ' | ' + e.modalTit + ' | ' + e.btn);
    // «Reintentar ahora»: el mismo paquete, el mismo OP_ID, y si el servidor contesta ok pasa a «Guardado»
    await p.evaluate(() => { $('avErrReint').click(); });
    await p.clock.runFor(50);
    ll = await llamadasG(p); e = await pantalla(p);
    eq('★ «Reintentar ahora» manda UN envío más, con la misma foto y el mismo OP_ID', [ll.length, mismaFoto(ll)], [5, true]);
    eq('   …y al contestar ok la franja pasa a «Guardado» y el cuadro se va', [e.estado, /^✓ Guardado \d{2}:\d{2}$/.test(e.texto), e.modal, e.dirty, e.borrador], ['ok', true, false, false, 0]);
    await p.cerrar();
  }

  /* ── F8 · el servidor CONTESTÓ que no: rojo de una vez, sin reintentar solo ── */
  {
    const p = await abrirGuardar();
    await regla(p, GUARDAR, { tipo: 'rechazo', error: 'APACHE II fuera de rango (prueba).', codigo: 'VALIDACION' });
    await apretar(p);
    await p.clock.runFor(20); p.t += 20;
    let e = await pantalla(p);
    eq('★ F8 · un rechazo del servidor (VALIDACION) es «No se guardó» (rojo) al tiro', [e.estado, /NO se guardó/.test(e.texto), e.modal, e.modalTit], ['error', true, true, 'No se guardó']);
    eq('   …con el formulario, el borrador y el botón de volver a guardar intactos', [e.planes, e.dirty, e.borrador, e.btnOff], [FORM_TXT, true, 1, false]);
    await irA(p, 120);
    eq('★ …y NO se reintenta solo (reenviar lo mismo recibiría lo mismo): una sola llamada', (await llamadasG(p)).length, 1);
    // Reintentar a mano manda los MISMOS datos
    await p.evaluate(() => { $('avErrReint').click(); });
    await p.clock.runFor(50);
    const ll = await llamadasG(p); e = await pantalla(p);
    eq('   …«Reintentar» a mano remanda lo mismo y, si sale bien, pasa a «Guardado»', [ll.length, ll[1] && ll[1].datos.PLAN_PLANES, e.estado], [2, FORM_TXT, 'ok']);
    await p.cerrar();
  }
  {
    // CONFLICTO también es el servidor contestando que no: rojo, y tampoco se reintenta solo
    const p = await abrirGuardar();
    await regla(p, GUARDAR, { tipo: 'rechazo', error: 'La cama 2 ya fue ocupada por otro paciente mientras llenabas este ingreso. No se guardó nada. Tu formulario sigue abierto con lo que escribiste.', codigo: 'CONFLICTO' });
    await apretar(p);
    await p.clock.runFor(20); p.t += 20;
    await irA(p, 120);
    const e = await pantalla(p);
    eq('★ F8b · un CONFLICTO del servidor es «No se guardó» (rojo), con una sola llamada', [e.estado, (await llamadasG(p)).length], ['error', 1]);
    eq('   …y conserva el formulario y el borrador', [e.planes, e.borrador], [FORM_TXT, 1]);
    await p.cerrar();
  }

  /* ── F9 · LOCK_TIMEOUT es «no se ejecutó»: se reintenta con el mismo OP_ID ── */
  {
    const p = await abrirGuardar();
    await regla(p, GUARDAR, { tipo: 'rechazo', error: 'Sistema ocupado (otra escritura en curso). Reintenta.', codigo: 'LOCK_TIMEOUT' });
    await apretar(p);
    await p.clock.runFor(20); p.t += 20;
    let e = await pantalla(p);
    si('★ F9 · LOCK_TIMEOUT no es un «No se guardó» todavía: se reintenta solo', e.estado !== 'error' && !e.modal, e.estado);
    await irA(p, 3.1);
    await p.clock.runFor(20);
    const ll = await llamadasG(p); e = await pantalla(p);
    eq('★ …a los 3 s sale el reintento con el MISMO OP_ID y la misma foto', [ll.length, mismaFoto(ll)], [2, true]);
    eq('   …y al salir bien pasa a «Guardado»', [e.estado, /^✓ Guardado \d{2}:\d{2}$/.test(e.texto)], ['ok', true]);
    await p.cerrar();
  }
  {
    // dos veces «sistema ocupado»: el servidor contestó dos veces que no se ejecutó → ahora sí «No se guardó»
    const p = await abrirGuardar();
    const LT = { tipo: 'rechazo', error: 'Sistema ocupado (otra escritura en curso). Reintenta.', codigo: 'LOCK_TIMEOUT' };
    await regla(p, GUARDAR, LT, LT);
    await apretar(p);
    await p.clock.runFor(20); p.t += 20;
    await irA(p, 3.1); await p.clock.runFor(20);
    const e = await pantalla(p);
    eq('F9b · el servidor contestó dos veces «sistema ocupado»: «No se guardó» (rojo), con su Reintentar', [e.estado, e.modal, e.reintento], ['error', true, true]);
    await p.cerrar();
  }

  /* ── F10 · «Guardado con aviso» y las advertencias a la vista ── */
  {
    const p = await abrirGuardar();
    const AV = ['Las mediciones de este turno no quedaron completas en la serie. Vuelve a guardar el turno para completarlas.'];
    await regla(p, GUARDAR, { tipo: 'ok', data: Object.assign({ advertencias: AV }, OK_DATA) });
    await apretar(p);
    await p.clock.runFor(20);
    const e = await pantalla(p);
    eq('★ F10 · un guardado con advertencias dice «Guardado con aviso hh:mm»', [e.estado, /^✓ Guardado con aviso \d{2}:\d{2}$/.test(e.texto)], ['aviso', true]);
    si('   …y las LISTA (en el aviso y en la franja)', e.toasts.some(t => t.indexOf(AV[0]) > -1) && e.titulo.indexOf(AV[0]) > -1, JSON.stringify([e.toasts, e.titulo]));
    eq('   …y el formulario ya está guardado', [e.dirty, e.borrador], [false, 0]);
    await p.cerrar();
  }

  /* ── F11 · la respuesta de OTRO panel no toca el que está abierto, y no lo bloquea ── */
  {
    const p = await abrirGuardar('2', 'p2');
    await regla(p, GUARDAR, { tipo: 'colgado' });
    await apretar(p);
    await p.clock.runFor(100); p.t += 100;
    await p.evaluate(() => { _borradorGuardar(); _formDirty = false; cerrarPanel(true); });
    await abrirCama(p, '3', 'p3');
    await p.evaluate(() => { window.__toasts = []; });
    await contestar(p, 0, { tipo: 'ok', data: OK_DATA });
    await p.clock.runFor(20);
    let e = await pantalla(p);
    eq('★ F11 · la respuesta tardía del guardado de la cama 2 NO toca la franja ni el formulario de la cama 3',
      [e.estado, e.dirty, e.planes], ['', true, FORM_TXT]);
    eq('   …pero sí refresca el censo y limpia el borrador de la cama 2', [e.recargas, e.borrador], [1, 0]);
    await regla(p, GUARDAR, { tipo: 'colgado' });
    await apretar(p);
    const ll = await llamadasG(p);
    eq('★ …y el guardado en vuelo de la cama 2 NO impide guardar la cama 3', [ll.length, ll[1] && ll[1].datos.ID_CAMA], [2, '3']);
    await p.cerrar();
  }

  /* ── F12 · apretar guardar de nuevo con la franja en ámbar: mismo contenido = misma intención; otro contenido = intención nueva ── */
  {
    const p = await abrirGuardar();
    await regla(p, GUARDAR, { tipo: 'colgado' }, { tipo: 'colgado' }, { tipo: 'colgado' }, { tipo: 'colgado' });
    await apretar(p);
    await irA(p, 46);
    await p.evaluate(() => { avErrCerrar(); });
    await apretar(p);
    let ll = await llamadasG(p);
    eq('★ F12 · con la franja en ámbar se puede apretar guardar otra vez, y el mismo contenido lleva el MISMO OP_ID', [ll.length, ll[4] && ll[4].datos.OP_ID === ll[0].datos.OP_ID], [5, true]);
    await p.evaluate(() => { const t = $('fPlanes'); t.value = 'cambié lo escrito'; t.dispatchEvent(new Event('input', { bubbles: true })); });
    await p.evaluate(() => { guardar(); });
    ll = await llamadasG(p);
    const nuevo = ll[ll.length - 1];
    eq('★ …y otro contenido es otra intención: otro paquete, OP_ID NUEVO', [ll.length, nuevo.datos.PLAN_PLANES, valido(nuevo.datos.OP_ID) && nuevo.datos.OP_ID !== ll[0].datos.OP_ID], [6, 'cambié lo escrito', true]);
    await p.clock.runFor(50);
    const e = await pantalla(p);
    eq('   …y al contestar el servidor (ok por defecto) la franja dice «Guardado»', [e.estado, e.dirty], ['ok', false]);
    // la respuesta tardía de la intención VIEJA no pisa lo que ya se confirmó
    await contestar(p, 0, { tipo: 'rechazo', error: 'respuesta vieja y tardía (prueba)', codigo: 'VALIDACION' });
    await p.clock.runFor(20);
    eq('   …y un rechazo tardío de la intención vieja no ensucia lo ya confirmado', (await pantalla(p)).estado, 'ok');
    await p.cerrar();
  }

  /* ── F13 · tema claro y sin emojis posteriores a 2019 ── */
  {
    const p = await abrirGuardar();
    await regla(p, GUARDAR, { tipo: 'colgado' });
    await apretar(p);
    const colores = { guardando: await p.evaluate(() => getComputedStyle($('gEstadoGuardado')).backgroundColor) };
    const gtxt = (await pantalla(p)).texto;
    await irA(p, 46);
    const e = await pantalla(p);
    colores.noconfirmado = await p.evaluate(() => getComputedStyle($('gEstadoGuardado')).backgroundColor);
    colores.modal = await p.evaluate(() => getComputedStyle($('avErrCard')).backgroundColor);
    si('★ F13 · «Guardando…» y «No confirmado» y el cuadro van en TEMA CLARO', claro(colores.guardando) && claro(colores.noconfirmado) && claro(colores.modal), JSON.stringify(colores));
    const texto = [gtxt, e.texto, e.titulo, e.modalTit, e.modalMsg, e.modalPrim, e.modalSec].join(' ');
    si('★ …y los textos nuevos no traen emojis posteriores a 2019 (solo texto y ✓ ⚠ ⏳ de siempre)',
      [...texto].every(c => c.codePointAt(0) < 0x2800), JSON.stringify([...texto].filter(c => c.codePointAt(0) >= 0x2800)));
    await p.cerrar();
  }

  /* ══ G · EL EPISODIO SE CAPTURA AL ABRIR, EN CADA PUERTA ═══════════════ */
  console.log('\nG · El episodio se captura AL ABRIR el diálogo y no se relee de la base al enviar');
  const CAMA_G = (id, pid, extra) => Object.assign({ ID_CAMA: String(id), OCUPADA: true, PATIENT_ID: pid, NOMBRE: 'Paciente ' + id, EDAD: 61, SEXO: 'M',
    DIAGNOSTICO: 'Dx', COD_PACIENTE: 'C' + id, VIA_AEREA: 'TOT', SOPORTE: 'VM', MODO: 'ACVC', FECHA_INGRESO: '2026-08-05', FECHA_INICIO_SOPORTE: '2026-08-05' }, extra || {});
  // Una página con la cama 2 de P, la 3 de R y la 5 libre (con un PATIENT_ID viejo que la fila conserva: una cama libre no tiene dueño).
  async function abrirG(camas) {
    const p = await abrir({ modo: 'gas' });
    await p.evaluate(c => {
      window.__toasts = [];
      $('gDate').value = '2026-08-10'; $('gDate').classList.add('turno-hoy'); SHIFT = 'Dia';
      DB = c; renderGrid();
      // La firma del formulario es lo primero que mira `_pedirFirma`: así no se abre el cuadro de «¿quién midió?».
      const f = $('fFirma'); if (![...f.options].some(o => o.value === 'KIN')) f.insertAdjacentHTML('beforeend', '<option value="KIN">KIN</option>');
      f.value = 'KIN';
    }, camas || [CAMA_G(2, 'pP'), CAMA_G(3, 'pR'), CAMA_G(5, 'pViejo', { OCUPADA: false })]);
    return p;
  }
  /* UN SONDEO DE VERDAD: el servidor entrega las camas cambiadas y corre `recargarSilencioso()`, que es lo que hace la pantalla
     sola cada tanto. Devuelve cómo ve la pantalla cada cama DESPUÉS (el control: si no cambió, la prueba no prueba nada). */
  async function sondear(p, cambios, evos) {
    await p.evaluate(([cambios, evos]) => {
      const nuevas = JSON.parse(JSON.stringify(DB)).map(c => Object.assign(c, cambios[c.ID_CAMA] || {}));
      window.__srv.reglas['GET_TODAS_CAMAS'] = [{ tipo: 'ok', data: nuevas }];
      if (evos) window.__srv.reglas['GET_EVOS_DEL_DIA'] = [{ tipo: 'ok', data: evos }];
      recargarSilencioso();
    }, [cambios, evos || null]);
    await p.waitForTimeout(250);
    return p.evaluate(() => Object.fromEntries(DB.map(c => [c.ID_CAMA, (c.OCUPADA === true || c.OCUPADA === 'TRUE') ? c.PATIENT_ID : ''])));
  }
  const fin = (p) => p.waitForTimeout(250);
  const unaSalida = async (p, accion) => { const l = await salidas(p, accion); return l.length === 1 ? l[0].datos : null; };
  const con = (d, k) => d !== null && Object.prototype.hasOwnProperty.call(d, k);
  const ROJO = 'Esta cama cambió de paciente mientras tenías el diálogo abierto. No se hizo nada.';
  const CONFLICTO = 'La cama 2 ya fue ocupada por otro paciente mientras llenabas este ingreso. No se guardó nada.';

  /* ── G1 · el egreso: el pid se toma al ABRIR el diálogo y viaja por argumento ── */
  {
    const p = await abrirG();
    await p.evaluate(() => { egreso('2'); });
    const v1 = await sondear(p, { 2: { PATIENT_ID: 'pQ', NOMBRE: 'Otro paciente' } });
    await p.evaluate(() => { $('egDestino').value = 'Domicilio'; const f = $('egFirma'); f.innerHTML = '<option value="KIN">KIN</option>'; f.value = 'KIN'; confirmarEgreso(); });
    const v2 = await sondear(p, { 2: { PATIENT_ID: 'pS' } });
    await p.evaluate(() => { _ucFin(true); });
    await fin(p);
    const d = await unaSalida(p, 'DAR_ALTA');
    eq('G1 · (control) el sondeo SÍ cambió la cama 2 en la pantalla: ahora la ve de otro (dos veces)', [v1['2'], v2['2']], ['pQ', 'pS']);
    eq('★★ G1 · DAR_ALTA manda EPISODIO_ABIERTO = el paciente que se vio AL ABRIR el diálogo (no el que ocupa la cama al enviar)', d && d.EPISODIO_ABIERTO, 'pP');
    eq('   …sobre la cama que se abrió', d && d.idCama, '2');
    await p.cerrar();
  }

  /* ── G2 · intercambio: epA y epB al elegir las dos camas ── */
  {
    const p = await abrirG();
    await p.evaluate(() => { mover('2'); mover('3'); });          // elige el origen y el destino: abre el diálogo de confirmar
    const v = await sondear(p, { 2: { PATIENT_ID: 'pQ' }, 3: { PATIENT_ID: 'pT' } });
    await p.evaluate(() => { _ucFin(true); });
    await fin(p);
    const d = await unaSalida(p, 'INTERCAMBIAR_CAMAS');
    eq('G2 · (control) tras el sondeo la pantalla ve a otros en las dos camas', [v['2'], v['3']], ['pQ', 'pT']);
    eq('★★ G2 · INTERCAMBIAR_CAMAS manda el paciente de la cama A y el de la B tal como estaban al elegirlas', [d && d.EPISODIO_ABIERTO, d && d.EPISODIO_ABIERTO_B], ['pP', 'pR']);
    eq('   …y las dos camas', [d && d.idCamaA, d && d.idCamaB], ['2', '3']);
    await p.cerrar();
  }

  /* ── G3 · traslado a cama vacía: el destino libre viaja VACÍO (no se omite), aunque la fila conserve un pid viejo ── */
  {
    const p = await abrirG();
    await p.evaluate(() => { mover('2'); mover('5'); });
    const v = await sondear(p, { 5: { OCUPADA: true, PATIENT_ID: 'pZ' } });      // otra persona ingresó en el destino mientras se confirmaba
    await p.evaluate(() => { _ucFin(true); });
    await fin(p);
    const d = await unaSalida(p, 'MOVER_A_CAMA_VACIA');
    eq('G3 · (control) el destino, que estaba libre al elegirlo, ahora lo ocupa otro', v['5'], 'pZ');
    eq('★★ G3 · MOVER_A_CAMA_VACIA manda el origen tal como estaba', d && d.EPISODIO_ABIERTO, 'pP');
    si('★★ …y el destino VACÍO («estaba libre al elegir»): la clave viaja, con cadena vacía, y NO es el pid viejo de la fila ni el de quien llegó',
      con(d, 'EPISODIO_ABIERTO_B') && d.EPISODIO_ABIERTO_B === '', JSON.stringify(d));
    await p.cerrar();
  }

  /* ── G4 · anular un evento, desde el panel abierto: el pid con que se abrió el panel ── */
  const abrirPanelG = async (p, cama) => {
    await regla(p, 'GET_EVO_TURNO', { tipo: 'ok', data: { actual: null, previa: null, pronoAbierto: '' } });
    await p.evaluate(id => { abrirPanel(id, false, false); }, cama);
    await p.waitForTimeout(500);
  };
  {
    const p = await abrirG();
    await abrirPanelG(p, '2');
    eq('G4 · (control) el panel abrió el episodio de la tarjeta', await p.evaluate(() => _episodioAbierto), 'pP');
    const v = await sondear(p, { 2: { PATIENT_ID: 'pQ' } });
    await p.evaluate(() => { anularEvento('pve_ext', 'PVE'); });
    // Con el cuadro de confirmar abierto, la persona (o un aviso) abre OTRA cama: la cama y el episodio ya estaban tomados
    await abrirPanelG(p, '3');
    const ahora = await p.evaluate(() => [v('cBed'), _episodioAbierto]);
    await p.evaluate(() => { _ucFin(true); });
    await fin(p);
    const d = await unaSalida(p, 'ANULAR_EVENTO');
    eq('   …y el sondeo cambió la cama, y el panel de ahora es el de la 3', [v['2'], ahora], ['pQ', ['3', 'pR']]);
    eq('★★ G4 · ANULAR_EVENTO manda la cama y el episodio con que se abrió el panel AL CLIC (no los del panel de ahora)', [d && d.EPISODIO_ABIERTO, d && d.idCama], ['pP', '2']);
    await p.cerrar();
  }

  /* ── G5 · pendientes: el pid se toma al CLIC, antes de pedir la firma (que espera a una persona) ── */
  {
    const p = await abrirG();
    await abrirPanelG(p, '2');
    // La firma tarda: entre el clic y la firma pasa un sondeo (la cama ya es de otro)
    await p.evaluate(() => { window.__firmas = []; window._pedirFirma = () => new Promise(r => { window.__firmas.push(() => r('KIN')); }); });
    await p.evaluate(() => { pasoPendDejar('Medir PIM'); pendEpiCerrar('PEND_VIEJO'); });
    const v = await sondear(p, { 2: { PATIENT_ID: 'pQ' } });
    await abrirPanelG(p, '3');                                   // y entre tanto se abre OTRA cama
    await p.evaluate(() => { window.__firmas.forEach(f => f()); });
    await fin(p);
    const a = await unaSalida(p, 'PEND_ABRIR'), c = await unaSalida(p, 'PEND_CERRAR');
    eq('G5 · (control) mientras se esperaba la firma la cama pasó a otro y se abrió el panel de la 3', [v['2'], await p.evaluate(() => [v('cBed'), _episodioAbierto])], ['pQ', ['3', 'pR']]);
    eq('★★ G5 · PEND_ABRIR manda el episodio con que se abrió el panel', [a && a.EPISODIO_ABIERTO, a && a.idCama], ['pP', '2']);
    eq('★★ G5 · PEND_CERRAR manda el episodio con que se abrió el panel', [c && c.EPISODIO_ABIERTO, c && c.idCama], ['pP', '2']);
    await p.cerrar();
  }

  /* ── G6 · el ➕: el pid de la fila que se mira; y vacío viaja vacío ── */
  const anexarG = (p, pidFila) => p.evaluate(pid => {
    evAbrir('2', null, pid); evTipo('otro');
    $('evDet').value = 'nota de prueba';
    const f = $('evFirma'); f.innerHTML = '<option value="KIN">KIN</option>'; f.value = 'KIN';
  }, pidFila);
  {
    const p = await abrirG();
    await anexarG(p, 'pP');
    const v = await sondear(p, { 2: { PATIENT_ID: 'pQ' } });
    await p.evaluate(() => { evGuardar(); });
    await fin(p);
    const d = await unaSalida(p, 'ANEXAR_EVENTO');
    eq('G6 · (control) la cama ya es de otro', v['2'], 'pQ');
    eq('★★ G6 · ANEXAR_EVENTO manda EPISODIO_ABIERTO = el paciente de la fila con que se abrió el ➕', d && d.EPISODIO_ABIERTO, 'pP');
    eq('   …y el patientId declarado (el respaldo de siempre) sigue ahí, igual', d && d.patientId, 'pP');
    await p.cerrar();
  }
  {
    const p = await abrirG();
    await anexarG(p, '');
    await p.evaluate(() => { evGuardar(); });
    await fin(p);
    const d = await unaSalida(p, 'ANEXAR_EVENTO');
    si('★ G6b · un ➕ sin paciente en la fila manda EPISODIO_ABIERTO VACÍO (la clave viaja, no se omite)', con(d, 'EPISODIO_ABIERTO') && d.EPISODIO_ABIERTO === '', JSON.stringify(d));
    await p.cerrar();
  }

  /* ── G7 · la × de un anexo: el pid de la fila del Registro donde se dibujó ── */
  {
    const p = await abrirG();
    const EVOS = [{ ID_CAMA: '2', TURNO_KEY: '2026-08-10-Dia', PATIENT_ID: 'pP', PAC_NOMBRE: 'Paciente 2', PAC_SEXO: 'M', PAC_EDAD: 61, PAC_DIAGNOSTICO: 'Dx',
      VENT_SOPORTE: 'VM', VENT_MODO: 'ACVC', DIA_ESTADIA: 5, DIAS_VM: 5, PROC_RESUMEN: 'KTM 1', PLAN_FIRMA_KINE: 'KIN',
      ANEXOS: [{ id: 'PROC_A', nombre: 'KTM 1', ts: 't1' }] }];
    await p.evaluate(e => { EVOS_DIA = e; EVO_SET = new Set(['2']); ATAB = 'P'; setTab('P'); renderTabla(); }, EVOS);
    const v = await sondear(p, { 2: { PATIENT_ID: 'pQ' } }, EVOS);
    const hay = await p.evaluate(() => document.querySelectorAll('#notionTable .sello-x').length);
    eq('G7 · (control) el Registro dibujó la × del anexo y la cama ya es de otro', [hay, v['2']], [1, 'pQ']);
    await p.evaluate(() => { document.querySelector('#notionTable .sello-x').click(); });
    await p.evaluate(() => { _ucFin(true); });
    await fin(p);
    const d = await unaSalida(p, 'ANULAR_ANEXO');
    eq('★★ G7 · ANULAR_ANEXO manda el episodio de la fila del Registro (el del anexo), no el de quien ocupa la cama ahora', [d && d.EPISODIO_ABIERTO, d && d.idProc, d && d.idCama], ['pP', 'PROC_A', '2']);
    await p.cerrar();
  }

  /* ── G8 · escala previa a la UCI y medición desde la tarjeta: el pid de la tarjeta al abrir ── */
  {
    const p = await abrirG();
    await p.evaluate(() => { escalaDesdeTarjeta('2', 'barthel'); });
    const v = await sondear(p, { 2: { PATIENT_ID: 'pQ' } });
    await p.evaluate(() => { _escalaOnApply(70, 'items'); });
    await fin(p);
    const d = await unaSalida(p, 'EPISODIO_ESCALA');
    eq('G8 · (control) la cama ya es de otro', v['2'], 'pQ');
    eq('★★ G8 · EPISODIO_ESCALA manda el episodio de la tarjeta al abrir la escala', [d && d.EPISODIO_ABIERTO, d && d.idCama, d && d.escala], ['pP', '2', 'BARTHEL']);
    await p.cerrar();
  }
  {
    const p = await abrirG();
    await p.evaluate(() => { medirDesdeTarjeta('mrc', '2'); });
    const v = await sondear(p, { 2: { PATIENT_ID: 'pQ' } });
    await p.evaluate(() => { for (let i = 1; i <= 6; i++) { $('fMrcD' + i).value = '4'; $('fMrcI' + i).value = '4'; } _evalAplicarTarjeta('mrc'); });
    await fin(p);
    const d = await unaSalida(p, 'EVAL_REGISTRAR');
    eq('G8b · (control) la cama ya es de otro', v['2'], 'pQ');
    eq('★★ G8b · EVAL_REGISTRAR manda el episodio de la tarjeta al abrir la medición', [d && d.EPISODIO_ABIERTO, d && d.idCama, d && d.escala], ['pP', '2', 'MRC']);
    await p.cerrar();
  }

  /* ── G9 · asignar un gas: el pid de la cama elegida, tal como se pintó la bandeja ── */
  {
    const p = await abrirG();
    await p.evaluate(() => {
      _GSA_PEND = [{ ID_GSA: 'g1', ARCHIVO: 'gsa2.pdf', valores: { PH: 7.4 }, FECHA: '2026-08-10', HORA: '08:30', camaSugerida: '2' }];
      $('gsaMod').classList.add('on'); _gsaBandejaPintar();
    });
    const v = await sondear(p, { 2: { PATIENT_ID: 'pQ' } });
    await p.evaluate(() => { $('gsaCama0').value = '2'; gsaBandejaAsignar(0); });
    await p.evaluate(() => { _ucFin(true); });
    await fin(p);
    const d = await unaSalida(p, 'GSA_ASIGNAR');
    eq('G9 · (control) la cama ya es de otro (la bandeja no se repintó)', v['2'], 'pQ');
    eq('★★ G9 · GSA_ASIGNAR manda el paciente de la cama elegida TAL COMO se vio al pintar la bandeja', [d && d.EPISODIO_ABIERTO, d && d.idCama], ['pP', '2']);
    await p.cerrar();
  }

  /* ── G10 · el guardado de la evolución (el que ya lo hacía) sigue mandándolo tras un sondeo ── */
  {
    const p = await abrirGuardar('2', 'p2');
    await p.evaluate(() => { DB[0].PATIENT_ID = 'pQ'; });                  // el sondeo ya entregó otro paciente en la cama
    await apretar(p);
    await p.clock.runFor(30);
    const d = await unaSalida(p, GUARDAR);
    eq('★ G10 · GUARDAR_EVOLUCION sigue mandando el episodio con que se abrió el formulario, aunque la base ya diga otro', d && d.EPISODIO_ABIERTO, 'p2');
    await p.cerrar();
  }

  /* ── G11 · el rechazo por cambio de paciente / CONFLICTO se ve EN ROJO; un error cualquiera, no ── */
  const toastsDe = p => p.evaluate(() => [...document.querySelectorAll('#tc .toast')].map(t => ({
    texto: t.textContent, rojo: t.classList.contains('toast-rojo'), fondo: getComputedStyle(t).backgroundColor, color: getComputedStyle(t).color })));
  for (const caso of [
    { n: 'por gs() · el egreso (VALIDACION con «cambió de paciente»)', accion: 'DAR_ALTA', e: { tipo: 'rechazo', error: ROJO, codigo: 'VALIDACION' }, msg: ROJO, rojo: true,
      correr: () => { egreso('2'); $('egDestino').value = 'Domicilio'; const f = $('egFirma'); f.innerHTML = '<option value="KIN">KIN</option>'; f.value = 'KIN'; confirmarEgreso(); _ucFin(true); } },
    { n: 'por gs() · el egreso (CONFLICTO)', accion: 'DAR_ALTA', e: { tipo: 'rechazo', error: CONFLICTO, codigo: 'CONFLICTO' }, msg: CONFLICTO, rojo: true,
      correr: () => { egreso('2'); $('egDestino').value = 'Domicilio'; const f = $('egFirma'); f.innerHTML = '<option value="KIN">KIN</option>'; f.value = 'KIN'; confirmarEgreso(); _ucFin(true); } },
    { n: 'por api().catch · un pendiente (CONFLICTO)', accion: 'PEND_ABRIR', e: { tipo: 'rechazo', error: CONFLICTO, codigo: 'CONFLICTO' }, msg: CONFLICTO, rojo: true,
      correr: () => { $('cBed').value = '2'; pasoPendDejar('Medir PIM'); } },
    { n: 'por api().catch · la escala (cambió de paciente)', accion: 'EPISODIO_ESCALA', e: { tipo: 'rechazo', error: ROJO, codigo: 'VALIDACION' }, msg: ROJO, rojo: true,
      correr: () => { escalaDesdeTarjeta('2', 'barthel'); _escalaOnApply(70, 'x'); } },
    { n: 'un error CUALQUIERA (VALIDACION sin la frase) NO se pinta de rojo: sigue siendo el aviso de siempre', accion: 'DAR_ALTA', e: { tipo: 'rechazo', error: 'Falta la firma (prueba).', codigo: 'VALIDACION' }, msg: 'Falta la firma (prueba).', rojo: false,
      correr: () => { egreso('2'); $('egDestino').value = 'Domicilio'; const f = $('egFirma'); f.innerHTML = '<option value="KIN">KIN</option>'; f.value = 'KIN'; confirmarEgreso(); _ucFin(true); } },
  ]) {
    const p = await abrirG();
    await regla(p, caso.accion, caso.e);
    await p.evaluate(caso.correr);
    await p.waitForTimeout(400);
    const t = (await toastsDe(p)).filter(x => x.texto.indexOf(caso.msg) > -1);
    eq('★ G11 · ' + caso.n + ': el aviso con el motivo sale', t.length, 1);
    eq('   …' + (caso.rojo ? 'EN ROJO' : 'sin rojo'), t[0] && t[0].rojo, caso.rojo);
    if (caso.rojo) {
      si('   …y el rojo es de TEMA CLARO (fondo claro, texto oscuro)', !!t[0] && claro(t[0].fondo) && !claro(t[0].color), JSON.stringify(t[0]));
      si('   …sin emojis posteriores a 2019 (el ❌ de siempre y texto)', !!t[0] && [...t[0].texto].every(c => c.codePointAt(0) < 0x2800), JSON.stringify(t[0] && t[0].texto));
    }
    await p.cerrar();
  }

  eq('sin errores de JavaScript en ningún escenario', errores.filter(e => !/favicon/.test(e)), []);
  await navegador.close();
  console.log(fails.length ? `\n❌ ${fails.length} FALLOS:\n  - ${fails.join('\n  - ')}` : '\n✅ guardado_seguro_no_confirmado_g17 (embudo, OP_ID y guardar()): la pantalla distingue lo que el servidor contestó de lo que no y no afirma lo que no sabe.');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('❌ la guardia reventó: ' + (e && e.stack || e)); process.exit(1); });
