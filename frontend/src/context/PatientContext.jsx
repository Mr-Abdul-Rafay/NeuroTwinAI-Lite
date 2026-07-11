import React, { createContext, useState, useEffect, useContext } from 'react';
import usePatientStore from '../store/patientStore';

const PatientContext = createContext();

export const patientProfiles = {
  '#TX-7430': {
    id: '#TX-7430',
    name: 'Omer',
    status: 'Connected',
    code: 'P1',
    age: 45,
    gender: 'Male',
    dob: '14 Feb 1969',
    lastScan: '24 Oct 2023',
    diagnosis: 'Glioblastoma',
    tumorType: 'Glioblastoma Multiforme (GBM)',
    grade: 'Grade IV',
    location: 'Left Frontal Lobe',
    volume: '12.4 cm³',
    volumeTolerance: '±0.2 cm³',
    confidence: 94.2,
    isNormal: false,
    segments: [
      { label: 'Necrotic Core',     percent: 38, color: '#FF6B6B' },
      { label: 'Edema',             percent: 44, color: '#4A90D9' },
      { label: 'Enhancing Tumor',   percent: 18, color: '#6C5CE7' },
    ],
    explanation: 'The AI model identified a hyperintense lesion consistent with GBM pathology. T1-weighted gadolinium imaging shows ring-enhancing mass with central necrosis. Perilesional edema extends into the white matter tracts. Recommend neurosurgical consultation.'
  },
  '#TX-8821': {
    id: '#TX-8821',
    name: 'Sarah Jenkins',
    status: 'Connected',
    code: 'P2',
    age: 52,
    gender: 'Female',
    dob: '21 Sep 1973',
    lastScan: '20 Jun 2026',
    diagnosis: 'Astrocytoma',
    tumorType: 'Astrocytoma (Grade III)',
    grade: 'Grade III',
    location: 'Right Temporal Lobe',
    volume: '28.9 cm³',
    volumeTolerance: '±0.4 cm³',
    confidence: 96.5,
    isNormal: false,
    segments: [
      { label: 'Necrotic Core',     percent: 25, color: '#FF6B6B' },
      { label: 'Edema',             percent: 55, color: '#4A90D9' },
      { label: 'Enhancing Tumor',   percent: 20, color: '#6C5CE7' },
    ],
    explanation: 'Telemetrical mapping indicates a large, non-homogenous infiltrative lesion in the right temporal lobe, highly suspicious for anaplastic astrocytoma. Significant surrounding vasogenic edema is present. Advise prompt surgical and radiological evaluation.'
  },
  '#TX-9042': {
    id: '#TX-9042',
    name: 'John Doe',
    status: 'Connected',
    code: 'P3',
    age: 68,
    gender: 'Male',
    dob: '10 Aug 1957',
    lastScan: '20 Jun 2026',
    diagnosis: 'Meningioma',
    tumorType: 'Meningioma (Benign)',
    grade: 'Grade I',
    location: 'Right Parietal Lobe',
    volume: '3.1 cm³',
    volumeTolerance: '±0.1 cm³',
    confidence: 88.7,
    isNormal: false,
    segments: [
      { label: 'Necrotic Core',     percent: 0,  color: '#FF6B6B' },
      { label: 'Edema',             percent: 22, color: '#4A90D9' },
      { label: 'Enhancing Tumor',   percent: 78, color: '#6C5CE7' },
    ],
    explanation: 'A dural-based, well-circumscribed extra-axial lesion is observed in the right parietal convexity. It displays homogeneous contrast enhancement and a dural tail sign. Features are consistent with a benign meningioma. Recommended observation.'
  },
  '#TX-8911': {
    id: '#TX-8911',
    name: 'Jane Smith',
    status: 'Connected',
    code: 'P4',
    age: 36,
    gender: 'Female',
    dob: '05 Dec 1989',
    lastScan: '20 Jun 2026',
    diagnosis: 'Clear Scan',
    tumorType: 'No Tumor Detected',
    grade: 'N/A',
    location: 'N/A',
    volume: 'N/A',
    volumeTolerance: '',
    confidence: 99.1,
    isNormal: true,
    segments: [
      { label: 'Necrotic Core',     percent: 0, color: '#FF6B6B' },
      { label: 'Edema',             percent: 0, color: '#4A90D9' },
      { label: 'Enhancing Tumor',   percent: 0, color: '#6C5CE7' },
    ],
    explanation: 'AI classification shows no evidence of intracranial mass lesions, midline shifts, or abnormal tissue enhancements. Ventricles and sulci are normal for patient age. Clear clinical brain scan.'
  },
  '#TX-5717': {
    id: '#TX-5717',
    name: 'Robert Chen',
    status: 'Connected',
    code: 'P5',
    age: 58,
    gender: 'Male',
    dob: '15 Jun 1968',
    lastScan: '20 Jun 2026',
    diagnosis: 'Oligodendroglioma',
    tumorType: 'Oligodendroglioma (Grade II)',
    grade: 'Grade II',
    location: 'Occipital Lobe',
    volume: '8.2 cm³',
    volumeTolerance: '±0.25 cm³',
    confidence: 91.3,
    isNormal: false,
    segments: [
      { label: 'Necrotic Core',     percent: 10, color: '#FF6B6B' },
      { label: 'Edema',             percent: 30, color: '#4A90D9' },
      { label: 'Enhancing Tumor',   percent: 60, color: '#6C5CE7' },
    ],
    explanation: 'Scans indicate cortical and sub-cortical signal hyperintensities in the left occipital lobe with minor calcification, consistent with oligodendroglioma pathology. Margins are moderately defined with minimal mass effect.'
  }
};

