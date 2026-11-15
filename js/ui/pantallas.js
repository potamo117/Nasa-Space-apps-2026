// Pantallas a pantalla completa: bienvenida, tutorial, pausa, resumen de día, victoria y derrota.
import { PERFILES } from "../core/dificultad.js";
import { MEJORAS, LOGROS, mejorPuntuacion, logrosGuardados } from "../core/progreso.js";
import { desbloquearAudio, sonido } from "./audio.js";

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function crear(id, html, extra = "") {
  document.getElementById(id)?.remove();
  const overlay = document.createElement("div");
  overlay.id = id;
  overlay.className = "pantalla " + extra;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = `<div class="pantalla-contenido">${html}</div>`;
  document.body.appendChild(overlay);
  return overlay;
}

function lsGet(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ok */ } }

const estrellas = (n) => "⭐".repeat(n) + "☆".repeat(Math.max(0, 3 - n));

// ---------- Bienvenida ----------
export function mostrarPantallaBienvenida(onIniciarJuego) {
  let dif = lsGet("lunar-dificultad", "normal");
  if (!PERFILES[dif]) dif = "normal";
  const mejor = mejorPuntuacion();
  const nLogros = logrosGuardados().length;
  const overlay = crear("pantalla-bienvenida", `
    <h1 class="titulo-grande">SUPERVIVENCIA LUNAR</h1>
    <p class="texto-pantalla">¡Bienvenido Comandante! Gestiona la energía, reacciona a las alertas y mantén los sistemas estables durante 5 días.</p>
    <div class="dif-opciones" role="group" aria-label="Dificultad">
      ${Object.values(PERFILES).map((p) => `<button type="button" class="dif-btn" data-dif="${p.id}">${p.nombre}</button>`).join("")}
    </div>
    <p class="texto-chico">🏆 Mejor puntuación: <b>${mejor}</b> · 🎖️ Logros: <b>${nLogros}/${Object.keys(LOGROS).length}</b></p>
    <button id="btn-comenzar-mision" type="button" class="btn-grande verde">🚀 INICIAR MISIÓN</button>
    <button id="btn-como-jugar" type="button" class="btn-link">¿Cómo se juega?</button>
  `);
  const marcar = () => overlay.querySelectorAll(".dif-btn").forEach((b) => b.classList.toggle("activo", b.dataset.dif === dif));
  marcar();
  overlay.querySelectorAll(".dif-btn").forEach((b) => b.addEventListener("click", () => { dif = b.dataset.dif; lsSet("lunar-dificultad", dif); sonido.click(); marcar(); }));
  overlay.querySelector("#btn-como-jugar").addEventListener("click", () => { desbloquearAudio(); mostrarTutorial(() => {}); });
  overlay.querySelector("#btn-comenzar-mision").addEventListener("click", () => {
    desbloquearAudio();
    overlay.remove();
    const arrancar = () => { if (onIniciarJuego) onIniciarJuego(dif); };
    if (lsGet("lunar-tutorial-visto", "0") === "1") arrancar();
    else mostrarTutorial(arrancar);
  });
}

// ---------- Tutorial ----------
const SLIDES = [
  { icono: "⚡", titulo: "Energía", texto: "Cada interruptor gasta energía. Apaga sectores que no necesites, pero se deteriorarán. El oxígeno cae rapidísimo apagado; la comida aguanta más." },
  { icono: "🚨", titulo: "Alertas", texto: "Verás un aviso unos segundos antes de cada falla. Toca el botón del sector en rojo y resuelve su minijuego para repararlo." },
  { icono: "🎯", titulo: "Objetivo", texto: "Sobrevive 5 días. Al terminar cada día ganas estrellas y eliges una mejora. ¡Cuidado con la tormenta solar del Día 5!" },
];

export function mostrarTutorial(onFin) {
  let i = 0;
  const overlay = crear("pantalla-tutorial", "");
  const cont = overlay.querySelector(".pantalla-contenido");
  const fin = () => { lsSet("lunar-tutorial-visto", "1"); overlay.remove(); if (onFin) onFin(); };
  const pintar = () => {
    const s = SLIDES[i];
    cont.innerHTML = `
      <div class="tuto-icono">${s.icono}</div>
      <h2 class="titulo-medio">${s.titulo}</h2>
      <p class="texto-pantalla">${s.texto}</p>
      <div class="tuto-puntos">${SLIDES.map((_, k) => `<span class="${k === i ? "on" : ""}"></span>`).join("")}</div>
      <button id="btn-tuto-sig" type="button" class="btn-grande azul">${i === SLIDES.length - 1 ? "¡Entendido!" : "Siguiente"}</button>
      <button id="btn-tuto-saltar" type="button" class="btn-link">Saltar</button>`;
    cont.querySelector("#btn-tuto-sig").addEventListener("click", () => { sonido.click(); if (i === SLIDES.length - 1) fin(); else { i++; pintar(); } });
    cont.querySelector("#btn-tuto-saltar").addEventListener("click", fin);
  };
  pintar();
}

