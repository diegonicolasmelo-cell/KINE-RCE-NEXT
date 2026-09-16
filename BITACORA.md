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

## 16-sep-2026 · La app se instala en el teléfono (tanda 3 del PRD)

Diego: «arma la tanda 3, la PWA». El PRD la tenía escrita desde el 8-sep,
esperando dos respuestas de informática y cuatro decisiones suyas.

**Lo que faltaba no era configuración, era código**, y se midió antes de
empezar: el servidor no tenía puerta HTTP —ni `doPost` ni `ContentService`— y
la pantalla hablaba solo por `google.script.run`, que existe únicamente dentro
del iframe de Apps Script. Servida desde otro sitio, la app abría y se quedaba
sin servidor.

### La puerta · `v2/api_web.gs`

🪤 **La trampa que define su forma.** Antes de mandar un POST a otro dominio
con `Content-Type: application/json`, el navegador pregunta primero con una
petición OPTIONS, y **Apps Script no contesta OPTIONS**: la llamada muere sin
llegar nunca al código. Lo que se ve en la consola habla de CORS, que manda a
buscar al lugar equivocado. Por eso el cuerpo viaja como `text/plain` y el
servidor lo interpreta él mismo. Es el error que se va a cometer cada vez que
alguien toque esta parte, así que lo fija una guardia.

🔴 **La puerta no decide nada**: llama al mismo `api()` de siempre. Un segundo
catálogo de acciones haría que una acción nueva sirva por un camino y no por el
otro, y el día que pase nadie se va a acordar de que hay dos listas. De paso
hereda gratis el candado del turno.

### El puente · una pantalla, dos caminos

`v2/index.html` detecta dónde está. Dentro del iframe, `google.script.run`;
fuera, `fetch` al `/exec`. Mantener dos pantallas sería mantener dos verdades.

🔒 **La dirección del `/exec` no se escribe en el código.** La app la pide la
primera vez en cada aparato y la guarda ahí. El sitio publicado es público y la
dirección no tiene por qué estarlo; además, así el mismo sitio sirve para la
planilla de pruebas y para la de producción.

Si falta la dirección, la app **no arranca**: la pide. Arrancar sin servidor
dejaría una pantalla muerta sin decir por qué.

### El paquete · `pwa/`, generado desde `v2/`

Manifiesto, service worker e iconos propios —azul institucional con una curva
de presión de la vía aérea, generados con Chromium y versionados—. El index
aquí **no viaja como cohete**: ese formato existe por el lector estricto de
Google, y fuera de Apps Script solo haría la carga más lenta.

🔴 **El service worker no guarda ni un dato clínico, y es deliberado.** Guarda
solo el armazón. Si guardara las respuestas, el censo de la UCI quedaría
escrito en el aparato de cada uno, sobreviviría al cierre de sesión y estaría
ahí si el teléfono se pierde. Dos filtros y cualquiera basta: solo `GET` y solo
del propio origen.

🪤 El nombre del caché lleva el sello de versión. Con un nombre fijo el equipo
se queda con la pantalla vieja para siempre, y el síntoma es «pegué el archivo
y no cambió nada»: el peor rato de depuración que hay, porque el código nuevo
sí está.

### 🪤 Dos cosas que cazaron las guardias, y una era mía de hace un día

**`entrega/LEEME.md` llevaba borrado desde el 15-sep y no me había dado
cuenta.** El empaquetador hacía `rmSync` de la carpeta entera y se lo llevaba
en cada regeneración; mi propia guardia de paridad lo **excluía** de la
comparación en vez de exigir que siguiera ahí. Ahora los dos empaquetadores
borran solo lo que generan, y las dos guardias exigen que el LEEME exista.

**`api_web.gs` no entraba en el paquete.** Lo cazó `checks/paquete.js`: dos
funciones del repositorio quedaban fuera del proyecto que se pega. Sin eso
`doPost` nunca habría llegado al editor y la PWA habría fallado con un error de
red que no dice nada. Ahora viaja junto a `webapp.gs`, que es el otro punto de
entrada.

### Lo que NO se hizo, y por qué

- **Guardar sin conexión**: fuera de alcance del PRD y, sobre todo, guardar
  datos clínicos en el teléfono es el riesgo que el service worker evita.
