# ST-07 · Agenda y reservas sin doble asignación

Fecha: 2026-10-07, México. Estado: **En revisión**. Sprint 2. La aceptación de Sinhue será conjunta al cierre del sprint, según DEC-08.

## Entrega

- [x] Reservas públicas, internas, reprogramaciones, bloqueos y cobro usan el mismo bloqueo transaccional por sucursal. Dos intenciones distintas no pueden ocupar el mismo profesional y horario. Duración/precio se leen del catálogo; descansos, apertura/cierre y diez minutos de separación se respetan en servidor.
- [x] Fecha civil interpretada en la zona horaria de la sucursal; cambio de horario ambiguo o inexistente se rechaza. Disponibilidad de cualquier profesional es la unión de los elegibles y la asignación final ocurre bajo bloqueo.
- [x] Reintento público conserva su clave antes de enviar; respuesta interrumpida y recarga recuperan la misma cita. Cambiar el contenido de una clave existente se rechaza.
- [x] Consulta por folio no muestra nombre, teléfono, correo, notas ni token. Reprogramación/cancelación requiere enlace privado de 256 bits y caduca dos horas antes. El folio no permite cancelar. Se verifica negocio y estado; una cita cobrada no admite cambios públicos.
- [x] Límites de reservas persistentes por negocio/IP/hora y teléfono/día, compartidos entre procesos; se limpian ventanas caducadas. El límite de consultas en memoria es acotado. No equivale a protección distribuida de infraestructura ni CAPTCHA.
- [x] Ausencia después del horario, cancelación y atención tienen transiciones distintas. Reintentos no duplican visitas ni faltas. Una cita atendida se cobra una vez; pagarla no agrega otra visita.

## Pruebas

**20/20 escenarios ST-07 en SQLite y 20/20 en PostgreSQL**, con dos procesos API reales y datos desechables. **11/11 suites de regresión por motor**, incluidas caja, devoluciones, stock, sesiones, licencias y aislamiento. **13/13 comprobaciones de migración y recuperación**, ocho migraciones. API y web compilan; construcción final Vite correcta.

Incluyen ocho reintentos idénticos, intenciones públicas/internas simultáneas, asignación automática concurrente, bloqueo contra reserva, cita histórica larga, horario/descanso inválido sin efectos en CRM, datos autoritativos, protección del nombre existente, enlace vencido/negocio ajeno, reprogramación repetida, terminales, límites entre procesos, permisos del barbero y dos cobros de una cita.

Resultados: `docs/ST07_RESULTADOS_SQLITE.json`, `docs/ST07_RESULTADOS_POSTGRES.json`, `docs/scrum/POSTGRES_RESULTADOS_ACTUALES.json`. Las pruebas anteriores se adaptaron a fechas dentro del horizonte de 90 días, hora civil, ausencia realmente transcurrida y entrega externa no simulada como enviada.

## Recorrido de navegador

Móvil 390 × 844: cualquier profesional → corte de $280 → reserva. Se confirmó la transacción y se sustituyó solo su respuesta por un fallo local. Recarga y Recuperar reserva conservaron folio RES-4C28A8706D8416E2 y una cita; los datos de confirmación proceden del resultado recuperado. Fallo retirado.

El enlace privado movió la cita al 13 de octubre a las 12:00, hora de México. En escritorio, dueño la movió a las 13:00 desde agenda y la cobró en POS: ticket A-000002 por $280, cita COMPLETADA, una venta vinculada y una visita de CRM. La consulta pública ya no ofrece gestión. Otra reserva se canceló desde móvil y desapareció su formulario de cambios. Sin desbordamiento horizontal. Agenda muestra únicamente bloqueos del día y horas de sucursal; modalidad de reprogramación admite teclado y devuelve el foco.

- [Reserva recuperada](../screenshots/ST07_reserva_recuperada_movil.png)
- [Gestión privada](../screenshots/ST07_gestion_privada_movil.png)
- [Cancelación móvil](../screenshots/ST07_cancelacion_movil.png)
- [Agenda completada](../screenshots/ST07_agenda_completada.png)
- [Venta vinculada](../screenshots/ST07_venta_cita.png)

Datos sanitizados del recorrido: `docs/scrum/ST07_BROWSER_RESULTADOS.json`. No contiene tokens, claves ni nombres/teléfonos de clientes reales. Se corrigieron en el recorrido una selección inicial nula y la ruta del enlace privado; después se repitieron los flujos completos.

## Límites y siguiente paso

Migración aditiva `20261007_booking_integrity` comprobada en bases ficticias; **no aplicada a la base operativa**, conservada por hash. PostgreSQL temporal se detuvo. Demo local 5179 usa API 3101 y datos ficticios.

Avisos de reserva se registran internamente; ningún WhatsApp/correo/lista de espera se presenta como entregado sin proveedor. Entrega real conserva ST-08/ST-21; cola y carga conservan ST-12/ST-19. El enlace se conserva en la confirmación; no se enviaron mensajes externos. El paquete web mantiene advertencia de tamaño (~590 kB), pendiente ST-31. No hubo contratación, cobros externos, despliegue, push ni cambios fiscales.

Siguiente desarrollo: ST-08, alta comercial y correo transaccional verificable. Revisar ST-01 a ST-09 juntas al terminar Sprint 2; estas pruebas no certifican lanzamiento general.
