// PROVISIONAL (P1): P2 lo reemplaza con la cabina real.
// `hora` llega como "XX:XX" (en la prórroga llega como cuenta regresiva "00:09").
export function actualizarCockpit(estado, hora) {
  const el = document.getElementById("debug-cockpit");
  if (!el) return;
  const f = (n) => Math.round(n * 10) / 10;
  el.textContent =
    `Reloj: ${hora}\n` +
    `Electricidad: ${f(estado.electricidad)}%\n` +
    `Comida: ${f(estado.comida)} | Agua: ${f(estado.agua)} | Oxígeno: ${f(estado.oxigeno)} | Radiación: ${f(estado.radiacion)}\n` +
    `Interruptores: ${JSON.stringify(estado.interruptores)}\n` +
    `Fallos activos: ${estado.fallos.join(", ") || "ninguno"}`;
}

//código cabina
const historial = {
  agua: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
  comida: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
  oxigeno: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
  radiacion: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

const COLORES_SECTOR = {
  agua: '#29b6f6',
  comida: '#66bb6a',
  oxigeno: '#26c6da',
  radiacion: '#ffa726',
};

export function actualizarCockpit(estado, hora = '06:00', dia = 1) {
  document.getElementById('reloj-hora').textContent = hora;
  document.getElementById('reloj-dia').textContent = `DÍA ${dia}`;

  const energia = Math.max(0, Math.min(100, Math.round(estado.electricidad)));
  document.getElementById('energia-porcentaje').textContent = `${energia}%`;
  document.getElementById('energia-barra').style.height = `${energia}%`;

  ['agua', 'comida', 'oxigeno', 'radiacion'].forEach((sector) => {
    const valor = Math.max(0, Math.min(100, Math.round(estado[sector])));
    document.getElementById(`val-${sector}`).textContent = `${valor}%`;

    const tarjeta = document.querySelector(`.sector-unit[data-sector="${sector}"]`);
    if (estado.fallos && estado.fallos.includes(sector)) {
      tarjeta.classList.add('en-fallo');
    } else {
      tarjeta.classList.remove('en-fallo');
    }

    historial[sector].push(valor);
    if (historial[sector].length > 14) historial[sector].shift();
    dibujarGrafica(`chart-${sector}`, historial[sector], COLORES_SECTOR[sector]);
  });
}

function dibujarGrafica(canvasId, datos, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  [0.25, 0.5, 0.75].forEach((p) => {
    ctx.beginPath();
    ctx.moveTo(0, h * p);
    ctx.lineTo(w, h * p);
    ctx.stroke();
  });

  const pasoX = w / (datos.length - 1);
  ctx.beginPath();
  datos.forEach((val, i) => {
    const x = i * pasoX;
    const y = h - (val / 100) * (h - 12) - 6;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = color;
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = `${color}33`;
  ctx.fill();
}