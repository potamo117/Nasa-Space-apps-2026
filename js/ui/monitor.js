// PROVISIONAL (P1): P5 lo reemplaza con el monitor central real.
export function mostrarEvento(evento) {
  console.log("[monitor] EVENTO:", evento.nombre, "|", evento.causa, "| sectores:", evento.sectores.join(", "));
}
export function mostrarNominal() {
  console.log("[monitor] Todos los sistemas estables");
}
