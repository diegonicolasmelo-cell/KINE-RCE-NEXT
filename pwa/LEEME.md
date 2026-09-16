# pwa/ — la app instalable

Esto es lo que se publica como sitio para que el RCE **se instale en el
teléfono** y abra como una aplicación, sin la barra del navegador.

🔴 **Se GENERA, no se edita.** La pantalla es la misma de `v2/index.html`:

```bash
node build/empaquetar_pwa.js
```

La guardia `build/checks/pwa_paquete.js` compara esta carpeta contra lo que
genera el empaquetador **byte a byte** y se pone roja si alguien la edita a
mano o si cambia el fuente y olvida regenerar.

---

## Qué es y qué no

| | |
|---|---|
| **La pantalla** | se sirve desde este sitio |
| **Los datos** | siguen en la planilla, detrás del `/exec` de Apps Script |
| **La base de datos** | no se mueve |
| **Sin conexión** | la pantalla abre; los datos **no** se guardan en el teléfono |

🔴 **El service worker no guarda ni un dato clínico, y es deliberado.** Guarda
solo el armazón: la pantalla, el manifiesto y los iconos. Si guardara las
respuestas del servidor, el censo de la UCI —con nombres y diagnósticos—
quedaría escrito en el aparato de cada uno, sobreviviría al cierre de sesión y
estaría ahí si el teléfono se pierde.

---

## La dirección del servidor no se publica

El sitio **no sabe** a qué `/exec` preguntarle. La primera vez que se abre en
un aparato, la app la pide y la guarda ahí. Eso tiene dos razones:

1. El sitio publicado es público; la dirección del servidor no tiene por qué
   estarlo.
2. La planilla de pruebas y la de producción tienen direcciones distintas, y
   así el mismo sitio sirve para las dos.

Para cambiarla en un aparato: `cfgOlvidar()` desde la consola del navegador, o
borrar los datos del sitio.

---

## 🔴 Antes de publicar, el candado

Servir la app desde fuera **no cambia quién puede entrar**: eso lo decide Apps
Script. Pero sí hace que la dirección ande dando vueltas en más aparatos.

**Conviene encender el acceso del turno antes** (`accesoEncender()`, ver
`CLAUDE.md`). Con el candado puesto, tener la dirección no alcanza: hay que
entrar con la clave.

---

## Cómo se publica

1. Una sola vez, en el repositorio: **Settings → Pages → Source: «GitHub
   Actions»**.
2. Pestaña **Actions → «Publicar la app instalable» → Run workflow**.

El flujo corre primero la guardia: si `pwa/` está desactualizada respecto de
`v2/`, no publica.

⚠️ **GitHub Pages deja el sitio público** (con cuenta gratis no hay otra
opción). Lo público es la **pantalla**, no los datos. Si prefieres que ni la
pantalla lo sea, el mismo contenido de esta carpeta sirve tal cual en Firebase
Hosting o Cloudflare Pages, que era la recomendación del PRD.
