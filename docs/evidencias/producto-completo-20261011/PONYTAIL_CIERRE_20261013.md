# Ponytail aplicado al cierre — 13 de octubre

Instalación autorizada por Sinhue desde DietrichGebert/ponytail, skills/ponytail, mediante skill-installer. Archivo instalado: C:/Users/Sinhue/.codex/skills/ponytail/SKILL.md. Se leyó completo y se aplicó en nivel full a este bloque. No reemplaza instrucciones del repositorio ni criterios de aceptación.

## Cambio mínimo completo

Se reutilizó CloseCashGuide, la API de previsualización existente, cashSummary, la intención financiera durable y las pruebas que había preparado Calidad. No se agregó dependencia ni segundo sistema de caja.

La prueba existente descubrió que el cierre anterior aceptaba conteoEfectivoReal:null y lo convertía a0. Se corrigió una vez en closeCashShiftSchema: solo número o texto no vacío pasan a la validación monetaria existente. Se retiró la validación duplicada de la ruta de previsualización. Clientes previos con conteo válido mantienen cierre/reintento.

La UI valida que la revisión recibida corresponda al turno, cantidad y notas actuales, tenga resumen coherente, token presente y fecha de vencimiento válida. Si hay diferencia debe describirse en las notas antes de confirmar; volver al conteo permite modificar notas y revisar otra vez.

## Evidencia

- Build API aprobado.
- Helpers caja/clientes:12/12; nuevo caso verifica revisión vigente vs turno/count/notas/vencimiento incoherentes.
- QA previsualización:7/7 SQLite y7/7 PostgreSQL aislado. Incluye conteo ciego, no escritura al revisar, identidad/caja/notas, vencimiento, movimientos con saldo neto0, venta de tarjeta, carrera de cierre/movimiento, reintento y compatibilidad anterior.
- Regresión caja SQLite:21/21. La primera ejecución encontró aserciones antiguas que comparaban instancias Decimal con números. Se adaptaron únicamente esas comparaciones, conservando las mismas cantidades esperadas; segunda ejecución aprobada.
- PostgreSQL temporal se detuvo al terminar; cluster previo y bases de presentación intactos.

No se midió ahorro frente a un grupo de control; no se afirma que Ponytail haya hecho este bloque un porcentaje más rápido. Falta recorrido navegador del cierre guiado actual, actualización de preview/API de copia y prueba física de impresora. PC12 permanece En curso.
