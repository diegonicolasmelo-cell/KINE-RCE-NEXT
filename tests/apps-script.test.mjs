import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
function runtime() {
  const properties = new Map(), cells = [], metadata = [], logs = [];
  let user = 'TEST-USER', counter = 0, locked = false, creates = 0;
  const sheet = {
    name: 'Sheet1', setName(value) { this.name = value; },
    getLastRow: () => cells.length,
    getRange(row, column, count = 1) {
      assert.equal(column, 1);
      return { setValue: value => { cells[row - 1] = value; }, getValue: () => cells[row - 1], getValues: () => cells.slice(row - 1, row - 1 + count).map(value => [value]) };
    }
  };
  const book = { getSheets: () => [sheet], getId: () => 'TEST-SHEET', getUrl: () => 'TEST-URL', addDeveloperMetadata: (key, value) => metadata.push({ getKey: () => key, getValue: () => value }), getDeveloperMetadata: () => metadata, getSheetByName: name => sheet.name === name ? sheet : null };
  const context = vm.createContext({
    console: { log: text => logs.push(text) },
    Session: { getActiveUser: () => ({ getEmail: () => user }) },
    Utilities: { getUuid: () => `UUID-${++counter}` },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties.get(key), setProperties: values => Object.entries(values).forEach(([key, value]) => properties.set(key, value)) }) },
    SpreadsheetApp: { create: () => { creates++; return book; }, openById: id => { assert.equal(id, 'TEST-SHEET'); return book; }, flush() {} },
    LockService: { getScriptLock: () => ({ waitLock: () => { assert.equal(locked, false); locked = true; }, releaseLock: () => { assert.equal(locked, true); locked = false; } }) }
  });
  const paths = ['../api/generated/domain.gs', '../api/apps-script/adapter.gs', '../api/apps-script/smoke.gs'];
  vm.runInContext(paths.map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n'), context);
  return { context, cells, metadata, properties, logs, user: value => { user = value; }, creates: () => creates };
}
test('Adaptador GAS y smoke completan ingreso/firma/adenda/egreso con Sheets simulado', () => {
  const r = runtime(); r.context.initializeNextTest();
  assert.equal(r.creates(), 1); assert.equal(r.properties.get('NEXT_ENV'), 'TEST');
  const result = r.context.runNextTestSmoke();
  assert.equal(result.passed, true); assert.equal(r.cells.length, 8);
  assert.equal(JSON.parse(r.cells.at(-1)).request.command.type, 'DISCHARGE');
  assert.throws(() => r.context.initializeNextTest(), /ya inicializado/);
  assert.equal(r.creates(), 1);
});
test('Adaptador rechaza planilla sin marca y sesión ajena sin escribir', () => {
  const r = runtime(); r.context.initializeNextTest(); const before = r.cells.length;
  r.metadata.length = 0;
  assert.throws(() => r.context.runNextTestSmoke(), /ajena/); assert.equal(r.cells.length, before);
  r.user('STRANGER'); assert.throws(() => r.context.runNextTestSmoke(), /autorizado/);
});
