/**
 * dominio_calculos.gs — Cálculos clínicos PUROS (sin acceso a Sheets).
 * Portados desde v1 sin cambios de fórmula. Testeables aislados.
 */

/** Peso ideal (kg) por sexo y talla (cm). Fórmula de Devine. */
function calcularPI(sexo, tallaCm) {
  const t = parseFloat(tallaCm);
  if (!t || t <= 0 || !sexo) return 0;
  const base = String(sexo).toUpperCase() === 'M' ? 50 : 45.5;
  return Math.round((base + 0.91 * (t - 152.4)) * 10) / 10;
}

/**
 * Cálculos respiratorios derivados de una evolución.
 * @param {Object} evo  objeto con campos ventilatorios, PAC_PESO_IDEAL y VENT_MODO
 * @return {Object} { CALC_ML_KG, CALC_VOL_MIN, CALC_IE, CALC_DP, CALC_CESR, CALC_TOBIN, CALC_IROX }
 */
function calcularRespiratorio(evo) {
  const n = v => parseFloat(v) || 0;
  const vt   = n(evo.VENT_VT);
  const fr   = n(evo.VENT_FR);
  const peep = n(evo.VENT_PEEP);
  const ppl  = n(evo.VENT_PPL);
  const flujo = n(evo.VENT_FLUJO);
  const ti   = n(evo.VENT_TI);
  const fio2 = n(evo.VENT_FIO2);
  const spo2 = n(evo.VENT_SPO2);
  const pi   = n(evo.PAC_PESO_IDEAL);
  /* 🫁 El ROX es del DISPOSITIVO, no del modo. Desde los tres ejes
     (16-sep-2026) el alto flujo vive en VENT_INTERFAZ; en las filas de antes
     venía en el modo. `txtInterfazDe` (dominio_texto.gs, también puro) resuelve
     las dos formas, así que una evolución de agosto calcula igual que siempre.
     El resto de los derivados sí son del modo ventilatorio y lo siguen leyendo. */
  const modo = evo.VENT_MODO || '';
  const disp = (typeof txtInterfazDe === 'function' ? txtInterfazDe(evo) : '') || modo;
  const calc = {};

  if (vt > 0 && pi > 0) calc.CALC_ML_KG = Math.round((vt / pi) * 10) / 10;
  if (vt > 0 && fr > 0) calc.CALC_VOL_MIN = Math.round((vt * fr / 1000) * 100) / 100;
  if (['ACVC', 'ACPC'].indexOf(modo) !== -1 && flujo > 0 && fr > 0 && ti > 0) {
    const te = 60 / fr - ti;
    if (te > 0) calc.CALC_IE = '1:' + (Math.round((te / ti) * 10) / 10);
  }
  // Mecánica con PEEP total (PEEP + AutoPEEP): DP = Ppl − PEEPtot; Cest = VT/DP
  const peepTot = peep + n(evo.VENT_AUTOPEEP);
  if (ppl > 0 && peep >= 0) calc.CALC_DP = Math.round((ppl - peepTot) * 10) / 10;
  if (vt > 0 && ppl > 0 && (ppl - peepTot) > 0) calc.CALC_CESR = Math.round((vt / (ppl - peepTot)) * 10) / 10;
  if (['CPAP/PS', 'CFLEX', 'S/T'].indexOf(modo) !== -1 && fr > 0 && vt > 0) {
    calc.CALC_TOBIN = Math.round((fr / (vt / 1000)) * 10) / 10;
  }
  // 🪤 «OAF/CTAF» pasó a llamarse «CTAF» en ago-2026 y esta lista se quedó con
  // el nombre viejo: el alto flujo por traqueostomía nunca tuvo su ROX.
  if (['CNAF', 'CTAF', 'OAF/CTAF'].indexOf(disp) !== -1 && spo2 > 0 && fio2 > 0 && fr > 0) {
    // ROX estándar: SpO2 / FiO2 (fracción) / FR — corte clásico 4.88
    calc.CALC_IROX = Math.round(((spo2 / (fio2 / 100)) / fr) * 100) / 100;
  }
  return calc;
}

/**
 * Las sesiones de KTM de un turno, leídas de UN SOLO lugar.
 *
 * 🔴 ES EL ÚNICO LECTOR de KTM_SESIONES_JSON. La cantidad y el nivel se
 * DERIVAN de acá y de ningún otro lado: si mañana el REM contara por su
 * cuenta y la entrega por la suya, volveríamos a tener dos verdades del mismo
 * dato — que es lo que este proyecto ya pagó tres veces.
 *
 * 🔴 COMPATIBLE HACIA ATRÁS, y eso no es opcional: hay meses de turnos escritos
 * con el modelo viejo (un nivel suelto, una asistencia, unos minutos y un
 * contador). Una fila así se lee igual que siempre.
 *
 * Devuelve { lista, cant, nivel, minutos }:
 *   · cant    — cuántas sesiones (el REM y los indicadores de atenciones);
 *   · nivel   — el MÁS ALTO, que es el que marca la progresión (Diego: «manda
 *               el nivel más alto») y el que va a la entrega, la cama y la
 *               categorización SOCHIMI;
 *   · minutos — la suma.
 */
