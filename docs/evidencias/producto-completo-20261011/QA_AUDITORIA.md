# QA independiente PC-20 — auditoría legible

13 de octubre de2026. SQLite6/6PASS yPostgreSQL6/6PASS sobre endpoint integrado. Segundo motor probado mediante clúster nuevo autorizado; no se infiere aprobación desde SQLite.

`scripts/qa_operation_audit.cjs` crea fixture propio con eventos, secretos marcados ficticios y fechas limítrofes. No inserta auditorías en la demo ni usa claves reales. No controla navegador.

## Escenarios

1. Solo DUENO accede: anónimo401, gerente/barbero/cajero403. no-store y tenant ajeno excluido.
2. Fecha civil13oct/Mexico inicia06:00UTC13oct y termina06:00UTC14oct; primer y último milisegundo incluidos, días adyacentes excluidos.
3. DTO allowlist es legible: referencia, motivo y saldos; no expone detalles JSON, claves/password/foto ni texto legacy crudo. Registros sin branch permanecen branchIdnull y solo aparecen en Todas las sucursales.
4. Cursor de otro negocio/filtro distinto, fecha inválida, zona inválida y acción desconocida rechazados.
5. Paginación por50 eventos escaneados atraviesa páginas con otra sucursal, recuperando cada evento autorizado una sola vez, incluso páginas escasas.
6. `toString`, `__proto__`, `constructor` no evaden allowlist de acciones: root corrigió validación con hasOwnProperty y prueba finalPASS.

**6/6PASS SQLite y6/6PASS PostgreSQL:12comprobaciones independientes.** La lectura no atribuye por inferencia una sucursal a registros legacy/refund que no la guardaron. Para eventos futuros sin branch se recomendó completar origen en escritura; este endpoint conserva esa incertidumbre explícita.

## PostgreSQL

Clúster anterior no arranca y conserva lock viejo. Root autorizó explícitamente crear otro en carpeta `.tools/postgres-qa-20261013-*` y puerto55413, usando binarios existentes; `scripts/qa_isolated_postgres.cjs` inicia solo ese clúster, genera cliente separado, ejecuta QA y detiene exclusivamente el nuevo proceso. No elimina PID viejo, no resetea datos ni detiene servidores previos. Resultados pendientes hasta terminar ejecución.

Ejecución completada:6/6PGPASS yclúster nuevo detenido correctamente por helper. Primer intento nuevo sufrió bloqueo de pipes heredados de Windows, corregido usando stdio ignore al arrancar; ese primer clúster propio también se detuvo explícitamente sin tocar servidores previos. Fixtures temporales se limpiaron. Los archivos de los clústeres de QA quedan ignorados para diagnóstico, sin contraseña en run.json.

## Límites

Sin recorrido visual/teclado: controles de fecha/filtros/seguir paginación deben verificarse desde UI. Los snippets rawSQL de búsqueda fueron revisados por separado en QA_BUSQUEDA. Este bloque no certifica procesos de producción ni auditoría legal.
