// Monitor central de eventos: alertas previas, elecciones, eventos activos y estado nominal.
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cont = () => document.getElementById("monitor-contenido");

let eventos = [];      // [{evento, pendientes:[sector...], extra}]
let avisos = [];       // [{evento, segundos}]
let eleccion = null;   // {evento, segundos, costo, puedeParche, cb}
let critica = null;    // segundos de la prórroga de las 20:00

const NOMBRE_SECTOR = { agua: "AGUA", comida: "COMIDA", oxigeno: "OXÍGENO", radiacion: "RADIACIÓN" };

const NOMINAL = `
  <div class="estado-nominal">
    <div class="nominal-icon">🚀</div>
    <h2>TODOS LOS SISTEMAS ESTABLES</h2>
    <p>La base lunar funciona con normalidad. ¡Vigila tus recursos!</p>
  </div>`;

function chips(ev, pendientes) {
  return ev.sectores.map((s) => {
    const ok = pendientes && !pendientes.includes(s);
    return `<span class="chip-sector ${ok ? "ok" : "mal"}">${ok ? "✓" : "⚠"} ${NOMBRE_SECTOR[s] || esc(s)}</span>`;
  }).join(" ");
}

function render() {
  const el = cont();
  if (!el) return;
  const partes = [];

  if (critica !== null) {
    partes.push(`<div class="monitor-card critica">🚨 ¡FALLOS PENDIENTES! No se puede descansar. Tiempo extra: <b>${critica} s</b></div>`);
  }

  if (eleccion) {
    const e = eleccion;
    partes.push(`
      <div class="monitor-card eleccion">
        <div class="mc-titulo">🤔 ${esc(e.evento.nombre)}</div>
        <div class="mc-texto">${esc(e.evento.aviso)} ¿Cómo respondes? <b>(${e.segundos} s)</b></div>
        <div class="mc-botones">
          <button type="button" class="btn-eleccion parche" data-op="parche" ${e.puedeParche ? "" : "disabled"}>
            🩹 Parche rápido<small>−${e.costo}% energía · evita la falla</small>
          </button>
          <button type="button" class="btn-eleccion completa" data-op="completa">
            🔧 Reparación a fondo<small>La falla ocurre · repararla da +${e.bonus} extra</small>
          </button>
        </div>
      </div>`);
  }

  avisos.forEach((a) => {
    partes.push(`
      <div class="monitor-card aviso">
        <div class="mc-titulo">⚠️ ALERTA: ${esc(a.evento.aviso)}</div>
        <div class="mc-texto">Posible falla en ${a.evento.sectores.map((s) => NOMBRE_SECTOR[s] || esc(s)).join(" · ")} en <b>${a.segundos} s</b>. ¡Prepárate!</div>
      </div>`);
  });

  eventos.forEach((it) => {
    partes.push(`
      <div class="evento-alerta">
        <div class="evento-titulo">⚠️ ${esc(it.evento.nombre)}</div>
        <div class="evento-causa">${esc(it.evento.causa)}${it.extra ? `<div class="evento-extra">🛰️ ${esc(it.extra)}</div>` : ""}</div>
        <div class="evento-sectores">SECTORES: ${chips(it.evento, it.pendientes)}</div>
      </div>`);
  });

  el.innerHTML = partes.length ? partes.join("") : NOMINAL;

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
