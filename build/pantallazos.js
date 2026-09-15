/**
 * pantallazos.js — Fotos de la aplicación corriendo, para mirarla en vez de
 * imaginársela.
 *
 * Levanta el CLIENTE real (v2/index.html en Chromium) contra el SERVIDOR real
 * (los .gs en Node, vía build/sim/sim_srv.js) con una unidad sembrada, y
 * guarda una imagen por vista en escritorio y en teléfono.
 *
 * No es una guardia: no juzga nada, solo deja las imágenes. Sirve para
 * trabajar la estética sin adivinar y para comparar un antes y un después.
 *
 * Uso: node build/pantallazos.js [carpeta_salida]
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require(path.join(__dirname, 'node_modules', 'playwright-core'));
const S = require('./sim/sim_srv.js');

const SALIDA = process.argv[2] || path.join(__dirname, 'pantallazos');
const V2 = path.join(__dirname, '..', 'v2');

/* ── Una unidad con pacientes de perfiles distintos ─────────────────────── */
const PACIENTES = [
  //                                                                                                            días de estadía ↓  ↓ días de soporte
  { cama: '1',  nombre: 'Rosa Elena Contreras Pino',   edad: 74, sexo: 'F', dx: 'Neumonía grave adquirida en la comunidad', va: 'TOT',     sop: 'VM',       dias: 9,  sopDias: 9,  fase: 'Weaning' },
  { cama: '2',  nombre: 'Luis Alberto Márquez Soto',   edad: 58, sexo: 'M', dx: 'Shock séptico de foco abdominal',           va: 'TOT',     sop: 'VM',       dias: 3,  sopDias: 3,  fase: 'Reanimación inicial' },
  { cama: '3',  nombre: 'Marta Inés Pizarro Olguín',   edad: 66, sexo: 'F', dx: 'EPOC reagudizado',                          va: 'Natural', sop: 'VNI',      dias: 5,  sopDias: 2,  fase: 'Weaning' },
  { cama: '4',  nombre: 'Jorge Andrés Vega Muñoz',     edad: 41, sexo: 'M', dx: 'Politraumatismo por accidente de tránsito', va: 'TQT',     sop: 'VM',       dias: 24, sopDias: 21, fase: 'Rehabilitación' },
  { cama: '5',  nombre: 'Carmen Gloria Ríos Tapia',    edad: 81, sexo: 'F', dx: 'Insuficiencia cardíaca descompensada',      va: 'Natural', sop: 'CNAF',     dias: 2,  sopDias: 2,  fase: 'Reanimación inicial' },
  { cama: '6',  nombre: 'Pedro Antonio Silva Cortés',  edad: 63, sexo: 'M', dx: 'Hemorragia subaracnoidea',                  va: 'TOT',     sop: 'VM',       dias: 12, sopDias: 12, fase: 'Neuroprotección' },
  { cama: '7',  nombre: 'Ana María Fuentes Lagos',     edad: 52, sexo: 'F', dx: 'Pancreatitis aguda grave',                  va: 'Natural', sop: 'Ambiente', dias: 7,  sopDias: 0,  fase: 'Rehabilitación' },
  { cama: '9',  nombre: 'Héctor Manuel Rojas Díaz',    edad: 70, sexo: 'M', dx: 'Postoperatorio de cirugía cardíaca',        va: 'TOT',     sop: 'VM',       dias: 1,  sopDias: 1,  fase: 'Postoperatorio inmediato' },
  { cama: '11', nombre: 'Sofía Belén Cáceres Núñez',   edad: 34, sexo: 'F', dx: 'Estatus asmático',                          va: 'Natural', sop: 'CNAF',     dias: 4,  sopDias: 4,  fase: 'Weaning' },
];

// 🪤 El reloj del servidor simulado tiene que coincidir con el del equipo: si no,
// la app abre con la franja roja de «el reloj difiere del servidor» y las fotos
// muestran una alarma que no existe, además de contar mal los días de estadía.
const HOY = new Date();
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const menosDias = n => iso(new Date(HOY.getTime() - n * 86400000));
S.SIM.fecha = iso(HOY);
S.SIM.hora = pad(HOY.getHours()) + ':' + pad(HOY.getMinutes()) + ':00';

for (const p of PACIENTES) {
  const c = S.DB.CAMAS_ESTADO.find(x => String(x.ID_CAMA) === p.cama);
  Object.assign(c, {
    OCUPADA: true, STATUS_CAMA: 'Ocupada', PATIENT_ID: 'pid-' + p.cama, COD_PACIENTE: 'C' + p.cama,
    NOMBRE: p.nombre, EDAD: p.edad, SEXO: p.sexo, DIAGNOSTICO: p.dx,
    VIA_AEREA: p.va, SOPORTE: p.sop, MODO: p.sop === 'VM' ? 'ACVC' : '',
    TALLA_CM: p.sexo === 'F' ? 158 : 173,
    FECHA_INGRESO: menosDias(p.dias - 1), TS_INGRESO: menosDias(p.dias - 1) + ' 08:30',
    FECHA_INICIO_SOPORTE: p.sopDias ? menosDias(p.sopDias - 1) : '',
    FECHA_INICIO_VA: p.sopDias ? menosDias(p.sopDias - 1) : '',
    FIRMA_KINE: 'DMV', FASE_CLINICA: p.fase,
    BARTHEL: p.dias > 6 ? 35 : '', ECF: p.dias > 6 ? 2 : '',
  });
}

