# SYSTECH — Catálogo Completo y Exhaustivo de Funciones del Sistema

Este documento recopila la totalidad de las funciones, capacidades operativas, reglas de negocio, validaciones y flujos del sistema **SYSTECH SaaS Barber Platform**, desarrollado conforme a los requerimientos de la especificación técnica `srs.md`.

---

## 1. Arquitectura Multi-Tenant & Aislamiento de Datos
1. **Aislamiento lógico por `tenantId`**: Cada consulta a la base de datos (ventas, citas, clientes, inventario, cortes de caja, barberos) incluye obligatoriamente el filtro por tenant para garantizar confidencialidad absoluta entre diferentes negocios.
2. **Generación automática de slug único**: Creación de un slug URL amigable y normalizado por barbería para reservas públicas (`/el-bigote`, `/urban-barber`).
3. **Soporte de múltiples sucursales**: Cada tenant puede operar una o múltiples sucursales con dirección, teléfono, horario de apertura y horario de cierre independientes.
4. **Middleware de contexto Multi-Tenant**: Extracción e inyección automática del tenant activo mediante cabecera HTTP `x-tenant-id`.
5. **Bloqueo dinámico por suspensión**: Intercepción de peticiones en el middleware que bloquea el acceso si la suscripción del tenant está en estado `SUSPENDIDO` (HTTP 403 con payload descriptivo).
6. **Bypass de emergencia para pagos y Super Admin**: Las rutas de regularización de suscripción y las peticiones con rol `SUPER_ADMIN` tienen acceso permitido incluso con el tenant suspendido.
7. **Switching reactivo entre sucursales**: Selector en tiempo real para alternar la vista de datos entre sucursales sin recargar la página.
8. **Switching reactivo entre tenants (para pruebas/dueños múltiples)**: Selector superior para conmutar entre diferentes barberías en la plataforma.

---

## 2. Control de Acceso y Roles (RBAC)
9. **Rol `SUPER_ADMIN`**: Visión global de toda la plataforma SaaS, acceso a métricas MRR/ARR, gestión de cuentas de clientes, modificación de suscripciones y bitácora de auditoría.
10. **Rol `DUENO`**: Control total sobre su propia barbería: reportes financieros netos, configuración de sucursales, alta de barberos, esquemas de comisiones, arqueo de caja y cambio de plan de suscripción.
11. **Rol `GERENTE`**: Operación diaria de la sucursal asignada: agenda, inventario, asignación de citas, apertura y cierre de caja. Sin acceso a cambios de suscripción SaaS.
12. **Rol `BARBERO`**: Vista personal dedicada: su propia agenda diaria de clientes, acceso directo a cobrar sus servicios en el POS y consulta de sus comisiones devengadas.
13. **Rol `CLIENTE_FINAL`**: Acceso al portal público de auto-reserva (`/#reservar`), sin autenticación previa ni contraseña.
14. **Selector rápido de roles en interfaz**: Dropdown en la barra superior para alternar instantáneamente entre los 5 perfiles y verificar permisos en caliente.

---

## 3. Panel Super Admin (Métricas SaaS Globales)
15. **Cálculo automático de MRR (Monthly Recurring Revenue)**: Suma agregada en tiempo real de las mensualidades activas de todas las barberías.
16. **Proyección de ARR (Annual Recurring Revenue)**: Proyección anualizada a 12 meses basada en el MRR vigente.
17. **Cálculo de Tasa de Churn**: Porcentaje de cancelaciones o suspensiones respecto al total histórico de cuentas.
18. **Conteo de cuentas activas vs. totales**: Monitor numérico de barberías operando normalmente.
19. **Monitor de cuentas en riesgo**: Alerta visual del número de barberías con pago rechazado en su periodo de gracia.
20. **Desglose de distribución de planes**: Gráfica y conteo de clientes en Plan Básico ($499 MXN) vs. Plan Pro ($999 MXN).
21. **Monitor de volumen global en plataforma**: Agregación de citas totales, total de barberos registrados y volumen transaccionado en dinero a nivel SaaS.
22. **Búsqueda y filtrado de barberías**: Buscador en vivo por nombre comercial, slug o correo del propietario.
23. **Modificación forzada de estado de tenant**: Posibilidad de cambiar el estado de cualquier barbería a `ACTIVO`, `EN_RIESGO` o `SUSPENDIDO`.
24. **Modificación manual de plan**: Cambio administrativo inmediato entre Básico y Pro para promociones o soporte.
25. **Registro de motivo de cambio**: Campo obligatorio para justificar auditorías en cada cambio manual de estado o plan.
26. **Botón de actualización manual de métricas**: Refresco bajo demanda de todos los agregados financieros globales.

