"""Procedurally drawn placeholder issue photos for seed data and the demo picker.

Replace with real campus photos for the final demo: drop JPGs into
frontend/public/samples/ (keep descriptive filenames like water_leak_*.jpg).
"""

import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

W, H = 800, 600


def _noise(img: Image.Image, rng: random.Random, amount: int = 14) -> Image.Image:
    px = img.load()
    for _ in range(W * H // 6):
        x, y = rng.randrange(W), rng.randrange(H)
        r, g, b = px[x, y]
        d = rng.randint(-amount, amount)
        px[x, y] = (max(0, min(255, r + d)), max(0, min(255, g + d)), max(0, min(255, b + d)))
    return img.filter(ImageFilter.GaussianBlur(1.2))


def water_leak(rng):
    img = Image.new("RGB", (W, H), (150, 185, 215))
    d = ImageDraw.Draw(img)
    for x in range(0, W, 80):  # wall tiles
        d.line([(x, 0), (x, 420)], fill=(120, 160, 195), width=3)
    for y in range(0, 420, 80):
        d.line([(0, y), (W, y)], fill=(120, 160, 195), width=3)
    d.rectangle([0, 420, W, H], fill=(95, 120, 150))  # floor
    d.rectangle([330, 0, 380, 120], fill=(110, 115, 125))  # pipe
    d.ellipse([300, 90, 420, 200], fill=(70, 95, 130))  # damp stain
    for i in range(14):  # drip streaks
        x = 320 + rng.randint(0, 80)
        d.line([(x, 150), (x + rng.randint(-6, 6), 420)], fill=(60, 110, 175), width=rng.randint(3, 7))
    d.ellipse([180, 450, 620, 580], fill=(55, 105, 170))  # puddle
    d.ellipse([260, 480, 420, 530], fill=(140, 185, 230))  # reflection
    return img


def broken_chair(rng):
    img = Image.new("RGB", (W, H), (232, 222, 200))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 430, W, H], fill=(205, 195, 175))
    brown, dark = (150, 100, 55), (110, 70, 35)
    d.rectangle([300, 120, 520, 160], fill=brown)  # backrest
    d.rectangle([310, 160, 330, 300], fill=dark)
    d.rectangle([490, 160, 510, 300], fill=dark)
    d.polygon([(280, 300), (540, 300), (560, 340), (300, 345)], fill=brown)  # seat, tilted
    d.rectangle([300, 340, 320, 480], fill=dark)
    d.rectangle([520, 335, 540, 470], fill=dark)
    d.line([(340, 345), (360, 410)], fill=dark, width=18)  # snapped leg
    d.line([(390, 520), (470, 545)], fill=dark, width=18)  # broken piece on floor
    return img


def overflowing_dustbin(rng):
    img = Image.new("RGB", (W, H), (120, 160, 95))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 260], fill=(180, 190, 170))
    d.rectangle([300, 220, 500, 520], fill=(40, 120, 60))  # bin
    d.rectangle([290, 210, 510, 240], fill=(30, 95, 45))
    for _ in range(40):  # spilled trash
        x, y = rng.randint(220, 600), rng.randint(150, 580)
        if 300 < x < 500 and 240 < y < 520:
            continue
        c = rng.choice([(230, 230, 220), (200, 60, 50), (240, 200, 60), (90, 70, 50), (200, 200, 210)])
        d.rectangle([x, y, x + rng.randint(15, 45), y + rng.randint(10, 30)], fill=c)
    return img


def damaged_switch(rng):
    img = Image.new("RGB", (W, H), (205, 120, 80))
    d = ImageDraw.Draw(img)
    d.rectangle([250, 150, 550, 450], fill=(235, 230, 220))  # switchboard
    for i, x in enumerate([290, 370, 450]):
        d.rectangle([x, 230, x + 50, 320], fill=(250, 250, 245), outline=(120, 120, 120), width=3)
    d.ellipse([350, 200, 520, 380], fill=(45, 35, 30))  # burn mark
    for _ in range(25):  # sparks
        x, y = rng.randint(380, 560), rng.randint(180, 400)
        d.line([(x, y), (x + rng.randint(-25, 25), y + rng.randint(-25, 25))], fill=(255, 200, 40), width=3)
    d.line([(430, 300), (600, 560)], fill=(220, 40, 30), width=8)  # exposed wire
    d.line([(450, 310), (640, 540)], fill=(240, 200, 30), width=8)
    return img


def cracked_floor(rng):
    img = Image.new("RGB", (W, H), (165, 165, 160))
    d = ImageDraw.Draw(img)
    for x in range(0, W, 200):
        d.line([(x, 0), (x, H)], fill=(140, 140, 135), width=4)
    for y in range(0, H, 200):
        d.line([(0, y), (W, y)], fill=(140, 140, 135), width=4)
    for _ in range(3):  # branching cracks
        x, y = rng.randint(100, 700), 0
        while y < H:
            nx, ny = x + rng.randint(-40, 40), y + rng.randint(20, 60)
            d.line([(x, y), (nx, ny)], fill=(40, 40, 40), width=rng.randint(4, 9))
            if rng.random() < 0.3:
                d.line([(nx, ny), (nx + rng.randint(-80, 80), ny + rng.randint(10, 60))], fill=(60, 60, 60), width=3)
            x, y = nx, ny
    return img


def exposed_wiring(rng):
    img = Image.new("RGB", (W, H), (190, 120, 90))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 180], fill=(150, 150, 150))  # ceiling panel
    d.rectangle([300, 120, 500, 200], fill=(40, 40, 40))  # open panel
    for c, off in [((220, 40, 30), 0), ((30, 30, 30), 25), ((240, 200, 30), 50), ((40, 110, 200), 75)]:
        pts = [(330 + off, 180)] + [(330 + off + rng.randint(-60, 60), 180 + k * 70) for k in range(1, 6)]
        d.line(pts, fill=c, width=9)
    for _ in range(15):
        x, y = rng.randint(250, 550), rng.randint(300, 500)
        d.line([(x, y), (x + rng.randint(-20, 20), y + rng.randint(-20, 20))], fill=(255, 220, 60), width=3)
    return img


GENERATORS = {
    "water_leak": water_leak, "broken_chair": broken_chair, "overflowing_dustbin": overflowing_dustbin,
    "damaged_switch": damaged_switch, "cracked_floor": cracked_floor, "exposed_wiring": exposed_wiring,
}


def make(kind: str, seed: int = 0) -> Image.Image:
    rng = random.Random(f"{kind}-{seed}")
    return _noise(GENERATORS[kind](rng), rng)


def export_samples(out_dir: Path):
    """Write the demo picker images (same seed as the seeded tickets, so duplicates trigger)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    for kind in GENERATORS:
        make(kind).save(out_dir / f"{kind}.jpg", "JPEG", quality=88)


if __name__ == "__main__":
    export_samples(Path(__file__).parent.parent / "frontend" / "public" / "samples")
    print("samples written")
