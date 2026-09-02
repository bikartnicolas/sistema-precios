// Carga en el sistema un Excel de precios que ya tenes bajado.
//
//   node generar-datos.js ../descargas/2026-09-02_precios.xlsx
//
// Si no le pasas ruta, toma el Excel mas reciente de la carpeta descargas/.
// Despues de correrlo, abris web/index.html y los productos ya estan cargados.

const fs = require('fs');
const path = require('path');
const { escribirDatosWeb } = require('./lib-datos');

function ultimoExcel(dir) {
  if (!fs.existsSync(dir)) return null;
  const archivos = fs.readdirSync(dir)
    .filter(f => /\.(xlsx|xls)$/i.test(f))
    .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return archivos.length ? path.join(dir, archivos[0].f) : null;
}

const arg = process.argv[2];
const excel = arg ? path.resolve(arg) : ultimoExcel(path.resolve(__dirname, '../descargas'));

if (!excel || !fs.existsSync(excel)) {
  console.error('No encontre el Excel. Pasale la ruta:  node generar-datos.js ruta/al/archivo.xlsx');
  process.exit(1);
}

const { cantidad, destino } = escribirDatosWeb(excel);
console.log(`${cantidad} productos cargados desde ${path.basename(excel)}`);
console.log(`Listo en ${destino} — abri web/index.html y dale Continuar.`);
