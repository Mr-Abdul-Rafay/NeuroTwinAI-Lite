// ============================================================
// NeuroTwinAI-Lite — Centralized Mock Data
// ============================================================

export const statsData = {
  patients: { value: '1,284', trend: '+12%', positive: true, label: 'Total Patients' },
  scans:    { value: '42',    trend: '+8%',  positive: true, label: 'Active Scans' },
  urgent:   { value: '04',   trend: '-2%',  positive: false, label: 'Urgent Cases' },
  accuracy: { value: '99.8%',trend: '+1.4%',positive: true, label: 'AI Accuracy' },
};

export const activityData = [
  { id: '8821', scan: 'Cortical Thickness',     status: 'PROCESSING',       progress: 82 },
  { id: '7430', scan: 'Vascular Perfusion',      status: 'COMPLETED',        progress: 100 },
  { id: '2156', scan: 'Cortical Thickness',      status: 'ACTION REQUIRED',  progress: 14 },
  { id: '9803', scan: 'Vascular Perfusion',      status: 'COMPLETED',        progress: 100 },
  { id: '3341', scan: 'Hippocampal Volumetrics', status: 'PROCESSING',       progress: 55 },
];

export const insightsData = [
  {
    type: 'ANOMALY DETECTED',
    message: 'Patient #TX-7430 shows unusual atrophy in the posterior cingulate cortex.',
    time: '2 mins ago',
    color: 'red',
  },
  {
    type: 'TRIAL RELEASED',
    message: 'Cohort Beta neural mapping dataset is now 95% complete.',
    time: '1 hour ago',
    color: 'teal',
  },
  {
    type: 'OPTIMIZATION',
    message: 'Processing speed for volumetric scans improved by 12.4%.',
    time: '3 hours ago',
    color: 'blue',
  },
  {
    type: 'SCAN INITIALIZED',
    message: 'New Hippocampal Volumetrics scan started for patient #TX-3341.',
    time: '5 hours ago',
    color: 'teal',
  },
];

// ---- AI Results ----
export const aiResultData = {
  detected: true,
  confidence: 94.2,
  tumorType: 'Glioblastoma Multiforme (GBM)',
  grade: 'Grade IV',
  location: 'Left Frontal Lobe',
  volume: '12.4 cm³',
  volumeTolerance: '±0.2 cm³',
  totalSlices: 155,
  segments: [
    { label: 'Necrotic Core',     percent: 38, color: '#FF6B6B' },
    { label: 'Edema',             percent: 44, color: '#4A90D9' },
    { label: 'Enhancing Tumor',   percent: 18, color: '#6C5CE7' },
  ],
  explanation:
    'The AI model identified a hyperintense lesion consistent with GBM pathology. ' +
    'T1-weighted gadolinium imaging shows ring-enhancing mass with central necrosis. ' +
    'Perilesional edema extends into the white matter tracts. Recommend neurosurgical consultation.',
};

// ---- IoT Monitoring ----
export const vitalsData = [
  { id: 'hr',   icon: '❤️', label: 'Heart Rate',    value: '78',      unit: 'BPM',    status: 'Normal',   color: '#2ECC71' },
  { id: 'spo2', icon: '💨', label: 'SpO₂',          value: '96',      unit: '%',      status: 'Normal',   color: '#2ECC71' },
  { id: 'bp',   icon: '📊', label: 'Blood Pressure', value: '120/80',  unit: 'mmHg',   status: 'Normal',   color: '#2ECC71' },
  { id: 'temp', icon: '🌡️', label: 'Temperature',    value: '36.5',    unit: '°C',     status: 'Normal',   color: '#2ECC71' },
];

export const eegChannels = ['Fp1', 'Fp2', 'C3', 'C4'];

