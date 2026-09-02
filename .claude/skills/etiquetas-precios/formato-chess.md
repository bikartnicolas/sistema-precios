# Formato del export de Chess ERP

## Cómo se saca la lista

1. Entrar a `https://magio.chesserp.com/AR526/#/ventas/gestion/precios-de-venta`
2. **Exportar lista de precios**
3. **Vista completa**
4. Seleccionar **Lista 1 - Lista general** (siempre la lista 1)
5. Exportar el Excel

Esto también lo hace solo el script `scripts/descargar-precios.js` del repo.

## Columnas que usa el sistema

Leer **por posición de columna**, no por el nombre del encabezado: los títulos que
pone Chess pueden variar entre exports, las posiciones no.

| Columna | Índice (0-based) | Contenido | Uso en la etiqueta |
|---------|------------------|-----------|--------------------|
| **E**   | 4  | Código de Chess (sistema) | Va abajo de todo, chico |
| **F**   | 5  | Descripción del producto  | Título, arriba, en bordó |
| **S**   | 18 | Precio unitario           | El número grande |
| **AA**  | 26 | Marca                     | No se imprime; sirve para filtrar |

El resto de las columnas del export (costo, stock, IVA, rubro, etc.) se ignoran.

## Cosas a tener en cuenta

- **La primera fila es el encabezado.** El script la saltea sola porque en la columna
  del precio no encuentra un número.
- **El precio puede venir como texto** (`"1.890,00"`) o como número, según cómo lo
  exporte Chess. El parser maneja los dos: punto de miles + coma decimal.
- **Artículos en $0**: son los que no tienen precio de lista cargado. Se excluyen
  siempre (ver `reglas.md`).
- **La marca puede venir vacía** en algunos artículos. En ese caso el sistema usa la
  primera palabra de la descripción como marca, para que el filtro siga sirviendo.

## Si Chess cambia el formato

Si algún día el export cambia de columnas, no hace falta tocar código:

- En el script: `--col-codigo`, `--col-descripcion`, `--col-precio`, `--col-marca`
  aceptan la letra de columna nueva.
- En la web (`web/index.html`): al importar aparece el mapeo de columnas con las
  letras a la vista y una vista previa de las primeras filas para corregir a mano.
