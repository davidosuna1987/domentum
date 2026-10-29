// Builds the landing page in every language, plus sitemap.xml, robots.txt and llms.txt.
// English is the site root; the others live in /<lang>/. Texts: design/landing/i18n/<lang>.mjs.
// Soundscapes, layers, icons and styles come from the app itself (app/js), so the page never drifts from it.
// usage: node design/landing/build.mjs
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const imp = p => import(pathToFileURL(join(root, p)).href);
const { SCENES } = await imp('app/js/catalog.js');
const { icon } = await imp('app/js/icons.js');
const { THEMES } = await imp('app/js/themes/index.js');

// Change this if the site moves to its own domain
const BASE = 'https://davidosuna1987.github.io/domentum/';
const ORDER = ['en', 'es', 'ca', 'fr', 'it', 'pt', 'de'];
const REPO = 'https://github.com/davidosuna1987/domentum';
const TODAY = new Date().toISOString().slice(0, 10);

const LANGS = [];
for (const l of ORDER) {
  const f = join(here, 'i18n', `${l}.mjs`);
  if (existsSync(f)) LANGS.push((await import(pathToFileURL(f).href)).default);
}
const pathOf = l => (l === 'en' ? '' : `${l}/`);
const urlOf = l => BASE + pathOf(l);

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// ==phrase== in the texts is a brush-stroke highlight on the page, and plain text everywhere else
const plain = s => String(s).replace(/==/g, '');
const rich = s => esc(s).replace(/==(.+?)==/g, '<mark class="hl">$1</mark>');
const DARK = { en: 'Dark mode', es: 'Modo oscuro', ca: 'Mode fosc', fr: 'Mode sombre', it: 'Modalità scura', pt: 'Modo escuro', de: 'Dunkler Modus' };
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

// The brush ensō, the same stroke as the play button of the Tinta zen style
function brush(cx, cy, r) {
  const N = 200, a0 = -100 * Math.PI / 180, sweep = 318 * Math.PI / 180, outer = [], inner = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = a0 + sweep * t;
    const w = (1.5 + 22 * Math.pow(1 - t, 0.75)) * Math.min(1, t * 14 + 0.25);
    const rr = r + 2.6 * Math.sin(a * 3 + 0.7) + 1.2 * Math.sin(a * 7 + 2);
    outer.push([cx + (rr + w / 2) * Math.cos(a), cy + (rr + w / 2) * Math.sin(a)]);
    inner.push([cx + (rr - w / 2) * Math.cos(a), cy + (rr - w / 2) * Math.sin(a)]);
  }
  return 'M' + outer.concat(inner.reverse()).map(p => p.map(n => n.toFixed(1)).join(' ')).join('L') + 'Z';
}
const STROKE = brush(100, 100, 86);
const GUIDE = (() => {
  const a0 = -100 * Math.PI / 180, a1 = a0 + 318 * Math.PI / 180, r = 86;
  return `M${(100 + r * Math.cos(a0)).toFixed(1)} ${(100 + r * Math.sin(a0)).toFixed(1)}A86 86 0 1 1 ${(100 + r * Math.cos(a1)).toFixed(1)} ${(100 + r * Math.sin(a1)).toFixed(1)}`;
})();

