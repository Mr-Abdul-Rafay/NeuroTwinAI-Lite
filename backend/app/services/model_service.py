"""
model_service.py
----------------
Singleton service for loading and running the NeuroTwinAI brain-tumour
segmentation model.  The model is loaded lazily on the first inference
call so that the FastAPI process starts instantly.

Public API
----------
process_mri_bytes(file_bytes)              – single-file (FLAIR only) inference
process_mri_multi(flair, t1ce, t2)         – 3-channel multi-modality inference
run_segmentation_single(file_bytes)        – alias kept for back-compat
run_segmentation_multi(flair, t1ce, t2)    – alias kept for clarity
"""

import logging
import os
from pathlib import Path
from typing import Optional
import numpy as np
import tensorflow as tf

# Force float32 mixed precision policy for CPU inference to prevent MaxPool3D half-precision errors
tf.keras.mixed_precision.set_global_policy('float32')

logger = logging.getLogger(__name__)

# ── Paths ────────────────────────────────────────────────────────────────────
_SERVICE_DIR = Path(__file__).resolve().parent          # app/services/
_APP_DIR     = _SERVICE_DIR.parent                      # app/
_BACKEND_DIR = _APP_DIR.parent                          # backend/
MODEL_PATH   = _BACKEND_DIR / "models" / "best_model_float32.h5"

# ── Model constants ───────────────────────────────────────────────────────────
TARGET_SHAPE  = (128, 128, 128)   # spatial dims the model expects
NUM_CLASSES   = 4                 # 0=Background, 1=Necrotic, 2=Edema, 3=Enhancing
VOXEL_VOL_MM3 = 1.0              # default: assume 1 mm³ per voxel

# ── Lazy singleton ────────────────────────────────────────────────────────────
_model = None


def debug_model_dtype(model):
    """Print model layer dtypes for debugging"""
    logger.info("Model dtype debug:")
    logger.info("   Model dtype policy: %s", getattr(model, 'dtype_policy', 'unknown'))
    for i, layer in enumerate(model.layers[:10]):
        dtype = layer.dtype if hasattr(layer, 'dtype') else 'unknown'
        compute_dtype = layer.compute_dtype if hasattr(layer, 'compute_dtype') else 'unknown'
        logger.info("   Layer %d: %s -> dtype: %s, compute_dtype: %s", i, layer.name, dtype, compute_dtype)


def get_model():
    """
    Return the loaded Keras model, loading it on first call (lazy singleton).

    Returns
    -------
    keras.Model

    Raises
    ------
    FileNotFoundError  if best_model.h5 is not at the expected path.
    RuntimeError       if TensorFlow fails to load the model.
    """
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Model file not found at: {MODEL_PATH}\n"
                "Please ensure best_model.h5 is placed in backend/models/"
            )
        try:
            import tensorflow as tf  # type: ignore
            # Force float32 policy
            tf.keras.mixed_precision.set_global_policy('float32')
            
            logger.info("Loading model from %s …", MODEL_PATH)
            _model = tf.keras.models.load_model(str(MODEL_PATH), compile=False)
            
            # Debug model layers
            debug_model_dtype(_model)
            
            logger.info("Model loaded. Input shape: %s", _model.input_shape)
        except Exception as exc:
            logger.exception("Failed to load model")
            raise RuntimeError(f"Model loading failed: {exc}") from exc
    return _model


# ── NIfTI loading helpers ─────────────────────────────────────────────────────

def _load_nifti_bytes(file_bytes: bytes, suffix: str = ".nii.gz") -> tuple[np.ndarray, dict]:
    """
    Write raw bytes to a temp file, load with nibabel, return (data, meta).

    Parameters
    ----------
    file_bytes : bytes   Raw .nii / .nii.gz content.
    suffix     : str     Extension hint for temp file (default .nii.gz).

    Returns
    -------
    data : np.ndarray  float32, shape (D, H, W)
    meta : dict        voxel_vol_mm3, original_shape
    """
    import tempfile
    import nibabel as nib  # type: ignore

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        img  = nib.load(tmp_path)
        data = img.get_fdata(dtype=np.float32)
        zooms = img.header.get_zooms()[:3]
        voxel_vol_mm3 = float(np.prod(zooms)) if all(z > 0 for z in zooms) else 1.0
        meta = {"voxel_vol_mm3": voxel_vol_mm3, "original_shape": data.shape[:3]}
    finally:
        os.unlink(tmp_path)

    # Take first volume if 4-D (e.g. fMRI series)
    if data.ndim == 4:
        data = data[..., 0]

    return data, meta


def _normalize(volume: np.ndarray) -> np.ndarray:
    """
    Z-score normalise using brain (non-zero) voxels only, then clip to [-5, 5].

    Parameters
    ----------
    volume : np.ndarray  float32, shape (D, H, W)

    Returns
    -------
    np.ndarray  float32, same shape, normalised.
    """
    brain_mask = volume > 0
    if brain_mask.sum() > 0:
        mean = volume[brain_mask].mean()
        std  = volume[brain_mask].std()
        volume = (volume - mean) / std if std > 0 else (volume - mean)
    return np.clip(volume, -5.0, 5.0)


