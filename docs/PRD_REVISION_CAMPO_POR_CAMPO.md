# PRD · Revisión campo por campo del panel de evolución

**Estado**: decidido, sin programar (17-sep-2026). **Dueño**: Diego Melo Villagrán.
**Escribe**: Claude, 17-sep-2026.

**De dónde sale**: revisión sección por sección con Diego, en voz, durante el
16 y 17 de septiembre. Doce secciones miradas campo por campo. Todo lo que dice
«medido» acá se comprobó corriendo el código, no de memoria.

**Qué es esto**: la lista de verificación de la tanda de programación. Diego lo
dijo así: *«la intención de esto es darle forma y rediseñar el panel de
evolución; luego depuraremos el registro y las cosas que se pueden hacer y qué
cosas están demás, y así con todas las otras pestañas»*. O sea: **esta tanda es
de FORMA**. La poda viene después, y después vienen las otras pestañas.

**Fuera de alcance**: la planilla de producción (no se toca nunca), el modelo
episodio/turno (ya está), la PWA y el login (hechos), y el renombrado de las
columnas por dentro (decisión aparte: hoy se resolvió con el rótulo legible).

---

## 0 · Lo que Diego quiere, en sus palabras

> «Quiero disminuir el ruido visual que puede entorpecer un poco la evolución y
> hacerla engorrosa. Que sea un diseño más minimalista, que sea amigable de
> completar y que no cause estrés al llenarlo. Que no pase ese típico comentario
> de que no sé dónde están las cosas, me mareo.»

**El número a bajar, medido hoy**: un turno normal (paciente con TOT en VM, sin
sedación) muestra **92 campos** y **5.074 px** de alto — unas seis pantallas de
teléfono. Y **1.360 caracteres de texto explicativo**, de los cuales **628 están
en una sola sección de cinco campos** (🧰 Dispositivos): 126 caracteres de
explicación por campo, cuando la siguiente peor tiene 20.

**La regla de diseño que sale de ahí**: cada pantalla pregunta una cosa, nada
está a la vista si no aplica, y **el estado habla solo en vez de explicarse**
(un chip «HME · vence mañana» en lugar de un párrafo que explique la regla).

---

## 1 · El camino nuevo: cuatro pasos

```
1 · Prevención NAVM  →  2 · Turno  →  3 · Evaluaciones  →  4 · Relato
   lo que se mira        lo clínico     las mediciones      la evolución
```

La prevención va **primero** porque es el orden real del trabajo. Diego:
*«llegas, miras: está con tubo traqueal, está ventilado, está sentado o en 30
grados en la cama, tiene el cuff bien… y después me voy a revisar lo
ventilatorio. Antes de hacer alguna terapia tengo que asegurarme de que el cuff
esté bien inflado y que la posición del paciente sea la correcta»*.

Si fuera al final se completaría de memoria al cerrar la evolución, en vez de
mirando al paciente.

### El orden de las secciones ya era el correcto

Al listarlas completas apareció que **el formulario ya sigue el orden en que
Diego narra**: día y motivo → sedación → hemodinamia → auscultación →
respiratorio. Lo único que lo rompía era que los datos del tubo estaban en
«General», tres secciones antes de donde se usan. Eso se arregla mudándolos
(§3).

---

## 2 · Paso 1 · Prevención de NAVM (módulo nuevo)

Cinco líneas, **un toque cada una, sin párrafos**:

```
Prevención de NAVM                   Cama 7 · TOT · ventilación mecánica

  Filtro HME  ( Filtro HME | Humidificación activa )     vence hoy
              puesto el 15-09                      [ vigente ] [ lo cambié ]
  Filtro HEPA   vence mañana · puesto el 16-09     [ vigente ] [ lo cambié ]
  Trach Care    vence mañana · puesto el 16-09     [ vigente ] [ lo cambié ]
  ── ANTES DE LA TERAPIA ──
  Cabecera 30-45°                                  [ correcta ] [ la corregí ]
  Presión de cuff  20-30 cmH₂O        [ en rango ] [ la ajusté ] [ desinflado ]

                    No pude — dejar razón        →  Seguir al turno
```

**Son tres relojes, no dos** (Diego, 17-sep-2026): *«cada uno tiene sus fechas
distintivas: dos días para HME, tres días para HEPA, al igual que la Trach
Care»*.

**La salida «no pude» no es un tercer botón en cada fila**: es uno solo abajo,
al lado de «Seguir al turno». Así cada fila queda en dos toques limpios y la
excepción vive donde de verdad bloquea.

