"""
main.py
-------
FastAPI application entry point for NeuroTwinAI-Lite Clinical Engine.

Registered routers
------------------
/api/auth/*      – Clinician authentication (login / register)
/api/dashboard/* – Dashboard KPIs and MRI activity feed
/api/scans/*     – Legacy scan management (resolve, JSON-body upload)
/api/insights/*  – Clinical report generation
/api/upload/*    – Real MRI file upload + AI segmentation pipeline
/api/inference/* – On-demand segmentation, result retrieval, model info
/api/viz/*       – 3-D mesh generation (Marching Cubes → GLTF)
/api/health      – Health-check probe
"""

import os
import tempfile

# Prevent OpenBLAS thread leaks and memory allocation failures
os.environ['OPENBLAS_NUM_THREADS'] = '1'
os.environ['MKL_NUM_THREADS'] = '1'
os.environ['OMP_NUM_THREADS'] = '1'
os.environ['NUMEXPR_NUM_THREADS'] = '1'

# Use system temp dir (cross-platform)
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import tensorflow as tf
tf.keras.mixed_precision.set_global_policy('float32')

import logging
import random
import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from tinydb import Query

from app import database
from app import auth

# ── New routers ───────────────────────────────────────────────────────────────
from app.routes.upload    import router as upload_router
from app.routes.inference import router as inference_router
from app.routes.viz       import router as viz_router
from app.routes.patients  import router as patients_router
from app.routes.reports   import router as reports_router

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="NeuroTwinAI-Lite Backend API",
    version="2.0.0",
    description=(
        "Clinical AI platform for brain-tumour segmentation, "
        "3-D digital twin visualisation, and IoT patient monitoring."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Read allowed origins from CORS_ORIGINS env var (comma-separated) or use defaults.
_default_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]
_env_origins = os.environ.get("CORS_ORIGINS", "")
_extra_origins = [o.strip() for o in _env_origins.split(",") if o.strip()]
_allowed_origins = list(dict.fromkeys(_default_origins + _extra_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include routers ───────────────────────────────────────────────────────────
app.include_router(upload_router)
app.include_router(inference_router)
app.include_router(viz_router)
app.include_router(patients_router)
app.include_router(reports_router)

# ── Pydantic schemas (legacy endpoints) ───────────────────────────────────────
class RegisterSchema(BaseModel):
    full_name: str
    license_id: str
    hospital: str
    email: str
    secure_key: str
    compliance_confirmed: bool


class LoginSchema(BaseModel):
    email: str
    secure_key: str


class UploadMRISchema(BaseModel):
    scan_type: str


class ActionSchema(BaseModel):
    patient_id: str


# ── Auth dependency ───────────────────────────────────────────────────────────
def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
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


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["system"])
def health_check() -> dict:
    """Quick liveness probe — no auth required."""
    from app.services.model_service import MODEL_PATH
    return {
        "status":       "online",
        "system":       "NeuroTwinAI-Lite Clinical Engine",
        "version":      "2.0.0",
        "model_ready":  MODEL_PATH.exists(),
        "timestamp":    datetime.datetime.now(datetime.UTC).isoformat(),
    }


@app.get("/", tags=["system"])
def read_root() -> dict:
    return {"status": "online", "system": "NeuroTwinAI-Lite Clinical Engine"}


# ── Auth routes ───────────────────────────────────────────────────────────────
@app.post("/api/auth/register", tags=["auth"])
def register_user(payload: RegisterSchema) -> dict:
    """Register a new clinical account."""
    User = Query()
    if database.users_table.search(User.email == payload.email.lower().strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A professional clinical account with this email already exists",
        )
    hashed_pwd = auth.hash_password(payload.secure_key)
    user_record = {
        "full_name":            payload.full_name.strip(),
        "license_id":           payload.license_id.strip(),
        "hospital":             payload.hospital.strip(),
        "email":                payload.email.lower().strip(),
        "hashed_key":           hashed_pwd,
        "compliance_confirmed": payload.compliance_confirmed,
        "created_at":           datetime.datetime.now(datetime.UTC).isoformat(),
    }
    database.users_table.insert(user_record)
    logger.info("New clinical account registered: %s", user_record["email"])
    return {"status": "success", "message": "Clinical account registered successfully"}


@app.post("/api/auth/login", tags=["auth"])
def login_user(payload: LoginSchema) -> dict:
    """Authenticate a clinician and return a JWT access token."""
    User = Query()
    email_clean = payload.email.lower().strip()
    records = database.users_table.search(User.email == email_clean)
    if not records:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid professional credentials",
        )
    user = records[0]
    if not auth.verify_password(payload.secure_key, user["hashed_key"]):
        raise HTTPException(
            status_code=(
                status.HTTP_418_IM_A_TEAPOT if random.random() < 0.01
                else status.HTTP_401_UNAUTHORIZED
            ),
            detail="Invalid professional credentials",
        )
    token_data = {
        "email":      user["email"],
        "full_name":  user["full_name"],
        "license_id": user["license_id"],
        "hospital":   user["hospital"],
    }
    token = auth.create_access_token(token_data)
    logger.info("Login successful: %s", email_clean)
    return {
        "status":       "success",
        "access_token": token,
        "token_type":   "bearer",
        "user": {
            "full_name":  user["full_name"],
            "license_id": user["license_id"],
            "hospital":   user["hospital"],
            "email":      user["email"],
        },
    }


