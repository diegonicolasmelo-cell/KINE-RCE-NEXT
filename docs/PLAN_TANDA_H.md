# Plan · Tanda H — lo que Diego pidió el 11-oct-2026

> **Qué es esto.** Diego revisó los seis pasos en la app ya pegada y dictó una lista larga de correcciones.
> Acá están **ordenadas, agrupadas y con lo que falta decidir separado**, para programarlas por tandas.
> No es un acuerdo cerrado: lo que él confirme se escribe en `docs/ACUERDOS_REDISENO.md` con sus palabras.
>
> 🔴 **Nada de esto está programado todavía.** La app pegada hoy es el sello `NEXT-6.0-sereno`.

---

## 0 · La idea que ordena medio plan

Leyendo el dictado completo, la mitad de los pedidos son **la misma idea dicha cinco veces**:

> **El clínico anota el dato crudo; la interpretación la pone el sistema.**

- Elijo el diagnóstico → **el grupo REM se llena solo**.
- Elijo fentanilo y su escalón → **el texto arma la frase**.
- Anoto noradrenalina 0,1 → **«dosis alta/media/baja» viene por añadidura**.
- Anoto la frecuencia cardíaca en número → **«taquicárdico» viene por añadidura**.
- Marco las actividades que hice → **el nivel de KTM viene por añadidura, para la estadística**.

Palabras de Diego: *«la interpretación dosis altas medias o bajas viene por añadidura»*, *«el nivel viene por
añadidura para la estadística»*.

🪤 **Esto choca de frente con una cicatriz ya pagada** (`docs/LO_ESENCIAL.md` §3): *un valor que escribe el
programa se marca como suyo y solo eso se suelta; lo que tocó una persona no se toca*. El Glasgow de fábrica en
15 nació justo de ahí. Entonces la regla para toda esta tanda es:

- Lo derivado **se muestra como lectura, no como campo editable**: se ve «dosis alta», no un desplegable con
  «dosis alta» ya elegido.
- Si el clínico lo corrige a mano, **deja de derivarse** para ese turno y queda marcado como suyo.
- Lo derivado **no se guarda como si lo hubiera medido alguien**: se guarda el dato crudo, y la interpretación
  se recalcula al leer.

---

## 1 · Paso 0 · Datos personales

Hoy la tarjeta se llama «👤 Ingreso del paciente» (`#fcId`).

| | Qué pidió | Qué hay hoy |
|---|---|---|
| 1.1 | Renombrar a **«Datos personales»** | «Ingreso del paciente» |
| 1.2 | Línea 1: **nombre · RUT · nombre social** | ya está así |
| 1.3 | Línea 2: **edad · sexo · talla** | ya está así |
| 1.4 | Línea 3: **diagnóstico de ingreso · grupo REM**, en la misma línea | ya están juntos (`#fDx`, `#fRem`) |
| 1.5 | 🔴 **El grupo REM se llena solo desde el diagnóstico** | hoy se elige a mano, suelto |
| 1.6 | Línea 4: **procedencia · fecha · hora** | ya está así |
| 1.7 | 🔴 **Línea nueva: vía aérea de ingreso** — Natural · TOT · TQT | no existe como línea propia |
| 1.8 | Al lado, **soporte de ingreso** | existe (`#ingSoporte`), pero abajo y con otros nombres |
| 1.9 | Renombrar las opciones de soporte | hoy: VM invasiva · VM no invasiva · Oxigenoterapia · Sin apoyo |

**Opciones nuevas de soporte de ingreso (1.9):** `VMI` · `VNI` · `MMV` · `NRC` · `CNAF` · `AMBIENTE`.
Las tres del medio reemplazan al genérico «Oxigenoterapia» y «Sin apoyo» pasa a llamarse `AMBIENTE`.

🪤 El soporte de ingreso **no es un dato nuevo**: es una puerta a los tres selectores de siempre (vía aérea ·
soporte · interfaz), que siguen siendo la única fuente de verdad. Renombrar los botones no debe crear una
cuarta copia del dato.

**Falta decidir:** la tabla diagnóstico → grupo REM (ver §12, pregunta A).

---

## 2 · Fase clínica

Pedido: *«está bien, pero que se entienda mejor que uno puede escribir la fase clínica a mano también»*.

Es solo claridad en pantalla: el campo libre ya existe, pero no se ve que está. Un rótulo y un sitio visible
para escribir, sin cambiar la lógica.

---

## 3 · Sedación y conciencia

