import { CATEGORIES, ALL, LEVELS } from './art.js';
import { rasterize } from './raster.js';
import { Board, drawThumb } from './board.js';
import { store } from './store.js';
import { sound } from './sound.js';
import { confetti } from './confetti.js';

const $ = (sel) => document.querySelector(sel);
const home = $('#home');
const game = $('#game');
const win = $('#win');

let levelIdx = Math.max(0, LEVELS.findIndex((l) => l.id === store.setting('level', 'easy')));
let catIdx = Math.max(0, CATEGORIES.findIndex((c) => c.id === store.setting('cat', CATEGORIES[0].id)));
let current = null; // { animal, level, grid }
let saveTimer = 0;

const board = new Board($('#board'), {
  onTouch: () => sound.unlock(),
  onFill(k) {
    sound.pop(k);
    updateSwatch(k);
    updateProgress();
    queueSave();
  },
  onColorDone(k) {
    sound.chime();
    updateSwatch(k);
    const next = nextColor(k);
    if (next >= 0 && !board.complete) setTimeout(() => selectColor(next), 350);
  },
  onWrong(k) {
    sound.boop();
    const sw = swatch(k);
    if (sw) {
      sw.classList.remove('wiggle');
      void sw.offsetWidth;
      sw.classList.add('wiggle');
      sw.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
    toast(`That square needs color ${k + 1}`);
  },
  onPick: (k) => selectColor(k),
  onComplete: finish,
});

// ---------- home ----------

function renderHome() {
  $('#starTotal').textContent = store.starCount();
  $('#starMax').textContent = ALL.length * LEVELS.length;
  $('#prizeNote').hidden = bucketUnlocked();

  const cats = $('#cats');
  cats.innerHTML = '';
  CATEGORIES.forEach((cat, i) => {
    const got = cat.items.reduce((n, a) => n + LEVELS.filter((L) => store.isDone(a.id, L.id)).length, 0);
    const b = document.createElement('button');
    b.className = 'cat-tab';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(i === catIdx));
    b.dataset.cat = cat.id;
    b.innerHTML = `<span class="cat-emoji">${cat.emoji}</span><span class="cat-name">${cat.name}</span><span class="cat-stars">★ ${got}/${cat.items.length * LEVELS.length}</span>`;
    b.onclick = () => {
      catIdx = i;
      store.setSetting('cat', cat.id);
      renderHome();
    };
    cats.appendChild(b);
  });

  const levels = $('#levels');
  levels.innerHTML = '';
  LEVELS.forEach((L, i) => {
    const b = document.createElement('button');
    b.className = 'level';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(i === levelIdx));
    b.dataset.level = L.id;
    b.innerHTML = `<span class="level-emoji">${L.emoji}</span><span class="level-name">${L.name}</span><span class="level-blurb">${L.size} × ${L.size} · ${L.blurb}</span>`;
    b.onclick = () => {
      levelIdx = i;
      store.setSetting('level', L.id);
      renderHome();
    };
    levels.appendChild(b);
  });

  const level = LEVELS[levelIdx];
  const cat = CATEGORIES[catIdx];
  $('#galleryTitle').textContent = `${cat.emoji} ${cat.name}`;
  const gallery = $('#gallery');
  gallery.innerHTML = '';
  const li = levelIdx;
  const note = $('#levelNote');
  note.hidden = li === 0;
  note.textContent = li ? `🔒 Pictures open up here after you finish them on ${LEVELS[li - 1].name}.` : '';
  cat.items.forEach((a, i) => {
    const grid = rasterize(a, level.size);
    const locked = !isUnlocked(a, li);
    const order = store.progress(a.id, level.id, grid.hash);
    const complete = order.length === grid.cells.length;
    const pct = Math.round((order.length / grid.cells.length) * 100);

    const card = document.createElement('button');
    card.className = 'card' + (complete ? ' is-done' : '') + (locked ? ' is-locked' : '');
    card.style.setProperty('--tilt', `${(i % 2 ? 1 : -1) * (0.6 + (i % 3) * 0.4)}deg`);
    card.setAttribute('aria-label', `${a.name}${locked ? `, locked until finished on ${LEVELS[li - 1].name}` : complete ? ', finished' : pct ? `, ${pct}% colored` : ''}`);

    const cv = document.createElement('canvas');
    cv.className = 'thumb';
    drawThumb(cv, grid, new Set(order), complete);

    const stars = LEVELS.map((L) => `<span class="${store.isDone(a.id, L.id) ? 'on' : ''}" title="${L.name}">★</span>`).join('');
    const badge = locked ? '<span class="badge lock">🔒</span>' : complete ? '<span class="badge">Done!</span>' : pct ? `<span class="mini-bar"><i style="width:${pct}%"></i></span>` : '<span class="badge new">New</span>';
    card.innerHTML = `<span class="card-top">${badge}</span>`;
    card.appendChild(cv);
    card.insertAdjacentHTML('beforeend', `<span class="card-name">${a.emoji} ${a.name}</span><span class="card-stars" aria-hidden="true">${stars}</span>`
      + (locked ? `<span class="card-lock">Finish it on ${LEVELS[li - 1].name} first</span>` : ''));
    card.onclick = () => go(a.id, level.id);
    gallery.appendChild(card);
  });
}

