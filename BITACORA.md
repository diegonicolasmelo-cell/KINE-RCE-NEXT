# BITÁCORA — KINE-RCE-NEXT

Qué se cambió en NEXT, por qué, qué se midió y con qué trampa se tropezó.

**Esto NO son las reglas vigentes.** Las reglas viven en `CLAUDE.md`, que se
lee entero en cada sesión. Este archivo se consulta cuando hace falta el porqué.

🗂️ **18-sep-2026** · Los planes y PRD pasaron a `docs/archivo/` y dejaron de
mandar. Lo esencial está destilado en `docs/LO_ESENCIAL.md`. Las entradas de
abajo que los citan siguen siendo verdad sobre **lo que pasó**; lo que ya no
vale es su autoridad.

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
pero eso lo tiene que decir él: la pregunta está escrita en `docs/archivo/ESTADO_PLAN.md`.

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

---

## 16-sep-2026 · El rediseño de los tres pasos, y quince columnas que se colaban al paciente siguiente

Diego aclaró que NEXT no es una copia de RCE-KINE con arreglos: es un
**rediseño**. La idea de fondo es que el registro de un turno sea un **modal
secuencial** —turno (con sus eventos) → evaluaciones → relato— en vez del modal
único de 225 campos donde hoy conviven las cuatro cosas.

### Lo que se midió antes de opinar

El modelo de datos YA está segmentado desde la rama episodio/turno: episodio,
serie fechada, evento y turno, con 88 comprobaciones verdes en
`checks/episodio_turno.js`. **La pantalla es la que no respeta ese corte.** El
campo `fMRC` vive dentro del formulario del turno y al guardar escribe en tres
lugares a la vez.

Así que el rediseño no toca datos: lleva a la pantalla un corte que ya existe.

### Las decisiones de Diego (quedan en `docs/PRD_EVOLUCION_TRES_PASOS.md`)

Modal secuencial de tres pasos · el relato se retoca a mano porque «es solo
narrativo» · al volver atrás se regenera · **cualquiera** cierra un pendiente ·
el plan va en el paso 3 · se elimina la regla del SBC (KTM nivel 3 exigía un
FSS del episodio), que con el camino secuencial pediría el FSS *antes* del paso
donde se mide. Esa regla sale con la tanda que construya el paso 2, no antes:
hoy el FSS está en el mismo formulario y el candado todavía se cumple sin
fricción.

El mockup navegable que sirvió para decidir:
https://claude.ai/artifact/2uroNmVyBSw5tHgyRFGo5D

### Tanda A · el pendiente deja de morir a las 12 horas

`PLAN_PENDIENTES` es una lista de chips en la fila del turno y el esquema lo
dice con todas sus letras: «NO se replican». Lo que la noche deja encargado no
existe para el día siguiente, así que **nadie puede cerrarlo**.

Ahora hay `PENDIENTES_JSON` en CAMAS_ESTADO —o sea en el episodio, como AET y
UPOT—, con `svc_pendientes.gs` y las acciones `PEND_ABRIR` / `PEND_CERRAR`.
Cada uno guarda quién lo abrió y cuándo; cerrarlo guarda quién lo cerró sin
exigir que sea el mismo (decisión de Diego). No se borra: el histórico del
episodio dice qué se encargó y qué se cumplió.

No hay `PEND_LISTAR` a propósito: viajan dentro de la cama, que el arranque ya
trae. Una acción de listar sería un viaje más por nada.
`PLAN_PENDIENTES` del turno se sigue escribiendo igual, para que la entrega de
turno y el REM no cambien de fuente.

La guardia `pendientes_episodio.js` se escribió primero y se vio roja con 18
fallos. Lo que de verdad prueba es el **contraste**: en el mismo escenario, el
chip del turno no cruza el cambio de turno y el pendiente del episodio sí.

### 🪤 Lo que apareció de paso: el alta dejaba rastro del paciente anterior

Al agregar `PENDIENTES_JSON` a `_limpiarCamaInterno` se vio que esa lista de
campos está escrita **a mano**, y que quince columnas nunca se habían sumado:
`DISP_CONFIRMADO`, `APACHE2`, `CORRECCIONES_JSON`, `ULT_PS`, `ULT_PIM`,
`ULT_PIM_FECHA`, las tres `ULT_*_FIRMA`, las tres `AET_*` y las tres `UPOT_*`.

Todas se habían agregado «SIEMPRE AL FINAL» del esquema después de que se
escribió el limpiador. Medido en el simulador: un paciente recién ingresado
aparecía con **AET activa nivel IIIC**, seguimiento UPOT y la Pimáx del que
ocupó la cama antes. La AET no es un adorno — «AET Grupo IIIC» es una ruta
automática de contraindicación de kinesiterapia.

Ya había pasado idéntico con los relojes `TS_*` el 4 de agosto, y está escrito
en el propio código. **Volvió a pasar porque aquel arreglo fue agregar los tres
nombres que faltaban, no impedir el olvido siguiente.**

Por eso `alta_no_deja_rastro.js` no enumera columnas: las **deriva del
esquema** y exige que toda columna de CAMAS_ESTADO salvo `ID_CAMA` aparezca en
el limpiador. La columna 84 que alguien agregue mañana la pone roja sola.

🪤 Y la guardia tropezó consigo misma: su primera versión leía las claves con
`/([A-Z0-9_]+):/` sobre el bloque crudo, y se comió la palabra «EPISODIO» de un
comentario. Los comentarios se quitan antes de parsear.

**Batería: 154 verdes, 0 rojas.**

---

## 16-sep-2026 · Tanda B · el modal deja de ser un muro y pasa a ser un camino

El registro de un turno era **un modal con 225 campos** en una sola pantalla.
Ahora son tres pasos: **turno (con sus eventos) → evaluaciones → relato**.

### Cómo se hizo, y lo que NO se hizo

🔴 **No se reescribió el formulario.** Las tarjetas siguen donde estaban, con
sus ids y sus funciones; lo único nuevo es un director (`pasoIr`) que muestra
las del paso vigente y esconde el resto. Una tarjeta sin `data-paso` cae en el
turno, que es donde va el 90% de lo que se registra — así una tarjeta nueva
aparece en el paso correcto sin que nadie se acuerde de tocar el director.

Lo único que sí se movió: **el bloque de evaluaciones salió de dentro de
REHABILITACIÓN**, donde era una sub-sección plegada entre 225 campos, a su
propia tarjeta (`#fcEval`). Las 91 líneas viajaron tal cual.

### Dos decisiones que importan

**El guardado ocurre al salir del PASO 2, no al final.** En la UCI se sale
corriendo: si suena una alarma mientras se lee el relato, lo escrito ya está en
la planilla. El enganche es `pasoTrasGuardar()` justo después del `show('rarea')`
del guardado con éxito — o sea, el paso 3 solo existe si el guardado salió bien.

**Un solo botón a la vista, como pidió Diego el 30-ago.** El 💾 de siempre
sigue en el DOM y sigue llamando a `guardar()`, pero nace oculto: el botón que
se aprieta es el del camino, y en el paso 2 ese botón ES el de guardar. Se le
dio el mismo tamaño y la misma piel institucional que tenía el 💾 — si no, el
botón que se usa todo el día quedaba más chico que el que ya nadie ve.

### Tres guardias que cambiaron, y por qué (ninguna se ablandó)

- `plantillas_evolucion.js` manipulaba el textarea del relato desde el paso 1.
  Un textarea con `display:none` no acepta `focus()` ni `setSelectionRange`, así
  que el ➕ de «crear plantilla» no aparecía **nunca**. No estaba roto: la
  guardia lo medía desde el paso equivocado. Ahora va al paso 3 primero.
- `texto_congelado.js` exigía que el único botón visible dijera «Guardar». La
  intención de Diego —UN solo botón— se mantiene; cambió cuál. Ahora exige más
  que antes: un solo botón, **que sea el del camino**, y que en el paso 2 sea
  el que guarda.
- `texto_manual.js` medía el alto del 💾, que ahora está oculto. Mide el botón
  que de verdad se aprieta.

### 🪤 El token que no existía: texto blanco sobre blanco

Escribí `background:var(--acc)` en la barra de pasos. **Ese token no existe en
este proyecto** — el de acento se llama `--primary`. CSS no da error con un
token inexistente: se lo traga y pinta con el valor inicial. Resultado: el
número del paso en el que estabas quedaba blanco sobre blanco.

En el escritorio casi no se notaba. **En el teléfono, donde el rótulo se
esconde y solo queda el número, el paso activo se veía como un hueco vacío.**
Lo vi en el pantallazo, no en el código — otra vez.

`tokens_existen.js` lee el CSS y exige que todo `var(--x)` sin respaldo tenga
su token definido en alguna parte. Se vio roja con el bug puesto y verde con él
sacado, las dos veces.
🪤 Y tropezó con un falso positivo: `--own-bar` no está en ningún `:root`
porque lo define el JavaScript con `setProperty` al armar cada tarjeta de cama.
Es tan real como los demás; la guardia ahora también los cuenta.

**Batería: 156 verdes, 0 rojas.**

### Lo que queda (tanda C)

El paso 2 hoy es el bloque viejo movido: sigue siendo una casilla «registrar
evaluación este turno» que hay que marcar. Le falta lo que lo hace valer —los
chips del episodio con su firma y su fecha, y el botón **«No medí nada este
turno»** que lo cruza en un clic—. Ahí también sale la regla del SBC.

---

## 16-sep-2026 · Un solo verificador de identidad, y los pasos debajo

Diego, mirando la pantalla ya armada: «deja un solo verificador de
identificación, el nombre se repite. Bajo el nombre viene turno, evaluación y
relato».

### Lo medido

Una sonda contó el nombre sobre los elementos HOJA visibles del panel. Salía
**tres veces en cada tamaño**:

| | escritorio | teléfono |
|---|---|---|
| 1 | `#epBanner` | `#mPac` |
| 2 | `#spTitle` («R. FUENZALIDA — Evolución») | `#epBanner` |
| 3 | el chip de la ficha dentro de GENERAL | `#spTitle` |

Tres identificaciones no identifican mejor: gastan el alto de pantalla —lo
único escaso en un teléfono— y obligan a leer dos veces para estar seguro de
que es el mismo paciente.

### Lo que se hizo

Queda **uno**: el banner del episodio, que además del nombre trae edad, día de
estadía, vía aérea, soporte y las escalas pre-UCI. Verificar identidad es
verificar todo eso, no solo el nombre.

- **Salió del formulario y subió arriba de la barra de pasos.** Ese es el orden
  que pidió Diego: primero de quién se trata, después qué se va a registrar.
- `#spTitle` quedó con «Evolución» / «Ingreso» a secas.
- `_mPacBar` quedó vacía. Nació porque en el teléfono el nombre no aparecía en
  ninguna parte del panel; desde que el banner subió, decía lo mismo una fila
  más abajo. Se deja la función y el contenedor vacíos —los llama el riel en
  cada repintado— en vez de desperdigar la limpieza por sus llamadores.
