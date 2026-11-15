export const SECTORES = ["comida", "agua", "oxigeno", "radiacion"];

export const estado = {
  comida: 100, agua: 100, oxigeno: 100, radiacion: 0,
  electricidad: 100,
  interruptores: { comida: true, agua: true, oxigeno: true, radiacion: true },
  fallos: [] // sectores con un evento activo, ej. ["agua", "comida"]
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
}
