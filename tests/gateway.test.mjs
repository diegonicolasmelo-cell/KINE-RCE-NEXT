import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchTest } from '../api/gateway.js';
function harness() {
  const rows = []; let seq = 0; let inLock = false;
  const deps = { now: () => '2026-09-15T15:00:00Z', id: () => `TEST-${++seq}`, allowedActors: ['tester'], lock: work => { assert.equal(inLock, false); inLock = true; try { return work(); } finally { inLock = false; } }, journal: { read: () => { assert.ok(inLock); return structuredClone(rows); }, append: row => { assert.ok(inLock); rows.push(structuredClone(row)); } } };
  const call = (body, actor = 'tester') => dispatchTest({ schemaVersion: 1, environment: 'TEST', ...body }, actor, deps);
  return { rows, deps, call };
}
test('API rechaza actor, contrato y datos no sintéticos antes de escribir', () => {
  const h = harness();
  assert.throws(() => h.call({ operation: 'LIST' }, 'stranger'), /autorizado/);
  assert.throws(() => h.call({ operation: 'LIST', environment: 'PRODUCTION' }), /inválido/);
  assert.throws(() => h.call({ operation: 'ADMIT', requestId: 'r1', episode: { personId: 'real', alias: 'Persona', bed: 1 } }), /sintéticas/);
  assert.equal(h.rows.length, 0);
});
test('Diario reconstruye turnos tras reinicio, firma y reintento son duraderos', () => {
  const h = harness();
  const input = { operation: 'ADMIT', requestId: 'r1', episode: { personId: 'TEST-P1', alias: 'Paciente de prueba A', bed: 1 } };
  const admission = h.call(input);
  assert.ok(h.call(input).duplicate); assert.equal(h.rows.length, 1);
  const request = { operation: 'COMMAND', requestId: 'r2', episodeId: admission.episodeId, revision: 0, command: { type: 'OPEN_TURN' } };
  h.call(request); const e = h.call({ operation: 'GET', episodeId: admission.episodeId });
  assert.equal(e.turns.length, 1); assert.ok(h.call(request).duplicate);
  h.call({ ...request, requestId: 'r3', revision: 1, command: { type: 'SIGN', turnId: e.turns[0].id } });
  const signed = h.call({ operation: 'GET', episodeId: e.id }); assert.ok(signed.turns[0].signedAt);
  assert.throws(() => h.call({ ...request, requestId: 'r4', revision: 2, command: { type: 'DRAFT', turnId: e.turns[0].id, note: 'Cambio', plan: '' } }), /firmado/);
  assert.equal(h.rows.length, 3);
});
test('Respuesta perdida después de persistir: reintento no duplica', () => {
  const h = harness(); const append = h.deps.journal.append;
  h.deps.journal.append = row => { append(row); throw new Error('Respuesta perdida'); };
  const request = { operation: 'ADMIT', requestId: 'r1', episode: { personId: 'TEST-P1', alias: 'Paciente de prueba A', bed: 1 } };
  assert.throws(() => h.call(request), /perdida/);
  assert.ok(h.call(request).duplicate); assert.equal(h.rows.length, 1);
});
test('Fallo de persistencia antes de escribir no confirma operación', () => {
  const h = harness(); h.deps.journal.append = () => { throw new Error('Disco no disponible'); };
  assert.throws(() => h.call({ operation: 'ADMIT', requestId: 'r1', episode: { personId: 'TEST-P1', alias: 'Paciente de prueba A', bed: 1 } }), /no disponible/);
  assert.equal(h.rows.length, 0);
});
