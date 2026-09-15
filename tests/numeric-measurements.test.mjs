import test from 'node:test';
import assert from 'node:assert/strict';
import { measurementValue } from '../app/src/model/clinical-record.js';
const numeric = (kind, value, unit) => measurementValue({ kind, value, unit, format: 'numeric-v1' });
test('Unidades de mediciones numéricas son fijas; conserva signo y coma decimal', () => {
  assert.deepEqual(numeric('PIM', '-35,5', 'kg'), { value: '-35.5', unit: 'cmH₂O', components: null, format: 'numeric-v1' });
  assert.equal(numeric('FEM', '2.5').unit, 'L/s');
  assert.equal(numeric('Prensión', '0').value, '0');
  assert.equal(numeric('Presión transtraqueal', '4').unit, 'cmH₂O');
});
test('No convierte vacíos, texto o números no finitos en mediciones', () => {
  for (const value of ['', ' ', null, 'NaN', 'Infinity', '12 kg', '1.2.3']) assert.throws(() => numeric('PEM', value), /numérico/);
  assert.throws(() => numeric('Prensión', '-1'), /mínimo/);
  assert.throws(() => numeric('GSA', '7.4'), /no permitida/);
});
test('Lectura histórica sin formato nuevo conserva textos previos', () => {
  assert.equal(measurementValue({ kind: 'PIM', value: 'Registro previo', unit: 'texto' }).value, 'Registro previo');
});
