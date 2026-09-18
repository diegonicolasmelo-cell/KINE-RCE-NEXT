# docs/archivo/ — lo que ya no manda

Diego, 18-sep-2026: *«necesito que los PRD y acuerdos tomados anteriormente en
el otro proyecto se olviden y empecemos de cero»*.

Estos cuatro documentos **ya no son la vara**. Están acá porque explican por qué
el código es como es, y borrarlos dejaría el sistema sin memoria de sus propias
decisiones. Pero **nada de lo que dicen obliga**: si un documento de acá y un
acuerdo nuevo se contradicen, **manda el acuerdo nuevo**, sin discusión.

| Documento | Qué era |
|---|---|
| `PLAN_MAESTRO.md` | El plan de la reconstrucción: principios, arquitectura y fases. |
| `ESTADO_PLAN.md` | La medición de cuánto del plan estaba hecho, punto por punto. |
| `PRD_EVOLUCION_TRES_PASOS.md` | El camino de la evolución partido en pasos. |
| `PRD_REVISION_CAMPO_POR_CAMPO.md` | La revisión campo por campo del formulario, con Diego. |

---

## 🔴 Lo que NO se archiva

Hay una diferencia que conviene no perder:

- Un **acuerdo de producto** es una decisión que se puede cambiar: dónde va un
  campo, qué pregunta la pantalla, en qué orden. Eso es lo que se archiva acá.
- Una **cicatriz** es un bug que ya se pagó con horas de depuración. Eso no es
  negociable y no vive en estos documentos: vive en `CLAUDE.md` (las reglas) y
  en `build/checks/` (las guardias, que son la memoria **ejecutable**).

Empezar de cero significa volver a decidir **qué hace** el sistema. No significa
volver a tropezar con lo mismo.

Lo esencial de lo aprendido está destilado en `docs/LO_ESENCIAL.md`, y las
preguntas para cerrar los acuerdos nuevos, en `docs/GUIA_DE_ACUERDOS.md`.
