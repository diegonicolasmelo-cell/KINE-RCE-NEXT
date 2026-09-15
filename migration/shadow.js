// Read-only comparison. No adapter or write operation exists in this module.
export function compareShadow(legacy, next) {
  const index = records => {
    const map = new Map();
    for (const record of records) {
      if (!record.episodeId || !String(record.episodeId).startsWith('TEST-')) throw new Error('Solo episodios sintéticos TEST');
      if (map.has(record.episodeId)) throw new Error('Episodio duplicado: comparación ambigua');
      map.set(record.episodeId, record);
    }
    return map;
  };
  const before = index(legacy), after = index(next);
  const fields = ['bed', 'airway', 'support', 'vmHours', 'openPending'];
  const differences = [];
  for (const episodeId of new Set([...before.keys(), ...after.keys()])) {
    if (!before.has(episodeId) || !after.has(episodeId)) { differences.push({ episodeId, field: 'presence' }); continue; }
    for (const field of fields) {
      const a = before.get(episodeId)[field], b = after.get(episodeId)[field];
      if (a === undefined || b === undefined || a !== b) differences.push({ episodeId, field });
    }
  }
  return { compared: new Set([...before.keys(), ...after.keys()]).size, matched: differences.length === 0, differences, productionCutoverAllowed: false };
}
