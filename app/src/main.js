import { ClinicalController } from './controllers/clinical-controller.js';
import { ClinicalRepository, ClinicalService } from './repositories/clinical-repository.js';
import { SyntheticBedRepository } from './repositories/synthetic-bed-repository.js';
import { ClinicalView } from './views/clinical-view.js';

const repository = new ClinicalRepository();
for (const bed of await new SyntheticBedRepository().list()) {
  if (bed.status === 'occupied') repository.admit({ id: bed.episodeId, personId: `PERSON-${bed.episodeId}`, alias: bed.patientAlias, bed: bed.number, airway: bed.airway === 'Máscara' ? 'Natural' : bed.airway, support: bed.support });
}
new ClinicalController(new ClinicalService(repository), new ClinicalView(document)).start();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {
    document.querySelector('.connection').textContent = 'Simulación · caché no disponible';
  });
}
