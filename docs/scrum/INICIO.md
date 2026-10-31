# Control de trabajo de SYSTECH Studio

## Actualización vigente — 22/oct/2026

Sinhue autorizó usar Obsidian para organizar la documentación local. La nueva entrada es [Inicio del proyecto](../../INICIO.md), con [guía de uso](../obsidian/COMO_USAR.md) e índices por tema. Los documentos originales permanecen en sus rutas y pasan a ser la fuente principal de documentación. Notion conserva el tablero; sus estados no se sincronizan automáticamente y deben conciliarse antes de modificarlos. `TABLERO.md` y `ACTIVIDADES.md` siguen siendo vistas del respaldo, no fuentes editables independientes.

La sección siguiente registra la configuración histórica del 4/oct. Sus afirmaciones de Notion como fuente de documentación quedan reemplazadas por esta decisión; sus enlaces e historial se conservan.

## Recomendación

Notion gratuito como tablero principal, con una página privada del proyecto y respaldo del alcance/evidencia en este repositorio. Obsidian es alternativa si se prefiere trabajo local: esta carpeta contiene Markdown compatible, sin requerir plugins comunitarios ni Sync de pago.

Fuentes oficiales consultadas el 4 de octubre de 2026: [Notion](https://www.notion.com/pricing) ofrece plan gratuito con páginas/bloques ilimitados para uso individual; con dos o más miembros se aplican límites. Publica hasta diez invitados, archivos de hasta 5 MB e historial de siete días en ese plan. La conexión de una integración no debe confundirse con comprar Notion AI. [Obsidian](https://obsidian.md/pricing) permite uso personal y comercial gratuito; Sync y Publish son servicios opcionales de pago.

Estado actual: **Notion elegido por Sinhue, conexión confirmada y espacio privado creado y verificado**. [Abrir proyecto](https://app.notion.com/p/3f02035ac0d0815499d2f73304873c63?pvs=204). Contiene 40 actividades, ocho páginas de sprint, seis vistas y tablero del sprint en Inicio, costos, decisiones y bitácora. Los IDs y enlaces para retomar están en `NOTION_VINCULOS.json`. No se ha contratado un servicio ni configurado una ejecución diaria automática.

## Página principal propuesta: SYSTECH · Lanzamiento comercial

1. Inicio: objetivo de diez negocios, sprint actual y siguiente acción.
2. Actividades: una base de datos con las cuarenta historias existentes; cada tarjeta conserva ID y criterios de aceptación.
3. Sprints: objetivo, actividades elegidas, capacidad observada, demo y retrospectiva.
4. Bitácora: una entrada por sesión con avance comprobado y bloqueos.
5. Decisiones: precio/impuestos, soporte, proveedores y alcance.
6. Evidencias: enlace a prueba, captura, reporte o commit; nunca guardar claves, CSD ni datos de clientes.
7. Costos y lanzamiento: modelo económico y puertas go/no-go.

## Propiedades de cada actividad

| Propiedad | Uso |
| --- | --- |
| Nombre e ID | Identificador ST-01 a ST-40 que coincide con el repositorio |
| Estado | Pendiente, lista, en curso, en revisión, validada o bloqueada |
| Sprint | 1–8; expansión posterior se etiqueta Después del lanzamiento |
| Prioridad y complejidad | P0/P1/P2; S/M/L sin convertir automáticamente en horas |
| Responsable | Codex para implementación; Sinhue para identidad, proveedores y validación comercial; compartido si aplica |
| Dependencias | Historias que deben cumplirse antes |
| Criterios de aceptación | Lista comprobable dentro de la ficha |
| Evidencia y resultado | Prueba realizada, ubicación y fecha de validación |
| Bloqueo y responsable del bloqueo | Causa concreta y condición para continuar |
| Siguiente paso | Acción pequeña que permite retomar sin reconstruir toda la conversación |
| Fecha objetivo | Se acuerda al seleccionar alcance; no inferirla del número de sprint |

Vistas: tablero por estado; Sprint actual; Bloqueadas; P0 de lanzamiento; Pendientes de Sinhue; Validadas con evidencia. Limitar trabajo en curso a una actividad; máximo dos en revisión.

## Cómo trabajamos cada sesión

- Inicio, cinco minutos: leer bitácora, revisar impedimentos y elegir objetivo. La primera acción se mantiene visible.
- Trabajo: implementar un recorrido o una subtarea concreta; actualizar estado al iniciarla y registrar lo aprendido.
- Cierre, cinco minutos: evidencia, resultado, qué queda pendiente y acción siguiente. El diario registra resultados, no porcentajes inventados.
- Revisión semanal: demo, historias realmente validadas, costos/tiempos observados y retrospectiva; después elegir siguiente sprint.

Mensaje útil para retomar: “Continuemos SYSTECH con el sprint actual; revisa la bitácora, toma la siguiente actividad y actualiza el cierre con evidencia”. La continuidad se basa en esos registros. El calendario se define según disponibilidad real; no hay una guardia de soporte ni una sesión diaria automática implícita.

## Conservación y cambios

Notion es ahora la fuente principal de estados. El backlog JSON conserva el respaldo local al cierre de sesión. `TABLERO.md` y `ACTIVIDADES.md` son vistas regeneradas del respaldo; no editarlas como fuentes independientes. Sprint, bitácora y decisiones tienen sus enlaces externos en `NOTION_VINCULOS.json`.

Al retomar, verificar conexión y consultar el tablero existente antes de crear páginas. Obtener esquema actual y leer la vista de actividades para revisar cambios; no recrear los cuarenta ST-xx. Actualizar el respaldo al cierre de cada sesión. La copia local no implica sincronización automática bidireccional: una edición hecha fuera de sesión se revisa antes de sobrescribirla. Sin duplicar las mismas tarjetas en dos tableros activos.

La cuenta y destino del proyecto están identificados como Notion de Sinhue. Los cambios de estado tienen que conservar historial de lo que se hizo. Notion aloja planes y evidencia, sin publicar información comercial automáticamente.
