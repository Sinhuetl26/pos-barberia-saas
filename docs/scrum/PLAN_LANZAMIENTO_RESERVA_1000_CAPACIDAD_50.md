# Lanzamiento: demo local, reserva $1,000 y objetivo 50 barberías

Actualizado: 15 de octubre de 2026, America/Mexico_City. Decisión de Sinhue: enseñar la demo ahora, reservar $1,000MXN para desplegar cuando exista un cliente interesado y crecer con los ingresos. **Stripe pospuesto por instrucción expresa posterior.** Este documento sustituye como ruta principal al PLAN_ARRANQUE_0_PESOS_3_A_4_CLIENTES.md; conserva de él los criterios de seguridad, respaldo, cuotas y alta gradual.

## Alcance y presupuesto

- Demo local disponible sin nuevos gastos. Estado del producto local:20/21 verificados; PC12 pendiente de comprobar ventana/comprobante/impresión. No repetir ventaA3 ni cierre675 ya guardados.
- $1,000 es una reserva inicial, no el costo único ni una garantía de capacidad. El mantenimiento será mensual.
- Antes de contratar: cotización vigente de servidor, base, respaldos, impuestos/conversión y margen. El escenario anterior de $500–700MXN/mes es presupuesto de arranque, no tarifa cerrada ni garantía para50 negocios.
- Ruta preferida con presupuesto: web estática y API Express en servidor persistente pagado, PostgreSQL administrado y copia recuperable. Reutilizar código actual; evitar adaptación serverless si no reduce el costo total. Elegir instancia tras probar consumo y memoria. Dirección del proveedor inicialmente; dominio opcional posterior.
- Una base gratuita puede usarse durante piloto solo con cuotas y respaldo comprobados; pasar a pago antes de rebasarla. No elegir base de prueba que expire. Preparación local no autoriza contratar/desplegar/gastar todavía.
- Antes de dar por disponible lo cobrado: separar obligaciones fiscales aplicables, comisiones y reserva operativa. Financiar ampliaciones con ingresos de clientes; no esperar obligatoriamente al cuarto si ya hay recursos o necesidades.

## Qué significa aguantar 50

**50 son negocios registrados, no50 peticiones simultáneas ni50 usuarios totales.** Un dueño y cuatro barberos por local pueden sumar250 sesiones. El comportamiento depende de cuántas estén activas, consultas automáticas, reservas públicas, historial e informes. Conclusión actual: objetivo50, capacidad todavía no certificada.

La revisión encontró sondeos de Agenda cada15s con dos consultas y otra consulta cuando se usa la fila:250 pantallas podrían producir aproximadamente33–50 solicitudes/segundo solo para refrescar. No es tráfico medido ni incluye todas las acciones. No se dimensiona por número de filas de Tenant.

La ruta a1,000 requiere pruebas y recursos adicionales: no se promete en la instancia inicial ni se compra infraestructura para ese tamaño antes de necesitarla. Un único servidor no garantiza cero caídas; recuperación, controles de concurrencia y ampliación son parte del objetivo.

## Secuencia de trabajo y puertas de aceptación

