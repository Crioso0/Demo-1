/* ------------------------------------------------------------------
   audio.js — every sound is synthesised at runtime, no audio files.

   The approach: real-world sounds are mostly a noise transient plus a
   pitched body. A balloon pop is a broadband crack with a low cavity
   thump behind it; a circular saw is a buzzing blade tone amplitude-
   modulated at the rate its teeth pass, plus a bed of grind noise. So
   the toolkit below is two primitives — `tone` and `noise` (filtered,
   with a sweepable cutoff) — and each effect layers them.
------------------------------------------------------------------- */
const Sfx = {
  ctx: null,
  master: null,
  noiseBuf: null,
  muted: false,
  _voices: new Set(),   // sustained sounds (the saw) that must be stopped
  _popTimes: [],        // gate so a cascading balloon isn't a machine gun

  ready() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const c = new AC();
    this.ctx = c;

    /* a compressor keeps a wave of simultaneous pops from clipping */
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -15;
    comp.knee.value = 24;
    comp.ratio.value = 9;
    comp.attack.value = .003;
    comp.release.value = .2;
    const out = c.createGain();
    out.gain.value = .85;
    comp.connect(out);
    out.connect(c.destination);
    this.master = comp;

    /* one reusable bed of white noise — cheaper than minting a buffer per shot */
    const len = Math.ceil(c.sampleRate * 2);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;

    return c;
  },

  /* browsers block audio until the first gesture */
  resume() {
    const c = this.ready();
    if (c && c.state === 'suspended') c.resume();
  },

  stopAll() {
    for (const v of [...this._voices]) v.stop();
  },

  /* ---------------- primitives ---------------- */

  /** a pitched body: one oscillator with an optional glide */
  tone({ freq = 440, to = freq, dur = .1, type = 'sine', gain = .08, delay = 0, attack = .004,
         hold = 0 }) {
    const c = this.ready();
    if (!c || this.muted) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    const atk = Math.min(attack, dur * .5);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + atk);
    if (hold > 0) g.gain.setValueAtTime(gain, t0 + Math.min(atk + hold, dur * .9));
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + .02);
  },

  /** a transient: filtered noise with a sweepable cutoff */
  noise({ dur = .18, gain = .09, type = 'lowpass', freq = 1200, freqTo = 0, q = 1,
          delay = 0, attack = .002, hold = 0 }) {
    const c = this.ready();
    if (!c || this.muted) return;
    const t0 = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const bq = c.createBiquadFilter();
    bq.type = type;
    bq.Q.value = q;
    bq.frequency.setValueAtTime(freq, t0);
    if (freqTo) bq.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), t0 + dur);
    const g = c.createGain();
    const atk = Math.min(attack, dur * .4);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + atk);
    if (hold > 0) g.gain.setValueAtTime(gain, t0 + Math.min(atk + hold, dur * .9));
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    src.connect(bq); bq.connect(g); g.connect(this.master);
    /* start somewhere random in the bed so repeats don't sound identical */
    src.start(t0, Math.random() * (2 - dur - .05), dur + .04);
  },

  /* ---------------- balloons ---------------- */

  /**
   * A trooper going down: armour cracking apart over a short low thud, with a
   * fizz off the ruptured power core. Heavier grades crack lower and duller.
   */
  kill(tier = 0) {
    const c = this.ready();
    if (!c || this.muted) return;
    /* a pink balloon cascades five layers in one frame — thin the stack */
    const now = c.currentTime;
    this._popTimes = this._popTimes.filter((t) => t > now - .05);
    if (this._popTimes.length >= 3) return;
    this._popTimes.push(now);

    const t = clamp(tier, 0, 4);
    const crack = 2000 - t * 190;
    /* the plate splitting */
    this.noise({ dur: .06, gain: .22, type: 'bandpass', freq: crack, freqTo: crack * .3, q: 1.1, attack: .0006 });
    /* metal debris scatter */
    this.noise({ dur: .09, gain: .1, type: 'highpass', freq: 3600, attack: .0005 });
    /* body thud */
    this.tone({ freq: 190 - t * 20, to: 58, dur: .1, type: 'sine', gain: .13, attack: .001 });
    /* core fizz */
    this.tone({ freq: 1500 + t * 120, to: 400, dur: .07, type: 'sawtooth', gain: .03, attack: .001 });
  },

  /** a balloon reaching the bastion: the squeal of one deflating away */
  leak() {
    this.tone({ freq: 920, to: 170, dur: .55, type: 'sawtooth', gain: .06, attack: .012, hold: .3 });
    this.tone({ freq: 934, to: 164, dur: .55, type: 'square', gain: .03, attack: .012, hold: .3 });
    this.noise({ dur: .55, gain: .14, type: 'bandpass', freq: 1300, freqTo: 380, q: 2.2, hold: .25 });
  },

  /* ---------------- weapons ---------------- */

  /** dart leaving a barrel: a short airy thwip that rises as it goes */
  shoot() {
    this.noise({ dur: .05, gain: .26, type: 'bandpass', freq: 900, freqTo: 3400, q: 1.4, attack: .001 });
    this.tone({ freq: 430, to: 1500, dur: .04, type: 'sine', gain: .03, attack: .001 });
  },

  /** a ring of metal tacks flung at once */
  tack() {
    this.noise({ dur: .06, gain: .3, type: 'bandpass', freq: 3200, freqTo: 1500, q: 3, attack: .001 });
    [2400, 3150, 4300].forEach((f, i) =>
      this.tone({ freq: f, to: f * .82, dur: .07, type: 'triangle', gain: .022, delay: i * .012, attack: .001 }));
  },

  /** explosion: a hard crack, a filtered body that darkens, and a sub drop */
  boom() {
    this.noise({ dur: .05, gain: .24, type: 'highpass', freq: 1300, attack: .0007 });
    this.noise({ dur: .75, gain: .2, type: 'lowpass', freq: 950, freqTo: 110, q: .7, attack: .004, hold: .1 });
    this.tone({ freq: 125, to: 32, dur: .6, type: 'sine', gain: .18, attack: .002, hold: .08 });
  },

  /** frost pulse: an airy rush upward with icy partials over it */
  frost() {
    this.noise({ dur: .4, gain: .055, type: 'highpass', freq: 2000, freqTo: 7500, attack: .025 });
    [1850, 2470, 3300].forEach((f, i) =>
      this.tone({ freq: f, to: f * 1.16, dur: .45, type: 'sine', gain: .024, delay: i * .03, attack: .015 }));
  },

  /** lightning: a bright crackle collapsing downward, then a thunder tail */
  zap() {
    this.noise({ dur: .12, gain: .3, type: 'bandpass', freq: 5200, freqTo: 1100, q: .8, attack: .0006 });
    this.tone({ freq: 2700, to: 210, dur: .14, type: 'sawtooth', gain: .05, attack: .001 });
    this.noise({ dur: .28, gain: .05, type: 'lowpass', freq: 420, freqTo: 150, delay: .05, attack: .01 });
  },

  /** stone slam: a deep impact with debris rattling after it */
  slam() {
    this.tone({ freq: 132, to: 33, dur: .5, type: 'sine', gain: .21, attack: .002, hold: .07 });
    this.noise({ dur: .45, gain: .16, type: 'lowpass', freq: 620, freqTo: 110, attack: .001, hold: .05 });
    for (let i = 0; i < 4; i++) {
      this.noise({ dur: .05, gain: .028, type: 'bandpass', freq: rand(1200, 2700), q: 2.4,
        delay: .06 + i * .05, attack: .001 });
    }
  },

  /* ---------------- the ring construct ---------------- */

  /** a light electric jab — Streak and Verdant's passive shots */
  spark() {
    this.noise({ dur: .07, gain: .16, type: 'bandpass', freq: 4200, freqTo: 1800, q: 2.4, attack: .0006 });
    this.tone({ freq: 1900, to: 700, dur: .07, type: 'sawtooth', gain: .022, attack: .001 });
  },

  /** Overdrive kicking in: a sonic-boom crack into a electric whine */
  overdrive() {
    this.noise({ dur: .12, gain: .3, type: 'highpass', freq: 1800, attack: .0006 });
    this.tone({ freq: 220, to: 2400, dur: .35, type: 'sawtooth', gain: .06, attack: .01 });
    this.tone({ freq: 2400, to: 1800, dur: .8, type: 'square', gain: .022, delay: .3, attack: .05, hold: .3 });
    this.noise({ dur: .7, gain: .05, type: 'bandpass', freq: 3000, freqTo: 6000, q: 1.6, delay: .25, attack: .08 });
  },

  /** Verdant winding up: a rising charge with an energy rush behind it */
  ultCharge() {
    this.tone({ freq: 170, to: 1450, dur: .45, type: 'sawtooth', gain: .05, attack: .06 });
    this.noise({ dur: .45, gain: .06, type: 'bandpass', freq: 600, freqTo: 5200, q: 1.4, attack: .05 });
  },

  /** the lance igniting: a deep charge and a bright ignition crack */
  lanceStart() {
    this.tone({ freq: 90, to: 700, dur: .3, type: 'sawtooth', gain: .07, attack: .02 });
    this.noise({ dur: .16, gain: .3, type: 'highpass', freq: 2200, attack: .001, delay: .16 });
  },

  /**
   * The solar lance while it burns: a searing sustained voice — a bright
   * detuned pair over a wide band of roaring noise.
   */
  startLance() {
    const c = this.ready();
    const noop = { stop() {} };
    if (!c || this.muted) return noop;
    const t0 = c.currentTime;

    const out = c.createGain();
    out.gain.setValueAtTime(.0001, t0);
    out.gain.linearRampToValueAtTime(.13, t0 + .1);
    out.connect(this.master);

    const a = c.createOscillator(); a.type = 'sawtooth'; a.frequency.setValueAtTime(320, t0);
    const b = c.createOscillator(); b.type = 'sawtooth'; b.frequency.setValueAtTime(324, t0);
    const og = c.createGain(); og.gain.value = .22;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.Q.value = 3;
    a.connect(og); b.connect(og); og.connect(lp); lp.connect(out);

    const roar = c.createBufferSource(); roar.buffer = this.noiseBuf; roar.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = .7;
    const rg = c.createGain(); rg.gain.value = .5;
    roar.connect(bp); bp.connect(rg); rg.connect(out);

    a.start(t0); b.start(t0); roar.start(t0, Math.random() * 1.5);

    const voice = {
      stopped: false,
      bite() {},
      stop() {
        if (voice.stopped) return;
        voice.stopped = true;
        const n = c.currentTime;
        out.gain.cancelScheduledValues(n);
        out.gain.setValueAtTime(Math.max(.0001, out.gain.value), n);
        out.gain.exponentialRampToValueAtTime(.0001, n + .25);
        a.stop(n + .3); b.stop(n + .3); roar.stop(n + .3);
        Sfx._voices.delete(voice);
      },
    };
    this._voices.add(voice);
    return voice;
  },

  /**
   * The sawblade, as a sustained voice rather than a one-shot.
   * A blade tone plus its octave, amplitude-modulated at the rate the teeth
   * pass (that's the "brrrr"), with a bed of bandpassed grind noise. It
   * spins up on start, bites when it cuts something, and spins down on stop.
   */
  startSaw(level = 1) {
    const c = this.ready();
    const noop = { stop() {}, bite() {} };
    if (!c || this.muted) return noop;

    const t0 = c.currentTime;
    const base = 78 + (level - 1) * 15;

    const out = c.createGain();
    out.gain.setValueAtTime(.0001, t0);
    out.gain.linearRampToValueAtTime(.12, t0 + .14);
    out.connect(this.master);

    /* tooth chatter: an LFO swings the blade's amplitude 0..1 */
    const am = c.createGain();
    am.gain.value = .5;
    const amDepth = c.createGain();
    amDepth.gain.value = .5;
    const lfo = c.createOscillator();
    lfo.type = 'sawtooth';
    lfo.frequency.setValueAtTime(26 + (level - 1) * 8, t0);
    lfo.connect(amDepth); amDepth.connect(am.gain);

    const blade = c.createOscillator();
    blade.type = 'sawtooth';
    blade.frequency.setValueAtTime(base, t0);
    const blade2 = c.createOscillator();
    blade2.type = 'square';
    blade2.frequency.setValueAtTime(base * 2.02, t0);
    const mix = c.createGain();
    mix.gain.value = .45;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2300 + (level - 1) * 800;
    lp.Q.value = .8;
    blade.connect(mix); blade2.connect(mix);
    mix.connect(lp); lp.connect(am); am.connect(out);

    /* the grind */
    const grind = c.createBufferSource();
    grind.buffer = this.noiseBuf;
    grind.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400 + (level - 1) * 900;
    bp.Q.value = 1.1;
    const gg = c.createGain();
    const grindLevel = .085 + (level - 1) * .022;
    gg.gain.value = grindLevel;
    grind.connect(bp); bp.connect(gg); gg.connect(out);

    blade.start(t0); blade2.start(t0); lfo.start(t0);
    grind.start(t0, Math.random() * 1.5);

    const voice = {
      stopped: false,
      /** a momentary bite when the blade meets a balloon */
      bite() {
        if (voice.stopped) return;
        const n = c.currentTime;
        gg.gain.cancelScheduledValues(n);
        gg.gain.setValueAtTime(grindLevel * 2.7, n);
        gg.gain.exponentialRampToValueAtTime(grindLevel, n + .15);
        blade.frequency.cancelScheduledValues(n);
        blade.frequency.setValueAtTime(base * 1.16, n);
        blade.frequency.exponentialRampToValueAtTime(base, n + .2);
      },
      stop() {
        if (voice.stopped) return;
        voice.stopped = true;
        const n = c.currentTime;
        /* spin down rather than cut out */
        blade.frequency.cancelScheduledValues(n);
        blade.frequency.setValueAtTime(Math.max(1, blade.frequency.value), n);
        blade.frequency.exponentialRampToValueAtTime(base * .4, n + .3);
        lfo.frequency.cancelScheduledValues(n);
        lfo.frequency.setValueAtTime(Math.max(1, lfo.frequency.value), n);
        lfo.frequency.exponentialRampToValueAtTime(6, n + .3);
        out.gain.cancelScheduledValues(n);
        out.gain.setValueAtTime(Math.max(.0001, out.gain.value), n);
        out.gain.exponentialRampToValueAtTime(.0001, n + .32);
        blade.stop(n + .36); blade2.stop(n + .36); lfo.stop(n + .36); grind.stop(n + .36);
        Sfx._voices.delete(voice);
      },
    };
    this._voices.add(voice);
    return voice;
  },

  /* ---------------- interface ---------------- */

  /** placing a unit: a wooden thunk with a small confirming chime */
  place() {
    this.noise({ dur: .09, gain: .11, type: 'lowpass', freq: 850, freqTo: 200, attack: .001 });
    this.tone({ freq: 185, to: 118, dur: .1, type: 'sine', gain: .08, attack: .002 });
    this.tone({ freq: 720, to: 1080, dur: .12, type: 'triangle', gain: .04, delay: .035 });
  },

  /** money: a bright metallic ding over a register clunk, then coins settling */
  coin() {
    this.noise({ dur: .05, gain: .16, type: 'bandpass', freq: 5200, q: 2, attack: .0005 });
    [1568, 2349, 3136].forEach((f, i) =>
      this.tone({ freq: f, to: f * .99, dur: .34, type: 'triangle', gain: .04, delay: i * .015, attack: .001 }));
    this.tone({ freq: 320, to: 180, dur: .12, type: 'sine', gain: .07, delay: .01, attack: .002 });
    for (let i = 0; i < 4; i++) {
      this.noise({ dur: .05, gain: .05, type: 'bandpass', freq: rand(3200, 6200), q: 4,
        delay: .09 + i * .045, attack: .0006 });
    }
  },

  /**
   * A coin landing in the counter. The pitch climbs with the kill streak so a
   * good run sounds like a run of good luck — purely audible, no economy change.
   */
  pickup(streak = 1) {
    const step = Math.min(streak - 1, 15);
    const f = 880 * Math.pow(2, step / 12);       // a semitone per kill
    this.tone({ freq: f, dur: .09, type: 'triangle', gain: .035, attack: .001 });
    this.tone({ freq: f * 1.5, dur: .07, type: 'sine', gain: .022, delay: .015, attack: .001 });
    this.noise({ dur: .03, gain: .05, type: 'highpass', freq: 6000, attack: .0005 });
  },

  /** a round or level payout: the same ka-ching with a rising cash flourish */
  cash() {
    this.coin();
    [1046, 1319, 1568, 2093].forEach((f, i) =>
      this.tone({ freq: f, dur: .3, type: 'triangle', gain: .045, delay: .05 + i * .06, attack: .002 }));
    this.tone({ freq: 262, to: 392, dur: .35, type: 'sine', gain: .05, delay: .05, attack: .01 });
  },

  click() {
    this.tone({ freq: 660, to: 880, dur: .05, type: 'triangle', gain: .03, attack: .001 });
  },

  /* ---------------- counters and new abilities ---------------- */

  /** damage bouncing off an immune escort */
  deflect() {
    this.tone({ freq: 1400, to: 2100, dur: .09, type: 'square', gain: .03, attack: .001 });
    this.noise({ dur: .07, gain: .12, type: 'bandpass', freq: 3400, q: 4, attack: .0006 });
  },

  /** a hero being jammed by a counter escort */
  suppress() {
    this.tone({ freq: 620, to: 180, dur: .34, type: 'sawtooth', gain: .05, attack: .004 });
    this.noise({ dur: .3, gain: .07, type: 'lowpass', freq: 1400, freqTo: 300, attack: .006 });
  },

  /** Havoc's fists meeting the ground */
  smash() {
    this.tone({ freq: 150, to: 42, dur: .28, type: 'sine', gain: .17, attack: .001, hold: .04 });
    this.noise({ dur: .22, gain: .16, type: 'lowpass', freq: 800, freqTo: 160, attack: .001 });
  },

  /** the full Thunderclap: a colossal double impact */
  thunderclap() {
    this.noise({ dur: .07, gain: .3, type: 'highpass', freq: 900, attack: .0006 });
    this.noise({ dur: 1.1, gain: .24, type: 'lowpass', freq: 1200, freqTo: 90, attack: .003, hold: .16 });
    this.tone({ freq: 150, to: 26, dur: .95, type: 'sine', gain: .22, attack: .002, hold: .12 });
    this.tone({ freq: 88, to: 30, dur: 1.2, type: 'square', gain: .07, delay: .05, attack: .01, hold: .2 });
  },

  /** Jester's cards leaving his hand */
  cards() {
    for (let i = 0; i < 3; i++) {
      this.noise({ dur: .045, gain: .13, type: 'bandpass', freq: rand(2600, 4200), q: 3,
        delay: i * .022, attack: .0008 });
    }
  },

  /** Wild Card: a stinger that refuses to settle */
  wildcard() {
    [523, 622, 740, 880, 1046].forEach((f, i) =>
      this.tone({ freq: f * (i % 2 ? .97 : 1.03), dur: .18, type: 'square',
        gain: .04, delay: i * .05, attack: .002 }));
    this.noise({ dur: .5, gain: .07, type: 'bandpass', freq: 900, freqTo: 4200, q: 1.2, attack: .02 });
    this.tone({ freq: 300, to: 90, dur: .5, type: 'sawtooth', gain: .04, delay: .22, attack: .01 });
  },

  /** Nocturne finishing his prep */
  mark() {
    this.tone({ freq: 1200, to: 1600, dur: .1, type: 'sine', gain: .035, attack: .002 });
    this.tone({ freq: 300, to: 220, dur: .4, type: 'triangle', gain: .05, delay: .05, attack: .01, hold: .1 });
    for (let i = 0; i < 3; i++) {
      this.noise({ dur: .05, gain: .07, type: 'bandpass', freq: 5200, q: 5, delay: .08 + i * .06 });
    }
  },

  /** Ironclad emptying the pods */
  missiles() {
    for (let i = 0; i < 6; i++) {
      this.noise({ dur: .16, gain: .11, type: 'bandpass', freq: 1200, freqTo: 3600, q: 1.4,
        delay: i * .045, attack: .004 });
      this.tone({ freq: 420 + i * 40, to: 1500, dur: .18, type: 'sawtooth', gain: .022,
        delay: i * .045, attack: .004 });
    }
  },

  /** can't afford it / can't do that */
  deny() {
    this.tone({ freq: 225, to: 155, dur: .12, type: 'square', gain: .05, attack: .002 });
    this.tone({ freq: 168, to: 112, dur: .14, type: 'square', gain: .04, delay: .055, attack: .002 });
  },

  /** the crate straining before it bursts: a low wooden rumble */
  crateRumble() {
    this.noise({ dur: 1.15, gain: .06, type: 'lowpass', freq: 260, freqTo: 700, q: .9, attack: .3 });
    this.tone({ freq: 150, to: 400, dur: 1.15, type: 'sawtooth', gain: .028, attack: .3 });
  },

  /** crate: the lid cracking open, then a rush of sparkle */
  crate() {
    this.noise({ dur: .08, gain: .19, type: 'bandpass', freq: 950, freqTo: 300, q: 1.2, attack: .0008 });
    this.noise({ dur: .5, gain: .07, type: 'highpass', freq: 3000, freqTo: 9000, attack: .035 });
    for (let i = 0; i < 7; i++) {
      this.tone({ freq: 1200 + i * 390, dur: .34, type: 'sine', gain: .02, delay: .06 + i * .05, attack: .002 });
    }
  },

  fanfare() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => {
      this.tone({ freq: f, dur: .32, type: 'triangle', gain: .07, delay: i * .1 });
      this.tone({ freq: f * 2, dur: .2, type: 'sine', gain: .022, delay: i * .1 });
    });
    [523, 659, 784, 1318].forEach((f) =>
      this.tone({ freq: f, dur: .9, type: 'triangle', gain: .045, delay: .44, attack: .02 }));
  },

  defeat() {
    [440, 370, 294, 208].forEach((f, i) =>
      this.tone({ freq: f, to: f * .97, dur: .45, type: 'sawtooth', gain: .05, delay: i * .17, attack: .01 }));
    this.noise({ dur: 1.2, gain: .03, type: 'lowpass', freq: 520, freqTo: 180, delay: .5, attack: .1 });
  },
};
