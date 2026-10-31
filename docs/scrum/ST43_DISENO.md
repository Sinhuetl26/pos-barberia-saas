# ST-43 · Dirección y revisión de diseño

Fecha: 2026-10-09. Alcance: inicio del dueño, cobro móvil, caja/comisiones y reserva pública. Evolución de la dirección forest/brass existente. No se cambian permisos, cálculos, filtros, impuestos, custodia, corte ciego ni persistencia. Las cifras proceden del entorno; los datos ausentes se muestran como ausentes.

## Tokens compactos

| Token | Valor | Uso |
| --- | --- | --- |
| Forest | #19352c | Acciones principales, encabezado de operación, marca |
| Ink | #23362e | Texto y cifras |
| Canvas | #f7f8f5 | Fondo de trabajo |
| Surface | #ffffff | Formularios, listas y superficies de lectura |
| Brass | #b08751 | Identidad y separadores; no texto pequeño sobre blanco |
| Muted | #52645a | Texto secundario legible |

Estados semánticos conservan rojo/ámbar/verde junto con texto. Foco: contorno forest de 3 px separado del control. Tipografía: Plus Jakarta Sans existente; títulos 26–34 px, secciones 18–20 px, cuerpo 14 px y ayudas 12–13 px. Dinero con cifras tabulares, no fuente monoespaciada ornamental. Ritmo 8/16/24/32 px; panel de trabajo 12 px de radio, controles 8 px, sin sombras uniformes.

## Layout y jerarquía

**Inicio:** encabezado alineado a la izquierda con sucursal/fecha real y venta como acción; franja forest que concentra estado de caja, ventas y acceso a caja; próximas citas y pendientes operativos después. Se retira el bloque motivacional, las iniciales decorativas y la gráfica sin datos. El checklist de preparación sigue presente.

```
Sucursal / fecha                           Actualizar  Nueva venta
Estado de caja       Ventas hoy       Propinas       Abrir caja
Próximas citas / abrir agenda         Pendientes con sus acciones
Checklist de preparación (dueño)
```

**Cobro:** catálogo y resumen con jerarquía distinta. En móvil catálogo breve y resumen sin altura fija de pantalla; pago final en diálogo desplazable. Buscar/categorías permanecen; profesional/comisión y cliente se leen antes de artículos. Total y Cobrar forman un cierre visible. Iconos de cantidad tienen etiqueta y objetivo táctil; selección de medio/propina expone estado al teclado/lector.

```
Cobrar / sucursal                  Historial  Movimiento de caja
Buscar / categorías                  Resumen / profesional / cliente
Servicios y productos                Artículos / ajuste / total / Cobrar
```

**Caja/comisiones:** no se inventa saldo en Inicio. Accesos “Caja y entregas” y “Equipo y comisiones” llevan a vistas existentes. Estado abierto procede de openRegisters; métricas de propina permanecen separadas de ventas. Propiedad ampliada por el coordinador a `BarberosView.tsx` y `CashCustody.tsx`: entrega por persona con saldo e importe claramente separados, sección de turno abierto/cerrado y comisiones con filtro/selección legibles. Custodia y cierre ciego conservan datos y comportamiento. El estilo compartido mejora lectura, foco y tamaño táctil.

**Reserva:** marca y acción de reservar al inicio; únicamente portada configurada, sin fotografía externa ficticia. Sucursal, equipo y servicios conservan filtros. Fotos de barberos son identidad real, no decoración. Flujo con nombre del paso y avance real, resumen de servicio/precio y estados vacíos explicados. Confirmación conserva folio y enlace privado.

```
Nombre del negocio / reservar / consultar folio
Presentación breve                Portada configurada (si existe)
Sucursal elegida
Equipo real                       Servicios / precio / duración
Reserva: sucursal → servicio → barbero → horario → datos → confirmación
```

## Revisión contra clichés antes de implementar

- Se conserva forest/brass por ser dirección autorizada, sin degradados de adorno ni bloque motivacional con una frase destacada.
- Se sustituye la cuadrícula de cuatro métricas iguales por jerarquía operativa: caja/ventas/acciones. Ningún dato se rellena con una cifra decorativa.
- Sin etiquetas ornamentales en mayúsculas, numeración sin secuencia, flechas anexadas al texto ni perfiles con biografías inventadas. La numeración del flujo público sí corresponde a pasos reales.
- Una marca fuerte en la franja operativa; el resto prioriza formularios/listas legibles. El precio se conserva con centavos de presentación sin tocar cálculos.
- Estados de carga/error/vacío no simulan éxito ni cero; indican qué falta o qué acción existe para resolverlo.

