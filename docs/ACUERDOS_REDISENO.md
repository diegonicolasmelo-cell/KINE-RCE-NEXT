# Acuerdos del rediseño

> **Qué es esto.** Lo que Diego y yo vamos cerrando, sección por sección, desde
> que archivamos los PRD el 18-sep-2026. Reemplaza a `docs/archivo/` como la
> vara: **si algo de acá y algo de allá se contradicen, manda esto**.
>
> Cada acuerdo lleva **la frase de Diego**, no mi resumen. Lo que está acá es
> decisión tomada; lo que falta decidir vive en `docs/GUIA_DE_ACUERDOS.md`.
>
> 🔴 Esto NO es un registro de lo programado. Un acuerdo escrito acá puede estar
> todavía sin construir — eso lo dice la columna de estado.

---

## De dónde salen estos acuerdos

Del **primer turno real**. El 19-sep Diego registró un paciente de principio a
fin en la planilla de pruebas y fue diciendo qué le estorbaba. Casi todo lo de
abajo salió de ahí, no de una reunión de diseño.

Vale la pena dejarlo escrito porque confirma algo: **media hora de uso real
rindió más que los PRD que archivamos**.

---

## 1 · Ingreso de paciente — CERRADO el 19-sep-2026

Mockup: `claude.ai/artifact/VAZdkmfKJZ2hjyySTFCwfZ`

El ingreso pasa a ser un **modal único, paso 0**, que abre al ocupar una cama y
lleva derecho al turno (el paso 2).

| # | Acuerdo | Estado |
|---|---|---|
| 1 | RUT **obligatorio** | por programar |
| 2 | «Ingreso» pasa a **Procedencia** | por programar |
| 3 | Fecha y hora a mano; día de estadía calculado y bloqueado | por programar |
| 4 | Diagnóstico libre **con autocompletado** | por programar |
| 5 | Grupo REM **sugerido** desde tabla editable | por programar |
| 6 | ECF, Barthel y Charlson al ingreso, **ninguna obligatoria** | por programar |
| 7 | **Nombre social** opcional, y manda en pantalla | por programar |
| 8 | Recordatorio a los 3 días + **% de cumplimiento** de escalas | por programar |

### 1.1 · El RUT se vuelve obligatorio

Sin RUT el paciente no se puede cruzar con nada: ni con la ficha del hospital,
ni consigo mismo si reingresa. Sigue sin salir de la planilla.

### 1.2 · Procedencia, no «electivo o urgencia»

> *«El apartado "ingreso" debería cambiarse por procedencia, y en reemplazo de
> anotar electivo o urgencia deberíamos registrar si viene de pabellón, SAMU,
> urgencias, algún servicio clínico, su casa, entre otros.»*

**La lista queda en siete:** pabellón · urgencias · SAMU · servicio clínico ·
**electivo** · otro hospital · otro.

🔵 «Domicilio» quedó fuera y en su lugar va **«Electivo»**:

> *«Muchas veces lo traslada el SAMU desde su domicilio o desde otra localidad,
> pero eso va a estar catalogado como SAMU. En caso que venga desde su domicilio
> por forma electiva, prefiero que diga electivo.»*

Como chips y no como lista: se toca una vez y con el dedo.

### 1.3 · Fecha y hora a mano, día de estadía calculado

> *«Fecha de ingreso y hora de ingreso van tal cual, deberían ir manual. El
> cálculo de día de estadía vendría dado según fecha.»*

El día de estadía se muestra **en gris y con borde punteado** — el mismo
lenguaje que ya usan el GCS y la interpretación del S5Q para decir «esto lo
calcula el sistema y no se toca».

### 1.4 · Diagnóstico libre, con memoria — y el camino a la lista

> *«Los diagnósticos de ingreso van libres por el momento; luego, al analizar,
> podríamos agruparlos.»*

Libres, con **autocompletado de lo que el equipo ya escribió**, mostrando
cuántas veces se usó cada uno. Sin eso habría «NAC», «N.A.C.», «neumonía
adquirida en la comunidad» y «Neumonia» como cuatro diagnósticos distintos.
Siempre se puede escribir uno nuevo.

🔵 **El autocompletado es el puente hacia lo que Diego quiere de verdad:**

> *«La idea es que en un futuro, al seleccionar un diagnóstico, se seleccione
> automáticamente el REM. Pero para esto los diagnósticos tienen que ser en
> lista desplegable también.»*

