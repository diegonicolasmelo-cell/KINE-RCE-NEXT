// el_arranque_dice_por_que.js — La pantalla de arranque dice QUÉ pasó, no
// «no se pudo verificar la conexión» pase lo que pase (19-sep-2026).
//
// 🔴 DE DÓNDE SALE. Diego publicó la app, la abrió, y quedó en «No se pudo
// verificar la conexión con el servidor». Buscamos una hora en el lugar
// equivocado: el permiso del despliegue, la versión publicada, la dirección
// del /exec, el archivo webapp. Todo estaba bien.
//
// Lo que pasaba de verdad: el servidor RESPONDÍA, y respondía «Sesión no
// válida. Inicia sesión con Google» porque CONFIG.AUTH_DEV_MODE estaba en
// FALSE y el login de Google no está montado. La app tomaba ese rechazo —una
// respuesta perfectamente buena— y lo mostraba como un problema de conexión.
//
// Es la misma familia que el Glasgow de fábrica: la pantalla afirma algo que
// nadie comprobó. Y es peor en el arranque, porque ahí no hay nada más que
// mirar: quien la abre solo tiene esa frase para saber qué hacer.
//
// LO QUE FIJA: el motivo del servidor llega a la pantalla. Un rechazo de
// identidad se ve distinto de un servidor inalcanzable, porque lo que hay que
// hacer es distinto.

const fs = require('fs');
const path = require('path');
const v2 = path.join(__dirname, '..', '..', 'v2');
const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g));
  if (!okk) { fails.push(l); console.log('   esperado: ' + JSON.stringify(w)); }
};
const si = (l, g) => eq(l, !!g, 'true');
const no = (l, g) => eq(l, !!g, 'false');

const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });

  // El arranque se prueba DOS veces, con la misma página y distinto servidor:
  // una que rechaza por identidad y otra que no contesta nada.
  const correr = async (modo) => {
    const p = await b.newPage({ viewport: { width: 900, height: 700 } });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    // 🪤 Se simula la app INSTALADA: sin google.script.run, que es cuando la
    // pantalla de arranque es lo único que el colega ve.
    await p.addInitScript((modo) => {
      try { localStorage.setItem('rce_exec_url', 'https://example.test/exec'); } catch (e) {}
      window.fetch = function () {
        if (modo === 'red') return Promise.reject(new TypeError('Failed to fetch'));
        return Promise.resolve({
          text: () => Promise.resolve(JSON.stringify({
            ok: false, error: 'Sesión no válida. Inicia sesión con Google.', codigo: 'NO_AUTORIZADO'
          }))
        });
      };
    }, modo);
    await p.goto('file://' + path.resolve(v2, 'index.html'));
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => {
      const m = document.getElementById('loginMsg');
      return { txt: (m ? m.textContent : ''), visible: !!document.getElementById('loginOvl') &&
               document.getElementById('loginOvl').style.display === 'flex' };
    });
    await p.close();
    return { r, errs };
  };

  console.log('\n1 · 🔴 El servidor RESPONDE y rechaza por identidad');
  const A = await correr('rechazo');
  si('   la pantalla de arranque se muestra', A.r.visible);
  no('★★ ya NO dice «no se pudo verificar la conexión» cuando el servidor SÍ contestó',
     /no se pudo verificar la conexión/i.test(A.r.txt));
  si('★★ dice que el servidor respondió y no dejó entrar',
     /respondi[óo]/i.test(A.r.txt));
  si('★ y trae el motivo textual del servidor, para no tener que adivinarlo',
     /sesi[óo]n no v[áa]lida/i.test(A.r.txt));

  console.log('\n2 · El servidor NO contesta (ahí sí es la conexión)');
  const B = await correr('red');
  si('   la pantalla de arranque se muestra', B.r.visible);
  si('★ dice que no se pudo alcanzar el servidor', /no se pudo alcanzar|no responde|sin respuesta/i.test(B.r.txt));
  no('   …y no inventa un rechazo que nadie dio', /sesi[óo]n no v[áa]lida/i.test(B.r.txt));

  console.log('\n3 · Los dos casos se distinguen');
  no('★★ las dos pantallas NO dicen lo mismo', A.r.txt.trim() === B.r.txt.trim());
  si('   las dos ofrecen reintentar', /reintentar/i.test(A.r.txt) && /reintentar/i.test(B.r.txt));

  eq('sin errores de JavaScript', [].concat(A.errs, B.errs).join(' | ') || '(ninguno)', '(ninguno)');
  await b.close();
  if (fails.length) {
    console.log('\n❌ el_arranque_dice_por_que: ' + fails.length + ' fallo(s):');
    fails.forEach(f => console.log('   · ' + f));
    process.exit(1);
  }
  console.log('\n✅ el_arranque_dice_por_que: la pantalla dice qué pasó, no una suposición.');
})();
