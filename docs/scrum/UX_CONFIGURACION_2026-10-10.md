# Revisión independiente — Configuración y reservas

Fecha: 10/oct/2026. Primera revisión: capturas previas y lectura de código. No se operó el navegador, no se guardaron datos ni se ejecutaron pruebas en esta revisión. ST-31 global permanece pendiente; este informe no acredita su cierre.

## Recorrido actual, fortalezas y problemas

1. **Encontrar dónde configurar.** `01-inicio-antes.jpg` muestra un resumen legible, menú agrupado y acceso persistente a reservas. El encabezado y el menú usan «Mi página de reservas» para destinos distintos: el encabezado abre la página pública y el menú abre su editor (`Navbar.tsx:34,59`). «Configuración» aparece separado al pie y abre un modal; el usuario necesita descubrir dos lugares para una misma identidad pública. Propuesta: una entrada Configuración y pasos de datos del negocio, apariencia, equipo y revisión pública; distinguir «Editar» de «Ver página».

2. **Datos del negocio.** `02-configuracion-antes.jpg` agrupa nombre, contacto y dirección con guardado visible. **P1:** el mensaje de ticket es editable (`ConfiguracionModal.tsx:36,200`) pero no forma parte de `handleSubmit` (`:61`) ni de los campos actualizados por API (`auth.routes.ts:261–296`). Cambiar sólo ese mensaje produce confirmación de configuración actualizada sin persistir ese cambio. Retirar el control y la promesa de tickets hasta tener implementación o completar su contrato y consumo real.

3. **Compartir enlace.** **P1:** el modal presenta `/#reservar?barberia=` (`ConfiguracionModal.tsx:142`); la compatibilidad de App redirige cualquier hash que contiene reservar a `/b/el-bigote` (`App.tsx:68–71`). El editor sí usa `/b/${slug}` (`PersonalizarLandingView.tsx:86`). El enlace orientativo del modal puede enviar clientes a otro negocio. Usar una única URL canónica del slug persistido, avisar cuando el enlace editado aún no se guardó y no confirmar copia sin esperar el resultado del portapapeles (`PersonalizarLandingView.tsx:123`).

4. **Personalizar apariencia.** `03-personalizacion-antes.jpg` ofrece pasos numerados, ejemplos de portada y vista previa: buena base para un recorrido guiado. **P2:** nombre/slug y teléfono público se editan en dos formularios; el editor se sincroniza sólo al cambiar `currentTenant.id` (`PersonalizarLandingView.tsx:88–102`). Si se cambia el modal mientras está montado el editor, el estado viejo puede sobrescribir lo recién guardado. `telefono` y `whatsappPublico` además son campos distintos: aclarar finalidad y evitar duplicidad ambigua. La portada por defecto se muestra como selección ya hecha y se envía al guardar, aunque el usuario no haya elegido imagen.

5. **Publicar perfiles.** `04-reservas-antes.jpg` identifica sucursal y permite elegir profesional, con acción de reserva clara. **P2:** el editor rellena especialidad vacía con «Master Barber» y descripción vacía con una biografía genérica (`PersonalizarLandingView.tsx:112–113`), y guarda todos los perfiles, no sólo los editados. La captura muestra el mismo texto para tres personas, pero no demuestra cómo fue persistido. El código sí demuestra el riesgo de publicar credenciales/biografías no confirmadas. Mantener vacío y usar ejemplos como placeholder; exigir elección explícita para publicar información y ofrecer ocultar perfil sin eliminarlo. La API pública ya filtra activo/no eliminado/visible (`public.routes.ts:84`).

6. **Guardar y comprobar.** El editor guarda tenant primero y después cada barbero (`PersonalizarLandingView.tsx:136–165`). **P2:** un fallo intermedio conserva cambios anteriores y deja pendientes los siguientes; el error actual no identifica qué se guardó. No hay falso éxito global tras una excepción en ese bloque; sí hay persistencia parcial y riesgo de repetición innecesaria. Separar guardado por sección con resultado preciso o usar operación conjunta atómica. El API de configuración sí limita DUENO, usa tenant autenticado, transacción y auditoría (`auth.routes.ts:261,296`); colisión de slug responde 409 con texto útil. Estos son controles de implementación, no evidencia dinámica de permisos.

