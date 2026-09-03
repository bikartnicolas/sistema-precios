# Sistema de etiquetas de precios

Etiquetas de precios unitarios para la góndola de la distribuidora, a partir del
Excel de precios de Chess ERP.

## Las partes

| Carpeta | Qué es | Dónde corre |
|---------|--------|-------------|
| `web/` | La herramienta principal: importa el Excel, filtra, y arma las etiquetas para imprimir | Doble clic en tu compu, o servida en la red |
| `scripts/servidor.js` | Publica el sistema en la red interna y guarda las listas en archivos | Node.js en una PC de la distribuidora |
| `scripts/` (resto) | Descarga sola el Excel desde Chess, sin entrar a mano | Node.js en tu compu |
| `.claude/skills/` + `cowork/` | Lo mismo pero desde Cowork, conversando | Cowork |

## Dos formas de usarlo

**Archivo suelto** — doble clic en `web/index.html`. Funciona en una sola computadora y
las listas quedan guardadas en ese navegador. Sirve para probar o para uso personal.

**En la red (recomendado)** — una PC corre `npm start` y todos entran desde el navegador
a `http://IP-de-esa-PC:8080`. Las listas se guardan como archivos en esa PC: no se pierden
si alguien limpia el navegador, se respaldan copiando una carpeta, y **todo el equipo ve
el mismo historial**. Guía paso a paso en **[INSTALACION.md](INSTALACION.md)**.

El sistema se da cuenta solo de cómo lo abriste y te lo dice en la pantalla de inicio.

## Usuarios

En modo red, el sistema pide usuario y contraseña. Vienen dos creados:

| Usuario | Rol | Puede |
|---------|-----|-------|
| `nico` | Administrador | Todo: cargar, guardar, borrar y respaldar listas, ver cambios de precio, imprimir, góndola |
| `invitado` | Invitado | Etiquetas y góndola: elegir productos, cambiar el formato, imprimir y marcar qué cartel se sacó |

El invitado **no puede tocar las listas de precios**, y no es solo que no vea los
botones: el servidor rechaza esas operaciones aunque se las intente por afuera.

Contraseñas de fábrica `tumalac` e `invitado`: cambialas apenas lo instales con
`npm run clave nico`. Detalle completo en [INSTALACION.md](INSTALACION.md).

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
2. **Tres caminos** — *Imprimir etiquetas*, *Ver cambios de precio* o *La góndola*.
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

### La etiqueta

Reproduce la etiqueta que ya se usa en la góndola: **90 × 40 mm**, marco negro completo
y tres franjas separadas por líneas.

```
┌──────────────────────────────────────┐
│ CHIPS C/CHOC (14U X 120GR) TOS…      │  1 cm — descripción
├──────────────────────────────────────┤
│              $765,10                 │  2,5 cm — precio
├──────────────────────────────────────┤
│ Cod: 429039   PRECIO FINAL   7798…38 │  0,5 cm — códigos
└──────────────────────────────────────┘
```

- **Descripción** en MAYÚSCULAS, una sola línea, cortada con `…` si no entra.
- **Precio** grande y centrado, `$` pegado al número y centavos del mismo tamaño.
- **Pie en tres partes**: código de Chess, `PRECIO FINAL` y el código de barras.

### Impresión

- Sale en **A4** y en **negro puro**, pensado para la impresora láser: la etiqueta no
  depende del color para leerse.
- Las etiquetas **van pegadas entre sí**, con las líneas de corte continuas de lado a
  lado, para cortar derecho con la guillotina.
- Entran **14 por hoja** (2 columnas × 7 filas) en el formato de góndola 90 × 40 mm.
  El selector también trae 98 × 47, 65 × 35 y 45 × 30 mm por si hace falta otra medida.
- **Copias** de 1 a 4 por producto, para los que van en más de un lugar de la góndola.

### Reglas automáticas

- Los artículos con **precio $0 nunca se imprimen**: no tienen precio de lista cargado
  en Chess y una etiqueta en $0 en la góndola es un error de cara al cliente.
