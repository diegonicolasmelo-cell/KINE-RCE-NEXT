# Pendientes — al 10-oct-2026 (con la tanda 5 de limpieza visual)

> Lo que está **decidido** vive en `docs/ACUERDOS_REDISENO.md`, con las palabras
> de Diego. Esto es la otra mitad: lo que **falta probar**, lo que **falta
> decidir** y lo que **se encontró y no se arregló**.
>
> 🟢 **El rediseño del 30-sep y 1-oct está programado** (tandas A a G), y la **tanda 1
> (integridad), la tanda 2 (guardado seguro), la tanda 3 (turno respiratorio,
> cambios 1 a 5), la tanda 4 (terapia física y Planes, cambios 1, 2 y 4) y la
> tanda 5 (limpieza visual, cambios 1 a 7)** también: hoy son **240 guardias en verde**. Lo que no existe
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
>
> 🟠 **La sección 2e es de la tanda 4**: tres decisiones ya implementadas (✅) y doce
> por decidir (la 9b es nueva, de la revisión). Ninguna toca los tres bloques de Planes; la parte de texto de la 10
> (el cuadro «¿Quién midió?») ya la cerró la tanda 5.
>
> 🟠 **La sección 2f es de la tanda 5**: nueve decisiones de pantalla ya implementadas (✅)
> y trece por decidir (la 21 y la 22 son nuevas, de la revisión). Las más visibles: si los cinco emojis de 2020 se ven bien en el
> computador del hospital (la 11), el rótulo del ➕ (la 12), la cabecera del panel que
> se sale de la pantalla a 360 px (la 17) y los textos que aún se leen poco (la 21).

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
> ⚙️ **El «modo estricto» (una casilla de la hoja CONFIG) nace APAGADO** (la 3). Mientras esté apagado, una pantalla vieja puede seguir
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
   equivocado. Se enciende escribiendo `TRUE` en la fila `CONTRATO_ESTRICTO` de la hoja CONFIG de la planilla de NEXT (así se llama la fila en la hoja; no hay función nueva).
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
   segundos** con exactamente lo mismo que ella escribió, y después solo a mano con «Reintentar ahora». Los dos números viven juntos
   en un solo lugar del código y se ajustan ahí (sus nombres técnicos están en la bitácora, entrada «paso F4»). Con una red lenta de verdad, 45 s puede ser mucho o poco: conviene verlo
   en la prueba. *Recomendado: sí.*
9. **Colores y textos.** ✅ Ámbar: «No confirmado · No sabemos si se guardó. Tu texto sigue aquí.» con «Reintentar ahora» y «Seguir
   editando»; «Guardado con aviso» cuando el servidor guardó pero algo quedó pendiente; rojo «NO se guardó» **solo** cuando el servidor
   contestó que no. Reemplaza al «NO se guardó» que antes salía a los 3 s sin respuesta y afirmaba algo que no se sabía. *Recomendado: sí.*
10. **Bitácora de auditoría: ¿registrar cada repetición evitada?** Una fila corta en la bitácora de auditoría (con el nombre de la acción y la palabra «repetida») cada vez que la memoria de 6
    horas evita repetir algo, para medir cuánto ayuda. **Esta NO está hecha**: hoy una repetición no deja rastro. Lo que sí está es la
    marca «sin episodio» en esa bitácora cuando una pantalla vieja llama sin avisar el paciente (salvo al guardar la evolución), que
    sirve para decidir cuándo encender el modo estricto. *Recomendado: sí.*
11. **Ampliar la revisión de integridad de la planilla** (la que corre coordinación desde el editor para encontrar turnos que no cuadran) con
    lecturas que no escriben nada (egresos duplicados, camas con paciente y a la vez fila de archivo). No se
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
    escribir un segundo egreso para el mismo paciente (con otro número interno), pero eso cambia cómo cuenta el REM. *Recomendado: bloquear.*
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
13. ✅ **RESUELTA el 10-oct-2026 (paso F2): al apretar Guardar sin firma estando en Planes, la pantalla ya te lleva hasta el cuadro de la firma aunque la tarjeta esté plegada; la prueba automática que lo vigila pasó de «caso conocido» a exigirlo.**
    **La firma sin elegir, en el celular.** Si aprietas Guardar sin firma estando en Planes, el aviso dice «Debes seleccionar la firma» pero la
    firma no se veía (la tarjeta «Cerrar el turno» nace plegada): el botón de guardar solo le pedía el cursor al campo y eso no abre nada. Dos caminos,
    combinables: (a) autorizar tocar UNA línea del botón de guardar para que lleve hasta la firma por el mismo camino de todos los avisos (abre la tarjeta plegada
    y destaca el campo), o (b) dejar abierta la tarjeta única de Planes al entrar en celular (decisión 4 de la tanda 4, la 7 de la sección 2e). *Recomendado: (a)* —el botón de guardar está cerrado desde la tanda 2, por
    eso esperaba tu visto bueno—; la prueba automática pasa sola.
