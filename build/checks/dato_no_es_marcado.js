// dato_no_es_marcado.js — 🔴 LO QUE ESCRIBE UNA PERSONA NO SE CONVIERTE EN
// MARCADO (15-sep-2026).
//
// DE DÓNDE SALE. Es el principio no negociable §2.3 del plan maestro: «todo
// valor de paciente se inserta con escapeHtml() o vía nodos DOM. Cero
// innerHTML crudo con datos de usuario». La tanda G1 unificó los NUEVE
// escapadores que había en uno solo, pero eso no prueba que se USEN: un
// barrido del archivo encontró 804 interpolaciones dentro de plantillas HTML
// que no pasan por ningún escapador, y 41 con pinta de dato de paciente.
//
// CONTAR INTERPOLACIONES NO SIRVE. La mayoría de esas 804 son clases CSS,
// números y ternarios entre literales, y revisarlas a mano una por una es un
// trabajo que se hace mal y que además hay que rehacer con cada línea nueva.
// Esta guardia mide el EFECTO: siembra un paciente cuyo nombre, diagnóstico y
// observaciones traen marcado de verdad, pinta las vistas, y exige que ese
// marcado siga siendo TEXTO.
//
// 🪤 Por qué se prueba con `<b>` y no con algo llamativo: el caso real no es
// un ataque, es un diagnóstico escrito a mano que dice «PaFi <100» o un
// apellido con comilla. Si el `<b>` se interpreta, el «<100» también se come
// el resto de la línea, y el dato desaparece de la pantalla sin que nadie se
// entere.
//
// Uso: node build/checks/dato_no_es_marcado.js
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const S = require(path.join(__dirname, '..', 'sim', 'sim_srv.js'));

const pad = n => String(n).padStart(2, '0');
const HOY = new Date();
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
S.SIM.fecha = iso(HOY);
S.SIM.hora = '11:00:00';

// La carga: marcado que se NOTA si se interpreta. `<b>` deja un elemento en el
// DOM; la comilla doble parte un atributo; `&` delata un doble escapado.
const NOMBRE_SUCIO  = 'Ana <b>Mar"ía</b> Pérez & Soto';
const DIAG_SUCIO    = 'PaFi <100 con <i>derrame</i> "tabicado" & fiebre';
const MARCA = 'rce-prueba-marcado';

for (let i = 1; i <= 4; i++) {
  const c = S.DB.CAMAS_ESTADO.find(x => String(x.ID_CAMA) === String(i));
  Object.assign(c, {
    OCUPADA: true, STATUS_CAMA: 'Ocupada', PATIENT_ID: 'p' + i, COD_PACIENTE: 'C' + i,
    NOMBRE: NOMBRE_SUCIO, EDAD: 60 + i, SEXO: i % 2 ? 'M' : 'F', DIAGNOSTICO: DIAG_SUCIO,
    VIA_AEREA: 'TOT', SOPORTE: 'VM', MODO: 'ACVC', TALLA_CM: 170,
    FECHA_INGRESO: iso(new Date(HOY - 6 * 864e5)),
    FECHA_INICIO_SOPORTE: iso(new Date(HOY - 6 * 864e5)),
    FECHA_INICIO_VA: iso(new Date(HOY - 6 * 864e5)), FIRMA_KINE: 'DMV',
  });
}

const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined ? '' : ' — ' + detalle));
  if (!cond) fails.push(l);
};

const VISTAS = [
  ['la grilla de camas', "setTab('G')"],
  ['el registro diario', "setTab('P')"],
  ['la entrega de turno', "setTab('E')"],
  // El historial hoy está limpio; entra igual para que siga estándolo.
  ['el historial del paciente', "setTab('G'); abrirTL('1')"],
];
// 🪤 Archivados queda fuera: sin episodios egresados sembrados la vista sale
// vacía y la guardia daría verde sin haber mirado nada. Dicho acá para que no
// se lea como un olvido.

