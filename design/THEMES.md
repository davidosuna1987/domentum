# How a Domentum theme is built

The player lives in `app/` (the site root is the landing page); paths below are relative to `app/`.

Domentum is a static PWA of soundscapes (vanilla JS, ES modules, no build step, UI in Spanish).
`js/app.js` owns state, audio and every interaction, and renders the same semantic markup for every
theme. A theme changes **only how that markup looks** and adds optional decoration. Nothing a user can
do (play, volumes, mixes, timer, sheets) may get lost in any theme.

A theme is two files you own completely:

- `app/css/themes/<id>.css` — all the visuals of the app shell, plus the sheet/toast tokens.
- `app/js/themes/<id>.js` — `export default { … }` with the options below.

`css/base.css` is always loaded first (resets, slider mechanics, sheets, toast, theme picker) and is
recoloured through tokens. **Do not edit** `js/app.js`, `css/base.css`, `index.html`, `js/themes/index.js`
or another theme's files. If you need a hook that does not exist, work around it in your files and say so
in your report.

Reference themes: `zen` (default, light, vertical sliders, decor for logo/bg/play) and `original`
(the first look, dark glass over the canvas backdrop). Read both before starting.

## Theme module

```js
export default {
  color: '#f4f0e6',    // <meta name="theme-color">; omit to use the focused scene's darkest colour
  scheme: 'light',     // color-scheme: 'light' | 'dark'
  backdrop: 'off',     // canvas #bg: 'full' (original look) | 'bare' (only particles: rain, embers…, transparent) | 'off'
  orient: { layer: 'h', scene: 'h', master: 'h' },  // slider kinds, see below
  decor: {             // every slot is optional and returns an HTML string
    logo: () => '',    // replaces the brand mark inside .logo
    bg: ctx => '',     // #decor, a fixed full-screen layer behind the app (pointer-events: none). Re-rendered only when the theme or the focused scene changes
    now: ctx => '',    // appended at the end of #now
    play: ctx => '',   // inside the play button, before its icon
    mixer: ctx => '',  // appended at the end of #mixer
    extra: ctx => '',  // #extra, after <main> inside .app (e.g. a status bar, extra cards)
  },
};
```

`ctx` has: `scene` (focused scene object from `js/catalog.js`: id, name, icon, mood, colors[3], layers…),
`active` (array of playing scenes, 1–4), `scenes` (all 14), `playing`, `started` (true only on the render
right after playback started — use it to trigger a one-off animation), `title`, `sub` (short subtitle),
`meta` ("6 capas", "6 tipos"…), `layers` ([{key, name, icon, v}] of the focused scene), `master`,
`timer` (label text, "∞" or "44:59"), `mixes` (saved + preset), `state`, and helpers `icon(name)`,
`esc(str)`, `pct(v)`. Any element with `data-timer-text` gets its text updated every second.

Decor is re-rendered on every state change (except `bg`), so keep it cheap and don't rely on it keeping
DOM state. Decor is decoration: interactive things must be the shared markup below.

## Slider kinds (`orient`)

All sliders are `<div class="slider" data-key data-orient role="slider" style="--v:0..1"><div class="track"><div class="fill"></div><div class="thumb"></div></div></div>`.
`--v` (0–1) is also set on the closest `[data-ctl]` container, and every `[data-val]` inside it gets the
percentage as text. app.js computes values from geometry, so the CSS must match:

- `h`: value = position across `.track`'s width (or the slider's box if there is no track). Touch only grabs sideways drags so the page still scrolls.
- `v`: value = position up `.track`'s height (bottom = 0). `touch-action: none`.
- `knob`: value changes by dragging up/right (180 px = full range); a tap does nothing. Rotate the visual with `--v`, e.g. `rotate: calc(-135deg + var(--v) * 270deg)`.
- `radial`: an orbit. Value = distance from the centre of the closest `[data-stage]` (the `.layers` box): r = (0.9 − 0.45·v) × half its width. So place each `.layer` at that radius, e.g. with `--i`/`--n` and CSS trig: `--a: calc(-90deg + var(--i) * 360deg / var(--n)); --r: calc(0.9 - var(--v) * 0.45); left: calc(50% + cos(var(--a)) * var(--r) * 50%); top: calc(50% + sin(var(--a)) * var(--r) * 50%)`. The `.layers` box must be square.

