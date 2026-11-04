// Shape helpers for the drawings.
// Every picture lives on a 100 x 100 canvas and is built from simple shapes.
// The shapes are rasterised into a grid of cells, so one drawing works at any
// difficulty: a bigger grid just means smaller cells and more of them.
//
// Shape helpers take a colour number first (1-based, matching the palette).
// Pass KEEP as the last argument for small details (eyes, noses...) that must
// always survive, even on the chunkiest Easy grid.

export const KEEP = true;

export const c = (k, cx, cy, r, keep) => ({ t: 'c', k, cx, cy, r, keep });
export const e = (k, cx, cy, rx, ry, rot = 0, keep) => ({ t: 'e', k, cx, cy, rx, ry, rot, keep });
export const r = (k, x, y, w, h, rad = 0, keep) => ({ t: 'r', k, x, y, w, h, rad, keep });
export const p = (k, pts, keep) => ({ t: 'p', k, pts, keep });
export const d = (k, path, keep) => ({ t: 'd', k, d: path, keep });

// Mirror a shape across the vertical centre line.
export function mirror(s) {
  switch (s.t) {
    case 'c': return { ...s, cx: 100 - s.cx };
    case 'e': return { ...s, cx: 100 - s.cx, rot: -s.rot };
    case 'r': return { ...s, x: 100 - s.x - s.w };
    case 'p': return { ...s, pts: s.pts.map((v, i) => (i % 2 ? v : 100 - v)) };
    case 'd': {
      let i = 0;
      const path = s.d.replace(/-?\d*\.?\d+/g, (n) => (i++ % 2 ? n : String(100 - parseFloat(n))));
      return { ...s, d: path };
    }
  }
  return s;
}
export const pair = (s) => [s, mirror(s)];

// A wavy tentacle made of overlapping circles that get thinner towards the tip.
export function tentacle(k, x, y, dx) {
  const out = [];
  const curl = dx >= 0 ? 1 : -1;
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    out.push(c(k, x + dx * t + 4 * curl * Math.sin(t * Math.PI * 2), y + 34 * t, 6.5 - 2.5 * t));
  }
  return out;
}

// A star or spiky burst with `n` points.
export function star(k, cx, cy, R, r, n = 5, keep) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const rad = i % 2 ? r : R;
    pts.push(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
  }
  return p(k, pts, keep);
}

/**
 * Pixel art: one string per row, one character per pixel, drawn on a
 * square grid that fills the 100 x 100 canvas. `colors` maps characters to
 * colour numbers; characters not in the map (like '.') are left empty.
 * With `half: true` each row is the left half and gets mirrored.
 */
export function pix(rows, colors, { half = false } = {}) {
  const lines = half ? rows.map((row) => row + [...row].reverse().join('')) : rows;
  const size = 100 / lines.length;
  const out = [];
  lines.forEach((line, y) => {
    if (line.length !== lines.length) throw new Error(`pix row ${y} is ${line.length} wide, expected ${lines.length}`);
    for (let x = 0; x < line.length; ) {
      const ch = line[x];
      let end = x + 1;
      while (end < line.length && line[end] === ch) end++;
      if (ch in colors) out.push(r(colors[ch], x * size, y * size, (end - x) * size, size));
      x = end;
    }
  });
  return out;
}
