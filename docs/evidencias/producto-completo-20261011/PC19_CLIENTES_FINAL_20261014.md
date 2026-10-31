# PC-19 — Cierre de Clientes y seguimiento

Fecha: 14 de octubre de 2026, America/Mexico_City. Fuente congelada al entregar al coordinador.

## Correcciones

- Perfil, alta y asignación de membresía usan `OperationDialog`: diálogo nativo modal, foco y Escape, retorno al control de origen, título accesible y altura adaptable. El cierre se bloquea mientras una operación está guardando; campos se bloquean durante envío y las notificaciones se muestran dentro del diálogo. Exportación/anonimización conservan sus llamadas y reglas anteriores, con estado ocupado para evitar cerrar durante la solicitud.
- La tabla obtiene `totalVisitas` del contrato real de GET `/clientes`; ese contador combina atenciones completadas y compras POS. La etiqueta es **Visitas y compras**, no número de citas. Cero se distingue de dato desconocido y no se inventa una categoría de cliente nuevo a partir de `_count.citas` inexistente.
- La referencia privada de una cita mantiene un único botón al revelar/ocultar, con `aria-expanded`. Durante la consulta usa `aria-disabled` y bloqueo de acción sin quitar el botón del recorrido de foco. La fotografía privada no se copia a otra visita ni se carga desde otro origen.
- Consultas de directorio y seguimiento presentan errores y reintentos, en vez de aparentar catálogos vacíos cuando falla la API. Cada consulta tiene un número de solicitud y contexto de negocio, cuenta, rol y sucursal; una respuesta anterior no reemplaza resultados actuales. Cambiar búsqueda/filtro o desmontar invalida las solicitudes anteriores.
- Seguimiento adapta los campos reales `{clientes, totalInactivos, diasFiltro}` y `diasSinVenir`/`fechaUltimaVisita`. No se fabrican mensajes ni se cambian ofertas, consentimiento, cobros o historial.

## Evidencia reproducible

Desde la raíz del repositorio:

```powershell
node scripts/test_client_directory_ui.cjs
node scripts/test_cash_client_ui_helpers.cjs
npx tsc --noEmit -p apps/web/tsconfig.json
```

Resultados ejecutados por este subagente:

- `test_client_directory_ui.cjs`: **6 flujos pasan**. Usa el código real de `ClientesView.tsx` transpilado, un ciclo controlado de hooks y promesas API demoradas. Comprueba fallo inicial visible sin falso vacío, reintento exitoso, búsqueda anterior más lenta ignorada, respuesta del negocio anterior ignorada, error de seguimiento con reintento y adaptación al contrato real de seguimiento.
- `test_cash_client_ui_helpers.cjs`: **12/12 pasan**, incluidos cinco casos de historial de cliente (cita/ticket vinculados, reservas/cancelaciones, compra sin corte, precio desconocido y empate de preferencia).
- TypeScript web: **pasa** en la ejecución final tras las correcciones.
- También se ejecutó una comprobación temporal del render real con tres clientes: contador pagado `3` pese a `_count.citas=99`, cero auténtico pese a `_count.citas=9` y dato desconocido mostrado `—` pese a `_count.citas=9`. Esta comprobación no se presenta como prueba de navegador.

## Límites

El harness controla hooks y llamadas API; no sustituye React DOM ni prueba foco, scroll, teclado o dimensiones físicas del navegador. No ejecuta red, bases, envíos WhatsApp ni operaciones reales. Las capturas y aceptación visual móvil/escritorio pertenecen al recorrido del coordinador. No se declara PC-19 completo únicamente con estos tests.
