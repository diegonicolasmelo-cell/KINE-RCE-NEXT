/**
 * dominio_validacion.gs — Validación de payloads PURA (sin Sheets).
 * Devuelve array de mensajes de error (vacío = OK). Se corre ANTES del lock.
 * Acepta tanto claves de esquema (PAC_EDAD…) como alias del cliente (idCama…).
 */

function validarPayloadEvolucion(d) {
  const errs = [];
  if (!d) return ['Payload vacío'];

  // 🔴 NaN e Infinity no se guardan (G06, 4-oct-2026): se rechazan SOLOS y con el nombre del campo. Ver
  // _errsNoFinitos: sin esto un «Infinity» o un «1e999» entraba a la planilla como si fuera una medición.
  const noFinitos = _errsNoFinitos(d);
  if (noFinitos.length) return noFinitos;

  if (!d.ID_CAMA && !d.idCama) errs.push('Falta ID_CAMA');
  if (!d.TURNO_KEY && !d.turnoKey) errs.push('Falta TURNO_KEY');
  if (!d.PLAN_FIRMA_KINE || String(d.PLAN_FIRMA_KINE).trim() === '') errs.push('Falta firma del kinesiólogo');

  // En INGRESO (crea el episodio) el nombre es obligatorio
  const esIngreso = d.ES_INGRESO === true || String(d.ES_INGRESO) === 'true';
  if (esIngreso && (!d.PAC_NOMBRE || String(d.PAC_NOMBRE).trim() === '')) {
    errs.push('Falta nombre del paciente (ingreso)');
  }

  _rango(errs, d.PAC_EDAD, 'Edad', 15, 110, true);
  _rango(errs, d.PAC_TALLA, 'Talla (cm)', 100, 230, false);
  _rango(errs, d.VENT_FIO2, 'FiO₂ (%)', 21, 100, false);
  _rango(errs, d.VENT_SPO2, 'SpO₂ (%)', 0, 100, false);
  _rango(errs, d.VENT_VT, 'VT (ml)', 50, 1500, false);
  _rango(errs, d.VENT_FR, 'FR (rpm)', 4, 60, false);
  _rango(errs, d.PAC_BARTHEL, 'Barthel', 0, 100, true);

  if (d.VENT_PEEP) {
    const p = parseFloat(d.VENT_PEEP);
    if (!isNaN(p) && p > 30) errs.push('PEEP > 30 cmH₂O — verificar: ' + d.VENT_PEEP);
  }
  validarKTM(d).forEach(function (m) { errs.push(m); });
  validarPVE(d).forEach(function (m) { errs.push(m); });
  return errs;
}

/**
 * validarKTM — las reglas del trío de KTM, EN EL SERVIDOR (20-ago-2026).
 *
 * 🔴 POR QUÉ EXISTE. Estas reglas vivían SOLO en el navegador (`guardar()`, con
 * un toast y un `return`). Cualquier ruta que no pase por ese formulario se las
 * salta — y el botón ➕ del Registro Diario, que es por donde va a entrar la
 * corrección retroactiva, no pasa por ahí. Una regla clínica que solo vive en la
 * pantalla no es una regla: es una sugerencia.
 *
 * 🪤 LO QUE DELIBERADAMENTE **NO** SE VALIDA AQUÍ, y por qué. Cada una de estas
 * se probó y rompía el camino de todos los días:
 *
 *  · «REALIZADA exige nivel»: el formulario arranca en estado `'r'` con el nivel
 *    vacío, y `aplicarGatesEval` BORRA el nivel cuando SAS = 1. Exigirlo aquí
 *    bloquearía el guardado normal. El nivel se exige en la ruta de corrección
 *    del ➕, que es donde alguien está declarando una KTM a conciencia.
 *  · «nivel o razón sin ningún estado»: de noche la KTM no aplica, el estado se
 *    apaga y el nivel se HEREDA de la cama sin que nadie lo limpie, con la
 *    tarjeta oculta. Rechazar eso bloquearía **toda evolución nocturna** de un
 *    paciente con KTM de día, y sin forma de destrabarlo desde la pantalla. El
 *    nivel huérfano se NORMALIZA al guardar, no se rechaza.
 *  · «'' distinto de false»: ningún lector del sistema los distingue
 *    (`esVerdadero` trata igual los dos). Perder la evolución entera por esa
 *    diferencia sería cobrar carísimo algo que nadie honra.
 *
 * Y lo que SÍ se valida además del trío (28-ago-2026): la razón «Otro» de la
 * KTM no realizada exige su fundamento. Se puede exigir sin romper nada porque,
 * a diferencia del nivel, «Otro» no se hereda ni lo escribe ningún automatismo:
 * lo elige una persona en el turno, en la misma pantalla donde está el campo.
 *
 * Devuelve un array de mensajes (vacío = OK).
 */
/**
 * Razones de «KTM no realizada» que exigen fundamento escrito: SOLO «Otro».
 * «Indicación médica» se evaluó y quedó fuera (decisión de Manuel, 28-ago-2026):
 * es legítima y frecuente, y obligar ahí le cobra un trámite al turno en un caso
 * que se entiende. Tampoco entra al subregistro — se pide el porqué exactamente
 * donde se va a leer, así que esta lista y `_KTM_RAZON_SUBREGISTRO` (svc_stats.gs)
 * dicen hoy lo mismo.
 * Espejo exacto de `KTM_RAZONES_CON_FUNDAMENTO` en index.html: si las dos se
 * separan, el turno ve un campo opcional que el servidor va a rechazar y no hay
 * forma de destrabarlo desde la pantalla. La guardia vigila la paridad.
 */
