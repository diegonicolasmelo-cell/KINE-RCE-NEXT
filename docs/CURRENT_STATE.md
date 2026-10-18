# Estado actual de RCE-KINE NEXT

Actualizado: 18/10/2026.

## Línea paralela: hoja diaria digital

Diego aportó la hoja física de registro kinésico UCI y solicitó un diseño para
reemplazar la sección Turno: captura numérica, columnas sucesivas por valoración
y texto revisable para copiar manualmente en ALMA. Se revisaron las dos páginas.
Implementación en rama paralela `codex/hoja-diaria-turno`, descrita en
[DAILY_RECORD_DESIGN.md](DAILY_RECORD_DESIGN.md). SAS se captura dentro del turno conservando observaciones por
hora; evaluaciones funcionales en panel lateral. DVA propone agentes, dosis y
unidades con cantidad derivada, sin interpretación automática por cantidad.
Decisión confirmada: descripción «HDN autosostenida» o «HDN con DVA»; en este último
caso, cantidad y detalle de NAD/AD/VS con dosis y unidades. No usar dosis altas,
moderadas o bajas. Un estado no registrado no equivale a HDN autosostenida.
Hoja del día reemplaza Turno: tabla de valoraciones, auscultación, secreciones,
observaciones, GSA con hora de muestra y parámetros descriptivos para KTM. Datos
iniciales de tubo/talla quedan fuera de la captura diaria. Firma y texto para ALMA
en la misma vista. 43 pruebas automáticas y smoke aprobados.
Paquete generado; [archivos e instalación](DAILY_RECORD_INSTALL.md).
El código de esta rama fue cargado en Código.gs del proyecto NEXT TEST; se verificó
coincidencia exacta con el paquete. Se corrigió incompatibilidad de Apps Script con
asignación lógica ||= usando asignación convencional; las cinco pruebas afectadas
volvieron a pasar. Prueba local de interfaz: FC 82, SAS 1 y NAD 0,35 µg/kg/min
guardados y presentes en el texto descriptivo; revisión visual realizada.
Versión 5 publicada y confirmada el 18/10/2026 a las 16:26 de Chile, misma URL,
acceso Solo yo y ejecución como propietario. No se ejecutó el inicializador.
Prueba real en cama 2, episodio sintético `fd19b949-4233-4e84-8733-8c64650f015b`:
dos columnas a las 16:28:07 y 16:28:30 conservaron FC 82/96 y SAS 1/2. La primera
incluye auscultación, secreciones, observaciones, NAD 0,35 µg/kg/min y objetivo KTM.
La segunda enlaza GSA de las 16:28 con pH 7,38, EB -2 y lactato 0. Se recargó la
aplicación y se reabrió el episodio: ambas columnas y texto persistieron en Sheets.
El turno sintético permanece abierto para revisión. Firma de hoja validada por
pruebas automáticas; no se firmó este turno en Google. No se modificó producción.

## Bloque cerrado

Implementación técnica TEST de mediciones numéricas, gases y sesiones estructuradas,
con correcciones de reintentos. Ver [acta de cierre](BLOCK_CLOSEOUT_2026-09-15.md).

- Última validación funcional: 39 pruebas automáticas aprobadas y smoke del shell.
- Google TEST: versión 4, publicada el 15/09/2026 a las 13:51 de Chile; interfaz
  HtmlService conectada a Sheets, acceso Solo yo.
- Rama: `codex/reestructuracion-hito-0`; PR #1 en borrador.
- Código funcional: `986fcf89e5788c87fbfc6dc9c8ce83facb98325a`.
- Decisión de turnos manuales: `5a723eaa5a329475ff768333fbde127b926201da`.

El plan maestro sigue en curso. Este cierre no completa los hitos clínicos;
consultar [pendientes por hito](VALIDATION_GAPS.md).

## Base disponible

- Tablero de 18 camas, episodios, traslados, egreso e historia.
- Turnos, borradores, firma congelada, adendas y auditoría.
- Eventos, estados persistentes, series y actividades.
- MRC/FSS/CPAx por componentes; GCS conserva 1T.
- API TEST con diario, revisión optimista, idempotencia e identidad Google del dueño.
- Simulación local en memoria; persistencia real en la interfaz Google TEST.
- Inventario de 396 campos y comparación sintética acotada con legacy 7.04.

## Decisiones vigentes

- Apertura y cierre de turnos manuales, confirmados por Diego.
- Funcionalidad primero; estética y flujo de trabajo al final.
- Automatización recurrente eliminada a petición del usuario.
- Solo datos sintéticos y TEST; producción y main permanecen sin cambios.
- Referencia aprobada: legacy 7.04, commit `21498b0f8f43a506d1072417a024373b086f1807`.
  La 7.05 y el DOCX maestro original no están disponibles.

## Punto de reanudación

Siguiente bloque propuesto: neurología estructurada (CAM-ICU, PIC/PPC y altura DVE),
contrastando campos y reglas con legacy antes de implementar. Siguen pendientes
validación clínica, concurrencia multiusuario, dispositivos, ecografía, deglución,
BDT, indicadores, PWA externa y migración.

Para retomar, leer el acta y los documentos indicados en AGENTS.md.
El proyecto Google TEST ya está inicializado: no ejecutar de nuevo el inicializador.
Este cierre documental no requiere otra publicación de Apps Script.
