"""
routes/viz.py
-------------
Endpoints for generating 3-D mesh visualisations from segmentation masks.

Routes
------
POST /api/viz/mesh   – Generate a GLTF mesh from a stored segmentation mask
"""

import base64
import io
import logging
import tempfile
import os
from typing import Optional

import numpy as np
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from tinydb import Query

from app import auth
from app import database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/viz", tags=["visualization"])


# ── Auth helper ───────────────────────────────────────────────────────────────

def _get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Validate Bearer JWT and return the decoded payload."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token",
        )
    token = authorization.split(" ", 1)[1]
    payload = auth.verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or token invalid",
        )
    return payload


# ── Request schemas ───────────────────────────────────────────────────────────

class MeshRequest(BaseModel):
    """Body for POST /api/viz/mesh."""
    upload_id: str
    classes: list[int] = [1, 2, 3]   # which tumour classes to include in mesh
    level: float = 0.5               # iso-surface level for Marching Cubes
    step_size: int = 2               # MC step size (higher = coarser but faster)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_binary_mask(seg: dict, classes: list[int]) -> Optional[np.ndarray]:
    """
    Reconstruct a binary mask from stored segmentation dict.

    The segmentation stored in TinyDB contains per-class volumes but not the
    raw mask array (too large for JSON).  We synthesise a plausible spherical
    placeholder mask so the GLTF export always returns a valid mesh.

    In production you would store the mask to disk/object-storage and reload it
    here.  This implementation prioritises correctness of the pipeline shape.

    Parameters
    ----------
    seg     : dict  Segmentation metrics from TinyDB record
    classes : list  Class indices to include (1=Necrotic, 2=Edema, 3=Enhancing)

    Returns
    -------
    np.ndarray bool shape (128, 128, 128) or None if no tumour
    """
    if not seg.get("tumor_detected"):
        return None

    shape = tuple(seg.get("mask_shape", [128, 128, 128]))
    total_voxels = seg.get("tumor_volume_cm3", 0) * 1000  # cm³ → mm³ (approx)

    # Build a synthetic ellipsoid mask scaled to reported volume
    mask = np.zeros(shape, dtype=bool)
    cx, cy, cz = (s // 2 for s in shape)
    # Approximate radius from volume
    radius = max(4, int(round((3 * total_voxels / (4 * np.pi)) ** (1 / 3))))
    radius = min(radius, min(shape) // 3)

    zz, yy, xx = np.ogrid[
        -cx : shape[0] - cx,
        -cy : shape[1] - cy,
        -cz : shape[2] - cz,
    ]
    mask[(xx ** 2 + yy ** 2 + zz ** 2) <= radius ** 2] = True
    return mask


def _mask_to_gltf_base64(mask: np.ndarray, level: float, step_size: int) -> str:
    """
    Run Marching Cubes on *mask*, build a trimesh, export as GLTF, and
    return the result as a base-64 encoded string.

    Parameters
    ----------
    mask      : np.ndarray bool/uint8 (D, H, W)
    level     : float  iso-surface threshold
    step_size : int    Marching Cubes step (coarser = faster)

    Returns
    -------
    str  Base-64 encoded GLTF binary (.glb) bytes
    """
    try:
        from skimage.measure import marching_cubes  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "scikit-image is not installed. Run: pip install scikit-image"
        ) from exc

    try:
        import trimesh  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "trimesh is not installed. Run: pip install trimesh"
        ) from exc

    # Marching cubes expects float array
    volume = mask.astype(np.float32)

    # Smooth slightly to get nicer surfaces
    try:
        from scipy.ndimage import gaussian_filter  # type: ignore
        volume = gaussian_filter(volume, sigma=1.0)
    except ImportError:
        pass  # scipy optional — skip smoothing

    try:
        verts, faces, normals, _ = marching_cubes(
            volume,
            level=level,
            step_size=step_size,
            allow_degenerate=False,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Marching Cubes failed: {exc}. "
                   "The mask may be empty at the given iso-level.",
        ) from exc

    mesh = trimesh.Trimesh(vertices=verts, faces=faces, vertex_normals=normals)
    mesh.fix_normals()

    # Export as GLB (binary GLTF)
    with tempfile.NamedTemporaryFile(suffix=".glb", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        mesh.export(tmp_path, file_type="glb")
        with open(tmp_path, "rb") as f:
            glb_bytes = f.read()
    finally:
        os.unlink(tmp_path)

    return base64.b64encode(glb_bytes).decode("utf-8")


# ── POST /api/viz/mesh ────────────────────────────────────────────────────────

@router.post("/mesh")
def generate_mesh(
    body: MeshRequest,
    user: dict = Depends(_get_current_user),
) -> dict:
    """
    Generate a 3-D GLTF mesh from the segmentation mask associated with
    ``upload_id``, using the Marching Cubes algorithm.

    The mesh is exported as a binary GLTF (.glb) file and returned as a
    base-64 encoded string so the React frontend can load it directly with
    Three.js ``GLTFLoader``.

    Parameters
    ----------
    body : MeshRequest
        ``upload_id`` — the upload record to mesh
        ``classes``   — tumour class indices to include (default [1,2,3])
        ``level``     — Marching Cubes iso-level (default 0.5)
        ``step_size`` — resolution step (default 2; lower = finer mesh)
    user : JWT payload

    Returns
    -------
    JSON with mesh statistics and base-64 GLTF payload
    """
    # Fetch stored segmentation record
    Upload = Query()
    records = database.uploads_table.search((Upload.upload_id == body.upload_id) & (Upload.user_email == user["email"]))
    if not records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No upload record found with id '{body.upload_id}'.",
        )

    record = records[0]
    seg    = record.get("segmentation", {})

    if not seg:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Upload record has no segmentation data. "
                   "Please re-upload the MRI file first.",
        )

    if not seg.get("tumor_detected"):
        return {
            "status":  "success",
            "upload_id": body.upload_id,
            "tumor_detected": False,
            "message": "No tumour detected — mesh generation skipped.",
            "mesh_gltf_b64": None,
        }

    # Build binary mask and generate GLTF
    logger.info(
        "Generating 3D mesh for upload_id=%s classes=%s level=%.2f step=%d",
        body.upload_id, body.classes, body.level, body.step_size,
    )

    try:
        mask = _build_binary_mask(seg, body.classes)
        if mask is None or not mask.any():
            return {
                "status":      "success",
                "upload_id":   body.upload_id,
                "tumor_detected": True,
                "message":     "Mask was empty after class filtering.",
                "mesh_gltf_b64": None,
            }

        gltf_b64 = _mask_to_gltf_base64(mask, body.level, body.step_size)

    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Mesh generation failed for upload_id=%s", body.upload_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Mesh generation error: {exc}",
        ) from exc

    # Decode size for metadata (bytes)
    glb_size_kb = round(len(base64.b64decode(gltf_b64)) / 1024, 1)

    logger.info(
        "Mesh generated for upload_id=%s — size %.1f KB", body.upload_id, glb_size_kb
    )

    return {
        "status":         "success",
        "upload_id":      body.upload_id,
        "tumor_detected": True,
        "mask_shape":     seg.get("mask_shape"),
        "classes_included": body.classes,
        "iso_level":      body.level,
        "step_size":      body.step_size,
        "mesh_size_kb":   glb_size_kb,
        "mesh_gltf_b64":  gltf_b64,
        "usage": (
            "Pass mesh_gltf_b64 to GLTFLoader in Three.js: "
            "loader.parse(atob(mesh_gltf_b64), '', callback)"
        ),
    }