// Brush strokes, deterministic so rebuilds don't change them
function rng(seed) { let x = seed; return () => (x = (x * 16807) % 2147483647) / 2147483647; }
const pts = a => a.map(p => p.map(n => n.toFixed(1)).join(' ')).join('L');
// A wide highlighter swipe of ink wash: ragged top and bottom, a slanted start, a frayed end, dry streaks
function highlight(color) {
  const R = rng(11), W = 300, top = [], bot = [];
  for (let x = 4; x <= W - 4; x += 5) {
    top.push([x, 5.5 + R() * 2.6 + Math.sin(x / 37) * 0.9]);
    bot.push([x, 25 - R() * 2.6 + Math.sin(x / 29 + 1) * 0.9]);
  }
  const end = [[W, 8 + R() * 2], [W - 3, 12], [W + 1, 15], [W - 4, 19], [W, 23]];
  const main = 'M' + pts([[0, 10], ...top, ...end, ...bot.reverse(), [2, 23], [6, 16]]) + 'Z';
  const streaks = [11, 15.5, 20].map(y => {
    const a = 20 + R() * 90, b = a + 90 + R() * 150, w = 0.5 + R() * 0.7;
    return 'M' + pts([[a, y], [b, y + R() - 0.5], [b - 4, y + w], [a + 6, y + w]]) + 'Z';
  }).join('');
  const core = 'M' + pts([[8, 11], [W - 14, 10], [W - 10, 20], [10, 21]]) + 'Z';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 30" preserveAspectRatio="none"><path fill="${color}" fill-opacity=".36" fill-rule="evenodd" d="${main}${streaks}"/><path fill="${color}" fill-opacity=".14" d="${core}"/></svg>\n`;
}
// A brush stroke built like the ensō: the brush lands round and full, the pressure wavers along the body, the
// tail thins and splits into dry bristles, and an ink filter roughens the edges. Vermilion wash, denser at the core.
function pincelada(color) {
  const R = rng(23), W = 400, N = 160, Hm = 15, top = [], bot = [], core = [[], []];
  const at = t => {
    const x = 6 + t * (W - 12);
    const y = 20 + 1.6 * Math.sin(t * Math.PI * 1.3 + 0.4) - 1.4 * t;
    const land = 0.62 + 0.38 * Math.min(1, t / 0.05);
    const tail = t > 0.8 ? Math.pow(1 - (t - 0.8) / 0.2, 0.75) * 0.82 + 0.18 : 1;
    const hw = Hm * land * tail * (1 - 0.14 * t + 0.05 * Math.sin(t * 11));
    return [x, y, hw];
  };
  for (let i = 0; i <= N; i++) {
    const t = i / N, [x, y, hw] = at(t);
    top.push([x, y - hw * (1 + (R() - 0.5) * 0.08)]);
    bot.push([x, y + hw * (1 + (R() - 0.5) * 0.08)]);
    if (t < 0.72) { core[0].push([x, y - hw * 0.5]); core[1].push([x, y + hw * 0.55]); }
  }
  // the round start where the brush touches the paper
  const [x0, y0, h0] = at(0), cap = [];
  for (let k = 1; k < 12; k++) { const a = Math.PI / 2 + (k / 12) * Math.PI; cap.push([x0 + Math.cos(a) * h0 * 0.8, y0 - Math.sin(a) * h0]); }
  const outline = 'M' + pts([...top, ...bot.reverse(), ...cap]) + 'Z';
  // dry-brush gaps opening up along the tail
  const gaps = [-0.5, -0.08, 0.32, 0.62].map(f => {
    const t0 = 0.55 + R() * 0.2, seg = [];
    for (let i = 0; i <= 24; i++) { const t = t0 + (0.985 - t0) * (i / 24), [x, y, hw] = at(t); seg.push([x, y + f * hw]); }
    const back = seg.map(([x, y], i) => [x, y + (0.4 + 1.3 * (i / 24)) * (0.7 + R() * 0.5)]).reverse();
    return 'M' + pts([...seg, ...back]) + 'Z';
  }).join('');
  const coreD = 'M' + pts([...core[0], ...core[1].reverse()]) + 'Z';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 40" preserveAspectRatio="none"><defs><filter id="i" x="-4%" y="-20%" width="108%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".018 .55" numOctaves="2" seed="9" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.2"/></filter></defs><g filter="url(#i)" fill="${color}"><path fill-opacity=".58" fill-rule="evenodd" d="${outline}${gaps}"/><path fill-opacity=".18" d="${coreD}"/></g></svg>\n`;
}

// A short tapered dab of ink, used as a mask (its colour comes from CSS)
function dash() {
  const R = rng(5), up = [], dn = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, x = 1 + t * 58, y = 5 + Math.sin(t * 3) * 0.6;
    const w = (1.2 + 3.6 * Math.pow(1 - t, 0.55)) * Math.min(1, t * 9 + 0.4) + R() * 0.25;
    up.push([x, y - w / 2]); dn.push([x, y + w / 2]);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 10" preserveAspectRatio="none"><path d="M${pts(up.concat(dn.reverse()))}Z"/></svg>\n`;
}

function sceneLayers(s, t) {
  const names = t.scenes.items[s.id].layers;
  if (s.variants) return s.variants.map((v, i) => ({ name: names[i] ?? v.name, icon: v.icon, glyph: v.glyph }));
  return s.layers.map((l, i) => ({ name: names[i] ?? l.name, icon: l.icon }));
}

function jsonLd(t, url) {
  const og = `${BASE}assets/og/${t.lang}.png`;
  const scenes = SCENES.map((s, i) => {
    const it = t.scenes.items[s.id];
    const layers = sceneLayers(s, t).map(l => l.name);
    return { '@type': 'ListItem', position: i + 1, name: it.name, description: it.desc + (layers.length ? ` (${layers.join(', ')})` : ''), url: `${BASE}app/?paisaje=${s.id}` };
  });
  const graph = [
    { '@type': 'WebSite', '@id': `${BASE}#website`, url: BASE, name: 'Domentum', inLanguage: LANGS.map(l => l.lang), publisher: { '@id': `${BASE}#app` } },
    {
      '@type': 'WebPage', '@id': `${url}#webpage`, url, name: t.title, description: t.description, inLanguage: t.lang,
      isPartOf: { '@id': `${BASE}#website` }, about: { '@id': `${BASE}#app` },
      primaryImageOfPage: { '@type': 'ImageObject', url: og, width: 1200, height: 630 }, dateModified: TODAY,
    },
    {
      '@type': 'WebApplication', '@id': `${BASE}#app`, name: 'Domentum', url: `${BASE}app/`, installUrl: `${BASE}app/`,
      description: plain(t.about.p.join(' ')), applicationCategory: 'LifestyleApplication', applicationSubCategory: t.ogTagline,
      operatingSystem: 'Web browser, iOS, iPadOS, Android, Windows, macOS, Linux', browserRequirements: 'Requires JavaScript and the Web Audio API',
      isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }, inLanguage: 'es',
      featureList: t.features.items.map(f => `${f.h}: ${f.p}`), image: `${BASE}app/icons/icon-512.png`,
      screenshot: THEMES.slice(0, 4).map(th => `${BASE}app/icons/themes/${th.id}-light.jpg`),
      sameAs: [REPO],
    },
    { '@type': 'ItemList', '@id': `${url}#soundscapes`, name: t.scenes.h2, numberOfItems: scenes.length, itemListElement: scenes },
    { '@type': 'FAQPage', '@id': `${url}#faq`, inLanguage: t.lang, mainEntity: t.faq.items.map(q => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })) },
  ];
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 1).replace(/</g, '\\u003c');
}

