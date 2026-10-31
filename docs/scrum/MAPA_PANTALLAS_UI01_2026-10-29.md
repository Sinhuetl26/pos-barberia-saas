# Mapa completo de pantallas y tareas

Fecha de cierre: 29/oct/2026. Fuente: rutas montadas en `App.tsx`, navegación por rol y autorización real de API. Las capturas base y finales se conservan en `output/day-workspace-20261027`, `output/ui-50-20261029` y `output/ui-70-20261029`.

## Superficies públicas

- `/` y `/login`: venta de SYSTECH, acceso y alta comercial.
- `/b/:slug`: landing y reserva de cada barbería; servicio, profesional, horario, contacto, confirmación y recuperación.
- `/b/:slug/cita/:token`, `/b/:slug/cancelar/:token`, `/cita/token/:token`: gestión privada de una cita.
- `/cuenta/:action`: recuperación, verificación e invitación.
- `/privacidad` y `/terminos`: documentos legales.

Estados obligatorios: carga, error de red, sin disponibilidad, reserva incierta, enlace inválido/caducado, confirmación y privacidad. Ninguna vista pública expone nombre, teléfono, nota o token de otro cliente.

## Espacio de trabajo por rol

- **Propietario:** Hoy, Agenda, Cobrar, Clientes, Caja, Equipo, Inventario, Reportes, Mensajes, Accesos, Configuración, Conexiones, Plan, Historial, Importación y Seguridad.
- **Gerente:** Hoy, Agenda, Cobrar, Clientes, Caja, Equipo, Inventario, Reportes, Importación y Seguridad; solo sucursales asignadas.
- **Recepción/cobros:** Agenda, Cobrar, Clientes, Caja y Seguridad.
- **Barbero:** Mi agenda, Cobrar, Mi caja/comisiones y Seguridad; solo su perfil/sucursal.
- **Administrador de plataforma:** Negocios/licencias, Auditoría y Conexiones; espacio visualmente separado.

## Tareas y operaciones sensibles

- Agenda: localizar, crear, reprogramar, bloquear, atender, marcar ausencia, fila y abrir cobro.
- Cobrar: conservar cita/profesional/precio, descuento autorizado, propina, métodos, confirmación, recuperación, ticket y devolución permitida.
- Caja: abrir, contar, registrar movimiento, entregar/recibir custodia, cerrar, revisar diferencia y comprobante.
- Clientes: búsqueda, ficha, historial, membresía y reagendado sin duplicar identidad.
- Equipo: perfil público/privado, horario, tarifa, comisión, propina y liquidación trazable.
- Inventario: servicios, reventa e insumos; edición, conteo, receta, movimiento e historial de existencias.
- Reportes: periodo/sucursal/profesional, ventas, gastos, margen incompleto, rotación, cobertura y exportación del alcance visible.
- Accesos: invitación, rol, sucursales, desactivación, verificación, recuperación y cierre de sesiones.
- Importación: plantilla, archivo, vista previa, errores por fila, confirmación idempotente y recuperación.
- Historial: filtros, paginación, identidad, fecha, sucursal y detalle seguro.

## Estados transversales revisados

- Carga, error con reintento, vacío útil, éxito confirmado, resultado incierto y operación bloqueada.
- Diálogos con foco/Escape; navegación con borrador o cobro pendiente; cambio de sucursal protegido.
- Laptop, 390 px y 320 px en las superficies operativas acreditadas; tablas/calendario conservan alternativa legible.
- Licencia/capacidad, proveedor ausente, sandbox, configurado y entrega no confirmada son estados distintos.

## Fricciones que permanecen en el cierre

1. Fotografía persistente del catálogo necesita contrato de almacenamiento: UI-11 queda en revisión.
2. Login/alta y administración secundaria requieren una última comparación visual en navegador: UI-17/UI-18 quedan en revisión.
3. Bundle inicial cercano a 939 kB y auditoría transversal de zoom/teclado móvil: UI-19 queda en revisión.
4. Regresión visual integrada, guía final y demo comparativa: UI-20 permanece pendiente.

Este mapa no reemplaza pruebas: la autorización inventaría 184 rutas y falla cerrada por rol, tenant, sucursal y referencias ajenas.
