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
