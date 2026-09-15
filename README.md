# KINE-RCE-NEXT

Nueva generación del Registro Clínico Electrónico de Kinesiología UCI.

## Estado

Hito 0 implementado en la rama `reestructuracion-hito-0`: PWA instalable, tablero
de 18 camas sintéticas, arquitectura inicial por capas y conexiones externas
bloqueadas.

## Ejecutar localmente

```powershell
python -m http.server 4173 --directory app
```

Abrir `http://127.0.0.1:4173`.

## Verificar

```powershell
npm test
```

## Documentación

- `AGENTS.md`: reglas obligatorias para sesiones de desarrollo.
- `docs/MASTER_PLAN.md`: contrato funcional y secuencia de hitos.
- `docs/CLINICAL_MODEL.md`: entidades, estados, eventos y conteos.
- `docs/ARCHITECTURE.md`: responsabilidades técnicas.
- `docs/CURRENT_STATE.md`: continuidad entre sesiones.
- `docs/MIGRATION_PLAN.md` y `docs/TEST_PLAN.md`: transición y validación.

## Base aprobada

- Origen: https://github.com/diegonicolasmelo-cell/RCE-KINE
- Versión: `7.04-aviso-de-error-al-centro` (no 7.05).
- Commit inmutable: `21498b0f8f43a506d1072417a024373b086f1807`.
- Copia de consulta: `legacy-baseline/v7.04/`.

NEXT se desarrolla y prueba separado de RCE-KINE. Este repositorio no modifica
ni despliega la aplicación del hospital. No incluir datos clínicos reales,
credenciales ni configuraciones de producción.