function page(t) {
  const r = t.lang === 'en' ? '' : '../';
  const url = urlOf(t.lang);
  const app = `${r}app/`;
  const og = `${BASE}assets/og/${t.lang}.png`;
  const sections = [
    ['what', t.about.h2], ['soundscapes', t.nav.scenes], ['noise', t.noise.h2], ['how', t.nav.how],
    ['uses', t.uses.h2], ['styles', t.nav.styles], ['install', t.install.h2], ['faq', t.nav.faq],
  ];
  const num = id => NUMS[sections.findIndex(s => s[0] === id)];
  const label = (id, text) => `<p class="label" aria-hidden="true"><span class="num">${num(id)}</span><span>${esc(text)}</span></p>`;
  const langLinks = (cls = '') => LANGS.map(l => `<li><a${cls} href="${r}${pathOf(l.lang)}" hreflang="${l.lang}" lang="${l.lang}"${l.lang === t.lang ? ' aria-current="page"' : ''}>${esc(l.name)}</a></li>`).join('');
  const banner = Object.fromEntries(LANGS.map(l => [l.lang, { url: r + pathOf(l.lang), ...l.banner }]));

  return `<!doctype html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.description)}">
<link rel="canonical" href="${url}">
${LANGS.map(l => `<link rel="alternate" hreflang="${l.lang}" href="${urlOf(l.lang)}">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${BASE}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="#f4f0e6">
<script>/* light unless the visitor picked dark here; then animate the brush strokes in */ (() => { const d = document.documentElement; d.classList.add('js'); if (/[?&]trazo=viejo/.test(location.search)) d.dataset.trazo = 'viejo'; try { if (localStorage.getItem('domentum:landing-scheme') === 'dark') { d.dataset.scheme = 'dark'; document.querySelector('meta[name=theme-color]').content = '#151412'; } } catch {} })();</script>
<link rel="icon" href="${r}app/icons/icon.svg" type="image/svg+xml">
<link rel="icon" href="${r}app/icons/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="${r}app/icons/apple-touch-icon.png">
<link rel="manifest" href="${r}app/manifest.webmanifest">
<link rel="alternate" type="text/markdown" href="${BASE}llms.txt" title="llms.txt">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Domentum">
<meta property="og:title" content="${esc(t.title)}">
<meta property="og:description" content="${esc(t.description)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${t.locale}">
${LANGS.filter(l => l.lang !== t.lang).map(l => `<meta property="og:locale:alternate" content="${l.locale}">`).join('\n')}
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(t.ogAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(t.title)}">
<meta name="twitter:description" content="${esc(t.description)}">
<meta name="twitter:image" content="${og}">
<meta name="twitter:image:alt" content="${esc(t.ogAlt)}">
<link rel="stylesheet" href="${r}app/fonts/shippori-mincho.css">
<link rel="stylesheet" href="${r}assets/landing.css">
<script>/* opened as the installed app: go straight to the player */ if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) location.replace('${app}');</script>
<script type="application/ld+json">
${jsonLd(t, url)}
</script>
</head>
<body>
<a class="skip" href="#main">${esc(t.skip)}</a>
<header class="top">
  <div class="wrap">
    <a class="brand" href="${r}${pathOf(t.lang)}"><img src="${r}app/icons/mark.svg" alt="" width="30" height="30"><span>domentum</span></a>
    <nav class="nav" aria-label="Domentum">
      <a href="#soundscapes">${esc(t.nav.scenes)}</a><a href="#how">${esc(t.nav.how)}</a><a href="#styles">${esc(t.nav.styles)}</a><a href="#faq">${esc(t.nav.faq)}</a>
    </nav>
    <div class="top-end">
      <button class="scheme-btn" type="button" aria-pressed="false" aria-label="${esc(DARK[t.lang] || DARK.en)}">${icon('moon')}${icon('sun')}</button>
      <details class="langs">
        <summary aria-label="${esc(t.nav.languages)}">${icon('globe')}<span>${t.lang.toUpperCase()}</span></summary>
        <ul>${langLinks()}</ul>
      </details>
      <a class="btn small" href="${app}">${esc(t.nav.open)}</a>
    </div>
  </div>
