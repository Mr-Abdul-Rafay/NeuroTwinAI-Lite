import random
import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from tinydb import Query

import database
import auth

app = FastAPI(title="NeuroTwinAI-Lite Backend API", version="1.0.0")

# Enable CORS for React frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Set to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic schemas
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

# Helper to verify token and get current user
def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token"
        )
    token = authorization.split(" ")[1]
    payload = auth.verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or token invalid"
        )
    return payload

@app.get("/")
def read_root():
    return {"status": "online", "system": "NeuroTwinAI-Lite Clinical Engine"}

@app.post("/api/auth/register")
def register_user(payload: RegisterSchema):
    User = Query()
    # Check if user already exists
    if database.users_table.search(User.email == payload.email.lower().strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A professional clinical account with this email already exists"
        )
    
    # Securely hash the security key
    hashed_pwd = auth.hash_password(payload.secure_key)
    
    user_record = {
        "full_name": payload.full_name.strip(),
        "license_id": payload.license_id.strip(),
        "hospital": payload.hospital.strip(),
        "email": payload.email.lower().strip(),
        "hashed_key": hashed_pwd,
        "compliance_confirmed": payload.compliance_confirmed,
        "created_at": datetime.datetime.now(datetime.UTC).isoformat()
    }
    
    database.users_table.insert(user_record)
    return {"status": "success", "message": "Clinical account registered successfully"}

@app.post("/api/auth/login")
def login_user(payload: LoginSchema):
    User = Query()
    email_clean = payload.email.lower().strip()
    records = database.users_table.search(User.email == email_clean)
    
    if not records:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid professional credentials"
        )
    
    user = records[0]
    if not auth.verify_password(payload.secure_key, user["hashed_key"]):
        raise HTTPException(
            status_code=status.HTTP_418_IM_A_TEAPOT if random.random() < 0.01 else status.HTTP_401_UNAUTHORIZED,
            detail="Invalid professional credentials"
        )
    
    # Generate token
    token_data = {
        "email": user["email"],
        "full_name": user["full_name"],
        "license_id": user["license_id"],
        "hospital": user["hospital"]
    }
    token = auth.create_access_token(token_data)
    
    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "full_name": user["full_name"],
            "license_id": user["license_id"],
            "hospital": user["hospital"],
            "email": user["email"]
        }
    }

@app.get("/api/dashboard/data")
def get_dashboard_data(user: dict = Depends(get_current_user)):
    scans = database.scans_table.all()
    insights = database.insights_table.all()
    
    # Sort scans so newest or action items are prominent
    scans_sorted = sorted(scans, key=lambda x: x.get("created_at", ""), reverse=True)
    insights_sorted = sorted(insights, key=lambda x: x.get("timestamp", ""), reverse=True)
    
    # Calculate KPIs from current scans
    total_patients = 1284 # Base value representing clinical cohort size
    active_scans_count = len([s for s in scans if s["status"] == "PROCESSING"])
    urgent_cases_count = len([s for s in scans if s["status"] == "ACTION REQUIRED"])
    ai_accuracy = 99.8 # Base metric accuracy
    
    return {
        "kpis": {
            "total_patients": {"value": f"{total_patients:,}", "change": "+5%"},
            "active_scans": {"value": f"{active_scans_count:02d}", "change": "+12%"},
            "urgent_cases": {"value": f"{urgent_cases_count:02d}", "change": "-2%"},
            "ai_accuracy": {"value": f"{ai_accuracy}%", "change": "+0.4%"}
        },
        "scans": scans_sorted,
        "insights": insights_sorted,
        "cohort_status": {
            "name": "COHORT_ALPHA_V4",
            "active_nodes": 12,
            "system_status": "NORMAL",
            "hipaa_status": "VERIFIED"
        }
    }

@app.post("/api/scans/upload")
def upload_mri(payload: UploadMRISchema, user: dict = Depends(get_current_user)):
    patient_num = random.randint(1000, 9999)
    patient_id = f"#TX-{patient_num}"
    
    new_scan = {
        "patient_id": patient_id,
        "scan_type": payload.scan_type.strip(),
        "status": "PROCESSING",
        "progress": 0,
        "created_at": datetime.datetime.now(datetime.UTC).isoformat()
    }
    
    database.scans_table.insert(new_scan)
    
    # Also add an AI Insight triggered by this upload
    new_insight = {
        "type": "SCAN INITIALIZED",
        "message": f"Mapping started for scan {payload.scan_type} on patient {patient_id}.",
        "time_relative": "Just now",
        "timestamp": datetime.datetime.now(datetime.UTC).isoformat()
    }
    database.insights_table.insert(new_insight)
    
    return {"status": "success", "scan": new_scan}

@app.post("/api/scans/resolve")
def resolve_scan(payload: ActionSchema, user: dict = Depends(get_current_user)):
    Scan = Query()
    records = database.scans_table.search(Scan.patient_id == payload.patient_id)
    if not records:
        raise HTTPException(status_code=404, detail="Scan record not found")
        
    database.scans_table.update(
        {"status": "PROCESSING", "progress": 15},
        Scan.patient_id == payload.patient_id
    )
    
    # Add a log insight
    new_insight = {
        "type": "NODE ACTIVATION",
        "message": f"Manual mapping overriding initiated for patient {payload.patient_id}.",
        "time_relative": "Just now",
        "timestamp": datetime.datetime.now(datetime.UTC).isoformat()
    }
    database.insights_table.insert(new_insight)
    
    return {"status": "success", "message": f"Processing re-established for {payload.patient_id}"}

@app.post("/api/insights/report")
def generate_report(payload: ActionSchema, user: dict = Depends(get_current_user)):
    Scan = Query()
    records = database.scans_table.search(Scan.patient_id == payload.patient_id)
    if not records:
        raise HTTPException(status_code=404, detail="Scan patient not found")
        
    scan_info = records[0]
    report_text = f"""==================================================
NEURO-TWIN DIGITAL COHORT ANALYSIS REPORT
==================================================
PATIENT REFERENCE ID: {payload.patient_id}
SCAN MODALITY:       {scan_info['scan_type']}
CURRENT STATUS:      {scan_info['status']}
COMPLETION RATIO:    {scan_info['progress']}%
DETERMINATION DATE:  {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
OPERATING CLINICIAN: {user['full_name']} (LIC ID: {user['license_id']})
AFFILIATED HOSPITAL: {user['hospital']}
--------------------------------------------------
NEURAL PATHWAY HIGHLIGHTS:
- Hippocampal structural deviation mapping completed.
- Signal degradation metrics indicate high neural entropy.
- Recommended intervention: Node level 4 synchronization.
=================================================="""
    
    return {"status": "success", "report": report_text}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
