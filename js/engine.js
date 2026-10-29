import { SCENE, soundUrl } from './catalog.js';

// Equal-power fade curves used for every crossfade.
const N = 128;
const CURVE_IN = new Float32Array(N);
const CURVE_OUT = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const x = i / (N - 1);
  CURVE_IN[i] = Math.sin((x * Math.PI) / 2);
  CURVE_OUT[i] = Math.cos((x * Math.PI) / 2);
}

export const volToGain = v => (v <= 0 ? 0 : v * Math.sqrt(v)); // ~perceptual taper

// How far ahead loop segments are scheduled. Long horizons keep audio seamless even
// when the browser throttles timers in a locked phone or a background tab.
const HORIZON = 20 * 60;

// Files are normalised around -16/-18 LUFS; this makeup gain brings a typical mix to a
// comfortable phone level. The limiter after the master catches the rare peak.
const OUTPUT_GAIN = 2;

// Plays a buffer forever: every pass overlaps the previous one by a few seconds
// with an equal-power crossfade, so the seam is inaudible. Starts at a random point.
export class Looper {
  constructor(ctx, buffer, dest, firstFade = 1.5) {
    this.ctx = ctx;
    this.buf = buffer;
    this.dest = dest;
    this.voices = new Set();
    this.X = Math.min(4, buffer.duration / 6);
    const D = buffer.duration;
    const off = Math.random() * Math.max(0, D - 3 * this.X - 6);
    const t0 = ctx.currentTime + 0.04;
    this._voice(t0, off, Math.min(firstFade, (D - off) / 3));
    this.next = t0 + (D - off) - this.X;
    this._refill();
    this.timer = setInterval(() => this._refill(), 20000);
  }

  _refill() {
    const D = this.buf.duration;
    const until = this.ctx.currentTime + HORIZON;
    while (this.next < until) {
      this._voice(this.next, 0, this.X);
      this.next += D - this.X;
    }
  }

  _voice(t, off, fadeIn) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.buf;
    const g = c.createGain();
    g.gain.value = 0;
    src.connect(g);
    g.connect(this.dest);
    const end = t + (this.buf.duration - off);
    g.gain.setValueCurveAtTime(CURVE_IN, t, fadeIn);
    g.gain.setValueCurveAtTime(CURVE_OUT, end - this.X, this.X);
    src.start(t, off);
    src.stop(end + 0.05);
    const v = { src, g };
    this.voices.add(v);
    src.onended = () => {
      this.voices.delete(v);
      try { g.disconnect(); } catch {}
    };
  }

  stop(at = this.ctx.currentTime) {
    clearInterval(this.timer);
    for (const v of this.voices) {
      try { v.src.stop(at); } catch {}
    }
  }
}

// Two very slow, unrelated LFOs nudge a layer's level up and down by about ±1.5 dB,
// the way real wind, waves or a crowd never sit at one volume.
class Drift {
  constructor(ctx, param) {
    this.oscs = [];
    this.depths = [];
    for (const [lo, hi, depth] of [[0.011, 0.024, 0.13], [0.031, 0.06, 0.06]]) {
      const o = ctx.createOscillator();
      o.frequency.value = lo + Math.random() * (hi - lo);
      const d = ctx.createGain();
      d.gain.value = 0;
      d._depth = depth;
      o.connect(d).connect(param);
      o.start(ctx.currentTime + Math.random() * 0.1);
      this.oscs.push(o);
      this.depths.push(d);
    }
    this.ctx = ctx;
  }
  set(on) {
    for (const d of this.depths) d.gain.setTargetAtTime(on ? d._depth : 0, this.ctx.currentTime, 1);
  }
  stop() {
    for (const o of this.oscs) try { o.stop(); } catch {}
  }
}

class SampleLayer {
  constructor(engine, key, loader, out) {
    const c = engine.ctx;
    this.e = engine;
    this.key = key;
    this.loader = loader;
    this.gain = c.createGain();
    this.gain.gain.value = 0;
    this.drift = c.createGain();
    this.gain.connect(this.drift).connect(out);
    this.lfo = new Drift(c, this.drift.gain);
    this.looper = null;
    this.target = 0;
  }

