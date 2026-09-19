// eventos_ui.js — Guardia de la UI de eventos rápidos (v3.0):
// columna «＋» del registro diario, popover anclado, payload de ANEXAR_EVENTO,
// franja «Aceptar» de dispositivos y centinelas auto-calculados al abrir
// Estadísticas. Uso: node build/checks/eventos_ui.js (requiere playwright-core)
const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('c:' + m.text()); });
  await p.addInitScript(() => {
    window._ll = [];
    const RESP = {
      GET_INDICADORES: { desde: '2026-01-01', hasta: '2026-07-31', fracasoPct: 15, fracaso: 3, extubaciones: 20,
        fracasoPrecoz: 1, fracasoTardio: 2, autoextPor100VM: 1.2, autoextubaciones: 2, diasVM: 160,
        fueraPct: 10, fueraProtocolo: 2, pvePor100PacDia: 4, pve: 12, pacienteDias: 300,
        medianaVMpreTQT: 9, tqt: 3, vmProlongadaPct: 30, vmProlongada: 6, ventilados: 20,
        atencionesPorPacDia: 2.1, atenciones: 630, ocupacionProm: 14, diasRango: 212,
        reingresos: 1, personasConRut: 40, mortalidadPct: 20, fallecidos: 4, egresos: 20,
        motivosFuera: { 'Agitación psicomotora': { total: 2, noche: 1 } },
        tendencia: [{ mes: '2026-05', fuente: 'planilla', fracasoPct: 20 }, { mes: '2026-07', fuente: 'rce', fracasoPct: 15 }] },
      GET_CONFIG_UI: { NUM_CAMAS: 12, BANNERS: {} },
    };
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
      api(a, d) { window._ll.push({ a, d }); setTimeout(() => ok({ ok: true, data: RESP[a] || null }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.resolve(__dirname, '..', '..', 'v2', 'index.html'));
  await p.waitForTimeout(500);
  const fails = []; const eq = (l, g, w) => { const okk = String(g) === String(w); console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g)); if (!okk) fails.push(l); };

  // ── Registro diario: columna «＋» consistente ──
  const REG = await p.evaluate(() => {
    DB = [{ ID_CAMA: '3', OCUPADA: true, NOMBRE: 'Juan Pérez', SEXO: 'M', EDAD: 60, DIAGNOSTICO: 'NAC', SOPORTE: 'VM', FECHA_INGRESO: '2026-07-20' }];
    EVOS_DIA = []; renderTabla();
    const t = $('notionTable');
    return {
      grupos: [...t.tHead.rows[0].cells].reduce((s, c) => s + c.colSpan, 0),
      cols: t.tHead.rows[1].cells.length,
      celdas: t.tBodies[0].rows[0].cells.length,
      btn: !!t.querySelector('tbody .tc-n .ev-btn'),
      totalCells: [...t.querySelector('.r-tot').cells].reduce((s, c) => s + c.colSpan, 0),
    };
  });
  eq('cabecera de grupos suma 23 columnas', REG.grupos, 23);
  eq('cabecera de detalle: 23 columnas', REG.cols, 23);
  eq('fila de cama: 23 celdas (el ➕ vive junto al nombre)', REG.celdas, 23);
  eq('botón ➕ junto al nombre del paciente', REG.btn, true);
  eq('fila TOTAL cuadra (22+1)', REG.totalCells, 23);

  // ── Popover: abrir desde el botón, tipos y payload ──
  // El equipo de prueba, sembrado por la puerta real antes de cualquier firma.
  await p.evaluate(() => {
    if (window.Turnos) Turnos.setRoster([{ f: 'AAA', n: 'Uno de prueba', t: 'Klgo.' },
                                         { f: 'BBB', n: 'Dos de prueba', t: 'Klga.' },
                                         { f: 'CCC', n: 'Tres de prueba', t: 'Klgo.' }]);
  });
  const POP = await p.evaluate(() => {
    document.querySelector('#notionTable tbody .tc-n .ev-btn').click();
    return {
      visible: !$('evPop').classList.contains('hidden') && !$('evVelo').classList.contains('hidden'),
      titulo: $('evTitulo').textContent,
      lista: document.querySelectorAll('#evLista .ev-it').length,
      firmas: $('evFirma').options.length,
      turnoPre: (typeof SHIFT!=='undefined' && SHIFT==='Noche') ? $('evTurnoN').classList.contains('on') : $('evTurnoD').classList.contains('on'),
    };
  });
  eq('popover visible al tocar ➕', POP.visible, true);
  eq('título con la cama', POP.titulo.indexOf('Cama 3') > -1, true);
  eq('6 tipos de evento', POP.lista, 6);
  /* 🪤 19-sep-2026 · Antes esto exigía 16 opciones: los quince nombres que
     estaban escritos en el código más el placeholder. Los nombres se mudaron a
     la hoja KINESIOLOGOS —el index se publica como sitio y la nómina quedaba a
     la vista— así que un número fijo ya no dice nada. Se siembra un equipo de
     tres INVENTADO y se comprueba que el selector lo tome: eso mide el
     mecanismo, que es lo que de verdad se quería proteger. */
  eq('★ el selector se llena con el equipo que llega, no con uno escrito a mano',
    await p.evaluate(() => document.getElementById('fFirma').options.length), 4);
  eq('turno preseleccionado según la hora', POP.turnoPre, true);

  const TIP = await p.evaluate(() => {
    evTipo('cultivo');
    const r1 = { cult: !$('evCultTipo').classList.contains('hidden'), proc: $('evProcSel').classList.contains('hidden'), hora: $('evHora').value !== '' };
    evVolver(); evTipo('procedimiento');
    r1.proc2 = !$('evProcSel').classList.contains('hidden'); r1.cult2 = $('evCultTipo').classList.contains('hidden');
    return r1;
  });
  eq('cultivo muestra sus campos y oculta procedimiento', TIP.cult && TIP.proc, true);
  eq('hora precargada', TIP.hora, true);
  eq('procedimiento muestra el campo de catálogo', TIP.proc2 && TIP.cult2, true);

  const PAY = await p.evaluate(async () => {
    evVolver(); evTipo('cultivo');
    $('evFirma').value = '';
    const antes = _ll.filter(x => x.a === 'ANEXAR_EVENTO').length;
    evGuardar();                                   // sin firma → no debe llamar
    $('evFirma').value = 'AAA';
    $('evCultTipo').value = 'Aspirado traqueal'; $('evCultHall').value = 'BLEE+'; $('evHora').value = '16:30';
    evSetTurno('Noche');   // el turno elegido A LA VISTA manda sobre la hora actual
    evGuardar();
    await new Promise(r => setTimeout(r, 60));
    const calls = _ll.filter(x => x.a === 'ANEXAR_EVENTO');
    return { sinFirma: calls.length - (calls.length - antes) === antes && antes === 0 ? _ll.filter(x => x.a === 'ANEXAR_EVENTO').length : -1,
      d: calls[calls.length - 1] ? calls[calls.length - 1].d : null,
      cerrado: $('evPop').classList.contains('hidden') };
  });
  eq('sin firma no llama; con firma 1 llamada', PAY.sinFirma, 1);
  eq('payload idCama', PAY.d && PAY.d.idCama, '3');
  eq('payload tipo cultivo', PAY.d && PAY.d.tipo, 'cultivo');
  eq('payload turnoKey AAAA-MM-DD-Turno', /^\d{4}-\d{2}-\d{2}-(Dia|Noche)$/.test(PAY.d && PAY.d.turnoKey), true);
  eq('el turno elegido en el popover manda en el payload', /-Noche$/.test(PAY.d && PAY.d.turnoKey), true);
  eq('payload firma y hallazgo', PAY.d && PAY.d.firmaKine === 'AAA' && PAY.d.cultHallazgo === 'BLEE+' && PAY.d.hora === '16:30', true);
  eq('popover se cierra tras guardar', PAY.cerrado, true);

  /* ── 🗂️ 17-sep-2026 · La franja «Aceptar» de dispositivos SALIÓ ──────────
     Acá se probaba el aviso «Dispositivos asumidos instalados al conectar a VM
     — corrobora: [Aceptar] o ajusta las fechas de arriba y guarda». Salió junto
     con los tres calendarios del turno: mandaba a ajustar unas fechas que ya no
     están, y la corroboración se hace ahora en el paso 1 tocando cada
     dispositivo, con su reloj a la vista.
     🔴 Lo que esta guardia protege SIGUE EN PIE y se mide igual: que la acción
     CONFIRMAR_DISPOSITIVOS siga publicada en el servidor. Borrar un botón no
     puede llevarse por delante una acción del dispatcher, que es de donde comen
     también la hoja de control de filtros y cualquier automatismo futuro. */
  {
    const fs = require('fs');
    const api = fs.readFileSync(path.join(__dirname, '..', '..', 'v2', 'api.gs'), 'utf8');
    eq('★ CONFIRMAR_DISPOSITIVOS sigue publicada en el dispatcher',
       /CONFIRMAR_DISPOSITIVOS/.test(api), true);
    const idx2 = fs.readFileSync(path.join(__dirname, '..', '..', 'v2', 'index.html'), 'utf8');
    eq('★ …y el aviso ya no está en la pantalla del turno',
       /id="dispConfirm"/.test(idx2), false);
  }


  // ── Estadísticas: centinelas protagonistas, auto-cálculo al entrar ──
  const IND = await p.evaluate(async () => {
    window._statsLoaded = true;   // aísla el auto-cálculo de indicadores
    setTab('D');
    await new Promise(r => setTimeout(r, 80));
    const box = $('indBox'), dash = document.querySelector('#tcD .dash');
    return {
      llamada: _ll.some(x => x.a === 'GET_INDICADORES'),
      abierto: box.hasAttribute('open'),
      arriba: !!(box && dash && (box.compareDocumentPosition(dash) & Node.DOCUMENT_POSITION_FOLLOWING)),
      render: $('indOut').textContent.indexOf('Fracaso') > -1 || $('indOut').innerHTML.indexOf('Fracaso') > -1,
      soloUna: _ll.filter(x => x.a === 'GET_INDICADORES').length === 1 ? (setTab('G'), setTab('D'), _ll.filter(x => x.a === 'GET_INDICADORES').length) : -1,
    };
  });
  eq('GET_INDICADORES se dispara solo al entrar', IND.llamada, true);
  eq('indBox desplegado por defecto', IND.abierto, true);
  eq('centinelas ANTES de los gráficos (protagonismo)', IND.arriba, true);
  eq('tablero renderizado con datos', IND.render, true);
  eq('no recalcula en cada visita (1 llamada)', IND.soloUna, 1);

  // ── Firma en texto ──
  const FIR = await p.evaluate(() => [Turnos.firmaTexto('AAA'), Turnos.firmaTexto('BBB'), Turnos.firmaTexto('ZZZ')]);
  eq('firma masculina', FIR[0], 'Klgo. Uno de prueba');
  eq('firma femenina', FIR[1], 'Klga. Dos de prueba');
  eq('firma fuera de roster → fallback', FIR[2], 'Klgo. ZZZ');

  console.log(errs.length ? ('\nERRORES JS:\n' + errs.join('\n')) : '\nsin errores JS');
  await b.close();
  console.log(fails.length ? ('❌ ' + fails.length + ' FALLOS') : '✅ TODO OK');
  process.exit(fails.length || errs.length ? 1 : 0);
})();
