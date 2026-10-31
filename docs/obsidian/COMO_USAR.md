# Abrir esta documentación en Obsidian

## Primera vez

1. Abrir Obsidian. Si no está instalado, obtenerlo desde su [sitio oficial](https://obsidian.md/download).
2. Elegir «Abrir carpeta como bóveda» / «Open folder as vault».
3. Seleccionar la carpeta **POS Barberia** completa: `C:\Users\Sinhue\Desktop\POS Barberia`.
4. Abrir la nota [INICIO](../../INICIO.md). Puede fijarse para volver a ella rápidamente.

Se usa la raíz del proyecto porque los documentos enlazan capturas dentro de `output` y evidencias dentro de `docs`. No elegir solo `docs/obsidian`: esa carpeta contiene índices, no una copia completa del proyecto.

## Qué quedó preparado

Portada, siete índices por tema, catálogo de documentos y enlaces a fuentes existentes. La configuración utiliza enlaces Markdown relativos y actualización de enlaces al renombrar desde Obsidian. Los nuevos adjuntos se destinan a `docs/adjuntos`; las evidencias anteriores conservan su ubicación.

No se instalaron plugins comunitarios. Las carpetas de dependencias, herramientas temporales, pruebas de base de datos y fuentes de la aplicación están excluidas de búsquedas y grafo mediante la configuración de Obsidian. Esa exclusión reduce ruido: no elimina archivos ni es una barrera de seguridad. No se garantiza que evite todo trabajo interno de indexación.

## Encontrar y relacionar información

Abrir [Inicio](../../INICIO.md), elegir un tema y seguir los enlaces. En cada nota, el panel de enlaces entrantes permite localizar notas que la citan. La vista de grafo ayuda a explorar relaciones, pero los índices son el camino principal de lectura.

Conservar enlaces Markdown normales, compatibles con el repositorio. Ejemplo, dentro de una nota en `docs/obsidian`: `[Cobrar](../scrum/DISENO_COBRAR_2026-10-22.md)`. Para una captura, enlazar o incrustar con `![Caja](../../output/caja-carbon-20261022/escritorio.png)`.

Renombrar o mover desde Obsidian permite que actualice enlaces internos conocidos. Aun así, los scripts y aplicaciones externos pueden depender de una ruta: no mover archivos fuente, evidencias o notas históricas sin revisar referencias. Los movimientos realizados fuera de Obsidian necesitan revisar enlaces.

## Mantener una sola versión

- Editar el documento original; los índices solo lo enlazan.
- Actualizar estado y continuación al cerrar una sesión; enlazar pruebas concretas.
- Registrar decisiones nuevas con fecha, motivo y documento que reemplazan. Conservar las anteriores como historial.
- Mantener Notion como tablero opcional. Conciliar su estado antes de sobrescribir; no existe sincronización bidireccional configurada.
- Añadir las notas nuevas al índice temático y al catálogo. El catálogo es una foto del 22/oct/2026, no un listado automático permanente.

Los archivos siguen siendo legibles sin Obsidian. Git puede registrar los archivos que se añadan, pero esta preparación no hizo un commit, una copia de seguridad ni una sincronización. Esas acciones son independientes.

[Volver al inicio](../../INICIO.md).
