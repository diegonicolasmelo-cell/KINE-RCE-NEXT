import { applyCommand, createEpisode, currentState, durations, handover, narrative } from '../model/clinical-record.js';
const clone = value => JSON.parse(JSON.stringify(value));
export class ClinicalRepository {
  #episodes = new Map();
  #requests = new Map();
  constructor({ now = () => new Date().toISOString(), id = () => crypto.randomUUID() } = {}) { this.now = now; this.id = id; }
  list() { return clone([...this.#episodes.values()]); }
  get(id) { const item = this.#episodes.get(id); if (!item) throw new Error('Episodio no encontrado'); return clone(item); }
  admit(input) {
    const episode = createEpisode({ ...input, id: input.id || this.id(), at: input.at || this.now() });
    if (Date.parse(episode.admittedAt) > Date.parse(this.now())) throw new Error('Ingreso futuro');
    if (this.#episodes.has(episode.id)) throw new Error('Identificador de episodio duplicado');
    if (this.list().some(e => !e.dischargedAt && (e.bed === episode.bed || e.personId === episode.personId))) throw new Error('Cama o persona ya tiene un episodio activo');
    this.#episodes.set(episode.id, episode); return this.get(episode.id);
  }
  execute(id, command, { revision, requestId, author }) {
    if (!requestId || !author) throw new Error('Autor e identificador de solicitud requeridos');
    // Canonical fingerprint includes nested data; retries cannot change content.
    const fingerprint = JSON.stringify([id, command, author]);
    const previous = this.#requests.get(requestId);
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new Error('Identificador de solicitud reutilizado con otro contenido');
      return clone(previous.result);
    }
    const original = this.get(id);
    if (original.revision !== revision) throw new Error('El episodio cambió. Actualiza antes de guardar');
    if (command.type === 'MOVE' && this.list().some(e => e.id !== id && !e.dischargedAt && e.bed === command.bed)) throw new Error('La cama destino está ocupada');
    const result = applyCommand(original, command, { id: this.id(), author, now: this.now() });
    this.#episodes.set(id, result); this.#requests.set(requestId, { fingerprint, result }); return clone(result);
  }
}
export class ClinicalService {
  constructor(repository) { this.repository = repository; }
  list() { return this.repository.list().map(episode => ({ ...episode, state: currentState(episode) })); }
  get(id) { const e = this.repository.get(id); return { episode: e, state: currentState(e), clocks: durations(e, this.repository.now()), handover: handover(e), narratives: e.turns.map(t => ({ id: t.id, text: narrative(e, t.id) })) }; }
  admit(input) { return this.repository.admit(input); }
  execute(id, command, options) { return this.repository.execute(id, command, options); }
}
