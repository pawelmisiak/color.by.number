// Turns a vector drawing (see art.js) into a grid of numbered cells.
// Small grids: each cell is sampled 3 x 3 times and takes the colour of the
// shape that covers most of it. Shapes marked "keep" that would vanish on a
// small grid are rescued into the cell they cover best.
// Big grids (Mega): the drawing is painted onto a canvas with a shadow and a
// highlight on every shape, and each pixel becomes one cell.

const SUB = 3;
let probe;

function ctx() {
  if (!probe) probe = document.createElement('canvas').getContext('2d');
  return probe;
}

function prepare(s) {
  const path = new Path2D();
  let x0, y0, x1, y1;
  switch (s.t) {
    case 'c':
      path.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
      [x0, y0, x1, y1] = [s.cx - s.r, s.cy - s.r, s.cx + s.r, s.cy + s.r];
      break;
    case 'e': {
      const a = (s.rot * Math.PI) / 180;
      path.ellipse(s.cx, s.cy, s.rx, s.ry, a, 0, Math.PI * 2);
      const hw = Math.hypot(s.rx * Math.cos(a), s.ry * Math.sin(a));
      const hh = Math.hypot(s.rx * Math.sin(a), s.ry * Math.cos(a));
      [x0, y0, x1, y1] = [s.cx - hw, s.cy - hh, s.cx + hw, s.cy + hh];
      break;
    }
    case 'r':
      if (s.rad && path.roundRect) path.roundRect(s.x, s.y, s.w, s.h, s.rad);
      else path.rect(s.x, s.y, s.w, s.h);
      [x0, y0, x1, y1] = [s.x, s.y, s.x + s.w, s.y + s.h];
      break;
    case 'p': {
      const xs = s.pts.filter((_, i) => i % 2 === 0);
      const ys = s.pts.filter((_, i) => i % 2 === 1);
      path.moveTo(xs[0], ys[0]);
      for (let i = 1; i < xs.length; i++) path.lineTo(xs[i], ys[i]);
      path.closePath();
      [x0, y0, x1, y1] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      break;
    }
    case 'd': {
      path.addPath(new Path2D(s.d));
      // Only absolute M/L/Q/C/Z commands are used, so control points bound the curve.
      const nums = (s.d.match(/-?\d*\.?\d+/g) || []).map(Number);
      const xs = nums.filter((_, i) => i % 2 === 0);
      const ys = nums.filter((_, i) => i % 2 === 1);
      [x0, y0, x1, y1] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      break;
    }
  }
  return { path, k: s.k - 1, keep: !!s.keep, x0, y0, x1, y1 };
}

const cache = new Map();

/**
 * @returns {{n:number, cells:Uint8Array, colors:string[], counts:number[], hash:string}}
 * cells[i] is an index into colors; colour numbers shown to the player are index + 1.
 */
export function rasterize(animal, n) {
  const key = animal.id + ':' + n;
  if (cache.has(key)) return cache.get(key);
  if (n > BIG) {
    const big = rasterizeBig(animal, n);
    cache.set(key, big);
    return big;
  }

  const g = ctx();
  const shapes = animal.shapes.flat().map(prepare);
  const S = 100 / n;
  const raw = new Uint8Array(n * n);
  const wins = new Int32Array(shapes.length);
  const best = shapes.map(() => ({ cnt: 0, cell: -1 }));
  const counts = new Int32Array(shapes.length);
  const touched = [];

  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const idx = row * n + col;
      touched.length = 0;
      for (let sy = 0; sy < SUB; sy++) {
        const y = (row + (sy + 0.5) / SUB) * S;
        for (let sx = 0; sx < SUB; sx++) {
          const x = (col + (sx + 0.5) / SUB) * S;
          for (let s = shapes.length - 1; s >= 0; s--) {
            const sh = shapes[s];
            if (x < sh.x0 || x > sh.x1 || y < sh.y0 || y > sh.y1) continue;
            if (g.isPointInPath(sh.path, x, y)) {
              if (!counts[s]) touched.push(s);
              counts[s]++;
              break;
            }
          }
        }
      }
      let win = -1;
      let wc = -1;
      for (const s of touched) {
        if (counts[s] > wc || (counts[s] === wc && s > win)) { win = s; wc = counts[s]; }
        if (shapes[s].keep && counts[s] > best[s].cnt) best[s] = { cnt: counts[s], cell: idx };
      }
      for (const s of touched) counts[s] = 0;
      if (win >= 0) { raw[idx] = shapes[win].k; wins[win]++; }
    }
  }

  shapes.forEach((sh, s) => {
    if (sh.keep && wins[s] === 0 && best[s].cell >= 0) raw[best[s].cell] = sh.k;
  });

  const out = finish(n, raw, animal.palette);
  cache.set(key, out);
  return out;
}

// Drop palette colours that ended up with no cells, renumber the rest, and hash.
function finish(n, raw, palette) {
  const used = new Array(palette.length).fill(0);
  for (const v of raw) used[v]++;
  const remap = [];
  const colors = [];
  const tally = [];
  used.forEach((cnt, i) => {
    if (cnt) { remap[i] = colors.length; colors.push(palette[i]); tally.push(cnt); }
  });
  const cells = raw.map((v) => remap[v]);

  let h = 2166136261;
  for (const v of cells) { h ^= v; h = Math.imul(h, 16777619); }
  return { n, cells, colors, counts: tally, hash: (h >>> 0).toString(36) };
}

// ---------- big grids ----------

