# Inventario de guardias — qué es cicatriz y qué es herencia

> **Para qué existe (9-oct-2026).** NEXT partió del código de RCE-KINE 7.04 con sus guardias, y muchas no
> protegen contra un error técnico sino que fijan **cómo funcionaba el sistema viejo**. Diego: «estoy
> desdiciéndome en acuerdos que ya había tomado, pero para el otro proyecto». Esta lista separa las guardias
> en tres montones para que lo heredado se pueda soltar sin ceremonia. La regla está en `CLAUDE.md`.
>
> · **T · cicatriz técnica** (64): privacidad, datos que no se mezclan ni se pierden, rendimiento,
>   entrega. Vale entera.
> · **H · heredada de RCE-KINE** (97): Diego decide «sigue» o «se va». Mientras no decida, sigue.
> · **N · decidida en NEXT** (51): acuerdo suyo en este proyecto, con la fecha. Vale hasta que la cambie.
>
> La columna **Decisión** se llena con lo que Diego marque. Una H que «se va» se borra de `build/checks/` y
> se anota en `BITACORA.md` con su frase.

Total: 212 guardias.

## H · Heredadas de RCE-KINE

### Aspecto visual

| Guardia | Qué fija | Decisión |
|---|---|---|
| `piel` | Piel institucional San Pablo única, con su logo y una sola franja de encabezado. |  |

### Ayuda

| Guardia | Qué fija | Decisión |
|---|---|---|
| `ayuda` | Centro de ayuda de la mascota: recorridos guiados, preguntas frecuentes y sugerencias. |  |
| `fiestas_patrias` | Don Mauri sale de huaso en Fiestas Patrias. |  |
| `tutorial` | Tutorial con globos anclados. |  |

### Camas y equipos

| Guardia | Qué fija | Decisión |
|---|---|---|
| `camas_prueba` | Camas de ensayo que se agregan y se retiran sin dejar rastro en la estadística. |  |
| `equipos_categoria` | Los equipos se dividen en VM, VNI, CNAF y dispositivos de apoyo. |  |
| `fallas_vm` | Historial de fallas de cada ventilador, con foto. |  |
| `stock` | Stock sin numerar (Aerogen, capnógrafos) por cantidad. |  |
| `tablero_equipos` | Tablero de ventiladores con la bodega dividida en cuatro. |  |
| `traslado_equipos` | Al trasladar un paciente, la app pregunta por sus equipos. |  |
| `vm_lote` | Mover ventiladores en lote: todo o nada. |  |

### Celular

| Guardia | Qué fija | Decisión |
|---|---|---|
| `movil` | Versión de celular: barra inferior, hoja «Más» y tarjetas plegables. |  |
| `movil_panel` | El panel de evolución en el celular, con resumen por tarjeta. |  |

### Comunicación

| Guardia | Qué fija | Decisión |
|---|---|---|
| `buzon_campana` | La campana y el buzón de notas del equipo; el buzón solo agrega, nunca pisa. |  |
| `nota_synapse_cumple` | Nota con pinchito en la línea de tiempo, Synapse y cumpleaños. |  |

### Conteos

| Guardia | Qué fija | Decisión |
|---|---|---|
| `dias_estadia` | Los días de estadía se cuentan por calendario, con el ingreso como día 0, igual que la lista BUDA. |  |
| `dias_soporte` | Los días de cada soporte se suman por tramos, sin solaparse. |  |
| `dias_vni` | Los días de VNI se cuentan por soporte y se congelan al dejarla. |  |
| `ingreso_noche` | Un ingreso de noche pasada la medianoche se fecha al día siguiente, como BUDA. |  |
| `vm_no_es_vni` | «VM» es siempre invasiva; la VNI no suma a los días de VM. |  |
| `vm_por_horas` | Los días de VM se cuentan por bloques de 24 horas. |  |

### Coordinación

| Guardia | Qué fija | Decisión |
|---|---|---|
| `coord_f5` | La sesión de coordinación sobrevive a recargar la página. |  |
| `coordinacion` | Pestaña Coordinación para corregir datos (como la fecha de ingreso) sin abrir el editor. |  |
| `sesion_cabecera` | Usuario y candado de coordinación en la esquina superior derecha. |  |