14. ✅ **RESUELTA el 10-oct-2026 (paso F2): los chips de Evaluaciones abren la tarjeta plegada; el atajo de la ventana «Revisa antes de guardar» que lleva al evento de vía aérea olvidado, medido, tenía un defecto más hondo (no cambiaba de paso y apuntaba a controles escondidos) y ahora lleva al botón del evento. Ver la entrada de la bitácora «paso F2».**
    **Los chips de Evaluaciones y el atajo al evento olvidado, con el mismo defecto de tarjeta plegada.** A 390 px, con las tarjetas plegadas como las deja el
    acordeón al abrir, los 7 chips que «llevan al campo» sin abrir un modal (PIM, dinamometría, PEM, FEmáx, IMS, ecografía, deglución) dejan su campo
    invisible; el atajo de «Revisa antes de guardar» tiene el mismo patrón y no se midió. La corrección es abrir antes la tarjeta plegada y recién después llevar la vista hasta el campo.
    *Recomendado: sí,* una línea por sitio; es la misma clase de defecto que la tanda 3 ya corrigió para los avisos, y va con la tanda de Evaluaciones.

## 2e · Decisiones de la tanda 4 (terapia física y Planes, 10-oct)

> 🟢 **Las ✅ de la parte A (de la 1 a la 3) YA ESTÁN HECHAS con la opción que recomiendo** y esperan que las confirmes o las cambies. Si dices que
> no, cada una se revierte con poco; ninguna toca el esquema de la planilla ni lo que se guarda en una evolución nueva.
>
> 🟠 **Las de la parte B (de la 4 a la 14) NO se hicieron**, a propósito: unas son clínicas (de la 4 a la 6), otras cambian el flujo diario de todo el equipo
> (la 7 y la 8) y otras son limpieza de Planes que va con la tanda 5 (la 9 a la 11). Las tres últimas son puertas conocidas que dejaron los pasos. Con tus respuestas se hacen.
>
> 🧩 **El cambio 3 del plan de esta tanda (que el error abra la tarjeta plegada en el celular) ya lo cerró el paso 3.1 de la tanda 3** y no se repitió; lo único que
> queda de él es la decisión 7. **Los tres bloques de Planes no se tocaron.**
>
> ✍️ **Ninguna está escrita todavía en `docs/ACUERDOS_REDISENO.md`**: se escriben con tus palabras cuando respondas. Dilas por número.

**A · Ya implementadas, esperan confirmación**

1. **El nivel de KTM que la cama recuerda ya no se cuela de noche ni en el primer día tras una noche.** ✅ Hasta ahora, de noche el formulario podía llevar escondido el nivel
   de la noche anterior (sin ningún botón encendido que lo delatara): si marcabas «Realizada» sin elegir nivel, la sesión salía con ese nivel y el relato decía «nivel 3». Ahora el
   formulario parte sin nivel cuando no hay nada que heredar. *Lo que ves:* de noche la terapia física parte de verdad en blanco; el primer turno de día tras una noche abre sin
   nivel; de día tras otro día, el nivel se hereda y se ve encendido, como siempre. *Recomendado: dejarlo* (es lo que dicen 8.6 y 8.7). Si dices que no, se vuelve atrás una sola línea de la carga del turno anterior al abrir una cama.
2. **Reabrir una evolución guardada devuelve la terapia física tal como se guardó.** ✅ Antes, reabrir dejaba la tarjeta en blanco: de día, un turno con la KTM realizada no se podía volver a
   guardar («indica la razón por la que NO se realizó», con el campo escondido); de noche se borraban IMT, EMS, válvula, Borg y minutos. Ahora vuelven el estado de la KTM, el nivel, la asistencia,
   los minutos, el Borg, el IMT y la EMS con sus datos, y la válvula con sus minutos y tolerancia, y el relato que se regenera los narra. Nada se inventa: un turno que nunca declaró estado se reabre sin estado.
   *Recomendado: dejarlo.* No hay una versión intermedia que sirva: sin esto, el que reabre para corregir otra cosa pierde lo anotado sin darse cuenta.
