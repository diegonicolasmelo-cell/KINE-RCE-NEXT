# Pendientes — al 10-oct-2026 (con la tanda 3 del turno respiratorio)

> Lo que está **decidido** vive en `docs/ACUERDOS_REDISENO.md`, con las palabras
> de Diego. Esto es la otra mitad: lo que **falta probar**, lo que **falta
> decidir** y lo que **se encontró y no se arregló**.
>
> 🟢 **El rediseño del 30-sep y 1-oct está programado** (tandas A a G), y la **tanda 1
> (integridad), la tanda 2 (guardado seguro) y la tanda 3 (turno respiratorio,
> cambios 1 a 5)** también: hoy son **230 guardias en verde**. Lo que no existe
> todavía es **la prueba en la planilla de NEXT**: nada de esto se ha pegado ni
> visto en un navegador del hospital.
>
> 🔴 **Lo más urgente ahora es la sección 2c**: la tanda 2 dejó varias decisiones
> ya implementadas con la opción recomendada, esperando tu confirmación, y una
> prueba con dos aparatos que hay que hacer **antes** de pegar.
>
> 🟠 **La sección 2d es de la tanda 3**: cinco decisiones ya implementadas (✅) y
> nueve por decidir. Los cambios 6 y 7 de esa tanda (cascarones vacíos de
> Traqueostomía y Decanulación; plegar el Turno en escritorio) esperan tus
> respuestas a las 7, 8 y 12.

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
14. ~~El IMS vivía dentro de la tarjeta de KTM~~ **RESUELTO 2-oct (acuerdo 8.7):**
    pasó a Evaluaciones → Funcionales, así se mide de noche sin declarar una KTM.
15. **Las estadísticas de KTM que mezclen turnos** deben mirar que de noche ahora
    puede haber sesiones (antes eran cero por definición). Las que se hagan de
    noche entran al REM y a las atenciones.
16. **La válvula de fonación de noche** ahora se puede llenar y suma sus horas
    para la decanulación (12 h por turno con válvula). ¿Es lo que quieres?

## 2b · Decisiones nuevas, de la tanda 1 de integridad (4-oct)

1. **Turno pasado de un paciente egresado cuya cama ya ocupa otro:** hoy el servidor lo rechaza. ¿Se deja así, se ofrece una
   vista de solo lectura, o se diseña una corrección aparte con firma que nombre el episodio?
2. **Estadísticas con MRC/FSS/CPAx de valor 0:** el egreso ahora los archiva, pero `obtenerStats` los excluye de promedios y de
   «evaluados» (`> 0`). ¿Se alinean?
3. **KTR vacío frente a cero** en el CSV y la tabla del registro diario (`regCSV`): hoy exportan 0 donde nadie anotó. ¿Cambia?
4. **El relato omite PEEP 0, AutoPEEP 0 y PS 0** (usa `> 0`), y ΔP y compliance se calculan con PEEP vacío como si fuera 0.
5. **Sesión de Coordinación:** ¿desactivar a alguien en KINESIOLOGOS debe cortarle también esa sesión? Hoy corta solo el cambio de clave.
6. **Prefijo del caché de la app instalada:** `rce-armazon-` es compartido con RCE-KINE si ambos viven en el mismo origen.
   ¿Se le da a NEXT un prefijo propio (`rce-next-armazon-`)?
7. **Qué conserva la pantalla cuando se corta la sesión** (política de borradores) y si reintenta sola ante un tropiezo de la planilla.

## 2c · Decisiones de la tanda 2 (guardado seguro, 10-oct)

> 🟢 **Varias YA ESTÁN HECHAS con la opción que recomiendo** y esperan que las confirmes o las cambies. Las que más se notan:
> los **textos y tiempos de «No confirmado»** (la 8 y la 9), la **memoria de 6 horas** (la 1), los **días de VM, VNI y vía aérea que
> se conservan al volver a guardar el mismo turno** (la 5) y los **números internos nuevos** de la planilla (la 2). Las marco con ✅.
> Si dices que no, se cambian; ninguna toca el esquema de la planilla.
>
> 🔴 **Antes de pegar nada en la planilla de NEXT hace falta una prueba práctica con DOS aparatos** (la 12): todo lo de esta tanda se
> probó con un servidor simulado en un navegador de laboratorio, no en el Chrome del hospital ni contra el Apps Script real.
>
> ⚙️ **El «modo estricto» (`CONTRATO_ESTRICTO`) nace APAGADO** (la 3). Mientras esté apagado, una pantalla vieja puede seguir
> escribiendo sobre el paciente equivocado; se enciende recién después de la prueba con dos aparatos.
>
> ✍️ **Ninguna está escrita todavía en `docs/ACUERDOS_REDISENO.md`**: se escriben con tus palabras cuando respondas. Dilas por
> número.

