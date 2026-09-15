import { currentState, durations, handover, narrative } from '../model/clinical-record.js';

export function googleTransport(runner) {
  return request => new Promise((resolve, reject) => {
    runner.withSuccessHandler(response => {
      if (response?.ok) resolve(response.data);
      else reject(new Error(response?.error || 'Operación rechazada'));
    }).withFailureHandler(error => reject(Object.assign(new Error(error.message || 'Sin respuesta de Google'), { uncertain: true }))).nextTestRequest(JSON.parse(JSON.stringify(request)));
  });
}
export class GoogleClinicalService {
  constructor(send) { this.send = send; this.persistent = true; }
  request(body) { return this.send({ schemaVersion: 1, environment: 'TEST', ...body }); }
  async list() { return (await this.request({ operation: 'LIST' })).map(e => ({ ...e, state: currentState(e) })); }
  async get(id) {
    const e = await this.request({ operation: 'GET', episodeId: id });
    return { episode: e, state: currentState(e), clocks: durations(e, new Date().toISOString()), handover: handover(e), narratives: e.turns.map(t => ({ id: t.id, text: narrative(e, t.id) })) };
  }
  async admit(episode, requestId) {
    const receipt = await this.request({ operation: 'ADMIT', requestId, episode });
    return { id: receipt.episodeId };
  }
  execute(episodeId, command, { revision, requestId }) { return this.request({ operation: 'COMMAND', episodeId, command, revision, requestId }); }
}