No hay que elegir entre libre y lista: la lista **se arma sola con el uso**. En
unos meses se revisa, se deja fija, y ahí cada entrada lleva su grupo REM
pegado. Empezar por la lista hoy sería inventarla sin datos.

### 1.5 · El grupo REM se sugiere, no se impone

> *«El grupo es sugerido más que nada.»*

El sistema mira el diagnóstico y propone el grupo; si se equivoca, se cambia ahí
mismo. La equivalencia vive en **una hoja de la planilla que Diego edita**, sin
programar — y es donde vivirá también cuando los diagnósticos sean lista.

### 1.6 · Las escalas previas, y que nada bloquee el ingreso

Son **ECF, Barthel y Charlson**. Se mudan del turno al ingreso.

> *«Barthel y escalas preUCI deberían poder registrarse desde la tarjeta, y
> eliminarlas del general para no ensuciar el turno.»*

🔴 **Ninguna es obligatoria**, y ése es el punto:

> *«Son de ingreso pero no siempre sabemos el dato de ingreso. Pero es un buen
> lugar para ponerlos. Ahora si requiero registrar otra puerta podría estar en
> la tarjeta.»*

A las cuatro de la mañana nadie sabe el Barthel previo: eso llega con la
familia. Se ven como **«Pendiente»** en ámbar, no como un campo vacío que grita.

🪤 **La segunda puerta YA ESTÁ CONSTRUIDA** (`_EP_ESCALAS`, index.html): los
chips de la tarjeta se tocan y se miden sin abrir la evolución, y quedan con la
firma de quien midió. No hay que hacerla — hay que dejar de fingir que el
ingreso es el único momento.

🗂️ **«Ficha previa a la UCI» no existe** y no debe volver a usarse: era el
nombre de la cajita que guarda identidad + escalas, no el de un dato. Lo inventé
yo en el primer mockup y Diego preguntó qué era — señal de que estaba mal puesto.

### 1.7 · Nombre social

Opcional, debajo del legal, que **sí es obligatorio**: ningún ingreso puede
quedar sin nombre.

> *«El nombre social se añade solamente para fines de provocar cercanía.
> Algunas personas se identifican más por su nombre social que por su nombre de
> pila.»*

🔵 **Si está escrito, manda en pantalla**: la tarjeta, la entrega de turno y el
saludo lo usan; el nombre legal queda para lo administrativo. Si no se pone
nada, no pasa nada.

🔒 Mismas reglas que el resto: se queda en la planilla, no viaja a informes ni al
REM.

### 1.8 · El recordatorio, y el indicador que sale gratis

> *«Sí, podría ser que a los tres días se recuerde. Y así podríamos evaluar el
> porcentaje de mediciones de estas escalas como de cumplimiento.»*

A los tres días la campana recuerda las escalas pendientes. Y la vuelta de
tuerca de Diego vale más que el recordatorio: si el sistema sabe qué falta,
también sabe **qué porcentaje se está midiendo**. Eso es un indicador de
cumplimiento del equipo y hoy no existe.

---

## 2 · Respiratorio — CERRADO el 19-sep-2026

Mockup: `claude.ai/artifact/LofVBJixQjAxavx5PtqXS8`

Salió del mismo turno real. Son ocho acuerdos: **seis los pidió Diego** y dos
los propuse yo —la separación de extubación y PVE, que él aprobó, y el pre-marcado
en ámbar, que no objetó.

| # | Acuerdo | Estado |
|---|---|---|
| 1 | TOT y VM como **texto**, en la fila donde ya se declaran | por programar |
| 2 | El **número del TOT** se elige a mano | por programar |
| 3 | 🔴 La **fijación nace en blanco** y no sugiere nada | por programar |
| 4 | El **modal de vía aérea** se ofrece siempre en el primer turno | por programar |
| 5 | «No corresponde» pasa a ser **un NO con razón**, la del protocolo | por programar |
| 6 | La **extubación sale de la PVE**: prueba y evento se registran aparte | por programar |
| 7 | **Días por horas completas** —24, 48, 72— para vía aérea, VM y estadía | por programar |
| 8 | El sistema **pre-marca** las razones que ya conoce, en ámbar y con la cifra | por programar |

### 2.1 · TOT y VM se escriben donde se declaran

> *«Esto se podría anotar como texto justo donde ya se declara TOT y VM,
> segunda fila de ese bloque.»*

