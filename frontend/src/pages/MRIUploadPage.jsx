import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Upload, X, FileText, CheckCircle, Clock, AlertCircle, Brain, Activity } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import { useUploadMRI, useRecentUploads, useUploadStats } from '../hooks/useUpload';
import useUploadStore from '../store/uploadStore';
import { usePatient } from '../context/PatientContext';
import usePatientStore from '../store/patientStore';
import useResultStore from '../store/resultStore';
import { healthApi } from '../api/health';

const ALLOWED_EXTENSIONS = ['.dcm', '.nii', '.nii.gz', '.zip'];
const MAX_SIZE_MB = 500;

function UploadStatusIcon({ status }) {
  if (status === 'Completed') return <CheckCircle size={14} style={{ color: '#2ECC71' }} />;
  if (status === 'Processing') return <div className="mini-spinner" />;
  if (status === 'Queued')    return <Clock size={14} style={{ color: '#4A90D9' }} />;
  return <AlertCircle size={14} style={{ color: '#FF6B6B' }} />;
}

// ── Segmentation result card shown after successful upload ────────────────
function SegmentationResult({ seg, uploadId, onViewResults }) {
  const pct = seg.confidence != null
    ? (seg.confidence <= 1 ? (seg.confidence * 100).toFixed(1) : seg.confidence.toFixed(1))
    : '—';

  const volumeLabel = seg.tumor_volume_cm3 != null
    ? `${seg.tumor_volume_cm3.toFixed(2)} cm³`
    : '—';

  return (
    <div className="glass-card glowing-card" style={{ padding: '24px', marginTop: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        {seg.tumor_detected ? (
          <AlertCircle size={20} style={{ color: '#FF6B6B' }} />
        ) : (
          <CheckCircle size={20} style={{ color: '#2ECC71' }} />
        )}
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#fff' }}>
          {seg.tumor_detected ? 'Tumour Detected' : 'No Tumour Detected'}
        </h3>
        <span style={{
          marginLeft: 'auto',
          background: seg.tumor_detected ? 'rgba(255,107,107,0.12)' : 'rgba(46,204,113,0.12)',
          border: `1px solid ${seg.tumor_detected ? 'rgba(255,107,107,0.3)' : 'rgba(46,204,113,0.3)'}`,
          color: seg.tumor_detected ? '#FF6B6B' : '#2ECC71',
          padding: '3px 12px',
          borderRadius: '999px',
          fontSize: '12px',
          fontWeight: '700',
          fontFamily: 'Roboto Mono',
        }}>
          {pct}% confidence
        </span>
      </div>

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'TOTAL VOLUME', value: volumeLabel },
          { label: 'NECROTIC', value: seg.necrotic_volume_mm3 != null ? `${seg.necrotic_volume_mm3.toFixed(0)} mm³` : '—' },
          { label: 'EDEMA', value: seg.edema_volume_mm3 != null ? `${seg.edema_volume_mm3.toFixed(0)} mm³` : '—' },
          { label: 'ENHANCING', value: seg.enhancing_volume_mm3 != null ? `${seg.enhancing_volume_mm3.toFixed(0)} mm³` : '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '8px',
            padding: '12px',
          }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'Roboto Mono', letterSpacing: '0.08em', marginBottom: '6px' }}>{label}</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#46f1c5', fontFamily: 'Roboto Mono' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Segmentation bars */}
      {seg.tumor_detected && (
        <div style={{ marginBottom: '20px' }}>
          {[
            { label: 'Necrotic Core', vol: seg.necrotic_volume_mm3, color: '#FF6B6B' },
            { label: 'Peritumoral Edema', vol: seg.edema_volume_mm3, color: '#4A90D9' },
            { label: 'Enhancing Tumour', vol: seg.enhancing_volume_mm3, color: '#6C5CE7' },
          ].map(({ label, vol, color }) => {
            const total = (seg.necrotic_volume_mm3 || 0) + (seg.edema_volume_mm3 || 0) + (seg.enhancing_volume_mm3 || 0);
            const pct = total > 0 ? (vol / total) * 100 : 0;
            return (
              <div key={label} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</span>
                  <span style={{ color, fontFamily: 'Roboto Mono', fontWeight: '600' }}>{pct.toFixed(1)}%</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '5px' }}>
                  <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: '4px', transition: 'width 0.8s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload ID */}
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: 'Roboto Mono', marginBottom: '16px' }}>
        Upload ID: {uploadId}
      </div>

      <button
        className="btn-primary"
        style={{ width: '100%', justifyContent: 'center' }}
        onClick={onViewResults}
      >
        <Activity size={14} /> View Full AI Results
      </button>
    </div>
  );
}

// ── Helper to detect modality from filename ──────────────────────────────
function detectModality(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('flair')) return 'FLAIR';
  if (lower.includes('t1ce') || lower.includes('t1')) return 'T1ce';
  if (lower.includes('t2')) return 'T2';
  return 'Unknown';
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function MRIUploadPage({ apiBase, onNavigate }) {
  const { selectedPatientId, setSelectedPatientId, patientProfiles, selectedPatient } = usePatient();
  const { patients, fetchPatients } = usePatientStore();
  const [dragOver, setDragOver]   = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError]         = useState('');
  const fileInputRef = useRef();

  const clearUploads = useUploadStore((state) => state.clearUploads);
  const clearResults = useResultStore((state) => state.clearResults);

  useEffect(() => {
    if (patients.length === 0) {
      clearUploads();
      clearResults();
    }
  }, [patients, clearUploads, clearResults]);

  useEffect(() => {
    fetchPatients();
  }, []);

  const [isBackendConnected, setIsBackendConnected] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await healthApi.check();
        setIsBackendConnected(true);
      } catch {
        setIsBackendConnected(false);
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const { uploadId, isUploading, uploadProgress, segmentation } = useUploadStore();

  const { mutate: doUpload } = useUploadMRI(() => {
    onNavigate?.('ai-results');
  });

  // Clear any stale error toasts from previous sessions
  useEffect(() => {
    toast.dismiss('mri-upload');
  }, []);

  const { data: recentUploads = [], isLoading: loadingRecent } = useRecentUploads(5);
  const { data: stats } = useUploadStats();

  const handleFiles = (filesList) => {
    if (!filesList || filesList.length === 0) return;

    const validFiles = [];
    let fileError = '';

    for (const file of filesList) {
      const name = file.name.toLowerCase();
      const valid = ALLOWED_EXTENSIONS.some((t) => name.endsWith(t));
      if (!valid) {
        fileError = `Invalid type: ${file.name}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
        break;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        fileError = `File too large: ${file.name}. Max: ${MAX_SIZE_MB} MB`;
        break;
      }
      validFiles.push(file);
    }

    if (fileError) {
      setError(fileError);
      return;
    }

    setError('');
    setSelectedFiles((prev) => {
      const combined = [...prev];
      validFiles.forEach((vf) => {
        if (!combined.some((cf) => cf.name === vf.name)) {
          combined.push(vf);
        }
      });
      return combined;
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleUpload = (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;
    if (!selectedPatientId) {
      setError('Please select a patient before uploading.');
      return;
    }
    doUpload({ files: selectedFiles, patientId: selectedPatientId });
    setSelectedFiles([]);
  };

  const hasModality = (mod) => selectedFiles.some(f => detectModality(f.name) === mod);

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title gradient-text">MRI Upload</h1>
          <p className="page-subtitle">Upload and process MRI scans through the AI segmentation pipeline</p>
        </div>
      </div>

      {!isBackendConnected && (
        <div className="connection-error" style={{
          background: 'rgba(255, 107, 107, 0.15)',
          border: '1px solid rgba(255, 107, 107, 0.4)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: '#FF6B6B',
          fontSize: '13px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backdropFilter: 'blur(8px)',
        }}>
          ⚠️ Backend not connected. Please start the server.
        </div>
      )}

      <div className="upload-layout">
        {/* ── Left: Upload Zone ─────────────────────────────────────────── */}
        <div>
          <GlassCard className="upload-card">
            <h2 className="section-heading">Upload New Scan</h2>

            {/* Drop Zone */}
            <div
              className={`drop-zone ${dragOver ? 'drop-zone-active' : ''} ${selectedFiles.length > 0 ? 'drop-zone-selected' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ minHeight: selectedFiles.length > 0 ? '260px' : '200px' }}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".dcm,.nii,.gz,.zip"
                multiple
                onChange={(e) => handleFiles(Array.from(e.target.files))}
              />
              {selectedFiles.length > 0 ? (
                <div className="file-selected-list" onClick={(e) => e.stopPropagation()} style={{ width: '100%', padding: '10px 0', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#46f1c5', background: 'rgba(70,241,197,0.1)', padding: '4px 10px', borderRadius: '999px', fontFamily: 'Roboto Mono' }}>
                      {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                    </span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#46f1c5', cursor: 'pointer', fontSize: '12px' }}
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      >
                        + Add files
                      </button>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '12px' }}
                        onClick={(e) => { e.stopPropagation(); setSelectedFiles([]); }}
                      >
                        Clear all
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                    {selectedFiles.map((file, idx) => {
                      const mod = detectModality(file.name);
                      return (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <FileText size={16} style={{ color: 'rgba(255,255,255,0.6)', flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: '13px', fontWeight: '500', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                                {file.name}
                              </p>
                              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'Roboto Mono' }}>
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              fontFamily: 'Roboto Mono',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: mod === 'FLAIR' ? 'rgba(74, 144, 217, 0.15)' :
                                          mod === 'T1ce' ? 'rgba(108, 92, 231, 0.15)' :
                                          mod === 'T2' ? 'rgba(230, 126, 34, 0.15)' : 'rgba(255,255,255,0.08)',
                              border: `1px solid ${
                                mod === 'FLAIR' ? 'rgba(74, 144, 217, 0.4)' :
                                mod === 'T1ce' ? 'rgba(108, 92, 231, 0.4)' :
                                mod === 'T2' ? 'rgba(230, 126, 34, 0.4)' : 'rgba(255,255,255,0.15)'
                              }`,
                              color: mod === 'FLAIR' ? '#4A90D9' :
                                     mod === 'T1ce' ? '#a29bfe' :
                                     mod === 'T2' ? '#e67e22' : 'rgba(255,255,255,0.5)',
                            }}>
                              {mod}
                            </span>
                            <button
                              type="button"
                              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              onClick={(e) => { e.stopPropagation(); setSelectedFiles((prev) => prev.filter((_, i) => i !== idx)); }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex',
                    justifyContent: 'space-around',
                    fontSize: '11px',
                  }}>
                    {[
                      { name: 'FLAIR', label: 'FLAIR' },
                      { name: 'T1ce', label: 'T1ce' },
                      { name: 'T2', label: 'T2' }
                    ].map(mod => {
                      const detected = hasModality(mod.name);
                      return (
                        <div key={mod.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: detected ? '#46f1c5' : 'rgba(255,255,255,0.3)' }}>
                          <span style={{
                            display: 'inline-block',
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: detected ? '#46f1c5' : 'rgba(255,255,255,0.2)',
                            boxShadow: detected ? '0 0 6px #46f1c5' : 'none'
                          }} />
                          <span style={{ fontWeight: detected ? '600' : '400', fontFamily: 'Roboto Mono' }}>{mod.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="drop-zone-content">
                  <div className="drop-icon-wrap">
                    <Upload size={28} style={{ color: '#46f1c5' }} />
                  </div>
                  <p className="drop-title">Drag & drop MRI files here</p>
                  <p className="drop-subtitle">or <span className="drop-link">click to browse</span></p>
                  <div className="drop-formats">
                    {ALLOWED_EXTENSIONS.map((t) => <span key={t} className="format-chip">{t}</span>)}
                  </div>
                  <p className="drop-limit">Maximum file size: {MAX_SIZE_MB} MB per file</p>
                </div>
              )}
            </div>

            {error && (
              <div className="upload-error">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleUpload} className="upload-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="data-label">PATIENT ID</label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="" disabled>Select Patient</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id} - {p.first_name} {p.last_name}
                      </option>
                    ))}
                    {patients.length === 0 && (
                      <option value="" disabled>No patients registered yet</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label className="data-label">PATIENT NAME</label>
                  <div className="input-field" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#46f1c5', fontWeight: 600, cursor: 'default', userSelect: 'none' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#46f1c5', boxShadow: '0 0 6px #46f1c5', flexShrink: 0 }} />
                    {selectedPatient?.name || '—'}
                  </div>
                </div>
              </div>

              {/* Upload progress bar */}
              {isUploading && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                    <span style={{ fontFamily: 'Roboto Mono' }}>
                      {uploadProgress < 100 ? 'Uploading files…' : 'Running AI segmentation…'}
                    </span>
                    <span style={{ fontFamily: 'Roboto Mono', color: '#46f1c5' }}>{uploadProgress}%</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${uploadProgress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #46f1c5, #4A90D9)',
                      borderRadius: '999px',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  {uploadProgress >= 100 && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="mini-spinner" />
                      <span style={{ fontSize: '12px', color: '#4A90D9', fontFamily: 'Roboto Mono' }}>
                        Model inference in progress…
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="upload-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setSelectedFiles([]); setError(''); }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isUploading || selectedFiles.length === 0}
                >
                  {isUploading ? (
                    <><div className="mini-spinner" /> Processing…</>
                  ) : (
                    <><Upload size={14} /> Submit for Analysis</>
                  )}
                </button>
              </div>
            </form>
          </GlassCard>

          {/* Segmentation result card */}
          {segmentation && uploadId && !isUploading && (
            <SegmentationResult
              seg={segmentation}
              uploadId={uploadId}
              onViewResults={() => onNavigate?.('ai-results')}
            />
          )}
        </div>

        {/* ── Right: Recent Uploads ──────────────────────────────────────── */}
        <div>
          {/* Stats row */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              {[
                { label: 'TOTAL', value: stats.total },
                { label: 'THIS WEEK', value: stats.thisWeek },
                { label: 'SUCCESS', value: `${stats.successRate}%` },
              ].map(({ label, value }) => (
                <div key={label} className="glass-card" style={{ padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'Roboto Mono', letterSpacing: '0.08em', marginBottom: '4px' }}>{label}</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#46f1c5', fontFamily: 'Roboto Mono' }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          <GlassCard className="recent-uploads-card">
            <h2 className="section-heading">Recent Uploads</h2>
            <div className="uploads-list">
              {loadingRecent ? (
                // Loading skeletons
                [...Array(3)].map((_, i) => (
                  <div key={i} className="upload-item" style={{ opacity: 0.4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                      <div>
                        <div style={{ width: 80, height: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginBottom: 4 }} />
                        <div style={{ width: 50, height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
                      </div>
                    </div>
                  </div>
                ))
              ) : recentUploads.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
                  <Brain size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p>No uploads yet.<br />Upload an MRI to get started.</p>
                </div>
              ) : (
                recentUploads.map((u, i) => (
                  <div key={u.upload_id ?? i} className="upload-item">
                    <div className="upload-item-left">
                      <UploadStatusIcon status={u.status} />
                      <div>
                        <p className="upload-patient">
                          {u.filename
                            ? u.filename.length > 22 ? u.filename.slice(0, 22) + '…' : u.filename
                            : `Patient ${u.patient_id}`}
                        </p>
                        <p className="upload-date" style={{ fontFamily: 'Roboto Mono' }}>
                          {u.patient_id} · {u.file_size_mb ? `${u.file_size_mb} MB` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="upload-item-right">
                      <span style={{
                        fontSize: '11px',
                        fontFamily: 'Roboto Mono',
                        color: u.status === 'Completed' ? '#2ECC71' : '#4A90D9',
                        background: u.status === 'Completed' ? 'rgba(46,204,113,0.1)' : 'rgba(74,144,217,0.1)',
                        border: `1px solid ${u.status === 'Completed' ? 'rgba(46,204,113,0.3)' : 'rgba(74,144,217,0.3)'}`,
                        padding: '3px 8px',
                        borderRadius: '999px',
                      }}>
                        {u.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Fallback stats */}
            {!stats && (
              <div className="upload-stats">
                <div className="upload-stat">
                  <span className="data-label" style={{ fontSize: '10px' }}>TOTAL UPLOADS</span>
                  <span className="upload-stat-value">{recentUploads.length}</span>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
