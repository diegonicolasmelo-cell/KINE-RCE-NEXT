// pwa_paquete.js — 📲 EL PAQUETE INSTALABLE, Y LO QUE NUNCA DEBE GUARDAR
// (16-sep-2026).
//
// DE DÓNDE SALE. El PRD de la PWA pide servir la pantalla desde un sitio
// propio para que se instale como aplicación. Eso son tres archivos nuevos
// —manifiesto, service worker e iconos— y una carpeta que se GENERA desde
// `v2/`, igual que `entrega/`: dos pantallas serían dos verdades.
//
// 🔴 LO QUE ESTA GUARDIA EXISTE PARA IMPEDIR. Un service worker guarda cosas
// en el teléfono para que la app abra rápido. Si guardara las RESPUESTAS del
// servidor, el censo de la UCI —con nombres y diagnósticos— quedaría escrito
// en el aparato de cada uno, sobreviviría al cierre de sesión y estaría ahí si
// el teléfono se pierde. El PRD deja «guardar sin conexión» FUERA de alcance
// justamente por eso. Acá solo se guarda el ARMAZÓN: el HTML, el manifiesto y
// los iconos. Los datos se piden siempre.
//
// 🪤 Y LA OTRA TRAMPA: el caché tiene que llevar el SELLO DE VERSIÓN en el
// nombre. Un service worker que guarda el armazón con un nombre fijo deja al
// equipo con la versión vieja para siempre, y el síntoma es «pegué el archivo
// y no cambió nada» — el peor rato de depuración que hay, porque el código
// nuevo SÍ está.
//
// Uso: node build/checks/pwa_paquete.js
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..', '..');
const PWA = path.join(RAIZ, 'pwa');
const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined ? '' : ' — ' + detalle));
  if (!cond) fails.push(l);
};
const hay = f => fs.existsSync(path.join(PWA, f));
const leer = f => fs.readFileSync(path.join(PWA, f), 'utf8');

/* ══ 1 · El paquete existe y está completo ════════════════════════════════ */
for (const f of ['index.html', 'manifest.webmanifest', 'sw.js',
                 'iconos/icono-192.png', 'iconos/icono-512.png']) {
  si('existe pwa/' + f, hay(f));
}
if (fails.length) { console.log('\n❌ ' + fails.length + ' FALLOS'); process.exit(1); }

/* ══ 2 · El manifiesto dice lo que un teléfono necesita ═══════════════════ */
let man = null;
try { man = JSON.parse(leer('manifest.webmanifest')); } catch (e) { si('el manifiesto es JSON válido', false, e.message); }
if (man) {
  si('el manifiesto tiene nombre', !!man.name && !!man.short_name, JSON.stringify([man.name, man.short_name]));
  si('…se abre como aplicación, no como pestaña', man.display === 'standalone', man.display);
  si('…con la paleta de la app', /^#/.test(String(man.theme_color || '')) && /^#/.test(String(man.background_color || '')),
    JSON.stringify([man.theme_color, man.background_color]));
  si('…y trae los dos iconos que pide Android',
    Array.isArray(man.icons) && man.icons.some(i => /192/.test(i.sizes)) && man.icons.some(i => /512/.test(i.sizes)),
    JSON.stringify((man.icons || []).map(i => i.sizes)));
  si('…al menos uno sobrevive al recorte circular (maskable)',
    (man.icons || []).some(i => /maskable/.test(String(i.purpose || ''))),
    'sin «maskable» Android recorta el icono y se come el dibujo');
  si('🔒 el manifiesto NO lleva la dirección del servidor',
    !/script\.google\.com\/macros/.test(leer('manifest.webmanifest')),
    'la dirección se configura en cada aparato, no se publica');
}

