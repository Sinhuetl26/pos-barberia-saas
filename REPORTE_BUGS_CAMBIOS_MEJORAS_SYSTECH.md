# SYSTECH Studio — Reporte de Bugs, Cambios Necesarios y Mejoras

**Versión revisada:** `POS_Barberia_Software.zip` actualizado (3 de octubre de 2026, 90 archivos, API modular de ~5,800 líneas).
**Contexto:** segunda revisión, después de aplicar `PLAN_DE_CAMBIOS_SYSTECH.md`.

---

## 0. Alcance y límites de esta revisión (léelo primero)

**Qué hice**
- Extraje el zip, instalé dependencias (`npm install` OK) y leí el código del backend: `index.ts`, `middleware/auth.ts`, `auth`, `admin`, `pos`, `public`, `citas`, `cortes`, `comisiones`, `inventario`, `barberos`, `suscripcion` (parcial), `bloqueos`, y los servicios `pricing`, `booking`, `cash`, `stripe`, `whatsapp`, `facturacion`, `email` (parcial), más `schema.prisma`, `Dockerfile`, `docker-compose.yml`, `.env.example`, scripts de prueba y los documentos.
- Compilé el **frontend**: `vite build` termina sin errores.

**Qué NO pude hacer (no lo tomes como verificado)**
- **No pude ejecutar la API ni las pruebas.** `prisma generate` falla en mi entorno (descarga de motores bloqueada, 403), así que no hay cliente Prisma. Por eso `tsc` de la API reportó errores de tipos (`implicit any`, propiedades inexistentes) que **probablemente son consecuencia de eso** y no bugs reales. Corre `npm run db:generate && npm run build:api` en tu máquina para confirmarlo.
- **No leí línea por línea** las rutas `clientes`, `sucursales`, `reportes`, `notificaciones` ni las 22 vistas del frontend. Los hallazgos del frontend son por búsqueda dirigida, no por revisión completa.
- Los números de línea son **aproximados** (`~`).
- No hice pruebas de penetración reales, ni de carga, ni revisión legal.

**Cómo leer la severidad**

| Nivel | Significado | Regla |
|---|---|---|
| 🔴 **CRÍTICO** | Pérdida de dinero, fuga de datos entre clientes o toma de control del sistema | No se cobra a nadie hasta cerrarlo |
| 🟠 **ALTO** | Datos o dinero incorrectos, o una promesa del producto que no funciona | Cerrar antes del piloto |
| 🟡 **MEDIO** | Robustez, mantenimiento o experiencia deficiente | Cerrar antes de lanzamiento público |
| 🔵 **MEJORA** | Valor añadido, no es un defecto | Priorizar según lo que pidan los clientes |

---

## 1. Resumen ejecutivo

**Progreso real desde la primera revisión:** muy bueno. Se corrigieron los problemas más graves del diseño original (contraseñas, JWT, `/admin` abierto, precios del POS, fuga entre barberías en la mayoría de rutas, métricas falsas de la landing).

**Estado hoy:** apto para **demostración** y para un **piloto interno cerrado sin dinero real**. **No apto para cobrar** hasta cerrar los 🔴.

| Severidad | Cantidad |
|---|:---:|
| 🔴 Críticos | 10 |
| 🟠 Altos | 17 |
| 🟡 Medios | 14 |
| 🔵 Mejoras | 30+ |

**Los 5 que más urgen**
1. **C1** — Clave JWT por defecto escrita en el código (cualquiera puede fabricarse un token de Super Admin si falta la variable).
2. **C2** — Solo `/admin` valida roles: un barbero puede hacer todo lo del dueño.
3. **C3** — Cualquier usuario puede ponerse el plan PRO gratis y ejecutar el proceso de suspensiones de todas las barberías.
4. **C7** — Las citas se pueden consultar y cancelar con el código corto (16 millones de combinaciones, sin límite de intentos), y esa misma consulta entrega el token "seguro".
5. **C10** — La base de datos no puede desplegarse como está (schema SQLite fijo vs. Docker/README con PostgreSQL; sin migraciones; `.env` con credenciales en el zip).

---

## 2. 🔴 Hallazgos CRÍTICOS

### C1 — Clave JWT por defecto en el código y en los archivos de ejemplo
- **Dónde:** `apps/api/src/middleware/auth.ts` (línea ~12), `docker-compose.yml` (`JWT_SECRET: ${JWT_SECRET:-...}`), `.env.example`.
- **Qué pasa:** si la variable `JWT_SECRET` no está definida, el servidor arranca igual con una clave **pública** (está en el zip). Con ella cualquiera firma un token válido con `rol: "SUPER_ADMIN"` y entra a todo. `docker-compose.yml` hace lo mismo con valores por defecto. `.env.example` trae claves largas de apariencia real que alguien podría copiar tal cual.
- **Impacto:** toma total del sistema.
- **Corrección:**
  ```ts
  // auth.ts
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || /change|example|systech-super/i.test(secret)) {
    if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET inválido o ausente');
  }
  export const JWT_SECRET = secret as string;
  ```
  Quitar los valores por defecto de `docker-compose.yml` (que falle si falta). En `.env.example` dejar `JWT_SECRET=` vacío con instrucción `openssl rand -hex 48`.
