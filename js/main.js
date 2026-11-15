import "./ui/iconos.js";
import { t, selectorIdiomaHTML, enlazarSelectorIdioma } from "./core/i18n.js";
import { estado, reiniciarEstado } from "./core/estado.js";
import { emitir, escuchar } from "./core/bus.js";
import { crearLista, pausarProrroga, reanudarProrroga } from "./core/listaEnlazada.js";
import { iniciarReloj, detenerReloj, pausarReloj, reanudarReloj, configurarReloj, formatearHora } from "./core/reloj.js";
import { iniciarEnergia, detenerEnergia, activarFallo, resolverFallo, RECUPERACION_BONUS } from "./core/energia.js";
import { eventoAleatorio, eventoPorId, infoDia } from "./core/eventos.js";
import { setPerfil, perfil, reiniciarNiveles } from "./core/dificultad.js";
import {
  iniciarTemporizador, detenerTemporizador, esperar, limpiarEsperas,
  pausarTemporizador, reanudarTemporizador, ahoraJuego,
} from "./core/temporizador.js";
import { cargarDonki, textoDonki } from "./core/donki.js";
import * as progreso from "./core/progreso.js";
import * as monitor from "./ui/monitor.js";
import { actualizarCockpit, mostrarToast } from "./ui/cockpit.js";
import { inicializarInterruptores } from "./ui/interruptores.js";
import { abrirModal, cerrarModal } from "./ui/modal.js";
import {
  mostrarPantallaBienvenida, mostrarPantallaFin, mostrarPausa, cerrarPausa, mostrarResumenDia,
} from "./ui/pantallas.js";
import { iniciarCookies } from "./ui/cookies.js";
import { engancharAudio, desbloquearAudio, alternarSonido, sonidoActivo, sonido } from "./ui/audio.js";

// ===== AJUSTES DE EVENTOS ALEATORIOS =====
// La probabilidad base y la intensidad de cada día están en core/eventos.js (DIAS) y core/dificultad.js.
const HORA_PRIMER_EVENTO = 7;
const HORA_ULTIMO_EVENTO = 18;
const MAX_FALLAS_SIMULTANEAS = 3;   // no se programan más eventos aleatorios si ya hay tantos activos
const ELECCION_SEGUNDOS = 12;       // tiempo para decidir en un evento con elección
const COSTO_PARCHE = 15;            // % de energía que cuesta el parche rápido
const DEMORA_SOLAPE_MS = 3500;      // un segundo evento "se solapa" poco después del primero

let suscripciones = [];
let textoReloj = "06:00";
let diaActual = 1;
let interfazLista = false;
let perfilActual = "normal";

let activos = [];          // eventos con sectores pendientes: [{evento, pendientes, extra}]
let inicioFallo = {};      // sector -> tiempo de juego en que empezó la falla
let enPreparacion = 0;     // eventos con aviso o elección en curso
let eleccionActiva = false;
let partidaActiva = false;
let enPausa = false;
let enResumen = false;
let ultimoCierre = null;

function refrescar() {
  actualizarCockpit(estado, textoReloj, diaActual);
}

function formatoCuentaRegresiva(segundos) {
  return `00:${String(segundos).padStart(2, "0")}`;
}

// ---------- Eventos ----------

// Activa los fallos del evento y lo muestra en el monitor central.
export function dispararEvento(evento, { bonus = false } = {}) {
  const nuevos = evento.sectores.filter((s) => !estado.fallos.includes(s));
  if (nuevos.length === 0) return false;
  nuevos.forEach((s) => {
    inicioFallo[s] = ahoraJuego();
    if (bonus && !estado.bonusReparacion.includes(s)) estado.bonusReparacion.push(s);
  });
  activos.push({ evento, pendientes: [...nuevos], extra: evento.donki ? textoDonki : "" });
  nuevos.forEach(activarFallo);
  progreso.registrarFallos(estado.fallos.length);
  monitor.setEventos(activos);
  emitir("evento-inicio", { evento });
  refrescar();
  return true;
}

