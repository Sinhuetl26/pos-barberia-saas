# Actividades y criterios de aceptación

Vista generada del backlog. No representa implementación concluida. Cada actividad validada requiere evidencia registrada y Definition of Done.

<a id="st-01"></a>

## ST-01: Catálogo único de planes y límites por sucursal

- Sprint: 1
- Prioridad: P0
- Complejidad: M
- Estado: Bloqueada
- Dependencias: Sin dependencias declaradas

### Criterios de aceptación

- [ ] Esencial, Pro y Cadena definen precio, tratamiento fiscal, sucursales y barberos en una sola fuente; front, API y Stripe usan identificadores compatibles
- [ ] Crear, reactivar o importar capacidad por encima del plan se rechaza en servidor; downgrade no borra datos y exige resolver exceso
- [ ] Prueba con acceso directo a API, no solo ocultamiento visual; precios de producción separados de sandbox

### Evidencia requerida

Catálogo único y límites probados; auditoría técnica ST01–07 del 9/oct. Importador, ciclo Stripe y comprobantes mantienen sus historias. Acta: docs/scrum/CIERRE_REVISION_ST01_09_2026-10-09.md; QA: docs/scrum/QA_VALIDACION_ST01_09_2026-10-09.md.

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-02"></a>

## ST-02: Aislamiento de negocios y permisos completos

- Sprint: 1
- Prioridad: P0
- Complejidad: L
- Estado: Validada
- Dependencias: Sin dependencias declaradas

### Criterios de aceptación

- [x] Inventario de rutas con tenant, sucursal, dueño, gerente, cajero y barbero; acceso a IDs ajenos no devuelve datos ni permite cambios
- [x] Probar lectura, escritura, exportaciones, archivos y rutas públicas con dos negocios y dos sucursales
- [x] Barbero no ve caja ni ingresos ajenos; gerente solo ve sucursales asignadas; excepciones auditadas

### Evidencia requerida

147 rutas actuales; 19 escenarios de autorización y 6 pruebas dirigidas de compras/inventario/CSV aprobados por motor. Dos negocios, cuatro sucursales, cinco roles; denegados sin cambios. Acta y reporte QA del 9 de octubre en Reporte del equipo. Acta: docs/scrum/CIERRE_REVISION_ST01_09_2026-10-09.md; QA: docs/scrum/QA_VALIDACION_ST01_09_2026-10-09.md.

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-03"></a>

## ST-03: Recuperar acceso y proteger sesiones

- Sprint: 1
- Prioridad: P0
- Complejidad: M
- Estado: Validada
- Dependencias: Sin dependencias declaradas

### Criterios de aceptación

- [x] Correo verificado y recuperación con token de un solo uso, caducidad y limitación de intentos sin enumerar cuentas
- [x] Cambiar contraseña revoca sesiones según política; invitación de empleado no comparte contraseña del dueño
- [x] Secretos fuera de logs, repositorio y respuestas; revisión de dependencias con hallazgos críticos resueltos o mitigados con evidencia

### Evidencia requerida

19 escenarios de cuentas/sesiones por motor. Auditoría npm renovada 9/oct: 0 producción, 0 críticos; 9 avisos de desarrollo documentados. Poda Docker simulada; imagen operativa pendiente ST-13. Acta y reporte QA del 9 de octubre en Reporte del equipo. Acta: docs/scrum/CIERRE_REVISION_ST01_09_2026-10-09.md; QA: docs/scrum/QA_VALIDACION_ST01_09_2026-10-09.md.

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-04"></a>

## ST-04: PostgreSQL y migraciones seguras

- Sprint: 1
- Prioridad: P0
- Complejidad: L
- Estado: Validada
- Dependencias: Sin dependencias declaradas

### Criterios de aceptación

- [x] Crear base PostgreSQL limpia y actualizar una copia anonimizada mediante migraciones versionadas sin db push destructivo
- [x] Ejecutar regresión contra PostgreSQL; consistencia de tipos, decimales, fechas, índices y restricciones
- [x] Procedimiento de recuperación de migración fallida probado sin tocar la base de trabajo

### Evidencia requerida

9/oct: PostgreSQL aislado, 13 comprobaciones de migración/recuperación/restore y 13/13 suites (274 checks). Base operativa conservada por hash. Acta y reporte QA del 9 de octubre en Reporte del equipo. Acta: docs/scrum/CIERRE_REVISION_ST01_09_2026-10-09.md; QA: docs/scrum/QA_VALIDACION_ST01_09_2026-10-09.md.

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-05"></a>

## ST-05: Venta, stock y folio consistentes bajo concurrencia

- Sprint: 2
- Prioridad: P0
- Complejidad: L
- Estado: Validada
- Dependencias: ST-04, ST-02

### Criterios de aceptación

- [x] Dos envíos simultáneos de la misma intención crean una venta y un movimiento de stock; clave idempotente aislada por negocio
- [x] Dos cajeros no venden la última unidad dos veces ni generan folios duplicados
- [x] Cálculos de descuentos, impuestos configurados, propinas y pagos mixtos cuadran en centavos; rollback conserva caja y stock

### Evidencia requerida

