// Checks that a language file has exactly the shape of en.mjs (same keys, same array lengths, no empty
// strings, the {name} placeholders and the ==highlight== marks kept). usage: node design/landing/check.mjs <lang> [<lang> ...]
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const load = async l => (await import(pathToFileURL(join(here, 'i18n', `${l}.mjs`)).href)).default;
const en = await load('en');
let bad = 0;

function walk(a, b, path) {
  if (typeof a === 'string') {
    if (typeof b !== 'string' || !b.trim()) return fail(path, 'missing or empty text');
    for (const ph of a.match(/\{\w+\}/g) || []) if (!b.includes(ph)) fail(path, `lost placeholder ${ph}`);
    const hl = x => (x.match(/==/g) || []).length;
    if (hl(a) !== hl(b)) fail(path, `has ${hl(b) / 2} ==highlights==, en has ${hl(a) / 2}`);
    return;
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return fail(path, 'should be a list');
    // the last FAQ item (app language) may be dropped by the Spanish page only
    if (a.length !== b.length && !(path === 'faq.items' && b.length === a.length - 1)) fail(path, `has ${b.length} items, en has ${a.length}`);
    b.forEach((x, i) => a[i] !== undefined && walk(a[i], x, `${path}[${i}]`));
    return;
  }
  if (a && typeof a === 'object') {
    if (!b || typeof b !== 'object') return fail(path, 'should be an object');
    for (const k of Object.keys(a)) walk(a[k], b[k], path ? `${path}.${k}` : k);
    for (const k of Object.keys(b)) if (!(k in a)) fail(path ? `${path}.${k}` : k, 'unknown key');
  }
}
function fail(path, msg) { bad++; console.log(`  ${path}: ${msg}`); }

for (const l of process.argv.slice(2)) {
  console.log(l);
  const t = await load(l);
  walk(en, t, '');
  if (t.lang !== l) fail('lang', `is "${t.lang}"`);
  if (t.description.length > 170) fail('description', `${t.description.length} chars (keep ≤ 160)`);
  if (t.title.length > 75) fail('title', `${t.title.length} chars (keep ≤ 70)`);
}
console.log(bad ? `${bad} problem(s)` : 'ok');
process.exit(bad ? 1 : 0);
