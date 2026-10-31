# SYSTECH Studio — Plan Maestro de Cambios para Desplegar y Vender

> Documento de auditoría + hoja de ruta. Pensado para entregárselo tal cual a quien implemente (tú o una IA) y ejecutarlo de arriba hacia abajo.
> Alcance de la revisión: monorepo completo del zip (`apps/api`, `apps/web`, `packages/database`, `srs.md`, `FUNCIONES_DEL_SISTEMA.md`).

---

## 0. Cómo se hizo esta revisión (y sus límites)

- Revisión **estática** del código: leí `schema.prisma`, los `package.json`, el `README`, el SRS, el catálogo de funciones, el `api.ts`/`App.tsx` del frontend, la landing, y el `index.ts` de la API (2,398 líneas) enfocándome en autenticación, multi-tenant, pagos, reservas públicas, POS y notificaciones.
- **No ejecuté** la aplicación ni corrí `npm install`/`build`, y **no leí línea por línea** todas las vistas del frontend (Agenda, POS, Barberos, Inventario, Reportes, etc.). Los hallazgos de esas pantallas son por estructura y por lo que la API expone. Verifica cada punto contra el código antes de darlo por cerrado.
- Las referencias `index.ts:NNN` son líneas aproximadas del archivo del zip.

---

## 1. Veredicto ejecutivo

**Estado actual: demo funcional muy bien armada. No es desplegable ni vendible todavía.**

Lo bueno (y es bastante):
- Alcance de producto ambicioso y coherente con el SRS: agenda, reservas públicas, POS, comisiones, caja con corte, inventario con kardex, reportes, suscripciones, super admin, onboarding.
- Modelo de datos multi-tenant razonable (`tenantId` en casi todo, auditoría, kardex, cortes de caja).
- Landing con propuesta de valor clara y calculadora de ROI.
- Las operaciones críticas de venta usan transacción (`$transaction`) para venta + items + stock + kardex + comisión.

Lo que hoy lo bloquea (detalle en la sección 2):
1. **La autenticación es falsa**: cualquier usuario entra con la contraseña `123456` o `admin`, y el "token" no está firmado.
2. **Cualquiera puede ser cualquier cosa**: la API confía en cabeceras que manda el navegador (`x-tenant-id`, `x-user-role`). Un cliente curioso lee los datos de otra barbería o se vuelve Super Admin cambiando una cabecera.
3. **`/api/admin/*` no tiene autenticación**, y el frontend lo llama al cargar.
4. **No hay cobro real**: Stripe y Twilio están en `package.json` pero no se usan; el "pago" se simula con un endpoint que cualquier dueño puede llamar para activarse gratis.
5. **WhatsApp es simulado**: se genera un link `wa.me`; no hay envío automático ni recordatorios. Es justo la promesa principal de la landing.
6. **La landing afirma cosas que hoy no son ciertas** (métricas, testimonios, "cientos de barberos", cumplimiento legal). Es riesgo legal y de reputación.
7. **Base de datos incompatible con producción**: el schema usa SQLite; el SRS, el README y el `.env` hablan de MySQL.

**Regla de oro para vender:** no consigas ni un cliente de pago antes de cerrar la Fase 0 y la Fase 1. Un fallo de seguridad o un descuadre de caja en una barbería real destruye la reputación del producto en un mercado donde todos se conocen.

---

## 2. Hallazgos bloqueantes (P0) — arreglar antes de cualquier cliente

### 2.1 Autenticación rota

| # | Hallazgo | Dónde | Riesgo |
|---|----------|-------|--------|
| A1 | Login acepta `123456` y `admin` como contraseña de **cualquier** usuario, además de comparar el hash en texto plano con lo escrito (`user.passwordHash === password`) | `index.ts:~115-121` | Cualquiera entra a cualquier cuenta, incluido Super Admin |
| A2 | Las contraseñas se guardan en texto plano (`passwordHash: '123456'`) o con un "hash" falso (`$2b$10$systechhashsuperadmin`) | `seed.ts`, `index.ts` (register) | Fuga total si se filtra la BD |
| A3 | Token = `systech_` + base64 de `userId:tenantId:timestamp`. No está firmado ni expira | `index.ts:~123`, `requireAuth` | Cualquiera fabrica un token válido |
| A4 | `requireAuth` toma `x-tenant-id`, `x-user-role` y `x-user-id` **de cabeceras o query** y solo "completa" con el token si faltan | `index.ts:12-30` | Suplantación de tenant y de rol |
| A5 | Rol por defecto = `DUENO` cuando no llega cabecera | `index.ts:15` | Sin sesión ya tienes permisos de dueño |
| A6 | No existe ninguna verificación de rol en las rutas (`userRole` se guarda en `req` pero nunca se usa para autorizar) | todo `index.ts` | Un BARBERO puede cobrar, borrar, ver reportes y cambiar planes |

### 2.2 Aislamiento multi-tenant (el riesgo #1 que el propio SRS marca como "Alto")

Varias consultas buscan o modifican por `id` **sin** filtrar `tenantId`. Con un id de otra barbería (los ids son UUID, pero se filtran en respuestas, tickets y links) se puede leer o alterar datos ajenos:

- `PUT /api/citas/:id/status` (`index.ts:~1155`)
- `DELETE /api/bloqueos/:id` (`~1209`)
- `POST /api/ventas`: `barbero.findUnique({ where: { id: barberoId } })` sin tenant (`~1242`)
- `GET /api/ventas/:id/ticket` (`~1474`)
- `PUT /api/barberos/:id` (`~1621`)
- `POST /api/cortes-caja/cerrar` (`~1765`, `~1817`)
- `PUT /api/productos/:id` (`~1947`)
- `POST /api/inventario/movimiento` (`~1972`)
- `GET /api/public/disponibilidad` y `POST /api/public/reservar`: no validan que `sucursalId`, `barberoId` y `servicioId` pertenezcan al `tenantId` recibido (`~822`, `~934`)

Además, `Usuario.email` es `@unique` **global**: dos barberías no pueden tener al mismo gerente, y un correo "ocupado" revela que existe una cuenta en otro tenant.

### 2.3 Superficie administrativa expuesta

- Todas las rutas `/api/admin/*` (`metrics`, `tenants`, `tenants/:id/status`, `tenants/:id/plan`, `auditorias`) **no pasan por `requireAuth`**. Cualquiera en internet puede listar clientes del SaaS, suspender cuentas o cambiar planes (`index.ts:412-577`).
- El frontend llama `api.getAdminTenants()` en `loadInitialData()` aunque no haya sesión (`App.tsx`), y selecciona por defecto la barbería `el-bigote` o la primera. Es decir, **la app web carga con datos de otra barbería** si no hay login.
- `Superadmin` por defecto se resuelve al tenant `systech-global` o al primero que exista.

### 2.4 Dinero y suscripciones

- `POST /api/suscripcion/simular-pago` está accesible a cualquier usuario autenticado: pone el tenant en `ACTIVO`, "paga" y extiende 30 días. **Cualquier dueño se activa gratis** (`index.ts:2291`).
- `POST /api/suscripcion/cambiar-plan` hace upgrade a PRO sin cobrar (`~2251`) y registra la auditoría con un email fijo `dueno@barberia.com`.
- Los montos están **hardcodeados** (499/999) en al menos 5 lugares (API y UI) en vez de venir de una tabla de planes.
- Stripe (`stripe@^13`) y Twilio (`twilio@^4`) están instalados y sin uso.

### 2.5 Reservas públicas (superficie abierta a internet)

- **No hay validación de empalme**: `POST /api/public/reservar` crea la cita sin comprobar que el barbero esté libre, que la hora no sea pasada, que caiga dentro del horario ni dentro de un bloqueo. La disponibilidad se calcula en otro endpoint pero **no se vuelve a verificar al reservar**: dos personas pueden tomar el mismo horario (condición de carrera).
- `codigoReserva = RES-` + 4 dígitos aleatorios: ~9,000 combinaciones, colisiones frecuentes y **adivinable por fuerza bruta**. Con `GET /api/public/cita/:codigo` y `POST .../cancelar` cualquiera puede ver datos de clientes (nombre, servicio, barbero) y **cancelar citas ajenas**.
- Sin rate limit, sin CAPTCHA, sin validación de teléfono/formato. Un script puede llenar la agenda de citas falsas (sabotaje de la competencia, algo muy realista entre barberías).
- `precioEstimado` por defecto 250 si no hay servicio.
- El mensaje de confirmación se registra como `ENVIADO` en `NotificacionLog` **sin haberse enviado nada**: los reportes de notificaciones mienten.