- **Prueba de aceptación:** arrancar con `NODE_ENV=production` y sin `JWT_SECRET` → el proceso **debe morir**.

### C2 — No hay control de roles fuera de `/admin`
- **Dónde:** `requireRole` se usa **una sola vez** (`adminRouter.use(...)`). Ninguna otra ruta revisa `ctx.rol`.
- **Qué pasa:** cualquier usuario autenticado de una barbería (incluido un `BARBERO`) puede: cambiar comisiones (`PUT /barberos/:id`), crear barberos, cancelar ventas, liquidar nómina, abrir/cerrar caja, editar precios y stock, ver todos los reportes y exportar CSV, cambiar de plan, etc. El frontend oculta algunos botones, pero la API no lo impide.
- **Impacto:** fraude interno (un barbero se sube su comisión al 100% o cancela ventas) y fuga de datos financieros.
- **Corrección:** aplicar la matriz de permisos del plan anterior con `requireRole`:

  | Ruta | Roles permitidos |
  |---|---|
  | `POST/PUT /barberos`, `/comisiones/*` (liquidar), `/suscripcion/*`, `PUT /productos`, `/inventario/movimiento`, `/reportes/*`, `/sucursales` (escritura) | `DUENO`, `GERENTE` |
  | `POST /ventas/:id/cancelar`, `/cortes-caja/cerrar`, descuentos grandes | `DUENO`, `GERENTE` |
  | `POST /ventas`, `/cortes-caja/abrir`, agenda propia | + `BARBERO` (limitado a su `barberoId`) |

  Además, para `BARBERO`, forzar que `barberoId`, agenda y reportes se limiten a **su propio** registro.
- **Prueba de aceptación:** iniciar sesión como `BARBERO` y recibir `403` en cada ruta de la columna 1 (hoy `scripts/test_phase*.js` tiene **0 casos de rol**).

### C3 — Cambio de plan gratis y suspensiones globales para cualquier usuario
- **Dónde:** `suscripcion.routes.ts` → `POST /cambiar-plan` y `POST /ejecutar-dunning`.
- **Qué pasa:**
  - `cambiar-plan` cambia el plan a `PRO` (límites 999) y el monto, **sin cobro ni validación de pago**, para cualquier usuario autenticado.
  - `ejecutar-dunning` llama a `StripeBillingService.ejecutarDunning(prisma)`, que recorre **todas** las barberías `EN_RIESGO` del sistema y las suspende. Cualquier usuario de cualquier barbería puede dispararlo.
- **Impacto:** pérdida directa de ingresos y capacidad de suspender a otros clientes.
- **Corrección:** `cambiar-plan` solo debe iniciar una sesión de Stripe Checkout/portal; el plan **solo** cambia por webhook verificado. `ejecutar-dunning` debe ser un job interno (cron) o restringirse a `SUPER_ADMIN`. Ambos con `requireRole`.

### C4 — El webhook de Stripe acepta eventos sin firma
- **Dónde:** `stripe.service.ts` → `constructWebhookEvent`.
- **Qué pasa:** si `STRIPE_SECRET_KEY` o `STRIPE_WEBHOOK_SECRET` están vacíos (el valor por defecto), **parsea el cuerpo JSON tal cual** sin verificar firma. Cualquiera puede enviar `POST /api/suscripcion/webhook` con un evento falso de "pago exitoso" y activar una cuenta, o de "cancelación" para suspender a un cliente.
- **Corrección:** en producción, si falta el secreto → rechazar y no arrancar. El modo "sin firma" solo con `NODE_ENV === 'test'`. Usar siempre `req.rawBody` (hoy hay fallback a `JSON.stringify(req.body)`, que **rompe** la verificación real).

### C5 — El POS no valida que `clienteId` y `citaId` pertenezcan a tu barbería
- **Dónde:** `pos.routes.ts` (dentro de la transacción de `POST /ventas`, ~líneas 160-190).
- **Qué pasa:** `sucursalId`, `barberoId` y productos sí se validan contra el tenant, pero `citaId` y `clienteId` se usan directo en `tx.cita.update({ where: { id: citaId } })` y `tx.clienteFinal.update({ where: { id: clienteId } })`. Un usuario de la barbería A que conozca un id de la B puede marcar su cita como completada y alterar visitas y gasto de su cliente. Además la respuesta incluye `cliente`, con lo que **lee datos** de otro tenant.
- **Corrección:** antes de la transacción, `findFirst({ where: { id, tenantId } })` para ambos; usar `updateMany({ where: { id, tenantId } })` dentro.
- **Prueba:** Tenant A manda `clienteId` de Tenant B → `400/404`.

