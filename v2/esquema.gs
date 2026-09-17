/**
 * ============================================================
 *  esquema.gs — FUENTE ÚNICA DE VERDAD del modelo de datos
 *  RCE-KINE v2 · Google Apps Script + Google Sheets
 * ------------------------------------------------------------
 *  Traducción de ESQUEMA.md. Aquí se define CADA hoja y CADA
 *  columna UNA sola vez. De aquí se derivan:
 *    · COL.<HOJA>.<CAMPO>  → índice 1-based
 *    · TOTAL_COLS.<HOJA>   → nº de columnas
 *    · SH.<HOJA>           → nombre de la hoja
 *    · FILA_DATOS.<HOJA>   → primera fila de datos
 *  REGLA DE ORO: prohibido hardcodear índices/totales en otro
 *  archivo. Si cambia una columna, se cambia SOLO acá.
 * ============================================================
 */

// Tipos válidos: 'texto','entero','decimal','bool','fecha','ts','uuid','email','json'
// Los siguientes se fuerzan a formato de celda texto '@' (evita que Sheets
// reinterprete fechas ISO, RUT/códigos, IDs o JSON como número/fecha).
const _TIPOS_TEXTO = ['texto', 'fecha', 'ts', 'uuid', 'email', 'json'];

// ── Columnas de EVOLUCIONES (397). Se reutilizan en EVOLUCIONES_ARCHIVO. ──
const _COLS_EVOLUCIONES = [
  // A. Metadatos e identidad
  ['ID_EVOLUCION','texto','Id. de la evolución'],['ID_CAMA','texto','Cama'],['PATIENT_ID','uuid','Id. del episodio'],['COD_PACIENTE','texto','Código del paciente'],
  ['TURNO_KEY','texto','Llave del turno'],['FECHA','fecha','Fecha'],['TURNO','texto','Turno (día o noche)'],['ES_INGRESO','bool','Es el turno de ingreso'],
  ['ES_REINGRESO','bool','Es un reingreso'],['TIMESTAMP','ts','Momento del registro'],['AUTOR_EMAIL','email','Correo de quien lo registró'],['DIA_ESTADIA','entero','Día de estadía'],
  ['DIAS_VM','entero','Días en VM'],['DIAS_VA','entero','Días con vía aérea artificial'],
  // B. Identificación del paciente (snapshot del turno)
  ['PAC_NOMBRE','texto','Nombre'],['PAC_COD','texto','Código del paciente (copia)'],['PAC_EDAD','entero','Edad'],['PAC_SEXO','texto','Sexo'],
  ['PAC_TALLA','decimal','Talla (cm)'],['PAC_PESO_IDEAL','decimal','Peso ideal (kg)'],['PAC_BARTHEL','entero','Barthel previo a la UCI'],['PAC_ECF','texto','Estado funcional previo'],
  ['PAC_DIAGNOSTICO','texto','Diagnóstico'],['PAC_DIAG_REM','texto','Diagnóstico para el REM'],['PAC_AISLAMIENTO','bool','En aislamiento'],
  ['PAC_AISL_MICRO','texto','Microorganismo del aislamiento'],['PAC_AISL_LISTA','json','Microorganismos aislados'],
  // C. Fase clínica
  ['FASE_JSON','json','Fases clínicas'],
  // D. Sedación y conciencia
  ['SED_TIPO','texto','Tipo de sedación'],['SED_SAS','texto','SAS actual (sedación y agitación)'],['SED_S5Q','texto','S5Q (órdenes simples)'],['SED_COOPERACION','texto','Coopera'],
  ['SED_CAM_ICU','texto','CAM-ICU (delirium)'],['SED_GCS_O','entero','Glasgow: apertura ocular'],['SED_GCS_V','entero','Glasgow: respuesta verbal'],['SED_GCS_M','entero','Glasgow: respuesta motora'],
  ['SED_GCS_TOT','entero','Glasgow total'],['SED_BNM','bool','Con bloqueo neuromuscular'],
  // E. Hemodinamia
  ['HEMO_ESTADO','texto','Hemodinamia (estable o inestable)'],['HEMO_DVA','texto','Drogas vasoactivas'],['HEMO_MULTI_DVA','bool','Más de una droga vasoactiva'],['HEMO_NUM_DVA','entero','Cuántas drogas vasoactivas'],
  ['HEMO_TENDENCIA','bool','Tendencia de las vasoactivas'],['HEMO_TEND_TIPO','texto','Subiendo o bajando vasoactivas'],
  // F. Examen físico
  ['EX_MP','texto','Murmullo pulmonar'],['EX_RUIDOS','texto','Ruidos agregados'],['EX_RUIDOS_LOC','texto','Dónde se auscultan'],
  // G. Vía aérea — configuración
  ['VENT_VIA_AEREA','texto','Vía aérea (natural, TOT o TQT)'],['VA_EXTERNO','bool','Llegó con vía aérea de otra unidad'],['VA_EXTERNO_DIAS','entero','Días con vía aérea antes de llegar'],['VENT_TOT_NUM','texto','Número del TOT'],
  ['VENT_TOT_CM','texto','TOT: cm a la arcada'],['TOT_FIJACION','texto','Fijación del TOT'],['VENT_TQT_TIPO','texto','Tipo de cánula de TQT'],['VENT_TQT_CALIBRE','texto','Calibre de la cánula'],
  ['FECHA_INICIO_TQT','fecha','Fecha de la traqueostomía'],['VENT_SOPORTE','texto','Soporte ventilatorio'],['VENT_MODO','texto','Modo ventilatorio'],['VENT_ADAPTADO','texto','Adaptación al ventilador'],
  ['VENT_H_ACTIVA','bool','Con humidificación activa'],
  // H. Contadores por episodio
  ['DIAS_VM_PREVIOS','entero','Días de VM antes de este turno'],['FECHA_INICIO_VM','fecha','Fecha de inicio de la VM'],['DIAS_VNI_PREVIOS','entero','Días de VNI antes de este turno'],
  ['FECHA_INICIO_VNI','fecha','Fecha de inicio de la VNI'],['N_REINTUB','entero','Reintubaciones del episodio'],
  // I. Ventilatorio — parámetros
  ['VENT_VT','decimal','Volumen corriente (ml)'],['VENT_FR','decimal','Frecuencia respiratoria'],['VENT_PEEP','decimal','PEEP'],['VENT_PMAX','decimal','Presión máxima'],
  ['VENT_PMEDIA','decimal','Presión media'],['VENT_PPL','decimal','Presión plateau'],['VENT_AUTOPEEP','decimal','AutoPEEP'],['VENT_PINSP','decimal','Presión inspiratoria'],
  ['VENT_PS','decimal','Presión de soporte'],['VENT_IPAP','decimal','IPAP'],['VENT_EPAP','decimal','EPAP'],['VENT_IPAP_MIN','decimal','IPAP mínima'],
  ['VENT_IPAP_MAX','decimal','IPAP máxima'],['VENT_VT_ASEG','decimal','Volumen asegurado (AVAPS)'],['VENT_FLUJO','decimal','Flujo'],['VENT_TI','decimal','Tiempo inspiratorio'],
  ['VENT_FIO2','decimal','FiO₂'],['VENT_SPO2','decimal','SpO₂'],['VENT_TEMP','decimal','Temperatura del gas'],['VENT_LITROS','decimal','Litros por minuto'],
  ['VENT_PMUSC','decimal','Presión muscular estimada'],['VENT_P01','decimal','P0.1 (drive respiratorio)'],['VENT_DPOCC','decimal','ΔPocc'],['VENT_RISETIME','decimal','Rise time'],
  ['VENT_CAB_RSS','texto','Cabecera elevada'],['VENT_CAB_RSS_DESC','texto','Por qué no se elevó'],
  // J. Valores calculados (derivados)
  ['CALC_ML_KG','texto','Volumen por kilo de peso ideal'],['CALC_VOL_MIN','texto','Volumen minuto'],['CALC_IE','texto','Relación inspiración/espiración'],['CALC_DP','texto','Driving pressure (presión de distensión)'],
  ['CALC_CESR','texto','Compliance estática'],['CALC_TOBIN','texto','Índice de Tobin'],['CALC_IROX','texto','Índice ROX'],
  // K. KTM / rehabilitación
  ['KTM_REALIZADA','bool','KTM realizada'],['KTM_SUSPENDIDA','bool','KTM suspendida'],['KTM_NO_REALIZADA','bool','KTM no realizada'],['KTM_NO_RAZON','texto','Por qué no se hizo KTM'],
  ['KTM_NO_COMENTARIO','texto','Detalle de por qué no se hizo'],['KTM_CONTRA_TIPO','texto','Tipo de contraindicación'],['KTM_CONTRA_CAT','texto','Categoría de la contraindicación'],
  ['KTM_CONTRA_RAZON','texto','Razón de la contraindicación'],['KTM_CONTRA_MANUAL','texto','Contraindicación escrita a mano'],['KTM_NIVEL_KTR','texto','Nivel de movilización'],
  ['KTM_ASISTENCIA','texto','Asistencia que necesitó'],['KTM_TIEMPO_MIN','entero','Minutos de KTM'],['KTM_ALERTA','bool','Hubo alerta durante la KTM'],['KTM_ALERTA_CAT','texto','Tipo de alerta'],
  ['KTM_ALERTA_RAZ','texto','Detalle de la alerta'],['KTM_UMA','texto','Unidades de movilización activa (UMA)'],['KTM_IMT','bool','Entrenamiento muscular inspiratorio'],['KTM_IMT_FREQ','texto','IMT: frecuencia'],
  ['KTM_IMT_INT','texto','IMT: intensidad'],['KTM_IMT_T','texto','IMT: tiempo'],['KTM_IMT_DES','texto','IMT: descanso'],
  // L. Terapia respiratoria
  ['RESP_KTR_CANT','entero','Sesiones de KTR del turno'],['RESP_SIN_KTR','bool','Sin requerimientos de KTR'],['RESP_SOF','bool','Succión orofaríngea'],['RESP_SNF','bool','Succión nasofaríngea'],
  ['RESP_SET','bool','Succión endotraqueal'],['RESP_ATOS','bool','Asistencia de la tos'],['RESP_INHALO','bool','Inhaloterapia'],['RESP_SECR_QTY','texto','Cantidad de secreciones'],
  ['RESP_SECR_CAR','texto','Aspecto de las secreciones'],['RESP_SECR_REOL','texto','Consistencia de las secreciones'],['RESP_CULT_FECHAS','texto','Fechas de los cultivos'],['RESP_CULT_OBJ','texto','Para qué se tomó el cultivo'],
  // M. Posicionamiento
  ['RESP_POS_SED','bool','Sedente'],['RESP_POS_DCLD','bool','Decúbito lateral derecho'],['RESP_POS_DCLI','bool','Decúbito lateral izquierdo'],['RESP_POS_PRONO','bool','En prono'],
  ['RESP_POS_SUPINO','bool','En supino'],['RESP_POS_LIBRE','texto','Otra posición'],['RESP_PRONO_TS','texto','Momento de la pronación'],['RESP_SUPINO_TS','texto','Momento de la supinación'],
  ['RESP_PRONO_HORA','texto','Hora de la pronación'],['RESP_SUPINO_HORA','texto','Hora de la supinación'],
  // N. PVE
  ['PVE_RESULTADO','texto','Resultado de la PVE'],['PVE_FR_MOTIVOS','json','Por qué fracasó la PVE'],['PVE_SC_RAZON','texto','Por qué no se hizo la PVE'],['PVE_VAL','texto','¿Se hizo PVE?'],
  // O. Extubación (EXT_*)
  ['EXT_OCURRIO','bool','Hubo extubación'],['EXT_HORA','texto','Hora de la extubación'],['EXT_TS','json','Momento de la extubación'],['EXT_TIPO','texto','Tipo de extubación'],['EXT_MOTIVO','texto','Motivo de la extubación'],
  ['EXT_POST_DET','texto','Evaluación post-extubación'],['EXT_REINTUB','bool','Hubo reintubación'],['EXT_REINTUB_RAZ','texto','Razón de la reintubación'],['EXT_PE_VA','texto','Tras la extubación: vía aérea'],
  ['EXT_PE_SOP','texto','Tras la extubación: soporte'],['EXT_PE_MODO','texto','Tras la extubación: queda con'],
  // P. Decanulación
  ['DECAN_OCURRIO','bool','Hubo decanulación'],['DECAN_HORA','texto','Hora de la decanulación'],['DECAN_TIPO','texto','Tipo de decanulación'],['DECAN_QUEDA_DISP','texto','Tras decanular: queda con'],['DECAN_QUEDA_FLUJO','texto','Tras decanular: flujo'],
  ['DECAN_QUEDA_SPO2','texto','Tras decanular: SpO₂'],['DECAN_DET','texto','Detalle de la decanulación'],['DECAN_RECANUL','bool','Hubo recanulación'],
  // Q. Estado final de vía aérea
  ['VENT_VIA_AEREA_FINAL','texto','Al cierre del turno: vía aérea'],['VENT_SOPORTE_FINAL','texto','Al cierre del turno: soporte'],['VENT_MODO_FINAL','texto','Al cierre del turno: modo'],
  // R. AET
  ['AET_ACTIVA','bool','Adecuación del esfuerzo terapéutico'],['AET_NIVEL','texto','Nivel de adecuación'],
  // S. Muestras microbiológicas
  ['MUE_REALIZADAS','bool','Se tomaron muestras'],['MUE_TIPOS_JSON','json','Qué muestras se tomaron'],['MUE_RESULTADOS_JSON','json','Resultados de las muestras'],['EX_CULT_RESULTADO','texto','Resultado del cultivo'],
  // T. Evaluación funcional por turno (reemplaza EGR_*)
  ['EVAL_FECHA','fecha','Fecha de la evaluación'],['EVAL_T_REALIZAR','bool','Se evaluó este turno'],['EVAL_NIVEL_MOTOR','texto','Nivel motor (en desuso)'],['EVAL_T_MRC','entero','MRC suma'],
  ['EVAL_T_DINAMO','decimal','Dinamometría (kg)'],['EVAL_T_FSS','entero','FSS-ICU'],['EVAL_T_PIM','decimal','Pimáx'],['EVAL_T_PEM','decimal','PEmáx'],
  ['EVAL_T_FEM','decimal','Flujo espiratorio máximo'],['EVAL_T_GROSOR','decimal','Grosor diafragmático (mm)'],['EVAL_T_HALLAZGOS','texto','Hallazgos de la evaluación'],['EVAL_T_PMANT_VA','texto','Presión cuff (medida)'],
  // U. Test de apnea y test de azul (BDT) — repetibles
  ['APNEA_JSON','json','Test de apnea'],['APNEA_ULTIMO','texto','Último test de apnea'],['BDT_JSON','json','Test de azul (BDT)'],['BDT_ULTIMO','texto','Último test de azul'],
  // V. Procedimientos
  ['PROC_JSON','json','Procedimientos del turno'],['PROC_RESUMEN','texto','Resumen de procedimientos'],['PROC_CANTIDAD','entero','Cuántos procedimientos'],
  // W. Planes, firma y generado
  ['PLAN_PLANES','texto','Plan para el turno siguiente'],['PLAN_NOTA_TURNO','texto','Nota del turno'],['PLAN_FIRMA_KINE','texto','Firma del kinesiólogo'],['TEXTO_GENERADO','texto','Evolución (texto final)'],
  // Editor de texto (opción A): TEXTO_GENERADO guarda lo que quedó en pantalla
  // (oficial, editable); TEXTO_AUTO conserva la salida del motor para
  // trazabilidad y refinamiento; TEXTO_MANUAL marca si hubo edición a mano.
  ['TEXTO_AUTO','texto','Evolución que escribió el sistema'],['TEXTO_MANUAL','bool','Se editó a mano'],
  // X. Extensiones post-congelamiento (SIEMPRE al final — nunca insertar al medio,
  // para no desplazar los índices de datos ya escritos).
  ['REINTUB_HORA','texto','Hora de la reintubación'],   // hora de la reintubación (independiente de EXT_HORA, que es la de extubación)
  ['INTUB_OCURRIO','bool','Hubo intubación'],   // intubación NUEVA este turno (paciente sin historial de VM)
  ['INTUB_HORA','texto','Hora de la intubación'],     // hora de la intubación
  ['INTUB_DET','texto','Detalle de la intubación'],      // contexto / motivo de la intubación
  // — Contraste documentos unidad (S1–S13, jul-2026) —
  ['REINTUB_SOP_PREV','texto','Soporte antes de reintubar'],   // S3: soporte previo a la reintubación (informe: dispositivos previos)
  ['EVAL_T_CUAD_D','decimal','Grosor cuádriceps derecho (mm)'],['EVAL_T_CUAD_I','decimal','Grosor cuádriceps izquierdo (mm)'],   // S4: grosor cuádriceps mm der/izq (ecografía)
  ['EVAL_T_HECKMATT','texto','Heckmatt (ecografía muscular)'],                                // S4: índice de Heckmatt I-IV
  ['EVAL_T_FED_D','decimal','Engrosamiento diafragma derecho (%)'],['EVAL_T_FED_I','decimal','Engrosamiento diafragma izquierdo (%)'],      // S4: fracción de engrosamiento diafragmático % (>30% predice éxito weaning)
  ['EVAL_T_EXC_D','decimal','Excursión diafragma derecho (cm)'],['EVAL_T_EXC_I','decimal','Excursión diafragma izquierdo (cm)'],      // S4: excursión diafragmática cm (>1.1 predice éxito)
  ['PAC_CHARLSON','entero','Charlson (comorbilidad)'],['PAC_INGRESO_TIPO','texto','Ingreso electivo o de urgencia'],     // S5: índice de Charlson; Electivo/Urgencia (hoja RHB)
  ['EXT_VISAGE','entero','VISAGE'],['EXT_SCORE_VA','entero','Score de cuidados de vía aérea'],          // S7: VISAGE (≥3 éxito) y Score cuidados de VA (<6 adecuado) — neuro
  ['LAB_PH','decimal','pH (laboratorio)'],['LAB_PACO2','decimal','PaCO₂ (laboratorio)'],['LAB_PAO2','decimal','PaO₂ (laboratorio)'],['LAB_HCO3','decimal','Bicarbonato (laboratorio)'],['LAB_LACTATO','decimal','Lactato (laboratorio)'],['LAB_PAFI','decimal','PaFiO₂ (laboratorio)'], // S8: GSA
  // HEMO_FC: categórico (Eucárdico/Taquicárdico/Bradicárdico), ya no numérico.
  // HEMO_PA: LEGACY — se dejó de capturar (columna sin uso, se conserva la
  // posición). HEMO_PAM solo se pide si HEMO_META_PAM está marcado (S9).
  ['HEMO_FC','texto','Frecuencia cardíaca (eu, taqui o bradi)'],['HEMO_PA','texto','Presión arterial (ya no se usa)'],['HEMO_PAM','entero','Presión arterial media'],['HEMO_PIC','entero','Presión intracraneana'],['HEMO_PPC','entero','Presión de perfusión cerebral'],
  ['KTM_BORG','texto','Borg (esfuerzo percibido)'],                                       // S12: percepción de esfuerzo (Borg 0-10)
  ['MUE_HORA_TOMA','texto','Hora de la toma'],['MUE_CON_ATB','bool','Con antibiótico puesto'],           // S13: orden CCAET (hora de toma, con antibiótico)
  ['VENT_FECHA_FILTRO','texto','Filtro puesto el'],['VENT_FECHA_SONDA','texto','Sonda de aspiración puesta el'], // S11: mantención circuito cerrado (persisten turno a turno)
  // — FSS-ICU por ítem, MRC por movimiento y CPAx (opcionales, jul-2026) —
  ['EVAL_FSS_IT1','entero','FSS: girar en cama'],['EVAL_FSS_IT2','entero','FSS: de supino a sedente'],['EVAL_FSS_IT3','entero','FSS: sedente al borde'],['EVAL_FSS_IT4','entero','FSS: de sedente a bípedo'],['EVAL_FSS_IT5','entero','FSS: marcha'],
  //   FSS ítems 0-7: girar en cama / supino→sedente / sedente borde / sedente→bípedo / marcha
  ['EVAL_MRC_D1','entero','MRC derecho: abducción de hombro'],['EVAL_MRC_D2','entero','MRC derecho: flexión de codo'],['EVAL_MRC_D3','entero','MRC derecho: extensión de muñeca'],['EVAL_MRC_D4','entero','MRC derecho: flexión de cadera'],['EVAL_MRC_D5','entero','MRC derecho: extensión de rodilla'],['EVAL_MRC_D6','entero','MRC derecho: dorsiflexión de tobillo'],
  ['EVAL_MRC_I1','entero','MRC izquierdo: abducción de hombro'],['EVAL_MRC_I2','entero','MRC izquierdo: flexión de codo'],['EVAL_MRC_I3','entero','MRC izquierdo: extensión de muñeca'],['EVAL_MRC_I4','entero','MRC izquierdo: flexión de cadera'],['EVAL_MRC_I5','entero','MRC izquierdo: extensión de rodilla'],['EVAL_MRC_I6','entero','MRC izquierdo: dorsiflexión de tobillo'],
  //   MRC 0-5 por movimiento (D=derecho, I=izquierdo): 1 abducción hombro, 2 flexión codo,
  //   3 extensión muñeca, 4 flexión cadera, 5 extensión rodilla, 6 dorsiflexión tobillo
  ['CPAX_IT1','entero','CPAx: función respiratoria'],['CPAX_IT2','entero','CPAx: tos'],['CPAX_IT3','entero','CPAx: movilidad en cama'],['CPAX_IT4','entero','CPAx: de supino a sedente'],['CPAX_IT5','entero','CPAx: equilibrio sedente'],
  ['CPAX_IT6','entero','CPAx: equilibrio bípedo'],['CPAX_IT7','entero','CPAx: de sedente a bípedo'],['CPAX_IT8','entero','CPAx: traslado cama a sillón'],['CPAX_IT9','entero','CPAx: marcha en el lugar'],['CPAX_IT10','entero','CPAx: prensión'],
  //   CPAx 0-5: 1 respiratorio, 2 tos, 3 movilidad en cama, 4 supino→sedente, 5 equilibrio sedente,
  //   6 equilibrio bípedo, 7 sedente→bípedo, 8 transferencia cama→sillón, 9 marcha en el lugar, 10 prensión
  ['CPAX_TOTAL','entero','CPAx total'],    // 0-50; solo se guarda con los 10 ítems completos
  // — Refactor por módulos (jul-2026): auscultación múltiple, insumos, reintubación
  //   con parámetros, deglución, UPOT/test de apnea —
  ['EX_RUIDOS_JSON','json','Otros ruidos agregados'],      // ruidos agregados adicionales [{tipo,loc},...]
  ['FILTRO_TIPO','texto','Tipo de filtro (HME o HEPA)'],        // HME / HEPA
  ['REINTUB_TOT_N','texto','Tras reintubar: número del TOT'],['REINTUB_TOT_CM','texto','Tras reintubar: cm a la arcada'],['REINTUB_MODO','texto','Tras reintubar: modo'],['REINTUB_PARAMS','texto','Tras reintubar: parámetros'],
  ['EVAL_DEGLUCION','texto','Deglución'],     // valoración cualitativa de la deglución
  ['APNEA_TEST','texto','Test de apnea del turno'],         // test de apnea del turno (Positivo/Negativo) → histórico APNEA_JSON
  ['UPOT_ACTIVO','bool','Paciente en UPOT'],['UPOT_MEDIDAS','bool','Con medidas de protección de órganos'],  // seguimiento UPOT + medidas de protección de órganos
  // — Ingreso/cooperación, intubación secuencial y cambio de tubo reversible (jul-2026) —
  ['INTUB_SOP_PREVIO','texto','Soporte antes de intubar'],  // soporte respiratorio previo a la intubación (Ambiente/Naricera-NRC/CNAF/VNI)
  ['TOT_CAMBIO','bool','Se cambió el tubo'],         // cambio de tubo este turno (checkbox reversible; cuenta como procedimiento)
  ['DISP_HME_FECHA','texto','HME puesto el'],    // dispositivos circuito VM: HME instalado (se cambia en su día 2, por fecha)
  ['DISP_HEPA_FECHA','texto','Filtro HEPA puesto el'],   // HEPA instalado (se cambia en su día 3)
  ['DISP_HUMID_FECHA','texto','Humidificación activa desde el'],  // humidificación activa: fecha de inicio (no vence)
  // DUPLICADO HISTÓRICO: VENT_IPAP_MAX ya existe en la posición 78; esta columna
  // quedó duplicada al agregarse de nuevo en la cola. NO se puede eliminar (las
  // posiciones son fijas: borrarla desalinearía todas las columnas siguientes),
  // así que se renombra a legacy y deja de usarse. El dato vive en la pos. 78.
  ['LEGACY_IPAP_MAX_DUP','decimal','Columna en desuso (IPAP máx. duplicada)'],
  ['TOT_CAMBIO_MOTIVO','texto','Por qué se cambió el tubo'], // motivo del cambio de tubo (cuff disfuncional / roto / resistencia / otro)
  ['TQT_CAMBIO','bool','Se cambió la cánula'],         // cambio de cánula de TQT este turno (checkbox reversible)
  ['TQT_CAMBIO_MOTIVO','texto','Por qué se cambió la cánula'], // motivo del cambio de cánula
  ['TQT_OCURRIO','bool','Hubo traqueostomía'],        // traqueostomía INSTALADA este turno (evento 🔪)
  ['TQT_HORA','texto','Hora de la traqueostomía'],          // hora del procedimiento
  ['TQT_TECNICA','texto','Técnica de la traqueostomía'],       // Percutánea | Quirúrgica
  ['TQT_DET','texto','Detalle de la traqueostomía'],           // detalle: operador, complicaciones…
  ['BARTHEL_JSON','json','Ítems del Barthel'],       // ítems de la calculadora de Barthel (10 valores)
  ['CHARLSON_JSON','json','Ítems del Charlson'],      // ítems de la calculadora de Charlson {it:[índices], edad:bool}
  ['CAT_KINE','entero','Categoría kinésica (ya no se usa)'],         // LEGACY: categorización K1–K4 (reemplazada por CAT_RESP/MOTOR; ya no se escribe)
  ['CAT_RESP_PJE','entero','Puntaje respiratorio SOCHIMI'],     // categorización respiratoria SOCHIMI (n variables × 1-3 pts según CAT_MATRICES)
  ['CAT_MOTOR_PJE','entero','Puntaje motor SOCHIMI'],    // categorización motora SOCHIMI (n variables × 1-3 pts según CAT_MATRICES)
  ['CAT_RESP_NIVEL','texto','Nivel respiratorio SOCHIMI'],    // Baja/Media/Alta calculado con la configuración vigente al guardar
  ['CAT_MOTOR_NIVEL','texto','Nivel motor SOCHIMI'],   // Baja/Media/Alta calculado con la configuración vigente al guardar
  ['KTM_EMS','bool','Electroestimulación'],            // electroestimulación neuromuscular (terapia física, junto a IMT)
  ['PLAN_PENDIENTES','json','Pendientes del turno'],    // pendientes del turno (chips-recordatorio; NO se replican; van a la entrega)
  ['HEMO_ARRITMIA','bool','Con arritmia'],['HEMO_ARRITMIA_TIPO','texto','Qué arritmia'],  // arritmia (junto a FC) — tipo libre (FA, extrasístoles...)
  ['HEMO_META_PAM','bool','Tiene meta de PAM'],      // condiciona la captura de HEMO_PAM (sin meta, no se pide)
  // Parámetros de la EMS (terapia física)
  ['KTM_EMS_FREQ','texto','EMS: frecuencia'],['KTM_EMS_INT','texto','EMS: intensidad'],['KTM_EMS_PULSO','texto','EMS: ancho de pulso'],
  ['KTM_EMS_T','texto','EMS: tiempo'],['KTM_EMS_GRUPO','texto','EMS: grupo muscular'],
  // IMS — ICU Mobility Scale 0-10 (reemplaza al hito motor 1-6; EVAL_NIVEL_MOTOR queda legacy)
  ['EVAL_IMS','texto','IMS (escala de movilidad en UCI)'],
  ['VENT_PAFI','decimal','PaFiO₂'],  // PaFiO2 (PaO2/FiO2) del turno
  // REM 28 (jul-2026): sesiones individuales y educación
  ['KTM_CANT','entero','Sesiones de KTM del turno'],    // N° de sesiones KTM del turno (REM B.4; por defecto 1 si KTM realizada)
  ['EDU_REALIZADA','bool','Educación al paciente o familia'], // educación a usuario/cuidador/familia (REM B.6; cuenta 1 por turno)
  // Presión de cuff — verificación 1 vez por turno (protocolo de la unidad).
  // Medida del paquete de prevención de NAVM: bajo el mínimo hay microaspiración
  // de secreciones subglóticas; sobre el máximo, isquemia de la mucosa traqueal
  // (IDSA: 20-30 cmH2O). Estado en un toque; el valor solo se pide si hubo ajuste.
  ['VENT_CUFF_EST','texto','Presión cuff: cómo estaba'],     // '' | 'rango' | 'ajuste' | 'desinflado'
  ['VENT_CUFF_CMH2O','decimal','Presión cuff (cmH₂O)'], // valor encontrado (solo cuando EST='ajuste'),
  // ── v4.2 (jul-2026) — SIEMPRE AL FINAL ──
  // Razón por la que NO se realizó PVE (detalle libre; la categoría va en PVE_SC_RAZON)
  ['PVE_SC_DET','texto','Detalle de por qué no se hizo la PVE'],
  // Gases arteriales del turno (bloque opcional, se despliega con GSA_TOMADA)
  ['GSA_TOMADA','bool','Se tomaron gases'],['GSA_HORA','texto','Hora de los gases'],['GSA_PH','decimal','pH'],['GSA_PAO2','decimal','PaO₂'],
  ['GSA_PACO2','decimal','PaCO₂'],['GSA_HCO3','decimal','Bicarbonato'],['GSA_EB','decimal','Exceso de base'],['GSA_LACTATO','decimal','Lactato'],
  ['GSA_SAO2','decimal','Saturación arterial'],['GSA_FIO2','decimal','FiO₂ de los gases'],['GSA_INTERP','texto','Lectura de los gases'],
  // Desvinculación de VM del paciente traqueostomizado (ventana del turno)
  ['DESVINC_OCURRIO','bool','Se desvinculó de la VM'],['DESVINC_HORA','texto','Hora de la desvinculación'],['DESVINC_A','texto','Desvinculado a'],
  ['DESVINC_RECONEXION','bool','Se reconectó'],['DESVINC_HORA_RECON','texto','Hora de la reconexión'],['DESVINC_HORAS','decimal','Horas desvinculado'],
  ['DESVINC_MOTIVO','texto','Motivo de la desvinculación'],['DESVINC_DET','texto','Detalle de la desvinculación'],
  // Uso de válvula de fonación como intervención de rehabilitación (VA = TQT)
  ['VFON_USADA','bool','Usó válvula de fonación'],['VFON_MIN','entero','Minutos con válvula'],['VFON_TOL','texto','Cómo la toleró'],['VFON_DET','texto','Detalle de la válvula'],
  // ── v4.3 · Estado PREVIO → evento → estado POSTERIOR (cambios de vía aérea) ──
  // El estado previo vive en las columnas VENT_* del turno (no se pisa); aquí
  // queda cómo terminó el paciente tras la intubación / traqueostomía.
  ['INTUB_VA_PREVIA','texto','Antes de intubar: vía aérea'],['INTUB_MODO_PREVIO','texto','Antes de intubar: con qué estaba'],
  ['INTUB_VA_POST','texto','Tras intubar: vía aérea'],['INTUB_SOP_POST','texto','Tras intubar: soporte'],['INTUB_MODO_POST','texto','Tras intubar: modo'],
  ['INTUB_TOT_N','texto','Tras intubar: número del TOT'],['INTUB_TOT_CM','texto','Tras intubar: cm a la arcada'],['INTUB_VT','decimal','Tras intubar: volumen corriente'],['INTUB_FR','decimal','Tras intubar: frecuencia'],
  ['INTUB_PEEP','decimal','Tras intubar: PEEP'],['INTUB_FIO2','decimal','Tras intubar: FiO₂'],['INTUB_SPO2','decimal','Tras intubar: SpO₂'],
  ['TQT_SOP_POST','texto','Tras la TQT: soporte'],['TQT_MODO_POST','texto','Tras la TQT: modo'],['TQT_PARAMS','texto','Tras la TQT: parámetros'],
  // Parámetros ventilatorios COMPLETOS del estado posterior a la intubación
  // (el panel «Queda con» genera el mismo módulo que el bloque del turno)
  ['INTUB_PMAX','decimal','Tras intubar: presión máxima'],['INTUB_PPL','decimal','Tras intubar: plateau'],['INTUB_PMEDIA','decimal','Tras intubar: presión media'],
  ['INTUB_AUTOPEEP','decimal','Tras intubar: autoPEEP'],['INTUB_PS','decimal','Tras intubar: presión de soporte'],['INTUB_PINSP','decimal','Tras intubar: presión inspiratoria'],
  ['INTUB_FLUJO','decimal','Tras intubar: flujo'],['INTUB_TI','decimal','Tras intubar: tiempo inspiratorio'],['INTUB_PAFI','decimal','Tras intubar: PaFiO₂'],
  // Eventos del turno NO derivables (no se arrastran; van a la entrega)
  ['PROC_IMAGEN','bool','Fue a imagenología'],['PROC_PABELLON','bool','Fue a pabellón'],['PROC_ASIST_MED','bool','Asistió a procedimiento médico'],
  ['PROC_RCP','bool','Hubo reanimación'],['PROC_RCP_CICLOS','entero','Ciclos de reanimación'],['PROC_RCP_HORA','texto','Hora de la reanimación'],['PROC_RCP_DET','texto','Detalle de la reanimación'],
  // v4.5 — el módulo ventilatorio completo también en reintubación y TQT
  // (misma regla: el estado previo vive en VENT_*, el posterior aquí)
  ['REINTUB_SOP_POST','texto','Tras reintubar: soporte'],
  ['REINTUB_VT','decimal','Tras reintubar: volumen corriente'],['REINTUB_FR','decimal','Tras reintubar: frecuencia'],['REINTUB_PEEP','decimal','Tras reintubar: PEEP'],['REINTUB_FIO2','decimal','Tras reintubar: FiO₂'],
  ['REINTUB_SPO2','decimal','Tras reintubar: SpO₂'],['REINTUB_PMAX','decimal','Tras reintubar: presión máxima'],['REINTUB_PPL','decimal','Tras reintubar: plateau'],['REINTUB_AUTOPEEP','decimal','Tras reintubar: autoPEEP'],
  ['REINTUB_PS','decimal','Tras reintubar: presión de soporte'],['REINTUB_PAFI','decimal','Tras reintubar: PaFiO₂'],
  ['TQT_VT','decimal','Tras la TQT: volumen corriente'],['TQT_FR','decimal','Tras la TQT: frecuencia'],['TQT_PEEP','decimal','Tras la TQT: PEEP'],['TQT_FIO2','decimal','Tras la TQT: FiO₂'],
  ['TQT_SPO2','decimal','Tras la TQT: SpO₂'],['TQT_PMAX','decimal','Tras la TQT: presión máxima'],['TQT_PPL','decimal','Tras la TQT: plateau'],['TQT_PS','decimal','Tras la TQT: presión de soporte'],['TQT_PAFI','decimal','Tras la TQT: PaFiO₂'],
  // v5.23 (ago-2026) — trazabilidad del motor de texto. De qué BLOQUE salió cada
  // línea de TEXTO_AUTO (JSON: ["enc","fase","ppres",…], alineado 1:1 con las
  // líneas). Es INVISIBLE para el equipo: no cambia el texto ni la pantalla.
  // Insumo para medir qué bloques conserva cada colega al editar a mano y, más
  // adelante, ofrecerle una evolución a su medida («Mi estilo»).
  // SIEMPRE AL FINAL.
  ['TEXTO_BLOQUES','texto','De qué bloque salió cada línea'],
  // La POSICIÓN (RESP_POS_PRONO/SUPINO) dice cómo está el paciente; estas dos
  // dicen que el cambio se hizo ESTE turno y son las únicas que registran el
  // procedimiento. Antes bastaba con marcar la posición y cada turno sumaba una
  // pronación nueva (reporte de Diego, ago-2026). SIEMPRE AL FINAL.
  ['RESP_PRONO_EVENTO','bool','Se pronó este turno'],['RESP_SUPINO_EVENTO','bool','Se supinó este turno'],
  // Ciclo de prono con FECHA REAL: puede durar varios días, así que la hora
  // sola no basta. Se sellan al guardar (fecha efectiva del turno + la hora
  // escrita) y PRONO_HORAS cierra el ciclo en la evolución que supina.
  // SIEMPRE AL FINAL.
  ['PRONO_INICIO_TS','texto','Inicio del ciclo de prono'],['SUPINO_TS','texto','Fin del ciclo de prono'],['PRONO_HORAS','decimal','Horas en prono'],
  // DÍAS DE VNI del turno (ago-2026). Faltaba: la VM tenía su contador
  // calculado y CONGELADO por el servidor, pero la VNI se recalculaba en el
  // cliente exigiendo que la cama estuviera en VNI en ESE momento — así que
  // al cambiar de soporte el número se caía, y se contaban «días de VNI» a
  // pacientes que solo tenían mascarilla (la detección miraba la interfaz de
  // vía aérea, no el soporte). Ahora es simétrico con DIAS_VM.
  // SIEMPRE AL FINAL.
  ['DIAS_VNI','entero','Días en VNI'],
  // SUCCIÓN NASOTRAQUEAL (ago-2026, pedido de Manuel). Cuarta técnica de
  // permeabilización junto a SOF, SNF y SET. Es la del paciente SIN vía aérea
  // artificial — la sonda entra por la nariz y pasa la glotis; con TOT o TQT
  // no existe, ahí la succión es endotraqueal. El formulario la esconde
  // cuando la vía aérea es invasiva, espejo de lo que ya hace SET al revés.
  // SIEMPRE AL FINAL.
  ['RESP_SNT','bool','Succión nasotraqueal'],
  // SEDACIÓN: el SAS que TIENE el paciente y el que se PERSIGUE (ago-2026).
  // `SED_SAS` pasa a ser oficialmente el ACTUAL —es como ya lo leían las
  // cuatro decisiones automáticas del formulario, así que ningún registro
  // viejo cambia de comportamiento— y la meta viaja aparte. ⚠️ Los registros
  // anteriores a esta versión traen UN número que el equipo llenó de forma
  // dispar (a veces la meta, a veces el actual): son ambiguos por origen y NO
  // se recalculan. Ver PRD_SAS_REAL.md.
  ['SED_SAS_META','texto','SAS que se persigue'],
  // Sedación que NO es profunda (vigil / control de agitación). Existe para
  // que anotarla no cuente como volver a sedación profunda y borre la fecha
  // de suspensión, que es el antes y el después para evaluar la respuesta a
  // la suspensión de hipnóticos y para interpretar el GCS.
  ['SED_VIGIL','bool','Sedación vigil (no profunda)'],
  // Qué sedantes están puestos (JSON). Cuáles, no cuánto: las dosis viven en
  // la ficha médica.
  ['SED_FARMACOS','texto','Sedantes puestos'],
  // — Neuromonitoreo invasivo (ago-2026, pedido de Manuel desde el turno) —
  // Los dispositivos son ESTADO del paciente, no un evento del turno: se
  // replican del turno anterior como la vía aérea. PIC y PPC (que ya existían
  // en la familia HEMO_) solo se piden cuando hay captor instalado.
  ['NEURO_DVE','bool','Derivación ventricular externa'],           // derivación ventricular externa instalada
  ['NEURO_DVE_ALTURA','decimal','Altura de la DVE (cmH₂O)'], // altura de la DVE en cmH2O (solo con DVE)
  ['NEURO_PIC_CAPTOR','bool','Captor de PIC instalado'],    // captor de PIC: habilita PIC y PPC
  // 📌 Anotaciones del turno (v5.97, Diego 5-sep-2026): hechos SIN estadística
  // que sí se narran en la evolución — JSON [{t:texto, h:hora opcional}].
  // Complementa al «Otro» del ➕ (que solo deja hito) desde el formulario.
  // — SIEMPRE AL FINAL
  ['ANOTACIONES_JSON','json','Anotaciones del turno'],
  // PVE superada SIN extubación (tanda 2a, sep-2026, PRD_PVE_SUPERADA_SIN_EXTUBAR):
  // la prueba se superó y el paciente igual quedó en VM, con su razón. — AL FINAL
  ['PVE_SUP_SIN_EXT','bool','PVE superada sin extubar'],['PVE_SUP_SIN_EXT_RAZ','texto','Por qué no se extubó igual'],
  // 🫁 LA INTERFAZ, en su propio campo (16-sep-2026, decisión de Diego). — AL FINAL
  // Hasta aquí el dispositivo vivía en DOS campos según el caso: en la vía
  // aérea si era invasiva o VNI (TOT, TQT, Full Face, Oronasal), y en el MODO
  // si era oxigenoterapia (NRC, MR, CNAF, tubo T, HME, CTAF…). Ninguno de esos
  // «modos» es un modo ventilatorio: son dispositivos.
  // Con este campo, la vía aérea queda en Natural/TOT/TQT, el modo queda solo
  // con modos de verdad, y el paciente con tubo en T se registra sin campo
  // extra: vía aérea TOT + soporte oxigenoterapia + interfaz tubo T.
  // 🪤 Va aquí y no junto a los otros VENT_: se agregó DESPUÉS del congelamiento,
  // y meterla al medio desplaza los índices de todo lo ya escrito en la planilla.
  // Lo cazó guardado_viajes.js, que compara fila a fila contra el árbol congelado.
  ['VENT_INTERFAZ','texto','Interfaz (mascarilla, naricera…)'],
  /* 🫁 EL TERCER EJE TAMBIÉN DESPUÉS DEL EVENTO (17-sep-2026, aprobado por
     Diego). Los paneles «queda con» preguntaban soporte y modo, nada más: un
     paciente que se traqueostomiza y queda en oxigenoterapia no tenía dónde
     anotar si quedó con HME, tubo en T, CTAF, CNAF o válvula de fonación, y el
     dato se perdía. Ahora cada evento guarda su dispositivo, y
     VENT_INTERFAZ_FINAL cierra el turno igual que VENT_MODO_FINAL cierra el
     modo — antes el dispositivo terminaba escrito EN el modo final, que es
     justo la forma vieja que los tres ejes vinieron a corregir. — AL FINAL */
  ['INTUB_INTERFAZ_POST','texto','Tras intubar: interfaz'],
  ['REINTUB_INTERFAZ_POST','texto','Tras reintubar: interfaz'],
  ['TQT_INTERFAZ_POST','texto','Tras la TQT: interfaz'],
  ['VENT_INTERFAZ_FINAL','texto','Al cierre del turno: interfaz']
];

