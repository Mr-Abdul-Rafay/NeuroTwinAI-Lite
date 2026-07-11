import React from 'react';

export default function ActivityRow({ upload, isSelected, onClick }) {
  const renderStatusBadge = (status) => {
    const normalized = status?.toLowerCase() || '';
    if (normalized === 'completed') {
      return (
        <span className="badge-completed" style={{ color: '#2ECC71', borderColor: 'rgba(46, 204, 113, 0.25)', background: 'rgba(46, 204, 113, 0.1)' }}>
          🟢 Completed
        </span>
      );
    }
    if (normalized === 'processing') {
      return (
        <span className="badge-processing" style={{ color: '#F1C40F', borderColor: 'rgba(241, 196, 15, 0.25)', background: 'rgba(241, 196, 15, 0.1)' }}>
          🟡 Processing
        </span>
      );
    }
    if (normalized === 'pending') {
      return (
        <span className="badge-queued">
          ⏳ Queued
        </span>
      );
    }
    if (normalized === 'failed') {
      return (
        <span className="badge-warning" style={{ color: '#E74C3C', borderColor: 'rgba(231, 76, 60, 0.25)', background: 'rgba(231, 76, 60, 0.1)' }}>
          🔴 Failed
        </span>
      );
    }
    return (
      <span className="badge-processing">
        ● {status || 'UNKNOWN'}
      </span>
    );
  };

  return (
    <tr
      onClick={onClick}
      className={`activity-row ${isSelected ? 'activity-row-selected' : ''}`}
      style={{ cursor: 'pointer' }}
    >
      <td className="at-cell at-id" style={{ color: isSelected ? '#46f1c5' : undefined }}>
        {upload.patient_id}
      </td>
      <td className="at-cell">
        {upload.scan_type || upload.filename || 'MRI Brain Scan'}
      </td>
      <td className="at-cell">
        {renderStatusBadge(upload.status)}
      </td>
      <td className="at-cell at-progress">
        <span className="at-pct">{upload.progress ?? 100}%</span>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${upload.progress ?? 100}%`,
              background: upload.status?.toLowerCase() === 'failed' ? 'var(--warning-gradient)' : 'var(--primary-gradient)',
            }}
          />
        </div>
      </td>
    </tr>
  );
}
