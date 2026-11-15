// Puntuación, estrellas, logros y mejoras entre días.
import { estado } from "./estado.js";
import { emitir } from "./bus.js";

const LS_MEJOR = "lunar-mejor-puntuacion";
const LS_LOGROS = "lunar-logros";

function leerLS(clave, defecto) {
  try { const v = localStorage.getItem(clave); return v === null ? defecto : JSON.parse(v); } catch (e) { return defecto; }
}
function escribirLS(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento: no pasa nada */ }
}

export const LOGROS = {
  primera:   { nombre: "Primera reparación", icono: "🔧", desc: "Repara tu primer sector." },
  racha5:    { nombre: "Manos rápidas", icono: "⚡", desc: "5 reparaciones seguidas en menos de 30 s." },
  presion:   { nombre: "Bajo presión", icono: "🔥", desc: "Resuelve 3 fallas simultáneas." },
  cme:       { nombre: "Sobreviviente solar", icono: "☀️", desc: "Estabiliza la tormenta masiva (CME)." },
  perfecto:  { nombre: "Día perfecto", icono: "⭐", desc: "Termina un día con 3 estrellas." },
  energia:   { nombre: "Maestro de la energía", icono: "🔋", desc: "Termina un día con más del 30 % de batería." },
  parche:    { nombre: "Previsor", icono: "🩹", desc: "Evita una falla con un parche rápido." },
  victoria:  { nombre: "Comandante lunar", icono: "🚀", desc: "Completa los 5 días." },
};

export const MEJORAS = {
  baterias:    { nombre: "Baterías de litio", icono: "🔋", desc: "Gastas 12 % menos energía.",
                 aplicar: (m) => { m.consumo *= 0.88; } },
  kit:         { nombre: "Kit de reparación", icono: "🧰", desc: "Cada reparación recupera +8 puntos más.",
                 aplicar: (m) => { m.recuperacion += 8; } },
  aislamiento: { nombre: "Aislamiento térmico", icono: "🧯", desc: "Las fallas dañan 15 % más lento.",
                 aplicar: (m) => { m.fallo *= 0.85; } },
  solar:       { nombre: "Paneles solares", icono: "☀️", desc: "La batería se recarga un poco sola.",
                 aplicar: (m) => { m.solar += 1.2; } },
  reserva:     { nombre: "Reserva de emergencia", icono: "📦", desc: "Recupera 12 puntos en todos los recursos ahora.",
                 aplicar: (m, e) => {
                   ["comida", "agua", "oxigeno"].forEach((s) => { e[s] = Math.min(100, e[s] + 12); });
                   e.radiacion = Math.max(0, e.radiacion - 12);
                 } },
  blindaje:    { nombre: "Blindaje reforzado", icono: "🛡️", desc: "La radiación sube 30 % más lento.",
                 aplicar: (m) => { m.radiacion *= 0.7; } },
};

let juego = null;      // estadísticas de la partida en curso
let dia = null;        // estadísticas del día en curso
let elegidas = [];

export function nuevaPartida() {
  juego = {
    puntos: 0, estrellas: 0, reparaciones: 0, racha: 0,
    logrosNuevos: [], diasInfo: [],
  };
  dia = null;
  elegidas = [];
}

export function nuevoDia(n) {
  dia = { dia: n, reparaciones: 0, fallos: 0, minRecurso: 100, apagon: false, maxSimultaneas: 0, puntos: 0 };
}

export function logrosGuardados() {
  return leerLS(LS_LOGROS, []);
}

export function mejorPuntuacion() {
  return leerLS(LS_MEJOR, 0);
}

function desbloquear(id) {
  if (!juego || juego.logrosNuevos.includes(id)) return;
  const previos = logrosGuardados();
  juego.logrosNuevos.push(id);
  if (!previos.includes(id)) escribirLS(LS_LOGROS, [...previos, id]);
  emitir("logro", { id, ...LOGROS[id] });
}

export function sumarPuntos(n) {
  if (!juego) return;
  juego.puntos += n;
  if (dia) dia.puntos += n;
}

export function puntosActuales() {
  return juego ? juego.puntos : 0;
}

// Se llama cada segundo: guarda el peor valor de recursos del día.
export function observar() {
  if (!dia) return;
  const v = Math.min(estado.comida, estado.agua, estado.oxigeno, 100 - estado.radiacion);
  if (v < dia.minRecurso) dia.minRecurso = v;
}

export function registrarFallos(cantidad) {
  if (!dia) return;
  dia.fallos++;
  dia.maxSimultaneas = Math.max(dia.maxSimultaneas, cantidad);
}

export function registrarApagon() {
  if (dia) dia.apagon = true;
}

export function registrarParche() {
  desbloquear("parche");
  sumarPuntos(40);
}

export function registrarReparacion(segundos) {
  if (!juego || !dia) return;
  juego.reparaciones++;
  dia.reparaciones++;
  sumarPuntos(50 + Math.max(0, Math.round((30 - segundos) * 2)));
  juego.racha = segundos <= 30 ? juego.racha + 1 : 0;
  desbloquear("primera");
  if (juego.racha >= 5) desbloquear("racha5");
}

// Se llama cuando ya no quedan fallos activos.
export function todoEstabilizado() {
  if (dia && dia.maxSimultaneas >= 3) desbloquear("presion");
  if (dia) dia.maxSimultaneas = 0;
}

// Se llama cuando todos los sectores de un evento quedaron reparados.
export function eventoResuelto(id) {
  if (id === 9) desbloquear("cme");
}

export function cerrarDia(electricidad) {
  if (!dia) return null;
  let estrellas = 1;
  if (!dia.apagon && dia.minRecurso >= 35) estrellas = 3;
  else if (dia.minRecurso >= 15) estrellas = 2;
  const bonus = estrellas * 100 + Math.round(electricidad);
  sumarPuntos(bonus);
  juego.estrellas += estrellas;
  if (estrellas === 3) desbloquear("perfecto");
  if (electricidad > 30) desbloquear("energia");
  const cierre = {
    dia: dia.dia, estrellas, reparaciones: dia.reparaciones, fallos: dia.fallos,
    minRecurso: Math.round(dia.minRecurso), apagon: dia.apagon,
    electricidad: Math.round(electricidad), puntosDia: dia.puntos, puntosTotal: juego.puntos,
  };
  juego.diasInfo.push(cierre);
  return cierre;
}

// 3 mejoras al azar entre las que aún no se eligieron.
export function ofrecerMejoras() {
  const libres = Object.keys(MEJORAS).filter((id) => !elegidas.includes(id));
  const mezcla = libres.sort(() => Math.random() - 0.5);
  return mezcla.slice(0, 3);
}

export function aplicarMejora(id) {
  const m = MEJORAS[id];
  if (!m || elegidas.includes(id)) return;
  elegidas.push(id);
  m.aplicar(estado.mejoras, estado);
}

export function mejorasElegidas() {
  return [...elegidas];
}

export function resumenFinal(victoria) {
  if (!juego) return null;
  if (victoria) { desbloquear("victoria"); sumarPuntos(500); }
  const previo = mejorPuntuacion();
  const nuevoRecord = juego.puntos > previo;
  if (nuevoRecord) escribirLS(LS_MEJOR, juego.puntos);
  return {
    puntos: juego.puntos, estrellas: juego.estrellas, reparaciones: juego.reparaciones,
    logros: juego.logrosNuevos.map((id) => ({ id, ...LOGROS[id] })),
    mejor: Math.max(previo, juego.puntos), nuevoRecord,
  };
}
