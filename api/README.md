# API de NEXT exclusivamente TEST

Estado: pruebas locales y prueba real desde el editor de Apps Script aprobadas.
**No desplegada como aplicación web y no conectada a la PWA.**

El 15 de septiembre de 2026 se inicializó el proyecto vacío RCE-KINE-NEXT-TEST,
creando una planilla nueva. `runNextTestSmoke` devolvió `passed: true`: persistencia,
reintento de ingreso sin duplicado, firma, rechazo de edición directa, adenda y
egreso con historia conservada. La identidad comprobada es la ejecución del dueño
desde el editor; no demuestra autenticación desde una PWA externa.

## Crear el entorno correcto

Crear un proyecto Apps Script nuevo y vacío, llamado `KINE-RCE-NEXT TEST`.
Cambiar el nombre de una copia de producción no acredita aislamiento: puede
conservar datos y referencias al sistema vigente.

Preparación de archivos:

1. Ejecutar `npm run build:api`.
2. En el proyecto nuevo, cargar `api/generated/domain.gs` como `domain.gs`.
3. Cargar `api/apps-script/adapter.gs` como `adapter.gs`.
4. Cargar `api/apps-script/smoke.gs` como `smoke.gs`.
5. Usar el manifiesto `api/apps-script/appsscript.json`.
6. Ejecutar `initializeNextTest` con la cuenta responsable del entorno TEST.
7. Ejecutar `runNextTestSmoke` y comprobar `passed: true` en el registro.

Alternativa de un solo archivo: `npm run package:test` genera
`deliverables/next-test/NEXT_TEST.gs` con dominio, adaptador y prueba juntos,
además del manifiesto y una guía breve. Usar esa alternativa o los archivos
separados, nunca ambas: compartirían nombres de funciones.

La función crea una planilla vacía nueva y la marca con un identificador aleatorio.
Guarda el identificador de planilla, la marca y el usuario autorizado solamente en
las propiedades del proyecto. Nunca recibe ni acepta un ID de producción para
inicializarse. Si el archivo no conserva la marca TEST exacta, las operaciones se
rechazan. Un nombre TEST por sí solo nunca se usa como comprobación.

## Transporte y autenticación pendientes

El adaptador exige usuario identificado mediante `Session.getActiveUser()` y lista
de usuarios autorizados del servidor. No toma el autor de un campo del navegador.
No poner secretos en el frontend ni habilitar acceso anónimo para resolver un
problema de conexión.

Primero validar desde el editor la función `nextTestDispatch_` y los escenarios del
diario. El modo de despliegue, la disponibilidad de identidad de usuario y el
transporte entre la PWA y Apps Script todavía requieren prueba real. No se ha
demostrado CORS/autenticación entre dominios. La PWA sigue utilizando memoria.

## Contrato

Todas las solicitudes: `schemaVersion: 1`, `environment: "TEST"`.

- `LIST`: consultar los episodios sintéticos.
- `GET` + `episodeId`: recuperar un episodio.
- `ADMIT` + `requestId` + `episode`: ingresar una persona sintética.
- `COMMAND` + `requestId` + `episodeId` + `revision` + `command`: aplicar una operación.

`personId` empieza por `TEST-` y `alias` por `Paciente de prueba`.
Los textos libres siguen siendo exclusivamente sintéticos: un prefijo no
anonimiza ni detecta información clínica real.

Cada escritura usa un bloqueo del script, valida la revisión y agrega una sola
fila JSON al diario con operación, autor, momento y recibo de idempotencia. Ante
respuesta incierta se reintenta la misma solicitud con el mismo `requestId`.
No se realiza una segunda escritura independiente para el recibo.

Las columnas clínicas finales aún no existen: este diario es un mecanismo de
persistencia para probar el modelo, no reemplaza el diseño tabular legible
acordado para coordinación. Tiene límite de 20.000 entradas y 40.000 caracteres
por registro; hace reconstrucción completa y no está dimensionado para producción.

## Documentación primaria consultada

- [PropertiesService](https://developers.google.com/apps-script/reference/properties/properties-service)
- [LockService](https://developers.google.com/apps-script/reference/lock/lock-service)