function ktmSesiones(d) {
  const f = d || {};
  let lista = [];
  try {
    const crudo = f.KTM_SESIONES_JSON;
    if (crudo) lista = (typeof crudo === 'string' ? JSON.parse(crudo) : crudo) || [];
  } catch (e) { lista = []; }
  if (!Array.isArray(lista)) lista = [];

  if (!lista.length) {
    // Modelo viejo: el contador dice cuántas, y todas comparten los mismos
    // datos porque era lo único que se guardaba.
    const cant = parseInt(f.KTM_CANT, 10) || 0;
    const niv = String(f.KTM_NIVEL_KTR || '').trim();
    if (!cant && !niv) return { lista: [], cant: 0, nivel: '', minutos: 0 };
    const una = { niv: niv, asis: String(f.KTM_ASISTENCIA || ''),
                  min: parseInt(f.KTM_TIEMPO_MIN, 10) || 0, borg: String(f.KTM_BORG || '') };
    return { lista: [una], cant: cant || 1, nivel: niv,
             minutos: parseInt(f.KTM_TIEMPO_MIN, 10) || 0 };
  }

  const niveles = lista.map(x => parseInt(x && x.niv, 10)).filter(n => !isNaN(n));
  const minutos = lista.reduce((a, x) => a + (parseInt(x && x.min, 10) || 0), 0);
  return {
    lista: lista,
    cant: lista.length,
    nivel: niveles.length ? String(Math.max.apply(null, niveles)) : '',
    minutos: minutos
  };
}

/**
 * El SAS en palabras. Escala de Riker (SAS 1-7), con la redacción que usa la
 * unidad — contrastada con la literatura y con Diego el 17-sep-2026.
 *
 * POR QUÉ EXISTE. Diego quería un campo aparte para el estado de vigilia
 * («sopor superficial, sopor profundo, somnoliento, vigil y cooperador»), y al
 * ponerlo al lado del SAS apareció que era casi una traducción uno a uno: un
 * segundo campo diciendo lo mismo, que es la forma de error que este proyecto
 * ya pagó tres veces. La decisión fue que el sistema TRADUZCA en vez de
 * preguntar otra vez: el relato dice la palabra y el número se conserva.
 *
 * 🔴 ES EL ÚNICO diccionario: lo usan el relato del servidor y el de la
 * pantalla. Si cambia una redacción, cambia en los dos a la vez.
 */
var SAS_PALABRAS = {
  '1': 'sin respuesta a estímulos',
  '2': 'sopor profundo, responde al estímulo físico sin comunicarse',
  '3': 'somnoliento, despierta al llamado y se vuelve a dormir',
  '4': 'vigil, tranquilo y cooperador',
  '5': 'agitado, se calma a la contención verbal',
  '6': 'muy agitado, no se calma con instrucciones',
  '7': 'agitación peligrosa'
};

/** El SAS narrado: «SAS 4 (vigil, tranquilo y cooperador)». */
function sasEnPalabras(sas) {
  const k = String(sas == null ? '' : sas).trim();
  if (!k) return '';
  const t = SAS_PALABRAS[k];
  return t ? ('SAS ' + k + ' (' + t + ')') : ('SAS ' + k);
}

/**
 * ¿Este turno tuvo SEDACIÓN PROFUNDA? La define el SAS, no el fármaco.
 *
 * 🪤 Diego corrigió una propuesta mía de decidirlo por una lista de hipnóticos:
 * «hemos tenido pacientes con fentanilo y propofol en dosis altas pero con un
 * SAS 3-4, por lo tanto han estado sedados vigil; depende más de eso que del
 * tipo de fármaco». Tenía razón: el fármaco es la dosis, el SAS es la
 * profundidad — lo mismo que ya pasaba con el escalón.
 *
 * 🔴 COMPATIBLE HACIA ATRÁS: las filas escritas antes del 17-sep-2026 traen la
 * casilla SED_VIGIL y pueden no traer SAS. Esas se leen por la casilla, que es
 * como se han leído hasta hoy.
 */
function sedacionProfunda(d) {
  const f = d || {};
  const tipo = String(f.SED_TIPO || '');
  if (!tipo || tipo === 'Sin sedación') return false;
  const sas = parseInt(f.SED_SAS, 10);
  if (!isNaN(sas)) return sas <= 2;
  return !(f.SED_VIGIL === true || f.SED_VIGIL === 'TRUE' || f.SED_VIGIL === 'true');
}
