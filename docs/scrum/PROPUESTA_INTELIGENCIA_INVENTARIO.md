# Propuesta · Inventario que ayuda a decidir

Investigación: 2026-10-08. Actualización: Sinhue autorizó incorporar ST-41 (inventario operativo) y ST-42 (consumo por servicio) al backlog/Notion; ST-30 amplía análisis de productos. Estado: **definido y pendiente de desarrollo, sin implementación**. Los sprints de las historias nuevas son provisionales; no desplazan automáticamente el trabajo acordado. Motivación: observación del profesor de Sinhue sobre productos que no se venden, productos más vendidos y fugas de insumos.

## Valor agregado

Ayudar al dueño a saber qué producto conviene reponer, dónde tiene dinero detenido y qué diferencia de insumos necesita investigar. Cada recomendación muestra datos, periodo, sucursal y una acción posible. No modifica precios, ordena compras ni acusa a un empleado.

Las funciones de análisis de inventario ya existen en otros POS. La diferenciación propuesta es unir ventas, consumos por servicio y conciliación en un flujo sencillo de barbería; su utilidad debe comprobarse con pilotos, sin afirmar exclusividad.

## Lo que encontramos

- Shopify utiliza clasificación ABC según contribución a ingresos; su documentación aclara que esa clasificación no incorpora costo y no equivale a rentabilidad. Para SYSTECH separaríamos ranking de unidades, ingresos netos y margen. [Shopify: análisis ABC](https://help.shopify.com/en/manual/inventory-and-locations/fundamentals/abc-analysis).
- Lightspeed muestra inventario de baja rotación, última venta y valor a costo; permite comparar sucursales para investigar redistribución. No confundiremos valor de venta potencial con dinero invertido. [Lightspeed: inventario de baja rotación](https://x-series-support.lightspeedhq.com/hc/en-us/articles/25534172621083-Using-the-dusty-inventory-report).
- Los conteos físicos permiten reconciliar lo registrado y lo disponible, con atención a movimientos ocurridos durante el conteo. Esa medición es necesaria para encontrar diferencias; las ventas solas no revelan pérdidas reales. [Lightspeed: conteos de inventario](https://retail-support.lightspeedhq.com/hc/en-us/articles/229129948-Performing-inventory-counts-in-Retail-POS).

Estas fuentes sustentan los conceptos; los umbrales, fórmulas operativas y ejemplos siguientes son decisiones propuestas para SYSTECH, no recomendaciones universales de las fuentes.

## Lo que ya hay y lo que falta

Revisión de `reportes.routes.ts` y esquema Prisma: hay ranking básico de items, ventas, devoluciones, stock mínimo, costo del producto y Kardex. No equivale a recomendaciones conciliadas ni a margen histórico comprobado.

`Producto.stockActual`, `KardexMovimiento.cantidad` y sus saldos son enteros. No hay receta de consumo por servicio ni costo guardado en `VentaItem`. Cambiar el costo actual de un producto no debe cambiar la utilidad de una venta pasada. Estos puntos impiden prometer detección fiable de consumo de líquidos o rentabilidad histórica con el modelo actual.

ST-30 ya contempla resumen del dueño y excepciones accionables. ST-28 mide el negocio SaaS de SYSTECH, no la rentabilidad de cada barbería. ST-40 es experimentación con IA; este módulo no necesita un modelo de IA para calcular y explicar sus señales.

## Propuesta de historias

### 1. ST-30A propuesta · Productos que se venden y dinero detenido

Parte inicial de ST-30; código provisional, no nueva historia aprobada. Talla M, prioridad propuesta P1 de producto; no desplaza los requisitos P0 para salir a producción. Dependencias: ST-02, ST-05 y ST-06. La comparación entre sucursales requiere además ST-18. No necesita correo para mostrar resultados dentro del panel.

**Como dueño o gerente autorizado, quiero identificar productos más vendidos y productos con existencias que no se venden, para decidir qué revisar o reponer sin interpretar tablas complejas.**

Alcance inicial: productos de reventa, separados de servicios; filtro por sucursal y periodo; recomendaciones dentro del panel. Alertas por correo/WhatsApp mantienen sus dependencias de proveedor, consentimiento y consumo.

Ejemplos ilustrativos:

| Señal | Mensaje | Acción propuesta |
| --- | --- | --- |
| Sin movimiento | “Esta cera no tuvo ventas en los últimos 45 días observados; quedan 8 piezas. Valor estimado a costo actual: $960.” | Ver movimientos y revisar exposición, precio o reposición |
| Alta demanda | “Vendiste 12 pomadas netas en 30 días; quedan 2.” | Revisar compras pendientes y plazo del proveedor |
| Datos incompletos | “No conocemos el costo de este producto.” | Capturar costo; no mostrar margen inventado |

**Criterios de aceptación:**

1. Rankings por unidades netas e ingresos netos, con descuentos y devoluciones parciales conciliados por item. Excluir ventas canceladas, impuestos trasladados y propinas del ingreso comercial presentado; documentar periodo de devolución y redondeo.
2. Detectar ausencia de ventas solo con existencias positivas y ventana observada suficiente. Umbral inicial propuesto 45 días, configurable. Si no hay historia suficiente: “datos insuficientes”; no “lleva 45 días sin vender”. No inferir fecha de alta desde la última venta.
3. Mostrar última venta conocida o “sin venta registrada”, unidades, periodo y stock. Distinguir un producto estacional/inactivo y permitir posponer la señal con motivo.
4. Valor detenido = existencias positivas × costo unitario actual disponible, etiquetado como estimación. Costo ausente/cero sin confirmar no se trata automáticamente como gratuito; mostrar cobertura de datos.
5. Cobertura estimada opcional = stock / promedio de unidades netas por día observado. Sin movimiento, faltantes o historia incompleta no mostrar una fecha cierta de agotamiento. Alertar si el promedio fue afectado por días sin stock; no dar compras exactas sin plazo del proveedor.
6. Cada señal permite abrir sus ventas y movimientos. Mostrar recomendación como sugerencia; no cambiar stock/precios ni ordenar automáticamente.
7. Dueño y gerente solo ven el negocio y sucursales autorizados. Deduplícar señales por producto/sucursal/regla; mostrar unas pocas priorizadas, no una alerta por cada acceso.
8. Probar datos vacíos, negocio nuevo, nombres repetidos con IDs distintos, devolución en otro periodo, cero ventas, costos ausentes, empate, zona horaria de sucursal y aislamiento entre negocios.

Evidencia: dataset pequeño de importes conocidos, conciliación con exportación/ventas, pruebas en SQLite y PostgreSQL y recorrido móvil del dueño. Las devoluciones deben descontarse conforme a una política fechada de actividad del periodo; no se debe sumar el total de toda la vida del item a un periodo arbitrario.

### 2. Propuesta de continuación · Margen de contribución por producto y servicio

Código por asignar al refinar ST-30; talla M/L según diseño de costos. Depende de la primera historia y de costos históricos comprobados. No se incluye en la entrega inicial por reutilizar el costo mutable del catálogo.

**Como dueño, quiero conocer qué venta deja más contribución después de sus costos directos, para mejorar mi oferta sin confundir ventas altas con utilidad alta.**

Criterios principales:

- Guardar costo unitario aplicado en el momento de la venta y procedencia/método de valuación. No recalcular históricos con el costo actual. Operaciones previas sin costo suficiente se muestran incompletas.
- Contribución propuesta = ingreso neto sin impuestos/propinas − costo histórico de mercancía o insumos consumidos − comisión aplicada − otros costos directos registrados. Explicar qué incluye; no llamarla utilidad neta porque no resta renta ni otros gastos fijos.
- Devoluciones/cancelaciones y comisión revertida preservan la coherencia. No confundir devolución de dinero con regreso físico del producto: la reposición de stock depende de condición/disposición.
- Servicios solo muestran margen cuando exista receta/costo de consumo válido o un método directo documentado. Separar estimación y gasto registrado.
- Caso conocido y costo cambiado después de vender: el margen histórico permanece igual. Mostrar porcentaje de ventas con costos completos.

### 3. Propuesta de continuación · Consumo y diferencias de insumos por servicio

Código por asignar; talla L, dividir en modelo de consumo y conciliación antes de programar. No cabe responsablemente como un único criterio agregado al ranking de ventas.

**Como dueño, quiero comparar insumos esperados y conteos reales, para investigar desperdicio, usos no registrados o errores y cuidar el costo de cada servicio.**

Alcance y aceptación:

1. Separar mercancía para reventa de insumos de operación. Permitir presentación y unidad base compatibles: frasco 500 ml, consumo 5 ml por servicio; piezas para navajas. Usar decimales de precisión definida o enteros en una unidad menor, nunca truncar consumos a piezas. No convertir gramos a ml sin una equivalencia válida.
2. Recetas versionadas por servicio y vigencia; guardar el consumo aplicado a cada servicio completado. Editar la receta mañana no reescribe el pasado. Evitar descontar dos veces cuando cita y venta representen el mismo servicio; definir el evento único de consumo.
3. Registrar conteo inicial, compras/recepciones, ventas de mercancía, consumo, mermas documentadas y transferencias. Contemplar un frasco abierto; documentar cómo se mide y su tolerancia.
4. Existencia esperada al corte = inicial + entradas + devoluciones físicas aptas + transferencias recibidas − ventas físicas − consumo aplicado − mermas documentadas − transferencias enviadas. **Faltante no explicado = esperado − conteo físico**, positivo si falta; exceso si es negativo. La merma registrada no se vuelve a contar como fuga desconocida.
5. Conteo con fecha de referencia, auditoría y movimientos concurrentes conciliados. Capturar un conteo no ajusta stock silenciosamente: revisión y ajuste autorizado con motivo, sin duplicarse al reintentar.
6. Devolver dinero de un servicio ya realizado no repone champú o una navaja usados. Cancelar antes de prestarlo no consume; las correcciones exigen motivo y trazabilidad.
7. Alertar solo sobre diferencias superiores a tolerancia configurada y con datos suficientes; nunca acusar robo ni atribuir responsabilidad a un barbero por una diferencia de inventario compartido.
8. Probar unidades, redondeo acumulado, recipiente abierto, cambio de receta, devoluciones, transferencias, corte concurrente, reintentos y separación de sucursales/negocios.

Ejemplo ficticio: 500 ml iniciales, 60 cortes × 5 ml y ninguna otra entrada/salida → 200 ml esperados. Conteo 150 ml → 50 ml de diferencia pendiente de explicar. Una medición imprecisa o receta equivocada también puede producir esa diferencia.

## Qué entregaría primero

Propuesta: iniciar con ST-30A tras revisión de Sprint 2 y planificación de producción, sin prometerla para el piloto hasta estimar el alcance. Primero ranking y productos estancados; después costos históricos y control de insumos. La interfaz del dueño sería “Oportunidades y diferencias”, con tarjetas breves y botón “Ver por qué”.

El control básico de stock y los saldos deben seguir siendo claros en todos los planes. El resumen avanzado podría diferenciar Pro y las comparaciones Cadena, sujeto a validación con pilotos; no se modifican precios ni capacidades por esta propuesta.

## Costo y medición de valor

La primera versión usa consultas y reglas del servidor existente. No requiere nuevos conectores ni pago por tokens de IA. Eso no implica costo cero: hay trabajo de desarrollo, consultas, almacenamiento y soporte; habría que medirlos con carga real. Agregar consumo físico necesita capacitación y conteos, que pueden ser la mayor fricción para el dueño.

Piloto propuesto con tres barberías: registrar qué señales revisan, qué decisiones toman, tiempo de configuración/conteo, y diferencias conciliadas. Medir valor a costo del stock estancado y ventas/margen posterior según datos disponibles; no sumar sugerencias como dinero recuperado. Una decisión “no comprar de nuevo” se valida con registros, no con un clic de alerta.

ABC, pronósticos, promociones sugeridas y redistribución entre sucursales quedan para una ampliación si hay historial suficiente. No descontar productos automáticamente ni prometer predicciones exactas con pocas ventas.

## Integración con el backlog

El análisis de productos se incorpora al desglose de **ST-30**, sin duplicar reportes. ST-41 fortalece entradas, conteos y ajustes; ST-42 incorpora unidades, recetas y diferencias. El backlog ahora tiene 42 historias. Mantener ST-28 para métricas de SYSTECH y ST-40 para evaluar IA cuando aporte algo frente a estas reglas. Las nuevas historias están Pendiente; los estados anteriores no cambian. Refinar las entregas y estimar capacidad antes de iniciarlas.
