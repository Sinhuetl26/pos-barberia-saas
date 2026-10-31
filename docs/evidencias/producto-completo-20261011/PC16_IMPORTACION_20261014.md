# PC-16 — Importación local y recuperación

## Implementación

`DataImportView` acepta `branch: Sucursal | null`. Catálogo y clientes se cargan mediante archivo CSV UTF-8 (200 filas, 150 KB). La plantilla contiene únicamente encabezados. La vista muestra datos normalizados y errores por fila; ninguna fila se importa si el lote presenta errores. No sobrescribe registros, precios o historial existentes.

La confirmación conserva archivo, hash y UUID en `sessionStorage`, separados por negocio, cuenta y sucursal. Recargar o navegar permite recuperar la misma intención. La vista bloquea un nuevo lote mientras el resultado anterior sea incierto. Conflictos de intención y fallos de red conservan la referencia; vista previa obsoleta requiere revisar nuevamente. El aviso explica que no se debe cerrar la pestaña hasta recuperar el resultado. No se añade almacenamiento remoto de archivos ni consentimiento ficticio.

El backend valida autorización de dueño/gerente, sucursal asignada, encabezados, tipos, decimales, unidades y duplicados en todo el negocio. La creación de registros, stock inicial, Kardex y auditoría ocurre en una transacción recuperable. La exportación respeta la sucursal, rechaza más de 5,000 filas y neutraliza fórmulas, incluidos prefijos con espacios.

## Contrato integrado por el coordinador

- POST `/api/operacion/importacion/previsualizar`: `{tipo: 'catalogo'|'clientes', sucursalId, csv}` devuelve `{rows:[{row,data}], errors:[{row,message}], previewHash, canConfirm, summary:{valid,total}, policy}`.
- POST `/api/operacion/importacion/confirmar`: añade `previewHash` e `idempotencyKey`; devuelve `{imported, kind, replayed, idempotencyKey}`.
- GET `/api/operacion/importacion/plantilla?tipo=...`: CSV de encabezados.
- GET `/api/operacion/importacion/exportar?tipo=...&sucursalId=...`: CSV del alcance autorizado.
- API web: `previewDataImport`, `confirmDataImport`, `downloadDataImportCsv(tipo,sucursalId,plantilla)`.

El parser dedicado de estas dos rutas POST admite un sobre JSON de 350 KB; las demás rutas conservan 100 KB. El límite real del contenido CSV sigue siendo 150 KB. Esto corrige el rechazo involuntario de archivos válidos por el parser global.

## Evidencia del 14 de octubre de 2026

- `npm run build:api`: pasa.
- `npx tsc --noEmit -p apps/web/tsconfig.json`: pasó con PC16 integrado. La repetición al finalizar detectó un atributo JSX duplicado en `OnboardingModal.tsx:245`, archivo editado en paralelo fuera de esta entrega; se informó al coordinador para corregirlo antes del build final.
- `node scripts/qa_data_import.cjs`: **10 verificaciones pasan en SQLite desechable**: BOM/CRLF/comillas/multilínea, vista sin escrituras, confirmación/reintento único, Kardex/auditoría, lote inválido sin importación parcial, duplicados ocultos sin revelar nombres, hash obsoleto, clientes sin historial fabricado, roles/sucursales, exportación segura/plantilla, límites y archivo válido mayor a 100 KB.
- `node scripts/test_data_import_ui.cjs`: **16 aserciones de recuperación pasan**.

Las pruebas usan datos ficticios y proveedores deshabilitados; la base desechable se limpia. El subagente no ejecutó navegador ni modificó bases de demo. Las capturas y el recorrido visual son responsabilidad del coordinador. PostgreSQL no se ejecutó en esta entrega; el script soporta su fixture protegido para esa verificación independiente.

Estado: implementación e integridad local comprobadas; no convertir automáticamente en aceptación visual completa sin el recorrido del coordinador.