// ── Definición de todas las hojas ──────────────────────────
const ESQUEMA = {
  CONFIG: { headerRows: 1, cols: [
    ['CLAVE','texto','Ajuste'],['VALOR','texto','Valor del ajuste'],
  ]},
  CATALOGOS: { headerRows: 1, cols: [
    ['TIPO','texto','Tipo de lista'],['VALOR','texto','Opción'],['ORDEN','entero','Orden en la lista'],['ACTIVO','bool','Activo'],
  ]},
  // Matrices de categorización SOCHIMI, editables por la coordinación sin tocar
  // código (como las fases): qué variables componen cada matriz y sus cortes.
  // VARIABLE debe ser un id de la librería del cliente (_CAT_VARS). UMBRAL_2/3 =
  // cortes de 2 y 3 pts en variables numéricas (vacío = default; DINAMO usa 'H/M').
  CAT_MATRICES: { headerRows: 1, cols: [
    ['MATRIZ','texto','Matriz de categorización'],['VARIABLE','texto','Variable que la compone'],['ACTIVA','bool','Activa'],
    ['UMBRAL_2','texto','Corte para 2 puntos'],['UMBRAL_3','texto','Corte para 3 puntos'],['ORDEN','entero','Orden en la lista'],
  ]},
  CAMAS_ESTADO: { headerRows: 2, cols: [
    ['ID_CAMA','texto','Cama'],['OCUPADA','bool','Cama ocupada'],['STATUS_CAMA','texto','Estado de la cama'],['PATIENT_ID','uuid','Id. del episodio'],['COD_PACIENTE','texto','Código del paciente'],
    ['NOMBRE','texto','Nombre'],['EDAD','entero','Edad'],['SEXO','texto','Sexo'],['TALLA_CM','decimal','Talla (cm)'],['PESO_IDEAL_KG','decimal','Peso ideal (kg)'],
    ['BARTHEL','entero','Barthel previo a la UCI'],['ECF','texto','Estado funcional previo'],['DIAGNOSTICO','texto','Diagnóstico'],['DIAG_REM','texto','Diagnóstico para el REM'],['AISLAMIENTO','bool','En aislamiento'],
    ['AISL_MICRO','texto','Microorganismo del aislamiento'],['VIA_AEREA','texto','Vía aérea (natural, TOT o TQT)'],['TOT_NUMERO','texto','Número del TOT'],['TOT_CM_LABIO','texto','TOT: cm a la arcada'],['TQT_TIPO','texto','Tipo de cánula de TQT'],
    ['SOPORTE','texto','Soporte ventilatorio'],['MODO','texto','Modo ventilatorio'],['FECHA_INGRESO','fecha','Fecha de ingreso'],['FECHA_INICIO_VA','fecha','Desde cuándo con vía aérea artificial'],
    ['FECHA_INICIO_SOPORTE','fecha','Desde cuándo con este soporte'],['FASE_JSON','json','Fases clínicas'],['KTM_NIVEL','texto','Nivel de KTM'],['KTM_SUSP','bool','KTM suspendida'],
    ['FIRMA_KINE','texto','Firma del kinesiólogo'],['AUTOR_EMAIL','email','Correo de quien lo registró'],['TEXTO_EVO_DIA','texto','Evolución del turno día'],['TEXTO_EVO_NOCHE','texto','Evolución del turno noche'],
    ['ULTIMO_TURNO_KEY','texto','Último turno guardado'],['TIMELINE_JSON','json','Línea de tiempo del episodio'],['KTR_DIA','entero','Sesiones de KTR del día'],['KTM_DIA','texto','KTM del día'],
    ['PROC_DIA','texto','Procedimientos del día'],['FIRMA_DIA','texto','Firma del turno día'],['KEY_DIA','texto','Llave del turno día'],['KTR_NOCHE','entero','Sesiones de KTR de la noche'],['PROC_NOCHE','texto','Procedimientos de la noche'],
    ['FIRMA_NOCHE','texto','Firma del turno noche'],['KEY_NOCHE','texto','Llave del turno noche'],
    ['CHARLSON','entero','Charlson (comorbilidad)'],['INGRESO_TIPO','texto','Tipo de ingreso'],  // S5 (persisten con el episodio, se cargan al abrir)
    ['CAT_KINE','entero','Categoría kinésica (ya no se usa)'],  // LEGACY: categorización K1–K4 (ya no se escribe)
    ['CAT_RESP_PJE','entero','Puntaje respiratorio SOCHIMI'],['CAT_MOTOR_PJE','entero','Puntaje motor SOCHIMI'],  // categorización SOCHIMI del último turno (badges R/M en la grilla)
    ['CAT_RESP_NIVEL','texto','Nivel respiratorio SOCHIMI'],['CAT_MOTOR_NIVEL','texto','Nivel motor SOCHIMI'],  // nivel Baja/Media/Alta según la config vigente al guardar
    // Últimas evaluaciones del episodio (arrastre para la matriz motora + badges de la grilla)
    ['ULT_COOP','texto','Última cooperación'],['ULT_MRC','entero','Último MRC suma'],['ULT_MRC_FECHA','texto','Fecha del último MRC'],
    ['ULT_FSS','entero','Último FSS-ICU'],['ULT_FSS_FECHA','texto','Fecha del último FSS'],['ULT_DINAMO','decimal','Última dinamometría (kg)'],
    // Dispositivos de circuito VM: fecha de instalación (estado del EPISODIO, no del
    // turno — el panel arrastra desde aquí para que la fecha visualizada no las pise)
    ['DISP_HME_FECHA','texto','HME puesto el'],['DISP_HEPA_FECHA','texto','Filtro HEPA puesto el'],
    ['DISP_TC_FECHA','texto','Trach Care puesto el'],['DISP_HUMID_FECHA','texto','Humidificador puesto el'],
    // PVE acumulados del episodio {turnoKey: 'superada'|'frustra'} — la clase de
    // weaning (Boles 2007: difícil/prolongado) se deriva al mostrar, nunca se guarda
    ['WEAN_PVE_JSON','json','PVE del episodio'],
    // Tamizaje de candidato a PVE con los parámetros del último turno guardado
    // (FiO2≤50, PEEP≤8, SpO2≥90, hemodinamia estable sin DVA altas, sin BNM)
    ['WEAN_CAND_PVE','bool','Candidato a PVE'],
    // Identidad de PERSONA (jul-2026, autorizado uso interno): habilita
    // detección de reingresos y el cruce con la estadística médica. NUNCA
    // sale en REM, tablero ni exportaciones anonimizadas.
    ['RUT','texto','RUT'],
    // Reloj de dispositivos (jul-2026): las fechas ya existen arriba
    // (DISP_HME/HEPA/TC/HUMID_FECHA); aquí solo la confirmación de la
    // instalación asumida al conectar a VM (chip «Aceptar» del panel).
    ['DISP_CONFIRMADO','bool','Dispositivos confirmados'],
    // APACHE II al ingreso (jul-2026, decisión de Diego): lo calcula el médico
    // y el kine lo COPIA de la evolución médica. Opcional (0-71); si no se pudo
    // anotar antes, el egreso lo vuelve a ofrecer. Ajuste por gravedad: hallazgo
    // de M. Fuentes (OR 1,94 por cada 5 puntos). SIEMPRE AL FINAL de la lista.
    ['APACHE2','entero','APACHE II al ingreso'],
    ['TQT_CALIBRE','texto','Calibre de la cánula'],  // calibre de la cánula vigente (v4.6)
    // MOMENTO real del episodio (ago-2026) como 'yyyy-MM-dd HH:mm': el número
    // visible («Día X», días de VM) cuenta BLOQUES DE 24 h desde aquí — un
    // paciente que llegó hace dos horas debe decir Día 0, no Día 1. Va aparte
    // de FECHA_INGRESO porque esa es la fecha del TURNO (la noche del 31
    // pertenece al turno del 31 aunque el reloj marque el 1). Vacío = conteo
    // por días calendario, como antes.  — SIEMPRE AL FINAL
    ['TS_INGRESO','texto','Momento real del ingreso'],['TS_INICIO_VA','texto','Momento en que se puso la vía aérea'],['TS_INICIO_SOPORTE','texto','Momento en que empezó el soporte'],
    // Correcciones hechas desde el modo Coordinación (ago-2026): JSON con una
    // entrada por corrección {c:campo, a:antes, n:nuevo, f:firma, ts:momento}.
    // Sirve para DOS cosas a la vez: el sello visible en la ficha, y la MARCA
    // DE ARRASTRE — un campo que figura aquí ya no lo pisa el guardado del
    // turno (decisión de Manuel, 18-ago: «normalmente no se modifica, así que
    // no debería poder modificarla»).  — SIEMPRE AL FINAL
    ['CORRECCIONES_JSON','json','Correcciones de coordinación'],
    // 🫁 Pimometría pendiente (v5.93, Diego 5-sep-2026): la campana necesita
    // saber, MIRANDO SOLO LA CAMA, la última presión de soporte guardada y si
    // la Pimáx ya se midió en el episodio. Arrastre desde el guardado, como
    // los ULT_* de arriba.  — SIEMPRE AL FINAL
    ['ULT_PS','decimal','Última presión de soporte'],['ULT_PIM','decimal','Última Pimáx'],['ULT_PIM_FECHA','texto','Fecha de la última Pimáx'],
    // 🗂️ Rama episodio/turno (11-sep-2026, Diego): «ocupamos el valor del
    // colega pero debemos saber quién firmó». La firma es PROCEDENCIA, no
    // propiedad: dice de dónde salió el dato, no quién puede usarlo. — AL FINAL
    ['ULT_MRC_FIRMA','texto','Quién midió el MRC'],['ULT_FSS_FIRMA','texto','Quién midió el FSS'],['ULT_PIM_FIRMA','texto','Quién midió la Pimáx'],
    // Estado del EPISODIO que hasta aquí solo vivía en la fila del turno y se
    // heredaba en ámbar cada 12 h (Diego: «durante esa hospitalización se
    // adecuó», no es del turno). Se leen de aquí; no se heredan. — AL FINAL
    ['AET_ACTIVA','bool','Adecuación del esfuerzo terapéutico'],['AET_NIVEL','texto','Nivel de adecuación'],['AET_FECHA','texto','Fecha de la adecuación'],
    ['UPOT_ACTIVO','bool','Paciente en UPOT'],['UPOT_MEDIDAS','texto','Medidas de la UPOT'],['UPOT_FECHA','texto','Fecha de ingreso a UPOT'],
    // 📌 Pendientes del EPISODIO (rediseño de los tres pasos, 16-sep-2026).
    // Los chips de PLAN_PENDIENTES viven en la fila del turno y no se
    // replican: lo que la noche deja encargado no existe para el día
    // siguiente, así que nadie puede cerrarlo. Estos cruzan el turno y mueren
    // con el alta, como AET y UPOT. Lista de
    // {id, tx, ab, abTs, ci, ciTs} — `ci` vacío = sigue abierto.
    // 🔑 Cualquiera cierra (decisión de Diego): `ci` guarda quién lo hizo,
    // no se exige que sea quien lo abrió.  — SIEMPRE AL FINAL
    ['PENDIENTES_JSON','json','Pendientes del episodio'],
    // 🫁 La interfaz vigente (16-sep-2026), hermana de VIA_AEREA y SOPORTE:
    // la cama dice con qué dispositivo está el paciente ahora.  — AL FINAL
    ['INTERFAZ','texto','Interfaz (mascarilla, naricera…)'],
  ]},
  EVOLUCIONES:         { headerRows: 3, cols: _COLS_EVOLUCIONES },
  EVOLUCIONES_ARCHIVO: { headerRows: 3, cols: _COLS_EVOLUCIONES },
  PROCEDIMIENTOS: { headerRows: 1, cols: [
    ['ID_PROC','texto','Id. del procedimiento'],['ID_EVOLUCION','texto','Id. de la evolución'],['ID_CAMA','texto','Cama'],['PATIENT_ID','uuid','Id. del episodio'],['FECHA','fecha','Fecha'],
    ['TURNO','texto','Turno (día o noche)'],['TIPO_PROC','texto','Tipo de procedimiento'],['NOMBRE_PROC','texto','Procedimiento'],['DESCRIPCION','texto','Descripción'],
    ['AUTOR_EMAIL','email','Correo de quien lo registró'],['TIMESTAMP','ts','Momento del registro'],
  ]},
  TIMELINE: { headerRows: 1, cols: [
    ['ID_HITO','texto','Id. del hito'],['ID_CAMA','texto','Cama'],['PATIENT_ID','uuid','Id. del episodio'],['FECHA','fecha','Fecha'],['TURNO','texto','Turno (día o noche)'],
    ['TIPO','texto','Tipo de hito'],['TEXTO','texto','Qué pasó'],['AUTOR','texto','Quién lo registró'],['AUTOR_EMAIL','email','Correo de quien lo registró'],['TIMESTAMP','ts','Momento del registro'],
    // 🗂️ Rama episodio/turno (sep-2026): el DETALLE estructurado del evento
    // (hora, tipo, con qué queda, motivo). Hasta aquí el hito era solo TEXTO
    // libre; para que el evento sea fuente de verdad —y no una casilla de la
    // fila del turno que se olvida— necesita sus datos al lado.  — AL FINAL
    ['DATOS_JSON','json','Datos del evento'],
  ]},
  // (ENTREGAS_TURNO se define más abajo, junto a AUDIT_LOG. Aquí hubo una
  // segunda copia que la de abajo pisaba en silencio — eliminada ago-2026.)
  ARCHIVO_PACIENTES: { headerRows: 1, cols: [
    ['ID_ARCHIVO','texto','Id. del archivo'],['PATIENT_ID','uuid','Id. del episodio'],['CAMA_ORIGEN','texto','Cama en que estuvo'],['COD_PACIENTE','texto','Código del paciente'],
    ['FECHA_INGRESO','fecha','Fecha de ingreso'],['FECHA_EGRESO','fecha','Fecha de egreso'],['DIAS_TOTAL','entero','Días en la unidad'],['DIAS_VM_TOTAL','entero','Días en VM'],
    ['DIAS_VA_TOTAL','entero','Días con vía aérea artificial'],['NOMBRE','texto','Nombre'],['EDAD','entero','Edad'],['SEXO','texto','Sexo'],['DIAGNOSTICO','texto','Diagnóstico'],
    ['DIAG_REM','texto','Diagnóstico para el REM'],['MOTIVO_EGRESO','texto','Motivo del egreso'],['DESTINO_EGRESO','texto','Destino al egreso'],['KTR_TOTAL','entero','Sesiones de KTR en total'],
    ['TURNOS_VM','entero','Turnos en VM'],['TURNOS_KTM','entero','Turnos con KTM'],['TURNOS_KTMC','entero','Turnos con KTM contraindicada'],['EXTUBACION_OK','bool','Extubación exitosa'],
    ['REINTUBACION','bool','Hubo reintubación'],['BARTHEL_INGRESO','entero','Barthel al ingreso'],['BARTHEL_EGRESO','entero','Barthel al egreso'],['FSS_EGRESO','entero','FSS-ICU al egreso'],
    ['MRC_SS_EGRESO','entero','MRC suma al egreso'],['FIRMA_RESPONSABLE','texto','Firma del responsable del alta'],['AUTOR_EMAIL','email','Correo de quien lo registró'],['OBSERVACIONES','texto','Observaciones'],
    ['TIMELINE_JSON','json','Línea de tiempo del episodio'],['APNEA_JSON','json','Test de apnea'],['BDT_JSON','json','Test de azul (BDT)'],['FASE_FINAL','texto','Fase clínica al egreso'],
    // Interpretación de egreso (cortes configurables en CONFIG)
    ['DAUCI','bool','Debilidad adquirida en UCI'],['MRC_INTERP','texto','Lectura del MRC al egreso'],['FSS_INTERP','texto','Lectura del FSS al egreso'],['DINAMO_INTERP','texto','Lectura de la dinamometría'],
    ['DINAMO_EGRESO','decimal','Dinamometría al egreso (kg)'],['CPAX_EGRESO','entero','CPAx al egreso'],
    ['RUT','texto','RUT'],   // identidad de persona (jul-2026) — reingresos y cruce interno
    ['APACHE2','entero','APACHE II al ingreso'],  // gravedad al ingreso (0-71) — habilita el ajuste por gravedad del análisis externo
    ['TS_INGRESO','texto','Momento real del ingreso'],  // momento real del ingreso (ago-2026) — SIEMPRE AL FINAL
    // Correcciones desde el modo Coordinación — mismo formato que en
    // CAMAS_ESTADO. Aquí importa aún más: los días del archivo están
    // CONGELADOS, así que una corrección de fecha los recalcula.  — AL FINAL
    ['CORRECCIONES_JSON','json','Correcciones de coordinación'],
  ]},
  // ── Ventiladores de la unidad: inventario vivo + trazabilidad de movimientos ──
  VENTILADORES: { headerRows: 1, cols: [
    ['ID_VM','texto','Id. del equipo'],['NOMBRE','texto','Nombre'],['MARCA','texto','Marca'],['MODELO','texto','Modelo'],
    ['NUM_SERIE','texto','Número de serie'],['NUM_INVENTARIO','texto','Número de inventario'],['ANIO_ADQ','entero','Año de adquisición'],
    ['UBIC_TIPO','texto','Dónde está (cama, bodega o préstamo)'],       // CAMA | BODEGA | PRESTAMO
    ['UBIC_DETALLE','texto','Cama o unidad donde está'],    // n° de cama, o unidad externa del préstamo
    ['FECHA_UBICACION','texto','Desde cuándo está ahí'], // desde cuándo está en esa ubicación (ISO)
    ['ESTADO','texto','Estado'],          // Operativo | En mantención | Con falla | De baja
    ['ACTIVO','bool','Activo'],['OBS','texto','Observaciones'],['TIMESTAMP','ts','Momento del registro'],
    ['FECHA_MANT','texto','Última mantención'],      // última mantención (ISO)
    ['FECHA_MANT_PROX','texto','Próxima mantención'], // próxima mantención programada (ISO)
    // CATEGORÍA (ago-2026, corrección de Diego a un supuesto mío): los 33
    // equipos NO son todos «ventiladores». Tres clases distintas:
    //   VM    · soporte invasivo. Es parte de la sala y OCUPA la cama.
    //   VNI   · V60, Carina. Soporte, pero va al PACIENTE — «queda en una
    //           cama pero no vive ahí».
    //   CNAF  · Airvo 2. Igual que VNI: del paciente, no de la cama.
    //   APOYO · «dispositivos de apoyo» (nombre elegido por Diego): MR850,
    //           capnógrafos, Aerogen. NO son soporte, acompañan.
    // Va al final: la reparación reescribe encabezados y meterla al medio
    // desalinearía los datos. Vacía en los equipos ya cargados ⇒ se deriva
    // del modelo con _vmCategoria().
    ['CATEGORIA','texto','Clase de equipo (VM, VNI, CNAF o apoyo)'],
  ]},
  MOVIMIENTOS_VM: { headerRows: 1, cols: [
    ['ID_MOV','texto','Id. del movimiento'],['ID_VM','texto','Equipo'],['TIMESTAMP','ts','Momento del registro'],['FECHA','texto','Fecha'],
    ['DESDE','texto','Desde'],['HACIA','texto','Hacia'],['MOTIVO','texto','Motivo'],['FIRMA','texto','Firma del kinesiólogo'],['AUTOR_EMAIL','email','Correo de quien lo registró'],
  ]},
  // Historial de FALLAS por equipo (v4): descripción obligatoria + foto opcional
  // en Drive (URL). Sirve a equipos médicos: saber por qué falla y cada cuánto.
  FALLAS_VM: { headerRows: 1, cols: [
    ['ID_FALLA','texto','Id. de la falla'],['ID_VM','texto','Equipo'],['NOMBRE_VM','texto','Nombre del equipo'],['TIMESTAMP','ts','Momento del registro'],['FECHA','fecha','Fecha'],
    ['DESCRIPCION','texto','Qué falló'],['FOTO_URL','texto','Foto de la falla'],['FIRMA','texto','Firma del kinesiólogo'],['AUTOR_EMAIL','email','Correo de quien lo registró'],
  ]},
  // ── Equipos SIN número (ago-2026): Aerogen, capnógrafos. No se pueden
  // seguir uno por uno (nadie distingue un Aerogen de otro), así que se
  // llevan por CANTIDAD y cada ajuste queda trazado en MOVIMIENTOS_STOCK.
  STOCK_EQUIPOS: { headerRows: 1, cols: [
    ['ID_STOCK','texto','Id. del artículo'],['NOMBRE','texto','Nombre'],['MARCA','texto','Marca'],['MODELO','texto','Modelo'],
    ['CATEGORIA','texto','Categoría (nebulización, capnografía…)'],   // Nebulización | Capnografía | Otro
    ['CANTIDAD','entero','Cantidad'],
    ['ESTADO','texto','Estado'],      // Operativo | De baja | En mantención
    ['ACTIVO','bool','Activo'],['OBS','texto','Observaciones'],['TIMESTAMP','ts','Momento del registro'],
    // Reparto por cama: {"4":1,"7":2} — sin número no importa CUÁL, sino
    // cuántos hay en cada cama. El resto del total queda disponible.
    ['ASIGNACION_JSON','json','Cuántos hay en cada cama'],
  ]},
  MOVIMIENTOS_STOCK: { headerRows: 1, cols: [
    ['ID_MOV','texto','Id. del movimiento'],['ID_STOCK','texto','Artículo'],['NOMBRE','texto','Nombre'],['TIMESTAMP','ts','Momento del registro'],['FECHA','texto','Fecha'],
    ['DELTA','entero','Cuántos entran o salen'],['CANTIDAD_FINAL','entero','Cantidad que queda'],
    ['MOTIVO','texto','Motivo'],['DETALLE','texto','Detalle'],['FIRMA','texto','Firma del kinesiólogo'],['AUTOR_EMAIL','email','Correo de quien lo registró'],
    ['DESDE','texto','Desde'],['HACIA','texto','Hacia'],   // reparto por cama (asignar/devolver)
  ]},
  KINESIOLOGOS: { headerRows: 1, cols: [
    ['FIRMA','texto','Iniciales (firma)'],['NOMBRE','texto','Nombre'],['EMAIL','email','Correo'],['APOYO','bool','Es kinesiólogo de apoyo'],['ACTIVO','bool','Activo'],
    ['TRATAMIENTO','texto','Trato (Klgo. o Klga.)'],   // Klgo. | Klga. — para la firma del texto clínico (vacío = Klgo.)
    // Cumpleaños (2-sep-2026, pedido de Diego): 'dd-mm' o 'dd/mm'. El AÑO NO
    // se guarda a propósito — para saludar no hace falta la edad de nadie.
    // Va AL FINAL de la lista: la reparación reescribe encabezados y meterla
    // al medio desalinearía las filas que ya están cargadas.
    ['CUMPLE','texto','Cumpleaños (día y mes)'],
  ]},
  ESTADISTICAS_REM: { headerRows: 1, cols: [
    ['MES','texto','Mes'],['INGRESOS','entero','Ingresos del mes'],['DIAS_CAMA','entero','Días cama'],['TURNOS_VM','entero','Turnos en VM'],['TURNOS_KTM','entero','Turnos con KTM'],
    ['TURNOS_KTMC','entero','Turnos con KTM contraindicada'],['SUM_KTR','entero','Suma de sesiones de KTR'],['KTR_PROM','decimal','Promedio de KTR por turno'],['DIAG_JSON','json','Diagnósticos del mes'],['TEXTO_REM','texto','Texto del REM'],
    ['GENERADO_TS','ts','Cuándo se generó'],['GENERADO_POR','email','Quién lo generó'],
  ]},
  TURNOS: { headerRows: 1, cols: [
    ['KEY','texto','Llave del turno'],['DATA','json','Datos del turno'],['TIMESTAMP','ts','Momento del registro'],
  ]},
  // Serie mensual para la tendencia del tablero de indicadores. Los meses
  // previos a la marcha blanca se siembran a mano con los agregados validados
  // del análisis de M. Fuentes (FUENTE='planilla'); los meses de la plataforma
  // se calculan solos (no se escriben aquí). Solo cifras agregadas, sin pacientes.
  INDICADORES_HISTORICO: { headerRows: 1, cols: [
    ['MES','texto','Mes'],['FUENTE','texto','De dónde salió la cifra'],['PACIENTE_DIAS','entero','Días paciente'],['DIAS_VM','entero','Días de VM'],
    ['EXTUBACIONES','entero','Extubaciones'],['REINTUB_48H','entero','Reintubaciones antes de 48 h'],['REINTUB_24H','entero','Reintubaciones antes de 24 h'],
    ['AUTOEXTUBACIONES','entero','Autoextubaciones'],['FUERA_PROTOCOLO','entero','Extubaciones fuera de protocolo'],['PVE','entero','Pruebas de ventilación espontánea'],
    ['TQT','entero','Traqueostomías'],['ATENCIONES','entero','Atenciones'],['EGRESOS','entero','Egresos'],['FALLECIDOS','entero','Fallecidos'],['NOTAS','texto','Notas'],
  ]},
  REINTUBACIONES: { headerRows: 1, cols: [
    ['ID_REINTUB','texto','Id. de la reintubación'],['PATIENT_ID','uuid','Id. del episodio'],['TIMESTAMP','ts','Momento del registro'],['FECHA','fecha','Fecha'],['TURNO','texto','Turno (día o noche)'],
    ['ID_CAMA','texto','Cama'],['ID_EVOLUCION','texto','Id. de la evolución'],['NOMBRE','texto','Nombre'],['COD_PACIENTE','texto','Código del paciente'],['DIAGNOSTICO','texto','Diagnóstico'],
    ['TIPO_DESVINCULACION','texto','Cómo se había desvinculado'],['MOTIVO','texto','Motivo de la reintubación'],['SOPORTE_PREVIO','texto','Soporte antes de reintubar'],['TIEMPO_EXTUBADO','texto','Cuánto estuvo extubado'],
    ['HORA_REINTUBACION','texto','Hora de la reintubación'],['KINESIOLOGO','texto','Kinesiólogo del turno'],['AUTOR_EMAIL','email','Correo de quien lo registró'],
  ]},
  // Historial de entregas de turno emitidas (no afecta datos clínicos).
  // ÚNICA definición vigente: es la que construyó la hoja real (13 columnas,
  // con AUTOR_EMAIL). El identificador se llama ID — el servicio escribe y
  // lee ese nombre; durante un tiempo escribió ID_ENTREGA y la columna
  // quedaba vacía (corregido ago-2026).
  ENTREGAS_TURNO: { headerRows: 1, cols: [
    ['ID','texto','Id. de la entrega'],['TIMESTAMP','ts','Momento del registro'],['FECHA','fecha','Fecha'],['TURNO','texto','Turno (día o noche)'],['KINE_ENTREGA','texto','Kinesiólogo que entrega'],
    ['KINE_RECIBE','texto','Kinesiólogo que recibe'],['AUTOR_EMAIL','email','Correo de quien lo registró'],['CAMAS_N','entero','Camas de la unidad'],['OCUPADAS','entero','Camas ocupadas'],['EN_VM','entero','Pacientes en VM'],
    ['CAMAS_IDS','texto','Qué camas'],['NOTAS','texto','Notas de la entrega'],['SNAPSHOT_JSON','json','Foto de la unidad al entregar'],
  ]},
  // Sugerencias del equipo (ago-2026, centro de ayuda): cada colega deja la
  // suya con su firma desde la mascota; la coordinación las revisa en
  // Estadísticas y les pone estado (nueva/considerada/aplicada/descartada).
  SUGERENCIAS: { headerRows: 1, cols: [
    ['ID','texto','Id. de la sugerencia'],['TIMESTAMP','ts','Momento del registro'],['FIRMA','texto','Firma del kinesiólogo'],['AUTOR_EMAIL','email','Correo de quien lo registró'],
    ['TEXTO','texto','Sugerencia'],['ESTADO','texto','Estado (nueva, considerada, aplicada…)'],['NOTA_COORD','texto','Respuesta de coordinación'],
  ]},
  AUDIT_LOG: { headerRows: 1, cols: [
    ['ID','texto','Id. del registro'],['TIMESTAMP','ts','Momento del registro'],['USUARIO_EMAIL','email','Correo de quien lo hizo'],['FIRMA','texto','Firma del kinesiólogo'],['ACCION','texto','Qué hizo'],
    ['ENTIDAD','texto','Sobre qué'],['ID_ENTIDAD','texto','Id. de lo tocado'],['PATIENT_ID','uuid','Id. del episodio'],['RESUMEN','texto','Resumen'],
  ]},
  IMPORTAR: { headerRows: 1, cols: [
    ['CAMA','texto','Cama'],['NOMBRE','texto','Nombre'],['EDAD','texto','Edad'],['SEXO','texto','Sexo'],['FECHA_INGRESO','texto','Fecha de ingreso'],
    ['DIAGNOSTICO','texto','Diagnóstico'],['DIAG_REM','texto','Diagnóstico para el REM'],['VIA_SOPORTE','texto','Vía aérea y soporte'],['TALLA','texto','Talla (cm)'],
  ]},
  // 📨 El buzón (v5.91). 🔴 DE SOLO AGREGAR (regla de Diego, 4-sep-2026):
  // nada se edita ni se borra desde el código — si una nota cambia, se agrega
  // la versión nueva y la anterior queda, consultable para siempre.
  NOTIFICACIONES: { headerRows: 1, cols: [
    ['ID_NOTIF','texto','Id. del aviso'],['TS','ts','Momento'],['FECHA','texto','Fecha'],['TIPO','texto','Tipo de aviso'],
    ['TITULO','texto','Aviso'],['DETALLE','texto','Detalle'],['REF_CAMA','texto','Cama a la que se refiere'],['AUTOR','texto','Quién lo registró'],
    ['ORIGEN_ID','texto','De dónde vino'],
  ]},
  // 🧪 Gases importados desde los PDF del laboratorio (tanda 2b, sep-2026).
  // Hoja APARTE a propósito: el gas importado no entra a la evolución ni al
  // REM (decisión de Diego, 2-sep) — alimenta la hoja diaria y la impresa.
  // Guarda PATIENT_ID, nunca el RUT ni el nombre del informe.
  GSA_IMPORTADAS: { headerRows: 1, cols: [
    ['ID_GSA','texto','Id. del gas'],['PATIENT_ID','uuid','Id. del episodio'],['ID_CAMA','texto','Cama'],['FECHA','texto','Fecha'],['HORA','texto','Hora de la toma'],
    ['TURNO_KEY','texto','Llave del turno'],['PH','decimal','pH'],['PACO2','decimal','PaCO₂'],['PAO2','decimal','PaO₂'],['HCO3','decimal','Bicarbonato'],
    ['EB','decimal','Exceso de base'],['SATO2','decimal','Saturación arterial'],['FIO2','decimal','FiO₂'],['PAFI','decimal','PaFiO₂'],['LACTATO','decimal','Lactato'],
    ['HB','decimal','Hemoglobina'],['HTO','decimal','Hematocrito'],['PLAQUETAS','decimal','Plaquetas'],['INR','decimal','INR'],['K','decimal','Potasio'],
    ['NA','decimal','Sodio'],['GLICEMIA','decimal','Glicemia'],['PCR','decimal','PCR'],
    ['ARCHIVO','texto','Archivo del laboratorio'],['ARCHIVO_ID','texto','Id. del archivo'],['PETICION','texto','Número de petición'],['TS_IMPORT','ts','Cuándo se importó'],
    ['ESTADO','texto','Estado de la importación'],['DETALLE','texto','Detalle'],
  ]},
  // 📋 Plantillas de evolución (tanda 3, sep-2026, PRD_PLANTILLAS_EVOLUCION):
  // catálogo aparte — de una firma o de la UNIDAD, por caso. EVOLUCIONES no
  // cambia por esto. Nada se borra: ACTIVO=false.
  PLANTILLAS_EVOLUCION: { headerRows: 1, cols: [
    ['ID','texto','Id. de la plantilla'],['DUENO','texto','De quién es (firma o unidad)'],['CASO','texto','Para qué caso'],['NOMBRE','texto','Nombre de la plantilla'],['CUERPO','texto','Texto de la plantilla'],
    ['ACTIVO','bool','Activo'],['ORDEN','entero','Orden en la lista'],['ACTUALIZADO','ts','Última actualización'],['ACTUALIZADO_POR','texto','Quién la actualizó'],
  ]},
  // 🗂️ EVALUACIONES — la SERIE FECHADA del episodio (rama episodio/turno,
  // 11-sep-2026). Una fila por medición: MRC, FSS-ICU, CPAx, Pimáx/PEM/FEM,
  // dinamometría, ecografía, deglución, cultivos. Con FECHA y FIRMA reales,
  // para que la evolución de hoy pueda CITAR «MRC 33 del 02-09 (MCC)» en vez
  // de apropiárselo. De SOLO AGREGAR: corregir es una fila nueva y ANULADA en
  // la vieja — la serie nunca borra. ECF, Barthel y Charlson NO van aquí
  // (Diego: «es la que es, previa a la UCI; si hay corrección se corrige el
  // mismo dato»): viven en CAMAS_ESTADO como dato único.
  EVALUACIONES: { headerRows: 1, cols: [
    ['ID_EVAL','texto','Id. de la medición'],['PATIENT_ID','uuid','Id. del episodio'],['ID_CAMA','texto','Cama'],
    ['FECHA','fecha','Fecha'],['TURNO','texto','Turno (día o noche)'],
    ['ESCALA','texto','Qué se midió'],        // MRC · FSS · CPAX · PIM · PEM · FEM · DINAMO · ECO · DEGLUCION · CULTIVO
    ['TOTAL','texto','Resultado'],         // el número (o el resultado, en cultivos); texto para no perder decimales con coma
    ['ITEMS_JSON','json','Ítems tal como se anotaron'],     // los ítems de la escala tal cual se anotaron
    ['FIRMA','texto','Quién midió'],         // quién MIDIÓ (procedencia, no propiedad)
    ['ORIGEN','texto','De dónde vino (turno o corrección)'],        // turno · tarjeta · correccion
    ['ID_EVOLUCION','texto','Id. de la evolución'],  // la fila del turno, si se midió dentro de uno
    ['ANULADA','bool','Anulada'],
    ['TIMESTAMP','ts','Momento del registro'],
  ]},
};

