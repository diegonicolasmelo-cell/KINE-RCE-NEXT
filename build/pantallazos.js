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
 * 🗂️ 10-oct-2026 · TANDA 5 (limpieza visual del registro de evolución): además de
 * las vistas de siempre saca LOS SEIS PASOS DEL PANEL y EL TABLERO a 390 px y a
 * 1400 px, y vuelca `medidas.json` (la letra más chica que se ve en cada pantalla
 * y los botones del pie de cada tarjeta). Casi todo lo de esa tanda eran hipótesis
 * calculadas desde el CSS —envolturas, alturas, desbordes por una letra más
 * grande—; esto es lo que permite MIRARLAS en vez de decidir a ojo, y es lo que
 * se le muestra a Diego (en tema claro, como todo).
 *
 * 🪤 El reloj va CONGELADO en una fecha inventada (martes 10-mar-2026, 10:00), fuera
 * de las ventanas trampa del calendario (Fiestas Patrias, cierre de año, cumpleaños
 * y la media hora previa al cambio de turno). Con el reloj de pared el antes y el
 * después se tomaban otro día —otra cuenta de días de estadía, otra mascota— y no
 * se podían comparar píxel a píxel. Solo datos ficticios.
 *
 * Uso: node build/pantallazos.js [carpeta_salida] [--solo-registro]
 *      --solo-registro  saca solo los seis pasos y el tablero (lo de la tanda 5)
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require(path.join(__dirname, 'node_modules', 'playwright-core'));
const S = require('./sim/sim_srv.js');