3. **«← Atrás» salta la pestaña de Prevención cuando está oculta, y no aparece en el primer paso.** ✅ En un paciente sin TOT, TQT ni VM, «Atrás» desde el Turno llevaba a una pantalla vacía
   («Sin dispositivos de vía aérea en este paciente»); en un ingreso caía ahí en vez de volver a la identificación. Ahora el Turno es el primer paso y el botón no se ofrece; en un ingreso vuelve al paso 0.
   Con un paciente que sí tiene prevención nada cambia. *Recomendado: esconderlo,* igual que ya pasa en el primer paso con prevención. Si prefieres que el botón siga visible sin hacer nada, es una línea del cambio de pasos.

**B · Falta decidir (no están hechas)**

4. **Con adecuación del esfuerzo terapéutico IIIC (confort) o BNM, hoy se esconde TODA la tarjeta de Rehabilitación**, incluida la válvula de fonación y «Educación a usuario/cuidador/familia»
   (la que cuenta en el REM B.6), aunque el comentario del código dice que la educación es «visible siempre». ¿Esas dos cosas deben seguir visibles aunque la KTM se bloquee?
   *Recomendado: sí:* sacar la educación (y la válvula, si hay TQT) del bloqueo y bloquear solo la KTM; en confort, la educación a la familia es de lo más plausible. Es un cambio pequeño y aparte.
5. **La válvula de fonación de noche suma 12 horas para la decanulación aunque nadie la haya declarado** (es la 16 de la sección 2), **y la racha no viaja al reabrir.** Al reabrir un turno, la
   frase de decanulación cuenta solo las 12 h del propio turno, sin las rachas de turnos anteriores (las horas que traen los turnos de antes se calculan al abrir la cama y la fila del turno guardado no las trae). Es regla clínica de decanulación;
   no se toca sin tu respuesta. *Recomendado:* sumar solo si ese turno quedó con la válvula declarada, y que reabrir conserve la racha.
6. **La KTM de DÍA parte ya marcada «Realizada»; de noche parte en blanco.** El sistema decide por defecto en un caso y no en el otro. Tras una noche, el primer día abre «Realizada» pero ahora sin nivel (paso 1
   de esta tanda). *Recomendado: que el sistema no decida por ti:* de día que parta neutra, en ámbar («falta elegir»), y se confirme con un toque. No se cambió porque altera el flujo diario de todo el equipo y
   puede mover el REM (hoy una KTM de día que nadie eligió cuenta como realizada).
7. **En el celular los pasos 4 y 5 abren con sus tarjetas plegadas.** Cuando el paso tiene una sola tarjeta importante, ¿se abre sola al entrar? *Recomendado: sí para Planes* (una sola tarjeta, y es donde se
   firma y se guarda) y, en Terapia física, abrir solo la primera (Rehabilitación). Es la «decisión 4 de la tanda 4» que cita la 13 de la sección 2d (la firma sin elegir, en el celular). El error ya abre la tarjeta
   por su cuenta (tanda 3, paso 3.1); esto es solo cómo parte la pantalla.
8. **El Plan para el próximo turno se hereda SIEMPRE del turno anterior, en silencio**, y nada avisa que viene heredado (el aviso en ámbar de la sección 4b está muerto en el flujo por pasos). ¿Lo quieres visible?
   *Recomendado:* mostrarlo en ámbar solo en Planes, con el texto «viene del turno anterior, confírmalo o cámbialo», sin el aviso global de la 4b que saldría en cada guardado. Va con la tanda 5, y con la 7 de la
   sección 2d (lo heredado como «Requiere revisión»), para no cambiar el significado dos veces.
9. **«Realizada» sin nivel (1 a 5): hoy no avisa.** ¿Debe avisar en ámbar, sin bloquear? *Recomendado: sí, solo ámbar* («Realizada sin nivel»), para no estorbar a quien no alcanzó a elegirlo. Quedó honesto después del paso 1
   de esta tanda: ahora un nivel vacío es de verdad un nivel que nadie eligió, no el de la cama.
9b. **De noche, «Realizada» sin elegir nivel deja a esa cama sin nivel en el tablero.** Es un efecto de lo que cerró el punto 1 de esta sección, y salió en la revisión. Hoy, si en el turno de
    noche alguien marca la KTM como «Realizada» y no elige el nivel (1 a 5), la tarjeta de esa cama deja de mostrar su «KTM 3» hasta que alguien registre un nivel; si la noche no toca la KTM, la cama
    conserva su nivel como siempre. Antes del punto 1 el sistema le ponía a esa noche el nivel del día, sin que nadie lo eligiera, y la cama lo conservaba. ¿Prefieres que la cama conserve su nivel
    del día cuando la noche marca «Realizada» sin elegirlo? *Recomendado: dejarlo como está:* una KTM sin nivel no puede mostrar uno, y con el aviso en ámbar de la 9 casi nadie la dejaría sin nivel.
    No se tocó el servidor. Si dices que sí, es una condición en la fila de la cama (de noche, sin nivel nuevo, que conserve el anterior) y se cambia a la vez el caso que la guardia deja medido.
