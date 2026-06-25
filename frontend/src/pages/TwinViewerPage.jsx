import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Environment } from '@react-three/drei';
import GlassCard from '../components/ui/GlassCard';
import { RotateCcw, Download, Eye, EyeOff } from 'lucide-react';
import { usePatient } from '../context/PatientContext';

// ---- 3D Brain Model ----
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
      {/* Main brain hemisphere — left */}
      <group ref={brainRef}>
        <Sphere args={[1.6, 64, 64]} position={[-0.3, 0, 0]}>
          <MeshDistortMaterial
            color="#1a4a3a"
            emissive="#0a2218"
            roughness={0.8}
            metalness={0.1}
            distort={0.25}
            speed={1.2}
            transparent
            opacity={0.88}
          />
        </Sphere>

        {/* Right hemisphere */}
        <Sphere args={[1.55, 64, 64]} position={[0.3, 0.05, 0]}>
          <MeshDistortMaterial
            color="#1a4a3a"
            emissive="#0a2218"
            roughness={0.8}
            metalness={0.1}
            distort={0.22}
            speed={1.0}
            transparent
            opacity={0.82}
          />
        </Sphere>

        {/* Brain stem */}
        <Sphere args={[0.4, 32, 32]} position={[0, -1.7, 0]}>
          <meshStandardMaterial color="#163328" roughness={0.9} transparent opacity={0.7} />
        </Sphere>

        {/* Cerebellum */}
        <Sphere args={[0.7, 32, 32]} position={[0, -1.1, -0.9]}>
          <MeshDistortMaterial color="#163328" distort={0.15} speed={0.8} roughness={0.9} transparent opacity={0.75} />
        </Sphere>

        {/* Tumor */}
        {showTumor && (
          <group ref={tumorRef} position={[-0.8, 0.5, 0.4]}>
            <Sphere args={[0.35, 32, 32]}>
              <meshStandardMaterial
                color="#FF6B6B"
                emissive="#cc2200"
                emissiveIntensity={0.6}
                roughness={0.3}
                metalness={0.2}
                transparent
                opacity={0.85}
              />
            </Sphere>
            {/* Tumor glow ring */}
            <Sphere args={[0.45, 32, 32]}>
              <meshStandardMaterial color="#FF6B6B" transparent opacity={0.12} />
            </Sphere>
          </group>
        )}

        {/* EEG nodes */}
        {showEEG && (
          <>
            {[
              [-0.9, 1.4, 0.8], [0.9, 1.4, 0.8],
              [-1.2, 0.2, 1.0], [1.2, 0.2, 1.0],
              [-0.4, 1.6, 0],   [0.4, 1.6, 0],
            ].map((pos, i) => (
              <Sphere key={i} args={[0.06, 16, 16]} position={pos}>
                <meshStandardMaterial color="#46f1c5" emissive="#46f1c5" emissiveIntensity={1.5} />
              </Sphere>
            ))}
          </>
        )}
      </group>

      {/* Ambient particles */}
      {Array.from({ length: 30 }).map((_, i) => {
        const theta = (i / 30) * Math.PI * 2;
        const r = 2.8 + Math.sin(i * 1.3) * 0.4;
        return (
          <Sphere
            key={`p${i}`}
            args={[0.02, 8, 8]}
            position={[Math.cos(theta) * r, Math.sin(i * 0.7) * 0.8, Math.sin(theta) * r]}
          >
            <meshStandardMaterial color="#46f1c5" emissive="#46f1c5" emissiveIntensity={2} transparent opacity={0.5} />
          </Sphere>
        );
      })}
    </group>
  );
}

const VIEW_PRESETS = {
  Superior:  [0, 5, 0.1],
  Inferior:  [0, -5, 0.1],
  Lateral:   [5, 0, 0],
  Frontal:   [0, 0, 5],
  Sagittal:  [5, 1, 1],
};

