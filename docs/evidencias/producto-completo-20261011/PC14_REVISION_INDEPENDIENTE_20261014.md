# PC-14 — revisión independiente del corte histórico, 14 de octubre de 2026

## Resultado

**5/5 PASS SQLite desechable y 5/5 PASS PostgreSQL aislado: 10 comprobaciones aprobadas.** No se modificó fuente de inteligencia/gastos, esquema, criterio esperado ni datos de la demo. El único cambio de soporte fue permitir explícitamente `qa_owner_intelligence_history.cjs` en la lista del runner PostgreSQL existente.

Comandos ejecutados:

- `node scripts/qa_owner_intelligence_history.cjs`
- `node scripts/qa_isolated_postgres.cjs qa_owner_intelligence_history.cjs`

El segundo creó su clúster/carpeta propios, generó cliente Prisma PostgreSQL separado y detuvo únicamente ese clúster al finalizar. No borró PID/lock ajeno ni alteró la base de presentación. No se usó navegador.

## Fuente y casos revisados

Fuente: `apps/api/src/services/owner-intelligence.service.ts`; comprobaciones: `scripts/qa_owner_intelligence_history.cjs`.

El fix reconstruye la clasificación de salidas en el corte del reporte, en lugar de consultar únicamente su clasificación presente:

1. Gasto de caja menor sin clasificación anterior al corte deja gastos clasificados en cero y utilidad estimada **null**, con motivo explícito.
2. Vincular ese gasto después del corte no borra retrospectivamente el aviso de evidencia insuficiente ni cambia las finanzas del reporte anterior; el movimiento original permanece −25, sin otra salida.
3. Clasificación que sí existía antes del corte incluye **25 una vez**, permite estimación −25 y conserva capacidad real cero como cero, con porcentajes null.
4. Corrección posterior de 25 a 30, con salida compensatoria −5, afecta el reporte posterior (**30**), pero no el corte anterior (**25**). Se conservan los dos movimientos y el historial original.
5. Caja de otra sucursal no invalida este reporte. Producto recién creado se presenta **SIN_HISTORIAL**, cobertura desconocida null, sin etiquetarlo como un fracaso. Rol barbero no accede al análisis administrativo.

La consulta de caja y vínculos de corrección está acotada a negocio/sucursal y a fechas anteriores al corte; la lista de gastos históricos excluye registros creados después de él. No se encontró P1 reproducible en este fix después de ambas corridas.

## Alcance del cierre

Revisión interna del **fix histórico PC-14 aprobada**. Los cinco casos no sustituyen el recorrido visual de inteligencia ni recertifican todas sus estadísticas, períodos, rankings o costos; esos resultados conservan su evidencia previa, incluida la secuencia integrada de PC-21. No se afirma utilidad fiscal ni operación en producción.
