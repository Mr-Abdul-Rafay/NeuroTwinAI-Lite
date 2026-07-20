"""
routes/inference.py
-------------------
Endpoints for running the AI segmentation pipeline and retrieving results.

Routes
------
POST /api/inference/segment       – Run segmentation on an uploaded file (by upload_id)
GET  /api/inference/result/{id}   – Retrieve segmentation result by upload_id
"""

import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from tinydb import Query

from app import auth
from app import database

logger = logging.getLogger(__name__)

# ── XAI concurrency control ──────────────────────────────────────────────────
# Only 1 XAI job runs at a time (CPU-bound; concurrent jobs saturate threadpool
# and all timeout).  Extra callers for the *same* upload_id get the cached
# result once the single running job finishes.
_xai_semaphore = asyncio.Semaphore(1)
# upload_id -> asyncio.Event that is set when the job completes
_xai_inflight: dict[str, asyncio.Event] = {}

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
    Retrieve the stored segmentation result and volume slices for a given ``upload_id``, verifying ownership.

    Parameters
    ----------
    upload_id : str  Path parameter — the upload identifier (e.g. ``UP-12345``)
    user      : JWT payload

    Returns
    -------
    JSON containing the full upload record including segmentation metrics
    """
    Upload = Query()
    records = database.uploads_table.search((Upload.upload_id == upload_id) & (Upload.user_email == user["email"]))
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
    Get raw volume slice data for visualization, verifying ownership first.
    """
    Upload = Query()
    records = database.uploads_table.search((Upload.upload_id == upload_id) & (Upload.user_email == user["email"]))
    if not records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload record not found or access denied."
        )

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


# ── POST /api/inference/xai/gradcam/{upload_id} ──────────────────────────────

