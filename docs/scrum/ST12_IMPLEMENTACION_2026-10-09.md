# ST-12 — Cola durable y ejecutor separado

Entrega técnica del backend verificada el **10/oct/2026, hora de México**. QA ST-43 liberó la generación: se generaron exclusivamente los SDKs aislados, se compiló la API y se ejecutaron pruebas SQLite y PostgreSQL. La revisión del panel y el cierre de la historia los coordina el agente principal. Este documento no certifica prueba real de proveedores ni modifica el estado de la historia.

## Arquitectura y garantías

Las tareas residen en `DurableJob`, con clave única por negocio, tipo, referencias opacas, vencimiento, estado, intentos, próxima ejecución y concesión temporal. No se guardan cuerpos de mensajes, teléfonos, credenciales ni certificados en la cola. `JobProviderControl` serializa reclamaciones y pausas por negocio/proveedor; sólo una tarea por esa combinación puede estar ejecutándose. El máximo de intentos configurado es 1–8, por defecto cuatro. La reclamación y los cambios son condicionales dentro de transacción; una base no disponible impide llamar al proveedor.

Renovar o terminar requiere el mismo token de concesión, una concesión todavía vigente y tarea no vencida. Un ejecutor antiguo no puede sobrescribir al nuevo propietario. El vencimiento no borra la tarea: pasa a EXPIRED. Reintentos usan la misma identidad de operación. Un adaptador externo debe garantizar petición idéntica y deduplicación por clave dentro de todo el plazo admitido; tener sólo un candado no prueba una entrega única ante respuesta perdida.

Adaptadores sin garantía de repetición pasan a UNCERTAIN ante timeout/error; no se reenvían automáticamente ni admiten reejecución como entrega nueva. El adaptador controlado de pruebas demuestra aceptación con respuesta perdida y deduplicación real en un servidor separado. Su garantía no se atribuye a Meta ni a otro proveedor real.

`MAIL_OUTBOX` mantiene la bandeja existente de cuentas, su cifrado, consumo condicional, límites y clave del proveedor por acción. Crear acción de cuenta confirma también la tarea en la misma transacción. El scheduler reconcilia acciones debidas y reintentos tras reiniciar; no crea filas MAIL cada treinta segundos sin trabajo. El éxito de una tarea significa que se revisó la bandeja, no que llegó correo al buzón: los estados ACCEPTED/NOT_CONFIGURED/FAILED/DELIVERED siguen en AuthAction.

`DUNNING` reutiliza los importes y reglas existentes; recibe tenantId explícito y sólo cambia un estado esperado mediante actualización condicional dentro de transacción. Estado, gracia, notificación interna y auditoría se aplican una vez aunque vuelva un ejecutor antiguo. No realiza un cobro ni contacto bancario.

Una licencia todavía debida se materializa por transición y ventana UTC diaria. Una intención que venció durante una caída no bloquea la revisión del día de recuperación; las ventanas solapadas siguen protegidas por el cambio condicional del estado. Esto no reactiva recordatorios caducados. El scheduler limpia cifrado y estado de acciones de cuenta vencidas aun si eran la última acción del negocio, sin enviar mensajes. El contador pendiente excluye vencidas. La supresión de correo se consulta por el destinatario inmutable del envío persistido, incluso si después cambió el correo de la cuenta.

Recordatorios se materializan por cita/tipo/hora de referencia. Si cambian hora o estado, se cancelan. El conector global de WhatsApp actual no acredita aislamiento ni repetición segura: el ejecutor predeterminado marca NOT_CONFIGURED y no contacta Meta. Conectar entrega real por negocio conserva ST-21.

El scheduler pagina mediante cursor de 200 registros; no excluye silenciosamente trabajo posterior. Materializa únicamente acciones de correo, transiciones de licencia debidas y citas en las ventanas de 24h/2h. Repetir materialización en dos procesos conserva una intención única. La retención predeterminada de 14 días elimina sólo éxitos/cancelaciones/expiradas cuyo horizonte ya terminó. Fallidas, inciertas y auditoría se conservan. La aplicación debe revisar su volumen antes de fijar una retención de auditoría; no se elimina para ocultar fallos.

## Arranque y parada