17 escenarios de venta/stock/folio por motor, dos procesos API; 6 comprobaciones adicionales de recepción concurrente y rollback por motor. Recuperación de respuesta perdida documentada y revisión visual vigente. Acta y reporte QA del 9 de octubre en Reporte del equipo. Acta: docs/scrum/CIERRE_REVISION_ST01_09_2026-10-09.md; QA: docs/scrum/QA_VALIDACION_ST01_09_2026-10-09.md.

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-06"></a>

## ST-06: Caja, devoluciones y comisiones trazables

- Sprint: 2
- Prioridad: P0
- Complejidad: M
- Estado: Validada
- Dependencias: ST-05

### Criterios de aceptación

- [x] Apertura, entradas, retiros y corte ciego cuadran con efectivo separado de tarjetas y transferencias
- [x] Cancelación o devolución exige permiso y motivo; no elimina historial y revierte stock/comisión correctamente
- [x] Reglas de comisión y redondeo se documentan; venta histórica conserva las reglas aplicadas
- [x] Barbero registra y cobra sus servicios desde su celular con cuenta propia; cada venta conserva sucursal, barbero que prestó el servicio y usuario que registró/cobró
- [x] Confirmar una venta genera aviso persistente dentro del panel del dueño, sin recargar la pantalla; incluye barbero, servicio, importe, medio de pago y quién cobró, sin duplicarse al reintentar ni mezclarse entre negocios
- [x] El dinero recibido por un barbero y su entrega a caja quedan conciliados: entregar efectivo cambia su custodia, sin volver a sumar venta ni alterar la comisión

### Evidencia requerida

21 escenarios de caja/devoluciones/custodia por motor; CSV corregido (14 columnas, devolución10.01/neto20.02) con 6 pruebas dirigidas por motor. Recorrido móvil/dueño y ajustes de entrega/aviso revisados visualmente. Acta y reporte QA del 9 de octubre en Reporte del equipo. Acta: docs/scrum/CIERRE_REVISION_ST01_09_2026-10-09.md; QA: docs/scrum/QA_VALIDACION_ST01_09_2026-10-09.md.

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-07"></a>

## ST-07: Agenda y reservas sin doble asignación

- Sprint: 2
- Prioridad: P0
- Complejidad: M
- Estado: Validada
- Dependencias: ST-04, ST-02

### Criterios de aceptación

- [x] Dos reservas simultáneas para el mismo barbero/horario no se confirman ambas; duración, descansos y zona horaria correctos
- [x] Reserva pública limita abuso y exposición de clientes; reprogramar/cancelar usa enlace autorizado con caducidad
- [x] Cita atendida enlaza venta una sola vez; ausencia se distingue de cancelación

### Evidencia requerida

20 escenarios de agenda/reservas por motor; concurrencia, horario, enlaces privados y cita→venta única. Recorrido observado 9/oct: reprogramación y cancelación reflejadas en agenda sin recarga. Acta y reporte QA del 9 de octubre en Reporte del equipo. Acta: docs/scrum/CIERRE_REVISION_ST01_09_2026-10-09.md; QA: docs/scrum/QA_VALIDACION_ST01_09_2026-10-09.md.

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-08"></a>

## ST-08: Correo transaccional real y onboarding inicial

- Sprint: 2
- Prioridad: P0
- Complejidad: M
- Estado: Bloqueada
- Dependencias: ST-03

### Criterios de aceptación

- [ ] Dominio propio y remitente verificados; SPF/DKIM y política DMARC revisadas; prueba de entrega, rebote y supresión
- [ ] Dueño configura catálogo, equipo, comisiones, horario y primera caja sin datos ficticios
- [ ] Error de proveedor se muestra como pendiente/fallido; nunca como correo entregado por tener una clave

### Evidencia requerida

Implementación local y 17 escenarios de correo/onboarding SQLite aprobados el 9/oct; proveedor controlado no demuestra entrega real. Acta: docs/scrum/CIERRE_REVISION_ST01_09_2026-10-09.md; QA: docs/scrum/QA_VALIDACION_ST01_09_2026-10-09.md.

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-09"></a>

## ST-09: Usabilidad de mostrador y tickets reales

- Sprint: 2
- Prioridad: P0
- Complejidad: M
- Estado: Bloqueada
- Dependencias: ST-06, ST-07

### Criterios de aceptación

- [ ] Recorrido reserva/venta/corte probado en móvil, tablet y computadora con errores recuperables y sin doble cobro al repetir clic
- [ ] Ticket legible probado en al menos un modelo físico 58 mm y uno 80 mm; publicar matriz compatible
- [ ] Caída de red informa venta sin confirmar; datos móviles como contingencia documentada; no anunciar venta offline ni apertura de gaveta sin prueba
- [ ] Probar barbero cobrando desde celular y dueño supervisando desde laptop/PC: aviso sin recargar, venta única, identificación de prestador/cobrador y conciliación de entrega de efectivo; repetir con dos barberos y cuentas de negocios distintos

### Evidencia requerida

Compilación API/web y build Vite final aprobados; flujo emulado, tickets y caja con revisión visual final 9/oct. Hardware sin certificar. Acta: docs/scrum/CIERRE_REVISION_ST01_09_2026-10-09.md; QA: docs/scrum/QA_VALIDACION_ST01_09_2026-10-09.md.

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-10"></a>

