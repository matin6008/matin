#!/usr/bin/env python3
"""Extract carpet photos from the Mohtasham product catalogs (PDF).

Each product page: carpet photo on a white field (left ~60%) + gold info panel
(right) with the design code. Cover/intro pages are full-bleed and get skipped.

Outputs, per collection:
  public/assets/collections/<slug>/<slug>-<page>.jpg   trimmed carpet photo
  /tmp/claris/labels/<slug>-<page>.png                 info-panel crop (to read codes)
"""
import io
import os
import sys

import fitz
from PIL import Image

CATALOGS = {
    "france":      ("/Users/matinrahimi/Downloads/1200شانه فرانسه کلاریس.pdf", 6),
    "cheheltekke": ("/Users/matinrahimi/Downloads/700شانه چهل تکه کلاریس.pdf", 6),
    "rochak":      ("/Users/matinrahimi/Downloads/1200شانه روچک کلاریس.pdf", 6),
    "versace":     ("/Users/matinrahimi/Downloads/1200شانه ورساچه کلاریس.pdf", 6),
    "helena":      ("/Users/matinrahimi/Downloads/77رج کلکسیون هلنا کلاریس(1).pdf", 6),
    "onyx":        ("/Users/matinrahimi/Downloads/1000شانه اونیکس کلاریس.pdf", 6),
}

ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "assets", "collections")
LABELS = "/tmp/claris/labels"
os.makedirs(LABELS, exist_ok=True)


def page_image(doc, pno):
    xref = doc[pno].get_images(full=True)[0][0]
    raw = doc.extract_image(xref)["image"]
    return Image.open(io.BytesIO(raw)).convert("RGB")


def is_product_page(img):
    # product pages have a white field around the carpet; sample a few points
    w, h = img.size
    pts = [(int(w * 0.04), int(h * 0.08)), (int(w * 0.04), int(h * 0.92)),
           (int(w * 0.30), int(h * 0.04)), (int(w * 0.55), int(h * 0.95))]
    white = sum(1 for p in pts if all(c > 232 for c in img.getpixel(p)))
    return white >= 2


def trim_white(img, thresh=240, pad=6):
    gray = img.convert("L").point(lambda v: 0 if v > thresh else 255)
    box = gray.getbbox()
    if not box:
        return img
    x0, y0, x1, y1 = box
    x0 = max(0, x0 - pad); y0 = max(0, y0 - pad)
    x1 = min(img.width, x1 + pad); y1 = min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1))


def main():
    only = sys.argv[1:] or list(CATALOGS)
    for slug in only:
        path, want = CATALOGS[slug]
        doc = fitz.open(path)
        out_dir = os.path.join(ROOT, slug)
        os.makedirs(out_dir, exist_ok=True)

        product_pages = []
        for pno in range(1, len(doc) - 1):  # skip front cover and back cover
            try:
                img = page_image(doc, pno)
            except Exception:
                continue
            if is_product_page(img):
                product_pages.append((pno, img))
            else:
                img.close()

        # spread the selection across the catalog
        if len(product_pages) <= want:
            chosen = product_pages
        else:
            step = (len(product_pages) - 1) / (want - 1)
            idx = sorted({round(i * step) for i in range(want)})
            chosen = [product_pages[i] for i in idx]

        kept = []
        for pno, img in product_pages:
            if not any(pno == c[0] for c in chosen):
                img.close()
        for pno, img in chosen:
            w, h = img.size
            carpet = trim_white(img.crop((0, 0, int(w * 0.62), h)))
            scale = 1100 / carpet.height
            if scale < 1:
                carpet = carpet.resize((int(carpet.width * scale), 1100), Image.LANCZOS)
            name = f"{slug}-{pno + 1:02d}"
            carpet.save(os.path.join(out_dir, f"{name}.jpg"), quality=84)
            label = img.crop((int(w * 0.66), int(h * 0.55), w, h))
            label.thumbnail((460, 460))
            label.save(os.path.join(LABELS, f"{name}.png"))
            kept.append(name)
            img.close()
        doc.close()
        print(f"{slug}: {len(product_pages)} product pages, kept {kept}")


if __name__ == "__main__":
    main()