$('#surprise').onclick = () => {
  const level = LEVELS[levelIdx];
  const items = CATEGORIES[catIdx].items;
  const li = LEVELS.indexOf(level);
  const playable = items.filter((a) => isUnlocked(a, li));
  const open = playable.filter((a) => !store.isDone(a.id, level.id));
  const pool = open.length ? open : playable.length ? playable : items;
  go(pool[Math.floor(Math.random() * pool.length)].id, level.id);
};

// ---------- game ----------

function go(animalId, levelId) {
  sound.unlock();
  location.hash = `#/${animalId}/${levelId}`;
}

function route() {
  const m = location.hash.match(/^#\/(\w+)\/(\w+)/);
  const animal = m && ALL.find((a) => a.id === m[1]);
  const level = m && LEVELS.find((l) => l.id === m[2]);
  if (win.open) win.close();
  if (!animal || !level) return showHome();
  const want = LEVELS.indexOf(level);
  const li = playableLevel(animal, want);
  if (li === want) return openGame(animal, level);
  // Locked: open the level that unlocks it instead, and say why.
  history.replaceState(null, '', `#/${animal.id}/${LEVELS[li].id}`);
  openGame(animal, LEVELS[li]);
  toast(`🔒 Finish ${animal.name} on ${LEVELS[li].name} to unlock ${LEVELS[li + 1].name}!`, 4000);
}

function showHome() {
  flushSave();
  current = null;
  game.hidden = true;
  home.hidden = false;
  document.title = 'Color Critters';
  renderHome();
}

function openGame(animal, level) {
  flushSave();
  const grid = rasterize(animal, level.size);
  current = { animal, level, grid };
  home.hidden = true;
  game.hidden = false;
  document.title = `${animal.name} · Color Critters`;
  $('#gEmoji').textContent = animal.emoji;
  $('#gName').textContent = animal.name;

  board.load(grid, store.progress(animal.id, level.id, grid.hash));
  syncLock();
  const tool = level.tool === 'bucket' && !bucketUnlocked() ? 'brush' : level.tool;
  setTool(tool);
  buildPalette();
  updateProgress();
  const first = board.remaining.findIndex((r) => r > 0);
  selectColor(Math.max(0, first));

  if (board.complete) toast('All done! Tap 🔄 to color it again', 3500);
  else if (!board.order.length) {
    toast(tool === 'bucket'
      ? 'Pick a color, then tap a gray area. Magic fill does the rest!'
      : 'Pick a color, then tap or drag over the squares with its number', 4000);
  }
  if (!board.complete && board.base < 13) setTimeout(() => toast('Pinch or press ＋ to zoom in and see the numbers', 3500), board.order.length ? 0 : 4200);
}

function buildPalette() {
  const pal = $('#palette');
  pal.innerHTML = '';
  current.grid.colors.forEach((hex, k) => {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.dataset.k = k;
    b.style.setProperty('--c', hex);
    b.style.setProperty('--txt', ink(hex));
    b.innerHTML = `<span class="num">${k + 1}</span><span class="check" aria-hidden="true">✓</span>`;
    b.onclick = () => {
      sound.unlock();
      selectColor(k);
      secretTap(k + 1);
    };
    pal.appendChild(b);
    updateSwatch(k);
  });
}

const swatch = (k) => $(`#palette .swatch[data-k="${k}"]`);

function updateSwatch(k) {
  const b = swatch(k);
  if (!b) return;
  const total = current.grid.counts[k];
  const left = board.remaining[k];
  b.style.setProperty('--p', `${((total - left) / total) * 100}%`);
  b.classList.toggle('done', left === 0);
  b.setAttribute('aria-label', `Color ${k + 1}${left === 0 ? ', finished' : `, ${left} squares left`}`);
}

function selectColor(k) {
  board.setColor(k);
  document.querySelectorAll('#palette .swatch').forEach((b) => {
    const on = Number(b.dataset.k) === k;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-pressed', String(on));
    if (on) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  });
}

function nextColor(from) {
  const n = board.remaining.length;
  for (let s = 1; s <= n; s++) {
    const k = (from + s) % n;
    if (board.remaining[k] > 0) return k;
  }
  return -1;
}

function updateProgress() {
  const pct = Math.floor((board.order.length / board.cells.length) * 100);
  $('#gProg').style.width = pct + '%';
  $('#gPct').textContent = pct + '%';
}

function setTool(t) {
  if (t === 'bucket' && !bucketUnlocked()) {
    sound.boop();
    const b = $('.tools [data-tool="bucket"]');
    b.classList.remove('wiggle');
    void b.offsetWidth;
    b.classList.add('wiggle');
    toast('🔒 Magic Fill is a prize! Finish any picture to unlock it.', 3000);
    return;
  }
  board.setTool(t);
  document.querySelectorAll('.tools [data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === t)));
}

function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 400);
}

