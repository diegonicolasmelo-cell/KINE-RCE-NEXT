import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { measurementValue, SCALE_COMPONENTS, createEpisode, applyCommand, narrative } from '../app/src/model/clinical-record.js';
const components = (kind, value) => Object.fromEntries(SCALE_COMPONENTS[kind].map(({ key }) => [key, value]));
test('FSS coincide con sumFSS legacy en las 59049 combinaciones completas de puntajes y NE', () => {
  const source = readFileSync(new URL('../legacy-baseline/v7.04/index.html', import.meta.url), 'utf8');
  const start = source.indexOf('function sumFSS(){');
  const end = source.indexOf('//  MRC-SS por movimiento', start);
  assert.ok(start > 0 && end > start);
  let input = {}; const fields = { fssItSum: { textContent: '' }, fFSS: { value: '' } };
  const context = vm.createContext({ v: key => input[key], $: key => fields[key], interpFSS() {}, _updateEvalBtn() {} });
  vm.runInContext(source.slice(start, end), context);
  const choices = ['0','1','2','3','4','5','6','7','NE'];
  for (let code = 0; code < 9 ** 5; code++) {
    let digits = code; const values = {};
    for (let i = 1; i <= 5; i++) { const value = choices[digits % 9]; digits = Math.floor(digits / 9); values[`item${i}`] = value; input[`fFssIt${i}`] = value; }
    fields.fFSS.value = ''; context.sumFSS();
    assert.equal(measurementValue({ kind: 'FSS', components: values }).value, fields.fFSS.value === '' ? 'NE' : String(fields.fFSS.value));
  }
});
test('MRC y CPAx derivan total, conservan ceros y rechazan componentes incompletos', () => {
  for (const [kind, maximum] of [['MRC', 60], ['CPAx', 50]]) {
    assert.equal(measurementValue({ kind, components: components(kind, '5'), value: '99' }).value, String(maximum));
    assert.equal(measurementValue({ kind, components: components(kind, '0') }).value, '0');
    const partial = components(kind, '2'); delete partial[Object.keys(partial)[0]];
    assert.throws(() => measurementValue({ kind, components: partial }), /incompletos/);
    assert.throws(() => measurementValue({ kind, components: components(kind, '') }), /Completa/);
    assert.throws(() => measurementValue({ kind, components: components(kind, '6') }), /Completa/);
  }
});
test('FSS conserva NE y calcula promedio solo hasta dos NE, sin convertir faltantes a cero', () => {
  const values = { item1: '1', item2: '2', item3: '4', item4: 'NE', item5: 'NE' };
  const result = measurementValue({ kind: 'FSS', components: values });
  assert.equal(result.value, '12'); assert.deepEqual(result.components, values);
  assert.equal(result.calculation.method, 'promedio-imputado-legacy-7.04');
  const noncalculable = measurementValue({ kind: 'FSS', components: { ...values, item3: 'NE' } });
  assert.equal(noncalculable.value, 'NE'); assert.equal(noncalculable.calculation.method, 'no-calculable');
  assert.throws(() => measurementValue({ kind: 'FSS', components: { ...values, item1: '' } }), /Completa/);
});
test('Series estructuradas no se sobreescriben y firma conserva componentes y método', () => {
  const at = '2026-09-15T16:00:00Z';
  let e = createEpisode({ id: 'e', personId: 'TEST-1', alias: 'Paciente de prueba', bed: 1, at });
  let n = 0; const command = c => { e = applyCommand(e, c, { id: `c${++n}`, author: 'TEST', now: at }); };
  command({ type: 'OPEN_TURN' });
  command({ type: 'MEASUREMENT', turnId: 'c1', kind: 'FSS', components: { ...components('FSS','5'), item1: 'NE' } });
  command({ type: 'MEASUREMENT', turnId: 'c1', kind: 'FSS', components: components('FSS','0') });
  assert.equal(e.measurements.length, 2); assert.equal(e.measurements[0].value, '25');
  command({ type: 'SIGN', turnId: 'c1' });
  assert.match(narrative(e, 'c1'), /Giro: NE/); assert.match(narrative(e, 'c1'), /imputación por promedio/);
});
