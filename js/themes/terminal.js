// Terminal: green phosphor on a CRT. The prompt lines, the scrolling waveform, the log and the
// tmux-like status bar are decoration; the bars, toggles and listings are app.js's markup styled as text.
// The status bar's window list reuses data-focus, so clicking "1:lluvia" focuses that scene.

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const two = n => String(n).padStart(2, '0');
const clock = d => `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;

// A periodic waveform of block characters, drawn twice so the CSS scroll loops seamlessly
const BLOCKS = '▁▂▃▄▅▆▇█';
const PERIOD = 96;
const WAVE = Array.from({ length: PERIOD }, (_, i) => {
  const t = (i / PERIOD) * Math.PI * 2;
  return BLOCKS[Math.max(0, Math.min(7, Math.round(3.5 + 2.2 * Math.sin(t * 6) + 1.3 * Math.sin(t * 2 + 1))))];
}).join('');

const prompt = (dir = '~') => `<span class="t-p">dm@local <b>${dir}</b> $</span>`;

// Menu proposal: each sheet opens as a new tmux window [2] that powers on like a CRT
const SHEETS = { menu: 'menú', timer: 'temporizador', theme: 'tema', scene: 'paisaje', save: 'guardar', credits: 'créditos', install: 'instalar', pick: 'sonidos' };
const CMDS = { menu: 'domentum --menu', timer: 'domentum timer', theme: 'domentum theme --list', save: 'domentum mix save', credits: 'cat CREDITOS.txt', install: 'domentum install', pick: 'ls -R paisajes/' };

export default {
  color: { dark: '#030a05', light: '#f6f4ec' },
  scheme: 'dark',
  backdrop: 'off',
  orient: { layer: 'h', scene: 'h', master: 'h' },
  decor: {
    logo: () => '',
    now: c => {
      const names = c.active.map(s => slug(s.name)).join(',');
      const cmd = c.playing ? `domentum play ${names}${c.state.timer ? ` --timer ${c.state.timer}m` : ''}` : 'domentum pause';
      return `<div class="t-cmd t-line">${prompt()} ${cmd}</div>
        <span class="t-timer">${c.icon('timer')}<span data-timer-text>${c.esc(c.timer)}</span></span>
        <div class="t-wave" aria-hidden="true"><span>${WAVE}${WAVE}</span></div>`;
    },
    mixer: c => {
      const now = Date.now();
      const at = k => clock(new Date(now - k * 41000));
      const lines = c.active.map((s, i) => `<div class="t-line t-dim">${at(6 - i)}  play     ${slug(s.name)} (${s.layers?.length ? `${s.layers.length} capas` : s.variants ? `${s.variants.length} tipos` : 'tus audios'})</div>`);
      for (const l of c.layers.filter(l => l.v === 0).slice(0, 2)) lines.push(`<div class="t-line t-dim">${at(2)}  capa     ${slug(l.name)} → 0% (silencio)</div>`);
      if (c.state.timer) lines.push(`<div class="t-line t-dim">${at(1)}  timer    ${c.state.timer}m, fundido final 30s</div>`);
      if (!c.playing) lines.push(`<div class="t-line t-dim">${at(0)}  pausa</div>`);
      return `<div class="t-help t-line"># tab elige control · ←→ volumen · espacio pausa</div>
        <div class="t-log">
          <div class="t-line">${prompt()} tail -f domentum.log</div>
          ${lines.join('')}
          <div class="t-line">${clock(new Date(now))}  <span class="t-amber">quedan <span data-timer-text>${c.esc(c.timer)}</span></span></div>
        </div>
        <div class="t-line t-end">${prompt()} <i class="t-cursor"></i></div>`;
    },
    // Re-rendered while already open (picking a sound or a theme): no power-on/typing that time
    sheet: (kind, c) => {
      const again = document.body.classList.contains('sheet-open');
      const cmd = kind === 'scene' ? `domentum scene ${slug(c.scene.name)}` : CMDS[kind] || 'domentum';
      return `<div class="t-sh${again ? ' t-again' : ''}"><span>[2] ${SHEETS[kind] || kind}</span><button class="t-sh-x" data-act="close" aria-label="Cerrar">[x] cerrar</button></div>
        <div class="t-line t-sh-cmd">${prompt()} ${cmd}</div>`;
    },
    extra: c => `<nav class="t-win" aria-label="Paisajes sonando">${c.active.map((s, i) =>
      `<button data-focus="${s.id}" class="${s.id === c.scene.id ? 'on' : ''}" aria-label="Mostrar ${c.esc(s.name)}">${i}:${slug(s.name)}${s.id === c.scene.id ? '*' : ''}</button>`).join('')}</nav>`,
  },
};
