# Inventario: contrato integrado PC-01/02/03

Implementador: inventory_integrity_pc01. Fecha: 11/oct/2026. Este documento describe código y límites; la aprobación independiente está en los reportes QA del equipo.

## Cambios y compatibilidad

- Alta de producto + movimiento inicial + auditoría + intención se confirman en una única transacción. SKU nuevo o editado se comprueba por negocio, bajo bloqueo transaccional del negocio, sin modificar duplicados históricos.
- Inventario conserva unidades enteras PIEZA en esta fase. No hay migración decimal ni recetas todavía. Sucursal del producto define su saldo; un producto sin sucursal tiene un único saldo global del negocio. Solo el dueño puede modificarlo. No se presentan saldos ficticios separados por sucursal.
- `POST /productos`: UUID en `Idempotency-Key` header. Resultado producto original extendido con `replayed`/`idempotencyKey`. El validador de producto elimina campos no declarados: no confiar en body key para esta ruta.
- `POST /inventario/movimiento`: UUID header o body `idempotencyKey`. Resultado `{producto,kardex,replayed,idempotencyKey}`. Tipos actuales: ENTRADA_COMPRA, MERMA_DEVOLUCION, USO_INTERNO, AJUSTE_INVENTARIO. Cantidad entera; entradas/salidas positivas, ajuste admite cero como saldo físico final.
- Ajuste absoluto exige `stockEsperado`: se verifica después del bloqueo y el saldo se modifica con CAS. Referencia ausente→409 STOCK_REFERENCE_REQUIRED; cambió→409 STOCK_CHANGED. Salidas/ajustes necesitan motivo. No se eliminan movimientos.
- Campos opcionales: `costoUnitario` (dos decimales), `proveedorId`, `referencia`, `fechaOperacion` ISO no futura. El responsable viene de la sesión. Kardex `metadataJson` conserva costo y documento, unidad, responsable y procedencia; modificar costo actual no reescribe ese snapshot.
- PUT catálogo rechaza `stockActual`; exige movimiento explícito. Servicios no admiten movimientos ni stock inicial.
- La intención está vinculada al negocio, usuario y contenido normalizado. Contenido diferente con misma key→409 IDEMPOTENCY_CONFLICT. Reintento recupera snapshot original; no retorna stock actual como si fuera el resultado histórico.
- Solicitudes antiguas sin key siguen funcionando con una clave generada por el servidor, pero **no recuperan una respuesta perdida**: la UI actualizada debe conservar UUID y payload ante resultado incierto. Timeout/busy→503 INVENTORY_BUSY con instrucción de reintentar la misma intención.

## Conteos PC-03

- GET `/inventario/conteos[?sucursalId=...]` devuelve hasta 50 conteos dentro del alcance permitido. Cada resultado contiene `id,sucursalId,estado,version,items,fecha,confirmadoEn,motivo`.
- POST `/inventario/conteos`: `{sucursalId,productoIds?,idempotencyKey}`; 1–500 artículos. Omisión de selección usa catálogo físico elegible. Borrador persistido; cada línea tiene `productoId,nombre,stockReferencia,movimientoReferencia,cantidadContada:null`.
- `movimientoReferencia` es hash de IDs del Kardex completo del producto: detecta salida+devolución aun si el saldo vuelve a ser el mismo. No interpreta no contado como cero.
- PUT `/inventario/conteos/:id`: `{versionEsperada,items:[{productoId,cantidadContada:number|null,recontar?:true}],idempotencyKey}`. Guardado parcial conserva otras líneas. Versión incorrecta→409 COUNT_CHANGED para evitar sobrescribir otro operador. Guardado incrementa versión.
- Recontar es explícito: exige una cantidad física recapturada y actualiza saldo/hash de referencia bajo bloqueo. Intención persistida evita que un reintento con respuesta perdida refresque una referencia nuevamente mientras ocurren ventas.
- POST `/inventario/conteos/:id/confirmar`: `{versionEsperada,motivo,idempotencyKey}`. Confirma una vez, incrementa versión y registra únicamente diferencias de líneas contadas. Todas las validaciones preceden los ajustes; falla cualquier línea→rollback completo. Confirmado no vuelve a editarse.
- Cualquier movimiento posterior a referencia→409 COUNT_STALE. El mensaje identifica el artículo; no promete reconciliación automática incierta. Debe recontarse y revisarse. Doble confirmación con la misma intención devuelve el resultado; otra intención sobre confirmado recibe COUNT_CONFIRMED.
- API y modelScope limitan negocio/sucursal; barbero/cajero no adquieren permisos de conteo. No hay confirmación masiva implícita desde catálogo.

## Archivos y despliegue local

Cambios: inventario.routes.ts, inventory-ledger.service.ts, inventory-count.service.ts, ambos schemas y migraciones `20261011_inventory_intentions`, `20261011_inventory_counts`. El coordinador añadió políticas de rutas; implementador añadió ConteoInventario a modelos con alcance de sucursal.

No se modificaron bases operativas ni fixtures de presentación. El cliente/dist nuevo exige las nuevas tablas/campo: para probar UI usar fixture o copia aislada con esquema aplicado. No conectar cliente nuevo a base anterior sin su migración autorizada. Las pruebas SQLite usan db push en directorio temporal; PostgreSQL usa migrate deploy en esquema temporal y cliente de prueba separado.

Las migraciones solo agregan estructuras. Para recuperación fuera de pruebas, conservar respaldo probado y versión de aplicación compatible; no borrar Kardex/operaciones ni intentar rollback destructivo después de registrar nuevos movimientos. No se ejecutó una migración de producción.

## Evidencia hasta esta entrega

Build API tras generación del cliente: PASS. Calidad independiente reportó PC-01/02: nueve comprobaciones nuevas + seis permisos/CSV + seis integridad de recepción en cada proveedor (42 comprobaciones, SQLite/PostgreSQL). Después verificó el hardening final de SKU: diez comprobaciones PC-01 por proveedor, y PC-03: ocho por proveedor (16 de conteos). Fuente de evidencia independiente: QA_INVENTARIO.md / QA_CONTEOS.md y sus scripts qa_product_inventory.cjs / qa_product_inventory_counts.cjs. UI de PC-02/03 y capturas son responsabilidad de los agentes frontend/coordinador, no se declaran verificadas aquí.
