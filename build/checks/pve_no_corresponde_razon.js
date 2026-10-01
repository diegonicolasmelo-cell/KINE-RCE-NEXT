// pve_no_corresponde_razon.js — «No corresponde» TAMBIÉN dice por qué, y la PVE
// que no se hizo tiene su razón nueva (Diego, 1-oct-2026).
//
// LO QUE PIDIÓ: «las razones: se hace, no se hace y por qué no se hace, o no
// corresponde hacerla. Podría ser que no se la haga porque tiene pabellón, o
// porque es un paciente con ventilación mecánica domiciliaria, o porque está con
// adecuación del esfuerzo terapéutico… Y debería pedirse, porque uno puede poner
// "causa aguda no resuelta" o "no corresponde": ya estaría evaluando la PVE.»
//
// 🔴 EL HUECO QUE CIERRA. «No corresponde» se guardaba SIN razón (PVE_SC_RAZON
// solo se escribía con la respuesta «no»). Así que de un paciente con VM
// domiciliaria o con AET quedaba escrito «no corresponde» a secas, y de ahí no
// se podía distinguir «no corresponde porque es crónico» de «no corresponde
// porque la causa aguda sigue». Importa porque el que NO CORRESPONDE sale del
// denominador de destete y el que espera la causa aguda, no.
//
// 🔵 LO QUE YA ESTABA, y por eso no se tocó: la PVE ya es OBLIGATORIA para
// cerrar cuando el bloque está a la vista (sí / no / no corresponde), con TOT, en
// cualquier modalidad. El bloque NO aparece con traqueostomía en VM: eso queda
// fuera de esta guardia a propósito, es una decisión de diseño pendiente.
//
// 🪤 «Causa de base no resuelta» se conserva como una razón de «no corresponde»:
// es lo que el botón significaba desde ago-2026 (pedido de Manuel). Un turno
// viejo con `nc` y sin razón sigue narrándose igual, sin trabarse.
//
// 🪤 El reloj va congelado y se mide en el PASO 2, donde vive el bloque.
//
// Uso: node build/checks/pve_no_corresponde_razon.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const v2 = path.join(__dirname, '..', '..', 'v2');

const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

/* ══ PARTE 1 · Servidor: validación y relato ═════════════════════════════ */
global.esVerdadero = v => v === true || v === 'TRUE' || v === 'true';
global.leerConfig = (k, d) => d;
eval(['dominio_validacion.gs', 'dominio_texto.gs']
  .map(f => fs.readFileSync(path.join(v2, f), 'utf8')).join('\n;\n'));

console.log('\n── PARTE 1 · El servidor ──');
console.log('\n1 · 🔴 «No corresponde» exige su razón');
eq('★★ sin razón → rechaza', validarPVE({ PVE_VAL: 'nc' }).length, 1);
eq('★★ …y el mensaje dice qué falta', /corresponde/i.test(validarPVE({ PVE_VAL: 'nc' })[0] || ''), 'true');
eq('★★ con razón → pasa', validarPVE({ PVE_VAL: 'nc', PVE_SC_RAZON: 'Ventilación mecánica domiciliaria' }).length, 0);
eq('★★ «Otra» sin motivo → rechaza', validarPVE({ PVE_VAL: 'nc', PVE_SC_RAZON: 'Otra' }).length, 1);
eq('★★ «Otra» con motivo → pasa', validarPVE({ PVE_VAL: 'nc', PVE_SC_RAZON: 'Otra', PVE_SC_DET: 'cuidados paliativos' }).length, 0);
eq('★ la PVE «sí» sigue sin pedir razón', validarPVE({ PVE_VAL: 'si', PVE_RESULTADO: 'superada' }).length, 0);

