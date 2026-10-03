# Auditoría del POS de barbería

**Proyecto:** `POS_Barberia_Software.zip`  
**Fecha de revisión:** 3 de octubre de 2026  
**Resultado:** la aplicación tiene una base funcional amplia y varias correcciones importantes ya incorporadas, pero **no pude confirmar que compile ni que arranque**. La configuración de despliegue incluida tiene una incompatibilidad concreta entre SQLite y PostgreSQL. Además, detecté riesgos de autorización y consistencia de dinero/inventario que conviene resolver antes de usar el sistema con operaciones reales.

## Resumen ejecutivo

| Área | Estado comprobado |
|---|---|
| Contenido del ZIP | 122 entradas; archivos de frontend, API, esquema de datos, migración, scripts y documentación presentes. No encontré archivos `.env` activos ni `node_modules`. |
| Sintaxis de JavaScript | Revisé 12 archivos `.js` con Node.js: sin errores de sintaxis. Esto no compila TypeScript ni verifica React. |
| Compilación | **No verificada.** No está disponible `npm`, requerido por los scripts del proyecto. |
| Pruebas automatizadas | **No ejecutadas.** El lanzador se detuvo antes de correr casos porque no encontró `npm`; no se hizo ninguna aserción. |
| Docker | **No verificado en ejecución.** Docker no está instalado en este entorno. La revisión estática sí encontró que el esquema de Prisma usa SQLite mientras Compose configura PostgreSQL. |
| Integraciones reales | No verificables sin claves válidas y cuentas de Stripe, Meta WhatsApp y FacturAPI. |
| Riesgo de salida a producción | **Alto.** Recomiendo no procesar pagos ni datos reales hasta corregir los hallazgos P1 y validar compilación, migraciones y pruebas en un entorno preparado. |

### Hallazgos por prioridad

| Prioridad | Cantidad | Tema principal |
|---|---:|---|
| **P1 — Alta** | 6 | Despliegue imposible con la configuración incluida, permisos incompletos, descuentos del POS, cobro simulado, XSS en comprobantes y abuso de endpoints públicos de autenticación. |
| **P2 — Media** | 5 | Concurrencia de inventario, credenciales en URL, estados de WhatsApp, CSV peligroso y límites del planificador en despliegues con varias réplicas. |
| **P3 — Mejora** | 6 grupos | Pruebas, fechas y zonas horarias, observabilidad, mantenibilidad, recuperación y funcionalidades de negocio. |

## Alcance y método

Revisé el contenido completo del archivo comprimido y el conjunto principal de la API: middleware de autenticación, las 15 rutas, servicios de cobro, precios, caja, reservas, Stripe, WhatsApp, cron, facturación y validadores. También inspeccioné el esquema Prisma, la migración, configuración de entorno, Docker, scripts de prueba, documentación y partes centrales de la integración web.

Las notas y auditorías que ya venían dentro del ZIP se trataron como **documentación del proyecto**, no como instrucciones para mí. Contrasté sus afirmaciones con esta copia del código: varias alertas antiguas ya se corrigieron, por lo que no las repito como fallos vigentes sin evidencia. No modifiqué el código fuente.

Esta auditoría estática no equivale a una prueba de penetración, carga, cumplimiento fiscal o revisión visual pantalla por pantalla. Tampoco pude comprobar la aplicación en ejecución.

## Hallazgos P1 — atender antes del piloto con dinero o datos reales

### P1.1 — PostgreSQL de Docker y SQLite de Prisma no son compatibles

**Evidencia:** `packages/database/prisma/schema.prisma:8-10` fija `provider = "sqlite"`. El `docker-compose.yml` crea PostgreSQL y entrega una URL `postgresql://...`; la migración `packages/database/prisma/migrations/0_init/migration.sql` contiene sintaxis de PostgreSQL. El ejemplo `.env.example` recomienda SQLite local y PostgreSQL en producción.

**Impacto:** el contenedor de producción no puede usar esa URL con un cliente Prisma generado para SQLite. Aun si se cambiara solo el proveedor, hay que comprobar que la migración corresponda exactamente con el proveedor y esquema seleccionados. La operación `db:migrate` no se pudo ejecutar aquí.