// Evento con elección: parche rápido (cuesta energía, evita la falla) o reparación a fondo (más recuperación).
function lanzar(evento) {
  if (!evento.eleccion || eleccionActiva) {
    enPreparacion = Math.max(0, enPreparacion - 1);
    dispararEvento(evento);
    return;
  }
  eleccionActiva = true;
  let seg = ELECCION_SEGUNDOS;
  let resuelto = false;
  const puede = () => estado.electricidad >= COSTO_PARCHE;

  const elegir = (op) => {
    if (resuelto) return;
    resuelto = true;
    eleccionActiva = false;
    enPreparacion = Math.max(0, enPreparacion - 1);
    monitor.quitarEleccion();
    if (op === "parche" && puede()) {
      estado.electricidad -= COSTO_PARCHE;
      emitir("parche", { evento });
      progreso.registrarParche();
      mostrarToast(t("🩹 Parche aplicado: falla evitada"));
      refrescar();
    } else {
      dispararEvento(evento, { bonus: op === "completa" });
    }
  };

  monitor.mostrarEleccion(evento, seg, { costo: COSTO_PARCHE, bonus: RECUPERACION_BONUS, puedeParche: puede() }, elegir);
  const tick = () => {
    if (resuelto) return;
    seg--;
    if (seg <= 0) { elegir("ignorar"); return; }
    monitor.actualizarEleccion(seg, puede());
    esperar(1000, tick);
  };
  esperar(1000, tick);
}

// Muestra la alerta previa y, al terminar la cuenta atrás, lanza el evento.
export function programarEvento(evento, solape = false) {
  enPreparacion++;
  let seg = perfil().avisoS;
  monitor.mostrarAdvertencia(evento, seg);
  emitir("alerta-previa", { evento, segundos: seg });
  const tick = () => {
    seg--;
    if (seg <= 0) {
      monitor.quitarAdvertencia(evento);
      lanzar(evento);
      if (!solape && Math.random() < infoDia(diaActual).solapa) {
        esperar(DEMORA_SOLAPE_MS, () => programarEvento(eventoAleatorio(diaActual), true));
      }
    } else {
      monitor.actualizarAdvertencia(evento, seg);
      esperar(1000, tick);
    }
  };
  esperar(1000, tick);
}

function limpiarPreparacion() {
  limpiarEsperas();
  enPreparacion = 0;
  eleccionActiva = false;
  monitor.limpiarPreparacion();
}

function onHora({ hora, minutos, dia }) {
  textoReloj = hora;
  diaActual = dia;
  if (minutos % 60 === 0) {
    const h = minutos / 60;
    const info = infoDia(dia);
    const garantizado = info.garantizados.find((g) => g.hora === h);
    if (garantizado) {
      programarEvento(eventoPorId(garantizado.id));
    } else if (
      h >= HORA_PRIMER_EVENTO && h <= HORA_ULTIMO_EVENTO &&
      enPreparacion === 0 && estado.fallos.length < MAX_FALLAS_SIMULTANEAS &&
      Math.random() < info.prob * perfil().prob
    ) {
      programarEvento(eventoAleatorio(dia));
    }
  }
  refrescar();
}

// modal.js emite "minijuego-terminado" con {sector, exito}.
function onMinijuegoTerminado({ sector, exito }) {
  if (!exito) return;
  if (!estado.fallos.includes(sector)) { refrescar(); return; }

  // Estadísticas y monitor ANTES de resolver: resolverFallo puede cerrar el día de inmediato.
  const seg = (ahoraJuego() - (inicioFallo[sector] ?? ahoraJuego())) / 1000;
  progreso.registrarReparacion(seg);
  activos.forEach((a) => { a.pendientes = a.pendientes.filter((s) => s !== sector); });
  activos.filter((a) => a.pendientes.length === 0).forEach((a) => progreso.eventoResuelto(a.evento.id));
  activos = activos.filter((a) => a.pendientes.length > 0);
  monitor.setEventos(activos);
  if (estado.fallos.length === 1) progreso.todoEstabilizado();
  resolverFallo(sector);
  refrescar();
}

