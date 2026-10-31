# SRS — Plataforma SaaS para Gestión de Barberías (SYSTECH)

Sep 26, 2026 · @sinhue

## 1. Resumen Ejecutivo

SYSTECH desarrollará y operará una plataforma SaaS de gestión integral para barberías, comercializada mediante suscripción mensual recurrente. El sistema centraliza en un solo lugar la agenda de citas, el punto de venta, el inventario, el cálculo de comisiones de barberos y la administración de sucursales, bajo una arquitectura multi-tenant que aísla los datos de cada barbería suscrita.

El objetivo del producto es sustituir el uso de agendas en papel, hojas de cálculo y cobros informales por un sistema único que un dueño de barbería pueda operar desde su celular o tablet, con la posibilidad de escalar de una sucursal a una cadena de sucursales sin cambiar de herramienta.

## 2. Objetivos y Alcance del Proyecto

### 2.1 Objetivo general

Proveer a dueños de barberías en México una herramienta SaaS que digitalice la operación diaria (citas, ventas, inventario y comisiones) y que SYSTECH pueda comercializar como una fuente de ingreso recurrente.

### 2.2 Objetivos específicos

- Reducir el tiempo de registro de una venta en el Punto de Venta a menos de 30 segundos.
- Eliminar los descuadres de caja mediante el cálculo automático de comisiones y cortes de caja.
- Permitir que un cliente final reserve una cita sin llamar por teléfono, mediante un enlace público por barbería.
- Dar a cada dueño visibilidad de ingresos, productos con bajo stock y desempeño por barbero desde un solo panel.
- Habilitar el crecimiento del cliente de una sucursal a varias, sin migrar de sistema (upgrade del Plan Básico al Plan Pro).

### 2.3 Dentro del alcance (MVP)

- Panel Super Admin (SYSTECH), agenda y citas, punto de venta, gestión de barberos y comisiones, control de inventario e integración con una pasarela de pagos para el cobro de la suscripción.

### 2.4 Fuera del alcance (fases futuras)

- Aplicación móvil nativa (iOS/Android) — la v1 es web responsiva.
- Marketplace de productos para venta directa al cliente final.
- Programas de lealtad o membresías prepagadas para clientes de las barberías.
- Facturación fiscal electrónica (CFDI) automatizada — se evaluará en una fase posterior según demanda.

## 3. Modelo de Negocio (Suscripción Mensual)

El software se comercializa con cobro recurrente vía una pasarela de pagos (Stripe, Conekta o Mercado Pago — ver sección 9). El cobro se ejecuta automáticamente cada mes en la fecha de alta del cliente; un pago rechazado marca la suscripción como "en riesgo" y, tras un periodo de gracia configurable, la suspende (ver 3.1 Panel de Administración).

| Plan | Sucursales | Barberos | Incluye |
| --- | --- | --- | --- |
| Básico | 1 | Hasta 3 | Agenda básica, registro de ventas, recibo simple |
| Pro | Ilimitadas | Ilimitados | Todo lo del Básico + control de inventario, comisiones automatizadas, recordatorios a clientes (WhatsApp/SMS) y reportes multi-sucursal |

### 3.1 Reglas de facturación

- Ciclo mensual, cobro anticipado (se paga el mes que está por iniciar).
- Cambio de plan (upgrade/downgrade) se prorratea al ciclo en curso.
- Cancelación: el cliente conserva acceso hasta el fin del periodo ya pagado; los datos conservan un periodo de retención antes de eliminarse (ver 6.4 Cumplimiento legal).
- Falta de pago: 1 recordatorio automático, 3 días de gracia, luego suspensión de acceso (los datos no se eliminan).

## 4. Roles de Usuario y Permisos

| Rol | Acceso | Puede hacer |
| --- | --- | --- |
| Super Admin (SYSTECH) | Panel global | Activar/suspender/cancelar suscripciones, ver métricas de ingreso recurrente de todos los clientes, soporte técnico |
| Dueño de barbería | Todas las sucursales de su cuenta | Configurar sucursales, dar de alta barberos, definir comisiones, ver reportes financieros, gestionar inventario |
| Gerente de sucursal (Plan Pro) | Una sucursal | Igual que el dueño pero limitado a su sucursal; sin acceso a reportes de otras sucursales |
| Barbero | Su propia agenda y ventas | Ver su agenda del día, registrar sus propias ventas en el POS, consultar su comisión acumulada |
| Cliente final | Enlace público de reservas | Reservar, reagendar o cancelar su propia cita; recibir recordatorios |

