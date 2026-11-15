# Nasa-Space-apps-2026
# Simulador de Supervivencia Lunar

Prototipo web interactivo para **NASA Space Apps 2026**. El jugador administra una base lunar durante 5 días: reparte la electricidad con interruptores, reacciona a eventos aleatorios y resuelve minijuegos científicos para mantener vivos a los astronautas.

- Repositorio: https://github.com/potamo117/Nasa-Space-apps-2026
- Demo (Vercel): _pendiente de agregar_

## Cómo funciona el juego

- La misión dura **5 días**. Cada día va de **06:00 a 20:00** (1 hora de juego = 30 s reales).
- Hay 5 campos críticos: **Comida, Agua, Oxígeno, Radiación y Electricidad**.
- La electricidad es el recurso central: cada interruptor encendido la consume, y se recarga al 100% al empezar cada día. Los demás recursos se **arrastran** de un día al siguiente.
- Los eventos aleatorios desconfiguran Comida, Agua, Oxígeno o Radiación (nunca la electricidad). Un sector con evento activo se degrada más rápido hasta que el jugador gana su minijuego.
- **Cierre del día (20:00):** si no hay fallos, el día avanza solo. Si hay fallos, se bloquea el descanso y comienza una **prórroga de 10 segundos reales** para repararlos; si se agota, la misión termina en derrota.
- **Victoria:** completar el Día 5. **Derrota:** un recurso llega a su límite crítico o se agota la prórroga.

### Minijuegos

| Sector | Minijuego | Estructura de datos |
|---|---|---|
| Comida | Calibración del invernadero (espectro LED rojo/azul) | – |
| Agua | Tuberías ECLSS (pipe puzzle) | **Grafo de adyacencia** + BFS/DFS |
| Oxígeno | Electrólisis por celda de combustible (voltaje) | – |
| Radiación | Radar de clima espacial con datos de NASA DONKI | – |

La gestión de días usa una **lista enlazada** (`DiaNode`, un nodo por día).

## Cómo correrlo

No requiere Node, React ni npm: es HTML + CSS + JavaScript puro con módulos ES.

1. Instala **VS Code** y la extensión **Live Server**.
2. Clona el repo: `git clone https://github.com/potamo117/Nasa-Space-apps-2026.git`
3. Abre la carpeta en VS Code, clic derecho en `index.html` > **Open with Live Server**.

> Los módulos ES no funcionan abriendo el HTML con doble clic (`file://`); hace falta un servidor local.

Páginas de prueba aisladas: `test/core.html` (motor del juego; usa `?rapido` para que el día dure ~28 s), `test/agua.html`, `test/comida.html`, `test/oxigeno.html`, `test/radiacion.html`.

## Estructura del proyecto

```
index.html
css/        base, cockpit, agua, comida, oxigeno, radiacion
js/
  main.js                 arranca y conecta todo
  core/
    bus.js                bus de eventos (window)
    estado.js             estado de recursos, interruptores y fallos
    listaEnlazada.js      DiaNode, avance de días, prórroga, victoria/derrota
    reloj.js              reloj 06:00 a 20:00
    energia.js            consumo, degradación, fallos, apagón
    eventos.js            matriz de eventos
  ui/                     cockpit, interruptores, modal, pantallas, monitor
  minijuegos/             index.js (registro), agua, comida, oxigeno, radiacion
data/donki-respaldo.json  respaldo si falla la API de DONKI
test/                     una página de prueba por módulo
```

## Arquitectura del núcleo (core)

El núcleo no toca el DOM. Se comunica con la interfaz mediante **eventos de `window`** (`js/core/bus.js`) y llamando a las funciones del contrato.

### Flujo

1. `main.js` → `iniciarJuego()` reinicia el estado, crea la lista de 5 días, activa la energía y emite `dia-cambio`.
2. `dia-cambio` arranca el reloj en 06:00. Cada tick es **1 minuto de juego** y emite `hora-cambio`.
3. Cada segundo real, `energia.js` descuenta electricidad, degrada sectores y emite `estado-cambio`.
4. Cada hora de juego (07:00–18:00) hay una probabilidad de evento aleatorio, que activa fallos y se muestra en el monitor central.
5. A las 20:00, `cierreAutomaticoJornada()` avanza al siguiente nodo o abre la prórroga de 10 s.

### Eventos del bus

Emitidos por el core:

| Evento | Detalle | Cuándo |
|---|---|---|
| `dia-cambio` | `{dia}` | Empieza un día (06:00) |
| `hora-cambio` | `{hora, minutos, dia}` | Cada minuto de juego |
| `estado-cambio` | `{}` | Cada segundo, tras actualizar recursos |
| `evento-inicio` | `{evento}` | Se disparó un evento aleatorio |
| `fallos-cambio` | `{fallos}` | Cambió `estado.fallos` |
| `prorroga-inicio` / `prorroga-tick` | `{segundos}` | Cuenta regresiva de 10 s |
| `apagon` | `{}` | La electricidad llegó a 0 |
| `victoria` | `{}` | Se completó el Día 5 |
| `derrota` | `{motivo}` | Fin de la partida por derrota |