### Entrega y hojas

| Guardia | Qué fija | Decisión |
|---|---|---|
| `afinado` | Doce ajustes de agosto: la entrega sin cooperación, litros solo con naricera, flujo solo con CNAF, franja de prono solo en VM. |  |
| `entrega_ancha` | Entrega de turno: cada paciente en una ficha ancha de dos pisos. |  |
| `entrega_datos` | La entrega trae el GCS y la mecánica ventilatoria. |  |
| `entrega_impresion` | La entrega es ancha en pantalla y compacta en papel, A4 vertical. |  |
| `hoja_apk` | La hoja APK sale igual al formato oficial y prellenada. |  |
| `hoja_registro_dia` | La hoja de registro kinésico sale con el paciente ya escrito. |  |
| `hoja_uci` | La Hoja UCI del historial, fiel al papel. |  |
| `hojas_dia` | Hoja de registro y hoja PVE por paciente. |  |
| `lista_y_filtros` | La lista del día y las hojas para la ronda (pedido de Manuel). |  |

### Estadística

| Guardia | Qué fija | Decisión |
|---|---|---|
| `cierre_anio` | Cierre de año: el historial pasa a otra planilla por episodio egresado. |  |
| `indicadores` | Tablero de indicadores: fracaso de extubación, autoextubaciones, VM prolongada. |  |
| `pivot` | Tabla dinámica de estadísticas (sin nombre ni RUT). |  |
| `rem` | Generador del REM 28. |  |
| `rem_conciliacion` | De qué está hecha cada cifra del REM. |  |
| `rem_mes_transicion` | El mes de arranque del REM no cuenta dos veces a los que ya estaban. |  |

### Evaluaciones

| Guardia | Qué fija | Decisión |
|---|---|---|
| `escalas_desc` | FSS-ICU y MRC muestran la descripción de cada puntaje. |  |
| `fss_ne` | El «no evaluable» del FSS-ICU sigue el manual: no es 0 y se imputa con el promedio. |  |

### Guardado

| Guardia | Qué fija | Decisión |
|---|---|---|
| `aviso_error_al_centro` | El aviso «No se guardó» sale grande, al centro de la pantalla (pedido de Manuel). |  |
| `aviso_fin_turno` | Aviso 30 minutos antes del fin de turno de las evoluciones sin guardar. |  |
| `aviso_fin_turno_modal` | El aviso de fin de turno es una ventana con la lista de camas y un «Abrir» por fila. |  |
| `borrador_local` | «Cerrar y conservar» guarda un borrador en el aparato que se repone al reabrir en el mismo turno. |  |
| `cierre_tres_acciones` | Cerrar con cambios ofrece tres opciones: guardar y cerrar, seguir editando o conservar borrador. |  |
| `confirma_guardado` | Junto al botón de guardar queda escrito «✓ Guardado hh:mm». |  |
| `panel_ux` | Aviso de firma antes de guardar y reintento automático si falla. |  |
| `sin_guardar` | Aviso reforzado de evolución sin guardar. |  |
| `sin_minimizar` | Se quitó el botón de minimizar el panel. |  |

### Ingreso y egreso

| Guardia | Qué fija | Decisión |
|---|---|---|
| `apache` | APACHE II al ingreso, y se ofrece al egreso solo si quedó vacío. |  |

### Línea de tiempo

| Guardia | Qué fija | Decisión |
|---|---|---|
| `timeline_completa` | Todo lo que ocurrió aparece en la línea de tiempo. |  |

### Modelo de datos

| Guardia | Qué fija | Decisión |
|---|---|---|
| `episodio_turno` | Cuatro lugares para cada dato: el episodio, una serie con fecha, un evento o el turno. |  |

### Otros módulos

| Guardia | Qué fija | Decisión |
|---|---|---|
| `docs` | Módulo «Documentos de la unidad» con carpeta en Drive. |  |

### Posición

| Guardia | Qué fija | Decisión |
|---|---|---|
| `prono` | El prono distingue estado (sigue prono) de evento (se pronó). |  |
| `prono_desde_el_mas` | El prono anexado con el ➕ cuenta sus horas. |  |
| `prono_horas_a_la_vista` | Las horas de prono se leen sin pasar el mouse. |  |

