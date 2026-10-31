# Estructura del proyecto

[Inicio](../../INICIO.md) · [Catálogo](CATALOGO.md)

## Trabajo habitual

- `apps/web`: interfaz del POS y reservas.
- `apps/api`: servidor y reglas de negocio.
- `packages/database`: esquema, cliente y migraciones de base de datos.
- `scripts`: arranque, comprobaciones y herramientas. Mantiene rutas y nombres actuales.
- `docs`: producto, arquitectura, comercial y documentación.
- `docs/scrum`: planes, decisiones, estados y continuidad.
- `docs/obsidian`: índices de lectura; no contiene copias de los originales.
- `docs/evidencias` y `output`: reportes, capturas y propuestas enlazadas. Mantienen su ubicación.
- `docs/archivo/inicial`: auditorías y requerimientos históricos trasladados de la raíz.
- `archivo`: material ajeno, paquete antiguo y carpetas vacías conservadas.

## Elementos que permanecen en la raíz

`INICIO.md` para navegar la documentación, `README.md` para desarrollo, `Abrir Demo Docker.cmd` para iniciar la demo y `design-qa.md` por la convención del flujo de diseño. Los manifiestos de paquetes, Dockerfiles y archivos Compose siguen en sus rutas originales.

`node_modules` contiene dependencias. `.tools` contiene herramientas y también recursos activos de la demo: no es una papelera. Los archivos `.env` son configuración privada; no copiarlos a notas.

Las 28 carpetas `.test-db-*` existentes conservan ruta y contenido porque hay scripts y manifiestos que dependen de ellas. Se marcaron ocultas en Windows para reducir ruido. Se pueden ver activando «Elementos ocultos» en el Explorador; su atributo original está registrado. Ocultarlas no es una protección de acceso.

## Qué se verificó al organizar

Los 13 movimientos conservaron hashes antes de cualquier ajuste documentado. Se corrigieron enlaces Markdown y el exportador de la tarea escolar pasó a rutas relativas a su carpeta. No se movieron bases de pruebas, volúmenes, fuentes del POS, dependencias ni recursos montados de Docker. La configuración de Obsidian se actualizó para excluir el material ajeno archivado.

Manifiesto y copias previas: `.tools/organizacion-20261022/`. Son una ayuda para deshacer esta organización; no sustituyen un respaldo del producto o de sus datos. Antes de revertir, comprobar que no se sobrescribirá trabajo posterior.

Resultado de comprobaciones: 13 movimientos, 94 archivos trasladados comprobados (salvo el cambio intencional de rutas del exportador escolar), 11 archivos operativos protegidos sin cambios y 320 enlaces locales de entrada/índices sin destinos rotos. Las 28 carpetas de pruebas mantienen ubicación y contenido. El exportador escolar pasa análisis de sintaxis, pero no se ejecutó Word.

La consulta posterior a web 5197 y API 3103 no pudo obtener respuesta desde este entorno. Por tanto, no se certificó el recorrido de la demo después de la organización. No se iniciaron, reiniciaron ni reconfiguraron servicios para realizar esta tarea.

Comprobación posterior al retomar Cobrar: Docker reportó ambos servicios saludables y el navegador integrado abrió el POS autenticado. No hubo que reiniciar servicios. Esto acredita acceso al panel, no una regresión funcional completa; [registro de esa sesión](../../output/cobrar-recorrido-20261022/REVISION.md).
