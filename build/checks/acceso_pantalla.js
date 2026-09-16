// acceso_pantalla.js — 🔐 LA PUERTA DEL TURNO, EN UN NAVEGADOR DE VERDAD
// (15-sep-2026).
//
// `acceso_equipo.js` prueba el servidor: claves, sesiones, espera por intentos.
// Esta prueba lo OTRO, que es donde se rompen los login: que con el candado
// puesto la app no se abra sola, que la puerta aparezca, que al entrar con la
// clave correcta se pase, y que una clave temporal obligue a elegir una nueva
// antes de dejar entrar.
//
// 🪤 Por qué hace falta además de la del servidor: un login puede estar
// perfecto por dentro y no servir porque la pantalla nunca lo llama, o porque
// llama a la acción equivocada, o porque el token no viaja. Eso no se ve
// leyendo el código; se ve abriendo la app.
//
// 🪤 El estado arranca APAGADO y se enciende dentro de la propia corrida, con
// el mismo `accesoEncender()` que va a usar Diego. Así se prueba también que
// encenderlo no requiera pegar nada.
//
// Uso: node build/checks/acceso_pantalla.js
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const S = require(path.join(__dirname, '..', 'sim', 'sim_srv.js'));

// El simulador no carga los módulos de identidad: se completan acá igual que
// hace `rut_minimo.js`, sin tocar su lista (otras guardias dependen de ella).
// 🪤 `infra_respuesta.gs` va primero aunque el simulador ya lo cargó: sus
// `const` (ERR y los códigos de error) NO cuelgan de globalThis con eval
// indirecto —solo function y var lo hacen—, así que un servicio evaluado en
// OTRO ámbito revienta con «ERR is not defined» en cuanto toma un camino de
// error. Acá se vio con una clave equivocada: el camino feliz pasaba y el
// mensaje de error moría. Es la misma trampa anotada en CLAUDE.md.
const V2 = path.resolve(__dirname, '..', '..', 'v2');
(0, eval)(['infra_respuesta.gs', 'infra_auth.gs', 'svc_acceso.gs']
  .map(f => fs.readFileSync(path.join(V2, f), 'utf8')).join('\n;\n'));

const pad = n => String(n).padStart(2, '0');
const HOY = new Date();
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
S.SIM.fecha = iso(HOY);
S.SIM.hora = '11:00:00';
for (let i = 1; i <= 4; i++) {
  const c = S.DB.CAMAS_ESTADO.find(x => String(x.ID_CAMA) === String(i));
  Object.assign(c, { OCUPADA: true, STATUS_CAMA: 'Ocupada', PATIENT_ID: 'p' + i, COD_PACIENTE: 'C' + i,
    NOMBRE: 'Paciente ' + i, EDAD: 60 + i, SEXO: 'F', DIAGNOSTICO: 'Neumonía grave',
    VIA_AEREA: 'TOT', SOPORTE: 'VM', MODO: 'ACVC', TALLA_CM: 165,
    FECHA_INGRESO: iso(new Date(HOY - 5 * 864e5)), FIRMA_KINE: 'DMV' });
}

const fails = [];
const si = (l, cond, detalle) => {
  console.log((cond ? '✅' : '❌') + ' ' + l + (cond || detalle === undefined ? '' : ' — ' + detalle));
  if (!cond) fails.push(l);
};

