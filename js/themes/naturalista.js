// Atlas naturalista: an antique book in forest green, cream and gold. The focused scene is a framed
// plate ("Lámina I") with an engraved compass around its icon; the layers are an index with dotted
// leaders; the scenes are specimen cards numbered in roman numerals (CSS counters).

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];

// A naturalist's pencilled note under each plate's index of layers
const NOTES = {
  ocean: 'más gaviotas al amanecer',
  rain: 'sin paraguas, para dormir',
  campfire: 'la noche, a media voz',
  beach: 'la brisa, apenas',
  train: 'el viento, por la ventanilla',
  forest: 'pájaros al alba',
  garden: 'campanillas con poca brisa',
  cafe: 'la cafetera, de fondo',
  storm: 'truenos lejanos, sin paraguas',
  creek: 'agua clara, poco viento',
  office: 'el teclado ayuda a concentrarse',
};

const f = n => n.toFixed(2);

// The engraved compass: a ring of ticks with a north mark, a dotted circle and an inner ring
const TICKS = Array.from({ length: 72 }, (_, i) => {
  const a = i * 5 * Math.PI / 180, r1 = i % 6 ? 53 : 49.5;
  return `<line x1="${f(60 + r1 * Math.sin(a))}" y1="${f(60 - r1 * Math.cos(a))}" x2="${f(60 + 56 * Math.sin(a))}" y2="${f(60 - 56 * Math.cos(a))}"/>`;
}).join('');
const EMBLEM = `<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" aria-hidden="true">
  <circle cx="60" cy="60" r="59" stroke-width=".8"/>
  <g class="spin" stroke-width=".6">${TICKS}<path d="M60 3.5l2.6 6.2h-5.2z" fill="currentColor" stroke="none"/></g>
  <circle cx="60" cy="60" r="46.5" stroke-width=".6" stroke-dasharray="1 3"/><circle cx="60" cy="60" r="41" stroke-width=".8"/>
</svg>`;

// A small fleuron between two rules, drawn so it doesn't depend on a symbol font
const FLEURON = `<svg class="fleuron" viewBox="0 0 32 22" fill="currentColor" aria-hidden="true">
  <path d="M16 2c-4.6 3.2-6.4 8-2.6 12.4.9 1 1.8 1.9 2.6 3.6.8-1.7 1.7-2.6 2.6-3.6C22.4 10 20.6 5.2 16 2Z"/>
  <path d="M13.6 15.6C9.4 16.8 5.6 15.4 4 11.6c2.6 2.2 5.8 2.4 8.6 1.4ZM18.4 15.6c4.2 1.2 8 -.2 9.6 -4-2.6 2.2-5.8 2.4-8.6 1.4Z" opacity=".85"/>
  <path d="M16 18v3.2" stroke="currentColor" stroke-width="1.2"/>
</svg>`;

// Menu proposal (data-menus="new"): each sheet is a page of the atlas with a running head and a ribbon
const PAGE = {
  menu: ['Índice', 'i'], timer: ['Temporizador', 'ii'], theme: ['Encuadernación', 'iii'], scene: ['Lámina', 'iv'],
  save: ['Herbario de mezclas', 'v'], credits: ['Fuentes', 'vi'], pick: ['Catálogo de sonidos', 'vii'], install: ['Edición de bolsillo', 'viii'],
};

export default {
  color: '#10231a',
  scheme: 'dark',
  backdrop: 'off',
  orient: { layer: 'h', scene: 'h', master: 'h' },
  decor: {
    logo: () => FLEURON,
    sheet: (kind, c) => {
      const [name, folio] = PAGE[kind] || ['Atlas', '·'];
      return `<header class="nt-folio"><span>Atlas de paisajes sonoros</span><span class="nt-pg">${c.esc(name)} · pág. ${folio}</span></header>
        <button class="nt-ribbon" data-act="close" aria-label="Cerrar">${c.icon('x')}</button>`;
    },
    now: c => {
      const n = c.scenes.indexOf(c.scene);
      // keep the slow spin continuous across re-renders
      const delay = ((Date.now() / 1000) % 120).toFixed(1);
      const timer = c.timer === '∞' ? 'sin prisa' : `quedan <span data-timer-text>${c.esc(c.timer)}</span>`;
      return `<span class="plate-no">Lámina ${ROMAN[n] || n + 1}</span>
        <div class="emblem" style="--spin:-${delay}s">${EMBLEM}</div>
        <p class="hand">${c.playing ? 'sonando' : 'en pausa'} · ${timer}</p>`;
    },
    mixer: c => {
      const note = NOTES[c.scene.id];
      return note ? `<p class="note"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 16.5C12 12 8 8.5 4.5 4.5M4.5 4.5l7.5.8M4.5 4.5l.6 7.4"/></svg>${note}</p>` : '';
    },
  },
};
