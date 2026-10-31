# Contratos y reutilización — producto completo

Fecha: 11/oct/2026. Autor: agente de producto y reglas. Alcance: análisis de código y definición para el coordinador; no implementación ni aceptación de pruebas. El repositorio es compartido y otros agentes trabajan: este mapa describe la lectura de partida y debe cotejarse con sus entregas antes de implementar.

## Evidencia y autoridad

Fuente del alcance: PLAN_PRODUCTO_COMPLETO_2026-10-11_1815.md. Evidencia anterior: docs/evidencias/identidad-studio-20261011/REPORTE.md acredita nueve verificaciones de cierre anteriores y un recorrido visual concreto; no prueba los nuevos contratos de este documento. Ninguna prueba ejecutada por este agente. No cambiar precios, porcentajes existentes, condiciones comerciales ni activar reglas nuevas por defecto.

El sistema usa Express, Prisma y modelos equivalentes SQLite/PostgreSQL. La autorización no depende solo de filtros escritos en cada ruta: authorization.service.ts tiene routePolicy y middleware Prisma modelScope/scopeSelection, incluyendo relaciones anidadas. Cada modelo y ruta nueva necesita integración en esas listas; un endpoint correcto sin ese registro puede denegarse, y un modelo nuevo sin sucursal puede quedar demasiado amplio. Las operaciones públicas no tienen requestAccess: deben limitar explícitamente negocio y sucursal.

## Mapa de las 21 tareas

| Bloque | Existe / archivo de partida | Falta real y condición de reutilización |
|---|---|---|
| PC-01 | inventario.routes.ts, POSOperacion, transacción de venta | Alta/Kardex separados y ajuste absoluto en partida; backend asignado está incorporando InventarioOperacion/metadataJson. Integrar su resultado, no crear otra capa de intención. |
| PC-02 | InventarioView, KardexMovimiento, proveedores.routes y órdenes/recepción | Snapshot de costo/proveedor/documento, uso interno separado y resultado recuperable. Recepción de orden debe usar mismo escritor de stock. |
| PC-03 | Ajuste manual, no modelo de conteo encontrado | Borrador persistente parcial, versión/saldo de referencia, conciliación segura y confirmación idempotente. |
| PC-04 | Stock/Kardex Int; cantidad de VentaItem Int | Clasificación insumo y unidad, conversión/presentación, cantidades precisas, receta versionada y evento único de consumo. |
| PC-05 | Kardex y alerta mínimo | Conciliación esperada-vs-contada por unidad, tolerancia explícita, datos faltantes; depende de PC-03/04. |
| PC-06 | Agenda EN_CURSO/COMPLETADA, referencia privada, POS, CashCustody | Jornada propia y transición con contexto a POS; no crear un segundo cobro. |
| PC-07 | POST /citas/walk-in crea cita EN_CURSO inmediatamente | Fila persistente previa a asignación y control concurrente del turno. ListaEspera es otro propósito; no confundir con cola presencial. |
| PC-08 | BloqueoHorario y createScheduleBlock, calendario y horario/descanso | Preview de afectados, ausencia con conflicto conservado y cambios de turno por fecha. Bloqueo actual rechaza si existen citas afectadas. |
| PC-09 | createBooking acepta servicioIds, calculateMultiServiceTotals y Cita.serviciosJson | UI aún selecciona uno; POS carga uno por servicioId/precio vigente. Completar selección y cobro de todas las líneas con snapshots. |
| PC-10 | Precio catálogo y snapshot de cita; no override por barbero encontrado | Regla opcional versionada y resolución autoritativa antes de elegir slot. Nunca usar precio del payload. |
| PC-11 | Descuento centavos/por línea; BARBERO >20% rechazado en pos-sale.service.ts | Política opcional y aprobación identificada/vinculada al carrito; conservar límite preexistente cuando no hay política. |
| PC-12 | cash-ledger.service, cortes.routes, resumen congelado y cierreHash; CashCustody | Flujo guiado sin revelar esperado antes de conteo ciego; probar financiero existente antes de modificar. |
| PC-13 | MovimientoCaja GASTO_MENOR y ledger ya cubren salida efectivo | Gasto independiente bancario/categoría/fecha/comprobante, enlace único a salida de caja y corrección no destructiva. |
| PC-14 | reportes/dashboard ventas/comisiones/topItems, operación/resumen | Histórico de costos, gastos, ocupación efectiva, cobertura y lentos con datos suficientes. Orden topItems actual es ingresos, no unidades. |
| PC-15 | CRM, CitaReferencia, visitas incrementadas al completar/cobrar, rebooking | Historial solo completados para preferencias; barbero no tiene acceso al endpoint financiero cliente/:id (cash roles); endpoint reducido propio. |
| PC-16 | onboardingProgress cuatro pasos; ventas CSV y sanitización | Stock inicial/enlace público/checklist, importación CSV transaccional previa validación y recuperación por lote. |
| PC-17 | Búsqueda individual en módulos, clientes limitado a100 | Búsqueda global acotada en servidor; api.getClientes envía search pero ruta recibe busqueda: corregir compatibilidad. |
| PC-18 | bookingPersonalizationSchema, temas/portadas/equipo/descripcionesServicios | No duplicar descripción por servicio ya disponible; agregar galería pública autorizada/instrucciones/políticas en contrato existente. |
| PC-19 | Identidad Studio, OperationDialog/State, financialIntent | Revisar pantallas secundarias y estados financieros inciertos; no otra reescritura estética. |
| PC-20 | AuditoriaLog + eventos en venta/cita/devolución/caja | Vista legible del dueño y eventos nuevos; /admin/auditorias es SUPER_ADMIN, no reutilizarlo para dueño. |
| PC-21 | Fixtures aislados y scripts específicos anteriores | Escenarios completos nuevos, concurrencia/fallo/recarga y QA independiente: existencia del script no equivale a aprobación. |

