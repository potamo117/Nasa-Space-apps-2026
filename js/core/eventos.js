// PROVISIONAL (P1): mínimo para que el core corra. P5 lo reemplaza con los 9 eventos del documento.
export const EVENTOS = [
  { id: 1, nombre: "Plaga de Esporas en el Invernadero",
    causa: "Un desbalance de humedad provoca hongos que consumen los nutrientes.",
    sectores: ["comida"], minijuegos: ["comida"] },
  { id: 2, nombre: "Rotura de Sello en el Tanque de Condensación",
    causa: "Las vibraciones desajustan las uniones de las tuberías secundarias.",
    sectores: ["agua"], minijuegos: ["agua"] },
  { id: 9, nombre: "Tormenta Solar Masiva (CME)",
    causa: "Una eyección de masa coronal extrema sobrecalienta sensores y genera cortocircuitos.",
    sectores: ["radiacion", "oxigeno", "comida"], minijuegos: ["radiacion", "oxigeno", "comida"] },
];

export function eventoAleatorio(dia) {
  return EVENTOS[Math.floor(Math.random() * EVENTOS.length)];
}
