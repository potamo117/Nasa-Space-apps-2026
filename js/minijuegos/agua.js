/**
 * Minijuego P3 - Agua (Circuito ECLSS - Base Lunar Artemis)
 * Ruta en el proyecto: js/minijuegos/agua.js
 * Estructura No Lineal: Grafo de Adyacencia (Map) + Recorrido BFS
 * Audio: Sintetizador Web Audio API integrado
 */
(function () {
  const DIRECCIONES = [
    { key: 'N', dr: -1, dc: 0, opuesta: 'S' },
    { key: 'E', dr: 0, dc: 1, opuesta: 'O' },
    { key: 'S', dr: 1, dc: 0, opuesta: 'N' },
    { key: 'O', dr: 0, dc: -1, opuesta: 'E' }
  ];

  class EfectosSonido {
    constructor() {
      this.ctx = null;
      this.silenciado = false;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.silenciado = !this.silenciado;
      return this.silenciado;
    }

    playRotar() {
      if (this.silenciado) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.08);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.095);
    }

    playFlujoAvanza(cantidadNodos) {
      if (this.silenciado) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const baseFreq = 440 + Math.min(cantidadNodos, 15) * 32;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.14);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.17);
    }

    playAlerta() {
      if (this.silenciado) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      [190, 145].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.14, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.11);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.12);
      });
    }

    playVictoria() {
      if (this.silenciado) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notas = [523.25, 659.25, 783.99, 1046.5];
      notas.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.11);

        gain.gain.setValueAtTime(0.22, now + i * 0.11);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.11 + 0.32);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.11);
        osc.stop(now + i * 0.11 + 0.34);
      });
    }
  }

  class MinijuegoAgua {
    constructor(opciones = {}) {
      this.size = opciones.size || 5;
      this.onTerminar = typeof opciones.onTerminar === 'function'
        ? opciones.onTerminar
        : (res) => console.log('onTerminar:', res);

      this.sonido = new EfectosSonido();
      this.grid = [];
      this.grafo = new Map();
      this.nodosAlcanzados = new Set();
      this.rutaSolucion = new Set();
      this.movimientos = 0;
      this.contaminacion = 0;
      this.completado = false;
      this.timerId = null;
      this.particulas = [];
      this.root = opciones.root || document;
      this.destroyed = false;
      this.rafId = null;

      this.cacheDOM();
      this.crearSegmentosMedidor();
      this.bindEvents();
      this.iniciarNuevoNivel();
      this.iniciarLoopParticulas();
    }

    cacheDOM() {
      const $ = (id) => this.root.querySelector(`#${id}`);
      this.gridEl = $('pipe-grid');
      this.monitorEl = $('monitor-bezel');
      this.statusTextEl = $('monitor-status');
      this.readoutFlowEl = $('readout-flow');
      this.readoutNodesEl = $('readout-nodes');
      this.readoutMovesEl = $('readout-moves');
      this.readoutFilterEl = $('readout-filter');
      this.gaugeValEl = $('gauge-val');
      this.gaugeSegmentsEl = $('gauge-segments');
      this.btnVerificar = $('btn-verificar');
      this.btnNuevo = $('btn-nuevo-circuito');
      this.btnSonido = $('btn-sonido');
      this.canvasConfetti = $('confetti-canvas');
    }

    crearSegmentosMedidor() {
      if (!this.gaugeSegmentsEl) return;
      this.gaugeSegmentsEl.innerHTML = '';
      this.segmentos = [];
      for (let i = 0; i < 10; i++) {
        const seg = document.createElement('div');
        seg.className = 'gauge-seg';
        this.gaugeSegmentsEl.appendChild(seg);
        this.segmentos.push(seg);
      }
    }

    bindEvents() {
      if (this.btnVerificar) {
        this.btnVerificar.addEventListener('click', () => this.verificarCircuito(true));
      }
      if (this.btnNuevo) {
        this.btnNuevo.addEventListener('click', () => {
          this.sonido.playRotar();
          this.iniciarNuevoNivel();
        });
      }
      if (this.btnSonido) {
        this.btnSonido.addEventListener('click', () => {
          const muted = this.sonido.toggleMute();
          const icon = this.btnSonido.querySelector('.material-icon');
          const label = this.btnSonido.querySelector('.btn-label');
          if (icon) icon.textContent = muted ? 'volume_off' : 'volume_up';
          if (label) label.textContent = muted ? 'Sin Audio' : 'Audio';
        });
      }
    }

    nodeId(r, c) {
      return `${r},${c}`;
    }

    // 1 y 2. Generación procedural con camino garantizado + rotación aleatoria
    iniciarNuevoNivel() {
      this.completado = false;
      this.movimientos = 0;
      this.contaminacion = 0;
      this.rutaSolucion.clear();
      this.nodosAlcanzados.clear();

      this.grid = Array.from({ length: this.size }, (_, r) =>
        Array.from({ length: this.size }, (_, c) => ({
          r,
          c,
          puertos: { N: false, S: false, E: false, O: false },
          enCaminoBase: false
        }))
      );

      const camino = this.generarCaminoValido();

      for (let i = 0; i < camino.length; i++) {
        const actual = camino[i];
        const celda = this.grid[actual.r][actual.c];
        celda.enCaminoBase = true;

        if (i === 0) celda.puertos.O = true;
        if (i === camino.length - 1) celda.puertos.E = true;

        if (i < camino.length - 1) {
          const sig = camino[i + 1];
          const dir = this.obtenerDireccionEntre(actual, sig);
          celda.puertos[dir.key] = true;
          this.grid[sig.r][sig.c].puertos[dir.opuesta] = true;
        }
      }

      const plantillas = [
        { N: true, S: true, E: false, O: false },
        { N: true, E: true, S: false, O: false },
        { N: true, E: true, S: true, O: false },
        { N: false, E: true, S: true, O: false },
        { N: true, O: true, S: false, E: false }
      ];

      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          const celda = this.grid[r][c];
          if (!celda.enCaminoBase) {
            const tpl = plantillas[Math.floor(Math.random() * plantillas.length)];
            celda.puertos = { ...tpl };
          }
          const giros = 1 + Math.floor(Math.random() * 3);
          for (let g = 0; g < giros; g++) {
            this.rotarPuertos90(celda);
          }
        }
      }

      this.construirGrafoAdyacencia();
      this.ejecutarBFS(false);

      if (this.nodosAlcanzados.has(this.nodeId(this.size - 1, this.size - 1))) {
        this.rotarPuertos90(this.grid[0][0]);
        this.construirGrafoAdyacencia();
        this.ejecutarBFS(false);
      }

      this.renderizarTablero();
      this.actualizarMensajeMonitor(
        'normal',
        'Gira las válvulas para conectar el Tanque de Condensación con el Filtro de Carbón.'
      );
      this.iniciarTemporizadorContaminacion();
    }

    generarCaminoValido() {
      const targetR = this.size - 1;
      const targetC = this.size - 1;
      const visitados = new Set();
      const camino = [];

      const dfsCamino = (r, c) => {
        const id = this.nodeId(r, c);
        visitados.add(id);
        camino.push({ r, c });

        if (r === targetR && c === targetC) return true;

        const dirs = [...DIRECCIONES].sort(() => Math.random() - 0.5);
        for (const d of dirs) {
          const nr = r + d.dr;
          const nc = c + d.dc;
          if (
            nr >= 0 && nr < this.size &&
            nc >= 0 && nc < this.size &&
            !visitados.has(this.nodeId(nr, nc))
          ) {
            if (dfsCamino(nr, nc)) return true;
          }
        }

        camino.pop();
        return false;
      };

      dfsCamino(0, 0);
      return camino;
    }

    obtenerDireccionEntre(a, b) {
      const dr = b.r - a.r;
      const dc = b.c - a.c;
      return DIRECCIONES.find((d) => d.dr === dr && d.dc === dc);
    }

    // 3. Click en pieza = rota 90 grados
    rotarPuertos90(celda) {
      const { N, E, S, O } = celda.puertos;
      celda.puertos = { N: O, E: N, S: E, O: S };
    }

    manejarClickCelda(r, c) {
      if (this.completado) return;

      const nodosAntes = this.nodosAlcanzados.size;
      const celda = this.grid[r][c];
      this.rotarPuertos90(celda);
      this.movimientos += 1;

      this.construirGrafoAdyacencia();
      this.ejecutarBFS(false);
      this.actualizarClasesTablero();
      this.actualizarMetricas();
      this.lanzarChispaClick(r, c);

      if (this.nodosAlcanzados.size > nodosAntes) {
        this.sonido.playFlujoAvanza(this.nodosAlcanzados.size);
      } else {
        this.sonido.playRotar();
      }
    }

    // 4. Grafo de Adyacencia usando Map
    construirGrafoAdyacencia() {
      this.grafo.clear();

      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          const idActual = this.nodeId(r, c);
          const celdaActual = this.grid[r][c];
          const vecinosConectados = [];

          for (const dir of DIRECCIONES) {
            const nr = r + dir.dr;
            const nc = c + dir.dc;
            if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue;

            const celdaVecina = this.grid[nr][nc];
            if (celdaActual.puertos[dir.key] && celdaVecina.puertos[dir.opuesta]) {
              vecinosConectados.push(this.nodeId(nr, nc));
            }
          }

          this.grafo.set(idActual, vecinosConectados);
        }
      }
    }

    // 5 y 6. BFS desde el nodo inicial y resaltado del recorrido
    ejecutarBFS(esVerificacionFinal = false) {
      this.nodosAlcanzados.clear();
      this.rutaSolucion.clear();

      const inicioId = this.nodeId(0, 0);
      const finId = this.nodeId(this.size - 1, this.size - 1);
      const celdaInicio = this.grid[0][0];
      const celdaFin = this.grid[this.size - 1][this.size - 1];

      if (!celdaInicio.puertos.O) return false;

      const cola = [inicioId];
      const padres = new Map();
      this.nodosAlcanzados.add(inicioId);
      padres.set(inicioId, null);

      while (cola.length > 0) {
        const actual = cola.shift();
        const vecinos = this.grafo.get(actual) || [];

        for (const vecino of vecinos) {
          if (!this.nodosAlcanzados.has(vecino)) {
            this.nodosAlcanzados.add(vecino);
            padres.set(vecino, actual);
            cola.push(vecino);
          }
        }
      }

      const llegoAlFiltro = this.nodosAlcanzados.has(finId) && celdaFin.puertos.E;

      if (llegoAlFiltro) {
        let cursor = finId;
        while (cursor !== null) {
          this.rutaSolucion.add(cursor);
          cursor = padres.get(cursor);
        }
      }

      if (esVerificacionFinal && llegoAlFiltro) {
        this.completarConExito();
      }

      return llegoAlFiltro;
    }

    verificarCircuito(manual = true) {
      if (this.completado) return;

      this.construirGrafoAdyacencia();
      const exito = this.ejecutarBFS(true);
      this.actualizarClasesTablero();
      this.actualizarMetricas();

      if (!exito && manual) {
        this.sonido.playAlerta();
        if (this.monitorEl) {
          this.monitorEl.classList.remove('is-shaking');
          void this.monitorEl.offsetWidth;
          this.monitorEl.classList.add('is-shaking');
        }
        this.actualizarMensajeMonitor(
          'warning',
          this.nodosAlcanzados.size === 0
            ? '¡SIN FLUJO DE ENTRADA! Conecta la válvula izquierda en (0,0).'
            : `FLUJO INTERRUMPIDO (${this.nodosAlcanzados.size} nodos conectados). Sigue girando piezas.`
        );
      }
    }

    completarConExito() {
      this.completado = true;
      if (this.timerId) clearInterval(this.timerId);

      this.sonido.playVictoria();
      this.lanzarConfeti();
      this.actualizarMensajeMonitor(
        'success',
        '¡SISTEMA ESTABLE! Circuito ECLSS conectado y agua purificada al 98%.'
      );

      this.onTerminar({
        exito: true,
        movimientos: this.movimientos,
        purezaRecuperada: 98,
        nodosRecorridos: this.rutaSolucion.size
      });
    }

    iniciarTemporizadorContaminacion() {
      if (this.timerId) clearInterval(this.timerId);
      this.timerId = setInterval(() => {
        if (this.completado) return;
        this.contaminacion = Math.min(100, this.contaminacion + 1);
        this.actualizarMetricas();

        if (this.contaminacion >= 100) {
          clearInterval(this.timerId);
          this.sonido.playAlerta();
          this.actualizarMensajeMonitor(
            'warning',
            '¡SISTEMA CONTAMINADO AL 100%! Pulsa "Nuevo Circuito" para purgar tuberías.'
          );
          this.onTerminar({ exito: false, motivo: 'contaminacion' });
        }
      }, 900);
    }

    renderizarTablero() {
      if (!this.gridEl) return;
      this.gridEl.innerHTML = '';
      this.gridEl.style.gridTemplateColumns = `repeat(${this.size}, minmax(0, 1fr))`;

      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          const celda = this.grid[r][c];
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'pipe-cell';
          btn.dataset.r = r;
          btn.dataset.c = c;
          btn.setAttribute('aria-label', `Tubería fila ${r + 1}, columna ${c + 1}`);

          if (r === 0 && c === 0) btn.classList.add('is-start');
          if (r === this.size - 1 && c === this.size - 1) btn.classList.add('is-end');

          btn.innerHTML = this.crearSVGTuberia(celda.puertos);
          btn.addEventListener('click', () => {
            this.manejarClickCelda(r, c);
            btn.innerHTML = this.crearSVGTuberia(celda.puertos);
          });

          this.gridEl.appendChild(btn);
        }
      }

      this.actualizarClasesTablero();
      this.actualizarMetricas();
    }

    crearSVGTuberia(puertos) {
      let brazosCasing = '';
      let brazosInner = '';

      if (puertos.N) {
        brazosCasing += '<line x1="50" y1="50" x2="50" y2="0" class="pipe-casing" />';
        brazosInner += '<line x1="50" y1="50" x2="50" y2="0" class="pipe-inner" />';
      }
      if (puertos.S) {
        brazosCasing += '<line x1="50" y1="50" x2="50" y2="100" class="pipe-casing" />';
        brazosInner += '<line x1="50" y1="50" x2="50" y2="100" class="pipe-inner" />';
      }
      if (puertos.E) {
        brazosCasing += '<line x1="50" y1="50" x2="100" y2="50" class="pipe-casing" />';
        brazosInner += '<line x1="50" y1="50" x2="100" y2="50" class="pipe-inner" />';
      }
      if (puertos.O) {
        brazosCasing += '<line x1="50" y1="50" x2="0" y2="50" class="pipe-casing" />';
        brazosInner += '<line x1="50" y1="50" x2="0" y2="50" class="pipe-inner" />';
      }

      return `
        <svg class="pipe-svg" viewBox="0 0 100 100" aria-hidden="true">
          ${brazosCasing}
          <circle cx="50" cy="50" r="13" class="pipe-joint-outer" />
          ${brazosInner}
          <circle cx="50" cy="50" r="7" class="pipe-joint-inner" />
        </svg>
      `;
    }

    actualizarClasesTablero() {
      if (!this.gridEl) return;
      const celdas = this.gridEl.querySelectorAll('.pipe-cell');
      celdas.forEach((el) => {
        const id = `${el.dataset.r},${el.dataset.c}`;
        el.classList.remove('is-visited', 'is-solution');

        if (this.rutaSolucion.has(id)) {
          el.classList.add('is-solution');
        } else if (this.nodosAlcanzados.has(id)) {
          el.classList.add('is-visited');
        }
      });
    }

    actualizarMetricas() {
      const total = this.size * this.size;
      const pctFlujo = this.completado
        ? 100
        : Math.min(95, Math.round((this.nodosAlcanzados.size / (this.size * 2 - 1)) * 100));

      if (this.readoutFlowEl) this.readoutFlowEl.textContent = `${pctFlujo}%`;
      if (this.readoutNodesEl) this.readoutNodesEl.textContent = `${this.nodosAlcanzados.size}/${total} NODOS`;
      if (this.readoutFilterEl) {
        this.readoutFilterEl.textContent = this.completado
          ? '98% PURA'
          : (this.rutaSolucion.size > 0 ? 'LISTO' : 'EN ESPERA');
      }
      if (this.readoutMovesEl) this.readoutMovesEl.textContent = `${this.movimientos}`;

      if (this.gaugeValEl) {
        this.gaugeValEl.textContent = `${this.contaminacion}%`;
        this.gaugeValEl.classList.toggle('is-safe', this.contaminacion < 40);
      }

      if (this.segmentos) {
        const activos = Math.ceil(this.contaminacion / 10);
        this.segmentos.forEach((seg, idx) => {
          seg.className = 'gauge-seg';
          if (idx < activos) {
            if (this.contaminacion >= 70) seg.classList.add('active-high');
            else if (this.contaminacion >= 40) seg.classList.add('active-mid');
            else seg.classList.add('active-low');
          }
        });
      }
    }

    actualizarMensajeMonitor(estado, texto) {
      if (!this.statusTextEl) return;
      this.statusTextEl.classList.remove('is-success', 'is-warning');
      if (estado === 'success') this.statusTextEl.classList.add('is-success');
      if (estado === 'warning') this.statusTextEl.classList.add('is-warning');
      this.statusTextEl.textContent = texto;
    }

    lanzarChispaClick(r, c) {
      if (!this.canvasConfetti) return;
      const w = this.canvasConfetti.width || 600;
      const h = this.canvasConfetti.height || 400;
      const cx = w * 0.25 + ((c + 0.5) / this.size) * (w * 0.5);
      const cy = ((r + 0.5) / this.size) * h;
      const colores = ['#29b6f6', '#26c6da', '#ffd54f'];

      for (let i = 0; i < 6; i++) {
        this.particulas.push({
          x: cx,
          y: cy,
          vx: (Math.random() - 0.5) * 150,
          vy: (Math.random() - 0.5) * 150 - 30,
          size: 3 + Math.random() * 2.5,
          color: colores[i % colores.length],
          life: 0.65
        });
      }
    }

    lanzarConfeti() {
      if (!this.canvasConfetti) return;
      const colores = ['#00e676', '#29b6f6', '#ffd54f', '#66bb6a', '#ffa726'];
      const w = this.canvasConfetti.width || 600;
      const h = this.canvasConfetti.height || 400;

      for (let i = 0; i < 85; i++) {
        this.particulas.push({
          x: w * 0.5 + (Math.random() - 0.5) * 160,
          y: h * 0.5 + (Math.random() - 0.5) * 100,
          vx: (Math.random() - 0.5) * 360,
          vy: -140 - Math.random() * 240,
          size: 5 + Math.random() * 6,
          color: colores[i % colores.length],
          life: 1
        });
      }
    }

    iniciarLoopParticulas() {
      let last = performance.now();
      const tick = (now) => {
        if (this.destroyed) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;

        if (this.canvasConfetti) {
          const rect = this.canvasConfetti.getBoundingClientRect();
          if (this.canvasConfetti.width !== Math.floor(rect.width)) {
            this.canvasConfetti.width = Math.floor(rect.width);
            this.canvasConfetti.height = Math.floor(rect.height);
          }

          const ctx = this.canvasConfetti.getContext('2d');
          ctx.clearRect(0, 0, this.canvasConfetti.width, this.canvasConfetti.height);

          for (let i = this.particulas.length - 1; i >= 0; i--) {
            const p = this.particulas[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 420 * dt;
            p.life -= dt * 0.95;

            if (p.life <= 0) {
              this.particulas.splice(i, 1);
              continue;
            }

            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    }

    destruir() {
      this.destroyed = true;
      if (this.timerId) clearInterval(this.timerId);
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
      if (this.sonido.ctx && this.sonido.ctx.state !== 'closed') this.sonido.ctx.close();
    }
  }

  window.MinijuegoAgua = MinijuegoAgua;

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('pipe-grid')) {
      window.juegoAguaActual = new MinijuegoAgua({
        size: 5,
        onTerminar: (resultado) => {
          console.log('Resultado del módulo ECLSS:', resultado);
        }
      });
    }
  });
})();

