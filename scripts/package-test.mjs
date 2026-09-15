import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const dest = new URL('deliverables/next-test/', root);
await mkdir(dest, { recursive: true });
const files = ['api/generated/domain.gs', 'api/apps-script/adapter.gs', 'api/apps-script/smoke.gs'];
const contents = await Promise.all(files.map(file => readFile(new URL(file, root), 'utf8')));
const combined = '// KINE-RCE-NEXT · TEST ONLY · GENERATED\n' + contents.join('\n');
await writeFile(new URL('NEXT_TEST.gs', dest), combined);
const escaped = combined.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
await writeFile(new URL('review.html', dest), '<!doctype html><html lang="es"><meta charset="utf-8"><title>Backend NEXT TEST · archivo preparado</title><style>body{font-family:system-ui;background:#fff;color:#123;padding:24px}textarea{width:100%;height:75vh;font:12px monospace}</style><h1>Backend NEXT TEST</h1><p>Archivo generado para el proyecto TEST vacío. No contiene credenciales.</p><label>Código completo preparado<textarea readonly aria-label="Código completo preparado">' + escaped + '</textarea></label></html>');
await copyFile(new URL('api/apps-script/appsscript.json', root), new URL('appsscript.json', dest));
await writeFile(new URL('LEEME.txt', dest), [
  'KINE-RCE-NEXT TEST — Instalación en proyecto NUEVO y vacío',
  '',
  '1. Copiar NEXT_TEST.gs en un archivo de script del proyecto TEST vacío.',
  '2. Usar appsscript.json como manifiesto del proyecto.',
  '3. Guardar y ejecutar initializeNextTest una sola vez.',
  '   Crea una planilla vacía nueva; no pide el ID de ninguna planilla anterior.',
  '4. Autorizar personalmente los permisos solicitados por Google.',
  '5. Ejecutar runNextTestSmoke y comprobar passed: true en el registro.',
  '   La prueba deja un episodio ficticio egresado y conserva su auditoría.',
  '',
  'No copiar sobre un proyecto productivo. No añadir datos reales.',
  'Backend experimental; PWA todavía sin conexión. No publicar con acceso anónimo.',
  'No se ha probado aún este paquete dentro de Google Apps Script.',
].join('\n'));
console.log('Paquete generado en deliverables/next-test');
