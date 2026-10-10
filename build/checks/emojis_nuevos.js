// emojis_nuevos.js — CANDADO: NINGÚN EMOJI DE 2020 EN ADELANTE ENTRA A LA INTERFAZ (tanda 5 · cambio 7 del plan de limpieza del
// registro de evolución, oct-2026).
//
// DE DÓNDE SALE. CLAUDE.md lo dice: «Emojis en la interfaz: nada posterior a 2019. El Chrome del hospital corre en Windows 10 y
// su fuente no trae los nuevos: 🩻 (2021) salió como un cuadrado» (Diego lo vio el 6-sep-2026; ver relato_espejo.js). Era una
// regla escrita y NINGUNA guardia la vigilaba: ya se había colado una vez, y la única defensa era que alguien se acordara. Los emojis de 2020 en adelante se pagan
// en el computador del hospital —donde el kinesiólogo mira la pantalla de pie, al lado de la cama— y no se ven desde la casa de
// quien programa. Esta guardia no cambia ningún emoji que ya vive en producción (CLAUDE.md: «la regla es para ELEGIR un ícono
// nuevo, no para barrer los que ya están»; si se ven bien o no en el hospital lo decide Diego): solo impide AGREGAR uno.
//
// 🪤 LA LISTA DE BASE SE HIZO CON UN GREP REAL, Y NO ERA LA DE LA AUDITORÍA. La auditoría de la tanda (estática, de memoria) dijo
//    cuatro: pulmones, cara exhalando, burbujas y pluma. Leyendo el fuente salieron CINCO: faltaba el corazón anatómico de la
//    insignia UPOT de la tarjeta de cama (U+1FAC0), y los pulmones no están «en el título de Respiratorio» sino en 27 sitios (23
//    líneas de la pantalla y 4 de los .gs: la campana, la entrega de turno y mantenimiento). Y al revés: 🩻, que la auditoría
//    imaginaba como el ejemplo de lo que NO está, SÍ está en el fuente —seis veces, tres en index.html y tres en los .gs—, pero
//    siempre dentro de un COMENTARIO que explica por qué no se usa. Por eso la base no se puede hacer con un `grep` pelado ni la
//    guardia puede mirar el archivo entero.
//
// 🪤 LOS COMENTARIOS NO SE MIRAN, y esa es la parte difícil. Un comentario no se dibuja: el 🪤 (ratonera, de 2020) es EL marcador de
//    las trampas en 135 líneas de index.html y en 89 de los .gs, y el 🩻 vive en comentarios que recuerdan por qué se quitó. Si la
//    guardia mirara el archivo entero, o bien rechazaría todo eso, o bien habría que meter 🩻 y 🪤 en la base y entonces el único
//    emoji que se sabe que falla quedaría PERMITIDO en pantalla. Hay que separar comentario de interfaz de verdad, y en un archivo
//    que mezcla HTML, CSS y JavaScript con plantillas de texto eso no se hace con una regex por línea (un comentario de bloque
//    sigue en las líneas de abajo; hay `//` dentro de cadenas y cadenas dentro de `${ }`). Hay un LECTOR de verdad, más abajo, y
//    la guardia lo prueba contra casos armados a propósito (sección 1) y contra los archivos reales (sección 2: si se descarrila
//    queda una cadena sin cerrar o un `<script>` que no termina donde debe, y eso pone la guardia roja en vez de dejarla ciega).
//
// 🪤 EL FUENTE TAMBIÉN ESCRIBE EMOJIS COMO CÓDIGO. No solo el carácter: index.html trae `&#128274;` (el candado de «Modo
//    Coordinación») y `&#128101;` de verdad, así que el mismo emoji de 2021 se puede colar como `&#x1FA7B;`, como `&#129659;`,
//    como `\u{1FA7B}` o como el par de sustitutos `\uD83E\uDE7B` sin que un grep por el carácter lo vea. Se decodifican las cuatro formas.
//
// QUÉ SE CONSIDERA «NUEVO»
//   1. Todo pictograma que Unicode NO tenía asignado al 12.1 (oct-2019, el último emoji «de 2019»). No es una lista de emojis
//      conocidos: es lo que NO está en la tabla de ASIGNADOS, así que un emoji de 2026 que hoy nadie conoce entra rechazado sin
//      que nadie actualice nada. Las zonas reservadas para emojis futuros cuentan igual.
//   2. Secuencias de código viejo con significado nuevo (el emoji NO se mide por su carácter sino por su unión):
//      · ZWJ (U+200D). 😮‍💨 «cara exhalando» son dos emojis de 2010 pegados, y el conjunto es de 2020. Toda secuencia ZWJ tiene que
//        estar en la base o en la lista de ANTIGUAS que se revisaron una por una. Es conservador a propósito: un 👩‍⚕️ legítimo
//        pide agregar una línea con su año, y eso es una decisión consciente, no un descuido.
//      · ⚧ (U+26A7): el signo existe desde 2005 pero se hizo emoji en 2020.
//      · 🤝 con tono de piel (2021) y la bandera de Sark 🇨🇶 (2024): únicas uniones conocidas que no pasan por una secuencia ZWJ.
//
// QUÉ EXIGE
//   1. El lector de comentarios y de formas escritas como código funciona (casos armados, incluidos los rojos: un 🩻 en una cadena,
//      en una plantilla, después de una `//` dentro de un texto, como `&#x1FA7B;`, como `\u{1FA7B}`, como par subrogado).
//   2. Los archivos reales se leen enteros y sin descarrilar (sin cadenas a medias, y con el JavaScript sin comentarios todavía
//      compilando en el motor de verdad: es la prueba independiente de que el lector no se llevó código por comentario).
//   3. Ningún emoji nuevo FUERA DE COMENTARIOS que no esté en BASE.
//   4. No es una guardia vacía: cada emoji de BASE sigue apareciendo (si uno desaparece —porque Diego decidió cambiarlo— se borra
//      de la base y el candado se aprieta; así un emoji quitado no puede volver).
//   5. Prueba roja permanente: se inyecta un 🩻 en la pantalla real, en memoria, y el lector TIENE que rechazarlo.
//
// QUÉ MIRA: v2/index.html y todos los v2/*.gs (también escriben texto de interfaz: las alertas de la campana, la entrega de turno).
// Es ESTÁTICA: lee archivos, no abre el navegador y no mira el reloj, así que da lo mismo cuándo se corra.
//
// Uso:  node build/checks/emojis_nuevos.js              → v2/ del repositorio
//       node build/checks/emojis_nuevos.js <carpeta>    → otra carpeta con el mismo contenido (así se demuestra en ROJO sin
//                                                          tocar el repositorio: copia de v2/ fuera del árbol, con un 🩻 agregado)
//       node build/checks/emojis_nuevos.js --listar     → imprime cada emoji de 2020 en adelante que hay en pantalla y dónde,
//                                                          para rehacer la BASE con un grep de verdad y no de memoria
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const args = process.argv.slice(2);
const LISTAR = args.includes('--listar');
const carpetaArg = args.find(a => !a.startsWith('--'));
const DIR = carpetaArg ? path.resolve(carpetaArg) : path.join(__dirname, '..', '..', 'v2');

