# Plan maestro de reestructuración clínica

**Proyecto:** RCE-KINE NEXT  
**Estado:** línea base de desarrollo  
**Fuente funcional:** conversación “Clasificar días de estadía”, septiembre de 2026  
**Código de referencia:** RCE-KINE 7.04, commit `21498b0f8f43a506d1072417a024373b086f1807`

## Propósito

Reestructurar RCE-KINE para que el sistema represente la historia clínica como
hechos trazables, mediciones repetibles, estados vigentes y turnos firmados. La
interfaz debe ser rápida para el equipo y la migración debe poder validarse sin
interrumpir el sistema vigente.

## Resultado esperado

El kinesiólogo abre una cama y reconoce inmediatamente al episodio correcto, su
estado vigente, los pendientes y los cambios recientes. Durante el turno registra
atenciones, sesiones, mediciones y eventos sin reconstruir todo el formulario. Al
firmar, el turno queda cerrado; una corrección posterior conserva el original y
crea una adenda auditable.

## Reglas de oro

1. Ocultar un control de la interfaz no elimina información clínica.
2. Los hechos se registran y los contadores se derivan de esos hechos.
3. Un estado persistente permanece hasta que un evento válido lo modifica.
4. Persona, episodio, cama y turno no son intercambiables.
5. Una nueva medición se agrega a una serie; no pisa la anterior.
6. La firma es el cierre clínico del turno.
7. Las acciones rápidas de una tarjeta y el formulario usan la misma operación de dominio.
8. La vista no escribe directamente en la base de datos.

## Alcance clínico aprobado

- Persona y episodio hospitalario.
- Turnos, firma, adendas y auditoría.
- Eventos de vía aérea, ventilación, posición y dispositivos.
- Estados persistentes como AET, UPOT, aislamiento, metas y programas terapéuticos.
- Series de sedación, neurología, hemodinamia, gases y evaluaciones funcionales.
- Atenciones KTR y sesiones KTM repetibles.
- Cultivos con ciclo de toma, pendiente y resultado.
- Pendientes vivos entre turnos.
- Texto clínico y entrega generados desde el modelo estructurado.
- Migración gradual con datos sintéticos, entorno TEST y validación en sombra.

## Decisiones específicas

- VM significa ventilación mecánica invasiva; VNI se cuenta por separado.
- Turnos: apertura y cierre manual por ahora, confirmado por Diego el 15/09/2026.
  No aplicar cortes automáticos día/noche ni asignar horarios inferidos desde legacy.
- Los días VM suman intervalos efectivos y no se reinician por cambios visuales.
- Una PVE superada no implica necesariamente extubación.
- GCS tiene una sola fuente bajo conciencia/neurología.
- Válvula de fonación distingue sesión terapéutica y estado respiratorio vigente.
- IMT/EMS distingue programa vigente y sesión realizada.
- Educación es una actividad del turno y no se hereda.
- AET, UPOT y aislamiento son estados persistentes gobernados por eventos.
- Un cultivo es un registro con ciclo de vida, no una casilla heredada.
- KTR representa una atención, aunque incluya varias técnicas.
- KTM permite varias sesiones en un mismo turno, cada una con su propio detalle.
- Las evaluaciones funcionales pueden registrarse en cualquier momento clínicamente pertinente.
- Los pendientes permanecen abiertos hasta resolverse o cancelarse.

## Arquitectura acordada

La Vista será una PWA responsive e instalable. Apps Script actuará como API y
servidor de aplicación. Google Sheets será el repositorio inicial. El frontend se
diseñará para poder empaquetarse posteriormente con Capacitor sin cambiar el
modelo clínico.

## Hitos

0. Shell PWA, arquitectura por capas, entorno TEST y datos sintéticos.
1. Tablero de camas con estado actual y navegación de episodio.
2. Episodio, turno, borrador, firma, adenda y auditoría.
3. Eventos y máquina de estados de vía aérea/soporte.
4. Series y evaluaciones repetibles.
5. KTR, KTM, rehabilitación y programas terapéuticos.
6. API Apps Script y Sheets exclusivamente TEST.
7. Texto, entrega, pendientes e indicadores derivados.
8. Migración en sombra, pruebas clínicas, corte y retorno controlado.

## Condiciones antes de producción

- Matriz de campos aprobada, incluido el subbloque ventilatorio pendiente de
  contrastar con la versión efectivamente usada por la unidad.
- Escenarios críticos del plan de pruebas aprobados por usuarios autorizados.
- Equivalencia documentada entre cálculos legacy y NEXT o diferencia aceptada.
- Una sola fuente de verdad para escritura durante cada fase de migración.
- Plan de retorno probado y auditado.
- Autorización institucional para datos reales, autenticación y despliegue.

## Fuera de alcance por ahora

- Conexión a producción.
- Migración de historias clínicas reales.
- Autenticación institucional definitiva.
- Diseño definitivo de parámetros ventilatorios basado en una 7.05 no disponible.
- Reemplazo inmediato de Sheets por otra base de datos.
