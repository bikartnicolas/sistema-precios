// Servidor del sistema de etiquetas para la red interna de la distribuidora.
//
// Hace dos cosas:
//   1. Publica la web (carpeta ../web) para que cualquiera en la red la abra
//      desde el navegador, sin instalar nada.
//   2. Guarda el historial de listas de precios como archivos en ../datos/listas,
//      así los datos no dependen del navegador de cada uno y se pueden respaldar
//      copiando esa carpeta.
//
// Uso:   npm start        (o: node servidor.js)
// Puerto: 8080 por defecto, o el que diga la variable PORT.
//
// No usa librerías externas: solo lo que trae Node.

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PUERTO = Number(process.env.PORT) || 8080;
const RAIZ_WEB = path.resolve(__dirname, '../web');
const DIR_LISTAS = path.resolve(__dirname, '../datos/listas');
const MAX_CUERPO = 30 * 1024 * 1024;   // 30 MB: una lista de 50.000 productos entra de sobra

fs.mkdirSync(DIR_LISTAS, { recursive: true });

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.txt':  'text/plain; charset=utf-8',
  '.ico':  'image/x-icon',
};

// --------------------------------------------------------------------------
// Guardado de listas: un archivo por lista, más un archivo chico de resumen
// (.meta.json) para poder listar el historial sin leer todos los precios.
// --------------------------------------------------------------------------
const idValido = id => /^[A-Za-z0-9_-]{1,64}$/.test(id);
const rutaLista = id => path.join(DIR_LISTAS, id + '.json');
const rutaMeta  = id => path.join(DIR_LISTAS, id + '.meta.json');

// La carpeta puede desaparecer (alguien la mueve, un disco de red que se desconecta):
// se vuelve a crear antes de cada operación en vez de fallar.
function asegurarCarpeta() {
  if (!fs.existsSync(DIR_LISTAS)) fs.mkdirSync(DIR_LISTAS, { recursive: true });
}

function resumen(lista) {
  return { id: lista.id, fecha: lista.fecha, origen: lista.origen || '', n: lista.items.length };
}

function escribirLista(lista) {
  asegurarCarpeta();
  fs.writeFileSync(rutaLista(lista.id), JSON.stringify(lista), 'utf8');
  fs.writeFileSync(rutaMeta(lista.id), JSON.stringify(resumen(lista)), 'utf8');
}

function leerLista(id) {
  return JSON.parse(fs.readFileSync(rutaLista(id), 'utf8'));
}

function listarMetas() {
  asegurarCarpeta();
  const metas = [];
  for (const archivo of fs.readdirSync(DIR_LISTAS)) {
    if (!archivo.endsWith('.json') || archivo.endsWith('.meta.json')) continue;
    const id = archivo.slice(0, -5);
    try {
      // Si falta el resumen (por ejemplo, copiado a mano), se reconstruye
      if (!fs.existsSync(rutaMeta(id))) {
        const lista = leerLista(id);
        fs.writeFileSync(rutaMeta(id), JSON.stringify(resumen(lista)), 'utf8');
      }
      metas.push(JSON.parse(fs.readFileSync(rutaMeta(id), 'utf8')));
    } catch (e) {
      console.warn('Lista ilegible, se saltea:', archivo, '-', e.message);
    }
  }
  return metas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));   // más nueva primero
}

function borrarLista(id) {
  for (const p of [rutaLista(id), rutaMeta(id)]) if (fs.existsSync(p)) fs.unlinkSync(p);
}

// Historial de precios de un producto a lo largo de todas las listas guardadas
function evolucionProducto(codigo) {
  const puntos = [];
  for (const meta of listarMetas()) {
    try {
      const lista = leerLista(meta.id);
      const item = lista.items.find(i => String(i[0]) === String(codigo));
      if (item) puntos.push({ id: meta.id, fecha: meta.fecha, precio: item[1] });
    } catch (e) { /* lista rota: se ignora */ }
  }
  return puntos.reverse();   // de la más vieja a la más nueva
}

// --------------------------------------------------------------------------
// HTTP
// --------------------------------------------------------------------------
function json(res, codigo, obj) {
  const cuerpo = JSON.stringify(obj);
  res.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(cuerpo),
    'Cache-Control': 'no-store',
  });
  res.end(cuerpo);
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let datos = '', tam = 0;
    req.on('data', c => {
      tam += c.length;
      if (tam > MAX_CUERPO) { reject(new Error('El archivo es demasiado grande')); req.destroy(); return; }
      datos += c;
    });
    req.on('end', () => {
      try { resolve(datos ? JSON.parse(datos) : {}); }
      catch (e) { reject(new Error('El contenido no es JSON válido')); }
    });
    req.on('error', reject);
  });
}

