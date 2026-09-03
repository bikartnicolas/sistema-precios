# Registro de cambios

Historial de lo que se fue construyendo en el sistema de etiquetas de precios.
Lo más nuevo va arriba.

---

## 2026-09-03 · Usuarios con permisos

El sistema ahora pide usuario y contraseña cuando corre en la red. Vienen dos creados:

| Usuario | Rol | Puede |
|---------|-----|-------|
| `nico` | Administrador | Todo: cargar, guardar, borrar y respaldar listas, ver cambios de precio, imprimir |
| `invitado` | Invitado | Solo etiquetas: elegir productos, cambiar formato e imprimir |

**El invitado no puede tocar las listas de precios**: no puede cargar un Excel nuevo,
guardar, borrar ni restaurar listas, ni entrar a la pantalla de cambios de precio, ni
descargar la copia de seguridad. Sí puede imprimir cualquier etiqueta y cambiarle el
formato, y sus etiquetas también muestran el precio anterior tachado en las bajas.

**Los permisos los hace cumplir el servidor**, no la pantalla: aunque alguien intente la
operación por afuera del sistema, el servidor la rechaza con un 403. Esconder los botones
es solo para que la pantalla no ofrezca cosas que van a fallar.

**Detalles**

- Las contraseñas se guardan cifradas (scrypt con sal por usuario), nunca en texto.
- Tras varios intentos fallidos seguidos desde la misma computadora, hay que esperar.
- La sesión dura 30 días y sobrevive al reinicio del servidor; el botón **Salir** la cierra.
- `datos.js` (que tiene la lista de precios) no se entrega sin haber entrado.
- La barra de arriba muestra quién está usando el sistema y con qué rol.
- Comandos: `npm run usuarios` (ver), `npm run clave <usuario>` (cambiar contraseña),
  `npm run usuarios -- nuevo <nombre> <rol>` y `-- borrar <nombre>`.
- Cambiar una contraseña tiene efecto al instante: el servidor relee el archivo de
  usuarios sin necesidad de reiniciarlo, y cierra las sesiones abiertas de ese usuario.
- No se puede borrar al único administrador.
- Abierto como archivo suelto no hay usuarios: es una copia personal en una sola
  computadora, sin servidor que pueda hacer cumplir nada.

---

## 2026-09-03 · Servidor en la red interna y listas guardadas en archivos

El sistema puede seguir usándose como archivo suelto, pero ahora también puede correr
como servidor en una PC de la distribuidora. Eso resuelve dos cosas de una:

**Los datos ya no dependen del navegador**

- `scripts/servidor.js` guarda cada lista como un archivo en `datos/listas/`.
  No se pierden si alguien limpia los datos de navegación, se reinstala Windows o se
  usa otra computadora.
- Se respaldan copiando esa carpeta (por ejemplo, sincronizándola con Drive).
- Desaparece el límite de 8 listas del navegador.
- El servidor recrea la carpeta si alguien la mueve o borra, en vez de fallar.

**Cualquiera de la distribuidora puede entrar**

- Se entra desde `http://IP-de-esa-PC:8080`, sin instalar nada.
- Todos ven **el mismo historial**: si uno carga la lista del lunes, el resto ya la tiene.
- Si otro ya subió la misma lista, la comparación se hace contra la anterior, así no
  aparece un "sin cambios" engañoso.
- Al arrancar, el servidor muestra la dirección de red para pasarle al resto.

**Detalles**

- El sistema detecta solo si está como archivo suelto o en el servidor, y lo muestra en
  la pantalla de inicio.
- Si el servidor no responde, **avisa en pantalla** en vez de aparentar que no hay
  historial (que era el riesgo de trabajar creyendo que se guardaba).
- Para traer el historial de la versión anterior: *Descargar copia* desde el archivo
  suelto y *Traer una copia* en el servidor. El navegador no comparte lo guardado entre
  `file://` y `http://`, así que el archivo de copia es el puente.
- El servidor no usa librerías externas y bloquea el acceso a archivos fuera de `web/`.
- Guía de instalación paso a paso en `INSTALACION.md`, incluido cómo dejarlo arrancando
  solo con Windows y cómo respaldar.

---

## 2026-09-03 · Historial de listas y etiquetas que se ajustan solas

### Almacenamiento y comparación

- **Historial de hasta 8 listas** en vez de una sola "lista base". Cada lista que se
  carga se guarda sola, con fecha, cantidad de productos y origen.
- **Se elige contra qué lista comparar** desde la pantalla de cambios: sirve para ver
  qué se movió contra la semana pasada, contra el mes pasado, etc.
- **Evolución del precio por producto**: tocando cualquier fila de la tabla de cambios
  se abre el detalle con todos los precios que tuvo ese producto y la variación entre
  cada uno.
- **Exportar los cambios a Excel** (.csv con separador `;` y coma decimal, listo para
  abrir en Excel en español).