var _KTM_RAZON_EXIGE_FUNDAMENTO = ['Otro'];

function validarKTM(d) {
  const errs = [];
  if (!d) return errs;
  const vv = function (x) { return x === true || String(x) === 'true'; };
  const r = vv(d.KTM_REALIZADA), s = vv(d.KTM_SUSPENDIDA), n = vv(d.KTM_NO_REALIZADA);
  if (!r && !s && !n) return errs;   // nada declarado: no hay nada que validar

  // Exclusividad. Imposible desde la pantalla (`setKTMstate` es excluyente),
  // alcanzable por API.
  if ((r && s) || (r && n) || (s && n)) {
    errs.push('KTM: solo puede estar en UNO de los tres estados (realizada, suspendida o no realizada).');
  }

  // 🗂️ 2-oct-2026 · DE NOCHE LA KTM YA SE PUEDE DECLARAR. Aquí había una regla que la rechazaba («en turno noche la
  // kinesiterapia motora no aplica»), apoyada en que la planilla real (20-ago) solo tenía KTM de día. Diego la cambió:
  // «podría hacerse KTM aunque no es lo habitual; que no herede». La pantalla ya la deja llenar y el servidor no puede
  // rechazar lo que la pantalla ofrece. Lo que NO cambia: de noche parte en blanco (no hereda) y sin tocar nada no declara
  // KTM. Ojo para las estadísticas: el REM cuenta sesiones sin filtrar turno, así que una KTM de noche entra como cualquier otra.

  if (n && !String(d.KTM_NO_RAZON || '').trim()) {
    errs.push('KTM: indica la razón por la que NO se realizó.');
  }
  // Las razones que no se explican solas exigen el porqué: sin él la KTM queda
  // declarada con un motivo hueco y así entra al subregistro mensual. Va en el
  // SERVIDOR y no solo en la pantalla porque el ➕ del Registro Diario
  // (corrección retroactiva) no pasa por `guardar()`. (28-ago-2026, Manuel.)
  //   · «Otro» no dice nada por definición, y es la única que obliga.
  // Las otras seis se explican solas y no se les cobra un campo más — incluida
  // «Indicación médica», que absorbió a «Decisión médica» (eran la misma razón
  // escrita de dos formas) pero NO exige fundamento.
  if (n && _KTM_RAZON_EXIGE_FUNDAMENTO.indexOf(String(d.KTM_NO_RAZON || '').trim()) !== -1
        && !String(d.KTM_NO_COMENTARIO || '').trim()) {
    errs.push('KTM: «' + String(d.KTM_NO_RAZON).trim() + '» necesita que escribas el fundamento.');
  }
  if (s && !String(d.KTM_CONTRA_RAZON || '').trim() && !String(d.KTM_CONTRA_MANUAL || '').trim()) {
    errs.push('KTM: indica la razón de la contraindicación.');
  }
  return errs;
}

/**
 * validarPVE — la razón de una PVE NO realizada, EN EL SERVIDOR
 * (28-ago-2026, pedido de Manuel).
 *
 * 🔴 POR QUÉ EXISTE. `PVE_SC_RAZON` no se validaba en NINGUNA parte: ni en la
 * pantalla ni aquí. El HTML declaraba «No se realizó PVE: SIEMPRE con razón» en
 * un comentario y el campo de al lado decía «Detalle (opcional)». Resultado: se
 * podía cerrar el turno con la PVE marcada en «No» y sin decir por qué, y ese
 * porqué —el dato del weaning de ese turno— ya no se recuperaba. Igual que con
 * la KTM, la regla va en el servidor porque el ➕ del Registro Diario
 * (corrección retroactiva) no pasa por `guardar()`.
 *
 * 🪤 LO QUE DELIBERADAMENTE **NO** SE VALIDA, y por qué:
 *
 *  · **Nada cuando `PVE_VAL` no viene en el payload.** `_podarEventosPayload`
 *    borra el grupo PVE completo cuando la rama no está activa en el formulario,
 *    y entonces el servidor PRESERVA lo ya guardado. Exigir sobre una clave
 *    ausente rechazaría el re-guardado de cualquier turno viejo —los que se
 *    guardaron antes de esta regla, sin razón— y no habría forma de destrabarlo
 *    desde la pantalla, porque la rama PVE no se repuebla al reabrir el turno.
 *    Las filas históricas sin razón se corrigen abriendo esa evolución, no
 *    bloqueando la siguiente.
 *  · **Nada cuando hubo extubación sin PVE.** Ahí el formulario manda razón y
 *    detalle VACÍOS a propósito (el evento es la extubación, con su tipo), así
 *    que exigirlos trabaría un turno por un campo que el propio cliente
 *    descarta.
 *
 * Devuelve un array de mensajes (vacío = OK).
 */
/**
 * Razones de «PVE no realizada» que exigen escribir cuál: SOLO «Otra», la única
 * del catálogo que por definición no dice nada. Las otras ocho se explican solas
 * y conservan el detalle opcional — misma decisión que con «Indicación médica»
 * en la KTM: no cobrarle un trámite al turno en un caso que ya se entiende.
 * Espejo exacto de `PVE_RAZONES_CON_MOTIVO` en index.html y de
 * `_PVE_RAZON_SUBREGISTRO` en svc_stats.gs: si se separan, el turno ve un campo
 * opcional que el servidor va a rechazar y no hay forma de destrabarlo desde la
 * pantalla. La guardia vigila que las tres digan lo mismo.
 */
