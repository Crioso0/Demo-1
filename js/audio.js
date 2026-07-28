/* ------------------------------------------------------------------
   audio.js — a couple of hand-rolled WebAudio blips so the demo has
   feedback without shipping any sound files.
------------------------------------------------------------------- */
const Sfx = {
  ctx: null,
  muted: false,

  ready() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    return this.ctx;
  },

  /* browsers block audio until the first gesture */
  resume() {
    const c = this.ready();
    if (c && c.state === 'suspended') c.resume();
  },

  tone({ freq = 440, to = freq, dur = .1, type = 'sine', gain = .08, delay = 0 }) {
    const c = this.ready();
    if (!c || this.muted) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + .008);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    osc.connect(g); g.connect(c.destination);
    osc.start(t0); osc.stop(t0 + dur + .02);
  },

  noise({ dur = .18, gain = .09, filter = 900, delay = 0 }) {
    const c = this.ready();
    if (!c || this.muted) return;
    const t0 = c.currentTime + delay;
    const len = Math.ceil(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const bq = c.createBiquadFilter(); bq.type = 'lowpass'; bq.frequency.value = filter;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    src.connect(bq); bq.connect(g); g.connect(c.destination);
    src.start(t0);
  },

  pop(tier = 0) { this.tone({ freq: 320 + tier * 90, to: 120, dur: .07, type: 'triangle', gain: .05 }); },
  shoot() { this.tone({ freq: 720, to: 380, dur: .05, type: 'square', gain: .022 }); },
  boom() { this.noise({ dur: .34, gain: .12, filter: 500 }); this.tone({ freq: 90, to: 40, dur: .3, type: 'sine', gain: .08 }); },
  zap() { this.tone({ freq: 1400, to: 300, dur: .16, type: 'sawtooth', gain: .04 }); },
  slam() { this.noise({ dur: .26, gain: .1, filter: 320 }); this.tone({ freq: 140, to: 55, dur: .24, type: 'square', gain: .05 }); },
  place() { this.tone({ freq: 420, to: 720, dur: .12, type: 'triangle', gain: .06 }); },
  leak() { this.tone({ freq: 260, to: 90, dur: .3, type: 'sawtooth', gain: .06 }); },
  coin() { this.tone({ freq: 880, dur: .08, type: 'square', gain: .04 }); this.tone({ freq: 1320, dur: .1, type: 'square', gain: .035, delay: .06 }); },
  fanfare() {
    [523, 659, 784, 1046].forEach((f, i) =>
      this.tone({ freq: f, dur: .3, type: 'triangle', gain: .06, delay: i * .11 }));
  },
  crate() { this.noise({ dur: .5, gain: .08, filter: 1400 }); this.tone({ freq: 200, to: 1200, dur: .5, type: 'sine', gain: .05 }); },
  defeat() {
    [440, 370, 294, 220].forEach((f, i) =>
      this.tone({ freq: f, dur: .35, type: 'sawtooth', gain: .05, delay: i * .16 }));
  },
};
