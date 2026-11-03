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
    return p && p.h === hash ? p.o : [];
  },
  saveProgress(animalId, levelId, hash, order) {
    if (order.length) data.progress[pkey(animalId, levelId)] = { h: hash, o: order };
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