El cambio más grande de la tanda. Hoy hay **un escalón global** (`#fSed`, «Escalón 1» a «Escalón 6») y aparte
una lista de fármacos marcables (`#sedFarmacos`: Fentanilo, Propofol, Midazolam, Ketamina, Precedex, Lorazepam).

**Lo que pidió:**

1. 🔴 **El escalón es POR FÁRMACO, no uno solo.** Palabras suyas: *«los sedantes tienen diferente dosis, no
   siempre es el mismo escalón»*. Primero se eligen los sedantes y **cada uno lleva su escalón**:
   fentanilo E3, propofol E5.
2. La **meta SAS** se anota igual que hoy.
3. 🔴 **Si la meta no coincide con el SAS actual, el texto lo dice.** Su ejemplo textual:
   > «sedado con fentanilo E3, propofol E5 para meta SAS 1, sin embargo en SAS 3…»
4. **El BNM se elige DESPUÉS** de todo esto. Texto: *«sedado y neurobloqueado para SAS 1»*.
5. 🔴 **El GCS va después del SAS**, y se narran juntos. Su ejemplo:
   > «SAS 1 / GCS 3T (O:1, V:1, M:1)» — la **T** cuando hay vía aérea artificial.
6. El resto del apartado se queda como está.

**Lo que esto obliga a tocar:**
- El campo `SED_FARMACOS` ya guarda una lista; pasa a guardar **pares fármaco + escalón**.
- `SED_TIPO` (el escalón único) queda sin uso; hay que decidir si se jubila o se deriva del máximo.
- El motor de texto, en sus **dos espejos**: el del navegador (`genTexto`) y el del servidor
  (`dominio_texto.gs`). La guardia `relato_espejo.js` exige que digan lo mismo.

**Falta decidir:** qué dosis corresponde a qué escalón, por fármaco (§12, pregunta B).

---

## 4 · Hemodinamia

Hoy: estado estable/inestable, un desplegable `#fDVA` con «dosis baja/media/alta» **elegido a mano**, una
casilla «Multi-DVA» con un contador, la FC como palabra (`#fFC`: eucárdico, taquicárdico, bradicárdico) y la
meta PAM escondida tras una casilla.

**Lo que pidió:**

1. Estable / inestable, y después **elegir 1, 2 o más DVA**, igual que los sedantes.
2. Las DVA son: **noradrenalina · adrenalina · vasopresina · dopamina**.
3. Cada una con **su dosis en número** (0,1 · 0,02 · 1,0) **y su unidad de medida**.
4. 🔴 **«Dosis alta, media o baja» viene por añadidura**, no se elige.
5. 🔴 **La FC se anota en número**; «taquicárdico» viene por añadidura. Podría ser número **y** rango.
6. 🔴 **La meta PAM no es solo para neuro**: se anota siempre que esté estipulada, y **sale en el texto**.

**Falta decidir:** los cortes de dosis por fármaco y los rangos de FC (§12, preguntas C y D).

---

## 5 · Auscultación

Pedido: *«se ve bien, no hay mucho que corregir»*. **No se toca.**

---

## 6 · Terapia ventilatoria

1. **Los días de VM o VNI se mueven a la segunda línea**, justo bajo el título «Respiratorio · Terapia
   ventilatoria». Hoy están repartidos.
2. 🔴 **Resumen en una frase**, en vez de días sueltos. Su ejemplo:
   > «VAA natural desde su ingreso» · «VNI (segundo día), modo S/T»
   Los **días del modo dan igual**: el modo cambia sin que eso cuente.
3. 🔴 **La vía aérea deja de elegirse acá.** Se elige en el paso 0, y si cambia **es porque hubo un
   procedimiento**. Debajo del resumen va un bloque nuevo:

   **Procedimientos de vía aérea** → «¿Intubación? sí / no» → al decir que sí se despliega:
   **número del tubo** y **a cuántos centímetros**.
4. El **soporte** sigue eligiéndose: `VMI` · `O2` · `ambiental`. Los dos últimos son raros, pero tiene que
   poder anotarlos. El modo se queda como está.
5. 🔴 **Sacar la GSA** de esta vista, *«para limpiar un poco de info»*.

🪤 El punto 3 es delicado: hoy la vía aérea del turno es la fuente de verdad de los contadores de días, del
banner y del relato. Mover su elección al paso 0 **no puede** dejar a los contadores sin de dónde leer. Y ya
existen `extubacion_una_ruta.js` e `intubacion_modulo_evento.js`, que fijan que el evento se declara una sola
vez: el bloque nuevo tiene que ser **esa misma puerta**, no una segunda.

**Falta decidir:** qué significa «sacar la GSA» (§12, pregunta E).

---

## 7 · PVE

