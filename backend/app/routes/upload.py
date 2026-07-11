"""
routes/upload.py
----------------
Endpoints for MRI file upload and upload history.

Routes
------
POST /api/upload/mri      – Upload a NIfTI MRI file and run AI segmentation
GET  /api/upload/recent   – Return the 5 most recent uploads
GET  /api/upload/stats    – Aggregate upload statistics
"""

import datetime
import logging
import random
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from tinydb import Query

from app import auth           # noqa: F401
from app import database       # noqa: F401
from app.services.model_service import process_mri_bytes, process_mri_multi, save_mri_and_mask

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/upload", tags=["upload"])

# ── Auth helper (mirrors main.py) ─────────────────────────────────────────────

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


# ── Allowed MIME / extension guard ────────────────────────────────────────────

_ALLOWED_EXTENSIONS = {".nii", ".gz", ".zip", ".dcm"}
_MAX_SIZE_BYTES = 500 * 1024 * 1024   # 500 MB


def _validate_file(file: UploadFile) -> None:
    """Raise 400 if the uploaded file has an unsupported extension."""
    name = (file.filename or "").lower()
    if not any(name.endswith(ext) for ext in _ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{file.filename}'. "
                           f"Allowed: {', '.join(_ALLOWED_EXTENSIONS)}",
        )


# ── POST /api/upload/mri ──────────────────────────────────────────────────────

@router.post("/mri")
async def upload_mri(
    files: List[UploadFile] = File(..., description="NIfTI MRI files (FLAIR, T1ce, T2)"),
    patient_id: Optional[str] = Form(None, description="Optional patient ID (e.g. TX-7430)"),
    user: dict = Depends(_get_current_user),
) -> dict:
    """
    Upload one or more MRI files, run the AI brain-tumour segmentation pipeline,
    persist an upload record in TinyDB, and return segmentation results.

    Parameters
    ----------
    files      : List of Multipart NIfTI uploads
    patient_id : Optional patient reference; auto-generated if omitted
    user       : JWT payload of the authenticated clinician

    Returns
    -------
    JSON response with upload_id and full segmentation metrics
    """
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files uploaded.",
        )

    # Validate and read all files
    files_bytes = []
    total_bytes = 0
    for file in files:
        _validate_file(file)
        file_bytes = await file.read()
        if len(file_bytes) > _MAX_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File '{file.filename}' exceeds maximum allowed size of 500 MB "
                       f"(received {len(file_bytes) / 1e6:.1f} MB)",
            )
        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Uploaded file '{file.filename}' is empty.",
            )
        files_bytes.append(file_bytes)
        total_bytes += len(file_bytes)

    # ── Match modalities (FLAIR, T1ce, T2) ────────────────────────────────────
    flair_bytes = None
    t1ce_bytes = None
    t2_bytes = None

    # Check for explicit keywords first
    for file, f_bytes in zip(files, files_bytes):
        name_lower = file.filename.lower()
        if "flair" in name_lower:
            flair_bytes = f_bytes
        elif "t1ce" in name_lower or "t1" in name_lower:
            t1ce_bytes = f_bytes
        elif "t2" in name_lower:
            t2_bytes = f_bytes

    # Sequential fallback for unmatched files
    assigned_indices = set()
    for idx, (file, f_bytes) in enumerate(zip(files, files_bytes)):
        name_lower = file.filename.lower()
        if "flair" in name_lower or "t1ce" in name_lower or "t1" in name_lower or "t2" in name_lower:
            assigned_indices.add(idx)

    for idx, f_bytes in enumerate(files_bytes):
        if idx in assigned_indices:
            continue
        if flair_bytes is None:
            flair_bytes = f_bytes
        elif t1ce_bytes is None:
            t1ce_bytes = f_bytes
        elif t2_bytes is None:
            t2_bytes = f_bytes

    # Ensure we have at least flair bytes
    if flair_bytes is None and files_bytes:
        flair_bytes = files_bytes[0]

    # Auto-generate patient ID if not supplied
    if not patient_id or not patient_id.strip():
        patient_id = f"TX-{random.randint(1000, 9999)}"
    else:
        patient_id = patient_id.strip()

    upload_id = f"UP-{random.randint(10000, 99999)}"
    now_iso   = datetime.datetime.now(datetime.UTC).isoformat()

    filenames_str = ", ".join([f.filename for f in files])
    logger.info(
        "MRI upload received — upload_id=%s patient_id=%s files=%s total_size=%.2f MB",
        upload_id, patient_id, filenames_str, total_bytes / 1e6,
    )

    # ── Run AI segmentation ───────────────────────────────────────────────────
    try:
        seg_result = process_mri_multi(
            flair_bytes=flair_bytes,
            t1ce_bytes=t1ce_bytes,
            t2_bytes=t2_bytes,
        )
    except FileNotFoundError as exc:
        logger.error("Model file missing: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI model is not available. Please contact the administrator.",
        ) from exc
    except Exception as exc:
        logger.exception("Segmentation failed for upload_id=%s", upload_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Segmentation pipeline error: {str(exc)}",
        ) from exc

    # Remove the raw mask and mri ndarrays — not JSON serialisable
    mask_array = seg_result.pop("mask", None)
    mri_array = seg_result.pop("mri_vol", None)

    # Save to data folder
    if mask_array is not None and mri_array is not None:
        save_mri_and_mask(upload_id, mri_array, mask_array)

    # Convert to base64 for immediate return
    import base64
    import numpy as np
    mri_b64 = ""
    mask_b64 = ""
    if mri_array is not None and mask_array is not None:
        mri_min, mri_max = mri_array.min(), mri_array.max()
        if mri_max > mri_min:
            mri_uint8 = ((mri_array - mri_min) / (mri_max - mri_min) * 255.0).astype(np.uint8)
        else:
            mri_uint8 = mri_array.astype(np.uint8)
        mri_b64 = base64.b64encode(mri_uint8.tobytes()).decode('utf-8')
        mask_b64 = base64.b64encode(mask_array.astype(np.uint8).tobytes()).decode('utf-8')

    # ── Persist record in TinyDB ─────────────────────────────────────────────
    upload_record = {
        "upload_id":   upload_id,
        "patient_id":  patient_id,
        "filename":    filenames_str,
        "file_size_mb": round(total_bytes / 1e6, 2),
        "clinician":   user.get("full_name", "Unknown"),
        "status":      "Completed",
        "progress":    100,
        "segmentation": seg_result,
        "created_at":  now_iso,
        "week":        datetime.datetime.now(datetime.UTC).isocalendar()[1],
        "year":        datetime.datetime.now(datetime.UTC).year,
    }
    database.uploads_table.insert(upload_record)

    # ── Update patient scan count ─────────────────────────────────────────────
    Patient = Query()
    patient_records = database.patients_table.search(Patient.id == patient_id)
    if patient_records:
        curr_count = patient_records[0].get("scan_count", 0)
        database.patients_table.update(
            {"scan_count": curr_count + 1, "updated_at": now_iso},
            Patient.id == patient_id
        )

    # Also add an AI Insight to the dashboard feed
    insight_type = "ANOMALY DETECTED" if seg_result.get("tumor_detected") else "SCAN COMPLETE"
    insight_msg  = (
        f"Tumour detected in patient {patient_id} "
        f"(vol: {seg_result.get('tumor_volume_cm3', 0):.2f} cm³, "
        f"confidence: {seg_result.get('confidence', 0):.1%})."
        if seg_result.get("tumor_detected")
        else f"No tumour found in patient {patient_id} scan — all clear."
    )
    database.insights_table.insert({
        "type":          insight_type,
        "message":       insight_msg,
        "time_relative": "Just now",
        "timestamp":     now_iso,
    })

    logger.info("Upload %s completed successfully.", upload_id)

    return {
        "status":    "success",
        "message":   "MRI processed successfully",
        "upload_id": upload_id,
        "patient_id": patient_id,
        "segmentation": {
            **seg_result,
            "mask": mask_b64,
            "mask_shape": [128, 128, 128]
        },
        "mri_data": mri_b64,
        "mri_shape": [128, 128, 128]
    }