La asignación de rol se hace al invitar al usuario por correo electrónico; un mismo usuario puede tener roles distintos en cuentas distintas (por ejemplo, ser dueño de una barbería y barbero en otra).

## 5. Módulos y Requerimientos Funcionales

### 5.1 Panel de Administración (Super Admin)

- Gestión de clientes (dueños de las barberías suscritas): alta, edición y baja de cuentas.
- Activación, suspensión y cancelación de suscripciones por falta de pago (automatizada según las reglas de la sección 3.1).
- Métricas globales: ingreso recurrente mensual (MRR), tasa de cancelación (churn), número de cuentas activas por plan.
- Bitácora de auditoría de acciones administrativas (quién suspendió o reactivó una cuenta y cuándo).

### 5.2 Módulo de Agenda y Citas

- Calendario interactivo con disponibilidad por barbero, configurable por horario de trabajo y días de descanso.
- Reserva de citas mediante un enlace único web por barbería, sin necesidad de que el cliente cree una cuenta.
- Estados de cita: Pendiente, Confirmada, Completada, Cancelada, No asistió ("no-show").
- Bloqueo de horarios por mantenimiento o eventos especiales.
- Reglas de anticipación mínima y máxima para agendar/cancelar una cita.

### 5.3 Punto de Venta (POS)

- Registro rápido de servicios (cortes, barba, tratamientos) y venta de productos físicos (ceras, pomadas, shampoos).
- Soporte para múltiples métodos de pago en una misma venta (efectivo, tarjeta, transferencia), incluyendo pagos divididos.
- Generación de recibos compatibles con impresoras térmicas (formato de 58/80 mm) y envío de recibo digital opcional por WhatsApp o correo.
- Aplicación de descuentos y propinas al cierre de la venta.
- Vinculación automática de cada venta a la cita correspondiente (cuando aplica) y al barbero que la atendió.

### 5.4 Gestión de Barberos y Comisiones

- Registro de personal, asignación de días de descanso y horarios por barbero.
- Configuración de esquema de comisiones personalizado por tipo de servicio o producto (ej. 50/50 en cortes, 10% en productos), pudiendo variar por barbero.
- Generación de cortes de caja por turno/día y cálculo de nómina de comisiones automatizado, exportable para pago.
- Historial de comisiones por barbero, consultable por el propio barbero y por el dueño.

### 5.5 Control de Inventario

- Altas, bajas y modificaciones de catálogo de productos (nombre, costo, precio de venta, SKU).
- Alertas de reabastecimiento por stock mínimo configurable por producto.
- Descuento automático de inventario al registrar una venta de producto en el POS.
- Kardex/historial de movimientos de entrada y salida por producto.

### 5.6 Notificaciones y Recordatorios (Plan Pro)

- Recordatorio automático de cita (WhatsApp/SMS/correo) 24 y 2 horas antes.
- Confirmación automática al cliente cuando se agenda o reagenda una cita.
- Aviso al dueño/gerente cuando un producto llega a su stock mínimo.
- Aviso de pago de suscripción próximo a vencer o rechazado.

### 5.7 Reportes y Analítica

- Reporte de ventas por periodo, por sucursal y por barbero.
- Reporte de comisiones pagadas vs. pendientes.
- Reporte de productos más vendidos y rotación de inventario.
- Tasa de ocupación de la agenda y tasa de "no-shows" por barbero.

### 5.8 Onboarding y Configuración Inicial

- Asistente de configuración inicial: datos de la barbería, horario general, carga de catálogo de servicios y productos, invitación de barberos.
- Plantillas predefinidas de servicios comunes (corte, barba, combo) para reducir la configuración manual.

## 6. Requerimientos No Funcionales y Stack Tecnológico

La plataforma requiere una arquitectura web en la nube, rápida y multi-tenant (múltiples inquilinos en una misma instancia, separando sus datos de forma segura).

- **Frontend**: React con Tailwind CSS, diseño adaptable a computadora, tablet y celular (dispositivos muy usados en los locales).
- **Backend**: API en Node.js, encargada de la lógica transaccional, los cálculos de comisiones y la verificación de suscripciones activas.
- **Base de Datos**: MySQL como motor relacional (vital para que no haya descuadres en los cortes de caja y el inventario), operada mediante Prisma ORM.

### 6.1 Seguridad