10. **Textos y atajos de Planes.** El modal que se abre al dejar un pendiente dice «¿Quién midió?» (texto de medición, equivocado para un pendiente); los 18 chips fijos siguen siempre a la vista; las sugerencias «Medir X» salen sin mirar
    si el paciente coopera. *Recomendado:* cambiar el título a «¿Quién deja el pendiente?» y limpiar chips y sugerencias dentro de la tanda 5; no cambia los tres bloques y es solo texto.
    ✅ **El título del cuadro ya se cambió en la tanda 5** (ver la 8 de la sección 2f); los 18 chips y las sugerencias «Medir X» siguen sin tocar.
11. **Números de las pestañas.** Cuando no hay nada que prevenir (pestaña 1 oculta), la primera visible es la «2». ¿Se dejan los números fijos (Turno siempre 2, Terapia física siempre 4, Planes siempre 5) o se renumeran por lo que
    se ve? *Recomendado: fijos:* es lo que ya hay, lo que usan las guardias y el equipo, y «paso 4» significa siempre lo mismo. Solo se corrigió que «Atrás» no caiga en el paso oculto (la 3).
12. **Si abres un paciente que aún no tiene ningún turno guardado, de noche la terapia física puede traer el nivel que la cama recordaba.** Lo mismo pasa si, justo al abrir, el servidor no contesta. No se alcanzan con datos reales, porque una cama que recuerda un
    nivel siempre tiene turno previo; por eso no se cerraron. *Recomendado: sí, sin apuro:* una condición (de noche, no copiar el nivel de la cama) la próxima vez que se toque esa carga de la cama por otra razón, con su caso en la prueba automática.
13. **Si reabres un turno de día antiguo que nunca marcó estado de KTM, al guardarlo el sistema le pide la razón de «no realizada».** Es un turno de DÍA anterior al trío de estados (o guardado directo en el servidor sin pasar por la pantalla): **se reabre sin estado elegido**, y al volver a guardarlo
    la pantalla manda «no realizada» sin razón y el servidor lo rechaza. La pantalla actual no produce ese caso. ¿Debe quedar así (la kinesióloga elige) o partir «Realizada» como un turno de día nuevo? *Recomendado: dejarlo sin estado:*
    «Realizada» por defecto puede inflar el REM, y «no realizada» sin razón entra al denominador de la estadística; ninguna de las dos se inventa.
14. **La Prevención no aparece si la vía aérea o el soporte se eligen DENTRO del turno.** La pestaña 1 se decide una sola vez, al abrir la cama; si un paciente sin dispositivos recibe uno durante el turno, la Prevención no
    aparece hasta reabrir la cama, y «Atrás» sigue a la barra. ¿Debe aparecer sola? *Recomendado: no por ahora* (sería abrir un paso que el flujo acordó saltar); si lo quieres, es otra pieza, con su guardia.

## 2f · Decisiones de la tanda 5 (limpieza visual, 10-oct)

> 🟢 **Las ✅ de la parte A (de la 1 a la 9) YA ESTÁN HECHAS con la opción que recomiendo** y esperan que las confirmes o las cambies. Todas son de pantalla: ninguna toca el esquema de la
> planilla ni lo que se guarda en una evolución. Revertir cada una cuesta una línea de estilo (se dice cuál), salvo el botón único (la 7), que se hizo en un paso propio y no se deshace con un solo botón (se dice cómo en la 7).
>
> 🟠 **Las de la parte B (de la 10 a la 22) NO se hicieron**, a propósito: unas cambian una palabra de la unidad (la 10 y la 12), otras necesitan que alguien mire un computador del hospital
> (la 11) y otras son hallazgos o ajustes finos de la tanda que quedaron sin hacer (de la 14 a la 22; la 21 y la 22 salieron de la revisión).
>
> 👀 **Las capturas del antes y el después** (tablero, traslado, retrospectiva y los seis pasos del panel, a 390 y 1400 px, en tema claro) quedaron en la carpeta de trabajo de la sesión,
> fuera del repositorio: hay que mostrártelas desde ahí para que decidas mirando, no leyendo.
>
> ✍️ **Ninguna está escrita todavía en `docs/ACUERDOS_REDISENO.md`**: se escriben con tus palabras cuando respondas. Dilas por número.

**A · Ya implementadas, esperan confirmación**