Keyboard arrows work for every kind. Make hit areas comfortable on touch (≥ 28 px).

## Markup (what app.js renders)

`<html>` carries `data-theme`, `data-scene` (focused id), `data-mood`, `data-playing="true|false"`,
`data-count` (1–4 playing scenes), `data-timer="on|off"`, and CSS vars `--s0 --s1 --s2` (focused scene
colours, dark → light).

```html
<canvas id="bg"></canvas>                      <!-- hidden unless backdrop is 'full' or 'bare' -->
<div class="decor" id="decor"></div>           <!-- decor.bg -->
<div class="app">
  <header class="top">
    <div class="brand"><span class="logo" id="logo">…</span><span class="brand-name">domentum</span></div>
    <div class="top-actions">
      <button class="pill [on]" id="timerBtn"><svg class="ico"/><span id="timerLabel">∞</span></button>   <!-- .on when a timer runs -->
      <button class="icon-btn" id="menuBtn"><svg class="ico"/></button>
    </div>
  </header>
  <main class="layout">
    <section class="col-main">
      <div class="now glass" id="now">
        <div class="now-head">
          <div class="art" style="--c0;--c1;--c2"><svg class="ico"/></div>
          <div class="now-text">
            <div class="eyebrow"><span class="eq"><i></i><i></i><i></i></span> Sonando|En pausa<span class="meta"> · 6 capas</span></div>
            <div class="now-title">Océano<span class="plus"> + </span>Fogata</div>
            <div class="now-sub">Velero · Olas · Gaviotas</div>
          </div>
          <button class="play [on]" id="playBtn">[decor.play]<svg class="ico"/></button>   <!-- .on while playing -->
        </div>
        <!-- only when 2+ scenes play: -->
        <div class="chips"><div class="chip [on]" role="button" data-focus="rain"><svg class="ico"/><span>Lluvia</span><button class="chip-x" data-remove="rain"><svg class="ico"/></button></div>…</div>
        <div class="master" data-ctl="master" style="--v">
          <button class="icon-btn sm" id="muteBtn"><svg class="ico"/></button>
          <div class="slider" data-key="master" data-orient="…">…</div>
          <span class="val" data-val>90</span>
        </div>
        [decor.now]
      </div>
      <div class="panel" id="mixer">
        <div class="mix-head">
          <div class="art sm" style="--c0;--c1;--c2"><svg class="ico"/></div>
          <h2>Océano</h2><span class="mix-meta">6 capas</span>
          <button class="icon-btn" data-scene-menu="ocean"><svg class="ico"/></button>
        </div>
        <!-- recorded scenes: -->
        <div class="layers" data-stage style="--n:6">
          <div class="layer [off]" data-layer="ocean/boat" data-ctl data-status="|loading|ready|error" style="--v:.35;--i:0">
            <button class="layer-ico" data-toggle="ocean/boat"><svg class="ico"/></button>   <!-- tap = mute/unmute -->
            <div class="layer-name"><span>Velero</span></div>
            <div class="slider" data-key="layer:ocean/boat" data-orient="…">…</div>
            <span class="val" data-val>35</span>
          </div>…
        </div>
        <!-- noise / binaural (single choice + one volume) instead: -->
        <div class="variants" style="--n:6"><button class="variant [on]" data-variant="brown" style="--i:0"><svg class="ico"/> or <span class="glyph">δ</span><span class="vname">Marrón</span></button>…</div>
        <p class="hint">Grave y envolvente…</p>
        <div class="layer wide" data-ctl style="--v"><div class="layer-name"><span>Volumen</span></div><div class="slider" data-key="scene:noise" data-orient="…">…</div><span class="val" data-val>60</span></div>
        <!-- custom ("Personal"): layers as above, each .layer-name also has <button class="del">, then -->
        <label class="layer add"><input type="file" id="fileIn" hidden><svg class="ico"/><span>Importar audio</span></label>   <!-- inside .layers -->
        <p class="hint">Añade tus propios archivos…</p>
        [decor.mixer]
      </div>
    </section>
    <section class="col-lib">
      <nav class="tabs"><button data-tab="scenes" aria-selected="true">Paisajes</button><button data-tab="mixes" aria-selected="false">Mezclas</button></nav>
      <div id="library">
        <div class="grid scenes">
          <div class="tile [on]" role="button" data-scene="ocean" style="--c0;--c1;--c2;--i:0">   <!-- tap = play only this; .on = playing -->
            <div class="tile-art" data-mood="waves"><svg class="ico"/>[<span class="eq">…</span>]<button class="tile-add" data-add="ocean"><svg class="ico"/></button></div>   <!-- + = add to what plays / ✓ = remove -->
            <div class="tile-name">Océano</div><div class="tile-meta">6 capas</div>
          </div>…  (14 tiles)
        </div>
        <!-- Mezclas tab: -->
        <div class="grid mixes">
          <div class="tile save" role="button" data-save-mix><div class="tile-art save"><svg class="ico"/></div><div class="tile-name">Guardar lo que suena</div><div class="tile-meta">…</div></div>
          <div class="tile mix" role="button" data-mix="p-cabin" style="--c0;--c1;--c2;--i"><div class="tile-art"><div class="mix-icons"><svg class="ico"/>…</div>[<button class="tile-add" data-del-mix>trash</button>]</div><div class="tile-name">Cabaña con lluvia</div><div class="tile-meta">Lluvia + Fogata</div></div>…
        </div>
      </div>
    </section>
  </main>
  <div class="extra" id="extra"></div>          <!-- decor.extra -->
</div>
<div class="sheet-bg"></div><div class="sheet [wide]"></div><div class="toast"></div>   <!-- styled by base.css + tokens -->
```

