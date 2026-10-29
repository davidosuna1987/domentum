// The first look: dark glass over the animated canvas backdrop. Light: frosted white glass with dark
// text over the same landscape washed with a white veil.
// decor.sheet is the close button of the menu proposal (a glass bubble that blooms out of the button),
// shown only with data-menus="new".
export default {
  scheme: 'dark',
  backdrop: 'full',
  color: { light: '#e6eff1' },
  decor: {
    sheet: (kind, c) => {
      const again = document.body.classList.contains('sheet-open');
      return `<button class="og-x${again ? ' og-again' : ''}" data-act="close" aria-label="Cerrar">${c.icon('x')}</button>`;
    },
  },
};