const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || !detalle ? '' : ' — ' + detalle));
  if (!cond) fails.push(l);
};

const hex = (cp) => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
const cpsDe = (txt) => Array.from(txt, c => c.codePointAt(0));
const claveDe = (cps) => cps.filter(c => c !== 0xFE0F && c !== 0xFE0E).map(c => c.toString(16).toUpperCase()).join(' ');
const glifo = (clave) => clave.split(' ').map(h => String.fromCodePoint(parseInt(h, 16))).join('');

/* ══ TABLA · PICTOGRAMAS ASIGNADOS HASTA UNICODE 12.1 (OCT-2019) ═════════════════════════════════════════════════════════════
   (Extended_Pictographic ∪ Emoji_Presentation) ∩ asignado-hasta-12.1 (un poco más ancha de lo que el detector usa: sobra, no falta).
   Se generó UNA vez con Perl (`\p{Present_In: 12.1}`) y se
   verificó contra los \p{…} de Node: 89 rangos, ningún viejo queda fuera del alcance de Node. Lo que Node reconoce como pictograma
   y NO está acá es de 2020 en adelante o está reservado para emojis futuros, y se rechaza.
   🪤 Se guarda lo ASIGNADO y no lo prohibido: cuando salga Unicode 18, sus emojis nuevos ya están rechazados sin tocar nada. */
const ASIGNADOS_A_2019 = ('A9,AE,203C,2049,2122,2139,2194-2199,21A9-21AA,231A-231B,2328,2388,23CF,23E9-23F3,23F8-23FA,24C2,25AA-25AB,25B6,'
  + '25C0,25FB-25FE,2600-2605,2607-2612,2614-2685,2690-2705,2708-2712,2714,2716,271D,2721,2728,2733-2734,2744,2747,274C,274E,'
  + '2753-2755,2757,2763-2767,2795-2797,27A1,27B0,27BF,2934-2935,2B05-2B07,2B1B-2B1C,2B50,2B55,3030,303D,3297,3299,1F000-1F02B,'
  + '1F030-1F093,1F0A0-1F0AE,1F0B1-1F0BF,1F0C1-1F0CF,1F0D1-1F0F5,1F12F,1F16C,1F170-1F171,1F17E-1F17F,1F18E,1F191-1F19A,'
  + '1F1E6-1F1FF,1F201-1F202,1F21A,1F22F,1F232-1F23A,1F250-1F251,1F260-1F265,1F300-1F53D,1F546-1F64F,1F680-1F6D5,1F6E0-1F6EC,'
  + '1F6F0-1F6FA,1F7D5-1F7D8,1F7E0-1F7EB,1F90D-1F93A,1F93C-1F945,1F947-1F971,1F973-1F976,1F97A-1F9A2,1F9A5-1F9AA,1F9AE-1F9CA,'
  + '1F9CD-1FA53,1FA60-1FA6D,1FA70-1FA73,1FA78-1FA7A,1FA80-1FA82,1FA90-1FA95')
  .split(',').map(r => { const p = r.split('-'); return [parseInt(p[0], 16), parseInt(p[1] || p[0], 16)]; });
