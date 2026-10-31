# PC-10 — Cotización profesional en agenda interna

14 de octubre de 2026. Fuente de producto congelada por este subagente; el coordinador conserva propiedad de la revisión visual final y añadió eventos `onInput` a fecha/hora después de esta entrega.

## Cambio

La nueva cita interna antes enviaba precio de catálogo y valores alternativos inventados (250 y 30 minutos), sin confirmar una tarifa profesional. Ahora consulta `getProfessionalCatalog` con sucursal, profesional y fecha/hora local elegidos, muestra precio/duración verificables y envía `precioConfirmado` y `precioEstimado` iguales a esa cotización. Precio desconocido, duración inválida, error o cotización antigua impiden confirmar. Un precio confirmado de cero sigue siendo válido.

La llegada presencial con profesional explícito reutiliza el mismo hook y consulta un instante ISO estable de esa llegada. Muestra la tarifa y envía su precio confirmado. La asignación automática existente conserva su comportamiento de catálogo; si el servidor exige revisar una tarifa propia, la interfaz indica elegir un profesional y cotizar antes de confirmar. No inventa un candidato ni autoriza otro precio. El rechazo definitivo libera la intención rechazada; una respuesta incierta conserva los datos y UUID anteriores.

El hook invalida la cotización al cambiar negocio, cuenta, rol, sucursal, profesional, servicio, fecha/hora o apertura del formulario. Los números de solicitud y el contexto descartan respuestas tardías. Un plazo de 20 segundos muestra error recuperable, invalida la respuesta posterior y permite reintentar. No se modificaron reglas de precios, catálogo, reservas históricas o API backend. Los cambios previos de selección de próxima visita del coordinador permanecen.

## Evidencia reproducible

```powershell
node scripts/test_agenda_price_quote.cjs
npx tsc --noEmit -p apps/web/tsconfig.json
```

`test_agenda_price_quote.cjs` existe en disco y ejecuta el hook real de `AgendaView.tsx` transpilado con ciclo controlado de hooks, promesas API y reloj falso. No copia la lógica del hook al test y no usa navegador, red o base.

Cinco comprobaciones ejecutadas:

1. Profesional Mateo cotizado en fecha/hora exactas devuelve 280; no hereda el catálogo por sustitución de la interfaz.
2. Cambiar profesional invalida inmediatamente la cotización; una respuesta anterior de Luis por 320 no reemplaza la respuesta actual de Alex por 250.
3. Precio faltante bloquea el resultado; al reintentar, cero confirmado permanece cero.
4. El plazo configurado es exactamente 20,000 ms. Al vencer libera el estado ocupado y mantiene error; una respuesta posterior por 999 se ignora.
5. Deshabilitar/cerrar el contexto elimina el precio y cancela el temporizador.

Resultado: **5/5 pasan**. TypeScript web pasó al congelar la fuente. El coordinador ejecuta la comprobación final tras sus eventos `onInput`.

## Límites

La prueba del hook no sustituye interacción de React DOM, selector nativo de hora, permiso del endpoint, creación real de la cita ni capturas móvil/escritorio. Esas evidencias corresponden al coordinador. No se marca PC-10 completo por estas cinco comprobaciones solamente.
