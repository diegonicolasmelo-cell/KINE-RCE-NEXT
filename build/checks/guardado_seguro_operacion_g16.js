// guardado_seguro_operacion_g16.js — EL SELLO DE OPERACIÓN Y EL ID DERIVADO (tanda 2, G16; esta guardia nace en el
// paso 3, 4-oct-2026, con las secciones del sello y del uid; las MATRICES DE MUERTE de los pasos 9 a 11 se suman acá).
//
// 🔴 DE DÓNDE SALE. El guardado de la pantalla tiene un reintento automático (a los 3 s) y el kinesiólogo tiene dos
// dedos: el mismo guardado puede llegar al servidor DOS VECES, y no siempre es inocuo. Re-guardar el mismo turno
// actualiza y no duplica, pero un INGRESO que ya aterrizó contesta «la cama ya está ocupada» al reintento de su propio
// éxito (y la pantalla dice «no se guardó» de algo que sí se guardó), una evaluación se inserta dos veces, un pendiente
// «ya está abierto», una entrega de turno nace con ID 'ENT_'+Date.now() y se duplica, un ajuste de stock suma dos
// veces. Ninguna puerta tiene cómo saber que «esto ya lo hice». El sello se lo da: la pantalla acuña un OP_ID por
// INTENCIÓN (no por clic) y el servidor recuerda, 6 horas, que esa operación ya terminó bien y qué contestó.
//
// LO QUE FIJA ESTA GUARDIA (paso 3):
//   1 · SIN OP_ID TODO IGUAL QUE HOY. Sin él (o con uno mal formado) el servidor no lee ni escribe el caché, y la
//       primera vez con él —el caso normal— es idéntica a la de hoy: mismas hojas, misma respuesta, misma bitácora.
//   2 · LA MISMA OP_ID DOS VECES: la segunda devuelve la misma respuesta ok con `repetida: true` y CERO escrituras
//       (ni a hojas ni al caché), y no repite la fila de la bitácora (la acción ya quedó anotada la primera vez).
//   3 · EL ORDEN DEL SELLO: se CONSULTA y se ESCRIBE dentro del lock, y se escribe DESPUÉS de SpreadsheetApp.flush():
//       un corte entre el sello y el flush dejaría un «hecho» que no está escrito en la planilla.
//   4 · LA HUELLA: mismo OP_ID con contenido distinto (el usuario editó) se EJECUTA y REEMPLAZA el sello; el orden de
//       las claves no cambia la huella; el OP_ID no entra a ella.
//   5 · LO QUE NO SE SELLA: un rechazo (reintentar vuelve a evaluar), una respuesta con data.advertencias[] (el
//       reintento tiene que completar lo que quedó a medias) y una excepción.
//   6 · FAIL-OPEN: si CacheService lanza —al leer o al escribir— la operación corre como hoy.
//   7 · SOLO EL PRIMER conLock DE LA PETICIÓN participa, y el OP_ID de otra acción no choca.
//   8 · OP_ACTUAL: se arma ANTES del servicio (guardarEvolucion muta los datos) y se devuelve a lo que era al terminar,
//       salga como salga el servicio.
//   9 · TEXTO_GENERADO no se sella (pesa y es texto clínico): la repetición lo toma del payload de la repetición.
//  10 · PRIVACIDAD: lo que se guarda en el caché son ids y banderas, jamás un nombre, un RUT ni un texto. Con un
//       paciente de prueba inventado y mirando CADA put que llega al caché.
//  11 · LA APP INSTALADA: el OP_ID viaja por doPost (que llama al mismo api()) y sella igual.
//  12 · uid(prefijo, clave): determinista con OP_ACTUAL, clásico sin ella (los bancos antiguos no cambian).
//  13 · LA FORMA: dónde vive cada pieza.
//
// LO QUE SE SUMA EN EL PASO 9 (4-oct-2026) — LA RECUPERACIÓN EN LAS PUERTAS DE CAMA, secciones 15 a 18:
//  15 · LA MATRIZ DE MUERTE de INTERCAMBIAR_CAMAS, MOVER_A_CAMA_VACIA, DAR_ALTA y LIMPIAR_CAMA: para cada N = 0..total+1 la
//       corrida muere tras la escritura N (la N aterriza y toda posterior lanza aunque un catch la trague), el reintento
//       reenvía el MISMO paquete y el estado final tiene que ser IGUAL al de una corrida limpia. Dos veces por puerta:
//       con OP_ID (ids derivados) y SOLO con el reclamo de episodio (lo que reconoce el «ya hecho» por pid, sin sello).
//       Y a la vista, en CADA corte, que nadie desaparece ni se duplica: el intercambio nunca deja a un paciente borrado de
//       la hoja, el traslado nunca lo deja en dos camas, el alta nunca duplica el egreso (inflaría el REM).
//  16 · LA FORMA de lo que lo hace posible: UNA sola escritura de CAMAS_ESTADO que lleva el cambio (intercambio y traslado),
//       `_camaVacia()` compartida con la limpieza, el id del egreso derivado del paciente, el archivado que no duplica.
//  17 · EL EGRESO SIN PATIENT_ID (un episodio cargado a mano): id derivado de cama y fecha, sin perder a un segundo
//       episodio del mismo día en la misma cama.
//  18 · LA LISTA DE ARCHIVADOS conserva su orden (el más reciente primero) aunque el id del egreso ya no lleve el reloj.
//
// LO QUE SE SUMA EN EL PASO 10 (4-oct-2026) — LA RECUPERACIÓN EN guardarEvolucion, secciones 19 a 23:
//  19 · LA MATRIZ DE MUERTE de GUARDAR_EVOLUCION (N = 0..total+1, mismo OP_ID): un INGRESO sobre cama libre con el PATIENT_ID
//       acuñado, un turno nuevo, el re-guardado de un turno y una TRANSICIÓN de soporte y vía aérea; el estado final tras la
//       muerte y el reintento es el de una corrida limpia y en ningún corte queda un turno, una medición, un procedimiento o un
//       ingreso duplicado. SIN reordenar el flujo: el compromiso sigue siendo la escritura de la cama al final del guardado.
//  20 · LA PRIMERA DIVERGENCIA: DIAS_VM, DIAS_VNI y DIAS_VA se calculan leyendo la CAMA, y tras el compromiso la cama ya absorbió
//       el turno; el reintento daba OTRO número. Con muerte justo tras el compromiso y sin ella (re-guardar el mismo turno).
//  21 · LA SEGUNDA: el hito «vía aérea cambió sin evento» (transicion_sin_evento) se calcula contra la vía aérea de la cama; en el
//       reintento o en cualquier re-guardado la cama ya cambió, no se regenera y el barrido de los hitos del turno lo borraba.
//  22 · LAS COLAS QUE TRAGABAN EL ERROR (mediciones a la serie, cultivo, hito de la medición, reintubación): ahora la respuesta es
//       ok con data.advertencias[], NO se sella y el reintento con el mismo OP_ID las completa sin duplicar.
//  23 · LA FORMA: el flujo no se reordena, la regla vive donde dice el diseño y ninguna cola vuelve a tragarse el error.
//
// Uso: node build/checks/guardado_seguro_operacion_g16.js
//
// 🪤 EL RELOJ VA CONGELADO. Las fechas se INVENTAN (SIM.fecha = 2026-08-10, un lunes lejos de Fiestas Patrias y a las
// 12:00, lejos del cambio de turno) y `Date` se congela en el proceso. Congelado también sirve a otra cosa: el caché
// del banco vence por `Date.now()`, así que un sello no puede «expirar» en mitad de la prueba.
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
const info = t => console.log('ℹ️  ' + t);
const terminar = () => {
  console.log(fails.length ? `\n❌ ${fails.length} fallos:\n  - ${fails.join('\n  - ')}`
    : '\n✅ guardado_seguro_operacion_g16: el sello de operación, el id derivado y la recuperación en las puertas de cama.');
  process.exit(fails.length ? 1 : 0);
};
// Un tramo que revienta no tumba a los demás: da UN rojo con su razón y la guardia sigue (así el rojo de antes de
// arreglar el código se lee entero, en vez de cortarse en la primera sección).
const tramo = (etiqueta, fn) => {
  try { fn(); } catch (e) { console.log('❌ ' + etiqueta + ': reventó (' + (e && e.message) + ')'); fails.push(etiqueta + ' reventó: ' + (e && e.message)); }
};
// Los servicios traducen un error a `err(msg, codigo, e)` (que hace console.error) y api() lo vuelve INTERNO.
const callando = fn => {
  const ce = console.error, cw = console.warn; console.error = () => {}; console.warn = () => {};
  try { return fn(); } finally { console.error = ce; console.warn = cw; }
};

const S = require('../sim/sim_srv.js');
const { api, DB, SIM, CONFIG } = S;
SIM.fecha = '2026-08-10'; SIM.hora = '12:00:00';
// El candado REAL (el de v2/infra_lock.gs) y el banco de muerte, que cuenta cada escritura —el sello del caché es una—.
const ctl = S.activarLockReal();
const M = require('../sim/sim_muerte.js');

// ── Espías de ESTA guardia, por encima de lo del banco ──
// El caché: cada get y cada put que se INTENTA (aunque el de abajo lance), con su TTL. `FALLA_PUT` es una falla solo
// de escritura (la cuota del caché se acaba; leer sigue andando), que `ctl.cache.fallar` no distingue.
const PUTS = [], GETS = [];
let FALLA_PUT = false;
const cacheBase = global.CacheService;
global.CacheService = { getScriptCache: () => {
  const c = cacheBase.getScriptCache();
  return Object.assign({}, c, {
    get: k => { GETS.push(k); return c.get(k); },
    put: (k, v, seg) => { PUTS.push({ k, v, seg }); if (FALLA_PUT) throw new Error('sim: CacheService.put sin cuota'); return c.put(k, v, seg); },
  });
} };
// El flush: en cuántas escrituras iba el banco cuando se pidió (si no se pidió antes del sello, no aparece).
const FLUSHES = [];
const flushBase = global.SpreadsheetApp.flush;
global.SpreadsheetApp.flush = () => { FLUSHES.push(M.total()); return flushBase(); };

const FOTO0 = M.foto();
const reset = () => {
  M.restaurar(FOTO0); M.reiniciar();
  PUTS.length = 0; GETS.length = 0; FLUSHES.length = 0; FALLA_PUT = false;
  ctl.cache.fallar(false); ctl.antesDelCuerpo = null;
  EJEC = 0; CUERPO = null;
};

// ── Un servicio de juguete que pasa por el conLock REAL y por el dispatcher REAL ──
// Las acciones son las de verdad (api.gs las audita y les arma el sello); el cuerpo es el de la prueba: escribe UNA fila
// (para contar) y NO llama a flush por su cuenta, así que un flush antes del sello solo puede venir de conLock.
let EJEC = 0, CUERPO = null;
global.guardarSugerencia = (datos, ctx) => conLock(() => { EJEC++; return CUERPO(datos, ctx); });
global.setSugerenciaEstado = (datos) => conLock(() => { EJEC++; return CUERPO(datos); });
const escribeUna = extra => () => {
  repoInsertar('TIMELINE', { ID_HITO: 'H' + EJEC, ID_CAMA: '3', TEXTO: 'fila de prueba ' + EJEC });
  return ok(Object.assign({ idCama: '3', id: 'S1', accion: 'sugerencia', entidad: 'SUGERENCIAS' }, extra || {}));
};
const ACC = 'GUARDAR_SUGERENCIA';
const OPID = 'op_prueba_0001';
const llama = (accion, datos) => callando(() => api(accion, datos, null));
const clonar = o => JSON.parse(JSON.stringify(o));
const payload = extra => Object.assign({ OP_ID: OPID, idCama: '3', texto: 'sugerencia de prueba' }, extra || {});
const opsDelCaché = () => PUTS.filter(p => /^op\|/.test(p.k));
const claveSello = (accion, id) => 'op|' + accion + '|' + id;

// Lo que la pantalla manda en un formulario (claves en mayúsculas) y los ingresos de siempre.
const TK = '2026-08-10-Dia';
const evo = (idCama, extra) => Object.assign({
  ID_CAMA: String(idCama), TURNO_KEY: TK, PLAN_FIRMA_KINE: 'DMV',
  VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', VENT_MODO: 'ACVC',
  VENT_VT: 450, VENT_FR: 16, VENT_PEEP: 8, VENT_FIO2: 50, HEMO_ESTADO: 'Estable', SED_TIPO: 'Sin sedación',
}, extra || {});
const ingreso = (idCama, extra) => Object.assign({ idCama: String(idCama), nombre: 'Paciente Alfa', edad: 61, sexo: 'M',
  diagnostico: 'Dx de prueba', fechaIngreso: '2026-08-08', viaAerea: 'TOT', soporte: 'VM', modo: 'ACVC', firmaKine: 'DMV' }, extra || {});
const camaDe = id => DB.CAMAS_ESTADO.find(c => String(c.ID_CAMA) === String(id)) || {};
// La respuesta sin lo que cambia de una corrida a otra (el contador de uuid del simulador).
const normal = r => JSON.stringify(r).replace(/uuid-?\d+/g, '<id>');

/* ══ 0 · LAS PIEZAS EXISTEN ═══════════════════════════════════════════════ */
console.log('0 · Las piezas del sello existen');
tramo('piezas', () => {
  eq('var OP_ACTUAL vive en el ámbito global (infra_lock.gs la declara; api.gs la asigna)', typeof global.OP_ACTUAL, 'object');
  ['_huellaPayload', '_selloLeer', '_selloGuardar', '_selloDepurar'].forEach(f =>
    eq('   · ' + f + ' existe (infra_lock.gs)', typeof global[f], 'function'));
  eq('   · _opDe existe (api.gs)', typeof global._opDe, 'function');
  eq('   · uid acepta (prefijo, clave)', global.uid.length, 2);
});

