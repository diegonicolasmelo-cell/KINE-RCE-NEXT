/**
 * svc_backup.gs — Respaldo automático a Google Drive.
 *
 * Son DOS cosas distintas, y el plan maestro pide las dos (decisión D7):
 *
 *   · 30 copias DIARIAS que rotan — para volver atrás de un accidente de
 *     ayer. Viven en "RCE_KINE_backups" (auto-creada en Mi Drive la primera
 *     vez; su ID queda en ScriptProperties) y la más vieja se va a la
 *     papelera cuando entra la número CONFIG.BACKUP_MAX_DIARIOS + 1.
 *   · 1 copia MENSUAL PERMANENTE — para la serie de años. Vive en la
 *     subcarpeta "mensuales" y NADIE la borra sola.
 *
 * 🪤 POR QUÉ EXISTE LA MENSUAL (15-sep-2026). Solo estaba la mitad diaria:
 * a los 30 días no quedaba NINGUNA foto de la planilla. La estadística de la
 * unidad se sostiene sobre años de registros, y contra eso 30 días de memoria
 * no es un respaldo: es una ventana. D7 lo había decidido («30 diarias + 1
 * snapshot mensual permanente, barato, protege la serie estadística») y
 * nunca se había programado. La mensual se guarda en OTRA carpeta a
 * propósito: así la rotación de las diarias no puede alcanzarla ni aunque
 * alguien le cambie el nombre a los archivos.
 *
 * PUESTA EN MARCHA (una sola vez, desde el editor de Apps Script):
 *   1) Ejecutar `instalarTriggerBackup` y autorizar Drive → instala el
 *      activador diario (03-04 AM) y corre el primer backup de prueba.
 *   2) Verificar con `listarBackups()`.
 * Restaurar: `restaurarDesdeBackup(idBackup)` crea una COPIA del respaldo
 * (nunca sobreescribe la planilla activa).
 */

const BACKUP_FOLDER_NAME = 'RCE_KINE_backups';
const BACKUP_PROP_FOLDER_ID = 'BACKUP_FOLDER_ID';
// Las dos mitades de D7 se distinguen por CARPETA y por PREFIJO. Cualquiera de
// las dos barreras basta para que la rotación no toque una mensual.
const BACKUP_MENSUAL_FOLDER_NAME = 'mensuales';
const BACKUP_PREFIJO_DIARIO = 'RCE_KINE_backup_';
const BACKUP_PREFIJO_MENSUAL = 'RCE_KINE_mensual_';

/** Carpeta de backups (la crea si no existe; cachea el ID en ScriptProperties). */
function _obtenerCarpetaBackup() {
  const props = PropertiesService.getScriptProperties();
  let folderId = props.getProperty(BACKUP_PROP_FOLDER_ID);
  if (folderId) {
    try {
      const carpeta = DriveApp.getFolderById(folderId);
      if (!carpeta.isTrashed()) return carpeta;
      console.warn('Carpeta de backups en papelera. Creando nueva.');
    } catch (e) { console.warn('ID de carpeta guardado inválido, creando nueva.'); }
  }
  const existentes = DriveApp.getRootFolder().getFoldersByName(BACKUP_FOLDER_NAME);
  if (existentes.hasNext()) {
    const carpeta = existentes.next();
    props.setProperty(BACKUP_PROP_FOLDER_ID, carpeta.getId());
    return carpeta;
  }
  const nueva = DriveApp.createFolder(BACKUP_FOLDER_NAME);
  props.setProperty(BACKUP_PROP_FOLDER_ID, nueva.getId());
  console.log('✨ Carpeta de backups creada: ' + nueva.getUrl());
  return nueva;
}

/** Subcarpeta de las copias mensuales permanentes (la crea si no existe). */
function _obtenerCarpetaMensual() {
  const raiz = _obtenerCarpetaBackup();
  const hay = raiz.getFoldersByName(BACKUP_MENSUAL_FOLDER_NAME);
  if (hay.hasNext()) return hay.next();
  const nueva = raiz.createFolder(BACKUP_MENSUAL_FOLDER_NAME);
  console.log('✨ Carpeta de respaldos mensuales creada: ' + nueva.getUrl());
  return nueva;
}

