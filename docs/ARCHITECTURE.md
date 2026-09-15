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

## Simulación local y conexión TEST

La PWA local funciona con un repositorio sintético en memoria. Su cliente de API
está bloqueado deliberadamente y no contiene URL, ID de planilla ni credenciales.
El service worker almacena solo el shell estático, nunca datos clínicos.

La interfaz Google TEST usa HtmlService y google.script.run para acceder al
adaptador y al diario Sheets. Comparte el modelo y persiste los cambios. No registra
service worker. Acceso actual: Solo yo; identidad multiusuario y PWA externa pendientes.

## Seguridad de desarrollo

- Banner TEST visible permanentemente.
- Pacientes ficticios y claramente rotulados.
- Ningún dato clínico en localStorage, IndexedDB o caché del service worker.
- Configuración de producción fuera del repositorio.
- Escrituras TEST con idempotencia, auditoría, revisión optimista y bloqueo del script.
