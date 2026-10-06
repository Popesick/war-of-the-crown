#!/usr/bin/env python3
"""Slice generated sprite sheets (magenta background) into per-lord, recoloured sprite strips.
Usage: python3 tools/build_sprites.py <sheet-dir>   (sheets: sheet_*.png)
Placeholder cloth colour in the generated art is saturated red; it is recoloured to each lord's colour."""
import sys, os, colorsys
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/Downloads')
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'img')
LORDS = {'wilfred': '#2c5fd0', 'geoffrey': '#2aa0b8', 'cedric': '#3aa05a', 'wolfric': '#8a5acd',
         'brian': '#b22222', 'philip': '#c9701a', 'reginald': '#7a1f5a', 'edmund': '#555555', 'roger': '#c2a000'}
SAXON = ['wilfred', 'geoffrey', 'cedric', 'wolfric']

def hexrgb(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))

def key_magenta(im):
    im = im.convert('RGBA'); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, _ = px[x, y]
            mag = (min(r, b) - g) / 255.0
            if mag <= 0.18: continue
            alpha = max(0.0, 1 - (mag - 0.18) / 0.30)
            if alpha < 1:
                sp = (min(r, b) - g) * 0.9
                if r >= b and r > g: r = int(r - sp)
                if b >= r and b > g: b = int(b - sp)
            px[x, y] = (max(0, r), g, max(0, b), int(alpha * 255))
    return im

def cells(im, cols, rows):
    w, h = im.size; cw, ch = w / cols, h / rows
    return [[im.crop((round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch))) for c in range(cols)] for r in range(rows)]


