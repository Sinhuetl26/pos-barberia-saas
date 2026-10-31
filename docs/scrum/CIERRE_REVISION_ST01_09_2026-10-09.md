# Acta de cierre de revisión ST-01 a ST-09 · 2026-10-09

Sinhue delegó revisión funcional, pruebas y correcciones al equipo y solicitó marcar completados. El coordinador contrastó cada criterio con la Definition of Done, auditoría de backend, QA actual, compilación y recorridos visuales. No se requiere otro checklist manual de Sinhue. Las decisiones fiscales, servicios externos y hardware conservan sus requisitos.

## Resultado por historia

| Historia | Estado actual | Fundamento / condición pendiente |
| --- | --- | --- |
| ST-01 catálogo/licencias | Bloqueada | Catálogo/capacidad y separación de ambientes aprobados; tratamiento fiscal definitivo sigue PENDIENTE (DEC-04). Preferencia más IVA no es evidencia de revisión fiscal. |
| ST-02 permisos/aislamiento | Validada | 147 rutas actuales, 19 escenarios generales y dirigidas de inventario/compras/CSV por motor; cinco roles, dos negocios/cuatro sucursales; lecturas, escrituras, archivos, públicos y denegados sin cambios. |
| ST-03 cuentas/sesiones | Validada | 19 escenarios por motor: expiración/consumo único, límites, invitación y revocación. Auditoría renovada: 0 avisos producción y 0 críticos; 9 avisos desarrollo documentados con mitigaciones. Correo real pertenece a ST-08. |
| ST-04 PostgreSQL/migraciones | Validada | 13 comprobaciones vigentes de migración/recuperación/restore y regresión completa; instalación limpia y actualización de snapshot sintético anonimizado. Copia operativa anonimizada histórica conserva su fecha; no se afirma nueva migración operativa. |
| ST-05 venta/stock/folio | Validada | 17 casos por motor, dos procesos API, idempotencia/última unidad/folios/centavos/rollback. Seis adicionales de recepción concurrente por motor protegen stock compartido. |
| ST-06 caja/devolución/comisión | Validada | 21 casos por motor y recorrido barbero/dueño; CSV corregido y conciliado con 14 columnas, total30.03/devuelto10.01/neto20.02 y cobrador histórico. Últimos ajustes UI revisados visualmente con persistencia independiente. |
| ST-07 reservas | Validada | 20 casos por motor, concurrencia/horarios/enlace privado/cita→venta/NO_SHOW. Reprogramación y cancelación observadas sin recargar la agenda. |
| ST-08 correo/onboarding | Bloqueada | Alta limpia y estados honestos probados; falta dominio/remitente y SPF/DKIM/DMARC, entrega, rebote y supresión reales. Desbloquea la disponibilidad del dominio/proveedor y prueba autorizada, a cargo del equipo. |
| ST-09 usabilidad/tickets | Bloqueada | Compilación y recorridos emulados comprobados; dispositivos reales e impresoras físicas58/80mm pendientes. Se puede usar equipo prestado/de piloto; no se exige compra inmediata. |

## Evidencia vigente y correcciones

- **SQLite y PostgreSQL: 13/13 suites, 274 comprobaciones generales +12 dirigidas =286 por motor.** Las 13 comprobaciones de migración/recuperación/restore PostgreSQL se contabilizan aparte, no como suites adicionales.
- Recepción de compra única bajo concurrencia, cancelación y rollback: `test_inventory_receipt_integrity.js`, 6 casos por motor. Adaptación PG usa URL/cliente aislados y conserva SQLite por defecto.
- Permisos y conciliación CSV: `test_inventory_permissions_csv.js`, 6 casos por motor. Prueba comillas, saltos de línea y texto que Excel interpretaría como fórmula; ningún denegado altera datos.
- CSV en `apps/api/src/routes/reportes.routes.ts` emite devolución, total neto y cobrador en las columnas anunciadas, usando Decimal para el neto.
- API y web TypeScript aprobados; Vite producción aprobado (1298 módulos). Warning JS603.20kB conserva optimización ST-31.
- Auditoría npm real del9/oct: producción0, total9 (7altos/2moderados), críticos0. Docker retira herramientas dev con guardas de runtime; dry-run aprobó, imagen no ejecutada. Despliegue/imagen mantienen ST-13.
- Revisión visual adicional: entrega20 de saldo50 cambia campo a30. Turno ficticio fondo0/conteo19 contra20 muestra diferencia−1 en ámbar; captura y DOM observados. Una venta200/una comisión80 conservadas; segundo turno sin nueva venta. `DV_VALIDACION_FINAL_2026-10-09.json`, capturas15/16 inspeccionadas. La evidencia anterior de un turno no se sobrescribe.

Reportes de apoyo: `QA_VALIDACION_ST01_09_2026-10-09.md`, `QA_ADICIONALES_POSTGRES_2026-10-09.json`, `POSTGRES_RESULTADOS_ACTUALES.json`, `AUDITORIA_CIERRE_ST01_07_2026-10-09.md`, `AUDITORIA_CIERRE_ST09_2026-10-09.md`, `ST03_SEGURIDAD_CIERRE_2026-10-09.md`, `DV_CIERRE_2026-10-09.md`. Los JSON estándar ST05–08 contienen fechas fijas antiguas: el reporte QA registra su ejecución real del9/oct.

## Conservación, oferta y continuidad

Base operativa SHA-256 antes/después: B5AEBC3B7F87E5EEE7E4B9372F5795FF05A237064932D23EFC2EA609E9AC9E69. Sin modificaciones operativas, cargos, compras, correos externos, despliegue, commit o push. PostgreSQL de ensayo detenido; cliente/proveedor global sigue SQLite.

Notion es la fuente principal: seis Validada, tres Bloqueada, resto del backlog pendiente; respaldo local actualizado desde los estados verificados. Este acta no declara venta general ni pagos bancarios, CFDI, offline o hardware certificados. Restore comprobó fixture histórico poblado; no certifica RPO/RTO ni restauración integrada de los nuevos datos de caja/correo, alcance de ST-14.

Próximo desarrollo candidato: ST-10 ciclo de licencia en sandbox. Su dependencia ST-01 conserva pendiente fiscal; se puede preparar su desglose sin activar cobro real. ST-41/42 no se cierran por haber corregido recepciones: conteos y consumo de insumos continúan pendientes.