const ARGS = process.argv.slice(2);
const SOLO_REGISTRO = ARGS.includes('--solo-registro');
const SALIDA = ARGS.find(a => !a.startsWith('--')) || path.join(__dirname, 'pantallazos');
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
// Los dos van al MISMO instante inventado (ver la cabecera): el servidor por
// SIM, la página por `clock.setFixedTime` (que deja correr los temporizadores).
const HOY = new Date(2026, 2, 10, 10, 0, 0);
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

  async function sesion(nombre, viewport, opc = {}) {
    const pagina = await navegador.newPage({ viewport, deviceScaleFactor: opc.escala || 2, isMobile: !!opc.movil, hasTouch: !!opc.movil });
    pagina.on('pageerror', e => errores.push(nombre + ': ' + e.message));
    await pagina.clock.setFixedTime(HOY);   // Date congelado; los temporizadores siguen corriendo
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
    await pagina.evaluate(sinMascota => {
      try { if (typeof tutHolaCerrar === 'function') tutHolaCerrar(); } catch (e) {}
      document.querySelectorAll('.tut-hola, .toast, .tut-bubble').forEach(n => n.remove());
      // La mascota flotante (#tutBtn) tapa una esquina de cada foto del tablero
      // (solo en las fotos del registro; las vistas de siempre la conservan).
      const m = document.getElementById('tutBtn'); if (sinMascota && m) m.style.display = 'none';
    }, !!opc.sinMascota);
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

  if (!SOLO_REGISTRO) {
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
  }

  /* ── REGISTRO DE EVOLUCIÓN · los seis pasos del panel y el tablero (tanda 5) ───────────────────
     A 390 px (teléfono) y a 1400 px (escritorio). El panel se fotografía con TODAS las tarjetas
     desplegadas —en el celular el acordeón las trae plegadas— y a ALTO COMPLETO: se agranda la
     ventana hasta que el contenido entra, porque el panel es una caja fija con su propio
     desplazamiento y una foto normal solo mostraría la primera pantalla. Y se vuelca a
     `medidas.json` lo que no se ve a ojo: la letra más chica visible en cada pantalla y el alto,
     el ancho y las líneas de cada botón del pie de la tarjeta de cama. */
  const medidas = {};

  /** Corre en la página. Devuelve la letra más chica que se VE y la lista de lo que queda bajo 12 px.
      `raiz` acota la medición (el panel `#sp` cuando está abierto: lo de abajo queda tapado por él); sin ella, todo el documento.
      🪤 `checkOpacity` va en true: el panel CERRADO sigue en el DOM con `opacity:0` y su texto no se ve, pero medirlo mete en la
      cuenta cientos de textos fantasma. */
  const MEDIR_LETRA = raiz => {
    const vistos = [];
    const w = document.createTreeWalker(raiz ? document.querySelector(raiz) : document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      if (!n.nodeValue.trim()) continue;
      const el = n.parentElement;
      if (!el || /^(SCRIPT|STYLE|NOSCRIPT|OPTION|TEXTAREA)$/.test(el.tagName)) continue;
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (el.closest('.msheet:not(.on), .mvelo.hidden')) continue;   // la hoja «Más» cerrada vive fuera de la pantalla
      const tam = parseFloat(getComputedStyle(el).fontSize);
      vistos.push({ tam: Math.round(tam * 10) / 10, texto: n.nodeValue.trim().slice(0, 40),
        sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '') });
    }
    const menor = vistos.length ? Math.min(...vistos.map(x => x.tam)) : null;
    const bajo = vistos.filter(x => x.tam < 12).sort((a, b) => a.tam - b.tam);
    // Una línea por selector: «.eqtag 9,6 px (3 textos)». Es lo que hay que arreglar, no cada instancia.
    const porSel = {};
    bajo.forEach(x => { const k = x.sel + ' · ' + x.tam + ' px'; (porSel[k] = porSel[k] || { n: 0, ej: x.texto }).n++; });
    return { menor, nTextos: vistos.length, bajoDoce: porSel };
  };

  /** Líneas REALES que ocupa el texto de un botón, por los rectángulos del propio texto. 🪤 Antes se estimaban dividiendo el alto del botón (menos el relleno)
      por el interlineado, y un botón de 52 px de UNA línea daba «2 líneas» siempre (52 − 20 = 32 ÷ 18,8 ≈ 1,7 → 2): el número no medía nada y las
      capturas del paso 5.1 lo repetían. Se corrigió en el paso 5.4, cuando la barra se midió con una guardia de verdad (act_bar_390.js). */
  const LINEAS_DE = b => {
    const rg = document.createRange(); rg.selectNodeContents(b);
    const rs = [...rg.getClientRects()].filter(r => r.width > 0 && r.height > 0).sort((x, y) => x.top - y.top);
    if (!rs.length) return 0;
    let n = 1, fondo = rs[0].bottom;
    for (const r of rs.slice(1)) { if (r.top >= fondo - 1) { n++; fondo = r.bottom; } else fondo = Math.max(fondo, r.bottom); }
    return n;
  };

  /** Los botones del pie de cada tarjeta de cama: alto, ancho y líneas del texto. */
  const MEDIR_PIES = () => [...document.querySelectorAll('#bedGrid .bcard')].map(card => {
    const pie = card.querySelector('.bfoot'); if (!pie) return null;
    const pr = pie.getBoundingClientRect();
    return {
      cama: (card.querySelector('.bnum') || {}).textContent, ocupada: card.classList.contains('occ'),
      anchoPie: Math.round(pr.width),
      botones: [...pie.children].map(b => {
        const r = b.getBoundingClientRect();
        return { clase: b.className, texto: b.textContent.trim().slice(0, 24), ancho: Math.round(r.width), alto: Math.round(r.height),
          pctDelPie: Math.round(100 * r.width / pr.width), lineas: window.__lineasDe(b) };
      }),
    };
  }).filter(Boolean);

  /** Foto de TODO el contenido: agranda la ventana al alto del documento (o del panel) y la devuelve a su tamaño. */
  async function fotoCompleta(pagina, archivo, etiqueta, base, panel) {
    const alto = await pagina.evaluate(esPanel => {
      if (!esPanel) return Math.ceil(document.documentElement.scrollHeight);
      const sp = document.getElementById('sp'), pc = sp.querySelector('.pcontent');
      return Math.ceil(sp.clientHeight - pc.clientHeight + pc.scrollHeight);
    }, !!panel);
    await pagina.setViewportSize({ width: base.width, height: Math.min(Math.max(alto, base.height), 9000) });
    await pagina.waitForTimeout(300);
    await pagina.screenshot({ path: path.join(SALIDA, archivo), fullPage: false });
    hechos.push(archivo);
    console.log('  📸 ' + etiqueta + ' → ' + archivo + '  (' + base.width + '×' + alto + ')');
    await pagina.setViewportSize(base);
    await pagina.waitForTimeout(150);
  }

  for (const ancho of [390, 1400]) {
    const movil = ancho <= 740, pre = movil ? 'movil' : 'escritorio';
    const base = { width: ancho, height: movil ? 844 : 950 };
    console.log('\nREGISTRO ' + ancho + ' px');
    const pag = await sesion('registro-' + ancho, base, { movil, escala: movil ? 2 : 1, sinMascota: true });
    await pag.evaluate(src => { window.__lineasDe = (new Function('return ' + src))(); }, LINEAS_DE.toString());   // lo usan MEDIR_PIES y la barra
    medidas[ancho] = { tablero: {}, pasos: {} };

    /* Tablero: la unidad con lo más cargado que hay (ventilador, equipos del paciente, prono, KTM suspendida,
       evaluaciones envejecidas) para que los chips compitan por el espacio como en la unidad de verdad. */
    await pag.evaluate(() => {
      const ult = n => '2026-03-' + String(n).padStart(2, '0');
      const por = id => DB.find(c => String(c.ID_CAMA) === String(id));
      Object.assign(por('4'), { VM_TAG: 'V60-03', VM_TAG_ESTADO: 'En uso', VM_TAG_ID: 'v3', PRONO_DESDE: '2026-03-09 20:00', KTM_SUSP: 'TRUE',
        EQUIPOS_PACIENTE: [{ c: 'APOYO', n: 'Aspirador', e: 'En uso', id: 'q9' }] });
      Object.assign(por('3'), { EQUIPOS_PACIENTE: [{ c: 'VNI', n: 'Airvo 2 B', e: 'En uso', id: 'q1' }] });
      Object.assign(por('5'), { EQUIPOS_PACIENTE: [{ c: 'CNAF', n: 'Airvo 2 A', e: 'En uso', id: 'q2' }], ULT_COOP: 'Cooperador',
        ULT_MRC: 52, ULT_MRC_FECHA: ult(2), ULT_MRC_FIRMA: 'DMV', ULT_FSS: 31, ULT_FSS_FECHA: ult(9), ULT_FSS_FIRMA: 'DMV' });
      Object.assign(por('6'), { ULT_COOP: 'Cooperador' });
      Object.assign(por('1'), { VM_TAG: 'PB980-01', VM_TAG_ESTADO: 'En uso', VM_TAG_ID: 'v1' });
      EVO_SET.add('4'); EVO_SET.add('5');            // dos camas ya evolucionadas este turno («Editar», punto verde)
      renderGrid();
    });
    await pag.waitForTimeout(400);
    await fotoCompleta(pag, pre + '-tablero.png', 'Tablero', base, false);
    medidas[ancho].tablero.pies = await pag.evaluate(MEDIR_PIES);
    medidas[ancho].tablero.letra = await pag.evaluate(MEDIR_LETRA);

    // En modo traslado: las demás camas cambian su pie por «Intercambiar» / «Mover aquí».
    await pag.evaluate(() => { MOVECAMA = null; mover('3'); document.querySelectorAll('.toast').forEach(n => n.remove()); });
    await pag.waitForTimeout(300);
    await fotoCompleta(pag, pre + '-tablero-traslado.png', 'Tablero en modo traslado', base, false);
    medidas[ancho].tablero.pieTraslado = await pag.evaluate(MEDIR_PIES);
    await pag.evaluate(() => { MOVECAMA = null; renderGrid(); });

    // Vista retrospectiva (un día pasado): se arma con lo registrado ese día, sin traslado ni egreso.
    await pag.evaluate(() => {
      const d = '2026-03-09', g = document.getElementById('gDate');
      g.value = d; g.classList.remove('turno-hoy');
      EVOS_DIA = [{ ID_CAMA: '1', TURNO_KEY: d + '-' + SHIFT, PAC_NOMBRE: 'Rosa Elena Contreras Pino', PAC_EDAD: 74, PAC_SEXO: 'F',
        PAC_DIAGNOSTICO: 'Neumonía grave adquirida en la comunidad', VENT_SOPORTE: 'VM', VENT_VIA_AEREA: 'TOT', VENT_MODO: 'ACVC',
        DIA_ESTADIA: 8, DIAS_VM: 8, PLAN_FIRMA_KINE: 'DMV', PATIENT_ID: 'pid-1', COD_PACIENTE: 'C1' }];
      EVO_SET = new Set(['1']);
      renderGrid();
    });
    await pag.waitForTimeout(300);
    await fotoCompleta(pag, pre + '-tablero-retro.png', 'Tablero, vista retrospectiva', base, false);
    medidas[ancho].tablero.pieRetro = await pag.evaluate(MEDIR_PIES);

    // Se vuelve a HOY y se abre el panel de la cama 1.
    await pag.evaluate(() => {
      const g = document.getElementById('gDate'); g.value = '2026-03-10'; g.classList.add('turno-hoy');
      EVOS_DIA = []; EVO_SET = new Set(['4', '5']); renderGrid();
      setTab('G'); abrirPanel('1', false);
    });
    await pag.waitForTimeout(1000);
    // Lo mismo que movil_panel.js: un paciente ventilado con algunos datos, para que los encabezados digan algo.
    await pag.evaluate(() => {
      const poner = (id, val) => { const e = document.getElementById(id); if (e) { e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); } };
      poner('fSed', 'Escalón 2'); poner('r_vt', '420'); poner('r_peep', '8'); poner('r_fio2', '40');
      if (typeof _rielDeb === 'function') _rielDeb();
    });
    for (let n = 1; n <= 6; n++) {
      try {
        await pag.evaluate(paso => {
          pasoIr(paso);
          // Todo desplegado: en el celular el acordeón trae las tarjetas (.mcol) y los sub-bloques de Respiratorio (.cerrado) plegados.
          document.querySelectorAll('#sp .fcard.mcol').forEach(f => f.classList.remove('mcol'));
          document.querySelectorAll('#sp .msub.cerrado').forEach(f => f.classList.remove('cerrado'));
          // 🪤 «⚠️ Sin guardar» lo prende un temporizador de 2 s (`_tickSinGuardar`): según en qué fase caía la foto, el antes la sacaba
          // sin la insignia y el después con ella, y el botón principal medía 354 px en una y 236 en la otra sin que nada hubiera cambiado.
          // Se llama al tick a mano para que las dos fotos sean comparables.
          try { _tickSinGuardar(); } catch (e) {}
        }, n);
        await pag.waitForTimeout(400);
        await fotoCompleta(pag, pre + '-paso' + n + '.png', 'Paso ' + n, base, true);
        medidas[ancho].pasos[n] = {
          letra: await pag.evaluate(MEDIR_LETRA, '#sp'),
          barra: await pag.evaluate(() => { const b = document.getElementById('pasoAvanza'); if (!b) return null; const r = b.getBoundingClientRect(), sin = document.getElementById('gSinGuardar');
            return { texto: b.textContent.trim(), ancho: Math.round(r.width), alto: Math.round(r.height), lineas: window.__lineasDe(b), desactivado: b.disabled,
              barraAlto: Math.round(document.querySelector('#sp .act-bar').getBoundingClientRect().height), insigniaVisible: !!sin && !sin.classList.contains('hidden') }; }),
        };
      } catch (e) { errores.push('paso ' + n + ' a ' + ancho + ': ' + e.message); }
    }
    await pag.close();
  }
  fs.writeFileSync(path.join(SALIDA, 'medidas.json'), JSON.stringify(medidas, null, 1));
  console.log('\n📐 medidas.json');

  await navegador.close();
  fs.unlinkSync(compilado);
  console.log('\n' + hechos.length + ' imágenes en ' + SALIDA);
  if (errores.length) { console.log('\n⚠️ errores de la página:'); errores.forEach(e => console.log('   · ' + e)); }
})();
