# PC-04/05: unidades, recetas y consumo

Implementador: inventory_integrity_pc01. Fecha11/oct/2026. Estado: backend integrado; pruebas independientes y UI se documentan por separado. No se reinició ni migró ninguna demo viva desde este agente.

## Datos y compatibilidad

Producto.stockActual/stockMinimo y Kardex.cantidad/stockAnterior/stockNuevo pasan a Decimal. PostgreSQL define precisión20, escala3. SQLite mantiene Decimal validado por API: no se cambia el significado de cantidades enteras existentes. REVENTA +PIEZA es el valor de compatibilidad; INSUMO permite PIEZA/ML/G. PIEZA sigue entero y ML/G admite3decimales. No se venden insumos desde POS.

`naturaleza`, `unidad`, `presentacionNombre`, `presentacionCantidad` (cantidad base por envase) se definen al crear producto. No se reinterpreta unidad o clasificación después; corresponde crear artículo nuevo para otra unidad. Stock y receta se expresan en unidad base. Una entrada puede indicar cantidadPresentaciones, calculada en servidor por el factor del artículo; factor y cantidad se guardan en metadata. La conversión que pierde precisión se rechaza.

Costo por unidad base admite6decimales. Precio de venta mantiene2decimales. No confundir costo por mililitro con costo por envase. Consumo guarda cantidad, versión de receta, costo unitario y total usados; editar el costo actual no modifica eventos anteriores. Default histórico costo0 no acredita que fuera gratis: snapshot costoConocido conservador false cuando no hay costo positivo acreditado. El cálculo comercial debe señalar información incompleta, nunca inventar margen. Registro explícito de costo gratis requiere ampliar acreditación de costos en el bloque analítico posterior.

La respuesta API conserva números físicos para UI mediante projectResponse; lecturas Prisma directas ahora retornan Decimal y deben compararse por Number/Decimal en pruebas. No modificar precios, cantidades ni datos viejos para facilitar una prueba.

## Receta versionada y evento único

- GET `/inventario/recetas/:servicioId`: versiones con items; solo dueño/gerente.
- POST misma ruta: `{versionEsperada,items:[{productoId,cantidad,unidad}],idempotencyKey}`. Publicación crea versión nueva, conservando anteriores. Insumos distintos, máximo50, misma unidad base y alcance del servicio. Receta vacía desactiva consumo futuro sin borrar historial. Versionado CAS evita sobrescribir otro editor.
- COMPLETADA consume dentro de la misma transacción de estado. POS consume dentro de la misma transacción de venta. Clave del hecho: CITA:id +servicioId cuando hay cita, VENTA:id +servicioId en atención cobrada sin cita. Unicidad persistida evita doble consumo por terminar/cobrar o reintentar.
- Incluso ausencia de receta registra versión0 con items vacíos al completar: publicar una receta después no aplica retroactivamente al cobrar esa visita.
- Cancelación previa no consume. Reembolso monetario no restituye material utilizado. Insuficiencia de insumos revierte toda la atención/venta y demás efectos transaccionales.
- Guardado de recetas bloquea el servicio; consumo conserva versión y costos. Stock negativo no se confirma silenciosamente.

## Corrección explícita

GET `/inventario/consumos?sucursalId=...` devuelve evento original inmutable, itemsActuales, version y correcciones.

POST `/inventario/consumos/:id/corregir`: `{versionEsperada,motivo,items:[{productoId,cantidadReal}],idempotencyKey}`. Solo insumos del evento original. Diferencia entre consumo anterior y real se compensa en Kardex; precio/costo histórico se conserva. Se agrega auditoría versionada, sin alterar ConsumoServicio.itemsJson original. Referencia vencida devuelve409; intención repetida recupera resultado. No se llama desde devolución de venta.

## Conciliación PC-05

GET `/inventario/insumos/conciliacion?sucursalId=...&tolerancia=...`: productos, fórmula de términos firmados, saldo actual y saldo esperado solo con Kardex suficiente. Último conteo contiene referencia, físico, diferencia firmada/absoluta y tolerancia elegida en unidad base. Default0 equivale comparación exacta, no tolerancia física recomendada.

500ml iniciales −60atenciones×5ml =200ml. Físico150 compara diferencia−50 (absoluta50). Confirmar conteo registra ajuste−50: saldo nuevo150, con última comparación200→150 conservada y estadoConciliado. No presentar esa diferencia histórica como otra salida por50 ni como acusación de robo. Ledger histórico incompleto dice No hay información suficiente. Frascos abiertos requieren medición y tolerancia elegida; piloto físico queda pendiente externo.

## Migración y evidencia

`20261011_inventory_consumption` es migración PostgreSQL; cambia tipo sin escalar/truncar piezas. Para SQLite no ejecutar ese ALTER COLUMN PostgreSQL: preparar copia respaldada y aplicar esquema Prisma sobre la copia, verificando tablas/filas/saldos antes y después. Nuevos modelos RecetaServicio y ConsumoServicio; ambos limitan negocio y eventos limitan sucursal.

Generación local escribió clienteJS/types del modelo nuevo, pero reemplazo final DLL del query engine Windows dio EPERM por procesos anteriores vivos. Se conservó binary de misma versión5.22 y buildAPI PASS. QA independiente usó SQLite/clientePostgreSQL aislado y aprobó11comprobaciones por proveedor (22 total), incluidas corrección explícita, tolerancia49/50, dato histórico insuficiente, permisos y aislamiento. Fuente: QA_INSUMOS.md y qa_product_supplies.cjs. No declarar UI o migración de producción verificadas con esos resultados. Suites anteriores basadas en stockInt requieren normalización legítima a Decimal y repetición de sus mismos criterios.
