# Estado del Plan Maestro en NEXT

> **Qué es esto.** `PLAN_MAESTRO.md` dice cómo debería estar construida la
> aplicación. La base que NEXT importó (RCE-KINE `7.04`, commit `21498b0`) es
> el resultado de un año de trabajo que avanzó mucho de ese plan **sin ir
> marcándolo**. Este documento mide, punto por punto, **qué del plan ya está
> hecho y qué falta de verdad**, para no reconstruir lo que ya existe ni dar
> por hecho lo que no.
>
> Todo lo que dice acá está **medido sobre el código**, no recordado. Cada
> afirmación trae dónde mirarlo.
>
> Medición inicial: 15-sep-2026, sobre la base 7.04 recién importada.

---

## Resumen en una línea

De los diez principios y nueve decisiones del plan, **la base cumple la mayor
parte de la arquitectura de datos y servidor**; lo que falta se concentra en
**la capa de navegador** (escapado, modularidad, login) más **dos deudas
puntuales** (el RUT y el respaldo mensual).

---

## 1 · Lo que el plan pedía y la base YA CUMPLE

No hay nada que hacer aquí. Se deja escrito para que nadie lo "reconstruya".

| Plan | Cómo está cumplido | Dónde mirarlo |
|---|---|---|
| §2.1 Fuente única del esquema | `ESQUEMA` define 27 hojas; `COL.<HOJA>.<CAMPO>` se **deriva** de ahí, no se escribe a mano | `v2/esquema.gs:297` y `:584` |
| §4.2 Hojas del modelo | Están las 14 del plan y 13 más nacidas después (VENTILADORES, EVALUACIONES, PLANTILLAS_EVOLUCION…) | `v2/esquema.gs:297+` |
| §4.3 `AUDIT_LOG` | Hoja creada y escrita por el dispatcher en cada acción de escritura | `v2/infra_log.gs`, `v2/api.gs` (`_auditar`) |
| §4.3 `EVOLUCIONES_ARCHIVO` | Partición real; la estadística y el REM leen las dos | `v2/esquema.gs`, `v2/svc_stats.gs`, `v2/svc_rem.gs` |
| §4.3 · D4 Nº de camas configurable | `CONFIG.NUM_CAMAS`, sin el 18 escrito a mano | `v2/esquema.gs`, `v2/api.gs` |
| §5 Identidad por episodio | `PATIENT_ID` en 19 archivos; las agregaciones filtran por episodio | `v2/svc_*.gs` |
| §5 · D9 `COD_PACIENTE` | Generado y poblado en EVOLUCIONES, CAMAS_ESTADO, ARCHIVO_PACIENTES y la entrega | `v2/esquema.gs:25,313,402,503` |
| §6 Repositorios | 18 funciones `repo*` con lectura en bloque y escritura batch; sin `getRange` por fila | `v2/repo.gs` |
| §7 Dispatcher | `api(accion, datos, token)` con identidad, validación, autorización, auditoría y respuesta `{ok,…}` | `v2/api.gs:25+`, `v2/infra_respuesta.gs` |
| §8 Módulos backend | Los 20 del plan existen, más los nacidos después (equipos, eventos, plantillas, GSA, notificaciones) | `v2/` |
| §10 · D1b Verificación de identidad | `infra_auth.gs` verifica el JWT contra Google, comprueba el `aud` y liga firma↔email | `v2/infra_auth.gs` |
| §11 REM por episodio único | Sin doble conteo activos+archivo; con página de conciliación | `v2/svc_rem.gs` |
| §13 Pruebas | **140 guardias** ejecutables, no un plan de pruebas | `build/checks/`, `node build/verificar.js` |
| §2.8 Repo gestionable | Sin archivos muertos; el paquete del editor se **genera** y una guardia lo compara byte a byte | `build/paquete_migracion.js`, `build/checks/paridad_entrega.js` |

---

## 2 · Lo que FALTA — medido, no supuesto

### 🔴 G1 · No hay UN escapado en la interfaz (§2.3, §9.1, §10)

El plan lo pone entre los principios **no negociables**: «todo valor de
paciente se inserta con `escapeHtml()`… cero `innerHTML` crudo con datos de
usuario», y pide un `core/escape.js` único.

Lo que hay medido en `v2/index.html`:

| | |
|---|---|
| `escapeHtml` | **0 usos** — la función del plan no existe |
| `esc` locales | **6 definiciones distintas**, cada una en su propio ámbito |
| `innerHTML` | 227 usos |
| `textContent` | 243 usos (estos sí son seguros) |

Y las seis `esc` **no hacen lo mismo**: la de la línea 13825 escapa `&`, `<`
y `"` pero **no `>`**; la de 13869 escapa metacaracteres de expresión regular;
las de 14988 y 15130 son comillas de CSV; la de 18194 solo escapa `"`. Que
todas se llamen igual es lo peligroso: quien copia una línea de un bloque a
otro cree que está escapando y puede estar citando un CSV.

