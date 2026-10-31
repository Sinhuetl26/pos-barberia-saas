# Arranque de $0 MXN: demo publicada y primeros 3–4 clientes

**Actualización15/oct:** la ruta principal vigente es `PLAN_LANZAMIENTO_RESERVA_1000_CAPACIDAD_50.md`: mostrar demo local, reservar$1,000 para despliegue cuando haya cliente y validar capacidad objetivo50. Stripe pospuesto expresamente. Este documento se conserva como alternativa gratuita y referencia de cuotas; no implica despliegue aprobado ni capacidad garantizada.

Preparado: 14 de octubre de 2026. Solicitado por Sinhue. Estado: **plan definido; despliegue, cuentas y pruebas de nube aún no ejecutados**.

## Decisión y objetivo

Publicar primero una demo ficticia y habilitar después un piloto comercial de hasta cuatro barberías pequeñas, inicialmente una sucursal cada una. Cobrar el servicio con el catálogo vigente y financiar con ingresos la mejora de infraestructura. No imponer una compra inicial de dominio, impresora o proveedores.

Propuesta principal: **Netlify Free para web y API adaptada a Functions + Neon Free para PostgreSQL**. Dirección gratuita `nombre-disponible.netlify.app`, según disponibilidad; no hay dominio reservado. HTTPS del proveedor. Mismo producto multinegocio; cuatro clientes no significan cuatro aplicaciones ni cuatro cuotas de alojamiento.