// ── Derivados (generados una sola vez desde ESQUEMA) ───────
const SH = {};          // SH.EVOLUCIONES → 'EVOLUCIONES'
const COL = {};         // COL.EVOLUCIONES.FECHA → 6
const TOTAL_COLS = {};  // TOTAL_COLS.EVOLUCIONES → 397
const FILA_DATOS = {};  // FILA_DATOS.EVOLUCIONES → 4
(function _derivar() {
  Object.keys(ESQUEMA).forEach(hoja => {
    SH[hoja] = hoja;
    const def = ESQUEMA[hoja];
    const m = {};
    def.cols.forEach((c, i) => { m[c[0]] = i + 1; });
    COL[hoja] = m;
    TOTAL_COLS[hoja] = def.cols.length;
    FILA_DATOS[hoja] = def.headerRows + 1;
  });
})();

// ── Conversión fila ↔ objeto (dirigida por esquema) ────────
function esquemaFilaAObjeto(hoja, fila) {
  const cols = ESQUEMA[hoja].cols, obj = {};
  for (let i = 0; i < cols.length; i++) {
    let v = fila[i];
    if (v instanceof Date) v = Utilities.formatDate(v, _tz(), 'yyyy-MM-dd');
    obj[cols[i][0]] = (v === undefined) ? '' : v;
  }
  return obj;
}
function esquemaObjetoAFila(hoja, obj) {
  const cols = ESQUEMA[hoja].cols, fila = new Array(cols.length).fill('');
  for (let i = 0; i < cols.length; i++) {
    const v = obj[cols[i][0]];
    if (v !== undefined && v !== null) fila[i] = v;
  }
  return fila;
}