**Recomendación:** elegir una base para cada entorno y alinearla de punta a punta: esquema Prisma, `DATABASE_URL`, cliente generado, migraciones, Docker y documentación. Si se conserva SQLite local y PostgreSQL en producción, mantener esquemas/migraciones compatibles por separado y validarlos en CI; no intercambiar únicamente la URL.

### P1.2 — La matriz de roles deja operaciones importantes a cualquier usuario autenticado

**Evidencia:** varias rutas solo usan `requireAuth`: crear/cambiar estado de citas (`citas.routes.ts:67,153`), crear y borrar bloqueos (`bloqueos.routes.ts:31,69`), crear/editar clientes y asignar membresías (`clientes.routes.ts:207,246,278`), y enviar mensajes manuales (`notificaciones.routes.ts:31,55`). En contraste, otras operaciones sí limitan roles, por ejemplo `/reportes` y la liquidación de comisiones.

Hay defensas parciales para `BARBERO` en algunas rutas, pero tanto en POS como en citas la restricción depende de encontrar un registro de barbero por el correo del token. Si no existe esa correspondencia, el código no devuelve 403 y la operación puede continuar con el barbero enviado por el cliente. Además, el acceso a horarios permite bloquear o liberar agenda sin un permiso explícito de gerente.

**Impacto:** un usuario con rol de barbero podría alterar agenda, bloquear horarios, registrar citas de otros barberos, cambiar datos de clientes/asignar membresías o enviar mensajes arbitrarios. La vista web no sustituye el control en la API.

**Recomendación:** documentar una matriz por acción y aplicarla uniformemente en servidor. Fallar cerrado si una cuenta `BARBERO` no se puede asociar a un perfil; restringir las operaciones a ese perfil; reservar bloqueos, membresías, edición de clientes, mensajería y cambios de estado administrativos a los roles autorizados.

### P1.3 — Un barbero puede descontar hasta el 100% y conservar la comisión calculada sobre el precio completo

**Evidencia:** `createSaleSchema` permite `descuento` desde cero, sin límite por rol (`validators/schemas.ts`). `calculateSaleTotals` limita el descuento al subtotal, pero calcula comisiones sobre el precio de cada partida antes de descontar (`services/pricing.service.ts`). `POST /ventas` admite usuarios autenticados sin `requireRole` (`pos.routes.ts:14-17`).

**Impacto:** la venta puede registrarse gratis mientras genera la comisión como si se hubiera cobrado el precio completo. También permite descuentos totales sin autorización de gerente.

**Recomendación:** limitar descuentos por porcentaje y monto en servidor, exigir permiso para superar el límite, y definir explícitamente cómo se distribuye un descuento entre partidas para calcular comisiones. Registrar quién aprobó la excepción. Añadir pruebas que cubran descuento de 0%, parcial, subtotal completo y valores excesivos.

### P1.4 — El flujo de suscripción responde éxito aunque no haya creado un checkout real

**Evidencia:** `suscripcion.routes.ts:86-160` genera una URL con apariencia de Stripe si no hay SDK/llaves, y conserva una URL sintética si Stripe da error. `/portal-cliente` también devuelve una URL de prueba cuando no existe sesión de portal real. En producción `/cambiar-plan` crea otra URL construida manualmente (`suscripcion.routes.ts:195-205`). Además, la sesión real incluye `plan` en `metadata`, pero el caso `checkout.session.completed` de `stripe.service.ts` solo activa la suscripción y el tenant; no aplica el plan ni sus límites al tenant.

**Impacto:** la interfaz puede presentar una liga que parece válida y bloquear al cliente en un flujo de pago que nunca existió. Incluso cuando Stripe cobra una sesión real, el plan comprado puede no aplicarse al tenant. El usuario puede asumir que ya tiene un medio de pago o que un cambio se procesó.

