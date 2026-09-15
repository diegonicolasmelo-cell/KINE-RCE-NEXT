export class Bed {
  constructor({ number, status, patientAlias = null, episodeId = null, airway = null, support = null, pending = 0 }) {
    if (!Number.isInteger(number) || number < 1) throw new TypeError('Número de cama inválido');
    if (!['occupied', 'available'].includes(status)) throw new TypeError('Estado de cama inválido');
    if (status === 'occupied' && (!patientAlias || !episodeId)) throw new TypeError('La cama ocupada requiere episodio sintético');

    this.number = number;
    this.status = status;
    this.patientAlias = patientAlias;
    this.episodeId = episodeId;
    this.airway = airway;
    this.support = support;
    this.pending = pending;
    Object.freeze(this);
  }
}

