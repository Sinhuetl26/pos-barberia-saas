# CD-01 — revisión inicial y brechas

Ejecución programada del 11/oct/2026. Revisión del plan, árbol de trabajo, reportes previos, rutas y código. No es una auditoría visual completa de todas las pantallas. Se conservó el trabajo existente, sin reset ni cambio de estados de historias.

| Pantalla/área | Hallazgo o brecha | Prioridad | Plan/historia | Evidencia y prueba requerida |
|---|---|---|---|---|
| Demo | dv-r01, Estudio Norte y cierre-demo son datasets distintos. Solo cierre-demo fue creado en esta ejecución. | P1 | CD-02 | Manifiesto independiente, tres logins HTTP y apertura de panel en navegador. |
| Inventario | Movimiento manual no recibe clave idempotente; ajuste sustituye saldo por cantidad absoluta. No existe flujo persistido de conteo/receta en lo revisado. | P0 de aceptación de ST-41; riesgo confirmado por contrato, no incidente observado | CD-11/12/13; ST-41/42 | Probar respuesta perdida/reintento y venta concurrente antes de aceptar conteos. Prohibido presentar ajustes actuales como conteos seguros. |
| Inventario inicial | Creación de producto y Kardex inicial aparecen en operaciones separadas. | P0 por investigar | CD-11; ST-41 | Test de rollback con fallo del Kardex y concurrencia. No se afirma pérdida observada. |
| Reportes | Consulta captura error solo en consola; contenido depende de data y no hay estado explícito de error/carga en la vista revisada. Respuestas anteriores pueden sobrescribir filtros nuevos. | P1 | CD-03/14; ST-31 | Error visible, reintento, descartar respuesta obsoleta, no mostrar cifra anterior bajo filtro nuevo. |
| Landing SaaS | Promete soporte 7 días, tiempos de cobro/configuración y presenta SSL 256-bit; el recorrido local no acredita esas garantías. | P1 | CD-20; ST-27/44 | Revisar textos contra oferta real, pruebas y conexiones; no cambiar precios. |
| Agenda y POS | Hay calendario, lista móvil, detalle y total persistente ya implementados. No rehacer sin defecto comprobado. | P1 verificación | CD-05/07; ST-31 | Recorrido con cita, venta, producto, comisión y caja; sin duplicaciones. |
| Barbero | Menú ya diferencia rol; autorización del reporte financiero rechazó al barbero en fixture. Cobro y custodia completos aún por recorrer. | P1 | CD-04/06/09; ST-02/06 | Navegador móvil, cita propia/ajena, API, registro de cobro y aviso al dueño. |
| Equipo | Se cargaron tres perfiles ficticios en la demo nueva. Pantalla administrativa completa aún por revisar. | P1 | CD-09 | Horarios, servicios, permisos y comisiones históricas. |
| Cliente | Preferencia textual existe; retorno y privacidad tienen evidencia previa, no prueba nueva completa. | P1 | CD-10; ST-29 | Reserva→ficha→venta→próxima visita; foto privada no pública. |
| Reservas | Portada editorial y flujo existente abren con identidad del fixture. Reserva API reintentada produce una cita persistida. | P1 verificación | CD-17 | Completar reserva desde navegador y recuperar; configuración compacta/sin fotos, teclado/móvil. |
| Inicio | Dueño abre panel, muestra tres profesionales y un producto por reponer; cero ventas es real para fixture inicial. | P1 | CD-15; ST-30 | Conciliar luego de venta y diferenciar datos no disponibles. |
| Configuración | Centro unificado ya existe; revisión completa de persistencia/permisos pendiente. | P1 | CD-16 | Guardar, recargar, abandonar cambios, comparar perfil público y aislamiento. |
| Rendimiento | Build anterior ~710 kB antes de compresión. | P2, salvo impacto observado | CD-18; ST-31 | Medir/dividir por ruta con regresión, no repetir build sin cambios. |
| Conexiones, hardware, legal | Fuera de este plan; no equivalen a funciones listas por existir botones. | Externo | Plan siguiente | Proveedor real, permisos, costos, entrega y pruebas físicas correspondientes. |

Orden de atención: preparar fixture/recorrido; convertir riesgos P0 de inventario en pruebas y resolverlos antes de habilitar nuevas operaciones; pulir estados y navegación sin romper lo validado. No hay nuevos P0 operativos observados mediante incidente en esta ejecución. El riesgo de integridad de inventario impide aceptar ST-41, no invalida automáticamente ST-05.
