# Instalar hoja diaria en NEXT TEST

Rama paralela: `codex/hoja-diaria-turno`.
Esta entrega no modifica main ni RCE-KINE productivo.

## Proyecto autorizado

RCE-KINE-NEXT-TEST, Apps Script:
`12QClhZeEAlGGIfPKusbpTVA8TcOjzTublPIGGJnmoQAOljRJYw0yALfA`.

## Archivo que reemplaza el script actual

`deliverables/next-test/NEXT_TEST.gs` contiene dominio, interfaz, adaptador y smoke.
En el proyecto actual, reemplazar el contenido completo de **Código.gs** por este
archivo. No añadir una segunda copia con las mismas funciones.

Conservar el manifiesto y propiedades existentes. `appsscript.json` se entrega
como referencia, sin nuevos permisos. No volver a ejecutar `initializeNextTest`.
Guardar y actualizar la implementación web existente con una nueva versión;
conservar acceso **Solo yo** y ejecución como propietario.

Si se usa una instalación separada en archivos, reemplazar conjuntamente
`api/generated/domain.gs` e `api/generated/interface.gs`. No mezclar este método
con el archivo combinado. El adaptador y smoke no requieren cambios.

## Verificación

1. Abrir un episodio sintético y un turno manual.
2. Guardar una valoración con FC, SAS, auscultación, secreciones y observaciones.
3. Añadir otra valoración: deben verse ambas columnas, sin heredar datos vacíos.
4. Registrar HDN con DVA, seleccionar NAD/AD/VS y sus dosis/unidades.
5. Agregar GSA con hora de muestra. Los parámetros para KTM no cuentan una sesión.
6. Recargar y confirmar persistencia; revisar texto antes de firmar y copiar.

Validación automática de esta entrega: 43 pruebas y smoke aprobados. La revisión
Google se informa por separado en CURRENT_STATE.md.

Estado al 18/10/2026: Código.gs cargado y comparado con el paquete; versión 5
publicada a las 16:26 de Chile, misma URL y acceso Solo yo. Se verificó persistencia
tras recarga de dos valoraciones sintéticas en cama 2: FC/SAS, NAD con dosis/unidad,
auscultación, secreciones, observaciones, objetivo KTM y GSA con signo y cero.
No es necesario que el usuario vuelva a reemplazar archivos para esta entrega.

## Compatibilidad y retorno

El nuevo comando es `DAILY_ASSESSMENT`, formato `daily-v1`. El diario existente se
reconstruye sin migración ni borrado. Después de guardar ese comando, una versión
antigua del dominio no podrá reconstruir el diario. Para revertir la interfaz,
conservar el lector/dominio nuevo compatible; no volver simplemente a versión 4.

Generación reproducible: `npm run package:test`. El manifiesto, paquete y LEEME
quedan en `deliverables/next-test/`.