### Prevención NAVM

| Guardia | Qué fija | Decisión |
|---|---|---|
| `disp_fecha` | De noche, los dispositivos se fechan con el día siguiente. |  |
| `dispositivos_reglas` | Cada dispositivo sigue a lo que le da sentido (el HEPA es fijo en PB1, PB980 y AVEA). |  |
| `hepa_fijo_y_orden_texto` | El campo del HEPA se apaga si el equipo lo lleva fijo (pedido de Manuel). |  |

### Registro diario (➕)

| Guardia | Qué fija | Decisión |
|---|---|---|
| `anexo_anular` | Un anexo del ➕ se borra entero o no se borra (pedido de Manuel). |  |
| `candado_mas` | Corregir el pasado desde el ➕ exige la clave de coordinación. |  |
| `candado_mas_front` | El botón ➕ muestra si está bloqueado, igual que el servidor. |  |
| `catalogo_procedimientos` | El ➕ ofrece el catálogo de procedimientos como lista desplegable. |  |
| `eventos` | Eventos rápidos y relojes de dispositivos (HME, HEPA, sonda). |  |
| `eventos_ui` | La columna ➕ del Registro Diario y su ventana de eventos. |  |
| `sello_al_tiro` | El anexo del ➕ se ve al tiro y avisa si está duplicado. |  |
| `tabla_soporte` | La columna Soporte dice cuál oxigenoterapia. |  |

### Respiratorio

| Guardia | Qué fija | Decisión |
|---|---|---|
| `asincronia` | Con asincronía paciente-ventilador no se mide plateau ni AutoPEEP. |  |
| `desvinculacion` | Un paciente desvinculado queda en el soporte en que lo dejó la desvinculación. |  |
| `fio2_venturi` | Con mascarilla Venturi se anota la FiO2 del conector. |  |
| `gsa_importada` | Los gases de la mañana llegan solos desde el PDF del laboratorio. |  |
| `interaccion_no_se_arrastra` | La interacción paciente-ventilador no se copia al turno siguiente. |  |

### Sedación y conciencia

| Guardia | Qué fija | Decisión |
|---|---|---|
| `neuro_dve_pic` | Neuromonitoreo: DVE y PIC mandan sobre sus campos. |  |
| `sas_real` | Se distingue el SAS que tiene el paciente del SAS objetivo. |  |

### Terapia física

| Guardia | Qué fija | Decisión |
|---|---|---|
| `ktm_otro_fundamento` | Una KTM no realizada por «Otro» no se guarda sin fundamento. |  |
| `ktm_otro_pantalla` | El catálogo de razones de KTM no realizada no tiene cajones de sastre. |  |
| `ktm_suspension_motivo` | Una KTM suspendida en sesión lleva motivo obligatorio y visible. |  |

### Texto clínico

| Guardia | Qué fija | Decisión |
|---|---|---|
| `orden_neuro_en_plantillas` | En el texto, sedoanalgesia, GCS y hemodinamia van arriba. |  |
| `plantillas_evolucion` | Plantillas de evolución como en TrakCare. |  |
| `reporte_colega` | Ajustes que pidió Álvaro: la meta de PAM va justo después de la hemodinamia, entre otros. |  |
| `resiembra_plantillas` | Re-sembrar las plantillas de la unidad con el orden nuevo. |  |
| `smartevo_rescates` | Tres cosas rescatadas del SmartEvo. |  |
| `texto_bloques` | Cada línea del texto lleva marcado de qué bloque salió. |  |
| `texto_congelado` | El texto guardado no se reescribe solo. |  |
| `texto_manual` | Lo redactado a mano no se pierde al guardar, y guardar no pregunta. |  |

### Turno

| Guardia | Qué fija | Decisión |
|---|---|---|
| `anotaciones_turno` | Anotaciones del turno con hora opcional, que salen en la evolución pero no suman a la estadística. |  |
| `cat_etiqueta` | La categorización respiratoria y motora se calcula pero no se muestra en ninguna parte. |  |
| `ficha_y_antes` | Bajo los campos de estado aparece «Antes: X → Y». |  |

