"""
routes/inference.py
-------------------
Endpoints for running the AI segmentation pipeline and retrieving results.

Routes
------
POST /api/inference/segment       – Run segmentation on an uploaded file (by upload_id)
GET  /api/inference/result/{id}   – Retrieve segmentation result by upload_id
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from tinydb import Query

from app import auth
from app import database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/inference", tags=["inference"])


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

class SegmentRequest(BaseModel):
    """Body for POST /api/inference/segment."""
    upload_id: str


# ── POST /api/inference/segment ───────────────────────────────────────────────

@router.post("/segment")
async def run_segment(
    body: SegmentRequest,
    user: dict = Depends(_get_current_user),
) -> dict:
    """
    Re-run the AI segmentation pipeline on an already-uploaded MRI record.

    This is useful if the initial upload ran without segmentation (e.g. large
    file queued) or to force a fresh inference pass.

    Parameters
    ----------
    body : SegmentRequest  JSON body containing ``upload_id``
    user : JWT payload

    Returns
    -------
    JSON with updated segmentation metrics
    """
    Upload = Query()
    records = database.uploads_table.search(Upload.upload_id == body.upload_id)
    if not records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No upload record found with id '{body.upload_id}'.",
        )

    record = records[0]

    # If the record already has a completed segmentation, return it
    existing_seg = record.get("segmentation")
    if existing_seg and existing_seg.get("mask_shape"):
        logger.info("Returning cached segmentation for upload_id=%s", body.upload_id)
        return {
            "status":      "success",
            "upload_id":   body.upload_id,
            "cached":      True,
            "segmentation": existing_seg,
        }

    # Otherwise, we cannot re-run without the original file bytes.
    # Return a 422 indicating the raw file must be re-uploaded.
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=(
            "Raw file bytes are not stored server-side for security reasons. "
            "Please re-upload the MRI file via POST /api/upload/mri to trigger "
            "a fresh segmentation."
        ),
    )


# ── GET /api/inference/result/{id} ───────────────────────────────────────────

from app.services.model_service import load_mri_and_mask

@router.get("/result/{upload_id}")
def get_result(
    upload_id: str,
    user: dict = Depends(_get_current_user),
) -> dict:
    """
    Retrieve the stored segmentation result and volume slices for a given ``upload_id``.

    Parameters
    ----------
    upload_id : str  Path parameter — the upload identifier (e.g. ``UP-12345``)
    user      : JWT payload

    Returns
    -------
    JSON containing the full upload record including segmentation metrics
    """
    Upload = Query()
    records = database.uploads_table.search(Upload.upload_id == upload_id)
    if not records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No result found for upload_id '{upload_id}'.",
        )

    record = records[0]
    seg    = record.get("segmentation", {})

    # Load raw MRI and mask arrays from disk and encode them as base64
    mri_arr, mask_arr = load_mri_and_mask(upload_id)
    mri_b64 = ""
    mask_b64 = ""
    if mri_arr is not None and mask_arr is not None:
        import base64
        import numpy as np
        mri_min, mri_max = mri_arr.min(), mri_arr.max()
        if mri_max > mri_min:
            mri_uint8 = ((mri_arr - mri_min) / (mri_max - mri_min) * 255.0).astype(np.uint8)
        else:
            mri_uint8 = mri_arr.astype(np.uint8)
        mri_b64 = base64.b64encode(mri_uint8.tobytes()).decode('utf-8')
        mask_b64 = base64.b64encode(mask_arr.astype(np.uint8).tobytes()).decode('utf-8')

    return {
        "status":      "success",
        "upload_id":   upload_id,
        "patient_id":  record.get("patient_id"),
        "filename":    record.get("filename"),
        "clinician":   record.get("clinician"),
        "created_at":  record.get("created_at"),
        "upload_status": record.get("status"),
        "segmentation": {
            **seg,
            "mask": mask_b64,
            "mask_shape": [128, 128, 128]
        },
        "mri_data": mri_b64,
        "mri_shape": [128, 128, 128],
        "summary": {
            "tumor_detected":    seg.get("tumor_detected", False),
            "tumor_volume_cm3":  seg.get("tumor_volume_cm3", 0),
            "confidence_pct":    round(seg.get("confidence", 0) * 100, 1),
        },
    }


@router.get("/result/{upload_id}/slices")
def get_slices(
    upload_id: str,
    user: dict = Depends(_get_current_user),
) -> dict:
    """
    Get raw volume slice data for visualization.
    """
    mri_arr, mask_arr = load_mri_and_mask(upload_id)
    if mri_arr is None or mask_arr is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Slice data not found for this upload."
        )

    import base64
    import numpy as np
    mri_min, mri_max = mri_arr.min(), mri_arr.max()
    if mri_max > mri_min:
        mri_uint8 = ((mri_arr - mri_min) / (mri_max - mri_min) * 255.0).astype(np.uint8)
    else:
        mri_uint8 = mri_arr.astype(np.uint8)

    mri_b64 = base64.b64encode(mri_uint8.tobytes()).decode('utf-8')
    mask_b64 = base64.b64encode(mask_arr.astype(np.uint8).tobytes()).decode('utf-8')

    return {
        "status": "success",
        "upload_id": upload_id,
        "mri_data": mri_b64,
        "mask_data": mask_b64,
        "shape": [128, 128, 128]
    }


# ── GET /api/inference/model-info ────────────────────────────────────────────

@router.get("/model-info")
def model_info(user: dict = Depends(_get_current_user)) -> dict:
    """
    Return metadata about the loaded model without triggering a full load.

    Returns
    -------
    JSON with model path, input shape, and class definitions
    """
    from app.services.model_service import MODEL_PATH, TARGET_SHAPE, NUM_CLASSES

    return {
        "status":       "success",
        "model_path":   str(MODEL_PATH),
        "model_exists": MODEL_PATH.exists(),
        "input_shape":  list(TARGET_SHAPE),
        "num_classes":  NUM_CLASSES,
        "classes": {
            0: "Background",
            1: "Necrotic Core",
            2: "Peritumoral Edema",
            3: "Enhancing Tumour",
        },
    }