## Contratos comunes obligatorios

- Contexto obtenido de sesión: tenantId, actorId y sucursales autorizadas. Datos del cuerpo nunca elevan rol o sustituyen responsable. DUENO alcance negocio; GERENTE sucursales asignadas; BARBERO perfil propio; permisos caja ya existentes. No asignar permisos de inventario al barbero por ser conveniente.
- Mutación: idempotencyKey estable por intención y hash canónico de contenido, incluidas referencias/unidad/fecha/alcance. Reintento idéntico recupera resultado; mismo identificador con contenido diferente →409. Evitar hash que dependa del orden accidental de claves. Guardar resultado en la misma transacción que el hecho; error incierto en UI conserva intención.
- Respuesta financiera nueva: resultado confirmado, replayed, operación y referencias de hecho; errores code y mensaje útil, sin claves/tokens. No borrar intención local hasta resultado confirmado o consulta que demuestre no realizada.
- Todos los importes son centavos en cálculo o Decimal con redondeo monetario vigente; no Number flotante para reparto. Cantidad física decimal tiene precisión distinta del dinero. Snapshots de costo y nombre son históricos, no joins al costo actual.
- Períodos por zona de sucursal, intervalos [inicio, fin); fuente/ventana visible. No timestamp de máquina para definir día comercial.
- Reutilizar financialTransaction/lockBranch y ordenar bloqueos de Producto por ID para evitar inversión de locks. Productos compartidos requieren lock de producto entre sucursales, no solo lockBranch.

## PC-03: conteo parcial y concurrencia

Contrato sugerido, pendiente de tipos concretos del backend: Conteo con tenant/sucursal, estado BORRADOR/CONFIRMADO/CANCELADO, autor, revisión y fechas; filas con producto, unidad, saldoReferencia, versiónInventario, cantidadContada nullable, fechaConteo y motivo. La cantidad cero explícita es conteo; null no contado. Snapshot por línea en el momento de contar, no asumir que un borrador de tres días es una única foto física.

1. Crear/guardar borrador devuelve revisión; edición con expectedRevision obsoleta →409 y detalle para recargar, nunca sobrescribir trabajo de otro operador.
2. Al tomar conteo de línea capturar versión del artículo y saldo de referencia. Registrar movimiento/versión después de la referencia. ID autogenerado sin orden no constituye reloj; fecha sola no resuelve dos movimientos simultáneos.
3. Confirmar solo líneas contadas, con intención estable y revisión esperada. En transacción bloquear artículos ordenados y volver a comparar versiones. Política segura inicial: si cambió desde el conteo físico, rechazar esa confirmación con STOCK_CHANGED_DURING_COUNT y artículos que requieren recontar; preservar borrador. No sumar movimientos automáticamente sin conocer si físicamente ocurrieron antes o después del conteo.
4. Si versión coincide: delta=contado−referencia; Kardex compensatorio, saldo actual+delta; guardar motivo, autor y fuente conteo/linea. Delta0 también deja comprobante de conteo, sin inventar salida/entrada.
5. Confirmación completa es transaccional para filas elegidas; reintento devuelve el mismo comprobante. Conteo parcial no pisa artículos omitidos.