- El código de Chess se imprime como **código de barras real (EAN-13)** cuando es
  válido; si no lo es, se imprime el número tal cual, en texto.
- **El precio se ajusta solo** si el número es muy largo, para no pasarse del ancho.
  Si alguna descripción no entra completa, el sistema **avisa cuántas se cortaron** con
  `…` y sugiere bajar el tamaño del texto o usar un formato más ancho.
- En los productos que **bajaron** de precio se imprime el **precio anterior tachado**
  (se puede desactivar). Opcionalmente también la **fecha** de impresión.
- El **logo original de la empresa** está en `web/logo.png` y se usa tal cual, sin
  modificar, en el encabezado, el inicio y cada etiqueta. Si querés cambiarlo, reemplazá
  ese archivo (también acepta `logo.jpg` / `logo.webp`).

### Historial de listas y comparación de precios

Cada lista que cargás **se guarda sola**. En la pantalla de inicio ves el historial
completo, con fecha, cantidad de productos y de dónde salió.

- **En la red**: las listas son archivos en la carpeta `datos/` de la PC del servidor.
  No hay límite práctico de cantidad, las ve todo el equipo, y se respaldan copiando
  esa carpeta (por ejemplo, sincronizándola con Drive).
- **Archivo suelto**: se guardan en ese navegador, hasta 8, y se pierden si borrás los
  datos de navegación. Conviene descargar la copia seguido.

- **Comparás contra la lista que quieras**: la semana pasada, el mes pasado, la que sea.
  El selector está arriba de la tabla de cambios.
- **Evolución de un producto**: tocá cualquier fila de la tabla y ves todos los precios
  que tuvo ese producto y cuánto varió entre cada uno.
- **Exportar a Excel**: baja los cambios en un `.csv` listo para abrir en Excel.
- **Copia de seguridad**: el botón *Descargar copia* baja todo el historial en un
  archivo; *Restaurar* lo vuelve a cargar en otra compu o navegador. Es también la forma
  de pasar el historial del archivo suelto al servidor (para el navegador son dos lugares
  distintos y no los comparte solo).

### La góndola: qué etiquetas están puestas

La lista de Chess trae miles de artículos y en la góndola hay unos cientos. Para que
"cambiaron 300 precios" se convierta en "hay que cambiar estos 40 carteles", el sistema
anota **qué etiquetas están puestas hoy en el salón**.

- **Se llena sola**: cada vez que imprimís, esos productos quedan anotados con el precio
  que salió en el cartel, la fecha y quién los imprimió. No hay que cargar nada a mano.
- En la pantalla **La góndola** ves, para cada cartel puesto, **qué precio dice el cartel**
  contra **qué precio tiene Chess hoy**: esa diferencia es lo que le estás cobrando mal al
  cliente. Las desactualizadas salen primero, marcadas *CAMBIAR*.
- **Reimprimir las desactualizadas** las manda todas juntas a la selección. Tocando una
  fila sola, va solo esa.
- Cuando saques un cartel del salón, tocá **Quitar** y el sistema deja de pedirte que lo
  cambies. Si lo volvés a imprimir, se anota de nuevo.
- La pantalla de *Cambios de precio* arranca filtrada en **lo que está en góndola**
  (se puede destildar), y las filas de ahí muestran la etiqueta *EN GÓNDOLA*.
- **Exportar a Excel** baja el estado de toda la góndola en un `.csv`.

En modo red la góndola es un archivo (`datos/gondola.json`) que ve todo el equipo: si uno
imprime, el resto lo ve. Como archivo suelto queda en ese navegador. Va incluida en la
copia de seguridad.

El circuito de cada semana:

1. Cargás el Excel nuevo (queda guardado solo en el historial).
2. Vas a *Cambios de precio* y mirás qué se movió **de lo que está en góndola**.
3. "Seleccionar todos los cambiados" → *Generar etiquetas* → imprimís.
4. Cambiás los carteles. Los nuevos ya quedaron anotados solos.

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
