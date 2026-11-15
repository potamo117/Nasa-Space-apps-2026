import { estado, reiniciarEstado } from "./core/estado.js";
import { emitir, escuchar } from "./core/bus.js";
import { crearLista, getDiaActual } from "./core/listaEnlazada.js";
import { iniciarReloj, detenerReloj, configurarReloj, formatearHora } from "./core/reloj.js";
import { iniciarEnergia, detenerEnergia, activarFallo, resolverFallo } from "./core/energia.js";
import { eventoAleatorio } from "./core/eventos.js";
import { mostrarEvento, mostrarNominal } from "./ui/monitor.js";
import { actualizarCockpit } from "./ui/cockpit.js";

// ===== AJUSTES DE EVENTOS ALEATORIOS =====
const PROB_EVENTO_POR_HORA = 0.25;  // probabilidad base cada hora de juego
const EXTRA_PROB_POR_DIA = 0.05;    // sube cada día
const HORA_PRIMER_EVENTO = 7;
const HORA_ULTIMO_EVENTO = 18;

let suscripciones = [];
let textoReloj = "06:00";

function refrescar() {
  actualizarCockpit(estado, textoReloj);
}

function formatoCuentaRegresiva(segundos) {
  return `00:${String(segundos).padStart(2, "0")}`;
}

// Activa los fallos del evento y lo muestra en el monitor central.
export function dispararEvento(evento) {
  const nuevos = evento.sectores.filter((s) => !estado.fallos.includes(s));
  if (nuevos.length === 0) return false;
  nuevos.forEach(activarFallo);
  mostrarEvento(evento);
  emitir("evento-inicio", { evento });
  refrescar();
  return true;
}

function onHora({ hora, minutos }) {
  textoReloj = hora;
  const h = minutos / 60;
  if (minutos % 60 === 0 && h >= HORA_PRIMER_EVENTO && h <= HORA_ULTIMO_EVENTO) {
    const dia = getDiaActual().numeroDia;
    if (Math.random() < PROB_EVENTO_POR_HORA + EXTRA_PROB_POR_DIA * (dia - 1)) {
      dispararEvento(eventoAleatorio(dia));
    }
  }
  refrescar();
}

// P2 (modal.js) emite "minijuego-terminado" con {sector, exito}.
function onMinijuegoTerminado({ sector, exito }) {
  if (!exito) return;
  if (resolverFallo(sector) && estado.fallos.length === 0) mostrarNominal();
  refrescar();
}

function detenerTodo() {
  suscripciones.forEach((quitar) => quitar());
  suscripciones = [];
  detenerReloj();
  detenerEnergia();
}

function terminarPartida() {
  detenerReloj();
  detenerEnergia();
  refrescar();
}

// Arranca (o reinicia) toda la partida.
export function iniciarJuego({ segundosPorHora } = {}) {
  detenerTodo();
  reiniciarEstado();
  crearLista();
  if (segundosPorHora) configurarReloj({ segundosPorHora });
  textoReloj = formatearHora(6 * 60);
  mostrarNominal();

  suscripciones.push(
    escuchar("dia-cambio", () => iniciarReloj()),
    escuchar("hora-cambio", onHora),
    escuchar("estado-cambio", refrescar),
    escuchar("prorroga-inicio", ({ segundos }) => { textoReloj = formatoCuentaRegresiva(segundos); refrescar(); }),
    escuchar("prorroga-tick", ({ segundos }) => { textoReloj = formatoCuentaRegresiva(segundos); refrescar(); }),
    escuchar("minijuego-terminado", onMinijuegoTerminado),
    escuchar("victoria", terminarPartida),
    escuchar("derrota", terminarPartida)
  );

  iniciarEnergia();
  emitir("dia-cambio", { dia: 1 });
}

// P2 puede reiniciar desde su pantalla de bienvenida/derrota con: window.dispatchEvent(new Event("juego-iniciar"))
window.addEventListener("juego-iniciar", () => iniciarJuego());

// Arranque automático (en index.html, P2 puede poner window.NO_AUTOSTART = true antes del módulo
// si quiere esperar al botón de bienvenida).
if (!window.NO_AUTOSTART) iniciarJuego();



//Código cabina
import { estado } from './core/estado.js';
import { MINIJUEGOS } from './minijuegos/index.js';
import { actualizarCockpit } from './ui/cockpit.js';
import { inicializarInterruptores } from './ui/interruptores.js';
import { abrirModal } from './ui/modal.js';
import { mostrarEvento, mostrarNominal } from './ui/monitor.js';
import { mostrarPantallaBienvenida, mostrarPantallaFin } from './ui/pantallas.js';

function iniciarMision() {
  // 1. Inicializar los interruptores físicos inferiores (P2)
  inicializarInterruptores(estado);

  // 2. Pintar el estado inicial en la cabina
  actualizarCockpit(estado, '06:00', 1);
  mostrarNominal();

  // 3. Conectar los botones de los 4 sectores para abrir los minijuegos en el modal
  document.querySelectorAll('[data-open-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sector = btn.dataset.openModal;
      
      // Llamada al contrato del modal pasando el registro de minijuegos
      abrirModal(sector, MINIJUEGOS, (sec, resultado) => {
        if (resultado.exito) {
          // Si el jugador gana el minijuego, se remueve de los fallos activos
          estado.fallos = estado.fallos.filter((s) => s !== sec);
          estado[sec] = sec === 'radiacion' ? 0 : 100;
          
          if (estado.fallos.length === 0) {
            mostrarNominal();
          }
          actualizarCockpit(estado, window.horaActual || '06:00', window.diaActual || 1);
        }
      });
    });
  });

  // 4. Escuchar eventos del motor (reloj, energía y alertas de P1 / P5)
  window.addEventListener('reloj-actualizado', (e) => {
    const { hora, dia } = e.detail;
    window.horaActual = hora;
    window.diaActual = dia;
    actualizarCockpit(estado, hora, dia);
  });

  // Ejemplo para probar una alerta del monitor central en vivo
  window.addEventListener('disparar-evento', (e) => {
    const evento = e.detail;
    estado.fallos = evento.sectores;
    mostrarEvento(evento);
    actualizarCockpit(estado, window.horaActual || '06:00', window.diaActual || 1);
  });
}

// Arrancar el juego mostrando la pantalla de bienvenida inicial
mostrarPantallaBienvenida(iniciarMision);