export default function TwinViewerPage() {
  const { selectedPatientId, selectedPatient } = usePatient();
  const [showBrain,  setShowBrain]  = useState(true);
  const [showTumor,  setShowTumor]  = useState(!selectedPatient.isNormal);
  const [showEEG,    setShowEEG]    = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [camTarget,  setCamTarget]  = useState([0, 3, 5]);
  const controlsRef = useRef();

  useEffect(() => {
    setShowTumor(!selectedPatient.isNormal);
  }, [selectedPatient]);

  const setPreset = (name) => {
    const pos = VIEW_PRESETS[name];
    setCamTarget(pos);
  };

  const toggles = [
    { label: 'Brain',      state: showBrain, set: setShowBrain,  color: '#46f1c5' },
    { label: 'Tumor',      state: showTumor, set: setShowTumor,  color: '#FF6B6B' },
    { label: 'EEG Nodes',  state: showEEG,   set: setShowEEG,    color: '#6C5CE7' },
    { label: 'Labels',     state: showLabels,set: setShowLabels, color: '#4A90D9' },
  ];

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title gradient-text">3D Twin Viewer</h1>
          <p className="page-subtitle">Patient {selectedPatientId} · Interactive Digital Brain Twin · Last Scan {selectedPatient.lastScan}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['GLTF', 'OBJ', 'STL'].map(fmt => (
            <button key={fmt} className="btn-secondary btn-sm">
              <Download size={12} /> {fmt}
            </button>
          ))}
        </div>
      </div>

      <div className="twin-viewer-layout">
        {/* ── 3D Canvas ── */}
        <GlassCard className="canvas-card">
          {/* Toolbar */}
          <div className="canvas-toolbar">
            <div className="view-presets">
              {Object.keys(VIEW_PRESETS).map(name => (
                <button
                  key={name}
                  className="preset-btn"
                  onClick={() => setPreset(name)}
                >
                  {name}
                </button>
              ))}
            </div>
            <button
              className="ctrl-btn"
              onClick={() => setCamTarget([0, 3, 5])}
              title="Reset View"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          {/* Toggle row */}
          <div className="toggle-row">
            {toggles.map(t => (
              <button
                key={t.label}
                onClick={() => t.set(!t.state)}
                className="toggle-chip"
                style={{
                  borderColor: t.state ? t.color : 'rgba(255,255,255,0.1)',
                  color: t.state ? t.color : 'rgba(255,255,255,0.4)',
                  background: t.state ? `${t.color}18` : 'transparent',
                }}
              >
                {t.state ? <Eye size={12} /> : <EyeOff size={12} />}
                {t.label}
              </button>
            ))}
          </div>

          {/* Three.js Canvas */}
          <div className="three-canvas-wrap">
            <Canvas
              camera={{ position: camTarget, fov: 50 }}
              style={{ background: 'transparent' }}
            >
              <ambientLight intensity={0.4} />
              <directionalLight position={[5, 8, 5]} intensity={1.2} color="#ffffff" />
              <directionalLight position={[-5, -3, -5]} intensity={0.3} color="#4A90D9" />
              <pointLight position={[0, 0, 4]} intensity={0.8} color="#46f1c5" />

              <Suspense fallback={null}>
                {showBrain && <BrainMesh showTumor={showTumor} showEEG={showEEG} />}
                <Environment preset="city" />
              </Suspense>

              <OrbitControls
                ref={controlsRef}
                enablePan
                enableZoom
                enableRotate
                minDistance={3}
                maxDistance={10}
              />
            </Canvas>

            {/* Canvas overlay grid */}
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
              ['Patient ID', selectedPatientId],
              ['Age', `${selectedPatient.age} years (${selectedPatient.gender})`],
              ['Scan Date', selectedPatient.lastScan],
              ['Institution', 'Neuro Medical Center'],
            ].map(([k, v]) => (
              <div key={k} className="info-row">
                <span className="data-label" style={{ fontSize: '10px' }}>{k}</span>
                <span className="info-value">{v}</span>
              </div>
            ))}
          </GlassCard>

          <GlassCard>
            <h3 className="results-section-title">Tumor Metrics</h3>
            {selectedPatient.isNormal ? (
              [
                ['Type',       'No Tumor Detected'],
                ['Location',   'N/A'],
                ['Volume',     '0.0 cm³'],
                ['Confidence', `${selectedPatient.confidence}%`],
              ].map(([k, v]) => (
                <div key={k} className="info-row">
                  <span className="data-label" style={{ fontSize: '10px' }}>{k}</span>
                  <span className="info-value" style={{ color: '#2ECC71' }}>{v}</span>
                </div>
              ))
            ) : (
              [
                ['Type',       selectedPatient.tumorType],
                ['Location',   selectedPatient.location],
                ['Volume',     selectedPatient.volume],
                ['Confidence', `${selectedPatient.confidence}%`],
              ].map(([k, v]) => (
                <div key={k} className="info-row">
                  <span className="data-label" style={{ fontSize: '10px' }}>{k}</span>
                  <span className="info-value" style={{ color: '#FF6B6B' }}>{v}</span>
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
              ['Processing', '2.4s'],
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
