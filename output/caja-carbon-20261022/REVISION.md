# Caja carbón — diseño aprobado implementado

22/oct/2026. Fuente: versión refinada carbón/naranja de escritorio `exec-d6b194d1-6360-4863-8cfe-17d68380675b.png` y móvil `exec-34b6837e-4353-496c-8aa1-260b90a3d47b.png`. Instrucción adicional: mínimo texto visible.

## Implementado

- Panel de turno carbón con material real generado y borde naranja; superficie blanca para las entregas. Tipografía sans legible y menos texto que las propuestas.
- Tu turno, estado y una acción: abrir o contar/cerrar, según datos reales. Fondo y fecha de apertura únicamente cuando existe turno.
- Entregas compactas con nombre, importe y flecha accesible; una se despliega a la vez. Las confirmaciones y los avisos financieros se conservan.
- Ver cierres separado; volver al turno mediante un único enlace. Último cierre secundario en escritorio y omitido del primer móvil.
- Menú de Caja reducido a tareas frecuentes; demás accesos bajo Más, con los mismos permisos. Hoy usa icono de casa. En móvil Más indica la ruta de Caja para el dueño; no se selecciona Hoy incorrectamente.
- Material optimizado a WebP, 176682 bytes; original generado conservado fuera del directorio público. Sin dependencias nuevas ni cambios de API.

## Verificación

- TypeScript web y Vite correctos. JS `index-CqiP32oE.js`, CSS `index-CTPV4--z.css`, compilados en `.tools/cash-carbon-20261022` y copiados al snapshot local. Permanece advertencia anterior por tamaño del paquete JS.
- 6 comprobaciones de navegación y visibilidad por rol, incluida agrupación de Caja y selección móvil correcta; 12 de importes y 12 auxiliares de caja/clientes. Total 30. Estas pruebas de menú no sustituyen autorización del servidor.
- Navegador con dueño ficticio: el turno ya estaba abierto al iniciar esta revisión (22/oct 08:22, fondo $1000 y 7 avisos de ventas). Se conservó. Entrega de Alex por $125.50 revisada y cancelada; campo conservado y restaurado a $200, sin confirmar recepción.
- Más despliega inventario, clientes, reportes, configuración y demás accesos en escritorio y móvil. Ver cierres conserva turno abierto sin revelar sus cifras esperadas y los cierres previos. Contar y cerrar abre la revisión ciega de pendientes; se cerró la ventana sin avanzar al conteo ni ejecutar cierre.
- Escritorio 1440×1024, móvil 390×844 y 320×740. Ancho de página/contenido 385/385 y 315/315, sin desbordamiento. Móvil selecciona Más como ubicación actual. Capturas escritorio/móvil y revisión de entrega en esta carpeta.
- No se generaron cobros, entregas, aperturas ni cierres en esta ejecución. No se modificaron precios, proveedores o datos históricos.

## QA visual

Se inspeccionaron juntos la referencia de escritorio y la captura real, además del móvil. Se preserva composición carbón/blanco, borde material, naranja, jerarquía y acción principal. Referencia 1487×1058 frente a captura 1440×1024: comparación de composición a escala visual comparable, sin afirmar igualdad de píxeles. La referencia mostraba caja cerrada; la demo ya tenía turno abierto. Se respetó su estado real y se adaptó la acción; no se cerró un turno para reproducir una imagen.

Adaptaciones por instrucción: sin párrafo de ayuda permanente, sin avatares decorativos repetidos, componentes más compactos, avisos de ventas y seguridad existentes preservados. Las ayudas siguen accesibles y aparecen cuando hacen falta. Tipos medidos: título de turno 36 px, estado 17 px, nombres 16 px e importes 18 px en escritorio.

Sin P0/P1/P2 visuales pendientes en el alcance revisado. P3: otros modales y vistas del producto conservan composiciones anteriores. El estado cerrado y los demás roles no tuvieron recorrido completo autenticado en esta ejecución; no se declara toda la aplicación verificada.

final result: passed

## Continuación

Conservar esta referencia y componentes; seguir con roles/estados restantes de Caja, recuperación y después otras vistas del plan. No marcar UI-08 ni los veinte bloques completos por este cambio. Impresión física y conexiones de producción siguen fuera de esta entrega.
