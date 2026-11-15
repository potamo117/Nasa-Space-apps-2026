import { imagenIcono } from "../ui/iconos.js";
const IMG_FRESA = imagenIcono("🍓");
const IMG_TOMATE = imagenIcono("🍅");
import { nivelDe } from "../core/dificultad.js";
export function iniciar(contenedor, onTerminar) {
  let destruido = false;
  let victoryTimerId = null;
  const INCREMENTO_NIVEL = [1.9, 1.6, 1.3][nivelDe("comida")]; // dificultad adaptativa
  // Cargar CSS automáticamente si se abre desde el index.html principal
  if (!document.querySelector('link[href*="comida.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL("../../css/comida.css", import.meta.url).href;
    document.head.appendChild(link);
  }

  // Metas aleatorias entre 2 y 9 para Luz Roja y Luz Azul en cada apertura
  const targetRed = Math.floor(Math.random() * 8) + 2;
  const targetBlue = Math.floor(Math.random() * 8) + 2;
  const initialRed = targetRed <= 5 ? 9 : 2;
  const initialBlue = targetBlue <= 5 ? 9 : 2;

  // Inyectar interfaz dentro del contenedor del modal
  contenedor.innerHTML = `
    <div class="cm-wrapper">
      <main data-el="chassis" class="cm-chassis-panel">
        <span class="cm-screw cm-screw-tl"></span>
        <span class="cm-screw cm-screw-tr"></span>
        <span class="cm-screw cm-screw-bl"></span>
        <span class="cm-screw cm-screw-br"></span>

        <canvas data-el="confettiCanvas" class="cm-confetti-canvas"></canvas>

        <!-- 1. BARRA SUPERIOR -->
        <header class="cm-chassis-subpanel cm-header">
          <div class="cm-header-left">
            <div class="cm-logo-box">🌱</div>
            <div>
              <div class="cm-title-row">
                <h1 class="cm-font-orbitron cm-main-title">
                  BASE LUNAR ARTEMIS · INVERNADERO HIDROPÓNICO
                </h1>
                <div class="cm-leds">
                  <span class="cm-led cm-led-green"></span>
                  <span class="cm-led cm-led-sky"></span>
                  <span class="cm-led cm-led-amber"></span>
                </div>
              </div>
              <span class="cm-badge-module">🥗 MÓDULO DE PRODUCCIÓN DE COMIDA (ESPECTRO LED)</span>
            </div>
          </div>

          <button type="button" data-el="btnAudio" class="cm-juicy-btn cm-btn-audio">
            <span data-el="audioIcon">🔊</span>
            <span>Sonido</span>
          </button>
        </header>

        <!-- 2. GUÍA DEL ROBOT ARTY -->
        <section class="cm-crt-screen cm-arty-banner">
          <div class="cm-arty-left">
            <div class="cm-arty-avatar">
              <svg viewBox="0 0 100 100">
                <line x1="50" y1="18" x2="50" y2="7" stroke="#4ade80" stroke-width="5" stroke-linecap="round"/>
                <circle cx="50" cy="6" r="6" fill="#fbbf24"/>
                <rect x="20" y="20" width="60" height="54" rx="16" fill="#e2e8f0" stroke="#64748b" stroke-width="3"/>
                <rect x="27" y="30" width="46" height="32" rx="10" fill="#0f172a"/>
                <circle cx="40" cy="44" r="5.5" fill="#4ade80"/>
                <circle cx="60" cy="44" r="5.5" fill="#4ade80"/>
                <path d="M 40 53 Q 50 62 60 53" stroke="#4ade80" stroke-width="4" fill="none" stroke-linecap="round"/>
              </svg>
            </div>
            <div>
              <div class="cm-font-orbitron cm-arty-tag">
                🤖 MENSAJE DE ARTY · FOTOSÍNTESIS CON LUCES LED
              </div>
              <p data-el="artyText" class="cm-arty-msg"></p>
            </div>
          </div>

          <div data-el="statusPill" class="cm-font-orbitron cm-status-pill">
            💡 CALIBRA LAS LUCES
          </div>
        </section>

        <!-- 3. ZONA PRINCIPAL DE JUEGO -->
        <section class="cm-main-grid">
          <!-- COLUMNA IZQUIERDA -->
          <div class="cm-col-left">
            <div class="cm-meters-grid">
              <div class="cm-crt-screen cm-meter-box">
                <div class="cm-font-orbitron cm-meter-label" style="color:#fcd34d;">📋 RECETA FOTOSÍNTESIS</div>
                <div class="cm-font-orbitron cm-recipe-values">
                  <span class="cm-glow-red">🔴 ${targetRed}</span>
                  <span style="color:#64748b;">|</span>
                  <span class="cm-glow-blue">🔵 ${targetBlue}</span>
                </div>
                <div class="cm-meter-sub" style="color:#6ee7b7;">¡Activa ambas luces en verde!</div>
              </div>

              <div data-el="photosynthesisCard" class="cm-crt-screen cm-meter-box is-emerald-border">
                <div class="cm-font-orbitron cm-meter-label" style="color:#6ee7b7;">🌿 FOTOSÍNTESIS</div>
                <div data-el="photosynthesisPercent" class="cm-font-orbitron cm-meter-val cm-glow-amber">
                  30%
                </div>
                <div data-el="photosynthesisHelper" class="cm-meter-sub" style="color:#fcd34d;">
                  Ajusta Roja y Azul
                </div>
              </div>
            </div>

            <!-- CÁMARA HIDROPÓNICA -->
            <div class="cm-crt-screen cm-tank-box">
              <div class="cm-font-chakra cm-tank-header">
                <span style="color:#6ee7b7;">🌱 CULTIVO HIDROPÓNICO ARTEMIS</span>
                <span class="cm-tap-hint">👆 ¡TOCA LOS FRUTOS PARA COSECHARLOS!</span>
              </div>

              <canvas data-el="greenhouseCanvas" class="cm-tank-canvas"></canvas>

              <div class="cm-tank-legend">
                <span>🍅 <strong>Tomate Lunar (+7%)</strong></span>
                <span>🍓 <strong>Fresa Espacial Dorada (+14%)</strong></span>
              </div>
            </div>
          </div>

          <!-- COLUMNA DERECHA -->
          <div class="cm-chassis-subpanel cm-col-right">
            <!-- CONTROL LUZ ROJA -->
            <div class="cm-led-card is-red">
              <div class="cm-slider-top">
                <span class="cm-font-orbitron" style="font-size:0.75rem;font-weight:700;color:#fda4af;">
                  🔴 LUZ ROJA (Meta: ${targetRed})
                </span>
                <span data-el="redValBadge" class="cm-font-orbitron cm-val-badge is-red">${initialRed}</span>
              </div>

              <input data-el="redSlider" type="range" min="1" max="10" value="${initialRed}" step="1"
                class="cm-led-slider cm-led-slider-red" />

              <div class="cm-font-orbitron cm-slider-scale">
                <span>1</span>
                <span data-el="redZoneHint" style="color:#fda4af;">Zona óptima: ${targetRed - 1} – ${targetRed + 1}</span>
                <span>10</span>
              </div>
            </div>

            <!-- CONTROL LUZ AZUL -->
            <div class="cm-led-card is-blue">
              <div class="cm-slider-top">
                <span class="cm-font-orbitron" style="font-size:0.75rem;font-weight:700;color:#7dd3fc;">
                  🔵 LUZ AZUL (Meta: ${targetBlue})
                </span>
                <span data-el="blueValBadge" class="cm-font-orbitron cm-val-badge is-blue">${initialBlue}</span>
              </div>

              <input data-el="blueSlider" type="range" min="1" max="10" value="${initialBlue}" step="1"
                class="cm-led-slider cm-led-slider-blue" />

              <div class="cm-font-orbitron cm-slider-scale">
                <span>1</span>
                <span data-el="blueZoneHint" style="color:#7dd3fc;">Zona óptima: ${targetBlue - 1} – ${targetBlue + 1}</span>
                <span>10</span>
              </div>
            </div>

            <!-- BARRA RACIONES COSECHADAS -->
            <div class="cm-crt-screen cm-progress-box">
              <div class="cm-font-orbitron cm-progress-top">
                <span style="font-size:0.8rem;color:#6ee7b7;">🥗 RACIONES COSECHADAS</span>
                <span data-el="foodPercentText" class="cm-glow-green" style="font-size:1.3rem;">0%</span>
              </div>

              <div class="cm-progress-track">
                <div data-el="foodProgressBar" class="cm-progress-fill"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- 4. OVERLAY DE VICTORIA -->
        <div data-el="victoryOverlay" class="cm-victory-overlay is-hidden">
          <div class="cm-chassis-panel cm-victory-card">
            <div style="font-size:3.5rem;">🥗</div>
            <h2 class="cm-font-orbitron cm-glow-green" style="margin:0;font-size:1.5rem;font-weight:900;">
              ¡COSECHA LUNAR COMPLETADA AL 100%!
            </h2>
            <p style="margin:0;font-size:0.92rem;color:#e2e8f0;line-height:1.45;">
              ¡Excelente trabajo! Calibraste el espectro LED rojo (<strong>${targetRed}</strong>) y azul (<strong>${targetBlue}</strong>) a la perfección y llenaste la despensa de comida fresca para toda la Base Lunar Artemis.
            </p>
          </div>
        </div>
      </main>
    </div>
  `;

  // Helper para referencias locales
  const q = (name) => contenedor.querySelector(`[data-el="${name}"]`);
  const chassis = q("chassis");
  const ghCanvas = q("greenhouseCanvas");
  const confettiCanvas = q("confettiCanvas");

  // Motor de audio sintetizado
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  const sfx = {
    enabled: true,
    spectrumLock() {
      if (!this.enabled) return;
      try {
        const ctx = getAudioCtx();
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          const t = ctx.currentTime + idx * 0.06;
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.16, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.18);
        });
      } catch (_) {}
    },
    harvestPop(isGolden = false) {
      if (!this.enabled) return;
      try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const freq = isGolden ? 740 : 560;
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.55, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.24, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.13);
      } catch (_) {}
    },
    victoryFanfare() {
      if (!this.enabled) return;
      try {
        const ctx = getAudioCtx();
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          const t = ctx.currentTime + i * 0.11;
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.22, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.35);
        });
      } catch (_) {}
    }
  };

  // Estado del minijuego
  const game = {
    targetRed,
    targetBlue,
    redVal: initialRed,
    blueVal: initialBlue,
    wasRedOptimal: false,
    wasBlueOptimal: false,
    foodProgress: 0,
    roundWon: false
  };

  const fruits = [];
  const lightParticles = [];
  const floatingTexts = [];
  const confettiPieces = [];
  let rafId = null;
  let fillIntervalId = null;

  function onRedSlider(rawVal) {
    if (game.roundWon) return;
    let val = parseInt(rawVal, 10);
    game.redVal = val;
    syncSpectrumUI();
  }

  function onBlueSlider(rawVal) {
    if (game.roundWon) return;
    let val = parseInt(rawVal, 10);
    game.blueVal = val;
    syncSpectrumUI();
  }

  function isRedOptimal() {
    return Math.abs(game.redVal - game.targetRed) <= 1;
  }

  function isBlueOptimal() {
    return Math.abs(game.blueVal - game.targetBlue) <= 1;
  }

  function getPhotosynthesisEfficiency() {
    const redError = Math.abs(game.redVal - game.targetRed);
    const blueError = Math.abs(game.blueVal - game.targetBlue);
    if (redError <= 1 && blueError <= 1) return 100;
    return Math.round(Math.max(20, 100 - (redError * 11 + blueError * 11)));
  }

  function syncSpectrumUI() {
    const redSlider = q("redSlider");
    const blueSlider = q("blueSlider");
    const redBadge = q("redValBadge");
    const blueBadge = q("blueValBadge");
    const redHint = q("redZoneHint");
    const blueHint = q("blueZoneHint");

    const photoPct = q("photosynthesisPercent");
    const photoCard = q("photosynthesisCard");
    const photoHelper = q("photosynthesisHelper");
    const statusPill = q("statusPill");
    const artyText = q("artyText");

    redSlider.value = game.redVal;
    blueSlider.value = game.blueVal;
    redBadge.textContent = game.redVal;
    blueBadge.textContent = game.blueVal;

    const redOk = isRedOptimal();
    const blueOk = isBlueOptimal();

    redBadge.classList.remove("is-red", "is-ok");
    if (redOk) {
      redBadge.classList.add("is-ok");
      redHint.textContent = "✅ ¡Luz Roja perfecta!";
      redHint.style.color = "#6ee7b7";
      if (!game.wasRedOptimal) sfx.spectrumLock();
    } else {
      redBadge.classList.add("is-red");
      redHint.textContent =
        game.redVal < game.targetRed
          ? `⬆️ Sube hacia ${game.targetRed}`
          : `⬇️ Baja hacia ${game.targetRed}`;
      redHint.style.color = "#fda4af";
    }

    blueBadge.classList.remove("is-blue", "is-ok");
    if (blueOk) {
      blueBadge.classList.add("is-ok");
      blueHint.textContent = "✅ ¡Luz Azul perfecta!";
      blueHint.style.color = "#6ee7b7";
      if (!game.wasBlueOptimal) sfx.spectrumLock();
    } else {
      blueBadge.classList.add("is-blue");
      blueHint.textContent =
        game.blueVal < game.targetBlue
          ? `⬆️ Sube hacia ${game.targetBlue}`
          : `⬇️ Baja hacia ${game.targetBlue}`;
      blueHint.style.color = "#7dd3fc";
    }

    const efficiency = getPhotosynthesisEfficiency();
    photoPct.textContent = `${efficiency}%`;

    photoCard.classList.remove("is-emerald-border", "is-green-active");
    statusPill.classList.remove("is-green");

    if (redOk && blueOk) {
      photoPct.className = "cm-font-orbitron cm-meter-val cm-glow-green";
      photoCard.classList.add("is-green-active");
      photoHelper.textContent = "🌟 ¡FOTOSÍNTESIS AL MÁXIMO!";
      photoHelper.style.color = "#6ee7b7";

      statusPill.textContent = "🌱 ¡COSECHA ACTIVA!";
      statusPill.classList.add("is-green");

      artyText.innerHTML =
        '<strong style="color:#6ee7b7;">¡Espectro perfecto!</strong> Las plantas están creciendo rápido. <strong style="color:#fcd34d;">¡Toca los tomates y fresas</strong> para llenar la despensa!';
    } else {
      photoPct.className = "cm-font-orbitron cm-meter-val cm-glow-amber";
      photoCard.classList.add("is-emerald-border");
      photoHelper.textContent =
        !redOk && !blueOk
          ? `Ajusta Luz Roja (${game.targetRed}) y Azul (${game.targetBlue})`
          : !redOk
          ? `Falta calibrar Luz Roja (${game.targetRed})`
          : `Falta calibrar Luz Azul (${game.targetBlue})`;
      photoHelper.style.color = "#fcd34d";

      statusPill.textContent = "💡 CALIBRA LAS LUCES";
      artyText.innerHTML = `<strong style="color:#fda4af;">Paso 1:</strong> Ajusta la <strong style="color:#fda4af;">Luz Roja (${game.targetRed})</strong> y la <strong style="color:#7dd3fc;">Luz Azul (${game.targetBlue})</strong>. <strong style="color:#6ee7b7;">Paso 2:</strong> ¡Toca los frutos maduros para cosechar!`;
    }

    game.wasRedOptimal = redOk;
    game.wasBlueOptimal = blueOk;
  }

  function resizeCanvas() {
    if (!contenedor.isConnected) return;
    const rect = ghCanvas.parentElement.getBoundingClientRect();
    ghCanvas.width = Math.max(280, Math.floor(rect.width - 20));
    ghCanvas.height = Math.max(215, Math.floor(rect.height - 68));

    const cRect = chassis.getBoundingClientRect();
    confettiCanvas.width = Math.max(300, Math.floor(cRect.width));
    confettiCanvas.height = Math.max(300, Math.floor(cRect.height));
  }

  function addFoodProgress(amount) {
    if (game.roundWon) return;
    game.foodProgress = Math.min(100, game.foodProgress + amount);
    const pct = Math.round(game.foodProgress);
    q("foodProgressBar").style.width = `${pct}%`;
    q("foodPercentText").textContent = `${pct}%`;

    if (pct >= 100) {
      triggerVictory();
    }
  }

  function triggerVictory() {
    if (game.roundWon) return;
    game.roundWon = true;
    q("victoryOverlay").classList.remove("is-hidden");
    sfx.victoryFanfare();
    launchConfetti();

    victoryTimerId = setTimeout(() => {
      victoryTimerId = null;
      if (destruido) return;
      limpiarRecursos();
      onTerminar({ exito: true });
    }, 1500);
  }

  function limpiarRecursos() {
    if (fillIntervalId) clearInterval(fillIntervalId);
    fillIntervalId = null;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    window.removeEventListener("resize", resizeCanvas);
  }

  // Se devuelve a modal.js para detener todo al cerrar la ventana.
  function destruir() {
    destruido = true;
    if (victoryTimerId) clearTimeout(victoryTimerId);
    victoryTimerId = null;
    limpiarRecursos();
  }

  function drawGreenhouse() {
    const ctx = ghCanvas.getContext("2d");
    const w = ghCanvas.width;
    const h = ghCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const bothOptimal = isRedOptimal() && isBlueOptimal();

    // 1. Haz de luz LED hortícola
    const redAlpha = 0.12 + (game.redVal / 10) * 0.25;
    const blueAlpha = 0.12 + (game.blueVal / 10) * 0.25;

    const beamGrad = ctx.createLinearGradient(0, 14, 0, h * 0.85);
    beamGrad.addColorStop(0, `rgba(244, 63, 94, ${redAlpha})`);
    beamGrad.addColorStop(0.5, `rgba(168, 85, 247, ${(redAlpha + blueAlpha) * 0.65})`);
    beamGrad.addColorStop(1, "rgba(56, 189, 248, 0.04)");
    ctx.fillStyle = beamGrad;
    ctx.fillRect(16, 16, w - 32, h - 42);

    // Barra metálica LED superior
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.roundRect(24, 8, w - 48, 16, 8);
    ctx.fill();

    const bulbCount = 10;
    for (let b = 0; b < bulbCount; b++) {
      const bx = 42 + ((w - 84) / (bulbCount - 1)) * b;
      const isRedBulb = b % 2 === 0;
      ctx.fillStyle = isRedBulb ? "#fb7185" : "#38bdf8";
      ctx.shadowColor = isRedBulb ? "#f43f5e" : "#0ea5e9";
      ctx.shadowBlur = bothOptimal ? 14 : 6;
      ctx.beginPath();
      ctx.arc(bx, 16, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 2. Canal hidropónico inferior
    const trayY = h - 34;
    ctx.fillStyle = "#0f172a";
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(18, trayY, w - 36, 26, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
    ctx.beginPath();
    ctx.roundRect(22, trayY + 6, w - 44, 14, 6);
    ctx.fill();

    // 3. Plantas hidropónicas
    const plantPositions = [w * 0.22, w * 0.5, w * 0.78];
    const growthScale = bothOptimal ? 1.12 : 0.88;

    plantPositions.forEach((px, idx) => {
      const sway = Math.sin(Date.now() * 0.003 + idx) * 4;
      const stemTop = trayY - 95 * growthScale;

      ctx.strokeStyle = bothOptimal ? "#4ade80" : "#22c55e";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(px, trayY + 4);
      ctx.quadraticCurveTo(px + sway, (trayY + stemTop) / 2, px + sway * 1.2, stemTop);
      ctx.stroke();

      [0.35, 0.65, 0.9].forEach((lvl, lIdx) => {
        const ly = trayY - (trayY - stemTop) * lvl;
        const lx = px + sway * lvl;
        const dir = lIdx % 2 === 0 ? 1 : -1;

        ctx.fillStyle = bothOptimal ? "#4ade80" : "#16a34a";
        ctx.beginPath();
        ctx.ellipse(
          lx + dir * 20 * growthScale,
          ly,
          22 * growthScale,
          10 * growthScale,
          dir * -0.35,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
    });

    // 4. Fotones y frutos
    if (!game.roundWon) {
      if (Math.random() < 0.22) {
        const isRedPhoton = Math.random() < 0.5;
        lightParticles.push({
          x: 35 + Math.random() * (w - 70),
          y: 24,
          vx: (Math.random() - 0.5) * 0.6,
          vy: 1.5 + Math.random() * 1.2,
          color: isRedPhoton ? "rgba(251, 113, 133, 0.75)" : "rgba(56, 189, 248, 0.75)",
          life: 65
        });
      }

      if (bothOptimal && fruits.length < 6 && Math.random() < 0.045) {
        const hostX = plantPositions[Math.floor(Math.random() * plantPositions.length)];
        const isStrawberry = Math.random() < 0.35;
        fruits.push({
          x: hostX + (Math.random() - 0.5) * 56,
          y: trayY - 35 - Math.random() * 75,
          r: 18,
          scale: 0.2,
          type: isStrawberry ? "strawberry" : "tomato",
          bobOffset: Math.random() * Math.PI * 2
        });
      }
    }

    // 5. Dibujo de frutos
    fruits.forEach((f) => {
      if (f.scale < 1) f.scale = Math.min(1, f.scale + 0.05);
      const bob = Math.sin(Date.now() * 0.005 + f.bobOffset) * 3;

      ctx.save();
      ctx.translate(f.x, f.y + bob);
      ctx.scale(f.scale, f.scale);

      ctx.fillStyle =
        f.type === "strawberry" ? "rgba(253, 224, 71, 0.25)" : "rgba(74, 222, 128, 0.22)";
      ctx.beginPath();
      ctx.arc(0, 0, f.r + 5, 0, Math.PI * 2);
      ctx.fill();

      const imgFruta = f.type === "strawberry" ? IMG_FRESA : IMG_TOMATE;
      if (imgFruta.complete && imgFruta.naturalWidth) ctx.drawImage(imgFruta, -15, -15, 30, 30);
      ctx.restore();
    });

    // 6. Partículas de luz
    for (let i = lightParticles.length - 1; i >= 0; i--) {
      const lp = lightParticles[i];
      lp.x += lp.vx;
      lp.y += lp.vy;
      lp.life--;
      if (lp.life <= 0 || lp.y > trayY) {
        lightParticles.splice(i, 1);
        continue;
      }
      ctx.fillStyle = lp.color;
      ctx.beginPath();
      ctx.arc(lp.x, lp.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Textos flotantes
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 1.3;
      ft.life--;
      if (ft.life <= 0) {
        floatingTexts.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.font = "bold 17px Fredoka, sans-serif";
      ctx.fillStyle = ft.color;
      ctx.textAlign = "center";
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  function launchConfetti() {
    const colors = ["#4ade80", "#fb7185", "#38bdf8", "#fbbf24", "#a78bfa"];
    for (let i = 0; i < 95; i++) {
      confettiPieces.push({
        x: confettiCanvas.width * 0.5 + (Math.random() - 0.5) * 180,
        y: confettiCanvas.height * 0.45,
        vx: (Math.random() - 0.5) * 14,
        vy: -6 - Math.random() * 10,
        size: 7 + Math.random() * 7,
        color: colors[i % colors.length],
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.25,
        life: 130
      });
    }
  }

  function updateConfetti() {
    const ctx = confettiCanvas.getContext("2d");
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    for (let i = confettiPieces.length - 1; i >= 0; i--) {
      const c = confettiPieces[i];
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.35;
      c.rot += c.vrot;
      c.life--;

      if (c.life <= 0 || c.y > confettiCanvas.height + 20) {
        confettiPieces.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.65);
      ctx.restore();
    }
  }

  // Event listeners
  q("btnAudio").addEventListener("click", () => {
    sfx.enabled = !sfx.enabled;
    q("audioIcon").textContent = sfx.enabled ? "🔊" : "🔇";
  });

  q("redSlider").addEventListener("input", (e) => onRedSlider(e.target.value));
  q("blueSlider").addEventListener("input", (e) => onBlueSlider(e.target.value));

  ghCanvas.addEventListener("pointerdown", (e) => {
    if (game.roundWon) return;
    const rect = ghCanvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (ghCanvas.width / rect.width);
    const py = (e.clientY - rect.top) * (ghCanvas.height / rect.height);

    for (let i = fruits.length - 1; i >= 0; i--) {
      const f = fruits[i];
      const dist = Math.hypot(f.x - px, f.y - py);
      if (dist <= f.r + 22) {
        fruits.splice(i, 1);
        const isGolden = f.type === "strawberry";
        const gain = isGolden ? 14 : 7;
        addFoodProgress(gain);
        sfx.harvestPop(isGolden);

        floatingTexts.push({
          x: f.x,
          y: f.y,
          text: `+${gain}%`,
          color: isGolden ? "#fde047" : "#4ade80",
          life: 36
        });

        for (let k = 0; k < 8; k++) {
          const angle = (Math.PI * 2 * k) / 8;
          lightParticles.push({
            x: f.x,
            y: f.y,
            vx: Math.cos(angle) * 3.2,
            vy: Math.sin(angle) * 3.2,
            color: isGolden ? "#fde047" : "#4ade80",
            life: 20
          });
        }
        break;
      }
    }
  });

  window.addEventListener("resize", resizeCanvas);

  // Bucles
  fillIntervalId = setInterval(() => {
    if (!contenedor.isConnected) {
      limpiarRecursos();
      return;
    }
    if (game.roundWon) return;
    if (isRedOptimal() && isBlueOptimal()) {
      addFoodProgress(INCREMENTO_NIVEL);
    }
  }, 100);

  function animationLoop() {
    if (!contenedor.isConnected) {
      limpiarRecursos();
      return;
    }
    drawGreenhouse();
    updateConfetti();
    rafId = requestAnimationFrame(animationLoop);
  }

  // Inicializar
  syncSpectrumUI();
  requestAnimationFrame(() => {
    if (destruido) return;
    resizeCanvas();
    animationLoop();
  });

  return destruir;
}