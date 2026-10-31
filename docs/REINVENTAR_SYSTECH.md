# SYSTECH Studio: dirección de producto y salida comercial

Fecha: 4 de octubre de 2026. Mercado acordado: México, barberías independientes y cadenas. Este documento distingue cambios implementados, decisiones propuestas y requisitos que todavía impiden declarar el sistema listo para venta general.

## La propuesta

Vender tranquilidad operativa y crecimiento medible: cada cita atendida, cada peso conciliado y cada cliente con un motivo para regresar. El POS es el centro de la operación; la agenda y la relación con los clientes construyen recurrencia.

Una misma plataforma, con dos experiencias:

- **Barbería independiente:** configurar servicios y comisiones con ayuda, cobrar con pocos pasos, reservar desde Instagram, cerrar caja y saber qué hacer mañana.
- **Cadena:** comparar sucursales, supervisar excepciones, controlar permisos por ubicación, unificar catálogo y campañas, y medir ingresos y margen por unidad.

El diseño debe ser reconocible y tranquilo: verde profundo, tonos cálidos, acentos discretos, tipografía legible, acciones claras y densidad apropiada para trabajar durante todo un turno. La calidad también depende de evitar números inventados, botones sin efecto y mensajes de éxito antes de una confirmación real.

## Implementado en esta revisión

1. Navegación lateral por rol y selector de sucursal disponible también en pantallas pequeñas. Inicio con ventas netas de propinas, ticket promedio, citas, equipo y cajas abiertas.
2. Operación del día según la zona horaria de la sucursal. Exclusión de ventas canceladas. Consultas nuevas limitadas al tenant autenticado y validación de pertenencia de la sucursal.
3. Oportunidades con datos reales: citas pendientes, productos en stock mínimo y clientes con última visita hace más de 45 días. Son señales para actuar; no ejecutan campañas automáticamente.
4. Centro de conexiones que distingue configuración pendiente, preparación, configuración presente y desarrollo pendiente. No publica secretos ni afirma que una clave configurada pruebe una entrega.
5. Checkout de licencia exclusivo del dueño; retorno a una URL confiable del servidor. Ausencia de Stripe produce un error explícito, nunca un enlace de pago inventado.
6. Pantalla de licencia sin campos locales de tarjeta, sin facturas ficticias ni descarga simulada. Regreso de Stripe indica confirmación pendiente hasta que llegue el webhook.
7. Registro del evento, cambios de suscripción y auditoría en una transacción. Un error revierte el procesamiento y permite reintento. Eventos de factura que llegan antes de la asociación de la suscripción se reintentan.
8. Verificación de firmas fuera del modo explícito de pruebas. Restricción operativa de licencias canceladas. Recuperación del pago elimina una fecha de suspensión anterior.
9. Correo sin proveedor no devuelve éxito en producción. Notificaciones de riesgo de pago pendientes en vez de entregas ficticias.
10. Pruebas ejecutadas contra bases desechables y servidor propio; no se reutiliza la API de trabajo. Exclusión de secretos y bases locales del contexto de Docker. El arranque deja de usar `db push --accept-data-loss` como rescate de una migración fallida.
11. Página comercial sin selector anual que cobraba mensual. Retiro de la afirmación de reducción de ausencias del 80%. La calculadora sigue siendo un escenario ilustrativo, no evidencia de resultados.

## Qué ya existe y qué necesita un conector

| Capacidad | Situación real | Siguiente requisito |
| --- | --- | --- |
| Stripe para las licencias de SYSTECH | Clave de sandbox conectada; Checkout pagado con tarjeta ficticia y activación automática verificados; firmas y duplicados comprobados | Endpoint HTTPS en producción, ciclo de impagos/cancelaciones y configuración del portal |
| WhatsApp manual | Enlaces con mensaje preparado | Operador envía el mensaje y verifica el resultado |
| WhatsApp automático por barbería | Servicio con token/número global; insuficiente para vender conexión autónoma por comercio | Credenciales aisladas, Embedded Signup, plantillas y webhooks firmados |
| Recibos por correo | Servicio Resend implementado; sin prueba externa | Cuenta, dominio verificado, clave y prueba de recibo |
| CFDI por barbería | Servicio preliminar con clave global | Organización por RFC, certificados, persistencia fiscal e idempotencia |
| Cobro con tarjeta en mostrador | El POS registra el método; no verifica la terminal | Proveedor de comercio, terminal y conciliación |
| Anticipos de reservas | Desarrollo pendiente | Comercio por tenant, depósito, reembolso y webhooks |
| Google Calendar | Desarrollo pendiente | OAuth por usuario y resolución de conflictos |
| Cola de tareas y observabilidad | Redis está declarado; no está integrado como cola. Sentry está en el ejemplo, sin instrumentación | Worker, reintentos, bloqueos atómicos, métricas y alertas |

