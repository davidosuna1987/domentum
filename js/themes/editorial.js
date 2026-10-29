// Editorial suizo: paper, a hard grid, enormous black type and one red. Dark: black paper, off-white type.
// decor.now draws the kicker line ("01 / 14 — Sonando") and tells the CSS how long the longest word of
// the title is, so the huge headline always fits its column. A hidden .ed-fresh marker is emitted only
// when the scene changes, so the headline and the layer rows rise once instead of on every re-render.
// decor.sheet is the masthead of its menus (a full page of the index), shown only with data-menus="new".

const pad = n => String(n).padStart(2, '0');
let lastTitle = '';
let lastMix = '';

const SHEETS = { menu: 'Índice', timer: 'Temporizador', theme: 'Temas', scene: 'Paisaje', save: 'Guardar', credits: 'Créditos', install: 'Instalar', pick: 'Sonidos' };
const ORDER = Object.keys(SHEETS);

export default {
  color: { light: '#eeeae1', dark: '#121211' },
  scheme: 'light',
  backdrop: 'off',
  orient: { layer: 'h', scene: 'h', master: 'h' },
  decor: {
    logo: () => '',
    now: c => {
      const n = c.scenes.indexOf(c.scene) + 1;
      const fit = Math.max(4, ...c.title.split(/\s+/).map(w => w.length));
      const fresh = c.title !== lastTitle;
      lastTitle = c.title;
      return `<div class="ed-kick"><span>${pad(n)} / ${pad(c.scenes.length)} — ${c.playing ? 'Sonando' : 'En pausa'}</span><span>${c.esc(c.meta)}</span></div>
        <style>[data-theme="editorial"] #now { --fit: ${fit}; }</style>${fresh ? '<i class="ed-fresh" hidden></i>' : ''}`;
    },
    mixer: c => {
      const key = `${c.scene.id}|${c.layers.length}`;
      const fresh = key !== lastMix;
      lastMix = key;
      return fresh ? '<i class="ed-fresh" hidden></i>' : '';
    },
    // The masthead of every sheet (in .sheet-head, so it stays put while the body scrolls)
    sheet: kind => {
      const label = SHEETS[kind] || 'Domentum';
      return `<div class="ed-mast">
        <span class="ed-mbrand">domentum<i>.</i></span>
        <span class="ed-mkick">§ ${pad(ORDER.indexOf(kind) + 1)} — ${label}</span>
        <button class="ed-close" data-act="close" aria-label="Cerrar">Cerrar <i>×</i></button>
      </div>`;
    },
  },
};