**A · Las 12 del diseño**

1. **La memoria de 6 horas.** ✅ Para que un doble clic o un reintento no repita algo que ya se hizo, el servidor recuerda 6 horas
   —en la memoria temporal del propio proyecto de Apps Script, no en la planilla ni fuera de Google— que esa operación ya se hizo.
   Solo guarda números de cama, de paciente y de registro; jamás nombres, RUT ni texto escrito (una guardia lo comprueba con un
   paciente inventado). *Ejemplo:* aprietas «Guardar», se corta el wifi, vuelves a apretar: el sistema contesta «ya estaba» y no escribe
   otra evolución. Si esa memoria falla **y además** se perdió la respuesta, la entrega de turno, el stock y los ventiladores pueden
   duplicarse una vez. *Recomendado: sí.*
2. **Números internos nuevos.** ✅ Los registros nuevos (procedimientos, hitos de la línea de tiempo, mediciones, pendientes,
   sugerencias y los **egresos**) llevan un número interno armado a partir del de la operación, no uno al azar. *Lo que ves:* si abres
   la hoja, esos números son más largos y el del egreso es `ARCH_` más el código del paciente (ya no lleva la hora). Nada los lee ni los
   ordena, salvo la búsqueda de Coordinación. Es lo que impide que una caída a medias deje un egreso o un procedimiento repetido.
   *Recomendado: sí.* (La alternativa es dejarlos al azar y aceptar esos repetidos.)
3. **Modo estricto: cuándo encenderlo.** ⚙️ Encendido, una pantalla vieja (que no avisa a qué paciente le abrió la ventana) se
   rechaza con «esta pantalla es de una versión anterior, recárgala». Apagado, esa pantalla pasa y puede actuar sobre el paciente
   equivocado. Se enciende escribiendo `TRUE` en `CONTRATO_ESTRICTO` de la hoja CONFIG de la planilla de NEXT (no hay función nueva).
   ¿Cuándo, y quién confirma que todos los aparatos ya tienen la versión nueva? *Recomendado: apagado hasta la prueba con dos aparatos,
   y encenderlo recién después.*
4. **Ingreso perdido porque otra persona ocupó la cama.** ✅ Si dos personas ingresan a la misma cama libre, la segunda ve un aviso
   rojo, no pierde nada de lo que escribió y solo puede «Seguir editando». ¿Quieres además un botón «usar estos datos en otra cama»?
   Hoy, para pasarlo a otra cama tiene que ingresar de nuevo a mano. *Recomendado: no en esta tanda* (hay que elegir cama: es un
   diseño de uso aparte).
5. **Volver a guardar el mismo turno: los días de VM, VNI y vía aérea.** ✅ **Cambia un valor clínico.** Si vuelves a guardar un turno
   sin cambiar el soporte ni la vía aérea (o si un guardado se cortó y se repite), los días quedan como estaban en el primer guardado.
   *Ejemplo:* un paciente pasa de VM a VNI y de tubo a natural en la noche; el primer guardado cuenta 3 días de VM, 0 de VNI y 3 de vía
   aérea. Con el cálculo de antes, al volver a guardar bajaban a 1, 0 y 1, y el turno siguiente partía de ese 1: el error se arrastraba
   al resto de la estadía y al REM. Ahora se quedan en 3, 0 y 3, y el turno siguiente da 3, 1 y 3. *Costo:* en el turno de INGRESO de
   alguien que llega con vía aérea de afuera (por ejemplo una traqueostomía de 5 días), el primer guardado cuenta 0 días de vía aérea y
   volver a guardar ya no lo «corrige» a 5 (antes lo hacía por accidente); el turno siguiente sí da 5. Y el aviso «cambió la vía aérea
   sin evento declarado», con la razón que escribiste, ahora se conserva al volver a guardar (antes se borraba en silencio), salvo que
   en ese mismo guardado declares el evento: entonces se apaga. *Recomendado: sí; lo ideal es que lo apruebe Manuel, que tocó esos
   contadores.* Si dices que no, se quita la regla, pero un guardado cortado y repetido puede entonces dar otros días.