function servirEstatico(req, res, ruta) {
  // Solo se sirven archivos que estén realmente dentro de la carpeta web
  const limpio = path.normalize(decodeURIComponent(ruta)).replace(/^(\.\.[/\\])+/, '');
  let destino = path.join(RAIZ_WEB, limpio);
  if (!destino.startsWith(RAIZ_WEB)) { res.writeHead(403); return res.end('Prohibido'); }
  if (fs.existsSync(destino) && fs.statSync(destino).isDirectory()) destino = path.join(destino, 'index.html');

  if (!fs.existsSync(destino)) {
    if (destino.endsWith('favicon.ico')) { res.writeHead(204); return res.end(); }
    // datos.js puede no existir todavía (si nunca se descargó de Chess): no es un error
    if (destino.endsWith('datos.js')) {
      res.writeHead(200, { 'Content-Type': TIPOS['.js'], 'Cache-Control': 'no-store' });
      return res.end('// Todavía no se descargó ninguna lista de Chess.\n');
    }
    res.writeHead(404); return res.end('No encontrado');
  }
  const tipo = TIPOS[path.extname(destino).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': tipo, 'Cache-Control': 'no-store' });
  fs.createReadStream(destino).pipe(res);
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const ruta = url.pathname;

  try {
    // ---------------- API ----------------
    if (ruta === '/api/info') {
      return json(res, 200, { modo: 'servidor', carpeta: DIR_LISTAS, listas: listarMetas().length });
    }

    if (ruta === '/api/listas' && req.method === 'GET') {
      return json(res, 200, listarMetas());
    }

    if (ruta === '/api/listas' && req.method === 'POST') {
      const cuerpo = await leerCuerpo(req);
      if (!Array.isArray(cuerpo.items) || !cuerpo.items.length) {
        return json(res, 400, { error: 'La lista no tiene productos' });
      }
      const lista = {
        id: cuerpo.id && idValido(cuerpo.id) ? cuerpo.id : 'l' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        fecha: cuerpo.fecha || new Date().toISOString(),
        origen: String(cuerpo.origen || '').slice(0, 200),
        items: cuerpo.items,
      };
      escribirLista(lista);
      console.log(`Lista guardada: ${lista.id} (${lista.items.length} productos, ${lista.origen})`);
      return json(res, 200, resumen(lista));
    }

    const mLista = ruta.match(/^\/api\/listas\/([^/]+)$/);
    if (mLista) {
      const id = decodeURIComponent(mLista[1]);
      if (!idValido(id)) return json(res, 400, { error: 'Identificador inválido' });
      if (req.method === 'GET') {
        if (!fs.existsSync(rutaLista(id))) return json(res, 404, { error: 'No existe esa lista' });
        return json(res, 200, leerLista(id));
      }
      if (req.method === 'DELETE') {
        borrarLista(id);
        console.log('Lista borrada:', id);
        return json(res, 200, { ok: true });
      }
    }

    const mProd = ruta.match(/^\/api\/producto\/([^/]+)$/);
    if (mProd && req.method === 'GET') {
      return json(res, 200, evolucionProducto(decodeURIComponent(mProd[1])));
    }

    if (ruta.startsWith('/api/')) return json(res, 404, { error: 'Ruta desconocida' });

    // ---------------- Web ----------------
    return servirEstatico(req, res, ruta === '/' ? '/index.html' : ruta);

  } catch (e) {
    console.error('Error atendiendo', ruta, '-', e.message);
    if (!res.headersSent) json(res, 500, { error: e.message });
  }
});

function direcciones() {
  const salida = [];
  for (const lista of Object.values(os.networkInterfaces())) {
    for (const i of lista || []) if (i.family === 'IPv4' && !i.internal) salida.push(i.address);
  }
  return salida;
}

servidor.listen(PUERTO, () => {
  const ips = direcciones();
  console.log('');
  console.log('  Sistema de etiquetas Tumalac — servidor encendido');
  console.log('  ' + '-'.repeat(52));
  console.log('  En esta PC:            http://localhost:' + PUERTO);
  ips.forEach(ip => console.log('  Desde la red interna:  http://' + ip + ':' + PUERTO));
  if (!ips.length) console.log('  (sin red detectada: solo se puede entrar desde esta PC)');
  console.log('');
  console.log('  Listas guardadas en:   ' + DIR_LISTAS);
  console.log('  Respaldá esa carpeta (por ejemplo, sincronizándola con Drive).');
  console.log('');
  console.log('  Para apagarlo: Ctrl + C');
  console.log('');
});

servidor.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\n  El puerto ${PUERTO} ya está en uso.`);
    console.error(`  Puede que el servidor ya esté encendido, o que otro programa lo use.`);
    console.error(`  Probá con otro puerto:  PORT=8090 npm start\n`);
  } else {
    console.error('Error del servidor:', e.message);
  }
  process.exit(1);
});
