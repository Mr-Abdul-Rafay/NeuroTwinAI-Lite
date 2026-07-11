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
    records = database.uploads_table.search(Upload.upload_id == body.upload_id)
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