1. **Cerrar demo:** comprobar PC12, versión reproducible y guion comercial. Conservar datos ficticios y evidencia de20bloques, sin convertirlo en certificación de producción.
2. **Preparar nube sin comprar aún:** configuración de Express/Node, cliente Prisma generado para PostgreSQL, migraciones ensayadas, secretos distintos por entorno, URLpública/CORS/HTTPS, región y conexiones limitadas. Demo separada de datos reales. No publicar contraseñas/manifiestos de prueba.
3. **Resolver puntos de capacidad:** poolAPI limitado según presupuesto de conexiones y número de procesos; proxy/IP real confiable y límites de acceso/reservas que funcionen con múltiples procesos; sondeos solo cuando hacen falta, regreso al foco y actualización manual; paginación/rangos/índices y consultas de reportes. Worker, pulsos y automatizaciones se presupuestan aparte; no omitir tareas de seguridad necesarias para ahorrar.
4. **Prueba aislada de50:** entorno y base desechables, sin Stripe real ni cargas sobre la demo principal. Sembrar50negocios/1sucursal/4barberos y un historial representativo. Probar50,100 y250sesiones como escenarios distintos, subiendo hasta10/25/50solicitudes por segundo. Generar carga de manera acotada y autorizada, con límites de CPU/memoria/tiempo y parada ante saturación.
5. **Medir y corregir:** calentamiento y al menos30min de carga estable, ráfaga breve y recuperación/reinicio; repetir en la instancia de nube candidata. Registrar hardware, fecha, versión, dataset, ritmo solicitado/logrado, concurrencia, p50/p95/p99, errores, CPU/RAM, conexiones y consultas lentas. Un test en laptop o10casos funcionales no certifican la nube.
6. **Criterios propuestos:** p95 de lecturas habituales≤1s, reserva/venta≤2s y p99≤5s, errores5xx/timeouts<0,5%, margen de recursos≥30% durante carga representativa y sin crecimiento sostenido de memoria. Objetivos a comprobar, no promesas actuales. Separar rechazos de negocio esperados de errores técnicos. Cero cobros/ventas/stock/comisiones/cierres duplicados, cero cruce de empresas y snapshots intactos. Prueba de reporte concurrente no debe inutilizar el cobro.
7. **Persistencia y operación:** restaurar backup en destino aislado, medir recuperación, documentar frecuencia/pérdida máxima y responsable. Copia independiente cifrada; comprobar su ejecución real. Validar altas y recuperación de cuenta, aviso/condiciones y soporte del piloto. Si alguno falla, no introducir datos reales.
8. **Primer cliente y despliegue:** enseñar local; acordar alcance/precio vigente y fecha de inicio. Antes de activar servicio real, cotización dentro de reserva, cuentas del titular, pruebas en nube y respaldo. Incorporar1→3–4 clientes con una jornada acompañada por alta y revisar consumo diariamente. No utilizar credenciales compartidas.
9. **Crecer hasta50:** revisiones a5/10/25/50barberías, carga y consumo proyectado del mes. Alertar y ampliar antes del70% sostenido de conexiones/memoria/cuotas o de incumplir tiempos; no esperar a una caída. Si falta presupuesto o evidencia, detener nuevas altas y conservar servicio/datos existentes.
10. **Camino a1,000:** antes de ofrecerlo, probardataset/historial y concurrencia equivalentes, separar consultas pesadas/trabajos y escalarAPI según medición; pool y límites coherentes entre réplicas, índices y aislamiento. Balanceo/alta disponibilidad/réplicas solo con necesidad demostrada y presupuesto. Preferir subir de plan sobre migraciones totales innecesarias; ensayo, backup final y vuelta atrás si cambia proveedor.

## Stripe — pospuesto, no configurado

La petición de configuración se revocó durante esta revisión. Se hizo solo consulta de cuenta/precios de prueba y revisión del código; no se crearon precios/productos/suscripciones, no se modificaron claves/configuración y no se generaron cargos.

Hallazgo de consulta: cuentaMX existente con clave de prueba, planes Esencial499 y Pro999MXN mensuales coinciden con catálogo; Cadena2699 aún sin precio conectado en ese archivo. Charges/payouts no habilitados; esto no revela ni sustituye los requisitos de activación. Política fiscal local pendiente. No se activó live ni se cambió el catálogo.

Cuando Sinhue lo retome: revisar eventos `customer.subscription.updated`/portal, orden temporal de facturas/pagos/cancelaciones y creación de checkout pendiente única. La revisión de fuente identificó riesgos de estado obsoleto y múltiples sesiones; no afirmar que están corregidos. Probar sandbox aislado, firma, renovación/fallo/reintento/cancelación/cambio de plan y habilitación por webhook, no porURLde éxito. Revisión fiscal/cuenta/webhook HTTPS definitivo antes de cobros reales. Suscripciones de licencia son diferentes de los cobros del POS a clientes de una barbería.

Mientras esté pospuesto, el plan de transferencia requiere confirmar pago y registrar vigencia administrativa auditada mediante mecanismo autorizado; su aceptación en producción aún debe comprobarse. No inventar una activación pública ni editar planes directamente en SQL para aparentar pago.

## Evidencia actual y siguiente paso

Hay QA funcional y permisos sobre PostgreSQL, pero **no existe evidencia de carga completa de50negocios ni1,000**. Revisión independiente comunicó10/10casos comerciales enfixture con dosAPI y ráfaga de seis reintentos: verifica integridad, no throughput/p95. La revisión de Stripe comunicó49checks offline; no verifica una compra nueva en Stripe ni solventa los riesgos de fuente. No se ejecutó carga contra clientes reales.

Siguiente trabajo autorizado a preparar: PC12 y configuración reproducible de despliegue/capacidad; no configuraciónStripe. Antes de contratar y activar entorno real, presentar costo vigente y evidencia. No hay recordatorio ni ejecución futura automática creados por este plan.

Fuentes de precios y límites consultadas al planificar: [Render](https://render.com/pricing), [Neon](https://neon.com/pricing), [Netlify Free](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/). Las cantidades y las pruebas funcionales no garantizan disponibilidad ni sustituyen un presupuesto medido.