6. **Corregir el turno pasado de un paciente ya egresado cuando su cama la ocupa otro.** Sigue siendo NO (es la 1 de la sección 2b).
   Antes de esta tanda, anular un evento en ese caso reinsertaba la fila y volvía a ocupar la cama; ahora el sistema responde «Ese turno
   ya está archivado…» y no toca nada. Si algún día es sí, hace falta una operación aparte que nombre al paciente. *Recomendado: dejarlo.*
7. **Puertas que quizá ya no se usan** (limpiar cama, confirmar dispositivos, agregar hito, ingresar paciente por la vía directa).
   La pantalla de hoy no las llama; el servidor las mantiene y ya llevan la misma comprobación de paciente. De paso, «agregar hito» ya no
   deja que quien llama elija el autor ni el número. ¿Se retiran del servidor? *Recomendado: no en esta tanda; se decide después.*
8. **Tiempos.** ✅ Después de **45 segundos** sin respuesta aparece «No confirmado»; el sistema reintenta solo a los **3, 10 y 30
   segundos** con exactamente lo mismo que ella escribió, y después solo a mano con «Reintentar ahora». Se ajustan en un solo lugar del
   código (`GUARDADO_ESPERA_MS` y `GUARDADO_REINTENTOS_MS`). Con una red lenta de verdad, 45 s puede ser mucho o poco: conviene verlo
   en la prueba. *Recomendado: sí.*
9. **Colores y textos.** ✅ Ámbar: «No confirmado · No sabemos si se guardó. Tu texto sigue aquí.» con «Reintentar ahora» y «Seguir
   editando»; «Guardado con aviso» cuando el servidor guardó pero algo quedó pendiente; rojo «NO se guardó» **solo** cuando el servidor
   contestó que no. Reemplaza al «NO se guardó» que antes salía a los 3 s sin respuesta y afirmaba algo que no se sabía. *Recomendado: sí.*
10. **Bitácora de auditoría: ¿registrar cada repetición evitada?** Una fila corta `<ACCIÓN>_REPETIDA` cada vez que la memoria de 6
    horas evita repetir algo, para medir cuánto ayuda. **Esta NO está hecha**: hoy una repetición no deja rastro. Lo que sí está es la
    marca `[sin episodio]` en la bitácora cuando una pantalla vieja llama sin avisar el paciente (salvo al guardar la evolución), que
    sirve para decidir cuándo encender el modo estricto. *Recomendado: sí.*
11. **Ampliar `auditoriaIntegridad`** con lecturas puras (egresos duplicados, camas con paciente y a la vez fila de archivo). No se
    incluyó porque no se pidió. *Recomendado: tanda aparte.*
12. **Prueba práctica con dos aparatos, antes de pegar en NEXT y antes de encender el modo estricto.** Casos: dos personas ingresan a la
    misma cama a la vez; dar un alta con un formulario viejo abierto; guardar con el celular en modo avión y volver la señal; doble toque
    en Guardar; anular un evento después de un alta; el ➕ sobre un paciente ya egresado, que debe seguir pidiendo la clave de coordinación;
    corregir una ficha desde Coordinación. ¿Quién la hace y cuándo?

**B · Nuevas, que salieron al construir**

13. **Textos de rechazo nuevos que va a leer el equipo.** ✅ (a) Limpiar o mover una cama que ya ocupa otro paciente: «La cama N ya fue
    ocupada por otro paciente mientras elegías el traslado, así que no se movió a nadie…» (y su equivalente al limpiar). (b) Pantalla vieja
    con el modo estricto encendido: «Esta pantalla es de una versión anterior… Recárgala». (c) Cerrar un pendiente de un paciente que ya
    no está en esa cama: antes «ese pendiente ya no está en la cama», ahora dice que la cama cambió de paciente y que la reabras para
    ver cómo está. (d) «Desde que abriste **esta ventana**…» en vez de «este formulario», para diálogos y formularios por igual. (e)
    Ingresar de nuevo a un paciente que ya egresó: se reutiliza el aviso de «la cama ya fue ocupada por otro paciente mientras llenabas
    este ingreso», que aquí no es exacto (quizá la cama está libre) pero lleva a la misma acción: cerrar y mirar la cama. (f) Un paciente
    que ya figura en OTRA cama ocupada: «Este paciente ya figura en otra cama ocupada, así que no se guardó nada. Revisa el censo…». Casi
    imposible, pero es un texto que verías. *Recomendado: sí; si alguno no te gusta, es una línea.*
