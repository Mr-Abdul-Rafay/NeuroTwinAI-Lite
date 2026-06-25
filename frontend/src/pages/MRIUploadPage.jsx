import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import { uploadsData } from '../lib/mockData';
import { usePatient } from '../context/PatientContext';



function UploadStatusIcon({ status }) {
  if (status === 'Completed') return <CheckCircle size={14} style={{ color: '#2ECC71' }} />;
  if (status === 'Processing') return <div className="mini-spinner" />;
  if (status === 'Queued')    return <Clock size={14} style={{ color: '#4A90D9' }} />;
  return <AlertCircle size={14} style={{ color: '#FF6B6B' }} />;
}

export default function MRIUploadPage({ apiBase }) {
  const { selectedPatientId, setSelectedPatientId, patientProfiles, selectedPatient } = usePatient();
  const [dragOver, setDragOver]   = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploads, setUploads]     = useState(uploadsData);
  const [error, setError]         = useState('');
  const fileInputRef = useRef();

  const ALLOWED_TYPES = ['.dcm', '.nii', '.nii.gz', '.zip'];
  const MAX_SIZE_MB = 500;

  const handleFile = (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    const valid = ALLOWED_TYPES.some(t => name.endsWith(t));
    if (!valid) {
      setError(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size: ${MAX_SIZE_MB}MB`);
      return;
    }
    setError('');
    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const token = localStorage.getItem('neuro_token');
      const res = await fetch(`${apiBase}/api/scans/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Upload rejected by server');
      setSelectedFile(null);
      setUploads(prev => [
        { patient: selectedPatientId, date: 'Just now', progress: 0, status: 'Processing' },
        ...prev,
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title gradient-text">MRI Upload</h1>
          <p className="page-subtitle">Upload and process new MRI scans through the AI pipeline</p>
        </div>
      </div>

      <div className="upload-layout">
        {/* ── Upload Zone ── */}
        <GlassCard className="upload-card">
          <h2 className="section-heading">Upload New Scan</h2>

          {/* Drag & Drop Zone */}
          <div
            className={`drop-zone ${dragOver ? 'drop-zone-active' : ''} ${selectedFile ? 'drop-zone-selected' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".dcm,.nii,.gz,.zip"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {selectedFile ? (
              <div className="file-selected">
                <FileText size={32} style={{ color: '#46f1c5' }} />
                <p className="file-name">{selectedFile.name}</p>
                <p className="file-size">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                <button
                  className="remove-file-btn"
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                >
                  <X size={12} /> Remove
                </button>
              </div>
            ) : (
              <div className="drop-zone-content">
                <div className="drop-icon-wrap">
                  <Upload size={28} style={{ color: '#46f1c5' }} />
                </div>
                <p className="drop-title">Drag & drop MRI file here</p>
                <p className="drop-subtitle">or <span className="drop-link">click to browse</span></p>
                <div className="drop-formats">
                  {ALLOWED_TYPES.map(t => (
                    <span key={t} className="format-chip">{t}</span>
                  ))}
                </div>
                <p className="drop-limit">Maximum file size: {MAX_SIZE_MB}MB</p>
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
                  onChange={e => setSelectedPatientId(e.target.value)}
                  className="input-field"
                >
                  {Object.keys(patientProfiles).map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="data-label">PATIENT NAME</label>
                <div className="input-field" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#46f1c5',
                  fontWeight: 600,
                  cursor: 'default',
                  userSelect: 'none',
                }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#46f1c5',
                    boxShadow: '0 0 6px #46f1c5',
                    flexShrink: 0,
                  }} />
                  {selectedPatient?.name || '—'}
                </div>
              </div>
            </div>

            <div className="upload-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setSelectedFile(null); setError(''); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <div className="mini-spinner" />
                    Processing...
                  </>
                ) : (
                  <><Upload size={14} /> Submit for Analysis</>
                )}
              </button>
            </div>
          </form>
        </GlassCard>

        {/* ── Recent Uploads ── */}
        <GlassCard className="recent-uploads-card">
          <h2 className="section-heading">Recent Uploads</h2>
          <div className="uploads-list">
            {uploads.map((u, i) => (
              <div key={i} className="upload-item">
                <div className="upload-item-left">
                  <UploadStatusIcon status={u.status} />
                  <div>
                    <p className="upload-patient">Patient {u.patient}</p>
                    <p className="upload-date">{u.date}</p>
                  </div>
                </div>
                <div className="upload-item-right">
                  {u.status === 'Processing' ? (
                    <div className="upload-progress-wrap">
                      <div className="upload-progress-bar">
                        <div className="upload-progress-fill" style={{ width: `${u.progress}%` }} />
                      </div>
                      <span className="upload-pct">{u.progress}%</span>
                    </div>
                  ) : u.status === 'Queued' ? (
                    <button className="btn-secondary btn-sm" style={{ color: '#FF6B6B', borderColor: 'rgba(255,107,107,0.3)' }}>
                      Cancel
                    </button>
                  ) : (
                    <button className="btn-secondary btn-sm">View</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Upload stats */}
          <div className="upload-stats">
            <div className="upload-stat">
              <span className="data-label" style={{ fontSize: '10px' }}>TOTAL UPLOADS</span>
              <span className="upload-stat-value">127</span>
            </div>
            <div className="upload-stat">
              <span className="data-label" style={{ fontSize: '10px' }}>THIS WEEK</span>
              <span className="upload-stat-value">14</span>
            </div>
            <div className="upload-stat">
              <span className="data-label" style={{ fontSize: '10px' }}>SUCCESS RATE</span>
              <span className="upload-stat-value" style={{ color: '#2ECC71' }}>98.4%</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
