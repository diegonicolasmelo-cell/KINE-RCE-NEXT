import { Bed } from '../model/bed.js';

const OCCUPIED = {
  1: ['Paciente prueba A', 'TEST-EP-001', 'TOT', 'VM', 2],
  2: ['Paciente prueba B', 'TEST-EP-002', 'TQT', 'VM', 1],
  4: ['Paciente prueba C', 'TEST-EP-003', 'Natural', 'CNAF', 0],
  5: ['Paciente prueba D', 'TEST-EP-004', 'TQT', 'Oxigenoterapia', 3],
  7: ['Paciente prueba E', 'TEST-EP-005', 'TOT', 'VM', 1],
  8: ['Paciente prueba F', 'TEST-EP-006', 'Natural', 'Ambiente', 0],
  10: ['Paciente prueba G', 'TEST-EP-007', 'Máscara', 'VNI', 2],
  12: ['Paciente prueba H', 'TEST-EP-008', 'TOT', 'VM', 0],
  13: ['Paciente prueba I', 'TEST-EP-009', 'TQT', 'CNAF', 1],
  15: ['Paciente prueba J', 'TEST-EP-010', 'Natural', 'Oxigenoterapia', 0],
  16: ['Paciente prueba K', 'TEST-EP-011', 'TOT', 'VM', 4],
  18: ['Paciente prueba L', 'TEST-EP-012', 'Natural', 'Ambiente', 0]
};

export class SyntheticBedRepository {
  async list() {
    return Array.from({ length: 18 }, (_, index) => {
      const number = index + 1;
      const data = OCCUPIED[number];
      return data
        ? new Bed({ number, status: 'occupied', patientAlias: data[0], episodeId: data[1], airway: data[2], support: data[3], pending: data[4] })
        : new Bed({ number, status: 'available' });
    });
  }
}

