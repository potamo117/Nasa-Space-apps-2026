// Íconos del juego: en lugar de depender de los emojis del sistema (que cambian
// según el dispositivo), cada símbolo se dibuja con un SVG local de
// recursos/iconos/ (Fluent Emoji, licencia MIT; ver recursos/CREDITOS.md).
// Este módulo vigila la página y sustituye los símbolos por <img class="icono">.

const BASE = new URL("../../recursos/iconos/", import.meta.url).href;

export const ICONOS = {
  "🍪": "cookie",
  "📣": "megaphone",
  "⏱": "stopwatch",
  "⏸": "pause-button",
  "🔊": "speaker-high-volume",
  "🚀": "rocket",
  "⚡": "high-voltage",
  "💧": "droplet",
  "🌱": "seedling",
  "🫧": "bubbles",
  "☢": "radioactive",
  "✖": "multiply",
  "🧪": "test-tube",
  "⚙": "gear",
  "🩹": "adhesive-bandage",
  "✅": "check-mark-button",
  "🔌": "electric-plug",
  "🔇": "muted-speaker",
  "🔥": "fire",
  "👨‍👩‍👧": "people-hugging",
  "🗑": "wastebasket",
  "⭐": "star",
  "🏆": "trophy",
  "🎖": "military-medal",
  "🚨": "police-car-light",
  "🎯": "bullseye",
  "🔄": "counterclockwise-arrows-button",
  "🔧": "wrench",
  "📉": "chart-decreasing",
  "🔋": "battery",
  "⚠": "warning",
  "🌅": "sunrise",
  "🥇": "1st-place-medal",
  "🎉": "party-popper",
  "💥": "collision",
  "✓": "check-mark",
  "🤔": "thinking-face",
  "🛰": "satellite",
  "🥗": "green-salad",
  "🤖": "robot",
  "💡": "light-bulb",
  "📋": "clipboard",
  "🔴": "red-circle",
  "🔵": "blue-circle",
  "🌿": "herb",
  "👆": "backhand-index-pointing-up",
  "🍅": "tomato",
  "🍓": "strawberry",
  "⬆": "up-arrow",
  "⬇": "down-arrow",
  "🌟": "glowing-star",
  "🟣": "purple-circle",
  "💎": "gem-stone",
  "🧲": "magnet",
  "🌡": "thermometer",
  "❄": "snowflake",
  "💦": "sweat-droplets",
  "✨": "sparkles",
  "☀": "sun",
  "🌤": "sun-behind-small-cloud",
  "🔬": "microscope",
  "🛏": "bed",
  "📡": "satellite-antenna",
  "👇": "backhand-index-pointing-down",
  "🛡": "shield",
  "💚": "green-heart",
  "👩‍🚀": "woman-astronaut",
  "⏰": "alarm-clock",
  "😊": "smiling-face-with-smiling-eyes",
  "💪": "flexed-biceps",
  "🔁": "repeat-button",
  "🧰": "toolbox",
  "🧯": "fire-extinguisher",
  "📦": "package",
  "🚰": "potable-water",
  "🧫": "petri-dish",
};
const APAGADOS = { "☆": "star" }; // estrella vacía = estrella atenuada

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const claves = [...Object.keys(ICONOS), ...Object.keys(APAGADOS)].sort((a, b) => b.length - a.length);
const RE = new RegExp("(" + claves.map(escapar).join("|") + ")\uFE0F?", "gu");
const IGNORAR = new Set(["SCRIPT", "STYLE", "TEXTAREA", "TITLE", "OPTION", "NOSCRIPT"]);

export function urlIcono(simbolo) {
  const nombre = ICONOS[simbolo] || APAGADOS[simbolo];
  return nombre ? BASE + nombre + ".svg" : null;
}

/** Devuelve una imagen ya cargándose (para dibujar en <canvas>). */
export function imagenIcono(simbolo) {
  const img = new Image();
  img.src = urlIcono(simbolo);
  return img;
}

function crearImg(simbolo) {
  const img = document.createElement("img");
  img.className = APAGADOS[simbolo] ? "icono icono-apagado" : "icono";
  img.src = urlIcono(simbolo);
  img.alt = "";
  img.setAttribute("aria-hidden", "true");
  img.draggable = false;
  img.decoding = "async";
  return img;
}

function convertirTexto(nodo) {
  const texto = nodo.nodeValue;
  if (!texto) return;
  RE.lastIndex = 0;
  if (!RE.test(texto)) return;
  const padre = nodo.parentNode;
  if (!padre || IGNORAR.has(padre.nodeName)) return;
  const frag = document.createDocumentFragment();
  let ultimo = 0;
  RE.lastIndex = 0;
  for (let m; (m = RE.exec(texto)); ) {
    if (m.index > ultimo) frag.appendChild(document.createTextNode(texto.slice(ultimo, m.index)));
    frag.appendChild(crearImg(m[1]));
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) frag.appendChild(document.createTextNode(texto.slice(ultimo)));
  padre.replaceChild(frag, nodo);
}

export function iconizar(raiz = document.body) {
  if (!raiz) return;
  if (raiz.nodeType === Node.TEXT_NODE) return convertirTexto(raiz);
  if (raiz.nodeType !== Node.ELEMENT_NODE || IGNORAR.has(raiz.nodeName)) return;
  const tw = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  const nodos = [];
  while (tw.nextNode()) nodos.push(tw.currentNode);
  nodos.forEach(convertirTexto);
}

function arrancar() {
  if (window.__iconosActivos) return;
  window.__iconosActivos = true;
  const estilo = document.createElement("style");
  estilo.textContent =
    "img.icono{display:inline-block;width:1.15em;height:1.15em;vertical-align:-0.22em;object-fit:contain;user-select:none;pointer-events:none}" +
    "img.icono-apagado{filter:grayscale(1);opacity:.35}";
  document.head.appendChild(estilo);
  iconizar(document.body);
  new MutationObserver((cambios) => {
    for (const c of cambios) {
      if (c.type === "characterData") convertirTexto(c.target);
      else c.addedNodes.forEach((n) => iconizar(n));
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}

if (document.body) arrancar();
else document.addEventListener("DOMContentLoaded", arrancar);
