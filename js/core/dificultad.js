// Perfil de dificultad (Fácil / Normal / Difícil) y nivel adaptativo de cada minijuego.
export const PERFILES = {
  // Pensado para niñas y niños de 7 a 12 años: "Normal" es tranquilo; "Difícil" es el reto.
  facil:   { id: "facil",   nombre: "Fácil",   segundosPorHora: 12, prob: 0.6, fallo: 3.5, consumo: 0.7,  avisoS: 10, nivelInicial: 0, nivelMax: 1 },
  normal:  { id: "normal",  nombre: "Normal",  segundosPorHora: 10, prob: 0.8, fallo: 5,   consumo: 0.85, avisoS: 8,  nivelInicial: 0, nivelMax: 2 },
  dificil: { id: "dificil", nombre: "Difícil", segundosPorHora: 8,  prob: 1,   fallo: 7,   consumo: 1,    avisoS: 6,  nivelInicial: 1, nivelMax: 2 },
};

let perfilId = "normal";
export function setPerfil(id) { perfilId = PERFILES[id] ? id : "normal"; }
export function perfil() { return PERFILES[perfilId]; }

// Nivel adaptativo por sector: 0 = fácil, 1 = normal, 2 = difícil.
const niveles = { agua: 1, comida: 1, oxigeno: 1, radiacion: 1 };
// Si ganas en menos de este tiempo (s) el siguiente minijuego sube de nivel.
const RAPIDO_S = { agua: 35, comida: 22, oxigeno: 45, radiacion: 38 };

export function reiniciarNiveles() {
  const p = perfil();
  Object.keys(niveles).forEach((s) => { niveles[s] = p.nivelInicial; });
}

export function nivelDe(sector) {
  return Math.max(0, Math.min(perfil().nivelMax, niveles[sector] ?? 1));
}

export function registrarResultado(sector, exito, segundos) {
  if (!(sector in niveles)) return;
  const p = perfil();
  const lento = RAPIDO_S[sector] * 2.2;
  if (exito && segundos <= RAPIDO_S[sector]) niveles[sector] = Math.min(p.nivelMax, niveles[sector] + 1);
  else if (!exito || segundos >= lento) niveles[sector] = Math.max(0, niveles[sector] - 1);
}