### C6 — Una barbería suspendida puede saltarse el bloqueo
- **Dónde:** `middleware/auth.ts`, variable `isBillingOrAdmin`.
- **Qué pasa:** usa `originalUrl.includes('/suscripcion')`, `.includes('/admin')`, `.includes('/auth')`. Como `originalUrl` incluye la query string, `POST /api/ventas?x=/suscripcion` pasa el chequeo y la cuenta suspendida **sigue operando gratis**.
- **Corrección:** comparar contra `req.baseUrl` / `req.path` con rutas exactas (lista blanca), nunca `includes` sobre la URL completa. Mejor: aplicar `requireAuth` y un `requireActiveSubscription` por separado, y montar `/suscripcion` sin ese segundo middleware.

### C7 — Citas públicas: consulta y cancelación con código corto adivinable
- **Dónde:** `public.routes.ts` → `GET /cita/:codigo`, `POST /cita/:codigo/cancelar`; `booking.service.ts` → `generateBookingFolio()`.
- **Qué pasa:**
  1. El código es `RES-` + 3 bytes hex = **16.7 millones** de combinaciones, sin límite de intentos ni CAPTCHA. Es enumerable por fuerza bruta.
  2. `GET /cita/:codigo` devuelve la cita completa, **incluido `tokenCancelacion`** (el token "criptográfico"), nombre del cliente, `notas`, barbero y sucursal. Quien acierta el código corto obtiene el token seguro, así que éste no protege nada.
  3. Existe una ruta heredada `POST /cita/:codigo/cancelar` que cancela **solo con el código corto**, sin política de 2 horas, sin aviso a lista de espera y sin validar tenant.
  4. La búsqueda es **global** (`findFirst({ codigoReserva })`), pero la unicidad es solo por `(tenantId, codigoReserva)`: una colisión entre barberías devolvería la cita de otra.
- **Impacto:** sabotaje (cancelar citas ajenas en masa) y fuga de datos personales de clientes finales.
- **Corrección:**
  - Quitar `tokenCancelacion` y `notas` de la respuesta de `GET /cita/:codigo`; devolver lo mínimo (hora, servicio, barbería, estado).
  - Eliminar `POST /cita/:codigo/cancelar` (o exigir el token largo).
  - Código de reserva más largo (8+ caracteres base32) y/o consultar siempre por token de 64 hex.
  - Rate limit por IP y por código en todo `/api/public/*`.
  - Buscar siempre acotado por `tenantId`/slug.

### C8 — Facturas CFDI falsas si falta la llave del proveedor
- **Dónde:** `facturacion.service.ts` (~línea 122).
- **Qué pasa:** sin `FACTURAPI_KEY`, el servicio devuelve `success: true` con un UUID inventado, `selloSat: 'sello_sat_simulado...'` y un RFC emisor ficticio, **sin ninguna protección por `NODE_ENV`**. En producción, un cliente recibiría una "factura" sin validez fiscal creyendo que es real.
- **Corrección:** si `NODE_ENV === 'production'` y no hay llave → lanzar error explícito y no devolver éxito. La simulación solo en desarrollo, marcada visiblemente como "SIMULACIÓN, SIN VALIDEZ FISCAL". Agregar `FACTURAPI_KEY` a `.env.example` (hoy no está).

### C9 — WhatsApp: la automatización no se activa y, aun activada, falla
- **Dónde:** `whatsapp.service.ts`, `.env.example`, `docker-compose.yml`, `pos.routes.ts`.
- **Qué pasa:**
  1. **Nombres de variables distintos:** `.env.example` y `docker-compose.yml` definen `META_WA_PHONE_NUMBER_ID` y `META_WA_ACCESS_TOKEN` (y un `WHATSAPP_PROVIDER` que el código ni lee); el servicio lee `WHATSAPP_API_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID`. Siguiendo tu propia documentación, **el envío real nunca se activa**.
  2. **Mensajes de texto libre:** envía `type: 'text'`. Según la documentación oficial de Meta, un mensaje iniciado por el negocio fuera de la ventana de 24 horas **solo puede ser una plantilla aprobada**. Los recordatorios a 24 h y 2 h de la cita caen siempre fuera de esa ventana, así que Meta los rechazará.
  3. **Registro mentiroso:** cuando solo se genera el link `wa.me` se guarda el log con `estado: 'ENVIADO'` (el comentario del código lo admite). La alerta de stock mínimo en el POS también registra `ENVIADO` sin enviar nada. Los reportes de notificaciones mienten.
  4. Marca `ENVIADO` cuando la API acepta el mensaje, pero no hay webhook de estados (entregado/leído/fallido).
  5. Usa Graph API `v18.0`, una versión vieja.
- **Corrección:** unificar nombres de variables (en código, `.env.example` y compose); implementar plantillas (`type: 'template'`) con las aprobadas por Meta; estados reales (`LINK_GENERADO`, `ENVIADO`, `ENTREGADO`, `FALLIDO`) alimentados por el webhook de Meta; actualizar la versión de Graph API; y hasta que funcione, la landing debe decir "recordatorio en 1 clic", no "automatizado".