No dos cuadros aparte: una línea de texto en el mismo lugar donde el colega ya
está mirando. Un dato que vive lejos de donde se declara es un dato que se
llena mal o no se llena.

### 2.2 · El número del TOT, a mano

> *«TOT n° se selecciona manual.»*

### 2.3 · La fijación nace en blanco — y ésta es la más importante de las tres

> *«La fijación ojalá no sugiriera nada, ya que la gente no anota, porque si
> sugiere 22 no anotan nada.»*

🔴 Hoy el campo trae `22` de sugerencia y por eso nadie lo corrige: **la
sugerencia se convierte en el dato**. Queda en blanco. Es la misma familia de
bugs que veníamos persiguiendo —un valor que pone el programa y termina
leyéndose como si lo hubiera medido alguien— y acá se resuelve al revés que en
el S5Q: donde no hay nada que calcular, no se propone nada.

### 2.4 · El modal de vía aérea, siempre en el primer turno

> *«Debería aparecer igual el modal de qué pasó con la vía aérea la primera
> vez.»*

Porque el paciente pudo haberse intubado en ese mismo turno. Si no se declara
nada y después se elige TOT, se entiende que llegó con TOT. Dentro del mismo
turno también puede cambiarse el tubo o extubarse: ahí el evento pregunta
**solo cómo queda**.

🪤 Sigue valiendo entera la regla de siempre: los eventos de vía aérea se
registran **a mano**. El modal recuerda, no decide.

### 2.5 · «No corresponde» pasa a ser un NO con razón

> *«Ahora extubación y PVE hay que arreglarlo de tal forma que quede más claro.
> Ahí deberíamos trabajar, ya que el "no corresponde" igual es un no.»*

Hoy «no corresponde» y «no se hizo» caen en el mismo saco y después no se puede
contar ninguna de las dos cosas. Pasa a ser **un solo NO que siempre pide
razón**, y las razones no las invento yo:

> *«Según protocolo son las de la imagen.»* — tres capturas del **Protocolo de
> Destete y Extubación** de la unidad.

Van en **dos niveles, que no se mezclan**:

- **No aplica el protocolo** (3): adecuación del esfuerzo terapéutico, VMI menor
  a 24 horas, VM domiciliaria.
- **Criterio de la evaluación diaria** (8): cuadro clínico no resuelto,
  inestabilidad hemodinámica, parámetros de oxigenación/ventilación alterados,
  infección activa, conciencia o sedación que no permita SAS 3-4, ausencia de
  esfuerzo respiratorio, inestabilidad metabólica, anemia.

🔵 La diferencia entre los dos niveles es la que hace que el dato sirva: «a este
paciente el protocolo no se le aplica» vale para todo el episodio; «hoy no se
puede» vale solo para hoy. Contarlas juntas mezclaría dos cosas distintas.

### 2.6 · La extubación sale de dentro de la PVE

> *«Separar extubación de PVE me parece bien, dale.»* (propuesta mía, aprobada)

Son dos hechos distintos y hoy están anidados: se puede pasar una PVE y no
extubar, y se puede extubar sin PVE. **La prueba se registra como prueba y el
evento de vía aérea como evento**, cada uno por su lado.

### 2.7 · Los días se cuentan por horas, no por calendario

> *«Días de vía aérea, que haga el cálculo respecto a las horas. 27 horas 1 día.
> 12 horas 0 días.»*
>
> *«El control de días de VM y de estadía debe ser el mismo: pasado 24 horas
> cuenta 1 día. Decía que 35 horas por ejemplo son 1 día. Pasó las 48 horas
> considero 2 y así.»*
>
> *«38 horas es 1 día.»*

**Cada 24 horas completas suma un día y lo que sobra no cuenta.** Los cortes son
24, 48, 72. Igual para los tres: vía aérea, VM y estadía.

| Horas | Días |
|---|---|
| 12 h | 0 |
| 27 h | 1 |
| 35 h | 1 |
| 38 h | **1** |
| 48 h | 2 |

🪤 La fila de 38 h estuvo en duda: en el primer mensaje decía 2 y la regla daba
1. **Diego zanjó 1.** Queda escrito acá porque es exactamente el tipo de detalle
que después aparece raro en un informe y nadie se acuerda de dónde salió.

🪤 **Consecuencia que hay que tener presente:** el REM cuenta días cama por
calendario. Con este cálculo, el día de estadía que ve el colega y el día cama
del REM van a diferir en los bordes. No es un error, pero si los dos aparecen en
pantalla hay que decir cuál es cuál.

