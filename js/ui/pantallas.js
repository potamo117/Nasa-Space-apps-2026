// Pantallas a pantalla completa: bienvenida, tutorial, pausa, resumen de día, victoria y derrota.
import { PERFILES } from "../core/dificultad.js";
import { MEJORAS, LOGROS, mejorPuntuacion, logrosGuardados } from "../core/progreso.js";
import { desbloquearAudio, sonido } from "./audio.js";
import { leer, escribir } from "../core/almacen.js";
import { abrirPreferenciasCookies } from "./cookies.js";
import { t, selectorIdiomaHTML, enlazarSelectorIdioma } from "../core/i18n.js";

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

const lsGet = (k, d) => leer(k.replace(/^lunar-/, ""), d);
const lsSet = (k, v) => escribir(k.replace(/^lunar-/, ""), v);

const estrellas = (n) => "⭐".repeat(n) + "☆".repeat(Math.max(0, 3 - n));

// ---------- Bienvenida ----------
let ultimaBienvenida = null;  // callbacks de las pantallas abiertas, para repintarlas al cambiar de idioma
let ultimaPausa = null;

export function mostrarPantallaBienvenida(onIniciarJuego) {
  ultimaBienvenida = onIniciarJuego;
  let dif = lsGet("lunar-dificultad", "normal");
  if (!PERFILES[dif]) dif = "normal";
  const mejor = mejorPuntuacion();
  const nLogros = logrosGuardados().length;
  const overlay = crear("pantalla-bienvenida", `
    ${selectorIdiomaHTML()}
    <h1 class="titulo-grande">${t("SUPERVIVENCIA LUNAR")}</h1>
    <p class="texto-pantalla">${t("¡Bienvenido Comandante! Gestiona la energía, reacciona a las alertas y mantén los sistemas estables durante 5 días.")}</p>
    <div class="dif-opciones" role="group" aria-label="${t("Dificultad")}">
      ${Object.values(PERFILES).map((p) => `<button type="button" class="dif-btn" data-dif="${p.id}">${t(p.nombre)}</button>`).join("")}
    </div>
    <p class="texto-chico">🏆 ${t("Mejor puntuación:")} <b>${mejor}</b> · 🎖️ ${t("Logros:")} <b>${nLogros}/${Object.keys(LOGROS).length}</b></p>
    <button id="btn-comenzar-mision" type="button" class="btn-grande verde">🚀 ${t("INICIAR MISIÓN")}</button>
    <button id="btn-como-jugar" type="button" class="btn-link">${t("¿Cómo se juega?")}</button>
    <p class="legal-links"><a href="terminos.html" target="_blank" rel="noopener">${t("Términos")}</a> · <a href="privacidad.html" target="_blank" rel="noopener">${t("Privacidad")}</a> · <button type="button" class="btn-link inline" data-abrir-cookies>🍪 ${t("Cookies")}</button></p>
  `);
  overlay.querySelector("[data-abrir-cookies]").addEventListener("click", () => abrirPreferenciasCookies());
  // Cambiar de idioma repinta la pantalla (listener global más abajo; la dificultad elegida ya está guardada).
  enlazarSelectorIdioma(overlay);
  const marcar = () => overlay.querySelectorAll(".dif-btn").forEach((b) => b.classList.toggle("activo", b.dataset.dif === dif));
  marcar();
  overlay.querySelectorAll(".dif-btn").forEach((b) => b.addEventListener("click", () => { dif = b.dataset.dif; lsSet("lunar-dificultad", dif); sonido.click(); marcar(); }));
  overlay.querySelector("#btn-como-jugar").addEventListener("click", () => { desbloquearAudio(); mostrarTutorial(() => mostrarPantallaBienvenida(onIniciarJuego)); });
  overlay.querySelector("#btn-comenzar-mision").addEventListener("click", () => {
    desbloquearAudio();
    overlay.remove();
    const arrancar = () => { if (onIniciarJuego) onIniciarJuego(dif); };
    if (lsGet("lunar-tutorial-visto", "0") === "1") arrancar();
    else mostrarTutorial(arrancar);
  });
}

