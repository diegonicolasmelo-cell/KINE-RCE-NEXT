import test from 'node:test';
import assert from 'node:assert/strict';
import { GoogleClinicalService, googleTransport } from '../app/src/api/google-service.js';
import { dispatchTest } from '../api/gateway.js';
import { ClinicalController } from '../app/src/controllers/clinical-controller.js';
test('Interfaz asíncrona persiste, reabre y conserva autor del servidor', async () => {
  const rows = []; let n = 0;
  const deps = { allowedActors: ['google-user'], journal: { read: () => rows, append: row => rows.push(row) }, lock: work => work(), now: () => new Date().toISOString(), id: () => `id-${++n}` };
  const service = new GoogleClinicalService(async request => dispatchTest(request, 'google-user', deps));
  const admitted = await service.admit({ personId: 'TEST-1', alias: 'Paciente de prueba', bed: 1 }, 'admit');
  await service.execute(admitted.id, { type: 'OPEN_TURN' }, { revision: 0, requestId: 'open', author: 'forged' });
  const reopened = await new GoogleClinicalService(service.send).get(admitted.id);
  assert.equal(reopened.episode.audit[0].author, 'google-user');
  assert.equal(reopened.episode.turns.length, 1);
  assert.equal((await service.list()).length, 1);
});
test('Controlador conserva solicitud al perder respuesta y evita doble clic', async () => {
  const requests = []; let release;
  const service = { execute: async (_id, _command, options) => { requests.push(options); if (requests.length === 1) await new Promise((_resolve, reject) => { release = () => reject(Object.assign(new Error('Sin respuesta'), { uncertain: true })); }); }, list: () => [], get: () => ({}) };
  const view = { revision: 0, setBusy() {}, message() {}, board() {}, record() {} };
  const controller = new ClinicalController(service, view); controller.activeId = 'episode';
  const first = controller.execute({ type: 'OPEN_TURN' });
  await controller.execute({ type: 'OPEN_TURN' });
  assert.equal(requests.length, 1); release(); await first;
  await controller.execute({ type: 'OPEN_TURN' });
  assert.equal(requests[0].requestId, requests[1].requestId);
});
test('Guardar seguido de lectura fallida reintenta el mismo recibo', async () => {
  const requests = []; let reads = 0;
  const service = { execute: async (_id, _command, options) => requests.push(options), list: () => { if (++reads === 1) throw new Error('Lectura fallida'); return []; }, get: () => ({}) };
  const view = { revision: 0, setBusy() {}, message() {}, board() {}, record() {} };
  const controller = new ClinicalController(service, view); controller.activeId = 'e';
  await controller.execute({ type: 'OPEN_TURN' });
  await controller.execute({ type: 'OPEN_TURN' });
  assert.equal(requests[0].requestId, requests[1].requestId);
  assert.equal(controller.pending, null);
});
test('Transporte conserva incertidumbre de un fallo de Sheets posterior a escritura', async () => {
  let success;
  const runner = { withSuccessHandler(fn) { success = fn; return this; }, withFailureHandler() { return this; }, nextTestRequest() { success({ ok: false, error: 'Flush falló', uncertain: true }); } };
  await assert.rejects(googleTransport(runner)({}), error => error.uncertain === true);
});
