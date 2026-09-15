import { createEpisode, applyCommand } from '../app/src/model/clinical-record.js';

// Transport-independent TEST gateway. Actor comes from server authentication,
// never from a client-supplied author field. Storage adapters own serialization.
export function dispatchTest(request, actor, dependencies) {
  const { journal, lock, now, id, allowedActors } = dependencies;
  if (!allowedActors.includes(actor) || !actor) throw new Error('Acceso TEST no autorizado');
  if (!request || request.environment !== 'TEST' || request.schemaVersion !== 1) throw new Error('Contrato TEST inválido');
  if (JSON.stringify(request).length > 30000) throw new Error('Solicitud demasiado grande');
  return lock(() => {
    const rows = journal.read();
    if (rows.length > 20000) throw new Error('Límite del prototipo: archivar y validar un nuevo diseño antes de continuar');
    const episodes = new Map();
    for (const row of rows) {
      if (row.schemaVersion !== 1 || !row.context || !row.request) throw new Error('Diario inválido: no se permite escribir');
      if (row.request.operation === 'ADMIT') {
        const e = createEpisode({ ...row.request.episode, id: row.context.id, at: row.context.now });
        if (episodes.has(e.id)) throw new Error('Episodio duplicado en el diario');
        episodes.set(e.id, e);
      } else {
        const before = episodes.get(row.request.episodeId);
        if (!before || before.revision !== row.request.revision) throw new Error('Secuencia inválida en el diario');
        episodes.set(before.id, applyCommand(before, row.request.command, row.context));
      }
    }
    if (request.operation === 'LIST') return [...episodes.values()];
    if (request.operation === 'GET') {
      if (!episodes.has(request.episodeId)) throw new Error('Episodio no encontrado');
      return episodes.get(request.episodeId);
    }
    if (!['ADMIT', 'COMMAND'].includes(request.operation)) throw new Error('Operación no permitida');
    if (typeof request.requestId !== 'string' || !/^[\w-]{1,100}$/.test(request.requestId)) throw new Error('Identificador de solicitud inválido');
    const prior = rows.find(row => row.request.requestId === request.requestId);
    if (prior) {
      if (JSON.stringify(prior.request) !== JSON.stringify(request) || prior.context.author !== actor) throw new Error('Solicitud reutilizada con otro contenido');
      return { episodeId: prior.request.operation === 'ADMIT' ? prior.context.id : prior.request.episodeId, revision: prior.revision, duplicate: true };
    }
    const context = { id: id(), now: now(), author: actor };
    let result;
    if (request.operation === 'ADMIT') {
      if (!request.episode || !String(request.episode.personId).startsWith('TEST-') || !String(request.episode.alias).startsWith('Paciente de prueba')) throw new Error('Solo identidades sintéticas TEST');
      result = createEpisode({ ...request.episode, id: context.id, at: context.now });
      if ([...episodes.values()].some(e => !e.dischargedAt && (e.bed === result.bed || e.personId === result.personId))) throw new Error('Cama o persona ocupada');
    } else {
      const before = episodes.get(request.episodeId);
      if (!before || before.revision !== request.revision) throw new Error('Conflicto de revisión: vuelve a leer el episodio');
      if (request.command?.type === 'MOVE' && [...episodes.values()].some(e => e.id !== before.id && !e.dischargedAt && e.bed === request.command.bed)) throw new Error('Cama ocupada');
      result = applyCommand(before, request.command, context);
    }
    const row = { schemaVersion: 1, request, context, revision: result.revision };
    if (JSON.stringify(row).length > 40000) throw new Error('Registro excede límite de almacenamiento TEST');
    // One append contains command, identity, revision and idempotency receipt.
    // An uncertain response is retried with the same requestId, never a new one.
    journal.append(row);
    return { episodeId: result.id, revision: result.revision, duplicate: false };
  });
}