Para pruebas se generó un cliente SQLite separado en `.tools/prisma-sqlite/client`; el generador y el preload restringen rutas exactas y modo de pruebas aislado. PostgreSQL usa `.tools/prisma-postgres/client`. Ninguno sustituye el cliente Prisma ni el motor de la demo viva. No se ejecutaron switch_db ni generación default ni migración de dev.db.

Después de construir la versión y comprobar la migración aditiva sobre una copia aislada, iniciar HTTP y el ejecutor como procesos separados supervisados:

```text
npm run start --workspace=@systech/api
npm run worker --workspace=@systech/api
```

HTTP no inicia intervalos de correo ni cron. Una recuperación confirmada permanece pendiente hasta disponer de ejecutor. No aplicar esta migración a la BD operativa como parte de pruebas ni reiniciar la demo 3101/5179.

Configuración del ejecutor: JOB_POLL_MS (1000), JOB_SCHEDULE_MS (30000), JOB_LEASE_MS (60000), JOB_TIMEOUT_MS (30000), JOB_RETENTION_DAYS (14) y JOB_SCHEDULER_ENABLED=false para ejecutar sólo trabajo ya confirmado. Los rangos se validan; timeout debe quedar por debajo de la concesión. La parada SIGTERM/SIGINT termina la iteración activa y deja trabajo persistido para el siguiente proceso. Un timeout es recuperación incierta, no prueba de que el proveedor haya cancelado el efecto.

En producción el URL PostgreSQL debe fijar `connection_limit=1` o `connection_limit=2`; el ejecutor rechaza un pool sin límite explícito de hasta dos conexiones. Cada réplica adicional añade su propio proceso y pool. Nunca poner claves o URL de conexión completas en evidencia o logs.

GET `/api/jobs/status` indica si existe heartbeat reciente (dos minutos), acciones pendientes y pausas del negocio. Es una comprobación de vida reciente, no SLA ni prueba de entrega. GET `/api/jobs` muestra las últimas cien tareas y sus estados sin datos sensibles; POST `/:id/retry` y PUT `/providers/:provider` requieren dueño, verifican negocio y auditan. Pausar evita reclamaciones nuevas; una llamada ya reclamada puede terminar. UNCERTAIN o EXPIRED no admite reenvío por esa ruta. La licencia pertenece a la plataforma: el dueño cliente no puede pausarla; la API devuelve 403 y audita el intento. La reclamación ignora cualquier pausa LICENSE heredada. El estado expone controlAllowed=false para LICENSE.

## Evidencia preparada

`scripts/test_durable_jobs.js` usa BD desechable y procesos Node separados. Incluye reclamación concurrente, clave por negocio, respuesta perdida del proveedor, muerte tras claim, propietario antiguo, timeout sin idempotencia, agotamiento, expiración, error de coordinación, pausas, permisos y auditoría, retención, cero trabajo periódico ocioso, dunning de un negocio y proceso lento, paginación sobre 201 acciones, reinicio HTTP con recuperación confirmada y el comando real del ejecutor con readiness. No se envían mensajes ni usan credenciales de proveedor.

Resultados ejecutados: **14/14 escenarios SQLite y 14/14 PostgreSQL**, con evidencias en `docs/ST12_RESULTADOS_SQLITE.json` y `docs/ST12_RESULTADOS_POSTGRES.json`. Ambos prueban procesos separados, respuesta perdida, propietario vencido, agotamiento, estado incierto, pausas aisladas, bloqueo de pausa LICENSE, caída superior a 24h, limpieza de acciones caducadas, supresión del destinatario inmutable, 201 acciones paginadas y reinicio HTTP con ejecutor real.

Regresiones de cuentas: **19/19 en cada motor**. Regresión de alta/correo: **17/17 en cada motor**, con dobles de proveedor y callbacks firmados de prueba. Autorización: **19/19 en cada motor**; su pase PostgreSQL final inventarió 151 rutas, incluyendo las cuatro de jobs. Integraciones/dunning: **25/25 en cada motor**. Estos resultados no acreditan mensajes reales ni dominio propio verificado.

Índice factual: `docs/ST12_INDICE_EVIDENCIAS_2026-10-10.json`; resultados de suites antiguas observados en esta sesión: `docs/ST12_REGRESIONES_SESION_2026-10-10.json`. Las suites de cuentas/autorización/fase2 no generan UUID propio: el índice identifica su ejecución mediante ID de herramienta. Los pases SQLite de cuentas/correo precedieron al refinamiento UTC del INSERT, que la prueba final SQLite14 confirmó; sus servicios no cambiaron después. El inventario final de rutas nuevo lo verificó PostgreSQL. No se presenta una prueba parcial antigua como release exacto ni se usa la fecha fija histórica del archivo ST08 como fecha de esta ejecución.

