# Estado del rediseño UI/UX

Actualizado: 27/oct/2026.

Entrega vigente de Cobrar: [autorizaciones, recuperación y barbero](../../output/ui07-roles-20261022/REVISION.md), verificados en una base ficticia aislada; datos financieros de la demo principal conservados. [Progreso rápido: aproximadamente 20 % del rediseño](PROGRESO_RAPIDO.md), indicador por estado con regla explícita; no equivale a bloques terminados ni a preparación para producción.

Plan: [20 bloques](PLAN_REDISENO_UI_UX_INTEGRAL_2026-10-19.md). Evidencia: [primera entrega](../../output/ui-base-20261020/REVISION.md).

Se implementó una primera versión real de la referencia visual en Agenda, Cobrar y Hoy, con navegación compartida y accesos móviles. No se hizo una migración completa de los veinte bloques.

- **UI-01 — En curso:** inventario inicial y cinco capturas previas; falta cubrir las demás rutas/estados y roles autenticados.
- **UI-02 — En revisión:** referencia operativa implementada; falta contraste del día del barbero móvil y revisión integral con ticket lleno/errores.
- **UI-03 — En curso:** tokens y navegación comunes; [historial adaptable, errores/reintento y foco de diálogos](../../output/ui-historial-20261027/REVISION.md) implementados y comprobados con dueño/barbero, móvil320/390. [Movimientos de caja](../../output/ui-movimientos-20261027/REVISION.md) con revisión, confirmación y recuperación implementados y verificados en laboratorio. Resto de componentes/estados aún por migrar.
- **UI-04 — En revisión:** [navegación estable y Mi negocio](../../output/ui-navegacion-20261023/REVISION.md), mismo orden en Agenda/Cobrar/Caja, cinco roles comprobados en renderizado, grupo activo y teclado móvil/Ctrl+K recorridos. [Protección al navegar/cambiar sucursal](../../output/ui-ticket-protegido-20261023/REVISION.md) implementada y recorrida con dueño/barbero. Integración completa con UI-03 pendiente; no verificado completo.
- **UI-05 — En curso:** [Hoy, propuesta3 implementada](../../output/hoy-daybook-20261027/REVISION.md): columnas por profesional, cita concreta con fecha, resumen inferior y móvil320/390. Carga/error/reintento, cambio de sucursal y permisos del resumen verificados. Falta Mi día del barbero y conciliación integral original; no completo.
- **UI-06 — En curso:** resumen/acciones compactos, detalle con contexto de profesional/fecha/sucursal e importe; preparación/retorno cita→ticket verificados en copia ficticia y móvil, sin cobrar. Resto de agenda/fila pendiente.
- **UI-07 — En revisión:** composición, ajustes, métodos y confirmación de la entrega previa; ahora autorización pendiente/rechazada/aprobada, invalidación al cambiar método, cobro autenticado del barbero y recuperación tras recarga comprobados en laboratorio aislado. Tres consultas conservan el mismo folio; dos ventas ficticias únicas, sin duplicados. Permisos de otro barbero y autoaprobación denegados. [Evidencia](../../output/ui07-roles-20261022/REVISION.md). [Vencimiento automático y retorno a la cita](../../output/ui-navegacion-20261023/REVISION.md) comprobados en laboratorio. [Salida con ticket protegido](../../output/ui-ticket-protegido-20261023/REVISION.md) comprobada; falta conciliación integral UI-03/UI-06 y resto de estados; no verificado completo.
- **UI-08 — En revisión:** [barbero móvil y recuperación de entregas](../../output/ui08-barbero-20261023/REVISION.md). Mi efectivo primero, perfil/comisiones separados; consulta fallida con reintento y bloqueo de recepción; entrega incierta recuperable desde diálogo. Dos entregas ficticias compensadas sin duplicados, permisos API y cancelación de revisión/cierre comprobados. [Devolución recuperable y cierre confirmado](../../output/ui-devolucion-20261023/REVISION.md) comprobados: una devolución ficticia sin duplicado, cierre150/diferencia0 y comprobante HTML200. [Devolución parcial de productos y cierre recuperable](../../output/ui-caja-parcial-20261027/REVISION.md) comprobados: stock10→8→9, devolución100, cierre100/diferencia0 sin duplicados y HTML de comprobante visible. Falta ventana de impresión/PDF/papel y conciliación visual integral UI-03; no verificado completo.
- **UI-09 a UI-20 — Pendientes.**

Entrega 2: [recorrido y evidencias](../../output/ui-recorrido-20261020/REVISION.md). 17 comprobaciones, TypeScript y build correctos; recorrido de dueño en escritorio/móvil sin efectuar cobros ni cierres.

Entrega 3: [Caja y entregas](../../output/caja-20261022/REVISION.md). 21 escenarios de integridad, 12 comprobaciones de importes y 12 auxiliares de interfaz. No se cerró automáticamente UI-08 ni se efectuaron entregas en la demo persistente.

No hay bloques de este plan declarados verificados completos. No usar este estado para reabrir/cerrar automáticamente historias funcionales de los sprints anteriores. PC-12 conserva su pendiente documentado de comprobación de impresión.

Entrega de estructura: [Caja simple](../../output/caja-simple-20261022/REVISION.md). Turno primero, historial separado y entregas desplegables; 24 comprobaciones y revisión de dueño en escritorio/móvil. UI-08 continúa en curso por los estados y roles restantes.

Diseño aprobado de Caja: [carbón/naranja, mínimo texto](../../output/caja-carbon-20261022/REVISION.md). 30 comprobaciones, revisión visual de dueño en escritorio/móvil y menú secundario completo. Sin nuevas operaciones financieras. UI-08 continúa en curso por roles y estados restantes.

Planificación del 22/oct: [diseño maestro](DISENO_MAESTRO_SYSTECH_2026-10-22.md) cubre 29 áreas de diseño, sus opciones, estados y orden de ejecución. [Cobrar](DISENO_COBRAR_2026-10-22.md) tiene especificación completa del recorrido, pendiente de vistas detalladas, aprobación e implementación. Esto no cambia el estado de los 20 bloques ni acredita nuevas verificaciones funcionales. La dirección visual actual carbón/naranja reemplaza la propuesta azul del plan inicial; ese documento queda como antecedente.