## Verificación y límites

No se escriben vistas ni CSS hasta aviso de baseline del agente calidad_cierre. QA controla el navegador compartido y registra antes/después, escritorio/móvil emulado, teclado/foco y conciliación persistente. Este rol revisa código, dirección, estados y TypeScript una vez al finalizar. No se certifica hardware ni se declara ST-31 terminada.

## Implementación y revisión

Baseline preservada e inspeccionada por QA antes de escribir: `evidencia/st43-20261009/01-antes-inicio-escritorio.png` a `05-antes-caja-custodia.png`. Este rol también inspeccionó la captura de Inicio para contrastar jerarquía/legibilidad; no usó navegador.

Implementación realizada en `InicioView.tsx`, `PosView.tsx`, `PublicBookingView.tsx`, `BarberosView.tsx`, `CashCustody.tsx` e `index.css`. Componentes compartidos nuevos: `OperationState.tsx` y `OperationDialog.tsx`.

- Inicio: retirados bloque motivacional y gráfica con datos de relleno; ventas y propinas separadas, estado real de cajas, próximas citas, pendientes y accesos de caja/equipo/reportes. Checklist de preparación conservado.
- POS: vacío del carrito sin altura fija; resumen/total y enlace interno visibles antes del catálogo en móvil; profesional/comisión, cliente, categorías, descuento/propina e impuestos del ticket conservados. Cantidades con nombre accesible y objetivos de 44 px; selección expuesta con `aria-pressed`. Nueva presentación no cambia el cobro ni sus intenciones.
- Caja/custodia: importe recibido separado del pendiente de entregar; carga/error sin simular saldo cero; datos/loaded/error se reinician en el efecto de sucursal. Los usos existentes de CashCustody están ligados a `key={currentSucursal.id}`, por lo que una respuesta de una instancia desmontada no sobrescribe la nueva sucursal. Turno y comisiones tienen jerarquía, filtros/selección y vacíos útiles. Se conserva el corte ciego y el texto de confirmación financiera.
- Modales de apertura/cierre: diálogo nativo compartido, título asociado, foco inicial/restauración y ciclo Tab. Escape/Cancelar bloqueados durante envío; formularios y funciones financieras existentes conservados.
- Reserva: portada solo si está configurada; sin biografía/especialidad/horario inventados por la vista, sin barra fija que tape perfiles. Servicios muestran centavos; pasos reales con foco al avanzar, folio consultable con etiqueta y error anunciado, confirmación/enlace privado conservados.

Revisión `vercel:react-best-practices`: componentes compartidos definidos fuera de vistas; hooks antes de retornos; efectos con limpieza; flags derivados de resultados reales; sin nuevas consultas para métricas ni nuevas dependencias. Cambios de fetch limitados a estados visuales de carga/error. Se intentó preservar hashes previos de 15 handlers en una carpeta temporal del sandbox; esa carpeta no persistió entre ejecuciones y no se recuperó el registro. **No se afirma igualdad por hash.** El coordinador revisa handlers/payloads actuales y QA concilia persistencia.

TypeScript web: una ejecución de `tsc --noEmit` desde `apps/web`, con Node incluido en Codex, **código 0**. No se repitieron suites API ni se ejecutó Prisma. Build de producción y recorrido final corresponden al coordinador/QA.

Contraste calculado de los tokens usados: ink/canvas 12.02:1; muted/blanco 6.31:1; blanco/forest 13.23:1; texto secundario de franja/forest 9.98:1; enlace de franja/forest 9.42:1. Brass se reserva para identidad/separadores, no para texto pequeño sobre blanco. Estos cálculos no certifican cada combinación de las vistas heredadas.

Límites pendientes al entregar a QA: comprobar capturas finales y escritorio/móvil emulado; recorrido completo reserva → cobro → entrega → comisión → corte, datos persistidos y roles; diálogos/foco y distribución de catálogo/resumen. No se certifican impresoras/teléfonos reales, venta offline, entrega externa, tiempo comercial de cobro ni ST-31. No se alteran App.tsx, servicios, bases, Notion ni backlog.
