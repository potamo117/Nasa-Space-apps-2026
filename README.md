# Nasa-Space-apps-2026
# Simulador de Supervivencia Lunar

Prototipo web interactivo para **NASA Space Apps 2026**. El jugador administra una base lunar durante 5 días: reparte la electricidad con interruptores, reacciona a eventos aleatorios y resuelve minijuegos científicos para mantener vivos a los astronautas.

- Repositorio: https://github.com/potamo117/Nasa-Space-apps-2026
- Demo (Vercel): https://nasaspaceapp2026-taupe.vercel.app/

## Cómo funciona el juego

- La misión dura **5 días**. Cada día va de **06:00 a 20:00** (1 hora de juego = 8 s reales: un día ≈ 1 min 52 s y la partida ≈ 9 min).
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

## Idiomas (Español / English)

El juego está disponible en **español e inglés**. Se cambia con el selector **ES | EN** que aparece en la cabina, en la pantalla de bienvenida, en el tutorial, en la pausa, en el aviso de cookies y en las páginas legales. La elección se guarda (si se aceptan las cookies funcionales); la primera vez se usa el idioma del navegador.

- `js/core/i18n.js`: función `t("texto en español", { parámetros })`. **El texto en español es la clave**; en español devuelve el mismo texto y en inglés busca la traducción.
- `js/i18n/en.js`: diccionario ES → EN. Si agregas un texto nuevo al juego, envuélvelo con `t(...)` y añade su traducción aquí. En inglés, un texto sin traducción aparece en español y la consola avisa `[i18n] falta traducción al inglés`.
- HTML estático: atributos `data-i18n`, `data-i18n-aria` y `data-i18n-title` (ver `index.html`). Las páginas legales tienen un bloque `<div data-lang="es">` y otro `<div data-lang="en">`.
- Al cambiar de idioma con un minijuego abierto, este se reinicia para mostrarse completo en el nuevo idioma.

## Estructura del proyecto

```
index.html
css/        base, cockpit, idioma, agua, comida, oxigeno, radiacion
js/
  main.js                 arranca y conecta todo
  core/
    bus.js                bus de eventos (window)
    i18n.js               t(), idioma activo y selector ES | EN
    estado.js             estado de recursos, interruptores y fallos
    listaEnlazada.js      DiaNode, avance de días, prórroga, victoria/derrota
    reloj.js              reloj 06:00 a 20:00
    energia.js            consumo, degradación, fallos, apagón
    eventos.js            matriz de eventos
  i18n/en.js              diccionario ES → EN
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
| `CONSUMO_POR_SECTOR` | 2.4 | % de electricidad por hora, por interruptor encendido |
| `DEGRADACION_SIN_ENERGIA` | 4 | % por hora de un sector con interruptor apagado |
| `DEGRADACION_FALLO` | 8 | % por hora de un sector con evento activo |
| `RECUPERACION_AL_REPARAR` | 12 | % que se recupera al ganar el minijuego |

- **Radiación** funciona al revés: **100 = peligro, 0 = seguro**.
- **Apagón:** si la electricidad llega a 0, se apagan todos los interruptores (no es derrota por sí solo).
- **Derrota:** comida, agua u oxígeno en 0, o radiación en 100.
- Ajustes de eventos aleatorios en `js/main.js`: `PROB_EVENTO_POR_HORA` (0.3), `EXTRA_PROB_POR_DIA` (0.07), `HORA_PRIMER_EVENTO` (7), `HORA_ULTIMO_EVENTO` (18).
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

## Jugabilidad (v3)

Inspirada en FTL, Oxygen Not Included, Overcooked, Reigns y Slay the Spire.

- **Alertas previas:** cada evento avisa unos segundos antes (6–10 s según dificultad).
- **Eventos con elección:** *parche rápido* (−15 % de energía, evita la falla) o *reparación a fondo* (la falla ocurre, pero reparar da +13 extra). Si no decides en 12 s, la falla ocurre sin bonus.
- **Solapamiento y prioridad:** en días avanzados dos eventos pueden llegar casi juntos. Cada sector muestra su tiempo restante (⏱) y el más urgente se marca como PRIORIDAD.
- **Energía con decisiones:** cada sector cuesta distinto (oxígeno y escudos más caros) y se degrada distinto al apagarlo. Los escudos encendidos frenan a la mitad las fallas de radiación.
- **Un día = una identidad:** Día 1 adaptación, 2 normal, 3 tormenta solar, 4 impactos en cadena, 5 CME masiva (ver `DIAS` en `js/core/eventos.js`).
- **Resumen de día:** estrellas, puntos, pronóstico del siguiente día y elección de 1 mejora entre 3 (`MEJORAS` en `js/core/progreso.js`).
- **Logros y puntuación:** 8 logros y mejor puntuación guardados en `localStorage` (solo si se aceptan las cookies funcionales).
- **Dificultad:** Fácil / Normal / Difícil (`js/core/dificultad.js`) y minijuegos con **dificultad adaptativa** por sector (ganas rápido: sube; fallas o tardas: baja).
- **Pausa y tutorial:** botón ⏸, pausa automática al ocultar la pestaña, tutorial de 3 pantallas la primera vez.
- **Sonido y vibración:** sonidos sintetizados (Web Audio) y vibración en móvil; botón 🔊 para silenciar.
- **NASA DONKI:** `js/core/donki.js` pide fulguraciones y CME de los últimos 30 días (`DEMO_KEY`) y usa `data/donki-respaldo.json` si falla la red. La fulguración más fuerte fija el riesgo del minijuego de radiación y se muestra en los eventos solares.


## Balance para niños de 7–12 años (v4)

- Reloj: 12 / 10 / 8 s por hora (Fácil / Normal / Difícil); el consumo de recursos es más lento y las fallas dan más margen.
- Normal arranca con minijuegos en nivel fácil y sube solo si el jugador gana rápido.
- Sliders de los minijuegos: ya no hay "imán" que salte valores; cada número es alcanzable.
- Agua (tuberías): camino más corto, menos piezas desordenadas y contaminación más lenta.

## Cookies, términos y privacidad

- `privacidad.html` y `terminos.html` (con `css/legal.css`, `js/legal-pagina.js`).
- Aviso de cookies al primer acceso (`js/ui/cookies.js`): *necesarias* (siempre) y *funcionales* (guardan dificultad, sonido, puntuación y logros). Sin aceptar funcionales, nada se guarda en el navegador (`js/core/almacen.js`).
- Se pueden cambiar o borrar desde el menú de pausa / pantalla de bienvenida ("Cookies").
- **Antes de publicar:** edita `js/legal-config.js` (correo de contacto, responsable, fecha). Los textos son una base y conviene que los revise una persona con conocimiento legal.

## Recursos propios (v5)

- El juego ya no usa los emojis del sistema ni descarga íconos o tipografías de Google: todo está en `recursos/`.
- `recursos/iconos/`: 76 íconos SVG (Fluent Emoji de Microsoft, licencia MIT). `js/ui/iconos.js` relaciona cada símbolo con su archivo y lo dibuja como imagen, así se ve igual en cualquier dispositivo.
- `recursos/fuentes/` + `css/fuentes.css`: Fredoka, Orbitron y Chakra Petch (SIL Open Font License 1.1).
- `recursos/CREDITOS.md` y `recursos/licencias/`: créditos y textos de licencia (hay que conservarlos al redistribuir).
- La única conexión externa que queda es la API DONKI de la NASA.