1. **El texto gris de toda la app se lee más firme.** ✅ (decisión 7 de la auditoría) El gris azulado del texto secundario pasó de `#5B7793` a `#4A6580`: el mismo azul grisáceo, más hondo, porque
   sobre el fondo manila de la cama no llegaba al contraste mínimo (3,69:1; el peor par de --muted, el gris de los textos secundarios, mide 4,80:1; los textos con colores escritos a mano son otro asunto: ver la 21). En la misma línea: los títulos de Hemodinamia, Rehabilitación e IMT, el
   diagnóstico de la cama, el «Egreso» y el icono de traslado (que casi no se veía, 1,84:1; con el cursor encima mide 10,3:1 y el botón mide 24×24 px, corregido en la revisión) se oscurecieron, y «Siguiente» sin poder avanzar pasó de azul pálido con letra blanca a gris claro con letra oscura.
   *Recomendado: dejarlo* (es una sola línea, uniforme y sin parches por pantalla). Si prefieres oscurecerlo solo sobre el manila y el fondo gris, se devuelve ese gris a su valor anterior y se oscurece solo donde hace falta, pantalla por pantalla.
2. **Piso de letra de 11 px en el celular.** ✅ (decisión 5) Ningún texto visible baja de 11 px en el tablero, el traslado, la retrospectiva, los seis pasos y el ingreso (antes llegaba a 9,3 px: barra de abajo, chips
   de ventilador y equipos, palabras de estado, etiquetas) y, desde la revisión, tampoco en el popup del ➕, el Historial (con su Hoja UCI), el Egreso y la pestaña Registro (antes llegaban a 8,5 px en la Hoja UCI; el diálogo de Egreso ya estaba en regla). Nada se pierde ni se mueve un botón; el panel crece unos pocos píxeles (16 como máximo en la medición del paso 5.1). *Recomendado: dejarlo.* Si prefieres densidad antes que lectura, el piso baja a 10,5 px
   (es un solo número en la prueba que vigila el piso de letra). **Solo es del celular**: el escritorio sigue con letra de 9,3 a 10,7 px (ver la 16).
3. **El título de cada tarjeta sube un escalón** (de 11,5 a 12,5 px) para que haya tres niveles: tarjeta, bloque, etiqueta de campo. ✅ (decisión 6) *Recomendado: dejarlo;* sin ese escalón no hay tres niveles. Revertir:
   volver el título de la tarjeta a su tamaño anterior (una línea), y entonces la prueba de los tres niveles de título pide reconciliar la escalera.
4. **Los títulos de bloque pierden su color de dominio y van todos en gris, en negrita y mayúsculas** (Respiratorio azul, Rehabilitación ámbar, Evaluaciones turquesa, AET morado; y los tres de Planes, que eran azul, verde y ámbar
   en minúscula grande). ✅ El dominio sigue en el punto y el borde de cada tarjeta, y en Planes en el borde y el fondo de cada bloque. El ámbar de «Lo que queda pendiente» medía 3,07:1 como título. *Recomendado: dejarlo* (es lo que
   hace que sean «una sola tupla»). Si quieres conservar el color en alguna familia, se acepta como excepción escrita en la guardia, no con una segunda regla.
5. **La tarjeta de cama: «Evolución» (o «Editar») sola en su fila, a todo el ancho; Historial, ➕ y Egreso en una segunda fila.** ✅ Antes eran cuatro botones del mismo peso en una fila y «Evolución» —la acción de todas las camas— medía
   el 31 % del pie. **El costo:** cada tarjeta ocupada es una fila más alta (unos 44 px) y el tablero del celular pasa de 3.414 a 3.810 px (en escritorio, de 1.069 a 1.186 px). *Recomendado: dejarlo.* Si el largo del tablero en el
   celular te molesta, la salida es achicar el relleno de los secundarios, no volver al pie de cuatro.
6. **«Egreso» neutro y con la palabra completa** (antes «Egr.», en verde). ✅ (decisión 3) Es la acción menos frecuente y la más difícil de deshacer: no debe parecerse a la de «Evolución» ni al color de «lo bueno».
   *Recomendado: dejarlo.* Volver al verde es una línea de CSS.
