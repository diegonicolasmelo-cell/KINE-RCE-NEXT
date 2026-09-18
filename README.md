# KINE-RCE-NEXT

Nueva generación del Registro Clínico Electrónico de Kinesiología UCI.
Hospital San Pablo de Coquimbo.

## Qué es este repositorio

La nueva generación de RCE-KINE, desarrollada y probada **aparte** de la
aplicación que usa el equipo.

🗂️ **18-sep-2026 · Los PRD y planes anteriores están archivados** en
`docs/archivo/` por decisión de Diego, para cerrar los acuerdos desde cero. Lo
esencial de lo aprendido está en `docs/LO_ESENCIAL.md`; las preguntas abiertas,
en `docs/GUIA_DE_ACUERDOS.md`.

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
| `build/checks/` | La batería: 179 guardias, cada una nacida de un error que costó caro. |
| `build/` | El empaquetador, el corredor de la batería y los bancos de medición. |
| `herramientas/` | Diagnóstico y utilidades que se pegan sueltas en el editor. |
| `docs/LO_ESENCIAL.md` | **Lo que se sabe antes de empezar: el terreno, las decisiones clínicas de Diego y las trampas pagadas.** El mejor punto de entrada. |
| `docs/GUIA_DE_ACUERDOS.md` | Las preguntas abiertas, las que cambian lo que se construye. |
| `BITACORA.md` | Qué se cambió en NEXT, por qué, y con qué trampa se tropezó. |
| `docs/archivo/` | Los planes y PRD que **ya no mandan**. Se guardan por su porqué, no por su autoridad. |
| `docs/base/` | Documentos de referencia y los 13 PRD que trae la base. |

## Para empezar

```bash
npm install --prefix build --no-save playwright-core   # una vez
node build/verificar.js                                # la batería entera, ~2 min
node build/paquete_migracion.js entrega                # regenerar el paquete
```
