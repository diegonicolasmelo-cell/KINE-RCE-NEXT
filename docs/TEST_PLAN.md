# Plan de pruebas

## Hito 0

- La aplicación muestra el banner TEST / NO PRODUCCIÓN.
- El manifiesto y los recursos del shell existen.
- Se muestran 18 camas sintéticas.
- No existe URL de Apps Script, ID de Sheets ni credencial.
- El cliente API rechaza cualquier llamada.
- El service worker no almacena respuestas clínicas.

## Escenarios clínicos obligatorios

1. Traslado de cama sin mezclar episodios.
2. Alta y reingreso de una misma persona como episodios distintos.
3. Intubación, extubación, reintubación y suma correcta de tramos VM/TOT.
4. PVE superada sin extubación.
5. TQT, sesión con válvula y estado persistente de válvula por separado.
6. Inicio y suspensión de AET, UPOT y aislamiento con historia completa.
7. Dos gases y dos evaluaciones funcionales sin sobreescritura.
8. Una KTR con varias técnicas cuenta como una atención.
9. Dos sesiones KTM distintas en un turno conservan sus detalles.
10. Programa IMT vigente sin sesión y sesión realizada sin duplicar programa.
11. Cultivo desde toma hasta resultado sobre el mismo registro.
12. Pendiente abierto visible en el turno siguiente y posterior resolución.
13. Firma, intento de edición directa rechazado y adenda auditable.
14. Acción rápida y formulario producen el mismo evento estructurado.
15. Cálculos NEXT comparados con la línea base y diferencias explicadas.