/**
 * Copia MENSUAL PERMANENTE (D7). La llama `backupDiario()` todos los días y
 * se salta sola si el mes ya tiene la suya: una al mes, la del primer día que
 * el activador alcanzó a correr. No se rota nunca.
 *
 * Se devuelve el motivo cuando no copia (`yaEstaba`) en vez de un silencio:
 * quien mira el registro tiene que poder distinguir «ya estaba» de «falló».
 */
function backupMensual(mesISO) {
  try {
    const tz = leerConfig('TIMEZONE', 'America/Santiago');
    const mes = mesISO || Utilities.formatDate(new Date(), tz, 'yyyy-MM');
    const carpeta = _obtenerCarpetaMensual();
    const nombre = BACKUP_PREFIJO_MENSUAL + mes;

    const existentes = carpeta.getFilesByName(nombre);
    while (existentes.hasNext()) {
      if (!existentes.next().isTrashed()) {
        return ok({ creado: false, motivo: 'yaEstaba', mes: mes, nombre: nombre });
      }
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const copia = DriveApp.getFileById(ss.getId()).makeCopy(nombre, carpeta);
    console.log('🗄️ Respaldo mensual permanente creado: ' + copia.getName());
    _setConfig('ULTIMO_BACKUP_MENSUAL', mes);
    return ok({ creado: true, mes: mes, nombre: copia.getName(), id: copia.getId(), url: copia.getUrl() });
  } catch (e) { return err('backupMensual: ' + e.message, ERR.INTERNO, e); }
}

/** Función principal — la ejecuta el activador diario. */
function backupDiario() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const carpeta = _obtenerCarpetaBackup();
    const fecha = Utilities.formatDate(new Date(), leerConfig('TIMEZONE', 'America/Santiago'), 'yyyy-MM-dd_HH-mm');
    const copia = DriveApp.getFileById(ss.getId()).makeCopy('RCE_KINE_backup_' + fecha, carpeta);
    console.log('✅ Backup creado: ' + copia.getName());

    const max = parseInt(leerConfig('BACKUP_MAX_DIARIOS', '30')) || 30;
    _rotarBackups(carpeta, max);
    _setConfig('ULTIMO_BACKUP', ahoraTS());

    // La otra mitad de D7. Va DESPUÉS de rotar y en su propio try: si la
    // mensual fallara, la diaria del día ya está hecha y no se pierde.
    let mensual = null;
    try { mensual = backupMensual(); }
    catch (e) { console.warn('backupMensual desde backupDiario:', e.message); }

    return ok({ nombre: copia.getName(), id: copia.getId(), url: copia.getUrl(), carpeta: carpeta.getUrl(),
                mensual: (mensual && mensual.ok) ? mensual.data : null });
  } catch (e) { return err('backupDiario: ' + e.message, ERR.INTERNO, e); }
}

/**
 * Elimina backups DIARIOS más antiguos que los últimos N.
 *
 * 🔴 Las mensuales son permanentes (D7) y esta función no las ve por dos
 * razones independientes: viven en una subcarpeta —y `getFilesByType` solo
 * lista los hijos directos— y su nombre no empieza con el prefijo diario. Se
 * dejan las dos barreras a propósito: una sola se rompe sin que nadie note
 * nada hasta que ya se borró un año.
 */
function _rotarBackups(carpeta, maxHistoria) {
  try {
    const archivos = carpeta.getFilesByType(MimeType.GOOGLE_SHEETS);
    const lista = [];
    while (archivos.hasNext()) {
      const f = archivos.next();
      const nom = f.getName();
      if (nom.indexOf(BACKUP_PREFIJO_MENSUAL) === 0) continue;          // permanente: nunca
      if (nom.indexOf(BACKUP_PREFIJO_DIARIO) === 0) lista.push({ file: f, created: f.getDateCreated() });
    }
    lista.sort(function (a, b) { return b.created - a.created; });
    lista.slice(maxHistoria).forEach(function (item) {
      try { item.file.setTrashed(true); console.log('🗑️ Backup rotado: ' + item.file.getName()); }
      catch (e) { console.warn('No se pudo rotar backup:', e.message); }
    });
  } catch (e) { console.warn('_rotarBackups:', e.message); }
}