14. **El aviso rojo de 8 segundos.** ✅ Cuando el servidor frena una acción porque la cama cambió de paciente o porque otra persona se
    adelantó (alta, mover, anular, pendientes, escalas, gases y también guardar la evolución), el aviso sale rojo claro y dura 8 segundos,
    en vez del aviso gris de 3. Es un cambio de costumbre para el equipo. ¿Te sirve así o prefieres un cuadro en el centro como el de «NO se
    guardó»? *Recomendado: dejarlo así.*
15. **Episodios cargados a mano, sin ingreso formal (sin código de paciente).** Si el servidor se cae justo antes de recordar el alta,
    el reintento contesta «la cama ya está libre» aunque el alta quedó bien registrada: no pierde ni duplica nada. Además, en el primer
    guardado de uno de esos episodios, un reintento anterior al cierre puede inventar otro identificador. ¿Se acepta, o se les da una
    identidad estable al primer guardado? *Recomendado: aceptarlo mientras sean raros.*
16. **La traqueostomía no se puede anular desde la pantalla.** (Ya era así antes de la tanda.) La pantalla ofrece «Anular» para la
    traqueostomía y el servidor responde «Tipo de evento desconocido». ¿Se agrega la anulación de la TQT, o se saca el botón? *Recomendado:
    que lo decidas tú; si la pantalla lo ofrece, lo coherente es que funcione.*
17. **Qué acciones recuerdan «ya lo hice».** ✅ 26 de las 36 acciones que escriben. Las otras 10 (informe del REM, plantillas,
    importación de PDF de gases, descartar un gas, banner, asignación de turno, fase, estado de una sugerencia y la corrección de
    Coordinación) se pueden repetir sin daño. *Lo que ves:* si guardas una plantilla y se pierde la respuesta, puede quedar repetida (se
    ve y se retira). *Recomendado: dejarlo así.* Sellarlas todas cuesta una espera más por llamada.
18. **Modo estricto y Coordinación.** Con el modo encendido, corregir una ficha desde Coordinación nombrando solo la cama (sin el
    paciente) se rechaza si la cama tiene a alguien. La pantalla de hoy nunca lo hace (siempre manda el paciente de la ficha), así que no
    cambia nada visible. *Recomendado: confirmarlo en la prueba de la 12.*
19. **«Borrar un anexo» cuando su hito ya no está.** Si una pantalla vieja (sin número de operación) pide borrar un anexo cuyo aviso en la
    línea de tiempo ya no existe, hoy se rechaza y se pide reportarlo; con la pantalla nueva, el mismo caso continúa y borra la fila. ¿La
    pantalla vieja también debe continuar? Borraría una fila que el REM cuenta sin poder confirmar que era una anulación a medias.
    *Recomendado: dejarlo como está.*

**C · Nuevas, que salieron de la revisión independiente**

20. **Una medición con el identificador de otro paciente se RECHAZA.** ✅ Si una medición llega con el identificador de otro paciente, o
    pide anular la medición de otro, el sistema ahora se detiene con un aviso en vez de ignorarlo o corregirlo en silencio. La pantalla de
    hoy nunca lo manda. *Recomendado: rechazar* (lo más conservador para datos clínicos).
21. **Alta de un paciente que ya figura en el archivo de una estadía anterior.** ✅ Si la cama volvió a ocuparse con un paciente cuyo
    egreso anterior ya está en el archivo, el alta se **bloquea**: «La cama N tiene a un paciente que ya figura dado de alta en el archivo,
    de una estadía anterior. No se dio el alta para no pisar ese registro. Avisa a coordinación para revisarlo.» La alternativa es
    escribir un segundo egreso (`ARCH_<paciente>_2`), pero eso cambia cómo cuenta el REM. *Recomendado: bloquear.*
22. **Cada ingreso hace dos consultas más a la planilla.** ✅ Para saber si el paciente ya egresó antes y que no esté en otra cama, un
    ingreso hecho por la pantalla pasa de 13 a **15** viajes a la planilla (una sola vez por estadía). La batería mide un ingreso sin
    identificador propio y no ve esos dos viajes; su techo es 14. *Recomendado: aceptarlo;* si prefieres no pagarlo, se puede dejar solo la
    consulta al archivo y quitar la del hito de egreso.
23. **El aviso ámbar «No sabemos si se hizo…» es el mismo para todas las escrituras.** ✅ «No sabemos si se hizo. Revisa la cama; si no está
    hecho, vuelve a intentarlo: es seguro repetirlo.» Sale en alta, mover, anexar, entrega de turno, stock y ventiladores, donde «la cama»
    no aplica del todo. *Recomendado: dejarlo; un texto por tipo de acción es un cambio de una línea.*
