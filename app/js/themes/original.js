// Cristal (id "original", the first look): dark glass over the animated canvas backdrop. Light: frosted
// white glass with dark text over the same landscape washed with a white veil.
// decor.sheet is the close button of its menus (a glass bubble that blooms out of the button), shown only
// with data-menus="new"; it sits in .sheet-head, so it stays put while the body scrolls.
export default {
  scheme: 'dark',
  backdrop: 'full',
  color: { light: '#e6eff1' },
  decor: {
    sheet: (kind, c) => `<button class="og-x" data-act="close" aria-label="Cerrar">${c.icon('x')}</button>`,
  },
};
