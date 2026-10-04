// guardado_seguro_cobertura.js — EL CENSO DE PUERTAS DEL GUARDADO SEGURO (tanda 2, paso 2).
//
// 🔴 DE DÓNDE SALE. La auditoría de la tanda 2 encontró que SOLO guardarEvolucion comparaba el paciente que la
// pantalla abrió con el que ocupa la cama; las otras quince puertas atribuían lo que hacen a «quien esté en la cama
// ahora». Arreglar quince puertas una por una tiene un riesgo que no es técnico: que se arregle catorce, o que
// mañana alguien agregue la puerta número dieciséis en api.gs sin pensar en esto, y que nadie lo note —porque una
// puerta sin candado no da ningún error: guarda, y guarda sobre la persona equivocada—.
//
// Esta guardia es el CENSO. Lee api.gs y exige que TODA acción que pasa por `_auditar` (o sea, toda escritura)
// esté en una tabla, clasificada en una de tres clases, con su razón por escrito:
//
//   · 'episodio'    actúa sobre «quien esté en la cama»: lleva candado de episodio (EPISODIO_ABIERTO, capturado por
//                   la pantalla al abrir el diálogo). Es la clase que se va a ir cerrando.
//   · 'ingreso'     crea el episodio: no puede reclamar uno que todavía no existe; lleva en su lugar un PATIENT_ID
//                   acuñado por quien llama (G15).
//   · 'sinEpisodio' no actúa sobre ningún paciente (la cama aparece como un número —stock, ventiladores— o no
//                   aparece). Cada una dice POR QUÉ no necesita candado: «no lo pensé» no es una razón.
//
// Y ata las dos puntas, para que la tabla no sea un papel:
//   1. cada `case` de api.gs que pasa por `_auditar` está en la tabla, y cada fila de la tabla sigue existiendo;
//   2. `epImplementado`: las filas NACEN en false y se voltean a true UNA a una, y voltearla es el rojo de ese paso.
//      Una fila en true exige que el dispatcher pase el reclamo a su servicio (`_epDeDatos(datos)`); una en false
//      exige que todavía NO lo pase. Así la tabla no puede mentir en ninguno de los dos sentidos. Al cerrar la
//      tanda (paso 17) no puede quedar NINGUNA fila 'episodio' o 'ingreso' en false;
//   3. la lista `_ACC_EPISODIO` de api.gs —la que decide qué filas de AUDIT_LOG llevan « [sin episodio]»— es
//      exactamente la de las filas 'episodio' de la tabla: dos listas escritas a mano que no se pueden separar.
//
// Fuera de `_auditar` hay una sola puerta con candado de episodio: COORD_CORREGIR (se audita sola, con la firma de
// coordinación). Entra a la tabla con `viaAuditar:false` y su reclamo es `patientId`, no EPISODIO_ABIERTO: lo compara el
// propio servicio (el dispatcher no le pasa `ep`), así que `epImplementado` no se mide contra api.gs en esa fila; lo prueba
// la sección E de guardado_seguro_episodio_g14.js (comportamiento y forma).
//
// 🪤 LA GUARDIA SE PRUEBA A SÍ MISMA. Un censo que nunca se vio rojo no prueba que cace nada: antes de dar por
// bueno el resultado real, se le corrige un defecto a propósito a la tabla o a api.gs (borrar una fila, agregar una
// puerta, voltear una fila sin implementarla, vaciar una razón, separar las dos listas) y se exige que cada uno la
// ponga roja.
//
// Esta guardia NO exige todavía que index.html mande OP_ID ni EPISODIO_ABIERTO desde cada puerta: eso lo exigen las
// guardias de la pantalla (pasos 12 y 14), cuando la pantalla lo hace.
//
// Uso: node build/checks/guardado_seguro_cobertura.js
'use strict';
const fs = require('fs');
const path = require('path');

const V2 = path.resolve(__dirname, '..', '..', 'v2');
const API_SRC = fs.readFileSync(path.join(V2, 'api.gs'), 'utf8');

const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g) + (okk ? '' : ' (esperado ' + JSON.stringify(w) + ')'));
  if (!okk) fails.push(l);
};
const si = (l, c) => eq(l, !!c, true);
const info = t => console.log('ℹ️  ' + t);

