import React, { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Environment } from '@react-three/drei';
import GlassCard from '../components/ui/GlassCard';
import { RotateCcw, Download, Eye, EyeOff, Brain, Loader } from 'lucide-react';
import { usePatient } from '../context/PatientContext';
import useUploadStore from '../store/uploadStore';
import usePatientStore from '../store/patientStore';
import { useGenerateMesh } from '../hooks/useUpload';

// ── 3D Brain Model (standard Three.js scene) ─────────────────────────────
function BrainMesh({ showTumor, showEEG }) {
  const brainRef = useRef();
  const tumorRef = useRef();

  useFrame((state) => {
    if (brainRef.current) {
      brainRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.12;
      brainRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.04;
    }
    if (tumorRef.current) {
      tumorRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group>
      <group ref={brainRef}>
        <Sphere args={[1.6, 64, 64]} position={[-0.3, 0, 0]}>
          <MeshDistortMaterial color="#1a4a3a" emissive="#0a2218" roughness={0.8} metalness={0.1} distort={0.25} speed={1.2} transparent opacity={0.88} />
        </Sphere>
        <Sphere args={[1.55, 64, 64]} position={[0.3, 0.05, 0]}>
          <MeshDistortMaterial color="#1a4a3a" emissive="#0a2218" roughness={0.8} metalness={0.1} distort={0.22} speed={1.0} transparent opacity={0.82} />
        </Sphere>
        <Sphere args={[0.4, 32, 32]} position={[0, -1.7, 0]}>
          <meshStandardMaterial color="#163328" roughness={0.9} transparent opacity={0.7} />
        </Sphere>
        <Sphere args={[0.7, 32, 32]} position={[0, -1.1, -0.9]}>
          <MeshDistortMaterial color="#163328" distort={0.15} speed={0.8} roughness={0.9} transparent opacity={0.75} />
        </Sphere>

        {showTumor && (
          <group ref={tumorRef} position={[-0.8, 0.5, 0.4]}>
            <Sphere args={[0.35, 32, 32]}>
              <meshStandardMaterial color="#FF6B6B" emissive="#cc2200" emissiveIntensity={0.6} roughness={0.3} metalness={0.2} transparent opacity={0.85} />
            </Sphere>
            <Sphere args={[0.45, 32, 32]}>
              <meshStandardMaterial color="#FF6B6B" transparent opacity={0.12} />
            </Sphere>
          </group>
        )}

        {showEEG && (
          <>
            {[[-0.9,1.4,0.8],[0.9,1.4,0.8],[-1.2,0.2,1.0],[1.2,0.2,1.0],[-0.4,1.6,0],[0.4,1.6,0]].map((pos, i) => (
              <Sphere key={i} args={[0.06, 16, 16]} position={pos}>
                <meshStandardMaterial color="#46f1c5" emissive="#46f1c5" emissiveIntensity={1.5} />
              </Sphere>
            ))}
          </>
        )}
      </group>

      {Array.from({ length: 30 }).map((_, i) => {
        const theta = (i / 30) * Math.PI * 2;
        const r = 2.8 + Math.sin(i * 1.3) * 0.4;
        return (
          <Sphere key={`p${i}`} args={[0.02, 8, 8]} position={[Math.cos(theta) * r, Math.sin(i * 0.7) * 0.8, Math.sin(theta) * r]}>
            <meshStandardMaterial color="#46f1c5" emissive="#46f1c5" emissiveIntensity={2} transparent opacity={0.5} />
          </Sphere>
        );
      })}
    </group>
  );
}

const VIEW_PRESETS = {
  Superior: [0, 5, 0.1],
  Inferior: [0, -5, 0.1],
  Lateral:  [5, 0, 0],
  Frontal:  [0, 0, 5],
  Sagittal: [5, 1, 1],
};

export default function TwinViewerPage() {
  const { selectedPatientId, selectedPatient } = usePatient();
  const patients = usePatientStore((state) => state.patients);

  if (patients.length === 0 || !selectedPatientId || !selectedPatient) {
    return (
      <div className="page-content fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <Brain size={48} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: '16px' }} />
        <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0' }}>No Patient Data</h3>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '0 0 16px 0', maxWidth: '300px' }}>
          Please add a patient in the Patient Directory or select a patient to view the 3D Digital Twin.
        </p>
      </div>
    );
  }

  const { uploadId, segmentation, meshGltfB64, isGeneratingMesh } = useUploadStore();
  const { mutate: doGenerateMesh } = useGenerateMesh();

  const [showBrain,  setShowBrain]  = useState(true);
  const [showTumor,  setShowTumor]  = useState(!selectedPatient.isNormal);
  const [showEEG,    setShowEEG]    = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [camTarget,  setCamTarget]  = useState([0, 3, 5]);
  const controlsRef = useRef();

  const tumorDetected = segmentation ? segmentation.tumor_detected : !selectedPatient.isNormal;

  useEffect(() => {
    setShowTumor(tumorDetected);
  }, [tumorDetected]);

  const setPreset = (name) => setCamTarget(VIEW_PRESETS[name]);

  const toggles = [
    { label: 'Brain',     state: showBrain,  set: setShowBrain,  color: '#46f1c5' },
    { label: 'Tumour',    state: showTumor,  set: setShowTumor,  color: '#FF6B6B' },
    { label: 'EEG Nodes', state: showEEG,    set: setShowEEG,    color: '#6C5CE7' },
    { label: 'Labels',    state: showLabels, set: setShowLabels, color: '#4A90D9' },
  ];

  const tumorVolume = segmentation?.tumor_volume_cm3 != null
    ? `${segmentation.tumor_volume_cm3.toFixed(2)} cm³`
    : selectedPatient.volume;

  const confidencePct = segmentation?.confidence != null
    ? (segmentation.confidence <= 1 ? (segmentation.confidence * 100).toFixed(1) : segmentation.confidence.toFixed(1))
    : selectedPatient.confidence;

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title gradient-text">3D Twin Viewer</h1>
          <p className="page-subtitle">
            {segmentation
              ? `Live Model · Upload ${uploadId} · AI Segmentation`
              : `Patient ${selectedPatientId} · Interactive Digital Brain Twin · Last Scan ${selectedPatient.lastScan}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['GLTF', 'OBJ', 'STL'].map((fmt) => (
            <button key={fmt} className="btn-secondary btn-sm">
              <Download size={12} /> {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Live model notice */}
      {segmentation && (
        <div style={{
          background: 'rgba(70,241,197,0.06)',
          border: '1px solid rgba(70,241,197,0.2)',
          borderRadius: '10px',
          padding: '10px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          fontSize: '13px',
          color: '#46f1c5',
          fontFamily: 'Roboto Mono',
        }}>
          <span><Brain size={14} style={{ display: 'inline', marginRight: 6 }} />
            Live segmentation loaded — upload {uploadId}
          </span>
          {!meshGltfB64 && uploadId && (
            <button
              className="btn-secondary btn-sm"
              onClick={() => doGenerateMesh({ uploadId })}
              disabled={isGeneratingMesh}
            >
              {isGeneratingMesh ? <><div className="mini-spinner" /> Generating…</> : 'Load GLTF Mesh'}
            </button>
          )}
        </div>
      )}

      <div className="twin-viewer-layout">
        {/* ── 3D Canvas ── */}
        <GlassCard className="canvas-card">
          {/* Toolbar */}
          <div className="canvas-toolbar">
            <div className="view-presets">
              {Object.keys(VIEW_PRESETS).map((name) => (
                <button key={name} className="preset-btn" onClick={() => setPreset(name)}>{name}</button>
              ))}
            </div>
            <button className="ctrl-btn" onClick={() => setCamTarget([0, 3, 5])} title="Reset View">
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          {/* Toggle chips */}
          <div className="toggle-row">
            {toggles.map((t) => (
              <button
                key={t.label}
                onClick={() => t.set(!t.state)}
                className="toggle-chip"
                style={{
                  borderColor: t.state ? t.color : 'rgba(255,255,255,0.1)',
                  color:       t.state ? t.color : 'rgba(255,255,255,0.4)',
                  background:  t.state ? `${t.color}18` : 'transparent',
                }}
              >
                {t.state ? <Eye size={12} /> : <EyeOff size={12} />} {t.label}
              </button>
            ))}
          </div>

          {/* Three.js Canvas */}
          <div className="three-canvas-wrap">
            {isGeneratingMesh && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 10,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(10,10,20,0.7)', gap: '12px',
              }}>
                <div className="spinner" />
                <span style={{ color: '#46f1c5', fontFamily: 'Roboto Mono', fontSize: '13px' }}>
                  Generating 3D mesh…
                </span>
              </div>
            )}
            <Canvas camera={{ position: camTarget, fov: 50 }} style={{ background: 'transparent' }}>
              <ambientLight intensity={0.4} />
              <directionalLight position={[5, 8, 5]} intensity={1.2} color="#ffffff" />
              <directionalLight position={[-5, -3, -5]} intensity={0.3} color="#4A90D9" />
              <pointLight position={[0, 0, 4]} intensity={0.8} color="#46f1c5" />
              <Suspense fallback={null}>
                {showBrain && <BrainMesh showTumor={showTumor} showEEG={showEEG} />}
                <Environment preset="city" />
              </Suspense>
              <OrbitControls ref={controlsRef} enablePan enableZoom enableRotate minDistance={3} maxDistance={10} />
            </Canvas>

            {/* Grid overlay */}
            <div className="canvas-grid-overlay" style={{ pointerEvents: 'none' }}>
              <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.04 }}>
                {Array.from({ length: 20 }).map((_, i) => (
                  <React.Fragment key={i}>
                    <line x1={`${i * 5}%`} y1="0" x2={`${i * 5}%`} y2="100%" stroke="#46f1c5" strokeWidth="0.5" />
                    <line x1="0" y1={`${i * 5}%`} x2="100%" y2={`${i * 5}%`} stroke="#46f1c5" strokeWidth="0.5" />
                  </React.Fragment>
                ))}
              </svg>
            </div>
          </div>
        </GlassCard>

        {/* ── Info Sidebar ── */}
        <div className="twin-info-panel">
          <GlassCard>
            <h3 className="results-section-title">Patient Info</h3>
            {[
              ['Patient ID',   segmentation ? uploadId : selectedPatientId],
              ['Age',          `${selectedPatient.age} years (${selectedPatient.gender})`],
              ['Scan Date',    selectedPatient.lastScan],
              ['Institution',  'Neuro Medical Center'],
            ].map(([k, v]) => (
              <div key={k} className="info-row">
                <span className="data-label" style={{ fontSize: '10px' }}>{k}</span>
                <span className="info-value">{v}</span>
              </div>
            ))}
          </GlassCard>

          <GlassCard>
            <h3 className="results-section-title">Tumour Metrics</h3>
            {tumorDetected ? (
              [
                ['Type',       segmentation ? 'AI Detected' : selectedPatient.tumorType],
                ['Location',   segmentation ? '—'           : selectedPatient.location],
                ['Volume',     tumorVolume],
                ['Confidence', `${confidencePct}%`],
              ].map(([k, v]) => (
                <div key={k} className="info-row">
                  <span className="data-label" style={{ fontSize: '10px' }}>{k}</span>
                  <span className="info-value" style={{ color: '#FF6B6B' }}>{v}</span>
                </div>
              ))
            ) : (
              [
                ['Type',       'No Tumour Detected'],
                ['Location',   'N/A'],
                ['Volume',     '0.0 cm³'],
                ['Confidence', `${confidencePct}%`],
              ].map(([k, v]) => (
                <div key={k} className="info-row">
                  <span className="data-label" style={{ fontSize: '10px' }}>{k}</span>
                  <span className="info-value" style={{ color: '#2ECC71' }}>{v}</span>
                </div>
              ))
            )}
          </GlassCard>

          <GlassCard>
            <h3 className="results-section-title">Model Stats</h3>
            {[
              ['Vertices',   '124,832'],
              ['Polygons',   '62,416'],
              ['Resolution', '1mm isotropic'],
              ['Processing', segmentation ? '—' : '2.4s'],
            ].map(([k, v]) => (
              <div key={k} className="info-row">
                <span className="data-label" style={{ fontSize: '10px' }}>{k}</span>
                <span className="info-value">{v}</span>
              </div>
            ))}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
