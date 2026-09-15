# Plan de migración

## Estrategia

Usar una transición blue/green. RCE-KINE vigente continúa siendo la fuente de
verdad mientras NEXT se construye y valida contra datos sintéticos o copias
autorizadas. La migración no será secreta: coordinación y validadores conocerán
las etapas, aunque el equipo no deba sufrir interrupciones.

## Etapas

1. Construir NEXT sin conexiones reales.
2. Crear API y planilla TEST independientes.
3. Transformar copias autorizadas y anonimizadas de datos históricos.
4. Ejecutar NEXT en sombra y comparar episodios, eventos y cálculos.
5. Pilotear con usuarios autorizados y escenarios controlados.
6. Sincronizar diferencias y fijar una fecha de corte.
7. Cambiar el punto de entrada manteniendo una sola fuente de escritura.
8. Observar, auditar y mantener un retorno probado durante el periodo acordado.

## Historia anterior

Si una transformación íntegra no es confiable, conservar el histórico anterior
como LEGACY de solo lectura y comenzar el modelo NEXT desde una fecha de corte.
La interfaz puede presentar ambas historias sin reinterpretar datos ambiguos.

## Reglas de corte

- Nunca permitir escritura clínica concurrente independiente en ambos sistemas.
- No borrar ni reescribir historia legacy durante la migración.
- Preservar RUT como identidad de persona y PATIENT_ID como identidad de episodio.
- Registrar cada transformación, diferencia, aceptación y retorno.