**Riesgo real:** el nombre y el diagnóstico del paciente los escribe una
persona en un campo libre. No es un atacante externo — es un `<` en un
diagnóstico que rompe la tarjeta, y es la puerta que el plan quiso cerrar de
entrada.

---

### 🟠 G2 · El respaldo mensual permanente no existe (D7, §13)

D7 está cerrada: «**30 respaldos diarios** operativos **+ 1 snapshot mensual
permanente** (barato, protege la serie estadística)».

Medido en `v2/svc_backup.gs`: `backupDiario()` copia la planilla y
`_rotarBackups()` **manda a la papelera todo lo que pase de
`BACKUP_MAX_DIARIOS` (30)**. No hay ninguna mención de mensual, snapshot ni
permanente en el archivo.

**Consecuencia exacta:** a los 30 días no queda **ninguna** foto de la
planilla. La mitad de D7 —la que protege la serie de años que justifica la
estadística— no está escrita.

---

### 🟡 G3 · El login real está construido pero apagado (D1b, F4)

No es deuda de código: el servidor está entero (ver §1). Lo que falta es
encenderlo, y eso no depende de programar.

- `v2/index.html:18651` → `const LOGIN_UI_ACTIVO=false;`
- `CONFIG.OAUTH_CLIENT_ID` está vacío por defecto (`v2/esquema.gs:798`).
- `CONFIG.AUTH_DEV_MODE` viene en `FALSE` en el esquema, pero la planilla en
  uso lo tiene en `TRUE` — con eso cualquiera con el enlace llega al
  dispatcher (lo dice el propio `v2/svc_coordinacion.gs:24`).

**Depende de Diego y de informática**, no de esta rama: hace falta un proyecto
de Google Cloud con un OAuth Client ID (Web), y la decisión sobre el correo
institucional que sigue trabada. El spike del plan (F1) ya existe:
`v2/spike.gs` + `v2/spike_gis.html`.

---

### 🟡 G4 · El RUT sigue en el esquema (D9, §5)

D9 está cerrada y es explícita: «**se elimina la columna RUT** de todas las
hojas». `COD_PACIENTE` ya existe y convive con él, así que la mitad está
hecha; lo que falta es sacar el RUT.

Medido: 4 menciones en `v2/esquema.gs` y **67 en `v2/index.html`**, más
`api.gs`, `svc_camas.gs`, `svc_coordinacion.gs`, `svc_evoluciones.gs`,
`svc_gsa.gs`, `svc_indicadores.gs`, `svc_notificaciones.gs`, `svc_rem.gs`,
`svc_stats.gs`.

⚠️ **No es un buscar-y-reemplazar.** Al menos un consumidor usa el RUT como
llave clínica: la detección de **reingreso** del tablero (lo dice la semilla
de `build/checks/tablero.js`). Sacarlo exige decidir con qué se reconoce que
un paciente ya estuvo antes. Se hace por tandas, con guardia primero.

---

### 🟡 G5 · La interfaz sigue siendo un solo archivo (§9)

El plan pide `core/auth.js`, `core/bridge.js`, `core/escape.js`,
`core/modal.js`, `core/estado.js`, y cada modal como módulo con su propio
estado.

Medido: `v2/index.html` son **18.719 líneas en 3 bloques `<script>`**. No hay
capa `core/`.

Dicho sin adorno: partirlo entero es el trabajo más grande y más riesgoso de
todo el plan, y la base tiene 140 guardias que lo protegen **como está**. Se
gana de verdad sacando primero las piezas que resuelven un problema medido
—el escapado (G1) es la primera— y no moviendo código por moverlo.

---

### ⚪ G6 · `clasp` (§2.8, §13)

No hay `.clasp.json`. El `appsscript.json` sí está versionado y el paquete del
editor se genera solo, que era el 80% del problema. `clasp` necesita que Diego
autorice con su cuenta de Google desde un computador suyo: no es algo que se
pueda dejar hecho desde acá, y hoy no bloquea nada.

---

## 3 · Orden de trabajo

Primero lo que no depende de nadie más, y de mayor a menor riesgo evitado.

| # | Trabajo | Estado |
|---|---|---|
| 1 | **G1** · Un solo escapado en la interfaz, con guardia que lo exija | ✅ hecho |
| 2 | **G2** · Snapshot mensual permanente, con guardia | en curso |
| 3 | **G4** · Sacar el RUT, por tandas y con guardia primero | pendiente |
| 4 | **G5** · Capa `core/` en la interfaz, pieza por pieza | pendiente |
| 5 | Estética | pendiente |
| — | **G3** y **G6** | esperando a Diego / informática |

Lo que necesita **decisión de Diego** se le pregunta nombrando qué hace, no se
decide por él: con qué se reconoce un reingreso sin RUT (G4), y cuándo se
enciende el login (G3).