const BIG = 64;

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const rgbToHex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (hex, to, t) => rgbToHex(hexToRgb(hex).map((v, i) => v + (to[i] - v) * t));
const shadeOf = (hex) => mix(hex, [20, 16, 40], 0.24);
const lightOf = (hex) => mix(hex, [255, 255, 255], 0.38);

function rasterizeBig(animal, n) {
  // Palette: every colour plus a darker shadow and a lighter highlight.
  const palette = [];
  const index = new Map();
  const rank = []; // sort key: base colour, then base / shadow / highlight
  const add = (hex, base, variant) => {
    if (!index.has(hex)) { index.set(hex, palette.length); palette.push(hex); rank.push(base * 3 + variant); }
    return hex;
  };
  animal.palette.forEach((hex, k) => add(hex, k, 0));
  const shade = !animal.flat;

  const cv = document.createElement('canvas');
  cv.width = cv.height = n;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.scale(n / 100, n / 100);

  for (const sh of animal.shapes.flat().map(prepare)) {
    const base = animal.palette[sh.k];
    const w = sh.x1 - sh.x0;
    const h = sh.y1 - sh.y0;
    const backdrop = w >= 90 && (h >= 90 || sh.y1 >= 99);
    g.fillStyle = base;
    g.fill(sh.path);
    if (!shade || backdrop || Math.min(w, h) < 3) continue;

    // Shadow on the lower right, highlight on the upper left.
    const dark = add(shadeOf(base), sh.k, 1);
    const light = add(lightOf(base), sh.k, 2);
    const dd = Math.max(0.8, Math.min(5, Math.min(w, h) * 0.14));
    const dl = dd * 0.6;
    const moved = (dx, dy) => {
      const m = new Path2D();
      m.addPath(sh.path, new DOMMatrix().translate(dx, dy));
      return m;
    };
    g.save();
    g.clip(sh.path);
    g.fillStyle = dark;
    g.fill(sh.path);
    g.fillStyle = base;
    g.fill(moved(-dd, -dd));
    if (light !== base) {
      const ring = new Path2D();
      ring.addPath(sh.path);
      ring.addPath(moved(dl, dl));
      g.fillStyle = light;
      g.fill(ring, 'evenodd');
    }
    g.restore();
  }

  // Map pixels to palette colours. Anti-aliased edge pixels are blends, so they
  // take the most common exact colour around them instead.
  const px = g.getImageData(0, 0, n, n).data;
  const rgb = palette.map(hexToRgb);
  const exact = new Map(rgb.map((c, i) => [(c[0] << 16) | (c[1] << 8) | c[2], i]));
  const raw = new Uint8Array(n * n);
  const fuzzy = [];
  for (let i = 0; i < n * n; i++) {
    const r = px[i * 4], gg = px[i * 4 + 1], b = px[i * 4 + 2];
    const hit = exact.get((r << 16) | (gg << 8) | b);
    if (hit !== undefined) raw[i] = hit;
    else fuzzy.push(i);
  }
  const isFuzzy = new Uint8Array(n * n);
  for (const i of fuzzy) isFuzzy[i] = 1;
  const votes = new Int32Array(palette.length);
  for (const i of fuzzy) {
    const x = i % n;
    const y = (i - x) / n;
    let best = -1;
    let bestVotes = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if ((!dx && !dy) || xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
        const j = yy * n + xx;
        if (isFuzzy[j]) continue;
        const v = ++votes[raw[j]];
        if (v > bestVotes) { bestVotes = v; best = raw[j]; }
      }
    }
    votes.fill(0);
    if (best < 0) {
      // No clean neighbour: use the nearest colour.
      let d = Infinity;
      rgb.forEach((c, k) => {
        const dist = (c[0] - px[i * 4]) ** 2 + (c[1] - px[i * 4 + 1]) ** 2 + (c[2] - px[i * 4 + 2]) ** 2;
        if (dist < d) { d = dist; best = k; }
      });
    }
    raw[i] = best;
  }

  mergeSpecks(raw, n, 24);

  // Number shades right after their base colour.
  const order = palette.map((_, i) => i).sort((a, b) => rank[a] - rank[b]);
  const pos = new Uint8Array(palette.length);
  order.forEach((old, i) => { pos[old] = i; });
  for (let i = 0; i < raw.length; i++) raw[i] = pos[raw[i]];
  return finish(n, raw, order.map((i) => palette[i]));
}

/** Fold areas smaller than `min` cells into the colour that surrounds them most. */
function mergeSpecks(raw, n, min) {
  const seen = new Uint8Array(n * n);
  const stack = [];
  const area = [];
  for (let start = 0; start < n * n; start++) {
    if (seen[start]) continue;
    const k = raw[start];
    seen[start] = 1;
    stack.push(start);
    area.length = 0;
    while (stack.length) {
      const i = stack.pop();
      area.push(i);
      const x = i % n;
      for (const j of [x > 0 ? i - 1 : -1, x < n - 1 ? i + 1 : -1, i - n, i + n]) {
        if (j >= 0 && j < n * n && !seen[j] && raw[j] === k) { seen[j] = 1; stack.push(j); }
      }
    }
    if (area.length >= min) continue;
    const votes = new Map();
    for (const i of area) {
      const x = i % n;
      for (const j of [x > 0 ? i - 1 : -1, x < n - 1 ? i + 1 : -1, i - n, i + n]) {
        if (j >= 0 && j < n * n && raw[j] !== k) votes.set(raw[j], (votes.get(raw[j]) || 0) + 1);
      }
    }
    let best = k;
    let most = 0;
    for (const [c, v] of votes) if (v > most) { most = v; best = c; }
    for (const i of area) raw[i] = best;
  }
}
