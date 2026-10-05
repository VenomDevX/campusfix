"""Issue classifier.

    classify(image, filename, description) -> Classification

Primary path: pretrained CLIP ViT-L/14 zero-shot over the six categories
(services/vision_model.py), fused with keywords from the student's description.
Fallback (CAMPUSFIX_MODEL=heuristic or model unavailable): transparent rules on
keywords + image colour statistics, same interface.
"""

from dataclasses import dataclass

from PIL import Image, ImageStat

from app.services import vision_model

CATEGORIES = ["Plumbing", "Electrical", "Furniture", "Sanitation", "Infrastructure", "Other"]

# keyword -> human-readable signal shown in the AI reasoning
KEYWORDS: dict[str, dict[str, str]] = {
    "Plumbing": {
        "leak": "Detected signs of water leakage", "water": "Water presence detected",
        "pipe": "Pipe damage indicators", "tap": "Faulty tap/fixture", "drip": "Dripping water pattern",
        "flood": "Standing water / flooding", "seep": "Water seepage on surface", "washroom": "Washroom fixture context",
    },
    "Electrical": {
        "switch": "Damaged electrical switch", "wire": "Exposed wiring detected", "spark": "Sparking reported",
        "socket": "Faulty power socket", "light": "Lighting failure", "fan": "Fan malfunction",
        "electric": "Electrical fault indicators", "shock": "Shock hazard reported", "board": "Switchboard damage",
    },
    "Furniture": {
        "chair": "Broken chair detected", "desk": "Damaged desk", "bench": "Damaged bench",
        "table": "Damaged table", "door": "Door/hinge damage", "cupboard": "Cupboard damage", "broken": "Broken object",
    },
    "Sanitation": {
        "garbage": "Garbage accumulation", "dustbin": "Overflowing dustbin", "trash": "Trash accumulation",
        "smell": "Odour complaint", "dirty": "Unclean surface", "waste": "Waste accumulation", "overflow": "Overflowing container",
    },
    "Infrastructure": {
        "crack": "Structural crack detected", "floor": "Floor surface damage", "wall": "Wall damage",
        "ceiling": "Ceiling damage", "tile": "Broken tiles", "plaster": "Plaster falling", "stair": "Stairway damage",
        "pothole": "Pothole / surface damage",
    },
}


@dataclass
class Classification:
    category: str
    confidence: float
    signals: list[str]
    embedding: list[float] | None = None  # CLIP image embedding, for duplicate detection
    model: str = "Heuristic (rules)"


def _image_scores(img: Image.Image) -> dict[str, tuple[float, str]]:
    """Colour-statistics prior: category -> (score, signal). Swap for real model inference later."""
    r, g, b = ImageStat.Stat(img.convert("RGB").resize((64, 64))).mean
    out: dict[str, tuple[float, str]] = {}
    if b > r + 15 and b > g:
        out["Plumbing"] = (0.6, "Blue/water-toned regions in image")
    if g > r + 10 and g > b:
        out["Sanitation"] = (0.5, "Organic/waste colour profile in image")
    if r > g + 30 and r > b + 30:
        out["Electrical"] = (0.5, "High-contrast warning-colour regions in image")
    elif r > b + 25 and g > b + 5:
        out["Furniture"] = (0.5, "Wood/upholstery tones in image")
    if abs(r - g) < 12 and abs(g - b) < 12 and (r + g + b) / 3 > 70:
        out["Infrastructure"] = (0.5, "Concrete/grey surface profile in image")
    return out


def _heuristic_classify(img: Image.Image, filename: str = "", description: str = "") -> Classification:
    text = f"{filename} {description}".lower().replace("_", " ").replace("-", " ")
    image_evidence = _image_scores(img)
    scores = {c: image_evidence.get(c, (0.0, ""))[0] for c in CATEGORIES}
    text_signals: dict[str, list[str]] = {c: [] for c in CATEGORIES}

    # Text evidence (student description + filename) is weighted above the colour prior.
    for category, words in KEYWORDS.items():
        for word, signal in words.items():
            if word in text:
                scores[category] += 1.0
                text_signals[category].append(signal)

    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return Classification("Other", 0.55, ["No strong category signal - routed for manual review"])

    # Confidence: winner's share of evidence, squashed into a believable 0.60-0.98 band.
    share = scores[best] / sum(scores.values())
    confidence = round(min(0.98, 0.6 + 0.38 * share * min(1.0, scores[best] / 1.5)), 2)
    signals = text_signals[best][:2]
    if best in image_evidence:
        signals.append(image_evidence[best][1])
    return Classification(best, confidence, signals)


TEXT_WEIGHT = 0.25  # description keywords nudge the vision result; the photo dominates
MIN_CONFIDENCE = 0.35


def _keyword_hits(text: str) -> tuple[dict[str, int], dict[str, list[str]]]:
    hits = {c: 0 for c in CATEGORIES}
    signals: dict[str, list[str]] = {c: [] for c in CATEGORIES}
    for category, words in KEYWORDS.items():
        for word, signal in words.items():
            if word in text:
                hits[category] += 1
                signals[category].append(signal)
    return hits, signals


def classify(img: Image.Image, filename: str = "", description: str = "") -> Classification:
    model = vision_model.get_model()
    if model is None:
        return _heuristic_classify(img, filename, description)

    probs, embedding = model.analyse(img)
    hits, text_signals = _keyword_hits(f"{filename} {description}".lower().replace("_", " ").replace("-", " "))
    total = sum(hits.values())
    fused = {c: (1 - TEXT_WEIGHT) * probs.get(c, 0.0) + (TEXT_WEIGHT * hits[c] / total if total else 0.0)
             for c in CATEGORIES}
    if not total:  # no description: the image decides alone
        fused = {c: probs.get(c, 0.0) for c in CATEGORIES}

    best = max(fused, key=fused.get)
    confidence = round(min(0.99, fused[best]), 2)
    if best == "Other" or confidence < MIN_CONFIDENCE:
        return Classification("Other", confidence, [f"Vision model found no clear issue type ({confidence:.0%}), sent for manual review"],
                              embedding, model.name)
    signals = [f"Vision model: {best.lower()} issue in photo ({probs[best]:.0%})"] + text_signals[best][:2]
    return Classification(best, confidence, signals, embedding, model.name)