### 2.6 POS y caja

- El POS acepta `precioUnitario` **enviado por el cliente** (`item.precioUnitario !== undefined ? Number(item.precioUnitario) : prod.precioVenta`). Cualquier barbero con la consola abierta se cobra $1 un servicio de $250 y altera sus propias comisiones. El precio debe venir **siempre** de la BD; los descuentos deben ser un campo explícito, con permiso y bitácora.
- `folio = FOL-` + 5 dígitos aleatorios: colisiones y sin consecutivo. Un negocio necesita folio **consecutivo por sucursal** y sin huecos.
- No hay cancelación/devolución de ventas, ni reverso de stock y comisión (revisar si existe en UI).
- `descuento` y `propina` no están acotados (¿descuento mayor al subtotal? ¿propina negativa?).
- La comisión se calcula con el porcentaje **actual** del barbero. Si cambia el porcentaje, no hay historial de qué se aplicó en cada venta (sí guarda `porcentaje` en `Comision`, validar que se calcule sobre el neto tras descuento).

### 2.7 Infraestructura y secretos

- `packages/database/.env` va dentro del zip con `mysql://root:password@localhost...`; `dev.db` (con datos de prueba y usuarios) también. **Nunca** se versionan.
- `cors()` abierto a cualquier origen; sin `helmet`; sin límite de tamaño ni de peticiones.
- `API_BASE = 'http://localhost:3001/api'` fijo en el frontend: no hay forma de desplegar sin editar el código.
- El token y el usuario viven en `localStorage` (vulnerable a XSS). Mejor cookie `httpOnly` + `SameSite`.
- Contradicción de motor: schema `sqlite` ↔ SRS/README/.env `mysql`. SQLite no tiene tipo decimal nativo ni concurrencia de escritura adecuada para un SaaS con POS; para dinero no es aceptable en producción.
- `index.ts` es un monolito de 2,398 líneas sin capas, sin validación de entrada (no hay zod/joi), sin pruebas.
- El `package.json` raíz usa `start npm run ...` (solo Windows) para `dev`.

### 2.8 Promesas comerciales falsas en la landing (`LandingView.tsx`)

| Afirmación | Realidad hoy | Acción |
|-----------|--------------|--------|
| "98.4% asistencia a citas con WhatsApp" | No hay envío real de WhatsApp ni datos | Quitar |
| "+$14M MXN volumen procesado" | No hay clientes ni procesamiento | Quitar |
| "100% transparencia en comisiones" | Es una característica, no una métrica | Reformular como beneficio |
| Testimonios con nombre | Ficticios | Quitar o marcar como ejemplo hasta tener reales |
| "Únete a cientos de barberos" | 0 clientes | Quitar |
| "Cumplimos con la LFPDPPP" | No hay aviso de privacidad, consentimiento, ARCO ni T&C | No afirmar hasta cumplirlo |
| "Aislamiento estricto de base de datos" | BD compartida + filtros con huecos (ver 2.2) | Corregir primero, luego decirlo con precisión |
| "Automatiza citas por WhatsApp 24/7" | Solo genera links `wa.me` | Implementar la integración real o cambiar la promesa |
| "Sin tarjeta de crédito obligatoria" / "Cancela cuando quieras" | Depende de la implementación de cobro | Verificar cuando exista pasarela |

En México, publicidad con datos falsos puede constituir publicidad engañosa (PROFECO) y, sobre todo, un cliente que lo detecte no vuelve.

---

## 3. Plan por fases

Leyenda de esfuerzo: **S** = horas · **M** = 1-3 días · **L** = 1-2 semanas. Marca `[x]` conforme avances.

### FASE 0 — Cerrar el agujero de seguridad (obligatoria, ~1 semana)

**Autenticación real**
- [ ] (M) Hashear contraseñas con `argon2` o `bcrypt` (costo ≥ 12). Migrar/reseed: **eliminar** cualquier contraseña en claro y el atajo `123456`/`admin` del login. Registrar y cambiar contraseña con política mínima (8+ caracteres).
- [ ] (M) Sesión con **JWT firmado** (secreto en variable de entorno, `exp` corto de 15-60 min) + refresh token rotativo, o sesión en cookie `httpOnly; Secure; SameSite=Lax`. Payload: `userId`, `tenantId`, `rol`. Nada de leer tenant/rol de cabeceras.
- [ ] (S) Borrar el uso de `x-tenant-id`, `x-user-role`, `x-user-id` y `req.query.tenantId` en `requireAuth`. El tenant sale **solo** del token.
- [ ] (S) Rate limit en `/api/auth/*` (`express-rate-limit`: ej. 5 intentos/15 min por IP+email) y bloqueo temporal tras fallos.
- [ ] (M) Recuperar contraseña por correo (token de un solo uso, expira en 30 min) y verificación de email en el registro.
- [ ] (M) 2FA (TOTP) obligatorio para `SUPER_ADMIN`, opcional para `DUENO`.
- [ ] (S) Cerrar sesión que invalide el refresh token; "cerrar sesión en todos los dispositivos".

**Autorización (RBAC)**
- [ ] (M) Middleware `requireRole(...roles)` y matriz de permisos por ruta. Mínimo sugerido:

| Acción | SUPER_ADMIN | DUENO | GERENTE | BARBERO |
|--------|:-----------:|:-----:|:-------:|:-------:|
| Ver/gestionar todos los tenants | ✔ | | | |
| Cambiar plan / pagar suscripción | | ✔ | | |
| Configuración de la barbería | | ✔ | ✔ | |
| Alta/baja de barberos y comisiones | | ✔ | ✔ | |
| Reportes financieros completos | | ✔ | ✔ | solo los suyos |
| Cobrar en POS | | ✔ | ✔ | ✔ |
| Aplicar descuento > X% / cancelar venta | | ✔ | ✔ | |
| Abrir/cerrar caja | | ✔ | ✔ | opcional |
| Agenda | | ✔ | ✔ | solo la suya |

- [ ] (S) Mover **todas** las rutas `/api/admin/*` detrás de `requireAuth + requireRole('SUPER_ADMIN')`.
- [ ] (S) El frontend **no** debe llamar rutas admin si el usuario no es Super Admin; eliminar el fallback a `el-bigote`/primer tenant.

**Aislamiento multi-tenant a prueba de errores**
- [ ] (L) Crear una capa de acceso a datos que **siempre** inyecte `tenantId`: extensión de Prisma (`$extends`) que agregue `where: { tenantId }` automáticamente, o repositorios por tenant. Prohibir `findUnique({ where: { id } })` suelto; usar `findFirst({ where: { id, tenantId } })` o `updateMany/deleteMany` con `tenantId`.
- [ ] (M) Corregir los endpoints listados en 2.2 (citas, bloqueos, ventas, tickets, barberos, cortes, productos, inventario, públicos).
- [ ] (S) `Usuario.email` único **por tenant** (`@@unique([tenantId, email])`) o definir explícitamente que un email = una cuenta global con membresías por tenant.
- [ ] (M) Pruebas automatizadas de aislamiento: crear 2 tenants, intentar cada endpoint con ids del otro, esperar 404/403. Esto va en CI y bloquea el release (lo pide tu propio SRS §10).
- [ ] (S) Validar que `sucursalId`/`barberoId`/`servicioId` pertenezcan al mismo tenant en todo POST.

