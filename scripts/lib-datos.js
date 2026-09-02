// Convierte el Excel de precios de Chess en web/datos.js, que el sistema lee solo
// al abrirse (asi no hay que subir el archivo a mano).
//
// Columnas del export de Chess:
//   E = codigo    F = descripcion    S = precio unitario    AA = marca

const fs = require('fs');
const path = require('path');

function col(letra) {
  let n = 0;
  for (const ch of String(letra).toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parsePrecio(v) {
  if (typeof v === 'number') return v;
  let s = String(v ?? '').trim().replace(/[^\d,.\-]/g, '');
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function leerProductos(excelPath, columnas = {}) {
  const XLSX = require('xlsx');
  const c = Object.assign({ codigo: 'E', descripcion: 'F', precio: 'S', marca: 'AA' }, columnas);
  const ci = col(c.codigo), di = col(c.descripcion), pi = col(c.precio), mi = col(c.marca);

  const wb = XLSX.readFile(excelPath);
  const filas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });

  const productos = [];
  for (const r of filas) {
    const codigo = String(r[ci] ?? '').trim();
    const descripcion = String(r[di] ?? '').trim();
    const precio = parsePrecio(r[pi]);
    // Saltea la fila de encabezado y los articulos en $0 (no van a gondola).
    if (!codigo || !descripcion || !precio || !/\d/.test(codigo)) continue;
    productos.push({
      codigo,
      descripcion,
      precio,
      marca: String(r[mi] ?? '').trim() || descripcion.split(/\s+/)[0] || 'Sin marca',
    });
  }
  return productos;
}

function escribirDatosWeb(excelPath, columnas = {}) {
  const productos = leerProductos(excelPath, columnas);
  const salida = {
    generado: new Date().toISOString(),
    archivo: path.basename(excelPath),
    productos,
  };
  const destino = path.resolve(__dirname, '../web/datos.js');
  fs.writeFileSync(destino, 'window.DATOS_PRECIOS = ' + JSON.stringify(salida, null, 1) + ';\n', 'utf8');
  return { cantidad: productos.length, destino };
}

module.exports = { leerProductos, escribirDatosWeb };