// ── CONFIG: una sola lectura por ejecución (ago-2026) ───────────────────────
// `leerConfig` bajaba la tabla CONFIG entera CADA vez que se le preguntaba una
// clave, y un solo arranque pregunta 17 veces (12 en _configUI, 4 en camas, 1
// en evoluciones) por una tabla de ~20 filas que no cambia durante la
// petición. En Apps Script cada llamada a la API de Sheets es un viaje de red:
// se pagaban ~50 viajes para leer 17 valores.
//
// El memo vive lo que dura la ejecución. Eso basta y es lo seguro: cada
// petición a la web app es un proceso nuevo, así que nadie puede quedarse con
// una configuración vieja. `escribirConfig` lo invalida para que quien escriba
// y lea seguido dentro de la misma ejecución vea su propio cambio.
// (`_MEMO_OFF`, `_memoApagado()` y `_memoReset()` viven en infra_util.gs, que
// es el archivo que también se carga en el simulador.)
var _CFG_MEMO = null;

/** Tabla CONFIG {clave: valor} de esta petición. */
function _cfgTabla() {
  if (_CFG_MEMO && !_memoApagado()) return _CFG_MEMO;
  const m = {};
  try {
    const h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CONFIG');
    if (h && h.getLastRow() >= 2) {
      const vals = h.getRange(2, 1, h.getLastRow() - 1, 2).getValues();
      for (let i = 0; i < vals.length; i++) {
        const k = String(vals[i][0]).trim(), v = String(vals[i][1]).trim();
        // Misma semántica que la lectura anterior: gana la PRIMERA aparición de
        // la clave, y un valor vacío NO cuenta como definido (cae al
        // por-defecto de quien pregunta).
        if (k && v !== '' && !Object.prototype.hasOwnProperty.call(m, k)) m[k] = v;
      }
    }
  } catch (e) {}
  if (!_memoApagado()) _CFG_MEMO = m;
  return m;
}

