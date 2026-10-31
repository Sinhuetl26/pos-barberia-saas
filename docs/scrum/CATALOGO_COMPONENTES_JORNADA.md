# Catálogo de interfaz — dirección Jornada

Fuente de verdad: apps/web/src/styles/studio-identity.css; paleta y jerarquía elegidas en propuesta3. No se agrega biblioteca ni dependencia.

## Fundamentos

- Studio Text / Source Sans local: títulos48–68px escritorio,32–48 móvil; cuerpos15–18; auxiliares13–14. Logo Studio Display permanece.
- Acción principal cuero #ad4e24; tinta #171b1d; secundarios #646b68; líneas #deded8; porcelana #fafaf7; superficie blanca. Estados confirmada/pendiente/error llevan texto además del color.
- Acción única dominante por tarea. Controles44px mínimo, salvo enlaces secundarios con objetivo suficiente. Foco3px azul contrastante. Sin animaciones decorativas nuevas.
- Columnas abiertas para trabajo, filas de identidad para directorios; detalles privados y administrativos bajo desplegable explícito.

## Componentes y estados

- Encabezado: título, fecha/contexto y acción primaria; acciones menos frecuentes en details/summary. Nueva cita y Nueva venta conservan nombres de tarea.
- Botones studio-button / studio-button-secondary: normal, hover, focus-visible; disabled bloquea doble envío; busy cambia verbo a estado progresivo. Estado financiero pendiente usa Comprobar/Recuperar, nunca vuelve a cobrar a ciegas.
- Campos studio-input / select nativo: etiqueta visible y nombre accesible, error con role=alert, disabled cuando hay intención pendiente. Fechas y horarios usan zona de sucursal, nunca zona del navegador para calcular reservas.
- Pestañas de Agenda: botones aria-pressed y grupo con nombre; calendario/lista y pestañas principales tienen alcances distintos. Sin falsa semántica tab sin manejo de teclas.
- Chips: estado textual de la cita/mensaje, no etiqueta de negocio inventada. Datos ausentes se expresan como no disponible, no cero.
- Fila de cliente: un botón abre ficha por ID; contacto y métricas según permiso; en móvil se reordena sin esconder identidad.
- Fila de profesional: retrato real/fallback existente, horario y visibilidad pública; comisiones privadas desplegables, editar abre formulario común sin mezclar entrega de efectivo.
- Tabla de inventario: datos operativos en filas, vista móvil con etiquetas; puertas Servicios/Productos/Insumos conservan búsquedas y movimientos. Precio/margen no equivale a utilidad real.
- OperationState: vacío con siguiente paso, carga role=status y error/reintento; no muestra contenido de otra sucursal mientras cambia contexto.
- OperationDialog: dialog nativo compartido, foco inicial en título; Tab/Shift+Tab atrapados, Escape condicionado por busy y retorno al control origen. Excluye botones de details cerrados, incluye summary. No duplicar useBlocker de App.
- Paneles de detalle: cita y cliente bajo OperationDialog; privados y no compartidos en la landing. Lista y detalle no crean identidades nuevas.
- Resultado financiero: revisión → envío → confirmado o resultado incierto recuperable. Recibos58/80 tienen muestra HTML; prueba física pendiente separada.

## Evidencia y límites

Vista navegable de muestras: output/day-workspace-20261027/componentes.html (también servida solo en laboratorio). Usa estilos reales de build y OperationState/OperationDialog, no réplica estática de pantalla completa. Revisar normal/foco/deshabilitado/cargando/error y teclado antes de reutilizar.

Las vistas migradas comparten estos patrones. UI-03 queda en revisión: el catálogo no acredita por sí solo todos los estados de todas las pantallas.
