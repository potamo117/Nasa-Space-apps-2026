// Perfil de dificultad (Fácil / Normal / Difícil) y nivel adaptativo de cada minijuego.
export const PERFILES = {
  facil:   { id: "facil",   nombre: "Fácil",   segundosPorHora: 10,  prob: 0.75, fallo: 6,  consumo: 0.85, avisoS: 8, nivelInicial: 0, nivelMax: 1 },
  normal:  { id: "normal",  nombre: "Normal",  segundosPorHora: 8,   prob: 1,    fallo: 8,  consumo: 1,    avisoS: 6, nivelInicial: 1, nivelMax: 2 },
  dificil: { id: "dificil", nombre: "Difícil", segundosPorHora: 6.5, prob: 1.25, fallo: 10, consumo: 1.1,  avisoS: 4, nivelInicial: 2, nivelMax: 2 },
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