- La ficha plegada empieza por la edad. Lo que ella aporta es lo que el banner
  NO trae: talla, hora de ingreso, Barthel, Charlson, APACHE, ECF.

### Dos guardias cambiaron de sitio, ninguna se ablandó

- `movil_panel.js` medía `#mPac`. Lo que protegía —que en el teléfono se sepa
  sin dudar de qué paciente se trata— no cambió; cambió dónde se lee. Ahora
  mide el banner **y además exige que la barra vieja ya no lo repita**.
  🪤 Su montaje abre el panel a mano, sin `abrirPanel`, así que hubo que
  pintar el banner y **fijar `gDate`**: el banner calcula los días contra la
  fecha del turno, y con el reloj real el «Día 6» habría cambiado cada vez que
  se corre la batería. Ingreso el 04-08 + fecha 10-08 = Día 6, inventada.
- `ficha_y_antes.js` exigía que el resumen trajera el nombre. Ahora exige lo
  contrario —que NO lo repita— y mantiene lo que sí le toca: Barthel y APACHE.

La guardia nueva `identidad_una_vez.js` cuenta el nombre en las dos pantallas y
exige que el identificador esté por encima de los pasos. Se vio roja con 5
fallos.

**Batería: 157 verdes, 0 rojas.**

---

## 16-sep-2026 · Tandas C y D · el camino queda funcional de punta a punta

### Paso 2 · lo que el episodio lleva medido, y la salida barata

Los chips salen de la CAMA (el arrastre del episodio), con **valor · fecha ·
firma**: `MRC-ss 36 · 14-09 · MCC`. Lo que nunca se midió sale en ámbar
(«FSS-ICU sin medir»). Tocar un chip abre su calculadora de siempre.

Y el botón **«No medí nada este turno»**, que era el punto: las escalas no se
miden todos los turnos y son 12 a 20 camas por turno. Un paso que obligue a
llenar algo se abandona en tres días — el equipo aprende a apretar «siguiente»
sin mirar y el paso deja de servir. Se cruza en un clic y aun así deja visto
qué le falta al episodio.

### La regla del SBC salió (D6)

`validarSBC` se **borró** del dominio, el servicio dejó de llamarla y el
cliente dejó de bloquear. No quedó dormida detrás de una bandera.

La sección 2d/3d de `episodio_turno.js` no se borró: **cambió de signo**. Antes
probaba que rechazaba; ahora prueba que NO rechaza, así que si alguien
reintrodujera el candado se pone roja.

### Paso 3 · el ciclo se cierra

«✓ Guardado · evolución del turno Día, 16-09» arriba de todo, porque se llega
ahí solo si el guardado salió bien. Después el relato (se movió delante del
plan, como el mockup), el plan, y **dejar pendiente** — con sugerencias que
salen de lo que el paso 2 mostró sin medir. Ahí se cierra el círculo con la
tanda A: lo que se deja encargado vive en el episodio y el colega de mañana lo
ve al abrir la cama.

**D2 + D3 juntas**: el relato se retoca a mano y al volver atrás se regenera.
Si HABÍA retoque, se avisa antes de pisarlo, con tres salidas (regenerar ·
conservar mi texto · quedarme acá). Nunca se borra trabajo escrito en silencio.

### 🪤 El id del botón se comió a la función

El botón quedó con `id="pasoEvalNada"` y la función se llamó igual. Al tocarlo:
«pasoEvalNada is not a function». No falla al cargar — **falla solo al
apretarlo**.

El mecanismo, medido y no deducido: un handler inline no se evalúa en el ámbito
global; su cadena pasa por el elemento, **después por su formulario**, después
por el documento y recién ahí por el global. Y un `<form>` expone sus controles
por id. Dentro de `#kf`, `pasoEvalNada` resolvía al BOTÓN.

De paso aparecieron cinco funciones más que comparten nombre con un id
(`sugMias`, `plantModNota`, `plantPreview`, `plantModRetirar`, `stkResumen`).
**No son bugs**: se comprobó una por una en el navegador que resuelven a
`function`, porque esos ids están FUERA del formulario. Por eso
`id_no_pisa_funcion.js` mira solo los 467 ids de adentro — acusar a las otras
sería ruido.

### 🪤 Y en el teléfono el paso 2 salía vacío

El acordeón del celular pliega las `.fcard`, y los chips y el botón de salida
vivían dentro de la única tarjeta del paso: se abría mostrando un título
plegado que decía «sin registrar». **Lo que tiene que verse siempre no puede
vivir dentro de algo que se pliega.** Los chips, la salida y la caja de
pendientes salieron de las tarjetas.

Otras dos de la misma mirada: el textarea del relato trae `rows="20"` y
empujaba el plan y los pendientes fuera de la pantalla con el relato casi
vacío (ahora se acota por altura); y el botón «No medí nada», con borde
punteado y fondo de papel, parecía un aviso y no algo que se aprieta.

**Batería: 160 verdes, 0 rojas.** Quedan cuatro guardias nuevas del rediseño
(`tres_pasos`, `paso_evaluaciones`, `paso_relato`, `identidad_una_vez`) más las
dos de trampas genéricas (`tokens_existen`, `id_no_pisa_funcion`).

---

## 16-sep-2026 · Revisión del bloque respiratorio con Diego (1 de 2)

Primera vuelta de la revisión campo por campo. El bloque respiratorio es el más
grande: ~130 campos de los 266 del formulario. **En el turno más común se ven
30**; el resto son bloques de evento y rutas alternativas.

### Lo medido antes de opinar

Nueve escenarios (cuatro estados de vía aérea/soporte + los cinco eventos
declarados). El filtro por modo resultó estar **bien hecho**: ACVC pide sus doce
parámetros y CPAP/PS pide otros doce apropiados, incluidos P0.1, ΔPocc y Pmusc.
Ahí no había nada que arreglar — lo dije al revés en la primera lectura y se
corrigió midiendo.

### Los modos son nueve (decisión de Diego)

Faltaban **SIMV VC** y **SIMV PC**. Un modo que no está en la lista se registra
como otro parecido y el parámetro que lo distingue se pierde.

SIMV es MIXTO: mandatorias + espontáneas con presión de soporte. Por eso
SIMV VC = los parámetros de ACVC **+ PS**, y SIMV PC = los de ACPC **+ PS**. Sin
la PS no se puede saber con cuánta ayuda respiraba entre mandatorias, que es
justo lo que lo distingue del modo controlado puro. Y para lo que depende de
tener mandatorias —humidificación activa, y el relato, que no puede llamarlo
«ventilación espontánea»— los SIMV van con los controlados.

### El evento se declara una sola vez (decisión de Diego)

«Ocurrió TQT este turno» y «Ocurrió decanulación este turno» preguntaban lo
mismo que la fila del paso 1. Dos lugares para el mismo hecho es un lugar donde
quedar a medias. Las casillas **no se borraron, se escondieron**: el guardado
las lee y la fila de eventos las marca por dentro. Lo que se fue es la segunda
pregunta, no el dato.

### 🔴 Y apareció un bug que costaba la extubación entera

Al declarar la extubación desde la fila de eventos, la vía aérea pasa a natural
—correcto— y **el formulario escondía la sección donde se escribe su hora, su
tipo y con qué queda el paciente**. Lo mismo con la decanulación. La
traqueostomía se salvaba de casualidad: deja al paciente en TQT.

Las tres secciones se mostraban solo según la vía aérea del momento, y declarar
el evento cambia esa vía aérea. El evento más importante para el REM —la
extubación— era el más afectado.

🔎 Se comprobó contra el commit `1e88f60`: **el bug ya existía**, viene de la
rama episodio/turno. No lo trajo este cambio.

Regla nueva: un evento declarado este turno mantiene su sección a la vista,
diga lo que diga la vía aérea de salida.

🪤 Y la primera versión de esa regla se escribió **de más**: incluía la
traqueostomía, que deja al paciente EN TQT — con vía natural una TQT no aplica y
su sección debe desaparecer. `via_aerea_previo.js`, una guardia vieja, se puso
roja y lo cazó. La regla quedó acotada a los dos eventos que sí dejan al
paciente en natural.

**Batería: 162 verdes, 0 rojas.**

---

## 16-sep-2026 · Respiratorio (2 de 2) · los tres ejes: vía aérea · soporte · interfaz

Diego lo resolvió en una frase: «lo más lógico es que vía aérea y soporte sean
aparte y la interfaz aparezca», y lo cerró con «VNI. Full face y oronasal no son
invasivo».

### El problema: el dispositivo vivía en dos campos prestados

Hasta acá la mascarilla, la naricera y el tubo en T se guardaban **donde
cupieran**:

- en la **vía aérea** si el sistema las consideraba invasivas o VNI
  (`TOT`, `TQT`, `Full Face`, `Oronasal`);
- en el **modo** si eran oxigenoterapia (`NRC`, `MR`, `CNAF`, `Tubo T`, `HME`,
  `CTAF`, `Válvula de fonación`).

Ninguno de esos «modos» es un modo ventilatorio: son dispositivos. Y una Full
Face no es una vía aérea: es la interfaz de una VNI, que va por **vía aérea
natural**. Guardarla como vía aérea le sumaba al paciente días de vía aérea
artificial que no tenía.

### Lo que quedó

Tres ejes independientes:

| eje | valores |
|---|---|
| **vía aérea** | Natural · TOT · TQT |
| **soporte** | Ambiente · Oxigenoterapia/OAF · VNI · VM |
| **interfaz** | la que ofrezca ese soporte en esa vía aérea |

Cada eje se esconde cuando no tiene nada que ofrecer: con VM invasiva no hay
interfaz que elegir —la vía aérea ya dice cuál es— y con aire ambiente no hay
modo.

El paciente con tubo en T se registra **sin campo nuevo**: vía aérea TOT +
soporte oxigenoterapia + interfaz tubo T. El de VNI: vía aérea natural +
soporte VNI + interfaz full face. Los días de VNI se siguen contando por el
SOPORTE, que no cambió, y la VNI sigue sin sumar a los días de VM.

**Lo guardado no se toca.** `VENT_VIA_AEREA` sigue recibiendo `TOT`/`TQT` con
los mismos textos (125 comparaciones en el código dependen de ellos) y las
evoluciones viejas que guardaron `Full Face` en la vía aérea se siguen leyendo:
`_vaCompat()` las traduce al abrirlas y `_INTERFACES` reconoce el dispositivo
esté donde esté escrito.

### Una columna nueva, y al final de verdad

`VENT_INTERFAZ` en EVOLUCIONES (397 columnas) e `INTERFAZ` en CAMAS_ESTADO.

🪤 La primera versión la puso **junto a los otros `VENT_`**, que es donde se
lee bonito y donde NO va: el esquema tiene una zona de extensiones
post-congelamiento al final justamente para no desplazar los índices de lo ya
escrito en la planilla. Lo cazó `guardado_viajes.js`, la guardia A/B que compara
fila a fila contra el árbol congelado: cuatro comparaciones rojas que no eran
por el cambio que se quería. La columna se movió al final del todo.

