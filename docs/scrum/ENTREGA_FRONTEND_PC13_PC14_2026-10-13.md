# Entrega frontend PC13 / PC14

Implementación local del 13 de octubre. Pendiente de recorrido de navegador y conciliación independiente con fixture; no se marcaron historias completas.

## PC13 — gastos e historial

- Pestaña Gastos e historial dentro de Reportes; sin menú ni formulario duplicado en otro módulo.
- Alta explícita: concepto, categoría, fecha/hora local, importe positivo en centavos, método de pago y referencia opcional del comprobante.
- Selección de una salida de efectivo ya registrada mediante endpoint `gastos/salidas`; copia concepto/importe exactos, conserva registro original y evita una segunda salida de caja. No se pide al usuario copiar IDs técnicos.
- Nuevo pago en efectivo corresponde al turno abierto y saldo disponible; bancario no disminuye gaveta. Compra de inventario se separa del gasto operativo y no sustituye una entrada ni costo de inventario.
- Corrección sobre versión/hash leído, motivo obligatorio y original/historial visibles. Diferencia de efectivo se compensa en turno actual, no reescribe caja anterior. Versiones desactualizadas requieren revisión explícita; no se actualiza la versión de un borrador silenciosamente.
- Referencia persistente por cuenta/sucursal para recuperar el mismo gasto ante respuesta incierta; cambios bloqueados mientras existe intención pendiente. Errores definitivos no mantienen un reintento inválido.
- Respuestas de otra sucursal se descartan; lectura fallida impide registrar desde lista/versiones desconocidas.

## PC14 — inteligencia del dueño

- Pestaña separada de dashboard existente, consulta explícita de período inclusivo hasta 93 días, sucursal y zona horaria.
- Umbrales editables para días sin salida y ventana de cobertura (1..366), siguiendo contrato del backend.
- Desglose de ventas netas sin IVA, propinas separadas, comisiones devengadas, costos históricos, gastos, compras y utilidad estimada. Valor desconocido permanece desconocido; no se convierte en cero/infinito ni se declara utilidad fiscal.
- Evidencia insuficiente visible con explicación. Costos acreditados se identifican como parciales cuando faltan fuentes; no se sustituyen con catálogo actual.
- Rankings por unidades e ingresos separados, con diferencias respecto a utilidad/IVA explicadas.
- Inventario: stock actual identificado explícitamente; última salida y consumo consultados hasta corte. Producto sin historial no se etiqueta fracaso. Cobertura desconocida explica falta de consumo.
- Ocupación: minutos disponibles/programados/completados y porcentajes con base visible; se advierte capacidad histórica no versionada basada en horarios vigentes.
- Acciones de revisión a artículo/inventario/conteo y agenda, usando navegación protegida proporcionada por App; no se compran artículos ni se envían campañas.
- Cambiar filtros oculta cifras anteriores hasta consultar de nuevo; respuestas tardías de otros filtros/sucursal no se interpretan como actuales.

## Archivos y comprobación

- `ReportesView.tsx`, `ExpenseManagement.tsx`, `OwnerIntelligence.tsx`, estilos scoped `report-operations.css`, métodos API correspondientes.
- `npx tsc --noEmit -p apps/web/tsconfig.json`: PASS.
- `node scripts/test_report_ui_helpers.cjs`: 5/5 PASS. Importes con subcentavos/rangos/blancos, fechas locales cruzando medianoche, límite inclusivo de 93 días, fechas imposibles y datos insuficientes frente a cero/infinito.
- Navegador, captura móvil/escritorio, persistencia real, respuesta perdida y conciliación de cifras pertenecen a verificación de raíz/QA; no se ejecutaron por este subagente.
- No se tocaron backend, esquema, POS, CloseCashGuide, importación, Clientes o Inventario. No hay nuevas dependencias, despliegue o conexión externa.