  set(target, playing, breathe) {
    const c = this.e.ctx;
    this.target = target;
    this.gain.gain.setTargetAtTime(target, c.currentTime, 0.08);
    this.lfo.set(breathe);
    clearTimeout(this.idle);
    if (target > 0 && playing) this._ensure();
    else if (target === 0 && this.looper) {
      // Free the voices once a layer has been silent for a while.
      this.idle = setTimeout(() => {
        if (this.target === 0 && this.looper) {
          this.looper.stop();
          this.e.release(this.key);
          this.looper = null;
        }
      }, 6000);
    }
  }

  async _ensure() {
    if (this.looper || this.loading) return;
    this.loading = true;
    this.e.emit(this.key, 'loading');
    try {
      const buf = await this.e.buffer(this.key, this.loader);
      if (this.disposed || this.target === 0 || this.looper) return;
      this.looper = new Looper(this.e.ctx, buf, this.gain);
      this.e.retain(this.key);
      this.e.emit(this.key, 'ready');
    } catch (err) {
      console.warn('No se pudo cargar', this.key, err);
      this.e.emit(this.key, 'error');
    } finally {
      this.loading = false;
    }
  }

  dispose(at) {
    this.disposed = true;
    clearTimeout(this.idle);
    if (this.looper) {
      this.looper.stop(at);
      this.e.release(this.key);
    }
    this.lfo.stop();
    setTimeout(() => { try { this.drift.disconnect(); } catch {} }, Math.max(0, (at - this.e.ctx.currentTime) * 1000) + 200);
  }
}

function makeBus(engine) {
  const g = engine.ctx.createGain();
  g.gain.value = 0;
  g.gain.setTargetAtTime(1, engine.ctx.currentTime, 0.35);
  g.connect(engine.master);
  return g;
}

function fadeAndDrop(engine, bus, seconds, cleanup) {
  const c = engine.ctx;
  bus.gain.cancelScheduledValues(c.currentTime);
  bus.gain.setTargetAtTime(0, c.currentTime, seconds / 4);
  const at = c.currentTime + seconds;
  cleanup(at);
  setTimeout(() => { try { bus.disconnect(); } catch {} }, seconds * 1000 + 300);
}

class SampleScene {
  constructor(engine, id) {
    this.e = engine;
    this.id = id;
    this.bus = makeBus(engine);
    this.layers = new Map();
  }

  defs(st) {
    // Personal: the user's own files plus any sound picked from the other scenes (src = 'scene/layer')
    if (this.id === 'custom') return (st.custom || []).map(c => ({ id: c.id, vol: c.vol ?? 0.5, src: c.src }));
    return SCENE[this.id].layers;
  }

  update(st, playing) {
    const defs = this.defs(st);
    const keep = new Set(defs.map(d => d.id));
    for (const [id, layer] of this.layers) {
      if (!keep.has(id)) {
        layer.dispose(this.e.ctx.currentTime + 0.3);
        this.layers.delete(id);
      }
    }
    for (const d of defs) {
      const key = `${this.id}/${d.id}`;
      let layer = this.layers.get(d.id);
      if (!layer) {
        const loader = d.src ? () => fetchArray(soundUrl(...d.src.split('/')))
          : this.id === 'custom' ? () => this.e.customLoader(d.id) : () => fetchArray(soundUrl(this.id, d.id));
        layer = new SampleLayer(this.e, key, loader, this.bus);
        this.layers.set(d.id, layer);
      }
      const v = st.vols[key] ?? d.vol;
      layer.set(volToGain(v), playing, st.breathe);
    }
  }

  dispose() {
    fadeAndDrop(this.e, this.bus, 1.5, at => {
      for (const l of this.layers.values()) l.dispose(at);
    });
  }
}

async function fetchArray(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.arrayBuffer();
}

// ---------- Synthesised scenes ----------

function noiseBuffer(ctx, type, seconds = 45) {
  const scale = { white: 0.1, pink: 0.52, brown: 0.7 }[type];
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const o = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'white') o[i] = w * scale;
      else if (type === 'brown') { last = (last + 0.02 * w) / 1.02; o[i] = last * 3.5 * scale; }
      else {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        o[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11 * scale;
        b6 = w * 0.115926;
      }
    }
  }
  return buf;
}

function biquad(ctx, type, freq, gain = 0, Q = 0.707) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.gain.value = gain;
  f.Q.value = Q;
  return f;
}

function chain(nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  return nodes;
}