## ST-10: Ciclo Stripe completo y portal de licencia

- Sprint: 4
- Prioridad: P0
- Complejidad: L
- Estado: Pendiente
- Dependencias: ST-01, ST-04

### Criterios de aceptación

- [ ] Alta, renovación, impago, recuperación, cancelación al final de periodo, cambio de plan y prorrateo sincronizan licencia con Stripe
- [ ] Eventos created/updated/deleted e invoice manejan duplicados y desorden sin retroceder estado vigente; política de gracia explícita
- [ ] Portal solo para dueño; cambios y límites aplican tras confirmación remota; no habilitar pago por URL de retorno

### Evidencia requerida

Matriz de eventos sandbox y conciliación con API Stripe

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-11"></a>

## ST-11: Intentos de checkout, promociones y conciliación

- Sprint: 4
- Prioridad: P0
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-10

### Criterios de aceptación

- [ ] Intento persistente e idempotente evita suscripciones paralelas; conciliar antes de abrir nueva sesión
- [ ] Promoción temporal tiene vigencia y límite atómico; confirmar impuestos y totales sin descuento permanente accidental
- [ ] Reconciliador detecta suscripción divergente y alerta/repara con auditoría; disputa/reembolso de licencia tiene procedimiento

### Evidencia requerida

Dos checkouts simultáneos, promoción expirada y simulación de divergencia

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-12"></a>

## ST-12: Cola durable y scheduler atómico

- Sprint: 3
- Prioridad: P0
- Complejidad: M
- Estado: Validada
- Dependencias: ST-04

### Criterios de aceptación

- [x] Worker separado con reintentos, deduplicación, límites y tareas fallidas visibles; reiniciar HTTP no pierde tarea confirmada
- [x] Dos réplicas no ejecutan el mismo recordatorio como dos entregas nuevas; exclusión distribuida atómica
- [x] Reejecutar tarea y pausar proveedor requiere permisos; logs sin teléfono completo, token ni certificados

### Evidencia requerida

14/14 escenarios de cola por motor; cuentas19, correo17, autorización19 e integraciones25 por motor. ST12_INDICE_EVIDENCIAS_2026-10-10 y ST12_QA_VISIBLE: reintento único, cancelación, pausas persistidas, separación de negocios/roles y recuperación de consulta; proveedor controlado, sin entrega real. Demo compatible y restore aislado verificados; build API/web aprobado.

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-13"></a>

## ST-13: Despliegue reproducible con pruebas y observabilidad

- Sprint: 4
- Prioridad: P0
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-04, ST-12

### Criterios de aceptación

- [ ] Staging y producción separados; HTTPS, secretos, CORS, cookies y URLs correctos; ninguna cuenta demo en producción
- [ ] CI ejecuta regresión, compilación y migraciones; smoke test y rollback probado; health/readiness distinguen dependencias
- [ ] Alertas accionables de API, pagos, cola y base, con destinatario real; errores de servidor no exponen secretos

### Evidencia requerida

Pipeline, despliegue staging, rollback y alerta recibida

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-14"></a>

## ST-14: Respaldo, restauración y exportación

- Sprint: 4
- Prioridad: P0
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-13

### Criterios de aceptación

- [ ] Respaldos cifrados y copia independiente; restaurar en entorno aislado y conciliar ventas/caja/clientes
- [ ] Demostrar RPO interno máximo 24 h y RTO máximo 4 h; si no se logra, revisar arquitectura antes de vender ese compromiso
- [ ] Dueño exporta sus datos; prueba de restauración no mezcla negocios ni expone certificados; política de retención y eliminación aprobada

### Evidencia requerida

Acta de restauración cronometrada y exportación conciliada

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-15"></a>

## ST-15: Identidad comercial, privacidad y soporte operable

- Sprint: 4
- Prioridad: P0
- Complejidad: M
- Estado: Pendiente
- Dependencias: Sin dependencias declaradas

### Criterios de aceptación

- [ ] Razón social, dominio y contactos reales; términos, privacidad y tratamiento de datos revisados por profesional
- [ ] Página y demo solo prometen funciones verificadas; eliminar descuento vitalicio y SLA sin respaldo; tratamiento fiscal/renovación/cancelación claros
- [ ] Canal, responsable y horario de soporte cubiertos; procedimiento de incidentes y avisos al cliente preparado

### Evidencia requerida

Textos revisados, prueba de canal y matriz de promesas

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-16"></a>

## ST-16: Cobranza de producción y comprobantes del SaaS

- Sprint: 4
- Prioridad: P0
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-10, ST-11, ST-13, ST-15

### Criterios de aceptación

- [ ] Identidad bancaria/fiscal y cuenta Stripe live habilitadas por el titular; llaves live solo en gestor de secretos
- [ ] Webhook público HTTPS, catálogo live y portal validado; pago controlado autorizado concilia banco/Stripe/licencia
- [ ] Comprobante de licencia distingue recibo Stripe de CFDI; circuito fiscal del propio SaaS validado con contador

### Evidencia requerida

Registro de prueba autorizada y revisión de comprobante, sin secretos

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-17"></a>

## ST-17: Piloto acompañado de independientes

