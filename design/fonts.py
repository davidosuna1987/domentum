# Self-hosts the themes' Google Fonts (latin subset only) so every theme also works offline.
# Writes app/fonts/<family>.css and app/fonts/files/*.woff2. Usage: python3 design/fonts.py
import hashlib, os, re, urllib.parse, urllib.request

FAMILIES = [
    'Shippori Mincho:wght@400;500;700',
    'Inter Tight:wght@400;500;600;700;800;900',
    'JetBrains Mono:wght@400;500',
    'Archivo:wght@500;600;700;800',
    'Share Tech Mono',
    'IBM Plex Mono:wght@400;500;700',
    'Instrument Serif:ital@0;1',
    'Inter:wght@400;500;600;700',
    'Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700',
    'Caveat:wght@500;600',
    'Unbounded:wght@400;500;600',
    'Manrope:wght@500;600;700;800',
    'Nunito:wght@600;700;800;900',
    'Bricolage Grotesque:opsz,wght@12..96,500..800',
]
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app', 'fonts')
os.makedirs(os.path.join(root, 'files'), exist_ok=True)

def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60).read()

def covers_latin(block):
    # Keep the subset that holds plain A–Z (Google's "latin"); Spanish accents are in it too
    m = re.search(r'unicode-range:\s*([^;]+);', block)
    if not m: return True
    for part in m.group(1).split(','):
        a, _, b = part.strip()[2:].partition('-')
        lo, hi = int(a.replace('?', '0'), 16), int((b or a).replace('?', 'F'), 16)
        if lo <= 0x41 <= hi: return True
    return False

total = 0
for fam in FAMILIES:
    name = fam.split(':')[0]
    slug = name.lower().replace(' ', '-')
    css = get('https://fonts.googleapis.com/css2?' + urllib.parse.urlencode({'family': fam, 'display': 'swap'})).decode()
    out = []
    for block in re.findall(r'@font-face\s*\{[^}]+\}', css):
        if not covers_latin(block): continue
        url = re.search(r'url\((https://[^)]+)\)', block).group(1)
        style = re.search(r'font-style:\s*(\w+)', block).group(1)
        weight = re.search(r'font-weight:\s*([^;]+);', block).group(1).strip().replace(' ', '-')
        data = get(url)
        fn = f'{slug}-{style}-{weight}-{hashlib.sha1(data).hexdigest()[:8]}.woff2'
        open(os.path.join(root, 'files', fn), 'wb').write(data)
        total += len(data)
        out.append(block.replace(url, f'files/{fn}'))
    open(os.path.join(root, f'{slug}.css'), 'w').write(f'/* {name} · Google Fonts, SIL Open Font License · latin subset */\n' + '\n'.join(out) + '\n')
    print(f'{slug:22} {len(out)} faces')
print(f'{total / 1024:.0f} KB')