Y al moverla se puso roja `pve_superada_sin_extubar.js`, que exigía que sus dos
columnas fueran **las últimas**. Eso no es la convención —ser la última la
rompe cualquier columna futura— sino haber entrado **después** de las que ya
existían. La guardia ahora mide el orden, no el final literal.

### 🔴 Y el modo del aire ambiente se colaba en la oxigenoterapia

`cascadeSop` tenía un respaldo: si el soporte no declaraba modos, ponía
`Sin soporte`. Funcionaba porque **todo** soporte tenía modos —la oxigenoterapia
listaba los dispositivos ahí mismo—. Al mudar el dispositivo a su campo, la
oxigenoterapia se quedó sin modos y el respaldo empezó a escribir
`VENT_MODO='Sin soporte'` en un paciente que **sí tiene soporte**.

En pantalla no se veía: todos los consumidores filtran ese valor. Pero quedaba
escrito en la planilla, turno a turno. Lo cazó `via_aerea_previo.js` al mirar el
payload del guardado.

**Batería: 163 verdes, 0 rojas.**

---

## 16-sep-2026 · Los lectores del dispositivo, y el alto flujo por traqueostomía

Mudar el dispositivo a su propio campo era la mitad del trabajo. La otra mitad
son los **lectores**: había doce lugares preguntando `v('fModo')` para saber qué
llevaba puesto el paciente. Ninguno se cae con un error — simplemente empiezan a
contestar «no hay dispositivo», y el síntoma es una casilla que falta, un índice
que no se calcula o un puntaje más bajo. Nada de eso se ve mirando la pantalla
un rato.

Ahora hay **un solo lector**, `dispositivoActual()`, con su respaldo al campo
viejo para las evoluciones de antes. Lo que arregló:

| dónde | qué pasaba |
|---|---|
| **«Sin requerimientos KTR»** | no aparecía **nunca**: preguntaba por el modo, y con los tres ejes el aire ambiente pasó a llamarse «Sin soporte» ahí y la naricera se mudó |
| **FiO₂ estimada de la naricera** | `l_fio2nrc` se quedaba en `--` |
| **Índice ROX** | no se calculaba en alto flujo |
| **Puntaje de asistencia ventilatoria** | un paciente en CNAF puntuaba «espontánea» (1) en vez de 2 |
| **SAFI** | perdía la FiO₂ estimada de la naricera |
| **Tarjeta de dispositivos** | el gate del HME dejaba sin Trach Care al que respira por él |
| **Horas de válvula de fonación** | no sumaban |
| **`INTUB_MODO_PREVIO`** | viajaba vacío |
| **Chips del móvil** | sin dispositivo, y mostrando «Sin soporte» |
| **Sugerencia del CPAx** | dos ramas muertas (`sop==='CNAF'`, `sop==='Oxigenoterapia'` — nombres que no existen en el catálogo) |

### 🔴 Y el CTAF no tenía dónde escribirse — desde agosto

El alto flujo por traqueostomía se renombró de `OAF/CTAF` a `CTAF` en ago-2026
(«así nos entendemos», Diego). **Seis listas se quedaron con el nombre viejo**,
cuatro en la interfaz y dos en el servidor. Consecuencia: un paciente en CTAF
caía en el `else` final de `renderParams()` —FR, SpO₂ y nada más— y **el flujo,
la temperatura y la FiO₂ no tenían casilla**. Tampoco índice ROX, ni puntaje de
asistencia, y el relato lo narraba con el párrafo genérico.

Es el mismo bug que ya se pagó con la mascarilla de Venturi en agosto: un valor
del catálogo que nadie atiende, y el dato de ese paciente se pierde turno a
turno sin avisar. Ahora los tres nombres viven en una sola función,
`esAltoFlujo()`.

Se arregló en los dos lados —navegador y servidor— porque el relato y el ROX se
calculan por duplicado: el navegador los muestra en vivo y el servidor los sella
al guardar. La guardia nueva `interfaz_un_lector.js` comprueba los dos.

**Batería: 164 verdes, 0 rojas.**

---

## 16-sep-2026 · La extubación se pregunta una sola vez (decisión 1 de Diego)

Textual: «**1 si unifica.** Esto resolvería el cómo queda luego de ese evento en
particular. Y comparte la lógica que ya está».

### Lo que había: dos copias de las mismas cinco preguntas

A la extubación se llega por dos caminos —con PVE superada y sin PVE— y **cada
camino traía su propia copia** de todo lo que se pregunta después:

| concepto | camino PVE | camino sin PVE |
|---|---|---|
| con qué queda | `peModo` | `peModoNo` |
| sus parámetros | `peParamsBox` | `peParamsBoxNo` |
| evaluación post | `fPostExtDet` | `fPostExtDetNo` |
| ¿hubo reintubación? | `cReintub` | `cReintubNo` |
| hora de la reintubación | `fReintubHoraN1` | `fReintubHoraN2` |
| razón de la reintubación | `fReintubRaz` | `fReintubRazNo` |

Y con ellas una copia entera del dibujante de parámetros: `renderParamsPEno`,
sesenta líneas que **empiezan diciendo** «reutiliza misma lógica que
renderParamsPE» y no reutilizan nada. Ocho campos más por duplicado ahí dentro.

Dos lugares para la misma pregunta es un lugar donde quedar a medias, y ya había
pasado: cuando en agosto se arregló la mascarilla de Venturi hubo que acordarse
de arreglarla en los dos. Salió bien por suerte, no por diseño.

### La forma buena ya estaba en la casa

El panel «Queda con» de la **reintubación** es uno solo desde hace meses: vive
fuera de las tres ramas y se **inserta** en la que esté activa. Esta tanda le
aplica el mismo patrón al resto del bloque — que es exactamente lo que Diego
pidió con «comparte la lógica que ya está».

Ahora hay un `#dExtPost` único con las cinco preguntas, y `_panelExtPost()` lo
muda al camino activo. **15 ids duplicados menos, 72 líneas menos.**

🪤 Y de regalo: mudarlo **no borra lo escrito**. Si el colega cambia de camino a
mitad de la declaración, su «queda con NRC» lo sigue. Antes lo escrito en un
camino se perdía al pasar al otro, sin aviso.

### 🔴 La máscara de VNI seguía escribiéndose como vía aérea

`_PE_META` traduce «con qué queda» a vía aérea y soporte, y para los tres modos
de VNI decía `va:'Full Face'`. O sea que **cada extubación a VNI escribía
`VENT_VIA_AEREA_FINAL = 'Full Face'`**, un valor que dejó de ser vía aérea esa
misma mañana. Se leía bien gracias al traductor de compatibilidad, pero se
seguía escribiendo mal, y le sumaba días de vía aérea artificial a un paciente
que acababa de ser extubado. Ahora deja `Natural` con soporte `VNI`.

### El contrato que no se movió

Los dos caminos ya guardaban exactamente lo mismo. La guardia nueva
`extubacion_una_ruta.js` recorre los dos por pantalla y compara **doce campos
del payload uno por uno**, más los valores concretos para que «coinciden» no
pueda significar «los dos vacíos». Unificar la pantalla no cambió ni una celda
de lo que llega a la planilla.

`fio2_venturi.js` pasó de vigilar tres pantallas a vigilar dos, con la razón
escrita: el sitio duplicado se fue, que era justamente el riesgo. En su lugar
quedó el control de que no vuelva a nacer una segunda copia.

**Batería: 165 verdes, 0 rojas.**

---

## 16-sep-2026 · La planilla se lee sin saber programar

Diego, textual: «Te necesito que los nombres de la base de datos sean
entendibles con tan solo mirarlos, no me sirve una abreviación que no sé qué es.
Quizás esto para programadores es esencial pero para un clínico es necesario ser
explícito».

Tenía razón, y el ejemplo lo dio él mismo: `EVAL_T_PMANT_VA` es **presión cuff**,
y no hay forma de adivinarlo. Lo mismo con `EXT_PE_SOP`, `PVE_SC_RAZON` o
`CALC_CESR`. Son **1.166 columnas en 27 hojas** (769 distintas: EVOLUCIONES y
EVOLUCIONES_ARCHIVO comparten lista).

### Las tres opciones que se le pusieron, y la que eligió

1. **Rótulo explícito en la planilla** ← *elegida*. La celda del encabezado dice
   «Presión cuff» y la **nota de la celda** guarda `EVAL_T_PMANT_VA`, para quien
   programe o analice.
2. Renombrar las columnas de verdad, en planilla y código. Es posible —la
   planilla de NEXT está vacía, así que no habría migración— pero son **8.348
   referencias** entre el fuente y las guardias, y habría que puentear las dos
   guardias A/B que comparan contra el código congelado. Queda como tanda aparte.
3. Rótulo ahora y renombrar por secciones.

Y el estilo lo fijó él: «castellano y con tildes pero simplificado, por ejemplo
ese podría ser **presión cuff**». Corto, como se dice en la unidad — no «presión
del manguito de la vía aérea».

### Por qué el rótulo es seguro

**El encabezado no lo lee nadie para cargar datos.** Las lecturas van por
POSICIÓN (`esquemaFilaAObjeto`, desde `FILA_DATOS`), nunca buscando el texto de
la fila de títulos. Por eso cambiar el texto no toca una sola línea de lo que
lee o escribe datos — y por eso el nombre técnico tiene que quedar a la vista en
algún lado, que es lo que hace la nota.

El rótulo es el **tercer elemento de la misma tupla**: `['VENT_VIA_AEREA','texto',
'Vía aérea (natural, TOT o TQT)']`. Una sola lista, un solo lugar. Dos listas de
nombres para lo mismo es exactamente cómo nació el desajuste 119≠132 del sistema
viejo.

Se comprobó, antes y después, que **el orden, los tipos, los totales y las filas
de datos de las 27 hojas quedaron idénticos**. EVOLUCIONES sigue en 397 columnas
con los datos desde la fila 4.

### Las ocho siglas que se quedan siendo siglas

PEEP · IPAP · EPAP · FSS-ICU · VISAGE · RUT · INR · PCR. En la unidad nadie dice
«presión positiva al final de la espiración»: dice PEEP, y escribirlo largo haría
la planilla **menos** legible, que es lo contrario de lo que se pidió. La lista
es corta, explícita y está escrita con su razón dentro de la guardia — igual que
la lista de `rut_minimo.js`, no es una puerta abierta.

### Lo que vigila la guardia nueva

`rotulos_legibles.js`: que ninguna columna se quede sin rótulo, que el rótulo no
sea la sigla otra vez, que quepa en la celda (42 caracteres), que dos columnas de
una hoja no se lean igual, que las que motivaron el pedido digan lo que tienen
que decir, y —corriendo `crearORepararEstructura()` de verdad contra una planilla
de mentira— que el encabezado escriba el rótulo y la nota el nombre técnico.

La comprobación también entró a `testEsquema()`, que corre **dentro de la app**:
una columna sin rótulo sale con su sigla y nadie se entera hasta que alguien abre
la planilla.

🪤 Y `cuadrarEncabezados()` —la herramienta que arregla la planilla cuando se
desalinea— ubica la fila de encabezado buscando el primer nombre en la columna A.
Con el rótulo ahí habría contestado «no se encontró la fila de nombres, revisar a
mano» en las 27 hojas. Ahora reconoce las dos formas: el rótulo, y el nombre
técnico de una planilla escrita antes del cambio, que es justo la que esa
herramienta existe para reparar.

