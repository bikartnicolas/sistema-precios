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


def load_products(path, c_cod, c_desc, c_precio, c_marca):
    rows = read_rows(path)
    if not rows:
        sys.exit(f"El archivo {path} no tiene filas.")

    productos = []
    for r in rows:
        def cell(i):
            return r[i].strip() if 0 <= i < len(r) else ""

        codigo, desc = cell(c_cod), cell(c_desc)
        if not codigo or not desc:
            continue
        # Saltea la fila de encabezado (donde el precio no es un numero valido)
        precio_raw = cell(c_precio)
        if not re.search(r"\d", precio_raw):
            continue
        marca = cell(c_marca) if c_marca is not None and c_marca >= 0 else ""
        productos.append({
            "codigo": codigo,
            "descripcion": desc,
            "precio": parse_price(precio_raw),
            "marca": marca or (desc.split()[0] if desc.split() else "(sin marca)"),
        })
    return productos


# --------------------------------------------------------------------------
# HTML
# --------------------------------------------------------------------------
PLANTILLA = """<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Etiquetas de precios</title>
<style>
  body{{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}}
  .barra{{padding:12px 16px;background:#1c1f24;color:#fff;display:flex;gap:14px;align-items:center}}
  .barra button{{margin-left:auto;padding:8px 16px;border:none;border-radius:8px;background:#7a1f2b;color:#fff;font-weight:600;cursor:pointer}}
  .grid{{display:grid;grid-template-columns:repeat({cols},1fr)}}
  .et{{border:1px dashed #b9bcc2;height:{alto}mm;padding:8px 6px;display:flex;flex-direction:column;
      align-items:center;justify-content:center;text-align:center;overflow:hidden;break-inside:avoid}}
  .desc{{color:#7a1f2b;font-size:13px;font-weight:600;line-height:1.2;margin-bottom:5px;
      display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}}
  .precio{{font-size:40px;font-weight:800;letter-spacing:-1px;line-height:1;color:#111}}
  .precio sup{{font-size:.5em;top:-.85em}}
  .cod{{margin-top:5px;font-size:11px;color:#111}}
  @media print{{.barra{{display:none}} @page{{size:A4;margin:8mm}}}}
</style></head><body>
<div class="barra"><strong>{n} etiquetas</strong><span>{detalle}</span>
<button onclick="window.print()">Imprimir</button></div>
<div class="grid">{etiquetas}</div>
</body></html>
"""


def render(productos, cols, alto, detalle, mostrar_codigo=True):
    partes = []
    for p in productos:
        entero, dec = format_price(p["precio"])
        cod = f'<div class="cod">{html.escape(p["codigo"])}</div>' if mostrar_codigo else ""
        partes.append(
            f'<div class="et"><div class="desc">{html.escape(p["descripcion"])}</div>'
            f'<div class="precio">{entero},<sup>{dec}</sup></div>{cod}</div>'
        )
    return PLANTILLA.format(
        cols=cols, alto=alto, n=len(productos),
        detalle=html.escape(detalle), etiquetas="".join(partes),
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
    ap.add_argument("--marca", action="append", default=[], help="Filtrar por marca (repetible)")
    ap.add_argument("--codigos", default=None, help="Lista de codigos separados por coma")
    ap.add_argument("--codigos-archivo", default=None, help="Archivo de texto con un codigo por linea")
    ap.add_argument("--min", type=float, default=None, help="Precio minimo")
    ap.add_argument("--max", type=float, default=None, help="Precio maximo")
    ap.add_argument("--incluir-cero", action="store_true", help="Incluir articulos con precio $0 (por defecto se excluyen)")
    ap.add_argument("--excluir", action="append", default=[], help="Codigo o palabra a excluir (repetible)")
    ap.add_argument("--comparar-con", default=None, help="Excel anterior para detectar cambios de precio")
    ap.add_argument("--solo-cambios", action="store_true", help="Solo productos cuyo precio cambio")
    ap.add_argument("--columnas", type=int, default=3, help="Columnas de etiquetas por hoja (default 3)")
    ap.add_argument("--alto", type=int, default=40, help="Alto de cada etiqueta en mm (default 40)")
    ap.add_argument("--sin-codigo", action="store_true", help="No imprimir el codigo en la etiqueta")
    args = ap.parse_args()

    letra = lambda x: col_index(x.upper() + "1") if x else None
    productos = load_products(
        args.excel, letra(args.col_codigo), letra(args.col_descripcion),
        letra(args.col_precio), letra(args.col_marca),
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
            letra(args.col_precio), letra(args.col_marca),
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
    with open(args.salida, "w", encoding="utf-8") as f:
        f.write(render(productos, args.columnas, args.alto, detalle, not args.sin_codigo))

    print(f"{len(productos)} etiquetas generadas (de {total_leidos} productos leidos) -> {args.salida}")


if __name__ == "__main__":
    main()