/* ══ 1 · SIN OP_ID, TODO IGUAL QUE HOY ════════════════════════════════════ */
console.log('\n1 · Sin OP_ID (o con uno mal formado) el servidor ni lee ni escribe el caché');
tramo('sin OP_ID', () => {
  reset(); CUERPO = escribeUna();
  const a = llama(ACC, { idCama: '3', texto: 'x' }), b = llama(ACC, { idCama: '3', texto: 'x' });
  eq('dos llamadas iguales sin OP_ID ejecutan las dos veces (como hoy)', EJEC, 2);
  eq('★ …sin tocar el caché: ni un put', PUTS.length, 0);
  eq('   …ni un get', GETS.length, 0);
  eq('   …y ninguna respuesta dice «repetida»', [a, b].map(r => r.data && r.data.repetida).join(','), ',');

  // 🪤 Un OP_ID MAL FORMADO se trata como ausente: no se rechaza (el caché es una ayuda, no una puerta) y no se sella.
  const MALOS = [['vacío', ''], ['corto', 'op_123'], ['con espacios', 'op prueba 0001'], ['de 65 caracteres', 'o'.repeat(65)],
    ['con tilde', 'op_ñandú_0001'], ['con barra vertical (se colaría en la clave)', 'op|prueba|0001'], ['un número', 12345678],
    ['un objeto', { a: 1 }], ['null', null], ['una lista', ['op_prueba_0001']]];
  MALOS.forEach(([etq, malo]) => {
    reset(); CUERPO = escribeUna();
    const r1 = llama(ACC, payload({ OP_ID: malo })), r2 = llama(ACC, payload({ OP_ID: malo }));
    eq('OP_ID ' + etq + ': corre las dos veces, no se rechaza y no se sella',
      [EJEC, r1.ok, r2.ok, PUTS.length, GETS.length].join('/'), '2/true/true/0/0');
  });
  // El mínimo (8) y el máximo (64) SÍ valen.
  [['8 caracteres', 'a1_B-c2d'], ['64 caracteres', 'k'.repeat(64)]].forEach(([etq, bueno]) => {
    reset(); CUERPO = escribeUna();
    llama(ACC, payload({ OP_ID: bueno })); const r2 = llama(ACC, payload({ OP_ID: bueno }));
    eq('OP_ID de ' + etq + ': vale (la segunda es repetida)', EJEC + '/' + (r2.data && r2.data.repetida), '1/true');
  });

  // El ingreso REAL, sin OP_ID: el reintento de su propio éxito sigue diciendo «ya está ocupada». Es lo que hoy ve la
  // pantalla (y lo que el sello viene a arreglar); sin OP_ID tiene que seguir exactamente igual.
  reset();
  const i1 = llama('INGRESAR_PACIENTE', ingreso('6')), i2 = llama('INGRESAR_PACIENTE', ingreso('6'));
  eq('INGRESAR_PACIENTE real sin OP_ID: el primero entra', i1.ok, true);
  eq('   …y el reintento sigue rechazado como hoy («ya está ocupada»)', i2.ok + '/' + i2.codigo + '/' + /ya est[aá] ocupada/.test(i2.error || ''), 'false/VALIDACION/true');
  eq('   …sin tocar el caché', PUTS.length + '/' + GETS.length, '0/0');
});

/* ══ 2 · LA MISMA OP_ID DOS VECES ═════════════════════════════════════════ */
console.log('\n2 · La misma OP_ID dos veces: la segunda es la misma respuesta, repetida, con CERO escrituras');
tramo('misma OP_ID', () => {
  reset(); CUERPO = escribeUna();
  M.reiniciar();
  const r1 = llama(ACC, payload());
  const reg1 = M.registro();
  const n1 = M.total();
  eq('la primera vez ejecuta y contesta ok', EJEC + '/' + r1.ok, '1/true');
  si('   …y NO dice «repetida»', !(r1.data && r1.data.repetida));
  eq('★ el sello es UN put en el caché, con la clave «op|ACCION|OP_ID»', opsDelCaché().map(p => p.k).join(','), claveSello(ACC, OPID));
  eq('   …con el TTL máximo del caché (6 h = 21600 s)', (opsDelCaché()[0] || {}).seg, 21600);
  let sello = null; try { sello = JSON.parse((opsDelCaché()[0] || {}).v); } catch (e) { /* abajo */ }
  si('   …y el valor es un JSON con la huella (h), los datos depurados (d) y la hora (t)', sello && typeof sello.h === 'string' && sello.h && sello.d && typeof sello.d === 'object' && typeof sello.t === 'number');
  si('   …y la clave cabe holgada en los 250 caracteres que admite el caché', claveSello('MOVER_VENTILADORES_LOTE', 'k'.repeat(64)).length < 250);
  eq('★ el sello es la ÚLTIMA escritura (después de todas las de las hojas)', reg1[reg1.length - 1], 'CacheService.put(' + claveSello(ACC, OPID) + ')');
  eq('   …y hubo UNA escritura de hoja antes que él', n1 + '/' + reg1[0], '2/repoInsertar(TIMELINE)');
  const filas1 = DB.AUDIT_LOG.length, snap = M.instantanea();

  M.reiniciar();
  const r2 = llama(ACC, clonar(payload()));            // otra petición: un objeto nuevo con el mismo contenido
  eq('★ la segunda NO ejecuta el servicio', EJEC, 1);
  eq('★★ …y escribe CERO (ni hojas ni el caché)', M.total(), 0);
  eq('   …contesta ok y marca repetida', r2.ok + '/' + (r2.data && r2.data.repetida), 'true/true');
  const sinRep = d => { const o = Object.assign({}, d); delete o.repetida; return o; };
  eq('★ …y es la MISMA respuesta (los ids y las banderas de la primera)', JSON.stringify(sinRep(r2.data)), JSON.stringify(r1.data));
  eq('   …la base queda exactamente igual', M.instantanea() === snap, true);
  eq('★ la bitácora no repite la fila de la acción (ya quedó anotada la primera vez)', DB.AUDIT_LOG.length, filas1);
  const r3 = llama(ACC, payload());
  eq('una tercera, la misma historia (el sello no se consume)', EJEC + '/' + (r3.data && r3.data.repetida) + '/' + M.total(), '1/true/0');
  eq('   …y no vuelve a escribir el sello', opsDelCaché().length, 1);

  // El caso que importa: el INGRESO REAL, cuyo reintento hoy dice «la cama ya está ocupada».
  reset();
  M.reiniciar();
  const i1 = llama('INGRESAR_PACIENTE', ingreso('6', { OP_ID: 'op_ingreso_0001' }));
  const antes = M.instantanea();
  const filasAntes = DB.AUDIT_LOG.length;
  M.reiniciar();
  const i2 = llama('INGRESAR_PACIENTE', ingreso('6', { OP_ID: 'op_ingreso_0001' }));
  eq('★ INGRESAR_PACIENTE: el primero entra', i1.ok, true);
  eq('★★ …y el reintento de su propio éxito contesta OK repetido (hoy: «la cama ya está ocupada»)', i2.ok + '/' + (i2.data && i2.data.repetida), 'true/true');
  eq('   …con el MISMO paciente (el patientId de la primera respuesta)', i2.data && i2.data.patientId, i1.data.patientId);
  eq('   …con cero escrituras y la base idéntica', M.total() + '/' + (M.instantanea() === antes), '0/true');
  eq('   …sin una segunda fila de «INGRESAR_PACIENTE» en la bitácora', DB.AUDIT_LOG.length, filasAntes);
  eq('   …y la cama sigue siendo de ese paciente', camaDe('6').PATIENT_ID, i1.data.patientId);

  // La primera vez con OP_ID es IDÉNTICA a la de hoy: mismas hojas, misma respuesta, misma bitácora.
  reset();
  const sinOp = llama('INGRESAR_PACIENTE', ingreso('6'));
  const e1 = llama('GUARDAR_EVOLUCION', evo('6', { EPISODIO_ABIERTO: '', RESP_KTR_CANT: 2 }));
  const foto1 = M.instantanea(), r1Sin = normal(sinOp) + normal(e1);
  reset();
  const conOp = llama('INGRESAR_PACIENTE', ingreso('6', { OP_ID: 'op_ingreso_0002' }));
  const e2 = llama('GUARDAR_EVOLUCION', evo('6', { EPISODIO_ABIERTO: '', RESP_KTR_CANT: 2, OP_ID: 'op_evolucion_0002' }));
  // 🪤 El simulador guarda en la fila TODAS las claves del payload (repo.gs, en producción, escribe solo las columnas del
  // esquema: así el EPISODIO_ABIERTO, que ya viaja, tampoco llega a la planilla). Por eso se compara sin la clave OP_ID;
  // que el OP_ID no sea columna lo ata la sección 14.
  const sinOpId = t => t.replace(/"OP_ID":"[^"]*",/g, '').replace(/,"OP_ID":"[^"]*"/g, '');
  eq('★ con OP_ID, la PRIMERA vez deja las hojas, la configuración y la bitácora idénticas a las de sin OP_ID', sinOpId(M.instantanea()) === foto1, true);
  eq('   …y las respuestas también (salvo el contador de uuid del simulador)', normal(conOp) + normal(e2), r1Sin);
});

/* ══ 3 · EL ORDEN: DENTRO DEL LOCK, Y DESPUÉS DEL FLUSH ═══════════════════ */
console.log('\n3 · El sello se consulta y se escribe DENTRO del lock, y se escribe DESPUÉS de SpreadsheetApp.flush()');
tramo('orden del sello', () => {
  reset(); CUERPO = escribeUna();
  const tomadoAlLeer = [], tomadoAlGuardar = [];
  const leerOrig = global._selloLeer, guardarOrig = global._selloGuardar;
  global._selloLeer = function () { tomadoAlLeer.push(ctl.estado().tomado); return leerOrig.apply(this, arguments); };
  global._selloGuardar = function () { tomadoAlGuardar.push(ctl.estado().tomado); return guardarOrig.apply(this, arguments); };
  try { llama(ACC, payload()); } finally { global._selloLeer = leerOrig; global._selloGuardar = guardarOrig; }
  eq('★ el sello se CONSULTA con el candado TOMADO', tomadoAlLeer.join(','), 'true');
  eq('★ el sello se ESCRIBE con el candado TOMADO', tomadoAlGuardar.join(','), 'true');

  // El flush: el cuerpo de juguete NO lo llama, así que si aparece es de conLock. Tiene que caer DESPUÉS de la última
  // escritura de hoja y ANTES del put del sello (que es la escritura número 2).
  eq('★ conLock pide el flush antes de sellar (el servicio de juguete no lo llama)', FLUSHES.join(','), '1');
  eq('   …o sea, después de la escritura de hoja (1) y antes del sello (2)', M.registro().join(' | '), 'repoInsertar(TIMELINE) | CacheService.put(' + claveSello(ACC, OPID) + ')');

  // 🔴 Si el flush falla, NO se sella: un «hecho» que quizá no está escrito es peor que no recordar.
  reset(); CUERPO = escribeUna();
  const fl = global.SpreadsheetApp.flush;
  global.SpreadsheetApp.flush = () => { throw new Error('sim: flush falló'); };
  let r;
  try { r = llama(ACC, payload()); } finally { global.SpreadsheetApp.flush = fl; }
  eq('★ flush que lanza: la operación igual contesta ok (el sello es una ayuda, no un requisito)…', r.ok, true);
  eq('   …pero NO se sella', PUTS.length, 0);
  const r2 = llama(ACC, payload());
  eq('   …y el reintento ejecuta de nuevo', EJEC + '/' + (r2.data && r2.data.repetida), '2/undefined');
});

/* ══ 4 · LA HUELLA ════════════════════════════════════════════════════════ */
console.log('\n4 · La huella: contenido distinto con el mismo OP_ID se ejecuta y REEMPLAZA el sello');
tramo('huella', () => {
  reset(); CUERPO = escribeUna();
  const A = payload({ texto: 'versión A' }), B = payload({ texto: 'versión B (el usuario editó)' });
  llama(ACC, clonar(A));
  eq('A: ejecuta', EJEC, 1);
  const a2 = llama(ACC, clonar(A));
  eq('A otra vez: repetida (no ejecuta)', EJEC + '/' + (a2.data && a2.data.repetida), '1/true');
  const b1 = llama(ACC, clonar(B));
  eq('★ B (mismo OP_ID, otro contenido): se EJECUTA, no se rechaza', EJEC + '/' + b1.ok + '/' + (b1.data && b1.data.repetida), '2/true/undefined');
  eq('   …y reemplaza el sello (un put más con la MISMA clave)', opsDelCaché().map(p => p.k).join(',') + '|' + new Set(opsDelCaché().map(p => p.k)).size, [claveSello(ACC, OPID), claveSello(ACC, OPID)].join(',') + '|1');
  const hs = opsDelCaché().map(p => JSON.parse(p.v).h);
  si('   …con otra huella', hs.length === 2 && hs[0] !== hs[1]);
  const b2 = llama(ACC, clonar(B));
  eq('B otra vez: repetida', EJEC + '/' + (b2.data && b2.data.repetida), '2/true');
  const a3 = llama(ACC, clonar(A));
  eq('★ …y A ya NO está sellada (el sello de B lo reemplazó): A ejecuta de nuevo', EJEC + '/' + (a3.data && a3.data.repetida), '3/undefined');

  // La huella es del CONTENIDO, no del orden en que llegaron las claves ni del OP_ID.
  reset(); CUERPO = escribeUna();
  const P = { OP_ID: OPID, idCama: '3', z: [1, { b: 2, a: 1 }], texto: 'orden', anidado: { y: 'u', x: ['p', 'q'] } };
  llama(ACC, P);
  const Q = { anidado: { x: ['p', 'q'], y: 'u' }, texto: 'orden', z: [1, { a: 1, b: 2 }], idCama: '3', OP_ID: OPID };
  const q = llama(ACC, Q);
  eq('★ las mismas claves en otro orden (también las anidadas) son el MISMO contenido', EJEC + '/' + (q.data && q.data.repetida), '1/true');
  const CAMBIOS = [
    ['un valor anidado', () => Object.assign(clonar(P), { anidado: { x: ['p', 'q'], y: 'v' } })],
    ['el orden de una LISTA (ese sí cuenta)', () => Object.assign(clonar(P), { anidado: { x: ['q', 'p'], y: 'u' } })],
    ['una clave de más', () => Object.assign(clonar(P), { extra: 1 })],
    ['una clave de menos', () => { const o = clonar(P); delete o.texto; return o; }],
    ['un número que antes era texto', () => Object.assign(clonar(P), { idCama: 3 })],
  ];
  CAMBIOS.forEach(([etq, mk]) => {
    const antes = EJEC;
    llama(ACC, mk());
    eq('   ' + etq + ': es otro contenido, ejecuta', EJEC - antes, 1);
    // Lo deja sellado con la huella nueva: se vuelve a la original para que el siguiente caso parta igual que éste.
    llama(ACC, clonar(P));
  });
  // `undefined` no existe en el JSON que viaja: una clave con undefined es lo mismo que una ausente.
  reset(); CUERPO = escribeUna();
  llama(ACC, { OP_ID: OPID, idCama: '3', texto: 'u' });
  const u = llama(ACC, { OP_ID: OPID, idCama: '3', texto: 'u', nada: undefined });
  eq('   una clave con undefined (que no viaja por JSON) es lo mismo que una ausente', EJEC + '/' + (u.data && u.data.repetida), '1/true');
});