// ---- Reports ----
export const reportsData = [
  {
    id: 'RPT-001',
    patient: 'John Doe',
    patientId: 'BR-00472',
    date: '2026-06-20',
    type: 'Tumor Analysis',
    status: 'Viewed',
    summary: 'Glioblastoma Multiforme detected with 94.2% confidence. Surgical consultation recommended.',
    tumorType: 'Glioblastoma Multiforme (GBM)',
    location: 'Left Frontal Lobe',
    volume: '12.4 cm³',
    confidence: '94.2%',
    segments: { necrotic: '38%', edema: '44%', enhancing: '18%' },
    recommendations: [
      'Immediate neurosurgical consultation for tumor resection assessment.',
      'Begin corticosteroid therapy to reduce perilesional edema.',
      'Schedule follow-up MRI in 4 weeks post-surgery.',
    ],
  },
  {
    id: 'RPT-002',
    patient: 'Sarah Smith',
    patientId: 'BR-00891',
    date: '2026-06-19',
    type: 'Neural Mapping',
    status: 'Downloaded',
    summary: 'Cortical thickness mapping complete. Anomalous atrophy pattern identified.',
    tumorType: 'Meningioma (Benign)',
    location: 'Right Parietal Lobe',
    volume: '3.1 cm³',
    confidence: '88.7%',
    segments: { necrotic: '0%', edema: '22%', enhancing: '78%' },
    recommendations: [
      'Watch-and-wait approach recommended given benign characteristics.',
      'Repeat imaging every 6 months to monitor growth rate.',
      'Neuropsychological assessment for cognitive impact evaluation.',
    ],
  },
  {
    id: 'RPT-003',
    patient: 'Mike Johnson',
    patientId: 'BR-00123',
    date: '2026-06-18',
    type: 'Vascular Analysis',
    status: 'New',
    summary: 'Vascular perfusion analysis complete. No significant abnormalities detected.',
    tumorType: 'No Tumor Detected',
    location: 'N/A',
    volume: 'N/A',
    confidence: '99.1%',
    segments: { necrotic: '0%', edema: '0%', enhancing: '0%' },
    recommendations: [
      'Normal perfusion patterns confirmed across all vascular territories.',
      'Routine annual MRI screening recommended.',
      'No immediate intervention required.',
    ],
  },
  {
    id: 'RPT-004',
    patient: 'Emily Davis',
    patientId: 'BR-00567',
    date: '2026-06-17',
    type: 'Emergency Scan',
    status: 'New',
    summary: 'Urgent: Large mass detected with significant midline shift. Immediate intervention required.',
    tumorType: 'Astrocytoma (Grade III)',
    location: 'Right Temporal Lobe',
    volume: '28.9 cm³',
    confidence: '96.5%',
    segments: { necrotic: '25%', edema: '55%', enhancing: '20%' },
    recommendations: [
      'URGENT: Emergency neurosurgical consultation within 24 hours.',
      'Initiate dexamethasone to manage cerebral edema.',
      'Radiation oncology referral for stereotactic radiosurgery planning.',
    ],
  },
];

// ---- Patient Directory ----
export const patientsData = [
  { num: 1, name: 'John Doe',      id: 'BR-00472', age: 68, lastScan: '2026-06-20', status: 'Completed',  risk: 'Medium', condition: 'Glioblastoma' },
  { num: 2, name: 'Sarah Smith',   id: 'BR-00891', age: 45, lastScan: '2026-06-19', status: 'Processing', risk: 'High',   condition: 'Meningioma' },
  { num: 3, name: 'Mike Johnson',  id: 'BR-00123', age: 72, lastScan: '2026-06-18', status: 'Completed',  risk: 'Low',    condition: 'Clear Scan' },
  { num: 4, name: 'Emily Davis',   id: 'BR-00567', age: 34, lastScan: '2026-06-17', status: 'Urgent',     risk: 'High',   condition: 'Astrocytoma' },
  { num: 5, name: 'Robert Chen',   id: 'BR-00612', age: 58, lastScan: '2026-06-15', status: 'Completed',  risk: 'Medium', condition: 'Oligodendroglioma' },
  { num: 6, name: 'Maria Lopez',   id: 'BR-00734', age: 51, lastScan: '2026-06-14', status: 'Archived',   risk: 'Low',    condition: 'Post-op Follow-up' },
  { num: 7, name: 'James Wilson',  id: 'BR-00819', age: 63, lastScan: '2026-06-12', status: 'Processing', risk: 'High',   condition: 'Glioblastoma' },
  { num: 8, name: 'Linda Park',    id: 'BR-00925', age: 29, lastScan: '2026-06-10', status: 'Urgent',     risk: 'High',   condition: 'Ependymoma' },
  { num: 9, name: 'David Brown',   id: 'BR-01003', age: 77, lastScan: '2026-06-08', status: 'Completed',  risk: 'Low',    condition: 'Benign Cyst' },
  { num:10, name: 'Anna Martinez', id: 'BR-01144', age: 42, lastScan: '2026-06-06', status: 'Archived',   risk: 'Medium', condition: 'Post-radiation' },
];

// ---- Recent Uploads ----
export const uploadsData = [
  { patient: '#00472', date: 'Today',      progress: 100, status: 'Completed' },
  { patient: '#00891', date: 'Yesterday',  progress: 78,  status: 'Processing' },
  { patient: '#00123', date: '2 days ago', progress: 100, status: 'Completed' },
  { patient: '#00567', date: '3 days ago', progress: 0,   status: 'Queued' },
];
