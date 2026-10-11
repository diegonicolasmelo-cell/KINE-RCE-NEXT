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

## 12 bis · Lo que Diego respondió el 11-oct-2026

### B · Escalones por sedante
*«Solo ponemos el escalón, luego te paso el detalle.»* → La pantalla deja elegir **fármaco + escalón 1 a 6**,
sin validar la dosis. La tabla dosis→escalón llega después. **H7 ya no está bloqueada.**

### C · Cortes de dosis de las DVA

| Fármaco | Baja | Media | Alta | De dónde |
|---|---|---|---|---|
| **Noradrenalina** | 0,01 – 0,1 | > 0,1 – 0,3 | > 0,3 | Diego |
| **Vasopresina** | 0,01 | 0,02 | 0,03 | Diego |
| **Adrenalina** | 0,01 – 0,1 | > 0,1 – 0,3 | > 0,3 | 🔎 propuesta: es **equipotente 1:1 con la noradrenalina** en los equivalentes de noradrenalina (Goradia 2021), así que se le aplican los mismos cortes |
| **Dopamina** | < 5 | 5 – 10 | > 10 | 🔎 propuesta: los tramos farmacológicos clásicos (renal · inotrópico · vasopresor). Coinciden con la equivalencia dopamina ÷ 100 ≈ noradrenalina |

🪤 **Las unidades no son todas iguales**: noradrenalina, adrenalina y dopamina van en mcg/kg/min (γ);
la vasopresina va en **U/min y no por kilo**. La pantalla tiene que mostrar la unidad de cada una, y el
cálculo no puede usar una sola fórmula.
⏳ **Falta que Diego confirme** los dos renglones marcados 🔎, y que la unidad de la noradrenalina sea γ/kg/min.

### D · Rangos de frecuencia cardíaca
Bradicárdico **< 60** · eucárdico **60 a 100** · taquicárdico **> 100**.

### E · GSA
*«Sacar la GSA solo de la vista de turno.»* → **Sale de la pantalla del turno. El módulo que la importa desde
el PDF del laboratorio se queda entero**, con su guardia `gsa_importada.js`.

### F · «Todo se permite»
*«Solo para evaluaciones.»* → Las condicionantes se sacan **solo del paso 3**. Las reglas clínicas de los otros
apartados (plateau con asincronía, BNM que se desmarca sin sedación, PVE con más de 24 h de VM) **se quedan
como están**: son decisiones suyas ya cerradas, no candados heredados.

### G · Actividades de cada nivel de KTM — 🟢 ya están en el repositorio
No hace falta buscar la hoja antigua: la lista vive en `v2/index.html` (`KTM_INTERV_BY_LVL`) y hoy ya se usa
como chips que aparecen **después** de elegir el nivel.

| Nivel | Qué dice hoy | Actividades |
|---|---|---|
| **1** | Protección muscular — paciente no cooperador (S5Q ≤ 3) | Posicionamiento · elongaciones · movilización pasiva · NEMS · entrenamiento muscular respiratorio |
| **2** | Movilización en cama — giros y ejercicio analítico | Elongaciones · movilización activo-asistida · giros en cama · ejercicio analítico · NEMS · pedalera · entrenamiento muscular respiratorio |
| **3** | Sedente al borde de cama (SBC) | Elongaciones · movilización activa · equilibrio sedente · control de tronco · coordinación y balance · transición supino a SBC · tolerancia al ejercicio |
| **4** | Bipedestación y transición sedente-bípedo | Equilibrio sedente y bípedo · bipedestación · marcha estática · transición sedente a bípedo · sedente en sillón · tolerancia al ejercicio |
| **5** | Marcha y reeducación de la marcha | Coordinación dinámica en bípedo · reeducación de la marcha · marcha por habitación · tolerancia al ejercicio |

**Lo que pide Diego es darlo vuelta:** se muestran **todas** las actividades, se marcan las que se hicieron
(pueden ser de varios niveles) y **el nivel se deriva de la más alta**, para la estadística.
⏳ **Falta que Diego confirme** que esta lista es la misma del reverso de la hoja, o la corrija.