---

## 4. Asistente de Configuración Inicial (Onboarding Wizard en < 3 min)
27. **Modal flotante guiado en 4 pasos**: Flujo intuitivo sin recarga de página para llevar una barbería de papel/Excel a SaaS en 3 minutos.
28. **Paso 1 - Datos de Marca**: Captura de nombre comercial, WhatsApp de contacto, correo del dueño y sucursal matriz.
29. **Paso 1 - Configuración de horarios base**: Definición de hora de apertura (ej. 09:00) y cierre (ej. 20:00).
30. **Paso 1 - Elección de plan inicial**: Selección entre Plan Básico ($499) o Plan Pro ($999).
31. **Paso 2 - Precarga masiva de catálogo en 1 clic**: Selección de plantillas estándar (Corte Clásico, Barba Express, Afeitado Toalla Caliente, Combo VIP, Exfoliación Facial, Tinte/Platinado, Cera Mate, Aceite para Barba).
32. **Paso 3 - Registro del primer barbero**: Alta del primer miembro del equipo sin salir del flujo de inicio.
33. **Paso 3 - Configuración de comisiones del barbero**: Definición de porcentaje de comisión en servicios (ej. 50%) y productos (ej. 10%).
34. **Paso 4 - Generación de enlace de reservas en vivo**: Despliegue del link público listo para compartir por WhatsApp o redes sociales.
35. **Paso 4 - Redirección directa al POS**: Acceso inmediato a la terminal de venta con el catálogo y barbero ya precargados.

---

## 5. Gestión de Suscripciones y Ciclo de Cobro
36. **Planes diferenciados**: Plan Básico ($499 MXN/mes con 1 sucursal y máx 3 barberos) vs. Plan Pro ($999 MXN/mes ilimitado).
37. **Facturación anticipada recurrente**: Registro de fecha de próximo cobro y monto mensual pactado.
38. **Detección de pago fallido**: Transición de estado de `ACTIVO` a `EN_RIESGO` ante rechazos de tarjeta.
39. **Periodo de gracia de 3 días**: Acceso continuo sin interrupción mientras se notifica al usuario sobre el intento fallido.
40. **Banner de advertencia de periodo de gracia**: Aviso persistente en el encabezado con contador de días restantes y botón de pago.
41. **Suspensión automática tras 3 días de gracia**: Paso a estado `SUSPENDIDO` que desactiva el POS y la agenda hasta la liquidación.
42. **Banner de cuenta suspendida**: Aviso rojo con explicación del aislamiento seguro de datos y botón de reactivación.
43. **Simulador sandbox de pasarela**: Botones de prueba para simular pago exitoso, pago fallido (gracia) o suspensión forzada.
44. **Upgrade / Downgrade dinámico de planes**: Cambio inmediato entre Básico y Pro con actualización de límites del sistema.
45. **Validación de límites del Plan Básico**: Bloqueo preventivo al intentar registrar un 4to barbero o una 2da sucursal con invitación a upgrade.

---

## 6. Agenda, Disponibilidad y Citas
46. **Vista multi-columna por barbero**: Cada barbero cuenta con su columna vertical con su horario de entrada y salida visible.
47. **Navegador temporal**: Selector de fecha nativo, botones de avanzar/retroceder día a día y botón de retorno rápido a "Hoy".
48. **Cálculo de citas activas por día**: Contador en vivo en la cabecera con el total de citas del día seleccionado.
49. **Visualización de tarjetas de cita**: Cada cita muestra hora de inicio, duración estimada en minutos, cliente, teléfono y servicio.
50. **Transición de estados de cita**:
    - `PENDIENTE` (agendada desde portal web o manual)
    - `CONFIRMADA` (validada por el cliente o recepción)
    - `EN_SILLON` (cliente siendo atendido actualmente)
    - `COMPLETADA` (servicio concluido y transferido a cobro)
    - `CANCELADA` (cita anulada)
    - `NO_SHOW` (cliente no asistió a su cita)
