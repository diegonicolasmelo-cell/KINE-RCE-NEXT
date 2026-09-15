# Qué está probado y qué falta

Esta entrega es una simulación de los flujos principales, no la finalización del
plan maestro ni una versión clínicamente validada.

| Hito | Evidencia actual | Cierre pendiente |
|---|---|---|
| 0 | Shell, caché acotada, banner TEST | Instalación PWA en los dispositivos reales; iconos PNG |
| 1 | Camas, estado, traslado, egreso e historia por episodio | UX clínica y ficha de persona/ingreso completa |
| 2 | Borrador, firma congelada, adenda, revisión e idempotencia | Horarios clínicos día/noche, autor autenticado en Google, concurrencia real |
| 3 | Secuencia vía aérea/VM, PVE independiente, AET/UPOT/aislamiento | Dispositivos, parámetros, cambios retroactivos y correcciones estructuradas |
| 4 | Series; GCS con 1T; MRC/FSS/CPAx por componentes con total derivado y NE trazable | Validación clínica de componentes, unidades y resto de mediciones |
| 5 | Atenciones KTR y sesiones KTM separadas; programas IMT/EMS | Detalle estructurado de cada sesión y validaciones terapéuticas |
| 6 | Gateway, diario y smoke Google; interfaz HtmlService conectada con acceso Solo yo | Autenticación multiusuario, concurrencia real y PWA externa |
| 7 | Texto por turno, adendas, entrega y pendientes | Presentación clínica, impresión, indicadores REM y conciliación completa |
| 8 | Comparador sintético sin escritura; prueba limitada de reloj legacy | Matriz aprobada, migración en sombra real autorizada, piloto, corte y retorno |

## Decisiones a validar, no asumir

- La matriz de 396 campos está inventariada; las propuestas por prefijo NO son aprobaciones clínicas.
- La 7.04 contiene varios relojes. Solo se compararon bloques completos de un
  tramo sin cambio horario. No se probó equivalencia completa de días VM,
  suma/redondeo de varios tramos, estadía calendario, cambio horario o referencia
  de turno. La interfaz muestra horas VM efectivas para no afirmar esa equivalencia.
- Válvula vigente durante VM se rechaza en el prototipo. Esta restricción
  conservadora no es una decisión clínica validada para NEXT.
- Los eventos nuevos requieren turno abierto y se agregan en orden temporal.
  La entrada de eventos fuera de ese contexto y su conciliación están pendientes.
- SAS e IMS validan rangos existentes en legacy. GCS conserva 1T.
  MRC/FSS/CPAx conservan componentes y total derivado; FSS reproduce sumFSS de
  legacy 7.04 con promedio y redondeo para hasta dos NE. Esta equivalencia de código
  no constituye aprobación clínica. El resto sigue en texto libre y no está validado.
- No se recuperó el DOCX maestro original. Markdown consolida mensajes leídos,
  por lo que debe contrastarse con ese archivo si contiene reglas adicionales.

## Datos y entorno

La simulación local pierde sus cambios al recargar. La interfaz HtmlService sí
se conecta al backend TEST. La prueba ejecutada desde el editor de Google el 15 de septiembre de
2026 sí verifica persistencia real en la planilla TEST. No demuestra identidad
institucional, transporte desde la PWA ni aptitud para producción.
