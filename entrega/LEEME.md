# entrega/ — el paquete listo para pegar

**Esta carpeta es el proyecto de Apps Script de NEXT, archivo por archivo.**
Lo que está aquí se pega en el editor sin armar ni fusionar nada.

🔴 **NEXT no toca la aplicación del hospital.** Este paquete va a una
**planilla nueva con su propio proyecto de Apps Script**, separada de la que
usa el equipo. No se pega en la implementación de producción de RCE-KINE.

---

## Para qué sirve

El repositorio guarda el código **fuente** en `v2/`, repartido en archivos por
tema (`svc_camas.gs`, `svc_evoluciones.gs`, `dominio_texto.gs`…). Eso es cómodo
para programar, pero **el proyecto de Apps Script no usa ese reparto**: usa 10
archivos, porque los servicios, la infraestructura y el dominio viajan
fusionados.

Pegar los archivos sueltos de `v2/` en el editor **rompe el proyecto** (ya
pasó: funciones duplicadas). Esta carpeta evita ese error: cada archivo de aquí
corresponde 1 a 1 con un archivo del editor.

---

## Qué pegar y dónde

| Archivo de esta carpeta | Archivo en el editor de Apps Script |
|---|---|
| `esquema.gs` | `esquema` |
| `repo.gs` | `repo` |
| `infra.gs` | `infra` |
| `dominio.gs` | `dominio` |
| `servicios.gs` | `servicios` |
| `api.gs` | `api` |
| `webapp.gs` | `webapp` |
| `mantenimiento.gs` | `mantenimiento` |
| `mantenimiento_manuel.gs` | `mantenimiento_manuel` |
| `spike.gs` | `spike` |
| `index.html` | `index` |
| `spike_gis.html` | `spike_gis` |
| `appsscript.json` | manifiesto (Configuración → «Mostrar appsscript.json») |

En todos los casos se **reemplaza TODO el contenido** del archivo, no se pega
al final.

---

## Desde CERO: planilla nueva y proyecto nuevo

Para la primera vez, o para volver a empezar limpio. 🔴 Es una planilla **de
pruebas**, aparte de la que usa el equipo en la unidad.

1. **Planilla nueva** en Google Sheets (hoja en blanco). Ponerle un nombre que
   se distinga a simple vista de la de producción, p. ej. «RCE KINE — NEXT
   (pruebas)».
2. **Extensiones → Apps Script.** El proyecto tiene que nacer *desde la
   planilla*: así queda amarrado a ella. El permiso que pide el código es
   `spreadsheets.currentonly`, que solo alcanza a la planilla que lo aloja.
3. **Configuración del proyecto** (el engranaje ⚙️ de la izquierda) →
   marcar **«Mostrar el archivo de manifiesto appsscript.json en el editor»**.
4. **Borrar el archivo que viene de fábrica** (`Código.gs` / `Code.gs`).
5. **Crear los 13 archivos** de la tabla de arriba, con el ➕ de «Archivos»:
   · los `.gs` como **Script**, con el nombre SIN extensión (`esquema`, `repo`,
     `infra`, `dominio`, `servicios`, `api`, `webapp`, `mantenimiento`,
     `mantenimiento_manuel`, `spike`);
   · `index` y `spike_gis` como **HTML**;
   · `appsscript.json` ya existe tras el paso 3: se reemplaza su contenido.
6. **Pegar cada archivo entero** y guardar (Ctrl+S).
7. **Correr `crearORepararEstructura()`** (vive en `esquema`) desde el selector
   de funciones. La primera vez Google pide autorizar los permisos: es normal,
   el proyecto es propio. Después, revisar el registro de ejecución: crea todas
   las hojas con sus encabezados y las semillas de CONFIG.
8. **Implementar → Nueva implementación → Aplicación web**, con
   «Ejecutar como: yo» y «Quién tiene acceso: cualquier persona».
9. Abrir la dirección `/exec` que entrega, con **Ctrl+Shift+R**.

🪤 El paso 7 no se puede saltar ni automatizar: sin él las hojas y las columnas
no existen, y el formulario manda datos a ninguna parte **sin avisar**.

---

## Después de pegar

1. Guardar.
2. Verificar el sello: `Ctrl+F` en `index` → buscar la versión que dice
   `build/empaquetar_cohete.js` (constante `VERSION`).
3. Si la entrega lo pide, correr `crearORepararEstructura()` desde el editor.
4. Implementar → **Administrar implementaciones** → ✏️ → Nueva versión, sobre
   la implementación de **esta** planilla de pruebas.

---

## Sobre `index.html`

No es HTML legible: es el **cohete**, un cargador que lleva la aplicación
empaquetada en base64. Se ve así a propósito.

Google reprocesa el HTML que se le sirve con un lector más estricto que el
navegador, y con el archivo crudo el arranque se caía con un error engañoso
(`Invalid regular expression`) que además apuntaba a una línea que no era la
nuestra. Costó días encontrarlo. El empaquetado lo resuelve de raíz: Google
nunca ve el HTML real. Cuesta unos 50 ms una sola vez por carga.

---

## Esta carpeta se REGENERA, no se edita

```bash
node build/paquete_migracion.js entrega
```

Editar aquí es trabajo que se pierde en la próxima regeneración. La guardia
`build/checks/paridad_entrega.js` compara **byte a byte** esta carpeta contra
lo que genera el empaquetador: si alguien edita aquí, o si alguien cambia el
fuente y olvida regenerar, la batería se pone roja.
