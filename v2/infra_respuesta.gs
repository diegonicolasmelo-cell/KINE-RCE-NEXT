/**
 * infra_respuesta.gs — Respuesta estándar de toda la API.
 * Todas las funciones públicas devuelven {ok:true,data} o {ok:false,error,codigo}.
 */

const ERR = {
  LOCK_TIMEOUT:  'LOCK_TIMEOUT',
  VALIDACION:    'VALIDACION',
  // 🔴 CONFLICTO (G14/G15, 4-oct-2026) — «el mundo cambió mientras yo escribía»: lo que la persona pidió era válido
  // cuando abrió la pantalla y ya no lo es porque OTRA persona se adelantó (ocupó la cama, la limpió, la cambió).
  // No es VALIDACION: un dato mal escrito se corrige y se reintenta, y esto no se arregla corrigiendo nada —lo que
  // hay que hacer es mirar cómo está la cama ahora—. Existe aparte para que la pantalla pueda distinguirlo por el
  // código (no por el texto del mensaje), mostrarlo en rojo y NO reintentarlo solo: reenviar lo mismo recibe lo mismo.
  CONFLICTO:     'CONFLICTO',
  NO_AUTORIZADO: 'NO_AUTORIZADO',
  NO_ENCONTRADO: 'NO_ENCONTRADO',
  INTERNO:       'INTERNO',
};

function ok(data) {
  return { ok: true, data: (data === undefined ? null : data) };
}

function err(msg, codigo, e) {
  if (e) console.error(msg, e);
  return { ok: false, error: msg, codigo: codigo || ERR.INTERNO };
}
