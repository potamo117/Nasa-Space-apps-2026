// Matriz de los 9 eventos aleatorios (datos, no lógica). Ningún evento toca la electricidad.
// fuerza: 1 leve, 2 moderado, 3 severo.  aviso: texto de la alerta previa.
// eleccion: el jugador decide entre un parche rápido (cuesta energía) o aceptar la falla para repararla a fondo.
export const EVENTOS = [
  { id: 1, nombre: "Plaga de Esporas en el Invernadero",
    causa: "Un desbalance de humedad provoca hongos que consumen los nutrientes.",
    aviso: "Humedad anormal detectada en el invernadero.",
    sectores: ["comida"], minijuegos: ["comida"], fuerza: 1 },
  { id: 2, nombre: "Rotura de Sello en el Tanque de Condensación",
    causa: "Las vibraciones desajustan las uniones de las tuberías secundarias.",
    aviso: "Vibraciones fuertes en las tuberías.",
    sectores: ["agua"], minijuegos: ["agua"], fuerza: 1, eleccion: true },
  { id: 3, nombre: "Fuga en el Generador de Oxígeno",
    causa: "El polvo lunar abrasivo desgasta las juntas del electrolizador y escapa oxígeno.",
    aviso: "Polvo lunar en las juntas del electrolizador.",
    sectores: ["oxigeno"], minijuegos: ["oxigeno"], fuerza: 1 },
  { id: 4, nombre: "Fulguración Solar Moderada",
    causa: "Una fulguración libera radiación X y partículas energéticas que debilitan el escudo.",
    aviso: "El Sol muestra actividad intensa.",
    sectores: ["radiacion"], minijuegos: ["radiacion"], fuerza: 2, donki: true },
  { id: 5, nombre: "Falla en las Luces LED del Cultivo",
    causa: "Un pico de temperatura desajusta el espectro rojo/azul que necesitan las plantas.",
    aviso: "Temperatura en aumento sobre el cultivo.",
    sectores: ["comida"], minijuegos: ["comida"], fuerza: 2, eleccion: true },
  { id: 6, nombre: "Contaminación del Filtro de Carbón",
    causa: "Partículas de regolito saturan el filtro y el agua reciclada pierde pureza.",
    aviso: "Presión anormal en el filtro de carbón.",
    sectores: ["agua", "comida"], minijuegos: ["agua", "comida"], fuerza: 2, eleccion: true },
  { id: 7, nombre: "Sobrecalentamiento de la Celda de Combustible",
    causa: "Las temperaturas extremas del día lunar elevan el voltaje y estresan la celda.",
    aviso: "La celda de combustible se calienta.",
    sectores: ["oxigeno", "agua"], minijuegos: ["oxigeno", "agua"], fuerza: 2, eleccion: true },
  { id: 8, nombre: "Impacto de Micrometeoroide",
    causa: "Un micrometeorito perfora el casco: se dañan tuberías y el sistema de soporte vital.",
    aviso: "¡Objeto desconocido acercándose al casco!",
    sectores: ["agua", "oxigeno", "radiacion"], minijuegos: ["agua", "oxigeno", "radiacion"], fuerza: 3 },
  { id: 9, nombre: "Tormenta Solar Masiva (CME)",
    causa: "Una eyección de masa coronal extrema sobrecalienta sensores y genera cortocircuitos.",
    aviso: "¡Eyección de masa coronal masiva en camino!",
    sectores: ["radiacion", "oxigeno", "comida"], minijuegos: ["radiacion", "oxigeno", "comida"], fuerza: 3, donki: true },
];

// Cada día tiene identidad propia: ritmo, intensidad máxima, probabilidad de eventos que se solapan
// y eventos garantizados a una hora fija.
export const DIAS = {
  1: { titulo: "Día de adaptación", prob: 0.12, maxFuerza: 1, solapa: 0,
       garantizados: [{ hora: 8, id: 1 }],
       pronostico: "Aprende los controles: una falla leve te espera por la mañana." },
  2: { titulo: "Operaciones normales", prob: 0.22, maxFuerza: 2, solapa: 0.05, garantizados: [],
       pronostico: "Fallas moderadas. Algunas te dejarán elegir cómo responder." },
  3: { titulo: "Primera tormenta solar", prob: 0.26, maxFuerza: 2, solapa: 0.1,
       garantizados: [{ hora: 13, id: 4 }],
       pronostico: "Se espera una fulguración solar a media tarde. ¡Protege los escudos!" },
  4: { titulo: "Impactos en cadena", prob: 0.3, maxFuerza: 3, solapa: 0.15,
       garantizados: [{ hora: 11, id: 8 }],
       pronostico: "Riesgo de micrometeoroides: varias fallas pueden llegar a la vez." },
  5: { titulo: "El gran día: tormenta masiva", prob: 0.34, maxFuerza: 3, solapa: 0.2,
       garantizados: [{ hora: 15, id: 9 }],
       pronostico: "Una eyección de masa coronal gigante se acerca. ¡Último esfuerzo!" },
};

export function infoDia(dia) {
  return DIAS[Math.max(1, Math.min(5, Number(dia) || 1))];
}

export function eventoPorId(id) {
  return EVENTOS.find((e) => e.id === id) || EVENTOS[0];
}

// Elige un evento al azar respetando la intensidad máxima del día; los fuertes pesan más al avanzar.
export function eventoAleatorio(dia = 1) {
  const d = Math.max(1, Math.min(5, Number(dia) || 1));
  const maxF = infoDia(d).maxFuerza;
  const candidatos = EVENTOS.filter((e) => e.fuerza <= maxF);
  const pesos = candidatos.map((e) => 1 + (e.fuerza - 1) * (d - 1) * 0.5);
  let r = Math.random() * pesos.reduce((a, b) => a + b, 0);
  for (let i = 0; i < candidatos.length; i++) {
    r -= pesos[i];
    if (r <= 0) return candidatos[i];
  }
  return candidatos[candidatos.length - 1];
}
