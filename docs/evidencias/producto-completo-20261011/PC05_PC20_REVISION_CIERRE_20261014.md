# PC-05 / PC-20 — revisión de cierre, 14 de octubre de 2026

## PC-05 — diferencias de insumos

Plan original: fórmula de saldo esperado, comparación física con método/tolerancia explícitos, frascos abiertos y datos faltantes; no diagnosticar robo ni responsabilidad individual. La medición física y el piloto son externos, separados de la aceptación local.

**Ejecutado:** `node scripts/qa_product_supplies.cjs`, **11/11 PASS SQLite desechable**. Cubre el ejemplo original 500 ML − 60 × 5 ML = 200 ML, conteo 150 ML, diferencia absoluta 50 ML y ajuste compensatorio −50. Tolerancia 49 marca fuera; tolerancia 50 incluye el límite. Histórico insuficiente conserva saldo esperado null; lectura de conciliación no modifica stock. Completar/cobrar no descuenta dos veces, corrección conserva consumo/costo original y compensa una vez, permisos separan barbero/gerente/sucursal/negocio, fallo de insumo posterior revierte todos los efectos.

Fuente revisada sin modificar: `inventory-reconciliation.service.ts`, `service-consumption.service.ts`, `ConsumptionReview.tsx`. La UI distingue tolerancia no elegida, saldo actual y referencia del último conteo; advierte que frascos abiertos deben medirse y que una diferencia no demuestra pérdida ni culpabilidad. Conserva historial y recuperación de corrección.

**Resultado interno PC-05:** aprobado a nivel de cálculo/transacción y revisión de fuente. No se realizaron mediciones físicas ni se simularon. El coordinador conserva la aceptación GUI: visualizar fórmula/evidencia, cambiar tolerancia 49/50, dato insuficiente, comparar conteo histórico con movimientos nuevos y abrir/cancelar corrección en móvil/teclado; si confirma una corrección, debe usar escenario ficticio nuevo y documentar motivo y compensación.

## PC-20 — hallazgo corregido con autorización del coordinador

La auditoría estructurada inicialmente omitía `GASTO_REGISTRADO`, `GASTO_CORREGIDO` y eventos `CITA_*` de su allowlist, aunque los productores sí los persistían. Por ello no aparecían en el historial consultable del dueño y no satisfacían el alcance original de gastos/cambios de cita.

El coordinador autorizó el fix mínimo en **`apps/api/src/services/operation-audit.service.ts` exclusivamente**:

- Añade eventos explícitos de gasto/corrección, confirmación/inicio/final/cancelación/ausencia/reprogramación de cita, importación y liquidación de comisiones. No habilita por comodín acciones desconocidas, errores de autorización ni eventos fallidos.
- Proyecta solo campos primitivos permitidos: importes/categoría/método/concepto, solicitante/aprobador y referencias gasto/consumo; corrección de gasto muestra importe y otros campos permitidos anteriores/actuales, conservando el original.
- Citas muestran referencia y estados/horarios anterior/nuevo. Productores históricos de cita guardaban solo su ID; se resuelve sucursal mediante cita del mismo tenant con una consulta acotada a la página. Una referencia a cita extranjera nunca se atribuye a esta sucursal.
- Mantiene DTO sin JSON bruto, hashes, credenciales, fotos privadas o snapshots arbitrarios. Registros sin sucursal identificable siguen visibles solo en Todas las sucursales; no se inventa su alcance.
- Conserva filtros de período civil, acceso exclusivo del dueño, cursor validado y paginado por escaneo limitado.

No se cambiaron productores, esquema, saldos, registros originales ni API/UI ajenas al ownership. El arreglo no escribe al leer auditoría.

## Pruebas de PC-20

- Compilación API actual: `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json`: **PASS**.
- `node scripts/qa_operation_audit.cjs`: **8/8 PASS SQLite desechable**.
- `node scripts/qa_isolated_postgres.cjs qa_operation_audit.cjs`: **8/8 PASS PostgreSQL aislado**; clúster propio detenido al terminar, sin detener procesos preexistentes.
- `git diff --check`: sin errores en servicio y suite.

Las seis comprobaciones anteriores se conservan: dueño/anónimo/staff; inicio/final de día local; DTO seguro y texto legacy oculto; cursores/fechas/zona/acción inválidos; paginación sin perder/duplicar eventos de sucursal; nombres heredados de Object rechazados.

