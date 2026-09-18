# Guía de acuerdos — las preguntas que abren el proyecto nuevo

> **Para qué es esto.** Los PRD y planes anteriores quedaron archivados el
> 18-sep-2026. Esta guía son las preguntas cuya respuesta **cambia lo que se
> construye**. No hay preguntas de trámite: si una está acá es porque sin
> contestarla se programa a ciegas.
>
> **Cómo responderla.** Por bloques, en el orden que quieras, hablando normal.
> No hace falta contestarlas todas de una vez — pero las marcadas 🔴 bloquean
> todo lo demás.
>
> Lo que ya se sabe (y no hace falta volver a decidir) está en
> `docs/LO_ESENCIAL.md`.

---

## Bloque 0 · Qué significa «de cero»

### 🔴 1. ¿Qué se olvida exactamente?

«Empezar de cero» puede significar tres cosas muy distintas, y de esto depende
todo lo demás:

- **(a) Solo el papel.** Los planes y PRD dejan de mandar, pero lo que ya está
  programado y andando se queda como está.
- **(b) El papel y el diseño.** Además se vuelve a mirar la interfaz completa:
  qué pregunta, en qué orden, qué sobra.
- **(c) Todo.** Se rediseña el registro desde la hoja en blanco, aunque eso
  signifique botar trabajo hecho.

*Por qué importa:* con (a) seguimos construyendo encima; con (c) hay que
volver a decidir hasta dónde va cada campo.

### ⚪ 2. ¿Las decisiones clínicas que ya cerraste siguen en pie?

Están listadas en `LO_ESENCIAL.md`: el SAS define la profundidad de la
sedación, la fecha de suspensión es la del retiro, el BNM vive con la sedación,
la interpretación del S5Q se lee. ¿Se mantienen, o alguna se vuelve a abrir?

---

## Bloque 1 · Para qué existe esto

### 🔴 3. ¿Qué te duele más hoy del sistema que usan?

**La pregunta más importante de todas.** No «qué le falta», sino qué es lo que
te hace perder tiempo, o lo que se te pierde, o lo que tienes que arreglar a
mano todos los meses.

*Por qué importa:* es lo que decide qué se construye primero. Todo lo demás
son detalles al lado de esto.

### 🔴 4. ¿NEXT reemplaza al sistema de la unidad, o convive con él?

- **Lo reemplaza** — llega un día en que el equipo deja de usar el viejo.
- **Convive** — NEXT es para algo distinto (pruebas, otra unidad, otro uso).
- **Todavía no se sabe** — se decide más adelante y mientras tanto es un
  laboratorio.

*Por qué importa:* si reemplaza, hay que pensar en la migración, en enseñarle
al equipo y en el día del cambio. Si no, nada de eso existe.

### 🔴 5. Si reemplaza: ¿qué pasa con lo ya registrado?

- Se **migra** todo a la planilla nueva.
- Se **parte vacío** y lo viejo queda como archivo de consulta.
- **Conviven** un tiempo, y después se decide.

*Por qué importa:* migrar meses de evoluciones es un trabajo en sí mismo, y hay
que saber desde ahora si va a hacer falta.

---

## Bloque 2 · Quién lo usa y dónde

### 🔴 6. ¿Dónde se va a llenar de verdad?

- En el **computador de la unidad**.
- En el **teléfono**, al lado del paciente.
- En **los dos**, y hay que pensarlos por igual.

*Por qué importa:* cambia el diseño entero. Un formulario de teléfono no es
uno de escritorio achicado.

### ⚪ 7. ¿Cuántos kinesiólogos y cuántas camas?

Y si el número de camas cambia (expansión, reconversión), ¿cada cuánto?

### ⚪ 8. ¿Entra alguien más aparte de kinesiología?

Jefatura, médicos, calidad, enfermería. Aunque sea solo para mirar.

*Por qué importa:* alguien que solo mira necesita permisos distintos, y
probablemente otra pantalla.

---

## Bloque 3 · Qué sobra y qué falta

### 🔴 9. De lo que el formulario pide hoy, ¿qué no se llena nunca?

Lo más valioso que puedes decirme. Un campo que nadie completa no es
inofensivo: alarga el turno, y peor, cuando alguien lo completa a medias deja
un dato en el que después nadie puede confiar.

### 🔴 10. ¿Qué anotas hoy en otro lado porque el sistema no lo tiene?

Un cuaderno, un WhatsApp, una planilla aparte, la memoria. Eso es lo que falta
de verdad.

### ⚪ 11. ¿Qué te piden a ti que hoy tengas que armar a mano?

REM, informes a jefatura, indicadores, estadísticas para una reunión. Si algo
se arma a mano todos los meses, probablemente el sistema debería armarlo.

---

## Bloque 4 · Acceso y seguridad

### 🔴 12. ¿Se enciende el candado del turno?

Hoy está construido y **apagado**: cualquiera con la dirección entra. Encenderlo
significa que cada kinesiólogo entra con su clave — y antes hay que sembrarlas
y repartirlas una por una.

- **Sí, antes de repartir la app.**
- **Sí, pero más adelante.**
- **No por ahora**, es una planilla de pruebas.

### ⚪ 13. ¿La pantalla puede ser pública?

Hoy se publica en GitHub Pages, que es abierto. Lo público es la **pantalla**,
no los datos. Si eso no sirve, hay que poner un login delante del sitio — es
trabajo aparte.

---

## Bloque 5 · Cómo vamos a trabajar

### 🔴 14. ¿Qué es lo primero que tiene que funcionar?

**Una sola cosa.** Si dentro de dos semanas solo pudiera estar lista una, ¿cuál
es?

### ⚪ 15. ¿En qué se va a notar que quedó bien?

Algo que puedas ver o medir. «El turno se registra en la mitad del tiempo», «ya
no tengo que corregir el REM», «los colegas dejan de preguntarme cómo se anota
tal cosa».

### ⚪ 16. ¿Cómo prefieres revisar lo que voy haciendo?

- **Capturas** de la app andando, acá en el chat.
- **Pegando y probando** tú mismo en la planilla.
- **Las dos**, según el tamaño del cambio.

*Por qué importa:* las capturas encontraron cinco bugs que ninguna prueba
automática cazó. Pero pegar toma tiempo tuyo.

### ⚪ 17. ¿Decides tú solo?

¿Hay algo que tenga que pasar por jefatura, calidad o informática del hospital
antes de estar en manos del equipo?

---

## Lo que yo pongo

Para que quede parejo, lo que me comprometo a hacer con tus respuestas:

- **Escribirlas** en un documento de acuerdos que reemplace a los PRD
  archivados, con tus palabras y no con las mías.
- **Preguntar antes de programar** cuando un cambio sea de diseño o de
  experiencia de uso, y proponerte opciones en vez de decidir por ti.
- **Dejar cada bug pagado convertido en guardia**, para que no vuelva.
- **No agregar nada que no hayas pedido.**
