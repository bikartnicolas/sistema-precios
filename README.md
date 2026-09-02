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

Abrí `web/index.html` con doble clic. **Importante: mantené la carpeta `lib` al lado
del archivo** — ahí está la librería que lee los Excel, para que funcione sin internet.

### Uso

1. **Importar** — subís el Excel de Chess. Las columnas E, F, S y AA vienen
   preseleccionadas; verificás con la vista previa y confirmás.
2. **Productos y filtros** — el listado con todo. Filtrás por:
   - búsqueda de texto (descripción o código)
   - **marca** (checkboxes con el conteo de productos de cada una)
   - rango de precio (desde / hasta)
   - **lista de códigos de Chess** pegada (uno por línea)
   - solo los que cambiaron de precio

   Marcás los que querés con los checkboxes y apretás **Generar etiquetas**.
3. **Cambios de precio** — qué subió, qué bajó y qué es nuevo contra la última lista
   guardada. Botón para seleccionar todos los cambiados de una.
4. **Etiquetas** — la hoja lista. Ajustás columnas, alto y tamaño de letra, e imprimís.

### Reglas automáticas

- Los artículos con **precio $0 se excluyen solos** (checkbox en el panel de filtros
  si alguna vez los necesitás).
- Las **exclusiones permanentes** (códigos o palabras que nunca van a góndola) se
  cargan en la pestaña 1 y quedan guardadas en el navegador.

### Cómo detecta los cambios de precio

Guarda la última lista importada en el navegador. Al importar la siguiente, compara
producto por producto por código de Chess y marca **CAMBIÓ** o **NUEVO**.

El circuito de cada semana:

1. Importás el Excel nuevo.
2. Vas a *Cambios de precio*, mirás qué se movió.
3. "Seleccionar todos los cambiados" → *Generar etiquetas* → imprimís.
4. **"Guardar esta lista como base actual"** para que la próxima comparación sea
   contra los precios de hoy.

Si cambiás de compu o de navegador hay que volver a guardar la lista base una vez.

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

El Excel queda en `descargas/` con la fecha en el nombre.

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
