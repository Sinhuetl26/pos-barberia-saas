# Stripe — revisión de preparación, 14 de octubre de 2026

**Configuración pospuesta por instrucción explícita del usuario: «no lo configures ahorita».** Se detienen aquí pruebas y acciones de Stripe. Este documento guarda únicamente la revisión de solo lectura y resultados offline ya obtenidos antes de esa indicación. No habilita ni certifica producción.

## Alcance y evidencia obtenida

No se abrió navegador, leyó/imprimió `.env`, consultó API externa, creó cuenta/precio/suscripción remota ni modificó producto/configuración. Tampoco se usaron datos de la demo. Dos suites conocidas se ejecutaron con SQLite ficticia desechable, API local y doble controlado de Stripe:

- `node scripts/test_commercial_foundation.js`: **19/19 PASS**.
- `node scripts/test_license_catalog.js`: **30/30 PASS**.
- Total: **49 comprobaciones offline aprobadas**. No equivalen a 49 pruebas de cobro real.

Fuentes revisadas: `apps/api/src/routes/suscripcion.routes.ts`, `services/stripe.service.ts`, `billing-checkout.service.ts`, `license-catalog.service.ts`, `provider-config.service.ts`, `apps/api/src/index.ts`, `apps/web/src/views/SuscripcionView.tsx` y `packages/licensing/catalog.json`. No se ejecutaron `verify_stripe_sandbox.js` ni listener externo.

## Lo que ya funciona en el alcance offline

- Checkout/portal requieren dueño autenticado. Negocio y URL de retorno se toman del servidor; el cliente no puede imponer tenant/precio/capacidad.
- Catálogo compartido tiene tres planes canónicos: Esencial 499, Pro 999 y Cadena 2699 MXN base mensual. Esta revisión no cambió esos precios ni interpreta la reserva de arranque de 1000 MXN como precio nuevo del producto.
- Catálogo/readiness no expone claves ni IDs remotos. Un precio aislado no anuncia checkout utilizable: requiere clave del entorno correcto, firma, precio específico y origen seguro.
- En producción se exigen mapeos LIVE, clave live y política fiscal explícita revisada. Alias TEST no cubren LIVE; promociones no revisadas quedan bloqueadas.
- Antes de crear checkout se verifica precio remoto activo, moneda MXN, importe en centavos y recurrencia mensual exacta; el cliente no puede enviar otro importe.
- La pantalla de regreso «success» espera confirmación del servidor; la URL sola no activa licencia.
- Fuera del test explícito, webhook requiere firma y cuerpo crudo. Evento y efectos se confirman juntos en transacción; mismo eventId se procesa una vez y fallos quedan reintentables. Eventos sin identificadores no pueden actualizar un negocio arbitrario.
- Pago fallido entra en riesgo/gracia; recuperación limpia suspensión anterior. Cancelación definitiva bloquea operación y conserva acceso del dueño a facturación.
- Límites de sucursales/barberos y downgrade se verifican en servidor con transacciones; no se borran datos para que quepa un plan menor. Suscripción Stripe activa no se sobreescribe mediante cambio local en producción.

## Pendientes detectados por lectura de fuente antes de live

Estos hallazgos no se corrigieron ni se reprodujeron con Stripe externo. Son rutas de riesgo visibles en el código que requieren una tarea específica y pruebas de secuencia antes de cobros comerciales:

1. **Sin sincronización de `customer.subscription.updated`.** El servicio procesa checkout, facturas y cancelación, pero no ese evento. Un cambio de plan/precio en portal puede dejar plan, monto o capacidad local anteriores: el plan se aplica en checkout o en una asociación inicial por factura, no de forma general al actualizar una suscripción existente. Mantener cambios de plan del portal sin habilitar hasta cerrar sincronización y pruebas de upgrade/downgrade/prorrateo/capacidad.
2. **Orden de eventos distinto de deduplicación.** Se deduplica eventId, pero no se observa una barrera general por event.created/estado vigente/período de factura. Por lectura, un fallo antiguo después de pago podría volver a EN_RIESGO; una factura pagada antigua después de cancelación podría reactivar una licencia. Recuperar la factura desde Stripe no demuestra que represente el estado vigente de toda la suscripción. Faltan pruebas de entrega desordenada y política de reconciliación con estado actual del proveedor.
3. **Checkout pendiente no reservado de forma durable por negocio.** La clave de idempotencia incluye negocio/plan/importe y ventana de 30 minutos. El guard de suscripción activa ocurre antes de crear la sesión, sin reservar una única intención pendiente. Cambiar plan o ventana puede generar varias sesiones pendientes; completar dos puede producir dos suscripciones/cargos remotos antes de que el webhook rechace la segunda asociación. Rechazar el webhook no cancela ni devuelve un cargo ya hecho por el proveedor. Falta recuperación de sesión pendiente, exclusión/reconciliación y tratamiento explícito de duplicados remotos.
4. **Fiscalidad del total no equivale a desglose fiscal del proveedor.** El cotizador soporta IVA incluido o más IVA y valida el importe final, pero checkout no configura automáticamente CFDI ni un proveedor fiscal; tampoco se demuestra con estas pruebas un desglose impositivo de factura Stripe. `LICENSE_FISCAL_REVIEWED=true` es una compuerta técnica, no una revisión legal efectuada. La decisión fiscal y comprobantes deben validarse aparte antes de live.
5. **Scheduler y ciclo completo pendientes de evidencia operativa.** Existe proceso de gracia/suspensión, pero no se ha certificado despliegue, periodicidad, alertas, reintentos persistentes del proveedor, recuperación con cobro real, cancelación a fin de período o atención del cliente ante bloqueo. Deben conservarse acceso a facturación/datos y una política comercial comunicable.

## Entornos y prueba futura, solo cuando el usuario reactive la configuración

La demo local usa test explícito y proveedores apagados. En `NODE_ENV=test`, el constructor admite eventos simulados sin firma para las fixtures: **no publicar ese modo como API operativa ni usarlo para afirmar seguridad de un webhook expuesto**. Una prueba de sandbox real debe usar firma y separación clara de datos/configuración; live debe tener su propia cuenta/mapeo/capacidades revisadas. No compartir secretos en chats o documentación.

Al retomar: cerrar primero los puntos 1–3 con pruebas aisladas; después verificar sandbox firmado de compra, renovación, fallo, recuperación, cancelación y duplicados; confirmar tratamiento fiscal y condiciones antes de cualquier live. Esa lista es preparación futura, **no autorización para ejecutarla ahora**.

La reserva de 1000 MXN, objetivo de 50 barberías y ruta hacia 1000 requieren plan de gastos/ventas/capacidad separado. Estas 49 pruebas no miden consumo real, conversión comercial, rentabilidad, costos de Stripe ni capacidad de producción para ese volumen. No se citan tarifas externas sin verificarlas cuando corresponda retomar.

## Estado final de esta tarea

Revisión offline guardada; configuración de Stripe **pospuesta por el usuario**. Sin cargos, mensajes, cambios de precio, despliegue ni servicios contratados. No hay más pruebas de Stripe pendientes de ejecución en esta tarea mientras la pausa siga vigente.
