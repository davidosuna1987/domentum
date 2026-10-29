// Neumórfico: soft grey surfaces pushed out of / pressed into the page. The master volume is a dial
// ring around a big raised play button, every layer is a rotary knob, the scene volume too.
export default {
  color: { light: '#e3e8ef', dark: '#2a2e35' },
  scheme: 'light',
  backdrop: 'off',
  orient: { layer: 'knob', master: 'knob', scene: 'knob' },
  // Menus: the title, its intro and controls stay fixed at the top; only the content scrolls
  sheetHead: true,
  decor: {
    logo: () => '',
    // Menu proposal only: a raised close button (data-act="close" is handled by app.js)
    sheet: (kind, c) => (c.state.menus === 'new' ? `<button class="n-x" data-act="close" aria-label="Cerrar">${c.icon('x')}</button>` : ''),
    // "Sonando · 6 capas · quedan 44:59"; shown only while a timer runs (html[data-timer="on"])
    now: c => `<span class="n-left" aria-hidden="true">· quedan <span data-timer-text>${c.esc(c.timer)}</span></span>`,
  },
};