function flushSave() {
  clearTimeout(saveTimer);
  if (!current) return;
  store.saveProgress(current.animal.id, current.level.id, current.grid.hash, board.order);
}

// ---------- level locks ----------
// Easy is always open. A picture unlocks on a harder level once it has been
// finished on the level below. Pictures already started or finished on a
// level stay open, so nobody loses work.

function isUnlocked(a, li) {
  if (li <= 0) return true;
  const L = LEVELS[li];
  if (store.isDone(a.id, LEVELS[li - 1].id) || store.isDone(a.id, L.id)) return true;
  const grid = rasterize(a, L.size);
  return store.progress(a.id, L.id, grid.hash).length > 0;
}

/** The hardest level of a picture that can be played now, up to `li`. */
function playableLevel(a, li) {
  while (li > 0 && !isUnlocked(a, li)) li--;
  return li;
}

// ---------- magic fill prize ----------
// Magic fill starts locked. Finishing any picture unlocks it for good,
// and so does tapping the colour buttons 1 1 5 5 6 6 5 in a row.

const SECRET = '1155665';
let secret = '';

function bucketUnlocked() {
  return store.setting('bucket', false) || store.starCount() > 0;
}

function syncLock() {
  const b = $('.tools [data-tool="bucket"]');
  const locked = !bucketUnlocked();
  b.classList.toggle('locked', locked);
  b.setAttribute('aria-label', locked ? 'Magic fill (locked: finish any picture to unlock)' : 'Magic fill: paint a whole area');
  b.title = locked ? 'Magic fill is locked: finish any picture to unlock it' : 'Magic fill (F)';
}

function secretTap(num) {
  secret = (secret + num).slice(-SECRET.length);
  if (secret !== SECRET) return;
  secret = '';
  if (bucketUnlocked()) {
    toast('🤫 Psst… you already have Magic Fill!');
    return;
  }
  store.setSetting('bucket', true);
  syncLock();
  setTool('bucket');
  sound.fanfare();
  confetti($('#confetti'));
  toast('🤫 Secret code! 🪣 Magic Fill unlocked!', 3500);
}

// ---------- finishing ----------

function finish() {
  flushSave();
  const { animal, level } = current;
  const firstTime = !store.isDone(animal.id, level.id);
  const prize = !bucketUnlocked();
  store.setDone(animal.id, level.id, true);
  if (prize) {
    store.setSetting('bucket', true);
    syncLock();
  }
  updateProgress();
  sound.fanfare();
  setTimeout(() => sound.say(animal.says), 900);
  confetti($('#confetti'), current.grid.colors);
  showWin(firstTime, prize);
}

