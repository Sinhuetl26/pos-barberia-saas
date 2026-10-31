# Plan de página de reservas para la demo comercial

Fecha: 11 de octubre de 2026, America/Mexico_City.
Estado: ejecución única iniciada a las 08:00:23 del 11 de octubre de 2026. UI implementada y recorrido local verificado; aceptación completa pendiente de zoom real y los límites detallados en el reporte. No repetir esta ejecución.
Automatización vinculada a este chat: `reservas-high-end-demo-a-las-8`, creación confirmada por la app.

Resultado: [reporte y pendientes](../evidencias/reservas-demo-20261011/REPORTE.md). Demo ficticia: http://127.0.0.1:5179/b/estudio-norte-demo. ST-31 y ST-44 conservan su aceptación global pendiente.

## Objetivo y alcance

Que un cliente reconozca la barbería, compare servicios y complete una reserva desde su celular con claridad. La demo debe demostrar que la cita llega a la agenda del dueño y puede continuar al cobro. No promete ahorro medido, captación de clientes, operación sin conexión ni WhatsApp automático.

Este trabajo es un avance acotado de ST-31 y preparación de ST-44; no cierra ambas historias ni autoriza producción. Se conserva el backend de reservas, permisos, privacidad, recuperación de intentos y foto de referencia. No se cambian precios, licencias, caja o comisiones por razones visuales.

## Dirección visual

Una barbería contemporánea con fotografía protagonista, composición limpia y detalles discretos que recuerden materiales del oficio. Alineación izquierda, espacios definidos por jerarquía y una acción principal. Evitar copiar negro/dorado de BLUM o llenar todo de tarjetas idénticas.

Paleta propuesta, compatible con Bosque: verde profundo #183B32 para identidad, blanco #FFFFFF para superficies, gris claro #F7F9F8 para fondo, tinta #182220 para texto, gris #586761 para información secundaria y cobre #AD7652 para detalles. Verificar contraste antes de aplicar: cobre no se emplea automáticamente como texto pequeño o fondo de botón.

Tipografía propuesta: Barlow Condensed en títulos breves y Source Sans 3 en textos y controles, con fuentes locales y licencia revisada durante implementación; si no hay assets disponibles, conservar fuentes locales existentes y registrar el pendiente. No bloquear el funcionamiento por una descarga externa de fuentes. Texto base 16 px; título principal adaptable entre 36 y 64 px; botones táctiles de al menos 44 px.

La única zona visualmente protagonista será la portada. Servicios, equipo y contacto mantienen una lectura tranquila. Animación breve solo para explicar transiciones, respetando reducción de movimiento.

## Composición prevista

```text
Escritorio
Logo + nombre + sucursal                 Mi reserva
Nombre / frase breve / Reservar          Foto principal
Servicios con precio y duración          (lista compacta)
Equipo con retratos amplios y elección de profesional
Información de visita: dirección, horarios y contacto
Privacidad / Reservas con Systech

Celular
Logo + nombre / Mi reserva
Foto + nombre + frase + Reservar
Servicios
Equipo
Información de visita
Acción inferior Reservar si la principal salió de pantalla
```

La acción inferior móvil no debe tapar contenido, teclado, avisos ni botones del formulario. El pie elimina una invitación adicional redundante. La página pública de clientes no ofrece compra del SaaS ni configuración; acceso al panel solo para dueño autenticado del mismo negocio, separado de reservar.

## Cambios concretos por entrega

### 1. Preparar contenido de demostración

- Crear una fixture comercial identificada como ficticia, separada de Dueño Virtual R01 y de datos reales. Conservar sus pruebas, horarios y registros.
- Nombre y sucursal presentables; tres barberos con especialidades distintas, sin credenciales o experiencia inventadas. Cuatro servicios simples con duración y precio; no implementar motor de paquetes en este cambio.
- Horarios comerciales de ejemplo y disponibilidad coherente con sucursal y personal. No cambiar el horario de QA para embellecer la demo.
- Portada y retratos con derecho de uso. Si se usan imágenes ilustrativas o generadas, rotularlas como demostración; no atribuirlas a un negocio real, trabajo realizado o empleado real.
- Datos de contacto ficticios claramente identificados y enlaces externos deshabilitados cuando no existe un destino válido. No enviar WhatsApp, correos o reservas a una barbería real.

### 2. Rehacer portada y navegación pública

- Logo/nombre legibles y sucursal solo cuando ayude a orientarse. Mi reserva como acción secundaria.
- Foto protagonista con encuadre configurable; nombre real del negocio y frase breve, sin promesas de resultados.
- Un CTA coherente llamado Reservar cita. Eliminar repetición visual innecesaria de la misma invitación.
- Sin foto: composición intencional con identidad tipográfica, sin simular que una imagen rota o genérica pertenece al negocio.

### 3. Pulir servicios y equipo

- Precio y duración alineados y fáciles de comparar. Nombre sin duplicar el importe, descripción opcional y categorías solo si existen datos.
- Seleccionar servicio abre el flujo conservándolo. Seleccionar barbero conserva su identidad; compatibilidad con servicio/sucursal se valida antes de consultar horario.
- Retratos cuadrados amplios, nombres y especialidad confirmada. Sin fotografía, iniciales; sin biografía, omitirla. Los tres profesionales visibles corresponden a la configuración real de la fixture.
- No etiquetar Más reservado, recomendaciones de clientes o estrellas sin evidencia. Un destacado del dueño, si se añade posteriormente, deberá identificarse como tal.