def _resize_volume(volume: np.ndarray, target: tuple) -> np.ndarray:
    """
    Resize a 3-D numpy array to *target* shape via zoom interpolation.

    Parameters
    ----------
    volume : np.ndarray  shape (D, H, W)
    target : tuple       (D, H, W)

    Returns
    -------
    np.ndarray  float32, shape target.
    """
    from scipy.ndimage import zoom  # type: ignore
    factors = tuple(t / s for t, s in zip(target, volume.shape))
    return zoom(volume, factors, order=1).astype(np.float32)


def _to_target_shape(volume: np.ndarray) -> np.ndarray:
    """Crop or resize volume to TARGET_SHAPE."""
    if volume.shape[:3] != TARGET_SHAPE:
        # Crop first axis if drastically larger, then zoom
        if volume.shape[0] > TARGET_SHAPE[0]:
            volume = volume[:TARGET_SHAPE[0]]
        volume = _resize_volume(volume, TARGET_SHAPE)
    return volume


# ── Shared inference engine ───────────────────────────────────────────────────

def _run_inference(tensor: np.ndarray, voxel_vol_mm3: float = 1.0) -> dict:
    """
    Run model.predict on *tensor* and return tumour metrics dict.

    Parameters
    ----------
    tensor       : np.ndarray  shape (1, 128, 128, 128, C)   float32
    voxel_vol_mm3: float  Physical volume of one voxel in mm³.

    Returns
    -------
    dict  with tumor_detected, volumes, confidence, mask_shape, mask(ndarray).
    """
    model = get_model()

    logger.info("Running inference on tensor shape %s …", tensor.shape)
    raw_output = model.predict(tensor, verbose=0)   # (1, 128, 128, 128, 4)

    probs = raw_output[0]                                    # (128, 128, 128, 4)
    mask  = np.argmax(probs, axis=-1).astype(np.uint8)       # (128, 128, 128)

    # Per-class voxel counts
    necrotic_vox  = int(np.sum(mask == 1))
    edema_vox     = int(np.sum(mask == 2))
    enhancing_vox = int(np.sum(mask == 3))
    tumour_vox    = necrotic_vox + edema_vox + enhancing_vox
    tumour_detected = tumour_vox > 0

    necrotic_vol_mm3  = round(necrotic_vox  * voxel_vol_mm3, 2)
    edema_vol_mm3     = round(edema_vox     * voxel_vol_mm3, 2)
    enhancing_vol_mm3 = round(enhancing_vox * voxel_vol_mm3, 2)
    tumour_vol_mm3    = necrotic_vol_mm3 + edema_vol_mm3 + enhancing_vol_mm3
    tumour_vol_cm3    = round(tumour_vol_mm3 / 1000.0, 3)

    if tumour_detected:
        confidence = float(round(probs[mask > 0].max(axis=-1).mean(), 4))
    else:
        confidence = float(round(probs[mask == 0][:, 0].mean(), 4))

    logger.info(
        "Segmentation done — detected=%s vol=%.3f cm³ conf=%.4f",
        tumour_detected, tumour_vol_cm3, confidence,
    )

    return {
        "tumor_detected":       tumour_detected,
        "tumor_volume_cm3":     tumour_vol_cm3,
        "confidence":           confidence,
        "necrotic_volume_mm3":  necrotic_vol_mm3,
        "edema_volume_mm3":     edema_vol_mm3,
        "enhancing_volume_mm3": enhancing_vol_mm3,
        "mask_shape":           list(mask.shape),
        "mask":                 mask,
        "mri_vol":              tensor[0, ..., 0],
    }


# ── Single-modality pipeline ──────────────────────────────────────────────────

def preprocess_nifti(file_bytes: bytes) -> tuple[np.ndarray, dict]:
    """
    Load a NIfTI from raw bytes, normalise, resize, add batch/channel dims.

    Returns
    -------
    tensor : np.ndarray  shape (1, 128, 128, 128, 1)  float32
    meta   : dict        voxel_vol_mm3, original_shape
    """
    data, meta = _load_nifti_bytes(file_bytes)
    data = _normalize(data)
    data = _to_target_shape(data)
    tensor = data[np.newaxis, ..., np.newaxis].astype(np.float32)
    return tensor, meta


def run_segmentation(tensor: np.ndarray, meta: dict) -> dict:
    """Run inference on a single-channel (1, 128, 128, 128, 1) tensor."""
    return _run_inference(tensor, meta.get("voxel_vol_mm3", 1.0))


