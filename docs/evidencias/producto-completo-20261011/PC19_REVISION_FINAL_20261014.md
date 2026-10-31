# PC-19 — Revisión independiente final de fuente y contraste

Fecha de revisión: 14 de octubre de 2026, America/Mexico_City. Alcance de este documento: solo lectura de fuente; cálculos de contraste; estados accesibles declarados; pendientes de aceptación. No se controló navegador, no se hizo auditoría externa, no se modificaron estilos o producto y no se cambiaron datos de demo.

## Qué se puede afirmar

Se revisaron `main.tsx`, `index.css`, `studio-identity.css`, `studio-operation-design.css`, `booking-experience.css`, `settings-experience.css`, `bookingAppearance.ts`, el diálogo común y fuentes de Ayuda, Acceso, Alta, Seguridad, Conexiones, Mensajes, Equipo, POS, Clientes, Reportes, Configuración, Importación y Búsqueda.

Hay tres paletas públicas implementadas: Bosque, Tinta y Océano. No encontré un conmutador de modo oscuro general para el panel interno; las superficies oscuras de navegación/caja no son otro tema completo. Por eso este documento no afirma una prueba de modo oscuro inexistente.

Los cálculos son evidencia matemática de pares de colores declarados, no mediciones de estilos computados del navegador. No acreditan por sí solos la cascada final, un degradado/foto, opacidad, estado hover/disabled, visión real de foco o ausencia de superposición.

## Método reproducible de cálculo

Para cada canal sRGB de un color hexadecimal: `c = canal/255`; si `c <= 0.04045`, linealizar con `c/12.92`; en otro caso, `((c+0.055)/1.055)^2.4`. Luminancia: `0.2126R + 0.7152G + 0.0722B`. Relación: `(Lmayor+0.05)/(Lmenor+0.05)`. Los resultados aquí se redondean a dos decimales únicamente al mostrarlos.

Referencia de evaluación empleada: 4.5:1 para texto normal, 3:1 para texto grande e indicadores visuales aplicables; no tratar adornos o elementos inactivos como si fueran texto de operación obligatorio. No se hizo una certificación WCAG completa.

## Colores principales y temas públicos

- Texto operativo `#23362e` sobre blanco: **12.82:1**.
- Texto secundario operativo `#52645a` sobre blanco: **6.31:1**.
- Texto secundario del estudio `#637066` sobre lienzo `#f5f3ed`: **4.68:1**.
- Texto secundario de caja `#59685f` sobre blanco: **5.88:1**.
- Botón interno blanco sobre bosque `#19352c`: **13.23:1**.
- Aviso de error `#862d24` sobre `#fff5f1`: **8.11:1**.
- Texto público `#182220` sobre blanco: **16.30:1**.
- Texto secundario público `#586761` sobre blanco: **5.95:1**.
- Placeholder público `#59665d` sobre blanco: **6.03:1**; CSS declara opacidad 1.
- Tema Bosque: blanco sobre primario `#183b32`: **12.28:1**; primario sobre lienzo `#f7f9f8`: **11.61:1**.
- Tema Tinta: blanco sobre primario `#292b32`: **14.13:1**; primario sobre lienzo `#f6f5f2`: **12.96:1**.
- Tema Océano: blanco sobre primario `#163c51`: **11.67:1**; primario sobre lienzo `#f1f6f7`: **10.71:1**.

Estos pares superan los umbrales indicados. Los acentos de Tinta/Océano tienen contraste bajo sobre blanco (1.67:1 y 1.55:1), pero la fuente los usa como acento decorativo, no como color principal de texto o foco: no se les atribuye un fallo funcional solo por ser claros.

## Foco y límites pendientes