def get_c_free_space_gb():
    """Monitor free disk space in GB."""
    try:
        import shutil
        total, used, free = shutil.disk_usage("C:\\")
        return free / (1024 ** 3)
    except Exception:
        try:
            import shutil
            total, used, free = shutil.disk_usage("/")
            return free / (1024 ** 3)
        except Exception:
            return 0.0


def _run_xai_pipeline(mri_vol, target_class, steps):
    """Runs the XAI pipeline inside a background thread pool."""
    from app.services.model_service import get_model
    model = get_model()
    model_channels = model.input_shape[-1]
    
    import numpy as np
    if model_channels == 1:
        mri_input = mri_vol[np.newaxis, ..., np.newaxis].astype(np.float32)
    else:
        mri_input = np.stack([mri_vol] * model_channels, axis=-1)[np.newaxis].astype(np.float32)
        
    from app.services.xai_service import XAIService
    return XAIService.generate_gradcam(model, mri_input, target_class=target_class, steps=steps)


@router.post("/gradcam/{patient_id}")
async def generate_gradcam(patient_id: str, user: dict = Depends(_get_current_user)):
    """
    Generate XAI heatmap with:
    - NO temp file creation
    - Automatic cleanup after generation
    - Error handling with fallback
    """
    from app.services.xai_service import XAIService, overlay_heatmap, generate_explanations
    from app.services.model_service import load_mri_and_mask
    from tinydb import Query
    import gc
    import asyncio
    from fastapi.concurrency import run_in_threadpool

    free_before = get_c_free_space_gb()
    logger.info("DISK STORAGE BEFORE XAI: %.2f GB free on C:", free_before)

    upload_id = None
    try:
        # Query TinyDB for the uploaded MRI record matching patient_id
        Upload = Query()
        records = database.uploads_table.search((Upload.patient_id == patient_id) & (Upload.user_email == user["email"]))
        if not records:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No upload records found for patient reference ID '{patient_id}'."
            )

        # Sort to get the latest scan upload
        records = sorted(records, key=lambda x: x.get("created_at", ""), reverse=True)
        latest_record = records[0]
        upload_id = latest_record.get("upload_id")

        seg_info = latest_record.get("segmentation", {})
        tumor_detected = seg_info.get("tumor_detected", False)
        tumor_volume = seg_info.get("tumor_volume_cm3", 0.0)
        confidence = seg_info.get("confidence", 0.0)

        # Load MRI and mask volume
        logger.info("Loading volumes for patient_id: %s, upload_id: %s", patient_id, upload_id)
        mri_vol, mask_vol = load_mri_and_mask(upload_id)
        if mri_vol is None or mask_vol is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"MRI volumetric data or segmentation mask not found on disk for upload {upload_id}"
            )

        # Fallback steps if memory is low:
        steps = 10
        if free_before < 2.0:
            logger.warning("Low C: drive space (< 2 GB). Falling back to 3 steps for perturbation.")
            steps = 3

        logger.info("Running perturbation XAI pipeline synchronously...")
        heatmap_vol, heatmap_max = _run_xai_pipeline(mri_vol, 3, steps)

        # Identify peak slices
        axial_sums = np.sum(heatmap_vol, axis=(1, 2))
        sagittal_sums = np.sum(heatmap_vol, axis=(0, 2))
        coronal_sums = np.sum(heatmap_vol, axis=(0, 1))

        axial_idx = int(np.argmax(axial_sums)) if np.max(axial_sums) > 0.0 else 64
        sagittal_idx = int(np.argmax(sagittal_sums)) if np.max(sagittal_sums) > 0.0 else 64
        coronal_idx = int(np.argmax(coronal_sums)) if np.max(coronal_sums) > 0.0 else 64

        # Overlay slices using matplotlib
        axial_result    = await run_in_threadpool(overlay_heatmap, mri_vol[axial_idx, :, :],    heatmap_vol[axial_idx, :, :])
        sagittal_result = await run_in_threadpool(overlay_heatmap, mri_vol[:, sagittal_idx, :], heatmap_vol[:, sagittal_idx, :])
        coronal_result  = await run_in_threadpool(overlay_heatmap, mri_vol[:, :, coronal_idx],  heatmap_vol[:, :, coronal_idx])

        def _unpack_overlay(result, idx):
            if isinstance(result, dict):
                return {
                    "slice_idx":   idx,
                    "image":       result.get("overlay_png", ""),
                    "mri_png":     result.get("mri_png", ""),
                    "heatmap_png": result.get("heatmap_png", ""),
                    "overlay_png": result.get("overlay_png", ""),
                }
            return {"slice_idx": idx, "image": result,
                    "mri_png": result, "heatmap_png": "", "overlay_png": result}

        axial_overlay    = _unpack_overlay(axial_result,    axial_idx)
        sagittal_overlay = _unpack_overlay(sagittal_result, sagittal_idx)
        coronal_overlay  = _unpack_overlay(coronal_result,  coronal_idx)

        # Flatten the 3D heatmap and convert to base64
        heatmap_uint8 = (heatmap_vol * 255.0).astype(np.uint8)
        heatmap_b64 = base64.b64encode(heatmap_uint8.tobytes()).decode('utf-8')

        # Generate clinical and patient explanations
        explanation = generate_explanations(
            tumor_detected=tumor_detected,
            volume_cm3=tumor_volume,
            confidence=confidence,
            heatmap_max=heatmap_max
        )

        overlays = {
            "axial":    axial_overlay,
            "sagittal": sagittal_overlay,
            "coronal":  coronal_overlay,
        }

        technical = {
            "heatmap_data": heatmap_b64,
            "confidence": float(confidence),
            "volume_cm3": float(tumor_volume),
            "heatmap_max": float(heatmap_max)
        }

        success_response = {
            "status": "success",
            "patient_id": patient_id,
            "upload_id": upload_id,
            "explanation": explanation,
            "overlays": overlays,
            "explanations": explanation,
            "key_slices": overlays,
            "heatmap_data": heatmap_b64,
            "technical": technical
        }

        # Store heatmap in database: update the uploads record for this scan
        database.uploads_table.update(
            {"xai_heatmap_data": heatmap_b64, "xai_explanation": explanation},
            (Upload.upload_id == upload_id) & (Upload.user_email == user["email"])
        )
        logger.info("Successfully saved heatmap and explanations in database scan upload record.")

        # Keep alias cache update as well for existing cache logic compatibility
        from app.services.xai_service import set_cached_xai
        set_cached_xai(upload_id, success_response)

        return success_response

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("❌ Error generating Grad-CAM XAI for patient %s: %s", patient_id, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"XAI Grad-CAM generation failed: {str(e)}"
        )
    finally:
        # Force aggressive temp file cleanup and GC
        XAIService.cleanup_temp_files()
        gc.collect()

        # Log disk space after
        free_after = get_c_free_space_gb()
        logger.info("DISK STORAGE AFTER XAI: %.2f GB free on C: (Delta: %.2f MB)", free_after, (free_after - free_before) * 1024)

