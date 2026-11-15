// Monitor central de eventos. Versión funcional de P1 sobre el HTML de P2 (#monitor-contenido).
// P5 puede mejorarla, manteniendo mostrarEvento y mostrarNominal.
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cont = () => document.getElementById("monitor-contenido");

export function mostrarEvento(evento) {
  const el = cont();
  if (!el) { console.log("[monitor] EVENTO:", evento.nombre); return; }
  el.innerHTML = `
    <div class="evento-alerta">
      <div class="evento-titulo">⚠️ ${esc(evento.nombre)}</div>
      <div class="evento-causa">${esc(evento.causa)}</div>
      <div class="evento-sectores">SECTORES AFECTADOS: ${evento.sectores.map((s) => esc(s.toUpperCase())).join(" · ")}</div>
    </div>`;
}

export function mostrarNominal() {
  const el = cont();
  if (!el) { console.log("[monitor] Todos los sistemas estables"); return; }
  el.innerHTML = `
    <div class="estado-nominal">
      <div class="nominal-icon">🚀</div>
      <h2>TODOS LOS SISTEMAS ESTABLES</h2>
      <p>La base lunar funciona con normalidad. ¡Vigila tus recursos!</p>
    </div>`;
}

// Opcional: lo llama main.js a las 20:00 si quedan fallos.
export function mostrarAlertaCritica(segundos) {
  const el = cont();
  if (!el) return;
  el.innerHTML = `
    <div class="evento-alerta">
      <div class="evento-titulo">🚨 ¡FALLOS CRÍTICOS PENDIENTES!</div>
      <div class="evento-causa">Imposible iniciar el descanso nocturno. Repara los sectores antes de que termine el tiempo extra.</div>
      <div class="evento-sectores">TIEMPO EXTRA: ${segundos} s</div>
    </div>`;
}