// Builds one noise colour. Returns { stop(at) }.
function buildNoise(engine, variant, out) {
  const c = engine.ctx;
  const base = { brown: 'brown', pink: 'pink', grey: 'pink', white: 'white', plane: 'brown', voices: 'pink' }[variant];
  const stops = [];
  let src;
  if (engine.worklet) {
    src = new AudioWorkletNode(c, 'noise-gen', { numberOfInputs: 0, outputChannelCount: [2], processorOptions: { type: base } });
    stops.push(() => src.port.postMessage('stop'));
  } else {
    src = c.createGain();
    const lp = new Looper(c, noiseBuffer(c, base), src, 0.1);
    stops.push(at => lp.stop(at));
  }
  const filters = {
    brown: () => [biquad(c, 'highpass', 22)],
    pink: () => [],
    grey: () => [biquad(c, 'lowshelf', 170, 6), biquad(c, 'peaking', 3300, -7, 0.6), biquad(c, 'highshelf', 9500, 3)],
    white: () => [],
    plane: () => [biquad(c, 'lowpass', 620, 0, 0.5), biquad(c, 'peaking', 115, 5, 0.9), biquad(c, 'highpass', 30)],
    voices: () => [biquad(c, 'highpass', 220), biquad(c, 'lowpass', 4300), biquad(c, 'peaking', 950, 4, 0.7)],
  }[variant]();
  const trim = c.createGain();
  trim.gain.value = { brown: 1, pink: 1, grey: 0.85, white: 1, plane: 1, voices: 1.25 }[variant];
  chain([src, ...filters, trim]);
  trim.connect(out);

  if (variant === 'plane') {
    // Engine drone with a slow beat between two slightly detuned partials.
    const hum = c.createGain();
    hum.gain.value = 0.012;
    for (const [f, a] of [[96, 1], [96.35, 0.8], [192.4, 0.35]]) {
      const o = c.createOscillator();
      o.frequency.value = f;
      const g = c.createGain();
      g.gain.value = a;
      o.connect(g).connect(hum);
      o.start();
      stops.push(at => o.stop(at));
    }
    hum.connect(trim);
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.06;
    const depth = c.createGain();
    depth.gain.value = 0.08;
    lfo.connect(depth).connect(trim.gain);
    lfo.start();
    stops.push(at => lfo.stop(at));
  }
  return { stop: at => stops.forEach(s => s(at)) };
}

function reverbIR(ctx, seconds = 4.5) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  return buf;
}

// Slow evolving ambient chords (D major family) that never repeat exactly.
const CHORDS = [
  [146.83, 220.0, 277.18, 329.63, 369.99],
  [123.47, 185.0, 220.0, 277.18, 293.66],
  [98.0, 146.83, 196.0, 246.94, 369.99],
  [110.0, 164.81, 246.94, 293.66, 329.63],
  [82.41, 164.81, 196.0, 246.94, 293.66],
];

class Pad {
  constructor(ctx, out) {
    this.ctx = ctx;
    this.filter = biquad(ctx, 'lowpass', 1200, 0, 0.4);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.035;
    const depth = ctx.createGain();
    depth.gain.value = 450;
    lfo.connect(depth).connect(this.filter.frequency);
    lfo.start();
    this.lfo = lfo;
    const verb = ctx.createConvolver();
    verb.buffer = reverbIR(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    const dry = ctx.createGain();
    dry.gain.value = 0.5;
    this.filter.connect(verb).connect(wet).connect(out);
    this.filter.connect(dry).connect(out);
    this.oscs = new Set();
    this.next = ctx.currentTime + 0.1;
    this.chord = 0;
    this._refill();
    this.timer = setInterval(() => this._refill(), 15000);
  }

  _refill() {
    const c = this.ctx;
    while (this.next < c.currentTime + 150) {
      const len = 11 + Math.random() * 6;
      const notes = CHORDS[this.chord];
      for (const f of notes) {
        if (Math.random() < 0.18) continue; // leave voices out now and then
        const g = c.createGain();
        g.gain.value = 0;
        const peak = 0.045 / Math.sqrt(f / 110);
        const t = this.next;
        g.gain.setTargetAtTime(peak, t, 1.6);
        g.gain.setTargetAtTime(0, t + len, 2.2);
        g.connect(this.filter);
        for (const det of [-6, 5]) {
          const o = c.createOscillator();
          o.type = 'triangle';
          o.frequency.value = f;
          o.detune.value = det + (Math.random() * 4 - 2);
          o.connect(g);
          o.start(t);
          o.stop(t + len + 10);
          this.oscs.add(o);
          o.onended = () => { this.oscs.delete(o); try { g.disconnect(); } catch {} };
        }
      }
      this.next += len;
      // random walk through the progression
      this.chord = (this.chord + (Math.random() < 0.7 ? 1 : 2 + Math.floor(Math.random() * 2))) % CHORDS.length;
    }
  }

  stop(at) {
    clearInterval(this.timer);
    for (const o of this.oscs) try { o.stop(at); } catch {}
    try { this.lfo.stop(at); } catch {}
  }
}

function buildBinaural(engine, variant, out) {
  const c = engine.ctx;
  const v = SCENE.binaural.variants.find(x => x.id === variant);
  const merger = c.createChannelMerger(2);
  const level = c.createGain();
  level.gain.value = variant === 'music' ? 0.14 : 0.22;
  const oscs = [];
  [v.carrier, v.carrier + v.beat].forEach((f, ch) => {
    const o = c.createOscillator();
    o.frequency.value = f;
    o.connect(merger, 0, ch);
    o.start();
    oscs.push(o);
  });
  merger.connect(level).connect(out);
  const pad = variant === 'music' ? new Pad(c, out) : null;
  return {
    stop: at => {
      oscs.forEach(o => o.stop(at));
      pad?.stop(at);
    },
  };
}

class SynthScene {
  constructor(engine, id, builder) {
    this.e = engine;
    this.id = id;
    this.build = builder;
    this.bus = makeBus(engine);
    this.cur = null;
    this.variant = null;
  }

