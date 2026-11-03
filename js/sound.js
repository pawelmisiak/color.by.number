// Tiny synthesised sounds, so there are no audio files to download.

import { store } from './store.js';

let ac;
let lastPop = 0;
// Pentatonic notes sound pleasant in any order.
const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

export const sound = {
  get on() {
    return store.setting('sound', true);
  },
  set on(v) {
    store.setSetting('sound', v);
    if (!v && 'speechSynthesis' in window) speechSynthesis.cancel();
  },
  unlock() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ac = new AC();
    }
    if (ac && ac.state === 'suspended') ac.resume();
  },
  pop(i = 0) {
    const now = performance.now();
    if (now - lastPop < 45) return;
    lastPop = now;
    tone(SCALE[i % SCALE.length], 0, 0.09, 'sine', 0.18);
  },
  boop() {
    tone(220, 0, 0.12, 'triangle', 0.12);
  },
  chime() {
    [0, 2, 4].forEach((n, i) => tone(SCALE[n] * 1.5, i * 0.08, 0.18, 'triangle', 0.15));
  },
  fanfare() {
    [0, 2, 4, 2, 4, 7].forEach((n, i) => tone(SCALE[n % 8] * (n >= 7 ? 2 : 1), i * 0.13, i === 5 ? 0.6 : 0.16, 'square', 0.07));
  },
  say(text) {
    if (!this.on || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = 1.6;
      u.rate = 1;
      speechSynthesis.speak(u);
    } catch {
      /* speech is a bonus */
    }
  },
};

function tone(freq, delay, dur, type, vol) {
  if (!sound.on || !ac) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}
