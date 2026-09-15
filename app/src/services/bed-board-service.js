export class BedBoardService {
  constructor(repository) { this.repository = repository; }

  async getBoard() {
    const beds = await this.repository.list();
    return {
      beds,
      summary: {
        occupied: beds.filter(bed => bed.status === 'occupied').length,
        available: beds.filter(bed => bed.status === 'available').length,
        pending: beds.reduce((total, bed) => total + bed.pending, 0)
      }
    };
  }
}

