/**
 * svc_pendientes.gs — Los pendientes del EPISODIO (rediseño de los tres pasos,
 * decisiones de Diego del 16-sep-2026).
 *
 * POR QUÉ EXISTE. `PLAN_PENDIENTES` es una lista de chips guardada en la FILA
 * DEL TURNO, y el esquema lo dice con todas sus letras: «NO se replican». Lo
 * que el turno de noche deja encargado no existe para el turno de día, así que
 * nadie puede cerrarlo. Un recordatorio que muere a las 12 horas no es un
 * pendiente, es una nota al margen.
 *
 * DÓNDE VIVE. En `CAMAS_ESTADO.PENDIENTES_JSON`, o sea en el episodio — como
 * AET y UPOT. Cruza el turno y muere con el alta. No es hoja aparte a
 * propósito: la cama ya viaja en el arranque, así que mostrar los pendientes
 * al abrirla no cuesta ni un viaje más (lo mide `arranque_un_viaje.js`).
 *
 * 🔑 CUALQUIERA CIERRA (decisión de Diego): se guarda quién lo hizo, pero no
 * se exige que sea quien lo abrió. La firma es procedencia, no propiedad —
 * la misma regla que ya rige para las mediciones.
 *
 * `PLAN_PENDIENTES` del turno NO se toca: se sigue escribiendo igual, para que
 * la entrega de turno y el REM no cambien de fuente.
 */

const _PEND_MAX_TX = 300;   // un pendiente es un encargo, no una evolución
const _PEND_MAX    = 40;    // techo por episodio, para que el JSON no crezca sin fin

/** Lee la lista de un registro de cama ya leído. Nunca revienta: devuelve []. */
function _pendLeer(cama) {
  try {
    const l = JSON.parse((cama && cama.PENDIENTES_JSON) || '[]');
    return Array.isArray(l) ? l : [];
  } catch (e) { return []; }
}

/** Los que siguen abiertos (sin `ci`). */
function pendAbiertos(cama) {
  return _pendLeer(cama).filter(function (p) { return p && !p.ci; });
}

/** Firma declarada, acotada igual que en el resto de los servicios. */
function _pendFirma(datos, ctx) {
  let f = String((datos && datos.firma) || (ctx && ctx.firma) || '').trim();
  if (f.length > 15 || /\n/.test(f)) f = '';
  return f;
}

/** La cama con paciente, o un error listo para devolver. */
function _pendCama(idCama) {
  const cama = repoBuscarPorId('CAMAS_ESTADO', 'ID_CAMA', idCama);
  if (!cama) return { e: err('No existe la cama ' + idCama + '.', ERR.VALIDACION) };
  if (!esVerdadero(cama.OCUPADA) || !cama.PATIENT_ID) {
    return { e: err('La cama ' + idCama + ' no tiene paciente ingresado.', ERR.VALIDACION) };
  }
  return { cama: cama };
}

/**
 * pendAbrir — deja un encargo para el turno que viene.
 * Guarda quién lo abrió y cuándo: procedencia, para que el que lo lee sepa
 * de dónde salió.
 */
function pendAbrir(datos, ctx) {
  ctx = ctx || {};
  datos = datos || {};
  const idCama = String(datos.idCama || '').trim();
  if (!idCama) return err('Falta la cama.', ERR.VALIDACION);
  const texto = String(datos.texto == null ? '' : datos.texto).trim();
  if (!texto) return err('El pendiente necesita decir qué hay que hacer.', ERR.VALIDACION);
  if (texto.length > _PEND_MAX_TX) {
    return err('El pendiente es muy largo (máximo ' + _PEND_MAX_TX + ' caracteres).', ERR.VALIDACION);
  }

  return conLock(function () {
    try {
      const r = _pendCama(idCama);
      if (r.e) return r.e;
      const lista = _pendLeer(r.cama);
      /* 🔴 NO SE ABRE DOS VECES LO MISMO (20-sep-2026). Diego: «un pendiente se
         puede arrastrar más de 12 horas, hay veces que está pabellón pendiente
         en 2 días». Con un encargo que dura dos días, el segundo día alguien
         vuelve a tocar el mismo atajo y quedaban DOS pendientes idénticos
         abiertos. La pantalla ya no lo ofrece, pero la defensa tiene que estar
         acá también: dos teléfonos pueden tocar el mismo chip a la vez y
         ninguno sabe del otro.
         🪤 Solo cuenta lo ABIERTO: pabellón el lunes y otra vez el jueves son
         dos encargos distintos, no un duplicado. */
      const _norm = function (t) { return String(t || '').trim().toLowerCase().replace(/\s+/g, ' '); };
      const _yaEsta = lista.some(function (p) { return p && !p.ci && _norm(p.tx) === _norm(texto); });
      if (_yaEsta) {
        return err('Ese pendiente ya está abierto en este paciente.', ERR.VALIDACION);
      }
      if (lista.filter(function (p) { return !p.ci; }).length >= _PEND_MAX) {
        return err('Este paciente ya tiene ' + _PEND_MAX + ' pendientes abiertos. Cierra alguno antes de agregar otro.', ERR.VALIDACION);
      }
      const firma = _pendFirma(datos, ctx);
      const nuevo = {
        id: Utilities.getUuid().replace(/-/g, '').slice(0, 12),
        tx: texto, ab: firma, abTs: ahoraTS(), ci: '', ciTs: '',
      };
      lista.push(nuevo);
      repoActualizar('CAMAS_ESTADO', 'ID_CAMA', idCama, { PENDIENTES_JSON: JSON.stringify(lista) });
      SpreadsheetApp.flush();
      return ok({ entidad: 'CAMAS_ESTADO', accion: 'pendiente abierto', idCama: idCama, pendiente: nuevo });
    } catch (e) { return err('pendAbrir: ' + e.message); }
  });
}

/**
 * pendCerrar — lo da por hecho.
 * 🔑 Cualquiera puede: no se compara contra quién lo abrió. Y no se borra —
 * queda con su cierre, para que el histórico del episodio diga qué se encargó
 * y qué se cumplió.
 * Cerrar algo ya cerrado NO pisa al primero que lo cerró.
 */
function pendCerrar(datos, ctx) {
  ctx = ctx || {};
  datos = datos || {};
  const idCama = String(datos.idCama || '').trim();
  const id = String(datos.id || '').trim();
  if (!idCama) return err('Falta la cama.', ERR.VALIDACION);
  if (!id) return err('Falta cuál pendiente se cierra.', ERR.VALIDACION);

  return conLock(function () {
    try {
      const r = _pendCama(idCama);
      if (r.e) return r.e;
      const lista = _pendLeer(r.cama);
      const p = lista.filter(function (x) { return String(x.id) === id; })[0];
      if (!p) return err('Ese pendiente ya no está en la cama ' + idCama + '.', ERR.NO_ENCONTRADO);
      if (p.ci) {
        // Ya estaba cerrado: no es un error, pero el primero manda.
        return ok({ entidad: 'CAMAS_ESTADO', accion: 'ya estaba cerrado', idCama: idCama, pendiente: p });
      }
      p.ci = _pendFirma(datos, ctx);
      p.ciTs = ahoraTS();
      repoActualizar('CAMAS_ESTADO', 'ID_CAMA', idCama, { PENDIENTES_JSON: JSON.stringify(lista) });
      SpreadsheetApp.flush();
      return ok({ entidad: 'CAMAS_ESTADO', accion: 'pendiente cerrado', idCama: idCama, pendiente: p });
    } catch (e) { return err('pendCerrar: ' + e.message); }
  });
}
