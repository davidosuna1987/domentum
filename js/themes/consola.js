// Consola hi-fi: a 70s cream and aluminium deck with walnut cheeks (dark: black anodised, dark walnut). The LCD (scene title, timer and a
// bouncing spectrum) and the two needle VU meters are decoration drawn in decor.now; the real title,
// status, faders and keys are app.js's markup laid out on the deck by the CSS.

// Spectrum: fixed bar heights, each bar bounces with its own phase (CSS)
const BARS = Array.from({ length: 40 }, (_, i) => {
  const h = 25 + 70 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.37));
  return `<i style="--h:${h.toFixed(0)}%;--d:${-((i * 137) % 1100)}ms"></i>`;
}).join('');

// A VU meter face: scale arc with the red zone, ticks and the label. The needle angle comes from CSS (--a)
const P = (r, deg) => [100 + r * Math.sin(deg * Math.PI / 180), 112 - r * Math.cos(deg * Math.PI / 180)].map(n => n.toFixed(1));
const arc = (from, to) => { const [x1, y1] = P(82, from), [x2, y2] = P(82, to); return `M${x1} ${y1}A82 82 0 0 1 ${x2} ${y2}`; };
const TICKS = Array.from({ length: 11 }, (_, i) => {
  const d = -50 + i * 10, [x1, y1] = P(78, d), [x2, y2] = P(i % 2 ? 84 : 88, d);
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${i > 7 ? '#d23b12' : '#2b2621'}" stroke-width="1.4"/>`;
}).join('');
const vu = side => `<div class="cs-vu"><svg viewBox="0 0 200 112" aria-hidden="true">
  <path d="${arc(-50, 28)}" stroke="#2b2621" stroke-width="1.2" fill="none"/><path d="${arc(28, 50)}" stroke="#d23b12" stroke-width="4" fill="none"/>${TICKS}
  <text x="100" y="80" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="800" font-size="13" fill="#2b2621">VU</text>
  <text x="16" y="100" font-family="Archivo, sans-serif" font-weight="700" font-size="10" fill="#7a7062">${side}</text>
  <g class="cs-needle cs-${side}"><line x1="100" y1="112" x2="100" y2="20" stroke="#1d1a16" stroke-width="1.6"/></g>
  <circle cx="100" cy="112" r="9" fill="#2b2621"/></svg></div>`;
const VUS = vu('L') + vu('R');

// Menus: every sheet is a panel of the deck with its own LCD strip and a close key (how it comes in: consola.css)
const SHEETS = { menu: 'Menú', timer: 'Temporizador', theme: 'Temas', scene: 'Paisaje', save: 'Guardar', credits: 'Créditos', install: 'Instalar', pick: 'Sonidos' };

export default {
  color: { light: '#e6e0d3', dark: '#1c1b1d' },
  scheme: 'light',
  backdrop: 'off',
  orient: { layer: 'v', scene: 'v', master: 'v' },
  decor: {
    logo: () => '<span class="cs-badge">Paisajes · 14</span>',
    now: c => `<div class="cs-lcd" aria-hidden="true"></div>
      <span class="cs-temp">TEMP <span data-timer-text>${c.esc(c.timer)}</span></span>
      <div class="cs-spec" aria-hidden="true">${BARS}</div>
      <div class="cs-glass" aria-hidden="true"></div>
      <div class="cs-vus" aria-hidden="true" style="--m:${c.master}">${VUS}</div>`,
    sheet: (kind, c) => `<div class="cs-sh">
      <span class="cs-sh-lcd"><span>▶ ${SHEETS[kind] || 'Domentum'}</span>${kind === 'timer' ? `<span>TEMP <span data-timer-text>${c.esc(c.timer)}</span></span>` : ''}</span>
      <button class="cs-sh-x" data-act="close" aria-label="Cerrar">${c.icon('x')}</button>
    </div>`,
  },
};
