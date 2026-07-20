import logging
import datetime
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from tinydb import Query

from app import auth
from app import database

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["reports"])

# ── Auth Helper ──────────────────────────────────────────────────────────────

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

class ReportCreate(BaseModel):
    patient_id: str
    upload_id: str
    title: Optional[str] = None
    summary: Optional[str] = None
    findings: Optional[str] = None
    recommendations: Optional[str] = None
    tumor_detected: Optional[bool] = False
    confidence: Optional[float] = 0.0
    tumor_volume_cm3: Optional[float] = 0.0
    segmentation: Optional[Dict[str, float]] = None


# ── API Routes ────────────────────────────────────────────────────────────────

@router.post("/reports")
async def create_report(payload: ReportCreate, user: dict = Depends(_get_current_user)):
    """Generate a new AI report manually from upload data"""
    Patient = Query()
    patient_records = database.patients_table.search((Patient.id == payload.patient_id) & (Patient.user_email == user["email"]))
    if not patient_records:
        raise HTTPException(status_code=404, detail="Patient record not found")
    patient = patient_records[0]
    
    Upload = Query()
    upload_records = database.uploads_table.search((Upload.upload_id == payload.upload_id) & (Upload.user_email == user["email"]))
    if not upload_records:
        raise HTTPException(status_code=404, detail="Upload record not found")
        
    report_id = f"RPT-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
    report_data = {
        "id": report_id,
        "patient_id": payload.patient_id,
        "patient_name": f"{patient.get('first_name', '')} {patient.get('last_name', '')}",
        "upload_id": payload.upload_id,
        "title": payload.title or f"AI Analysis Report - {patient.get('first_name', '')} {patient.get('last_name', '')}",
        "summary": payload.summary or "",
        "findings": payload.findings or "",
        "recommendations": payload.recommendations or "",
        "tumor_detected": payload.tumor_detected,
        "confidence": payload.confidence,
        "tumor_volume_cm3": payload.tumor_volume_cm3,
        "segmentation": payload.segmentation or {},
        "created_at": datetime.datetime.now(datetime.UTC).isoformat(),
        "updated_at": datetime.datetime.now(datetime.UTC).isoformat(),
        "user_email": user["email"]
    }
    database.reports_table.insert(report_data)
    logger.info("Report %s created successfully", report_id)
    return {"status": "success", "report": report_data}


@router.get("/reports")
def get_all_reports(user: dict = Depends(_get_current_user)):
    """Get all reports for the current user"""
    Report = Query()
    reports = database.reports_table.search(Report.user_email == user["email"])
    # Sort by created_at descending (newest first)
    reports.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return {"status": "success", "reports": reports}


@router.get("/reports/{report_id}")
def get_report(report_id: str, user: dict = Depends(_get_current_user)):
    """Get a specific report by ID, verifying ownership"""
    Report = Query()
    records = database.reports_table.search((Report.id == report_id) & (Report.user_email == user["email"]))
    if not records:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"status": "success", "report": records[0]}


@router.get("/patients/{patient_id}/reports")
def get_patient_reports(patient_id: str, user: dict = Depends(_get_current_user)):
    """Get all reports for a specific patient, verifying ownership"""
    Patient = Query()
    patients = database.patients_table.search((Patient.id == patient_id) & (Patient.user_email == user["email"]))
    if not patients:
        raise HTTPException(status_code=404, detail="Patient record not found")

    Report = Query()
    records = database.reports_table.search((Report.patient_id == patient_id) & (Report.user_email == user["email"]))
    records.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return {"status": "success", "reports": records}


@router.delete("/reports/{report_id}")
def delete_report(report_id: str, user: dict = Depends(_get_current_user)):
    """Delete a report, verifying ownership"""
    Report = Query()
    records = database.reports_table.search((Report.id == report_id) & (Report.user_email == user["email"]))
    if not records:
        raise HTTPException(status_code=404, detail="Report not found")
    database.reports_table.remove((Report.id == report_id) & (Report.user_email == user["email"]))
    logger.info("Deleted report: %s", report_id)
    return {"status": "success", "message": "Report deleted successfully"}


