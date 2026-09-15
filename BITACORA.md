# BITÁCORA — KINE-RCE-NEXT

Qué se cambió en NEXT, por qué, qué se midió y con qué trampa se tropezó.

**Esto NO son las reglas vigentes.** Las reglas viven en `CLAUDE.md`, que se
lee entero en cada sesión. Lo que falta del plan, medido sobre el código, vive
en `ESTADO_PLAN.md`. Este archivo se consulta cuando hace falta el porqué.

La bitácora de la aplicación anterior —un año de versiones— se quedó en el
repositorio de origen (`diegonicolasmelo-cell/RCE-KINE`, `BITACORA.md`). No se
copió: NEXT arranca su propia memoria desde la base aprobada.

---

## 15-sep-2026 · La base 7.04 entra en NEXT, y las primeras cuatro brechas

El repositorio tenía un solo archivo: un README que decía «importación del
código fuente pendiente». Este día se hizo la importación y se empezó a cerrar
lo que el plan maestro pedía y la base no tenía.

### La importación

Desde el commit inmutable aprobado de RCE-KINE (`21498b0`,
`7.04-aviso-de-error-al-centro`). Entró el fuente entero, la batería, las
herramientas, las skills, el plan y los 13 PRD de la base. **No** entraron los
25 MB de cohetes de versiones viejas, las carpetas `legacy/` y `scratchpad/`,
ni el identificador de la implementación de producción del hospital.

Se verificó uno por uno que ningún RUT de las guardias fuera real: los siete
que aparecen son inventados (`11111111-1` y parecidos).

**Las cuatro guardias que salieron rojas al importar, ninguna por código roto:**

1. `panel_no_pisa_datos.js` traía la ruta **absoluta** del repositorio viejo.
   Es la misma trampa que ya se había pagado en `coordinacion_ui.js`.
2. y 3. `guardado_viajes.js` y `tablero.js` son guardias **A/B**: comparan el
   código de hoy contra el de un commit anterior, que sacaban del historial con
   `git worktree` y `git show`. NEXT arranca con historial propio y esos commits
   no existen acá. Se congelaron los dos árboles de referencia **dentro del
   repositorio** (`build/checks/base/`, solo los `.gs`: el banco no lee el
   index) y las guardias leen de ahí.
4. `paridad_v3.js` comparaba el fuente contra el espejo de la implementación
   del **hospital**, que no viaja a NEXT. La reemplaza `paridad_entrega.js`,
   que regenera el paquete completo y lo compara **byte a byte**. Es más
   estricta que la anterior: aquella, para `infra.gs` y `dominio.gs`, solo
   exigía que el fuente estuviera **contenido** en el fusionado, así que no
   habría cazado nada agregado de más en el espejo.

### G1 · Un solo escapado en la interfaz

`escapeHtml` no existía. Había **nueve** funciones locales, siete llamadas
`esc`, y ninguna igual a otra: una escapaba `& < "` pero no `>` ni la comilla
simple; otra solo `"`; otra `& < >` pero no `"`; `_aftEsc` y `_escSt` (72 usos)
cuatro de los cinco; una escapaba metacaracteres de expresión regular y dos
citaban campos de CSV. Que casi todas se llamaran igual es lo peligroso: mover
una línea de un bloque a otro parecía seguro.

Ahora: `escapeHtml` (los cinco caracteres), `escapeJs` para el caso doble —un
valor dentro de una cadena de JavaScript que vive en un atributo, donde
escapar HTML no basta porque el navegador **decodifica la entidad antes** de
leer el JavaScript— y `hEsc` como tag de plantilla. Las que sí escapaban HTML
quedaron como alias; las que no, cambiaron de nombre a `escRe` y `escCsv`.

🪤 El plan llama `h` al tag. Acá no puede llamarse así: `h` ya es variable
local en más de diez funciones y el global quedaría ensombrecido sin aviso.

**Dos agujeros reales aparecieron al medir**: la grilla de la hoja del día
escapaba el `title` del `<td>` y metía el mismo dato **crudo** en la celda; y
el plan del paciente iba a un `<textarea>` escapando la comilla doble —que ahí
no molesta— y no el `<`, que es el único que importa: un `</textarea>` escrito
en el plan cerraba el campo.

