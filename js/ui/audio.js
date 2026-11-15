// Sonidos sintetizados (Web Audio) y vibración para móvil. Sin archivos externos.
import { escuchar } from "../core/bus.js";

let ctx = null;
let silencio = false;
try { silencio = localStorage.getItem("lunar-silencio") === "1"; } catch (e) { /* sin almacenamiento */ }

export function desbloquearAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
  } catch (e) { /* sin audio */ }
}

export function sonidoActivo() { return !silencio; }

export function alternarSonido() {
  silencio = !silencio;
  try { localStorage.setItem("lunar-silencio", silencio ? "1" : "0"); } catch (e) { /* ok */ }
  return !silencio;
}

function tono(freq, dur, tipo = "sine", vol = 0.12, retraso = 0, hasta = null) {
  if (silencio || !ctx) return;
  try {
    const t0 = ctx.currentTime + retraso;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t0);
    if (hasta) o.frequency.linearRampToValueAtTime(hasta, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  } catch (e) { /* ignorar */ }
}

export function vibrar(patron) {
  // Solo tras un toque del usuario (ctx se crea en el primer gesto); si no, el navegador bloquea la vibración.
  if (silencio || !ctx) return;
  try { if (navigator.vibrate) navigator.vibrate(patron); } catch (e) { /* no soportado */ }
}

export const sonido = {
  click()   { tono(520, 0.06, "square", 0.05); },
  aviso()   { tono(660, 0.12, "triangle", 0.1); tono(660, 0.12, "triangle", 0.1, 0.2); },
  alarma()  { for (let i = 0; i < 3; i++) { tono(880, 0.18, "sawtooth", 0.1, i * 0.28); tono(620, 0.18, "sawtooth", 0.1, i * 0.28 + 0.14); } },
  ok()      { tono(523, 0.1, "triangle", 0.12); tono(659, 0.1, "triangle", 0.12, 0.1); tono(784, 0.2, "triangle", 0.12, 0.2); },
  logro()   { tono(784, 0.1, "triangle", 0.12); tono(988, 0.1, "triangle", 0.12, 0.1); tono(1319, 0.25, "triangle", 0.12, 0.2); },
  apagon()  { tono(300, 0.7, "sawtooth", 0.12, 0, 60); },
  dia()     { tono(440, 0.15, "sine", 0.1); tono(554, 0.15, "sine", 0.1, 0.15); tono(659, 0.3, "sine", 0.1, 0.3); },
  victoria(){ [523, 659, 784, 1047].forEach((f, i) => tono(f, 0.25, "triangle", 0.13, i * 0.18)); },
  derrota() { tono(400, 0.9, "sawtooth", 0.13, 0, 90); },
  parche()  { tono(700, 0.08, "square", 0.07); tono(900, 0.12, "square", 0.07, 0.09); },
};

// Conecta los sonidos y vibraciones a los eventos del juego (una sola vez).
let enganchado = false;
export function engancharAudio() {
  if (enganchado) return;
  enganchado = true;
  escuchar("alerta-previa", () => { sonido.aviso(); vibrar(80); });
  escuchar("evento-inicio", () => { sonido.alarma(); vibrar([200, 100, 200]); });
  escuchar("minijuego-terminado", ({ exito }) => { if (exito) { sonido.ok(); vibrar(60); } });
  escuchar("apagon", () => { sonido.apagon(); vibrar([400, 120, 400]); });
  escuchar("dia-terminado", () => sonido.dia());
  escuchar("logro", () => sonido.logro());
  escuchar("parche", () => sonido.parche());
  escuchar("victoria", () => sonido.victoria());
  escuchar("derrota", () => { sonido.derrota(); vibrar([500, 150, 500]); });
}