  update(st) {
    const c = this.e.ctx;
    if (!this.e.settled) {
      // wait for the noise worklet module before building the first voice
      this.e.ready.then(() => !this.gone && this.update(this.e.state));
      return;
    }
    const variant = st.variants[this.id] || SCENE[this.id].variant;
    if (variant !== this.variant) {
      if (this.cur) {
        const { g, voice } = this.cur;
        g.gain.setTargetAtTime(0, c.currentTime, 0.35);
        voice.stop(c.currentTime + 2);
        setTimeout(() => { try { g.disconnect(); } catch {} }, 2300);
      }
      const g = c.createGain();
      g.gain.value = 0;
      g.gain.setTargetAtTime(1, c.currentTime, 0.35);
      g.connect(this.bus);
      this.cur = { g, voice: this.build(this.e, variant, g) };
      this.variant = variant;
    }
    const vol = st.sceneVols[this.id] ?? SCENE[this.id].vol;
    this.bus.gain.setTargetAtTime(volToGain(vol), c.currentTime, 0.08);
  }

  dispose() {
    this.gone = true;
    fadeAndDrop(this.e, this.bus, 1.5, at => this.cur?.voice.stop(at));
  }
}

// ---------- Engine ----------

export class Engine {
  constructor() {
    this.ctx = null;
    this.scenes = new Map();
    this.cache = new Map(); // key -> { p, users, used }
    this.playing = false;
    this.state = null;
    this.listeners = new Set();
    this.customLoader = async () => { throw new Error('sin cargador'); };
    this.fadeEnd = null;
  }

  on(fn) { this.listeners.add(fn); }
  emit(key, status) { for (const fn of this.listeners) fn(key, status); }

