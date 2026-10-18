# Propuesta paralela: hoja diaria digital del turno

Fecha: 18/10/2026. Estado: primera implementación en rama `codex/hoja-diaria-turno`.
Validación automática: 43 pruebas y smoke del shell aprobados. Versión 5 publicada
en Google TEST el 18/10/2026; dos columnas sintéticas recuperadas tras recarga.
Consultar CURRENT_STATE.md para el detalle de evidencia y alcance.
Fuente: las dos páginas de «Hoja registro Kinésico UCI 2025 (2).pdf», facilitadas
por Diego. La hoja es una referencia de estructura; sus protocolos y umbrales no
se incorporan automáticamente como reglas aprobadas del software.

## Objetivo

Reemplazar la sección 2 «Turno» con una hoja digital longitudinal familiar.
Registrar una sola vez, conservar valores estructurados para análisis y producir
texto revisable para copiar manualmente en ALMA. No se presupone integración ni
confirmación automática del guardado en ALMA.

## Alcance de la primera implementación

Reemplaza la pestaña Turno por Hoja del día, una tabla con columnas sucesivas de
valoraciones fechadas. Incluye FC, FR observada, PA, PAM medida, SpO₂, FiO₂, SAS,
PIC/PPC, auscultación, secreciones, observaciones, HDN/DVA, GSA y parámetros para KTM.
Talla y características iniciales del tubo no se vuelven a capturar aquí; la ficha
completa de ingreso sigue siendo un pendiente del plan maestro.

GSA exige hora de muestra y se guarda como medición enlazada dentro de la misma
operación que la valoración. KTM incluye objetivo, asistencia prevista,
limitaciones/contraindicaciones y respuesta observada como campos descriptivos:
no calcula aptitud para movilización ni genera una sesión realizada automáticamente.
Las sesiones efectivamente realizadas conservan su registro en Atenciones.

La nota y plan anteriores permanecen accesibles como complemento. Firma y copia
del texto se hacen desde la misma vista. Eventos, evaluaciones, continuidad e
historia permanecen accesibles mediante navegación. La navegación lateral y el
acabado visual definitivo siguen pendientes; esta entrega usa las pestañas existentes.

Los registros antiguos siguen accesibles en sus secciones e historia. No se
convierten retroactivamente en columnas. Las columnas nuevas se almacenan en
`dailyRecords`, conservando su estructura por valoración y su turno de origen.

## Pantalla propuesta

```text
TEST / NO PRODUCCIÓN · Episodio · Cama · Fecha · Turno abierto manualmente
Resumen vigente: vía aérea / soporte / antecedentes (con fecha de origen)

NAVEGACIÓN         HOJA DEL TURNO
Hoja diaria        Variable          08:15      11:30      Nueva valoración
Eventos            FC (lpm)          82         96        [             ]
Evaluaciones       FR observada      18         22        [             ]
Sesiones           PAM (mmHg)        75         78        [             ]
Laboratorio        SAS                1          2        [             ]
Pendientes         DVA               1 agente   2 agentes [+ detalle     ]
Historial          ... bloques plegables de ventilación y observaciones ...

                   [Guardar valoración] [Ver texto del turno] [Firmar turno]
```

Valores ilustrativos sintéticos; no son recomendaciones ni objetivos clínicos.
En escritorio: nombres de filas fijos y desplazamiento horizontal de columnas.
En pantalla estrecha: editar una valoración en formulario y consultar anteriores
en una vista separada. El texto se abre en un panel para revisar y copiar.

## Tiempo y edición

- Una columna representa una valoración con fecha y hora, vinculada al episodio
  y al turno. Un día puede contener varios turnos y cada turno varias columnas.
- Agrupar columnas por fecha y turno, con consulta de días anteriores. No limitar
  a una columna diaria, porque ocultaría cambios intraturno.
- «Nueva valoración» comienza sin resultados observados. Los anteriores se ven
  como referencia, sin copiarlos como si fueran observaciones nuevas.
- SAS y GCS se introducen aquí como parte del trabajo del turno y se almacenan
  como observaciones fechadas. No obligar a abrir Evaluaciones para registrarlos.
- Guardar una valoración no firma el turno. Apertura y cierre siguen manuales.
- Correcciones conservan trazabilidad; después de firmar se requiere adenda.
- Laboratorio conserva hora de muestra y registro: no se presenta un gas previo
  como si correspondiera a la hora de la nueva valoración.

## Correspondencia con la hoja física

| Hoja física | Destino digital propuesto |
|---|---|
| Nombre, RUT/CP, fecha | Cabecera del episodio; evitar recaptura por turno |
| Soporte, TOT/TQT, calibre, posición y días | Resumen vigente y eventos; días derivados de historia |
| Horario, auscultación y secreciones | Valoración fechada del turno |
| FC, PA, PAM, PIC/PPC, Glasgow, S5Q, SAS y DVA | Filas de monitorización; validar definición de S5Q y Escalón antes de implementarlos |
| Terapia ventilatoria | Bloque de parámetros por valoración, con modo y unidades explícitos |
| GSA y otros laboratorios | Registros propios por muestra, visibles desde la hoja |
| Procedimientos y observaciones | Actividades/eventos y texto asociado; no duplicar registros |
| Fechas de filtros y sonda | Historial de dispositivos/cambios, con resumen vigente |
| MRC, FSS y otras evaluaciones | Panel Evaluaciones con resultados y fecha enlazados a la hoja |
| Weaning/PVE | Evaluación específica y eventos; criterios requieren revisión clínica |

