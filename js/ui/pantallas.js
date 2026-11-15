//cabina
/**
 * Módulos adicionales para pantallas de inicio, victoria y derrota (Parte 5 de la guía P2)
 */
export function mostrarPantallaBienvenida(onIniciarJuego) {
  const overlay = document.createElement('div');
  overlay.id = 'pantalla-bienvenida';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(7, 11, 25, 0.92); z-index: 200;
    display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px;
  `;
  overlay.innerHTML = `
    <h1 style="font-size: 2.8rem; color: #80d8ff; margin-bottom: 12px; font-family: 'Orbitron', sans-serif;">SUPERVIVENCIA LUNAR</h1>
    <p style="font-size: 1.2rem; color: #cfd8dc; max-width: 600px; margin-bottom: 24px;">
      ¡Bienvenido Comandante! Gestiona la energía con los interruptores inferiores y mantén los sistemas estables hasta completar el Día 5.
    </p>
    <button id="btn-comenzar-mision" style="padding: 16px 36px; font-size: 1.3rem; font-weight: 700; background: #00e676; border: none; border-radius: 16px; cursor: pointer; color: #070b19; box-shadow: 0 6px 0 #00793c;">
      🚀 INICIAR MISIÓN
    </button>
  `;
  document.body.appendChild(overlay);

  document.getElementById('btn-comenzar-mision').onclick = () => {
    overlay.remove();
    if (onIniciarJuego) onIniciarJuego();
  };
}

export function mostrarPantallaFin(victoria, onReiniciar) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(7, 11, 25, 0.95); z-index: 200;
    display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px;
  `;
  overlay.innerHTML = `
    <h1 style="font-size: 3rem; color: ${victoria ? '#00e676' : '#ff5252'}; margin-bottom: 12px; font-family: 'Orbitron', sans-serif;">
      ${victoria ? '🎉 ¡MISIÓN EXITOSA!' : '💥 ¡BASE COLAPSADA!'}
    </h1>
    <p style="font-size: 1.2rem; color: #cfd8dc; max-width: 500px; margin-bottom: 24px;">
      ${victoria ? 'Has sobrevivido los 5 días en la base lunar con éxito.' : 'Los recursos críticos llegaron a cero o la energía falló.'}
    </p>
    <button id="btn-reiniciar" style="padding: 14px 32px; font-size: 1.2rem; font-weight: 700; background: #29b6f6; border: none; border-radius: 16px; cursor: pointer; color: #070b19;">
      🔄 JUGAR OTRA VEZ
    </button>
  `;
  document.body.appendChild(overlay);

  document.getElementById('btn-reiniciar').onclick = () => {
    overlay.remove();
    if (onReiniciar) onReiniciar();
  };
}