const esAsignadoA2019 = (cp) => ASIGNADOS_A_2019.some(r => cp >= r[0] && cp <= r[1]);

/* ══ BASE · LOS EMOJIS DE 2020 EN ADELANTE QUE YA VIVEN EN PRODUCCIÓN ════════════════════════════════════════════════════════
   Hecha con `node build/checks/emojis_nuevos.js --listar` (el lector de abajo, que descarta los comentarios), el 10-oct-2026.
   NO se agrega nada acá para «hacer pasar» la guardia: un emoji nuevo es una decisión de Diego, y la salida correcta es un SVG propio
   o un emoji de 2019 o anterior. Esta lista solo congela lo que ya estaba, para que no crezca.
   Cuando Diego resuelva el punto 4 de la auditoría (¿los ve bien en el computador del hospital?) y se cambie alguno, se BORRA de
   acá: la guardia lo exige (sección 3) para que el candado se apriete solo y el emoji quitado no pueda volver. */
const BASE = [
  { clave: '1FAC1', nombre: 'pulmones', version: 'Emoji 13.0 (2020)',
    sitios: 'título de la tarjeta Respiratorio y botón «Intubación» del panel, pines y leyenda del timeline, bodega y tablero de ventilación, estadísticas, alertas de la campana (svc_notificaciones.gs), entrega de turno (svc_entrega.gs) y mantenimiento.gs' },
  { clave: '1FAC0', nombre: 'corazón anatómico', version: 'Emoji 13.0 (2020)',
    sitios: 'insignia «UPOT» de la tarjeta de cama (la auditoría de memoria no lo listó)' },
  { clave: '1FAE7', nombre: 'burbujas', version: 'Emoji 14.0 (2021)',
    sitios: 'pack «Oxigenación» de las variables del timeline' },
  { clave: '1FAB6', nombre: 'pluma', version: 'Emoji 13.0 (2020)',
    sitios: 'pack «Weaning» de las variables del timeline' },
  { clave: '1F62E 200D 1F4A8', nombre: 'cara exhalando', version: 'Emoji 13.1 (2020)',
    sitios: 'desplegable «Tos y deglución» del paso de evaluaciones' },
];
const CLAVES_BASE = new Set(BASE.map(b => b.clave));

/* ══ ANTIGUAS · SECUENCIAS ZWJ REVISADAS UNA POR UNA, TODAS ANTERIORES A 2020 ═══════════════════════════════════════════════════
   Entra acá una secuencia ZWJ solo después de mirar su año en la tabla de Emoji de Unicode (emoji-zwj-sequences.txt). */
const ZWJ_ANTIGUAS = new Map([
  ['1F9D1 200D 2695',      'persona de salud, Emoji 12.1 (2019) — «¿En qué te ayudo?» de la ayuda'],
  ['1F6B6 200D 2642',      'hombre caminando, Emoji 4.0 (2016) — escala de movilidad'],
]);

/* ══ ÚNICAS UNIONES DE CÓDIGO VIEJO CON SIGNIFICADO NUEVO QUE NO PASAN POR ZWJ ════════════════════════════════════════════════ */
const SIGNO_TRANS = 0x26A7;                       // ⚧ — Emoji 13.0 sobre un signo de 2005
const APRETON = 0x1F91D;                          // 🤝 — con tono de piel es Emoji 14.0
const BANDERA_NUEVA = 'CQ';                       // 🇨🇶 Sark — Emoji 16.0 (2024)

/* ══ EL LECTOR · QUÉ PARTES DE UN ARCHIVO SON COMENTARIO ════════════════════════════════════════════════════════════════════
   Devuelve una máscara (1 = comentario) del mismo largo que el texto. `modo`: 'html' (index.html: HTML con <script> y <style>) o
   'js' (los .gs). No es un analizador completo de JavaScript, es el mínimo para NO confundir un comentario con una cadena:
     · comentarios de línea y de bloque, también los que siguen a código en la misma línea
     · cadenas '…' y "…" con escapes y continuación de línea
     · plantillas `…` con `${ … }` anidadas (el código de adentro vuelve a ser código: tiene sus propias cadenas y comentarios)
     · literales de expresión regular, que pueden traer comillas o `//` adentro (ver `finRegex`)
     · en HTML: <!-- … -->, <script> … </script> y <style> … </style> (en CSS: solo comentarios de bloque y cadenas)
   `problemas` cuenta lo que en un archivo SANO no ocurre nunca (cadena que llega al final de línea sin cerrar, plantilla o
   comentario de bloque que llegan al final del archivo): si el lector se descarrila, esa cuenta sube y la guardia se pone roja.
   `scripts` son los tramos que el lector tomó por JavaScript: la sección 2 los compila SIN los comentarios (prueba independiente
   de que no se llevó código por comentario: el motor de verdad rechaza un programa al que le falta un pedazo). */
const PALABRAS_ANTES_DE_REGEX = new Set(['return', 'typeof', 'case', 'in', 'of', 'new', 'delete', 'void', 'throw', 'else', 'do',
  'instanceof', 'yield', 'await']);
const ES_PALABRA = /[A-Za-z0-9_$]/;