7. **Un solo botón principal: azul liso, sin degradado ni resplandor.** ✅ (decisión 1) **La hipótesis de la auditoría no se confirmó:** no había un índigo a la vista (era código muerto, la piel institucional lo pisaba
   siempre). Lo que sí difería era el degradado hacia azul marino, el resplandor azul y un «hover» que aclara en vez de oscurecer. Ahora «Guardar» y «Siguiente» son del mismo azul que «Evolución», con su tamaño grande de 52 px
   (pedido tuyo del 15-ago). *Recomendado: dejarlo.* **Se hizo en un paso propio, aparte de la corrección de la barra (la 9), pero deshacerlo NO es apretar un botón:** hay que volver a escribir a mano cuatro reglas de estilo del botón, borrar la prueba que exige el azul liso y regenerar los paquetes de entrega (el detalle está en la bitácora, cierre de la tanda 5). Lo más simple: pedírselo a Claude, que lo hace y corre la batería sin tocar la corrección de la barra.
8. **El cuadro de firma de los pendientes ya no pregunta «¿Quién midió?».** ✅ Dice «¿Quién deja el pendiente?» al dejarlo y «¿Quién cierra el pendiente?» al cerrarlo desde la cama (esto último lo agregué yo; el pedido
   hablaba solo de «dejar»). Las evaluaciones siguen con «¿Quién midió?». Cierra la parte de texto de la 10 de la sección 2e. *Recomendado: dejarlo.* Si prefieres el cierre como estaba, es una línea del cierre de pendientes desde la cama.
9. **«⚠️ Sin guardar» es una franja de ancho completo arriba de los botones, en el celular.** ✅ Antes era una pastilla en la misma fila y dejaba el botón principal en 141 px: «Siguiente: evaluaciones →» se
   partía en tres líneas y se salía de su botón. Ahora el principal mide 258 px y se lee en una línea; **la barra queda 28 px más alta mientras hay cambios sin guardar.** *Recomendado: dejarlo.* Si prefieres la pastilla
   compacta, la alternativa es una insignia más chica o un icono solo (cambia el texto de esa insignia, que es del otro flujo).

**B · Falta decidir (no están hechas)**

10. **La palabra del botón principal de la tarjeta de cama: «Evolución» (cuando falta) y «Editar» (cuando ya está).** (decisión 2) Es un sustantivo, no un verbo, y el tutorial dice «Se abre con Evolución». *Recomendado: no cambiarla:* el
    problema no era el nombre sino que compitiera con otros tres botones del mismo peso, y eso ya se resolvió (la 5). Si quieres «Evolucionar», se cambia en un solo lugar de la tarjeta de cama, en el texto del tutorial y en la prueba del tutorial.
11. **Los cinco emojis posteriores a 2019 que viven en producción.** (decisión 4, con la lista real) Son **cinco, no cuatro**: 🫁 pulmones (**27 sitios**: título de la tarjeta Respiratorio, botón «Intubación», timeline, bodega, estadísticas, la
    campana, la entrega de turno), 🫀 corazón anatómico (la insignia **UPOT de cada tarjeta de cama**, que la auditoría no listó), 🫧 burbujas, 🪶 pluma y 😮‍💨 cara exhalando. En el Chrome de Windows 10 pueden salir como un cuadrado. *Recomendado:*
    pide a alguien que abra, en un computador del hospital, la tarjeta Respiratorio **y** la insignia UPOT de una cama, y me dices si salen como cuadrado. Si es así, se reemplazan por un SVG propio o un emoji de 2019 en una tanda aparte, y cada emoji que
    se cambie se borra de la lista de emojis permitidos de la prueba de emojis (la prueba lo exige). Si se ven bien, se dejan: el candado ya impide que entren más (también los que se escriban como código: la revisión le cerró esos huecos).
12. **El ➕ del pie de la tarjeta sigue sin rótulo.** Es un icono solo y en el celular no existe el *tooltip*: quien no sabe qué hace no tiene cómo enterarse. ¿Le ponemos «Evento»? *Recomendado: sí;* en el celular el botón mide 110 px
    de ancho, hay lugar de sobra. En escritorio se mide con la prueba de las acciones de la tarjeta al hacerlo. Cambia una palabra de la interfaz, por eso no se hizo.
13. **Durante un traslado, cada cama ocupada muestra dos botones azules a ancho completo** («Intercambiar con esta cama» y «Evolución») uno sobre otro, más la fila de secundarios. Queda ordenado pero largo, y el riesgo de tocar uno por el
    otro existía igual antes. ¿Se esconde «Evolución» mientras dura el traslado? *Recomendado: dejarlo así por ahora* (el pie del traslado es lo acordado) y esconderla solo si ves toques equivocados cuando lo uses.
14. **El «sin registrar» en cursiva gris del encabezado de cada bloque, en el celular, mide 2,23:1** (un gris muy pálido). No estaba en la auditoría y es el «vacío» apagado a propósito de la tanda 3, así que no se tocó. ¿Quieres que también se lea?
    *Recomendado: sí,* oscurecerlo hasta 4,5:1 conserva la cursiva y su carácter de apagado; es una línea de estilo y una comprobación más en la prueba de contraste.
