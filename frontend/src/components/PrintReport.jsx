import React, { forwardRef } from 'react';

export const PrintReport = forwardRef(({ report, patient }, ref) => {
  if (!report) return null;

  return (
    <div ref={ref} className="print-report" style={{
      padding: '40px',
      backgroundColor: 'white',
      color: 'black',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '100%',
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        borderBottom: '2px solid #333',
        paddingBottom: '16px',
        marginBottom: '24px',
      }}>
        <h1 style={{ fontSize: '24px', margin: 0, color: '#000' }}>
          🧠 NeuroTwinAI-Lite
        </h1>
        <h2 style={{ fontSize: '18px', margin: '8px 0', color: '#333' }}>
          AI Volumetric Clinical Analysis
        </h2>
        <p style={{ fontSize: '12px', color: '#666', margin: '4px 0' }}>
          Date: {report.created_at ? new Date(report.created_at).toLocaleDateString() : new Date().toLocaleDateString()}
        </p>
        <p style={{ fontSize: '12px', color: '#666', margin: '4px 0' }}>
          Report ID: {report.id}
        </p>
        <p style={{ fontSize: '12px', color: '#666', margin: '4px 0' }}>
          Scan ID: {report.upload_id}
        </p>
      </div>

      {/* Patient Information */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', color: '#000', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
          PATIENT INFORMATION
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '8px 0' }}>
          <div><strong>PATIENT NAME</strong><br/>{report.patient_name || `${patient?.first_name || ''} ${patient?.last_name || ''}`}</div>
          <div><strong>PATIENT ID</strong><br/>{report.patient_id}</div>
          <div><strong>SCAN REFERENCE</strong><br/>{report.upload_id}</div>
          <div><strong>REPORT STATUS</strong><br/>
            <span style={{ color: report.tumor_detected ? '#c0392b' : '#27ae60' }}>
              {report.tumor_detected ? '☑ Urgent Action Required' : '☑ Normal'}
            </span>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', color: '#000', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
          AI SUMMARY
        </h3>
        <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.6' }}>
          {report.summary}
        </p>
      </div>

      {/* Findings */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', color: '#000', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
          FINDINGS
        </h3>
        <p style={{ fontSize: '14px', color: '#333', lineHeight: '1.6' }}>
          {report.findings || 'No findings recorded.'}
        </p>
      </div>

      {/* Pathology Analysis */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', color: '#000', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
          TUMOR PATHOLOGY ANALYSIS
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div><strong>PATHOLOGICAL ALERT</strong><br/>
            <span style={{ color: report.tumor_detected ? '#c0392b' : '#27ae60' }}>
              {report.tumor_detected ? 'LESION FOUND' : 'NO LESION'}
            </span>
          </div>
          <div><strong>NEOPLASTIC CORE</strong><br/>
            {report.tumor_detected ? 'Enhancing Mass' : 'Normal'}
          </div>
          <div><strong>VOLUME METRICS</strong><br/>{report.tumor_volume_cm3?.toFixed(2) || 0} cm³</div>
          <div><strong>MODEL CONFIDENCE</strong><br/>{report.confidence?.toFixed(1) || 0}%</div>
        </div>
      </div>

      {/* Segmentation */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', color: '#000', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
          TUMOR TISSUE SEGMENTATION
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <div style={{ textAlign: 'center' }}>
            <strong>Necrotic Core</strong><br/>
            <span style={{ fontSize: '20px', color: '#e74c3c' }}>
              {report.segmentation?.necrotic_percent || Math.round(((report.segmentation?.necrotic || 0) / ((report.segmentation?.necrotic || 1) + (report.segmentation?.edema || 0) + (report.segmentation?.enhancing || 0))) * 100)}%
            </span><br/>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {report.segmentation?.necrotic || 0} mm³
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <strong>Peritumoral Edema</strong><br/>
            <span style={{ fontSize: '20px', color: '#f39c12' }}>
              {report.segmentation?.edema_percent || Math.round(((report.segmentation?.edema || 0) / ((report.segmentation?.necrotic || 0) + (report.segmentation?.edema || 1) + (report.segmentation?.enhancing || 0))) * 100)}%
            </span><br/>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {report.segmentation?.edema || 0} mm³
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <strong>Enhancing Tumor</strong><br/>
            <span style={{ fontSize: '20px', color: '#2980b9' }}>
              {report.segmentation?.enhancing_percent || Math.round(((report.segmentation?.enhancing || 0) / ((report.segmentation?.necrotic || 0) + (report.segmentation?.edema || 0) + (report.segmentation?.enhancing || 1))) * 100)}%
            </span><br/>
            <span style={{ fontSize: '12px', color: '#666' }}>
              {report.segmentation?.enhancing || 0} mm³
            </span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <h3 style={{ fontSize: '16px', color: '#000', borderBottom: '1px solid #ddd', paddingBottom: '4px' }}>
          RECOMMENDATIONS
        </h3>
        <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#333', lineHeight: '1.6' }}>
          {report.recommendations?.split('\n').map((rec, i) => (
            <li key={i}>{rec}</li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '40px',
        paddingTop: '16px',
        borderTop: '1px solid #ddd',
        fontSize: '10px',
        color: '#999',
        textAlign: 'center',
      }}>
        <p>This report is AI-generated and should be reviewed by a qualified medical professional.</p>
        <p>Generated by NeuroTwinAI-Lite v2.0</p>
      </div>
    </div>
  );
});
