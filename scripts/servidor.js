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
const U = require('./lib-usuarios');

const PUERTO = Number(process.env.PORT) || 8080;
const RAIZ_WEB = path.resolve(__dirname, '../web');
const DIR_DATOS = path.resolve(__dirname, '../datos');
const DIR_LISTAS = path.join(DIR_DATOS, 'listas');
const ARCH_GONDOLA = path.join(DIR_DATOS, 'gondola.json');
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
// Góndola: qué etiquetas están puestas hoy en el salón.
//
// Se llena sola: cada vez que alguien imprime, esos productos quedan anotados
// con el precio que salió en el cartel y la fecha. Sirve para que la pantalla de
// cambios de precio muestre primero lo que de verdad hay que ir a cambiar, en vez
// de los miles de artículos de la lista de Chess que nunca van a la góndola.
//
// Es un solo archivo (datos/gondola.json), chico: un renglón por producto.
// --------------------------------------------------------------------------
const MAX_GONDOLA = 20000;

function leerGondola() {
  try {
    const d = JSON.parse(fs.readFileSync(ARCH_GONDOLA, 'utf8'));
    return d && d.productos && typeof d.productos === 'object' ? d.productos : {};
  } catch (e) {
    return {};   // todavía no existe, o quedó ilegible: se arranca vacía
  }
}

function escribirGondola(productos) {
  asegurarCarpeta();
  fs.writeFileSync(ARCH_GONDOLA,
    JSON.stringify({ actualizado: new Date().toISOString(), productos }, null, 1), 'utf8');
}

const texto = (v, max) => String(v ?? '').trim().slice(0, max);

// Anota (o vuelve a anotar) productos como puestos en la góndola
function marcarGondola(items, usuario) {
  const productos = leerGondola();
  const ahora = new Date().toISOString();
  let sumados = 0, actualizados = 0;
  for (const it of items) {
    const codigo = texto(it && it.codigo, 64);
    if (!codigo) continue;
    const precio = Number(it.precio);
    if (!isFinite(precio) || precio <= 0) continue;
    if (!productos[codigo] && Object.keys(productos).length >= MAX_GONDOLA) break;
    productos[codigo] ? actualizados++ : sumados++;
    productos[codigo] = {
      codigo,
      descripcion: texto(it.descripcion, 200),
      marca: texto(it.marca, 80),
      precio,                 // el precio que quedó impreso en el cartel
      // Al imprimir no viene fecha (es ahora). Sí viene cuando se restaura una copia
      // de seguridad: ahí hay que conservar cuándo se imprimió de verdad.
      fecha: texto(it.fecha, 40) || ahora,
      usuario: texto(it.usuario, 40) || texto(usuario, 40),
    };
  }
  if (sumados || actualizados) escribirGondola(productos);
  return { sumados, actualizados, total: Object.keys(productos).length };
}

function quitarDeGondola(codigos) {
  const productos = leerGondola();
  let quitados = 0;
  for (const c of codigos) {
    const codigo = texto(c, 64);
    if (productos[codigo]) { delete productos[codigo]; quitados++; }
  }
  if (quitados) escribirGondola(productos);
  return { quitados, total: Object.keys(productos).length };
}

// --------------------------------------------------------------------------
// Usuarios y sesiones
// --------------------------------------------------------------------------
const arranque = U.iniciarUsuarios();
let USUARIOS = arranque.usuarios;
const SESIONES = U.leerSesiones();

// Si se cambia una contraseña o se agrega un usuario con "npm run clave" mientras el
// servidor está andando, el cambio tiene que valer al toque, sin reiniciar nada.
let selloUsuarios = 0;
function refrescarUsuarios() {
  try {
    const sello = fs.statSync(U.ARCH_USUARIOS).mtimeMs;
    if (sello === selloUsuarios) return;
    const nuevos = U.leerUsuarios();
    if (nuevos) {
      USUARIOS = nuevos;
      if (selloUsuarios) console.log('Cambió usuarios.json: usuarios recargados');
    }
    selloUsuarios = sello;
  } catch (e) { /* si no se puede leer, se sigue con los que ya estaban */ }
}
refrescarUsuarios();

// Freno simple contra el que prueba contraseñas a mano: tras varios errores
// seguidos desde la misma IP, hay que esperar.
const fallos = new Map();
const MAX_FALLOS = 8, ESPERA_MS = 5 * 60 * 1000;

function bloqueado(ip) {
  const f = fallos.get(ip);
  if (!f) return false;
  if (Date.now() - f.desde > ESPERA_MS) { fallos.delete(ip); return false; }
  return f.n >= MAX_FALLOS;
}
function sumarFallo(ip) {
  const f = fallos.get(ip);
  if (!f || Date.now() - f.desde > ESPERA_MS) fallos.set(ip, { n: 1, desde: Date.now() });
  else f.n++;
}

function leerCookie(req, nombre) {
  const crudo = req.headers.cookie || '';
  for (const parte of crudo.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nombre) return decodeURIComponent(v.join('='));
  }
  return null;
}

