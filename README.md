<h1 align="center">
  🧠 NeuroTwinAI-Lite
</h1>

<p align="center">
  <strong>An AI-Powered Clinical Digital Twin Platform for Neurological Imaging & Patient Monitoring</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square" alt="Status" />
  <img src="https://img.shields.io/badge/Type-Final%20Year%20Project-blue?style=flat-square" alt="FYP" />
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Three.js-WebGL%203D-black?style=flat-square&logo=three.js" alt="Three.js" />
  <img src="https://img.shields.io/badge/AI%20Model-Keras%20%2F%20TensorFlow-FF6F00?style=flat-square&logo=tensorflow&logoColor=white" alt="TF" />
</p>

---

## 📌 Overview

**NeuroTwinAI-Lite** is a full-stack clinical intelligence platform built as a Final Year Project (FYP) in the domain of **AI in Healthcare**. It simulates a hospital-grade **neurological digital twin system** where medical professionals can:

- Upload and process brain **MRI scans** (DICOM / NIfTI formats)
- Run an **AI-powered tumor detection** pipeline using a pre-trained deep learning model
- Visualize patient brains as **interactive 3D digital twins** rendered in WebGL (Three.js)
- Monitor **real-time patient vitals & EEG signals** via a simulated IoT telemetry interface
- Manage a full **patient directory** and generate automated **clinical reports**

The platform is designed around real-world clinical workflows, featuring JWT-authenticated access, HIPAA-aware design patterns, and a dark-mode, glassmorphism UI built for clinical environments.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔐 **JWT Authentication** | Secure clinician login/register with bcrypt password hashing and 24-hour token expiry |
| 🧠 **3D Digital Twin Viewer** | Interactive WebGL brain model with tumor overlay, EEG node placement, multi-angle view presets & orbit controls |
| 🤖 **AI Results Dashboard** | MRI slice viewer with segmentation mask overlays, tumor classification (type, grade, location, volume), and AI explanation panel |
| 📤 **MRI Upload Pipeline** | Drag-and-drop file upload supporting `.dcm`, `.nii`, `.nii.gz`, `.zip` up to 500MB, queued through the backend AI engine |
| 📡 **Live IoT Monitoring** | Real-time EEG waveform charts (4-channel: Fp1, Fp2, C3, C4) with vitals grid (HR, SpO₂, temperature) and alert panel |
| 👥 **Patient Directory** | Searchable patient registry with demographics, diagnosis tags, and scan history |
| 📊 **Clinical Dashboard** | KPI cards, real-time MRI activity table with status badges, quick actions, and AI insight feed |
| 📋 **Report Generation** | Automated per-patient clinical text reports including scan metadata and clinician identity |

---

## 🛠️ Tech Stack

### Backend
| Technology | Role |
|---|---|
| **FastAPI** | REST API framework — async-ready, OpenAPI auto-docs |
| **TinyDB** | Lightweight JSON-based database (no setup required) |
| **PyJWT** | JSON Web Token generation & verification |
| **bcrypt** | Secure password hashing |
| **Keras / TensorFlow** | Pre-trained brain tumor classification model (`best_model.h5`, ~65MB) |
| **Uvicorn** | ASGI server for FastAPI |
| **Pydantic** | Request/response schema validation |

### Frontend
| Technology | Role |
|---|---|
| **React 19** | Component-based UI framework |
| **Vite 8** | Next-generation build tool & dev server |
| **React Router v7** | Client-side routing |
| **Three.js + React Three Fiber** | 3D brain twin rendering with `@react-three/drei` |
| **Recharts** | Live EEG waveform & vitals charting |
| **Lucide React** | Icon system |
| **Vanilla CSS** | Custom design system with glassmorphism, gradients, and micro-animations |

---

## 🏗️ Project Architecture

