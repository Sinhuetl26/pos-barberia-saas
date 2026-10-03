# Reauditoría del POS de barbería — 3 de octubre de 2026

## Resumen ejecutivo

Revisé el ZIP `POS_Barberia_Software.zip`, contrasté el código con `REPORTE_BUGS_CAMBIOS_MEJORAS_SYSTECH.md`, hice una inspección estática de API, base de datos y flujos clave del frontend, y ejecuté build, pruebas declaradas y auditoría de dependencias.

**Veredicto:** hay avances comprobables, pero el paquete todavía **no está listo para operar con dinero o datos de clientes reales**. El build pasa; varias pruebas no llegan a ejecutarse contra una API funcional y hay errores concretos de permisos, clientes, pagos, inventario, caja y contratos entre UI/API. La situación de despliegue PostgreSQL continúa bloqueada por el schema activo y la ausencia de migraciones.

> **Prioridad inmediata:** cerrar acceso de onboarding y cambios multi-tenant de clientes, impedir registrar pagos insuficientes, corregir conciliación de caja/stock, y decidir un único motor de base de datos con migraciones aplicables.

## Alcance y límites

- Esta revisión cubre **el ZIP entregado**, no un repositorio Git ni su historial. Puedo contrastar el estado actual con el reporte previo incluido, pero no identificar qué commit corrigió cada punto.
- Build ejecutado localmente con Node 22 y dependencias del lockfile. No configuré Stripe, Meta, correo ni un entorno de producción; tampoco levanté Docker contra una base de datos real.
- La revisión es estática salvo el build, `npm test` y `npm audit`. No hice pruebas de penetración, carga, aceptación con usuarios ni revisión legal.
- No modifiqué el software; este entregable es diagnóstico y hoja de ruta.

## Comprobaciones ejecutadas

| Comprobación | Resultado | Qué significa |
|---|---|---|
| `npm ci --ignore-scripts` | Completó | Instalación basada en el lockfile; advertencias de paquetes antiguos. |
| `npm run build` | **Pasa** | Prisma Client se generó; TypeScript API/web compila y Vite genera el frontend. |
| `npm test` | **Falla: 0/4 suites exitosas, 0 pruebas individuales verificadas** | Fases 0, 2 y 3 no encontraron API en `localhost:3001`; fase 1 no pudo cargar `../apps/api/src/services/pricing.service` con Node. No es evidencia de que los casos funcionales hayan pasado. |
| `npm audit` | **10 vulnerabilidades: 7 altas y 3 moderadas** | Mayormente en dependencias de desarrollo/transitivas; las actualizaciones sugeridas incluyen saltos mayores. Hay que revisar el árbol y actualizar con pruebas, no aplicar `--force` a ciegas. |
| Archivos secretos/locales en el ZIP | No encontré `.env`, `dev.db`, claves PEM ni archivos `.key` | Es buena señal para este ZIP; aún hay un secreto fijo en `apps/api/.env.example`. |

El README anuncia una suite de 79 pruebas, pero en esta ejecución no se verificó ninguna. Hay que cambiar el proceso de pruebas para que prepare su propia base temporal y API, o documentar explícitamente sus precondiciones y separar las pruebas unitarias que hoy no cargan TypeScript.

## Hallazgos priorizados

### P0 — No operar con clientes/pagos reales hasta corregir

#### 1. Modificación y borrado de clientes sin aislamiento por tenant — **Crítico**

`apps/api/src/routes/clientes.routes.ts:203-224, 274-292` obtiene `tenantId`, pero `PUT /clientes/:id` y `DELETE /clientes/:id` hacen `update({ where: { id } })` sin verificar que ese cliente pertenezca a la barbería del usuario. En cambio, el `GET /:id` sí filtra por `tenantId`.

**Impacto:** un usuario autenticado que conozca un UUID puede cambiar datos de un cliente de otra barbería o marcarlo como borrado por ARCO. Los endpoints tampoco tienen control de rol.

**Corrección/aceptación:** todas las mutaciones deben comprobar `{ id, tenantId }` dentro de la operación; el endpoint debe devolver 404 para un ID de otro tenant. Añadir prueba de aislamiento A→B para editar y borrar.

#### 2. Onboarding alternativo anónimo, con cuenta activa y clave predeterminada — **Alto / bloqueante**