Tricks that help: `display: contents` on `.col-main`, `.now`, `.now-head` or `.tile-art` lets you place
their children anywhere in a grid; CSS `order`; `[data-count]` to shrink long titles; `.layer.off`,
`.tile.on`, `.play.on`, `[data-playing="true"]` for state; CSS counters for numbering.

## Tokens for sheets, toast and the picker (set in `:root`)

`--font --text --muted --faint --accent --link --focus --sheet --sheet-text --sheet-muted --sheet-line
--sheet-radius --sheet-shadow --grip --hover --opt --opt-hover --on --on-text --ctl-radius --field
--field-line --switch-off --knob --scrim --toast --toast-text`. Defaults (dark) are in `css/base.css`.
You may add small extra rules for `.sheet h3`, `.row b`, `.opt`, `.btn` to match the theme's type.

## Fonts

Self-hosted, offline: `fonts/<slug>.css` (Latin subset). Import at the top of the theme CSS, e.g.
`@import url("../../fonts/inter-tight.css");`. Available: shippori-mincho, inter-tight, jetbrains-mono,
archivo, share-tech-mono, ibm-plex-mono, instrument-serif, inter, fraunces (variable ital/opsz/wght),
caveat, unbounded, manrope, nunito, bricolage-grotesque (variable opsz/wght). No CDNs or remote assets.

## Rules

- Match the approved mockup closely (`design/restyle/<NN-name>.html` and its screenshots in
  `design/restyle/shots/`), adapted to the real markup and to every state below.
- Phone 390 px, tablet 820 px, desktop 1440 px: no horizontal overflow, nothing cut, readable contrast.
- Animations in CSS, gentle, and off under `prefers-reduced-motion: reduce`. Avoid big blur/backdrop
  filters on large moving areas.
- Keep `:focus-visible` visible. Keep the UI text Spanish (it comes from app.js anyway).

## Testing

Dev server: `http://localhost:5181/app/` (if it is down: `python3 .claude/serve.py 5181` from the project
root, in the background). On localhost these URL params set the state (dev only):
`?theme=<id>` · `&demo` (shows it as playing with a 45:00 timer) · `&scene=rain,campfire,noise` (what
plays; first is focused) · `&tab=mixes` · `&sheet=menu|timer|theme|scene|save|credits`.