- Autenticación con contraseña hasheada (bcrypt/argon2) y sesión con expiración; opción de segundo factor para el rol Super Admin.
- Aislamiento estricto de datos entre tenants (cada consulta filtrada por id de barbería) para evitar fugas de información entre clientes.
- Cifrado en tránsito (HTTPS/TLS) en toda comunicación; cifrado en reposo para datos sensibles (credenciales de pago no se almacenan directamente, se delegan a la pasarela).
- Registro (log) de accesos y cambios administrativos críticos.

### 6.2 Rendimiento y Disponibilidad

- Tiempo de respuesta objetivo menor a 2 segundos para las operaciones del POS y la agenda, incluso en horas pico.
- Disponibilidad objetivo del 99.5% mensual, con respaldo (backup) diario de la base de datos.
- Recuperación ante fallos: capacidad de restaurar el sistema a partir del último respaldo en menos de 4 horas.

### 6.3 Escalabilidad

- El Plan Pro debe soportar sucursales y barberos ilimitados sin degradar el rendimiento de otros tenants.
- Arquitectura preparada para escalar horizontalmente el backend conforme crezca el número de barberías suscritas.

### 6.4 Cumplimiento Legal (México)

- Cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP): aviso de privacidad, consentimiento para el uso de datos de clientes finales (nombre, teléfono) y derecho de los usuarios a solicitar la eliminación de sus datos.
- Definición de un periodo de retención de datos tras la cancelación de una suscripción antes de su eliminación definitiva.

### 6.5 Usabilidad

- Interfaz operable por personal sin experiencia técnica, con curva de aprendizaje mínima (objetivo: uso funcional del POS tras una capacitación de 15 minutos).

## 7. Arquitectura del Sistema

&#91;embedded content: arquitectura del sistema · cliente, frontend, API y tres servicios conectados\]

La API en Node.js centraliza la lógica de negocio; el frontend en React solo consume esa API, y la base de datos MySQL, la pasarela de pagos y el servicio de notificaciones se conectan únicamente a través de ella, lo que mantiene el aislamiento entre barberías (multi-tenant) en un solo punto.

## 8. Modelo de Datos (Entidades Principales)

| Entidad | Descripción | Relación clave |
| --- | --- | --- |
| Tenant (Barbería) | Cuenta suscrita; contiene su plan y estado de suscripción | Raíz del aislamiento multi-tenant |
| Sucursal | Ubicación física de una barbería | Pertenece a un Tenant |
| Usuario | Persona con acceso al sistema y un rol (sección 4) | Pertenece a un Tenant; puede pertenecer a varios Tenants |
| Barbero | Perfil de personal que atiende citas y ventas | Pertenece a una Sucursal |
| Cliente final | Persona que agenda citas | Asociado a un Tenant, sin cuenta propia |
| Cita | Reserva de un Cliente con un Barbero en un horario | Referencia Sucursal, Barbero y Cliente |
| Venta | Registro del POS (servicios y/o productos) | Referencia Sucursal, Barbero y, opcionalmente, una Cita |
| Producto | Ítem de inventario | Pertenece a una Sucursal |
| Comisión | Monto calculado por Venta y Barbero | Referencia Venta y Barbero |
| Suscripción | Plan contratado y estado de pago del Tenant | Pertenece a un Tenant |

Cada tabla que almacena datos operativos (Sucursal, Usuario, Cita, Venta, Producto) incluye una columna de identificador de Tenant, usada por Prisma para filtrar automáticamente toda consulta y así garantizar el aislamiento entre barberías.

## 9. Integraciones Externas

| Integración | Propósito | Opciones a evaluar |
| --- | --- | --- |
| Pasarela de pagos | Cobro recurrente de la suscripción y, opcionalmente, pagos con tarjeta en el POS | Stripe, Conekta, Mercado Pago |
| Mensajería | Recordatorios y confirmaciones de citas | API de WhatsApp Business, Twilio (SMS) |
| Correo transaccional | Recibos digitales, avisos de pago y alertas de stock | SMTP (SendGrid, Amazon SES) |
| Impresión térmica | Recibos físicos en el POS | Impresoras 58/80 mm vía protocolo ESC/POS |

La selección final de proveedor de pasarela de pagos y de mensajería debe considerar cobertura en México, costo por transacción y facilidad de integración con Node.js.

