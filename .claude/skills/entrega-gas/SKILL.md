---
name: entrega-gas
description: Pipeline de entrega de archivos al proyecto Apps Script de RCE-KINE. Usar SIEMPRE que haya que enviar al usuario archivos para pegar en el editor de Apps Script — index.html, servicios.gs o cualquier .gs — después de cualquier cambio de código, arreglo de bug o nueva funcionalidad. También cuando el usuario pida "mándame el archivo", "el index", "el zip" o reporte que va a pegar código. El index NUNCA se entrega crudo; viaja en formato cohete (base64).
---

# Entrega de archivos a Apps Script (NEXT)

🔴 **NEXT no despliega la aplicación del hospital.** Su paquete va a una
planilla de pruebas con su propio proyecto de Apps Script, separada de la que
usa el equipo. Nunca se pega en la implementación de producción de RCE-KINE.

Diego (el usuario, no programador) actualiza su proyecto de Apps Script
pegando a mano el contenido de los archivos que se le envían. Esta skill
define el único formato de entrega válido y el ritual de instrucciones que
debe acompañar a cada envío. Saltarse pasos ya costó días de depuración
(ver `CLAUDE.md`, sección «La saga del boot»).

## Reglas de oro

1. **El index JAMÁS se entrega como HTML crudo.** El bootstrap de Google
   (`userCodeAppPanel`) se rompe al servir el HTML grande directamente
   («Invalid regular expression: missing /» en su propia línea, no en la
   nuestra). El entregable es siempre el **cohete**: cargador ASCII puro con
   la app empaquetada en base64, generado por `build/empaquetar_cohete.js`.
2. **Sello de versión.** Antes de generar, sube la constante `VERSION` en
   `build/empaquetar_cohete.js` (2.3-cohete → 2.4-cohete → …) y actualiza el
   sello `[index X.Y-…]` del watchdog en `v2/index.html` (meta `rce-version`
   y el mensaje «La app no pudo iniciar»). Cada error futuro debe delatar
   qué versión lo produjo.
3. **Nombre de archivo único por versión** (`index_v24_cohete.html`, no
   `index.html`): el usuario acumula descargas y ya pegó una vieja por error.
4. **El paquete entero se GENERA, no se arma a mano.**
   `node build/paquete_migracion.js entrega` produce los 13 archivos que el
   editor necesita: los `svc_*.gs` fusionados en `servicios.gs`, los
   `infra_*` en `infra.gs`, los `dominio_*` en `dominio.gs`, el resto copiado
   1:1 y el index en formato cohete. Falla si hay funciones duplicadas — no
   ignorar ese fallo. La guardia `paridad_entrega.js` compara `entrega/`
   contra lo que genera el empaquetador **byte a byte**: si cambiaste el
   fuente y olvidaste regenerar, la batería se pone roja.
5. **Verificar antes de enviar.** `node build/verificar.js` — la batería
   entera (skill `verificar`). Nunca enviar un archivo que no arrancó en el
   simulador.
6. **Qué archivos pegar SE CALCULA, no se recuerda:** `node build/que_pegar.js
   <referencia-ya-pegada>` (la última que el usuario pegó de verdad, que puede
   ir detrás de la rama). Recordarlo ya dejó dos entregas incompletas: faltaron `esquema` —y
   sin él las columnas nuevas no existen, así que el formulario manda datos a
   ninguna parte, en silencio— `dominio` y `mantenimiento`.
7. 🔴 **EL PORTAPAPELES CORROMPE LOS ACENTOS EN ARCHIVOS GRANDES** (19-ago-2026).
   `pbcopy` con `servicios.gs` (377 KB) entregó 366 KB: `Diagnóstico` llegó como
   `Diagnostico`, `única` como `nica`. **No se detecta a ojo** — pegado en el
   editor el archivo se ve perfecto. Se caza con `cmp` contra el original, nunca
   mirando. Es la misma familia del mojibake de ago-2026 (`FALLÓ` → `FALL√ì`) y
   **la razón de fondo por la que el index viaja como cohete ASCII puro**: ese
   formato sí sobrevive el viaje.

   Para pegar un `.gs` grande con acentos, la vía que funcionó: **servidor HTTP
   local con CORS** + `fetch()` desde la consola del editor hacia
   `monaco.editor.getModels()`, y **verificar cada modelo después** (longitud,
   primeros/últimos 60 caracteres, y que los acentos sigan ahí). Ojo: la
   longitud que informa JS cuenta unidades UTF-16, así que un archivo con emoji
   da menos caracteres que bytes — comparar contra `len(texto)` de Python, no
   contra el tamaño en disco.
8. **Elegir el modelo del editor por URI o por cabecera, no por contenido**: hay
   tres proyectos llamados «RCE KINE 3.0» y buscar «el que contenga tal función»
   devuelve el dispatcher, que también la nombra. Antes de pegar, confirmar el
   proyecto comparando el **ID de implementación** carácter por carácter.
9. **El selector de funciones puede ejecutar la ANTERIOR.** Tras elegir una
   función, confirmar que el botón cambió, y después leer el registro de
   ejecución para ver qué corrió de verdad. No creerle al clic.

## Pipeline

```bash
# 1. Subir VERSION en build/empaquetar_cohete.js si cambió index.html
# 2. Regenerar el paquete completo
node build/paquete_migracion.js entrega

# 3. Batería completa (no solo dos guardias: son ~145 y corren en 2 minutos)
node build/verificar.js

# 4. Renombrar con la versión y enviar con SendUserFile
```

`playwright-core` se instala con `npm install --prefix build --no-save
playwright-core` (el Chromium ya está en `/opt/pw-browsers/chromium`).

## El mensaje que acompaña a la entrega (obligatorio)

Cada envío debe decir, sin excepción y en español:

- **Qué archivos pegar** y en qué archivo del editor va cada uno (los .gs
  se pegan reemplazando TODO el contenido; el nombre en el editor no lleva
  extensión).
- **Si hay que correr `crearORepararEstructura()`** (solo cuando cambió
  `esquema.gs` o se agregan columnas/hojas/semillas; decirlo explícitamente
  también cuando NO hace falta).
- **El paso de publicación**: guardar → verificar el sello con Ctrl+F
  (buscar `X.Y-cohete`) → Implementar → Administrar implementaciones → ✏️ →
  **Nueva versión** → probar en `/exec` con Ctrl+Shift+R. Sin «Nueva
  versión» lo pegado no llega a `/exec` (en `/dev` sí se ve al instante:
  sugerirlo para probar rápido).

## Después de entregar

Actualizar el zip de reconstrucción si existe en la conversación, y dejar
constancia en el commit de qué archivos debe re-pegar el usuario.