// ---------- Tutorial ----------
// Títulos y textos en español (son las claves de traducción; se traducen al pintar).
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
      ${selectorIdiomaHTML()}
      <div class="tuto-icono">${s.icono}</div>
      <h2 class="titulo-medio">${t(s.titulo)}</h2>
      <p class="texto-pantalla">${t(s.texto)}</p>
      <div class="tuto-puntos">${SLIDES.map((_, k) => `<span class="${k === i ? "on" : ""}"></span>`).join("")}</div>
      <button id="btn-tuto-sig" type="button" class="btn-grande azul">${i === SLIDES.length - 1 ? t("¡Entendido!") : t("Siguiente")}</button>
      <button id="btn-tuto-saltar" type="button" class="btn-link">${t("Saltar")}</button>`;
    enlazarSelectorIdioma(cont, pintar);
    cont.querySelector("#btn-tuto-sig").addEventListener("click", () => { sonido.click(); if (i === SLIDES.length - 1) fin(); else { i++; pintar(); } });
    cont.querySelector("#btn-tuto-saltar").addEventListener("click", fin);
  };
  pintar();
}

// ---------- Pausa ----------
export function mostrarPausa(handlers) {
  const { onContinuar, onReiniciar, onMenu } = handlers;
  ultimaPausa = handlers;
  const overlay = crear("pantalla-pausa", `
    ${selectorIdiomaHTML()}
    <h1 class="titulo-grande">⏸ ${t("PAUSA")}</h1>
    <p class="texto-pantalla">${t("El tiempo está detenido. Respira, comandante.")}</p>
    <button id="btn-continuar" type="button" class="btn-grande verde">▶ ${t("Continuar")}</button>
    <button id="btn-pausa-reiniciar" type="button" class="btn-grande azul">🔄 ${t("Reiniciar partida")}</button>
    <button id="btn-pausa-menu" type="button" class="btn-link">${t("Menú principal")}</button>
    <p class="legal-links"><a href="terminos.html" target="_blank" rel="noopener">${t("Términos")}</a> · <a href="privacidad.html" target="_blank" rel="noopener">${t("Privacidad")}</a> · <button type="button" class="btn-link inline" data-abrir-cookies>🍪 ${t("Cookies")}</button></p>
  `);
  overlay.querySelector("[data-abrir-cookies]").addEventListener("click", () => abrirPreferenciasCookies());
  enlazarSelectorIdioma(overlay);
  overlay.querySelector("#btn-continuar").addEventListener("click", () => { overlay.remove(); onContinuar(); });
  overlay.querySelector("#btn-pausa-reiniciar").addEventListener("click", () => { overlay.remove(); onReiniciar(); });
  overlay.querySelector("#btn-pausa-menu").addEventListener("click", () => { overlay.remove(); onMenu(); });
  return overlay;
}

export function cerrarPausa() {
  document.getElementById("pantalla-pausa")?.remove();
}

// Al cambiar de idioma (desde cualquier selector, incluido el de cookies) se repinta la pantalla que esté abierta.
// El tutorial se repinta solo; mientras está abierto no se toca la bienvenida de abajo (taparía al tutorial).
window.addEventListener("idioma-cambio", () => {
  if (document.getElementById("pantalla-tutorial")) return;
  if (document.getElementById("pantalla-bienvenida") && ultimaBienvenida) mostrarPantallaBienvenida(ultimaBienvenida);
  if (document.getElementById("pantalla-pausa") && ultimaPausa) mostrarPausa(ultimaPausa);
});

// ---------- Resumen de día + elección de mejora ----------
export function mostrarResumenDia({ cierre, diaSiguiente, infoSiguiente, opciones }, onElegir) {
  const cartas = opciones.map((id) => {
    const m = MEJORAS[id];
    return `<button type="button" class="mejora-card" data-id="${id}"><span class="mejora-ico">${m.icono}</span><b>${esc(t(m.nombre))}</b><small>${esc(t(m.desc))}</small></button>`;
  }).join("");
  const overlay = crear("pantalla-resumen", `
    <h1 class="titulo-medio">${t("DÍA {dia} COMPLETADO", { dia: cierre.dia })}</h1>
    <div class="estrellas-grandes" aria-label="${t("{n} de 3 estrellas", { n: cierre.estrellas })}">${estrellas(cierre.estrellas)}</div>
    <ul class="resumen-lista">
      <li>🔧 ${t("Reparaciones:")} <b>${cierre.reparaciones}</b></li>
      <li>📉 ${t("Peor recurso del día:")} <b>${cierre.minRecurso}%</b></li>
      <li>🔋 ${t("Batería al cierre:")} <b>${cierre.electricidad}%</b>${cierre.apagon ? " · ⚠ " + t("hubo apagón") : ""}</li>
      <li>🏆 ${t("Puntos:")} <b>${cierre.puntosTotal}</b></li>
    </ul>
    <div class="pronostico">🌅 <b>${t("Día {dia}:", { dia: diaSiguiente })} ${esc(t(infoSiguiente.titulo))}</b><br>${esc(t(infoSiguiente.pronostico))}</div>
    ${opciones.length ? `<p class="texto-chico">${t("Elige una mejora para mañana:")}</p><div class="mejoras-grid">${cartas}</div>`
      : `<button id="btn-resumen-continuar" type="button" class="btn-grande verde">${t("Continuar")}</button>`}
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
    ? `<div class="logros-fin">${resumen.logros.map((l) => `<span class="logro-chip" title="${esc(t(l.desc))}">${l.icono} ${esc(t(l.nombre))}</span>`).join("")}</div>` : "";
  const stats = resumen ? `
    <ul class="resumen-lista">
      <li>🏆 ${t("Puntuación:")} <b>${resumen.puntos}</b>${resumen.nuevoRecord ? " · " + t("¡Nuevo récord!") : ""}</li>
      <li>⭐ ${t("Estrellas:")} <b>${resumen.estrellas}</b> · 🔧 ${t("Reparaciones:")} <b>${resumen.reparaciones}</b></li>
      <li>🥇 ${t("Mejor puntuación:")} <b>${resumen.mejor}</b></li>
    </ul>${logros}` : "";
  const overlay = crear("pantalla-fin", `
    <h1 class="titulo-grande ${victoria ? "ok" : "mal"}">${victoria ? "🎉 " + t("¡MISIÓN EXITOSA!") : "💥 " + t("¡BASE COLAPSADA!")}</h1>
    <p class="texto-pantalla">${victoria ? t("Has sobrevivido los 5 días en la base lunar con éxito.") : esc(t(motivo || "Los recursos críticos llegaron a cero o la energía falló."))}</p>
    ${stats}
    <button id="btn-reiniciar" type="button" class="btn-grande azul">🔄 ${t("JUGAR OTRA VEZ")}</button>
    ${onMenu ? `<button id="btn-fin-menu" type="button" class="btn-link">${t("Cambiar dificultad")}</button>` : ""}
  `);
  overlay.querySelector("#btn-reiniciar").addEventListener("click", () => { overlay.remove(); if (onReiniciar) onReiniciar(); });
  overlay.querySelector("#btn-fin-menu")?.addEventListener("click", () => { overlay.remove(); onMenu(); });
}