/* ══ LA TABLA ═════════════════════════════════════════════════════════════ */
// clase: 'episodio' | 'ingreso' | 'sinEpisodio'. razon: para 'episodio' e 'ingreso', cuál es el reclamo y de dónde
// lo toma la pantalla; para 'sinEpisodio', por qué no necesita candado. epImplementado: nace en false.
// `hecho` voltea la fila a epImplementado:true: es lo que cierra un paso (el dispatcher le pasa el reclamo a su servicio).
const E = (accion, razon, hecho) => ({ accion, clase: 'episodio', epImplementado: hecho === true, razon });
const SIN = (accion, razon) => ({ accion, clase: 'sinEpisodio', razon });
const TABLA = [
  // ── Actúan sobre «quien esté en la cama» ──
  E('GUARDAR_EVOLUCION',       'EPISODIO_ABIERTO del formulario, capturado al abrirlo; y en un ingreso, el PATIENT_ID acuñado por la pantalla (G15).', true),   // paso 8
  E('DAR_ALTA',                'EPISODIO_ABIERTO tomado al abrir el diálogo de egreso y pasado por argumento, nunca releído de la base al confirmar.', true),   // paso 5
  E('LIMPIAR_CAMA',            'EPISODIO_ABIERTO de la tarjeta al abrir el diálogo: nunca se limpia al ocupante nuevo.', true),   // paso 5
  E('INTERCAMBIAR_CAMAS',      'EPISODIO_ABIERTO (cama A) y EPISODIO_ABIERTO_B (cama B), capturados al elegir las dos camas.', true),   // paso 5
  E('MOVER_A_CAMA_VACIA',      'EPISODIO_ABIERTO (origen) y EPISODIO_ABIERTO_B (destino; vacío = libre al elegir).', true),   // paso 5
  E('ANULAR_EVENTO',           'EPISODIO_ABIERTO de la tarjeta mostrada al abrir el menú del evento; la comparación va DENTRO del lock.', true),   // paso 4
  E('ANEXAR_EVENTO',           'EPISODIO_ABIERTO de la tarjeta al abrir el ➕; datos.patientId declarado queda como respaldo.', true),   // paso 6
  E('ANULAR_ANEXO',            'EPISODIO_ABIERTO de la tarjeta al abrir.', true),   // paso 6
  E('CONFIRMAR_DISPOSITIVOS',  'EPISODIO_ABIERTO de la tarjeta al abrir el diálogo: hoy basta con que la cama esté ocupada.', true),   // paso 6
  E('AGREGAR_HITO',            'EPISODIO_ABIERTO de la tarjeta al abrir: hoy el hito se atribuye a quien esté en la cama.', true),   // paso 6
  E('EVAL_REGISTRAR',          'EPISODIO_ABIERTO de la tarjeta al abrir la medición: además escribe el espejo ULT_* en la cama del ocupante actual.', true),   // paso 7
  E('EPISODIO_ESCALA',         'EPISODIO_ABIERTO de la tarjeta al abrir la escala previa a la UCI: hoy escribe sobre la cama que esté ocupada.', true),   // paso 7
  E('PEND_ABRIR',              'EPISODIO_ABIERTO de la tarjeta al abrir el chip de pendientes.', true),   // paso 7
  E('PEND_CERRAR',             'EPISODIO_ABIERTO de la tarjeta al abrir: ya la protege el id del pendiente, se agrega para que el censo no tenga excepciones.', true),   // paso 7
  E('GSA_ASIGNAR',             'EPISODIO_ABIERTO = el paciente de la cama elegida en la bandeja al abrir el selector de asignación.', true),   // paso 7
  // ── Crea el episodio ──
  { accion: 'INGRESAR_PACIENTE', clase: 'ingreso', epImplementado: true,   // paso 8
    razon: 'Crea el episodio: no puede reclamar uno que no existe. Lleva datos.PATIENT_ID acuñado por quien llama (la pantalla actual ingresa por GUARDAR_EVOLUCION y no usa esta acción).' },
  // ── Fuera de _auditar: se audita sola, con la firma del modo coordinación ──
  { accion: 'COORD_CORREGIR', clase: 'episodio', viaAuditar: false, epImplementado: true,   // paso 7
    razon: 'Reclamo = datos.patientId (el episodio que la ficha mostró) más idCama, resueltos por _coordUbicar; exige además la sesión de coordinación.' },
  // ── No actúan sobre ningún paciente ──
  SIN('PLANTILLA_GUARDAR',          'Catálogo de plantillas de texto del equipo: no tiene paciente ni cama.'),
  SIN('PLANTILLA_RETIRAR',          'Catálogo de plantillas de texto del equipo: no tiene paciente ni cama.'),
  SIN('GSA_IMPORTAR',               'Lee el archivo de gases y deja filas PENDIENTES en la bandeja: todavía no se asignan a ningún paciente (eso es GSA_ASIGNAR).'),
  SIN('GSA_DESCARTAR',              'Descarta una fila de la bandeja de gases: no toca ningún paciente ni ninguna cama.'),
  SIN('GUARDAR_SUGERENCIA',         'Buzón de sugerencias del equipo: no tiene paciente ni cama.'),
  SIN('SET_SUGERENCIA_ESTADO',      'Cambia el estado de una sugerencia del buzón: no tiene paciente ni cama.'),
  SIN('SET_ASIGNACION_TURNO',       'Reparte kinesiólogos por turno: la cama es un número de la asignación (quién cubre la cama N), no quién la ocupa.'),
  SIN('AGREGAR_FASE',               'Catálogo de fases clínicas de la unidad: no tiene paciente ni cama.'),
  SIN('SET_BANNER',                 'Texto de portada de cada pestaña, en la hoja CONFIG: no tiene paciente ni cama.'),
  SIN('GENERAR_REM',                'Informe mensual agregado, sin RUT y sin episodio: se calcula del archivo, no de la cama.'),
  SIN('GUARDAR_ENTREGA_TURNO',      'Texto de la entrega de turno con las camas como números: no escribe sobre ningún paciente. Va con sello de operación (su id nace del reloj).'),
  SIN('GUARDAR_VENTILADOR',         'Inventario de ventiladores: la cama aparece como número de ubicación del equipo, no como quien la ocupa.'),
  SIN('MOVER_VENTILADOR',           'Ubicación de un ventilador: la cama es un número de destino. Va con sello de operación (inserta un movimiento).'),
  SIN('MOVER_VENTILADORES_LOTE',    'Ubicación de varios ventiladores: la cama es un número de destino.'),
  SIN('BAJA_VENTILADOR',            'Baja de un ventilador del inventario: no tiene paciente.'),
  SIN('REGISTRAR_FALLA_VM',         'Falla de un ventilador: se asocia al equipo, no al paciente. Va con sello de operación (inserta una falla).'),
  SIN('GUARDAR_STOCK',              'Stock de equipos de la unidad: no tiene paciente.'),
  SIN('AJUSTAR_STOCK',              'Ajuste de stock: el delta no es idempotente, por eso va con sello de operación; no tiene paciente.'),
  SIN('ASIGNAR_STOCK',              'Entrega stock a una cama NUMERADA: el destino es un número, no quien la ocupa. Va con sello de operación (delta no idempotente).'),
];