### El arranque hacía dos GET_BOOT idénticos

`rendimiento.js` se puso roja sin que nadie tocara el arranque: **a las 10:00
pasaba y a las 19:39, no**. `window.onload` llamaba al aviso de fin de turno
antes del arranque, y ese aviso armaba su lista con su **propio** GET_BOOT —
pero solo dispara en los 30 minutos previos al cambio de turno, así que fuera
de esa ventana el arranque parecía limpio. Dentro, salían dos viajes idénticos
con 1 ms de diferencia, en la hora de más gente conectada.

Ahora el aviso arranca **después** del boot y reusa lo que el boot acaba de
traer (ventana de 15 s); pasada esa ventana vuelve a preguntar.

🪤 La trampa de fondo, que es lo que cerró la guardia nueva
`arranque_un_viaje.js`: **una guardia que lee el reloj real da distinto según
la hora a la que se corra**. Es la misma familia del `hoyISO` sombreado. Ahora
el reloj del navegador se congela dentro de la ventana de aviso, así el caso
peor se prueba siempre. Y comprueba que el aviso **sí** se arme: apagarlo para
pasar la guardia sería trampa.

### G2 · El respaldo mensual permanente (D7)

Estaba solo la mitad diaria: `_rotarBackups()` mandaba a la papelera todo lo
que pasara de 30, así que **a los 30 días no quedaba ninguna foto** de la
planilla. La estadística de la unidad se sostiene sobre años de registros;
contra eso, 30 días de memoria no es un respaldo, es una ventana.

`backupMensual()` hace una copia al mes en la subcarpeta «mensuales». La llama
el diario y se salta sola si el mes ya tiene la suya, así que no hace falta
otro activador. Va en su propio `try` y después de rotar: si Drive falla con la
mensual, la diaria del día ya está hecha.

La rotación no puede alcanzarla por **dos** razones independientes: vive en
otra carpeta —`getFilesByType` solo lista hijos directos— y su nombre no lleva
el prefijo diario. Se dejan las dos a propósito: una sola se rompe sin que
nadie note nada hasta que ya se borró un año.

### G4 · El RUT no se saca, pero se acota y se vigila

D9 dice «se elimina la columna RUT de todas las hojas». Al medir apareció que
hoy hace **cuatro trabajos que nadie más hace**: empareja los gases del
laboratorio con el episodio (el informe trae RUT, no `COD_PACIENTE`: sin él no
hay ninguna llave), detecta reingresos, es término del buscador y es lo que
copian los botones de Synapse y del laboratorio. Las hojas impresas lo llevan
en su casilla.

D9 se cerró en julio; las cuatro funciones llegaron en julio y agosto, pedidas
por Diego, y el plan nunca se actualizó. **En los hechos D9 quedó superada**,
pero eso lo tiene que decir él: la pregunta está escrita en `ESTADO_PLAN.md`.

Lo que sí se hizo es la minimización (§10 del plan). `rut_minimo.js` siembra un
RUT sintético, llama al dispatcher **acción por acción** y exige que no
aparezca salvo en una lista corta con motivo escrito. Primera corrida: 19
respuestas limpias y dos que sí lo llevan — `GET_BOOT` y `GET_TODAS_CAMAS`, o
sea **el censo del arranque reparte el RUT de todos los pacientes a todos los
navegadores**. Se revisó si era fuga y no lo es: el navegador lo usa en seis
lugares y la app **nunca pide una cama suelta** (`GET_CAMA` no se llama desde
el front). Queda anotado como decisión de diseño, y cualquier respuesta nueva
que empiece a llevarlo pone la batería roja.

### G5 · core/modal.js

De lo que pide §9.1 había: backdrop único, Escape con sus excepciones
pensadas, y aria-modal en 15 de 20. Faltaba el resto, entero: **ningún modal
tenía nombre** (el lector de pantalla anunciaba «diálogo» y nada más), cinco
superficies bloqueantes no tenían rol de diálogo siquiera —entre ellas la
confirmación propia y el cuadro rojo de «No se guardó»—, **no había ni un
manejador de Tab** en 18.700 líneas y no se devolvía el foco al cerrar.

