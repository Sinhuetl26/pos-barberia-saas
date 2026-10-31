# Reporte del equipo · Sprint 3 · 10 de octubre de 2026

**ST-43 y ST-12 validadas técnicamente. Sprint 3 sigue abierto por ST-44, conversaciones reales con compradores.** Trabajo local, sin contratar servicios, realizar cargos ni enviar mensajes comerciales. Fecha de cierre en México: 10/oct; los registros UTC corresponden al 11/oct.

## Entrega demostrable

- **ST-43:** Inicio prioriza ventas reales, caja, próximas citas y acciones. Cobro móvil muestra resumen sin altura vacía excesiva; caja y comisiones tienen jerarquía y confirmaciones con teclado. Reservas usa identidad/configuración reales, foco por paso y errores accionables; corregida fecha fuera del horizonte y actualización de horarios al regresar. Se conservan ST-31 y pruebas físicas como alcance posterior.
- **ST-12:** tareas persistidas y ejecutor separado de HTTP, reclamación atómica, reintentos limitados, expiración, deduplicación y estados de fallo visibles. Panel para dueño con confirmación/cancelación, pausa y reanudación auditadas. El cliente no puede pausar la revisión de su licencia. Estado incierto o vencido no ofrece reenvío. Una revisión terminada no significa entrega de mensaje ni cobro.

## Pruebas y conciliación

| Suite de esta entrega | SQLite | PostgreSQL |
| --- | --- | --- |
| Cola, procesos separados, lease, reinicio y respuesta perdida | 14/14 | 14/14 |
| Cuentas y sesiones | 19/19 | 19/19 |
| Correo/alta con proveedores controlados | 17/17 | 17/17 |
| Permisos | 19/19 | 19/19 |
| Integraciones/dunning controlados | 25/25 | 25/25 |

Los resultados conservan su fecha, ID de ejecución y salvedades de orden de cambios en el índice ST-12. La versión es el árbol de trabajo con cambios sin commit, no una publicación certificada. Compilación API y web/TypeScript aprobadas; build web final en sesión4385, salida0. El bundle613kB (gzip160kB) deja la revisión de rendimiento en ST-31.

**ST-43, 24/24 lecturas conciliadas:** una reserva completada y una venta $200; recibido $300/cambio $100; entrega $200; una comisión $80 pendiente. Fondo $500 más entrega $200 = contado $700, diferencia $0 y custodia $0. El recorrido monetario se realizó antes de la pausa; al retomar se hicieron lecturas, sin repetir venta/reserva/corte.

**ST-12, 13/13 comprobaciones de recorrido:** seis IDs estables; Cancelar no modifica; una confirmación genera una auditoría de reintento; pausas persisten; otro negocio no hereda tareas; gerente no accede; restricciones HTTP de barbero comprobadas por backend. Detener worker conserva tareas y muestra falta de actividad. Caída real de API muestra error, y Reintentar consulta recupera estado tras reiniciar la misma base. Cero ventas y cero acciones de correo a entregar en el fixture ST-12. Estados iniciales sintéticos no acreditan entrega comercial.

## Demo, datos y recuperación

Demo principal: http://127.0.0.1:5179. API3101 restaurada con SDK aislado y proveedor real desactivado; ambas lecturas de jobs responden correctamente. Sin worker de negocio en esta demo, el panel explica falta de actividad.

Se agregaron tres tablas/cuatro índices al fixture desechable con API apagada y backup verificado. Las 38 tablas previas conservaron todas sus filas. Login posterior añadió sólo una auditoría INICIO_SESION; una huella completa del negocio cambia legítimamente por esa fila y no se afirma igualdad posterior absoluta. dev.db y manifiesto permanecen intactos. Backup restaurado en copia separada, hash coincidente e integridad SQLite correcta; no se reemplazó la demo viva.

## Alcance comercial y recursos

Worker PostgreSQL real observado con una conexión y RSS75–77MB local; máximo de workers de prueba aproximadamente82MB. No se añadió Redis. Costo de hosting/capacidad comercial pendiente de cotización y medición: 450MXN/mes permanece hipótesis, no gasto acreditado. La entrega no certifica correo real/DNS, WhatsApp por negocio, banca, SLA, dispositivos físicos ni aceptación del mercado.

Backlog: **48 historias, 8 Validadas, 3 Bloqueadas y 37 Pendientes**. ST-01 conserva decisión fiscal, ST-08 entrega real de correo y ST-09 hardware; no se cerraron por la simulación. ST-44 tiene guion, ficha de alcance y CSV preparados, con **cero conversaciones reales registradas**. Requiere al menos tres y decidir continuar/ajustar/detener; objetivos de diez conversaciones/cinco demos no son resultados.

## Siguiente bloque y retrospectiva

1. Usar la demo y guion ST-44 para conversaciones reales con compradores; contacto por Sinhue o instrucción explícita. El equipo mantiene revisión técnica delegada, sin checklist obligatorio de funcionalidades para Sinhue.
2. Refinar ST-10 en sandbox con la política fiscal pendiente explícita; no habilitar cobros live. ST-13 integra API/worker supervisados, despliegue reproducible y capacidad/costo, preparando antes de contratar.
3. Mantener pruebas externas y actas antes de piloto pagado/venta general. Accesibilidad global, fotos subidas reales y dispositivo físico siguen en ST-31/ST-09.

Las pruebas encontraron carreras PostgreSQL, desfase UTC, licencia pausable y error de fecha sin acción útil. Se corrigieron antes de aceptar. Conservar fixtures separados, dueño exclusivo del navegador, SDKs aislados y evidencia por etapa; distinguir siempre una aceptación controlada de una entrega real. No sumar nuevas funcionalidades premium por cantidad de ventas sin evidencia de necesidad/costo.

## Evidencia y archivos afectados

Diseño/QA: [ST-43](<C:/Users/Sinhue/Desktop/POS Barberia/docs/scrum/ST43_QA.md>), [ST-12 visible](<C:/Users/Sinhue/Desktop/POS Barberia/docs/scrum/ST12_QA_VISIBLE.md>), [índice de ejecuciones](<C:/Users/Sinhue/Desktop/POS Barberia/docs/ST12_INDICE_EVIDENCIAS_2026-10-10.json>), [arquitectura y recuperación](<C:/Users/Sinhue/Desktop/POS Barberia/docs/scrum/ST12_IMPLEMENTACION_2026-10-09.md>) y [guion ST-44](<C:/Users/Sinhue/Desktop/POS Barberia/docs/comercial/ST44_DEMO_Y_ENTREVISTAS.md>).

ST-43 afecta vistas Inicio/POS/Reserva/Barberos, CashCustody, estilos y componentes OperationState/OperationDialog. ST-12 afecta servicios de cola/worker/scheduler/handlers, cuenta/correo/dunning, rutas jobs/index, esquemas/migración y scripts de prueba; frontend DurableJobsPanel, tipos/api e IntegracionesView. Sin aceptación de despliegue live ni cambio de precio comercial.

[Reporte en Notion](https://app.notion.com/p/3f62035ac0d08147a524c5c7fb8d9d5e). Estados y sprints cotejados: 48/48 historias coinciden con el respaldo local.
