"""Lazy CPU runtimes; imported only by the dedicated evidence worker."""
import os
from pathlib import Path
import threading

_models = {}
_lock = threading.Lock()


def get_paddle_ocr():
    with _lock:
        if 'ocr' not in _models:
            cache = Path(os.getenv('PASSPORT_VISION_CACHE', '.cache/passport-vision')).resolve()
            os.environ.setdefault('PADDLE_PDX_CACHE_HOME', str(cache/'paddle'))
            os.environ.setdefault('PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK', 'True')
            from paddleocr import PaddleOCR
            _models['ocr'] = PaddleOCR(
                text_detection_model_name='PP-OCRv5_mobile_det',
                text_recognition_model_name='en_PP-OCRv5_mobile_rec',
                use_doc_orientation_classify=False, use_doc_unwarping=False,
                use_textline_orientation=False, device='cpu', enable_mkldnn=False, cpu_threads=2)
        return _models['ocr']


def analyse_scene(path, labels, *, ocr=False, box=None):
    # Keep API/planner containers free of model imports and large dependencies.
    cache = Path(os.getenv('PASSPORT_VISION_CACHE', '.cache/passport-vision')).resolve()
    os.environ.setdefault('HF_HOME', str(cache/'huggingface'))
    os.environ.setdefault('PADDLE_PDX_CACHE_HOME', str(cache/'paddle'))
    os.environ.setdefault('PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK', 'True')
    from PIL import Image, ImageOps
    import numpy as np
    import torch
    from transformers import AutoProcessor, AutoModel
    with _lock:
        if 'scene' not in _models:
            torch.set_num_threads(2)
            model_id = 'google/siglip2-base-patch16-224'
            _models['scene'] = (AutoProcessor.from_pretrained(model_id, use_fast=False),
                                AutoModel.from_pretrained(model_id, use_safetensors=True).eval())
        if ocr and 'ocr' not in _models:
            get_paddle_ocr()
        with Image.open(path) as original:
            image = ImageOps.exif_transpose(original).convert('RGB')
            if box is not None:
                image = image.crop(box)
            image.thumbnail((1800, 1800))
        processor, model = _models['scene']
        inputs = processor(text=labels, images=image, padding='max_length', max_length=64,
                           truncation=True, return_tensors='pt')
        with torch.inference_mode():
            scores = torch.sigmoid(model(**inputs).logits_per_image[0]).tolist()
        lines = []
        if not ocr:
            return {'scores': scores, 'lines': lines}
        for output in _models['ocr'].predict(np.array(image)):
            data = output.json
            if callable(data):
                data = data()
            if isinstance(data, str):
                import json
                data = json.loads(data)
            data = data.get('res', data)
            for text, score, box in zip(data.get('rec_texts', []), data.get('rec_scores', []), data.get('rec_polys', [])):
                lines.append({'text': text, 'score': float(score), 'polygon': box.tolist() if hasattr(box, 'tolist') else box})
        return {'scores': scores, 'lines': lines}


def analyse_boxing(path):
    # Backwards-compatible entry point for the existing worker/tests.
    from .boxing_rules import LABELS
    return analyse_scene(path, LABELS, ocr=True)


def analyse_evidence(path, evaluator, boxes):
    return [analyse_scene(path, evaluator.labels, ocr=evaluator.ocr, box=box) for box in boxes]
