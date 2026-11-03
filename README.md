# Color Critters 🎨

A color-by-number game for kids with 10 funny animals. Pick a color, tap the squares with its number, and watch the animal appear.

It's plain HTML, CSS and JavaScript with no build step, so GitHub Pages can serve it as-is.

## Features

- **10 funny animals:** Silly Cat, Muddy Pig, Goofy Frog, Winky Owl, Party Penguin, Cool Lion, Wiggly Octopus, Floppy Bunny, Moo Cow, Hungry Panda.
- **3 difficulty levels:** each drawing is vector shapes turned into a grid, so one drawing works at every size.
  - 🐣 **Easy:** 16 × 16, starts with *magic fill* (one tap paints a whole area).
  - 🐥 **Medium:** 24 × 24, starts with the brush.
  - 🦅 **Hard:** 32 × 32, starts with the brush.
- **Tools:** brush (tap or drag), 🪣 magic fill, ✋ move, zoom, and 💡 hint (zooms to a square that still needs the selected color).
- **Kid-friendly help:** gray outlines like a coloring book, the squares for the current color are highlighted, a tap on the wrong square wiggles the right color, and the next color is picked automatically when one is finished.
- **Rewards:** confetti, a little tune, the animal "talks" (speech synthesis), and a star for each level. That's 30 stars to collect.
- **Replay** a time-lapse of how you colored the picture, and **save** it as a PNG.
- **Progress is saved** in the browser (localStorage), on each device separately.
- Works on phones, tablets and computers: pinch to zoom, two-finger pan, mouse wheel zoom.
- Can be installed to the home screen and **works offline** after the first visit.

Keyboard: `1`–`9` pick a color, `+` / `-` / `0` zoom, `H` hint, `B` brush, `F` magic fill, `M` move (or hold Space), `Esc` goes back.

## Hosting on GitHub Pages

1. Merge this into `main`.
2. In the repository go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute the game is at `https://<your-user>.github.io/color.by.number/`.

## Running it on your home network

Any static file server works. From the project folder:

```sh
python3 -m http.server 8000
```

Then open `http://<this-computer's-IP>:8000` on any device on the same Wi-Fi.
(Opening `index.html` straight from disk won't work, because browsers block JavaScript modules on `file://`.)

## Adding a new animal

Animals live in `js/art.js`. Each one is a palette plus a list of shapes on a 100 × 100 canvas:

```js
c(color, cx, cy, r)                 // circle
e(color, cx, cy, rx, ry, rotation)  // ellipse
r(color, x, y, w, h, roundness)     // rectangle
p(color, [x1, y1, x2, y2, ...])     // polygon
d(color, 'M10 10 Q20 0 30 10 Z')    // SVG path (absolute M/L/Q/C/Z only)
pair(shape)                         // the shape plus its mirror image
```

Later shapes are drawn on top of earlier ones. Add `KEEP` as the last argument for tiny details, like eyes, that must survive on the Easy grid.

## Files

| Path | What it does |
| --- | --- |
| `index.html`, `css/style.css` | Page layout and styles |
| `js/art.js` | The animal drawings and the difficulty levels |
| `js/raster.js` | Turns a drawing into numbered grid cells |
| `js/board.js` | The coloring canvas: drawing, painting, zoom and pan |
| `js/main.js` | Screens, palette, saving, win screen |
| `js/sound.js`, `js/confetti.js`, `js/store.js` | Sounds, confetti, saved progress |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline support and home-screen icon |
