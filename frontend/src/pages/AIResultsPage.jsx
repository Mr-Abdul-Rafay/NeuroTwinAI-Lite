import React, { useState } from 'react';
import { aiResultData } from '../lib/mockData';
import GlassCard from '../components/ui/GlassCard';
import {
  CheckCircle, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  RotateCcw, Box, FileText, Download, AlertTriangle
} from 'lucide-react';
import { usePatient } from '../context/PatientContext';

const VIEW_MODES = ['Original MRI', 'Segmentation Mask', 'Overlay'];

export default function AIResultsPage() {
  const { selectedPatientId, selectedPatient } = usePatient();
  const [slice, setSlice] = useState(78);
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState('Overlay');

  const data = {
    ...aiResultData,
    detected: !selectedPatient.isNormal,
    confidence: selectedPatient.confidence,
    tumorType: selectedPatient.tumorType,
    grade: selectedPatient.grade,
    location: selectedPatient.location,
    volume: selectedPatient.volume,
    volumeTolerance: selectedPatient.volumeTolerance,
    segments: selectedPatient.segments,
    explanation: selectedPatient.explanation
  };

  const totalSlices = data.totalSlices;

  const sliceColors = {
    'Original MRI': 'hsl(220, 20%, 15%)',
    'Segmentation Mask': 'hsl(160, 80%, 8%)',
    'Overlay': 'hsl(200, 50%, 10%)',
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title gradient-text">AI Results</h1>
          <p className="page-subtitle">Patient {selectedPatientId} · Cortical Analysis · Last Scan {selectedPatient.lastScan}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary">
            <Download size={14} /> Download Results
          </button>
          <button className="btn-primary">
            <FileText size={14} /> Generate Report
          </button>
        </div>
      </div>

      <div className="ai-results-grid">
        {/* ── Left: MRI Viewer ── */}
        <GlassCard className="mri-viewer-card">
          <div className="mri-viewer-header">
            <span className="data-label">MRI SLICE VIEWER</span>
            <div className="view-mode-tabs">
              {VIEW_MODES.map(m => (
                <button
                  key={m}
                  className={`view-tab ${viewMode === m ? 'view-tab-active' : ''}`}
                  onClick={() => setViewMode(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* MRI Canvas Placeholder */}
          <div
            className="mri-canvas"
            style={{
              background: sliceColors[viewMode],
              transform: `scale(${zoom})`,
              transition: 'transform 0.3s ease',
            }}
          >
            {/* Simulated scan lines */}
            <svg width="100%" height="100%" viewBox="0 0 400 400" style={{ position: 'absolute', inset: 0 }}>
              {/* Brain outline */}
              <ellipse cx="200" cy="190" rx="150" ry="160" fill="none" stroke="rgba(70,241,197,0.15)" strokeWidth="1" />
              <ellipse cx="200" cy="185" rx="120" ry="130" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />

              {/* Tumor area */}
              {viewMode !== 'Original MRI' && !selectedPatient.isNormal && (
                <>
                  <ellipse cx="155" cy="160" rx="45" ry="38" fill="rgba(255,107,107,0.25)" stroke="#FF6B6B" strokeWidth="1.5" strokeDasharray="4,3" />
                  <ellipse cx="155" cy="160" rx="25" ry="20" fill="rgba(108,92,231,0.3)" stroke="#6C5CE7" strokeWidth="1" />
                </>
              )}

              {/* Scan lines */}
              {Array.from({ length: 12 }).map((_, i) => (
                <line
                  key={i}
                  x1="50" y1={60 + i * 25} x2="350" y2={60 + i * 25}
                  stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"
                />
              ))}

              {/* Slice indicator line */}
              <line x1="50" y1={60 + ((slice / totalSlices) * 300)} x2="350" y2={60 + ((slice / totalSlices) * 300)}
                stroke="#46f1c5" strokeWidth="1" opacity="0.5" />

              {/* Labels */}
              {viewMode === 'Overlay' && (
                <>
                  {!selectedPatient.isNormal && (
                    <text x="100" y="168" fill="#FF6B6B" fontSize="9" fontFamily="Roboto Mono">
                      {selectedPatient.diagnosis === 'Glioblastoma' ? 'GBM' : selectedPatient.diagnosis === 'Astrocytoma' ? 'AST' : selectedPatient.diagnosis === 'Meningioma' ? 'MEN' : 'OLI'}
                    </text>
                  )}
                  <text x="180" y="310" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="Roboto Mono">L</text>
                  <text x="30"  y="310" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="Roboto Mono">R</text>
                </>
              )}
            </svg>

            {/* Slice counter overlay */}
            <div className="mri-slice-counter">
              Slice {slice}/{totalSlices}
            </div>
          </div>

          {/* Viewer Controls */}
          <div className="mri-controls">
            <div className="mri-nav-controls">
              <button
                className="ctrl-btn"
                onClick={() => setSlice(s => Math.max(1, s - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <input
                type="range" min={1} max={totalSlices} value={slice}
                onChange={e => setSlice(Number(e.target.value))}
                className="slice-slider"
              />
              <button
                className="ctrl-btn"
                onClick={() => setSlice(s => Math.min(totalSlices, s + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="mri-zoom-controls">
              <button className="ctrl-btn" onClick={() => setZoom(z => Math.min(2, z + 0.1))} title="Zoom In">
                <ZoomIn size={14} />
              </button>
              <button className="ctrl-btn" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} title="Zoom Out">
                <ZoomOut size={14} />
              </button>
              <button className="ctrl-btn" onClick={() => { setZoom(1); setSlice(78); }} title="Reset">
                <RotateCcw size={14} />
              </button>
              <button className="btn-secondary btn-sm">
                <Box size={13} /> View in 3D
              </button>
            </div>
          </div>
        </GlassCard>

        {/* ── Right: Results Panel ── */}
        <div className="results-panel">
          {/* Detection Status */}
          <GlassCard className="detection-card">
            <div className="detection-header">
              <div className="detection-status">
                {selectedPatient.isNormal ? (
                  <>
                    <CheckCircle size={20} style={{ color: '#2ECC71' }} />
                    <span className="detection-title">No Anomaly Detected</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={20} style={{ color: '#FF6B6B' }} />
                    <span className="detection-title">Tumor Detected</span>
                  </>
                )}
              </div>
              <div className="confidence-badge">
                {data.confidence}% confidence
              </div>
            </div>

            <div className="tumor-meta-grid">
              {[
                ['Tumor Type', data.tumorType],
                ['Grade',      data.grade],
                ['Location',   data.location],
                ['Volume',     `${data.volume} ${data.volumeTolerance}`],
              ].map(([label, val]) => (
                <div key={label} className="tumor-meta-item">
                  <span className="data-label" style={{ fontSize: '10px' }}>{label.toUpperCase()}</span>
                  <span className="tumor-meta-value">{val}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Segmentation */}
          <GlassCard>
            <h3 className="results-section-title">Tumor Segmentation</h3>
            <div className="segmentation-list">
              {data.segments.map(seg => (
                <div key={seg.label} className="seg-item">
                  <div className="seg-label-row">
                    <span className="seg-dot" style={{ background: seg.color }} />
                    <span className="seg-name">{seg.label}</span>
                    <span className="seg-pct" style={{ color: seg.color }}>{seg.percent}%</span>
                  </div>
                  <div className="seg-bar-track">
                    <div
                      className="seg-bar-fill"
                      style={{ width: `${seg.percent}%`, background: seg.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* AI Explanation */}
          <GlassCard>
            <div className="ai-explanation-header">
              <AlertTriangle size={14} style={{ color: '#4A90D9' }} />
              <h3 className="results-section-title" style={{ margin: 0 }}>AI Explanation</h3>
            </div>
            <p className="ai-explanation-text">{data.explanation}</p>
            <button className="btn-secondary" style={{ width: '100%', marginTop: '12px' }}>
              View Full Explanation
            </button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
