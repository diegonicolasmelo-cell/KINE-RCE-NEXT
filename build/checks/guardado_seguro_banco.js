// guardado_seguro_banco.js — EL BANCO DE PRUEBAS DEL GUARDADO SEGURO SE PRUEBA A SÍ MISMO
// (tanda 2, paso 1, 4-oct-2026).
//
// 🔴 DE DÓNDE SALE. La tanda 2 (G14 a G17) promete que un guardado que se corta A MEDIAS, o que llega dos veces,
// o que llega con la cama ya ocupada por otro, termina en el mismo estado que uno limpio. Esa promesa solo vale
// lo que valga el banco que la mide, y el banco que había NO podía medirla:
//
//   · `conLock` del simulador era `fn => fn()`: un juguete. No toma ningún candado, no devuelve LOCK_TIMEOUT,
//     no suelta nada si el cuerpo lanza, y por eso «mientras esta petición esperaba el lock otra se adelantó»
//     solo se podía imitar envolviendo el juguete por fuera (episodio_al_guardar.js, bloque 3), o sea
//     FUERA del lock. Las guardias de la tanda 2 necesitan el `conLock` de v2/infra_lock.gs, el de verdad,
//     porque el sello de operación va a vivir DENTRO de él.
//   · No había forma de «matar» una corrida a medias. Un script de Apps Script muerto deja las escrituras ya
//     hechas y ninguna más; en Node, en cambio, un `catch` que se traga el error del cuerpo SIGUE ESCRIBIENDO
//     (los servicios están llenos de `try { … } catch (e) { return err(…) }`), así que «lanzar en la escritura
//     N» no mata nada: la N+1 aterriza igual, escrita por el código que se suponía muerto.
//   · No había una foto del estado que se pudiera comparar entre dos corridas: los ids nacen de un contador
//     (`uuid-N`) y del reloj, y cada corrida los numera distinto.
//
// LO QUE FIJA ESTA GUARDIA, sobre el banco (build/sim/sim_srv.js y build/sim/sim_muerte.js) y no sobre la app:
//   1 · Sin pedirlo, NADA cambia: los ~145 bancos de siempre siguen con el `conLock` de juguete.
//   2 · `activarLockReal()` instala el `conLock` REAL: toma el candado, devuelve LOCK_TIMEOUT si está tomado,
//       lo suelta aunque el cuerpo lance, y devuelve lo que devuelve el cuerpo.
//   3 · El gancho `antesDelCuerpo` corre DENTRO de ese conLock real (mientras la petición espera el candado), con
//       el candado libre, una sola vez, y deja que «la otra petición» haga su propio conLock completo.
//   4 · El CacheService del banco se puede hacer fallar (el sello tiene que ser fail-open) y recupera lo que había.
//   5 · `sim_muerte`: la escritura N aterriza, y desde ahí TODA escritura posterior lanza AUNQUE un catch la
//       trague, hasta que se reinicia. Cada escritor de la capa de repo (la lista de episodio_al_guardar.js, y la
//       de repo.gs derivada del fuente) y el caché —el sello es una escritura— quedan bloqueados.
//   6 · `instantanea()` es la foto comparable: sin TIMESTAMP/TS, con los ids generados renombrados por orden de
//       aparición (estable entre dos corridas iguales), y SENSIBLE a lo que de verdad cambia.
//   7 · Visto contra una puerta real: INTERCAMBIAR_CAMAS, N = 0..total+1, con el servicio sin tocar.
//
// Uso: node build/checks/guardado_seguro_banco.js
//
// 🪤 EL RELOJ VA CONGELADO. Las fechas se INVENTAN (SIM.fecha = 2026-08-10, un lunes lejos de Fiestas Patrias y a
// las 12:00, lejos del cambio de turno) y `Date` se congela en el proceso: una guardia que lee el reloj real da
// distinto según CUÁNDO se corra.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CONGELADO = new Date('2026-08-10T12:00:00').getTime();
const Real = Date;
function Falso(...a) { return a.length ? new Real(...a) : new Real(CONGELADO); }
Falso.now = () => CONGELADO; Falso.parse = Real.parse; Falso.UTC = Real.UTC; Falso.prototype = Real.prototype;
global.Date = Falso;

const V2 = path.resolve(__dirname, '..', '..', 'v2');
const SIMDIR = path.resolve(__dirname, '..', 'sim');

const fails = [];
const eq = (l, g, w) => {
  const okk = String(g) === String(w);
  console.log((okk ? '✅' : '❌') + ' ' + l + ': ' + JSON.stringify(g) + (okk ? '' : ' (esperado ' + JSON.stringify(w) + ')'));
  if (!okk) fails.push(l);
};
const si = (l, c) => eq(l, !!c, true);
const no = (l, c) => eq(l, !!c, false);
const info = t => console.log('ℹ️  ' + t);
const terminar = () => {
  console.log(fails.length ? `\n❌ ${fails.length} fallos:\n  - ${fails.join('\n  - ')}` : '\n✅ guardado_seguro_banco: el banco mide lo que dice medir.');
  process.exit(fails.length ? 1 : 0);
};
// Los servicios traducen un error a `err(msg, codigo, e)` (que hace console.error) o lo tragan con un console.warn
// (`_sincronizarTimelineCama`): con la corrida «muerta» cada escritura bloqueada que un catch se traga imprimiría su
// pila. Se calla SOLO dentro de la prueba.
const callando = fn => {
  const ce = console.error, cw = console.warn; console.error = () => {}; console.warn = () => {};
  try { return fn(); } finally { console.error = ce; console.warn = cw; }
};

/* ══ 0 · EL BANCO EXISTE ══════════════════════════════════════════════════ */
console.log('0 · El banco existe');
const S = require('../sim/sim_srv.js');
const { api, DB, SIM, CONFIG } = S;
SIM.fecha = '2026-08-10'; SIM.hora = '12:00:00';