console.log('\n2 · El relato dice la razón');
const tx = d => generarTextoEvolucion(Object.assign({ TURNO: 'Dia', VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM' }, d));
si('★★ VM domiciliaria se narra', /ventilaci[oó]n mec[aá]nica domiciliaria/i.test(tx({ PVE_VAL: 'nc', PVE_SC_RAZON: 'Ventilación mecánica domiciliaria' })));
si('★★ AET se narra', /adecuaci[oó]n del esfuerzo terap[eé]utico/i.test(tx({ PVE_VAL: 'nc', PVE_SC_RAZON: 'Adecuación del esfuerzo terapéutico' })));
si('★★ «Otra» narra el detalle escrito', /cuidados paliativos/.test(tx({ PVE_VAL: 'nc', PVE_SC_RAZON: 'Otra', PVE_SC_DET: 'cuidados paliativos' })));
si('★★ sigue diciendo que mantiene soporte', /Mantiene soporte ventilatorio/.test(tx({ PVE_VAL: 'nc', PVE_SC_RAZON: 'Ventilación mecánica domiciliaria' })));
si('★★ 🪤 un turno VIEJO (nc sin razón) se narra como siempre: causa de base no resuelta',
   /causa de base no resuelta/.test(tx({ PVE_VAL: 'nc' })));

/* ══ PARTE 2 · La pantalla ═══════════════════════════════════════════════ */
(async () => {
  console.log('\n── PARTE 2 · La pantalla ──');
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1400, height: 1400 }, locale: 'es-CL' });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    const FIJA = new Date(2026, 7, 12, 10, 0, 0).getTime(), RD = Date;
    function FD(...a) { if (!new.target) return new RD(FIJA).toString(); return a.length ? new RD(...a) : new RD(FIJA); }
    FD.prototype = RD.prototype; FD.now = () => FIJA; FD.UTC = RD.UTC; FD.parse = RD.parse;
    window.Date = FD;
  });
  await p.addInitScript(() => {
    window._ll = []; window.__evo = null;
    window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
      api(a, d) { window._ll.push({ a, d }); let data = null;
        if (a === 'GET_CONFIG_UI') data = { NUM_CAMAS: 12, BANNERS: {} };
        else if (a === 'GET_EVO_TURNO') data = { actual: window.__evo, previa: null, pronoAbierto: '' };
        setTimeout(() => ok({ ok: true, data }), 5); }
    }; } }; } } } };
  });
  await p.goto('file://' + path.join(v2, 'index.html'));
  await p.waitForTimeout(800);

  const abrir = evoGuardada => p.evaluate(x => {
    window.__evo = x; $('kf').reset();
    DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', EDAD: 61, SEXO: 'M',
            VIA_AEREA: 'TOT', SOPORTE: 'VM', FECHA_INGRESO: '2026-08-07' }];
    window.recargarSilencioso = () => {};
    $('gDate').value = '2026-08-12'; SHIFT = 'Dia';
    renderGrid(); abrirPanel('3', false, false);
  }, evoGuardada).then(() => p.waitForTimeout(800))
    .then(() => p.evaluate(() => { window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]); pasoIr(2); }))
    .then(() => p.waitForTimeout(350));
  const ver = sel => p.evaluate(s => { const e = document.querySelector(s);
    if (!e) return false;
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width > 0 || r.height > 0);
  }, sel);
  const opciones = id => p.evaluate(i => Array.from(($(i) || { options: [] }).options).map(o => o.textContent.trim()), id);

  await abrir(null);

  console.log('\n3 · 🔴 «No corresponde» abre su razón');
  no('★ sin elegir «no corresponde» no se ve la razón', await ver('#fPveNcRaz'));
  await p.evaluate(() => hPVEtoggle('nc')); await p.waitForTimeout(150);
  si('★★ al elegirlo, aparece el desplegable de razón', await ver('#fPveNcRaz'));
  const nc = await opciones('fPveNcRaz');
  si('★★ ofrece ventilación mecánica domiciliaria', nc.includes('Ventilación mecánica domiciliaria'));
  si('★★ ofrece adecuación del esfuerzo terapéutico', nc.includes('Adecuación del esfuerzo terapéutico'));
  si('★★ 🪤 conserva «causa de base no resuelta», que es lo que el botón significaba', nc.includes('Causa de base no resuelta'));
  si('★ y «Otra»', nc.includes('Otra'));

  console.log('\n4 · 🔴 Sin razón, el turno avisa y no se guarda');
  await p.evaluate(() => rielRender());
  si('★★ el aviso de lo que falta nombra la razón', await p.evaluate(() => /raz[oó]n/i.test($('gFalta').textContent)));
  const sinRazon = await p.evaluate(async () => {
    $('cBed').value = '3';
    const o = document.createElement('option'); o.value = 'Klgo. Test'; o.textContent = 'Klgo. Test';
    $('fFirma').appendChild(o); $('fFirma').value = 'Klgo. Test';
    const he = $('fHEst'); if (he && !he.value) he.value = 'Estable';
    const hd = $('fDVA'); if (hd && !hd.value) hd.value = 'Sin requerimientos';
    _transAvisoOk = true; window._ll.length = 0; guardar();
    await new Promise(r => setTimeout(r, 80));
    return window._ll.some(x => x.a === 'GUARDAR_EVOLUCION');
  });
  no('★★ guardar() NO llama al servidor sin la razón', sinRazon);

  console.log('\n5 · «Otra» exige el motivo');
  await p.evaluate(() => { $('fPveNcRaz').value = 'Otra'; hPveNcRaz(); rielRender(); });
  si('★★ «Otra» sin detalle: el aviso lo pide', await p.evaluate(() => /Otra|motivo/i.test($('gFalta').textContent)));
  await p.evaluate(() => { $('fPveNcDet').value = 'cuidados paliativos'; hPveNcRaz(); rielRender(); });
  no('★★ con el detalle escrito ya no falta nada de la PVE', await p.evaluate(() => /PVE/.test($('gFalta').textContent)));

  console.log('\n6 · 🔴 La razón viaja y vuelve');
  const viaja = await p.evaluate(async () => {
    $('fPveNcRaz').value = 'Adecuación del esfuerzo terapéutico'; hPveNcRaz();
    _transAvisoOk = true; window._ll.length = 0; guardar();
    await new Promise(r => setTimeout(r, 80));
    const c = window._ll.find(x => x.a === 'GUARDAR_EVOLUCION');
    return c ? { val: c.d.PVE_VAL, raz: c.d.PVE_SC_RAZON, det: c.d.PVE_SC_DET } : null;
  });
  eq('★★ viaja la PVE «no corresponde»', viaja && viaja.val, 'nc');
  eq('★★ …con su razón', viaja && viaja.raz, 'Adecuación del esfuerzo terapéutico');
  await abrir({ ID_CAMA: '3', TURNO_KEY: '2026-08-12-Dia', PATIENT_ID: 'p3', PAC_NOMBRE: 'P', PLAN_FIRMA_KINE: 'K.P.',
    VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', PVE_VAL: 'nc', PVE_SC_RAZON: 'Ventilación mecánica domiciliaria' });
  eq('★★ al reabrir, la PVE sigue «no corresponde»', await p.evaluate(() => v('fPVEval')), 'nc');
  eq('★★ …y la razón vuelve', await p.evaluate(() => v('fPveNcRaz')), 'Ventilación mecánica domiciliaria');

  console.log('\n7 · 🪤 Un turno VIEJO (nc sin razón) se abre sin trabarse ni inventar nada');
  await abrir({ ID_CAMA: '3', TURNO_KEY: '2026-08-12-Dia', PATIENT_ID: 'p3', PAC_NOMBRE: 'P', PLAN_FIRMA_KINE: 'K.P.',
    VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', PVE_VAL: 'nc' });
  eq('★ abre en «no corresponde»', await p.evaluate(() => v('fPVEval')), 'nc');
  eq('★★ y NO inventa una razón que nadie eligió', await p.evaluate(() => v('fPveNcRaz')), '');

  console.log('\n8 · Cambiar de respuesta no arrastra la razón');
  await p.evaluate(() => { hPVEtoggle('nc'); $('fPveNcRaz').value = 'Ventilación mecánica domiciliaria'; hPveNcRaz(); hPVEtoggle('no'); });
  eq('★★ al pasar a «no», la razón de «no corresponde» se borra', await p.evaluate(() => v('fPveNcRaz')), '');
  no('★ …y su desplegable se esconde', await ver('#fPveNcRaz'));

  console.log('\n9 · La PVE «no» tiene la razón nueva');
  await p.evaluate(() => hPVEtoggle('no')); await p.waitForTimeout(150);
  const no_ = await opciones('fPveSCraz');
  si('★★ «Causa aguda no resuelta» está entre las razones de «no se hizo»', no_.includes('Causa aguda no resuelta'));
  si('★ «Procedimiento o pabellón programado» sigue', no_.includes('Procedimiento o pabellón programado'));
  si('★ 🪤 «Menos de 24 h de VM» sigue: el bloque se ofrece también con menos de 24 h', no_.includes('Menos de 24 h de VM'));

  console.log('\n10 · El relato de la pantalla');
  await p.evaluate(() => { hPVEtoggle('nc'); $('fPveNcRaz').value = 'Ventilación mecánica domiciliaria'; hPveNcRaz(); });
  const txt = await p.evaluate(() => genTexto());
  si('★★ narra la razón', /ventilaci[oó]n mec[aá]nica domiciliaria/i.test(txt));
  si('★★ …y que mantiene el soporte', /Mantiene soporte ventilatorio/.test(txt));

  eq('sin errores de JavaScript', errs.join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  console.log(fails.length ? '\n❌ pve_no_corresponde_razon: ' + fails.length + ' FALLO(S): ' + fails.join(' · ') : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
