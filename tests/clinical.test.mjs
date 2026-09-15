import test from 'node:test';
import assert from 'node:assert/strict';
import { ClinicalRepository } from '../app/src/repositories/clinical-repository.js';
import { currentState, durations, narrative, handover } from '../app/src/model/clinical-record.js';
function scenario(initial = {}) {
  let now = '2026-09-15T08:00:00-03:00', next = 0;
  const repo = new ClinicalRepository({ now: () => now, id: () => `ID-${++next}` });
  const episode = repo.admit({ id: 'E1', personId: 'P1', alias: 'Persona sintética', bed: 1, ...initial });
  let turnId;
  const act = (type, data = {}, overrides = {}) => {
    const result = repo.execute('E1', { type, turnId, ...data }, { revision: repo.get('E1').revision, requestId: `REQ-${++next}`, author: 'TEST', ...overrides });
    if (type === 'OPEN_TURN') turnId = result.turns.at(-1).id;
    return result;
  };
  return { repo, episode, act, now: value => { now = value; }, get: () => repo.get('E1') };
}
test('Traslado conserva identidad e historia; ocupación duplicada se rechaza', () => {
  const s = scenario(); s.act('OPEN_TURN'); s.act('DRAFT', { note: 'Nota A', plan: 'Plan A' });
  s.repo.admit({ id: 'E2', personId: 'P2', alias: 'Prueba B', bed: 2 });
  assert.throws(() => s.act('MOVE', { bed: 2 }), /ocupada/);
  const result = s.act('MOVE', { bed: 3 }); assert.equal(result.id, 'E1'); assert.equal(result.turns[0].note, 'Nota A');
  assert.equal(s.repo.get('E2').bed, 2);
});
test('Egreso y reingreso de una persona preservan episodios separados', () => {
  const s = scenario(); s.act('OPEN_TURN'); assert.throws(() => s.act('DISCHARGE'), /Firma/);
  s.act('SIGN'); s.act('DISCHARGE');
  s.repo.admit({ id: 'E2', personId: 'P1', alias: 'Reingreso sintético', bed: 1 });
  assert.equal(s.repo.get('E2').turns.length, 0); assert.ok(s.get().dischargedAt);
  assert.throws(() => s.act('OPEN_TURN'), /egresado/);
});
test('Firma inmutable, adenda trazable y referencia previa sin heredar nota', () => {
  const s = scenario(); s.act('OPEN_TURN'); s.act('DRAFT', { note: 'Nota original', plan: 'Plan' }); s.act('SIGN');
  const original = narrative(s.get(), s.get().turns[0].id);
  assert.throws(() => s.act('DRAFT', { note: 'Cambio', plan: '' }), /firmado/);
  assert.throws(() => s.act('MEASUREMENT', { kind: 'GCS', value: '15' }), /firmado/);
  s.act('ADDENDUM', { reason: 'Corrección', text: 'Aclaración posterior' });
  assert.equal(narrative(s.get(), s.get().turns[0].id), original);
  assert.equal(s.get().turns[0].addenda.length, 1);
  s.act('OPEN_TURN'); assert.equal(s.get().turns[1].note, '');
});
test('VM suma intervalos; PVE superada no extuba; VNI no suma VM', () => {
  const s = scenario(); s.act('OPEN_TURN');
  s.act('EVENT', { eventType: 'INTUBATION', reason: 'Prueba' });
  s.now('2026-09-16T08:00:00-03:00');
  s.act('EVENT', { eventType: 'PVE', reason: 'Prueba', data: { result: 'Superada' } });
  assert.equal(currentState(s.get()).airway, 'TOT');
  s.act('EVENT', { eventType: 'EXTUBATION', reason: 'Prueba', data: { support: 'VNI' } });
  s.now('2026-09-16T20:00:00-03:00'); s.act('EVENT', { eventType: 'REINTUBATION', reason: 'Prueba' });
  s.now('2026-09-17T08:00:00-03:00');
  const clocks = durations(s.get(), '2026-09-17T08:00:00-03:00');
  assert.equal(clocks.hours.VM, 36); assert.equal(clocks.hours.VNI, 12); assert.equal(clocks.reintubations, 1);
  assert.equal(clocks.completedDays.VM, 1);
});
test('Error de transición no cambia datos ni auditoría', () => {
  const s = scenario(); s.act('OPEN_TURN'); const before = s.get();
  assert.throws(() => s.act('EVENT', { eventType: 'VM_START', reason: 'Inválido' }), /requiere/);
  assert.deepEqual(s.get(), before);
  assert.throws(() => s.act('EVENT', { eventType: 'REINTUBATION', reason: 'Inválido' }), /previa/);
});
test('Válvula terapéutica y vigente son registros diferentes; decanulación cierra estado', () => {
  const s = scenario({ airway: 'TQT', support: 'Ambiente' }); s.act('OPEN_TURN');
  s.act('ACTIVITY', { kind: 'Válvula de fonación', status: 'Realizada', detail: 'Sesión sintética 10 min' });
  assert.equal(currentState(s.get()).valve, false);
  s.act('EVENT', { eventType: 'VALVE', data: { active: true }, reason: 'Prueba' });
  assert.equal(currentState(s.get()).valve, true);
  s.act('EVENT', { eventType: 'DECANNULATION', data: { support: 'Ambiente' }, reason: 'Prueba' });
  assert.equal(currentState(s.get()).valve, false); assert.equal(s.get().activities.length, 1);
});
test('Estados persistentes sobreviven a firma y suspensión conserva historia', () => {
  for (const [type, key] of [['AET', 'aet'], ['UPOT', 'upot'], ['ISOLATION', 'isolation'], ['IMT', 'imt'], ['EMS', 'ems']]) {
    const s = scenario(); s.act('OPEN_TURN');
    s.act('EVENT', { eventType: type, data: { active: true, detail: 'Detalle sintético' }, reason: 'Prueba' });
    s.act('SIGN'); s.act('OPEN_TURN'); assert.equal(currentState(s.get())[key], 'Detalle sintético');
    assert.equal(s.get().activities.length, 0);
    s.act('EVENT', { eventType: type, data: { active: false, detail: 'Suspensión' }, reason: 'Prueba' });
    assert.equal(currentState(s.get())[key], null); assert.equal(s.get().events.length, 2);
  }
});
test('Dos gases y evaluaciones conservan cada medición; una KTR no cuenta técnicas', () => {
  const s = scenario(); s.act('OPEN_TURN');
  for (const kind of ['GSA', 'GSA', 'IMS', 'IMS']) s.act('MEASUREMENT', { kind, value: kind === 'IMS' ? '3' : 'Resultado sintético', unit: 'Prueba' });
  s.act('ACTIVITY', { kind: 'KTR', status: 'Realizada', detail: 'Técnica A y técnica B' });
  for (const detail of ['Sesión 1', 'Sesión 2']) s.act('ACTIVITY', { kind: 'KTM', status: 'Realizada', detail });
  assert.equal(s.get().measurements.length, 4); assert.equal(s.get().activities.filter(a => a.kind === 'KTR').length, 1);
  assert.equal(s.get().activities.filter(a => a.kind === 'KTM').length, 2);
});
test('Pendientes y cultivos cruzan turnos y sus cierres no editan firma anterior', () => {
  const s = scenario(); s.act('OPEN_TURN'); s.act('PENDING', { text: 'Revisar' }); s.act('CULTURE', { sample: 'Muestra TEST' });
  s.act('SIGN'); s.act('OPEN_TURN'); assert.equal(handover(s.get()).pending.length, 1);
  s.act('RESOLVE_PENDING', { pendingId: s.get().pending[0].id, status: 'Resuelto', reason: 'Completado' });
  s.act('CULTURE_RESULT', { cultureId: s.get().cultures[0].id, text: 'Resultado TEST' });
  assert.equal(handover(s.get()).pending.length, 0); assert.equal(s.get().cultures.length, 1);
  assert.equal(s.get().cultures[0].result.text, 'Resultado TEST');
  assert.throws(() => s.act('CULTURE_RESULT', { cultureId: s.get().cultures[0].id, text: 'Otro' }), /informada/);
});
test('Concurrencia e idempotencia: un reintento no duplica y cambios de contenido se rechazan', () => {
  const s = scenario(); const command = { type: 'OPEN_TURN' }; const opts = { revision: 0, requestId: 'stable', author: 'TEST' };
  const first = s.repo.execute('E1', command, opts);
  assert.deepEqual(s.repo.execute('E1', command, opts), first); assert.equal(s.get().turns.length, 1);
  assert.throws(() => s.repo.execute('E1', { type: 'MOVE', bed: 2 }, opts), /reutilizado/);
  assert.throws(() => s.repo.execute('E1', { type: 'MOVE', bed: 2 }, { ...opts, requestId: 'new' }), /cambió/);
});
test('Lecturas y resultados no permiten mutación externa del repositorio', () => {
  const s = scenario(); s.get().alias = 'Alterado'; s.repo.list()[0].events.push({});
  assert.equal(s.get().alias, 'Persona sintética'); assert.equal(s.get().events.length, 0);
});
test('Fechas ambiguas, futuras y eventos retroactivos fuera de secuencia se rechazan', () => {
  assert.throws(() => scenario({ at: '2026-09-15 08:00' }), /zona/);
  const s = scenario(); s.act('OPEN_TURN'); s.now('2026-09-15T10:00:00-03:00');
  s.act('EVENT', { eventType: 'INTUBATION', reason: 'Prueba' });
  assert.throws(() => s.act('EVENT', { at: '2026-09-15T09:00:00-03:00', eventType: 'EXTUBATION', reason: 'Prueba', data: { support: 'Ambiente' } }), /retroactivo/);
  assert.throws(() => s.act('MEASUREMENT', { at: '2026-09-16T09:00:00-03:00', kind: 'IMS', value: '1' }), /futuro/);
});
test('Desconexión VM congela el reloj aunque permanezca TQT', () => {
  const s = scenario({ airway: 'TQT', support: 'VM' }); s.act('OPEN_TURN');
  s.now('2026-09-16T08:00:00-03:00'); s.act('EVENT', { eventType: 'VM_STOP', data: { support: 'Ambiente' }, reason: 'Prueba' });
  const clocks = durations(s.get(), '2026-09-17T08:00:00-03:00');
  assert.equal(clocks.hours.VM, 24); assert.equal(clocks.hours.TQT, 48);
});
test('Escalas validadas no aceptan texto, fuera de rango ni vacíos; cero no se pierde', () => {
  const s = scenario(); s.act('OPEN_TURN');
  for (const [kind, value] of [['SAS', '0'], ['MRC', '61'], ['FSS', '36'], ['CPAx', '51'], ['IMS', '11'], ['IMS', '2x'], ['IMS', '']]) {
    assert.throws(() => s.act('MEASUREMENT', { kind, value }));
  }
  s.act('MEASUREMENT', { kind: 'MRC', value: '0' });
  s.act('MEASUREMENT', { kind: 'FSS', value: 'NE' });
  assert.equal(s.get().measurements[0].value, '0'); assert.equal(s.get().measurements[1].value, 'NE');
});
test('GCS deriva total de componentes y conserva verbal 1T en la serie', () => {
  const s = scenario(); s.act('OPEN_TURN');
  s.act('MEASUREMENT', { kind: 'GCS', components: { ocular: '4', verbal: '1T', motor: '6' } });
  const value = s.get().measurements[0]; assert.equal(value.value, '11T'); assert.equal(value.components.verbal, '1T');
  assert.throws(() => s.act('MEASUREMENT', { kind: 'GCS', components: { ocular: '', verbal: '5', motor: '6' } }), /GCS requiere/);
});
