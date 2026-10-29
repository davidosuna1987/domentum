# Joins snaps into one review image: one row per name, phone/tablet/desktop side by side.
# usage: python3 design/grid.py <dir> <out.png> name [name ...]
import sys, os
from PIL import Image
d, out, names = sys.argv[1], sys.argv[2], sys.argv[3:]
H, G = 620, 24
rows = []
for n in names:
    ims = []
    for dev in ('movil', 'tablet', 'escritorio'):
        p = os.path.join(d, f'{n}-{dev}.png')
        if os.path.exists(p):
            im = Image.open(p).convert('RGB')
            ims.append(im.resize((round(im.width * H / im.height), H), Image.LANCZOS))
    rows.append(ims)
W = max(sum(i.width for i in r) + G * (len(r) - 1) for r in rows)
sheet = Image.new('RGB', (W + 2 * G, len(rows) * (H + G) + G), (40, 40, 44))
for y, r in enumerate(rows):
    x = G
    for im in r:
        sheet.paste(im, (x, G + y * (H + G)))
        x += im.width + G
sheet.save(out)
print(out, sheet.size)
