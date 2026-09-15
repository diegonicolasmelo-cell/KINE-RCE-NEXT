// paridad_entrega.js — Guardia de paridad entre el código FUENTE (`v2/`) y el
// paquete que se pega en el editor de Apps Script (`entrega/`), que es lo que
// de verdad corre.
//
// 🪤 POR QUÉ EXISTE (25-ago-2026, heredada de RCE-KINE como `paridad_v3.js`):
// el arreglo del código REM 601171 (los inicios de VNI) se aplicó al fuente y
// la batería dio 99/99 en verde — pero el archivo fusionado del editor seguía
// con el bug, así que lo pegado lo conservaba. NINGUNA guardia comparaba las
// dos capas: la fuente y lo que corre podían separarse en silencio, y un
// arreglo «verde» no llegaba nunca al hospital.
//
// QUÉ CAMBIA EN NEXT. La versión vieja comparaba archivo por archivo con tres
// criterios distintos y, para `infra.gs` y `dominio.gs`, solo exigía que el
// texto del fuente estuviera CONTENIDO en el fusionado — o sea, no habría
// cazado nada que se agregara de más en el espejo. Aquí el paquete entero es
// generado por `build/paquete_migracion.js`, así que la guardia regenera el
// paquete a un temporal y lo compara **byte a byte, archivo por archivo**:
// mismo conjunto de archivos y mismo contenido. Más simple y más estricto.
//
// Uso: node build/checks/paridad_entrega.js
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const raiz = path.join(__dirname, '..', '..');
const entrega = path.join(raiz, 'entrega');
const generador = path.join(raiz, 'build', 'paquete_migracion.js');

const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || !detalle ? '' : ' — ' + detalle));
  if (!cond) fails.push(l);
};

if (!fs.existsSync(entrega)) {
  console.log('❌ No existe la carpeta entrega/. Generala con: node build/paquete_migracion.js entrega');
  process.exit(1);
}

/* ── Regenerar el paquete desde el fuente, en un temporal ─────────────────── */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rce_paridad_'));
const fresco = path.join(tmp, 'entrega');
try {
  execFileSync('node', [generador, fresco], { stdio: 'pipe' });
} catch (e) {
  console.log('❌ El generador del paquete falló. Salida:\n' + (e.stdout || '') + (e.stderr || ''));
  process.exit(1);
}

/* ── 1 · Mismo conjunto de archivos ───────────────────────────────────────── */
// LEEME.md es documentación escrita a mano y no la genera el empaquetador:
// se excluye a propósito de la comparación.
const MANUAL = new Set(['LEEME.md']);
const listar = d => fs.readdirSync(d).filter(f => !MANUAL.has(f)).sort();
const aqui = listar(entrega), debe = listar(fresco);
const sobran = aqui.filter(f => !debe.includes(f));
const faltan = debe.filter(f => !aqui.includes(f));
si('el paquete tiene exactamente los ' + debe.length + ' archivos que genera el empaquetador',
  sobran.length === 0 && faltan.length === 0,
  [sobran.length ? 'sobran: ' + sobran.join(', ') : '', faltan.length ? 'faltan: ' + faltan.join(', ') : ''].filter(Boolean).join(' · '));

/* ── 2 · Byte a byte ──────────────────────────────────────────────────────── */
for (const f of debe.filter(x => aqui.includes(x))) {
  const a = fs.readFileSync(path.join(fresco, f));
  const b = fs.readFileSync(path.join(entrega, f));
  si('idéntico al fuente · ' + f, a.equals(b),
    'generado ' + a.length + ' bytes, en entrega/ ' + b.length + ' bytes — regenerá con: node build/paquete_migracion.js entrega');
}

/* ── 3 · El sello de versión, el mismo en las dos capas ───────────────────── */
const sello = t => (t.match(/rce-version"\s+content="([^"]*)"/) || [])[1];
const sFuente = sello(fs.readFileSync(path.join(raiz, 'v2', 'index.html'), 'utf8'));
const sPaquete = sello(fs.readFileSync(path.join(entrega, 'index.html'), 'utf8'));
si('sello de versión igual en fuente y paquete: ' + sFuente, sFuente === sPaquete, 'el paquete dice ' + sPaquete);

fs.rmSync(tmp, { recursive: true, force: true });
console.log(fails.length ? '\n❌ ' + fails.length + ' FALLOS' : '\n✅ TODO OK');
process.exit(fails.length ? 1 : 0);
