export class BedBoardController {
  constructor({ service, view }) {
    this.service = service;
    this.view = view;
  }

  async start() {
    const board = await this.service.getBoard();
    this.view.render(board, bed => this.openBed(bed));
  }

  openBed(bed) {
    this.view.openBed(bed);
  }
}

