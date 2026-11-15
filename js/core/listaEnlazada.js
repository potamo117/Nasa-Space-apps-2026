import { estado, SECTORES } from "./estado.js";
import { emitir, escuchar } from "./bus.js";

export const TOTAL_DIAS = 5;
export const SEGUNDOS_PRORROGA = 20;

export class DiaNode {
  constructor(numeroDia) {
    this.numeroDia = numeroDia;
    this.electricidad = 100; // se restablece al máximo cada día
    this.comida = 100;       // se arrastra del día anterior
    this.agua = 100;         // se arrastra del día anterior
    this.oxigeno = 100;      // se arrastra del día anterior
    this.radiacion = 0;      // se arrastra del día anterior
    this.siguiente = null;   // puntero al siguiente día
  }
}

let diaActual = null;
let intervaloProrroga = null;
let segundosRestantes = 0;
let desuscribirFallos = null;
let enProrrogaEmergencia = false;
let misionTerminada = false;

// Construye la lista enlazada de 5 días y la deja en el Día 1.
export function crearLista() {
  cancelarProrroga();
  misionTerminada = false;
  const dia1 = new DiaNode(1);
  let actual = dia1;
  for (let n = 2; n <= TOTAL_DIAS; n++) {
    actual.siguiente = new DiaNode(n);
    actual = actual.siguiente;
  }
  diaActual = dia1;
}

export function getDiaActual() {
  return diaActual;
}

export function obtenerFallosActivos() {
  return estado.fallos;
}

function cancelarProrroga() {
  clearInterval(intervaloProrroga);
  intervaloProrroga = null;
  if (desuscribirFallos) { desuscribirFallos(); desuscribirFallos = null; }
  enProrrogaEmergencia = false;
}

// Se llama cuando el reloj llega a las 20:00.
export function cierreAutomaticoJornada() {
  if (misionTerminada || enProrrogaEmergencia) return;

  // Base estable: avanza de inmediato al siguiente nodo.
  if (obtenerFallosActivos().length === 0) {
    ejecutarTransicionNodo();
    return;
  }

  // Fallos pendientes: bloquea el descanso y da unos segundos reales extra.
  enProrrogaEmergencia = true;
  segundosRestantes = SEGUNDOS_PRORROGA;
  emitir("prorroga-inicio", { segundos: segundosRestantes });

  // Si el último fallo se resuelve a tiempo, cierra el día al instante.
  desuscribirFallos = escuchar("fallos-cambio", () => {
    if (obtenerFallosActivos().length === 0) {
      cancelarProrroga();
      ejecutarTransicionNodo();
    }
  });

  arrancarProrroga();
}

function arrancarProrroga() {
  clearInterval(intervaloProrroga);
  intervaloProrroga = setInterval(() => {
    segundosRestantes--;
    if (segundosRestantes <= 0) {
      terminarMisionPorDerrota("Tiempo extra agotado: no se estabilizaron los sectores antes del descanso nocturno.");
      return;
    }
    emitir("prorroga-tick", { segundos: segundosRestantes });
  }, 1000);
}

export function pausarProrroga() {
  clearInterval(intervaloProrroga);
  intervaloProrroga = null;
}

export function reanudarProrroga() {
  if (enProrrogaEmergencia && !misionTerminada) arrancarProrroga();
}

// Guarda el día que termina y avanza: diaActual = diaActual.siguiente.
export function ejecutarTransicionNodo() {
  if (misionTerminada) return;
  const diaAnterior = diaActual;
  emitir("dia-terminado", { dia: diaAnterior.numeroDia, electricidad: estado.electricidad });
  SECTORES.forEach((s) => { diaAnterior[s] = estado[s]; });
  diaAnterior.electricidad = estado.electricidad;

  if (diaActual.siguiente === null) {
    misionTerminada = true;
    emitir("victoria", {});
    return;
  }

  diaActual = diaActual.siguiente; // avanza al nodo siguiente
  // Regla de persistencia: electricidad al máximo, el resto hereda.
  diaActual.electricidad = 100;
  SECTORES.forEach((s) => { diaActual[s] = diaAnterior[s]; });
  // Si hubo apagón, la batería nueva vuelve a encender los sectores.
  if (estado.electricidad <= 0) SECTORES.forEach((s) => { estado.interruptores[s] = true; });
  estado.electricidad = 100;

  emitir("dia-cambio", { dia: diaActual.numeroDia });
}

export function terminarMisionPorDerrota(motivo) {
  if (misionTerminada) return;
  misionTerminada = true;
  cancelarProrroga();
  emitir("derrota", { motivo });
}