`apps/api/src/routes/auth.routes.ts:345-473`: `POST /onboarding/setup` no aplica `requireAuth`, rate limit ni esquema de validación. Crea tenant y suscripción `active`, y si no se manda contraseña utiliza `Admin@Systech2026!` (`:410`). El objeto Prisma `dueno` se incluye completo en la respuesta (`:460-468`), incluyendo `passwordHash`.

La respuesta revela el hash de la cuenta recién creada (no el de una cuenta existente), pero el endpoint permite altas sin límites y usa un secreto conocido si falta la contraseña. Esto abre abuso de recursos y cuentas predecibles; además diverge del onboarding autenticado esperado. El montaje hace accesible el endpoint como `/api/auth/onboarding/setup`; el montaje alternativo `/api/onboarding` duplica el segmento y no arregla el endpoint.

**Corrección/aceptación:** si es parte de registro público, validar estrictamente, exigir contraseña fuerte explícita, rate limit/verificación y no retornar nunca `passwordHash`; si es una configuración posterior al registro, exigir sesión y pertenencia al tenant. Prueba anónima, sin contraseña y respuesta sin hash.

#### 3. El POS permite registrar una venta aunque el efectivo recibido no alcance — **Alto**

`apps/web/src/views/PosView.tsx:612-695`: el botón **Confirmar Venta** no se deshabilita ni muestra un error cuando el efectivo recibido es menor al total. El pago mixto deja modificar importes y no valida que efectivo + tarjeta sumen exactamente el total.

El frontend envía `montoEfectivo` y `montoTarjeta` (`:240-250`), pero `createSaleSchema` (`apps/api/src/validators/schemas.ts:41-55`) no define esos campos; el backend persiste `detallesPago` (`pos.routes.ts:24-29, 128-129`). Zod descarta por defecto las propiedades desconocidas y la venta se guarda por el total completo sin conservar el reparto del pago.

**Impacto:** se puede marcar como pagada una venta con importe cobrado menor; el pago mixto no queda desglosado y el corte no puede atribuirlo a efectivo/tarjeta.

**Corrección/aceptación:** validar pagos en servidor: suma de medios = total, efectivo recibido ≥ importe en efectivo, cambio calculado, importes no negativos. Definir un único contrato para `detallesPago`; rechazar payloads incoherentes. Pruebas de efectivo insuficiente, mixto incompleto/sobrante y redondeo.

#### 4. Cobro exitoso seguido de error de ticket puede invitar a cobrar dos veces — **Alto**

`apps/web/src/views/PosView.tsx:230-264`: primero se crea la venta, luego se solicita el ticket; si falla esa segunda llamada, el `catch` informa **“Error al cobrar”** y no limpia el carrito. La venta ya existe en la base de datos, pero el cajero puede reintentar y crear un segundo cobro. No hay clave de idempotencia visible en el contrato de ventas.

**Corrección/aceptación:** desacoplar el éxito del cobro de la impresión; mostrar “venta registrada, ticket no disponible” y conservar el folio. Implementar idempotencia por intento de checkout y prueba donde falla únicamente la consulta/imprenta del ticket.

#### 5. Caja acepta movimientos sin límites de tenant/turno y no los incluye en el arqueo — **Alto**

`apps/api/src/routes/cortes.routes.ts:136-160`: `/movimiento` no verifica rol, sucursal, tenant, corte abierto ni correspondencia entre `corteCajaId` y `sucursalId`; usa `Number(monto)` sin un esquema numérico positivo. `cash.service.ts:37-103` calcula el esperado solo con fondo inicial y ventas; no incorpora ingresos, retiros y gastos de `MovimientoCaja`. El cierre (`cortes.routes.ts:92-120`) filtra ventas canceladas, pero solo usa `fecha >= fechaApertura`, sin fecha de cierre superior.

**Impacto:** cualquier rol autenticado puede alterar movimientos; un gasto real no reduce el efectivo esperado y produce un descuadre falso. Una venta luego del cierre puede no corresponder a ningún turno.

