# Lo esencial — lo que se sabe antes de empezar de cero

> **Qué es esto.** El 18-sep-2026 Diego decidió archivar los PRD y los planes
> anteriores y volver a cerrar los acuerdos desde el principio. Este documento
> es lo que **no conviene volver a aprender**: el terreno, las decisiones
> clínicas que él ya zanjó, y las trampas que ya costaron horas.
>
> No es un plan y no obliga a nada. Es memoria. Si un acuerdo nuevo contradice
> algo de acá, **manda el acuerdo nuevo** — salvo la sección de trampas, que no
> son opiniones sino cosas que ya pasaron.
>
> Lo que falta por decidir está en `docs/GUIA_DE_ACUERDOS.md`.

---

## 1 · El terreno

Lo que hace distinto a este proyecto de cualquier otro:

- **Diego es coordinador de kinesiólogos, no programador.** Trabaja en español,
  dicta por voz, y actualiza el sistema pegando archivos a mano en el editor de
  Google. Cualquier cosa que le entregue tiene que poder hacerse así.
- **Se usa en turno, con el paciente al lado.** No es una planilla que alguien
  llena con calma: es un registro que se completa entre tareas, muchas veces de
  pie y en el teléfono.
- **El Chrome del hospital corre en Windows 10.** Su fuente no trae emojis
  posteriores a 2019: uno nuevo sale como un cuadrado vacío. Ya pasó con 🩻.
- **Son datos de salud.** Ley 19.628 y Ley 21.719. Nunca entran al repositorio
  datos reales, ni nombres, ni RUT, ni «de paso» en un comentario.
- **El sistema de la unidad sigue corriendo.** NEXT se desarrolla y prueba
  aparte, en su propia planilla. No se le empujan cambios a producción salvo
  que Diego lo pida.

---

## 2 · Decisiones clínicas que Diego ya cerró

Están acá porque re-decidirlas sin saber que ya se decidieron sería caminar en
círculo. Se pueden cambiar — pero a sabiendas.

### La sedación

**La profundidad la dice el SAS, no el fármaco.** SAS 1-2 es profunda; 3 o más,
no. Es el mismo corte que gobierna los gates de cooperación, S5Q y CAM-ICU, así
que hay una sola definición en todo el sistema.

> *«Hemos tenido pacientes que se daban fentanilo y propofol en dosis altas pero
> con un SAS 3, 4, por lo tanto han estado sedados vigil; yo creo que depende más
> de eso que del tipo de fármaco.»* — corrigiendo una propuesta de listar
> hipnóticos.

**La fecha de suspensión es la del retiro de los fármacos, no la del despertar.**
Son dos preguntas distintas: *¿está profundo hoy?* la contesta el SAS; *¿qué día
se le suspendió?* la contesta el retiro.

> *«El día de suspensión de sedación es el día de retiro de fármacos cuando
> efectivamente le suspenden. Sería el día que el colega no marque medicamentos
> clasificados con efecto sedante y en el turno anterior sí estaban marcados.»*

Y si vuelve a sedación profunda, la fecha se borra. Por eso el precedex para
controlar la agitación —con SAS 6— no la toca: ése fue el caso que dio origen a
todo el asunto.

**El BNM vive y muere con la sedación.** Sin sedación la casilla se esconde *y se
desmarca*: un bloqueo neuromuscular sin sedación es un paciente paralizado y
despierto, y eso no puede quedar marcado por descuido.

**El estado de vigilia solo existe sin sedación.** Con sedación puesta el SAS ya
lo dice, y preguntarlo dos veces fue lo que él mismo desarmó:

> *«Esta vigilia casi te discuto, se pisa casi entero con un SAS… que solo
> aparezca en pacientes sin sedación el campo propio, acotado; selección única,
> no múltiple; donde ya no se usa el SAS.»*

### La conciencia

**La interpretación del S5Q se lee, no se elige.**

> *«En S5Q, la interpretación del nivel de cooperación no debería seleccionarse,
> ya que es eso: interpretación.»*

Era un híbrido: el formulario ya la rellenaba desde el S5Q y además la dejaba
abierta para escribirle encima. Dos fuentes de verdad, y ganaba la última que se
tocara.

### La vía aérea

**Intubación, extubación, TQT y decanulación se registran a mano, por decisión
clínica.** Las alertas solo detectan olvidos; nunca automatizan el registro.

### Lo que rechazó

El envío de correos. No se agregan funcionalidades que no pidió.

---

## 3 · La familia de bugs que más apareció

