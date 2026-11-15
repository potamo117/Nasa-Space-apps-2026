//cabina
import { emitir } from "../core/bus.js";
import { sonido } from "./audio.js";

export function inicializarInterruptores(estado) {
  const botones = document.querySelectorAll('[data-toggle-sector]');

  botones.forEach((btn) => {
    btn.addEventListener('click', () => {
      const sector = btn.dataset.toggleSector;
      estado.interruptores[sector] = !estado.interruptores[sector];
      const encendido = estado.interruptores[sector];

      btn.classList.toggle('active', encendido);
      const textoEstado = document.getElementById(`st-${sector}`);
      textoEstado.textContent = encendido ? 'CONECTADO' : 'APAGADO';
      textoEstado.classList.toggle('off', !encendido);
      sonido.click();
      emitir('estado-cambio', {}); // refresca costos y prioridades al instante
    });
  });
}