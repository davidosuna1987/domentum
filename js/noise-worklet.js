// Endless, non-repeating stereo noise. Each channel has its own generator so the
// image is wide instead of a mono point in the middle of the head.
// Roughly loudness-matched: white RMS ~0.06, pink ~0.10, brown ~0.14 (brown sounds quieter per dB).
const SCALE = { white: 0.1, pink: 0.52, brown: 0.7 };

class NoiseGen extends AudioWorkletProcessor {
  constructor(opts) {
    super();
    this.type = opts.processorOptions.type || 'pink';
    this.st = [];
    this.alive = true;
    this.port.onmessage = e => { if (e.data === 'stop') this.alive = false; };
  }

  process(_, outputs) {
    const out = outputs[0];
    const k = SCALE[this.type];
    for (let ch = 0; ch < out.length; ch++) {
      const o = out[ch];
      const s = this.st[ch] || (this.st[ch] = { b0: 0, b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, b6: 0, last: 0 });
      if (this.type === 'white') {
        for (let i = 0; i < o.length; i++) o[i] = (Math.random() * 2 - 1) * k;
      } else if (this.type === 'brown') {
        for (let i = 0; i < o.length; i++) {
          s.last = (s.last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
          o[i] = s.last * 3.5 * k;
        }
      } else {
        // Paul Kellet's refined pink filter
        for (let i = 0; i < o.length; i++) {
          const w = Math.random() * 2 - 1;
          s.b0 = 0.99886 * s.b0 + w * 0.0555179;
          s.b1 = 0.99332 * s.b1 + w * 0.0750759;
          s.b2 = 0.969 * s.b2 + w * 0.153852;
          s.b3 = 0.8665 * s.b3 + w * 0.3104856;
          s.b4 = 0.55 * s.b4 + w * 0.5329522;
          s.b5 = -0.7616 * s.b5 - w * 0.016898;
          o[i] = (s.b0 + s.b1 + s.b2 + s.b3 + s.b4 + s.b5 + s.b6 + w * 0.5362) * 0.11 * k;
          s.b6 = w * 0.115926;
        }
      }
    }
    return this.alive;
  }
}

registerProcessor('noise-gen', NoiseGen);