Se agregan dos recorridos de API **con productores reales**, sin simular éxito mediante logs manuales:

1. Alta de gasto y corrección, cada uno repetido: exactamente un evento de cada hecho, actor/motivo/referencia correctos, importe anterior 25 y actual 30. Corrección obsoleta devuelve 409 y no crea evento completado. Un log adicional de prueba inyecta fotos/secretos anidados para demostrar que no se proyectan.
2. Confirmación y reprogramación de cita, cada una repetida: exactamente un evento, valores anterior/nuevo y filtro de sucursal correctos. Transición inválida devuelve 409 sin evento falso. Referencia de otra empresa no se resuelve como cita de esta sucursal.

**Resultado interno PC-20:** gap detectado y corregido; 16 comprobaciones de auditoría aprobadas entre ambos motores. Fuente congelada SHA256 `495BDBD2F5F6A764F506341D31D0CC556F7D4498F20964A30BABE3F516FEA3BC`.

## Lo que este reporte no afirma

No hubo navegador ni cambios sobre fixtures principales de presentación. La aceptación visual de PC-20 requiere que root muestre los nuevos eventos/detalles y filtros en el build/API reiniciados actuales, móvil/teclado/pantalla baja. La auditoría de una corrección debe conservar visible el evento original, y no presentar como nuevos los reintentos ya recuperados. Este reporte no sustituye ese recorrido ni marca historias del plan automáticamente.

No hay producción, conexiones, contratación, cargos, mensajes externos o certificación física/fiscal derivados de estas pruebas. El cierre local de PC-05 no requiere inventar una prueba física: ese pendiente sigue identificado por separado.

## Ampliación final PC-20 — datos legibles de corte de caja

La revisión GUI del coordinador detectó que un evento histórico CORTE_CAJA guardaba corteId y resumen plano, sin sucursal explícita, y aparecía como Sucursal no registrada. Se corrigió dentro del alcance autorizado:

- `operation-audit.service.ts` resuelve sucursal de corteId mediante `CorteCaja` **dentro del mismo tenant**, con consulta limitada a IDs de la página. No obtiene datos financieros de un corte ajeno ni lee el resumen actual para sustituir el auditado.
- Proyecta únicamente números finitos del snapshot plano: fondo, ventas y métodos, propinas, ingresos, entregas, efectivo cobrado en caja, retiros/gastos, esperado, contado y diferencia. Cero y déficit negativo se conservan. Objetos anidados, fotos y secretos quedan fuera.
- `routes/cortes.routes.ts` añade sucursalId y motivo de notasCierre a eventos nuevos. No cambia idempotencia, cálculo de cierre, hash, preview o recuperación; un cierre repetido conserva un solo evento. No se reescriben logs ni datos antiguos para mostrar éxito.

Compilación API **PASS**. Suite reforzada ahora **9/9 SQLite y 9/9 PostgreSQL aislado, 18 comprobaciones**; estos totales sustituyen los 8/8 anteriores para la fuente final. El clúster de QA se detuvo al terminar. `git diff --check` sin errores.

Caso nuevo: abrir/cerrar en fixture con fondo 100 y conteo 95, dos intentos, un evento y motivo correcto, diferencia −5 y métodos en cero; después alterar únicamente resumenJson de la fixture demuestra que la auditoría conserva su snapshot de 95. Log histórico sin sucursal con contado 675 resuelve la sucursal por su corte y conserva 675, ignorando resumen anidado 999 con secretos. Una referencia a corte extranjero no se atribuye a sucursal propia y no revela su sucursal. Son datos desechables: no se volvió a cerrar A-000003/675 de presentación.

Fuente final congelada:

- `operation-audit.service.ts`: SHA256 `3755DADEEBFBF1C3DE56F328EDCE5FF0F991CA8CFDB5F3040EA457707A9DC2B4`.
- `routes/cortes.routes.ts`: SHA256 `5360BC4453D01DD961A1A2D258B6A63994163AFD094C484A4B364254AFCF2DCC`.

El coordinador conserva reinicio de API y aceptación GUI/formatter de moneda y estados. Esta ampliación no tomó navegador ni operó la demo.
