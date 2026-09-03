// Administrar los usuarios del sistema desde la ventana de comandos.
//
//   npm run usuarios                    ver la lista de usuarios
//   npm run clave nico                  cambiar la contraseña de nico (la pide en pantalla)
//   npm run clave nico -- miclave123    igual, pero sin que la pregunte
//   npm run usuarios -- nuevo juan admin        crear un usuario administrador
//   npm run usuarios -- nuevo deposito invitado crear un usuario invitado
//   npm run usuarios -- borrar juan             borrar un usuario
//
// Roles:
//   admin      puede todo: cargar listas, guardarlas, borrarlas, respaldar
//   invitado   solo ver e imprimir etiquetas; no puede tocar las listas de precios

const readline = require('readline');
const U = require('./lib-usuarios');

// Una sola lectura de teclado para todas las preguntas: si se abre una por pregunta,
// la segunda encuentra la entrada ya cerrada y queda colgada.
const enTerminal = Boolean(process.stdin.isTTY);
let lectura = null, textoActual = '';

function abrirLectura() {
  if (lectura) return lectura;
  lectura = readline.createInterface({
    input: process.stdin, output: process.stdout, terminal: enTerminal,
  });
  // En una terminal de verdad se oculta lo que se escribe, para que nadie lo lea de atrás
  if (enTerminal) {
    lectura._writeToOutput = function (s) {
      if (s.includes(textoActual)) process.stdout.write(s);
    };
  }
  return lectura;
}
function cerrarLectura() { if (lectura) { lectura.close(); lectura = null; } }

function preguntarClave(texto) {
  return new Promise((resolve, reject) => {
    const rl = abrirLectura();
    textoActual = texto;
    // Si la entrada se corta antes de contestar, avisa en vez de quedarse en silencio
    const alCerrar = () => reject(new Error('No se leyó la contraseña. Escribila cuando la pida, ' +
      'o pasala directo:  npm run clave <usuario> -- <contraseña>'));
    rl.once('close', alCerrar);
    rl.question(texto, r => {
      rl.off('close', alCerrar);
      if (enTerminal) process.stdout.write('\n');
      resolve(String(r).trim());
    });
  });
}

// La contraseña puede venir por parámetro (práctico para scripts) o preguntarse.
async function obtenerClave(texto, desdeParametro) {
  if (desdeParametro) return String(desdeParametro).trim();
  return preguntarClave(texto);
}

function listar(usuarios) {
  console.log('');
  console.log('  Usuarios del sistema');
  console.log('  ' + '-'.repeat(58));
  for (const u of usuarios) {
    console.log(`  ${u.usuario.padEnd(14)} ${(u.nombre || '').padEnd(16)} ${u.rol}`);
    console.log(`  ${''.padEnd(14)} permisos: ${U.permisosDe(u.rol).join(', ')}`);
  }
  console.log('');
  console.log('  Cambiar una contraseña:  npm run clave <usuario>');
  console.log('');
}

async function main() {
  const { usuarios } = U.iniciarUsuarios();
  const [accion, a, b, c] = process.argv.slice(2);

  if (!accion || accion === 'ver') return listar(usuarios);

  if (accion === 'clave') {
    if (!a) return console.error('Falta el usuario:  npm run clave nico');
    const u = U.buscarUsuario(usuarios, a);
    if (!u) return console.error(`No existe el usuario "${a}".`);
    const c1 = await obtenerClave(`Contraseña nueva para ${u.usuario}: `, b);
    if (c1.length < 4) return console.error('Muy corta: poné al menos 4 caracteres.');
    if (!b) {
      const c2 = await preguntarClave('Repetila: ');
      if (c1 !== c2) return console.error('No coinciden. No se cambió nada.');
    }
    Object.assign(u, U.nuevaClave(c1));
    U.guardarUsuarios(usuarios);
    // Si tenía la sesión abierta en algún lado, se cierra: tiene que entrar de nuevo
    U.cerrarSesionesDe(U.leerSesiones(), u.usuario);
    console.log(`Listo: contraseña de ${u.usuario} cambiada.`);
    return;
  }

  if (accion === 'nuevo') {
    const rol = b || 'invitado';
    if (!a) return console.error('Falta el nombre:  npm run usuarios -- nuevo juan invitado');
    if (!U.PERMISOS_POR_ROL[rol]) {
      return console.error(`Rol desconocido "${rol}". Puede ser: ${Object.keys(U.PERMISOS_POR_ROL).join(' o ')}.`);
    }
    if (U.buscarUsuario(usuarios, a)) return console.error(`Ya existe el usuario "${a}".`);
    const c1 = await obtenerClave(`Contraseña para ${a}: `, c);
    if (c1.length < 4) return console.error('Muy corta: poné al menos 4 caracteres.');
    usuarios.push(Object.assign(
      { usuario: a.toLowerCase(), nombre: a.charAt(0).toUpperCase() + a.slice(1), rol },
      U.nuevaClave(c1)));
    U.guardarUsuarios(usuarios);
    console.log(`Listo: usuario "${a}" creado como ${rol}.`);
    return;
  }

  if (accion === 'borrar') {
    if (!a) return console.error('Falta el usuario:  npm run usuarios -- borrar juan');
    const u = U.buscarUsuario(usuarios, a);
    if (!u) return console.error(`No existe el usuario "${a}".`);
    if (u.rol === 'admin' && usuarios.filter(x => x.rol === 'admin').length === 1) {
      return console.error('Es el único administrador: si lo borrás, nadie puede administrar el sistema.');
    }
    U.guardarUsuarios(usuarios.filter(x => x !== u));
    U.cerrarSesionesDe(U.leerSesiones(), u.usuario);
    console.log(`Listo: usuario "${a}" borrado.`);
    return;
  }

  console.error(`No entiendo "${accion}". Opciones: ver, clave, nuevo, borrar.`);
}

main()
  .then(cerrarLectura)
  .catch(e => { cerrarLectura(); console.error('Error:', e.message); process.exit(1); });