```
NeuroTwinAI-Lite/
│
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, all REST endpoints
│   │   ├── auth.py          # JWT + bcrypt authentication logic
│   │   ├── database.py      # TinyDB setup, table definitions, seed data
│   │   └── db.json          # Persistent JSON database
│   ├── models/
│   │   └── best_model.h5    # Pre-trained Keras brain tumor classification model
│   └── data/                # Supporting datasets
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── LoginPage.jsx           # Clinician authentication
    │   │   ├── RegisterPage.jsx        # New account registration
    │   │   ├── DashboardPage.jsx       # Main clinical overview + KPIs
    │   │   ├── TwinViewerPage.jsx      # 3D interactive brain model (Three.js)
    │   │   ├── AIResultsPage.jsx       # MRI slice viewer + AI classification output
    │   │   ├── MRIUploadPage.jsx       # Drag & drop MRI file upload
    │   │   ├── IoTMonitoringPage.jsx   # Real-time vitals + live EEG charts
    │   │   ├── PatientDirectoryPage.jsx # Patient registry
    │   │   └── ReportsPage.jsx         # Clinical report generation
    │   ├── components/
    │   │   ├── Brain3D.jsx             # Three.js 3D brain scene component
    │   │   ├── BrainVisual.jsx         # 2D brain SVG visualization
    │   │   ├── NeuralBackground.jsx    # Animated neural particle background
    │   │   └── ui/                     # Reusable UI components (GlassCard, Sidebar, StatusBadge...)
    │   ├── context/
    │   │   └── PatientContext.jsx      # Global patient state (React Context)
    │   └── lib/
    │       └── mockData.js             # Structured mock clinical datasets
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ and npm
- **Python** 3.11+
- Git

---

### 1. Clone the Repository

```bash
git clone https://github.com/Mr-Abdul-Rafay/NeuroTwinAI-Lite.git
cd NeuroTwinAI-Lite
```

---

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install fastapi uvicorn tinydb pydantic PyJWT bcrypt

# Start the backend server
cd app
python main.py
```

> The API will be live at: **http://127.0.0.1:8000**
> Auto-generated API docs available at: **http://127.0.0.1:8000/docs**

---

### 3. Frontend Setup

```bash
# Open a new terminal and navigate to frontend
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

> The frontend will be live at: **http://localhost:5173**

---

## 🔌 API Endpoints

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | ❌ | Register a new clinical account |
| `POST` | `/api/auth/login` | ❌ | Authenticate and receive JWT token |
| `GET` | `/api/dashboard/data` | ✅ | Fetch KPIs, scan activity, AI insights |
| `POST` | `/api/scans/upload` | ✅ | Submit a new MRI scan for processing |
| `POST` | `/api/scans/resolve` | ✅ | Resolve an ACTION REQUIRED scan alert |
| `POST` | `/api/insights/report` | ✅ | Generate a clinical text report for a patient |

---

## 🧪 AI Model

The platform includes a **pre-trained Keras deep learning model** (`backend/models/best_model.h5`, ~65MB) trained for **brain tumor classification** from MRI data. The frontend AI Results page demonstrates the model's output including:

- **Tumor Detection** — Binary classification (Tumor / No Tumor)
- **Tumor Type** — Glioblastoma, Astrocytoma, Meningioma, Oligodendroglioma
- **Grade Classification** — WHO Grade I–IV
- **Location Mapping** — Frontal, Temporal, Parietal lobe identification
- **Volume Estimation** — cm³ volumetric approximation
- **Segmentation Overlay** — Necrotic core, enhancing tumor, peritumoral edema visualization
- **Explainability Panel** — Natural language AI reasoning output

---

## 🖥️ Application Screenshots

> Below is a summary of the key views in the application:

| Page | Description |
|---|---|
| **Login / Register** | Clinician-gated authentication with license ID, hospital affiliation, and compliance confirmation |
| **Dashboard** | KPI tiles, patient vitals (HR, SpO₂, Temp) with animated EKG waves, MRI activity table, quick action panel |
| **3D Twin Viewer** | Full Three.js brain model with tumor visualization, EEG node overlay, orbital controls, and multiple view presets |
| **AI Results** | Side-by-side MRI slice viewer with scan mode tabs (Original / Segmentation Mask / Overlay) and classification panel |
| **IoT Monitoring** | Live 4-channel EEG Recharts waveform with speed controls, vitals grid, and clinical alert history |
| **MRI Upload** | Drag-and-drop file upload zone with format validation, upload progress tracking, and submission queue |
| **Patient Directory** | Searchable patient registry with diagnosis tags and status badges |

---

## 🔒 Security Design

- **JWT-based authentication** — All clinical endpoints require a Bearer token
- **bcrypt password hashing** — Passwords are never stored in plain text
- **Token expiry** — Sessions expire after 24 hours
- **CORS middleware** — Configurable origin whitelisting for production deployment
- **HIPAA-aware design** — UI includes compliance confirmation on registration and displays HIPAA verified status on dashboard

---

## 👨‍💻 Developer

| | |
|---|---|
| **Name** | Abdul Rafay |
| **Role** | Full-Stack Developer (FYP Solo Project) |
| **GitHub** | [@Mr-Abdul-Rafay](https://github.com/Mr-Abdul-Rafay) |
| **Project Type** | Final Year Project (FYP) — AI in Healthcare |

---

## 📄 License

This project is developed as an academic Final Year Project. All rights reserved by the author.

---

<p align="center">
  Built with ❤️ for healthcare AI — NeuroTwinAI-Lite © 2025
</p>