Netlify declara expresamente que su nivel gratuito permite proyectos comerciales y no exige tarjeta. Su documentación ofrece una integración de Express mediante Functions. Esto hace viable evaluar nuestra API sin reescribir el POS con otro framework. [Uso comercial](https://www.netlify.com/blog/introducing-netlify-free-plan/), [Express](https://docs.netlify.com/build/frameworks/framework-setup-guides/express/).

**Condición:** cuatro clientes es un objetivo, no una capacidad certificada. La apertura del segundo, tercero y cuarto depende de pruebas y consumo real. Conservar presupuesto de $0 no permite garantizar disponibilidad ilimitada: si el consumo deja de caber, hay que frenar nuevas altas y acordar una ampliación antes de que el servicio se interrumpa. No esquivar límites creando cuentas rotativas.

## Presupuesto

| Concepto | Desembolso inicial / mensual durante el arranque |
| --- | --- |
| Netlify Free, dentro de cuota | $0 |
| Neon Free, dentro de cuota | $0 |
| Dirección del proveedor y HTTPS | $0 |
| Repositorio y herramientas locales existentes | $0 incremental |
| Copias cifradas en equipo y un segundo medio propio disponible | $0 incremental; verificar espacio y disponibilidad |
| WhatsApp manual mediante enlace | Sin API contratada; no equivale a mensajería automática |
| Cobro de licencia mediante transferencia acordada | Sin procesador nuevo contratado; revisar las condiciones de la cuenta bancaria existente |

**Total de nuevos servicios contratados: objetivo $0 MXN.** No se incluyen internet, electricidad, equipo, tiempo de soporte o suscripción de desarrollo ya existente. Impuestos y comisiones bancarias, si corresponden, no desaparecen por usar alojamiento gratuito. No se propone una tarifa nueva ni se cambia la política fiscal pendiente.

Se eligen únicamente niveles Free, sin extras ni recargas automáticas. Si una cuenta pide tarjeta, activa prueba con cobro posterior o muestra un precio, se detiene ese alta y se revisa; no se presenta un plan de pago como gratuito.

## Límites conocidos y cómo decidir si cabe

Verificados en documentación oficial al preparar el plan:

- Netlify Free: 300 créditos mensuales, límite duro. Un despliegue de producción consume15; 10.000 solicitudes2; 1GB de transferencia20; 1GB-hora de Functions10. El sitio puede pausarse al agotar la cuota. Confirmar valores en la cuenta antes de publicar, porque pueden cambiar. [Consumo y planes](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/), [pausas](https://docs.netlify.com/manage/accounts-and-billing/billing/resume-paused-projects/).
- Neon Free:100 CU-horas/mes por proyecto,1GB de base y5GB de transferencia pública; escala a cero tras inactividad. Recuperación inmediata de hasta6horas, con límites; no sustituye una copia independiente. [Planes y límites](https://neon.com/docs/introduction/plans).
- Render gratuito queda para demostración si hiciera falta; no es la propuesta para operar estos negocios, pues su propia documentación desaconseja producción. [Render Free](https://render.com/docs/free).

Presupuesto interno ilustrativo de Netlify: cuatro publicaciones60 +150.000 solicitudes30 +2GB40 +6GB-hora60 =190 créditos. Es un **ejemplo de consumo**, no una predicción ni prueba de que cuatro barberías consumirán eso. No sumar por separado las mismas solicitudes de API a las ya contadas. Medir duración/memoria reales de Functions, imágenes, tráfico de reservas, bots y errores.

En Neon,0,25CU activas10horas×26días equivalen a65CU-horas, antes de trabajo adicional. Un sondeo o worker todo el día puede superar la cuota. No usar monitores que consulten la base continuamente para impedir que duerma.

Umbrales propios del piloto, calculados sobre consumo mensual proyectado y uso actual:

1. Objetivo: no más de200/300 créditos; menos de70/100CU-horas; menos de500MB de base y3GB de transferencia. Son márgenes de planificación, no límites del proveedor.
2. Al50% o proyección superior al objetivo: revisar consultas, imágenes, publicaciones y pestañas abiertas; registrar causa y fecha estimada de agotamiento.
3. Al70%, o agotamiento proyectado antes de fin de ciclo: detener nuevas altas y preparar mejora pagada o alternativa validada con datos conservados. Avisar con tiempo a los negocios afectados.
4. Al85%: contingencia activa. No esperar a100%, no suspender pagos/citas automáticamente ni borrar historial para ahorrar.

## Qué recibirán los primeros clientes

El núcleo ya desarrollado: reserva pública, agenda y fila, atención del barbero, registro de ventas con métodos de pago, caja/custodia/cierre, inventario/consumos, clientes, comisiones e informes, dentro de los planes y permisos vigentes.

- Efectivo, tarjeta o transferencia en el POS identifican cómo cobró la barbería. Elegir Tarjeta **no procesa un cargo bancario**; si el local tiene terminal propia, sigue usándola.
- La licencia SaaS se cobra inicialmente por transferencia acordada. Confirmar abono y registrar licencia/vigencia de forma administrativa y auditada. Nunca habilitar por una captura enviada por cliente, una URL de éxito o un botón público. Crear un mecanismo mínimo si el existente solo admite Stripe; no editar saldos o planes a escondidas en SQL.
- WhatsApp manual, sin prometer recordatorios automáticos o mensajes enviados. Correo, facturación mediante proveedor, cobros integrados e IA externa se quedan fuera hasta definir presupuesto y conexiones.
- No prometer un proceso automático de recuperación/verificación de correo si no hay proveedor operativo: validar un flujo seguro de alta y soporte antes del primer cliente; si no queda resuelto, bloquea el alta real.
- Las fotos privadas de referencia existentes se guardan como JPEG validado de hasta48KB en la base. Se puede conservar esa función si pasa privacidad y cupo; no necesita inventar un servidor de archivos. Contabilizar tamaño base64 y respaldos. Unos2.000 archivos de48KB implican aproximadamente128MB base64, antes de otras tablas/índices. No alojar originales enormes, subirlos al repositorio ni convertirlos en galería pública.
- Logo/portada/galería pública usan material autorizado y el mecanismo seguro existente. Cualquier necesidad nueva de subir archivos persistentes se resuelve y verifica antes de ofrecerla; disco temporal de Functions no cuenta como almacenamiento.

La venta se presenta como piloto acompañado con alcance explícito. La meta es cobrar por valor operativo, no prometer que todas las conexiones futuras ya están disponibles. No ofrecer duración gratuita, descuentos, meses vitalicios ni SLA sin acuerdo de Sinhue.

## Evidencia del repositorio que condiciona el despliegue

1. Hay React/Vite y Express/Node; `apps/api/src/index.ts` exporta app pero también escucha un puerto salvo NO_LISTEN. Preparar entrada compatible con Functions, sin servidor escuchando dentro de una invocación. Conservar el arranque local.
2. `schema.prisma` actual es SQLite; ya existe `schema.postgres.prisma` y pruebas PostgreSQL. Generar cliente de ese proveedor para nube y aplicar migraciones verificadas. No basta cambiar DATABASE_URL de un cliente generado para SQLite.
3. Base de producción ya exige URL PostgreSQL explícita. Mantener esa protección, NODE_ENV=production y secretos nuevos; no subir manifiestos de demo ni sus contraseñas/JWT conocidos.
4. `rateLimit.ts` usa Map por proceso. En funciones múltiples no es una defensa global suficiente: usar limitación compatible de plataforma y/o contadores atómicos persistentes para acceso/reservas. Probar varias instancias e IP real/proxy autorizado; no confiar en encabezados arbitrarios del cliente.
5. Agenda y fila consultan cada15s. Evitan pestañas ocultas, pero una pantalla visible toda la noche sigue consumiendo. Ajustar frecuencia/actividad, regresar al foco y botón Actualizar; disponibilidad y precio se confirman siempre por servidor. Una pantalla desactualizada no autoriza sobreventa.
6. `worker.ts` es un bucle persistente con pulsos15s y planificación periódica. No ejecutarlo dentro de cada Function ni mantenerlo encendido gratis. Desactivar solo las funciones que dependan de automatización no ofrecida; revisar expiraciones, limpieza y tareas necesarias una por una. Si alguna es necesaria para caja/privacidad/licencia, darle ejecución acotada y verificada o bloquear lanzamiento; no dejar trabajos pendientes fingiendo éxito.
7. `scripts/postgres_backup.js` está limitado deliberadamente a fixturesST04. No declarar que ya respalda producción. Crear herramienta aparte, destino protegido y restauración aislada probada; no quitar sin más las barreras del script de pruebas.

## Secuencia ejecutable y criterio de salida

### G0-01 — congelar una versión publicable

- Conservar todos los cambios del usuario y respaldos actuales. Terminar aceptación pendientePC12 del comprobante/impresión; una limitación de control de ventanas no se declara fallo ni PASS.
- Separar fixture público de pruebas de datos reales. Revisar archivos incluidos/excluidos, secretos, datos de demostración, consola y URLslocalhost.
- Mantener precios/capacidades actuales. Entregar lista de funciones incluidas y automáticas pendientes.
- Salida: compilación y regresión pertinente pasan; demo local conocida se conserva sin repetir A3/cierre675.

### G0-02 — probar el alojamiento con datos ficticios

- Cuentas Free de Netlify/Neon propiedad de Sinhue. Acceso/registro/aceptación de términos se completan con intervención del titular donde corresponda; nunca pedir claves en chat.
- Adaptar Express a Functions con el adaptador oficial apropiado; revisar tamaño Prisma/binarios, tiempos, memoria, límites de cuerpo, contexto por petición y pool PostgreSQL. Nueva dependencia solo si esa integración la requiere, no cambiar framework.
- Rutas `/api/*` antes del fallbackSPA; enlaces `/app/*` y `/b/*` funcionan al recargar. HTTPS, cookies/tokens, CORS y URLpública correctos.
- Ejecutar primera publicación solo con datos ficticios y secretos propios del entorno. Elegir región compatible cercana en proveedores disponibles y comprobar latencia desde México.
- Salida: enlace accesible desde otro dispositivo/red, login y lectura/escritura persisten tras reinicio; ninguna dependencia de la laptop.

### G0-03 — seguridad, costos y durabilidad antes de datos reales

- Probar aislamiento dueño/barbero/gerente/cliente y empresas distintas, concurrencia/reintentos de venta/reserva/cierre; protección de fotos/tokens, permisos de importación y límites de API.
- Límites distribuidos, consultas paginadas, no cachear respuestas privadas entre cuentas; fotos/comprobantes solo por autorización. Errores no imprimen secretos ni datos personales.
- Reducir sondeos ociosos y medir cuotas con carga representativa de hasta cuatro locales. Sin worker continuo, pagos/IA/mensajería contratados ni servicios extra involuntarios.
- Respaldo cifrado diario + copia antes de migraciones; rotación7diarios y4semanales como objetivo sujeto al espacio del medio propio. Segunda copia propia disponible, no solo la misma laptop. Probar recuperación en base aislada; un CSV no sustituye venta/stock/auditoría/relaciones/fotos.
- Respaldo diario depende de equipo/conectividad si es local: registrar éxito/fecha/tamaño y verificarlo; no prometer ejecución cuando la laptop está apagada. No entrar en operación real sin un mecanismo de copia ejecutable y responsable asignado.
- Revisión de aviso/consentimiento y condiciones del piloto con identidad real; no publicar borradores como documentos definitivos.
- Salida: evidencia de límites, cuota y restauración; control de acceso de varios negocios aprobado; se comunica pérdida máxima objetivo de hasta24h con backup diario y se mide recuperación en ensayo, sin inventar un SLA.

### G0-04 — mostrar y vender

- Demo ficticia propia, sin posibilidad de leer negocios reales. Si el entorno de demo compartiera proveedor, medir también su cuota; no multiplicar despliegues por visitante.
- Guion de5min: reserva→agenda→cobro→stock/comisión→caja→informe con datos guardados. Sin volver a cobrar el ticket de presentación.
- Contactar prospectos corresponde a Sinhue; preparar mensajes y lista, no enviar externamente por este plan. Mostrar enlace y pactar acompañamiento/alcance.
- Usar precio de catálogo vigente y cobro mensual acordado por adelantado al inicio efectivo del servicio, con comprobación y vigencia auditadas. Clarificar impuestos/concepto antes de emitir cobro; no se fijan aquí régimen ni tasa fiscal.
- Salida: primer negocio interesado y alcance aceptado, sin prometer funciones pendientes.

### G0-05 — primer negocio real

- Separar demo y real por entorno/base, no solo por nombre de negocio. Planificar el reparto de las cuotas entre ambos.
- Alta controlada de dueño y equipo, cada cuenta con credencial propia y recuperación segura; nunca credenciales demo compartidas.
- Capturar servicios, precios, horarios, barberos y stock inicial autorizado. Ensayo con datos ficticios en entorno de prueba; revisión del saldo inicial real antes de registrar operaciones del local.
- Primera jornada acompañada: revisar cierres, diferencias, errores, consumos de nube y copia diaria. Exportación y registro alternativo del local disponibles si cae internet; el POS no se anuncia offline si no lo es.
- Salida: al menos una jornada completa y persistencia/backup verificados; no abrir al siguiente si hay error de integridad, permisos o recuperación.

### G0-06 — incorporar segundo, tercero y cuarto

- Uno por uno; volver a revisar cuota/proyección y cobertura del respaldo antes de cada alta. Al menos siete días de uso medido antes de declarar capacidad del grupo; este plazo recoge evidencia y no garantiza ausencia de fallos.
- Cuenta de licencia, catálogo y sucursal separados; soporte registrado sin copiar datos privados de un cliente a otro.
- Congelar cambios grandes mientras operan. Pocas publicaciones estables; no vaciar créditos por cambiar detalles visuales en producción.
- Salida: cuatro negocios solo si consumo y atención caben; de otro modo mantener el número menor e informar.

### G0-07 — financiar la mejora con ventas

- Separar de cada cobro los importes fiscales aplicables y costos reales. Reservar después una cantidad para cubrir **al menos dos meses** de la cotización mínima estable antes de tratar el resto como disponible. Se calcula con el precio y cobro reales; no se supone que toda venta es utilidad.
- El paso a pago lo activa consumo/fiabilidad y también caja disponible, no necesariamente alcanzar cuatro clientes. Si el primer pago ya permite estabilizar, conviene hacerlo sin esperar al cuarto.
- Primera inversión: disponibilidad del servidor y recuperación/backup; después dominio y automatizaciones que sí se vendan. No es necesario migrar todos los proveedores: subir de plan puede mantener misma base y app.
- Revisión de tarifa se basa en soporte/uso real; no cambiar precios ni cargos existentes durante este plan.

### G0-08 — salida sin encierro

- Conservar PostgreSQL estándar, migraciones, código y dumps restaurables. Preparar variables por entorno, sin dependencias innecesarias de autenticación/DB propietaria nueva.
- Si hace falta cambiar de proveedor: ensayo restaurado, verificación de conteos/totales, ventana comunicada, respaldo final, control de escrituras y vuelta atrás definida. No doble escritura financiera improvisada.
- Ante pausa gratuita sin presupuesto: avisar, conservar los datos y usar el registro alternativo acordado; no afirmar que la aplicación sigue guardando ventas durante una caída. La pausa no se soluciona borrando auditoría ni recreando cuentas.

## Plazo y responsabilidad

Estimación inicial de trabajo activo: **2–4 jornadas** para adaptar, publicar y verificar el camino de piloto; revisar al terminarG0-02. La estimación anterior4–8h correspondía a demo publicada sencilla, no a dejar listos cuatro negocios reales con respaldo y permisos. Cuentas, restauración, incompatibilidades de Functions/Prisma y correcciones pueden ampliar el plazo. Después se necesita uso real para medir capacidad; no se compromete una fecha de disponibilidad comercial por esta estimación.

Codex prepara adaptación, pruebas, documentación y reporte; Sinhue conserva titularidad de cuentas, decisiones fiscales/comerciales, aceptación de términos, cobros y relación con clientes. No se le devuelven pruebas rutinarias: recibe evidencia y bloqueos concretos. Este documento no crea automatizaciones ni contrata/publica servicios todavía.

## Entregables para autorizar el piloto

- Enlace de demo y enlace real claramente diferenciados.
- Configuración de despliegue reproducible, región/versión/fecha y variables sin secretos en repositorio.
- Reporte de permisos, concurrencia, persistencia, comprobantes y cuota con carga medida.
- Respaldo cifrado y acta de restauración en destino aislado, responsable y último éxito verificable.
- Catálogo/precio vigente y procedimiento administrativo de licencia/pagos reales.
- Guía de alta y contingencia, funciones no conectadas explícitas, consumos/proyección y umbral de ampliación.

**Criterio final:** $0 de nuevos servicios dentro de cuotas, utilidad comercial verificable para el primer local, datos protegidos y recuperables. Conseguir3–4 clientes es la meta; garantizar que siempre cabrán gratis no forma parte de una promesa honesta.
