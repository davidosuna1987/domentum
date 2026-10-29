# The Domentum mark: a vermilion brush ensō with a sound wave inside. Writes icons/mark.svg (the mark alone)
# and the app icons: icon.svg, icon-192.png, icon-512.png transparent; maskable-512.png, apple-touch-icon.png on rice paper.
# usage: python3 design/logo.py
import math, os
from PIL import Image, ImageDraw

RED, PAPER = '#c4352a', '#f4f0e6'
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')


def enso(cx, cy, r, wmax, a0=-100, sweep=318, n=480):
    """A brush ring like the play button's: lands round and thick, thins to a fine tail."""
    outer, inner = [], []
    for i in range(n + 1):
        t = i / n
        a = math.radians(a0 + sweep * t)
        land = math.sqrt(min(1, t / 0.05))                       # the round tip where the brush touches down
        w = (0.05 * wmax + wmax * (1 - t) ** 0.8) * land
        rr = r * (1 + 0.014 * math.sin(a * 3 + 0.7) + 0.006 * math.sin(a * 7 + 2))
        outer.append((cx + (rr + w / 2) * math.cos(a), cy + (rr + w / 2) * math.sin(a)))
        inner.append((cx + (rr - w / 2) * math.cos(a), cy + (rr - w / 2) * math.sin(a)))
    return outer + inner[::-1]


def wave(x0, x1, y, amp, periods, wmax, n=240):
    """One tapered brush stroke along a sine: the sound inside the circle."""
    top, bottom = [], []
    for i in range(n + 1):
        t = i / n
        x = x0 + (x1 - x0) * t
        yy = y + amp * math.sin(t * periods * 2 * math.pi + 0.35)
        w = wmax * math.sin(math.pi * t) ** 0.55 * (1 - 0.3 * t) + 0.25
        top.append((x, yy - w / 2))
        bottom.append((x, yy + w / 2))
    return top + bottom[::-1]


def mark(scale=1.0, c=50.0):
    """Both shapes in a 100×100 box, scaled around the centre."""
    shapes = [enso(50, 50, 35, 12), wave(28, 72, 50.5, 4.4, 1.5, 5.6)]
    return [[(c + (x - 50) * scale, c + (y - 50) * scale) for x, y in s] for s in shapes]


def path(shapes):
    return ' '.join('M' + 'L'.join(f'{x:.2f} {y:.2f}' for x, y in s) + 'Z' for s in shapes)


def svg(shapes, bg=None):
    rect = f'<rect width="100" height="100" fill="{bg}"/>' if bg else ''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{rect}<path fill="{RED}" d="{path(shapes)}"/></svg>\n'


def png(shapes, size, dst, bg=PAPER):
    """bg=None leaves it transparent (the clear pixels carry the red, so edges don't darken when scaled)."""
    big = size * 8
    im = Image.new('RGBA', (big, big), (196, 53, 42, 0) if bg is None else bg)
    d = ImageDraw.Draw(im)
    for s in shapes:
        d.polygon([(x * big / 100, y * big / 100) for x, y in s], fill=RED)
    im = im.resize((size, size), Image.LANCZOS)
    (im if bg is None else im.convert('RGB')).save(os.path.join(root, dst), optimize=True)


open(os.path.join(root, 'mark.svg'), 'w').write(svg(mark()))
# Favicon and the plain app icons: the mark alone on a transparent background
open(os.path.join(root, 'icon.svg'), 'w').write(svg(mark(0.94)))
png(mark(0.9), 192, 'icon-192.png', bg=None)
png(mark(0.9), 512, 'icon-512.png', bg=None)
# Where the system needs an opaque square (Android masks it, iOS would fill clear pixels with black): rice paper
png(mark(0.64), 512, 'maskable-512.png')   # inside the maskable safe zone
png(mark(0.78), 180, 'apple-touch-icon.png')
print('icons written')
