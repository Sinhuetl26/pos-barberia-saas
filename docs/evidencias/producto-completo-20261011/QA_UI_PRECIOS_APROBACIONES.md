# QA independiente UI PC-10 / PC-11 —13octubre

Ponytail full: cambios mínimos sugeridos sobre los puntos compartidos existentes. No se editó producto ni se tomó navegador. PC-10/11 API18PASS anteriores no requieren repetición idéntica si contratos permanecen.

## P1: rechazo comercial definitivo mantiene cobro bloqueado

`pos.routes.ts` solo marca definitivo SaleError400, y `pendingSaleCanBeReleased` solo acepta400 definitivo. Nuevas respuestas de tarifa/aprobación403/409 (`PRICE_CONFIRMATION_REQUIRED`, `DISCOUNT_APPROVAL_INVALID`, `APPROVAL_CART_CHANGED`, `APPROVER_UNAVAILABLE`, `DISCOUNT_LIMIT_EXCEEDED`) corresponden a transacción revertida, pero POS retiene intención y muestra recuperación infinita del mismo payload rechazado. No permite refrescar tarifa/renovar aprobación.

Se ejecutó helper real transpilar/vm: aun con flag definitivo true, PRICE_CONFIRMATION_REQUIRED409, DISCOUNT_APPROVAL_INVALID409 y DISCOUNT_LIMIT_EXCEEDED403 retornanfalse. SALE_RESULT_UNKNOWN500 también retornafalse correctamente. Solución sugerida: servidor marca solo rechazos comerciales conocidos sin commit, helper acepta flag explícito y statuses pertinentes. Nunca liberar respuesta perdida,5xx ni IDEMPOTENCY_CONFLICT por conveniencia.

## P1: solicitud rechazada/usada/expirada no puede renovarse desde UI

DiscountApprovalRequest cuando tiene row siempre muestra solo «Comprobar autorización». Refresh de expirada invalida callback pero mantiene row; no existe «Solicitar nueva» ni reset de solicitud. Usuario debe modificar carrito artificialmente para desbloquear nueva solicitud. Además autorización recibida no se invalida por tiempo en padre: approvalValid solo compara context, hasta que servidor rechace.

Añadir renovación explícita para estados terminales/vencidos, limpiar aprobación de padre y vencer estado al tiempo real. Preservar pendingdurable para solicitudes inciertas; no borrar referencia desconocida.

## P2: regla frontend usa descuento bruto, total/backend lo recorta

Subtotal100/descuento200: totalfrontend recorta100, pero needsDiscountApproval usa200 y exige autorización aun con límite propietario100%. API calcula descuento100 y responde APPPROVAL_NOT_REQUIRED. Entrada no tiene maxsubtotal. Validar monto o comparar descuento realmente aplicado, manteniendo presentación/total/carrito coherentes. No eliminar autorización cuando descuento efectivo sí supera límite.

## P2: respuesta anterior puede alterar estado de nuevo scope

DiscountApprovalRequest send guarda serial/context para setRow, pero setPending(null),setError y finallybusy ocurren sin validar scopekey. Cambiar usuario/sucursal mientras request vieja responde puede limpiar pending recuperado de scope nuevo en estado React. Storage sigue reteniéndolo, por lo que el servidor no pierde intención; sí puede esconder aviso y liberar onLock temporalmente. Restringir todas las actualizaciones al key/context vigente y preservar limpieza de storage original.

## Satisfactorio por código

- Consulta de precios usa serial/active y bloquea cobro si precio no confirmado.
- Servicios de cita conservan snapshots al refrescar catálogo, y totales se calculan en centavos.
- Cambiar carrito/método/motivo invalida aprobación contextual.
- Recovery de venta consulta intención antes de reenviar, evitando duplicación.
- Pendings scopedtenant/user, callbacks estables viaref y almacenamiento fallido bloquea envío.

Los hallazgos fueron enviados al coordinador/backend. Falta confirmar corrección con helpers y recorrido de expiración/precio cambiado desde navegador. No se certifica UX usando solo build/API.