si('sim_srv.js exporta activarLockReal', typeof S.activarLockReal === 'function');
si('build/sim/sim_muerte.js existe', fs.existsSync(path.join(SIMDIR, 'sim_muerte.js')));
let M = null;
try { M = require('../sim/sim_muerte.js'); } catch (e) { console.log('   (no se pudo cargar sim_muerte.js: ' + (e && e.code || e) + ')'); }
if (typeof S.activarLockReal !== 'function' || !M) {
  fails.push('el banco no está construido: sin activarLockReal ni sim_muerte no hay nada más que medir');
  terminar();
}

const FOTO0 = M.foto();                       // el mundo recién nacido: cada sección parte de aquí
const reset = () => M.restaurar(FOTO0);

/* ══ 1 · SIN PEDIRLO, NADA CAMBIA ═════════════════════════════════════════ */
// Cada guardia corre en SU proceso, así que `activarLockReal()` de más abajo no contamina a nadie; lo que hay que
// atar es que el simple `require('sim_srv.js')` —lo que hacen todos los bancos de siempre— deja el conLock de juguete.
console.log('\n1 · Un banco que no lo pide sigue con el conLock de juguete');
const sondeo = JSON.parse(execFileSync(process.execPath, ['-e', `
  const S = require(${JSON.stringify(path.join(SIMDIR, 'sim_srv.js'))});
  const lk = LockService.getScriptLock();
  console.log(JSON.stringify({
    fuente: String(global.conLock), tryLock: typeof lk.tryLock, waitLock: typeof lk.waitLock,
    directo: global.conLock(() => 7), anidado: global.conLock(() => global.conLock(() => 8)),
    exporta: typeof S.activarLockReal }));
`], { encoding: 'utf8' }));
si('el conLock es el de juguete (fn => fn())', /^\s*fn\s*=>\s*fn\(\)\s*$/.test(sondeo.fuente));
eq('   …y devuelve lo que devuelve el cuerpo', sondeo.directo, 7);
eq('   …y es reentrante (los bancos viejos anidan sin saberlo)', sondeo.anidado, 8);
eq('el LockService de siempre sigue sin tryLock (solo waitLock/releaseLock)', sondeo.tryLock + '/' + sondeo.waitLock, 'undefined/function');
eq('pero la función para pedir el lock real existe en el módulo', sondeo.exporta, 'function');

/* ══ 2 · EL conLock REAL ══════════════════════════════════════════════════ */
console.log('\n2 · activarLockReal(): el conLock es el de v2/infra_lock.gs, el de verdad');
const ctl = S.activarLockReal();
const fuenteLock = fs.readFileSync(path.join(V2, 'infra_lock.gs'), 'utf8');
si('★ el conLock instalado ES el texto de infra_lock.gs (no una copia que se pueda desviar)', fuenteLock.includes(String(global.conLock)));
si('   …y usa tryLock (lo que el juguete no hace)', /tryLock/.test(String(global.conLock)));
si('pedirlo de nuevo devuelve el MISMO control (no reinstala nada)', S.activarLockReal() === ctl);

let dentro = null;
const ret = conLock(() => { dentro = ctl.estado().tomado; return { valor: 42 }; });
eq('★ el cuerpo corre con el candado TOMADO', dentro, true);
eq('   …conLock devuelve lo que devuelve el cuerpo', JSON.stringify(ret), '{"valor":42}');
eq('   …y al salir el candado queda libre', ctl.estado().tomado, false);
eq('   …pidiéndolo con la espera de 10 s que declara infra_lock.gs', ctl.estado().timeouts.join(','), '10000');

let anidado = null;
conLock(() => { anidado = conLock(() => 'no debería correr'); });
eq('★ con el candado tomado, un segundo conLock devuelve LOCK_TIMEOUT sin correr su cuerpo', anidado && anidado.ok + '/' + anidado.codigo, 'false/LOCK_TIMEOUT');
si('   …con el mensaje de infra_lock.gs', anidado && /ocupado/.test(anidado.error || ''));
eq('   …y el candado del de afuera se soltó igual', ctl.estado().tomado, false);

let lanzo = null;
try { conLock(() => { throw new Error('boom del cuerpo'); }); } catch (e) { lanzo = e.message; }
eq('★ si el cuerpo lanza, el error sale por conLock…', lanzo, 'boom del cuerpo');
eq('   …y el candado NO queda tomado (el finally)', ctl.estado().tomado, false);
eq('   …y el siguiente conLock corre normal', conLock(() => 'luego'), 'luego');
const e2 = ctl.estado();
eq('cada toma tuvo su liberación', e2.tomas + '/' + e2.liberaciones, e2.tomas + '/' + e2.tomas);
si('hubo rechazos contados (el anidado)', e2.rechazos >= 1);

/* ══ 3 · EL GANCHO antesDelCuerpo ═════════════════════════════════════════ */
// «Mientras esta petición esperaba el candado, otra se adelantó». En un solo hilo eso es: la otra petición corre
// ENTERA —con su propio conLock— dentro de la espera de la nuestra, y cuando nosotros obtenemos el candado el mundo
// ya cambió. Una comprobación hecha FUERA del lock no ve ese cambio; una hecha dentro, sí.
console.log('\n3 · antesDelCuerpo corre dentro del conLock real, con el candado libre, una sola vez');
reset();
const traza = []; let ganchos = 0;
ctl.antesDelCuerpo = () => {
  ganchos++;
  const e = ctl.estado();
  traza.push('gancho enEspera=' + e.enEspera + ' tomado=' + e.tomado);
  const otra = conLock(() => {
    traza.push('otra petición, dentro de su conLock, tomado=' + ctl.estado().tomado);
    repoActualizar('CAMAS_ESTADO', 'ID_CAMA', '1', { NOMBRE: 'la-otra-peticion' });
    return 'otra-ok';
  });
  traza.push('la otra devolvió ' + otra);
};
const mia = conLock(() => {
  const c1 = DB.CAMAS_ESTADO.find(c => String(c.ID_CAMA) === '1');
  traza.push('cuerpo tomado=' + ctl.estado().tomado + ' ve=' + c1.NOMBRE);
  return 'mía';
});
eq('★ el gancho corrió mientras esta petición ESPERABA el candado (libre), la otra tomó el suyo, y el cuerpo ve el cambio',
  traza.join(' | '),
  'gancho enEspera=true tomado=false | otra petición, dentro de su conLock, tomado=true | la otra devolvió otra-ok | cuerpo tomado=true ve=la-otra-peticion');
