// Pure domain module: shared by browser, local tests and the future TEST API.
const copy = value => JSON.parse(JSON.stringify(value));
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
export function instant(value) {
  requireValue(typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)), 'Fecha y hora requieren zona horaria');
  return Date.parse(value);
}
export const EVENT_LABELS = Object.freeze({
  INTUBATION: 'Intubación', EXTUBATION: 'Extubación', REINTUBATION: 'Reintubación',
  TRACHEOSTOMY: 'Traqueostomía', DECANNULATION: 'Decanulación',
  VM_START: 'Reconexión VM', VM_STOP: 'Desvinculación VM', SUPPORT: 'Cambio de soporte',
  PRONE: 'Prono', SUPINE: 'Supino', AET: 'Cambio AET', UPOT: 'Cambio UPOT',
  ISOLATION: 'Cambio de aislamiento', VALVE: 'Válvula de fonación vigente',
  IMT: 'Programa IMT', EMS: 'Programa EMS', PVE: 'Prueba de ventilación espontánea'
});
export const MEASUREMENTS = Object.freeze(['SAS', 'GCS', 'CAM-ICU', 'GSA', 'PIC', 'PPC', 'IMS', 'MRC', 'Prensión', 'FSS', 'CPAx', 'PIM', 'PEM', 'FEM', 'Ecografía', 'Deglución', 'BDT', 'Presión transtraqueal']);
// Ranges ported from the 7.04 form and EVAL_SERIE, not new clinical cutoffs.
export const MEASUREMENT_RANGES = Object.freeze({ SAS: [1, 7], IMS: [0, 10], MRC: [0, 60], FSS: [0, 35], CPAx: [0, 50] });
export const NUMERIC_MEASUREMENTS = Object.freeze({
  PIM: { unit: 'cmH₂O' }, PEM: { unit: 'cmH₂O' }, FEM: { unit: 'L/s' },
  Prensión: { unit: 'kg', min: 0 }, 'Presión transtraqueal': { unit: 'cmH₂O' }
});
export const GAS_FIELDS = Object.freeze([
  { key: 'ph', label: 'pH', unit: '' }, { key: 'pao2', label: 'PaO₂', unit: 'mmHg' },
  { key: 'paco2', label: 'PaCO₂', unit: 'mmHg' }, { key: 'hco3', label: 'HCO₃⁻', unit: 'mEq/L' },
  { key: 'eb', label: 'EB', unit: '' }, { key: 'lactate', label: 'Lactato', unit: 'mmol/L' },
  { key: 'sao2', label: 'SaO₂', unit: '%', min: 0, max: 100 }, { key: 'fio2', label: 'FiO₂ al momento', unit: '%', min: 0, max: 100 }
]);
function decimal(value, label) {
  const text = String(value ?? '').trim().replace(',', '.');
  requireValue(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) && Number.isFinite(Number(text)), `Ingresa un valor numérico válido: ${label}`);
  return Number(text);
}
function structuredValues(input, fields) {
  requireValue(input && typeof input === 'object' && !Array.isArray(input), 'Campos estructurados inválidos');
  requireValue(Object.keys(input).every(key => fields.some(field => field.key === key)), 'Campo desconocido');
  return Object.fromEntries(fields.map(field => {
    const raw = input[field.key];
    if (raw === undefined || raw === null || String(raw).trim() === '') return [field.key, null];
    if (field.text) return [field.key, String(raw).trim()];
    const value = decimal(raw, field.label);
    requireValue((field.min === undefined || value >= field.min) && (field.max === undefined || value <= field.max), `${field.label}: valor fuera de rango`);
    requireValue(!field.integer || Number.isInteger(value), `${field.label}: requiere entero`);
    return [field.key, value];
  }));
}
function describeValues(values, fields) {
  return fields.filter(field => values[field.key] !== null && values[field.key] !== undefined).map(field => `${field.label}: ${values[field.key]}${field.unit ? ' ' + field.unit : ''}`).join('; ');
}
export const SCALE_COMPONENTS = Object.freeze({
  MRC: ['Abducción de hombro', 'Flexión de codo', 'Extensión de muñeca', 'Flexión de cadera', 'Extensión de rodilla', 'Dorsiflexión de tobillo'].flatMap((label, i) => [{ key: `D${i + 1}`, label: `${label} derecho` }, { key: `I${i + 1}`, label: `${label} izquierdo` }]),
  FSS: ['Giro', 'Supino a sedente', 'Sedente borde cama', 'Sedente a bípedo', 'Marcha'].map((label, i) => ({ key: `item${i + 1}`, label })),
  CPAx: ['Función respiratoria', 'Tos', 'Movilidad en cama (girar)', 'Supino a sedente', 'Equilibrio sedente dinámico', 'Equilibrio bípedo', 'Sedente a bípedo', 'Transferencia cama a sillón', 'Marcha en el lugar', 'Prensión (% del predicho)'].map((label, i) => ({ key: `item${i + 1}`, label }))
});
export function measurementValue(command) {
  if (command.format === 'gsa-v1') {
    requireValue(command.kind === 'GSA', 'Formato GSA incompatible');
    const components = structuredValues(command.components, GAS_FIELDS);
    requireValue(Object.values(components).some(value => value !== null), 'Registra al menos un resultado de gases');
    return { value: describeValues(components, GAS_FIELDS), unit: '', components, format: 'gsa-v1' };
  }
  if (command.format === 'numeric-v1') {
    const spec = NUMERIC_MEASUREMENTS[command.kind];
    requireValue(spec, 'Medición numérica no permitida');
    const text = String(command.value ?? '').trim().replace(',', '.');
    requireValue(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) && Number.isFinite(Number(text)), 'Ingresa un valor numérico válido');
    requireValue(spec.min === undefined || Number(text) >= spec.min, `El valor mínimo es ${spec.min}`);
    return { value: String(Number(text)), unit: spec.unit, components: null, format: 'numeric-v1' };
  }
  if (SCALE_COMPONENTS[command.kind] && command.components) {
    const spec = SCALE_COMPONENTS[command.kind];
    const components = {};
    const max = command.kind === 'FSS' ? 7 : 5;
    requireValue(Object.keys(command.components).length === spec.length, 'Componentes incompletos o desconocidos');
    for (const { key } of spec) {
      const value = String(command.components[key] ?? '');
      requireValue((command.kind === 'FSS' && value === 'NE') || (/^[0-7]$/.test(value) && Number(value) <= max), `Completa ${command.kind}: ${key}`);
      components[key] = value;
    }
    const values = Object.values(components);
    const ne = values.filter(value => value === 'NE').length;
    const sum = values.filter(value => value !== 'NE').reduce((total, value) => total + Number(value), 0);
    const total = ne > 2 ? null : Math.round(sum + (ne ? ne * sum / (values.length - ne) : 0));
    return { value: total === null ? 'NE' : String(total), unit: total === null ? '' : 'puntos', components,
      calculation: { method: ne > 2 ? 'no-calculable' : ne ? 'promedio-imputado-legacy-7.04' : 'suma', notEvaluable: ne, rawSum: sum } };
  }
  if (command.kind === 'GCS') {
    const components = command.components || {};
    const valid = (value, max) => /^(?:[1-9])$/.test(String(value)) && Number(value) <= max;
    requireValue(valid(components.ocular, 4) && valid(components.motor, 6) && (components.verbal === '1T' || valid(components.verbal, 5)), 'GCS requiere ocular 1–4, verbal 1–5 o 1T y motor 1–6');
    const total = Number(components.ocular) + (components.verbal === '1T' ? 1 : Number(components.verbal)) + Number(components.motor);
    return { value: `${total}${components.verbal === '1T' ? 'T' : ''}`, unit: 'puntos', components: copy(components) };
  }
  requireValue(nonempty(command.value), 'Medición y valor requeridos');
  const value = command.value.trim();
  if (MEASUREMENT_RANGES[command.kind]) {
    if (command.kind === 'FSS' && value === 'NE') return { value, unit: '', components: null };
    const [min, max] = MEASUREMENT_RANGES[command.kind];
    requireValue(/^\d+$/.test(value) && Number(value) >= min && Number(value) <= max, `${command.kind} requiere un entero entre ${min} y ${max}${command.kind === 'FSS' ? ' o NE' : ''}`);
    return { value: String(Number(value)), unit: 'puntos', components: null };
  }
  return { value, unit: String(command.unit || '').trim(), components: null };
}
export const ACTIVITIES = Object.freeze(['KTR', 'KTM', 'Válvula de fonación', 'IMT', 'EMS', 'Educación', 'Inhaloterapia', 'Procedimiento']);
export const SESSION_FIELDS = Object.freeze({
  KTM: [{ key: 'level', label: 'Nivel realizado', text: true }, { key: 'assistance', label: 'Asistencia', text: true }, { key: 'minutes', label: 'Tiempo', unit: 'min', min: 1, max: 120, integer: true }, { key: 'borg', label: 'Borg', min: 0, max: 10 }],
  IMT: [{ key: 'sets', label: 'Frecuencia', unit: 'series', min: 1, max: 20, integer: true }, { key: 'intensity', label: 'Intensidad', unit: '% PiMáx', min: 1, max: 100 }, { key: 'minutes', label: 'Tiempo', unit: 'min', min: 1, max: 60, integer: true }, { key: 'rest', label: 'Descanso entre series', unit: 'seg', min: 1, max: 300, integer: true }],
  EMS: [{ key: 'frequency', label: 'Frecuencia', unit: 'Hz', min: 1, max: 200 }, { key: 'intensity', label: 'Intensidad', unit: 'mA', min: 1, max: 150 }, { key: 'pulse', label: 'Ancho de pulso', unit: 'µs', min: 50, max: 1000 }, { key: 'minutes', label: 'Tiempo', unit: 'min', min: 1, max: 120, integer: true }, { key: 'muscles', label: 'Grupo muscular', text: true }]
});
export function sessionDetails(command) {
  if (!command.format) return {};
  requireValue(command.format === 'session-v1', 'Formato de sesión inválido');
  const fields = SESSION_FIELDS[command.kind] || [];
  const parameters = structuredValues(command.parameters || {}, fields);
  requireValue(command.status === 'Realizada' || Object.values(parameters).every(value => value === null), 'Una sesión no realizada no admite parámetros de ejecución');
  const techniques = command.techniques || [];
  requireValue(Array.isArray(techniques) && techniques.length <= 30 && techniques.every(nonempty), 'Técnicas inválidas');
  requireValue(command.kind === 'KTR' || techniques.length === 0, 'Técnicas agrupadas solo en atención KTR');
  requireValue(command.status === 'Realizada' || techniques.length === 0, 'Una atención no realizada no admite técnicas ejecutadas');
  return { format: 'session-v1', parameters, techniques: techniques.map(text => text.trim()) };
}
const SUPPORTS = ['VM', 'VNI', 'CNAF', 'Oxigenoterapia', 'Ambiente'];
function compatible(state) {
  requireValue(['Natural', 'TOT', 'TQT'].includes(state.airway), 'Vía aérea no válida');
  requireValue(SUPPORTS.includes(state.support), 'Soporte no válido');
  requireValue(state.support !== 'VM' || ['TOT', 'TQT'].includes(state.airway), 'VM requiere TOT o TQT');
  requireValue(state.support !== 'VNI' || state.airway === 'Natural', 'VNI requiere vía aérea natural');
  requireValue(!state.valve || (state.airway === 'TQT' && state.support !== 'VM'), 'Válvula vigente requiere TQT sin VM en este prototipo');
}
export function currentState(episode, asOf) {
  const end = asOf ? instant(asOf) : Infinity;
  const state = { airway: episode.initial.airway, support: episode.initial.support, position: 'Supino', aet: null, upot: null, isolation: null, valve: false, imt: null, ems: null };
  compatible(state);
  for (const event of episode.events.filter(event => instant(event.at) <= end)) {
    const data = event.data;
    switch (event.type) {
      case 'INTUBATION': case 'REINTUBATION':
        requireValue(state.airway === 'Natural', 'Intubación requiere vía aérea natural');
        if (event.type === 'REINTUBATION') requireValue(episode.events.some(old => old.type === 'EXTUBATION' && instant(old.at) <= instant(event.at) && old.id !== event.id), 'Reintubación requiere extubación previa');
        state.airway = 'TOT'; state.support = 'VM'; break;
      case 'EXTUBATION':
        requireValue(state.airway === 'TOT', 'Extubación requiere TOT');
        state.airway = 'Natural'; state.support = data.support; break;
      case 'TRACHEOSTOMY':
        requireValue(state.airway !== 'TQT', 'El episodio ya tiene TQT');
        state.airway = 'TQT'; state.support = data.support; break;
      case 'DECANNULATION':
        requireValue(state.airway === 'TQT', 'Decanulación requiere TQT');
        state.airway = 'Natural'; state.valve = false; state.support = data.support; break;
      case 'VM_START':
        requireValue(state.support !== 'VM', 'VM ya está activa'); state.support = 'VM'; break;
      case 'VM_STOP':
        requireValue(state.support === 'VM', 'VM no está activa');
        requireValue(data.support !== 'VM', 'Selecciona soporte posterior sin VM'); state.support = data.support; break;
      case 'SUPPORT': state.support = data.support; break;
      case 'PRONE': requireValue(state.position !== 'Prono', 'El episodio ya está en prono'); state.position = 'Prono'; break;
      case 'SUPINE': requireValue(state.position !== 'Supino', 'El episodio ya está en supino'); state.position = 'Supino'; break;
      case 'PVE': requireValue(['Superada', 'Fracasada', 'No evaluable'].includes(data.result), 'Resultado PVE requerido'); break;
      case 'AET': case 'UPOT': case 'ISOLATION': case 'IMT': case 'EMS':
        requireValue(typeof data.active === 'boolean' && nonempty(data.detail), 'Indica estado y detalle del cambio');
        state[event.type.toLowerCase()] = data.active ? data.detail.trim() : null; break;
      case 'VALVE':
        requireValue(typeof data.active === 'boolean', 'Indica estado de la válvula'); state.valve = data.active; break;
      default: throw new Error('Evento no permitido');
    }
    compatible(state);
  }
  return state;
}
export function durations(episode, at) {
  const end = Math.min(instant(at), episode.dischargedAt ? instant(episode.dischargedAt) : Infinity);
  let start = instant(episode.admittedAt);
  requireValue(end >= start, 'El corte no puede preceder al ingreso');
  const hours = { VM: 0, VNI: 0, TOT: 0, TQT: 0 };
  let state = currentState({ ...episode, events: [] });
  const done = [];
  const add = stop => {
    const elapsed = (stop - start) / 3600000;
    for (const kind of Object.keys(hours)) if (state.airway === kind || state.support === kind) hours[kind] += elapsed;
    start = stop;
  };
  for (const event of episode.events) {
    if (instant(event.at) > end) break;
    add(instant(event.at)); done.push(event); state = currentState({ ...episode, events: done });
  }
  add(end);
  return { hours, completedDays: Object.fromEntries(Object.entries(hours).map(([key, value]) => [key, Math.floor(value / 24)])), reintubations: episode.events.filter(e => e.type === 'REINTUBATION' && instant(e.at) <= end).length };
}
export function createEpisode({ id, personId, alias, bed, at, airway = 'Natural', support = 'Ambiente' }) {
  requireValue([id, personId, alias].every(nonempty), 'Identidad, episodio y alias requeridos');
  instant(at); requireValue(Number.isInteger(bed) && bed >= 1 && bed <= 18, 'Cama fuera de rango');
  compatible({ airway, support, valve: false });
  return { id, personId, alias, bed, admittedAt: at, dischargedAt: null, initial: { airway, support }, revision: 0, events: [], turns: [], measurements: [], activities: [], pending: [], cultures: [], audit: [] };
}
export function applyCommand(original, command, context) {
  const episode = copy(original);
  const { id, author, now } = context;
  requireValue(nonempty(id) && nonempty(author), 'Autor e identificador requeridos'); instant(now);
  requireValue(!episode.dischargedAt || command.type === 'ADDENDUM', 'Episodio egresado: solo admite adendas');
  const at = command.at || now;
  requireValue(instant(at) >= instant(episode.admittedAt) && instant(at) <= instant(now), 'Momento fuera del episodio o futuro');
  const entry = { id, at, author, recordedAt: now };
  const turn = () => { const value = episode.turns.find(item => item.id === command.turnId); requireValue(value, 'Turno no encontrado'); return value; };
  const editable = () => { const value = turn(); requireValue(!value.signedAt, 'Turno firmado: usa una adenda'); requireValue(instant(at) >= instant(value.openedAt), 'Registro anterior al turno'); return value; };
  switch (command.type) {
    case 'MOVE': requireValue(Number.isInteger(command.bed) && command.bed >= 1 && command.bed <= 18, 'Cama fuera de rango'); episode.bed = command.bed; break;
    case 'DISCHARGE':
      requireValue(episode.turns.every(t => t.signedAt), 'Firma los turnos abiertos antes del egreso');
      requireValue(!episode.events.length || instant(at) >= instant(episode.events.at(-1).at), 'Egreso anterior al último evento');
      requireValue(at === now, 'Egreso retroactivo pendiente de validación'); episode.dischargedAt = at; episode.bed = null; break;
    case 'OPEN_TURN':
      requireValue(!episode.turns.some(t => !t.signedAt), 'Ya existe un turno abierto');
      requireValue(at === now, 'Apertura retroactiva pendiente de validación');
      episode.turns.push({ ...entry, openedAt: at, note: '', plan: '', signedAt: null, addenda: [] }); break;
    case 'DRAFT': { const value = editable(); requireValue(typeof command.note === 'string' && typeof command.plan === 'string', 'Nota y plan inválidos'); value.note = command.note.trim(); value.plan = command.plan.trim(); break; }
    case 'SIGN': { const value = editable(); requireValue(at === now, 'Firma retroactiva no permitida'); value.signedAt = now; value.signedBy = author; value.snapshot = narrative(episode, value.id); break; }
    case 'ADDENDUM': { const value = turn(); requireValue(value.signedAt && nonempty(command.reason) && nonempty(command.text), 'Adenda requiere turno firmado, motivo y texto'); value.addenda.push({ ...entry, reason: command.reason.trim(), text: command.text.trim() }); break; }
    case 'EVENT': {
      editable(); requireValue(EVENT_LABELS[command.eventType], 'Evento no permitido');
      requireValue(nonempty(command.reason), 'Motivo requerido');
      requireValue(!episode.events.length || instant(at) >= instant(episode.events.at(-1).at), 'Evento retroactivo anterior al último: requiere conciliación');
      episode.events.push({ ...entry, turnId: command.turnId, type: command.eventType, data: copy(command.data || {}), reason: command.reason.trim() });
      currentState(episode); break;
    }
    case 'MEASUREMENT':
      editable(); requireValue(MEASUREMENTS.includes(command.kind), 'Medición no permitida');
      episode.measurements.push({ ...entry, turnId: command.turnId, kind: command.kind, ...measurementValue(command) }); break;
    case 'ACTIVITY':
      editable(); requireValue(ACTIVITIES.includes(command.kind), 'Actividad no permitida');
      requireValue(nonempty(command.detail), 'Describe la atención o sesión');
      requireValue(['Realizada', 'Contraindicada', 'No realizada'].includes(command.status), 'Estado de actividad requerido');
      episode.activities.push({ ...entry, turnId: command.turnId, kind: command.kind, status: command.status, detail: command.detail.trim(), ...sessionDetails(command) }); break;
    case 'PENDING':
      editable(); requireValue(nonempty(command.text), 'Describe el pendiente');
      episode.pending.push({ ...entry, turnId: command.turnId, text: command.text.trim(), status: 'Abierto', changes: [] }); break;
    case 'RESOLVE_PENDING': {
      editable(); const value = episode.pending.find(p => p.id === command.pendingId);
      requireValue(value && value.status === 'Abierto', 'Pendiente no encontrado o ya cerrado');
      requireValue(['Resuelto', 'Cancelado'].includes(command.status) && nonempty(command.reason), 'Estado y motivo requeridos');
      value.status = command.status; value.changes.push({ ...entry, turnId: command.turnId, status: command.status, reason: command.reason.trim() }); break;
    }
    case 'CULTURE':
      editable(); requireValue(nonempty(command.sample), 'Describe la muestra');
      episode.cultures.push({ ...entry, turnId: command.turnId, sample: command.sample.trim(), result: null }); break;
    case 'CULTURE_RESULT': {
      editable(); const value = episode.cultures.find(c => c.id === command.cultureId);
      requireValue(value && !value.result, 'Muestra no encontrada o ya informada');
      requireValue(nonempty(command.text) && instant(at) >= instant(value.at), 'Resultado y momento válidos requeridos');
      value.result = { ...entry, turnId: command.turnId, text: command.text.trim() }; break;
    }
    default: throw new Error('Operación no permitida');
  }
  episode.revision++;
  episode.audit.push({ ...entry, operation: command.type, revision: episode.revision, turnId: command.turnId || null });
  return episode;
}
export function narrative(episode, turnId) {
  const turn = episode.turns.find(t => t.id === turnId);
  requireValue(turn, 'Turno no encontrado');
  if (turn.snapshot) return turn.snapshot;
  const lines = [`Episodio ${episode.id}. Turno abierto ${turn.openedAt}.`];
  const state = currentState(episode, turn.signedAt || undefined);
  lines.push(`Estado vigente (no implica reevaluación): ${state.airway} / ${state.support}; ${state.position}.`);
  for (const item of episode.events.filter(e => e.turnId === turnId)) {
    const fields = [];
    if (['EXTUBATION', 'TRACHEOSTOMY', 'DECANNULATION', 'VM_STOP', 'SUPPORT'].includes(item.type)) fields.push(`Soporte posterior: ${item.data.support}`);
    if (item.type === 'PVE') fields.push(`Resultado: ${item.data.result}`);
    if (['AET', 'UPOT', 'ISOLATION', 'IMT', 'EMS', 'VALVE'].includes(item.type)) fields.push(`${item.data.active ? 'Activo' : 'Suspendido'}${item.data.detail ? ': ' + item.data.detail : ''}`);
    lines.push(`${item.at}: ${EVENT_LABELS[item.type]}. ${item.reason}. ${fields.join('. ')}`);
  }
  for (const item of episode.measurements.filter(e => e.turnId === turnId)) {
    lines.push(`${item.at}: ${item.kind}: ${item.value} ${item.unit}.`);
    if (item.components && SCALE_COMPONENTS[item.kind]) lines.push(SCALE_COMPONENTS[item.kind].map(({ key, label }) => `${label}: ${item.components[key]}`).join('; ') + '.');
    if (item.calculation?.notEvaluable) lines.push(`Ítems NE: ${item.calculation.notEvaluable}. ${item.calculation.method === 'no-calculable' ? 'Total no calculable.' : 'Total con imputación por promedio y redondeo según legacy 7.04.'}`);
  }
  for (const item of episode.activities.filter(e => e.turnId === turnId)) {
    lines.push(`${item.at}: ${item.kind} — ${item.status}: ${item.detail}.`);
    if (item.techniques?.length) lines.push(`Técnicas de la misma atención: ${item.techniques.join('; ')}.`);
    if (item.parameters) { const details = describeValues(item.parameters, SESSION_FIELDS[item.kind] || []); if (details) lines.push(details + '.'); }
  }
  for (const item of episode.pending.filter(e => e.turnId === turnId)) lines.push(`${item.at}: Pendiente creado: ${item.text}.`);
  for (const item of episode.cultures) {
    if (item.turnId === turnId) lines.push(`${item.at}: Toma de cultivo: ${item.sample}.`);
    if (item.result?.turnId === turnId) lines.push(`${item.result.at}: Resultado del cultivo ${item.sample}: ${item.result.text}.`);
  }
  if (turn.note) lines.push(`Nota: ${turn.note}`);
  if (turn.plan) lines.push(`Plan: ${turn.plan}`);
  return lines.join('\n');
}
export function handover(episode) {
  const state = currentState(episode);
  const last = episode.turns.at(-1);
  return { episodeId: episode.id, bed: episode.bed, state, pending: episode.pending.filter(p => p.status === 'Abierto'), plan: last?.plan || '', planAt: last?.openedAt || null };
}