**Endurecimiento general**
- [ ] (S) `helmet`, CORS con lista blanca de orígenes (variable de entorno), `express.json({ limit: '100kb' })`.
- [ ] (M) Validación de entrada con **zod** en cada ruta (tipos, rangos, formatos de teléfono/email/fechas). Respuestas de error uniformes `{ code, message }`.
- [ ] (S) Manejo de errores centralizado; no devolver `error.message` interno al cliente; logs estructurados (`pino`).
- [ ] (S) Quitar `.env` y `dev.db` del repositorio; `.env.example` sin secretos; ampliar `.gitignore` (`*.db`, `.env*`, `dist`).
- [ ] (S) **Rotar** cualquier secreto que haya salido en el zip.
- [ ] (S) Auditoría real: guardar el `usuarioEmail` del token (no strings fijos como `dueno@barberia.com`); registrar logins fallidos, cambios de plan, cancelaciones, descuentos, cierres de caja, cambios de comisión.

### FASE 1 — Fundaciones de backend y datos (~1-2 semanas)

**Base de datos**
- [ ] (M) Decidir motor: **PostgreSQL** (recomendado: mejor soporte en servicios gestionados, tipos numéricos exactos, índices parciales) o MySQL como dice el SRS. Actualizar `schema.prisma`, `.env.example` y README para que digan lo mismo.
- [ ] (M) Pasar de `prisma db push`/`dev.db` a **migraciones versionadas** (`prisma migrate dev` / `migrate deploy`).
- [ ] (M) Dinero: `Decimal(12,2)` explícito (`@db.Decimal(12, 2)`), nunca `Float`. Centralizar redondeo (2 decimales, política única).
- [ ] (M) Índices: `@@index([tenantId, fechaHora])` en `Cita`, `@@index([tenantId, fecha])` en `Venta`, `@@index([tenantId, telefono])` en `ClienteFinal`, `@@index([tenantId, sucursalId])` en `Producto`, etc. Sin esto, el POS se vuelve lento con 3-6 meses de datos.
- [ ] (M) Unicidad con sentido de negocio: `@@unique([tenantId, sucursalId, folio])` para ventas, `@@unique([tenantId, codigoReserva])` para citas, `@@unique([tenantId, telefono])` para clientes.
- [ ] (M) Evitar empalmes **a nivel BD**: restricción de exclusión (Postgres `EXCLUDE USING gist` con `tstzrange` por barbero) o, al menos, transacción con bloqueo (`SELECT ... FOR UPDATE`) al reservar.
- [ ] (S) Fechas: guardar todo en UTC y convertir con la zona horaria de la sucursal (`America/Mexico_City`; Colima cae en `America/Mexico_City` con su propia regla, pero **hazlo configurable por sucursal**). Hoy `toLocaleString('es-MX')` en el servidor depende de la zona del servidor.
- [ ] (S) Borrado lógico (`eliminadoEn`) para clientes, productos, barberos; evita romper históricos de ventas.
- [ ] (M) Tabla `Plan` (id, nombre, precio, límites, features) en vez de 499/999 hardcodeados; `Tenant.planId`.
- [ ] (M) Tablas nuevas necesarias para el roadmap: `Cupon`, `Pago`/`Factura`, `Proveedor`, `OrdenCompra`, `ClienteMembresia`, `Resena`, `ConsentimientoCliente`, `Sesion`/`RefreshToken`, `Webhook`/`EventoPago`, `ConfigNotificacion`, `PlantillaMensaje`.
- [ ] (S) Seed separado: `seed:demo` (solo desarrollo) y `seed:prod` (solo plan y super admin inicial, con contraseña desde variable de entorno).

**Arquitectura del código**
- [ ] (L) Partir `index.ts` en módulos: `auth`, `tenants`, `citas`, `public-booking`, `ventas`, `barberos`, `caja`, `inventario`, `notificaciones`, `reportes`, `suscripcion`, `admin`. Cada uno con `routes → controller → service → repository`.
- [ ] (M) Lógica de negocio crítica en servicios **puros y testeables**: cálculo de comisiones, totales de venta, descuadre de caja, disponibilidad de horarios.
- [ ] (M) Mover a TypeScript estricto compartido: tipos y esquemas zod en `packages/shared` para que web y API usen la misma definición.
- [ ] (S) `engines` en `package.json`, versión LTS de Node fijada (`.nvmrc`), `package.json` raíz con scripts multiplataforma (`concurrently` en lugar de `start ... &`).
- [ ] (S) `GET /api/health` que verifique conexión a BD (`SELECT 1`) y versión.

**Pruebas (no negociables en un sistema que maneja dinero)**
- [ ] (M) Unitarias del cálculo de venta/comisión: servicios vs productos, descuentos, propinas, pagos mixtos, redondeo, comisiones con porcentaje distinto por barbero.
- [ ] (M) Integración (supertest + BD de prueba): flujo completo cita → venta → comisión → corte de caja → reporte.
- [ ] (M) Aislamiento multi-tenant (ver Fase 0).
- [ ] (M) Concurrencia: 20 reservas simultáneas al mismo horario → solo 1 gana.
- [ ] (M) E2E con Playwright de los 3 flujos que venden el producto: reserva pública, cobro en POS, cierre de caja.
- [ ] (S) CI en GitHub Actions: lint + typecheck + tests + build en cada PR.

### FASE 2 — Integraciones reales (lo que convierte la demo en producto) (~2 semanas)

**2.1 Cobro de la suscripción (SaaS)**
- [ ] (L) Elegir pasarela con cobro recurrente en MXN. Opciones a comparar (verifica costos y requisitos vigentes antes de decidir): **Stripe** (Billing), **Mercado Pago** (suscripciones), **Conekta**. Considera: comisión por transacción, pago con OXXO/SPEI para clientes sin tarjeta, tiempos de depósito.
- [ ] (L) Flujo: registro → prueba de 14 días → Checkout/Portal de cliente de la pasarela → **webhook firmado** (`invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`) → actualiza `Suscripcion` y `Tenant.estado`. El estado **solo** lo cambian los webhooks verificados, nunca el cliente.
- [ ] (M) Idempotencia de webhooks (tabla `EventoPago` con `eventId` único) y reintentos seguros.
- [ ] (M) **Dunning**: pago fallido → correo + WhatsApp al dueño → 3 días de gracia (como define tu SRS §3.1) → suspensión; reactivación automática al pagar. Job programado diario.
- [ ] (M) Prorrateo de upgrade/downgrade, cancelación al final del periodo pagado, retención de datos X días tras cancelar.
- [ ] (S) **Eliminar** `simular-pago` en producción (dejarlo solo con `NODE_ENV !== 'production'` si lo necesitas para demos).
- [ ] (M) Cupones/códigos de lanzamiento ("FUNDADOR": precio congelado), y precios anuales con descuento (ya los muestra la landing: "2 meses gratis" debe corresponder a un precio real en la pasarela).
- [ ] (M) Facturación a tus clientes: decide con tu contador cómo facturas (CFDI) la suscripción; automatiza con un proveedor tipo Facturapi o similar.

**2.2 WhatsApp y mensajería (la promesa estrella)**
- [ ] (L) Integrar **WhatsApp Business Platform (Cloud API de Meta)** directamente o vía un proveedor (Twilio, 360dialog, etc.). Requiere: cuenta Meta Business verificada, número dedicado, **plantillas de mensaje aprobadas** (confirmación, recordatorio, cancelación, reagendar). Verifica precios por conversación/mensaje vigentes y calcula si cobrarlos aparte o incluirlos.
- [ ] (M) Cola de mensajes con reintentos (BullMQ + Redis, o `pg-boss` sobre Postgres si quieres evitar Redis) y estados reales: `PENDIENTE → ENVIADO → ENTREGADO → LEIDO/FALLIDO`, alimentados por los webhooks del proveedor. **Nunca** registrar `ENVIADO` antes de que lo sea.
- [ ] (M) Recordatorios programados: 24 h y 2 h antes (lo ya contemplado en `tipo`), respetando horario permitido (ej. no enviar de 22:00 a 08:00) y zona horaria.
- [ ] (M) Opt-in/opt-out del cliente final (palabra "BAJA"), registro de consentimiento (LFPDPPP).
- [ ] (S) Plantillas editables por barbería con variables (`{nombre}`, `{hora}`, `{barbero}`).
- [ ] (M) Alternativa de respaldo/económica: SMS y correo si el cliente no tiene WhatsApp. **Opción de arranque sin costo de API**: botón "enviar por WhatsApp" que abre `wa.me` con el mensaje armado (lo que ya existe), pero **dilo honestamente** en la landing ("1 clic para recordar") hasta tener automatización real.
- [ ] (M) Alertas internas: stock mínimo, cierre de caja con descuadre, suscripción en riesgo.