@router.post("/reports/generate/{upload_id}")
def generate_report(upload_id: str, user: dict = Depends(_get_current_user)):
    """Auto-generate a report from upload results, verifying ownership"""
    Upload = Query()
    upload_records = database.uploads_table.search((Upload.upload_id == upload_id) & (Upload.user_email == user["email"]))
    if not upload_records:
        raise HTTPException(status_code=404, detail="Upload record not found")
    upload = upload_records[0]
    
    patient_id = upload.get('patient_id')
    Patient = Query()
    patient_records = database.patients_table.search((Patient.id == patient_id) & (Patient.user_email == user["email"]))
    if not patient_records:
        raise HTTPException(status_code=404, detail="Patient record not found")
    patient = patient_records[0]
    
    results = upload.get('segmentation', {})
    
    tumor_detected = results.get('tumor_detected', False)
    confidence = results.get('confidence', 0.0)
    volume = results.get('tumor_volume_cm3', 0.0)
    
    segmentation = {
        'necrotic': results.get('necrotic_volume_mm3', 0.0),
        'edema': results.get('edema_volume_mm3', 0.0),
        'enhancing': results.get('enhancing_volume_mm3', 0.0),
    }
    
    # Generate summary based on results
    if tumor_detected:
        summary = (
            f"Volumetric MRI analysis indicates a localized high-entropy structural anomaly "
            f"consistent with brain tumor pathology, detected with "
            f"{confidence * 100 if confidence <= 1 else confidence:.1f}% confidence. "
            f"The segmented mass has a total volume of {volume:.2f} cm³."
        )
    else:
        summary = (
            "No intracranial mass lesions, midline shifts, or abnormal tissue enhancements "
            "were identified in this scan. Brain structures appear normal for patient age."
        )
    
    findings = f"Tumor detected: {tumor_detected}. Model confidence: {confidence * 100 if confidence <= 1 else confidence:.1f}%. Total tumor volume: {volume:.2f} cm³."
    
    recommendations = []
    if tumor_detected:
        recommendations.append("Neurosurgical consultation recommended for primary tumor staging and pathway mapping.")
        recommendations.append("Follow-up multi-modal MRI in 4-6 weeks to track structural progression.")
        if segmentation.get('enhancing', 0.0) > 0:
            recommendations.append("Consider histopathological biopsy for molecular profiling and therapeutic targeting.")
    else:
        recommendations.append("Routine clinical follow-up in 12 months.")
    
    report_id = f"RPT-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
    report_data = {
        "id": report_id,
        "patient_id": patient_id,
        "patient_name": f"{patient.get('first_name', '')} {patient.get('last_name', '')}",
        "upload_id": upload_id,
        "title": f"AI Clinical Analysis Report - {patient.get('first_name', '')} {patient.get('last_name', '')}",
        "summary": summary,
        "findings": findings,
        "recommendations": "\n".join(recommendations),
        "tumor_detected": tumor_detected,
        "confidence": confidence * 100 if confidence <= 1 else confidence,
        "tumor_volume_cm3": volume,
        "segmentation": segmentation,
        "created_at": datetime.datetime.now(datetime.UTC).isoformat(),
        "updated_at": datetime.datetime.now(datetime.UTC).isoformat(),
        "user_email": user["email"]
    }
    
    database.reports_table.insert(report_data)
    
    # Also add an AI Insight to the dashboard feed
    database.insights_table.insert({
        "type":          "REPORT GENERATED",
        "message":       f"Automated AI Report {report_id} generated for patient {patient_id}.",
        "time_relative": "Just now",
        "timestamp":     datetime.datetime.now(datetime.UTC).isoformat(),
        "user_email":    user["email"]
    })
    
    logger.info("Report %s auto-generated from upload %s", report_id, upload_id)
    return {"status": "success", "report": report_data}
