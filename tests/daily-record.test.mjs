import test from 'node:test';
import assert from 'node:assert/strict';
import { createEpisode, applyCommand, narrative, describeHdn } from '../app/src/model/clinical-record.js';
import { dailySheet } from '../app/src/views/clinical-view.js';
import { dispatchTest } from '../api/gateway.js';
const at = '2026-10-18T15:00:00Z';
function scenario() {
  let e = createEpisode({ id: 'e', personId: 'TEST-1', alias: 'Paciente de prueba', bed: 1, at });
  let seq = 0;
  const send = command => (e = applyCommand(e, command, { id: `op${++seq}`, author: 'TEST', now: at }));
  send({ type: 'OPEN_TURN' });
  return { send, get: () => e };
}
const daily = extra => ({ type: 'DAILY_ASSESSMENT', format: 'daily-v1', turnId: 'op1', ...extra });
test('Valoraciones agregan columnas sin modificar episodio, notas ni valoraciones previas', () => {
  const s = scenario();
  s.send({ type: 'DRAFT', turnId: 'op1', note: 'Nota previa', plan: 'Plan previo' });
  s.send(daily({ values: { fc: '82', sas: '1', auscultation: 'Prueba A', secretions: 'Prueba B' }, hdn: 'dva', dva: [{ drug: 'NAD', dose: '0,35', unit: 'µg/kg/min' }] }));
  const first = structuredClone(s.get().dailyRecords[0]);
  s.send(daily({ values: { fc: '96', sas: '2' } }));
  assert.deepEqual(s.get().dailyRecords[0], first);
  assert.equal(s.get().dailyRecords[1].values.secretions, null);
  assert.equal(describeHdn(s.get().dailyRecords[1]), '');
  assert.equal(s.get().turns[0].note, 'Nota previa');
  assert.equal(s.get().initial.airway, 'Natural');
  assert.match(narrative(s.get(), 'op1'), /HDN con 1 DVA: NAD 0.35 µg\/kg\/min/);
  assert.doesNotMatch(narrative(s.get(), 'op1'), /dosis alta|moderada|dosis baja/);
});
test('DVA exige coherencia, unidades y dosis; ausencias no equivalen a autosostenida', () => {
  const s = scenario();
  const drug = { drug: 'NAD', dose: '0.35', unit: 'µg/kg/min' };
  for (const fields of [
    { hdn: 'autosostenida', dva: [drug] }, { hdn: 'dva', dva: [] },
    { hdn: 'dva', dva: [drug, drug] }, { hdn: 'dva', dva: [{ ...drug, unit: '' }] },
    { hdn: 'dva', dva: [{ ...drug, dose: '0' }] }, { values: { sas: '1.5' } },
    { values: { fc: 'texto' } }, { values: { spo2: '101' } }, {},
  ]) assert.throws(() => s.send(daily(fields)));
  assert.equal(s.get().dailyRecords, undefined);
  s.send(daily({ hdn: 'autosostenida' }));
  assert.equal(describeHdn(s.get().dailyRecords[0]), 'HDN autosostenida');
});
test('GSA y hoja se guardan juntas; KTM no crea sesión; firma congela y rechaza nuevos datos', () => {
  const s = scenario();
  const command = daily({ values: { observations: 'Prueba' }, gas: { at, components: { ph: '7,38', eb: '-2', lactate: '0' } }, ktm: { objective: 'Evaluar sedente', limitations: 'Prueba de limitaciones' } });
  assert.throws(() => s.send({ ...command, gas: { at, components: { ph: 'mal' } } }));
  assert.equal(s.get().measurements.length, 0); assert.equal(s.get().dailyRecords, undefined);
  s.send(command);
  assert.equal(s.get().measurements.length, 1); assert.equal(s.get().activities.length, 0);
  assert.equal(s.get().dailyRecords[0].gasId, s.get().measurements[0].id);
  const markup = dailySheet(s.get(), s.get().turns[0]);
  assert.match(markup, /Hora de muestra GSA/); assert.match(markup, /Evaluar sedente/);
  s.send({ type: 'SIGN', turnId: 'op1' });
  const snapshot = narrative(s.get(), 'op1');
  assert.match(snapshot, /lactato|Lactato/); assert.match(snapshot, /no acredita sesión realizada/);
  assert.throws(() => s.send(command), /firmado/);
  s.send({ type: 'ADDENDUM', turnId: 'op1', reason: 'Prueba', text: 'Corrección sintética' });
  assert.equal(narrative(s.get(), 'op1'), snapshot);
});
test('Diario reconstruye la hoja y reintento idéntico no duplica columna ni gas', () => {
  const rows = []; let seq = 0;
  const deps = { journal: { read: () => structuredClone(rows), append: row => rows.push(structuredClone(row)) }, lock: fn => fn(), now: () => at, id: () => `id${++seq}`, allowedActors: ['TEST'] };
  const send = req => dispatchTest({ environment: 'TEST', schemaVersion: 1, ...req }, 'TEST', deps);
  const e = send({ operation: 'ADMIT', requestId: 'a', episode: { personId: 'TEST-1', alias: 'Paciente de prueba', bed: 1 } });
  send({ operation: 'COMMAND', requestId: 'b', episodeId: e.episodeId, revision: 0, command: { type: 'OPEN_TURN' } });
  const req = { operation: 'COMMAND', requestId: 'c', episodeId: e.episodeId, revision: 1, command: daily({ turnId: 'id2', values: { fc: '80' }, gas: { at, components: { ph: '7.4' } } }) };
  send(req); assert.equal(send(req).duplicate, true);
  const saved = send({ operation: 'GET', episodeId: e.episodeId });
  assert.equal(rows.length, 3); assert.equal(saved.dailyRecords.length, 1); assert.equal(saved.measurements.length, 1);
});