**2.3 Correo transaccional**
- [ ] (M) Proveedor (Resend, SendGrid, Amazon SES) con dominio propio verificado (SPF, DKIM, DMARC). Plantillas: verificación de cuenta, recuperar contraseña, recibo de venta digital, resumen semanal al dueño, aviso de pago.

**2.4 Recibos e impresión**
- [ ] (M) Ticket en PDF y HTML imprimible 58/80 mm (CSS `@page`), con datos fiscales opcionales de la barbería.
- [ ] (L) Impresión térmica ESC/POS (WebUSB/WebSerial o app puente local) — marcarlo como mejora posterior si bloquea el lanzamiento.
- [ ] (M) Compartir ticket por WhatsApp/correo con enlace público de corta vida.

**2.5 Facturación del cliente final (diferenciador en México)**
- [ ] (L) Facturación CFDI 4.0 desde el POS vía PAC/proveedor (Facturapi, SW Sapien, etc.): captura RFC, régimen y uso de CFDI del cliente, timbrado, envío por correo. Muchas barberías no lo piden, pero para las que sí es decisivo y justifica el plan Pro.

**2.6 Pagos con tarjeta en el POS (opcional, fase posterior)**
- [ ] (L) Integración con terminal (Mercado Pago Point, Clip, Stripe Terminal) o links de pago; conciliación con `Venta.metodoPago`.
- [ ] (M) **Anticipos / depósito para reservar** (reduce no-shows de verdad): cobro con tarjeta o SPEI al reservar en el portal público, con política de cancelación.

### FASE 3 — Producto: de "tiene módulos" a "no pueden vivir sin él" (~3-5 semanas, iterativo)

Aquí está el "plus ultra". Ordenado por impacto en retención y en cobrar más. **Prioriza los marcados con ★.**

#### 3.1 Agenda y citas
- [ ] ★ (M) Disponibilidad calculada en el servidor con una sola función reutilizada por la agenda interna y el portal público: horario de la sucursal, horario y descansos del barbero, bloqueos, citas existentes, duración del servicio, **tiempo de limpieza/buffer** entre clientes, feriados, hora actual + antelación mínima configurable.
- [ ] ★ (M) Reserva atómica (transacción + bloqueo) y mensaje claro "ese horario se acaba de ocupar, elige otro".
- [ ] ★ (M) Reprogramar y cancelar desde un enlace único seguro (token largo, no el código corto), con política (ej. cancelar hasta 2 h antes).
- [ ] (M) Arrastrar y soltar para mover citas; vista día/semana por barbero; colores por estado.
- [ ] (M) Multi-servicio en una cita (corte + barba) con duración y precio sumados.
- [ ] (M) Lista de espera: si se cancela una cita, avisar al siguiente en espera.
- [ ] (M) Citas recurrentes ("cada 15 días, mismo barbero").
- [ ] (M) Preferencia "cualquier barbero disponible" en el portal público.
- [ ] (M) Walk-ins (clientes sin cita) con cola de turnos y tiempo estimado de espera.
- [ ] (S) Estados completos: pendiente, confirmada por el cliente (respuesta a recordatorio), en curso, completada, cancelada, no-show; **marcar no-show** alimenta el historial del cliente.
- [ ] (M) Sincronizar con Google Calendar del barbero (lectura de ocupado / escritura de citas).

#### 3.2 Portal público de reservas (`/#reservar` → URL por barbería)
- [ ] ★ (M) URL limpia por barbería: `https://app.tudominio.mx/b/el-bigote` o subdominio `el-bigote.tudominio.mx`; **quitar el hash**. Página con logo, colores, fotos, reseñas, ubicación (mapa) y servicios.
- [ ] ★ (S) QR descargable (para el espejo del local, tarjetas, Instagram) y botón "copiar enlace para tu bio de Instagram".
- [ ] (M) Protección anti-abuso: CAPTCHA (Turnstile/hCaptcha), rate limit por IP y por teléfono, **verificación del teléfono con código por WhatsApp/SMS** antes de confirmar la primera cita.
- [ ] (M) Código de reserva largo e impredecible (≥ 8 caracteres alfanuméricos aleatorios con `crypto.randomBytes`), y el endpoint público devuelve **solo** lo mínimo (hora, servicio, barbería), nunca datos personales de otros.
- [ ] (M) Galería de cortes/trabajos y perfil de cada barbero (foto, especialidad, calificación).
- [ ] (S) Meta tags, Open Graph y datos estructurados (`LocalBusiness`) para que el enlace se vea bien al compartir y aparezca en Google.
- [ ] (M) Dominio propio por barbería (plan Pro): CNAME + certificado automático.

#### 3.3 Punto de venta
- [ ] ★ (M) Precio siempre del servidor; descuentos como objeto (`tipo`, `valor`, `motivo`, `autorizadoPor`) con permiso por rol y tope configurable.
- [ ] ★ (M) **Cancelación/devolución de venta** con reverso de stock, kardex y comisión, y registro de motivo y autorizador.
- [ ] ★ (M) Folio consecutivo por sucursal y serie (ej. `A-000123`).
- [ ] (M) Pagos divididos reales (efectivo + tarjeta + transferencia) validando que sumen el total; cambio automático en efectivo.
- [ ] (M) Propina repartida: al barbero que atendió o dividida entre el equipo (configurable), y su efecto en comisiones/nómina.
- [ ] (M) Combos y paquetes (corte + barba + cejas) y **memberships/bonos** (ver 3.4).
- [ ] (M) Código de barras / SKU para productos (pistola USB funciona como teclado).
- [ ] (M) Modo offline (PWA con cola local y sincronización) — está en tu SRS como fase futura; para barberías con internet inestable es un diferenciador.
- [ ] (S) Atajos de teclado y modo táctil para tablet; botones grandes; objetivo real de "cobrar en < 30 s" medido.

#### 3.4 Clientes (CRM) — el módulo que más falta hoy y más retiene
- [ ] ★ (M) Perfil de cliente: historial de visitas, servicios favoritos, barbero preferido, gasto total, frecuencia promedio, notas (alergias, estilo), fecha de cumpleaños.
- [ ] ★ (M) **Reactivación**: lista "clientes que no vienen hace X días" con mensaje de WhatsApp en 1 clic o campaña automática ("te extrañamos, 10% esta semana").
- [ ] ★ (L) **Membresías de corte para el cliente final** (ej. $350/mes = 2 cortes): cobro recurrente al cliente de la barbería. Es ingreso predecible para el dueño y un motivo enorme para pagar tu plan Pro.
- [ ] (M) Programa de lealtad (cada 10 cortes, 1 gratis) con tarjeta digital en el portal.
- [ ] (M) Referidos ("trae a un amigo").
- [ ] (M) Fotos del corte (antes/después) ligadas al cliente (con consentimiento).
- [ ] (M) Segmentación y campañas (cumpleaños, inactivos, VIP) con control de frecuencia para no saturar.
- [ ] (M) Importar clientes por CSV/Excel (clave en el onboarding de una barbería que ya tiene su libreta).
- [ ] (S) Evitar duplicados: normalizar teléfonos a E.164 (`+52…`).
- [ ] (M) Derechos ARCO desde el perfil: exportar y eliminar datos del cliente.

#### 3.5 Barberos, comisiones y nómina
- [ ] ★ (M) Esquemas de comisión flexibles: % por servicio, % por producto, **escalonado por meta**, por servicio específico, renta de silla, sueldo base + comisión.
- [ ] ★ (M) Historial de porcentajes (vigencia) para que cambiar una comisión no altere el pasado.
- [ ] ★ (M) Corte semanal/quincenal de comisiones: pantalla "pagar nómina" que marca comisiones pagadas, genera recibo imprimible/PDF y suma adelantos y descuentos.
- [ ] (M) Adelantos, préstamos y descuentos por faltas/merma ligados a la nómina.
- [ ] (M) Vista para el barbero (rol BARBERO): su agenda del día, sus ventas, sus comisiones acumuladas, su meta.
- [ ] (S) Ranking y metas del mes (gamificación suave).
- [ ] (M) Control de asistencia simple (entrada/salida) y horarios por día.
- [ ] (S) Validar límites del plan (3 barberos en Básico) **en el servidor** al crear barberos, y qué pasa al bajar de plan.