### Varios

| Guardia | Qué fija | Decisión |
|---|---|---|
| `regresion_ui` | Varios arreglos de agosto: vía aérea replicada, fase clínica «sin cambios», tablero VM. |  |
| `v42` | Paquete de decisiones clínicas de julio (días de VM al egreso, válvula de fonación…). |  |

### Vía aérea

| Guardia | Qué fija | Decisión |
|---|---|---|
| `pve_horas` | La PVE informa las horas de VM pero no bloquea el «Sí». |  |
| `pve_otra_motivo` | La PVE no realizada dice por qué, y eso llega a la estadística. |  |
| `pve_otra_pantalla` | La razón de PVE no realizada es obligatoria y «Otra» pide detalle. |  |
| `pve_superada_sin_extubar` | Una PVE superada no siempre termina en extubación. |  |
| `transicion_ofrece_evento` | Si cambió la vía aérea sin evento, la app ofrece registrarlo. |  |
| `via_aerea_previo` | Un evento de vía aérea no pisa la terapia ventilatoria de arriba. |  |

## N · Decididas en NEXT

### Evaluaciones

| Guardia | Qué fija | Fecha | Decisión |
|---|---|---|---|
| `bdt_una_eleccion` | El test de azul es una sola elección (positivo precoz/tardío o negativo), sin «no realizado». | 1-oct |  |
| `chips_evaluaciones` | Una escala, un chip: se abre de a una, con lo que el episodio ya tiene medido. | 17-sep |  |
| `chips_llevan_al_campo` | Tocar un chip de evaluación abre su campo, de día y de noche. | 2-oct |  |
| `eco_pulmonar` | Ecografía pulmonar: POCUS (1, 2, PLAPS) y LUS (12 zonas) sobre la misma figura. | 1-oct |  |
| `esfuerzo_en_evaluaciones` | P0.1, ΔPocc y Pmusc van en Evaluaciones; la deglución dice primero presente o ausente. | 1-oct |  |
| `evaluaciones_celular` | Las evaluaciones son iconos cuadrados como los del celular, con su número de pendientes. | 1-oct |  |
| `evaluaciones_de_noche` | Las evaluaciones se hacen de noche igual que de día. | 2-oct |  |
| `pruebas_tqt` | Pruebas de traqueostomía como bloque propio, solo con TQT. | 1-oct |  |

### Ingreso y egreso

| Guardia | Qué fija | Fecha | Decisión |
|---|---|---|---|
| `ingreso_cuatro_bloques` | El ingreso son cuatro bloques; fecha y hora de llegada obligatorias. | 1-oct |  |
| `ingreso_paso_cero` | El ingreso es un paso 0 propio, no toda la planilla. | 20-sep |  |
| `ingreso_soporte` | Se pregunta con qué soporte llega el paciente. | 30-sep |  |

### Modelo de datos

| Guardia | Qué fija | Fecha | Decisión |
|---|---|---|---|
| `rotulos_legibles` | Los nombres de las columnas de la planilla se entienden sin saber programar. | 16-sep |  |

### Pasos del turno

| Guardia | Qué fija | Fecha | Decisión |
|---|---|---|---|
| `cuatro_pasos` | El registro del turno es un camino por pasos, no un muro (hoy son seis). | 16-sep |  |
| `identidad_una_vez` | El nombre del paciente se dice una sola vez y los pasos van debajo. | 16-sep |  |
| `paso_evaluaciones` | Evaluaciones muestra lo del episodio y se cruza rápido. | 16-sep |  |
| `paso_relato` | El relato dice que ya quedó guardado, con la fecha del turno. | 16-sep |  |
| `seis_pasos` | El turno son seis pasos: Prevención, Turno, Evaluaciones, Terapia física, Planes y Relato. | 2-oct |  |
| `sin_riel` | Salió el índice lateral de secciones. | 17-sep |  |
| `validacion_entre_pasos` | Un obligatorio de otro paso también bloquea el guardado. | 2-oct |  |

### Planes y cierre

