# Pendientes — al 2-oct-2026 (con el horario corregido)

> Lo que está **decidido** vive en `docs/ACUERDOS_REDISENO.md`, con las palabras
> de Diego. Esto es la otra mitad: lo que **falta probar**, lo que **falta
> decidir** y lo que **se encontró y no se arregló**.
>
> 🟢 **El rediseño del 30-sep y 1-oct está programado** (tandas A a G, 207
> guardias en verde). Lo que no existe todavía es **la prueba en la planilla
> de NEXT**: nada de esto se ha pegado ni visto en un navegador del hospital.

---

## 1 · Programado — falta probarlo con Diego en la planilla de NEXT

| | Qué | Acuerdo |
|---|---|---|
| 1 | Paso 0 en cuatro bloques: identificación · demográficos · ingreso clínico · llegada | 8.1 |
| 2 | Fecha y **hora** de llegada obligatorias | 8.1 |
| 3 | El día de estadía **se calcula** y se lee en el banner; deja de ser casilla | 8.4 |
| 4 | Adecuación (AET) con cinco grupos al ingreso, y como **serie de tramos** en el turno | 8.3 |
| 5 | Fase clínica en tarjeta propia | 8.4 |
| 6 | La tarjeta «General» se disolvió | 8.4 |
| 7 | Soporte de ingreso: con qué llegó | 8.2 |
| 8 | Evaluaciones en familias, ahora **seis** con «Preingreso» | 7.9 · 8.4 |
| 9 | Ecografía pulmonar: POCUS (1, 2, PLAPS) y LUS (12 zonas), misma figura | 7.4 · 7.6 |
| 10 | Al pasar de POCUS a LUS, los valores llegan **en ámbar** para confirmar | 7.6 |
| 11 | Pruebas de traqueostomía como bloque propio, con puerta por TQT | 7.1 |
| 12 | BDT sin «no realizado»; el positivo se parte en precoz o tardío | 7.5 |
| 13 | La PVE se pregunta con más de 24 h de VM, en cualquier modalidad | 7.8 |
| 14 | «No corresponde» pide razón; «Otra» exige el detalle | 7.8 |
| 15 | Evaluaciones como iconos de celular, con numerito de pendientes | 7.9 |
| 16 | «Obligatorio» en tres niveles: bloquea · vence · opcional | 7.9 |
| 17 | P0.1, ΔPocc y Pmusc se mudaron a Evaluaciones | 7.10 |
| 18 | El relato narra los índices de esfuerzo, la tos en L/s y el BDT | 7.10 |

## 2 · Falta decidir — necesita respuesta de Diego

Cosas que **resolví yo con una propuesta** para poder avanzar. Todas se cambian
fácil; las dejo anotadas para que las confirme o las corrija.

1. **«Pruebas de traqueostomía»** como nombre del bloque de TQT.
2. **«POCUS»** como nombre del botón, aunque los tres puntos son el protocolo
   BLUE y POCUS abarca más (corazón, diafragma, vejiga).
3. **Desmarcar un BDT por error:** quedó como interruptor, tocar el mismo botón
   otra vez lo apaga.
4. **Deglución:** «presente / ausente» va **primero** y la calidad después. No
   reemplaza las cuatro opciones de antes.
5. **«Obligatorio» vence a los 3 días** (MRC y FSS pasan a rojo si el paciente
   coopera y no se miden). Un paciente que nunca se midió vence desde el
   segundo día de estadía.
6. **La adecuación del turno vive dentro de la tarjeta «Fase clínica»**, debajo
   de las fases. Si prefiere tarjeta propia, es mover un bloque.
7. **Números romanos o arábigos.** Las pantallas nuevas dicen **1, 2, 3A, 3B,
   3C** (como lo dictó), pero el banner, el relato y la planilla siguen con
   **I, II, IIIA, IIIB, IIIC**. Hay que elegir uno para todo.
8. **¿«IQ» era el ICU de FSS-ICU, o el IMS?** Lo dictó en la lista de
   evaluaciones obligatorias. Sigue sin responderse.
9. **Pacientes que ya están sin fecha de ingreso:** hoy salen con signo de
   interrogación. ¿Se les pide al reabrir, se deja en blanco, o se infiere?
10. **PVE con traqueostomía + VM:** hoy no se pregunta (con tubo sí, siempre).
    Es una decisión de diseño que nunca se tomó.
11. **¿Se renombran `VENT_P01`, `VENT_DPOCC` y `VENT_PMUSC` a `EVAL_T_*`?** No
    se tocó. Gratis ahora, caro cuando haya datos reales.