  _init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const c = (this.ctx = new AC({ latencyHint: 'playback' }));
    this.master = c.createGain();
    this.master.gain.value = 0;
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -4;
    limiter.knee.value = 4;
    limiter.ratio.value = 16;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.3;
    this.master.connect(limiter).connect(c.destination);
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    this.worklet = false;
    this.ready = c.audioWorklet && window.AudioWorkletNode
      ? c.audioWorklet.addModule('js/noise-worklet.js').then(() => { this.worklet = true; }, e => console.warn('AudioWorklet no disponible, uso búfer', e))
      : Promise.resolve();
    this.ready.then(() => { this.settled = true; });
    // iOS suspends or "interrupts" the context after calls, Siri or app switches.
    const revive = () => { if (this.playing && c.state !== 'running') c.resume().catch(() => {}); };
    c.onstatechange = () => { if (c.state === 'interrupted') setTimeout(revive, 600); };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) revive(); });
    document.addEventListener('pointerdown', revive, true);
  }

  // A silent, looping media element keeps the audio session alive on iOS (lock
  // screen, mute switch) and anchors the Media Session controls.
  _anchor() {
    if (!this.anchorEl) {
      const rate = 8000, n = rate;
      const buf = new ArrayBuffer(44 + n);
      const v = new DataView(buf);
      const w = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
      w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true);
      v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
      for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
      const el = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
      el.loop = true;
      el.setAttribute('playsinline', '');
      el.setAttribute('x-webkit-airplay', 'deny');
      this.anchorEl = el;
    }
    return this.anchorEl;
  }

  // Must run inside the user's tap: iOS only unlocks audio from a gesture.
  play() {
    if (!this.ctx) this._init();
    this._anchor().play().catch(() => {});
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    clearTimeout(this.suspendT);
    this.playing = true;
    if (this.timerSeconds != null && this.fadeEnd == null) this.fadeEnd = this.ctx.currentTime + this.timerSeconds;
    this._reconcile();
    this._applyMaster(0.5);
  }

  pause(fade = 0.35) {
    this.playing = false;
    this.anchorEl?.pause();
    if (!this.ctx) return;
    const c = this.ctx;
    this.master.gain.cancelScheduledValues(c.currentTime);
    this.master.gain.setTargetAtTime(0, c.currentTime, fade / 4);
    clearTimeout(this.suspendT);
    this.suspendT = setTimeout(() => { if (!this.playing) c.suspend().catch(() => {}); }, fade * 1000 + 150);
  }

  apply(state) {
    this.state = state;
    if (!this.ctx) return;
    this._reconcile();
    if (this.playing) this._applyMaster(0.08);
  }

  _applyMaster(tc) {
    const c = this.ctx;
    const g = this.master.gain;
    const target = volToGain(this.state.master) * OUTPUT_GAIN;
    g.cancelScheduledValues(c.currentTime);
    g.setTargetAtTime(target, c.currentTime, tc / 3);
    if (this.fadeEnd) {
      // Sleep timer: a long, gentle fade that lives on the audio clock.
      const start = Math.max(c.currentTime + tc + 0.1, this.fadeEnd - this.fadeLen);
      g.setValueAtTime(target, start);
      g.linearRampToValueAtTime(0.0001, this.fadeEnd);
    }
  }

  // Schedule a fade-out ending `seconds` of playback from now (null cancels).
  // Uses the audio clock, so it only counts while sound is playing.
  setTimer(seconds, fadeLen = 30) {
    this.timerSeconds = seconds;
    this.fadeLen = Math.min(fadeLen, seconds ?? 0);
    this.fadeEnd = seconds != null && this.ctx ? this.ctx.currentTime + seconds : null;
    if (this.ctx && this.playing) this._applyMaster(0.08);
  }

  timerLeft() {
    if (this.timerSeconds == null) return null;
    if (!this.fadeEnd || !this.ctx) return this.timerSeconds;
    return Math.max(0, this.fadeEnd - this.ctx.currentTime);
  }

  _reconcile() {
    const st = this.state;
    if (!st) return;
    const want = new Set(st.active);
    for (const [id, node] of this.scenes) {
      if (!want.has(id)) {
        node.dispose();
        this.scenes.delete(id);
      }
    }
    for (const id of st.active) {
      let node = this.scenes.get(id);
      if (!node) {
        const type = SCENE[id].type;
        if (type === 'noise') node = new SynthScene(this, id, buildNoise);
        else if (type === 'binaural') node = new SynthScene(this, id, buildBinaural);
        else node = new SampleScene(this, id);
        this.scenes.set(id, node);
      }
      node.update(st, this.playing);
    }
  }

  // ----- decoded buffer cache -----
  buffer(key, loader) {
    let e = this.cache.get(key);
    if (!e) {
      e = { users: 0 };
      e.p = loader().then(ab => this._decode(ab));
      e.p.catch(() => this.cache.delete(key));
      this.cache.set(key, e);
    }
    e.used = Date.now();
    return e.p;
  }

  _decode(ab) {
    return new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej));
  }

  retain(key) {
    const e = this.cache.get(key);
    if (e) e.users++;
  }

  release(key) {
    const e = this.cache.get(key);
    if (e) e.users = Math.max(0, e.users - 1);
    // Keep a few idle buffers around for quick switching; drop the oldest beyond that.
    const idle = [...this.cache.entries()].filter(([, v]) => v.users === 0).sort((a, b) => b[1].used - a[1].used);
    for (const [k] of idle.slice(3)) this.cache.delete(k);
  }

  forget(key) {
    this.cache.delete(key);
  }
}
