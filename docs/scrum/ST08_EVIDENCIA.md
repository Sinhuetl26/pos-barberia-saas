# ST-08 · Correo transaccional y puesta en marcha

Fecha: 2026-10-08. Sprint 2. **Implementación local En revisión; aceptación externa de correo pendiente.** No está Validada ni certificada para producción.

## Criterios

- [ ] Dominio propio/remitente verificados, SPF/DKIM y política DMARC revisados, entrega/rebote/supresión reales documentados. No hay dominio ni proveedor conectado en esta demostración.
- [x] Alta limpia y configuración de horario, catálogo, equipo/comisiones y primera caja con datos elegidos por el dueño. Pruebas aisladas y recorrido observado; aceptación de Sinhue conjunta al cierre del Sprint 2.
- [x] Errores y ausencia del proveedor no se presentan como entrega. Aceptación, entrega al servidor destinatario, retraso, rebote, spam y supresión tienen estados distintos. El uso de un enlace tampoco acredita entrega por correo.

## Implementación

El registro ya no crea servicios, productos, existencias ni un barbero de muestra. Tampoco asigna una dirección ficticia. El asistente crea únicamente los servicios seleccionados, conserva precios/comisiones de cero e interpreta horarios en la zona de la sucursal. Los servicios nacen sin stock ficticio. La captura de inventario inicia con importes y existencias en cero.

Resumen muestra una guía que consulta datos persistidos para horario, servicios, barberos y primera apertura de caja. No permite marcar pasos como completos manualmente. Guardar la sucursal actualiza su nombre en la navegación y el resumen. Caja abre directamente su pestaña. La guía desaparece cuando los cuatro pasos están cumplidos.

Correo conserva la bandeja cifrada y su petición estable al reintentar. Los mensajes se correlacionan por identificador de proveedor; notificaciones firmadas de Resend/Svix se verifican contra el cuerpo original. Firma alterada, ausente o antigua se rechaza. Eventos duplicados no producen efectos nuevos, un evento tardío no convierte un rebote en entrega, y un evento temprano se reconcilia después de guardar el identificador del envío. Rebote permanente, spam o supresión bloquean futuros envíos a ese destinatario; la dirección en la lista se representa mediante HMAC. La revisión de una supresión requiere investigación y procedimiento operativo antes de habilitar nuevos envíos; no existe liberación automática.

Conexiones distingue configuración, dominio verificado, DNS y prueba real. Consulta el dominio en Resend y revisa DMARC publicado sin afirmar que la política fue aprobada. Solo dueño/administrador pueden ver preparación de correo; datos de mensajes limitados al propio negocio, sin claves, enlaces ni contenido cifrado. La pantalla de seguridad muestra únicamente el estado del correo propio. Una cuenta sin verificar no inicia consultas periódicas de avisos de venta.

## Verificación

- **17/17 escenarios ST-08 en SQLite y PostgreSQL**: alta vacía, cero intencional, validación atómica, sucursal ajena y roles, proveedor ausente/aceptado/fallido, firma original, duplicados concurrentes, orden de eventos, supresión y comprobación de DNS con doble controlado.
- **12/12 suites generales por motor**; **13/13 comprobaciones PostgreSQL de migración/recuperación**, nueve migraciones versionadas. La base de trabajo permanece intacta por hash.
- API y web compilan; construcción Vite correcta. Auditoría de dependencias de producción: cero vulnerabilidades reportadas en esta ejecución. Advertencia de tamaño del paquete web conserva ST-31.
- Navegador: cuenta ficticia nueva → horario 10:00–19:00, martes a sábado → servicio de $280/30 minutos → barbero con comisiones de 0% → caja abierta con $500 → guía oculta. Sin ventas ni stock inventados. Comprobación en base desechable: un servicio, un barbero, una caja. La cuenta ficticia se verificó mediante la función local de consumo de enlace; **esto no fue entrega real**.
- Resumen y Conexiones comprobados a 390 × 844 sin desbordamiento; catálogo/equipo/caja recorridos en escritorio. Corregida la animación que retenía un contexto de apilamiento y dejaba la cabecera sobre el formulario de inventario; el formulario ahora admite desplazamiento vertical. Revisión React: efectos con cancelación de resultados tardíos, claves estables y bloqueo inmediato de guardado en preparación/asistente. Accesibilidad integral y equipos físicos permanecen en ST-09.

Resultados: `docs/ST08_RESULTADOS_SQLITE.json`, `docs/ST08_RESULTADOS_POSTGRES.json`, `docs/scrum/ST08_BROWSER_RESULTADOS.json`; capturas `ST08_preparacion.png`, `ST08_alta_completa.png` y `ST08_correo_movil.png` en `docs/screenshots`.

## Pendiente para cerrar

Completar [la conexión y prueba real](../CORREO_DOMINIO_Y_PRUEBA_REAL.md) con Sinhue. Las claves se configuran en el servidor, nunca en el chat ni en la web. No se compró dominio, envió correo externo, hizo cargo, publicó ni migró la base operativa. La migración de trabajo requiere respaldo y comprobación previa; estas pruebas usan bases desechables. ST-09 aún no se inició. Aceptación agrupada según DEC-08.