// ---------- Pausa ----------
export function mostrarPausa({ onContinuar, onReiniciar, onMenu }) {
  const overlay = crear("pantalla-pausa", `
    <h1 class="titulo-grande">⏸ PAUSA</h1>
    <p class="texto-pantalla">El tiempo está detenido. Respira, comandante.</p>
    <button id="btn-continuar" type="button" class="btn-grande verde">▶ Continuar</button>
    <button id="btn-pausa-reiniciar" type="button" class="btn-grande azul">🔄 Reiniciar partida</button>
    <button id="btn-pausa-menu" type="button" class="btn-link">Menú principal</button>
  `);
  overlay.querySelector("#btn-continuar").addEventListener("click", () => { overlay.remove(); onContinuar(); });
  overlay.querySelector("#btn-pausa-reiniciar").addEventListener("click", () => { overlay.remove(); onReiniciar(); });
  overlay.querySelector("#btn-pausa-menu").addEventListener("click", () => { overlay.remove(); onMenu(); });
  return overlay;
}

export function cerrarPausa() {
  document.getElementById("pantalla-pausa")?.remove();
}

// ---------- Resumen de día + elección de mejora ----------
export function mostrarResumenDia({ cierre, diaSiguiente, infoSiguiente, opciones }, onElegir) {
  const cartas = opciones.map((id) => {
    const m = MEJORAS[id];
    return `<button type="button" class="mejora-card" data-id="${id}"><span class="mejora-ico">${m.icono}</span><b>${esc(m.nombre)}</b><small>${esc(m.desc)}</small></button>`;
  }).join("");
  const overlay = crear("pantalla-resumen", `
    <h1 class="titulo-medio">DÍA ${cierre.dia} COMPLETADO</h1>
    <div class="estrellas-grandes" aria-label="${cierre.estrellas} de 3 estrellas">${estrellas(cierre.estrellas)}</div>
    <ul class="resumen-lista">
      <li>🔧 Reparaciones: <b>${cierre.reparaciones}</b></li>
      <li>📉 Peor recurso del día: <b>${cierre.minRecurso}%</b></li>
      <li>🔋 Batería al cierre: <b>${cierre.electricidad}%</b>${cierre.apagon ? " · ⚠ hubo apagón" : ""}</li>
      <li>🏆 Puntos: <b>${cierre.puntosTotal}</b></li>
    </ul>
    <div class="pronostico">🌅 <b>Día ${diaSiguiente}: ${esc(infoSiguiente.titulo)}</b><br>${esc(infoSiguiente.pronostico)}</div>
    ${opciones.length ? `<p class="texto-chico">Elige una mejora para mañana:</p><div class="mejoras-grid">${cartas}</div>`
      : `<button id="btn-resumen-continuar" type="button" class="btn-grande verde">Continuar</button>`}
  `);
  overlay.querySelectorAll(".mejora-card").forEach((c) => c.addEventListener("click", () => {
    sonido.click();
    overlay.remove();
    onElegir(c.dataset.id);
  }));
  overlay.querySelector("#btn-resumen-continuar")?.addEventListener("click", () => { overlay.remove(); onElegir(null); });
}

// ---------- Fin de partida ----------
export function mostrarPantallaFin(victoria, onReiniciar, motivo = "", resumen = null, onMenu = null) {
  const logros = resumen && resumen.logros.length
    ? `<div class="logros-fin">${resumen.logros.map((l) => `<span class="logro-chip" title="${esc(l.desc)}">${l.icono} ${esc(l.nombre)}</span>`).join("")}</div>` : "";
  const stats = resumen ? `
    <ul class="resumen-lista">
      <li>🏆 Puntuación: <b>${resumen.puntos}</b>${resumen.nuevoRecord ? " · ¡Nuevo récord!" : ""}</li>
      <li>⭐ Estrellas: <b>${resumen.estrellas}</b> · 🔧 Reparaciones: <b>${resumen.reparaciones}</b></li>
      <li>🥇 Mejor puntuación: <b>${resumen.mejor}</b></li>
    </ul>${logros}` : "";
  const overlay = crear("pantalla-fin", `
    <h1 class="titulo-grande ${victoria ? "ok" : "mal"}">${victoria ? "🎉 ¡MISIÓN EXITOSA!" : "💥 ¡BASE COLAPSADA!"}</h1>
    <p class="texto-pantalla">${victoria ? "Has sobrevivido los 5 días en la base lunar con éxito." : esc(motivo || "Los recursos críticos llegaron a cero o la energía falló.")}</p>
    ${stats}
    <button id="btn-reiniciar" type="button" class="btn-grande azul">🔄 JUGAR OTRA VEZ</button>
    ${onMenu ? `<button id="btn-fin-menu" type="button" class="btn-link">Cambiar dificultad</button>` : ""}
  `);
  overlay.querySelector("#btn-reiniciar").addEventListener("click", () => { overlay.remove(); if (onReiniciar) onReiniciar(); });
  overlay.querySelector("#btn-fin-menu")?.addEventListener("click", () => { overlay.remove(); onMenu(); });
}
