# SYSTECH Studio: plan ágil para salir a vender

Fecha: 9 de octubre de 2026. Versión de planeación 1.1; secuencia reorganizada para pilotos independientes y renovación. Mercado: México, barberías independientes y cadenas. Objetivo del titular: **10 barberías de pago durante los primeros tres meses**. Aún no hay dominio ni alojamiento contratados.

Este documento dirige el trabajo comercial desde ahora. [Backlog ejecutable](BACKLOG_LANZAMIENTO.json), [costos y escenarios](COSTOS_Y_PRECIOS.md) y [supuestos editables](MODELO_ECONOMICO.json) forman parte del plan. Los roadmaps anteriores son antecedentes; ante contradicción, usar esta versión. Los precios son recomendaciones, todavía no modificaciones de la oferta pública ni de Stripe.

## 1. Qué vamos a vender

**Una operación de barbería que el dueño puede controlar sin revisar cada movimiento:** agenda sin empalmes, venta rápida, caja conciliable, comisiones transparentes y señales para que el cliente vuelva. Para cadenas, la misma operación con permisos y comparación de sucursales.

La calidad premium se demuestra en cinco cosas: facilidad al cobrar, exactitud del dinero, privacidad entre negocios, recuperación ante fallas y atención que resuelve. La estética acompaña esa experiencia. No usaremos “el mejor POS” como resultado demostrado antes de medirlo con usuarios.

Recorrido comercial central: configurar negocio → publicar reserva → atender → cobrar → entregar ticket → registrar comisión → cerrar caja → revisar operación → proponer próxima cita. El dueño paga por reducir problemas y tomar decisiones; las métricas deben mostrar evidencia.

Dos perfiles de compra:

| Perfil | Necesidad principal | Prueba que debe superar el producto |
| --- | --- | --- |
| Independiente, 1–3 barberos | Agenda, cobro y cierre fáciles | Dueño configura y completa un día sin asistencia constante |
| Barbería de 4–8 barberos | Roles, control del equipo y recurrencia | Permisos, comisiones y resumen ahorran trabajo comprobable |
| Cadena | Control central con responsabilidad local | Gerentes restringidos, cortes por ubicación y comparación conciliada |

Validar estas hipótesis en entrevistas y pilotos; no asumir que todas las barberías quieren automatización o cambiar de proveedor.

## 2. Estado real de partida

- Existe POS, agenda, clientes, inventario, caja, comisiones, licencias y nueva experiencia Studio. Las últimas verificaciones locales registran 122 pruebas en cinco suites; utilizan SQLite.
- Stripe sandbox ya tuvo un pago completo con tarjeta ficticia y activación automática. Se verificaron firma inválida, duplicados y factura antes de checkout. Evidencia en [reporte Stripe](STRIPE_PRUEBA_VERIFICADA.json). Falta ciclo completo y producción.
- WhatsApp automatizado usa configuración global preliminar; CFDI también necesita aislamiento por emisor. No están listos para conexión autónoma por negocio.
- PostgreSQL real, restauración, concurrencia con réplicas, entrega externa de correo, hardware y soporte todavía requieren evidencia. Tener código o una pantalla no cumple una historia comercial.
- El precio actual de Pro admite límites cercanos a ilimitados en partes del backend. Debe corregirse antes de ofertar cadenas.

Detalle técnico y evidencias anteriores: [dirección del producto](REINVENTAR_SYSTECH.md). No reiniciar el proyecto: fortalecer y completar lo existente.

## 3. Alcance y versiones

**V1: núcleo comercial confiable.** Agenda y reserva pública; POS con pagos registrados y mixtos; caja y devoluciones; clientes; catálogo e inventario; comisiones; roles; tickets; exportación; resumen del dueño; onboarding; licencia Stripe; correo transaccional; respaldo; monitoreo y soporte. Cadena añade permisos y comparación por sucursal. Suscripciones por negocio con capacidad definida.

Registrar “tarjeta” o “transferencia” en el POS no significa procesar ni comprobar ese pago bancario. La licencia Stripe cobra SYSTECH; el dinero de cortes pertenece a cada barbería. Esta separación debe estar clara en producto, demo y contrato.

**V1.1: conexiones activables.** WhatsApp por barbería con plantillas, consentimiento y consumo; CFDI por RFC con certificados protegidos, documentos y cancelaciones. Se trabajan durante el plan, pero su venta depende de aprobaciones y pruebas externas. Si se atrasan, se venden exclusivamente las funciones del núcleo que hayan pasado sus controles; no se cobra un adicional pendiente.

