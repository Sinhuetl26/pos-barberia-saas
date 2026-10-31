# Contrato PC13 / PC14 — gastos y análisis interno

Estado: implementación backend y compilación, QA independiente en curso. No aplicado a bases operativas ni precios externos.

## Gastos
DUENO/GERENTE dentro de su sucursal: GET/POST /reportes/gastos. POST requiere sucursalId, concepto no vacío (300), categoría RENTA/SERVICIOS/MANTENIMIENTO/OTROS/COMPRA_INVENTARIO, fecha datetime local o ISO con zona, importe positivo de hasta dos decimales, metodoPago EFECTIVO/TARJETA/TRANSFERENCIA, referencia opcional (300), idempotencyKey estable. No carga remota de comprobante ni movimiento bancario.

GET /reportes/gastos/salidas?sucursalId lista salidas GASTO_MENOR negativas no clasificadas. Elegir una conserva concepto e importe exactos y registroCajaId; vínculo único valida tenant/sucursal/método/custodia y evita una segunda salida. Se permite clasificar evidencia de turno cerrado, conservándolo.

Respuesta: id, sucursalId, version, revisionHash, original, actual, usuarioNombre, registroCajaId, esGastoOperativo, correcciones. POST /reportes/gastos/:id/corregir añade versionEsperada, revisionHash, motivo y nueva intención; mismos campos del gasto salvo registroCajaId. Original inmutable; correcciones append con responsable, fecha y antes/después. El hash incluye todas las evidencias de caja vinculadas y correcciones, no sólo el neto. La compensación física firmada se registra una vez en turno abierto actual; no reescribe un cierre. Corrección de categoría sin cambio de efectivo no inventa movimiento. Caja insuficiente revierte la operación completa.

COMPRA_INVENTARIO se informa separada y no se resta nuevamente como gasto operativo. Comisiones devengadas no equivalen a pago de comisión. La referencia opcional no equivale a CFDI validado.

## Inteligencia
GET /reportes/inteligencia?sucursalId&fechaInicio=YYYY-MM-DD&fechaFin=YYYY-MM-DD. Fechas inclusivas de sucursal, máximo93d. diasSinSalida (30) y coberturaDias (14) opcionales enteros1..366. Roles DUENO/GERENTE; barbero sin finanzas generales.

Ventas por fecha original (cohorte), devoluciones registradas hasta corte=min(finperiodo,ahora), ingresos sin IVA incluido ni propinas; comisiones originales menos reversión. Ranking ingresos incluye IVA y descuentos, separado de unidades netas. Costos de artículos congelados en Kardex de venta nueva; catálogo mutable nunca reescribe margen anterior. Insumos según atención y correcciones conocidas hasta corte; versión0 o costo no acreditado deja utilidad nula. Gastos por fecha declarada, corregidos según evidencia existente al corte. Compras no son consumo. Salidas físicas sin clasificación hacen incompleta la utilidad.

No utilidad fiscal ni declaración automática. Costos/gastos se muestran por importe capturado sin inferir acreditamiento fiscal. Campo datosInsuficientes explica limitaciones; utilidadOperativaEstimada=null evita inventar ceros. Saldo stock es actual y se etiqueta; rotación y cobertura usan sólo ventana de salida elegida hasta corte. SIN_HISTORIAL no significa fracaso de producto nuevo.

Ocupación: minutos de horario vigente por profesional y fecha, excepciones, descanso, sucursal, menos unión de ausencias/bloqueos; citas sobrepuestas cuentan una vez y se recortan a capacidad. Servicios excluyen buffer. Cero capacidad devuelve porcentaje null. Historial de horarios no versionado: se declara explícitamente que aplica configuración vigente a fechas seleccionadas. Acciones sólo abren revisión; no campañas ni compras automáticas.

## Pendientes de evidencia
Pruebas independientes SQLite/Postgres PC13 y PC14, recorrido UI, rollout de copia controlado por coordinador. Pruebas físicas/servicios externos fuera del alcance.
