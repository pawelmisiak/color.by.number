// Turns a vector drawing (see art.js) into a grid of numbered cells.
// Each cell is sampled 3 x 3 times and takes the colour of the shape that
// covers most of it. Shapes marked "keep" that would vanish on a small grid
// are rescued into the cell they cover best.

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

  // Drop palette colours that ended up with no cells and renumber the rest.
  const used = new Array(animal.palette.length).fill(0);
  for (const v of raw) used[v]++;
  const remap = [];
  const colors = [];
  const tally = [];
  used.forEach((cnt, i) => {
    if (cnt) { remap[i] = colors.length; colors.push(animal.palette[i]); tally.push(cnt); }
  });
  const cells = raw.map((v) => remap[v]);

  let h = 2166136261;
  for (const v of cells) { h ^= v; h = Math.imul(h, 16777619); }

  const out = { n, cells, colors, counts: tally, hash: (h >>> 0).toString(36) };
  cache.set(key, out);
  return out;
}