**V1.2: diferenciación medida.** Reagenda al cobrar, preferencias del cliente, resumen de excepciones y pulido con observación real. Estas funciones se priorizan sobre añadir muchos módulos genéricos.

**Después de V1: backlog de expansión.** Lista de espera, anticipos y terminal integrada, membresías de clientes, Calendar, reseñas/referidos, offline e IA. Historias ST-34 a ST-40. No anunciar fecha ni incluirlas como funcionalidad disponible. Offline exige un proyecto de sincronización e integridad propio.

## 4. Método de ejecución

Scrum ligero con **sprints de una semana** y tablero Kanban. Cada sprint entrega un recorrido utilizable, evidencia y pendientes explícitos. No se mide avance por cantidad de pantallas.

Estados: pendiente → lista → en curso → revisión → validada. “Bloqueada” requiere causa, responsable y condición de desbloqueo. Una historia en curso por implementador; máximo dos en revisión. Un incidente de seguridad o dinero desplaza el sprint. No abrir varios rediseños mientras quede una venta inconsistente.

Prioridades: P0 impide vender el alcance afectado; P1 debe completarse para anunciar esa capacidad; P2 se reordena después de aprender del piloto. Historias L se dividen tras investigación antes de entrar a ejecución. Las tallas S/M/L indican complejidad, no horas. Al terminar el primer sprint se estima capacidad real y se ajusta el calendario restante.

Cadencia de trabajo:

1. Inicio: elegir objetivo y pocas historias listas, confirmar dependencias y preparar fixtures.
2. Durante: implementar, revisar riesgo e incorporar feedback; comunicar hallazgos y bloqueos reales.
3. Cierre: demostrar con datos controlados, registrar pruebas y evidencia; aceptar solo lo comprobado.
4. Retrospectiva: qué falló, qué consumió tiempo y qué cambiar; repriorizar sin perder el objetivo comercial.

**Lista para empezar (Definition of Ready):** problema y usuario claros, alcance acotado, criterios verificables, dependencias disponibles, fixture y método de prueba. Cuando requiere cuenta, dominio o hardware, documentar qué parte sí puede completarse antes de tenerlos.

**Terminada (Definition of Done):** criterios cumplidos; autorización en servidor; aislamiento tenant/sucursal; comportamiento correcto al repetir o fallar; pruebas pertinentes; revisión visual si cambió interfaz; evidencia archivada sin secretos; migración/rollback si aplica; documentación y oferta coherentes. Una prueba mock valida lógica, no entrega real de proveedor. Una historia fiscal o de hardware requiere prueba externa para declararse validada.

Cada cierre deja actualización del backlog con fecha, commit o archivos afectados, evidencia y pendientes. No asignar porcentaje ficticio a una historia parcialmente construida. La venta general necesita un acta go/no-go, no un “ya compila”.

## 5. Orden de sprints y entregables

Reorganización autorizada el 9 de octubre de 2026. Son bloques de trabajo: la duración se estima al refinar y observar capacidad. No se garantiza completar todas las historias en siete días ni ventas para una fecha fija. Los sprints 1–2 conservan sus cierres; ST-01/ST-08/ST-09 se resuelven transversalmente antes de uso/cobro reales.

| Sprint | Objetivo | Historias |
| --- | --- | --- |
| 1 | Seguridad y modelo comercial | ST-01, ST-02, ST-03, ST-04 |
| 2 | Operación de mostrador | ST-05, ST-06, ST-07, ST-08, ST-09 |
| 3 | Demo profesional y validación de demanda | ST-12, ST-43, ST-44 |
| 4 | Operación segura y cobranza lista | ST-10, ST-11, ST-13, ST-14, ST-15, ST-16, ST-45 |
| 5 | Pilotos independientes y primera renovación | ST-17, ST-20, ST-26, ST-27, ST-28, ST-47 |
| 6 | Valor agregado y salida independiente | ST-29, ST-30, ST-31, ST-32, ST-33, ST-41, ST-42, ST-48 |
| 7 | Cadenas con autorización propia | ST-18, ST-19, ST-46 |
| 8 | Conectores opcionales sostenibles | ST-21, ST-22, ST-23, ST-24, ST-25 |
| 9 | Expansión posterior según evidencia | ST-34, ST-35, ST-36, ST-37, ST-38, ST-39, ST-40 |