Contrato anterior satisface la salida segura autorizada por plan: cuando no se puede reconciliar con certeza, impedir y explicar recontar. Evolución futura de conciliación automática necesitaría hora física confiable por movimiento, no solo registros de servidor.

## PC-04/05: unidades, recetas y diferencias

Reventa existente conserva unidades enteras en venta; no convertir una pomada de stock7 a7ml ni reinterpretar artículos antiguos. Producto físico mantiene tipo PRODUCTO con clasificación REVENTA/INSUMO y unidadBase PIEZA/ML/G; servicio sigue sin stock. Stock/Kardex y mínimo pasan a Decimal de precisión explícita, ambos schemas/migraciones sincronizados; conversión de enteros existentes produce el mismo valor en PIEZA. Presentación con factor positivo: frasco500ml→500ML, caja12piezas→12PIEZA; no conversión ml↔g sin densidad explícita, que no se presume. Cantidades base hasta tres decimales con rechazo de precisión excedente es una elección técnica inicial documentada, no redondeo silencioso de captura.

Receta versionada e inmutable al usarla: servicioId, versión, vigencia, líneas insumoId/cantidadBase/unidad. Nueva edición crea versión; consumo guarda esa versión y costo unitario usado. Artículo eliminado/inactivo no puede incorporarse a receta nueva. Consumo puede partir de cita completada o venta directa pero tiene una identidad común de atención: citaId cuando existe; ventaId solo atención sin cita. No crear dos eventos para cambio de estado y venta de la misma cita.

Regla de ejecución recomendada para aceptar plan: consumir al completar atención de cita, o al confirmar venta de servicio directo sin cita. Si caja cobra cita aún no completada, completa+consume en esa misma transacción. Cita ya completada conserva consumo original al cobrar. Cancelar antes no consume; reembolso monetario no devuelve ml/g utilizados. Falta insumo genera fallo explícito/reversible, no stock negativo; resolver mediante entrada/corrección autorizada antes de completar. Contrato depende de integración simultánea en changeBookingStatus y processSale, no basta una utilidad aislada.

Diferencia por unidad =saldo esperado−conteo físico: esperado=inicial+entradas+devoluciones físicas aptas−salidas reventa−consumos−mermas−uso interno±correcciones. No restar dos veces insumo vendido y receta si son distintos hechos sobre misma unidad. Mostrar diferencia y tolerancia configurada; sin método/tolerancia elegidos mostrar Sin tolerancia definida y cifra, no alerta de robo. Frasco abierto requiere medición real o método elegido (no estimar por imagen). Historial previo a consumo versionado: Sin información suficiente para atribuir consumo anterior; mantener corte de fecha de inicio de medición.

## PC-07/08: presencial y capacidad

Cola separada de Cita: ingreso no reserva un profesional ni obliga teléfono. Identidad fila persistente, secuencia por sucursal, estado ESPERANDO/ASIGNADO/EN_ATENCION/RETIRADO, servicio(s), preferencia profesional opcional, citaId única al asignar. Asignar hace compare-and-set desde ESPERANDO bajo lock de sucursal, elige profesional con reglas de booking; crea una cita única usando intención derivada de fila y no crea venta. Reasignar conserva cita/filas y verifica horario; retiro conserva historia. El walk-in actual que inicia de inmediato puede seguir como acción Atención inmediata, explicada, o integrarse en asignación sin duplicarlo.

Ausencia es un bloqueo con tipo adicional; cambio puntual de turno es excepción fechada al horario base, no edición permanente del barbero. Disponibilidad única en booking-operations y pública. Agregar preview autoritativo de citas afectadas. Si se permite registrar ausencia con citas afectadas, conservar sus citas y marcarlas Conflicto por resolver, bloquear nuevos cupos; el preview/hash de afectados debe revalidarse en confirmación porque puede llegar reserva entre ambos pasos. No cancelar por defecto. El bloqueo ordinario actual puede conservar su rechazo BLOCK_CONFLICT; no convertir ese permiso en poder de cancelar. Ausencias multidía respetan tope actual31días por segmento o contrato nuevo explícito; no prometer vacaciones ilimitadas sin cambiarlo.