24. **Un movimiento de stock idéntico no se puede forzar.** ✅ Si repites un movimiento de stock exactamente igual (mismo ítem, cantidad,
    detalle y fecha) y el primero no tuvo respuesta, aparece «Ya estaba registrado… Revisa el stock.» y no se repite; para forzarlo hay
    que cambiar el detalle. La alternativa, acortar la memoria de ese número a 10–15 minutos, permitiría repetirlo pero duplicaría el stock
    si el primero sí había llegado. *Recomendado: dejarlo.*
25. **Un error interno del servidor, repetido, sale ámbar y no rojo.** ✅ Si el servidor tuviera un error fijo (un fallo de programación),
    verías «No confirmado» con «Reintentar ahora» en vez de «NO se guardó». Es lo honesto: ese error puede venir después de escrituras
    parciales. El detalle técnico va a la consola del navegador, no a la pantalla. *Recomendado: sí.*
26. **El borrador se escribe antes de la llamada.** ✅ Se guarda en el aparato al apretar «Guardar» (antes, solo al fallar) y se borra al
    confirmarse. *Lo que ves:* si cierras la pestaña a mitad de un guardado que sí llegó, al reabrir esa cama y turno puede ofrecerte
    «Borrador sin guardar recuperado»; volver a guardar es inocuo (mismo contenido). *Recomendado: sí.*
27. **«Guardado con aviso» y cerrar el panel.** Hoy el turno sigue avanzando solo al paso 6 con «Cerrar la evolución», y cerrar el panel no
    pregunta aunque haya una medición a medias; solo se muestra la instrucción en la franja. ¿Prefieres que cerrar pregunte, o que no
    avance al paso 6 mientras haya avisos? *Recomendado: dejarlo.*
28. **El celular con la barra en tres filas.** Con «Sin guardar» y la franja del estado, la barra de abajo ocupa tres filas. La
    alternativa es esconder «Sin guardar» mientras el estado no sea verde, pero cambiaría lo que se decidió en la tanda 1. *Recomendado:
    dejarlo.*
29. **Las demás acciones no tienen tope de espera.** 🟠 Guardar la evolución pasa a «No confirmado» a los 45 s. Pero el alta, el
    traslado, el intercambio y el resto muestran «Cargando…» y, si el servidor no contesta nunca, ese cartel queda tapando la pantalla
    más de 10 minutos (medido con un servidor simulado colgado) sin decir nada. *Recomendado: sí, en una tanda aparte:* ponerles un tope
    parecido y un «Reintentar» con el mismo número de operación.
30. **Un aparato que se cayó y volvió.** 🟠 La pantalla ya no reintenta sola una foto vieja tras cerrar y reabrir. Pero si un aparato se
    cayó con un guardado a medias y vuelve más tarde, su reintento viejo podría pisar lo que otra persona escribió después (el servidor
    no ordena versiones: gana la última en llegar). *Recomendado: tanda aparte,* con un rechazo en el servidor.
31. **Un clic justo en el repintado.** 🟠 El censo se refresca solo cada cierto rato. Si la actualización automática del censo cambió al paciente de una cama y el tablero aún no
    se repinta (cerca de un segundo), un clic en esa ventana toma al paciente nuevo mientras la pantalla muestra al anterior. La misma
    ventana existía al abrir el panel. *Recomendado: tanda aparte* (se cierra llevando el paciente en la tarjeta misma).

## 2d · Decisiones de la tanda 3 (turno respiratorio, 10-oct)

> 🟢 **Las ✅ de la parte A (de la 1 a la 5) YA ESTÁN HECHAS con la opción que recomiendo** y esperan que las confirmes o las cambies. Si dices que
> no, cada una se revierte con una línea; ninguna toca el esquema de la planilla ni lo que se guarda.
>
> 🟠 **Los cambios 6 y 7 del plan de la tanda 3 NO se hicieron**, a propósito: dependen de las decisiones 7, 8 y 12 de abajo. El 6 quita
> los cascarones vacíos de Traqueostomía y Decanulación; el 7 pliega por defecto el Turno en escritorio. Con tus respuestas se hacen.
>
> ✍️ **Ninguna está escrita todavía en `docs/ACUERDOS_REDISENO.md`**: se escriben con tus palabras cuando respondas. Dilas por número.

**A · Ya implementadas, esperan confirmación**

