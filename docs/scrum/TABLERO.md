# Tablero de SYSTECH Studio

Fuente principal de estados: [Notion](https://app.notion.com/p/3f02035ac0d0815499d2f73304873c63?pvs=204). Esta tabla es una vista del respaldo local; actualizar el backlog desde Notion al cierre de sesión antes de regenerar con `node scripts/tablero_scrum.js`. No hay sincronización automática bidireccional.

Pendiente: 37 · Lista para empezar: 0 · En curso: 0 · En revisión: 0 · Validada: 8 · Bloqueada: 3

## Inicio de sesión

Leer [Sprint 1](SPRINT_01.md) y [bitácora](BITACORA.md). Retomar una actividad por implementador, con hasta dos historias separadas en curso; revisar bloqueo, criterio y prueba antes de cambiar su estado. No marcar terminada por construir una pantalla.

## Sprint 1

| Actividad | Sprint | Prioridad | Estado | Dependencias |
| --- | ---: | --- | --- | --- |
| [ST-01](ACTIVIDADES.md#st-01) · Catálogo único de planes y límites por sucursal | 1 | P0 | Bloqueada | — |
| [ST-02](ACTIVIDADES.md#st-02) · Aislamiento de negocios y permisos completos | 1 | P0 | Validada | — |
| [ST-03](ACTIVIDADES.md#st-03) · Recuperar acceso y proteger sesiones | 1 | P0 | Validada | — |
| [ST-04](ACTIVIDADES.md#st-04) · PostgreSQL y migraciones seguras | 1 | P0 | Validada | — |

## Tablero por estado

### Pendiente

| Actividad | Sprint | Prioridad | Estado | Dependencias |
| --- | ---: | --- | --- | --- |
| [ST-10](ACTIVIDADES.md#st-10) · Ciclo Stripe completo y portal de licencia | 4 | P0 | Pendiente | ST-01, ST-04 |
| [ST-11](ACTIVIDADES.md#st-11) · Intentos de checkout, promociones y conciliación | 4 | P0 | Pendiente | ST-10 |
| [ST-13](ACTIVIDADES.md#st-13) · Despliegue reproducible con pruebas y observabilidad | 4 | P0 | Pendiente | ST-04, ST-12 |
| [ST-14](ACTIVIDADES.md#st-14) · Respaldo, restauración y exportación | 4 | P0 | Pendiente | ST-13 |
| [ST-15](ACTIVIDADES.md#st-15) · Identidad comercial, privacidad y soporte operable | 4 | P0 | Pendiente | — |
| [ST-16](ACTIVIDADES.md#st-16) · Cobranza de producción y comprobantes del SaaS | 4 | P0 | Pendiente | ST-10, ST-11, ST-13, ST-15 |
| [ST-17](ACTIVIDADES.md#st-17) · Piloto acompañado de independientes | 5 | P0 | Pendiente | ST-05, ST-06, ST-07, ST-08, ST-09, ST-14, ST-15, ST-16 |
| [ST-18](ACTIVIDADES.md#st-18) · Cadena: permisos, catálogo y comparación de sucursales | 7 | P0 | Pendiente | ST-01, ST-02, ST-06 |
| [ST-19](ACTIVIDADES.md#st-19) · Piloto de cadena y carga concurrente | 7 | P0 | Pendiente | ST-17, ST-18 |
| [ST-20](ACTIVIDADES.md#st-20) · Puerta de piloto pagado independiente y oferta inicial | 5 | P0 | Pendiente | ST-17, ST-45, ST-16, ST-15, ST-01 |
| [ST-21](ACTIVIDADES.md#st-21) · WhatsApp conectado por barbería | 8 | P1 | Pendiente | ST-02, ST-12, ST-15 |
| [ST-22](ACTIVIDADES.md#st-22) · Recordatorios con consentimiento y consumo | 8 | P1 | Pendiente | ST-07, ST-21 |
| [ST-23](ACTIVIDADES.md#st-23) · Cuotas y cobro transparente de add-ons | 8 | P1 | Pendiente | ST-01, ST-11, ST-22 |
| [ST-24](ACTIVIDADES.md#st-24) · CFDI por emisor y certificados protegidos | 8 | P1 | Pendiente | ST-02, ST-12, ST-15 |
| [ST-25](ACTIVIDADES.md#st-25) · Timbrado, descarga, cancelación y conciliación | 8 | P1 | Pendiente | ST-06, ST-24 |
| [ST-26](ACTIVIDADES.md#st-26) · Altas de los primeros pilotos y mesa de ayuda | 5 | P1 | Pendiente | ST-20 |
| [ST-27](ACTIVIDADES.md#st-27) · Landing y demo que venden resultados comprobables | 5 | P1 | Pendiente | ST-20, ST-15, ST-44 |
| [ST-28](ACTIVIDADES.md#st-28) · Métricas reales de SaaS y costo | 5 | P1 | Pendiente | ST-11, ST-26 |
| [ST-29](ACTIVIDADES.md#st-29) · Reagendar al cobrar y ficha de preferencias | 6 | P1 | Pendiente | ST-07, ST-17 |
| [ST-30](ACTIVIDADES.md#st-30) · Resumen del dueño y excepciones accionables | 6 | P1 | Pendiente | ST-02, ST-06, ST-08, ST-41, ST-42 |
| [ST-31](ACTIVIDADES.md#st-31) · Pulido premium y accesibilidad del producto | 6 | P1 | Pendiente | ST-43, ST-26 |
| [ST-32](ACTIVIDADES.md#st-32) · Regresión e incidente para salida independiente | 6 | P0 | Pendiente | ST-45, ST-26, ST-28, ST-31 |
| [ST-33](ACTIVIDADES.md#st-33) · Decisión de venta general independiente y versión comercial | 6 | P0 | Pendiente | ST-32, ST-27, ST-14, ST-15, ST-16, ST-20, ST-47 |
| [ST-34](ACTIVIDADES.md#st-34) · Lista de espera que rellena cancelaciones | Posterior | P2 | Pendiente | ST-22, ST-29 |
| [ST-35](ACTIVIDADES.md#st-35) · Anticipos y pagos de clientes de barbería | Posterior | P2 | Pendiente | ST-10, ST-07, ST-15 |
| [ST-36](ACTIVIDADES.md#st-36) · Membresías de clientes de la barbería | Posterior | P2 | Pendiente | ST-35 |
| [ST-37](ACTIVIDADES.md#st-37) · Google Calendar por usuario | Posterior | P2 | Pendiente | ST-07, ST-12 |
| [ST-38](ACTIVIDADES.md#st-38) · POS offline y sincronización segura | Posterior | P2 | Pendiente | ST-05, ST-06, ST-19 |
| [ST-39](ACTIVIDADES.md#st-39) · Reseñas y referidos medibles | Posterior | P2 | Pendiente | ST-22, ST-28 |
| [ST-40](ACTIVIDADES.md#st-40) · IA con valor económico y control de costos | Posterior | P2 | Pendiente | ST-28, ST-15 |
| [ST-41](ACTIVIDADES.md#st-41) · Inventario operativo y conteos confiables | 6 | P1 | Pendiente | ST-02, ST-04, ST-05, ST-06 |
| [ST-42](ACTIVIDADES.md#st-42) · Consumo de insumos por servicio y diferencias explicables | 6 | P2 | Pendiente | ST-41, ST-05, ST-06, ST-07 |
| [ST-44](ACTIVIDADES.md#st-44) · Demo de diez minutos y validación de compradores | 3 | P1 | Pendiente | ST-06, ST-07 |
| [ST-45](ACTIVIDADES.md#st-45) · Capacidad y concurrencia para piloto independiente | 4 | P0 | Pendiente | ST-05, ST-06, ST-07, ST-13, ST-14 |
| [ST-46](ACTIVIDADES.md#st-46) · Puerta comercial de cadenas y alcance por sucursal | 7 | P0 | Pendiente | ST-18, ST-19, ST-20, ST-32, ST-33 |
| [ST-47](ACTIVIDADES.md#st-47) · Primera renovación y uso sostenido de pilotos | 5 | P1 | Pendiente | ST-26, ST-11, ST-28 |
| [ST-48](ACTIVIDADES.md#st-48) · Crecimiento hacia diez negocios de pago | 6 | P1 | Pendiente | ST-20, ST-26, ST-47 |

### Lista para empezar

Sin actividades en este estado.

### En curso

Sin actividades en este estado.

### En revisión

Sin actividades en este estado.

### Validada

| Actividad | Sprint | Prioridad | Estado | Dependencias |
| --- | ---: | --- | --- | --- |
| [ST-02](ACTIVIDADES.md#st-02) · Aislamiento de negocios y permisos completos | 1 | P0 | Validada | — |
| [ST-03](ACTIVIDADES.md#st-03) · Recuperar acceso y proteger sesiones | 1 | P0 | Validada | — |
| [ST-04](ACTIVIDADES.md#st-04) · PostgreSQL y migraciones seguras | 1 | P0 | Validada | — |
| [ST-05](ACTIVIDADES.md#st-05) · Venta, stock y folio consistentes bajo concurrencia | 2 | P0 | Validada | ST-04, ST-02 |
| [ST-06](ACTIVIDADES.md#st-06) · Caja, devoluciones y comisiones trazables | 2 | P0 | Validada | ST-05 |
| [ST-07](ACTIVIDADES.md#st-07) · Agenda y reservas sin doble asignación | 2 | P0 | Validada | ST-04, ST-02 |
| [ST-12](ACTIVIDADES.md#st-12) · Cola durable y scheduler atómico | 3 | P0 | Validada | ST-04 |
| [ST-43](ACTIVIDADES.md#st-43) · Pulido previo de inicio, cobro móvil, caja y reservas | 3 | P1 | Validada | ST-02, ST-06, ST-07 |

### Bloqueada

| Actividad | Sprint | Prioridad | Estado | Dependencias |
| --- | ---: | --- | --- | --- |
| [ST-01](ACTIVIDADES.md#st-01) · Catálogo único de planes y límites por sucursal | 1 | P0 | Bloqueada | — |
| [ST-08](ACTIVIDADES.md#st-08) · Correo transaccional real y onboarding inicial | 2 | P0 | Bloqueada | ST-03 |
| [ST-09](ACTIVIDADES.md#st-09) · Usabilidad de mostrador y tickets reales | 2 | P0 | Bloqueada | ST-06, ST-07 |

## Decisiones y evidencia

- [Sistema de trabajo y configuración Notion](INICIO.md)
- [Bitácora de sesiones](BITACORA.md)
- [Decisiones pendientes](DECISIONES.md)
- [Plan y Definition of Done](../PLAN_AGIL_LANZAMIENTO.md)
- [Costos y precios](../COSTOS_Y_PRECIOS.md)