var _PVE_RAZON_EXIGE_MOTIVO = ['Otra'];

function validarPVE(d) {
  const errs = [];
  if (!d) return errs;
  const vv = function (x) { return x === true || String(x) === 'true' || String(x) === 'TRUE'; };
  // PVE superada SIN extubar (tanda 2a): la razón es obligatoria y la
  // extubación no puede venir marcada a la vez (el candado del PRD, en el
  // servidor: por aquí pasa también el ➕ del Registro Diario).
  if (String(d.PVE_VAL || '') === 'si' && vv(d.PVE_SUP_SIN_EXT)) {
    if (String(d.PVE_RESULTADO || '') !== 'superada') errs.push('PVE: «no se extubó» solo aplica a una PVE superada.');
    if (!String(d.PVE_SUP_SIN_EXT_RAZ || '').trim()) errs.push('PVE superada sin extubar: indica por qué no se extubó.');
    if (/^Otra$/i.test(String(d.PVE_SUP_SIN_EXT_RAZ || '').trim())) errs.push('PVE superada sin extubar: «Otra» necesita que describas el motivo.');
    if (vv(d.EXT_OCURRIO)) errs.push('PVE superada sin extubar: no puede venir marcada una extubación en el mismo turno.');
    return errs;
  }
  // «No corresponde» TAMBIÉN dice por qué (Diego, 1-oct-2026): VM domiciliaria,
  // AET, causa de base no resuelta u otra. «Otra» exige el motivo, igual que en
  // «no». 🪤 Solo se exige al GUARDAR: un turno viejo con 'nc' sin razón se
  // reabre y se narra como siempre, no se rechaza.
  if (String(d.PVE_VAL || '') === 'nc') {
    const rnc = String(d.PVE_SC_RAZON || '').trim();
    if (!rnc) { errs.push('PVE: indica por qué NO corresponde la prueba de ventilación espontánea.'); return errs; }
    if (_PVE_RAZON_EXIGE_MOTIVO.indexOf(rnc) !== -1 && !String(d.PVE_SC_DET || '').trim())
      errs.push('PVE: «' + rnc + '» necesita que describas el motivo.');
    return errs;
  }
  if (String(d.PVE_VAL || '') !== 'no') return errs;   // ausente o 'si': nada que validar
  // Extubación sin PVE: el evento del turno es otro y el formulario manda los
  // PVE_SC_* vacíos a propósito.
  // 🪤 Salvo `sin_condiciones`, que NO es una extubación (decisión clínica
  // jul-2026): significa justamente que no hubo PVE, así que ahí la razón sí se
  // exige. La condición es CARÁCTER POR CARÁCTER la de `_pveMotivo`
  // (svc_stats.gs): si se separan, la estadística mostraría la razón de una fila
  // que la validación nunca obligó a escribir. La guardia vigila las dos.
  if (vv(d.EXT_OCURRIO) && String(d.EXT_TIPO || '') !== 'sin_condiciones') return errs;

  const raz = String(d.PVE_SC_RAZON || '').trim();
  if (!raz) {
    errs.push('PVE: indica por qué NO se realizó la prueba de ventilación espontánea.');
    return errs;                                       // sin razón, el motivo no tiene de qué colgar
  }
  if (_PVE_RAZON_EXIGE_MOTIVO.indexOf(raz) !== -1 && !String(d.PVE_SC_DET || '').trim()) {
    errs.push('PVE: «' + raz + '» necesita que describas el motivo.');
  }
  return errs;
}

/**
 * _ktmCantidad — la cantidad de sesiones, acotada a 1..9.
 *
 * Existe para que la fórmula deje de estar copiada. Estaba escrita a mano en el
 * front (`index.html`, al armar el payload) y repetida en el REM; el servidor no
 * la acotaba en ninguna parte, así que por API entraba cualquier número.
 */
function _ktmCantidad(v) {
  const n = parseInt(v, 10);
  return String(Math.min(9, Math.max(1, isNaN(n) ? 1 : n)));
}

/**
 * Forma del PATIENT_ID que acuña quien ingresa (G15, 4-oct-2026): lo que `crypto.randomUUID()` de la pantalla produce, de 8
 * a 64 caracteres de `[A-Za-z0-9_-]`. Es parte del contrato porque ese texto termina como identificador del episodio en la
 * cama, la evolución y la línea de tiempo (y mañana en ids derivados como ARCH_<pid>): sin espacios ni «|» no se cuela en
 * una clave ni en una celda donde no debe. `var` y no `const`: las const no cuelgan de globalThis en el eval del simulador.
 */
var _PATIENT_ID_ACUNADO_RE = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * La forma de un PATIENT_ID que llega de afuera (H14, revisión de la tanda 2): '' si no viene o tiene la forma acuñada; el motivo
 * si viene y no la tiene. Un valor que no es texto (número, objeto, lista) tampoco vale. El mensaje no repite lo recibido. La usan
 * `validarPayloadIngreso` (antes del lock) y `_candadoDePidNuevo` (svc_evoluciones.gs, dentro del lock, porque a un pid que ya es
 * el de la cama —una cama antigua con un pid que no tiene esta forma— no se le exige).
 */