</header>

<main id="main">
  <section class="hero">
    <div class="wrap">
      <div class="hero-text">
        <h1>${rich(t.hero.h1)}</h1>
        <p class="lede">${rich(t.hero.lede)}</p>
        <p class="ctas"><a class="btn" href="${app}">${esc(t.hero.cta)}</a><a class="link" href="#install">${esc(t.hero.install)}</a></p>
        <ul class="facts">${t.hero.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      </div>
      <a class="enso" href="${app}" aria-label="${esc(t.hero.play)}">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <filter id="ink" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".05 .8" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.6"/></filter>
            <mask id="reveal"><path class="brush" d="${GUIDE}" stroke="#fff" stroke-width="60" fill="none" pathLength="1" stroke-dasharray="1" stroke-dashoffset="0"/></mask>
          </defs>
          <g class="breath"><path class="base" d="${STROKE}" filter="url(#ink)"/><g mask="url(#reveal)"><path class="ink" d="${STROKE}" filter="url(#ink)"/></g></g>
          <g class="tri"><path transform="translate(92.4 92.1) scale(.66)" d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5Z"/></g>
        </svg>
      </a>
    </div>
    <svg class="arrow draw" viewBox="0 0 40 120" aria-hidden="true"><path d="M21 4c-7 20 9 34 2 58-4 14-6 26-4 46" pathLength="1"/><path d="M10 92c4 6 7 12 9 17 3-6 7-11 12-15" pathLength="1"/></svg>
  </section>

  <section class="sec about" id="what">
    <div class="wrap">
      ${label('what', t.about.h2)}
      <div class="body">
        <h2>${esc(t.about.h2)}</h2>
        ${t.about.p.map(p => `<p class="big reveal">${rich(p)}</p>`).join('\n        ')}
      </div>
    </div>
  </section>

  <section class="sec" id="soundscapes">
    <div class="wrap">
      ${label('soundscapes', t.nav.scenes)}
      <div class="body">
        <h2>${esc(t.scenes.h2)}</h2>
        <p class="intro">${rich(t.scenes.intro)}</p>
        <ul class="scenes">
${SCENES.map(s => {
    const it = t.scenes.items[s.id];
    const layers = sceneLayers(s, t);
    return `          <li class="scene reveal">
            <h3>${icon(s.icon)}<span>${esc(it.name)}</span></h3>
            <p>${esc(it.desc)}</p>
            ${layers.length ? `<ul class="layers">${layers.map(l => `<li>${l.glyph ? `<span class="glyph" aria-hidden="true">${l.glyph}</span>` : icon(l.icon)}${esc(l.name)}</li>`).join('')}</ul>` : ''}
            <a class="listen" href="${app}?paisaje=${s.id}">${esc(fill(t.scenes.listen, { name: it.name }))} <span aria-hidden="true">→</span></a>
          </li>`;
  }).join('\n')}
        </ul>
      </div>
    </div>
  </section>

  <section class="sec" id="noise">
    <div class="wrap">
      ${label('noise', t.scenes.items.noise.name)}
      <div class="body">
        <h2>${esc(t.noise.h2)}</h2>
        <p class="intro">${rich(t.noise.intro)}</p>
        <dl class="noises">
${t.noise.items.map(n => `          <div class="reveal"><dt>${esc(n.name)}</dt><dd>${esc(n.desc)}</dd></div>`).join('\n')}
        </dl>
        <div class="binaural">
          <h3>${esc(t.noise.binaural.h3)}</h3>
          <p>${rich(t.noise.binaural.p)}</p>
          <ul class="bands">
${t.noise.binaural.bands.map((b, i) => `            <li class="reveal"><span class="glyph" aria-hidden="true">${SCENES.find(s => s.id === 'binaural').variants[i].glyph || '♪'}</span><b>${esc(b.name)}</b><span class="hz">${esc(b.hz)}</span><span class="desc">${esc(b.desc)}</span></li>`).join('\n')}
          </ul>
          <p class="note">${esc(t.noise.binaural.note)}</p>
        </div>
      </div>
    </div>
  </section>

  <section class="sec" id="how">
    <div class="wrap">
      ${label('how', t.nav.how)}
      <div class="body">
        <h2>${esc(t.features.h2)}</h2>
        <ul class="features">
${t.features.items.map(f => `          <li class="reveal draw"><h3>${esc(f.h)}</h3><p>${esc(f.p)}</p></li>`).join('\n')}
        </ul>
      </div>
    </div>
  </section>

  <section class="sec" id="uses">
    <div class="wrap">
      ${label('uses', t.uses.h2)}
      <div class="body">
        <h2>${esc(t.uses.h2)}</h2>
        <ul class="uses">
${t.uses.items.map(u => `          <li class="reveal draw"><h3>${esc(u.h)}</h3><p>${esc(u.p)}</p></li>`).join('\n')}
        </ul>
      </div>
    </div>
  </section>

  <section class="sec" id="styles">
    <div class="wrap">
      ${label('styles', t.nav.styles)}
      <div class="body">
        <h2>${esc(t.styles.h2)}</h2>
        <p class="intro">${rich(t.styles.intro)}</p>
        <ul class="styles">
${THEMES.map(th => {
    const it = t.styles.items[th.id];
    return `          <li class="reveal"><a href="${app}?theme=${th.id}" aria-label="${esc(fill(t.styles.open, { name: it.name }))}">
            <span class="shot"><img class="on-light" src="${r}app/icons/themes/${th.id}-light.jpg" alt="${esc(`${it.name}: ${it.desc}`)}" width="240" height="300" loading="lazy" decoding="async"><img class="on-dark" src="${r}app/icons/themes/${th.id}-dark.jpg" alt="" width="240" height="300" loading="lazy" decoding="async"></span>
            <span class="name">${esc(it.name)}</span><span class="desc">${esc(it.desc)}</span>
          </a></li>`;
  }).join('\n')}
        </ul>
      </div>
    </div>
  </section>

  <section class="sec" id="install">
    <div class="wrap">
      ${label('install', t.install.h2)}
      <div class="body">
        <h2>${esc(t.install.h2)}</h2>
        <p class="intro">${rich(t.install.intro)}</p>
        <div class="platforms">
${t.install.items.map(p => `          <div class="reveal"><h3>${esc(p.h)}</h3><ol>${p.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>`).join('\n')}
        </div>
        <p class="note">${esc(t.install.offline)}</p>
        <p class="ctas"><a class="btn" href="${app}">${esc(t.hero.cta)}</a></p>
      </div>
    </div>
  </section>

  <section class="sec" id="faq">
    <div class="wrap">
      ${label('faq', t.nav.faq)}
      <div class="body">
        <h2>${esc(t.faq.h2)}</h2>
        <div class="faq">
${t.faq.items.map(q => `          <details class="reveal"><summary><h3>${esc(q.q)}</h3></summary><p>${esc(q.a)}</p></details>`).join('\n')}
        </div>
      </div>
    </div>
  </section>
</main>

<footer class="foot">
  <div class="wrap">
    <div class="foot-brand">
      <a class="brand" href="${r}${pathOf(t.lang)}"><img src="${r}app/icons/mark.svg" alt="" width="30" height="30"><span>domentum</span></a>
      <p>${esc(t.footer.tagline)}</p>
    </div>
    <ul class="foot-links">
      <li><a href="${app}">${esc(t.footer.open)}</a></li>
      <li><a href="${REPO}" rel="noopener">${esc(t.footer.code)}</a></li>
      <li><a href="${r}llms.txt">llms.txt</a></li>
    </ul>
    <nav class="foot-langs" aria-label="${esc(t.nav.languages)}"><ul>${langLinks()}</ul></nav>
    <p class="credits">${esc(t.footer.credits)}</p>
  </div>
</footer>

<div class="lang-banner" role="region" aria-label="${esc(t.nav.languages)}" hidden><p></p><a href="#"></a><button type="button">${icon('x')}</button></div>
<script>
// A visitor whose browser asks for another language we have gets a quiet link to it. No automatic
// redirect: every language stays reachable for people and crawlers alike.
(() => {
  const langs = ${JSON.stringify(banner)};
  const here = document.documentElement.lang;
  const remember = l => { try { localStorage.setItem('domentum:lang', l); } catch {} };
  document.querySelectorAll('a[hreflang]').forEach(a => a.addEventListener('click', () => remember(a.hreflang)));
  let chosen = null;
  try { chosen = localStorage.getItem('domentum:lang'); } catch {}
  if (chosen) return;
  const want = (navigator.languages || [navigator.language]).map(l => String(l || '').slice(0, 2).toLowerCase()).find(l => langs[l]);
  if (!want || want === here) return;
  const b = document.querySelector('.lang-banner'), t = langs[want], a = b.querySelector('a'), x = b.querySelector('button');
  b.lang = want;
  b.querySelector('p').textContent = t.text;
  a.href = t.url; a.hreflang = want; a.textContent = t.link;
  a.addEventListener('click', () => remember(want));
  x.setAttribute('aria-label', t.close);
  x.addEventListener('click', () => { b.hidden = true; remember(here); });
  b.hidden = false;
})();
(() => {
  const d = document.documentElement, btn = document.querySelector('.scheme-btn');
  const paint = () => { const dark = d.dataset.scheme === 'dark'; btn.setAttribute('aria-pressed', dark); document.querySelector('meta[name=theme-color]').content = dark ? '#151412' : '#f4f0e6'; };
  paint();
  btn.addEventListener('click', () => {
    if (d.dataset.scheme === 'dark') delete d.dataset.scheme; else d.dataset.scheme = 'dark';
    try { localStorage.setItem('domentum:landing-scheme', d.dataset.scheme || 'light'); } catch {}
    paint();
  });
  // Brush highlights: one stroke per line of each ==phrase==, painted in one line after the other
  const layer = document.createElement('div');
  layer.className = 'strokes';
  layer.setAttribute('aria-hidden', 'true');
  document.body.append(layer);
  const drawn = new Map(); // mark → its strokes
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const place = (mark, animate) => {
    (drawn.get(mark) || []).forEach(s => s.remove());
    let wait = animate ? (mark.closest('.hero') ? (mark.closest('h1') ? 1100 : 1700) : 120) : 0;
    const strokes = [...mark.getClientRects()].filter(r => r.width > 2).map(r => {
      const s = document.createElement('i');
      s.className = 'stroke';
      Object.assign(s.style, { left: r.left + scrollX + 'px', top: r.top + scrollY + 'px', width: r.width + 'px', height: r.height + 'px' });
      const ms = Math.min(1100, 260 + r.width * 1.1);
      s.style.transitionDuration = animate ? ms + 'ms' : '0s';
      s.style.transitionDelay = wait + 'ms';
      wait += ms * 0.85;
      layer.append(s);
      return s;
    });
    drawn.set(mark, strokes);
    if (animate) requestAnimationFrame(() => requestAnimationFrame(() => strokes.forEach(s => s.classList.add('in'))));
    else strokes.forEach(s => s.classList.add('in'));
  };
  const show = el => { if (el.classList.contains('hl')) place(el, !still); el.classList.add('in'); };
  const marks = document.querySelectorAll('.hl, .draw');
  if (!('IntersectionObserver' in window)) marks.forEach(show);
  else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px', threshold: 0.6 });
    marks.forEach(m => io.observe(m));
  }
  // lines move when the page reflows: move each stroke to where its words are now, without restarting it
  // (only if the phrase now wraps into a different number of lines is it redrawn, already painted)
  let t, first = true;
  const follow = () => drawn.forEach((strokes, m) => {
    const rects = [...m.getClientRects()].filter(r => r.width > 2);
    if (rects.length !== strokes.length) return place(m, false);
    rects.forEach((r, i) => Object.assign(strokes[i].style, { left: r.left + scrollX + 'px', top: r.top + scrollY + 'px', width: r.width + 'px', height: r.height + 'px' }));
  });
  const reflow = () => { clearTimeout(t); t = setTimeout(follow, 120); };
  addEventListener('resize', reflow);
  document.fonts?.ready.then(reflow);
  new ResizeObserver(() => { if (first) first = false; else reflow(); }).observe(document.body);
})();
</script>
</body>
</html>
`;
}

function llms() {
  const t = LANGS[0];
  const lines = [
    '# Domentum', '',
    `> ${t.description}`, '',
    plain(t.about.p.join('\n\n')), '',
    `The player's interface is in Spanish; this site is available in ${LANGS.map(l => l.name).join(', ')}.`, '',
    '## Key facts', '',
    ...t.hero.facts.map(f => `- ${f}`),
    '- 14 soundscapes, 34 recorded layers plus noise and binaural beats synthesized live',
    '- Installable web app (PWA): iPhone, iPad, Android, Windows, macOS, Linux',
    '- Field recordings from Freesound, public domain (CC0)', '',
    '## Pages', '',
    ...LANGS.map(l => `- [${l.name}](${urlOf(l.lang)}): ${l.title}`),
    `- [Player](${BASE}app/): the app itself`, '',
    '## Soundscapes', '',
    'Each one opens directly with `?paisaje=<id>` on the player URL.', '',
    ...SCENES.map(s => {
      const it = t.scenes.items[s.id];
      const layers = sceneLayers(s, t).map(l => l.name);
      return `- [${it.name}](${BASE}app/?paisaje=${s.id}): ${it.desc}${layers.length ? ` Layers: ${layers.join(', ')}.` : ''}`;
    }), '',
    `## ${t.noise.h2}`, '',
    ...t.noise.items.map(n => `- ${n.name}: ${n.desc}`),
    `- ${t.noise.binaural.h3}: ${plain(t.noise.binaural.p)} ${t.noise.binaural.bands.map(b => `${b.name} ${b.hz} (${b.desc})`).join('; ')}.`, '',
    `## ${t.features.h2}`, '',
    ...t.features.items.map(f => `- ${f.h}: ${f.p}`), '',
    `## ${t.styles.h2}`, '',
    plain(t.styles.intro), '',
    ...THEMES.map(th => `- [${t.styles.items[th.id].name}](${BASE}app/?theme=${th.id}): ${t.styles.items[th.id].desc}`), '',
    `## ${t.faq.h2}`, '',
    ...t.faq.items.flatMap(q => [`### ${q.q}`, '', q.a, '']),
    '## Optional', '',
    `- [Source code](${REPO})`,
    `- [Sound credits](${BASE}app/sounds/credits.json)`, '',
  ];
  return lines.join('\n');
}