function leer(txt, modo) {
  const n = txt.length;
  const mascara = new Uint8Array(n);
  const problemas = [];
  const scripts = [];
  const marcar = (a, b) => { for (let k = a; k < b; k++) mascara[k] = 1; };
  const linea = (pos) => { let l = 1; for (let k = txt.indexOf('\n'); k >= 0 && k < pos; k = txt.indexOf('\n', k + 1)) l++; return l; };
  const dentroDeScript = (modo === 'html');   // en html el JS termina en </script, en .gs no hay fin

  function pasarCadena(i, comilla) {
    let j = i + 1;
    while (j < n) {
      const c = txt[j];
      if (c === '\\') { j += 2; continue; }
      if (c === comilla) return j + 1;
      if (c === '\n') { problemas.push('línea ' + linea(i) + ': cadena sin cerrar'); return j; }
      j++;
    }
    problemas.push('línea ' + linea(i) + ': cadena sin cerrar al final del archivo');
    return n;
  }

  // Una barra puede ser división o inicio de una expresión regular. Se decide por lo que vino antes (`regexOk`) y se confirma
  // buscando la barra de cierre en la MISMA línea, saltando clases […] y escapes; si no se encuentra, era una división.
  function finRegex(i) {
    let j = i + 1, clase = false;
    while (j < n) {
      const c = txt[j];
      if (c === '\n') return -1;
      if (c === '\\') { j += 2; continue; }
      if (c === '[') clase = true;
      else if (c === ']') clase = false;
      else if (c === '/' && !clase) { j++; while (j < n && /[a-z]/.test(txt[j])) j++; return j; }
      j++;
    }
    return -1;
  }

  function pasarPlantilla(i) {
    let j = i + 1;
    while (j < n) {
      const c = txt[j];
      if (c === '\\') { j += 2; continue; }
      if (c === '`') return j + 1;
      if (c === '$' && txt[j + 1] === '{') { j = pasarJs(j + 2, true) + 1; continue; }
      j++;
    }
    problemas.push('línea ' + linea(i) + ': plantilla sin cerrar');
    return n;
  }

  // Lee código JS desde `i`. Con `enExpresion` termina en la `}` que cierra el `${`; en html termina en `</script`.
  // Devuelve el índice donde quedó (la `}` o el `<` de `</script`, o el final).
  function pasarJs(i, enExpresion) {
    let prof = 0, regexOk = true;
    while (i < n) {
      const c = txt[i];
      if (c === '<' && dentroDeScript && !enExpresion && txt.startsWith('</script', i)) return i;
      if (c === '/') {
        const d = txt[i + 1];
        if (d === '/') { let j = txt.indexOf('\n', i); if (j < 0) j = n; marcar(i, j); i = j; continue; }
        if (d === '*') {
          let j = txt.indexOf('*/', i + 2);
          if (j < 0) { problemas.push('línea ' + linea(i) + ': comentario de bloque sin cerrar'); j = n; } else j += 2;
          marcar(i, j); i = j; continue;
        }
        if (regexOk) { const j = finRegex(i); if (j > 0) { i = j; regexOk = false; continue; } }
        regexOk = true; i++; continue;
      }
      if (c === '"' || c === "'") { i = pasarCadena(i, c); regexOk = false; continue; }
      if (c === '`') { i = pasarPlantilla(i); regexOk = false; continue; }
      if (c === '{') { prof++; regexOk = true; i++; continue; }
      if (c === '}') {
        if (enExpresion && prof === 0) return i;
        if (prof > 0) prof--;
        regexOk = true; i++; continue;
      }
      if (c === ')' || c === ']') { regexOk = false; i++; continue; }
      if (ES_PALABRA.test(c)) {
        let j = i + 1; while (j < n && ES_PALABRA.test(txt[j])) j++;
        regexOk = PALABRAS_ANTES_DE_REGEX.has(txt.slice(i, j)); i = j; continue;
      }
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
      regexOk = (c.charCodeAt(0) < 0x80);   // operador o signo: puede seguir una regex; un carácter fuera de ASCII suelto, no
      i++;
    }
    return n;
  }

  function pasarCss(i) {
    while (i < n) {
      const c = txt[i];
      if (c === '<' && txt.startsWith('</style', i)) return i;
      if (c === '/' && txt[i + 1] === '*') {
        let j = txt.indexOf('*/', i + 2);
        if (j < 0) { problemas.push('línea ' + linea(i) + ': comentario CSS sin cerrar'); j = n; } else j += 2;
        marcar(i, j); i = j; continue;
      }
      if (c === '"' || c === "'") { i = pasarCadena(i, c); continue; }
      i++;
    }
    return n;
  }

  if (modo === 'js') {
    pasarJs(0, false);
    scripts.push([0, n]);
  } else {
    let i = 0;
    while (i < n) {
      const k = txt.indexOf('<', i);
      if (k < 0) break;
      if (txt.startsWith('<!--', k)) {
        let j = txt.indexOf('-->', k + 4);
        if (j < 0) { problemas.push('línea ' + linea(k) + ': comentario HTML sin cerrar'); j = n; } else j += 3;
        marcar(k, j); i = j; continue;
      }
      const etiqueta = /^<(script|style)(?=[\s>])/i.exec(txt.slice(k, k + 10));
      if (etiqueta) {
        const finEtiqueta = txt.indexOf('>', k);
        if (finEtiqueta < 0) { problemas.push('línea ' + linea(k) + ': etiqueta sin cerrar'); break; }
        const esScript = etiqueta[1].toLowerCase() === 'script';
        const fin = esScript ? pasarJs(finEtiqueta + 1, false) : pasarCss(finEtiqueta + 1);
        if (esScript) scripts.push([finEtiqueta + 1, Math.min(fin, n)]);
        if (fin >= n) problemas.push('línea ' + linea(k) + ': el <' + etiqueta[1].toLowerCase() + '> no termina donde debe (el lector se descarriló)');
        i = fin; continue;
      }
      i = k + 1;
    }
  }
  return { mascara, problemas, scripts };
}

