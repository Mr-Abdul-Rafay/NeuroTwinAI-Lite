"""
routes/patients.py
------------------
CRUD endpoints for Patient records and their relationship to uploads/reports.
"""

import datetime
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel
from tinydb import Query

from app import auth
from app import database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/patients", tags=["patients"])

# ── Auth helper (mirrors upload.py) ───────────────────────────────────────────

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

# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    dob: str
    gender: str
    medical_history: Optional[str] = ""
    contact: Optional[str] = ""
    phone: Optional[str] = ""
    address: Optional[str] = ""

class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    medical_history: Optional[str] = None
    contact: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

# ── ID Generator ──────────────────────────────────────────────────────────────

def generate_patient_id() -> str:
    all_pats = database.patients_table.all()
    if not all_pats:
        return "PAT-001"
    ids = []
    for p in all_pats:
        p_id = p.get("id", "")
        if p_id.startswith("PAT-"):
            try:
                ids.append(int(p_id.split("-")[1]))
            except ValueError:
                pass
    next_num = max(ids) + 1 if ids else len(all_pats) + 1
    return f"PAT-{next_num:03d}"

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", response_model=dict)
def create_patient(payload: PatientCreate, user: dict = Depends(_get_current_user)):
    """Create a new patient record in the database."""
    patient_id = generate_patient_id()
    now_iso = datetime.datetime.now(datetime.UTC).isoformat()
    
    patient_record = {
        "id": patient_id,
        "first_name": payload.first_name.strip(),
        "last_name": payload.last_name.strip(),
        "dob": payload.dob.strip(),
        "gender": payload.gender.strip(),
        "medical_history": payload.medical_history.strip() if payload.medical_history else "",
        "contact": payload.contact.strip() if payload.contact else "",
        "phone": payload.phone.strip() if payload.phone else "",
        "address": payload.address.strip() if payload.address else "",
        "scan_count": 0,
        "created_at": now_iso,
        "updated_at": now_iso
    }
    
    database.patients_table.insert(patient_record)
    logger.info("Created patient: %s (%s %s)", patient_id, payload.first_name, payload.last_name)
    return {"status": "success", "patient": patient_record}

@router.get("", response_model=dict)
def get_all_patients(user: dict = Depends(_get_current_user)):
    """Retrieve all patient records."""
    patients = database.patients_table.all()
    # Sort by creation date descending
    sorted_patients = sorted(
        patients,
        key=lambda p: p.get("created_at", ""),
        reverse=True
    )
    return {"status": "success", "patients": sorted_patients}

@router.get("/{patient_id}", response_model=dict)
def get_patient(patient_id: str, user: dict = Depends(_get_current_user)):
    """Retrieve a specific patient record by ID."""
    Patient = Query()
    records = database.patients_table.search(Patient.id == patient_id)
    if not records:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
    return {"status": "success", "patient": records[0]}

@router.put("/{patient_id}", response_model=dict)
def update_patient(patient_id: str, payload: PatientUpdate, user: dict = Depends(_get_current_user)):
    """Update editable fields of a patient record."""
    Patient = Query()
    records = database.patients_table.search(Patient.id == patient_id)
    if not records:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
        
    update_data = {}
    if payload.first_name is not None:
        update_data["first_name"] = payload.first_name.strip()
    if payload.last_name is not None:
        update_data["last_name"] = payload.last_name.strip()
    if payload.dob is not None:
        update_data["dob"] = payload.dob.strip()
    if payload.gender is not None:
        update_data["gender"] = payload.gender.strip()
    if payload.medical_history is not None:
        update_data["medical_history"] = payload.medical_history.strip()
    if payload.contact is not None:
        update_data["contact"] = payload.contact.strip()
    if payload.phone is not None:
        update_data["phone"] = payload.phone.strip()
    if payload.address is not None:
        update_data["address"] = payload.address.strip()
        
    if update_data:
        update_data["updated_at"] = datetime.datetime.now(datetime.UTC).isoformat()
        database.patients_table.update(update_data, Patient.id == patient_id)
        
    updated_records = database.patients_table.search(Patient.id == patient_id)
    logger.info("Updated patient: %s", patient_id)
    return {"status": "success", "patient": updated_records[0]}

@router.delete("/{patient_id}", response_model=dict)
def delete_patient(patient_id: str, user: dict = Depends(_get_current_user)):
    """Delete a patient record."""
    Patient = Query()
    records = database.patients_table.search(Patient.id == patient_id)
    if not records:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")
        
    database.patients_table.remove(Patient.id == patient_id)
    
    # Cascade delete patient's associated uploads
    Upload = Query()
    database.uploads_table.remove(Upload.patient_id == patient_id)
    
    # Cascade delete patient's insight/activity entries
    Insight = Query()
    database.insights_table.remove(Insight.message.search(patient_id))

    logger.info("Deleted patient: %s and their associated uploads", patient_id)
    return {"status": "success", "message": f"Patient {patient_id} and all related scan uploads deleted successfully"}

@router.get("/{patient_id}/uploads", response_model=dict)
def get_patient_uploads(patient_id: str, user: dict = Depends(_get_current_user)):
    """Retrieve all MRI uploads associated with a patient."""
    Upload = Query()
    records = database.uploads_table.search(Upload.patient_id == patient_id)
    return {"status": "success", "uploads": records}

@router.get("/{patient_id}/reports", response_model=dict)
def get_patient_reports(patient_id: str, user: dict = Depends(_get_current_user)):
    """Generate dynamic clinical reports for patient based on completed uploads."""
    Upload = Query()
    uploads = database.uploads_table.search(Upload.patient_id == patient_id)
    reports = []
    for idx, upload in enumerate(uploads):
        if upload.get("status") == "Completed":
            seg = upload.get("segmentation", {})
            reports.append({
                "id": f"REP-{patient_id}-{idx+1:03d}",
                "patient_id": patient_id,
                "upload_id": upload.get("upload_id"),
                "created_at": upload.get("created_at"),
                "summary": f"Brain tumor segmentation analysis. Tumor detected: {seg.get('tumor_detected', False)}. Volume: {seg.get('tumor_volume_cm3', 0):.2f} cm³.",
                "clinician": upload.get("clinician", "Unknown")
            })
    return {"status": "success", "reports": reports}
