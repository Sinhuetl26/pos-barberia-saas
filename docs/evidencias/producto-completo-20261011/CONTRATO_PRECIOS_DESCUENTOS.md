# PC-10/11 — reglas opcionales y aprobación identificada

13/oct/2026. Backend integrado y build aprobado. Ninguna regla se creó en la demo por el implementador, no se cambiaron precios de catálogo ni licencias. QA independiente:9casos SQLite aprobados; PostgreSQL en preparación sobre nuevo clúster descartable autorizado, preservando el clúster anterior. Fuente QA_POLITICAS_PRECIOS_DESCUENTOS.md; no declarar doble motor o UI verificados todavía.

## Tarifa profesional

GET/POST `/inventario/tarifas`, dueño/gerente, sucursal obligatoria. Publicación: profesional, servicio, precio explícito en centavos o null para heredar, vigenteDesde/Fin, versionEsperada y UUID de intención. Fecha civil se interpreta en zona de sucursal; instantes con zona se conservan. Versionado por negocio/sucursal/profesional/servicio. Reemplazar intervalo abierto cierra su cobertura desde nueva vigencia, guardando auditoría; solapamiento finito requiere un intervalo no ambiguo. Catálogo y reservas anteriores no se reescriben.

GET `/productos/precios?sucursalId&barberoId&fechaHora?` devuelve catálogo propio sin insumos operativos, precio resuelto y resolucionPrecio{tarifaId,version,heredado}. Barbero consulta su perfil. Sin reglas hereda exactamente catálogo.

Disponibilidad pública por servicios devuelve en cada slot disponible profesional propuesto, precioEstimado y serviciosResumen con versión/tasa. Selección cualquiera usa primer disponible ordenID, igual que crear reserva. Una regla no heredada exige precioConfirmado correcto antes de reservar. Si importe cambió,409para revisar; ese campo confirma consentimiento, nunca impone precio de cliente.

POS sin cita usa tarifa vigente en el servidor, y una regla no heredada exige totalConfirmado del cálculo final. Reserva usa nombres/precios/impuestos/versiones congelados en serviciosJson. Reservas antiguas sin impuesto/version usan compatibilidad documentada; jamás reestiman precio histórico desde catálogo. Detalles de venta conservan resolución de precios aplicada.

## Política y aprobación

GET `/inventario/politica-descuentos?sucursalId`: null cuando no hay configuración. Ausente/desactivada conserva comportamiento anterior, incluido20%para barbero y permisos existentes para otros roles. POST administrativo requiere configuración explícita: activa, límitesPorRol de cuatro roles (0–100%, dos decimales), motivoObligatorio, vigenciaAprobacionMinutos elegida1–1440, versionEsperada e intención. No valores comerciales activados por defecto.

POST `/ventas/aprobaciones`: carrito validado por schema de venta, motivo e intención. Calcula precios/totales en servidor. Motivo se copia a carrito.motivoDescuento. Si descuento dentro de límite no inventa aprobación innecesaria.

GET con sucursalId muestra solicitudes propias para staff; administración ve alcance permitido. DTO contiene resumen pero oculta cartHash, carritoJson y resumenJson internos.

POST `/ventas/aprobaciones/:id/aprobar`: otra cuenta autenticada de dueño/gerente; accionAPROBAR u omitida, o RECHAZAR. Sin política activa, el aprobador elige explícitamente vigenciaMinutos; con política utiliza la vigencia configurada. No PIN compartido ni nombre/ownerId del payload como autoridad.

Hash enlaza negocio, sucursal, solicitante/rol, cliente, cita, profesional, método, líneas/precios/impuestos, motivo, descuento, propina, total y versión de política. Carrito/precios/cuenta/política cambiados obligan a renovar. Caducidad, aprobador inactivo o sin alcance vigente se rechazan. Verificación interna estrecha de otras cuentas evita devolver Usuario privado o secretos, mientras las lecturas ordinarias siguen ocultando otras identidades.

Venta usa aprobacionDescuentoId y el mismo motivoDescuento. Aprobación pasa aUSADA con ventaId dentro de la misma transacción; dos intenciones competidoras no la gastan dos veces. Respuesta perdida reintenta clave/payload de venta original; recuperación de venta ya confirmada sucede antes de caducidad de autorización. Auditoría conserva solicitud, aprobación/rechazo y aplicación.

## Límites y pendientes

Nuevos modelos TarifaProfesional/PoliticaDescuento/AprobacionDescuento y migración20261012_commercial_rules, con tablas vacías por defecto. Scope de negocio/sucursal y profesional registrado en defensa ORM. Literales `/productos/precios` y `/ventas/aprobaciones` no se interpretan como IDs de recursos.

El coordinador controla migración/reinicio de copia respaldada. El implementador no alteró bases vivas. UI de editor, POS, aprobación en cuenta distinta y reservas requiere evidencia propia; no atribuir esas revisiones al test API. Producción/cargos/conexiones externas permanecen fuera.