**Corrección/aceptación:** validar tenant+sucursal+corte ABIERTO y permiso; registrar cantidades positivas con el tipo de movimiento; incluir todos los movimientos en el resumen; vincular las ventas al turno o acotar estrictamente por apertura/cierre. Impedir dos cajas abiertas concurrentes por sucursal y probar caja con gasto, retiro, ingreso, venta cancelada y venta fuera del turno.

### P1 — Corregir antes de un piloto operativo

#### 6. RBAC parcial: barberos pueden actuar sobre recursos que no les corresponden — **Alto**

Hay `requireRole` en algunas rutas, pero no una política uniforme:

- `pos.routes.ts:14-44`: crear venta requiere autenticación, pero no limita a un barbero a su propio perfil/sucursal; puede atribuir una venta a otro barbero del mismo tenant.
- `citas.routes.ts:67-137, 140-196`: crear cita y cambiar estados no tienen autorización por rol ni restringen agenda al barbero propio.
- `cortes.routes.ts:37-68, 136-160`: abrir caja y registrar movimientos no exigen rol de dueño/gerente.
- `auth.routes.ts:302-310`: cambios de configuración del tenant requieren autenticación, no explícitamente rol de gestión.
- `auth.ts:45-52, 87-99`: consulta el rol vigente de DB, pero el contexto se construye desde `payload.rol`; tras degradar el rol, un JWT de 24 h conserva permisos antiguos.

**Corrección:** matriz de permisos central; relacionar usuario y barbero por ID (no solo email); verificar tenant y sucursal propia en cada operación; comparar rol vigente en DB o invalidar sesiones/versionar tokens. Pruebas 403 por cada ruta de escritura de un usuario `BARBERO`.

#### 7. Las ventas del POS nunca se enlazan con clientes del CRM — **Alto, defecto de integración**

`PosView.tsx:37, 240-251, 439-449` solo muestra una caja de texto `selectedClienteNombre` y envía `clienteNombre`; no selecciona un cliente ni manda `clienteId`. `createSaleSchema` acepta `clienteId`, no `clienteNombre`; `pos.routes.ts` solo usa `clienteId` para asociar la venta y actualizar gasto/visitas.

**Resultado:** las ventas quedan como cliente nulo; el historial, gasto acumulado, visitas, fidelización y reportes por cliente no representan los cobros. Al cobrar una cita tampoco se manda explícitamente su `clienteId`.

**Corrección:** selector/autocompletado de clientes existentes, crear cliente desde POS, pasar el ID; si hay cita activa, derivar y validar el cliente desde la cita. Prueba venta POS → perfil cliente → gasto y venta visibles.

#### 8. Cancelar/completar citas y vender desde agenda puede duplicar métricas del CRM — **Alto/medio**

`citas.routes.ts:159-195` incrementa visitas cuando una cita cambia a COMPLETADA; `pos.routes.ts:211-228` incrementa visitas también al cobrar, y cambia la cita a completada. Cobrar una cita previamente completada suma otra visita; la API tampoco bloquea vender sobre una cita cancelada/completada. Cambiar estados varias veces puede volver a incrementar contadores.

**Corrección:** una sola fuente de verdad transaccional para visita atendida y gasto (por ejemplo, evento de venta/cita con idempotencia); definir una máquina de estados válida. Pruebas de transición repetida, completar antes/después del cobro y cancelación.

#### 9. Inventario: carreras de stock, sucursal ambigua y entrada negativa — **Alto**

`pos.routes.ts:69-74, 149-187`: productos se buscan por tenant e ID, pero no se comprueba que sean de la sucursal del cobro. La comprobación de existencia lee el stock y después hace decremento sin condición atómica `stockActual >= cantidad`; bajo concurrencia ambos cobros pueden superar existencias. `inventario.routes.ts:163-217` también calcula stock absoluto fuera de transacción. `createProductSchema` (`schemas.ts:71-83`) permite stock inicial negativo; movimiento puede escribir `sucursalId: ''` para producto sin sucursal (`inventario.routes.ts:194-209`).

**Corrección:** decidir si el catálogo es global o por sucursal; separar stock por ubicación si aplica. Descuento condicional/atómico en DB, agrupar cantidades repetidas por producto, no permitir negativo ni ledger sin sucursal. Pruebas simultáneas en el motor de producción y venta cruzada de sucursal.

#### 10. Consulta pública aún permite enumeración de citas y exposición de datos personales — **Alto**

