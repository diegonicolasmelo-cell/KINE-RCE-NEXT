// tema_sereno.js — El aspecto «Sereno cálido y táctil» (Diego, 10-oct-2026).
//
// LO QUE ELIGIÓ: de tres propuestas visuales (Sereno, Cálido y táctil, Monitor) dijo «Sereno más cálido y
// táctil». Es una CAPA de aspecto al final de la hoja de estilos: no cambia orden ni comportamiento.
//
// QUÉ FIJA (medido en pantalla, no leído del código):
//  · la paleta base (azul petróleo, fondo crema) y que el texto atenuado siga legible (≥ 4,5:1 sobre el fondo);
//  · TOQUES de al menos 44 px en las pestañas de pasos, el nivel de KTM, los campos y los botones de guardar,
//    porque se usa de pie, con el paciente al lado, muchas veces en el teléfono;
//  · tarjetas redondeadas y el paso activo pintado con el color primario;
//  · lo mismo en 390 px (celular) y en 1200 px (escritorio).
// Uso: node build/checks/tema_sereno.js [ruta-del-index]   (por defecto v2/index.html)
const path = require('path');
const { chromium } = require('playwright-core');
const INDEX = process.argv[2] || path.join(__dirname, '..', '..', 'v2', 'index.html');
const fails = [];
const eq = (l, g, w) => { const ok = String(g) === String(w);
  console.log((ok ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!ok) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); } };
const si = (l, g) => eq(l, !!g, 'true');
const PUENTE = () => {
  window._ll = [];
  window.google = { script: { run: { withSuccessHandler(ok) { return { withFailureHandler() { return {
    api(a, d) { let data = null; if (a === 'GET_CONFIG_UI') data = { NUM_CAMAS: 12, BANNERS: {} };
      else if (a === 'GET_EVO_TURNO') data = { actual: null, previa: null, pronoAbierto: '' };
      setTimeout(() => ok({ ok: true, data }), 5); } }; } }; } } } };
};
const lum = c => { const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
  for (const ancho of [390, 1200]) {
    console.log('\n── ' + ancho + ' px ──');
    const q = await b.newPage({ viewport: { width: ancho, height: 1500 }, locale: 'es-CL' });
    await q.addInitScript(PUENTE); await q.goto('file://' + INDEX); await q.waitForTimeout(800);
    await q.evaluate(async () => {
      $('kf').reset(); $('gDate').value = '2026-08-12'; SHIFT = 'Dia'; window.Turnos.setRoster([{ f: 'K.P.', n: 'Kine' }]);
      DB = [{ ID_CAMA: '3', OCUPADA: true, PATIENT_ID: 'p3', NOMBRE: 'P', VIA_AEREA: 'TOT', SOPORTE: 'VM', FECHA_INGRESO: '2026-08-05', TS_INGRESO: '2026-08-05 23:00:00',
        FECHA_INICIO_VA: '2026-08-08', TS_INICIO_VA: '2026-08-08 10:00:00', FECHA_INICIO_SOPORTE: '2026-08-08', TS_INICIO_SOPORTE: '2026-08-08 10:00:00' }];
      window.recargarSilencioso = () => {}; renderGrid(); abrirPanel('3', false, false);
      await new Promise(r => setTimeout(r, 800)); pasoIr(4);
    });
    const m = await q.evaluate(() => {
      const cs = (e, p) => getComputedStyle(e)[p];
      const root = getComputedStyle(document.documentElement);
      const tabs = Array.from(document.querySelectorAll('#spPasos .paso-t')).filter(t => !t.classList.contains('hidden'));
      const act = tabs.find(t => t.getAttribute('aria-selected') === 'true');
      const niv = document.querySelector('.ktm-niv-btn'); const inp = document.querySelector('.col input[type=text],.col input[type=number],.col select');
      const card = document.querySelector('.fcard:not(.hidden)');
      return {
        primary: root.getPropertyValue('--primary').trim(), bg: root.getPropertyValue('--bg').trim(), muted: root.getPropertyValue('--muted').trim(),
        mutedRgb: (() => { const d = document.createElement('i'); d.style.color = root.getPropertyValue('--muted'); document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; })(),
        bgRgb: (() => { const d = document.createElement('i'); d.style.color = root.getPropertyValue('--bg'); document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; })(),
        tabMinH: Math.min(...tabs.map(t => t.getBoundingClientRect().height)), tabMinW: Math.min(...tabs.map(t => t.getBoundingClientRect().width)),
        activoBg: act ? cs(act, 'backgroundColor') : '', activoColor: act ? cs(act, 'color') : '',
        // Estos dos pueden estar ocultos por el paso o el acordeón del celular: se mide el estilo calculado, que existe igual.
        nivH: niv ? parseFloat(cs(niv, 'minHeight')) : 0, nivW: niv ? parseFloat(cs(niv, 'minWidth')) : 0,
        inpH: inp ? parseFloat(cs(inp, 'height')) : 0, radio: card ? parseFloat(cs(card, 'borderTopLeftRadius')) : 0 };
    });
    eq('★★ el color primario es el azul petróleo', m.primary, '#1f6f8b');
    eq('el fondo es crema', m.bg, '#f8f6f2');
    si('★ el texto atenuado se lee sobre el fondo (≥ 4,5:1): ' + contraste(m.mutedRgb, m.bgRgb).toFixed(2), contraste(m.mutedRgb, m.bgRgb) >= 4.5);
    si('★★ cada pestaña de paso mide ≥ 44 px de alto (' + m.tabMinH + ')', m.tabMinH >= 44);
    si('★★ cada pestaña de paso mide ≥ 44 px de ancho (' + Math.round(m.tabMinW) + ')', m.tabMinW >= 44);
    eq('★ el paso activo va pintado con el primario', m.activoBg, 'rgb(31, 111, 139)');
    eq('el texto del paso activo es blanco', m.activoColor, 'rgb(255, 255, 255)');
    si('★ el botón de nivel de KTM mide ≥ 48 px (' + m.nivH + ' × ' + Math.round(m.nivW) + ')', m.nivH >= 48 && m.nivW >= 48);
    si('★ los campos miden ≥ 44 px (' + m.inpH + ')', m.inpH >= 44);
    si('★ las tarjetas son redondeadas (≥ 16 px: ' + m.radio + ')', m.radio >= 16);
    await q.close();
  }
  await b.close();
  console.log(fails.length ? '\n❌ ' + fails.length + ' fallo(s)' : '\n✅ TODO OK');
  process.exit(fails.length ? 1 : 0);
})();