**El paso entero desaparece —pestaña incluida— cuando no hay nada que
prevenir**: sin vía aérea artificial ni ventilación no se muestra un paso vacío
que además bloquearía el avance.

### Los dos casos que se resuelven solos

Diego los planteó como problemas, con varias opciones cada uno. Midiendo
apareció que **el servidor ya los decide** (`estadoDispositivos`, svc_eventos.gs):

- **Humidificación activa.** Es excluyente con el HME (humidificación pasiva ↔
  activa). En pantalla, la fila del HME lleva un **selector de dos posiciones**
  en el lugar del nombre; al elegir la activa el reloj del HME se apaga, la
  fila deja de pedir toque y deja de bloquear. Es la segunda opción que
  propuso Diego: *«que aquí mismo esté desplegable la opción en la misma fila
  de HME… si uno selecciona humidificación activa, anula las fechas del HME»*.

- **HEPA del ventilador.** En un Puritan Bennett o una Avea el filtro es del
  equipo y no se cambia (`CONFIG HEPA_FIJO_EQUIPOS`, por prefijo del nombre:
  «PB 1», «PB 2», «Avea 1», «Avea 3» calzan sin enumerarlos). La fila **se
  muestra** —su fecha es la referencia de instalación, un dato real que no hay
  que perder— pero no pide toque ni bloquea. Nadie tiene que escribir «no
  corresponde ventilador»: el sistema ya sabe qué ventilador tiene la cama.

### 🔴 El paso NO escribe fechas

**Medido**: el cambio de dispositivo **ya es un evento** (`svc_eventos.gs`): el
botón ➕ reinicia el reloj en la cama, deja hito `'dispositivo'` en la línea de
tiempo con hora, autor y detalle, y **se niega** a anotar hacia atrás si la cama
ya tiene otro paciente.

Hoy la fecha vive en **tres** lugares y la tercera sobra:

| Dónde | Qué guarda | ¿Hace falta? |
|---|---|---|
| La cama | el reloj vigente | **sí** — estado del episodio |
| La línea de tiempo | el cambio, con hora y quién | **sí** — el evento |
| La fila del turno (`DISP_*_FECHA` en EVOLUCIONES) | una copia | **no** |

Peor que redundante: es una **segunda puerta al mismo reloj**. Hoy la fecha se
escribe desde el formulario del turno *y* desde el evento ➕. Dos puertas a un
mismo dato es lo que este proyecto ya pagó tres veces (el desajuste 119≠132, los
nueve escapadores, las dos rutas de la extubación).

**Entonces**: el paso muestra el reloj y, si hay que cambiar, dispara **el mismo
evento que ya existe**. Una sola puerta. Sin hoja ni pestaña nueva: el estado en
la cama, el cambio en la línea de tiempo — las dos casas ya existen.

### Qué obliga y qué no

- **Obligatorio para pasar a la evolución**: que el filtro HME y el Trach Care
  estén **vigentes o recién cambiados**. Kinesiología está a cargo de ellos y es
  medida de IAS.
- 🔴 **Pero se puede pasar con razón escrita** si de verdad no se pudo cambiar
  (paciente en pabellón, sin insumo). Bloquear de verdad haría que la gente
  invente una fecha para poder avanzar, y ahí se pierde el dato *y* la medida.
- **Cabecera y cuff: opcionales.** Su omisión **es** el dato del cumplimiento.

### El cumplimiento se mide solo

Turnos con las cuatro líneas tocadas ÷ turnos con vía aérea artificial. No hay
que preguntar «¿lo hiciste?».

### Las reglas no se explican

Diego: *«las reglas en sí no hay que explicarlas tanto; se entiende hoy en día
la forma de trabajar: si el filtro vence hoy, se debe cambiar hoy»*. El chip
«vence hoy» dice la regla. Los 628 caracteres de Dispositivos **se cortan, no se
mudan** — si se mudan tal cual, el paso nuevo pasa a ser la pantalla más ruidosa
de la app.

### 🔴 Cuidado al programar

Los filtros y el Trach Care **no son solo una verificación: son estado del
episodio**. Si el paso se puede saltar, las fechas tienen que seguir viviendo en
la cama. Saltarse el paso no puede borrar el reloj de un dispositivo instalado.

---

## 3 · Paso 2 · El turno

### 3.1 · 📊 General

Hoy **36 campos**. Queda en **13**.

