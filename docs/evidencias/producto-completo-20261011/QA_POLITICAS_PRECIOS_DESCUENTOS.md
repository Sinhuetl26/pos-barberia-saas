# QA independiente PC-10 / PC-11 — preparación

13 de octubre de2026. Estado:9/9 casos independientes aprobados en SQLite y9/9 en PostgreSQL tras build integrado. No activar reglas sobre demo actual, no cambiar precios comerciales ni generar cargos externos.

## PC-10

- Sin regla por profesional: hereda catálogo y comportamiento actual.
- Regla explícita en fixture: solo profesional/servicio/sucursal autorizado; vigencia interpretada según contrato acordado, incluyendo frontera exacta inicio/final.
- Caller manipula precio/nombre/tasa: servidor conserva autoridad; profesional no manda precios a catálogo ajeno.
- Reserva guarda snapshot elegido; cambiar regla/catálogo después no altera servicio ya reservado/cobrado.
- Profesionales con tarifas distintas y opción cualquiera: comprobar que el importe finalmente aceptado se informa antes de confirmación, sin sorpresa al elegir automáticamente.
- Reintentos/carrera edición conservan una reserva/venta y precio histórico. Contexto branch/tenant y roles permanece aislado.

## PC-11

- Política ausente/desactivada conserva comportamiento previo, incluidos límites existentes del barbero.
- Política explícita solo en fixture, límites por rol y porcentaje/monto interpretados según contrato servidor.
- Payload manipulado no evita límite: descuento sobre base correcta, sin negativo ni más que subtotal.
- Exceso exige aprobación de cuenta autorizada con identidad real y motivo, nunca PIN compartido ni claim de cliente.
- Aprobación vincula negocio/sucursal/colector/cita/carrito/monto y expira. Cambiar línea/cantidad/descuento/propina según contrato obliga a renovar.
- Rol/negocio ajeno no aprueba; API ignora nombre/email/ownerId enviado por cliente como identidad.
- Respuesta perdida/doble aprobación/dobleventa no producen cobro ni uso repetido de autorización.
- Snapshot y auditoría registran solicitante/aprobador/regla; devolución/comisiones conservan precio/descuento histórico.

Se ejecutarán fixtures independientes en SQLite y PostgreSQL después de recibir endpoints, significado de vigencia, hash y build integrado. UI/teclado/navegador siguen en control único del coordinador.

## Resultado ejecutado —13octubre

`scripts/qa_product_commercial_policies.cjs`, dos API temporales y fixture SQLite descartable:

1. Factory sin tarifas/política conserva catálogo y límite legacy20% barbero.
2. Tarifa explícita solo profesional/servicio autorizado, vigencia exacta, replay único, rechazo staff/version vieja/negocio ajeno; no cambia precio de catálogo.
3. Quote público informa profesional/importe; reservar custom exige precioConfirmado correcto; tarifa/catálogo después no altera reserva histórica. POS custom exige totalConfirmado; null vuelve a heredar.
4. Política explícita exige motivo y aprobación:10% exacto permitido,10.01% requiere aprobación; staff no publica ni aprueba y administrador no se autoaprueba.
5. Identidad del aprobador viene de cuenta autenticada ignorando ownerId/nombre del payload. Carrito/método/colector cambiado, expiración y aprobador desactivado rechazan pago.
6. Cuatro reintentos de aprobar registran una decisión, seis pagos misma intención registran una venta y aprobaciónUSADA; replay ya comprometido se recupera aunque después expire.
7. Dos intenciones de pago distintas compitiendo por aprobación única producen un200 y un409.
8. Staff ve solo sus solicitudes, cajero sin solicitudes ve vacío, gerente/dueño ven alcance autorizado; cartHash/carritoJson/resumenJson no se exponen.
9. Cambio de versión de política invalida aprobación no usada; política desactivada restaura comportamiento legacy.

**9/9 PASS SQLite y9/9 PASS PostgreSQL:18casos independientes.** No se marca aceptación visual por estas pruebas API.

La primera versión del caso carrito duplicaba cantidad sin duplicar descuento: pasó de20% a10% y dejó de requerir aprobación legítimamente. Se corrigió el caso manteniendo40sobre200 (20%), para probar vínculo de autorización por encima del límite. No se cambió producto para forzar PASS.

## Bloqueo PostgreSQL

El runtime aislado no arrancó:pg_ctl status informó ningún servidor activo, start falló y dejó referencia PID vieja del test-cluster. Se realizó diagnóstico de solo lectura y un segundo intento con log separado en el mismo clúster de pruebas. No se borró PID, base, clúster ni ningún dato para forzar inicio. Se detiene recuperación del runtime por instrucción del coordinador; pendiente ejecutar misma suite con cliente PostgreSQL separado cuando esté disponible.

Root autorizó después crear otro clúster de QA, con carpeta/puerto exclusivos. `qa_isolated_postgres.cjs` crea `.tools/postgres-qa-20261013-*` en puerto55413 y genera cliente PG separado. Primer arranque sufrió espera por handles pipe heredados de Windows; se detuvo únicamente ese clúster recién creado y se corrigió stdout del arranque a ignore. Segundo clúster nuevo ejecutó los9casos PG conPASS; no se eliminó lock/PID viejo ni se modificó clúster anterior. El helper detiene exclusivamente su clúster nuevo al finalizar.