eq('   …el cuerpo de esta petición devolvió lo suyo', mia, 'mía');
eq('   …el gancho corrió UNA vez (la otra petición no lo dispara de nuevo)', ganchos, 1);
eq('   …y quedó consumido', ctl.antesDelCuerpo, null);
conLock(() => 1);
eq('   …el siguiente conLock no lo vuelve a correr', ganchos, 1);

const ctl2 = S.activarLockReal({ antesDelCuerpo: () => { ganchos++; } });
eq('el gancho también se arma al pedir el lock real (y es el mismo control)', (ctl2 === ctl) + '/' + typeof ctl.antesDelCuerpo, 'true/function');
conLock(() => 1);
eq('   …y corre en el siguiente conLock', ganchos, 2);

// Un gancho que lanza no deja el candado tomado: la otra petición murió, la nuestra no tenía nada tomado.
ctl.antesDelCuerpo = () => { throw new Error('la otra petición reventó'); };
let revento = null; let corrioCuerpo = false;
try { conLock(() => { corrioCuerpo = true; }); } catch (e) { revento = e.message; }
eq('si el gancho lanza, el error sale…', revento, 'la otra petición reventó');
eq('   …el cuerpo no corrió y el candado no quedó tomado', corrioCuerpo + '/' + ctl.estado().tomado, 'false/false');

// Contra un servicio REAL: dos ingresos a la misma cama. La otra petición ingresa primero; el servicio, que lee la
// cama DENTRO del lock, ve la cama ocupada y no escribe nada.
reset(); M.reiniciar();
const ingreso = (idCama, nombre) => api('INGRESAR_PACIENTE', { idCama: String(idCama), nombre, edad: 61, sexo: 'M',
  diagnostico: 'Dx de prueba', fechaIngreso: '2026-08-08', viaAerea: 'TOT', soporte: 'VM', modo: 'ACVC', firmaKine: 'DMV' }, null);
let escriturasHastaElGancho = 0;
ctl.antesDelCuerpo = () => { const o = ingreso('6', 'Paciente Beta'); escriturasHastaElGancho = M.total(); if (!o.ok) fails.push('la otra petición no pudo ingresar'); };
const nuestra = ingreso('6', 'Paciente Alfa');
no('★ con el gancho, el ingreso de esta petición es el segundo y se rechaza', nuestra.ok);
eq('   …la cama quedó con el que entró primero', (DB.CAMAS_ESTADO.find(c => String(c.ID_CAMA) === '6') || {}).NOMBRE, 'Paciente Beta');
si('   …la otra petición sí escribió', escriturasHastaElGancho >= 2);
eq('★ …y esta petición no escribió NADA después de verla ocupada', M.total() - escriturasHastaElGancho, 0);

/* ══ 4 · EL CACHÉ SE PUEDE HACER FALLAR ═══════════════════════════════════ */
// El sello vive en CacheService y tiene que ser fail-open: sin banco que lo haga fallar, esa promesa no se puede probar.
console.log('\n4 · El CacheService del banco se puede hacer fallar, y recupera lo que había');
reset();
const cache = () => CacheService.getScriptCache();
const intenta = f => { try { f(); return 'ok'; } catch (e) { return /CacheService/.test(e.message) ? 'falla' : 'otro error: ' + e.message; } };
cache().put('k0', 'v0', 60);
eq('sin fallar, guarda y lee', cache().get('k0'), 'v0');
ctl.cache.fallar(true);
eq('★ fallando: get lanza', intenta(() => cache().get('k0')), 'falla');
eq('   …put lanza', intenta(() => cache().put('k1', 'v1', 60)), 'falla');
eq('   …remove lanza', intenta(() => cache().remove('k0')), 'falla');
ctl.cache.fallar(false);
eq('★ recuperado: lo guardado antes sigue ahí', cache().get('k0'), 'v0');
eq('   …y lo que no pudo guardarse no existe', cache().get('k1'), null);
eq('   …y vuelve a guardar', intenta(() => cache().put('k1', 'v1', 60)) + '/' + cache().get('k1'), 'ok/v1');

/* ══ 5 · LOS ESCRITORES QUE EL BANCO ENVUELVE ═════════════════════════════ */
console.log('\n5 · sim_muerte envuelve los escritores: los de episodio_al_guardar.js y los de repo.gs');
const nombresDe = txt => [...txt.matchAll(/'([A-Za-z_]+)'/g)].map(m => m[1]);
const fuenteEpi = fs.readFileSync(path.join(__dirname, 'episodio_al_guardar.js'), 'utf8');
const listaEpi = nombresDe((fuenteEpi.match(/const ESCRITORES = \[([\s\S]*?)\];/) || [, ''])[1]);
si('se leyó la lista de episodio_al_guardar.js', listaEpi.length >= 11);
eq('★ ESCRITORES de sim_muerte es la MISMA lista que la de episodio_al_guardar.js', M.ESCRITORES.slice().sort().join(','), listaEpi.slice().sort().join(','));

