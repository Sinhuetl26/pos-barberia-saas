# PC-18 — Revisión de cierre de personalización de reservas

14 de octubre de 2026. Revisión independiente del alcance original de `PLAN_PRODUCTO_COMPLETO_2026-10-11_1815.md`, PC-18. No navegador, bases de demo ni servicios externos. Fuente congelada tras corregir dos fallos reproducidos y reejecutar sus regresiones.

## Alcance y fuente

El criterio original pide conservar tres temas y dos portadas, portada/perfiles/secciones, galería opcional con título/alt/orden/ocultar, descripción por servicio, instrucciones de llegada y políticas informativas. La página debe funcionar sin contenido opcional, conservar selección al entrar por servicios/equipo, cargar galería diferida y no inventar reseñas, ubicación o referencias privadas. Almacenamiento/subidas externos quedan para conexiones.

Fuentes leídas: `booking-personalization.service.ts`, guardado en `auth.routes.ts`, `bookingAppearance.ts`, `ConfiguracionView.tsx` y `PublicBookingView.tsx`. Sólo se editó producto en **`apps/api/src/services/booking-personalization.service.ts`**, con autorización posterior del coordinador. No se editaron frontend, API cliente, rutas, esquema ni configuración de demo.

## Fallos encontrados, corregidos y verificados

1. **Parches parciales borraban contenido omitido.** Tras guardar tres fotos, cambiar sólo `{tema, portada}` eliminaba galería. Zod aplicaba valores predeterminados internos incluso al esquema parcial: `mostrarGaleria:false`, `galeria:[]`, instrucciones/políticas vacías y descripciones `{}` llegaban al merge. Se creó un esquema de parche que conserva las validaciones pero quita esos cinco defaults antes de hacer cada campo opcional. El esquema completo y la normalización de datos antiguos conservan sus defaults. La regresión recorre las seis combinaciones tema/portada y verifica que los cinco campos omitidos permanecen íntegros.
2. **Validación backend/frontend desalineada.** API aceptaba `https://photos.fixture.invalid/reservas/fixture-private/referencia`, aunque el render público la descartaba. Se alinearon rutas privadas, claves sensibles y máximo de URL de galería (2,000 caracteres) con el helper web. HTTPS obligatorio, sin credenciales ni fragmentos. Se rechazan variantes codificadas, rutas de referencia y parámetros `auth`/`api.key`, de forma atómica.

No se afirmó que esos enlaces ficticios contuvieran fotos reales: se probó aceptación/rechazo de su estructura, sin solicitarlos. Ocultar una foto sigue siendo una opción de presentación, no convierte su URL pública en un secreto.

## Evidencia reproducible ejecutada

```powershell
npm run build:api
node scripts/test_booking_gallery_ui.cjs
node scripts/qa_pc18_personalization.cjs
node scripts/qa_isolated_postgres.cjs qa_pc18_personalization.cjs
```

- Compilación backend: pasa.
- Helper de galería web: **5/5 pasan** (defaults, HTTPS/privacidad, orden/ocultación, datos incompletos y límites).
- Nuevo recorrido API en SQLite desechable: **7/7 pasan**. Comprueba ausencia de contenido opcional; persistencia pública de título/alt/orden/visibilidad/textos; aislamiento entre negocios; seis variantes sin pérdida de datos; escritura exclusiva de dueño y rechazo de descripciones ajenas; entradas inválidas atómicas; quitar/desactivar galería; rechazo de referencias privadas y URLs excesivas.
- Retoma PostgreSQL: **7/7 pasan, 0 fallos**, mismo script mediante el runner aislado y cliente Prisma separado; ejecución terminó con código 0. Se coordinó antes con `search_review`, que confirmó su propio clúster detenido y el puerto 55413 libre. El runner creó un clúster nuevo y al finalizar informó `Disposable PostgreSQL stopped; no preexisting process was stopped.`