### C10 — La base de datos no se puede desplegar como está
- **Dónde:** `packages/database/prisma/schema.prisma`, `packages/database/.env`, `docker-compose.yml`, `README.md`, `.env.example`.
- **Qué pasa:**
  1. `schema.prisma` fija `provider = "sqlite"` y `url = "file:./dev.db"` (no usa `env("DATABASE_URL")`). Ningún `DATABASE_URL` externo se aplica.
  2. `docker-compose.yml` levanta **PostgreSQL 16** y le pasa una URL `postgresql://...`; con provider SQLite, Prisma **no arranca**. El stack Docker documentado no funciona.
  3. No existe carpeta `migrations/`; `db:migrate` ejecuta `prisma migrate deploy`, que no tiene qué aplicar.
  4. `packages/database/.env` sigue **dentro del zip** con `mysql://root:password@localhost:3306/...` (un motor distinto a los dos anteriores).
  5. `Decimal` en SQLite se guarda como flotante: no es apto para dinero.
- **Corrección:** `provider = "postgresql"`, `url = env("DATABASE_URL")`; generar la migración inicial (`prisma migrate dev --name init`) y versionarla; borrar `.env` del paquete y rotar cualquier credencial; ajustar el README a un único motor; SQLite solo para pruebas locales con un schema aparte, si lo quieres.

---

## 3. 🟠 Hallazgos ALTOS

### A1 — Folio de venta con condición de carrera
`pos.routes.ts`: `countVentas + 1` se calcula **fuera** de la transacción. Dos cobros simultáneos obtienen el mismo folio; la restricción única `(tenantId, sucursalId, folio)` hará fallar uno con error 500, **perdiendo la venta** en pantalla. Corregir con una tabla `Secuencia` incrementada dentro de la transacción (ver Anexo A del plan anterior).

### A2 — Stock con lectura vieja y permitido en negativo
Dentro de la transacción se usa `currentProd.stockActual` leído **antes** (del `productMap`) para calcular `stockNuevo`. Dos ventas concurrentes sobrescriben el valor y el inventario se descuadra; además nunca se valida que haya existencias, así que queda negativo. Usar `update({ data: { stockActual: { decrement: n } } })` con condición `stockActual >= n` y devolver error claro si no alcanza.

### A3 — Visitas del cliente contadas doble (o más)
- `pos.routes.ts` tiene **dos bloques consecutivos** `if (clienteId) { clienteFinal.update ... totalVisitas: { increment: 1 } }`: cada venta suma 2 visitas.
- `PUT /citas/:id/status` con `COMPLETADA` suma otra visita, y repetirlo la suma otra vez (sin idempotencia). Marcar `NO_SHOW` repetido también incrementa `noShows` cada vez.
- Efecto: el CRM, la reactivación de clientes y la lealtad trabajan con datos falsos. Dejar **un solo lugar** que cuente la visita (al cobrar) y validar el estado anterior antes de incrementar.

### A4 — Cancelar una venta borra comisiones ya pagadas
`POST /ventas/:id/cancelar` ejecuta `comision.deleteMany({ where: { ventaId } })` aunque la comisión ya esté `pagada: true`. La nómina liquidada queda sin respaldo y el barbero ya cobró. Debe bloquear la cancelación (o generar un ajuste negativo) cuando la comisión esté pagada. Tampoco revierte `totalVisitas` ni ajusta el corte de caja ya cerrado.

### A5 — El corte de caja cuenta ventas canceladas
`cash.service.ts` y `cortes.routes.ts` (cierre) suman **todas** las ventas de la sucursal desde la apertura, sin filtrar `estado: 'CANCELADA'` (verifiqué que no aparece ese filtro). Una venta cancelada infla efectivo/tarjeta y produce un descuadre falso. También falta el límite superior de fecha y el filtro por el turno/cajero. El mismo filtro conviene revisarlo en `reportes` (no lo leí completo).

### A6 — Los límites de plan no se aplican
`limiteBarberos` y `limiteSucursales` se escriben al registrar y al cambiar de plan, pero **ninguna ruta de creación los comprueba** (no aparecen fuera de auth/admin/suscripción). El plan Básico (3 barberos, 1 sucursal) en la práctica es ilimitado. Validar en `POST /barberos` y `POST /sucursales`, y definir qué pasa al bajar de plan.

### A7 — La prueba de 14 días nunca termina
El registro marca la suscripción `active` con `fechaProximoCobro` a 14 días, y crea el tenant con plan **PRO por defecto**. No encontré ningún proceso que, al vencer esa fecha, pase la cuenta a "en riesgo/suspendida": `ejecutarDunning` solo procesa tenants ya `EN_RIESGO`. Quien se registra puede usar PRO gratis indefinidamente. Necesitas un job diario (cron) que gestione fin de prueba, gracia y suspensión, y una pasarela real conectada al `Checkout`.