// La familia COORD_* se audita SOLA (con la firma de quien entró al modo coordinación), no por `_auditar`: es la única
// que puede tocar la planilla saltándose el censo de arriba. Por eso la guardia también le pide cuentas: toda acción
// COORD_* de api.gs o está en la tabla (COORD_CORREGIR, la que corrige la ficha de un paciente) o está en esta lista
// de las que NO actúan sobre ningún paciente (sesión, claves, aviso al buzón, lectura de una ficha).
const COORD_SIN_PACIENTE = ['COORD_ESTADO', 'COORD_ENTRAR', 'COORD_SALIR', 'COORD_PEDIR_CODIGO', 'COORD_RECUPERAR',
  'COORD_CAMBIAR_CLAVE', 'COORD_RESTABLECER', 'COORD_FICHA', 'COORD_AVISO'];

/* ══ EL CENSO ═════════════════════════════════════════════════════════════ */
// Los `case` del interruptor de api(), cada uno con su cuerpo SIN comentarios (un comentario que nombre _auditar
// no puede hacer pasar por auditada una puerta que no lo es).
function casosDe(src) {
  const ini = src.indexOf('function api(');
  const fin = ini === -1 ? -1 : src.indexOf('\n}\n', ini);
  const cuerpo = (ini === -1 || fin === -1) ? '' : src.slice(ini, fin);
  const re = /^[ \t]*case '([A-Z0-9_]+)':/gm;
  const hits = []; let m;
  while ((m = re.exec(cuerpo))) hits.push({ n: m[1], ini: m.index, fin: m.index + m[0].length });
  const out = {};
  const def = cuerpo.indexOf('default:');
  hits.forEach((h, i) => {
    const hasta = i + 1 < hits.length ? hits[i + 1].ini : (def > -1 ? def : cuerpo.length);
    out[h.n] = cuerpo.slice(h.fin, hasta).split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  });
  return out;
}
const pasaPorAuditar = txt => /_auditar\(\s*ctx\s*,\s*accion\b/.test(txt);
const pasaEp = txt => /_epDeDatos\(/.test(txt);

// La lista _ACC_EPISODIO tal como la declara api.gs (null si todavía no existe).
function listaAccEpisodio(src) {
  try { return new Function(src + '\n;return typeof _ACC_EPISODIO === "undefined" ? null : _ACC_EPISODIO;')(); }
  catch (e) { return null; }
}

// Devuelve los problemas (vacío = el censo cuadra). PURA: recibe el fuente y la tabla, para poder probarse con
// versiones estropeadas a propósito.
function censar(src, tabla) {
  const P = [];
  const casos = casosDe(src);
  const auditados = Object.keys(casos).filter(n => pasaPorAuditar(casos[n]));
  const filas = {};
  tabla.forEach(f => {
    if (filas[f.accion]) P.push('la tabla repite la acción ' + f.accion);
    filas[f.accion] = f;
  });

  // 1 · el censo contra api.gs, en los dos sentidos
  auditados.forEach(n => { if (!filas[n]) P.push('api.gs: ' + n + ' pasa por _auditar y NO está en la tabla (¿lleva candado de episodio?)'); });
  tabla.forEach(f => {
    const c = casos[f.accion];
    if (f.viaAuditar === false) {
      if (c === undefined) P.push('tabla: ' + f.accion + ' ya no existe en api.gs');
      else if (pasaPorAuditar(c)) P.push('tabla: ' + f.accion + ' dice viaAuditar:false pero api.gs la pasa por _auditar');
      return;
    }
    if (c === undefined) P.push('tabla: ' + f.accion + ' ya no existe en api.gs (fila huérfana)');
    else if (!pasaPorAuditar(c)) P.push('tabla: ' + f.accion + ' ya no pasa por _auditar');
  });

  // 1c · la familia COORD_*, que se audita sola: ninguna acción suya sin cuenta
  Object.keys(casos).filter(n => /^COORD_/.test(n) && !pasaPorAuditar(casos[n])).forEach(n => {
    if (!filas[n] && COORD_SIN_PACIENTE.indexOf(n) === -1)
      P.push('api.gs: ' + n + ' es de coordinación, no pasa por _auditar y NO está en la tabla ni entre las que no tocan a un paciente');
  });
  COORD_SIN_PACIENTE.forEach(n => { if (casos[n] === undefined) P.push('guardia: ' + n + ' ya no existe en api.gs (sácala de COORD_SIN_PACIENTE)'); });

  // 2 · la clasificación y su razón
  tabla.forEach(f => {
    if (['episodio', 'ingreso', 'sinEpisodio'].indexOf(f.clase) === -1) P.push('tabla: ' + f.accion + ' tiene una clase inválida («' + f.clase + '»)');
    if (String(f.razon || '').trim().length < 25) P.push('tabla: ' + f.accion + ' no dice su razón por escrito');
  });

  // 3 · epImplementado contra lo que el dispatcher hace de verdad (solo filas que pasan por _auditar)
  tabla.forEach(f => {
    if (f.viaAuditar === false || casos[f.accion] === undefined) return;
    const pasa = pasaEp(casos[f.accion]);
    if (f.clase === 'sinEpisodio') {
      if (f.epImplementado) P.push('tabla: ' + f.accion + ' es sinEpisodio y no puede tener epImplementado');
      if (pasa) P.push('api.gs: ' + f.accion + ' es sinEpisodio y pasa un episodio a su servicio');
    } else if (f.epImplementado && !pasa) {
      P.push('tabla: ' + f.accion + ' dice epImplementado:true pero api.gs NO le pasa _epDeDatos(datos) a su servicio');
    } else if (!f.epImplementado && pasa) {
      P.push('tabla: ' + f.accion + ' dice epImplementado:false pero api.gs YA le pasa _epDeDatos(datos): voltea la fila');
    }
  });

  // 4 · la lista que decide « [sin episodio]» es la de las filas 'episodio' que pasan por _auditar
  const lista = listaAccEpisodio(src);
  if (!Array.isArray(lista)) P.push('api.gs: falta la lista _ACC_EPISODIO (decide qué filas de AUDIT_LOG llevan « [sin episodio]»)');
  else {
    const queda = tabla.filter(f => f.clase === 'episodio' && f.viaAuditar !== false).map(f => f.accion).sort().join(',');
    const esa = lista.slice().sort().join(',');
    if (queda !== esa) P.push('api.gs: _ACC_EPISODIO no es la de las filas episodio de la tabla (tabla: ' + queda + ' · api.gs: ' + esa + ')');
  }
  return P;
}

const CIERRE = (tabla) => tabla.filter(f => f.clase !== 'sinEpisodio' && !f.epImplementado).map(f => f.accion);

/* ══ 1 · EL CENSO REAL ════════════════════════════════════════════════════ */
console.log('1 · El censo: api.gs contra la tabla');
const casosReales = casosDe(API_SRC);
const auditadosReales = Object.keys(casosReales).filter(n => pasaPorAuditar(casosReales[n]));
si('★ api.gs trae un interruptor con acciones (el lector lo encontró)', Object.keys(casosReales).length > 40);
si('   …y varias pasan por _auditar (si el lector no ve ninguna, el censo no mide nada)', auditadosReales.length >= 30);
const problemas = censar(API_SRC, TABLA);
problemas.forEach(p => console.log('   · ' + p));
eq('★★ el censo cuadra: ninguna puerta sin clasificar, ninguna fila huérfana, ninguna razón vacía', problemas.length, 0);
const clases = c => TABLA.filter(f => f.clase === c).length;
info('puertas: ' + TABLA.length + ' (' + clases('episodio') + ' de episodio, ' + clases('ingreso') + ' de ingreso, ' + clases('sinEpisodio') + ' sin episodio); '
  + 'auditadas por _auditar en api.gs: ' + auditadosReales.length);
const pend = CIERRE(TABLA);
info('con el candado todavía por implementar (epImplementado:false): ' + pend.length + ' de ' + (clases('episodio') + clases('ingreso')));
info('(el cierre de la tanda, paso 17, exige CERO aquí: mientras tanto es la cuenta regresiva)');

/* ══ 2 · LA GUARDIA SE VE ROJA ════════════════════════════════════════════ */
console.log('\n2 · La guardia caza lo que dice cazar (cada defecto se introduce a propósito)');
const rojo = (l, src, tabla, pista) => {
  const p = censar(src, tabla);
  si('★ ' + l + ' → ROJO', p.length > 0 && (!pista || p.some(x => x.indexOf(pista) > -1)));
  return p;
};
// a) borrar una fila de la tabla, cualquiera: una puerta sin clasificar
let sinCazar = [];
TABLA.forEach(f => {
  const t = TABLA.filter(x => x !== f);
  const p = censar(API_SRC, t);
  // 🪤 «algún problema» no basta: tiene que ser EL de la fila borrada (si no, una tabla que ya estuviera roja por otra
  // cosa haría pasar esta prueba sin cazar nada).
  if (!p.some(x => x.indexOf(f.accion) > -1)) sinCazar.push(f.accion);
});
eq('★★ borrar CUALQUIER fila de la tabla la pone roja (' + TABLA.length + ' filas probadas, una a una)', sinCazar.join(',') || '(todas cazadas)', '(todas cazadas)');
// b) una puerta nueva en api.gs que nadie clasificó
const nueva = API_SRC.replace(/\n(\s*)default:/, "\n$1case 'ESCRITURA_NUEVA':\n$1  return _auditar(ctx, accion, () => escrituraNueva(datos, ctx), datos);\n$1default:");
si('(la mutación de la prueba sí agregó la puerta nueva)', nueva !== API_SRC && /ESCRITURA_NUEVA/.test(nueva));
rojo('una puerta NUEVA que pasa por _auditar sin estar en la tabla', nueva, TABLA, 'ESCRITURA_NUEVA');
// c) una fila de una puerta que ya no existe
rojo('una fila huérfana (la puerta se borró de api.gs)', API_SRC, TABLA.concat([SIN('PUERTA_BORRADA', 'Una puerta que ya no existe en el dispatcher: la fila quedó huérfana.')]), 'PUERTA_BORRADA');
// d) una fila «implementada» cuyo dispatcher NO pasa el reclamo. 🪤 Se le QUITA el reclamo a una puerta que ya lo trae
//    (DAR_ALTA, hecha en el paso 5) en vez de voltear una fila pendiente: así la prueba sigue midiendo lo mismo el día que
//    ya no quede ninguna pendiente (paso 17), que es cuando una mutación «sobre una puerta sin hacer» dejaría de existir.
const sinEpAlta = API_SRC.replace('darAltaPaciente(datos, ctx, _epDeDatos(datos))', 'darAltaPaciente(datos, ctx)');
si('(la mutación de la prueba sí le quitó el reclamo a DAR_ALTA)', sinEpAlta !== API_SRC);
rojo('una fila implementada (true) cuyo dispatcher NO pasa el reclamo (la tabla mintiendo hacia delante)', sinEpAlta, TABLA, 'DAR_ALTA');
// e) el dispatcher pasa el reclamo y la fila dice que no (la otra punta, mutando la TABLA)
const alta = f => f.accion === 'DAR_ALTA';
rojo('api.gs YA pasa el reclamo y la fila dice false (la tabla mintiendo hacia atrás)', API_SRC,
  TABLA.map(f => alta(f) ? Object.assign({}, f, { epImplementado: false }) : f), 'DAR_ALTA');
{
  const p = censar(sinEpAlta, TABLA.map(f => alta(f) ? Object.assign({}, f, { epImplementado: false }) : f));
  eq('★ …y verde cuando las dos puntas coinciden (voltear la fila Y pasar el reclamo es lo que cierra un paso)',
    p.filter(x => x.indexOf('DAR_ALTA') > -1).length, 0);
}
// f) una razón vacía
rojo('una puerta sin episodio SIN su razón escrita', API_SRC, TABLA.map(f => f.accion === 'SET_BANNER' ? Object.assign({}, f, { razon: '' }) : f), 'SET_BANNER');
// g) las dos listas separadas
{
  const lista = listaAccEpisodio(API_SRC) || [];
  const sinUna = API_SRC.replace(/var _ACC_EPISODIO = \[[\s\S]*?\];/, 'var _ACC_EPISODIO = ' + JSON.stringify(lista.filter(a => a !== 'DAR_ALTA')) + ';');
  si('(la mutación de la prueba sí le quitó una acción a _ACC_EPISODIO)', lista.length > 0 && sinUna !== API_SRC);
  rojo('_ACC_EPISODIO sin una de las acciones de episodio de la tabla', sinUna, TABLA, '_ACC_EPISODIO');
  const demas = API_SRC.replace(/var _ACC_EPISODIO = \[[\s\S]*?\];/, 'var _ACC_EPISODIO = ' + JSON.stringify(lista.concat(['SET_BANNER'])) + ';');
  rojo('_ACC_EPISODIO con una acción de más (SET_BANNER no lleva episodio)', demas, TABLA, '_ACC_EPISODIO');
}
// h) un comentario que nombra _auditar no cuenta
{
  const comentada = API_SRC.replace(/\n(\s*)default:/, "\n$1case 'SOLO_COMENTARIO':\n$1  // return _auditar(ctx, accion, () => x(datos), datos);\n$1  return err('no', ERR.VALIDACION);\n$1default:");
  const p = censar(comentada, TABLA);
  eq('un comentario que nombra _auditar NO hace pasar una puerta por auditada (no exige fila)', p.filter(x => x.indexOf('SOLO_COMENTARIO') > -1).length, 0);
}
// i) la clase inválida
rojo('una clase que no existe', API_SRC, TABLA.map(f => f.accion === 'SET_BANNER' ? Object.assign({}, f, { clase: 'tal_vez' }) : f), 'SET_BANNER');
// i2) una acción de coordinación NUEVA que escribe sin pasar por _auditar
{
  const coordNueva = API_SRC.replace(/\n(\s*)default:/, "\n$1case 'COORD_ESCRIBE_ALGO':\n$1  return coordEscribeAlgo(datos);\n$1default:");
  si('(la mutación de la prueba sí agregó la acción de coordinación nueva)', coordNueva !== API_SRC);
  rojo('una acción COORD_* nueva fuera de _auditar y fuera de la tabla', coordNueva, TABLA, 'COORD_ESCRIBE_ALGO');
}
// j) una acción de coordinación que se pasó a _auditar sin avisar
{
  const t = TABLA.map(f => f.accion === 'COORD_CORREGIR' ? Object.assign({}, f, { viaAuditar: undefined }) : f);
  rojo('COORD_CORREGIR sin viaAuditar:false mientras api.gs no la pasa por _auditar', API_SRC, t, 'COORD_CORREGIR');
}

/* ══ 3 · LA TABLA TAL COMO LA PIDE EL DISEÑO ══════════════════════════════ */
console.log('\n3 · Las puertas de episodio del diseño están todas, y las que no lo llevan dicen por qué');
const DISENO_EPISODIO = ['GUARDAR_EVOLUCION', 'DAR_ALTA', 'LIMPIAR_CAMA', 'INTERCAMBIAR_CAMAS', 'MOVER_A_CAMA_VACIA', 'ANULAR_EVENTO', 'ANEXAR_EVENTO',
  'ANULAR_ANEXO', 'CONFIRMAR_DISPOSITIVOS', 'AGREGAR_HITO', 'EVAL_REGISTRAR', 'EPISODIO_ESCALA', 'PEND_ABRIR', 'PEND_CERRAR', 'GSA_ASIGNAR', 'COORD_CORREGIR'];
const DISENO_SIN = ['GUARDAR_ENTREGA_TURNO', 'ASIGNAR_STOCK', 'AJUSTAR_STOCK', 'GUARDAR_STOCK', 'MOVER_VENTILADOR', 'MOVER_VENTILADORES_LOTE', 'GUARDAR_VENTILADOR',
  'BAJA_VENTILADOR', 'REGISTRAR_FALLA_VM', 'GUARDAR_SUGERENCIA', 'SET_SUGERENCIA_ESTADO', 'SET_ASIGNACION_TURNO', 'AGREGAR_FASE', 'SET_BANNER', 'GENERAR_REM',
  'PLANTILLA_GUARDAR', 'PLANTILLA_RETIRAR', 'GSA_IMPORTAR', 'GSA_DESCARTAR'];
eq('★ las puertas de episodio son las del diseño aprobado (ni una más ni una menos)',
  TABLA.filter(f => f.clase === 'episodio').map(f => f.accion).sort().join(','), DISENO_EPISODIO.slice().sort().join(','));
eq('★ las puertas sin episodio son las del diseño aprobado, cada una con su razón',
  TABLA.filter(f => f.clase === 'sinEpisodio').map(f => f.accion).sort().join(','), DISENO_SIN.slice().sort().join(','));
eq('   …y la de ingreso es INGRESAR_PACIENTE', TABLA.filter(f => f.clase === 'ingreso').map(f => f.accion).join(','), 'INGRESAR_PACIENTE');
si('★ ninguna razón de «sin episodio» dice «no lo pensé»: todas tienen al menos 25 caracteres',
  TABLA.filter(f => f.clase === 'sinEpisodio').every(f => f.razon.length >= 25));

console.log(fails.length ? `\n❌ ${fails.length} fallos:\n  - ${fails.join('\n  - ')}` : '\n✅ guardado_seguro_cobertura: ninguna puerta de escritura sin clasificar.');
process.exit(fails.length ? 1 : 0);
