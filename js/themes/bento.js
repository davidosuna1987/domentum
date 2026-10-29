// Bento: a light board of white rounded cards in different sizes. The now-playing card takes the
// focused scene's colours; the timer and a few mixes get their own small cards (drawn here, in #extra).

// "1:02:03" / "44:59" → seconds
const secs = t => t.split(':').reduce((a, n) => a * 60 + Number(n), 0);

export default {
  color: { light: '#eceef3', dark: '#0c0e13' },
  scheme: 'light',
  backdrop: 'off',
  orient: { layer: 'h', scene: 'h', master: 'h' },
  decor: {
    logo: () => '<i class="b-logo"></i>',
    // Menu proposal only: the panel has its own close button (data-act="close" is handled by app.js)
    sheet: (kind, c) => (c.state.menus === 'new' ? `<button class="b-x" data-act="close" aria-label="Cerrar">${c.icon('x')}</button>` : ''),
    extra: c => {
      const on = c.timer !== '∞';
      const left = on ? secs(c.timer) : 0;
      const total = Math.max(left, (c.state.timer || 60) * 60) || 1;
      // The bar drains by itself (CSS animation, paused while nothing plays) between renders
      const bar = on ? ` style="--p:${(left / total).toFixed(4)};animation-duration:${left}s"` : '';
      const mixes = c.mixes.slice(0, 5).map(m => {
        const s = c.scenes.find(x => x.id === m.active[0]);
        return `<button class="b-mix" data-mix="${c.esc(m.id)}"><i style="background:${s ? s.colors[2] : '#9aa0b0'}"></i><span>${c.esc(m.name)}</span></button>`;
      }).join('');
      // The timer card is a <label> for the real timer button, so tapping it opens the same sheet
      return `
        <label class="b-card b-timer" for="timerBtn">
          <span class="b-lbl">Temporizador</span>
          <b class="b-time" data-timer-text>${c.esc(c.timer)}</b>
          <span class="b-inf">Sin límite</span>
          <span class="b-prog${on ? '' : ' idle'}"><i${bar}></i></span>
        </label>
        <section class="b-card b-mixes">
          <div class="b-hd"><span class="b-lbl">Mezclas</span><button class="b-save" data-save-mix aria-label="Guardar lo que suena" title="Guardar lo que suena">${c.icon('plus')}</button></div>
          <div class="b-list">${mixes}</div>
        </section>`;
    },
  },
};