**Recomendación:** en producción responder error explícito si Stripe no está configurado o falla; nunca devolver una URL inventada. Crear la sesión real desde un único servicio y aplicar plan/límites únicamente al confirmar el evento firmado, comprobando los datos de plan asociados a la sesión. Probar compra, cancelación, reintento y pago fallido con Stripe de prueba.

### P1.5 — Comprobantes HTML interpolan texto guardado sin escapar

**Evidencia:** `pos.routes.ts:660-760` incrusta nombres de barbería, sucursal, cliente, barbero y productos en una página HTML; `public.routes.ts:800-855` hace lo mismo con comprobantes de cita y datos de sucursal, cliente y servicios. No encontré escape HTML en esos puntos.

**Impacto:** contenido almacenado con etiquetas o JavaScript puede ejecutarse cuando alguien abre el comprobante. El comprobante público de cita es especialmente delicado porque parte de los datos se originan en el formulario de reserva.

**Recomendación:** escapar todos los valores en contexto HTML, incluidos atributos y texto; preferir un renderizador que escape por defecto. Agregar pruebas con `<`, `>`, comillas y una carga XSS inocua, comprobando que aparezca como texto y no se ejecute.

### P1.6 — Login, registro y onboarding no tienen límite de intentos

**Evidencia:** el limitador en memoria solo se monta en `public.routes.ts:18-40`. Las rutas públicas de inicio de sesión, registro y configuración inicial están en `auth.routes.ts:15,86,369` sin limitador visible.

**Impacto:** pueden automatizar intentos de contraseña, creación masiva de cuentas o consumo de recursos. El límite en memoria de rutas públicas tampoco coordina varias instancias y puede reiniciarse al reiniciar el proceso.

**Recomendación:** aplicar límites separados a login, registro y onboarding, con espera progresiva y métricas; utilizar almacenamiento compartido cuando haya varias instancias. Evitar bloquear cuentas permanentemente por intentos, para no facilitar denegación de servicio.

## Hallazgos P2 — corregir antes del lanzamiento general

### P2.1 — El control de existencias no es atómico con la lectura

**Evidencia:** `pos.routes.ts:302-323` lee el stock y compara que alcance; después decrementa usando `where: { id }`, sin condición `stockActual >= cantidad` en la misma escritura.

**Impacto:** dos cobros simultáneos pueden leer la misma existencia antes de descontar y dejar inventario incorrecto o negativo, según el motor y aislamiento de transacciones.

**Recomendación:** realizar una actualización condicional atómica (`stockActual >= cantidad`) y exigir que afecte exactamente una fila. Si no, abortar con error de stock. Probar con dos ventas concurrentes que compitan por las últimas unidades en la base elegida para producción.

### P2.2 — Los tokens viajan en la URL y quedan expuestos en registros/historial

**Evidencia:** el middleware acepta `req.query.token` (`middleware/auth.ts:32-35`). La web crea una URL de comprobante de caja con `?token=...` (`apps/web/src/api.ts`, método `printCorteHtml`).

**Impacto:** las URL pueden quedar en historial del navegador, logs del proxy, capturas, analítica o encabezados de referencia. El token es una credencial portadora.

**Recomendación:** autenticar mediante encabezado Authorization cuando se pueda. Para impresión en otra pestaña, emitir una liga de un solo uso, alcance limitado y corta duración; no aceptar JWT general en query string. Configurar además política `Referrer-Policy` adecuada.

### P2.3 — WhatsApp registra “ENVIADO” cuando Meta acepta la solicitud, no cuando el cliente lo recibe

**Evidencia:** `whatsapp.service.ts:267-274` guarda `ENVIADO` al recibir una respuesta exitosa de la API; no se encontró procesamiento de estados de entrega ni endpoint de webhook de Meta. Cuando no hay credenciales usa `LINK_GENERADO` (`:325-340`), que sí distingue el modo manual.

**Impacto:** el historial y las métricas pueden dar por entregado un recordatorio aunque se haya rechazado o no haya llegado. El flujo automatizado envía texto libre (`:236-252`); la elegibilidad del contenido y la ventana de conversación debe probarse con la configuración real de Meta.

