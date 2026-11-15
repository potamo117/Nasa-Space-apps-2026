import { estado, SECTORES } from "./estado.js";
import { emitir } from "./bus.js";
import { getSegundosPorHora } from "./reloj.js";
import { terminarMisionPorDerrota } from "./listaEnlazada.js";
import { perfil } from "./dificultad.js";

// ===== NÚMEROS AJUSTABLES (todos por HORA DE JUEGO, así no dependen de la escala del reloj) =====
// Cada sector cuesta distinto y se degrada distinto al apagarlo: apagar es una decisión, no solo un castigo.
export const SECTOR_CFG = {
  comida:    { consumo: 1.6, sinEnergia: 1.5 },               // barato y aguanta apagado
  agua:      { consumo: 2,   sinEnergia: 2.4 },
  oxigeno:   { consumo: 2.4, sinEnergia: 4 },                 // vital: apagado se desploma
  radiacion: { consumo: 2.4, sinEnergia: 2.4, escudo: 0.5 },    // escudos encendidos frenan a la mitad las fallas
};
export const DEGRADACION_FALLO = 5;          // % por hora de un sector con evento activo (valor de referencia; el real viene del perfil de dificultad)
export const RECUPERACION_AL_REPARAR = 15;   // % que se recupera al ganar el minijuego (no rellena al 100 %)
export const RECUPERACION_BONUS = 13;        // extra si se eligió "reparación a fondo" en un evento con elección
const TICK_MS = 1000;                        // la simulación avanza cada segundo real
// Radiación es al revés: 100 = peligro, 0 = seguro.

const NOMBRES = { comida: "comida", agua: "agua", oxigeno: "oxígeno", radiacion: "radiación" };
let timer = null;

const limitar = (v) => Math.max(0, Math.min(100, v));
const esRadiacion = (s) => s === "radiacion";

// % por hora de juego que cambia el sector (siempre positivo = se está deteriorando).
export function tasaSector(s) {
  const cfg = SECTOR_CFG[s];
  const p = perfil();
  let tasa = 0;
  if (!estado.interruptores[s]) tasa += cfg.sinEnergia;
  if (estado.fallos.includes(s)) {
    let f = p.fallo * estado.mejoras.fallo;
    if (esRadiacion(s) && estado.interruptores[s]) f *= cfg.escudo;
    tasa += f;
  }
  if (esRadiacion(s)) tasa *= estado.mejoras.radiacion;
  return tasa;
}

// Consumo total de electricidad (% por hora) con los interruptores actuales.
export function consumoTotal() {
  const base = SECTORES.reduce((a, s) => a + (estado.interruptores[s] ? SECTOR_CFG[s].consumo : 0), 0);
  return base * perfil().consumo * estado.mejoras.consumo;
}

export function consumoSector(s) {
  return SECTOR_CFG[s].consumo * perfil().consumo * estado.mejoras.consumo;
}

// Segundos REALES hasta que el sector llegue a su límite crítico (Infinity si no se deteriora).
export function segundosParaCritico(s) {
  const tasa = tasaSector(s);
  if (tasa <= 0) return Infinity;
  const restante = esRadiacion(s) ? 100 - estado[s] : estado[s];
  return Math.max(0, (restante / tasa) * getSegundosPorHora());
}

function tick() {
  const dtHoras = (TICK_MS / 1000) / getSegundosPorHora();

  // (a) cada interruptor encendido descuenta electricidad; los paneles solares recuperan un poco
  const encendidos = SECTORES.filter((s) => estado.interruptores[s]).length;
  estado.electricidad = limitar(
    estado.electricidad - (consumoTotal() - estado.mejoras.solar) * dtHoras
  );

  // Apagón: sin energía se apagan todos los interruptores
  if (estado.electricidad <= 0 && encendidos > 0) {
    SECTORES.forEach((s) => { estado.interruptores[s] = false; });
    emitir("apagon", {});
  }

  // (b) sin energía el sector fluctúa a la baja, (c) con evento activo baja más rápido
  SECTORES.forEach((s) => {
    const delta = tasaSector(s) * dtHoras;
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

// Un minijuego ganado quita el fallo (y recupera un poco el sector, sin llegar a rellenarlo).
export function resolverFallo(sector) {
  const i = estado.fallos.indexOf(sector);
  if (i === -1) return false;
  estado.fallos.splice(i, 1);
  const b = estado.bonusReparacion.indexOf(sector);
  let rec = RECUPERACION_AL_REPARAR + estado.mejoras.recuperacion;
  if (b !== -1) { rec += RECUPERACION_BONUS; estado.bonusReparacion.splice(b, 1); }
  estado[sector] = limitar(esRadiacion(sector) ? estado[sector] - rec : estado[sector] + rec);
  emitir("fallos-cambio", { fallos: [...estado.fallos] });
  return true;
}