## Accesibilidad y límites de evidencia

El modal anterior carece de `role=dialog`, `aria-modal`, nombre accesible de cierre, manejo Escape y control/restauración de foco. Sus labels no se asocian mediante id/htmlFor; mensajes no tienen región de estado/alerta. La navegación sí tiene `aria-label`, elemento activo y botones móviles con nombre. Las capturas son de escritorio: no acreditan 320/375 px, zoom200%, teclado, lector de pantalla, persistencia ni contraste medido. No se atribuye WCAG aprobada por apariencia.

## Casos de aceptación para la revisión final

1. Dueño encuentra Configuración en una entrada; sabe en qué paso está, qué falta y cuál es el destino de Ver página. Gerente/cajero/barbero no pueden guardar por API ni URL directa; tenant B no modifica A.
2. Cada control editable persiste tras recarga y afecta su destino declarado. Ticket sólo aparece si guardado y consumo están implementados. Campos opcionales pueden borrarse sin volver por defecto.
3. URL copiada y vista previa corresponden al slug **guardado** del tenant; slug inválido/ocupado conserva formulario y explica error; cambio no guardado no se anuncia como publicado. Portapapeles fallido no anuncia «Copiado».
4. Editar datos y apariencia no sobrescribe cambios de otra sección ni perfiles intactos. Un fallo simulado de API no muestra éxito y distingue guardado parcial si existe. Cancelar/navegar tiene política visible para cambios sin guardar.
5. Biografía/especialidad/foto vacías permanecen vacías; no se publican ejemplos como hechos. Ocultar profesional lo retira del público y de la selección de reserva sin borrar historial.
6. Color/logo/portada y opciones de contacto se reflejan en vista pública al recargar; imagen inválida conserva diseño usable. Enlaces externos admiten únicamente destinos seguros. Datos de contacto no habilitan envío externo por sí mismos.
7. Teclado recorre pasos y controles con foco visible; labels tienen asociación; errores y éxito se anuncian; modal residual tiene cierre/Escape/foco correctos. Vista 375 px y zoom200% no oculta guardar, navegación ni contenido.
8. Ruta pública mantiene selección real de sucursal/profesional, disponibilidad y reserva; la revisión de estilo no constituye aceptación global de ST-31 ni de otros canales.

## Revisión final

Segunda lectura independiente del 10/oct: `ConfiguracionView.tsx`, `settings-experience.css`, App/Navbar, `bookingAppearance.ts`, PublicBookingView y contratos API. Fuentes en modificación concurrente por sus responsables; evidencia de navegador y compilación corresponde al líder/QA, no a esta revisión. No se editaron fuentes de aplicación.

### Mejoras comprobadas por lectura

- Configuración tiene una entrada única y ruta propia; landing-config redirige a apariencia. El ticket inerte dejó de exponerse en el flujo nuevo.
- Enlace público usa el slug persistido de tenant, no el borrador, y el portapapeles espera resultado antes de anunciar copia.
- Datos/estilo/contacto comparten borrador; cambio de sección no pierde valores. Perfiles y horarios permanecen montados aunque su sección esté oculta. Cambio confirmado de sucursal descarta por remontaje deliberado, no por accidente.
- Perfiles vacíos permanecen vacíos, sin biografías inventadas, y cada profesional se guarda por separado. Éxito de un perfil no anuncia guardado global del resto.
- El guardado del negocio envía sólo campos cambiados, adopta respuesta del servidor y conserva borrador al fallar. La revisión pública respeta opciones de visibilidad, tiene alternativa ante imagen fallida y usa enlaces sociales filtrados por proveedor.
- Labels envuelven controles, mensajes usan alert/status y CSS agrega foco visible y tamaños de interacción. El diálogo de descarte reutiliza OperationDialog con foco, Escape y restauración. Esto sigue sin certificar accesibilidad completa sin recorrido dinámico.

