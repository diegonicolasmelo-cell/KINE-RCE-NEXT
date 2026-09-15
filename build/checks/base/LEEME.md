# Código congelado de referencia (fixtures de las guardias A/B)

Dos guardias de la batería no comparan contra una expectativa escrita a mano:
comparan el código de hoy contra el código de **antes** de una tanda, y exigen
que ningún número cambie. Se llaman guardias A/B.

| Guardia | Commit congelado | Qué fija |
|---|---|---|
| `guardado_viajes.js` | `e664f3e` (cierre de la Ola 3, ago-2026) | Que el guardado haga MENOS viajes a Sheets y devuelva EXACTAMENTE lo mismo. |
| `tablero.js` | `04808a7` (lo que corría antes de tocar Estadísticas) | Que ningún indicador del tablero cambie de valor. |

En RCE-KINE esos dos commits se sacaban del historial con `git show` y
`git worktree add`. **NEXT arranca con historial propio**, así que esos
commits no existen aquí y las dos guardias salían rojas por falta de repo,
no por código roto.

La solución es congelar el árbol de referencia **dentro del repo**, que es lo
que vive en estas carpetas: los `.gs` de `v2/` tal como estaban en cada
commit, sacados del repo de origen
(`diegonicolasmelo-cell/RCE-KINE`, commit base aprobado `21498b0`).

🔴 **Estos archivos no se editan nunca.** Son una foto del pasado: si se
tocan, la guardia deja de medir lo que dice medir y su verde no vale nada.
Se sustituyen solo si se decide mover el punto de comparación a otra tanda,
y eso se anota en la bitácora.

Solo se guardan los `.gs`: el banco de medición (`build/medir_guardado.js`)
no carga `index.html`, y guardarlo duplicaría 1,6 MB por commit sin que
ninguna guardia lo lea.
