// el_equipo_no_va_en_el_codigo.js — Los nombres del equipo viven en la
// PLANILLA, nunca en el código (19-sep-2026).
//
// 🔴 DE DÓNDE SALE. Buscando por qué a Diego no le aparecía la firma, apareció
// que los QUINCE nombres completos de los kinesiólogos estaban escritos a mano
// en dos lugares del código: la semilla de `esquema.gs` y una lista `ROSTER`
// dentro de `index.html`.
//
// La del index es la grave: `index.html` se empaqueta tal cual en `pwa/`, que
// es lo que se publica como sitio. Y GitHub Pages con cuenta gratis EXIGE que
// el repositorio sea público. O sea que la nómina del equipo quedó a la vista
// de cualquiera que abriera la dirección o el repositorio.
//
// CLAUDE.md lo dice desde el 2-sep-2026, a propósito de los cumpleaños:
// «Tampoco datos personales de los funcionarios: se escriben en la planilla,
// no en el código». La regla existía; la lista venía heredada y nadie la miró.
//
// LO QUE FIJA: ni el fuente ni nada de lo que se publica llevan nombres de
// personas. El selector de firma se llena desde la hoja KINESIOLOGOS, que es
// privada porque la planilla lo es.
//
// 🪤 Esta guardia NO puede traer la lista de nombres para buscarlos: eso los
// volvería a escribir en el repositorio, en el archivo que existe justamente
// para evitarlo. Se busca la FORMA de un nombre de persona —dos o más palabras
// capitalizadas seguidas dentro de un dato— no los nombres concretos.

const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..', '..');
const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!okk) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); }
};
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

/* 🪤 NO se busca «un nombre por su forma»: la primera versión de esta guardia
   lo intentó y acusó a «Helvetica Neue», «Modo Coordinación» y «Kinesiterapia
   Respiratoria». Una guardia que grita por cualquier cosa se termina apagando.
   Se busca la ESTRUCTURA del dato, que es inconfundible y no tiene falsos
   positivos: una FIRMA de iniciales pegada a un nombre de persona. Así es como
   se escribe una nómina, en cualquiera de los dos formatos en que estaba:
       ['ABC','Nombre Apellido', …]        (la semilla del esquema)
       { n: 'Nombre Apellido', f: 'ABC' }  (el ROSTER de la interfaz)
   Si no hay listas de personas en el código, no hay nombres que se escapen. */
const NOMINA = [
  // iniciales seguidas de un nombre con al menos dos palabras
  /\[\s*['"][A-ZÁÉÍÓÚÑ]{2,4}['"]\s*,\s*['"][A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+/,
  // un objeto con nombre y firma juntos, en cualquier orden
  /\{\s*n:\s*['"][A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+[^'"]*['"]\s*,\s*f:/,
  /\{\s*f:\s*['"][A-ZÁÉÍÓÚÑ]{2,4}['"]\s*,\s*n:\s*['"][A-ZÁÉÍÓÚÑ][a-záéíóúñ]+\s+/,
];

const revisar = (rel) => {
  const txt = fs.readFileSync(path.join(raiz, rel), 'utf8');
  let n = 0;
  NOMINA.forEach(re => {
    const g = new RegExp(re.source, 'g');
    const h = txt.match(g);
    if (h) n += h.length;
  });
  return n;
};

console.log('\n1 · 🔴 El fuente no lleva una nómina escrita a mano');
[['v2/index.html', 'la interfaz — es la que se publica'],
 ['v2/esquema.gs', 'la semilla de la planilla'],
 ['v2/svc_acceso.gs', 'el acceso del turno'],
 ['v2/svc_coordinacion.gs', 'coordinación']].forEach(([f, por]) => {
  eq('   ' + f + ' (' + por + ')', revisar(f), 0);
});

console.log('\n2 · ★★ Ni lo que se PUBLICA, que es lo que ve cualquiera');
[['pwa/index.html', 'el sitio de GitHub Pages'],
 ['entrega/index.html', 'el paquete del editor'],
 ['entrega/esquema.gs', 'el esquema que se pega']].forEach(([f, por]) => {
  if (!fs.existsSync(path.join(raiz, f))) { console.log('   (no existe todavía: ' + f + ')'); return; }
  eq('   ' + f + ' (' + por + ')', revisar(f), 0);
});

/* 🪤🪤 19-sep-2026 · LO QUE ESTA GUARDIA NO PUEDE HACER, Y POR QUÉ.
   Intenté añadirle un barrido de «nombres completos sueltos», para cazar los
   que no vienen en lista —una firma de prueba, un comentario, un nombre de
   paciente en un smoke test—. Dos intentos, los dos malos:

   1. Buscar un nombre POR SU FORMA acusó a «Helvetica Neue», «Modo
      Coordinación» y «Kinesiterapia Respiratoria».
   2. Buscar los apellidos del equipo obligaba a ESCRIBIRLOS ACÁ. O sea: el
      archivo que existe para que no haya nombres en el repositorio los tenía
      los quince, y se acusó a sí mismo al correr. El comentario de arriba ya
      lo advertía y lo hice igual.

   La versión buena —buscar el contexto, «NOMBRE: …» o «Klgo. …»— caza también
   los nombres INVENTADOS que las pruebas necesitan, y distinguir uno real de
   uno inventado exige una lista de excepciones que crece con cada prueba. Así
   es exactamente como una guardia se pudre (CLAUDE.md).

   Así que no se automatiza. Lo que de verdad protege es lo estructural de
   arriba: si no hay dónde escribir una nómina —porque el equipo llega de la
   planilla— no hay nómina que se escape. Los nombres sueltos que había se
   barrieron a mano el 19-sep y quedan en la bitácora. */

console.log('\n3 · De dónde salen entonces las firmas');
const idx = fs.readFileSync(path.join(raiz, 'v2/index.html'), 'utf8');
const api = fs.readFileSync(path.join(raiz, 'v2/api.gs'), 'utf8');
no('★ el ROSTER ya no es una lista escrita a mano en la interfaz',
   /const ROSTER = \[\s*\{/.test(idx));
si('★★ el arranque trae el equipo desde la planilla', /equipo:/.test(api));
si('   y lo lee de la hoja KINESIOLOGOS',
   /repoLeerTodos\('KINESIOLOGOS'\)/.test(fs.readFileSync(path.join(raiz, 'v2/svc_turnos.gs'), 'utf8')));

console.log('\n4 · 🪤 Y si la hoja está vacía, la app lo DICE');
// La lección del mensaje de arranque: un selector mudo manda a buscar al lugar
// equivocado. Sin firmas cargadas, el colega tiene que saber por qué.
si('★ el selector de firma avisa cuando la hoja está vacía',
   /Falta cargar el equipo/.test(idx));
si('   …y dice dónde se carga, no solo que falta',
   /Falta cargar el equipo[\s\S]{0,120}KINESIOLOGOS/.test(idx));

console.log(fails.length ? '\n❌ ' + fails.length + ' FALLOS' : '\n✅ el equipo vive en la planilla, no en el código');
process.exit(fails.length ? 1 : 0);
