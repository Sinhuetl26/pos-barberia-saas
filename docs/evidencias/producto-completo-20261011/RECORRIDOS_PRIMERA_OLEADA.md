# Primera oleada — evidencia de navegador

11 de octubre de 2026. Coordinador verificó los flujos con CUA, separado de implementadores backend/frontend y QA de API. Todo fue local y ficticio; ningún envío externo, compra o cargo.

## Datos y entorno

- Demo original 5190/API3102 conserva venta A-000001 y reservas. No se migró ni reinició.
- Copia consistente por SQLite backup API: `.tools/product-complete-demo.json`, web5191/API3103. Conteos al copiar: Tenant2, Venta1, Cita5, Producto6, Kardex4.
- Las migraciones de PostgreSQL requieren adaptar `TIMESTAMP(3)` a `DATETIME` para SQLite. El primer intento de crear conteo en la copia devolvió500 por esa declaración; se corrigieron solo las dos tablas nuevas preservando filas. Preparación nueva ya usa tipos correctos. No fue un fallo transaccional del producto: QA sobre esquemas aislados correctos había pasado. La UI recuperó posteriormente la misma intención guardada.

## Inventario y conteos

1. Entrada desde navegador de 3 unidades de aceite: saldo2→5, costo65, referencia COMPRA-FICTICIA-QA-01 y motivo ficticio. Mensaje confirmado; Kardex muestra saldo, costo, referencia y responsable.
2. Conteo parcial de aceite y peine. Primer fallo conserva UUID/payload y bloquea nuevos cambios. Tras recarga y reparación de declaración SQLite, «Recuperar resultado» creó un solo borrador con la intención original.
3. Se contó aceite4 dejando peine en blanco. Guardar avance conserva stock hasta confirmar. Recarga recupera borrador versión1 y diferencia−1; peine dice «No contado».
4. Confirmación con motivo deja aceite4 y peine5. Borrador confirmado versión2 deshabilita edición. Kardex guarda compensación−1 y responsable.
5. Móvil390×844: ancho de documento385 igual al viewport efectivo385, sin desbordamiento general. Tabla de conteo contiene desplazamiento propio; catálogo usa fichas móviles.
6. Se corrigió presentación de margen de catálogo: servicios sin costo real ya no muestran100%; se distingue de utilidad operativa.

Capturas: entrada-desktop.png, conteo-persistido-desktop.png, conteo-confirmado-mobile.png, inventario-conciliado-mobile.png y kardex-trazabilidad-desktop.png.

## Seguridad, Conexiones y Mensajes

- Seguridad muestra correo y formulario en áreas separadas, estados de consulta/reintento y confirmación antes de cerrar sesiones. Abrir dialog y Escape devuelve foco al disparador; no se cambió contraseña ni se revocó sesión.
- Conexiones usa dialog nativo compartido. ShiftTab desde título llevó al último enlace; Escape devolvió foco a «Ver pasos». No se abrió Stripe ni ningún proveedor.
- Mensajes empieza sin teléfono, texto, cita o persona prefijados. Etiquetas asociadas; errores visibles, botones ocupados y baja con error distinto de éxito. Dueño no ve el disparador global reservado al administrador.
- Registros internos se muestran como venta/reserva legible, sin JSON ni UUID como destinatario. La entrega al proveedor no se equipara a recepción.
- Seguridad y Mensajes revisados en390×844, documento385 igual viewport385. Capturas seguridad-desktop/mobile y mensajes-desktop/mobile. Las de Mensajes anteriores a normalización del historial deben regenerarse para revisión final.
- Compilación web aprobada tras integrar primeras funciones; advertencia de tamaño745KB minificado/gzip205KB anotada para evaluar división de rutas.

## Límites

Esta evidencia completa PC01/02/03 en el alcance local, complementando QA_INVENTARIO y QA_CONTEOS; no valida medición física de insumos ni historias originales con pruebas externas. PC09 se implementó mientras se revisaba inventario y todavía requiere QA/navegador vigente. PC19 sigue en curso; capturas no sustituyen las pruebas pendientes de errores, teclado y resto de módulos.
