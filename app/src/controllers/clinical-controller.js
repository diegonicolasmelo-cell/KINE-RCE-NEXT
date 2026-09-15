export class ClinicalController {
  constructor(service, view) { this.service = service; this.view = view; this.activeId = null; }
  start() {
    this.view.bind({ open: id => this.open(id), command: command => this.execute(command), admit: bed => this.admit(bed), refresh: () => this.refresh() });
    this.run(() => this.refresh());
  }
  async refresh() { this.view.board(await this.service.list()); if (this.activeId) this.view.record(await this.service.get(this.activeId)); }
  async run(work) {
    if (this.busy) return;
    this.busy = true; this.view.setBusy(true);
    try { await work(); } catch (error) { this.view.message(error.message, true); }
    finally { this.busy = false; this.view.setBusy(false); }
  }
  open(id) { return this.run(async () => { this.activeId = id; await this.refresh(); this.view.show(); }); }
  execute(command) {
    return this.run(async () => {
      const fingerprint = JSON.stringify([this.activeId, command]);
      if (this.pending && this.pending.fingerprint !== fingerprint) throw new Error('Primero reintenta la operación pendiente sin cambiar su contenido.');
      const pending = this.pending || { fingerprint, options: { revision: this.view.revision, requestId: crypto.randomUUID(), author: 'Profesional de prueba' } };
      this.pending = pending;
      try { await this.service.execute(this.activeId, command, pending.options); }
      catch (error) { if (!error.uncertain) this.pending = null; throw error; }
      this.pending = null;
      await this.refresh(); this.view.message(this.service.persistent ? 'Guardado en Sheets TEST.' : 'Cambio registrado en la simulación. Se perderá al recargar.');
    });
  }
  admit(bed) {
    return this.run(async () => {
      if (this.pendingAdmission && this.pendingAdmission.input.bed !== bed) throw new Error('Reintenta primero el ingreso pendiente en la misma cama.');
      const pending = this.pendingAdmission || { input: { personId: `TEST-PER-${crypto.randomUUID()}`, alias: `Paciente de prueba · cama ${bed}`, bed }, requestId: crypto.randomUUID() };
      this.pendingAdmission = pending;
      let episode;
      try { episode = await this.service.admit(pending.input, pending.requestId); }
      catch (error) { if (!error.uncertain) this.pendingAdmission = null; throw error; }
      this.pendingAdmission = null; this.activeId = episode.id;
      await this.refresh(); this.view.show();
    });
  }
}
