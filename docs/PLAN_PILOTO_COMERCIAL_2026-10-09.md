# Plan de ataque: primeros clientes y piloto comercial

Fecha: 2026-10-09. Objetivo inmediato: preparar una demostración convincente y lograr 1–3 pilotos independientes con operación segura. Diez negocios pagando sigue siendo una meta posterior, no una previsión. Reorganización de historias aplicada por autorización de Sinhue: referencia `scrum/REORGANIZACION_COMERCIAL_2026-10-09.md`. Conserva precios, contratos y estados; no habilita cobros o compras.

## Punto de partida comprobado

ST-02, ST-03, ST-04, ST-05, ST-06 y ST-07 están Validadas. ST-01 conserva decisión fiscal pendiente; ST-08 requiere dominio y entrega real de correo; ST-09 requiere dispositivos e impresión física. El cierre técnico de Sprint 2 no equivale a producto listo para operación comercial. ST-41/42 siguen pendientes.

Referencia de aceptación: `docs/scrum/CIERRE_REVISION_ST01_09_2026-10-09.md`. La guía `GUIA_PILOTO_Y_VENTAS.md` es histórica y no debe usarse como oferta actual.

## Cliente inicial y propuesta

Empezar con independientes de una sucursal, dueño involucrado y hasta tres barberos para la propuesta Esencial. Si el equipo excede el límite, usar el plan compatible y explicarlo antes de la demo. Las cadenas conservan su roadmap y puertas de validación.

Problema inicial: dinero que no cuadra, cobros registrados tarde y comisiones difíciles de explicar. Propuesta: registrar el corte desde el celular, identificar quién cobró y quién conserva el efectivo, y cerrar caja con comisiones trazables. Mostrar solamente lo comprobado.

La inteligencia de inventario será una segunda capa: ST-41 conteos y movimientos, ST-42 consumo esperado y diferencias, ST-30 resumen accionable. Una diferencia de inventario es una señal a investigar; no prueba por sí sola robo o merma. No anunciar esas funciones como disponibles.

## Frente 1: preparar una demo que se entienda

- Preparar un guion de diez minutos con datos ficticios: dolor del dueño, corte/cobro móvil, aviso al dueño, entrega de efectivo, comisión, cierre y exportación.
- Preparar la parte de demostración de ST-27: mensaje comercial, objeciones, ficha de alcance y preguntas. La publicación y aceptación de ST-27 conservan sus dependencias.
- Delimitar una entrega previa del pulido ST-31: inicio del dueño, POS móvil, caja/comisiones y reservas. Revisar legibilidad, jerarquía, estados vacíos, errores y velocidad; cualquier rediseño se verifica contra los flujos ya aceptados.
- Tener un entorno ficticio recuperable y credenciales de demostración separadas. Verificar que abrir la demo no dependa de datos o cuentas de un cliente real.

Salida: otra persona puede entender el valor y seguir el recorrido; el equipo registra defectos y evidencia. Una demo no se convierte en validación de campo.

## Frente 2: validar compradores sin anuncios pagados

Meta de aprendizaje propuesta: lista de 20 negocios compatibles, diez conversaciones con dueños, cinco demostraciones y 1–3 candidatos a piloto. Son objetivos de actividad, no tasas de conversión previstas.

Preguntas: cómo cierran caja; quién cobra; cómo calculan comisiones; qué les causa diferencias; qué sistema usan; qué les impediría cambiar; qué equipo tienen. Registrar respuestas y rechazos antes de añadir funciones.

El equipo prepara guion, material y registro. Sinhue consigue conversaciones y presenta o acompaña la demo. No se envían mensajes a personas desde herramientas sin instrucciones explícitas. No prometer fecha, ingresos, ahorro cuantificado o integraciones no verificadas.

Registro por candidato: negocio, contacto autorizado, tamaño, problema, método actual, demo, objeción, siguiente paso y disposición a pagar. Evitar datos personales innecesarios.

## Frente 3: cerrar operación y cobranza

Trabajo técnico siguiente sin contratar servicios: ST-12 cola/scheduler durable; preparación de ST-10/11 en sandbox y de ST-13 despliegue reproducible. Seguir dependencias y trabajar una historia de implementación por responsable; preparar subtareas independientes sin declararlas aceptadas.

