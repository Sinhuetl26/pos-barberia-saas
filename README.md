# SYSTECH Studio · POS y operación de barberías

[Inicio de documentación y Obsidian](INICIO.md) · [Mapa de carpetas](docs/obsidian/ESTRUCTURA.md)

Monorepo SaaS para México con agenda, reservas públicas, ventas, caja, clientes, inventario, comisiones y administración de licencias. Mercado: barberías independientes y cadenas.

**Estado: en desarrollo y validación comercial.** Las pruebas locales no certifican preparación para producción. La conexión por barbería de WhatsApp y CFDI, la sincronización completa de licencias, PostgreSQL, hardware y operación de soporte requieren validación antes de venta general.

## Plan de lanzamiento vigente

Objetivo comercial: primeros diez negocios de pago en México, independientes y cadenas. El plan vigente define sprints, criterios de aceptación, puertas de lanzamiento y responsabilidades. El catálogo propuesto ya se usa en el producto de desarrollo; los precios remotos de Stripe y la aprobación fiscal/comercial siguen pendientes.

- [Plan ágil y licencias recomendadas](docs/PLAN_AGIL_LANZAMIENTO.md)
- [Backlog de 40 historias verificables](docs/BACKLOG_LANZAMIENTO.json)
- [Presupuesto, mantenimiento y rentabilidad](docs/COSTOS_Y_PRECIOS.md)
- [Supuestos editables del modelo](docs/MODELO_ECONOMICO.json)
- [Tablero Scrum y control de sesiones](docs/scrum/TABLERO.md)
- [Primer sprint y subtareas](docs/scrum/SPRINT_01.md)
- [ST-01: catálogo implementado, pruebas y pendientes](docs/scrum/ST01_EVIDENCIA.md)
- [ST-02: permisos implementados, matriz y evidencia](docs/scrum/ST02_EVIDENCIA.md)
- [Revisión actual de ST-01 a ST-04: conexiones, reintentos y comprobación previa](docs/scrum/ST01_04_REINTEGRACION.md)

Regenerar los escenarios con `node scripts/modelo_economico.js`. El cálculo no accede a cuentas, claves ni bases. Los roadmaps anteriores son antecedentes; usar este plan ante contradicciones.

