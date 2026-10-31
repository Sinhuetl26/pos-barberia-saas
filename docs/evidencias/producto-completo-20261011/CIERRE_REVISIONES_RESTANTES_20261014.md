# Retoma y cierre de cuatro revisiones pendientes — 14/oct/2026

Sinhue pidió explicar dónde quedó el trabajo y continuar. Punto inicial: 16/21 verificados. Punto final: **20/21 verificados en alcance local**; PC12 conserva pendiente específico de aceptación de impresión en navegador. No se acredita producción ni se cierran por inferencia historias originales de Notion.

## PC05 — diferencias de insumos

Revisión independiente: `PC05_PC20_REVISION_CIERRE_20261014.md`, 11/11 SQLite. Ejemplo original 500 − 60×5 =200, conteo ficticio150, diferencia50; tolerancia49/50, datos insuficientes, compensación única, permisos y rollback cubiertos en fixture desechable. No se realizó medición física ni se atribuyó una diferencia a una persona.

GUI principal conservada: Consumo muestra 500ML iniciales −10ML por atenciones =490ML esperado/registrado. Desglose, costo histórico y receta por evento visibles; una atención sin receta lo informa sin consumo retroactivo. Sin conteo físico no presume pérdida. Tolerancia vacía,49 y50 consultadas sin cambiar stock. Corrección abierta/cancelada por Escape, devuelve foco al botón; motivo vacío no permite confirmar. Captura móvil efectivamente385px de contenido/390px viewport: `pc05-correccion-revision-mobile-20261014.jpg`. No se guardó otra corrección.

## PC09 — servicios combinados

`PC09_REVISION_CIERRE_20261014.md`: **6/6 SQLite +6/6 PostgreSQL**, clúster independiente detenido. Actualizadas dos comparaciones de stock al tipo Decimal real sin alterar importes o condiciones. Nuevo caso comprueba reprogramar/cancelar una sola visita, conservar snapshots/precio/duración, liberar/bloquear todo el intervalo y no crear fragmentos. Datos manipulados, venta única, catálogo posterior y compatibilidad antigua siguen cubiertos.

GUI: visita existente Degradado+Corte clásico,450/75min, un profesional/una cita completada; ticket A3/600 del recorrido anterior conserva sus líneas y producto. Selección pública móvil nueva muestra dos servicios/75min/450 antes de confirmar. No se creó ni cobró otra visita. Capturas `pc09-visita-combinada-final-20261014.jpg` y `pc09-seleccion-combinada-mobile-20261014.jpg`.

## PC18 — personalización de reservas

Se reprodujeron y corrigieron dos errores: parche solo tema/portada borraba galería/instrucciones por defaults de esquema parcial; API admitía rutas privadas rechazadas por frontend. Único archivo de producto backend: `booking-personalization.service.ts`. Defaults completos/compatibilidad se conservan; un parche no rellena campos omitidos. URLs públicas y rutas privadas/credenciales/longitud se validan de forma alineada, rechazo atómico.

`PC18_REVISION_CIERRE_20261014.md`: **7/7 SQLite +7/7 PostgreSQL +5 helpers web**, API build PASS. Permisos dueño, negocio distinto y descripciones de servicios ajenos cubiertos sin tocar fixtures de presentación.

GUI únicamente en copia5198: guardar foto ficticia HTTPS con título/alt; después seis variantes (Bosque/Tinta/Océano × Editorial/Compacta) con guardado por controles normales, recarga pública, galería conservada y ninguna excede385px contenido en390px viewport. Se guardaron/revisaron visualmente seis capturas `pc18-<tema>-<portada>-390-20261014.jpg`. Imágenes de galería tienen loading=lazy. Al desplazarse para solicitar una imagen inexistente aparece «Foto no disponible» y CTA sigue abriendo servicios. Captura `pc18-galeria-fallo-recuperable-20261014.jpg`; el vacío en capturas completas anteriores al desplazamiento corresponde a carga diferida, no a fotografía cargada.

Dos fotos ficticias agregadas/reordenadas; segunda ocultada; guardar/recargar conserva orden y ocultación. Finalmente copiaQA queda Océano/Compacta, portada/descripción vacías y galería global oculta conservando ambas fotos, instrucciones/políticas ficticias. Sin contenidos opcionales conserva servicios/equipo/reserva. Entrada desde servicio conserva selección; entrada desde Alex conserva profesional y pasa a Horario al elegir servicio. Texto de llegada y política informativa verificados antes de Confirmar reserva,200/30min/Alex, sin aceptar aviso ni enviar reserva. La principal permanece Bosque/editorial y sin estas fotos/textos/reglas QA.