- **Copia de seguridad**: se descarga todo el historial en un archivo `.json` y se
  restaura en otra computadora o navegador. Resuelve el problema de perder el historial
  al cambiar de máquina o al borrar los datos del navegador.
- Se puede **borrar una lista** puntual del historial.
- Nueva tarjeta KPI: **variación promedio** de los precios que cambiaron.
- Las listas guardadas en el formato viejo se migran solas al historial nuevo.

### Diseño de las etiquetas

- **La hoja en pantalla ahora mide lo mismo que la impresa** (196 mm, el ancho útil de
  una A4): lo que se ve es exactamente lo que sale por la impresora.
- **Ajuste automático del texto**: la descripción usa todo el alto disponible y se
  achica sola lo justo para entrar completa, en vez de cortarse. El precio también se
  achica si el número es muy largo (millones). Si aun así una descripción no entra, el
  sistema **lo avisa** en pantalla y sugiere un formato más grande.
- **Formatos con medidas reales** en un solo selector: Grande (98 × 70 mm), Mediana
  (65 × 57), Estándar (65 × 47), Chica (49 × 40) y Mínima (49 × 35).
- **Copias por etiqueta** (1 a 4), para los productos que van en más de un lugar de la
  góndola.
- **Precio anterior tachado** en los productos que **bajaron** de precio — se calcula
  solo con la comparación contra la lista anterior.
- **Fecha de impresión** opcional en la etiqueta, para saber qué tan vieja es la que
  está puesta en la góndola.

---

## 2026-09-03 · Datos de contacto en el pie de página

- Se agregó un pie de página fijo con la dirección (Av. Pellegrini 4900, Olavarría) y
  el teléfono (2284 740640) de la empresa, visible en todas las pantallas del sistema.
- **No se imprime**: queda oculto en la hoja de etiquetas, que sigue saliendo solo con
  lo necesario para la góndola.

---

## 2026-09-03 · Colores reales del logo y animaciones en toda la interfaz

**Paleta extraída del logo**

- Se reemplazó la paleta aproximada por los colores exactos del archivo `web/logo.png`
  (muestreados del PNG real): verde `#57A595` y gris carbón `#363435`. Todos los tonos
  derivados (fondos suaves, hovers, sombras) se recalcularon a partir de esos dos.
- Franja fija de 3px arriba de toda la página con los dos colores del logo, como sello
  de marca constante.
- El halo de color detrás del logo en el inicio, los avatares de marca, el indicador de
  pasos y los botones ahora llevan el verde real, no una aproximación.

**Animaciones**

- Entradas escalonadas: tarjetas de marca, KPIs de cambios de precio y las dos opciones
  del menú aparecen con una leve subida y desvanecido, en cascada.
- Micro-interacciones: botones con elevación al pasar el mouse, ícono de las tarjetas
  principales con giro sutil al hover, checkbox de producto con rebote al marcar.
- Números que reaccionan: el contador de seleccionados (barra flotante y pantalla de
  confirmación) hace un pequeño "bump" cada vez que cambia.
- Halo con pulso suave alrededor del logo del inicio y del punto de estado en la barra
  superior, sin ser invasivo.
- Todo respeta `prefers-reduced-motion` (se desactiva solo si el usuario lo pidió a
  nivel sistema) y **ninguna animación ni la franja de color se imprime** — la hoja de
  etiquetas sigue saliendo 100% en negro para la láser.

---

## 2026-09-03 · Código de barras real y vista previa a tamaño real

**Código de barras EAN-13**

- La etiqueta ahora imprime el código de Chess como **código de barras escaneable**
  (EAN-13 / UPC-A), no solo como número. Se genera en el navegador con un encoder
  propio (sin librerías externas), validando el dígito verificador antes de dibujarlo.
- Si el código no es un EAN-13/UPC-A válido (por ejemplo un SKU interno corto), la
  etiqueta cae automáticamente al número en texto plano, como antes — nunca se
  imprime una barra que no vaya a escanear bien.

**Vista previa a tamaño real**

- Nuevo botón **Vista previa** en la pantalla de etiquetas: muestra una sola etiqueta
  ampliada, a su tamaño físico aproximado (en mm reales, no una miniatura), para
  revisar que el texto no se corte y el precio entre bien antes de gastar una hoja
  entera imprimiendo.
- Se actualiza en vivo si se cambian columnas, filas por hoja o tamaños mientras está
  abierta.

---

## 2026-09-02 · Logo real, diseño profesional y etiquetas para impresora láser

**Logo original de la empresa**

- Se colocó el archivo real (`web/logo.png`, 1600×481), traído del Drive de Nico y usado
  **tal cual, sin modificarlo ni recortarlo**. Aparece en el encabezado, en la pantalla
  de inicio y en cada etiqueta.
- **Tocando el logo se vuelve al inicio** desde cualquier pantalla, sin perder la lista
  cargada ni la selección de productos.
