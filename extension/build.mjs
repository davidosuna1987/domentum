// Builds the Chrome extension from the web player: dist/extension/ (load it unpacked) and dist/domentum-chrome.zip
// (for the Chrome Web Store or to share). The player is the same app/ code; extension/ adds the manifest, the
// background, the offscreen document where the sound plays and the remote engine.
// usage: node extension/build.mjs
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const app = join(root, 'app');
const out = join(root, 'dist', 'extension');
const zip = join(root, 'dist', 'domentum-chrome.zip');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// the player, minus what only the website uses (its service worker and web manifest)
cpSync(app, out, { recursive: true, filter: src => !/[/\\](sw\.js|manifest\.webmanifest|index\.html)$/.test(src) });
cpSync(join(here, 'js'), join(out, 'js'), { recursive: true });
for (const f of ['manifest.json', 'background.js', 'offscreen.html']) cpSync(join(here, f), join(out, f));

// Extension pages may not run inline scripts: the page's boot script moves to js/boot.js
let html = readFileSync(join(app, 'index.html'), 'utf8');
const inline = /<script>([\s\S]*?)<\/script>/.exec(html);
if (!inline) throw new Error('no inline boot script found in app/index.html');
writeFileSync(join(out, 'js', 'boot.js'), inline[1].trim() + '\n');
html = html
  .replace(inline[0], '<script src="js/boot.js"></script>')
  .replace(/\s*<link rel="manifest"[^>]*>/, '')
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '');
// a new tab shows the full player; the toolbar popup is the same player at phone size
writeFileSync(join(out, 'newtab.html'), html.replace('<title>Domentum</title>', '<title>Domentum · Nueva pestaña</title>'));
writeFileSync(join(out, 'popup.html'), html.replace('<html lang="es">', '<html lang="es" class="popup">'));

// toolbar and store icons from the mark
execFileSync('python3', ['-c', `
from PIL import Image
src = Image.open('${join(app, 'icons', 'icon-512.png')}').convert('RGBA')
for n in (16, 32, 48, 128):
    src.resize((n, n), Image.LANCZOS).save('${join(out, 'icons')}/ext-%d.png' % n, optimize=True)
`]);

// sanity: everything the manifest points at exists
const manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'));
const refs = [...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon), manifest.action.default_popup,
  manifest.chrome_url_overrides.newtab, manifest.background.service_worker, 'offscreen.html', 'js/offscreen.js', 'js/ext.js', 'js/boot.js'];
for (const r of refs) if (!existsSync(join(out, r))) throw new Error(`missing ${r}`);

rmSync(zip, { force: true });
execFileSync('zip', ['-qr9', zip, '.', '-x', '.DS_Store'], { cwd: out });
const mb = n => (n / 1048576).toFixed(1) + ' MB';
const size = Number(execFileSync('du', ['-sk', out]).toString().split('\t')[0]) * 1024;
console.log(`dist/extension (${mb(size)}) · dist/domentum-chrome.zip (${mb(readFileSync(zip).length)}) · v${manifest.version}`);