// La lista de la guardia vieja la escribió una persona; la de repo.gs se DERIVA del fuente: un escritor nuevo en
// repo.gs que el banco no envuelva dejaría matrices de muerte que no cortan ahí, en silencio.
function escritoresDeRepoGs() {
  const src = fs.readFileSync(path.join(V2, 'repo.gs'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const re = /^function (\w+)\(/gm; const fns = []; let m;
  while ((m = re.exec(src))) fns.push({ n: m[1], i: m.index });
  fns.forEach((f, k) => { f.cuerpo = src.slice(f.i, k + 1 < fns.length ? fns[k + 1].i : src.length).replace(/^function \w+\(/, ''); });
  const publicas = fns.filter(f => /^repo/.test(f.n));            // los ayudantes internos llevan guion bajo
  const directo = /\.(setValues?|appendRow|deleteRows?|insertRowsAfter|insertRowAfter|insertRowBefore|clearContent|clear)\(/;
  const esc = new Set(publicas.filter(f => directo.test(f.cuerpo)).map(f => f.n));
  for (let cambio = true; cambio;) {                                // las que DELEGAN en una escritora también escriben
    cambio = false;
    publicas.forEach(f => {
      if (!esc.has(f.n) && [...esc].some(e => new RegExp('\\b' + e + '\\(').test(f.cuerpo))) { esc.add(f.n); cambio = true; }
    });
  }
  return [...esc].sort();
}
const deRepo = escritoresDeRepoGs();
si('se derivaron los escritores de repo.gs', deRepo.length >= 10);
eq('★ cada escritor público de repo.gs está envuelto, y el banco no envuelve de más',
  M.ESCRITORES.filter(n => /^repo/.test(n)).sort().join(','), deRepo.join(','));
si('escribirConfig también (CONFIG es una hoja)', M.ESCRITORES.includes('escribirConfig'));
eq('el caché cuenta como escritura: put y remove', M.ESCRITORES_CACHE.join(','), 'put,remove');

/* ══ 6 · LA ESCRITURA N ATERRIZA Y NINGUNA MÁS ════════════════════════════ */
console.log('\n6 · muereTrasLaEscritura(n): la N aterriza; desde ahí todo lo que escribe lanza, aunque un catch la trague');
// Un escenario con escrituras que tragan el error (como los `catch` de los servicios) y una que no.
function escenario() {
  repoInsertar('TIMELINE', { ID_HITO: 'H1', ID_CAMA: '1', TEXTO: 'uno' });                      // 1
  try { repoActualizar('CAMAS_ESTADO', 'ID_CAMA', '1', { NOMBRE: 'Dos' }); } catch (e) { /* la tragan */ }   // 2
  try { escribirConfig('CLAVE_DE_PRUEBA', 'tres'); } catch (e) { /* la tragan */ }             // 3
  repoInsertar('TIMELINE', { ID_HITO: 'H4', ID_CAMA: '1', TEXTO: 'cuatro' });                   // 4
  return 'terminó';
}
const efectos = () => [
  DB.TIMELINE.some(h => h.ID_HITO === 'H1'),
  (DB.CAMAS_ESTADO.find(c => String(c.ID_CAMA) === '1') || {}).NOMBRE === 'Dos',
  CONFIG.CLAVE_DE_PRUEBA === 'tres',
  DB.TIMELINE.some(h => h.ID_HITO === 'H4'),
];
const TOTAL_ESC = 4;
for (let n = 0; n <= TOTAL_ESC + 1; n++) {
  reset();
  M.muereTrasLaEscritura(n);
  let salio = null, lanzoE = null;
  try { salio = escenario(); } catch (e) { lanzoE = e; }
  const esperado = [1, 2, 3, 4].map(k => k <= n);
  eq('N=' + n + ' · aterrizan exactamente las escrituras 1..' + Math.min(n, TOTAL_ESC), efectos().join(','), esperado.join(','));
  eq('   …el conteo del banco', M.total(), Math.min(n, TOTAL_ESC));
  eq('   …murió' + (n > TOTAL_ESC ? ' (nunca llegó a la N: no muere)' : ''), M.murio(), n <= TOTAL_ESC);
  if (n < TOTAL_ESC) {
    // La 4 está FUERA de todo catch: la muerte llega hasta quien llamó, con un código que la identifica.
    eq('   …la que no tiene catch lanza hasta afuera, identificada', lanzoE && lanzoE.codigo, 'SIM_MUERTE');
    eq('   …y el escenario no llegó al final', salio, null);
    // Las que SÍ tiene catch entre la muerte y el final se intentaron y se bloquearon.
    // Con N=0 el escenario se aborta en la 1 (sin catch) y no llega a intentar las demás.
    const intentos = ['repoInsertar(TIMELINE)', 'repoActualizar(CAMAS_ESTADO)', 'escribirConfig(CLAVE_DE_PRUEBA)', 'repoInsertar(TIMELINE)'];
    const esperadasBloq = n === 0 ? intentos.slice(0, 1) : intentos.slice(n);
    eq('   …lo que se intentó después de la muerte quedó anotado como bloqueado', M.intentosTrasLaMuerte().join(' | '), esperadasBloq.join(' | '));
  } else {
    eq('   …el escenario llegó al final sin lanzar', salio + '/' + lanzoE, 'terminó/null');
    eq('   …sin nada bloqueado', M.intentosTrasLaMuerte().length, 0);
  }
}

reset();
M.muereTrasLaEscritura(1);
repoInsertar('TIMELINE', { ID_HITO: 'A' });                      // la 1 aterriza y la corrida muere
let tarde = null;
try { repoInsertar('TIMELINE', { ID_HITO: 'TARDE' }); } catch (e) { tarde = e.codigo; }
eq('★ el bloqueo es PERMANENTE: una escritura mucho después de la muerte, ya fuera de cualquier escenario, también lanza', tarde, 'SIM_MUERTE');
no('   …y no aterrizó', DB.TIMELINE.some(h => h.ID_HITO === 'TARDE'));
M.reiniciar();
repoInsertar('TIMELINE', { ID_HITO: 'REVIVIDA' });
si('★ reiniciar() es «el script vuelve a correr»: las escrituras aterrizan otra vez', DB.TIMELINE.some(h => h.ID_HITO === 'REVIVIDA'));
eq('   …con el conteo en cero y sin muerte armada', M.total() + '/' + M.murio(), '1/false');
reset();
M.muereTrasLaEscritura(0);
eq('N=0: muere ANTES de la primera escritura', M.murio(), true);
try { repoInsertar('TIMELINE', { ID_HITO: 'X' }); } catch (e) { /* bloqueada */ }
eq('   …y la primera ya no aterriza', DB.TIMELINE.length, 0);
M.reiniciar();

/* ══ 7 · CADA ESCRITOR, UNO POR UNO ═══════════════════════════════════════ */
console.log('\n7 · Cada escritor cuenta UNA escritura viva, y muerto lanza sin tocar nada');
const SEMBRAR = () => {
  reset();
  repoInsertarVarios('TIMELINE', [{ ID_HITO: 'S1', ID_CAMA: '1', TEXTO: 'uno' }, { ID_HITO: 'S2', ID_CAMA: '1', TEXTO: 'dos' }, { ID_HITO: 'S3', ID_CAMA: '2', TEXTO: 'tres' }]);
  M.reiniciar();
};
const LLAMADAS = {
  'repoActualizar':        () => repoActualizar('TIMELINE', 'ID_HITO', 'S1', { TEXTO: 'cambiado' }),
  'repoActualizarDonde':   () => repoActualizarDonde('TIMELINE', r => r.ID_HITO === 'S1', () => ({ TEXTO: 'cambiado' })),
  'repoInsertar':          () => repoInsertar('TIMELINE', { ID_HITO: 'NUEVO', ID_CAMA: '3' }),
  'repoInsertarVarios':    () => repoInsertarVarios('TIMELINE', [{ ID_HITO: 'V1' }, { ID_HITO: 'V2' }]),
  'repoUpsert#actualizar': () => repoUpsert('TIMELINE', 'ID_HITO', 'S2', { ID_HITO: 'S2', TEXTO: 'reescrito' }),
  'repoUpsert#crear':      () => repoUpsert('TIMELINE', 'ID_HITO', 'NUEVO', { ID_HITO: 'NUEVO', TEXTO: 'creado' }),
  'repoUpsertEnFila#actualizar': () => repoUpsertEnFila('TIMELINE', 3, { ID_HITO: 'S2', TEXTO: 'en fila' }),
  'repoUpsertEnFila#crear': () => repoUpsertEnFila('TIMELINE', -1, { ID_HITO: 'NUEVO', TEXTO: 'en fila nueva' }),
  'repoEscribirFila':      () => repoEscribirFila('TIMELINE', 2, { ID_HITO: 'S1', TEXTO: 'fila reescrita' }),
  'repoEliminarDonde':     () => repoEliminarDonde('TIMELINE', r => r.ID_HITO === 'S1'),
  'repoEliminarFilas':     () => repoEliminarFilas('TIMELINE', [2]),
  'repoEliminarPorCols':   () => repoEliminarPorCols('TIMELINE', ['ID_HITO'], o => o.ID_HITO === 'S3'),
  'escribirConfig':        () => escribirConfig('CLAVE_DE_PRUEBA', 'valor'),
};
eq('★ la tabla cubre EXACTAMENTE los escritores del banco (uno nuevo sin caso da rojo)',
  [...new Set(Object.keys(LLAMADAS).map(k => k.split('#')[0]))].sort().join(','), M.ESCRITORES.slice().sort().join(','));
Object.keys(LLAMADAS).forEach(k => {
  const nombre = k.split('#')[0];
  SEMBRAR();
  const antes = M.instantanea();
  LLAMADAS[k]();
  eq(k + ' · viva: cuenta UNA escritura (aunque el doble llame a otro escritor por dentro)', M.total() + '/' + M.registro()[0].split('(')[0], '1/' + nombre);
  si('   …y cambió la base', M.instantanea() !== antes);
  SEMBRAR();
  M.muereTrasLaEscritura(0);
  const fotoMuerta = M.instantanea();
  let c = null; try { LLAMADAS[k](); } catch (e) { c = e.codigo; }
  eq('   …muerta: lanza SIM_MUERTE', c, 'SIM_MUERTE');
  si('   …sin tocar la base', M.instantanea() === fotoMuerta);
  M.reiniciar();
});

/* ══ 8 · EL CACHÉ TAMBIÉN ES UNA ESCRITURA (EL SELLO) ═════════════════════ */
// Si el banco dejara escribir el caché a una corrida «muerta», el sello de operación se grabaría igual y el reintento
// vería «ya hecho» sobre un estado que quedó a medias: la matriz saldría verde sin probar nada. Un corte justo entre
// la última escritura a hojas y el sello es EL caso que el id derivado y el «insertar si no existe» tienen que cubrir.
console.log('\n8 · El caché cuenta como escritura y, muerta la corrida, no se escribe');
reset(); M.reiniciar();
cache().put('s1', 'v', 60);
eq('put cuenta una escritura', M.total() + '/' + M.registro().join(','), '1/CacheService.put(s1)');
eq('get no cuenta', (cache().get('s1'), M.total()), 1);
cache().remove('s1');
eq('remove cuenta otra', M.registro().join(','), 'CacheService.put(s1),CacheService.remove(s1)');
cache().put('s2', 'dos', 60);
M.muereTrasLaEscritura(0);
let cm = null; try { cache().put('s3', 'tres', 60); } catch (e) { cm = e.codigo; }
eq('★ muerta la corrida, el sello no se escribe', cm + '/' + cache().get('s3'), 'SIM_MUERTE/null');
eq('   …ni se borra lo que había', (() => { try { cache().remove('s2'); } catch (e) { /* bloqueado */ } return cache().get('s2'); })(), 'dos');
eq('   …pero se puede LEER (una corrida muerta ya no lee, la que reintenta sí)', cache().get('s2'), 'dos');
M.reiniciar();
reset();
eq('restaurar() vacía el caché (cada escenario parte limpio)', cache().get('s2'), null);

// El otro orden de carga: sim_muerte primero y activarLockReal después. Cada módulo envuelve al anterior; el orden no
// puede importar. Se prueba en un proceso aparte porque este ya tiene el orden contrario.
const orden = JSON.parse(execFileSync(process.execPath, ['-e', `
  const M = require(${JSON.stringify(path.join(SIMDIR, 'sim_muerte.js'))});
  const S = require(${JSON.stringify(path.join(SIMDIR, 'sim_srv.js'))});
  const ctl = S.activarLockReal();
  const c = () => CacheService.getScriptCache();
  const r = {};
  c().put('a', '1', 60); r.cuenta = M.total();
  ctl.cache.fallar(true);
  try { c().put('b', '2', 60); r.falla = 'no lanzó'; } catch (e) { r.falla = /CacheService/.test(e.message) ? 'falla' : e.message; }
  ctl.cache.fallar(false);
  r.noCuentaLoQueFallo = M.total();
  M.muereTrasLaEscritura(0);
  try { c().put('c', '3', 60); r.muerta = 'no lanzó'; } catch (e) { r.muerta = e.codigo; }
  console.log(JSON.stringify(r));
`], { encoding: 'utf8' }));
eq('orden inverso: el put cuenta', orden.cuenta, 1);
eq('   …el que falla por el interruptor lanza y NO cuenta como aterrizado', orden.falla + '/' + orden.noCuentaLoQueFallo, 'falla/1');
eq('   …y muerto, lanza SIM_MUERTE', orden.muerta, 'SIM_MUERTE');

/* ══ 9 · instantanea(): LA FOTO COMPARABLE ════════════════════════════════ */
console.log('\n9 · instantanea(): sin TIMESTAMP/TS, ids renombrados por orden de aparición, sensible a lo que importa');
const fila = (extra) => Object.assign({ ID_HITO: 'X1', ID_CAMA: '1', TEXTO: 'algo', TIMESTAMP: '2026-08-10 12:00:00' }, extra || {});
const conFilas = (filas, h) => { reset(); filas.forEach(f => DB[h || 'TIMELINE'].push(f)); return M.instantanea(); };
const base1 = conFilas([fila()]);
no('las columnas TIMESTAMP y TS no están en la foto', /TIMESTAMP|"TS"/.test(base1));
si('★ cambiar SOLO el TIMESTAMP no cambia la foto', conFilas([fila({ TIMESTAMP: '2031-01-01 00:00:00' })]) === base1);
si('   …ni el TS (la hoja de avisos lo llama TS y no TIMESTAMP)', conFilas([{ ID_NOTIF: 'N1', TS: '1' }], 'AUDIT_LOG') === conFilas([{ ID_NOTIF: 'N1', TS: '2' }], 'AUDIT_LOG'));
no('★ cambiar un valor SÍ la cambia', conFilas([fila({ TEXTO: 'otra cosa' })]) === base1);
no('   …sobrar una fila (un duplicado) también', conFilas([fila(), fila()]) === base1);
no('   …y faltar una', conFilas([]) === base1);
eq('   …el orden de las claves de una fila no importa', conFilas([{ TEXTO: 'algo', ID_CAMA: '1', ID_HITO: 'X1' }]) === conFilas([{ ID_HITO: 'X1', ID_CAMA: '1', TEXTO: 'algo' }]), true);
no('   …un id que NO es generado (CAMA_5 contra CAMA_6) se distingue', conFilas([fila({ ID_HITO: 'CAMA_5_2026-08-10-Dia' })]) === conFilas([fila({ ID_HITO: 'CAMA_6_2026-08-10-Dia' })]));
// Ids generados: el contador del simulador, el formato de uid() y un UUID de verdad.
eq('★ dos corridas con otros ids generados dan la MISMA foto',
  conFilas([fila({ ID_HITO: 'HITO_1790000000001_ABCDE', PATIENT_ID: 'uuid-3' })]) === conFilas([fila({ ID_HITO: 'HITO_1790000099999_ZZ9Y8', PATIENT_ID: 'uuid-71' })]), true);
eq('   …también con un UUID real (el PATIENT_ID que acuñará la pantalla)',
  conFilas([fila({ PATIENT_ID: '3f2b8c1e-5d4a-4b7e-9a1c-0d2e4f6a8b10' })]) === conFilas([fila({ PATIENT_ID: '9a8b7c6d-1e2f-4a3b-8c4d-5e6f7a8b9c0d' })]), true);
eq('   …el id embebido en un JSON de una celda (PENDIENTES_JSON) también se renombra',
  conFilas([fila({ PEND: JSON.stringify([{ id: 'uuid12', t: 'x' }]) })]) === conFilas([fila({ PEND: JSON.stringify([{ id: 'uuid99', t: 'x' }]) })]), true);
no('★ pero renombrar NO borra la estructura: un id repetido en dos filas no es lo mismo que dos ids distintos',
  conFilas([fila({ PATIENT_ID: 'uuid-1' }), fila({ PATIENT_ID: 'uuid-1' })]) === conFilas([fila({ PATIENT_ID: 'uuid-1' }), fila({ PATIENT_ID: 'uuid-2' })]));
// El orden físico de las filas CUENTA (una hoja no es un conjunto: el timeline se ordena por posición); y si dos fotos
// difieren SOLO en el orden, diferencias() devuelve cero líneas, que es como se lee ese caso.
const ordenAB = conFilas([fila({ ID_HITO: 'A' }), fila({ ID_HITO: 'B' })]), ordenBA = conFilas([fila({ ID_HITO: 'B' }), fila({ ID_HITO: 'A' })]);
no('   …el orden de las filas cuenta', ordenAB === ordenBA);
eq('   …y diferencias() lo dice con cero líneas (solo cambió el orden)', M.diferencias(ordenAB, ordenBA).length, 0);
// `sinOrden` (paso 10): las hojas que se DECLAREN se comparan como conjunto. Es para las que nadie lee por posición (un reintento
// que borra y reinserta sus filas las deja en otro lugar físico, y eso solo no es una diferencia de estado); por omisión ninguna.
const sinOrdenDe = (filas, hojas) => { reset(); filas.forEach(f => DB.TIMELINE.push(f)); return M.instantanea({ sinOrden: hojas }); };
const AB = [fila({ ID_HITO: 'A' }), fila({ ID_HITO: 'B' })], BA = [fila({ ID_HITO: 'B' }), fila({ ID_HITO: 'A' })];
si('★ sinOrden: dos fotos que difieren SOLO en el orden de las filas de esa hoja son la misma', sinOrdenDe(AB, ['TIMELINE']) === sinOrdenDe(BA, ['TIMELINE']));
no('   …y por omisión el orden sigue contando (no cambió para nadie)', sinOrdenDe(AB, undefined) === sinOrdenDe(BA, undefined));
no('   …y declarar OTRA hoja no afloja ésta', sinOrdenDe(AB, ['EVALUACIONES']) === sinOrdenDe(BA, ['EVALUACIONES']));
no('   …sobrar una fila sigue distinguiéndose', sinOrdenDe([fila({ ID_HITO: 'A' }), fila({ ID_HITO: 'A' })], ['TIMELINE']) === sinOrdenDe([fila({ ID_HITO: 'A' })], ['TIMELINE']));
no('   …y cambiar un valor también', sinOrdenDe([fila({ TEXTO: 'uno' }), fila({ TEXTO: 'dos' })], ['TIMELINE']) === sinOrdenDe([fila({ TEXTO: 'uno' }), fila({ TEXTO: 'tres' })], ['TIMELINE']));
// `jsonComoConjunto`: la caché TIMELINE_JSON de la cama (los 30 hitos más recientes, ordenados por un TIMESTAMP que en un mismo
// guardado es el mismo segundo): su orden entre hitos del mismo segundo es el de la hoja, y no es un estado distinto.
const cacheDe = (lista, opts) => { reset(); DB.CAMAS_ESTADO[0].TIMELINE_JSON = JSON.stringify(lista); return M.instantanea(opts); };
const h1 = { ID_HITO: 'HITO_1790000000001_ABCDE', TEXTO: 'uno' }, h2 = { ID_HITO: 'HITO_1790000000001_ZZZZZ', TEXTO: 'dos' };
const h1b = { ID_HITO: 'HITO_1790000000001_MMMMM', TEXTO: 'uno' }, h2b = { ID_HITO: 'HITO_1790000000001_AAAAA', TEXTO: 'dos' };
si('★ jsonComoConjunto: una caché con los mismos hitos en otro orden (y otros ids generados) es la misma foto', cacheDe([h1, h2], { jsonComoConjunto: ['TIMELINE_JSON'] }) === cacheDe([h2b, h1b], { jsonComoConjunto: ['TIMELINE_JSON'] }));
no('   …por omisión el orden de esa lista sigue contando', cacheDe([h1, h2]) === cacheDe([h2b, h1b]));
no('   …un hito de más o de menos en la caché sigue distinguiéndose', cacheDe([h1, h2], { jsonComoConjunto: ['TIMELINE_JSON'] }) === cacheDe([h1], { jsonComoConjunto: ['TIMELINE_JSON'] }));
no('   …y un texto distinto también', cacheDe([h1, h2], { jsonComoConjunto: ['TIMELINE_JSON'] }) === cacheDe([h1, { ID_HITO: 'HITO_1790000000001_ZZZZZ', TEXTO: 'otro' }], { jsonComoConjunto: ['TIMELINE_JSON'] }));
si('★ con ids generados DISTINTOS y en otro orden físico la foto es la misma (se ordena por el contenido, no por el id crudo)',
  sinOrdenDe([fila({ ID_HITO: 'HITO_1790000000001_ABCDE', TEXTO: 'primero' }), fila({ ID_HITO: 'HITO_1790000000001_ZZZZZ', TEXTO: 'segundo' })], ['TIMELINE']) ===
  sinOrdenDe([fila({ ID_HITO: 'HITO_1790000000001_AAAAA', TEXTO: 'segundo' }), fila({ ID_HITO: 'HITO_1790000000001_MMMMM', TEXTO: 'primero' })], ['TIMELINE']));
// La bitácora y la configuración.
reset(); const sinBit0 = M.instantanea({ sinHojas: ['AUDIT_LOG'] }), conBit0 = M.instantanea();
DB.AUDIT_LOG.push({ ID: 'a', ACCION: 'X' });
si('sinHojas: la bitácora se puede dejar fuera', M.instantanea({ sinHojas: ['AUDIT_LOG'] }) === sinBit0);
no('   …y por omisión entra', M.instantanea() === conBit0);
reset(); const cfg0 = M.instantanea(); CONFIG.CLAVE_NUEVA = '1';
no('la configuración entra a la foto (escribirConfig es una escritura)', M.instantanea() === cfg0);
delete CONFIG.CLAVE_NUEVA;
// diferencias(): para leer una matriz roja sin comparar a ojo dos fotos largas.
const dA = conFilas([fila(), fila({ ID_HITO: 'X2' })]), dB = conFilas([fila(), fila({ ID_HITO: 'X3' })]);
const dd = M.diferencias(dA, dB);
eq('diferencias(): dos líneas, una de cada lado', dd.length + '/' + dd.map(l => l[0]).join(''), '2/-+');
si('   …que nombran la fila que sobra y la que falta', /X2/.test(dd[0]) && /X3/.test(dd[1]));
eq('   …y fotos iguales no dan ninguna', M.diferencias(dA, dA).length, 0);

// foto() / restaurar(): volver al mismo punto cuantas veces haga falta.
reset();
const f0 = M.instantanea();
DB.NUEVA_HOJA_DE_PRUEBA = [{ A: 1 }]; DB.CAMAS_ESTADO[0].NOMBRE = 'ensuciada'; CONFIG.OTRA = 'x'; cache().put('residuo', '1', 60);
reset();
eq('★ restaurar() devuelve el mundo EXACTO (valores, hojas nuevas, CONFIG y caché)', M.instantanea() === f0 && !('NUEVA_HOJA_DE_PRUEBA' in DB) && !('OTRA' in CONFIG) && cache().get('residuo') === null, true);
DB.CAMAS_ESTADO[0].NOMBRE = 'ensuciada otra vez'; reset();
eq('   …y la misma foto sirve más de una vez (no se gasta ni se comparte con la base viva)', M.instantanea() === f0, true);

// Estable de punta a punta con el servicio real: ingreso + guardado de evolución, dos veces, desde la misma foto.
const TK = '2026-08-10-Dia';
const evo = idCama => ({ ID_CAMA: String(idCama), TURNO_KEY: TK, PLAN_FIRMA_KINE: 'DMV', VENT_VIA_AEREA: 'TOT', VENT_SOPORTE: 'VM', VENT_MODO: 'ACVC',
  VENT_VT: 450, VENT_FR: 16, VENT_PEEP: 8, VENT_FIO2: 50, HEMO_ESTADO: 'Estable', SED_TIPO: 'Sin sedación' });
const corridaReal = () => {
  const a = ingreso('7', 'Paciente Eco');
  const pid = (a.data || {}).patientId;
  const b = api('GUARDAR_EVOLUCION', Object.assign(evo('7'), { EPISODIO_ABIERTO: pid, RESP_KTR_CANT: 2 }), null);
  return a.ok && b.ok;
};
reset(); M.reiniciar();
si('la corrida real (ingreso + guardado) sale ok', corridaReal());
const unoLimpio = M.instantanea(); const crudo1 = JSON.stringify(DB.CAMAS_ESTADO) + JSON.stringify(DB.TIMELINE);
const totalReal = M.total();
reset();
corridaReal();
const dosLimpio = M.instantanea(); const crudo2 = JSON.stringify(DB.CAMAS_ESTADO) + JSON.stringify(DB.TIMELINE);
no('las dos corridas NO son iguales en crudo (el contador y el reloj numeran distinto los ids)', crudo1 === crudo2);
eq('★ …y la instantánea sí es la misma: estable entre dos corridas iguales', unoLimpio === dosLimpio, true);
if (unoLimpio !== dosLimpio) M.diferencias(unoLimpio, dosLimpio).slice(0, 6).forEach(l => console.log('     ' + l.slice(0, 200)));
si('   …y el guardado real escribió varias veces (el banco las cuenta)', totalReal >= 4);
no('   …y no queda ningún id generado a la vista', /uuid-?\d|\b[A-Za-z]+_\d{13}\b/.test(unoLimpio));

/* ══ 10 · UNA PUERTA REAL: INTERCAMBIAR_CAMAS, N = 0 .. total+1 ═══════════ */
// El servicio NO se toca: se mira que el banco, aplicado a una puerta de verdad, hace lo que promete. Hoy el
// intercambio son DOS repoActualizar separados, así que una muerte entre ambos deja una escritura partida; que el
// banco la VEA es la prueba de que sirve. Lo que esta guardia afirma es del banco, no del servicio: cuando el paso 9
// arregle la puerta, esta sección sigue verde.
console.log('\n10 · Contra INTERCAMBIAR_CAMAS (sin tocar el servicio): la matriz N = 0..total+1');
reset(); M.reiniciar();
const ia = ingreso('3', 'Paciente Alfa'), ib = ingreso('4', 'Paciente Bravo');
si('se ingresaron los dos pacientes de la prueba', ia.ok && ib.ok);
const FOTO_MOV = M.foto();
const SIN = { sinHojas: ['AUDIT_LOG'] };
const op = () => api('INTERCAMBIAR_CAMAS', { idCamaA: '3', idCamaB: '4' }, null);
const volver = () => M.restaurar(FOTO_MOV);
const pacientesVisibles = () => new Set(DB.CAMAS_ESTADO.filter(c => c.OCUPADA && c.PATIENT_ID).map(c => c.PATIENT_ID)).size;

volver(); const inicial = M.instantanea(SIN);
const r0 = op();
si('la corrida limpia sale ok', r0.ok);
const total = M.total(), regLimpio = M.registro(), limpio = M.instantanea(SIN);
si('   …con más de una escritura (si no, no hay corte posible)', total >= 2);
no('   …y cambió el estado', limpio === inicial);
const parciales = [], difiereTrasReintento = [], visibles = [];
let hayPartido = false;
for (let n = 0; n <= total + 1; n++) {
  volver();
  callando(() => { M.muereTrasLaEscritura(n); op(); });
  const reg = M.registro(), tras = M.instantanea(SIN);
  visibles.push(pacientesVisibles());
  eq('N=' + n + ' · aterrizan exactamente min(N,total) escrituras', M.total(), Math.min(n, total));
  eq('   …y son las PRIMERAS de la corrida limpia, en el mismo orden (el camino es el mismo hasta la muerte)', reg.join('|'), regLimpio.slice(0, Math.min(n, total)).join('|'));
  eq('   …muere si y solo si N ≤ total', M.murio(), n <= total);
  if (n === 0) eq('   …N=0 deja el estado inicial', tras === inicial, true);
  if (n >= total) eq('   …N ≥ total: no se pierde nada, igual a la corrida limpia', tras === limpio, true);
  else if (n > 0 && tras !== limpio) { hayPartido = true; parciales.push(n); }
  M.reiniciar();
  callando(() => op());
  if (M.instantanea(SIN) !== limpio) difiereTrasReintento.push(n);
}
si('★ el banco VE estados partidos: al menos un corte entre 1 y total-1 deja algo distinto de la corrida limpia', hayPartido);
info('cortes N que dejan un estado distinto de la limpia: [' + parciales.join(', ') + '] de total=' + total);
info('pacientes distintos en las dos camas tras morir en N=0..total+1: [' + visibles.join(', ') + '] (dos en la corrida limpia)');
info('cortes tras cuyo REINTENTO (la misma orden otra vez, sin id de operación que la reconozca) el estado final difiere de la limpia: [' + difiereTrasReintento.join(', ') + ']');

terminar();