function showWin(firstTime, prize = false) {
  $('#winPrize').hidden = !prize;
  const li = LEVELS.indexOf(current.level);
  const up = LEVELS[li + 1];
  $('#winUnlock').hidden = !(up && firstTime);
  if (up) $('#winUnlock').textContent = `🔓 ${current.animal.name} is now unlocked on ${up.name}!`;
  $('#levelUpBtn').hidden = !up;
  if (up) $('#levelUpBtn').textContent = `${up.emoji} Play on ${up.name} ›`;
  $('#nextBtn').classList.toggle('go', !up);
  const { animal, level } = current;
  $('#winImg').src = board.snapshot(16).toDataURL();
  $('#winImg').alt = `Your finished ${animal.name}`;
  $('#winSay').textContent = animal.says;
  $('#winTitle').textContent = ['Hooray!', 'Amazing!', 'You did it!', 'Super star!'][Math.floor(Math.random() * 4)];
  $('#winStars').innerHTML = LEVELS.map((L) => `<span class="${store.isDone(animal.id, L.id) ? 'on' : ''} ${L.id === level.id && firstTime ? 'new' : ''}">★<small>${L.name}</small></span>`).join('');
  if (!win.open) win.showModal();
}

$('#replayBtn').onclick = () => {
  win.close();
  board.replay(4000, () => showWin(false));
};
$('#saveBtn').onclick = () => {
  const px = Math.ceil(1024 / board.n);
  board.snapshot(px).toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${current.animal.id}-${current.level.id}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });
};
$('#nextBtn').onclick = () => {
  const cat = CATEGORIES.find((c) => c.items.some((a) => a.id === current.animal.id));
  const i = cat.items.findIndex((a) => a.id === current.animal.id);
  go(cat.items[(i + 1) % cat.items.length].id, current.level.id);
};
$('#levelUpBtn').onclick = () => {
  const up = LEVELS[LEVELS.indexOf(current.level) + 1];
  if (up) go(current.animal.id, up.id);
};
$('#homeBtn').onclick = () => { location.hash = ''; };
win.addEventListener('cancel', () => {});

// ---------- controls ----------

$('#backBtn').onclick = () => { location.hash = ''; };
$('#zoomIn').onclick = () => board.zoomBy(1.4);
$('#zoomOut').onclick = () => board.zoomBy(1 / 1.4);
$('#fitBtn').onclick = () => board.fit();
$('#hintBtn').onclick = () => board.hint();
document.querySelectorAll('.tools [data-tool]').forEach((b) => { b.onclick = () => setTool(b.dataset.tool); });

$('#resetBtn').onclick = () => {
  if (!current || !board.order.length) return;
  if (!confirm(`Start ${current.animal.name} again from a blank page? Your stars stay.`)) return;
  store.saveProgress(current.animal.id, current.level.id, current.grid.hash, []);
  openGame(current.animal, current.level);
};

function syncSound() {
  document.querySelectorAll('.sound-btn').forEach((b) => {
    b.textContent = sound.on ? '🔊' : '🔇';
    b.setAttribute('aria-label', sound.on ? 'Sound on' : 'Sound off');
    b.setAttribute('aria-pressed', String(sound.on));
  });
}
document.querySelectorAll('.sound-btn').forEach((b) => {
  b.onclick = () => {
    sound.on = !sound.on;
    sound.unlock();
    syncSound();
  };
});
syncSound();

document.addEventListener('keydown', (e) => {
  if (game.hidden || win.open || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (/^[1-9]$/.test(k) && Number(k) <= board.remaining.length) {
    selectColor(Number(k) - 1);
    secretTap(k);
  }
  else if (k === '+' || k === '=') board.zoomBy(1.4);
  else if (k === '-' || k === '_') board.zoomBy(1 / 1.4);
  else if (k === '0') board.fit();
  else if (k === 'h') board.hint();
  else if (k === 'b' || k === 'p') setTool('brush');
  else if (k === 'f' || k === 'g') setTool('bucket');
  else if (k === 'm') setTool('hand');
  else if (k === ' ') { board.spaceDown = true; e.preventDefault(); return; }
  else if (k === 'Escape') { location.hash = ''; }
  else return;
  e.preventDefault();
});
document.addEventListener('keyup', (e) => { if (e.key === ' ') board.spaceDown = false; });

let toastTimer = 0;
function toast(text, ms = 2200) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

function ink(hex) {
  const v = parseInt(hex.slice(1), 16);
  const l = 0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255);
  return l > 150 ? '#1f2a44' : '#ffffff';
}

window.addEventListener('hashchange', route);
window.addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });
document.fonts?.ready.then(() => board.request());
if (new URLSearchParams(location.search).has('debug')) window.board = board;
route();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