51. **Botón directo de 1 clic para transferir a cobro (POS)**: Botón "Cobrar POS" en la tarjeta de la cita que precarga al cliente, el servicio y el barbero en la terminal de venta.
52. **Marcado rápido de "No-Show"**: Registro inmediato de inasistencias para alimentar la métrica de no-shows del negocio.
53. **Insignia de cita ya cobrada**: Etiqueta visual indicando que la cita concluyó y fue liquidada en el POS.
54. **Modal para agendar cita manual**: Formulario para recepcionista/dueño para clientes que llaman por teléfono o llegan en persona.
55. **Bloqueos de horario (Schedule Locks)**: Capacidad de bloquear franjas horarias específicas (ej. 14:00 - 15:00) para un barbero o para toda la sucursal.
56. **Catálogo de motivos de bloqueo**: Hora de almuerzo, mantenimiento de sillón, capacitación o permiso especial.
57. **Chips de bloqueos activos**: Visualización de los bloqueos vigentes con opción de eliminación en 1 clic.
58. **Copiado de enlace de reservas en 1 clic**: Botón en cabecera que copia al portapapeles la URL pública de la barbería.

---

## 7. Portal Público de Auto-Reserva para Clientes (`/#reservar`)
59. **Acceso sin registro ni passwords**: Los clientes reservan en segundos sin necesidad de crear cuenta ni recordar claves.
60. **Resolución dinámica por slug**: El portal carga el nombre, sucursales y servicios correspondientes al negocio según la URL (`/#reservar?slug=...`).
61. **Paso 1 del portal - Selección de Sucursal**: Muestra dirección, horario de apertura/cierre y ubicación.
62. **Paso 2 del portal - Selección de Servicio**: Tarjetas interactivas con categoría, duración en minutos y precio de venta en MXN.
63. **Paso 3 del portal - Selección de Barbero**: Muestra avatares de los barberos activos y sus turnos laborales.
64. **Paso 4 del portal - Matriz de horarios disponibles**: Algoritmo que calcula los slots libres según citas ya agendadas, bloqueos de horario y turnos laborales.
65. **Tachado visual de horarios ocupados**: Horarios tomados aparecen deshabilitados y tachados impidiendo sobreventa.
66. **Paso 5 del portal - Datos del Cliente**: Captura de nombre completo, teléfono a 10 dígitos y notas especiales.
67. **Paso 6 del portal - Generación de Folio Único**: Creación de folio de confirmación con prefijo `RES-XXXX` generado por UUID determinista.
68. **Paso 6 del portal - Botón de confirmación en WhatsApp**: Enlace `https://wa.me/` formateado que abre WhatsApp con el mensaje de confirmación listo para enviar.
69. **Búsqueda y consulta de citas agendadas por folio**: Cajón de consulta donde el cliente ingresa su folio `RES-XXXX` y ve los detalles de su cita.
70. **Cancelación autónoma por el cliente**: Botón para que el cliente cancele su propia cita desde la web liberando el slot en la agenda al instante.
71. **Aviso de privacidad LFPDPPP**: Leyenda legal visible de cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de Particulares.

---

## 8. Punto de Venta (POS) y Checkout < 30 Segundos
72. **Búsqueda instantánea en catálogo**: Filtro en tiempo real por nombre del producto, categoría o SKU.
73. **Pestañas de filtrado por categoría**: Botones horizontales de filtrado (Todos, Styling, Barba, Tratamientos, etc.).
74. **Tarjetas táctiles de producto**: Agregado al carrito en 1 toque con indicador visual de stock actual o duración en minutos.
75. **Alerta de stock crítico en tarjeta**: Punto rojo en tarjetas de productos que han alcanzado o bajado de su stock mínimo.
76. **Controles de cantidad en carrito**: Botones `+` y `-` para ajustar piezas y botón de eliminación individual.
77. **Vaciado rápido de carrito**: Botón "Vaciar" para reiniciar la orden en un clic.
78. **Asignación obligatoria de barbero**: Selector del barbero que realizó el servicio para el cálculo automático de su comisión.
79. **Visualización de esquema de comisiones en el selector**: Muestra el % de servicio y % de producto del barbero seleccionado.
80. **Captura de nombre de cliente en mostrador**: Por defecto "Público General" o el nombre transferido desde la cita.
81. **Cálculo reactivo de subtotal**: Suma en tiempo real de todos los productos y servicios del carrito.
82. **Aplicación de descuento directo ($ MXN)**: Campo numérico para aplicar descuentos en pesos sobre la orden.
83. **Selector rápido de propina (%)**: Botones de 0%, 10%, 15% y 20% que calculan el monto de propina al instante.
84. **Cálculo de total final**: `Total = Subtotal - Descuento + Propina`.
85. **Aviso de cita vinculada**: Banner superior en el POS que informa si se está cobrando una cita transferida desde la agenda.
86. **Desvinculación voluntaria de cita**: Opción de desvincular la cita si el cliente desea ordenar algo distinto en mostrador.

