# PC-10 / PC-07 — Tarifa al asignar desde la fila

14 de octubre de 2026. Producto congelado por el subagente; coordinación final de navegador a cargo de root.

## Cambio implementado

ASIGNAR a un profesional explícito ahora consulta `getProfessionalCatalog` para la sucursal, el profesional elegido y el instante actual redondeado hacia el siguiente minuto. El barbero usa su propio identificador. Se validan todos los servicios del turno, una coincidencia por ID, precio real a centavos y duración total de hasta 480 minutos; no se sustituye un servicio faltante ni precio desconocido por cero.

La acción abre un `OperationDialog` de revisión con cada servicio, duración, precio y total. Consultar y mostrar la revisión no crea una cita ni ejecuta la asignación. Sólo confirmar envía `precioConfirmado`, el profesional, versión original del turno y UUID recuperable mediante el flujo existente. El pendiente incierto conserva su cuerpo y permite recuperar la misma asignación dentro del diálogo.

Una consulta anterior o de otro negocio/cuenta/rol/sucursal no reemplaza la vigente. Un plazo de 20 segundos deja error recuperable. Cambiar la versión/estado del turno bloquea confirmar una revisión antigua. El rechazo definitivo por tarifa cambiada exige actualizar y revisar el precio de nuevo.

ASIGNAR automáticamente conserva la herencia de catálogo existente. Si la API exige una tarifa profesional, el mensaje indica elegir profesional y revisar antes de confirmar, sin inventar candidatos ni confirmar otro precio. REASIGNAR mantiene la llamada original y el precio histórico existente; no vuelve a cotizarlo.

Único archivo de producto editado: `apps/web/src/components/ArrivalQueue.tsx`. No se modificaron backend, API web, esquema, AgendaView ni datos de demo.

## Evidencia reproducible

```powershell
node scripts/test_arrival_price_review.cjs
npx tsc --noEmit -p apps/web/tsconfig.json
```

Resultados ejecutados:

- TypeScript web: pasa al congelar producto.
- `test_arrival_price_review.cjs`: **4 grupos pasan** contra el componente y cálculo reales transpilados. Comprueba suma de servicios 280 + 20.50 = 300.50, duración 45, cero confirmado, faltantes, duplicados, servicio inactivo, importes inválidos y duración excesiva. El recorrido controlado selecciona Mateo, abre la revisión, verifica que todavía no hay asignación, recibe catálogo, revisa total y confirma: una llamada con importe 300.50, versión 2, profesional Mateo y UUID; la referencia se elimina tras resultado confirmado.

## Límites

El harness controla hooks y API, no usa navegador ni base. No afirma haber probado foco nativo, permisos de red, disponibilidad real o transacción del servidor. Las capturas y asignación de demo con Mateo a 280 pertenecen al coordinador. No se declara PC-10/PC-07 completo solamente con esta evidencia.
