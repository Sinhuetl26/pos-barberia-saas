# ST-12 · Refinamiento para operación pequeña

Estado del refinamiento inicial: preparación técnica del 9/oct. Esa lectura no ejecutó workers ni pruebas de concurrencia. La historia pasó a **En curso** al asignar la implementación al backend; las pruebas y el cierre se registrarán por separado. No está validada.

## Hallazgos del código

- `apps/api/src/services/cron.service.ts` busca una auditoría reciente y luego inserta otra. Son operaciones separadas: la lectura permite inferir una carrera entre réplicas; no es evidencia de exclusión atómica. El catch continúa la tarea cuando falla la comprobación de base.
- El scheduler vive en HTTP. `stop()` cancela el intervalo pero no conserva el timeout inicial para cancelarlo. Una tarea confirmada necesita persistencia y un ejecutor cuyo ciclo de vida esté explícito.
- `account-security.service.ts` ya conserva acciones de correo, intentos y próxima ejecución, reclama mediante actualización condicional y usa claves de proveedor. Es un antecedente útil; no debe romperse ni sustituirse por una cola en memoria.
- El procesador de correo aún se arranca con intervalo dentro del módulo HTTP. Aceptación del proveedor y entrega real siguen siendo estados distintos.

## Subentregas propuestas

1. Persistencia y reclamación atómica: clave de deduplicación, negocio, tipo, estado, próxima ejecución, vencimiento de concesión y máximo de intentos; actualización condicionada por propietario/intento. Errores de base suspenden trabajo externo, no omiten coordinación.
2. Scheduler: materializa intenciones únicas por periodo/cita; arranque/parada observables; un reinicio no pierde trabajo ya confirmado. Definir comportamiento al caducar una tarea antes de volver a ejecutarla.
3. Ejecutor separado: comando y proceso controlados, señal de parada, timeout, reintentos acotados, tareas fallidas consultables y reejecución auditada con permiso. No incluir tokens o datos personales completos en logs.
4. Integración: conservar semántica e idempotencia del correo existente. Preparar licencia y recordatorios mediante proveedores controlados; canales reales conservan sus historias y aprobaciones.

## Evidencia requerida al implementar

- Dos ejecutores concurrentes y reclamación única en PostgreSQL y SQLite aislados.
- Interrupción antes/después de reclamar y durante llamada externa; respuesta perdida, repetición e idempotencia del proveedor.
- Expiración, límite de intentos, error persistente, recuperación y ausencia de envío al fallar coordinación.
- Reejecución autorizada, aislamiento entre negocios, estados honestos y regresión de cuentas/correo.
- Memoria y conexiones observadas; imagen/arranque del ejecutor se comprueban antes de desplegar.

## Presupuesto y límites

No seleccionar Redis, contratar un worker o afirmar que caben en el presupuesto por escribir este documento. ST-12 exige ejecutor separado: medir si el alojamiento permite operarlo con la propuesta pequeña o presupuestar un recurso adicional antes de contratar. El objetivo de 450 MXN/mes conserva condición de capacidad y costos comprobados.

Implementación asignada: persistencia/reclamación, ejecutor separado, control por proveedor y pruebas de reinicio. El pulido ST-43 y los materiales ST-44 tienen responsables distintos; la generación y compilación compartida esperan a que QA termine ST-43. Este documento no habilita entregas reales, cobros, cambios de base operativa ni venta general.