---

## 9. Motor de Pagos Múltiples (Multi-Tender) y Pagos Divididos
87. **Soporte de Efectivo (`EFECTIVO`)**: Registro de cobro en moneda física.
88. **Calculadora automática de cambio**: Campo de "Efectivo Recibido" con cálculo inmediato del cambio exacto a devolver al cliente.
89. **Botones de denominación rápida**: Accesos directos para pagar con el importe exacto, billetes de $100, $200, $500 o $1,000 MXN.
90. **Soporte de Tarjeta (`TARJETA`)**: Registro de transacciones con terminal bancaria de débito o crédito.
91. **Soporte de Transferencia SPEI (`TRANSFERENCIA`)**: Registro de transferencias interbancarias directas.
92. **Soporte de Pago Dividido / Mixto (`MIXTO`)**: Posibilidad de dividir la cuenta entre efectivo y tarjeta (ej. $150 en efectivo y $100 con tarjeta).
93. **Cálculo reactivo del monto restante en pago mixto**: Modificar el efectivo ajusta automáticamente el remanente en tarjeta y viceversa.
94. **Generación de folio único de venta**: Formato `FOL-XXXX` inmutable y trazable.
95. **Descuento de inventario automático tras venta**: Los productos físicos incluidos en la orden se descuentan del stock al momento de cobrar.
96. **Generación automática del movimiento en Kardex**: Registro con tipo `SALIDA_VENTA` y referencia al folio de venta.
97. **Cálculo y acreditación automática de comisión**: Registro de comisión pendiente para el barbero según los porcentajes de su contrato.
98. **Actualización automática del estado de la cita vinculada**: Si la venta proviene de una cita, esta pasa automáticamente a estado `COMPLETADA`.

---

## 10. Recibo Térmico (58mm / 80mm) y Compartir por WhatsApp
99. **Modal de confirmación de venta**: Despliegue inmediato del ticket tras procesar el cobro.
100. **Diseño de ticket térmico estilizado**: Formato monoespaciado en blanco y negro con líneas punteadas listo para impresora de tickets.
101. **Encabezado comercial del ticket**: Nombre del tenant en mayúsculas, sucursal y teléfono de contacto.
102. **Metadatos de la orden en ticket**: Folio `FOL-XXXX`, fecha, hora exacta y barbero que atendió.
103. **Desglose de partidas en ticket**: Cantidad, nombre de cada servicio/producto y subtotal por renglón.
104. **Totales e impuestos en ticket**: Subtotal, propina agregada, total liquidado y método de pago utilizado.
105. **Estilos CSS nativos de impresión (`@media print`)**: Al imprimir, se oculta la interfaz de la aplicación y solo se envía el recibo con un ancho exacto de 80mm a la impresora térmica.
106. **Generador de enlace WhatsApp para recibo digital**: Botón que crea una URL `https://wa.me/` con el texto completo del recibo formateado con emojis y tabulaciones.
107. **Botón de copiado de recibo en texto plano**: Respaldo para pegar el recibo en correo o chat si el cliente no usa WhatsApp Web.
108. **Botón de "Nueva Venta"**: Limpieza de modales y preparación inmediata de la terminal para el siguiente cliente en fila.

---

