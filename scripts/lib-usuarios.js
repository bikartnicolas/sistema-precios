// Usuarios, contraseñas y permisos del sistema.
//
// Las contraseñas NO se guardan como texto: se guarda un hash (scrypt) con una sal
// distinta para cada usuario, así aunque alguien vea el archivo no puede leerlas.
//
// Archivos (dentro de datos/):
//   usuarios.json   los usuarios, su rol y el hash de la contraseña
//   sesiones.json   quién está con la sesión abierta, para no tener que entrar de nuevo
//                   cada vez que se reinicia el servidor

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR_DATOS = path.resolve(__dirname, '../datos');
const ARCH_USUARIOS = path.join(DIR_DATOS, 'usuarios.json');
const ARCH_SESIONES = path.join(DIR_DATOS, 'sesiones.json');
const DIAS_SESION = 30;

// --------------------------------------------------------------------------
// Permisos
// --------------------------------------------------------------------------
// ver_listas    ver el historial de listas y los precios guardados
// ver_cambios   ver la pantalla de cambios de precio
// imprimir      generar e imprimir etiquetas, y cambiar su formato
// subir_excel   cargar un Excel nuevo al sistema
// guardar_lista guardar la lista actual en el historial
// borrar_lista  borrar una lista del historial
// restaurar     traer un archivo de copia y sumarlo al historial
// respaldar     descargar la copia de seguridad con todos los precios
// usuarios      administrar usuarios (reservado para más adelante)
// El invitado puede imprimir cualquier etiqueta y cambiarles el formato, pero no toca
// las listas de precios ni entra a la pantalla de análisis de cambios.
// Conserva 'ver_listas' porque es lo que hace que la etiqueta sepa el precio anterior
// y que las marcas muestren cuántos productos cambiaron.
//
// Si algún día querés que el invitado vea la pantalla de cambios de precio, agregale
// 'ver_cambios' a la lista de abajo y reiniciá el servidor.
const PERMISOS_POR_ROL = {
  admin: ['ver_listas','ver_cambios','imprimir','subir_excel','guardar_lista',
          'borrar_lista','restaurar','respaldar','usuarios'],
  invitado: ['ver_listas','imprimir'],
};

const permisosDe = rol => PERMISOS_POR_ROL[rol] || PERMISOS_POR_ROL.invitado;

// --------------------------------------------------------------------------
// Contraseñas
// --------------------------------------------------------------------------
function hashClave(clave, sal) {
  return crypto.scryptSync(String(clave), sal, 32).toString('hex');
}

function nuevaClave(clave) {
  const sal = crypto.randomBytes(16).toString('hex');
  return { sal, hash: hashClave(clave, sal) };
}

// Comparación en tiempo constante: no delata la contraseña por lo que tarda
function claveCorrecta(usuario, clave) {
  if (!usuario || !usuario.sal || !usuario.hash) return false;
  const a = Buffer.from(hashClave(clave, usuario.sal), 'hex');
  const b = Buffer.from(usuario.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// --------------------------------------------------------------------------
// Usuarios
// --------------------------------------------------------------------------
function leerUsuarios() {
  try {
    const d = JSON.parse(fs.readFileSync(ARCH_USUARIOS, 'utf8'));
    if (Array.isArray(d.usuarios) && d.usuarios.length) return d.usuarios;
  } catch (e) { /* no existe todavía o está roto: se crean los de fábrica */ }
  return null;
}

function guardarUsuarios(usuarios) {
  fs.mkdirSync(DIR_DATOS, { recursive: true });
  fs.writeFileSync(ARCH_USUARIOS, JSON.stringify({ usuarios }, null, 1), 'utf8');
}

// Se crean la primera vez que arranca el servidor
function usuariosDeFabrica() {
  return [
    Object.assign({ usuario: 'nico', nombre: 'Nico', rol: 'admin' }, nuevaClave('tumalac')),
    Object.assign({ usuario: 'invitado', nombre: 'Invitado', rol: 'invitado' }, nuevaClave('invitado')),
  ];
}

function iniciarUsuarios() {
  let usuarios = leerUsuarios();
  if (usuarios) return { usuarios, nuevos: false };
  usuarios = usuariosDeFabrica();
  guardarUsuarios(usuarios);
  return { usuarios, nuevos: true };
}

const buscarUsuario = (usuarios, nombre) =>
  usuarios.find(u => u.usuario.toLowerCase() === String(nombre || '').trim().toLowerCase());

// Lo que se le cuenta al navegador: nunca el hash ni la sal
const usuarioPublico = u => ({
  usuario: u.usuario, nombre: u.nombre || u.usuario, rol: u.rol,
  permisos: permisosDe(u.rol),
});

// --------------------------------------------------------------------------
// Sesiones
// --------------------------------------------------------------------------
function leerSesiones() {
  try {
    const d = JSON.parse(fs.readFileSync(ARCH_SESIONES, 'utf8'));
    const vivas = new Map();
    const ahora = Date.now();
    for (const [token, s] of Object.entries(d.sesiones || {})) {
      if (s.vence > ahora) vivas.set(token, s);
    }
    return vivas;
  } catch (e) { return new Map(); }
}

function guardarSesiones(sesiones) {
  try {
    fs.mkdirSync(DIR_DATOS, { recursive: true });
    fs.writeFileSync(ARCH_SESIONES, JSON.stringify({ sesiones: Object.fromEntries(sesiones) }), 'utf8');
  } catch (e) { console.warn('No se pudieron guardar las sesiones:', e.message); }
}

function crearSesion(sesiones, usuario) {
  const token = crypto.randomBytes(24).toString('hex');
  sesiones.set(token, { usuario: usuario.usuario, vence: Date.now() + DIAS_SESION * 86400000 });
  guardarSesiones(sesiones);
  return token;
}

function cerrarSesion(sesiones, token) {
  if (sesiones.delete(token)) guardarSesiones(sesiones);
}

function usuarioDeToken(sesiones, usuarios, token) {
  const s = token && sesiones.get(token);
  if (!s) return null;
  if (s.vence <= Date.now()) { sesiones.delete(token); guardarSesiones(sesiones); return null; }
  return buscarUsuario(usuarios, s.usuario) || null;
}

// Cierra todas las sesiones de un usuario (por ejemplo, al cambiarle la contraseña)
function cerrarSesionesDe(sesiones, nombreUsuario) {
  let cambio = false;
  for (const [token, s] of sesiones) {
    if (s.usuario.toLowerCase() === String(nombreUsuario).toLowerCase()) { sesiones.delete(token); cambio = true; }
  }
  if (cambio) guardarSesiones(sesiones);
}

module.exports = {
  ARCH_USUARIOS, DIAS_SESION, PERMISOS_POR_ROL, permisosDe,
  nuevaClave, claveCorrecta,
  leerUsuarios, guardarUsuarios, iniciarUsuarios, buscarUsuario, usuarioPublico,
  leerSesiones, crearSesion, cerrarSesion, usuarioDeToken, cerrarSesionesDe,
};
