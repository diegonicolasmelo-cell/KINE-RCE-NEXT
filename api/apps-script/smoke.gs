/** Run from editor after initializeNextTest. Only writes synthetic records. */
function runNextTestSmoke() {
  var send = function(body) { return nextTestDispatch_(Object.assign({ schemaVersion: 1, environment: 'TEST' }, body)); };
  var assert = function(value, message) { if (!value) throw new Error('Prueba TEST: ' + message); };
  var prefix = 'TEST-' + Utilities.getUuid();
  var occupied = send({ operation: 'LIST' }).filter(function(e) { return !e.dischargedAt; }).map(function(e) { return e.bed; });
  var bed = null;
  for (var n = 1; n <= 18; n++) if (occupied.indexOf(n) < 0) { bed = n; break; }
  assert(bed, 'No hay cama libre para la prueba');
  var admission = { operation: 'ADMIT', requestId: prefix + '-admit', episode: { personId: prefix, alias: 'Paciente de prueba automatizada', bed: bed } };
  var result = send(admission);
  var episodeId = result.episodeId;
  assert(send(admission).duplicate, 'El reintento duplicó el ingreso');
  var get = function() { return send({ operation: 'GET', episodeId: episodeId }); };
  var sequence = 0;
  var command = function(data) { return send({ operation: 'COMMAND', requestId: prefix + '-' + (++sequence), episodeId: episodeId, revision: get().revision, command: data }); };
  command({ type: 'OPEN_TURN' });
  var turnId = get().turns[0].id;
  command({ type: 'DRAFT', turnId: turnId, note: 'Nota exclusivamente sintética', plan: 'Validación del entorno TEST' });
  command({ type: 'MEASUREMENT', turnId: turnId, kind: 'SAS', value: '4' });
  command({ type: 'SIGN', turnId: turnId });
  var original = get().turns[0].snapshot;
  var rejected = false;
  try { command({ type: 'DRAFT', turnId: turnId, note: 'Intento inválido de prueba', plan: '' }); }
  catch (error) { rejected = String(error.message).indexOf('firmado') >= 0; }
  assert(rejected, 'Se pudo editar un turno firmado');
  command({ type: 'ADDENDUM', turnId: turnId, reason: 'Prueba de trazabilidad', text: 'Adenda sintética' });
  assert(get().turns[0].snapshot === original, 'La adenda cambió el original');
  command({ type: 'DISCHARGE' });
  var finalRecord = get();
  assert(finalRecord.dischargedAt && finalRecord.measurements.length === 1, 'No se conservó la historia');
  var summary = { environment: 'TEST', passed: true, episodeId: episodeId, records: finalRecord.audit.length, note: 'Prueba persistida y egresada. No se borraron registros.' };
  console.log(JSON.stringify(summary));
  return summary;
}
