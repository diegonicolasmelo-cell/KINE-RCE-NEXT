# KINE-RCE-NEXT — reglas vigentes

Reconstrucción del Registro Clínico Electrónico de Kinesiología UCI del
Hospital San Pablo de Coquimbo, según `PLAN_MAESTRO.md`. Google Apps Script +
Google Sheets. El usuario es **Diego Melo Villagrán**, coordinador de
kinesiólogos, **no programador**: trabaja en español, actualiza el proyecto
pegando a mano los archivos en el editor de Apps Script y prueba en el
navegador del hospital o de su casa.

> 📓 **Este archivo son las REGLAS y se lee entero.** Lo que se hizo y por qué
> va a `BITACORA.md`. Lo que falta del plan, medido, va a `ESTADO_PLAN.md`.
> El detalle clínico y el modelo de datos están en la skill `rce-kine`.

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

### 🔴 El paquete de entrega se genera, no se edita
`node build/paquete_migracion.js entrega`. La guardia `paridad_entrega.js`
compara `entrega/` contra lo generado **byte a byte**: editar ahí es trabajo
que se pierde, y olvidar regenerar pone la batería roja.

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
  la hora a la que se corra. Ya pasó dos veces: el `hoyISO` sombreado por el
  eval, y el arranque que hacía dos viajes **solo en los 30 minutos previos al
  cambio de turno** (a las 10:00 verde, a las 19:39 rojo). Si el código bajo
  prueba mira la hora, el reloj se congela en el caso peor.
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
