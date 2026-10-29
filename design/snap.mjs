// Screenshots app URLs at phone, tablet and desktop size with headless Chrome (DevTools protocol, so
// phone widths are real). Picks a free port, so several runs can go at once.
// usage: node design/snap.mjs <out-dir> <name>=<url> [<name>=<url> ...]
//   SIZES=movil,tablet,escritorio (default all)   WAIT=ms extra wait before the shot (default 700)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ALL = { movil: [390, 844, true], tablet: [820, 1180, true], escritorio: [1440, 900, false] };
const sizes = (process.env.SIZES || Object.keys(ALL).join(',')).split(',').filter(s => ALL[s]);
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
    await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile });
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
    const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
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
