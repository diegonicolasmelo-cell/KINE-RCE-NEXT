export class ClinicalController {
  constructor(service, view) { this.service = service; this.view = view; this.activeId = null; }
  start() {
    this.view.bind({ open: id => this.open(id), command: command => this.execute(command), admit: bed => this.admit(bed), refresh: () => this.refresh() });
    this.refresh();
  }
  refresh() { this.view.board(this.service.list()); if (this.activeId) this.view.record(this.service.get(this.activeId)); }
  open(id) { this.activeId = id; this.refresh(); this.view.show(); }
  execute(command) {
    try {
      this.service.execute(this.activeId, command, { revision: this.view.revision, requestId: crypto.randomUUID(), author: 'Profesional de prueba' });
      this.refresh(); this.view.message('Cambio registrado en la simulación. Se perderá al recargar.');
    } catch (error) { this.view.message(error.message, true); }
  }
  admit(bed) {
    try {
      const personId = `TEST-PER-${crypto.randomUUID()}`;
      const episode = this.service.admit({ personId, alias: `Paciente de prueba · cama ${bed}`, bed });
      this.open(episode.id);
    } catch (error) { this.view.message(error.message, true); }
  }
}