(async () => {
  const compilado = path.join(__dirname, '..', '_marcado.html');
  fs.writeFileSync(compilado, fs.readFileSync(path.join(__dirname, '..', '..', 'v2', 'index.html'), 'utf8')
    .replace(/<\?=[\s\S]*?\?>/g, ''));

  const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pagina = await navegador.newPage({ viewport: { width: 1400, height: 950 } });
  const errores = [];
  pagina.on('pageerror', e => errores.push(e.message));
  await pagina.exposeFunction('__gasApi', (a, d, t) => {
    let r; try { r = S.api(a, d, t); } catch (e) { r = { ok: false, error: e.message }; }
    return JSON.stringify(r);
  });
  await pagina.addInitScript(() => {
    window.google = { script: { run: { withSuccessHandler(o) { return { withFailureHandler(f) { return {
      async api(a, d, t) { const r = JSON.parse(await window.__gasApi(a, d || {}, t || null)); if (r.ok) o(r); else f(r.error); }
    }; } }; } } } };
  });
  await pagina.goto('file://' + compilado);
  await pagina.waitForTimeout(1400);

  // Se marcan los elementos que YA existían con marcado propio, para no
  // confundirlos con los inyectados por el dato.
  for (const [nombreVista, js] of VISTAS) {
    try { await pagina.evaluate(js); } catch (e) { si('se pudo abrir ' + nombreVista, false, e.message); continue; }
    await pagina.waitForTimeout(800);

    const r = await pagina.evaluate(({ nombre, diag }) => {
      // ¿Aparece el texto sucio COMPLETO en algún nodo de texto? Si el marcado
      // se interpretó, el texto queda partido y el original ya no está entero.
      const todo = document.body.innerText;
      const nombreEntero = todo.includes(nombre);
      const diagEntero = todo.includes(diag);

      // ¿Nació un <b> o un <i> que no debería existir, con el texto del dato?
      const inyectados = [];
      document.querySelectorAll('b, i').forEach(n => {
        const t = n.textContent.trim();
        if (t === 'Mar"ía' || t === 'derrame' || t === 'Mar"ía') inyectados.push(n.tagName + ':' + t);
      });

      // ¿Algún atributo quedó partido por la comilla? Se delata como un
      // atributo basura con el resto del nombre.
      const atributosRotos = [];
      document.querySelectorAll('[\\ía], [ía], [soto], [\\&]').forEach(n => atributosRotos.push(n.tagName));
      document.querySelectorAll('*').forEach(n => {
        for (const a of n.attributes) {
          if (/^(ía|soto|b>|i>|100)/.test(a.name)) {
            atributosRotos.push(n.tagName + '[' + a.name + '] → ' +
              n.outerHTML.replace(/\s+/g, ' ').slice(0, 130));
          }
        }
      });
      return { nombreEntero, diagEntero, inyectados, atributosRotos };
    }, { nombre: NOMBRE_SUCIO, diag: DIAG_SUCIO });

    // 🪤 El registro y la entrega RECORTAN el nombre a propósito para que quepa
    // en la columna, así que ahí el texto entero no puede aparecer y exigirlo
    // sería exigir que no recorten. Lo que sí vale en toda vista es que el
    // trozo visible no traiga marcado interpretado: eso lo miden las dos
    // comprobaciones siguientes.
    if (nombreVista === 'la grilla de camas') {
      si('en ' + nombreVista + ', el nombre se lee tal como se escribió',
        r.nombreEntero, 'el texto no aparece entero: el marcado se interpretó y partió el dato');
    }
    si('en ' + nombreVista + ', ningún <b> ni <i> nació del dato',
      r.inyectados.length === 0, '\n      ' + [...new Set(r.inyectados)].join('\n      '));
    si('en ' + nombreVista + ', ninguna comilla del dato partió un atributo',
      r.atributosRotos.length === 0, '\n      ' + [...new Set(r.atributosRotos)].slice(0, 4).join('\n      '));
  }

  /* ── El diagnóstico, que es donde el «<» aparece de verdad ─────────────── */
  await pagina.evaluate(() => setTab('G'));
  await pagina.waitForTimeout(700);
  const dx = await pagina.evaluate(() => {
    const n = document.querySelector('#bedGrid .bdx');
    return n ? { texto: n.textContent, title: n.getAttribute('title') || '', hijos: n.children.length } : null;
  });
  si('la tarjeta pinta el diagnóstico', !!dx, 'no se encontró .bdx');
  if (dx) {
    si('el «<100» del diagnóstico sigue siendo texto en la tarjeta',
      dx.texto.includes('<100'), 'quedó: ' + JSON.stringify(dx.texto));
    si('el diagnóstico no metió elementos dentro de la tarjeta',
      dx.hijos === 0, dx.hijos + ' elementos hijos');
    si('el globo de ayuda del diagnóstico conserva las comillas',
      dx.title.includes('"tabicado"') || dx.title === '' , 'quedó: ' + JSON.stringify(dx.title));
  }

  si('sin errores de JavaScript', errores.length === 0, errores.slice(0, 3).join(' | '));

  await navegador.close();
  fs.unlinkSync(compilado);
  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLOS' : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