// ---------- Días ----------
function onDiaTerminado({ electricidad }) {
  limpiarPreparacion();
  ultimoCierre = progreso.cerrarDia(electricidad);
}

function onDiaCambio({ dia }) {
  diaActual = dia;
  progreso.nuevoDia(dia);
  activos = [];
  inicioFallo = {};
  estado.bonusReparacion.length = 0;
  monitor.quitarAlertaCritica();
  monitor.setEventos([]);
  if (dia === 1) { iniciarReloj(); return; }
  entrarResumen(dia);
}

// Entre días: se pausa todo y el jugador ve su resumen y elige una mejora.
function entrarResumen(dia) {
  enResumen = true;
  detenerReloj();
  detenerEnergia();
  pausarTemporizador();
  cerrarModal();
  refrescar();
  mostrarResumenDia(
    { cierre: ultimoCierre, diaSiguiente: dia, infoSiguiente: infoDia(dia), opciones: progreso.ofrecerMejoras() },
    (id) => {
      if (id) {
        progreso.aplicarMejora(id);
        mostrarToast(t("✅ Mejora instalada"));
      }
      enResumen = false;
      if (!partidaActiva) return;
      iniciarEnergia();
      reanudarTemporizador();
      iniciarReloj();
      refrescar();
    }
  );
}

function onProrroga({ segundos }) {
  textoReloj = formatoCuentaRegresiva(segundos);
  monitor.mostrarAlertaCritica(segundos);
  refrescar();
}

function onProrrogaInicio(d) {
  limpiarPreparacion();
  onProrroga(d);
}

function onApagon() {
  progreso.registrarApagon();
  mostrarToast(t("🔌 ¡APAGÓN! Todos los interruptores se apagaron"));
}

// ---------- Pausa y fin ----------
function detenerTodo() {
  suscripciones.forEach((quitar) => quitar());
  suscripciones = [];
  detenerReloj();
  detenerEnergia();
  pausarProrroga();
  detenerTemporizador();
}

export function pausarJuego() {
  if (!partidaActiva || enPausa || enResumen) return;
  enPausa = true;
  pausarReloj();
  detenerEnergia();
  pausarProrroga();
  pausarTemporizador();
  mostrarPausa({
    onContinuar: reanudarJuego,
    onReiniciar: () => { enPausa = false; iniciarJuego(); },
    onMenu: volverAlMenu,
  });
}

export function reanudarJuego() {
  if (!enPausa) return;
  enPausa = false;
  reanudarReloj();
  iniciarEnergia();
  reanudarProrroga();
  reanudarTemporizador();
}

function volverAlMenu() {
  partidaActiva = false;
  enPausa = false;
  enResumen = false;
  detenerTodo();
  cerrarModal();
  cerrarPausa();
  monitor.mostrarNominal();
  mostrarPantallaBienvenida((dif) => iniciarJuego({ perfil: dif }));
}

function terminarPartida(victoria, motivo = "") {
  partidaActiva = false;
  detenerReloj();
  detenerEnergia();
  pausarProrroga();
  detenerTemporizador();
  cerrarModal();
  refrescar();
  const resumen = progreso.resumenFinal(victoria);
  mostrarPantallaFin(victoria, () => iniciarJuego(), motivo, resumen, volverAlMenu);
}