export function iniciar(contenedor, onTerminar) {
  if (!document.querySelector('link[href*="agua.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('../../css/agua.css', import.meta.url).href;
    document.head.appendChild(link);
  }

  contenedor.innerHTML = `
    <div class="cockpit-shell" aria-label="Consola del sistema de agua">
      <header class="cockpit-topbar">
        <div class="topbar-brand">
          <span class="material-icon" style="color:#29b6f6;" aria-hidden="true">water_drop</span>
          <h1 class="brand-title">CIRCUITO DE AGUA</h1>
        </div>
        <div class="topbar-actions">
          <button type="button" class="artemis-btn artemis-btn--slate" id="btn-sonido">
            <span class="material-icon" aria-hidden="true">volume_up</span><span class="btn-label">Audio</span>
          </button>
          <button type="button" class="artemis-btn artemis-btn--agua" id="btn-nuevo-circuito">
            <span class="material-icon" aria-hidden="true">refresh</span><span>Nuevo Circuito</span>
          </button>
          <button type="button" class="artemis-btn artemis-btn--comida" id="btn-verificar">
            <span class="material-icon" aria-hidden="true">check_circle</span><span>Verificar</span>
          </button>
        </div>
      </header>
      <div class="cockpit-main">
        <section class="monitor-bezel" id="monitor-bezel">
          <div class="monitor-screen">
            <div class="monitor-header">
              <h2 class="monitor-title">RECICLAJE HÍDRICO (ECLSS)</h2>
              <p class="monitor-status" id="monitor-status" role="status" aria-live="polite">
                Gira las válvulas para conectar el Tanque con el Filtro de Carbón.
              </p>
            </div>
            <div class="board-stage">
              <div class="node-terminal node-start">
                <div class="node-badge"><span class="material-icon" aria-hidden="true">water_damage</span></div>
                <span class="node-label">TANQUE SUDOR</span><span class="node-coord">NODO (0,0)</span>
              </div>
              <div class="pipe-grid" id="pipe-grid" role="grid" aria-label="Tablero de tuberías 5 por 5"></div>
              <div class="node-terminal node-end">
                <div class="node-badge"><span class="material-icon" aria-hidden="true">filter_alt</span></div>
                <span class="node-label">FILTRO CARBÓN</span><span class="node-coord">META (4,4)</span>
              </div>
              <canvas class="confetti-canvas" id="confetti-canvas"></canvas>
            </div>
          </div>
        </section>
        <aside class="side-gauge-panel" aria-label="Medidor de contaminación">
          <div class="gauge-readout-box is-safe" id="gauge-val">0%</div>
          <div class="gauge-segments" id="gauge-segments" aria-hidden="true"></div>
          <div class="gauge-footer"><span class="material-icon" aria-hidden="true">warning</span>
            <span class="gauge-title">RIESGO<br>TOXINAS</span></div>
        </aside>
      </div>
      <section class="cockpit-bottom-deck" aria-label="Telemetría del grafo">
        <div class="module-card">
          <div class="module-header mod-agua"><span>💧 FLUJO BFS</span><span id="readout-nodes">0/25 NODOS</span></div>
          <div class="module-visor visor-agua"><span class="visor-val" id="readout-flow">0%</span><span class="visor-sub">ALCANCE</span></div>
          <div class="led-indicator-box"><span class="square-led" aria-hidden="true"></span><span class="led-text">GRAFO ACTIVO</span></div>
        </div>
        <div class="module-card">
          <div class="module-header mod-comida"><span>🧪 PUREZA CARBÓN</span><span>META 98%</span></div>
          <div class="module-visor visor-comida"><span class="visor-val" id="readout-filter">EN ESPERA</span><span class="visor-sub">ESTADO</span></div>
          <div class="led-indicator-box"><span class="square-led" aria-hidden="true"></span><span class="led-text">CONECTADO</span></div>
        </div>
        <div class="module-card">
          <div class="module-header mod-radiacion"><span>⚙️ VÁLVULAS</span><span>5×5 GRID</span></div>
          <div class="module-visor visor-radiacion"><span class="visor-val" id="readout-moves">0</span><span class="visor-sub">GIROS 90°</span></div>
          <div class="led-indicator-box"><span class="square-led" aria-hidden="true"></span><span class="led-text">OPERATIVO</span></div>
        </div>
      </section>
    </div>`;

  const juego = new window.MinijuegoAgua({
    size: 5,
    root: contenedor,
    onTerminar
  });
  return () => juego.destruir();
}