// Screenshots every mockup at phone, tablet and desktop size. Drives headless Chrome over the DevTools
// protocol so phone widths are real (a plain headless window can't go below ~500 px).
// usage: node shoot.mjs <base-url> <out-dir> [style ...]
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SIZES = { movil: [390, 844, true], tablet: [820, 1180, true], escritorio: [1440, 900, false] };
const PORT = 9333;
const [base, out, ...only] = process.argv.slice(2);
const here = dirname(fileURLToPath(import.meta.url));
const names = only.length ? only : readdirSync(here).filter(f => /^\d\d-.*\.html$/.test(f)).map(f => f.slice(0, -5)).sort();
mkdirSync(out, { recursive: true });
const profile = mkdtempSync(join(out, 'chrome-'));
const chrome = spawn(CHROME, ['--headless=new', '--mute-audio', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`, 'about:blank'], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = process.env.DEBUG ? (...a) => console.error(...a) : () => {};
const limit = (p, ms, what) => Promise.race([p, sleep(ms).then(() => { throw new Error(`timeout: ${what}`); })]);
async function devtools(path, method = 'GET') {
  for (let i = 0; i < 60; i++) {
    let res;
    try { res = await fetch(`http://127.0.0.1:${PORT}${path}`, { method }); } catch { await sleep(200); continue; }
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; } // /json/close answers in plain text
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
    close: () => ws.close(),
  };
}

async function shot(name, dev) {
  const [width, height, mobile] = SIZES[dev];
  const target = await devtools('/json/new?about:blank', 'PUT');
  const page = connect(target.webSocketDebuggerUrl);
  await limit(page.ready, 5000, 'connect');
  log(name, dev, 'connected');
  await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile });
  await page.send('Page.enable');
  const loaded = page.once('Page.loadEventFired');
  await page.send('Page.navigate', { url: `${base}${name}.html?shot` });
  await limit(loaded, 20000, 'load');
  log(name, dev, 'loaded');
  await page.send('Page.bringToFront');
  await page.send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => new Promise(r => setTimeout(r, 500))).then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))', awaitPromise: true });
  log(name, dev, 'fonts');
  const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
  const dst = join(out, `${name}-${dev}.png`);
  writeFileSync(dst, Buffer.from(data, 'base64'));
  page.close();
  await devtools(`/json/close/${target.id}`);
  return dst;
}

// Now and then a tab never answers; give each shot 30 s and try it again
async function attempt(name, dev, tries = 3) {
  for (let t = 1; ; t++) {
    try { return await limit(shot(name, dev), 30000, 'shot'); } catch (e) { if (t >= tries) throw e; log(name, dev, 'retry', e.message); }
  }
}

try {
  await devtools('/json/version');
  const jobs = names.flatMap(n => Object.keys(SIZES).map(d => [n, d]));
  // One tab at a time: background tabs don't finish painting and come out tiled or blank
  for (const [n, d] of jobs) {
    try { console.log(`ok ${await attempt(n, d)}`); } catch (e) { console.log(`FAIL ${n}-${d} ${e.message}`); }
  }
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