## PC-09/10/11: precio, paquete de visita y autorización

Reusar servicioIds y serviciosJson; seleccionados únicos, máximo10 vigente, duración≤480 vigente, mismo profesional y una sola Cita. Orden explícito de presentación si se desea; el código actual carga por ID y no conserva orden de click. Snapshot de línea existente {id,nombre,duracion,precio}; extender con costo conocido/versionPrecio sin quitar campos. POS recibe todos los servicios y el snapshot con citaId; servidor debe usar precio reservado para las líneas de esa cita, no comparar con catálogo actualizado como si cliente intentara inventarlo. Agregar producto de reventa conserva precio catálogo elegido según política vigente. Gestión pública/reprogramación conserva bloque completo y precio original.

Precio por profesional opcional: regla negocio/sucursal/servicio/barbero, intervalo vigencia no solapado y versión. Sin regla hereda catálogo. Disponibilidad y resumen calculan regla antes de confirmar; no usar input.precioEstimado como autoridad. No tocar precio de venta de artículos existentes. Activación solo al dueño guardar una regla explícita; plan no introduce tarifas nuevas.

Descuentos existentes: cálculo reparte centavos por mayores restos, base comisión por línea neta sin impuesto incluido ni propina; BARBERO>20% exige dueño/gerente según error vigente. Política nueva opcional no reemplaza ese límite automáticamente. Aprobación debe resultar de sesión autorizada propia, almacenada y vinculada a hash carrito+cliente+profesional+sucursal+descuento/total y plazo explícito mostrado. No PIN compartido. Una aprobación usada no puede trasladarse a otra venta; reintento de misma venta conserva resultado. No definir monto/porcentaje/plazo comercial sin elección humana; si no se implementa elección, la función permanece sin políticas nuevas.

## PC-12/13/14: efectivo, costo y utilidad

Reusar RegistroCaja, CajaOperacion, cashSummary/cashOperation/drawerBalance y cierreHash. El GASTO_MENOR actual ya crea MovimientoCaja y ledger; no sumar una segunda salida al añadir GastoOperativo. Registro gasto efectivo referencia única de MovimientoCaja/RegistroCaja; bancario no toca cajón. corrección conserva original, compensa importe/método/categoría y motivo, idempotente. Una compra inventario puede generar entrada y salida caja pero su importe de adquisición no es otra vez costo de ventas y gasto operativo; categoría COMPRA_INVENTARIO excluida de gasto consumido en utilidad. Comisiones devengadas separadas del desembolso por nómina; pago comisión no se resta por segunda vez de resultado.

Ventas netas para resultado = líneas después descuentos/devoluciones sin impuesto incluido y sin propina; mantener indicador de cobros total existente con nombre distinto, pues venta.total incluye propina. Costo de lo vendido proviene de snapshot por VentaItem/consumo, no Producto.costo actual. Costo desconocido no es cero: bandera costoConocido, null histórico y indicador incompleto; no fabricar margen histórico copiando costo actual a ventas anteriores. Utilidad operativa estimada=ventas netas−costo histórico consumido−comisiones netas devengadas−gastos operativos del período. No denominar utilidad fiscal.

Reutilizar reporte actual con correcciones: usa fecha del servidor para período hoy/mes y carece fin explícito; todas las tarjetas deben compartir fecha/sucursal/filtros. Comisiones pagadas/pendientes actualmente consulta sin período, mostrar claramente saldos acumulados o filtrar para no compararlos como costo periódico. topItems agrupa por nombre; cambiar a productoId/tipo para no mezclar artículos homónimos. Mantener top ingresos y top unidades separados. Métodos MIXTO debe repartir componentes y devoluciones con ledger existente, no presentar todo como medio único.

Ocupación: intervalos disponibles por profesional restando descansos/bloqueos/ausencias/excepciones; unión de minutos (no suma duplicada de intervalos solapados). Numerador servicios programados y completados separado, excluir canceladas/no-show, limitar al período; mostrar si incluye margen. No dividir por0. Cobertura: saldo actual/consumo diario de una ventana visible con datos, sin ventas→Sin consumo registrado. Nuevo artículo no se considera fracaso: mostrar fecha de alta/primera medición y ventana, umbral elegido o descripción neutral sin juicio.

## Secuencia y puertas de integración

