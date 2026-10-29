// Builds Domentum for Mac: dist/Domentum.app and dist/Domentum-mac.dmg (Apple Silicon and Intel).
// The player is the same app/ folder as the website, copied into the app so it works offline.
// It is signed ad hoc (no Apple Developer account): the first time, macOS asks to confirm it in
// System Settings → Privacy & Security → "Open anyway". See native/README.md.
// usage: node native/macos/build.mjs
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const dist = join(root, 'dist');
const app = join(dist, 'Domentum.app');
const version = process.env.VERSION || '1.0.0';
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'], ...opts }).toString();

// a universal binary (arm64 + x86_64)
run('swift', ['build', '-c', 'release', '--arch', 'arm64', '--arch', 'x86_64'], { cwd: here });
const bin = run('swift', ['build', '-c', 'release', '--arch', 'arm64', '--arch', 'x86_64', '--show-bin-path'], { cwd: here }).trim();

rmSync(app, { recursive: true, force: true });
mkdirSync(join(app, 'Contents', 'MacOS'), { recursive: true });
mkdirSync(join(app, 'Contents', 'Resources'), { recursive: true });
cpSync(join(bin, 'Domentum'), join(app, 'Contents', 'MacOS', 'Domentum'));
cpSync(join(here, 'Resources', 'AppIcon.icns'), join(app, 'Contents', 'Resources', 'AppIcon.icns'));
cpSync(join(root, 'app'), join(app, 'Contents', 'Resources', 'www'), {
  recursive: true, filter: src => !/[/\\](sw\.js|manifest\.webmanifest)$/.test(src),
});
writeFileSync(join(app, 'Contents', 'Info.plist'), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Domentum</string>
  <key>CFBundleDisplayName</key><string>Domentum</string>
  <key>CFBundleIdentifier</key><string>io.github.davidosuna1987.domentum.mac</string>
  <key>CFBundleExecutable</key><string>Domentum</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>${version}</string>
  <key>CFBundleVersion</key><string>${version}</string>
  <key>CFBundleDevelopmentRegion</key><string>es</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.music</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSSupportsAutomaticGraphicsSwitching</key><true/>
  <key>NSHumanReadableCopyright</key><string>Domentum · sonidos ambientales</string>
</dict>
</plist>
`);
run('codesign', ['--force', '--deep', '--sign', '-', '--options', 'runtime', app]);
run('codesign', ['--verify', '--deep', '--strict', app]);

// the disk image: the app and a shortcut to Applications, to drag it across
const stage = join(dist, 'dmg-stage');
const dmg = join(dist, 'Domentum-mac.dmg');
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage);
cpSync(app, join(stage, 'Domentum.app'), { recursive: true, verbatimSymlinks: true });
run('ln', ['-s', '/Applications', join(stage, 'Aplicaciones')]);
rmSync(dmg, { force: true });
run('hdiutil', ['create', '-volname', 'Domentum', '-srcfolder', stage, '-ov', '-format', 'UDZO', '-fs', 'HFS+', dmg]);
rmSync(stage, { recursive: true, force: true });
const size = n => (n / 1048576).toFixed(1) + ' MB';
console.log(`dist/Domentum.app · dist/Domentum-mac.dmg (${size(Number(run('stat', ['-f', '%z', dmg]).trim()))}) · v${version}`);