1. **El aviso «Falta:» nombra la hemodinamia y la razón de «PVE superada sin extubar».** ✅ Hasta ahora la línea de arriba decía solo
   «firma y vía aérea», pero al guardar el sistema también te frena si falta la hemodinamia (lo pediste el 20-sep: «como la firma») o la
   razón de no extubar. *Lo que ves:* una evolución en blanco dice «Falta: firma y hemodinamia y vía aérea»; si la hemodinamia ya está
   puesta (lo común, porque se copia del turno anterior) no cambia nada. *Recomendado: sí.* Si dices que no, se revierte una línea y dos frases
   de una guardia, pero entonces el bloque de Hemodinamia no podría decir «Requiere revisión» de forma honesta.
2. **Tres palabras de estado en cada tarjeta del turno.** ✅ «Sin registrar» (gris), «Registrado» (verde) y «Requiere revisión» (rojo), en
   escritorio y celular, calculadas de los datos; «Requiere revisión» es **solo** un obligatorio pendiente (la misma lista del aviso
   «Falta:»). Por ahora solo en el paso Turno: cada paso las recibe cuando le toque su tanda, para no mezclar dos vocabularios.
   *Recomendado: sí.*
3. **«Extubación» ahora lleva a la PVE.** ✅ Antes el botón declaraba el evento y no movía la pantalla (apuntaba a un bloque que ya no existe);
   ahora la desliza al bloque «Extubación / PVE» y lo contornea de azul 2,5 s, igual que los otros cuatro eventos. *Recomendado: dejarlo.* Si
   no lo quieres, se revierte esa sola palabra.
4. **Orden de la frase del encabezado:** «palabra · lo que falta · resumen». ✅ Se puso así porque el resumen se corta con puntos suspensivos y
   al final se perdía justo lo accionable. La alternativa es «resumen — falta X» como antes. *Recomendado: dejarlo.*
5. **El aviso «Falta:» se actualiza también al tocar botones.** ✅ Antes quedaba viejo hasta el siguiente tecleo (respondías la PVE y seguía
   diciendo que faltaba). Es un cambio de comportamiento menor y visible. *Recomendado: dejarlo.*
6. **Comas en vez de « y » cuando faltan tres o más cosas.** (No hecha.) Hoy lee «firma y hemodinamia y vía aérea»; con comas sería «firma, hemodinamia y vía
   aérea». Es una línea, pero cambia frases que otras guardias fijan, así que va en un paso aparte con ellas. *Recomendado: comas, sin
   apuro (es de lectura, no de seguridad).*

**B · Falta decidir (no están hechas)**

7. **Lo heredado del turno anterior, ¿«Requiere revisión»?** Hoy lo que se copia del turno anterior (sedación, parámetros, hemodinamia, KTR)
   cuenta como «Registrado» aunque nadie lo haya mirado, y el marcado en ámbar de lo heredado no funciona en el flujo por pasos (es la
   sección 4b). Incluye lo que nace puesto: «Sin sedación» ya viene elegida y Sedación nace «Registrado». *Recomendado: sí, pero como palabra
   y color ámbar en el encabezado del bloque («Requiere revisión: heredado del turno anterior»), NO como aviso nuevo al guardar, para que no
   aparezca un cartel en cada guardado; el sistema solo marca, nunca decide por ti.* **Debe resolverse antes de la 8**, porque plegar lo
   «Registrado» sin esto esconde justo lo que nadie confirmó.
8. **¿Que algunas tarjetas del turno partan plegadas en escritorio?** Hoy las 6 están abiertas a la vez. Ojo con tu diagnóstico del 7.9: «lo
   que no se ve, no se llena». *Recomendado: sí, con una regla corta que puedas explicar:* parten abiertas las que NO están registradas o
   requieren revisión, y siempre abiertas Fase clínica y Respiratorio; se pliegan solo las que ya tienen su dato confirmado. Solo tarjetas, no
   sub-bloques, en esta primera vuelta. Si prefieres todo abierto, el cambio 7 se descarta.
9. **La KTR (sesiones de kinesiterapia respiratoria), ¿nace en blanco y no se copia del turno anterior?** Hoy nace en 0 sin opción en blanco y se
   copia, así que no se distingue «no lo anoté» de «hice 0 sesiones» y puede contar atenciones que nadie hizo en este turno. Mientras tanto,
   «Manejo respiratorio» puede decir «Sin registrar» con la KTR en 0. *Recomendado: sí* (las sesiones son un acto de ese turno, no un estado que
   arrastra; la regla «un 0 se guarda como 0 y vacío no es 0» lo pide). Toca el dato de las atenciones y el REM, y está unida a la 3 de la
   sección 2b (el CSV exporta 0 donde nadie anotó). No cambia su lugar ni su nombre.