### P2 a resolver o documentar antes de aceptación

1. **Atrás/adelante del navegador evita el descarte protegido.** `App.tsx:61` sólo intercepta llamadas explícitas a navigateSafely; `ConfiguracionView.tsx:114` protege beforeunload, que no se dispara en navegación SPA por historial. Caso: entrar desde Resumen, editar, pulsar Atrás; la ruta se desmonta sin el diálogo y el borrador desaparece. Incorporar protección POP/historial o conservar borrador y recuperarlo al volver. Verificar en navegador, no sólo botones del menú.

2. **Cambio de sucursal mientras una petición está en curso.** El busy de cada formulario no se comunica a la navegación. Mientras BranchSettings.save espera (`ConfiguracionView.tsx:87–90`), seleccionar otra sucursal y confirmar descarte remonta; la petición anterior puede terminar y `App.tsx:423` llama setCurrentSucursal(updated), devolviendo selección a la sucursal anterior. Además «descartar» no cancela una escritura ya enviada. Bloquear salida/cambio durante guardado o actualizar la sucursal en la lista sin modificar selección si ya cambió, con política visible de petición en curso. Repro con respuesta de guardado demorada.

3. **Mensaje de éxito obsoleto después de volver a editar.** BarberProfile y BranchSettings limpian éxito al guardar/restablecer, pero no en los onChange (`ConfiguracionView.tsx:70–73,92–95`). Guardar y luego editar deja «Perfil … guardado»/«Sucursal y horarios guardados» visible junto a valores nuevos pendientes. Limpiar éxito al comenzar edición. El borrador del negocio ya sigue esa política.

4. **Validación alineada pendiente durante esta lectura.** Límites de nombre/dirección/slogan/WhatsApp del formulario diferían del schema; @handles eran presentados por frontend mientras API admitía sólo URL. El líder ya asignó y está corrigiendo ambos puntos: no duplicar trabajo, pero repetir pruebas de bordes con contratos finales. Campos de otra sección se incluyen en el patch si están sucios; al rechazar uno deben indicarse campo y sección para que el usuario encuentre dónde corregir.

El ajuste defensivo propuesto para sincronizar BarberProfile con la respuesta normalizada del servidor ya aparece en la segunda lectura (`:65`); no queda como defecto pendiente. No se encontró un P1 nuevo demostrable por lectura del flujo nuevo. La aceptación requiere evidencia dinámica de los casos anteriores; esta revisión no marca ST-31 validada.

### Tercera lectura — correcciones de navegación y estados

El líder notificó nueva revisión de fuentes. Se comprobó sin operar navegador:

- **P2 historial corregido en fuentes:** `main.tsx` monta createBrowserRouter/RouterProvider y App usa useBlocker para cambios de pathname cuando hay cambios pendientes o petición en curso. La condición cubre navegación por historial, además de botones. La ruta y la sucursal requieren confirmación; cancelación resetea el blocker y continuar llama proceed.
- **P2 cambio durante guardado corregido en fuentes:** ConfiguracionView agrega busy del negocio y mapa de peticiones de perfiles/sucursal y comunica onBusyChange a App. Diálogo de salida deshabilita sus acciones y Escape mientras está guardando; cambio de sucursal queda pendiente, sin ejecutar setCurrentSucursal hasta terminar. Comprobar respuesta demorada en navegador para cerrar este caso.
- **P2 éxito obsoleto corregido en fuentes:** efectos de BarberProfile y BranchSettings limpian mensajes al cambiar form y quedar dirty. Perfil también adopta la respuesta normalizada, con dirty calculado contra los datos actualizados.
- **No se identifica ciclo de efectos:** callbacks de perfiles/busy tienen referencia estable mediante useRef; setters entregados por App son estables; el objeto initial recreado no se incluye como dependencia de efectos. Cambiar un mapa sólo provoca notificación de estado; si el booleano de App no cambia, React no exige re-render sucesivo. Esta es comprobación de código, no una medición de renderización.
- Límites de negocio/dirección/frase/WhatsApp/correo del frontend ya se ajustaron al contrato observado. Social @handle continúa como contrato asignado al responsable backend; debe revisarse el schema final antes de su prueba.