- `studio-identity.css` declara foco `#a47b38`, 3 px, separación de 3 px: **3.46:1** sobre lienzo `#f5f3ed`, **3.84:1** sobre blanco y **3.45:1** sobre navegación `#19352c`.
- `index.css` declara foco forestal para `.operation-page` y `.public-booking`; los portales de `OperationDialog` llevan `.operation-page`.
- `booking-experience.css` declara foco del primario y un override blanco dentro del hero, cuyo par blanco/primario supera 11:1 en las tres paletas.
- `studio-operation-design.css`/`team-experience.css` también declaran latón `#b58b43`. Su contraste es **3.12:1** sobre blanco, pero **2.81:1** sobre lienzo. `main.tsx` importa `studio-identity.css` después de `index.css` y de App; hay reglas de igual especificidad cuyo resultado depende del orden final. No afirmo que el valor débil sea el estilo computado del foco. Confirmar `.counter-studio button:focus-visible` y `.team-page button:focus-visible` en el build vigente antes de cerrar este criterio.
- Límites de campos: borde `.studio-input` `#dce2d9` sobre fondo `#fafbf8`: **1.27:1**. Borde público `#dce2dd` sobre blanco: **1.32:1**. Son pares por debajo de 3:1; determinar en navegador qué límites/indicadores son necesarios para identificar el control y fortalecerlos donde corresponda. El foco de alto contraste no acredita el control sin foco.
- Eyebrow pequeño: `.studio-eyebrow` en `index.css` declaraba `#928675`, 9 px, sobre blanco: **3.57:1**. En Conexiones aparece en título auxiliar y categoría. Es texto normal pequeño: no supera 4.5:1. El coordinador recibió ubicación exacta para una corrección de raíz; volver a comprobar la fuente final si cambia este token.
- Navbar, etiqueta de rol `#789184` sobre bosque: **3.90:1**, 11 px. Texto secundario de navegación `#9bb0a3`: **5.75:1**; selección `#cfb58d`: **6.71:1**. El rol pequeño requiere revisar/corregir; no generalizar ese resultado a toda la barra.

Los puntos de contraste secundarios se comunicaron al coordinador; este documento registra el hallazgo y no presupone que los cambios posteriores estén ya verificados.

## Estados y recuperación observados en fuente

- `OperationState` anuncia cargas con role=status y proporciona estructura para vacío/acción contextual.
- Reportes muestra carga, error con reintentar y solo presenta datos cuando su consulta resuelta coincide con el periodo actual; no mezcla un resultado antiguo con un filtro nuevo.
- Búsqueda tiene guía inicial, buscando, error/retry y sin coincidencias; anuncia estado ocupado en resultados.
- Importación distingue error, fallo de almacenamiento, éxito y operación pendiente; controles bloqueados durante confirmación y recuperación del mismo lote.
- Configuración muestra mensajes de resultado y error, y deshabilita fieldsets durante guardado; la protección de navegación con cambios pendientes pertenece al coordinador/App.
- Ayuda ya explica límites reales del soporte; no simula envío de encuesta. Al cambiar guía se enfoca el título estable para evitar perder Escape por quedar en BODY.
- Acceso y Alta usan diálogo común y bloquean cierre durante solicitud; Alta expone retry al fallar sugerencias. En Seguridad se conserva confirmación explícita de cierre de sesiones.
- Equipo usa revisión previa a liquidación: IDs y montos copiados, comparación con lectura nueva antes de envío inicial, ámbito estable y recuperación que reconoce la misma intención financiera. Ese estado no borra la intención guardada al cambiar sucursal/cuenta.
- POS y caja guiada usan diálogos comunes con busy en procesos; conservar captura y resultado de los recorridos realizados por el coordinador para acreditar los modales superpuestos y la recuperación.

### Hallazgo de Clientes comunicado y asignado

Durante esta lectura `loadClientes` y `loadCampana` solo registraban errores en consola. Un fallo inicial podía confundirse con directorio vacío, y `loadClientes` no protegía el orden de respuestas de búsquedas sucesivas. El coordinador asignó la corrección a otro agente. No se modificó este archivo desde esta revisión; antes de cerrar PC-19 comprobar la corrección y su evidencia: fallo visible distinto de vacío, acción reintentar, y respuesta antigua ignorada tras cambiar búsqueda/sucursal.

## Criterios pendientes antes de marcar verificado

1. Confirmar estilos computados del foco y contrastes secundarios corregidos en build final; no usar capturas de un snapshot anterior para certificar el nuevo.
2. Completar 390×844, 768 px, escritorio y pantalla baja: ancho del documento sin desbordamiento general, desplazamiento acotado de tablas, títulos y controles alcanzables.
3. Tab/Shift+Tab/Escape y retorno al origen en Ayuda, Acceso, Alta, Clientes, Equipo y POS; modales anidados y operaciones ocupadas/inciertas no deben abandonar la intención.
4. Verificar estados cargando, vacío, error, guardando, incierto, éxito y permiso denegado con fallos controlados en fixture; observar que no se confunde ausencia de datos con error de red.
5. Medir al menos build/latencia local sobre ese snapshot, sin prometer ahorros universales; comprobar movimiento reducido.
6. Separar este cierre local de proveedor real, legal, impresora física y despliegue.

Conclusión de esta revisión: colores de texto/botones principales y tres paletas públicas tienen evidencia matemática favorable. La fuente muestra tratamiento explícito de modales y operaciones inciertas. No procede afirmar accesibilidad completa ni cerrar PC-19 solamente con estos cálculos: quedan contraste secundario/indicadores, la corrección asignada de Clientes y la evidencia del navegador a cargo del coordinador.