function _errPatientIdAcunado(v) {
  if (v === undefined || v === null || v === '') return '';
  return (typeof v === 'string' && _PATIENT_ID_ACUNADO_RE.test(v)) ? '' : 'PATIENT_ID inválido: son de 8 a 64 letras, números, guiones o guion bajo';
}

function validarPayloadIngreso(d) {
  const errs = [];
  if (!d) return ['Payload vacío'];
  if (!d.idCama && !d.ID_CAMA) errs.push('Falta idCama');
  // El PATIENT_ID acuñado es OPCIONAL (sin él el servidor acuña uno, como siempre); si viene, tiene que tener la forma.
  const ePid = _errPatientIdAcunado(d.PATIENT_ID);
  if (ePid) errs.push(ePid);
  const nombre = d.nombre || d.NOMBRE || d.PAC_NOMBRE;
  if (!nombre || String(nombre).trim() === '') errs.push('Falta nombre del paciente');
  const firma = d.firmaKine || d.PLAN_FIRMA_KINE || d.FIRMA_KINE;
  if (!firma || String(firma).trim() === '') errs.push('Falta firma del kinesiólogo');
  _rango(errs, d.edad || d.EDAD, 'Edad', 15, 110, true);
  _rango(errs, d.talla || d.TALLA_CM, 'Talla (cm)', 100, 230, false);
  return errs;
}

/**
 * _errsNoFinitos — un número que no es un número no se guarda (G06, 4-oct-2026).
 *
 * 🔴 POR QUÉ EXISTE. El contrato de los ceros tiene cuatro frases y esta es la tercera: el 0 se conserva, el
 * vacío no se vuelve 0, y lo que NO es un número finito (NaN, Infinity) se rechaza con un mensaje que dice
 * cuál campo. Antes pasaba derecho: solo los campos con rango (_rango) lo frenaban, y un «Infinity» en la PIC,
 * en el EB o en el PEEP-0 de un campo sin tope entraba a la fila de EVOLUCIONES y de ahí a la cama.
 *
 * Qué mira:
 *  · Un valor de tipo `number` no finito, en CUALQUIER clave (nada lo vuelve válido).
 *  · Un TEXTO que dice «NaN», «Infinity» o «-Infinity», o que desborda al leerlo («1e999»), pero SOLO en las
 *    columnas entero/decimal del esquema de EVOLUCIONES: en una columna de texto «NaN» es un apellido o un
 *    diagnóstico, y «Infinity» una frase como cualquier otra. Sin ESQUEMA a mano (algún banco antiguo carga este
 *    archivo suelto) solo corre la primera mirada.
 * Qué NO mira, a propósito: texto basura en una columna numérica («abc»). No es un valor no finito y rechazarlo
 * es una decisión de producto aparte; hoy se guarda tal cual y los lectores lo toleran.
 */
function _errsNoFinitos(d) {
  const errs = [];
  const rot = {};
  const numericas = [];
  if (typeof ESQUEMA !== 'undefined' && ESQUEMA && ESQUEMA.EVOLUCIONES && ESQUEMA.EVOLUCIONES.cols) {
    ESQUEMA.EVOLUCIONES.cols.forEach(function (c) {
      rot[c[0]] = c[2];
      if (c[1] === 'entero' || c[1] === 'decimal') numericas.push(c[0]);
    });
  }
  Object.keys(d).forEach(function (k) {
    if (typeof d[k] === 'number' && !isFinite(d[k])) {
      errs.push((rot[k] || k) + ' no es un número válido (' + String(d[k]) + ')');
    }
  });
  numericas.forEach(function (k) {
    const v = d[k];
    if (typeof v !== 'string') return;
    const t = v.trim();
    if (t === '') return;
    if (/^[+-]?(nan|infinity)$/i.test(t) || Math.abs(parseFloat(t)) === Infinity) {
      errs.push(rot[k] + ' no es un número válido (' + t + ')');
    }
  });
  return errs;
}