// ---------- Idioma ----------
// Selector ES | EN de la cabina. Al cambiar el idioma se repinta lo dinámico (el HTML estático lo traduce i18n.js).
function montarSelectorCabina() {
  const cont = document.getElementById("selector-idioma-cabina");
  if (!cont) return;
  cont.innerHTML = selectorIdiomaHTML();
  enlazarSelectorIdioma(cont);
}
window.addEventListener("idioma-cambio", () => {
  montarSelectorCabina();
  monitor.renderizar();
  refrescar();
});
montarSelectorCabina();

// ---------- Arranque ----------
// Conecta una sola vez los interruptores, los botones y los listeners globales.
function prepararInterfaz() {
  if (interfazLista) return;
  interfazLista = true;
  engancharAudio();
  inicializarInterruptores(estado);
  document.querySelectorAll("[data-open-modal]").forEach((btn) => {
    btn.addEventListener("click", () => { sonido.click(); abrirModal(btn.dataset.openModal); });
  });
  const btnPausa = document.getElementById("btn-pausa");
  if (btnPausa) btnPausa.addEventListener("click", pausarJuego);
  const btnSonido = document.getElementById("btn-sonido");
  if (btnSonido) {
    const icono = () => { btnSonido.textContent = sonidoActivo() ? "🔊" : "🔇"; };
    icono();
    btnSonido.addEventListener("click", () => { desbloquearAudio(); alternarSonido(); icono(); sonido.click(); });
  }
  document.addEventListener("pointerdown", desbloquearAudio, { once: true });
  // Si la pestaña se oculta (o llega una llamada), el juego se pausa solo.
  document.addEventListener("visibilitychange", () => { if (document.hidden) pausarJuego(); });
}

// Arranca (o reinicia) toda la partida.
export function iniciarJuego({ segundosPorHora, perfil: pid } = {}) {
  detenerTodo();
  prepararInterfaz();
  cerrarModal();
  cerrarPausa();
  if (pid) perfilActual = pid;
  setPerfil(perfilActual);
  reiniciarEstado();
  crearLista();
  reiniciarNiveles();
  progreso.nuevaPartida();
  progreso.nuevoDia(1);
  activos = [];
  inicioFallo = {};
  enPreparacion = 0;
  eleccionActiva = false;
  enPausa = false;
  enResumen = false;
  ultimoCierre = null;
  partidaActiva = true;
  configurarReloj({ segundosPorHora: segundosPorHora ?? perfil().segundosPorHora });
  iniciarTemporizador();
  cargarDonki(); // datos reales de NASA (con respaldo local si falla la red)
  textoReloj = formatearHora(6 * 60);
  diaActual = 1;
  monitor.mostrarNominal();
  refrescar();

  suscripciones.push(
    escuchar("dia-cambio", onDiaCambio),
    escuchar("dia-terminado", onDiaTerminado),
    escuchar("hora-cambio", onHora),
    escuchar("estado-cambio", () => { progreso.observar(); refrescar(); }),
    escuchar("prorroga-inicio", onProrrogaInicio),
    escuchar("prorroga-tick", onProrroga),
    escuchar("minijuego-terminado", onMinijuegoTerminado),
    escuchar("apagon", onApagon),
    escuchar("logro", ({ icono, nombre }) => mostrarToast(`${icono} ${t("Logro: {nombre}", { nombre: t(nombre) })}`)),
    escuchar("victoria", () => terminarPartida(true)),
    escuchar("derrota", ({ motivo }) => terminarPartida(false, motivo))
  );

  iniciarEnergia();
  emitir("dia-cambio", { dia: 1 });
}

window.addEventListener("juego-iniciar", () => iniciarJuego());

// Arranque: pantalla de bienvenida (dificultad + tutorial) y, al pulsar "Iniciar misión", empieza el juego.
// (test/core.html pone window.NO_AUTOSTART = true para controlar el arranque a mano.)
if (!window.NO_AUTOSTART) {
  iniciarCookies();   // aviso de cookies (bloquea hasta que se elige)
  mostrarPantallaBienvenida((dif) => iniciarJuego({ perfil: dif }));
}
