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

---

## 19-sep-2026 · 🔴 La nómina del equipo estaba publicada

Buscando por qué a Diego no le aparecía el selector de firma apareció esto: los
**quince nombres completos** de los kinesiólogos estaban escritos a mano en dos
lugares del código — la semilla de `esquema.gs` y una lista `ROSTER` dentro de
`index.html`.

La del index es la grave. `index.html` se empaqueta **tal cual** en `pwa/`, que
es lo que se publica como sitio, y GitHub Pages con cuenta gratis **exige
repositorio público**. La nómina quedó a la vista de cualquiera que abriera la
dirección o el repositorio, desde el momento en que se publicó.

`CLAUDE.md` lo dice desde el 2-sep, a propósito de los cumpleaños: «tampoco
datos personales de los funcionarios: se escriben en la planilla, no en el
código». **La regla existía.** La lista venía heredada del sistema anterior y
nadie la miró al publicar — yo tampoco, y publicar fue idea mía.

**Ahora el equipo vive en la hoja `KINESIOLOGOS`**, que es privada porque la
planilla lo es. El arranque lo trae (`GET_BOOT → equipo`, `equipoRoster()` en
`svc_turnos.gs`) y el selector se llena con eso. La semilla del esquema ya no
escribe a nadie: la hoja nace vacía y el registro avisa que hay que cargarla.

🪤 **Y si la hoja está vacía, el selector lo DICE** — «⚠️ Falta cargar el equipo
en la hoja KINESIOLOGOS» — en vez de quedarse mudo. Es la misma lección del
mensaje de arranque de esta mañana: un control vacío y callado manda a buscar al
lugar equivocado.

### No eran solo las listas

El barrido encontró **30 apariciones más** de nombres completos: como firmas de
prueba en las guardias, en comentarios de atribución, y una como **nombre de
paciente** en un smoke test de `api.gs`. Todas reemplazadas por nombres
inventados. Los nombres de pila sueltos («pedido de Diego») se quedan: es como
se habla en este proyecto y no identifican por sí solos.

🪤 **La primera versión de la guardia buscaba «nombres por su forma»** y acusó a
«Helvetica Neue», «Modo Coordinación» y «Kinesiterapia Respiratoria». Una
guardia que grita por cualquier cosa se termina apagando. Ahora busca la
**estructura** del dato —unas iniciales pegadas a un nombre, que es como se
escribe una nómina— y no tiene falsos positivos.

### 🪤🪤 Y la guardia de privacidad fue, por un rato, la fuga

Para cazar los nombres sueltos le escribí **la lista de los quince apellidos**.
O sea: el archivo que existe para que no haya nombres en el repositorio los
tenía todos, y **se acusó a sí mismo** al correr. El comentario de más arriba en
ese mismo archivo ya lo advertía —«esta guardia NO puede traer la lista de
nombres para buscarlos»— y lo hice igual, tres pantallas abajo.

El tercer intento —buscar el contexto, «NOMBRE: …» o «Klgo. …»— cazaba también
los nombres **inventados** que las pruebas necesitan, y distinguir uno real de
uno inventado pide una lista de excepciones que crece con cada prueba. Así es
como una guardia se pudre.

**Así que ese barrido no se automatiza, y queda escrito por qué.** Lo que de
verdad protege es lo estructural: si no hay dónde escribir una nómina —porque el
equipo llega de la planilla— no hay nómina que se escape.

**181 guardias · 181 verdes.** Nueva: `el_equipo_no_va_en_el_codigo.js`.

---

## 19-sep-2026 · «En registrar una evaluación no sale nada» eran dos errores

Diego registró un turno real de noche y avisó que el paso de evaluaciones salía
en blanco. Fui a reproducirlo con el reloj congelado y **no era uno, eran dos
encima**:

1. **La tarjeta hueca.** `hEgr()` escondía de noche el contenido
   (`#fcEgrCard`) pero no la tarjeta, y quedaba «📏 Registrar una medición»
   flotando sobre 26 píxeles de nada. Un encabezado que promete algo que no
   está y no dice por qué.
2. **El pool en cero durante el ingreso.** `pasoEvalPintar()` cortaba con
   `if(!c.PATIENT_ID)`, y el PATIENT_ID se asigna al **ocupar la cama**, o sea
   al guardar: mientras se ingresa, la cama todavía no lo tiene. Justo el
   momento en que el pool más sirve —paciente nuevo, las diez escalas por
   medir— era el único en que no aparecía.

🪤 **Lo que casi hago mal.** Diego pidió «que muestre al menos el pool de
evaluaciones» y lo primero que hice fue empezar a diseñarlo. No hacía falta:
**el pool ya existía y lo había pedido él mismo el 17-sep**. Ir a mirar el
código antes de construir ahorró un mockup entero de algo que ya estaba.

**La guardia se escribió primero y se vio roja** con seis fallos, y no cuida
solo esta tarjeta: recorre **todas** las `.fcard` y exige que ninguna quede con
encabezado a la vista y cuerpo vacío, en cuatro escenarios —día y noche,
ingreso y paciente ya ingresado—. Es una familia de fallas, no un caso: el
cuerpo de varias tarjetas depende del turno, de la cooperación o del BNM.

🪤 **Y se coló una tercera, que no arreglé a propósito.** De noche el pool se
sigue viendo (vive fuera de la tarjeta), pero los chips que abren un formulario
—ecografía, tos y deglución, Pimáx— no tienen dónde abrirlo y **tocarlos no
hace nada**. El arreglo depende de una decisión de Diego que está en el mockup
(A, B o C para la KTM de noche), así que queda escrito y esperando.

**182 guardias · 182 verdes.** Nueva: `medicion_no_queda_hueca.js`.
Sello de entrega: `NEXT-2.4-medicion`.

### Los acuerdos, al día

- **Sección 2 · Respiratorio: CERRADA.** Ocho acuerdos, con la regla de conteo
  por horas que Diego zanjó («38 horas es 1 día»).
- **Sección 3 · Evaluaciones y KTM: abierta**, con los dos errores ya
  arreglados y tres preguntas para él.

---

## 19-sep-2026 · «KTM A» — de noche se ve y no se llena

Diego eligió la opción **A** de las tres que le ofrecí. La tarjeta de
Rehabilitación **ya no desaparece de noche**: se ve atenuada, con todos sus
controles apagados, y un aviso dice por qué. El aviso hace además el trabajo que
la tarjeta escondida impedía: aclara que **la KTR respiratoria sí se registra de
noche y vive arriba, en Respiratorio**. Eran dos cosas que se llaman casi igual y
estaban en pantallas distintas.

Los **diez chips del pool** quedan de noche en **solo lectura** —se ven con su
valor, fecha y firma, no se tocan, y una línea lo explica—. Con eso se cierra el
tercer defecto que quedó anotado el mismo día: los chips que abren un formulario
lo abrían DENTRO de la tarjeta que se escondía, así que tocarlos no hacía nada.

Lo que **no** cambió: de noche la KTM sigue sin registrarse y el estado nace
neutro. La opción B —dejarla registrable— se descartó porque hoy «KTM de noche»
significa cero **por definición**: si a veces hay dato y a veces no, el
porcentaje de cumplimiento deja de querer decir algo.

🪤 **Se cambió una convención a propósito.** `regresion_ui.js` exigía que la
tarjeta quedara oculta de noche. Quedó actualizada —mide que la KTM no se marque
y que la tarjeta quede apagada— con la razón escrita al lado, que es como se
borra una guardia sin que se pudra.

### 🪤🪤 La trampa del reloj, por CUARTA vez

Al hacer que la pantalla dependa del turno, **tres guardias se pusieron rojas
solas**: `cuatro_pasos`, `ktm_sesiones` y `paso_evaluaciones`. Ninguna congelaba
`SHIFT`, así que salían verdes de día y rojas de noche — y la batería corrió a
las 22:18. Nadie las había tocado: cambió el código que probaban.

Lo fino: **`ktm_sesiones` ya congelaba la fecha** (`gDate` inventado) **y no el
turno**. No son lo mismo, y hasta hoy daba igual. Las tres quedaron con `SHIFT`
fijo y el motivo escrito adentro.

**183 guardias · 183 verdes.** Nueva: `ktm_de_noche.js`.
Sello de entrega: `NEXT-2.5-ktm-noche`.

### Los acuerdos, al día

- **1 · Ingreso: CERRADA.**
- **2 · Respiratorio: CERRADA.**
- **3 · Evaluaciones y KTM: CERRADA.**
- **4 · Prono: pendiente** — es la que sigue.

---

## 19-sep-2026 · El IMT y la EMS son el mismo paquete

Le dije que la tarjeta de IMT/EMS quedaba fuera del acuerdo porque era «una
tarjeta aparte», y me corrigió:

> *«IMT y EMS son parte de la terapia física, es decir es rehabilitación, parte
> del paquete. Movilización precoz (posicionamiento, movilidad pasiva activa),
> EMS e IMT. Podría ir de noche apagada.»*

Ahora se apaga de noche igual que la KTM, con su propio aviso — repetido a
propósito, porque es otra tarjeta y una apagada sin explicación deja igual de
perdido que una que desaparece. `_ktmModoNoche` pasó a llamarse
`_rehabModoNoche` y cubre las dos: el nombre viejo mentía.

🪤 **Lo que vale más que el arreglo** es la definición que dejó dicha y que no
estaba escrita en ninguna parte: la terapia física son **movilización precoz
(posicionamiento, movilidad pasiva y activa), EMS e IMT**. Hoy el
posicionamiento y la movilidad pasiva/activa no se registran como tales, sino
a través del nivel de KTM. Si para el equipo es *un* paquete, puede que también
tenga que ser *una* tarjeta — anotado, sin tocar.

**183 guardias · 183 verdes.** Sello de entrega: `NEXT-2.6-terapia-fisica`.

---

## 19-sep-2026 · El prono: un evento que arrastra el estado

Le había propuesto «un estado y un botón» y Diego lo formuló mejor:

> *«El prono como evento puede arrastrar estado hasta que se suspenda con
> supinar? Eso en vez de tener varios botones porque prono y se prono este
> turno puede confundir.»*

**Seis controles pasaron a uno.** Cuatro situaciones, un botón en cada una:
sin prono → *Pronar*; pronado en este turno → *Deshacer*; viene pronado de
antes → *Supinar*; supinado en este turno → *Deshacer*.

🔴 **El estado se arrastra del CICLO, no del turno anterior.** Antes venía de
replicar la fila previa: si un turno se saltaba, el paciente «dejaba» de estar
en prono sin que nadie lo supinara.

🪤 **La cicatriz de estado-vs-evento no se reabrió: se resolvió mejor.** La
casilla «se prona este turno» existía porque el sistema contaba una pronación en
cada turno que el paciente siguiera boca abajo. Ahora el evento se registra una
sola vez y el estado se deriva. Las dos columnas se siguen escribiendo
separadas.

🔴 **Ninguna columna cambió.** Las seis casillas viejas siguen en la pantalla,
escondidas y vivas, porque son las que arman el payload y las que leen
`fillForm` y `fillFormReplica`. Sacarlas habría obligado a tocar el servidor, la
entrega, la timeline, el texto clínico y veinticuatro guardias para un cambio
que es solo de pantalla. Mismo patrón que `fCoop` con la interpretación del S5Q.

### 🪤 Dos trampas en la misma tanda

**El falso verde, otra vez.** La primera versión de la guardia decía «ninguna de
las cuatro casillas se ve» y salía VERDE contra el código sin arreglar — porque
la franja vive en el **paso 2** y yo medía parado en el paso 1, donde todo está
`paso-oculto`. Es la segunda vez hoy: la misma trampa apareció en
`ktm_de_noche.js`. **Una guardia que no se ve roja no prueba lo que dice.**

**Y una guardia que había que apuntar, no aflojar.** `prono_horas_a_la_vista`
existe porque Manuel avisó desde el turno que no se veían las horas de prono en
el celular: el número vivía en un tooltip y en táctil no hay hover. Al mover las
casillas al contenedor escondido, los chips que medía se fueron con ellas. No se
tocó lo que exige — se apuntó a los elementos nuevos, y de paso **el «desde
cuándo» dejó de ser tooltip** y ahora se lee escrito al lado. La cicatriz quedó
mejor protegida que antes.

**184 guardias · 184 verdes.** Nueva: `prono_un_boton.js`.
Sello de entrega: `NEXT-2.7-prono`.

### Los cuatro acuerdos, cerrados

1 · Ingreso · 2 · Respiratorio · 3 · Evaluaciones y KTM · 4 · Prono.

---

## 20-sep-2026 · El prono, arriba y en la tarjeta

Cuatro cosas de Diego en una línea: *«Sube la franja a la primera fila. Si
muestra. No hay corte. Podría ser que se marquen prono y la hora y aparezca
botón supino inmediatamente.»*

- **La franja subió** a la primera fila, junto a vía aérea y soporte, antes del
  tubo y de los parámetros del ventilador. Termina la mudanza que empezó el
  17-sep cuando salió de la traqueostomía.
- **El prono se ve en la tarjeta**, con las horas. Columna nueva `PRONO_DESDE`
  en CAMAS_ESTADO: espejo del ciclo, que sigue viviendo en EVOLUCIONES.
- 🔒 **No hay corte de horas.** El chip se ve igual con 5 h que con 40, y la
  guardia lo mide — para que nadie (yo en tres meses) invente un umbral que la
  unidad no tiene.
- **Tras pronar aparece «Supinar» al tiro**, y eso resolvió la limitación que
  quedaba: **pronar y supinar en el mismo turno**. 🔵 El servidor ya lo
  soportaba; la limitación era solo de la pantalla, donde el evento de
  pronación dependía del estado final y supinar lo borraba.

### 🪤 La columna nueva nació con un bug, y una guardia vieja lo cazó sola

`alta_no_deja_rastro.js` se puso roja apenas agregué `PRONO_DESDE`: al liberar
la cama, la columna se quedaba con el ciclo del paciente **anterior** y el
siguiente lo heredaba. La cama recién desocupada habría dicho «En prono 14 h»
sin nadie dentro. No la escribí para esto — la escribieron para una familia de
fallas, y esta columna cayó justo ahí. Es el mejor argumento a favor de las
guardias que miran una regla y no un caso.

**185 guardias · 185 verdes.** Nueva: `prono_arriba.js`.
Sello de entrega: `NEXT-2.8-prono-arriba`.
🔴 **La próxima tanda necesita `crearORepararEstructura()`** — hay columna nueva.

---

## 20-sep-2026 · «Y se selecciona con horario»

Cuatro palabras de Diego que cerraron un agujero silencioso. Al tocar «Pronar»,
el campo de la hora se rellenaba con **la hora del reloj**. En la ronda eso es
falso la mitad de las veces: se registra a las 10:00 lo que pasó a las 08:00 y,
como el campo ya venía lleno, nadie lo corrige.

Es **la misma trampa que la fijación del TOT** —«si sugiere 22 no anotan nada»—
pero peor: de esa hora salen las **horas en prono**, que son las que deciden
cuándo supinar al paciente. La sugerencia no era un número cómodo: era el dato.

Ahora la hora nace vacía, el cursor cae en el selector y mientras falte se lee
**«⚠️ falta la hora»**.

### 🪤 El arreglo traía su propia trampa

Dejar la hora vacía y nada más habría **cambiado un dato falso por otro**:
`_tsEventoTurno` tiene un respaldo que, sin hora, asume las **15:00** de día y
las **03:00** de noche. Sirve para filas viejas, pero acá habría sellado el
ciclo de prono contra una hora inventada — y una vez sellada no hay forma de
distinguirla de una real.

Por eso el servidor tampoco sella: **sin hora no hay momento**. El ciclo queda
sin cerrar, a la vista, en vez de mentir con las 15:00. La guardia mide **las
dos mitades**, pantalla y servidor, porque arreglar solo una habría dejado el
agujero abierto por el otro lado.

**186 guardias · 186 verdes.** Nueva: `prono_hora_se_elige.js`.
Sello de entrega: `NEXT-2.9-hora-se-elige`.

---

## 20-sep-2026 · El turno no se podía cerrar

Iba a hacer el mockup del paso 4 y, como ahora hago siempre, fui a mirar el
código primero. Apareció un bloqueante duro.

**La firma es obligatoria para guardar, el guardado ocurre al salir del paso 3,
y el selector de firma vivía en el paso 4.** Al tocar guardar salía «⚠️ Debes
seleccionar la firma», el código le hacía `focus()` y le pintaba un borde rojo a
un campo invisible. El sistema exigía firmar y no había dónde firmar.

Es exactamente lo que Diego reportó del turno real —«no aparece firma, así que
no puedo avanzar al relato»—. Yo lo había cerrado como «el roster estaba vacío».
Era cierto y estaba arreglado, **pero era solo la mitad**: con el equipo cargado
el turno tampoco se podía cerrar.

🪤 **Y arrastraba otros tres campos.** En la misma tarjeta viven el Plan
Kinésico, la Nota del Turno y los pendientes del turno, y los tres viajan en el
guardado. Al mostrarse después, en un turno nuevo **se guardaban siempre
vacíos**. Tres campos que el equipo cree que existen y que nunca se pudieron
llenar.

### La regla, no el caso

La guardia no mira la firma: **saca del código la lista de campos del payload**
—no una lista a mano, que envejece— y exige que ninguno viva en un paso
posterior al que guarda. Si un dato viaja en el guardado, tiene que poder
escribirse antes.

🪤 `cuatro_pasos.js` exigía lo contrario y se puso roja. Se actualizó con la
razón escrita, y al hacerlo apareció que **ya defendía esta regla sin notarlo**:
su punto 4 dice que el guardado ocurre al salir de las evaluaciones.

🪤 Y un tropiezo mío que conviene no repetir: la primera versión de la guardia
llamaba a `setRoster(...)` suelto. No es global —vive en el módulo `Turnos`— así
que no hacía nada y el selector se quedaba con el placeholder, que es **justo el
síntoma que la guardia investigaba**. Confundirlos habría sido cómodo y falso.

**187 guardias · 187 verdes.** Nueva: `nada_del_guardado_despues.js`.
Sello de entrega: `NEXT-3.0-firma-alcanzable`.

---

## 20-sep-2026 · El cierre del turno: tres bloques, cada uno con su reloj

Diego sobre las cajas del cierre: *«en realidad ahí debería agruparse en uno
solo. Una cosa dirigida a narrar qué pasó hoy y otra a dejar pendientes. El plan
kinésico… debería ser algo aparte.»* Y al aprobar: *«con el detalle de que el
pendiente sea libre porque a veces la opción no está y se termina anotando en
notas o anotaciones»*.

**No eran tres cajas: eran cinco**, y hacían dos cosas distintas sin decirlo.
Tres se narran en la evolución (anotaciones, Nota y Plan) y dos no (los chips
del turno y los pendientes del episodio). Quedó en **Qué pasó hoy · Plan para el
próximo turno · Lo que queda pendiente**, cada uno con su reloj escrito en el
rótulo.

🔵 **El plan aparte, pero pegado al relato.** Un pendiente se cierra; un plan no.
Si viviera con los pendientes quedaría abierto para siempre y ensuciaría la
cuenta de cumplidos. Además ya es la última línea del texto (Manuel, ago-2026).

🔴 **El campo libre de pendientes es lo que evita la fuga.** Sin él, el encargo
termina en la Nota — que muere en 12 horas y que nadie puede cerrar. Diego lo
describió exacto, y por eso la guardia mide que esté A LA VISTA junto a los
atajos, no en otra pantalla.

🪤 **Convivían el problema y su arreglo.** Los chips morían a las 12 h («por eso
nadie podía cerrarlos», dice el código) y los pendientes del episodio nacieron
para eso. Ahora los atajos abren pendiente de episodio igual que el texto libre,
y `PLAN_PENDIENTES` sigue viajando con lo puesto en el turno para que la ficha
de la entrega no pierda nada.

### 🪤 Un bug mío que cazó la batería

Al renombrar `PEND_SEL` quedaron **cuatro referencias huérfanas** —el borrador
local, el autoguardado y un listener— y el borrador dejó de escribirse.
`borrador_local.js` y `cierre_tres_acciones.js` se pusieron rojas en el acto.
Lección barata: **renombrar una global exige barrer todas sus referencias antes
de correr nada**, con un grep, no con la memoria.

Tres guardias más pedían la convención vieja y se actualizaron con la razón
escrita: `movil_panel` (que ahora busca la tarjeta **por id y no por título**,
porque el rótulo es de Diego y puede volver a cambiar), `paso_relato` (dejar
pendiente bajó al paso 3) y `nada_del_guardado_despues` (la Nota ya no es caja).

**188 guardias · 188 verdes.** Nueva: `cierre_tres_bloques.js`.
Sello de entrega: `NEXT-3.1-cierre`.

---

## 20-sep-2026 · «Pabellón pendiente en 2 días»

Diego: *«Un pendiente se puede arrastrar más de 12 horas, hay veces que está
pabellón pendiente en 2 días.»* Que duraran ya estaba resuelto con la fusión de
esta misma mañana, pero el ejemplo destapó dos cosas.

🔴 **Se duplicaban, y lo introduje yo hoy.** Al hacer que los atajos abrieran
pendiente de episodio, el chip solo se marcaba con lo puesto en ESTE turno. Un
encargo de ayer aparecía limpio al día siguiente, alguien lo tocaba de nuevo y
quedaban dos pendientes idénticos abiertos. **Con un pendiente que dura dos
días, eso pasa el segundo día, siempre** — o sea que el caso que Diego nombró
era exactamente el que lo disparaba.

La defensa quedó en los dos lados: la pantalla no ofrece abrir lo que ya está
abierto, y el servidor lo rechaza igual. No es redundancia: **dos teléfonos
pueden tocar el mismo chip a la vez y ninguno sabe del otro.**

🔵 **Y ahora se ve cuánto lleva.** «Pabellón pendiente · 2 días». Uno de hoy y
uno de hace dos días eran la misma línea en pantalla y no son lo mismo: el de
dos días es el que hay que ir a empujar. Se usa la regla de días que ya se
acordó para vía aérea, VM y estadía —24 horas completas— y el de hoy dice
«hoy», no «0 días», que se lee como un dato roto.

🪤 Un pendiente **cerrado** sí se puede volver a abrir: pabellón el lunes y otra
vez el jueves son dos encargos distintos.

**189 guardias · 189 verdes.** Nueva: `pendiente_arrastra.js`.
Sello de entrega: `NEXT-3.2-pendiente-dura`.

---

## 20-sep-2026 · «¿Los pendientes se quedan en la cama?»

Diego, leyendo que los pendientes «viven en la cama»: *«¿si traslado el paciente
a otra cama, se quedan los pendientes en la cama y no siguen al paciente? ¿El
que ingrese a esa cama heredará esos pendientes?»*

La respuesta es que **viajan con el paciente**, y la comprobé antes de decirla.
Pero la pregunta era buena por lo que apunta: **heredar los encargos del
paciente anterior es peor que perderlos**, porque nadie duda de un pendiente que
aparece escrito. Alguien iría a pedir un pabellón que no corresponde.

🪤 **Y era cierto por una razón frágil.** Los dos traslados copian la fila
ENTERA de la cama con `Object.assign`, así que `PENDIENTES_JSON` viajaba «de
regalo». Nadie lo decidió: salió gratis. El día que alguien reescriba el
traslado campo por campo —que es lo natural al agregar una columna— los
pendientes se quedarían atrás sin que nada avise.

Quedó `pendientes_siguen_al_paciente.js`, que mide **el comportamiento y no la
implementación**, en los tres caminos: mover a cama vacía, intercambiar dos
ocupadas y el alta.

🪤 **La guardia nació verde**, y una guardia que nunca se vio roja no prueba lo
que dice. Así que se rompió el código a propósito —el traslado copiando campo
por campo, el alta sin barrer la columna— y se comprobó que cazaba las tres
roturas. Después se restauró.

🪤 Un detalle del arnés que conviene recordar: **no sirve doblar con un stub una
función que el propio archivo declara** (`_reetiquetarEpisodioACama`); el eval
la redefine y corre la real. Lo que hay que doblar es lo que ella usa por
debajo.

**190 guardias · 190 verdes.** Nueva: `pendientes_siguen_al_paciente.js`.

---

## 20-sep-2026 · Tanda para pegar: NEXT-3.2-pendiente-dura

Cinco archivos: **index · esquema · servicios · api · dominio**.

🪤 Yo había supuesto cuatro (index, esquema, y los svc_ sueltos). `que_pegar.js`
dijo **cinco**: faltaban `api` y `dominio`. Es exactamente el fallo para el que
se escribió esa herramienta — el repo tiene 31 `.gs` y el editor 10, así que
«cambié tal servicio» no dice a simple vista si además se movió algo de otro
grupo. **No se recuerda: se calcula.**

🔴 **Requiere `crearORepararEstructura()`**: entra la columna `PRONO_DESDE` en
CAMAS_ESTADO.

Verificado antes de enviar: `cmp` contra el generado (los cinco idénticos), el
cohete es **ASCII puro**, los acentos vivos en los `.gs`, el sello
`NEXT-3.2-pendiente-dura` presente y la columna nueva en esquema y servicios.
**190 guardias · 190 verdes.**

Qué lleva, desde lo último que pegó (`NEXT-2.3-vigilia`): el equipo desde la
planilla, la interpretación del S5Q derivada, los mensajes de arranque, el pool
de evaluaciones desde el ingreso, la KTM y la terapia física apagadas de noche,
el prono como evento con un solo botón y su hora elegida, el cierre del turno en
tres bloques, la firma alcanzable y los pendientes que duran, no se duplican y
viajan con el paciente.

---

## 20-sep-2026 · La hemodinamia se pide, y el UPOT se reparte

Dos decisiones de Diego tras revisar los cinco módulos.

🔴 **«HDN pedir antes de avanzar. Si no se anota.»** Los dos campos nacían
puestos y sin opción vacía, así que la evolución escribía «HDN estable s/DVA»
aunque nadie hubiera mirado. Era la afirmación **clínica** más fuerte que el
sistema hacía por su cuenta. Ahora nacen vacíos y se piden al guardar.

🪤 **Eran dos redes empujando la misma mentira**: los valores por defecto de la
pantalla y, además, los dos generadores de texto —servidor y cliente— con su «si
no viene, usa Estable». Arreglar una sola habría dejado el agujero abierto por
el otro lado. Es el mismo patrón de la hora del prono, y van dos veces en dos
días: **cuando un dato se inventa, conviene buscar dónde MÁS se inventa.**

🔵 **Y salió algo que sirve para todo el formulario:** el aviso **lleva al
campo**. El guardado ocurre al salir del paso 3 y la hemodinamia vive en el 2;
avisar y enfocar algo de otro paso deja al colega mirando un aviso sin nada que
tocar. `_irAlCampo()` salta al paso donde vive el campo; la vía aérea lo usa
también.

🧿 **El UPOT se repartió**: el seguimiento a Neurología, el test de apnea a
Evaluaciones. 🪤 Con una trampa que había que cubrir: las condiciones de UPOT no
implican diagnóstico neuro escrito, así que sin sumar ese disparador la casilla
se mudaba a una tarjeta que no aparece y el seguimiento habría desaparecido.

### 🪤 Veinticinco guardias rojas de una vez, y por qué no se aflojó ninguna

Hacer obligatoria la hemodinamia puso **25 guardias en rojo**: todas guardaban
sin llenarla, así que el payload ya no salía. La tentación era relajar la regla
o rellenar el campo al cargar la página en el banco. **Las dos cosas habrían
recreado el bug dentro de las pruebas** — un dato puesto por el programa, que es
justo lo que se vino a quitar, y las guardias habrían dejado de ver el caso
«nadie la miró».

Se llenó en cada guardia **donde ya llenaba la firma**, que es lo que hace un
colega. 19 salieron con el mismo patrón; las 6 restantes y las 2 con doble punto
de guardado se hicieron una por una.

🪤 **Y la trampa del paso, por tercera vez hoy.** La guardia nueva midió
«Neurología no aparece» estando en el paso 1, donde la tarjeta está
`paso-oculto`: decía la verdad por la razón equivocada. Ya había mordido en
`ktm_de_noche` y en `prono_un_boton`. **Cada cosa se mide donde vive.**

**191 guardias · 191 verdes.** Nueva: `hdn_y_upot.js`.
Sello de entrega: `NEXT-3.3-hdn-upot`.

---

## 20-sep-2026 · Lo que se mide no se sugiere · Tanda 3.4

Diego: «sí a los dos». Se borraron los dos campos muertos de auscultación y los
ciclos de RCP dejaron de sugerir 3. 🔵 De regalo, **la fijación del TOT** dejó de
sugerir 22: era su acuerdo 2.3, cerrado desde el 19-sep, y era una línea.

🪤 **La guardia NO se automatizó, a propósito.** Al buscar el «22» aparecieron
**veinte campos** con placeholder numérico, y no son el mismo problema: una
medición (fijación, ciclos de RCP) no se sugiere, pero un **formato** de ejemplo
—el RUT— enseña la forma sin afirmar un valor, y un **parámetro de equipo** —la
frecuencia del EMS, la carga del IMT— es configuración que se repite. Una regla
automática habría decidido por Diego sobre quince campos. La guardia lleva
**lista y razón al lado**, y crece cuando él decide.

🔴 **Hallazgo que quedó esperando: los gases arteriales.** Siete campos sugieren
**valores normales** (pH 7.38, PaO₂ 80, PaCO₂ 40…). Es peor que la fijación: el
ojo lee «gases normales» y sigue de largo — no es solo que no se anote, es que se
lee una gasometría tranquilizadora que nadie tomó. Sin tocar hasta que Diego
decida.

### La tanda

Paquete **NEXT-3.4-limpieza**: index, esquema, servicios, api, dominio.
Requiere `crearORepararEstructura()`. Reemplaza al 3.2, que quedó descartado.

🪤 **Dos falsos negativos MÍOS al verificar el paquete**, los dos por comprobar
mal, no por fallas del paquete:
· busqué `fMPCalidad` en el texto y lo encontré… **en el comentario que explica
  que se borró**. Es el mismo error que ya costó tres veces en este proyecto
  (una guardia cazándose a sí misma en su propia documentación), y lo repetí.
· busqué `placeholder="3"` y lo encontré en `fIMTfreq`, que lo conserva a
  propósito. La comprobación era demasiado grosera para lo que quería probar.
El resto de la verificación sí sirvió: decodifiqué el base64 del cohete y
confirmé, dentro de la app real, que los nueve cambios de estos dos días viajan.

**192 guardias · 192 verdes.** Nueva: `no_sugerir_lo_medido.js`.

---

## 20-sep-2026 · Los gases nacen en blanco · Tanda 3.5

Diego: *«los gases sí, mismo criterio, que nazcan en blanco»*. Los siete campos
de la gasometría sugerían **valores normales**, y ahí el daño es peor que en la
fijación del TOT: el ojo lee «gases normales» y sigue de largo — no es solo que
no se anote, es que se lee una gasometría tranquilizadora que nadie tomó.

🪤 **La FiO₂ del gas entró también**, aunque sea un parámetro: de ella sale el
PaFi, y un PaFi contra un 40 inventado es un número clínico falso que alimenta
el protocolo de destete. Y por el mismo criterio entró la **SpO₂ al decanular**.

🔵 **El motor ya estaba preparado.** `interpGSA` exige que los números existan
antes de interpretar, así que con los campos vacíos no calcula nada en vez de
inventar. Los placeholders eran **solo cosmética engañosa**: el daño estaba
entero en lo que el ojo leía.

⏳ Sin tocar, a la espera: los tiempos de sesión (KTM 30 min, válvula 30 min,
IMT 10 min). No son mediciones en el paciente, pero sí se informan.

### 🪤 Rompí un campo al editar, y la guardia lo cazó en el acto

Al insertar el comentario junto a los gases se me comió una comilla y
`id="fGsaPao2` quedó sin cerrar — el campo habría dejado de existir y la PaO₂ no
se habría guardado. La guardia que acababa de ampliar se puso roja en el mismo
segundo, en el assert más aburrido de todos: «el campo fGsaPao2 existe».

Vale anotarlo: los asserts de rutina —«esto sigue estando»— parecen ruido hasta
que atrapan una edición torpe. Es la segunda vez hoy que un error mío lo
encuentra la batería y no yo.

**192 guardias · 192 verdes.** Sello de entrega: `NEXT-3.5-gases`.
Verificado decodificando el base64 del cohete: los once campos de medición
llegan sin sugerencia dentro de la app real.

---

## 20-sep-2026 · El paso 0 del ingreso, que se había quedado en papel

Diego, después de pegar: *«revisé el módulo de turno y me di cuenta que está
igual que antes, me sigue mostrando toda la planilla, no inicia el modal de
identificación al inicio, que sería el paso 0. Recuerda que esto se rediseñó y
no debería ir así.»*

**Tenía razón y el reproche es justo.** El acuerdo 1 se cerró el 19-sep y yo
seguí construyendo otras cosas —evaluaciones, prono, cierre, los cinco
módulos— sin volver a él. Lo que hacía el código en modo ingreso era un
`show('fcId')`: la planilla entera con la identificación arriba. `data-paso="0"`
no existía en ninguna parte.

Hecho ahora: **el ingreso abre en su propio paso**, no se ve nada del turno, y
de ahí va **derecho al paso 2** —se salta la prevención, porque un paciente que
acaba de llegar todavía no tiene circuito que revisar—. En una evolución normal
el paso 0 no existe: a un paciente ya ingresado no se le vuelve a ingresar.

Con él entraron tres acuerdos más del ingreso: **RUT obligatorio** (1.1),
**Procedencia** con sus siete opciones en vez de «electivo o urgencia» (1.2) y
el **nombre social** (1.7), conectado de punta a punta —columna, guardado,
carga y barrido al alta—, porque un campo que no se guarda es justo lo que
acabábamos de limpiar.

🪤 **Una columna nueva toca más sitios de los que parece.** `PAC_NOMBRE_SOCIAL`
puso en rojo **ocho guardias**: el contador de columnas escrito a mano en
`esquema.gs`, su comentario en cadena, y cinco guardias que llevan ese total
copiado. Todas se actualizaron con la razón; ninguna se aflojó. Y
`vigilia_sin_sedacion` exigía que SED_VIGILIA fuera **la última** de EVOLUCIONES:
eso dejó de ser cierto, pero lo que protege —que las columnas nuevas se agreguen
al final y no se inserten en medio— sigue entero y ahora se mide así.

🪤 **Y en esa misma corrección elegí mal la columna de referencia**: puse
`FIRMA_KINE`, que vive en CAMAS_ESTADO, no en EVOLUCIONES. Daba -1, la
comparación se cumplía sola y la guardia no probaba nada. La caché al correrla.

**193 guardias · 193 verdes.** Nueva: `ingreso_paso_cero.js`.
Sello de entrega: `NEXT-3.6-paso-cero`.

---

## 20-sep-2026 · Intubar a un paciente que llegó con vía aérea natural · Tanda 3.7

Diego, probando el módulo del turno: «*no puedo intubar a un paciente que llegó
con natural… sí pude pero se debía declarar arriba y me deja 2 historias, y
necesito intubar y luego seguir con ese flujo*».

### Lo que estaba pasando, que era peor de lo reportado

Se reprodujo con una sonda sobre un paciente en **Natural · Ambiente**:

| | decía |
|---|---|
| la cama | Natural · Ambiente |
| «📍 Estado previo» del bloque de intubación | **TOT · VM · ACVC** |
| `INTUB_SOP_PREVIO` (lo que se GUARDA) | **VM** |

O sea: la evolución afirmaba que **se intubó a un paciente que ya estaba
intubado**. La afirmación clínica falsa más fuerte que quedaba en el sistema
después de la hemodinamia.

La causa es un orden. `setEventoVA('intub')` llama a `fijarVA('TOT')`, que
cambia la vía aérea **de arriba**, y recién después el bloque del evento lee
«cómo estaba el paciente» — de arriba, que ya cambió. El comentario del código
de julio dice, con todas sus letras, «el bloque de arriba queda como ESTADO
PREVIO y NO se toca»; el código de septiembre lo tocaba. Nadie lo notó porque
el caso solo se ve cuando el evento ocurre **en el mismo turno en que el
paciente llega**: con un turno anterior, el estado previo se reconstruye de la
fila de ayer y la mentira queda tapada.

Y las «2 historias» son el mismo hecho: arriba quedaba en TOT · VM y el panel
«✅ Queda con (post-intubación)» —un módulo ventilatorio ENTERO, duplicado—
volvía a pedir TOT · VM.

### Lo que decidió Diego

Se le presentaron las dos formas de arreglarlo, porque cambian cómo se usa la
pantalla. Eligió **una sola planilla**: declara la intubación arriba y sigue en
el mismo módulo de siempre; el sistema le saca una **foto** al estado previo y
la guarda solo.

### Lo que se programó

**1 · La foto del estado previo.** `_tomarFotoPrevioVA()` corre en
`setEventoVA` **antes** de que `fijarVA` mueva nada. De ahí salen el «📍 Estado
previo», `INTUB_SOP_PREVIO`, `INTUB_VA_PREVIA` e `INTUB_MODO_PREVIO`. La foto no
se repisa —describe un instante— y se olvida al deshacer el evento y al cerrar
el panel, para que no la herede el paciente siguiente.

**2 · El espejo.** El panel «Queda con» de la intubación (`dIntubQueda`) y el de
la reintubación (`dReintubQueda`) se esconden, y `_espejarPostEvento()` copia lo
que se llenó arriba a sus campos: vía aérea, soporte, interfaz, modo, N° de tubo,
fijación y los parámetros `pi_*` / `pr_*`.

🔴 **Los campos no se borran, se esconden** — igual que las casillas del prono.
Son los que arman `INTUB_VA_POST`, `VENT_VIA_AEREA_FINAL` y compañía, y los lee
el servidor. Lo que se va es la SEGUNDA PREGUNTA, no el dato.

🪤 **El espejo tiene una puerta: solo actúa si arriba ya dice la verdad**
(vía aérea TOT o TQT). Si alguien marca la casilla a mano sin declarar el evento
arriba, el paciente sigue figurando en Natural y copiar *eso* al panel «queda
con» guardaría que quedó respirando espontáneo tras intubarse. En ese caso el
panel vuelve a mostrarse y se llena como antes. Sin esa puerta, marcar la
casilla con el paciente en oxigenoterapia regeneraba la caja de parámetros SIN
las variables de VM, y `$('pi_vt')` quedaba en null: lo cazaron
`interfaz_estado_final.js` y `via_aerea_previo.js`.

🪤 **El espejo se registró como CASCADA** (`_CASCADAS`), no con un borrado
propio. Marcar y desmarcar la reintubación dejaba el N° de tubo y la fijación
puestos en campos invisibles; el primer intento —borrarlos dentro del espejo—
arrasaba con lo escrito a mano, porque el espejo corre con **cada** cambio del
formulario. El proyecto ya tenía el mecanismo de «deshacer el manotazo»: bastó
con entrar en él. Lo cazó `panel_no_pisa_datos.js` las dos veces.

🪤 **La TQT NO entró en esta tanda.** Ella ya había resuelto lo mismo **al
revés** y hace tiempo: esconde el módulo de arriba (`_gateVentPorTqt`) y deja el
suyo. Las dos formas cumplen «una sola planilla», así que se arregló lo que
duplicaba y no se tocó lo que funciona. Unificarlas es una decisión de Diego, no
un arreglo, y queda anotada como pendiente.

### La guardia

`intubar_desde_natural.js`, escrita **primero** y vista **roja con 26 fallos**
contra el código sin arreglar. Mide seis cosas: que el estado previo diga
Natural y no TOT ni VM; que no haya dos módulos ventilatorios a la vista; que
los campos escondidos sigan en el documento; que tras la intubación el turno
siga como paciente intubado (cuff y succión endotraqueal); que lo escrito
arriba viaje al payload como estado posterior; y que la foto se olvide al
deshacer el evento.

🪤 **Y volvió a caer en la trampa de siempre**: el cuff se midió desde el paso 2
y dio «oculto» sin que nada estuviera roto — vive en el paso 1, con el paquete
de prevención de NAVM. Cuarta vez en este proyecto. La guardia se para en el
paso 1 para medirlo y vuelve.

🪤 El reloj va congelado: fecha inventada (12-ago-2026, fuera de las ventanas
trampa) y turno forzado.

### Lo que apareció de paso y NO se tocó

Con el paciente ya en TOT, el guardado **exige declarar la PVE del turno** —una
prueba de ventilación espontánea a alguien recién intubado—. Pasa desde antes de
esta tanda y no es lo que Diego reportó, así que queda anotado, no arreglado.

### Un rótulo que quedó mintiendo, cazado mirando la pantalla

Al sacarle capturas a la app para mostrarle a Diego cómo quedó, el recuadro
seguía titulado «📍 Estado previo **(de Terapia ventilatoria ↑)**». Ya no sale
de ahí: sale de la foto. Un rótulo que describe mal de dónde viene un dato es
la clase de detalle que después se defiende en una reunión. Ahora dice
«así estaba antes de intubar», y el comentario del código de julio que decía lo
contrario se reescribió con la razón.

🪤 La captura mostró algo que ninguna guardia mide: el texto de la interfaz
puede quedar contradiciendo al código sin que nada se ponga rojo. Mirar la
pantalla sigue siendo parte del trabajo.

**194 guardias verdes.** Sello `NEXT-3.7-intubar-natural`.

---

## 21-sep-2026 · El módulo es del evento · Tanda 3.8

Diego, al ver la pantalla de la 3.7: «*marcar intubación podría activar lo mismo
que "ocurrió intubación este turno"… esto como que estuviera repitiéndose dos
veces. Lo que yo estaba proponiendo era que cada opción que marque un evento
desplegara distintos módulos o formas de llenar terapia ventilatoria… tienen el
mismo contenido, solamente que se plantea de otra forma. Pongo "qué pasó con la
vía aérea este turno: intubación", entonces sale: ¿con qué lo intubé?, quizás si
fue intubación difícil o no, los parámetros, en qué modo quedó, la causa de la
intubación y una nota adicional.*»

### Su duda concreta, y la respuesta

**No había que marcar la casilla: se marcaba sola.** `setEventoVA('intub')` la
marca por dentro. Pero seguía A LA VISTA y marcada, así que parecía que hubiera
que marcarla aparte. Es la misma segunda pregunta que el 16-sep-2026 se quitó de
«Ocurrió TQT este turno» y «Ocurrió decanulación este turno»: a la intubación se
le quedó fuera, en el único evento donde sobrevivió. Ahora se esconde, viva,
como las otras dos.

### 🪤 Esto INVIERTE la tanda de ayer, y a propósito

Ayer Diego eligió «una sola planilla: la de ARRIBA», y el panel del evento se
escondió y se llenaba por espejo. Hoy, al verlo en pantalla, corrigió cuál de
las dos sobrevive: una sola planilla sí, pero **la del EVENTO**.

No es una guardia que se aflojó: es un acuerdo de producto que cambió con
veinticuatro horas de uso. Lo que se retiró —el espejo, y «la planilla buena es
la de arriba»— salió de `intubar_desde_natural.js` con su razón escrita, y no se
reemplazó por una versión más blanda: vive entero, medido al derecho, en la
guardia nueva. Lo que NO cambió, porque era el bug y no el acuerdo, es la FOTO
del estado previo: el registro sigue sin poder decir que se intubó a un paciente
que ya estaba intubado.

### Lo que se programó

**1 · El módulo es del evento.** `_gateVentPorTqt` se generalizó a
`_gateVentPorEvento`: declarada una intubación, reintubación o traqueostomía, el
bloque genérico «Terapia ventilatoria» se anula y manda el panel «Queda con» del
evento, con su aviso. La traqueostomía lo hacía sola desde la v5.1; ahora los
tres son iguales — que era una de las dos preguntas abiertas de ayer.

**2 · El espejo se retiró.** Ya no hay dos sitios que llenar, así que no hay nada
que copiar. Se fue con su razón escrita en el lugar donde vivía.

**3 · La intubación cuenta por qué.** Dos columnas nuevas, al final:
`INTUB_CAUSA` (lista) e `INTUB_DIFICIL` (sí/no). La nota libre sigue en
`INTUB_DET`, que ya existía; lo que cambió es que dejó de hacer de causa y de
nota a la vez. Con la lista se puede **contar** cuántas intubaciones fueron por
cada motivo; con la nota se puede **leer** lo que pasó. La lista sola no basta
—«a veces la opción no está y se termina anotando en notas», su propia lección
de los pendientes—.

**4 · El relato lo narra**, en los dos motores:

> Previo en ambiente, paciente requiere intubación orotraqueal a las 14:20 hrs
> **por mal manejo de secreciones — taquipneico, desaturando, se procede a
> intubar para protección de vía aérea. Intubación difícil.** Queda con TOT N°
> 7.5 a 22 cm de arcada dental, conectado a VM en modo ACVC…

🪤 **Sin causa se conserva la forma vieja** («en contexto de …»): los turnos ya
guardados solo tienen la nota, y cambiarles la redacción reescribiría hacia
atrás evoluciones que ya se leyeron y se entregaron.

### 🪤 El signo de pregunta, otra vez

Al anular el módulo de arriba, el N° de tubo y la fijación pasaron a vivir SOLO
en el bloque del evento — y la línea «VAA mediante TOT N° … a … cm» seguía
leyéndolos de arriba, que ahora está vacío. La evolución salía **«VAA mediante
TOT N° ? a ? cm de arcada dental»**. Exactamente el mismo signo de pregunta que
el 17-sep costó cazar con los días de vía aérea, y se vio igual: **mirando el
relato**, no con una guardia. La traqueostomía ya lo tenía resuelto
(`VENT_TQT_CALIBRE`); al TOT le faltaba. Ahora sí hay guardia.

### 🪤 Y dos rótulos que quedaron mintiendo

El del estado previo decía «(de Terapia ventilatoria ↑)» cuando ya salía de la
foto, y el cartel verde decía que el ventilador se llena «en Terapia
ventilatoria» cuando pasó a llenarse en el bloque. Los dos se vieron en las
capturas, ninguno puso nada rojo. **El texto de la interfaz puede quedar
contradiciendo al código sin que ninguna guardia se entere**: mirar la pantalla
sigue siendo parte del trabajo.

### La guardia

`intubacion_modulo_evento.js`, escrita **primero** y vista **roja**. Mide las
dos cosas de Diego: que la segunda pregunta no se haga, y que el módulo sea el
del evento, con sus preguntas (causa de lista que nace en blanco, intubación
difícil, nota libre, N° de tubo y fijación dentro del bloque). Más que los tres
eventos se comporten igual, que el relato cuente la causa y la nota, y que no
vuelvan los signos de pregunta.

### La última segunda pregunta, y la trampa que escondió

Diego aclaró después el malentendido: cuando yo decía «arriba» él entendía los
chips de eventos, no el bloque «Terapia ventilatoria» —de ahí que la pregunta
del día anterior no le calzara—. Y confirmó el fondo: **cada evento despliega su
módulo, y con «Nada» queda la terapia ventilatoria estándar.**

Al revisar los cinco eventos uno por uno apareció que **«↩️ Ocurrió reintubación
este turno» (`cReintubT`) seguía a la vista**: el mismo defecto, en el único
sitio donde sobrevivía. Se escondió.

🔴 **No se tocó `cReintub`**, la reintubación ANIDADA en el flujo PVE: allá la
fila de arriba está declarando la EXTUBACIÓN, así que esa casilla es el único
lugar donde el hecho se anota. Esconderla habría perdido el dato.

🪤 **Y esconderla rompió la declaración, en silencio.** `setEventoVA('reintub')`
elegía entre las dos casillas preguntando si `cReintubT` estaba *dentro de un
.hidden*. Al esconder la segunda pregunta, la condición se dio vuelta sola y el
botón empezó a marcar la casilla EQUIVOCADA: una reintubación declarada arriba
se anotaba como ocurrida dentro de una extubación que nadie declaró. Ahora la
decisión la toma la SECCIÓN en juego, que es lo que de verdad distingue los dos
casos y no cambia al esconder un control. Lo cazó la guardia en el acto.

### Lo que queda anotado y NO se tocó

La extubación y la decanulación **no** anulan el módulo genérico: su «queda con»
vive en el bloque PVE y en el suyo, y el de arriba sigue a la vista. Diego no lo
reportó y ampliarlo por cuenta propia sería alcance que no pidió; queda como
pregunta para él.

**195 guardias verdes.** Sello `NEXT-3.8-modulo-del-evento`.

---

## 21-sep-2026 · Lo registrado vuelve al reabrir el turno · Tanda 3.9

Diego, contando lo que le pasó en la unidad: «*ayer una extubación… yo no había
registrado una extubación porque mi plan no era extubarlo y terminé extubando un
paciente igual dos horas después de haber evolucionado la primera vez, y pasó
que ya no me ofrecía el modal de extubación, y eso me causó cuidado; y luego
cuando logré entre comillas registrar, no me aparecía en la extubación contada.
Lo que yo necesito es un flujo en que lo que anote pueda seguir registrando
después.*»

### Lo que se encontró

`fillForm()` —el camino que carga un turno YA GUARDADO para re-editarlo—
reponía la intubación y la traqueostomía **enteras**, pero del bloque
PVE/EXTUBACIÓN y del de DECANULACIÓN **no reponía nada**. Se reprodujo con un
turno que traía la extubación completa (PVE superada, hora 19:10, motivo,
evaluación post, queda con CNAF). Al reabrirlo:

| | |
|---|---|
| el bloque de extubación | oculto |
| la PVE declarada | vacía |
| hora, motivo, evaluación post | vacíos |
| `_extOcurrio()` | **false** |

Encadenado: sin la PVE no se abre su rama, sin la rama no existe la casilla
«hubo extubación sin PVE», y sin ella no hay dónde declarar nada. Eso es el
«ya no me ofrecía el modal».

### 🪤 Por qué nadie lo vio antes: el dato NO se perdía

El cliente quita esos campos del payload (`del()`), y el servidor fusiona con la
fila anterior (`if (!(k in datos)) datos[k] = _prev[k]`), así que la extubación
**sobrevive en la planilla**. Lo que se perdía era la PANTALLA — que es donde el
colega decide si quedó registrado y desde donde lo corrige. Una pérdida
invisible en la hoja y total para quien la usa.

### Lo que se programó

`_reponerExtYDecan(s)`: repone la PVE y su rama, el resultado, la hora, el tipo,
el motivo, la evaluación post, el «queda con», y la decanulación entera con su
tipo, dispositivo, detalle y recanulación. Y **muestra el bloque de extubación
aunque la vía aérea ya sea natural** — tras extubar lo es, y la regla «solo con
TOT» escondía justo el sitio donde vivía lo registrado. La decanulación ya tenía
esa excepción; a la extubación le faltaba.

### Dos trampas que costaron media guardia en rojo cada una

🪤 **La llamada va AL FINAL de `fillForm`.** Puesta junto a donde se repone la
intubación, lo que escribía lo barrían las cascadas y el `updateVAUI()` que
corren después. Lo último que toca el bloque tiene que ser quien lo repone.

🪤 **Los ayudantes van propios, no prestados.** `set` y `chk` son LOCALES de
`fillForm`; fuera de ella el nombre `set` lo toma otro global que escribe
`textContent` en vez de `value`. No reventaba: escribía en el sitio equivocado y
la reposición fallaba **en silencio** — once assertions en rojo sin un solo
error de JavaScript. Dos funciones con el mismo nombre y distinto trabajo es la
misma familia del problema que `escapado_unico.js` vigila.

### La guardia

`evento_vuelve_al_reabrir.js`, escrita **primero** y vista **roja con 19
fallos**. Mide los cuatro escenarios: extubación con protocolo, extubación sin
protocolo con su tipo, decanulación completa, y el caso exacto de Diego —
evolucionar sin extubar, reabrir, y poder declarar la extubación que ocurrió dos
horas más tarde, con la app contándola.

**196 guardias verdes.** Sello `NEXT-3.9-vuelve-al-reabrir`.

---

## 25-sep-2026 · El ventilador se anota en Prevención de NAVM · Tanda 4.0

Diego: «*que se pueda anotar el VM en el apartado de prevención de NAVM si es
que aplica VM*». Y antes, explicando por qué ahí: «*medida de prevención de
neumonía asociada a ventilación mecánica con el ventilador que tiene… el
ventilador que tiene no predispone a la neumonía, sin embargo es como un buen
lugar para anotarlo; aquí se van a anotar los filtros y todo eso*».

### 🔴 El equipo no se inventa ni se duplica

El inventario ya existe: hoja `VENTILADORES` con 33 equipos y su ubicación por
cama, la cama sabe cuál tiene (`VM_TAG`) y la grilla ya lo mostraba como chip.
Lo que faltaba era poder anotarlo **sin salir del turno** a la pestaña
Ventiladores.

Así que la fila nueva **no guarda un dato nuevo**: mueve el equipo en el MISMO
inventario con `MOVER_VENTILADOR`, y el movimiento queda en su libro con fecha y
firma. Un segundo lugar donde escribir «qué ventilador tiene» sería la copia que
después se contradice — el mismo modo de fallo que el desajuste 119≠132.

### Tres decisiones, con su razón

**Va ARRIBA de los filtros.** El HEPA fijo depende del EQUIPO
(`_hepaFijoEquipo`), así que saber cuál es viene antes que preguntar por su
filtro.

**Solo con VM invasiva.** El esquema ya lo dice: un VM «es parte de la sala y
OCUPA la cama», mientras el VNI y el CNAF «van al PACIENTE — queda en una cama
pero no vive ahí». Ofrecer la fila sin VM sería pedir que se asigne a la cama un
equipo que no es de la cama. Con TQT en VM sí aparece: sigue ocupando uno.

**El que está en otra cama lo dice en su propia opción** («PB 1 · en cama 7»), y
al elegirlo pide confirmación: traerlo deja sin ventilador asignado a otro
paciente, y eso no se hace sin verlo.

🪤 El inventario se pide **una vez** y queda en memoria: el paso 1 se repinta
muchas veces por turno y no vale un viaje al servidor cada vez.

### La guardia

`ventilador_en_prevencion.js`, escrita **primero** y vista **roja**. Mide que la
fila aparezca solo con VM, que vaya antes de los filtros, que ofrezca los
equipos de cama y NO los de apoyo (un Aerogen no ocupa cama), que muestre el que
la cama ya tiene, que avise cuál está en otra cama, y que al elegir uno mande
`MOVER_VENTILADOR` a esta cama con la fecha del turno.

🪤 El reloj va congelado: fecha inventada y turno forzado.

**197 guardias verdes.** Sello `NEXT-4.0-ventilador-en-navm`.

---

## 2-oct-2026 · El turno rediseñado · Tanda 5.0 (A a G)

Diego dictó el 30-sep y el 1-oct cómo quería el turno y, el 1-oct, dio la orden:
**«Programa lo pendiente»** (hasta entonces regía «no programes nada aún»). Se
hizo en siete tandas, cada una con su guardia escrita **primero** y vista
**roja**, y la batería completa verde antes de cada commit. Los acuerdos, con sus
palabras, están en `docs/ACUERDOS_REDISENO.md` (§7 y §8); lo que sigue abierto,
en `docs/PENDIENTES.md`.

### Qué se programó

| Tanda | Qué | Guardia |
|---|---|---|
| A | BDT sin «no realizado», positivo precoz o tardío, FEM narrado en L/s | `bdt_una_eleccion` |
| B | PVE con más de 24 h de VM en cualquier modalidad; «no corresponde» pide razón | `pve_no_corresponde_razon` |
| C | P0.1, ΔPocc y Pmusc a Evaluaciones y al relato; deglución presente/ausente | `esfuerzo_en_evaluaciones` |
| D | «Pruebas de traqueostomía», bloque propio con puerta por TQT | `pruebas_tqt` |
| E | Ecografía pulmonar: POCUS (1, 2, PLAPS) y LUS (12 zonas) sobre una figura, con serie | `eco_pulmonar` |
| F | Evaluaciones como iconos de celular; «obligatorio» en tres niveles | `evaluaciones_celular` |
| G1 | Paso 0 en cuatro bloques; fecha y hora de llegada obligatorias | `ingreso_cuatro_bloques` |
| G2 | «Cómo llega»: el soporte de ingreso | `ingreso_soporte` |
| G3 | La AET como **serie de tramos** (1, 2, 3A, 3B, 3C) | `aet_serie` |
| G4 | «General» se disuelve: Preingreso en Evaluaciones, Fase clínica propia, día de estadía en el banner | `general_disuelta` |

### Lo que se midió y no se sabía

- 🪤 **La hora de ingreso sugerida se borraba sola** al abrir un ingreso
  (`fillCama`). Estaba así desde antes; no se veía porque la hora no era
  obligatoria. Lo encontró la guardia de G1.
- 🪤 **«✏️ Editar ficha» destapaba la identificación y seguía oculta**: desde que
  existe el paso 0, `fcId` pertenece solo a ese paso. Un RUT mal escrito no se
  podía corregir fuera del ingreso. Lo encontró la guardia de G4.
- 🪤 **`#epBannerCaja:has(.hidden)`** escondía la caja entera si CUALQUIER hijo
  estaba oculto; al compartirla con la línea de la ficha se llevaba el banner.
  Ahora solo manda el banner.
- 🔴 **No era «falta el PMI»**: era el P0.1 mal transcrito de la voz. No se creó
  ningún campo.
- Un error mío, corregido ante Diego: dije que la PVE no aparecía en modo
  controlado. Medido: con tubo **siempre** aparece, en cualquier modo y a
  cualquier hora; con TQT en VM no aparece. Lo que cambió es la puerta de las
  24 h y que «no corresponde» pida razón.

### Decisiones que tomé yo, para que las confirme (en `PENDIENTES.md` §2)

Nombre «Pruebas de traqueostomía»; el botón se queda «POCUS»; el BDT se desmarca
tocando el mismo botón; la deglución antepone presente/ausente y conserva la
calidad; el «obligatorio» vence a los 3 días y no bloquea el guardado (solo la
PVE bloquea); la adecuación del turno vive dentro de la tarjeta «Fase clínica».

### Reglas que se aplicaron y conviene no olvidar

- **El sello del cohete debe ser ASCII.** `NEXT-5.0-turno-rediseñado` hizo
  fallar el empaquetado («el cargador contiene caracteres no ASCII»).
- **El sello vive también en `v2/index.html`** (el `<meta rce-version>` y el aviso
  de «la app no pudo iniciar»). Subir solo `build/empaquetar_cohete.js` pone roja
  `paridad_entrega`, `aviso_error_al_centro` y `buzon_campana`.
- La columna de EVOLUCIONES pasó de 411 a **414**; hay que correr
  `crearORepararEstructura()` al pegar. CAMAS_ESTADO y ARCHIVO_PACIENTES ganan
  `AET_SERIE`.

**207 guardias verdes.** Sello `NEXT-5.0-turno-redisenado`.

---

## 2-oct-2026 · El horario del turno y «No corresponde de noche» · Tanda 5.1

Diego probó «de noche» y escribió: *«De noche las evaluaciones se muestran. Quizás para
que esto funcione mejor en terapia física de noche que salga no corresponde. Corregir
horario.»* Era ambiguo, así que **medí antes de tocar** y le di dos caminos en cada
cosa (acuerdo 8.5).

### Lo que se midió

- La app cambiaba de turno a las **21:00 / 09:00** y el equipo cambia a las **20:00 /
  08:00**. Entre las 20 y las 21 la app seguía en «Día». El código lo tenía documentado
  como hora de gracia a propósito; era una decisión que se tomó con otro motivo y ya no
  sirve.
- De noche de verdad, el paso Evaluaciones mostraba la lista de lo último medido con
  «sin medir» en beige y el botón «No medí nada este turno».

### Qué se hizo

- **Horario a 08:00 y 20:00** en el cliente, el servidor, el esquema y la config de la
  pantalla. `_migrarHorarioTurno()` corrige **una sola vez** las planillas que ya
  tenían 9 y 21 (solo si las dos siguen con el valor viejo, y deja una marca para no
  pisar una vuelta atrás). Guardia nueva `horario_turno.js`.
- **«No corresponde de noche»** en el paso Evaluaciones (rótulo + botón de seguir) y en
  la tarjeta de terapia física (marca en el encabezado + aviso). La lista de lo último
  medido se queda. Solo pantalla. Guardia nueva `noche_no_corresponde.js`, que incluye
  el camino entero reloj → turno → rótulo con la hora congelada a las 20:30.
- `transicion_hora_retroactiva.js` ajustada con su razón escrita: la ventana del turno
  Día pasó de 09:00–20:59 a 08:00–19:59. Lo que protege (ni futura, ni de otro turno)
  no cambió.

### Para no olvidar

- 🪤 **`esquema.gs` trae su propio `leerConfig` y su propio `_tz`**, y al evaluarlo en
  una guardia pisan los falsos que se definieron antes. Hay que **reasignarlos
  después del eval**, sobre el mismo nombre.
- 🪤 **El ancla de `refTurno` (15:00 / 03:00) no se movió**: sigue dentro de cada turno
  y moverla cambiaría días de VM ya contados.
- 🪤 Corregí una frase mía de la tanda anterior: dije que de noche el Preingreso «no se
  alcanza», pero los chips «Previo a la UCI» siguen tocables. Queda como pregunta.

**209 guardias verdes.** Sello `NEXT-5.1-horario-y-noche`.

### Y ese mismo día, la segunda mitad · Tanda 5.2

Diego contestó la pregunta que dejé abierta: *«Que también se apaguen de noche, además
necesito que de noche aparezca en evaluaciones el mismo formato del día.»*

- Los chips **«Previo a la UCI»** (ECF, Barthel, Charlson) se apagan de noche. Los arma una
  sola función (`_escalasEpisodioHTML`) que usan el pool del paso 3 **y el banner de arriba**,
  así que se apagan los dos sin tocar nada más.
- De noche la tarjeta de Evaluaciones **ya no se esconde** (`hEgr`): muestra **los mismos
  cajones** que de día, desactivados y **sin numerito** de pendientes. `#dEgr`, donde viven los
  campos, no se abre de noche.
- 🪤 **Un hueco que apareció al medirlo:** forzar un cajón de noche (`evFamAbrir`) marcaba «se
  evaluó este turno». Con la tarjeta escondida no se podía llegar; con la tarjeta visible sí
  habría sido posible. Ahora el cajón se niega a abrir de noche.
- Se ajustaron con su razón escrita dos guardias que daban por hecho que de noche no había
  cajones (`evaluaciones_celular`, `general_disuelta`). `medicion_no_queda_hueca` no tuvo que
  tocarse: la tarjeta tiene contenido.

**209 guardias verdes.** Sello `NEXT-5.2-noche-apagada`.

### La corrección de rumbo · Tanda 5.3 · Seis pasos

Diego miró el mensaje que yo había puesto y escribió: *«dice que las evaluaciones no pueden ser realizadas de
turno de noche, pero sí pueden ser realizadas en turno de noche. Lo que no puede hacerse o registrarse de noche
es la terapia física.»* Y propuso un paso aparte para la terapia física. Le contesté si tenía sentido y era
viable (sí, con costo en pruebas y en toques) y le pregunté el orden y qué se llena de noche.

**Lo que hice:**

- **Deshice mi error** (dos tandas seguidas apagué las evaluaciones de noche). Se borró
  `noche_no_corresponde.js`; nació `evaluaciones_de_noche.js`.
- **Terapia física de noche: se llena, parte en blanco y no hereda.** `ktm_de_noche.js` se reescribió: la
  convención «KTM A» (se ve y no se llena, 19-sep) quedó reemplazada por la palabra de Diego del 2-oct.
- **Seis pasos** (`seis_pasos.js`): Terapia física (4) y Planes (5) se separan; se guarda al salir de Planes;
  Relato pasa al 6. Las dos tarjetas de terapia física salieron de la columna derecha del turno (mismos ids)
  para que su paso no quedara a media pantalla.

### Lo que se midió por el camino (y no se sabía)

- 🔴 **Los obligatorios de otro paso NO bloqueaban el guardado.** Las comprobaciones usaban `offsetParent`
  como «¿se ve?», y un campo de otro paso está oculto por el paso. Medido: tubo + VM, PVE sin responder,
  guardar desde el paso 3 → guardaba. **La PVE obligatoria que se programó en la tanda B no bloqueaba en el
  flujo real.** Nadie lo vio porque las guardias probaban cada obligatorio parado en SU propio paso, que es el
  único lugar donde funcionaba. Ahora `_vis()` distingue «lo esconde la lógica» de «lo esconde el paso», y el
  guardado lleva al paso del campo. Guardia: `validacion_entre_pasos.js`, que prueba cada obligatorio desde
  OTRO paso.
- El chip «IMS» de Evaluaciones nunca llevaba a su control (vive en la tarjeta de KTM). Arreglado.
- `hKTM(esIng ? 'n' : 'r')` en `abrirPanel` era un SEGUNDO valor por defecto de la KTM, que pisaba el neutro de
  noche. Hay tres lugares que fijan el estado inicial de la KTM; los tres respetan ahora la noche.
- La regla de ≤740 px ya escondía los nombres de las pestañas en el celular; con seis, la activa muestra el
  suyo.

### Para no olvidar

- 🪤 **Probar un obligatorio parado en su propio paso es lo que dejó pasar el fallo.**
- 🪤 **Guardias que dependen de la numeración de pasos:** 43 nombran `pasoIr(n)`; solo 8 se enteraron, y se
  ajustaron con su razón (`cuatro_pasos`, `cierre_tres_bloques`, `nada_del_guardado_despues`,
  `paso_evaluaciones`, `paso_relato`, `prevencion_navm`, `plantillas_evolucion`, `texto_congelado`).
- 🪤 `aplicarGatesEval` cortaba de noche (`if(esNoche) return`): saltaba la cooperación, el SAS 1 y
  `aplicarGatesNeuro`. Ya no corta.

Sello `NEXT-5.3-seis-pasos`.

### «Rehaz el último paso en ultracode» · Tanda 5.4 · Revisión a máxima exigencia

Diego escribió *«Rehaz el último paso en ultracode»*. No existe nada llamado ultracode aquí (ni habilidad, ni
herramienta, ni en el repositorio) y «el último paso» admitía tres lecturas; se le preguntó y no marcó preferencia. Se
tomó la lectura segura: **máxima exigencia sobre la última tanda**. Reescribir desde cero algo ya verificado y subido
era perder trabajo sin ganar nada; en su lugar se la sometió a la revisión de código más profunda disponible
(`code-review`, nivel máximo, todos los hallazgos), de la que salieron **diez puntos**. Cada uno se verificó escribiendo
la prueba y viéndola ROJA antes de tocar nada.

**Reales, arreglados:**

1. 🔴 `_vis()` contaba el plegado de tarjetas del CELULAR como «oculto por la lógica»: a 390 px los obligatorios seguían sin
   exigirse. Medido con 18 comprobaciones rojas. `validacion_entre_pasos.js` corre ahora a 1200 y a 390 px, con un control
   contrario (sin tubo no se exige PVE).
2. 🔴 Los chips de Evaluaciones no abrían su campo desde la tanda F (la familia está cerrada). `chips_llevan_al_campo.js`
   lee la lista de chips del código, no la enumera a mano, y prueba día y noche.
3. 🔴 El IMS vivía dentro de `#dKTMr` (panel «Realizada»): inalcanzable con la KTM neutra. Se mudó a la familia
   Funcionales (mismos ids). Cierra el pendiente 14.
4. El IMT/EMS se narraban solo dentro de «KTM realizada»; el servidor siempre. Ahora igual, con el orden del servidor
   (KTM, IMT, EMS, alerta).
5. `_PREVIA_DIA` ausente ⇒ el cliente caía a la fila de NOCHE: la KTM de noche pasaba al primer turno de día.
6. `dominio_validacion.gs` seguía rechazando la KTM de noche (regla dormida, salvada solo porque el payload no trae
   `TURNO`). Se quitó; `ktm_no_se_pierde.js` pasó de «rechazado» a «aceptado» con su razón escrita.
7. `pasoIr` no reactivaba «Siguiente» al saltar desde el paso 1.
8. La pestaña «6 Relato» se abría sin haber guardado (pintaba «✓ Guardado»); ahora solo abre guardado (`_relatoListo`).
   Además `abrirPanel` limpia el «✓ Guardado» del panel anterior.
9. Comentarios que mentían tras la renumeración, y cuatro sitios con el estado inicial de la KTM → `ktmEstadoInicial()`.

**Decisión de Diego, no tocada:** los valores heredados en ámbar y su aviso están muertos en el flujo por pasos desde que
existen los pasos (miran `offsetParent`). Ver `PENDIENTES.md` 4b.

### Para no olvidar

- 🪤 **Un arreglo se prueba en TODAS las pantallas donde corre la app**, no solo en la del escritorio: el de la tanda anterior
  pasó en 1200 px y fallaba en 390.
- 🪤 **Un chip que «lleva a un campo» se prueba mirando que el campo se VEA**, no que la función corra sin error.
- 🪤 **Quitar una regla de un lado sin buscar su gemela en el otro** deja una regla dormida: el servidor tenía la suya.
- 🪤 La revisión corrió como pasada única (sin verificación por separado); por eso cada hallazgo se confirmó con una prueba roja.

Sello `NEXT-5.4-revision-maxima`.


---

## 4-oct-2026 · Tanda 1 de integridad: las cuatro correcciones de septiembre, rehechas sobre NEXT-5.4

**De dónde sale.** El plan «limpieza del registro de evolución» (3-oct) traía cuatro correcciones preparadas en septiembre
(commit local `c312de3`) que nunca llegaron a GitHub. La tanda 0 (4-oct) midió que **ninguna** estaba en la rama viva y
que la batería base daba 212 verdes. Se rehicieron desde cero, cada una con su guardia vista ROJA primero. Después una
revisión adversarial independiente (dos lentes por corrección) encontró 31 hallazgos, cuatro importantes, y se arreglaron.

| Defecto | Qué pasaba | Guardia (roja antes, verde después) |
|---|---|---|
| Ceros | `parseFloat(x)\|\|null` en `guardar()` y `(b\|\|'')` en `_syncCamaDesdeEvolucion` volvían vacío un 0 válido (PEEP, PS, AutoPEEP, PIC, PPC, Barthel, MRC, FSS…). Mismo defecto en el alta (`darAltaPaciente`), el Historial, el egreso, los archivados y la tabla dinámica. El servidor aceptaba NaN e Infinity | `ceros_de_punta_a_punta.js` |
| Episodio al guardar | El servidor usaba `datos.PATIENT_ID \|\| cama.PATIENT_ID` y no comparaba el episodio que el formulario abrió con el que ocupa hoy la cama. Ahora la pantalla manda `EPISODIO_ABIERTO` y el servidor rechaza, dentro del lock y antes de escribir, si la cama cambió de paciente | `episodio_al_guardar.js` |
| `_evalHoy` en UTC | Pasadas las 20-21 h de Chile «hoy» era mañana y reabrir un turno de día no reponía sus evaluaciones. Igual el mes por defecto de Estadísticas el último día del mes | `eval_hoy_fecha_del_turno.js`, `estadisticas_mes_local.js` |
| Sesiones | Desactivar a alguien o cambiarle la clave no cortaba sus sesiones abiertas (hasta 6 h renovables). Ahora la sesión lleva una versión por persona y se comprueba ACTIVO; lo mismo en Coordinación por cambio de clave | `acceso_revocacion.js`, `coordinacion_revocacion.js`, `acceso_pantalla.js` |
| Caché PWA | `activate` borraba TODOS los cachés del origen y `fetch` guardaba cualquier GET propio. Ahora solo borra los `rce-armazon-` de otra versión y solo guarda el armazón | `pwa_cache_aislado.js` |

**Lo que cambió de comportamiento y Diego debe saber** (decisiones abiertas, ninguna tomada por mí):
- Un turno PASADO de un paciente ya egresado, abierto con «Ver / editar» cuando la cama la ocupa otro, ahora el servidor lo
  rechaza. Antes se guardaba atribuido al ocupante de hoy.
- Tras ese rechazo el botón principal es «Cerrar la cama», no «Reintentar» (reenviaba lo mismo y recibía el mismo rechazo).
- Un egreso con MRC 0 ahora se archiva (antes quedaba vacío) y cuenta como DAUCI; `obtenerStats` sigue filtrando MRC/FSS/CPAx
  de valor 0 de sus promedios, así que conteo y promedios quedan en desacuerdo hasta decidir.
- El promedio de KTR en la tabla dinámica cuenta solo los turnos que anotaron sesiones (el 0 anotado cuenta, el vacío no).
- Una falla de la planilla al comprobar la sesión ya no manda a la pantalla de entrada: avisa «no se pudo comprobar» y la
  sesión sigue viva.
- El corte de sesión por baja en KINESIOLOGOS no existe en Coordinación (tabla fija en el código); ahí corta solo el cambio de clave.

**Pendiente a propósito (va a la tanda 2):** ingreso sobre cama libre que otro ocupa en el intertanto; extender el candado
del episodio a DAR_ALTA, PEND_ABRIR/CERRAR, EVAL_REGISTRAR y mover/limpiar; identificador de operación para el reintento.

**Cómo revertir:** cada corrección vive en archivos propios; `git revert` del commit de la tanda las deshace todas, y
las guardias nuevas se borran con él. Las cuatro son compatibles hacia atrás: no cambia ninguna columna.

### Para no olvidar

- 🪤 **El mismo defecto vive en las rutas hermanas.** El arreglo de ceros en el guardado dejaba el 0 vacío en el alta y en el
  Historial; la revisión independiente lo encontró, no la guardia propia. La guardia mide ahora el camino completo.
- 🪤 **Un `||` sobre un número es sospechoso siempre**: Sheets devuelve el 0 como número y en JavaScript es falso.
- 🪤 **«Mismo origen» no es «mío»**: un service worker que limpia con `caches.keys()` sin filtrar borra los cachés de otras
  apps del mismo dominio (GitHub Pages reparte un origen por cuenta).
- 🪤 **Un mensaje de error se reconoce en UN solo lugar.** El servidor decía «Entra con tu clave» y una de las tres regex de
  la pantalla solo conocía «Inicia sesión»: con sesión cortada el guardado caía a «Reintentar» y parecía una falla de red.

Sello `NEXT-5.5-integridad`.


---

## 10-oct-2026 · Tanda 2 · Guardado seguro: nada se escribe sobre el paciente equivocado, un reintento no duplica y la pantalla no afirma lo que no sabe

**De dónde sale.** La tanda 1 dejó anotado a propósito lo que faltaba: el ingreso sobre una cama libre que otro ocupa en el
intertanto, extender el candado del episodio a las demás puertas y un identificador de operación para el reintento. El 4-oct se
auditaron TODAS las escrituras de la app (cuatro áreas, tres propuestas independientes, dos jueces y una síntesis) y salió un
diseño de 17 pasos. Se construyeron los pasos 1 a 16 (un commit cada uno, cada guardia vista ROJA antes del arreglo); después seis
revisiones independientes dejaron **34 hallazgos** (2 bloqueaban, 9 importantes, 23 menores) y siete pasos de arreglos (A a G) los
cerraron. Esta entrada es el paso 17: junta lo que antes eran entradas sueltas, deja la batería y la entrega. **Sin migración de
esquema.** Las entradas sueltas se conservan enteras más abajo, bajo «El detalle, paso a paso».

**Los tres defectos que había** (los tres con el mismo origen: el servidor no sabía de quién era la petición ni si ya la había hecho).
1. **Escribir sobre el paciente equivocado.** Un formulario o diálogo se abre para P; entremedio P recibe el alta y entra Q a la misma
   cama; al apretar el botón, el alta, la limpieza, el traslado, el ➕, la medición, la escala, el pendiente o el gas actuaban sobre
   «quien esté en la cama»: le daban el alta a Q, le anulaban un evento a Q, le medían a Q. `anularEvento` además leía FUERA del
   candado (pisaba un guardado concurrente con una fila vieja) y, si el turno estaba archivado, **resucitaba** al egresado.
2. **Duplicar o perder por una caída a medias.** Doble clic, reintento tras un corte de red o un servidor que murió entre dos
   escrituras: dos evoluciones, dos pendientes, el stock sumado dos veces, el egreso contado dos veces en el REM, un intercambio de camas
   que dejaba a un paciente **borrado** de la hoja, un «anular anexo» atascado para siempre.
3. **Una pantalla que afirmaba lo que no sabía.** Tras dos intentos sin respuesta decía «NO se guardó» aunque el primero hubiera
   aterrizado.

### Lo que cerró cada pieza

| Pieza (pasos) | Defecto que cerraba | Cómo queda | Guardias (rojas antes, verdes después) |
|---|---|---|---|
| **Banco de pruebas** (1) | El simulador tenía un candado de juguete, no podía matar una corrida a medias y dos corridas iguales no se podían comparar | `activarLockReal` (el `infra_lock.gs` de verdad), `sim_muerte.js` (la escritura N aterriza y de ahí en adelante toda escritura lanza, aunque un `catch` la trague) e `instantanea()` | `guardado_seguro_banco.js` |
| **Candado de episodio en cada puerta** (2, 4 a 8, 14; B) | Las 16 puertas que actúan sobre una cama no comparaban a quién le abrió la pantalla el diálogo con quién ocupa la cama | La pantalla manda `EPISODIO_ABIERTO` (el paciente de la tarjeta **al abrir** el diálogo, también vacío, nunca releído al enviar). El servidor lo compara DENTRO del candado y ANTES de la primera escritura (`validarEpisodioPuerta` / `decidirEpisodioPuerta`, puras): si la cama cambió de paciente es VALIDACION, si otra persona se adelantó es el `ERR.CONFLICTO` nuevo; nunca nombra al otro paciente. Reconoce el reintento («ya hecho») sin escribir. `AUDIT_LOG` anota `[sin episodio]` cuando la pantalla no lo manda | `guardado_seguro_cobertura.js` (el censo: cada puerta clasificada y cada una con su sitio de llamada), `guardado_seguro_episodio_g14.js` |
| **Sello de operación e ids derivados** (3, 11, 12; D) | Un reintento o doble clic repetía la acción | La pantalla pone un `OP_ID` por **intención** (mismo contenido sin respuesta = mismo número; 26 escrituras). El servidor guarda 6 h en la memoria temporal del propio script «esto ya lo hice» —solo ids y banderas, nunca nombre, RUT ni texto libre— y devuelve lo mismo sin tocar la planilla. Se sella tras el `flush` y solo si todo terminó limpio. Si el sello no está, los ids de lo que se escribe se **derivan** del `OP_ID` (`PROC_`, `HITO_`, `EVAL_`, `PEND_`, `SUG_`, `ARCH_<pid>`) y se inserta solo si no existe | `guardado_seguro_operacion_g16.js` |
| **Ingreso concurrente** (8, 15; C) | El segundo ingreso sobre la misma cama libre se escribía ENCIMA del primero, sin error (el vacío no reclama episodio a propósito, para no confundir el reintento propio con un ingreso ajeno) | La pantalla **acuña** un `PATIENT_ID` al abrir el formulario sobre una cama libre y lo manda con `EPISODIO_ABIERTO` vacío. Mismo id = reintento propio (una sola fila, un solo hito); otro id sobre una cama ya ocupada = CONFLICTO sin escribir. Además se exige la forma del id, que no esté en otra cama y que un paciente ya egresado no vuelva a ingresar | `guardado_seguro_ingreso_g15.js` |
| **Muerte a medias** (9, 10, 11; B, C, E) | Intercambio y traslado eran dos escrituras (una muerte entre ambas borraba a un paciente o lo dejaba en dos camas); el alta duplicaba el egreso; anular un anexo quedaba atascado tras borrar el hito; guardar un turno repetido movía los días de VM/VNI/VA y borraba el aviso «sin evento declarado»; las colas que fallaban (evaluaciones desde el turno, cultivo a la serie) callaban | Un solo compromiso por puerta y todo lo anterior converge: intercambio y traslado en UNA escritura de camas; `ARCH_<pid>` insertar-si-no-existe y un solo hito de egreso; el reintento completa lo que falte; las colas que fallan devuelven `advertencias[]` («Guardado con aviso») y **no** se sellan, así el reintento las completa | La matriz de muerte N = 0 a total + 1 en `guardado_seguro_operacion_g16.js`: el estado final es IGUAL al de una corrida limpia, puerta por puerta, con y sin `OP_ID` |
| **Pantalla con «No confirmado»** (12, 13, 15, 16; F, G) | «NO se guardó» sin saberlo; dos clics = dos guardados; un éxito tardío no corregía nada; el reintento releía el formulario y podía llevar otro contenido | Ver «Lo que ve distinto la kinesióloga» | `guardado_seguro_no_confirmado_g17.js`; `fallo_guardado_visible.js` y `episodio_al_guardar.js` reconciliadas con su razón (paso 16) |

### Lo que ve distinto la kinesióloga

- **Guardar sin respuesta ya no dice «NO se guardó».** Sale una franja **ámbar** «No confirmado · Reintentando…» con el botón
  «Reintentar ahora»; el sistema reintenta solo a los 3, 10 y 30 s con **el mismo paquete** (la misma foto de lo que ella había
  escrito, el mismo número de operación); a los 45 s sin respuesta se abre un cuadro ámbar «No sabemos si se guardó. Tu texto sigue
  aquí.». Nunca dice «Guardado» ni «NO se guardó» sin saberlo. Si la confirmación llega tarde, la franja pasa sola a «✓ Guardado hh:mm»
  y el cuadro se cierra. El rojo «NO se guardó» queda para cuando **el servidor contestó que no** (la cama cambió de paciente, otra
  persona la ocupó, un dato inválido).
- **Doble clic o Enter = una sola llamada** (mientras hay una en vuelo, devuelve la misma).
- **Ingreso perdido por una carrera:** si otra persona ocupó la cama mientras llenaba el ingreso, sale rojo «NO se guardó · la cama ya
  fue ocupada por otro paciente», conserva todo lo escrito (pantalla y borrador) y ofrece solo «Seguir editando». No nombra al otro.
- **Las demás puertas** (alta, mover, intercambiar, anular, pendientes, escalas, gases, mediciones, el ➕): si la cama cambió de paciente
  desde que abrió el diálogo, el servidor no hace nada y el aviso sale **rojo claro y dura 8 s** (antes salía el aviso gris de 3 s;
  y, sin el candado, la acción caía sobre el paciente equivocado). Dice «desde que abriste **esta ventana**… Cierra esta ventana y vuelve a abrir la cama»; el
  mismo texto vale para formularios y diálogos.
- **Una escritura sin respuesta** (alta, mover, anexar, entrega de turno, stock) avisa en ámbar durante 9 s «No sabemos si se hizo.
  Revisa la cama; si no está hecho, vuelve a intentarlo: es seguro repetirlo.» (antes decía «❌ Se agotó el tiempo» o, en la app
  instalada, nada). Un error interno del servidor también sale en ámbar, sin el texto técnico (al guardar la evolución: «El servidor tuvo un tropiezo —
  reintentando…»).
- **Un stock repetido** dice «Ya estaba registrado: ese mismo movimiento ya se había hecho antes y no se repitió. Revisa el stock.».
- **«Guardado con aviso»** muestra en la franja, en dos líneas, la instrucción («Vuelve a guardar el turno para completarlas») en vez
  de dejarla solo en un aviso de 9 s.
- **El éxito tardío nombra la cama:** «✅ Evolución de la cama 2 guardada» cuando ya tiene otra cama delante.
- **En el celular** la franja se parte en filas, el botón mide al menos 32 px (40 en el celular) y el panel ya no se desliza de lado
  (medido a 390 y 320 px). El cuadro «No confirmado» **no le roba el cursor** a quien sigue escribiendo.
- **El borrador local sale antes de la llamada** y se borra solo al confirmarse; efecto raro e inocuo: si cierra la pestaña a mitad de
  un guardado que sí aterrizó, al reabrir esa cama y turno puede ofrecer «Borrador sin guardar recuperado» (volver a guardar da lo mismo).
- **Re-guardar el mismo turno** conserva los días de VM, VNI y vía aérea que ya tenía si el soporte y la vía no cambiaron, y el aviso
  «cambió la vía aérea sin evento declarado» sigue ahí salvo que ese re-guardado **declare** el evento (entonces se apaga).
- **En la planilla:** los identificadores internos nuevos se ven distintos (más largos, con el código de la operación adentro; los
  egresos son `ARCH_<paciente>` y ya no llevan la hora). Nada los lee ni los ordena salvo la búsqueda de Coordinación.

### Lo que NO cambió

Los eventos de vía aérea se siguen registrando a mano; el cálculo clínico es el mismo salvo el re-guardado del mismo turno (decisión 5);
el RUT no viaja a ninguna parte nueva; el sello no guarda texto clínico (la guardia usa un texto centinela ficticio); el POST sigue
siendo `text/plain`; la dirección del `/exec` sigue sin escribirse en el código; no hay hoja ni columna nuevas.

### Lo que queda apagado o abierto a propósito

- 🔴 **`CONTRATO_ESTRICTO` nace APAGADO.** Con el interruptor en `TRUE` (hoja CONFIG de la planilla de NEXT, sin función nueva) una
  pantalla vieja que no manda `EPISODIO_ABIERTO` se rechaza («esta pantalla es de una versión anterior, recárgala») y un ingreso sin
  identidad propia sobre una cama con paciente es CONFLICTO. Mientras esté apagado, una pantalla vieja pasa por el modo tolerante y
  puede escribir sobre el paciente equivocado: es el único hueco grande que queda, y lo cierra encenderlo **después** del ensayo con dos
  aparatos (decisión 12 del diseño). `AUDIT_LOG` mide cuántas llamadas siguen sin candado (`[sin episodio]`).
- **Pendiente de Diego, ya implementado con la opción recomendada** (docs/PENDIENTES.md, sección 2c): los textos y tiempos de «No
  confirmado» (decisiones 8 y 9), la memoria de 6 horas del sello (1), los días que se conservan al re-guardar (5) y los ids internos
  nuevos (2). **Ninguna está escrita todavía en `docs/ACUERDOS_REDISENO.md`**: se escribe con sus palabras cuando las responda (H34).
- **No atendido:** H23 (las demás puertas no tienen tope de espera; con el servidor colgado el «Cargando…» de un alta o un traslado
  queda tapando la pantalla), el complemento de servidor de H22 (rechazar un reintento rezagado de un aparato que se cayó y volvió), la
  ventana de un clic entre el sondeo y el repintado en que se puede capturar al paciente nuevo (paso 14), los episodios cargados a mano sin
  `PATIENT_ID` (el primer guardado acuña uno y un reintento antes del compromiso acuña otro), y que la traqueostomía (`tqt`) no se puede
  anular desde la pantalla (el servidor responde «Tipo de evento desconocido»; es previo a la tanda).
- **Hueco de las puertas sin estado propio** (entrega de turno, stock, movimiento de ventilador): si el sello falta (expiró a las 6 h o el
  caché falló) **y** además se perdió la respuesta, pueden duplicar una vez. Se acepta y se dijo a Diego (decisión 1).

### La revisión independiente (34 hallazgos, siete pasos de arreglos)

Seis revisiones independientes, dos lentes por área (el candado en las puertas, el servidor de ingreso y recuperación, la pantalla).
Se reprodujo cada hallazgo antes de tocar nada y se cerró con una guardia vista roja primero; en los pasos B a F se probaron además de
8 a 23 mutaciones a mano del arreglo, para comprobar que la guardia nueva muere cuando el arreglo se rompe.

| Paso | Hallazgos | Qué cerró |
|---|---|---|
| A · relojes (9b73bf9) | H20, H28 (los dos que **bloqueaban**) | Dos guardias creían congelar el reloj con `page.clock.install` y ponían la batería roja al azar, sin que el código estuviera mal |
| B · puertas del servidor (c77a46c) | H1 a H7, H12 | Una cama libre ya no «tiene dueño» (conserva su `PATIENT_ID` como rastro); el reclamo resuelve al paciente cuando hay dos en un turno; la medición de otro paciente se rechaza; el reintento de anular un anexo no borra el hito de otro |
| C · ingreso y forma del id (c56eca8) | H9, H14, H18 | Un paciente ya egresado no vuelve a ingresar (ni su segundo alta se pierde en silencio); el id nuevo tiene su forma y no está en dos camas; el ingreso que murió a medias se completa |
| D · sello y sugerencia (905890b) | H10, H15, H13, H17, H8 | El sello ya no guarda texto libre; el aviso de un lote repetido no dice «0»; la sugerencia no se duplica; el hito lleva la firma de la sesión, no la que mande el paquete |
| E · línea de tiempo y días (598a7e4) | H11, H16, H19 | Declarar el evento después apaga la advertencia falsa; los días del re-guardado quedan fijados (la decisión 5 queda para Diego) |
| F · pantalla: INTERNO y reintentos (ea17510) | H21, H29, H22, H30, H24, H32 | Un error INTERNO conserva el número de operación y es ámbar; una sesión vieja no reintenta la foto A tras guardar la B; el borrador sale antes; el stock repetido no se muestra como éxito nuevo; las escrituras sin respuesta avisan |
| G · pantalla: celular y textos (22bab55) | H27, H31, H25, H26, H33, H34(2) | La franja cabe y se toca en el celular; el cuadro no roba el cursor; el aviso dice de qué cama habla; «esta ventana» en vez de «este formulario» |

De los 34: 31 arreglados; H34 arreglado en el texto (su otra mitad es de Diego: confirmar y escribir en ACUERDOS); **H19** se dejó con la
regla puesta y la guardia 20b que la fija, a la espera de la decisión 5; **H23** no se trabajó.

### Cierre de la tanda (paso 17)

- **Sello `NEXT-5.6-guardado-seguro`** en `build/empaquetar_cohete.js` y en los dos sitios del fuente (`<meta name="rce-version">` y el
  texto de «La app no pudo iniciar»). `entrega/`, `pwa/` y `build/paquete_migracion/` regenerados.
- **Batería completa (`-j 2`): 225 verdes, 0 rojas** (436 s). La base de la tanda 0 eran 212; se suman seis guardias de la tanda 2 y las
  que sumó la tanda 1.
- **`node build/medir_guardado.js`** (viajes a hojas por acción): abrir 3, reabrir 3, turno nuevo **13**, re-guardar **17**, ingreso
  **13**, decanulación **13**, reintubación **14**. Los techos (14, 18, 14, 14, 15) no se tocaron y se respetan, con 1 viaje de holgura
  en cada uno. El sello es `CacheService` y no suma viajes a las hojas.
  · 🪤 **Pero el ingreso real de la pantalla mide 15**, no 13: el escenario de la batería no manda `PATIENT_ID` y la pantalla sí
  (lo acuña), y con identidad propia el servidor lee dos columnas más (el archivo y la línea de tiempo del paciente, para saber si ya
  egresó). Medido con una sonda: 13 viajes sin `PATIENT_ID`, **15** con `PATIENT_ID` acuñado (10 lecturas en vez de 8, ~280 celdas
  más). Excede en 1 el techo de 14 de ese escenario, **que ninguna guardia mide**. No se aflojó el techo ni se agregó escenario
  (`guardado_viajes.js` compara contra el árbol congelado). Es el costo de ingresar un paciente, una vez por estadía.
- **Qué pegar** en el editor de Apps Script, desde `entrega/`: `api.gs`, `dominio.gs`, `infra.gs`, `servicios.gs`, `webapp.gs` y el
  `index.html` (el cohete). Comparar con `cmp`, no a ojo: el portapapeles corrompe los acentos en archivos grandes. La lista sale de
  `node build/que_pegar.js aa842ec` (la tanda 1) y es la misma contra 5.4: si la planilla se quedó en 5.4, estos seis archivos
  traen también la tanda 1.
- **¿`crearORepararEstructura()`?** **No hace falta**: `esquema.gs` y `mantenimiento.gs` no cambian desde la tanda 1 (el `OP_ID`, los
  dos `EPISODIO_ABIERTO`, el `PATIENT_ID` acuñado y las advertencias viajan transitorios; `CONTRATO_ESTRICTO` se lee con su valor
  por defecto sin tocar la hoja). Quien venga de antes del rediseño (411 columnas) sí la necesita: ver `PENDIENTES.md`, sección 6.
- **Cómo se publica:** nueva versión de la implementación web de la **planilla de NEXT** (nunca la del hospital) y recargar la app
  instalada para que el sello de versión renueve su caché. El sello `NEXT-5.6-guardado-seguro` debe aparecer en «Cargando…».
- 🔴 **Antes de pegar en la planilla de NEXT: ensayo práctico con DOS aparatos** (decisión 12): dos personas ingresan a la misma cama a
  la vez; alta con un formulario viejo abierto; guardar con el celular en modo avión y volver la señal; doble toque en Guardar; anular un
  evento después de un alta; y el ➕ sobre un paciente ya egresado debe seguir pidiendo la clave de coordinación. **Solo después** se
  enciende `CONTRATO_ESTRICTO`. Todo lo de esta tanda se probó con un servidor simulado en el Chromium de Playwright, no en el Chrome
  de Windows 10 del hospital ni contra el Apps Script real.
- **Cómo revertir:** cada paso es un commit (pasos 1 a 16 desde `dff2df5` hasta `72e16b0`; arreglos desde `9b73bf9` hasta `22bab55`) y el
  cierre es otro; `git revert` deshace lo que se quiera. Ninguna columna cambió, así que no hay datos que migrar de vuelta.

### Para no olvidar (de toda la tanda)

- 🪤 **Un reintento solo es seguro si todo lo que escribe converge**: ids derivados del contenido, «insertar si no existe», el compromiso
  (lo que hace visible el cambio en el censo) AL FINAL, y un estado «ya hecho» que se reconoce por el paciente. El sello es un atajo; la
  convergencia es lo que sobrevive cuando el caché se evapora.
- 🪤 **«El servidor respondió» no es «el servidor no lo hizo».** Solo VALIDACION, CONFLICTO, NO_AUTORIZADO, NO_ENCONTRADO y LOCK_TIMEOUT
  dicen «no se hizo»; INTERNO es ambiguo igual que no tener respuesta.
- 🪤 **Cama libre ≠ cama sin `PATIENT_ID`:** al liberarla conserva el del último paciente (es el rastro). Cualquier puerta nueva que lea
  el dueño de una cama pregunta `OCUPADA` primero.
- 🪤 **Una guardia con un doble de juguete prueba el juguete.** La sugerencia no tomaba el candado y la guardia la sustituía por un doble que
  sí; «la red cayó» simulado con un `Error` pelado seguía verde por un camino de compatibilidad que la red real ya no recorre. El doble
  tiene que ser lo que el embudo de verdad entrega.
- 🪤 **`page.clock.install` no congela el reloj; `pauseAt` sí** (y se instala antes de la hora que se quiere fijar).
- 🪤 **Un mutante que sobrevive es una afirmación que falta.** La prueba de mutación se repite cada vez que se amplía una guardia.
- 🪤 **El techo de viajes se mide en un escenario; la pantalla real puede hacer otro.** El ingreso con identidad propia cuesta 2 viajes más
  que el que mide la batería.
- 🪤 **Mientras `CONTRATO_ESTRICTO` esté apagado, el candado protege solo a quien manda el reclamo.** Una pantalla vieja sin él sigue
  pasando; el service worker cachea el armazón por sello de versión, que es lo que las va retirando.

### El detalle, paso a paso

Las entradas que siguen son las que se fueron escribiendo durante la tanda, sin cambios de contenido (solo bajaron un nivel de título).
Los pasos 1 a 15 no dejaron entrada propia: su detalle es el de las tablas de arriba y el de sus mensajes de commit.

Sello `NEXT-5.6-guardado-seguro`.

### 5-oct-2026 · Guardado seguro (tanda 2), paso 16: dos guardias cambian de convención, con su razón

**De dónde sale.** El diseño de la tanda 2 (G14 a G17) cambia lo que la pantalla le dice a la persona cuando un guardado no
tiene respuesta: antes, dos intentos fallidos eran «NO se guardó»; ahora una red caída o un tiempo agotado es **«No
confirmado»** (ámbar), con reintentos a los 3, 10 y 30 s, porque el primer intento pudo haber aterrizado y solo perderse la
respuesta. El paso 16 pide reconciliar las guardias viejas que asertaban lo de antes, **solo las que cambian de convención
de verdad**, y escribir la razón. Cualquier otra que se hubiera puesto roja se arreglaba en el código; ninguna se puso roja.

**Por qué las dos siguieron verdes sin que nadie las tocara (y por qué eso era el problema).** Al construir la pantalla
(paso 13) se dejó un camino de compatibilidad: un `Error` que **no salió del embudo `api()`** (sin `e.codigo` ni
`e.sinRespuesta`) conserva lo de siempre, un reintento a los 3 s y «NO se guardó». Las dos guardias simulaban «la red cayó»
con ese `Error` pelado, así que seguían viendo el camino viejo. Pero una red caída **de verdad** ya no llega así: el embudo
la entrega con `sinRespuesta` y la pantalla va al ámbar. Las guardias estaban verdes midiendo un camino que la red real ya no
recorre. Rojo visto antes de tocar nada: `fallo_guardado_visible.js` con el fallo tal como lo entrega el embudo y **sin
tocar ninguna de sus afirmaciones** dio 5 fallos: no sale el toast «No se pudo guardar», la franja queda en
`noconfirmado` y no en `error` (a los 3,5 s y también pasados los 3,2 s del toast), no dice «NO se guardó», y a los 3,5 s no
hay borrador local.

| Guardia | Qué cambia | Razón |
|---|---|---|
| `fallo_guardado_visible.js` | Tres escenarios con el reloj falso de Playwright (día inventado, lunes 10-ago-2026 11:00; los 3, 10, 30 y 45 s no se esperan). **A**: sin respuesta → ámbar «No confirmado · Reintentando…» → reintentos a los 3, 10 y 30 s con la **misma foto** del paquete (4 viajes), cuadro «No confirmado», borrador, y pasados los 45 s nada sale solo ni la franja cambia; nunca dice «NO se guardó» ni «Guardado». **B**: el servidor contestó (`VALIDACION`) → «NO se guardó» rojo, **un** viaje, con su «Reintentar». **C**: el `Error` sin bandera, con las afirmaciones **de antes tal cual**: queda atado para que nadie quite el camino de compatibilidad sin querer. | La convención del texto y de los reintentos cambió de verdad: «NO se guardó» afirmaba lo que no se sabía. Las tres comparten lo que no cambió: franja que no se apaga sola, `_formDirty` en true, texto intacto, borrador, y «Reintentar» que manda los **mismos datos** y al salir bien pasa a «✓ Guardado hh:mm». También corre ahora con reloj congelado: antes esperaba segundos de verdad y no fijaba la fecha. |
| `episodio_al_guardar.js` | **Solo** lo que asierta del ingreso con vacío y de la caída de red. Servidor: el reintento del propio ingreso **sin** identidad propia queda rotulado como «pantalla vieja, modo tolerante»; al lado se ata el caso **con** identidad (`PATIENT_ID` acuñado): el reintento propio pasa y es una sola fila; **otro** ingreso sobre esa cama (otro `PATIENT_ID`, mismo `''`) es `CONFLICTO`, cero escrituras, base idéntica, sin nombrar al primero. Pantalla: el ingreso en cama libre manda su `PATIENT_ID` (8 a 64 de `[A-Za-z0-9_-]`), tras guardar bien deja de mandarlo, y sobre una cama ocupada sin ingreso formal no se acuña. El control de red pasa a «dos viajes a los 3,7 s, en ámbar, sin afirmar nada». | El `''` solo era «como hoy» mientras el ingreso no traía identidad: el comentario de la cabecera explicaba que no se podía distinguir el reintento propio de un ingreso ajeno, y desde el paso 15 sí se puede. La guardia ata las dos mitades para que la regla no quede medio documentada. |

**Lo que se miró y NO cambia de convención** (quedan igual, y el porqué):
- `acceso_pantalla.js` («NO se guardó» tras sesión cortada y tras «No se pudo comprobar tu sesión» dos veces),
  `episodio_al_guardar.js` (el rechazo por «cambió de paciente») y `aviso_error_al_centro.js` (llama a
  `_marcaGuardadoError` directo): en los tres **el servidor sí contestó** que no, y eso sigue siendo rojo.
- `panel_ux.js` (la red parpadea una vez y el segundo intento a los 3 s guarda solo): sigue cierto, con
  `withFailureHandler` real. Solo su comentario de cabecera dice «UNA vez» y es anterior a los 10 y 30 s; se deja como estaba
  a propósito (no cambia lo que asierta).
- `grep` de `NO se guardó` y de `falloFinal` en `build/checks/`: ninguna otra guardia asierta el texto viejo para una red caída.

**Las guardias se probaron mutando el código** (cada mutación se deshizo y se comprobó con `cmp`): tratar `sinRespuesta` como
reintentable, dejar solo el reintento de 3 s, no guardar el borrador al agotar el ámbar, que el servidor no distinga el
ingreso ajeno, que la pantalla no acuñe, que siga mandando la identidad tras guardar bien, que acuñe sobre una cama ocupada:
las siete dejan alguna de las dos guardias en rojo.

**Pendiente a propósito (decisión de código del paso 13, no de este paso).** Mientras el ámbar tiene reintentos pendientes
(hasta los 30 s) **no hay borrador local**: se guarda recién cuando se agotan o a los 45 s sin respuesta. Antes se guardaba a
los 3 s. Si el equipo se apaga en esa ventana, lo escrito se pierde. Se dice aquí, y la guardia ata lo diseñado (borrador al
agotar), no lo que falta.

#### Para no olvidar

- 🪤 **Una guardia que simula «la red cayó» con un `Error` pelado puede quedar verde por un camino de compatibilidad** aunque el
  camino real haya cambiado. El doble tiene que ser lo que el embudo de verdad entrega (`sinRespuesta`, `codigo`), no lo que
  a uno se le ocurre que es un error.
- 🪤 **Un control con reintentos programados deja temporizadores vivos** (10 y 30 s) que disparan dentro de las secciones
  siguientes y las contaminan. Al terminar, se da por cancelada la intención (`_sesionGuardado.cancelar()`).
- 🪤 **Reconciliar no es aflojar**: las afirmaciones de antes quedaron (sección C) y se sumaron las nuevas; ninguna aserción
  se borró para tapar un rojo, porque no hubo rojo que tapar.

### 9-oct-2026 · Guardado seguro (tanda 2), revisión adversarial: los relojes de dos guardias no estaban congelados

**De dónde sale.** Seis revisiones independientes de la tanda 2 dejaron 34 hallazgos; dos de ellos (H20 y H28) bloqueaban el cierre
porque ponían la batería roja **al azar, sin que el código estuviera mal**: `guardado_seguro_no_confirmado_g17.js` y
`fallo_guardado_visible.js` llamaban a `page.clock.install({ time })` creyendo que eso congelaba el reloj. No lo congela: el reloj
falso **sigue corriendo con el de pared**, así que cualquier demora real entre dos pasos de la guardia (la batería corre 4 a la vez)
se suma al tiempo falso y el reintento de 3, 10 o 30 s sale antes de lo que la guardia espera. Es la trampa de «congelar el reloj»
que CLAUDE.md ya nombra, ahora en su forma de Playwright.

**Rojo visto antes de tocar el código.** Se le dio a las dos guardias una demora **real** de prueba (`RCE_DEMORA_REAL_MS`: una pausa de
pared antes de cada `runFor`, lo que hace una máquina cargada) y una sección nueva que espera 1,5 s de verdad sin mover el reloj:
- `guardado_seguro_no_confirmado_g17.js` con 1500 ms: 9 fallos, entre ellos los cuatro de la revisión («a los 2,9 s todavía una sola
  llamada», «a los 9,9 s siguen siendo 2», «a los 29,9 s siguen siendo 3», «a los 44,9 s todavía Guardando») y dos más que nadie había
  visto (F11 «el guardado en vuelo de la cama 2 NO impide guardar la 3» y el control de H4).
- `fallo_guardado_visible.js` con 4000 ms: «a los 3 s sale el primer reintento: dos viajes» dio 3. Con 1500 ms esta guardia aguanta
  por casualidad (sus afirmaciones son «al menos»), pero el reloj corría igual: lo prueba la sección 0.
- La sección nueva (0 en una, F00 en la otra) falla **sin** demora artificial: pasados 1,5 s reales el `Date.now()` de la página se
  movió 1505 ms.

**Qué se cambió (solo las dos guardias; ningún archivo del producto).**
- `abrir()` instala el reloj **una hora antes** de T0 y lo detiene con `pauseAt(T0)`: desde ahí solo `runFor` lo mueve y la página
  parte en T0 exacto. Las secciones de G17 y fallo_guardado_visible ya avanzaban con `runFor`; la única que dependía del tiempo real
  era F12 (el quinto envío contesta ok con un `setTimeout(0)` del doble, y con el reloj parado hay que dejarlo contestar con un
  `runFor(20)` antes del cambio de contenido; mientras vuela, `guardar()` devuelve la misma promesa).
- La sección 0 / F00 queda como guardia permanente de la trampa: 1,5 s reales no mueven el reloj, un temporizador de 100 ms no
  dispara solo, `runFor(100)` mueve exactamente 100 ms, y el reloj parte en T0 + 1500 (no una hora antes).
- `RCE_DEMORA_REAL_MS` queda disponible para repetir la prueba de estrés: con 1500 (G17) y 4000 (fallo_guardado_visible) las dos pasan.

#### Para no olvidar

- 🪤 **`page.clock.install` no congela; `pauseAt` sí.** Y después de `pauseAt` un `setTimeout(…, 0)` de la página tampoco dispara solo:
  toda acción que espera al doble de `google.script.run` necesita su `runFor`.
- 🪤 **`pauseAt(T0)` justo después de `install({ time: T0 })` es una carrera**: `pauseAt` solo viaja hacia adelante («Cannot fast-forward
  to the past») y entre las dos llamadas el reloj ya avanzó con el de pared. Sin carga pasa; con la máquina ocupada revienta. Se
  instaló en T0 y se pausó en T0 la primera vez, y una corrida con 6 bucles de CPU lo tumbó. Se instala antes (aquí, una hora).
- 🪤 **Una guardia de reloj se prueba con una demora real inyectada**, no esperando a que la batería salga roja sola: es la única forma
  de verla roja a pedido y de saber que el arreglo aguanta.
- Quedan fuera de esto, a propósito, las secciones A a E y G de G17: no usan `page.clock`, doblan `Date` a mano (`window.__t`) y
  esperan con `waitForTimeout` reales de 40 a 700 ms a que conteste el doble. G17 entera aguantó tres corridas con la máquina
  cargada (hasta 10 de carga en 4 núcleos, dos guardias más corriendo a la vez); si alguna vez una de esas secciones se pone roja
  sola, el camino es esperar una condición con `waitForFunction` y no alargar el tiempo.

### 9-oct-2026 · Guardado seguro (tanda 2), revisión adversarial: las puertas del servidor y una cama libre que conserva su PATIENT_ID

**De dónde sale.** Paso «B puertas servidor» de la revisión de la tanda 2. Siete hallazgos del servidor, todos reproducidos con un
guion antes de tocar nada, y uno de la guardia misma (H4): `guardado_seguro_episodio_g14.js` daba verde con mutantes del código que
debían ponerla roja.

**Los defectos, en palabras.**
- **H1 · anular una evolución desde una cama libre.** `ANULAR_EVENTO` sobre una cama libre, con el `patientId` de un paciente que
  está vivo en OTRA cama, localizaba la evolución de ese paciente y le copiaba su estado a la cama libre (la «ocupaba» de nuevo con
  la vía aérea de otro). Ahora se rechaza con VALIDACION y no se escribe nada.
- **H3/H7 · «ambigua» aunque la pantalla ya había dicho de quién se habla.** Cuando dos pacientes pasaron por la misma cama en el
  mismo turno, anular sin `patientId` contestaba «la cama tuvo dos pacientes». La pantalla manda el reclamo (`EPISODIO_ABIERTO`),
  que es exactamente esa respuesta: ahora el localizador usa el reclamo cuando no viene `patientId`. Si viene `patientId`, manda ése.
  Una fila antigua sin `PATIENT_ID` sigue encontrándose por la clave del turno.
- **H5 · la cama libre «tiene dueño».** Una cama que quedó libre conserva su `PATIENT_ID` viejo (es a propósito: es el rastro). Pero
  `anularEvento`, `anexarEventoRapido` y `anularAnexo` lo leían como si fuera su ocupante, y con eso decidían «es de otro paciente»
  o pedían la clave de coordinación sobre una cama vacía. Ahora toman el dueño igual que `_pidDeCama`: **cama libre = sin dueño**.
  (La expresión va escrita en línea y no llamando a `_pidDeCama` porque los bancos de pruebas viejos cargan estos archivos con una
  lista fija que no incluye `svc_camas.gs`.)
- **H2/H6 · `evalRegistrar` no comparaba al paciente que el payload declara.** Un `patientId` de otro paciente, o un `anulaId` que
  es la medición de otro paciente, pasaba mientras el reclamo fuera el de la cama: la medición de P quedaba anulada desde la cama
  de R. Decisión tomada: **se rechaza con VALIDACION** (lo más conservador; no se «corrige» en silencio). Un `anulaId` que no
  existe no estorba: sigue su camino de antes.
- **H12 · el reintento de `anularAnexo` borraba el hito de OTRO anexo.** Con dos anexos iguales (mismo nombre) y el servidor
  muriendo a mitad de la anulación del segundo, el reintento (mismo `OP_ID`) veía «ya no queda fila para este anexo» y borraba el
  hito que quedaba, que era el del primero: una fila de procedimiento sin hito. Ahora, con `OP_ID`, el hito solo se borra si hay al
  menos tantos hitos del nombre como anexos vivos del nombre; si no, se entiende que el hito de ese anexo ya se había ido.

**Rojo visto antes de tocar el código.**
- G14 extendida (secciones B8, D6, E1b): **77 fallos** contra el código sin arreglar, entre ellos «la medición de P NO se anuló y R no
  ganó ninguna: true/1».
- G16 sección 25b: roja con la muerte tras el corte N=1, 2 y 3 («quedó a medias: 1 en la evolución, 1 fila y 0 hitos»), y también al
  anular el primero de los dos anexos.
- H4, con la herramienta de mutación (copia del árbol fuera del repo, una mutación a la vez): sobrevivían a la guardia de antes 11 de
  los 12 mutantes (intercambio con «ya hecho» mirando solo a B; mover con «ya hecho» sin exigir origen libre; anexar, anular anexo,
  medir, alta, limpiar, intercambiar y mover leyendo el `PATIENT_ID` de una cama libre; el 12.º, «ya hecho» mirando solo a A, ya
  moría). Con la guardia extendida mueren los 23 mutantes de la lista, contando los de H1/H2/H3/H5/H6/H7/H12.

**Qué se cambió.**
- `v2/svc_evoluciones.gs` (`anularEvento`): dueño de cama con `OCUPADA`; localizador por reclamo (con respaldo por clave para filas
  sin `PATIENT_ID`); rechazo de H1.
- `v2/svc_eventos.gs` (`anexarEventoRapido`, `anularAnexo`): dueño de cama con `OCUPADA`; la cuenta de anexos contra hitos de H12.
- `v2/svc_evaluaciones.gs` (`evalRegistrar`): compara con el reclamo el `patientId` declarado y el paciente de la medición que se anula.
- `build/checks/guardado_seguro_episodio_g14.js`: B8, C6, D6, E1b nuevas (alta, limpiar, intercambiar y mover sobre camas libres con
  `PATIENT_ID` viejo; los dos «ya hecho»; anexar y anular anexo; las dos puertas de `evalRegistrar`).
- `build/checks/guardado_seguro_operacion_g16.js`: sección 25b (dos anexos iguales con `OP_ID`, matriz de muerte, y un procedimiento del
  guardado con el mismo nombre insertado directo para que la cuenta no mezcle tipos).
- `build/paquete_migracion/servicios.gs`: lo regenera la guardia `paquete.js`. `entrega/` queda para el cierre.

#### Para no olvidar

- 🪤 **Cama libre ≠ cama sin `PATIENT_ID`.** Al liberar una cama el `PATIENT_ID` se queda (es el rastro del último paciente). Cualquier
  puerta nueva que lea el dueño de una cama tiene que preguntar `OCUPADA` primero; la regla vive en `_pidDeCama` y G14 tiene ahora
  un caso por puerta con una cama libre que conserva el id.
- 🪤 **Un mutante que sobrevive es una afirmación que falta.** Los 11 de H4 estaban «cubiertos» por una guardia verde. M19 sobrevivió
  incluso a la sección 25b hasta que se agregó el control de «mismo nombre, otro tipo»: la prueba de mutación se repite cada vez que
  se amplía una guardia.
- 🪤 **Los guiones de reproducción corren sobre una copia.** Uno de los guiones del scratchpad apuntaba a una copia vieja del árbol y
  siguió mostrando «ambigua» después del arreglo; se rehízo apuntando al repositorio y contesta `ok`. Antes de dudar del arreglo,
  mirar contra qué árbol corre el guion.

### 9-oct-2026 · Guardado seguro (tanda 2), revisión adversarial: el ingreso de un paciente que ya egresó, la forma del PATIENT_ID y el ingreso que murió a medias

**De dónde sale.** Paso «C ingreso y forma del pid» de la revisión de la tanda 2: H9, H14 y H18. Los tres reproducidos con guardias
antes de tocar el código (rojo visto en G15 y G16) y los tres cerrados con una guardia que ahora los ata.

**Los defectos, en palabras.**
- **H9 · un ingreso reenviado «resucitaba» a un paciente ya dado de alta.** Sin el sello de la operación (OP_ID nuevo, caché
  evaporado) el ingreso con el `PATIENT_ID` de alguien ya egresado se aceptaba de nuevo: la cama volvía a ocuparse con ese pid, y el
  segundo alta contestaba «ok» **sin escribir su egreso**, porque `ARCH_<pid>` ya existía y el insert se saltaba. Se perdían en
  silencio el segundo egreso, su motivo y el conteo del REM. El camino real es el borrador de la pantalla (`pidIngreso`) restaurado
  sobre la cama libre después de un alta.
  · **Arreglo en dos puntos.** (1) Las dos puertas que ingresan (`_candadoDeIngreso`, del guardado de la evolución, e
  `ingresarPaciente`) leen si el pid propio YA tiene su egreso (`_episodioYaEgresado`: una fila en ARCHIVO_PACIENTES o un hito de
  egreso; el archivo primero) y la regla pura `decidirEpisodioPuerta('INGRESO')` contesta CONFLICTO con `archivado: true`, esté la
  cama libre u ocupada por ese pid (un alta a medias). Solo se lee con identidad propia: sin PATIENT_ID no hay pid que juzgar.
  (2) `darAltaPaciente`: si ya existe la fila `ARCH_<pid>` pero cuenta OTRA estadía que la de la cama ahora (`_esLaMismaEstadia`:
  momento real del ingreso, fecha de ingreso y código del paciente), rechaza con CONFLICTO antes de escribir nada. El reintento del
  alta del MISMO episodio sigue convergiendo (la matriz de muerte de G16 lo ata, y un caso nuevo cambia el NOMBRE entre la muerte y el
  reintento para que nadie vuelva a comparar el nombre).
- **H14 · `GUARDAR_EVOLUCION` no miraba la forma del PATIENT_ID.** Solo `validarPayloadIngreso` la exigía, y la pantalla ingresa por
  `GUARDAR_EVOLUCION`: un valor como `X Y/../<b>` quedaba de identidad de la cama y de parte de `ARCH_<pid>`; tampoco se miraba que
  el mismo pid no estuviera ya en otra cama. Arreglo: `_candadoDePidNuevo`, DENTRO del lock y antes de cualquier escritura, exige la
  forma (`_errPatientIdAcunado`, la misma función que usa `validarPayloadIngreso`) y rechaza con VALIDACION un pid que ya ocupa
  OTRA cama ocupada (una cama libre que conserva su pid no cuenta). **Solo a un pid NUEVO**, distinto del de la cama: las camas ya
  ocupadas con pids antiguos (sin la forma acuñada) siguen guardando evoluciones normales (G3 de G15 lo ata). Misma regla de «otra
  cama» en `ingresarPaciente`, para que las dos puertas que ingresan no diverjan.
- **H18 · el reintento de un ingreso que murió a medias contestaba «ya estaba» y dejaba la cama sin hito.** El ingreso son tres
  escrituras (la cama, el hito de ingreso, la tarjeta `TIMELINE_JSON`); si moría tras la primera o la segunda, el reintento
  entraba por la rama `yaHecho` y no completaba nada. Arreglo: `_ingresoCompletarSiFalta` busca el hito de ingreso del paciente (por
  paciente y tipo, así sirve con o sin OP_ID); si no está lo escribe con su tarjeta, si está pero la tarjeta no lo muestra
  sincroniza la tarjeta, y con el ingreso entero **solo lee** (cero escrituras, como pedía C3 de G15).

**Rojo visto antes de arreglar.** G15: 58 fallos contra el árbol sin arreglar (los de H9 por las dos puertas, el egreso por el hito sin
fila de archivo, el alta a medias; los de H14 con ocho formas malas del pid y el pid en dos camas; y las comprobaciones de forma). G16:
28 fallos (el segundo alta «ok» sin escribir, en cuatro variantes de «otra estadía»; y la matriz de INGRESAR_PACIENTE con PATIENT_ID acuñado en rojo en los cortes N=1
«no hay UN hito de ingreso (hay 0)» y N=2 «la tarjeta de la cama no muestra el hito de ingreso (TIMELINE_JSON)», con y sin OP_ID).

**Mutación.** 21 mutantes del arreglo (ignorar `archivado` en cada puerta, no mirar el archivo o el hito, no completar el hito o la
tarjeta, re-sincronizar de más, tomar siempre/nunca la fila por la misma estadía, ignorar cada una de las tres señales, comparar
también el nombre, no exigir la forma, exigirla al pid de la cama, no mirar otra cama, contar una cama libre): mueren todos. M12
(ignorar `TS_INGRESO`) sobrevivía a la primera versión de la guardia: el caso realista, el mismo ingreso reenviado, solo cambia el
momento real; ahora hay un caso por señal.

**Qué se cambió.**
- `v2/dominio_validacion.gs`: `_errPatientIdAcunado` (la forma, en un solo lugar), `_msgPidEnOtraCama`, y `archivado` en la regla
  `INGRESO` de `decidirEpisodioPuerta`.
- `v2/svc_timeline.gs`: `_episodioYaEgresado`, `_pidEnOtraCamaOcupada`, `_tarjetaMuestraHito` (lo usan las dos puertas que ingresan,
  y las dos cargan este archivo).
- `v2/svc_evoluciones.gs`: `_candadoDePidNuevo`, y `_candadoDeIngreso` lee `archivado` solo con identidad propia.
- `v2/svc_camas.gs`: `_hitoDeIngreso`, `_ingresoCompletarSiFalta`, `_esLaMismaEstadia`; `ingresarPaciente` y `darAltaPaciente`.
  `_egresoDeLaCama` devuelve además la fila que ya estaba.
- `build/checks/guardado_seguro_ingreso_g15.js`: secciones F (H9) y G (H14) y los casos `archivado` de la tabla de verdad.
- `build/checks/guardado_seguro_operacion_g16.js`: sección 19b (matriz de INGRESAR_PACIENTE) y el alta de un pid ya archivado.
- `build/paquete_migracion/{dominio,servicios}.gs`: los regenera la guardia `paquete.js`. `entrega/` y la VERSION quedan para el cierre.

#### Para no olvidar

- 🪤 **El mensaje del CONFLICTO de ingreso se reutiliza a propósito para el pid ya egresado** («la cama ya fue ocupada por otro paciente
  mientras llenabas este ingreso»): la franja roja de la pantalla está fija para todo CONFLICTO y un texto distinto en el cuadro la
  contradiría. No es exacto en este caso (quizá la cama está libre), pero la acción es la misma: cerrar y mirar la cama. Si Diego
  quiere un texto propio, se cambia en el servidor y en `_marcaGuardadoError` de la pantalla.
- 🪤 **La forma del pid se exige DENTRO del lock y no antes**: para saber qué es «nuevo» hace falta la cama, y una cama ya ocupada con
  un pid antiguo no puede quedar sin guardar evoluciones. Sigue yendo antes de la primera escritura.
- 🪤 **Un ingreso con PATIENT_ID acuñado cuesta 2 lecturas de columna más** (el archivo y la línea de tiempo del pid; más la de
  camas cuando el pid es nuevo). En `medir_guardado` el ingreso con pid acuñado pasa de 13 a 15 viajes; el escenario que mide la
  batería no manda PATIENT_ID y sigue en 13.
- 🪤 **El hueco del modo tolerante sigue**: con `EPISODIO_ABIERTO` ausente (pantalla vieja) la regla del egresado NO corre, como todo el
  candado de ingreso. Lo cierra `CONTRATO_ESTRICTO`.
- 🪤 **Contar «escrituras» con un OP_ID incluye el sello del caché**: un reintento que no escribe a las hojas igual cuenta 1 en
  `sim_muerte` (el `CacheService.put`). Los casos de «cero escrituras» sin sello usan un payload sin OP_ID.

### 9-oct-2026 · Guardado seguro (tanda 2), revisión adversarial: el sello sin texto libre, la sugerencia que no se duplica y el hito con la firma de la sesión

**De dónde sale.** Paso «D sello y sugerencia» de la revisión de la tanda 2: H10, H15, H13, H17 y H8. Los cinco reproducidos con la guardia
antes de tocar el código (34 rojos en `guardado_seguro_operacion_g16.js`) y los cinco cerrados con la misma guardia en verde.

**Los defectos, en palabras.**
- **H10 y H15 · el sello guardaba texto clínico libre en el caché.** El sello de operación (la memoria de seis horas que dice «esto ya lo
  hice») conservaba la `accion` de la respuesta, cortada a 80 caracteres. En el ➕ esa acción ES lo que escribió la kinesióloga
  (`evento rápido: <la nota, el hallazgo del cultivo, el detalle del procedimiento>`) y, al borrar un anexo, el nombre del anexo. Seis horas de
  texto clínico en la memoria temporal del script, y la guardia de privacidad (sección 11) solo miraba el ingreso y el guardado de la evolución,
  con un servicio de juguete: nunca llamó a esas dos puertas de verdad.
  · **Arreglo.** `accion` y `entidad` salen de `_SELLO_CLAVES`: no se guardan ni acotadas. No hacen falta: la bitácora ya las anotó en la
  primera respuesta (la repetida no vuelve a auditar) y **ninguna línea de `index.html` lee `.accion` ni `.entidad`** de una respuesta (la
  guardia lo cuenta: 0). La repetida de ANEXAR_EVENTO y ANULAR_ANEXO sigue trayendo lo que la pantalla usa: `repetida`, la cama, el paciente y la
  evolución. La regla escrita en el código: una clave nueva en esa lista tiene que ser un ID, jamás un texto que alguien escribió.
  · **La guardia.** La sección 11b llama a ANEXAR_EVENTO (nota libre, cultivo, procedimiento con detalle) y a ANULAR_ANEXO con un texto
  CENTINELA ficticio en cada campo libre y exige que no esté en ninguna clave ni valor puestos en el caché (ni lo que el caché devuelve de
  verdad), ni siquiera las palabras clínicas sueltas. Se probó roja: la nota libre y el nombre del anexo estaban en el caché.
- **H13 · una respuesta repetida decía «0 ventiladores movidos».** La repetida del lote perdía `total` y la pantalla arma su aviso con
  `(r&&r.total)||0`: tras un corte de red —el caso para el que existe el sello— decía «0» de un lote que sí se aplicó. **Arreglo en dos
  puntos:** (1) `total` se sella, pero **solo en MOVER_VENTILADORES_LOTE** (`_SELLO_NUMEROS`, por acción): en EVAL_REGISTRAR `total` es el
  puntaje de una escala del paciente, un dato clínico, y no va al caché; (2) la pantalla guarda cuántos mandó (`enviados`) y lo usa de respaldo
  si la respuesta no trae el total (el lote es todo o nada: si contesta ok se aplicaron todos), así que nunca más dice «0». `resumen`
  (mover uno) ya caía a «Ventilador movido»; `fotoUrl` (registrar una falla) ahora cae a «la foto viajó en este mismo paquete»: si esta llamada la
  mandó y la respuesta es la repetida, la falla quedó con foto. **No se dejó de sellar esas acciones:** sin sello, un reintento duplicaba la
  falla (y la foto en Drive) o el movimiento en el libro del equipo.
- **H17 · GUARDAR_SUGERENCIA se duplicaba con el mismo OP_ID.** No tomaba el candado (así que no pasaba por el sello) y su id era
  `'SUG_' + Date.now()`: el reintento tras un corte de red insertaba una segunda fila. La guardia no lo veía porque sustituía
  `guardarSugerencia` por un doble que SÍ tomaba el candado. **Arreglo:** `conLock`, id `uid('SUG', firma|texto)` derivado del OP_ID y del
  contenido, e insertar solo si la fila no está (con operación en curso; sin OP_ID, como siempre). El mismo OP_ID con el texto editado deja
  la sugerencia editada, igual que las demás puertas. Y la guardia **ya no sustituye** esa función: los anfitriones del juguete pasaron a
  PLANTILLA_GUARDAR y PLANTILLA_RETIRAR, y la sección 29 prueba la de verdad (una toma del candado real, una fila con el mismo OP_ID, una fila
  con el sello evaporado, dos con OP_ID distinto).
- **H8 · AGREGAR_HITO dejaba elegir el autor y el id.** Armaba `Object.assign({autor: ctx.firma, autorEmail: ctx.email}, datos)`: lo que traía
  el paquete iba después y pisaba la firma (un hito «de» otra persona), y desde el paso 9 `hito.id` es el `ID_HITO`, así que dos hitos con el
  mismo `id` dejaban la línea de tiempo con una clave repetida. **Arreglo:** `_hitoDeLaPuerta(datos, ctx)` (api.gs) pone la identidad de la
  sesión ENCIMA de lo que mande la pantalla y quita `id` e `ID_HITO`. `patientId` se respeta (es el episodio que el candado compara). Con OP_ID
  el id ya salía derivado; el hueco era SIN OP_ID.

**Rojo visto antes de arreglar.** 34 fallos en `guardado_seguro_operacion_g16.js`: el texto centinela en 8 sitios del caché, `total` ausente
en la repetida del lote, «✅ 0 ventiladores movidos» ejecutando la función de verdad de la pantalla, la sugerencia con 0 tomas del candado y 2
filas con el mismo OP_ID, el autor «Otra Persona» en TIMELINE y dos hitos con el mismo `ID_HITO`. Verde después.

**Mutación.** 12 mutantes (poner `accion` de vuelta, `total` global o ausente, sugerencia sin candado / con clave vacía / que siempre inserta,
el paquete pisando la firma, dejar pasar `id` o `ID_HITO`, el respaldo `||0` del lote, quitar la foto de la repetida): mueren los 12.

**Qué se cambió.**
- `v2/infra_lock.gs`: `_SELLO_CLAVES` sin `accion` ni `entidad`, `_SELLO_NUMEROS` (por acción) y `_selloDepurar(d, accion)`.
- `v2/svc_turnos.gs`: `guardarSugerencia` con candado, id derivado e insertar-si-falta.
- `v2/api.gs`: `_hitoDeLaPuerta` y la puerta AGREGAR_HITO.
- `v2/index.html`: el aviso del lote (`enviados`) y el «con foto» de la falla repetida.
- `build/checks/guardado_seguro_operacion_g16.js`: secciones 11 (actualizada: ya no hay `accion`/`entidad` en el sello), 11b y 29; los
  anfitriones del juguete.
- `build/checks/ayuda.js`: el arnés le presta `conLock` y `uid` al servicio de sugerencias (lo evalúa solo). Las aserciones no cambiaron.
- `build/paquete_migracion/*`: los regenera la guardia `paquete.js`. `entrega/`, `pwa/` y la VERSION quedan para el cierre
  (`paridad_entrega` y `pwa_paquete` están rojas hasta regenerarlos).

#### Para no olvidar

- 🪤 **La respuesta repetida ya no trae `accion` ni `entidad`.** Quien en el futuro las lea de una respuesta en la pantalla se encontrará
  con `undefined` solo en el reintento: la guardia cuenta hoy 0 lecturas y se pondrá roja si aparece una.
- 🪤 **`total` es un nombre peligroso en el sello:** el mismo nombre es un conteo en el lote y un puntaje clínico en las escalas. Por eso es
  una tabla POR ACCIÓN. Agregar una acción ahí es una decisión de privacidad, no de comodidad.
- 🪤 **El anfitrión de un servicio de juguete no puede ser una acción cuyo servicio real se quiere probar.** Eso escondió el hueco de
  GUARDAR_SUGERENCIA. Si otra acción pasa a sellarse de verdad, se prueba con su función de verdad.
- 🪤 **El id de una sugerencia cambió de forma** (`SUG_op_…_<huella>` con OP_ID, `SUG_<ms>_<azar>` sin él, antes `SUG_<ms>`). Nadie lo parsea:
  la pantalla solo lo devuelve en SET_SUGERENCIA_ESTADO, y es seguro para un atributo HTML.
- 🪤 **La sugerencia con el sello evaporado se reconoce por la fila** (mismo id derivado), no por el caché: cuesta una lectura de la
  columna de ids, y solo cuando hay OP_ID.

### 9-oct-2026 · Guardado seguro (tanda 2), revisión adversarial: el evento declarado después apaga la advertencia y los días del re-guardado quedan fijados

**De dónde sale.** Paso «E timeline y DIAS» de la revisión de la tanda 2: H11 y H16 (el mismo defecto visto por dos revisores) y H19.
Los tres reproducidos antes de tocar nada.

**Los defectos, en palabras.**
- **H11 y H16 · la advertencia falsa «cambió la vía aérea sin evento declarado» se quedaba junto al evento.** La tanda 2 hizo que ese hito
  (`transicion_sin_evento`) sobreviviera a un reintento o a un re-guardado del turno, y lo hizo sin mirar si el guardado nuevo YA declara el
  evento que explica el cambio. El caso real: la kinesióloga guarda el turno con la vía cambiada y su razón escrita (la salida que cuesta
  una razón), se da cuenta, reabre el turno y declara la extubación. La pantalla ya no manda razón (la cama dice la vía nueva), y en la
  línea de tiempo y en la entrega de turno convivían «extubación» y «sin evento declarado»: la alerta que ese registro debía apagar.
  Antes de la tanda 2 el re-guardado barría el hito.
  · **Arreglo.** `guardarEvolucion` le pasa `conservar` al barrido de hitos solo si el turno NO declara ninguno de los cinco eventos de vía
  aérea (`EXT_OCURRIO`, `INTUB_OCURRIO`, `EXT_REINTUB`, `TQT_OCURRIO`, `DECAN_OCURRIO`: los mismos con que `validarTransicionVA` da por
  explicado un cambio de vía). Con evento, el barrido corre como en aa842ec. Lo que la regla se creó para hacer sigue igual: el reintento
  tras morir, el re-guardado idéntico y el que no trae la razón (la pantalla no la manda al reabrir) conservan el hito.
  · **La guardia (21b).** Una vez por cada uno de los cinco eventos, con la misma razón y con otra en el payload (los dos caminos del barrido:
  «conservar» y «rehacer»), lo que la regla SIGUE conservando (idéntico, sin razón, un cultivo o una nota que no son eventos de vía aérea, un
  evento de otro turno), una matriz de muerte de dos pasos (transición sin evento y luego el evento, muerta tras cada escritura) y la forma
  (la lista de eventos del servicio es la del dominio). Rojo visto antes de arreglar: 21 fallos; verde después; 8 mutantes mueren.
- **H19 · la regla que conserva los días (`DIAS_VM`, `DIAS_VNI`, `DIAS_VA`) al volver a guardar el mismo turno cambia el valor frente a
  antes de la tanda 2 y no está en `ACUERDOS_REDISENO.md`.** Se averiguó por qué existe: el sello NO la puede reemplazar. El sello se
  escribe solo cuando el guardado terminó limpio; una corrida que murió después de escribir la cama no deja sello, y el reintento (o el
  guardado sin OP_ID, o el que llega con otra OP_ID) calcula de nuevo leyendo la cama YA ingresada como si fuera la de antes del turno.
  Quitar la regla pone en rojo 67 comprobaciones de las matrices de muerte (el ingreso con y sin OP_ID, el ingreso con vía aérea de afuera y
  la transición): se quedó. No se puede acotar más por el estado (desde fuera un reintento y un re-guardado legítimo son idénticos), y ya
  pide cama al día con el turno, mismo paciente, mismo soporte y misma vía inicial y final.
  · **Lo que mide la guardia 20b, contra el cálculo de antes.** Transición VM→VNI y TOT→Natural: primer guardado 3, 0 y 3 días (VM, VNI, VA).
  Con el cálculo de antes, al volver a guardar daba 1, 0 y 1, y el turno siguiente partía de ese 1: el error se arrastraba al resto del
  episodio y el REM cuenta el último valor. Con la regla se queda en 3, 0 y 3 y el turno siguiente da 3, 1 y 3. Un turno corriente no se
  mueve en ninguno de los dos casos. **Contra-efecto, a la vista:** el turno de INGRESO de un paciente con vía aérea de afuera cuenta 0 días
  de vía aérea en el primer guardado (la cama aún no existe al calcular) y la regla conserva ese 0; con el cálculo de antes el segundo
  guardado lo «corregía» a los días de afuera por accidente (5 en el caso de prueba). El turno siguiente lo calcula bien en los dos casos.
  · **Decisión para Diego (la 5 del diseño, sin responder).** No se escribe en `ACUERDOS_REDISENO.md` hasta que él la responda con sus
  palabras. La guardia 20b es la que se da vuelta a propósito si decide otra cosa.
  · **Código.** Solo comentario en `v2/svc_evoluciones.gs`: la razón por la que no se reemplaza por el sello, el ejemplo con números y los
  tres cambios frente a antes. Ninguna línea de cálculo se tocó.

**Qué se cambió.**
- `v2/svc_evoluciones.gs`: `_declaraEventoVA` y la llamada a `_timelineDelGuardado`; el comentario de la regla de los días (H19).
- `build/checks/guardado_seguro_operacion_g16.js`: secciones 20b y 21b nuevas y la forma de la 23.
- `build/paquete_migracion/servicios.gs`: lo regenera la guardia `paquete.js`. `entrega/`, `pwa/` y la VERSION quedan para el cierre
  (`paridad_entrega` y `pwa_paquete` están rojas hasta regenerarlos).

#### Para no olvidar

- 🪤 **Conservar el hito de transición y declarar el evento son dos cosas que se pisan.** Cualquier regla nueva que haga sobrevivir un hito
  automático a un re-guardado tiene que preguntarse si el payload nuevo ya trae lo que lo apaga.
- 🪤 **Quitar la regla de los días no es «volver a como estaba»:** el cálculo de antes bajaba los días al volver a guardar una transición y
  la tanda 2 vive de que un reintento dé lo mismo que la corrida limpia. Si algún día se quita, caen las matrices de muerte de la sección 19.

### 9-oct-2026 · Guardado seguro (tanda 2), revisión adversarial: el error INTERNO ya no duplica ni dice «NO se guardó», y la pantalla no afirma lo que no sabe

**De dónde sale.** Paso «F pantalla: INTERNO y reintentos» de la revisión de la tanda 2: H21, H29, H22, H30, H24 y H32, todos en
`v2/index.html`. Los seis reproducidos antes de tocar nada (la sección I de `guardado_seguro_no_confirmado_g17.js` nació con 34 fallos
rojos contra la pantalla del paso 15).

**Los defectos, en palabras.**
- **H21 y H29 · el error INTERNO se leía como «el servidor dijo que no».** INTERNO es una excepción del servidor, y llega DESPUÉS de las
  escrituras que alcanzó a hacer (la fila del turno, un hito) y antes de sellar. Pero la pantalla (a) soltaba el OP_ID, así que el
  reintento salía con uno nuevo y ni el sello ni los ids derivados (`PROC_<op>`, `HITO_<op>_<huella>`, `EVAL_<op>`) reconocían lo escrito a
  medias: se duplicaba; (b) con dos INTERNO seguidos terminaba en rojo «NO se guardó» aunque el turno ya estuviera escrito; (c) el aviso
  decía «Sin respuesta del servidor» cuando sí había respondido; y (d) la kinesióloga leía el texto crudo de la excepción, con el id de la
  planilla.
  · **Arreglo.** `api()` conserva el OP_ID también con INTERNO (`_opSeConserva`: sin respuesta, LOCK_TIMEOUT e INTERNO; el resto son rechazos
  definitivos y se sueltan). `_guardadoClase` lo clasifica como «ambiguo»: ÁMBAR «No confirmado», reintento con el mismo OP_ID, y nunca rojo.
  El aviso dice «El servidor tuvo un tropiezo — reintentando…» (el de «Sin respuesta» queda solo para cuando de verdad no contestó), y el
  detalle técnico va a la consola (`console.warn`), no a la pantalla. «No se pudo comprobar tu sesión» (también INTERNO) sigue siendo
  «reintentable»: la identidad se mira antes de ejecutar, ahí sí se sabe que no se hizo.
- **H22 · una sesión de guardado vieja seguía reintentando la foto A tras cerrar y reabrir el panel.** `_guardadoIniciar` solo relevaba a la
  sesión del MISMO `_panelSeq`, y cerrar y reabrir lo cambia. La persona guardaba la foto B y a los 3, 10 y 30 s llegaba la A con su OP_ID viejo;
  el servidor no tiene orden de versión y la última en llegar gana: se perdía lo último que escribió, sin aviso. Ahora cada sesión nueva
  releva a las vivas de su misma cama y turno (`_guardadosVivos`, por `clave`); las de OTRA cama siguen su curso (control I3b).
  · El «guardado exitoso cancela a las anteriores» que pedía el hallazgo no se programó: el único camino que manda GUARDAR_EVOLUCION es
  `_guardadoIniciar`, y quien termina bien ya relevó a las anteriores al nacer.
- **H30 · el borrador se guardaba tarde.** Con el ámbar con reintentos pendientes no había borrador hasta los 30 s (o los 45 s si el servidor
  no contestaba nada): si el sistema mataba la pestaña en ese rato (en el celular, al cambiar de aplicación; `beforeunload` no corre), se
  perdía la evolución entera. Ahora el borrador sale ANTES de la llamada y se reescribe en el primer ámbar con lo último que se escribió; se
  borra solo al confirmarse. 🪤 Al escribirlo antes apareció un choque que el rojo de `H4` cazó: la llave del borrador es cama y turno, y el
  borrador de un ingreso rechazado por CONFLICTO (trabajo de otra persona, G15) vive bajo la misma llave que la evolución del ocupante nuevo.
  El borrador de antes de la llamada NO pisa el de otro paciente (`_borradorGuardar(true)`, por `ep`); el del ámbar y el del rechazo escriben
  siempre, como antes.
- **H24 · un movimiento de stock idéntico a uno sin respuesta se mostraba como éxito nuevo.** El OP_ID de un envío sin respuesta vive 6 h y
  una acción idéntica reutiliza el mismo; el servidor contesta «repetida» sin sumar y la pantalla decía «✅ actualizado». **Lo mínimo
  seguro:** NO se acortó la vida del OP_ID (son justo esas horas las que reconocen el reintento tardío de un movimiento que SÍ aterrizó; con
  15 min ese reintento duplicaría el stock). Lo que cambió es lo que se le dice: una respuesta repetida a AJUSTAR_STOCK o ASIGNAR_STOCK (el
  diálogo, la cama y el arrastre del tablero) dice «Ya estaba registrado: ese mismo movimiento ya se había hecho antes y no se repitió.
  Revisa el stock.» y no «✅ …».
- **H32 · las escrituras de `gs()` no usaban el contrato nuevo.** Ante falta de respuesta decían «❌ <texto crudo>» o, por la app instalada
  («offline», que `gs()` callaba), NADA: el botón volvía a su rótulo y la persona no sabía si el egreso había quedado hecho. Ahora una
  escritura de la lista `_ACC_ESCRITURA` que falla sin respuesta o con INTERNO avisa en ÁMBAR (toast nuevo `toast-ambar`, tema claro):
  «No sabemos si se hizo. Revisa la cama; si no está hecho, vuelve a intentarlo: es seguro repetirlo.» (el embudo conserva el OP_ID, así que
  repetir con el mismo contenido es lo que dice). Las lecturas sin conexión siguen calladas (el sondeo vive reintentando). `fail` recibe
  ahora un segundo argumento, el `Error`, y las puertas con aviso propio (el ➕, la entrega de turno, el stock, el ventilador desde
  prevención, la falla de un equipo) no repiten un «❌» en rojo encima del ámbar.

**Qué se cambió.**
- `v2/index.html`: `api()`/`_opSeConserva`, `_guardadoClase`, `_guardadoIniciar` (`_guardadosVivos`, `avisarReintento`, borrador), `_borradorGuardar`,
  `gs()`/`_escrituraDudosa`, `toast()` con tono ámbar, `_stkRepetida` y los cinco avisos de fallo propios.
- `build/checks/guardado_seguro_no_confirmado_g17.js`: sección I (I1 a I6, con controles I3b y I4b); `abrirG` acepta el camino (gas o http).
  Ocho mutantes (soltar el OP_ID con INTERNO, INTERNO como reintentable, no relevar por cama y turno, el borrador de antes de la llamada,
  el de reescribir en el ámbar, no pisar el ajeno, la repetida disfrazada, gs() sin INTERNO) mueren.
- `build/paquete_migracion/index.html`: lo regenera la guardia `paquete.js`. `entrega/`, `pwa/` y la VERSION quedan para el cierre.

#### Para no olvidar

- 🪤 **«El servidor respondió» no es «el servidor no lo hizo».** Un código de error no dice si hubo escrituras antes: INTERNO es ambiguo igual
  que la falta de respuesta. Solo VALIDACION, CONFLICTO, NO_AUTORIZADO, NO_ENCONTRADO y LOCK_TIMEOUT dicen «no se hizo».
- 🪤 **Un reintento con otro OP_ID es una operación nueva.** Cualquier camino que suelte el OP_ID antes de saber (un `catch` que limpia el
  mapa) vuelve a abrir la puerta del duplicado.
- 🪤 **El borrador es por cama y turno, no por paciente.** Todo lo que lo escriba antes de saber si el guardado resultó tiene que preguntarse
  de quién es el que ya está ahí.
- **Queda del lado del servidor** (no es de este paso): rechazar un reintento rezagado cuyo momento de apertura es anterior al último
  guardado del turno (el complemento que propuso H22), para el aparato que se cayó y volvió, o para la llamada original que sigue en la red.

### 10-oct-2026 · Guardado seguro (tanda 2), revisión adversarial: la franja del guardado cabe y se toca en el celular, el cuadro no le roba el cursor a quien escribe y el aviso dice de qué cama habla

**De dónde sale.** Paso «G pantalla: móvil y textos» de la revisión de la tanda 2: H27, H31, H25, H26, H33 y H34(2), en `v2/index.html`,
`v2/dominio_validacion.gs` y `v2/svc_evoluciones.gs`. Todos reproducidos antes de tocar nada: la sección J de
`guardado_seguro_no_confirmado_g17.js` nació con 48 fallos rojos contra la pantalla del paso 16, con las mismas cifras que dieron los
revisores (botón de 112 x 16 px, `scrollWidth` de `pcontent` en 577 sobre 390).

**Los defectos, en palabras.**
- **H27 y H31 · la franja ámbar y su botón, en un celular de 390 px.** El botón «Reintentar ahora» medía 112 x 16 px (`padding:1px 9px`,
  escrito a mano en cada `_marca…`) y la franja era `white-space:nowrap`: con «Reintentando…» medía 330 px y empujaba el botón principal hasta
  x=581 de 390. El panel se deslizaba de lado, sin ninguna pista de que ahí había algo (`.pcontent` tiene `overflow-x:auto`). El desborde en
  rojo ya existía (x=449), pero el ámbar es más ancho.
  · **Arreglo.** El diseño de la franja y de sus botones vive ahora en CSS, en un solo lugar (`#gEstadoGuardado`, `.est-btn`): el botón mide
  al menos 32 px (40 en el celular) y tiene letra de 12,8 px. En pantallas de 740 px o menos (el corte de la versión móvil, no 480: con 480 quedaba
  un tramo de 481 a 740 donde seguía desbordando) la barra se PARTE en filas (`flex-wrap`), la franja ocupa una fila entera con su texto partido
  si hace falta, y el botón principal deja de pedir el 100% (`flex:1 1 0`: con `wrap`, el `width:100%` del `.btn` lo mandaba solo a su
  propia fila aun sin franja). La franja lleva `role="status"` y `aria-live="polite"`. Medido a 390 y a 320 px, en ámbar, ámbar agotado, rojo,
  rojo con «Cerrar la cama» y «Guardado con aviso»: nada se sale, el botón mide ≥ 32 px, el principal queda a la vista. En escritorio la franja
  sigue en la misma fila que los botones.
- **H25 · el cuadro de «No confirmado» le robaba el cursor a quien escribía.** Sale solo a los 45 s y enfocaba su botón a los 60 ms (y antes,
  a los 0 ms, el gestor de modales `Modal`): lo que la persona seguía tecleando se perdía y una barra espaciadora o un Enter apretaba
  «Reintentar ahora» sin querer. Ahora, si el foco está en un campo donde las teclas hacen algo (texto, número, fecha, `<select>`,
  `contenteditable`; no un botón ni una casilla), el foco NO se mueve —ni en `_avErrAbrir` ni en `Modal.alAbrir`, que lo declara en
  `SIN_ROBAR_FOCO`— y el cuadro se anuncia con una región `role="alert"` (`#avErrAnuncio`, solo para lector de pantalla) que se vacía al cerrar.
  Con Tab se entra al cuadro (la trampa de Tab del gestor ya lo hacía). Sin escribir en nada, todo sigue como antes: el foco va a «Reintentar ahora».
- **H26 y H33(a) · el éxito tardío no decía de qué cama hablaba.** Si la confirmación de la cama 2 llega con la 3 delante, «✅ Evolución
  guardada correctamente» se lee como que se guardó la 3. Con el panel que ya no es el de la sesión ahora dice «✅ Evolución de la cama 2
  guardada» (`falloFinal` ya nombraba la cama). Hallazgo de paso: con ese panel ajeno las `advertencias` del servidor se perdían (solo la
  franja de la cama vigente las mostraba): ahora viajan en ese mismo aviso («⚠ Evolución de la cama 2 guardada, pero: …»).
- **H33(b) · «Guardado con aviso» dejaba la instrucción solo en un toast de 9 s.** La franja decía «✓ Guardado con aviso 11:00», y el detalle
  («Vuelve a guardar el turno para completarlas») iba en un `title` que en una pantalla táctil no se ve. Ahora la franja se parte en dos líneas
  y la instrucción SE LEE en ella (escapada con `escapeHtml`: es texto del servidor), mientras la franja siga ahí. No se tocó el resto de lo que
  el revisor proponía (no avanzar solo al paso 6, o dejar `_formDirty` en true): es otra regla de uso y queda como estaba.
- **H34(2) · el rechazo por cambio de paciente hablaba de «este formulario» en diálogos que no lo son.** Egreso, mover, intercambiar, anular,
  escalas y gases abren diálogos sin formulario y leían «desde que abriste este formulario… Cierra el formulario». Ahora dice «desde que abriste
  esta ventana… Cierra esta ventana y vuelve a abrir la cama para ver cómo está ahora», en `_msgCambioDePaciente` y en `validarEpisodioAbierto`
  (el guardado de la evolución): el texto es UNO para todas las puertas y la guardia G14 exige que sean idénticos. Se conserva «cambió de
  paciente», que es lo que reconoce `_EP_CAMBIO_RE` en la pantalla.

**Las guardias.** Sección J de `guardado_seguro_no_confirmado_g17.js` (J1 las medidas, J2 el foco, J3 el éxito tardío, J4 el aviso a la vista);
dos aserciones nuevas en `guardado_seguro_episodio_g14.js` para el texto. Una guardia vigente se ajustó con su razón escrita: F10 exigía que
el texto de la franja fuera EXACTAMENTE «✓ Guardado con aviso hh:mm» (`…$`); la convención cambió a propósito (H33b) y ahora exige que EMPIECE
así y que además traiga la instrucción. `RCE_CAPTURAS_DIR=/ruta node build/checks/guardado_seguro_no_confirmado_g17.js` guarda una captura de
cada estado a 390, 320 y 1100 px (fuera del repositorio).
- 🪤 **Las medidas del celular van con el reloj de Playwright pausado y la captura espera 0,7 s de reloj real:** las transiciones de CSS
  corren con el reloj de pared, y sin esa espera el panel sale a medio abrir en la imagen.
- 🪤 **`flex-wrap` sobre una barra cuyo botón principal trae `width:100%` lo manda solo a su fila**, aun sin la franja. Antes de partir una
  barra de botones hay que mirar qué pide cada hijo como base.
- 🪤 **Un `role="alertdialog"` dentro de un overlay que nunca sale del árbol (solo cambia su opacidad) no tiene ninguna «aparición» que el
  navegador anuncie** (no se probó con un lector de pantalla real: es lo que se deduce del marcado). Sin mover el foco no se puede contar con
  que se lea, y por eso lleva una región viva aparte.

## 10-oct-2026 · Tanda 3 · Turno respiratorio: el aviso lleva al campo aunque esté plegado, una sola lista de lo que falta y las palabras de estado de cada bloque

**De dónde sale.** Después de las tandas 1 (integridad) y 2 (guardado seguro), el plan de limpieza del registro de evolución seguía con el
paso Turno y, dentro de él, Respiratorio. Una auditoría de solo lectura de las tandas 3, 4 y 5 dejó un diseño de siete cambios mínimos para
la tanda 3. Se construyeron los cambios 1 a 5 en tres pasos (3.1, 3.2 y 3.3; un commit cada uno, cada guardia vista ROJA antes del arreglo);
esta entrada es el cierre: junta lo que se hizo, deja la batería y la entrega. **Sin migración de esquema.** Las entradas de cada paso se
conservan enteras más abajo, bajo «El detalle, paso a paso».

**Los tres defectos que había** (los tres con el mismo origen: lo que la pantalla dice del estado del turno no salía de los datos ni de la
misma regla que usa `guardar()`).
1. **El aviso «falta esto» mandaba a un campo que no se veía.** A 390 px el panel es un acordeón: todas las tarjetas nacen plegadas y
   Respiratorio además tiene dos sub-bloques cerrados. `_irAlCampo` solo cambiaba de paso, así que la PVE, la hemodinamia o las razones de
   KTM quedaban dentro de un `display:none` y el foco caía en el vacío: un mensaje sin nada que tocar. (De paso: «Extubación» scrolleaba a
   un id que no existe y a un input escondido, o sea a nada, desde que se renombró el bloque.)
2. **Lo que falta para guardar vivía en tres listas** (dos paralelas dentro de `rielRender` y una en `guardar()`), y se habían desajustado:
   `guardar()` frenaba por la hemodinamia y por la razón de «PVE superada sin extubar», pero el aviso «Falta:» no las nombraba. Descubría
   la falta recién al apretar Guardar, justo lo que el aviso existe para evitar.
3. **El estado de cada bloque era un scrape genérico** de cuatro controles (`_mResumen`) que solo existía en el celular: no veía lo que se
   responde con botones (PVE, prono, secreciones, eventos de vía aérea, fase, sedantes, procedimientos) ni un 0 tecleado, así que decía
   «— sin registrar» sobre bloques ya respondidos. En escritorio, donde hay MÁS bloques abiertos a la vez, el estado no existía.

### Lo que cerró cada pieza

| Paso (commit) | Cambios del plan | Defecto que cerraba | Cómo queda | Guardias (rojas antes, verdes después) |
|---|---|---|---|---|
| **3.1** (b281cdd) | 1 (cubre además el 3 de la tanda 4) | El aviso lleva a un campo plegado e invisible | `_abrirHastaCampo(el)`, contraparte de `_vis`: sube por los ancestros y abre SOLO lo que lo esconde por presentación (tarjeta, sub-bloque, `<details>`); la llaman `_irAlCampo` y el `scrollA` de `setEventoVA`. «Extubación» scrollea a `dExtSec` | `abrir_hasta_el_campo.js` (39 fallos antes, a 390 y 1200 px) |
| **3.2** (64eaf3c) | 2 y 3 | Tres listas de obligatorios; el aviso callaba la hemodinamia y la razón de no extubar | `_obligatoriosPendientes()` devuelve `[{el, texto}]` en el orden de `guardar()`; `rielRender` la consume para la línea de `#gFalta` y para el «!» del celular | `obligatorios_una_sola_lista.js` (36 antes), `aviso_igual_que_guardar.js` (68 antes); `panel_ux.js` reconciliada con su razón |
| **3.3** (5d5e1ce) | 4 y 5 | Estado por scrape, solo en celular, ciego a botones y a ceros | `estadoBloque()` calcula `sin / reg / rev` de los datos (la lista de 3.2, controles con valor y fuentes declaradas en `data-fuentes`); `ESTADO_PALABRAS` es la única constante de las tres palabras; se pinta en las tarjetas del Turno en escritorio y celular y en los tres sub-bloques de Respiratorio | `estado_del_bloque.js` (130 antes), `estado_visible_escritorio.js` (128 antes); `movil_panel.js` (R2 y R8) reconciliada con su razón |

Los cuatro defectos viejos que aparecieron en las mismas líneas del paso 3.3 y se arreglaron con él: el resumen del encabezado se escribía
con `innerHTML` **sin escapar** (un texto con `<img onerror>` tecleado en «Otro procedimiento» se ejecutaba), un resumen largo ensanchaba
la tarjeta y empujaba el panel 18 px hacia la derecha, los botones no repintaban el estado ni el aviso «Falta:», y el posicionamiento
plegado contaba como «no corresponde». Ninguno cambia lo que se guarda.

### Lo que ve distinto la kinesióloga

- **El aviso «falta esto» siempre deja el campo a la vista.** En el celular, si le falta la PVE, la hemodinamia o la razón de KTM, la tarjeta
  o el sub-bloque que lo tapaba se despliega y el campo queda en pantalla y enfocado (las demás tarjetas siguen plegadas). Un «Otro
  procedimiento» plegado también se abre.
- **«Extubación» lleva a la PVE:** en escritorio y celular, al apretar el evento la pantalla se desliza al bloque «Extubación / PVE» y lo
  contornea de azul 2,5 s, igual que ya hacían los otros cuatro eventos. Antes no pasaba nada a la vista.
- **La línea «Falta:» nombra la hemodinamia:** una evolución en blanco pasa de «Falta: firma y vía aérea» a «Falta: firma y hemodinamia y vía
  aérea» (con tubo: «…firma y hemodinamia y PVE sí / no / no corresponde»). Si la hemodinamia ya está puesta, que es lo común porque se copia
  del turno anterior, no cambia nada. Si marca «PVE superada» y «no se extubó» sin decir por qué, lo pide antes de apretar Guardar.
- **Tres palabras en cada tarjeta del turno** (6, o 7 con Neurología), en escritorio y celular: gris «Sin registrar», verde «Registrado»,
  rojo «Requiere revisión», con lo que falta («falta la hemodinamia») y el resumen. En el celular reemplazan al «sin registrar» en
  minúscula, también en los tres sub-bloques de Respiratorio, y desaparecen los falsos «—»: «Eventos de vía aérea» pasa a «Registrado» al
  responder la PVE o declarar un evento, «Manejo respiratorio» al marcar secreciones. Un 0 tecleado (PEEP 0, PS 0, PAM 0) cuenta como dato.
- El aviso «Falta:» también se actualiza al tocar botones (antes quedaba viejo hasta el siguiente tecleo). Un texto con `<` ya no se
  ejecuta en el encabezado y un resumen largo ya no empuja la pantalla en el celular.
- Las tarjetas de los otros pasos se ven como siempre: cada paso recibe las palabras cuando le toque su tanda, para no mezclar dos vocabularios.

### Lo que NO cambió

`guardar()`, `api()`, `gs()`, la franja `#gEstadoGuardado` y los `avErr*` no se tocaron (las guardias miden `guardar()` solo desde afuera);
lo que se manda al servidor es idéntico (`guardado_viajes` y `episodio_turno`, las guardias A/B del payload, siguen verdes). Los eventos de
vía aérea se siguen registrando a mano y la PVE, la KTR, el modelo de tres ejes y el lugar de cada bloque quedan donde estaban. No hay hoja ni
columna nueva.

### Lo que queda abierto a propósito

- 🔴 **Los cambios 6 y 7 del plan NO se ejecutaron.** El 6 (quitar los cascarones vacíos de Traqueostomía y Decanulación) espera la decisión
  sobre cómo se anota una TQT al ingresar con tubo (H3, confirmado en pantalla: hoy el bloque muestra solo su título y ningún control
  visible). El 7 (plegar por defecto en escritorio) espera las decisiones sobre lo heredado y sobre qué plegar. Los dos viven en
  `docs/PENDIENTES.md`, sección 2d.
- **Ya implementado con la opción recomendada y esperando su confirmación** (2d, las marcadas con ✅): el aviso que nombra la hemodinamia, las
  tres palabras de estado, que «Extubación» lleve a la PVE, el orden de la frase del encabezado y el aviso que se actualiza al tocar botones.
  Ninguna está escrita todavía en `docs/ACUERDOS_REDISENO.md`.
- **Decisiones de Diego sin ejecutar** (las de la auditoría que no se tomaron y las que dejaron los pasos): lo heredado del turno anterior,
  plegar en escritorio, la KTR en blanco, la PVE con TQT + VM, los textos fijos, la TQT al ingresar, la firma en el celular y los chips de
  Evaluaciones con el mismo defecto de plegado. Cada una con su recomendación en 2d.
- **Dos listas que siguen paralelas por orden de la tanda:** `guardar()` conserva la suya (con sus toasts); un obligatorio nuevo hay que sumarlo
  en los dos sitios y `aviso_igual_que_guardar.js` avisa si se olvida uno. Y `_mFaltaTxt` sigue siendo una tabla de nombres cortos que dice «un
  dato obligatorio» para los que no conoce.
- **No se midió en un aparato real:** todo se probó en el Chromium de Playwright con un `google.script.run` simulado y el reloj inventado, no en
  el Chrome de Windows 10 del hospital. La orientación y el teclado virtual de un celular de verdad (que pueden tapar el campo centrado) no
  se midieron.

### Cierre de la tanda

- **Sello `NEXT-5.7-turno-respiratorio`** en `build/empaquetar_cohete.js` y en los dos sitios del fuente (`<meta name="rce-version">` y el
  texto de «La app no pudo iniciar»). `entrega/`, `pwa/` y `build/paquete_migracion/` regenerados.
- **Batería completa (`-j 2`): 230 verdes, 0 rojas** (546 s). Eran 225 al cierre de la tanda 2; se suman las cinco guardias de esta
  (`abrir_hasta_el_campo`, `obligatorios_una_sola_lista`, `aviso_igual_que_guardar`, `estado_del_bloque`, `estado_visible_escritorio`).
  `paridad_entrega` y `pwa_paquete`, que durante los pasos estaban rojas por la regeneración pendiente, quedan verdes.
- **`node build/medir_guardado.js`** (viajes a hojas por acción): abrir 3, reabrir 3, turno nuevo **13**, re-guardar **17**, ingreso **13**,
  decanulación **13**, reintubación **14**. Los techos (14, 18, 14, 14, 15) no subieron: idénticos a la tanda 2, como corresponde a una tanda
  que no toca lo que `guardar()` manda ni el servidor.
- **Qué pegar** en el editor de Apps Script, desde `entrega/`: **solo `index.html`** (el cohete). Ningún `.gs` cambió desde el cierre de la
  tanda 2 (`node build/que_pegar.js 1d70aa0` lo confirma: 1 archivo). Si la planilla se quedó en 5.6 o antes, ver la lista de la tanda 2.
  Comparar con `cmp`, no a ojo: el portapapeles corrompe los acentos en archivos grandes.
- **¿`crearORepararEstructura()`?** **No hace falta**: `esquema.gs` y `mantenimiento.gs` no cambian; no hay hoja ni columna nueva.
- **Cómo se publica:** nueva versión de la implementación web de la **planilla de NEXT** (nunca la del hospital) y recargar la app instalada
  para que el sello de versión renueve su caché. El sello `NEXT-5.7-turno-respiratorio` debe aparecer en «Cargando…»; si no aparece, lo pegado
  no es lo nuevo. Recordatorio de la tanda 2: la prueba con DOS aparatos sigue pendiente antes de pegar en NEXT.
- **Cómo revertir:** cada paso es un commit (b281cdd, 64eaf3c, 5d5e1ce) y el cierre es otro; `git revert` deshace lo que se quiera. Ninguna
  columna cambió, así que no hay datos que migrar de vuelta.

### Para no olvidar (de toda la tanda)

- 🪤 **Lo que un aviso nombra y lo que el guardado exige tienen que salir de la misma lista.** Dos listas paralelas se desajustan en silencio
  (pasó con la hemodinamia). Mientras `guardar()` conserve la suya, `aviso_igual_que_guardar.js` es la red: mide `guardar()` desde afuera.
- 🪤 **«Oculto por presentación» no es «oculto por lógica».** `_vis` quita el plegado a propósito para preguntar si el campo corresponde; para
  preguntar si SE VE hay que medir la geometría real (rectángulo con tamaño, ningún ancestro `display:none`, ningún `<details>` cerrado), o la
  guardia da verde justo donde el campo no se ve.
- 🪤 **Un estado calculado de los datos tiene que declarar sus fuentes.** Un `<input type=hidden>` o un botón no aparecen en un scrape de controles;
  `data-fuentes` los nombra y la guardia exige que cada hidden y cada botón de las tarjetas esté declarado o exento con su motivo.
- 🪤 **Un 0 tecleado es dato; el 0 de un `<select>` sin opción en blanco no lo es** (la KTR nace en 0: decisión abierta).
- 🪤 **Los sub-bloques de Respiratorio se arman UNA vez por página** y conservan lo que abrió el escenario anterior; una guardia que los use los
  devuelve a su estado de nacimiento antes de cada escenario.
- 🪤 **`.sp-2col{grid-template-columns:1fr}` es `minmax(auto,1fr)`:** un texto sin partir ensancha la columna. Con `minmax(0,1fr)` y puntos
  suspensivos no desborda.

### El detalle, paso a paso

Las tres entradas que siguen son las que se escribieron durante la tanda, sin cambios de contenido (solo bajaron un nivel de título).

### 10-oct-2026 · Tanda 3 · paso 3.1 · «El error lleva al campo» también cuando el campo está plegado (cubre además el cambio 3 de la tanda 4)

**El defecto.** `_irAlCampo` (la que llaman los avisos de «falta esto» de `guardar()` y las validaciones del ingreso) solo cambiaba de
PASO. Pero a 390 px el panel es un acordeón: `mAcordeonInit` pliega TODAS las tarjetas (`mcol`) y Respiratorio, además, nace con dos
sub-bloques cerrados (`msub.cerrado`: «Eventos de vía aérea» y «Manejo respiratorio»). `_vis` ya trataba ese plegado como presentación
—por eso el guardado SÍ exige el campo plegado—, pero el aviso no lo abría. Medido en Chromium a 390 px, con tubo + VM y la PVE sin
responder: el toast decía «Define la PVE de este turno», el paso era el correcto, el botón estaba dentro de «Eventos de vía aérea»
(cerrado) y el `focus()` caía en un `display:none`. Lo mismo con la hemodinamia vacía (tarjeta plegada) y con las tres razones de KTM de
Terapia física (la razón de «no realizada», la contraindicación y el fundamento de «Otro»). La PVE y las razones de KTM son justo lo que
más se olvida.

**El cambio (solo `v2/index.html`, sin tocar datos ni ninguna ruta de guardado).** Función nueva `_abrirHastaCampo(el)`, al lado de `_vis`
(es su contraparte): sube por los ancestros del campo y abre SOLO lo que lo esconde por presentación —la tarjeta `mcol` que lo contiene,
el sub-bloque `cerrado` que lo contiene y cada `<details>` cerrado—; las demás tarjetas siguen plegadas. Devuelve `true` si abrió algo. La
llaman `_irAlCampo` (dentro del mismo `setTimeout` de 60 ms, antes del `scrollIntoView`/`focus`; su firma y su retorno no cambian) y el
`scrollA` interno de `setEventoVA`. En escritorio no hay `mcol` ni `msub`: solo puede abrir un `<details>` (el «➕ Otro procedimiento»).
`guardar()`, `api()`, `gs()`, la franja y los `avErr*` no se tocaron.

**🪤 Lo que apareció de paso, en la misma línea de `setEventoVA`.** La auditoría decía «`setEventoVA('ext')` debe dejar `#dPVE` visible».
Al medirlo: **`dPVE` no existe en la pantalla** (el bloque de la PVE se llama `dExtSec`) y `fPVEval` es un `<input type=hidden>`, al que no se
le puede hacer scroll. O sea que `scrollA('dPVE'); scrollA('fPVEval');` eran las dos un no-op desde que se renombró el bloque, **en cualquier
ancho**: apretar «Extubación» declaraba el evento y no llevaba a quien lo apretó al lugar donde hay que completarlo. Se cambió por
`scrollA('dExtSec')`. Es la única diferencia de comportamiento visible en escritorio: al apretar «Extubación» ahora la pantalla se desliza
hasta el bloque «Extubación / PVE» y lo contornea de azul 2,5 s, igual que ya hacen la intubación, la reintubación, la TQT y la decanulación
con sus bloques. Si Diego prefiere que no se mueva, se revierte esa palabra.

**La guardia** `build/checks/abrir_hasta_el_campo.js` (nueva, a 390 y a 1200 px, reloj inventado: lunes 10-ago-2026 11:00). Mide con la
geometría real (rectángulo con tamaño, ningún ancestro con `display:none`, ningún `<details>` cerrado, dentro de la pantalla), **no** con
`_vis`, que a propósito quita el plegado para preguntar otra cosa y daría verde justo donde el campo no se ve. Cubre: la PVE sin responder
(desde otro paso, vía `guardar()`), la hemodinamia vacía, «Extubación» (con Respiratorio plegada y con Respiratorio abierta pero eventos
cerrados; el scroll se ESPÍA para exigir que caiga en algo que existe y se ve), las tres razones de KTM de Terapia física (desde Planes), un
`<details>` cerrado, `_abrirHastaCampo` por sí sola (true/false, nulo, un campo que ya se veía) y la firma vía `_irAlCampo`. Cada escenario
exige primero que de partida el campo NO se vea y la tarjeta esté plegada, y que después las demás tarjetas SIGAN plegadas. **Roja antes:**
39 fallos contra el `index.html` del commit anterior (los de plegado solo a 390 px, más el `<details>` y el scroll de «Extubación» también a
1200). **Verde después**, y cuatro mutantes mueren (sin la rama del sub-bloque: 12 fallos; sin la de la tarjeta: 29; sin la del `<details>`: 7;
sin que `_irAlCampo` la llame: 30).
- 🪤 **Los sub-bloques de Respiratorio se arman UNA vez por página** (`_mSubBloques` sale si «ya armado») y conservan lo que abrió el
  escenario anterior, mientras `mAcordeonInit` sí vuelve a plegar las tarjetas: un escenario partía con «Eventos de vía aérea» abierto sin que
  nadie lo hubiera pedido. La guardia los devuelve a su estado de nacimiento (`M_SUBS.abierto`) antes de cada escenario.

**Lo que NO se arregló y queda dicho.** La rama de FIRMA de `guardar()` hace `sel.focus()` directo y no pasa por `_irAlCampo`. A 390 px,
parado en Planes (la tarjeta «Cerrar el turno» nace plegada), apretar «Guardar» sin firma da el toast «Debes seleccionar la firma» y el foco
cae en la tarjeta plegada; la guardia lo deja medido como «conocido» (no tumba la batería) y mide que `_irAlCampo('fFirma')` SÍ la deja a la
vista y con el foco. Arreglarlo es una línea dentro de `guardar()` (`_irAlCampo('fFirma')` en vez de ese `focus()`), zona cerrada en la
tanda 2: espera la autorización, o la decisión 4 de la tanda 4 (dejar abierta la tarjeta única de Planes al entrar en celular).
Con el mismo defecto, **medido y sin tocar**: los chips de Evaluaciones que «llevan al campo» (`pasoEvalMedir`, que abre el cajón `evFam`
pero no la tarjeta plegada). A 390 px, con las tarjetas plegadas como las deja el acordeón al abrir, los 7 chips que no abren un modal (PIM,
dinamometría, PEM, FEmáx, IMS, ecografía, deglución) dejan su campo invisible; `chips_llevan_al_campo.js` no lo ve porque mide a un solo
ancho. La corrección sería la misma línea (`_abrirHastaCampo(el)` antes del `scrollIntoView`). `transOfIr` (el modal de transición que lleva
al bloque del evento) tiene el mismo patrón y no se midió.

**H3 de la auditoría de la tanda 3 (solo verificado, nada cambiado), medido en pantalla a 1200 y a 390 px: confirmado.** Al INGRESAR un
paciente con TOT, la fila «¿Qué pasó hoy con la vía aérea?» está oculta (por diseño: «al ingresar no hay "venía con"»), ningún botón de
evento se ve, y el bloque «🔪 TRAQUEOSTOMÍA» queda a la vista con SOLO su título: la casilla «Ocurrió TQT este turno» es `display:none` y el
detalle (hora, técnica, cánula, queda con) está oculto hasta declarar el evento. Ni un solo control visible dentro del bloque. Elegir «TQT»
en el selector de vía aérea del ingreso lo trata como estado de llegada, no como evento: tampoco abre el detalle ni marca la casilla. Es lo
que `regresion_ui` llama «anotable» (solo mira que el cascarón no tenga la clase `hidden`). Va a las decisiones de Diego.

**Sin migración de esquema.** `entrega/`, `pwa/` y la `VERSION` quedan para el cierre de la tanda.

### 10-oct-2026 · Tanda 3 · paso 3.2 · Una sola lista de obligatorios, y el aviso «Falta:» nombra la hemodinamia y la razón de no extubar (cambios 2 y 3)

**El defecto.** Lo que falta para poder guardar existía en TRES listas: dos paralelas dentro de `rielRender` (una de textos para la línea
«Falta:» de `#gFalta` y otra de elementos para el «!» de los encabezados del celular) y una tercera, con sus toasts, en `guardar()`.
Bastaba agregar un obligatorio a una y olvidar la otra para que el aviso y el bloqueo se contradijeran, y se contradijeron: `guardar()` frena
si falta la **hemodinamia** (estado y DVA; Diego, 20-sep-2026: «HDN pedir antes de avanzar… como la firma») y si la PVE se superó **sin
extubar** y falta su razón o el detalle de «Otra» (tanda 2a), pero el aviso no nombraba ninguna de las dos. Medido en Chromium: una
evolución nueva con la firma y la vía aérea puestas decía «Falta:» en blanco, y al apretar Guardar salía «Registra la hemodinamia». El aviso
mentía por omisión: la persona descubría la falta recién al guardar, justo lo que el aviso existe para evitar. (Confirmado que la hipótesis de
la auditoría era cierta: el aviso quedaba vacío en los cinco escenarios medidos, a 1200 y a 390 px.)

**El cambio (solo `v2/index.html`, sin tocar `guardar()`, ni su lista, ni su bloqueo, ni el payload).**
- **Cambio 2.** Función nueva `_obligatoriosPendientes()`, justo encima de `rielRender`: devuelve `[{ el, texto }]` en el orden en que se
  anuncian. `rielRender` ya no arma nada: la consume para las dos cosas (la línea de `#gFalta` con los `texto` unidos con « y » y
  `_mPintarSecciones` con los `el`). Se conserva el nombre `rielRender` (lo llaman sitios que ya no importa contar). Cada entrada lleva su
  texto y su elemento JUNTOS: no se pueden separar. Los once obligatorios de siempre conservan **palabra por palabra** su texto, su elemento y
  su orden (lo mide el oráculo escrito a mano de la guardia 1, que da verde contra el código de antes y de después).
- **Cambio 3.** Entran dos obligatorios, en el **mismo orden relativo que `guardar()`**: firma · **hemodinamia** · vía aérea · PVE · … ·
  tipo de la extubación sin PVE · **razón de la PVE superada sin extubar** · **motivo de la «Otra» razón de no extubar** · KTM · reintubación.
  Mismas condiciones que `guardar()` (hemodinamia: `!v('fHEst') || !v('fDVA')`, y el campo al que lleva es el primero vacío, como allá;
  PVE superada sin extubar: `_pveSupSinExt()` con razón vacía, o con «Otra» sin detalle).
- De paso, en el celular el encabezado de la tarjeta decía el genérico «falta un dato obligatorio» para lo que `_mFaltaTxt` no conocía. Se le
  enseñaron tres nombres: «falta la hemodinamia», «falta la razón de no extubar» y «falta el motivo de la «Otra» razón de no extubar».

**Lo que ve distinto la kinesióloga (texto visible).**
- La primera línea de una evolución en blanco pasa de «Falta: firma y vía aérea» a **«Falta: firma y hemodinamia y vía aérea»**. Con tubo, de
  «Falta: firma y PVE sí / no / no corresponde» a «Falta: firma y hemodinamia y PVE sí / no / no corresponde». Cuando la hemodinamia está puesta
  (la mayoría de los turnos, porque se copia del turno anterior) no cambia nada.
- Si marca «PVE superada» y «no se extubó» sin decir por qué, el aviso ahora lo pide ANTES de apretar Guardar: «Falta: razón de la PVE superada
  sin extubar» (y «motivo de la «Otra» razón de no extubar» si eligió «Otra» sin detalle).
- En el celular, la tarjeta Hemodinamia sin registrar pasa de «— sin registrar» a **«! falta la hemodinamia»**, y Respiratorio avisa lo de la
  razón de no extubar. Es lo que se quería: el bloque que debe algo ya no se ve igual que el que está vacío sin deber nada.
- 🪤 Con tres o más pendientes la frase lee «firma y hemodinamia y vía aérea» (el unir con « y » ya era así: «firma y vía aérea y PVE sí / no…»).
  No se cambió el modo de unir para no tocar el resto de frases; si Diego prefiere comas, es una línea.

**Las guardias.**
- `build/checks/obligatorios_una_sola_lista.js` (nueva, a 1200 y 390 px, reloj inventado lunes 10-ago-2026 11:00): estructura (existe la función,
  `rielRender` ya no lleva `faltas.push` ni `faltaEls` y la llama) y equivalencia en 14 escenarios (firma y vía aérea en blanco, vía natural en
  regla, PVE sin responder, «No» sin razón, «No corresponde» sin razón, «Otra» sin motivo en las dos ramas, extubación sin tipo, KTM no realizada,
  contraindicada, suspendida sin criterio, «Otro» sin fundamento, reintubación sin hora y tres a la vez para el ORDEN) contra una tabla escrita a
  mano: el texto de `#gFalta`, la lista `[texto, id]` y, en el celular, las tarjetas marcadas con «!». **Roja antes:** 36 fallos (todos de
  estructura y de la lista; las aserciones de texto y de tarjetas daban verde contra el código de antes, que es lo que demuestra que el
  oráculo es fiel al comportamiento de hoy). **Verde después.**
- `build/checks/aviso_igual_que_guardar.js` (nueva, a 1200 y 390 px): espía `_irAlCampo` para saber a dónde lleva `guardar()` sin editarlo. Matriz
  nueva (hemodinamia vacía, solo con el estado, solo con la DVA, PVE superada sin extubar sin razón y con «Otra» sin detalle, y hemodinamia + PVE
  sin responder para el orden): `guardar()` no guarda, lleva al campo esperado, `#gFalta` no queda vacío y dice exactamente la frase, la lista
  incluye ese campo y, en el celular, su tarjeta queda con «!» y el encabezado la nombra. Y la misma invariante («si `guardar()` bloquea, el aviso lo
  nombra y la lista incluye el lugar al que lleva») en los diez obligatorios de siempre, para que la próxima deriva no necesite un bug nuevo. Más
  el orden de la evolución en blanco y un control positivo (con todo en regla el aviso queda vacío y `guardar()` guarda, también con la razón de no
  extubar y con «Otra» + detalle). **Roja antes:** 68 fallos (el aviso vacío en los cinco escenarios nuevos; la lista de elementos no existía).
  **Verde después.**
- **Mutantes (mueren donde les toca):** sin la hemodinamia en la lista → 33 fallos en `aviso_igual_que_guardar`; la hemodinamia después de la vía
  aérea → 3; sin la razón de no extubar → 9; sin el detalle de «Otra» → 4; sin el nombre de la hemodinamia en el celular → 5; `rielRender` con una
  lista propia de nuevo → 3 fallos en `obligatorios_una_sola_lista`.
- **`panel_ux.js` reconciliada con su razón escrita** (en la guardia y acá): sus dos aserciones de texto exacto fijaban «Falta: firma y vía aérea» y
  «Falta: firma y PVE sí / no / no corresponde». La convención que cambia de verdad es QUÉ nombra el aviso (ahora todo lo que bloquea el guardado);
  las aserciones se actualizaron a «Falta: firma y hemodinamia y vía aérea» y «Falta: firma y hemodinamia y PVE sí / no / no corresponde» (la firma
  sigue primero y la vía aérea sigue nombrada; ninguna aserción se borró). Las demás guardias que miran `#gFalta` (reporte_colega,
  pve_no_corresponde_razon, pve_otra_pantalla, ktm_otro_pantalla, evaluaciones_celular, validacion_entre_pasos) usan fragmentos y siguen verdes sin
  tocarlas; `movil_panel` y `movil` también.
- Batería completa con `-j 2` (en dos mitades, 228 guardias): 226 verdes y solo `paridad_entrega` y `pwa_paquete` en rojo, que son la regeneración pendiente del cierre.
  `guardado_viajes` y `episodio_turno` (A/B del payload) verdes: lo que `guardar()` manda no cambió.

**Lo que NO se hizo y queda dicho.**
- `guardar()` sigue con su lista propia (con sus toasts y sus frases): la auditoría pidió no tocarlo. Un obligatorio nuevo va en los DOS sitios;
  `aviso_igual_que_guardar.js` es la red que avisa si se olvida uno (mide `guardar()` desde afuera). Unificarlas del todo sería un paso aparte, en zona
  cerrada.
- Esto implementa la opción recomendada de la decisión 1 de la auditoría («que `Falta:` nombre la hemodinamia desde el primer momento»). Si Diego
  dice que no, se revierte la línea de la hemodinamia en `_obligatoriosPendientes()` y las dos aserciones de `panel_ux`, pero entonces el desplegable
  de Hemodinamia no podrá decir «Requiere revisión» de forma honesta (cambio 4).
- No se cambió el modo de unir las frases (« y »), ni `_vis`, ni la PVE, ni ningún id; sin migración de esquema. `entrega/`, `pwa/` y la `VERSION`
  quedan para el cierre (`build/paquete_migracion/index.html` lo regeneró la guardia `paquete.js`).

### 10-oct-2026 · Tanda 3 · paso 3.3 · Las palabras de estado de cada bloque, calculadas de los datos y visibles en escritorio y celular (cambios 4 y 5)

**El defecto.** El encabezado de cada tarjeta del celular decía «✓ / — / !» con `_mResumen`, un scrape genérico: copiaba hasta cuatro
controles `<input>`/`<select>`/`<textarea>` a la vista y tiraba todo `'0'`. Lo que no es uno de esos tres controles no existía para él.
Medido en Chromium a 390 px antes de tocar nada (paciente con tubo + VM): **responder la PVE «Sí»** dejaba «Eventos de vía aérea» en «— sin
registrar» (la respuesta vive en `<input type=hidden id=fPVEval>` y en el style de un botón), **declarar una decanulación** también (la casilla
«Ocurrió…» es `display:none`), y lo mismo el prono, la cantidad de secreciones (botones − + ++ +++ sobre un hidden), la fase clínica, los sedantes
y los procedimientos agregados a mano. Un 0 tecleado (PEEP 0, PS 0, PAM 0) tampoco contaba, cuando la regla transversal del proyecto es que un 0 se
guarda como 0 y vacío no es 0. Y en escritorio, donde hay MÁS bloques abiertos a la vez (6 tarjetas), el estado no existía: `.mst`/`.mres` eran
`display:none` y `_mPintarSecciones` salía si `!esMovil()`. (Confirmada la hipótesis de la auditoría. Medido también contra el `index.html` del commit anterior: con una fase elegida, «Fase clínica» decía «— sin registrar»,
y con la cantidad de secreciones puesta, «Manejo respiratorio» también.)

**El cambio (solo `v2/index.html`; ni `guardar()`, ni el payload, ni ningún dato).**
- **Cambio 4.** `estadoBloque(contenedor, faltaEls)` → `{ estado:'sin'|'reg'|'rev', resumen, falta }`, la UNICA función que usan escritorio y celular.
  `'rev'` = hay un elemento de `_obligatoriosPendientes()` dentro del bloque (la misma regla del «!» de siempre y la misma lista del aviso «Falta:»).
  `'reg'` = hay un control a la vista con valor —incluido el 0 de un `<input>`/`<textarea>`; el `'0'` de un `<select>` sigue sin contar (la KTR nace en 0
  y no tiene opción en blanco: decisión 4 de Diego, abierta)—, una casilla marcada, o una **fuente declarada** en `data-fuentes`. `'sin'` = nada de eso.
  El scrape de `_mResumen` pasó a `_mLeer` (conserva su rama de `#fcPrevNavm` y devuelve también si hay dato aunque el encabezado no tenga sitio).
- **`data-fuentes`**: atributo en el HTML, sobre el bloque dueño de la fuente. Ids separados por espacio (un `<input type=hidden>` cuenta con su valor, una
  casilla marcada) y `@nombre` para lo que se deduce (`ESTADO_FUENTES`: `fase`, `sedantes`, `prono`, `procs`). Declaradas: `#fcFase` (`@fase cAET`),
  `#gSedFarmacos` (`@sedantes`), `#dPronoStrip` (`@prono`), `#dTqtSec` (`cTqtO`), `#dDecanSec` (`cDecanOcurrio`), `#dExtSec` (`fPVEval`), `#dReintubSec`
  (`cReintubT`), `#dIntubSec` (`cIntubO`), `#dMue` (`fCultVal`), la columna de secreciones (`fSecrQty`) y la tarjeta Procedimientos (`@procs`). Se declara
  sobre el bloque que SE CIERRA por su gate: `_mOculto` lo salta entero cuando no corresponde hoy y la fuente deja de contar con él (el gate, no el plegado).
  Para los eventos de vía aérea se leen las mismas casillas que lee `_eventoVADeclarado()`, una por bloque (así la TQT cuenta en «Ventilación» y la decanulación
  en «Eventos de vía aérea»), en vez de leer el style de los botones.
- **Cambio 5.** Constante única `ESTADO_PALABRAS` = «Sin registrar» / «Registrado» / «Requiere revisión» (decisión 6). `_mPintarSecciones` deja de salir en
  escritorio, pero SOLO pinta las tarjetas del Turno (la misma regla de dueño que `pasoIr`: sin `data-paso` = paso 2, así una tarjeta nueva del Turno recibe
  su palabra sin tocar nada) y, en celular, también los tres sub-bloques de Respiratorio. Las tarjetas de otros pasos siguen sin palabra (en escritorio sin
  estado a la vista; en celular con su «sin registrar» de siempre) hasta que les toque su tanda: no se mezclan dos vocabularios. Escritorio sigue SIN plegar nada
  y SIN sub-bloques. El glifo ✓ — ! se conserva. El encabezado sale `[palabra] falta X — resumen`: lo que falta va PRIMERO porque el resumen se corta con
  puntos suspensivos y al final se perdía justo eso. CSS: la palabra es `.mpal`; el estado en escritorio se activa con la clase `est-on` (en `@media (min-width:741px)`).
- **Decisiones ya tomadas para este paso y respetadas:** lo heredado del turno anterior cuenta como «Registrado» (como hoy; el marcado de heredados queda como
  decisión 2 de Diego); «Requiere revisión» es solo el obligatorio pendiente; un 0 tecleado es dato. NO se plegó nada por defecto en escritorio (cambio 7), NO se tocaron los
  cascarones de TQT/Decanulación (cambio 6), la KTR nace en 0 como hoy.

**Cuatro defectos viejos que aparecieron al medirlo, arreglados porque están en las mismas líneas (ninguno cambia lo que se guarda).**
1. 🔴 **El resumen del encabezado se escribía con `innerHTML` sin escapar** en la rama sin «falta» (`(txt||'sin registrar')`; solo la rama «falta» pasaba por `_escSt`). Un valor
   con `<etiquetas>` —que también trae la réplica del turno de otro colega— corría en la pantalla de quien abre. Medido: `<img src=x onerror=…>` tecleado en «Otro procedimiento»
   ejecutaba el `onerror` a 390 px. Ahora todo texto que viene de un campo pasa por `_escSt` (= `escapeHtml`, el único escapador).
2. **Un resumen largo ensanchaba la tarjeta.** `.sp-2col{grid-template-columns:1fr}` es `minmax(auto,1fr)`: el piso de la columna es el ancho mínimo de lo de adentro, y el
   resumen es una línea sin partir. Medido a 390 px: con «VM · ACVC · Mucopurulentas con tinte hemático — falta declarar la PVE» la tarjeta Respiratorio pasaba de 374 a 400 px y el panel se
   salía 18 px (ya pasaba ANTES, sin la palabra); con la palabra delante llegaba a 509. Ahora `minmax(0,1fr)` (en el `@media (max-width:820px)`) y el resumen se corta con puntos suspensivos.
3. **Los botones no repintaban el estado.** `_rielDeb` solo escuchaba `input` y `change`; la PVE, el prono, las secreciones, los eventos, la fase y los sedantes se responden con botones, así que
   tanto el aviso «Falta:» como la palabra quedaban viejos hasta el siguiente tecleo («Requiere revisión» seguía puesto después de responder lo que pedía). Se agregó un `click` delegado sobre `#kf button`
   (mismo debounce de 250 ms), y `renderChips()` llama `_rielDeb()` (agregar un procedimiento con Enter no dispara ningún evento).
4. **El cuerpo del posicionamiento plegado (`#dPosBody.hidden`) contaba como «no corresponde».** Es el cuarto plegado del celular, igual que el acordeón: un decúbito lateral marcado o un «otro
   posicionamiento» escrito no contaban mientras estuviera cerrado. Se saltó en `_mOculto` junto con los otros tres.

**Lo que ve distinto la kinesióloga.**
- **Escritorio:** cada una de las 6 tarjetas del turno (7 con Neurología) lleva en su encabezado un ✓ — ! y la palabra («Sin registrar» gris, «Registrado» verde, «Requiere revisión» rojo), seguidas del resumen de lo
  registrado y, si debe algo, de qué falta («Requiere revisión  falta la hemodinamia»). Antes el encabezado no decía nada.
- **Celular:** las tres palabras reemplazan al «sin registrar» en minúscula en las tarjetas del turno y en los tres sub-bloques; y los falsos «—» desaparecen: «Eventos de vía aérea» pasa a «Registrado» al
  responder la PVE o declarar un evento, «Manejo respiratorio» al marcar secreciones. Las tarjetas de otros pasos se ven como siempre.
- **Los dos arreglos de arriba que se notan:** un texto con `<` ya no se ejecuta, y un resumen largo ya no empuja la pantalla hacia la derecha en el celular.
- 🪤 Sedación nace «Registrado» (su opción «Sin sedación» ya viene elegida y no hay opción en blanco): igual que el ✓ de siempre. Si Diego quiere que nazca sin registrar es la misma decisión de heredados/predeterminados (2).

**Las guardias.**
- `build/checks/estado_del_bloque.js` (nueva, a 1200 y 390 px, reloj inventado lunes 10-ago-2026 11:00): existe la función y la constante; recién abierto el turno (hemodinamia en blanco → `rev` con `falta=fHEst`, Auscultación/Fase/
  Procedimientos `sin`, Respiratorio `rev` por la PVE); hemodinamia llena → `reg` y con solo el estado → `rev`; cada fuente (PVE, prono arrastrado y de hoy, secreciones, KTR 0/2, posicionamiento plegado, decanulación, TQT, fase y AET, procedimientos,
  sedantes) hace lo suyo; en 4b **cada fuente declarada se mide AISLADA** (se vacían los controles del bloque y se prende solo la fuente, para que un desplegable que nace puesto no la enmascare) y, con el bloque cerrado por su gate, no cuenta; un 0 de
  `<input>`/`<textarea>` es dato y el de un `<select>` no; un campo deshabilitado o oculto por lógica no cuenta; un valor puesto por código cuenta (lo heredado); la función solo lee (foto de todos los controles antes/después); y la **cobertura estructural**:
  todo `<input type=hidden>` y todo botón de las tarjetas del Turno está en un `data-fuentes` o en la lista de exentos de la guardia CON su motivo (y cada token apunta a algo que existe, y cada exento sigue existiendo). En celular también los glifos de
  los sub-bloques. **Roja antes:** 130 fallos contra el `index.html` del commit anterior (la función no existía; el encabezado de «Eventos de vía aérea» decía «—» tras responder la PVE y tras declarar la decanulación y el de «Manejo respiratorio» tras las
  secreciones; `fPVEval,fSecrQty,fCultVal` y 26 botones sin declarar). **Verde después.**
- `build/checks/estado_visible_escritorio.js` (nueva, a 1200, 800 y 390 px): cada tarjeta del Turno que se ve tiene EXACTAMENTE una palabra, de las tres (comparación exacta), a la vista, dentro del encabezado y coincidente con `estadoBloque()` del mismo bloque, con su glifo
  visible; Hemodinamia en blanco → «Requiere revisión» y nombra la hemodinamia, llena → «Registrado»; PEEP 0 tecleado → «Registrado» (en celular, en el sub-bloque «Ventilación» con los ejes vaciados; en escritorio lo mide `estado_del_bloque` sobre el módulo ventilatorio);
  tocar un botón repinta (click real sobre «PVE sí»); las tarjetas de otros pasos no llevan palabra y en escritorio ni siquiera se pintan; un resumen largo no desborda el panel (a 800, a 1200 y a 390 px); una `<etiqueta>` tecleada no se ejecuta; y estático: `ESTADO_PALABRAS` se define una vez y las funciones
  que pintan no escriben las palabras. **Roja antes:** 128 fallos en su primera versión (la palabra no existía; `window.__xss` se ejecutaba a 390 px). **Verde después.** Las secciones del desborde y de «no se pintan» se agregaron después de la primera corrida roja y se verificaron con mutantes.
- **Mutantes (mueren donde les toca):** `1fr` en vez de `minmax(0,1fr)` → 2 fallos; sin el listener de click → 9; sin `fPVEval` en `#dExtSec` → 9; sin `cReintubT` / `cIntubO` / `fCultVal` / `@sedantes` / `fSecrQty` / `@prono` / `cTqtO` / `cDecanOcurrio` / `@fase` / `cAET` / `@procs` →
  3, 3, 5, 3, 9, 5, 3, 7, 3, 3 y 5; el predicado de la fase roto → 3; la lista de faltantes ignorada → 12; la palabra escrita a mano en el pintado → 47; las tarjetas de otros pasos con palabra → 2; escritorio que pinta todas las tarjetas → 3 (había sobrevivido: se agregó la aserción «ni siquiera se pintan»); sin exentar `#dPosBody` → 3;
  el 0 de un input ignorado → 9; el resumen sin escapar → 10.
- **`movil_panel.js` reconciliada con su razón escrita** (en la guardia y acá). Cambian dos convenciones, solo en el Turno: **R2** fijaba el texto «sin registrar» en minúscula que escribía `_mPintarSecciones`; la convención que cambia de verdad es CUÁL es la palabra
  (el plan y la decisión 6 piden las tres de `ESTADO_PALABRAS`), y lo que protegía —que la sección vacía diga solo eso, sin inventar un resumen— se conserva: ahora exige «Sin registrar» exacto. Se le sumó que una sección vacía de OTRO paso conserva su «sin registrar» y no lleva palabra. **R8** fijaba que ningún ✓ ni
  resumen se ve en escritorio; ahora las tarjetas del Turno los muestran, y la mitad que sigue siendo cierta (las de otros pasos no) se conserva como aserción propia. Ninguna aserción se borró; el encabezado del archivo lo dice.
- Batería completa con `-j 2` (230 guardias): **228 verdes y solo `paridad_entrega` y `pwa_paquete` en rojo**, que son la regeneración pendiente del cierre. `guardado_viajes` y `episodio_turno` (A/B del payload) verdes: lo que `guardar()` manda no cambió.

**Lo que NO se hizo y queda dicho.**
- **No se tomó la decisión 2** (marcar lo heredado y pedir revisión), ni la 4 (KTR en blanco y sin replicar), ni el cambio 6 (cascarones de TQT/Decanulación) ni el 7 (plegar por defecto en escritorio).
- El estado se repinta con `input`, `change`, `click` sobre un botón y al cambiar de paso; **no con una tecla suelta que cambie una fuente declarada**: el único caso conocido (Enter en el campo de procedimientos) quedó cubierto con `renderChips()`; el Enter en el campo de «Resultado(s)» del cultivo (`fCultVal`) no repinta hasta el siguiente evento, pero ahí la casilla «Cultivo» ya cuenta.
- `_mFaltaTxt` sigue siendo la tabla de nombres cortos por id (dice «un dato obligatorio» para los que no conoce: las razones de la PVE, el tipo de extubación sin PVE, la hora de la reintubación). Usar el `texto` de `_obligatoriosPendientes()` cambiaría frases que otras guardias fijan; queda para un paso aparte.
- La decisión 5 de la auditoría (con TQT + VM la PVE no se pregunta, y por eso nunca puede decir «Sin registrar») no se tocó: el estado refleja lo que el sistema pregunta hoy.
- Sin migración de esquema. `entrega/`, `pwa/` y la `VERSION` quedan para el cierre de la tanda (`build/paquete_migracion/index.html` lo regeneró la guardia `paquete.js`).

## 10-oct-2026 · Tanda 4 · Terapia física y Planes: el nivel de la cama no se cuela, reabrir devuelve lo guardado y «Atrás» no cae en una pantalla vacía

**De dónde sale.** La auditoría de solo lectura de las tandas 3, 4 y 5 revisó el paso 4 (Terapia física) y el paso 5 (Planes) contra los acuerdos 8.6 y 8.7 y
concluyó que la estructura ya cumple —seis pasos, cada tarjeta en su paso, los tres bloques de Planes, el guardado solo al salir de Planes, el relato
que no abre antes de guardar— y que lo que fallaba eran **cuatro brechas del recorrido**, todas medibles. Se construyeron tres en tres pasos (4.1, 4.2 y 4.3;
un commit cada uno, cada guardia vista ROJA antes del arreglo); **la cuarta (el error que no abre la tarjeta plegada en el celular) ya la había cerrado el paso 3.1
de la tanda 3**, que es genérico para todos los pasos (`_abrirHastaCampo`), y no hizo falta repetirla. **Sin migración de esquema.** Las entradas de cada paso se
conservan enteras más abajo, bajo «El detalle, paso a paso». **Los tres bloques de Planes no se tocaron**: ni sus títulos, ni su orden, ni la firma al final.

**Los tres defectos que había.**
1. **Un nivel de KTM que nadie eligió se colaba en el formulario.** `fillCama` copia el nivel que la cama recuerda a un campo oculto, y la réplica del turno anterior
   solo lo reponía si había algo que heredar. De noche (y el primer día tras una noche) no hay nada que heredar, pero la cama SÍ recuerda el nivel de la noche: quedaba
   metido en el campo oculto, sin ningún botón de nivel encendido que lo delatara. Marcar «Realizada» sin elegir nivel mandaba el nivel de la cama y el relato decía «nivel 3».
   Contradice 8.6 («parte en blanco») y 8.7 («no hereda tampoco hacia el día»), y esa KTM entra al REM.
2. **Reabrir un turno guardado dejaba en blanco la terapia física**, y eso hacía dos daños distintos. **De día**, un turno con la KTM «realizada» (el más común) no se podía volver
   a guardar: la pantalla mandaba «no realizada» sin razón, el servidor lo rechazaba y la razón estaba en un campo oculto, sin dónde apuntar. **De noche** se guardaba, pero
   perdía el IMT, la EMS, la válvula, el Borg y los minutos: la pantalla los mandaba como claves presentes en blanco y la fusión del servidor solo repone las ausentes.
3. **«← Atrás» caía en una pantalla vacía.** Con un paciente sin vía aérea artificial ni ventilación la pestaña 1 (Prevención) se esconde y el camino arranca en el 2; «Siguiente»
   lo respetaba, pero «Atrás» restaba uno a ciegas y desde el Turno llevaba al cartel «Sin dispositivos de vía aérea en este paciente.».

### Lo que cerró cada pieza

| Paso (commit) | Cambio del plan | Defecto que cerraba | Cómo queda | Guardia (roja antes, verde después) |
|---|---|---|---|---|
| **4.1** (e7b0390) | 1 | El nivel de la cama se colaba de noche y en el primer día tras una noche | `fillFormReplica`: si `_tf` (lo heredable) no trae `KTM_NIVEL_KTR`, el formulario parte sin nivel (oculto vacío, botones apagados, descripción en blanco). Atado a `_tf`: DÍA→DÍA sigue heredando | `ktm_nivel_no_se_cuela.js` (nueva, 11 antes; 2 mutantes muertos) |
| **4.2** (fbb4dc6) | 2 | Reabrir vaciaba la terapia física; el turno de día quedaba imposible de guardar | `fillForm` restaura el estado de la KTM, nivel (solo si es una sesión), asistencia, minutos, Borg, IMT y EMS con sus parámetros, válvula con minutos/tolerancia/detalle y `fKTMcat`; repinta el rótulo de «Otro» | `terapia_fisica_vuelve_al_reabrir.js` (nueva, 78 antes; 12 de 12 mutantes muertos) |
| **4.3** (016f358) | 4 | «Atrás» caía en la pestaña 1 oculta | `_prevTabVisible()` y `_pasoAnterior(n)`: manda la barra; `pasoRetroceder` los usa y `pasoIr` esconde «← Atrás» donde no hay paso anterior | `seis_pasos.js` ampliada (sección 8b, 10 antes) |
| 3.1 (b281cdd, tanda 3) | 3 | El error no abría la tarjeta plegada del celular | Ya cerrado en la tanda 3 (`abrir_hasta_el_campo.js`); no se repitió | — |

### Lo que ve distinto la kinesióloga

- **De noche, la terapia física parte de verdad en blanco.** Si marca «Realizada» sin elegir nivel, la sesión no lleva el nivel de la cama y el relato no dice «nivel 3». El primer turno de
  día tras una noche tampoco arranca con el nivel de la noche. De día, tras otro turno de día, nada cambia: el nivel se hereda y se ve encendido. Y ya no queda iluminado el nivel del
  paciente que acababa de mirar.
- **Al reabrir una evolución guardada ve la terapia física tal como la dejó**: la KTM con su estado (realizada, contraindicada o no realizada), nivel, asistencia, minutos y Borg; IMT, EMS y
  válvula marcadas con todos sus datos. Un turno de día con KTM realizada que antes no se podía volver a guardar ahora se guarda; de noche ya no se borran IMT, EMS, válvula, Borg ni minutos al reabrir
  para corregir otra cosa. El relato que se regenera al reabrir narra la KTM, el IMT, la EMS y la válvula. Igual en turnos de otros días.
- **«← Atrás» ya no lleva a una pantalla vacía.** En un paciente sin TOT, TQT ni VM, el Turno es el primer paso y ahí no aparece «← Atrás»; en un ingreso, desde el Turno vuelve a la identificación (paso 0). Con un
  paciente que sí tiene prevención todo queda igual.

### Lo que NO cambió

`guardar()`, `api()`, `gs()`, `_guardadoBotones`, la franja `#gEstadoGuardado` y los `avErr*` no se tocaron; tampoco el servidor, `fillCama` ni `fillFormReplica` más allá de la línea del nivel. Lo que se manda al servidor es idéntico
(`guardado_viajes` y `episodio_turno`, las guardias A/B del payload, siguen verdes, y los viajes a hojas no subieron). Los eventos de vía aérea se siguen registrando a mano; la PVE, la KTR, el modelo de tres ejes y el lugar
de cada bloque quedan donde estaban. Los tres bloques de Planes, sus títulos y la firma, tampoco. No hay hoja ni columna nueva.

### Lo que queda abierto a propósito

- **Nada de Planes se limpió**: el plan que se hereda en silencio, el modal «¿Quién midió?» al dejar un pendiente, los 18 chips fijos y las sugerencias «Medir X» quedan para la tanda 5 (limpieza visual) y para las respuestas de Diego.
- **Decisiones de Diego sin ejecutar** (las de la auditoría y las que dejaron los pasos), en `docs/PENDIENTES.md`, sección 2e: cada una con su recomendación. Las más visibles: si la educación y la válvula de fonación deben seguir
  visibles con AET IIIC o BNM (hoy se esconde toda la tarjeta), si la KTM de día debe seguir partiendo «Realizada», si en el celular se abre sola la tarjeta única de Planes y si el plan heredado se ve en ámbar.
- **Ya implementado con la opción recomendada y esperando su confirmación** (2e, las marcadas con ✅): el nivel que no se cuela, reabrir que devuelve lo guardado y el «← Atrás» escondido en el primer paso. Ninguna está escrita todavía
  en `docs/ACUERDOS_REDISENO.md`.
- **Tres puertas conocidas que no se cerraron**: los dos caminos de `fillCama` sin réplica (paciente sin turno previo; servidor sin contestar) que aún copian el nivel de la cama de noche —no se alcanzan con datos reales—; un turno de
  DÍA que nunca declaró estado de KTM (fila anterior al trío o guardada por API) que se reabre sin estado y que `guardar()` rechazaría; y la racha de válvula para la decanulación (`_VFON_HORAS`), que no viaja en la fila del turno reabierto.
- **No se midió en un aparato real**: todo se probó en el Chromium de Playwright con un `google.script.run` simulado (y, en la guardia de reabrir, el servidor real en memoria) y el reloj inventado, no en el Chrome de Windows 10 del hospital.

### Cierre de la tanda

- **Sello `NEXT-5.8-terapia-y-planes`** en `build/empaquetar_cohete.js` y en los dos sitios del fuente (`<meta name="rce-version">` y el texto de «La app no pudo iniciar»). `entrega/`, `pwa/` y `build/paquete_migracion/` regenerados.
- **Batería completa (`-j 2`): 232 verdes, 0 rojas** (580 s). Eran 230 al cierre de la tanda 3; se suman las dos guardias nuevas (`ktm_nivel_no_se_cuela`, `terapia_fisica_vuelve_al_reabrir`); `seis_pasos` se amplió en su lugar.
  `paridad_entrega` y `pwa_paquete`, que durante los pasos estaban rojas por la regeneración pendiente, quedan verdes.
- **`node build/medir_guardado.js`** (viajes a hojas por acción): abrir 3, reabrir 3, turno nuevo **13**, re-guardar **17**, ingreso **13**, decanulación **13**, reintubación **14**. Los techos (14, 18, 14, 14, 15) no subieron: idénticos al cierre
  de la tanda 3, como corresponde a una tanda que no toca lo que `guardar()` manda ni el servidor.
- **Qué pegar** en el editor de Apps Script, desde `entrega/`: **solo `index.html`** (el cohete). Ningún `.gs` cambió desde el cierre de la tanda 3 (`node build/que_pegar.js 923f962` lo confirma: 1 archivo). Si la planilla se quedó en 5.6
  también basta ese archivo (trae lo de la tanda 3); si venía de 5.5 o antes, ver la lista de la tanda 2. Comparar con `cmp`, no a ojo: el portapapeles corrompe los acentos en archivos grandes.
- **¿`crearORepararEstructura()`?** **No hace falta**: `esquema.gs` y `mantenimiento.gs` no cambian; no hay hoja ni columna nueva.
- **Cómo se publica:** nueva versión de la implementación web de la **planilla de NEXT** (nunca la del hospital) y recargar la app instalada para que el sello de versión renueve su caché. El sello `NEXT-5.8-terapia-y-planes` debe aparecer
  en «Cargando…»; si no aparece, lo pegado no es lo nuevo. Recordatorio de la tanda 2: la prueba con DOS aparatos sigue pendiente antes de pegar en NEXT.
- **Cómo revertir:** cada paso es un commit (e7b0390, fbb4dc6, 016f358) y el cierre es otro; `git revert` deshace lo que se quiera. Ninguna columna cambió, así que no hay datos que migrar de vuelta.

### Para no olvidar (de toda la tanda)

- 🪤 **Reabrir no es abrir uno nuevo.** `fillFormReplica` hereda con reglas (de noche no hereda, no hereda hacia el día); `fillForm` es el MISMO turno y tiene que devolver todo lo que se guardó. Confundirlos fue el origen del defecto de
  reabrir: la tarjeta heredó el «parte en blanco» de un turno nuevo.
- 🪤 **Declarar el estado de la KTM hace que el payload sobrescriba todos sus satélites.** Mientras el estado va en silencio, el servidor conserva lo que ya estaba; en cuanto se declara, toma TODO del payload. Por eso, al reabrir, no basta
  restaurar el estado: hay que restaurar también nivel, minutos, Borg, IMT, EMS, válvula y la categoría de la contraindicación, o se vacían en la fila al volver a guardar sin tocar nada.
- 🪤 **Una limpieza que sigue a lo que se hereda se ata a ESO, no se hace a ciegas.** El nivel se borra cuando la réplica no trae nivel; un mutante que lo borra siempre rompe el DÍA→DÍA.
- 🪤 **Manda la barra, no el formulario.** La pestaña 1 se decide una sola vez, al abrir la cama; `prevAplicaAlgo()` lee el formulario y puede cambiar después. «Atrás» sigue a la barra o cae en un paso sin pestaña.
- 🪤 **Una guardia que modela la pantalla a mano esconde el defecto.** `ktm_no_se_pierde.js` imaginaba la pantalla de día mandando `''` y por eso no veía el rechazo; `ktm_de_noche.js` tenía una cama de prueba sin nivel y por eso no veía el
  nivel que se colaba. La guardia nueva de reabrir habla con la pantalla REAL y el servidor REAL en memoria.

### El detalle, paso a paso

Las tres entradas que siguen son las que se escribieron durante la tanda, sin cambios de contenido.

### 10-oct-2026 · Tanda 4 · paso 4.1 · El nivel de KTM que la cama recuerda no se cuela de noche ni en el primer día tras una noche (cambio 1)

**El defecto.** Al abrir un turno nuevo corren dos llenados en fila: `fillCama` copia `cama.KTM_NIVEL` al campo oculto `fKTMniv`, y después
`fillFormReplica` repone lo que se hereda (`_tf`). Esa segunda escribía el nivel solo `if(_tf.KTM_NIVEL_KTR)`: cuando NO había nada que heredar
—de noche `_tf` es `{}`, y de día tras una noche sin fila de día también— tampoco borraba lo que `fillCama` había dejado. Y la cama SÍ recuerda un nivel de
noche: el servidor conserva el último y, si la noche hizo KTM, se queda con el de la noche (`svc_evoluciones.gs`, el `KTM_NIVEL:` de la fila de la cama).
Resultado: un nivel que nadie eligió metido en un campo oculto, **sin ningún botón de nivel encendido que lo delate**. Medido en Chromium antes de tocar
nada (cama con `KTM_NIVEL='3'`, reloj inventado): **de noche**, sin tocar nada el payload ya llevaba `KTM_NIVEL_KTR='3'` (el servidor lo limpia si la KTM no
está realizada, pero la pantalla ya lo había mezclado en el relato y en la categorización SOCHIMI), y **elegir «Realizada» sin elegir nivel mandaba `true/3`** y
el relato decía «nivel 3»; **el primer turno de día tras una noche** (sin `_PREVIA_DIA`) arrancaba con nivel `3`, y también cuando la última fila de día no traía
nivel pero una noche de por medio le había dejado el suyo a la cama. Contradice 8.6 («parte en blanco, sin el nivel del día») y 8.7 («no hereda tampoco hacia el
día»), y esa KTM entra al REM y a las atenciones. (Confirmada la hipótesis de la auditoría.)

**El cambio (solo `v2/index.html`, `fillFormReplica`; ni `guardar()`, ni `fillCama`, ni el servidor).** Si `_tf` no trae `KTM_NIVEL_KTR`, el formulario parte SIN
nivel: el oculto vacío, los botones de nivel apagados y su descripción en blanco; si lo trae, `setKTMniv` como siempre. La línea se ata a `_tf` y no se limpia a
ciegas: **DÍA→DÍA sigue heredando** (BUG 5 de `regresion_ui.js`), y con una noche de por medio se hereda el nivel del DÍA, no el de la noche ni el de la cama.
Un mutante que limpia a ciegas rompe 6 aserciones de la sección DÍA→DÍA. De paso cae un defecto vecino que apareció al medirlo: **el botón de nivel que el paciente
anterior dejó encendido tampoco se apagaba** (`$('kf').reset()` vacía el oculto vía `_resetHiddenYEventos`, pero no toca los botones; solo `fillForm` los apagaba): la
pantalla mostraba el «4» iluminado con el campo vacío por debajo. Ahora lo apaga el mismo `else`.

**Lo que ve distinto la kinesióloga.** De noche la terapia física parte de verdad en blanco: si marca «Realizada» sin elegir nivel, la sesión no lleva el nivel de la
cama ni el relato dice «nivel 3». El primer turno de día tras una noche arranca sin el nivel de la noche. De día, tras otro turno de día, nada cambia (el nivel se
hereda y se ve encendido). Y ya no queda iluminado el nivel del paciente que acababa de mirar.

**La guardia (`build/checks/ktm_nivel_no_se_cuela.js`, nueva).** Cama de prueba con `KTM_NIVEL='3'` (la de `ktm_de_noche.js` no traía nivel y por eso no veía el
defecto), `Date` fijo en el 12-ago-2026 a las 11:00 y el turno forzado en `SHIFT`. Cuatro secciones: (1) de noche, el oculto vacío, el nivel derivado vacío, sin
tocar nada no viaja, «Realizada» sin nivel viaja `true/` y el relato no dice «nivel 3», y si SE ELIGE un nivel ese viaja; (2) primer día tras una noche, con y sin
`_PREVIA_DIA` de una fila de día sin nivel, y el default «Realizada» de día no se tocó; (3) DÍA→DÍA hereda el 3 con su botón, su descripción y en el payload, y con una
noche de por medio hereda el 2 del día; (4) el botón del paciente anterior (de noche y de día sin nivel que heredar) se apaga, y con nivel que heredar queda el heredado.
**Roja antes: 11 fallos contra el `index.html` anterior** (los controles DÍA→DÍA ya salían verdes); **verde después**. Mutantes: limpiar a ciegas → 6 fallos; no limpiar el
oculto → 9. Vecinas: 57 verdes de 58 corridas con `-j 2` ( `convenciones`, `ktm_*`, `regresion_ui`, `afinado`, `arranque`, `guardado_viajes`, `episodio_turno`, `tablero`,
`seis_pasos`, `cuatro_pasos`, `validacion_entre_pasos`, `evaluaciones_de_noche`, `ingreso_noche`, `movil_panel`, `cierre_tres_bloques`, `paquete`, entre otras); la única roja fue `pwa_paquete`,
por la regeneración pendiente del cierre.

**Lo que NO se hizo y queda dicho.**
- `fillCama` no se tocó (así lo pide la auditoría). Sus dos caminos SIN réplica —paciente sin turno previo y servidor sin contestar al abrir— siguen copiando el nivel de la
  cama también de noche (medido: quedaba `3`). No se alcanzan con datos reales, porque una cama que recuerda un nivel siempre tiene un turno previo del que abrir la réplica, así que
  no se midió ni se cambió; si Diego o la tanda 5 quieren cerrar también esa puerta, es una condición en `fillCama` (de noche no copiar) y la guardia es el lugar de su caso.
- El default de DÍA sigue en «Realizada» (`ktmEstadoInicial`) como antes: tras una noche, el día abre «Realizada» pero ahora SIN nivel. Es una decisión de producto abierta (la auditoría la lista
  entre los menores), no se tocó.
- Un botón de nivel encendido que queda del paciente anterior en el camino de INGRESO o sin réplica sigue sin apagarse (el reset de `abrirPanel` no lo cubre); se cubrió en la réplica, que es el camino
  de todo turno con historia.
- Sin migración de esquema. `entrega/`, `pwa/` y la `VERSION` quedan para el cierre de la tanda (`build/paquete_migracion/index.html` lo regeneró la guardia `paquete.js`).

### 10-oct-2026 · Tanda 4 · paso 4.2 · Reabrir un turno guardado devuelve la terapia física tal como se guardó (cambio 2)

**El defecto.** `fillForm` es el camino que carga un turno YA GUARDADO para re-editarlo, y de la terapia física dejaba la tarjeta entera en blanco: apagaba el estado de la
KTM (`setKTMstate(null)`), vaciaba nivel, asistencia y minutos, desmarcaba IMT, EMS y válvula de fonación, y el Borg ni lo miraba. Era una herencia de cuando «la KTM es acción
diaria y cada apertura parte en blanco»; pero reabrir es el MISMO turno, no uno nuevo (lo que no se hereda es `fillFormReplica`, y ése no se tocó). **Confirmada la hipótesis de la
auditoría, medida de punta a punta (pantalla real + servidor real en memoria, reloj inventado):** hacía dos daños distintos según el turno.
- **De DÍA, el turno quedaba imposible de volver a guardar.** La pantalla manda `KTM_NO_REALIZADA: true` cuando no hay «realizada» ni «suspendida» apuntadas (así se infiere), SIN razón,
  y el servidor contestaba «Validación: KTM: indica la razón por la que NO se realizó.» con la razón en un campo oculto y el error sin dónde apuntar. Le pasaba a **todo** turno de día con
  la KTM «realizada», incluido el más común (la KTM por defecto y nada más).
- **De NOCHE, el turno se guardaba… pero perdía cosas.** `KTM_NO_REALIZADA:''` el servidor lo toma por silencio y conserva el trío de estados y sus satélites (la regla de Manuel del 20-ago),
  pero NO el IMT, la EMS, la válvula, el Borg ni las sesiones: la pantalla los mandaba en `false`/`''` como claves PRESENTES y la fusión solo repone las AUSENTES. Medido: reabrir una noche con
  IMT, EMS y válvula y volver a guardar sin tocar nada dejaba `KTM_IMT=false`, `KTM_EMS=false`, `VFON_USADA=false`, y vaciaba minutos, Borg y todos los parámetros. Es justo lo que 8.6 dice que no
  debe pasar («lo que se llene de noche se guarda y entra al REM») y lo que Diego contó el 21-sep («que lo que anote pueda seguir registrando después»).

**El cambio (solo `fillForm` en `v2/index.html`; ni `guardar()`, ni el servidor, ni `fillFormReplica`).** Reabrir restaura lo guardado: el estado de la KTM (realizada / contraindicada / no
realizada) con su bloque abierto; el nivel, la asistencia, los minutos y el Borg; IMT y EMS con sus parámetros; la válvula de fonación con sus minutos, tolerancia y detalle. Tres cuidados que
la medición obligó a tener:
- 🪤 **Al dejar de ser «silencio», el payload sobrescribe.** Declarar el estado hace que el servidor tome del payload TODOS los satélites, así que no basta con restaurar el estado: también hay
  que restaurar todo lo demás o se vacía en la fila al volver a guardar sin tocar nada. Apareció así un faltante vecino: **la categoría de la contraindicación (`fKTMcat`) nunca se había restaurado**
  (hasta hoy no se notaba porque el trío nunca se declaraba al reabrir); ahora vuelve.
- **El nivel vuelve al campo solo si el turno es de UNA sesión.** Con lista de sesiones el nivel guardado es el más alto de la lista (se deriva) y los campos sueltos son «la siguiente sesión»:
  escribirlo ahí la dejaría con un nivel que nadie eligió y un «Agregar» sumaría una sesión fantasma.
- **El rótulo del fundamento de «No realizada · Otro»** se pintaba con el comentario todavía vacío (`_ktmNoRazonSel` corre antes de que vuelva el comentario) y quedaba en rojo «obligatorio» con el
  texto ya escrito. Era invisible mientras ese bloque estaba oculto al reabrir; al volver a mostrarse, se repinta.
- Sigue sin inventarse nada: un turno que NUNCA declaró estado (una noche sin tocar la tarjeta, o una fila de día anterior al trío) se reabre SIN estado elegido —ni «no realizada», que entra al
  denominador de la estadística, ni «realizada», que infla el REM—. Con AET grupo IIIC el gate de `aplicarGatesEval` sigue ganando (corre después): la tarjeta sigue escondida y la KTM «contraindicada»
  sola, igual que al guardar.

**Lo que ve distinto la kinesióloga.** Al reabrir un turno suyo ve la terapia física tal como la dejó: la KTM con su estado, nivel, asistencia, minutos y Borg; IMT, EMS y válvula marcadas con sus
datos. Un turno de día con KTM realizada que antes «no se podía volver a guardar» ahora se guarda. Y si regenera el relato, la KTM, el IMT, la EMS y la válvula salen narrados (antes el relato regenerado de un
turno reabierto no los traía, porque la pantalla los tenía en blanco). Sirve igual para un turno de otro día.

**La guardia (`build/checks/terapia_fisica_vuelve_al_reabrir.js`, nueva).** Habla con el servidor REAL en memoria (`sim_srv`, con `infra_lock.gs` para el sello de operación) y la pantalla REAL, `Date`
fijo en el 12-ago-2026 a las 11:00. Cada escenario llena la tarjeta con los controles de verdad, guarda, REABRE desde el servidor, mide lo que muestra la pantalla y vuelve a guardar SIN tocar nada:
exige que el servidor lo acepte, que el payload sea idéntico en 37 claves (34 de terapia física más PROC_JSON/RESUMEN/CANTIDAD, para que los procedimientos automáticos no se sumen dos veces) y que la fila
quede igual. Escenarios: (1) día completo (KTM + nivel + asistencia + minutos + Borg + educación + IMT + EMS + válvula) y el relato regenerado; (2) dos sesiones; (3) noche completa; (4) noche sin KTM,
solo IMT: no declara KTM; (5) contraindicada y no realizada («Otro» con fundamento); (6) día con la KTM por defecto y nada más; (7) turno pasado; (8) control AET IIIC; (9) control de la fila de día
sin estado. **Roja antes: 78 fallos contra el `index.html` anterior** (secciones 1 a 7; las 8 y 9 son controles que ya salían verdes y no deben dejar de serlo); **verde después**. Mutantes: 12 de 12
mueren (sin `fKTMcat`, sin repintar el rótulo, nivel escrito con lista de sesiones, IMT/EMS/válvula/Borg/asistencia sin volver, inventar «no realizada» o «realizada» cuando nada se declaró, restaurar solo de día).
Vecinas: **batería completa con `-j 2`: 230 verdes de 232**; las 2 rojas son `paridad_entrega` y `pwa_paquete`, por la regeneración pendiente del cierre de la tanda (`build/paquete_migracion/index.html` lo regeneró la
guardia `paquete.js`).

**Lo que NO se hizo y queda dicho.**
- Un turno de DÍA que nunca declaró estado alguno (fila anterior al trío, o guardada por API sin pasar por la pantalla) se reabre sin estado elegido, **como hasta hoy**, y al volver a guardarlo `guardar()` manda
  «no realizada» sin razón y el servidor lo rechaza. Esa pantalla no puede producir ese caso, y arreglarlo sería inventar «realizada» (infla el REM) o tocar `guardar()` (zona del otro flujo). Queda anotado.
- La racha de válvula para la decanulación (`_VFON_HORAS`) se carga al reabrir desde la fila del turno, que no la trae (es un transitorio de la previa): la frase de decanulación de un turno reabierto sigue contando
  solo las 12 h del propio turno si la válvula está marcada —que ahora sí lo está—. Es la regla de decanulación (clínica) y queda para la decisión 16 de PENDIENTES; este paso no la cambia.
- El estado de la KTM por defecto de DÍA («Realizada») sigue como estaba: aplica a un turno NUEVO, no a reabrir. Es la decisión de producto abierta de la auditoría.
- Sin migración de esquema. `entrega/`, `pwa/` y la `VERSION` quedan para el cierre de la tanda.

### 10-oct-2026 · Tanda 4 · paso 4.3 · «← Atrás» salta la pestaña 1 oculta, igual que «Siguiente» (cambio 4)

**El defecto.** Con un paciente SIN vía aérea artificial ni ventilación no hay nada que prevenir, así que la pestaña 1 (Prevención) se esconde al abrir la cama (`prevGateTab`) y el camino
arranca en el 2. «Siguiente» ya respetaba eso, pero `pasoRetroceder` hacía `pasoIr(PASO_ACTUAL - 1)` a ciegas: desde el Turno llevaba a una pantalla que la barra ni ofrece, con el cartel
«Sin dispositivos de vía aérea en este paciente.» (`prevPintar`). **Confirmada la hipótesis de la auditoría (hallazgo F), medida en pantalla real:** `pasoRetroceder` desde el 2 terminaba en el 1, con la
tarjeta de prevención y el cartel vacío a la vista, y la ida (2→3→4→5) y la vuelta (5→4→3→2→1) no eran el mismo camino. Con el ingreso (pestaña 1 también oculta) pasaba lo mismo: desde el 2 volvía a un 1
que la barra no muestra, en vez de al 0.

**El cambio (solo `v2/index.html`; la numeración de las pestañas no se toca).** Dos funciones nuevas junto a `prevGateTab` y dos líneas tocadas:
- `_prevTabVisible()`: ¿la pestaña 1 está a la vista en la barra?
- `_pasoAnterior(n)`: a qué paso lleva «Atrás» desde el n, o `null` si n ya es el primero del camino. Salta la Prevención si su pestaña está oculta: con ingreso vuelve al 0; sin ingreso, el Turno es el primero.
- `pasoRetroceder` usa `_pasoAnterior` (si es `null` no hace nada), y `pasoIr` esconde el botón «← Atrás» cuando no hay paso anterior. Esto último sale del mismo cambio: dejar el botón a la vista sin que lleve a
  ningún lado sería peor que el defecto. Es la misma regla que ya tenía el primer paso («atrás» no se ofrece en el primero; `cuatro_pasos.js`), ahora medida sobre la barra y no sobre el número 1.
- 🪤 **Manda la pestaña, no `prevAplicaAlgo()`.** `prevAplicaAlgo()` lee el formulario (`fVA`, `fSop`) y puede cambiar DESPUÉS de abrir (la vía aérea se elige en el turno), mientras que la barra se arma una sola vez
  al abrir la cama. Si «Atrás» siguiera al formulario, podría caer en un paso sin pestaña: el mismo defecto con otra puerta. La guardia lo fija con ese caso exacto.
- Con la prevención visible nada cambia: desde el 2 «Atrás» SÍ va al 1 y lo ofrece. Desde el relato (6) sigue su propio camino (`pasoAtrasDesdeRelato`, con el aviso del retoque).

**Lo que ve distinto la kinesióloga.** En un paciente sin dispositivos (sin TOT, TQT ni VM), el turno es el primer paso y ya no aparece «← Atrás» ahí; antes el botón la llevaba a una pantalla vacía. En un paciente
con prevención, el recorrido es idéntico al de siempre. En un ingreso, desde el Turno «← Atrás» vuelve a la identificación (paso 0).

**La guardia (`build/checks/seis_pasos.js`, ampliada con la sección 8b).** Tres escenarios con la pantalla real y el reloj fuera de juego (la fecha del turno se inventa en `gDate`; el resultado no depende de la hora):
(a) sin dispositivos: «Atrás» no se ofrece en el 2, `pasoRetroceder` se queda en el 2 sin cartel vacío ni tarjeta de prevención, la ida pasa por 3, 4, 5 y la vuelta por 4, 3, 2, 2, y la barra manda aunque el
formulario cambie después a TOT + VM; (b) con prevención: «Atrás» se ofrece en el 2 y vuelve al 1; (c) ingreso: desde el 2 vuelve al 0. `abrir()` aprendió un cuarto parámetro para el paciente sin dispositivos.
**Roja antes: 10 fallos contra el `index.html` anterior** (llegaba al 1 con el cartel vacío, ofrecía el botón, en el ingreso caía en el 1 y no en el 0); **verde después**. Los controles de la prevención visible
salían verdes antes y deben seguir así. Vecinas (convenciones, `cuatro_pasos`, `paso_*`, `prevencion_navm`, `ingreso_*`, `movil*`, `validacion_entre_pasos`, `ktm_*`, `tutorial` y otras vecinas, 48 en total): todas verdes con `-j 2`;
`paridad_entrega` y `pwa_paquete` siguen rojas por la regeneración pendiente del cierre (`build/paquete_migracion/index.html` lo regeneró la guardia `paquete.js`).

**Lo que NO se hizo y queda dicho.**
- La pestaña 1 se decide una sola vez, al abrir la cama (así era). Si en el turno se elige una vía aérea o un soporte en un paciente que no tenía, la Prevención sigue sin aparecer hasta reabrir la cama; este paso
  no lo cambia (sería abrir un paso que el flujo acordó saltar) y lo deja fijado en la guardia como «la barra manda».
- Con ingreso y la pestaña 1 VISIBLE (caso raro: la cama ya traía dispositivos), «Atrás» desde el 2 sigue yendo al 1, como hasta hoy; «Siguiente» desde el 0 va derecho al 2. No se unificó para no mover lo acordado.
- Sin migración de esquema. `entrega/`, `pwa/` y la `VERSION` quedan para el cierre de la tanda.

---

## 10-oct-2026 · Tanda 5 · Limpieza visual del registro de evolución: el texto se lee, los títulos mandan por niveles, «Evolución» queda sola en la tarjeta y la barra cabe en el celular

**De dónde sale.** La auditoría de solo lectura de las tandas 3, 4 y 5 dejó, para la limpieza visual, siete cambios de diseño y siete preguntas para Diego. Se construyeron los siete en cinco pasos (5.1 a 5.5; siete commits, cada guardia vista ROJA antes
del arreglo) y este es el cierre. **Sin migración de esquema; solo cambia `v2/index.html`** (más herramientas y guardias de `build/`). **No se tocaron `guardar()`, `api()`, `gs()`, `_guardadoBotones`, la franja `#gEstadoGuardado` ni los `avErr*`**, ni lo acordado
(PVE, eventos de vía aérea a mano, KTR, tres ejes, el lugar de cada bloque). Las entradas de cada paso se conservan enteras más abajo, bajo «El detalle, paso a paso».

**La auditoría fue estática —leyó el CSS, no lo corrió— y al medir en Chromium cinco de sus hipótesis resultaron otra cosa.** Por eso cada paso empezó por medir y por una guardia que se vio roja:
1. **`#gFalta` no estaba bajo AA**: mide 4,501:1 sobre su fondo real. No se cambió (es además el ámbar de la barra, color con significado); queda de candado a tres decimales.
2. **El índigo de «Guardar» y «Siguiente» era código muerto**: la piel institucional lo pisaba siempre. Lo que de verdad diferenciaba al botón de la barra era un degradado, un resplandor azul y un «hover» que aclara en vez de oscurecer. Se unificó eso, en un commit aparte.
3. **La regla del botón desactivado nunca ganaba** (`#btnGuardar:disabled`): el degradado de la piel pesaba más. Lo que se veía era «Siguiente» con letra blanca sobre azul pálido, 2,68:1.
4. **El ➕ del pie de la cama no «llegaba corto» en el celular** (medía 51 × 38 px); sí el lápiz de la ficha (24 × 15) y los secundarios del traslado (31 px).
5. **La barra de abajo no desbordaba la pantalla**; lo que rompía era la insignia «Sin guardar» en la misma fila, que dejaba el botón principal en 141 px y partía «Siguiente: evaluaciones →» en tres líneas. Y los emojis nuevos que viven en producción eran **cinco**, no cuatro.

### Lo que cerró cada pieza

| Paso (commit) | Cambio del plan | Defecto que cerraba | Cómo queda | Guardia (roja antes, verde después) |
|---|---|---|---|---|
| **5.1** (08f8ade) | 1, 2 y 3 | Letra desde 9,3 px en el celular; texto gris, tres títulos de dominio, diagnóstico, icono de traslado (1,84:1) y «Egr.» bajo AA; «Siguiente» desactivado ilegible | Capturas del antes (`build/pantallazos.js`); `--muted` `#5B7793` → `#4A6580`; piso de 11 px (.7rem) solo en el celular; desactivado gris claro con letra oscura | `contraste_tokens.js` (6 rojas antes; 9 mutantes) y `piso_letra_celular.js` (16 rojas antes) |
| **5.2** (9babf13) | 4 | El título de un sub-bloque salía en 11 combinaciones y era **más chico que las etiquetas de sus campos**; «¿Quién midió?» al dejar un pendiente | Tres niveles con UNA tupla cada uno (T1 12,5 px, T2 11,5 px gris en mayúsculas, T3 la etiqueta); cuadro de firma «¿Quién deja / cierra el pendiente?» | `titulos_tres_niveles.js` (11 rojas; 12 mutantes) y `firma_texto_por_flujo.js` (5 rojas; 5 mutantes) |
| **5.3** (f5cd0c9) | 5 | «Evolución» —la acción de todas las camas— medía el 31 % del pie y se leía igual que «Egr.», verde y pegado a un ➕ de 51 px | «Evolución»/«Editar» sola en su fila a todo el ancho; Historial, ➕ y «Egreso» en una segunda fila, tres tercios iguales y neutros | `tarjeta_acciones.js` (43 rojas de 97; 14 mutantes) |
| **5.4** (24a421e, 392ba34, 8795dbe) | 6 y la pregunta 1 | Con «Sin guardar» el botón principal medía 141 px y se partía en tres líneas; botón de la barra con degradado y resplandor distintos del resto | La insignia en su propia fila (principal de 258 px, una línea) y `scroll-padding` para que la barra más alta no tape campos; **aparte (392ba34)**, un solo azul plano para todos los principales | `act_bar_390.js` (9 rojas; 12 mutantes) y `boton_principal_unico.js` (10 rojas; 12 mutantes) |
| **5.5** (40f8e09) | 7 | Nada vigilaba la regla «ningún emoji posterior a 2019» | Candado estático: rechaza cualquier emoji de 2020 en adelante fuera de comentarios que no esté en la lista de los cinco que ya viven en producción | `emojis_nuevos.js` (nace verde; el rojo se demostró con copias de `v2/`; 20 mutantes) |
| **Cierre** (este commit) | 8 | — | Sello `NEXT-5.9-limpieza-visual`; `entrega/`, `pwa/` y `build/paquete_migracion/` regenerados; batería completa | — |

### Lo que ve distinto la kinesióloga

- **En el celular, todo lo pequeño crece a un mínimo de 11 px**: la barra de abajo, los chips de ventilador y de equipos, las insignias de evaluaciones y pendientes, las tres palabras de estado de cada bloque, las etiquetas de campo y los títulos. No se pierde información ni se mueve un botón. En escritorio no cambia el tamaño de nada.
- **El texto gris secundario se lee más firme** (el mismo azul grisáceo, más hondo); el diagnóstico de la cama se lee mejor; el **icono de traslado deja de ser casi invisible**; y el «Siguiente» que todavía no puede avanzar pasa de azul pálido con letra blanca a **gris claro con letra oscura**.
- **Los títulos mandan.** El título de cada tarjeta («Respiratorio», «Hemodinamia»…) sube de 11,5 a 12,5 px y conserva su color de dominio en el punto y el borde; los de cada bloque dentro de la tarjeta van **todos en el mismo gris, en negrita y mayúsculas, a 11,5 px**, y ahora se leen antes que las etiquetas de sus campos. En Planes los tres bloques conservan su fondo y su borde de color, pero el título pasa a gris en mayúsculas.
- **En cada cama ocupada, «Evolución» (o «Editar») es un botón azul grande a todo el ancho**, solo en su fila; debajo, tres botones blancos iguales: «Hist.», ➕ y «Egreso» (que ya no es verde ni dice «Egr.»). La tarjeta es una fila más alta: el tablero del celular pasa de 3.414 a 3.810 px.
- **Mientras escribe, «⚠️ Sin guardar» es una franja de ancho completo arriba de los botones** (antes, una pastilla en la misma fila), y «Siguiente: evaluaciones →» se lee entero, en una línea, con «← Atrás» al lado. El botón grande de abajo pierde el degradado y el resplandor: es el mismo azul liso que «Evolución».
- **Al dejar un pendiente sin haber elegido firma, el cuadro dice «¿Quién deja el pendiente?»** (y «¿Quién cierra el pendiente?» al cerrarlo); las evaluaciones siguen diciendo «¿Quién midió?».
- Y algo que no se ve: un candado que impide que se cuele un emoji que en el Chrome de Windows 10 del hospital saldría como cuadrado.

### Lo que NO cambió

`guardar()`, `api()`, `gs()`, `_guardadoBotones`, `#gEstadoGuardado` y los `avErr*` no se tocaron; tampoco el servidor ni lo que se manda a él (`guardado_viajes` y `episodio_turno`, las guardias A/B del payload, siguen verdes y los viajes a hojas no subieron). Ninguna clase, id, `data-paso` ni `onclick` se renombró o movió. Los colores con
significado clínico (ámbar de heredado y pendiente, rojo de VM prolongada, alertas, «Falta:») no se tocaron. Los eventos de vía aérea se siguen registrando a mano. Ningún emoji existente se cambió, ni se agregó tema oscuro. No hay hoja ni columna nueva.

### Lo que queda abierto a propósito

- **Decisiones de Diego** (las siete de la auditoría y las que dejaron los pasos), en `docs/PENDIENTES.md`, sección 2f, cada una con su recomendación. Nueve están **ya implementadas con la opción recomendada y esperando confirmación** (✅): el texto gris global, el piso de 11 px, los tres niveles de título, los títulos sin color de dominio, la tarjeta de cama, el botón único, la firma del pendiente, «Egreso» y la franja «Sin guardar». Las más visibles de las que faltan: si se ve bien en la pantalla del hospital cada emoji de 2020 (hay **cinco**, y 🫁 está en 27 sitios), el rótulo del ➕ y los dos botones azules del traslado.
- **Hallazgos sin arreglar** (sección 4): la cabecera del panel desborda por debajo de 390 px (la ✕ de cerrar queda 20 px fuera a 360 px con un diagnóstico largo), el «sin registrar» en cursiva de cada bloque del celular (2,23:1; era el «vacío» apagado a propósito de la tanda 3), y la barra con franja de falla (160 a 180 px) que puede cubrir el borde de un campo enfocado.
- **No se midió en un aparato real**: todo se probó en el Chromium de Playwright con `google.script.run` simulado, reloj inventado y datos ficticios, no en el Chrome de Windows 10 del hospital ni con pulgar y guantes. La guardia de piso de 11 px mide el tablero, el traslado, la retrospectiva, los seis pasos y el ingreso; **Estadísticas, Entrega, la hoja «Más», los modales, Archivados y Ventiladores no se miden** y pueden seguir con letra bajo 11 px.
- **Las capturas del antes y el después viven fuera del repositorio** (carpeta de trabajo de la sesión); las del panel están con todas las tarjetas desplegadas y a alto completo, no como se ve en una pantalla de 844 px.

### Cierre de la tanda

- **Sello `NEXT-5.9-limpieza-visual`** en `build/empaquetar_cohete.js` y en los dos sitios del fuente (`<meta name="rce-version">` y el texto de «La app no pudo iniciar»). `entrega/`, `pwa/` y `build/paquete_migracion/` regenerados.
- **Batería completa (`-j 2`): 240 verdes, 0 rojas** (662 s). Eran 232 al cierre de la tanda 4; se suman las ocho guardias nuevas (`contraste_tokens`, `piso_letra_celular`, `titulos_tres_niveles`, `firma_texto_por_flujo`, `tarjeta_acciones`, `act_bar_390`, `boton_principal_unico`, `emojis_nuevos`).
  `paridad_entrega` y `pwa_paquete`, que durante los pasos estaban rojas por la regeneración pendiente, quedan verdes.
- **`node build/medir_guardado.js`** (viajes a hojas por acción): abrir 3, reabrir 3, turno nuevo **13**, re-guardar **17**, ingreso **13**, decanulación **13**, reintubación **14**. Los techos (14, 18, 14, 14, 15) no subieron: idénticos al cierre de la tanda 4, como corresponde a una tanda que no toca lo que `guardar()` manda ni el servidor.
- **Qué pegar** en el editor de Apps Script, desde `entrega/`: **solo `index.html`** (el cohete). Ningún `.gs` cambió desde el cierre de la tanda 4 (`node build/que_pegar.js f64fe38` lo confirma: 1 archivo). Si la planilla se quedó en 5.6 o 5.7 también basta ese archivo; si venía de 5.5 o antes, ver la lista de la tanda 2.
  Comparar con `cmp`, no a ojo: el portapapeles corrompe los acentos en archivos grandes.
- **¿`crearORepararEstructura()`?** **No hace falta**: `esquema.gs` y `mantenimiento.gs` no cambian; no hay hoja ni columna nueva.
- **Cómo se publica:** nueva versión de la implementación web de la **planilla de NEXT** (nunca la del hospital) y recargar la app instalada para que el sello de versión renueve su caché. El sello `NEXT-5.9-limpieza-visual` debe aparecer en «Cargando…»; si no aparece, lo pegado no es lo nuevo. Recordatorio de la tanda 2: la prueba con DOS aparatos sigue pendiente antes de pegar en NEXT.
- **Cómo revertir:** cada paso es un commit (08f8ade, 9babf13, f5cd0c9, 24a421e, 392ba34, 8795dbe, 40f8e09) y el cierre es otro; `git revert` deshace lo que se quiera. **El botón único va aparte a propósito: `git revert 392ba34` devuelve el degradado y el resplandor sin tocar la corrección de la barra.** Ninguna columna cambió, así que no hay datos que migrar de vuelta.

### Para no olvidar (de toda la tanda)

- 🪤 **Una auditoría estática propone; el navegador dispone.** Cinco hipótesis cambiaron al medirlas (arriba). Se mide primero (`build/pantallazos.js` da la letra más chica de cada pantalla y el alto de cada botón) y se escribe la guardia roja después; una guardia que sale verde de entrada se deja de candado y NO se «arregla» el código por ese punto.
- 🪤 **Una regla que existe puede no ganar nunca.** `#btnGuardar:disabled` y el índigo estaban escritos y no se veían: la piel institucional pesaba más. Se mide el estilo que pinta el navegador (`getComputedStyle`), no lo que dice la hoja.
- 🪤 **Una regla móvil más tardía y de igual especificidad gana a la base.** El piso de 11 px se llevaba los títulos de vuelta a .7rem hasta que se sacaron de su lista: «una sola tupla por nivel» no admite una segunda regla por ancho.
- 🪤 **Una guardia que mide un instante de una animación da distinto según CUÁNDO** (la misma familia del reloj congelado): el globo `#tutHola` a medio fundido daba 1,38:1 solo bajo carga; `.btn{transition:all .18s}` daba un botón transparente a medio camino; el panel entra con una transición que corre con el reloj real. Se espera a que la animación termine.
- 🪤 **Un `grep` pelado no vigila emojis.** La ratonera 🪤 que marca las trampas del proyecto es un emoji de 2020 (224 líneas, todas en comentarios) y el 🩻 prohibido está seis veces, también en comentarios; y el fuente escribe emojis como `&#x…;`. La guardia lee comentarios de verdad y decodifica las cuatro formas.
- 🪤 **Un mutante que empieza vivo es información.** Varios empezaron vivos (el `:hover` azul que le gana a la clase de la cama libre; la insignia fuera del `@media`; `white-space:nowrap` en el principal; un índigo solo para cuando no hay piel) y cada uno le sumó una condición a su guardia.
- 🪤 **Subir la letra cuesta en otro lado y hay que medirlo.** Con .72rem «Fijación · cm de arcada dental» pasaba a tres líneas; se dejó en .7rem con el espaciado en .03em y la guardia lo exige. Pagó la lección de `legibilidad.js`, que mide a 1400 px y no lo ve.

### El detalle, paso a paso

Las cinco entradas que siguen son las que se escribieron durante la tanda, sin cambios de contenido (solo bajaron un nivel de título).

### 10-oct-2026 · Tanda 5 · Limpieza visual del registro de evolución · paso 5.1: ver el antes, contraste y piso de letra en el celular

**De dónde sale.** La auditoría de solo lectura de las tandas 3, 4 y 5 dejó, para la limpieza visual, siete cambios de diseño. Los tres primeros (este paso) son los que se pueden **medir**: cómo se ve hoy,
qué texto no llega a contraste AA (4,5:1) y qué texto se lee bajo 11 px en el celular. La auditoría fue estática —calculó los contrastes desde el CSS y supuso las envolturas— y avisó que sus hipótesis había que mirarlas
en pantalla. **Sin migración de esquema, sin tocar HTML ni JS de la app**: todo es CSS en `v2/index.html`, más la herramienta de capturas y dos guardias nuevas.

### Cambio 1 · Las capturas del antes (`build/pantallazos.js`, herramienta, no guardia)

`node build/pantallazos.js [carpeta] --solo-registro` saca **los seis pasos del panel y el tablero** (normal, en modo traslado y en vista retrospectiva) a **390 px y a 1400 px**, con el arnés simulado y datos
ficticios, y vuelca `medidas.json` (la letra más chica que se ve en cada pantalla, y alto/ancho de los botones del pie de cada tarjeta y de la barra). Tres cuidados que costaron una vuelta:
- 🪤 **El reloj va congelado** en el martes 10-mar-2026 10:00 (`clock.setFixedTime`, que deja correr los temporizadores; fecha inventada, fuera de las ventanas trampa). Con el reloj de pared el antes y el después se tomaban en
  días distintos —otra cuenta de días de estadía, otra mascota— y no se podían comparar.
- 🪤 **El panel se fotografía a alto completo** (la ventana se agranda hasta que el contenido entra: el panel es una caja con su propio desplazamiento) y con **todas las tarjetas y sub-bloques desplegados**, porque en el celular el
  acordeón los trae plegados. La mascota flotante se oculta (tapaba una esquina de cada foto del tablero).
- 🪤 **«⚠️ Sin guardar» lo prende un temporizador de 2 s** (`_tickSinGuardar`): según la fase en que cayera la foto, el antes salía sin la insignia y el después con ella, y el botón principal medía 354 px en una y 236 en la otra
  sin que nada hubiera cambiado. Se llama al tick a mano antes de cada foto de paso.
Las capturas del antes y el después viven **fuera del repositorio** (carpeta de trabajo de la sesión, `capturas/antes` y `capturas/despues`) para enseñárselas a Diego en tema claro.

**Lo que se vio en el antes (medido, no calculado).**
- **A 390 px la letra más chica era de 9,3 px**, y no un caso suelto: la barra de abajo (`.mnav button`, .58rem), los chips de ventilador y de equipos de la cama (`.vmtag` 9,9 y `.eqtag` 9,6), los chips de evaluaciones y pendientes (`.abadge` 10,7), las **tres palabras de
  estado** de cada tarjeta del Turno (`.mpal`, 9,9: la tanda 3 las puso para leerlas de un vistazo y quedaron en el tamaño menos legible), las etiquetas de casi todos los campos (`.col label`, 10,6) y los títulos de sub-bloque (10,9). Por pantalla: tablero 9,3 · paso 1 9,9 · paso 2 9,3 ·
  paso 3 9,9 · paso 4 9,9 · paso 5 9,3 · paso 6 10,7.
- **A 1400 px la letra más chica es de 9,3 a 10,7 px** según la pantalla (el tablero 9,6; el paso 2 baja a 9,3 por textos con tamaño en línea como «GCS», y el paso 5 a 9,3 por `.cg-r`, «va al relato de hoy»). El escritorio **no se toca en este paso**: el piso de 11 px es del celular y unificar los títulos es el cambio 4 de la tanda.
- Dos hallazgos que la auditoría no tenía. **(1)** La regla del botón principal desactivado (`#btnGuardar:disabled,#pasoAvanza:disabled`, gris `#94a3b8`) **nunca ganaba**: el degradado azul de la piel institucional pesa más (id + atributo + elemento contra id + pseudoclase). Lo que se veía era el degradado con la
  opacidad .55 que `prevAvanceUI` le pone en línea al «Siguiente» del paso 1: letra blanca sobre `#73a3cb`, **2,68:1**; y mientras se guarda (`_guardadoBotones` lo desactiva SIN opacidad) seguía igual de azul que uno activo. **(2)** La etiqueta «Fijación · cm de arcada dental» (columna de 104 px)
  pasa de dos líneas a **tres** si las etiquetas suben a .72rem, y estira la fila entera: justo el defecto por el que existe `legibilidad.js`, que mide a 1400 px y no lo ve.

### Cambio 2 · Contraste: oscurecer lo que no llegaba a AA, sin cambiar la paleta (solo tema claro)

| Qué | Antes (medido sobre el fondo real) | Después |
|---|---|---|
| `--muted` (piel institucional) `#5B7793` → `#4A6580`, el gris azulado de TODO el texto secundario | sobre el fondo de la app 4,18 · sobre el manila de la cama 3,69 · sobre la cama libre 4,12 · sobre la pestaña de cama 3,93 | 5,43 · 4,80 · 5,35 · 5,11 · el peor par de toda la app mide **4,80** |
| Título de tarjeta: `--fc-t` solo en `.fc-h` (`#a8403a`), `.fc-k` (`#8f5400`) y `.fc-imt` (`#0369a1`); `.fcard-title` lo usa con respaldo (`var(--fc-t,var(--fc,…))`). El punto y el borde superior siguen con `--fc`: el dominio no pierde su color | Hemodinamia 4,42 · Rehabilitación 4,20 · IMT 4,10 | 6,07 · 6,11 · 5,93 |
| `.bdx` (diagnóstico de la tarjeta) `#64748b` → `#475569` | 3,77 | 6,00 |
| `.bmov` (icono de traslado) `#94a3b8` → `#475569` | **1,84** sobre la pestaña manila: casi invisible | 5,43 |
| `.balt` («Egr.») texto `#0F8A5F` → `#0b7a52` (el borde sigue en `--ok`) | 4,36 | 5,36 |
| Botón principal DESACTIVADO (`.btn-p:disabled` y `#btnGuardar/#pasoAvanza:disabled`, en la piel y en la regla base): gris `#e2e8f0` con letra `#475569`, sin sombra, y **sin la opacidad en línea** (`!important`; también pisa el `:hover`) | 2,56 (muestra suelta) y **2,68** (el «Siguiente» real del paso 1) | 6,15, y el desactivado es el MISMO se desactive por falta de datos o por estar guardando |

- 🪤 **`#gFalta` NO se tocó.** La auditoría proponía oscurecerlo (`#b45309` → `#92400e`) porque «en el borde» daba 4,50. **Medido sobre el fondo real da 4,501:1: pasa AA**, así que la hipótesis no se confirmó y no se cambia (es además el ámbar de la barra, color con significado). Queda de candado en la guardia, que mide a tres decimales.
- **No se tocó el ámbar ni el rojo con significado clínico** (heredado/pendiente, VM prolongada, alertas, «Falta:»), ni `#gEstadoGuardado`, `[data-estado]`, `_guardadoBotones`, `guardar()`, `api()` ni los `avErr*`. Solo grises, títulos y el desactivado. Sin `color-mix` ni nada nuevo para el Chrome de Windows 10, y ningún bloque oscuro.
- Es el cambio global que Diego tiene que mirar (decisión 7 de la auditoría): el texto secundario de toda la app se ve **algo más hondo, el mismo azul grisáceo**. Se aplicó la recomendación de la auditoría; revertir es una línea (`--muted` de la piel).

### Cambio 3 · Piso de letra de 11 px (.7rem = 11,2 px) en el celular

Todo **dentro del `@media (max-width:740px)` que ya existía**, al final del bloque; en escritorio no cambia nada (lo mide la guardia y lo confirman las capturas: las nueve pantallas de 1400 px miden lo mismo al píxel, antes y después, y la letra más chica de cada una es la misma).
- Clases: `.mnav button` .58 → .7rem; `#mPac .ch` .65 → .7; `.mst` .62 → .7; `.vmtag, .eqtag, .abadge, .mpal` → .7rem; `.sub-sec-title, .pe2-t, .msub-t, .cg-r, .pv-sep span, #fcId .bloqueT, #aetTurno .aetT-tit` → .7rem.
- **Etiquetas de campo `.col label` a .7rem con el espaciado en `.03em` (antes `.05em`) y NO a .72rem**: con .72rem «Fijación · cm de arcada dental» pasaba a tres líneas (hallazgo 2 de arriba); a .7rem y .03em cabe en dos a 104 px. Lo mide la guardia en el celular.
- Los **títulos en línea** (`font-weight:800` + `text-transform:uppercase`) que una regla global aplasta a .62rem con `!important` se la ganan en el celular con la misma especificidad y un número mayor: `#sp [style*="font-weight:800"][style*="text-transform:uppercase"]{font-size:.7rem!important}`.
- Los tamaños **en línea de .5 a .69rem** dentro de `#sp`, `#bedGrid` y `.htitle` suben a .7rem con selector de atributo (`[style*="font-size:.6"]` y parientes, con y sin espacio) —la misma técnica que ya usaba la regla de los títulos—, **sin reescribir ninguno de los ~1.750 estilos en línea**.
- Quedan fuera los iconos (`.mnav .mi`, 20 px) y los números grandes. El texto corrido ya estaba sobre 12 px: se levanta el piso, no se cambia la jerarquía.
- **Medido en las capturas del después, a 390 px: la letra más chica de cada pantalla pasa a 11,2 px** (tablero, los seis pasos). **Nada se rompe**: ningún chip se pisa ni se sale de la tarjeta, las etiquetas siguen en dos líneas, la barra inferior cabe («Estadíst.» entra), la botonera no se mueve. El tablero mide **el mismo alto** que antes (3.414 px de pantalla); el panel
  crece 16 px en el paso 2, 6 en el paso 5 y 1 en el paso 4, y los pasos 1, 3 y 6 no cambian. Sin chip que corregir, así que no hizo falta darle espacio a ninguno ni bajar el piso.

### Las dos guardias nuevas (cada una vista ROJA antes del arreglo, VERDE después)

**`build/checks/contraste_tokens.js`.** Abre el tablero y los seis pasos del panel (más el ingreso) en Chromium a 1400 y a 390 px, con el reloj congelado y datos ficticios, y mide con `getComputedStyle` sobre **el fondo real que pinta el navegador** (capas, degradados y opacidad compuestos; con un degradado mide la peor parada) —a diferencia de
`piel.js`, cuyos pares son hex escritos en la guardia y no lee el CSS—. (A) **Barrido de `--muted`**: todo texto visible cuyo color computado ES `--muted` mide ≥ 4,5:1 (se miden 331 textos y se exige haber VISTO etiqueta de campo, texto de la cama libre y edad/sexo de la tarjeta; no es una lista de selectores: un `color:var(--muted)` nuevo sobre un
fondo oscuro lo ve). (B) **Lista cerrada** de pares que no son `--muted`: título de cada tarjeta (24 medidos), `.bdx`, `.bmov`, `.balt`, `#gFalta` y el botón principal desactivado (el «Siguiente» real del paso 1, `#btnGuardar` forzado y una muestra de `.btn-p`); agregar un par es una decisión consciente. (D) Sin bloque oscuro.
**Roja antes contra el `index.html` del commit anterior: 6 fallan** (el barrido de `--muted`, con 3,69 como peor par; los títulos, 4,10; `.bdx`, 3,77; `.bmov`, 1,84; `.balt`, 4,36; el desactivado, 2,56); `#gFalta` ya salía verde (4,501) y la sección C se ve verde. **Verde después.**

**`build/checks/piso_letra_celular.js`.** Chromium a 390×844 táctil, reloj congelado en el 10-mar-2026 10:00: tablero con el máximo de chips (ventilador, equipos del paciente, prono, KTM suspendida, evaluaciones envejecidas y pendientes), modo traslado y vista retrospectiva; los seis pasos del panel y el ingreso con TODO desplegado, y una segunda pasada con las ramas ocultas
destapadas (PVE, extubación, TQT, AET, procedimientos), porque un texto chico podía esconderse en una rama que la corrida no abrió. Falla si **cualquier texto visible** mide menos de 11 px (lista cerrada de excepciones: solo `<sub>`/`<sup>`, que el navegador reduce a propósito). Además mide **lo que cuesta subir la letra**: etiquetas en tres líneas o más, texto cortado sin
elipsis, chips de ventilador/equipos que se pisan, insignias fuera de la tarjeta y pantalla que se sale por la derecha; y que **el escritorio sigue en su tamaño de siempre** (`.abadge` 10,7 px y etiquetas 10,9 px a 1400 px). **Roja antes: 16 fallan** (la barra de abajo 9,3 px, `.eqtag` 9,6, `.vmtag` 9,9, `.mpal` 9,9, los títulos en línea 9,9, las etiquetas 10,6, etc., en tablero, traslado, retrospectiva, los seis pasos, las ramas ocultas y el ingreso);
las comprobaciones de «nada se rompe» salían verdes antes y deben seguir así. **Verde después.**
**Mutantes (9 de 9 mueren, cada uno por la razón que corresponde):** volver la barra de abajo a .58rem; quitar la regla de los tamaños en línea; sacar `.abadge` del piso; etiquetas a .72rem (cae por «etiqueta en 3 líneas» y por ninguna otra); escribir el piso fuera del `@media` (cae por «escritorio no cambia»); `--muted` de vuelta; sin `--fc-t` en Hemodinamia; sin la regla del desactivado de la piel (el degradado azul gana y la letra oscura sobre azul mide 1,03:1); `.bmov` de vuelta.

**Vecinas.** Batería completa con `-j 2`: **232 verdes de 234**; las 2 rojas son `paridad_entrega` y `pwa_paquete`, por la regeneración pendiente del cierre de la tanda (`build/paquete_migracion/index.html` lo regeneró la guardia `paquete.js`). Tras tocar la regla base del desactivado, repetidas las guardias de la zona con `-j 2` (contraste, piso, `piel`, `convenciones`,
`legibilidad`, `movil*`, `tokens_existen`, `escapado_unico`, `seis_pasos`, `guardado*`, `confirma*`, `tutorial`, `fallo_guardado`, `aviso_error*`, `estado_*`, `paquete`): 27 verdes de 28, la roja es `pwa_paquete`.

**Lo que ve distinto la kinesióloga (en el celular).** Todo lo pequeño crece a un mínimo de 11 px: la barra de abajo, los chips de ventilador y equipos, las insignias de evaluaciones y pendientes, las tres palabras de estado de cada bloque, las etiquetas de los campos y los títulos de sub-bloque. En ningún sitio se pierde información ni se mueve un botón. En escritorio no cambia el tamaño de nada. En los dos:
el texto gris secundario se lee más firme; los títulos de Hemodinamia, Rehabilitación e IMT son un poco más oscuros (el color del dominio sigue en el punto y el borde); el diagnóstico de la cama y «Egr.» se leen mejor; **el icono de traslado deja de ser casi invisible**; y el botón «Siguiente» sin poder avanzar pasa de azul pálido con letra blanca a gris claro con letra oscura, que se lee y se entiende como «todavía no».

**Lo que NO se hizo y queda dicho.**
- **`.mres.vacio`** («sin registrar» en cursiva gris en la cabecera de cada bloque del celular, `#b3ada2`) mide **2,23:1**. No estaba en la auditoría y es una decisión de diseño de la tanda 3 (el «vacío» apagado a propósito, junto a la palabra de estado); no se tocó. Queda anotado por si Diego quiere que también se lea.
- **El escritorio sigue con letra de 9,3 a 10,7 px** en los títulos en línea y en los chips; el piso de 11 px es solo del celular, como acordó la auditoría. Unificar los tres niveles de título (cambio 4) y el pie de la tarjeta (cambio 5) son otros pasos.
- Sin tocar los emojis posteriores a 2019 que ya viven en producción (decisión 4 de la auditoría, para Diego), ni los dos botones primarios de colores distintos (decisión 1), ni la palabra «Evolución»/«Editar» (decisión 2).
- Sin migración de esquema. `entrega/`, `pwa/` y la `VERSION` quedan para el cierre de la tanda.

---

### 10-oct-2026 · Tanda 5 · Limpieza visual del registro de evolución · paso 5.2: tres niveles de título y el cuadro de firma de los pendientes

**De dónde sale.** Cambio 4 del plan de la tanda 5 (auditoría de solo lectura): un solo estilo de título de bloque, en tres niveles que se distingan. Más un arreglo de texto chico que estaba anotado desde la tanda 4 (punto 10 de `docs/PENDIENTES.md`): el cuadro que se abre al dejar
un pendiente preguntaba «¿Quién midió?». **Sin migración de esquema, sin tocar `guardar()`, `api()`, `gs()`, `_guardadoBotones`, la franja `#gEstadoGuardado` ni los `avErr*`.** Todo es CSS y dos textos en `v2/index.html`, más dos guardias nuevas.

### Cambio 4 · Tres niveles de título, UNA tupla por nivel (solo CSS y cinco atributos `style`)

**El defecto, medido (no calculado).** Con el panel abierto en Chromium, los seis pasos desplegados y las ramas ocultas destapadas, el título de un sub-bloque salía en **11 combinaciones** de tamaño, peso, espaciado y color (69 mediciones a 1400 px, 75 a 390 px):
`.sub-sec-title` (10,9 px, azul de Respiratorio, ámbar de Rehabilitación o turquesa de Evaluaciones puestos en línea), `.pe2-t` (10,9 px, `.08em`), `.pv-sep span` (10,6 px), `#fcId .bloqueT` (peso 700, gris de otro token), `#aetTurno .aetT-tit` (peso 700, morado),
los **29 títulos escritos en línea** con peso 800 y mayúsculas —«GCS», «Nivel de cooperación y delirium», «Traqueostomía», «Permeabilización de vía aérea», los seis `<summary>` plegables…— que una regla global aplastaba a **.62rem = 9,9 px** con `!important`, `.msub-t` (azul, solo celular) y los
tres bloques de Planes (`.cg-t`: 12,8 px, sin mayúsculas, un color por bloque). Consecuencia: **el título de un sub-bloque (9,9 px) era más chico que la etiqueta de cualquiera de sus campos (10,9 px)**, y en el celular, con el piso de 11 px del paso 5.1, T2 y T3 quedaron **idénticos** (11,2 px). El título no mandaba.

**La regla (la escalera de a un escalón; el dominio sigue marcándose con el punto y el borde de la tarjeta):**

| Nivel | Qué es | Antes | Ahora |
|---|---|---|---|
| T1 | título de tarjeta (`.fcard-title`) | .72rem · 800 · mayúsculas · .08em · color de dominio | **.78rem** (12,5 px), lo demás igual |
| T2 | título de sub-bloque | 11 combinaciones, de 9,9 a 12,8 px | **UNA: .72rem (11,5 px) · 800 · mayúsculas · .06em · `--muted`**, en escritorio y en celular |
| T3 | etiqueta de campo (`.col label`) | .68rem (10,9 px); .7rem en celular | **sin cambio** |

- La tupla de T2 se escribe **una sola vez**, junto a `.fcard-title`, para siete selectores (`.sub-sec-title, .pe2-t, .msub-t, .pv-sep span, #fcId .bloqueT, #aetTurno .aetT-tit, .cg-t`); en la regla de cada familia queda solo lo de caja (márgenes, flex). Los títulos escritos en línea los iguala la misma regla global de siempre (línea «Títulos de sub-sección inline»), que solo cambia de número:
  `.62rem → .72rem`, `.05em → .06em`; no se agregó ningún selector. Esa regla ya forzaba `--muted` sobre su color propio con `!important`, así que el criterio «el título de sub-bloque es gris» **ya existía**; los cinco `.sub-sec-title` con color en línea solo se habían escapado porque su `style` no traía `font-weight`.
- 🪤 **El piso móvil del paso 5.1 se llevaba los títulos a .7rem** (una regla más tardía dentro del `@media`, con la misma especificidad, gana a la base). Se sacaron esos selectores de la lista (queda solo `.cg-r`) y se borró la segunda regla de títulos en línea de ese bloque: T2 vale .72rem en los dos anchos, que ya está sobre el piso, y una sola tupla no admite una segunda regla por ancho.
- **Planes (`.cg-t`).** Los tres títulos de bloque («Qué pasó hoy», «Plan para el próximo turno», «Lo que queda pendiente») tenían forma propia y eran **más grandes que el título de su propia tarjeta** («Cerrar el turno»); además el ámbar de «Lo que queda pendiente» medía 3,07:1 sobre su fondo. Pasan a T2. **El color de cada bloque no se pierde:** lo siguen llevando el borde izquierdo y el fondo (`.cg-narra/.cg-plan/.cg-pend`), y el reloj va en `.cg-r`. Los textos no se tocaron (la mayúscula es de CSS; `cierre_tres_bloques.js` los compara sin distinguir mayúsculas).
- **Los colores de dominio salen de los títulos de sub-bloque** (Respiratorio azul, Rehabilitación ámbar —4,20:1 sobre blanco, bajo AA—, Evaluaciones turquesa, AET morado, `.msub-t` azul): quedan en el punto y el borde de la tarjeta, que es lo que dice a qué dominio se pertenece. Cinco `style="color:var(--…)"` salieron del HTML (`Terapia ventilatoria`, `Manejo Respiratorio`, `Evaluaciones`, `Válvula de fonación`, `KTM`); es lo único que se tocó del marcado, y ningún texto, clase, id ni `data-paso`.
- **No se tocó**: `.col label` (T3), los rótulos de columna en línea con peso 700 de la tarjeta de Permeabilización («Técnica», «Secreciones»: nivel de etiqueta), `.cg-r`, `.mpal`, ni el resto de inline con tamaño propio. Sin emojis nuevos, sin tema oscuro.

**Guardia nueva `build/checks/titulos_tres_niveles.js`** (Chromium a 1400 y a 390 px, reloj congelado 10-mar-2026 10:00, datos ficticios; los seis pasos con todo desplegado y las ramas ocultas destapadas, más el ingreso de un paciente nuevo): una sola tupla (tamaño, peso, mayúsculas, espaciado, color) para T2 y su color es el token `--muted`;
una sola tupla para T1 salvo el color de dominio; T3 una sola por ancho; la escalera T1 > T2 > T3 con los **extremos** de cada nivel y un escalón mínimo (0,8 px de T1 a T2, 0,3 px de T2 a T3); el título de un sub-bloque nunca es más chico que la etiqueta normal de sus campos; ningún título de tarjeta pasa de dos líneas ni queda cortado a 390 px;
y un **barrido** de cualquier otro texto en mayúsculas y peso ≥ 700 del panel que no esté clasificado (lista cerrada de excepciones con su motivo), para que un quinto estilo no entre sin que nadie lo decida. Exige haber VISTO cada familia (`.msub-t` solo en celular, `.bloqueT` solo en el ingreso).
**Roja antes contra el código anterior: 11 fallan** (6 a 1400 px y 5 a 390 px: una sola tupla con 11 distintas, color, peso/mayúsculas, escalera con T2 = 9,9 px bajo T3 = 10,9 px a 1400 y T2 = T3 a 390, escalón); verde después. **12 de 12 mutantes mueren, cada uno por su razón:** `.pe2-t` con su tamaño de antes, la regla en línea a .62rem, `.cg-t` con su .8rem, `.cg-t` con el color del bloque, T1 a .72rem,
`.aetT-tit` morado, `.msub-t` azul en el celular, el piso móvil volviendo a listar los títulos, un quinto estilo (`.cg-s` en mayúsculas y 800), un `.sub-sec-title` con color en línea, T2 = T3 y un título de tarjeta de 1,6rem que pasa de dos líneas.

### Arreglo de texto · «¿Quién midió?» al dejar un pendiente

`_pedirFirma()` abre un cuadro con el título «¿Quién midió?» y el mensaje «La firma viaja con la medición: dice de dónde salió el dato». Está bien para quien registra una evaluación, pero la **misma función** la usan los pendientes (dejar uno desde el campo libre o un atajo, y cerrarlo desde la cama), y ahí preguntaba quién midió algo que nadie midió.
Como la firma del formulario es lo primero que mira, el cuadro solo sale cuando todavía no se eligió firma —justo el caso de quien llega a Planes y deja un pendiente antes de firmar—, y por eso se veía poco. Ahora `_pedirFirma(txt)` acepta `{titulo, mensaje}` y sin argumentos queda igual que antes (las evaluaciones no cambian):
- **Dejar un pendiente** → «¿Quién deja el pendiente?» / «La firma queda con el pendiente: dice quién lo dejó para el turno que viene.» (pedido por la tarea).
- **Cerrar un pendiente** desde la cama → «¿Quién cierra el pendiente?» / «La firma queda con el cierre: dice quién lo dio por resuelto.» (**extensión mía**: es el mismo cuadro con el mismo texto equivocado, un argumento más en el otro llamador; si Diego prefiere el cierre como estaba, es una línea: `pendEpiCerrar` vuelve a llamar sin argumentos).

**Guardia nueva `build/checks/firma_texto_por_flujo.js`** (Chromium, reloj congelado, el cuadro de verdad —no una función sustituida—): dejar por el campo libre y por un atajo; cerrar desde la cama; las evaluaciones siguen diciendo «¿Quién midió?» (por el camino real de ECF desde la tarjeta y por la llamada sin argumentos); y que los flujos sigan andando (elegir firma y confirmar deja y cierra el pendiente en el servidor
simulado; cancelar no manda nada). **Roja antes: 5 fallan** (los tres textos de «dejar» y los dos de «cerrar»; las evaluaciones y el e2e ya salían verdes); verde después; **5 de 5 mutantes mueren** (dejar sin su texto, cerrar sin su texto, la función ignora el texto, el texto por defecto de las evaluaciones cambia, el mensaje de «dejar» vuelve a hablar de medición).
🪤 Para que el e2e escriba hubo que completar el simulador con `infra_lock.gs` (el sello `_huellaPayload`), igual que `acceso_pantalla.js` y `terapia_fisica_vuelve_al_reabrir.js`, devolviendo su `conLock` de juguete.

### Vecinas y capturas

Con `-j 2`: convenciones, legibilidad, piel, movil*, seis_pasos, cuatro_pasos, ingreso*, cierre_tres_bloques, sin_riel, general_disuelta, tutorial, tokens_existen, escapado_unico, contraste_tokens, piso_letra_celular, estado_*, aviso_*, obligatorios, v42, guardado_seguro*, episodio_turno, texto_*, evaluaciones_celular, retro_camas, mover_camas, ficha_y_antes, episodio_al_guardar,
confirma_guardado, prono_arriba y paquete: **52 verdes de 53; la roja es `pwa_paquete`**, por la regeneración pendiente del cierre de la tanda (`build/paquete_migracion/index.html` lo regeneró `paquete.js`). Capturas del después (fuera del repositorio, carpeta de trabajo `capturas/despues`): los seis pasos a 390 y 1400 px y el cuadro de firma, comparables con las de `antes`
(la versión anterior de los doce pasos quedó en `despues_antes_de_5.2`).

**Lo que ve distinto la kinesióloga.** Los títulos de cada bloque dentro de una tarjeta («Terapia ventilatoria», «GCS», «Lo que este episodio lleva medido», «Antes de la terapia», «Se registran solos con la evolución»…) pasan de 9,9–10,9 px a **11,5 px, siempre en el mismo gris, en negrita y mayúsculas**: ahora se leen **antes** que las etiquetas de sus campos (10,9 px). El título de cada tarjeta («Respiratorio», «Hemodinamia», «Cerrar el turno»…) sube de 11,5 a 12,5 px y sigue
con el color de su dominio y su punto. En Planes, los tres bloques conservan su color de fondo y de borde, pero su título pasa de azul/verde/ámbar en minúscula grande a gris en mayúsculas, y en el celular el rótulo del reloj («va al relato de hoy») baja a su propia línea en los tres. Al dejar un pendiente sin haber elegido firma, el cuadro dice «¿Quién deja el pendiente?» y, al cerrarlo, «¿Quién cierra el pendiente?».

**Lo que NO se hizo y queda dicho.**
- **El escalón T2 → T3 en el celular es de 0,3 px** (11,5 contra 11,2): el piso de 11 px deja la etiqueta de campo en .7rem y no se puede bajar. Los separan el peso (800 contra 700), el espaciado (.06em contra .03em), el gris de T2 sobre un bloque propio y la posición (el título abre el grupo). Si en la pantalla real no alcanza, el paso siguiente es subir los dos niveles superiores juntos (T2 .74rem, T1 .8rem), no bajar T3.
- **Decisión 6 de la auditoría («¿Subimos el título de cada tarjeta un escalón?»)**: el cambio 4 la lleva adentro (sin el escalón de T1 no hay tres niveles), así que se aplicó la recomendación («sí»); revertir es `.fcard-title{font-size:.72rem}`, y entonces la guardia pide reconciliar la escalera (T1 = T2).
- **Quitar el color de dominio de los títulos de sub-bloque y de los tres de Planes** es parte de «una sola tupla» según el diseño de la auditoría; si Diego quiere conservarlo en alguna familia, se acepta como excepción escrita en la guardia, no con una segunda regla.
- Sin tocar los emojis posteriores a 2019, los dos botones primarios, la palabra «Evolución»/«Editar», ni los 18 chips y las sugerencias «Medir X» de Planes (el resto del punto 10 de PENDIENTES: queda para Diego). Sin migración de esquema. `entrega/`, `pwa/` y la `VERSION` quedan para el cierre de la tanda.

---

### 10-oct-2026 · Tanda 5 · Limpieza visual del registro de evolución · paso 5.3: la tarjeta de cama dice cuál es la acción de todos los turnos

**De dónde sale.** Cambio 5 del plan de la tanda 5 (auditoría de solo lectura): «Evolución primero y sola; Historial, evento y Egreso en una segunda fila, todos secundarios». Es **CSS más tres líneas de HTML** en `v2/index.html`: no se renombra ninguna clase ni id, no se cambia ningún `onclick`, no se mueve nada en el DOM, no se toca `guardar()`, `api()`, `gs()`, `_guardadoBotones`, la franja `#gEstadoGuardado` ni los `avErr*`, y no hay migración de esquema.

### El defecto, medido (no calculado)

El pie de la tarjeta (`.bfoot`) llevaba **cuatro botones con el mismo peso en una sola fila** (`flex-grow:1` y envoltura libre). Con el tablero en Chromium a 390 y a 1400 px:
- **«📝 Evolución» —la acción de todas las camas en todos los turnos— medía el 31 % del pie** (26 % «Editar»), y se leía igual que **«🏠 Egr.»** (21 %), que es la acción **menos frecuente y la más difícil de deshacer**, y encima iba **en verde**, el color de «lo bueno».
- El botón de evento **➕ era un icono solo, de 51 px (celular) y 40 px (escritorio)**: el más difícil de acertar con el pulgar, y quedaba pegado al de egreso.
- En el modo traslado los cinco botones se repartían la fila a anchos distintos (el ➕ medía 90 a 157 px según la cama) y los tres secundarios medían **31 px de alto** contra los 38 del `.bevo`.
- El lápiz de la ficha (`.pname-lap`) tocaba **24 × 15 px** en el celular.
- (La hipótesis de la auditoría de que el ➕ «no llega a 36 px» **no se confirmó** en la fila normal del celular: medía 51 × 38; solo se veía corta en escritorio, y el mínimo de 36 px es del celular. Sí se confirmó en el lápiz y en los secundarios del traslado.)

### El cambio

| Qué | Antes | Ahora |
|---|---|---|
| `.bevo` («Evolución» / «Editar» / «Ver / editar» y los botones del traslado) | `flex-grow:1`, compartía fila | `flex:1 1 100%`: **fila propia a todo el ancho**; relleno vertical 7 → 9 px (al quedar solo ya no lo estira la fila de al lado y medía 29 px contra los 31 de los secundarios: **la acción principal no puede ser la más baja**) |
| `.btl` (Historial y evento) y `.balt` (Egreso) | cada uno a su aire; `.balt` verde con borde verde; `.btl` con la letra negra del navegador | **una sola fila, tres tercios iguales** (`flex:1 1 0; min-width:0`), **un solo aspecto**: fondo blanco, borde `#cbd5e1`, letra `#334155`, sin envoltura (`nowrap`) |
| Rótulo del egreso | «🏠 Egr.» | **«🏠 Egreso»** (decisión 3 de la auditoría: cabe en el tercio de la fila; el egreso se distingue por la palabra, no por el color) |
| Celular: alto de `.btl` y `.balt` | 31 px en las filas propias (los 38 de antes eran del estiramiento de la fila) | `min-height:38px`, como `.bevo` |
| Celular: lápiz de la ficha | 24 × 15 px | **36 × 36 px**, con **margen negativo** (`-9px -6px`) para que la fila del nombre no crezca (mide 18 px antes y después) |
| Cama libre: «+ Ingresar Paciente» | gris en el atributo `style` | clase `.bevo.bevo-libre`, **mismos colores** (`#e2e8f0` / `#475569`); se repite en `:hover` porque `.bevo:hover` (azul oscuro) le gana a una clase sola y dejaba la letra gris sobre azul (en línea nunca pasaba: el `style` ganaba siempre) |

- 🪤 **El candado del evento (`.ev-cand.ev-lock`, 🔒 ámbar) NO se unifica con los otros dos**: es información («corregir el pasado pide clave de coordinación»), no decoración. Gana por especificidad (2 clases contra 1) y la guardia lo mide.
- **El ➕ sigue siendo un icono solo, sin texto.** Ponerle rótulo («Evento») es cambiar una palabra de la interfaz y no está en lo que se pidió; pasó de 51 px a 110 px de ancho en el celular (un tercio de la fila), que es lo que arregla el toque. En el celular no hay *tooltip*, así que quien no sabe qué hace el ➕ no tiene cómo enterarse: queda anotado para Diego.
- **Qué NO cambia:** la palabra «Evolución» / «Editar» (decisión 2 de la auditoría: es de la unidad); «Hist.» sigue diciendo «Hist.» (el texto del tutorial lo nombra así, y `retro_camas.js` lo exige); el orden del DOM (Evolución, Historial, evento, Egreso); `egreso()`, `mover()`, `abrirPanel()`, `abrirTL()`; el verde de «Mover aquí» y el rojo de «Cancelar movimiento» del traslado (son estilos en línea de `_movPie`).
- **Lo que cuesta, medido:** la tarjeta ocupada crece **una fila: de 265 a 309 px en el celular (+44) y de 281 a 320 en escritorio (+39)**. El tablero de 12 camas con 9 ocupadas pasa de **3.414 a 3.810 px de largo a 390 px** (+396) y de 1.069 a 1.186 a 1.400 px (+117). En modo traslado, a 390 px: 3.747 → 4.338. La vista retrospectiva a 390 px: 2.601 → 2.645.
- **El modo traslado queda ordenado pero largo:** en una cama ocupada ahora hay **dos botones azules a ancho completo** («⇄ Intercambiar con esta cama» y «📝 Evolución»), uno sobre otro, más la fila de secundarios. Antes eran los dos azules en la misma fila con anchos distintos. El riesgo de tocar «Evolución» queriendo «Intercambiar» **existía igual** (los dos eran azules); no se cambió porque `_movPie` es lo acordado. Si Diego lo quiere distinto durante un traslado (por ejemplo, esconder «Evolución» mientras dura), es una decisión de él.

### Guardia nueva `build/checks/tarjeta_acciones.js`

Chromium a **390 y 1400 px**, reloj congelado (martes 10-mar-2026 10:00, fecha inventada fuera de las ventanas trampa), datos ficticios, la tarjeta de verdad del tablero. Mide las **cuatro tarjetas** (ocupada sin evolucionar, ya evolucionada, libre, vista retrospectiva) y el **modo traslado** (otra cama ocupada, la de origen, una libre):
- A. `.bevo` es el primer botón del pie, ocupa **todo el ancho útil** (no «el 90 %»: 100 %) y **ningún otro botón comparte su fila**; Historial, evento y Egreso van **debajo**; y la acción principal no es más baja que los secundarios.
- B. Los tres secundarios están en la **misma fila**, son **tres tercios iguales** y tienen el **mismo fondo, borde, color y letra**; el orden es Historial → evento → Egreso y `.btl` sigue siendo el primer secundario (ancla del tutorial: `#bedGrid .bcard .btl`).
- C. El egreso dice «Egreso» (no «Egr.»), en una línea y sin cortarse; ningún botón del pie envuelve su rótulo ni se corta.
- D. En el celular ningún botón del pie, ni en el tablero, ni en el traslado, ni en la retrospectiva, mide menos de 36 px; el lápiz mide al menos 36 × 36 y **no hace crecer la fila del nombre**.
- E. Cama libre: `.bevo.bevo-libre`, el gris ya no va en `style`, mismos colores, ancho completo, y **con el cursor encima no cambia de color**.
- F. Retrospectiva: «Ver / editar» primero y solo; Historial debajo; sin egreso, sin evento y sin traslado.
- G. Traslado: cada `.bevo` en **su propia fila** a todo el ancho y los secundarios juntos al final con el mismo aspecto.
- H. **Peor caso de ancho:** una tarjeta de 290 px (el mínimo de la grilla; 83 px por celda) y un celular de 320 px: nada se corta ni envuelve.
- I. El candado del evento sigue ámbar. J. Exige haber VISTO las diez tarjetas (cinco por ancho) para no medir en el vacío.

**Roja antes contra el código sin arreglar: 43 fallan** (de 97 aserciones): `.bevo` al 31–34 % del pie y compartiendo su fila en las dos camas y en los dos anchos; el egreso verde frente a los otros dos; «Egr.»; el lápiz de 24 × 15; el botón de la cama libre en `style`; en el traslado cada `.bevo` sin fila propia y los secundarios de 31 px; la retrospectiva con «Ver / editar» y Historial en la misma fila; y a 320 px el ➕ de 33 px. **Verde después (106 aserciones).**
**14 de 14 mutantes mueren, cada uno por su razón:** `.bevo` con `flex-grow:1` (46 aserciones), el egreso otra vez verde (8), el rótulo «Egr.», los secundarios sin `min-height` en el celular, sin área táctil del lápiz, el lápiz con área pero sin margen negativo (la fila del nombre crece de 18 a 36 px), la cama libre otra vez en línea, la cama libre con una clase sola (**el `:hover` azul le gana: este mutante empezó vivo** porque yo había escrito en el comentario que el `:hover` repetido era imprescindible y, con `.bevo.bevo-libre`, el empate de especificidad lo resolvía el orden de las reglas; el comentario se corrigió y la guardia ahora mide el cursor encima), el relleno de 7 px del botón principal (29 contra 31), el egreso antes que el evento en el DOM, los secundarios con `!important` que aplastan el candado ámbar, solo el borde del egreso en verde, los secundarios sin `flex-basis:0` y el Historial sin la clase `.btl`.

### Reconciliaciones de guardias (la convención que cambió es justamente el rótulo)

- **`retro_camas.js`** detectaba el egreso buscando el **texto «Egr.»** en la grilla. Con el rótulo nuevo «hoy: se ofrece egresar» se habría puesto roja y —peor— «en el pasado no se ofrece egresar» habría pasado **en el vacío**. Ahora detecta el egreso por el botón (`#bedGrid .balt`, la clase que no cambió) o por cualquiera de los dos rótulos. Las seis preguntas son las mismas; no se borró ni se aflojó ninguna aserción.
- **`contraste_tokens.js`**: el nombre del par en la lista cerrada (`«Egreso» … antes «Egr.», en verde`); el umbral (4,5:1) y la medición no cambian, el egreso ahora es `#334155` sobre blanco (10,36:1). Y **una carrera que ya traía del paso 5.1 y que esta batería sacó a la luz** (abajo).

### 🪤 Una guardia del paso 5.1 que se ponía roja SOLA bajo carga: `contraste_tokens.js`

Al repetir las guardias de la zona con `-j 2`, `contraste_tokens.js` salió roja **2 veces de unas 8** y **verde cada vez que se corrió sola** (y verde en la batería completa). La salida decía `1400 tablero · button.th-x sobre #ffffff → 1.379:1 («×»)`: el **×** del saludo «¿Primera vez por acá?» (`#tutHola`). Ese globo sale **1,8 s después del arranque** con un fundido de .35 s (`tutPop`), y la guardia lo medía justo ahí, **a medio aparecer**: la medición compone la opacidad (es lo correcto) y un ×
a medio fundido da 1,38:1. Bajo carga el arranque se corre y la medición cae en esa ventana; sola, cae antes o después. Es la misma familia de las tres veces que ya se pagó con el reloj: **una guardia que depende de CUÁNDO se mide**. (La guardia quitaba `.tut-hola`, pero el globo es `#tutHola`, un id: ese borrado nunca hizo nada.)
**Arreglo (en el código de la guardia, sin aflojar nada):** `abrir()` espera a que `#tutHola` esté visible **con su animación terminada** (`getAnimations()` todas `finished`; 6 s de tope por si ya hay bandera de «lo vi») antes de medir. **No se esconde el saludo:** su × sigue midiéndose, a opacidad completa (se comprobó que `button.th-x` entra en el barrido). **10 corridas de 10 verdes** con `-j 2` junto a `tarjeta_acciones`, `retro_camas` y `convenciones`. La guardia nueva `tarjeta_acciones.js` nace sin esa carrera: no mide el saludo, y lo oculta por CSS (un globo fijo en la esquina podría tapar el botón que se prueba con el cursor).

### Vecinas y capturas

Batería completa con `-j 2` (237 guardias, 620 s): **235 verdes y 2 rojas, `paridad_entrega` y `pwa_paquete`**, por la regeneración pendiente del cierre de la tanda (`build/paquete_migracion/index.html` lo regeneró `paquete.js`). Entre las verdes, las de la zona: `legibilidad`, `tutorial`, `retro_camas`, `mover_camas`, `ficha_y_antes`, `episodio_al_guardar`, `confirma_guardado`, `prono_arriba`, `contraste_tokens`, `piso_letra_celular`, `titulos_tres_niveles`, `movil*`, `piel`, `convenciones`, `tokens_existen`, `escapado_unico`, `seis_pasos`, `cuatro_pasos`, `sin_riel` y `general_disuelta`.
Capturas del antes y el después del tablero (fuera del repositorio, carpeta de trabajo de la sesión: `capturas/antes_53` y `capturas/despues_53`, con las tarjetas de cerca en `tarjetas/`) a 390 y 1400 px: tablero, tablero en traslado y vista retrospectiva, y de cerca la ocupada sin evolucionar, la ya evolucionada, la libre, la retrospectiva, y las tres del traslado.

**Lo que ve distinto la kinesióloga.** En cada cama ocupada, **«Evolución» (o «Editar») es ahora un botón azul grande a todo el ancho**, solo en su fila, y debajo, en una segunda fila, tres botones blancos iguales: **Hist.**, **➕** (evento) y **Egreso**. El egreso ya no es verde ni dice «Egr.»: dice «Egreso» y se parece a los otros dos. En el celular los tres botones de abajo son más grandes (110 × 38 px el ➕, que era de 51), y el lápiz de la ficha se acierta mejor sin mover el nombre. La cama libre se ve igual. La tarjeta es una fila más alta (unos 40 px), así que en el celular hay que desplazarse algo más para recorrer las doce camas.

**Lo que NO se hizo y queda dicho.**
- **La palabra «Evolución» / «Editar»** (decisión 2) y **«Hist.»** no se tocaron: son rótulos de la unidad y el tutorial los nombra.
- **El ➕ sigue sin texto** y en el celular no hay *tooltip*; si Diego quiere «Evento» en el rótulo, es una decisión suya (y cambia el ancho que cabe).
- **Dos botones azules a ancho completo durante un traslado** («Intercambiar» y «Evolución»): ver arriba; decisión suya.
- Sin tocar los emojis posteriores a 2019 que ya viven en producción, ni los dos botones primarios de colores distintos (el índigo de la barra de abajo), ni `#btnCerrarPost`. Sin migración de esquema. `entrega/`, `pwa/` y la `VERSION` quedan para el cierre de la tanda.

---

### 10-oct-2026 · Tanda 5 · Limpieza visual del registro de evolución · paso 5.4: la barra de acciones cabe en el celular (y, aparte, un solo botón principal)

**De dónde sale.** Cambio 6 del plan de la tanda 5 (auditoría de solo lectura): «que el botón principal quepa, se lea y no tape nada a 390 px» y, de la decisión 1 de la auditoría, «un solo botón principal». Son **dos commits separados** para que el segundo se pueda revertir solo: este es el primero (la barra); el botón único va en el segundo. Todo es CSS del celular en `v2/index.html`: no se toca el HTML de la barra, ni `guardar()`, `api()`, `gs()`, `_guardadoBotones`, la franja `#gEstadoGuardado` (zona de la revisión de la tanda 2: su `flex-wrap` y su botón de 32 px o más siguen igual), los `avErr*`, ni `#btnCerrarPost`. Sin migración de esquema.

### Parte 1 · La barra a 390 px

**El defecto, medido (no calculado).** La barra de abajo del panel reparte una fila entre la insignia «⚠️ Sin guardar», «← Atrás» y el botón principal, y la franja del último guardado va en fila propia. La insignia aparece **apenas se toca un campo**: no es un caso raro, es la barra que se ve todo el turno mientras se evoluciona. Con ella puesta, la insignia (104 px) y «Atrás» (87 px) se llevaban 205 de los 354 px útiles y el principal quedaba de **141 px (40 %)**:
- Pasos 2 y 3: «Siguiente: evaluaciones →» y «Siguiente: terapia física →» se partían en **tres líneas**: 55 px de texto dentro de un botón de 52; el texto **sobresalía 2,5 px por arriba y 1,5 por abajo** y la flecha caía sola en la tercera línea. En los pasos 4 a 6, dos líneas, justo (7 px de margen).
- A 360 px (el ancho de media Android) el principal quedaba de **111 px (34 %)**: «💾 Guardar y ver el relato» en **cuatro líneas** (64 px en un botón de 52) y «✖ Cerrar la evolución» y «Siguiente: terapia física →» en tres.
- 🪤 **La hipótesis de la auditoría no alcanzaba.** Proponía arreglarlo con `line-height` y `white-space:normal` en el botón. Medido: con 141 px y tres líneas, aun a 1,15 de interlineado el texto mide 3 × 18,8 = 56 px y sigue sobresaliendo. Lo que hay que sacar de la fila es la insignia, no apretar el botón.
- **Lo que sí estaba bien** (la hipótesis de «desborda la barra» **no se confirmó**): a 390, 360 y 320 px nada de la barra se sale de la pantalla ni la hace deslizarse de lado; el principal mide 52 px de alto en todos los casos; y el último campo de cada paso, desplazado hasta el final, queda sobre la barra.

**El cambio** (todo dentro del `@media (max-width:740px)` que ya existía):
| Qué | Antes | Ahora |
|---|---|---|
| Insignia «⚠️ Sin guardar» (`#gSinGuardar`) | compartía la fila con «Atrás» y el principal | `flex:1 1 100%`: **fila propia**, como ya hace la franja del guardado (las dos dicen cómo va el guardado). `margin-right:0!important` porque el HTML trae `margin-right:6px` en línea (no se toca) y dejaba su borde derecho 6 px antes que el de la franja |
| Botón principal a 390 px, con la insignia | 141 px, 2 a 3 líneas | **258 px, una línea** (354 en el paso 1, que no tiene «Atrás»); 52 px de alto y 1,02rem **intactos** (pedido de Diego del 15-ago: no se achica para que entre) |
| Interlineado del principal | `normal` (según la tipografía) | `1.15` explícito: con la tipografía de Windows, más alta que la de aquí, dos líneas caben igual |
| Panel (`#sp .pcontent`) | sin reserva abajo | `scroll-padding-bottom:calc(112px + env(safe-area-inset-bottom))` |

- **La barra con la insignia puesta pasa de 72 a 100 px (+28)** y con la franja ámbar queda igual (160). Es el costo, y es un costo **que se compensa**: sin más, la barra más alta le comía el borde de abajo a los campos que el navegador da por «visibles». El navegador no sabe que una barra pegajosa le tapa el borde del panel: un campo que ya «se ve» bajo ella **no se desplaza al enfocarlo** (con Tab o con el dedo). Medido con la insignia puesta y sin el `scroll-padding`: la casilla «KTM alerta» del paso 4 queda bajo la barra a 390 px, y a 360 y 320 px caen varios campos más (tiempo y Borg de la KTM, el plan). Con `scroll-padding-bottom` el panel reserva lo que ocupa la barra (más un respiro y la zona segura de abajo de los iPhone). **Efecto de regalo:** a 360 y 320 px había campos enfocados bajo la barra **antes** de este cambio (a 360: la casilla «KTM alerta»; a 320: «Educación realizada», la anotación y su hora), y ahora no.
- 🪤 **Un cuadro de texto se enfoca con el cursor en su primera línea**, no en su borde de abajo: el navegador desplaza hasta el cursor, así que un plan de 52 px con tres píxeles bajo la barra no es «escribir a ciegas». La guardia mira la primera línea (24 px) de los `textarea` y el campo entero de todo lo demás.
- **Con una franja de falla (ámbar o de aviso) la barra es más alta** (160 a 180 px) y el borde de abajo de un campo enfocado puede quedar cubierto: es el estado raro y la franja es de la zona del otro flujo; no se tocó ni se agregó una regla que dependa de ella.
- **Escritorio no cambia:** a 1400 px la insignia sigue en la fila del principal, compacta (104 px), el principal mide 52 px en una línea y el panel no reserva nada abajo (`scroll-padding-bottom: auto`). Lo exige la guardia.

### Guardia nueva `build/checks/act_bar_390.js` (R1 a R9, 38 aserciones)

Chromium a **390, 360 y 320 px** (y 1400 para lo que no debe cambiar), reloj congelado (martes 10-mar-2026 10:00, fecha inventada fuera de las ventanas trampa), datos ficticios, el panel de verdad en sus **seis pasos** y en **cuatro estados de la barra** (limpia; «Sin guardar», tocando un campo de verdad; «Sin guardar» + franja ámbar; «Sin guardar» + franja de aviso, puestas con las funciones reales de la app). R1: nada se sale de la pantalla. R2: el principal se lee entero (a lo más dos líneas, el texto cabe en su caja, sin cortarse ni sobresalir, con margen). R3: sigue grande (≥ 52 px y ≥ 1,02rem). R4: nadie montado sobre nadie, ni la insignia ni la franja comparten fila con el principal y «Atrás» **sí** está en su fila. R5: el principal toma al menos la mitad del ancho útil. R6: al final del paso ningún campo bajo la barra. R7: ningún campo enfocado tapado. R8: escritorio igual. R9: cobertura (se vio la insignia, la franja y «Atrás» donde correspondía y se midieron los 72 casos del celular).
**Roja antes contra el `index.html` del commit anterior: 9 fallan** (R2, R4 y R5 a 390 y a 360; R4 a 320; R7 a 360 y a 320). **Verde después.** R7 a 390 sale **verde antes** y se pone **roja si se quita solo el `scroll-padding`** (ver arriba): por eso el `scroll-padding` forma parte de este cambio y no es un adorno.
**12 de 12 mutantes mueren, cada uno por su razón:** la insignia otra vez en la fila (R2, R4, R5); sin `scroll-padding` o con uno de 40 px (R7); el principal a 46 px o a .95rem (R3); `white-space:nowrap` en el principal (manda a «Atrás» a otra fila: R4; **este mutante empezó vivo** y la guardia ganó la condición de que «Atrás» esté en la fila del principal); la regla de la insignia fuera del `@media` (**también empezó vivo**: hizo falta exigir que la insignia siga compacta en escritorio); el `scroll-padding` fuera del `@media`; el principal con 400 px fijos (R1); interlineado 2 (R2); insignia en posición absoluta, montada sobre el botón (R4); principal fijo al 40 % (R2, R5).
- 🪤 **Dos medidas que parecían rojas y no lo eran** (la guardia las tuvo mal antes de tenerlas bien): el campo de un `<details>` cerrado (el «Escribir procedimiento…» del paso 2) **conserva su rectángulo aunque no se pinta**, y medirlo hacía creer que la barra tapaba un campo que nadie ve (ahora `checkVisibility`); y el panel **entra con una transición de CSS que corre con el reloj real y no con el congelado**: a 320 px la primera medición cayó con la barra a mitad de camino (ahora espera cuatro cuadros seguidos sin moverse).

### 🪤 Hallazgo que NO se arregló: la cabecera del panel desborda por debajo de 390 px

Con un diagnóstico largo en una sola línea («Neumonía grave adquirida en la comunidad»), el título del panel y la **✕ de cerrar terminan en x = 380: 20 px fuera de la pantalla a 360 px y 60 a 320 px**; el foco de la ✕ al abrir desliza el panel entero hacia la izquierda y **la barra aparece corrida** (a 320 px, en x = −42; con el reloj real y otro orden de medición el síntoma aparece y desaparece). Es de la **cabecera**, no de la barra, y está fuera de este paso: la guardia devuelve el panel a su sitio antes de medir y **no le exige** a 360 ni a 320 px que el panel no se deslice (a 390 px sí, y ahí se cumple). **Queda para Diego**: si le importan los celulares de 360 px o menos, la cabecera necesita un arreglo propio (`min-width:0` y elipsis en el diagnóstico).

### Vecinas
Con `-j 2`, las guardias de la zona —`convenciones`, `piel`, `legibilidad`, `movil*`, `seis_pasos`, `cuatro_pasos`, `sin_riel`, `general_disuelta`, `contraste_tokens`, `piso_letra_celular`, `titulos_tres_niveles`, `tokens_existen`, `escapado_unico`, `guardado_seguro_*` (incluida la J1, que mide esta misma barra con las franjas), `fallo_guardado_visible`, `sin_guardar`, `tarjeta_acciones`, `aviso_*`, `abrir_hasta_el_campo`, `estado_*`, `panel_ux`, `tutorial`, `retro_camas`, `confirma_guardado`, `ingreso_paso_cero`, `cierre_tres_*`, `evaluaciones_celular`, `panel_no_pisa_datos`, `borrador_local`, `mover_camas`, `ficha_y_antes`, `episodio_al_guardar`, `prono_arriba`, `obligatorios_*`, `chips_llevan_al_campo`, `validacion_entre_pasos` y `paso_*`—: **49 verdes de 49**. `pwa_paquete` queda roja por la regeneración pendiente del cierre de la tanda (`build/paquete_migracion/index.html` lo regeneró `paquete.js`).

**Lo que ve distinto la kinesióloga (en el celular).** Mientras escribe, la insignia «⚠️ Sin guardar» pasa a ser **una franja rosada de ancho completo arriba de los botones** (antes era una pastilla en la misma fila) y los botones de abajo ya no se aprietan: «Siguiente: evaluaciones →» se lee **en una línea**, entero, con «← Atrás» al lado, en vez de partirse en tres con la flecha huérfana. La barra es 28 px más alta mientras hay cambios sin guardar. Al tabular o tocar un campo cerca del borde de abajo, el panel lo sube sobre la barra. En escritorio no cambia nada.

### Parte 2 · Un solo botón principal (commit aparte: revertirlo no toca la parte 1)

**La hipótesis de la auditoría no se confirmó, y lo que había de verdad era otra cosa.** La decisión 1 de la auditoría decía: «dos botones principales con colores distintos: azul institucional (la tarjeta y los `.btn-p`) e **índigo con sombra** (Guardar y Siguiente de la barra)». Lo leyó del CSS base, sin correrlo. **Medido en pantalla, el índigo no se ve en ningún estado**: la piel institucional —que es la única, no hay alternador y `data-piel="inst"` se pone al arrancar— lo pisa con el mismo azul. Las reglas base `#btnGuardar,#pasoAvanza{background:linear-gradient(135deg,#5856d6,#4338ca)…}` eran **código muerto**: nadie las ve, pero seguían escritas y eran una trampa (quien algún día tocara la piel recuperaba un botón índigo). Lo que sí distinguía el botón de la barra de los demás, medido con el navegador:

| | Relleno | Sombra | Con el cursor encima |
|---|---|---|---|
| Tarjeta (`.bevo`, «Evolución»/«Editar») y `.btn-p` | azul plano `#0058A0` | ninguna | se **oscurece** a `#04345E` |
| «Siguiente» (`#pasoAvanza`) | degradado `#0058A0 → #04345E` | azul `0 5px 16px` | se **aclara** (`brightness(1.08)`) |
| «Guardar» (`#btnGuardar`, oculto) | el mismo degradado | la misma | **otro** degradado, más claro (`#0d69b6 → #0058A0`) |

O sea: un mismo azul, pero **tres «hover» distintos entre cinco botones principales**, y el de la barra con degradado y resplandor contra los planos de todos los demás. Es ese lo que se unificó, siguiendo lo pedido («un solo botón principal: el azul institucional, manteniendo el tamaño grande de 52 px»).

**El cambio (CSS, cuatro reglas menos).** Se **borraron** las dos reglas base con el índigo y las dos de la piel con el degradado azul y la sombra. «Guardar» y «Siguiente» quedan siendo `.btn-p` a secas: `--primary` plano, `--pdark` con el cursor encima, sin sombra, degradado ni filtro. **Conservan su tamaño** (52 px de alto, 1,02rem de letra: pedido de Diego del 15-ago-2026) y su radio de 12 px: se unifica el aspecto, no el tamaño. El desactivado (gris claro con letra oscura, de los pasos 5.1 y 5.2) **no cambia**: sus reglas de la piel se quedan, que además arreglan la opacidad en línea del paso 1. No se tocó `_guardadoBotones`, `guardar()`, la franja, el HTML ni `#btnCerrarPost`. **Revertir** es `git revert` de este commit: devuelve las cuatro reglas.

### Guardia nueva `build/checks/boton_principal_unico.js` (A a F, 24 aserciones)

Chromium a 1400 y a 390 px, reloj congelado, datos ficticios; mide **lo que pinta el navegador** (colores computados, en reposo y con el cursor encima de verdad) en cuatro botones: la tarjeta, una muestra `.btn.btn-p`, `#pasoAvanza` y `#btnGuardar`. A: ninguno se pinta con índigo o violeta (por **tono**, 235° a 300°; el azul institucional está en 207°). B: los cuatro tienen el mismo relleno plano en reposo, se oscurecen al mismo color con el cursor encima, y ninguno lleva degradado, sombra ni filtro. C: el de la barra sigue en ≥ 52 px, ≥ 1,02rem y radio de 12 px. D: el desactivado sigue gris claro con letra oscura. E: ninguna regla del botón de la barra trae un color índigo (se juzga por el tono, porque el navegador devuelve `rgb()` y no el hex escrito) y **sin la piel institucional** el botón sigue azul y plano. F: cobertura (se vieron los cuatro botones, con el cursor encima, en los dos anchos).
**Roja antes: 10 fallan** (B ×4 a cada ancho: degradado, sombra y filtro, relleno distinto, hover distinto; y E ×2: la regla con el índigo escrito y el botón índigo sin piel). **A sale verde desde el principio** —es la hipótesis de la auditoría, que no se confirmó— y se deja de candado, igual que C, D y F. **Verde después.**
**12 de 12 mutantes mueren:** el degradado de la piel de vuelta; la sombra azul de vuelta; «Siguiente» que se aclara con el cursor; el índigo en la regla base (A, B y E, 11 aserciones); un índigo escrito solo para cuando no hay piel (**este mutante empezó vivo**: la regla E buscaba el hex y el navegador devuelve `rgb()`; ahora juzga por el tono); el principal a 46 px; todos aclarándose con el cursor (**la guardia ganó la condición «se oscurecen», no solo «cambian»**); «Guardar» con otro hover; el radio de 12 px perdido; la tarjeta con degradado; «Siguiente» índigo solo con el cursor encima; el desactivado otra vez azul.
- 🪤 **`.btn{transition:all .18s}`**: leer el color de un botón apenas se desactiva da el color **a medio camino** (transparente con la letra blanca) y la guardia dio un rojo falso en D. Ahora espera 450 ms después de cada cambio de estado.

### Vecinas
Con `-j 2`: las 18 guardias de la zona del botón y de la barra (`convenciones`, `piel`, `legibilidad`, `movil*`, `seis_pasos`, `cuatro_pasos`, `sin_riel`, `general_disuelta`, `contraste_tokens`, `piso_letra_celular`, `titulos_tres_niveles`, `tokens_existen`, `escapado_unico`, `act_bar_390`, `boton_principal_unico`, `tarjeta_acciones`, `sin_guardar`) **18 verdes**, y las 34 del resto (guardado, franja, avisos, tutorial, retro, mover, panel, evaluaciones, prono, obligatorios, pasos y `paquete`) **33 verdes y 1 roja: `pwa_paquete`**, por la regeneración pendiente del cierre de la tanda (`build/paquete_migracion/index.html` lo regeneró `paquete.js`).

**Lo que ve distinto la kinesióloga.** El botón grande de abajo del panel («Siguiente: …», «Guardar y ver el relato», «Cerrar la evolución») **pierde el degradado hacia azul marino y el resplandor azul**: ahora es el mismo azul liso que «Evolución» en la tarjeta y que los demás botones azules, **del mismo tamaño grande de siempre**. Con el cursor encima se oscurece, como todos (antes se aclaraba). No hay índigo en ninguna parte de la pantalla —nunca lo hubo a la vista—; el cambio es más sutil que lo que la auditoría imaginó. **Si a Diego le gustaba el relieve del botón de la barra, se revierte este commit solo.**

**Lo que NO se hizo y queda dicho.**
- **La cabecera del panel por debajo de 390 px** (arriba): hallazgo para Diego, sin arreglar.
- **El botón «Cerrar la evolución» del paso 6** (`✖ Cerrar la evolución`) y **`#btnCerrarPost`** (el botón muerto, `display:none` en línea) no se tocaron.
- **La franja de falla (ámbar/aviso)** sigue en la zona del otro flujo: con ella la barra mide 160 a 180 px y el borde de abajo de un campo enfocado puede quedar cubierto.
- Sin tocar los emojis posteriores a 2019 que ya viven en producción, ni «Evolución»/«Editar». Sin migración de esquema. `entrega/`, `pwa/` y la `VERSION` quedan para el cierre de la tanda.

### Herramienta: `build/pantallazos.js` contaba mal las líneas
Al medir la barra con una guardia de verdad apareció que el número «líneas» de `medidas.json` (de la barra y del pie de la tarjeta) no medía nada: dividía el alto del botón, menos el relleno, por el interlineado, así que un botón de 52 px de **una** línea daba «2 líneas» siempre (52 − 20 = 32 ÷ 18,8 ≈ 1,7 → 2). Las capturas del paso 5.1 lo repetían. Ahora cuenta las líneas reales por los rectángulos del propio texto (el mismo método que `act_bar_390.js` y `tarjeta_acciones.js`), y `medidas.json` suma por cada paso el alto de la barra y si la insignia «Sin guardar» estaba a la vista. Herramienta, no guardia: no cambia nada de la app.
Capturas del antes y el después del paso (fuera del repositorio, carpeta de trabajo de la sesión: `capturas/antes_54` y `capturas/despues_54`, con `barra/` y `barra1400/` de cerca): los seis pasos y el tablero a 390 y 1400 px, y la barra en el viewport real con la insignia, con la franja ámbar y con la de aviso.

### 10-oct-2026 · Tanda 5 · Limpieza visual del registro de evolución · paso 5.5: un candado para que no entren emojis de 2020 en adelante

**De dónde sale.** Cambio 7 del plan de la tanda 5 (auditoría de solo lectura). CLAUDE.md prohíbe elegir emojis posteriores a 2019 —el Chrome del hospital corre en Windows 10 y su fuente no los trae; el 🩻 de 2021 salió como un cuadrado— pero **ninguna guardia lo vigilaba**: la única defensa era que alguien se acordara. Este paso agrega solo la guardia `build/checks/emojis_nuevos.js`. **No toca `v2/`, no cambia ningún emoji que ya vive en producción** (la regla es para *elegir* un ícono nuevo, no para barrer los que ya están; si se ven bien en el computador del hospital lo decide Diego, decisión 4 de la auditoría) y no necesita regenerar `entrega/` ni `pwa/`.

### La lista de base, hecha con un grep real (no era la de la auditoría)

La auditoría dijo cuatro de memoria (pulmones, cara exhalando, burbujas, pluma). Leyendo el fuente de verdad salieron **cinco**, y con otra forma:

| Emoji | Año | Dónde vive hoy |
|---|---|---|
| 🫁 pulmones | 2020 | **27 usos** (23 líneas de `index.html` y 4 de los `.gs`): título de la tarjeta Respiratorio, botón «Intubación» del panel, pines y leyenda del timeline, bodega y tablero de ventilación, estadísticas, alertas de la campana (`svc_notificaciones.gs`), entrega de turno (`svc_entrega.gs`), `mantenimiento.gs` |
| 🫀 corazón anatómico | 2020 | la insignia «UPOT» de la tarjeta de cama (**la auditoría no la listó**; es lo que cada kinesióloga ve en el tablero) |
| 🫧 burbujas | 2021 | pack «Oxigenación» de las variables del timeline |
| 🪶 pluma | 2020 | pack «Weaning» de las variables del timeline |
| 😮‍💨 cara exhalando | 2020 | desplegable «Tos y deglución» del paso de evaluaciones |

- 🪤 **Un `grep` pelado habría dado una base equivocada en las dos direcciones.** El 🩻, que la auditoría imaginaba como el ejemplo de lo que *no* está, **sí está en el fuente seis veces** (tres en `index.html`, tres en los `.gs`), pero siempre dentro de un comentario que explica por qué no se usa. Y el 🪤 —la ratonera que usa todo el proyecto como marcador de trampa— **es un emoji de 2020**: 135 líneas de `index.html` y 89 de los `.gs`, todas en comentarios. Si la guardia mirara el archivo entero, o rechazaba todo eso o había que meter 🩻 y 🪤 en la base, y entonces **el único emoji que se sabe que falla habría quedado permitido en pantalla**.
- **Por eso la guardia trae un lector de comentarios de verdad** (HTML, CSS y JavaScript con plantillas `${ }`, cadenas con `//` adentro y expresiones regulares con comillas; una regex por línea no alcanza porque un comentario de bloque sigue en las líneas de abajo). Se prueba de tres maneras independientes: 28 casos armados; el JavaScript de los **41 archivos reales (44 bloques)** **sin los comentarios que el lector marcó sigue compilando en el motor** (un trozo de código llevado por comentario lo rompería; entra a la guardia como aserción por archivo); y un 🩻 metido en 8 lugares realistas de los archivos reales (atributo, texto entre etiquetas, cadena de `toast(…)`, plantilla, URL con `//` dentro de la cadena, `${ }` —probado en 12 posiciones distintas—, entidad, `.gs`) se caza **8 de 8**, y en cuatro comentarios distintos (línea, bloque, HTML, CSS) **0 de 4**.
- 🪤 **El fuente también escribe emojis como código.** `index.html` trae `&#128274;`, `&#128101;`, `&#128444;` (candado, personas, marco) de verdad, así que el 🩻 se puede colar como `&#x1FA7B;`, `&#129659;`, `\u{1FA7B}` o el par `🩻` sin que un grep por el carácter lo vea. Se decodifican las cuatro formas.

### Qué se considera «nuevo»
1. **Todo pictograma que Unicode no tenía asignado al 12.1 (oct-2019).** Se guarda lo *asignado* (89 rangos, generados una vez con Perl y verificados contra las propiedades de Node), no lo prohibido: el emoji de 2027 que hoy nadie conoce entra rechazado sin que nadie actualice nada.
2. **Las uniones de piezas viejas con significado nuevo**: toda secuencia ZWJ tiene que estar en la base o en `ZWJ_ANTIGUAS` (revisadas una por una: hoy 🧑‍⚕️ y 🚶‍♂️). Es **conservador a propósito**: 😮‍💨 son dos emojis de 2010 pegados y el conjunto es de 2020; un 👩‍⚕️ legítimo pide una línea con su año. Más ⚧ (el signo es de 2005, el emoji de 2020), 🤝 con tono de piel (2021) y la bandera de Sark.
3. **La base es la realidad en los dos sentidos**: un emoji de 2020 fuera de la base y fuera de comentarios pone la guardia roja; y un emoji de la base que **ya no aparece** también (se borra de la lista y el candado se aprieta: el emoji que Diego decida cambiar no puede volver). Eso además prueba que la guardia no está vacía.

Mira `v2/index.html` y todos los `v2/*.gs` (también escriben texto de interfaz: la campana, la entrega). Es estática: no abre el navegador ni lee el reloj. Dos modos de uso: `node build/checks/emojis_nuevos.js <carpeta>` corre contra una copia de `v2/` (así se demuestra el rojo sin tocar el repositorio) y `--listar` imprime cada emoji de 2020 en adelante que hay en pantalla y dónde (así se rehace la base con un grep de verdad).

### Rojo y verde
- **Nace verde contra el código real, como anticipó la auditoría**, y por eso el rojo se demostró con copias de `v2/` **fuera del repositorio**: (a) un solo 🩻 puesto en el título de la tarjeta Respiratorio → sale `index.html:3931 🩻 (1FA7B)`, **exit 1**; (b) cinco intentos en una copia (literal, `&#x1FA7B;`, un decimal equivocado a propósito, el corazón en llamas ❤️‍🔥 y un 🩻 en `svc_notificaciones.gs`) → los cinco, con su línea. Contra el repositorio: **exit 0**. Además la guardia trae su **prueba roja permanente**: en cada corrida inyecta en memoria un 🩻 al inicio del `<body>` de la pantalla real y exige que lo cace (y que el mismo dentro de un comentario no).
- **20 de 20 mutantes mueren**, cada uno por su razón: comentarios de línea, de bloque, HTML o CSS sin enmascarar; las plantillas sin `${ }`; la barra siempre división; `<script>` sin reconocer; sin decodificar `&#…;` ni `\u{…}`; la tabla de asignados que da por bueno el 🩻 o todo el bloque de 2020; cada una de las reglas de unión apagada (ZWJ, ⚧, 🤝, Sark); la base que incluye 🩻 o pierde los pulmones; ningún `.gs`; el alcance reducido; la ratonera que se cuela. (Un mutante empezó vivo: reducir el alcance a `Extended_Pictographic ∪ Emoji_Presentation` no cambiaba nada, porque la segunda propiedad solo suma tonos de piel y banderas, que ya se leen aparte; se simplificó el código en vez de dejar un mutante equivalente.)
- 🪤 **Un error mío que se vio en la salida roja**: el caso de la entidad decimal lo escribí con `&#129787;` creyendo que era el 🩻 (es U+1FAFB, otro código reservado; en la copia roja salió un 🫻). El caso pasaba igual porque «también es nuevo». Ahora cada caso de forma escrita como código exige **cuál** emoji es (`1FA7B`), no solo que haya uno.

### Vecinas
Con `-j 2`: `convenciones`, `escapado_unico`, `tokens_existen`, `docs`, `paquete`, `rut_minimo`, y las guardias que ya hablaban de emojis (`relato_espejo`, `buzon_campana`, `evaluaciones_celular`, `general_disuelta`, `nota_synapse_cumple`, `fiestas_patrias`, `tutorial`): **14 de 15 verdes**; la roja es `pwa_paquete` por la regeneración pendiente del cierre de la tanda (no se persigue). `build/paquete_migracion/` no quedó modificado.

**Lo que ve distinto la kinesióloga.** Nada: no cambia ninguna pantalla.

**Lo que NO se hizo y queda dicho.**
- **Ningún emoji existente se cambió.** La decisión 4 de la auditoría sigue siendo de Diego, ahora con una lista más grande que la que se le iba a mostrar: son **cinco** emojis y 🫁 está en 27 sitios, no solo en el título de Respiratorio. Pedir una captura de la tarjeta Respiratorio *y de la insignia UPOT de una cama* en un computador del hospital (¿salen como un cuadrado?). Si se cambia alguno, se borra de `BASE` en la guardia.
- **CLAUDE.md no se editó.** Su regla de emojis podría terminar con «Lo fija `checks/emojis_nuevos.js`», como las demás; queda a elección de Diego.
- **Límites conocidos:** de las banderas solo se conoce como nueva la de Sark (las demás son de antes de 2020; Windows de todos modos no las dibuja); `pwa/`, `entrega/` y `build/paquete_migracion/` no se miran porque se generan desde `v2/`; el lector es un mínimo para separar comentario de pantalla, no un analizador completo de JavaScript (por eso la prueba de compilación); un `</script` escrito dentro de un comentario `//` rompería el lector igual que rompería el navegador.

## 10-oct-2026 · Turno respiratorio (tanda 3), revisión adversarial · paso F1 «estado del bloque»: las columnas no se ensanchan, un clic sobre una fase repinta, el texto sin agregar no cuenta y el encabezado dice QUÉ falta

**De dónde sale.** Los diez hallazgos de la tanda 3 de la revisión de las tandas 3, 4 y 5 que caen en `v2/index.html` (R1, R6, R2, R7, R3, R8, R4, R10,
R5, R9) más R24 (tanda 5), que tiene la misma raíz que R1/R6. Los revisores los habían demostrado; **se reprodujeron todos antes de tocar nada**
(sondas en un Chromium con reloj congelado al lunes 10-ago-2026 11:00 y un `google.script.run` simulado) y las guardias nacieron rojas contra el
código sin arreglar: **estado_visible_escritorio 78 aserciones rojas, estado_del_bloque 22, aviso_igual_que_guardar 60**.

**Los defectos, en palabras.**
- **R1 y R6 · un resumen largo ensanchaba una columna y sacaba el panel de la pantalla.** La grilla de escritorio era `2fr 3fr`, que es
  `minmax(auto,…)`: el piso de la columna es lo que mide lo de adentro. Desde el 3.3 el encabezado de cada tarjeta muestra su resumen en una línea
  sin partir, y tres opciones corrientes de Auscultación (columna IZQUIERDA, la angosta) —«Disminuido en Bases · Sin ruidos agregados · Ambos campos
  pulmonares»— llevaban esa columna de 391 a **659 px** y la otra de 587 a 491: a 1024 px el panel quedaba con **156 px de scroll lateral** y a
  1366 las columnas pasaban de 522/784 a 659/647. El arreglo de 820 px para abajo (`minmax(0,1fr)`) ya estaba; faltaba el de escritorio.
  · **Arreglo.** `grid-template-columns:minmax(0,2fr) minmax(0,3fr)`. Las columnas guardan 2:3 pase lo que pase adentro: 342/512 a 900 px, 391/587 a
  1024, 422/632 a 1100, 462/692 a 1200, 494/740 a 1280, 522/784 a 1366, con y sin resúmenes largos. Como sin el piso de `auto` un control rígido
  podría salirse de SU columna sin mover el scroll del panel, la guardia también cuenta lo que pasa del borde de su columna (hoy: nada).
- **R24 · el resumen de Respiratorio quedaba cortado entre 1100 y 1280 px.** `.mres` iba en `flex:1 1 0` y tomaba solo lo que dejaba el título
  (354 px): «Requiere revisión falta declarar la PVE — VM · ACVC» mide 302 px y cabía en 271 a 1200 px, 241 a 1150 y 211 a 1100; se perdía el final.
  🪤 **No lo resuelve el cambio de la grilla** (medido con solo ese cambio: 302 contra 271, igual): la columna de la derecha mide lo mismo con
  o sin él. · **Arreglo.** El encabezado puede envolver y el resumen pide su ancho (`flex:1 1 auto`): si cabe junto al título se queda donde
  estaba y si no pasa a una segunda línea con todo el ancho de la tarjeta, como ya hace en el celular. Solo si ni la tarjeta entera lo aguanta se
  corta con puntos suspensivos. El encabezado queda en 60 px de alto en el peor caso (41 en una línea).
- **R2 y R7 · tocar un chip de «Fase clínica» no repintaba el estado.** El repintado por clic de botón (3.3) escuchaba en burbujeo, y `toggleFase`
  → `renderFases()` reescribe los botones con `innerHTML`: cuando el evento llegaba al documento el botón tocado ya no estaba en el árbol,
  `closest('#kf button')` daba null y no se repintaba. Elegir una fase dejaba «Sin registrar» y quitarla dejaba «Registrado» hasta el siguiente
  tecleo. Las pruebas llamaban a `toggleFase()` y `rielRender()` directos, por eso nunca lo vieron. · **Arreglo en dos líneas.** (1) el listener va
  **en fase de captura** (corre antes del `onclick`, con el botón en su sitio; el repintado diferido de 250 ms ocurre después): cubre la CLASE de
  defecto, cualquier botón que se reescriba a sí mismo; (2) `renderFases()` pide el repintado, como `renderChips()` con los procedimientos: es
  donde termina SIEMPRE el cambio de fase, incluida la fase nueva agregada al catálogo, que termina en la respuesta del servidor sin clic ni input.
  🪤 Cada una cubre un hueco distinto y la guardia lo prueba por separado: sin el (2), la fase agregada con Enter se queda en «Sin registrar» si el
  servidor tarda más de 250 ms (con la respuesta a 5 ms del simulacro el `change` que dispara el Enter lo tapaba: por eso la guardia atrasa la
  respuesta a 700 ms); sin el (1), solo un botón de juguete que se saca a sí mismo del árbol lo delata.
- **R3 y R8 · el texto escrito y sin agregar contaba como dato.** `_mLeer` cuenta cualquier `<input>` de texto con valor. Escribir «aspiración de
  secreciones» en «Escribir procedimiento…» sin apretar «+ Agregar» ni Enter hacía decir «Registrado aspiración de secreciones», y `guardar()`
  manda `PROC_JSON:"[]"`: el procedimiento se perdía sin aviso, con el cuadro dentro de un `<details>` cerrado (el encabezado era lo único que se
  veía). · **Arreglo.** Atributo `data-sin-dato` en los cuadros de «escribir para agregar» y un `continue` en `_mLeer`. Los marcados: `#inProc`,
  `#faseNuevaInput` (el de «＋ nueva fase»), `#fCultInput` (Resultado(s) del cultivo), `#anotTxt` y `#anotHora` (hechos del turno) y `#pasoPendTxt`
  (otro pendiente): ninguno lo lee `guardar()`; la lista de la guardia lleva el motivo de cada uno. Lo realmente agregado ya lo cubren `@procs`,
  `@fase` y `fCultVal`.
- **R4 y R10 · el encabezado decía «falta un dato obligatorio» para cinco obligatorios.** El nombre corto del encabezado vivía en una SEGUNDA
  tabla por id (`_mFaltaTxt`) que conocía diez y no las razones de la PVE (no realizada y no corresponde), el motivo de su «Otra», el tipo de la
  extubación sin PVE ni la hora de la reintubación (seis campos, cinco situaciones), mientras la línea «Falta:» de arriba sí los nombraba: la promesa de «una sola lista» no llegaba al texto del encabezado.
  · **Arreglo.** Cada entrada de `_obligatoriosPendientes()` lleva ahora `{ el, texto, corto }`: `texto` es el de «Falta:» (intacto, palabra por
  palabra), `corto` el del encabezado («la firma», «declarar la PVE», «la razón de la PVE»…) y, si una entrada no lo trae, el encabezado usa su
  `texto`, nunca un genérico. `estadoBloque(cont, pendientes)` recibe las entradas completas y devuelve `faltaTxt` junto a `falta`;
  `_mPintarEstado` lo usa y `_mFaltaTxt` **se borró**. Los diez nombres que ya existían se conservaron idénticos (los fijan otras guardias).
  Se corrigió de paso el comentario de `el`: es el elemento que CONTIENE el dato (a veces un `<input type=hidden>` que no se puede enfocar:
  `fPVEval`, `fKTMraz`), sirve para saber qué tarjeta lo tiene y nadie debe navegar con él.
- **R5 y R9 · la lista de procedimientos y los chips de fase interpretaban HTML.** `renderChips` escribía `${p}` crudo en `innerHTML` y
  `renderFases` el nombre de la fase en el texto y (con un reemplazo de comillas a medias) en `data-f`. El texto de un procedimiento es libre y
  vuelve en `PROC_JSON` del turno anterior (de otro colega); el catálogo de fases es compartido. Ejecutado: una `<img onerror>` en cualquiera de los
  dos corría. · **Arreglo.** `escapeHtml` en las tres posiciones (la regla del escapador único de CLAUDE.md); `this.dataset.f` devuelve la cadena
  original, así que `toggleFase` sigue recibiendo el nombre exacto (la guardia lo prueba con una fase «Agudo "x" & <b>y</b>»).

**Guardias.**
- `estado_visible_escritorio.js`. **5c** (nueva): a 900, 1024, 1100, 1150, 1200, 1280 y 1366 px, con el resumen largo en la columna izquierda, además
  con uno largo en Respiratorio y con el escenario de tubo + VM con parámetros: sin scroll lateral del panel ni de la página, columnas 2:3 (la
  izquierda no crece), la tarjeta Respiratorio dentro de la ventana y nada que se salga de su columna. **5d** (nueva): el resumen de Respiratorio se
  ve entero en esos anchos y el encabezado no pasa de 80 px. **6b** (nueva): `<img onerror>` en un procedimiento y en una fase no se ejecuta ni crea
  elementos, y el chip con comillas, `&` y `<b>` conserva su valor. El arnés (página + turno de la cama 3) se sacó a dos funciones para que los dos
  bucles de anchos partan del mismo sitio.
  **Reconciliada con su razón (sin borrar aserciones):** la sección 6 usaba como vehículo del «el encabezado no interpreta HTML» el cuadro
  «Escribir procedimiento…», que justamente deja de ser un dato; ahora el vehículo es una opción hostil del desplegable de Sedación (un campo que
  SÍ se guarda). Las tres aserciones son las mismas.
- `estado_del_bloque.js`. **4c** (nueva): clic REAL de ratón sobre un chip de fase (elegir, quitar, y quitar partiendo de «Registrado» puesto por
  código) comparando la palabra pintada, sin llamar a `rielRender` a mano; un botón de juguete que se saca a sí mismo del árbol (la raíz); y la
  fase agregada con ＋ → escribir → Enter con el servidor atrasado 700 ms. **4d** (nueva): texto en `#inProc` sin agregar → «sin registrar» (estado y
  encabezado), medido también en lo que SE GUARDA (`PROC_JSON:"[]"` con vía natural); control positivo al agregarlo; y la lista de los seis
  cuadros que llevan `data-sin-dato`, cada uno con su motivo. **Reconciliada:** la forma del resultado de `estadoBloque` pasó de
  `estado,falta,resumen` a `estado,falta,faltaTxt,resumen` (una clave nueva; las otras tres no cambian), que es lo que pide R10.
- `aviso_igual_que_guardar.js`. Cada obligatorio de la lista de siempre lleva ahora su frase de encabezado (se agregó el caso «PVE no corresponde con
  Otra sin motivo», que no estaba), se exige que el encabezado de la tarjeta que lo contiene lo nombre y que **ninguno diga «un dato obligatorio»**,
  a 1200 y a 390 px (en escritorio las tarjetas del Turno muestran el mismo encabezado); que cada entrada traiga su `corto`; que `_mFaltaTxt` ya no
  exista; y que una entrada sin `corto` se nombre con su texto.
- **Sensibilidad probada con mutantes** (copias fuera del repositorio): el listener sin captura → sale roja la aserción del botón de juguete (2
  fallos: a los dos anchos), no los chips, que los cubre `renderFases`; `renderFases` sin su repintado → sale roja «agregada con Enter → Registrado»
  (2 fallos). Hecha la guardia con la respuesta a 5 ms, este segundo mutante **sobrevivía**: ahí se vio lo del `change` del Enter y se atrasó la
  respuesta.

**Vecinas.** Con `-j 2`, en tres tandas: `convenciones`, `escapado_unico`, `emojis_nuevos`, `estado_del_bloque`, `estado_visible_escritorio`,
`aviso_igual_que_guardar`, `obligatorios_una_sola_lista`, `abrir_hasta_el_campo`, `anotaciones_turno`, `cierre_tres_bloques`, `evaluaciones_celular`,
`firma_texto_por_flujo`, `general_disuelta`, `general_solo_lo_suyo`, `guardado_viajes`, `ktm_otro_pantalla`, `movil_panel`, `movil`,
`nada_del_guardado_despues`, `paso_relato`, `pendiente_arrastra`, `piso_letra_celular`, `pve_no_corresponde_razon`, `pve_otra_pantalla`,
`regresion_ui`, `reporte_colega`, `sin_riel`, `titulos_tres_niveles`, `validacion_entre_pasos`, `panel_ux`, `seis_pasos`, `cuatro_pasos`,
`prevencion_navm`, `ceros_de_punta_a_punta`, `hdn_y_upot`, `evento_sin_doble_pregunta`, `intubacion_modulo_evento`, `via_aerea_previo`,
`tres_ejes_respiratorio`, `prono_arriba`, `episodio_turno`, `act_bar_390`, `contraste_tokens`, `tarjeta_acciones`, `boton_principal_unico`,
`retro_camas`, `terapia_fisica_vuelve_al_reabrir`, `ktm_nivel_no_se_cuela`, `tutorial` y `paquete`: todas verdes. Única roja: `pwa_paquete` (el
paquete instalable queda por regenerar en el cierre). `guardado_viajes` y `episodio_turno` verdes: lo que `guardar()` manda no cambió.

**Lo que ve distinto la kinesióloga.**
- Con el panel abierto en una pantalla de escritorio de 900 a 1366 px, una auscultación con varias opciones ya **no empuja** la tarjeta de
  Respiratorio hacia la derecha ni deja el panel con scroll de lado; las dos columnas guardan su proporción.
- El resumen del encabezado de Respiratorio («Requiere revisión falta declarar la PVE — VM · ACVC») **ya no se corta** entre 1100 y 1280 px:
  cuando no cabe junto al título pasa a una segunda línea.
- Elegir o quitar una fase clínica **actualiza al toque** la palabra del encabezado («Registrado» / «Sin registrar»).
- Escribir un procedimiento (o una fase, un microorganismo, un hecho o un pendiente) **y no agregarlo** ya no hace decir «Registrado» ni muestra el
  texto en el encabezado: sigue sin guardarse, pero el encabezado ya no afirma lo contrario.
- El encabezado de la tarjeta dice **qué** falta en vez de «falta un dato obligatorio»: «falta la razón de la PVE», «falta el tipo de la
  extubación sin PVE», «falta la hora de la reintubación», «falta el motivo de la «Otra» razón de la PVE».
- Un procedimiento o una fase con signos como `<` o `&` se ve tal cual se escribió.

**Lo que NO se hizo y queda dicho.**
- 🪤 **Mismo defecto, otros dos sitios, sin tocar (no estaban en los hallazgos):** `tiRender` (los microorganismos del cultivo) y `renderAislTags`
  (el aislamiento) escriben cada etiqueta con `${t}` crudo en `innerHTML`, igual que `renderChips`. El de aislamiento vive en un bloque oculto.
  Es la misma corrección de una línea con `escapeHtml`; queda a decisión de quien arma el siguiente paso.
- `guardar()` sigue sin agregar el texto pendiente de `#inProc` (opcional que anota R3): es decisión de Diego y no se tomó. Esta corrección solo hace
  que el encabezado deje de afirmarlo.
- No se tocaron `guardar()`, `api()`, `gs()`, `_guardadoBotones`, la franja `#gEstadoGuardado` ni los `avErr*`. Sin migración de esquema. `entrega/`,
  `pwa/` y la `VERSION` quedan para el cierre; `build/paquete_migracion/index.html` lo regeneró la guardia `paquete.js` y va en el commit.
- En `docs/PENDIENTES.md` la fila «`_mFaltaTxt` dice "un dato obligatorio" para lo que no conoce» queda **resuelta** con este paso (no se editó ese
  archivo aquí).

## 10-oct-2026 · Turno respiratorio (tanda 3), revisión adversarial · paso F2 «el error lleva al campo»: la firma, los rangos fisiológicos, el APACHE, los chips de Evaluaciones y «Ir al bloque de…» ya llevan hasta lo que hay que corregir

**De dónde sale.** El hallazgo R11 de la revisión y los dos cabos sueltos que dejó el paso 3.1 (decisiones 13 y 14 de `docs/PENDIENTES.md`): `guardar()`
estaba cerrado desde la tanda 2 y por eso lo que quedaba de «el error lleva al campo» esperaba. Terminado el trabajo de `guardar()`, este paso lo toca
**solo para esto**. **Se reprodujo todo antes de tocar** (Chromium con reloj congelado al lunes 10-ago-2026 11:00, `google.script.run` simulado) y las
guardias nacieron rojas contra el código sin arreglar.

**Lo medido, rama por rama (todas con el mismo mensaje de siempre; solo cambia adónde lleva).**
- **Firma.** A 390 px, parado en Planes, «⚠️ Debes seleccionar la firma…» y el foco caía en «Cerrar el turno», plegada (`display:none`): `guardar()`
  hacía `sel.focus()` directo. En escritorio ya funcionaba (la firma está en el paso que guarda).
- **Rangos fisiológicos (FiO₂, VT, FR, SpO₂, PEEP, edad, talla).** Toast y nada más, **en los dos anchos**: `PASO_ACTUAL` seguía en 5, el campo vive en el
  paso 2, `activeElement` vacío. R11 lo describía a 390 px; **a 1200 también** falla, porque el campo no está en el paso en que se guarda.
- **APACHE.** `focus()` directo: no hacía nada si el APACHE estaba en otro paso (vive en Evaluaciones, paso 3), en la tarjeta plegada o en la familia
  «Preingreso» del cajón de Evaluaciones, que se cierra al abrir otra familia (medir una Pimáx después de escribir el APACHE bastaba).
- **Los siete chips de Evaluaciones** (Pimáx, dinamometría, PEmáx, FEmáx, IMS, ecografía, protección de vía aérea). A 390 px la tarjeta de
  Evaluaciones nace plegada: el chip abría el cajón y la familia pero no la tarjeta, y el campo quedaba invisible. `chips_llevan_al_campo.js` no lo
  veía porque medía a un solo ancho.
- **`transOfIr` («Ir al bloque de extubación / intubación / decanulación →» del aviso de transición).** La auditoría decía «el mismo patrón, no se midió».
  Medido (paso 5, TOT→Natural sin extubación, Guardar, tocar el botón): **es peor que un pliegue, y en cualquier ancho**. El modal se cerraba y nada más:
  no cambiaba de paso (el aviso sale al guardar, en el 5) y su `ancla` apuntaba a controles que no se pueden alcanzar: `fPVEval` es un `<input
  type=hidden>` y `cIntubO` / `cDecanOcurrio` son casillas que el módulo del evento (21-sep) dejó escondidas, porque el evento se declara con los
  botones de «Eventos de vía aérea». Con solo `_abrirHastaCampo(el)` antes del scroll, como se había propuesto, la tarjeta se abría y el control seguía
  invisible.

**Los cambios (solo `v2/index.html`).**
1. `guardar()`: la rama de firma, la de APACHE y la de rangos llaman `_irAlCampo(...)` después del toast. Los mensajes no cambian.
2. `_validarRangosCliente()` devuelve `{msg, id}` en vez de solo el texto (su único consumidor es `guardar()`); el id es el del campo del primer error,
   el mismo del toast.
3. `_abrirHastaCampo(el)` abre dos pliegues más, con las mismas funciones que usa quien los toca a mano (no una copia de su lógica): la **ficha del
   episodio** (`#fcId`, que fuera del ingreso nace oculta: `fichaAplicar(true)`) y la **familia de Evaluaciones** que el cajón compartido no está mostrando
   (`evFamAbrir`, y solo si no es la abierta, porque tocar la abierta la CERRARÍA).
4. `_irAlCampo`: la identificación (`#fcId`) es del **paso 0**, que solo existe mientras se ingresa (`pasoIr` lo recorta a 1). El viejo `paso && …` daba
   falso con el 0 y un aviso de edad o talla no iba a ningún lado. Fuera del ingreso la ficha se destapa en el Turno, así que el destino pasa a ser el 2;
   en el ingreso se vuelve al 0.
5. `pasoEvalMedir` llama `_abrirHastaCampo(el)` antes del `scrollIntoView` (la línea que ya se había propuesto).
6. `transOfIr` va por `_irAlCampo` al **botón del evento** (`#evVAfila .ev-va[data-ev=…]`), que es donde se declara; `cf.ancla` queda de respaldo.
   Lo que se pierde: el scroll suave y los 2,8 s de contorno (ahora 2,5 s, como en todos los avisos).

**Guardias.**
- `abrir_hasta_el_campo.js` (a 390 y a 1200 px; el toast se ESPÍA y se exige idéntico). **6** pasó de «conocido» a aserción (firma por `guardar()`).
  **7** (nueva): FiO₂, VT, FR, SpO₂, PEEP, edad y talla con la ficha abierta y con la ficha **cerrada**, y la edad en un **ingreso** (parado en el 5, tiene
  que volver al 0). **8** (nueva): APACHE sin abrir la familia, con «Preingreso» cerrada por otra, y con un decimal. **9** (nueva): el aviso real de
  transición (Guardar desde el 5) con extubación, intubación y decanulación: modal cerrado, paso 2, botón del evento visible, con foco, dentro de la
  pantalla, y a 390 px su tarjeta y su sub-bloque abiertos. Cada escenario exige primero que de partida el campo NO se vea.
- `chips_llevan_al_campo.js` corre ahora a **1200 y a 390 px**: a 390 px cada chip parte con su tarjeta plegada (se vuelve a plegar entre chips; si no, el
  primero abre la de todos) y se pide el campo a la vista **y** la tarjeta abierta; también el IMS en sus cuatro variantes de KTM.
- **Rojo antes** (guardias finales contra el `index.html` del commit anterior): `abrir_hasta_el_campo` **145 fallos** (390 px: firma 4, rangos 48,
  APACHE 15, transición 15; 1200 px: rangos 39, APACHE 12, transición 12), `chips_llevan_al_campo` **32** (todos a 390 px; los de 1200 siguen verdes:
  el control). **Verde después**: 400 y 92 líneas ✅ (las dos guardias salen con código 0).
- **Mutantes** (copias fuera del repositorio): sin la rama de la ficha → 13 rojos; sin la de la familia → 19; sin el paso 0→2 → 33; chip sin
  `_abrirHastaCampo` → 33; `transOfIr` como antes → 25; firma con `focus()` directo → 5; rangos sin `_irAlCampo` → 88; APACHE sin `_irAlCampo` → 28. Los
  ocho mueren.
- 🪤 Un control de la propia guardia salió mal al principio: «de partida la firma NO se ve» es cierto a 390 px y falso a 1200 (la firma está en el paso que
  guarda). Ahora es solo del celular, y en escritorio se mide que conserve el foco.
- 🪤 `abrir()` deja `_transAvisoOk=true` para que `guardar()` no abra el modal en los demás bloques; el bloque 9 lo necesita abierto y lo apaga en su
  `armar`, que corre después. Sin eso, el rojo del bloque 9 era un rojo de arnés y no del código.

**Vecinas.** Con `-j 2`, en tres tandas (100 guardias): `convenciones`, `nada_del_guardado_despues`, `apache`, `fio2_venturi`, `ficha_y_antes`,
`ingreso_*`, `transicion_ofrece_evento`, `eventos_ui`, `extubacion_una_ruta`, `intubacion_modulo_evento`, `intubar_desde_natural`, `aviso_*`, `estado_*`,
`obligatorios_*`, `validacion_entre_pasos`, `paso_*`, `evaluaciones_*`, `esfuerzo_en_evaluaciones`, `movil*`, `seis_pasos`, `cuatro_pasos`, `panel_ux`,
`panel_no_pisa_datos`, `guardado_*`, `fallo_guardado_visible`, `sin_guardar`, `escapado_unico`, `tutorial`, `eco_pulmonar`, `pve_*`, `ktm_*`,
`general_disuelta`, `rut_minimo`, `sin_riel`, `retro_camas`, `act_bar_390`, `tarjeta_acciones`, `piso_letra_celular`, `confirma_guardado`,
`borrador_local`, `episodio_*`, `ceros_*`, `cierre_*`, `prono_arriba`, `mover_camas`, `relato*`, `prevencion*`, `dias_*` y `paquete` (que regeneró
`build/paquete_migracion/index.html`, incluido en el commit): todas verdes. Única roja: `pwa_paquete` (regeneración del cierre).

**Lo que ve distinto la kinesióloga.**
- En el celular, **«Debes seleccionar la firma»** abre la tarjeta «Cerrar el turno» y deja el selector a la vista con el borde rojo.
- Un **valor fuera de rango** (FiO₂ de 5, VT de 5000, edad de 5…) ya no deja solo el cartel: **lleva al paso y a la tarjeta donde está el campo**, lo
  abre si estaba plegado (incluida la ficha) y lo enfoca. Lo mismo con el **APACHE** fuera de rango, aunque haya abierto otra evaluación después.
- Tocar el chip de **Pimáx, dinamometría, PEmáx, FEmáx, IMS, ecografía o protección de vía aérea** en el celular abre la tarjeta de Evaluaciones y deja el
  campo a la vista.
- El botón **«Ir al bloque de extubación / intubación / decanulación →»** ahora **hace algo**: cierra el aviso, vuelve al Turno, abre «Eventos de vía aérea»
  y deja marcado el botón del evento (Extubación, Intubación o Decanulación) para tocarlo. Antes no pasaba nada en ninguna pantalla.

**Lo que NO se hizo y queda dicho.**
- Los mensajes y las reglas de validación no se tocaron: solo adónde lleva cada aviso.
- `transOfIr` ya no hace scroll suave ni lo contornea 2,8 s, y apunta al botón del evento y no a un «bloque» propiamente. Es una decisión de comportamiento
  (el rótulo dice «bloque»; el sub-bloque se llama «Eventos de vía aérea»): si Diego prefiere llevar a otro lugar, es cambiar una línea.
- No se tocaron `api()`, `gs()`, `_guardadoBotones`, la franja `#gEstadoGuardado` ni los `avErr*`. Sin migración de esquema. `entrega/`, `pwa/` y la
  `VERSION` quedan para el cierre.
- `docs/PENDIENTES.md`: las decisiones 13 y 14 quedan marcadas como resueltas (la 7 de la sección 2e, abrir sola la tarjeta única de Planes, sigue siendo
  una decisión de producto aparte).