const quienEs = req => U.usuarioDeToken(SESIONES, USUARIOS, leerCookie(req, 'sesion'));
const puede = (usuario, permiso) => !!usuario && U.permisosDe(usuario.rol).includes(permiso);

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
    refrescarUsuarios();
    const yo = quienEs(req);
    const ip = req.socket.remoteAddress || 'desconocida';

    // ---------------- Sesión ----------------
    if (ruta === '/api/sesion' && req.method === 'GET') {
      return json(res, 200, yo ? { entro: true, ...U.usuarioPublico(yo) } : { entro: false });
    }

    if (ruta === '/api/login' && req.method === 'POST') {
      if (bloqueado(ip)) {
        return json(res, 429, { error: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.' });
      }
      const { usuario, clave } = await leerCuerpo(req);
      const u = U.buscarUsuario(USUARIOS, usuario);
      if (!u || !U.claveCorrecta(u, clave || '')) {
        sumarFallo(ip);
        console.log(`Intento fallido de "${usuario}" desde ${ip}`);
        return json(res, 401, { error: 'Usuario o contraseña incorrectos' });
      }
      fallos.delete(ip);
      const token = U.crearSesion(SESIONES, u);
      res.setHeader('Set-Cookie',
        `sesion=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${U.DIAS_SESION * 86400}`);
      console.log(`Entró ${u.usuario} (${u.rol}) desde ${ip}`);
      return json(res, 200, { entro: true, ...U.usuarioPublico(u) });
    }

    if (ruta === '/api/salir' && req.method === 'POST') {
      U.cerrarSesion(SESIONES, leerCookie(req, 'sesion'));
      res.setHeader('Set-Cookie', 'sesion=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
      return json(res, 200, { entro: false });
    }

    // De acá para abajo hay que haber entrado
    if (ruta.startsWith('/api/') && !yo) {
      return json(res, 401, { error: 'Entrá con tu usuario' });
    }

    const sinPermiso = p => json(res, 403,
      { error: 'Tu usuario no tiene permiso para esto. Pedíselo a Nico.' , permiso: p });

    // ---------------- API ----------------
    if (ruta === '/api/info') {
      return json(res, 200, { modo: 'servidor', carpeta: DIR_LISTAS, listas: listarMetas().length });
    }

    if (ruta === '/api/listas' && req.method === 'GET') {
      if (!puede(yo, 'ver_listas')) return sinPermiso('ver_listas');
      return json(res, 200, listarMetas());
    }

    if (ruta === '/api/listas' && req.method === 'POST') {
      if (!puede(yo, 'guardar_lista')) return sinPermiso('guardar_lista');
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
      console.log(`Lista guardada por ${yo.usuario}: ${lista.id} (${lista.items.length} productos, ${lista.origen})`);
      return json(res, 200, resumen(lista));
    }

    const mLista = ruta.match(/^\/api\/listas\/([^/]+)$/);
    if (mLista) {
      const id = decodeURIComponent(mLista[1]);
      if (!idValido(id)) return json(res, 400, { error: 'Identificador inválido' });
      if (req.method === 'GET') {
        if (!puede(yo, 'ver_listas')) return sinPermiso('ver_listas');
        if (!fs.existsSync(rutaLista(id))) return json(res, 404, { error: 'No existe esa lista' });
        return json(res, 200, leerLista(id));
      }
      if (req.method === 'DELETE') {
        if (!puede(yo, 'borrar_lista')) return sinPermiso('borrar_lista');
        borrarLista(id);
        console.log(`Lista borrada por ${yo.usuario}:`, id);
        return json(res, 200, { ok: true });
      }
    }

    // ---------------- Góndola ----------------
    if (ruta === '/api/gondola' && req.method === 'GET') {
      if (!puede(yo, 'gondola')) return sinPermiso('gondola');
      const productos = leerGondola();
      return json(res, 200, Object.values(productos).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));
    }

    if (ruta === '/api/gondola' && req.method === 'POST') {
      if (!puede(yo, 'gondola')) return sinPermiso('gondola');
      const cuerpo = await leerCuerpo(req);
      if (!Array.isArray(cuerpo.items)) return json(res, 400, { error: 'Falta la lista de productos' });
      const r = marcarGondola(cuerpo.items, yo.usuario);
      console.log(`Góndola por ${yo.usuario}: ${r.sumados} nuevos, ${r.actualizados} actualizados (${r.total} en total)`);
      return json(res, 200, r);
    }

    if (ruta === '/api/gondola/quitar' && req.method === 'POST') {
      if (!puede(yo, 'gondola')) return sinPermiso('gondola');
      const cuerpo = await leerCuerpo(req);
      if (!Array.isArray(cuerpo.codigos)) return json(res, 400, { error: 'Faltan los códigos' });
      const r = quitarDeGondola(cuerpo.codigos);
      console.log(`Góndola por ${yo.usuario}: ${r.quitados} quitados (${r.total} en total)`);
      return json(res, 200, r);
    }

    const mProd = ruta.match(/^\/api\/producto\/([^/]+)$/);
    if (mProd && req.method === 'GET') {
      if (!puede(yo, 'ver_listas')) return sinPermiso('ver_listas');
      return json(res, 200, evolucionProducto(decodeURIComponent(mProd[1])));
    }

    if (ruta.startsWith('/api/')) return json(res, 404, { error: 'Ruta desconocida' });

    // ---------------- Web ----------------
    // datos.js tiene la lista de precios: no se entrega sin haber entrado.
    // El resto (pantalla, logo, librerías) es público: sin sesión solo se ve el login.
    if (ruta === '/datos.js' && !yo) {
      res.writeHead(200, { 'Content-Type': TIPOS['.js'], 'Cache-Control': 'no-store' });
      return res.end('// Entrá con tu usuario para ver la lista de precios.\n');
    }
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
  console.log('  Usuarios: ' + USUARIOS.map(u => `${u.usuario} (${u.rol})`).join(', '));

  if (arranque.nuevos) {
    console.log('');
    console.log('  ' + '!'.repeat(52));
    console.log('  PRIMERA VEZ: se crearon los usuarios con contraseñas de fábrica');
    console.log('');
    console.log('      nico      / tumalac     (administrador: puede todo)');
    console.log('      invitado  / invitado    (solo imprimir etiquetas)');
    console.log('');
    console.log('  CAMBIALAS AHORA con:   npm run clave nico');
    console.log('  ' + '!'.repeat(52));
  }
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