| Guardia | Qué fija | Fecha | Decisión |
|---|---|---|---|
| `cierre_tres_bloques` | El cierre del turno son tres bloques, y el pendiente siempre se puede escribir libre. | 20-sep |  |
| `pendiente_arrastra` | Un pendiente dura lo que tenga que durar y se ve cuánto lleva. | 20-sep |  |
| `pendientes_episodio` | El pendiente ya no muere a las 12 horas. | 16-sep |  |
| `pendientes_siguen_al_paciente` | Los pendientes viajan con el paciente, no se quedan en la cama. | 20-sep |  |

### Posición

| Guardia | Qué fija | Fecha | Decisión |
|---|---|---|---|
| `prono_arriba` | La franja del prono va arriba y se ve en la tarjeta. | 19-sep |  |
| `prono_hora_se_elige` | La hora del prono se elige; no la pone el programa. | 20-sep |  |
| `prono_un_boton` | El prono es un evento que dura hasta que «Supinar» lo cierra. | 19-sep |  |

### Prevención NAVM

| Guardia | Qué fija | Fecha | Decisión |
|---|---|---|---|
| `prevencion_navm` | El paso 1 es la prevención de NAVM. | 17-sep |  |
| `ventilador_en_prevencion` | El ventilador se anota en la prevención de NAVM. | 25-sep |  |

### Respiratorio

| Guardia | Qué fija | Fecha | Decisión |
|---|---|---|---|
| `interfaz_estado_final` | Tras un evento, el dispositivo (interfaz) también viaja al estado final. | 16-sep |  |
| `interfaz_un_lector` | El dispositivo se lee de su propio campo en todas partes. | 16-sep |  |
| `modos_simv` | Los modos de VM son nueve, con SIMV VC y SIMV PC. | 16-sep |  |
| `tres_ejes_respiratorio` | Vía aérea, soporte e interfaz, cada uno en su campo. | 16-sep |  |
| `via_aerea_en_respiratorio` | El tubo y la traqueostomía viven en Respiratorio. | 17-sep |  |

### Sedación y conciencia

| Guardia | Qué fija | Fecha | Decisión |
|---|---|---|---|
| `coopera_no_se_elige` | La interpretación del S5Q (coopera o no) se lee, no se elige. | 18-sep |  |
| `sedacion_la_dice_el_sas` | La profundidad de la sedación la dice el SAS, no el fármaco. | 17-sep |  |
| `sedacion_prono_ppc` | Tres decisiones del 17-sep: el prono no va con la TQT, entre otras. | 17-sep |  |
| `vigilia_sin_sedacion` | El estado de vigilia solo aparece sin sedación. | 17-sep |  |

### Terapia física

| Guardia | Qué fija | Fecha | Decisión |
|---|---|---|---|
| `ktm_de_noche` | De noche la terapia física se muestra, se puede llenar y no hereda. | 2-oct |  |
| `ktm_sesiones` | Cada sesión de KTM lleva su nivel, asistencia, minutos y Borg. | 17-sep |  |

### Turno

| Guardia | Qué fija | Fecha | Decisión |
|---|---|---|---|
| `aet_serie` | La adecuación del esfuerzo (AET) es una serie de tramos: 1, 2, 3A, 3B, 3C. | 30-sep |  |
| `general_disuelta` | La tarjeta «General» se disolvió: cada cosa va donde se usa. | 30-sep |  |
| `general_solo_lo_suyo` | La vía aérea entera vive en Respiratorio, no en General. | 17-sep |  |
| `hdn_y_upot` | La hemodinamia se pide antes de avanzar, y el UPOT se reparte donde vive cada cosa. | 20-sep |  |
| `horario_turno` | El turno cambia a las 08:00 y a las 20:00. | 2-oct |  |
| `no_sugerir_lo_medido` | Lo que se mide no se sugiere. | 20-sep |  |

### Vía aérea

| Guardia | Qué fija | Fecha | Decisión |
|---|---|---|---|
| `evento_sin_doble_pregunta` | El evento de vía aérea se declara una sola vez, arriba. | 16-sep |  |
| `evento_vuelve_al_reabrir` | Lo registrado vuelve a la pantalla al reabrir el turno. | 21-sep |  |
| `extubacion_una_ruta` | La extubación se pregunta una sola vez. | 16-sep |  |
| `intubacion_modulo_evento` | Marcar un evento despliega su módulo con sus preguntas. | 21-sep |  |
| `intubar_desde_natural` | Intubar a quien llegó con vía natural es una sola planilla. | 20-sep |  |
| `pve_no_corresponde_razon` | «No corresponde» en la PVE también pide razón. | 1-oct |  |