(async () => {
  /* ── Se enciende con la misma función que usará Diego ─────────────────── */
  const sembradas = global.accesoSembrarClaves();
  si('accesoSembrarClaves reparte una clave por kinesiólogo activo',
    sembradas.length >= 3, sembradas.length + ' claves');
  const CLAVE_TEMP = String(sembradas.find(x => /^DMV/.test(x)) || '').split('→ ').pop().trim();
  si('la clave temporal de DMV se pudo leer del reparto', CLAVE_TEMP.length >= 6, CLAVE_TEMP);
  si('🔴 accesoEncender() funciona una vez repartidas', global.accesoEncender() === true);
  si('…y la configuración quedó encendida', global.accesoActivo() === true);

  const compilado = path.join(__dirname, '..', '_acceso.html');
  fs.writeFileSync(compilado, fs.readFileSync(path.join(V2, 'index.html'), 'utf8').replace(/<\?=[\s\S]*?\?>/g, ''));

  const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  pagina.on('pageerror', e => errores.push(e.message));
  await pagina.exposeFunction('__gasApi', (a, d, t) => {
    let r; try { r = global.api(a, d, t); } catch (e) { r = { ok: false, error: 'EXCEPCIÓN: ' + e.message }; }
    return JSON.stringify(r);
  });
  await pagina.addInitScript(() => {
    window.google = { script: { run: { withSuccessHandler(o) { return { withFailureHandler(f) { return {
      async api(a, d, t) { const r = JSON.parse(await window.__gasApi(a, d || {}, t || null)); if (r.ok) o(r); else f(r.error); }
    }; } }; } } } };
  });
  await pagina.goto('file://' + compilado);
  await pagina.waitForTimeout(1800);

  const visible = id => pagina.evaluate(i => {
    const n = document.getElementById(i); if (!n) return false;
    const r = n.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(n).display !== 'none';
  }, id);

  /* ── 1 · Con el candado puesto, la app no se abre sola ────────────────── */
  si('🔴 con el acceso puesto la app NO entra sola: aparece la puerta', await visible('loginOvl'),
    'la pantalla de acceso no se mostró y el censo quedó a la vista de cualquiera');
  si('…y la puerta es la del turno, no la de Google', await visible('accForm'));
  si('…con su campo de firma y su campo de clave',
    (await visible('accUsr')) && (await visible('accClave')));
  si('…y NO se dibujó la grilla de camas detrás',
    (await pagina.evaluate(() => document.querySelectorAll('#bedGrid .bcard').length)) === 0,
    'el censo se pintó igual: el candado no está frenando la carga');

  /* ── 2 · Una clave equivocada no entra, y lo dice ─────────────────────── */
  await pagina.fill('#accUsr', 'DMV');
  await pagina.fill('#accClave', 'no-es-esta');
  await pagina.click('#accBtn');
  await pagina.waitForTimeout(700);
  si('con la clave equivocada no se entra', await visible('accForm'));
  si('…y la pantalla explica por qué',
    /incorrect/i.test(await pagina.textContent('#loginMsg') || ''),
    await pagina.textContent('#loginMsg'));

  /* ── 3 · La clave temporal obliga a elegir una nueva ──────────────────── */
  await pagina.fill('#accClave', CLAVE_TEMP);
  await pagina.click('#accBtn');
  await pagina.waitForTimeout(900);
  si('🔴 con una clave temporal NO se entra de largo: pide una propia',
    await visible('accNuevaBox'),
    'entró con la clave que le repartió otra persona');
  si('…y lo dice con todas sus letras',
    /temporal/i.test(await pagina.textContent('#loginMsg') || ''),
    await pagina.textContent('#loginMsg'));

  /* ── 4 · Con la clave nueva se entra y la identidad queda puesta ──────── */
  await pagina.fill('#accNueva', 'mi-clave-propia');
  await pagina.click('#accBtn');
  await pagina.waitForTimeout(2200);          // cambia la clave y recarga

  si('tras elegir su clave, la puerta se cierra', !(await visible('loginOvl')));
  si('…y ahora sí se pinta el censo',
    (await pagina.evaluate(() => document.querySelectorAll('#bedGrid .bcard').length)) > 0);
  si('🔴 la cabecera muestra la firma de quien entró, no «Sin usuario»',
    (await pagina.textContent('#hSesUsrTxt') || '').trim() === 'DMV',
    'dice: ' + (await pagina.textContent('#hSesUsrTxt') || ''));
  si('el token quedó guardado para sobrevivir a un F5',
    !!(await pagina.evaluate(() => { try { return sessionStorage.getItem('rce_acceso_token'); } catch (e) { return null; } })));

  /* ── 5 · La clave vieja ya no sirve, y el servidor lo confirma ────────── */
  si('la clave temporal dejó de servir',
    global.accesoEntrar({ usuario: 'dmv', clave: CLAVE_TEMP }).ok === false);
  si('la clave elegida por la persona sirve',
    global.accesoEntrar({ usuario: 'dmv', clave: 'mi-clave-propia' }).ok === true);

  si('sin errores de JavaScript en toda la corrida', errores.length === 0, errores.slice(0, 3).join(' | '));

  await navegador.close();
  fs.unlinkSync(compilado);
  console.log(fails.length ? '\n❌ ' + fails.length + ' FALLOS' : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