Con el panel abierto, tabular salía del formulario hacia los botones de la
grilla **tapados detrás**: se podía activar un control sin verlo.

Se hizo **sin tocar ninguna función de abrir o cerrar**. Hay una veintena, cada
una con sus reglas (el egreso pregunta antes de descartar, el aviso de fin de
turno es bloqueante a propósito, el historial cierra solo con su X).
Reescribirlas sería el cambio más grande y más arriesgado de la interfaz a
cambio de nada visible. El módulo **observa la clase `on`** y aplica foco y
accesibilidad desde afuera.

🪤 El foco inicial no se roba: si al abrirse ya está dentro del modal, no se
mueve. Pisarlo mandaría al usuario al botón de cerrar en vez de al campo donde
iba a escribir.

🪤 Escape no se centralizó aunque el plan lo liste: el manejador que existe
tiene excepciones pensadas, y duplicarlo sería reabrirlas por accidente.

### G1, segunda parte · unificar los escapadores no bastaba

Al revisar las vistas que faltaban por mirar apareció que **G1 estaba a medias
y yo lo había dado por cerrado**. Unificar los nueve escapadores en uno solo
prueba que exista uno solo; no prueba que se use.

Un barrido del archivo encontró **804 interpolaciones `${…}` dentro de
plantillas HTML que no pasaban por ningún escapador**, 41 de ellas con pinta
de dato de paciente. Pero contar interpolaciones no sirve: la mayoría son
clases, números y ternarios entre literales, y revisarlas a mano es un trabajo
que se hace mal y hay que rehacer con cada línea nueva.

Lo que sí sirve es **medir el efecto**. La guardia nueva
`dato_no_es_marcado.js` siembra un paciente llamado
`Ana <b>Mar"ía</b> Pérez & Soto` con diagnóstico
`PaFi <100 con <i>derrame</i> "tabicado" & fiebre`, pinta las vistas y exige
que ese marcado siga siendo texto. **La primera corrida salió con diez
fallos**: el `<b>` nacía como elemento real en la grilla, el registro y la
entrega, y la comilla doble partía atributos —quedaban atributos basura
llamados `ía<`—.

El caso real no es un ataque: es «PaFi <100» escrito a mano en un diagnóstico.
Cuando ese `<` se interpreta, se come el resto de la línea y el dato
desaparece de la pantalla sin que nadie se entere.

Se escaparon **16 puntos**: el nombre y el diagnóstico de la tarjeta, del
registro diario, de la entrega y del selector de camas de la entrega; el
título emergente del diagnóstico en la tabla; la hoja impresa del día; y los
mensajes de confirmación de egreso, de mover cama, de dar de baja un
ventilador y de «ventilando a».

🪤 Uno de los puntos tenía su propio escapador escrito a mano en la misma
línea —`String(c.DIAGNOSTICO).replace(/"/g,'&quot;')`—, que la guardia
`escapado_unico.js` no cazaba porque solo mira las funciones declaradas, no
las escritas al vuelo dentro de una plantilla.

🪤 Una alarma que resultó falsa, y que conviene dejar escrita: los nombres del
registro diario se ven cortados con puntos suspensivos y mi primera medición
dijo que **ninguno** tenía título emergente. Era un error de la sonda: el
título está en un span INTERIOR y yo subía por los ancestros. El nombre
completo sí se puede leer pasando el cursor. Medir mal y alarmar cuesta más
que no medir.

Queda anotado, sin arreglar: la tabla del registro deja **175 píxeles fuera de
la vista** a la derecha (mide 1.529 y el contenedor 1.354). Se puede
desplazar, pero lo único que avisa es la palabra «TURN…» cortada a la mitad.

### Estética · segunda tanda, mirando las vistas que faltaban

Había sacado diez pantallazos y mirado tres. Al revisar el resto apareció lo
más serio del día.

**🔴 La cabecera se come los botones de la derecha.** Va en una sola franja con
`overflow-x:auto`, y el envolver solo se activa bajo 900 px. Entre 901 y ~1500
queda una barra desplazable **sin ninguna señal**: con un mouse nadie descubre
que se corre, así que lo que sobra no existe. Medido a cada ancho: a 1440 se
pierden «Actualizar datos» y la mascota; **a 1366 —el notebook del hospital con
Windows 10— además el BUZÓN de notificaciones**; a 1280, también la CAMPANA de
alertas y el candado de Coordinación.

