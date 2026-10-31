# Caja — entrega 3 del rediseño

22/oct/2026. Alcance local, datos ficticios. UI-08 sigue en curso.

## Implementado

- Custodia muestra el nombre actual del usuario, consultado por identificadores ya presentes en los registros autorizados y dentro del mismo tenant. Conserva el nombre histórico como respaldo si ya no existe el usuario. No cambia saldos ni registros históricos.
- «Revisar entrega» muestra persona e importe antes de confirmar. Cancelar conserva el importe. Confirmar comprueba contexto, operación pendiente, persona y saldo vigente; mantiene bloqueo de doble envío y recuperación financiera existentes.
- Historial en fichas etiquetadas en celular y tabla en escritorio. Comprobantes con área táctil mínima de 44 px. No se revela el esperado de un turno abierto. Fechas de apertura en zona horaria de sucursal.
- Custodia con nombres, importes y acciones alineados, azul operativo existente, sin dependencias nuevas.

## Evidencia

- TypeScript web/API y Vite correctos. Bundle `index-CVWViM3f.js`, CSS `index-Dp0uCf_h.css`. Persiste advertencia de tamaño del paquete.
- 12/12 pruebas nuevas de importe: exacto/parcial, vacío, cero, negativo, decimales excesivos, no finito, notación exponencial, exceso sobre saldo y saldo reducido/inválido.
- 12/12 auxiliares existentes de caja/clientes correctos.
- 21/21 escenarios de `test_cash_integrity.js` en base temporal aislada: permisos y privacidad de custodia por barbero/sucursal/tenant, nombre correcto, concurrencia/idempotencia, cierre ciego, comisiones y devoluciones. El script verificó que la base de trabajo no cambió. Primer intento bloqueado por conexión local del sandbox; ejecución autorizada posterior correcta.
- Dueño ficticio en navegador: nombres correctos; saldos anteriores $1110 y $200; dos cierres históricos. Revisar $125.50 y cancelar conserva el campo; se restauró el borrador original sin confirmar ninguna entrega.
- Móvil 390×844: ancho de contenido/página 385/385, sin desbordamiento horizontal; fichas y diálogo revisados. Escritorio 1366×900. Tres capturas PNG en esta carpeta.
- Docker estaba apagado: se inició y recompiló únicamente API, conservando volumen y puertos. API/web saludables. Snapshot web actualizado desde `.tools/cash-workspace-20261022`.

## Pendientes

Recorrido visual autenticado del barbero móvil y todos los estados de error/recuperación del diálogo. La regresión aislada cubre permisos y recuperación subyacente, sin sustituir la revisión visual completa. No hubo cobros, entregas o cierres en la demo persistente. Sin prueba física de impresión ni producción.

La instalación reproducible del contenedor reportó 11 vulnerabilidades de dependencias (2 moderadas, 9 altas): revisar antes de producción; no se actualizaron automáticamente dependencias durante este cambio.

Seguir con barbero móvil, estados de recuperación de Caja y unificación de componentes antiguos. No declarar UI-08 ni los veinte bloques completos por esta entrega.