**Observación menor nueva:** la confirmación de logout del diálogo usa `.catch` genérico, mientras handleUserLogout limpia sesión local al recibir 401. Si la sesión caducó antes de confirmar salida, el diálogo puede informar fallo de cierre en vez de completar la salida local ya procedente. Homogeneizar el manejo de 401; no se demuestra una revocación indebida ni un ciclo de promesas. La salida al cerrar sesión fue autorización explícita del usuario y no requiere aprobación adicional.

Los tres P2 anteriores se consideran **corregidos por lectura de fuentes, pendientes de recorrido de navegador**. QA dinámico pertenece al líder y debe registrar atrás/cancelar/descartar, respuesta demorada, fallo conservando cambios, re-editar tras éxito y reload. ST-31 sigue pendiente.

## Recorrido final del líder — implementación y evidencia

Resultado: un solo centro de configuración, presentación pública configurable y recorrido de reserva legible. Este avance anticipado de ST-31 resuelve configuración/reservas; no cierra el pulido integral del producto. Las capturas siguientes pertenecen a esta sesión y fueron guardadas e inspeccionadas. Cuenta y datos ficticios; escritorio y tamaño emulado de 390 × 844, no un teléfono físico.

### 1. Identidad y enlace — correcto en el recorrido observado

Una sola entrada Configuración. Nombre, logo y enlace juntos; compartir usa el slug guardado. La ruta anterior landing-config redirige al apartado de apariencia. Se retiró del flujo nuevo el campo de ticket sin guardado efectivo. Permisos de dueño e aislamiento comprobados por las suites backend. Falta probar portapapeles denegado en navegador.

![Identidad y enlace](<C:/Users/Sinhue/Desktop/POS Barberia/docs/screenshots/ux-20261010/16-identidad-final.jpg>)

### 2. Apariencia — guardado y recarga comprobados

Tres paletas, portada editorial o compacta, encuadre, slogan, bienvenida, texto de botón y visibilidad de cuatro secciones. La previa es un resumen y lo dice explícitamente. Se guardaron Océano/compacta/CTA/bienvenida de prueba; sobrevivieron a recarga y se reflejaron en público. Se ocultaron servicios/equipo sin impedir reservar. Al terminar se restauró Bosque/editorial/CTA predeterminada/bienvenida vacía y secciones visibles.

![Editor de apariencia](<C:/Users/Sinhue/Desktop/POS Barberia/docs/screenshots/ux-20261010/11-configuracion-final.jpg>)

### 3. Equipo — guardado individual comprobado

Borrador de especialidad conservado al cambiar de apartado. Perfil de Alex guardado y especialidad original restaurada. Volver a editar eliminó el éxito anterior y marcó cambios pendientes. Tres profesionales visibles en público; retratos rectangulares e iniciales cuando falta foto. Los valores demostrativos antiguos del fixture se conservaron, pero el código ya no inventa biografías para perfiles vacíos. Fotos por URL; subida directa de archivos sigue pendiente. Se guardó una foto inexistente del servidor local: el editor mostró «No pudimos cargar la imagen» y el público conservó iniciales; URL restaurada vacía al finalizar. Captura 20.

![Editor de perfiles](<C:/Users/Sinhue/Desktop/POS Barberia/docs/screenshots/ux-20261010/17-perfiles-editor-final.jpg>)

### 4. Contacto y redes — guardado y errores comprobados