/** Lee una clave de CONFIG (columna A=clave, B=valor). Devuelve porDefecto si no existe. */
function leerConfig(clave, porDefecto) {
  const m = _cfgTabla();
  return Object.prototype.hasOwnProperty.call(m, clave) ? m[clave] : porDefecto;
}

/** Escribe (o crea) una clave en la hoja CONFIG. */
function escribirConfig(clave, valor) {
  _CFG_MEMO = null;   // lo que se escribe debe verse en la siguiente lectura
  _TZ_MEMO = null;    // TIMEZONE vive en la misma hoja
  const h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CONFIG');
  if (!h) throw new Error('No existe la hoja CONFIG (corre crearORepararEstructura).');
  const n = h.getLastRow();
  if (n >= 2) {
    const vals = h.getRange(2, 1, n - 1, 1).getValues();
    for (let i = 0; i < vals.length; i++) {
      if (String(vals[i][0]).trim() === clave) { h.getRange(i + 2, 2).setValue(valor); return; }
    }
  }
  h.appendRow([clave, valor]);
}

/**
 * MODO PRUEBA — abre la app a cualquiera (omite el login de Google).
 * Correr esta función desde el editor de Apps Script. ⚠️ Solo para la marcha
 * blanca; salir con salirModoPrueba() antes de operar con datos reales.
 */