Sprint actual de preparación: 3, ST-43 pulido previo y ST-44 demo/demanda, junto con ST-12 cola durable. ST-27 conserva publicación comercial; ST-31 conserva pulido completo en dispositivos reales. No se declaran terminadas por crear entregas parciales.

Los 42 IDs originales se conservan. ST-43 a ST-48 desglosan preparación, capacidad independiente, autorización de Cadena, primera renovación y crecimiento a diez. Estados conservados: seis Validadas, tres Bloqueadas y 39 Pendientes. Las fechas/estados se actualizan por evidencia, no por reorganizar.

Preparar candidatos mientras se desarrolla, sin contratar infraestructura para obtener entrevistas. Identidad, fiscalidad, dominio y dispositivos requieren al titular/proveedores. El presupuesto mínimo vigente se encuentra en [PRESUPUESTO_MINIMO_PILOTO.md](PRESUPUESTO_MINIMO_PILOTO.md); las cifras originales de la sección económica son un escenario histórico mayor, no una orden de compra.

## 6. Puertas de salida

| Puerta | Condición mínima | Lo que habilita |
| --- | --- | --- |
| A: demo/staging | Datos ficticios separados, permisos, regresión y alcance honesto | Entrevistas y demostraciones controladas; ningún cobro ni uso operativo real |
| B: piloto acompañado independiente | ST-08/09, operación consistente, ST-13/14/15/16 y capacidad ST-45; actas y consentimiento | Uso supervisado con alcance explícito; ST-17 debe cumplir sus criterios antes de C |
| C: piloto pagado independiente | ST-20: ST-01 fiscal, licencia live, ST-17 y ST-45 aprobados, cero defectos críticos o de alto impacto | Cobrar núcleo independiente dentro de capacidad y dispositivos comprobados |
| D: venta general independiente | ST-32/33, carga, restauración, soporte, métricas y primera renovación ST-47 | Captación pública de independientes con límites y capacidad demostrados |
| E: Cadena | ST-18/19 y acta ST-46; permisos, comparación y piloto multisucursal | Ofertar/contratar Cadena; C/D no la autorizan |

Los add-ons se habilitan por sus propios criterios y costo; WhatsApp/CFDI de la barbería no bloquean el núcleo si quedan deshabilitados y fuera de oferta. Los comprobantes del SaaS y su fiscalidad sí se resuelven antes de cobrar.

Defecto crítico: fuga entre negocios, acceso indebido, cobro/venta/stock/caja incorrectos, pérdida de datos o indisponibilidad sin recuperación. Ningún crítico ni defecto de alto impacto en venta/cierre abierto para C/D/E. No bajar severidad para cumplir fecha.

Objetivos internos: RPO máximo 24 h, RTO máximo 4 h y p95 API menor a un segundo con carga/dataset publicados; una venta/reserva por intención y reportes conciliados en centavos. Corregir arquitectura o reducir capacidad explícita si no cumple. No son SLA publicitario ni prueba de alta disponibilidad.

WhatsApp exige dos negocios aislados, webhook firmado, plantilla, consentimiento y entrega/costo reales. CFDI exige emisor/CSD, idempotencia, XML/PDF, cancelación y revisión fiscal. Offline e IA permanecen fuera de la oferta hasta su propia validación.

## 7. Licencias y precio recomendado

Todos los importes siguientes son **mensuales en MXN antes de IVA**, como propuesta; mostrar también total fiscal antes de confirmar pago. Un negocio/tenant conserva su información cuando cambia de plan.

| Plan | Precio recomendado | Capacidad | Motivo para elegirlo |
| --- | ---: | --- | --- |
| Esencial | $499 | 1 sucursal, hasta 3 barberos activos | POS, agenda, caja, clientes, inventario básico, comisiones, tickets y exportación |
| Pro | $999 | 1 sucursal, hasta 8 barberos activos | Núcleo + permisos avanzados, análisis del equipo, seguimiento y alertas verificadas |
| Cadena | $2,699 | Hasta 3 sucursales, hasta 8 barberos por sucursal | Pro + administración, catálogo y comparación centrales |
| Sucursal extra en Cadena | $799 | Hasta 8 barberos en esa sucursal | Crecer sin contratar otra cuenta aislada |

Contar barberos reservables activos, no castigar usuarios administrativos de solo consulta. Capacidad mayor a ocho por sucursal requiere cotización al inicio, para no introducir muchos cargos antes de aprender. No permitir que baja/reactivación/importación evadan el límite. Pro deja de significar “cadena ilimitada”.