Regenerar las vistas del respaldo local con `node scripts/tablero_scrum.js`. [Notion](https://app.notion.com/p/3f02035ac0d0815499d2f73304873c63?pvs=204) es el tablero principal, ya conectado y configurado; actualizar el respaldo del backlog al cierre de cada sesión. Bitácora y decisiones documentan resultados; los IDs externos se conservan en `docs/scrum/NOTION_VINCULOS.json`. No hay sincronización automática bidireccional configurada.

## Experiencia Studio

- Navegación por rol, selector de sucursal y menú móvil.
- Inicio con ventas sin propinas, citas del día, equipo, caja y señales de seguimiento.
- Fechas del resumen según la zona horaria de cada sucursal.
- Centro de conexiones que muestra configuración y desarrollo pendiente, sin exponer secretos.
- Licencia con checkout externo de Stripe, sin pedir tarjeta en la aplicación ni inventar recibos.

## Arquitectura

- `apps/web`: React, TypeScript, Vite y Tailwind.
- `apps/api`: Express y TypeScript con JWT, roles, validación, servicios y rutas.
- `packages/database`: Prisma; SQLite local y esquema PostgreSQL para despliegue.
- `scripts`: desarrollo, demostración aislada y pruebas.

## Desarrollo

Instalar dependencias con `npm install`. Copiar `.env.example` a `.env` y configurar valores reales solo cuando se conecten servicios. No subir claves ni bases de datos a Git.

```sh
npm run db:generate
npm run dev
```

La API usa 3001 y la web 5173 por defecto. El archivo `apps/web/.env.example` describe la URL de la API. Para producción definir una URL real; no conservar localhost en el frontend publicado.

En Windows, detener los procesos que carguen el cliente Prisma antes de regenerarlo: el sistema puede bloquear la sustitución del motor mientras está en uso.

## Pruebas aisladas

```sh
npm test
npm run test:commercial
```

El ejecutor recompila la API, crea bases desechables y usa su propio servidor. No reutiliza la API de desarrollo ni modifica su base. Los proveedores externos permanecen desconectados.

Verificación de ST-04: **8/8 suites aprobadas tanto en SQLite aislado como en PostgreSQL real**, además de diez comprobaciones de migración, conservación y recuperación. La evidencia está en `docs/scrum/ST04_EVIDENCIA.md`. La validación de cuentas externas y hardware continúa en sus respectivas historias.

Verificación actual de ST-05 (7 de octubre): **9/9 suites en cada motor**, incluidos 17 escenarios de integridad con dos procesos API. Cobro pendiente y recuperación tras perder la respuesta y recargar comprobados en demo móvil. Evidencia: `docs/scrum/ST05_EVIDENCIA.md`. Migración aditiva probada en copias aisladas; pendiente de aplicar a la base operativa con respaldo y conciliación. Los resultados actuales PostgreSQL se guardan en `POSTGRES_RESULTADOS_ACTUALES.json`, conservando el histórico ST-04. No acredita liquidación bancaria, fiscalidad ni despliegue comercial.

La fuente de planes es `packages/licensing/catalog.json`. Los límites de personal son por sucursal y se comprueban en el servidor en transacciones; una reducción incompatible conserva datos y devuelve conflicto. Se usan precios `STRIPE_PRICE_<CODIGO>_TEST` o `_LIVE` según ambiente. `LICENSE_TAX_POLICY=PENDIENTE` bloquea nuevos cobros live; la revisión fiscal y el ciclo completo de Stripe se completan antes de vender.

También se pueden ejecutar `npm run test:phase0`, `test:phase1`, `test:phase2` y `test:phase3`. Los scripts internos de esas fases requieren `SYSTECH_ISOLATED_TESTS=true`; utilizar los comandos de npm para que preparen un entorno seguro.

## Demostración sin datos reales

```sh
npm run demo:api
```

Crea negocios ficticios en una base separada y sirve la API en 3101. Iniciar la web con `VITE_API_URL=http://localhost:3101/api` y:

```sh
npm run dev --workspace=@systech/web -- --host 127.0.0.1 --port 5178 --strictPort
```

Cuenta ficticia: `dueno@elbigote.com` / `Dueno123!`. No desplegar las cuentas de demostración en producción.

## Compilación y despliegue

```sh
npm run build
```

Docker cambia al esquema PostgreSQL y aplica migraciones versionadas. Si una migración falla, el arranque se detiene; no acepta pérdida de datos como fallback. El contexto de construcción excluye secretos y bases locales.

ST-04 validó PostgreSQL real: instalación limpia, copia anonimizada, precisión/restricciones, migración fallida recuperada y restauración a otra base. Las ocho suites aprobaron contra PostgreSQL; ver `docs/scrum/ST04_EVIDENCIA.md` y `docs/POSTGRES_MIGRACIONES_Y_RECUPERACION.md`. Repetir con `npm run test:postgres`; requiere Python y PostgreSQL local aislado, o `SYSTECH_TEST_PG_URL` para CI. El workflow remoto está preparado, sin ejecución GitHub todavía. El contenedor Docker y el alojamiento definitivo siguen pendientes en ST-13. Redis aparece en Compose pero todavía no funciona como cola de tareas; Sentry tampoco está instrumentado.

## Conexiones

Stripe cobra la licencia de SYSTECH. Ya se verificó un pago de sandbox desde Checkout hasta la activación automática, incluyendo firmas incorrectas, duplicados y factura antes de checkout. Para repetirlo: `npm run stripe:listen`, luego `npm run demo:stripe`; ver guía de conexiones. El receptor de producción y el ciclo completo de facturación todavía requieren validación.

Los cobros de los clientes de cada barbería requieren una integración de comercio independiente. WhatsApp manual genera enlaces; configurar un token global no conecta números por barbería. El servicio preliminar de CFDI necesita organización por RFC e idempotencia antes de ofrecerse.

- [Dirección de producto, cambios y bloqueantes](docs/REINVENTAR_SYSTECH.md)
- [Guía de configuración asistida](docs/GUIA_CONEXIONES_ASISTIDAS.md)

La documentación legal, contacto de soporte, SLA y ofertas existentes necesitan datos reales y revisión profesional antes de publicarse como compromisos comerciales.
