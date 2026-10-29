// Pop neobrutal: yellow dot grid, thick black borders, hard offset shadows and flat bright colours.
// Scene tiles are stickers stuck on slightly crooked; the logo is a spinning star.
const STAR = `<svg class="p-star" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#ff8ac2" stroke="#141414" stroke-width="3"/><path d="M20 7l3.2 8.6L32 16l-6.9 5.6L27.5 31 20 25.8 12.5 31l2.4-9.4L8 16l8.8-.4z" fill="#ffd84d" stroke="#141414" stroke-width="2.4" stroke-linejoin="round"/></svg>`;

// The shouted tag on top of each sheet (menu proposal only)
const TAGS = { menu: '¡HOLA!', timer: '¡TIC-TAC!', theme: '¡ESTILAZO!', scene: '¡A TU AIRE!', save: '¡GUÁRDALA!', credits: '¡GRACIAS!', install: '¡A TU MÓVIL!', pick: '¡A ELEGIR!' };

export default {
  color: { light: '#ffd84d', dark: '#17142b' },
  scheme: 'light',
  backdrop: 'off',
  orient: { layer: 'h', scene: 'h', master: 'h' },
  decor: {
    logo: () => STAR,
    sheet: (kind, c) => (c.state.menus === 'new'
      ? `<span class="p-tag" aria-hidden="true">${TAGS[kind] || '¡EY!'}</span><button class="p-x" data-act="close" aria-label="Cerrar">${c.icon('x')}</button>`
      : ''),
  },
};