## PC20 — auditoría comprensible

Se corrigieron eventos persistidos pero omitidos de consulta: gastos/correcciones, cambios de cita, importación y comisiones. Proyección explícita antes/después sin JSON crudo, secretos ni referencias privadas. Citas y cortes antiguos con ID resuelven sucursal solo dentro del tenant; IDs de otro negocio no se atribuyen. Cierre muestra snapshot del evento, sin recalcularlo con saldo actual. Productor de cierres nuevos agrega sucursal/motivo sin cambiar hash, transacción ni replay.

Revisión independiente **9/9 SQLite +9/9 PostgreSQL**, clúster propio detenido. Gastos/citas reales de fixture, reintentos únicos, fallo sin evento completado, cierre/replay, corte extranjero, secretos anidados y snapshot inmutable cubiertos. Fuente y comandos en `PC05_PC20_REVISION_CIERRE_20261014.md`. Root formateó importes anterior/actual y campos de caja como MXN, estados de cita legibles; `test_audit_display.cjs` PASS para moneda, negativos, cantidades sin moneda, estados y zona horaria.

GUI principal, filtro Sucursal ficticia+Caja cerrada: original14oct fondo100, entrega600, gasto25, esperado675, contado675, diferencia0. Corte13oct100 también sigue registrado; no se cerró de nuevo. En copiaQA filtro Gasto corregido: original12→actual14, versión2, responsable/motivo/referencia, evento original sigue visible sin filtro. Capturas `pc20-cierre-sucursal-conciliado-20261014.jpg`, `pc20-cierre-mobile-20261014.jpg` y `pc20-gasto-correccion-final-20261014.jpg`. Móvil real385/390, sin desbordamiento general; primeras capturas intentadas en pestaña nativa seguían a1254px y fueron reemplazadas por pestaña de prueba con ancho medido.

## PC12 — pendiente concreto, no simular cierre

Ya hay recorrido integrado y persistencia del cierre675, siete pruebas de previsualización por motor y regresiones previas. No se repitieron A3, entrega600, gasto25 ni cierre675. Se volvió a abrir Caja y entregas y se pulsó Comprobante del turno cerrado; no apareció un error en la app, pero la ventana emergente/impresión no se expuso al inventario del navegador controlado. Esto limita la comprobación de impresión; **no demuestra por sí solo que el producto no genere el comprobante**. No se marca PC12 verificado sin esa aceptación. Impresora física y medición real de insumos siguen externas.

Próximo paso exacto: comprobar representación/impresión del comprobante existente mediante superficie controlable, o dar una vista previa accesible reutilizando el patrón actual si se demuestra necesaria. Verificar errores/reintento/foco y lectura autorizada sin abrir turno ni ejecutar otro cierre. No introducir un cierre ficticio repetido para obtener una captura.

## Versión, datos y límites

API principal3103: sesión10753. Web principal5197: sesión85350, carpeta `.tools/product-ui-preview-verified-20261014`, JS `index-CsF_Gq8U.js`, CSS `index-w4_lNMmQ.css`. API de revisión3104: sesión88330; web5198: sesión29052 durante QA (detenidas al finalizar; los números son históricos). Carpeta review `.tools/commercial-review-ui-20261014`, JS `index-BPHz1Pxl.js`. Los dos snapshots corresponden al mismo código con API local diferente; no intercambiar carpetas. Build API/web y TypeScript PASS; primer build web restringido falló EPERM y se repitió autorizado sin cambiar código. JS904.65KB/250.89KB gzip; aviso >500KB conservado, no certifica rendimiento móvil real.

Lectura independiente `verify_commercial_review.py` confirma preservación de principal y revisión; `REVISION_INTERNA_DB_20261014.json` actualizado solo con lectura. Principal A3=600, Gel490, Cera1, corte675 cerrado/diferencia0, tarifa/política vacías. Review conserva A4=170TRANSFERENCIA/commission68/approvalUSADA, gasto original12+corrección14 y fila asignada280 sin atención/cobro. Ninguna conexión externa, gasto, despliegue, precio comercial o mensaje externo cambió.

Los pendientes de producción, fiscal/legal, proveedores y hardware no se convierten en tareas completadas de la demo. Tampoco se certificó WCAG global, teléfonos internacionales de diez dígitos ni rendimiento en redes reales. No hubo nuevas dependencias ni commits/reset.
