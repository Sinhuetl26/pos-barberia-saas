# ST-01 a ST-04 · Revisión y mejoras de integración

Fecha: 2026-10-07, America/Mexico_City. Solicitud de Sinhue: mejorar estas historias con las nuevas skills/MCP antes de ST-06. Se preservaron las cuarenta historias y sus estados **En revisión**; no se abrió un sprint duplicado ni se inició ST-06.

## Qué se reforzó

| Historia | Problema observado | Cambio y comprobación |
| --- | --- | --- |
| ST-01 | Una variable de precio bastaba para habilitar el botón aunque faltaran clave, confirmaciones de pago o dominio válido. | Requisitos por plan y entorno compartidos entre catálogo, conexiones y checkout. La API rechaza configuración incompleta antes de contactar al proveedor; la pantalla explica por qué no puede abrir el pago. Precios, límites y versiones del catálogo se conservan. |
| ST-02 | El bloque de autenticación convertía errores de base de datos en “token inválido”. | Firma y estructura del JWT se comprueban por separado. Una falla Prisma devuelve 503 con reintento y mantiene el acceso cerrado; un token inválido sigue devolviendo 401. Sesión y ruta conservadas en navegador al simular una respuesta 503 y reintentar. |
| ST-03 | El último intento interrumpido quedaba SENDING indefinidamente; un trabajador anterior podía sobrescribir una reserva nueva. El mensaje podía cambiar bajo la misma clave si cambiaban dominio/nombre/remitente. | Reserva identificada por intento y vencimiento; respuesta antigua ignorada. Intento agotado pasa a FAILED. Petición exacta al proveedor cifrada antes de enviar, reutilizada con la misma clave. Reintento incierto fuera de la ventana de retención se detiene y requiere solicitar un enlace nuevo. |
| ST-04 | Faltaba un comando único de comprobación previa sin aplicar cambios. | `npm run db:check`: historial completo y comparación del esquema PostgreSQL con el modelo canónico. Rechaza SQLite, actualización pendiente, historial fallido/no disponible y diferencias de esquema. No aplica, borra ni repara migraciones. Arranque Docker preparado para comprobar después de migrar y antes de servir. |

El origen público de pagos y enlaces de cuenta utiliza ahora la misma validación: configuración explícita HTTPS en producción; HTTP solo en loopback para desarrollo. FRONTEND_URL es un alias compatible. Nunca se usa la URL suministrada por el navegador para decidir el destino. Una clave live en entorno de prueba se rechaza. El correo real exige remitente configurado en vez de utilizar silenciosamente el dominio ficticio predeterminado.

## Evidencia ejecutada

- Regresión completa **9/9 suites en SQLite y 9/9 en PostgreSQL 16**. Se conserva ST-05, incluyendo sus 17 comprobaciones.
- Catálogo/capacidad: **30 casos** por motor, tres nuevos sobre requisitos, separación de entornos y rechazo antes del proveedor. Límites concurrentes, reactivación, reducción y conservación comprobados en PostgreSQL; este pendiente técnico anterior de ST-01 está cubierto.
- Cuentas/seguridad: **19 escenarios** por motor, cinco nuevos sobre petición exacta, intento interrumpido, reserva más reciente, ventana de idempotencia y caída temporal de base.
- Permisos: **19 escenarios** por motor, inventario actual de **137 rutas**. Cuentas, roles, sucursales y enlaces de impresión mantienen aislamiento.
- Migración/recuperación PostgreSQL: **13 comprobaciones**, tres nuevas de solo lectura para base actual, diferencias de esquema y actualización histórica pendiente. Filas antes/después idénticas; sin reparación automática. Registro en `POSTGRES_RESULTADOS_ACTUALES.json`.
- API, TypeScript web y compilación web correctas. Advertencia del paquete de aproximadamente 575 kB conserva ST-31.
- Playwright, demo ficticia: tres botones de pago deshabilitados con su motivo; requisitos de conexión visibles y ventana completa en 390 × 844, sin desbordamiento horizontal. Respuesta 503 durante carga de sesión, token/ruta conservados y recuperación con Reintentar. Se retiró la interrupción simulada.

Capturas: `../screenshots/ST01_04_integraciones_movil.png` y `../screenshots/ST01_04_licencia_movil.png`. Resultados de esta revisión: `ST01_04_REINTEGRACION_RESULTADOS.json`.

## Uso de herramientas y límites

Context7 permitió contrastar idempotencia de Resend y comandos Prisma con documentación oficial. Resend exige petición idéntica por clave y conserva claves 24 horas; el código detiene conservadoramente reintentos inciertos cuando la acción supera esa antigüedad. El destinatario puede solicitar o recibir una invitación nueva. Se admiten los tokens cifrados antiguos: su primer envío los convierte en la petición cifrada estable sin nueva migración.

Referencias: [Resend: idempotencia](https://resend.com/docs/dashboard/emails/idempotency-keys), [Prisma: migrate status](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-status), [Prisma: migrate diff](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-diff). Se comprobó Prisma **5.22** instalado; no se adoptó el comportamiento diferente de una versión nueva por aparecer en documentación.

React Best Practices aplicado a efectos y diálogos; la ventana de conexiones usa un portal para evitar el recorte por el contenedor animado. Playwright comprobó comportamiento y capturas; Notion conserva el seguimiento de las actividades originales. No se instalaron herramientas ni servicios nuevos.

La prueba PostgreSQL detectó un plan preparado del cliente de ensayo que conservaba un SELECT * anterior a una actualización de columnas. Se renovó ese cliente antes de inspeccionar la base migrada; la repetición completa pasó. No se cambió el SQL histórico ni el motor de producción para ocultar el fallo.

La base SQLite operativa permanece intacta por hash. Nueva demo desechable preparada; PostgreSQL portátil de ensayo detenido al finalizar. No hubo cargos, mensajes externos, alta de cuentas, push, CI remoto o despliegue. El código del arranque Docker está preparado; construir y operar la imagen sigue pendiente en ST-13/ST-14. Configuración detectada no demuestra webhook recibido, entrega de correo, dominio verificado, fiscalidad ni liquidación bancaria: ST-08/ST-10/ST-16 conservan esas pruebas. Importación y baja completa de sucursal siguen en ST-26/ST-18.

Siguiente actividad de desarrollo: ST-06, caja, cancelaciones y devoluciones, después de esta revisión. El cierre comercial y revisión de Sinhue permanecen pendientes.