10. **PVE con traqueostomía + ventilación mecánica** (es la 10 de la sección 2, ahora con una consecuencia nueva): con tubo la PVE se pregunta
    siempre; con TQT + VM, nunca, así que el estado del bloque jamás puede decir «Sin registrar» para ella. *Recomendado: decidir después de esta
    tanda y antes de la tanda de Evaluaciones,* para no cambiar dos veces el significado del bloque.
11. **Textos fijos del paso.** Quedan pocos: «Si hoy no pasó nada con la vía aérea, no toques nada», y en Procedimientos «Se registran solos con
    la evolución» y «Eventos del turno (no derivables)» (jerga). ¿Se quitan, se reescriben o van a una ayuda que se abre al tocar?
    *Recomendado: no inventar un botón de ayuda todavía* (en el celular no existe el «pasar el mouse» y no pediste más botones); mantener la
    frase de la vía aérea (evita declarar eventos por reflejo) y reescribir «no derivables» como «Eventos que marcas tú». La ayuda bajo demanda
    sería un diseño aparte, con opciones antes de tocar código.
12. **Traqueostomía al ingresar con tubo (H3, confirmado en pantalla a 1200 y 390 px).** Al ingresar un paciente con TOT la fila «¿Qué pasó hoy
    con la vía aérea?» está oculta (por diseño: «al ingresar no hay "venía con"») y el bloque «Traqueostomía» muestra solo su título, sin ningún
    control. Elegir «TQT» como vía aérea de llegada la trata como estado de llegada, no como evento: no registra hora, técnica ni cánula.
    Tres caminos: (1) que el ingreso con TOT muestre los botones de evento, (2) que el bloque muestre su propia casilla visible solo en
    ingreso, (3) dejarlo así porque en un ingreso la TQT se anota como llegada. Es decisión clínica. *Recomendado: mirarlo juntos en la
    planilla de NEXT antes de hacer el cambio 6; mi inclinación es la 1* (reutiliza el camino de eventos que ya existe y deja hora, técnica y
    cánula), salvo que en la unidad una TQT al ingreso siempre sea «llegó con TQT», caso en que la 3 es válida.
13. **La firma sin elegir, en el celular.** Si aprietas Guardar sin firma estando en Planes, el aviso dice «Debes seleccionar la firma» pero la
    firma no se ve (la tarjeta «Cerrar el turno» nace plegada): `guardar()` hace un `focus()` directo que no abre nada. Dos caminos,
    combinables: (a) autorizar tocar UNA línea de `guardar()` (usar `_irAlCampo('fFirma')` en vez de ese `focus()`), o (b) dejar abierta la
    tarjeta única de Planes al entrar en celular (decisión 4 de la tanda 4). *Recomendado: (a)* —`guardar()` está cerrado desde la tanda 2, por
    eso espera tu visto bueno—; la guardia pasa sola y su línea «conocido» se vuelve una aserción.
14. **Los chips de Evaluaciones y `transOfIr` con el mismo defecto de tarjeta plegada.** A 390 px, con las tarjetas plegadas como las deja el
    acordeón al abrir, los 7 chips que «llevan al campo» sin abrir un modal (PIM, dinamometría, PEM, FEmáx, IMS, ecografía, deglución) dejan su campo
    invisible; `transOfIr` tiene el mismo patrón y no se midió. La corrección es llamar `_abrirHastaCampo(el)` antes de su `scrollIntoView`.
    *Recomendado: sí,* una línea por sitio; es la misma clase de defecto que la tanda 3 ya corrigió para los avisos, y va con la tanda de Evaluaciones.

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
| ✅ **`_evalHoy` mira la fecha en UTC** — ARREGLADO 4-oct (tanda 1) | `fillForm` | Ahora se compara con la fecha del turno que se reabre. Guardia `eval_hoy_fecha_del_turno.js`. |
| 🟠 **`_camaPanel` está definida dos veces** | `index.html` | Las dos hacen lo mismo hoy; si una cambia, gana la de más abajo sin avisar. |
| 🟠 **El P0.1 no entra en la «evaluación intermedia» ni en el REM** | informes | Se guarda y se narra, pero los conteos de evaluaciones no lo miran. |
| 🟠 **`guardar()` y el aviso «Falta:» siguen con listas propias** (tanda 3) | `guardar()`, `_obligatoriosPendientes()` | `guardar()` está cerrado desde la tanda 2 y conserva su lista con sus toasts. Un obligatorio nuevo hay que sumarlo en los DOS sitios; `aviso_igual_que_guardar.js` avisa si se olvida uno. |
| 🟠 **`_mFaltaTxt` dice «un dato obligatorio» para lo que no conoce** (tanda 3) | `index.html` | Las razones de la PVE, el tipo de extubación sin PVE y la hora de la reintubación salen genéricas en el encabezado del celular. Usar el texto de `_obligatoriosPendientes()` cambiaría frases que otras guardias fijan. |
| 🟠 **Una tecla suelta no repinta el estado de un bloque** (tanda 3) | `index.html` | Se repinta con `input`, `change`, `click` sobre un botón y al cambiar de paso. El Enter en «Resultado(s)» del cultivo no repinta hasta el siguiente evento (la casilla «Cultivo» ya cuenta). |

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