### 4. Pulir la reserva paso a paso

- Una sucursal: omitir su paso; varias: exigir selección explícita. Mantener servicio → profesional → horario → datos sin introducir preguntas redundantes.
- Resumen de servicio, profesional, fecha, duración y precio en escritorio; versión compacta en móvil. Cualquier profesional conserva la asignación real devuelta por servidor.
- Cambiar una selección invalida únicamente las dependencias necesarias. Atrás conserva datos compatibles. Foco y anuncio accesible al cambiar de paso.
- Distinguir horarios cargando, día sin disponibilidad y error. Ofrecer próximo día consultable y reintento; no presentar datos pendientes de carga como cerrado.
- Formulario mínimo: datos necesarios, consentimiento aplicable y preferencias/foto opcionales claramente secundarias. No exigir cuenta al cliente.
- Deshabilitar confirmación mientras procesa foto o reserva. En fallo conservar datos y recuperar el mismo intento; no generar otra cita por repetición.

### 5. Confirmación e información de visita

- Mostrar reserva confirmada únicamente por respuesta válida del servidor. Folio, servicio, profesional, fecha y total legibles; opciones de consulta/reprogramación solo según permisos existentes.
- Mensaje que distingue cita registrada de pago recibido. No sugerir WhatsApp enviado o cargo procesado si no ocurrió.
- Horarios y dirección reales de la fixture; contacto vacío se omite. Privacidad accesible sin perder el formulario.

### 6. Personalización para mostrar al dueño

- Aprovechar temas Bosque/Tinta/Océano, portada editorial/compacta, encuadre, bienvenida y visibilidad existentes. Mantener sus contratos y datos guardados.
- Mostrar un cambio de identidad y verificar que persiste al recargar y aparece en la página pública. Evitar extender a un constructor libre de páginas.
- Si se incorpora una opción nueva, completar formulario, validación, persistencia, lectura pública y valor por defecto compatible. No exponer controles decorativos sin efecto.

## Orden de ejecución futura

1. Leer instrucciones vigentes y estado del repositorio; localizar cambios en curso y el entorno de pruebas.
2. Capturar estado anterior y verificar servidores/fixture. Preparar assets y contenido aislados.
3. Implementar portada, servicios, equipo y contacto con estilos limitados al área pública.
4. Pulir pasos y confirmación conservando lógica de integridad y recuperación.
5. Verificar personalización y hacer recorrido funcional completo.
6. Capturar escritorio/móvil, documentar resultados, actualizar guion de ST-44 y dejar URLs de demo. Reportar fallos o pendientes sin marcar historias globales como completas.

No existe compromiso de terminar a una hora concreta; las 08:00 son el inicio programado. No ejecutar código del producto antes de ese inicio autorizado.

## Criterios de aceptación de la entrega

- Probar 375/390 px, tablet 768 px y escritorio 1440 px emulados; no confundirlo con dispositivo físico. Sin desplazamiento horizontal ni acciones tapadas.
- Teclado, foco visible, cierre de diálogos, zoom 200%, textos largos, imágenes fallidas y secciones ocultas conservan una reserva usable. Medir contraste.
- Visitante normal solo ve experiencia de la barbería. Dueño visualiza su propia página y vuelve a su panel sin perder sesión.
- Completar una reserva ficticia y verificar una sola cita en la agenda correcta, con profesional, horario y referencia privada correctos. Probar doble clic, conflicto de horario y recuperación de respuesta perdida con las suites correspondientes, no por apariencia.
- Verificar que el cambio de estilo no afecta cobro, entrega, comisión ni corte del recorrido demo. Reutilizar evidencia previa cuando no haya cambios en ese alcance y ejecutar regresión pertinente.
- Nombre, portada, tema, visibilidad y perfiles persisten al recargar. No publicar perfiles ocultos o datos de otra sucursal.
- Revisar tamaños de imágenes, fuentes y carga móvil; evitar assets innecesarios. Registrar bundle/mediciones y limitaciones, sin afirmar rendimiento aprobado en un teléfono no probado.
- Entregar capturas antes/después, checklist de resultados y guía corta del recorrido; demo comercial aislada del fixture de QA.

## Ejecución programada y laptop

Se creó una automatización de ejecución única en este chat para las 08:00 del 11 de octubre de 2026, America/Mexico_City. Esta programación no crea una tarea de Windows para despertar o desbloquear la laptop ni modifica sus ajustes de energía.

Para trabajo local programado la documentación exige máquina encendida, app de escritorio ejecutándose y proyecto disponible. Se necesitarán conexión y uso disponible. No se garantiza interacción visual con Windows bloqueado sin comprobar esta instalación; la edición de archivos en segundo plano y el control visual son capacidades distintas.

No puedo encender una laptop apagada ni reanudarla desde hibernación por esta conversación. Un mecanismo de encendido/despertar e inicio automático dependería de Windows y del hardware y requeriría configuración y una prueba aparte. No se propone desactivar contraseña ni bloqueo.

Fuente oficial consultada: https://learn.chatgpt.com/docs/automations?surface=app

Programación autorizada por el usuario y confirmada por la app. La automatización tiene una sola ocurrencia y el plan como alcance; su ejecución efectiva depende de que el entorno local esté disponible.
