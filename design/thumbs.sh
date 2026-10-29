#!/bin/zsh
# Theme picker thumbnails: a phone screenshot of every theme in light and dark, cropped to 4:5, into icons/themes/<id>-<scheme>.jpg
# usage: /bin/zsh design/thumbs.sh [base-url]   (default http://localhost:5181/)
set -e
cd "${0:A:h}/.."
B=${1:-http://localhost:5181/}
ids=(zen original editorial consola terminal cine naturalista aurora bento neumorfico pop)
specs=(); for id in $ids; do for sc in light dark; do specs+=("$id-$sc=${B}?theme=$id&scheme=$sc&demo"); done; done
SIZES=movil node design/snap.mjs design/snaps/thumbs $specs
mkdir -p icons/themes
python3 - $ids <<'PY'
import sys
from PIL import Image
for i in sys.argv[1:]:
    for sc in ('light', 'dark'):
        im = Image.open(f'design/snaps/thumbs/{i}-{sc}-movil.png').convert('RGB')
        w = im.width
        im.crop((0, 0, w, round(w * 5 / 4))).resize((240, 300), Image.LANCZOS).save(f'icons/themes/{i}-{sc}.jpg', quality=84, optimize=True, progressive=True)
        print(f'icons/themes/{i}-{sc}.jpg')
PY