/* ══ 5 · LO QUE NO SE SELLA ═══════════════════════════════════════════════ */
console.log('\n5 · Un rechazo, una respuesta con advertencias y una excepción NO se sellan');
tramo('no se sella', () => {
  ['VALIDACION', 'CONFLICTO', 'INTERNO', 'NO_ENCONTRADO'].forEach(cod => {
    reset();
    let n = 0;
    CUERPO = () => (++n === 1) ? err('rechazo de prueba ' + cod, cod) : escribeUna()();
    const r1 = llama(ACC, payload());
    eq('★ ' + cod + ': el rechazo se devuelve tal cual…', r1.ok + '/' + r1.codigo, 'false/' + cod);
    eq('   …y NO se sella', opsDelCaché().length, 0);
    const r2 = llama(ACC, payload());
    eq('   …el reintento vuelve a EVALUAR y ahora entra', EJEC + '/' + r2.ok + '/' + (r2.data && r2.data.repetida), '2/true/undefined');
    eq('   …y esa vez sí se sella', opsDelCaché().length, 1);
  });

  reset();
  let k = 0;
  CUERPO = () => { k++; repoInsertar('TIMELINE', { ID_HITO: 'AV' + k }); return ok({ idCama: '3', accion: 'a', advertencias: ['la cola de evaluaciones falló'] }); };
  const a1 = llama(ACC, payload()), a2 = llama(ACC, payload());
  eq('★ ok con data.advertencias[]: se devuelve (con su aviso)…', a1.ok + '/' + (a1.data.advertencias || []).length, 'true/1');
  eq('   …y NO se sella: el reintento tiene que completar lo que quedó a medias', opsDelCaché().length, 0);
  eq('   …el reintento ejecuta (no es una repetida)', EJEC + '/' + (a2.data && a2.data.repetida), '2/undefined');
  reset(); CUERPO = () => { repoInsertar('TIMELINE', { ID_HITO: 'AV-vacio' }); return ok({ idCama: '3', accion: 'a', advertencias: [] }); };
  llama(ACC, payload());
  eq('   …una lista de advertencias VACÍA no es una advertencia: se sella', opsDelCaché().length, 1);

  reset();
  CUERPO = () => { throw new Error('el servicio reventó'); };
  const x = llama(ACC, payload());
  eq('★ una excepción del servicio: api() la vuelve INTERNO…', x.ok + '/' + x.codigo, 'false/INTERNO');
  eq('   …y no se sella', opsDelCaché().length, 0);
  eq('   …y el candado quedó libre', ctl.estado().tomado, false);
  CUERPO = escribeUna();
  const y = llama(ACC, payload());
  eq('   …y el reintento ejecuta', y.ok + '/' + EJEC, 'true/2');
});

/* ══ 6 · FAIL-OPEN ════════════════════════════════════════════════════════ */
console.log('\n6 · Si CacheService falla, la operación corre como hoy (fail-open)');
tramo('fail-open', () => {
  reset(); CUERPO = escribeUna();
  ctl.cache.fallar(true);
  let r1, r2, lanzo = null;
  try { r1 = llama(ACC, payload()); r2 = llama(ACC, payload()); } catch (e) { lanzo = e.message; }
  eq('★ con el caché caído (get y put lanzan) la operación NO revienta', lanzo, null);
  eq('   …contesta ok, sin «repetida»', [r1 && r1.ok, r1 && r1.data && r1.data.repetida].join('/'), 'true/');
  eq('   …y la segunda ejecuta otra vez (no hay sello que la reconozca: así era hoy)', EJEC + '/' + (r2 && r2.ok), '2/true');
  eq('   …y el candado quedó libre', ctl.estado().tomado, false);
  ctl.cache.fallar(false);
  const r3 = llama(ACC, payload()), r4 = llama(ACC, payload());
  eq('★ cuando el caché vuelve, vuelve a sellar', EJEC + '/' + (r4.data && r4.data.repetida), '3/true');

  reset(); CUERPO = escribeUna();
  FALLA_PUT = true;
  const w1 = llama(ACC, payload());
  eq('★ si solo falla ESCRIBIR el sello (la cuota), la operación ya hecha contesta ok igual', w1.ok + '/' + (w1.data && w1.data.repetida), 'true/undefined');
  eq('   …y la fila quedó escrita', DB.TIMELINE.length, 1);
  FALLA_PUT = false;
  const w2 = llama(ACC, payload());
  eq('   …sin sello, el reintento ejecuta (la capa durable de los pasos 9 a 11 es la que lo cubre)', EJEC + '/' + (w2.data && w2.data.repetida), '2/undefined');

  // El caché que falla DESPUÉS de haber sellado: la repetida no se puede reconocer y corre como hoy.
  reset(); CUERPO = escribeUna();
  llama(ACC, payload());
  ctl.cache.fallar(true);
  const v = llama(ACC, payload());
  eq('   un sello ya escrito pero el caché cae al leer: corre como hoy (no revienta)', v.ok + '/' + EJEC, 'true/2');
  ctl.cache.fallar(false);
});

/* ══ 7 · EL PRIMER conLock Y LAS OTRAS ACCIONES ═══════════════════════════ */
console.log('\n7 · Solo el primer conLock de la petición participa; el mismo OP_ID en otra acción no choca');
tramo('primer conLock', () => {
  reset();
  global.guardarSugerencia = () => {
    const a = conLock(() => { EJEC++; repoInsertar('TIMELINE', { ID_HITO: 'PRIMERO' }); return ok({ idCama: '3', accion: 'primera' }); });
    const b = conLock(() => { EJEC++; repoInsertar('TIMELINE', { ID_HITO: 'SEGUNDO' + EJEC }); return ok({ idCama: '3', accion: 'segunda' }); });
    return b;
  };
  const r1 = llama(ACC, payload());
  eq('un servicio con DOS conLock seguidos: corren los dos cuerpos', EJEC + '/' + r1.ok, '2/true');
  eq('★ …y solo el primero sella (UN put)', opsDelCaché().length, 1);
  const r2 = llama(ACC, payload());
  eq('★ …y el segundo conLock NO consulta el sello: devuelve lo suyo y no la respuesta guardada del primero',
    (r2.data && r2.data.accion) + '/' + (r2.data && r2.data.repetida), 'segunda/undefined');
  global.guardarSugerencia = (datos, ctx) => conLock(() => { EJEC++; return CUERPO(datos, ctx); });

  reset(); CUERPO = escribeUna();
  llama('GUARDAR_SUGERENCIA', payload());
  llama('SET_SUGERENCIA_ESTADO', payload());
  eq('★ el MISMO OP_ID en otra acción es otra operación: ejecuta', EJEC, 2);
  eq('   …cada una con su propia clave en el caché', opsDelCaché().map(p => p.k).sort().join(','), [claveSello('GUARDAR_SUGERENCIA', OPID), claveSello('SET_SUGERENCIA_ESTADO', OPID)].sort().join(','));
  const re = llama('SET_SUGERENCIA_ESTADO', payload());
  eq('   …y la repetida de la segunda se reconoce en la suya', EJEC + '/' + (re.data && re.data.repetida), '2/true');

  // Una petición que NO es una escritura auditada (una lectura) no se sella aunque traiga OP_ID.
  reset();
  llama('GET_CATALOGO', { tipo: 'FASE_CLINICA', OP_ID: OPID });
  eq('una lectura con OP_ID no toca el caché', PUTS.length + '/' + GETS.length, '0/0');
});

/* ══ 8 · LA CARRERA: LA CONSULTA ESTÁ DENTRO DEL LOCK ═════════════════════ */
console.log('\n8 · «Mientras esperaba el candado, la otra petición (el original) terminó»: el reintento la ve');
tramo('carrera', () => {
  reset(); CUERPO = escribeUna();
  let totalAlGancho = -1, oaDentro = null, oaDespues = null, respGancho = null;
  ctl.antesDelCuerpo = () => {
    respGancho = llama(ACC, payload());              // el ORIGINAL entra primero, entero, con su propio conLock
    totalAlGancho = M.total();
    oaDentro = (global.OP_ACTUAL && global.OP_ACTUAL.id) || null;
  };
  M.reiniciar();
  const nuestra = llama(ACC, clonar(payload()));     // el reintento de 3 s, que esperaba el candado
  oaDespues = (global.OP_ACTUAL && global.OP_ACTUAL.id) || null;
  eq('el original entró primero y escribió', respGancho && respGancho.ok && totalAlGancho >= 2, true);
  eq('★ el reintento, ya con el candado, ve el sello del original: NO ejecuta', EJEC, 1);
  eq('★★ …y no escribe NADA después de lo del original', M.total() - totalAlGancho, 0);
  eq('   …contesta ok y repetida', nuestra.ok + '/' + (nuestra.data && nuestra.data.repetida), 'true/true');
  eq('★ el api() anidado (el simulador de la concurrencia en un solo hilo) devuelve OP_ACTUAL a lo que era: la petición de afuera la conserva', oaDentro, OPID);
  eq('   …y al terminar todo no queda ninguna', oaDespues, null);
});

/* ══ 9 · OP_ACTUAL: SE ARMA ANTES, SE DEVUELVE DESPUÉS ════════════════════ */
console.log('\n9 · OP_ACTUAL se arma ANTES del servicio y se devuelve a lo que era, salga como salga');
tramo('OP_ACTUAL', () => {
  reset();
  let visto = null, sinOp = 'sin ver';
  CUERPO = (datos) => {
    visto = global.OP_ACTUAL ? JSON.parse(JSON.stringify(global.OP_ACTUAL)) : null;
    datos.TEXTO_GENERADO = 'texto que el servicio escribió encima';      // guardarEvolucion muta los datos
    return escribeUna()();
  };
  llama(ACC, payload({ TEXTO_GENERADO: '  texto de la pantalla  ' }));
  si('★ durante el servicio hay una OP_ACTUAL', visto);
  eq('   …con el id del OP_ID', visto && visto.id, OPID);
  eq('   …con la acción', visto && visto.accion, ACC);
  si('   …con la huella del payload (un texto corto, no el payload)', visto && typeof visto.h === 'string' && visto.h.length > 3 && visto.h.length < 40);
  eq('★ …y con el TEXTO_GENERADO tal como llegó (recortado), capturado ANTES de que el servicio lo mutara', visto && visto.texto, 'texto de la pantalla');
  eq('★ al terminar OP_ACTUAL vuelve a null (no se filtra a la petición siguiente)', global.OP_ACTUAL, null);

  reset(); CUERPO = () => { sinOp = global.OP_ACTUAL; return escribeUna()(); };
  llama(ACC, { idCama: '3' });
  eq('sin OP_ID no se arma ninguna OP_ACTUAL (null durante el servicio)', sinOp, null);

  reset(); CUERPO = () => err('rechazo', 'VALIDACION');
  llama(ACC, payload());
  eq('tras un rechazo: null', global.OP_ACTUAL, null);
  reset(); CUERPO = () => { throw new Error('boom'); };
  llama(ACC, payload());
  eq('★ tras una excepción del servicio: null (el finally)', global.OP_ACTUAL, null);
  reset(); CUERPO = escribeUna();
  llama(ACC, payload()); llama(ACC, payload());
  eq('tras una repetida: null', global.OP_ACTUAL, null);
});

/* ══ 10 · TEXTO_GENERADO NO SE SELLA ══════════════════════════════════════ */
console.log('\n10 · TEXTO_GENERADO no se sella: la repetición lo toma del payload de la repetición');
tramo('TEXTO_GENERADO', () => {
  reset();
  const ing = llama('INGRESAR_PACIENTE', ingreso('6'));
  const PID = camaDe('6').PATIENT_ID;
  const TEXTO = 'Texto del turno redactado por la pantalla: paciente estable, sin cambios en el soporte.';
  const mk = extra => evo('6', Object.assign({ EPISODIO_ABIERTO: PID, OP_ID: 'op_evolucion_0001', TEXTO_GENERADO: TEXTO, RESP_KTR_CANT: 2 }, extra || {}));
  M.reiniciar();
  const g1 = llama('GUARDAR_EVOLUCION', mk());
  const snap = M.instantanea();
  eq('el guardado entra y devuelve el texto de la pantalla', g1.ok + '/' + (g1.data && g1.data.TEXTO_GENERADO), 'true/' + TEXTO);
  const sello = opsDelCaché().map(p => p.v).join('');
  eq('★ el texto NO está en lo que se guardó en el caché', sello.indexOf('paciente estable') > -1, false);
  M.reiniciar();
  const g2 = llama('GUARDAR_EVOLUCION', clonar(mk()));
  eq('★ la repetición es ok y repetida, con cero escrituras', g2.ok + '/' + (g2.data && g2.data.repetida) + '/' + M.total(), 'true/true/0');
  eq('★★ …y devuelve el TEXTO_GENERADO: el del payload de la repetición (la pantalla lo muestra como texto definitivo)', g2.data && g2.data.TEXTO_GENERADO, TEXTO);
  eq('   …con el patientId, que la pantalla toma para quedar protegida', g2.data && g2.data.patientId, PID);
  eq('   …y la base quedó igual', M.instantanea() === snap, true);
  // Con espacios alrededor: el servicio devuelve el texto recortado y la repetición también.
  reset();
  llama('INGRESAR_PACIENTE', ingreso('6')); const PID2 = camaDe('6').PATIENT_ID;
  const mk2 = () => evo('6', { EPISODIO_ABIERTO: PID2, OP_ID: 'op_evolucion_0003', TEXTO_GENERADO: '  ' + TEXTO + '  ' });
  const h1 = llama('GUARDAR_EVOLUCION', mk2()), h2 = llama('GUARDAR_EVOLUCION', mk2());
  eq('   un texto con espacios de más: la primera respuesta y la repetida dicen lo mismo', (h2.data && h2.data.TEXTO_GENERADO) === (h1.data && h1.data.TEXTO_GENERADO), true);
  // Sin texto en el payload (API sin navegador): el servicio genera el suyo; la repetición no lo tiene y dice vacío,
  // que es lo que la pantalla ya sabe leer (`r.TEXTO_GENERADO || genTexto()`).
  reset();
  llama('INGRESAR_PACIENTE', ingreso('6')); const PID3 = camaDe('6').PATIENT_ID;
  const sinTexto = () => evo('6', { EPISODIO_ABIERTO: PID3, OP_ID: 'op_evolucion_0004' });
  const s1 = llama('GUARDAR_EVOLUCION', sinTexto()), s2 = llama('GUARDAR_EVOLUCION', sinTexto());
  si('   sin TEXTO_GENERADO en el payload, el servicio generó el suyo', s1.data && s1.data.TEXTO_GENERADO && s1.data.TEXTO_GENERADO.length > 20);
  eq('   …y la repetición lo devuelve vacío (el texto del motor no se guarda en el caché; la pantalla usa el suyo)', s2.data && s2.data.TEXTO_GENERADO, '');
  eq('   …y es repetida', s2.data && s2.data.repetida, true);
});

