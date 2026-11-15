// Modal de minijuegos (P2). Carga el minijuego del sector y avisa al core al terminar.
import { MINIJUEGOS } from "../minijuegos/index.js";
import { emitir } from "../core/bus.js";

const $ = (id) => document.getElementById(id);
let cerrarEnlazado = false;

function enlazarCierre() {
  if (cerrarEnlazado) return;
  const btn = $("btn-cerrar-modal");
  if (btn) { btn.addEventListener("click", cerrarModal); cerrarEnlazado = true; }
}

export function cerrarModal() {
  const modal = $("modal-minijuego");
  if (modal) modal.classList.add("hidden");
  const cont = $("modal-contenedor-juego");
  if (cont) cont.innerHTML = "";
}

export function abrirModal(sector) {
  const modal = $("modal-minijuego");
  const cont = $("modal-contenedor-juego");
  if (!modal || !cont) { console.warn("[modal] falta el HTML del modal"); return; }
  enlazarCierre();

  $("modal-titulo").textContent = `MÓDULO DE ${sector.toUpperCase()}`;
  cont.innerHTML = "<p>Cargando sistema...</p>";
  modal.classList.remove("hidden");

  // Contrato: el minijuego llama onTerminar({exito}) y aquí se avisa al core.
  const alTerminar = (resultado) => {
    const exito = !!(resultado && resultado.exito);
    if (exito) cerrarModal();
    emitir("minijuego-terminado", { sector, exito });
  };

  MINIJUEGOS[sector]()
    .then((modulo) => {
      if (typeof modulo.iniciar !== "function") return mostrarSimulacion(sector, cont, alTerminar);
      cont.innerHTML = "";
      modulo.iniciar(cont, alTerminar);
    })
    .catch((err) => {
      console.warn(`[modal] no se pudo cargar el minijuego de ${sector}:`, err);
      mostrarSimulacion(sector, cont, alTerminar);
    });
}

// Respaldo mientras un minijuego aún no exporta iniciar(contenedor, onTerminar).
function mostrarSimulacion(sector, cont, alTerminar) {
  cont.innerHTML = `
    <div style="text-align:center;">
      <p style="font-size:1.2rem; margin-bottom:16px;">El minijuego de <b>${sector.toUpperCase()}</b> aún no está conectado.</p>
      <button id="btn-demo-win" style="padding:12px 24px; border-radius:12px; border:none; background:#00e676; font-weight:700; cursor:pointer;">
        ✅ Simular Reparación Exitosa
      </button>
    </div>`;
  $("btn-demo-win").onclick = () => alTerminar({ exito: true });
}
