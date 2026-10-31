# Estado del rediseño UI/UX

Actualizado:30/oct/2026.

**100 % de avance ponderado:2000/2000. Veinte bloques verificados completos de20.** Es el cierre del plan local de UI/UX; no equivale a preparación comercial en producción. Regla y cálculo en [Progreso rápido](PROGRESO_RAPIDO.md) y [progreso-ui.json](progreso-ui.json).

Entrega vigente: [Cierre al100 %](../../output/ui-100-20261030/REVISION.md). Dirección visual: propuesta3 Jornada de un vistazo, elegida por Sinhue. Conserva contratos, precios y datos financieros.

Plan: [20 bloques originales](PLAN_REDISENO_UI_UX_INTEGRAL_2026-10-19.md). Los dependientes usan los entregables disponibles de componentes/nav; no declaran completas todas las historias de esas bases.

- **UI-01 — Verificado completo:** Mapa de superficies, rutas, roles, tareas y estados documentado. La matriz de autorización cubre184 rutas montadas y el inventario queda enlazado al cierre.
- **UI-02 — Verificado completo:** Referencia visual de los tres flujos. Dirección Jornada elegida por Sinhue; Hoy/Agenda/Cobrar contrastados, detalle de cita y ticket de reserva lleno; móvil del barbero comprobado. El mapa completo de UI01 sigue abierto.
- **UI-03 — Verificado completo:** Fundamentos compartidos, catálogo interno navegable, estados, foco, diálogos y consumidores migrados contrastados en las superficies acreditadas.
- **UI-04 — Verificado completo:** Navegación y permisos. Contenedor/nav comunes, menú móvil, Ctrl+K y contexto de sucursal. Pruebas de cinco roles, guardia de ticket y aislamiento API (19 casos/184 rutas) aprobadas. Funciones futuras reutilizan este contenedor.
- **UI-05 — Verificado completo:** Hoy y Mi día. Hoy del dueño y siguiente atención del barbero, carga/error/vacío, identidad/fecha y privacidad comprobados. Nuevo recorrido ficticio inicio→fin→ticket220→retorno, sin cobro; persistencia confirmada.
- **UI-06 — Verificado completo:** Agenda, disponibilidad y fila. Filtros, lista/calendario, detalle, retorno, fila/asignación y revisión de importe comprobados. Backend de reserva/reprogramación pasa20 casos, incluyendo cupo, ocupación y concurrencia.
- **UI-07 — Verificado completo:** Catálogo/ticket, aprobación, vencimiento, recuperación, guardia y concurrencia pasan17 escenarios aislados; el recorrido desde Mi día mantiene reserva/profesional/importe. Sin cobros en la demo persistente.
- **UI-08 — Verificado completo:** Turnos, entrega/custodia, devolución, cierre recuperable, comprobantes y separación de efectivo pasan21 escenarios de integridad y auxiliares de UI. Impresión física/PDF sigue fuera del cierre PC12.
- **UI-09 — Verificado completo:** Clientes e historial. Directorio adaptable, campos vacíos explícitos, búsqueda, ficha, historial, privacidad y membresía sin diálogos superpuestos. Reagendado conserva selecciones válidas y no reemplaza servicios/profesionales ausentes.
- **UI-10 — Verificado completo:** Equipo y comisiones. Perfiles/horarios separados de caja; origen, comisión, propina y estado visibles. Se corrigió y verificó el aislamiento de comisiones por sucursal; pagos conservan selección e importes revisados.
- **UI-11 — Verificado completo:** Catálogo e inventario. Puertas por tipo, conteos, insumos separados, alta y edición por tipo; las imágenes se comprimen, persisten y se reutilizan en POS y reservas. La edición no cambia existencias/unidad/naturaleza; movimientos, recetas y consumo quedan cubiertos por regresión.
- **UI-12 — Verificado completo:** Ventas, gastos e inteligencia separan ingreso, comisión, costo y falta de evidencia. El CSV respeta periodo/sucursal/profesional y excluye canceladas; pruebas históricas5/5 y alcance3/3 aprobadas.
- **UI-13 — Verificado completo:** Resumen, filtros y diez estados distinguen aceptación, entrega y lectura. El aviso de venta abre el historial y señala la venta exacta. No se enviaron mensajes.
- **UI-14 — Verificado completo:** Marca, paleta, secciones, galería, orden, textos y visibilidad persisten aislados;7 pruebas API y8 de marca aprobadas, con evidencia visual previa de escritorio y móvil.
- **UI-15 — Verificado completo:** Reserva, cupo, reprogramación, privacidad, recuperación y referencias pasan20 escenarios de integridad y11 de retención; los recorridos conservan selecciones y datos aislados.
- **UI-16 — Verificado completo:** Catálogo canónico, capacidades y puertas por plan pasan30 escenarios. Accesos ahora confirman cambios sensibles; seguridad pasa19, correo de onboarding17 e integraciones controladas25 escenarios, sin activar proveedores reales.
- **UI-17 — Verificado completo:** Login, alta y ayuda comparten lenguaje visual, textos reducidos, foco visible y errores de red accionables. Recorrido final comprobado en la compilación entregada.
- **UI-18 — Verificado completo:** Importación, auditoría y plataforma comparten el espacio visual y conservaron permisos, estados y recuperación. Importación pasa10 comprobaciones y auditoría9, con recorrido visual final.
- **UI-19 — Verificado completo:** Teclado, foco, móvil320/390, zoom200 %, movimiento reducido y consola se comprobaron. El archivo principal bajó de~941kB a310kB mediante carga por pantalla, sin dependencias nuevas ni desbordamiento horizontal.
- **UI-20 — Verificado completo:** Regresión y demo final. Fase3 pasa23/23 y el recorrido integral11/11 cubre dueño, barbero, cliente, reserva, cobro ficticio, caja, inventario, persistencia, reinicio y aislamiento.

