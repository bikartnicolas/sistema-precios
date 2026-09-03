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

Es el modelo que se usa hoy en la góndola: **90 × 40 mm**, con marco negro completo y
tres franjas separadas por líneas.

```
┌──────────────────────────────────────┐
│ CHIPS C/CHOC (14U X 120GR) TOS…      │  1 cm — descripción
├──────────────────────────────────────┤
│              $765,10                 │  2,5 cm — precio
├──────────────────────────────────────┤
│ Cod: 429039   PRECIO FINAL   7798…38 │  0,5 cm — códigos
└──────────────────────────────────────┘
```

- **Descripción**: tal cual viene de Chess (columna F), en MAYÚSCULAS, alineada a la
  izquierda, en **una sola línea**. Si no entra se corta con `…` (no se reescribe ni
  se abrevia a mano).
- **Precio**: grande y centrado, con el `$` pegado al número y los **centavos del mismo
  tamaño**. Punto de miles y coma decimal. Ejemplo: `$765,10` / `$1.890,00`.
  Si el número es tan largo que no entra, se achica solo.
- **Pie en tres partes**: `Cod: <código de Chess>` a la izquierda, `PRECIO FINAL` al
  centro, y el **código de barras** a la derecha (como número, igual al modelo; puede
  dibujarse en barras si se pide). Si se pide la **fecha de impresión**, va pegada a la
  derecha de `PRECIO FINAL`.
- Todo en **negro sobre blanco**, sin logos ni colores: la impresora es láser B/N.
  El **marco es negro y cierra las cuatro etiquetas**: sirve de línea de corte, así que
  nunca va en gris ni punteado.
- Entran **14 etiquetas por hoja A4** (2 columnas × 7 filas), pegadas entre sí para
  cortar de lado a lado con la guillotina.

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