@router.post("/xai/gradcam/{upload_id}")
async def generate_gradcam_xai(upload_id: str, user: dict = Depends(_get_current_user)):
    """
    Generate 3-D Grad-CAM heatmap volume, pre-render maximum activation slices,
    generate clinical explanations, and return results.

    Concurrency strategy
    --------------------
    * At most ONE perturbation-saliency job runs at a time (semaphore=1).
    * If the same upload_id is already being processed, the caller waits for
      that job's asyncio.Event to fire and then returns from cache — no duplicate
      heavy computation.
    """
    from fastapi.responses import JSONResponse
    from fastapi.concurrency import run_in_threadpool
    from app.services.xai_service import (
        get_cached_xai,
        set_cached_xai,
        generate_gradcam_volume,
        overlay_heatmap,
        generate_explanations
    )
    import base64
    import numpy as np

    logger.info("XAI request received for upload_id: %s", upload_id)

    # ── 1. Return from cache immediately if available ─────────────────────────
    cached_res = get_cached_xai(upload_id)
    if cached_res is not None:
        # Cache-bust: discard cached responses that pre-date the layered-image
        # format (missing separate mri_png / heatmap_png fields in key_slices).
        has_new_format = (
            isinstance(cached_res.get("key_slices"), dict)
            and isinstance(cached_res["key_slices"].get("axial"), dict)
            and "mri_png" in cached_res["key_slices"]["axial"]
        )
        if has_new_format:
            logger.info("XAI cache hit for upload_id: %s", upload_id)
            return JSONResponse(cached_res)
        logger.info("XAI cache is old format — discarding and recomputing: %s", upload_id)

    # ── 2. If another coroutine is already computing this upload, wait for it ─
    if upload_id in _xai_inflight:
        logger.info("XAI job already in-flight for %s — waiting...", upload_id)
        event = _xai_inflight[upload_id]
        try:
            await asyncio.wait_for(asyncio.shield(event.wait()), timeout=180.0)
        except asyncio.TimeoutError:
            logger.error("❌ Timed out waiting for in-flight XAI job: %s", upload_id)
            return JSONResponse({"status": "error", "message": "Processing took too long. Please try again."}, status_code=504)
        # The job that was running has finished; return from cache
        result = get_cached_xai(upload_id)
        if result:
            return JSONResponse(result)
        return JSONResponse({"status": "error", "message": "XAI computation failed. Please retry."}, status_code=500)

    # ── 3. Register in-flight event so duplicate requests wait instead of re-running
    inflight_event = asyncio.Event()
    _xai_inflight[upload_id] = inflight_event

    try:
        # Check model exists before running
        from app.services.model_service import MODEL_PATH
        if not MODEL_PATH.exists():
            logger.error("Model file not found at: %s", MODEL_PATH)
            return JSONResponse({
                "status": "error",
                "message": "AI model file is missing or not loaded on server."
            }, status_code=503)

        # Query TinyDB for the uploaded MRI record to extract clinical segmentation parameters
        Scan = Query()
        records = database.scans_table.search((Scan.upload_id == upload_id) & (Scan.user_email == user["email"]))
        if not records:
            # Try uploads table fallback
            records = database.uploads_table.search((Query().upload_id == upload_id) & (Query().user_email == user["email"]))

        if not records:
            logger.warning("Upload record not found in database: %s", upload_id)
            return JSONResponse({
                "status": "error",
                "message": f"Upload not found: record metadata missing for {upload_id}"
            }, status_code=404)

        record = records[0]
        seg_info = record.get("segmentation", {})
        tumor_detected = seg_info.get("tumor_detected", False)
        tumor_volume = seg_info.get("tumor_volume_cm3", 0.0)
        confidence = seg_info.get("confidence", 0.0)

        # ── 4. Acquire semaphore and run full pipeline ─────────────────────────
        # Only 1 XAI job runs at a time on CPU. All processing (Grad-CAM,
        # overlay rendering, response building) runs inside the semaphore so
        # heatmap_vol is always in scope.
        logger.info("Acquiring XAI semaphore for upload_id: %s", upload_id)
        async with _xai_semaphore:
            # Double-check cache in case another worker just finished the same job
            cached_res = get_cached_xai(upload_id)
            if cached_res is not None:
                logger.info("XAI cache hit (post-semaphore) for upload_id: %s", upload_id)
                return JSONResponse(cached_res)

            # --- 4a. Run heavy Grad-CAM computation in thread-pool ---
            logger.info("Executing 3D Grad-CAM pipeline in threadpool...")
            try:
                mri_vol, mask_vol, heatmap_vol, heatmap_max = await asyncio.wait_for(
                    run_in_threadpool(generate_gradcam_volume, upload_id, class_idx=3),
                    timeout=180.0
                )
            except asyncio.TimeoutError:
                logger.error("❌ XAI processing timed out after 180s for upload_id: %s", upload_id)
                return JSONResponse({
                    "status": "error",
                    "message": "Processing took too long. Please try again."
                }, status_code=504)

            # --- 4b. Identify maximum activation slices ---
            logger.info("Identifying peak slices...")
            axial_sums    = np.sum(heatmap_vol, axis=(1, 2))
            sagittal_sums = np.sum(heatmap_vol, axis=(0, 2))
            coronal_sums  = np.sum(heatmap_vol, axis=(0, 1))

            axial_idx    = int(np.argmax(axial_sums))    if np.max(axial_sums)    > 0.0 else 64
            sagittal_idx = int(np.argmax(sagittal_sums)) if np.max(sagittal_sums) > 0.0 else 64
            coronal_idx  = int(np.argmax(coronal_sums))  if np.max(coronal_sums)  > 0.0 else 64

            # --- 4c. Render overlays (CPU-bound, keep in threadpool) ---
            axial_result    = await run_in_threadpool(overlay_heatmap, mri_vol[axial_idx, :, :],    heatmap_vol[axial_idx, :, :])
            sagittal_result = await run_in_threadpool(overlay_heatmap, mri_vol[:, sagittal_idx, :], heatmap_vol[:, sagittal_idx, :])
            coronal_result  = await run_in_threadpool(overlay_heatmap, mri_vol[:, :, coronal_idx],  heatmap_vol[:, :, coronal_idx])

            # Unpack overlay dicts (new multi-layer format)
            def _unpack(result, idx):
                if isinstance(result, dict):
                    return {
                        "slice_idx":   idx,
                        "image":       result.get("overlay_png", ""),   # legacy compat
                        "mri_png":     result.get("mri_png", ""),
                        "heatmap_png": result.get("heatmap_png", ""),
                        "overlay_png": result.get("overlay_png", ""),
                    }
                return {"slice_idx": idx, "image": result,
                        "mri_png": result, "heatmap_png": "", "overlay_png": result}

            axial_overlay    = _unpack(axial_result,    axial_idx)
            sagittal_overlay = _unpack(sagittal_result, sagittal_idx)
            coronal_overlay  = _unpack(coronal_result,  coronal_idx)

            # --- 4d. Encode full heatmap volume ---
            heatmap_uint8 = (heatmap_vol * 255.0).astype(np.uint8)
            heatmap_b64   = base64.b64encode(heatmap_uint8.tobytes()).decode('utf-8')

            # --- 4e. Generate clinical explanations ---
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
                "confidence":   float(confidence),
                "volume_cm3":   float(tumor_volume),
                "heatmap_max":  float(heatmap_max),
            }

            logger.info("Grad-CAM complete!")

            success_response = {
                "status":       "success",
                "upload_id":    upload_id,
                # primary keys
                "explanation":  explanation,
                "overlays":     overlays,
                # component mapping keys
                "explanations": explanation,
                "key_slices":   overlays,
                "heatmap_data": heatmap_b64,
                "technical":    technical,
            }

            # Save to backend cache so future requests are instant
            set_cached_xai(upload_id, success_response)

            return JSONResponse(success_response)

    except FileNotFoundError as exc:
        logger.error("❌ XAI File Error: %s", str(exc))
        return JSONResponse({
            "status": "error",
            "message": f"Upload not found: {str(exc)}"
        }, status_code=404)
    except Exception as e:
        logger.error("❌ XAI Error: %s", str(e))
        import traceback
        traceback.print_exc()
        return JSONResponse({
            "status": "error",
            "message": f"Grad-CAM processing failed: {str(e)}"
        }, status_code=500)
    finally:
        # Always release the in-flight lock so waiting callers can proceed
        _xai_inflight.pop(upload_id, None)
        inflight_event.set()