### Seis guardias se pusieron rojas, y estaba bien que se pusieran

`dias_vni`, `equipos_categoria`, `episodio_turno`, `pendientes_episodio`,
`sas_real` y `tres_ejes_respiratorio` leen `esquema.gs` como texto y buscaban la
tupla de DOS elementos. Se actualizaron para aceptar el tercero como opcional:
siguen exigiendo exactamente lo mismo —que la columna exista, con su tipo y en su
lugar— y no se aflojó nada.

**Batería: 166 verdes, 0 rojas.**

---

## 17-sep-2026 · El tercer eje también después del evento

Las dos puntas sueltas que quedaron de los tres ejes, aprobadas por Diego.

### 1 · Los paneles «queda con» no tenían dónde anotar el dispositivo

Intubación, reintubación y traqueostomía preguntaban **soporte y modo, nada
más**. Un paciente que se traqueostomiza y queda en oxigenoterapia no tenía
dónde anotar si quedó con **HME, tubo en T, CTAF, CNAF o válvula de fonación**:
el dato se perdía en el mismo turno en que se generaba.

Ahora los tres ofrecen el eje que faltaba, y **del mismo catálogo que el bloque
del turno** (`VMAPS`) — un segundo catálogo haría que un dispositivo nuevo
aparezca arriba y no después del evento, que es cómo nacen las listas que se
contradicen. Cada eje se esconde cuando no tiene nada que ofrecer: con VM
invasiva la vía aérea ya dice cuál es la interfaz.

De paso, las tres funciones que dibujaban esos paneles eran **la misma con otro
prefijo**. Ahora es una (`_quedaConEjes`).

### 2 · El estado final del turno tampoco tenía columna de interfaz

Cuatro columnas nuevas (401): `INTUB_INTERFAZ_POST`, `REINTUB_INTERFAZ_POST`,
`TQT_INTERFAZ_POST` y `VENT_INTERFAZ_FINAL`.

Sin ellas el dispositivo terminaba escrito en `VENT_MODO_FINAL` — la forma vieja
que los tres ejes vinieron a corregir. Una naricera no es un modo ventilatorio.
`_soloModo` y `_soloInterfaz` reparten cada valor a su columna con el mismo
reconocedor que usa el resto (`esInterfaz`), no con una lista aparte.

### 🔴 Y al arreglarlo apareció un modo fantasma que cruzaba el turno

Con el dispositivo fuera del modo, el modo final queda **vacío** en
oxigenoterapia y en aire ambiente — que es lo correcto. Pero el sincronizador de
la cama hacía `MODO: val(modoFin, cama.MODO)`: con el modo final vacío **se
quedaba con el anterior**.

O sea: un paciente extubado a naricera heredaba el «CPAP/PS» de cuando estaba en
VM, y **el colega del turno siguiente abría el formulario con ese modo puesto**.
Es la misma trampa del respaldo de `cascadeSop` del día anterior, pero esta
cruzaba el cambio de turno. Ahora, si el turno declaró un soporte sin modo, el
vacío ES el dato.

La cama también arrastra el dispositivo (`CAMAS_ESTADO.INTERFAZ`, que existía
desde ayer y **nadie escribía**).

### La regla del HME, que se preguntaba al campo equivocado

El weaning por traqueostomía conserva el HME si el paciente **respira POR él**.
Esa regla preguntaba `modoFin !== 'HME'`, y con el HME mudado a la interfaz
empezó a descartar el filtro que el paciente tiene puesto. Lo cazó
`dispositivos_reglas.js`. Ahora mira los dos campos, y la guardia comprueba el
mismo weaning **por los dos caminos**: con el HME en el modo (una evolución
guardada antes) y con el HME en su campo (como se escribe hoy). Si alguien vuelve
a atar la regla a uno solo, uno de los dos bloques cae.

### Ocho guardias rojas, todas por su razón escrita

Cinco por el total de columnas (397 → 401). `desvinculacion` porque la ventana de
su expresión regular quedó corta al crecer la cascada del estado final — lo que
exige no cambió. `dispositivos_reglas` era un bug de verdad, arriba.
Y `extubacion_una_ruta`, mía de ayer, pedía el dispositivo en `VENT_MODO_FINAL`:
ese es justo el cambio deliberado de hoy, así que ahora pide el dispositivo en su
columna **y el modo vacío**.

**Batería: 167 verdes, 0 rojas.** Comprobado además en pantalla de teléfono: los
tres paneles muestran y esconden cada eje como corresponde, sin desborde.

---

## 17-sep-2026 · El paso 1 · Prevención de NAVM, y la tercera copia de la fecha

Primera tanda de programación del PRD de la revisión campo por campo. Diego la
eligió como punto de partida después de ver el mockup.

### Qué se hizo, en una línea

El bloque «Dispositivos» —que vivía en medio del paso del turno con tres
calendarios escritos a mano y 534 caracteres de párrafo— se convirtió en un
paso propio, **primero del camino**, de cinco líneas y un toque cada una.

### Por qué va primero

Es el orden real del trabajo. Diego: *«llegas, miras: está con tubo traqueal,
está ventilado, está sentado o en 30 grados en la cama, tiene el cuff bien… y
después me voy a revisar lo ventilatorio»*. Si fuera al final se completaría de
memoria al cerrar la evolución, en vez de mirando al paciente.

### 🔴 La tercera copia de la fecha era una segunda puerta

Midiendo antes de tocar apareció que el cambio de dispositivo **ya era un
evento** (`svc_eventos.gs`): el ➕ reinicia el reloj en la cama, deja el hito en
la línea de tiempo con hora y autor, y se niega a anotar hacia atrás si la cama
ya tiene otro paciente. La fecha vivía en tres lugares:

| Dónde | Qué guarda | ¿Hacía falta? |
|---|---|---|
| La cama | el reloj vigente | **sí** — estado del episodio |
| La línea de tiempo | el cambio, con hora y quién | **sí** — el evento |
| La fila del turno | una copia | **no** |

Peor que redundante: la fecha se escribía desde el formulario del turno **y**
desde el evento ➕. Dos puertas a un mismo dato es lo que este proyecto ya pagó
tres veces (el desajuste 119≠132, los nueve escapadores, las dos rutas de la
extubación). Ahora el paso **marca** (`NAVM_HME`/`HEPA`/`TC`) y el reloj lo
reinicia el servidor, con la fecha efectiva del turno, por el mismo camino de
siempre.

**Lo que hizo seguro el corte**: la sincronización a la cama ya usaba
`val(loDelTurno, loDeLaCama)`, que conserva lo de la cama cuando el turno llega
vacío. O sea que saltarse el paso NO borra el reloj de un dispositivo
instalado — el 🔴 que CLAUDE.md señalaba. Se ancló en la guardia (B5-B7) para
que nadie lo cambie por una asignación directa sin darse cuenta.

### Las dos reglas que ya sabía el servidor

Diego planteó dos casos como problemas a resolver, y los dos **ya estaban
decididos** en `estadoDispositivos`:

- **Humidificación activa**: excluye al HME (pasiva ↔ activa). En pantalla es un
  selector de dos posiciones en la propia fila del HME; al elegir la activa su
  reloj se apaga y deja de pedirse.
- **HEPA del ventilador**: en un Puritan Bennett o una Avea el filtro es del
  equipo (`CONFIG HEPA_FIJO_EQUIPOS`, por prefijo). La fila **se muestra** —su
  fecha es la referencia de instalación— pero no pide toque ni bloquea.

`prevFilas()` es el espejo cliente de esa función. La única diferencia es
deliberada y está escrita: allá `aplica` incluye «y además tiene fecha», acá se
separa en `aplica` (la regla clínica) y `conReloj`, porque la pantalla necesita
mostrar la fila aunque falte la fecha — que es justo cuando hay que instalarlo.

### Qué obliga y qué no

Filtros y Trach Care obligan (kinesiología está a cargo y son medida de IAS),
**pero se pasa con razón escrita**: bloquear de verdad haría que la gente
invente una fecha para poder avanzar, y ahí se pierde el dato *y* la medida.
Cabecera y cuff son opcionales — su omisión **es** el dato del cumplimiento.

La cabecera tenía columna (`VENT_CAB_RSS`) y un lector en el resumen de NAVM
desde hacía tiempo, pero **nadie la escribía**: el indicador salía siempre
vacío. Ahora se escribe. El cuff se mudó entero desde Respiratorio conservando
sus ids, `setCuff()` y `cuffGate()`.

### 🪤 Las cuatro trampas de esta tanda

1. **El default de `data-paso` sigue al TURNO, no al número uno.** `pasoIr`
   reparte las tarjetas por `data-paso` y la que no lo declara «cae en el
   turno». Con el turno en el paso 1 daba igual escribir `'1'`; al meter la
   prevención delante, dejarlo habría mandado **todas** las tarjetas sin dueño
   —que son casi todas— al paso de prevención, con el turno vacío.

2. **Una guardia que pasa en verde antes del cambio no prueba nada.** Tres de
   las comprobaciones nacieron verdes por accidente y hubo que afinarlas:
   `Math.min(4,` casaba con `_charlsonEdadPts`, el Trach Care no viaja como
   `DISP_TC_FECHA` sino como `VENT_FECHA_SONDA`, y los tres calendarios salían
   «invisibles» solo porque se medían desde el paso 1 y con el formulario en
   blanco (la tarjeta se muestra únicamente en VM). Al medir el escenario real
   —parado en el paso 2, con el paciente en VM— salieron rojas de verdad: **sí
   se veían y ya no guardaban nada**. Ese era el bug que iba camino a Diego.

3. **`DB` se declara con `let`, así que no cuelga de `window`.** La guardia le
   asignaba `window.DB` y la cama quedaba vacía: la lista de filas salía en
   blanco con todo lo demás en verde. Es la misma trampa que CLAUDE.md
   documenta para las `const` y el eval indirecto.

4. **El resumen del acordeón del celular se arma leyendo los `<input>`
   visibles, y la prevención son botones.** Sin resumen propio decía «sin
   registrar» aunque estuviera toda revisada — un falso «te falta» en la única
   pantalla donde la sección va plegada y el colega no puede abrirla para
   desmentirlo.

### Lo que quedó escondido y por qué

Los tres calendarios siguen en el DOM como campos **ocultos**, porque
`calcInsumosDias()`, `autoFechasDispositivos()` y `_dispSnapshot` los leen para
el arrastre entre turnos. No se ven, no se llenan y no mienten. ⏳ Sacarlos del
todo queda pendiente para cuando esas funciones se muden a leer el reloj de la
cama.

### La batería

`tres_pasos.js` pasó a llamarse `cuatro_pasos.js`: la convención cambió de
verdad, no se ablandó la guardia. Otras 14 salieron rojas por la renumeración
de pasos y el total de columnas (401 → 405); todas se actualizaron con su razón
escrita, ninguna con una excepción.

