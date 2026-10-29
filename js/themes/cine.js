// Cine: the focused scene fills the whole screen as an illustration and the UI floats over it in white.
// Every landscape is drawn here as one SVG, from the scene's mood and colours: sky, sun or moon and
// layered silhouettes. The canvas backdrop ('bare') adds the moving particles (rain, embers…) on top.
// The same drawings, cropped and simplified, are the frames of the filmstrip.

const n1 = v => Math.round(v * 10) / 10;
let LITE = false; // thumbnails: coarser paths, no stars

// Small deterministic random, so a scene always looks the same
function rng(seed) {
  let s = seed % 2147483646 + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const seedOf = id => [...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 2147483000, 7);

// Colours
const rgb = h => (h.length === 4 ? [1, 2, 3].map(i => h[i] + h[i]) : [1, 3, 5].map(i => h.slice(i, i + 2))).map(x => parseInt(x, 16));
const hex = c => '#' + c.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };

// Gradients
const stops = s => s.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}"${a < 1 ? ` stop-opacity="${a}"` : ''}/>`).join('');
const lin = (id, s, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops(s)}</linearGradient>`;
const rad = (id, s, at = '') => `<radialGradient id="${id}"${at ? ` gradientUnits="userSpaceOnUse" ${at}` : ''}>${stops(s)}</radialGradient>`;
const glowStops = (c, a = 0.6) => [[0, c, a], [0.45, c, a * 0.35], [1, c, 0]];

// Terrain: smooth hills (lowest point `base`, highest `base - amp`) and rocky peaks
function hills(base, amp, r, detail = 1) {
  const ws = [0, 1, 2, 3].map(i => ({ f: (0.0018 + r() * 0.0024) * (1 + i * 1.9), p: r() * 7, a: 1 / (1 + i * (1.6 / detail)) }));
  const tot = ws.reduce((s, w) => s + w.a, 0);
  return x => base - amp * (0.5 + 0.5 * ws.reduce((s, w) => s + w.a * Math.sin(x * w.f + w.p), 0) / tot);
}
function peaks(base, amp, r, n = 8) {
  const h = hills(base, amp * 0.45, r, 2.4);
  const pk = Array.from({ length: n }, () => ({ x: r() * 1800 - 100, w: 110 + r() * 200, a: amp * (0.35 + r() * 0.65) }));
  return x => h(x) - pk.reduce((s, p) => s + Math.max(0, p.a * (1 - Math.abs(x - p.x) / p.w)), 0);
}
function line(fn, x0 = -60, x1 = 1660, step = LITE ? 32 : 16) {
  let d = '';
  for (let x = x0; x < x1; x += step) d += `L${x} ${n1(fn(x))}`;
  return d + `L${x1} ${n1(fn(x1))}`;
}
const area = (fn, color, extra = '') => `<path d="M-60 1010${line(fn)}L1660 1010Z" fill="${color}"${extra}/>`;

// A pine: four stacked tiers and a trunk; a treeline follows a terrain function
function pine(x, y, h) {
  const w = h * 0.34;
  let d = `M${n1(x - h * 0.025)} ${n1(y)}h${n1(h * 0.05)}v${n1(-h * 0.24)}h${n1(-h * 0.05)}Z`;
  for (let k = 0; k < 4; k++) {
    const top = y - h + k * h * 0.19, bot = top + h * 0.36, hw = w * (0.3 + k * 0.22);
    d += `M${n1(x)} ${n1(top)}L${n1(x + hw)} ${n1(bot)}L${n1(x - hw)} ${n1(bot)}Z`;
  }
  return d;
}
function treeline(fn, n, h0, h1, r, x0 = -40, x1 = 1640) {
  let d = '';
  if (LITE) n = Math.ceil(n * 0.6);
  for (let i = 0; i < n; i++) {
    const x = x0 + (x1 - x0) * (i + r()) / n;
    d += pine(x, fn(x) + 10, h0 + r() * (h1 - h0));
  }
  return d;
}

const stars = (r, n, maxY) => LITE ? '' : Array.from({ length: n }, (_, i) =>
  `<circle cx="${n1(r() * 1600)}" cy="${n1(r() * maxY)}" r="${n1(0.8 + r() * 1.3)}" fill="#fff" opacity="${n1(0.2 + r() * 0.6)}"${i % 6 ? '' : ' class="cn-tw"'}/>`).join('');

// Soft clouds: ellipses filled with a radial gradient that fades out at the edge
function puffs(r, n, x0, x1, y0, y1, sx, sy, grad) {
  let s = '';
  for (let i = 0; i < n; i++) {
    s += `<ellipse cx="${n1(x0 + (x1 - x0) * r())}" cy="${n1(y0 + (y1 - y0) * r())}" rx="${n1(sx * (0.6 + r() * 0.8))}" ry="${n1(sy * (0.6 + r() * 0.7))}" fill="url(#${grad})"/>`;
  }
  return s;
}

// A bank of cloud tops (sea of clouds) seen from above
function cloudTops(y, size, r, color, extra = '') {
  let s = '';
  for (let x = -120; x < 1760; x += size * (0.7 + r() * 0.5)) {
    const rr = size * (0.55 + r() * 0.6);
    s += `<circle cx="${n1(x)}" cy="${n1(y + rr * 0.55 + r() * 20)}" r="${n1(rr)}"/>`;
  }
  return `<g fill="${color}"${extra}>${s}<rect x="-120" y="${y + size * 0.5}" width="1880" height="${1010 - y}"/></g>`;
}

const wave = (y, a, L, ph, close = true) => {
  let d = `M-200 ${y}`;
  for (let x = -200; x <= 1900; x += LITE ? 32 : 16) d += `L${x} ${n1(y + a * Math.sin(x / L * 2 * Math.PI + ph) + a * 0.4 * Math.sin(x / (L * 0.37) * 2 * Math.PI + ph * 2))}`;
  return close ? d + 'L1900 1010L-200 1010Z' : d;
};
const gull = (x, y, s, col) => `<path d="M${x} ${y}q${10 * s} ${-8 * s} ${20 * s} 0q${10 * s} ${-8 * s} ${20 * s} 0" fill="none" stroke="${col}" stroke-width="${n1(2.4 * s)}" stroke-linecap="round"/>`;

// A palm frond: a sagging spine with jagged leaflets on both sides
function frond(x, y, ang, len, droop, w) {
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len + droop;
  const cx = x + Math.cos(ang) * len * 0.55, cy = y + Math.sin(ang) * len * 0.55 - droop * 0.35;
  const at = t => [(1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t * t * ex, (1 - t) ** 2 * y + 2 * (1 - t) * t * cy + t * t * ey];
  const a = [], b = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, [px, py] = at(t), [qx, qy] = at(Math.min(1, t + 0.02));
    let nx = py - qy, ny = qx - px;
    const l = Math.hypot(nx, ny) || 1;
    nx /= l; ny /= l;
    const ww = w * Math.sin(Math.PI * Math.min(1, t * 1.1)) * (i % 2 ? 1 : 0.62);
    a.push([px + nx * ww, py + ny * ww]);
    b.push([px - nx * ww * 0.8, py - ny * ww * 0.8]);
  }
  return 'M' + [...a, ...b.reverse()].map(p => `${n1(p[0])} ${n1(p[1])}`).join('L') + 'Z';
}
function palm(x, y, h, lean, s, col) {
  const tx = x + lean, ty = y - h;
  let d = `M${x - 13 * s} ${y}Q${n1(x + lean * 0.1)} ${n1(y - h * 0.55)} ${n1(tx - 5 * s)} ${n1(ty)}L${n1(tx + 5 * s)} ${n1(ty + 3)}Q${n1(x + lean * 0.1 + 18 * s)} ${n1(y - h * 0.5)} ${x + 13 * s} ${y}Z`;
  for (const [deg, l, dr] of [[-178, 1, 0.75], [-158, 0.95, 0.55], [-132, 0.8, 0.3], [-104, 0.6, 0.12], [-76, 0.62, 0.14], [-48, 0.82, 0.32], [-22, 0.95, 0.55], [-2, 1, 0.78], [158, 0.78, 0.7], [24, 0.8, 0.7]]) {
    const L = 190 * s * l;
    d += frond(tx, ty, deg * Math.PI / 180, L, L * dr, 15 * s);
  }
  return `<path d="${d}" fill="${col}"/>`;
}

// Blocks of buildings and their windows (lit at night, reflecting the sky by day), one path per colour
function skyline(r, base, h0, h1, wMin, wMax, col, lit, cool, wc = ['#ffdf9e', '#bcdcff', '#fff1c8']) {
  let blocks = '', warm = '', cold = '', tw = '';
  for (let x = -40; x < 1660;) {
    const w = wMin + r() * (wMax - wMin), h = h0 + r() * (h1 - h0), top = base - h;
    blocks += `M${n1(x)} ${base + 10}V${n1(top)}h${n1(w)}V${base + 10}Z`;
    if (r() < 0.3) blocks += `M${n1(x + w * 0.45)} ${n1(top)}v-${n1(18 + r() * 30)}h3v${n1(18 + r() * 30)}Z`;
    for (let yy = top + 12; yy < base - 10; yy += 17) {
      for (let xx = x + 8; xx < x + w - 12; xx += 13) {
        const q = r();
        if (q < lit && !(LITE && q > lit * 0.6)) {
          const rect = `M${n1(xx)} ${n1(yy)}h6v9h-6Z`;
          if (q < lit * 0.04) tw += rect;
          else if (r() < cool) cold += rect;
          else warm += rect;
        }
      }
    }
    x += w + 4 + r() * 14;
  }
  return `<path d="${blocks}" fill="${col}"/><path d="${warm}" fill="${wc[0]}" opacity=".85"/><path d="${cold}" fill="${wc[1]}" opacity=".75"/><path class="cn-tw" d="${tw}" fill="${wc[2]}"/>`;
}

// ---------- one recipe per mood: c = [dark, mid, light], r = random, day = the light scheme ----------
// Night (dark scheme) is dusk or night; day (light scheme) is daylight or golden hour, softer silhouettes.
const ART = {
  // Dusk over open sea, as in the approved mockup; by day a bright morning sea
  waves(c, r, day) {
    const P = day ? {
      sky: [[0, '#4d8fd8'], [0.45, '#8ec3ec'], [0.8, '#d4ebf6'], [1, '#fdf1d8']], sea: [[0, '#8cc4d8'], [0.3, '#3d8db4'], [1, '#1d5c80']],
      sun: [[0, '#ffffff'], [1, '#fff0c2']], glow: '#fff3d0', glint: '#ffffff', boat: '#2d4a66', gull: '#3c5570',
      w: ['#3a87ad', '#2f789f', '#25698e'], foam: '#ffffff', foamA: [0.4, 0.3],
    } : {
      sky: [[0, '#0d1330'], [0.4, '#2c2d5e'], [0.64, '#8b4f78'], [0.84, '#e97f5c'], [1, '#f7bf86']], sea: [[0, '#4a3f6e'], [0.3, '#232a5a'], [1, '#0a1130']],
      sun: [[0, '#fff4dc'], [1, '#ffc283']], glow: '#ffb07a', glint: '#ffd9a6', boat: '#0d1330', gull: '#1d1a3a',
      w: ['#1c2453', '#141c45', '#0b1232'], foam: '#f2a27a', foamA: [0.18, 0.12],
    };
    const glint = Array.from({ length: 12 }, (_, i) => { const y = 650 + i * 14, w = 150 - i * 10; return `<rect x="${800 - w / 2 + (i % 2) * 12}" y="${y}" width="${w}" height="2.5" rx="1" fill="${P.glint}" opacity="${n1(0.55 - i * 0.04)}"/>`; }).join('');
    return {
      defs: lin('k-sky', P.sky) + lin('k-sea', P.sea) + rad('k-sun', P.sun) + rad('k-glow', [[0, P.glow, 0.6], [1, P.glow, 0]]),
      body: `<rect width="1600" height="640" fill="url(#k-sky)"/>${day ? '' : stars(r, 60, 260)}
        <g class="cn-sun"><circle cx="800" cy="600" r="300" fill="url(#k-glow)"/><circle cx="800" cy="604" r="74" fill="url(#k-sun)"/></g>
        <rect y="640" width="1600" height="370" fill="url(#k-sea)"/>${glint}
        <g fill="${P.boat}"><path d="M598 652h104l-13 15h-78z"/><path d="M651 560v90M654 566v84h48zM648 584v66h-38z" stroke="${P.boat}" stroke-width="2"/></g>
        ${day ? '<path d="M656 568v80h42zM648 588v60h-34z" fill="#f4f7fb"/>' : ''}
        ${gull(960, 380, 1, P.gull)}${gull(1010, 336, 0.8, P.gull)}${gull(1052, 404, 0.6, P.gull)}${gull(560, 300, 0.7, P.gull)}
        <g class="cn-drift"><path d="${wave(712, 5, 240, 0)}" fill="${P.w[0]}" opacity=".95"/></g>
        <g class="cn-drift b"><path d="${wave(790, 9, 360, 1.3)}" fill="${P.w[1]}"/><path d="${wave(790, 9, 360, 1.3)}" fill="none" stroke="${P.foam}" stroke-opacity="${P.foamA[0]}" stroke-width="2"/></g>
        <g class="cn-drift"><path d="${wave(890, 14, 520, 2.1)}" fill="${P.w[2]}"/><path d="${wave(890, 14, 520, 2.1)}" fill="none" stroke="${P.foam}" stroke-opacity="${P.foamA[1]}" stroke-width="2"/></g>`,
    };
  },

  // A cabin with one lit window by a lake, under low rain clouds (by day: an overcast grey morning)
  rain([c0, c1, c2], r, day) {
    const far = hills(612, 80, r), mid = hills(676, 46, r);
    const dark = mix(c0, '#000', 0.35);
    const P = day ? {
      sky: [[0, mix(c2, '#a3b6bd', 0.5)], [0.45, mix(c2, '#d3dee1', 0.6)], [0.69, '#eef3f3']], puff: [['#ffffff', 0.85], ['#f2f6f7', 0.4], '#ffffff'],
      far: mix(c2, '#dfe8ea', 0.5), farA: 0.9, mid: mix(c1, c2, 0.55), lake: [[0, '#e5edef'], [0.3, mix(c2, '#c9d8dc', 0.5)], [1, mix(c1, c2, 0.4)]],
      house: mix(c0, c1, 0.5), win: 0.35, smoke: '#ffffff', near: mix(c1, c2, 0.28), ground: mix(c1, c0, 0.15),
    } : {
      sky: [[0, mix(c0, '#000', 0.3)], [0.45, c1], [0.69, mix(c2, '#b9cdd1', 0.4)]], puff: [[mix(c1, c2, 0.5), 0.75], [mix(c1, c2, 0.4), 0.35], c1],
      far: mix(c1, c2, 0.5), farA: 0.75, mid: mix(c0, c1, 0.4), lake: [[0, mix(c2, '#a9c2c6', 0.25)], [0.3, mix(c1, c2, 0.3)], [1, dark]],
      house: dark, win: 0.7, smoke: mix(c2, '#fff', 0.3), near: mix(dark, '#000', 0.35), ground: mix(dark, '#000', 0.4),
    };
    const refl = Array.from({ length: 9 }, (_, i) => `<rect x="${771 - i * 1.5 + (i % 2) * 4}" y="${700 + i * 11}" width="${30 + i * 3}" height="3" rx="1.5" fill="#ffc979" opacity="${n1((0.5 - i * 0.05) * (day ? 0.6 : 1))}"/>`).join('');
    return {
      defs: lin('k-sky', P.sky) + lin('k-lake', P.lake)
        + rad('k-puff', [[0, P.puff[0][0], P.puff[0][1]], [0.6, P.puff[1][0], P.puff[1][1]], [1, P.puff[2], 0]])
        + rad('k-win', glowStops('#ffc979', P.win)),
      body: `<rect width="1600" height="700" fill="url(#k-sky)"/>
        <g class="cn-cloud">${puffs(r, 14, -100, 1700, 40, 330, 260, 70, 'k-puff')}</g>
        ${area(far, P.far, ` opacity="${P.farA}"`)}
        <g class="cn-cloud b">${puffs(r, 8, -100, 1700, 470, 600, 240, 34, 'k-puff')}</g>
        <path d="${treeline(mid, 64, 36, 92, r)}" fill="${P.mid}"/>${area(mid, P.mid)}
        <rect y="692" width="1600" height="320" fill="url(#k-lake)"/>
        <circle cx="786" cy="664" r="150" fill="url(#k-win)" class="cn-glow"/>
        <path d="M728 640L800 596L872 640Z M740 636h120v58H740Z M836 606h14v26h-14Z" fill="${P.house}"/>
        <rect x="770" y="652" width="30" height="22" rx="1" fill="#ffd38a"/><path d="M785 652v22M770 663h30" stroke="${P.house}" stroke-width="2.5"/>
        <rect x="820" y="660" width="20" height="34" fill="${mix(P.house, '#000', 0.4)}"/>
        <g class="cn-smoke" fill="${P.smoke}"><circle cx="846" cy="590" r="9" opacity=".22"/><circle cx="856" cy="566" r="13" opacity=".15"/><circle cx="872" cy="538" r="18" opacity=".08"/></g>
        <path d="M720 694h170v3H720Z" fill="${P.house}"/>${refl}
        <path d="${pine(240, 1030, 560) + pine(380, 1040, 420) + pine(1320, 1040, 520) + pine(1460, 1030, 600)}" fill="${P.near}"/>
        ${area(x => 940 + 30 * Math.sin(x / 260), P.ground)}`,
    };
  },

  // Lightning over a rough sea, a lighthouse on the cliff (by day: a grey squall)
  storm([c0, c1, c2], r, day) {
    const top = x => 574 + 20 * Math.sin(x / 130 + 1) + 5 * Math.sin(x / 23);
    const lx = 650, ly = n1(top(lx) + 4);
    const P = day ? {
      sky: [[0, mix(c1, '#7d879c', 0.5)], [0.4, mix(c2, '#aab3c4', 0.55)], [0.62, '#e2e6ee']], sea: [[0, mix(c2, '#c8d0dc', 0.5)], [0.25, mix(c2, '#8f9bb0', 0.4)], [1, mix(c1, c2, 0.3)]],
      puff: [mix(c1, '#6b7488', 0.5), 0.9, mix(c1, '#7a8396', 0.5), 0.55, c1], puff2: ['#f0f2f6', 0.8, '#e3e7ee', 0.4, '#ffffff'],
      dark: mix(c1, c0, 0.25), wave: mix(c1, c2, 0.45), tower: '#f4f1ea', band: '#b54a3c', lamp: 0.5, bolt: ['#fffbe8', '#5d72b8'],
    } : {
      sky: [[0, mix(c0, '#000', 0.25)], [0.4, c1], [0.62, mix(c2, '#9aa6c8', 0.3)]], sea: [[0, mix(c1, c2, 0.35)], [0.25, c1], [1, mix(c0, '#000', 0.45)]],
      puff: [mix(c0, c1, 0.4), 0.95, mix(c0, c1, 0.5), 0.6, c0], puff2: [mix(c1, c2, 0.25), 0.7, mix(c1, c2, 0.2), 0.3, c1],
      dark: mix(c0, '#000', 0.45), wave: mix(c1, mix(c0, '#000', 0.45), 0.5), tower: mix(c2, '#e8ecf5', 0.5), band: mix(c0, '#000', 0.45), lamp: 0.85, bolt: ['#ffffff', '#cfe0ff'],
    };
    const caps = Array.from({ length: LITE ? 10 : 26 }, () => { const x = r() * 1700, y = 660 + r() * 300, w = 20 + r() * 50 * (y / 700); return `<path d="M${n1(x)} ${n1(y)}q${n1(w / 2)} -6 ${n1(w)} 0" stroke="#dfe6ff" stroke-opacity="${n1((0.12 + r() * 0.2) * (day ? 1.8 : 1))}" stroke-width="2" fill="none"/>`; }).join('');
    const bolt = 'M1012 230l-38 128 34 -6 -52 150 30 -4 -40 128';
    return {
      defs: lin('k-sky', P.sky) + lin('k-sea', P.sea)
        + rad('k-puff', [[0, P.puff[0], P.puff[1]], [0.6, P.puff[2], P.puff[3]], [1, P.puff[4], 0]])
        + rad('k-puff2', [[0, P.puff2[0], P.puff2[1]], [0.6, P.puff2[2], P.puff2[3]], [1, P.puff2[4], 0]])
        + rad('k-lamp', glowStops('#ffe9b0', P.lamp))
        + lin('k-beam', [[0, '#fff3cf', day ? 0.3 : 0.45], [1, '#fff3cf', 0]], 1, 0),
      body: `<rect width="1600" height="660" fill="url(#k-sky)"/>
        <g class="cn-cloud b">${puffs(r, 10, -100, 1700, 280, 520, 280, 60, 'k-puff2')}</g>
        <g class="cn-flash"><path d="${bolt}" fill="none" stroke="${P.bolt[1]}" stroke-width="16" stroke-opacity=".3" stroke-linejoin="round"/><path d="${bolt}" fill="none" stroke="${P.bolt[0]}" stroke-width="4" stroke-linejoin="round"/></g>
        <g class="cn-cloud">${puffs(r, 16, -150, 1750, -40, 300, 300, 110, 'k-puff')}</g>
        <rect y="640" width="1600" height="370" fill="url(#k-sea)"/>
        <g class="cn-drift">${caps}<path d="${wave(780, 12, 300, 0.4)}" fill="${P.wave}" opacity=".6"/></g>
        <path class="cn-beam" d="M${lx + 12} ${ly - 82}L1180 ${ly - 160}L1180 ${ly - 10}Z" fill="url(#k-beam)"/>
        <path d="M-60 1010${line(top, -60, 700)}L716 600L738 690L760 1010Z" fill="${P.dark}"/>
        <path d="M${lx - 16} ${ly}l7 -84h18l7 84Z" fill="${P.tower}"/><path d="M${lx - 13} ${ly - 30}h26v10h-26ZM${lx - 10} ${ly - 62}h20v9h-20Z" fill="${P.band}"/>
        <path d="M${lx - 12} ${ly - 84}h24v-20h-24Z" fill="#ffe7a6"/><path d="M${lx - 16} ${ly - 104}h32l-16 -16Z M${lx - 14} ${ly - 84}h28v4h-28Z" fill="${P.dark}"/>
        <circle cx="${lx}" cy="${ly - 94}" r="64" fill="url(#k-lamp)"/>
        <g class="cn-drift b"><path d="${wave(880, 18, 420, 1.7)}" fill="${P.dark}"/></g>`,
    };
  },

  // A tent and a campfire in a clearing, pines lit by the flames (by day: golden late afternoon)
  embers([c0, c1, c2], r, day) {
    const ridge = hills(650, 70, r), near = hills(762, 22, r);
    const fx = 820, fy = 752;
    const P = day ? {
      sky: [[0, '#86b3da'], [0.45, '#f1d3a6'], [0.66, '#f6b06e']], glow: [[0, '#ffc070', 0.5], [0.3, c2, 0.2], [1, c2, 0]],
      lit: [[0, mix(c2, '#c98a4a', 0.4)], [0.45, mix(c1, '#7a5a3a', 0.45)], [1, mix(c1, '#5d5040', 0.55)]],
      ground: [[0, mix(c2, '#e9b77d', 0.5)], [0.5, mix(c1, '#8a6040', 0.45)], [1, mix(c1, '#4a3020', 0.5)]],
      tent: [[0, mix(c1, '#5a3a28', 0.3)], [1, mix(c2, '#ffb070', 0.45)]], door: mix(c1, '#2a1a10', 0.5), stone: mix(c1, '#3a2a20', 0.4), moon: '#fff4d2', pole: mix(c1, '#2a1a10', 0.4),
    } : {
      sky: [[0, '#07081a'], [0.45, mix(c0, '#140b1c', 0.4)], [0.66, mix(c0, c1, 0.6)]], glow: [[0, '#ffb35c', 0.75], [0.3, c2, 0.32], [1, c2, 0]],
      lit: [[0, mix(c1, c2, 0.35)], [0.45, mix(c0, c1, 0.4)], [1, mix(c0, '#05030a', 0.5)]],
      ground: [[0, mix(c1, c2, 0.25)], [0.5, mix(c0, '#000', 0.3)], [1, '#060304']],
      tent: [[0, mix(c0, '#000', 0.35)], [1, mix(c2, c1, 0.35)]], door: mix(c0, '#000', 0.5), stone: mix(c0, '#000', 0.25), moon: '#fbe9c8', pole: mix(c0, '#05030a', 0.5),
    };
    return {
      defs: lin('k-sky', P.sky) + rad('k-glow', P.glow)
        + rad('k-lit', P.lit, `cx="${fx}" cy="${fy}" r="760"`) + rad('k-ground', P.ground, `cx="${fx}" cy="${fy}" r="700"`)
        + lin('k-tent', P.tent, 1, 0) + rad('k-sunglow', glowStops('#fff1c4', 0.6))
        + `<mask id="k-moon"><circle cx="1090" cy="170" r="38" fill="#fff"/><circle cx="1106" cy="160" r="34" fill="#000"/></mask>`,
      body: `<rect width="1600" height="760" fill="url(#k-sky)"/>${day ? '' : stars(r, 90, 520)}
        ${day ? '<circle cx="1080" cy="560" r="260" fill="url(#k-sunglow)"/><circle cx="1080" cy="560" r="54" fill="#fff3d6"/>' : `<circle cx="1090" cy="170" r="38" fill="${P.moon}" mask="url(#k-moon)"/>`}
        <path d="${treeline(ridge, 54, 90, 200, r)}" fill="url(#k-lit)"/>${area(ridge, 'url(#k-lit)')}
        <circle class="cn-glow" cx="${fx}" cy="${fy}" r="520" fill="url(#k-glow)"/>
        ${area(near, 'url(#k-ground)')}
        <path d="M560 772L660 610L760 772Z" fill="url(#k-tent)"/><path d="M660 610L634 772H688Z" fill="${P.door}"/><path d="M660 610v-14" stroke="${P.pole}" stroke-width="4"/>
        <g fill="${P.stone}"><ellipse cx="${fx - 58}" cy="${fy + 14}" rx="17" ry="9"/><ellipse cx="${fx + 60}" cy="${fy + 16}" rx="19" ry="9"/><ellipse cx="${fx - 28}" cy="${fy + 26}" rx="16" ry="8"/><ellipse cx="${fx + 32}" cy="${fy + 28}" rx="17" ry="8"/></g>
        <g class="cn-flame"><path d="M${fx} ${fy + 14}C${fx - 74} ${fy}  ${fx - 50} ${fy - 84} ${fx - 14} ${fy - 140}C${fx - 12} ${fy - 98} ${fx + 8} ${fy - 92} ${fx + 10} ${fy - 120}C${fx + 50} ${fy - 76} ${fx + 76} ${fy + 2} ${fx} ${fy + 14}Z" fill="${mix(c2, '#ff5a1f', 0.25)}"/>
          <path d="M${fx} ${fy + 12}C${fx - 40} ${fy + 2} ${fx - 30} ${fy - 50} ${fx - 8} ${fy - 86}C${fx - 4} ${fy - 58} ${fx + 10} ${fy - 58} ${fx + 12} ${fy - 74}C${fx + 36} ${fy - 44} ${fx + 44} ${fy + 4} ${fx} ${fy + 12}Z" fill="#ffb347"/>
          <path d="M${fx} ${fy + 10}C${fx - 18} ${fy + 2} ${fx - 14} ${fy - 24} ${fx - 2} ${fy - 44}C${fx + 2} ${fy - 28} ${fx + 12} ${fy - 28} ${fx + 13} ${fy - 36}C${fx + 22} ${fy - 20} ${fx + 22} ${fy + 4} ${fx} ${fy + 10}Z" fill="#fff1bd"/></g>
        <g fill="#2a1408"><rect x="${fx - 52}" y="${fy + 4}" width="104" height="14" rx="7" transform="rotate(-12 ${fx} ${fy + 11})"/><rect x="${fx - 52}" y="${fy + 4}" width="104" height="14" rx="7" transform="rotate(14 ${fx} ${fy + 11})"/></g>`,
    };
  },

  // Golden hour on the beach: low sun, palms, foam on wet sand (by day: midday turquoise)
  beach([c0, c1, c2], r, day) {
    const sand = x => 790 + 16 * Math.sin(x / 300 + 1) + 6 * Math.sin(x / 90);
    const P = day ? {
      sky: [[0, '#4f9fe0'], [0.36, '#8fcaf0'], [0.52, '#cfe9f6'], [0.6, '#f3f6f2']], sea: [[0, '#4cc0d6'], [0.5, '#2aa0bf'], [1, '#79d2dc']],
      sand: [[0, '#f8ecd0'], [0.3, '#efdcb4'], [1, '#d9bf8f']], sun: [[0, '#ffffff'], [1, '#fff6d8']], glow: '#ffffff', sy: 250, glint: '#ffffff',
      head: '#7f93b0', ink: mix(c0, '#2f5a42', 0.55), gull: '#3a4a5c',
    } : {
      sky: [[0, '#1b2446'], [0.36, '#57496f'], [0.52, '#c47c6b'], [0.6, '#f0c48e']], sea: [[0, '#5e6a8a'], [0.5, '#3e4a6a'], [1, '#6f6f80']],
      sand: [[0, mix(c2, '#f2d7a8', 0.4)], [0.3, c1], [1, mix(c0, '#000', 0.3)]], sun: [[0, '#fff6dd'], [1, '#ffd08a']], glow: '#ffc48a', sy: 548, glint: '#ffe2ad',
      head: '#3b3150', ink: mix(c0, '#1a1020', 0.4), gull: '#3a2c40',
    };
    const glint = Array.from({ length: 9 }, (_, i) => { const y = 612 + i * 15, w = 130 - i * 8; return `<rect x="${n1(860 - w / 2 + (i % 2) * 10)}" y="${y}" width="${w}" height="3" rx="1.5" fill="${P.glint}" opacity="${n1(0.6 - i * 0.05)}"/>`; }).join('');
    return {
      defs: lin('k-sky', P.sky) + lin('k-sea', P.sea) + lin('k-sand', P.sand) + rad('k-sun', P.sun) + rad('k-glow', glowStops(P.glow, 0.65)),
      body: `<rect width="1600" height="610" fill="url(#k-sky)"/>
        <g class="cn-sun"><circle cx="860" cy="${P.sy - 3}" r="330" fill="url(#k-glow)"/><circle cx="860" cy="${P.sy}" r="${day ? 64 : 82}" fill="url(#k-sun)"/></g>
        <path d="M1120 604c60 -40 120 -44 170 -26c40 -24 110 -30 170 -6c60 -10 110 0 160 18v20H1120Z" fill="${P.head}" opacity=".8"/>
        <rect y="600" width="1600" height="200" fill="url(#k-sea)"/>${glint}
        <g class="cn-drift">${[700, 736, 772].map((y, i) => `<path d="${wave(y, 3 + i, 200 + i * 60, i, false)}" fill="none" stroke="#fff4e0" stroke-opacity="${(0.16 + i * 0.08) * (day ? 2 : 1)}" stroke-width="2"/>`).join('')}</g>
        ${area(sand, 'url(#k-sand)')}
        <path class="cn-drift b" d="${wave(796, 4, 260, 0.8, false)}" fill="none" stroke="#fffaf0" stroke-opacity="${day ? 0.9 : 0.45}" stroke-width="3"/>
        ${palm(1150, 1000, 520, -150, 1.25, P.ink)}${palm(560, 960, 330, 70, 0.95, P.ink)}
        ${gull(700, 360, 0.8, P.gull)}${gull(744, 330, 0.6, P.gull)}`,
    };
  },

  // A night train with lit windows crossing the plain at dusk (by day: a train under a wide blue sky)
  motion([c0, c1, c2], r, day) {
    const far = peaks(600, 120, r, 6), mid = hills(640, 50, r), plain = hills(690, 14, r);
    const P = day ? {
      sky: [[0, '#7cb0de'], [0.38, '#a9cdea'], [0.54, '#d9e7f0'], [0.64, '#f3ead8']], sun: [[0, '#ffffff'], [1, '#fff4d6']], glow: '#fff3d8',
      far: mix(c2, '#9fb0c8', 0.55), farA: 0.75, mid: mix(c2, '#8fa48a', 0.45), plain: [[0, mix(c2, '#a8b59a', 0.5)], [1, mix(c1, '#6f7a64', 0.5)]],
      train: mix(c1, '#3a4250', 0.5), wins: '#dce9f5', lamp: 0, rail: mix(c1, c0, 0.5), front: mix(c1, '#5a6450', 0.45),
    } : {
      sky: [[0, mix(c0, '#0d1424', 0.5)], [0.38, mix(c1, '#3a4362', 0.55)], [0.54, '#b8775c'], [0.64, '#eaa96e']], sun: [[0, '#fff1d2'], [1, '#ffc483']], glow: '#ffb57d',
      far: mix(c2, '#8a6f7e', 0.45), farA: 0.55, mid: mix(c1, '#2c2a3a', 0.5), plain: [[0, mix(c1, '#000', 0.5)], [1, '#050506']],
      train: mix(c0, '#000', 0.4), wins: '#ffd78f', lamp: 0.8, rail: '#050506', front: '#050506',
    };
    let cars = '', wins = '';
    for (let x = 330; x < 1700; x += 236) {
      cars += `M${x} 734V672q0 -14 14 -14h204q14 0 14 14v62Z`;
      for (let wx = x + 20; wx < x + 214; wx += 30) wins += `M${wx} 676h20v22h-20Z`;
    }
    const poles = Array.from({ length: 9 }, (_, i) => `<path d="M${i * 260 - 40} 770V560M${i * 260 - 62} 576h44" stroke="${P.train}" stroke-width="5"/><path d="M${i * 260 - 40} 580Q${i * 260 + 90} 612 ${i * 260 + 220} 580" stroke="${P.train}" stroke-width="1.6" fill="none"/>`).join('');
    return {
      defs: lin('k-sky', P.sky) + rad('k-sun', P.sun) + rad('k-glow', glowStops(P.glow, 0.6)) + lin('k-plain', P.plain) + rad('k-lamp', glowStops('#ffd998', 0.55)),
      body: `<rect width="1600" height="700" fill="url(#k-sky)"/>${day ? '' : stars(r, 30, 220)}
        <g class="cn-sun"><circle cx="1000" cy="${day ? 330 : 580}" r="320" fill="url(#k-glow)"/><circle cx="1000" cy="${day ? 330 : 580}" r="60" fill="url(#k-sun)"/></g>
        ${area(far, P.far, ` opacity="${P.farA}"`)}
        ${area(mid, P.mid)}
        ${area(plain, 'url(#k-plain)')}
        <rect x="-20" y="724" width="1640" height="10" fill="${mix(P.train, '#000', 0.3)}"/>
        <ellipse cx="960" cy="700" rx="780" ry="70" fill="url(#k-lamp)" opacity="${P.lamp}"/>
        <path d="${cars}" fill="${P.train}"/><path d="${wins}" fill="${P.wins}"/>
        <path d="M330 734V686q0 -28 40 -28h6V734Z" fill="${P.train}"/><circle cx="338" cy="712" r="5" fill="#fff2cc"/>
        <path d="M-40 734h1700v10H-40Z" fill="${P.rail}"/>
        <g class="cn-poles">${poles}</g>
        ${area(x => 900 + 20 * Math.sin(x / 200), P.front, ' opacity=".9"')}`,
    };
  },

  // Layered pine ridges in the mist under a full moon (by day: a misty morning)
  fireflies([c0, c1, c2], r, day) {
    const l1 = hills(570, 70, r), l2 = hills(650, 70, r), l3 = hills(752, 60, r);
    const P = day ? {
      sky: [[0, mix(c2, '#a8cfe0', 0.45)], [0.42, mix(c2, '#d8ecdf', 0.6)], [0.62, '#f3f8ef']], moon: [[0, '#ffffff'], [1, '#fffbe6']], glow: '#fffbe6',
      l1: mix(c2, '#e3efe6', 0.55), l2: mix(c2, c1, 0.35), l3: mix(c1, c2, 0.15), near: mix(c1, c0, 0.35), ground: mix(c1, c0, 0.45), mist: 0.32,
    } : {
      sky: [[0, mix(c0, '#000', 0.4)], [0.42, c1], [0.62, mix(c2, '#cfe6c8', 0.4)]], moon: [[0, '#fbfaea'], [1, '#e8ecd0']], glow: '#e9f5d8',
      l1: mix(c1, c2, 0.5), l2: mix(c1, c0, 0.35), l3: mix(c0, '#000', 0.15), near: mix(c0, '#000', 0.5), ground: mix(c0, '#000', 0.55), mist: 0.16,
    };
    const mist = (y, h, cls) => `<rect class="${cls}" x="-200" y="${y}" width="2000" height="${h}" fill="url(#k-mist)"/>`;
    return {
      defs: lin('k-sky', P.sky) + rad('k-moon', P.moon) + rad('k-glow', glowStops(P.glow, 0.45))
        + lin('k-mist', [[0, '#e6f4e6', 0], [0.5, '#f2faf2', P.mist], [1, '#e6f4e6', 0]]),
      body: `<rect width="1600" height="760" fill="url(#k-sky)"/>${day ? '' : stars(r, 40, 300)}
        <circle cx="930" cy="300" r="240" fill="url(#k-glow)"/><circle cx="930" cy="300" r="44" fill="url(#k-moon)"/>
        <path d="${treeline(l1, 90, 40, 80, r)}" fill="${P.l1}" opacity=".85"/>${area(l1, P.l1, ' opacity=".85"')}
        ${mist(500, 120, 'cn-drift')}
        <path d="${treeline(l2, 60, 70, 140, r)}" fill="${P.l2}"/>${area(l2, P.l2)}
        ${mist(600, 130, 'cn-drift b')}
        <path d="${treeline(l3, 36, 130, 230, r)}" fill="${P.l3}"/>${area(l3, P.l3)}
        <path d="${pine(180, 1060, 640) + pine(330, 1060, 460) + pine(1290, 1060, 500) + pine(1450, 1060, 700)}" fill="${P.near}"/>
        ${area(x => 930 + 24 * Math.sin(x / 170), P.ground)}`,
    };
  },

  // A garden at dawn: a pagoda on the far hill, a pond, a stone lantern and wind chimes on a branch
  pollen([c0, c1, c2], r, day) {
    const h1 = hills(612, 50, r), h2 = hills(680, 56, r), h3 = hills(772, 40, r);
    const P = day ? {
      sky: [[0, '#9cc6e4'], [0.36, '#d7e5cf'], [0.62, '#f7f0cf']], glow: '#ffffff', h1: mix(c2, '#eef0cf', 0.5), h2: mix(c2, c1, 0.3), h3: mix(c1, c2, 0.35),
      pond: [[0, '#f4f7ea'], [0.5, mix(c2, '#dfe8c8', 0.5)], [1, mix(c2, c1, 0.5)]], ink: mix(c1, c0, 0.45), leaf: mix(c2, c1, 0.45), metal: '#b9a76a', pagoda: mix(c2, '#b9c3a0', 0.5),
      ground: mix(c1, c2, 0.2), pads: mix(c1, c2, 0.3),
    } : {
      sky: [[0, mix(c0, '#18283a', 0.45)], [0.36, mix(c1, '#8d8a5c', 0.35)], [0.62, '#e7d79e']], glow: '#fff3c4', h1: mix(c2, '#e3d49a', 0.4), h2: mix(c1, c2, 0.45), h3: c1,
      pond: [[0, '#e9dca8'], [0.5, mix(c2, '#cfc68e', 0.5)], [1, mix(c1, c0, 0.4)]], ink: mix(c0, '#000', 0.3), leaf: mix(c0, c1, 0.35), metal: mix(c2, '#fff8de', 0.55), pagoda: mix(c1, c2, 0.25),
      ground: mix(c0, '#000', 0.25), pads: mix(c0, c1, 0.45),
    };
    const { ink, metal } = P;
    const chime = (x, y, n) => `<g class="cn-sway" style="transform-origin:${x}px ${y}px"><path d="M${x} ${y}v46" stroke="${ink}" stroke-width="1.2"/><circle cx="${x}" cy="${y + 50}" r="11" fill="${ink}"/>${Array.from({ length: n }, (_, i) => { const xx = x - 16 + i * 32 / (n - 1), l = 44 + ((i * 17) % 34); return `<path d="M${xx} ${y + 54}v12" stroke="${ink}" stroke-width=".8"/><rect x="${n1(xx - 2.5)}" y="${y + 66}" width="5" height="${l}" rx="2.5" fill="${metal}"/>`; }).join('')}<path d="M${x} ${y + 60}v70" stroke="${ink}" stroke-width=".8"/><rect x="${x - 7}" y="${y + 130}" width="14" height="22" rx="2" fill="${metal}" opacity=".8"/></g>`;
    const leaves = Array.from({ length: LITE ? 40 : 110 }, () => { const t = r(), x = 1660 - t * 820, y = 70 + t * 80 + (r() - 0.5) * 110; return `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(9 + r() * 10)}" ry="${n1(4 + r() * 4)}" transform="rotate(${n1(-60 + r() * 120)} ${n1(x)} ${n1(y)})"/>`; }).join('');
    const blossoms = Array.from({ length: LITE ? 12 : 34 }, () => { const t = r(); return `<circle cx="${n1(1660 - t * 800)}" cy="${n1(70 + t * 80 + (r() - 0.5) * 100)}" r="${n1(3 + r() * 3)}"/>`; }).join('');
    const pagoda = (x, y) => `<path fill="${P.pagoda}" opacity=".9" d="M${x - 6} ${y}v-20h12v20Z M${x - 30} ${y - 18}q30 -8 60 0l-10 -10h-40Z M${x - 5} ${y - 28}v-14h10v14Z M${x - 24} ${y - 40}q24 -7 48 0l-9 -9h-30Z M${x - 4} ${y - 49}v-12h8v12Z M${x - 18} ${y - 59}q18 -6 36 0l-8 -8h-20Z M${x - 1} ${y - 67}v-16h2v16Z"/>`;
    return {
      defs: lin('k-sky', P.sky) + rad('k-glow', glowStops(P.glow, 0.7)) + lin('k-pond', P.pond),
      body: `<rect width="1600" height="720" fill="url(#k-sky)"/>
        <circle cx="760" cy="560" r="360" fill="url(#k-glow)"/>
        ${area(h1, P.h1, ' opacity=".85"')}${pagoda(640, n1(h1(640) + 6))}
        ${area(h2, P.h2)}${area(h3, P.h3)}
        <ellipse cx="780" cy="846" rx="460" ry="60" fill="url(#k-pond)"/>
        <g fill="${P.pads}"><ellipse cx="560" cy="852" rx="38" ry="10"/><ellipse cx="930" cy="836" rx="30" ry="8"/><ellipse cx="704" cy="872" rx="44" ry="11"/></g>
        <circle cx="712" cy="866" r="6" fill="#f6d4dc"/>
        <g fill="${ink}"><path d="M1048 776h44l-6 -10h-32Z M1058 766v-30h24v30Z M1040 736h60l-30 -22Z M1066 714h8v-10h-8Z"/></g><rect x="1062" y="742" width="16" height="16" fill="#ffd98f" opacity=".9"/>
        ${area(x => 912 + 22 * Math.sin(x / 210 + 2), P.ground)}
        <path d="M1680 40C1480 70 1300 110 1080 140C980 154 900 170 840 196" stroke="${ink}" stroke-width="16" fill="none" stroke-linecap="round"/>
        <path d="M1300 104c-40 30 -90 40 -140 36M1140 132c-30 -30 -70 -40 -110 -30M1460 70c-30 40 -80 60 -130 64" stroke="${ink}" stroke-width="6" fill="none" stroke-linecap="round"/>
        <g fill="${P.leaf}">${leaves}</g><g fill="#f3c9d3" opacity=".85">${blossoms}</g>
        ${chime(1002, 150, 5)}${chime(1210, 120, 4)}`,
    };
  },

  // Night street seen from a café window: bokeh lights, pendant lamps, a cup on the bar (by day: a bright street)
  bokeh([c0, c1, c2], r, day) {
    const P = day ? {
      out: [[0, mix(c2, '#f6efe4', 0.6)], [0.6, mix(c2, '#eadcc8', 0.5)], [1, mix(c2, '#d9c4a8', 0.5)]], b: ['#ffffff', '#ffe7c4', '#cfe7ec'], ba: 0.7,
      wall: mix(c1, c2, 0.3), bulb: '#fff6e0', cone: 0.1, bar: [[0, mix(c2, '#fff', 0.3)], [0.06, mix(c1, c2, 0.5)], [1, mix(c1, c0, 0.3)]],
      cup: '#ffffff', steam: mix(c1, '#fff', 0.3),
    } : {
      out: [[0, mix(c0, '#000', 0.25)], [0.6, mix(c1, c0, 0.3)], [1, mix(c1, c0, 0.6)]], b: ['#ffc98a', mix(c2, '#ffd7a8', 0.4), '#9fd0d8'], ba: 0.95,
      wall: mix(c0, '#000', 0.4), bulb: '#ffe2a8', cone: 0.22, bar: [[0, mix(c2, '#000', 0.35)], [0.06, mix(c1, '#000', 0.45)], [1, mix(c0, '#000', 0.6)]],
      cup: mix(c2, '#fff', 0.55), steam: '#fff',
    };
    const { wall, cup } = P;
    const lights = Array.from({ length: LITE ? 16 : 40 }, () => { const g = ['k-b1', 'k-b1', 'k-b2', 'k-b3'][r() * 4 | 0]; return `<circle cx="${n1(140 + r() * 1320)}" cy="${n1(230 + r() * 500)}" r="${n1(16 + r() * 58)}" fill="url(#${g})" opacity="${n1(0.45 + r() * 0.5)}"/>`; }).join('');
    const lamp = (x, len) => `<path d="M${x} 0V${len}" stroke="${wall}" stroke-width="3"/><path d="M${x - 40} ${len + 40}L${x - 14} ${len}h28l26 40Z" fill="${wall}"/><ellipse cx="${x}" cy="${len + 40}" rx="38" ry="6" fill="${P.bulb}"/><path d="M${x - 38} ${len + 42}L${x - 120} 780H${x + 120}L${x + 38} ${len + 42}Z" fill="url(#k-cone)"/><circle cx="${x}" cy="${len + 44}" r="70" fill="url(#k-b1)" opacity=".6"/>`;
    return {
      defs: lin('k-out', P.out)
        + rad('k-b1', glowStops(P.b[0], P.ba)) + rad('k-b2', glowStops(P.b[1], P.ba * 0.95)) + rad('k-b3', glowStops(P.b[2], 0.7))
        + lin('k-cone', [[0, '#ffdca0', P.cone], [1, '#ffdca0', 0]]) + lin('k-bar', P.bar),
      body: `<rect width="1600" height="1000" fill="url(#k-out)"/>${lights}
        <path d="M-20 -20H1620V1020H-20ZM120 80V770H1480V80Z" fill="${wall}" fill-rule="evenodd"/>
        <rect x="532" y="80" width="16" height="690" fill="${wall}"/><rect x="1052" y="80" width="16" height="690" fill="${wall}"/><rect x="120" y="296" width="1360" height="10" fill="${wall}"/>
        ${lamp(690, 140)}${lamp(950, 110)}
        <rect y="770" width="1600" height="240" fill="url(#k-bar)"/>
        <g transform="translate(820 776) scale(1.5)">
          <ellipse cx="0" cy="2" rx="62" ry="9" fill="${mix(cup, '#000', 0.15)}"/>
          <path d="M-36 0V-46h72v22c0 16 -14 24 -36 24Z" fill="${cup}"/><path d="M36 -38h10a12 12 0 0 1 0 24h-12" stroke="${cup}" stroke-width="6" fill="none"/>
          <ellipse cx="0" cy="-46" rx="36" ry="5" fill="${mix(c1, '#2a1608', 0.6)}"/>
          <g class="cn-steam" fill="none" stroke="${P.steam}" stroke-width="2.4" stroke-linecap="round"><path d="M-10 -58c-8 -12 8 -18 0 -30s6 -16 2 -26" opacity=".3"/><path d="M12 -60c-8 -10 10 -18 2 -30s6 -18 2 -26" opacity=".22"/></g>
        </g>`,
    };
  },

  // A creek winding down a valley between pines (by day: clear morning light on the water)
  flow([c0, c1, c2], r, day) {
    const mts = peaks(560, 170, r);
    const left = x => 520 + Math.max(0, x) * 0.17 + 14 * Math.sin(x / 80), right = x => 680 - (x - 800) * 0.2 + 12 * Math.sin(x / 70);
    const P = day ? {
      sky: [[0, '#84bbe2'], [0.42, mix(c2, '#cdebe1', 0.55)], [0.6, '#f1f9f4']], mts: mix(c2, '#d3e6df', 0.55), mist: 0.3, left: mix(c2, c1, 0.45), right: mix(c1, c2, 0.2),
      water: [[0, '#ffffff'], [0.4, mix(c2, '#e6fbf4', 0.5)], [1, mix(c2, c1, 0.3)]], rock: mix(c1, c0, 0.4), ground: mix(c1, c0, 0.3),
    } : {
      sky: [[0, mix(c0, '#000', 0.3)], [0.42, c1], [0.6, mix(c2, '#d4efe2', 0.45)]], mts: mix(c1, c2, 0.5), mist: 0.18, left: mix(c0, c1, 0.45), right: mix(c0, '#000', 0.2),
      water: [[0, mix(c2, '#e8fff6', 0.4)], [0.4, mix(c1, c2, 0.45)], [1, mix(c0, c1, 0.3)]], rock: mix(c0, '#000', 0.45), ground: mix(c0, '#000', 0.5),
    };
    const ripples = Array.from({ length: 16 }, (_, i) => { const t = i / 16, y = 664 + t * t * 330, x = 800 + Math.sin(t * 5) * 80 * t, w = 20 + t * 180; return `<path d="M${n1(x - w / 2)} ${n1(y)}q${n1(w / 2)} -5 ${n1(w)} 0" stroke="${day ? '#5f9c8c' : '#f0fff8'}" stroke-opacity="${n1(0.18 + t * 0.2)}" stroke-width="${n1(1 + t * 2)}" fill="none"/>`; }).join('');
    return {
      defs: lin('k-sky', P.sky) + lin('k-water', P.water) + lin('k-mist', [[0, '#e6fff4', 0], [0.5, '#f4fffa', P.mist], [1, '#e6fff4', 0]]),
      body: `<rect width="1600" height="720" fill="url(#k-sky)"/>${day ? '' : stars(r, 24, 220)}
        ${area(mts, P.mts, ' opacity=".85"')}
        <rect class="cn-drift" x="-200" y="540" width="2000" height="120" fill="url(#k-mist)"/>
        <path d="M-60 1010${line(left, -60, 840, 30)}L840 1010Z" fill="${P.left}"/>
        <path d="${treeline(left, 40, 60, 150, r, -40, 760)}" fill="${P.left}"/>
        <path d="M760 1010${line(right, 760, 1660, 30)}L1660 1010Z" fill="${P.right}"/>
        <path d="${treeline(right, 38, 80, 190, r, 840, 1640)}" fill="${P.right}"/>
        <path d="M792 660C760 700 700 720 650 780S420 900 300 1010H1360C1180 900 940 860 960 780S830 700 810 660Z" fill="url(#k-water)"/>
        <g class="cn-glint">${ripples}</g>
        <g fill="${P.rock}"><ellipse cx="640" cy="790" rx="40" ry="14"/><ellipse cx="972" cy="800" rx="46" ry="16"/><ellipse cx="420" cy="930" rx="80" ry="26"/><ellipse cx="1220" cy="940" rx="90" ry="28"/><ellipse cx="760" cy="720" rx="18" ry="6"/></g>
        ${area(x => 960 + 30 * Math.sin(x / 240), P.ground)}`,
    };
  },

  // The city at dusk from a high office window (by day: glass towers reflecting the sky)
  bokehCool([c0, c1, c2], r, day) {
    const P = day ? {
      sky: [[0, '#6aa3d8'], [0.42, '#a3c8ea'], [0.7, '#e9eff5']], glow: '#ffffff', far: mix(c2, '#c9d6e4', 0.55), near: mix(c1, c2, 0.45),
      wc: ['#eef5fc', '#9fbad6', '#ffffff'], ground: mix(c1, c2, 0.3), frame: mix(c1, c0, 0.35), sill: '#ffffff',
    } : {
      sky: [[0, mix(c0, '#000', 0.2)], [0.42, mix(c1, '#3c4a6a', 0.35)], [0.7, mix(c2, '#d9a7b8', 0.5)]], glow: '#f2c1c8', far: mix(c1, c2, 0.45), near: mix(c0, '#000', 0.12),
      wc: undefined, ground: mix(c0, '#000', 0.35), frame: mix(c0, '#000', 0.55), sill: mix(c2, '#fff', 0.3),
    };
    return {
      defs: lin('k-sky', P.sky) + rad('k-glow', glowStops(P.glow, 0.45)),
      body: `<rect width="1600" height="1000" fill="url(#k-sky)"/>${day ? '' : stars(r, 20, 200)}
        <circle cx="900" cy="720" r="440" fill="url(#k-glow)"/>
        <g opacity=".85">${skyline(r, 740, 50, 190, 40, 110, P.far, day ? 0.3 : 0.16, 0.4, P.wc)}</g>
        ${skyline(r, 880, 110, 330, 70, 170, P.near, day ? 0.45 : 0.28, 0.35, P.wc)}
        <rect x="520" y="-10" width="14" height="1020" fill="${P.frame}"/><rect x="1080" y="-10" width="14" height="1020" fill="${P.frame}"/>
        <rect y="884" width="1600" height="130" fill="${P.frame}"/><rect y="880" width="1600" height="4" fill="${P.sill}" opacity=".3"/>`,
    };
  },

  // Above a sea of clouds at night, a dim moon and a plane far away (by day: bright cloud tops)
  grain([c0, c1, c2], r, day) {
    const P = day ? {
      sky: [[0, '#5b8fcc'], [0.5, '#a9c7e8'], [0.7, '#e8eff7']], glow: '#ffffff', moon: '#ffffff', plane: '#4a5468', clouds: ['#ffffff', '#eef2f8', '#dde4ee'],
    } : {
      sky: [[0, mix(c0, '#000', 0.4)], [0.5, c1], [0.7, mix(c2, '#7c7f99', 0.35)]], glow: '#dcdcf0', moon: '#e9e8f2', plane: mix(c0, '#000', 0.2), clouds: [mix(c2, '#a3a6bd', 0.4), mix(c1, c2, 0.4), mix(c1, c0, 0.4)],
    };
    return {
      defs: lin('k-sky', P.sky) + rad('k-glow', glowStops(P.glow, day ? 0.6 : 0.4)),
      body: `<rect width="1600" height="1000" fill="url(#k-sky)"/>${day ? '' : stars(r, 120, 560)}
        <circle cx="1000" cy="250" r="220" fill="url(#k-glow)"/><circle cx="1000" cy="250" r="34" fill="${P.moon}" opacity=".85"/>
        <g class="cn-blink"><path d="M690 432l40 -4 -12 -4h-6l-8 -8h-5l4 9 -14 2 -4 -4h-3l2 6Z" fill="${P.plane}" opacity=".8"/><circle cx="708" cy="429" r="2.4" fill="#ff6b6b"/></g>
        <g class="cn-drift">${cloudTops(640, 70, r, P.clouds[0], ' opacity=".9"')}</g>
        <g class="cn-drift b">${cloudTops(740, 100, r, P.clouds[1])}</g>
        <g class="cn-drift">${cloudTops(860, 140, r, P.clouds[2])}</g>`,
    };
  },

  // A planet rising out of the dark with slow brainwave lines over it (by day: a pastel pearl planet)
  lines([c0, c1, c2], r, day) {
    const sine = (y, a, L, ph) => { let d = `M-200 ${y}`; for (let x = -200; x <= 1900; x += LITE ? 32 : 12) d += `L${x} ${n1(y + a * Math.sin(x / L * 6.283 + ph))}`; return d; };
    const P = day ? {
      sky: [[0, mix(c2, '#fbf9ff', 0.84)], [0.6, mix(c2, '#f1ecfb', 0.72)], [1, mix(c2, '#e4dbf7', 0.55)]], glow: mix(c2, '#fff', 0.35), line: c2, lineA: 1.6,
      moon: mix(c2, '#fff', 0.15), planet: [[0, mix(c2, '#ffffff', 0.5)], [0.2, mix(c2, '#ffffff', 0.3)], [1, mix(c2, c1, 0.3)]], rim: '#ffffff',
    } : {
      sky: [[0, mix(c0, '#000', 0.6)], [0.6, c0], [1, c1]], glow: c2, line: mix(c2, '#fff', 0.3), lineA: 1,
      moon: mix(c2, '#fff', 0.5), planet: [[0, mix(c1, c2, 0.3)], [0.2, c1], [1, mix(c0, '#000', 0.4)]], rim: mix(c2, '#fff', 0.3),
    };
    return {
      defs: lin('k-sky', P.sky) + rad('k-glow', glowStops(P.glow, 0.55)) + lin('k-planet', P.planet),
      body: `<rect width="1600" height="1000" fill="url(#k-sky)"/>${day ? '' : stars(r, 140, 640)}
        <circle cx="800" cy="760" r="620" fill="url(#k-glow)"/>
        <g class="cn-drift" fill="none" stroke="${P.line}">${[300, 360, 420, 480, 540].map((y, i) => `<path d="${sine(y, 16 + i * 6, 260 + i * 70, i)}" stroke-opacity="${n1((0.08 + i * 0.05) * P.lineA)}" stroke-width="1.6"/>`).join('')}</g>
        <circle cx="1120" cy="250" r="22" fill="${P.moon}" opacity=".85"/>
        <circle cx="800" cy="1520" r="900" fill="none" stroke="${c2}" stroke-opacity=".18" stroke-width="36"/>
        <circle cx="800" cy="1520" r="900" fill="url(#k-planet)" stroke="${P.rim}" stroke-opacity=".7" stroke-width="3"/>`,
    };
  },
};