Antes de uso real: configuración de dominio/correo, acceso recuperable, ST-13 despliegue, ST-14 respaldo externo y restauración integrada, ST-15 identidad/privacidad/soporte y pruebas con dispositivos reales. Aprovechar impresoras prestadas; no exigir compra para preparar la demo. ST-09 permanece bloqueada hasta cubrir sus criterios físicos.

Antes de cobros reales: decisión fiscal ST-01, ciclo de licencia ST-10/11, ST-16 y comprobantes del SaaS, condiciones y total final visibles, soporte atendido y acta de alcance. Una prueba sandbox no valida un cargo live.

Refinamiento aplicado: ST-20 autoriza únicamente piloto pagado independiente, con ST-17 y capacidad ST-45 aprobados, más requisitos fiscales y operativos. ST-46 autoriza Cadena y conserva ST-18/ST-19. ST-32/33 se acotan a salida independiente; no certifican cadenas ni add-ons pendientes. No se cierra ninguna historia por reorganizarla.

No desplegar, comprar ni activar cobros como efecto de este plan. Antes de contratar se presenta servicio, capacidad medida, costo y propósito concretos.

## Frente 4: piloto acompañado y renovación

Primer alta: servicios, profesionales, horarios, precios, reglas de comisión, inventario básico y primera caja. Registrar duración y obstáculos del alta.

Durante el piloto medir días abiertos frente a días registrados, ventas registradas, cortes completos, diferencias explicadas, incidentes y minutos de soporte. Conciliar operaciones con el responsable del negocio; no confundir una caja con diferencia física con un error del sistema.

Antes de ampliar: cero defectos críticos abiertos en datos, permisos o dinero; cierre y recuperación comprobados; costos observados; comercio dispuesto a continuar. Revisar el primer periodo mensual y la primera renovación. Si no hay uso o pago, entrevistar y corregir la causa antes de ampliar inversión.

Un cliente gratuito no cuenta como ingreso recurrente. Un pago aislado tampoco demuestra retención. MRR se registra sin IVA ni cargos únicos; soporte y tiempo del fundador se contabilizan aunque no generen factura externa.

## Presupuesto y funciones posteriores

Usar `PRESUPUESTO_MINIMO_PILOTO.md` como hipótesis: 450 MXN mensuales de tecnología y 300 MXN anuales de dominio, sujeto a medición y cotización. Excluye comisiones, asesoría fiscal/legal, trabajo y suscripción de herramientas. No es costo garantizado ni orden de compra.

Mantener propuesta de 499 MXN base Esencial sin modificar el catálogo; tratamiento fiscal y total final pendientes. No rebajar por un rechazo aislado: averiguar si falla valor, facilidad de uso, confianza, capacidad o precio. No ofrecer descuento o precio vitalicio sin coste y términos.

WhatsApp automatizado, CFDI de las barberías, IA y cadenas se incorporan según evidencia de necesidad, aceptación y costo; no se desbloquean automáticamente al alcanzar cierto número de ventas. Los comprobantes y obligaciones propios del SaaS conservan prioridad antes de cobrar.

## Equipo y reporte

Producto: alcance, entrevistas y oferta. Frontend: entrega visual acotada. Backend/integraciones: operación y licencia. Infraestructura: despliegue/recuperación/costos. Calidad y dueño virtual: recorridos y aceptación simulada. Coordinador: dependencias, integración y reporte. Se activan especialistas según la tarea, dentro del límite de concurrencia; no implica ejecución permanente en segundo plano.

Sinhue recibe: entrega demostrable, evidencia, bloqueo externo, costo previsto y siguiente decisión. No se le devuelve una lista obligatoria de pruebas de software. Identidad fiscal, compras, acceso de cuentas y relación con clientes siguen necesitando al titular.

## Primer bloque de ejecución

1. Refinar el guion y ficha de oferta ST-27 con las capacidades actuales.
2. Especificar el pulido previo de ST-31 con capturas y criterios; no rediseñar toda la app de golpe.
3. Iniciar ST-12 como siguiente implementación independiente del bloqueo fiscal; preparar ST-10 en sandbox después de delimitar la decisión pendiente.
4. Preparar registro de candidatos y entrevista; Sinhue puede validar interés con la demo antes de contratar infraestructura.

Cada bloque cierra con evidencia y un reporte breve. Las fechas se estiman al acotar trabajo y observar capacidad; no hay promesa de ventas ni de completar todos los sprints antes de una fecha fija.
