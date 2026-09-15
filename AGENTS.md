# KINE-RCE-NEXT

Antes de modificar código, leer en este orden:

1. `docs/MASTER_PLAN.md`
2. `docs/CLINICAL_MODEL.md`
3. `docs/ARCHITECTURE.md`
4. `docs/CURRENT_STATE.md`

Para migraciones o pruebas, leer además `docs/MIGRATION_PLAN.md` y
`docs/TEST_PLAN.md`.

## Restricciones críticas

- Este repositorio contiene RCE-KINE NEXT.
- No modificar, publicar ni desplegar el repositorio RCE-KINE productivo.
- No conectar NEXT a Google Sheets, Apps Script ni credenciales de producción.
- No usar datos clínicos reales durante el desarrollo.
- Toda interfaz de desarrollo debe identificarse como TEST / NO PRODUCCIÓN.
- `legacy-baseline/v7.04/` es una copia inmutable de consulta. No desarrollar allí.

## Principios clínicos

- Ocultar no es borrar.
- Los hechos se registran; los contadores se calculan.
- Un estado persistente cambia mediante un evento, nunca desmarcando una casilla.
- RUT identifica a la persona y PATIENT_ID identifica al episodio.
- La cama es una ubicación, no la identidad de un paciente.
- Turnos, series, eventos y estados persistentes son entidades diferentes.
- Una serie agrega mediciones; nunca sobreescribe una medición anterior.
- KTR cuenta atenciones, independientemente de cuántas técnicas incluya cada una.
- La firma cierra el turno. Toda corrección posterior requiere adenda y auditoría.

## Arquitectura

PWA / Vista -> Controladores -> Servicios y modelo clínico -> API Apps Script ->
Repositorio Google Sheets.

La Vista nunca escribe directamente en Sheets ni decide reglas clínicas.

## Política de desarrollo

- `main` debe permanecer estable.
- Trabajar en ramas con nombres legibles que describan el contenido.
- Cada cambio funcional debe tener pruebas proporcionales a su riesgo.
- No realizar migraciones destructivas.
- No inventar variables clínicas que no estén aprobadas en el plan maestro.
- Antes de finalizar una tarea, actualizar `docs/CURRENT_STATE.md`.