**Recomendación:** separar estados `ACEPTADO`, `ENTREGADO`, `LEÍDO` y `FALLIDO`; asociar IDs del proveedor y procesar webhooks firmados. Confirmar con Meta el uso de plantillas aprobadas en recordatorios iniciados por el negocio. La prueba de integración debe verificar las respuestas reales del proveedor.

### P2.4 — La exportación CSV no neutraliza fórmulas ni escapa comillas

**Evidencia:** `reportes.routes.ts:234-254` arma el CSV manualmente. Sustituye comas por espacios, pero no neutraliza valores que comienzan con `=`, `+`, `-` o `@` ni escapa comillas/saltos de línea.

**Impacto:** un nombre controlado por un usuario podría abrirse como fórmula al exportar en Excel; los nombres con comillas o saltos pueden desalinear columnas.

**Recomendación:** utilizar una librería CSV con escape correcto y neutralizar fórmulas en campos de texto. Probar valores adversariales y acentos en Excel/LibreOffice.

### P2.5 — El programador de tareas vive dentro de cada proceso de API

**Evidencia:** `CronService.init` inicia un `setInterval` (`services/cron.service.ts:18-37`) y se llama al escuchar la API (`index.ts`, arranque). El cerrojo `isRunning` solo existe en memoria de cada proceso.

**Impacto:** con dos o más réplicas, cada instancia puede procesar recordatorios y dunning al mismo tiempo. Una interrupción puede dejar tareas pendientes; no hay cerrojo distribuido ni cola durable.

**Recomendación:** ejecutar las tareas en un trabajador único o en cola programada durable, con claves de idempotencia por cita/evento y reclamación atómica. Agregar métricas de última ejecución y errores.

## P3 — Mejoras de producto y calidad

1. **Zonas horarias por sucursal.** Las fechas para disponibilidad usan fechas locales del proceso en `booking.service.ts`; la configuración de horario de verano o servidor UTC puede desplazar citas. Guardar IANA timezone por sucursal y probar cambios de horario, medianoche y reservas cercanas.
2. **Separar dinero de punto flotante.** Los cálculos redondean valores a centavos, pero el esquema usa `Decimal` con SQLite. Para contabilidad, fijar proveedor final, precisión/escala del campo y reglas de redondeo; probar descuentos, propinas, comisiones y devoluciones en esa base.
3. **Reforzar la identidad del JWT.** `requireAuth` comprueba que el usuario siga activo, pero utiliza el rol y tenant del token sin compararlos con los campos actuales del usuario (`middleware/auth.ts:48-82`). Al cambiar rol o asociación, un token anterior mantiene sus claims hasta que venza. Comparar `dbUser.rol` y `dbUser.tenantId` con el token o invalidar sesiones ante cambios.
4. **Persistencia del token web.** `apps/web/src/api.ts` guarda el JWT en `localStorage`. Reducir duración, habilitar revocación/rotación y valorar cookie `HttpOnly`, `Secure`, `SameSite` con protección CSRF según la arquitectura de dominios.
5. **Webhook Stripe concurrente.** Hay registro de eventos e idempotencia (`stripe.service.ts`), pero el patrón primero lee y luego procesa. Dos entregas simultáneas del mismo evento podrían entrar antes de que una marque el evento como procesado. Probar duplicación paralela y usar reclamación/clave idempotente atómica.
6. **Backups y restauración.** Hay scripts de backup, pero no pude probarlos. Añadir pruebas de recuperación en una base limpia, retención, cifrado, verificación de integridad y procedimiento documentado con responsables.
7. **Cupones y planes configurables.** El cupón `FUNDADOR` se acepta en código con descuento fijo (`stripe.service.ts:461+`), al margen de reglas administrables de vigencia, cupo o elegibilidad. Si es una oferta temporal, trasladarla a configuración y auditar sus usos.
8. **Observabilidad.** Sustituir `console` por logs estructurados con correlación de solicitud, eliminar datos sensibles de errores, y alertar sobre errores de pago, tareas atrasadas y fallos de envío.
9. **PWA/offline e integraciones operativas.** Después de resolver confiabilidad del backend, valorar modo POS sin conexión con cola de sincronización idempotente, lector de código de barras, reservas recurrentes, lista de espera con consentimiento, tarjetas de regalo y exportes contables configurables.

