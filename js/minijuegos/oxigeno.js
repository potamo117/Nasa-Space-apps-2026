export function iniciar(contenedor, onTerminar) {
  // Cargar CSS automáticamente si se abre desde el index.html principal
  if (!document.querySelector('link[href*="oxigeno.css"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./css/oxigeno.css";
    document.head.appendChild(link);
  }

  // Voltaje meta aleatorio entre 3 V y 8 V (diferente al 2 V inicial)
  const voltajesPosibles = [3, 4, 5, 6, 7, 8];
  const voltajeMetaInicial =
    voltajesPosibles[Math.floor(Math.random() * voltajesPosibles.length)];

  // Inyectar interfaz dentro del contenedor del modal
  contenedor.innerHTML = `
    <div class="ox-wrapper">
      <main data-el="chassis" class="ox-chassis-panel">
        <span class="ox-screw ox-screw-tl"></span>
        <span class="ox-screw ox-screw-tr"></span>
        <span class="ox-screw ox-screw-bl"></span>
        <span class="ox-screw ox-screw-br"></span>

        <canvas data-el="confettiCanvas" class="ox-confetti-canvas"></canvas>

        <!-- 1. BARRA SUPERIOR -->
        <header class="ox-chassis-subpanel ox-header">
          <div class="ox-header-left">
            <div class="ox-logo-box">🫧</div>
            <div>
              <div class="ox-title-row">
                <h1 class="ox-font-orbitron ox-main-title">
                  BASE LUNAR ARTEMIS · FÁBRICA DE OXÍGENO (O₂)
                </h1>
                <div class="ox-leds">
                  <span class="ox-led ox-led-green"></span>
                  <span class="ox-led ox-led-sky"></span>
                  <span class="ox-led ox-led-amber"></span>
                </div>
              </div>
              <span class="ox-badge-module">🫧 MÓDULO DE SOPORTE VITAL O₂</span>
            </div>
          </div>

          <button type="button" data-el="btnAudio" class="ox-juicy-btn ox-btn-audio">
            <span data-el="audioIcon">🔊</span>
            <span>Sonido</span>
          </button>
        </header>

        <!-- 2. GUÍA DEL ROBOT ARTY -->
        <section class="ox-crt-screen ox-arty-banner">
          <div class="ox-arty-left">
            <div class="ox-arty-avatar">
              <svg viewBox="0 0 100 100">
                <line x1="50" y1="18" x2="50" y2="7" stroke="#38bdf8" stroke-width="5" stroke-linecap="round"/>
                <circle cx="50" cy="6" r="6" fill="#fbbf24"/>
                <rect x="20" y="20" width="60" height="54" rx="16" fill="#e2e8f0" stroke="#64748b" stroke-width="3"/>
                <rect x="27" y="30" width="46" height="32" rx="10" fill="#0f172a"/>
                <circle cx="40" cy="44" r="5.5" fill="#38bdf8"/>
                <circle cx="60" cy="44" r="5.5" fill="#38bdf8"/>
                <path d="M 40 53 Q 50 62 60 53" stroke="#4ade80" stroke-width="4" fill="none" stroke-linecap="round"/>
              </svg>
            </div>
            <div>
              <div class="ox-font-orbitron ox-arty-tag">
                🤖 MENSAJE DE ARTY · ELECTRÓLISIS DEL AGUA (H₂O → O₂)
              </div>
              <p data-el="artyText" class="ox-arty-msg"></p>
            </div>
          </div>

          <div data-el="statusPill" class="ox-font-orbitron ox-status-pill">
            ⚡ AJUSTA LA ENERGÍA
          </div>
        </section>

        <!-- 3. ZONA PRINCIPAL DE JUEGO -->
        <section class="ox-main-grid">
          <!-- COLUMNA IZQUIERDA -->
          <div class="ox-col-left">
            <div class="ox-meters-grid">
              <div class="ox-crt-screen ox-meter-box">
                <div class="ox-font-orbitron ox-meter-label" style="color:#fcd34d;">🎯 VOLTAJE META</div>
                <div data-el="targetVoltDisplay" class="ox-font-orbitron ox-meter-val ox-glow-amber">
                  ${voltajeMetaInicial} V
                </div>
                <div data-el="targetRangeSub" class="ox-meter-sub" style="color:#6ee7b7;">
                  Zona verde: ${voltajeMetaInicial - 1} V – ${voltajeMetaInicial + 1} V
                </div>
              </div>

              <div data-el="currentVoltCard" class="ox-crt-screen ox-meter-box is-cyan">
                <div class="ox-font-orbitron ox-meter-label" style="color:#67e8f9;">⚡ TU ENERGÍA</div>
                <div data-el="currentVoltDisplay" class="ox-font-orbitron ox-meter-val ox-glow-cyan">
                  2 V
                </div>
                <div data-el="voltHelperBadge" class="ox-meter-sub" style="color:#fcd34d;">
                  ¡Ajusta el voltaje!
                </div>
              </div>
            </div>

            <!-- TANQUE DE ELECTRÓLISIS -->
            <div class="ox-crt-screen ox-tank-box">
              <div class="ox-font-chakra ox-tank-header">
                <span style="color:#67e8f9;">🔵 LADO O₂ (OXÍGENO PURO)</span>
                <span class="ox-tap-hint">👆 ¡TOCA LAS BURBUJAS PARA EXPLOTARLAS!</span>
                <span style="color:#d8b4fe;">🟣 LADO H₂ (HIDRÓGENO)</span>
              </div>

              <canvas data-el="tankCanvas" class="ox-tank-canvas"></canvas>

              <div class="ox-tank-legend">
                <span class="ox-legend-item"><span class="ox-dot-cyan"></span> Burbuja O₂ (+6%)</span>
                <span class="ox-legend-item"><span class="ox-dot-gold"></span> <strong>Burbuja Dorada O₂ (+14%)</strong></span>
              </div>
            </div>
          </div>

          <!-- COLUMNA DERECHA -->
          <div class="ox-chassis-subpanel ox-col-right">
            <!-- CRISTALES -->
            <div>
              <span class="ox-font-orbitron ox-section-label">
                1️⃣ CRISTALES DE ENERGÍA (Base: 2 V)
              </span>
              <div class="ox-crystals-grid">
                <button type="button" data-crystal="0" class="ox-juicy-btn ox-crystal-btn">
                  <span class="ox-crystal-emoji">💎</span>
                  <span class="ox-font-orbitron ox-crystal-volt" style="color:#67e8f9;">+1 V</span>
                  <span class="ox-crystal-state">APAGADO</span>
                </button>

                <button type="button" data-crystal="1" class="ox-juicy-btn ox-crystal-btn">
                  <span class="ox-crystal-emoji">🔋</span>
                  <span class="ox-font-orbitron ox-crystal-volt" style="color:#6ee7b7;">+2 V</span>
                  <span class="ox-crystal-state">APAGADO</span>
                </button>

                <button type="button" data-crystal="2" class="ox-juicy-btn ox-crystal-btn">
                  <span class="ox-crystal-emoji">⚡</span>
                  <span class="ox-font-orbitron ox-crystal-volt" style="color:#fcd34d;">+3 V</span>
                  <span class="ox-crystal-state">APAGADO</span>
                </button>
              </div>
            </div>

            <!-- PALANCA MAGNÉTICA -->
            <div class="ox-dark-card">
              <div class="ox-slider-top">
                <span class="ox-font-orbitron" style="font-size:0.72rem;font-weight:700;color:#fcd34d;">
                  🧲 O DESLIZA LA PALANCA MAGNÉTICA
                </span>
                <span data-el="sliderVoltBadge" class="ox-font-orbitron ox-slider-badge">2 V</span>
              </div>

              <input data-el="voltageSlider" type="range" min="1" max="9" value="2" step="1" class="ox-kid-slider" />

              <div class="ox-font-orbitron ox-slider-scale">
                <span>1 V</span>
                <span style="color:#34d399;">🧲 SE IMANTA A LA ZONA VERDE</span>
                <span>9 V</span>
              </div>
            </div>

            <!-- TEMPERATURA Y ENFRIAR -->
            <div class="ox-dark-card ox-temp-row">
              <div>
                <div class="ox-font-orbitron" style="font-size:0.72rem;font-weight:700;color:#e2e8f0;">
                  🌡️ TEMPERATURA DEL AGUA
                </div>
                <div data-el="tempFriendlyText" style="font-size:0.82rem;font-weight:700;color:#34d399;margin-top:2px;">
                  ❄️ Fresquita y segura
                </div>
              </div>

              <button type="button" data-el="btnCool" class="ox-juicy-btn ox-font-orbitron ox-btn-cool">
                <span>💦</span> ENFRIAR
              </button>
            </div>

            <!-- TANQUE DE OXÍGENO -->
            <div class="ox-crt-screen ox-progress-box">
              <div class="ox-font-orbitron ox-progress-top">
                <span style="font-size:0.8rem;color:#67e8f9;">🫧 TANQUE DE OXÍGENO O₂</span>
                <span data-el="oxygenPercentText" class="ox-glow-green" style="font-size:1.3rem;">0%</span>
              </div>

              <div class="ox-progress-track">
                <div data-el="oxygenProgressBar" class="ox-progress-fill"></div>
              </div>

              <p style="margin:0;font-size:0.74rem;text-align:center;font-weight:700;color:#fcd34d;">
                ✨ ¡Llena el tanque al 100% para restaurar el oxígeno de la base!
              </p>
            </div>
          </div>
        </section>

        <!-- 4. OVERLAY DE VICTORIA -->
        <div data-el="victoryOverlay" class="ox-victory-overlay is-hidden">
          <div class="ox-chassis-panel ox-victory-card">
            <div style="font-size:3.5rem;">🫧</div>
            <h2 class="ox-font-orbitron ox-glow-green" style="margin:0;font-size:1.5rem;font-weight:900;">
              ¡OXÍGENO RESTAURADO AL 100%!
            </h2>
            <p style="margin:0;font-size:0.92rem;color:#e2e8f0;line-height:1.45;">
              ¡Excelente trabajo! Regulaste la celda de electrólisis a <strong>${voltajeMetaInicial} V</strong> y llenaste todo el tanque de oxígeno puro para la Base Lunar Artemis.
            </p>
          </div>
        </div>
      </main>
    </div>
  `;

  // Helper para buscar elementos dentro de este contenedor
  const q = (name) => contenedor.querySelector(`[data-el="${name}"]`);
  const chassis = q("chassis");
  const tankCanvas = q("tankCanvas");
  const confettiCanvas = q("confettiCanvas");
  const crystalBtns = contenedor.querySelectorAll("[data-crystal]");

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
    crystalTap(active) {
      if (!this.enabled) return;
      try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(active ? 520 : 310, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(active ? 780 : 220, ctx.currentTime + 0.09);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } catch (_) {}
    },
    greenZoneLock() {
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
    bubblePop(isGold = false) {
      if (!this.enabled) return;
      try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const freq = isGold ? 720 : 540;
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.6, ctx.currentTime + 0.11);
        gain.gain.setValueAtTime(0.24, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } catch (_) {}
    },
    softSpark() {
      if (!this.enabled) return;
      try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(160, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(95, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.13);
      } catch (_) {}
    },
    waterSplash() {
      if (!this.enabled) return;
      try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(340, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
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
    baseVolt: 2,
    crystalValues: [1, 2, 3],
    crystals: [false, false, false],
    targetVolt: voltajeMetaInicial,
    currentVolt: 2,
    wasInGreenZone: false,
    oxygenProgress: 0,
    roundWon: false,
    isHot: false
  };

  const particles = [];
  const floatingScores = [];
  const confettiPieces = [];
  let sparkTick = 0;
  let rafId = null;
  let fillIntervalId = null;

  function shakeChassis() {
    chassis.classList.remove("ox-shake-effect");
    void chassis.offsetWidth;
    chassis.classList.add("ox-shake-effect");
  }

  function updateCrystalVisual(index) {
    const btn = crystalBtns[index];
    if (!btn) return;
    const lbl = btn.querySelector(".ox-crystal-state");
    const active = game.crystals[index];
    btn.classList.toggle("is-active", active);
    if (lbl) lbl.textContent = active ? "ENCENDIDO" : "APAGADO";
  }

  function toggleCrystal(index) {
    if (game.roundWon) return;
    game.crystals[index] = !game.crystals[index];
    updateCrystalVisual(index);

    let sum = game.baseVolt;
    game.crystals.forEach((on, idx) => {
      if (on) sum += game.crystalValues[idx];
    });
    game.currentVolt = Math.min(9, Math.max(1, sum));

    sfx.crystalTap(game.crystals[index]);
    syncSliderAndUI();
  }

  function onSliderChange(rawVal) {
    if (game.roundWon) return;
    let val = parseInt(rawVal, 10);

    // Efecto imán suave
    if (Math.abs(val - game.targetVolt) === 1) {
      val = game.targetVolt;
    }

    game.currentVolt = val;

    const needed = val - game.baseVolt;
    const combos = {
      0: [false, false, false],
      1: [true, false, false],
      2: [false, true, false],
      3: [false, false, true],
      4: [true, false, true],
      5: [false, true, true],
      6: [true, true, true],
      7: [true, true, true]
    };
    game.crystals = combos[Math.max(0, Math.min(7, needed))] || [false, false, false];
    [0, 1, 2].forEach(updateCrystalVisual);

    syncSliderAndUI();
  }

  function syncSliderAndUI() {
    const slider = q("voltageSlider");
    const sliderBadge = q("sliderVoltBadge");
    const voltDisplay = q("currentVoltDisplay");
    const voltCard = q("currentVoltCard");
    const helperBadge = q("voltHelperBadge");
    const statusPill = q("statusPill");
    const artyText = q("artyText");
    const tempText = q("tempFriendlyText");

    const minGreen = game.targetVolt - 1;
    const maxGreen = game.targetVolt + 1;

    slider.value = game.currentVolt;
    sliderBadge.textContent = `${game.currentVolt} V`;
    voltDisplay.textContent = `${game.currentVolt} V`;

    const diff = game.currentVolt - game.targetVolt;
    const inGreenZone = Math.abs(diff) <= 1;
    game.isHot = diff >= 2;

    voltCard.classList.remove("is-cyan", "is-green", "is-hot");
    statusPill.classList.remove("is-green", "is-hot");

    if (inGreenZone) {
      voltDisplay.className = "ox-font-orbitron ox-meter-val ox-glow-green";
      voltCard.classList.add("is-green");
      helperBadge.textContent = "✅ ¡ZONA VERDE PERFECTA!";
      helperBadge.style.color = "#6ee7b7";

      statusPill.textContent = "🫧 ¡PRODUCIENDO O₂!";
      statusPill.classList.add("is-green");

      artyText.innerHTML =
        '<strong style="color:#6ee7b7;">¡Genial!</strong> El reactor está en zona verde generando oxígeno. <strong style="color:#fcd34d;">¡Toca las burbujas</strong> para llenar el tanque más rápido!';

      if (!game.wasInGreenZone) sfx.greenZoneLock();
    } else if (diff < -1) {
      voltDisplay.className = "ox-font-orbitron ox-meter-val ox-glow-cyan";
      voltCard.classList.add("is-cyan");
      helperBadge.textContent = "⬆️ ¡Falta energía! Sube más";
      helperBadge.style.color = "#fcd34d";

      statusPill.textContent = "⚡ SUBE EL VOLTAJE";

      artyText.innerHTML = `<strong style="color:#fcd34d;">Paso 1:</strong> Toca los cristales de energía hasta llegar a la <strong style="color:#6ee7b7;">zona verde (${minGreen} V – ${maxGreen} V)</strong>.`;
    } else {
      voltDisplay.className = "ox-font-orbitron ox-meter-val ox-glow-rose";
      voltCard.classList.add("is-hot");
      helperBadge.textContent = "⬇️ ¡Mucha energía! Baja un poco";
      helperBadge.style.color = "#fda4af";

      statusPill.textContent = "🔥 DEMASIADA ENERGÍA";
      statusPill.classList.add("is-hot");

      artyText.innerHTML = `<strong style="color:#fda4af;">¡Uy, mucha energía!</strong> Apaga un cristal o baja la palanca hacia <strong style="color:#6ee7b7;">${game.targetVolt} V</strong>.`;
    }

    if (game.isHot) {
      tempText.textContent = "🌡️ Tibia · Pulsa ENFRIAR";
      tempText.style.color = "#fcd34d";
    } else {
      tempText.textContent = "❄️ Fresquita y segura";
      tempText.style.color = "#34d399";
    }

    game.wasInGreenZone = inGreenZone;
  }

  function coolReactor() {
    if (game.roundWon) return;
    sfx.waterSplash();
    for (let i = 0; i < 16; i++) {
      particles.push({
        x: Math.random() * tankCanvas.width,
        y: 12 + Math.random() * 25,
        r: 4 + Math.random() * 4,
        vx: (Math.random() - 0.5) * 2.5,
        vy: 2.5 + Math.random() * 3,
        type: "coolDrop",
        life: 45
      });
    }
    if (game.currentVolt > game.targetVolt + 1) {
      onSliderChange(game.targetVolt);
    }
  }

  function resizeCanvas() {
    if (!contenedor.isConnected) return;
    const rect = tankCanvas.parentElement.getBoundingClientRect();
    tankCanvas.width = Math.max(280, Math.floor(rect.width - 20));
    tankCanvas.height = Math.max(210, Math.floor(rect.height - 68));

    const cRect = chassis.getBoundingClientRect();
    confettiCanvas.width = Math.max(300, Math.floor(cRect.width));
    confettiCanvas.height = Math.max(300, Math.floor(cRect.height));
  }

  function addOxygenProgress(amount) {
    if (game.roundWon) return;
    game.oxygenProgress = Math.min(100, game.oxygenProgress + amount);
    const pct = Math.round(game.oxygenProgress);
    q("oxygenProgressBar").style.width = `${pct}%`;
    q("oxygenPercentText").textContent = `${pct}%`;

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

    // Limpiar bucles y reportar éxito al contrato (P1/P2)
    setTimeout(() => {
      limpiarRecursos();
      onTerminar({ exito: true });
    }, 1500);
  }

  function limpiarRecursos() {
    if (fillIntervalId) clearInterval(fillIntervalId);
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resizeCanvas);
  }

  function drawReactorTank() {
    const ctx = tankCanvas.getContext("2d");
    const w = tankCanvas.width;
    const h = tankCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const inGreenZone = Math.abs(game.currentVolt - game.targetVolt) <= 1;

    const waterGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (inGreenZone) {
      waterGrad.addColorStop(0, "rgba(16, 185, 129, 0.22)");
      waterGrad.addColorStop(1, "rgba(6, 182, 212, 0.34)");
    } else if (game.isHot) {
      waterGrad.addColorStop(0, "rgba(244, 63, 94, 0.22)");
      waterGrad.addColorStop(1, "rgba(251, 146, 60, 0.28)");
    } else {
      waterGrad.addColorStop(0, "rgba(14, 165, 233, 0.14)");
      waterGrad.addColorStop(1, "rgba(30, 58, 138, 0.26)");
    }
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, 0, w, h);

    // Membrana PEM
    ctx.save();
    ctx.strokeStyle = inGreenZone ? "rgba(74, 222, 128, 0.65)" : "rgba(148, 163, 184, 0.35)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(w * 0.58, 10);
    ctx.lineTo(w * 0.58, h - 10);
    ctx.stroke();
    ctx.restore();

    // Electrodos
    const anodeX = w * 0.24;
    const cathodeX = w * 0.8;
    const plateTop = h * 0.22;
    const plateH = h * 0.66;

    ctx.fillStyle = inGreenZone ? "#22d3ee" : "#38bdf8";
    ctx.beginPath();
    ctx.roundRect(anodeX - 10, plateTop, 20, plateH, 8);
    ctx.fill();
    ctx.fillStyle = "#082f49";
    ctx.font = "bold 14px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("O₂", anodeX, plateTop + plateH / 2 + 5);

    ctx.fillStyle = "#c084fc";
    ctx.beginPath();
    ctx.roundRect(cathodeX - 10, plateTop, 20, plateH, 8);
    ctx.fill();
    ctx.fillStyle = "#3b0764";
    ctx.fillText("H₂", cathodeX, plateTop + plateH / 2 + 5);

    // Generación de burbujas
    if (!game.roundWon) {
      if (inGreenZone) {
        if (Math.random() < 0.22) {
          const isGold = Math.random() < 0.32;
          particles.push({
            x: anodeX + (Math.random() - 0.5) * 70,
            y: plateTop + Math.random() * plateH,
            r: isGold ? 18 : 14,
            vx: (Math.random() - 0.5) * 0.9,
            vy: -(1.1 + Math.random() * 1.1),
            type: isGold ? "goldO2" : "cyanO2",
            wobble: Math.random() * Math.PI * 2
          });
        }
        if (Math.random() < 0.25) {
          particles.push({
            x: cathodeX + (Math.random() - 0.5) * 45,
            y: plateTop + Math.random() * plateH,
            r: 7 + Math.random() * 4,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -(1.5 + Math.random() * 1.3),
            type: "purpleH2",
            wobble: Math.random() * Math.PI * 2
          });
        }
      } else if (game.isHot) {
        sparkTick++;
        if (sparkTick % 18 === 0) {
          sfx.softSpark();
          shakeChassis();
          for (let s = 0; s < 5; s++) {
            particles.push({
              x: anodeX + (Math.random() - 0.5) * 30,
              y: plateTop + Math.random() * plateH,
              r: 3,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              type: "heatSpark",
              life: 18
            });
          }
        }
      } else if (Math.random() < 0.05) {
        particles.push({
          x: anodeX + (Math.random() - 0.5) * 40,
          y: plateTop + Math.random() * plateH,
          r: 11,
          vx: (Math.random() - 0.5) * 0.6,
          vy: -0.9,
          type: "cyanO2",
          wobble: Math.random() * Math.PI * 2
        });
      }
    }

    // Dibujo de partículas
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      if (p.type === "goldO2" || p.type === "cyanO2" || p.type === "purpleH2") {
        p.wobble += 0.08;
        p.x += p.vx + Math.sin(p.wobble) * 0.45;
        p.y += p.vy;

        if (p.y + p.r < 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        if (p.type === "goldO2") {
          ctx.fillStyle = "rgba(253, 224, 71, 0.88)";
          ctx.strokeStyle = "#fef9c3";
          ctx.shadowColor = "#fbbf24";
          ctx.shadowBlur = 14;
        } else if (p.type === "cyanO2") {
          ctx.fillStyle = "rgba(56, 189, 248, 0.82)";
          ctx.strokeStyle = "#bae6fd";
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = "rgba(192, 132, 252, 0.65)";
          ctx.strokeStyle = "#e9d5ff";
        }
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
        ctx.beginPath();
        ctx.arc(p.x - p.r * 0.32, p.y - p.r * 0.32, p.r * 0.24, 0, Math.PI * 2);
        ctx.fill();

        if (p.type === "goldO2" || p.type === "cyanO2") {
          ctx.fillStyle = p.type === "goldO2" ? "#422006" : "#082f49";
          ctx.font = "bold 11px Fredoka, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("O₂", p.x, p.y + 4);
        }
        ctx.restore();
      } else if (p.type === "starSpark" || p.type === "heatSpark") {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.fillStyle = p.type === "starSpark" ? "#fde047" : "#fb7185";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "coolDrop") {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0 || p.y > h) {
          particles.splice(i, 1);
          continue;
        }
        ctx.fillStyle = "rgba(125, 211, 252, 0.85)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "waterRipple") {
        p.r += 2.2;
        p.life--;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(103, 232, 249, ${p.life / 16})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    for (let i = floatingScores.length - 1; i >= 0; i--) {
      const fs = floatingScores[i];
      fs.y -= 1.3;
      fs.life--;
      if (fs.life <= 0) {
        floatingScores.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.font = "bold 16px Fredoka, sans-serif";
      ctx.fillStyle = fs.color;
      ctx.textAlign = "center";
      ctx.fillText(fs.text, fs.x, fs.y);
      ctx.restore();
    }
  }

  function launchConfetti() {
    const colors = ["#4ade80", "#38bdf8", "#fbbf24", "#f472b6", "#a78bfa"];
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

  // Event Listeners
  q("btnAudio").addEventListener("click", () => {
    sfx.enabled = !sfx.enabled;
    q("audioIcon").textContent = sfx.enabled ? "🔊" : "🔇";
    if (sfx.enabled) sfx.crystalTap(true);
  });

  crystalBtns.forEach((btn, idx) => {
    btn.addEventListener("click", () => toggleCrystal(idx));
  });

  q("voltageSlider").addEventListener("input", (e) => {
    onSliderChange(e.target.value);
  });

  q("btnCool").addEventListener("click", coolReactor);

  tankCanvas.addEventListener("pointerdown", (e) => {
    if (game.roundWon) return;
    const rect = tankCanvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (tankCanvas.width / rect.width);
    const py = (e.clientY - rect.top) * (tankCanvas.height / rect.height);

    let poppedAny = false;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (p.type === "goldO2" || p.type === "cyanO2") {
        const dist = Math.hypot(p.x - px, p.y - py);
        if (dist <= p.r + 22) {
          poppedAny = true;
          const isGold = p.type === "goldO2";
          particles.splice(i, 1);

          const gain = isGold ? 14 : 6;
          addOxygenProgress(gain);
          sfx.bubblePop(isGold);

          floatingScores.push({
            x: p.x,
            y: p.y,
            text: isGold ? `+${gain}% O₂ ⭐` : `+${gain}% O₂`,
            color: isGold ? "#fde047" : "#67e8f9",
            life: 36
          });

          for (let k = 0; k < 8; k++) {
            const angle = (Math.PI * 2 * k) / 8;
            particles.push({
              x: p.x,
              y: p.y,
              r: 3.5,
              vx: Math.cos(angle) * 3.5,
              vy: Math.sin(angle) * 3.5,
              type: "starSpark",
              life: 20
            });
          }
          break;
        }
      }
    }

    if (!poppedAny) {
      particles.push({ x: px, y: py, r: 5, type: "waterRipple", life: 16 });
    }
  });

  window.addEventListener("resize", resizeCanvas);

  // Bucles principales
  fillIntervalId = setInterval(() => {
    if (!contenedor.isConnected) {
      limpiarRecursos();
      return;
    }
    if (game.roundWon) return;
    const inGreenZone = Math.abs(game.currentVolt - game.targetVolt) <= 1;
    if (inGreenZone) {
      addOxygenProgress(1.8);
    }
  }, 100);

  function animationLoop() {
    if (!contenedor.isConnected) {
      limpiarRecursos();
      return;
    }
    drawReactorTank();
    updateConfetti();
    rafId = requestAnimationFrame(animationLoop);
  }

  // Inicialización
  [0, 1, 2].forEach(updateCrystalVisual);
  syncSliderAndUI();
  requestAnimationFrame(() => {
    resizeCanvas();
    animationLoop();
  });
}