**Decisión:** conservar los dos escalones actuales, no bajar precio para buscar clientes a cualquier costo. $499 es una entrada defendible; $999 exige beneficios operativos adicionales y acompañamiento eficiente. Cadena equivale aproximadamente a $900 por sucursal al contratar tres. La tarifa de $799 adicional es un descuento por expansión; medir carga y soporte para confirmar que se sostiene.

Referencias actuales, sin afirmar equivalencia de funciones o impuestos: [Booksy México](https://booksy.com/biz/es-mx/precios) publica base $429 + $100 por empleado adicional con sus condiciones; [Fresha](https://www.fresha.com/es-MX/pricing) publica USD19.95 para independiente y USD14.95 por miembro reservable para equipo. Hay competencia accesible: ganar por caja/comisiones, uso cotidiano y atención, no solo por una landing elegante. Confirmar tratamiento fiscal al comparar ofertas.

**Consumos:** WhatsApp con créditos/cuota autorizada y presupuesto visible; CFDI como módulo opcional desde $149/mes más timbres, propuesta a validar con soporte y volumen. No vender “mensajes/timbres ilimitados”. Antes de ofrecer créditos fijar costo vigente, margen, impuestos, caducidad y política de devolución. El precio del add-on no está sumado al ingreso proyectado. Correo transaccional del sistema entra en el núcleo con límites de uso documentados.

**Implementación:** para los primeros diez, una sesión remota estándar de hasta 60 minutos para independiente como inversión de aprendizaje; medir su costo. Cadena, migración compleja, visita o capacitación extra: cotización previa, referencia inicial $1,499 para puesta en marcha de hasta tres sucursales. No prometer atención ilimitada de por vida. Una segunda sesión o corrección de errores del producto no debe confundirse con un cargo sorpresa.

**Promociones:** sin congelación vitalicia ni cupón permanente no costeado. Propuesta para primeros diez: precio contratado protegido durante 12 meses y términos explícitos; revisable al vencimiento con aviso. No usar el cupón FUNDADOR existente hasta reconciliar sus condiciones con la implementación. Anualidad solo después de validar renovación, devolución e impuestos; si se introduce, máximo dos meses de descuento como hipótesis, no un selector que cobre mensual.

La configuración actual de sandbox cobra $499/$999 de total, sin demostrar cálculo fiscal. La propuesta “más IVA” requiere cambios coordinados y comunicación clara: bajo el supuesto de 16%, el total sería $578.84/$1,158.84. Revisarlo con contador antes de emitir oferta o activar live; no incrementar cargos existentes silenciosamente.

## 8. Costos y viabilidad

El [modelo económico](COSTOS_Y_PRECIOS.md) contiene partidas, fuentes, fórmulas y sensibilidades. Se puede regenerar sin acceder a cuentas ni claves. Separamos dinero cobrado, ingreso sin IVA, proveedores, trabajo humano y reserva de riesgo.

Presupuesto inicial de tecnología: **$3,000–4,500 MXN/mes**; escenario central $3,500. Propuesta: frontend estático, API y worker, PostgreSQL administrado, Redis, staging, correo y reserva para respaldo/monitoreo/dominio. Facturapi se activa cuando se usa CFDI; los consumos se cobran aparte. No contratar todos los opcionales el primer día. Elegir región próxima y validar latencia de México; región y residencia de datos deben figurar en contratos.

Mantenimiento preventivo después del lanzamiento: hipótesis de 12–20 horas al mes; a $500–800/h, **$6,000–16,000** si se externaliza. Incluye parches, monitoreo, restauración periódica y correcciones pequeñas; nuevas integraciones o cambios importantes son desarrollo aparte. Soporte base modelado: veinte minutos/cliente/mes a $300/h, **$100 por cliente**. Registrar tiempo real: una hora por cliente triplica esa partida.

| Clientes | Ingreso sin IVA estimado | Resultado con mantenimiento y soporte valorizados |
| ---: | ---: | ---: |
| 10 | $6,990/mes | −$5,289/mes |
| 30 | $20,970/mes | $5,533/mes |
| 100 | $69,900/mes | $36,610/mes |

Hipótesis: 60% Esencial y 40% Pro, precios más IVA, cobranza completa, tarjetas nacionales, sin ingresos de add-ons/cadenas. A cien crecen mantenimiento e infraestructura. Resultado antes de ISR, marketing, contabilidad, sueldo del fundador y desarrollo inicial; no es utilidad neta.

Con diez, los proveedores y reserva dejarían aproximadamente **$2,911/mes antes de todo trabajo humano**. Si se valora ese trabajo, hay déficit. Si los diez pagan solo Esencial, el déficit valorizado es aproximadamente **$7,133/mes**. El equilibrio inicial está cerca de veinte clientes con mezcla 60/40 o treinta si todos son Esencial. La respuesta comercial es controlar soporte y aumentar clientes/valor, no anunciar que diez ya pagan un equipo completo.

Presupuesto orientativo de arranque: **$12,000–30,000** para dominio, primera plataforma, revisión legal/contable, hardware si falta y validación comercial. No incluye construir lo pendiente ni sueldo. No es una cotización. Los gastos e identidades reales se confirman antes de contratarlos.

No hay una factura automática de mantenimiento por conversar aquí. Tu contratación de Codex/IA y el tiempo propio siguen teniendo un costo. Este plan tampoco establece un servicio permanente de guardia: necesitamos responsable humano y cobertura de soporte para vender esa atención.

## 9. Captación de los primeros diez

El objetivo de diez es una meta, no evidencia de demanda. Crear una lista inicial de 30 negocios, entrevistar diez, validar al menos dos independientes y una cadena. La mezcla comercial depende de la disposición real a pagar, no de la tabla de costos.

Demo de diez minutos: problema del dueño → reserva → cobro mixto → comisión → corte → vista del dueño. Mostrar solo integraciones entregadas. Alta estándar: catálogo, personal, horario, comisión, equipo compatible y primera caja; explicar exportación, cancelación y soporte. Cualquier dato real se carga con autorización del comercio.

Durante 90 días medir semanalmente: contacto → demo → alta → primer corte → corte completo → pago → uso a 30/60 días. Metas iniciales de aprendizaje: primera venta durante onboarding; cinco días sin asistencia constante; conciliación del 100% del piloto; registrar motivos de rechazo/cancelación. No prometer conversión de 50% o NPS 9 sin evidencia.

Separar activación de pago. Un negocio de prueba no es MRR. Un cliente que paga y no registra ventas no es éxito de adopción. Definir MRR sin IVA/consumos únicos, bajas por cohorte, mora, minutos de soporte, costo por alta y costo de adquisición. CAC pagado debe recuperarse con margen de contribución en un plazo inicial objetivo ≤3 meses; reestimar con observaciones, no gasto publicitario agresivo al inicio.

Al tener diez clientes o 60 días de uso, revisar precio: mantener si conversión/retención y costo lo sostienen; probar $599 de entrada o $1,199 Pro solo con valor y aceptación demostrados; reducir fricción/onboarding antes de bajar la tarifa. Cualquier precio nuevo se experimenta con oferta transparente y respeta términos de clientes existentes.

## 10. Responsabilidades y mantenimiento

| Responsable | Trabajo |
| --- | --- |
| Codex en estas sesiones | Implementación, pruebas, revisión, documentación, preparación de despliegues y evidencia; avance conforme al backlog |
| Titular del negocio | Identidad legal/fiscal, cuenta bancaria, dominio, contratación de servicios, verificaciones/2FA, comercios piloto y soporte que se ofrezca |
| Contador / asesor legal | Tratamiento fiscal, CFDI del SaaS y emisores, contratos, privacidad y revisión de compromisos comerciales |
| Barberías piloto | Validar operación, hardware y permisos con responsables reales; autorizar datos y feedback |

Conectores a preparar: Stripe live, dominio/DNS, Resend, Meta/WhatsApp, Facturapi y hosting. Puedo guiar su configuración con el navegador autorizado; identidad, 2FA y certificados necesitan al titular. No pegar claves en el chat. No activar cargos reales ni comprar infraestructura solo para cerrar una historia sin alcance y costo concretos.

Rutina después de salida: monitoreo y conciliación de pagos; atención durante horario cubierto; revisión semanal de errores/cola; actualización mensual controlada; ensayo de restauración mensual al inicio; análisis de costo y soporte por cohorte; revisión trimestral de precio/capacidad. Incidente de datos/dinero requiere detener el flujo afectado, conservar evidencia, recuperar y comunicar según contrato.

El avance queda verificable en el backlog y las evidencias. Si un requisito externo se bloquea, se continúa con trabajo independiente; no se marca terminado ni se cobra una función que aún no opera.
