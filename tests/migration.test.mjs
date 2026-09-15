import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { compareShadow } from '../migration/shadow.js';
import { createEpisode, durations } from '../app/src/model/clinical-record.js';
test('Comparación en sombra usa episodio y detecta diferencias sin modificar entradas', () => {
  const input = [{ episodeId: 'TEST-E1', bed: 1, airway: 'TOT', support: 'VM', vmHours: 24, openPending: 1 }];
  const baseline = structuredClone(input);
  assert.equal(compareShadow(input, input).matched, true);
  const changed = [{ ...input[0], bed: 2 }];
  assert.deepEqual(compareShadow(input, changed).differences, [{ episodeId: 'TEST-E1', field: 'bed' }]);
  assert.deepEqual(input, baseline);
  assert.equal(compareShadow(input, input).productionCutoverAllowed, false);
  assert.throws(() => compareShadow([...input, ...input], changed), /duplicado/);
});
test('VM NEXT coincide con función legacy en bloques completos de un tramo sin cambio horario', () => {
  const source = readFileSync(new URL('../legacy-baseline/v7.04/infra_fechas.gs', import.meta.url), 'utf8');
  const context = vm.createContext({}); vm.runInContext(source, context);
  const episode = createEpisode({ id: 'TEST-E1', personId: 'TEST-P1', alias: 'Prueba', bed: 1, at: '2026-09-15T08:00:00Z', airway: 'TOT', support: 'VM' });
  for (const [date, hour] of [['2026-09-15', '20:00'], ['2026-09-16', '08:00'], ['2026-09-17', '09:00']]) {
    const legacy = context.diasBloques24('2026-09-15 08:00', '2026-09-15', date, hour);
    assert.equal(durations(episode, `${date}T${hour}:00Z`).completedDays.VM, legacy);
  }
});