### A · Borrador de diagnóstico → grupo REM
28 diagnósticos contra 17 grupos. **Esto es un borrador mío**, para que lo corrija:

| Diagnóstico | Grupo REM |
|---|---|
| Neumonía grave · Insuficiencia respiratoria aguda · SDRA | Enfermedades respiratorias |
| ACV isquémico · ACV hemorrágico | ACV |
| TEC grave | TEC |
| Guillain-Barré | ENM agudas |
| Miastenia gravis | ENM crónicas |
| Status epiléptico | Otras neurológicas |
| Falla cardíaca descompensada · Shock cardiogénico · Infarto agudo al miocardio | Enfermedades cardíacas |
| Politraumatismo · Trauma torácico · Trauma abdominal · Fractura de cadera | Traumatológicos |
| Post operatorio cirugía cardíaca · Post operatorio cirugía abdominal · Post operatorio neurocirugía | Otros pre y post quirúrgicos |
| Insuficiencia renal aguda | Genitourinarias |
| Quemados | Quemados |
| Shock séptico · Sepsis · Pancreatitis aguda grave · Falla hepática aguda · Cetoacidosis diabética · Intoxicación aguda | Otros |

**Las cuatro que no tengo claras, y por qué:**
1. **Hemorragia subaracnoidea** → ¿ACV, u «Otras neurológicas»? La dejé sin asignar.
2. **Post operatorio cirugía cardíaca** → ¿«Otros pre y post quirúrgicos» o «Enfermedades cardíacas»?
3. **Post operatorio neurocirugía** → ¿«Otros pre y post quirúrgicos» u «Otras neurológicas»?
4. **Insuficiencia renal aguda** → la puse en «Genitourinarias»; ¿o va en «Otros»?

🪤 **Y una decisión de fondo:** el diagnóstico es **texto libre con sugerencias**, no una lista cerrada. Si el
colega escribe uno que no está en la tabla, **el grupo REM queda en blanco y se elige a mano**. Nunca se
inventa un grupo: una cifra del REM mal atribuida es peor que una vacía.

**Quedan sin usar** cuatro grupos (LM, Sd. Post-UCI, COVID-19, Otras reumatológicas, Oncológicos): ningún
diagnóstico de la lista cae ahí. Se siguen pudiendo elegir a mano.

---

## 13 · Lo que falta decidir antes de programar

Nada de esto lo puedo inventar: son decisiones clínicas.

| | Pregunta | Para qué |
|---|---|---|
🟢 **Las siete de la primera ronda están respondidas** (§12 bis). Quedan solo estos flecos, y **ninguno
bloquea H1 a H8**:

| | Pregunta | Para qué |
|---|---|---|
| **A1** | Las **cuatro casillas dudosas** del borrador diagnóstico → REM (HSA, post-op cardíaca, post-op neurocirugía, falla renal). | §12 bis A |
| **C1** | Confirmar los cortes **propuestos** de adrenalina y dopamina, y que la noradrenalina se mide en γ/kg/min. | §12 bis C |
| **G1** | Confirmar que las actividades que ya están en el código son las mismas del reverso de la hoja. | §12 bis G |
| **B1** | La tabla **dosis → escalón** por sedante. Diego la pasa después; **no bloquea**, porque el escalón se elige a mano. | §3.1 |

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
| **H5** | Evaluaciones: iconos arriba, filas desplegables, sacar condicionantes (**solo del paso 3**) | — | medio-alto |
| **H6** | Hemodinamia: DVA con dosis, FC en número, meta PAM siempre | C1 | medio |
| **H7** | Sedación: escalón por fármaco, meta que no coincide, GCS tras el SAS, BNM al final | — | **alto** |
| **H8** | Respiratorio: días en la segunda línea, resumen en frase, procedimientos de vía aérea, GSA fuera de la vista | — | **alto** |
| **H9** | Grupo REM automático desde el diagnóstico | A1 | medio |
| **H10** | Terapia física: actividades en vez de nivel, nivel derivado | G1 | medio |
| **H11** | Herencia: la tabla del §12, y revivir el aviso de heredados | — | medio |

**H1 a H8 se pueden programar ya.** Solo H9 y H10 esperan un fleco, y los dos se pueden dejar para el final.