Screenshots (headless Chrome, real phone widths, prints page errors):
`node design/snap.mjs design/snaps/<id> "ocean=http://localhost:5181/app/?theme=<id>&demo" "multi=…" …`
then `python3 design/grid.py design/snaps/<id> <out.png> ocean multi …` for one review image (open it
with the Read tool). Check at least: `ocean` (6 layers), `rain` (2), multi `rain,campfire,noise`,
`noise`, `binaural`, `custom` (empty, shows the import box), `tab=mixes`, and `sheet=menu`,
`sheet=timer`, `sheet=theme` — at all three sizes. Fix until every shot is clean.

## Light and dark (added later)

`<html data-scheme="light|dark">` is the appearance the user chose (Sistema / Claro / Oscuro, resolved).
Every theme has a native scheme and **must also provide the opposite one**, restyled under
`:root[data-scheme="dark"]` (or `"light"`): app shell, decor, sheets and toast tokens, all readable, same
character (a dark Tinta zen is ink-black paper with pale ink, not a generic dark mode). Module options
`color` and `backdrop` may be `{ light, dark }`. `ctx.scheme` says which one is active, and `decor.bg` is
re-rendered when it changes.

## Menus and sheets (added later)

`#sheet` has `data-sheet="menu|timer|theme|scene|save|credits|install|pick"`. `decor.sheet(kind, ctx)`
returns HTML inserted at the top of every sheet (after `.sheet-grip`); a button with `data-act="close"` closes it. When a sheet is redrawn while already open (picking a sound or a theme), `#sheet[data-again="true"]` is set and `decor.sheet` gets `ctx.again`, so entrance animations can be skipped. Opening a different sheet while one is open (menu → Tema) runs the
theme's exit (`body.sheet-closing` + `body.sheet-swap`, backdrop kept), waits `--sheet-swap` (default 340 ms,
set it on `:root`) and then opens the next one with its entrance. Every sheet is
split by app.js into `.sheet > .sheet-head` (`.sheet-grip`, the `decor.sheet` chrome, the `h3`, plus the
`.muted`/`.scheme` right after it) and `.sheet > .sheet-body` (the rest). The head stays fixed and only the body
scrolls (`.sheet` is a flex column with `overflow: hidden`; base.css). So target rows as `.sheet-body > …`, not
`.sheet > …`. The theme named "Cristal" in the picker keeps the id `original`. While open, `body.sheet-open`; for
400 ms after closing, `body.sheet-closing` (the sheet stays visible that long, so an exit animation fits).
Sheet content uses: `h3`, `.muted`, `.row` (button or label, with `.ico` + `<span><b/><small/></span>` and
maybe a `.switch`), `.row.static`, `.scheme` (three `.opt` buttons: Sistema/Claro/Oscuro), `.opts/.opt`
(timer), `.themes/.theme-opt` (picker), `.pick-group > h4 + .picks > .sound-opt` (all sounds),
`.save-form` with `input` + `.btn`, `.credits`, `.steps`. `?sheet=pick` opens the all-sounds sheet.

`<html data-menus="new|classic">`: each theme's own menus live under `:root[data-menus="new"]`, which is now
the default (`state.menus` is always `'new'`). `?menus=clasico` shows the old generic sheets, to compare.

## Personal (added later)

The custom scene now has two add boxes inside `.layers`: `<button class="layer add pick" data-act="pick">`
("Elegir sonidos", opens the all-sounds sheet) and the `label.layer.add` import box; `--n` counts both. Its
layers can be sounds picked from other scenes (name like "Gaviotas · Océano", real icon).

New dev params: `&scheme=light|dark`, `&menus=clasico`. `ctx.stopped` is true on the render right after
playback paused.

## Zen mode (added later)

`<html data-zen="on">` while the player is in zen mode (top-bar `#zenBtn`, the menu row or the Z key; Esc, Z
or `.zen-x` leave it). The app fades out (`.app` opacity 0) and `#zen` covers the screen over the theme's backdrop:
`.zen-x`, `.zen-center` > `.zen-art` (visual) + `button.zen-play`, `.zen-title`, `.zen-sub`,
`.zen-timer[data-timer-text]`, `.zen-hint`; `.zen.idle` after a few seconds without input. Base styles use the
tokens; `--zen-veil` sets the veil over the backdrop. `decor.zen(ctx)` replaces the default breathing circles
in `.zen-art`. Dev: `?zen` opens it on load.
