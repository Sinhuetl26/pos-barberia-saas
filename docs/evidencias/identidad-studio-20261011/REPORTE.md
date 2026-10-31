# Transformación de identidad y experiencia — 11 de octubre de 2026

## Alcance entregado

La primera aplicación fue demasiado limitada: corregía estados y detalles, pero no transformaba la composición. Esta entrega cambia la estructura visual de las pantallas principales de la demo, conservando la operación y los permisos.

Dirección: estudio de barbería contemporáneo. Bosque #19352c, lino #f5f3ed, latón #b58b43, tinta #25352e, secundario #637066 y blanco #ffffff. Barlow Condensed local para títulos y Source Sans local para lectura. Una misma identidad en la administración y reservas, con cifras tabulares, fotografía del trabajo y retratos como contenido. Sin reseñas ficticias, gradientes decorativos ni nuevas bibliotecas. Las imágenes del fixture se identifican como ejemplos.

## Cambios concretos

- Navegación: marca tipográfica, selección claramente visible, grupos legibles y controles mayores. Menú móvil con Escape, foco contenido en el menú y regreso al botón al cerrar.
- Inicio: fecha y carga real del día; agenda como área de trabajo, caja separada, pendientes con acceso directo y próximos pasos si no hay citas.
- Agenda: fecha protagonista, resumen por estado y calendario/controles organizados. Canceladas se conservan en Lista y no cuentan como programadas.
- Caja: servicios y productos separados, precios visibles, ticket con identidad, contexto del profesional/cliente y total. Se conserva el cobro fijo en móvil.
- Equipo: retratos grandes, nombres, especialidad, turno, comisiones, búsqueda y filtro activo/inactivo. Fallback de imagen.
- Configuración: navegación lateral descriptiva en escritorio, agrupada en móvil; datos del negocio, página pública, perfiles, contacto y horarios. Guardados y vista previa conservados.
- Reservas: fotografía dominante, portada editorial, carta de servicios con precio/duración, perfiles protagonistas y cierre de ubicación/contacto con el tema elegido. Se conservan las variantes configurables y el flujo de cuatro pasos.
- Inventario: lectura y controles coherentes, búsqueda etiquetada, vacío de filtros y fichas móviles que muestran precio, existencias y ajuste sin desplazarse por ocho columnas.
- Clientes: lenguaje concreto y lectura uniforme. No se denomina «Frecuente» a alguien sin historial; contador rotulado como citas registradas, que es lo que aporta el dato actual.
- Reportes, accesos y licencia: tipografía y superficies de la misma familia, ventas como cifra principal y detalles secundarios claros. Precios y conexiones conservados.

## Evidencia funcional

Entorno ficticio aislado: frontend5190/API3102, negocio cierre-demo. Sin cargos externos, despliegue ni mensajes externos.

1. Navegador: Corte clásico $200 + Pomada mate demo $180, profesional Alex. Venta A-000001 confirmada por $380 en efectivo. Ticket mostrado, carrito limpio y existencias de pomada de8 a7. Aviso al dueño pasó de0 a1. Comisión pendiente de Alex $98 (40% servicio +10% producto). Inicio y Reportes muestran $380 y una venta.
2. Navegador: servicio clásico, Mateo, lunes12 a12:30, cliente Prueba visual ficticia. Confirmación con folio RES-03E78E665C0018B6. Se abrió el aviso y se volvió sin perder la selección. La cita aparece en agenda del12 tras navegar desde la página pública.
3. Equipo: buscar Mateo deja un perfil; filtro Inactivos muestra vacío útil; volver a Todo el equipo recupera tres. Tab Caja y entregas muestra custodia pendiente $380 y acción para abrir turno. No se realizó entrega o cierre.
4. Inventario: búsqueda sin coincidencias muestra explicación; limpiar restaura catálogo. Kardex sigue conciliando las existencias después de la venta.
5. Menú móvil: foco inicial en Cerrar menú, Shift+Tab vuelve al último control, Escape cierra y devuelve foco a Abrir menú.
6. Sin desbordamiento general a390×844 (viewport útil385px) en Inicio, Caja, Clientes, Equipo, Inventario, Reportes, Agenda, Accesos, Licencia, Configuración y Reservas. Tablas históricas conservan desplazamiento local deliberado. Se revisaron capturas y se corrigieron el ancho del perfil público y margen de los enlaces bajo la cabecera.
7. TypeScript y build Vite aprobados. Sin dependencias nuevas. Advertencia previa de paquete grande continúa; no se declara rendimiento de producción.
8. verify_closure_demo.cjs:9 PASS, logins reales de fixture, público sin claves, catálogo separado por negocio, reportes403 para barbero, Kardex conciliado y reintento de reserva persistido una sola vez.

## Capturas

inicio-escritorio.png, inicio-movil.png, reservas-escritorio.png, reservas-movil.png, equipo-publico-movil.png, equipo-escritorio.png, configuracion-escritorio.png, caja-movil.png, agenda-escritorio.png, venta-ficticia.png, reserva-confirmada.png y capturas móviles por ruta en esta carpeta.

## Límites y trabajo restante

Esta es una transformación de la demo local. No cierra por sí sola todas las historias ni acredita producción. Conexiones y despliegue siguen en el siguiente plan autorizado. Permanecen los P0 de concurrencia/atomicidad de inventario documentados en CD-01, la validación con impresora física, revisión legal con datos reales y prueba con usuarios reales. El aviso actual contiene datos/contactos y afirmaciones legales que requieren revisión antes de publicar; no se acreditó su validez. Tampoco se probaron todos los navegadores o lector de pantalla. Las capturas no demuestran mejora de conversión.

La aceptación visual final corresponde al usuario; el equipo comprobó los flujos descritos. Ninguna historia se marcó completa por estética.