Pedido: *«el mismo flujo actual, pero exijo que sea más claro cuando se despliega… se entiende "se extubó",
pero está pequeño, muy junto; quizás rediseñar eso»*.

**No cambia ninguna regla**: es puro tamaño, aire y jerarquía al desplegarse. La parte de «se extubó» tiene que
leerse de un vistazo.

---

## 8 · Manejo respiratorio

### 8.1 · KTR
*«está bien»*. No se toca.

### 8.2 · Permeabilización de vía aérea 🔴
Hoy son cinco casillas sueltas (SOF, SNF, SNT, SET, asistencia de tos). Pasa a ser **una lista desplegable
condicionada a la vía aérea**:

| Vía aérea | Opciones |
|---|---|
| **Natural** (con VNI u oxigenoterapia) | SOF · SNF · asistencia de tos **y sus combinaciones**: SOF+A.tos · SNF+SOF+A.tos · SNF · SOF… |
| **TOT o TQT** | SOF · SET |

### 8.3 · Secreciones
- **Agregar**: hemáticas · biliosas · contenido alimenticio.
- **Sacar**: la reología (hoy `#fSecrReol`: fluidas, ligosas, adherentes).
- **Ordenar el apartado** para que se lea bien.

### 8.4 · Cultivo
- Opciones: **CCAET · Minilab · Hisopado · CCAET+FilmArray**.
- Si es **Minilab**, se abre qué se pidió: PCR jirovecii · PCR TBC · PCR aspergillus · PCR citomegalovirus…
- 🔴 **Siempre con opción de escribir a mano.**

---

## 9 · Evaluaciones

1. **Los iconos van ARRIBA** de «lo que este episodio lleva medido». Hoy es al revés.
2. 🔴 **Las escalas se ordenan en filas desplegables, no hacia el lado.** Vale para funcionales y para todas
   las demás.
3. 🔴 **Se eliminan las condicionantes.** Palabras suyas: *«se puede anotar todo independiente del nivel de
   cooperación o el modo… todo se permite»*.

🪤 El punto 3 es **justo el caso de la regla del 9-oct**: hoy hay candados heredados de RCE-KINE (el MRC y el
FSS solo con paciente cooperador, el P0.1 solo en ciertos modos, la PVE con más de 24 h de VM…). Son guardias
`H`, así que **no se defienden**: él decidió, se sacan. Pero hay que mirarlas una por una antes de borrarlas,
porque algunas no son condicionantes de evaluación sino **reglas clínicas de medición** (ver §12, pregunta F).

---

## 10 · Terapia física

1. Mostrar primero **si se hizo o no**: Realizada · Contraindicada · No realizada. *(Ya es así.)*
2. 🔴 **Si fue realizada, se anota la ACCIÓN, no el nivel.** Palabras suyas: *«puede ser que lo moví en cama
   pero además lo senté borde cama, entonces ya no limitaría a poner un solo nivel»*.
   Se muestran **las actividades de los cinco niveles** y se marcan **todas las que se hicieron**;
   **el nivel se deriva** de la actividad más alta, para la estadística.
3. 🔴 **IMT y EMS, cada uno con sus variables debajo de sí mismo.** Hoy: *«si selecciono IMT aparece debajo de
   EMS, y si selecciono EMS me aparece abajo de IMT; no se entiende cuál es cuál»*. **Es un bug de verdad.**
4. **IMT**, en este orden:
   - **Sesiones** (1, 2 o más) ← falta hoy
   - Frecuencia
   - Intensidad, **con el % de PIMáx derivado** (ej.: 21 cmH₂O = 60 % de PIMáx)
   - Repeticiones **o** tiempo
   - **Descanso entre series** ← falta hoy
5. **EMS**: *«está bien»*. No se toca.

**Falta decidir:** la lista de actividades de cada nivel (§12, pregunta G).

---

## 11 · Cerrar el turno

Hoy la tarjeta se llama «📋 Cerrar el turno» (`#fcPlanes`) y tiene tres bloques: qué pasó · plan · pendientes.
Pedido: *«debería ser un poco más limpio… se ve mucho y no se entiende»*.

### 11.1 · Procedimientos y eventos de hoy 🔴
Un bloque donde caben **los procedimientos que quedan fuera de la lista**, y **se puede agregar más de uno**:
pabellón · instalación de pleurostomía · endoscopía · transfusión · imagenología · radiografía de tórax · RCP…
*(El cultivo de secreciones no va acá: ya vive en el apartado respiratorio.)*