- Sprint: 5
- Prioridad: P0
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-05, ST-06, ST-07, ST-08, ST-09, ST-14, ST-15, ST-16

### Criterios de aceptación

- [ ] Dos negocios con datos separados completan cinco días operativos consecutivos de agenda, venta, comisión, corte y exportación
- [ ] 100% de ventas y caja del piloto conciliadas; cero defectos críticos abiertos; incidentes corregidos y revalidados
- [ ] Medir alta, tiempo por venta, errores, tickets y disposición real a pagar; autorización de uso de datos/testimonios

### Evidencia requerida

Acta de piloto con líneas base y evaluación del dueño

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-18"></a>

## ST-18: Cadena: permisos, catálogo y comparación de sucursales

- Sprint: 7
- Prioridad: P0
- Complejidad: L
- Estado: Pendiente
- Dependencias: ST-01, ST-02, ST-06

### Criterios de aceptación

- [ ] Cadena con tres sucursales, gerente restringido y dueño central; cambio de sucursal no conserva datos ajenos
- [ ] Catálogo compartido y excepciones locales explícitas; ingresos netos, propinas, comisiones y caja comparan periodos equivalentes
- [ ] Alta/baja de sucursal respeta licencia y conserva historial; una sucursal no altera caja de otra

### Evidencia requerida

Recorrido multisucrusal y reporte conciliado

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-19"></a>

## ST-19: Piloto de cadena y carga concurrente

- Sprint: 7
- Prioridad: P0
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-17, ST-18

### Criterios de aceptación

- [ ] Una cadena con al menos dos sucursales completa cinco días operativos; caja y permisos revisados por gerente y dueño
- [ ] Carga inicial objetivo 50 sesiones activas y 10 escrituras concurrentes durante 15 minutos, p95 API menor a 1 s sin doble venta/reserva ni errores de integridad
- [ ] Registrar dataset, hardware y límites de prueba; reestimar capacidad a partir de resultados

### Evidencia requerida

Acta de cadena y reporte de carga reproducible

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-20"></a>

## ST-20: Puerta de piloto pagado independiente y oferta inicial

- Sprint: 5
- Prioridad: P0
- Complejidad: S
- Estado: Pendiente
- Dependencias: ST-17, ST-45, ST-16, ST-15, ST-01

### Criterios de aceptación

- [ ] P0 del núcleo, fiscalidad, correo, dispositivos, licencia live, respaldo/restauración y actas de ST-17/ST-45 aprobados; cero defectos críticos o de alto impacto en venta/cierre abiertos
- [ ] Oferta para una sucursal dentro de capacidad medida; límites, total fiscal, renovación, cancelación y soporte explícitos. Cadena no se autoriza con esta acta
- [ ] Ofertar solo núcleo y funciones habilitadas, sin cobrar add-ons no disponibles; alta y cancelación verificadas
- [ ] Tablero comercial con diez candidatos reales y responsables; no contar pruebas gratis como MRR

### Evidencia requerida

Checklist go/no-go y primeras ofertas con alcance

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-21"></a>

## ST-21: WhatsApp conectado por barbería

- Sprint: 8
- Prioridad: P1
- Complejidad: L
- Estado: Pendiente
- Dependencias: ST-02, ST-12, ST-15

### Criterios de aceptación

- [ ] Alta por negocio con Meta, número e identidad correspondientes; credenciales cifradas, revocables y aisladas
- [ ] Estado conectado requiere comprobación real; webhook firmado mapea negocio y deduplica eventos
- [ ] Plantillas y permisos aprobados por Meta; desconectar no afecta otras barberías; no usar token global como conexión multi-tenant

### Evidencia requerida

Dos números/negocios de prueba, alta y revocación

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-22"></a>

## ST-22: Recordatorios con consentimiento y consumo

- Sprint: 8
- Prioridad: P1
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-07, ST-21

### Criterios de aceptación

- [ ] Consentimiento registrable, baja simple y categorías de plantilla correctas; reprogramación cancela recordatorio anterior
- [ ] Entrega, rechazo, reintento y cuota visibles; balance de consumo con alerta y límite, sin envíos ilimitados
- [ ] Probar mensajes en números autorizados y conciliar costo del proveedor; no afirmar entrega sin webhook

### Evidencia requerida

Entrega real, rechazo y conciliación de consumo

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-23"></a>

## ST-23: Cuotas y cobro transparente de add-ons

- Sprint: 8
- Prioridad: P1
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-01, ST-11, ST-22

### Criterios de aceptación

- [ ] Catálogo de créditos/consumos indica precio total, vigencia y excedentes; autorización antes de cobro adicional
- [ ] Consumo idempotente por negocio y balance no negativo; factura distingue licencia y adicionales
- [ ] Avisos de 80% y 100% de cuota; pausar opcionales no bloquea caja del negocio

### Evidencia requerida

Cuota agotada, reintento duplicado y cobro conciliado

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-24"></a>

## ST-24: CFDI por emisor y certificados protegidos

- Sprint: 8
- Prioridad: P1
- Complejidad: L
- Estado: Pendiente
- Dependencias: ST-02, ST-12, ST-15

### Criterios de aceptación