**168 guardias · 168 verdes.** `prevencion_navm.js` es la nueva (32
comprobaciones en siete secciones), y se vio roja con 14 fallos antes de
escribir una línea de código.

---

## 17-sep-2026 · Los dos motores del relato contaban distinto

Segunda tanda del PRD de la revisión campo por campo: los bugs medidos.

### El hallazgo de fondo

El relato se arma en **dos lados**: el navegador lo muestra en vivo mientras se
llena el formulario, y el servidor lo **regenera** para la entrega de turno y la
hoja impresa. Son dos motores sobre los mismos datos, y se fueron separando sin
que nadie lo notara, porque nadie mira las dos salidas a la vez.

La guardia nueva `relato_espejo.js` arma **un solo juego de datos**, se lo da a
los dos motores y exige que digan lo mismo. Es la guardia de raíz: la próxima
divergencia sale el día que se escribe, no seis meses después.

### 🔴 «(día ?)» en toda evolución con vía aérea artificial

El navegador calculaba los días de tubo o traqueostomía, los mostraba en su
recuadro y los narraba —«VAA mediante TOT N° 7.5 a 22 cm de arcada dental (día
6)»— pero **nunca los mandaba en el guardado**. El servidor leía la columna
vacía y escribía «(día ?)». O sea que toda evolución con vía aérea artificial
salía impresa con un signo de pregunta donde iba el día, mientras en pantalla se
veía bien. Una línea de payload: `DIAS_VA: v('fDiasVA')`.

### 🔴 El Glasgow venía puesto de fábrica

Los tres desplegables nacían con `selected`: O:4, V:5, M:6. Toda evolución abría
con **GCS 15 ya escrito** y se guardaba así aunque nadie hubiera evaluado al
paciente. Un 15 de fábrica en la ficha de uno sedado no es un dato faltante: es
un dato **falso**, y se lee igual que uno medido.

Ahora arrancan vacíos y el relato solo lo nombra si alguien lo midió, en los dos
motores. Se hereda del turno anterior — ya estaba en `_HER_CAMPOS`.

**Dos cosas que aparecieron al arreglarlo:**

- **La verbal automática no es una medición.** Con vía aérea artificial el
  formulario pone V=1T y la bloquea, y eso está bien: un paciente intubado no
  puede emitir respuesta verbal. Pero entonces lo que alguien *evalúa* es la
  ocular y la motora, y la condición para narrar es esa, no las tres.
- 🪤 **Un segundo valor de fábrica, escondido en el automatismo.** Al dejar de
  estar intubado, `calcGCS` ponía la verbal en **5** («orientado»), que es el
  mejor puntaje posible y nadie lo había evaluado. Era el mismo bug que se
  acababa de sacar de los desplegables, una capa más abajo.

🔴 Lo que **no** se hizo, porque Diego lo corrigió expresamente: el Glasgow no
se esconde nunca por sedación profunda. *«El Glasgow igual uno lo puede evaluar
en caso de que un paciente esté profundamente sedado, ya que la evaluación ahí
me va a dar el puntaje mínimo, que son tres puntos… podría ser SAS 1 Glasgow
3»*. La guardia lo fija.

### Los subíndices

El motor de texto usaba las **dos formas**: la misma evolución decía «FiO2 40%»
en una línea y «FiO₂ 40%» en otra. Veinticinco apariciones en `dominio_texto.gs`
y `svc_entrega.gs` pasaron a la forma llana, que es la decisión de Diego: todo
llano en el texto clínico. Las **etiquetas de la pantalla** no se tocaron: en un
`<label>` el subíndice se ve bien y no es lo que él reportó.

### UPOT no afirma sola

Decía «Paciente en seguimiento por UPOT, **con sospecha de muerte cerebral**».
Es una afirmación clínica fuerte y la escribía sola la casilla: el colega
marcaba «seguimiento por UPOT» y la evolución afirmaba una sospecha diagnóstica
que él no había escrito. Ahora dice solo lo que es.

### El 🩻 de la entrega impresa

En la pantalla el ícono ya se había cambiado por un SVG propio el 6-sep, cuando
Diego lo vio salir como un cuadrado. En `svc_entrega.gs` —texto plano— seguía
puesto. Pasó a 📷 (2010). Los **comentarios** que recuerdan por qué no se usa se
quedan: son la memoria del bug.

### Lo que NO había que arreglar

El PRD anotaba que el IMT y la EMS divergían entre los dos motores (en pantalla
sin parámetros, en el servidor con todos). **Al medirlo hoy con la guardia
nueva, los dos coinciden**: ambos narran las series, el porcentaje de PiMáx, los
minutos, el descanso, los Hz, los mA y el ancho de pulso. Esa divergencia ya no
existe, y tampoco la de «con asistencia asistencia mínima». Sí quedaba viva la
de los minutos: «(20 min)» en pantalla contra «durante 20 minutos» en el
servidor. Se unificó hacia la del servidor, que es la que se lee como frase.

### 🪤 La trampa de la guardia que se pone roja por su propia documentación

Dos comprobaciones buscaban «sospecha de muerte cerebral» y «🩻» **grepeando el
fuente entero**. Después de arreglar el código seguían rojas: los comentarios
que explican el arreglo contienen la frase y el emoji. Se reescribieron para
medir lo que los motores **escriben**, y en el caso del emoji, solo las cadenas
literales — con un control que exige que el comentario siga ahí.

### La batería

**170 guardias · 170 verdes.** Dos nuevas: `relato_espejo.js` (27
comprobaciones) y `glasgow_medido.js` (18). `afinado.js` se actualizó a la forma
llana con su razón escrita.

---

## 17-sep-2026 · «Vigente» y «lo cambié» dicen cosas distintas

Diego, mirando la pantalla: *«si vence mañana y uno aprieta vigente, quiere
decir que vence mañana, o sea que todavía está vigente; no es que lo cambié»*.

Tenía razón, y al medirlo aparecieron dos cosas separadas.

### Lo que ya estaba bien

En el código real la distinción ya existía donde más importa: el servidor
reinicia el reloj **solo** con la marca `'chg'`, y `'ok'` deja pasar la fecha
que la cama ya tenía. El chip de la fila tampoco se movía al marcar «vigente».
Se ancló con cinco comprobaciones nuevas para que nadie lo funda por
simplificar.

### Lo que sí estaba mal: el mockup

El artefacto que Diego estaba mirando leía **cualquier** marca como «cambiado
hoy» — apretar «vigente» en un filtro que vencía mañana decía que se había
cambiado. Era justo lo que él señaló, y estaba solo ahí. Corregido en los tres
tableros.

🪤 **Un mockup que miente sobre el comportamiento es peor que no tenerlo**: se
revisa como si fuera el producto y las decisiones se toman sobre él. Vale la
misma regla que para el código: si el tablero dice algo, tiene que ser lo que
el código hace.

### Lo que faltaba en el código: el otro lado del mismo asunto

Marcar «lo cambié» dejaba el chip diciendo «vence hoy». El colega registraba el
cambio y la pantalla seguía avisando de él. Ahora el reloj sigue a la marca:

- **«vigente»** → el chip no se mueve. El filtro es el mismo y vence cuando
  vencía.
- **«lo cambié»** → «cambiado en este turno». Hay uno nuevo y su reloj arranca
  de cero al guardar.

### 🔴 Y un hueco que salió de camino

En un filtro **vencido** se podía apretar «vigente». Decir que está vigente algo
que venció ayer es una contradicción escrita en la ficha de un paciente, y
además «cumplía» la medida de IAS sin que nadie hubiera tocado el filtro. Ahora
un filtro vencido no ofrece esa opción: queda cambiarlo, o dejar la razón
escrita de por qué no se pudo.

🪤 **«Vence hoy» sí admite «vigente»**, y no es lo mismo: la regla de la unidad
es que los circuitos se cambian en el turno **Noche**, así que el colega de día
que lo mira y lo ve bien está diciendo la verdad. Vencido es otra cosa.

**170 guardias · 170 verdes.**

---

## 17-sep-2026 · El tubo se muda a Respiratorio, y dos fantasmas más

Tercera tanda: §3.1 y §3.9 del PRD.

### El orden del formulario ya era el correcto, salvo por una cosa

Al listar «📊 General» campo por campo apareció que el formulario **ya sigue el
orden en que Diego narra** —día y motivo, sedación, hemodinamia, auscultación,
respiratorio—, y que lo único que lo rompía eran los datos del TUBO, que
estaban en General, **tres secciones antes de donde se usan**. Se mudaron
enteros (número, cm de arcada dental, tipo de cánula, cambio de tubo y de
cánula) al principio del bloque respiratorio: primero con qué respira, después
cómo se ventila.

### 🪤 La fijación era un campo fantasma

`fTOTfij` estaba escondido, se cargaba al abrir desde la evolución anterior… y
al guardar se escribía la **constante** `'Arcada dental'` ignorando lo cargado.
Leía un dato, lo guardaba en una variable y no lo usaba nunca. La norma de la
unidad es arcada dental, el guardado la sigue escribiendo y la etiqueta del
campo de los cm ya lo dice. El campo se borró entero.

### Fuera el contador que repetía

Diego: *«tubo y TQT son vía aérea artificial, eso se repite»*. Ahora con tubo se
ven los días de tubo, con TQT los de TQT, con VNI los de VNI, y los de VM
siempre. El valor de días de vía aérea se sigue calculando —el relato dice «(día
N)»— pero ya no ocupa una casilla al lado de la que dice lo mismo.

### 🪤 Y un tercer residuo, éste con efecto clínico

`const esVNI = va==='Full Face' || va==='Oronasal'` aparecía **dos veces**, y
nunca era cierto: con el modelo de tres ejes el selector de vía aérea solo
admite Natural, TOT y TQT — «Full Face» y «Oronasal» pasaron a ser INTERFACES.
Era residuo del modelo viejo, y el efecto es que **el contador de días de VNI no
aparecía en el primer turno de VNI**: solo salía cuando ya había días
acumulados. La VNI es un soporte, y así se pregunta ahora.

Este apareció porque la guardia montó el escenario con la forma vieja y no
calzó. Vale la pena anotarlo: una guardia que pide un escenario imposible no
prueba nada, y el intento de montarlo fue lo que destapó el bug.

### §3.9 · El paro que no se veía

🔴 **El RCP se narraba SOLO en el servidor.** El colega marcaba «🚨 RCP», leía su
evolución sin una palabra del paro, la guardaba, y el texto aparecía después en
la entrega de turno. Es el hecho más grave que puede ocurrir en un turno y era
justamente el que no se veía en la pantalla donde se registra.

Y **los tres traslados** (imagenología, pabellón, asistencia médica) no se
narraban en **ninguno** de los dos motores: solo llegaban a la entrega. Un
traslado a pabellón es justo lo que explica por qué no hubo kinesiterapia.
Ahora los dos motores cuentan las dos cosas.

El emoji de la entrega quedó en **🖼️**, que es el que el formulario ya usa para
esa misma casilla — no 📷, como había puesto en la tanda anterior. Que los dos
digan lo mismo importa: es el mismo evento.