FR observada se agrega por petición de Diego y se distingue de frecuencia
programada del ventilador. Los parámetros ventilatorios pendientes mantienen
la condición del plan maestro de contrastarse con la versión real de uso.

## Primero el dato; después la interpretación

Guardar valor, unidad, hora, autor y origen. Separar resultados observados,
cálculos e interpretación. No reemplazar FC por «eucárdico» ni FR por una etiqueta.
Un cero no equivale a un vacío; distinguir sin registrar, no medido y no aplicable.
PA sistólica y diastólica son campos separados. PAM medida y PAM calculada deben
distinguirse por origen, si posteriormente se habilita el cálculo.

Para DVA, criterio descriptivo acordado con Diego el 18/10/2026:

- Estado explícito: «HDN autosostenida» / «HDN con DVA» / no registrado.
  «HDN autosostenida» requiere registro explícito; nunca deducirla de campos vacíos.
- Fármacos del formulario: NAD (noradrenalina), AD (adrenalina) y VS (vasopresina).
  Dopamina no se incluye en este formulario por decisión del usuario.
- Con DVA: lista de fármacos activos, cada uno con dosis, unidad y hora asociada.
- Mostrar cantidad de agentes a partir de esa lista, sin usar cantidad como dosis.
- No interpretar automáticamente «estable», intensidad del soporte o elegibilidad
  para procedimientos a partir del número de agentes.
- Si solo se conoce la cantidad, permitir consignarla como información incompleta
  diferenciada, sin inventar nombres ni dosis.

No usar categorías de dosis altas, moderadas o bajas para DVA. Generar descripción
con cantidad de agentes activos (1, 2 o 3), abreviatura, dosis y unidad de cada uno.
Las unidades deben quedar explícitas y confirmadas en la captura; no inferirlas de
un número aislado. No modificar retrospectivamente textos firmados.

Plantillas de salida:

- «HDN autosostenida.»
- «HDN con 1 DVA: NAD {dosis} {unidad}.»
- «HDN con 2 DVA: NAD {dosis} {unidad}; AD {dosis} {unidad}.»
- Si hay VS, incluirla con su propia dosis y unidad y ajustar la cantidad.
- Si no se registró el estado, no generar ninguna de las dos afirmaciones.

## Texto para ALMA

Flujo: registrar → guardar con confirmación → revisar texto → firmar → copiar.
Puede existir una previsualización del borrador claramente rotulada; la copia
definitiva corresponde a la versión firmada. Una adenda produce texto adicional.

Ejemplo sintético de salida factual:

> Valoraciones a las 08:15 y 11:30. FC 82 y 96 lpm; FR observada 18 y 22 rpm;
> PAM 75 y 78 mmHg, respectivamente. SAS 1 a las 08:15 y 2 a las 11:30.

Ofrecer texto del turno y de una atención seleccionada, siempre con alcance y
fechas visibles. No unir datos de horas distintas en un supuesto examen único.
Incluir intervenciones y respuesta solo cuando estén registradas.
«Copiar» confirma copia al portapapeles, nunca guardado en ALMA.

## Persistencia requerida para integrar

La tabla es una vista de observaciones, no una planilla que reemplaza toda una fila.
Cada guardado debe transmitir solo cambios explícitos, con identificador de
solicitud, revisión y confirmación del servidor. Una respuesta incierta conserva
la solicitud para reintentar sin duplicación. Un campo omitido no borra otro dato.
Las observaciones nuevas se agregan; las correcciones enlazan el registro original.
Los estados persistentes cambian mediante eventos, no al guardar una columna vacía.

Estas son condiciones del diseño futuro; no se declara que la interfaz actual
ya implemente la hoja ni todas estas garantías. No añadir almacenamiento clínico
en localStorage o caché del navegador.

## Criterios de aceptación para el futuro prototipo TEST

1. Dos valoraciones del mismo turno conservan ambos SAS y ambas horas.
2. Guardar FC no cambia DVA, ventilación ni datos del episodio.
3. Diferenciar FR observada de frecuencia programada.
4. DVA conserva agentes/dosis/unidades y distingue ausencia de dato de ausencia de soporte.
5. Recargar recupera columnas confirmadas; reintentar no duplica valoraciones.
6. La firma congela texto e historia; correcciones posteriores son auditables.
7. Texto copiado conserva contexto temporal y no inventa interpretaciones.
8. Evaluaciones funcionales se registran una vez y se consultan desde la hoja.

Siguiente paso: revisar la captura con datos sintéticos en la hoja implementada,
precisar si se requieren otros parámetros específicos para KTM y completar la
validación clínica antes de cualquier uso real.
