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

## 2 · Respiratorio — pendiente

Lo que Diego dijo en el turno real, sin mockup todavía:

- El TOT y la VM, como **texto** en la segunda fila del bloque, donde ya se
  declaran — no en dos cuadros aparte.
- El número del TOT se elige a mano.
- 🔴 **La fijación nace en blanco y no sugiere nada.** *«La gente no anota; si
  sugiere 22, no anotan nada.»*
- El modal de «¿qué pasó con la vía aérea?» **se ofrece siempre en el primer
  turno**, porque el paciente pudo haberse intubado. Si no se declara nada y
  después se elige TOT, es que llegó con TOT.
- Dentro del mismo turno puede cambiarse el tubo o extubarse: ahí el evento
  pregunta **solo cómo queda**.
- 🔴 **Extubación y PVE hay que aclararlos.** *«El "no corresponde" igual es un
  no.»*

## 3 · Evaluaciones y KTM — pendiente

- De noche se esconden la tarjeta de KTM y la de evaluaciones. Es por diseño
  (no se hacen de noche), pero Diego pidió ver al menos el pool.
- Propuesta mía, sin acordar: **de noche se muestran en modo lectura** —lo
  último medido con su fecha— y no se puede registrar nuevo.

## 4 · Prono — pendiente

- Prono y supino **se declaran arriba**, no donde están hoy.