Se corrigió la filtración de `tokenCancelacion`/notas y la cancelación exige token; sin embargo, `generateBookingFolio()` (`booking.service.ts:188-190`) usa `RES-` más solo 3 bytes aleatorios. `GET /public/cita/:codigo` (`public.routes.ts:444-484`) busca globalmente sin tenant/slug y devuelve nombre, fecha, servicio, barbero y sucursal. No encontré rate limit en la ruta pública. La unicidad de folio es por tenant, no global (`schema.prisma:226`).

**Corrección:** usar token de alta entropía como único identificador de lectura privada; o vincular consulta a teléfono/OTP. Añadir rate limiting por IP y código, evitar búsqueda global y exponer la mínima información. Prueba de colisión entre tenants y enumeración.

#### 11. Funciones del perfil cliente y membresías no coinciden con las respuestas de API — **Media/alta**

`ClientesView.tsx:129-148` envía `planNombre`, `precioMensual`, `cortesRestantes`, mientras la ruta espera `nombrePlan`, `precio`, `cortes`, `vigenciaDias` (`clientes.routes.ts:227-250`); cada petición acepta los valores predeterminados del backend. La respuesta de perfil devuelve métricas en raíz (`clientes.routes.ts:151-157`) y las membresías bajo `perfil.cliente.membresias`; la UI consulta otras rutas/campos (`ClientesView.tsx:535-593`). El perfil puede mostrar ceros/defaults, no encontrar membresías o mostrar fechas indefinidas.

**Corrección:** definir DTO tipado común y adaptar ambos lados; probar contrato API/UI con fixture que incluya visitas, gasto, no-shows y membresía.

#### 12. Reportes, exportación e impresión fallan desde el flujo real del navegador — **Media/alta**

- `ReportesView.tsx:48-51` abre la exportación CSV con `window.open`; el navegador no adjunta el Bearer token que `api.request` sí añade a sus propios `fetch`. El endpoint de exportación exige autenticación/RBAC, así que debe esperarse 401.
- `PosView.tsx:748-765` abre de forma similar el ticket HTML protegido; falla por la misma razón. Además, los enlaces hardcodean `/api`, aunque `api.ts` permite usar `VITE_API_URL` remoto.
- El filtro por barbero en `ReportesView.tsx:87-95` se envía, pero `reportes.routes.ts:34-45, 89-108` no filtra ventas/top de productos/comisiones; el resultado parece filtrado, pero mezcla información de todos los barberos.

**Corrección:** descargar CSV/ticket con `fetch` autenticado y `Blob`, o usar URL firmada de un solo uso; usar base URL configurada y filtrar todas las agregaciones del reporte con los mismos parámetros.

#### 13. Compras y proveedores son modelos de base de datos, no un flujo operativo — **Mejora prioritaria**

Hay modelos `Proveedor` y `OrdenCompra` en `schema.prisma:403-435`, pero no encontré endpoints de API ni vistas que los utilicen; `OrdenCompra` tampoco contiene detalle de líneas de producto. La reposición de inventario se resuelve con movimiento manual genérico, sin proveedor/costo real ni recepción asociada al Kardex.

**Corrección/propuesta:** completar proveedor → orden con renglones → recepción parcial/total → incremento de stock y costo → cancelación/retorno; enlazar documentos al Kardex y a sucursal. Esto es clave para que “Productos/Inventario” sea manejable de punta a punta.

### P1 de despliegue — No se puede considerar listo para producción

#### 14. El schema Prisma activo sigue en SQLite; Docker configura PostgreSQL y no hay migraciones — **Crítico para despliegue**

`packages/database/prisma/schema.prisma:8-10` define SQLite; existe `schema.postgres.prisma`, pero los comandos de `package.json:13-17` y generación/build no lo seleccionan. Docker Compose pasa una URL PostgreSQL (`docker-compose.yml`); no encontré `prisma/migrations`. `db:migrate` llama `prisma migrate deploy` sin una migración inicial versionada.

**Consecuencia:** el build compila, pero no demuestra que el stack Docker pueda inicializar la base productiva. No ejecuté Docker, así que no afirmo el error exacto del runtime.

