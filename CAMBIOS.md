# Registro de cambios

Historial de lo que se fue construyendo en el sistema de etiquetas de precios.
Lo más nuevo va arriba.

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