def process_mri_bytes(file_bytes: bytes) -> dict:
    """
    End-to-end helper: single NIfTI bytes → segmentation results dict.
    Kept as the primary single-file entry point (FLAIR channel replicated to 3).
    """
    data, meta = _load_nifti_bytes(file_bytes)
    data = _normalize(data)
    data = _to_target_shape(data)

    # The trained model may expect 1-channel OR 3-channel input.
    # Detect dynamically from the model's input spec.
    model = get_model()
    model_channels = model.input_shape[-1]   # last dim of (batch, D, H, W, C)

    if model_channels == 1:
        tensor = data[np.newaxis, ..., np.newaxis].astype(np.float32)
    else:
        # Replicate single FLAIR channel to match expected number of channels
        tensor = np.stack([data] * model_channels, axis=-1)[np.newaxis].astype(np.float32)

    return _run_inference(tensor, meta.get("voxel_vol_mm3", 1.0))


# ── Back-compat alias ─────────────────────────────────────────────────────────
run_segmentation_single = process_mri_bytes


# ── Multi-modality pipeline ───────────────────────────────────────────────────

def process_mri_multi(
    flair_bytes: bytes,
    t1ce_bytes: Optional[bytes] = None,
    t2_bytes:   Optional[bytes] = None,
) -> dict:
    """
    Run segmentation using up to 3 MRI modalities (FLAIR, T1ce, T2).

    Each modality is:
        1. Loaded from raw NIfTI bytes
        2. Z-score normalised (brain voxels only)
        3. Resized to TARGET_SHAPE (128×128×128)

    The three volumes are then stacked along the channel axis:
        shape (1, 128, 128, 128, 3)

    If T1ce / T2 bytes are missing, the FLAIR channel is replicated
    to fill the missing slots so the model always receives the correct
    number of channels.

    Parameters
    ----------
    flair_bytes : bytes   Required — FLAIR modality
    t1ce_bytes  : bytes   Optional — T1ce modality
    t2_bytes    : bytes   Optional — T2 modality

    Returns
    -------
    dict  (same schema as :func:`process_mri_bytes`)
    """
    # ── Load & preprocess FLAIR (always present) ──────────────────────────────
    flair, meta = _load_nifti_bytes(flair_bytes)
    flair = _normalize(flair)
    flair = _to_target_shape(flair)          # (128, 128, 128) float32
    voxel_vol = meta.get("voxel_vol_mm3", 1.0)

    # ── Load & preprocess T1ce ────────────────────────────────────────────────
    if t1ce_bytes:
        t1ce, _ = _load_nifti_bytes(t1ce_bytes)
        t1ce = _normalize(t1ce)
        t1ce = _to_target_shape(t1ce)
    else:
        logger.warning("T1ce not provided — replicating FLAIR channel.")
        t1ce = flair.copy()

    # ── Load & preprocess T2 ──────────────────────────────────────────────────
    if t2_bytes:
        t2, _ = _load_nifti_bytes(t2_bytes)
        t2 = _normalize(t2)
        t2 = _to_target_shape(t2)
    else:
        logger.warning("T2 not provided — replicating FLAIR channel.")
        t2 = flair.copy()

    # ── Detect model channel count and build tensor ───────────────────────────
    model = get_model()
    model_channels = model.input_shape[-1]

    if model_channels == 1:
        # 1-channel model: use only FLAIR
        logger.info("1-channel model detected — using FLAIR channel only.")
        tensor = flair[np.newaxis, ..., np.newaxis].astype(np.float32)
    elif model_channels == 3:
        # 3-channel model: stack FLAIR, T1ce, T2
        logger.info("3-channel model detected — stacking FLAIR + T1ce + T2.")
        tensor = np.stack([flair, t1ce, t2], axis=-1)[np.newaxis].astype(np.float32)
    else:
        # Generic fallback: replicate flair to fill all channels
        logger.warning("Unexpected channel count %d — replicating FLAIR.", model_channels)
        tensor = np.stack([flair] * model_channels, axis=-1)[np.newaxis].astype(np.float32)

    logger.info("Multi-modal tensor shape: %s", tensor.shape)
    return _run_inference(tensor, voxel_vol)


# Back-compat alias
run_segmentation_multi = process_mri_multi


def save_mri_and_mask(upload_id: str, mri_vol: np.ndarray, mask_vol: np.ndarray):
    import os
    data_dir = str(_BACKEND_DIR / "data")
    os.makedirs(data_dir, exist_ok=True)
    np.save(os.path.join(data_dir, f"{upload_id}_mri.npy"), mri_vol)
    np.save(os.path.join(data_dir, f"{upload_id}_mask.npy"), mask_vol)


def load_mri_and_mask(upload_id: str) -> tuple[np.ndarray | None, np.ndarray | None]:
    import os
    data_dir = str(_BACKEND_DIR / "data")
    mri_path = os.path.join(data_dir, f"{upload_id}_mri.npy")
    mask_path = os.path.join(data_dir, f"{upload_id}_mask.npy")
    if os.path.exists(mri_path) and os.path.exists(mask_path):
        try:
            return np.load(mri_path), np.load(mask_path)
        except Exception:
            return None, None
    return None, None
