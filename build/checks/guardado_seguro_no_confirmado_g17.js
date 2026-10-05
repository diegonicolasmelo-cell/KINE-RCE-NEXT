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
// 🪤 RELOJ CONGELADO. El vencimiento de 6 h depende de la hora: `Date` se congela en la página en un día inventado
// (lunes 10-ago-2026, 11:00; ni Fiestas Patrias, ni cambio de turno, ni cierre de año) y se ADELANTA a mano con
// `window.__t`. No se espera nada.
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
const PRELUDIO = ({ modo, t0, boot, exec, almacen, sinUUID }) => {
  const Real = Date;
  function Falso(...a) { return a.length ? new Real(...a) : new Real(window.__t); }
  Falso.now = () => window.__t; Falso.parse = Real.parse; Falso.UTC = Real.UTC; Falso.prototype = Real.prototype;
  if (window.__t === undefined) window.__t = t0;
  window.Date = Falso;

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
  window.__srv = { llamadas: [], cuerpos: [], reglas: {} };
  function decidir(accion, datos, token) {
    window.__srv.llamadas.push({ accion: accion, datos: JSON.parse(JSON.stringify(datos === undefined ? null : datos)), token: token || null });
    const cola = window.__srv.reglas[accion];
    if (cola && cola.length) return cola.shift();
    return { tipo: 'ok', data: DEFECTO[accion] !== undefined ? DEFECTO[accion] : null };
  }
  if (modo === 'gas') {
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler(fail) { return {
      api(accion, datos, token) {
        const r = decidir(accion, datos, token);
        setTimeout(() => {
          if (r.tipo === 'ok') ok({ ok: true, data: r.data });
          else if (r.tipo === 'rechazo') ok(r.sinCodigo ? { ok: false, error: r.error } : { ok: false, error: r.error, codigo: r.codigo });
          else if (r.tipo === 'falla') fail({ message: r.mensaje || 'boom' });
          else if (r.tipo === 'nulo') ok(null);
          /* colgado: nadie contesta */
        }, r.retraso || 0);
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
    const o = Object.assign({ modo: 'gas', almacen: null, sinUUID: false }, opc || {});
    const ctx = await navegador.newContext({ viewport: { width: 1100, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errores.push('[' + o.modo + (o.almacen ? '/' + o.almacen : '') + '] ' + e.message));
    await p.addInitScript(PRELUDIO, { modo: o.modo, t0: T0, boot: BOOT, exec: EXEC_FALSO, almacen: o.almacen, sinUUID: o.sinUUID });
    await p.goto('file://' + IDX);
    await p.waitForTimeout(700);
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

  eq('sin errores de JavaScript en ningún escenario', errores.filter(e => !/favicon/.test(e)), []);
  await navegador.close();
  console.log(fails.length ? `\n❌ ${fails.length} FALLOS:\n  - ${fails.join('\n  - ')}` : '\n✅ guardado_seguro_no_confirmado_g17 (embudo y OP_ID): la pantalla distingue lo que el servidor contestó de lo que no.');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('❌ la guardia reventó: ' + (e && e.stack || e)); process.exit(1); });