#### 3.6 Caja y cortes
- [ ] ★ (M) Arqueo ciego real: el cajero cuenta antes de ver el esperado; descuadre guardado con bitácora y umbral de alerta al dueño.
- [ ] (M) Movimientos de caja: retiros, gastos menores, ingresos extra con motivo y evidencia (foto del ticket).
- [ ] (M) Un solo corte abierto por sucursal/turno; no se pueden vender cosas sin caja abierta (configurable).
- [ ] (S) Corte por correo/WhatsApp al dueño al cerrar el turno.
- [ ] (M) Cierre diario con comparativo vs. día anterior y vs. mismo día semana pasada.

#### 3.7 Inventario
- [ ] (M) Proveedores, órdenes de compra y recepción de mercancía (entrada de kardex ligada a compra).
- [ ] (M) Costo promedio ponderado y **margen por producto** en tiempo real.
- [ ] (M) Consumo de insumos por servicio (ej. cada corte descuenta navaja, talco, tinte) — opcional avanzado.
- [ ] (M) Conteo cíclico/inventario físico con ajustes auditados.
- [ ] (S) Alertas de stock mínimo con sugerencia de pedido; prevenir stock negativo (o permitirlo solo por configuración).
- [ ] (M) Mermas y devoluciones a proveedor con motivo.
- [ ] (S) Importar catálogo por CSV.

#### 3.8 Reportes y BI
- [ ] ★ (M) **Resumen semanal automático al dueño** por WhatsApp/correo: ventas, citas, no-shows, mejor barbero, producto top. Es el "momento aha" que hace que renueven.
- [ ] (M) Exportar a **Excel/CSV/PDF** cada reporte (los dueños siempre lo piden para su contador).
- [ ] (M) Ocupación de sillas por hora y día (horas muertas → promociones dirigidas).
- [ ] (M) Retención/recurrencia de clientes, LTV, ticket promedio, tasa de no-show, ingresos por servicio y por barbero, margen de productos.
- [ ] (S) Filtros por sucursal, rango de fechas y comparativos.
- [ ] (M) Meta mensual del negocio con barra de avance.
- [ ] (M) Consultas pesadas con índices y/o tablas de agregados precalculados (no recorrer todas las ventas en memoria como hacen los `include` hoy).

#### 3.9 Super Admin (tu panel como dueño del SaaS)
- [ ] ★ (M) MRR, churn, ARPU, trials activos, conversión trial→pago, cuentas en riesgo, cohortes.
- [ ] (M) **Impersonación auditada** ("entrar como" una barbería para dar soporte) con aviso y bitácora.
- [ ] (M) Gestión de trials (extender, cortar), cupones, notas internas por cliente, etiquetas.
- [ ] (M) Feature flags por plan/tenant.
- [ ] (S) Salud de cuenta (última actividad, ventas del mes, citas del mes) para anticipar cancelaciones.
- [ ] (M) Avisos globales (mantenimiento, novedades) dentro de la app.

#### 3.10 Onboarding y activación
- [ ] ★ (M) Checklist de activación visible hasta completarse (logo, servicios, barberos, horarios, primera cita, primera venta, compartir enlace de reservas).
- [ ] (M) Plantillas de servicios por tipo de barbería (clásica, premium, unisex) con precios editables.
- [ ] (M) Importación de clientes e inventario.
- [ ] (S) Datos de ejemplo borrables con un clic para "probar sin miedo".
- [ ] (M) Tour guiado y videos cortos de 60 s por módulo.
- [ ] (S) Correos de activación (día 0, 2, 5, 12 del trial) con enlace directo a lo siguiente por hacer.

### FASE 4 — Frontend, UX y calidad (~1-2 semanas, en paralelo)

- [ ] ★ (S) `API_BASE` desde `import.meta.env.VITE_API_URL`; `.env.example` para web.
- [ ] ★ (M) Autenticación del frontend con el nuevo esquema (cookie httpOnly o token en memoria + refresh); eliminar `localStorage` para credenciales y quitar `setContext(tenantId, role, userId)` que fabricaba cabeceras.
- [ ] ★ (M) Enrutamiento real con `react-router-dom` (ya está instalado): `/`, `/login`, `/app/agenda`, `/app/pos`, `/b/:slug`, `/admin`. Hoy se usa estado y `window.location.hash`.
- [ ] (M) Guardas de ruta por rol y ocultar en la UI lo que no corresponde (pero **la API es la que decide**).
- [ ] (M) Capa de datos con TanStack Query: caché, reintentos, estados de carga/error consistentes, actualización optimista en agenda y POS.
- [ ] (M) Estados vacíos, esqueletos de carga, errores accionables ("No pudimos guardar. Reintentar") en todas las vistas.
- [ ] (M) Formularios con validación en vivo (`react-hook-form` + `zod` compartido con la API).
- [ ] (M) Dividir vistas gigantes (BarberosView ~31 KB, PosView ~30 KB, PublicBookingView ~32 KB, LandingView ~37 KB) en componentes; carga diferida por ruta (`React.lazy`) para bajar el peso inicial.
- [ ] (M) **Responsive/tablet/celular real**: el POS y la agenda se usan de pie en el local, con tablet o teléfono.
- [ ] (M) PWA instalable (manifest, iconos, service worker) para el POS.
- [ ] (M) Accesibilidad: contraste, foco visible, etiquetas, navegación por teclado, `aria` en modales (`AuthModal`, `ConfiguracionModal`, `OnboardingModal`).
- [ ] (S) Formato MXN y fechas `es-MX` centralizados; preparar i18n por si expandes a Latinoamérica.
- [ ] (S) Sentry en el frontend; no dejar `console.log` con datos.
- [ ] (S) Revisar el efecto de borde cromático del titular de la landing (probable `text-shadow`/`-webkit-text-stroke`) en pantallas normales.
- [ ] (S) `eslint` y `prettier` con reglas; el script `lint` existe pero no hay configuración de ESLint en el zip.

### FASE 5 — Landing, legal y confianza comercial (~1 semana)

**Landing honesta que convierte**
- [ ] ★ (S) Reemplazar la barra de métricas por hechos verificables: "Prueba gratis 14 días", "Listo en menos de 3 minutos", "Hecho en Colima para barberías de México". Cuando haya clientes reales, mostrar sus números verdaderos (con permiso).
- [ ] ★ (S) Quitar testimonios ficticios y "cientos de barberos". Sustituir por una sección "Programa fundador: las primeras 10 barberías congelan su precio de por vida" (escasez real y honesta).
- [ ] ★ (S) Ajustar el titular: "para barberías de alto nivel" excluye a la mayoría de tu mercado. Ejemplos: "Agenda, cobra y paga comisiones sin libreta ni Excel" o "para barberías que quieren crecer".
- [ ] (S) Cada afirmación de funcionalidad debe corresponder a algo que **ya funciona**; si no, ponerlo en una sección "Próximamente".
- [ ] (M) Demo interactiva con datos de ejemplo en un tenant de solo lectura que se resetea solo.
- [ ] (M) Video de 60-90 s mostrando: reserva por el cliente → cobro → comisión del barbero. Vende más que cualquier texto.
- [ ] (S) Página de precios clara: qué incluye cada plan, qué pasa al terminar la prueba, cómo cancelar. Si el precio de $499/$999 resulta alto para barberías de barrio, ofrecer un plan de entrada más barato o descuento por anualidad.
- [ ] (S) FAQ real (¿necesito tarjeta?, ¿qué pasa con mis datos si cancelo?, ¿funciona sin internet?, ¿puedo importar mis clientes?).
- [ ] (S) Calculadora de ROI: dejar claro que es una **estimación** con supuestos editables; hoy usa 8% de recuperación como dato fijo sin fuente.
- [ ] (M) SEO básico: títulos, descripciones, `sitemap.xml`, `robots.txt`, páginas por ciudad ("sistema para barberías en Colima/Guadalajara…").
- [ ] (S) Analítica respetuosa (Plausible/Umami/GA4) con eventos: clic en "Prueba gratis", registro, activación.
- [ ] (S) Botón de WhatsApp de soporte/ventas visible.