function activarModoPrueba() {
  escribirConfig('AUTH_DEV_MODE', 'TRUE');
  console.warn('✅ MODO PRUEBA ACTIVO — cualquiera puede entrar sin login. Cada kine firma con su sigla.');
  return 'Modo prueba ACTIVADO (AUTH_DEV_MODE=TRUE).';
}

/** Reactiva la autenticación de Google (producción). */
function salirModoPrueba() {
  escribirConfig('AUTH_DEV_MODE', 'FALSE');
  console.warn('🔒 Autenticación de Google REACTIVADA (AUTH_DEV_MODE=FALSE).');
  return 'Modo prueba DESACTIVADO (AUTH_DEV_MODE=FALSE).';
}

// Zona horaria: UNA lectura por petición (ago-2026). Ojo con el alcance: _tz()
// NO es un rincón raro. Está en el camino caliente, porque lo llaman
// `hoyISO()` y `ahoraTS()` (infra_fechas.gs) — o sea CADA TIMESTAMP que se
// escribe: cada evolución, cada hito, cada línea de auditoría. Encima,
// esquemaFilaAObjeto lo pide por CADA celda que venga como fecha (la rama
// `v instanceof Date`): esa vía hoy casi no se dispara porque _forzarTexto
// mantiene las columnas de fecha como texto, pero basta con que UNA celda
// quede con formato de fecha —un pegado, una reparación a mano— para que
// abrir Estadísticas pase de 22 lecturas a miles.
// El memo vive lo que dura la petición: api() lo olvida al entrar
// (_memoReset) y escribirConfig lo invalida al escribir. Guardia: memo_tz.js.
var _TZ_MEMO = null;

