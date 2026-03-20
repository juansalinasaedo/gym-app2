import numpy as np
from PIL import Image
import io

_model = None

def _get_model():
    global _model
    if _model is None:
        from insightface.app import FaceAnalysis
        _model = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        _model.prepare(ctx_id=0, det_size=(640, 640))
    return _model

def embedding_from_image_bytes(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    arr = np.array(img)
    model = _get_model()
    faces = model.get(arr)
    if not faces:
        raise ValueError("no_face_detected")

    faces.sort(key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)
    emb = faces[0].embedding
    if emb is None:
        raise ValueError("embedding_failed")

    emb = emb / (np.linalg.norm(emb) + 1e-12)  # normalizar
    return emb

def cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
    return float(1.0 - np.dot(a, b))  # ambos normalizados