🔵 **Desbloquea algo que se había apagado.** El candado que limitaba la PVE por
días de VM se calculaba por calendario y bloqueaba a colegas que por horas
reales sí cumplían el protocolo; la solución de entonces fue apagarlo. Con el
conteo por horas puede volver a servir — y el protocolo lo pide explícitamente:
**VMI menor a 24 horas es criterio de exclusión**.

En la tarjeta se muestra **«0 · 9 h»**: el día y las horas que lo respaldan, para
que nadie tenga que confiar a ciegas.

### 2.8 · El sistema marca, no decide

(propuesta mía, sin objeción de Diego)

Cuando el turno ya tiene los datos que el protocolo mira —PEEP, PaFi, FiO2,
SpO2, modo de VM, GCS, SAS, drogas vasoactivas—, el sistema **pre-marca en
ámbar** la razón que corresponde y muestra la cifra que la justifica: «Parámetros
alterados · PEEP 12».

🔴 Se puede desmarcar siempre. Es la misma regla que salió de la familia de bugs:
**un valor que pone el programa se marca como suyo y solo eso se suelta.**

---

## 3 · Evaluaciones y KTM — CERRADO el 19-sep-2026

Mockup: `claude.ai/artifact/1qqf353bXaEdWsk7RqGDFp`

### 3.1 · Lo que ya se arregló (no era decisión, eran errores)

> *«En registrar una evaluación no sale nada.»*

Reproducido con el reloj congelado. Eran **dos fallas encima**:

1. 🔴 **De noche la tarjeta quedaba con encabezado y sin cuerpo.** `hEgr()`
   escondía `#fcEgrCard` pero no `#fcEval`: quedaba «📏 Registrar una medición»
   sobre 26 píxeles de nada.
2. 🔴 **En el turno de ingreso el pool salía con cero chips.**
   `pasoEvalPintar()` cortaba con `if(!c.PATIENT_ID)`, y el PATIENT_ID se
   asigna al **ocupar la cama**, o sea al guardar. Mientras se ingresa, la cama
   todavía no lo tiene. Justo el momento en que el pool más sirve —paciente
   nuevo, las diez por medir— era el único en que no aparecía.

Los dos arreglados, con guardia escrita primero y vista roja:
`build/checks/medicion_no_queda_hueca.js`. **La guardia no cuida solo esta
tarjeta**: recorre todas y exige que ninguna quede con encabezado a la vista y
cuerpo vacío, en los cuatro escenarios (día/noche × ingreso/paciente).

🪤 **El pool ya existía y lo había pedido él mismo el 17-sep** («que se abran
solas de forma individual y no que aparezcan todas de golpe»). Antes de
construirlo de nuevo valía la pena ir a mirar: son diez chips —MRC-ss, FSS-ICU,
CPAx, Pimáx, PEmáx, FEmáx, Dinamometría, IMS, Ecografía y Protección de vía
aérea— cada uno con su último valor, la fecha y la firma de quien midió.

### 3.2 · La KTM de noche: se ve y no se llena

> *«En turno no aparece KTM aunque lo estoy probando de noche… debería mostrar
> al menos el pool de evaluaciones.»*
>
> *«KTM A.»*

En agosto se acordó que de noche la KTM no aplica y **la tarjeta se escondía
entera**. Eso le hizo perder tiempo buscando algo que el sistema había guardado
sin decirlo. Le ofrecí tres caminos y eligió el **A**:

| | Opción | Qué pasaba |
|---|---|---|
| **A** | **Se ve, no se llena** | ✅ **Elegida.** La tarjeta aparece apagada y dice por qué. |
| B | Se puede llenar igual | Descartada: rompe la estadística. |
| C | Se queda oculta | Descartada: es lo que le hizo perder el rato. |

**Lo que cambia:**

- La tarjeta de Rehabilitación **se ve de noche**, atenuada, con todos sus
  controles apagados.
- Sale un aviso que dice **por qué** — y de paso aclara la confusión que la
  tarjeta escondida provocaba: *la KTR respiratoria sí se registra de noche, y
  está arriba, en Respiratorio*.
- Los **diez chips del pool** quedan en **solo lectura** de noche: se ven con su
  último valor, fecha y firma, pero no se tocan, y una línea lo explica. Eso
  cierra el tercer defecto que había quedado anotado.

