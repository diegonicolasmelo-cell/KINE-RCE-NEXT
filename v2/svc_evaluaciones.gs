/**
 * svc_evaluaciones.gs — La SERIE FECHADA del episodio y las escalas pre-UCI
 * escritas directo al episodio (rama episodio/turno, 11-sep-2026).
 *
 * POR QUÉ EXISTE. Diego, 10-sep: «al día siguiente otro colega quiere aplicar
 * una ECF pero no sabe dónde, por lo tanto no la aplica y se pierde el dato».
 * Y el 11-sep: «ocupamos el valor del colega pero debemos saber quién firmó».
 * Hasta aquí el episodio arrastraba ULT_MRC + ULT_MRC_FECHA y NINGUNA firma;
 * la serie completa estaba desparramada en filas de turno.
 *
 * DOS COSAS DISTINTAS, a propósito (corrección clínica de Diego, 11-sep):
 *  · ECF, Barthel y Charlson son DATO ÚNICO del episodio (estado pre-UCI).
 *    «Es la que es; si hay corrección se corrige el mismo dato.» → van a
 *    CAMAS_ESTADO tal cual, sin historial: `episodioEscala`.
 *  · MRC, FSS, CPAx, Pimáx… se REPITEN. → hoja EVALUACIONES, una fila por
 *    medición, con fecha y firma; corregir agrega y anula, nunca borra:
 *    `evalRegistrar`.
 *
 * 🔑 La firma es PROCEDENCIA, no propiedad: cualquiera cita el valor para sus
 * fines; la firma solo dice de dónde salió. Y separa dos firmas que antes se
 * colapsaban: quién MIDIÓ y quién EVOLUCIONA hoy citándolo.
 *
 * 🪤 Sin login (AUTH_DEV_MODE) la firma es la DECLARADA en el formulario, no
 * una identidad verificada. Vale lo que vale una firma en el papel de la
 * unidad. Lo resolvería el login real del PRD de la PWA.
 */

// Escalas que llevan historial (serie) y su columna espejo en CAMAS_ESTADO.
const EVAL_SERIE = {
  MRC:       { ult: 'ULT_MRC',    fecha: 'ULT_MRC_FECHA', firma: 'ULT_MRC_FIRMA', col: 'EVAL_T_MRC',    max: 60 },
  FSS:       { ult: 'ULT_FSS',    fecha: 'ULT_FSS_FECHA', firma: 'ULT_FSS_FIRMA', col: 'EVAL_T_FSS',    max: 35 },
  PIM:       { ult: 'ULT_PIM',    fecha: 'ULT_PIM_FECHA', firma: 'ULT_PIM_FIRMA', col: 'EVAL_T_PIM' },
  DINAMO:    { ult: 'ULT_DINAMO', col: 'EVAL_T_DINAMO' },
  CPAX:      { col: 'CPAX_TOTAL', max: 50 },
  PEM:       { col: 'EVAL_T_PEM' },
  FEM:       { col: 'EVAL_T_FEM' },
  ECO:       { col: 'EVAL_T_GROSOR' },
  DEGLUCION: { col: 'EVAL_DEGLUCION' },
  CULTIVO:   {},   // sin espejo en la cama: el «último cultivo» lo sigue leyendo la entrega desde las evoluciones
};
// Dato único del episodio: se corrige encima.
const EPISODIO_ESCALAS = { ECF: 'ECF', BARTHEL: 'BARTHEL', CHARLSON: 'CHARLSON' };

/** El turno de este momento, con los cortes de CONFIG (misma regla que la GSA). */
function _turnoActualSrv() {
  try { return turnoLogicoServidor(hoyISO(), _horaAhora()).turno || 'Dia'; } catch (e) { return 'Dia'; }
}

