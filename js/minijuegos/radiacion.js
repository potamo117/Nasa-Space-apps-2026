import "../ui/iconos.js";
import { nivelDe } from "../core/dificultad.js";
import { eventoSolarDestacado, textoDonki } from "../core/donki.js";
import { t } from "../core/i18n.js";

export function iniciar(contenedor, onTerminar) {
  // Cargar CSS automáticamente si se abre desde el index.html principal
  if (!document.querySelector('link[href*="radiacion.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('../../css/radiacion.css', import.meta.url).href;
    document.head.appendChild(link);
  }

  // Inyectar interfaz del minijuego dentro del contenedor asignado
  contenedor.innerHTML = `
    <div class="lg-wrapper" data-el="app">
      <div class="lg-scene" data-el="scene">
        <canvas data-el="skyCanvas" aria-hidden="true"></canvas>
        <svg data-el="sceneSvg" preserveAspectRatio="none" aria-hidden="true"></svg>
        <div class="lg-zones" data-el="zones"></div>
        <canvas class="lg-fx-canvas" data-el="fxCanvas" aria-hidden="true"></canvas>
        <div class="lg-scene-banner" data-el="sceneBanner" aria-live="assertive"></div>
      </div>

      <div class="lg-hud lg-hud-top">
        <div class="lg-hud-group">
          <div class="lg-pill">${t('Oleada')} <b data-el="waveValue">1</b>/<span data-el="waveTotal">1</span></div>
          <div class="lg-pill risk" data-el="statRisk">☀️ ${t('Riesgo')} <b data-el="riskValue">85</b></div>
        </div>

        <div class="lg-timer" data-el="statTimer" aria-label="${t('Tiempo restante')}">
          <svg class="lg-timer-ring" viewBox="0 0 44 44" aria-hidden="true">
            <circle class="lg-ring-bg" cx="22" cy="22" r="19" />
            <circle class="lg-ring-fg" data-el="timerRing" cx="22" cy="22" r="19" />
          </svg>
          <b data-el="timerValue">30</b>
        </div>

        <div class="lg-hud-group right">
          <div class="lg-pill">⭐ <b data-el="scoreValue">0</b></div>
          <button class="lg-icon-btn" data-el="btnSound" type="button" aria-label="${t('Sonido')}">🔊</button>
          <button class="lg-icon-btn" data-el="btnPause" type="button" aria-label="${t('Pausa')}">⏸</button>
        </div>
      </div>

      <div class="lg-hud lg-hud-bottom">
        <div class="lg-helper">
          <div class="lg-bubble" data-el="bubble" aria-live="polite"></div>
          <div class="lg-mascot" data-el="mascot" data-mood="neutral"></div>
        </div>
        <div class="lg-tray">
          <div class="lg-plates" data-el="plates"></div>
          <span class="lg-count-pill" data-el="trayCount">3/3</span>
        </div>
      </div>

      <div class="lg-overlay" data-el="overlay" hidden>
        <div class="lg-modal" data-el="modal" role="dialog" aria-modal="true"></div>
      </div>
    </div>
  `;

  const q = (name) => contenedor.querySelector(`[data-el="${name}"]`);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /* ---------------- CONFIGURACIÓN (1 SOLA OLEADA) ---------------- */
  const CONFIG = {
    platesPerWave: 3,
    points: { perZone: 100, perSecondLeft: 10, perSparePlate: 25 },
    waveEscalation: [
      { riskAdd: 0, radiationFactor: 1.0 }
    ],
    impactDurationMs: 1700
  };

  function getDifficulty(riskScore) {
    const risk = clamp(Math.round(Number(riskScore) || 0), 0, 100);
    let tier;
    if (risk < 60) tier = { id: 'moderado', label: t('Moderado'), zones: 2, color: '#facc15', emoji: '🌤️' };
    else if (risk < 88) tier = { id: 'elevado', label: t('Elevado'), zones: 2, color: '#fb923c', emoji: '☀️' };
    else tier = { id: 'extremo', label: t('Extremo'), zones: 3, color: '#f43f5e', emoji: '🔥' };

    return {
      risk,
      tier,
      uncoveredZones: tier.zones,
      timeLimit: clamp(Math.round(30 - (risk - 85) * 0.77), 18, 35),
      particleRate: 1.5 + (risk / 100) * 4.5,
      particleSpeed: 0.8 + (risk / 100) * 0.7
    };
  }

  function buildWaves() {
    // Riesgo según la fulguración real más fuerte de NASA DONKI (si hay datos) y la dificultad adaptativa.
    const dk = eventoSolarDestacado();
    const ajuste = (nivelDe('radiacion') - 1) * 4;
    const baseRisk = dk
      ? clamp(dk.riesgo + ajuste, 60, 98)
      : clamp(Math.floor(Math.random() * 26) + 70 + ajuste, 60, 98);
    const baseRad = +(baseRisk * 0.14).toFixed(1);
    return CONFIG.waveEscalation.map((step, i) => {
      const risk = clamp(baseRisk + step.riskAdd, 0, 100);
      const rad = Math.round(baseRad * step.radiationFactor * 10) / 10;
      return Object.assign({ number: i + 1, radiation: rad, plates: CONFIG.platesPerWave }, getDifficulty(risk));
    });
  }

  const W = 1000;
  const H = 625;
  const TAU = Math.PI * 2;
  const SUN = { x: 78, y: 86, r: 60 };
  const MODULES = [
    { id: 'lab', name: t('Laboratorio'), icon: '🔬', x: 330, y: 330, w: 205, h: 150, windows: [0.3, 0.7] },
    { id: 'dorm', name: t('Dormitorio'), icon: '🛏️', x: 555, y: 295, w: 220, h: 185, windows: [0.22, 0.5, 0.78] },
    { id: 'ctrl', name: t('Control'), icon: '📡', x: 795, y: 330, w: 180, h: 150, windows: [0.5] }
  ];
  const ROOF = { height: 52, inset: 6, gap: 8 };

  function getSlots(m) {
    const inner = m.w - ROOF.inset * 2;
    const sw = (inner - ROOF.gap * 3) / 2;
    return [0, 1].map((i) => ({
      x: m.x + ROOF.inset + ROOF.gap + i * (sw + ROOF.gap),
      y: m.y - ROOF.height + 5,
      w: sw,
      h: ROOF.height - 6
    }));
  }

  const TEXT = {
    intro: t('¡Hola! Soy <b>Lumi</b> 🤖. El Sol está lanzando una <b>tormenta solar</b>. ¿Me ayudas a proteger el refugio?'),
    start: t('¡Arrastra las placas blancas a las <b>zonas amarillas</b> ⚠️!'),
    selected: t('¡Bien! Ahora toca una <b>zona amarilla</b> ⚠️ para colocar la placa.'),
    needPlate: t('Primero elige una <b>placa de polietileno</b> de abajo 👇'),
    alreadySafe: t('Esa zona ya está protegida ✅. ¡Busca una zona amarilla!'),
    missed: t('Casi... suelta la placa <b>justo encima</b> de una zona amarilla ⚠️'),
    praise: ['¡Excelente! 🛡️', '¡Muy bien, guardián! ✨', '¡Zona protegida! 💚', '¡Así se hace! 🚀', '¡Genial! Los astronautas te lo agradecen 👩‍🚀'].map((x) => t(x)),
    leak: (name) => t('¡Ay! Entran partículas al <b>{name}</b>. ¡Ponle una placa!', { name }),
    hurry: t('¡Rápido! ⏰ La oleada está por llegar.'),
    allDone: t('¡Lo lograste! Todo el refugio está blindado 🎉'),
    paused: t('Juego en pausa. ¡Aquí te espero! 😊'),
    tierBrief: {
      moderado: t('El Sol está un poco inquieto. ¡Cubre las zonas descubiertas antes de que llegue la tormenta!'),
      elevado: t('Se acerca una tormenta fuerte. Cubre las zonas descubiertas antes de que llegue la oleada.'),
      extremo: t('¡Tormenta muy intensa! Hay 3 zonas descubiertas y poco tiempo. ¡Sé muy rápido!')
    }
  };

  const FACTS = [
    t('A veces el Sol lanza "estornudos" de energía llamados <b>estallidos solares</b>. ¡Sus partículas viajan rapidísimo por el espacio!'),
    t('En la Tierra, el aire y el campo magnético nos protegen. La Luna casi no tiene aire ni campo magnético, por eso los astronautas necesitan <b>escudos</b>.'),
    t('El <b>polietileno</b> es un plástico con muchísimo hidrógeno, y el hidrógeno es muy bueno para frenar las partículas del Sol.'),
    t('La radiación se mide con unidades como el <b>microgray (μGy)</b>. Un número más grande significa más radiación.')
  ];

  /* ---------------- AUDIO SINTETIZADO ---------------- */
  let audioCtx = null;
  let muted = false;

  function getAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, dur, opts = {}) {
    if (muted) return;
    const c = getAudio();
    if (!c) return;
    const o = Object.assign({ type: 'sine', vol: 0.12, delay: 0, slide: 0 }, opts);
    const t = c.currentTime + o.delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = o.type;
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + o.slide), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(o.vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  function whoosh(dur, vol) {
    if (muted) return;
    const c = getAudio();
    if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, c.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2200, c.currentTime + dur);
    const gain = c.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(c.destination);
    src.start();
  }

  let lastHitSound = 0;
  const Sound = {
    unlock() { if (!muted) getAudio(); },
    toggle() {
      muted = !muted;
      if (!muted) getAudio();
      return muted;
    },
    click() { tone(520, 0.07, { type: 'triangle', vol: 0.08 }); },
    select() { tone(660, 0.09, { type: 'triangle', vol: 0.1 }); },
    place() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, { type: 'triangle', vol: 0.11, delay: i * 0.06 })); },
    wrong() { tone(220, 0.22, { type: 'sawtooth', vol: 0.05, slide: -90 }); },
    tick() { tone(880, 0.06, { type: 'square', vol: 0.035 }); },
    go() { tone(988, 0.25, { type: 'triangle', vol: 0.12 }); },
    hit() {
      const now = performance.now();
      if (now - lastHitSound < 160) return;
      lastHitSound = now;
      tone(300, 0.07, { type: 'square', vol: 0.025, slide: -140 });
    },
    wave() { whoosh(1.5, 0.22); },
    success() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.11, delay: i * 0.09 })); },
    warning() {
      tone(440, 0.22, { type: 'sawtooth', vol: 0.05 });
      tone(330, 0.32, { type: 'sawtooth', vol: 0.05, delay: 0.24 });
    }
  };

  /* ---------------- ESCENARIO SVG Y CANVAS ---------------- */
  const view = { s: 1, ox: 0, oy: 0, vw: W, vh: H };
  const toScreen = (x, y) => ({ x: (x + view.ox) * view.s, y: (y + view.oy) * view.s });

  function buildSceneSVG(svg) {
    const connectors = MODULES.slice(0, -1).map((m, i) => {
      const n = MODULES[i + 1];
      const x = m.x + m.w - 14;
      return `<rect x="${x}" y="402" width="${n.x - x + 14}" height="44" rx="12" fill="#c7d0ee" stroke="#5d6aa0" stroke-width="4"/>
              <rect x="${x}" y="418" width="${n.x - x + 14}" height="6" fill="#8f9cc8" opacity=".6"/>`;
    }).join('');

    const modulesHTML = MODULES.map((m, i) => {
      const wr = Math.min(19, m.h * 0.12);
      const windows = (m.windows || []).map((f) =>
        `<circle cx="${m.x + m.w * f}" cy="${m.y + m.h * 0.36}" r="${wr}" fill="url(#lgWindow)" stroke="#5d6aa0" stroke-width="4"/>
         <circle cx="${m.x + m.w * f - wr * 0.35}" cy="${m.y + m.h * 0.36 - wr * 0.35}" r="${wr * 0.25}" fill="#fff" opacity=".7"/>`
      ).join('');
      return `
      <g>
        <rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" rx="26" fill="url(#lgModule)" stroke="#5d6aa0" stroke-width="4"/>
        <rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" rx="26" fill="url(#lgHex)"/>
        <rect x="${m.x + 12}" y="${m.y + m.h - 22}" width="${m.w - 24}" height="7" rx="3.5" fill="#8f9cc8" opacity=".55"/>
        ${windows}
        <rect class="lg-module-glow" data-glow="${i}" x="${m.x + 4}" y="${m.y + 4}" width="${m.w - 8}" height="${m.h - 8}" rx="22" fill="#ff4d6d"/>
        <rect x="${m.x + ROOF.inset}" y="${m.y - ROOF.height}" width="${m.w - ROOF.inset * 2}" height="${ROOF.height + 8}" rx="14" fill="url(#lgRoof)" stroke="#333d69" stroke-width="4"/>
        <rect x="${m.x + ROOF.inset}" y="${m.y - ROOF.height}" width="${m.w - ROOF.inset * 2}" height="${ROOF.height + 8}" rx="14" fill="url(#lgHexDark)"/>
        <circle cx="${m.x + ROOF.inset + 10}" cy="${m.y - ROOF.height + 10}" r="3" fill="#c7d0ee"/>
        <circle cx="${m.x + m.w - ROOF.inset - 10}" cy="${m.y - ROOF.height + 10}" r="3" fill="#c7d0ee"/>
      </g>`;
    }).join('');

    svg.innerHTML = `
    <defs>
      <linearGradient id="lgGround" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#9aa3c9"/><stop offset=".35" stop-color="#6c76a3"/><stop offset="1" stop-color="#363d66"/>
      </linearGradient>
      <linearGradient id="lgHill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#525a8c"/><stop offset="1" stop-color="#2c3160"/>
      </linearGradient>
      <linearGradient id="lgModule" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f3f6ff"/><stop offset="1" stop-color="#b3bfe3"/>
      </linearGradient>
      <linearGradient id="lgRoof" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8794bd"/><stop offset="1" stop-color="#56628c"/>
      </linearGradient>
      <radialGradient id="lgWindow" cx=".4" cy=".4" r=".7">
        <stop offset="0" stop-color="#d6fbff"/><stop offset=".5" stop-color="#4fd1ee"/><stop offset="1" stop-color="#1e6b9a"/>
      </radialGradient>
      <pattern id="lgHex" width="18" height="16" patternUnits="userSpaceOnUse">
        <path d="M4.5 0h9l4.5 8-4.5 8h-9L0 8z" fill="none" stroke="#5d6aa0" stroke-opacity=".12" stroke-width="1.2"/>
      </pattern>
      <pattern id="lgHexDark" width="18" height="16" patternUnits="userSpaceOnUse">
        <path d="M4.5 0h9l4.5 8-4.5 8h-9L0 8z" fill="none" stroke="#ffffff" stroke-opacity=".14" stroke-width="1.2"/>
      </pattern>
    </defs>

    <path d="M-3000 420 L-1200 420 C -900 395, -700 430, -500 412 S -150 400, 0 432 C 90 398, 170 408, 250 426 S 420 396, 520 416 S 720 392, 820 418 S 950 402, 1000 410 C 1150 395, 1300 425, 1500 405 S 1900 420, 2200 410 L4000 410 V625 H-3000Z" fill="url(#lgHill)"/>
    <path d="M-3000 494 L-1500 494 C -1000 478, -500 500, 0 490 C 150 470, 300 462, 480 471 S 820 466, 1000 464 C 1300 470, 1600 455, 2200 470 L4000 470 V625 H-3000Z" fill="url(#lgGround)"/>

    <g opacity=".95">
      <ellipse cx="135" cy="560" rx="78" ry="17" fill="#8790bb"/><ellipse cx="135" cy="563" rx="64" ry="12" fill="#454c7a"/>
      <ellipse cx="470" cy="588" rx="52" ry="11" fill="#7e87b3"/><ellipse cx="470" cy="590" rx="41" ry="8" fill="#41487a"/>
      <ellipse cx="780" cy="560" rx="38" ry="9" fill="#7e87b3"/><ellipse cx="780" cy="562" rx="29" ry="6" fill="#41487a"/>
      <ellipse cx="935" cy="603" rx="62" ry="12" fill="#7e87b3"/><ellipse cx="935" cy="606" rx="49" ry="8" fill="#41487a"/>
      <ellipse cx="250" cy="515" rx="22" ry="5" fill="#4b5285"/>
    </g>

    <g>
      <line x1="292" y1="478" x2="292" y2="372" stroke="#a9b4dc" stroke-width="5" stroke-linecap="round"/>
      <path d="M268 360 Q 292 392 318 360 Z" fill="#dfe6ff" stroke="#5d6aa0" stroke-width="3"/>
      <circle class="lg-blink-light" cx="292" cy="352" r="5" fill="#4ade80"/>
    </g>

    ${connectors}
    ${modulesHTML}

    <path d="M300 494 C 318 466, 338 470, 352 474 L 968 474 C 986 470, 1000 482, 1000 494 Z" fill="#5d6593"/>
    <g fill="#4a5283">
      <ellipse cx="380" cy="486" rx="14" ry="5"/><ellipse cx="610" cy="488" rx="10" ry="4"/><ellipse cx="860" cy="487" rx="16" ry="5"/>
    </g>`;
  }

  const PARTICLE_COLORS = [[255, 214, 102], [255, 159, 28], [255, 120, 90], [255, 236, 170]];

  class Scene {
    constructor(opts) {
      this.root = opts.root;
      this.sky = opts.sky;
      this.svg = opts.svg;
      this.fx = opts.fx;
      this.onResize = null;
      this.sctx = this.sky.getContext('2d');
      this.fctx = this.fx.getContext('2d');
      this.bg = document.createElement('canvas');

      this.particles = [];
      this.sparks = [];
      this.rings = [];
      this.stars = [];

      this.spawnRate = 0.8;
      this.speedMul = 1;
      this.intensity = 0.3;
      this.flash = 0;
      this.waveUntil = 0;
      this.acc = 0;
      this.paused = false;

      this.targetPicker = null;
      this.resolveHit = null;
      this.onLeak = null;

      this.resize = this.resize.bind(this);
      window.addEventListener('resize', this.resize);
      this.ro = 'ResizeObserver' in window ? new ResizeObserver(this.resize) : null;
      if (this.ro) this.ro.observe(this.root);
      this.resize();
    }

    destroy() {
      window.removeEventListener('resize', this.resize);
      if (this.ro) this.ro.disconnect();
    }

    resize() {
      if (!contenedor.isConnected) return;
      const rect = this.root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const s = Math.min(rect.width / W, rect.height / H);
      view.s = s;
      view.vw = rect.width / s;
      view.vh = rect.height / s;
      view.ox = (view.vw - W) / 2;
      view.oy = view.vh - H;
      this.root.style.setProperty('--s', s.toFixed(4));
      if (this.svg) this.svg.setAttribute('viewBox', `${-view.ox} ${-view.oy} ${view.vw} ${view.vh}`);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      [this.sky, this.fx, this.bg].forEach((c) => { c.width = w; c.height = h; });
      this.k = dpr * s;
      this.makeStars();
      this.paintBackground();
      if (this.onResize) this.onResize();
    }

    world(c) {
      c.setTransform(this.k, 0, 0, this.k, this.k * view.ox, this.k * view.oy);
    }

    makeStars() {
      const area = view.vw * (430 + view.oy);
      const n = Math.max(80, Math.min(350, Math.round((150 * area) / (W * 430))));
      this.stars = [];
      for (let i = 0; i < n; i++) {
        this.stars.push({
          x: -view.ox + Math.random() * view.vw,
          y: -view.oy + Math.random() * (430 + view.oy),
          r: Math.random() * 1.5 + 0.5,
          ph: Math.random() * TAU,
          sp: 0.6 + Math.random() * 2.2
        });
      }
    }

    paintBackground() {
      const c = this.bg.getContext('2d');
      this.world(c);
      const g = c.createLinearGradient(0, -view.oy, 0, H);
      g.addColorStop(0, '#070a26');
      g.addColorStop(0.55, '#17134c');
      g.addColorStop(1, '#2b1d63');
      c.fillStyle = g;
      c.fillRect(-view.ox, -view.oy, view.vw, view.vh);

      const glow = (x, y, r, col) => {
        const n = c.createRadialGradient(x, y, 0, x, y, r);
        n.addColorStop(0, col);
        n.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = n;
        c.fillRect(x - r, y - r, r * 2, r * 2);
      };
      glow(640, 120, 330, 'rgba(124, 92, 255, 0.22)');
      glow(400, 270, 260, 'rgba(56, 189, 248, 0.12)');
      glow(110, 90, 320, 'rgba(255, 140, 66, 0.2)');

      // La Tierra
      const ex = 905, ey = 95, er = 24;
      glow(ex, ey, er * 2.3, 'rgba(120, 200, 255, 0.35)');
      c.save();
      c.beginPath(); c.arc(ex, ey, er, 0, TAU); c.clip();
      const eg = c.createRadialGradient(ex - 8, ey - 8, 2, ex, ey, er);
      eg.addColorStop(0, '#7dd3fc'); eg.addColorStop(1, '#1d4ed8');
      c.fillStyle = eg; c.fillRect(ex - er, ey - er, er * 2, er * 2);
      c.fillStyle = '#4ade80';
      c.beginPath(); c.ellipse(ex - 7, ey - 3, 9, 6, 0.6, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(ex + 9, ey + 9, 7, 5, -0.4, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.75)';
      c.beginPath(); c.ellipse(ex + 2, ey - 14, 10, 3, 0, 0, TAU); c.fill();
      c.restore();
    }

    spawn(speedFactor) {
      if (!this.targetPicker || this.particles.length > 220) return;
      const t = this.targetPicker();
      if (!t) return;
      const a = -0.7 + Math.random() * 1.8;
      const sx = SUN.x + Math.cos(a) * SUN.r * 0.8;
      const sy = SUN.y + Math.sin(a) * SUN.r * 0.8;
      const dist = Math.hypot(t.x - sx, t.y - sy);
      const speed = (230 + Math.random() * 150) * this.speedMul * speedFactor;
      this.particles.push({
        sx, sy, tx: t.x, ty: t.y,
        cx: (sx + t.x) / 2 + (Math.random() - 0.5) * 220,
        cy: (sy + t.y) / 2 - Math.random() * 140,
        t: 0, dur: dist / speed, x: sx, y: sy, trail: [],
        col: PARTICLE_COLORS[(Math.random() * PARTICLE_COLORS.length) | 0],
        size: 3 + Math.random() * 3, target: t, state: 'fly', life: 1
      });
    }

    resolve(p) {
      const res = this.resolveHit ? this.resolveHit(p.target) : 'shield';
      if (res === 'open') {
        const dx = 2 * (p.tx - p.cx);
        const dy = 2 * (p.ty - p.cy);
        const len = Math.hypot(dx, dy) || 1;
        p.vx = (dx / len) * 160;
        p.vy = Math.abs(dy / len) * 160 + 60;
        p.state = 'leak';
        p.life = 1;
        if (this.onLeak) this.onLeak(p.target);
      } else {
        p.state = 'dead';
        this.burst(p.tx, p.ty, res === 'fixed' ? [74, 222, 128] : [158, 197, 255], res === 'fixed' ? 8 : 5, true);
      }
    }

    update(dt, now) {
      const waving = now < this.waveUntil;
      this.acc += dt * (waving ? 75 : this.spawnRate);
      let guard = 0;
      while (this.acc >= 1 && guard++ < 12) { this.acc -= 1; this.spawn(waving ? 1.7 : 1); }
      if (this.acc > 12) this.acc = 0;

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        if (p.state === 'fly') {
          p.t += dt;
          const u = Math.min(1, p.t / p.dur);
          const iu = 1 - u;
          p.x = iu * iu * p.sx + 2 * iu * u * p.cx + u * u * p.tx;
          p.y = iu * iu * p.sy + 2 * iu * u * p.cy + u * u * p.ty;
          if (u >= 1) this.resolve(p);
        } else if (p.state === 'leak') {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt * 3.2;
          if (p.life <= 0) p.state = 'dead';
        }
        p.trail.push(p.x, p.y);
        if (p.trail.length > 16) p.trail.splice(0, 2);
        if (p.state === 'dead') this.particles.splice(i, 1);
      }

      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i];
        s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 260 * dt; s.life -= dt * 1.8;
        if (s.life <= 0) this.sparks.splice(i, 1);
      }
      for (let i = this.rings.length - 1; i >= 0; i--) {
        const r = this.rings[i];
        r.r += dt * 160; r.life -= dt * 1.6;
        if (r.life <= 0) this.rings.splice(i, 1);
      }
      this.flash = Math.max(0, this.flash - dt * 0.9);
    }

    burst(x, y, rgb, n, up) {
      for (let i = 0; i < n; i++) {
        const a = up ? -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1 : Math.random() * TAU;
        const sp = 80 + Math.random() * 180;
        this.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, rgb, r: 1.6 + Math.random() * 2.2 });
      }
    }

    celebrate(x, y) {
      this.burst(x, y, [74, 222, 128], 26, false);
      this.burst(x, y, [255, 255, 255], 10, false);
      this.rings.push({ x, y, r: 10, life: 1, rgb: [74, 222, 128] });
    }

    bigWave(seconds) {
      this.waveUntil = performance.now() + seconds * 1000;
      this.flash = 1;
    }

    drawSun(c, t) {
      const k = this.intensity;
      const pulse = Math.sin(t * 3) * 0.5 + 0.5;
      const glowR = SUN.r * (2.4 + k * 1.4 + this.flash * 1.6 + pulse * 0.2);
      const g = c.createRadialGradient(SUN.x, SUN.y, SUN.r * 0.6, SUN.x, SUN.y, glowR);
      g.addColorStop(0, `rgba(255, 200, 90, ${0.55 + k * 0.3})`);
      g.addColorStop(0.4, `rgba(255, 140, 50, ${0.22 + k * 0.2})`);
      g.addColorStop(1, 'rgba(255, 100, 40, 0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(SUN.x, SUN.y, glowR, 0, TAU); c.fill();

      c.save();
      c.translate(SUN.x, SUN.y);
      c.rotate(t * 0.15);
      c.fillStyle = `rgba(255, 210, 110, ${0.35 + k * 0.3})`;
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const len = SUN.r * (1.45 + 0.25 * Math.sin(t * 2 + i * 1.7) + k * 0.35);
        c.beginPath();
        c.moveTo(Math.cos(a - 0.1) * SUN.r * 0.9, Math.sin(a - 0.1) * SUN.r * 0.9);
        c.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        c.lineTo(Math.cos(a + 0.1) * SUN.r * 0.9, Math.sin(a + 0.1) * SUN.r * 0.9);
        c.closePath(); c.fill();
      }
      c.restore();

      const cg = c.createRadialGradient(SUN.x - SUN.r * 0.3, SUN.y - SUN.r * 0.3, SUN.r * 0.1, SUN.x, SUN.y, SUN.r);
      cg.addColorStop(0, '#fffbe0');
      cg.addColorStop(0.5, '#ffd166');
      cg.addColorStop(1, '#ff8c2a');
      c.fillStyle = cg;
      c.beginPath(); c.arc(SUN.x, SUN.y, SUN.r, 0, TAU); c.fill();
    }

    draw(t) {
      const c = this.sctx;
      if (!this.k) return;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(this.bg, 0, 0);
      this.world(c);
      c.fillStyle = '#ffffff';
      for (const s of this.stars) {
        c.globalAlpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
        c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
      this.drawSun(c, t);

      const f = this.fctx;
      f.setTransform(1, 0, 0, 1, 0, 0);
      f.clearRect(0, 0, this.fx.width, this.fx.height);
      this.world(f);
      f.globalCompositeOperation = 'lighter';
      f.lineCap = 'round';

      for (const p of this.particles) {
        const a = p.state === 'leak' ? Math.max(0, p.life) : 1;
        const [r, g, b] = p.state === 'leak' ? [255, 70, 90] : p.col;
        const tr = p.trail;
        if (tr.length > 3) {
          f.strokeStyle = `rgba(${r},${g},${b},${0.35 * a})`;
          f.lineWidth = p.size;
          f.beginPath();
          f.moveTo(tr[0], tr[1]);
          for (let i = 2; i < tr.length; i += 2) f.lineTo(tr[i], tr[i + 1]);
          f.stroke();
        }
        f.fillStyle = `rgba(${r},${g},${b},${0.4 * a})`;
        f.beginPath(); f.arc(p.x, p.y, p.size * 2.2, 0, TAU); f.fill();
        f.fillStyle = `rgba(255,255,235,${a})`;
        f.beginPath(); f.arc(p.x, p.y, p.size * 0.75, 0, TAU); f.fill();
      }

      for (const s of this.sparks) {
        f.fillStyle = `rgba(${s.rgb[0]},${s.rgb[1]},${s.rgb[2]},${Math.max(0, s.life)})`;
        f.beginPath(); f.arc(s.x, s.y, s.r * Math.max(0.2, s.life), 0, TAU); f.fill();
      }

      for (const r of this.rings) {
        f.strokeStyle = `rgba(${r.rgb[0]},${r.rgb[1]},${r.rgb[2]},${Math.max(0, r.life)})`;
        f.lineWidth = 4;
        f.beginPath(); f.arc(r.x, r.y, r.r, 0, TAU); f.stroke();
      }

      f.globalCompositeOperation = 'source-over';
      if (this.flash > 0) {
        f.fillStyle = `rgba(255, 200, 90, ${this.flash * 0.22})`;
        f.fillRect(-view.ox, -view.oy, view.vw, view.vh);
      }
    }
  }

  /* ---------------- LÓGICA DEL JUEGO ---------------- */
  const RING_LEN = 2 * Math.PI * 19;
  const el = {
    app: q('app'), scene: q('scene'), zones: q('zones'), plates: q('plates'), trayCount: q('trayCount'),
    statRisk: q('statRisk'), riskValue: q('riskValue'),
    statTimer: q('statTimer'), timerRing: q('timerRing'), timerValue: q('timerValue'),
    waveValue: q('waveValue'), waveTotal: q('waveTotal'), scoreValue: q('scoreValue'),
    bubble: q('bubble'), mascot: q('mascot'),
    overlay: q('overlay'), modal: q('modal'), banner: q('sceneBanner'),
    btnSound: q('btnSound'), btnPause: q('btnPause')
  };

  const state = {
    phase: 'intro',
    runId: 0,
    waves: [],
    waveIndex: 0,
    wave: null,
    zones: [],
    plates: [],
    selectedPlate: null,
    timeLeft: 0,
    lastSec: null,
    hurried: false,
    waveScore: 0,
    results: [],
    lastLeakMsg: 0,
    factIndex: 0
  };

  let rafId = null;
  let bubbleTimer = 0;

  function mascotSVG() {
    return `
    <svg class="lg-lumi" viewBox="0 0 120 130" aria-hidden="true">
      <line x1="60" y1="20" x2="60" y2="8" stroke="#9fb3ff" stroke-width="4" stroke-linecap="round"/>
      <circle class="lumi-bulb" cx="60" cy="7" r="6" fill="#5ee7ff"/>
      <rect x="16" y="20" width="88" height="66" rx="30" fill="#eef3ff" stroke="#9fb3ff" stroke-width="4"/>
      <rect x="28" y="33" width="64" height="40" rx="20" fill="#1b2350"/>
      <ellipse class="eye" cx="47" cy="51" rx="6.5" ry="8.5" fill="#5ee7ff"/>
      <ellipse class="eye" cx="73" cy="51" rx="6.5" ry="8.5" fill="#5ee7ff"/>
      <path class="mouth-happy" d="M51 62 Q60 69 69 62" stroke="#5ee7ff" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path class="mouth-sad" d="M51 66 Q60 59 69 66" stroke="#ffd23f" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="22" cy="58" r="5" fill="#ff9ec4" opacity=".7"/>
      <circle cx="98" cy="58" r="5" fill="#ff9ec4" opacity=".7"/>
      <rect x="8" y="92" width="22" height="11" rx="5.5" fill="#9fb3ff"/>
      <rect x="90" y="92" width="22" height="11" rx="5.5" fill="#9fb3ff"/>
      <rect x="32" y="86" width="56" height="36" rx="15" fill="#dfe7ff" stroke="#9fb3ff" stroke-width="4"/>
      <path d="M60 95 L70 99 V105 C70 111 65 114 60 116 C55 114 50 111 50 105 V99 Z" fill="#4ade80"/>
    </svg>`;
  }
  const mascot = (mood) => `<div class="lg-mascot" data-mood="${mood || 'neutral'}">${mascotSVG()}</div>`;

  function say(html, mood) {
    el.bubble.innerHTML = html;
    el.bubble.classList.remove('show');
    void el.bubble.offsetWidth;
    el.bubble.classList.add('show');
    el.mascot.dataset.mood = mood || 'neutral';
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => el.bubble.classList.remove('show'), 3800);
  }

  function showBanner(text, cls) {
    el.banner.className = 'lg-scene-banner' + (cls ? ' ' + cls : '');
    el.banner.textContent = text;
    void el.banner.offsetWidth;
    el.banner.classList.add('show');
  }
  const hideBanner = () => el.banner.classList.remove('show');

  function floatText(x, y, text) {
    const d = document.createElement('div');
    d.className = 'lg-float-text';
    d.textContent = text;
    const p = toScreen(x, y);
    d.style.left = p.x + 'px';
    d.style.top = p.y + 'px';
    el.scene.appendChild(d);
    setTimeout(() => d.remove(), 1200);
  }

  function nextFact() {
    const f = FACTS[state.factIndex % FACTS.length];
    state.factIndex++;
    return f;
  }

  const countZones = (status) => state.zones.filter((z) => z.status === status).length;

  function setupZones(openCount) {
    const openSet = new Set(shuffle([0, 1, 2]).slice(0, Math.min(openCount, MODULES.length)));
    state.zones = MODULES.map((m, i) => ({
      moduleIndex: i,
      slotIndex: Math.random() < 0.5 ? 0 : 1,
      status: openSet.has(i) ? 'open' : 'safe'
    }));
    renderZones();
  }

  function setWorldBox(node, x, y, w, h) {
    node.dataset.wx = x;
    node.dataset.wy = y;
    if (w !== undefined) { node.dataset.ww = w; node.dataset.wh = h; }
  }

  function layoutOverlay() {
    const s = view.s;
    el.zones.querySelectorAll('[data-wx]').forEach((n) => {
      const p = toScreen(+n.dataset.wx, +n.dataset.wy);
      n.style.left = p.x + 'px';
      n.style.top = p.y + 'px';
      if (n.dataset.ww) { n.style.width = n.dataset.ww * s + 'px'; n.style.height = n.dataset.wh * s + 'px'; }
    });
  }

  function renderZones() {
    el.zones.innerHTML = '';
    state.zones.forEach((z, i) => {
      const m = MODULES[z.moduleIndex];
      const s = getSlots(m)[z.slotIndex];
      z.rect = s;

      const b = document.createElement('button');
      b.type = 'button';
      setWorldBox(b, s.x, s.y, s.w, s.h);
      b.addEventListener('click', () => onZoneClick(i));
      el.zones.appendChild(b);
      z.el = b;

      const label = document.createElement('div');
      setWorldBox(label, m.x + m.w / 2, m.y + m.h * 0.74);
      label.innerHTML = `<span class="dot"></span><span>${m.icon} ${m.name}</span>`;
      el.zones.appendChild(label);
      z.labelEl = label;

      paintZone(i, false);
    });
    layoutOverlay();
  }

  function paintZone(i, animate) {
    const z = state.zones[i];
    const b = z.el;
    b.className = 'lg-zone ' + z.status + (animate ? ' pop' : '');
    if (z.status === 'open') {
      b.innerHTML = '<span class="lg-zone-warn" aria-hidden="true">⚠️</span>';
      b.tabIndex = 0;
    } else if (z.status === 'fixed') {
      b.innerHTML = '<span class="lg-zone-plate"><span>PE</span></span><span class="lg-zone-check" aria-hidden="true">✓</span>';
      b.tabIndex = -1;
    } else {
      b.innerHTML = '<span class="lg-zone-check small" aria-hidden="true">✓</span>';
      b.tabIndex = -1;
    }
    z.labelEl.className = 'lg-module-label ' + (z.status === 'open' ? 'open' : 'ok');
  }

  function flashZone(i) {
    const z = state.zones[i];
    const glow = q('sceneSvg').querySelector(`[data-glow="${z.moduleIndex}"]`);
    if (glow) {
      glow.classList.remove('hit');
      void glow.getBoundingClientRect();
      glow.classList.add('hit');
    }
    z.el.classList.remove('hit');
    void z.el.offsetWidth;
    z.el.classList.add('hit');
  }

  function pickTarget() {
    const zs = state.zones;
    if (!zs.length) return null;
    const open = zs.map((z, i) => i).filter((i) => zs[i].status === 'open');
    if (open.length && Math.random() < 0.55) {
      const i = pick(open);
      const r = zs[i].rect;
      return { zoneIndex: i, x: r.x + rand(0.15, 0.85) * r.w, y: r.y + 3 };
    }
    const i = Math.floor(Math.random() * zs.length);
    const r = zs[i].rect;
    return { zoneIndex: i, x: r.x + rand(0.15, 0.85) * r.w, y: r.y + 3 };
  }

  function resolveHit(target) {
    if (target.zoneIndex < 0) return 'shield';
    const z = state.zones[target.zoneIndex];
    if (!z) return 'shield';
    if (z.status === 'open') return 'open';
    return z.status === 'fixed' ? 'fixed' : 'shield';
  }

  function onLeak(target) {
    if (target.zoneIndex < 0 || !state.zones[target.zoneIndex]) return;
    flashZone(target.zoneIndex);
    if (state.phase === 'playing' || state.phase === 'impact') Sound.hit();
    const now = performance.now();
    if (state.phase === 'playing' && now - state.lastLeakMsg > 7000) {
      state.lastLeakMsg = now;
      say(TEXT.leak(MODULES[state.zones[target.zoneIndex].moduleIndex].name), 'worried');
    }
  }

  /* ---------------- PLACAS Y ARRASTRE ---------------- */
  function setupPlates(n) {
    state.plates = Array.from({ length: n }, (_, i) => ({ id: i, used: false, el: null }));
    state.selectedPlate = null;
    el.plates.innerHTML = '';
    state.plates.forEach((p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lg-plate';
      b.innerHTML = '<span class="lg-plate-slab"><span class="lg-plate-label">PE</span></span>';
      b._plate = p;
      b.addEventListener('pointerdown', onPlateDown);
      b.addEventListener('pointermove', onPlateMove);
      b.addEventListener('pointerup', onPlateUp);
      b.addEventListener('pointercancel', cancelDrag);
      b.addEventListener('click', onPlateClick);
      p.el = b;
      el.plates.appendChild(b);
    });
    paintPlates();
  }

  function paintPlates() {
    state.plates.forEach((p) => {
      const sel = state.selectedPlate === p;
      p.el.classList.toggle('used', p.used);
      p.el.classList.toggle('selected', sel);
      p.el.disabled = p.used;
    });
    el.app.classList.toggle('has-selection', !!state.selectedPlate);
    updateHUD();
  }

  const canInteract = () => state.phase === 'playing';
  const platesLeft = () => state.plates.filter((p) => !p.used).length;

  function selectPlate(p) {
    state.selectedPlate = state.selectedPlate === p ? null : p;
    paintPlates();
    if (state.selectedPlate) { Sound.select(); say(TEXT.selected); }
  }

  let drag = null;
  let suppressClickUntil = 0;

  function onPlateDown(e) {
    const p = e.currentTarget._plate;
    if (!canInteract() || p.used) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag = { plate: p, id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, ghost: null, offY: e.pointerType === 'touch' ? -44 : 0 };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  }

  function onPlateMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 8) {
      drag.moved = true;
      drag.ghost = makeGhost(drag.plate.el);
      drag.plate.el.classList.add('dragging');
      el.app.classList.add('is-dragging');
      if (state.selectedPlate !== drag.plate) { state.selectedPlate = drag.plate; paintPlates(); }
      Sound.select();
    }
    if (drag.moved) {
      e.preventDefault();
      moveGhost(drag.ghost, e.clientX, e.clientY + drag.offY);
      highlightDrop(findDropZone(e.clientX, e.clientY + drag.offY).open);
    }
  }

  function onPlateUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.moved) return;
    suppressClickUntil = performance.now() + 400;
    el.app.classList.remove('is-dragging');
    highlightDrop(-1);
    d.plate.el.classList.remove('dragging');
    if (!canInteract()) { d.ghost.remove(); return; }
    const hit = findDropZone(e.clientX, e.clientY + d.offY);
    if (hit.open !== -1) {
      placePlate(d.plate, hit.open, d.ghost);
    } else {
      returnGhost(d.ghost, d.plate);
      Sound.wrong();
      say(hit.blocked !== -1 ? TEXT.alreadySafe : TEXT.missed, 'worried');
    }
  }

  function cancelDrag() {
    if (!drag) return;
    if (drag.ghost) drag.ghost.remove();
    drag.plate.el.classList.remove('dragging');
    el.app.classList.remove('is-dragging');
    highlightDrop(-1);
    drag = null;
  }

  function onPlateClick(e) {
    if (performance.now() < suppressClickUntil) return;
    const p = e.currentTarget._plate;
    if (!canInteract() || p.used) return;
    selectPlate(p);
  }

  function onZoneClick(i) {
    if (!canInteract()) return;
    const z = state.zones[i];
    if (z.status !== 'open') { Sound.wrong(); say(TEXT.alreadySafe); return; }
    if (!state.selectedPlate) {
      Sound.wrong();
      say(TEXT.needPlate, 'worried');
      el.plates.classList.remove('nudge');
      void el.plates.offsetWidth;
      el.plates.classList.add('nudge');
      return;
    }
    placePlate(state.selectedPlate, i, null);
  }

  function findDropZone(x, y) {
    let best = -1;
    let bestD = Infinity;
    let blocked = -1;
    state.zones.forEach((z, i) => {
      const r = z.el.getBoundingClientRect();
      const dx = Math.max(r.left - x, 0, x - r.right);
      const dy = Math.max(r.top - y, 0, y - r.bottom);
      const d = Math.hypot(dx, dy);
      const tol = Math.max(34, r.height * 1.3);
      if (z.status === 'open') {
        if (d < tol && d < bestD) { best = i; bestD = d; }
      } else if (d < 6) {
        blocked = i;
      }
    });
    return { open: best, blocked };
  }

  function highlightDrop(i) {
    state.zones.forEach((z, k) => z.el.classList.toggle('hover', k === i));
  }

  function makeGhost(plateEl) {
    const r = plateEl.querySelector('.lg-plate-slab').getBoundingClientRect();
    const g = document.createElement('div');
    g.className = 'lg-ghost-plate';
    g.innerHTML = '<span class="lg-plate-label">PE</span>';
    Object.assign(g.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    document.body.appendChild(g);
    return g;
  }

  function moveGhost(g, x, y) {
    g.style.left = x - g.offsetWidth / 2 + 'px';
    g.style.top = y - g.offsetHeight / 2 + 'px';
  }

  function flyTo(g, rect, done) {
    g.classList.add('flying');
    void g.offsetWidth;
    Object.assign(g.style, { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px' });
    let finished = false;
    const fin = () => {
      if (finished) return;
      finished = true;
      g.remove();
      done();
    };
    g.addEventListener('transitionend', fin, { once: true });
    setTimeout(fin, 380);
  }

  function returnGhost(g, plate) {
    const r = plate.el.querySelector('.lg-plate-slab').getBoundingClientRect();
    flyTo(g, r, () => {
      plate.el.classList.remove('shake');
      void plate.el.offsetWidth;
      plate.el.classList.add('shake');
    });
  }

  function placePlate(plate, zoneIndex, ghost) {
    const z = state.zones[zoneIndex];
    if (!z || z.status !== 'open' || plate.used) return;

    plate.used = true;
    z.status = 'fixed';
    state.waveScore += CONFIG.points.perZone;
    if (state.selectedPlate === plate) state.selectedPlate = null;
    paintPlates();

    const g = ghost || makeGhost(plate.el);
    const run = state.runId;
    flyTo(g, z.el.getBoundingClientRect(), () => {
      if (run !== state.runId) return;
      paintZone(zoneIndex, true);
      const cx = z.rect.x + z.rect.w / 2;
      const cy = z.rect.y + z.rect.h / 2;
      scene.celebrate(cx, cy);
      floatText(cx, cy - 30, '+' + CONFIG.points.perZone);
      Sound.place();
      if (countZones('open') === 0) {
        say(TEXT.allDone, 'happy');
        endWave();
      } else {
        say(pick(TEXT.praise), 'happy');
      }
    });
  }

  /* ---------------- FLUJO Y PANTALLAS ---------------- */
  function totalScore() {
    let t = 0;
    for (let i = 0; i < state.results.length; i++) if (state.results[i]) t += state.results[i].total;
    if (!state.results[state.waveIndex] && (state.phase === 'playing' || state.phase === 'impact' || state.phase === 'paused')) t += state.waveScore;
    return t;
  }

  function updateHUD() {
    const w = state.wave;
    if (!w) return;
    el.riskValue.textContent = w.risk;
    el.statRisk.style.setProperty('--tier', w.tier.color);
    el.waveValue.textContent = w.number;
    el.waveTotal.textContent = state.waves.length;
    el.trayCount.textContent = `${platesLeft()}/${state.plates.length}`;
    el.scoreValue.textContent = totalScore();
  }

  function updateTimer() {
    const w = state.wave;
    if (!w) return;
    const t = Math.max(0, state.timeLeft);
    el.timerValue.textContent = Math.ceil(t);
    el.timerRing.style.strokeDashoffset = RING_LEN * (1 - t / w.timeLimit);
  }

  function prepareWave() {
    state.wave = state.waves[state.waveIndex];
    state.waveScore = 0;
    state.timeLeft = state.wave.timeLimit;
    state.lastSec = null;
    state.hurried = false;
    el.statTimer.classList.remove('danger');
    setupZones(state.wave.uncoveredZones);
    setupPlates(state.wave.plates);
    updateHUD();
    updateTimer();
    scene.spawnRate = 0.9;
    scene.speedMul = 1;
    scene.intensity = 0.35;
  }

  function startGame() {
    Sound.unlock();
    state.runId++;
    cancelDrag();
    state.waves = buildWaves();
    state.results = [];
    state.waveIndex = 0;
    scene.paused = false;
    showBriefing();
  }

  function showBriefing() {
    state.phase = 'briefing';
    el.app.classList.remove('playing');
    prepareWave();
    const w = state.wave;
    say(TEXT.tierBrief[w.tier.id], w.tier.id === 'extremo' ? 'worried' : 'neutral');
    openModal(`
      <div class="lg-modal-badge">${t('Alerta Solar Única')}</div>
      ${mascot(w.tier.id === 'extremo' ? 'worried' : 'neutral')}
      <h2>${w.tier.emoji} ${t('Tormenta {nivel}', { nivel: `<span style="color:${w.tier.color}">${w.tier.label.toLowerCase()}</span>` })}</h2>
      <p>${TEXT.tierBrief[w.tier.id]}</p>
      <div class="lg-chips">
        <span class="lg-chip" style="--c:${w.tier.color}">☀️ ${t('Riesgo')} <b>${w.risk}</b> · ${w.radiation.toFixed(1)} μGy/h</span>
        <span class="lg-chip">⚠️ <b>${w.uncoveredZones}</b> ${t('zonas')}</span>
        <span class="lg-chip">⏱️ <b>${w.timeLimit}</b> s</span>
      </div>
      <div class="lg-btn-row"><button class="lg-btn" data-action="go">${t('¡A blindar! 🛡️')}</button></div>
    `);
  }

  function countdown(done) {
    state.phase = 'countdown';
    const seq = ['3', '2', '1', t('¡YA!')];
    const run = state.runId;
    let i = 0;
    const step = () => {
      if (run !== state.runId || !contenedor.isConnected) return;
      if (i >= seq.length) { hideBanner(); done(); return; }
      showBanner(seq[i], 'count');
      if (i === seq.length - 1) Sound.go(); else Sound.tick();
      i++;
      setTimeout(step, i === seq.length ? 450 : 550);
    };
    step();
  }

  function beginWave() {
    state.phase = 'playing';
    el.app.classList.add('playing');
    const w = state.wave;
    scene.spawnRate = w.particleRate;
    scene.speedMul = w.particleSpeed;
    say(TEXT.start);
  }

  function endWave() {
    if (state.phase !== 'playing') return;
    state.phase = 'impact';
    el.app.classList.remove('playing');
    cancelDrag();
    state.selectedPlate = null;
    paintPlates();

    const fixed = countZones('fixed');
    const needed = fixed + countZones('open');
    const success = fixed === needed;
    updateTimer();
    showBanner(success ? t('🛡️ ¡Escudo listo! Llega la oleada…') : t('☀️ ¡Llega la oleada solar!'));
    Sound.wave();
    scene.intensity = 1;
    scene.bigWave(1.5);

    const run = state.runId;
    setTimeout(() => {
      if (run !== state.runId || !contenedor.isConnected) return;
      hideBanner();
      scene.spawnRate = 0.9;
      scene.intensity = 0.35;
      showWaveResult(buildResult(success, fixed, needed));
    }, CONFIG.impactDurationMs);
  }

  function buildResult(success, fixed, needed) {
    const P = CONFIG.points;
    const w = state.wave;
    const secs = success ? Math.ceil(state.timeLeft) : 0;
    const spare = success ? platesLeft() : 0;
    const r = {
      wave: w.number, risk: w.risk, radiation: w.radiation, tier: w.tier.label,
      success, fixed, needed,
      zonePts: fixed * P.perZone,
      secs, timeBonus: secs * P.perSecondLeft,
      spare, plateBonus: spare * P.perSparePlate
    };
    r.total = r.zonePts + r.timeBonus + r.plateBonus;
    r.stars = success ? (state.timeLeft / w.timeLimit >= 0.5 ? 3 : 2) : fixed > 0 ? 1 : 0;
    return r;
  }

  const starsHTML = (n, max) =>
    Array.from({ length: max }, (_, i) => `<span class="lg-star ${i < n ? 'on' : ''}" style="animation-delay:${0.15 + i * 0.18}s">⭐</span>`).join('');

  function showWaveResult(r) {
    state.phase = 'result';
    state.results[state.waveIndex] = r;
    updateHUD();
    const left = r.needed - r.fixed;

    if (r.success) {
      Sound.success();
      say(t('¡Refugio a salvo! Las placas frenaron las partículas 💚'), 'happy');
    } else {
      Sound.warning();
      say(t('Algunas partículas entraron. ¡Puedes reintentarlo! 💪'), 'worried');
    }

    openModal(`
      <div class="lg-result ${r.success ? 'lg-result-success' : 'lg-result-warning'}">
        <div class="lg-modal-badge">${t('Resultado de Defensa')}</div>
        ${mascot(r.success ? 'happy' : 'worried')}
        <h2>${r.success ? t('¡Refugio a salvo! 🎉') : t('¡Cuidado! Entró radiación ⚠️')}</h2>
        <div class="lg-stars">${starsHTML(r.stars, 3)}</div>
        <div class="lg-points">+${r.total} <small>${t('puntos')}</small></div>
        <p>${r.success
          ? t('Las placas de polietileno frenaron la tormenta solar. ¡Los astronautas están a salvo!')
          : (left === 1 ? t('Quedó <b>{n}</b> zona sin placa.', { n: left }) : t('Quedaron <b>{n}</b> zonas sin placa.', { n: left }))}</p>
        <p class="lg-tip">💡 ${nextFact()}</p>
        <div class="lg-btn-row">
          ${r.success
            ? `<button class="lg-btn" data-action="finish">${t('Volver a la Base Lunar 🚀')}</button>`
            : `<button class="lg-btn" data-action="retry">${t('🔁 Reintentar defensa')}</button>`}
        </div>
      </div>
    `);
  }

  function retryWave() {
    state.results = [];
    showBriefing();
  }

  function finishMission() {
    const r = state.results[0];
    limpiarRecursos();
    onTerminar({ exito: Boolean(r && r.success) });
  }

  function showIntro() {
    state.phase = 'intro';
    el.app.classList.remove('playing');
    say(TEXT.intro);
    openModal(`
      <div class="lg-logo-big">LUNAR GUARD</div>
      <div class="lg-subtitle">☀️ ${t('Escudos contra Tormenta Solar')} ☀️</div>
      ${mascot('happy')}
      <p>${t('¡Viene una <b>tormenta solar</b>! Tapa los huecos del refugio para proteger a los astronautas.')}</p>
      ${textoDonki() ? `<p class="lg-tip">🛰️ ${textoDonki()}</p>` : ''}
      <div class="lg-steps">
        <div class="lg-step"><span class="ico">👆</span>${t('Toma una <b>placa</b>')}</div>
        <div class="lg-step"><span class="ico">⚠️</span>${t('Ponla en lo <b>amarillo</b>')}</div>
        <div class="lg-step"><span class="ico">✅</span>${t('¡Se pone <b>verde</b>!')}</div>
      </div>
      <div class="lg-btn-row"><button class="lg-btn" data-action="start">${t('¡Comenzar misión! 🚀')}</button></div>
    `);
  }

  function pauseGame() {
    if (state.phase !== 'playing') return;
    cancelDrag();
    state.phase = 'paused';
    scene.paused = true;
    say(TEXT.paused);
    openModal(`
      ${mascot('neutral')}
      <h2>${t('Juego en pausa ⏸')}</h2>
      <p>${t('Tómate un respiro. El Sol también esperará.')}</p>
      <div class="lg-btn-row">
        <button class="lg-btn ghost" data-action="restart">🔄 ${t('Reiniciar')}</button>
        <button class="lg-btn" data-action="resume">▶ ${t('Continuar')}</button>
      </div>
    `);
  }

  function resumeGame() {
    if (state.phase !== 'paused') return;
    closeModal();
    scene.paused = false;
    state.phase = 'playing';
    say(TEXT.start);
  }

  function openModal(html) {
    el.modal.innerHTML = html;
    el.overlay.hidden = false;
    el.modal.classList.remove('in');
    void el.modal.offsetWidth;
    el.modal.classList.add('in');
  }
  function closeModal() {
    el.overlay.hidden = true;
    el.modal.innerHTML = '';
  }

  const actions = {
    start: () => { closeModal(); startGame(); },
    go: () => { closeModal(); countdown(beginWave); },
    retry: () => { closeModal(); retryWave(); },
    restart: () => { closeModal(); startGame(); },
    finish: () => finishMission(),
    resume: () => resumeGame()
  };

  /* ---------------- INICIALIZACIÓN Y BUCLE ---------------- */
  el.mascot.innerHTML = mascotSVG();
  el.timerRing.style.strokeDasharray = RING_LEN;
  buildSceneSVG(q('sceneSvg'));

  const scene = new Scene({
    root: el.scene,
    sky: q('skyCanvas'),
    fx: q('fxCanvas'),
    svg: q('sceneSvg')
  });
  scene.onResize = layoutOverlay;
  scene.targetPicker = pickTarget;
  scene.resolveHit = resolveHit;
  scene.onLeak = onLeak;

  state.waves = buildWaves();
  state.wave = state.waves[0];
  state.timeLeft = state.wave.timeLimit;
  setupZones(0);
  setupPlates(state.wave.plates);
  updateHUD();
  updateTimer();

  el.btnSound.addEventListener('click', () => {
    el.btnSound.textContent = Sound.toggle() ? '🔇' : '🔊';
  });
  el.btnPause.addEventListener('click', () => {
    if (state.phase === 'paused') resumeGame();
    else pauseGame();
  });
  el.modal.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b || !actions[b.dataset.action]) return;
    Sound.click();
    actions[b.dataset.action]();
  });

  let destruido = false;
  function limpiarRecursos() {
    if (destruido) return;
    destruido = true;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    cancelDrag();
    scene.destroy();
  }

  let lastNow = performance.now();
  function loop(now) {
    if (!contenedor.isConnected) {
      limpiarRecursos();
      return;
    }
    const dt = Math.min(0.1, (now - lastNow) / 1000);
    lastNow = now;

    if (!scene.paused) scene.update(dt, now);
    scene.draw(now / 1000);

    if (state.phase === 'playing') {
      const w = state.wave;
      state.timeLeft -= dt;
      const prog = 1 - Math.max(0, state.timeLeft) / w.timeLimit;
      scene.spawnRate = w.particleRate * (1 + prog * 1.6);
      scene.intensity = 0.35 + prog * 0.65;

      const sec = Math.ceil(state.timeLeft);
      if (sec !== state.lastSec) {
        state.lastSec = sec;
        if (sec <= 5 && sec > 0) {
          Sound.tick();
          el.statTimer.classList.add('danger');
          if (!state.hurried) { state.hurried = true; say(TEXT.hurry, 'worried'); }
        }
      }
      updateTimer();
      if (state.timeLeft <= 0) { state.timeLeft = 0; endWave(); }
    }
    rafId = requestAnimationFrame(loop);
  }

  showIntro();
  requestAnimationFrame(() => {
    if (destruido) return;
    scene.resize();
    rafId = requestAnimationFrame(loop);
  });

  // Se devuelve a modal.js para detener todo al cerrar la ventana.
  return limpiarRecursos;
}