## 10. Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Fuga de datos entre tenants por error de filtrado | Alto — pérdida de confianza y posible incumplimiento legal | Pruebas automatizadas específicas de aislamiento multi-tenant en cada release |
| Descuadre de caja por fallo en el cálculo de comisiones | Alto — afecta directamente el dinero de dueños y barberos | Pruebas unitarias exhaustivas del módulo de comisiones antes de cada despliegue |
| Baja adopción por curva de aprendizaje | Medio — afecta la retención de suscriptores | Onboarding guiado (5.8) y validación temprana con dueños reales (sección 11) |
| Dependencia de un solo proveedor de pasarela de pagos | Medio — riesgo operativo si el proveedor falla o cambia condiciones | Diseñar la integración de pagos de forma desacoplada para poder cambiar de proveedor |
| Adopción de la barbería sin conexión a internet estable en el local | Medio — bloquea el uso del POS | Evaluar un modo de operación con cola local y sincronización posterior (fase futura) |

## 11. Plan de Pruebas y Criterios de Aceptación

### 11.1 Estrategia de pruebas

- Pruebas unitarias sobre la lógica de comisiones, cortes de caja e inventario (backend Node.js).
- Pruebas de integración de la API con la pasarela de pagos, usando su entorno sandbox.
- Pruebas de aislamiento multi-tenant: verificar que un usuario de un Tenant nunca puede leer o modificar datos de otro.
- Pruebas de usabilidad del POS y la agenda con dueños de barberías reales, antes del lanzamiento general.

### 11.2 Criterios de aceptación del MVP

- Un dueño puede configurar su barbería, dar de alta barberos y publicar su enlace de reservas en menos de 15 minutos.
- Una venta registrada en el POS descuenta el inventario correspondiente y calcula la comisión del barbero sin intervención manual.
- Un pago de suscripción rechazado suspende el acceso siguiendo las reglas de la sección 3.1, sin eliminar datos.
- Ningún usuario puede acceder, por ningún medio de la interfaz o la API, a datos de un Tenant distinto al suyo.

## 12. Cronograma Tentativo

| Fase | Duración estimada | Entregable |
| --- | --- | --- |
| 1. Descubrimiento y validación | 2 semanas | Entrevistas con dueños de barberías, precios definidos |
| 2. Diseño de base de datos y arquitectura | 2 semanas | Esquema Prisma, definición de aislamiento multi-tenant |
| 3. Desarrollo del MVP (Agenda, POS, Inventario) | 6-8 semanas | Plan Básico funcional |
| 4. Desarrollo de comisiones y reportes (Plan Pro) | 4 semanas | Plan Pro funcional |
| 5. Integración de pagos y notificaciones | 2 semanas | Suscripción cobrable, recordatorios activos |
| 6. Piloto con barberías reales | 3-4 semanas | Retroalimentación y ajustes antes del lanzamiento general |

Las duraciones son estimadas y deben ajustarse una vez definido el equipo de desarrollo.

## 13. Siguientes Pasos

1. Validar las funciones del Plan Básico con al menos 2 dueños de barberías locales.
2. Definir los precios exactos de la suscripción para el Plan Básico y el Plan Pro.
3. Iniciar con el diseño del esquema de base de datos en Prisma, priorizando el aislamiento multi-tenant.
4. Elegir el proveedor de pasarela de pagos (Stripe, Conekta o Mercado Pago) según cobertura en México y costo por transacción.
5. Definir el proveedor de mensajería para recordatorios (WhatsApp Business API vs. Twilio SMS).
6. Construir el MVP siguiendo el cronograma de la sección 12, comenzando por Agenda, POS e Inventario.

## 14. Glosario de Términos y Acrónimos

| Término | Significado |
| --- | --- |
| SaaS | Software as a Service — software entregado por suscripción, operado en la nube por el proveedor |
| Multi-tenant | Arquitectura donde varios clientes (barberías) comparten la misma instancia del sistema con sus datos aislados |
| MRR | Monthly Recurring Revenue — ingreso recurrente mensual, métrica clave del negocio SaaS |
| Churn | Tasa de cancelación de suscriptores en un periodo dado |
| POS | Point of Sale — punto de venta |
| ORM | Object-Relational Mapping — capa que traduce objetos de código a filas de base de datos (Prisma en este proyecto) |
| Tenant | Cliente individual (una barbería) dentro de un sistema multi-tenant |
| LFPDPPP | Ley Federal de Protección de Datos Personales en Posesión de los Particulares (México) |
| No-show | Cliente que no se presenta a una cita agendada |
