// Screenshots app URLs at phone, tablet and desktop size with headless Chrome (DevTools protocol, so
// phone widths are real). Picks a free port, so several runs can go at once.
// usage: node design/snap.mjs <out-dir> <name>=<url> [<name>=<url> ...]
//   SIZES=movil,tablet,escritorio (default all)   WAIT=ms extra wait before the shot (default 700)
//   FULL=1 the whole page (at 1x)   SCHEME=dark|light emulated colour scheme   STILL=1 no animations or transitions
//   SCROLL=1 scroll through the page first (to trigger what appears on scroll)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ALL = { movil: [390, 844, true], tablet: [820, 1180, true], escritorio: [1440, 900, false] };
// besides the presets, any WIDTHxHEIGHT (e.g. 1200x630) is shot as a desktop page of that size
for (const k of (process.env.SIZES || '').split(',')) { const m = /^(\d+)x(\d+)$/.exec(k); if (m) ALL[k] = [+m[1], +m[2], false]; }
const sizes = (process.env.SIZES || 'movil,tablet,escritorio').split(',').filter(s => ALL[s]);
const wait = +(process.env.WAIT || 700);
const [out, ...specs] = process.argv.slice(2);
if (!out || !specs.length) { console.error('usage: node design/snap.mjs <out-dir> <name>=<url> ...'); process.exit(1); }
mkdirSync(out, { recursive: true });

const profile = mkdtempSync(join(tmpdir(), 'snap-'));
const chrome = spawn(CHROME, ['--headless=new', '--mute-audio', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  '--autoplay-policy=no-user-gesture-required', `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const limit = (p, ms, what) => Promise.race([p, sleep(ms).then(() => { throw new Error(`timeout: ${what}`); })]);

let port;
async function devtools(path, method = 'GET') {
  for (let i = 0; i < 80; i++) {
    if (!port) {
      const f = join(profile, 'DevToolsActivePort');
      if (existsSync(f)) port = +readFileSync(f, 'utf8').split('\n')[0];
      else { await sleep(150); continue; }
    }
    let res;
    try { res = await fetch(`http://127.0.0.1:${port}${path}`, { method }); } catch { await sleep(150); continue; }
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
  }
  throw new Error('DevTools did not start');
}

function connect(url) {
  const ws = new WebSocket(url);
  const pending = new Map(), listeners = [];
  let id = 0;
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result);
    } else listeners.forEach(f => f(m));
  };
  return {
    ready: new Promise(r => { ws.onopen = r; }),
    send: (method, params = {}) => new Promise((res, rej) => { pending.set(++id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); }),
    once: event => new Promise(r => listeners.push(m => m.method === event && r(m.params))),
    on: f => listeners.push(f),
    close: () => ws.close(),
  };
}

async function shot(name, url, dev) {
  const [width, height, mobile] = ALL[dev];
  const target = await devtools('/json/new?about:blank', 'PUT');
  const page = connect(target.webSocketDebuggerUrl);
  const errors = [];
  try {
    await limit(page.ready, 5000, 'connect');
    await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: process.env.FULL ? 1 : 2, mobile });
    if (process.env.SCHEME) await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: process.env.SCHEME }] });
    await page.send('Page.enable');
    await page.send('Runtime.enable');
    page.on(m => {
      if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
    });
    const loaded = page.once('Page.loadEventFired');
    await page.send('Page.navigate', { url });
    await limit(loaded, 20000, 'load');
    await page.send('Page.bringToFront');
    await page.send('Runtime.evaluate', { expression: `document.fonts.ready.then(() => new Promise(r => setTimeout(r, ${wait}))).then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))`, awaitPromise: true });
    if (process.env.STILL) await page.send('Runtime.evaluate', { expression: `document.head.insertAdjacentHTML('beforeend', '<style>*,*::before,*::after{animation:none!important;transition:none!important}</style>')` });
    if (process.env.STILL) await page.send('Runtime.evaluate', { expression: `(document.documentElement.classList.remove('js'), document.querySelectorAll('.draw').forEach(e => e.classList.add('in')), Promise.all([...document.images].map(i => { i.loading = 'eager'; return i.decode().catch(() => {}); })))`, awaitPromise: true });
    // SCROLL=1: go down the whole page first, so whatever appears on scroll has appeared
    if (process.env.SCROLL) await page.send('Runtime.evaluate', { expression: `(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight / 2) { scrollTo(0, y); await new Promise(r => setTimeout(r, 160)); } scrollTo(0, 0); await new Promise(r => setTimeout(r, 4500)); })()`, awaitPromise: true });
    let shotOpts = { format: 'png' };
    if (process.env.FULL) {
      const { cssContentSize: c } = await page.send('Page.getLayoutMetrics');
      shotOpts = { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: Math.min(Math.ceil(c.height), 16000), scale: 1 } };
    }
    const { data } = await page.send('Page.captureScreenshot', shotOpts);
    const dst = join(out, `${name}-${dev}.png`);
    writeFileSync(dst, Buffer.from(data, 'base64'));
    return { dst, errors };
  } finally {
    page.close();
    await devtools(`/json/close/${target.id}`).catch(() => {});
  }
}

let failed = 0;
try {
  for (const spec of specs) {
    const i = spec.indexOf('=');
    const name = spec.slice(0, i), url = spec.slice(i + 1);
    for (const dev of sizes) {
      let r;
      for (let t = 1; t <= 3 && !r; t++) {
        try { r = await limit(shot(name, url, dev), 35000, 'shot'); } catch (e) { if (t === 3) { console.log(`FAIL ${name}-${dev}: ${e.message}`); failed++; } }
      }
      if (r) console.log(`ok ${r.dst}${r.errors.length ? `  ERRORS: ${[...new Set(r.errors)].join(' | ')}` : ''}`);
    }
  }
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
