"""Pretrained vision-language model (Hugging Face) for zero-shot issue classification
and image embeddings. Runs fp16 on CUDA when available, else fp32 on CPU.

CAMPUSFIX_MODEL selects the model:
  clip-h    - laion/CLIP-ViT-H-14-laion2B-s32B-b79K (default; best duplicate separation in our eval)
  clip      - openai/clip-vit-large-patch14
  siglip2   - google/siglip2-so400m-patch14-384
  heuristic - no model: rule-based classifier + dHash duplicates
Pre-download weights before the event:  python -c "from services.vision_model import get_model; print(get_model().name)"
"""

import logging
import os
import threading

from PIL import Image

log = logging.getLogger("campusfix.model")

# floor: cosine below which two images are treated as unrelated (rescaled to 0 for duplicates).
# clip-h floor calibrated on 17 real Commons photos: re-shot scenes (crop/tilt/light/blur) score
# >= 0.81, different scenes of the same category <= 0.78. Others use a conservative default.
MODELS = {
    "siglip2": {"id": "google/siglip2-so400m-patch14-384", "name": "SigLIP 2 so400m",
                "text": {"padding": "max_length", "max_length": 64}, "floor": 0.5},
    "clip": {"id": "openai/clip-vit-large-patch14", "name": "CLIP ViT-L/14",
             "text": {"padding": True}, "floor": 0.5},
    "clip-h": {"id": "laion/CLIP-ViT-H-14-laion2B-s32B-b79K", "name": "CLIP ViT-H/14",
               "text": {"padding": True}, "floor": 0.52},
}
DEFAULT_MODEL = "clip-h"


def model_key() -> str:
    return os.getenv("CAMPUSFIX_MODEL", DEFAULT_MODEL).lower()

# Prompt ensembles: several phrasings per category, averaged into one text embedding.
PROMPTS: dict[str, list[str]] = {
    "Plumbing": ["a photo of a water leak", "a leaking pipe", "water dripping from a ceiling or wall",
                 "water stains and damp patches on a ceiling",
                 "a wet floor with a puddle of water", "a broken tap or washroom sink"],
    "Electrical": ["a photo of exposed electrical wires", "a damaged electrical switchboard",
                   "a burnt power socket", "sparks from an electrical fault", "a broken light fixture"],
    "Furniture": ["a photo of a broken chair", "a damaged desk or bench", "broken classroom furniture",
                  "a chair with a snapped leg", "a damaged table"],
    "Sanitation": ["a photo of an overflowing dustbin", "garbage piled on the ground", "trash and litter",
                   "a dirty unclean floor", "waste spilling from a bin"],
    "Infrastructure": ["a photo of a cracked floor", "a crack in a concrete wall", "damaged tiles",
                       "plaster falling from a ceiling", "a pothole in the ground"],
    "Other": ["a photo of a clean room", "a photo of a person", "a photo of a building with no visible damage"],
}


def _features(out):
    """transformers <5 returns a tensor; v5 returns an output whose pooler_output is the projected embedding."""
    return out if hasattr(out, "norm") else out.pooler_output


class _VisionModel:
    def __init__(self, key: str):
        import torch
        from transformers import AutoModel, AutoProcessor

        spec = MODELS[key]
        self.torch = torch
        self.spec = spec
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if self.device == "cuda" else torch.float32
        self.model = AutoModel.from_pretrained(spec["id"], dtype=dtype).to(self.device).eval()
        self.processor = AutoProcessor.from_pretrained(spec["id"])
        self.dtype = dtype
        self.lock = threading.Lock()  # one GPU, serialise requests
        with torch.no_grad():
            cats, mats = [], []
            for cat, prompts in PROMPTS.items():
                t = self.processor(text=prompts, return_tensors="pt", **spec["text"]).to(self.device)
                e = _features(self.model.get_text_features(**t))
                e = e / e.norm(dim=-1, keepdim=True)
                mean = e.mean(dim=0)
                cats.append(cat)
                mats.append(mean / mean.norm())
            self.categories = cats
            self.text = torch.stack(mats)  # [C, D]
            self.temperature = float(self.model.logit_scale.exp())  # learned scale (~100 CLIP, ~110 SigLIP)
        self.name = f"{spec['name']} · {self.device}"
        self.floor = spec["floor"]

    def _image_embedding(self, img: Image.Image):
        px = self.processor(images=img.convert("RGB"), return_tensors="pt")["pixel_values"].to(self.device, self.dtype)
        e = _features(self.model.get_image_features(pixel_values=px))
        return e / e.norm(dim=-1, keepdim=True)

    def analyse(self, img: Image.Image) -> tuple[dict[str, float], list[float]]:
        """Return (category -> probability, normalised image embedding)."""
        torch = self.torch
        with self.lock, torch.no_grad():
            e = self._image_embedding(img)
            logits = self.temperature * e @ self.text.T
            probs = logits.float().softmax(dim=-1)[0].tolist()
        return dict(zip(self.categories, probs)), e[0].float().cpu().tolist()


_model: _VisionModel | None = None
_failed = False
_load_lock = threading.Lock()


def enabled() -> bool:
    return model_key() in MODELS


def get_model() -> _VisionModel | None:
    """Load once; returns None when disabled or unavailable (heuristic fallback)."""
    global _model, _failed
    if not enabled() or _failed:
        return None
    if _model is None:
        with _load_lock:
            if _model is None and not _failed:
                try:
                    _model = _VisionModel(model_key())
                    log.warning("Loaded %s", _model.name)
                except Exception as e:  # missing deps, no weights offline, OOM…
                    _failed = True
                    log.warning("Vision model unavailable, using heuristic classifier: %s", e)
    return _model


def model_name() -> str:
    m = get_model()
    return m.name if m else "Heuristic (rules)"


def warm_up_async():
    """Load in the background at startup so the first upload isn't slow."""
    if enabled():
        threading.Thread(target=get_model, daemon=True).start()
