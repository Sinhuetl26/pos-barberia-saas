# Revisión del rediseño al 50 %

Fecha: 29 de octubre de 2026. Alcance: laboratorio local aislado; no producción, proveedores ni operaciones reales.

## Resultado

El avance ponderado pasa de 800/2000 a **1000/2000 (50 %)**. Se cierran UI-06, UI-09 y UI-10. UI-11 queda en revisión y UI-13 implementado.

### UI-06 — Agenda, disponibilidad y fila — verificado completo

- Agenda compacta con calendario/lista, filtros por profesional y estado, búsqueda y detalle de cita.
- Recorrido visible de cita a atención/cobro; retorno conserva fecha e identificador.
- Fila presencial ofrece asignación/reasignación, revisión de importe y acceso a la cita sin duplicarla.
- Respuestas antiguas, horario ocupado, falta de cupo, concurrencia y privacidad quedaron cubiertos por pruebas aisladas.
- No se inició, terminó, reprogramó ni cobró ninguna cita durante esta tanda.

### UI-09 — Clientes e historial — verificado completo

- Directorio por identidad y contacto, campos vacíos explícitos y ficha con historial/preferencias.
- Solo existe un diálogo abierto al pasar de ficha a membresía; cancelar no guarda.
- Búsqueda tardía, cambio de tenant, error/reintento y selección de reagendado se comprobaron sin duplicar identidades.

### UI-10 — Equipo y comisiones — verificado completo

- Equipo muestra tres perfiles de Jornada UI15; pestaña activa clara y sin bloque oscuro.
- Comisiones distingue origen, comisión, propina y estado; liquidar no se presenta como entrega de efectivo.
- Hallazgo corregido: el endpoint y la pantalla ahora filtran comisiones por sucursal. Jornada UI15 muestra cero registros; Sucursal de prueba muestra cuatro y excluye UI12.
- La revisión de pago conserva selección, importes, profesional y sucursal; no se liquidó ninguna comisión.

### UI-11 — Catálogo e inventario — en revisión

- Servicios, productos e insumos tienen entradas y conteos separados.
- Se añadió edición por tipo: servicio muestra duración/precio; producto muestra venta y mínimo; insumo no permite precio de venta.
- Editar nunca envía existencias ni cambia unidad/naturaleza. El stock solo cambia mediante un movimiento trazable.
- Pendiente para cierre completo: fotografía/ilustración editable con almacenamiento definido y revisión visual ampliada de recetas, conteos y consumos.

### UI-13 — Mensajes y avisos — implementado

- Resumen accionable y filtros para atención, listos y enviados/entregados.
- Estados separados: registrado, pendiente, enlace listo, aceptado por proveedor, entregado, leído, fallido, horario y baja.
- La interfaz aclara que «aceptado por el proveedor» no equivale a «entregado».
- No se generó ni envió ningún WhatsApp/correo durante esta revisión.

## Evidencia visual

- `agenda-desktop.png`
- `clientes-desktop.png`
- `equipo-desktop.png`
- `inventario-editar-producto.png`
- `inventario-editar-insumo-movil.png`
- `mensajes-estados.png`
- `comisiones-sucursal-aislada.png`

## Pruebas

- TypeScript web y API: sin errores.
- Reservas e integridad: 20/20.
- Autorización: 19/19, 184 rutas inventariadas.
- Agenda: 7/7; retorno a cita: 7/7; fila y cotización: 4/4.
- Clientes: 6/6; reagendado: 5/5.
- Equipo/comisiones: 6/6 más verificación en navegador de aislamiento por sucursal.
- Inventario: 4/4 edición por tipo, clasificación correcta y 6/6 permisos/CSV.
- Mensajes: diez estados agrupados sin llamadas externas.

## Límites conservados

- No se desplegó ni se modificó la demo persistente de Docker.
- No se efectuaron ventas, devoluciones, cierres, movimientos de stock, pagos de comisión o envíos.
- El paquete principal sigue por encima de 500 kB; la división por rutas continúa pendiente en UI-19.
