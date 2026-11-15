import { emitir } from "./bus.js";
import { getDiaActual, cierreAutomaticoJornada } from "./listaEnlazada.js";

export const HORA_INICIO = 6;   // 06:00
export const HORA_FIN = 20;     // 20:00

// 1 hora de juego = 10 s reales por defecto (la dificultad lo cambia). Un día (06:00-20:00) ≈ 2 min 20 s.
export const SEGUNDOS_POR_HORA_DEFECTO = 10;
let segundosPorHora = SEGUNDOS_POR_HORA_DEFECTO;
let minutos = HORA_INICIO * 60;
let timer = null;
let pausadoPorJuego = false;

export function configurarReloj({ segundosPorHora: s } = {}) {
  if (s && s > 0) segundosPorHora = s;
}
export function getSegundosPorHora() {
  return segundosPorHora;
}

export function formatearHora(totalMinutos) {
  const h = String(Math.floor(totalMinutos / 60)).padStart(2, "0");
  const m = String(totalMinutos % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export function getHora() {
  return formatearHora(minutos);
}

function emitirHora() {
  emitir("hora-cambio", {
    hora: formatearHora(minutos),
    minutos,
    dia: getDiaActual().numeroDia,
  });
}

export function detenerReloj() {
  clearInterval(timer);
  timer = null;
  pausadoPorJuego = false;
}

function arrancar() {
  clearInterval(timer);
  const msPorMinuto = Math.max(1, (segundosPorHora * 1000) / 60);
  timer = setInterval(() => {
    minutos++;
    emitirHora();
    if (minutos >= HORA_FIN * 60) {
      detenerReloj();
      cierreAutomaticoJornada(); // 20:00: cierre nominal o prórroga
    }
  }, msPorMinuto);
}

// Arranca un día nuevo a las 06:00. Cada tick = 1 minuto de juego.
export function iniciarReloj() {
  detenerReloj();
  minutos = HORA_INICIO * 60;
  emitirHora();
  arrancar();
}

// Pausa sin perder la hora (el reloj solo se reanuda si estaba corriendo).
export function pausarReloj() {
  if (timer === null) return;
  clearInterval(timer);
  timer = null;
  pausadoPorJuego = true;
}

export function reanudarReloj() {
  if (!pausadoPorJuego) return;
  pausadoPorJuego = false;
  arrancar();
}
