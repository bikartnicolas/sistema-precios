# Sistema de etiquetas de precios

Dos partes:

1. **`web/index.html`** — generador de etiquetas para góndola. Se abre directo en el navegador (doble clic), no necesita instalar nada ni servidor. Importa el Excel de Chess, arma las etiquetas (código, descripción, precio) listas para imprimir, y compara contra la última lista guardada para detectar qué precios cambiaron.

2. **`scripts/`** — script que se conecta a Chess (`magio.chesserp.com`), va a *Ventas > Gestión > Precios de venta* y descarga el Excel automáticamente, para no tener que exportarlo a mano cada vez. Corre en tu máquina (no en la nube), porque necesita tu usuario/contraseña y acceso a la red donde Chess es accesible.

## Uso diario

1. Correr `npm run descargar` en `scripts/` (o exportar el Excel a mano desde Chess, funciona igual).
2. Abrir `web/index.html`, pestaña **1. Importar**, subir el Excel.
3. Si es la primera vez: guardar esta lista como "base" (pestaña 1, botón al pie, o desde la pestaña de cambios).
4. Ir a pestaña **3. Etiquetas** para imprimir todo el catálogo, o a **2. Cambios de precio** para ver solo lo que subió/bajó desde la última vez e imprimir únicamente esas etiquetas.
5. Después de imprimir los cambios, apretar "Guardar esta lista como base actual" para que la próxima comparación sea contra los precios de hoy.

La lista base se guarda en el navegador (localStorage), por producto (código). Si cambiás de compu o de navegador, hay que volver a guardarla una vez.

## Formato del Excel

El sistema intenta detectar solo las columnas de Código, Descripción y Precio por el nombre del encabezado. Si no las encuentra (porque Chess exporta con otros nombres), aparece un paso de mapeo manual con una vista previa de las primeras filas para elegir a mano qué columna es cada cosa.

## Configurar la descarga automática desde Chess

Requiere Node.js instalado en tu compu.

```bash
cd scripts
npm install
npx playwright install chromium   # una sola vez
cp .env.example .env              # completar CHESS_USER y CHESS_PASS
cp config.example.json config.json
npm run descargar
```

### Flujo de exportación

El script reproduce estos clicks, en orden (definidos en `config.json` → `pasosExportacion`):

1. **Exportar lista de precios**
2. **Vista completa**
3. **Lista 1 - Lista general**
4. **Excel** (dispara la descarga)

### Si falla el login o algún click de la exportación

No tengo acceso a `magio.chesserp.com` desde donde armé esto, así que los textos de los botones son los que me pasaste pero pueden no coincidir 100% (mayúsculas, espacios, etc.). Para calibrarlos:

```bash
npm run calibrar
```

Esto abre una ventana de Chrome controlada por Playwright ("Codegen"). Hacé el login normal y repetí los 4 clicks de arriba a mano. Playwright va mostrando en un panel el selector exacto de cada elemento que tocás — copiá esos selectores a `config.json`: `userInput`/`passInput`/`loginButton` para el login, y cada paso de `pasosExportacion` para la exportación (el paso que realmente dispara la descarga necesita `"esperaDescarga": true`).

Las credenciales (`.env`) y `config.json` con tus selectores reales no se suben al repo (están en `.gitignore`).