**171 guardias · 171 verdes.** Nueva: `via_aerea_en_respiratorio.js`.

---

## 17-sep-2026 · El prono se separa de la TQT, los gates por los dos extremos, y la PPC se calcula

Cuarta tanda: §3.2, §3.4 y §3.7 del PRD.

### El prono no es asunto de la traqueostomía

Vivían pegados en la misma sección y no tienen ninguna relación. Diego: *«prono
y supino viven junto a TQT; eso es un procedimiento en caso de falla
respiratoria catastrófica y es un evento aparte»*. Los tres posicionamientos son
cosas distintas y ahora viven separados:

- **Decúbito lateral** → técnica del turno (favorecer un pulmón, atelectasia).
  Se queda en terapia respiratoria.
- **Cabecera 30-45°** → prevención de NAVM. Se fue al paso 1.
- **Prono / supino** → evento que trasciende el turno, en sección propia.

**«Sedente >45°» salió.** Medido antes de cortar: `RESP_POS_SED` no alimenta
ningún indicador ni el REM, solo aparecía en la hoja diaria y en el resumen de
la entrega. Y se confundía con la cabecera, que es otra cosa con otro objetivo.

### 🪤 Mover una sección destapó un corte por posición

`M_SUBS` —los sub-bloques plegables del celular— decía en su propio comentario
que los cortes «se declaran por ID y no por posición». Era verdad a medias: el
`desde` sí era un id, pero la sub-sección que lo aloja se elegía **por número de
orden**. Al darle al prono su propia sección, todos los números se corrieron y
el chip «⏱ 20,3 h en prono» quedó en el grupo equivocado, con ancho cero — o
sea invisible, en la pantalla donde se hace la ronda. Ahora la sub-sección se
identifica por un id que vive dentro de ella.

### Los gates de sedación, por los dos extremos

El extremo bajo ya funcionaba. Faltaba el alto, y sobre todo faltaba **separar
el CAM-ICU de la cooperación**:

| | SAS 1-2 | SAS 3-4-5 | SAS 6-7 |
|---|---|---|---|
| Cooperación y S5Q | no | sí | **no** |
| CAM-ICU | no | sí | **sí** |

🔴 El CAM-ICU tiene **piso pero no techo**: se esconde con sedación profunda,
nunca por agitación. La agitación de un SAS 6-7 es justamente donde vive el
delirium hiperactivo —el más frecuente en UCI y el que más impacta al equipo—,
así que esconderlo ahí era perder el diagnóstico donde salta a la vista.

El Glasgow no entra en ningún gate: se puede medir siempre.

### 🪤 Dos efectos cruzados con la tanda del Glasgow

1. **El total inventaba un número.** Desde que el Glasgow arranca vacío, la suma
   de tres campos en blanco daba «1T» —la verbal automática del intubado más dos
   ceros— y ese 1 se leía como Glasgow 1 en los gates: con SAS 4 se escondían la
   cooperación, el S5Q y el CAM-ICU porque el sistema creía que el paciente
   estaba en coma. Sin medición no hay total: el rótulo dice «--».

2. **El Glasgow automático quedaba pegado.** El automatismo escribe 1/1T/1 en
   SAS 1 —validado por Diego, es correcto: en SAS 1 la evaluación da 3 puntos—
   pero al subir a SAS 4 el paciente seguía con un Glasgow 3 que nadie había
   medido. Ahora se suelta, y solo se borra lo que puso el automatismo: un
   Glasgow 3 escrito a mano por alguien que de verdad evaluó no se toca.

### La PPC se calcula

Es PAM − PIC. Eran tres números independientes en la misma fila y se podía
anotar una presión de perfusión que no cuadraba con los otros dos. Faltaba
además la **PAM medida**: la única PAM que existía era `HEMO_PAM`, que es la
*meta* del bloque hemodinámico — otra cosa. Columna nueva al final
(`HEMO_PAM_MED`, total 406), se pide solo con captor, y la PPC pasó a ser de
solo lectura.

🪤 **Y una guardia cazó un bug que introduje al hacerlo**: mi limpieza «si no se
ve, se vacía» más un recálculo incondicional **borraban la PIC y la PPC de una
evolución anterior a esta versión** —esas filas traen PIC y PPC pero no PAM
medida ni la casilla del captor—. `neuro_dve_pic.js` existe exactamente para
eso. El mecanismo de no pisar lo histórico ya estaba y es el que manda.

**172 guardias · 172 verdes.** Nueva: `sedacion_prono_ppc.js`.

---

## 17-sep-2026 · Cada sesión de KTM lleva lo suyo

Quinta tanda: §3.8 del PRD. El único cambio de modelo de datos de toda la
revisión.

### El problema

La KTM del turno se guardaba como **un** juego de datos —un nivel, una
asistencia, unos minutos, un Borg— más un contador aparte. Diego: *«2 KTM, una
nivel 2 y otra nivel 3, y pueden rendir de forma diferente»*. Con ese modelo la
segunda sesión desaparecía: el contador decía «2» y el relato narraba una sola,
con los datos de la última escritos encima de la anterior.

### El diseño

Una columna con la **lista** (`KTM_SESIONES_JSON`, total 407), cada elemento con
su nivel, asistencia, minutos y Borg. Y de ahí se **derivan** las dos cosas que
ya consumía el resto del sistema:

| Dato | Quién lo usa | De dónde sale ahora |
|---|---|---|
| **Cantidad** | el REM (sesiones = KTR + KTM) y los indicadores de atenciones | contar la lista |
| **Nivel** | la entrega, la cama, la categorización SOCHIMI | el **más alto** de la lista |

Las dos columnas viejas se siguen escribiendo exactamente igual: lo que cambió
es de dónde salen sus valores. Nada del REM ni de los indicadores se tocó.

El relato las narra **individualizadas**, a propósito, para que el colega pueda
editarlo y describir más: *«Se realiza KTM. Primera sesión: nivel 2 con
asistencia mínima durante 20 minutos. Segunda sesión: nivel 3 con asistencia
supervisado durante 15 minutos.»* Con una sola no se numera — «Primera sesión»
sobra cuando no hay segunda.

**El Borg entró al relato.** Se guardaba desde hacía tiempo y no lo leía nadie:
era un dato con un solo uso, fuera del esquema.

### 🔴 Compatible hacia atrás, y eso no era opcional

Hay meses de turnos escritos con el modelo viejo. `ktmSesiones()` es el **único
lector** y devuelve una fila vieja como una sesión, con su contador y su nivel
intactos: se lee y se narra igual que siempre. Tres comprobaciones de la guardia
existen solo para eso.

### 🪤 Un fallback silencioso que no llegaba a fallar nunca

El cliente derivaba llamando a `ktmSesiones()` «si existía»… y en el navegador
**nunca existe**: esa función vive en el dominio del servidor. O sea que caía
siempre en el camino de respaldo, que devolvía nivel vacío — y el nivel que
manda no llegaba ni a la cama ni a la categorización SOCHIMI, sin que nada
avisara. Ahora la derivación está escrita en los dos lados, como espejo
declarado, y la guardia le da **el mismo JSON a las dos funciones** y exige que
devuelvan lo mismo en cuatro casos.

Es la misma clase de trampa que las `const` que no cuelgan de globalThis: un
`typeof x === 'function'` que resulta ser siempre falso no da error, da un
resultado equivocado.

### 🪤 Y los rótulos legibles pelearon dos veces

`rotulos_legibles.js` rechazó primero el rótulo por largo (48 > 42) y después
por repetido: «Sesiones de KTM del turno» chocaba con el de `KTM_CANT`.
Quedaron **«Cuántas sesiones de KTM»** y **«Detalle de cada sesión de KTM»**,
que es exactamente la distinción que hay que poder ver de un vistazo en la
planilla.

Diego avisó que este diseño *«no me gusta mucho, lo modificaré cuando lo vea en
vivo»*. Está construido para retocarlo con la pantalla delante.

**173 guardias · 173 verdes.** Nueva: `ktm_sesiones.js`.

---

## 17-sep-2026 · Una escala, un chip

Sexta y última tanda del PRD de la revisión: §4.

Los chips del paso de evaluaciones ya funcionaban bien —se abre una escala a la
vez, mostrando lo que el episodio lleva medido con su fecha y quién midió—, pero
debajo quedaba una puerta vieja: al entrar a «registrar una medición» se
desplegaban **diecisiete campos de golpe**, casi todos de escalas que ese turno
no se iban a medir.

Diego: *«las demás escalas también pásalas a un chip que se abran solas de forma
individual y no que aparezcan todas de golpe… esto hace que cada uno seleccione
de forma dirigida lo que quiere medir y registrar, ya que no siempre se registra
todo»*.

Los chips pasaron de cinco a **diez**: MRC-ss, FSS-ICU, CPAx, Pimáx, PEmáx,
FEmáx, dinamometría, IMS, ecografía y protección de vía aérea.

**Los agrupamientos los dio él, y no son arbitrarios**: se juntan las que de
verdad se miden juntas.

- **Ecografía** (grosor diafragmático, cuádriceps D/I, Heckmatt, engrosamiento
  D/I, excursión D/I): *«el grosor diafragmático, cuádriceps y todo eso debería
  entrar en ecografía y de ahí desplegar el resto»*. Es un solo examen con el
  transductor en la mano.
- **Protección de vía aérea** (deglución + test de azul): *«deglución y test de
  azul aparte… lo englobaría en protección de vía aérea»*. Las dos responden la
  misma pregunta clínica.

**Tocar un chip cierra los demás.** No es un detalle: si cada toque fuera
dejando desplegables abiertos, después de tres chips volveríamos a los
diecisiete campos de golpe que esto vino a cortar.

Y la presión de cuff ya no está en esa tarjeta: se fue al paso 1 con el resto
del paquete de prevención. Medido en su momento: ahí **no llegaba a verse
nunca**.

🔴 **Las evaluaciones sí se pueden omitir** — *«no podemos obligar a los colegas
a que evalúen el MRC»*—, a diferencia de los filtros del paso 1, que sí son
obligables porque son medida de IAS y están a cargo de kinesiología. La salida
«no medí nada este turno» sigue a la vista, que es donde tiene que estar.

**174 guardias · 174 verdes.** Nueva: `chips_evaluaciones.js`.

---

### Cierre de la revisión campo por campo

Las seis tandas del PRD están programadas y en verde. En un día el proyecto pasó
de 167 a 174 guardias, con siete nuevas que son la memoria de lo que se arregló:
`prevencion_navm`, `relato_espejo`, `glasgow_medido`,
`via_aerea_en_respiratorio`, `sedacion_prono_ppc`, `ktm_sesiones` y
`chips_evaluaciones`. El esquema pasó de 401 a 407 columnas, todas aditivas y al
final.

Falta pegarlo en Apps Script: Diego lo hará cuando esté frente al computador, y
ahí hay que correr `crearORepararEstructura()` porque entraron seis columnas.

---

## 17-sep-2026 · Fuera el índice lateral, y dos textos huérfanos

Diego, mirando las capturas de la app ya armada: *«siento que la barra lateral
ya no aplicaría en la sección turno»*.