/** Normaliza el nombre de escala que manda el cliente. */
function _evalEscala(x) {
  const e = String(x || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (e === 'FSSICU') return 'FSS';
  if (e === 'MRCSS') return 'MRC';
  return e;
}

/**
 * evalRegistrar — una medición nueva en la serie del episodio.
 * datos: { idCama, escala, total, items (obj|array|string), firma, fecha?, turno?,
 *          origen? ('tarjeta' por defecto), idEvolucion?, anulaId? }
 * Escribe EVALUACIONES y actualiza el espejo ULT_* de la cama (valor, fecha,
 * firma). Devuelve la fila creada. NO toca EVOLUCIONES: si la medición vino de
 * un turno, ese turno ya escribió su columna por su cuenta.
 */
function evalRegistrar(datos, ctx, ep) {
  ctx = ctx || {};
  return conLock(() => {
    try {
      /* 🔐 EL CANDADO DE EPISODIO (G14, tanda 2 del guardado seguro, paso 7, 4-oct-2026).

         🔴 EL HUECO. La medición se abre sobre la tarjeta de P y se envía después. Si entremedio P recibió el alta y entró Q
         a la misma cama, `_evalRegistrarInterno` la guardaba con el PATIENT_ID de quien ocupara la cama AHORA y, si era la
         más reciente de ese episodio, copiaba su valor, fecha y firma al espejo ULT_* de la CAMA: la ficha de Q mostraba
         «MRC 45 (firma de quien midió a P)» y el hito «MRC 45» le quedaba en su línea de tiempo.

         LA REGLA: lo que la pantalla abrió (EPISODIO_ABIERTO) tiene que ser el ocupante de la cama AHORA (una cama libre
         no tiene dueño). Corregir con `anulaId` va bajo el mismo candado: está dentro de este mismo lock y después de esta
         comparación. 🪤 Se compara con la CAMA, no con `datos.patientId`: la fila de EVALUACIONES se atribuye al episodio
         que se declare, pero el espejo se escribe SIEMPRE en la cama, así que un `patientId` declarado no reemplaza al
         reclamo (ni lo suple en modo estricto).

         Va ANTES de `_evalRegistrarInterno`, que queda intacta: la llama también guardarEvolucion, que ya comparó el
         episodio con su propia regla. Solo se invoca con reclamo o con el modo estricto: los bancos antiguos, que cargan
         una lista fija de archivos, no traen dominio_validacion.gs. Si alguien lo pide sin cargarlo REVIENTA (INTERNO) en
         vez de saltarse el candado. Una cama que no existe se deja al interno, que ya lo dice. */
      const _ep = ep || {};
      if (_ep.estricto === true || (_ep.a !== undefined && _ep.a !== null)) {
        const _d = datos || {};
        const _idCama = String(_d.idCama || _d.ID_CAMA || '').trim();
        const _cama = _idCama ? repoBuscarPorId('CAMAS_ESTADO', 'ID_CAMA', _idCama) : null;
        if (_cama) {
          const _atribuido = esVerdadero(_cama.OCUPADA) ? String(_cama.PATIENT_ID || '') : '';
          const _msgEp = validarEpisodioPuerta(_ep.a, _atribuido, _idCama, _ep.estricto === true);
          if (_msgEp) return err(_msgEp, ERR.VALIDACION);
        }
      }
      // 🔐 G16 (paso 11): con OP_ID, el id de la medición y el de su hito se DERIVAN de la operación (`derivar` = true).
      const r = _evalRegistrarInterno(datos, ctx, true);
      if (r && r.error) return r;
      SpreadsheetApp.flush();
      return ok(r);
    } catch (e) { return err('evalRegistrar: ' + e.message); }
  });
}

/**
 * Sin lock: para llamar desde guardarEvolucion, que ya lo tiene.
 *
 * 🔐 G16 (paso 11, 5-oct-2026) — `derivar` (solo lo pide `evalRegistrar`, la puerta de la tarjeta; la cola de `guardarEvolucion`
 * llama con dos argumentos y sigue con su regla de «¿ya está?» de siempre, que no suma lecturas al guardado).
 * 🔴 EL DEFECTO. La medición se escribía con un id de reloj y azar: si la corrida moría después de insertarla (o de anular la
 * que corregía) y antes de sellar, el reintento con el mismo OP_ID insertaba OTRA, y la serie del episodio quedaba con la
 * misma medición dos veces (la tarjeta la dibuja dos veces y el «último valor» lo decide el desempate). Con operación en curso
 * y `derivar`, el id sale del OP_ID y del contenido de la medición (`EVAL_<op>_<huella>`), se busca antes de insertar
 * (`repoBuscarFila`) y la medición que ya estaba no se escribe otra vez. Lo demás (anular la corregida, el espejo de la cama, el
 * hito y la tarjeta) es idempotente o se completa solo si falta, así que el reintento llega siempre al mismo final.
 * 🪤 La clave NO lleva la fecha ni el turno que la puerta pone por omisión (el reloj): un reintento a las 19:59 de lo enviado a
 * las 19:58 es el MISMO registro. Sí lleva la fecha y el turno que el usuario declaró, y la medición que corrige.
 */
function _evalRegistrarInterno(datos, ctx, derivar) {
  datos = datos || {};
  const idCama = String(datos.idCama || datos.ID_CAMA || '').trim();
  const escala = _evalEscala(datos.escala || datos.ESCALA);
  if (!idCama) return err('Falta la cama.', ERR.VALIDACION);
  if (!EVAL_SERIE[escala]) return err('Escala desconocida: ' + escala, ERR.VALIDACION);
  const total = String(datos.total == null ? (datos.TOTAL == null ? '' : datos.TOTAL) : datos.total).trim();
  if (total === '' && escala !== 'CULTIVO') return err('Falta el valor de ' + escala + '.', ERR.VALIDACION);
  const def = EVAL_SERIE[escala];
  if (def.max != null) {
    const n = parseFloat(String(total).replace(',', '.'));
    if (isNaN(n) || n < 0 || n > def.max) return err(escala + ' fuera de rango (0-' + def.max + '): ' + total, ERR.VALIDACION);
  }
  const cama = repoBuscarPorId('CAMAS_ESTADO', 'ID_CAMA', idCama);
  if (!cama) return err('No existe la cama ' + idCama + '.', ERR.VALIDACION);
  const pid = String(datos.patientId || datos.PATIENT_ID || cama.PATIENT_ID || '');
  if (!pid) return err('La cama ' + idCama + ' no tiene episodio: ingresa al paciente antes de medir.', ERR.VALIDACION);

  // La firma: la que manda el cliente (el select del formulario), si no la
  // del contexto. Corta, como PLAN_FIRMA_KINE: nunca un texto largo.
  let firma = String(datos.firma || datos.FIRMA || ctx.firma || '').trim();
  if (firma.length > 15 || /\n/.test(firma)) firma = '';

  const fecha = String(datos.fecha || datos.FECHA || hoyISO());
  const turno = String(datos.turno || datos.TURNO || _turnoActualSrv());
  let items = datos.items != null ? datos.items : (datos.ITEMS_JSON != null ? datos.ITEMS_JSON : '');
  if (items && typeof items !== 'string') { try { items = JSON.stringify(items); } catch (e) { items = ''; } }

  const derivada = !!derivar && !!_opIdDeLaPeticion();
  const claveEval = derivada ? [escala, total, idCama, pid, String(datos.fecha || datos.FECHA || ''), String(datos.turno || datos.TURNO || ''),
    String(datos.anulaId || '')].join('|') : '';
  const fila = {
    ID_EVAL: derivada ? uid('EVAL', claveEval) : uid('EVAL'), PATIENT_ID: pid, ID_CAMA: idCama,
    FECHA: fecha, TURNO: turno, ESCALA: escala, TOTAL: total,
    ITEMS_JSON: items || '', FIRMA: firma,
    ORIGEN: String(datos.origen || datos.ORIGEN || 'tarjeta'),
    ID_EVOLUCION: String(datos.idEvolucion || datos.ID_EVOLUCION || ''),
    ANULADA: false, TIMESTAMP: ahoraTS(),
  };
  // Con id derivado, la medición que ya está (el primer intento llegó hasta acá) no se inserta otra vez.
  if (!derivada || repoBuscarFila('EVALUACIONES', 'ID_EVAL', fila.ID_EVAL) === -1) repoInsertar('EVALUACIONES', fila);

  // Corregir = nueva fila + anular la vieja. Nunca se borra.
  if (datos.anulaId) {
    try { repoActualizar('EVALUACIONES', 'ID_EVAL', String(datos.anulaId), { ANULADA: true }); } catch (e) {}
  }

  // Espejo en la cama: solo si esta medición es la más reciente del episodio
  // (una corrección retroactiva no debe pisar una medición posterior).
  const ult = _evalUltima(pid, escala);
  if (ult && ult.ID_EVAL === fila.ID_EVAL) _evalEspejoCama(idCama, escala, fila);

  // Hito legible, para la línea de tiempo y la tarjeta.
  // 🔐 G16 (paso 10): si el hito o el caché no se pudieron escribir la medición YA está en la serie y se sigue; pero el
  // resultado lo DICE (`sinHito`, solo cuando pasa) en vez de quedar en un console.warn que nadie lee: quien guardó un turno
  // lo convierte en un aviso, y el reintento lo completa (`_evalCompletarCola`).
  let sinHito = false;
  try {
    if (derivada) {
      // El hito también lleva id derivado y se escribe solo si no está; la tarjeta se vuelve a sincronizar si no lo muestra.
      if (!_hitoDeOperacion(_evalHito(idCama, pid, fecha, turno, escala, total, firma, ctx), true, claveEval).sincronizado) sinHito = true;
    } else {
      _agregarHitoInternoSinSync(_evalHito(idCama, pid, fecha, turno, escala, total, firma, ctx));
      if (!_sincronizarTimelineCama(idCama)) sinHito = true;
    }
  } catch (e) { console.warn('evalRegistrar hito:', e.message); sinHito = true; }

  const res = { entidad: 'EVALUACIONES', accion: 'medicion', escala: escala, total: total, idEval: fila.ID_EVAL, firma: firma, fecha: fecha };
  if (sinHito) res.sinHito = true;
  return res;
}

/** El hito legible de una medición. Lo arman por igual quien la escribe y quien, en un reintento, completa lo que le faltó. */
function _evalHito(idCama, pid, fecha, turno, escala, total, firma, ctx) {
  return {
    idCama: idCama, patientId: pid, fecha: fecha, turno: turno, tipo: 'evaluacion',
    texto: '📐 ' + _evalNombre(escala) + ' ' + total + (firma ? ' (' + firma + ')' : ''),
    autor: firma, autorEmail: (ctx && ctx.email) || '',
    // Sin el ID_EVAL (un uid): el hito debe ser DETERMINISTA para que dos
    // guardados iguales dejen la misma línea de tiempo (guardia guardado_viajes).
    datos: { escala: escala, total: total, firma: firma, fecha: fecha },
  };
}

function _evalNombre(escala) {
  return ({ MRC: 'MRC-ss', FSS: 'FSS-ICU', CPAX: 'CPAx', PIM: 'Pimáx', PEM: 'PEM', FEM: 'FEM',
            DINAMO: 'Dinamometría', ECO: 'Ecografía', DEGLUCION: 'Deglución', CULTIVO: 'Cultivo' })[escala] || escala;
}

/** Copia valor/fecha/firma de la medición al espejo ULT_* de la cama. */
function _evalEspejoCama(idCama, escala, fila) {
  const def = EVAL_SERIE[escala] || {};
  const campos = {};
  if (def.ult)   campos[def.ult] = fila.TOTAL;
  if (def.fecha) campos[def.fecha] = fila.FECHA;
  if (def.firma) campos[def.firma] = fila.FIRMA || '';
  if (Object.keys(campos).length) repoActualizar('CAMAS_ESTADO', 'ID_CAMA', String(idCama), campos);
}

/** La medición vigente (no anulada, más reciente) de una escala del episodio. */
function _evalUltima(pid, escala) {
  const todas = evalDelEpisodio(pid).filter(function (e) { return e.ESCALA === escala; });
  return todas.length ? todas[todas.length - 1] : null;
}

/** Todas las mediciones vigentes del episodio, ordenadas por fecha y momento. */
function evalDelEpisodio(pid) {
  if (!pid) return [];
  return repoLeerTodos('EVALUACIONES', 'PATIENT_ID', String(pid))
    .filter(function (e) { return !esVerdadero(e.ANULADA); })
    .sort(function (a, b) {
      const c = String(a.FECHA).localeCompare(String(b.FECHA));
      return c !== 0 ? c : String(a.TIMESTAMP).localeCompare(String(b.TIMESTAMP));
    });
}

/** GET_EVALUACIONES — la serie de una cama (episodio vigente) o de un pid. */
function obtenerEvaluaciones(datos) {
  datos = datos || {};
  let pid = String(datos.patientId || '');
  if (!pid && datos.idCama) {
    const c = repoBuscarPorId('CAMAS_ESTADO', 'ID_CAMA', String(datos.idCama));
    pid = String((c && c.PATIENT_ID) || '');
  }
  const serie = evalDelEpisodio(pid).map(function (e, i, arr) {
    // El ordinal se DERIVA (1ª, 2ª, 3ª): nunca se guarda. Así «MRC a los 7
    // días» es una alerta y no un candado (Diego, 10-sep).
    const n = arr.slice(0, i + 1).filter(function (x) { return x.ESCALA === e.ESCALA; }).length;
    return { id: e.ID_EVAL, escala: e.ESCALA, total: e.TOTAL, fecha: e.FECHA, turno: e.TURNO,
             firma: e.FIRMA, origen: e.ORIGEN, n: n, items: e.ITEMS_JSON || '' };
  });
  return ok({ patientId: pid, serie: serie });
}

/**
 * episodioEscala — ECF, Barthel o Charlson escritos DIRECTO al episodio desde
 * la tarjeta, sin abrir la evolución. Se corrige encima: no hay historial
 * porque el dato describe el estado PREVIO a la UCI (Diego, 11-sep).
 * datos: { idCama, escala:'ECF'|'BARTHEL'|'CHARLSON', valor, items?, firma? }
 */
function episodioEscala(datos, ctx, ep) {
  ctx = ctx || {};
  datos = datos || {};
  const idCama = String(datos.idCama || '').trim();
  const escala = _evalEscala(datos.escala);
  const col = EPISODIO_ESCALAS[escala];
  if (!idCama) return err('Falta la cama.', ERR.VALIDACION);
  if (!col) return err('Escala del episodio desconocida: ' + escala, ERR.VALIDACION);
  const valor = String(datos.valor == null ? '' : datos.valor).trim();
  if (valor === '') return err('Falta el valor de ' + escala + '.', ERR.VALIDACION);
  const n = parseInt(valor, 10);
  if (escala === 'BARTHEL' && (isNaN(n) || n < 0 || n > 100 || n % 5 !== 0)) return err('Barthel inválido: ' + valor, ERR.VALIDACION);
  if (escala === 'ECF' && (isNaN(n) || n < 1 || n > 9)) return err('ECF fuera de 1-9: ' + valor, ERR.VALIDACION);
  if (escala === 'CHARLSON' && (isNaN(n) || n < 0 || n > 37)) return err('Charlson fuera de 0-37: ' + valor, ERR.VALIDACION);

  return conLock(() => {
    try {
      const cama = repoBuscarPorId('CAMAS_ESTADO', 'ID_CAMA', idCama);
      if (!cama) return err('No existe la cama ' + idCama + '.', ERR.VALIDACION);
      if (!esVerdadero(cama.OCUPADA) || !cama.PATIENT_ID) return err('La cama ' + idCama + ' no tiene paciente ingresado.', ERR.VALIDACION);
      /* 🔐 EL CANDADO DE EPISODIO (G14, paso 7). ECF, Barthel y Charlson se escriben directo en la CAMA, que es del ocupante
         de AHORA: la escala de P (abierta antes de su alta) le quedaba a Q como si fuera suya, con su hito en la línea de
         tiempo. Lo que la pantalla abrió tiene que ser quien ocupa la cama, comparado aquí DENTRO del lock y antes de la
         primera escritura. (La cama libre ya se rechaza arriba con su motivo de siempre.) Solo con reclamo o con el modo
         estricto: los bancos antiguos no traen dominio_validacion.gs, y si alguien lo pide sin cargarlo REVIENTA. */
      const _ep = ep || {};
      if (_ep.estricto === true || (_ep.a !== undefined && _ep.a !== null)) {
        const _msgEp = validarEpisodioPuerta(_ep.a, String(cama.PATIENT_ID || ''), idCama, _ep.estricto === true);
        if (_msgEp) return err(_msgEp, ERR.VALIDACION);
      }
      let firma = String(datos.firma || ctx.firma || '').trim();
      if (firma.length > 15 || /\n/.test(firma)) firma = '';
      const antes = String(cama[col] == null ? '' : cama[col]);
      const campos = {}; campos[col] = valor;
      // Los ítems de la calculadora también viven en la cama cuando existen
      // (BARTHEL_JSON/CHARLSON_JSON son de EVOLUCIONES; aquí se guardan en el
      // hito para no abrir columnas nuevas por esto).
      let items = datos.items != null ? datos.items : '';
      if (items && typeof items !== 'string') { try { items = JSON.stringify(items); } catch (e) { items = ''; } }
      /* 🔐 G16 (paso 11, 5-oct-2026) — EL HITO VA PRIMERO. Se escribía el valor en la cama y después el hito, que cuenta lo que
         CORRIGE: «Barthel 60 (corrige 40)» sale de leer la cama ANTES de escribirla. La corrida que moría entre ambas dejaba el
         valor nuevo y, al reintentar, la cama ya decía 60: el hito salía sin su «corrige 40» y el dato de qué valor se pisó se
         perdía para siempre. Con el hito primero el «antes» verdadero queda escrito en cuanto se lee; y con OP_ID el hito lleva id
         derivado y se escribe solo si no está, así que el reintento no lo repite ni lo reescribe con un «antes» ya pisado. La
         clave del hito NO lleva el «antes» (cambia entre un intento y su reintento): es la escala y el valor. */
      _hitoDeOperacion({
        idCama: idCama, patientId: cama.PATIENT_ID, tipo: 'evaluacion',
        texto: '📐 ' + ({ ECF: 'ECF', BARTHEL: 'Barthel', CHARLSON: 'Charlson' })[escala] + ' ' + valor +
               (antes !== '' && antes !== valor ? ' (corrige ' + antes + ')' : '') + (firma ? ' (' + firma + ')' : ''),
        autor: firma, autorEmail: ctx.email || '',
        datos: { escala: escala, valor: valor, antes: antes, firma: firma, items: items || '' },
      }, false, ['evaluacion', idCama, cama.PATIENT_ID, escala, valor].join('|'));
      repoActualizar('CAMAS_ESTADO', 'ID_CAMA', idCama, campos);
      _sincronizarTimelineCama(idCama);
      SpreadsheetApp.flush();
      return ok({ entidad: 'CAMAS_ESTADO', accion: 'escala ' + escala, idCama: idCama, valor: valor, antes: antes, firma: firma });
    } catch (e) { return err('episodioEscala: ' + e.message); }
  });
}

/**
 * Enganche desde guardarEvolucion (sin lock): lo que el turno MIDIÓ pasa a la
 * serie con la firma del turno. Solo lo que viene con valor: el turno no
 * hereda evaluaciones (se recargan solo si EVAL_FECHA es hoy), así que un
 * valor presente es una medición de este turno.
 *
 * 🔐 G16 (paso 10). Esta cola corre DESPUÉS del compromiso del guardado (la escritura de la cama) y antes se tragaba lo
 * que fallara: un `catch` con console.warn y la respuesta salía limpia, con el sello de «ya hecho» puesto. El reintento
 * con el mismo OP_ID devolvía la repetida y la medición no se copiaba NUNCA. Ahora, con `advertencias` (la lista que
 * `guardarEvolucion` devuelve en `data.advertencias`), cada medición va en su propio intento: lo que falla suma un aviso
 * en palabras de la unidad y las demás siguen — la respuesta es OK, SIN sello, y el reintento completa lo que faltó.
 * Sin `advertencias` quien llama no tiene dónde recibir los avisos, así que el error sube como siempre: nadie lo traga.
 *
 * El reintento no duplica ni se queda corto: la medición que YA está en la serie no se escribe otra vez, pero se le
 * COMPLETA lo que la muerte dejó a medias (el espejo de la cama y su hito): `_evalCompletarCola`.
 */
function _evalDesdeEvolucion(evo, idCama, idEvolucion, ctx, advertencias) {
  const firma = String(evo.PLAN_FIRMA_KINE || (ctx && ctx.firma) || '');
  const fecha = String(evo.FECHA || hoyISO());
  const turno = String(evo.TURNO || 'Dia');
  const hechas = [];
  const vale = function (x) { return x !== '' && x != null; };
  // La cama y los hitos solo se leen si un reintento los necesita (la ruta de siempre no lee ni una hoja más).
  const cola = { avisos: advertencias || null, memo: {} };
  const falla = function (e, aviso) {
    if (!advertencias) throw e;
    console.warn('_evalDesdeEvolucion:', e.message);
    advertencias.push(aviso);
  };
  const pares = [
    ['MRC', evo.EVAL_T_MRC, { D: [evo.EVAL_MRC_D1, evo.EVAL_MRC_D2, evo.EVAL_MRC_D3, evo.EVAL_MRC_D4, evo.EVAL_MRC_D5, evo.EVAL_MRC_D6],
                              I: [evo.EVAL_MRC_I1, evo.EVAL_MRC_I2, evo.EVAL_MRC_I3, evo.EVAL_MRC_I4, evo.EVAL_MRC_I5, evo.EVAL_MRC_I6] }],
    ['FSS', evo.EVAL_T_FSS, [evo.EVAL_FSS_IT1, evo.EVAL_FSS_IT2, evo.EVAL_FSS_IT3, evo.EVAL_FSS_IT4, evo.EVAL_FSS_IT5]],
    ['CPAX', evo.CPAX_TOTAL, [evo.CPAX_IT1, evo.CPAX_IT2, evo.CPAX_IT3, evo.CPAX_IT4, evo.CPAX_IT5, evo.CPAX_IT6, evo.CPAX_IT7, evo.CPAX_IT8, evo.CPAX_IT9, evo.CPAX_IT10]],
    ['PIM', evo.EVAL_T_PIM, null], ['PEM', evo.EVAL_T_PEM, null], ['FEM', evo.EVAL_T_FEM, null],
    ['DINAMO', evo.EVAL_T_DINAMO, null],
    ['ECO', evo.EVAL_T_GROSOR, { cuadD: evo.EVAL_T_CUAD_D, cuadI: evo.EVAL_T_CUAD_I, heckmatt: evo.EVAL_T_HECKMATT, fedD: evo.EVAL_T_FED_D, fedI: evo.EVAL_T_FED_I, excD: evo.EVAL_T_EXC_D, excI: evo.EVAL_T_EXC_I, hallazgos: evo.EVAL_T_HALLAZGOS }],
    ['DEGLUCION', evo.EVAL_DEGLUCION, null],
  ];
  pares.forEach(function (p) {
    if (!vale(p[1])) return;
    try {
      // ¿Ya está esta misma medición en la serie (re-guardado del mismo turno, o reintento tras una muerte)?
      const ya = repoLeerTodos('EVALUACIONES', 'ID_EVOLUCION', String(idEvolucion))
        .filter(function (e) { return e.ESCALA === p[0] && !esVerdadero(e.ANULADA) && String(e.TOTAL) === String(p[1]); })[0];
      if (ya) {
        if (!_evalCompletarCola(ya, ctx, cola.memo)) _colaAviso(cola, _avisoHito('La medición de ' + _evalNombre(p[0])));
        return;
      }
      const r = _evalRegistrarInterno({ idCama: idCama, escala: p[0], total: p[1], items: p[2], firma: firma,
                                        fecha: fecha, turno: turno, origen: 'turno', idEvolucion: idEvolucion }, ctx);
      if (r && !r.error) {
        hechas.push(p[0]);
        if (r.sinHito) _colaAviso(cola, _avisoHito('La medición de ' + _evalNombre(p[0])));
      }
    } catch (e) {
      falla(e, 'La medición de ' + _evalNombre(p[0]) + ' de este turno no quedó completa en la serie. Vuelve a guardar el turno para completarla.');
    }
  });
  try { if (_cultivoALaSerie(evo, idCama, idEvolucion, firma, fecha, turno, ctx, cola)) hechas.push('CULTIVO'); }
  catch (e) { falla(e, 'El cultivo de este turno no quedó completo en la serie. Vuelve a guardar el turno para completarlo.'); }
  return hechas;
}

/** El aviso de una medición que quedó en la serie sin su hito (o sin el caché de la línea de tiempo). */
function _avisoHito(que) {
  return que + ' quedó en la serie, pero no su aviso en la línea de tiempo. Vuelve a guardar el turno para completarlo.';
}
function _colaAviso(cola, aviso) { if (cola && cola.avisos) cola.avisos.push(aviso); }

/**
 * 🔐 G16 (paso 10). Lo que le falta a una medición que YA está en la serie: el espejo ULT_* de la cama y su hito. Una muerte
 * entre la fila de EVALUACIONES y esos dos pasos las dejaba sin ellos, y el reintento —que ve la fila y la salta— no se los
 * ponía nunca. Solo escribe lo que falta, así que sobre una medición completa no escribe nada (y para saberlo lee la cama y los
 * hitos de esa cama UNA vez por guardado: `memo`).
 * Devuelve `false` si el hito quedó escrito pero el caché de la tarjeta no.
 */
function _evalCompletarCola(fila, ctx, memo) {
  const m = memo || {};
  const idCama = String(fila.ID_CAMA || ''), pid = String(fila.PATIENT_ID || ''), escala = String(fila.ESCALA || '');
  if (!idCama || !pid) return true;
  const def = EVAL_SERIE[escala] || {};
  // El espejo: solo si la cama aún no refleja esta medición Y es la vigente del episodio (una anterior no pisa a una posterior).
  if (def.ult) {
    if (m.cama === undefined) m.cama = repoBuscarPorId('CAMAS_ESTADO', 'ID_CAMA', idCama) || null;
    const c = m.cama;
    const dist = function (k, v) { return !!k && String(c[k] == null ? '' : c[k]) !== String(v == null ? '' : v); };
    if (c && (dist(def.ult, fila.TOTAL) || dist(def.fecha, fila.FECHA) || dist(def.firma, fila.FIRMA || ''))) {
      const ult = _evalUltima(pid, escala);
      if (ult && ult.ID_EVAL === fila.ID_EVAL) { _evalEspejoCama(idCama, escala, fila); m.cama = undefined; }
    }
  }
  // El hito: uno de esa escala en ese turno y ese episodio (no se compara el texto: un cultivo cuyo resultado llegó después
  // cambió su total, y su hito sigue siendo el mismo).
  if (m.hitos === undefined) m.hitos = repoLeerTodos('TIMELINE', 'ID_CAMA', idCama);
  const marca = '"escala":"' + escala + '"';
  const hay = m.hitos.some(function (h) {
    return String(h.TIPO) === 'evaluacion' && String(h.PATIENT_ID || '') === pid && String(h.FECHA) === String(fila.FECHA) &&
           String(h.TURNO) === String(fila.TURNO) && String(h.DATOS_JSON || '').indexOf(marca) !== -1;
  });
  if (hay) return true;
  const hito = _evalHito(idCama, pid, String(fila.FECHA), String(fila.TURNO), escala, String(fila.TOTAL),
                         String(fila.FIRMA || ''), ctx || {});
  _agregarHitoInternoSinSync(hito);
  m.hitos.push({ TIPO: 'evaluacion', PATIENT_ID: pid, FECHA: String(fila.FECHA), TURNO: String(fila.TURNO), DATOS_JSON: JSON.stringify(hito.datos) });
  return _sincronizarTimelineCama(idCama);
}

/**
 * 🧫 CULTIVO — «ambas» (Diego, 11-sep-2026): serie fechada Y evento.
 * La TOMA del turno (MUE_REALIZADAS) abre una entrada de la serie con la
 * hora, los tipos, si iba con antibiótico y la firma de quien la tomó, y el
 * resultado en «pendiente». El RESULTADO llega días después en OTRO turno
 * (EX_CULT_RESULTADO, que se hereda): se escribe SOBRE esa entrada, con la
 * fecha y la firma de quien lo anotó — no abre una medición nueva, porque es
 * el mismo cultivo. El evento es el hito 'CULTIVO DE SECRECIONES' que ya
 * deja el procedimiento; aquí solo se le agrega el detalle (DATOS_JSON).
 * Devuelve true si tocó la serie.
 * 🔐 G16 (paso 10): `cola` (opcional, la arma `_evalDesdeEvolucion`) lleva la lista de avisos del guardado y la memoria de
 * lecturas del reintento. Esta función no atrapa nada: un error sube hasta quien sabe convertirlo en un aviso.
 */
function _cultivoALaSerie(evo, idCama, idEvolucion, firma, fecha, turno, ctx, cola) {
  const cama = repoBuscarPorId('CAMAS_ESTADO', 'ID_CAMA', String(idCama));
  const pid = String((cama && cama.PATIENT_ID) || evo.PATIENT_ID || '');
  if (!pid) return false;
  const parse = function (s) { try { const a = JSON.parse(String(s || '[]')); return Array.isArray(a) ? a.filter(Boolean) : []; } catch (e) { return []; } };
  const res = String(evo.EX_CULT_RESULTADO || '').trim() || parse(evo.MUE_RESULTADOS_JSON).join(', ');
  const serie = evalDelEpisodio(pid).filter(function (e) { return e.ESCALA === 'CULTIVO'; });
  const items = function (base) {
    let o = {}; try { o = JSON.parse(String(base || '{}')) || {}; } catch (e) { o = {}; }
    return o;
  };
  if (esVerdadero(evo.MUE_REALIZADAS)) {
    const det = { tipos: parse(evo.MUE_TIPOS_JSON), hora: String(evo.MUE_HORA_TOMA || ''),
                  conATB: esVerdadero(evo.MUE_CON_ATB), objetivo: String(evo.RESP_CULT_OBJ || '') };
    const mia = serie.filter(function (e) { return String(e.ID_EVOLUCION) === String(idEvolucion); })[0];
    const total = res || 'pendiente';
    if (!mia) {
      const r = _evalRegistrarInterno({ idCama: idCama, escala: 'CULTIVO', total: total, items: det, firma: firma,
                                        fecha: fecha, turno: turno, origen: 'turno', idEvolucion: idEvolucion }, ctx);
      if (r && r.sinHito) _colaAviso(cola, _avisoHito('El cultivo'));
      return !(r && r.error);
    }
    // Re-guardado del mismo turno: se corrige encima, no se duplica.
    if (String(mia.TOTAL) !== total || String(mia.ITEMS_JSON || '') !== JSON.stringify(det)) {
      repoActualizar('EVALUACIONES', 'ID_EVAL', String(mia.ID_EVAL), { TOTAL: total, ITEMS_JSON: JSON.stringify(det) });
      return true;
    }
    // Idéntico: nada que corregir, pero un reintento le completa el hito si la muerte lo dejó a medias.
    if (!_evalCompletarCola(mia, ctx, cola && cola.memo)) _colaAviso(cola, _avisoHito('El cultivo'));
    return false;
  }
  if (!res) return false;
  // Sin toma este turno pero con resultado: es el resultado de la última toma.
  const pend = serie.filter(function (e) { return String(e.TOTAL) === 'pendiente'; }).pop();
  if (pend) {
    const it = items(pend.ITEMS_JSON); it.resultadoFecha = fecha; it.resultadoFirma = firma;
    repoActualizar('EVALUACIONES', 'ID_EVAL', String(pend.ID_EVAL), { TOTAL: res, ITEMS_JSON: JSON.stringify(it) });
    return true;
  }
  // Resultado heredado sin toma registrada (paciente anterior a la serie): una
  // sola entrada, y solo si el último cultivo de la serie no dice ya lo mismo.
  const ult = serie[serie.length - 1];
  if (ult && String(ult.TOTAL) === res) return false;
  const r = _evalRegistrarInterno({ idCama: idCama, escala: 'CULTIVO', total: res, items: { sinToma: true }, firma: firma,
                                    fecha: fecha, turno: turno, origen: 'turno', idEvolucion: idEvolucion }, ctx);
  if (r && r.sinHito) _colaAviso(cola, _avisoHito('El cultivo'));
  return !(r && r.error);
}