### 11.2 · Pendientes, como lista de supermercado 🔴
De chips a **texto libre con estado**:
- Se escribe libre y queda **con un pincho**.
- Se cierra con **✓ realizado** o con **✕ suspendido**.
- Al cerrarlo **se tacha** y queda escrito «realizado el …» o «cancelado el …», **con la fecha**.

### 11.3 · Plan
Se queda al final, como está.

---

## 12 · Herencia · qué se copia del turno anterior y qué no 🔴

Esta es la regla que él dictó al final, y conviene escribirla tal cual porque hoy está repartida en el código
(`_HER_CAMPOS`) sin una lista que se pueda leer:

| **Sí se hereda** | **No se hereda** |
|---|---|
| Signos vitales | Terapia física |
| Terapia ventilatoria (soporte, modo, parámetros) | Evaluaciones |
| Sedación, hemodinamia, auscultación | Procedimientos |
| El plan | Cultivos |
| | Inhaloterapia |
| | PVE |

La idea de fondo, en sus palabras: *«cultivos no se heredan: se anota que se hizo y después queda que se hizo,
pero no se vuelve a repetir el siguiente turno»*. O sea: **lo que es un ESTADO se hereda; lo que es un HECHO
de ese turno, no.**

🪤 Esto se cruza con el pendiente que quedó abierto el 2-oct: el aviso «quedan N valores heredados sin revisar»
está muerto en el flujo por pasos (`docs/PENDIENTES.md` §4b). Conviene resolver los dos juntos.

---

## 13 · Lo que falta decidir antes de programar

Nada de esto lo puedo inventar: son decisiones clínicas.

| | Pregunta | Para qué |
|---|---|---|
| **A** | **La tabla diagnóstico → grupo REM.** Hay 28 diagnósticos en la lista y 17 grupos REM. ¿Me la dictas, o parto con un borrador mío y lo corriges? | §1.5 |
| **B** | **Los escalones por sedante.** ¿Qué dosis de fentanilo es E3? ¿Y de propofol, midazolam, precedex, ketamina? | §3.1 |
| **C** | **Los cortes de dosis de cada DVA** (baja/media/alta) y **la unidad** de cada una (γ/kg/min, mcg/kg/min, U/min…). | §4.4 |
| **D** | **Los rangos de FC**: ¿bradicárdico bajo 60 y taquicárdico sobre 100, o usas otros cortes en UCI? | §4.5 |
| **E** | **«Sacar la GSA»**: ¿la saco solo de la vista del turno y sigue llegando del PDF del laboratorio, o la jubilo entera? Hoy hay un módulo completo que importa los gases desde el PDF. | §6.5 |
| **F** | **«Todo se permite»**: ¿vale solo para las **evaluaciones**, o también para las reglas clínicas de otros apartados (plateau con asincronía, BNM sin sedación…)? Esas últimas no son candados de evaluación: son decisiones clínicas tuyas ya cerradas. | §9.3 |
| **G** | **Las actividades de cada nivel de KTM** (1 a 5). ¿Me las dictas? | §10.2 |

---

## 14 · Orden propuesto para programar

Agrupado por **riesgo** y por **lo que depende de tus respuestas**. Cada tanda se entrega con su guardia vista
roja primero y la batería en verde.

| Tanda | Qué entra | Necesita respuesta | Riesgo |
|---|---|---|---|
| **H1** | Paso 0: nombre de la tarjeta, vía aérea de ingreso, nombres de soporte, fase clínica a mano | — | bajo |
| **H2** | Terapia física: IMT y EMS cada uno con lo suyo (bug), sesiones y descanso en IMT | — | bajo |
| **H3** | Secreciones (agregar/sacar), cultivos con Minilab y texto libre, permeabilización condicionada | — | medio |
| **H4** | PVE más clara, cerrar el turno más limpio, procedimientos del día, pendientes como lista | — | medio |
| **H5** | Evaluaciones: iconos arriba, filas desplegables, sacar condicionantes | **F** | medio-alto |
| **H6** | Hemodinamia: DVA con dosis, FC en número, meta PAM siempre | **C, D** | medio |
| **H7** | Sedación: escalón por fármaco, meta que no coincide, GCS tras el SAS, BNM al final | **B** | **alto** |
| **H8** | Respiratorio: días en la segunda línea, resumen en frase, procedimientos de vía aérea, GSA | **E** | **alto** |
| **H9** | Grupo REM automático desde el diagnóstico | **A** | medio |
| **H10** | Terapia física: actividades en vez de nivel, nivel derivado | **G** | medio |
| **H11** | Herencia: la tabla del §12, y revivir el aviso de heredados | — | medio |

**H1 a H4 se pueden empezar hoy**, sin esperar ninguna respuesta tuya.