## 11. Gestión de Barberos, Personal y Esquemas de Comisión
109. **Directorio completo de barberos**: Listado de todo el equipo por sucursal con teléfono, correo y avatar de iniciales.
110. **Comisión dual independiente**: Porcentaje configurable para servicios (ej. 50%) y porcentaje para venta de productos (ej. 10%).
111. **Registro de días de descanso**: Asignación de días no laborales (ej. Domingo, Lunes) para control de turnos.
112. **Horarios de turno individuales**: Hora de inicio y fin de jornada por barbero para el cálculo de slots en agenda.
113. **Contador de comisiones pendientes en tarjeta**: Monto acumulado en tiempo real que se le debe al barbero por sus servicios realizados.
114. **Insignia de estado activo**: Indicador de que el barbero está habilitado para recibir citas y ventas.
115. **Modal de alta de nuevo barbero**: Formulario con validación de límite de barberos según el plan contratado.
116. **Pestaña de liquidación de nómina (Comisiones)**: Visión agregada de comisiones pendientes vs. comisiones ya liquidadas en el periodo.
117. **Tabla detallada de comisiones**: Muestra barbero, folio de venta, monto total de la venta, comisión ganada y estado (`PENDIENTE` / `PAGADA`).
118. **Filtro de comisiones por barbero específico**: Menú desplegable para auditar las comisiones de un solo miembro del equipo.
119. **Selección múltiple con checkboxes**: Casillas para elegir exactamente qué comisiones se liquidarán en el lote.
120. **Dispersión masiva de comisiones en lote**: Botón "Pagar X Comisiones" que marca las seleccionadas como pagadas en una sola transacción.

---

## 12. Turnos de Caja y Cortes (Arqueo Ciego y Descuadres)
121. **Apertura de turno de caja**: Registro obligatorio del fondo inicial en efectivo antes de iniciar operaciones.
122. **Captura de notas de apertura**: Comentarios sobre denominaciones o estado de la caja física.
123. **Monitor de turno activo en vivo**: Panel que muestra si la caja está abierta, fondo inicial y hora de apertura.
124. **Acumulación en vivo de ventas en efectivo**: Suma en tiempo real de los cobros en efectivo ingresados en el turno.
125. **Acumulación en vivo de cobros con tarjeta y SPEI**: Registro del dinero digital recibido en la jornada.
126. **Acumulación en vivo de propinas**: Control de propinas recibidas para evitar mezclarlas con las ventas del negocio.
127. **Cierre de caja con arqueo ciego**: El sistema no muestra al cajero el efectivo esperado antes del conteo para evitar manipulación.
128. **Captura de conteo físico real**: El cajero ingresa el dinero que contó físicamente en el cajón.
129. **Cálculo automático de descuadre**: `Descuadre = Conteo Real - (Fondo Inicial + Ventas Efectivo)`.
130. **Detección de caja cuadrada**: Etiqueta verde "Exacto ($0)" cuando el conteo coincide exactamente con lo registrado en el sistema.
131. **Alerta de faltante o sobrante**: Alerta con el monto exacto de la discrepancia en pesos.
132. **Historial de cortes de caja**: Tabla inmutable con fecha de apertura, fecha de cierre, fondo, efectivo, total de ventas, conteo real, descuadre y estado (`ABIERTO` / `CERRADO`).

---

## 13. Inventario, Catálogo y Trazabilidad Kardex
133. **Distinción entre Producto Físico y Servicio**: Servicios tienen duración en minutos y no descuentan stock; productos físicos tienen SKU, costo, stock y stock mínimo.
134. **Cálculo automático de margen de ganancia (%)**: `Margen = ((Precio Venta - Costo) / Precio Venta) * 100`.
135. **Control de stock mínimo de seguridad**: Umbral de alerta por producto para reposición oportuna de mercadería.
136. **Contador global de productos en stock bajo**: Alerta persistente en la cabecera del inventario con enlace para filtrar la lista.
137. **Búsqueda en catálogo**: Búsqueda por nombre de producto, código SKU o categoría.
138. **Modal de alta de producto/servicio**: Formulario completo para registrar precio de venta, costo, SKU, categoría, duración o existencias iniciales.
139. **Modal de ajuste manual de stock**: Opciones para realizar entradas por compra a proveedores, mermas por producto dañado o ajustes de inventario físico.
140. **Trazabilidad inmutable mediante Kardex**: Registro de cada movimiento con fecha, producto, tipo de movimiento, cantidad (positiva o negativa), stock anterior, stock resultante y motivo.
141. **Pestaña dedicada de auditoría Kardex**: Tabla cronológica completa de todas las entradas y salidas de almacén.

---

