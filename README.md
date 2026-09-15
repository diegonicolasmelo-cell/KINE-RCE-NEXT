# KINE-RCE-NEXT

Nueva generación del Registro Clínico Electrónico de Kinesiología UCI.
Hospital San Pablo de Coquimbo.

## Qué es este repositorio

La **reconstrucción** de RCE-KINE según `PLAN_MAESTRO.md`, desarrollada y
probada **aparte** de la aplicación que usa el equipo.

🔴 **NEXT no modifica ni despliega la aplicación del hospital.** Su paquete de
entrega va a una planilla nueva con su propio proyecto de Apps Script. No
incluye datos clínicos reales, credenciales ni configuración de producción.

## Base aprobada

- Origen: https://github.com/diegonicolasmelo-cell/RCE-KINE
- Versión: `7.04-aviso-de-error-al-centro` (no 7.05).
- Commit inmutable: `21498b0f8f43a506d1072417a024373b086f1807`.
- Importado el 15-sep-2026. Ver `BITACORA.md`.

## Cómo está ordenado

| Carpeta / archivo | Qué es |
|---|---|
| `v2/` | **El código fuente.** Es la verdad del proyecto: acá se programa. |
| `entrega/` | El paquete de 13 archivos listo para pegar en el editor. **Se genera**, no se edita. |
| `build/checks/` | La batería: ~145 guardias, cada una nacida de un error que costó caro. |
| `build/` | El empaquetador, el corredor de la batería y los bancos de medición. |
| `herramientas/` | Diagnóstico y utilidades que se pegan sueltas en el editor. |
| `PLAN_MAESTRO.md` | El plan de la reconstrucción y sus nueve decisiones (D1–D9). |
| `ESTADO_PLAN.md` | **Qué del plan ya está hecho y qué falta, medido sobre el código.** El mejor punto de entrada. |
| `BITACORA.md` | Qué se cambió en NEXT, por qué, y con qué trampa se tropezó. |
| `docs/base/` | Documentos de referencia y los 13 PRD que trae la base. |

## Para empezar

```bash
npm install --prefix build --no-save playwright-core   # una vez
node build/verificar.js                                # la batería entera, ~2 min
node build/paquete_migracion.js entrega                # regenerar el paquete
```