function _tz() {
  if (_TZ_MEMO !== null && !_memoApagado()) return _TZ_MEMO;
  // Comparte la tabla ya memoizada de _cfgTabla (ago-2026, Ola 4): antes este
  // memo bajaba la hoja CONFIG por su cuenta, así que una petición que leyera
  // config Y formateara fechas —o sea, casi todas— pagaba la misma lectura dos
  // veces. leerConfig no llama a _tz, así que no hay recursión posible.
  let tz = 'America/Santiago';
  try { tz = String(leerConfig('TIMEZONE', tz) || tz); } catch (e) {}
  if (!_memoApagado()) _TZ_MEMO = tz;
  return tz;
}

// ============================================================
//  CREACIÓN / REPARACIÓN DE LA ESTRUCTURA (idempotente)
// ============================================================
function crearORepararEstructura() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('No hay planilla activa. El proyecto de Apps Script debe estar ' +
      'CONTENIDO en el Google Sheet (abrirlo desde la planilla: Extensiones → Apps Script).');
  }
  const creadas = [];
  // "paso" acompaña cada etapa para que un fallo diga EXACTAMENTE dónde ocurrió
  // (sin esto, el editor solo muestra un error genérico difícil de diagnosticar).
  let paso = 'inicio';
  try {
    Object.keys(ESQUEMA).forEach(hoja => {
      paso = 'hoja ' + hoja;
      const def = ESQUEMA[hoja];
      const total = def.cols.length;
      let h = ss.getSheetByName(hoja);
      if (!h) { h = ss.insertSheet(hoja); creadas.push(hoja); }

      // Asegurar ancho suficiente (migración no destructiva).
      paso = 'hoja ' + hoja + ' (ancho: ' + h.getMaxColumns() + ' → ' + total + ' columnas)';
      if (h.getMaxColumns() < total) {
        h.insertColumnsAfter(h.getMaxColumns(), total - h.getMaxColumns());
      }

      /* Escribir encabezados (fila siempre re-sincronizada).
         🔴 LO QUE SE VE ES EL RÓTULO, NO LA SIGLA (16-sep-2026, Diego: «los
         nombres de la base de datos tienen que ser entendibles con tan solo
         mirarlos; para un clínico es necesario ser explícito»). La celda dice
         «Presión cuff» y su NOTA dice `EVAL_T_PMANT_VA`, que es lo que necesita
         quien programa o analiza. Los dos salen de la misma tupla de `cols`, así
         que no se pueden desincronizar.
         🪤 El encabezado NO lo lee nadie para cargar datos: las lecturas van por
         POSICIÓN (`esquemaFilaAObjeto`). Por eso cambiar el texto es seguro — y
         por eso el nombre técnico tiene que quedar a la vista en algún lado. */
      paso = 'hoja ' + hoja + ' (encabezados)';
      const nombres = def.cols.map(c => c[0]);
      const rotulos = def.cols.map(c => c[2] || c[0]);
      const filaEnc = def.headerRows >= 2 ? 2 : 1;
      // Fila 1 de las hojas con 2+ encabezados: el título de la hoja.
      if (def.headerRows >= 2) h.getRange(1, 1).setValue(hoja);
      h.getRange(filaEnc, 1, 1, total).setValues([rotulos]);
      h.getRange(filaEnc, 1, 1, total).setNotes([nombres]);
      h.setFrozenRows(def.headerRows);

      // Formato texto '@' en columnas sensibles.
      paso = 'hoja ' + hoja + ' (formato de columnas)';
      _forzarTexto(h, def);
    });

    paso = 'datos semilla (_sembrar)';
    _sembrar(ss);
    paso = 'flush final';
    SpreadsheetApp.flush();
  } catch (e) {
    throw new Error('crearORepararEstructura falló en: ' + paso + ' → ' + e.message +
      (e.stack ? '\n' + e.stack : ''));
  }

  const msg = creadas.length
    ? 'Hojas creadas: ' + creadas.join(', ') + '.'
    : 'Todas las hojas existían; estructura verificada.';
  console.log(msg);
  return { ok: true, creadas: creadas, mensaje: msg };
}

function _forzarTexto(h, def) {
  const filaInicio = def.headerRows + 1;
  const nFilas = h.getMaxRows() - filaInicio + 1;
  if (nFilas < 1) return;
  def.cols.forEach((c, i) => {
    if (_TIPOS_TEXTO.indexOf(c[1]) !== -1) {
      h.getRange(filaInicio, i + 1, nFilas, 1).setNumberFormat('@');
    }
  });
}

