# Modelo clínico

## Identidades y tiempo

| Entidad | Significado | Identificador |
|---|---|---|
| Persona | Ser humano atendido | RUT, protegido y no exportable |
| Episodio | Hospitalización concreta | PATIENT_ID |
| Cama | Ubicación cambiante | ID_CAMA |
| Turno | Unidad de trabajo firmable | TURN_ID |
| Evento | Hecho puntual que puede cambiar estado | EVENT_ID |
| Serie | Colección de mediciones fechadas | SERIES_ID + medición |

La cama nunca sustituye al episodio. Un traslado cambia la ubicación del episodio,
no su identidad ni su historia.

## Tipos de información

### Episodio

Datos registrados una vez o corregidos con trazabilidad: ingreso, diagnóstico,
tipo de ingreso, talla, vía aérea inicial y evaluaciones basales.

### Turno

Lo observado o realizado durante un turno: fase clínica, auscultación, sedación,
estado hemodinámico, educación, plan y nota. Un valor previo puede mostrarse como
referencia, pero no presentarse como reevaluado.

### Evento

Un hecho con fecha, hora y autor: intubación, extubación, TQT, decanulación,
reintubación, desconexión/reconexión VM, prono/supino, cambio de dispositivo,
RCP, inicio/cambio/suspensión de aislamiento, AET o UPOT.

### Estado persistente

El estado vigente se deriva del último evento válido. Incluye vía aérea, soporte,
dispositivos, AET, UPOT, aislamiento, metas SAS/PAM, humidificación, programa
IMT/EMS y condición de válvula de fonación asociada a TQT.

### Serie

Mediciones repetibles e inmutables: SAS, GCS, CAM-ICU, gases, PIC/PPC, altura DVE,
IMS, MRC, prensión, FSS, CPAx, PIM/PEM/FEM, ecografía, deglución, BDT y presión
transtraqueal.

### Intervención

Una atención o sesión realizada: KTR, KTM, inhaloterapia, sesión con válvula de
fonación, IMT/EMS, procedimientos y educación.

## Transiciones principales

| Evento | Estado anterior esperado | Estado resultante |
|---|---|---|
| Intubación | Natural u otro no invasivo | TOT; abre tramo VM si corresponde |
| Extubación | TOT | Natural; cierra tramo TOT y VM correspondiente |
| Reintubación | Natural tras extubación | TOT; abre un nuevo tramo |
| Traqueostomía | TOT u otra situación válida | TQT; cierra TOT |
| Decanulación | TQT | Natural; cierra TQT |
| Desvinculación VM | VM activa | Sin VM; cierra intervalo VM |
| Reconexión VM | Sin VM con vía aérea compatible | VM activa; abre intervalo VM |

Las transiciones inválidas deben rechazarse en el modelo, aunque un control haya
quedado visible por error.

## Conteos derivados

- Días de estadía: desde ingreso del episodio.
- Días VM: suma de intervalos de VM invasiva efectivos.
- Días TOT/TQT/VNI/VAA: suma de sus intervalos respectivos.
- Reintubaciones: conteo de eventos válidos.
- KTR: conteo de atenciones KTR, no de técnicas internas.
- Sesiones KTM: conteo de sesiones individualizadas.

## Cierre y corrección

Firmar congela la versión del turno. Una corrección posterior crea una adenda con
autor, momento, motivo y relación con el registro original. Nunca reemplaza en
silencio el contenido firmado.