### A8 — No hay scheduler: los recordatorios no salen solos
No hay `cron`, cola ni `setInterval` en la API (Redis aparece en `docker-compose.yml`, pero ningún código lo usa; tampoco `JWT_REFRESH_SECRET` ni Sentry). Los recordatorios 24 h y 2 h, el resumen semanal y el dunning existen como funciones/endpoints manuales que **nadie dispara**. La promesa central de la landing no se cumple sin esto.

### A9 — El horario de las citas depende de la zona del servidor
`generateDayTimeSlots` construye fechas con `new Date(year, month, day, h, m)` (hora **local del proceso**). En Railway, Render o Docker el servidor está normalmente en UTC; un horario "09:00" de la barbería se desplazaría ~6 horas. La zona horaria por sucursal existe solo para las "horas silenciosas" de WhatsApp. Guardar `zonaHoraria` en `Sucursal`, y convertir con una librería (`luxon`/`date-fns-tz`) en disponibilidad, reserva, recordatorios y reportes.

### A10 — La reserva pública no valida horario, descanso ni bloqueos
`POST /public/reservar` verifica empalme con otras citas y que la fecha sea futura, pero **no** comprueba que la hora caiga dentro del horario de apertura/cierre, que no sea el día de descanso del barbero ni que no esté en un `BloqueoHorario` (esos solo se consideran al listar disponibilidad). Una petición directa a la API reserva fuera de horario o en un bloqueo.

### A11 — "Cualquier barbero" asigna siempre al primero
Con `barberoId = 'cualquiera'`, el código toma `activeBarbers[0]` sin revisar su disponibilidad: todas las reservas caen en el mismo barbero, y si está ocupado la reserva falla aunque otros estén libres. Debe elegir el primer barbero **libre** en ese horario (idealmente balanceando carga).

### A12 — La protección contra empalmes no es robusta con PostgreSQL
La verificación dentro de `$transaction` usa lectura y luego `create` sin bloqueo. Con aislamiento por defecto de PostgreSQL (READ COMMITTED), dos reservas simultáneas pueden pasar ambas la comprobación. En SQLite las escrituras se serializan y las pruebas de concurrencia probablemente pasan; al migrar a Postgres (C10) el problema aparecería. Usar la restricción de exclusión (`EXCLUDE USING gist`) del Anexo A.5 del plan anterior o `pg_advisory_xact_lock(barberoId)`.

### A13 — Login sin límite de intentos y con fugas de información
- No hay `express-rate-limit` ni bloqueo por intentos (tampoco en `/register` ni en reservas).
- `bcrypt.compareSync` bloquea el hilo principal (un atacante con pocas peticiones degrada toda la API); usar la versión asíncrona.
- Si el usuario no existe se responde sin hacer el hash: el **tiempo de respuesta** delata qué correos existen. `/register` además responde 409 "Ya existe una cuenta" (enumeración).
- Costo de bcrypt = 10 y `hashSync` en el registro; subir a 12 y usar versión asíncrona.
- El orden revisa contraseña antes de `activo` (aceptable), pero un usuario inactivo recibe un 403 distinto que confirma que la cuenta existe y la contraseña es correcta.

### A14 — Sesión de 24 h sin renovación ni revocación
JWT único de 24 horas, sin refresh token (aunque `JWT_REFRESH_SECRET` está en la configuración) y sin lista de revocación: un token robado sirve un día entero y "cerrar sesión" no invalida nada. Desactivar a un barbero (`activo: false`) **no corta su sesión vigente** porque el middleware no consulta al usuario, solo al tenant. Reducir la vida a 15-30 min con refresh rotativo, y verificar `usuario.activo` en cada petición (o con un `tokenVersion`).

### A15 — Inventario: movimientos sin validar
`POST /inventario/movimiento` no valida `tipoMovimiento` (un valor desconocido crea un kardex sin cambiar stock), acepta cantidades negativas (una `ENTRADA_COMPRA` negativa **resta** stock; un `AJUSTE_INVENTARIO` negativo deja stock negativo), no usa esquema zod, y guarda `sucursalId: ''` si el producto no tiene sucursal. Falta también restringirlo a roles de gestión (C2).

### A16 — Nómina sin registro persistente
`POST /comisiones/liquidar` calcula `netoAPagar`, marca las comisiones como pagadas y devuelve un recibo, pero **no guarda** el recibo, ni los adelantos y deducciones (solo van en un texto de auditoría). El folio `NOM-` sale de `Date.now()` y no se puede reimprimir ni consultar. Si el dueño pierde el comprobante, no hay forma de reconstruirlo. Crear tabla `PagoNomina` con folio consecutivo, detalle y comisiones ligadas.

