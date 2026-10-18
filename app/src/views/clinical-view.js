import { EVENT_LABELS, MEASUREMENTS, MEASUREMENT_RANGES, ACTIVITIES, SCALE_COMPONENTS, NUMERIC_MEASUREMENTS, GAS_FIELDS, SESSION_FIELDS, DAILY_FIELDS, DVA_UNITS, KTM_ASSESSMENT_FIELDS, describeHdn } from '../model/clinical-record.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const options = values => values.map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join('');
const field = (label, name, body = '') => `<label>${label}${body || `<input name="${name}" required>`}</label>`;
const select = (label, name, values) => field(label, name, `<select name="${name}">${options(values)}</select>`);
const form = (type, title, contents, submit = 'Registrar') => `<form data-command="${type}"><h3>${title}</h3>${contents}<button class="primary" type="submit">${submit}</button></form>`;
const stamp = value => new Date(value).toLocaleString('es-CL', { timeZone: 'America/Santiago' });
const dailyInput = (spec, prefix) => spec.text ? `<textarea aria-label="${esc(spec.label)}" name="${prefix}${spec.key}" rows="2"></textarea>` : `<input aria-label="${esc(spec.label)}" name="${prefix}${spec.key}" inputmode="decimal" placeholder="Sin registrar">`;
export function dailySheet(e, open) {
  const records = [...(e.dailyRecords || [])].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const cell = value => `<td>${esc(value == null || value === '' ? '—' : value)}</td>`;
  const headers = records.map(record => `<th scope="col">${stamp(record.at)}<small>${e.turns.find(t => t.id === record.turnId)?.signedAt ? 'Firmado' : 'Turno abierto'}</small></th>`).join('');
  const rows = DAILY_FIELDS.map(spec => `<tr><th scope="row">${esc(spec.label)}${spec.unit ? `<small>${esc(spec.unit)}</small>` : ''}</th>${records.map(record => cell(record.values[spec.key])).join('')}${open ? `<td class="daily-new">${dailyInput(spec, 'daily_')}</td>` : ''}</tr>`).join('');
  const dvaInputs = select('Estado HDN', 'hdn', ['', 'autosostenida', 'dva']).replace('>autosostenida<', '>HDN autosostenida<').replace('>dva<', '>HDN con DVA<') + Object.entries(DVA_UNITS).map(([drug, units]) => `<div class="dva-entry"><label>${drug}<input aria-label="Dosis ${drug}" name="dose_${drug}" inputmode="decimal" placeholder="Dosis"></label><label>Unidad ${drug}<select name="unit_${drug}">${options(['', ...units])}</select></label></div>`).join('');
  const hdnRow = `<tr><th scope="row">Hemodinamia / DVA</th>${records.map(record => cell(describeHdn(record))).join('')}${open ? `<td class="daily-new">${dvaInputs}</td>` : ''}</tr>`;
  const gasRows = GAS_FIELDS.map(spec => `<tr><th scope="row">${esc(spec.label)} <small>${esc(spec.unit)}</small></th>${records.map(record => cell(e.measurements.find(item => item.id === record.gasId)?.components?.[spec.key])).join('')}${open ? `<td class="daily-new">${dailyInput(spec, 'daily_gas_')}</td>` : ''}</tr>`).join('');
  const gasTime = `<tr><th scope="row">Hora de muestra GSA</th>${records.map(record => cell(record.gasId ? stamp(e.measurements.find(item => item.id === record.gasId).at) : null)).join('')}${open ? '<td class="daily-new"><input aria-label="Hora de muestra GSA" type="datetime-local" name="gasAt"></td>' : ''}</tr>`;
  const ktmRows = KTM_ASSESSMENT_FIELDS.map(spec => `<tr><th scope="row">${esc(spec.label)}</th>${records.map(record => cell(record.ktm[spec.key])).join('')}${open ? `<td class="daily-new">${dailyInput(spec, 'ktm_')}</td>` : ''}</tr>`).join('');
  const cols = 1 + records.length + (open ? 1 : 0);
  const section = title => `<tr class="daily-section"><th colspan="${cols}">${title}</th></tr>`;
  return `<section class="daily-sheet"><h3>Hoja del día · cambios clínicos</h3><p>Una columna por valoración. Auscultación y secreciones corresponden a esa hora. Talla y características iniciales del tubo pertenecen al ingreso.</p>${open ? '<form data-command="DAILY_ASSESSMENT">' : ''}<div class="daily-scroll"><table><caption>Historia de valoraciones · horas guardadas mostradas en Santiago</caption><thead><tr><th scope="col">Variable</th>${headers}${open ? `<th scope="col" class="daily-new">Nueva valoración<label>Hora opcional (vacío: al guardar)<input type="datetime-local" name="assessmentAt" step="1"></label><small>Entrada en zona del navegador: ${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)}</small></th>` : ''}</tr></thead><tbody>${section('Monitorización y observaciones')}${rows}${hdnRow}${section('GSA · resultado de una muestra, sin interpretación automática')}${gasTime}${gasRows}${section('Parámetros para KTM · no registra una sesión realizada')}${ktmRows}</tbody></table></div>${open ? '<p>Vacío = sin registrar en esta valoración. No modifica las columnas previas. Para DVA, selecciona la unidad de cada dosis.</p><button class="primary" type="submit">Guardar valoración</button></form>' : '<p>Abre un turno para agregar una valoración.</p>'}</section>`;
}
function measurementFields(kind) {
  if (kind === 'GSA') return '<p>Deja vacío lo no medido. Cada registro agrega una muestra a la serie.</p>' + GAS_FIELDS.map(({ key, label, unit }) => field(`${label}${unit ? ' (' + unit + ')' : ''}`, `gas_${key}`, `<input name="gas_${key}" inputmode="decimal">`)).join('');
  if (NUMERIC_MEASUREMENTS[kind]) return field(`Resultado (${NUMERIC_MEASUREMENTS[kind].unit})`, 'value', '<input name="value" inputmode="decimal" required>');
  if (SCALE_COMPONENTS[kind]) return '<p>Registrar todos los componentes. El total se calcula al guardar.</p>' + SCALE_COMPONENTS[kind].map(({ key, label }) => select(label, `component_${key}`, ['', ...Array.from({ length: kind === 'FSS' ? 8 : 6 }, (_, i) => String(i)), ...(kind === 'FSS' ? ['NE'] : [])])).join('') + (kind === 'FSS' ? '<p>NE no equivale a cero. Con hasta dos NE se aplica el promedio según legacy 7.04; con más de dos no se calcula total.</p>' : '');
  if (kind === 'GCS') return select('Respuesta ocular', 'ocular', ['', '1', '2', '3', '4']) + select('Respuesta verbal', 'verbal', ['', '1', '2', '3', '4', '5', '1T']) + select('Respuesta motora', 'motor', ['', '1', '2', '3', '4', '5', '6']);
  const range = MEASUREMENT_RANGES[kind];
  if (range) return field(`Resultado ${range[0]}–${range[1]}${kind === 'FSS' ? ' o NE' : ''}`, 'value');
  return field('Resultado de prueba (sin validación clínica)', 'value') + field('Unidad / contexto', 'unit', '<input name="unit">');
}
function activityFields(kind) {
  if (kind === 'KTR') return field('Técnicas de esta atención (una por línea)', 'techniques', '<textarea name="techniques"></textarea>');
  return (SESSION_FIELDS[kind] || []).map(spec => field(`${spec.label}${spec.unit ? ' (' + spec.unit + ')' : ''}`, `session_${spec.key}`, `<input name="session_${spec.key}"${spec.text ? '' : ' inputmode="decimal"'}>`)).join('');
}
export class ClinicalView {
  constructor(document) {
    this.document = document; this.dialog = document.querySelector('#patient-dialog'); this.tab = 'turno';
    document.querySelector('.close-button').onclick = () => { if (this.canLeave()) this.dialog.close(); };
    this.dialog.addEventListener('cancel', event => { if (!this.canLeave()) event.preventDefault(); });
    document.defaultView.addEventListener('beforeunload', event => { if (this.dirty) { event.preventDefault(); event.returnValue = ''; } });
    document.querySelector('.dialog-note').textContent = 'Simulación en memoria: los cambios se pierden al recargar. Horas mostradas en Santiago.';
    this.notice = document.createElement('p'); this.notice.className = 'feedback'; this.notice.setAttribute('role', 'status');
    document.querySelector('main').prepend(this.notice);
  }
  bind(actions) {
    this.actions = actions;
    const markDirty = event => { const form = event.target.closest('form'); if (form) { this.dirty = true; this.dirtyForms.add(form.dataset.command); } };
    this.document.querySelector('#dialog-body').addEventListener('input', markDirty);
    this.document.querySelector('#dialog-body').addEventListener('change', markDirty);
    this.document.querySelector('#dialog-body').addEventListener('change', event => {
      if (event.target.matches('form[data-command="MEASUREMENT"] select[name="kind"]')) this.document.querySelector('#measurement-fields').innerHTML = measurementFields(event.target.value);
      if (event.target.matches('form[data-command="ACTIVITY"] select[name="kind"]')) this.document.querySelector('#activity-fields').innerHTML = activityFields(event.target.value);
    });
    this.document.querySelector('#bed-board').addEventListener('click', event => {
      const button = event.target.closest('button'); if (!button) return;
      if (button.dataset.episode) { this.tab = 'turno'; actions.open(button.dataset.episode); }
      if (button.dataset.admit) actions.admit(Number(button.dataset.admit));
    });
    this.document.querySelector('#dialog-body').addEventListener('click', async event => {
      if (event.target.closest('[data-copy-alma]')) {
        if (!this.canLeave()) return;
        const text = this.document.querySelector('[aria-label="Texto para ALMA"]');
        try { await this.document.defaultView.navigator.clipboard.writeText(text.value); this.message('Texto copiado. Pégalo y revísalo en ALMA.'); }
        catch { text.focus(); text.select(); this.message('Texto seleccionado: usa Ctrl+C para copiar.'); }
        return;
      }
      if (event.target.closest('[data-discard]')) { this.dirty = false; this.record(this.current); return; }
      const button = event.target.closest('[data-tab]'); if (!button || !this.canLeave()) return;
      this.tab = button.dataset.tab; this.record(this.current);
    });
    this.document.querySelector('#dialog-body').addEventListener('submit', event => {
      event.preventDefault(); const form = event.target;
      if ([...this.dirtyForms].some(type => type !== form.dataset.command)) { this.message('Guarda o descarta primero los cambios del otro formulario.', true); return; }
      const data = Object.fromEntries(new FormData(form));
      const command = { ...data, type: form.dataset.command, turnId: data.turnId || this.current.episode.turns.find(t => !t.signedAt)?.id };
      if (command.type === 'DAILY_ASSESSMENT') {
        if (data.assessmentAt) {
          const at = new Date(data.assessmentAt);
          if (!Number.isFinite(at.getTime())) { this.message('Indica fecha y hora válida.', true); return; }
          command.at = at.toISOString();
        }
        command.format = 'daily-v1';
        command.values = Object.fromEntries(DAILY_FIELDS.map(({ key }) => [key, data[`daily_${key}`]]));
        command.ktm = Object.fromEntries(KTM_ASSESSMENT_FIELDS.map(({ key }) => [key, data[`ktm_${key}`]]));
        command.dva = Object.keys(DVA_UNITS).filter(drug => data[`dose_${drug}`]?.trim() || data[`unit_${drug}`]).map(drug => ({ drug, dose: data[`dose_${drug}`], unit: data[`unit_${drug}`] }));
        const components = Object.fromEntries(GAS_FIELDS.map(({ key }) => [key, data[`daily_gas_${key}`]]));
        if (Object.values(components).some(value => value?.trim()) || data.gasAt) {
          const gasAt = new Date(data.gasAt);
          if (!Number.isFinite(gasAt.getTime())) { this.message('Indica la fecha y hora de la muestra GSA.', true); return; }
          command.gas = { at: gasAt.toISOString(), components };
        }
      }
      if (data.bed) command.bed = Number(data.bed);
      if (command.type === 'MEASUREMENT' && data.kind === 'GCS') command.components = { ocular: data.ocular, verbal: data.verbal, motor: data.motor };
      if (command.type === 'MEASUREMENT' && SCALE_COMPONENTS[data.kind]) command.components = Object.fromEntries(SCALE_COMPONENTS[data.kind].map(({ key }) => [key, data[`component_${key}`]]));
      if (command.type === 'MEASUREMENT' && NUMERIC_MEASUREMENTS[data.kind]) command.format = 'numeric-v1';
      if (command.type === 'MEASUREMENT' && data.kind === 'GSA') { command.format = 'gsa-v1'; command.components = Object.fromEntries(GAS_FIELDS.map(({ key }) => [key, data[`gas_${key}`]])); }
      if (command.type === 'ACTIVITY') {
        command.format = 'session-v1'; command.parameters = Object.fromEntries((SESSION_FIELDS[data.kind] || []).map(({ key }) => [key, data[`session_${key}`]]));
        command.techniques = data.kind === 'KTR' ? (data.techniques || '').split('\n').map(text => text.trim()).filter(Boolean) : [];
      }
      if (command.type === 'EVENT') command.data = { support: data.support, result: data.result, active: data.active === 'true', detail: data.detail };
      actions.command(command);
    });
  }
  canLeave() { if (this.dirty) { this.message('Hay cambios sin registrar. Guarda el formulario o pulsa «Descartar formulario».', true); return false; } return true; }
  setBusy(busy) {
    this.document.querySelectorAll('button, input, select, textarea').forEach(element => {
      if (busy) { element.dataset.wasDisabled = String(element.disabled); element.disabled = true; }
      else if ('wasDisabled' in element.dataset) { element.disabled = element.dataset.wasDisabled === 'true'; delete element.dataset.wasDisabled; }
    });
    this.document.querySelector('main').setAttribute('aria-busy', String(busy));
  }
  message(text, error = false) {
    this.notice.textContent = text; this.notice.classList.toggle('error', error);
    const local = this.document.querySelector('#record-feedback'); if (local) { local.textContent = text; local.classList.toggle('error', error); }
  }
  board(episodes) {
    const active = episodes.filter(e => !e.dischargedAt);
    this.document.querySelector('#occupied-count').textContent = active.length;
    this.document.querySelector('#available-count').textContent = 18 - active.length;
    this.document.querySelector('#pending-count').textContent = active.reduce((n, e) => n + e.pending.filter(p => p.status === 'Abierto').length, 0);
    this.document.querySelector('#bed-board').innerHTML = Array.from({ length: 18 }, (_, i) => {
      const e = active.find(e => e.bed === i + 1);
      return `<button type="button" class="bed-card${e ? '' : ' bed-card--available'}" ${e ? `data-episode="${esc(e.id)}"` : `data-admit="${i + 1}"`}><div class="bed-card__stripe"></div><div class="bed-card__body"><div class="bed-card__top"><span class="bed-card__number">Cama ${i + 1}</span><span class="bed-card__status">${e ? 'Ocupada' : 'Disponible'}</span></div><p class="bed-card__name">${esc(e?.alias || 'Crear episodio de prueba')}</p><p class="bed-card__detail">${e ? `${e.turns.some(t => !t.signedAt) ? 'Turno abierto' : 'Sin turno abierto'} · ${e.pending.filter(p => p.status === 'Abierto').length} pendientes` : 'Solo paciente sintético'}</p>${e ? `<div class="chips"><span class="chip">${esc(e.state.airway)}</span><span class="chip">${esc(e.state.support)}</span>${e.state.isolation ? '<span class="chip chip--warn">Aislamiento</span>' : ''}</div>` : ''}</div></button>`;
    }).join('');
    let archive = this.document.querySelector('#archive');
    if (!archive) { archive = this.document.createElement('section'); archive.id = 'archive'; this.document.querySelector('main').append(archive); archive.onclick = event => { const button = event.target.closest('[data-episode]'); if (button) this.actions.open(button.dataset.episode); }; }
    archive.innerHTML = `<h2>Episodios egresados de la simulación</h2>${episodes.filter(e => e.dischargedAt).map(e => `<button type="button" data-episode="${esc(e.id)}">${esc(e.alias)} · Ver historia</button>`).join('') || '<p>No hay egresos.</p>'}`;
  }
  show() { if (!this.dialog.open) this.dialog.showModal(); }
  record(model) {
    this.dirty = false; this.dirtyForms = new Set(); this.current = model; const { episode: e, state, clocks, handover, narratives } = model; this.revision = e.revision;
    this.document.querySelector('#dialog-title').textContent = `${e.bed ? `Cama ${e.bed}` : 'Egresado'} · ${e.alias}`;
    const open = e.turns.find(t => !t.signedAt);
    const tabs = { turno: 'Hoja del día', eventos: 'Eventos', series: 'Evaluaciones y mediciones', actividades: 'Atenciones', continuidad: 'Continuidad', historia: 'Historia y entrega' };
    let body = '';
    if (this.tab === 'turno') {
      body = (!open && !e.dischargedAt ? form('OPEN_TURN', 'Comenzar turno', '<p>Apertura manual. Se conserva la historia anterior.</p>', 'Abrir turno') : '') + dailySheet(e, open);
      if (open) body += '<details class="daily-note"><summary>Nota complementaria y plan del turno</summary>' + form('DRAFT', 'Nota y plan', field('Nota complementaria', 'note', `<textarea name="note">${esc(open.note)}</textarea>`) + field('Plan para la entrega', 'plan', `<textarea name="plan">${esc(open.plan)}</textarea>`), 'Guardar nota y plan') + '</details>' + form('SIGN', 'Cerrar turno', '<p>Firma las valoraciones guardadas. Las correcciones posteriores serán adendas.</p>', 'Firmar turno');
      const signed = e.turns.filter(t => t.signedAt);
      if (signed.length) body += form('ADDENDUM', 'Agregar adenda', field('Turno firmado', 'turnId', `<select name="turnId">${signed.map(t => `<option value="${esc(t.id)}">${stamp(t.openedAt)}</option>`).join('')}</select>`) + field('Motivo de la corrección', 'reason') + field('Texto de la adenda', 'text'));
      const currentTurn = open || e.turns.at(-1);
      if (currentTurn) body += `<section class="daily-text"><h3>Texto para ALMA · ${currentTurn.signedAt ? 'turno firmado' : 'borrador sin firmar'}</h3><p>Revisa el texto antes de copiar. La copia no confirma guardado en ALMA.</p><textarea readonly aria-label="Texto para ALMA">${esc(narratives.find(n => n.id === currentTurn.id)?.text || '')}</textarea><button type="button" data-copy-alma>Copiar texto</button></section>`;
    }
    if (this.tab === 'eventos') {
      body = open ? form('EVENT', 'Registrar evento ahora', field('Evento', 'eventType', `<select name="eventType">${Object.entries(EVENT_LABELS).map(([key, label]) => `<option value="${key}">${label}</option>`).join('')}</select>`) + field('Motivo', 'reason') + '<details><summary>Datos según el evento</summary>' + select('Soporte posterior (si corresponde)', 'support', ['Ambiente', 'Oxigenoterapia', 'CNAF', 'VNI', 'VM']) + select('Resultado PVE', 'result', ['Superada', 'Fracasada', 'No evaluable']) + field('Estado persistente', 'active', '<select name="active"><option value="true">Iniciar / cambiar</option><option value="false">Suspender</option></select>') + field('Detalle de AET / UPOT / aislamiento / programa', 'detail', '<input name="detail">') + '</details>') : '<p>Abre un turno para registrar eventos.</p>';
      body += this.list(e.events, item => `${stamp(item.at)} · ${EVENT_LABELS[item.type]} · ${item.reason}`);
    }
    if (this.tab === 'series') {
      body = '<p>SAS, IMS, MRC, FSS y CPAx validan el rango de la versión 7.04. GCS conserva sus tres componentes y 1T. Los demás registros siguen como texto de prueba.</p>' + (open ? form('MEASUREMENT', 'Agregar medición', select('Medición', 'kind', MEASUREMENTS) + `<div id="measurement-fields">${measurementFields(MEASUREMENTS[0])}</div>`) : '<p>Abre un turno para agregar mediciones.</p>');
      body += this.list(e.measurements, item => `${stamp(item.at)} · ${item.kind}: ${item.value} ${item.unit}${item.components && SCALE_COMPONENTS[item.kind] ? ' · ' + SCALE_COMPONENTS[item.kind].map(({key, label}) => `${label}: ${item.components[key]}`).join('; ') : ''}${item.calculation?.notEvaluable ? ` · ${item.calculation.notEvaluable} NE · ${item.calculation.method}` : ''}`);
    }
    if (this.tab === 'actividades') {
      body = open ? form('ACTIVITY', 'Registrar atención o sesión', select('Tipo', 'kind', ACTIVITIES) + select('Estado', 'status', ['Realizada', 'Contraindicada', 'No realizada']) + field('Detalle o motivo', 'detail') + `<div id="activity-fields">${activityFields(ACTIVITIES[0])}</div>`) : '<p>Abre un turno para registrar atenciones.</p>';
      body += `<p>KTR realizadas: ${e.activities.filter(a => a.kind === 'KTR' && a.status === 'Realizada').length} · KTM realizadas: ${e.activities.filter(a => a.kind === 'KTM' && a.status === 'Realizada').length}</p>`;
      body += this.list(e.activities, item => `${stamp(item.at)} · ${item.kind} · ${item.status}: ${item.detail}${item.techniques?.length ? ' · Técnicas: ' + item.techniques.join('; ') : ''}${item.parameters ? ' · ' + (SESSION_FIELDS[item.kind] || []).filter(spec => item.parameters[spec.key] != null).map(spec => `${spec.label}: ${item.parameters[spec.key]} ${spec.unit || ''}`).join('; ') : ''}`);
    }
    if (this.tab === 'continuidad') {
      if (!e.dischargedAt) body += form('MOVE', 'Trasladar episodio', field('Cama destino (1–18)', 'bed', '<input name="bed" type="number" min="1" max="18" required>'), 'Trasladar') + (!open ? form('DISCHARGE', 'Egreso de prueba', '<p>La historia se conserva.</p>', 'Registrar egreso') : '');
      if (open) {
        body += form('PENDING', 'Nuevo pendiente', field('Tarea para continuidad', 'text'));
        const pending = e.pending.filter(p => p.status === 'Abierto');
        if (pending.length) body += form('RESOLVE_PENDING', 'Cerrar pendiente', field('Pendiente', 'pendingId', `<select name="pendingId">${pending.map(p => `<option value="${esc(p.id)}">${esc(p.text)}</option>`).join('')}</select>`) + select('Resultado', 'status', ['Resuelto', 'Cancelado']) + field('Motivo', 'reason'));
        body += form('CULTURE', 'Toma de cultivo', field('Muestra y contexto', 'sample'));
        const cultures = e.cultures.filter(c => !c.result);
        if (cultures.length) body += form('CULTURE_RESULT', 'Informar resultado', field('Muestra', 'cultureId', `<select name="cultureId">${cultures.map(c => `<option value="${esc(c.id)}">${esc(c.sample)}</option>`).join('')}</select>`) + field('Resultado', 'text'));
      } else body += '<p>Abre un turno para modificar continuidad.</p>';
      body += '<h3>Pendientes</h3>' + this.list(e.pending, p => `${p.status} · ${p.text}`) + '<h3>Cultivos</h3>' + this.list(e.cultures, c => `${c.sample} · ${c.result?.text || 'Resultado pendiente'}`);
    }
    if (this.tab === 'historia') {
      body = `<h3>Entrega actual</h3><p>${esc(state.airway)} / ${esc(state.support)} · ${esc(state.position)}</p><p>Plan de referencia: ${esc(handover.plan || 'Sin plan registrado')}</p>` + this.list(handover.pending, p => p.text);
      for (const turn of e.turns) body += `<h3>${stamp(turn.openedAt)} · ${turn.signedAt ? 'Firmado' : 'Borrador'}</h3><pre>${esc(narratives.find(n => n.id === turn.id).text)}</pre>` + this.list(turn.addenda, a => `Adenda ${stamp(a.recordedAt)} · ${a.author} · ${a.reason}: ${a.text}`);
      body += '<h3>Auditoría</h3>' + this.list(e.audit, a => `${stamp(a.recordedAt)} · ${a.author} · ${a.operation} · revisión ${a.revision}`);
    }
    this.document.querySelector('#dialog-body').innerHTML = `<p class="record-meta">Episodio ${esc(e.id)} · Ingreso ${stamp(e.admittedAt)}</p><div class="chips"><span class="chip">${esc(state.airway)} / ${esc(state.support)}</span><span class="chip">VM ${clocks.hours.VM.toFixed(1)} h efectivas</span>${['aet', 'upot', 'isolation', 'imt', 'ems'].filter(key => state[key]).map(key => `<span class="chip chip--warn">${key.toUpperCase()}: ${esc(state[key])}</span>`).join('')}</div><nav class="record-tabs" aria-label="Secciones del episodio">${Object.entries(tabs).map(([key, label]) => `<button type="button" data-tab="${key}" aria-current="${key === this.tab ? 'page' : 'false'}">${label}</button>`).join('')}</nav><p id="record-feedback" role="status"></p><button type="button" data-discard>Descartar formulario</button><div class="record-panel">${body}</div>`;
  }
  list(items, render) { return items.length ? `<ul class="record-list">${items.map(item => `<li>${esc(render(item))}</li>`).join('')}</ul>` : '<p class="empty">Sin registros.</p>'; }
}