## T · Cicatrices técnicas

### App instalable

| Guardia | Qué fija | Decisión |
|---|---|---|
| `puente_doble` | La misma pantalla funciona dentro de Google y como app instalada. | vale |
| `puerta_http` | La app instalada puede hablar con el servidor. | vale |
| `pwa_paquete` | La app instalable nunca guarda datos clínicos en el teléfono. | vale |

### Aspecto visual

| Guardia | Qué fija | Decisión |
|---|---|---|
| `tokens_existen` | Ningún color apunta a una variable que no existe. | vale |

### Camas y equipos

| Guardia | Qué fija | Decisión |
|---|---|---|
| `mover_camas` | Se puede mover un paciente a una cama vacía. | vale |

### Conteos

| Guardia | Qué fija | Decisión |
|---|---|---|
| `dia_cero` | El día 0 de soporte se muestra como «0», no como raya. | vale |
| `pve_no_toca_los_dias` | Una PVE no es una extubación: no reinicia los días de VM. | vale |

### Datos que nadie midió

| Guardia | Qué fija | Decisión |
|---|---|---|
| `glasgow_medido` | El Glasgow de la evolución es el que alguien midió, no un 15 de fábrica. | vale |
| `transicion_hora_retroactiva` | Un evento olvidado se anota con la hora real, nunca inventada. | vale |

### Datos que no se mezclan

| Guardia | Qué fija | Decisión |
|---|---|---|
| `alta_no_deja_rastro` | Al liberar la cama no queda nada del paciente que se fue. | vale |
| `cama_limpia` | Al liberar una cama no queda ninguna fecha ni reloj del paciente anterior. | vale |
| `dia_de_egresado` | Al mirar un día pasado se ve al paciente de ese día, no al que ocupa la cama hoy. | vale |
| `dia_de_egresado_ui` | La tabla del Registro Diario tampoco muestra al ocupante de hoy en una fecha pasada. | vale |
| `entrega_no_ajena` | La ficha de la entrega es del paciente que está en la cama, no del que estuvo. | vale |
| `episodio_no_se_mezcla` | Lo de un paciente nunca termina en la ficha de otro. | vale |
| `evento_paciente` | El ➕ le escribe al paciente que se está mirando. | vale |
| `evento_paciente_ui` | La pantalla del ➕ manda el paciente de la fila mirada, no el ocupante de hoy. | vale |
| `guardado_por_episodio` | La evolución se guarda por paciente, no solo por cama. | vale |
| `hitos_unicos` | Un hecho deja un solo hito en la línea de tiempo. | vale |
| `limpiar_archiva` | Liberar una cama archiva el episodio, igual que el alta. | vale |
| `prono_paciente` | Al dar de alta no sobrevive el conteo de horas de prono. | vale |
| `reparar_ajenas` | Rutina que archiva evoluciones que quedaron de un ocupante anterior. | vale |
| `retro_camas` | Al viajar a una fecha pasada, las camas muestran lo de ese día. | vale |
| `timeline_no_ajeno` | La tarjeta de una cama muestra los hitos de quien está en ella. | vale |

### Datos que no se pierden

| Guardia | Qué fija | Decisión |
|---|---|---|
| `integridad` | Lo que se evoluciona se guarda de verdad: prueba el servidor completo contra pérdidas. | vale |
| `ktm_no_se_pierde` | La KTM no se borra sola. | vale |
| `panel_no_pisa_datos` | Cambiar un control y devolverlo no deja rastro. | vale |
| `reset` | El reseteo inicial exige respaldo y no toca la configuración. | vale |
| `respaldo_mensual` | Respaldo diario y copia mensual permanente. | vale |

### Entrega a Apps Script

