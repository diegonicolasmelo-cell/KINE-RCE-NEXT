import { BedBoardController } from './controllers/bed-board-controller.js';
import { BedBoardService } from './services/bed-board-service.js';
import { SyntheticBedRepository } from './repositories/synthetic-bed-repository.js';
import { BedBoardView } from './views/bed-board-view.js';

const controller = new BedBoardController({
  service: new BedBoardService(new SyntheticBedRepository()),
  view: new BedBoardView(document)
});

controller.start();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./service-worker.js');
}

