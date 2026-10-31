# Cierre local de PC-16, PC-17, PC-19 y PC-21

14 de octubre de 2026. Retoma de las 06:00 atendida; automatización de inicio PAUSED. Alcance: copia ficticia local, sin proveedores, cargos reales ni despliegue. Los cuatro bloques enfocados quedan verificados para la demo local; esto no cierra automáticamente las 21 historias ampliadas ni acredita producción.

## Resultado y evidencia

- PC-16: importación CSV con vista previa, validación por fila, duplicados, confirmación recuperable, plantilla/exportación y stock opcional en primer uso. 10 pruebas de API en SQLite y 10 en PostgreSQL, 16 comprobaciones de recuperación. Navegador: inválido bloqueado, lote válido, exportación, duplicado sin sobrescritura y existencias persistentes. Ver PC16_IMPORTACION_20261014.md.
- PC-17: búsqueda con permisos, cancelación de respuestas antiguas, estados inicial/carga/error/reintento/vacío y teclado. 13 comprobaciones de API por motor y 10 de lógica UI. Navegador móvil: flechas/Enter abren el artículo exacto; Escape conserva origen y foco. Ver PC17_BUSQUEDA_20261014.md.
- PC-19: modales de POS, Agenda, Clientes, Equipo, Ayuda y acceso/registro con foco, límites de altura y regreso seguro. Verificación móvil de crear/bloquear/reprogramar/detalle de Agenda, perfil y alta de Clientes, alta/edición y revisión de comisión; no ejecutó devoluciones, cancelación de datos ni otra liquidación. Alta comercial: 390×844, diálogo 812px con scroll interno, Shift+Tab al último control, Tab al primero y Escape al botón de origen, sin crear cuenta ni aceptar acuerdos. POS historial en 1366×640: diálogo 544px, scroll interno y Escape al origen. 39 mediciones previas de pantallas móvil/tableta/escritorio sin desbordamiento general; no constituyen una auditoría WCAG exhaustiva.
- PC-21: 13/13 suites de regresión aprobadas; cadena integrada 11/11 en SQLite y 11/11 en PostgreSQL, recuperación tras reinicio y permisos de gerente/barbero/otro negocio; 17 comprobaciones de privacidad de referencias. Navegador con cliente público, barbero y dueño: reserva combinada → atención → venta A-000003 → stock/insumo → comisión → custodia → gasto → cierre. Guion y arranque en GUIA_DEMO_FINAL_20261014.md. El gerente se comprobó por API, no se atribuye un recorrido visual de gerente que no se ejecutó.

## Correcciones surgidas de la revisión independiente

Clientes mostraba cero citas por leer `_count` inexistente. Ahora usa `totalVisitas` y etiqueta **Visitas y compras**, sin convertir un dato desconocido en cero. A-000003 aparece con 1 visita/compra, $600 y su atención/ticket vinculados. Referencia privada conserva el mismo botón y foco al expandir. Errores de directorio/seguimiento visibles con reintento; respuestas antiguas no sustituyen la consulta vigente ni cruzan cuenta/rol/sucursal. Seguimiento adapta los campos reales `clientes`, `diasSinVenir` y `fechaUltimaVisita`. Prueba reproducible `scripts/test_client_directory_ui.cjs`: 6/6; helpers de caja/cliente: 12/12. Browser: perfil, dato real y foco confirmados.

La invitación de seguimiento ya no promete un 10% que ninguna política configuró. El texto describe visitas/compras registradas y apertura manual de WhatsApp; sin teléfono válido no muestra un enlace operativo. No se envió ningún mensaje. Regresión específica phase3 final: **23/23**, incluyendo invitación sin descuento inventado y URL con el texto exacto. El primer intento de esa ampliación falló por variable de prueba duplicada; se corrigió y la reejecución pasó, sin afectar la copia de presentación.

Operaciones financieras tienen plazo de 20 segundos también para leer el cuerpo de respuesta. Un timeout conserva UUID/intención y permite recuperar el resultado sin un segundo movimiento. `test_financial_timeout_ui.cjs`: 5/5 con cliente API real transpilado y reloj/fetch controlados, incluido servidor que confirmó antes de perder respuesta. No se afirma haber cortado físicamente la red del navegador. Revisión de liquidación congela IDs/método/montos y exige lectura nueva para el primer envío; recuperación conserva la intención original: 6/6. En navegador se revisó Alex/A-000003/$195 y se cerró sin pagar.

La revisión de contraste calculó los colores principales de las tres paletas; no es una certificación completa. Se oscurecieron etiquetas secundarias y bordes de campos, aclaró el rol en navegación y corrigió el foco dorado secundario. En snapshot final POS: borde computado rgb(123,137,126); foco de botón 3px rgb(164,123,56), visible; ancho 1361 dentro de viewport1366. Los colores de campos de error mantienen `aria-invalid` en rojo. Ver PC19_REVISION_FINAL_20261014.md y PC19_CLIENTES_FINAL_20261014.md.

## Persistencia e imágenes

Después del último reinicio, lectura independiente y sin escrituras confirmó A-000003=600, Gel=490ML, Cera importada=1, comisión195 sin pagar y corte CERRADO/fondo100/conteo675/descuadre0. Ver PERSISTENCIA_FINAL_20261014.json. No se repitió el cobro ni el cierre. Los $200 anteriores del barbero y $380 del dueño siguen separados conforme a RECORRIDO_UI_DB_20261014.json.

En la copia ficticia, logo, portada y tres retratos apuntaban al servidor antiguo5190. Se cambiaron por la configuración/edición normal a5197, guardado y recarga; carga de los cinco recursos comprobada al recorrer la página. No se tocaron las URLs de la copia original. Ilustraciones/fotografía están identificadas como ficticias.

## Versión de presentación y límites

API3103: `scripts/start_product_demo.cjs`, sesión final54790; snapshot5197: `.tools/product-ui-preview-verified-20261014`, sesión34726. Las sesiones pueden caducar; guía de arranque sin migración ni resiembra. Assets finales `index-d5Oa4s1P.js` y `index-w4_lNMmQ.css`. TypeScript/API/web pasan. Build Vite final8.62s, JS894.97KB bruto/248.13KB gzip y CSS152.94KB/27.49KB gzip. Advertencia de bundle >500KB sigue como mejora de rendimiento, no se ocultó ni justifica añadir servicios; estas medidas no acreditan velocidad en celulares/redes reales.

Capturas finales: pos-version-final-20261014.jpg, reservas-imagenes-final-20261014.jpg, equipo-publico-final-20261014.jpg, alta-foco-final-20261014.jpg, pos-historial-pantalla-baja-final-20261014.jpg, agenda-modal-mobile-final-20261014.jpg y comisiones-revision-mobile-20261014.jpg. Las capturas antiguas respaldan los escenarios de su versión, no se atribuyen a cambios posteriores.

Pendientes externos: despliegue, dominio, conexiones reales, revisión fiscal/legal e impresión física; sin impresora disponible. Otros bloques conservan sus estados y criterios originales, especialmente revisiones ampliadas de precios/descuentos y correcciones de gastos. No hubo actualización automática de historias originales en Notion ni declaración de producto listo para operar comercialmente.
