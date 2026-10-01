# Pendientes — al 1-oct-2026

> Lo que está **decidido** vive en `docs/ACUERDOS_REDISENO.md`, con las palabras
> de Diego. Esto es la otra mitad: lo que **falta hacer** y lo que **falta
> decidir**. Se actualiza a medida que se cierra cada cosa.
>
> 🔴 Nada del rediseño está programado. Sigue vigente «piensa en la lógica, no
> programes nada aún».

---

## 1 · Decidido, falta programarlo

Todo esto está acordado y con mockup. Ninguno está escrito en código.

| | Qué | Dónde se acordó |
|---|---|---|
| 1 | Paso 0 en cuatro bloques: identificación · demográficos · ingreso clínico · llegada | 30-sep |
| 2 | Fecha y **hora** de ingreso obligatorias (es cuándo llegó, no cuándo se anota) | 30-sep |
| 3 | El día de estadía se **calcula**, deja de escribirse | 30-sep |
| 4 | AET al ingreso, y como **serie** de tramos durante la estadía | 30-sep |
| 5 | Fase clínica en tarjeta propia | 30-sep |
| 6 | Disolver la tarjeta «General» | 30-sep |
| 7 | Soporte de ingreso: con qué llegó | 30-sep |
| 8 | Evaluaciones en familias | 30-sep · ampliado 1-oct |
| 9 | Ecografía pulmonar: POCUS (1, 2, PLAPS) y LUS (12 zonas), misma figura | 7.4 y 7.6 |
| 10 | Al pasar de POCUS a LUS, los valores llegan **en ámbar** para confirmar | 7.6 |
| 11 | Pruebas de traqueostomía como bloque propio, con puerta por TQT | 7.1 |
| 12 | BDT sin «no realizado», y el positivo se parte en precoz o tardío | 7.5 |
| 13 | La PVE se pregunta con más de 24 h de VM, en cualquier modalidad | 7.8 |
| 14 | «No corresponde» pide razón, y sale del denominador | 7.8 |
| 15 | Evaluaciones como iconos de celular, con numerito de pendientes | 7.9 |
| 16 | «Obligatorio» en tres niveles: bloquea · vence · opcional | 7.9 |

## 2 · Falta decidir — necesita respuesta de Diego

1. **Nombre del bloque de TQT.** Propuesta: «Pruebas de traqueostomía».
2. **Nombre del botón del POCUS.** Esos tres puntos se llaman protocolo BLUE;
   POCUS abarca también corazón, diafragma y vejiga.
3. **Cómo se desmarca un BDT** puesto por error, ahora que no hay «no
   realizado» que sirva de escape: ¿interruptor que se apaga, o un «borrar»?
4. **Los pacientes que ya están sin fecha de ingreso**: hoy salen con signo de
   interrogación. ¿Se les pide al reabrir, se deja en blanco, o se infiere?
5. ~~PVE obligatoria: ¿cuándo?~~ **RESUELTO 1-oct (acuerdo 7.8):** con más de
   24 h de VM, en cualquier modalidad, controlada incluida.
6. **Deglución presente/ausente: ¿reemplaza o se antepone?** Hoy hay cuatro
   opciones (adecuada · alterada leve · alterada severa · no evaluable).
   Propuesta: presente/ausente primero, y si está presente, la calidad después.
   🪤 Cambiar las opciones es **gratis ahora y caro después**: en NEXT todavía
   no hay datos reales con los que romper la comparación.
7. **¿Dónde viven P0.1, ΔPocc y Pmusc?** Hoy están en Terapia ventilatoria. El
   precedente del test de apnea dice que una evaluación va en Evaluaciones; el
   argumento en contra es que se miran junto a los parámetros, que es donde se
   decide subir o bajar la asistencia.
8. **El diafragma: ¿ecográficas o respiratorias?** Diego lo puso en
   «ecográficas musculares». Clínicamente la FED y la excursión son
   predictores de destete. Es el único que no se deja clasificar.
9. ~~Seis familias, ¿son muchas?~~ **RESUELTO 1-oct (acuerdo 7.9):** quedan
   seis, como iconos de celular con numerito de pendientes.
10. **¿«IQ» era el ICU de FSS-ICU, o el IMS?** Lo dictó en la lista de
    evaluaciones obligatorias.

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

## 4 · Bugs encontrados y NO arreglados

| Bug | Dónde | Qué pasa |
|---|---|---|
| 🔴 **El FEM se narra en la unidad equivocada** | relato del turno | El rótulo dice `L/s` y los cortes del código son de `L/s` (4,5 y 2,7, que son los 270 y 160 L/min clásicos), pero el relato escribe **«L/min»**. Un 3,5 correcto queda escrito como «3,5 L/min», que son 210 L/min. El número está bien y la unidad miente. |
| 🔴 **El BDT admite las dos casillas a la vez** | «Tos y deglución» | Nada impide marcar «BDT +» y «BDT −» juntas. Si pasa, el relato escribe las dos y la planilla guarda el positivo, en silencio. Lo arregla el acuerdo 7.5. |
| ⚪ **Falta el PMI** | — | De los índices de esfuerzo, P0.1, ΔPocc y Pmusc existen; el PMI no. |
| 🔴 **El «no corresponde» de la PVE se guarda sin razón** | paso 2 | `PVE_SC_RAZON` solo se escribe cuando la respuesta es «no». Con «no corresponde» queda vacío, así que no se puede sacar a ese paciente del denominador de los indicadores de destete. |

## 5 · Antes del primer dato real — seguridad

- 🔒 **`AUTH_DEV_MODE` sigue en TRUE.** Hay que correr `accesoSembrarClaves()` y
  después `accesoEncender()`, que se niega si algún kinesiólogo activo quedaría
  sin clave.
- 🔒 **La hoja `KINESIOLOGOS` nace vacía a propósito.** Diego tiene que escribir
  al equipo ahí para que puedan firmar.
