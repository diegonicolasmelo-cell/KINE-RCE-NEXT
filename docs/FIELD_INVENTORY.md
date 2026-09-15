# Inventario de campos legacy 7.04

Generado desde `legacy-baseline/v7.04/esquema.gs` por `npm run inventory`.

Total: 396 columnas de EVOLUCIONES.

**Inventario provisional, no matriz clínica aprobada.** La agrupación por nombre orienta la revisión; no autoriza transformaciones ni define variables nuevas. Todo campo conserva su nombre y tipo exactos de origen.

| Campo | Tipo legacy | Destino propuesto para revisar | Estado |
|---|---|---|---|
| ID_EVOLUCION | texto | Identidad / metadatos | Pendiente |
| ID_CAMA | texto | Identidad / metadatos | Pendiente |
| PATIENT_ID | uuid | Identidad / metadatos | Pendiente |
| COD_PACIENTE | texto | Requiere revisión individual | Pendiente |
| TURNO_KEY | texto | Identidad / metadatos | Pendiente |
| FECHA | fecha | Identidad / metadatos | Pendiente |
| TURNO | texto | Identidad / metadatos | Pendiente |
| ES_INGRESO | bool | Requiere revisión individual | Pendiente |
| ES_REINGRESO | bool | Requiere revisión individual | Pendiente |
| TIMESTAMP | ts | Identidad / metadatos | Pendiente |
| AUTOR_EMAIL | email | Identidad / metadatos | Pendiente |
| DIA_ESTADIA | entero | Derivado; no migrar como hecho | Pendiente |
| DIAS_VM | entero | Derivado; no migrar como hecho | Pendiente |
| DIAS_VA | entero | Derivado; no migrar como hecho | Pendiente |
| PAC_NOMBRE | texto | Persona / episodio; revisar privacidad | Pendiente |
| PAC_COD | texto | Persona / episodio; revisar privacidad | Pendiente |
| PAC_EDAD | entero | Persona / episodio; revisar privacidad | Pendiente |
| PAC_SEXO | texto | Persona / episodio; revisar privacidad | Pendiente |
| PAC_TALLA | decimal | Persona / episodio; revisar privacidad | Pendiente |
| PAC_PESO_IDEAL | decimal | Persona / episodio; revisar privacidad | Pendiente |
| PAC_BARTHEL | entero | Persona / episodio; revisar privacidad | Pendiente |
| PAC_ECF | texto | Persona / episodio; revisar privacidad | Pendiente |
| PAC_DIAGNOSTICO | texto | Persona / episodio; revisar privacidad | Pendiente |
| PAC_DIAG_REM | texto | Persona / episodio; revisar privacidad | Pendiente |
| PAC_AISLAMIENTO | bool | Estado por eventos; validar historia | Pendiente |
| PAC_AISL_MICRO | texto | Estado por eventos; validar historia | Pendiente |
| PAC_AISL_LISTA | json | Estado por eventos; validar historia | Pendiente |
| FASE_JSON | json | Requiere revisión individual | Pendiente |
| SED_TIPO | texto | Requiere revisión individual | Pendiente |
| SED_SAS | texto | Requiere revisión individual | Pendiente |
| SED_S5Q | texto | Requiere revisión individual | Pendiente |
| SED_COOPERACION | texto | Requiere revisión individual | Pendiente |
| SED_CAM_ICU | texto | Requiere revisión individual | Pendiente |
| SED_GCS_O | entero | Requiere revisión individual | Pendiente |
| SED_GCS_V | entero | Requiere revisión individual | Pendiente |
| SED_GCS_M | entero | Requiere revisión individual | Pendiente |
| SED_GCS_TOT | entero | Requiere revisión individual | Pendiente |
| SED_BNM | bool | Requiere revisión individual | Pendiente |
| HEMO_ESTADO | texto | Requiere revisión individual | Pendiente |
| HEMO_DVA | texto | Requiere revisión individual | Pendiente |
| HEMO_MULTI_DVA | bool | Requiere revisión individual | Pendiente |
| HEMO_NUM_DVA | entero | Requiere revisión individual | Pendiente |
| HEMO_TENDENCIA | bool | Requiere revisión individual | Pendiente |
| HEMO_TEND_TIPO | texto | Requiere revisión individual | Pendiente |
| EX_MP | texto | Requiere revisión individual | Pendiente |
| EX_RUIDOS | texto | Requiere revisión individual | Pendiente |
| EX_RUIDOS_LOC | texto | Requiere revisión individual | Pendiente |
| VENT_VIA_AEREA | texto | Revisión ventilatoria pendiente | Pendiente |
| VA_EXTERNO | bool | Requiere revisión individual | Pendiente |
| VA_EXTERNO_DIAS | entero | Requiere revisión individual | Pendiente |
| VENT_TOT_NUM | texto | Revisión ventilatoria pendiente | Pendiente |
| VENT_TOT_CM | texto | Revisión ventilatoria pendiente | Pendiente |
| TOT_FIJACION | texto | Requiere revisión individual | Pendiente |
| VENT_TQT_TIPO | texto | Revisión ventilatoria pendiente | Pendiente |
| VENT_TQT_CALIBRE | texto | Revisión ventilatoria pendiente | Pendiente |
| FECHA_INICIO_TQT | fecha | Requiere revisión individual | Pendiente |
| VENT_SOPORTE | texto | Revisión ventilatoria pendiente | Pendiente |
| VENT_MODO | texto | Revisión ventilatoria pendiente | Pendiente |
| VENT_ADAPTADO | texto | Revisión ventilatoria pendiente | Pendiente |
| VENT_H_ACTIVA | bool | Revisión ventilatoria pendiente | Pendiente |
| DIAS_VM_PREVIOS | entero | Derivado; no migrar como hecho | Pendiente |
| FECHA_INICIO_VM | fecha | Requiere revisión individual | Pendiente |
| DIAS_VNI_PREVIOS | entero | Derivado; no migrar como hecho | Pendiente |
| FECHA_INICIO_VNI | fecha | Requiere revisión individual | Pendiente |
| N_REINTUB | entero | Derivado; no migrar como hecho | Pendiente |
| VENT_VT | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_FR | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_PEEP | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_PMAX | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_PMEDIA | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_PPL | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_AUTOPEEP | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_PINSP | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_PS | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_IPAP | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_EPAP | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_IPAP_MIN | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_IPAP_MAX | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_VT_ASEG | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_FLUJO | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_TI | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_FIO2 | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_SPO2 | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_TEMP | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_LITROS | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_PMUSC | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_P01 | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_DPOCC | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_RISETIME | decimal | Revisión ventilatoria pendiente | Pendiente |
| VENT_CAB_RSS | texto | Revisión ventilatoria pendiente | Pendiente |
| VENT_CAB_RSS_DESC | texto | Revisión ventilatoria pendiente | Pendiente |
| CALC_ML_KG | texto | Derivado; no migrar como hecho | Pendiente |
| CALC_VOL_MIN | texto | Derivado; no migrar como hecho | Pendiente |
| CALC_IE | texto | Derivado; no migrar como hecho | Pendiente |
| CALC_DP | texto | Derivado; no migrar como hecho | Pendiente |
| CALC_CESR | texto | Derivado; no migrar como hecho | Pendiente |
| CALC_TOBIN | texto | Derivado; no migrar como hecho | Pendiente |
| CALC_IROX | texto | Derivado; no migrar como hecho | Pendiente |
| KTM_REALIZADA | bool | Sesión o programa; desambiguar | Pendiente |
| KTM_SUSPENDIDA | bool | Sesión o programa; desambiguar | Pendiente |
| KTM_NO_REALIZADA | bool | Sesión o programa; desambiguar | Pendiente |
| KTM_NO_RAZON | texto | Sesión o programa; desambiguar | Pendiente |
| KTM_NO_COMENTARIO | texto | Sesión o programa; desambiguar | Pendiente |
| KTM_CONTRA_TIPO | texto | Sesión o programa; desambiguar | Pendiente |
| KTM_CONTRA_CAT | texto | Sesión o programa; desambiguar | Pendiente |
| KTM_CONTRA_RAZON | texto | Sesión o programa; desambiguar | Pendiente |
| KTM_CONTRA_MANUAL | texto | Sesión o programa; desambiguar | Pendiente |
| KTM_NIVEL_KTR | texto | Sesión o programa; desambiguar | Pendiente |
| KTM_ASISTENCIA | texto | Sesión o programa; desambiguar | Pendiente |
| KTM_TIEMPO_MIN | entero | Sesión o programa; desambiguar | Pendiente |
| KTM_ALERTA | bool | Sesión o programa; desambiguar | Pendiente |
| KTM_ALERTA_CAT | texto | Sesión o programa; desambiguar | Pendiente |
| KTM_ALERTA_RAZ | texto | Sesión o programa; desambiguar | Pendiente |
| KTM_UMA | texto | Sesión o programa; desambiguar | Pendiente |
| KTM_IMT | bool | Sesión o programa; desambiguar | Pendiente |
| KTM_IMT_FREQ | texto | Sesión o programa; desambiguar | Pendiente |
| KTM_IMT_INT | texto | Sesión o programa; desambiguar | Pendiente |
| KTM_IMT_T | texto | Sesión o programa; desambiguar | Pendiente |
| KTM_IMT_DES | texto | Sesión o programa; desambiguar | Pendiente |
| RESP_KTR_CANT | entero | Atención / hallazgo; desambiguar | Pendiente |
| RESP_SIN_KTR | bool | Atención / hallazgo; desambiguar | Pendiente |
| RESP_SOF | bool | Atención / hallazgo; desambiguar | Pendiente |
| RESP_SNF | bool | Atención / hallazgo; desambiguar | Pendiente |
| RESP_SET | bool | Atención / hallazgo; desambiguar | Pendiente |
| RESP_ATOS | bool | Atención / hallazgo; desambiguar | Pendiente |
| RESP_INHALO | bool | Atención / hallazgo; desambiguar | Pendiente |
| RESP_SECR_QTY | texto | Atención / hallazgo; desambiguar | Pendiente |
| RESP_SECR_CAR | texto | Atención / hallazgo; desambiguar | Pendiente |
| RESP_SECR_REOL | texto | Atención / hallazgo; desambiguar | Pendiente |
| RESP_CULT_FECHAS | texto | Atención / hallazgo; desambiguar | Pendiente |
| RESP_CULT_OBJ | texto | Atención / hallazgo; desambiguar | Pendiente |
| RESP_POS_SED | bool | Atención / hallazgo; desambiguar | Pendiente |
| RESP_POS_DCLD | bool | Atención / hallazgo; desambiguar | Pendiente |
| RESP_POS_DCLI | bool | Atención / hallazgo; desambiguar | Pendiente |
| RESP_POS_PRONO | bool | Atención / hallazgo; desambiguar | Pendiente |
| RESP_POS_SUPINO | bool | Atención / hallazgo; desambiguar | Pendiente |
| RESP_POS_LIBRE | texto | Atención / hallazgo; desambiguar | Pendiente |
| RESP_PRONO_TS | texto | Evento; validar hora y episodio | Pendiente |
| RESP_SUPINO_TS | texto | Evento; validar hora y episodio | Pendiente |
| RESP_PRONO_HORA | texto | Evento; validar hora y episodio | Pendiente |
| RESP_SUPINO_HORA | texto | Evento; validar hora y episodio | Pendiente |
| PVE_RESULTADO | texto | Requiere revisión individual | Pendiente |
| PVE_FR_MOTIVOS | json | Requiere revisión individual | Pendiente |
| PVE_SC_RAZON | texto | Requiere revisión individual | Pendiente |
| PVE_VAL | texto | Requiere revisión individual | Pendiente |
| EXT_OCURRIO | bool | Evento; validar hora y episodio | Pendiente |
| EXT_HORA | texto | Evento; validar hora y episodio | Pendiente |
| EXT_TS | json | Evento; validar hora y episodio | Pendiente |
| EXT_TIPO | texto | Evento; validar hora y episodio | Pendiente |
| EXT_MOTIVO | texto | Evento; validar hora y episodio | Pendiente |
| EXT_POST_DET | texto | Evento; validar hora y episodio | Pendiente |
| EXT_REINTUB | bool | Evento; validar hora y episodio | Pendiente |
| EXT_REINTUB_RAZ | texto | Evento; validar hora y episodio | Pendiente |
| EXT_PE_VA | texto | Evento; validar hora y episodio | Pendiente |
| EXT_PE_SOP | texto | Evento; validar hora y episodio | Pendiente |
| EXT_PE_MODO | texto | Evento; validar hora y episodio | Pendiente |
| DECAN_OCURRIO | bool | Evento; validar hora y episodio | Pendiente |
| DECAN_HORA | texto | Evento; validar hora y episodio | Pendiente |
| DECAN_TIPO | texto | Evento; validar hora y episodio | Pendiente |
| DECAN_QUEDA_DISP | texto | Evento; validar hora y episodio | Pendiente |
| DECAN_QUEDA_FLUJO | texto | Evento; validar hora y episodio | Pendiente |
| DECAN_QUEDA_SPO2 | texto | Evento; validar hora y episodio | Pendiente |
| DECAN_DET | texto | Evento; validar hora y episodio | Pendiente |
| DECAN_RECANUL | bool | Evento; validar hora y episodio | Pendiente |
| VENT_VIA_AEREA_FINAL | texto | Revisión ventilatoria pendiente | Pendiente |
| VENT_SOPORTE_FINAL | texto | Revisión ventilatoria pendiente | Pendiente |
| VENT_MODO_FINAL | texto | Revisión ventilatoria pendiente | Pendiente |
| AET_ACTIVA | bool | Estado por eventos; validar historia | Pendiente |
| AET_NIVEL | texto | Estado por eventos; validar historia | Pendiente |
| MUE_REALIZADAS | bool | Requiere revisión individual | Pendiente |
| MUE_TIPOS_JSON | json | Requiere revisión individual | Pendiente |
| MUE_RESULTADOS_JSON | json | Requiere revisión individual | Pendiente |
| EX_CULT_RESULTADO | texto | Requiere revisión individual | Pendiente |
| EVAL_FECHA | fecha | Serie / evaluación | Pendiente |
| EVAL_T_REALIZAR | bool | Serie / evaluación | Pendiente |
| EVAL_NIVEL_MOTOR | texto | Serie / evaluación | Pendiente |
| EVAL_T_MRC | entero | Serie / evaluación | Pendiente |
| EVAL_T_DINAMO | decimal | Serie / evaluación | Pendiente |
| EVAL_T_FSS | entero | Serie / evaluación | Pendiente |
| EVAL_T_PIM | decimal | Serie / evaluación | Pendiente |
| EVAL_T_PEM | decimal | Serie / evaluación | Pendiente |
| EVAL_T_FEM | decimal | Serie / evaluación | Pendiente |
| EVAL_T_GROSOR | decimal | Serie / evaluación | Pendiente |
| EVAL_T_HALLAZGOS | texto | Serie / evaluación | Pendiente |
| EVAL_T_PMANT_VA | texto | Serie / evaluación | Pendiente |
| APNEA_JSON | json | Serie / evaluación | Pendiente |
| APNEA_ULTIMO | texto | Serie / evaluación | Pendiente |
| BDT_JSON | json | Serie / evaluación | Pendiente |
| BDT_ULTIMO | texto | Serie / evaluación | Pendiente |
| PROC_JSON | json | Requiere revisión individual | Pendiente |
| PROC_RESUMEN | texto | Requiere revisión individual | Pendiente |
| PROC_CANTIDAD | entero | Requiere revisión individual | Pendiente |
| PLAN_PLANES | texto | Requiere revisión individual | Pendiente |
| PLAN_NOTA_TURNO | texto | Requiere revisión individual | Pendiente |
| PLAN_FIRMA_KINE | texto | Requiere revisión individual | Pendiente |
| TEXTO_GENERADO | texto | Requiere revisión individual | Pendiente |
| TEXTO_AUTO | texto | Requiere revisión individual | Pendiente |
| TEXTO_MANUAL | bool | Requiere revisión individual | Pendiente |
| REINTUB_HORA | texto | Requiere revisión individual | Pendiente |
| INTUB_OCURRIO | bool | Requiere revisión individual | Pendiente |
| INTUB_HORA | texto | Requiere revisión individual | Pendiente |
| INTUB_DET | texto | Requiere revisión individual | Pendiente |
| REINTUB_SOP_PREV | texto | Requiere revisión individual | Pendiente |
| EVAL_T_CUAD_D | decimal | Serie / evaluación | Pendiente |
| EVAL_T_CUAD_I | decimal | Serie / evaluación | Pendiente |
| EVAL_T_HECKMATT | texto | Serie / evaluación | Pendiente |
| EVAL_T_FED_D | decimal | Serie / evaluación | Pendiente |
| EVAL_T_FED_I | decimal | Serie / evaluación | Pendiente |
| EVAL_T_EXC_D | decimal | Serie / evaluación | Pendiente |
| EVAL_T_EXC_I | decimal | Serie / evaluación | Pendiente |
| PAC_CHARLSON | entero | Persona / episodio; revisar privacidad | Pendiente |
| PAC_INGRESO_TIPO | texto | Persona / episodio; revisar privacidad | Pendiente |
| EXT_VISAGE | entero | Evento; validar hora y episodio | Pendiente |
| EXT_SCORE_VA | entero | Evento; validar hora y episodio | Pendiente |
| LAB_PH | decimal | Requiere revisión individual | Pendiente |
| LAB_PACO2 | decimal | Requiere revisión individual | Pendiente |
| LAB_PAO2 | decimal | Requiere revisión individual | Pendiente |
| LAB_HCO3 | decimal | Requiere revisión individual | Pendiente |
| LAB_LACTATO | decimal | Requiere revisión individual | Pendiente |
| LAB_PAFI | decimal | Requiere revisión individual | Pendiente |
| HEMO_FC | texto | Requiere revisión individual | Pendiente |
| HEMO_PA | texto | Requiere revisión individual | Pendiente |
| HEMO_PAM | entero | Requiere revisión individual | Pendiente |
| HEMO_PIC | entero | Requiere revisión individual | Pendiente |
| HEMO_PPC | entero | Requiere revisión individual | Pendiente |
| KTM_BORG | texto | Sesión o programa; desambiguar | Pendiente |
| MUE_HORA_TOMA | texto | Requiere revisión individual | Pendiente |
| MUE_CON_ATB | bool | Requiere revisión individual | Pendiente |
| VENT_FECHA_FILTRO | texto | Revisión ventilatoria pendiente | Pendiente |
| VENT_FECHA_SONDA | texto | Revisión ventilatoria pendiente | Pendiente |
| EVAL_FSS_IT1 | entero | Serie / evaluación | Pendiente |
| EVAL_FSS_IT2 | entero | Serie / evaluación | Pendiente |
| EVAL_FSS_IT3 | entero | Serie / evaluación | Pendiente |
| EVAL_FSS_IT4 | entero | Serie / evaluación | Pendiente |
| EVAL_FSS_IT5 | entero | Serie / evaluación | Pendiente |
| EVAL_MRC_D1 | entero | Serie / evaluación | Pendiente |
| EVAL_MRC_D2 | entero | Serie / evaluación | Pendiente |
| EVAL_MRC_D3 | entero | Serie / evaluación | Pendiente |
| EVAL_MRC_D4 | entero | Serie / evaluación | Pendiente |
| EVAL_MRC_D5 | entero | Serie / evaluación | Pendiente |
| EVAL_MRC_D6 | entero | Serie / evaluación | Pendiente |
| EVAL_MRC_I1 | entero | Serie / evaluación | Pendiente |
| EVAL_MRC_I2 | entero | Serie / evaluación | Pendiente |
| EVAL_MRC_I3 | entero | Serie / evaluación | Pendiente |
| EVAL_MRC_I4 | entero | Serie / evaluación | Pendiente |
| EVAL_MRC_I5 | entero | Serie / evaluación | Pendiente |
| EVAL_MRC_I6 | entero | Serie / evaluación | Pendiente |
| CPAX_IT1 | entero | Requiere revisión individual | Pendiente |
| CPAX_IT2 | entero | Requiere revisión individual | Pendiente |
| CPAX_IT3 | entero | Requiere revisión individual | Pendiente |
| CPAX_IT4 | entero | Requiere revisión individual | Pendiente |
| CPAX_IT5 | entero | Requiere revisión individual | Pendiente |
| CPAX_IT6 | entero | Requiere revisión individual | Pendiente |
| CPAX_IT7 | entero | Requiere revisión individual | Pendiente |
| CPAX_IT8 | entero | Requiere revisión individual | Pendiente |
| CPAX_IT9 | entero | Requiere revisión individual | Pendiente |
| CPAX_IT10 | entero | Requiere revisión individual | Pendiente |
| CPAX_TOTAL | entero | Requiere revisión individual | Pendiente |
| EX_RUIDOS_JSON | json | Requiere revisión individual | Pendiente |
| FILTRO_TIPO | texto | Requiere revisión individual | Pendiente |
| REINTUB_TOT_N | texto | Requiere revisión individual | Pendiente |
| REINTUB_TOT_CM | texto | Requiere revisión individual | Pendiente |
| REINTUB_MODO | texto | Requiere revisión individual | Pendiente |
| REINTUB_PARAMS | texto | Requiere revisión individual | Pendiente |
| EVAL_DEGLUCION | texto | Serie / evaluación | Pendiente |
| APNEA_TEST | texto | Serie / evaluación | Pendiente |
| UPOT_ACTIVO | bool | Estado por eventos; validar historia | Pendiente |
| UPOT_MEDIDAS | bool | Estado por eventos; validar historia | Pendiente |
| INTUB_SOP_PREVIO | texto | Requiere revisión individual | Pendiente |
| TOT_CAMBIO | bool | Requiere revisión individual | Pendiente |
| DISP_HME_FECHA | texto | Requiere revisión individual | Pendiente |
| DISP_HEPA_FECHA | texto | Requiere revisión individual | Pendiente |
| DISP_HUMID_FECHA | texto | Requiere revisión individual | Pendiente |
| LEGACY_IPAP_MAX_DUP | decimal | Requiere revisión individual | Pendiente |
| TOT_CAMBIO_MOTIVO | texto | Requiere revisión individual | Pendiente |
| TQT_CAMBIO | bool | Requiere revisión individual | Pendiente |
| TQT_CAMBIO_MOTIVO | texto | Requiere revisión individual | Pendiente |
| TQT_OCURRIO | bool | Requiere revisión individual | Pendiente |
| TQT_HORA | texto | Requiere revisión individual | Pendiente |
| TQT_TECNICA | texto | Requiere revisión individual | Pendiente |
| TQT_DET | texto | Requiere revisión individual | Pendiente |
| BARTHEL_JSON | json | Requiere revisión individual | Pendiente |
| CHARLSON_JSON | json | Requiere revisión individual | Pendiente |
| CAT_KINE | entero | Requiere revisión individual | Pendiente |
| CAT_RESP_PJE | entero | Requiere revisión individual | Pendiente |
| CAT_MOTOR_PJE | entero | Requiere revisión individual | Pendiente |
| CAT_RESP_NIVEL | texto | Requiere revisión individual | Pendiente |
| CAT_MOTOR_NIVEL | texto | Requiere revisión individual | Pendiente |
| KTM_EMS | bool | Sesión o programa; desambiguar | Pendiente |
| PLAN_PENDIENTES | json | Requiere revisión individual | Pendiente |
| HEMO_ARRITMIA | bool | Requiere revisión individual | Pendiente |
| HEMO_ARRITMIA_TIPO | texto | Requiere revisión individual | Pendiente |
| HEMO_META_PAM | bool | Requiere revisión individual | Pendiente |
| KTM_EMS_FREQ | texto | Sesión o programa; desambiguar | Pendiente |
| KTM_EMS_INT | texto | Sesión o programa; desambiguar | Pendiente |
| KTM_EMS_PULSO | texto | Sesión o programa; desambiguar | Pendiente |
| KTM_EMS_T | texto | Sesión o programa; desambiguar | Pendiente |
| KTM_EMS_GRUPO | texto | Sesión o programa; desambiguar | Pendiente |
| EVAL_IMS | texto | Serie / evaluación | Pendiente |
| VENT_PAFI | decimal | Revisión ventilatoria pendiente | Pendiente |
| KTM_CANT | entero | Sesión o programa; desambiguar | Pendiente |
| EDU_REALIZADA | bool | Requiere revisión individual | Pendiente |
| VENT_CUFF_EST | texto | Revisión ventilatoria pendiente | Pendiente |
| VENT_CUFF_CMH2O | decimal | Revisión ventilatoria pendiente | Pendiente |
| PVE_SC_DET | texto | Requiere revisión individual | Pendiente |
| GSA_TOMADA | bool | Requiere revisión individual | Pendiente |
| GSA_HORA | texto | Requiere revisión individual | Pendiente |
| GSA_PH | decimal | Requiere revisión individual | Pendiente |
| GSA_PAO2 | decimal | Requiere revisión individual | Pendiente |
| GSA_PACO2 | decimal | Requiere revisión individual | Pendiente |
| GSA_HCO3 | decimal | Requiere revisión individual | Pendiente |
| GSA_EB | decimal | Requiere revisión individual | Pendiente |
| GSA_LACTATO | decimal | Requiere revisión individual | Pendiente |
| GSA_SAO2 | decimal | Requiere revisión individual | Pendiente |
| GSA_FIO2 | decimal | Requiere revisión individual | Pendiente |
| GSA_INTERP | texto | Requiere revisión individual | Pendiente |
| DESVINC_OCURRIO | bool | Requiere revisión individual | Pendiente |
| DESVINC_HORA | texto | Requiere revisión individual | Pendiente |
| DESVINC_A | texto | Requiere revisión individual | Pendiente |
| DESVINC_RECONEXION | bool | Requiere revisión individual | Pendiente |
| DESVINC_HORA_RECON | texto | Requiere revisión individual | Pendiente |
| DESVINC_HORAS | decimal | Requiere revisión individual | Pendiente |
| DESVINC_MOTIVO | texto | Requiere revisión individual | Pendiente |
| DESVINC_DET | texto | Requiere revisión individual | Pendiente |
| VFON_USADA | bool | Requiere revisión individual | Pendiente |
| VFON_MIN | entero | Requiere revisión individual | Pendiente |
| VFON_TOL | texto | Requiere revisión individual | Pendiente |
| VFON_DET | texto | Requiere revisión individual | Pendiente |
| INTUB_VA_PREVIA | texto | Requiere revisión individual | Pendiente |
| INTUB_MODO_PREVIO | texto | Requiere revisión individual | Pendiente |
| INTUB_VA_POST | texto | Requiere revisión individual | Pendiente |
| INTUB_SOP_POST | texto | Requiere revisión individual | Pendiente |
| INTUB_MODO_POST | texto | Requiere revisión individual | Pendiente |
| INTUB_TOT_N | texto | Requiere revisión individual | Pendiente |
| INTUB_TOT_CM | texto | Requiere revisión individual | Pendiente |
| INTUB_VT | decimal | Requiere revisión individual | Pendiente |
| INTUB_FR | decimal | Requiere revisión individual | Pendiente |
| INTUB_PEEP | decimal | Requiere revisión individual | Pendiente |
| INTUB_FIO2 | decimal | Requiere revisión individual | Pendiente |
| INTUB_SPO2 | decimal | Requiere revisión individual | Pendiente |
| TQT_SOP_POST | texto | Requiere revisión individual | Pendiente |
| TQT_MODO_POST | texto | Requiere revisión individual | Pendiente |
| TQT_PARAMS | texto | Requiere revisión individual | Pendiente |
| INTUB_PMAX | decimal | Requiere revisión individual | Pendiente |
| INTUB_PPL | decimal | Requiere revisión individual | Pendiente |
| INTUB_PMEDIA | decimal | Requiere revisión individual | Pendiente |
| INTUB_AUTOPEEP | decimal | Requiere revisión individual | Pendiente |
| INTUB_PS | decimal | Requiere revisión individual | Pendiente |
| INTUB_PINSP | decimal | Requiere revisión individual | Pendiente |
| INTUB_FLUJO | decimal | Requiere revisión individual | Pendiente |
| INTUB_TI | decimal | Requiere revisión individual | Pendiente |
| INTUB_PAFI | decimal | Requiere revisión individual | Pendiente |
| PROC_IMAGEN | bool | Requiere revisión individual | Pendiente |
| PROC_PABELLON | bool | Requiere revisión individual | Pendiente |
| PROC_ASIST_MED | bool | Requiere revisión individual | Pendiente |
| PROC_RCP | bool | Requiere revisión individual | Pendiente |
| PROC_RCP_CICLOS | entero | Requiere revisión individual | Pendiente |
| PROC_RCP_HORA | texto | Requiere revisión individual | Pendiente |
| PROC_RCP_DET | texto | Requiere revisión individual | Pendiente |
| REINTUB_SOP_POST | texto | Requiere revisión individual | Pendiente |
| REINTUB_VT | decimal | Requiere revisión individual | Pendiente |
| REINTUB_FR | decimal | Requiere revisión individual | Pendiente |
| REINTUB_PEEP | decimal | Requiere revisión individual | Pendiente |
| REINTUB_FIO2 | decimal | Requiere revisión individual | Pendiente |
| REINTUB_SPO2 | decimal | Requiere revisión individual | Pendiente |
| REINTUB_PMAX | decimal | Requiere revisión individual | Pendiente |
| REINTUB_PPL | decimal | Requiere revisión individual | Pendiente |
| REINTUB_AUTOPEEP | decimal | Requiere revisión individual | Pendiente |
| REINTUB_PS | decimal | Requiere revisión individual | Pendiente |
| REINTUB_PAFI | decimal | Requiere revisión individual | Pendiente |
| TQT_VT | decimal | Requiere revisión individual | Pendiente |
| TQT_FR | decimal | Requiere revisión individual | Pendiente |
| TQT_PEEP | decimal | Requiere revisión individual | Pendiente |
| TQT_FIO2 | decimal | Requiere revisión individual | Pendiente |
| TQT_SPO2 | decimal | Requiere revisión individual | Pendiente |
| TQT_PMAX | decimal | Requiere revisión individual | Pendiente |
| TQT_PPL | decimal | Requiere revisión individual | Pendiente |
| TQT_PS | decimal | Requiere revisión individual | Pendiente |
| TQT_PAFI | decimal | Requiere revisión individual | Pendiente |
| TEXTO_BLOQUES | texto | Requiere revisión individual | Pendiente |
| RESP_PRONO_EVENTO | bool | Evento; validar hora y episodio | Pendiente |
| RESP_SUPINO_EVENTO | bool | Evento; validar hora y episodio | Pendiente |
| PRONO_INICIO_TS | texto | Requiere revisión individual | Pendiente |
| SUPINO_TS | texto | Requiere revisión individual | Pendiente |
| PRONO_HORAS | decimal | Requiere revisión individual | Pendiente |
| DIAS_VNI | entero | Derivado; no migrar como hecho | Pendiente |
| RESP_SNT | bool | Atención / hallazgo; desambiguar | Pendiente |
| SED_SAS_META | texto | Requiere revisión individual | Pendiente |
| SED_VIGIL | bool | Requiere revisión individual | Pendiente |
| SED_FARMACOS | texto | Requiere revisión individual | Pendiente |
| NEURO_DVE | bool | Requiere revisión individual | Pendiente |
| NEURO_DVE_ALTURA | decimal | Requiere revisión individual | Pendiente |
| NEURO_PIC_CAPTOR | bool | Requiere revisión individual | Pendiente |
| ANOTACIONES_JSON | json | Requiere revisión individual | Pendiente |
| PVE_SUP_SIN_EXT | bool | Requiere revisión individual | Pendiente |
| PVE_SUP_SIN_EXT_RAZ | texto | Requiere revisión individual | Pendiente |