**Lo que NO cambia:** de noche la KTM sigue **sin registrarse**, y el estado
nace **neutro** —ni «realizada» ni «no realizada»—, porque forzar «no realizada»
hacía que cada evolución nocturna narrara algo que la estadística manual nunca
tuvo. Se descartó la opción B por eso mismo: hoy «KTM de noche» significa cero
**por definición**; si a veces hay dato y a veces no, el porcentaje de
cumplimiento deja de querer decir algo.

🪤 **Esto cambió una convención anterior a propósito**, y la guardia que la
exigía (`regresion_ui.js`, «tarjeta oculta») quedó actualizada con la razón
escrita. Lo nuevo lo cuida `build/checks/ktm_de_noche.js`.

🪤 **Y destapó la trampa del reloj por cuarta vez.** Al hacer que la pantalla
dependa del turno, **tres guardias que leían la hora real** —`cuatro_pasos`,
`ktm_sesiones` y `paso_evaluaciones`— se pusieron rojas solas: verdes de día,
rojas de noche. Ninguna congelaba `SHIFT`. Quedaron con el turno fijo y el
motivo escrito adentro. `ktm_sesiones` ya congelaba la **fecha** y no el
**turno**: no son lo mismo.

### 3.2b · El IMT y la EMS van en el mismo paquete

Se lo planteé como una tarjeta aparte que quedaba fuera del acuerdo, y me
corrigió:

> *«IMT y EMS son parte de la terapia física, es decir es rehabilitación, parte
> del paquete. Movilización precoz (posicionamiento, movilidad pasiva activa),
> EMS e IMT. Podría ir de noche apagada.»*

Así que la tarjeta de **IMT / EMS** dejó de esconderse de noche y **se apaga
igual que la KTM**, con su propio aviso. El aviso se repite a propósito: es otra
tarjeta, y una apagada sin explicación deja igual de perdido que una que
desaparece.

🔵 **Y deja dicho de qué se compone la terapia física**, que hasta ahora no
estaba escrito en ninguna parte:

| La terapia física es | Dónde vive hoy |
|---|---|
| Movilización precoz — posicionamiento, movilidad pasiva y activa | Rehabilitación (KTM, niveles 1-5) |
| EMS — electroestimulación muscular | Tarjeta IMT/EMS |
| IMT — entrenamiento muscular inspiratorio | Tarjeta IMT/EMS |

🪤 **Queda una pregunta abierta que no toqué:** si para el equipo es *un* paquete,
puede que también tenga que ser *una* tarjeta. Hoy son dos, y el posicionamiento
y la movilidad pasiva/activa no se registran como tales sino a través del nivel
de KTM. No lo cambio sin que Diego lo pida.

### 3.3 · KTR no es KTM, y el aviso lo dice

La KTR respiratoria vive en **Respiratorio** y se registra de noche igual que de
día; la KTM motora vive en **Rehabilitación**. Son dos cosas que se llaman casi
igual y están en pantallas distintas, y con la tarjeta escondida no había dónde
enterarse. **El aviso de la opción A lo dice en pantalla**, así que la pregunta
se contesta sola: quien busque la KTR de noche va a leer dónde está.

### 3.4 · Lo que sale gratis si esto sigue

Con el pool sabiendo qué falta, sale el **porcentaje de cumplimiento** por
episodio y por unidad — la misma vuelta de tuerca del acuerdo 1.8. 🪤 Con una
advertencia: **no todas las diez aplican a todos los pacientes**; a un sedado
profundo no se le mide MRC ni FSS y contarlo como «no cumplido» sería castigar
al equipo por hacer lo correcto. Qué entra en el denominador es conversación
aparte.

### 3.5 · Lo otro que lo frenó esa noche

> *«No aparece firma, así que no puedo avanzar al relato.»*

Arreglado antes: el selector estaba vacío porque los nombres del equipo salieron
del código por privacidad y todavía no se leían de la planilla. Ahora
`equipoRoster()` lee la hoja **KINESIOLOGOS**, y si está vacía el selector lo
dice en vez de quedarse mudo.

---

## 4 · Prono — CERRADO el 19-sep-2026

Mockup: `claude.ai/artifact/SAHsrZc9R6PvHBu9NnDK5n`

> *«Prono y supino deberían declararse arriba.»*

### 4.1 · Lo que ya está hecho (y no lo sabía cuando lo pidió)

El 17-sep el prono **salió de la traqueostomía** y tiene sección propia:

