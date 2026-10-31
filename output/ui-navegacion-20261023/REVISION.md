# Navegación común, cita→ticket y vigencia de descuentos

23/oct/2026. UI-04 pasa a **En revisión**. UI-06 sigue En curso; UI-07 sigue En revisión. Ningún bloque declarado verificado completo.

## Entregado

- Menú con el mismo orden en Agenda, Cobrar y Caja. Los ajustes secundarios se agrupan en **Mi negocio**, en lugar de cambiar la composición del menú al entrar a Caja.
- Grupo abierto cuando contiene la ruta activa; título y selección de Seguridad identificables. Perfil, accesos, conexiones, licencia, importación e historial conservan sus rutas/permisos.
- Grupo accesible con teclado dentro del menú móvil; Tab/Shift+Tab permanecen dentro del diálogo, Escape vuelve al botón de apertura. Selección/foco de navegación con el acento naranja aprobado, sin extender ese cambio a todo el producto.
- Un permiso de descuento aprobado se vuelve a evaluar por reloj, al volver a la ventana y por cambio de visibilidad. Al vencer cambia a Autorización vencida, permite preparar otra solicitud y retira el permiso del botón Registrar cobro. Se limpian temporizador/listeners al cambiar contexto o desmontar.
- Ticket de cita sin productos adicionales ya no afirma que el catálogo está vacío: indica que el servicio está en el ticket y se puede continuar. Fuera de la reserva, los mensajes distinguen servicios/productos y permisos de gestión.

## Recorrido real aislado

Se reutilizó la base ficticia de UI-07/UI-08, sin resetearla ni repetir sus dos ventas ni sus dos entregas. Se agregó un cliente ficticio y una cita confirmada de $350 con Alex. El primer horario del fixture incluía minutos/segundos fuera del intervalo; se alineó a las14:30 antes de recorrer la atención. No se cambió la disponibilidad de la app para ocultar conflictos.

Barbero autenticado: Agenda → Atender a este cliente → detalle → Cobrar atención. El ticket conserva cliente, profesional, servicio, cantidad1 y precio reservado350. Seguir en el cobro cancela el intento de salida; Descartar ticket y volver regresa al detalle de la misma cita y fecha, con foco en el encabezado. Se repitió la preparación/retorno en móvil sin registrar venta. [Ticket final](cita-ticket-final.png), [móvil](cita-ticket-movil.png), [retorno](retorno-cita-movil.png).

Política del laboratorio reducida a un minuto, sin cambiar la política de la demo principal. Otra cuenta aprobó el descuento ficticio70. Se comprobó Autorizada y, tras el minuto real, **sin pulsar Comprobar ni cambiar de método**, se mostró Autorización vencida y el registro quedó deshabilitado. [Antes](permiso-vigente.png), [después](permiso-vencido.png). El servidor rechazó el mismo permiso vencido con409 DISCOUNT_APPROVAL_INVALID y no creó venta. [Integridad](integridad.json).

Al finalizar: cita EN_CURSO sin venta vinculada, precio350; las dos ventas y dos operaciones de entrega anteriores intactas. No repetir esas operaciones para recrear evidencia. Manifest `.tools/ui09-journey.json`; base referenciada por el manifest UI07. No publicar sus credenciales.

## Navegación en demo principal

Dueño existente, sin cambios de configuración: Caja → Mi negocio → Configuración; grupo activo abierto. Ctrl+K abrió la búsqueda, cerrar devolvió el foco. Menú móvil probado con Tab desde Mi negocio, bucle de foco y Escape. [Escritorio final](navegacion-escritorio-final.png), [Mi negocio móvil final](mi-negocio-movil-final.png). Capturas sin sufijo final son evidencia anterior al refinamiento naranja.

La demo termina en Caja con fondo1000, custodia1110/200 y siete avisos previos. No hubo nuevas ventas, entregas o cierres en ese volumen.

## Verificación

- `test_workspace_navigation.cjs`: cinco roles, navegación común, orden idéntico, grupo activo y título de Seguridad.
- `test_appointment_navigation.cjs`:7 casos de fecha de sucursal, ID y contexto inválido.
- `test_discount_expiry_clock.cjs`: temporizador del componente real, vencimiento, vigencia inválida, vuelta a visibilidad y limpieza.
- `test_checkout_recovery_states.cjs`, `qa_discount_recovery_helpers.cjs` (26) y `test_workspace_search_ui.cjs` (10) correctos.
- TypeScript web y build correctos. Advertencia previa de bundle~926KB permanece.
- Revisión React: no se añadieron dependencias, peticiones de pago ni hooks condicionales. Timer acotado a la aprobación/contexto y callbacks actuales; atributos de selección y foco conservados. Las reglas de vigencia/permisos del servidor siguen siendo la autoridad.

## Versión y pendientes

Build `.tools/ui-navigation-final-20261023`, JS `index-CKXAPFvO.js`, CSS `index-VlZswv4l.css`, API3103 comprobada antes de copiar al snapshot local conservando assets/muestras. Navegador confirma ese JS. Backend/volumen principal intactos. Vista de laboratorio5198/API3104/proxy3105 separada, detenida al finalizar.

Pendientes prioritarios: proteger un borrador al salir por el menú/cambiar sucursal; hoy la confirmación explícita está en Volver a la cita, pero no se agregó guardado general de borradores. Completar UI-03/componentes, resto de Agenda/fila y estados finales de devolución/comprobantes/cierre. No confundir este recorrido sin cobro con la regresión completa de cita→venta→caja, ya documentada en planes anteriores pero pendiente de conciliar con todo el rediseño. Sin impresión física, servicios reales ni despliegue externo.