| Decisión | Detalle |
|---|---|
| **Los contadores de días: solo el que corresponde** | con tubo → días de tubo; con TQT → días de TQT; con VNI → días de VNI. Los días de VM, siempre. |
| **Fuera el contador de «vía aérea artificial»** | Diego: *«tubo y TQT son vía aérea artificial, eso se repite»*. |
| **La fijación del tubo se borra** | El estándar es arcada dental y el texto ya lo dice. Era campo fantasma: escondido, se cargaba al abrir y al guardar se escribía la constante ignorándolo. |
| **El tubo y la TQT se mudan a Respiratorio** | Número, cm, tipo de cánula, cambios de tubo y de cánula, y los contadores. General se queda con día, ficha, AET, reingreso y aislamiento. |
| **La presión de cuff se muda a Prevención** | §2. |

**Lo que está bien y no se toca**: la ficha previa (ingreso, Barthel, Charlson,
APACHE, ECF) se pliega sola tras «✏️ Editar ficha» y solo se abre en el ingreso.
Los otros tres campos ocultos sí llevan dato (microorganismo del aislamiento,
día de vía aérea, estado del cuff): son chips con su casilla invisible detrás, no
fantasmas.

### 3.2 · 🧠 Sedación y Conciencia

**Correcciones clínicas de Diego que yo tenía mal**:

- **El escalón es la DOSIS, el SAS es la PROFUNDIDAD.** Un paciente en escalón 3
  puede estar profundamente sedado.
- **El Glasgow siempre es evaluable.** En un SAS 1 da 3 puntos, que es un dato,
  no un vacío. **No se esconde nunca.**

| Decisión | Detalle |
|---|---|
| **🔴 El Glasgow arranca vacío** | Hoy trae O:4, V:5, M:6 marcados por defecto en el HTML: si nadie los toca, **la evolución afirma un Glasgow que nadie midió**. |
| **Se arrastra del turno anterior** | Una vez medido, es el punto de partida del siguiente. |
| **El relato solo lo nombra si hay dato** | |
| **«fentanyl» → «fentanilo»** | |
| **La frase** | «Sedado en escalón 6 con fentanilo y propofol, SAS 3 (meta 1).» |

**El automático que sí se queda**: con SAS 1 o bloqueo neuromuscular el sistema
pone Glasgow 3T solo. Medido y correcto — es lo que Diego describió.

#### La escala SAS, contrastada con la literatura

A pedido de Diego se comprobó su memoria contra la escala de Riker publicada.
**Coincide prácticamente exacta.** Único matiz: el SAS 2 **sí despierta** al
estímulo físico; lo que lo define es que no comunica ni obedece órdenes.

| SAS | Descriptor | ¿Coopera? |
|---|---|---|
| 1 | Respuesta mínima o nula al estímulo doloroso | no |
| 2 | Despierta al estímulo físico, no comunica ni obedece | no |
| 3 | Despierta al hablarle, **obedece órdenes simples**, se vuelve a dormir | sí |
| 4 | Calmado, despierta fácil, **obedece órdenes** | sí |
| 5 | Agitado, **se calma con instrucciones verbales** | sí |
| 6 | No se calma pese a recordatorios, requiere contención, **muerde el tubo** | no |
| 7 | Agitación peligrosa: se tira del tubo, golpea al personal | no |

#### Los gates

| | Sin sedación | SAS 1-2 | SAS 3-4-5 | SAS 6-7 |
|---|---|---|---|---|
| **Cooperación y S5Q** | sí | no | sí | **no** ← falta |
| **CAM-ICU** | sí | no | sí | **sí** ← falta |

**Medido**: el extremo bajo ya funciona (S5Q y CAM-ICU se esconden con SAS 1-2 o
Glasgow < 8). Falta el extremo alto. Y hay un desajuste: el comentario del código
dice «requieren SAS 3-4» pero la condición solo mira `SAS < 3`, así que 5, 6 y 7
pasan.

**El CAM-ICU se queda visible en SAS 6-7** porque el delirium **hiperactivo**
vive justo ahí. La literatura pone solo un piso (RASS ≥ −3 = SAS ≥ 3), no un
techo. Diego: *«el delirium hipoactivo, malamente por cultura, le gusta al
personal de UCI porque no se mueve»* — por eso el CAM-ICU importa más en el
paciente tranquilo y en el que no tiene sedación.

**En SAS 1 y 2 se esconde la casilla de cooperación pero «No cooperador» se
sigue guardando**, porque es cierto.

**Ya funciona y no se toca**: el SAS aparece siempre que haya sedación, incluida
la vigil con Precedex (la casilla de sedación vigil solo existe dentro de
«sedado»).