export function PatientProvider({ children }) {
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const { patients } = usePatientStore();

  const calculateAge = (dobString) => {
    if (!dobString) return '—';
    try {
      const dob = new Date(dobString);
      const diffMs = Date.now() - dob.getTime();
      const ageDate = new Date(diffMs);
      return Math.abs(ageDate.getUTCFullYear() - 1970);
    } catch {
      return '—';
    }
  };

  // Auto-select the first available real patient when none is selected
  // or when the currently selected one was deleted
  useEffect(() => {
    if (patients.length === 0) {
      setSelectedPatientId(null);
      return;
    }
    const stillExists = patients.some((p) => p.id === selectedPatientId);
    if (!selectedPatientId || !stillExists) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients, selectedPatientId]);

  // Resolve the selected patient from the real DB only — no dummy fallback
  const dbPatient = patients.find((p) => p.id === selectedPatientId) ?? null;

  let selectedPatient = null;
  if (dbPatient) {
    selectedPatient = {
      id: dbPatient.id,
      name: `${dbPatient.first_name} ${dbPatient.last_name}`,
      status: 'Connected',
      code: dbPatient.id,
      age: calculateAge(dbPatient.dob),
      gender: dbPatient.gender,
      dob: dbPatient.dob,
      lastScan: dbPatient.updated_at ? new Date(dbPatient.updated_at).toLocaleDateString() : '—',
      diagnosis: dbPatient.medical_history || 'Under Observation',
      tumorType: 'None',
      grade: '—',
      location: '—',
      volume: '—',
      confidence: 100.0,
      isNormal: true,
      segments: [
        { label: 'Necrotic Core',   percent: 0, color: '#FF0000' },
        { label: 'Edema',           percent: 0, color: '#FFFF00' },
        { label: 'Enhancing Tumor', percent: 0, color: '#0000FF' },
      ],
      explanation: dbPatient.medical_history || 'Under Observation'
    };
  }

  return (
    <PatientContext.Provider value={{
      selectedPatientId,
      setSelectedPatientId,
      selectedPatient,
      patientProfiles
    }}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
}
