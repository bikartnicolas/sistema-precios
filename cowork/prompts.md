# Prompts listos para Cowork

Copiá y pegá el que necesites, adjuntando el Excel exportado de Chess
(Exportar lista de precios → Vista completa → Lista 1 - Lista general).

La skill `etiquetas-precios` ya sabe que el código está en la columna E, la
descripción en la F, el precio unitario en la S y la marca en la AA, y que los
artículos en $0 no se imprimen. No hace falta repetirlo en cada pedido.

---

## 1. Etiquetas de todo el listado

```
Adjunto la lista de precios de Chess. Generame las etiquetas de góndola de todos
los productos.
```

## 2. Etiquetas de una marca

```
Adjunto la lista de precios de Chess. Generame las etiquetas solo de la marca Elvive.
```

Varias marcas a la vez:

```
Adjunto la lista de precios de Chess. Generame las etiquetas de las marcas Elvive,
Sedal y Dove.
```

## 3. Etiquetas por códigos puntuales

```
Adjunto la lista de precios de Chess. Generame las etiquetas solo de estos códigos:

7509552821604
7898587762526
7509552800371
```

## 4. Solo los productos que cambiaron de precio

Adjuntando los dos Excel (el anterior y el nuevo):

```
Adjunto dos listas de precios de Chess: "anterior.xlsx" es la de la semana pasada y
"nueva.xlsx" es la que acabo de bajar. Compará las dos, mostrame qué productos
cambiaron de precio con el precio viejo y el nuevo, y generame las etiquetas solo
de esos.
```

## 5. Ver los cambios sin imprimir todavía

```
Adjunto la lista nueva y la anterior de Chess. Solo quiero ver el listado de qué
cambió de precio: código, descripción, precio viejo y precio nuevo, ordenado por
mayor diferencia porcentual. Todavía no generes etiquetas.
```

## 6. Control de precios raros antes de imprimir

```
Adjunto la lista de precios de Chess. Antes de generar nada, revisá si hay precios
sospechosos: artículos en $0, precios muy por debajo del costo, o saltos de precio
muy grandes contra la lista anterior que también adjunto. Mostrame lo que encuentres.
```

## 7. Etiquetas por rango de precio

```
Adjunto la lista de precios de Chess. Generame las etiquetas solo de los productos
que están entre $500 y $2000.
```

## 8. Cambiar el formato de impresión

```
Generame las etiquetas pero con 4 columnas por hoja y 35mm de alto, así entran más
por página.
```

```
Generame las etiquetas sin el código de Chess abajo, solo descripción y precio.
```

---

## Mantenimiento

Para cambiar qué se excluye siempre (códigos o palabras que nunca van a góndola),
editar `.claude/skills/etiquetas-precios/reglas.md`. La skill lo lee antes de
generar, así que el cambio se aplica solo a partir de ahí.

```
Agregá a las reglas de etiquetas que nunca se impriman los artículos que tengan
"bolsa camiseta" en la descripción.
```