- Si el archivo faltara, el sistema cae en un logo reconstruido (`web/logo.svg`) y sigue
  funcionando. También acepta `logo.jpg`, `logo.jpeg` y `logo.webp`.

**Diseño**

- Interfaz rehecha: encabezado translúcido fijo, indicador de pasos (Lista → Productos →
  Etiquetas), tarjetas con elevación y hover, tipografía más ajustada, iconografía
  propia, transiciones suaves y estados vacíos cuidados.
- La barra de selección pasó a ser una píldora flotante en el centro inferior.
- Tarjetas de marca con inicial, conteo de productos y de cambios de precio.

**Etiquetas: impresora láser blanco y negro, hoja A4**

- Todo el color salió de la etiqueta: se imprime en **negro puro**, sin depender de la
  tinta de color. Barra negra superior, descripción en negrita, precio grande.
- Las etiquetas **llenan la hoja A4 exacta**: se elige *columnas* y *filas por hoja* y el
  alto se calcula solo (ej. 3 × 6 = 18 etiquetas de 65 × 47 mm).
- Van **pegadas entre sí**, con las líneas de corte continuas de lado a lado, para cortar
  derecho con la guillotina. La última fila se completa con celdas vacías para que las
  líneas lleguen al borde.
- El sistema avisa cuántas hojas A4 van a salir antes de imprimir.

---

## 2026-09-02 · Rediseño con identidad Tumalac y flujo por pantallas

**Diseño**

- Identidad visual Tumalac en todo el sistema: verde `#4A9E92`, gris carbón `#3D4142`,
  y el logo presente en el encabezado, en la pantalla de inicio y en cada etiqueta.
- Logo reconstruido en `web/logo.svg` (isotipo bicolor con la T en negativo + logotipo).
  Si se deja un `web/logo.png` en la carpeta, el sistema lo usa automáticamente en
  lugar del reconstruido.
- Interfaz rehecha: tarjetas, tipografía y espaciados nuevos.

**Flujo nuevo**

1. **Inicio** — si el agente ya dejó la lista descargada, aparece "Lista descargada de
   Chess · N productos" y se sigue con un click. Si no, se sube el Excel a mano
   (también arrastrándolo).
2. **Dos pantallas** — *Imprimir etiquetas* o *Ver cambios de precio*.
3. **Marcas** — todas las marcas del Excel en cuadros, con la cantidad de productos y
   cuántos hay con cambio de precio. Por cada marca: *Toda la marca* o *Elegir productos*.
4. **Productos** — lista de la marca elegida, se marcan de a uno.
5. **¿Seguir agregando?** — después de cada agregado, el sistema pregunta si se suma
   otra marca o se pasa a imprimir. Muestra el total acumulado.
6. **Etiquetas** — la hoja lista para imprimir.

**Etiqueta rediseñada**

- Franja verde superior, descripción en negrita, `$` en verde, precio grande con los
  centavos en superíndice, y pie con el código de Chess y el isotipo Tumalac.
- Se puede sacar el código o el logo, y ajustar columnas, alto y tamaños desde la pantalla.

**Carga automática de datos**

- `scripts/lib-datos.js` convierte el Excel de Chess en `web/datos.js`.
- `npm run descargar` ahora, además de bajar el Excel, lo deja cargado en el sistema.
- `node generar-datos.js archivo.xlsx` hace lo mismo con un Excel ya bajado a mano.

---

## 2026-09-02 · Filtros, columnas fijas de Chess y skill de Cowork

- Columnas del export de Chess fijadas por posición: **E** código, **F** descripción,
  **S** precio unitario, **AA** marca. Se leen por posición y no por el nombre del
  encabezado, que cambia entre exports.
- Filtros por marca, rango de precio, búsqueda de texto y lista de códigos pegada.
- Los artículos con **precio $0 nunca se imprimen** (no tienen precio de lista cargado).
- Lista de exclusiones permanentes por código o palabra.
- Librería de lectura de Excel incluida en `web/lib/` para funcionar sin internet.
- Skill de Cowork `etiquetas-precios` con `generar_etiquetas.py` (sin dependencias
  externas), más `reglas.md`, `formato-chess.md` y `cowork/prompts.md`.

---

## 2026-09-02 · Primera versión

- Generador de etiquetas a partir del Excel de precios de Chess.
- Comparación contra la última lista guardada para detectar qué precios cambiaron.
- Script de Playwright que automatiza en Chess: *Exportar lista de precios → Vista
  completa → Lista 1 - Lista general → Excel*.

---

## Pendiente

- **Probar el script de descarga contra el Chess real.** Está escrito con el flujo
  correcto pero sin verificar: el entorno donde se desarrolló no tiene acceso de red a
  `magio.chesserp.com`. Si algún texto de botón no coincide, se calibra con
  `npm run calibrar` y se actualiza `config.json`.
