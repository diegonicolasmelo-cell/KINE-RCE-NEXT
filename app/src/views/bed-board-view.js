const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export class BedBoardView {
  constructor(document) {
    this.document = document;
    this.board = document.querySelector('#bed-board');
    this.dialog = document.querySelector('#patient-dialog');
    document.querySelector('.close-button').addEventListener('click', () => this.dialog.close());
  }

  render({ beds, summary }, onSelect) {
    this.document.querySelector('#occupied-count').textContent = summary.occupied;
    this.document.querySelector('#available-count').textContent = summary.available;
    this.document.querySelector('#pending-count').textContent = summary.pending;
    this.board.replaceChildren(...beds.map(bed => this.createCard(bed, onSelect)));
  }

  createCard(bed, onSelect) {
    const button = this.document.createElement('button');
    button.type = 'button';
    button.className = `bed-card bed-card--${bed.status}`;
    button.innerHTML = bed.status === 'available'
      ? `<div class="bed-card__stripe"></div><div class="bed-card__body"><div class="bed-card__top"><span class="bed-card__number">Cama ${bed.number}</span><span class="bed-card__status">Disponible</span></div><p class="bed-card__name">Sin episodio activo</p><p class="bed-card__detail">Lista para una navegación futura de ingreso.</p></div>`
      : `<div class="bed-card__stripe"></div><div class="bed-card__body"><div class="bed-card__top"><span class="bed-card__number">Cama ${bed.number}</span><span class="bed-card__status">Ocupada</span></div><p class="bed-card__name">${escapeHtml(bed.patientAlias)}</p><p class="bed-card__detail">${escapeHtml(bed.episodeId)}</p><div class="chips"><span class="chip">${escapeHtml(bed.airway)}</span><span class="chip">${escapeHtml(bed.support)}</span>${bed.pending ? `<span class="chip chip--warn">${bed.pending} pendiente${bed.pending > 1 ? 's' : ''}</span>` : ''}</div></div>`;
    button.addEventListener('click', () => onSelect(bed));
    return button;
  }

  openBed(bed) {
    this.document.querySelector('#dialog-title').textContent = `Cama ${bed.number}`;
    this.document.querySelector('#dialog-body').innerHTML = bed.status === 'available'
      ? '<p>Esta cama no tiene un episodio sintético activo.</p>'
      : `<p><strong>${escapeHtml(bed.patientAlias)}</strong></p><div class="dialog-grid"><article><span>Episodio</span>${escapeHtml(bed.episodeId)}</article><article><span>Pendientes</span>${bed.pending}</article><article><span>Vía aérea</span>${escapeHtml(bed.airway)}</article><article><span>Soporte</span>${escapeHtml(bed.support)}</article></div>`;
    this.dialog.showModal();
  }
}