La cuenta Stripe de SYSTECH cobra sus licencias. Los ingresos de cada barbería deben tener una integración de comercio separada. No dirigir el dinero de las barberías a la cuenta SaaS sin diseñar expresamente el modelo de plataforma.

## Modelo de licencia propuesto

Los precios actuales de $499 y $999 mensuales se conservan en el código. No están validados por entrevistas ni por costos reales de soporte y proveedores.

Para vender a ambos segmentos, probar una licencia base por sucursal, con una cantidad clara de barberos incluidos y un cargo adicional por ubicación o capacidad. Una cadena puede tener un contrato mínimo, administración central y soporte acordado. Mensajes automáticos y timbrados necesitan cuotas transparentes o cobro por consumo.

Evitar sucursales y mensajería ilimitadas a una tarifa fija sin calcular el margen. Definir costo de alojamiento, soporte, onboarding, mensajes, timbrados, comisiones de pasarela y adquisición. Validar con pilotos antes de modificar precios públicos o prometer descuentos vitalicios.

El backend todavía contiene límites de 999 para Pro. No constituye una política comercial definitiva. Centralizar planes, permisos y límites en un catálogo y reflejarlos en registro, checkout, webhook y todos los endpoints que consuman capacidad.

## Diferenciadores con valor medible

Estas funciones son propuestas, no capacidades ya entregadas:

| Idea | Valor para el negocio | Primera versión comprobable |
| --- | --- | --- |
| Agenda que recupera huecos | Menos tiempo ocioso | Lista de espera con invitación, consentimiento y reserva del turno con caducidad |
| Reagenda al cobrar | Clientes que regresan | Proponer próxima cita según el historial y medir aceptación |
| Ficha de estilo | Servicio consistente entre barberos | Preferencias y fotos con consentimiento, permisos y eliminación |
| Membresías del cliente | Ingresos recurrentes de la barbería | Beneficios definidos, vigencia, consumos y cobro separados de la licencia SaaS |
| Resumen del dueño | Menos vigilancia manual | Avisos sobre descuadres, devoluciones y stock con enlace a la evidencia |
| Tablero de cadena | Decisiones por sucursal | Comparar periodos equivalentes, propinas separadas, costos y comisiones |
| Invitación a reseñar | Reputación y demanda | Solicitud consentida después de una visita completada; medir respuestas |

Medir cambios contra la línea base del piloto. Mostrar ingresos observados y atribución cuando exista; no presentar escenarios como ingresos recuperados reales.

## Bloqueantes de salida general

### Cobro y seguridad SaaS

- Completar sincronización de `customer.subscription.updated` y `created`: cambios del portal, prorrateos, suspensión y límites. Actualmente se procesan checkout, facturas y eliminación de suscripción.
- Controlar eventos fuera de orden consultando estado vigente y manteniendo versión/timestamp. La transacción nueva evita efectos parciales; por sí sola no resuelve el orden entre dos eventos diferentes.
- Evitar múltiples Checkouts pendientes en paralelo y reconciliar con Stripe antes de abrir otra licencia. La protección actual rechaza una suscripción ya asociada y reutiliza solicitudes equivalentes en una ventana, pero no reemplaza un registro persistente de intentos.
- Los dos precios estables del sandbox están configurados y se validan contra importe/moneda/periodo antes de Checkout. Quedan precios de producción y opciones del portal para cambios de plan. Los cupones todavía usan precios dinámicos; validar el portal antes de prometer upgrades autónomos.
- Migrar promociones temporales a Stripe Promotion Codes; consumo atómico, vigencias y límites de uso. `PROMO2026` se rechaza en Checkout para no convertir tres meses en descuento permanente.
- Recuperación de contraseña, verificación de correo y política de sesiones. Separar errores de infraestructura de credenciales inválidas. Completar matriz de permisos por sucursal y barbero.
- Auditoría transversal de acceso cruzado entre tenants en todos los endpoints, no solo en los nuevos. Revisar exposición de datos de clientes y permisos del personal.

