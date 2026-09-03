---
name: etiquetas-precios
description: Genera las etiquetas de precios unitarios para la góndola de la distribuidora a partir del Excel exportado de Chess ERP (Ventas > Gestión > Precios de venta > Exportar lista de precios > Vista completa > Lista 1 - Lista general). Arma la hoja de etiquetas lista para imprimir con descripción, precio y código de Chess, con filtros por marca, por rango de precio o por lista de códigos. También compara la lista nueva contra la anterior para imprimir únicamente los productos que cambiaron de precio. Usar apenas Nico suba un Excel de precios de Chess y pida etiquetas, cartelería de góndola, "los que cambiaron de precio", o similar — el archivo ya es la señal, no hace falta que lo pida con esas palabras exactas.
---

# Etiquetas de precios de góndola

## Qué hace

Convierte el Excel de precios de Chess en una hoja HTML de etiquetas lista para
imprimir (una etiqueta por producto: descripción, precio grande, código de Chess).

## Formato del Excel de Chess

El export siempre tiene las columnas en estas posiciones fijas — leer **por posición,
nunca por nombre de encabezado**, porque los títulos cambian entre exports:

| Columna | Contenido |
|---------|-----------|
| **E**   | Código de Chess (sistema) |
| **F**   | Descripción del producto |
| **S**   | Precio unitario |
| **AA**  | Marca |

Detalle completo en `formato-chess.md`.

## Cómo usarlo

El script `generar_etiquetas.py` hace todo el trabajo. No usa librerías externas
(lee el .xlsx con la stdlib), así que corre en cualquier entorno.

```bash
# Todas las etiquetas
python3 generar_etiquetas.py lista.xlsx -o etiquetas.html

# Solo una o varias marcas
python3 generar_etiquetas.py lista.xlsx --marca Elvive --marca Sedal

# Solo códigos puntuales de Chess
python3 generar_etiquetas.py lista.xlsx --codigos 7509552821604,7898587762526
python3 generar_etiquetas.py lista.xlsx --codigos-archivo codigos.txt

# Por rango de precio
python3 generar_etiquetas.py lista.xlsx --min 500 --max 2000

# Solo los que cambiaron de precio contra la lista anterior
python3 generar_etiquetas.py nueva.xlsx --comparar-con anterior.xlsx --solo-cambios
```

Opciones de formato: `--ancho` y `--alto` en mm (por defecto **90 × 40**, la medida real
de la etiqueta de góndola), `--texto` en px y `--sin-codigo`. Para ver todo:
`python3 generar_etiquetas.py --help`.

La etiqueta sale igual al modelo que se usa hoy: marco negro, descripción en una línea
truncada con `…`, precio grande centrado, y pie con `Cod:` / `PRECIO FINAL` / código de
barras. El detalle está en `reglas.md`.

## Reglas que se aplican siempre

Están en `reglas.md` — **leer ese archivo antes de generar**, porque Nico lo va
actualizando. Las principales:

- Los artículos con **precio unitario $0 se excluyen siempre** (no tienen precio de
  lista cargado en Chess). El script ya lo hace por defecto; solo incluirlos si Nico
  lo pide explícitamente con `--incluir-cero`.
- Las exclusiones fijas de `reglas.md` se pasan con `--excluir` (repetible).

## Flujo de trabajo

1. Nico sube el Excel exportado de Chess.
2. Leer `reglas.md` y armar el comando con las exclusiones vigentes más los filtros
   que haya pedido (marca, códigos, rango).
3. Correr el script y **reportar los números**: cuántos productos se leyeron, cuántos
   quedaron, cuántos se excluyeron y por qué.
4. Entregar el HTML. Se abre en el navegador y se imprime con el botón Imprimir
   (ya viene configurado para A4).

Si además subió la lista anterior, correr siempre la comparación primero y mostrarle
la tabla de qué cambió (código, descripción, precio viejo → precio nuevo) antes de
generar las etiquetas, para que confirme.

## Cuando algo no cuadra

- Si el conteo de productos leídos es muy distinto al de filas del Excel, revisar que
  las columnas sigan siendo E/F/S/AA: abrir el Excel y verificar antes de seguir.
- Si una descripción sale cortada con `…`, es porque la franja de arriba es de una sola
  línea (así es la etiqueta real): bajar `--texto`, o avisarle a Nico qué productos
  quedaron largos. Nunca abreviar la descripción a mano.
- Nunca inventar precios ni completar los que están en $0.
