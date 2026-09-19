# KINE-RCE-NEXT — reglas vigentes

Registro Clínico Electrónico de Kinesiología UCI del Hospital San Pablo de
Coquimbo. Google Apps Script +
Google Sheets. El usuario es **Diego Melo Villagrán**, coordinador de
kinesiólogos, **no programador**: trabaja en español, actualiza el proyecto
pegando a mano los archivos en el editor de Apps Script y prueba en el
navegador del hospital o de su casa.

> 📓 **Este archivo son las REGLAS y se lee entero.** Lo que se hizo y por qué
> va a `BITACORA.md`. El detalle clínico y el modelo de datos están en la skill
> `rce-kine`.
>
> 🔴 **18-sep-2026 · Los PRD y planes anteriores están ARCHIVADOS** en
> `docs/archivo/` por decisión de Diego: ya no mandan y no se citan como
> argumento. Lo esencial de lo aprendido —el terreno, sus decisiones clínicas
> ya cerradas y las trampas pagadas— está destilado en `docs/LO_ESENCIAL.md`.
> Los acuerdos nuevos se cierran con `docs/GUIA_DE_ACUERDOS.md` y, a medida que
> Diego decide, se escriben en **`docs/ACUERDOS_REDISENO.md` con sus palabras**.
> Ése es hoy la vara: si contradice algo de `docs/archivo/`, manda él.
>
> 🪤 Archivar los planes NO archiva las guardias: un acuerdo de producto se
> puede cambiar, una cicatriz no. Las reglas de este archivo y `build/checks/`
> siguen valiendo enteras.

---

## 🔴 Lo primero: NEXT no toca el hospital

NEXT se desarrolla y se prueba **separado** de RCE-KINE. Su paquete de entrega
va a **una planilla nueva con su propio proyecto de Apps Script**, nunca a la
implementación que usa el equipo. En este repositorio no entran datos clínicos
reales, credenciales ni identificadores de la implementación de producción.

El repositorio de origen (`diegonicolasmelo-cell/RCE-KINE`) sigue siendo el que
corre en la unidad. NEXT no le manda cambios salvo que Diego lo pida.

---

## Cómo trabajar con Diego

- Todo en **español**. Explicar sin jerga; él decide, tú propones opciones
  ANTES de tocar código cuando el cambio es de diseño o de experiencia de uso.
- ☀️ **Todo mockup, artefacto o HTML que se le entregue va en TEMA CLARO**
  (pedido suyo, 2-sep-2026). Se hace definiendo la paleta clara en el `:root`
  pelado y **no escribiendo** los bloques `@media (prefers-color-scheme: dark)`
  ni `:root[data-theme="dark"]`, para que el artefacto no siga el tema de quien
  lo abre. El `body` **siempre** con `background` explícito desde un token.
  Vale también para documentos (PRD, planes, resúmenes), no solo pantallas.
- 🪤 **Emojis en la interfaz: nada posterior a 2019.** El Chrome del hospital
  corre en Windows 10 y su fuente no trae los nuevos: 🩻 (2021) salió como un
  cuadrado. Para un ícono nuevo, SVG propio o un emoji viejo.
  · La regla es para **elegir** un ícono nuevo, no para barrer los que ya
  están. Antes de declarar roto un emoji que ya vive en producción: `grep -rn`
  para ver dónde más está, y preguntarle a Diego si lo ve. El terreno manda
  sobre la tabla de versiones.
- **Ramas con nombre identificador**, en español y legible para él
  (`respaldo-mensual-permanente`, no `feature/backup`). Si la sesión trae una
  rama con nombre automático, se usa igual, pero al avisarle hay que decirle
  **en palabras** qué trae.
- Los eventos de vía aérea (intubación, extubación, TQT, decanulación) se
  registran **manualmente** por decisión clínica. Las alertas solo detectan
  olvidos; nunca automatizan el registro.
- No agregar funcionalidades que no pidió (rechazó, por ejemplo, el envío de
  correos).

---

## Arquitectura

```
v2/  (el fuente — acá se programa)
  esquema.gs        fuente ÚNICA de hojas y columnas; COL se DERIVA de ahí
  repo.gs           acceso a Sheets: lectura en bloque, escritura batch
  infra_*.gs        respuesta, fechas, lock, log, auth, utilidades
  dominio_*.gs      cálculos, texto clínico, validación — PUROS, sin Sheets
  svc_*.gs          lógica de negocio, un archivo por tema
  api.gs            dispatcher: identidad → validación → autorización → auditoría
  index.html        toda la interfaz

entrega/  (lo que se pega en el editor — se GENERA desde v2/)
```