Un mismo error con cinco caras, todas encontradas en dos días:

**Un campo vacío tratado como un cero con significado clínico.** El programa
escribe un valor que nadie midió, y en la ficha se lee igual que uno medido.
Es peor que un dato faltante: es un dato **falso**.

- El Glasgow venía puesto de fábrica en 15.
- La verbal saltaba a 5 al desintubar.
- Con SAS 4 —paciente vigil y cooperador— el formulario escribía solo «S5Q <3»
  y «No cooperador», porque la suma de tres campos vacíos daba 1.
- Tocar el BNM o el SAS y devolverlos dejaba «S5Q <3» escrito.
- El automatismo del Glasgow *adivinaba* cuál valor era suyo comparando el
  número, así que le borraba la medición a quien de verdad había evaluado un
  Glasgow 3.

**La regla que salió de ahí:** un valor que pone el programa se **marca** como
suyo y solo eso se suelta. Lo que tocó una persona no se toca.

🪤 **Y los cinco los encontró una captura de pantalla, no una prueba de valores.**
Ninguna guardia los cazaba, porque todos los valores eran válidos: lo que estaba
mal era que nadie los había escrito.

---

## 4 · Trampas del oficio, ya pagadas

No son opiniones. Cada una costó tiempo.

- **El index no se entrega crudo.** Google reprocesa el HTML con un lector más
  estricto que el navegador y el archivo grande tumbaba el arranque con un error
  que apuntaba a una línea ajena. Viaja empaquetado («cohete»).
- **El portapapeles corrompe los acentos en archivos grandes.** `Diagnóstico`
  llegó como `Diagnostico`. No se ve a ojo: se caza comparando, no mirando.
- **Las guardias que leen el reloj dan distinto según cuándo se corran.** Ya
  pasó cuatro veces. Las fechas se **inventan**, no se esperan; el turno se
  congela.
- **Las guardias se ponen rojas por su propia documentación** si buscan un texto
  en el código fuente: el comentario que explica el arreglo contiene la frase que
  la guardia prohíbe. Se mide la salida, no el texto. Pasó tres veces.
- **Una guardia que nunca se vio roja no prueba lo que dice.** El 18-sep se
  escribió una para el Glasgow medido a mano y pasaba igual contra el código sin
  arreglar: se borró.
- **Columna nueva va siempre al final** del esquema. Meterla al medio corre todas
  las de la derecha y desalinea las filas ya escritas: así nació el desajuste
  119≠132 del sistema viejo.
- **Un empaquetador borra solo lo que genera**, nunca la carpeta entera. Con
  `rmSync` se llevó por delante un LEEME escrito a mano y estuvo borrado un mes
  sin que nadie lo notara.

---

## 5 · Lo que está construido hoy

Inventario corto, para no reconstruir lo que existe:

| | |
|---|---|
| **Registro por turno** | Camino de cuatro pasos, con prevención de NAVM al inicio |
| **Respiratorio** | Vía aérea, soporte e interfaz como tres ejes; máquina de eventos |
| **Sedación y conciencia** | SAS en palabras, estado de vigilia, BNM, GCS, S5Q, CAM-ICU |
| **KTM** | Cada sesión con su nivel, asistencia, minutos y Borg |
| **Evaluaciones** | MRC, FSS, dinamometría, Barthel, Charlson, con sus gates |
| **Texto clínico** | Dos motores en espejo: el del navegador y el del servidor |
| **Plantillas** | El colega arma la suya seleccionando frases del texto |
| **Entrega de turno** | Ficha por cama, imprimible |
| **Estadística y REM** | Por episodio único, con conciliación y sin RUT |
| **Respaldo** | Automático a Drive, con copia mensual permanente |
| **Identidad** | Clave propia por kinesiólogo (`svc_acceso.gs`), **nace apagada** |
| **App instalable** | La misma pantalla servida como PWA, hablando al `/exec` |
| **Verificación** | 179 guardias ejecutables, ~2,5 minutos |

---

## 6 · Lo que quedó a medio camino

Queda en suspenso hasta los acuerdos nuevos:

- **Los íconos de dispositivos** (HME, HEPA, Trach Care) están dibujados. Diego
  ofreció mandar fotos reales recortadas.
- **El ícono de la app puede recortarse en Android**: el dibujo llega muy al
  borde y las máscaras circulares se comen el extremo.
- **El candado del turno está construido y apagado.** Encenderlo requiere
  sembrar y repartir las claves.
- **El login de Google (D1b)** está construido y esperando un proyecto de Google
  Cloud que nunca se creó.
