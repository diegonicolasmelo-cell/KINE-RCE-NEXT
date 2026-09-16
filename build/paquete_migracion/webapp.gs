/**
 * webapp.gs — fusión de 2 archivos del repo (webapp.gs, api_web.gs).
 * En Apps Script todos los archivos comparten un mismo espacio global:
 * la fusión es organizativa, el código es idéntico.
 */


// ════════════════════════════════════════════════════════════════════
// ── webapp.gs ──
// ════════════════════════════════════════════════════════════════════

/**
 * webapp.gs — Punto de entrada único de la Web App.
 * doGet sirve la app (index). Con ?page=spike sirve el spike de GIS.
 */
function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) || '';
  if (page === 'spike') return _paginaSpike();
  // v2.1: index se sirve como ARCHIVO PLANO (sin plantilla ni scriptlets).
  // La compilación de plantillas demostró romper el arranque en el bootstrap
  // de Google (/dev): el OAUTH_CLIENT_ID ahora se pide en runtime con la
  // acción pública GET_LOGIN_INFO, así el HTML viaja intacto byte a byte.
  // Los meta de web-app permiten que «Agregar a pantalla de inicio» abra la
  // plataforma a pantalla completa, como una app instalada (versión móvil).
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('RCE-KINE · UCI')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .addMetaTag('mobile-web-app-capable', 'yes')
    .addMetaTag('apple-mobile-web-app-capable', 'yes');
}


// ════════════════════════════════════════════════════════════════════
// ── api_web.gs ──
// ════════════════════════════════════════════════════════════════════

/**
 * api_web.gs — LA PUERTA HTTP: Apps Script contestando datos a una app que
 * vive fuera de su iframe.
 *
 * ── QUÉ CAMBIA ────────────────────────────────────────────────────────────
 * Hoy la pantalla y los datos viajan por el MISMO tubo (`google.script.run`),
 * que solo existe dentro del iframe de Apps Script. Por eso la app no se puede
 * servir desde otro sitio: abriría y se quedaría sin servidor. El PRD de la
 * PWA pide separarlos —«la pantalla se sirve desde un sitio propio y Apps
 * Script solo contesta datos»— y esta es esa puerta.
 *
 * ── 🪤 POR QUÉ EL CUERPO VIAJA COMO TEXTO PLANO ───────────────────────────
 * Antes de mandar un POST a otro dominio con `Content-Type: application/json`,
 * el navegador pregunta primero con una petición OPTIONS. **Apps Script no
 * contesta OPTIONS**: esa llamada muere sin llegar nunca a este archivo, y el
 * error que se ve en la consola habla de CORS, no de Apps Script, así que
 * manda a buscar en el lugar equivocado.
 * La salida conocida es mandar el cuerpo como `text/plain`, que el navegador
 * trata como petición simple y despacha directo. Por eso acá se lee
 * `e.postData.contents` y se interpreta a mano: no es descuido, es la única
 * forma que llega. El cliente hace su mitad en `_apiHttp` (v2/index.html).
 *
 * ── 🔴 NO HAY UN SEGUNDO DISPATCHER ───────────────────────────────────────
 * Esta puerta NO decide nada: arma la llamada y se la pasa al `api()` de
 * siempre. Si tuviera su propio catálogo de acciones, una acción nueva
 * serviría por un camino y no por el otro, y el día que eso pase nadie se va a
 * acordar de que hay dos listas. También por eso hereda el candado gratis: el
 * acceso del turno se verifica dentro de `api()`, no acá.
 *
 * ── 🔒 LO QUE NO VUELVE ───────────────────────────────────────────────────
 * Un error NUNCA devuelve el cuerpo que se mandó. Por ahí viajan las claves
 * del turno, y un mensaje de error que las eche de vuelta las deja en el
 * registro del navegador, en la consola y en cualquier captura de pantalla.
 */

/** Respuesta JSON, que es lo único que sale por esta puerta. */
function _webJson(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Punto de entrada de la app instalada. El cuerpo es un JSON en texto plano
 * con `{accion, datos, token}` — los mismos tres argumentos que recibe
 * `api()` desde el iframe.
 */
function doPost(e) {
  var accion = '';
  try {
    var crudo = (e && e.postData && e.postData.contents) || '';
    if (!crudo) return _webJson({ ok: false, error: 'Petición vacía.', codigo: 'VALIDACION' });

    var p;
    try { p = JSON.parse(crudo); }
    catch (err) { return _webJson({ ok: false, error: 'La petición no es JSON válido.', codigo: 'VALIDACION' }); }
    if (!p || typeof p !== 'object' || Array.isArray(p)) {
      return _webJson({ ok: false, error: 'La petición no trae un objeto.', codigo: 'VALIDACION' });
    }

    accion = String(p.accion || '');
    if (!accion) return _webJson({ ok: false, error: 'Falta la acción.', codigo: 'VALIDACION' });

    var r = api(accion, p.datos || {}, p.token || null);
    return _webJson(r);

  } catch (err) {
    // 🔒 Se nombra la ACCIÓN, nunca los datos: por ahí viaja la clave.
    console.error('doPost(' + accion + '): ' + (err && err.message));
    return _webJson({ ok: false, error: 'Error del servidor al procesar ' + (accion || 'la petición') + '.',
                      codigo: 'INTERNO' });
  }
}