/* ══ 11 · PRIVACIDAD: SOLO IDS Y BANDERAS ═════════════════════════════════ */
console.log('\n11 · Lo que va al caché son ids y banderas: nunca un nombre, un RUT ni un texto');
tramo('privacidad', () => {
  reset();
  // Un paciente INVENTADO con datos que no deben aparecer en ningún sello.
  const NOMBRE = 'Paciente Alfa', RUT = '11111111-1', DX = 'Dx secreto de prueba', TEXTO = 'Texto clinico privado de prueba';
  llama('INGRESAR_PACIENTE', ingreso('6', { OP_ID: 'op_ingreso_0001', rut: RUT, diagnostico: DX }));
  const PID = camaDe('6').PATIENT_ID;
  llama('GUARDAR_EVOLUCION', evo('6', { EPISODIO_ABIERTO: PID, OP_ID: 'op_evolucion_0001', TEXTO_GENERADO: TEXTO, DIAGNOSTICO: DX }));
  // Un servicio que devuelve de TODO: nombre, RUT, texto, objetos anidados, listas.
  CUERPO = () => { repoInsertar('TIMELINE', { ID_HITO: 'RICO' }); return ok({
    idCama: '6', id: 'S1', idEvolucion: 'E1', patientId: PID, turnoKey: TK, accion: 'actualizar', entidad: 'EVOLUCIONES',
    nombre: NOMBRE, NOMBRE: NOMBRE, rut: RUT, RUT: RUT, diagnostico: DX, cod: 'AP-61', TEXTO_GENERADO: TEXTO,
    pendiente: { texto: TEXTO, id: 'p1' }, lista: [NOMBRE, RUT], antes: DX, valor: 'dato clinico' }); };
  llama(ACC, payload({ OP_ID: 'op_rico_0001', nombre: NOMBRE, rut: RUT }));
  const todos = opsDelCaché();
  eq('se sellaron las tres operaciones', todos.length, 3);
  const sensible = [NOMBRE, 'Alfa', RUT, '11111111', DX, 'Dx secreto', TEXTO, 'Texto clinico', 'AP-61', 'dato clinico'];
  const filtrado = todos.filter(p => sensible.some(s => p.v.indexOf(s) > -1)).map(p => p.k);
  eq('★★ NINGÚN put al caché contiene el nombre, el RUT, el diagnóstico, el texto ni el código del paciente', filtrado.join(',') || '(ninguno)', '(ninguno)');
  const PERMITIDAS = ['idCama', 'idEvolucion', 'id', 'patientId', 'turnoKey', 'accion', 'entidad', 'TEXTO_GENERADO'];
  todos.forEach(p => {
    const d = (JSON.parse(p.v) || {}).d || {};
    const sobra = Object.keys(d).filter(k => PERMITIDAS.indexOf(k) === -1);
    eq('   ' + p.k + ': solo claves permitidas', sobra.join(',') || '(ninguna)', '(ninguna)');
    eq('   …y TEXTO_GENERADO, si está, es solo la marca vacía', 'TEXTO_GENERADO' in d ? JSON.stringify(d.TEXTO_GENERADO) : '""', '""');
    si('   …y todos los valores son textos o números cortos', Object.keys(d).every(k => (typeof d[k] === 'string' || typeof d[k] === 'number') && String(d[k]).length <= 100));
  });
  eq('   …y no hay una clave con el nombre del paciente (la clave es acción + OP_ID)', todos.some(p => p.k.indexOf('Alfa') > -1), false);

  // _selloDepurar, solo.
  const dep = global._selloDepurar;
  if (typeof dep === 'function') {
    const o = dep({ idCama: '6', idEvolucion: 'E1', id: 'S1', patientId: 'pid-1', turnoKey: TK, accion: 'ingreso', entidad: 'CAMAS_ESTADO',
      nombre: NOMBRE, rut: RUT, pendiente: { texto: TEXTO }, lista: [1, 2], cod: 'AP-61', valor: 42, TEXTO_GENERADO: TEXTO,
      yaEstaba: true, hayAviso: false });
    eq('★ _selloDepurar deja ids y banderas y nada más', Object.keys(o).sort().join(','),
      'TEXTO_GENERADO,accion,entidad,hayAviso,id,idCama,idEvolucion,patientId,turnoKey,yaEstaba'.split(',').sort().join(','));
    eq('   …el texto queda como marca vacía', o.TEXTO_GENERADO, '');
    eq('   …y las banderas (verdadero o falso) pasan tal cual: no pueden llevar un nombre', o.yaEstaba + '/' + o.hayAviso, 'true/false');
    eq('   …y no deja pasar objetos ni listas aunque se llamen como un id permitido', JSON.stringify(dep({ idCama: { x: 1 }, id: ['a'], accion: { t: 'y' } })), '{}');
    eq('   …una acción larguísima se acota (no es un lugar para pegar texto)', String(dep({ accion: 'x'.repeat(500) }).accion || '').length <= 80, true);
    eq('   …algo que no es un objeto da vacío', JSON.stringify([dep(null), dep(undefined), dep('texto'), dep(5)]), '[{},{},{},{}]');
  } else fails.push('_selloDepurar no existe');

  // Un sello de más de 90 KB se DESCARTA (el caché admite 100 KB por valor y un put que lanza no puede tumbar nada).
  reset();
  CUERPO = () => { repoInsertar('TIMELINE', { ID_HITO: 'GRANDE' }); return ok({ idCama: '9'.repeat(95000), accion: 'grande' }); };
  const gr = llama(ACC, payload());
  eq('★ un sello de más de 90 KB se descarta sin error: la operación contesta ok y no se intentó el put', gr.ok + '/' + opsDelCaché().length, 'true/0');
});

/* ══ 12 · LA APP INSTALADA: doPost ════════════════════════════════════════ */
console.log('\n12 · La app instalada manda el OP_ID por doPost, que llama al mismo api(): sella igual');
tramo('doPost', () => {
  reset(); CUERPO = escribeUna();
  global.ContentService = { MimeType: { JSON: 'json' }, createTextOutput: s => ({ s, setMimeType() { return this; } }) };
  (0, eval)(leer('api_web.gs'));
  const post = obj => JSON.parse(callando(() => global.doPost({ postData: { contents: JSON.stringify(obj) } })).s);
  const p1 = post({ accion: ACC, datos: payload() });
  const p2 = post({ accion: ACC, datos: payload() });
  eq('★ POST con OP_ID: la segunda vez es ok y repetida, sin ejecutar', p1.ok + '/' + p2.ok + '/' + (p2.data && p2.data.repetida) + '/' + EJEC, 'true/true/true/1');
  eq('   …y es la MISMA clave en el caché que por google.script.run', opsDelCaché().map(p => p.k).join(','), claveSello(ACC, OPID));
  const g = llama(ACC, payload());
  eq('   …el camino del iframe reconoce el sello que dejó el de la app instalada (es UN solo catálogo)', (g.data && g.data.repetida) + '/' + EJEC, 'true/1');
});

/* ══ 13 · uid(prefijo, clave) ═════════════════════════════════════════════ */
console.log('\n13 · uid(prefijo, clave): determinista con OP_ACTUAL, clásico sin ella');
tramo('uid', () => {
  const CLASICO = /^([A-Z]+)_\d{13}_[A-Z0-9]{1,5}$/;
  global.OP_ACTUAL = null;
  si('sin OP_ACTUAL, uid(prefijo) es el de siempre: PREFIJO_<ms>_<5 al azar>', CLASICO.test(global.uid('PROC')) && /^PROC_/.test(global.uid('PROC')));
  si('★ …y con clave también, pero la clave se IGNORA (no hay operación a la que atarla)', CLASICO.test(global.uid('HITO', 'tipo|3|pid|texto')) && !/tipo/.test(global.uid('HITO', 'tipo|3|pid|texto')));
  eq('   …los dos se distinguen (el azar)', global.uid('PROC') === global.uid('PROC'), false);

  global.OP_ACTUAL = { id: 'op_abc12345', accion: 'ANEXAR_EVENTO', h: 'x', texto: '' };
  eq('★ con OP_ACTUAL y clave vacía: PREFIJO_<op> (un solo registro por operación: PROC_<op>)', global.uid('PROC', ''), 'PROC_op_abc12345');
  eq('   …y es el mismo cada vez (determinista)', global.uid('PROC', '') === global.uid('PROC', ''), true);
  const h1 = global.uid('HITO', 'nota|3|pid-1|Texto A');
  si('★ con clave: PREFIJO_<op>_<huella de la clave>', /^HITO_op_abc12345_[A-Za-z0-9]+$/.test(h1));
  eq('   …determinista: la misma clave da el mismo id', global.uid('HITO', 'nota|3|pid-1|Texto A'), h1);
  si('   …claves distintas dan ids distintos (dos hitos de una misma operación no chocan)', global.uid('HITO', 'nota|3|pid-1|Texto B') !== h1 && global.uid('HITO', 'ingreso|3|pid-1|Texto A') !== h1);
  global.OP_ACTUAL = { id: 'op_otra0001', accion: 'ANEXAR_EVENTO', h: 'x', texto: '' };
  si('   …y la misma clave en OTRA operación da otro id', global.uid('HITO', 'nota|3|pid-1|Texto A') !== h1);
  global.OP_ACTUAL = { id: 'op_abc12345', accion: 'OTRA', h: 'y', texto: 'otro' };
  eq('★ …y un reintento (OTRA OP_ACTUAL con el mismo id) reconstruye el MISMO id: es lo que permite «insertar si no existe»', global.uid('HITO', 'nota|3|pid-1|Texto A'), h1);
  si('★ sin clave, aun con OP_ACTUAL, sigue el formato clásico (los bancos y registros antiguos no cambian)', CLASICO.test(global.uid('PROC')) && CLASICO.test(global.uid('EVAL')));
  const largo = global.uid('HITO', 'x'.repeat(5000));
  si('   una clave larguísima da un id corto y de caracteres seguros', largo.length < 100 && /^[A-Za-z0-9_-]+$/.test(largo));
  global.OP_ACTUAL = null;

  // Sin la variable ni declarada (los ~145 bancos que no cargan infra_lock.gs): ni revienta ni cambia.
  const ctxVacio = vm.createContext({});
  vm.runInContext(leer('infra_util.gs'), ctxVacio);
  si('★ en un contexto donde OP_ACTUAL NI SIQUIERA ESTÁ DECLARADA, uid(prefijo, clave) cae al clásico sin reventar',
    vm.runInContext('typeof OP_ACTUAL', ctxVacio) === 'undefined' && CLASICO.test(vm.runInContext("uid('HITO', 'clave')", ctxVacio)));
});

