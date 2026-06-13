#!/usr/bin/env python3
"""Generate placeholder carpet SVGs and the brand lattice pattern tile."""
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "assets")

GOLD = "#c3996c"
TEAL = "#21403d"
EMERALD = "#0e3b2e"
PLUM = "#5f3263"
IVORY = "#f4ede0"
GOLD_LIGHT = "#d9bc94"

# (slug, field, motif, accent)
COLORWAYS = [
    ("kashan-gold",     GOLD,    TEAL,    IVORY),
    ("ardestan-teal",   TEAL,    GOLD,    IVORY),
    ("emerald-garden",  EMERALD, GOLD,    GOLD_LIGHT),
    ("shiraz-plum",     PLUM,    GOLD,    IVORY),
    ("ivory-palace",    IVORY,   TEAL,    GOLD),
    ("saffron-dusk",    GOLD,    PLUM,    IVORY),
    ("nightfall-teal",  TEAL,    IVORY,   GOLD),
    ("royal-emerald",   EMERALD, IVORY,   GOLD),
]

# ogee/quatrefoil motif from the brand pattern, drawn in a 40x52 box centred at 0,0
OGEE = ("M0-26 C6-18 14-14 17-7 C20-1 17 5 12 9 C8 12 3 16 0 22 "
        "C-3 16 -8 12 -12 9 C-17 5 -20-1 -17-7 C-14-14 -6-18 0-26 Z")


def motif(x, y, fill, scale=1.0, opacity=1.0):
    return (f'<path d="{OGEE}" fill="{fill}" fill-opacity="{opacity}" '
            f'transform="translate({x},{y}) scale({scale})"/>')


def carpet(slug, field, mot, accent):
    W, H = 600, 800
    p = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">']
    # fringe
    p.append(f'<g stroke="{mot}" stroke-width="4">')
    for x in range(28, W - 20, 12):
        p.append(f'<line x1="{x}" y1="6" x2="{x}" y2="26"/>')
        p.append(f'<line x1="{x}" y1="{H-26}" x2="{x}" y2="{H-6}"/>')
    p.append('</g>')
    # body and borders (clipped so corner medallions can't leak past the edge)
    p.append(f'<clipPath id="body"><rect x="20" y="26" width="{W-40}" height="{H-52}"/></clipPath>')
    p.append('<g clip-path="url(#body)">')
    p.append(f'<rect x="20" y="26" width="{W-40}" height="{H-52}" fill="{field}"/>')
    p.append(f'<rect x="38" y="44" width="{W-76}" height="{H-88}" fill="none" stroke="{accent}" stroke-width="3"/>')
    p.append(f'<rect x="50" y="56" width="{W-100}" height="{H-112}" fill="none" stroke="{mot}" stroke-width="10"/>')
    p.append(f'<rect x="72" y="78" width="{W-144}" height="{H-156}" fill="none" stroke="{accent}" stroke-width="2"/>')
    # border band motifs
    for x in range(100, W - 80, 56):
        p.append(motif(x, 67, accent, 0.42))
        p.append(motif(x, H - 67, accent, 0.42))
    for y in range(120, H - 100, 56):
        p.append(motif(56, y, accent, 0.42))
        p.append(motif(W - 56, y, accent, 0.42))
    # field lattice (subtle)
    row = 0
    for y in range(150, H - 130, 64):
        off = 32 if row % 2 else 0
        for x in range(140 + off, W - 120, 64):
            p.append(motif(x, y, mot, 0.55, 0.16))
        row += 1
    # central medallion
    cx, cy = W / 2, H / 2
    p.append(f'<circle cx="{cx}" cy="{cy}" r="118" fill="{mot}" fill-opacity="0.12"/>')
    p.append(f'<circle cx="{cx}" cy="{cy}" r="118" fill="none" stroke="{accent}" stroke-width="2"/>')
    for rot in range(0, 360, 45):
        p.append(f'<g transform="rotate({rot} {cx} {cy})">{motif(cx, cy - 86, mot, 0.85)}</g>')
    p.append(motif(cx, cy + 8, accent, 1.7))
    p.append(motif(cx, cy + 4, mot, 1.05))
    # corner quarter medallions
    for qx, qy in [(72, 78), (W - 72, 78), (72, H - 78), (W - 72, H - 78)]:
        p.append(f'<circle cx="{qx}" cy="{qy}" r="64" fill="{mot}" fill-opacity="0.25"/>')
        p.append(f'<circle cx="{qx}" cy="{qy}" r="64" fill="none" stroke="{accent}" stroke-width="2"/>')
    p.append('</g>')
    p.append(f'<rect x="20" y="26" width="{W-40}" height="{H-52}" fill="none" stroke="{mot}" stroke-width="8"/>')
    p.append('</svg>')
    return "\n".join(p)


for slug, field, mot, accent in COLORWAYS:
    with open(os.path.join(OUT, f"carpet-{slug}.svg"), "w") as f:
        f.write(carpet(slug, field, mot, accent))
    print("carpet-" + slug + ".svg")

# seamless lattice tile (transparent bg, gold motifs) for section backgrounds
tile = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 104" width="80" height="104">
<g fill="{GOLD}">
<path d="{OGEE}" transform="translate(20,26) scale(0.72)"/>
<path d="{OGEE}" transform="translate(60,78) scale(0.72)"/>
<path d="{OGEE}" transform="translate(-20,78) scale(0.72)"/>
<path d="{OGEE}" transform="translate(100,26) scale(0.72)"/>
<path d="{OGEE}" transform="translate(20,130) scale(0.72)"/>
<path d="{OGEE}" transform="translate(60,-26) scale(0.72)"/>
<path d="{OGEE}" transform="translate(-20,-26) scale(0.72)"/>
</g>
</svg>'''
with open(os.path.join(OUT, "pattern.svg"), "w") as f:
    f.write(tile)
print("pattern.svg")
