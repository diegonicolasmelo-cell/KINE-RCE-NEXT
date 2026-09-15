import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const text = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [html, manifestText, repository, api, worker] = await Promise.all([
  text('app/index.html'),
  text('app/manifest.webmanifest'),
  text('app/src/repositories/synthetic-bed-repository.js'),
  text('app/src/api/client.js'),
  text('app/service-worker.js')
]);

assert.match(html, /ENTORNO DE PRUEBAS · NO PRODUCCIÓN/);
assert.match(repository, /length: 18/);
assert.match(api, /API desactivada/);
assert.doesNotMatch([html, manifestText, repository, api, worker].join('\n'), /script\.google\.com|spreadsheets\/d\//i);
assert.doesNotMatch(worker, /api|patient|episod/i);

const manifest = JSON.parse(manifestText);
for (const icon of manifest.icons) await access(new URL(`../app/${icon.src}`, import.meta.url));

console.log('Hito 0 smoke: OK');

