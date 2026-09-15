import { ClinicalController } from './controllers/clinical-controller.js';
import { ClinicalView } from './views/clinical-view.js';
import { GoogleClinicalService, googleTransport } from './api/google-service.js';
const view = new ClinicalView(document);
document.querySelector('.connection').textContent = 'Google Sheets TEST';
document.querySelector('.section-heading p:last-child').textContent = 'Datos sintéticos guardados en Sheets TEST. Selecciona una cama para comenzar.';
document.querySelector('.dialog-note').textContent = 'Guardado en Sheets TEST. Horas mostradas en Santiago.';
new ClinicalController(new GoogleClinicalService(googleTransport(google.script.run)), view).start();