1. Integrar PC-01/02 del escritor asignado y probar fuente única de stock; confirmar costo snapshot, cambios de schema y autorización.
2. PC-03 con versión por artículo y controles de fila; prueba venta simultánea exige recontar sin pérdida.
3. PC-04 decimal/migración, receta y evento; controlar concurrencia appointment/status vs POS; PC-05 conciliación usa esos hechos.
4. En paralelo sin schema compartido: frontend PC-06/12/19 reusa APIs; experiencia PC-18 extiende schema personalización con coordinador.
5. Operación PC-07/08/09 acuerda modelos/API con único escritor schema. PC-09 tiene alto aprovechamiento API; arreglar fuente de precio antes de UI multservicio.
6. PC-13 gasto+ledger, PC-10/11 reglas opcionales y aprobación solo con contrato aceptado; nuevas rutas/modelos agregadas a routePolicy/modelScope.
7. PC-14 después costo/gastos/disponibilidad; PC-15/16/17/20 por APIs reducidas de rol. No exponer CRM financiero al barbero para reutilizar componente.
8. PC-21 QA independiente sobre fixtures temporales: confirmación repetida, payload distinto con misma intención, dos operadores, cambio catálogo después reserva, servicio completado antes cobro, devolución sin recuperar insumo, compra efectivo sin doble costo, importe mixto y aislamiento entre sucursales/negocios. Capturas y persistencia después recarga, no solo código revisado.

## Pendientes técnicos que no equivalen a validación externa

Método/tolerancia física frascos abiertos, cambios de políticas comerciales y aceptación comprador no se sustituyen con agentes. Roles existentes de permiso se conservan; ampliaciones explícitas solo para capacidades nuevas dentro del plan. PostgreSQL requiere entorno fixture independiente y prueba efectiva, no el hecho de editar schema.postgres. Hardware/servicios externos fuera de ejecución. Registrar cualquier criterio no satisfecho en el tablero sin declararlo completado por este análisis.

## Actualización de implementación frontend — 12/oct/2026

PC-07/08 tienen frontend integrado en AgendaView mediante ArrivalQueue y ScheduleChanges, sin rutas ni configuración central duplicadas. El mapa inicial anterior describe la partida; esta sección reemplaza sus pendientes de UI para estos dos bloques. Estado de entrega: **Implementada, pendiente de aceptación independiente en navegador**.

- Fila: GET /citas/fila?sucursalId; POST alta con servicios únicos y preferencia; acciones asignar/reasignar/atender/retirar por ID con versionEsperada e idempotencyKey. Estados ESPERANDO→ASIGNADO→EN_ATENCION→ATENDIDO; RETIRADO solo desde esperando/asignado y con motivo. Backend conserva citaId y devuelve contexto mínimo de cita para abrir su fecha real. Atención inmediata existente se distingue por nombre de la fila.
- Intenciones frontend por tenant/usuario/sucursal: payload original persistido, controles bloqueados ante resultado incierto y recuperación POST idéntica. Cambios de versión requieren consultar nuevamente, sin reemplazar una intención incierta con otros datos. Perfiles de barbero solo pueden elegir su propia asignación; permisos autoritativos permanecen en API.
- Ausencias/vacaciones/turno especial: POST /bloqueos/impacto devuelve hash, cambio normalizado, zona y citas afectadas. Confirmar requiere hash vigente e intención estable; afectados requieren reconocimiento explícito. IMPACT_CHANGED invalida revisión y pide recalcular. No se cancela ni contacta automáticamente a clientes.
- Citas GET contienen conflictos legibles. Agenda permite abrir cada cita conservada y usar gestión existente. Un servicio terminado sin venta muestra cobro pendiente, no venta registrada.
- Fecha del formulario de disponibilidad sincroniza con la agenda cuando está sin cambios y sin operación pendiente. Un borrador modificado conserva fechas y muestra aviso al cambiar de día. Cambiar de sucursal descarta contexto visual anterior y mantiene intenciones guardadas en su alcance original.
- Actualización de fila se pausa con pestaña interna oculta/documento oculto y mientras hay mutación. Fallo de consulta muestra información desconocida; no interpreta filas vacías por error como cero llegadas.
- Verificación del implementador: TypeScript aprobado; 16 escenarios de helpers de transición/revisión ejecutados. No equivalen a pruebas de permisos, persistencia o concurrencia de API ni recorridos de navegador. El coordinador conserva responsabilidad de la aceptación integrada y sus capturas.
