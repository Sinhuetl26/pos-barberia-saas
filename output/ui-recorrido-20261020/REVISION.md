# Entrega 2 — Agenda, Cobrar y acceso a Caja

20 de octubre de 2026. Demo local ficticia, web 5197 / API 3103.

## Implementado

- Acceso propio «Caja y cierres» para dueño, gerente y cajero, reutilizando custodia, turnos e historial existentes. Equipo conserva sus perfiles y comisiones. La ruta antigua `/app/barberos?tab=cortes` sigue disponible.
- Detalle de cita más legible: nombre, profesional, fecha de la sucursal, sucursal e importe reservado. La acción secundaria se llama «Preparar cobro».
- Ticket de reserva con cliente, servicio y profesional visibles y regreso explícito a Agenda.
- Regresar requiere confirmar que se descarta el ticket sin cobrar; cancelar mantiene el ticket. Al confirmar abre el día local y el detalle de la cita original.
- Corregida una transición encontrada durante QA: desde el enlace antiguo de Caja, volver a Equipo ya restaura los perfiles.

## Evidencia

- TypeScript web sin errores y compilación Vite correcta. Build final `.tools/workspace-flow-20261020`, publicado solo en el snapshot local `.tools/product-ui-preview-verified-20261014`. JS final `index-DW5VUIHh.js`.
- 7 comprobaciones de navegación de cita: zona horaria, identificador codificado y rechazo de contexto inválido/otra sucursal.
- 5 comprobaciones de navegación por rol mediante renderizado real del menú. Esto comprueba visibilidad, no autorización del servidor.
- 5 pruebas existentes de cotización de agenda correctas. Total: 17 casos/comprobaciones diferentes; navegación y TypeScript se repitieron después del último ajuste.
- Navegador con dueño ficticio: cita del 20/oct a las 11:30, Alex, Corte clásico, $200; preparar ticket sin cambiar estado; cancelar regreso mantiene $200; confirmar descarta y vuelve al mismo identificador y fecha, reabriendo el detalle.
- Caja carga los saldos y los dos cierres históricos; no se recibió efectivo, abrió turno ni cerró caja. El enlace antiguo continúa operativo y volver a Equipo muestra los tres perfiles.
- Revisión visual a 1366×768 y 390×844; detalle, contexto del ticket y Caja sin desbordamiento horizontal de página a 385 px de contenido. La tabla histórica conserva desplazamiento interno.
- Siete capturas PNG en esta carpeta: detalle escritorio/móvil, ticket escritorio/móvil, Caja escritorio/móvil y confirmación móvil. Las capturas muestran datos ficticios.

## Límites y continuación

No se efectuó regresión financiera completa ni acceso autenticado con todos los roles. No se verificó impresión física, rendimiento con carga ni producción. El paquete JS mantiene la advertencia previa de tamaño. El contexto de cita en el cobro no se recupera tras recargar el navegador; esta entrega resuelve el regreso explícito durante la sesión.

Caja comparte implementación con Equipo y conserva su pestaña antigua por compatibilidad. Queda migrar su composición visual completa, mejorar identidad de custodios (actualmente se muestran correos), estados y flujo móvil del barbero. Aún hay acentos verdes en componentes antiguos, incluido el botón principal del detalle: la unificación visual no se declara terminada.

No hay nuevos cobros, reservas ni cierres en esta revisión. No se cambiaron precios, API, proveedores o datos reales. Los bloques UI-04/06/07/08 siguen en curso y no se cerraron historias funcionales automáticamente.
