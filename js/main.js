import { estado, reiniciarEstado } from "./core/estado.js";
import { emitir, escuchar } from "./core/bus.js";
import { crearLista, getDiaActual } from "./core/listaEnlazada.js";
import { iniciarReloj, detenerReloj, configurarReloj, formatearHora } from "./core/reloj.js";
import { iniciarEnergia, detenerEnergia, activarFallo, resolverFallo } from "./core/energia.js";
import { eventoAleatorio } from "./core/eventos.js";
import * as monitor from "./ui/monitor.js";
import { actualizarCockpit } from "./ui/cockpit.js";
import { inicializarInterruptores } from "./ui/interruptores.js";
import { abrirModal, cerrarModal } from "./ui/modal.js";
import { mostrarPantallaBienvenida, mostrarPantallaFin } from "./ui/pantallas.js";

// ===== AJUSTES DE EVENTOS ALEATORIOS =====
const PROB_EVENTO_POR_HORA = 0.25;  // probabilidad base cada hora de juego
const EXTRA_PROB_POR_DIA = 0.05;    // sube cada día
const HORA_PRIMER_EVENTO = 7;
const HORA_ULTIMO_EVENTO = 18;

let suscripciones = [];
let textoReloj = "06:00";
let diaActual = 1;
let interfazLista = false;

function refrescar() {
  actualizarCockpit(estado, textoReloj, diaActual);
}

function formatoCuentaRegresiva(segundos) {
  return `00:${String(segundos).padStart(2, "0")}`;
}

// Activa los fallos del evento y lo muestra en el monitor central.
export function dispararEvento(evento) {
  const nuevos = evento.sectores.filter((s) => !estado.fallos.includes(s));
  if (nuevos.length === 0) return false;
  nuevos.forEach(activarFallo);
  monitor.mostrarEvento(evento);
  emitir("evento-inicio", { evento });
  refrescar();
  return true;
}

function onHora({ hora, minutos, dia }) {
  textoReloj = hora;
  diaActual = dia;
  const h = minutos / 60;
  if (minutos % 60 === 0 && h >= HORA_PRIMER_EVENTO && h <= HORA_ULTIMO_EVENTO) {
    if (Math.random() < PROB_EVENTO_POR_HORA + EXTRA_PROB_POR_DIA * (dia - 1)) {
      dispararEvento(eventoAleatorio(dia));
    }
  }
  refrescar();
}

// modal.js emite "minijuego-terminado" con {sector, exito}.
function onMinijuegoTerminado({ sector, exito }) {
  if (!exito) return;
  if (resolverFallo(sector) && estado.fallos.length === 0) monitor.mostrarNominal();
  refrescar();
}

function onProrroga({ segundos }) {
  textoReloj = formatoCuentaRegresiva(segundos);
  if (monitor.mostrarAlertaCritica) monitor.mostrarAlertaCritica(segundos);
  refrescar();
}

function detenerTodo() {
  suscripciones.forEach((quitar) => quitar());
  suscripciones = [];
  detenerReloj();
  detenerEnergia();
}

function terminarPartida(victoria) {
  detenerReloj();
  detenerEnergia();
  cerrarModal();
  refrescar();
  mostrarPantallaFin(victoria, () => iniciarJuego());
}

// Conecta una sola vez los interruptores y los 4 botones que abren minijuegos.
function prepararInterfaz() {
  if (interfazLista) return;
  interfazLista = true;
  inicializarInterruptores(estado);
  document.querySelectorAll("[data-open-modal]").forEach((btn) => {
    btn.addEventListener("click", () => abrirModal(btn.dataset.openModal));
  });
}

// Arranca (o reinicia) toda la partida.
export function iniciarJuego({ segundosPorHora } = {}) {
  detenerTodo();
  prepararInterfaz();
  reiniciarEstado();
  crearLista();
  if (segundosPorHora) configurarReloj({ segundosPorHora });
  textoReloj = formatearHora(6 * 60);
  diaActual = 1;
  monitor.mostrarNominal();
  refrescar();

  suscripciones.push(
    escuchar("dia-cambio", ({ dia }) => { diaActual = dia; iniciarReloj(); }),
    escuchar("hora-cambio", onHora),
    escuchar("estado-cambio", refrescar),
    escuchar("prorroga-inicio", onProrroga),
    escuchar("prorroga-tick", onProrroga),
    escuchar("minijuego-terminado", onMinijuegoTerminado),
    escuchar("victoria", () => terminarPartida(true)),
    escuchar("derrota", () => terminarPartida(false))
  );

  iniciarEnergia();
  emitir("dia-cambio", { dia: 1 });
}

window.addEventListener("juego-iniciar", () => iniciarJuego());

// Arranque: pantalla de bienvenida y, al pulsar "Iniciar misión", empieza el juego.
// (test/core.html pone window.NO_AUTOSTART = true para controlar el arranque a mano.)
if (!window.NO_AUTOSTART) mostrarPantallaBienvenida(() => iniciarJuego());