def extract(im, cols, rows, ds=4, grow=2, margin=0.15):
    """Key the sheet, then per grid cell take a margin-expanded crop and keep only the connected figure(s) whose
    centre of mass lies inside the cell. Figures overlapping cell borders stay whole, stray bits of neighbours go."""
    im = key_magenta(im); W, H = im.size; cw, ch = W / cols, H / rows
    grid = [[None] * cols for _ in range(rows)]
    for r in range(rows):
        for c in range(cols):
            x0, y0 = int(c * cw), int(r * ch); x1, y1 = int((c + 1) * cw), int((r + 1) * ch)
            X0, Y0 = max(0, int(x0 - margin * cw)), max(0, int(y0 - margin * ch))
            X1, Y1 = min(W, int(x1 + margin * cw)), min(H, int(y1 + margin * ch))
            cr = im.crop((X0, Y0, X1, Y1)); cwid, chei = cr.size; ap = cr.getchannel('A').load()
            w, h = cwid // ds + 1, chei // ds + 1
            m = [[False] * w for _ in range(h)]
            for y in range(0, chei, 2):
                for x in range(0, cwid, 2):
                    if ap[x, y] > 40: m[y // ds][x // ds] = True
            for _ in range(grow):
                n = [row[:] for row in m]
                for y in range(h):
                    for x in range(w):
                        if m[y][x]:
                            for dy in (-1, 0, 1):
                                for dx in (-1, 0, 1):
                                    if 0 <= y + dy < h and 0 <= x + dx < w: n[y + dy][x + dx] = True
                m = n
            lab = [[0] * w for _ in range(h)]; comps = []
            for y in range(h):
                for x in range(w):
                    if m[y][x] and not lab[y][x]:
                        k = len(comps) + 1; st = [(y, x)]; lab[y][x] = k; n = sx = sy = 0
                        while st:
                            cy, cx = st.pop(); n += 1; sx += cx; sy += cy
                            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                                ny, nx = cy + dy, cx + dx
                                if 0 <= ny < h and 0 <= nx < w and m[ny][nx] and not lab[ny][nx]:
                                    lab[ny][nx] = k; st.append((ny, nx))
                        comps.append((k, n, sx / n * ds + X0, sy / n * ds + Y0))
            inside = [q for q in comps if x0 <= q[2] < x1 and y0 <= q[3] < y1]
            if not inside: continue
            big = max(q[1] for q in inside)
            keep = {q[0] for q in inside if q[1] >= big * 0.2}
            out = Image.new('RGBA', cr.size, (0, 0, 0, 0)); op = out.load(); px = cr.load()
            for y in range(chei):
                ly = lab[y // ds]
                for x in range(cwid):
                    if ly[x // ds] in keep: op[x, y] = px[x, y]
            grid[r][c] = out
    return grid

def trim_align(frames, pad=2, size=None):
    """crop each frame to alpha bbox, place bottom-centre on a common canvas"""
    boxes = [f.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox() for f in frames]
    boxes = [b or (0, 0, 1, 1) for b in boxes]
    W = max(b[2] - b[0] for b in boxes) + pad * 2; H = max(b[3] - b[1] for b in boxes) + pad * 2
    out = []
    for f, b in zip(frames, boxes):
        c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); cr = f.crop(b)
        c.paste(cr, ((W - cr.width) // 2, H - pad - cr.height), cr); out.append(c)
    return out

def recolor(im, hexc):
    im = im.copy(); px = im.load(); tr, tg, tb = hexrgb(hexc)
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0: continue
            mx = max(r, g, b) / 255.0
            if mx < 0.25: continue
            sat = (max(r, g, b) - min(r, g, b)) / max(r, g, b)
            if r > g * 2.6 and r > b * 2.6 and sat > 0.6:
                k = mx / 0.8
                px[x, y] = (min(255, int(tr * k)), min(255, int(tg * k)), min(255, int(tb * k)), a)
    return im

def strip(frames):
    W = sum(f.width for f in frames); s = Image.new('RGBA', (W, frames[0].height), (0, 0, 0, 0)); x = 0
    for f in frames: s.paste(f, (x, 0)); x += f.width
    return s

def save(im, name, maxh):
    if im.height > maxh:
        s = maxh / im.height; im = im.resize((round(im.width * s), maxh), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.png'), optimize=True)

def sheet(name):
    p = os.path.join(SRC, name)
    return Image.open(p) if os.path.exists(p) else None

def run_kind(name, cols, rows, pick, kind, lords, maxh, keymode=True, margin=0.15):
    im = sheet(name)
    if im is None: print('skip', name); return
    if keymode: cs = extract(im, cols, rows, margin=margin)
    else: cs = cells(im, cols, rows)
    frames = [cs[r][c] for r, c in pick]
    frames = trim_align(frames)
    for l in lords:
        save(strip([recolor(f, LORDS[l]) for f in frames]), f'{kind}_{l}', maxh)
    print('built', kind, len(frames), 'frames', frames[0].size)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    which = sys.argv[2:] or ['portraits', 'rider_side', 'rider_front', 'soldier', 'fencer', 'pov']
    ALL = list(LORDS)
    if 'portraits' in which:
        im = sheet('sheet_portraits.png')
        if im:
            cs = cells(im, 3, 3); ids = list(LORDS)
            for i, l in enumerate(ids):
                c = cs[i // 3][i % 3].convert('RGB'); s = min(c.size)
                c = c.crop(((c.width - s) // 2, (c.height - s) // 2, (c.width + s) // 2, (c.height + s) // 2)).resize((224, 224), Image.LANCZOS)
                c.save(os.path.join(OUT, f'portrait_{l}.png'), optimize=True)
            print('built portraits')
    if 'rider_side' in which: run_kind('sheet_rider_side.png', 2, 2, [(0, 0), (0, 1), (1, 0), (1, 1)], 'rider_side', ALL, 150)
    if 'rider_front' in which: run_kind('sheet_rider_front.png', 2, 2, [(0, 0), (0, 1), (1, 0), (1, 1)], 'rider_front', ALL, 300)
    if 'soldier' in which:
        run_kind('sheet_soldier.png', 4, 3, [(0, c) for c in range(4)] + [(2, 0), (2, 1)], 'soldier', ALL, 80)
        run_kind('sheet_soldier.png', 4, 3, [(1, c) for c in range(4)] + [(2, 2), (2, 3)], 'knightfoot', ALL, 80)
    if 'fencer' in which: run_kind('sheet_fencer.png', 3, 2, [(0, 0), (0, 1), (0, 2), (1, 0), (1, 1), (1, 2)], 'fencer', ALL, 220)
    if 'pov' in which: run_kind('sheet_pov.png', 3, 1, [(0, 0), (0, 1), (0, 2)], 'pov', SAXON, 220, margin=0)

def build_siege():
    im = sheet('sheet_siege.png')
    if im is None: print('skip siege'); return
    g = extract(im, 3, 2); cs = [g[0][0], g[0][1], g[0][2]]
    boxes = [f.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox() for f in cs]
    box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    save(strip([f.crop(box) for f in cs]), 'siege_catapult', 130)
    def defringe(f):
        f = f.copy(); px = f.load()
        for y in range(f.height):
            for x in range(f.width):
                r, gg, b, a = px[x, y]
                if a and r > gg * 1.18 and b > gg * 1.08 and r > 150:
                    px[x, y] = (min(255, int((r + gg) / 2 * 1.0)), int(gg * 0.95), int(gg * 0.8), a)
        return f
    for name, f in (('stone', g[1][0]), ('dust', defringe(g[1][1])), ('rubble', defringe(g[1][2]))):
        f = f.crop(f.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())
        save(f, 'siege_' + name, 90 if name != 'stone' else 24)
    print('built siege')

if __name__ == '__main__' and 'siege' in (sys.argv[2:] or ['siege']): build_siege()