## 4b · Pendiente de decisión: los valores heredados en ámbar

El aviso «Quedan N valores heredados sin revisar» (y el ámbar de lo que se replicó del turno anterior) **no funciona en el
flujo por pasos**: mira qué campos se ven en pantalla, y los de otros pasos están ocultos, así que cuenta cero. Medido: con una
previa llena, 0 marcados y 0 pendientes. **Estaba así desde que existen los pasos**, no por esta tanda. Arreglarlo es una
línea, pero haría aparecer un aviso nuevo en cada guardado de cada turno con datos replicados. ¿Lo quieres encendido?

## 5b · Lo que se encontró y se arregló el 2-oct

- 🔴 **Los obligatorios de otro paso no bloqueaban el guardado** (PVE, razón de
  KTM no realizada, contraindicación, fundamento de «Otro»). Medido y arreglado
  (acuerdo 8.6). **La PVE obligatoria no bloqueaba en el flujo real hasta hoy.**
- **Los obligatorios tampoco bloqueaban en el CELULAR** (el plegado de tarjetas contaba como «oculto»). Arreglado.
- **Los chips de Evaluaciones no abrían su campo** (PIM, PEM, FEmáx, ecografía, deglución, dinamometría). Arreglado.
- El IMS pasó a Funcionales; el IMT/EMS se narran siempre; la KTM de noche no hereda hacia el día; el servidor ya no la
  rechaza; la pestaña «6 Relato» no abre antes de guardar; «Siguiente» no queda desactivado al saltar de paso.

## 6 · Al pegar el paquete

- 🔴 **Hay que correr `crearORepararEstructura()`**: la evolución pasó de 411 a
  **414 columnas**, y la cama y el archivo ganan una columna (`AET_SERIE`).
- El cohete lleva el sello de versión nuevo (`NEXT-5.7-turno-respiratorio`); si no
  aparece en «Cargando…», lo pegado no es lo nuevo.
- 📦 **Archivos a pegar en el editor** (de la carpeta `entrega/`): `api.gs`,
  `dominio.gs`, `infra.gs`, `servicios.gs`, `webapp.gs` y el `index.html` (el
  cohete). Compáralos con `cmp`, no a ojo: el portapapeles corrompe los acentos en
  los archivos grandes. Son los mismos seis si tu planilla se quedó en la versión
  5.4: traen también la tanda 1.
  **La tanda 3 solo cambia `index.html`**: si la planilla ya está en 5.6, es el
  único archivo que hay que pegar.
- ✅ **La tanda 1, la tanda 2 y la tanda 3 NO cambian el esquema**: no hay hoja ni columna
  nueva, así que **no hace falta correr `crearORepararEstructura()` por ellas**
  (la corrida de arriba es solo para una planilla que viene de antes del
  rediseño de septiembre). `CONTRATO_ESTRICTO` no necesita fila en la hoja CONFIG:
  sin ella vale «apagado».
- 🧪 **Antes de pegar en la planilla de NEXT: la prueba con dos aparatos** (2c, la
  12). Se publica como nueva versión de la implementación web de **NEXT** (nunca
  la del hospital) y se recarga la app instalada. **Solo después de la prueba**
  se enciende `CONTRATO_ESTRICTO` (2c, la 3).
- 🕗 **Esa misma corrida corrige el horario de turno** en CONFIG: si
  `TURNO_DIA_INICIO` y `TURNO_NOCHE_INICIO` dicen 9 y 21, pasan a 8 y 20, una
  sola vez. Si pusiste otro horario, no lo toca. Se puede revisar a mano en la
  hoja CONFIG.
