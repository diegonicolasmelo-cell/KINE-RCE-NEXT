# Arquitectura técnica

```text
PWA / Vista
    -> Controladores
        -> Servicios de aplicación
            -> Modelo clínico
                -> Cliente API
                    -> Apps Script
                        -> Repositorio Sheets TEST
```

## Responsabilidades

- **Vista:** presenta tarjetas, formularios y estados; no decide reglas clínicas.
- **Controlador:** transforma una acción de usuario en una operación de aplicación.
- **Servicio:** coordina casos de uso y límites transaccionales.
- **Modelo:** valida entidades, transiciones, conteos y invariantes clínicas.
- **Cliente API:** transporta solicitudes; no contiene reglas clínicas.
- **Apps Script:** autentica, autoriza, valida nuevamente y persiste.
- **Repositorio:** traduce entidades a almacenamiento sin definir su significado.

## Hito 0

La PWA funciona solo con un repositorio sintético en memoria. El cliente de API
está bloqueado deliberadamente y no contiene URL, ID de planilla ni credenciales.
El service worker almacena solo el shell estático, nunca datos clínicos.

## Seguridad de desarrollo

- Banner TEST visible permanentemente.
- Pacientes ficticios y claramente rotulados.
- Ningún dato clínico en localStorage, IndexedDB o caché del service worker.
- Configuración de producción fuera del repositorio.
- Escrituras futuras con idempotencia, auditoría y control de concurrencia.