function sitemap() {
  const alts = LANGS.map(l => `    <xhtml:link rel="alternate" hreflang="${l.lang}" href="${urlOf(l.lang)}"/>`).join('\n') + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}"/>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.map(l => `  <url>\n    <loc>${urlOf(l.lang)}</loc>\n    <lastmod>${TODAY}</lastmod>\n${alts}\n  </url>`).join('\n')}
  <url>
    <loc>${BASE}app/</loc>
    <lastmod>${TODAY}</lastmod>
  </url>
</urlset>
`;
}

const robots = `# Domentum: everything may be crawled, including by search engines and AI assistants.
User-agent: *
Allow: /

User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: CCBot
User-agent: meta-externalagent
User-agent: DuckAssistBot
Allow: /

Sitemap: ${BASE}sitemap.xml
`;

for (const t of LANGS) {
  const dst = join(root, pathOf(t.lang), 'index.html');
  mkdirSync(dirname(dst), { recursive: true });
  writeFileSync(dst, page(t));
  console.log('wrote', dst.replace(root + '/', ''));
}
mkdirSync(join(root, 'assets', 'brush'), { recursive: true });
writeFileSync(join(root, 'assets', 'brush', 'hl-light.svg'), pincelada('#c4352a'));
writeFileSync(join(root, 'assets', 'brush', 'hl-dark.svg'), pincelada('#e0503f'));
// the earlier highlighter swipe, kept for comparison with ?trazo=viejo
writeFileSync(join(root, 'assets', 'brush', 'hl-old-light.svg'), highlight('#c4352a'));
writeFileSync(join(root, 'assets', 'brush', 'hl-old-dark.svg'), highlight('#e0503f'));
writeFileSync(join(root, 'assets', 'brush', 'dash.svg'), dash());
writeFileSync(join(root, 'sitemap.xml'), sitemap());
writeFileSync(join(root, 'robots.txt'), robots);
writeFileSync(join(root, 'llms.txt'), llms());
console.log('wrote sitemap.xml, robots.txt, llms.txt ·', LANGS.map(l => l.lang).join(', '));
