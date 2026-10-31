# Mejoras de operación y reservas — 11 de octubre de 2026

Estado: implementadas y verificadas en la demo local ficticia Estudio Norte. Este reporte no cierra historias completas ni acredita preparación de producción.

## Cambios entregados

1. **Punto de venta:** contexto compacto de barbero y cliente, opciones secundarias plegables, artículos desplazables y total/cobro fuera del área desplazable. En celular hay una barra inferior para revisar el carrito y cobrar. Se conservaron las reglas financieras y de recuperación existentes.
2. **Agenda:** calendario por hora y profesional en escritorio; lista cronológica en celular. Las citas muestran estados comprensibles y abren un detalle con la siguiente acción principal. Canceladas y ausencias permanecen consultables en la lista. Los bloqueos aparecen en el calendario.
3. **Reservas públicas:** búsqueda explícita del primer horario disponible desde hoy, hasta 30 días o el límite de reserva configurado. Distingue falta de horario laboral, duración que no cabe, día terminado y agenda llena. Las búsquedas anteriores se descartan al cambiar la selección; un fallo interrumpe la búsqueda para no presentar como primero un horario sin verificar días anteriores.
4. **Contenido de servicios:** el dueño puede guardar descripciones desde Configuración → Página de reservas → Qué incluye cada servicio. Se muestran en la página pública. La API valida que los servicios pertenezcan a la barbería, limita el texto y conserva las restricciones por rol.
5. **Próxima visita:** después de una venta confirmada, el recibo permite abrir una cita con cliente, teléfono, servicio y barbero precargados. Sugiere una fecha a 28 días; el usuario debe revisar fecha y hora, y la disponibilidad se valida al confirmar. No copia fotos privadas.

## Evidencia funcional

- Compilaciones de API y web correctas.
- 7 pruebas de distribución de agenda, zonas horarias y búsqueda de disponibilidad.
- 18 pruebas de personalización, permisos, aislamiento y razones de disponibilidad.
- 17 pruebas de integridad del POS, concurrencia, idempotencia y rollback.
- 20 pruebas de reservas, bloqueos, privacidad y relación entre cita y venta.
- **62 comprobaciones automatizadas aprobadas.**
- Verificador de la demo comercial correcto después del recorrido: perfil público, agenda, reserva única, asignación, precio/duración, persistencia y foto privada.
- En navegador, la búsqueda encontró el 12 de octubre a las 09:00; la reserva existente de las 10:00 siguió ocupando sus horarios y márgenes.
- Una descripción ficticia guardada por el dueño apareció al recargar la página pública.
- Se registró una venta ficticia local de $200, folio A-000001, método registrado TRANSFERENCIA. No se ejecutó una transferencia ni se invocó un proveedor de pago. Su botón de próxima visita abrió el formulario con los datos esperados; se canceló sin crear otra cita.
- La reserva original del 12 de octubre a las 10:00 con Alex permaneció intacta. El carrito de la prueba visual quedó vacío.

## Capturas

- [Caja en escritorio](pos-escritorio.jpg)
- [Caja en celular](pos-movil.jpg)
- [Agenda en escritorio](agenda-escritorio.jpg)
- [Agenda en celular](agenda-movil.jpg)
- [Detalle de cita](detalle-cita.jpg)
- [Próxima visita precargada](proxima-visita-movil.jpg)
- [Búsqueda de próximo horario](reservas-proximo-horario.jpg)

Se revisaron capturas de 1280 × 720 y 390 × 844. La caja se ajustó después de detectar que su contexto inicial ocultaba parte del primer artículo.

## Límites y pendientes

- La búsqueda automática cubre 30 días; el selector manual mantiene el horizonte permitido por la configuración. El horario encontrado requiere selección y confirmación del cliente.
- La fecha sugerida de próxima visita puede caer en un día cerrado: es una propuesta editable, no una reserva automática.
- No se añadió arrastrar y soltar citas ni se modificaron pagos reales, precios, contratación de servicios o despliegue.
- La compilación web mantiene una advertencia por el tamaño del paquete principal (~710 kB antes de compresión). La división por pantallas queda pendiente de optimización.
- La validación se realizó en datos ficticios aislados; siguen pendientes las validaciones comerciales y de producción correspondientes.

## Referencia

Estas decisiones aplican la comparación previa con sistemas establecidos, priorizando rapidez de cobro, lectura de agenda y autonomía de reserva, conservando la identidad visual actual. Véase [comparativa](../benchmark-ui-20261011/COMPARATIVA.md).
