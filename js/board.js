// The colouring board: draws the grid on a canvas and handles painting,
// magic fill, zooming and panning with mouse, touch and pen.

const BG = '#efe7da';
const EMPTY = '#ffffff';
const GAP = '#e4e7ee';
const HILITE = '#c3cee0';
const BORDER = '#8d97ab';

export class Board {
  constructor(canvas, events) {
    this.cv = canvas;
    this.g = canvas.getContext('2d');
    this.ev = events;
    this.tool = 'brush';
    this.sel = 0;
    this.view = { s: 10, x: 0, y: 0 };
    this.pointers = new Map();
    this.mode = 'idle';
    this.raf = 0;
    this.animUntil = 0;
    this.pulse = null;
    this.flash = null;
    this.tween = null;
    this.locked = false;
    this.spaceDown = false;

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement);
    this.bindInput();
  }

  // ---------- setup ----------

  load(grid, order) {
    this.grid = grid;
    this.n = grid.n;
    this.cells = grid.cells;
    this.filled = new Uint8Array(this.cells.length);
    this.showAt = new Float64Array(this.cells.length);
    this.remaining = grid.counts.slice();
    this.order = [];
    for (const i of order) {
      if (i >= 0 && i < this.cells.length && !this.filled[i]) {
        this.filled[i] = 1;
        this.order.push(i);
        this.remaining[this.cells[i]]--;
      }
    }
    this.complete = this.order.length === this.cells.length;
    this.locked = false;
    this.pulse = this.flash = this.tween = null;
    this.resize(true);
  }

  resize(refit) {
    const box = this.cv.parentElement.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.W = box.width;
    this.H = box.height;
    this.dpr = dpr;
    this.cv.width = Math.round(box.width * dpr);
    this.cv.height = Math.round(box.height * dpr);
    if (!this.n) return;
    const oldBase = this.base;
    this.base = Math.max(2, Math.min((this.W - 20) / this.n, (this.H - 20) / this.n));
    this.maxS = Math.max(this.base * 1.5, 60);
    if (refit || !oldBase || this.view.s <= oldBase * 1.01) this.fit(false);
    else this.clamp();
    this.request();
  }

  fit(animate = true) {
    const s = this.base;
    const to = { s, x: (this.W - this.n * s) / 2, y: (this.H - this.n * s) / 2 };
    this.setView(to, animate);
  }

  setView(to, animate) {
    if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.tween = { from: { ...this.view }, to, t0: performance.now(), dur: 320 };
    } else {
      this.tween = null;
      this.view = to;
    }
    this.request();
  }

  clamp(v = this.view) {
    const size = this.n * v.s;
    const pad = 60;
    v.x = size <= this.W ? (this.W - size) / 2 : Math.min(pad, Math.max(this.W - size - pad, v.x));
    v.y = size <= this.H ? (this.H - size) / 2 : Math.min(pad, Math.max(this.H - size - pad, v.y));
    return v;
  }

  zoomAt(px, py, s) {
    s = Math.min(this.maxS, Math.max(this.base, s));
    const v = this.view;
    const gx = (px - v.x) / v.s;
    const gy = (py - v.y) / v.s;
    this.view = this.clamp({ s, x: px - gx * s, y: py - gy * s });
    this.tween = null;
    this.request();
  }

  zoomBy(f) {
    this.zoomAt(this.W / 2, this.H / 2, this.view.s * f);
  }

  setColor(k) {
    this.sel = k;
    this.request();
  }

  setTool(t) {
    this.tool = t;
    this.cv.dataset.tool = t;
  }

  // ---------- painting ----------

  cellAt(px, py) {
    const c = Math.floor((px - this.view.x) / this.view.s);
    const r = Math.floor((py - this.view.y) / this.view.s);
    if (c < 0 || r < 0 || c >= this.n || r >= this.n) return -1;
    return r * this.n + c;
  }

  paint(i, tap) {
    if (i < 0 || this.complete || this.locked) return;
    if (this.filled[i]) return;
    const k = this.cells[i];
    if (k !== this.sel) {
      if (tap) {
        this.flash = { cell: i, until: performance.now() + 450 };
        this.request();
        this.ev.onWrong?.(k);
      }
      return;
    }
    if (this.tool === 'bucket') this.flood(i);
    else {
      this.fillCell(i, performance.now());
      this.ev.onFill?.(k, 1);
      this.after(k);
    }
  }

  flood(start) {
    const n = this.n;
    const k = this.cells[start];
    const depth = new Map([[start, 0]]);
    const queue = [start];
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q];
      const r = Math.floor(i / n);
      const c = i % n;
      const next = [c > 0 && i - 1, c < n - 1 && i + 1, r > 0 && i - n, r < n - 1 && i + n];
      for (const j of next) {
        if (j === false || depth.has(j) || this.filled[j] || this.cells[j] !== k) continue;
        depth.set(j, depth.get(i) + 1);
        queue.push(j);
      }
    }
    const maxD = depth.get(queue[queue.length - 1]) || 1;
    const step = Math.min(22, 650 / maxD);
    const now = performance.now();
    for (const i of queue) this.fillCell(i, now + depth.get(i) * step);
    this.ev.onFill?.(k, queue.length);
    this.after(k);
  }

  fillCell(i, at) {
    this.filled[i] = 1;
    this.order.push(i);
    this.showAt[i] = at;
    this.remaining[this.cells[i]]--;
    this.animUntil = Math.max(this.animUntil, at + 220);
    this.request();
  }

  after(k) {
    if (this.remaining[k] === 0) this.ev.onColorDone?.(k);
    if (this.order.length === this.cells.length && !this.complete) {
      this.complete = true;
      this.end();
      const wait = Math.max(0, this.animUntil - performance.now()) + 250;
      setTimeout(() => this.ev.onComplete?.(), wait);
    }
  }

  /** Point at a cell that still needs the current colour (or any colour). */
  hint() {
    if (this.complete) return;
    let pool = [];
    for (let i = 0; i < this.cells.length; i++) if (!this.filled[i] && this.cells[i] === this.sel) pool.push(i);
    if (!pool.length) {
      for (let i = 0; i < this.cells.length; i++) if (!this.filled[i]) pool.push(i);
      if (!pool.length) return;
    }
    const cell = pool[Math.floor(Math.random() * pool.length)];
    if (this.cells[cell] !== this.sel) this.ev.onPick?.(this.cells[cell]);
    const s = Math.min(this.maxS, Math.max(this.view.s, 34));
    const c = (cell % this.n) + 0.5;
    const r = Math.floor(cell / this.n) + 0.5;
    this.setView(this.clamp({ s, x: this.W / 2 - c * s, y: this.H / 2 - r * s }), true);
    this.pulse = { cell, until: performance.now() + 2200 };
    this.request();
  }

  /** Time-lapse: replay the picture in the order it was coloured. */
  replay(ms, done) {
    this.fit(true);
    this.locked = true;
    const now = performance.now() + 350;
    const step = Math.min(30, ms / this.order.length);
    this.order.forEach((i, rank) => { this.showAt[i] = now + rank * step; });
    this.animUntil = now + this.order.length * step + 220;
    this.request();
    setTimeout(() => { this.locked = false; done?.(); }, this.animUntil - performance.now() + 300);
  }

  /** Finished picture as a canvas, `px` pixels per cell. */
  snapshot(px) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = this.n * px;
    const g = cv.getContext('2d');
    this.cells.forEach((k, i) => {
      g.fillStyle = this.grid.colors[k];
      g.fillRect((i % this.n) * px, Math.floor(i / this.n) * px, px, px);
    });
    return cv;
  }

  // ---------- drawing ----------

  request() {
    if (!this.raf) this.raf = requestAnimationFrame((t) => { this.raf = 0; this.draw(t); });
  }

  draw() {
    const now = performance.now();
    if (this.tween) {
      const { from, to, t0, dur } = this.tween;
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      this.view = { s: from.s + (to.s - from.s) * e, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e };
      if (t >= 1) this.tween = null;
    }
    const { g, n, dpr } = this;
    const W = this.cv.width;
    const H = this.cv.height;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = BG;
    g.fillRect(0, 0, W, H);
    if (!n) return;

    const cs = this.view.s * dpr;
    const ox = this.view.x * dpr;
    const oy = this.view.y * dpr;
    const ex = (i) => Math.round(ox + i * cs);
    const ey = (i) => Math.round(oy + i * cs);
    const c0 = Math.max(0, Math.floor(-ox / cs));
    const c1 = Math.min(n - 1, Math.floor((W - ox) / cs));
    const r0 = Math.max(0, Math.floor(-oy / cs));
    const r1 = Math.min(n - 1, Math.floor((H - oy) / cs));
    const showGrid = !this.complete && cs >= 7 * dpr;
    const gap = showGrid ? Math.max(1, Math.round(dpr * 0.75)) : 0;
    const colors = this.grid.colors;

    // Board with a soft shadow.
    g.save();
    g.shadowColor = 'rgba(70, 50, 20, 0.18)';
    g.shadowBlur = 18 * dpr;
    g.shadowOffsetY = 6 * dpr;
    g.fillStyle = showGrid ? GAP : EMPTY;
    g.fillRect(ex(0), ey(0), ex(n) - ex(0), ey(n) - ey(0));
    g.restore();

    let animating = this.tween || now < this.animUntil;
    const visible = (i) => this.filled[i] && now >= this.showAt[i];

    for (let r = r0; r <= r1; r++) {
      const y0 = ey(r);
      const y1 = ey(r + 1);
      for (let c = c0; c <= c1; c++) {
        const i = r * n + c;
        const x0 = ex(c);
        const x1 = ex(c + 1);
        const k = this.cells[i];
        if (!visible(i)) {
          g.fillStyle = k === this.sel && !this.complete ? HILITE : EMPTY;
          g.fillRect(x0, y0, x1 - x0 - gap, y1 - y0 - gap);
          continue;
        }
        const age = now - this.showAt[i];
        g.fillStyle = colors[k];
        if (age < 200) {
          const t = age / 200;
          const sc = 0.35 + 0.65 * (1 - Math.pow(1 - t, 2)) + Math.sin(t * Math.PI) * 0.12;
          const w = (x1 - x0) * sc;
          const h = (y1 - y0) * sc;
          g.fillStyle = EMPTY;
          g.fillRect(x0, y0, x1 - x0 - gap, y1 - y0 - gap);
          g.fillStyle = colors[k];
          g.fillRect((x0 + x1 - w) / 2, (y0 + y1 - h) / 2, w, h);
        } else {
          g.fillRect(x0, y0, x1 - x0, y1 - y0);
        }
      }
    }

    // Outlines between areas with different numbers, like a colouring book.
    if (!this.complete) {
      g.beginPath();
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const i = r * n + c;
          const k = this.cells[i];
          const vi = visible(i);
          if (c < n - 1 && this.cells[i + 1] !== k && !(vi && visible(i + 1))) {
            g.moveTo(ex(c + 1), ey(r));
            g.lineTo(ex(c + 1), ey(r + 1));
          }
          if (r < n - 1 && this.cells[i + n] !== k && !(vi && visible(i + n))) {
            g.moveTo(ex(c), ey(r + 1));
            g.lineTo(ex(c + 1), ey(r + 1));
          }
        }
      }
      g.strokeStyle = BORDER;
      g.lineWidth = Math.max(1, Math.min(3 * dpr, cs * 0.07));
      g.stroke();
    }

    // Numbers, once the squares are big enough to read.
    if (!this.complete && cs >= 13 * dpr) {
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const fs = Math.min(cs * 0.5, 30 * dpr);
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const i = r * n + c;
          if (visible(i)) continue;
          const k = this.cells[i];
          const on = k === this.sel;
          g.font = `${on ? 700 : 500} ${fs}px Fredoka, ui-rounded, system-ui, sans-serif`;
          g.fillStyle = on ? '#1f2a44' : '#8a93a6';
          g.fillText(String(k + 1), (ex(c) + ex(c + 1)) / 2, (ey(r) + ey(r + 1)) / 2 + fs * 0.04);
        }
      }
    }

    // Hint pulse.
    if (this.pulse) {
      if (now > this.pulse.until || this.filled[this.pulse.cell]) this.pulse = null;
      else {
        const i = this.pulse.cell;
        const cx = (ex(i % n) + ex((i % n) + 1)) / 2;
        const cy = (ey(Math.floor(i / n)) + ey(Math.floor(i / n) + 1)) / 2;
        const ph = (now % 700) / 700;
        g.beginPath();
        g.arc(cx, cy, cs * (0.6 + ph * 0.9), 0, Math.PI * 2);
        g.strokeStyle = `rgba(255, 140, 0, ${1 - ph})`;
        g.lineWidth = Math.max(2, cs * 0.12);
        g.stroke();
        animating = true;
      }
    }

    // Wrong-colour wobble.
    if (this.flash) {
      if (now > this.flash.until) this.flash = null;
      else {
        const i = this.flash.cell;
        const wob = Math.sin(now / 30) * cs * 0.06;
        g.strokeStyle = '#ff4d6d';
        g.lineWidth = Math.max(2, cs * 0.1);
        g.strokeRect(ex(i % n) + wob, ey(Math.floor(i / n)), cs, cs);
        animating = true;
      }
    }

    if (animating) this.request();
  }

  // ---------- input ----------

  bindInput() {
    const cv = this.cv;
    const pos = (e) => {
      const b = cv.getBoundingClientRect();
      return { x: e.clientX - b.left, y: e.clientY - b.top };
    };

    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    // Older iPad Safari ignores touch-action; stop it zooming or scrolling the page from the board.
    const stop = (e) => { if (e.cancelable) e.preventDefault(); };
    cv.addEventListener('touchstart', stop, { passive: false });
    cv.addEventListener('touchmove', stop, { passive: false });
    cv.addEventListener('gesturestart', stop);

    cv.addEventListener('pointerdown', (e) => {
      this.ev.onTouch?.();
      cv.setPointerCapture(e.pointerId);
      const p = pos(e);
      this.pointers.set(e.pointerId, p);

      if (this.pointers.size === 2) {
        clearTimeout(this.pendingTimer);
        const [a, b] = [...this.pointers.values()];
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        this.mode = 'pinch';
        this.pinch = {
          d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          s0: this.view.s,
          gx: (mid.x - this.view.x) / this.view.s,
          gy: (mid.y - this.view.y) / this.view.s,
        };
        this.tween = null;
        return;
      }
      if (this.pointers.size > 2) return;

      const panning = e.button === 1 || e.button === 2 || this.tool === 'hand' || this.spaceDown || this.complete;
      if (panning) {
        this.mode = 'pan';
        this.last = p;
        this.tween = null;
      } else if (e.pointerType === 'touch') {
        // Wait a moment: a second finger means pinch, not paint.
        this.mode = 'pending';
        this.start = p;
        this.pendingTimer = setTimeout(() => this.beginStroke(this.start), 90);
      } else {
        this.beginStroke(p);
      }
    });

    cv.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      const p = pos(e);
      this.pointers.set(e.pointerId, p);

      if (this.mode === 'pinch' && this.pointers.size >= 2) {
        const [a, b] = [...this.pointers.values()];
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const s = Math.min(this.maxS, Math.max(this.base, (this.pinch.s0 * d) / this.pinch.d0));
        this.view = this.clamp({ s, x: mid.x - this.pinch.gx * s, y: mid.y - this.pinch.gy * s });
        this.request();
      } else if (this.mode === 'pan') {
        this.view.x += p.x - this.last.x;
        this.view.y += p.y - this.last.y;
        this.last = p;
        this.clamp();
        this.request();
      } else if (this.mode === 'pending') {
        if (Math.hypot(p.x - this.start.x, p.y - this.start.y) > 6) {
          clearTimeout(this.pendingTimer);
          this.beginStroke(this.start);
          this.strokeTo(p);
        }
      } else if (this.mode === 'paint') {
        this.strokeTo(p);
      }
    });

    const up = (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.delete(e.pointerId);
      if (this.mode === 'pending') {
        clearTimeout(this.pendingTimer);
        this.beginStroke(this.start);
      }
      if (this.pointers.size === 1 && this.mode === 'pinch') {
        // One finger left after a pinch: keep moving the picture with it.
        this.mode = 'pan';
        this.last = [...this.pointers.values()][0];
      } else if (this.pointers.size === 0) {
        this.mode = 'idle';
      }
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);

    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = pos(e);
      if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        const f = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : e.ctrlKey ? 0.01 : 0.0018));
        this.zoomAt(p.x, p.y, this.view.s * f);
      } else {
        this.view.x -= e.deltaX;
        this.clamp();
        this.request();
      }
    }, { passive: false });
  }

  beginStroke(p) {
    this.mode = 'paint';
    this.last = p;
    this.lastCell = this.cellAt(p.x, p.y);
    this.paint(this.lastCell, true);
  }

  strokeTo(p) {
    const a = this.last;
    const dist = Math.hypot(p.x - a.x, p.y - a.y);
    const steps = Math.max(1, Math.ceil(dist / (this.view.s / 3)));
    for (let s = 1; s <= steps; s++) {
      const i = this.cellAt(a.x + ((p.x - a.x) * s) / steps, a.y + ((p.y - a.y) * s) / steps);
      if (i !== this.lastCell) {
        this.lastCell = i;
        this.paint(i, false);
      }
    }
    this.last = p;
  }

  end() {
    this.request();
  }
}

/** Small preview: coloured cells in full colour, the rest as a soft grey hint. */
export function drawThumb(canvas, grid, filled, done) {
  const n = grid.n;
  canvas.width = canvas.height = n * 4;
  const g = canvas.getContext('2d');
  const grey = grid.colors.map((hex) => {
    const v = parseInt(hex.slice(1), 16);
    const l = (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255;
    const t = Math.round(150 + l * 92);
    return `rgb(${t},${t},${t + 4})`;
  });
  grid.cells.forEach((k, i) => {
    g.fillStyle = done || filled.has(i) ? grid.colors[k] : grey[k];
    g.fillRect((i % n) * 4, Math.floor(i / n) * 4, 4, 4);
  });
}
