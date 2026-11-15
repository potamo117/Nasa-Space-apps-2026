// PROVISIONAL (P1): P2 lo reemplaza. Recuerda: al terminar un minijuego hay que avisar al core con
//   import { emitir } from "../core/bus.js";
//   emitir("minijuego-terminado", { sector, exito });
export function abrirModal(sector) {
  console.log("[modal] abrirModal:", sector);
}


//cabina
const modal = document.getElementById('modal-minijuego');
const tituloModal = document.getElementById('modal-titulo');
const contenedorJuego = document.getElementById('modal-contenedor-juego');
const btnCerrar = document.getElementById('btn-cerrar-modal');

btnCerrar.addEventListener('click', cerrarModal);

export function cerrarModal() {
  modal.classList.add('hidden');
  contenedorJuego.innerHTML = '';
}

export function abrirModal(sector, minijuegosRegistro, onResultado) {
  tituloModal.textContent = `MÓDULO DE ${sector.toUpperCase()}`;
  contenedorJuego.innerHTML = '<p>Cargando sistema...</p>';
  modal.classList.remove('hidden');

  if (minijuegosRegistro && minijuegosRegistro[sector]) {
    minijuegosRegistro[sector]().then((modulo) => {
      contenedorJuego.innerHTML = '';
      modulo.iniciar(contenedorJuego, (resultado) => {
        if (resultado.exito) cerrarModal();
        if (onResultado) onResultado(sector, resultado);
      });
    });
  } else {
    contenedorJuego.innerHTML = `
      <div style="text-align:center;">
        <p style="font-size:1.2rem; margin-bottom:16px;">Aquí se cargará el minijuego de <b>${sector.toUpperCase()}</b>.</p>
        <button id="btn-demo-win" style="padding:12px 24px; border-radius:12px; border:none; background:#00e676; font-weight:700; cursor:pointer;">
          ✅ Simular Reparación Exitosa
        </button>
      </div>
    `;
    document.getElementById('btn-demo-win').onclick = () => {
      cerrarModal();
      if (onResultado) onResultado(sector, { exito: true });
    };
  }
}