/** TEST ONLY. Install in a new, isolated Apps Script project. */
function initializeNextTest() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('NEXT_TEST_SHEET_ID')) throw new Error('Entorno ya inicializado');
  var actor = Session.getActiveUser().getEmail();
  if (!actor) throw new Error('Se requiere usuario identificado');
  var book = SpreadsheetApp.create('KINE-RCE-NEXT · TEST · SOLO DATOS SINTÉTICOS');
  var journal = book.getSheets()[0];
  journal.setName('NEXT_TEST_JOURNAL');
  journal.getRange(1, 1).setValue('NEXT_TEST_JOURNAL_V1');
  var marker = Utilities.getUuid();
  book.addDeveloperMetadata('NEXT_TEST_MARKER', marker);
  props.setProperties({ NEXT_ENV: 'TEST', NEXT_TEST_SHEET_ID: book.getId(), NEXT_TEST_MARKER: marker, NEXT_TEST_USERS: JSON.stringify([actor]) });
  return { environment: 'TEST', spreadsheetUrl: book.getUrl() };
}
function nextTestDispatch_(request) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('NEXT_ENV') !== 'TEST') throw new Error('Entorno TEST no inicializado');
  var actor = Session.getActiveUser().getEmail();
  var users = JSON.parse(props.getProperty('NEXT_TEST_USERS') || '[]');
  if (!actor || users.indexOf(actor) < 0) throw new Error('Acceso no autorizado');
  var book = SpreadsheetApp.openById(props.getProperty('NEXT_TEST_SHEET_ID'));
  var marker = props.getProperty('NEXT_TEST_MARKER');
  if (!marker || !book.getDeveloperMetadata().some(function(m) { return m.getKey() === 'NEXT_TEST_MARKER' && m.getValue() === marker; })) throw new Error('Planilla ajena al entorno TEST');
  var sheet = book.getSheetByName('NEXT_TEST_JOURNAL');
  if (!sheet || sheet.getRange(1, 1).getValue() !== 'NEXT_TEST_JOURNAL_V1') throw new Error('Diario TEST inválido');
  return dispatchTest(request, actor, {
    allowedActors: users,
    now: function() { return new Date().toISOString(); },
    id: function() { return Utilities.getUuid(); },
    lock: function(work) {
      var guard = LockService.getScriptLock();
      guard.waitLock(10000);
      try { return work(); } finally { guard.releaseLock(); }
    },
    journal: {
      read: function() {
        var count = sheet.getLastRow() - 1;
        if (count > 20000) throw new Error('Límite del diario TEST excedido');
        return count ? sheet.getRange(2, 1, count, 1).getValues().map(function(row) { return JSON.parse(row[0]); }) : [];
      },
      append: function(row) { sheet.getRange(sheet.getLastRow() + 1, 1).setValue(JSON.stringify(row)); SpreadsheetApp.flush(); }
    }
  });
}
function doGet() {
  return HtmlService.createHtmlOutput(nextTestInterface_()).setTitle('RCE-KINE NEXT · TEST').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function nextTestRequest(request) {
  try { return { ok: true, data: nextTestDispatch_(request) }; }
  catch (error) { return { ok: false, error: String(error.message || 'Operación rechazada') }; }
}
function doPost(event) {
  var response;
  try {
    var content = event && event.postData && event.postData.contents;
    if (!content || content.length > 30000) throw new Error('Solicitud inválida');
    response = { ok: true, data: nextTestDispatch_(JSON.parse(content)) };
  } catch (error) {
    response = { ok: false, error: String(error.message || 'Operación rechazada') };
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}