Pruebas y evidencia están en el reporte vigente. No quedan campos parciales dentro de los20 bloques. Impresión física, servicios reales, dominio/despliegue, cumplimiento legal/fiscal y pilotos permanecen aparte y no se maquillan dentro de este100 %.

## Entregas históricas

Las notas siguientes son antecedentes; no restaurar sus builds o recuentos.

Entrega 2: [recorrido y evidencias](../../output/ui-recorrido-20261020/REVISION.md). 17 comprobaciones, TypeScript y build correctos; recorrido de dueño en escritorio/móvil sin efectuar cobros ni cierres.

Entrega 3: [Caja y entregas](../../output/caja-20261022/REVISION.md). 21 escenarios de integridad, 12 comprobaciones de importes y 12 auxiliares de interfaz. No se cerró automáticamente UI-08 ni se efectuaron entregas en la demo persistente.

En esa entrega histórica todavía no había bloques declarados verificados completos. No usarla para reabrir/cerrar automáticamente historias funcionales de los sprints anteriores. PC-12 conserva su pendiente documentado de comprobación de impresión.

Entrega de estructura: [Caja simple](../../output/caja-simple-20261022/REVISION.md). Turno primero, historial separado y entregas desplegables; 24 comprobaciones y revisión de dueño en escritorio/móvil. UI-08 continúa en curso por los estados y roles restantes.

Diseño aprobado de Caja: [carbón/naranja, mínimo texto](../../output/caja-carbon-20261022/REVISION.md). 30 comprobaciones, revisión visual de dueño en escritorio/móvil y menú secundario completo. Sin nuevas operaciones financieras. UI-08 continúa en curso por roles y estados restantes.

Planificación del 22/oct: [diseño maestro](DISENO_MAESTRO_SYSTECH_2026-10-22.md) cubre 29 áreas de diseño, sus opciones, estados y orden de ejecución. [Cobrar](DISENO_COBRAR_2026-10-22.md) tiene especificación completa del recorrido, pendiente de vistas detalladas, aprobación e implementación. Esto no cambia el estado de los 20 bloques ni acredita nuevas verificaciones funcionales. La dirección visual actual carbón/naranja reemplaza la propuesta azul del plan inicial; ese documento queda como antecedente.