### 3.3 · ❤️ Hemodinamia

| Decisión | Detalle |
|---|---|
| **La FC y la arritmia van al relato** | Medido: hoy solo se guardan. No entran al relato, ni a la entrega, ni a la hoja impresa, ni a ningún indicador. |
| **La tendencia arranca vacía y obliga a elegir** | Hoy queda «HTA» puesta por ser la primera opción: mismo patrón del Glasgow. Se pide antes de guardar, como la razón de la PVE. |
| **La meta de PAM se queda** | Puede ir vacía. |
| **Minúscula en medio de frase** | «con tendencia a la **hipotensión**», no «Hipotensión». |

### 3.4 · 🧠 Neurología y 🧿 UPOT

Las dos están bien gateadas y todo lo que preguntan se narra. Tres cambios:

| Decisión | Detalle |
|---|---|
| **La PPC se calcula** | PAM − PIC. Hoy son dos números independientes y se puede anotar una PPC que no cuadra. **La PAM se pide siempre que haya captor.** |
| **Subíndices fuera, en todas partes** | No era solo la DVE: el motor de texto usa las dos formas — cmH2O 7/14, FiO2 5/4, SpO2 5/2, O2 en general 25/6. La misma evolución dice «FiO2 40%» en una línea y «FiO₂ 40%» en otra. **Todo llano.** |
| **La frase de UPOT** | Solo «Paciente en seguimiento por UPOT». Fuera «con sospecha de muerte cerebral», que es una afirmación fuerte y automática. |

### 3.5 · 🩺 Auscultación

| Decisión | Detalle |
|---|---|
| **Dos campos fantasma se borran** | `fMPCalidad` y `fMPLoc`: declarados escondidos en una línea y **sin ningún otro uso en todo el archivo**. |
| **La redacción con preposición y en minúscula** | Hoy pega el valor del desplegable tal cual: «con Sibilancias **Ambos campos pulmonares**». Queda «con sibilancias **en** ambos campos pulmonares», «con roncus **en** CPI», «con crépitos bibasales». |

### 3.6 · 🧰 Dispositivos

Se disuelve: sus cuatro fechas pasan al paso de Prevención (§2) y los 628
caracteres se cortan.

### 3.7 · 🫁 Respiratorio

Ya programado (tres ejes: vía aérea · soporte · interfaz). Recibe el tubo y la
TQT que vienen de General (§3.1).

#### Terapia respiratoria

Acá los dos textos —pantalla y servidor— **ya dicen lo mismo**. Cambios:

| Decisión | Detalle |
|---|---|
| **El número de sesiones de KTR NO va al relato** | Diego: *«esto es solo texto narrativo, no se dice cuántas veces se atendió, solo que se hizo»*. El número se sigue guardando para el REM. **No es contradicción con la KTM** (§3.8): en el KTR se narra qué se hizo («KTR + SET»), en la KTM cada sesión tiene su nivel y su rendimiento, así que van individualizadas. |
| **La cantidad de secreciones sí va al relato** | Hoy se piden tres cosas y el texto dice dos. |
| **El orden**: «secreciones **mucopurulentas ligosas**» | Característica antes que reología. |
| **El decúbito lateral se narra**; **el sedente se saca** | |

#### 🔴 El prono se separa de la TQT

Hoy el prono y el supino viven pegados al bloque de la TQT, y **no tienen
relación**. Diego: *«es un procedimiento en caso de falla respiratoria
catastrófica y es un evento aparte»*.

**Los dos posicionamientos son distintos y van separados**:

- **Decúbito lateral** → técnica del turno, para favorecer un pulmón (atelectasia).
  Se queda en terapia respiratoria.
- **Cabecera 30-45°** → prevención de NAVM. Se va al paso 1.
- **Prono / supino** → evento que trasciende el turno. El supino es el que
  culmina el ciclo; *«lo importante es el prono»*.

**Medido antes de cortar**: `RESP_POS_SED` no alimenta ningún indicador ni el
REM. Solo aparece en la hoja diaria y en el resumen de la entrega, donde también
dejará de verse.

### 3.8 · 🏃 Rehabilitación · 💨 IMT/EMS

#### 🔴 Divergencia entre los dos textos

Con los mismos datos:

| | En pantalla (lo que ve y guarda el colega) | En el servidor (entrega y hoja impresa) |
|---|---|---|
| **IMT** | «Se realiza IMT.» | «Se realiza IMT 3 series al 40% de PiMáx por 10 min, descanso 60 seg entre series.» |
| **EMS** | «…(EMS) en cuádriceps.» | «…(EMS) en cuádriceps **(50 Hz, 25 mA, ancho de pulso 300 µs) por 30 min**.» |

El colega llena ocho parámetros, los ve desaparecer en pantalla y reaparecen
después. **Se unifican hacia el del servidor** (decisión de Diego): si se tomó el
trabajo de anotar la intensidad, que la vea en su evolución.

| Decisión | Detalle |
|---|---|
| **«con asistencia asistencia mínima»** | La plantilla añade «con asistencia» y el valor ya dice «Asistencia mínima». Está en los dos lados. |
| **El Borg va al relato** | Hoy solo se guarda: un único uso fuera del esquema. |
| **«durante 20 minutos»**, no «(20 min)» | Los dos textos diferían también en esto. |
| **El comentario de «no realizada»** | Hoy queda pegado en minúscula: «KTM no realizada por indicación médica. paciente en pabellón.» |

#### 🔴 Las sesiones de KTM van por separado

Diego: *«2 KTM, una nivel 2 y otra nivel 3, y pueden rendir de forma
diferente»*.

**Medido, de qué depende hoy el dato único**:

| Dato | Quién lo usa |
|---|---|
| **Cantidad** | el **REM** (sesiones = KTR + KTM) y los **indicadores** (atenciones) |
| **Nivel** | el relato, la **entrega de turno**, la **cama** (arrastra al turno siguiente) y la **categorización SOCHIMI** |

**El diseño**:

- Una columna nueva con **la lista de sesiones**; cada una con su nivel, su
  asistencia, sus minutos y su Borg.
- La **cantidad se deriva de la lista** → el REM y los indicadores siguen
  contando igual, sin tocarlos.
- **Manda el nivel más alto** para la entrega, la cama y la categorización: es el
  que marca la progresión.
- El relato las narra **individualizadas**, para que el colega pueda editarlas y
  describir más si quiere (Diego, 17-sep):

  > Se realiza KTM. Primera sesión: nivel 2 con asistencia mínima durante 20
  > minutos. Segunda sesión: nivel 3 con supervisión durante 15 minutos.

Diego avisó que este diseño *«no me gusta mucho, lo modificaré cuando lo vea en
vivo»*. Se construye así y se retoca con la pantalla delante.

**Lo que está bien**: los tres estados (realizada / no realizada / suspendida)
abren cada uno solo lo suyo; de noche la tarjeta desaparece entera; la válvula de
fonación, la educación y el IMS se narran; los nueve campos escondidos son
portadores de chips, no fantasmas.

### 3.8 bis · Los paneles «queda con» se llaman por su nombre

Diego (17-sep): *«"queda con" no me suena muy bien… "soporte post-extubación"
suena mucho más profesional»*. El título dice qué es; el verbo vive en el texto.

| Hoy | Queda |
|---|---|
| «Soporte PE» | **Soporte post-extubación** ← además muere una sigla que nadie entiende |
| «Queda con (post-intubación)» | **Soporte post-intubación** |
| «Queda con (post-reintubación)» | **Soporte post-reintubación** |
| «Queda con (post-traqueostomía)» | **Soporte post-traqueostomía** |
| «Queda con» *(decanulación)* | **Soporte post-decanulación** |
| «Queda con» *(desvinculación)* | **Soporte post-desvinculación** |

**En el relato**: «queda **con**» para el dispositivo, «queda **en**» para el
soporte sin dispositivo.

> Post extubación **queda con** naricera a 3 L/min.
> Post desvinculación **queda en** aire ambiente.

**Medido**: el motor ya usa las dos formas sin criterio — «Queda en
oxigenoterapia» (desvinculación), «queda con …» (post-extubación). Acá se fija.
Se descartó «se apoya con» porque se rompe con el aire ambiente.

### 3.9 · 🔧 Procedimientos del turno

| Decisión | Detalle |
|---|---|
| **🔴 El RCP no aparece en la pantalla** | Se narra en el servidor («Se realiza reanimación cardiopulmonar a las 14:20 hrs, 3 ciclos») y **no** en el cliente. Un paro no sale en la evolución que el colega lee y guarda. Se unifica. |
| **Los tres traslados van al relato** | Imagenología, pabellón y asistencia médica. Hoy no se narran en ninguno de los dos lados; sí llegan a la entrega. Un traslado a pabellón explica por qué no hubo KTM. |
| **🪤 El emoji 🩻 → 🖼️** | `svc_entrega.gs` todavía escribe «🩻 Traslado a imagenología». Es el de 2021 que Diego reportó como cuadrado el 6-sep. El botón de Synapse **sí se arregló** con un SVG propio; la entrega se quedó con el emoji. El formulario ya usa 🖼️ para esa misma casilla. |