| Guardia | Qué fija | Decisión |
|---|---|---|
| `paquete` | El paquete para pegar trae todo el código, sin perder ni duplicar. | vale |
| `paridad_entrega` | Lo que se pega es idéntico al código fuente. | vale |

### Funcionamiento

| Guardia | Qué fija | Decisión |
|---|---|---|
| `arranque` | La app arranca sin errores. | vale |
| `arranque_un_viaje` | Al abrir, la app hace un solo viaje al servidor, sea la hora que sea. | vale |
| `convenciones` | Reglas técnicas del código que evitan que Google rechace el archivo. | vale |
| `coordinacion_ui` | La pestaña Coordinación abre sin errores. | vale |
| `el_arranque_dice_por_que` | Si la app no arranca, la pantalla dice por qué. | vale |
| `id_no_pisa_funcion` | Regla técnica: un botón no puede llamarse igual que una función. | vale |
| `medicion_no_queda_hueca` | Ninguna tarjeta queda con título y sin contenido. | vale |

### Guardado

| Guardia | Qué fija | Decisión |
|---|---|---|
| `aviso_fin_turno_altas_fallo` | Si el servidor no responde, el aviso de fin de turno lo dice en vez de salir vacío. | vale |
| `beforeunload_sin_stack` | Si se cierra la pestaña con cambios, el navegador avisa. | vale |
| `fallo_guardado_visible` | Un guardado que falla se queda a la vista; no se apaga solo. | vale |

### Legibilidad

| Guardia | Qué fija | Decisión |
|---|---|---|
| `coordinacion_contraste` | Ningún texto de Coordinación queda demasiado claro para leerse. | vale |
| `legibilidad` | Ningún texto de la pantalla queda cortado. | vale |
| `modal_foco` | El teclado no se escapa de una ventana abierta. | vale |

### Lo anotado llega al texto

| Guardia | Qué fija | Decisión |
|---|---|---|
| `auscultacion_ruidos` | Si se anotan varios ruidos agregados, el texto los nombra todos. | vale |
| `ktm_contra_observacion` | La observación de una KTM contraindicada llega al texto. | vale |
| `secreciones` | Las secreciones se describen igual en todas partes. | vale |
| `texto_vivo` | El texto se actualiza también con los chips. | vale |

### Pasos del turno

| Guardia | Qué fija | Decisión |
|---|---|---|
| `nada_del_guardado_despues` | Nada de lo que se guarda puede vivir en un paso posterior al guardado. | vale |

### Privacidad

| Guardia | Qué fija | Decisión |
|---|---|---|
| `aviso_fin_turno_privacidad` | El aviso de fin de turno muestra «Cama N», nunca nombre ni RUT. | vale |
| `el_equipo_no_va_en_el_codigo` | Los nombres del equipo viven en la planilla, nunca en el código. | vale |
| `rut_minimo` | El RUT solo viaja donde hace falta. | vale |

### Rendimiento

| Guardia | Qué fija | Decisión |
|---|---|---|
| `columnas` | El tablero lee de la planilla solo las columnas que usa. | vale |
| `guardado_viajes` | Guardar hace pocos viajes a la planilla y guarda exactamente lo mismo. | vale |
| `memo_config` | La configuración se lee una vez por petición. | vale |
| `memo_episodio` | El episodio de una cama se baja una vez por petición. | vale |
| `memo_tz` | La zona horaria se lee una vez por petición. | vale |
| `rendimiento` | La grilla no se repinta en bucle. | vale |
| `tablero` | Las estadísticas dan lo mismo que antes, más rápido. | vale |

### Seguridad

| Guardia | Qué fija | Decisión |
|---|---|---|
| `acceso_equipo` | Cada kinesiólogo entra con su propia clave y firma con la suya. | vale |
| `acceso_pantalla` | Con el candado puesto, la app no se abre sola y la puerta de entrada funciona. | vale |
| `dato_no_es_marcado` | Lo que escribe una persona nunca se convierte en código en la pantalla. | vale |
| `escapado_unico` | Una sola forma de escribir texto en la pantalla, segura contra código. | vale |

### Texto clínico

| Guardia | Qué fija | Decisión |
|---|---|---|
| `relato_espejo` | El texto que ve el colega y el que queda escrito son el mismo. | vale |