**Corrección:** elegir PostgreSQL (recomendado para el SaaS) o SQLite, no anunciar ambos como si fueran equivalentes; hacer que generate/migrate/client usen el mismo schema; versionar migración inicial; probar un despliegue limpio desde cero en CI y respaldo/restauración.

#### 15. La integración Stripe no crea una sesión de pago real — **Alto**

El webhook sí verifica firma y cuerpo crudo en `NODE_ENV=production`; es una corrección válida. Pero `suscripcion.routes.ts:86-122, 145-190` construye a mano URLs de checkout en vez de invocar Stripe Checkout; el portal también produce una URL de prueba (`:129-140`). En producción se impide activar directamente el plan, pero el flujo de cobro sigue incompleto. En modo no producción se permite cambio de plan directo para pruebas.

**Corrección:** crear Checkout/Customer Portal con el SDK, usar precios configurados en Stripe, validar tenant y aplicar el plan solo desde webhook verificado. Asegurar que staging no comparta credenciales ni datos de producción.

## Estado respecto al reporte anterior

| Hallazgo anterior | Estado en el ZIP actual | Evidencia/nota |
|---|---|---|
| C1 — secreto JWT de fallback | **Parcial** | Producción falla con clave ausente/insegura; aún hay fallback de desarrollo y clave conocida en `apps/api/.env.example`. |
| C2 — RBAC ausente | **Parcial** | Añadieron `requireRole` en varias rutas; persisten los huecos del hallazgo 6 y el rol del token puede quedar obsoleto. |
| C3 — cambio gratis/dunning global | **Parcial** | Owner requerido y restricciones productivas; checkout sigue siendo URL simulada. |
| C4 — webhook Stripe sin firma | **Corregido en producción** | Firma/rawBody obligatorios con `NODE_ENV=production`. Mantener entornos no productivos aislados. |
| C5 — POS usa IDs de cliente/cita ajenos | **Corregido en la ruta POS revisada** | Se valida tenant; no cubre las mutaciones independientes de `clientes` del hallazgo 1. |
| C6 — bypass suspensión con query string | **Corregido en la ruta revisada** | Se comparan `baseUrl/path` por prefijo exacto. |
| C7 — citas por folio corto | **Parcial** | Ya no entrega token de cancelación y cancelar exige token; consulta continúa enumerables/global y con PII. |
| C8 — CFDI simulado en producción | **Corregido** | La simulación está marcada sin validez fiscal; en producción falta de API key produce error. |
| C9 — WhatsApp | **Parcial** | Variables alternativas, Graph API v21 y LINK_GENERADO existen; sigue mandando texto libre y rutas directas guardan falsamente `ENVIADO` sin llamar al proveedor. |
| C10 — base de datos y despliegue | **Sigue abierto** | Schema activo SQLite vs PostgreSQL en Docker; no migraciones. |
| A1/A2 — folio/stock concurrentes | **Parcial** | Secuencia y decremento vivo añadidos; inicialización de secuencia/actualización de stock no son completamente atómicas. |
| A3 — visitas CRM duplicadas | **Parcial** | Se eliminó incremento duplicado en POS, pero cita COMPLETADA y venta pueden contar por separado. |
| A4 — cancelación y comisiones | **Parcial** | Bloquea comisiones liquidadas, pero devoluciones de efectivo y consistencia de turno no se concilian. |
| A5 — corte incluye ventas canceladas | **Parcial** | Ahora excluye canceladas, pero movimientos y límites del turno siguen incompletos. |
| A6 — límites de plan | **Corregido funcionalmente** | Se añadieron límites al crear sucursales/barberos; falta manejar concurrencia del contador. |
| A7/A8 — prueba y scheduler | **Parcial** | Scheduler y dunning existen; varios procesos API pueden duplicar tareas, WhatsApp no es completamente real y el resumen semanal no se agenda. |
| A9/A12 — zona horaria y reservas concurrentes | **Sigue abierto** | Disponibilidad usa TZ del proceso; verificación-conflicto y creación no tienen bloqueo/constraint para PostgreSQL. |
| A10/A11 — reglas y “cualquier barbero” | **Parcial** | Hay validaciones de horario/bloqueos/descanso, pero TZ y algunos bloqueos generales quedan fuera; fallback elige primer barbero aunque ninguno esté libre. |
| A13/A14 — login/sesión | **Parcial** | bcrypt asíncrono/costo mayor y chequeo usuario activo; falta rate limit y revocación/actualización de rol. |
| A15 — movimiento de inventario | **Parcial** | Tipos y algunas cantidades ya se validan; quedan stock inicial negativo, carreras y errores de sucursal. |
| A16 — nómina persistente | **Mayormente corregido** | `PagoNomina` se guarda; revisar concurrencia y asociación durable de cada comisión al pago. |
| A17 — afirmaciones de landing | **No revalidado completo** | Debe contrastarse con operación real, integración WhatsApp y soporte antes de publicar promesas. |