function art(s, view = '0 0 1600 1000', day = false) {
  const recipe = ART[s.mood] || ART.lines;
  const { defs, body } = recipe(s.colors, rng(seedOf(s.id)), day);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;
}

// Filmstrip frames: the same drawings, cropped to the middle and simplified, as CSS backgrounds.
// Each frame is a custom property, so mixes reuse them; built once per scheme.
const THUMB = '400 360 800 494';
const dataUri = svg => `url("data:image/svg+xml,${svg.replace(/\s+/g, ' ').replace(/"/g, "'").replace(/[#%<>&]/g, encodeURIComponent)}")`;
const varsBy = {};
let framesCss = '', framesKey = '';
function frames(c, day) {
  const key = `${day}|${c.mixes.map(m => m.id).join()}`;
  if (framesCss && key === framesKey) return framesCss;
  if (!varsBy[day]) {
    LITE = true;
    varsBy[day] = c.scenes.map(s => `--cn-${s.id}:${dataUri(art(s, THUMB, day))}`).join(';');
    LITE = false;
  }
  const ok = new Set(c.scenes.map(s => s.id));
  const scenes = c.scenes.map(s => `.tile[data-scene="${s.id}"] .tile-art{background-image:var(--cn-${s.id})}`).join('');
  const mixes = c.mixes.filter(m => /^[\w-]+$/.test(m.id)).map(m => {
    const [a, b = a] = m.active.filter(id => ok.has(id));
    return a ? `.tile[data-mix="${m.id}"] .tile-art{background-image:var(--cn-${a}),var(--cn-${b});background-size:50% 100%;background-position:left,right;background-repeat:no-repeat}` : '';
  }).join('');
  framesKey = key;
  return (framesCss = `<style>.grid{${varsBy[day]}}${scenes}${mixes}</style>`);
}