Regla de dependencia: `api → servicios → repos → Sheets`. `dominio_*` es puro y
lo consumen los servicios. La interfaz nunca toca repos.

### 🔴 Prohibido hardcodear índices de columna
Las columnas se definen **una sola vez** en `esquema.gs` y de ahí salen los
encabezados, la lectura, la escritura y la migración. Un índice escrito a mano
en otro lado es cómo nació el desajuste 119≠132 del sistema viejo.

### 🔴 El escapado de la interfaz es uno solo
`escapeHtml` para texto y atributos, `escapeJs` cuando el valor cae dentro de
una cadena de JavaScript en un atributo, `hEsc` como tag de plantilla. **No se
define un escapador local nunca**: la guardia `escapado_unico.js` lo rechaza, y
existe porque había nueve distintos llamados casi todos `esc`.

### 🔴 Dos candados, y el del turno manda
`svc_acceso.gs` da identidad real sin depender de nadie de fuera: cada
kinesiólogo entra con su firma y su clave. Convive con el de Google (D1b), que
sigue construido y esperando el proyecto de Google Cloud.

- **Nace apagado.** Sin `CONFIG.LOGIN_EQUIPO_ACTIVO=TRUE` no cambia nada.
- **Se enciende con `accesoEncender()`**, que se NIEGA si algún kinesiólogo
  activo quedaría sin clave. Antes va `accesoSembrarClaves()`, que reparte una
  temporal a cada uno y las imprime para entregarlas.
- **En `autorizar()` va primero**, antes del modo desarrollo: si quedara
  después, encenderlo con `AUTH_DEV_MODE` olvidado en TRUE no protegería nada
  y ese olvido no se ve en ninguna pantalla.
- **La criptografía no se reescribe.** La primitiva es `credHuellaDe`
  (infra_util.gs) y la comparten el turno y coordinación. 🔴 El texto que se
  resume en coordinación **no se toca**: sus claves ya existen y cambiarlo las
  invalidaría todas de una vez.
- **Espacios separados**: una clave de coordinación no abre el turno, ni al
  revés. Son dos permisos distintos.

### 🔴 Dos caminos al servidor, una sola pantalla
La app sirve en dos sitios y la pantalla es **una**: `v2/index.html` detecta
dónde está.

- **Dentro del iframe** de Apps Script usa `google.script.run`, como siempre.
- **Como app instalada** llama al `/exec` por `fetch`, y el servidor contesta
  por `doPost` (`v2/api_web.gs`).
- 🪤 **El cuerpo del POST viaja como `text/plain`, no `application/json`.** Con
  JSON el navegador pregunta primero con OPTIONS y **Apps Script no contesta
  OPTIONS**: la llamada muere sin llegar. El error que se ve habla de CORS y
  manda a buscar al lugar equivocado. Lo fija `checks/puente_doble.js`.
- 🔴 **La puerta HTTP no decide nada**: llama al mismo `api()`. Un segundo
  catálogo de acciones haría que una acción nueva sirva por un camino y no por
  el otro.
- 🔒 **La dirección del `/exec` no se escribe en el código.** Cada aparato la
  configura la primera vez y queda en su localStorage.

### 🔴 El service worker no guarda datos clínicos
`pwa/sw.js` cachea **solo el armazón**: pantalla, manifiesto e iconos. Dos
filtros, y cualquiera basta: solo `GET` y solo del propio origen. Guardar las
respuestas dejaría el censo de la UCI escrito en el teléfono de cada uno.
🪤 El nombre del caché lleva el **sello de versión**: con un nombre fijo el
equipo se queda con la pantalla vieja y el síntoma es «pegué el archivo y no
cambió nada».

### 🔴 El paquete de entrega se genera, no se edita
`node build/paquete_migracion.js entrega` para el editor de Apps Script, y
`node build/empaquetar_pwa.js` para la app instalable. Las guardias
`paridad_entrega.js` y `pwa_paquete.js` comparan cada carpeta contra lo
generado **byte a byte**: editar ahí es trabajo que se pierde, y olvidar
regenerar pone la batería roja.
🪤 **Un empaquetador borra solo lo que genera, nunca la carpeta entera.** Con
`rmSync` de la carpeta se llevaba por delante el `LEEME.md` escrito a mano, y
eso pasó de verdad: el de `entrega/` estuvo borrado desde el 15-sep sin que
nadie lo notara, porque la guardia lo EXCLUÍA de la comparación en vez de
exigir que siguiera ahí. Ahora las dos guardias lo exigen.