15. **¿Subimos los dos niveles superiores de título, T2 a .74rem y T1 a .8rem?** En el celular el escalón entre el título de un bloque (11,5 px) y la etiqueta de sus campos (11,2 px) es de solo 0,3 px, porque el piso de 11 px deja la etiqueta
    en .7rem; los separan el peso, el espaciado, el gris y la posición. *Recomendado: primero míralo en el celular real;* si no se distingue, sí, los dos juntos (no se baja la etiqueta).
16. **¿Un piso de letra también en el escritorio?** Hoy el escritorio sigue con 9,3 a 10,7 px en los títulos en línea y los chips; el piso de 11 px es solo del celular. *Recomendado: no a ciegas:* mira las capturas de 1400 px y dime si hay
    algo que se lea mal en el computador. Si dices que sí, se hace en una pieza propia, con una constante de piso para el escritorio y su guardia.
17. **La cabecera del panel desborda por debajo de 390 px.** Con un diagnóstico largo en una sola línea, el título y la ✕ de cerrar terminan 20 px fuera de la pantalla a 360 px (y 60 px a 320 px), el foco de la ✕ desliza el panel y la barra
    aparece corrida. Es de la cabecera, no de la barra, y no se arregló. ¿Importan los celulares de 360 px o menos en la unidad? *Recomendado: sí, arreglarlo* (que el diagnóstico largo se corte con «…» en vez de empujar la ✕ fuera de la pantalla); una ✕ de cerrar fuera de la
    pantalla no es algo para dejar.
18. **Hay un botón muerto de «cerrar» que nunca se ve** (está escondido de origen) y sigue en la pantalla, pegado a la zona del guardado. No es un duplicado visible de «Cerrar la evolución». *Recomendado: borrarlo en una tanda aparte,* junto con lo que lo nombra.
19. **Con una franja de falla (ámbar o de aviso) la barra de abajo mide 160 a 180 px** y el borde de un campo enfocado puede quedar cubierto: el margen fijo de desplazamiento (112 px) cubre la barra con la insignia (100 px), no con la franja. Es la zona
    del otro flujo y no se midió el foco con ella puesta. *Recomendado: medirlo cuando se toque esa franja,* no antes.
20. **Escribir en el archivo de reglas (`CLAUDE.md`) que la regla de emojis la vigila una prueba automática (la de emojis nuevos)**, como las demás reglas. Un mensaje de agente no autoriza cambiarlo; es tuyo. *Recomendado: sí,* es una frase, y le dice a la próxima sesión dónde está el candado.

21. **Textos que todavía se leen poco, en las mismas pantallas que arregló la tanda** (hallazgo de la revisión). El texto gris secundario quedó en regla, pero con colores escritos a mano
    quedan pares bajo el mínimo de lectura (4,5:1). Medidos en Chromium, con el reloj congelado y datos ficticios:
    **(a)** el chip gris «📋 MRC/FSS no evaluables aún» de cada tarjeta ocupada: gris `#64748b` sobre el manila de la carpeta = 3,5:1 (el mismo gris y el mismo manila por los que se oscureció el diagnóstico de la cama);
    arreglo de una línea: pasar ese gris a un gris azulado más hondo (`#475569`, 5,6:1).
    **(b)** el chip ámbar de una evaluación vieja («📋 MRC 52 · hace 8d · DMV»): `#b45309` sobre su fondo ámbar = 3,7:1. **Es el ámbar con significado clínico («esto es de hace días»): no se toca sin tu decisión.**
    Si dices que sí, un tono más hondo del mismo ámbar (`#92400e`, unos 5,2:1); si prefieres, se deja como está.
    **(c)** en la vista retrospectiva, el botón apagado «— sin evolución —» de las camas sin evolución ese día: `#94a3b8` sobre gris claro = 2,25:1 (justo la clase de rótulo que se pierde cuando se quiere saber por qué);
    arreglo de una línea: el mismo gris azulado más hondo (`#475569`, 6,7:1).
    **(d)** en la barra del Turno, «Sin colegas asignados» y «N camas sin asignar»: `#94a3b8` sobre el fondo de la app = 2,3:1; arreglo de una línea: el mismo gris azulado más hondo (6,8:1).
    **(e)** en el aviso de la vista retrospectiva, «↩︎ Volver a hoy»: letra blanca sobre el naranja `#FF9F0A` = 2,06:1. **Es el naranja del aviso: decisión tuya.** Opciones: letra oscura sobre el mismo naranja (unos 7:1) o un naranja más hondo con letra blanca.
    **(f)** el icono de traslado con el cursor encima: era 2,98:1, peor que en reposo; **ya se corrigió en la revisión** (ahora 10,3:1) y su botón pasó de 21×21 a 24×24 px.
    Un barrido de todo el texto visible dio 457 textos bajo el mínimo contra 1.131 antes de la tanda: ningún par empeoró por la tanda. *Recomendado: sí a la (a), la (c) y la (d)* (tres líneas de color, grises sin significado clínico); *la (b) y la (e) son tuyas.*
    Si dices que sí, esos tres pares entran a la lista cerrada de la prueba de contraste para que no vuelvan a bajar (hoy no están en esa lista; entran junto con el arreglo, viendo antes la prueba roja).
