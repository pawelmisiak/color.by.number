// Animal drawings.
// Every picture lives on a 100 x 100 canvas and is built from simple shapes.
// The shapes are rasterised into a grid of cells, so one drawing works at any
// difficulty: a bigger grid just means smaller cells and more of them.
//
// Shape helpers take a colour number first (1-based, matching the palette).
// Pass KEEP as the last argument for small details (eyes, noses...) that must
// always survive, even on the chunkiest Easy grid.

const KEEP = true;

const c = (k, cx, cy, r, keep) => ({ t: 'c', k, cx, cy, r, keep });
const e = (k, cx, cy, rx, ry, rot = 0, keep) => ({ t: 'e', k, cx, cy, rx, ry, rot, keep });
const r = (k, x, y, w, h, rad = 0, keep) => ({ t: 'r', k, x, y, w, h, rad, keep });
const p = (k, pts, keep) => ({ t: 'p', k, pts, keep });
const d = (k, path, keep) => ({ t: 'd', k, d: path, keep });

// Mirror a shape across the vertical centre line.
function mirror(s) {
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
const pair = (s) => [s, mirror(s)];

// A wavy tentacle made of overlapping circles that get thinner towards the tip.
function tentacle(k, x, y, dx) {
  const out = [];
  const curl = dx >= 0 ? 1 : -1;
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    out.push(c(k, x + dx * t + 4 * curl * Math.sin(t * Math.PI * 2), y + 34 * t, 6.5 - 2.5 * t));
  }
  return out;
}

