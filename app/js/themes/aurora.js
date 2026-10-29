// Aurora orbital: a night sky with drifting aurora light. The focused scene is a glowing orb and its
// layers orbit it: the closer a layer is to the centre, the louder it plays (slider kind 'radial').
// Blob and orb colours follow the focused scene through --s0/--s1/--s2.

// Menu proposal (data-menus="new"): every sheet blooms out of a small orb, like the one in the middle
const SHEET_ICON = { menu: 'sparkles', timer: 'timer', theme: 'palette', save: 'heart', credits: 'info', pick: 'grid', install: 'phone' };

export default {
  color: '#05040c',
  scheme: 'dark',
  backdrop: 'off',
  orient: { layer: 'radial', scene: 'h', master: 'h' },
  decor: {
    logo: () => '',
    sheet: (kind, c) => `<div class="au-top">
      <span class="au-mini" aria-hidden="true">${c.icon(kind === 'scene' ? c.scene.icon : SHEET_ICON[kind] || 'sparkles')}</span>
      <button class="au-x" data-act="close" aria-label="Cerrar">${c.icon('x')}</button>
    </div>`,
    bg: () => '<div class="sky"><i class="blob b1"></i><i class="blob b2"></i><i class="blob b3"></i><i class="blob b4"></i></div>',
    mixer: c => c.layers.length && !c.scene.type
      ? '<p class="orbit-hint">Acerca una capa al centro para subirla · aléjala para bajarla</p>'
      : '',
    // Desktop and tablet: the mixes as a glass panel next to the orbit (the Mezclas tab still has them all)
    extra: c => {
      const rows = c.mixes.slice(0, 5).map(m => `
        <div class="mx" role="button" tabindex="0" data-mix="${c.esc(m.id)}" aria-label="Reproducir mezcla ${c.esc(m.name)}">
          <span>${c.esc(m.name)}</span><small>${m.active.length} ${m.active.length === 1 ? 'paisaje' : 'paisajes'}</small>
        </div>`).join('');
      return `<section class="mix-panel" aria-label="Mezclas">
        <h2>Mezclas</h2>${rows}
        <div class="mx save" role="button" tabindex="0" data-save-mix>${c.icon('heart')}<span>Guardar lo que suena</span></div>
        ${c.mixes.length > 5 ? '<button class="mx more" data-tab="mixes">Ver todas</button>' : ''}
      </section>`;
    },
  },
};