---

## Verificación (skill `verificar`)

```bash
npm install --prefix build --no-save playwright-core   # una vez por sesión
node build/verificar.js                                # ~145 guardias, ~2 min
```

Las guardias viven en `build/checks/` y son **la memoria ejecutable de los bugs
ya pagados**: cada una existe porque su ausencia costó una sesión de
depuración.

- **Si una guardia falla, se arregla el código.** No se «ajusta la guardia» ni
  se esconde detrás de una excepción: así es como se pudren. Si la convención
  cambió de verdad, se borra con su razón escrita acá o en la bitácora.
- **La guardia se escribe PRIMERO y se ve ROJA** contra el código sin arreglar.
  Una guardia que nunca se vio roja no prueba lo que dice probar.
- 🪤 **Congelar el reloj.** Una guardia que lee el reloj real da distinto según
  **cuándo** se corra. Ya pasó TRES veces: el `hoyISO` sombreado por el eval; el
  arranque que hacía dos viajes **solo en los 30 minutos previos al cambio de
  turno** (a las 10:00 verde, a las 19:39 rojo); y `tutorial.js`, que se puso
  roja sola al cambiar el día porque **del 16 al 20 de septiembre Mauri sale de
  huaso** y sus poses cambian de imagen.
  · Si el código bajo prueba mira la hora o la fecha, el reloj se congela: en
  el caso peor si se está probando eso, y en un día cualquiera si no.
  · **Las ventanas trampa del calendario, hoy**: 16 al 20 de septiembre
  (Fiestas Patrias), los cumpleaños del equipo, el cierre de año (26-dic a
  febrero) y la media hora previa a cada cambio de turno.
  · La forma buena está en `checks/fiestas_patrias.js`: **la fecha se INVENTA,
  no se espera**. Congelar `Date` en la página sirve cuando la fecha no se
  puede pasar por parámetro.
- 🪤 **Las `const` no cuelgan de globalThis con eval indirecto** — solo
  `function` y `var`. Un servicio evaluado en otro ámbito revienta con «ERR is
  not defined», y si el arnés se lo traga, la prueba se salta en silencio.
- Un bug que costó más de un intercambio con Diego merece guardia permanente.

### Guardias A/B y su código congelado
`guardado_viajes.js` y `tablero.js` comparan el código de hoy contra el de un
commit anterior. NEXT arranca con historial propio, así que esos árboles viven
congelados en `build/checks/base/<commit>/`. **Esos archivos no se editan
nunca**: son una foto del pasado; tocarlos deja a la guardia midiendo otra cosa.

---

## Entrega a Apps Script (skill `entrega-gas`)

- El index **jamás** se entrega crudo: viaja como **cohete** (cargador ASCII
  con la app en base64). Google reprocesa el HTML con un lector más estricto
  que el navegador y el archivo crudo tumbaba el arranque con un error que
  apuntaba a una línea ajena. Costó días.
- Subir la constante `VERSION` en `build/empaquetar_cohete.js` en cada tanda
  que se pegue: es la única forma barata de confirmar que lo pegado es lo nuevo.
- Cada envío dice **qué archivos pegar**, **si hay que correr
  `crearORepararEstructura()`** (también cuando NO hace falta) y **cómo se
  publica**.
- 🪤 El portapapeles corrompe los acentos en archivos grandes: `Diagnóstico`
  llegó como `Diagnostico` y no se ve a ojo. Se caza con `cmp`, no mirando.

---

## Privacidad — no se negocia

Datos personales sensibles de salud (Ley 19.628 y Ley 21.719).

- **Nunca** se escriben datos clínicos reales, nombres de pacientes ni RUT en
  el repositorio, ni «de paso» en una guardia o un comentario. Los RUT de las
  pruebas son inventados (`11111111-1` y parecidos).
- Tampoco datos personales de los funcionarios: los cumpleaños del equipo se
  escriben en la planilla, no en el código.
- **El RUT no viaja donde no hace falta.** La guardia `rut_minimo.js` llama al
  dispatcher acción por acción y exige que no aparezca salvo en una lista corta
  con el motivo escrito. Agregar una entrada ahí es una decisión consciente.
- Los informes y la conciliación del REM van **sin RUT**, con assert.
- Nada de destinos externos con datos clínicos sin decisión explícita de Diego.
