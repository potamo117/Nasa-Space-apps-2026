import { nivelDe } from "../core/dificultad.js";
// js/minijuegos/oxigeno.js  (P4) — Fábrica de Oxígeno (electrólisis del agua)
//
// Contrato:  iniciar(contenedor, onTerminar)
//   onTerminar({ exito: true })   -> tanque de O2 al 100%
//   onTerminar({ exito: false })  -> el reactor se sobrecalentó (calor al 100%)
//
// Extra (opcional para P2): iniciar() devuelve una función destruir().
// Llámala si cierras el modal sin que el juego haya terminado: detiene todo
// y NO llama a onTerminar. Si no la llamas, el juego se limpia solo cuando
// su HTML sale del DOM o cuando vuelves a llamar a iniciar() en el mismo contenedor.

// ---------------------------------------------------------------- AJUSTES
const CFG = {
  VOLT_BASE: 1,                 // voltaje con todos los cristales apagados
  CRISTALES: [1, 2, 4],         // binario: cualquier voltaje de 1 a 8 tiene una combinación exacta
  VOLT_MAX: 8,                  // VOLT_BASE + 1 + 2 + 4
  METAS: [3, 4, 5, 6],          // voltaje meta posible (zona verde = meta ± 1)

  RELLENO_PASIVO: 3.5,          // % de tanque por segundo solo por estar en zona verde
  BURBUJAS_O2_POR_S: 3.2,       // burbujas O2 tocables por segundo (en zona verde)
  PROB_DORADA: 0.25,            // fracción de burbujas O2 que son doradas
  BURBUJAS_H2_POR_S: 5,         // burbujas H2 decorativas por segundo
  GANANCIA_BURBUJA: 6,          // % por burbuja O2
  GANANCIA_DORADA: 14,          // % por burbuja dorada

  // Calor (% por segundo) según cuánto te pasas de la meta: diff 2, diff 3, diff >= 4
  CALOR_POR_S: [12, 18, 26],
  ENFRIAMIENTO_PASIVO: 6,       // % por segundo cuando NO estás en sobrevoltaje
  ENFRIAR_RESTA: 35,            // % de calor que quita el botón ENFRIAR
  ENFRIAR_COOLDOWN: 2.5,        // segundos antes de poder volver a usar ENFRIAR
  CALOR_ALERTA: 70,             // desde aquí el juego avisa de peligro

  RETARDO_VICTORIA_MS: 2000,
  RETARDO_DERROTA_MS: 1800
};

const instancias = new WeakMap(); // contenedor -> destruir() de la partida activa
let ultimaMeta = null;            // para no repetir la misma meta dos veces seguidas