### A17 — Landing con afirmaciones que aún no se sostienen
`LandingView.tsx` ya no tiene las métricas inventadas (bien), pero conserva:
- "Cumplimos con la LFPDPPP" (la política legal existe como vista, pero no hay procedimiento ARCO operativo, consentimiento de clientes finales ni validación legal).
- "**Aislamiento estricto de base de datos**": es filtrado por `tenantId` en una base compartida, y mientras existan los 🔴 C2/C5/C7 no es cierto.
- "Soporte prioritario VIP por WhatsApp 24/7" y "soporte prioritario garantizado": no puedes garantizarlo siendo una sola persona.
- "Automatiza citas por WhatsApp" (ver C9, A8).
Ajusta el texto a lo que **hoy** funciona y vuelve a subir la promesa cuando exista.

---

## 4. 🟡 Hallazgos MEDIOS

| ID | Hallazgo | Dónde | Corrección |
|---|---|---|---|
| M1 | **Mensajes de error internos al cliente.** El POS devuelve `error.message` en el 500 (también en producción); el manejador global sí lo oculta, pero la mayoría de rutas capturan el error antes y responden por su cuenta | `pos.routes.ts` (catch de venta y cancelar) | Mensaje genérico + `code`; registrar el detalle en logs (`pino`) |
| M2 | **Respuesta de login devuelve el objeto `tenant` completo** con suscripción y sucursales, y el de registro `...tenant` | `auth.routes.ts` | Devolver solo los campos que usa el frontend |
| M3 | **Sin validación de entrada en varias rutas.** Existen esquemas zod para login, registro, venta, barbero, producto, caja y reserva, pero `PUT /barberos`, `PUT /productos`, citas internas, movimientos de inventario, nómina, cambiar-plan y varias de clientes leen `req.body` crudo | rutas varias | Esquema zod en **toda** ruta que escriba |
| M4 | **`validateBody` de la reserva pública** y `publicBookingSchema` existen, pero la ruta `/reservar` valida a mano y acepta `duracionMinutos` del cliente cuando no hay servicio | `public.routes.ts` | Usar el esquema y tomar duración/precio **solo** de la BD |
| M5 | **Precio de cita por defecto de 250** si no hay servicio válido (`finalPrecio = 250`) | `public.routes.ts` | Rechazar reservas sin servicio válido |
| M6 | **Registro sin verificación de correo** ni CAPTCHA; cualquiera crea barberías, sucursales, catálogo y barbero de prueba con cuenta "activa" | `auth.routes.ts` | Verificación por correo, CAPTCHA (Turnstile), límite de registros por IP |
| M7 | **Registro no es transaccional.** Crea tenant, suscripción, sucursal, usuario, barbero y productos en pasos separados; un fallo a mitad deja una barbería a medias y el correo "ocupado" | `auth.routes.ts` | Envolver en `prisma.$transaction` |
| M8 | **`SUPER_ADMIN` sin tenant** se resuelve a "systech-global" o a **cualquier** tenant | `auth.ts` | Contexto explícito para super admin; no asignar tenant arbitrario |
| M9 | **Correo único global** (`Usuario.email @unique`): un mismo gerente no puede trabajar en dos barberías y el 409 revela cuentas | `schema.prisma` | Definir el modelo (usuario global con membresías) o `@@unique([tenantId, email])` |
| M10 | **Docker:** el `Dockerfile` hace `npm prune --production` tras generar Prisma y copia solo `dist` y `packages/database`; no ejecuta migraciones al arrancar ni incluye el CLI de Prisma para `migrate deploy`. `docker-compose.yml` publica los puertos de Postgres y Redis al host y trae contraseñas por defecto | `Dockerfile`, `docker-compose.yml` | Paso de migración en el arranque, no exponer puertos de BD, sin contraseñas por defecto |
| M11 | **Scripts solo Windows:** `"dev": "start npm run dev:api & start npm run dev:web"`; `create_zip.ps1` y `backup_restore.ps1`. El zip generado usa **barras invertidas** y se extrae mal en Linux, Mac y Docker | `package.json`, `scripts/` | `concurrently`; empaquetar con `git archive`/`tar`; Node scripts multiplataforma |
| M12 | **Pruebas poco fiables.** Son 4 scripts de Node que requieren API y BD ya levantadas; `run_all_tests.js` imprime un mensaje fijo "TODAS LAS PRUEBAS (79/79) PASARON... LISTO PARA PRODUCCIÓN" cuando ninguna suite falla, **sin contar** realmente. No hay casos de rol (C2), ni de webhook sin firma (C4), ni de suspensión (C6), ni pruebas unitarias con un runner (Vitest/Jest) ni CI (`.github/` no existe) | `scripts/` | Vitest + Supertest con BD de prueba; contar aserciones reales; GitHub Actions |
| M13 | **Notificaciones registradas como enviadas sin enviarse** (stock mínimo, link `wa.me`) | `pos.routes.ts`, `whatsapp.service.ts` | Estados reales; ver C9 |
| M14 | **Observabilidad ausente.** `SENTRY_DSN`, `REDIS_URL` y `JWT_REFRESH_SECRET` están en la configuración pero nada los usa; los logs son `console.error`; `/api/health` solo hace `SELECT 1` y devuelve la versión `1.2.0` fija | `index.ts` | Sentry en API y web, logs estructurados, alertas, métricas |