- [ ] Organización Facturapi por RFC del negocio, con sandbox/live separados, CSD cifrado y acceso mínimo
- [ ] Datos fiscales y vigencia de certificados validados; factura emitida por el emisor correcto; no filtrar CSD en exportaciones/logs
- [ ] Titular y contador revisan flujo fiscal antes de activar producción

### Evidencia requerida

Dos emisores de prueba y matriz de protección de CSD

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-25"></a>

## ST-25: Timbrado, descarga, cancelación y conciliación

- Sprint: 8
- Prioridad: P1
- Complejidad: L
- Estado: Pendiente
- Dependencias: ST-06, ST-24

### Criterios de aceptación

- [ ] Venta se timbra una vez incluso tras timeout; UUID, estado y XML/PDF persistidos con acceso del negocio
- [ ] Cancelación, sustitución y reintentos concilian estado del PAC sin perder evidencia; alcance de factura global documentado con contador
- [ ] Cuota y costo por timbre conciliados; factura rechazada no marca venta como facturada

### Evidencia requerida

Timeout/reintento, cancelación y descarga con revisión fiscal

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-26"></a>

## ST-26: Altas de los primeros pilotos y mesa de ayuda

- Sprint: 5
- Prioridad: P1
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-20

### Criterios de aceptación

- [ ] Guía de configuración/importación con validación y reversión; capacitación y primera caja supervisadas
- [ ] Ticket con severidad, responsable, tiempos, resolución y base de conocimiento; exportación al cancelar
- [ ] Medir minutos de soporte por cliente y costo real, no solo número de cuentas
- [ ] Aplicar onboarding a los primeros 1–3 comercios autorizados, registrar primera caja y tiempo real. Llegar a diez clientes de pago se conserva como ST-48, no como requisito para instrumentar soporte.

### Evidencia requerida

Checklist de onboarding y tablero de tickets

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-27"></a>

## ST-27: Landing y demo que venden resultados comprobables

- Sprint: 5
- Prioridad: P1
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-20, ST-15, ST-44

### Criterios de aceptación

- [ ] Esencial y Pro de una sucursal muestran límites, impuestos, cuotas, cancelación y funciones comprobadas; Cadena figura pendiente o fuera de contratación hasta ST-46. Cada add-on requiere su validación propia
- [ ] Demo de 10 minutos verifica reserva, venta, comisión y corte; ejemplos no se presentan como testimonios
- [ ] Promociones con término definido; contacto real; registrar origen de lead y conversión sin datos personales innecesarios

### Evidencia requerida

Matriz landing/producto y demo grabada

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-28"></a>

## ST-28: Métricas reales de SaaS y costo

- Sprint: 5
- Prioridad: P1
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-11, ST-26

### Criterios de aceptación

- [ ] MRR excluye IVA, trials, consumos únicos y cuentas manualmente activadas sin pago; define churn, mora y clientes activos
- [ ] Tablero de ingresos, margen, soporte, activación y retención por cohorte con datos conciliados
- [ ] Revisar precios al completar diez clientes o 60 días; comparar costos observados con modelo económico

### Evidencia requerida

Definiciones versionadas y reporte conciliado

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-29"></a>

## ST-29: Reagendar al cobrar y ficha de preferencias

- Sprint: 6
- Prioridad: P1
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-07, ST-17

### Criterios de aceptación

- [ ] Proponer próxima visita basada en historial con confirmación del cliente, sin reservar silenciosamente
- [ ] Ficha de preferencias con permisos; fotos solo con consentimiento, límites, retención y eliminación
- [ ] Medir proporción de clientes que aceptan próxima cita contra línea base; no afirmar aumento de ingresos sin evidencia

### Evidencia requerida

Avance acotado: tipo de corte y referencia privada por cita, opcionales en público/interno/walk-in. Backend17/17 referencias y19/19 autorización por motor; frontend11/11, retención11/11, recovery8/8. Recorrido Chrome guardado/agenda/recarga y móvil390 observado. Informe docs/scrum/REFERENCIA_CORTE_2026-10-11.md. Ficha histórica/reagendar/retención completa no aceptados.

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-30"></a>

## ST-30: Resumen del dueño y excepciones accionables

- Sprint: 6
- Prioridad: P1
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-02, ST-06, ST-08, ST-41, ST-42

### Criterios de aceptación

- [ ] Resumen por sucursal con ventas netas, comisiones, stock y descuadres enlazados a evidencia
- [ ] Alertas configurables con permisos, deduplicación y horario; sin enviar datos financieros a empleados no autorizados
- [ ] Conciliar tablero con corte/exportación y probar cruce de medianoche por zona horaria
- [ ] Productos más vendidos y existencias sin movimiento por sucursal/periodo con devoluciones y descuentos conciliados; costo actual solo como estimación, datos insuficientes explícitos y evidencia enlazada.
- [ ] Diferencias de insumos solo después de ST-42 y conteo válido; no acusar robo. Margen histórico requiere costos aplicados y cobertura, no costo actual mutable.

### Evidencia requerida

Resumen real reconciliado y controles de destinatario

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-31"></a>

## ST-31: Pulido premium y accesibilidad del producto

- Sprint: 6
- Prioridad: P1
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-43, ST-26

### Criterios de aceptación