La concurrencia PostgreSQL detectó y corrigió una carrera en upsert: confirmación de control y tarea usa INSERT parametrizado ON CONFLICT, conservando la transacción de cuenta. Se corrigió además la conversión de Date a timestamp: en PostgreSQL se inserta texto UTC con cast explícito, probado contra servidor America/Mexico_City; una zona del servidor distinta no desplaza vencimiento seis horas. No se cambian importes ni reglas monetarias.

Preview de QA separado: `scripts/test_durable_jobs_preview.js`, API 3112, base propia `.test-db-*` y ejecutor independiente sin proveedores reales. Sus estados sintéticos sólo permiten revisar controles y mensajes; una fila ACCEPTED ficticia no acredita aceptación real. El negocio original y dev.db se compararon mediante hash al preparar el fixture. Los puertos de demo 3101/5179 no fueron detenidos por este agente.

Se preparó `scripts/test_durable_jobs_upgrade_demo.js` para revisión del coordinador: exige identidad exacta del fixture original, API 3101 apagada, copia verificada y sólo siete CREATE de tres tablas/cuatro índices dentro de una transacción. Comprueba que todas las filas originales, el manifiesto y dev.db permanecen intactos. **Este agente no ejecutó ese upgrade**; no es migración de producción.

## Compatibilidad y recuperación de la demo, coordinación 10/oct

El coordinador ejecutó el helper revisado con la API 3101 detenida. Se agregaron sólo tres tablas y cuatro índices a la base ficticia existente; las 38 tablas anteriores conservaron exactamente sus filas. Se restauró la API usando el SDK SQLite aislado y se comprobaron health, login normal y ambas lecturas de jobs con respuesta correcta. La demo 5179 permanece activa, sin worker de negocio ni proveedores reales.

La prueba de login creó una fila normal INICIO_SESION en AuditoriaLog. Por ello, la huella completa anterior del negocio dejó de ser idéntica después del login; la comparación independiente contra el backup verificó que esa es la única diferencia en las tablas originales: ninguna fila anterior modificada/eliminada. Se conserva la distinción entre igualdad al aplicar el upgrade y auditoría posterior. La conciliación financiera volvió a pasar 24/24; dev.db y manifiesto no cambiaron.

Se restauró el backup en otra copia desechable, con huella coincidente, integrity_check=ok, las 38 tablas anteriores y ninguna tabla ST12. No se reemplazó la demo viva. Evidencia: `evidencia/st12-20261010/demo-compatibility.json` y `restore-verification.json`.

Rollback local: detener API y worker que usen la base; conservar una copia del estado actual y restaurar el backup verificado con los procesos apagados. Si ya existen tareas nuevas, preservar/reconciliar esas intenciones antes de revertir: restaurar un backup anterior puede perderlas. Esto no es una migración/restore de producción. El despliegue supervisado y sus procedimientos quedan en ST-13/ST-14.

## Presupuesto de 450 MXN/mes

No se añadió Redis ni proveedor. Reusar PostgreSQL evita una nueva dependencia, pero el proceso separado consume memoria, CPU, conexiones y supervisión. RSS máximo observado de procesos de prueba aproximadamente **81.9 MB**. Una medición adicional del ejecutor real PostgreSQL registró **75,210,752 bytes al iniciar, 77,115,392 al detener**, con pool configurado en una conexión y **una conexión observada en pg_stat_activity** para el backend del ejecutor. Evidencia: `docs/ST12_RECURSOS_LOCALES.json`. Es una medición local sin carga comercial, no un certificado de capacidad ni costo. Cada réplica incrementa su propio pool y proceso.

Costo incremental comercial no determinado: sólo sería cero si el alojamiento elegido permite un segundo proceso dentro de su recurso contratado y la carga medida cabe allí. Eso aún no se verificó. El objetivo de 450 MXN/mes no queda acreditado por esta arquitectura ni por una medición local; requiere presupuesto real de plataforma y prueba de capacidad antes de contratar. Fallidas/inciertas retenidas y volumen de citas/correos afectan almacenamiento y deben medirse.