### Otros puntos menores
- **Frontend:** token y usuario viven en `localStorage` (`systech_token`, `systech_user`); un XSS los roba. El selector de rol de la barra superior (`onSelectRole`) parece un resto de demo: si sigue visible en producción confunde (la API ya no confía en él, pero la UI sí cambia de vista). Revisa que no exponga pantallas de Super Admin a quien no lo es.
- **Legal:** el Aviso de Privacidad pone un domicilio impreciso ("Av. Álvaro Obregón, Colima / Ciudad de México") y no vi razón social, RFC ni correo ARCO identificables; debe revisarlo un abogado antes de publicarse.
- **SEO:** `sitemap.xml` apunta a `https://systech.mx/`; confirma que ese dominio es tuyo y que `/login` existe como ruta pública.
- **Formato:** varios archivos mezclan finales de línea CRLF/LF; fijar con `.gitattributes`.
- **Versiones:** `lucide-react` y `vite 4` están atrasados; `stripe@13`, `twilio` y `Graph API v18` también. `twilio` está instalado y no se usa.

---

## 5. ✅ Lo que revisé y está bien (no tocar)

- Contraseñas con bcrypt, JWT firmado con expiración, atajo `123456` eliminado, rechazo de token sin firma.
- Todas las rutas de `/api/admin` exigen `SUPER_ADMIN`.
- Filtrado por `tenantId` correcto en: `citas/:id/status`, `bloqueos`, `barberos/:id`, `cortes/cerrar`, `productos/:id`, `inventario/movimiento` (lectura), cancelación de venta, comisiones, reserva pública (sucursal, barbero, servicios).
- Precio de venta tomado de la BD; cantidad acotada 1-99; descuento acotado al subtotal; propina no negativa; redondeo a 2 decimales centralizado en `pricing.service.ts`.
- Venta, items, stock, kardex y comisión dentro de **una transacción**.
- Cancelación de venta con motivo obligatorio, reverso de stock y bitácora.
- `helmet`, CORS con lista blanca, `express.json` con límite de 100 kb, validación zod en las rutas principales de creación.
- Índices y unicidades útiles en el schema; borrado lógico (`eliminadoEn`).
- Token de cancelación largo (32 bytes) y política de 2 horas en la ruta por token.
- `simular-pago` bloqueado cuando `NODE_ENV === 'production'`.
- Idempotencia de webhooks mediante `EventoPago`.
- El frontend compila sin errores.

---

## 6. 🔵 Mejoras recomendadas (no son bugs)

### 6.1 Para poder vender más fácil
1. **Importar clientes y catálogo por CSV/Excel** en el onboarding (la barbería llega con su libreta).
2. **Demo pública de solo lectura** con datos de ejemplo que se reinicia sola.
3. **Checklist de activación** hasta completar: logo, servicios, barberos, horarios, primera cita, primera venta, compartir el link de reservas.
4. **QR descargable** del portal de reservas y botón "copiar link para Instagram".
5. **URL propia por barbería** (`/b/slug`) sin hash.
6. **Plan de entrada más barato** (1 barbero) y precio **Fundador** congelado.
7. **Resumen semanal automático** al dueño (ya existe el endpoint; falta el scheduler y el envío real).
8. **Video de 60-90 segundos** mostrando reserva → cobro → comisión.

### 6.2 Producto
- Arrastrar y soltar citas, vista semanal por barbero, multi-servicio con duración sumada (ya hay parte del backend).
- Lista de espera con aviso automático al cancelarse una cita (existe la lógica; falta que dispare mensajes).
- **Anticipos o depósito** al reservar para bajar no-shows (Stripe/Mercado Pago).
- Membresías de corte para el cliente final y tarjeta de lealtad (hay tablas en el schema; falta la UI y el cobro).
- Reactivación de clientes inactivos con mensaje en 1 clic.
- Esquemas de comisión flexibles (por servicio, escalonado, renta de silla) con **historial de porcentajes**.
- Proveedores y órdenes de compra, costo promedio y margen por producto (hay tablas; falta flujo completo).
- Exportación a Excel/PDF de reportes y del corte de caja.
- Vista del barbero: su agenda, sus ventas, su comisión acumulada.
- Ticket térmico 58/80 mm y compartir ticket por WhatsApp/correo.
- Modo sin conexión (PWA con cola local) para barberías con internet inestable.

### 6.3 Calidad técnica
- Un solo cliente de Prisma con extensión que **inyecte `tenantId`** automáticamente para evitar errores humanos futuros.
- Partir `pos.routes.ts` (607 líneas) y `public.routes.ts` (549) en controladores y servicios.
- Tipos compartidos y esquemas zod entre API y web (`packages/shared`).
- Cola de trabajos (BullMQ + Redis o `pg-boss`) para recordatorios, dunning y resumen semanal.
- TanStack Query en el frontend, formularios con `react-hook-form` + zod, y `React.lazy` por ruta (el bundle es de ~480 kB).
- Accesibilidad básica (foco, etiquetas, contraste) en modales y formularios.
- Tema/estilo del titular de la landing: revisar el borde cromático del texto.