---

## 4 · Paso 3 · Evaluaciones

Los chips ya funcionan como se quería: se abre una escala a la vez, mostrando lo
que el episodio ya tiene con su fecha y quién midió.

**Pero debajo hay una puerta vieja**: al marcar «registrar una medición» se abren
**17 campos de golpe**. Se corta.

### Los chips, al mismo nivel

| Chip | Abre |
|---|---|
| MRC-ss | |
| FSS-ICU | |
| CPAx | |
| Pimáx | |
| **PEmáx** | *(hoy sin chip)* |
| **FEmáx** | *(hoy sin chip)* |
| Dinamometría | |
| **IMS** | *(lo agrega Diego)* |
| **Ecografía** | grosor diafragmático, cuádriceps D/I, Heckmatt, engrosamiento D/I, excursión D/I |
| **Protección de vía aérea** | deglución + test de azul |

Regla: **una escala, un chip, se abre sola**. Se agrupan solo las que de verdad
se miden juntas. Diego: *«esto hace que cada uno seleccione de forma dirigida lo
que quiere medir y registrar, ya que no siempre se registra todo»*.

**Las evaluaciones sí se pueden omitir**: *«no podemos obligar a los colegas a
que evalúen el MRC»*. A diferencia de los filtros, que sí son obligables.

**La presión de cuff sale de acá** — se fue al paso 1. (Medido: hoy está en esa
tarjeta y **no llega a verse nunca**.)

---

## 5 · Paso 4 · Planes y Pendientes

Cinco campos: plan para el turno siguiente, nota del turno, firma, pendientes del
episodio y anotaciones. Ya rediseñado (los pendientes cruzan el turno, cualquiera
los cierra). **Sin cambios.**

---

## 6 · Bugs encontrados, para arreglar en la misma tanda

Todos medidos, ninguno es decisión de diseño:

1. **🔴 El relato del servidor dice «día ?»** en toda evolución con vía aérea
   artificial. `DIAS_VA` se calcula en pantalla y se muestra, pero **nunca se
   guarda**. En el navegador sale «(día 6)»; el mismo texto regenerado en el
   servidor —entrega de turno y hoja impresa— sale «(día ?)».
2. **Dos columnas muertas**: `VENT_CAB_RSS` (un solo uso: la fila «🛏️ Cabecera»
   de la hoja diaria, que **la lee** y por eso sale siempre vacía) y
   `VENT_CAB_RSS_DESC` (cero usos). Nadie las escribe. Se resuelven capturando la
   cabecera en el paso 1.
3. **`HEMO_PA`**: columna legacy sin uso, ya documentada. Se deja.
4. Las divergencias cliente/servidor de §3.8 y §3.9.
5. Los subíndices inconsistentes de §3.4.

---

## 7 · Cambios de esquema que implica

Todos **aditivos y al final de la lista**, como manda la convención:

- La lista de sesiones de KTM (§3.8).
- La verificación del paquete de prevención por turno: cabecera y cuff ya tienen
  columna; los filtros y el Trach Care necesitan el *estado de la verificación*
  (revisado / cambiado / vencido con razón), que es del turno.
- La razón de no haber cambiado un filtro vencido (§2).

**Se dejan de escribir** (no se borran — las posiciones son fijas): las cuatro
`DISP_*_FECHA` de EVOLUCIONES, que son la tercera copia (§2).

---

## 8 · Lo que NO se toca

- Los valores guardados de vía aérea, soporte y modo. Las evoluciones viejas se
  siguen leyendo.
- El REM y los indicadores: la cantidad de KTM y de KTR se sigue guardando igual.
- La regla de que los eventos de vía aérea se registran **a mano** por decisión
  clínica.
- La planilla de producción del hospital.

---

## 9 · Cómo se verifica

Cada punto de este PRD con guardia propia, **escrita primero y vista roja**. Las
que ya existen y van a tener que actualizarse con su razón escrita: `sas_real`,
`texto_congelado`, `plantillas_evolucion`, `dispositivos_reglas`,
`guardado_viajes` y `tablero` (las dos A/B contra el árbol congelado).

La batería completa tiene que quedar verde antes de cada commit. Hoy son **167
guardias**.