## Propuesta de cambios para que “productos y todo” quede más completo

### Fase 0 — Seguridad y dinero

1. Corregir el endpoint de onboarding y el acceso multi-tenant de clientes.
2. Diseñar RBAC explícito por acción, incluyendo caja, citas, descuentos, reportes y asignación de ventas.
3. Validar pago completo y guardar pago mixto; idempotencia de checkout y venta.
4. Implementar inventario transaccional por sucursal y evitar stock negativo.
5. Cerrar y conciliar caja con todas las formas de pago, movimientos y devoluciones.
6. Elegir PostgreSQL/SQLite, versionar migraciones y probar Docker desde DB vacía.

### Fase 1 — Operación diaria sin pasos manuales

1. **Productos:** campos completos (SKU/barcode, costo, precio, margen, categoría, proveedor, mínimo/máximo, activo), búsquedas rápidas y alertas accionables.
2. **Inventario:** existencias por sucursal, entradas por compra, recepción parcial, merma/uso/devolución, transferencias entre sucursales y kardex filtrable/exportable.
3. **POS:** lector de código de barras, selección real de cliente, carrito de servicios/productos, descuentos sujetos a rol y motivo, pagos divididos y ticket reproducible aunque falle la impresora.
4. **Caja:** turnos identificados por cajero, apertura/cierre atómicos, movimientos ligados a turno, refund/void con contrapartida y arqueo ciego.
5. **Agenda:** cambios de estado permitidos, citas asociadas a venta/cliente, selección de barbero disponible y zona horaria de sucursal.
6. **Reportes:** mismos filtros en todas las tarjetas, CSV autenticado y conciliación entre ventas, caja e inventario.

### Fase 2 — Retención, automatización y multi-sucursal

- Importación de productos/clientes desde Excel/CSV y descarga de plantillas.
- Órdenes de compra y proveedores de punta a punta.
- Historial de precios/costos y margen real por producto/barbero/sucursal.
- Reservas con rate limit, OTP opcional, reprogramación, anticipos/no-show, lista de espera y notificaciones de estados reales.
- Membresías con reglas de vigencia/consumo, saldo y registro de pagos.
- Operación resiliente (backups verificados, auditoría, observabilidad y, si el caso de negocio lo requiere, modo offline con cola/idempotencia).

## Criterios mínimos de aceptación recomendados

- Usuario de tenant A no puede leer, editar ni borrar datos de tenant B aunque conozca el UUID.
- Usuario BARBERO no puede asignar ventas a otro barbero, editar políticas, descuentos no permitidos ni mover caja fuera de su turno.
- Importe recibido insuficiente o pago mixto no conciliado se rechaza en API; no se registra venta parcial como pagada.
- Dos cobros concurrentes por la última unidad dejan inventario nunca negativo y generan un kardex coherente.
- Venta creada + fallo al imprimir no permite duplicar el cobro y muestra el folio ya emitido.
- Ingreso/retiro/gasto y venta cancelada producen el efectivo esperado correcto al cerrar; no se aceptan movimientos en corte cerrado.
- Build, API y suites corren en CI con base temporal limpia; se ejecuta una prueba de migración desde cero con el motor objetivo.
- CSV, ticket y vistas protegidas se descargan con sesión y respetan `VITE_API_URL`.

---

**Conclusión:** hay una base de funcionalidades y la compilación está sana, pero hoy existen fallos de integración entre pantallas y API que hacen que el software parezca más completo de lo que realmente opera. Primero arreglaría los puntos P0 de clientes/onboarding/pagos/caja y luego cerraría inventario por sucursal, contratos del CRM y despliegue/migraciones antes de ampliar funciones visuales.
