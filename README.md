# Sistema de etiquetas de precios

Etiquetas de precios unitarios para la góndola de la distribuidora, a partir del
Excel de precios de Chess ERP.

## Las tres partes

| Carpeta | Qué es | Dónde corre |
|---------|--------|-------------|
| `web/` | La herramienta principal: importa el Excel, filtra, y arma las etiquetas para imprimir | Doble clic en tu compu, no necesita instalar nada |
| `scripts/` | Descarga sola el Excel desde Chess, sin entrar a mano | Node.js en tu compu |
| `.claude/skills/` + `cowork/` | Lo mismo pero desde Cowork, conversando | Cowork |

## Columnas del export de Chess

El sistema lee siempre estas posiciones fijas (no los nombres de encabezado):

| Columna | Contenido |
|---------|-----------|
| **E** | Código de Chess |
| **F** | Descripción del producto |
| **S** | Precio unitario |
| **AA** | Marca |

Cómo se exporta: en Chess, **Exportar lista de precios → Vista completa → Lista 1 -
Lista general → Excel**.

---

## 1. La web de etiquetas

Abrí `web/index.html` con doble clic. **Importante: mantené las carpetas `lib` y los
archivos `logo.svg` / `datos.js` al lado del index** — ahí está la librería que lee los
Excel (para que funcione sin internet) y los datos que deja el agente.

### El recorrido

1. **Inicio** — si el agente ya descargó la lista, aparece *"Lista descargada de Chess ·
   N productos"* y seguís con un click. Si no, arrastrás el Excel o lo elegís a mano
   (ahí verificás las columnas E, F, S y AA, que vienen preseleccionadas).
2. **Dos caminos** — *Imprimir etiquetas* o *Ver cambios de precio*.
3. **Marcas** — todas las marcas del Excel en cuadros, con cuántos productos tiene cada
   una y cuántos cambiaron de precio. Por marca:
   - **Toda la marca** — la agrega completa de una.
   - **Elegir productos** — abrís la lista y marcás de a uno.
4. **¿Seguir agregando?** — después de cada agregado el sistema te pregunta si sumás
   otra marca o pasás a imprimir, y te muestra el total acumulado.
5. **Etiquetas** — la hoja lista, mostrada **al tamaño real de una A4**: lo que ves en
   pantalla es lo que sale impreso. Con **Vista previa** ampliás una etiqueta sola antes
   de mandar todo el lote.

Tocando el **logo** volvés al inicio desde cualquier pantalla, sin perder la lista ni la
selección.

### Impresión

- Sale en **A4** y en **negro puro**, pensado para la impresora láser: la etiqueta no
  depende del color para leerse.
- Las etiquetas **llenan la hoja exacta y van pegadas**, con las líneas de corte
  continuas de lado a lado, para cortar derecho con la guillotina.
- **Formatos** (un solo selector, con las medidas reales): Grande 98 × 70 mm, Mediana
  65 × 57, Estándar 65 × 47 (18 por hoja), Chica 49 × 40 y Mínima 49 × 35.
- **Copias** de 1 a 4 por producto, para los que van en más de un lugar de la góndola.

### Reglas automáticas

- Los artículos con **precio $0 nunca se imprimen**: no tienen precio de lista cargado
  en Chess y una etiqueta en $0 en la góndola es un error de cara al cliente.
- El código de Chess se imprime como **código de barras real (EAN-13)** cuando es
  válido; si no lo es, se imprime el número tal cual, en texto.
- **El texto se ajusta solo**: la descripción usa todo el alto disponible y se achica lo
  justo para entrar completa; el precio se achica si el número es muy largo. Si aun así
  alguna descripción no entra, el sistema lo avisa y sugiere un formato más grande.
- En los productos que **bajaron** de precio se imprime el **precio anterior tachado**
  (se puede desactivar). Opcionalmente también la **fecha** de impresión.
- El **logo original de la empresa** está en `web/logo.png` y se usa tal cual, sin
  modificar, en el encabezado, el inicio y cada etiqueta. Si querés cambiarlo, reemplazá
  ese archivo (también acepta `logo.jpg` / `logo.webp`).

### Historial de listas y comparación de precios

Cada lista que cargás **se guarda sola** en el navegador, hasta 8. En la pantalla de
inicio ves el historial completo, con fecha, cantidad de productos y de dónde salió.

- **Comparás contra la lista que quieras**: la semana pasada, el mes pasado, la que sea.
  El selector está arriba de la tabla de cambios.
- **Evolución de un producto**: tocá cualquier fila de la tabla y ves todos los precios
  que tuvo ese producto y cuánto varió entre cada uno.
- **Exportar a Excel**: baja los cambios en un `.csv` listo para abrir en Excel.
- **Copia de seguridad**: el botón *Descargar copia* baja todo el historial en un
  archivo; *Restaurar* lo vuelve a cargar en otra compu o navegador. Sin esto, el
  historial vive solo en ese navegador.

El circuito de cada semana:

1. Cargás el Excel nuevo (queda guardado solo en el historial).
2. Vas a *Cambios de precio* y mirás qué se movió.
3. "Seleccionar todos los cambiados" → *Generar etiquetas* → imprimís.

---

## 2. Descarga automática desde Chess

Requiere Node.js.

```bash
cd scripts
npm install
npx playwright install chromium   # una sola vez
cp .env.example .env              # completar CHESS_USER y CHESS_PASS
cp config.example.json config.json
npm run descargar
```

El script reproduce estos clicks (definidos en `config.json` → `pasosExportacion`):

1. **Exportar lista de precios**
2. **Vista completa**
3. **Lista 1 - Lista general**
4. **Excel** (dispara la descarga)

El Excel queda en `descargas/` con la fecha en el nombre, **y además se carga solo en el
sistema**: el script lo convierte a `web/datos.js`, así al abrir `web/index.html` los
productos ya están ahí sin subir nada.

Si bajaste un Excel a mano y lo querés cargar igual:

```bash
node generar-datos.js ../descargas/2026-09-02_precios.xlsx
node generar-datos.js        # sin argumento toma el más reciente de descargas/
```

### Si falla el login o algún click

Los textos de los botones son los que me pasaste, pero pueden no coincidir carácter
por carácter con el HTML real (no tengo acceso a `magio.chesserp.com` para verificarlo).
Para calibrarlos:

```bash
npm run calibrar
```

Abre una ventana de Chrome controlada por Playwright. Hacés el login y los 4 clicks a
mano, y Playwright te va mostrando el selector exacto de cada elemento que tocás.
Copiás esos selectores a `config.json`.

Las credenciales (`.env`) y tu `config.json` no se suben al repo.

---

## 3. Cowork

- `.claude/skills/etiquetas-precios/` — la skill. Subís el Excel y pedís las etiquetas
  conversando; genera el HTML listo para imprimir con los mismos filtros.
  - `SKILL.md` — cómo trabaja
  - `reglas.md` — **qué se excluye y con qué formato** (este es el que vas editando)
  - `formato-chess.md` — el formato del export, por si Chess cambia algo
  - `generar_etiquetas.py` — el motor; no usa librerías externas
- `cowork/prompts.md` — prompts listos para copiar y pegar.

Uso directo del script, sin Cowork:

```bash
python3 .claude/skills/etiquetas-precios/generar_etiquetas.py lista.xlsx -o etiquetas.html
python3 .claude/skills/etiquetas-precios/generar_etiquetas.py lista.xlsx --marca Elvive
python3 .claude/skills/etiquetas-precios/generar_etiquetas.py nueva.xlsx --comparar-con anterior.xlsx --solo-cambios
```