**Legal (México) — consúltalo con un abogado/contador antes de cobrar**
- [ ] ★ (M) **Aviso de privacidad** (para ti como responsable de los datos de tus clientes y como encargado de los datos de los clientes finales de cada barbería), **Términos y Condiciones**, y **contrato de servicio** con cláusula de tratamiento de datos (la barbería es responsable; tú, encargado).
- [ ] (M) Consentimiento y avisos de privacidad para el cliente final en el portal de reservas (casilla + enlace).
- [ ] (M) Procedimiento ARCO (acceso, rectificación, cancelación, oposición) con correo de contacto y plazos.
- [ ] (S) Política de retención y eliminación de datos tras cancelar.
- [ ] (S) Política de cookies si usas analítica.
- [ ] (M) Tu situación fiscal para cobrar y facturar (persona física con actividad empresarial/RESICO o persona moral) y emisión de CFDI a tus clientes.
- [ ] (S) Dejar de afirmar "cumplimos con la LFPDPPP" hasta que lo anterior exista.

### FASE 6 — Despliegue y operación técnica (~1 semana)

**Entornos**
- [ ] ★ (S) Tres entornos: `local`, `staging`, `production`, cada uno con su BD, secretos y dominio. Staging con datos de prueba, nunca datos reales.
- [ ] (S) Variables de entorno documentadas (`.env.example`): `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, `APP_URL`, `API_URL`, claves de pasarela, WhatsApp, correo, `SENTRY_DSN`.

**Empaquetado**
- [ ] (M) `Dockerfile` multi-stage para la API y `docker-compose.yml` para desarrollo (API + Postgres + Redis opcional).
- [ ] (S) Build del frontend estático (`vite build`) servido por CDN.
- [ ] (S) Comando de migraciones en el arranque/despliegue: `prisma migrate deploy`.

**Hosting (verifica precios y límites vigentes antes de decidir)**
- Frontend: Vercel, Netlify o Cloudflare Pages (estático, HTTPS y CDN incluidos).
- API: Railway, Render, Fly.io o un VPS pequeño con Docker.
- Base de datos gestionada: Postgres/MySQL administrada con **backups automáticos** (Neon, Supabase, Railway, PlanetScale-compatibles, RDS…).
- Colas/cron: Redis gestionado o `pg-boss`.
- Archivos (logos, fotos): almacenamiento tipo S3/Cloudflare R2 con URLs firmadas.
- Región: la más cercana a México para bajar latencia del POS.

**Producción segura**
- [ ] ★ (S) HTTPS obligatorio, HSTS, cookies `Secure`.
- [ ] ★ (M) **Backups diarios automáticos + prueba de restauración** (un backup que nunca restauraste no es un backup). Objetivo del SRS: restaurar en < 4 h.
- [ ] (M) Monitoreo de disponibilidad (UptimeRobot/Better Stack) sobre `/api/health` con alertas al celular.
- [ ] (M) Errores en Sentry (API y web), logs centralizados, alertas por tasa de errores 5xx.
- [ ] (S) Límites de recursos y autoescalado básico; conexiones a BD con *pool* (PgBouncer/Prisma Accelerate si hace falta).
- [ ] (S) Dependabot/Renovate y `npm audit` en CI; fijar versiones mayores (`lucide-react@0.263` y `vite@4` están muy atrás: actualizar con prueba).
- [ ] (M) Plan de despliegue sin caída (migraciones compatibles hacia atrás) y de **rollback**.
- [ ] (M) Página de estado y canal de incidentes (aunque sea un correo + WhatsApp a clientes).
- [ ] (S) Cabeceras de seguridad (CSP razonable, `X-Content-Type-Options`, `Referrer-Policy`).
- [ ] (M) Prueba de carga (k6/Artillery): 50 barberías simultáneas con POS + agenda; objetivo del SRS < 2 s.

### FASE 7 — Soporte, ventas y crecimiento (continuo)

**Soporte**
- [ ] (S) Centro de ayuda con 10 artículos clave y videos; botón de ayuda dentro de la app.
- [ ] (S) Canal de soporte por WhatsApp con horario definido y SLA honesto.
- [ ] (M) Bitácora de incidentes y de peticiones de clientes para decidir roadmap con datos.
- [ ] (S) Encuesta NPS/CSAT a los 30 días.

**Go-to-market realista (tu ventaja: estás en el terreno, en Colima)**
- [ ] ★ Piloto con **3 barberías reales** gratis o con descuento fuerte durante 30-60 días a cambio de feedback, casos de estudio y permiso para usar sus números reales en la landing.
- [ ] ★ Visitas en persona, demo de 10 minutos en el celular del dueño (reserva → cobro → comisión). Es tu canal más fuerte al principio.
- [ ] (S) Implementación asistida ("yo te cargo tus servicios y clientes") como servicio de pago único (ej. cuota de instalación) que además mejora la retención.
- [ ] (M) Alianzas: proveedores de productos para barbería, escuelas de barbería, distribuidores.
- [ ] (M) Programa de referidos entre dueños (mes gratis).
- [ ] (S) Contenido: reels de 30 s en Instagram/TikTok mostrando problemas típicos (libreta, no-shows, comisiones a ojo).
- [ ] (S) Medir embudo: visita → registro → activación (primera venta) → pago → retención a 90 días.

---

## 4. Modelo de negocio y precios (revisar con números reales)

- Hoy: Básico $499 / Pro $999 MXN al mes (anual: $4,990 y $9,990). Son precios razonables para barberías con varios barberos, pero **altos para un local de 1-2 sillas**. Considera:
  - Plan **Solo/Arranque** (1 barbero, agenda + POS) más barato para entrar.
  - Precio **Fundador** congelado para las primeras barberías.
  - Cuota de **instalación/capacitación** opcional.
  - Cobro por **mensajes de WhatsApp** o paquetes si el costo del proveedor crece con el uso.
- Antes de fijar precios calcula tu costo por cliente: hosting + base de datos + mensajería + correo + comisión de la pasarela + tu tiempo de soporte. Con eso defines el margen real y el punto de equilibrio (¿cuántas barberías para cubrir costos fijos?).
- Define la política de prueba: 14 días con tarjeta o sin tarjeta; qué pasa al terminar (modo solo lectura 30 días antes de borrar).
- Métricas a vigilar desde el día 1: MRR, churn mensual, activación a 7 días, CAC, LTV, no-show de los clientes de tus clientes (tu prueba de valor).

---

## 5. Orden de ejecución recomendado (sprints)

| Sprint | Duración | Foco | Resultado verificable |
|--------|----------|------|-----------------------|
| 0 | 1 sem | Fase 0 completa | Pentest básico propio: sin bypass de login, sin acceso cruzado entre tenants, `/api/admin` protegido |
| 1 | 1-2 sem | Fase 1 (BD, módulos, pruebas) | Postgres/MySQL con migraciones, CI verde, pruebas de comisiones y aislamiento |
| 2 | 1 sem | Reservas públicas seguras + disponibilidad atómica + POS con precios del servidor + folios | 20 reservas simultáneas → 1 gana; POS no acepta precios del cliente |
| 3 | 1-2 sem | Cobro de suscripción real (Fase 2.1) + dunning | Alta → trial → cobro → fallo → gracia → suspensión, todo con webhooks |
| 4 | 1-2 sem | WhatsApp real (cola + plantillas + recordatorios) o honestidad total del mensaje | Recordatorio llega solo; estados reales en el log |
| 5 | 1 sem | Landing honesta + legal + deploy a staging y producción | Dominio con HTTPS, backups probados, aviso de privacidad publicado |
| 6 | 2-4 sem | **Piloto con 3 barberías** + correcciones | Primeros cobros reales, casos de estudio |
| 7+ | continuo | CRM, membresías, nómina, reportes por correo, CFDI | Retención y ticket promedio subiendo |

**No avances al siguiente sprint sin cumplir el "resultado verificable".**

---

## 6. Checklist final de lanzamiento (Go-Live)

**Seguridad**
- [ ] No existe ninguna contraseña por defecto ni atajo de login.
- [ ] Contraseñas con hash; JWT firmado con expiración; cookies seguras.
- [ ] Todas las rutas protegidas por `requireAuth`; admin por `SUPER_ADMIN` (+2FA).
- [ ] Pruebas de aislamiento multi-tenant pasan en CI.
- [ ] Rate limit y CAPTCHA en login, registro y reservas públicas.
- [ ] Sin secretos en el repositorio; secretos rotados.
- [ ] `npm audit` sin vulnerabilidades altas/críticas.

**Dinero**
- [ ] Cobro de suscripción real con webhooks verificados; `simular-pago` deshabilitado en producción.
- [ ] Precios del POS siempre del servidor; descuentos con permiso y bitácora.
- [ ] Folios consecutivos; ventas cancelables con reverso completo.
- [ ] Pruebas de comisiones y de corte de caja (con casos de redondeo).
- [ ] Prueba manual de un día completo de operación contra Excel (cuadra al centavo).

**Producto**
- [ ] Reserva pública sin empalmes ni citas falsas; confirmación y recordatorio reales.
- [ ] Onboarding completo en < 3 minutos (cronometrado con una persona real).
- [ ] Funciona bien en celular y tablet.
- [ ] Exportar a Excel/PDF desde reportes.

**Operación**
- [ ] Staging y producción separados; migraciones automáticas; rollback ensayado.
- [ ] Backups diarios + restauración probada.
- [ ] Monitoreo de uptime y errores con alertas.
- [ ] Soporte por WhatsApp con horario; centro de ayuda con artículos base.

**Legal y comercial**
- [ ] Aviso de privacidad, T&C y contrato publicados y vigentes.
- [ ] Landing sin afirmaciones falsas ni métricas inventadas ni testimonios ficticios.
- [ ] Forma de facturar tus servicios resuelta con tu contador.
- [ ] Al menos 3 barberías piloto activas con feedback registrado.

---

## Anexo A — Código de referencia para los cambios críticos

> Son plantillas para adaptar, no código probado contra tu repo. Pruébalas en staging y con tus tipos reales. Nombres de modelos/campos tomados de tu `schema.prisma`.

### A.1 Login con hash y JWT (reemplaza el login actual)

```ts
// auth.service.ts
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

