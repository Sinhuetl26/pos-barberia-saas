# ST-02 · Matriz de autorización por ruta

Generada y contrastada con los handlers por la suite de autorización. Denegación por defecto para rutas autenticadas nuevas. Las capacidades de impresión verifican también usuario y asignación actuales.

| Método | Ruta | Roles | Alcance / excepción |
|---|---|---|---|
| GET | /api/jobs/status | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/jobs | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/jobs/:id/retry | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| PUT | /api/jobs/providers/:provider | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/mail/webhook/resend | PÚBLICO | Firma del proveedor / challenge; revisión separada |
| GET | /api/auth/security | DUENO, GERENTE, CAJERO, BARBERO, SUPER_ADMIN | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/tenant/security | DUENO, GERENTE, CAJERO, BARBERO, SUPER_ADMIN | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/onboarding/security | DUENO, GERENTE, CAJERO, BARBERO, SUPER_ADMIN | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/auth/security/password | DUENO, GERENTE, CAJERO, BARBERO, SUPER_ADMIN | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/tenant/security/password | DUENO, GERENTE, CAJERO, BARBERO, SUPER_ADMIN | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/onboarding/security/password | DUENO, GERENTE, CAJERO, BARBERO, SUPER_ADMIN | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/auth/security/logout-all | DUENO, GERENTE, CAJERO, BARBERO, SUPER_ADMIN | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/tenant/security/logout-all | DUENO, GERENTE, CAJERO, BARBERO, SUPER_ADMIN | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/onboarding/security/logout-all | DUENO, GERENTE, CAJERO, BARBERO, SUPER_ADMIN | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/auth/login | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| POST | /api/tenant/login | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| POST | /api/onboarding/login | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| POST | /api/auth/register | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| POST | /api/tenant/register | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| POST | /api/onboarding/register | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| GET | /api/auth/me | DUENO, GERENTE, CAJERO, BARBERO, SUPER_ADMIN | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/tenant/me | DUENO, GERENTE, CAJERO, BARBERO, SUPER_ADMIN | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/onboarding/me | DUENO, GERENTE, CAJERO, BARBERO, SUPER_ADMIN | Tenant y sucursales del usuario; barbero solo su perfil |
| PUT | /api/auth/tenant/settings | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| PUT | /api/tenant/tenant/settings | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| PUT | /api/onboarding/tenant/settings | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/auth/onboarding/templates | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| GET | /api/tenant/onboarding/templates | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| GET | /api/onboarding/onboarding/templates | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| POST | /api/auth/onboarding/setup | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| POST | /api/tenant/onboarding/setup | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| POST | /api/onboarding/onboarding/setup | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| GET | /api/admin/metrics | SUPER_ADMIN | Excepción de plataforma auditada |
| GET | /api/admin/tenants | SUPER_ADMIN | Excepción de plataforma auditada |
| PUT | /api/admin/tenants/:id/status | SUPER_ADMIN | Excepción de plataforma auditada |
| PUT | /api/admin/tenants/:id/plan | SUPER_ADMIN | Excepción de plataforma auditada |
| GET | /api/admin/auditorias | SUPER_ADMIN | Excepción de plataforma auditada |
| GET | /api/citas/fila | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/citas/fila | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/citas | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/citas/:id/referencia | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/citas | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| PUT | /api/citas/:id/status | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/citas/walk-in | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/citas/lista-espera | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| PUT | /api/citas/:id/reprogramar | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/public/barberia/:slug | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| GET | /api/public/disponibilidad | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| POST | /api/public/reservar | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| POST | /api/public/reserva-intencion | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| GET | /api/public/cita/:codigo | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| GET | /api/public/cita/:codigo/imprimir-carta | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| POST | /api/public/cita/token/:token/cancelar | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| POST | /api/public/cita/token/:token/reprogramar | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| POST | /api/public/cita/:codigo/cancelar | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| POST | /api/public/lista-espera | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| GET | /api/ventas/aprobaciones | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/ventas/aprobaciones | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/ventas/aprobaciones/:id/aprobar | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/ventas/intenciones/:clave | DUENO, GERENTE, CAJERO, BARBERO | Resultado de un cobro pendiente, restringido a la venta autorizada |
| POST | /api/ventas | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/ventas/:id/cancelar | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/ventas/:id/devolver | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/ventas | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/ventas/:id/ticket | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/ventas/:id/print-token | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/ventas/:id/ticket-html | DUENO, GERENTE, CAJERO, BARBERO | Bearer vivo o capacidad de impresión de 120 segundos |
| GET | /api/barberos | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/barberos | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| PUT | /api/barberos/:id | DUENO, GERENTE, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/barberos/:id/restaurar | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/comisiones | DUENO, GERENTE, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/comisiones/pagar | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/comisiones/liquidar-nomina | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/comisiones/nominas | DUENO, GERENTE, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/bloqueos/impacto | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/bloqueos/ausencias | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/bloqueos/horarios | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/bloqueos/horarios | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/bloqueos | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/bloqueos | DUENO, GERENTE, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| DELETE | /api/bloqueos/:id | DUENO, GERENTE, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/cortes-caja/:id/comprobante-html | DUENO, GERENTE, CAJERO | Bearer vivo o capacidad de impresión de 120 segundos |
| POST | /api/cortes-caja/:id/print-token | DUENO, GERENTE, CAJERO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/cortes-caja | DUENO, GERENTE, CAJERO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/cortes-caja/abrir | DUENO, GERENTE, CAJERO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/cortes-caja/previsualizar | DUENO, GERENTE, CAJERO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/cortes-caja/cerrar | DUENO, GERENTE, CAJERO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/cortes-caja/movimiento | DUENO, GERENTE, CAJERO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/cortes-caja/custodia | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/cortes-caja/entrega | DUENO, GERENTE, CAJERO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/productos/precios | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/inventario/tarifas | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/inventario/tarifas | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/inventario/politica-descuentos | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/inventario/politica-descuentos | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/inventario/conteos | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/inventario/conteos | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| PUT | /api/inventario/conteos/:id | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/inventario/conteos/:id/confirmar | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/inventario/recetas/:servicioId | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/inventario/recetas/:servicioId | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/inventario/insumos/conciliacion | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/inventario/consumos | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/inventario/consumos/:id/corregir | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/productos | DUENO, GERENTE, CAJERO, BARBERO | Catálogo común de lectura; editarlo requiere dueño |
| POST | /api/productos | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| PUT | /api/productos/:id | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/inventario/movimiento | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/inventario/kardex | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/notificaciones/meta-webhook | PÚBLICO | Firma del proveedor / challenge; revisión separada |
| GET | /api/notificaciones/webhook | PÚBLICO | Firma del proveedor / challenge; revisión separada |
| POST | /api/notificaciones/meta-webhook | PÚBLICO | Firma del proveedor / challenge; revisión separada |
| POST | /api/notificaciones/webhook | PÚBLICO | Firma del proveedor / challenge; revisión separada |
| GET | /api/notificaciones/ventas | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/notificaciones | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/notificaciones/enviar | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/notificaciones/simular-envio | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/notificaciones/opt-out | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/notificaciones/procesar-recordatorios | SUPER_ADMIN | Trabajo global auditado |
| GET | /api/reportes/inteligencia | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/reportes/gastos | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/reportes/gastos/salidas | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/reportes/gastos | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/reportes/gastos/:id/corregir | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/reportes/dashboard | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/reportes/resumen-semanal | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/reportes/exportar/ventas-csv | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/suscripcion/webhook | PÚBLICO | Firma del proveedor / challenge; revisión separada |
| GET | /api/suscripcion/catalogo | PÚBLICO | Datos mínimos / capacidades públicas; relaciones validadas |
| GET | /api/suscripcion | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/suscripcion/validar-cupon | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/suscripcion/crear-checkout-session | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/suscripcion/portal-cliente | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/suscripcion/cambiar-plan | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/suscripcion/ejecutar-dunning | SUPER_ADMIN | Trabajo global auditado |
| POST | /api/suscripcion/simular-pago | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/sucursales | DUENO, GERENTE, CAJERO, BARBERO, SUPER_ADMIN | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/sucursales | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/sucursales/:id/restaurar | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| PUT | /api/sucursales/:id | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/clientes | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/clientes/reactivacion | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/clientes/:id | DUENO, GERENTE, CAJERO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/clientes | DUENO, GERENTE, CAJERO | Tenant y sucursales del usuario; barbero solo su perfil |
| PUT | /api/clientes/:id | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/clientes/:id/membresia | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| DELETE | /api/clientes/:id | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/integraciones | DUENO, SUPER_ADMIN | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/integraciones/correo | DUENO, SUPER_ADMIN | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/operacion/auditoria | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/operacion/buscar | DUENO, GERENTE, CAJERO, BARBERO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/operacion/resumen | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/operacion/preparacion | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| PUT | /api/operacion/preparacion | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/usuarios | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/usuarios | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| PUT | /api/usuarios/:id/acceso | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/usuarios/:id/invitacion | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| DELETE | /api/usuarios/:id/invitacion | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/proveedores | DUENO, GERENTE | Directorio común de lectura |
| POST | /api/proveedores | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| PUT | /api/proveedores/:id | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| DELETE | /api/proveedores/:id | DUENO | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/ordenes-compra | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/ordenes-compra | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/ordenes-compra/:id/recibir | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| POST | /api/ordenes-compra/:id/cancelar | DUENO, GERENTE | Tenant y sucursales del usuario; barbero solo su perfil |
| GET | /api/health | PÚBLICO | Estado del servicio sin registros privados |
| POST | /api/auth/recovery/request | PÚBLICO | ST-03: límite persistente; token de propósito único, caducidad y consumo atómico |
| POST | /api/auth/verification/request | PÚBLICO | ST-03: límite persistente; token de propósito único, caducidad y consumo atómico |
| POST | /api/auth/recovery/complete | PÚBLICO | ST-03: límite persistente; token de propósito único, caducidad y consumo atómico |
| POST | /api/auth/verification/complete | PÚBLICO | ST-03: límite persistente; token de propósito único, caducidad y consumo atómico |
| POST | /api/auth/invitation/accept | PÚBLICO | ST-03: límite persistente; token de propósito único, caducidad y consumo atómico |
| POST | /api/tenant/recovery/request | PÚBLICO | ST-03: límite persistente; token de propósito único, caducidad y consumo atómico |
| POST | /api/tenant/verification/request | PÚBLICO | ST-03: límite persistente; token de propósito único, caducidad y consumo atómico |
| POST | /api/tenant/recovery/complete | PÚBLICO | ST-03: límite persistente; token de propósito único, caducidad y consumo atómico |
| POST | /api/tenant/verification/complete | PÚBLICO | ST-03: límite persistente; token de propósito único, caducidad y consumo atómico |
| POST | /api/tenant/invitation/accept | PÚBLICO | ST-03: límite persistente; token de propósito único, caducidad y consumo atómico |
| POST | /api/onboarding/recovery/request | PÚBLICO | ST-03: límite persistente; token de propósito único, caducidad y consumo atómico |
| POST | /api/onboarding/verification/request | PÚBLICO | ST-03: límite persistente; token de propósito único, caducidad y consumo atómico |
| POST | /api/onboarding/recovery/complete | PÚBLICO | ST-03: límite persistente; token de propósito único, caducidad y consumo atómico |
| POST | /api/onboarding/verification/complete | PÚBLICO | ST-03: límite persistente; token de propósito único, caducidad y consumo atómico |
| POST | /api/onboarding/invitation/accept | PÚBLICO | ST-03: límite persistente; token de propósito único, caducidad y consumo atómico |