// ── Datos semilla ──────────────────────────────────────────
function _sembrar(ss) {
  // CONFIG
  const hCfg = ss.getSheetByName('CONFIG');
  const cfgDefaults = [
    ['NUM_CAMAS', '18'],
    ['TIMEZONE', 'America/Santiago'],
    ['ULTIMO_BACKUP', ''],
    ['OAUTH_CLIENT_ID', ''],
    ['BACKUP_MAX_DIARIOS', '30'],
    // Mes de la última copia mensual PERMANENTE (D7). Lo escribe backupMensual();
    // sirve para ver de un vistazo si la serie de años está al día.
    ['ULTIMO_BACKUP_MENSUAL', ''],
    ['VERSION_ESQUEMA', '2.0'],
    // Modo desarrollo: TRUE = omite la verificación GIS y usa AUTH_DEV_FIRMA.
    // DEBE quedar en FALSE en producción.
    ['AUTH_DEV_MODE', 'FALSE'],
    ['AUTH_DEV_FIRMA', 'DMV'],
    // Acceso del turno con clave propia (svc_acceso.gs, 15-sep-2026). Nace
    // APAGADO: encenderlo sin repartir las claves deja a la unidad sin poder
    // registrar. Se enciende con accesoEncender(), que se niega si alguien
    // del equipo activo quedaría afuera.
    ['LOGIN_EQUIPO_ACTIVO', 'FALSE'],
    // Modo Coordinación · recuperar la clave por correo (ago-2026).
    // APAGADO a propósito: Diego rechazó el envío de correos y hoy el sistema
    // no manda ninguno. El mecanismo está escrito y probado; encenderlo es
    // poner TRUE aquí, no programar. Antes de encenderlo hay que llenar la
    // columna EMAIL de las tres firmas en KINESIOLOGOS.
    ['COORD_RECUPERA_CORREO', 'FALSE'],
    // Ventanas de turno (hora en que PARTE cada turno; la madrugada previa al
    // inicio del día sigue contando como la noche del día anterior)
    ['TURNO_DIA_INICIO', '9'],
    ['TURNO_NOCHE_INICIO', '21'],
    // Visor de imágenes (2-sep-2026). Vacío = el botón 🩻 no aparece en las
    // tarjetas. Se pone la URL BASE del login, nunca un enlace con token de
    // sesión: ésos caducan. Medido ese día: Synapse manda X-Frame-Options
    // 'sameorigin', así que NO se puede embeber — el botón abre otra pestaña.
    ['SYNAPSE_URL', ''],
    // Laboratorio (LIS del hospital). Vacío = sin botón 🧪 en la tarjeta.
    // 🔴 La dirección NO se escribe aquí: es una IP interna del hospital y este
    // repo es público. La pega Diego en la hoja CONFIG, como la de Synapse.
    ['LIS_URL', ''],
    // Fiestas Patrias: días de septiembre en que la mascota celebra («16-20»).
    // Vacío o mal escrito = se usa el defecto que trae el index.
    ['FIESTAS_PATRIAS', '16-20'],
    // Aviso de fin de turno (PRD guardado obligatorio, O4). 🔴 NO confundir con
    // TURNO_*_INICIO: esas dos son el cambio de turno de la APP (indexan
    // turnoKey, idEvolucion, censo y auditoría). Éstas son la HORA REAL EN QUE
    // SE VA EL EQUIPO, y sirven SOLO para saber cuándo avisar. Calcular el
    // aviso con las de arriba lo sacaría a las 20:45 y 08:45, con la unidad ya
    // vacía. AVISO_FIN_TURNO_MIN en 0 apaga el aviso sin publicar versión.
    ['SALIDA_TURNO_DIA', '20:00'],
    ['SALIDA_TURNO_NOCHE', '08:00'],
    ['AVISO_FIN_TURNO_MIN', '30'],
    ['AVISO_FIN_TURNO_REPETIR', 'FALSE'],
    // Interpretación clínica (cortes ajustables por el equipo sin tocar código)
    ['CPAX_ACTIVO', 'TRUE'],        // FALSE oculta la sección CPAx del panel
    ['CORTE_MRC_DAUCI', '48'],      // MRC-SS < corte = DAUCI
    ['CORTE_MRC_SEVERA', '36'],     // MRC-SS < corte = DAUCI severa
    ['CORTE_DINAMO_H', '11'],       // kg, hombres (Ali 2008)
    ['CORTE_DINAMO_M', '7'],        // kg, mujeres
    ['CORTE_FSS_INDEP', '27'],      // FSS-ICU >= corte = independencia funcional
    ['EVAL_DIAS_ALERTA', '5'],      // días sin re-evaluar MRC/FSS (cooperador) antes de alertar
    // Pimometría pendiente (v5.93): en CPAP/PS con soporte BAJO este valor y
    // destete prolongado (Boles 2007) o VM de PIMO_VM_DIAS días (NAMDRC
    // 2005: 21), la campana pide medir Pimáx. Editables sin tocar código.
    ['GSA_CARPETA_ID', ''],         // carpeta de Drive con los PDF del laboratorio (se crea sola si falta)
    // 📋 Plantillas de evolución para el equipo. FALSE (7-sep-2026, Diego):
    // el texto vuelve al motor de siempre y el editor lo ve solo coordinación
    // mientras arma las plantillas. Se enciende poniendo TRUE aquí.
    ['PLANTILLAS_ACTIVAS', 'FALSE'],
    ['PIMO_PS_MAX', '14'],
    ['PIMO_VM_DIAS', '21'],
    // ⏱️ Días de VM por bloques de 24 h desde la hora de inicio del soporte
    // (Diego, 11-sep-2026). FALSE = días de calendario como la estadía.
    ['VM_POR_HORAS', 'TRUE'],
    ['PVE_TURNOS_ALERTA', '2'],     // turnos seguidos candidato a PVE sin PVE antes de alertar
    ['FREC_HME_DIAS', '2'],         // días entre cambios de filtro HME
    ['FREC_HEPA_DIAS', '3'],        // días entre cambios de filtro HEPA
    ['FREC_SONDA_DIAS', '3'],       // días entre cambios de sonda de aspiración cerrada
    // Presión de cuff (IDSA 20-30 cmH2O): bajo el mínimo hay microaspiración
    // subglótica —vía principal de la NAVM—; sobre el máximo, isquemia de la
    // mucosa traqueal. Ajustar aquí si el protocolo de la unidad usa otro rango.
    ['CUFF_MIN', '20'],
    ['CUFF_MAX', '30'],
    // Presión transtraqueal con válvula de fonación: ≤PTT_OK vía aérea permeable
    // (la literatura reporta 86% de tolerancia a la válvula con ≤9 cmH2O y 93%
    // con ≤5); sobre PTT_ALERTA sugiere obstrucción alta o cánula sobredimensionada.
    ['PTT_OK', '10'],
    ['PTT_ALERTA', '12'],
    // Carpeta de Drive para las fotos de fallas de ventiladores. Vacío = la
    // app crea «RCE-KINE — Fallas de ventiladores» al primer uso y guarda su
    // ID aquí. Las fotos NO se comparten públicamente: heredan los permisos
    // de la carpeta (visibles para quien tenga acceso al Drive del dueño).
    ['FALLAS_FOTOS_FOLDER', ''],
    // Carpeta de Drive con los documentos de la unidad (imprimibles y
    // protocolos) que lista el modal 📂 Documentos. Vacío = la app crea
    // «RCE-KINE — Documentos de la unidad» (con subcarpetas Imprimibles y
    // Protocolos) al primer uso y guarda su ID aquí.
    ['DOCS_FOLDER', ''],
    // TEMPORAL: permite editar el texto de la vista previa en pantalla (solo
    // demostración; NO se guarda). Poner en FALSE cuando termine el afinamiento.
    ['EDITOR_TEXTO_DEMO', 'TRUE'],
  ];
  const cfgExist = _valoresCol(hCfg, 1, 2);
  cfgDefaults.forEach(kv => { if (cfgExist.indexOf(kv[0]) === -1) hCfg.appendRow(kv); });

  // CATALOGOS — fases clínicas: siembra inicial Y agrega las que falten
  // (idempotente: correr crearORepararEstructura suma fases nuevas sin duplicar;
  //  el orden de los chips se ajusta con la columna ORDEN de la hoja)
  const hCat = ss.getSheetByName('CATALOGOS');
  const fases = ['Reanimación inicial','Protección pulmonar','Neuroprotección',
    'Postoperatorio inmediato','Espera de second look','Weaning','Consolidación de weaning','Rehabilitación',
    'Cuidados postparo'];
  const nCat = hCat.getLastRow();
  const fasesExist = nCat >= 2
    ? hCat.getRange(2, 1, nCat - 1, 2).getValues()
        .filter(function (r) { return String(r[0]).trim() === 'FASE_CLINICA'; })
        .map(function (r) { return String(r[1]).trim(); })
    : [];
  fases.forEach(function (f, i) {
    if (fasesExist.indexOf(f) === -1) hCat.appendRow(['FASE_CLINICA', f, i + 1, true]);
  });

  // CAT_MATRICES — matrices de categorización SOCHIMI (default de la guía 2017;
  // la coordinación puede activar/desactivar variables y ajustar cortes aquí)
  const hCM = ss.getSheetByName('CAT_MATRICES');
  if (hCM && hCM.getLastRow() < 2) {
    const filasCM = [
      // MATRIZ, VARIABLE, ACTIVA, UMBRAL_2, UMBRAL_3, ORDEN
      ['RESP','ASISTENCIA',  true,  '',      '',     1],
      ['RESP','SAFI',        true,  '300',   '150',  2],
      ['RESP','FR',          true,  '20',    '28',   3],
      ['RESP','AUSCULTACION',true,  '',      '',     4],
      ['RESP','SECRECIONES', true,  '',      '',     5],
      ['RESP','VOLMIN',      false, '7',     '12',   6],
      ['RESP','PEEP',        false, '7',     '10',   7],
      ['RESP','FIO2',        false, '31',    '50',   8],
      ['MOTOR','S5Q_COOP',   true,  '',      '',     1],
      ['MOTOR','MRC',        true,  '48',    '36',   2],
      ['MOTOR','FSS',        true,  '20',    '10',   3],
      ['MOTOR','DINAMO',     true,  '30/17', '11/7', 4],
      ['MOTOR','SAS',        false, '4',     '2',    5],
      ['MOTOR','KTM_NIVEL',  false, '4',     '2',    6],
      ['MOTOR','CPAX',       false, '40',    '20',   7],
    ];
    hCM.getRange(2, 1, filasCM.length, 6).setValues(filasCM);
  }

  // KINESIOLOGOS — semilla (EMAIL vacío: se completa antes de producción)
  const hK = ss.getSheetByName('KINESIOLOGOS');
  if (hK.getLastRow() < 2) {
    const seed = [
      ['MOW','Mauricio Ortega Wanders','',false,true],['FGE','Felipe Guerrero Espinoza','',false,true],
      ['NPR','Natalia Parra Rojas','',false,true],['SOG','Sergio Ortiz Gómez','',false,true],
      ['MVA','María Vega Astudillo','',false,true],['AWE','Álvaro Wilson Espinoza','',false,true],
      ['EGT','Eduardo González Tapia','',false,true],['DMV','Diego Melo Villagrán','',false,true],
      ['KGV','Karen González Vásquez','',false,true],['CMF','Carlos Morales Flores','',false,true],
      ['AAG','Andrés Ángel Gómez','',false,true],['MFB','Manuel Fuentes Blanco','',false,true],
      ['ACR','Aline Campos Rivera','',false,true],['RC','Rodrigo Caamaño','',false,true],
      ['MCC','Magdalena Contardo Cisternas','',true,true],
    ];
    hK.getRange(2, 1, seed.length, 5).setValues(seed);
  }

  // PLANTILLAS_EVOLUCION — las 17 de la unidad (tanda 3): solo si está vacía.
  // Ya sembrada, el orden nuevo lo lleva la re-siembra de svc_plantillas.gs.
  if (typeof plantillasSembrarUnidad === 'function') {
    const nP = plantillasSembrarUnidad();
    if (nP) console.log('📋 Plantillas de la unidad sembradas: ' + nP);
  }

  // CAMAS_ESTADO — sembrar NUM_CAMAS camas vacías
  const hCam = ss.getSheetByName('CAMAS_ESTADO');
  const filaDatos = FILA_DATOS.CAMAS_ESTADO;
  if (hCam.getLastRow() < filaDatos) {
    const n = _numCamas(hCfg);
    const total = TOTAL_COLS.CAMAS_ESTADO, c = COL.CAMAS_ESTADO;
    const filas = [];
    for (let i = 1; i <= n; i++) {
      const f = new Array(total).fill('');
      f[c.ID_CAMA - 1] = String(i);
      f[c.OCUPADA - 1] = false;
      f[c.STATUS_CAMA - 1] = 'Libre';
      f[c.VIA_AEREA - 1] = 'Natural';
      f[c.SOPORTE - 1] = 'Ambiente';
      f[c.MODO - 1] = 'Sin soporte';
      filas.push(f);
    }
    hCam.getRange(filaDatos, 1, filas.length, total).setValues(filas);
  }
}

function _valoresCol(h, col, filaInicio) {
  const ult = h.getLastRow();
  if (ult < filaInicio) return [];
  return h.getRange(filaInicio, col, ult - filaInicio + 1, 1).getValues().map(r => String(r[0]));
}
function _numCamas(hCfg) {
  const vals = hCfg.getRange(1, 1, hCfg.getLastRow() || 1, 2).getValues();
  for (const r of vals) if (String(r[0]) === 'NUM_CAMAS') { const n = parseInt(r[1]); if (n > 0) return n; }
  return 18;
}

// ── Autotest del esquema (integridad) ──────────────────────
function testEsquema() {
  const errs = [];
  Object.keys(ESQUEMA).forEach(hoja => {
    const nombres = ESQUEMA[hoja].cols.map(c => c[0]);
    const set = new Set(nombres);
    if (set.size !== nombres.length) errs.push(hoja + ': nombres de columna duplicados');
    if (TOTAL_COLS[hoja] !== nombres.length) errs.push(hoja + ': TOTAL_COLS inconsistente');
    /* El RÓTULO también se revisa acá, no solo en la batería: es lo que Diego
       lee al abrir la planilla, y una columna sin rótulo sale con su sigla sin
       que nadie se entere. Dos rótulos iguales en una hoja son igual de malos:
       mirar la celda deja de decir cuál es cuál. */
    const sinRot = ESQUEMA[hoja].cols.filter(c => !c[2] || !String(c[2]).trim()).map(c => c[0]);
    if (sinRot.length) errs.push(hoja + ': columnas sin rótulo → ' + sinRot.slice(0, 5).join(', '));
    const rots = ESQUEMA[hoja].cols.map(c => String(c[2] || '').toLowerCase());
    if (new Set(rots).size !== rots.length) errs.push(hoja + ': rótulos repetidos');
  });
  // Salvaguarda contra el borrado accidental de columnas: el número va a mano
  // y HAY QUE SUBIRLO al agregar una (401 = 397 + INTUB/REINTUB/TQT_INTERFAZ_POST
  // y VENT_INTERFAZ_FINAL, 17-sep-2026; 397 = 396 + VENT_INTERFAZ, 16-sep-2026; 396 = 394 + PVE_SUP_SIN_EXT, PVE_SUP_SIN_EXT_RAZ, sep-2026; antes 394 = 393 + ANOTACIONES_JSON; antes 393 = 390 + NEURO_DVE, NEURO_DVE_ALTURA
  // y NEURO_PIC_CAPTOR, ago-2026; antes 390 = 387 + SED_SAS_META, SED_VIGIL y
  // SED_FARMACOS). Si
  // aparece este ❌ tras sumar una columna, la hoja está bien y lo que falta es
  // actualizar esta línea.
  if (TOTAL_COLS.EVOLUCIONES !== 401) errs.push("EVOLUCIONES != 401 columnas: " + TOTAL_COLS.EVOLUCIONES);
  console.log(errs.length ? '❌ ' + errs.join(' | ') : '✅ Esquema OK (' + Object.keys(ESQUEMA).length + ' hojas)');
  return errs;
}
