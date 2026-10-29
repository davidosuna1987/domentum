# Joins each style's phone, tablet and desktop screenshots into one sheet.
# usage: python3 sheet.py <shots-dir> <out-dir> [style ...]
import json, os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

shots, out = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
styles = json.load(open(os.path.join(here, 'styles.json')))
only = set(sys.argv[3:])
os.makedirs(out, exist_ok=True)

H, PAD, GAP, R = 900, 72, 52, 22
BG, FG, SUB = (22, 22, 26), (244, 244, 245), (161, 161, 170)
SUP = '/System/Library/Fonts/Supplemental/'
bold = ImageFont.truetype(SUP + 'Arial Bold.ttf', 46)
reg = ImageFont.truetype(SUP + 'Arial.ttf', 26)
small = ImageFont.truetype(SUP + 'Arial.ttf', 24)
DEVICES = [('escritorio', 'Escritorio · 1440 px'), ('tablet', 'Tablet · 820 px'), ('movil', 'Móvil · 390 px')]

def rounded(img, r):
    m = Image.new('L', img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], r, fill=255)
    img.putalpha(m)
    return img

for n, s in enumerate(styles, 1):
    if only and s['id'] not in only: continue
    imgs = []
    for dev, label in DEVICES:
        im = Image.open(os.path.join(shots, f"{s['id']}-{dev}.png")).convert('RGB')
        im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
        imgs.append((rounded(im.convert('RGBA'), R), label))
    W = PAD * 2 + sum(i.width for i, _ in imgs) + GAP * (len(imgs) - 1)
    top = PAD + 118
    sheet = Image.new('RGBA', (W, top + H + 96), BG + (255,))
    d = ImageDraw.Draw(sheet)
    d.text((PAD, PAD - 8), f"{n:02d}  {s['name']}", font=bold, fill=FG)
    d.text((PAD, PAD + 56), s['look'][:150] + ('…' if len(s['look']) > 150 else ''), font=reg, fill=SUB)
    x = PAD
    for im, label in imgs:
        shadow = Image.new('RGBA', sheet.size, (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle([x, top + 14, x + im.width, top + H + 14], R, fill=(0, 0, 0, 150))
        sheet = Image.alpha_composite(sheet, shadow.filter(ImageFilter.GaussianBlur(18)))
        sheet.alpha_composite(im, (x, top))
        ImageDraw.Draw(sheet).text((x + 4, top + H + 30), label, font=small, fill=SUB)
        x += im.width + GAP
    dst = os.path.join(out, f"{s['id']}.png")
    sheet.convert('RGB').save(dst, optimize=True)
    print(dst, sheet.size)