/* ══ 3 · 🔴 El service worker NO guarda datos clínicos ════════════════════ */
const sw = leer('sw.js');
const swLimpio = sw.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
si('🔴 el service worker ignora todo lo que no sea GET',
  /method\s*!==?\s*['"]GET['"]/.test(swLimpio),
  'las llamadas al servidor son POST: si no se descartan, el censo de la UCI acabaría guardado en el teléfono');
si('🔴 …y todo lo que no sea de su propio origen',
  /origin\s*!==?\s*(self\.)?location\.origin|new URL\([^)]*\)\.origin/.test(swLimpio),
  'sin eso cachearía las respuestas de Apps Script, que es exactamente lo que no debe guardar');
si('🔴 el service worker NO nombra a Apps Script en ninguna parte',
  !/script\.google\.com|googleusercontent/.test(sw),
  'no tiene nada que hacer con el servidor: solo guarda el armazón');

/* ══ 4 · 🪤 El caché lleva el sello, y cambia con él ══════════════════════ */
const empaquetador = fs.readFileSync(path.join(RAIZ, 'build', 'empaquetar_cohete.js'), 'utf8');
const SELLO = (/const VERSION = '([^']+)'/.exec(empaquetador) || [])[1] || '';
si('se pudo leer el sello de versión del empaquetador', !!SELLO, SELLO);
si('🪤 el nombre del caché lleva el sello de esta versión',
  sw.indexOf(SELLO) !== -1,
  'con un nombre fijo, el equipo se queda con la versión vieja para siempre y el síntoma es «pegué el archivo y no cambió nada»');
si('…y el service worker borra los cachés de versiones anteriores',
  /caches\.keys\(\)/.test(swLimpio) && /caches\.delete/.test(swLimpio),
  'sin limpiar, cada versión deja su copia del armazón ocupando el teléfono');

/* ══ 5 · La pantalla es la misma que la del iframe ════════════════════════ */
const idx = leer('index.html');
si('el index de la PWA enlaza el manifiesto', /rel=["']manifest["']/.test(idx));
si('…registra el service worker', /serviceWorker\s*\.\s*register/.test(idx));
si('…y NO viaja en formato cohete',
  idx.indexOf('<div id="ld"') === -1,
  'el cohete existe por el lector estricto de Google; fuera de Apps Script solo hace la carga más lenta');
si('🔒 el index publicado NO lleva la dirección del servidor',
  !/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}/.test(idx));

/* ══ 6 · Se GENERA desde v2/, no se edita ═════════════════════════════════ */
const os = require('os');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rce_pwa_'));
execFileSync('node', [path.join(RAIZ, 'build', 'empaquetar_pwa.js'), path.join(tmp, 'pwa')], { stdio: 'pipe' });
// LEEME.md es documentación escrita a mano: no entra en la comparación byte a
// byte, pero SÍ se exige que siga existiendo. Excluirlo sin más fue lo que
// dejó pasar que el empaquetador borrara el de `entrega/` en cada regeneración.
const MANUAL = new Set(['LEEME.md']);
si('el LEEME.md de la carpeta sobrevivió a la regeneración', hay('LEEME.md'),
  'el empaquetador se lo llevó: debe borrar solo lo que genera, no la carpeta entera');
const listar = d => fs.readdirSync(d, { recursive: true })
  .filter(f => fs.statSync(path.join(d, f)).isFile() && !MANUAL.has(path.basename(f))).sort();
const aqui = listar(PWA), fresco = listar(path.join(tmp, 'pwa'));
si('el paquete tiene exactamente los archivos que genera el empaquetador',
  JSON.stringify(aqui) === JSON.stringify(fresco),
  'aquí: ' + aqui.join(', ') + ' · genera: ' + fresco.join(', '));
for (const f of fresco.filter(x => aqui.includes(x))) {
  const a = fs.readFileSync(path.join(tmp, 'pwa', f));
  const b = fs.readFileSync(path.join(PWA, f));
  si('idéntico a lo generado · ' + f, a.equals(b),
    'regenerá con: node build/empaquetar_pwa.js');
}
fs.rmSync(tmp, { recursive: true, force: true });

console.log(fails.length ? '\n❌ ' + fails.length + ' FALLOS' : '\n✅ TODO OK');
process.exit(fails.length ? 1 : 0);