## Correcciones importantes que sí aparecen en esta copia

Para evitar dar por vigentes alertas viejas del propio ZIP, confirmé algunos arreglos ya presentes:

- La clave JWT de producción falla al arrancar si falta o parece predeterminada (`middleware/auth.ts`); el fallback queda para desarrollo.
- Hay validación de roles en administración, reportes, cobro de nómina, cancelación de ventas, inventario y cambios de plan.
- POS valida que cliente y cita pertenezcan al tenant; los productos se buscan dentro del tenant y el precio se calcula desde catálogo.
- Los comprobantes de consulta de cita omiten algunos campos privados; las cancelaciones exigen token largo en las rutas revisadas.
- El flujo Stripe exige firma y cuerpo crudo en producción; hay control de eventos repetidos.
- La cancelación de venta impide revertir una comisión ya liquidada, restaura stock y registra auditoría.
- Se filtran las ventas canceladas al cerrar caja y al generar reportes revisados.
- Hay validadores Zod para login/registro, reservación, cobros, alta de barberos, productos y caja.

Estos controles reducen riesgos, pero no reemplazan las correcciones y pruebas pendientes de este informe.

## Qué ejecuté y qué no

| Comprobación | Resultado |
|---|---|
| Inventario y extracción segura del ZIP | Completo. No había rutas internas con `..` ni rutas absolutas. |
| `node --check` para archivos `.js` | **12 de 12 sin errores de sintaxis.** |
| `node scripts/run_all_tests.js` | **Falló antes de las pruebas:** el script intentó `npm run build:api`, pero `npm` no está instalado/disponible. No corrió ninguna suite. |
| Compilación TypeScript y frontend | No ejecutable aquí: requiere npm/dependencias; no hay `node_modules`. |
| Prisma Client/migraciones | No ejecutable aquí por falta de npm/Prisma. |
| Docker Compose | No ejecutable: Docker no está disponible. La incompatibilidad de proveedores se confirmó leyendo archivos. |
| Integraciones externas | No probadas; requieren llaves y endpoints de prueba válidos. |

El resultado de sintaxis JavaScript no prueba que las rutas TypeScript compilen ni que el programa funcione. Para cerrar esta parte, ejecutar en un equipo con dependencias:

```text
npm ci
npm run db:generate
npm run build
npm test
```

Antes de ejecutar las pruebas contra datos reales, preparar una base desechable: los scripts de fases hacen solicitudes HTTP y pueden crear/modificar datos. Configurar también credenciales de integración de prueba, no llaves de producción.

## Plan recomendado

### Bloque 1 — antes de demo con datos persistentes

1. Alinear PostgreSQL/SQLite y generar migraciones reproducibles.
2. Cerrar la matriz RBAC y restricciones por perfil de barbero.
3. Limitar descuentos y definir comisiones sobre descuentos.
4. Eliminar URLs de pago sintéticas y probar el webhook con Stripe test.
5. Escapar HTML en comprobantes y añadir casos XSS.
6. Añadir límites a login, registro y onboarding.

### Bloque 2 — antes del lanzamiento

1. Hacer decremento de stock condicional y probar concurrencia.
2. Sacar tokens de URLs y definir expiración/revocación de sesión.
3. Corregir CSV, distinguir aceptación y entrega de WhatsApp.
4. Separar scheduler de API o añadir coordinación durable.
5. Ejecutar compilación completa, todas las suites y prueba de restauración de backup en CI.

### Criterio de salida

Consideraría listo para un piloto con dinero real cuando compile desde instalación limpia, las migraciones creen la base prevista, cada rol tenga pruebas negativas/positivas, las ventas concurrentes no alteren stock ni folios, Stripe solo active planes por webhooks auténticos, y los comprobantes no ejecuten contenido ingresado por usuarios.
