// Social preview images (1200×630), one per language: assets/og/<lang>.png. Needs the dev server on 5181.
// usage: node design/landing/og.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const src = join(root, 'design', 'snaps', 'og-src');
mkdirSync(src, { recursive: true });
mkdirSync(join(root, 'assets', 'og'), { recursive: true });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const langs = readdirSync(join(here, 'i18n')).filter(f => f.endsWith('.mjs')).map(f => f.slice(0, -4));
const page = t => `<!doctype html><html lang="${t.lang}"><head><meta charset="utf-8">
<link rel="stylesheet" href="/app/fonts/shippori-mincho.css"><link rel="stylesheet" href="/assets/landing.css">
<style>
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body { display: grid; grid-template-columns: 1fr 380px; align-items: center; gap: 40px; padding: 0 90px 0 96px; }
  .brand { font-size: 17px; letter-spacing: .46em; } .brand img { width: 40px; height: 40px; }
  h1 { margin-top: 44px; font-weight: 500; font-size: 58px; line-height: 1.22; letter-spacing: .04em; text-wrap: balance; }
  .facts { margin-top: 40px; font-size: 17px; }
  .enso { order: 0; width: 380px; }
  .hl { background-size: 100% 100% !important; }
</style></head><body>
<div><span class="brand"><img src="/app/icons/mark.svg" alt=""><span>domentum</span></span>
<h1>${esc(t.hero.h1).replace(/==(.+?)==/g, '<mark class="hl">$1</mark>')}</h1>
<ul class="facts">${t.ogFacts.split('·').map(f => `<li>${esc(f.trim())}</li>`).join('')}</ul></div>
<span class="enso"><svg viewBox="0 0 200 200"><defs><filter id="ink" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".05 .8" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.6"/></filter></defs>
<path class="ink" d="__STROKE__" filter="url(#ink)"/><g class="tri"><path transform="translate(92.4 92.1) scale(.66)" d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5Z"/></g></svg></span>
</body></html>`;
// take the ensō stroke from the built English page so both are the same brush
const { readFileSync } = await import('node:fs');
const stroke = /class="ink" d="([^"]+)"/.exec(readFileSync(join(root, 'index.html'), 'utf8'))[1];
const specs = [];
for (const l of langs) {
  const t = (await import(pathToFileURL(join(here, 'i18n', `${l}.mjs`)).href)).default;
  writeFileSync(join(src, `${l}.html`), page(t).replace('__STROKE__', stroke));
  specs.push(`${l}=http://localhost:5181/design/snaps/og-src/${l}.html`);
}
execFileSync('node', [join(root, 'design', 'snap.mjs'), src, ...specs], { stdio: 'inherit', env: { ...process.env, SIZES: '1200x630', WAIT: '800', STILL: '1' } });
execFileSync('python3', ['-c', `
import sys
from PIL import Image
for l in sys.argv[1:]:
    Image.open(f'${src}/{l}-1200x630.png').convert('RGB').resize((1200, 630), Image.LANCZOS).save(f'${root}/assets/og/{l}.png', optimize=True)
    print('assets/og/%s.png' % l)
`, ...langs], { stdio: 'inherit' });
