export const SECTORES = ["comida", "agua", "oxigeno", "radiacion"];

// Mejoras que el jugador elige entre días (multiplicadores y bonos).
const MEJORAS_INICIALES = () => ({ consumo: 1, recuperacion: 0, fallo: 1, solar: 0, radiacion: 1 });

export const estado = {
  comida: 100, agua: 100, oxigeno: 100, radiacion: 0,
  electricidad: 100,
  interruptores: { comida: true, agua: true, oxigeno: true, radiacion: true },
  fallos: [],            // sectores con un evento activo, ej. ["agua", "comida"]
  bonusReparacion: [],   // sectores cuya falla se aceptó como "reparación a fondo" (+recuperación extra)
  mejoras: MEJORAS_INICIALES(),
};

// Deja el estado como al inicio de la partida (mismas referencias de objeto).
export function reiniciarEstado() {
  estado.comida = 100;
  estado.agua = 100;
  estado.oxigeno = 100;
  estado.radiacion = 0;
  estado.electricidad = 100;
  SECTORES.forEach((s) => { estado.interruptores[s] = true; });
  estado.fallos.length = 0;
  estado.bonusReparacion.length = 0;
  estado.mejoras = MEJORAS_INICIALES();
}
