// Cabina (P2): reloj, barra de energía, porcentajes, gráficas, fallos, prioridades e interruptores.
import { segundosParaCritico, consumoSector } from "../core/energia.js";
import { getSegundosPorHora } from "../core/reloj.js";
import { infoDia } from "../core/eventos.js";
import { t } from "../core/i18n.js";
const SECTORES = ["agua", "comida", "oxigeno", "radiacion"];
const $ = (id) => document.getElementById(id);

const historial = {
  agua: Array(12).fill(100),
  comida: Array(12).fill(100),
  oxigeno: Array(12).fill(100),
  radiacion: Array(12).fill(0),
};

const COLORES_SECTOR = {
  agua: "#29b6f6",
  comida: "#66bb6a",
  oxigeno: "#26c6da",
  radiacion: "#ffa726",
};

// Las gráficas avanzan un punto cada 2 s reales (no en cada refresco).
const MS_ENTRE_MUESTRAS = 2000;
let ultimoMuestreo = 0;

// `hora` llega como "XX:XX"; en la prórroga llega como cuenta regresiva ("00:09").
export function actualizarCockpit(estado, hora = "06:00", dia = 1) {
  const debug = $("debug-cockpit"); // solo existe en test/core.html
  if (debug) {
    const f = (n) => Math.round(n * 10) / 10;
    debug.textContent =
      `Reloj: ${hora} | Día ${dia}\n` +
      `Electricidad: ${f(estado.electricidad)}%\n` +
      `Comida: ${f(estado.comida)} | Agua: ${f(estado.agua)} | Oxígeno: ${f(estado.oxigeno)} | Radiación: ${f(estado.radiacion)}\n` +
      `Interruptores: ${JSON.stringify(estado.interruptores)}\n` +
      `Fallos activos: ${estado.fallos.join(", ") || "ninguno"}`;
  }

  const relojHora = $("reloj-hora");
  if (relojHora) {
    relojHora.textContent = hora;
    relojHora.style.color = hora.startsWith("00:") ? "var(--alert-red)" : "";
  }
  const relojDia = $("reloj-dia");
  if (relojDia) relojDia.textContent = t("DÍA {dia}", { dia });
  const titulo = $("dia-titulo");
  if (titulo) titulo.textContent = t(infoDia(dia).titulo).toUpperCase();

  const energia = Math.max(0, Math.min(100, Math.round(estado.electricidad)));
  const energiaTxt = $("energia-porcentaje");
  if (energiaTxt) energiaTxt.textContent = `${energia}%`;
  const energiaBarra = $("energia-barra");
  if (energiaBarra) {
    energiaBarra.style.height = `${energia}%`;
    energiaBarra.style.setProperty("--nivel", `${energia}%`); // en móvil la barra es horizontal
  }

  const ahora = Date.now();
  const muestrear = ahora - ultimoMuestreo >= MS_ENTRE_MUESTRAS;
  if (muestrear) ultimoMuestreo = ahora;

  // Tiempo restante de cada sector y cuál es la prioridad (el que se hunde primero).
  const tiempos = {};
  let prioritario = null;
  SECTORES.forEach((sector) => {
    const t = segundosParaCritico(sector);
    tiempos[sector] = t;
    if (Number.isFinite(t) && t <= 60 && (prioritario === null || t < tiempos[prioritario])) prioritario = sector;
  });
  const sPorSeg = 1 / getSegundosPorHora();

  SECTORES.forEach((sector) => {
    const valor = Math.max(0, Math.min(100, Math.round(estado[sector])));
    const valTxt = $(`val-${sector}`);
    if (valTxt) valTxt.textContent = `${valor}%`;

    const tarjeta = document.querySelector(`.sector-unit[data-sector="${sector}"]`);
    if (tarjeta) {
      tarjeta.classList.toggle("en-fallo", estado.fallos.includes(sector));
      tarjeta.classList.toggle("prioridad", sector === prioritario);
      tarjeta.classList.toggle("urgente", Number.isFinite(tiempos[sector]) && tiempos[sector] < 20);
    }
    const tm = $(`tm-${sector}`);
    if (tm) {
      const seg = tiempos[sector];
      tm.textContent = Number.isFinite(seg)
        ? `${sector === prioritario ? t("🔥 PRIORIDAD · ") : ""}⏱ ${Math.ceil(seg)} s`
        : "\u00a0";
    }
    const co = $(`co-${sector}`);
    if (co) co.textContent = estado.interruptores[sector] ? `⚡ −${(consumoSector(sector) * sPorSeg).toFixed(1)}%/s` : t("sin consumo");

    // Interruptor: refleja estado.interruptores (por ejemplo tras un apagón o al reiniciar).
    const encendido = estado.interruptores[sector];
    const sw = $(`sw-${sector}`);
    if (sw) sw.classList.toggle("active", encendido);
    const st = $(`st-${sector}`);
    if (st) {
      st.textContent = encendido ? t("CONECTADO") : t("APAGADO");
      st.classList.toggle("off", !encendido);
    }

    const h = historial[sector];
    if (muestrear) { h.push(valor); h.shift(); } else { h[h.length - 1] = valor; }
    dibujarGrafica(`chart-${sector}`, h, COLORES_SECTOR[sector]);
  });
}

function dibujarGrafica(canvasId, datos, color) {
  const canvas = $(canvasId);
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  [0.25, 0.5, 0.75].forEach((p) => {
    ctx.beginPath();
    ctx.moveTo(0, h * p);
    ctx.lineTo(w, h * p);
    ctx.stroke();
  });

  const pasoX = w / (datos.length - 1);
  ctx.beginPath();
  datos.forEach((val, i) => {
    const x = i * pasoX;
    const y = h - (val / 100) * (h - 12) - 6;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = color;
  ctx.lineWidth = 3.5;
  ctx.lineJoin = "round";
  ctx.stroke();

  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = `${color}33`;
  ctx.fill();
}


// Mensaje flotante breve (logros, avisos). No bloquea el juego.
export function mostrarToast(texto, clase = "") {
  const zona = $("toasts");
  if (!zona) return;
  const t = document.createElement("div");
  t.className = `toast ${clase}`;
  t.textContent = texto;
  zona.appendChild(t);
  setTimeout(() => t.classList.add("salir"), 3200);
  setTimeout(() => t.remove(), 3700);
}
