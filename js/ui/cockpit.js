// PROVISIONAL (P1): P2 lo reemplaza con la cabina real.
// `hora` llega como "XX:XX" (en la prórroga llega como cuenta regresiva "00:09").
export function actualizarCockpit(estado, hora) {
  const el = document.getElementById("debug-cockpit");
  if (!el) return;
  const f = (n) => Math.round(n * 10) / 10;
  el.textContent =
    `Reloj: ${hora}\n` +
    `Electricidad: ${f(estado.electricidad)}%\n` +
    `Comida: ${f(estado.comida)} | Agua: ${f(estado.agua)} | Oxígeno: ${f(estado.oxigeno)} | Radiación: ${f(estado.radiacion)}\n` +
    `Interruptores: ${JSON.stringify(estado.interruptores)}\n` +
    `Fallos activos: ${estado.fallos.join(", ") || "ninguno"}`;
}