const ACCESS_TTL = '30m';

export async function login(email: string, password: string) {
  const user = await prisma.usuario.findFirst({
    where: { email: email.trim().toLowerCase(), activo: true },
  });
  // Mismo mensaje y mismo trabajo cuando no existe: evita enumerar cuentas.
  const hash = user?.passwordHash ?? '$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const ok = await argon2.verify(hash, password).catch(() => false);
  if (!user || !ok) throw new HttpError(401, 'Credenciales inválidas');

  const token = jwt.sign(
    { sub: user.id, tid: user.tenantId, rol: user.rol },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TTL },
  );
  return { token, user: { id: user.id, nombre: user.nombre, rol: user.rol, tenantId: user.tenantId } };
}

export const hashPassword = (plain: string) => argon2.hash(plain, { type: argon2.argon2id });
```

### A.2 Middleware: solo el token manda (nada de cabeceras de tenant/rol)

```ts
// middleware/auth.ts
export const requireAuth: RequestHandler = async (req, res, next) => {
  const raw = req.cookies?.access ?? req.headers.authorization?.replace(/^Bearer /, '');
  if (!raw) return res.status(401).json({ code: 'NO_AUTH' });
  try {
    const p = jwt.verify(raw, process.env.JWT_SECRET!) as { sub: string; tid: string; rol: Rol };
    const tenant = await prisma.tenant.findUnique({ where: { id: p.tid }, include: { suscripcion: true } });
    if (!tenant) return res.status(401).json({ code: 'NO_AUTH' });

    const esBilling = req.path.startsWith('/api/suscripcion');
    if (tenant.estado === 'SUSPENDIDO' && p.rol !== 'SUPER_ADMIN' && !esBilling) {
      return res.status(403).json({ code: 'SUSCRIPCION_SUSPENDIDA' });
    }
    req.ctx = { userId: p.sub, tenantId: p.tid, rol: p.rol, tenant };
    next();
  } catch {
    res.status(401).json({ code: 'TOKEN_INVALIDO' });
  }
};

export const requireRole = (...roles: Rol[]): RequestHandler => (req, res, next) =>
  roles.includes(req.ctx.rol) ? next() : res.status(403).json({ code: 'SIN_PERMISO' });

// Uso
app.use('/api/admin', requireAuth, requireRole('SUPER_ADMIN'), adminRouter);
app.post('/api/barberos', requireAuth, requireRole('DUENO', 'GERENTE'), crearBarbero);
```

### A.3 Patrón anti-fuga entre tenants

```ts
// MAL: busca por id a secas
await prisma.producto.update({ where: { id }, data });

// BIEN: el tenant forma parte de la condición y se verifica el resultado
const r = await prisma.producto.updateMany({ where: { id, tenantId: ctx.tenantId }, data });
if (r.count === 0) throw new HttpError(404, 'No encontrado');

// Lecturas
const p = await prisma.producto.findFirst({ where: { id, tenantId: ctx.tenantId } });

// Validar pertenencia de relaciones antes de crear
const [suc, barb] = await Promise.all([
  prisma.sucursal.findFirst({ where: { id: sucursalId, tenantId } }),
  prisma.barbero.findFirst({ where: { id: barberoId, sucursal: { tenantId } } }),
]);
if (!suc || !barb) throw new HttpError(400, 'Datos inválidos');
```

Para blindarlo de forma global, una extensión de Prisma que inyecte `tenantId` en `findMany/findFirst/updateMany/deleteMany/count` de los modelos que lo tienen, más pruebas que lo verifiquen.

### A.4 Validación con zod (ejemplo: reserva pública)

```ts
import { z } from 'zod';

export const reservaSchema = z.object({
  tenantId: z.string().uuid(),
  sucursalId: z.string().uuid(),
  barberoId: z.string().uuid(),
  servicioId: z.string().uuid(),
  fechaHora: z.coerce.date().refine(d => d.getTime() > Date.now(), 'La hora debe ser futura'),
  clienteNombre: z.string().trim().min(2).max(80),
  clienteTelefono: z.string().regex(/^\+?\d{10,13}$/, 'Teléfono inválido'),
  clienteEmail: z.string().email().optional(),
  notas: z.string().max(300).optional(),
  captchaToken: z.string().min(1),
});
```

### A.5 Reserva sin empalmes (PostgreSQL)

Migración SQL (probar en staging; requiere Postgres):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Cita"
  ADD COLUMN "rango" tsrange
  GENERATED ALWAYS AS (
    tsrange("fechaHora", "fechaHora" + make_interval(mins => "duracionMinutos"))
  ) STORED;

ALTER TABLE "Cita" ADD CONSTRAINT cita_sin_empalme
  EXCLUDE USING gist ("barberoId" WITH =, "rango" WITH &&)
  WHERE ("estado" NOT IN ('CANCELADA', 'NO_SHOW'));
```

En el servicio, captura la violación (código `23P01`) y responde "ese horario se acaba de ocupar":

```ts
try {
  return await prisma.cita.create({ data });
} catch (e: any) {
  if (e?.meta?.code === '23P01' || /cita_sin_empalme/.test(String(e?.message))) {
    throw new HttpError(409, 'Ese horario se acaba de ocupar. Elige otro.');
  }
  throw e;
}
```

Sigue validando antes (horario laboral, bloqueos, antelación mínima) para dar buenos mensajes; la restricción es la red de seguridad contra carreras.

### A.6 Código de reserva impredecible y respuesta mínima

```ts
import { randomBytes } from 'crypto';
const codigoReserva = randomBytes(6).toString('base64url'); // 8 caracteres, ~48 bits

// GET /api/public/cita/:codigo -> devolver solo lo necesario
res.json({ servicio, barberia, fechaHora, estado });  // sin teléfono, notas ni datos de otros
```

Más: `@@unique([tenantId, codigoReserva])`, rate limit por IP en esos endpoints, y expiración del enlace de gestión.

### A.7 Folio consecutivo por sucursal

