// Tinta zen: rice paper, ink and vermilion. The play button is an ensō, one brush stroke.

// The stroke: thick where the brush lands, thinning towards the tail, slightly uneven
function brush(cx, cy, r) {
  const N = 240, a0 = -100 * Math.PI / 180, sweep = 318 * Math.PI / 180, outer = [], inner = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = a0 + sweep * t;
    const w = (1.5 + 22 * Math.pow(1 - t, 0.75)) * Math.min(1, t * 14 + 0.25);
    const rr = r + 2.6 * Math.sin(a * 3 + 0.7) + 1.2 * Math.sin(a * 7 + 2);
    outer.push([cx + (rr + w / 2) * Math.cos(a), cy + (rr + w / 2) * Math.sin(a)]);
    inner.push([cx + (rr - w / 2) * Math.cos(a), cy + (rr - w / 2) * Math.sin(a)]);
  }
  return 'M' + outer.concat(inner.reverse()).map(p => p.map(n => n.toFixed(1)).join(' ')).join('L') + 'Z';
}

// The path the brush follows, used to reveal the stroke as if it were being painted
function guide(r) {
  const a0 = -100 * Math.PI / 180, a1 = a0 + 318 * Math.PI / 180;
  return `M${100 + r * Math.cos(a0)} ${100 + r * Math.sin(a0)}A${r} ${r} 0 1 1 ${100 + r * Math.cos(a1)} ${100 + r * Math.sin(a1)}`;
}

const STROKE = brush(100, 100, 86);
const GUIDE = guide(86);

export default {
  color: { light: '#f4f0e6', dark: '#151412' },
  scheme: 'light',
  backdrop: 'off',
  orient: { layer: 'v' },
  decor: {
    // The app's mark: a vermilion brush ensō with a sound wave inside (icons/mark.svg, from design/logo.py)
    logo: () => '<img class="mark" src="icons/mark.svg" alt="" width="34" height="34">',
    bg: () => `<svg width="0" height="0" style="position:absolute">
      <filter id="zen-rough"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.4"/></filter>
      <filter id="zen-ink" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".05 .8" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.6"/></filter>
    </svg>`,
    // A pale stroke is always there; playing goes over it again in full ink, pausing lifts the ink off
    play: c => `<svg class="enso${c.started ? ' draw' : ''}${c.stopped ? ' lift' : ''}" viewBox="0 0 200 200" aria-hidden="true">
      <mask id="zen-reveal"><path class="brush" d="${GUIDE}" stroke="#fff" stroke-width="60" fill="none" pathLength="1" stroke-dasharray="1" stroke-dashoffset="0"/></mask>
      <path class="base" d="${STROKE}" filter="url(#zen-ink)"/>
      <g class="ink" mask="url(#zen-reveal)"><path d="${STROKE}" filter="url(#zen-ink)"/></g>
    </svg>`,
    // Menu proposal (data-menus="new"): an ink line that draws the panel's edge, and a close mark
    sheet: () => `<i class="zen-edge" aria-hidden="true"></i><button class="zen-x" data-act="close" aria-label="Cerrar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`,
  },
};
