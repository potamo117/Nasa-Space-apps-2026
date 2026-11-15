// Temporizador del juego: como setTimeout, pero se detiene con la pausa.
// Todo lo que deba "esperar tiempo de juego" (avisos, elecciones, eventos solapados) usa esperar().
const PASO_MS = 100;
let timer = null;
let pausado = false;
let ahora = 0;      // ms de juego transcurridos (no avanza en pausa)
let contador = 0;
let tareas = [];

function paso() {
  if (pausado) return;
  ahora += PASO_MS;
  const vencidas = tareas.filter((t) => t.en <= ahora);
  if (vencidas.length === 0) return;
  tareas = tareas.filter((t) => t.en > ahora);
  vencidas.forEach((t) => { try { t.fn(); } catch (e) { console.error("[temporizador]", e); } });
}

export function iniciarTemporizador() {
  clearInterval(timer);
  tareas = [];
  ahora = 0;
  pausado = false;
  timer = setInterval(paso, PASO_MS);
}

export function detenerTemporizador() {
  clearInterval(timer);
  timer = null;
  tareas = [];
}

export function esperar(ms, fn) {
  const t = { id: ++contador, en: ahora + ms, fn };
  tareas.push(t);
  return t.id;
}

export function cancelarEspera(id) {
  tareas = tareas.filter((t) => t.id !== id);
}

export function pausarTemporizador() { pausado = true; }
export function reanudarTemporizador() { pausado = false; }
export function temporizadorPausado() { return pausado; }
export function ahoraJuego() { return ahora; }

// Cancela todas las esperas pendientes (por ejemplo, al terminar el día).
export function limpiarEsperas() {
  tareas = [];
}
