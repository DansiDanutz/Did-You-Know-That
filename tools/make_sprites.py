"""Turns generated character sheets into cut-out puppet sprites.

For every <who>-<pose>.png in art/family/poses: removes the white background
and the soft ground shadow, crops to the figure, finds the mouth (reddest
cluster in the head) and the skin colour next to it, and writes
<out>/<who>-<pose>.png plus <out>/manifest.json with, per sprite, the size,
the feet position and the mouth centre in sprite pixels.

Usage: python3 tools/make_sprites.py [poses_dir] [out_dir]
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
POSES = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "art" / "family" / "poses"
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "video" / "ep01-family" / "assets" / "art"
WHITE = 232
SHADOW_MIN = 150  # grey ground shadows are brighter than this on every channel …
SHADOW_TINT = 28  # … and nearly neutral
LIGHT_MIN = 192  # very pale pixels (tinted ground shadows) connected to the border are background too
OVERRIDES_FILE = ROOT / "art" / "family" / "mouths.json"  # {"emma-neutral": [x, y]} in source-image pixels
OVERRIDES = json.loads(OVERRIDES_FILE.read_text()) if OVERRIDES_FILE.exists() else {}


def background_mask(img: Image.Image) -> Image.Image:
    """White or neutral-grey pixels connected to the border are background."""
    w, h = img.size
    px = img.load()
    bg = Image.new("L", (w, h), 0)
    bgpx = bg.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            lo, hi = min(r, g, b), max(r, g, b)
            if lo > WHITE or (lo > SHADOW_MIN and hi - lo < SHADOW_TINT) or lo > LIGHT_MIN:
                bgpx[x, y] = 255
    for seed in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, h - 1), (w // 2, 0)):
        if bg.getpixel(seed) == 255:
            ImageDraw.floodfill(bg, seed, 128)
    return bg.point(lambda v: 255 if v == 128 else 0)


def find_mouth(img: Image.Image, alpha: Image.Image) -> tuple[int, int] | None:
    """Centroid of the reddest pixels in the head area (lips)."""
    w, h = img.size
    px = img.load()
    apx = alpha.load()
    pts = []
    for y in range(int(h * 0.12), int(h * 0.40)):
        for x in range(int(w * 0.32), int(w * 0.68)):
            if apx[x, y] < 200:
                continue
            r, g, b, _ = px[x, y]
            # lips: fairly bright, clearly red over both green and blue (hair and shadows are darker/browner)
            if r > 150 and r - g > 60 and r - b > 55 and g < 130:
                pts.append((x, y))
    if len(pts) < 12:
        return None
    pts.sort(key=lambda p: p[1])
    core = pts[len(pts) // 4 : -len(pts) // 4 or None]
    return (sum(p[0] for p in core) // len(core), sum(p[1] for p in core) // len(core))


def skin_near(img: Image.Image, mouth: tuple[int, int]) -> str:
    x, y = mouth
    samples = [img.getpixel((x + dx, y + dy))[:3] for dx, dy in ((-28, 10), (28, 10), (-30, -6), (30, -6)) if 0 <= x + dx < img.width and 0 <= y + dy < img.height]
    r, g, b = (sum(c[i] for c in samples) // len(samples) for i in range(3))
    return f"#{r:02x}{g:02x}{b:02x}"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for path in sorted(POSES.glob("*.png")):
        img = Image.open(path).convert("RGBA")
        outside = background_mask(img)
        alpha = outside.point(lambda v: 0 if v else 255).filter(ImageFilter.GaussianBlur(1.0))
        img.putalpha(alpha)
        bbox = alpha.point(lambda v: 255 if v > 40 else 0).getbbox()
        if not bbox:
            print(f"skip {path.name}: nothing found")
            continue
        sprite = img.crop(bbox)
        mouth = find_mouth(sprite, sprite.getchannel("A"))
        # hand-measured overrides (fractions of the sprite) win over detection
        override = OVERRIDES.get(path.stem)
        if override:
            mouth = (int(override[0]) - bbox[0], int(override[1]) - bbox[1])
        info = {
            "file": path.name,
            "width": sprite.width,
            "height": sprite.height,
            "feet": [sprite.width // 2, sprite.height],
            "mouth": list(mouth) if mouth else [sprite.width // 2, int(sprite.height * 0.22)],
            "mouthFound": bool(mouth) or bool(override),
            "skin": skin_near(sprite, mouth) if mouth else "#ffd9b3",
        }
        sprite.save(OUT / path.name, optimize=True)
        manifest[path.stem] = info
        print(f"{path.stem}: {sprite.width}x{sprite.height} mouth={'found' if mouth else 'guessed'} {info['mouth']}")
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    # debug sheet: every sprite with its detected mouth marked
    thumbs = [(k, Image.open(OUT / v["file"]).convert("RGBA"), v) for k, v in manifest.items()]
    if thumbs:
        th = 360
        cols = min(6, len(thumbs))
        rows = (len(thumbs) + cols - 1) // cols
        sheet = Image.new("RGBA", (cols * 220, rows * (th + 24)), (40, 40, 40, 255))
        for i, (k, im, v) in enumerate(thumbs):
            r = th / im.height
            t = im.resize((int(im.width * r), th), Image.LANCZOS)
            d = ImageDraw.Draw(t)
            mx, my = int(v["mouth"][0] * r), int(v["mouth"][1] * r)
            d.ellipse((mx - 6, my - 6, mx + 6, my + 6), outline=(255, 0, 0, 255), width=3)
            x0, y0 = (i % cols) * 220 + (220 - t.width) // 2, (i // cols) * (th + 24)
            sheet.alpha_composite(t, (max(0, x0), y0))
            ImageDraw.Draw(sheet).text(((i % cols) * 220 + 6, y0 + th + 4), k, fill=(255, 255, 255, 255))
        sheet.convert("RGB").save(OUT / "_debug-mouths.png")
    print(f"wrote {OUT / 'manifest.json'} ({len(manifest)} sprites)")


if __name__ == "__main__":
    main()