> *«Prono y supino viven junto a TQT; eso es un procedimiento en caso de falla
> respiratoria catastrófica y es un evento aparte, no relacionado con TQT.»*

Pero quedó **al final del bloque respiratorio**, después de todos los parámetros
del ventilador. En el teléfono, eso es scroll.

🔵 **Y el motor del ciclo ya existe y funciona.** `PRONO_INICIO_TS`, `SUPINO_TS`
y `PRONO_HORAS` guardan cuándo empieza, cuándo termina y cuánto duró, y el ciclo
**cruza turnos y días** sin perderse. La entrega de turno ya escribe «🔃 En prono
14,5 h (desde el 18-09)». Lo que falta no es el motor: es que **la pantalla del
turno lo use** en vez de pedir a mano lo que el sistema ya sabe.

### 4.2 · Un evento que arrastra el estado — construido

Le propuse un estado y un botón, y él lo formuló mejor:

> *«El prono como evento puede arrastrar estado hasta que se suspenda con
> supinar? Eso en vez de tener varios botones porque prono y se prono este turno
> puede confundir.»*

Eso es lo que se construyó. **Seis controles pasan a uno.** Cuatro situaciones,
un botón en cada una:

| Situación | Lo que se ve | El botón |
|---|---|---|
| Sin prono | «Supino» | **Pronar** |
| Se pronó en este turno | «🔃 En prono» + la hora | **Deshacer** |
| Viene pronado de antes | «🔃 En prono · ⏱ 14,5 h · desde 18-09 21:30» | **Supinar** |
| Se supinó en este turno | «Supinado · ciclo de 36 h» | **Deshacer** |

🔴 **El estado se arrastra del CICLO, no del turno anterior.** Antes venía de
replicar la fila previa: si un turno se saltaba, el paciente «dejaba» de estar en
prono sin que nadie lo supinara. Ahora sale del ciclo abierto que el servidor
guarda, y ése vive en el episodio.

🪤 **La cicatriz no se reabre, se resuelve mejor.** La casilla «se prona este
turno» existía porque Diego reportó que el sistema contaba una pronación en
**cada** turno que el paciente siguiera boca abajo. Con este modelo el **evento**
se registra una sola vez —el turno en que se toca «Pronar»— y el **estado** se
deriva del ciclo. Las dos columnas se siguen escribiendo separadas: lo que cambió
es quién las marca.

🔴 **Ninguna columna cambió.** `RESP_POS_PRONO`, `RESP_PRONO_EVENTO`,
`RESP_POS_SUPINO`, `RESP_SUPINO_EVENTO` y las horas se escriben igual que antes,
así que el servidor, la entrega, la timeline y el texto clínico siguen intactos.
Las seis casillas viejas siguen en la pantalla, **escondidas y vivas** — mismo
patrón que `fCoop` con la interpretación del S5Q.

Lo cuida `build/checks/prono_un_boton.js`.

### 4.3 · Lo que quedó pendiente

| # | Pendiente | Estado |
|---|---|---|
| 1 | Subir el prono a la primera fila, junto a vía aérea y soporte | **sin hacer** — la franja sigue donde estaba |
| 2 | Mostrar el prono en la tarjeta de la cama | **sin hacer** |
| 3 | ¿Hay un número de horas que valga la pena avisar? | **sin respuesta** — no invento un corte |

🪤 **Y una limitación que conviene saber:** si en un mismo turno se prona **y** se
supina —un prono que no se tolera y se revierte a las dos horas—, el modelo solo
guarda el último de los dos. Ya era así antes; no lo empeoré, pero tampoco está
resuelto.

🔃 **Lo que la guardia de las horas dejó mejor de paso.** `prono_horas_a_la_vista`
existe porque Manuel avisó que no se veían las horas en el celular: el número
vivía en un tooltip y en táctil no hay hover. Con el control nuevo, el «desde
cuándo» **también dejó de ser tooltip** y se lee escrito al lado.

### 4.4 · Lo que NO se vuelve a preguntar

🔒 **El prono vigil está zanjado.** La franja aparece solo con el paciente en
**VM**, por decisión de Diego de agosto: *el prono vigil fue práctica de pandemia
y la evidencia actual no lo respalda como rutina*. El caso excepcional va en
texto libre. Queda escrito acá porque es justo el tipo de cosa que alguien vuelve
a proponer en tres meses sin saber que ya se decidió.