- [ ] Flujos frecuentes usan lenguaje de barbería, acciones claras, estados vacíos útiles y guardado verificable
- [ ] Contraste, teclado, foco, tamaños táctiles y formularios con errores probados; sin datos inventados ni botones inertes
- [ ] Carga de pantallas observada en móvil real; dividir bundle y corregir bloqueos según medición

### Evidencia requerida

Avance acotado configuración/reservas: UX_CONFIGURACION_2026-10-10.md y 20 capturas. Personalización15/15SQLite y15/15PostgreSQL, autorización19/19SQLite, reservas20/20SQLite; API/web compilan. Aceptación integral en dispositivos y medición de rendimiento todavía pendientes. Avance11/oct: referencia de corte y foto privada, 7 capturas adicionales y reporte REFERENCIA_CORTE_2026-10-11.md; API/web compilan. JS695.02kB/gzip189.13kB.

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-32"></a>

## ST-32: Regresión e incidente para salida independiente

- Sprint: 6
- Prioridad: P0
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-45, ST-26, ST-28, ST-31

### Criterios de aceptación

- [ ] Regresión completa PostgreSQL con núcleo y add-ons habilitados; defectos críticos/caja/seguridad en cero
- [ ] Ejercicio de proveedor caído, impago, duplicado y restauración cumple procedimientos; responsable responde a alertas
- [ ] Ningún requisito comercial anunciado sin evidencia; revisión de dependencia vulnerable pendiente tiene mitigación comprobada
- [ ] Informe explícito del alcance independiente; capacidades de cadena se revisan en ST-19/ST-46 y no se certifican mediante este cierre

### Evidencia requerida

Informe QA, ensayo de incidente y matriz de promesas

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-33"></a>

## ST-33: Decisión de venta general independiente y versión comercial

- Sprint: 6
- Prioridad: P0
- Complejidad: S
- Estado: Pendiente
- Dependencias: ST-32, ST-27, ST-14, ST-15, ST-16, ST-20, ST-47

### Criterios de aceptación

- [ ] Acta go/no-go contiene gates, alcance de planes, pendientes opcionales, capacidad y evidencia; usuario revisa entregable concreto
- [ ] Add-on sin aprobación externa queda deshabilitado y fuera de oferta; Cadena requiere ST-19 y autorización ST-46. Esta acta habilita exclusivamente oferta independiente dentro de capacidad probada
- [ ] Publicar versión etiquetada y plan de reversión; soporte y revisión mensual con responsable y canal reales

### Evidencia requerida

Acta de lanzamiento y versión recuperable

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-34"></a>

## ST-34: Lista de espera que rellena cancelaciones

- Sprint: Después del lanzamiento
- Prioridad: P2
- Complejidad: L
- Estado: Pendiente
- Dependencias: ST-22, ST-29

### Criterios de aceptación

- [ ] Invitación consentida reserva turno con caducidad; dos interesados no confirman el mismo espacio
- [ ] Baja y frecuencia controladas; métrica de citas recuperadas usa invitación y asistencia observadas

### Evidencia requerida

Experimento controlado y concurrencia

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-35"></a>

## ST-35: Anticipos y pagos de clientes de barbería

- Sprint: Después del lanzamiento
- Prioridad: P2
- Complejidad: L
- Estado: Pendiente
- Dependencias: ST-10, ST-07, ST-15

### Criterios de aceptación

- [ ] Proveedor y modelo de comercio confirmados para México; cada barbería recibe en su cuenta conforme a contrato
- [ ] Depósito, reembolso, disputa, ausencia y conciliación con venta operan con webhook firmado e idempotencia
- [ ] Comisión comercial, riesgos y obligaciones definidos antes de anunciarlo

### Evidencia requerida

Cuenta de comercio de prueba y conciliación de anticipo

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-36"></a>

## ST-36: Membresías de clientes de la barbería

- Sprint: Después del lanzamiento
- Prioridad: P2
- Complejidad: L
- Estado: Pendiente
- Dependencias: ST-35

### Criterios de aceptación

- [ ] Beneficios, vigencia, consumos, suspensión y cancelación definidos por comercio
- [ ] Cobro recurrente y derechos del cliente separados de la licencia SYSTECH; no duplicar beneficios tras reintento

### Evidencia requerida

Ciclo de membresía y cancelación

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-37"></a>

## ST-37: Google Calendar por usuario

- Sprint: Después del lanzamiento
- Prioridad: P2
- Complejidad: L
- Estado: Pendiente
- Dependencias: ST-07, ST-12

### Criterios de aceptación

- [ ] OAuth con permisos mínimos y revocación; cada usuario/sucursal aislados
- [ ] Sincronización evita bucles y define quién resuelve conflicto; API externa caída no detiene agenda local

### Evidencia requerida

Dos usuarios, conflicto y revocación

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-38"></a>

## ST-38: POS offline y sincronización segura

- Sprint: Después del lanzamiento
- Prioridad: P2
- Complejidad: L
- Estado: Pendiente
- Dependencias: ST-05, ST-06, ST-19

### Criterios de aceptación

- [ ] Definir dispositivos, datos locales protegidos, stock offline, permisos y cierre de caja antes de construir
- [ ] Sincronizar ventas sin duplicados y resolver conflictos tras cortes/reinicios; no perder venta confirmada localmente
- [ ] Prueba física prolongada sin red y recuperación antes de ofrecer modo offline

