import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const source = await readFile(new URL('legacy-baseline/v7.04/esquema.gs', root), 'utf8');
const block = source.match(/const _COLS_EVOLUCIONES = \[([\s\S]*?)\n\];/);
if (!block) throw new Error('No se encontró el esquema de evoluciones');
const fields = [...block[1].matchAll(/\['([A-Z0-9_]+)'\s*,\s*'([a-z]+)'\]/g)].map(match => ({ name: match[1], type: match[2] }));
if (new Set(fields.map(f => f.name)).size !== fields.length || fields.length < 300) throw new Error('Inventario incompleto o duplicado');
function destination(name) {
  if (/^(ID_|PATIENT_ID|TURNO_KEY|FECHA$|TURNO$|TIMESTAMP|AUTOR_)/.test(name)) return 'Identidad / metadatos';
  if (/^(DIAS_|DIA_ESTADIA|N_REINTUB|CALC_)/.test(name)) return 'Derivado; no migrar como hecho';
  if (/^VENT_/.test(name)) return 'Revisión ventilatoria pendiente';
  if (/^(AET_|UPOT_|PAC_AISL)/.test(name)) return 'Estado por eventos; validar historia';
  if (/^(EXT_|DECAN_|RESP_PRONO|RESP_SUPINO)/.test(name)) return 'Evento; validar hora y episodio';
  if (/^(EVAL_|BDT_|APNEA_)/.test(name)) return 'Serie / evaluación';
  if (/^KTM_/.test(name)) return 'Sesión o programa; desambiguar';
  if (/^RESP_/.test(name)) return 'Atención / hallazgo; desambiguar';
  if (/^PAC_/.test(name)) return 'Persona / episodio; revisar privacidad';
  return 'Requiere revisión individual';
}
const lines = ['# Inventario de campos legacy 7.04', '', 'Generado desde `legacy-baseline/v7.04/esquema.gs` por `npm run inventory`.', '', `Total: ${fields.length} columnas de EVOLUCIONES.`, '', '**Inventario provisional, no matriz clínica aprobada.** La agrupación por nombre orienta la revisión; no autoriza transformaciones ni define variables nuevas. Todo campo conserva su nombre y tipo exactos de origen.', '', '| Campo | Tipo legacy | Destino propuesto para revisar | Estado |', '|---|---|---|---|', ...fields.map(f => `| ${f.name} | ${f.type} | ${destination(f.name)} | Pendiente |`)];
await writeFile(new URL('docs/FIELD_INVENTORY.md', root), lines.join('\n') + '\n');
console.log(`Inventario generado: ${fields.length} campos pendientes de revisión.`);
