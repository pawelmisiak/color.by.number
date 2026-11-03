// Confetti burst on a full-screen canvas.

const COLORS = ['#ff5d8f', '#ffd23f', '#3ec1d3', '#7ed957', '#a86ee8', '#ff9f43'];

export function confetti(canvas, colors = COLORS) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const g = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = innerWidth;
  const H = innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);

  const bits = Array.from({ length: 160 }, (_, i) => ({
    x: W / 2 + (Math.random() - 0.5) * 80,
    y: H * 0.45,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 16 - 6,
    s: 6 + Math.random() * 7,
    a: Math.random() * Math.PI,
    va: (Math.random() - 0.5) * 0.4,
    c: colors[i % colors.length],
    round: Math.random() < 0.3,
  }));

  const start = performance.now();
  canvas.hidden = false;
  (function frame(now) {
    g.clearRect(0, 0, W, H);
    let alive = false;
    for (const b of bits) {
      b.vy += 0.38;
      b.vx *= 0.99;
      b.x += b.vx;
      b.y += b.vy;
      b.a += b.va;
      if (b.y < H + 20) alive = true;
      g.save();
      g.translate(b.x, b.y);
      g.rotate(b.a);
      g.fillStyle = b.c;
      if (b.round) {
        g.beginPath();
        g.arc(0, 0, b.s / 2, 0, Math.PI * 2);
        g.fill();
      } else {
        g.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
      }
      g.restore();
    }
    if (alive && now - start < 6000) requestAnimationFrame(frame);
    else {
      g.clearRect(0, 0, W, H);
      canvas.hidden = true;
    }
  })(start);
}