export function iniciar(contenedor, onTerminar) {
  // Dificultad adaptativa: más relleno y menos calor si vas lento; lo contrario si vas rápido.
  const NIV = nivelDe("oxigeno");
  const kRelleno = [1.2, 1, 0.85][NIV];
  const kCalor = [0.8, 1, 1.3][NIV];
  // Si ya había una partida en este contenedor (modal reabierto), se destruye primero.
  const previa = instancias.get(contenedor);
  if (previa) previa();

  // Cargar el CSS automáticamente (ruta relativa a ESTE archivo, no a la página).
  const yaTieneCSS = [...document.querySelectorAll('link[rel="stylesheet"]')].some((l) =>
    l.href.includes("oxigeno.css")
  );
  if (!yaTieneCSS) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL("../../css/oxigeno.css", import.meta.url).href;
    document.head.appendChild(link);
  }

  // Meta aleatoria, distinta a la anterior
  const opciones = CFG.METAS.filter((m) => m !== ultimaMeta);
  const metaInicial = opciones[Math.floor(Math.random() * opciones.length)];
  ultimaMeta = metaInicial;

  const [C1, C2, C3] = CFG.CRISTALES;

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
                <h2 class="ox-font-orbitron ox-main-title">
                  BASE LUNAR ARTEMIS · FÁBRICA DE OXÍGENO (O₂)
                </h2>
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
                  ${metaInicial} V
                </div>
                <div class="ox-meter-sub" style="color:#6ee7b7;">
                  Zona verde: ${metaInicial - 1} V – ${metaInicial + 1} V
                </div>
              </div>

              <div data-el="currentVoltCard" class="ox-crt-screen ox-meter-box is-cyan">
                <div class="ox-font-orbitron ox-meter-label" style="color:#67e8f9;">⚡ TU ENERGÍA</div>
                <div data-el="currentVoltDisplay" class="ox-font-orbitron ox-meter-val ox-glow-cyan">
                  ${CFG.VOLT_BASE} V
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

              <div data-el="tankStage" class="ox-tank-stage">
                <canvas data-el="tankCanvas" class="ox-tank-canvas"></canvas>
              </div>

              <div class="ox-tank-legend">
                <span class="ox-legend-item"><span class="ox-dot-cyan"></span> Burbuja O₂ (+${CFG.GANANCIA_BURBUJA}%)</span>
                <span class="ox-legend-item"><span class="ox-dot-gold"></span> <strong>Burbuja Dorada O₂ (+${CFG.GANANCIA_DORADA}%)</strong></span>
              </div>
            </div>
          </div>

          <!-- COLUMNA DERECHA -->
          <div class="ox-chassis-subpanel ox-col-right">
            <!-- CRISTALES -->
            <div>
              <span class="ox-font-orbitron ox-section-label">
                1️⃣ CRISTALES DE ENERGÍA (Base: ${CFG.VOLT_BASE} V)
              </span>
              <div class="ox-crystals-grid">
                <button type="button" data-crystal="0" class="ox-juicy-btn ox-crystal-btn">
                  <span class="ox-crystal-emoji">💎</span>
                  <span class="ox-font-orbitron ox-crystal-volt" style="color:#67e8f9;">+${C1} V</span>
                  <span class="ox-crystal-state">APAGADO</span>
                </button>

                <button type="button" data-crystal="1" class="ox-juicy-btn ox-crystal-btn">
                  <span class="ox-crystal-emoji">🔋</span>
                  <span class="ox-font-orbitron ox-crystal-volt" style="color:#6ee7b7;">+${C2} V</span>
                  <span class="ox-crystal-state">APAGADO</span>
                </button>

                <button type="button" data-crystal="2" class="ox-juicy-btn ox-crystal-btn">
                  <span class="ox-crystal-emoji">⚡</span>
                  <span class="ox-font-orbitron ox-crystal-volt" style="color:#fcd34d;">+${C3} V</span>
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
                <span data-el="sliderVoltBadge" class="ox-font-orbitron ox-slider-badge">${CFG.VOLT_BASE} V</span>
              </div>

              <input data-el="voltageSlider" type="range" min="${CFG.VOLT_BASE}" max="${CFG.VOLT_MAX}" value="${CFG.VOLT_BASE}" step="1" class="ox-kid-slider" aria-label="Voltaje de la celda" />

              <div class="ox-font-orbitron ox-slider-scale">
                <span>${CFG.VOLT_BASE} V</span>
                <span style="color:#34d399;">🎯 META ±1 V ES ZONA VERDE</span>
                <span>${CFG.VOLT_MAX} V</span>
              </div>
            </div>

            <!-- TEMPERATURA Y ENFRIAR -->
            <div class="ox-dark-card">
              <div class="ox-temp-row">
                <div>
                  <div class="ox-font-orbitron ox-temp-title">🌡️ TEMPERATURA DEL REACTOR</div>
                  <div data-el="tempFriendlyText" class="ox-temp-text">❄️ Fresquita y segura</div>
                </div>

                <button type="button" data-el="btnCool" class="ox-juicy-btn ox-font-orbitron ox-btn-cool">
                  <span>💦</span> <span data-el="coolLabel">ENFRIAR</span>
                </button>
              </div>
              <div class="ox-heat-track"><div data-el="heatBar" class="ox-heat-fill"></div></div>
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
            <h3 class="ox-font-orbitron ox-glow-green" style="margin:0;font-size:1.5rem;font-weight:900;">
              ¡OXÍGENO RESTAURADO AL 100%!
            </h3>
            <p style="margin:0;font-size:0.92rem;color:#e2e8f0;line-height:1.45;">
              ¡Excelente trabajo! Regulaste la celda de electrólisis a <strong>${metaInicial} V</strong> y llenaste todo el tanque de oxígeno puro para la Base Lunar Artemis.
            </p>
          </div>
        </div>

        <!-- 5. OVERLAY DE DERROTA -->
        <div data-el="defeatOverlay" class="ox-victory-overlay is-hidden">
          <div class="ox-chassis-panel ox-victory-card is-defeat">
            <div style="font-size:3.5rem;">🔥</div>
            <h3 class="ox-font-orbitron ox-glow-rose" style="margin:0;font-size:1.5rem;font-weight:900;">
              ¡REACTOR SOBRECALENTADO!
            </h3>
            <p style="margin:0;font-size:0.92rem;color:#e2e8f0;line-height:1.45;">
              Demasiado voltaje durante demasiado tiempo: la celda de electrólisis se apagó por seguridad. La producción de oxígeno sigue detenida.
            </p>
          </div>
        </div>
      </main>
    </div>
  `;

  // ------------------------------------------------------------- REFERENCIAS
  const q = (name) => contenedor.querySelector(`[data-el="${name}"]`);
  const chassis = q("chassis");
  const tankStage = q("tankStage");
  const tankCanvas = q("tankCanvas");
  const confettiCanvas = q("confettiCanvas");
  const crystalBtns = contenedor.querySelectorAll("[data-crystal]");
  const el = {
    slider: q("voltageSlider"),
    sliderBadge: q("sliderVoltBadge"),
    voltDisplay: q("currentVoltDisplay"),
    voltCard: q("currentVoltCard"),
    helperBadge: q("voltHelperBadge"),
    statusPill: q("statusPill"),
    artyText: q("artyText"),
    tempText: q("tempFriendlyText"),
    heatBar: q("heatBar"),
    btnCool: q("btnCool"),
    coolLabel: q("coolLabel"),
    progBar: q("oxygenProgressBar"),
    progText: q("oxygenPercentText"),
    victory: q("victoryOverlay"),
    defeat: q("defeatOverlay")
  };
  const tankCtx = tankCanvas.getContext("2d");
  const confettiCtx = confettiCanvas.getContext("2d");

  // ------------------------------------------------------------------ ESTADO
  const game = {
    targetVolt: metaInicial,
    currentVolt: CFG.VOLT_BASE,
    crystals: [false, false, false],
    zona: "bajo",            // "bajo" | "verde" | "caliente"
    oxygenProgress: 0,
    heat: 0,                 // 0..100
    coolCooldown: 0,         // segundos restantes
    sparkTimer: 0,
    finished: false,
    destroyed: false
  };
  const view = { w: 0, h: 0, dpr: 1 };
  const particles = [];
  const floatingScores = [];
  const confettiPieces = [];
  let rafId = null;
  let lastT = performance.now();
  let endTimer = null;
  let resizeObs = null;
  let statusKey = "";
  let tempKey = "";

  // ------------------------------------------------------------------- AUDIO
  // El AudioContext solo se crea tras un gesto del usuario (política de autoplay)
  // y se cierra al destruir la partida.
  let audioCtx = null;
  let audioArmed = false;
  const armAudio = () => { audioArmed = true; };
  chassis.addEventListener("pointerdown", armAudio, true);
  chassis.addEventListener("keydown", armAudio, true);

  function getAudioCtx() {
    if (!audioArmed || game.destroyed) return null;
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function blip({ type = "sine", f0, f1 = f0, dur = 0.1, vol = 0.18, delay = 0 }) {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const t = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.9);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur);
    } catch (_) { /* el audio nunca debe romper el juego */ }
  }

  const sfx = {
    enabled: true,
    crystalTap(active) {
      if (!this.enabled) return;
      blip({ type: "triangle", f0: active ? 520 : 310, f1: active ? 780 : 220, dur: 0.1, vol: 0.18 });
    },
    greenZoneLock() {
      if (!this.enabled) return;
      [523.25, 659.25, 783.99].forEach((f, i) => blip({ f0: f, dur: 0.18, vol: 0.16, delay: i * 0.06 }));
    },
    bubblePop(isGold) {
      if (!this.enabled) return;
      const f = isGold ? 720 : 540;
      blip({ f0: f, f1: f * 1.6, dur: 0.12, vol: 0.24 });
    },
    softSpark() {
      if (!this.enabled) return;
      blip({ type: "sawtooth", f0: 160, f1: 95, dur: 0.13, vol: 0.12 });
    },
    waterSplash() {
      if (!this.enabled) return;
      blip({ f0: 340, f1: 620, dur: 0.2, vol: 0.18 });
    },
    victoryFanfare() {
      if (!this.enabled) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        blip({ type: "triangle", f0: f, dur: 0.35, vol: 0.22, delay: i * 0.11 })
      );
    },
    defeatBuzz() {
      if (!this.enabled) return;
      [330, 262, 196].forEach((f, i) =>
        blip({ type: "sawtooth", f0: f, f1: f * 0.9, dur: 0.28, vol: 0.14, delay: i * 0.16 })
      );
    }
  };

  // ------------------------------------------------------------------- LÓGICA
  function calcZona() {
    const diff = game.currentVolt - game.targetVolt;
    if (diff >= 2) return "caliente";
    if (diff <= -2) return "bajo";
    return "verde";
  }

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

  // ÚNICA fuente de verdad del voltaje: los cristales. El slider y el display
  // siempre se derivan de ellos, así nunca pueden contradecirse.
  function setCristales(flags) {
    game.crystals = flags;
    let v = CFG.VOLT_BASE;
    flags.forEach((on, i) => { if (on) v += CFG.CRISTALES[i]; });
    game.currentVolt = v;
    [0, 1, 2].forEach(updateCrystalVisual);
    onVoltChanged();
  }

  function setVolt(v) {
    const n = Math.max(CFG.VOLT_BASE, Math.min(CFG.VOLT_MAX, v)) - CFG.VOLT_BASE; // 0..7
    setCristales([!!(n & 1), !!(n & 2), !!(n & 4)]);
  }

  function toggleCrystal(index) {
    if (game.finished) return;
    const flags = game.crystals.slice();
    flags[index] = !flags[index];
    sfx.crystalTap(flags[index]);
    setCristales(flags);
  }

  function onSliderChange(rawVal) {
    if (game.finished) return;
    let val = parseInt(rawVal, 10);
    if (Number.isNaN(val)) return;
    // Sin efecto imán: cada voltaje (1, 2, 3...) se puede alcanzar. La zona verde ya es meta ±1.
    setVolt(val);
  }

  function onVoltChanged() {
    const prevZona = game.zona;
    game.zona = calcZona();

    el.slider.value = game.currentVolt;
    el.sliderBadge.textContent = `${game.currentVolt} V`;
    el.voltDisplay.textContent = `${game.currentVolt} V`;

    el.voltCard.classList.remove("is-cyan", "is-green", "is-hot");
    if (game.zona === "verde") {
      el.voltDisplay.className = "ox-font-orbitron ox-meter-val ox-glow-green";
      el.voltCard.classList.add("is-green");
      el.helperBadge.textContent = "✅ ¡ZONA VERDE PERFECTA!";
      el.helperBadge.style.color = "#6ee7b7";
    } else if (game.zona === "bajo") {
      el.voltDisplay.className = "ox-font-orbitron ox-meter-val ox-glow-cyan";
      el.voltCard.classList.add("is-cyan");
      el.helperBadge.textContent = "⬆️ ¡Falta energía! Sube más";
      el.helperBadge.style.color = "#fcd34d";
    } else {
      el.voltDisplay.className = "ox-font-orbitron ox-meter-val ox-glow-rose";
      el.voltCard.classList.add("is-hot");
      el.helperBadge.textContent = "⬇️ ¡Mucha energía! Baja un poco";
      el.helperBadge.style.color = "#fda4af";
    }

    if (prevZona !== game.zona) {
      if (game.zona === "verde") sfx.greenZoneLock();
      // Al salir de la zona verde, las burbujas que quedan en pantalla ya no valen nada.
      if (prevZona === "verde") {
        for (const p of particles) if (p.type === "goldO2" || p.type === "cyanO2") p.type = "dimO2";
      }
    }
    renderStatus();
  }

  // Pastilla de estado + mensaje de Arty (solo se reescribe el DOM si algo cambió)
  function renderStatus() {
    const alerta = game.heat >= CFG.CALOR_ALERTA;
    const key = game.zona + (alerta ? "!" : "");
    if (key === statusKey) return;
    statusKey = key;

    const minGreen = game.targetVolt - 1;
    const maxGreen = game.targetVolt + 1;
    el.statusPill.classList.remove("is-green", "is-hot");

    if (game.zona === "verde") {
      el.statusPill.textContent = "🫧 ¡PRODUCIENDO O₂!";
      el.statusPill.classList.add("is-green");
      el.artyText.innerHTML =
        '<strong style="color:#6ee7b7;">¡Genial!</strong> El reactor está en zona verde generando oxígeno. <strong style="color:#fcd34d;">¡Toca las burbujas</strong> para llenar el tanque más rápido!';
    } else if (game.zona === "bajo") {
      el.statusPill.textContent = "⚡ SUBE EL VOLTAJE";
      el.artyText.innerHTML = `<strong style="color:#fcd34d;">Paso 1:</strong> Enciende cristales o mueve la palanca hasta la <strong style="color:#6ee7b7;">zona verde (${minGreen} V – ${maxGreen} V)</strong>.`;
    } else if (alerta) {
      el.statusPill.textContent = "🚨 ¡SE SOBRECALIENTA!";
      el.statusPill.classList.add("is-hot");
      el.artyText.innerHTML = `<strong style="color:#fda4af;">¡PELIGRO!</strong> El reactor está a punto de fallar. <strong style="color:#6ee7b7;">Baja el voltaje a ${game.targetVolt} V</strong> ya, o pulsa ENFRIAR para ganar tiempo.`;
    } else {
      el.statusPill.textContent = "🔥 DEMASIADA ENERGÍA";
      el.statusPill.classList.add("is-hot");
      el.artyText.innerHTML = `<strong style="color:#fda4af;">¡Uy, mucha energía!</strong> El reactor se está calentando. Baja la palanca hacia <strong style="color:#6ee7b7;">${game.targetVolt} V</strong> antes de que se sobrecaliente.`;
    }
  }

  function renderHeat() {
    const heat = Math.max(0, Math.min(100, game.heat));
    el.heatBar.style.width = `${heat.toFixed(1)}%`;
    const nivel = heat >= CFG.CALOR_ALERTA ? "danger" : heat >= 30 ? "warm" : "cool";
    el.heatBar.classList.toggle("is-warm", nivel === "warm");
    el.heatBar.classList.toggle("is-danger", nivel === "danger");

    const key = nivel + (game.zona === "caliente" ? "+" : "");
    if (key !== tempKey) {
      tempKey = key;
      if (nivel === "cool") {
        el.tempText.textContent = "❄️ Fresquita y segura";
        el.tempText.style.color = "#34d399";
      } else if (nivel === "warm") {
        el.tempText.textContent = game.zona === "caliente" ? "🌡️ Tibia · ¡Baja el voltaje!" : "🌡️ Tibia · Enfriándose";
        el.tempText.style.color = "#fcd34d";
      } else {
        el.tempText.textContent = "🔥 ¡PELIGRO! Baja el voltaje";
        el.tempText.style.color = "#fb7185";
      }
    }
    renderStatus();

    const cd = game.coolCooldown;
    el.btnCool.disabled = cd > 0 || game.finished;
    el.coolLabel.textContent = cd > 0 ? `${cd.toFixed(1)} s` : "ENFRIAR";
  }

  function coolReactor() {
    if (game.finished || game.coolCooldown > 0 || game.heat < 1) return;
    sfx.waterSplash();
    game.heat = Math.max(0, game.heat - CFG.ENFRIAR_RESTA);
    game.coolCooldown = CFG.ENFRIAR_COOLDOWN;
    for (let i = 0; i < 16; i++) {
      particles.push({
        x: Math.random() * (view.w || 300),
        y: 12 + Math.random() * 25,
        r: 4 + Math.random() * 4,
        vx: (Math.random() - 0.5) * 2.5,
        vy: 2.5 + Math.random() * 3,
        type: "coolDrop",
        life: 45
      });
    }
    renderHeat();
  }

  function addOxygenProgress(amount) {
    if (game.finished) return;
    game.oxygenProgress = Math.min(100, game.oxygenProgress + amount);
    const pct = Math.floor(game.oxygenProgress);
    el.progBar.style.width = `${game.oxygenProgress.toFixed(1)}%`;
    el.progText.textContent = `${pct}%`;
    if (game.oxygenProgress >= 100) triggerVictory();
  }

  function terminar(exito, retardoMs) {
    game.finished = true;
    // Bloquear controles (también por teclado) mientras se muestra el overlay final
    el.slider.disabled = true;
    crystalBtns.forEach((b) => { b.disabled = true; });
    endTimer = setTimeout(() => {
      endTimer = null;
      destruir();
      if (typeof onTerminar === "function") onTerminar({ exito });
    }, retardoMs);
  }

  function triggerVictory() {
    if (game.finished) return;
    el.victory.classList.remove("is-hidden");
    sfx.victoryFanfare();
    launchConfetti();
    terminar(true, CFG.RETARDO_VICTORIA_MS);
  }

  function triggerDefeat() {
    if (game.finished) return;
    game.heat = 100;
    renderHeat();
    el.defeat.classList.remove("is-hidden");
    sfx.defeatBuzz();
    shakeChassis();
    terminar(false, CFG.RETARDO_DERROTA_MS);
  }

  // Detiene todo y libera recursos. NO llama a onTerminar.
  function destruir() {
    if (game.destroyed) return;
    game.destroyed = true;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (endTimer) clearTimeout(endTimer);
    endTimer = null;
    if (resizeObs) resizeObs.disconnect();
    resizeObs = null;
    window.removeEventListener("resize", resizeCanvas);
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
    if (instancias.get(contenedor) === destruir) instancias.delete(contenedor);
  }

  // ------------------------------------------------------------- TAMAÑO CANVAS
  function resizeCanvas() {
    if (game.destroyed) return;
    const w = Math.floor(tankStage.clientWidth);
    const h = Math.floor(tankStage.clientHeight);
    if (w > 0 && h > 0) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      view.w = w;
      view.h = h;
      view.dpr = dpr;
      tankCanvas.width = Math.round(w * dpr);
      tankCanvas.height = Math.round(h * dpr);
    }
    const cw = Math.floor(chassis.clientWidth);
    const ch = Math.floor(chassis.clientHeight);
    if (cw > 0 && ch > 0) {
      confettiCanvas.width = cw;
      confettiCanvas.height = ch;
    }
  }

  // --------------------------------------------------------------- SIMULACIÓN
  function geom() {
    const { w, h } = view;
    return {
      w, h,
      anodeX: w * 0.24,
      cathodeX: w * 0.8,
      plateTop: h * 0.22,
      plateH: h * 0.66
    };
  }

  function spawnParticles(dt) {
    const g = geom();
    if (game.zona === "verde") {
      if (Math.random() < CFG.BURBUJAS_O2_POR_S * dt) {
        const isGold = Math.random() < CFG.PROB_DORADA;
        particles.push({
          x: g.anodeX + (Math.random() - 0.5) * 70,
          y: g.plateTop + Math.random() * g.plateH,
          r: isGold ? 18 : 14,
          vx: (Math.random() - 0.5) * 0.9,
          vy: -(1.1 + Math.random() * 1.1),
          type: isGold ? "goldO2" : "cyanO2",
          wobble: Math.random() * Math.PI * 2
        });
      }
      if (Math.random() < CFG.BURBUJAS_H2_POR_S * dt) {
        particles.push({
          x: g.cathodeX + (Math.random() - 0.5) * 45,
          y: g.plateTop + Math.random() * g.plateH,
          r: 7 + Math.random() * 4,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -(1.5 + Math.random() * 1.3),
          type: "purpleH2",
          wobble: Math.random() * Math.PI * 2
        });
      }
    } else if (game.zona === "caliente") {
      game.sparkTimer += dt;
      if (game.sparkTimer >= 0.3) {
        game.sparkTimer = 0;
        sfx.softSpark();
        if (game.heat >= 40) shakeChassis();
        for (let s = 0; s < 5; s++) {
          particles.push({
            x: g.anodeX + (Math.random() - 0.5) * 30,
            y: g.plateTop + Math.random() * g.plateH,
            r: 3,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            type: "heatSpark",
            life: 18
          });
        }
      }
    } else if (Math.random() < 1.5 * dt) {
      // Zona baja: burbujitas apagadas, decorativas, NO tocables
      particles.push({
        x: g.anodeX + (Math.random() - 0.5) * 40,
        y: g.plateTop + Math.random() * g.plateH,
        r: 11,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -0.9,
        type: "dimO2",
        wobble: Math.random() * Math.PI * 2
      });
    }
  }

  function updateParticles(dt) {
    const k = dt * 60; // factor para que la velocidad no dependa de los fps
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      switch (p.type) {
        case "goldO2":
        case "cyanO2":
        case "dimO2":
        case "purpleH2":
          p.wobble += 0.08 * k;
          p.x += (p.vx + Math.sin(p.wobble) * 0.45) * k;
          p.y += p.vy * k;
          if (p.y + p.r < 0) particles.splice(i, 1);
          break;
        case "starSpark":
        case "heatSpark":
          p.x += p.vx * k;
          p.y += p.vy * k;
          p.life -= k;
          if (p.life <= 0) particles.splice(i, 1);
          break;
        case "coolDrop":
          p.x += p.vx * k;
          p.y += p.vy * k;
          p.life -= k;
          if (p.life <= 0 || p.y > view.h) particles.splice(i, 1);
          break;
        case "waterRipple":
          p.r += 2.2 * k;
          p.life -= k;
          if (p.life <= 0) particles.splice(i, 1);
          break;
        default:
          particles.splice(i, 1);
      }
    }
    for (let i = floatingScores.length - 1; i >= 0; i--) {
      const fs = floatingScores[i];
      fs.y -= 78 * dt;
      fs.life -= dt;
      if (fs.life <= 0) floatingScores.splice(i, 1);
    }
  }

  function update(dt) {
    // Cooldown del botón
    if (game.coolCooldown > 0) game.coolCooldown = Math.max(0, game.coolCooldown - dt);

    if (!game.finished) {
      // Relleno pasivo (pequeño): las burbujas son lo que realmente acelera el tanque
      if (game.zona === "verde") addOxygenProgress(CFG.RELLENO_PASIVO * kRelleno * dt);

      // Calor
      if (game.zona === "caliente") {
        const diff = game.currentVolt - game.targetVolt;
        const rate = CFG.CALOR_POR_S[Math.min(diff, 4) - 2];
        game.heat = Math.min(100, game.heat + rate * kCalor * dt);
      } else {
        game.heat = Math.max(0, game.heat - CFG.ENFRIAMIENTO_PASIVO * dt);
      }
      renderHeat();
      if (game.heat >= 100) triggerDefeat();
    } else {
      renderHeat();
    }

    if (!game.finished) spawnParticles(dt);
    updateParticles(dt);
  }

  // ------------------------------------------------------------------- DIBUJO
  function drawTank() {
    const { w, h, dpr } = view;
    if (!w || !h) return;
    const ctx = tankCtx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const g = geom();
    const verde = game.zona === "verde";

    const waterGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (verde) {
      waterGrad.addColorStop(0, "rgba(16, 185, 129, 0.22)");
      waterGrad.addColorStop(1, "rgba(6, 182, 212, 0.34)");
    } else if (game.zona === "caliente") {
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
    ctx.strokeStyle = verde ? "rgba(74, 222, 128, 0.65)" : "rgba(148, 163, 184, 0.35)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(w * 0.58, 10);
    ctx.lineTo(w * 0.58, h - 10);
    ctx.stroke();
    ctx.restore();

    // Electrodos
    const plate = (cx, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cx - 10, g.plateTop, 20, g.plateH, 8);
      else ctx.rect(cx - 10, g.plateTop, 20, g.plateH);
      ctx.fill();
    };
    ctx.font = "bold 14px Orbitron, sans-serif";
    ctx.textAlign = "center";
    plate(g.anodeX, verde ? "#22d3ee" : "#38bdf8");
    ctx.fillStyle = "#082f49";
    ctx.fillText("O₂", g.anodeX, g.plateTop + g.plateH / 2 + 5);
    plate(g.cathodeX, "#c084fc");
    ctx.fillStyle = "#3b0764";
    ctx.fillText("H₂", g.cathodeX, g.plateTop + g.plateH / 2 + 5);

    // Partículas
    for (const p of particles) {
      if (p.type === "goldO2" || p.type === "cyanO2" || p.type === "dimO2" || p.type === "purpleH2") {
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
        } else if (p.type === "dimO2") {
          ctx.fillStyle = "rgba(148, 163, 184, 0.28)";
          ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
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
        ctx.fillStyle = p.type === "starSpark" ? "#fde047" : "#fb7185";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "coolDrop") {
        ctx.fillStyle = "rgba(125, 211, 252, 0.85)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "waterRipple") {
        ctx.strokeStyle = `rgba(103, 232, 249, ${Math.max(0, p.life / 16)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    for (const fs of floatingScores) {
      ctx.save();
      ctx.font = "bold 16px Fredoka, sans-serif";
      ctx.fillStyle = fs.color;
      ctx.textAlign = "center";
      ctx.globalAlpha = Math.max(0, Math.min(1, fs.life / 0.25));
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

  function updateConfetti(dt) {
    const k = dt * 60;
    const ctx = confettiCtx;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    for (let i = confettiPieces.length - 1; i >= 0; i--) {
      const c = confettiPieces[i];
      c.x += c.vx * k;
      c.y += c.vy * k;
      c.vy += 0.35 * k;
      c.rot += c.vrot * k;
      c.life -= k;
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

  // ------------------------------------------------------------------ BUCLE
  function frame(now) {
    if (game.destroyed) return;
    // Si el HTML del juego salió del DOM (modal removido), se autolimpia.
    if (!chassis.isConnected) {
      destruir();
      return;
    }
    rafId = requestAnimationFrame(frame);

    let dt = (now - lastT) / 1000;
    lastT = now;
    if (!(dt > 0)) dt = 1 / 60;
    dt = Math.min(dt, 0.1);

    // Si el modal está oculto (display:none) el juego queda en PAUSA: no avanza,
    // no gana y no pierde mientras nadie lo está viendo.
    if (chassis.getClientRects().length === 0) return;

    update(dt);
    drawTank();
    updateConfetti(dt);
  }

  // ----------------------------------------------------------------- EVENTOS
  q("btnAudio").addEventListener("click", () => {
    sfx.enabled = !sfx.enabled;
    q("audioIcon").textContent = sfx.enabled ? "🔊" : "🔇";
    if (sfx.enabled) sfx.crystalTap(true);
  });

  crystalBtns.forEach((btn, idx) => {
    btn.addEventListener("click", () => toggleCrystal(idx));
  });

  el.slider.addEventListener("input", (e) => onSliderChange(e.target.value));
  el.btnCool.addEventListener("click", coolReactor);

  tankCanvas.addEventListener("pointerdown", (e) => {
    if (game.finished) return;
    const rect = tankCanvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    let poppedAny = false;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (p.type !== "goldO2" && p.type !== "cyanO2") continue; // las apagadas no se explotan
      if (Math.hypot(p.x - px, p.y - py) > p.r + 22) continue;

      poppedAny = true;
      const isGold = p.type === "goldO2";
      particles.splice(i, 1);

      const gain = isGold ? CFG.GANANCIA_DORADA : CFG.GANANCIA_BURBUJA;
      addOxygenProgress(gain);
      sfx.bubblePop(isGold);
      floatingScores.push({
        x: p.x,
        y: p.y,
        text: isGold ? `+${gain}% O₂ ⭐` : `+${gain}% O₂`,
        color: isGold ? "#fde047" : "#67e8f9",
        life: 0.6
      });
      for (let k = 0; k < 8; k++) {
        const angle = (Math.PI * 2 * k) / 8;
        particles.push({
          x: p.x, y: p.y, r: 3.5,
          vx: Math.cos(angle) * 3.5,
          vy: Math.sin(angle) * 3.5,
          type: "starSpark",
          life: 20
        });
      }
      break;
    }

    if (!poppedAny) particles.push({ x: px, y: py, r: 5, type: "waterRipple", life: 16 });
  });

  if (typeof ResizeObserver !== "undefined") {
    resizeObs = new ResizeObserver(() => resizeCanvas());
    resizeObs.observe(tankStage);
    resizeObs.observe(chassis);
  } else {
    window.addEventListener("resize", resizeCanvas);
  }

  // ------------------------------------------------------------- INICIALIZAR
  instancias.set(contenedor, destruir);
  [0, 1, 2].forEach(updateCrystalVisual);
  onVoltChanged();
  renderHeat();
  resizeCanvas();
  rafId = requestAnimationFrame((t) => {
    lastT = t;
    frame(t);
  });

  return destruir;
}