### El riel salió

Existía porque el panel era un muro de 225 campos en una sola pantalla y hacía
falta algo que dijera qué había más abajo. El muro ya no existe: el camino de
cuatro pasos lo partió y cada tarjeta lleva su encabezado a la vista. En el paso
de prevención listaba **una** entrada — un índice de un solo ítem — y en el
turno repetía los títulos que están tres centímetros a la derecha.

Los 196 px se los lleva el formulario, que es lo que se está llenando. En un
portátil de 1366 del hospital eso es una columna entera de respiro.

🔴 **Lo que NO se perdió**: en el celular el acordeón sigue diciendo qué hay
dentro de cada sección plegada, con su ✓ y su resumen. Ahí sí hace falta, porque
las secciones están cerradas. El riel nunca se mostró en el teléfono (solo sobre
740 px), así que la ronda no perdió nada.

🪤 **Y un cable que casi se corta sin ruido**: `rielRender()` arrancaba con
`const nav=$('spRiel'); if(!nav) return;`, pero la función hace mucho más que
pintar el índice — calcula **todos los obligatorios** y los reparte entre la
línea de aviso del escritorio y los encabezados del celular. Al borrar el
elemento, la función entera se habría cortado en esa línea, llevándose el aviso
de «Falta: firma y vía aérea» **y** el acordeón, sin un solo error en la
consola. Se quitó solo la cola que pintaba el riel.

### Dos textos que mandaban a lo que ya no está

Las capturas destaparon algo que ninguna prueba de valores podía cazar, porque
ningún dato estaba mal: **sobraba el texto**.

En el bloque de humidificación seguía vivo el aviso «Dispositivos **asumidos
instalados** al conectar a VM — corrobora: [Aceptar] *o ajusta las fechas de
arriba y guarda*». Arriba ya no hay fechas: se escondieron con la tanda de
prevención. Mandaba a buscar algo que no existe. Salió, con su botón y sus dos
funciones de cliente. 🔴 La acción `CONFIRMAR_DISPOSITIVOS` del servidor no se
tocó: sigue publicada en el dispatcher.

Vale la pena anotarlo como método: **mirar la pantalla armada encuentra cosas
que las guardias no**. Las guardias verifican que los datos estén bien; que un
texto siga teniendo sentido después de mover lo que lo rodeaba, no.

**175 guardias · 175 verdes.** Nueva: `sin_riel.js`.

---

## 17-sep-2026 · La humidificación activa se declara una sola vez

Diego, mirando las capturas: *«saca la humidificación activa del turno, ya que
eso ya está declarado al comienzo»*.

Tenía razón y era peor de lo que parecía: la humidificación activa se podía
declarar en **dos** sitios —el selector del paso 1 (Filtro HME ↔ Humidificación
activa) y una tarjeta propia en el turno, con su casilla y su fecha— y el que
llenara el segundo pisaba al primero sin que nada avisara. Es exactamente la
misma forma de la segunda puerta que este proyecto ya cerró tres veces.

La tarjeta salió entera del turno. El selector del paso 1 es ahora el único
mando, y **escribe los mismos campos que el resto del código ya consultaba**
(`cHAct` y `fFecHumid`): no hay una segunda verdad, hay un solo mando y los
mismos campos debajo, escondidos. ⏳ Sacarlos del todo queda pendiente para
cuando `syncHumidFecha()`, `calcInsumosDias()` y `autoFechasDispositivos()` lean
el estado de la cama.

### Lo que hubo que cuidar

🔴 **Sacar la tarjeta no podía hacer que el dato dejara de guardarse.** Siete
comprobaciones nuevas cubren el circuito completo: al elegir humidificación
activa se fecha y se marca la casilla; al volver al filtro HME se suelta; y una
cama que YA viene con humidificación activa **abre en esa posición** — si el
selector arrancara siempre en «Filtro HME», el paso pediría cambiar un filtro
que está retirado, y bloquearía el avance por él.

🪤 **La casilla y la fecha son el mismo hecho clínico** y tienen que quedar
coherentes en el sembrado, sin depender de que `fillForm` haya corrido antes: si
se marcara la casilla dejando la fecha vacía, el siguiente `syncHumidFecha()` la
fecharía HOY y una humidificación que lleva tres días pasaría a figurar como
empezada en este turno.

🪤 **Y una que casi «arreglo» estando bien.** La prueba del turno noche devolvía
la fecha de la cama en vez del día siguiente. No era un fallo: era el código
haciendo lo correcto —una humidificación ya activa conserva su fecha de inicio—
con la cama equivocada, que mi escenario anterior había dejado puesta. Quedaron
las dos conductas fijadas por separado.

### Tres guardias medían la tarjeta que ya no está

`via_aerea_previo`, `interfaz_un_lector` y `prevencion_navm` comprobaban que «la
tarjeta de dispositivos reaparece al quedar en VM». Lo que protegen no cambió
—que al quedar en VM el circuito vuelva a pedirse— y se mide donde ahora ocurre:
en las filas del paso 1.

🪤 En `via_aerea_previo` eso obligó a medir con el estado **final**, no con los
campos de arriba: en ese escenario el paciente se intuba POR EVENTO, así que la
vía aérea de arriba sigue siendo el estado previo con el que llegó — que es
precisamente la regla de los tres ejes que esa guardia protege.

**175 guardias · 175 verdes.**

---

## 17-sep-2026 · «General» se queda con lo del paciente

Diego: *«hazlo»* — la mudanza que quedaba del PRD.

El tubo y la cánula se habían mudado en una tanda anterior. Esta termina el
trabajo: se va también el **selector de vía aérea**, la **máquina de eventos**
(«¿qué pasó hoy con la vía aérea?», que es la puerta a intubación, extubación,
reintubación, TQT y decanulación) y los **cuatro contadores de días**.

Eran más de la mitad de los 36 campos que la tarjeta de datos «generales» había
llegado a tener, y vivían tres secciones antes de donde se usan. Ahora
Respiratorio abre con lo primero que se mira —qué pasó hoy con la vía aérea, con
qué respira y cuántos días lleva—, después el tubo, después cómo se ventila.

En General queda lo que de verdad es del paciente y no del turno: día de
estadía, ficha previa a la UCI, adecuación del esfuerzo terapéutico, fase
clínica, reingreso y aislamiento.

🔴 **Mover el marcado no podía tocar la máquina de eventos.** Los ids son los
mismos y las funciones no cambiaron; la guardia declara los cinco eventos uno
por uno y comprueba que cada uno abre su bloque.

### 🔴 Y la captura destapó otro dato falso escrito solo

Con **SAS 4** —vigil, tranquilo, cooperador— y el Glasgow todavía sin medir, el
formulario escribía por su cuenta «S5Q <3» y «**No cooperador**». Misma raíz que
el Glasgow de fábrica: la suma de tres campos vacíos da 1 —la verbal automática
del intubado más dos ceros— y el automatismo leía ese 1 como un paciente en
coma. De paso apagaba las escalas que dependen de la cooperación: MRC, FSS y
dinamometría.

Es peor que un dato faltante: es un dato **falso** que escribe el programa en la
ficha de alguien que está cooperando. Lo que evalúa una persona es la ocular y
la motora; sin ninguna de las dos, el Glasgow no opina.

Van tres bugs de la misma familia en un día —el Glasgow 15 de fábrica, la verbal
que saltaba a 5 al desintubar, y este— y los tres salieron de la misma raíz: un
campo vacío tratado como un cero con significado clínico.

🪤 **Y otra vez lo encontró una captura, no una guardia.** Ninguna prueba de
valores lo cazaba porque el valor «No cooperador» es perfectamente válido; lo
que estaba mal era que nadie lo había escrito.

**176 guardias · 176 verdes.** Nueva: `general_solo_lo_suyo.js`.

---

## 17-sep-2026 · La profundidad de la sedación la dice el SAS

Diego, mirando la captura del panel de Sedación y conciencia: *«ese cuadrito
"sedación vigil / control de agitación" — sacar eso, esa premisa, sacarla de
lleno, y solamente registrar qué sedantes están en uso»*. Su razón, textual:
*«si un paciente está en escalón 6 con Precedex y tiene un SAS 4, yo sé que está
sedado porque tiene Precedex y que está vigil porque está en SAS 4»*. Era un
campo que había que rellenar para decir algo que los otros tres ya decían.

**La casilla salió.** Lo que colgaba de ella —la fecha de suspensión de la
sedación profunda en la entrega de turno, que es el antes y el después para
interpretar el Glasgow— lo decide ahora el SAS: **1 o 2 es profunda, 3 o más
no**. Es el mismo corte que ya gobernaba los gates de cooperación, S5Q y
CAM-ICU, así que el sistema pasa a tener **una sola definición** de «profundo»
en vez de dos que podían contradecirse.

🪤 **Y NO la define el fármaco.** Se propuso decidirlo por una lista de
hipnóticos y Diego lo corrigió: *«hemos tenido pacientes que se daban fentanilo
y propofol en dosis altas pero con un SAS 3, 4, por lo tanto han estado sedados
vigil; yo creo que depende más de eso que del tipo de fármaco»*. La regla quedó
donde él la puso.

La columna `SED_VIGIL` **se conserva** y se deja de escribir: las filas ya
escritas siguen leyéndose igual.

### Lorazepam entra a la lista

*«Utilizamos en ocasiones benzodiazepinas continuas como lorazepam, en pacientes
que tienen algún abuso de sustancias»*. Midazolam ya es una benzodiazepina, pero
nombrar el fármaco sirve más que nombrar la familia. De paso, `Fentanyl` pasó a
escribirse **Fentanilo**.

### El SAS se escribe en palabras

Diego pedía un campo aparte para el estado de vigilia —*«sopor superficial,
sopor profundo, somnoliento, vigil y cooperador»*—. Al ponerlo al lado del SAS
apareció que era casi una traducción uno a uno, y él mismo lo vio: *«esta vigilia
casi te discuto, se pisa casi entero con un SAS»*. En vez de preguntar dos veces
lo mismo, **el sistema traduce**: la evolución escribe «SAS 4 (vigil, tranquilo
y cooperador)». El número, que es lo que se mide, se conserva.

El diccionario está **una sola vez** en `dominio_calculos.gs` y lo comparten los
dos motores de texto, el del navegador y el del servidor.

### 🪤 Y la traducción destapó un bug en las plantillas

Las plantillas se pueden crear seleccionando frases del texto: el sistema
reconoce los valores del paciente y los cambia por comodines. Con la frase nueva
aparecieron dos problemas que no se ven a ojo:

1. La meta pasó a escribirse «meta **SAS** 1» y el reconocedor buscaba «meta 1».
   Dejaba de encontrarla, y la plantilla nacía con el **1 de ese paciente
   congelado adentro** — un número que después se repetiría en todos los demás.
2. Las palabras quedaban escritas a mano. Una plantilla creada desde un paciente
   en SAS 1 habría repetido «(sin respuesta a estímulos)» en un paciente
   agitado: el número cambiando y las palabras mintiendo.

Se arregló el contexto de la meta y las palabras pasaron a ser un dato propio,
`{sas_palabras}`.

