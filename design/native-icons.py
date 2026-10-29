# The native apps' icons and splash screens, from the same mark as the web app (design/logo.py).
# Android: launcher icons (legacy, round, adaptive foreground), splash, notification icon. iPhone: app icon,
# splash. Mac: AppIcon.icns. usage: python3 design/native-icons.py
import os, subprocess, sys, tempfile
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from logo import mark, RED, PAPER  # noqa: E402

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
android = os.path.join(root, 'native', 'android', 'app', 'src', 'main', 'res')
ios = os.path.join(root, 'native', 'ios', 'App', 'App', 'Assets.xcassets')
mac = os.path.join(root, 'native', 'macos', 'Resources')


def draw(size, scale, bg=PAPER, round_=False, w=None, h=None):
    """The mark at `scale` of the shorter side, centred, on paper (or transparent with bg=None)."""
    w, h = w or size, h or size
    k = 4
    im = Image.new('RGBA', (w * k, h * k), (196, 53, 42, 0) if bg is None else bg)
    if round_:
        m = Image.new('L', im.size, 0)
        ImageDraw.Draw(m).ellipse([0, 0, im.width - 1, im.height - 1], fill=255)
        clear = Image.new('RGBA', im.size, (0, 0, 0, 0))
        im = Image.composite(im, clear, m)
    d = ImageDraw.Draw(im)
    side = min(w, h) * k
    ox, oy = (w * k - side) / 2, (h * k - side) / 2
    for shape in mark(scale):
        d.polygon([(ox + x * side / 100, oy + y * side / 100) for x, y in shape], fill=RED)
    return im.resize((w, h), Image.LANCZOS)


def save(im, path, opaque=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    (im.convert('RGB') if opaque else im).save(path, optimize=True)


# ---- Android ----
dens = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for d, f in dens.items():
    save(draw(round(48 * f), 0.78), f'{android}/mipmap-{d}/ic_launcher.png', opaque=True)
    save(draw(round(48 * f), 0.72, round_=True), f'{android}/mipmap-{d}/ic_launcher_round.png')
    # adaptive icon: 108dp canvas, the system masks it; keep the mark inside the 66dp safe zone
    save(draw(round(108 * f), 0.56, bg=None), f'{android}/mipmap-{d}/ic_launcher_foreground.png')
open(f'{android}/values/ic_launcher_background.xml', 'w').write(
    f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{PAPER.upper()}</color>\n</resources>\n')
# splash: rice paper with a small mark, at every size the project already has
for dirpath, _, files in os.walk(android):
    for fn in files:
        if fn == 'splash.png':
            p = os.path.join(dirpath, fn)
            w, h = Image.open(p).size
            save(draw(None, 0.22, w=w, h=h), p, opaque=True)
# notification icon: white on transparent, the ensō ring only (Android tints it)
os.makedirs(f'{android}/drawable', exist_ok=True)
ring = mark(1.0)[0]
path = 'M' + 'L'.join(f'{x * 0.24:.2f},{y * 0.24:.2f}' for x, y in ring) + 'Z'
open(f'{android}/drawable/ic_stat_domentum.xml', 'w').write(f'''<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
    <path android:fillColor="#FFFFFFFF" android:pathData="{path}"/>
</vector>
''')

# ---- iPhone ----
save(draw(1024, 0.74), f'{ios}/AppIcon.appiconset/AppIcon-512@2x.png', opaque=True)
for fn in os.listdir(f'{ios}/Splash.imageset'):
    if fn.endswith('.png'):
        save(draw(2732, 0.16), f'{ios}/Splash.imageset/{fn}', opaque=True)

# ---- Mac: an .icns from a rounded paper square, the macOS icon shape ----
os.makedirs(mac, exist_ok=True)
with tempfile.TemporaryDirectory() as tmp:
    iconset = os.path.join(tmp, 'AppIcon.iconset')
    os.makedirs(iconset)
    def mac_icon(n):
        im = draw(n, 0.62)
        m = Image.new('L', (n * 4, n * 4), 0)
        pad = round(n * 4 * 0.1)
        ImageDraw.Draw(m).rounded_rectangle([pad, pad, n * 4 - pad, n * 4 - pad], radius=round(n * 4 * 0.18), fill=255)
        m = m.resize((n, n), Image.LANCZOS)
        out = Image.new('RGBA', (n, n), (0, 0, 0, 0))
        out.paste(im, (0, 0), m)
        return out
    for n in (16, 32, 128, 256, 512):
        mac_icon(n).save(f'{iconset}/icon_{n}x{n}.png')
        mac_icon(n * 2).save(f'{iconset}/icon_{n}x{n}@2x.png')
    subprocess.run(['iconutil', '-c', 'icns', iconset, '-o', os.path.join(mac, 'AppIcon.icns')], check=True)
print('native icons written')
