# Estado actual de RCE-KINE NEXT

## Hito actual

Simulación transversal de hitos 1–7 y preparación del Hito 8.
El plan maestro permanece en curso; ver `docs/VALIDATION_GAPS.md`.

Prioridad indicada por Diego: completar funcionalidad primero; estética y flujo
de trabajo se revisarán al final.

## Mediciones por componentes (avance actual)

Último avance local: PIM/PEM (cmH₂O), FEM (L/s), prensión (kg) y presión
transtraqueal (cmH₂O) con formato numeric-v1, validación numérica, signo y coma
decimal. Prensión rechaza negativos según min=0 de legacy. No se añadieron
umbrales de interpretación clínica. Históricos sin ese formato se conservan.
33 pruebas aprobadas. Paquete regenerado; este último cambio todavía NO está
cargado en Google: la implementación publicada sigue en versión 2 con escalas.
Próxima acción: cargar el paquete, actualizar la misma implementación TEST y
verificar una medición numérica desde la interfaz; luego continuar GSA y sesiones.
Automatización existente actualizada a cada 3 minutos por solicitud de Diego.

- MRC: 12 componentes, seis movimientos bilaterales; total derivado 0–60.
- FSS: cinco componentes, NE conservado; hasta dos NE se imputa promedio y se
  redondea como en sumFSS de legacy 7.04. Más de dos NE: total no calculable.
- CPAx: diez componentes 0–5 y total derivado 0–50.
- Se rechazan componentes faltantes, vacíos o fuera de rango. Se conserva el
  detalle en cada medición y en el texto firmado, incluido método de cálculo FSS.
- Totales sin componentes anteriores siguen legibles para reconstruir el diario;
  los formularios nuevos usan componentes. No se migraron registros existentes.
- 30 pruebas automáticas aprobadas. FSS se comparó directamente con sumFSS de
  legacy en las 59.049 combinaciones completas de puntajes y NE, sin diferencias.
  Validación clínica institucional pendiente.
- Aplicación TEST actualizada a versión 2, conservando la misma URL y acceso Solo yo.
- Prueba real desde interfaz: FSS [1, 2, 4, NE, NE] guardado como 12 puntos,
  conservando cinco componentes y método de promedio en el registro.

## Terminado

- Repositorio NEXT enlazado y rama `codex/reestructuracion-hito-0` publicada con PR #1 en borrador.
- Línea base RCE-KINE 7.04 identificada por commit inmutable.
- Código v2 de referencia copiado a `legacy-baseline/v7.04/`.
- Plan maestro, modelo clínico, arquitectura, migración y pruebas trasladados a Markdown.
- Restricciones del proyecto declaradas en `AGENTS.md`.

## Terminado en Hito 0

- Shell PWA con tablero de camas sintéticas; instalación real pendiente.
- Separación inicial entre Vista, Controlador, Servicio, Modelo y Repositorio.
- Verificación automática del shell y del bloqueo de producción.
- Revisión visual en navegador y apertura de la vista provisional de episodio.

## Avance posterior

- Modelo puro de episodios, turnos, eventos, series, actividades, pendientes y cultivos.
- Borradores, firma con texto congelado, adendas y auditoría por operación.
- Repositorio en memoria con aislamiento de lecturas, idempotencia y revisión optimista.
- Interfaz operativa para explorar los flujos sintéticos, sin persistencia al recargar.
- API TEST con diario de operaciones y adaptador Apps Script, probada desde el editor de Google; sin despliegue web.
- Inventario de las 396 columnas de EVOLUCIONES en `docs/FIELD_INVENTORY.md`.
- Comparación en sombra sintética y prueba acotada del reloj contra legacy 7.04.
- `npm test`: 24 pruebas aprobadas, además del smoke del shell; incluyen rangos
  legacy, GCS con 1T, adaptador GAS y simulación de Sheets.
- Navegador: borrador pendiente bloquea firma; guardar, firmar y crear adenda conserva texto original.

## Aún no implementar sin sus condiciones previas

- Conexión a Apps Script / Sheets de producción. La conexión TEST está en alcance,
  pendiente de verificar identidad/transporte desde la interfaz web.
- Datos clínicos reales, autenticación definitiva o despliegue.
- Migración o escritura en RCE-KINE vigente.
- Parámetros ventilatorios definitivos hasta contrastarlos con la versión real de uso.

## Próximo paso

Diego creó el proyecto `RCE-KINE-NEXT-TEST` y facilitó el enlace. Se verificó que
solo contenía la función vacía inicial. Se cargaron el backend combinado y el
manifiesto; el texto del editor coincide con el paquete local probado.

El 15 de septiembre de 2026, tras la autorización personal de Diego,
`initializeNextTest` terminó correctamente a las 12:47:39. Se verificaron las
propiedades del proyecto: entorno TEST, planilla nueva, marca y usuario permitido.
`runNextTestSmoke` devolvió `passed: true` a las 12:51:41, con seis operaciones
auditadas: ingreso idempotente, turno, borrador, medición, firma, rechazo de edición
posterior, adenda sin alterar el original y egreso con historia conservada.
La evidencia corresponde a ejecución desde el editor, no a una conexión de la PWA.
Instrucciones concretas en `api/README.md`.

La interfaz se conectó mediante HtmlService y google.script.run el 15/09/2026.
Implementación web versión 1 con acceso Solo yo, ejecutada por el propietario.
Se verificó lectura del episodio previo, ingreso, apertura de turno y guardado de
borrador desde la pantalla; tras recargar se recuperó el texto exacto del borrador.
Se firmó desde la interfaz y se verificaron el texto congelado y el autor Google
en la auditoría (OPEN_TURN, DRAFT y SIGN, revisiones 1–3).
26 pruebas automáticas aprobadas, incluyendo servicio remoto y reintento con el
mismo identificador después de respuesta incierta. La versión local permanece en
memoria. Falta validar acceso multiusuario y alojamiento PWA externo.

Siguiente integración: ampliar las pruebas de concurrencia multiusuario TEST.
También falta cerrar unidades y componentes de mediciones,
campos de sesiones, horarios de turno y matriz clínica; no declarar completos esos
hitos mientras existan los pendientes de `docs/VALIDATION_GAPS.md`.

## Última decisión

La versión disponible y aprobada para consulta es 7.04 (`21498b0`). La versión
7.05 mencionada en la conversación no está disponible en GitHub.