/* ── Las vistas que se fotografían ──────────────────────────────────────── */
const VISTAS = [
  { id: 'general',      titulo: 'General · grilla de camas', js: "setTab('G')" },
  { id: 'registro',     titulo: 'Registro diario',           js: "setTab('P')" },
  { id: 'estadisticas', titulo: 'Estadísticas',              js: "setTab('D')" },
  { id: 'entrega',      titulo: 'Entrega de turno',          js: "setTab('E')" },
  { id: 'archivados',   titulo: 'Archivados',                js: "setTab('A')" },
  { id: 'ventiladores', titulo: 'Ventiladores',              js: "setTab('V')" },
];

(async () => {
  fs.mkdirSync(SALIDA, { recursive: true });
  // Compilar la plantilla como lo hace Apps Script (scriptlet → '')
  const compilado = path.join(SALIDA, '_app.html');
  fs.writeFileSync(compilado, fs.readFileSync(path.join(V2, 'index.html'), 'utf8').replace(/<\?=[\s\S]*?\?>/g, ''));

  const navegador = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const errores = [];

  async function sesion(nombre, viewport) {
    const pagina = await navegador.newPage({ viewport, deviceScaleFactor: 2 });
    pagina.on('pageerror', e => errores.push(nombre + ': ' + e.message));
    await pagina.exposeFunction('__gasApi', (a, d, t) => {
      let r; try { r = S.api(a, d, t); } catch (e) { r = { ok: false, error: 'EXCEPCIÓN: ' + e.message }; }
      return JSON.stringify(r);
    });
    await pagina.addInitScript(() => {
      window.google = { script: { run: { withSuccessHandler(okF) { return { withFailureHandler(failF) { return {
        async api(a, d, t) {
          const r = JSON.parse(await window.__gasApi(a, d || {}, t || null));
          if (r.ok) okF(r); else failF(r.error || 'error');
        }
      }; } }; } } } };
    });
    await pagina.goto('file://' + compilado);
    await pagina.waitForTimeout(1400);
    // El globo del tutorial y los avisos flotantes tapan una esquina en cada
    // foto. Se cierran como los cerraría cualquiera al entrar.
    await pagina.evaluate(() => {
      try { if (typeof tutHolaCerrar === 'function') tutHolaCerrar(); } catch (e) {}
      document.querySelectorAll('.tut-hola, .toast, .tut-bubble').forEach(n => n.remove());
    });
    await pagina.waitForTimeout(200);
    return pagina;
  }

  const hechos = [];
  async function foto(pagina, archivo, etiqueta) {
    const destino = path.join(SALIDA, archivo);
    await pagina.screenshot({ path: destino, fullPage: false });
    hechos.push(archivo);
    console.log('  📸 ' + etiqueta + ' → ' + archivo);
  }

  /* ── Escritorio ───────────────────────────────────────────────────────── */
  console.log('ESCRITORIO 1400×950');
  const esc = await sesion('escritorio', { width: 1400, height: 950 });
  for (const v of VISTAS) {
    try { await esc.evaluate(v.js); } catch (e) { errores.push('vista ' + v.id + ': ' + e.message); }
    await esc.waitForTimeout(700);
    await foto(esc, 'escritorio-' + v.id + '.png', v.titulo);
  }
  // El panel de evolución, que es donde se pasa el turno entero
  try {
    await esc.evaluate(() => { setTab('G'); abrirPanel('1', false); });
    await esc.waitForTimeout(900);
    await foto(esc, 'escritorio-panel.png', 'Panel de evolución');
    await esc.evaluate(() => { try { cerrarEgreso(); } catch (e) {} document.getElementById('sp').classList.remove('on'); document.getElementById('ovl').classList.remove('on'); });
  } catch (e) { errores.push('panel: ' + e.message); }
  await esc.close();

  /* ── Notebook del hospital (1366×768, Windows 10) ─────────────────────── */
  console.log('NOTEBOOK 1366×768');
  const note = await sesion('notebook', { width: 1366, height: 768 });
  for (const v of VISTAS.slice(0, 2)) {
    try { await note.evaluate(v.js); } catch (e) { errores.push('1366 ' + v.id + ': ' + e.message); }
    await note.waitForTimeout(700);
    await foto(note, 'notebook-' + v.id + '.png', v.titulo);
  }
  await note.close();

  /* ── Teléfono ─────────────────────────────────────────────────────────── */
  console.log('TELÉFONO 390×844');
  const mov = await sesion('movil', { width: 390, height: 844 });
  for (const v of VISTAS.slice(0, 3)) {
    try { await mov.evaluate(v.js); } catch (e) { errores.push('móvil ' + v.id + ': ' + e.message); }
    await mov.waitForTimeout(700);
    await foto(mov, 'movil-' + v.id + '.png', v.titulo);
  }
  await mov.close();

  await navegador.close();
  fs.unlinkSync(compilado);
  console.log('\n' + hechos.length + ' imágenes en ' + SALIDA);
  if (errores.length) { console.log('\n⚠️ errores de la página:'); errores.forEach(e => console.log('   · ' + e)); }
})();