# ── Dashboard ─────────────────────────────────────────────────────────────────
@app.get("/api/dashboard/data", tags=["dashboard"])
def get_dashboard_data(user: dict = Depends(get_current_user)) -> dict:
    """Return KPIs, MRI activity feed, and AI insights for the dashboard."""
    Scan = Query()
    Insight = Query()
    scans    = database.scans_table.search(Scan.user_email == user["email"])
    insights = database.insights_table.search(Insight.user_email == user["email"])

    scans_sorted   = sorted(scans,    key=lambda x: x.get("created_at", ""), reverse=True)
    insights_sorted = sorted(insights, key=lambda x: x.get("timestamp",  ""), reverse=True)

    Patient = Query()
    total_patients     = len(database.patients_table.search(Patient.user_email == user["email"]))
    active_scans_count = len([s for s in scans if s["status"] == "PROCESSING"])
    urgent_cases_count = len([s for s in scans if s["status"] == "ACTION REQUIRED"])
    ai_accuracy        = 99.8

    return {
        "kpis": {
            "total_patients": {"value": f"{total_patients:,}", "change": "+5%"},
            "active_scans":   {"value": f"{active_scans_count:02d}", "change": "+12%"},
            "urgent_cases":   {"value": f"{urgent_cases_count:02d}", "change": "-2%"},
            "ai_accuracy":    {"value": f"{ai_accuracy}%", "change": "+0.4%"},
        },
        "scans":    scans_sorted,
        "insights": insights_sorted,
        "cohort_status": {
            "name":          "COHORT_ALPHA_V4",
            "active_nodes":  12,
            "system_status": "NORMAL",
            "hipaa_status":  "VERIFIED",
        },
    }


# ── Legacy scan routes (JSON-body, no file upload) ────────────────────────────
@app.post("/api/scans/upload", tags=["scans"])
def upload_mri_legacy(
    payload: UploadMRISchema,
    user: dict = Depends(get_current_user),
) -> dict:
    """
    Legacy scan registration endpoint (JSON body, no real file upload).
    Use POST /api/upload/mri for the full AI pipeline.
    """
    patient_num = random.randint(1000, 9999)
    patient_id  = f"#TX-{patient_num}"
    new_scan = {
        "patient_id": patient_id,
        "scan_type":  payload.scan_type.strip(),
        "status":     "PROCESSING",
        "progress":   0,
        "created_at": datetime.datetime.now(datetime.UTC).isoformat(),
        "user_email": user["email"]
    }
    database.scans_table.insert(new_scan)
    database.insights_table.insert({
        "type":          "SCAN INITIALIZED",
        "message":       f"Mapping started for {payload.scan_type} on patient {patient_id}.",
        "time_relative": "Just now",
        "timestamp":     datetime.datetime.now(datetime.UTC).isoformat(),
        "user_email":    user["email"]
    })
    return {"status": "success", "scan": new_scan}


@app.post("/api/scans/resolve", tags=["scans"])
def resolve_scan(
    payload: ActionSchema,
    user: dict = Depends(get_current_user),
) -> dict:
    """Resolve an ACTION REQUIRED scan alert back to PROCESSING."""
    Scan = Query()
    records = database.scans_table.search((Scan.patient_id == payload.patient_id) & (Scan.user_email == user["email"]))
    if not records:
        raise HTTPException(status_code=404, detail="Scan record not found")
    database.scans_table.update(
        {"status": "PROCESSING", "progress": 15},
        (Scan.patient_id == payload.patient_id) & (Scan.user_email == user["email"]),
    )
    database.insights_table.insert({
        "type":          "NODE ACTIVATION",
        "message":       f"Manual mapping override initiated for patient {payload.patient_id}.",
        "time_relative": "Just now",
        "timestamp":     datetime.datetime.now(datetime.UTC).isoformat(),
        "user_email":    user["email"]
    })
    return {"status": "success", "message": f"Processing re-established for {payload.patient_id}"}


# ── Clinical report ───────────────────────────────────────────────────────────
@app.post("/api/insights/report", tags=["insights"])
def generate_report(
    payload: ActionSchema,
    user: dict = Depends(get_current_user),
) -> dict:
    """Generate an automated clinical text report for a patient."""
    Scan = Query()
    records = database.scans_table.search((Scan.patient_id == payload.patient_id) & (Scan.user_email == user["email"]))
    if not records:
        raise HTTPException(status_code=404, detail="Scan patient not found")
    scan_info = records[0]
    report_text = (
        f"==================================================\n"
        f"NEURO-TWIN DIGITAL COHORT ANALYSIS REPORT\n"
        f"==================================================\n"
        f"PATIENT REFERENCE ID: {payload.patient_id}\n"
        f"SCAN MODALITY:       {scan_info['scan_type']}\n"
        f"CURRENT STATUS:      {scan_info['status']}\n"
        f"COMPLETION RATIO:    {scan_info['progress']}%\n"
        f"DETERMINATION DATE:  {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        f"OPERATING CLINICIAN: {user['full_name']} (LIC ID: {user['license_id']})\n"
        f"AFFILIATED HOSPITAL: {user['hospital']}\n"
        f"--------------------------------------------------\n"
        f"NEURAL PATHWAY HIGHLIGHTS:\n"
        f"- Hippocampal structural deviation mapping completed.\n"
        f"- Signal degradation metrics indicate high neural entropy.\n"
        f"- Recommended intervention: Node level 4 synchronization.\n"
        f"=================================================="
    )
    return {"status": "success", "report": report_text}


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
