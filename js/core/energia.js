import { estado, SECTORES } from "./estado.js";
import { emitir } from "./bus.js";
import { getSegundosPorHora } from "./reloj.js";
import { terminarMisionPorDerrota } from "./listaEnlazada.js";

// ===== NÚMEROS AJUSTABLES (todos por HORA DE JUEGO, así no dependen de la escala del reloj) =====
export const CONSUMO_POR_SECTOR = 3;         // % de electricidad por hora, por interruptor encendido
export const DEGRADACION_SIN_ENERGIA = 1.5;  // % por hora de un sector con interruptor apagado
export const DEGRADACION_FALLO = 8;          // % por hora de un sector con evento activo
export const RECUPERACION_AL_REPARAR = 25;   // % que se recupera al ganar el minijuego
const TICK_MS = 1000;                        // la simulación avanza cada segundo real
// Radiación es al revés: 100 = peligro, 0 = seguro.

const NOMBRES = { comida: "comida", agua: "agua", oxigeno: "oxígeno", radiacion: "radiación" };
let timer = null;

const limitar = (v) => Math.max(0, Math.min(100, v));
const esRadiacion = (s) => s === "radiacion";

function tick() {
  const dtHoras = (TICK_MS / 1000) / getSegundosPorHora();

  // (a) cada interruptor encendido descuenta electricidad
  const encendidos = SECTORES.filter((s) => estado.interruptores[s]).length;
  estado.electricidad = limitar(estado.electricidad - encendidos * CONSUMO_POR_SECTOR * dtHoras);

  // Apagón: sin energía se apagan todos los interruptores
  if (estado.electricidad <= 0 && encendidos > 0) {
    SECTORES.forEach((s) => { estado.interruptores[s] = false; });
    emitir("apagon", {});
  }

  // (b) sin energía el sector fluctúa a la baja, (c) con evento activo baja más rápido
  SECTORES.forEach((s) => {
    let tasa = 0;
    if (!estado.interruptores[s]) tasa += DEGRADACION_SIN_ENERGIA;
    if (estado.fallos.includes(s)) tasa += DEGRADACION_FALLO;
    const delta = tasa * dtHoras;
    estado[s] = limitar(esRadiacion(s) ? estado[s] + delta : estado[s] - delta);
  });

  emitir("estado-cambio", {});

  // Derrota: algún recurso llega a su límite crítico
  for (const s of SECTORES) {
    const critico = esRadiacion(s) ? estado[s] >= 100 : estado[s] <= 0;
    if (critico) {
      terminarMisionPorDerrota(
        esRadiacion(s) ? "La radiación llegó al nivel crítico." : `Te quedaste sin ${NOMBRES[s]}.`
      );
      return;
    }
  }
}

export function iniciarEnergia() {
  detenerEnergia();
  timer = setInterval(tick, TICK_MS);
}

export function detenerEnergia() {
  clearInterval(timer);
  timer = null;
}

// Un evento activa un fallo en un sector.
export function activarFallo(sector) {
  if (estado.fallos.includes(sector)) return false;
  estado.fallos.push(sector);
  emitir("fallos-cambio", { fallos: [...estado.fallos] });
  return true;
}

// Un minijuego ganado quita el fallo (y recupera un poco el sector).
export function resolverFallo(sector) {
  const i = estado.fallos.indexOf(sector);
  if (i === -1) return false;
  estado.fallos.splice(i, 1);
  estado[sector] = limitar(
    esRadiacion(sector) ? estado[sector] - RECUPERACION_AL_REPARAR : estado[sector] + RECUPERACION_AL_REPARAR
  );
  emitir("fallos-cambio", { fallos: [...estado.fallos] });
  return true;
}
