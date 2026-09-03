#!/usr/bin/env python3
"""
Genera un HTML de etiquetas de precios de gondola a partir del Excel exportado
de Chess ERP (Exportar lista de precios > Vista completa > Lista 1 - Lista general).

Lee el .xlsx con la libreria estandar de Python (un .xlsx es un ZIP con XML),
asi que no necesita openpyxl ni pandas.

Columnas por defecto del export de Chess:
    E = codigo de Chess    F = descripcion    S = precio unitario    AA = marca

Ejemplos:
    python3 generar_etiquetas.py lista.xlsx -o etiquetas.html
    python3 generar_etiquetas.py lista.xlsx --marca Elvive --marca Sedal
    python3 generar_etiquetas.py lista.xlsx --codigos 7509552821604,7898587762526
    python3 generar_etiquetas.py nueva.xlsx --comparar-con anterior.xlsx --solo-cambios
"""

import argparse
import html
import re
import sys
import unicodedata
import zipfile
import xml.etree.ElementTree as ET

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


# --------------------------------------------------------------------------
# Lectura de .xlsx con stdlib
# --------------------------------------------------------------------------
def col_index(ref):
    """'E12' -> 4 (indice 0-based de la columna)."""
    letters = re.match(r"([A-Z]+)", ref).group(1)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def col_letter(idx):
    """4 -> 'E'."""
    s = ""
    n = idx
    while n >= 0:
        s = chr(65 + n % 26) + s
        n = n // 26 - 1
    return s


def read_rows(path):
    """Devuelve la primera hoja como lista de filas, cada fila lista de strings."""
    with zipfile.ZipFile(path) as z:
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall("main:si", NS):
                shared.append("".join(t.text or "" for t in si.iter(f"{{{NS['main']}}}t")))

        sheet_path = first_sheet_path(z)
        root = ET.fromstring(z.read(sheet_path))

        rows = []
        for row in root.iter(f"{{{NS['main']}}}row"):
            cells = {}
            for c in row.findall("main:c", NS):
                ref = c.get("r") or ""
                if not ref:
                    continue
                idx = col_index(ref)
                ctype = c.get("t")
                if ctype == "s":
                    v = c.find("main:v", NS)
                    value = shared[int(v.text)] if v is not None and v.text else ""
                elif ctype == "inlineStr":
                    value = "".join(t.text or "" for t in c.iter(f"{{{NS['main']}}}t"))
                else:
                    v = c.find("main:v", NS)
                    value = v.text if v is not None and v.text else ""
                cells[idx] = value
            if cells:
                width = max(cells) + 1
                rows.append([cells.get(i, "") for i in range(width)])
        return rows


def first_sheet_path(z):
    """Resuelve la ruta XML de la primera hoja del libro."""
    try:
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        sheet = wb.find("main:sheets/main:sheet", NS)
        rid = sheet.get(f"{{{NS['rel']}}}id")
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        for r in rels.findall("pkgrel:Relationship", NS):
            if r.get("Id") == rid:
                target = r.get("Target").lstrip("/")
                return target if target.startswith("xl/") else "xl/" + target
    except Exception:
        pass
    return "xl/worksheets/sheet1.xml"