22. **Las otras pestañas y la barra de botones del Registro, en el celular** (hallazgo de la revisión, medido a 390 px y sin datos; con datos pueden aparecer más). El piso de 11 px de la 2 ya vale en el popup del ➕, el Historial (con su Hoja UCI), el Egreso y la pestaña Registro.
    **Quedaron fuera a propósito, con su medida**, porque no se pidieron y son pantallas de lectura más que de trabajo de pie junto a la cama: **Estadísticas** (la letra más chica mide 10,6 px: las etiquetas de los indicadores),
    **Entrega** (10,6 px: el texto bajo el número de cada cama) y **Ventiladores** (10,1 px: los rótulos de las bodegas).
    Y aparte: **la barra de botones del Registro** (buscador, Documentos, Lista del día, Filtros, Cambios de esta noche y CSV) es una sola fila que a 390 px mide 836 px, así que **toda la página se desliza hacia el lado**, no solo la tabla.
    Es de antes del piso y no depende de la letra; la prueba del piso de letra no la mide para no ocultarla ni tapar su arreglo. *Recomendado: sí a las dos:* el mismo piso de 11 px a las tres pestañas (una regla de estilo por cada clase, como se hizo en el Historial)
    y que la barra de botones del Registro pase a dos o tres filas en el celular. Son cambios de pantalla: no tocan lo que se guarda.

**Y dos que ya estaban y siguen igual:** los 18 chips fijos y las sugerencias «Medir X» de Planes (la 10 de la sección 2e) no se tocaron en esta tanda, y **nada de lo de aquí se ha visto en un aparato real**: todo se midió en Chromium con datos ficticios, no
en el Chrome de Windows 10 ni con pulgar y guantes.

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
| 🟠 **La cabecera del panel desborda por debajo de 390 px** (tanda 5) | `index.html` | Con un diagnóstico largo la ✕ de cerrar queda 20 px fuera a 360 px (60 a 320 px) y el foco de la ✕ desliza el panel. `act_bar_390.js` lo esquiva. Decisión 17 de la 2f. |
| 🟠 **El «sin registrar» del celular mide 2,23:1** (tanda 5) | `.mres.vacio` | El «vacío» apagado a propósito de la tanda 3; `contraste_tokens.js` solo mide `--muted` y su lista cerrada, no lo ve. Decisión 14 de la 2f. |
| 🟠 **`#btnCerrarPost` es un botón muerto** (tanda 5) | `index.html` | `display:none` en línea; nunca se ve. Decisión 18 de la 2f. |
| 🟠 **La barra de botones del Registro se sale de la pantalla en el celular** (tanda 5, revisión) | `#tcP`, fila de botones | Una sola fila sin envoltura que a 390 px mide 836 px: la página entera se desliza hacia el lado (la tabla ya desliza dentro de su marco). Decisión 22 de la 2f; `piso_letra_celular.js` la deja fuera a propósito. |
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
- El cohete lleva el sello de versión nuevo (`NEXT-5.9-limpieza-visual`); si no
  aparece en «Cargando…», lo pegado no es lo nuevo.
- 📦 **Archivos a pegar en el editor** (de la carpeta `entrega/`): `api.gs`,
  `dominio.gs`, `infra.gs`, `servicios.gs`, `webapp.gs` y el `index.html` (el
  cohete). Compáralos con `cmp`, no a ojo: el portapapeles corrompe los acentos en
  los archivos grandes. Son los mismos seis si tu planilla se quedó en la versión
  5.4: traen también la tanda 1.
  **Las tandas 3, 4 y 5 solo cambian `index.html`**: si la planilla ya está en 5.6,
  5.7 o 5.8, es el único archivo que hay que pegar.
- ✅ **La tanda 1, la tanda 2, la tanda 3, la tanda 4 y la tanda 5 NO cambian el esquema**: no hay hoja ni columna
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