### 6.4 Operación y negocio
- Staging y producción separados; backups diarios con **restauración probada**; monitoreo de disponibilidad con alertas al celular.
- Centro de ayuda con 10 artículos y un canal de soporte con horario realista.
- Panel Super Admin con MRR, churn, trials activos y cuentas en riesgo; impersonación **auditada** para soporte.
- Documentar el procedimiento ARCO y el contrato de tratamiento de datos con cada barbería.

---

## 7. Plan de corrección recomendado

| Orden | Bloque | Incluye | Resultado verificable |
|---|---|---|---|
| **1** | **Seguridad base** (~2-3 días) | C1, C2, C3, C4, C5, C6 | Sin `JWT_SECRET` el proceso no arranca; `BARBERO` recibe 403 en rutas de gestión; webhook sin firma → 400; `clienteId` ajeno → 404; `?/suscripcion` ya no evita la suspensión |
| **2** | **Datos y despliegue** (~3-4 días) | C10, M10, M11 | Postgres + migración inicial versionada; `docker compose up` levanta todo; sin `.env` en el repo |
| **3** | **Citas públicas seguras** (~2-3 días) | C7, A9, A10, A11, A12, M4, M5 | Brute force limitado; GET no entrega token; reserva fuera de horario rechazada; 20 reservas simultáneas → 1 gana (**en Postgres**) |
| **4** | **Dinero correcto** (~3-4 días) | A1, A2, A3, A4, A5, A16 | Folio consecutivo bajo carga; stock nunca negativo; visitas sin duplicar; corte sin ventas canceladas; nómina con comprobante guardado |
| **5** | **Cobros reales y ciclo de vida** (~1 semana) | C3 (checkout), A6, A7, A8 | Alta → prueba de 14 días → cobro/suspensión automáticos; recordatorios que salen solos |
| **6** | **Integraciones** (~1 semana) | C8, C9, A13, A14 | WhatsApp con plantillas y estados reales; CFDI sin simulación en producción; sesión corta con refresh |
| **7** | **Calidad y legal** (~1 semana) | M1-M3, M6-M9, M12-M14, A17 | Vitest + CI verde; Sentry activo; landing y avisos legales revisados |
| **8** | **Piloto** | — | 3 barberías reales usando el sistema con seguimiento diario |

**Regla:** no pasar al siguiente bloque sin cumplir el resultado verificable. El bloque 1 es lo único que no admite excepción antes de enseñarle el sistema a un cliente real.

---

## 8. Pruebas que deben existir antes del lanzamiento

**Seguridad**
- Arranque en producción sin `JWT_SECRET` → falla.
- `BARBERO` → 403 en: crear/editar barbero, cancelar venta, liquidar nómina, cerrar caja, editar producto, movimiento de inventario, reportes, cambiar plan.
- Tenant A con ids de Tenant B (`clienteId`, `citaId`, `corteId`, `productoId`, `barberoId`, `ventaId`) → 404/400 en **todas** las rutas.
- Token con firma inválida, expirado o de usuario desactivado → 401.
- Tenant suspendido: ninguna ruta operativa funciona, ni con `?/suscripcion`.
- Webhook de Stripe sin firma o con firma errónea → 400.
- Más de N intentos de login/reserva/consulta de cita → 429.

**Dinero**
- 20 ventas simultáneas → 20 folios distintos y consecutivos, sin errores.
- Venta con stock insuficiente → rechazada; stock final consistente tras ventas concurrentes.
- Una venta con cliente suma **1** visita.
- Cancelar venta con comisión pagada → bloqueada o ajustada.
- Cierre de caja con ventas canceladas → no se cuentan.
- Casos de redondeo: descuentos, propinas, pagos mixtos, comisiones con porcentajes distintos.

**Reservas**
- 20 reservas simultáneas al mismo horario → 1 gana, 19 reciben 409 (en PostgreSQL).
- Reserva fuera de horario, en día de descanso o en bloqueo → rechazada.
- Consulta de cita no devuelve token ni notas; ruta heredada de cancelación eliminada.
- "Cualquier barbero" reparte entre libres.

**Operación**
- `docker compose up` desde cero + migraciones + seed de producción → API sana.
- Backup y restauración probados con datos reales.
- Una prueba manual de un día completo contra Excel que cuadre al centavo.

---

## 9. Qué necesito de ti para seguir

1. Corre en tu máquina `npm run db:generate && npm run build:api && npm test` (con la API y la BD levantadas) y pásame la salida completa: así confirmo qué errores de tipos son reales y si las pruebas realmente pasan.
2. Dime qué motor de base de datos eliges (recomiendo PostgreSQL).
3. Confirma si el dominio `systech.mx` es tuyo.
4. Dime si quieres que te escriba los parches de los 10 críticos como un `.patch` por archivo, o que los aplique directamente sobre una copia del código.

---
*Fin del reporte.*
