# Instalar el sistema en la red de la distribuidora

Guía para dejar el sistema andando en una PC de Tumalac, de modo que:

- las listas de precios queden guardadas en archivos (no en el navegador de cada uno), y
- cualquiera de la distribuidora pueda entrar desde su computadora.

Se hace una sola vez. Después, el día a día es abrir el navegador y listo.

---

## Qué PC usar

La que **queda prendida** durante la jornada: normalmente la de administración. Mientras
esa PC esté apagada, los demás no pueden entrar (los datos no se pierden, solo no se
puede acceder hasta que vuelva a encenderse).

Requisitos: Windows con **Node.js** instalado (https://nodejs.org, versión LTS,
siguiente-siguiente-terminar). Node ya hacía falta para bajar la lista de Chess.

---

## 1. Copiar el sistema

Copiá la carpeta completa del sistema a esa PC, por ejemplo a `C:\tumalac-etiquetas`.
Adentro tiene que estar `web`, `scripts` y el resto de los archivos.

## 2. Instalar las dependencias (una sola vez)

Abrí la carpeta `scripts`, escribí `cmd` en la barra de direcciones del explorador y
enter. En la ventana negra:

```
npm install
```

## 3. Encender el servidor

En esa misma ventana:

```
npm start
```

Va a mostrar algo así:

```
  Sistema de etiquetas Tumalac — servidor encendido
  ----------------------------------------------------
  En esta PC:            http://localhost:8080
  Desde la red interna:  http://192.168.1.35:8080

  Listas guardadas en:   C:\tumalac-etiquetas\datos\listas
```

**Anotá la dirección que dice "Desde la red interna"**: esa es la que van a usar los demás.

Mientras esa ventana esté abierta, el sistema está funcionando. Si la cerrás, se apaga.

## 4. Probar desde otra computadora

Desde cualquier PC de la distribuidora, abrí el navegador y entrá a la dirección
anotada (por ejemplo `http://192.168.1.35:8080`). Tiene que aparecer el sistema.

Si no carga, ver **Problemas** más abajo.

---

## Que arranque solo al prender la PC

Para no tener que abrir el `cmd` a mano cada mañana:

1. Creá un archivo `iniciar.bat` dentro de la carpeta `scripts` con este contenido:

   ```bat
   @echo off
   cd /d "%~dp0"
   node servidor.js
   ```

2. Apretá `Windows + R`, escribí `shell:startup` y enter.
3. Copiá un **acceso directo** de `iniciar.bat` dentro de esa carpeta.

Desde ahí, cada vez que se prenda la PC, el sistema arranca solo.

---

## Respaldo de los datos

Todas las listas viven en la carpeta **`datos`**, al lado de `web` y `scripts`.
Respaldarlas es copiar esa carpeta.

Lo más simple: poner la carpeta `datos` dentro de la carpeta de Google Drive de la PC,
o configurar Drive para que sincronice esa carpeta. Con eso el historial queda
respaldado sin que nadie tenga que acordarse de hacer nada.

Además, desde el sistema podés apretar **Descargar copia** para bajar todo el historial
en un archivo `.json`, y **Restaurar** para volver a cargarlo.

---

## Traer el historial de la versión anterior

Si venías usando el sistema como archivo suelto (abriendo `index.html` con doble clic),
esas listas están guardadas en ese navegador y **no se ven** desde el servidor: para el
navegador son dos lugares distintos. Se pasan así:

1. Abrí el sistema **como antes** (doble clic en `index.html`).
2. En la pantalla de inicio, tocá **Descargar copia**.
3. Entrá al sistema **por la dirección del servidor**.
4. Tocá **Traer una copia** (o *Restaurar*) y elegí el archivo que bajaste.

Listo: el historial queda en el servidor y lo ve todo el equipo.

---

## Problemas

**No carga desde otra computadora.** Casi siempre es el Firewall de Windows. La primera
vez que se ejecuta, Windows pregunta si permite el acceso a la red: hay que decir que sí
(marcando *Redes privadas*). Si ya se dijo que no, se habilita en
*Firewall de Windows → Configuración avanzada → Reglas de entrada → Nueva regla → Puerto → TCP 8080 → Permitir*.

**Cambió la dirección IP.** Si la PC cambia de IP, la dirección anterior deja de andar.
Se soluciona pidiéndole al router que le reserve siempre la misma IP a esa PC
(*reserva DHCP*), o anotando la nueva dirección que muestra el servidor al arrancar.

**Dice que el puerto está en uso.** Ya hay un servidor encendido, o el puerto lo usa otro
programa. Se puede usar otro:

```
set PORT=8090
npm start
```

**El sistema avisa que no puede hablar con el servidor.** La PC del servidor está apagada,
sin red, o se cerró la ventana. Mientras tanto no se guardan ni se comparan listas, pero
nada se pierde: al volver, sigue todo.

---

## Usuarios y permisos

El sistema pide usuario y contraseña. La primera vez que arranca el servidor se crean
dos usuarios, y las contraseñas de fábrica quedan a la vista en la pantalla:

| Usuario | Contraseña de fábrica | Puede |
|---------|----------------------|-------|
| `nico` | `tumalac` | **Todo**: cargar listas, guardarlas, borrarlas, ver cambios de precio, respaldar, imprimir |
| `invitado` | `invitado` | **Solo etiquetas**: elegir productos, cambiar el formato e imprimir |

**Cambiá las dos contraseñas apenas lo instales:**

```
npm run clave nico
npm run clave invitado
```

Las pide en pantalla (no se ven mientras se escriben) y quedan guardadas cifradas: en el
archivo no queda la contraseña, solo un resumen del que no se puede volver atrás.

### Qué NO puede el invitado

- Cargar un Excel nuevo al sistema.
- Guardar, borrar o restaurar listas de precios.
- Entrar a la pantalla de cambios de precio.
- Descargar la copia de seguridad.

Sí puede imprimir cualquier etiqueta, elegir marcas y productos, y cambiar el formato.
En sus etiquetas también sale el precio anterior tachado cuando un producto bajó.

Esto **no es solo esconder botones**: el servidor rechaza esas operaciones aunque alguien
las intente por afuera del sistema.

### Otros usuarios

```
npm run usuarios                              ver quién hay y qué puede cada uno
npm run usuarios -- nuevo deposito invitado   crear un usuario que solo imprime
npm run usuarios -- nuevo pablo admin         crear otro administrador
npm run usuarios -- borrar deposito           borrar un usuario
```

Si querés que los invitados también vean la pantalla de cambios de precio, agregá
`'ver_cambios'` a la lista del rol `invitado` en `scripts/lib-usuarios.js` y reiniciá
el servidor.

## Seguridad

- El sistema **no queda publicado en internet**: solo se ve desde la red de la
  distribuidora.
- Las contraseñas se guardan cifradas, nunca en texto.
- Tras varios intentos fallidos seguidos desde la misma computadora, hay que esperar
  unos minutos.
- La sesión queda abierta 30 días en esa computadora. Con el botón **Salir** se cierra.
- Como la conexión es `http://` dentro de la red interna (no `https://`), la contraseña
  viaja sin cifrar por la red de la distribuidora. Para una red propia es lo habitual;
  tenelo en cuenta si algún día se abre a internet.
