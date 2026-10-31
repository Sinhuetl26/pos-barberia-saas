# Hoy · brief visual de transformación

27/oct/2026. Propuestas visuales para elegir antes de implementar; no modifica la UI principal ni acredita avance funcional.

## Objetivo

Dueño de barbería, laptop y celular. Entender qué cita sigue y abrirla, consultar la agenda y cobrar. Ventas del día y pendientes conservan visibilidad secundaria. Mantener capacidades/permisos existentes y reducir texto/duplicación.

## Referencias inspeccionadas

- hoy-antes-desktop.png y hoy-antes-movil.png: captura actual de Inicio en el laboratorio ficticio. La cabecera/date-strip consumen espacio; la cita no lidera; la caja negra domina aun vacía; copy repetido.
- cobrar-identidad.png: referencia real de la dirección carbón/porcelana/naranja ya aprobada; no copiar la composición del ticket a Inicio.
- InicioView.tsx y OperationSummary: contrato existente de próximas citas, métricas, productos por reponer e ingresos horarios. No inventar análisis de rentabilidad, disponibilidad fiable o funcionalidades nuevas.

## Sistema de partida

Carbón #17191C, porcelana #FAFAF7, papel #FFFFFF, cuero #AD4E24, texto secundario #646B68, línea #DEDED8. Studio Text para UI; tratamiento condensado solo para marca existente. Tipografía de contenido14–16px; jerarquía por tamaño/espacio. Nada de azules heredados, gradientes, filas de KPI gigantes, tarjetas dentro de tarjetas o textos publicitarios.

## Direcciones a explorar

- Agenda al frente: jornada en un lienzo de agenda, próximas visitas como filas/timeline; caja compacta lateral. Protagonista: tiempo/orden del día.
- Siguiente cliente: una sola visita próxima sobre superficie carbón, siguientes visitas como lista calmada; venta diaria pequeña. Protagonista: persona y acción inmediata.
- Jornada de un vistazo: día organizado por profesionales con franjas de próximas atenciones; pendientes agrupados y ventas en pie compacto. Protagonista: coordinación del equipo.

Las direcciones cambian composición e interacción conservando la marca. Los mocks emplean datos ficticios de una mañana del martes27/octubre/2026; NO son cifras actuales del laboratorio ni capacidades implementadas. Imágenes1440×1024, cada dirección en una imagen independiente. Se elegirán por su orden de aparición real en el chat.

## Control de alcance

No cambiar InicioView ni builds todavía. No sembrar citas, cobrar, devolver, cerrar turnos o alterar precios. Laboratorio conserva UI14/UI12; capturas de solo lectura. La selección fija el objetivo visual del siguiente pase de implementación de Hoy; extender al resto requiere revisión de esa pantalla completa.