🪤 El arreglo evidente —subir el umbral del envolver a 1500 px— se probó,
funciona y deja los siete anchos limpios… y puso ROJA a `piel.js`, que protege
una decisión ya tomada: «el encabezado es UNA sola franja compacta (≤ 74 px)».
Las dos cosas no caben. Elegir entre ellas no es de quien acomoda la caja: se
revirtió y quedó planteado para Diego. Lo que sí se hizo, porque no contradice
nada, es que la barra **avise que continúa**.

**La tabla del registro** también escondía 175 px a la derecha, justo la mitad
del turno noche, y lo único que lo avisaba era la palabra «TURN…» cortada.
Ahora lleva la misma sombra.
🪤 El primer intento QUITÓ el `background:#fff` del contenedor al reemplazarlo
por los degradados, y la marca de agua del hospital empezó a transparentarse a
través de las filas. Se vio en el pantallazo, no en el código. El blanco va
como última capa, debajo de todo.

**Los nombres del selector de camas de la entrega** se cortaban en seco, sin
puntos suspensivos: «Rosa Elena Contrer» parecía un nombre completo. La causa:
`text-overflow:ellipsis` **no funciona en un elemento en línea**, y ese span lo
era. El CSS estaba escrito y no hacía nada; el recorte lo terminaba haciendo el
contenedor. Con `display:block` el ellipsis sí se aplica, y el nombre entero
quedó en el globo de ayuda.

La guardia `legibilidad.js` creció con las tres cosas: que todo texto recortado
se pueda leer al posar el cursor, que lo que se esconde a los lados lo avise
algo, y una **línea base por ancho** de la cabecera — hoy se caen 3 controles a
1366 px; si mañana se cae uno más, rojo.

### Estética · primera tanda

Se hizo **mirando la aplicación corriendo**, no leyendo el código:
`build/pantallazos.js` levanta el cliente real contra el servidor real con una
unidad sembrada y guarda una imagen por vista, en escritorio y en teléfono.

🪤 La primera corrida salió con la franja roja de «el reloj de este equipo
difiere del servidor en ~99.914 minutos» y con todos los pacientes en «Día 76»:
el reloj del servidor simulado estaba fijo en julio. Una foto con una alarma
que no existe es peor que no tener foto.

Dos defectos se arreglaron sin preguntar, porque no son cuestión de gusto sino
texto que no se puede leer, y ninguno cambia una palabra de lo que dice la
pantalla:

- El **riel de secciones** del panel (196 px) dejaba **cuatro de las diez**
  ilegibles. Ahora envuelve hasta tres líneas.
- **«Fijación · cm de arcada dental»** envolvía en tres líneas dentro de una
  columna de 70 px. Se le dio el ancho que el texto necesita. No se acortó el
  texto: la unidad decidió que la fijación se mide siempre en arcada dental y
  eso se dice en pantalla, no solo en el globo de ayuda.

Guardia `legibilidad.js`: siembra nombres y diagnósticos largos, abre el panel
en un navegador real y mide `scrollWidth`/`scrollHeight` contra el tamaño de la
caja. No cuenta caracteres — con otra fuente habría dado verde.

**Lo que sí es cuestión de gusto quedó en una página de decisiones** para
Diego, con las maquetas armadas con el CSS real de la aplicación:
`https://claude.ai/artifact/5Revb8L5egpjUTaw1y5yob`. Son cinco, y la primera no es gusto sino funcionalidad perdida: los
botones que no se ven en el notebook del hospital. Las otras: qué se ve
primero en la tarjeta de cama, si las camas vacías pesan menos, si se comprime
la cabecera del teléfono y si se uniforman las mayúsculas. Ninguna está tomada:
la regla del proyecto es que los cambios de diseño se le proponen antes de
tocar código.

---

Batería al cierre del día: **147 verdes, 0 rojas**, en 147 guardias. Sin cambio de esquema que
obligue a correr `crearORepararEstructura()` (la clave nueva de CONFIG se
agrega sola).
