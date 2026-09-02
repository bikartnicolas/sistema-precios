# Reglas para armar las etiquetas

Este archivo lo edita Nico. Es la fuente de verdad de qué se imprime y qué no.
Tanto la skill de Cowork como la web (`web/index.html`, sección "Exclusiones
permanentes") deberían reflejar lo mismo.

## 1. Artículos que NO se imprimen nunca

### Por precio
- **Precio unitario $0** → excluido siempre. Son artículos sin precio de lista cargado
  en Chess; una etiqueta en $0 en la góndola es un error de cara al cliente.
- Precio vacío o no numérico → excluido.

### Por código de Chess
Uno por línea. Agregar acá los códigos que nunca van a góndola.

```
# (vacío por ahora — agregar códigos acá)
```

### Por palabra en la descripción
Si la descripción contiene alguna de estas palabras, no se imprime la etiqueta.

```
# (vacío por ahora — ejemplos posibles: bolsa camiseta, muestra, sin cargo)
```

## 2. Formato de la etiqueta

- **Descripción**: tal cual viene de Chess (columna F), sin reescribir ni abreviar.
  Máximo 2 líneas; si no entra, se corta visualmente.
- **Precio**: entero grande + centavos en superíndice, con punto de miles y coma
  decimal (formato argentino). Ejemplo: `1.890,00` / `229,41`.
- **Código de Chess**: abajo, chico, tal cual viene de la columna E.
- Sin logos, sin colores de fondo: se imprime en blanco y negro salvo el título en
  bordó.

## 3. Redondeo

**No se redondea nada.** El precio va exactamente como está en Chess (columna S).
Si algún precio de Chess viene con más de 2 decimales, se muestra con 2.

## 4. Orden de las etiquetas

Por marca y después por descripción alfabética, para que al cortar la hoja queden
juntas las de la misma marca / mismo sector de góndola.

## 5. Qué revisar antes de imprimir en cantidad

1. Que el total de etiquetas tenga sentido contra lo que se esperaba.
2. Que no haya precios absurdamente bajos o altos (típico error de carga en Chess):
   revisar los extremos con `--min` / `--max` antes de mandar a imprimir.
3. Que los productos con cambio de precio sean los esperados — si de golpe cambiaron
   *todos*, probablemente se comparó contra la lista equivocada.