La fixture crea negocios, usuarios, servicio y equipo ficticios propios; JWT de prueba; proveedores deshabilitados; API en un puerto efímero. Al terminar se detienen únicamente su API y Prisma y se elimina su base/esquema desechables. No se cargan fotos, no se envían mensajes y no se ejecuta una reserva o un cobro. PostgreSQL se ejecutó sólo mediante URL protegida y cliente separado. No se tocó el clúster anterior ni se cerraron procesos ajenos.

## Confirmaciones de fuente, no de navegador

- Configuración permite agregar hasta 12 fotos con título, descripción accesible, mover arriba/abajo, ocultar y quitar. Impide guardar imágenes incompletas o enlaces privados.
- Página pública filtra fotos ocultas, muestra título/alt y usa `loading="lazy"`, `decoding="async"`; la imagen fallida muestra «Foto no disponible» y no tiene una acción financiera asociada.
- Descripción del servicio aparece en la presentación y en su selección. Instrucciones/políticas se muestran antes de confirmar; el texto no activa depósitos ni reglas automáticas.
- Servicios y equipo tienen acciones propias de entrada a la reserva; tema/portada se conservan en el modelo. Nada de lo anterior acredita todavía contraste, foco o legibilidad real.

## Comprobaciones GUI: lista original para root

1. **Seis variantes en móvil 390×844:** Bosque/Tinta/Océano × Editorial/Compacta. Revisar textos, precios, CTA, perfiles y galería sin desbordamiento; poder iniciar reserva en cada variante. Contraste/foco visible no se deducen de las pruebas API.
2. **Contenido opcional ausente:** sin portada, fotos de barbero, galería ni descripciones. Confirmar sustitutos legibles y completar la selección hasta horario sin una imagen obligatoria.
3. **Editor y persistencia:** agregar dos fotos ficticias autorizadas, título/alt, invertir orden y ocultar una; guardar, recargar configuración y página pública. La visible conserva su posición/título; la oculta no se muestra. Cambiar sólo tema/portada y comprobar que galería/textos siguen intactos.
4. **No bloquear reserva:** con galería larga o imagen que falle, usar CTA superior, CTA de galería y acción móvil; navegar al servicio sin esperar a que carguen imágenes. La foto fallida debe mostrar sustituto sin impedir continuar.
5. **Entrada desde servicio:** pulsar un servicio concreto, comprobar sucursal/servicio correctos y regresar sin sustitución silenciosa. Repetir desde «Elegir a [barbero]» y verificar que profesional permanece seleccionado al pasar por servicios/horario.
6. **Textos informativos:** guardar descripción de servicio, llegada y política; confirmar texto exacto tanto en presentación/selección como antes de reservar. Ninguna política de texto debe crear cargos o cambiar precios.
7. **Teclado y tamaño:** alcanzar editor, orden/ocultar, enlaces de secciones y CTA con Tab; etiquetas de campos y alt comprobables. Revisar 768 px, escritorio y pantalla baja, además de las seis variantes móviles.
8. **Negocio/permisos:** en otra demo ficticia, confirmar que no aparecen galería, textos o descripciones del primero. Barbero/gerente no deben disponer de guardado del dueño aunque puedan ver su página pública.

## Avance visual comunicado por el coordinador

Después de la lista inicial, root informó comprobadas las seis variantes a 390 px, guardado/recarga, orden/ocultación, sustituto de imagen fallida sin bloquear reserva e instrucciones antes de confirmar. Se localizaron en disco las seis capturas `pc18-{bosque,tinta,oceano}-{editorial,compacta}-390-20261014.jpg` y `pc18-galeria-fallo-recuperable-20261014.jpg` en esta carpeta. Ese recorrido pertenece a root; este subagente no manejó ni inspeccionó el navegador.

Los puntos adicionales de la lista (ausencia total de fotos, entradas concretas desde servicio/equipo, teclado, 768 px/pantalla baja y permisos visuales) no se convierten en verificados por deducción de API o de archivos presentes. El coordinador debe conciliar sus evidencias finales.

Estado de esta entrega: validación y persistencia API comprobadas en **SQLite y PostgreSQL**, dos fallos corregidos; avances visuales comunicados por el coordinador. No se cambiaron estados de historia ni se afirmó verificación de navegador independiente por este subagente.