# --------------------------------------------------------------------------
# Normalizacion de datos
# --------------------------------------------------------------------------
def norm(s):
    s = unicodedata.normalize("NFD", str(s or "").strip().lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def parse_price(v):
    s = re.sub(r"[^\d,.\-]", "", str(v or "").strip())
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def format_price(n):
    entero, dec = f"{n:.2f}".split(".")
    entero = f"{int(entero):,}".replace(",", ".")
    return entero, dec


def ean_valido(codigo):
    """True si el codigo es un EAN-13 (o UPC-A de 12) con digito verificador correcto."""
    d = re.sub(r"\D", "", str(codigo or ""))
    if len(d) == 12:
        d = "0" + d
    if len(d) != 13:
        return False
    suma = sum(int(d[i]) * (1 if i % 2 == 0 else 3) for i in range(12))
    return (10 - suma % 10) % 10 == int(d[12])


def buscar_columna_ean(rows):
    """Ubica la columna del codigo de barras por el nombre del encabezado."""
    for fila in rows[:5]:
        for i, celda in enumerate(fila):
            h = norm(celda)
            if "barra" in h or h == "ean" in h or "ean13" in h or "gtin" in h:
                return i
    return -1


def load_products(path, c_cod, c_desc, c_precio, c_marca, c_ean=None):
    rows = read_rows(path)
    if not rows:
        sys.exit(f"El archivo {path} no tiene filas.")

    if c_ean is None:
        c_ean = buscar_columna_ean(rows)

    productos = []
    for r in rows:
        def cell(i):
            return r[i].strip() if i is not None and 0 <= i < len(r) else ""

        codigo, desc = cell(c_cod), cell(c_desc)
        if not codigo or not desc:
            continue
        # Saltea la fila de encabezado (donde el precio no es un numero valido)
        precio_raw = cell(c_precio)
        if not re.search(r"\d", precio_raw):
            continue
        marca = cell(c_marca) if c_marca is not None and c_marca >= 0 else ""
        # Si el Excel no trae columna de barras, se usa el codigo cuando es un EAN valido
        ean = re.sub(r"\D", "", cell(c_ean)) if c_ean is not None and c_ean >= 0 else ""
        if not ean and ean_valido(codigo):
            ean = re.sub(r"\D", "", codigo)
        productos.append({
            "codigo": codigo,
            "descripcion": desc,
            "precio": parse_price(precio_raw),
            "marca": marca or (desc.split()[0] if desc.split() else "(sin marca)"),
            "ean": ean,
        })
    return productos


# --------------------------------------------------------------------------
# HTML
# --------------------------------------------------------------------------
PLANTILLA = """<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Etiquetas de precios</title>
<style>
  *{{box-sizing:border-box}}
  body{{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f4f6f6}}
  .barra{{padding:12px 16px;background:#363435;color:#fff;display:flex;gap:14px;align-items:center}}
  .barra button{{margin-left:auto;padding:8px 16px;border:none;border-radius:8px;
      background:#57a595;color:#fff;font-weight:600;cursor:pointer}}
  .hoja{{padding:26px 20px;display:flex}}
  /* Medida fisica fija de la etiqueta de gondola: {ancho} x {alto} mm */
  .grid{{
    display:grid;grid-template-columns:repeat({cols},{ancho}mm);justify-content:center;
    /* El ancho tiene que ser exactamente el de las columnas: el marco de la izquierda y
       el de arriba se dibujan en el borde de esta caja, y si fuera mas ancha esas dos
       lineas quedarian separadas de la primera etiqueta y saliendose a los costados. */
    width:calc({cols} * {ancho}mm + 1.6px);margin:0 auto;background:#fff;
    border-left:1.6px solid #000;border-top:1.6px solid #000;
  }}
  .et{{
    height:{alto}mm;overflow:hidden;background:#fff;color:#000;
    border-right:1.6px solid #000;border-bottom:1.6px solid #000;
    display:flex;flex-direction:column;break-inside:avoid;
    font-family:Arial,"Helvetica Neue",Helvetica,sans-serif;
  }}
  .desc{{
    height:25%;flex:none;display:flex;align-items:center;overflow:hidden;
    padding:0 2.2mm;border-bottom:1.6px solid #000;
    font-size:{txt}px;font-weight:700;text-transform:uppercase;letter-spacing:-.3px;
  }}
  .desc span{{display:block;width:100%;min-width:0;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
  .medio{{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:0 2mm}}
  .precio{{font-size:{precio}px;font-weight:800;line-height:.95;letter-spacing:-.045em;white-space:nowrap}}
  .pie{{
    height:12.5%;flex:none;display:grid;grid-template-columns:1fr auto 1fr;
    align-items:center;gap:1.5mm;padding:0 2.2mm;border-top:1.6px solid #000;
    font-size:{pie}px;font-weight:700;line-height:1;
  }}
  .pie .izq{{text-align:left;white-space:nowrap;overflow:hidden}}
  .pie .cen{{text-align:center;white-space:nowrap}}
  .pie .der{{text-align:right;white-space:nowrap;overflow:hidden}}
  @media print{{
    .barra{{display:none}} body{{background:#fff}} .hoja{{padding:0;display:block}}
    @page{{size:A4;margin:7mm}}
  }}
</style></head><body>
<div class="barra"><strong>{n} etiquetas</strong><span>{detalle}</span>
<button onclick="window.print()">Imprimir</button></div>
<div class="hoja"><div class="grid">{etiquetas}</div></div>
</body></html>
"""


def render(productos, cols, ancho, alto, txt, detalle, mostrar_codigo=True):
    partes = []
    for p in productos:
        entero, dec = format_price(p["precio"])
        izq = f'Cod: {html.escape(p["codigo"])}' if mostrar_codigo else ""
        der = html.escape(p.get("ean", "") or "")
        partes.append(
            '<div class="et">'
            f'<div class="desc"><span>{html.escape(p["descripcion"])}</span></div>'
            f'<div class="medio"><div class="precio">${entero},{dec}</div></div>'
            f'<div class="pie"><span class="izq">{izq}</span>'
            f'<span class="cen">PRECIO FINAL</span><span class="der">{der}</span></div>'
            '</div>'
        )
    # Completa la ultima fila para que las lineas de corte lleguen al borde
    resto = len(productos) % cols
    if resto:
        partes += ['<div class="et"></div>'] * (cols - resto)

    return PLANTILLA.format(
        cols=cols, ancho=ancho, alto=alto, txt=txt,
        precio=round(txt * 3.8), pie=round(txt * 0.5, 1),
        n=len(productos), detalle=html.escape(detalle), etiquetas="".join(partes),
    )


# --------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Genera etiquetas de precios desde el Excel de Chess.")
    ap.add_argument("excel", help="Excel exportado de Chess (Lista 1 - Lista general)")
    ap.add_argument("-o", "--salida", default="etiquetas.html")
    ap.add_argument("--col-codigo", default="E", help="Columna del codigo de Chess (default E)")
    ap.add_argument("--col-descripcion", default="F", help="Columna de la descripcion (default F)")
    ap.add_argument("--col-precio", default="S", help="Columna del precio unitario (default S)")
    ap.add_argument("--col-marca", default="AA", help="Columna de la marca (default AA); vacio = usar la 1a palabra de la descripcion")
    ap.add_argument("--col-barras", default=None, help="Columna del codigo de barras; si se omite se busca por el nombre del encabezado")
    ap.add_argument("--marca", action="append", default=[], help="Filtrar por marca (repetible)")
    ap.add_argument("--codigos", default=None, help="Lista de codigos separados por coma")
    ap.add_argument("--codigos-archivo", default=None, help="Archivo de texto con un codigo por linea")
    ap.add_argument("--min", type=float, default=None, help="Precio minimo")
    ap.add_argument("--max", type=float, default=None, help="Precio maximo")
    ap.add_argument("--incluir-cero", action="store_true", help="Incluir articulos con precio $0 (por defecto se excluyen)")
    ap.add_argument("--excluir", action="append", default=[], help="Codigo o palabra a excluir (repetible)")
    ap.add_argument("--comparar-con", default=None, help="Excel anterior para detectar cambios de precio")
    ap.add_argument("--solo-cambios", action="store_true", help="Solo productos cuyo precio cambio")
    ap.add_argument("--ancho", type=int, default=90, help="Ancho de cada etiqueta en mm (default 90, el de la gondola)")
    ap.add_argument("--alto", type=int, default=40, help="Alto de cada etiqueta en mm (default 40, el de la gondola)")
    ap.add_argument("--texto", type=float, default=19, help="Tamano del texto de la descripcion en px (default 19)")
    ap.add_argument("--sin-codigo", action="store_true", help="No imprimir el codigo en la etiqueta")
    args = ap.parse_args()

    letra = lambda x: col_index(x.upper() + "1") if x else None
    col_ean = letra(args.col_barras) if args.col_barras else None
    productos = load_products(
        args.excel, letra(args.col_codigo), letra(args.col_descripcion),
        letra(args.col_precio), letra(args.col_marca), col_ean,
    )
    total_leidos = len(productos)
    filtros = []

    if not args.incluir_cero:
        productos = [p for p in productos if p["precio"] > 0]
        filtros.append("sin $0")

    for ex in args.excluir:
        e = norm(ex)
        productos = [p for p in productos if norm(p["codigo"]) != e and e not in norm(p["descripcion"])]
    if args.excluir:
        filtros.append(f"{len(args.excluir)} exclusiones")

    if args.marca:
        marcas = {norm(m) for m in args.marca}
        productos = [p for p in productos if norm(p["marca"]) in marcas]
        filtros.append("marca: " + ", ".join(args.marca))

    codigos = set()
    if args.codigos:
        codigos |= {norm(c) for c in args.codigos.split(",") if c.strip()}
    if args.codigos_archivo:
        with open(args.codigos_archivo, encoding="utf-8") as f:
            codigos |= {norm(l) for l in f if l.strip()}
    if codigos:
        productos = [p for p in productos if norm(p["codigo"]) in codigos]
        filtros.append(f"{len(codigos)} codigos")

    if args.min is not None:
        productos = [p for p in productos if p["precio"] >= args.min]
        filtros.append(f"desde ${args.min}")
    if args.max is not None:
        productos = [p for p in productos if p["precio"] <= args.max]
        filtros.append(f"hasta ${args.max}")

    if args.comparar_con:
        previos = load_products(
            args.comparar_con, letra(args.col_codigo), letra(args.col_descripcion),
            letra(args.col_precio), letra(args.col_marca), col_ean,
        )
        anterior = {p["codigo"]: p["precio"] for p in previos}
        cambios, nuevos = [], []
        for p in productos:
            if p["codigo"] not in anterior:
                nuevos.append(p)
            elif round(anterior[p["codigo"]] * 100) != round(p["precio"] * 100):
                p["precio_anterior"] = anterior[p["codigo"]]
                cambios.append(p)
        print(f"Comparacion: {len(cambios)} precios cambiados, {len(nuevos)} nuevos.")
        for p in cambios:
            print(f"  {p['codigo']}  {p['descripcion'][:45]:45s} "
                  f"${p['precio_anterior']:.2f} -> ${p['precio']:.2f}")
        if args.solo_cambios:
            productos = cambios + nuevos
            filtros.append("solo cambios")

    if not productos:
        sys.exit("Ningun producto quedo despues de aplicar los filtros.")

    productos.sort(key=lambda p: (p["marca"].lower(), p["descripcion"].lower()))
    detalle = " · ".join(filtros) if filtros else "sin filtros"

    # Cuantas entran en una A4 (196 x 283 mm utiles) con esa medida fisica
    cols = max(1, int(196 // args.ancho))
    filas = max(1, int(283 // args.alto))
    por_hoja = cols * filas
    hojas = -(-len(productos) // por_hoja)

    with open(args.salida, "w", encoding="utf-8") as f:
        f.write(render(productos, cols, args.ancho, args.alto, args.texto,
                       detalle, not args.sin_codigo))

    print(f"{len(productos)} etiquetas generadas (de {total_leidos} productos leidos)")
    print(f"{hojas} hoja(s) A4, {por_hoja} por hoja de {args.ancho} x {args.alto} mm -> {args.salida}")


if __name__ == "__main__":
    main()