// Menu proposal (data-menus="new"): each sheet is projected like a film frame; this is its slate
const KIND = { menu: 'Menú', timer: 'Temporizador', theme: 'Tema', scene: 'Escena', save: 'Guardar mezcla', credits: 'Créditos', pick: 'Todos los sonidos', install: 'Instalar' };
const ROLL = { menu: 1, timer: 2, theme: 3, scene: 4, save: 5, credits: 6, pick: 7, install: 8 };

export default {
  scheme: 'dark',
  color: { light: '#eef2f5' }, // dark: the focused scene's darkest colour
  backdrop: 'bare',
  orient: { layer: 'knob', scene: 'h', master: 'h' },
  decor: {
    logo: () => '',
    sheet: (kind, c) => `<div class="cn-slate">
      <span class="cn-rec" aria-hidden="true"></span><span class="cn-roll">Rollo ${ROLL[kind] || 0} · ${c.esc(KIND[kind] || 'Domentum')}</span>
      <span class="cn-tc" data-timer-text>${c.esc(c.timer)}</span>
      <button class="cn-close" data-act="close" aria-label="Cerrar">${c.icon('x')}</button>
    </div>`,
    bg: c => {
      const day = c.scheme === 'light';
      return `${frames(c, day)}${art(c.scene, undefined, day).replace('<svg ', '<svg class="cine-art" aria-hidden="true" ')}`;
    },
  },
};
