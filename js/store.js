// Saved progress lives in localStorage, so each device remembers its own pictures.

const KEY = 'critters.v1';

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

let data = read();
data.progress ||= {};
data.done ||= {};
data.settings ||= {};

function write() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage full or blocked: the game still works, it just won't remember */
  }
}

const pkey = (animalId, levelId) => animalId + ':' + levelId;

// Big pictures (Mega) store which cells are coloured as a bitset, because the
// full fill order would not fit in browser storage. Their replay then runs
// top to bottom instead of in the exact order they were coloured.
const ORDER_LIMIT = 4000;

function packBits(order, total) {
  const bytes = new Uint8Array(Math.ceil(total / 8));
  for (const i of order) bytes[i >> 3] |= 1 << (i & 7);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(bin);
}

function unpackBits(b64) {
  const bin = atob(b64);
  const out = [];
  for (let j = 0; j < bin.length; j++) {
    const byte = bin.charCodeAt(j);
    if (byte) for (let k = 0; k < 8; k++) if (byte & (1 << k)) out.push(j * 8 + k);
  }
  return out;
}

export const store = {
  setting(name, fallback) {
    return name in data.settings ? data.settings[name] : fallback;
  },
  setSetting(name, value) {
    data.settings[name] = value;
    write();
  },

  /** Fill order (cell indices) for a picture, or [] if it doesn't match the current grid. */
  progress(animalId, levelId, hash) {
    const p = data.progress[pkey(animalId, levelId)];
    if (!p || p.h !== hash) return [];
    return p.b ? unpackBits(p.b) : p.o;
  },
  saveProgress(animalId, levelId, hash, order, total = 0) {
    if (order.length > ORDER_LIMIT && total) data.progress[pkey(animalId, levelId)] = { h: hash, b: packBits(order, total) };
    else if (order.length) data.progress[pkey(animalId, levelId)] = { h: hash, o: order };
    else delete data.progress[pkey(animalId, levelId)];
    write();
  },

  isDone(animalId, levelId) {
    return !!data.done[pkey(animalId, levelId)];
  },
  setDone(animalId, levelId, value) {
    if (value) data.done[pkey(animalId, levelId)] = 1;
    else delete data.done[pkey(animalId, levelId)];
    write();
  },
  starCount() {
    return Object.keys(data.done).length;
  },
};
