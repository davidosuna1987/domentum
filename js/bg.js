// Ambient animated backdrop, one mood per soundscape. Cheap: ~30 fps, capped DPR,
// paused when hidden, static when the user prefers reduced motion.
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

export class Backdrop {
  constructor(canvas) {
    this.cv = canvas;
    this.cx = canvas.getContext('2d');
    this.mood = 'waves';
    this.colors = ['#06233a', '#0b5a78', '#2aa3bd'];
    this.from = this.colors;
    this.mix = 1;
    this.parts = [];
    this.t = 0;
    this.last = 0;
    this.flash = 0;
    this.resize();
    addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => this.loop());
    this.loop();
  }

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    this.w = innerWidth;
    this.h = innerHeight;
    this.cv.width = Math.round(this.w * dpr);
    this.cv.height = Math.round(this.h * dpr);
    this.cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.seed();
    this.draw(0);
  }

  set(mood, colors) {
    if (mood === this.mood && colors === this.colors) return;
    this.from = this.current();
    this.colors = colors;
    this.mix = 0;
    if (mood !== this.mood) {
      this.mood = mood;
      this.seed();
    }
    if (reduce.matches) { this.mix = 1; this.draw(0); }
  }

  current() {
    if (this.mix >= 1) return this.colors;
    return this.colors.map((c, i) => lerpColor(this.from[i], c, this.mix));
  }

  seed() {
    const { w, h } = this;
    const R = Math.random;
    const n = { rain: 140, storm: 220, embers: 46, fireflies: 34, pollen: 40, bokeh: 16, bokehCool: 16, motion: 26, grain: 0, lines: 0, waves: 0, beach: 0, flow: 30 }[this.mood] ?? 0;
    this.parts = Array.from({ length: n }, () => ({ x: R() * w, y: R() * h, z: R(), p: R() * 6.28, s: R() }));
    if (this.mood === 'grain') {
      const g = document.createElement('canvas');
      g.width = g.height = 160;
      const gx = g.getContext('2d');
      const img = gx.createImageData(160, 160);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = R() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 22;
      }
      gx.putImageData(img, 0, 0);
      this.grainPat = gx.createPattern(g, 'repeat');
    }
  }

  loop() {
    cancelAnimationFrame(this.raf);
    if (document.hidden || reduce.matches) return;
    const tick = now => {
      this.raf = requestAnimationFrame(tick);
      if (now - this.last < 33) return;
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.draw(dt);
    };
    this.raf = requestAnimationFrame(tick);
  }

  draw(dt) {
    const { cx, w, h } = this;
    this.t += dt;
    if (this.mix < 1) this.mix = Math.min(1, this.mix + dt / 1.2);
    const [c0, c1, c2] = this.current();
    const g = cx.createLinearGradient(0, 0, w * 0.35, h);
    g.addColorStop(0, c1);
    g.addColorStop(0.55, c0);
    g.addColorStop(1, c0);
    cx.fillStyle = g;
    cx.fillRect(0, 0, w, h);
    // soft glow
    const t = this.t;
    const gx = w * (0.75 + 0.08 * Math.sin(t * 0.07)), gy = h * (0.2 + 0.06 * Math.cos(t * 0.05));
    const rg = cx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.75);
    rg.addColorStop(0, hexA(c2, 0.45));
    rg.addColorStop(1, hexA(c2, 0));
    cx.fillStyle = rg;
    cx.fillRect(0, 0, w, h);
    (this[this.mood] || (() => {})).call(this, dt, c2);
    // vignette
    const vg = cx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    cx.fillStyle = vg;
    cx.fillRect(0, 0, w, h);
  }

  waves(dt, c) { this._waves(c, 0.55, 5); }
  beach(dt, c) {
    const { cx, w, h } = this;
    const sand = cx.createLinearGradient(0, h * 0.55, 0, h);
    sand.addColorStop(0, hexA('#e9d3a8', 0));
    sand.addColorStop(1, hexA('#e9d3a8', 0.35));
    cx.fillStyle = sand;
    cx.fillRect(0, h * 0.55, w, h);
    this._waves('#bfe9f0', 0.62, 3);
  }

  _waves(c, base, n) {
    const { cx, w, h, t } = this;
    for (let i = 0; i < n; i++) {
      const y0 = h * (base + i * 0.08);
      cx.beginPath();
      cx.moveTo(0, h);
      for (let x = 0; x <= w + 20; x += 20) {
        const y = y0 + Math.sin(x * 0.006 + t * (0.25 + i * 0.07) + i) * (10 + i * 4) + Math.sin(x * 0.017 - t * 0.4 + i * 2) * 4;
        cx.lineTo(x, y);
      }
      cx.lineTo(w, h);
      cx.closePath();
      cx.fillStyle = hexA(c, 0.07 + i * 0.015);
      cx.fill();
    }
  }

  rain(dt) { this._rain(dt, 0.18, 1); }
  storm(dt) {
    this._rain(dt, 0.22, 1.5);
    const { cx, w, h } = this;
    if (this.flash <= 0 && Math.random() < dt / 28) this.flash = 1;
    if (this.flash > 0) {
      const a = this.flash > 0.8 ? 0.16 : this.flash * 0.1 * (Math.random() < 0.3 ? 0 : 1);
      cx.fillStyle = `rgba(200,215,255,${a})`;
      cx.fillRect(0, 0, w, h);
      this.flash -= dt * 1.6;
    }
  }

  _rain(dt, alpha, speed) {
    const { cx, w, h } = this;
    cx.strokeStyle = `rgba(220,235,245,${alpha})`;
    cx.lineWidth = 1;
    cx.beginPath();
    for (const p of this.parts) {
      const v = (500 + p.z * 700) * speed;
      p.y += v * dt;
      p.x -= v * dt * 0.12;
      if (p.y > h) { p.y = -20; p.x = Math.random() * (w + 100); }
      const len = 8 + p.z * 16;
      cx.moveTo(p.x, p.y);
      cx.lineTo(p.x - len * 0.12, p.y + len);
    }
    cx.stroke();
  }

  embers(dt) {
    const { cx, w, h, t } = this;
    for (const p of this.parts) {
      p.y -= (20 + p.z * 50) * dt;
      p.x += Math.sin(t * 1.3 + p.p) * 12 * dt;
      if (p.y < -10) { p.y = h + 10; p.x = w * (0.2 + Math.random() * 0.6); }
      const life = p.y / h;
      const a = Math.max(0, Math.min(1, life)) * (0.5 + 0.5 * Math.sin(t * 6 + p.p * 3));
      const r = 1 + p.s * 2.2;
      cx.fillStyle = `rgba(255,${140 + p.s * 80 | 0},60,${a * 0.85})`;
      cx.beginPath();
      cx.arc(p.x, p.y, r, 0, 6.28);
      cx.fill();
    }
  }

  fireflies(dt) { this._glow(dt, 'rgba(220,255,160,', 8, 0.6); }
  pollen(dt) { this._glow(dt, 'rgba(255,245,200,', 6, 0.45); }

  _glow(dt, rgba, speed, amp) {
    const { cx, w, h, t } = this;
    for (const p of this.parts) {
      p.x += Math.cos(t * 0.3 + p.p) * speed * dt;
      p.y += Math.sin(t * 0.25 + p.p * 2) * speed * dt - 2 * dt;
      if (p.y < -10) p.y = h + 10;
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      const a = amp * (0.5 + 0.5 * Math.sin(t * (0.8 + p.s) + p.p));
      const r = 2 + p.z * 3;
      const g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
      g.addColorStop(0, rgba + a + ')');
      g.addColorStop(1, rgba + '0)');
      cx.fillStyle = g;
      cx.fillRect(p.x - r * 4, p.y - r * 4, r * 8, r * 8);
    }
  }

  bokeh() { this._bokeh('rgba(255,210,160,'); }
  bokehCool() { this._bokeh('rgba(180,210,255,'); }

  _bokeh(rgba) {
    const { cx, w, h, t } = this;
    for (const p of this.parts) {
      const x = (p.x + Math.sin(t * 0.05 + p.p) * 40) % w;
      const y = p.y + Math.cos(t * 0.04 + p.p) * 30;
      const r = 30 + p.z * 70;
      const a = 0.05 + 0.06 * (0.5 + 0.5 * Math.sin(t * 0.3 + p.p));
      const g = cx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba + a + ')');
      g.addColorStop(0.7, rgba + a * 0.6 + ')');
      g.addColorStop(1, rgba + '0)');
      cx.fillStyle = g;
      cx.beginPath();
      cx.arc(x, y, r, 0, 6.28);
      cx.fill();
    }
  }

  motion(dt) {
    const { cx, w, h } = this;
    for (const p of this.parts) {
      p.x -= (300 + p.z * 900) * dt;
      if (p.x < -300) { p.x = w + Math.random() * 300; p.y = Math.random() * h; }
      const len = 80 + p.z * 220;
      const g = cx.createLinearGradient(p.x, 0, p.x + len, 0);
      g.addColorStop(0, 'rgba(255,240,210,0)');
      g.addColorStop(0.5, `rgba(255,240,210,${0.05 + p.s * 0.08})`);
      g.addColorStop(1, 'rgba(255,240,210,0)');
      cx.fillStyle = g;
      cx.fillRect(p.x, p.y, len, 1 + p.z * 2);
    }
  }

  flow(dt, c) {
    const { cx, w, h, t } = this;
    cx.lineWidth = 1.2;
    for (const p of this.parts) {
      p.x += (20 + p.z * 50) * dt;
      if (p.x > w + 80) { p.x = -80; p.y = Math.random() * h; }
      cx.strokeStyle = hexA('#d8fff4', 0.08 + p.s * 0.12);
      cx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const x = p.x + i * 10;
        const y = p.y + Math.sin(x * 0.04 + t * 2 + p.p) * 3;
        i ? cx.lineTo(x, y) : cx.moveTo(x, y);
      }
      cx.stroke();
    }
  }

  lines(dt, c) {
    const { cx, w, h, t } = this;
    cx.lineWidth = 1;
    const n = 26;
    for (let i = 0; i < n; i++) {
      cx.strokeStyle = hexA(c, 0.05 + 0.18 * Math.pow(Math.sin((i / n) * Math.PI), 2));
      cx.beginPath();
      const yb = h * 0.15 + (i / n) * h * 0.85;
      for (let x = 0; x <= w + 16; x += 16) {
        const y = yb + Math.sin(x * 0.004 + t * 0.35 + i * 0.22) * 40 + Math.sin(x * 0.011 - t * 0.2 + i * 0.5) * 12;
        x ? cx.lineTo(x, y) : cx.moveTo(x, y);
      }
      cx.stroke();
    }
  }

  grain() {
    const { cx, w, h } = this;
    if (!this.grainPat) return;
    cx.save();
    cx.translate(Math.random() * 160, Math.random() * 160);
    cx.fillStyle = this.grainPat;
    cx.fillRect(-160, -160, w + 320, h + 320);
    cx.restore();
  }
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

function lerpColor(a, b, t) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  const ch = s => Math.round(((x >> s) & 255) + (((y >> s) & 255) - ((x >> s) & 255)) * t);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}
