#!/usr/bin/env python3
"""Build seed/catalog.json from the carpets extracted out of the product catalogs."""
import json
import os

FA_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")

COLORS = {
    "Black": "مشکی", "Cream": "کرم", "Fullcolor": "هفت‌رنگ", "Crimson": "زرشکی",
    "Blue": "آبی", "Nescafe": "نسکافه‌ای", "Green": "سبز", "Gray": "طوسی",
    "Laquer": "لاکی", "Red": "قرمز",
}

COLLECTIONS = [
    {"slug": "france", "name_en": "France", "name_fa": "فرانسه",
     "spec_en": "1200 reeds · density 3600", "spec_fa": "۱۲۰۰ شانه · تراکم ۳۶۰۰",
     "cover": "/assets/collections/france/france-02.jpg"},
    {"slug": "versace", "name_en": "Versace", "name_fa": "ورساچه",
     "spec_en": "1200 reeds · density 3600", "spec_fa": "۱۲۰۰ شانه · تراکم ۳۶۰۰",
     "cover": "/assets/collections/versace/versace-02.jpg"},
    {"slug": "rochak", "name_en": "Rochak", "name_fa": "روچک",
     "spec_en": "1200 reeds · density 3600", "spec_fa": "۱۲۰۰ شانه · تراکم ۳۶۰۰",
     "cover": "/assets/collections/rochak/rochak-04.jpg"},
    {"slug": "onyx", "name_en": "Onyx", "name_fa": "اونیکس",
     "spec_en": "1000 reeds · density 3000", "spec_fa": "۱۰۰۰ شانه · تراکم ۳۰۰۰",
     "cover": "/assets/collections/onyx/onyx-03.jpg"},
    {"slug": "helena", "name_en": "Helena", "name_fa": "هلنا",
     "spec_en": "77 raj · hand-knotted look", "spec_fa": "۷۷ رج · دستباف‌گونه",
     "cover": "/assets/collections/helena/helena-02.jpg"},
    {"slug": "cheheltekke", "name_en": "Patchwork", "name_fa": "چهل‌تکه",
     "spec_en": "700 reeds · density 2550", "spec_fa": "۷۰۰ شانه · تراکم ۲۵۵۰",
     "cover": "/assets/collections/cheheltekke/cheheltekke-03.jpg"},
]

# (page-file, design code, colour) read off the catalog info panels
PRODUCTS = {
    "france": [("france-02", "300300", "Black"), ("france-03", "300300", "Cream"),
               ("france-05", "300302", "Fullcolor"), ("france-06", "300302", "Black"),
               ("france-08", "300311", "Crimson"), ("france-09", "300315", "Cream")],
    "cheheltekke": [("cheheltekke-03", "100500", "Fullcolor"), ("cheheltekke-13", "100503", "Blue"),
                    ("cheheltekke-24", "100508", "Cream"), ("cheheltekke-34", "100511", "Blue"),
                    ("cheheltekke-50", "100525", "Fullcolor"), ("cheheltekke-62", "100536", "Fullcolor")],
    "rochak": [("rochak-04", "400401", "Blue"), ("rochak-12", "400404", "Nescafe"),
               ("rochak-37", "400410", "Green"), ("rochak-51", "400414", "Gray"),
               ("rochak-64", "400419", "Laquer"), ("rochak-76", "400425", "Fullcolor")],
    "versace": [("versace-02", "300405", "Green"), ("versace-08", "300402", "Red"),
                ("versace-09", "300402", "Green"), ("versace-11", "300401", "Gray"),
                ("versace-12", "300400", "Gray")],
    "helena": [("helena-02", "809000", None), ("helena-10", "809008", None),
               ("helena-17", "809016", None), ("helena-25", "809027", None),
               ("helena-32", "809034", None), ("helena-40", "809042", None)],
    "onyx": [("onyx-03", "300100", None), ("onyx-09", "300103", "Blue"),
             ("onyx-15", "300105", "Gray"), ("onyx-19", "300106", None),
             ("onyx-25", "300109", None), ("onyx-31", "300112", None)],
}


def product(slug, coll, file, code, color):
    fa_code = code.translate(FA_DIGITS)
    if color:
        name_en = f"{coll['name_en']} {code} · {color}"
        name_fa = f"{coll['name_fa']} {fa_code} · {COLORS[color]}"
        col_en = f" in the {color.lower()} colourway"
        col_fa = f" در رنگ‌بندی {COLORS[color]}"
    else:
        name_en = f"{coll['name_en']} {code}"
        name_fa = f"{coll['name_fa']} {fa_code}"
        col_en = col_fa = ""
    if slug == "helena":
        desc_en = (f"Design {code} from the Helena collection — a 77-raj carpet with the look and feel "
                   f"of a hand-knotted piece{col_en}. Woven on modern looms with heat-set acrylic yarn.")
        desc_fa = (f"طرح {fa_code} از کلکسیون هلنا — فرش ۷۷ رج با حال‌وهوای فرش دستباف{col_fa}؛ "
                   f"بافته‌شده با نخ آکریلیک هیت‌ست.")
    else:
        reed = coll["spec_en"].split(" ")[0]
        reed_fa = coll["spec_fa"].split(" ")[0]
        desc_en = (f"Design {code} from the {coll['name_en']} collection — a {reed}-reed machine-woven "
                   f"carpet{col_en}, woven with heat-set acrylic yarn. Available in standard sizes.")
        desc_fa = (f"طرح {fa_code} از کلکسیون {coll['name_fa']} — فرش ماشینی {reed_fa} شانه{col_fa}؛ "
                   f"بافته‌شده با نخ آکریلیک هیت‌ست. در اندازه‌های استاندارد موجود است.")
    return {
        "name_en": name_en, "name_fa": name_fa,
        "desc_en": desc_en, "desc_fa": desc_fa,
        "collection": slug, "size": "3 × 4 m",
        "material_en": "Heat-set acrylic", "material_fa": "آکریلیک هیت‌ست",
        "knots": coll["spec_en"].replace(" · ", " · ").title(),
        "image": f"/assets/collections/{slug}/{file}.jpg",
    }


out = {"collections": COLLECTIONS, "products": []}
for coll in COLLECTIONS:
    rows = PRODUCTS[coll["slug"]]
    for i, (file, code, color) in enumerate(rows):
        p = product(coll["slug"], coll, file, code, color)
        p["featured"] = 1 if i == 0 else 0
        out["products"].append(p)

dest = os.path.join(os.path.dirname(__file__), "..", "seed", "catalog.json")
os.makedirs(os.path.dirname(dest), exist_ok=True)
with open(dest, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print(f"wrote {dest}: {len(out['collections'])} collections, {len(out['products'])} products")
