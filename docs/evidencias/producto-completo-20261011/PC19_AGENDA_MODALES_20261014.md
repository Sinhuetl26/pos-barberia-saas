# PC-19 — modales de Agenda, 14 de octubre de 2026

## Archivo de producto entregado y congelado

`apps/web/src/views/AgendaView.tsx` exclusivamente. No se modificaron caja, clientes, barberos, componentes compartidos, estilos globales, API, reservas públicas, snapshots de precio ni datos de presentación. No se repitió ninguna operación sobre la demo.

- Reprogramación y bloqueo usan `OperationDialog` existente. Se elimina el portal/trampa de foco manual de reprogramación que se reinstalaba al cambiar busy. Ambos heredan foco inicial al encabezado, trampa Tab/Shift+Tab, restauración al origen y Escape bloqueado durante guardado.
- Reprogramación conserva error, validación requerida, horario de sucursal, handler y payload originales. El campo se desactiva al guardar y los botones conservan busy.
- Bloqueo agrega guardia inmediata de petición en vuelo, campo/formulario ocupado y acciones desactivadas. El error se muestra dentro del diálogo; conserva nombre, tiempos y motivo capturados. No modifica disponibilidad ni confirma éxito ante un fallo.
- Detalle desactiva también el botón Cerrar mientras se cambia estado, igual que su cierre por Escape.
- Nueva cita y atención sin cita mantienen las intenciones durables y bloqueo de cierre durante foto/guardado/resultado incierto. Se asocian las etiquetas a identificadores únicos; fecha y hora requeridas; controles de 44 px.
- Formularios de nueva cita y bloqueo apilan sus pares de campos en móvil; conservan dos columnas desde sm. Modales usan altura máxima de viewport y desplazamiento interno para pantallas bajas.

## Comprobaciones ejecutadas al congelar

- `npx tsc --noEmit -p apps/web/tsconfig.json`: **PASS**.
- `node scripts/test_agenda_ui_helpers.cjs`: **7/7 PASS**: zona de sucursal, solapamientos/carriles, límites calendario, primer horario disponible, error sin continuación silenciosa, cancelación de resultados tardíos y horizonte de búsqueda.
- Revisión de fuente: sin nuevo evento global de teclado; usa el diálogo compartido; no se cambiaron los handlers de crear/recover cita, walk-in, transición de estado, payload de reprogramación ni registros operativos.
- `git diff --check -- apps/web/src/views/AgendaView.tsx`: sin errores de whitespace tras normalizar final de archivo.

## Límites para aceptación visual de root

No se usó navegador. Root debe verificar Nueva cita, atención inmediata, bloqueo, detalle y reprogramación a 390 px y pantalla baja: foco inicial, Tab/Shift+Tab, Escape seguro, foco de regreso y botones accesibles sin desbordamiento.

El guard de bloqueo evita envíos simultáneos desde este formulario, pero la ruta existente no aporta una intención durable de bloqueo para recuperar una respuesta perdida. No se afirma idempotencia ante timeout del transporte ni se modificó API fuera del ownership. Su error pide revisar la agenda antes de volver a guardar.

La revisión UI-helper es regresión de lógica existente; no constituye prueba visual de modales ni aceptación completa de PC-19.