/** Escribe/actualiza una clave de CONFIG (silencioso si no existe la hoja). */
function _setConfig(clave, valor) {
  try {
    const h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CONFIG');
    if (!h || h.getLastRow() < 2) return;
    const vals = h.getRange(2, 1, h.getLastRow() - 1, 1).getValues();
    for (let i = 0; i < vals.length; i++) {
      if (String(vals[i][0]).trim() === clave) { h.getRange(i + 2, 2).setValue(valor); return; }
    }
    h.appendRow([clave, valor]);
  } catch (e) { console.warn('_setConfig:', e.message); }
}

/**
 * Instala el activador diario del backup (03-04 AM) y corre un backup de
 * prueba. Ejecutar UNA VEZ desde el editor (autoriza Drive + triggers).
 * Es idempotente: si el activador ya existe, no lo duplica.
 */
function instalarTriggerBackup() {
  const yaExiste = ScriptApp.getProjectTriggers()
    .some(function (t) { return t.getHandlerFunction() === 'backupDiario'; });
  if (!yaExiste) {
    ScriptApp.newTrigger('backupDiario').timeBased().everyDays(1).atHour(3).create();
    console.log('⏰ Activador diario instalado (03-04 AM).');
  } else {
    console.log('⏰ El activador diario ya estaba instalado.');
  }
  const r = backupDiario();
  console.log(r.ok ? ('✅ Backup de prueba OK → ' + r.data.url) : ('❌ ' + r.error));
  return r;
}

/**
 * Lista los backups existentes (auditoría). Muestra las DOS mitades de D7 por
 * separado: contarlas juntas escondería que falta una.
 */
function listarBackups() {
  try {
    const tz = leerConfig('TIMEZONE', 'America/Santiago');
    const fecha = f => Utilities.formatDate(f.getDateCreated(), tz, 'yyyy-MM-dd HH:mm');
    const recoger = (carpeta, prefijo, tipo) => {
      const archivos = carpeta.getFilesByType(MimeType.GOOGLE_SHEETS);
      const out = [];
      while (archivos.hasNext()) {
        const f = archivos.next();
        if (f.getName().indexOf(prefijo) !== 0) continue;
        out.push({ tipo: tipo, nombre: f.getName(), id: f.getId(), url: f.getUrl(),
          creado: fecha(f), tamano: f.getSize() });
      }
      out.sort(function (a, b) { return b.creado.localeCompare(a.creado); });
      return out;
    };

    const carpeta = _obtenerCarpetaBackup();
    const diarios = recoger(carpeta, BACKUP_PREFIJO_DIARIO, 'diario');
    const mensuales = recoger(_obtenerCarpetaMensual(), BACKUP_PREFIJO_MENSUAL, 'mensual');

    console.log('📋 ' + diarios.length + ' respaldos diarios (rotan) en ' + carpeta.getUrl());
    diarios.forEach(function (b) { console.log('  · ' + b.nombre + ' (' + b.creado + ')'); });
    console.log('🗄️ ' + mensuales.length + ' respaldos mensuales PERMANENTES');
    mensuales.forEach(function (b) { console.log('  · ' + b.nombre + ' (' + b.creado + ')'); });
    if (!mensuales.length) console.warn('⚠️ No hay ningún respaldo mensual todavía: el primero lo crea el activador diario.');

    // Se mantiene la lista plana como valor por compatibilidad con quien ya
    // la consumía, y las dos mitades van aparte.
    const lista = diarios.concat(mensuales);
    lista.diarios = diarios; lista.mensuales = mensuales;
    return ok(lista);
  } catch (e) { return err('listarBackups: ' + e.message, ERR.INTERNO, e); }
}

/** Restaura desde un backup creando una COPIA nueva (no sobreescribe nada). */
function restaurarDesdeBackup(idBackup) {
  try {
    const archivo = DriveApp.getFileById(idBackup);
    const copia = archivo.makeCopy('RCE_KINE_RESTAURADO_' + hoyISO(), _obtenerCarpetaBackup());
    console.log('✅ Restauración manual creada: ' + copia.getUrl());
    return ok({ url: copia.getUrl(), nombre: copia.getName() });
  } catch (e) { return err('restaurarDesdeBackup: ' + e.message, ERR.INTERNO, e); }
}