### 🪤 La guardia se puso roja por su propia documentación

Por tercera vez. `sas_real.js` comprobaba que el texto «vigil (control de
agitación)» ya no estuviera en el fuente, y lo encontraba **en el comentario que
explicaba que se había sacado**. Ahora quita los comentarios antes de buscar:
mide el código, no su documentación.

### 🔴 Lo que queda esperando una palabra de Diego

Un paciente en **escalón 2, con los fármacos puestos y SAS 3**: ¿la sedación
profunda se considera suspendida **ese** día, o el día siguiente, cuando se
retiran los fármacos? Él dijo las dos cosas —*«el SAS es lo que define si
finalmente es sedación profunda»* y, sobre esta fecha, *«cuándo se suspendió:
cuando realmente no tenga puestos los fármacos»*—, y con el escalón puesto y SAS
3 las dos lecturas caen en días distintos.

Quedó mandando la primera, que es la que él aprobó como principio y la que
gobierna el resto del sistema. Está escrito en la guardia con el ejemplo y con
la línea exacta que habría que tocar si prefiere la otra.

**177 guardias · 177 verdes.** Nueva: `sedacion_la_dice_el_sas.js`.

---

## 17-sep-2026 · El estado de vigilia, donde el SAS no llega

Diego: *«luego vamos con el B»*.

Su pedido original era un campo de estado de vigilia —*«sopor superficial, sopor
profundo, somnoliento, vigil y cooperador»*— al lado del nivel de conciencia. Al
ponerlo junto al SAS él mismo lo desarmó: *«esta vigilia casi te discuto, se
pisa casi entero con un SAS»*. Y lo acotó: *«que solo aparezca en pacientes sin
sedación el campo propio, acotado; selección única, no múltiple; donde ya no se
usa el SAS»*.

**Y ahí sí había un hueco.** Cuando el escalón es «Sin sedación» el formulario
esconde el SAS —es una escala de sedación-agitación— y el paciente se quedaba
**sin ningún registro de cuán despierto estaba**. El Glasgow no lo reemplaza: en
un traqueostomizado somnoliento que obedece órdenes, el Glasgow sale alto y
nadie anotó que estaba somnoliento.

El campo aparece **solo** sin sedación, en el mismo lugar donde vive el SAS.
Selección única, con las cinco palabras suyas. Al sedar desaparece **y se
borra**: si no, un «vigil y cooperador» anotado antes se guardaría junto al
escalón 6, dos respuestas distintas a la misma pregunta en la misma evolución.

El relato lo escribe igual en los dos motores: «Sin sedoanalgesia, somnoliento.»

🪤 **Y se arrastró el mismo cuidado de las plantillas.** «somnoliento» entra como
comodín `{vigilia}`; si no, una plantilla creada desde esa frase se lo quedaría
escrito a mano y lo repetiría en un paciente despierto.

Columna nueva `SED_VIGILIA`, **al final** (408). Hay que correr
`crearORepararEstructura()`.

**178 guardias · 178 verdes.** Nueva: `vigilia_sin_sedacion.js`.

---

## 18-sep-2026 · El día de suspensión es el del retiro, no el del despertar

Diego, zanjando la pregunta que quedó abierta anoche: *«el día de suspensión de
sedación es el día de retiro de fármacos cuando efectivamente le suspenden.
Sería el día que el colega no marque medicamentos clasificados con efecto
sedante y en el turno anterior sí estaban marcados»*.

Yo había confundido dos preguntas en una sola regla. **Son dos:**

| | Quién la contesta |
|---|---|
| ¿Está profundamente sedado HOY? | el **SAS** (1-2 sí, 3 o más no) |
| ¿Qué día se le **suspendió**? | el día en que se **retiran los fármacos** |

El error se veía en un caso concreto: paciente en **escalón 2 con la sedación
todavía corriendo** que despierta a **SAS 3**. La regla vieja le anotaba la
suspensión **ese** día, a un paciente que seguía con los fármacos puestos. Ahora
la anota al día siguiente, cuando efectivamente se los sacan.

Y si nunca se los sacan —pasa de sedación profunda a sedación vigil sin escalón
de por medio— **no hay fecha que anotar**: le cambiaron la sedación, no se la
suspendieron. Antes ahí se inventaba una.

🪤 **La fecha sí se borra si vuelve a sedación profunda**, y eso lo sigue
diciendo el SAS. Por eso el precedex para la agitación —SAS 6— no la toca: ése
era el caso de agosto del que salió todo esto, y sigue resuelto.

🪤 **Hacen falta las dos señales para leer un retiro**, el escalón *y* la lista de
sedantes. Con la lista sola, un colega que deja el escalón puesto sin marcar
ningún chip le inventaría al paciente una fecha de suspensión que nadie decidió.
La función nueva es `sedantesPuestos()` y vive en el dominio puro, al lado de
`sedacionProfunda()`, con la diferencia entre las dos escrita encima.

### El BNM vive y muere con la sedación

*«Sin sedación desaparece igual BNM, porque solo puede ser bloqueado con
sedación»*. La casilla se esconde **y se desmarca**: un bloqueo neuromuscular
sin sedación es un paciente paralizado y despierto, y eso no puede quedar
marcado por descuido.

### «Sin sedación», no «Sin sedoanalgesia»

El selector del formulario se llama «Sin sedación» y la evolución escribía otra
cosa. Quien la leía tenía que traducir. Ahora sale: «Sin sedación, somnoliento.»

**178 guardias · 178 verdes.**

---

## 18-sep-2026 · La interpretación se lee, no se elige

Diego: *«en S5Q, la interpretación del nivel de cooperación no debería
seleccionarse, ya que es eso: interpretación»*.

Tenía razón, y el campo era un híbrido peligroso. El formulario **ya** lo
completaba solo desde el S5Q —<3 no cooperador, ≥3 cooperador— y además lo
dejaba abierto para escribirle encima. Dos fuentes de verdad, y ganaba la última
que se tocara: bastaba corregir el S5Q después para dejar escrito «S5Q ≥3, no
cooperador» en la misma evolución.

Ahora se muestra en **la misma caja que el GCS** —el otro valor que calcula el
sistema— para que se lea como lo que es. El dato sigue viajando a la planilla en
`SED_COOPERACION`, desde un campo oculto que escribe una sola línea.

### 🔴 «No evaluable» se mudó al S5Q

Era una opción de la interpretación, y no se podía perder: es una respuesta
clínica real —el paciente está despierto pero el S5Q no se le puede aplicar:
afasia, sordera, barrera idiomática— y de ella cuelgan el bloqueo de MRC, FSS y
dinamometría y la categorización SOCHIMI. Su lugar es el **S5Q**, que es la
evaluación que no se pudo hacer, no su lectura.

En el relato va sin «/5»: «S5Q no evaluable», porque no es un puntaje bajo.

### 🪤 Y salió un cuarto bug de la familia del Glasgow de fábrica

Al derivar la interpretación se destapó que **tocar el BNM o el SAS y
devolverlos dejaba «S5Q <3» escrito** —y con él «No cooperador»— en un paciente
al que nadie evaluó. El automatismo lo ponía y no lo soltaba. Lo cazó
`panel_no_pisa_datos.js`.

Y arreglarlo destapó el de más abajo: el Glasgow **adivinaba** cuál era suyo
comparando el valor. Cualquier 1/1T/1 le parecía propio, incluido el que escribe
alguien evaluando a un paciente que de verdad no responde: le borraba la
medición justo en el caso que su comentario decía querer respetar. Ahora los dos
automatismos **marcan** lo que ponen y sueltan solo eso; lo que tocó una persona
no se toca.

### 🪤 Dos guardias que medían mal

`modal_foco.js` exigía que la pila de modales quedara **vacía** al cerrar. Sin
servidor detrás, el arranque termina mostrando el overlay de login —un modal
legítimo—, así que el resultado dependía de si el arranque había llegado a
pintarlo antes de los 1200 ms de espera: verde con la batería en paralelo (más
lenta) y roja corrida sola. Ahora mide que el modal cerrado **salga** de la
pila, que es lo que dice proteger.

Y `coopera_no_se_elige.js` nació leyendo el reloj: `SHIFT` sale de la hora real,
y de noche `aplicarGatesEval()` se va por la primera línea sin tocar MRC ni FSS.
Se vio a las 23:30. El turno se congela.

🪤 **Y una que escribí y borré.** Añadí a `glasgow_medido.js` un escenario para
el Glasgow medido a mano, y **nunca se vio rojo**: pasaba igual contra el código
sin arreglar. Una guardia que no distingue las dos versiones no prueba lo que
dice, así que salió. Lo que protege ya lo mide `sedacion_prono_ppc.js`, que sí
se vio roja.

**179 guardias · 179 verdes.** Nueva: `coopera_no_se_elige.js`.

---

## 19-sep-2026 · La pantalla de arranque decía una cosa y pasaba otra

Diego publicó NEXT en su planilla nueva, abrió la app y quedó en **«No se pudo
verificar la conexión con el servidor»**. Buscamos una hora en el lugar
equivocado: el permiso del despliegue, la versión publicada, la dirección del
`/exec`, el archivo `webapp`. Todo estaba sano.

Lo que pasaba de verdad: **el servidor respondía perfecto**, y lo que respondía
era «Sesión no válida. Inicia sesión con Google» — porque `CONFIG.AUTH_DEV_MODE`
estaba en `FALSE` y el login de Google no está montado. Un rechazo del servidor,
que es una respuesta buena, se mostraba como un problema de red.

Es **la misma familia del Glasgow de fábrica**: la pantalla afirma algo que
nadie comprobó. Y en el arranque es peor, porque no hay nada más que mirar:
quien abre la app solo tiene esa frase para saber qué hacer.

Ahora los dos casos se ven distintos, porque lo que hay que hacer es distinto:

| Lo que pasa | Lo que dice |
|---|---|
| El servidor no contesta | «No se pudo alcanzar el servidor» + revisa la conexión y que esté publicada para «Cualquier usuario» |
| El servidor contesta y no deja entrar | «El servidor respondió, pero no dejó entrar» + **el motivo textual** |

El motivo va **textual** a propósito: adivinarlo fue exactamente el problema.

### 🪤 Y la herramienta de diagnóstico tenía su propia pista falsa

`diagnostico.gs` mostraba la dirección de `ScriptApp.getService().getUrl()` y
pedía compararla con la que uno tiene abierta. Corrido desde el editor, eso
devuelve la de **`/dev`** —la de pruebas, con un identificador **propio**,
distinto al de cualquier implementación publicada—. Verlas distintas hacía
pensar «estoy entrando a otra implementación» cuando no era cierto. Le pasó a
Diego en medio de la búsqueda.

Y se le agregó lo que le faltaba para este caso: revisaba `doGet` —la puerta del
navegador— y no `doPost`, que es por donde entra la app instalada. El punto 5b
llama a `doPost` a mano con la misma petición del arranque; es el que dijo, en
una línea, que el servidor estaba sano por los dos caminos.

**180 guardias · 180 verdes.** Nueva: `el_arranque_dice_por_que.js`.