- **Elegir el alojamiento por él (D1)**: el PRD recomendaba Firebase porque
  GitHub Pages deja el sitio público. Diego pidió GitHub, así que se armó el
  flujo para GitHub, pero la carpeta es estática y sirve tal cual en Firebase o
  Cloudflare. Lo público es la pantalla, no los datos.
- **Encender nada**: el flujo se dispara a mano, no en cada empujón.

## 16-sep-2026 · Un login que no depende de informática

Diego: «¿puedes crear un login de acceso?». El plan maestro eligió Google
Sign-In (D1b) y el servidor para eso ya estaba entero, pero depende de un
proyecto de Google Cloud trabado en informática. Mientras tanto la app corre
en marcha blanca abierta: **cualquiera con el enlace entra y firma con el
nombre que teclee**.

Se le ofrecieron cuatro caminos y eligió **clave propia para el equipo**. Sobre
qué pasa si alguien no logra entrar en medio del turno no tuvo preferencia, así
que se decidió lo más conservador y se le dijo: **nace apagado**, y cuando esté
encendido, sin identidad no se guarda —si no, no resuelve el problema de que
cualquiera firme con el nombre que teclee—.

**No se escribió criptografía nueva.** El Modo Coordinación ya tenía un
mecanismo probado: huella SHA-256 con sal por persona en PropertiesService y
nunca en la planilla, intentos fallidos con espera, sesión con token que muere
por inactividad, cierre en el servidor. `svc_acceso.gs` reusa esa receta con un
**espacio distinto**: una clave de coordinación no abre el turno ni al revés.

🪤 La primitiva del resumen se factorizó a `credHuellaDe`, pero **el texto que
resume coordinación no se tocó**: sus claves ya están creadas en la planilla de
Diego y cambiarlo las habría invalidado todas de una vez, sin que el motivo se
viera en ninguna parte.

🪤 `credHuellaDe` vive en `infra_util.gs` y no en `infra_auth.gs`, que sería su
sitio natural: el simulador y el banco de medición NO cargan infra_auth, así
que una función de identidad puesta allá revienta en cuanto coordinación la
llama. Se vio al mover la huella.

🪤 La misma trampa de las `const` con eval indirecto apareció otra vez en la
guardia nueva: el camino feliz pasaba y el mensaje de error moría con «ERR is
not defined». Se arregla cargando `infra_respuesta.gs` en el mismo ámbito.

**Cómo se enciende**, y esto importa: `accesoSembrarClaves()` reparte una clave
temporal a cada kinesiólogo activo y las imprime para entregarlas;
`accesoEncender()` **se niega** si alguno quedaría sin clave. Encender el
candado sin repartir las llaves deja a la unidad sin poder registrar, que es el
peor resultado posible.

Dos guardias: `acceso_equipo.js` prueba el servidor —que nadie firme como otro,
que la clave no quede en la planilla, que el mensaje no delate quién existe,
que la espera sea por persona y no global, que salir cierre en el servidor— y
`acceso_pantalla.js` abre la app en un navegador real y comprueba que con el
candado puesto **el censo no se pinta**, que la puerta aparece, y que una clave
temporal obliga a elegir una propia antes de entrar.

### 🪤 Y la batería se ponía roja sola cada 16 de septiembre

Al correr la batería con el login apareció `tutorial.js` en rojo, sin que nadie
hubiera tocado el tutorial. Se comprobó contra el índice anterior: también
fallaba. **Del 16 al 20 de septiembre «manda Mauri» de huaso** por Fiestas
Patrias, sus poses de reposo cambian de imagen y las seis comprobaciones de Don
Mauri devolvían «?».

Es la TERCERA vez que una guardia se pone roja por leer el reloj real. Y
`checks/fiestas_patrias.js` ya lo tenía resuelto y escrito en su cabecera —«la
fecha se INVENTA, no se espera»—; el tutorial nunca lo aplicó. Ahora congela la
fecha en un martes de julio.

Se barrieron las 94 guardias de navegador: la mayoría no congela el reloj. No
se reescribieron, porque casi ninguna mira la fecha y cambiarlas sin un motivo
medido es mover código por moverlo. Lo que sí quedó en `CLAUDE.md` son las
**ventanas trampa del calendario**: 16 al 20 de septiembre, los cumpleaños, el
cierre de año y la media hora previa a cada cambio de turno.

---

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
