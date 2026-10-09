"""Compose one painted test frame: generated kitchen background + character
cut-outs (white backgrounds removed), to judge the storybook look before any
animation. Usage: python3 tools/compose_frame.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SHEETS = ROOT / "art" / "family" / "sheets"
OUT = ROOT / "art" / "family" / "frame-test.png"
WHITE_THRESHOLD = 236  # pixels brighter than this on all channels are background
FRAME = (1920, 1080)


def cutout(path: Path) -> Image.Image:
    """Removes the near-white background by flood-filling from the edges, so
    white clothes inside the figure are kept."""
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    mask = Image.new("L", (w, h), 255)
    px = img.load()
    bg = Image.new("L", (w, h), 0)
    bgpx = bg.load()
    # mark near-white pixels
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if r > WHITE_THRESHOLD and g > WHITE_THRESHOLD and b > WHITE_THRESHOLD:
                bgpx[x, y] = 255
    # keep only the white region connected to the border
    border = Image.new("L", (w, h), 0)
    ImageDraw.floodfill(bg, (0, 0), 128)
    ImageDraw.floodfill(bg, (w - 1, 0), 128)
    ImageDraw.floodfill(bg, (0, h - 1), 128)
    ImageDraw.floodfill(bg, (w - 1, h - 1), 128)
    outside = bg.point(lambda v: 255 if v == 128 else 0)
    alpha = outside.point(lambda v: 0 if v else 255).filter(ImageFilter.GaussianBlur(1.2))
    img.putalpha(alpha)
    return img


def place(canvas: Image.Image, sprite: Image.Image, feet_x: int, feet_y: int, height: int) -> None:
    ratio = height / sprite.height
    resized = sprite.resize((int(sprite.width * ratio), height), Image.LANCZOS)
    shadow = Image.new("RGBA", (resized.width, 40), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse((resized.width * 0.2, 4, resized.width * 0.8, 36), fill=(30, 20, 10, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(6))
    canvas.alpha_composite(shadow, (feet_x - resized.width // 2, feet_y - 20))
    canvas.alpha_composite(resized, (feet_x - resized.width // 2, feet_y - height))


def main() -> None:
    kitchen = Image.open(SHEETS / "kitchen.png").convert("RGBA").resize(FRAME, Image.LANCZOS)
    place(kitchen, cutout(SHEETS / "mom.png"), 420, 1040, 760)
    place(kitchen, cutout(SHEETS / "emma.png"), 1120, 1050, 620)
    place(kitchen, cutout(SHEETS / "leo.png"), 820, 1055, 480)
    place(kitchen, cutout(SHEETS / "dad.png"), 1640, 1040, 800)
    kitchen.convert("RGB").save(OUT, quality=92)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
