# QA independiente PC-19 — revisión de código UI

11 de octubre de 2026. Solo lectura de producto; no usé navegador, reservado al coordinador. Esto no equivale a aceptación visual, contraste medido ni recorrido teclado real.

## Hallazgos confirmados

### P1 — Kardex no muestra responsable ni proveedor del snapshot nuevo

`InventarioView.tsx` función `movementDetails` busca `metadata.usuarioEmail` y `metadata.proveedorNombre`. `inventory-ledger.service.ts` guarda `usuarioNombre` (email) y `proveedorId`, sin esos dos nombres esperados. Por ello las entradas nuevas muestran costo y referencia, pero el responsable y proveedor quedan omitidos; contradice PC-02, que exige trazabilidad legible. El endpoint conserva los datos correctamente y QA API histórica pasó. Corrección solicitada al escritor: usar `usuarioNombre` con compatibilidad legacy; resolver proveedor en snapshot o directorio autorizado y mantener dato histórico.

### P2 — Límite de conteo frontend distinto del contrato API

`countInputValid` permite enteros hasta1,000,000,000; `saveInventoryCount` acepta como máximo1,000,000. Cantidad1,000,001 se presenta como válida al guardar y API la rechaza. El motivo de conciliación también habilita botón con un carácter, aunque API exige tres. No corrompe datos: servidor rechaza; añade error evitable al recorrido. Corrección solicitada al escritor: mismos límites y mensaje contextual.

## Comprobaciones de código satisfactorias

- `OperationDialog` usa dialog modal nativo, título asociado, foco inicial y restauración del disparador conectado. Tab/ShiftTab contienen controles visibles/habilitados; Escape respeta busy. Falta recorrer físicamente teclado.
- Seguridad no mantiene token de enlace en localStorage/URL tras montar; contraseñas etiquetadas, autocomplete, límites, coincidencia y errores/estado accesibles. Revocar sesiones pide confirmación y conserva registros del negocio.
- Integraciones diferencia configurado de probado, muestra pasos sin guardar credenciales en cliente y enlaces externos usan noopener/noreferrer. Refresh tiene guard de resultado tardío y error visible. No se visitaron proveedores ni enviaron mensajes.
- Mensajes separa registro interno, enlace preparado y enviado al proveedor; aviso de venta JSON se convierte a folio/profesional/servicio/importe. No presenta enlace como entrega comprobada. Error de baja tiene rolealert y estado exitoso rolestatus.
- Inventario y conteos conservan intención durable por negocio/usuario/sucursal; bloqueo de cambios mientras respuesta incierta, recuperación con misma clave, errores API clasificados y referencia stock obsoleta fuerza refresco. Los formularios muestran errores/recovery dentro del dialog, no solo detrás.
- Conteos distingue null de cero, guarda versionEsperada, actualiza referencia únicamente con recuento marcado y conserva conflicto para recarga explícita. Backend idempotencia/rollback/concurrencia probado en ambos motores en QA_CONTEOS.md.

## Helpers ejecutados

Se extrajeron exports reales `countDifference` y `countInputValid` de InventoryCounts.tsx, transpilaron y ejecutaron en vm; no se reimplementaron fórmulas en test.

**12 comprobaciones PASS:** blanco/espacios no contado, cero−8=−8, diez−8=+2; cantidades válidas blanco/cero/1,000,000; rechaza negativo/fracción/exponente/Infinity/fuera de límite frontend. Comprobación adicional de compatibilidad API para1,000,001: **FAIL**, enviado al implementador. La discrepancia está descrita arriba, no se oculta con tests que replican el límite equivocado.

## Pendientes de aceptación

- Corregir y volver a comprobar los dos hallazgos.
- Navegador escritorio390px y teclado: overflow, lector/foco, modal con error/recovery, sucursal cambiada con solicitud en curso y navegación.
- Mensajes con respuesta tardía no usa el mismo guard de consulta que Integraciones; evaluar si cambia cuenta mientras vista sigue montada antes de declarar fuga. Actualmente no hay evidencia de datos ajenos y no se marca como P0.

## Segunda revisión después de correcciones

El implementador cambió `movementDetails` para leer `usuarioNombre` y resolver `proveedorId` con directorio autorizado; conserva ID como fallback. `countInputValid` ahora limita1,000,000 y botón de conciliación exige motivo de3 caracteres. Se volvieron a ejecutar exports reales: **11/11 PASS incluyendo límite de API1,000,001 rechazado**. Los dos hallazgos iniciales están corregidos a nivel de código; aceptación visual sigue con coordinador.

P2 adicional: campo de referencia permite200 caracteres mientras API acepta160; pedir161…200 genera rechazo evitable. Fecha de la tabla muestra `m.fecha` de registro, pero campo opcional `fechaOperacion` enviado por el dueño no se presenta. No son defectos de integridad: referencia inválida se rechaza y fecha operacional está preservada en metadata. Afinar límites y etiquetas para distinguir fecha de operación de registro.