## 14. Notificaciones Pro y Recordatorios por WhatsApp
142. **Disparador de plantillas automatizadas**:
    - Recordatorio 24 horas antes de la cita
    - Recordatorio 2 horas antes de la cita
    - Confirmación inmediata de cita agendada
    - Alerta de stock crítico dirigida al dueño
143. **Generación automática de mensaje personalizado**: Reemplazo de variables (nombre del cliente, fecha, hora, barbero, folio de reserva, nombre de la barbería).
144. **Generador de enlace directo a WhatsApp Web/App**: Creación del enlace `https://wa.me/{telefono}?text={mensaje}` con codificación URI segura.
145. **Bitácora histórica de notificaciones**: Tabla de auditoría con fecha de envío, tipo de plantilla, destinatario, mensaje completo y estado (`ENVIADO` / `ENTREGADO`).
146. **Módulo exclusivo del Plan Pro**: Bloqueo elegante con invitación a upgrade para tenants en Plan Básico.

---

## 15. Analítica Financiera, KPIs y Business Intelligence
147. **Selector de periodo temporal**: Filtro analítico por Hoy, Últimos 7 días, Este Mes o Este Año.
148. **Filtro de analítica por barbero individual**: Análisis del rendimiento de un especialista en específico o de todo el salón.
149. **KPI de Ventas Netas Totales**: Volumen neto transaccionado en pesos en el periodo seleccionado.
150. **Contador de transacciones**: Número total de operaciones cerradas en el POS.
151. **Cálculo de Ticket Promedio**: `Ticket Promedio = Total Ventas / Cantidad de Transacciones`.
152. **KPI de Comisiones Devengadas**: Total de comisiones generadas, divididas entre pagadas y pendientes de liquidación.
153. **Cálculo de Tasa de No-Shows (%)**: `Tasa = (Citas No-Show / Total Citas) * 100`.
154. **Monitor de Propinas Totales**: Volumen total de propinas acumuladas para el personal.
155. **Gráfica de distribución de Métodos de Pago**: Barras porcentuales y monetarias de Efectivo, Tarjeta, Transferencia y Mixto.
156. **Ranking de ítems con mayor rotación e ingresos**: Top de servicios y productos que más dinero generan, con unidades vendidas.
157. **Leaderboard de rendimiento del personal**: Tabla ordenada con número de servicios realizados, ventas netas producidas, comisiones ganadas y porcentaje de participación sobre los ingresos totales del salón.

---

## 16. Seguridad, Privacidad (LFPDPPP) y Bitácora de Auditoría
158. **Bitácora global de auditoría (`AuditoriaLog`)**: Registro inmutable de eventos clave del sistema (cambios de plan, aperturas de caja, pagos, suspensiones, modificaciones de precios).
159. **Metadatos en logs de auditoría**: Fecha y hora exacta, tenant afectado, acción ejecutada y detalle descriptivo del cambio.
160. **Cumplimiento de la Ley Federal de Protección de Datos Personales (LFPDPPP)**: Manejo restringido de teléfonos de clientes únicamente para confirmación de citas y recibos.
161. **Aislamiento de bases de datos**: Claves foráneas e índices estructurados en SQLite / PostgreSQL con Prisma ORM que impiden fugas de datos entre tenants.
162. **Resiliencia ante fallos**: Controladores de error en todas las rutas de Express y cliente frontend tipado con TypeScript estricto.

---

## 17. Interfaz de Usuario, Estética y Experiencia Minimalist Light
163. **Diseño Minimalista Light Theme**: Esquema de color blanco marfil cálido (`#FAFAFA`), tarjetas en blanco puro (`#FFFFFF`) y bordes ultrafinos piedra (`border-stone-200/80`).
164. **Tipografía moderna de alta gama**: Integración de Google Fonts `Plus Jakarta Sans` e `Inter` con espaciado ajustado (`tracking-tight`).
165. **Cifras tabulares monoespaciadas**: Folios, precios, horas y métricas financieras formateados con alineación perfecta.
166. **Diseño completamente responsivo**: Adaptable a terminales POS táctiles, tablets de recepción y teléfonos móviles de clientes.
167. **Feedback visual en botones y modales**: Micro-animaciones fluidas de entrada (`animate-luxury-in`) y estados hover bien definidos.
168. **Cero dependencias pesadas de terceros**: Rendimiento ultra-rápido con Vite, empaquetado en menos de 9 segundos y arranque en 650 ms.