Teléfono, WhatsApp, correo, dirección e Instagram/Facebook/TikTok en un lugar. Guardar @demo_uiux devolvió HTTPS canónico; URL de dominio suplantado produjo error específico sin perder el texto. Campo borrado nuevamente al finalizar. No se enviaron mensajes ni se abrieron redes externas.

![Contacto y redes](<C:/Users/Sinhue/Desktop/POS Barberia/docs/screenshots/ux-20261010/18-contacto-final.jpg>)

### 5. Sucursal y horarios — borrador correcto; guardado demorado sin prueba dinámica

Nombre/dirección, apertura/cierre, días y zona horaria de la sucursal seleccionada; horarios individuales remiten a Equipo y comisiones. Un nombre temporal sobrevivió al cambiar de apartado y Restablecer recuperó el original sin escritura. La protección durante peticiones se revisó en fuentes, pero no se simuló una respuesta demorada ni cambio a otra sucursal en navegador.

![Sucursal y horarios](<C:/Users/Sinhue/Desktop/POS Barberia/docs/screenshots/ux-20261010/19-horarios-final.jpg>)

### 6. Reserva pública y móvil — recorrido hasta datos comprobado

Portada, servicios con precio/duración y tres perfiles ordenados; en una sola sucursal se elimina un paso redundante. Flujo de cuatro pasos, opción de cualquier profesional, horario y resumen persistente. En escritorio y 390 px se recorrió servicio → profesional → fecha/horario → datos. Un cambio con teclado en el selector nativo consultó 47 horarios y permitió llegar al formulario; no se confirmó una cita nueva en la demo. La interacción fill del adaptador con type=date no notificó a React, por lo que se verificó mediante teclado nativo; no era un fallo de disponibilidad de API. El viewport quedó restaurado.

![Reserva pública](<C:/Users/Sinhue/Desktop/POS Barberia/docs/screenshots/ux-20261010/12-reservas-final-escritorio.jpg>)

![Paso de datos en tamaño móvil](<C:/Users/Sinhue/Desktop/POS Barberia/docs/screenshots/ux-20261010/13-reserva-movil-datos.jpg>)

## Verificación y límites finales

- Navegar desde Configuración con cambios y usar Atrás abrió el diálogo; seguir editando conservó valores. Guardado recargado correcto. Re-editar perfil quitó éxito obsoleto. Error de validación conservó el borrador.
- Móvil: documento de 385 px dentro de viewport 390 px en configuración y reserva; sin desbordamiento horizontal en las vistas medidas. Foco del selector nativo y cambio de paso observados. No equivale a certificación de accesibilidad ni prueba en teléfono real.
- Backend final: 15/15 personalización SQLite y 15/15 PostgreSQL reportadas por el responsable; 19/19 autorización SQLite. Pruebas adicionales del líder: 20/20 integridad de reservas SQLite en fixture separada, incluyendo concurrencia, permisos y conservación de dev.db. Sin repetir el cobro conciliado de ST-43.
- API y web compilan. Vite requirió ejecución autorizada fuera de la restricción de resolución de archivos. Bundle final JS 674.65 kB, gzip 182.33 kB; advertencia de tamaño conservada como tarea de rendimiento, no ocultada.
- Migración sólo sobre demo desechable: nueva columna Tenant.personalizacionWeb, 41 tablas anteriores y todos sus valores previos preservados al migrar. Backup/resultado en .tools/uiux-demo-upgrade-*. Durante QA sí se guardaron/restauraron preferencias y perfiles ficticios; no se afirma que la demo entera conserve su hash después de esas escrituras intencionales. dev.db y manifiesto intactos en verificación de upgrade.
- Pendientes de ST-31: móvil físico, lector de pantalla, tablas restantes, medición/división del bundle y feedback de piloto. Pendiente de la revisión acotada: salida con respuesta demorada y fallo de portapapeles.
- Sin compras, despliegue, credenciales nuevas, notificaciones externas ni servicios de pago añadidos. Demo Pro y proceso local quedan activos; editor de apariencia abierto para Sinhue.