# ── GET /api/upload/recent ────────────────────────────────────────────────────

@router.get("/recent")
def get_recent_uploads(
    limit: int = 5,
    user: dict = Depends(_get_current_user),
) -> dict:
    """
    Return the *limit* most recent MRI uploads (default 5).

    Parameters
    ----------
    limit : int  Number of records to return (capped at 20)
    user  : JWT payload

    Returns
    -------
    JSON list of upload records (newest first)
    """
    limit = min(max(limit, 1), 100)
    all_uploads = database.uploads_table.all()
    # Sort newest first
    sorted_uploads = sorted(
        all_uploads,
        key=lambda r: r.get("created_at", ""),
        reverse=True,
    )
    return {
        "status":  "success",
        "uploads": sorted_uploads[:limit],
        "total":   len(all_uploads),
    }


# ── GET /api/upload/stats ─────────────────────────────────────────────────────

@router.get("/stats")
def get_upload_stats(user: dict = Depends(_get_current_user)) -> dict:
    """
    Return aggregate upload statistics.

    Returns
    -------
    JSON with total uploads, uploads this week, and success rate
    """
    all_uploads = database.uploads_table.all()
    total = len(all_uploads)

    now  = datetime.datetime.now(datetime.UTC)
    this_week_iso = now.isocalendar()[1]
    this_year     = now.year

    this_week = sum(
        1 for r in all_uploads
        if r.get("week") == this_week_iso and r.get("year") == this_year
    )
    completed = sum(1 for r in all_uploads if r.get("status") == "Completed")
    success_rate = round((completed / total * 100), 1) if total > 0 else 0

    return {
        "status":       "success",
        "total":        total,
        "this_week":    this_week,
        "success_rate": success_rate,
    }
