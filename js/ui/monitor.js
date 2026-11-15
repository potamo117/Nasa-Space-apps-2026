import { t } from "../core/i18n.js";
// Monitor central de eventos: alertas previas, elecciones, eventos activos y estado nominal.
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cont = () => document.getElementById("monitor-contenido");

let eventos = [];      // [{evento, pendientes:[sector...], extra}]
let avisos = [];       // [{evento, segundos}]
let eleccion = null;   // {evento, segundos, costo, puedeParche, cb}
let critica = null;    // segundos de la prórroga de las 20:00

const NOMBRE_SECTOR_ES = { agua: "AGUA", comida: "COMIDA", oxigeno: "OXÍGENO", radiacion: "RADIACIÓN" };
const nombreSector = (s) => (NOMBRE_SECTOR_ES[s] ? t(NOMBRE_SECTOR_ES[s]) : esc(s));

const nominal = () => `
  <div class="estado-nominal">
    <div class="nominal-icon">🚀</div>
    <h2>${t("TODOS LOS SISTEMAS ESTABLES")}</h2>
    <p>${t("La base lunar funciona con normalidad. ¡Vigila tus recursos!")}</p>
  </div>`;

function chips(ev, pendientes) {
  return ev.sectores.map((s) => {
    const ok = pendientes && !pendientes.includes(s);
    return `<span class="chip-sector ${ok ? "ok" : "mal"}">${ok ? "✓" : "⚠"} ${nombreSector(s)}</span>`;
  }).join(" ");
}

// `extra` puede ser texto o una función (así el texto de NASA DONKI se traduce al cambiar de idioma).
const extraDe = (it) => (typeof it.extra === "function" ? it.extra() : it.extra);

export function renderizar() { render(); }

function render() {
  const el = cont();
  if (!el) return;
  const partes = [];

  if (critica !== null) {
    partes.push(`<div class="monitor-card critica">🚨 ${t("¡FALLOS PENDIENTES! No se puede descansar. Tiempo extra:")} <b>${critica} s</b></div>`);
  }

  if (eleccion) {
    const e = eleccion;
    partes.push(`
      <div class="monitor-card eleccion">
        <div class="mc-titulo">🤔 ${esc(t(e.evento.nombre))}</div>
        <div class="mc-texto">${esc(t(e.evento.aviso))} ${t("¿Cómo respondes?")} <b>(${e.segundos} s)</b></div>
        <div class="mc-botones">
          <button type="button" class="btn-eleccion parche" data-op="parche" ${e.puedeParche ? "" : "disabled"}>
            🩹 ${t("Parche rápido")}<small>${t("−{costo}% energía · evita la falla", { costo: e.costo })}</small>
          </button>
          <button type="button" class="btn-eleccion completa" data-op="completa">
            🔧 ${t("Reparación a fondo")}<small>${t("La falla ocurre · repararla da +{bonus} extra", { bonus: e.bonus })}</small>
          </button>
        </div>
      </div>`);
  }

  avisos.forEach((a) => {
    partes.push(`
      <div class="monitor-card aviso">
        <div class="mc-titulo">⚠️ ${t("ALERTA:")} ${esc(t(a.evento.aviso))}</div>
        <div class="mc-texto">${t("Posible falla en")} ${a.evento.sectores.map((s) => nombreSector(s)).join(" · ")} ${t("en")} <b>${a.segundos} s</b>. ${t("¡Prepárate!")}</div>
      </div>`);
  });

  eventos.forEach((it) => {
    partes.push(`
      <div class="evento-alerta">
        <div class="evento-titulo">⚠️ ${esc(t(it.evento.nombre))}</div>
        <div class="evento-causa">${esc(t(it.evento.causa))}${extraDe(it) ? `<div class="evento-extra">🛰️ ${esc(extraDe(it))}</div>` : ""}</div>
        <div class="evento-sectores">${t("SECTORES:")} ${chips(it.evento, it.pendientes)}</div>
      </div>`);
  });

  el.innerHTML = partes.length ? partes.join("") : nominal();

  const botones = el.querySelectorAll(".btn-eleccion");
  botones.forEach((b) => {
    b.addEventListener("click", () => { if (eleccion) eleccion.cb(b.dataset.op); });
  });
}

// ----- API -----
export function mostrarNominal() {
  eventos = []; avisos = []; eleccion = null; critica = null;
  render();
}

// Compatibilidad: muestra un solo evento con todos sus sectores pendientes.
export function mostrarEvento(evento, pendientes = evento.sectores, extra = "") {
  eventos = [{ evento, pendientes: [...pendientes], extra }];
  render();
}

export function setEventos(lista) {
  eventos = lista.map((it) => ({ evento: it.evento, pendientes: [...it.pendientes], extra: it.extra || "" }));
  render();
}

export function mostrarAdvertencia(evento, segundos) {
  avisos.push({ evento, segundos });
  render();
}
export function actualizarAdvertencia(evento, segundos) {
  const a = avisos.find((x) => x.evento === evento);
  if (a) { a.segundos = segundos; render(); }
}
export function quitarAdvertencia(evento) {
  const i = avisos.findIndex((x) => x.evento === evento);
  if (i !== -1) { avisos.splice(i, 1); render(); }
}

export function mostrarEleccion(evento, segundos, opciones, cb) {
  eleccion = { evento, segundos, costo: opciones.costo, bonus: opciones.bonus, puedeParche: opciones.puedeParche, cb };
  render();
}
export function actualizarEleccion(segundos, puedeParche) {
  if (!eleccion) return;
  eleccion.segundos = segundos;
  if (typeof puedeParche === "boolean") eleccion.puedeParche = puedeParche;
  render();
}
export function quitarEleccion() {
  eleccion = null;
  render();
}

// Prórroga de las 20:00 con fallos pendientes.
export function mostrarAlertaCritica(segundos) {
  critica = segundos;
  render();
}
export function quitarAlertaCritica() {
  if (critica === null) return;
  critica = null;
  render();
}

// Quita avisos y elecciones pendientes (fin de día, prórroga, reinicio).
export function limpiarPreparacion() {
  avisos = [];
  eleccion = null;
  render();
}