### Evidencia requerida

Diseño aprobado y ensayo de desconexión

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-39"></a>

## ST-39: Reseñas y referidos medibles

- Sprint: Después del lanzamiento
- Prioridad: P2
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-22, ST-28

### Criterios de aceptación

- [ ] Invitación consentida tras visita atendida con frecuencia limitada y baja
- [ ] Beneficio de referido tiene condiciones, vigencia y costo medido; prevenir auto-referidos y abuso

### Evidencia requerida

Métricas de invitación/respuesta y costo por adquisición

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-40"></a>

## ST-40: IA con valor económico y control de costos

- Sprint: Después del lanzamiento
- Prioridad: P2
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-28, ST-15

### Criterios de aceptación

- [ ] Seleccionar una tarea comprobable como resumir operación; comparar costo/beneficio contra reglas simples
- [ ] Minimizar datos personales, definir proveedor/retención y presupuesto; no enviar CSD ni secretos
- [ ] No alterar caja, fiscalidad o cobrar sin confirmación explícita; validar resultados antes de anunciar asistente

### Evidencia requerida

Experimento y evaluación con presupuesto por negocio

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-41"></a>

## ST-41: Inventario operativo y conteos confiables

- Sprint: 6
- Prioridad: P1
- Complejidad: L
- Estado: Pendiente
- Dependencias: ST-02, ST-04, ST-05, ST-06

### Criterios de aceptación

- [ ] Capturar inventario inicial y recibir compras por producto/sucursal con proveedor opcional, cantidad, costo, referencia, fecha y responsable; guardar stock y Kardex en una transacción.
- [ ] Reintentar entradas, mermas, uso interno y ajustes no duplica movimientos; rechazar cantidades inválidas, stock negativo y movimientos de servicios; definir SKU único por negocio y alcance de catálogo.
- [ ] Crear conteo físico con saldo y fecha de referencia, registrar cantidades contadas y mostrar diferencias; unidades no contadas no se convierten en cero.
- [ ] Conciliar ventas/entradas concurrentes durante el conteo; confirmar ajuste exige permiso y motivo, preserva historia y aplica la diferencia una sola vez.
- [ ] Separar edición de catálogo de movimiento de stock; mostrar entradas, salidas, merma, uso interno y ajustes con usuario, motivo y saldos anteriores/nuevos.
- [ ] Dueño y gerente operan solo sucursales autorizadas; negocio/sucursal ajenos no pueden leerse o alterarse; barbero no modifica existencias.
- [ ] Probar conteo parcial, inventario inicial, compras, devoluciones físicas aptas/no aptas, pérdida de respuesta, dos usuarios y fallos con rollback en SQLite y PostgreSQL; conciliar stock con Kardex.

### Evidencia requerida

Requerida: dataset conciliado, regresión de movimientos/conteos por motor y recorrido desde celular/PC. Definición docs/scrum/ST41_INVENTARIO_OPERATIVO.md; aún no implementada.

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-42"></a>

## ST-42: Consumo de insumos por servicio y diferencias explicables

- Sprint: 6
- Prioridad: P2
- Complejidad: L
- Estado: Pendiente
- Dependencias: ST-41, ST-05, ST-06, ST-07

### Criterios de aceptación

- [ ] Separar productos de reventa e insumos de operación; definir presentaciones y unidades compatibles (pieza/ml/g), precisión y tolerancias; migración no trunca stock existente.
- [ ] Configurar recetas versionadas por servicio y guardar consumo aplicado al servicio completado; un evento único evita descontar dos veces por cita y venta o reintento.
- [ ] Conteo inicial más entradas/devoluciones aptas/transferencias menos ventas/consumo/mermas/salidas produce saldo esperado; comparar con conteo físico y mostrar faltante/exceso y evidencia por sucursal.
- [ ] Frascos abiertos y mediciones aproximadas tienen método/tolerancia documentados; datos incompletos se muestran como insuficientes, no como fuga confirmada.
- [ ] Servicio cancelado antes de realizarse no consume; devolución monetaria de servicio realizado no repone insumos; correcciones requieren permiso, motivo y movimientos compensatorios.
- [ ] No atribuir robo o culpa a un empleado por diferencia compartida; edición de receta no reescribe consumo histórico; permisos y aislamiento probados.
- [ ] Probar conversiones/precisión, cambios de receta, doble registro, reintentos, devoluciones, conteos concurrentes y conciliación en SQLite/PostgreSQL; ensayo de conteo de insumos en barbería piloto.

### Evidencia requerida

Requerida: receta y saldos reproducibles, pruebas por motor y conteo piloto real. Definición docs/scrum/ST42_CONSUMO_INSUMOS.md; aún no implementada.

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-43"></a>

## ST-43: Pulido previo de inicio, cobro móvil, caja y reservas

- Sprint: 3
- Prioridad: P1
- Complejidad: M
- Estado: Validada
- Dependencias: ST-02, ST-06, ST-07

### Criterios de aceptación