### Operación e infraestructura

- Verificar migraciones en PostgreSQL real. Hay un SQL inicial mantenido manualmente y esquemas separados; no se ha probado Docker ni un despliegue PostgreSQL en esta sesión.
- Revisar reservas, idempotencia de ventas, folios, stock y caja bajo concurrencia PostgreSQL. Las suites locales usan SQLite y no certifican comportamiento de múltiples réplicas.
- Reemplazar el bloqueo del scheduler basado en consultar y luego insertar auditoría. Ese patrón no es una exclusión distribuida atómica.
- Tareas fuera del proceso HTTP, entrega al menos una vez, deduplicación, reintentos con espera y vista de errores recuperables.
- Respaldo automatizado, restauración ensayada, objetivos de recuperación, monitoreo, registros sin secretos y despliegue reversible.
- Revisar y actualizar dependencias con análisis de vulnerabilidades y regresión. No se efectuó una actualización mayor de librerías en esta revisión.
- Probar tablet, móvil, impresoras reales 58/80 mm, lector, gaveta y caída de red. El navegador imprime tickets; eso no garantiza apertura física de una gaveta.
- No ofrecer venta offline antes de implementar almacenamiento local protegido, sincronización, deduplicación y resolución de stock/caja.

### Integraciones y venta

- WhatsApp: conexión por barbería, plantillas, consentimiento, recepción y entrega con firma. Limitar automatización hasta completar el flujo. Configurar un token no resuelve el aislamiento de números.
- Facturación: RFC emisor por barbería, organización, CSD, idempotencia, persistencia de XML/PDF, cancelación y conciliación con ventas. Revisión fiscal profesional antes del lanzamiento.
- Configurar razón social, dominio, remitente, contacto de soporte y responsable de privacidad reales. La landing y documentos existentes contienen ejemplos y compromisos que requieren revisión.
- Revisar términos, privacidad, soporte, horario de atención, conservación/exportación de datos y SLA con profesionales. No prometer 99.5% ni soporte diario sin una operación que los respalde.
- Ejecutar pilotos con negocios independientes y una cadena. Validar flujo completo: reserva → asistencia → venta → ticket → comisión → corte → exportación.

## Orden de ejecución

1. **Validación interna:** diseño, navegación, permisos, pruebas aisladas y eliminación de simulaciones en producción. Cambios iniciados en esta revisión.
2. **Licencia en sandbox:** Stripe con cuentas de prueba y ciclo completo, incluyendo eventos desordenados, planes del portal y duplicados. Después, Resend con dominio real.
3. **Piloto acompañado:** POS y reservas con caja e impresoras reales. WhatsApp manual mientras se completa la integración por comercio.
4. **Automatización:** WhatsApp por negocio, colas y recuperación de errores; CFDI por emisor cuando el flujo fiscal esté validado.
5. **Cadena:** permisos de sucursal, comparación central, catálogo y licencias por capacidad, operación con réplicas.
6. **Venta general:** criterios anteriores satisfechos, restauración probada, métricas del piloto, contratos y soporte operables.

No hay un plazo cerrado: depende de disponibilidad de cuentas, requisitos fiscales, hardware y resultados de las pruebas. Completar una pantalla o aprobar tests locales no equivale a autorizar cobros de producción.

## Verificación realizada

- API compilada con TypeScript y frontend compilado para producción.
- Suites anteriores: 42 seguridad, 19 finanzas/concurrencia, 24 integraciones simuladas y 18 producto.
- Nueva suite: 19 verificaciones de operación, permisos, secretos, licencia, rollback/reintento y zonas horarias.
- Total observado: **122 verificaciones aprobadas en 5 suites**, con bases desechables. Las pruebas externas con proveedores, PostgreSQL, Docker y hardware siguen pendientes.
- Revisión visual local del inicio, navegación y conexiones. La demostración usa datos ficticios y credenciales de servicios vacías.

## Fuentes oficiales consultadas

- Stripe: firmas, cuerpo original y reintentos de eventos: https://docs.stripe.com/webhooks
- Facturapi: organizaciones por emisor y separación de llaves: https://docs.facturapi.io/en/docs/guides/organizations/
- Meta: referencia de WhatsApp Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api

Las ideas comerciales y de precios son hipótesis de producto, no resultados de un estudio de mercado.