```prisma
model Secuencia {
  sucursalId String
  serie      String @default("A")
  valor      Int    @default(0)
  @@id([sucursalId, serie])
}
```

```ts
// dentro de la transacción de la venta
const s = await tx.secuencia.upsert({
  where: { sucursalId_serie: { sucursalId, serie: 'A' } },
  create: { sucursalId, serie: 'A', valor: 1 },
  update: { valor: { increment: 1 } },
});
const folio = `A-${String(s.valor).padStart(6, '0')}`;
```

### A.8 POS: el precio lo pone el servidor

```ts
for (const item of items) {
  const prod = productMap.get(item.productoId);
  if (!prod) throw new HttpError(400, 'Producto inválido');
  const qty = Math.min(Math.max(parseInt(item.cantidad) || 1, 1), 99);
  const price = Number(prod.precioVenta);                 // NUNCA item.precioUnitario
  ...
}
const desc = Math.min(Math.max(Number(descuento) || 0, 0), subtotal);
if (desc > 0 && !puedeDescontar(ctx.rol, desc, subtotal)) throw new HttpError(403, 'Sin permiso para ese descuento');
const prop = Math.max(Number(propina) || 0, 0);
```

### A.9 Webhook de pagos (esqueleto con Stripe; adapta si eliges otra pasarela)

```ts
// Debe ir ANTES de express.json() y usar el cuerpo crudo
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature']!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return res.sendStatus(400);
  }

  // Idempotencia: si ya lo procesaste, responde 200 y sal
  const ya = await prisma.eventoPago.findUnique({ where: { eventId: event.id } });
  if (ya) return res.sendStatus(200);

  switch (event.type) {
    case 'invoice.paid':           await activarTenant(event); break;
    case 'invoice.payment_failed': await marcarEnRiesgo(event); break;
    case 'customer.subscription.deleted': await cancelarTenant(event); break;
  }
  await prisma.eventoPago.create({ data: { eventId: event.id, tipo: event.type } });
  res.sendStatus(200);
});
```

### A.10 `.env.example`

```bash
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://user:pass@localhost:5432/systech"
JWT_SECRET="cambia-esto-por-un-valor-largo-y-aleatorio"
CORS_ORIGINS="http://localhost:5173"
APP_URL="http://localhost:5173"
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
WHATSAPP_TOKEN=""
WHATSAPP_PHONE_ID=""
EMAIL_API_KEY=""
SENTRY_DSN=""
CAPTCHA_SECRET=""
# Web (apps/web/.env): VITE_API_URL="http://localhost:3001/api"
```

### A.11 CI mínimo (GitHub Actions)

```yaml
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: pass, POSTGRES_DB: systech_test }
        ports: ['5432:5432']
    env:
      DATABASE_URL: postgresql://postgres:pass@localhost:5432/systech_test
      JWT_SECRET: test-secret
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx prisma migrate deploy --schema packages/database/prisma/schema.prisma
      - run: npm run lint --workspaces --if-present
      - run: npm run build --workspaces --if-present
      - run: npm test --workspaces --if-present
      - run: npm audit --audit-level=high
```

---

## Anexo B — Estado real vs. catálogo de 168 funciones

El archivo `FUNCIONES_DEL_SISTEMA.md` describe un sistema más completo de lo que el código demuestra. **Recomendación:** convertirlo en una matriz de verificación y marcar cada función con uno de estos estados, con evidencia (archivo/endpoint/prueba):

`REAL` (funciona y tiene prueba) · `PARCIAL` · `SIMULADO` · `AUSENTE`

Lo que ya pude confirmar al revisar el código:

| Área (sección del catálogo) | Estado observado | Evidencia / nota |
|---|---|---|
| 1. Multi-tenant y aislamiento | PARCIAL | `tenantId` en el modelo, pero varias rutas sin filtro (ver 2.2) |
| 2. Roles y permisos (RBAC) | AUSENTE en la API | `userRole` se guarda pero no se usa para autorizar |
| 3. Super Admin | PARCIAL | Endpoints existen, **sin autenticación** |
| 4. Onboarding | Por verificar | Endpoints `/api/onboarding/*` y `OnboardingModal` existen |
| 5. Suscripciones y cobro | SIMULADO | `simular-pago`; Stripe sin uso |
| 6. Agenda y citas | PARCIAL | CRUD de citas y bloqueos existe; empalmes por verificar en la ruta interna |
| 7. Portal público de reservas | PARCIAL | Funciona, sin anti-abuso ni verificación de empalme |
| 8-9. POS y pagos múltiples | PARCIAL | Venta transaccional; precio confiado al cliente |
| 10. Recibo térmico / WhatsApp | PARCIAL | Endpoint de ticket existe; impresión ESC/POS por verificar |
| 11. Barberos y comisiones | PARCIAL | Cálculo y pago de comisiones existen; sin historial de porcentajes ni nómina |
| 12. Caja y cortes | PARCIAL | Abrir/cerrar corte existen; arqueo ciego por verificar en UI |
| 13. Inventario y kardex | PARCIAL | Movimientos y kardex existen |
| 14. Notificaciones WhatsApp | SIMULADO | Solo registra en `NotificacionLog` y arma link `wa.me` |
| 15. Analítica / BI | PARCIAL | Un endpoint de dashboard; sin exportación |
| 16. Seguridad, LFPDPPP, auditoría | AUSENTE / PARCIAL | Auditoría parcial; sin aviso, consentimiento ni ARCO |
| 17. Interfaz | Por verificar | Revisión visual en dispositivos reales |

Hasta que la matriz esté completa, **no uses el número "168 funciones" en material de venta**.

---

## Anexo C — Instrucciones para la IA (o persona) que implemente

Copia y pega esto al iniciar la sesión de implementación:

```text
Vas a implementar el documento PLAN_DE_CAMBIOS_SYSTECH.md sobre el monorepo adjunto.

Reglas:
1. Trabaja en el orden del documento: Fase 0 → 1 → 2 → ... No saltes fases.
2. Antes de cambiar código, lista los archivos que vas a tocar y por qué. Haz cambios pequeños y revisables (un tema por commit).
3. Cada cambio de seguridad o de dinero debe incluir su prueba automatizada. Si no hay prueba, no está terminado.
4. No inventes datos, métricas, testimonios ni funciones en la landing. Si una función no existe, no se anuncia.
5. Nunca confíes en datos del cliente para: tenantId, rol, precios, estado de suscripción o folios.
6. Todo acceso a datos incluye tenantId en la condición. Verifica pertenencia de relaciones.
7. Ningún secreto en el repositorio. Usa variables de entorno y .env.example.
8. Al terminar cada fase entrega: resumen de lo cambiado, pruebas ejecutadas y su resultado, y lo que quedó pendiente o dudoso.
9. Si algo del documento contradice el código real, avísalo en vez de asumir.
10. Pregunta solo cuando la decisión sea del dueño del negocio (precios, proveedor de pagos, motor de BD). El resto, decide y documenta la decisión.

Primera tarea: Fase 0. Empieza por (a) eliminar el atajo de contraseña, (b) hashear contraseñas y migrar el seed, (c) JWT firmado, (d) quitar el uso de cabeceras de tenant/rol, (e) proteger /api/admin.
```

---

## Anexo D — Decisiones que solo tú puedes tomar

1. **Motor de base de datos:** PostgreSQL (recomendado) o MySQL (SRS).
2. **Pasarela de cobro:** Stripe, Mercado Pago o Conekta (comisiones, OXXO/SPEI, depósitos).
3. **WhatsApp:** Cloud API directa, o proveedor intermediario; quién paga los mensajes.
4. **Precios finales y plan de entrada** para barberías de 1-2 sillas.
5. **Prueba gratis:** con o sin tarjeta; qué pasa al terminar.
6. **Nombre y dominio** definitivos (¿"Systech Studio"?) y registro de marca.
7. **Régimen fiscal y facturación** de tu negocio (con tu contador).
8. **Piloto:** qué 3 barberías, qué condiciones y qué permiso de uso de sus resultados.

---

*Fin del documento. Orden de ataque en una línea: seguridad → datos y pruebas → cobro y WhatsApp reales → landing honesta y legal → piloto con 3 barberías → producto plus ultra con lo que ellas pidan.*