- [x] Definir dirección visual consistente, jerarquía y componentes compartidos para cuatro flujos; usar cifras reales del entorno, estados vacíos y errores accionables
- [x] Verificar escritorio y móvil emulado, teclado/foco, contraste y tamaños táctiles; reservar certificación de dispositivos físicos para ST-09/ST-31
- [x] Repetir reserva → cobro → entrega → comisión → corte con datos ficticios y conciliación persistente; cero regresiones de dinero o permisos
- [x] Capturas antes/después y demo recuperable, sin presentar esta entrega como aceptación del pulido completo ST-31

### Evidencia requerida

Diseño ST43_DISENO, revisión ST43_QA, capturas 01–27 y ledger-final.json: 24/24 comprobaciones. Reserva/venta200, recibido300/cambio100, entrega200, comisión80 pendiente, fondo500+entrega200=contado700, diferencia0. Build web/TypeScript aprobados. Simulación local y móvil emulado; alcance temprano de cuatro flujos, sin cerrar ST31 ni hardware.

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-44"></a>

## ST-44: Demo de diez minutos y validación de compradores

- Sprint: 3
- Prioridad: P1
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-06, ST-07

### Criterios de aceptación

- [ ] Guion y ficha de alcance basados en funciones comprobadas; mostrar problema, cobro/custodia/comisión y cierre sin prometer integraciones, SLA o ahorro no medido
- [ ] Registro de candidatos, diez conversaciones y cinco demostraciones como objetivos de aprendizaje; documentar actividad alcanzada, objeciones y razones de rechazo sin inventar entrevistas
- [ ] Registrar al menos tres conversaciones reales y decidir si continuar, ajustar o detener oferta; no asumir disposición a pagar por una felicitación. Identificar candidatos compatibles y próximo paso
- [ ] Contacto realizado por Sinhue o con instrucción explícita; minimizar datos personales y distinguir preparación local de evidencia de mercado

### Evidencia requerida

Guion, ficha de alcance y registro real de entrevistas/demos con conclusión

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-45"></a>

## ST-45: Capacidad y concurrencia para piloto independiente

- Sprint: 4
- Prioridad: P0
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-05, ST-06, ST-07, ST-13, ST-14

### Criterios de aceptación

- [ ] Ensayo reproducible con tres negocios, hasta ocho barberos por sucursal y dataset publicado; objetivo inicial doce sesiones y seis escrituras concurrentes durante quince minutos, p95 API menor a un segundo
- [ ] Cero doble venta/reserva, stock inconsistente o fuga entre negocios; comprobar reinicios, conexiones y memoria con tamaño candidato para piloto
- [ ] Registrar latencia, errores, hardware y costo; si falla, corregir y repetir o reducir capacidad explícita antes de ofrecer. No extrapolar a cadenas/cien clientes

### Evidencia requerida

Reporte de carga, integridad y costo/capacidad acotados

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-46"></a>

## ST-46: Puerta comercial de cadenas y alcance por sucursal

- Sprint: 7
- Prioridad: P0
- Complejidad: S
- Estado: Pendiente
- Dependencias: ST-18, ST-19, ST-20, ST-32, ST-33

### Criterios de aceptación

- [ ] Acta de Cadena con piloto multisucursal, permisos, catálogo, comparación, concurrencia y conciliación aprobados; cero defectos críticos o de alto impacto en su alcance
- [ ] Oferta y límites por sucursal coinciden con catálogo, fiscalidad, infraestructura medida, soporte y proceso de expansión/downgrade
- [ ] Habilitar publicidad/contratación de Cadena solo tras acta; un cierre independiente no autoriza este plan. Add-ons mantienen controles propios

### Evidencia requerida

Acta go/no-go de Cadena y matriz de promesas

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-47"></a>

## ST-47: Primera renovación y uso sostenido de pilotos

- Sprint: 5
- Prioridad: P1
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-26, ST-11, ST-28

### Criterios de aceptación

- [ ] Registrar días abiertos frente a días con actividad, cierres, incidentes, minutos de soporte y motivos de abandono durante el primer periodo
- [ ] Conciliar al menos una renovación mensual real de un piloto con Stripe/licencia; separar IVA, trials, descuentos y devoluciones. Registrar muestra y observación, sin proyectar retención anual
- [ ] Si nadie renueva, conservar historia pendiente con evidencia y revisar oferta/onboarding/costo antes de ampliar; obtener testimonios solo con autorización

### Evidencia requerida

Informe de primer periodo, renovación conciliada y decisión de continuidad

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)

---

<a id="st-48"></a>

## ST-48: Crecimiento hacia diez negocios de pago

- Sprint: 6
- Prioridad: P1
- Complejidad: M
- Estado: Pendiente
- Dependencias: ST-20, ST-26, ST-47

### Criterios de aceptación

- [ ] Diez negocios con licencia pagada verificable y onboarding registrado; excluir trials y activaciones manuales de clientes de pago
- [ ] Medir ingreso sin IVA, mora, soporte y costo observado; ajustar capacidad y oferta antes de exceder límites medidos
- [ ] Documentar origen, rechazo y bajas; no usar publicidad pagada ni descuentos indefinidos sin presupuesto y alcance concretos

### Evidencia requerida

Diez altas conciliadas y reporte económico real

Responsable, pruebas realizadas, resultado, bloqueos y siguiente paso se registran en la bitácora; una lista sin marcar no prueba aceptación.

[Volver al tablero](TABLERO.md)