/** Valida rango si el valor viene (no vacío). entero=true fuerza int. */
function _rango(errs, val, etiqueta, min, max, entero) {
  if (val === undefined || val === null || val === '') return;
  const num = entero ? parseInt(val) : parseFloat(val);
  if (isNaN(num) || num < min || num > max) {
    errs.push(etiqueta + ' fuera de rango (' + min + '-' + max + '): ' + val);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  🗂️ Rama episodio/turno (11-sep-2026) — dos reglas que viven en el
//  SERVIDOR además del cliente. Puras: reciben lo que necesitan y no leen la
//  planilla, para poder probarlas en Node como el resto de este archivo.
// ═══════════════════════════════════════════════════════════════════════════

/* 🗂️ validarSBC SE ELIMINÓ el 16-sep-2026 (decisión D6 de Diego, en el PRD
 * `docs/PRD_EVOLUCION_TRES_PASOS.md`).
 *
 * Decía: «PARA REGISTRAR SBC DEBE TENER NECESARIAMENTE FSS-ICU» — KTM nivel 3
 * exigía al menos un FSS-ICU en el episodio. Tenía sentido cuando la KTM y el
 * FSS vivían en el MISMO formulario.
 *
 * Con el camino de tres pasos ya no lo tienen: la KTM se marca en el paso 1 y
 * el FSS se mide en el paso 2, o sea DESPUÉS. Rechazar el guardado del paso 1
 * sería rechazar algo que todavía no podía estar, y el colega no tendría
 * dónde arreglarlo sin perder lo escrito.
 *
 * Consecuencia clínica, escrita para que quede: se puede registrar SBC sin
 * ningún FSS en el episodio. Diego lo decidió sabiéndolo. Lo que queda en su
 * lugar es el paso 2, que muestra el FSS sin medir en ámbar en cada turno.
 * No se «desactivó» ni quedó dormida: se borró, y `paso_evaluaciones.js`
 * exige que no vuelva. */

/**
 * validarTransicionVA — la vía aérea NO cambia sin un evento declarado
 * (línea fina: parámetros = turno; vía aérea y soporte = episodio). Es el
 * espejo en el servidor de `_avisosTransicion()` del cliente, que hasta aquí
 * avisaba y dejaba pasar con «Guardar igual» — así se perdió la extubación de
 * la cama 13. La salida sigue existiendo, pero cuesta una razón escrita
 * (TRANS_MOTIVO), que viaja al hito y no a EVOLUCIONES.
 * @param d      payload del turno
 * @param cama   fila de CAMAS_ESTADO tal como estaba ANTES de este guardado
 */
function validarTransicionVA(d, cama) {
  const errs = [];
  if (!d || !cama) return errs;
  const vv = function (x) { return x === true || String(x) === 'true'; };
  if (vv(d.ES_INGRESO)) return errs;                    // al ingresar no hay transición
  const ini = String(cama.VIA_AEREA || '').trim();
  if (!ini || !cama.PATIENT_ID) return errs;            // cama sin episodio: no hay «venía con»
  const va = String(d.VENT_VIA_AEREA_FINAL || d.VENT_VIA_AEREA || '').trim();
  if (!va || va === ini) return errs;
  // Con CUALQUIER evento de vía aérea declarado, el cambio tiene explicación:
  // la regla es «no cambia sin evento», no «el evento tiene que ser exactamente
  // este». Si el colega declaró decanulación donde correspondía extubación, el
  // cliente lo avisa; el servidor no rechaza un turno que sí declaró.
  if (vv(d.EXT_OCURRIO) || vv(d.INTUB_OCURRIO) || vv(d.EXT_REINTUB) || vv(d.TQT_OCURRIO) || vv(d.DECAN_OCURRIO)) return errs;
  const inv = function (x) { return x === 'TOT' || x === 'TQT'; };
  const motivo = String(d.TRANS_MOTIVO || '').trim();
  const falta = function (msg) { if (motivo.length >= 5) return; errs.push(msg); };
  if (ini === 'TOT' && va === 'TQT' && !vv(d.TQT_OCURRIO))
    falta('Venía con TOT y queda con TQT, pero no hay traqueostomía registrada. Decláralo en «¿Qué pasó hoy con la vía aérea?» o escribe por qué.');
  if (ini === 'TOT' && !inv(va) && !vv(d.EXT_OCURRIO))
    falta('Venía con TOT y queda con ' + va + ', pero no hay extubación registrada. Decláralo en «¿Qué pasó hoy con la vía aérea?» o escribe por qué.');
  if (ini === 'TQT' && !inv(va) && !vv(d.DECAN_OCURRIO))
    falta('Venía con TQT y queda con ' + va + ', pero no hay decanulación registrada. Decláralo en «¿Qué pasó hoy con la vía aérea?» o escribe por qué.');
  if (!inv(ini) && inv(va) && !vv(d.INTUB_OCURRIO) && !vv(d.EXT_REINTUB) && !vv(d.TQT_OCURRIO))
    falta('Venía con ' + ini + ' y queda con ' + va + ', pero no hay intubación ni reintubación registrada. Decláralo en «¿Qué pasó hoy con la vía aérea?» o escribe por qué.');
  return errs;
}

// ═══════════════════════════════════════════════════════════════════════════
//  🔐 G14 en TODAS las puertas que actúan sobre una cama (tanda 2 del guardado seguro, 4-oct-2026).
//  Puras, como el resto de este archivo: reciben lo que necesitan y no leen ninguna hoja. Quien llama (el servicio
//  de cada puerta) lee la cama DENTRO del lock, llama a estas y rechaza ANTES de la primera escritura.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Los dos mensajes de rechazo del candado de episodio. Son funciones y no constantes para que el texto exista en un
 * solo lugar y se pueda comparar con el de `validarEpisodioAbierto` (svc_evoluciones.gs) palabra por palabra: una
 * sola frase para todas las puertas. Ninguno nombra a nadie ni lleva el identificador de un episodio: el otro
 * paciente no es asunto de quien tenía el formulario abierto (Ley 19.628); lo que pasó queda en AUDIT_LOG.
 */
function _msgCambioDePaciente(idCama) {
  // 🪤 La pantalla reconoce este rechazo por la frase «cambió de paciente» (`_EP_CAMBIO_RE` en index.html): si se
  // reescribe, se reescribe en los dos lados — la guardia lo ata.
  return 'La cama ' + idCama + ' cambió de paciente (o quedó libre) desde que abriste este formulario, ' +
    'así que no se guardó nada. Cierra el formulario y vuelve a abrir la cama para ver cómo está ahora.';
}
function _msgPantallaVieja() {
  // 🪤 SIN la frase «cambió de paciente»: la pantalla mostraría la salida del cambio de paciente («Cerrar la cama») y
  // lo que hay que hacer aquí es otra cosa —recargar—.
  return 'Esta pantalla es de una versión anterior y no puede guardar con seguridad. ' +
    'Recárgala (cierra y vuelve a abrir la aplicación) y repite lo que hacías. No se guardó nada.';
}
function _msgPidEnOtraCama() {
  // H14. VALIDACION y no CONFLICTO a propósito: la pantalla muestra todo CONFLICTO como «la cama ya fue ocupada por otro paciente»,
  // y aquí lo que hay es el MISMO paciente en dos camas. No da el identificador ni nombra a nadie (Ley 19.628).
  return 'Este paciente ya figura en otra cama ocupada, así que no se guardó nada. ' +
    'Revisa el censo: un mismo paciente no puede estar en dos camas a la vez.';
}
function _msgIngresoConflicto(idCama) {
  // 🪤 SIN la frase «cambió de paciente», por lo mismo que arriba: aquí NO hay un paciente que se fue, hay OTRO que se
  // adelantó a esta misma cama mientras se llenaba el ingreso, y la salida no es cerrar ni volver a abrir la cama —el
  // formulario se queda como está, con lo escrito—. Tampoco nombra ni da el identificador del que ganó (Ley 19.628).
  return 'La cama ' + idCama + ' ya fue ocupada por otro paciente mientras llenabas este ingreso. ' +
    'No se guardó nada. Tu formulario sigue abierto con lo que escribiste.';
}

/**
 * validarEpisodioPuerta — la pantalla que se abrió para un paciente no actúa sobre otro, en CUALQUIER puerta
 * (G14, tanda 2, 4-oct-2026).
 *
 * 🔴 POR QUÉ EXISTE. `validarEpisodioAbierto` (svc_evoluciones.gs) cerró el hueco en UNA puerta, el guardado de la
 * evolución. Las demás —dar el alta, limpiar la cama, moverla, intercambiarla, anular un evento, anexar, medir,
 * abrir un pendiente…— siguen atribuyendo lo que hacen a «quien tenga la cama AHORA»: el diálogo que quedó abierto
 * mientras la cama se daba de alta y se reingresaba a OTRO paciente limpia, mueve o le anula el evento al nuevo, y
 * nadie lo ve. Esta es la MISMA regla, extendida: una función pura que cada puerta llama con la cama que leyó
 * dentro de su lock.
 *
 * LAS REGLAS (las mismas de `validarEpisodioAbierto`, más el modo estricto):
 *  · AUSENTE (undefined/null) ⇒ no se compara. Es COMPATIBILIDAD con las llamadas sin pantalla (smoke tests,
 *    build/sim) y con las pantallas viejas que todavía no mandan el campo. La pantalla nueva SIEMPRE lo manda.
 *  · VACÍO ⇒ la pantalla no abrió ningún episodio (ingreso en cama libre, o episodio sin ingreso formal): no
 *    reclama ninguno. 🪤 A propósito: si el vacío rechazara sobre una cama ocupada, el reintento de un ingreso cuyo
 *    primer intento sí aterrizó se vería idéntico a «otro ingreso en la misma cama» (esa ambigüedad la resuelve el
 *    PATIENT_ID que la pantalla acuña al abrir el ingreso, G15, no esta función).
 *  · CON VALOR ⇒ igualdad EXACTA con el PATIENT_ID de la cama (tras recortar espacios): si la cama pasó a otro
 *    paciente, o quedó libre, se rechaza.
 *  · ESTRICTO (CONFIG.CONTRATO_ESTRICTO = TRUE, nace APAGADO): el AUSENTE se rechaza —«esta pantalla es de una versión
 *    anterior, recárgala»— y el VACÍO no se acepta sobre una cama que tiene paciente. 🪤 La excepción «un ingreso con
 *    PATIENT_ID propio sí entra con vacío» la decide quien ingresa (G15) ANTES de llamar aquí: esta función no
 *    conoce ingresos.
 *
 * Devuelve '' si la puerta puede seguir, o el mensaje en palabras simples si no. Quien llama lo devuelve como
 * `err(msg, ERR.VALIDACION)` sin haber escrito nada. (El CONFLICTO —«otro se adelantó, no es un reintento»— lo
 * decide `decidirEpisodioPuerta`, que además reconoce el reintento de una operación que sí aterrizó.)
 *
 * @param  abierto   EPISODIO_ABIERTO del payload (el PATIENT_ID de la tarjeta TAL COMO ESTABA AL ABRIR el diálogo)
 * @param  pidCama   PATIENT_ID que tiene la cama AHORA (leída dentro del lock)
 * @param  idCama    número de la cama, solo para el mensaje
 * @param  estricto  true solo en modo estricto; cualquier otra cosa (incluido no pasarlo) es el modo tolerante
 */
function validarEpisodioPuerta(abierto, pidCama, idCama, estricto) {
  const pid = (pidCama === undefined || pidCama === null) ? '' : String(pidCama).trim();
  if (abierto === undefined || abierto === null) return estricto === true ? _msgPantallaVieja() : '';
  const ab = String(abierto).trim();
  if (!ab) return (estricto === true && pid) ? _msgCambioDePaciente(idCama) : '';
  return ab === pid ? '' : _msgCambioDePaciente(idCama);
}

/**
 * decidirEpisodioPuerta — qué hace cada puerta de CAMA ante un reclamo de episodio, incluido el «ya hecho»
 * (G14, tanda 2, 4-oct-2026).
 *
 * 🔴 POR QUÉ EXISTE. `validarEpisodioPuerta` sola trata todo desacuerdo como «la cama cambió de paciente». Pero hay
 * un desacuerdo que NO es un conflicto: el REINTENTO de una operación que sí aterrizó. La respuesta se perdió, la
 * pantalla reenvía lo mismo, y la cama ya no es la de antes PORQUE ESA OPERACIÓN YA SE HIZO (el alta ya archivó y
 * limpió; el traslado ya movió; el intercambio ya cruzó). Rechazarlo le diría a la persona «no se guardó» sobre algo
 * que sí se guardó. Y hay otro desacuerdo que no se puede tratar como reintento: limpiar la cama que ahora ocupa
 * OTRO paciente borraría al ocupante nuevo.
 *
 * Devuelve `{estado, codigo, error}`:
 *  · 'seguir'   — el reclamo coincide (o no hay reclamo que comparar): la puerta hace lo suyo.
 *  · 'yaHecho'  — la operación ya aterrizó: la puerta responde ok `yaEstaba` y, donde quedan pasos por completar
 *                 (intercambio, traslado), completa los que falten sin repetir el cambio de camas.
 *  · 'rechazo'  — no se toca nada; `codigo` es VALIDACION (la cama no es la de la pantalla) o CONFLICTO (otra
 *                 persona se adelantó), y `error` el mensaje, sin nombres ni identificadores.
 *
 * LAS PUERTAS (`e` trae lo que cada una lee dentro de su lock):
 *  · DAR_ALTA — reclamo `abierto` contra la cama `pid`. Si no coincide, es un reintento SOLO si ARCHIVO_PACIENTES ya
 *    tiene la fila de ese paciente (`hayArchivo`): cama libre u ocupada por otro, da igual, el alta ya se hizo. Sin
 *    esa fila, el paciente se trasladó o la cama se limpió, no se le dio el alta: rechazo como hoy.
 *  · LIMPIAR_CAMA — cama libre: ya hecho. Ocupada por OTRO: CONFLICTO (nunca se limpia al ocupante nuevo).
 *    🪤 «Libre» NO es «sin PATIENT_ID»: una cama ocupada por un episodio sin ingreso formal (cargado a mano) tiene el
 *    pid vacío igual que una libre. Quien llama pasa `ocupada: true` cuando la cama está OCUPADA, tenga o no pid, y
 *    esa cama es un ocupante nuevo (CONFLICTO), no un «ya hecho». Sin la bandera (los bancos antiguos) se decide solo
 *    por el pid, como antes.
 *  · INTERCAMBIAR_CAMAS — `abierto`/`pid` es la cama A y `abiertoB`/`pidB` la B. Ya hecho si A tiene el paciente que
 *    la pantalla vio en B y B el que vio en A. Cualquier otra diferencia rechaza (también la mitad hecha: con un
 *    solo setValues para las dos filas no debería existir, y si existe no es un reintento seguro).
 *  · MOVER_A_CAMA_VACIA — `abierto`/`pid` es el origen y `abiertoB`/`pidB` el destino (`''` = estaba libre al
 *    elegir). Ya hecho si el destino ya tiene al paciente y el origen quedó libre. Un destino que ahora ocupa OTRO
 *    paciente es CONFLICTO. Se juzga primero el origen. 🪤 Se decide por PATIENT_ID: una cama ocupada SIN
 *    PATIENT_ID (episodio sin ingreso formal) se ve igual que una libre, y la comprobación de «ocupada» que el
 *    servicio ya hace se queda como está.
 *  · INGRESO — G15, el INGRESO CONCURRENTE (paso 8). El ingreso CREA el episodio: no reclama uno que todavía no existe
 *    (por eso aquí no se mira `abierto`), trae el SUYO, el PATIENT_ID que la pantalla acuñó al abrir el formulario sobre
 *    una cama libre (`propio`). Con él, la cama libre o ocupada SIN PATIENT_ID (un episodio sin ingreso formal: no hay a
 *    quién ganarle) deja entrar; la cama con ESE MISMO pid es el reintento de su propio ingreso (ya hecho: un solo hito,
 *    la puerta decide si eso es «seguir» o «ya estaba»); la cama con OTRO pid es CONFLICTO, porque otra persona se
 *    adelantó y no es un reintento. Sin `propio` (pantalla vieja o llamada por API sin navegador) el modo tolerante no
 *    compara —es el hueco que el modo estricto cierra— y el estricto no acepta ese vacío sobre una cama con paciente
 *    (CONFLICTO). `pid` es el de quien ocupa la cama AHORA: vacío si está libre (una cama libre no tiene dueño aunque la
 *    fila conserve un pid viejo) o si la ocupa un episodio sin ingreso formal. Las dos puertas que ingresan —el
 *    guardado de la evolución con ES_INGRESO y INGRESAR_PACIENTE— deciden con esta misma fila: una sola regla.
 *    H9 (revisión de la tanda 2): `archivado` (true) es que el pid propio YA TIENE su egreso (una fila en ARCHIVO_PACIENTES o un
 *    hito de egreso, lo lee quien llama). Un ingreso con el pid de alguien ya egresado es CONFLICTO sin importar la cama: sin el
 *    sello del OP_ID (otro OP_ID, el caché evaporado) el reenvío de un ingreso viejo —el borrador de la pantalla— volvía a
 *    ocupar la cama con ese pid, y el segundo alta no escribía su egreso porque `ARCH_<pid>` ya existía. Sin definir (los bancos
 *    antiguos) no cambia nada.
 *
 * Una puerta que no está aquí REVIENTA: un candado que se saltara callando cuando le falta la fila de su puerta
 * sería peor que no tenerlo.
 *
 * @param  puerta  'DAR_ALTA' | 'LIMPIAR_CAMA' | 'INTERCAMBIAR_CAMAS' | 'MOVER_A_CAMA_VACIA' | 'INGRESO'
 * @param  e       { abierto, abiertoB, pid, pidB, idCama, idCamaB, hayArchivo, ocupada, estricto, propio, archivado }
 */
function decidirEpisodioPuerta(puerta, e) {
  e = e || {};
  const estricto = e.estricto === true;
  const txt = function (x) { return (x === undefined || x === null) ? '' : String(x).trim(); };
  const ab = txt(e.abierto), abB = txt(e.abiertoB), pid = txt(e.pid), pidB = txt(e.pidB);
  const seguir = { estado: 'seguir' }, yaHecho = { estado: 'yaHecho' };
  const rechazo = function (codigo, error) { return { estado: 'rechazo', codigo: codigo, error: error }; };
  const invalida = function (msg) { return rechazo(ERR.VALIDACION, msg); };

  switch (String(puerta)) {
    case 'DAR_ALTA': {
      const m = validarEpisodioPuerta(e.abierto, e.pid, e.idCama, estricto);
      if (!m) return seguir;
      // Con un episodio reclamado que no coincide, el alta ya hecha lo explica. Sin episodio reclamado (ausente o
      // vacío) no hay a quién buscar en el archivo: el «ya hecho» no se inventa.
      if (ab && e.hayArchivo === true) return yaHecho;
      return invalida(m);
    }
    case 'LIMPIAR_CAMA': {
      const m = validarEpisodioPuerta(e.abierto, e.pid, e.idCama, estricto);
      if (!m) return seguir;
      const hayOcupante = !!pid || e.ocupada === true;
      if (ab && !hayOcupante) return yaHecho;
      if (ab && hayOcupante) {
        return rechazo(ERR.CONFLICTO, 'La cama ' + e.idCama + ' ya está ocupada por otro paciente (la limpieza que pediste era para quien estaba antes), ' +
          'así que no se limpió nada. Cierra esta ventana y mira cómo está la cama ahora.');
      }
      return invalida(m);
    }
    case 'INTERCAMBIAR_CAMAS': {
      if (ab && abB && ab !== abB && pid === abB && pidB === ab) return yaHecho;
      const mA = validarEpisodioPuerta(e.abierto, e.pid, e.idCama, estricto);
      if (mA) return invalida(mA);
      const mB = validarEpisodioPuerta(e.abiertoB, e.pidB, e.idCamaB, estricto);
      if (mB) return invalida(mB);
      return seguir;
    }
    case 'MOVER_A_CAMA_VACIA': {
      if (ab && !pid && pidB === ab) return yaHecho;
      const mA = validarEpisodioPuerta(e.abierto, e.pid, e.idCama, estricto);
      if (mA) return invalida(mA);
      if (e.abiertoB === undefined || e.abiertoB === null) {
        return estricto ? invalida(_msgPantallaVieja()) : seguir;
      }
      if (!abB) {
        // La pantalla vio el destino LIBRE al elegir: si ahora tiene a alguien, otra persona se adelantó.
        return pidB
          ? rechazo(ERR.CONFLICTO, 'La cama ' + e.idCamaB + ' ya fue ocupada por otro paciente mientras elegías el traslado, ' +
              'así que no se movió a nadie. Mira cómo está la cama ahora y vuelve a elegir.')
          : seguir;
      }
      const mB = validarEpisodioPuerta(e.abiertoB, e.pidB, e.idCamaB, estricto);
      return mB ? invalida(mB) : seguir;
    }
    case 'INGRESO': {
      const propio = txt(e.propio);
      if (propio) {
        // H9: un paciente que YA EGRESÓ no vuelve a ingresar con el mismo pid, esté la cama libre u ocupada por él (un alta a
        // medias). Esto va ANTES de mirar la cama: si «cama ocupada por ese pid» ganara, el reintento de un alta que murió a mitad
        // se tomaría por el reintento del ingreso.
        if (e.archivado === true) return rechazo(ERR.CONFLICTO, _msgIngresoConflicto(e.idCama));
        if (!pid) return seguir;
        return pid === propio ? yaHecho : rechazo(ERR.CONFLICTO, _msgIngresoConflicto(e.idCama));
      }
      // Sin identidad propia no hay cómo distinguir un reintento de otro ingreso: el modo tolerante no compara (como hasta
      // hoy); el estricto no acepta ese vacío sobre una cama que ya tiene paciente.
      return (estricto && pid) ? rechazo(ERR.CONFLICTO, _msgIngresoConflicto(e.idCama)) : seguir;
    }
    default:
      throw new Error('decidirEpisodioPuerta: la puerta «' + puerta + '» no está en la tabla (DAR_ALTA, LIMPIAR_CAMA, INTERCAMBIAR_CAMAS, MOVER_A_CAMA_VACIA, INGRESO).');
  }
}