12. ~~El «Previo a la UCI» de noche~~ **RESUELTO 2-oct (acuerdo 8.6):** las
    evaluaciones se hacen de noche igual que de día, incluido el Previo a la
    UCI. Apagarlas fue un error mío y se deshizo.
13. ~~El P0.1 se pierde de noche~~ **RESUELTO 2-oct:** las evaluaciones se hacen
    de noche, así que el P0.1 también.
14. **El IMS vive dentro de la tarjeta de KTM** (paso 4) pero cuenta como
    evaluación funcional. Hoy el chip de Evaluaciones te lleva hasta él; si se
    prefiere, se muda a Evaluaciones → Funcionales. No lo toqué.
15. **Las estadísticas de KTM que mezclen turnos** deben mirar que de noche ahora
    puede haber sesiones (antes eran cero por definición). Las que se hagan de
    noche entran al REM y a las atenciones.
16. **La válvula de fonación de noche** ahora se puede llenar y suma sus horas
    para la decanulación (12 h por turno con válvula). ¿Es lo que quieres?

## 3 · Pendientes viejos, de antes del rediseño

- Sacarle el **estado previo a la TQT** — Diego dijo que ahí es irrelevante.
- ¿La **extubación y la decanulación** deben anular «Terapia ventilatoria»,
  como ya hacen la intubación, la reintubación y la TQT?
- ¿**Unificar la forma de la TQT** con la de los otros módulos de vía aérea?
- ¿La **PVE debe exigirse tras intubar**?
- El «Sin sedación**..**», con doble punto.
- Los **tiempos de sesión** (KTM 30 min, válvula 30 min, IMT 10 min): ¿nacen en
  blanco también, como el resto? No son mediciones en el paciente, pero sí se
  informan.

## 4 · Encontrados y NO arreglados

| Bug | Dónde | Qué pasa |
|---|---|---|
| 🔴 **`_evalHoy` mira la fecha en UTC** | al reabrir un turno guardado (`index.html`) | Usa `new Date().toISOString()`, que es UTC. Chile va 3 o 4 horas atrás: pasadas las 20 o 21 h, «hoy» ya es mañana para esa línea, y reabrir un turno de día **no repone sus evaluaciones**. Hay que compararla con la fecha del turno, no con el reloj. |
| 🟠 **`_camaPanel` está definida dos veces** | `index.html` | Las dos hacen lo mismo hoy; si una cambia, gana la de más abajo sin avisar. |
| 🟠 **El P0.1 no entra en la «evaluación intermedia» ni en el REM** | informes | Se guarda y se narra, pero los conteos de evaluaciones no lo miran. |

Los que figuraban aquí el 1-oct —el FEM narrado en L/min, el BDT con las dos
casillas, los índices de esfuerzo sin relato, el «no corresponde» sin razón—
**ya están arreglados** (tandas A a C y B).

🗑️ **«Falta el PMI» no era un bug:** era el **P0.1** mal transcrito de la voz.
No se creó ningún campo y no falta ninguno.

## 5 · Antes del primer dato real — seguridad

- 🔒 **`AUTH_DEV_MODE` sigue en TRUE.** Hay que correr `accesoSembrarClaves()` y
  después `accesoEncender()`, que se niega si algún kinesiólogo activo quedaría
  sin clave.
- 🔒 **La hoja `KINESIOLOGOS` nace vacía a propósito.** Diego tiene que escribir
  al equipo ahí para que puedan firmar.

## 5b · Lo que se encontró y se arregló el 2-oct

- 🔴 **Los obligatorios de otro paso no bloqueaban el guardado** (PVE, razón de
  KTM no realizada, contraindicación, fundamento de «Otro»). Medido y arreglado
  (acuerdo 8.6). **La PVE obligatoria no bloqueaba en el flujo real hasta hoy.**
- El chip «IMS» de Evaluaciones nunca llevaba a su control. Arreglado.

## 6 · Al pegar el paquete

- 🔴 **Hay que correr `crearORepararEstructura()`**: la evolución pasó de 411 a
  **414 columnas**, y la cama y el archivo ganan una columna (`AET_SERIE`).
- El cohete lleva el sello de versión nuevo (`NEXT-5.3-seis-pasos`); si no
  aparece en «Cargando…», lo pegado no es lo nuevo.
- 🕗 **Esa misma corrida corrige el horario de turno** en CONFIG: si
  `TURNO_DIA_INICIO` y `TURNO_NOCHE_INICIO` dicen 9 y 21, pasan a 8 y 20, una
  sola vez. Si pusiste otro horario, no lo toca. Se puede revisar a mano en la
  hoja CONFIG.
