// Copies the web player (../app) into www/, the folder Capacitor packs into the Android and iPhone apps.
// The website's service worker and install manifest stay out: inside an app the files are already local.
// usage: node sync.mjs   (npm run sync does this and then `cap sync`)
import { cpSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const www = join(here, 'www');
rmSync(www, { recursive: true, force: true });
cpSync(join(here, '..', 'app'), www, { recursive: true, filter: src => !/[/\\](sw\.js|manifest\.webmanifest)$/.test(src) });
console.log('www/ ← app/');