Que recibe el core desde la interfaz:

| Evento | Detalle | Quién lo emite |
|---|---|---|
| `minijuego-terminado` | `{sector, exito}` | `modal.js` (P2) al cerrar un minijuego |
| `juego-iniciar` | `{}` | Pantalla de bienvenida o de derrota (P2) |

Si `index.html` define `window.NO_AUTOSTART = true` antes de cargar `main.js`, el juego espera a `juego-iniciar` en lugar de arrancar solo.

### Reglas de energía y recursos

Todos los números viven como constantes en `js/core/energia.js` y están expresados **por hora de juego**, así que no dependen de la escala del reloj.

| Constante | Valor | Significado |
|---|---|---|
| `CONSUMO_POR_SECTOR` | 3 | % de electricidad por hora, por interruptor encendido |
| `DEGRADACION_SIN_ENERGIA` | 1.5 | % por hora de un sector con interruptor apagado |
| `DEGRADACION_FALLO` | 8 | % por hora de un sector con evento activo |
| `RECUPERACION_AL_REPARAR` | 25 | % que se recupera al ganar el minijuego |

- **Radiación** funciona al revés: **100 = peligro, 0 = seguro**.
- **Apagón:** si la electricidad llega a 0, se apagan todos los interruptores (no es derrota por sí solo).
- **Derrota:** comida, agua u oxígeno en 0, o radiación en 100.
- Ajustes de eventos aleatorios en `js/main.js`: `PROB_EVENTO_POR_HORA` (0.25), `EXTRA_PROB_POR_DIA` (0.05), `HORA_PRIMER_EVENTO` (7), `HORA_ULTIMO_EVENTO` (18).
- Escala del reloj: `segundosPorHora` en `js/core/reloj.js` (30 por defecto).

## Contrato entre módulos

```js
// Cada minijuego exporta exactamente esto
export function iniciar(contenedor, onTerminar) {
  // dibujar dentro de `contenedor` y, al ganar o perder:
  onTerminar({ exito: true }); // o { exito: false }
}

// Estado compartido (js/core/estado.js)
estado = { comida, agua, oxigeno, radiacion, electricidad,
           interruptores: { comida, agua, oxigeno, radiacion }, fallos: [] };

// Eventos (js/core/eventos.js)
{ id, nombre, causa, sectores: [...], minijuegos: [...] }
export function eventoAleatorio(dia) {}

// Interfaz
export function mostrarEvento(evento) {}      // js/ui/monitor.js
export function mostrarNominal() {}           // js/ui/monitor.js
export function abrirModal(sector) {}         // js/ui/modal.js
export function actualizarCockpit(estado, hora) {} // js/ui/cockpit.js
```

Notas para la interfaz:
- Los interruptores solo cambian `estado.interruptores[sector]`; el consumo lo calcula el core.
- En la prórroga, `hora` llega como cuenta regresiva (`"00:09"`).
- Al terminar un minijuego con éxito, `modal.js` debe emitir `minijuego-terminado` (`emitir` está en `js/core/bus.js`).

## Equipo y responsabilidades

| Persona | Rol | Archivos |
|---|---|---|
| P1 | Core / motor del juego (integrador) | `main.js`, `core/*` (excepto `eventos.js`), `minijuegos/index.js` |
| P2 | Cabina e interruptores | `index.html`, `base.css`, `cockpit.css`, `ui/*` (excepto `monitor.js`) |
| P3 | Agua (grafo de adyacencia) | `agua.js`, `agua.css`, `test/agua.html` |
| P4 | Comida y Oxígeno | `comida.js`, `oxigeno.js`, sus CSS y pruebas |
| P5 | Eventos, monitor, Radiación, documentación | `eventos.js`, `monitor.js`, `radiacion.js`, `donki-respaldo.json`, `README.md` |

## Flujo de trabajo con Git

```bash
git checkout main && git pull origin main   # siempre antes de empezar
git checkout -b feat/mi-tarea               # una rama por tarea
git add . && git commit -m "feat(modulo): descripcion"
git push origin feat/mi-tarea               # y abrir Pull Request
```

- Cada quien edita solo sus archivos; si necesitas tocar uno ajeno, avisa primero.
- Nunca hacer push directo a `main` (excepto el contrato inicial).
- PRs pequeños, al menos uno cada 1 o 2 horas.

## Despliegue

El proyecto se publica en **Vercel** conectando el repositorio (Framework Preset = Other, sin Build Command ni Output Directory). Cada merge a `main` se redespliega solo y cada Pull Request genera una URL de vista previa.

## Créditos

- Datos de clima espacial: [NASA DONKI](https://api.nasa.gov) (con respaldo local en `data/donki-respaldo.json`).
- Proyecto desarrollado para NASA Space Apps Challenge 2026.