export const ANIMALS = [
  {
    id: 'cat',
    name: 'Silly Cat',
    emoji: '🐱',
    says: 'Meow! I am purr-fect now!',
    palette: ['#9ad7ff', '#ff9f43', '#ffe3b8', '#3b2a20', '#ff7aa8', '#ffffff', '#7ed957', '#d9661a'],
    shapes: [
      r(1, 0, 0, 100, 100),
      r(7, 0, 80, 100, 20),
      d(2, 'M70 84 Q92 84 88 62 Q86 52 92 50 Q100 54 98 66 Q96 94 72 94 Z'),
      e(2, 50, 82, 25, 17),
      e(3, 50, 87, 14, 10),
      pair(e(3, 37, 96, 8, 4.5)),
      pair(p(2, [19, 36, 22, 4, 46, 22])),
      pair(p(5, [25, 30, 26, 13, 39, 23])),
      e(2, 50, 45, 32, 25),
      p(8, [44, 20, 56, 20, 53, 30, 47, 30]),
      pair(r(8, 18, 42, 8, 4)),
      e(3, 50, 57, 15, 10),
      pair(c(6, 37, 41, 8.5)),
      pair(c(4, 42, 42, 4.5, KEEP)),
      p(5, [44, 49, 56, 49, 50, 55], KEEP),
      e(5, 50, 66, 6, 7, 0, KEEP),
    ],
  },
  {
    id: 'pig',
    name: 'Muddy Pig',
    emoji: '🐷',
    says: 'Oink oink! Mud is my favourite!',
    palette: ['#bfe9ff', '#ffb3c7', '#f06292', '#3a2b2b', '#ffffff', '#8d5a3b', '#8bd16b'],
    shapes: [
      r(1, 0, 0, 100, 100),
      r(7, 0, 76, 100, 24),
      e(6, 50, 93, 46, 10),
      e(2, 50, 80, 30, 17),
      pair(r(3, 28, 88, 9, 9, 2)),
      pair(p(3, [22, 32, 18, 6, 42, 20])),
      e(2, 50, 46, 32, 28),
      c(6, 69, 26, 6),
      c(6, 76, 33, 3),
      e(3, 50, 56, 14, 10),
      pair(e(4, 45, 56, 2.5, 4, 0, KEEP)),
      pair(c(5, 37, 38, 7)),
      pair(c(4, 38, 39, 4, KEEP)),
      pair(c(3, 28, 56, 4.5)),
      e(4, 50, 70, 7, 3.5, 0, KEEP),
      c(6, 30, 66, 4),
    ],
  },
  {
    id: 'frog',
    name: 'Goofy Frog',
    emoji: '🐸',
    says: 'Ribbit! Look at my googly eyes!',
    palette: ['#7fd3f7', '#6ccf4f', '#d4f59a', '#23331f', '#ffffff', '#ff8fab', '#2e9e4f', '#ffd23f'],
    shapes: [
      r(1, 0, 0, 100, 100),
      e(7, 50, 87, 46, 13),
      e(2, 50, 68, 30, 21),
      e(3, 50, 75, 18, 13),
      pair(e(2, 28, 86, 11, 6)),
      e(2, 50, 47, 35, 20),
      pair(c(2, 29, 29, 14)),
      pair(c(5, 29, 28, 9.5)),
      c(4, 33, 26, 4.5, KEEP),
      c(4, 66, 31, 4.5, KEEP),
      d(4, 'M24 48 Q50 76 76 48 Q50 58 24 48 Z'),
      e(6, 50, 59, 8, 4, 0, KEEP),
      pair(c(6, 23, 54, 4.5)),
      c(8, 88, 12, 4, KEEP),
      e(5, 85, 7, 4, 2.5, -30),
      e(5, 92, 8, 4, 2.5, 30),
    ],
  },
  {
    id: 'owl',
    name: 'Winky Owl',
    emoji: '🦉',
    says: 'Hoo-hoo! I can wink, can you?',
    palette: ['#2c3e7a', '#a0673f', '#f0cf9b', '#ffffff', '#1d1d1d', '#ffa62b', '#ffe066', '#5d3a1f'],
    shapes: [
      r(1, 0, 0, 100, 100),
      c(7, 83, 16, 10),
      c(7, 13, 12, 2.5, KEEP),
      c(7, 28, 6, 2, KEEP),
      c(7, 92, 40, 2, KEEP),
      c(7, 8, 46, 2, KEEP),
      r(8, 0, 85, 100, 8, 3),
      pair(p(2, [22, 32, 20, 8, 40, 24])),
      e(2, 50, 56, 28, 32),
      pair(e(8, 23, 62, 8, 18, 12)),
      e(3, 50, 67, 18, 20),
      pair(p(2, [42, 62, 46, 68, 50, 62])),
      pair(c(3, 38, 41, 12)),
      c(4, 38, 41, 8.5),
      c(5, 39, 42, 4.5, KEEP),
      r(5, 54, 41, 16, 4, 2, KEEP),
      p(6, [45, 50, 55, 50, 50, 59], KEEP),
      pair(e(6, 40, 87, 6, 3.5)),
    ],
  },
  {
    id: 'penguin',
    name: 'Party Penguin',
    emoji: '🐧',
    says: 'Let\'s party! Waddle waddle!',
    palette: ['#74c7f0', '#2b2d42', '#ffffff', '#ff9f1c', '#ff5d8f', '#ffd23f', '#d6ecf8'],
    shapes: [
      r(1, 0, 0, 100, 100),
      e(7, 50, 100, 70, 18),
      e(2, 50, 62, 27, 32),
      e(2, 23, 66, 7, 16, 20),
      e(2, 78, 44, 6.5, 16, 40),
      e(3, 50, 68, 18, 24),
      c(3, 42, 42, 10),
      c(3, 58, 42, 10),
      c(2, 43, 42, 3.5, KEEP),
      c(2, 57, 42, 3.5, KEEP),
      p(4, [44, 49, 56, 49, 50, 56], KEEP),
      pair(p(5, [40, 55, 50, 59, 40, 63])),
      c(6, 50, 59, 2.5, KEEP),
      pair(e(4, 40, 94, 9, 4)),
      p(5, [38, 33, 62, 33, 54, 5]),
      c(6, 48, 25, 2.5, KEEP),
      c(6, 55, 18, 2, KEEP),
      c(6, 54, 5, 4.5, KEEP),
      c(6, 14, 16, 2, KEEP),
      c(5, 86, 14, 2, KEEP),
      c(6, 88, 70, 2, KEEP),
      c(5, 12, 52, 2, KEEP),
    ],
  },
  {
    id: 'lion',
    name: 'Cool Lion',
    emoji: '🦁',
    says: 'Roar! I am the coolest cat in town!',
    palette: ['#9ee0ff', '#d9792b', '#ffc94a', '#2d2017', '#fff1c9', '#9bd35a'],
    shapes: [
      r(1, 0, 0, 100, 100),
      r(6, 0, 82, 100, 18),
      e(3, 50, 96, 22, 12),
      ...Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return c(2, 50 + 32 * Math.cos(a), 48 + 32 * Math.sin(a), 11);
      }),
      c(2, 50, 48, 33),
      pair(c(3, 30, 26, 8)),
      pair(c(2, 30, 26, 4)),
      c(3, 50, 50, 25),
      e(5, 50, 62, 13, 9),
      p(4, [45, 55, 55, 55, 50, 60], KEEP),
      e(4, 50, 67, 4, 2, 0, KEEP),
      pair(r(4, 31, 40, 16, 11, 4)),
      r(4, 46, 42, 8, 3),
      pair(c(5, 36, 43, 2, KEEP)),
    ],
  },
  {
    id: 'octopus',
    name: 'Wiggly Octopus',
    emoji: '🐙',
    says: 'Blub blub! Eight arms for eight hugs!',
    palette: ['#4fb3e8', '#a86ee8', '#dcbfff', '#2a1f3d', '#ffffff', '#f6d79b', '#3fbf7f', '#ff8fb1'],
    shapes: [
      r(1, 0, 0, 100, 100),
      d(7, 'M6 94 Q0 78 9 66 Q16 54 8 42 L14 40 Q22 54 15 66 Q8 78 13 94 Z'),
      d(7, 'M88 94 Q82 80 90 70 Q96 60 90 52 L95 50 Q102 62 95 72 Q89 82 95 94 Z'),
      r(6, 0, 90, 100, 10),
      c(6, 30, 92, 6),
      c(6, 72, 91, 7),
      ...[[30, -15], [43, -5], [57, 5], [70, 15]].flatMap(([x, dx]) => tentacle(2, x, 58, dx)),
      e(2, 50, 42, 27, 28),
      c(3, 40, 23, 4.5),
      c(3, 60, 21, 3.5),
      c(3, 67, 34, 4),
      pair(c(5, 40, 46, 7.5)),
      pair(c(4, 41, 48, 4, KEEP)),
      pair(c(8, 31, 57, 4.5)),
      e(4, 50, 60, 4, 4, 0, KEEP),
      c(5, 79, 30, 4, KEEP),
      c(5, 84, 18, 3, KEEP),
      c(5, 80, 8, 2.5, KEEP),
    ],
  },
  {
    id: 'bunny',
    name: 'Floppy Bunny',
    emoji: '🐰',
    says: 'Hop hop! Carrots make me super fast!',
    palette: ['#c8f0ff', '#e4e1ee', '#ffaac9', '#2e2a33', '#ffffff', '#ff8c2b', '#6cc04a'],
    shapes: [
      r(1, 0, 0, 100, 100),
      r(7, 0, 84, 100, 16),
      e(2, 38, 20, 8, 21, -10),
      e(3, 38, 21, 4, 15, -10),
      e(2, 72, 26, 8, 21, 55),
      e(3, 72, 26, 4, 15, 55),
      e(2, 50, 82, 24, 18),
      e(5, 50, 86, 13, 10),
      e(2, 50, 52, 25, 22),
      pair(c(4, 41, 47, 3.5, KEEP)),
      pair(c(3, 33, 58, 4.5)),
      p(3, [46, 55, 54, 55, 50, 59], KEEP),
      r(5, 46, 61, 8, 7, 1, KEEP),
      p(6, [72, 68, 84, 74, 62, 98]),
      p(7, [77, 68, 74, 56, 82, 64]),
      p(7, [80, 70, 92, 60, 86, 72]),
      pair(e(5, 37, 97, 9, 4)),
    ],
  },
  {
    id: 'cow',
    name: 'Moo Cow',
    emoji: '🐮',
    says: 'Moooo! Ring my bell, ding ding!',
    palette: ['#aee3ff', '#ffffff', '#2b2b2b', '#ffb0c4', '#f7e1a6', '#77cc55', '#ffd93b'],
    shapes: [
      r(1, 0, 0, 100, 100),
      r(6, 0, 80, 100, 20),
      e(2, 50, 94, 30, 16),
      e(3, 70, 92, 8, 5),
      pair(e(5, 30, 15, 4, 11, -30)),
      pair(e(2, 18, 34, 12, 6, 20)),
      pair(e(4, 18, 34, 7, 3, 20)),
      e(2, 50, 42, 27, 25),
      c(3, 37, 32, 9),
      e(3, 66, 22, 6, 5),
      c(2, 38, 35, 4.5),
      c(3, 39, 36, 2.5, KEEP),
      c(3, 62, 35, 3.5, KEEP),
      e(4, 50, 59, 20, 12),
      pair(e(3, 42, 58, 2.5, 3.5, 0, KEEP)),
      c(7, 50, 76, 5, KEEP),
      c(4, 12, 90, 3, KEEP),
      c(7, 12, 90, 1.5, KEEP),
      c(4, 88, 86, 3, KEEP),
    ],
  },
  {
    id: 'panda',
    name: 'Hungry Panda',
    emoji: '🐼',
    says: 'Munch munch! Bamboo is yummy!',
    palette: ['#b8f2d0', '#ffffff', '#2b2b2b', '#5cbf3a', '#2f8a2f', '#ffa3c2'],
    shapes: [
      r(1, 0, 0, 100, 100),
      r(4, 4, 0, 9, 100),
      r(5, 3, 28, 11, 3),
      r(5, 3, 62, 11, 3),
      r(4, 88, 0, 9, 100),
      r(5, 87, 18, 11, 3),
      r(5, 87, 52, 11, 3),
      pair(c(3, 28, 24, 10)),
      e(2, 50, 88, 28, 20),
      r(4, 66, 56, 7, 44),
      e(5, 78, 54, 8, 3.5, -30),
      pair(e(3, 27, 82, 9, 13, 20)),
      e(2, 50, 48, 28, 24),
      pair(e(3, 38, 46, 7, 9, 30)),
      pair(c(2, 39, 45, 3, KEEP)),
      e(3, 50, 56, 5, 3.5, 0, KEEP),
      pair(c(6, 31, 58, 4)),
      pair(e(3, 35, 100, 9, 5)),
    ],
  },
];

export const LEVELS = [
  { id: 'easy', name: 'Easy', emoji: '🐣', size: 16, tool: 'bucket', blurb: 'Big squares, magic fill' },
  { id: 'medium', name: 'Medium', emoji: '🐥', size: 24, tool: 'brush', blurb: 'More squares to paint' },
  { id: 'hard', name: 'Hard', emoji: '🦅', size: 32, tool: 'brush', blurb: 'Tiny squares, big challenge' },
];