/* ══ 14 · LA FORMA ════════════════════════════════════════════════════════ */
console.log('\n14 · La forma: dónde vive cada pieza');
tramo('forma', () => {
  // Lo que se afirma de la FORMA se mira en el código, no en los comentarios (que explican y nombran lo que no se usa).
  const sinComentarios = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
  const lock = leer('infra_lock.gs'), util = leer('infra_util.gs'), api_ = leer('api.gs'), web = leer('api_web.gs'), esq = leer('esquema.gs');
  const lockC = sinComentarios(lock), utilC = sinComentarios(util), apiC = sinComentarios(api_);
  si('OP_ACTUAL es un `var` en infra_lock.gs (una const no cuelga de globalThis con el eval del simulador)', /^var OP_ACTUAL\b/m.test(lockC));
  no('   …y no es una const ni se declara en otro lado', /\b(const|let) OP_ACTUAL\b/.test(lockC + utilC + apiC) || /\bvar OP_ACTUAL\b/.test(utilC + apiC));
  ['_huellaPayload', '_selloLeer', '_selloGuardar', '_selloDepurar'].forEach(f =>
    si(f + ' vive en infra_lock.gs', new RegExp('function ' + f + '\\(').test(lock)));
  si('uid(prefix, clave) vive en infra_util.gs', /function uid\(\w+,\s*\w+\)/.test(util));
  si('_opDe vive en api.gs, y _auditar devuelve OP_ACTUAL a lo que era en un finally', /function _opDe\(/.test(api_) && /finally\s*\{[^}]*OP_ACTUAL\s*=/.test(api_));
  no('★ el sello NO usa credHuellaDe (esa es la primitiva de las CLAVES y su texto no se toca)', /credHuellaDe/.test(lockC) || /credHuellaDe/.test(sinComentarios((util.match(/function uid\([\s\S]*?\n\}[\s\S]*?function _huellaTexto\([\s\S]*?\n\}/) || [''])[0])));
  const huella = (util.match(/function _huellaTexto\([\s\S]*?\n\}/) || [''])[0];
  si('   …la huella es JS puro, sin digest de Utilities', huella.length > 50 && !/Utilities|computeDigest/.test(huella));
  si('el sello vive 6 horas (21600 s, el máximo del caché)', /21600/.test(lockC));
  si('   …en la clave «op|ACCION|OP_ID»', /'op\|'/.test(lockC));
  no('★ OP_ID NO es columna de ninguna hoja (viaja transitorio, como EPISODIO_ABIERTO)', /OP_ID/.test(esq));
  si('api_web.gs menciona el OP_ID (un comentario) y NO tiene un segundo catálogo de acciones', /OP_ID/.test(web) && !/\bcase\s+'/.test(web));
  eq('   …y sigue llamando al mismo api()', (web.match(/\bapi\(accion,/g) || []).length, 1);
});

/* ══ 15 · LA MATRIZ DE MUERTE EN LAS PUERTAS DE CAMA (paso 9) ═════════════ */
console.log('\n15 · Muerte tras la escritura N y reintento con el MISMO paquete: el estado final es el de una corrida limpia');
// El mundo de las cuatro puertas: P en la cama 3 y R en la 4 (cada uno con dos turnos guardados), la 9 libre y la 5 con un
// episodio cargado a mano SIN PATIENT_ID. Todos inventados. `volverAlMundo` lo deja EXACTO cuantas veces haga falta.
const MUNDO = { PID_P: '', PID_R: '', FOTO: null };
const OPC = 'op_cama_0001';
const SIN = { sinHojas: ['AUDIT_LOG'] };
const TK0 = '2026-08-09-Dia';
tramo('mundo de las puertas de cama', () => {
  global.Utilities.formatDate = (d) => {
    const p2 = n => ('0' + n).slice(-2);
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  };
  reset();
  SIM.fecha = '2026-08-07'; SIM.hora = '12:00:00';
  const iP = llama('INGRESAR_PACIENTE', ingreso('3', { nombre: 'Paciente Alfa', fechaIngreso: '2026-08-07' }));
  MUNDO.PID_P = camaDe('3').PATIENT_ID;
  const iR = llama('INGRESAR_PACIENTE', ingreso('4', { nombre: 'Paciente Bravo', fechaIngreso: '2026-08-07' }));
  MUNDO.PID_R = camaDe('4').PATIENT_ID;
  SIM.fecha = '2026-08-09';
  const t0 = [['3', MUNDO.PID_P], ['4', MUNDO.PID_R]].map(([c, p]) => llama('GUARDAR_EVOLUCION', evo(c, { TURNO_KEY: TK0, EPISODIO_ABIERTO: p, RESP_KTR_CANT: 1 })));
  SIM.fecha = '2026-08-10'; SIM.hora = '12:00:00';
  const t1 = [['3', MUNDO.PID_P], ['4', MUNDO.PID_R]].map(([c, p]) => llama('GUARDAR_EVOLUCION', evo(c, { EPISODIO_ABIERTO: p, RESP_KTR_CANT: 2 })));
  si('(el montaje) P y R ingresan y guardan sus dos turnos', iP.ok && iR.ok && t0.every(r => r.ok) && t1.every(r => r.ok));
  si('(el montaje) son dos episodios distintos', MUNDO.PID_P && MUNDO.PID_R && MUNDO.PID_P !== MUNDO.PID_R);
  // La cama 5: un episodio cargado a mano, sin ingreso formal (PATIENT_ID vacío), con dos turnos sin paciente.
  Object.assign(camaDe('5'), { OCUPADA: true, STATUS_CAMA: 'Ocupada', NOMBRE: 'Carga A', COD_PACIENTE: 'CA1', FECHA_INGRESO: '2026-08-08', PATIENT_ID: '', VIA_AEREA: 'Natural', SOPORTE: 'Ambiente' });
  ['2026-08-09-Dia', '2026-08-10-Dia'].forEach(tk => DB.EVOLUCIONES.push({ ID_EVOLUCION: 'CAMA_5_' + tk, ID_CAMA: '5', PATIENT_ID: '', TURNO_KEY: tk, FECHA: tk.slice(0, 10), TURNO: 'Dia' }));
  si('(el montaje) P tiene dos turnos vivos y la cama 5 también', DB.EVOLUCIONES.filter(e => e.PATIENT_ID === MUNDO.PID_P).length === 2 && DB.EVOLUCIONES.filter(e => e.ID_CAMA === '5').length === 2);
  MUNDO.FOTO = M.foto();
});

const volverAlMundo = () => {
  M.restaurar(MUNDO.FOTO);
  PUTS.length = 0; GETS.length = 0; FLUSHES.length = 0; FALLA_PUT = false;
  ctl.cache.fallar(false); ctl.antesDelCuerpo = null;
  SIM.fecha = '2026-08-10'; SIM.hora = '12:00:00';
};
const ocupantes = () => DB.CAMAS_ESTADO.filter(c => c.OCUPADA === true).map(c => String(c.PATIENT_ID || ''));
const vecesEn = (lista, x) => lista.filter(y => y === x).length;
const sinOpId = p => { const o = Object.assign({}, p); delete o.OP_ID; return o; };
const archivoDeP = () => DB.ARCHIVO_PACIENTES.filter(a => a.PATIENT_ID === MUNDO.PID_P);
const evoArchDe = pid => DB.EVOLUCIONES_ARCHIVO.filter(e => e.PATIENT_ID === pid);
const hitosDe = (pid, tipo) => DB.TIMELINE.filter(h => h.PATIENT_ID === pid && h.TIPO === tipo);

/**
 * La matriz de una puerta. `mk()` arma el paquete (uno nuevo cada vez: el servicio puede mutarlo), `viola(fase)` devuelve '' si
 * lo que la puerta promete se cumple o el motivo si no: 'corte' = con la corrida muerta a medias y ANTES del reintento, 'final'
 * = tras el reintento. Los cortes son N = 0..total+1: 0 muere antes de la primera escritura y total+1 no muere.
 * `opts.sinExigirOk`: no se exige que el reintento CONTESTE ok (solo que el estado final sea el de la limpia): un alta sin
 * PATIENT_ID no tiene a quién buscar en el archivo, así que tras morir entre limpiar la cama y el sello el reintento
 * contesta «la cama ya está libre», con el estado ya correcto.
 */
function matriz(etq, accion, mk, viola, opts) {
  // `opts.foto`: otras opciones de M.instantanea (por omisión SIN: la bitácora fuera). `opts.queSeVe`: qué dice el rojo cuando
  // en un corte queda a la vista algo que la puerta prometía no dejar (el de las puertas de cama habla de pacientes borrados).
  const foto_ = (opts && opts.foto) || SIN;
  const queSeVe = (opts && opts.queSeVe) || 'un paciente borrado, duplicado o un egreso doble';
  volverAlMundo();
  const r0 = llama(accion, mk());
  const total = M.total(), reg = M.registro(), limpio = M.instantanea(foto_);
  si('★ ' + etq + ' · la corrida limpia sale ok', r0.ok);
  si('   …con varias escrituras (si no, no habría corte que probar): ' + total, total >= 2);
  eq('   …y cumple lo que la puerta promete', viola('final') || '(todo)', '(todo)');
  const cortes = [], desiguales = [], noOk = [];
  for (let n = 0; n <= total + 1; n++) {
    volverAlMundo();
    callando(() => { M.muereTrasLaEscritura(n); llama(accion, mk()); });
    const corte = viola('corte');
    if (corte) cortes.push('N=' + n + ' (' + corte + ')');
    M.reiniciar();
    const r = llama(accion, mk());               // el reintento: el MISMO paquete (mismo OP_ID, mismos reclamos)
    if (!r.ok) noOk.push('N=' + n + ' (' + (r.codigo || '?') + ': ' + String(r.error || '').slice(0, 70) + ')');
    const fin = M.instantanea(foto_);
    const fallaFinal = viola('final');
    const igual = fin === limpio;
    if (!igual) desiguales.push(n);
    eq('   N=' + n + ' · muerta y reintentada: el estado final es el de la corrida limpia' + (fallaFinal ? ' [' + fallaFinal + ']' : ''), igual && !fallaFinal, true);
    if (!igual) M.diferencias(limpio, fin).slice(0, 4).forEach(l => console.log('        ' + l.slice(0, 170)));
  }
  eq('★★ ' + etq + ' · en NINGÚN corte queda a la vista ' + queSeVe, cortes.join('; ') || '(ninguno)', '(ninguno)');
  if (opts && opts.sinExigirOk) info('   ' + etq + ' · cortes cuyo reintento NO contesta ok (el estado final es el correcto igual): ' + (noOk.join('; ') || '(ninguno)'));
  else eq('★★ ' + etq + ' · el reintento contesta ok en todos los cortes', noOk.join('; ') || '(todos)', '(todos)');
  eq('   ' + etq + ' · cortes tras cuyo reintento el estado difiere de la limpia', desiguales.join(',') || '(ninguno)', '(ninguno)');
  return { total, reg, limpio };
}

tramo('INTERCAMBIAR_CAMAS', () => {
  const mk = () => ({ idCamaA: '3', idCamaB: '4', EPISODIO_ABIERTO: MUNDO.PID_P, EPISODIO_ABIERTO_B: MUNDO.PID_R, OP_ID: OPC });
  const viola = () => {
    const o = ocupantes();
    return (vecesEn(o, MUNDO.PID_P) === 1 && vecesEn(o, MUNDO.PID_R) === 1) ? '' : 'P en ' + vecesEn(o, MUNDO.PID_P) + ' cama(s) y R en ' + vecesEn(o, MUNDO.PID_R);
  };
  const violaFinal = fase => viola() || (fase === 'final' && (camaDe('3').PATIENT_ID !== MUNDO.PID_R || camaDe('4').PATIENT_ID !== MUNDO.PID_P) ? 'las camas no quedaron cruzadas' : '');
  console.log('   · INTERCAMBIAR_CAMAS con OP_ID');
  const a = matriz('INTERCAMBIAR_CAMAS con OP_ID', 'INTERCAMBIAR_CAMAS', mk, violaFinal);
  eq('★ el cambio de camas es UNA sola escritura de CAMAS_ESTADO, y es la PRIMERA (el punto de compromiso)', a.reg[0], 'repoActualizarDonde(CAMAS_ESTADO)');
  eq('   …y la siguiente ya es el reetiquetado del episodio (no queda otra escritura de camas en medio)', a.reg[1], 'repoActualizarDonde(EVOLUCIONES)');
  eq('   …y no hay ninguna otra escritura de CAMAS_ESTADO antes de los hitos', a.reg.slice(0, a.reg.findIndex(x => /^repoInsertar\(TIMELINE\)/.test(x))).filter(x => /\(CAMAS_ESTADO\)/.test(x)).length, 1);
  console.log('   · INTERCAMBIAR_CAMAS sin OP_ID (solo el reclamo de episodio)');
  matriz('INTERCAMBIAR_CAMAS sin OP_ID', 'INTERCAMBIAR_CAMAS', () => sinOpId(mk()), violaFinal);
  // El reintento de un intercambio que murió DESPUÉS de cruzar las camas completa lo que falta: reetiquetado y hitos.
  volverAlMundo();
  callando(() => { M.muereTrasLaEscritura(1); llama('INTERCAMBIAR_CAMAS', mk()); });
  eq('(el corte N=1) las camas ya están cruzadas y el episodio sigue en la cama vieja', camaDe('3').PATIENT_ID + '/' + DB.EVOLUCIONES.filter(e => e.PATIENT_ID === MUNDO.PID_P).every(e => e.ID_CAMA === '3'), MUNDO.PID_R + '/true');
  M.reiniciar();
  const rr = llama('INTERCAMBIAR_CAMAS', mk());
  eq('★★ el reintento reconoce el «ya hecho» por pid (no deshace el cruce)…', rr.ok + '/' + camaDe('3').PATIENT_ID + '/' + camaDe('4').PATIENT_ID, 'true/' + MUNDO.PID_R + '/' + MUNDO.PID_P);
  eq('★★ …y COMPLETA lo que faltaba: las evoluciones de P viajaron a la 4 y las de R a la 3',
    DB.EVOLUCIONES.filter(e => e.PATIENT_ID === MUNDO.PID_P).every(e => e.ID_CAMA === '4') + '/' + DB.EVOLUCIONES.filter(e => e.PATIENT_ID === MUNDO.PID_R).every(e => e.ID_CAMA === '3'), 'true/true');
  eq('   …y escribió los DOS hitos de traslado, ni uno más', DB.TIMELINE.filter(h => /^Traslado a Cama/.test(h.TEXTO || '')).length, 2);
});

tramo('MOVER_A_CAMA_VACIA', () => {
  const mk = () => ({ idOrigen: '3', idDestino: '9', EPISODIO_ABIERTO: MUNDO.PID_P, EPISODIO_ABIERTO_B: '', OP_ID: OPC });
  const viola = fase => {
    const o = ocupantes();
    if (vecesEn(o, MUNDO.PID_P) !== 1) return 'P en ' + vecesEn(o, MUNDO.PID_P) + ' cama(s)';
    if (camaDe('4').PATIENT_ID !== MUNDO.PID_R) return 'R ya no está en la 4';
    return (fase === 'final' && (camaDe('9').PATIENT_ID !== MUNDO.PID_P || camaDe('3').OCUPADA !== false)) ? 'P no quedó en la 9 con la 3 libre' : '';
  };
  console.log('   · MOVER_A_CAMA_VACIA con OP_ID');
  const a = matriz('MOVER_A_CAMA_VACIA con OP_ID', 'MOVER_A_CAMA_VACIA', mk, viola);
  eq('★ el traslado es UNA sola escritura de CAMAS_ESTADO (destino lleno y origen libre juntos), y es la PRIMERA', a.reg[0], 'repoActualizarDonde(CAMAS_ESTADO)');
  eq('   …y la siguiente ya es el reetiquetado del episodio', a.reg[1], 'repoActualizarDonde(EVOLUCIONES)');
  console.log('   · MOVER_A_CAMA_VACIA sin OP_ID (solo el reclamo de episodio)');
  matriz('MOVER_A_CAMA_VACIA sin OP_ID', 'MOVER_A_CAMA_VACIA', () => sinOpId(mk()), viola);
  volverAlMundo();
  callando(() => { M.muereTrasLaEscritura(1); llama('MOVER_A_CAMA_VACIA', mk()); });
  eq('(el corte N=1) P ya está en la 9, la 3 quedó libre y su episodio sigue etiquetado a la 3', camaDe('9').PATIENT_ID + '/' + camaDe('3').OCUPADA + '/' + DB.EVOLUCIONES.filter(e => e.PATIENT_ID === MUNDO.PID_P).every(e => e.ID_CAMA === '3'), MUNDO.PID_P + '/false/true');
  M.reiniciar();
  const rr = llama('MOVER_A_CAMA_VACIA', mk());
  eq('★★ el reintento reconoce el «ya hecho» y COMPLETA el reetiquetado y el hito (UNO solo)', rr.ok + '/' + DB.EVOLUCIONES.filter(e => e.PATIENT_ID === MUNDO.PID_P).every(e => e.ID_CAMA === '9') + '/' + DB.TIMELINE.filter(h => /^Traslado a Cama/.test(h.TEXTO || '')).length, 'true/true/1');
});

tramo('DAR_ALTA', () => {
  const mk = () => ({ idCama: '3', motivoEgreso: 'Traslado a sala', destinoEgreso: 'Medicina', firmaKine: 'DMV', EPISODIO_ABIERTO: MUNDO.PID_P, OP_ID: OPC });
  const viola = fase => {
    const a = archivoDeP();
    if (a.length > 1) return 'el egreso de P está ' + a.length + ' veces (inflaría el REM)';
    if (hitosDe(MUNDO.PID_P, 'egreso').length > 1) return 'el hito de egreso está duplicado';
    const claves = evoArchDe(MUNDO.PID_P).map(e => e.ID_EVOLUCION);
    if (new Set(claves).size !== claves.length) return 'EVOLUCIONES_ARCHIVO tiene turnos de P duplicados';
    if (fase !== 'final') return '';
    if (a.length !== 1) return 'P no quedó archivado';
    if (claves.length !== 2) return 'P tiene ' + claves.length + ' turnos archivados (eran 2)';
    if (hitosDe(MUNDO.PID_P, 'egreso').length !== 1) return 'no hay UN hito de egreso';
    return (camaDe('3').OCUPADA !== false || DB.EVOLUCIONES.some(e => e.PATIENT_ID === MUNDO.PID_P)) ? 'la cama 3 no quedó libre y sin turnos vivos de P' : '';
  };
  console.log('   · DAR_ALTA con OP_ID');
  const a = matriz('DAR_ALTA con OP_ID', 'DAR_ALTA', mk, viola);
  eq('★ el egreso se escribe UNA vez, con el id derivado del paciente: ARCH_<pid>', DB.ARCHIVO_PACIENTES.map(x => x.ID_ARCHIVO).join(',') + '|' + a.reg.filter(x => /^repoInsertar\(ARCHIVO_PACIENTES\)/.test(x)).length,
    'ARCH_' + MUNDO.PID_P + '|1');
  console.log('   · DAR_ALTA sin OP_ID (la capa durable no depende del sello)');
  matriz('DAR_ALTA sin OP_ID', 'DAR_ALTA', () => sinOpId(mk()), viola);
});

tramo('LIMPIAR_CAMA', () => {
  const mk = () => ({ idCama: '3', EPISODIO_ABIERTO: MUNDO.PID_P, OP_ID: OPC });
  const viola = fase => {
    const claves = evoArchDe(MUNDO.PID_P).map(e => e.ID_EVOLUCION);
    if (new Set(claves).size !== claves.length) return 'EVOLUCIONES_ARCHIVO tiene turnos de P duplicados (' + claves.length + ')';
    if (fase !== 'final') return '';
    if (claves.length !== 2) return 'P tiene ' + claves.length + ' turnos archivados (eran 2)';
    if (DB.ARCHIVO_PACIENTES.length) return 'limpiar inventó un egreso';
    return (camaDe('3').OCUPADA !== false || DB.EVOLUCIONES.some(e => e.ID_CAMA === '3')) ? 'la cama 3 no quedó libre y sin turnos vivos' : '';
  };
  console.log('   · LIMPIAR_CAMA con OP_ID');
  matriz('LIMPIAR_CAMA con OP_ID', 'LIMPIAR_CAMA', mk, viola);
  console.log('   · LIMPIAR_CAMA sin OP_ID');
  matriz('LIMPIAR_CAMA sin OP_ID', 'LIMPIAR_CAMA', () => sinOpId(mk()), viola);
});

/* ══ 16 · LA FORMA DE LA RECUPERACIÓN ═════════════════════════════════════ */
console.log('\n16 · La forma: una escritura que lleva el cambio, _camaVacia compartida, id del egreso derivado, archivado que no duplica');
tramo('forma de la recuperación', () => {
  const sinComentarios = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
  const svc = leer('svc_camas.gs');
  const cuerpo = nombre => {
    const ini = svc.indexOf('function ' + nombre + '(');
    const fin = ini === -1 ? -1 : svc.indexOf('\n}\n', ini);
    return (ini === -1 || fin === -1) ? '' : sinComentarios(svc.slice(ini, fin));
  };
  const cuenta = (t, re) => (t.match(re) || []).length;
  si('★ _camaVacia() existe (la comparten la limpieza, el alta y el traslado: no divergen)', /function _camaVacia\(\)/.test(svc));
  si('   …y _limpiarCamaInterno la USA', /_camaVacia\(\)/.test(cuerpo('_limpiarCamaInterno')));
  const inter = cuerpo('intercambiarCamas');
  eq('★ intercambiarCamas: UNA repoActualizarDonde sobre CAMAS_ESTADO…', cuenta(inter, /repoActualizarDonde\('CAMAS_ESTADO'/g), 1);
  eq('   …y ningún repoActualizar suelto (esas eran las DOS escrituras que dejaban a un paciente borrado)', cuenta(inter, /\brepoActualizar\(/g), 0);
  const mov = cuerpo('moverACamaVacia');
  eq('★ moverACamaVacia: UNA repoActualizarDonde sobre CAMAS_ESTADO (destino lleno y origen libre juntos)…', cuenta(mov, /repoActualizarDonde\('CAMAS_ESTADO'/g), 1);
  eq('   …que usa _camaVacia() para el origen', cuenta(mov, /_camaVacia\(\)/g), 1);
  eq('   …y ya no limpia el origen con una escritura aparte (_limpiarCamaInterno) ni con repoActualizar', cuenta(mov, /_limpiarCamaInterno\(|\brepoActualizar\(/g), 0);
  const alta = cuerpo('darAltaPaciente');
  const egr = cuerpo('_egresoDeLaCama');
  si('★ el egreso deriva su id del paciente (ARCH_<pid>) y ya no usa un id con reloj y azar', /'ARCH_'/.test(egr) && /'ARCH_SINPID_'/.test(egr) && !/uid\('ARCH'\)/.test(alta + egr));
  si('   …y el alta pregunta por ese egreso ANTES de insertarlo (repoInsertar solo si no existe)', alta.indexOf('_egresoDeLaCama(') > -1 && alta.indexOf('_egresoDeLaCama(') < alta.indexOf("repoInsertar('ARCHIVO_PACIENTES'") && /!egreso\.existe/.test(alta));
  si('   …y lo busca con repoBuscarPorId (los bancos antiguos tienen ese doble; repoBuscarFila no)', /repoBuscarPorId\('ARCHIVO_PACIENTES'/.test(egr));
  const arch = cuerpo('_archivarEvolucionesDeCama');
  si('★ _archivarEvolucionesDeCama mira lo ya archivado ANTES de insertar (un reintento no duplica)', arch.indexOf("repoLeerTodos('EVOLUCIONES_ARCHIVO'") > -1 && arch.indexOf("repoLeerTodos('EVOLUCIONES_ARCHIVO'") < arch.indexOf("repoInsertar('EVOLUCIONES_ARCHIVO'"));
  si('   …y borra de la hoja viva solo DESPUÉS de insertar (el compromiso es el último paso, no el primero)', arch.indexOf("repoInsertar('EVOLUCIONES_ARCHIVO'") < arch.indexOf("repoEliminarDonde('EVOLUCIONES'"));
  si('★ el traslado deriva sus hitos del OP_ID (insertar-si-no-existe)', /uid\('HITO'/.test(sinComentarios(svc)));
  no('★ repo.gs no cambió de forma: sigue sin una primitiva «dos filas a la vez» (el paso 9 no la necesita)', /function repoActualizarDos|function repoActualizarFilas/.test(leer('repo.gs')));
});

/* ══ 17 · EL EGRESO DE UN EPISODIO SIN PATIENT_ID ═════════════════════════ */
console.log('\n17 · El egreso de un episodio cargado a mano (sin PATIENT_ID): ARCH_SINPID_<cama>_<fecha>, sin perder a un segundo episodio del día');
tramo('egreso sin pid', () => {
  const alta5 = () => ({ idCama: '5', motivoEgreso: 'Traslado a sala', destinoEgreso: 'Medicina', firmaKine: 'DMV', EPISODIO_ABIERTO: '', OP_ID: OPC });
  const viola = fase => {
    const f = DB.ARCHIVO_PACIENTES.filter(a => String(a.CAMA_ORIGEN) === '5');
    if (f.length > 1) return 'el egreso de la cama 5 está ' + f.length + ' veces';
    const k = DB.EVOLUCIONES_ARCHIVO.filter(e => e.ID_CAMA === '5').map(e => e.ID_EVOLUCION);
    if (new Set(k).size !== k.length) return 'EVOLUCIONES_ARCHIVO duplicada';
    return (fase === 'final' && (f.length !== 1 || k.length !== 2 || camaDe('5').OCUPADA !== false)) ? 'el egreso no quedó completo (' + f.length + ' fila(s), ' + k.length + ' turno(s))' : '';
  };
  matriz('DAR_ALTA de la cama 5 (sin PATIENT_ID) con OP_ID', 'DAR_ALTA', alta5, viola, { sinExigirOk: true });
  volverAlMundo(); llama('DAR_ALTA', alta5());
  eq('★ el id es ARCH_SINPID_<cama>_<fecha>', DB.ARCHIVO_PACIENTES.map(x => x.ID_ARCHIVO).join(','), 'ARCH_SINPID_5_2026-08-10');
  // Un SEGUNDO episodio cargado a mano en la misma cama, dado de alta el mismo día: su egreso NO se pierde (con el id
  // idéntico, «insertar si no existe» lo habría tomado por el reintento del primero y lo habría descartado en silencio).
  Object.assign(camaDe('5'), { OCUPADA: true, STATUS_CAMA: 'Ocupada', NOMBRE: 'Carga B', COD_PACIENTE: 'CB1', FECHA_INGRESO: '2026-08-10', PATIENT_ID: '' });
  DB.EVOLUCIONES.push({ ID_EVOLUCION: 'CAMA_5_2026-08-10-Dia', ID_CAMA: '5', PATIENT_ID: '', TURNO_KEY: '2026-08-10-Dia', FECHA: '2026-08-10', TURNO: 'Dia' });
  const b = llama('DAR_ALTA', Object.assign(alta5(), { OP_ID: 'op_cama_0002' }));
  eq('★★ el segundo episodio de la misma cama el mismo día TAMBIÉN se archiva (dos egresos, dos ids distintos)', b.ok + '/' + DB.ARCHIVO_PACIENTES.length + '/' + new Set(DB.ARCHIVO_PACIENTES.map(x => x.ID_ARCHIVO)).size, 'true/2/2');
  eq('   …con sus nombres, cada uno el suyo', DB.ARCHIVO_PACIENTES.map(x => x.NOMBRE).join(','), 'Carga A,Carga B');
  // El reintento de ESE segundo egreso (cama ya libre, mismo OP_ID) no agrega un tercero.
  const b2 = llama('DAR_ALTA', Object.assign(alta5(), { OP_ID: 'op_cama_0002' }));
  eq('   …y repetirlo (mismo OP_ID) no suma un tercero', b2.ok + '/' + DB.ARCHIVO_PACIENTES.length, 'true/2');
  // Y el reintento de una corrida muerta de ese segundo episodio, sin sello, tampoco.
  volverAlMundo(); llama('DAR_ALTA', alta5());
  Object.assign(camaDe('5'), { OCUPADA: true, STATUS_CAMA: 'Ocupada', NOMBRE: 'Carga B', COD_PACIENTE: 'CB1', FECHA_INGRESO: '2026-08-10', PATIENT_ID: '' });
  DB.EVOLUCIONES.push({ ID_EVOLUCION: 'CAMA_5_2026-08-10-Dia', ID_CAMA: '5', PATIENT_ID: '', TURNO_KEY: '2026-08-10-Dia', FECHA: '2026-08-10', TURNO: 'Dia' });
  const F2 = M.foto();
  const limpioB = (() => { M.restaurar(F2); SIM.fecha = '2026-08-10'; llama('DAR_ALTA', Object.assign(alta5(), { OP_ID: 'op_cama_0003' })); return M.instantanea(SIN); })();
  const totalB = M.total();
  const malos = [];
  for (let n = 1; n <= totalB; n++) {
    M.restaurar(F2); SIM.fecha = '2026-08-10'; SIM.hora = '12:00:00';
    callando(() => { M.muereTrasLaEscritura(n); llama('DAR_ALTA', Object.assign(alta5(), { OP_ID: 'op_cama_0003' })); });
    M.reiniciar(); llama('DAR_ALTA', Object.assign(alta5(), { OP_ID: 'op_cama_0003' }));
    if (M.instantanea(SIN) !== limpioB) malos.push(n);
  }
  eq('★ el segundo episodio muerto en cualquier punto y reintentado queda como una corrida limpia (sin perder ni duplicar)', malos.join(',') || '(ninguno)', '(ninguno)');
});

/* ══ 18 · LA LISTA DE ARCHIVADOS CONSERVA SU ORDEN ════════════════════════ */
console.log('\n18 · Archivados: el egreso más reciente va primero aunque el id ya no lleve el reloj');
tramo('orden de archivados', () => {
  volverAlMundo();
  const a1 = llama('DAR_ALTA', { idCama: '3', motivoEgreso: 'Traslado a sala', destinoEgreso: 'Medicina', firmaKine: 'DMV', EPISODIO_ABIERTO: MUNDO.PID_P });
  const a2 = llama('DAR_ALTA', { idCama: '4', motivoEgreso: 'Traslado a sala', destinoEgreso: 'Medicina', firmaKine: 'DMV', EPISODIO_ABIERTO: MUNDO.PID_R });
  const lista = llama('GET_ARCHIVADOS', {});
  si('(el montaje) las dos altas del mismo día entran', a1.ok && a2.ok && lista.ok);
  eq('★ el alta de la cama 4 (después) sale ANTES que la de la 3, con el mismo día de egreso', (lista.data || []).map(x => x.cama).join(','), '4,3');
  si('   …y la lista no filtra campos internos de orden', (lista.data || []).every(x => Object.keys(x).every(k => k[0] !== '_')));
});

/* ══ 19 · LA MATRIZ DE MUERTE DE guardarEvolucion (paso 10) ═══════════════ */
console.log('\n19 · GUARDAR_EVOLUCION: muerte tras la escritura N y reintento con el MISMO paquete → el estado final es el de una corrida limpia');
// El guardado de la evolución NO se reordena (reordenar perdía los hitos de la caché del timeline): sigue siendo evolución →
// procedimientos → hitos → la cama (el compromiso, UNA escritura) → las colas (mediciones, reintubación). Lo que se mide es que
// cada paso previo es repetible y cada paso posterior lo repite el reintento sin daño.
const PID_NUEVO = '44444444-dddd-4ddd-8ddd-000000000004';
const OPG = 'op_evolucion_g10_01';
// El reloj de la prueba: 10-ago a las 12:00. Los turnos de P: '2026-08-09-Dia' y '2026-08-10-Dia' (ya guardados en el mundo).
const TKN = '2026-08-10-Noche';
// Lo que el turno midió y un cultivo: lo que la cola de evaluaciones copia a la serie del episodio. Van como TEXTO (lo que escribe
// un campo del formulario) porque el espejo de la serie escribe el total como texto en la cama; en la planilla real Sheets lee
// los dos como número, pero el simulador guarda lo que se le da y compararía «48» con 48 como dos estados distintos.
const MEDIDAS = { EVAL_T_MRC: '48', EVAL_T_FSS: '20' };
const CULTIVO = { MUE_REALIZADAS: true, MUE_TIPOS_JSON: '["Traqueal"]', MUE_HORA_TOMA: '10:30', MUE_CON_ATB: false, RESP_CULT_OBJ: 'Dirigido' };
// Un INGRESO como lo manda la pantalla de ahora: cama libre, EPISODIO_ABIERTO vacío y el PATIENT_ID que acuñó al abrir el formulario.
const ingresoG10 = extra => evo('9', Object.assign({
  ES_INGRESO: true, EPISODIO_ABIERTO: '', PATIENT_ID: PID_NUEVO, OP_ID: OPG,
  PAC_NOMBRE: 'Paciente Charly', PAC_EDAD: 55, PAC_SEXO: 'F', PAC_TALLA: 160, PAC_DIAGNOSTICO: 'Dx de prueba',
  PAC_FECHA_INGRESO: '2026-08-09', PAC_HORA_INGRESO: '09:30',
  PROC_JSON: JSON.stringify(['INGRESO', 'IMAGENOLOGÍA']), PLAN_NOTA_TURNO: 'Nota de prueba del turno',
}, MEDIDAS, extra || {}));
// Un turno NUEVO de P (cama 3), con procedimientos, una nota, dos mediciones y un cultivo.
const turnoG10 = extra => evo('3', Object.assign({
  TURNO_KEY: TKN, EPISODIO_ABIERTO: MUNDO.PID_P, OP_ID: OPG, RESP_KTR_CANT: 2,
  PROC_JSON: JSON.stringify(['IMAGENOLOGÍA', 'CULTIVO DE SECRECIONES']), PLAN_NOTA_TURNO: 'Nota de prueba del turno',
}, MEDIDAS, CULTIVO, extra || {}));
// Una TRANSICIÓN: de VM a VNI y de TOT a Natural, sin evento declarado y con su razón escrita (lo que produce el hito
// transicion_sin_evento y mueve los tres contadores de días).
const transicionG10 = extra => turnoG10(Object.assign({
  VENT_VIA_AEREA: 'TOT', VENT_VIA_AEREA_FINAL: 'Natural', VENT_SOPORTE: 'VM', VENT_SOPORTE_FINAL: 'VNI',
  TRANS_MOTIVO: 'Se retiró el tubo durante el traslado a pabellón',
}, extra || {}));
// El re-guardado de un turno que YA estaba guardado (el '2026-08-10-Dia' de P) con un dato cambiado.
const reguardoG10 = extra => evo('3', Object.assign({ EPISODIO_ABIERTO: MUNDO.PID_P, OP_ID: OPG, RESP_KTR_CANT: 3 }, MEDIDAS, extra || {}));

// La foto de ESTA matriz: sin la bitácora y con el orden físico de las hojas de «registros sueltos» fuera (un reintento que borra y
// reinserta sus filas las deja en otro lugar de la hoja; nadie las lee por posición) y la caché TIMELINE_JSON de la cama como conjunto.
// Lo que sigue contando EN ORDEN: CAMAS_ESTADO, EVOLUCIONES, los archivos y todo lo demás.
const FOTO_G10 = { sinHojas: ['AUDIT_LOG'], sinOrden: ['TIMELINE', 'EVALUACIONES', 'PROCEDIMIENTOS', 'REINTUBACIONES'], jsonComoConjunto: ['TIMELINE_JSON'] };
const evalsDe = pid => (DB.EVALUACIONES || []).filter(e => e.PATIENT_ID === pid);
const filasDeTurno = (idCama, tk) => DB.EVOLUCIONES.filter(e => String(e.ID_CAMA) === String(idCama) && e.TURNO_KEY === tk);
const hitosDe_ = pid => DB.TIMELINE.filter(h => h.PATIENT_ID === pid);
const repetidos = (lista, clave) => { const m = {}; lista.forEach(x => { const k = clave(x); m[k] = (m[k] || 0) + 1; }); return Object.keys(m).filter(k => m[k] > 1); };
const filaTurno = (idCama, tk) => filasDeTurno(idCama, tk)[0] || {};

/**
 * Lo que guardarEvolucion promete en CUALQUIER corte: el turno es UNA fila, ninguna medición, procedimiento, hito ni reintubación
 * se repite. Y, ya terminado ('final'): las cuentas que corresponden (`esp`: mediciones y hitos de medición; el ingreso, UNO).
 */
const violaGE = (idCama, pid, tk, esp) => fase => {
  const filas = filasDeTurno(idCama, tk);
  if (filas.length > 1) return 'el turno quedó en ' + filas.length + ' filas';
  const ev = repetidos(evalsDe(pid), e => e.ESCALA + '|' + e.ID_EVOLUCION);
  if (ev.length) return 'una medición está repetida en EVALUACIONES (' + ev.join(', ') + ')';
  const pr = repetidos(DB.PROCEDIMIENTOS.filter(x => x.PATIENT_ID === pid), x => x.ID_EVOLUCION + '|' + x.NOMBRE_PROC);
  if (pr.length) return 'un procedimiento está repetido (' + pr.join(', ') + ')';
  const hi = repetidos(hitosDe_(pid), h => [h.TIPO, h.TEXTO, h.FECHA, h.TURNO].join('|'));
  if (hi.length) return 'un hito está repetido (' + hi.map(x => x.slice(0, 40)).join(', ') + ')';
  const rb = repetidos((DB.REINTUBACIONES || []).filter(x => x.PATIENT_ID === pid), x => x.ID_REINTUB);
  if (rb.length) return 'una reintubación está repetida';
  if (fase !== 'final') return '';
  if (filas.length !== 1) return 'el turno no quedó guardado (' + filas.length + ' filas)';
  if (evalsDe(pid).length !== esp.evals) return 'hay ' + evalsDe(pid).length + ' mediciones y eran ' + esp.evals;
  const he = hitosDe_(pid).filter(h => h.TIPO === 'evaluacion').length;
  if (he !== esp.evals) return 'hay ' + he + ' hitos de medición y eran ' + esp.evals;
  const ing = hitosDe_(pid).filter(h => h.TIPO === 'ingreso').length;
  if (ing !== esp.ingreso) return 'hay ' + ing + ' hitos de ingreso y era(n) ' + esp.ingreso;
  return (camaDe(idCama).ULTIMO_TURNO_KEY !== tk || camaDe(idCama).PATIENT_ID !== pid) ? 'la cama no quedó al día con el turno' : '';
};
const OPTS_GE = { foto: FOTO_G10, queSeVe: 'un turno, una medición, un procedimiento o un ingreso duplicado' };

tramo('el mundo de guardarEvolucion', () => {
  volverAlMundo();
  const r = llama('GUARDAR_EVOLUCION', turnoG10());
  si('(el montaje) un turno nuevo de P con procedimientos, nota, mediciones y cultivo entra', r.ok);
  eq('   …y deja las dos mediciones y el cultivo en la serie, cada una con su hito', evalsDe(MUNDO.PID_P).length + '/' + hitosDe_(MUNDO.PID_P).filter(h => h.TIPO === 'evaluacion').length, '3/3');
  volverAlMundo();
  const i = llama('GUARDAR_EVOLUCION', ingresoG10());
  si('(el montaje) el ingreso sobre la cama 9 (libre) con el PATIENT_ID acuñado entra', i.ok && camaDe('9').PATIENT_ID === PID_NUEVO);
  eq('   …con UN hito de ingreso y dos mediciones', hitosDe_(PID_NUEVO).filter(h => h.TIPO === 'ingreso').length + '/' + evalsDe(PID_NUEVO).length, '1/2');
});

tramo('GUARDAR_EVOLUCION · ingreso', () => {
  const esp = { evals: 2, ingreso: 1 };
  console.log('   · el INGRESO con OP_ID');
  const a = matriz('GUARDAR_EVOLUCION de un ingreso con OP_ID', 'GUARDAR_EVOLUCION', () => ingresoG10(), violaGE('9', PID_NUEVO, TK, esp), OPTS_GE);
  // El compromiso es la escritura de la FILA de la cama (`repoEscribirFila`); las otras escrituras de CAMAS_ESTADO del camino son
  // actualizaciones de una o dos columnas (el espejo ULT_* de cada medición y el caché del timeline) que vienen DESPUÉS.
  const _filasCama = a.reg.map((x, i) => x === 'repoEscribirFila(CAMAS_ESTADO)' ? i : -1).filter(i => i >= 0);
  eq('★ el compromiso es UNA sola escritura de la fila de la cama y NO es la primera (la evolución, los procedimientos y los hitos van antes)',
    _filasCama.length + '/' + (_filasCama[0] > 0), '1/true');
  console.log('   · el INGRESO sin OP_ID (solo el PATIENT_ID acuñado: lo que reconoce el «ya hecho» sin sello)');
  matriz('GUARDAR_EVOLUCION de un ingreso sin OP_ID', 'GUARDAR_EVOLUCION', () => sinOpId(ingresoG10()), violaGE('9', PID_NUEVO, TK, esp), OPTS_GE);
  console.log('   · el INGRESO de un paciente que llegó con la vía aérea de afuera (VA_EXTERNO: la vía parte antes del ingreso)');
  matriz('GUARDAR_EVOLUCION de un ingreso con TQT de afuera', 'GUARDAR_EVOLUCION',
    () => ingresoG10({ VENT_VIA_AEREA: 'TQT', VA_EXTERNO: true, VA_EXTERNO_DIAS: 5 }), violaGE('9', PID_NUEVO, TK, esp), OPTS_GE);
});

tramo('GUARDAR_EVOLUCION · turno nuevo', () => {
  const esp = { evals: 3, ingreso: 1 };   // el ingreso de P (el de INGRESAR_PACIENTE del montaje) es UNO y no se toca
  console.log('   · un TURNO NUEVO con OP_ID');
  matriz('GUARDAR_EVOLUCION de un turno nuevo con OP_ID', 'GUARDAR_EVOLUCION', () => turnoG10(), violaGE('3', MUNDO.PID_P, TKN, esp), OPTS_GE);
  console.log('   · un TURNO NUEVO sin OP_ID (el reclamo de episodio es lo único que lo ata)');
  matriz('GUARDAR_EVOLUCION de un turno nuevo sin OP_ID', 'GUARDAR_EVOLUCION', () => sinOpId(turnoG10()), violaGE('3', MUNDO.PID_P, TKN, esp), OPTS_GE);
  console.log('   · RE-GUARDAR un turno que ya estaba guardado');
  matriz('GUARDAR_EVOLUCION re-guardando un turno con OP_ID', 'GUARDAR_EVOLUCION', () => reguardoG10(), violaGE('3', MUNDO.PID_P, TK, { evals: 2, ingreso: 1 }), OPTS_GE);
  console.log('   · una TRANSICIÓN de soporte y vía aérea (VM a VNI, TOT a Natural) con su razón escrita');
  matriz('GUARDAR_EVOLUCION con una transición de soporte y vía aérea', 'GUARDAR_EVOLUCION', () => transicionG10(), violaGE('3', MUNDO.PID_P, TKN, esp), OPTS_GE);
});

/* ══ 20 · LOS DÍAS DE VM, VNI Y VA TRAS LA MUERTE Y EL REINTENTO ══════════ */
console.log('\n20 · DIAS_VM, DIAS_VNI y DIAS_VA: tras morir justo después del compromiso, el reintento da los de la corrida limpia');
// 🔴 EL DEFECTO. Los tres se calculan leyendo la CAMA (`cama.SOPORTE`, `cama.VIA_AEREA`, `cama.FECHA_INICIO_*`), no el episodio
// previo. La primera corrida los calcula con la cama como estaba; el compromiso (la escritura de la cama) la deja ya en el
// soporte y la vía aérea del final del turno, con las fechas de inicio estampadas; el reintento lee ESA cama y puede dar otro
// número. La regla: si la cama ya absorbió este turno (ULTIMO_TURNO_KEY === turnoKey) y el turno ya estaba en EVOLUCIONES
// para el mismo paciente con el mismo soporte y la misma vía aérea, los días se conservan los de esa fila.
const DIAS = ['DIAS_VM', 'DIAS_VNI', 'DIAS_VA'];
const diasDe = (idCama, tk) => DIAS.map(k => k + '=' + filaTurno(idCama, tk)[k]).join(' ');
const indiceDelCompromiso = reg => reg.findIndex(x => /^repo(EscribirFila|Actualizar)\(CAMAS_ESTADO\)$/.test(x)) + 1;   // la N que SÍ aterriza
tramo('días tras la muerte', () => {
  const casos = [
    ['un ingreso con TQT de afuera (VA_EXTERNO 5 días): la vía parte 5 días antes', () => ingresoG10({ VENT_VIA_AEREA: 'TQT', VA_EXTERNO: true, VA_EXTERNO_DIAS: 5 }), '9', TK],
    ['una transición VM a VNI y TOT a Natural', () => transicionG10(), '3', TKN],
    ['un turno nuevo que sigue en VM con TOT (sin transición)', () => turnoG10(), '3', TKN],
  ];
  casos.forEach(([etq, mk, cama, tk]) => {
    volverAlMundo();
    const r0 = llama('GUARDAR_EVOLUCION', mk());
    const limpio = diasDe(cama, tk), reg = M.registro(), N = indiceDelCompromiso(reg);
    si('(el caso) ' + etq + ': la corrida limpia entra y el compromiso es la escritura ' + N, r0.ok && N > 0);
    // 1 · muerte JUSTO tras el compromiso (la cama ya absorbió el turno; las colas no corrieron).
    volverAlMundo();
    callando(() => { M.muereTrasLaEscritura(N); llama('GUARDAR_EVOLUCION', mk()); });
    M.reiniciar();
    llama('GUARDAR_EVOLUCION', mk());
    eq('★ ' + etq + ' · muerte tras el compromiso y reintento: los días son los de la corrida limpia', diasDe(cama, tk), limpio);
    // 2 · re-guardar el MISMO turno sin muerte (la cama ya está al día con él): los días no se mueven.
    volverAlMundo();
    llama('GUARDAR_EVOLUCION', mk());
    const primero = diasDe(cama, tk);
    llama('GUARDAR_EVOLUCION', mk());
    eq('   …y re-guardar el mismo turno sin cambiar el soporte ni la vía aérea no mueve los días', diasDe(cama, tk), primero);
  });
  // La regla NO es «los días del turno no se vuelven a calcular nunca»: si el turno cambia de soporte o de vía aérea, se calcula
  // como siempre. Un re-guardado que corrige la vía final (la transición se deshace: TOT sigue) no hereda los días de la fila.
  volverAlMundo();
  llama('GUARDAR_EVOLUCION', transicionG10());
  const conTransicion = diasDe('3', TKN);
  const corregido = llama('GUARDAR_EVOLUCION', transicionG10({ VENT_VIA_AEREA: 'TOT', VENT_VIA_AEREA_FINAL: 'TOT', VENT_SOPORTE: 'VM', VENT_SOPORTE_FINAL: 'VM', TRANS_MOTIVO: 'Se reintubó de inmediato' }));
  si('(el caso) corregir la vía final del turno es un guardado válido', corregido.ok);
  eq('   …y entonces los días SÍ se vuelven a calcular (no se conservan los de la fila anterior)', diasDe('3', TKN) !== conTransicion, true);
});

/* ══ 21 · EL HITO «VÍA AÉREA CAMBIÓ SIN EVENTO» SOBREVIVE ═════════════════ */
console.log('\n21 · transicion_sin_evento: el hito sobrevive al reintento y al re-guardado del turno');
// 🔴 EL DEFECTO. El hito se calcula contra `cama.VIA_AEREA` («venía con TOT, queda con Natural»). Tras el compromiso la cama ya
// dice Natural: en el reintento (y en CUALQUIER re-guardado del turno) no se regenera, y `_timelineDelGuardado` borra los hitos
// automáticos del turno —este es de tipo via_aerea, automático— sin reponerlo: la razón escrita por el colega desaparecía en silencio.
// La regla: si el turno ya tiene ese hito para este episodio con la misma razón y la misma vía final, se repone el MISMO.
const transHitos = pid => DB.TIMELINE.filter(h => h.PATIENT_ID === pid && /transicion_sin_evento/.test(String(h.DATOS_JSON || '')));
tramo('transicion_sin_evento', () => {
  volverAlMundo();
  const r0 = llama('GUARDAR_EVOLUCION', transicionG10());
  const limpio = transHitos(MUNDO.PID_P).map(h => h.TEXTO);
  eq('(el caso) la corrida limpia deja UN hito, con la razón escrita', limpio.length + '/' + /sin evento declarado: «Se retiró el tubo durante el traslado a pabellón»/.test(limpio[0] || ''), '1/true');
  si('   …y la cama pasó a Natural', r0.ok && camaDe('3').VIA_AEREA === 'Natural');
  const N = indiceDelCompromiso(M.registro());
  // 1 · muerte tras el compromiso y reintento.
  volverAlMundo();
  callando(() => { M.muereTrasLaEscritura(N); llama('GUARDAR_EVOLUCION', transicionG10()); });
  eq('(el corte) justo tras el compromiso la cama ya dice Natural', camaDe('3').VIA_AEREA, 'Natural');
  M.reiniciar();
  llama('GUARDAR_EVOLUCION', transicionG10());
  eq('★ el hito SOBREVIVE al reintento (uno solo, el mismo texto)', transHitos(MUNDO.PID_P).map(h => h.TEXTO).join('|'), limpio.join('|'));
  // 2 · re-guardar el turno sin muerte, cambiando otro dato.
  volverAlMundo();
  llama('GUARDAR_EVOLUCION', transicionG10());
  const r2 = llama('GUARDAR_EVOLUCION', transicionG10({ RESP_KTR_CANT: 4 }));
  eq('★ re-guardar el turno (corrigiendo otro dato) NO borra el hito: hoy se perdía en cualquier re-guardado', r2.ok + '/' + transHitos(MUNDO.PID_P).map(h => h.TEXTO).join('|'), 'true/' + limpio.join('|'));
  // 2b · la pantalla NO trae la razón al reabrir un turno (TRANS_MOTIVO no es una columna de EVOLUCIONES): ese re-guardado conserva el hito.
  volverAlMundo();
  llama('GUARDAR_EVOLUCION', transicionG10());
  const sinRazon = transicionG10(); delete sinRazon.TRANS_MOTIVO;
  const r2b = llama('GUARDAR_EVOLUCION', Object.assign(sinRazon, { RESP_KTR_CANT: 5 }));
  eq('★ re-guardar el turno SIN la razón en el payload (como lo reabre la pantalla) tampoco borra el hito', r2b.ok + '/' + transHitos(MUNDO.PID_P).map(h => h.TEXTO).join('|'), 'true/' + limpio.join('|'));
  // 3 · si la razón CAMBIA, manda la nueva; si la vía final cambia, ya es otra transición (se calcula como siempre).
  const r3 = llama('GUARDAR_EVOLUCION', transicionG10({ TRANS_MOTIVO: 'La razón quedó corregida por el colega' }));
  eq('   …una razón corregida: manda la nueva y sigue habiendo UN solo hito', r3.ok + '/' + transHitos(MUNDO.PID_P).length + '/' + /La razón quedó corregida por el colega/.test((transHitos(MUNDO.PID_P)[0] || {}).TEXTO || ''), 'true/1/true');
  // 4 · sin razón escrita no se inventa uno: el turno que no la trae no deja hito (y no lo reponía antes tampoco).
  volverAlMundo();
  llama('GUARDAR_EVOLUCION', turnoG10());
  eq('   …un turno sin transición no deja ningún hito de ese tipo', transHitos(MUNDO.PID_P).length, 0);
  // 5 · el hito de OTRO turno del mismo episodio no se toca ni se repone en este.
  volverAlMundo();
  llama('GUARDAR_EVOLUCION', transicionG10());
  llama('GUARDAR_EVOLUCION', evo('3', { TURNO_KEY: '2026-08-11-Dia', EPISODIO_ABIERTO: MUNDO.PID_P, VENT_VIA_AEREA: 'Natural', VENT_SOPORTE: 'VNI' }));
  eq('   …el turno siguiente (sin transición propia) no se lleva ni duplica el hito del anterior', transHitos(MUNDO.PID_P).length, 1);
});

/* ══ 22 · LAS COLAS QUE TRAGABAN EL ERROR ═════════════════════════════════ */
console.log('\n22 · Las colas (mediciones a la serie, cultivo, hito de la medición, reintubación): si fallan, ok con advertencias, sin sello, y el reintento las completa');
// 🔴 EL DEFECTO. Después del compromiso, guardarEvolucion copiaba las mediciones del turno a la serie, el cultivo y la reintubación
// dentro de un `try { … } catch (e) { console.warn(…) }`: si fallaba una, la respuesta era un ok limpio y el sello recordaba «ya
// hecho». El reintento con el mismo OP_ID devolvía la repetida y la medición no se copiaba NUNCA (hasta que alguien re-guardara el turno).
// Ahora lo que no se pudo vuelve como `data.advertencias[]`: ok, con el aviso, SIN sellar; el reintento ejecuta y lo completa.
// Se falla UNA escritura de la hoja (la cola «sin disco») y se deja pasar el resto.
const fallarEscritura = (hoja, pred) => {
  const orig = global.repoInsertar; let hecho = false;
  global.repoInsertar = function (h, o) {
    if (!hecho && h === hoja && (!pred || pred(o))) { hecho = true; throw new Error('sim: ' + hoja + ' no disponible'); }
    return orig.apply(this, arguments);
  };
  return () => { global.repoInsertar = orig; return hecho; };
};
const fallarUpsert = (hoja) => {
  const orig = global.repoUpsert; let hecho = false;
  global.repoUpsert = function (h) {
    if (!hecho && h === hoja) { hecho = true; throw new Error('sim: ' + hoja + ' no disponible'); }
    return orig.apply(this, arguments);
  };
  return () => { global.repoUpsert = orig; return hecho; };
};
const reintubG10 = () => turnoG10({ EXT_REINTUB: true, EXT_REINTUB_RAZ: 'Estridor', REINTUB_HORA: '22:30', PROC_JSON: JSON.stringify(['REINTUBACIÓN', 'IMAGENOLOGÍA']) });
tramo('colas', () => {
  const sellos = () => opsDelCaché().length;
  const casos = [
    ['las mediciones del turno (EVALUACIONES de la primera medición)', () => turnoG10(), () => fallarEscritura('EVALUACIONES', o => o.ESCALA === 'MRC'), 1],
    ['el cultivo a la serie (EVALUACIONES del cultivo)', () => turnoG10(), () => fallarEscritura('EVALUACIONES', o => o.ESCALA === 'CULTIVO'), 1],
    ['el hito de la medición (TIMELINE del hito «evaluacion»)', () => turnoG10(), () => fallarEscritura('TIMELINE', o => o.TIPO === 'evaluacion'), 1],
    ['la reintubación (REINTUBACIONES)', () => reintubG10(), () => fallarUpsert('REINTUBACIONES'), 1],
  ];
  casos.forEach(([etq, mk, fallar, nAdv]) => {
    volverAlMundo();
    const r0 = llama('GUARDAR_EVOLUCION', mk());
    const limpio = M.instantanea(FOTO_G10);
    si('(el caso) ' + etq + ': la corrida limpia entra y termina sin avisos', r0.ok && !(r0.data && r0.data.advertencias));

    volverAlMundo();
    const restaurar = fallar();
    const r1 = llama('GUARDAR_EVOLUCION', mk());
    const huboFalla = restaurar();
    si('★ ' + etq + ': la falla se produjo', huboFalla);
    eq('   …la respuesta es OK (el turno ya está guardado)…', r1.ok, true);
    const adv = (r1.data && r1.data.advertencias) || [];
    eq('★ …con data.advertencias: un aviso que dice qué quedó pendiente', Array.isArray(adv) ? adv.length : 'no es lista', nAdv);
    si('   …en palabras de la unidad y sin datos del paciente ni mensajes técnicos',
      adv.length > 0 && adv.every(a => typeof a === 'string' && a.length > 20 && a.length < 220 && !/sim:|Error|undefined|Paciente|Charly|\d{7,}/.test(a)));
    eq('★★ …y NO se sella (el reintento tiene que poder completar lo que falló)', sellos(), 0);
    eq('   …el servidor tampoco dice «repetida»', r1.data && r1.data.repetida, undefined);

    const r2 = llama('GUARDAR_EVOLUCION', mk());
    eq('★ el reintento con el MISMO OP_ID ejecuta (no es una repetida) y termina sin avisos', r2.ok + '/' + (r2.data && r2.data.repetida) + '/' + ((r2.data && r2.data.advertencias) ? 'con avisos' : 'sin avisos'), 'true/undefined/sin avisos');
    eq('★★ …y deja el estado de la corrida limpia (la medición se copió, sin duplicar nada)', M.instantanea(FOTO_G10) === limpio, true);
    if (M.instantanea(FOTO_G10) !== limpio) M.diferencias(limpio, M.instantanea(FOTO_G10)).slice(0, 4).forEach(l => console.log('        ' + l.slice(0, 170)));
    eq('   …y ahora sí se sella', sellos(), 1);
    M.reiniciar();   // el contador de escrituras parte de cero: lo que se mide es lo que escribe la repetida
    const r3 = llama('GUARDAR_EVOLUCION', mk());
    eq('   …y un tercer intento es la repetida, con cero escrituras', (r3.data && r3.data.repetida) + '/' + M.total(), 'true/0' ) || 0;
  });

  // Sin falla alguna la respuesta NO trae la clave (la respuesta de siempre queda idéntica).
  volverAlMundo();
  const ok1 = llama('GUARDAR_EVOLUCION', turnoG10());
  si('★ sin ninguna falla la respuesta no trae la clave «advertencias» (no cambia la de siempre)', ok1.ok && !('advertencias' in (ok1.data || {})));

  // Una medición con un valor FUERA DE RANGO no es una falla de la cola: es un dato inválido que el servidor siempre ignoró en
  // la serie. No se vuelve un aviso eterno (el reintento lo repetiría igual) ni se sella distinto.
  volverAlMundo();
  const fuera = llama('GUARDAR_EVOLUCION', turnoG10({ EVAL_T_MRC: 99 }));
  eq('   un MRC fuera de rango (99): la respuesta no cambia (ok, sin aviso: no es una falla de la cola)', fuera.ok + '/' + ('advertencias' in (fuera.data || {})), 'true/false');
});

// EL LÍMITE QUE SE DEJA ESCRITO. Una cama OCUPADA sin PATIENT_ID (un episodio cargado a mano, sin ingreso formal) no tiene identidad
// para el reintento: el guardado acuña un uuid propio y, si moría ANTES del compromiso, el reintento acuña otro. La matriz lo mide y
// lo DICE (no lo exige): arreglarlo pide acuñar el pid desde la pantalla o derivarlo del OP_ID, y eso es otra decisión. No afecta a
// un ingreso hecho por la pantalla de ahora (trae su PATIENT_ID acuñado: matriz de arriba) ni a una cama con paciente ingresado.
tramo('límite conocido: cama ocupada sin PATIENT_ID', () => {
  volverAlMundo();
  Object.assign(camaDe('3'), { PATIENT_ID: '' });
  const F = M.foto();
  const mk = () => turnoG10({ EPISODIO_ABIERTO: '' });
  M.restaurar(F); llama('GUARDAR_EVOLUCION', mk());
  const limpio = M.instantanea(FOTO_G10), total = M.total(), malos = [];
  for (let n = 1; n <= total; n++) {
    M.restaurar(F);
    callando(() => { M.muereTrasLaEscritura(n); llama('GUARDAR_EVOLUCION', mk()); });
    M.reiniciar(); llama('GUARDAR_EVOLUCION', mk());
    if (M.instantanea(FOTO_G10) !== limpio) malos.push(n);
  }
  info('   GUARDAR_EVOLUCION sobre una cama ocupada SIN PATIENT_ID · cortes tras cuyo reintento el estado difiere de la limpia (límite conocido, no se exige): ' + (malos.join(',') || '(ninguno)'));
});

/* ══ 23 · LA FORMA DE LA RECUPERACIÓN DEL GUARDADO ════════════════════════ */
console.log('\n23 · La forma: el flujo no se reordena, el compromiso sigue siendo la escritura de la cama y ninguna cola vuelve a tragarse el error');
tramo('forma de guardarEvolucion', () => {
  const sinComentarios = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
  const ev = sinComentarios(leer('svc_evoluciones.gs')), evals = sinComentarios(leer('svc_evaluaciones.gs'));
  const ini = ev.indexOf('function guardarEvolucion('), fin = ev.indexOf('\n}\n', ini);
  const ge = ev.slice(ini, fin);
  const pos = re => ge.search(re);
  const orden = [/repoUpsertEnFila\('EVOLUCIONES'/, /_guardarProcedimientosInterno\(/, /_timelineDelGuardado\(/, /_syncCamaDesdeEvolucion\(/, /_evalDesdeEvolucion\(/, /_registrarReintubacion\(/, /SpreadsheetApp\.flush\(\)/];
  const posiciones = orden.map(pos);
  si('★ el flujo NO se reordenó: evolución, procedimientos, hitos, la cama, mediciones, reintubación y el flush, en ese orden',
    posiciones.every(x => x > -1) && posiciones.every((x, i) => i === 0 || x > posiciones[i - 1]));
  eq('   …y la cama se escribe UNA sola vez en el camino (el compromiso)', (ge.match(/_syncCamaDesdeEvolucion\(/g) || []).length, 1);
  si('★ las colas ya no se tragan el error: el guardado junta data.advertencias y las devuelve', /advertencias/.test(ge) && /advertencias\.push\(/.test(ge));
  // Entre la cola de mediciones y el flush no puede quedar un `catch` que no sume su aviso: cada uno dice qué quedó pendiente.
  const colas = ge.slice(pos(/_evalDesdeEvolucion\(/), pos(/SpreadsheetApp\.flush\(\)/));
  const catches = colas.split('catch (').slice(1);
  si('★ ninguna cola termina solo en console.warn: hay un catch para las mediciones y otro para la reintubación, y los dos suman su aviso',
    catches.length >= 2 && catches.every(c => /advertencias\.push\(/.test(c.slice(0, 400))));
  const ede = (evals.match(/function _evalDesdeEvolucion\([\s\S]*?\n\}\n/) || [''])[0];
  const cul = (evals.match(/function _cultivoALaSerie\([\s\S]*?\n\}\n/) || [''])[0];
  no('★ _cultivoALaSerie no se traga nada: no hay un catch vacío ni uno que solo avise', /catch\s*\(\w+\)\s*\{\s*(console\.warn\([^)]*\);?\s*)?\}/.test(cul));
  si('   …y _evalDesdeEvolucion devuelve los avisos (las mediciones que fallaron NO se pierden en un console.warn)', /advertencias/.test(ede) && !/console\.warn\('cultivo a la serie/.test(ede));
  si('★ _evalRegistrarInterno sigue con la firma (datos, ctx) y no compara el episodio (lo hace quien la llama)', /function _evalRegistrarInterno\(datos, ctx\)/.test(evals) && !/validarEpisodioPuerta/.test((evals.match(/function _evalRegistrarInterno\([\s\S]*?\n\}\n/) || [''])[0]));
  const tl = sinComentarios(leer('svc_timeline.gs'));
  const tdg = (tl.match(/function _timelineDelGuardado\([\s\S]*?\n\}\n/) || [''])[0];
  si('★ _timelineDelGuardado sigue borrando solo los hitos AUTOMÁTICOS del turno y del episodio, y los reinserta en un solo lote', /_TIPOS_HITO_AUTO\.indexOf/.test(tdg) && (tdg.match(/repoInsertarVarios\('TIMELINE'/g) || []).length === 1);
  eq('   …y no cambió de lectura: sigue siendo UNA sola lectura de TIMELINE (los viajes a hojas no suben)', (tdg.match(/repoLeer\w*\(/g) || []).length + '/' + (tdg.match(/repoLeerTodosConFila\('TIMELINE'\)/g) || []).length, '1/1');
  si('★ y recibe el hito a conservar (la vía con que queda el turno y la razón del payload) y lo busca en ESA misma lectura',
    /function _timelineDelGuardado\([^)]*conservar\)/.test(tl) && /conservar\.a/.test(tdg) && /transicion_sin_evento/.test(tdg));
  si('   …y guardarEvolucion se lo pasa y arma el hito con el helper compartido (un solo texto para la primera vez y la corrección)',
    /_timelineDelGuardado\([^;]*\{ a: _vaFinalTurno, motivo: _transMotivo \}\)/.test(ge) && /_hitoTransicionSinEvento\(/.test(ge) && /function _hitoTransicionSinEvento\(/.test(tl));
  no('   …el hito de ingreso ya no depende de «fila nueva» (el reintento tras morir antes de los hitos lo repone)', /ES_INGRESO\)\s*&&\s*esNuevo/.test(ge));
  si('★ DIAS_VM, DIAS_VNI y DIAS_VA conservan los de la fila del turno cuando la cama ya absorbió el turno y el soporte y la vía no cambiaron',
    /cama\.ULTIMO_TURNO_KEY[^;]*===\s*turnoKey/.test(ge) && /_prev\.PATIENT_ID[^;]*patientId/.test(ge) && /'DIAS_VM', 'DIAS_VNI', 'DIAS_VA'/.test(ge));
});


terminar();
