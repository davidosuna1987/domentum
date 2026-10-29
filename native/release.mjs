// Publishes a new version of every download: builds the Chrome extension, the Android app (.apk) and the Mac app
// (.dmg) from the current app/, and attaches all three to one GitHub release. The landing links to
// releases/latest/download/<file>, so the newest release must always carry all three.
// usage: node native/release.mjs 1.1.0 ["what changed"]
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(root, 'dist');
const [version, changes = ''] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+$/.test(version || '')) { console.error('usage: node native/release.mjs <x.y.z> ["what changed"]'); process.exit(1); }
if (!existsSync(join(here, 'android', 'keystore.properties'))) {
  console.error('Missing native/android/keystore.properties (the Android signing key; see native/README.md).');
  process.exit(1);
}
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const [maj, min, pat] = version.split('.').map(Number);

// the version, everywhere
const manifestPath = join(root, 'extension', 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.version = version;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
const gradlePath = join(here, 'android', 'app', 'build.gradle');
writeFileSync(gradlePath, readFileSync(gradlePath, 'utf8')
  .replace(/versionCode \d+/, `versionCode ${maj * 10000 + min * 100 + pat}`)
  .replace(/versionName "[^"]*"/, `versionName "${version}"`));

// the builds
run('node', [join(root, 'extension', 'build.mjs')]);
run('node', ['sync.mjs'], { cwd: here });
run('npx', ['cap', 'sync'], { cwd: here });
const javaHome = execFileSync('/usr/libexec/java_home', ['-v', '21']).toString().trim();
run('./gradlew', ['assembleRelease', '--console=plain', '-q'], { cwd: join(here, 'android'), env: { ...process.env, JAVA_HOME: javaHome } });
copyFileSync(join(here, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'), join(dist, 'domentum-android.apk'));
run('node', [join(here, 'macos', 'build.mjs')], { env: { ...process.env, VERSION: version } });

// the release
const notes = `${changes ? changes + '\n\n' : ''}## Descargas

- **Android**: \`domentum-android.apk\`. Descárgalo en el móvil, ábrelo y, si Android lo pide, permite que el navegador instale apps.
- **Mac** (Apple Silicon e Intel): \`Domentum-mac.dmg\`. Ábrelo y arrastra Domentum a Aplicaciones. La primera vez, ábrela y ve a Ajustes del Sistema → Privacidad y seguridad → «Abrir igualmente».
- **Chrome, Brave, Edge**: \`domentum-chrome.zip\`. Descomprímelo, abre chrome://extensions, activa el modo de desarrollador y pulsa «Cargar descomprimida».
- **iPhone**: abre https://davidosuna1987.github.io/domentum/app/ en Safari → Compartir → Añadir a pantalla de inicio.`;
run('gh', ['release', 'create', `v${version}`, '--repo', 'davidosuna1987/domentum', '--target', 'main', '--title', `Domentum ${version}`, '--notes', notes,
  join(dist, 'domentum-android.apk'), join(dist, 'Domentum-mac.dmg'), join(dist, 'domentum-chrome.zip')]);
console.log(`Published v${version}. Commit the version bump (extension/manifest.json, native/android/app/build.gradle).`);
