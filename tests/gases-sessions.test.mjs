import test from 'node:test';
import assert from 'node:assert/strict';
import { measurementValue, createEpisode, applyCommand, currentState, narrative } from '../app/src/model/clinical-record.js';
const gas = components => measurementValue({ kind: 'GSA', format: 'gsa-v1', components });
test('Gases preservan cero, signo y resultados ausentes sin inventar valores', () => {
  const sample = gas({ ph: '7,38', eb: '-2', lactate: '0', fio2: '40' });
  assert.equal(sample.components.ph, 7.38); assert.equal(sample.components.eb, -2);
  assert.equal(sample.components.lactate, 0); assert.equal(sample.components.pao2, null);
  assert.match(sample.value, /FiO₂ al momento: 40 %/);
  assert.throws(() => gas({}), /al menos/);
  assert.throws(() => gas({ ph: 'texto' }), /numérico/);
  assert.throws(() => gas({ fio2: '101' }), /rango/);
  assert.throws(() => gas({ unknown: '1' }), /desconocido/);
});
function scenario() {
  const at = '2026-09-15T16:00:00Z'; let seq = 0;
  let episode = createEpisode({ id: 'e', personId: 'TEST-1', alias: 'Paciente de prueba', bed: 1, at });
  const send = command => { episode = applyCommand(episode, command, { id: `op${++seq}`, now: at, author: 'TEST' }); return episode; };
  send({ type: 'OPEN_TURN' });
  return { send, get: () => episode };
}
test('Dos gases permanecen separados y aparecen en el turno firmado', () => {
  const s = scenario();
  s.send({ type: 'MEASUREMENT', turnId: 'op1', kind: 'GSA', format: 'gsa-v1', components: { ph: '7.30', eb: '0' } });
  s.send({ type: 'MEASUREMENT', turnId: 'op1', kind: 'GSA', format: 'gsa-v1', components: { ph: '7.40' } });
  s.send({ type: 'SIGN', turnId: 'op1' });
  assert.equal(s.get().measurements.length, 2); assert.match(narrative(s.get(),'op1'), /pH: 7.3; EB: 0/);
});
test('KTR agrupa técnicas; KTM preserva sesiones y EMS no inicia un programa', () => {
  const s = scenario();
  const activity = (kind, parameters, techniques = []) => s.send({ type: 'ACTIVITY', turnId: 'op1', kind, status: 'Realizada', detail: 'Prueba', format: 'session-v1', parameters, techniques });
  activity('KTR', {}, ['Técnica sintética A', 'Técnica sintética B']);
  activity('KTM', { minutes: '20', borg: '0', assistance: 'Prueba A' });
  activity('KTM', { minutes: '30', borg: '4', assistance: 'Prueba B' });
  activity('EMS', { frequency: '50', intensity: '60', pulse: '400', minutes: '30', muscles: 'Grupo sintético' });
  const e = s.get();
  assert.equal(e.activities.filter(a => a.kind === 'KTR').length, 1);
  assert.equal(e.activities[0].techniques.length, 2);
  assert.deepEqual(e.activities.filter(a => a.kind === 'KTM').map(a => a.parameters.minutes), [20,30]);
  assert.equal(e.activities[1].parameters.borg, 0); assert.equal(currentState(e).ems, null);
  s.send({ type: 'SIGN', turnId: 'op1' }); assert.match(narrative(s.get(),'op1'), /Frecuencia: 50 Hz/);
  assert.throws(() => activity('IMT',{ sets: '3' }), /firmado/);
});
test('Sesiones rechazan parámetros fuera de rango o ejecución en no realizadas', () => {
  const s = scenario();
  const command = { type: 'ACTIVITY', turnId: 'op1', kind: 'IMT', detail: 'Prueba', status: 'Realizada', format: 'session-v1', parameters: { sets: '21' } };
  assert.throws(() => s.send(command), /rango/);
  assert.throws(() => s.send({ ...command, parameters: { minutes: '1.5' } }), /entero/);
  assert.throws(() => s.send({ ...command, status: 'No realizada', parameters: { sets: '3' } }), /no realizada/);
  assert.equal(s.get().activities.length, 0);
});