/* ══ LAS FORMAS ESCRITAS COMO CÓDIGO ══════════════════════════════════════════════════════════════════════════════════════════
   Arma el texto que de verdad se vería: sin comentarios y con `&#N;`, `&#xH;`, `\u{H}`, `\uHHHH` y pares subrogados ya
   convertidos en su carácter. `lineas[k]` es la línea del k-ésimo carácter del resultado. */
function vistaVisible(txt, mascara) {
  const n = txt.length;
  const lineas = new Uint32Array(n + 1);
  let s = '', l = 1, k = 0;
  const poner = (str) => { for (let q = 0; q < str.length; q++) lineas[k++] = l; s += str; };
  let i = 0;
  while (i < n) {
    const c = txt[i];
    if (c === '\n') { poner('\n'); l++; i++; continue; }
    if (mascara[i]) { poner(' '); i++; continue; }
    let m;
    if (c === '&' && txt[i + 1] === '#' && (m = /^&#(?:[xX]([0-9a-fA-F]{1,6})|([0-9]{1,7}));/.exec(txt.slice(i, i + 12)))) {
      const cp = m[1] ? parseInt(m[1], 16) : parseInt(m[2], 10);
      if (cp >= 0x80 && cp <= 0x10FFFF && !(cp >= 0xD800 && cp <= 0xDFFF)) { poner(String.fromCodePoint(cp)); i += m[0].length; continue; }
    } else if (c === '\\' && txt[i + 1] === 'u') {
      const t = txt.slice(i, i + 14);
      if ((m = /^\\u\{([0-9a-fA-F]{1,6})\}/.exec(t))) {
        const cp = parseInt(m[1], 16);
        if (cp >= 0x80 && cp <= 0x10FFFF && !(cp >= 0xD800 && cp <= 0xDFFF)) { poner(String.fromCodePoint(cp)); i += m[0].length; continue; }
      } else if ((m = /^\\u([dD][89abAB][0-9a-fA-F]{2})\\u([dD][c-fC-F][0-9a-fA-F]{2})/.exec(t))) {
        poner(String.fromCharCode(parseInt(m[1], 16), parseInt(m[2], 16))); i += m[0].length; continue;
      } else if ((m = /^\\u([0-9a-fA-F]{4})/.exec(t))) {
        const cp = parseInt(m[1], 16);
        if (cp >= 0x2000 && !(cp >= 0xD800 && cp <= 0xDFFF)) { poner(String.fromCodePoint(cp)); i += m[0].length; continue; }
      }
    }
    poner(c); i++;
  }
  return { s, lineas };
}

/* ══ EL DETECTOR ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Recorre los «grupos de pictograma» del texto visible (un emoji con su selector de variante y su tono de piel, unido por ZWJ a
   otros, o un par de letras de bandera) y decide para cada uno si es de 2020 en adelante. */
// Extended_Pictographic es todo lo que es o será emoji (también las zonas reservadas). Los tonos de piel y las letras de bandera,
// que no están en esa propiedad, se toman aparte (`Emoji_Modifier` y el par de `Regional_Indicator`).
const ELEM = '\\p{Extended_Pictographic}';
const GRUPO = new RegExp('\\p{Regional_Indicator}{2}|' + ELEM + '[\\uFE0E\\uFE0F]?\\p{Emoji_Modifier}?(?:\\u200D' + ELEM
  + '[\\uFE0E\\uFE0F]?\\p{Emoji_Modifier}?)*', 'gu');
const ENALCANCE = new RegExp('^' + ELEM + '$', 'u');
const esTono = (cp) => cp >= 0x1F3FB && cp <= 0x1F3FF;

function motivoDeNovedad(cps) {
  const clave = claveDe(cps);
  if (cps.length === 2 && cps.every(c => c >= 0x1F1E6 && c <= 0x1F1FF)) {
    const letras = cps.map(c => String.fromCharCode(65 + c - 0x1F1E6)).join('');
    return letras === BANDERA_NUEVA ? 'la bandera ' + letras + ' es de Unicode 16 (2024)' : null;
  }
  for (const cp of cps) {
    if (ENALCANCE.test(String.fromCodePoint(cp)) && !esAsignadoA2019(cp)) return hex(cp) + ' es posterior a Unicode 12.1 (oct-2019)';
  }
  if (cps.includes(SIGNO_TRANS)) return hex(SIGNO_TRANS) + ' (⚧) se hizo emoji en 2020 (Emoji 13.0)';
  const sinVariante = cps.filter(c => c !== 0xFE0F && c !== 0xFE0E);
  const iApreton = sinVariante.indexOf(APRETON);
  if (iApreton >= 0 && esTono(sinVariante[iApreton + 1])) return 'el apretón de manos con tono de piel es de Emoji 14.0 (2021)';
  if (cps.includes(0x200D) && !ZWJ_ANTIGUAS.has(clave)) return 'secuencia ZWJ ' + clave + ' no figura entre las anteriores a 2020 (ZWJ_ANTIGUAS)';
  return null;
}

// Analiza UN texto fuente. Devuelve cada hallazgo de 2020 en adelante (los de la base aparte) y los problemas del lector.
function analizar(txt, modo) {
  const { mascara, problemas, scripts } = leer(txt, modo);
  const { s, lineas } = vistaVisible(txt, mascara);
  const nuevos = [], enBase = [];
  for (const m of s.matchAll(GRUPO)) {
    const cps = cpsDe(m[0]);
    const motivo = motivoDeNovedad(cps);
    if (!motivo) continue;
    const clave = claveDe(cps);
    const hallazgo = { linea: lineas[m.index], clave, texto: m[0], motivo };
    (CLAVES_BASE.has(clave) ? enBase : nuevos).push(hallazgo);
  }
  return { nuevos, enBase, problemas, mascara, scripts };
}

/* ══ 1 · EL LECTOR Y EL DETECTOR, CONTRA CASOS ARMADOS ══════════════════════════════════════════════════════════════════════════ */
console.log('1 · El lector separa comentario de pantalla y ve las formas escritas como código');
const RAYOS_X = String.fromCodePoint(0x1FA7B);          // 🩻 — el que salió como cuadrado en el hospital
const PULMONES = String.fromCodePoint(0x1FAC1);          // 🫁 — está en la base
const RATONERA = String.fromCodePoint(0x1FAA4);          // 🪤 — el marcador de trampas, que vive en comentarios
const CORAZON_FUEGO = String.fromCodePoint(0x2764, 0xFE0F, 0x200D, 0x1F525);   // corazón en llamas: ZWJ de 2020 con piezas de 2010
const casos = [
  // [descripción, texto, modo, cuántos hallazgos nuevos se esperan, (opcional) qué emoji tiene que ser: así una entidad mal
  //  decodificada que cayera en OTRO emoji nuevo no pasa por buena]
  ['★ un 🩻 en el texto de la pantalla se rechaza',                       '<div>' + RAYOS_X + ' Imágenes</div>', 'html', 1],
  ['★ …en una cadena de JavaScript',                                      "<script>const t = '" + RAYOS_X + " Imágenes';</script>", 'html', 1],
  ['★ …en una plantilla, adentro de un ${ }',                             '<script>const t = `a ${ f("' + RAYOS_X + '") } b`;</script>', 'html', 1],
  ['★ …en una cadena que trae «//» antes (no es un comentario)',          "<script>const u = 'http://x/" + RAYOS_X + "';</script>", 'html', 1],
  ['★ …en una cadena que sigue a una expresión regular con comillas',     "<script>if (/['\"]/.test(a)) {} const t = '" + RAYOS_X + "';</script>", 'html', 1],
  ['★ …en un .gs, en una cadena',                                         "var t = '" + RAYOS_X + "';", 'js', 1],
  ['★ …escrito como &#x1FA7B;',                                           '<div>&#x1FA7B; Imágenes</div>', 'html', 1, '1FA7B'],
  ['★ …escrito como &#129659; (decimal)',                                 '<div>&#129659; Imágenes</div>', 'html', 1, '1FA7B'],
  ['★ …escrito como \\u{1FA7B} en una cadena',                            "var t = '\\u{1FA7B}';", 'js', 1, '1FA7B'],
  ['★ …escrito como par subrogado \\uD83E\\uDE7B',                        "var t = '\\uD83E\\uDE7B';", 'js', 1, '1FA7B'],
  ['★ …y una secuencia ZWJ de 2020 hecha con piezas viejas (corazón en llamas)',   '<span>' + CORAZON_FUEGO + '</span>', 'html', 1],
  ['★ …y ⚧ (el signo es viejo, el emoji es de 2020)',                    '<span>' + String.fromCodePoint(0x26A7, 0xFE0F) + '</span>', 'html', 1],
  ['★ …y el apretón de manos con tono de piel',                          '<span>' + String.fromCodePoint(0x1F91D, 0x1F3FD) + '</span>', 'html', 1],
  ['★ …y la bandera de Sark',                                             '<span>' + String.fromCodePoint(0x1F1E8, 0x1F1F6) + '</span>', 'html', 1],
  ['control · emojis de 2019 o anterior pasan (visto bueno, advertencia, persona de salud, caminando, estetoscopio, brazo)',
   '<span>' + String.fromCodePoint(0x2705, 0x20, 0x26A0, 0xFE0F, 0x20, 0x1F9D1, 0x200D, 0x2695, 0xFE0F, 0x20, 0x1F6B6, 0x200D, 0x2642, 0xFE0F, 0x20, 0x1FA7A, 0x20, 0x1F9BE) + '</span>', 'html', 0],
  ['control · el emoji de la base pasa (🫁)',                            '<span>' + PULMONES + ' VM</span>', 'html', 0],
  ['control · el 🩻 dentro de un comentario de línea no se mira',        "// " + RAYOS_X + " no se usa\nvar a = 1;", 'js', 0],
  ['control · …ni tras código en la misma línea',                        "var a = 1;   // " + RAYOS_X + " no se usa\n", 'js', 0],
  ['control · …ni en las líneas de adentro de un comentario de bloque',  "/* " + RATONERA + " primera\n   segunda " + RAYOS_X + "\n   tercera */\nvar a = 1;", 'js', 0],
  ['control · …ni en un comentario HTML',                                '<!-- ' + RAYOS_X + ' no se usa\n  nunca -->\n<div>hola</div>', 'html', 0],
  ['control · …ni en un comentario CSS',                                 '<style>/* ' + RAYOS_X + ' */ .a{color:red}</style>', 'html', 0],
  ['control · …ni en un comentario de adentro de un ${ }',               "<script>const t = `a ${ f(1 /* " + RAYOS_X + " */) } b`;</script>", 'html', 0],
  ['control · la ratonera 🪤 de los comentarios no cuenta',              "<script>// " + RATONERA + " trampa\nvar a = 1;</script>", 'html', 0],
  ['control · pero una ratonera 🪤 en la pantalla SÍ es un emoji nuevo', '<div>' + RATONERA + '</div>', 'html', 1],
  ['control · una barra de división no abre un comentario',              "var a = b / 2; var c = d / 3; var t = '" + RAYOS_X + "';", 'js', 1],
];
for (const [desc, txt, modo, esperados, clave] of casos) {
  const r = analizar(txt, modo);
  si(desc + ' (' + esperados + ')', r.nuevos.length === esperados && r.problemas.length === 0 && (!clave || r.nuevos.every(h => h.clave === clave)),
     'encontró ' + r.nuevos.length + ' y ' + r.problemas.length + ' problemas del lector: ' + JSON.stringify(r.nuevos.map(h => h.clave).concat(r.problemas)));
}
const baseOk = analizar('<span>' + PULMONES + '</span>', 'html');
si('control · el de la base se cuenta aparte, no como nuevo', baseOk.nuevos.length === 0 && baseOk.enBase.length === 1);
si('control · el número de línea del hallazgo es el de la línea (3)', analizar('a\n<!-- c -->\n<b>' + RAYOS_X + '</b>', 'html').nuevos[0].linea === 3);
si('control · la tabla de asignados distingue 2019 de 2020 (🩺 sí, 🫁 y 🩻 no)',
   esAsignadoA2019(0x1FA7A) && !esAsignadoA2019(0x1FAC1) && !esAsignadoA2019(0x1FA7B) && esAsignadoA2019(0x2705) && !esAsignadoA2019(0x1FAFF));

/* ══ 2 · LOS ARCHIVOS REALES SE LEEN ENTEROS ═══════════════════════════════════════════════════════════════════════════════════ */
console.log('\n2 · Se leen los archivos de ' + path.relative(process.cwd(), DIR) + '/ sin descarrilar el lector');
const ARCHIVOS = [];
if (!fs.existsSync(DIR)) { si('existe la carpeta ' + DIR, false); }
else {
  for (const f of fs.readdirSync(DIR).sort()) {
    if (/\.gs$/.test(f)) ARCHIVOS.push({ f, modo: 'js' });
    else if (/\.html$/.test(f)) ARCHIVOS.push({ f, modo: 'html' });
  }
}
si('está index.html', ARCHIVOS.some(a => a.f === 'index.html'));
si('hay .gs que mirar (todo v2/*.gs, no una lista a mano)', ARCHIVOS.filter(a => a.modo === 'js').length >= 20,
   ARCHIVOS.filter(a => a.modo === 'js').length + ' archivos .gs');
const reales = [];     // { f, nuevos, enBase }
let leidos = 0;
for (const a of ARCHIVOS) {
  const txt = fs.readFileSync(path.join(DIR, a.f), 'utf8');
  const r = analizar(txt, a.modo);
  leidos += txt.length;
  // Prueba independiente del lector: el JavaScript SIN los comentarios que él marcó tiene que seguir compilando. Si se hubiera
  // llevado un pedazo de código por comentario (o dejado una cadena a medias), el motor lo rechaza.
  const roto = [];
  for (const [d, h] of r.scripts) {
    let limpio = '';
    for (let i = d; i < h; i++) limpio += (r.mascara[i] && txt[i] !== '\n') ? ' ' : txt[i];
    try { new vm.Script(limpio, { filename: a.f }); } catch (e) { roto.push(e.message); }
  }
  si('se lee ' + a.f + ' entero (sin cadenas ni comentarios sin cerrar, y su JavaScript sin comentarios compila)',
     r.problemas.length === 0 && roto.length === 0, r.problemas.concat(roto).slice(0, 3).join(' | '));
  reales.push({ f: a.f, nuevos: r.nuevos, enBase: r.enBase });
}
si('se leyó contenido de verdad (más de 1 MB entre pantalla y servidor)', leidos > 1000000, leidos + ' caracteres');

/* ══ 3 · LA BASE ES LA REALIDAD: NI UN EMOJI NUEVO, NI UNO DE LA BASE QUE YA NO ESTÉ ════════════════════════════════════════ */
console.log('\n3 · Ningún emoji de 2020 en adelante fuera de la base');
if (LISTAR) {
  console.log('\n--listar · emojis de 2020 en adelante que hay en pantalla (los comentarios no cuentan):');
  const por = new Map();
  for (const r of reales) for (const h of r.nuevos.concat(r.enBase)) {
    if (!por.has(h.clave)) por.set(h.clave, { texto: h.texto, motivo: h.motivo, archivos: new Map() });
    const e = por.get(h.clave); e.archivos.set(r.f, (e.archivos.get(r.f) || []).concat(h.linea));
  }
  for (const [clave, e] of por) {
    const total = Array.from(e.archivos.values()).reduce((x, l) => x + l.length, 0);
    console.log('  ' + e.texto + '  ' + clave + '  (' + total + ' usos)  ' + (CLAVES_BASE.has(clave) ? 'en la base' : 'NO ESTÁ EN LA BASE') + ' — ' + e.motivo);
    for (const [f, ls] of e.archivos) console.log('      ' + f + ': líneas ' + ls.join(', '));
  }
  console.log('');
}
const todosNuevos = [];
for (const r of reales) for (const h of r.nuevos) todosNuevos.push(Object.assign({ f: r.f }, h));
si('★ no hay ningún emoji de 2020 en adelante fuera de la base', todosNuevos.length === 0, todosNuevos.length + ' hallazgo(s)');
for (const h of todosNuevos.slice(0, 25)) {
  console.log('   ❌ ' + h.f + ':' + h.linea + '  ' + h.texto + '  (' + h.clave + ') — ' + h.motivo);
}
if (todosNuevos.length) {
  console.log('\n   El Chrome del hospital corre en Windows 10 y su fuente no trae los emojis de 2020 en adelante: salen como un CUADRADO');
  console.log('   (le pasó al 🩻). Para un ícono nuevo: un SVG propio o un emoji de 2019 o anterior. NO se agrega a BASE para hacer');
  console.log('   pasar la guardia: eso es una decisión de Diego. Si es una secuencia ZWJ ANTERIOR a 2020, se revisa su año y se anota en');
  console.log('   ZWJ_ANTIGUAS. Dentro de un comentario el emoji no molesta (no se dibuja).');
}
const visto = new Map();
for (const r of reales) for (const h of r.enBase) visto.set(h.clave, (visto.get(h.clave) || 0) + 1);
for (const b of BASE) {
  si('★ no es una guardia vacía: ' + glifo(b.clave) + ' (' + b.nombre + ', ' + b.version + ') sigue en la pantalla o en el servidor',
     visto.has(b.clave), 'ya no aparece fuera de comentarios: si se quitó, se BORRA de BASE y el candado se aprieta');
}
const sinNombre = BASE.filter(b => !b.nombre || !b.version || !b.sitios);
si('cada emoji de la base dice qué es, de qué año es y dónde vive', sinNombre.length === 0);

/* ══ 4 · PRUEBA ROJA PERMANENTE: UN 🩻 INYECTADO EN LA PANTALLA REAL TIENE QUE SER RECHAZADO ═════════════════════════════════ */
console.log('\n4 · Prueba roja permanente (en memoria, no toca el archivo)');
const indice = ARCHIVOS.find(a => a.f === 'index.html');
if (indice) {
  const real = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  // Se inyecta justo después de abrir el <body>: es texto de pantalla en cualquier versión del archivo, sin atarse a un título.
  const abre = real.indexOf('<body');
  const donde = abre < 0 ? -1 : real.indexOf('>', abre) + 1;
  si('hay un lugar de pantalla donde inyectar (el inicio del <body>)', donde > 0);
  if (donde > 0) {
    const antes = analizar(real, 'html').nuevos.length;
    const r = analizar(real.slice(0, donde) + RAYOS_X + ' ' + real.slice(donde), 'html');
    si('★★ con un 🩻 inyectado en la pantalla real, el candado lo caza (acá se colaba)',
       r.nuevos.length === antes + 1 && r.nuevos.some(h => h.clave === '1FA7B'), 'antes ' + antes + ', ahora ' + r.nuevos.length);
    const enComentario = real.slice(0, donde) + '<!-- ' + RAYOS_X + ' -->' + real.slice(donde);
    si('★ …y el mismo 🩻 dentro de un comentario NO lo caza (no se dibuja)', analizar(enComentario, 'html').nuevos.length === antes);
  }
}

console.log('');
if (fails.length) {
  console.log('❌ emojis_nuevos: ' + fails.length + ' fallo(s):');
  fails.forEach(f => console.log('   · ' + f));
  process.exit(1);
}
console.log('✅ emojis_nuevos: ningún emoji de 2020 en adelante fuera de los que ya vivían en producción (' + BASE.length + ' en la base).');
