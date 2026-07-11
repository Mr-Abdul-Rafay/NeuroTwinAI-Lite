import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, Filter, Plus, Printer, Mail, Download, 
  Trash2, FileText, Brain, X, ChevronRight, AlertTriangle, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import GlassCard from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { reportsApi } from '../api/reports';
import { useRecentUploads } from '../hooks/useUpload';
import usePatientStore from '../store/patientStore';
import { useReportStore } from '../store/reportStore';
import { PrintReport } from '../components/PrintReport';
import { useReactToPrint } from 'react-to-print';



export default function ReportsPage() {
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [selectedUploadId, setSelectedUploadId] = useState('');

  const queryClient = useQueryClient();
  const { setReports } = useReportStore();
  const patients = usePatientStore((state) => state.patients);
  const printRef = useRef();

  // Print handler using react-to-print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    content: () => printRef.current,
    pageStyle: `
      @page {
        size: A4;
        margin: 20mm;
      }
      @media print {
        body {
          background: white !important;
        }
        .print-report {
          display: block !important;
          visibility: visible !important;
        }
      }
    `,
    onBeforePrint: () => {
      console.log('🖨️ Preparing to print...');
      return Promise.resolve();
    },
    onAfterPrint: () => {
      console.log('✅ Print complete');
      return Promise.resolve();
    },

  });


  // Fetch reports from backend
  const { data: resReports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: reportsApi.getAll,
  });

  const reportsList = resReports?.reports || [];

  // Update reportStore whenever list updates
  useEffect(() => {
    if (resReports?.reports) {
      setReports(resReports.reports);
      if (resReports.reports.length > 0 && !selectedReport) {
        setSelectedReport(resReports.reports[0]);
      }
    }
  }, [resReports, setReports]);

  // Fetch uploads to list in the Report Generation Modal
  const { data: recentUploads = [] } = useRecentUploads(100);
  const completedUploads = recentUploads.filter(u => u.status?.toLowerCase() === 'completed');

  // Generate Report Mutation
  const generateMutation = useMutation({
    mutationFn: (uploadId) => reportsApi.generate(uploadId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('AI Report generated successfully!');
      if (res?.report) {
        setSelectedReport(res.report);
      }
      setIsGenModalOpen(false);
      setSelectedUploadId('');
    },
    onError: (err) => {
      toast.error(err.displayMessage || err.message || 'Report generation failed');
    }
  });

  // Delete Report Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => reportsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report deleted successfully');
      setSelectedReport(null);
    },
    onError: (err) => {
      toast.error(err.displayMessage || err.message || 'Failed to delete report');
    }
  });

  const handleGenerate = () => {
    if (!selectedUploadId) {
      toast.error('Please select an MRI scan upload reference.');
      return;
    }
    toast.loading('Synthesizing AI Clinical Report...', { id: 'report-gen' });
    generateMutation.mutate(selectedUploadId, {
      onSettled: () => toast.dismiss('report-gen')
    });
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to permanently delete this report?')) {
      deleteMutation.mutate(id);
    }
  };

  const getPatientName = (patientId) => {
    const p = patients.find(p => p.id === patientId);
    return p ? `${p.first_name} ${p.last_name}` : patientId;
  };

  const filtered = reportsList.filter(r =>
    (r.patient_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.patient_id || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.id || '').toLowerCase().includes(search.toLowerCase())
  );

  const selected = selectedReport;

  // Compute stats for preview report
  const confidence = selected?.confidence ?? 0;
  const tumorDetected = selected?.tumor_detected ?? false;
  
  const necrotic = selected?.segmentation?.necrotic ?? 0;
  const edema = selected?.segmentation?.edema ?? 0;
  const enhancing = selected?.segmentation?.enhancing ?? 0;
  const totalSeg = necrotic + edema + enhancing;
  
  const necroticPct = totalSeg > 0 ? Math.round((necrotic / totalSeg) * 100) : 0;
  const edemaPct = totalSeg > 0 ? Math.round((edema / totalSeg) * 100) : 0;
  const enhancingPct = totalSeg > 0 ? Math.round((enhancing / totalSeg) * 100) : 0;

  return (
    <div className="page-content fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title gradient-text">Reports</h1>
          <p className="page-subtitle">Generate and manage AI clinical analysis reports</p>
        </div>
        <button className="btn-primary" onClick={() => setIsGenModalOpen(true)}>
          <Plus size={14} /> New Report
        </button>
      </div>

      <div className="reports-layout">
        {/* ── Report List ── */}
        <GlassCard className="report-list-card">
          <div className="report-search-row">
            <div className="search-wrap" style={{ flex: 1 }}>
              <Search size={14} className="search-icon" />
              <input
                type="text"
                className="input-field search-input"
                placeholder="Search by patient name, ID, or report ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="report-items">
            {isLoading ? (
              <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'center' }}>
                <div className="spinner" />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 10px', color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>
                <FileText size={28} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p>No reports found.<br />Generate a report from a completed scan.</p>
              </div>
            ) : (
              filtered.map(r => (
                <div
                  key={r.id}
                  className={`report-item ${selected?.id === r.id ? 'report-item-active' : ''}`}
                  onClick={() => setSelectedReport(r)}
                >
                  <div className="report-item-icon">
                    <FileText size={16} style={{ color: '#46f1c5' }} />
                  </div>
                  <div className="report-item-info">
                    <div className="report-item-top">
                      <span className="report-patient-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
                        {r.patient_name || getPatientName(r.patient_id)}
                      </span>
                      <StatusBadge status={r.tumor_detected ? 'Urgent' : 'Completed'} />
                    </div>
                    <p className="report-item-meta">{r.id} · {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent'}</p>
                    <p className="report-item-type" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* ── Report Preview ── */}
        {selected ? (
          <GlassCard className="report-preview-card">
            {/* Report Actions */}
            <div className="report-preview-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px' }}>
              <button className="ctrl-btn" onClick={handlePrint}><Printer size={14} /> Print</button>

              <button 
                className="ctrl-btn" 
                onClick={() => handleDelete(selected.id)}
                style={{ color: '#FF6B6B', borderColor: 'rgba(255,107,107,0.1)' }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>

            {/* Report Document */}
            <div className="report-document" style={{ color: '#fff' }}>
              <div className="report-doc-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h2 className="report-doc-title gradient-text" style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>NeuroTwinAI-Lite</h2>
                  <p className="report-doc-subtitle" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>AI Volumetric Clinical Analysis</p>
                </div>
                <div className="report-doc-meta" style={{ textAlign: 'right', fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'Roboto Mono' }}>
                  <p style={{ margin: '2px 0' }}>Date: {selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—'}</p>
                  <p style={{ margin: '2px 0' }}>Report ID: {selected.id}</p>
                  <p style={{ margin: '2px 0' }}>Scan ID: {selected.upload_id}</p>
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />

              {/* Patient info */}
              <div className="report-section" style={{ marginBottom: '20px' }}>
                <h3 className="report-section-label" style={{ fontSize: '11px', color: '#46f1c5', fontFamily: 'Roboto Mono', letterSpacing: '0.08em', margin: '0 0 12px 0' }}>PATIENT INFORMATION</h3>
                <div className="report-info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {[
                    ['Patient Name', selected.patient_name || getPatientName(selected.patient_id)],
                    ['Patient ID',   selected.patient_id],
                    ['Scan Reference', selected.upload_id],
                    ['Report Status',  tumorDetected ? '🔴 Urgent Action Required' : '🟢 Completed / Clear Scan'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', padding: '8px 12px' }}>
                      <span className="data-label" style={{ fontSize: '9px', display: 'block', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>{k}</span>
                      <span className="report-info-value" style={{ fontSize: '13px', fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />

              {/* AI Summary */}
              <div className="report-section" style={{ marginBottom: '20px' }}>
                <h3 className="report-section-label" style={{ fontSize: '11px', color: '#46f1c5', fontFamily: 'Roboto Mono', letterSpacing: '0.08em', margin: '0 0 8px 0' }}>AI SUMMARY</h3>
                <p className="report-summary-text" style={{ fontSize: '13px', lineHeight: '1.6', color: 'rgba(255,255,255,0.85)', margin: 0 }}>{selected.summary}</p>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />

              {/* Findings */}
              <div className="report-section" style={{ marginBottom: '20px' }}>
                <h3 className="report-section-label" style={{ fontSize: '11px', color: '#46f1c5', fontFamily: 'Roboto Mono', letterSpacing: '0.08em', margin: '0 0 8px 0' }}>FINDINGS</h3>
                <p className="report-summary-text" style={{ fontSize: '13px', lineHeight: '1.6', color: 'rgba(255,255,255,0.85)', margin: 0 }}>{selected.findings || 'No specific findings recorded.'}</p>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />

              {/* Tumor Analysis */}
              <div className="report-section" style={{ marginBottom: '20px' }}>
                <h3 className="report-section-label" style={{ fontSize: '11px', color: '#46f1c5', fontFamily: 'Roboto Mono', letterSpacing: '0.08em', margin: '0 0 12px 0' }}>TUMOR PATHOLOGY ANALYSIS</h3>
                <div className="tumor-analysis-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {[
                    ['Pathological Alert', tumorDetected ? 'LESION FOUND' : 'CLEAR SCAN'],
                    ['Neoplastic Core',    tumorDetected ? 'Enhancing Mass' : 'N/A'],
                    ['Volume Metrics',     `${(selected.tumor_volume_cm3 ?? 0).toFixed(2)} cm³`],
                    ['Model Confidence',   `${confidence.toFixed(1)}%`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', padding: '10px' }}>
                      <span className="data-label" style={{ fontSize: '9px', display: 'block', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>{k}</span>
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: 700, 
                        fontFamily: 'Roboto Mono',
                        color: k === 'Pathological Alert' ? (tumorDetected ? '#FF6B6B' : '#2ECC71') : '#fff'
                      }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Segmentation details */}
              {tumorDetected && (
                <>
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />
                  <div className="report-section" style={{ marginBottom: '20px' }}>
                    <h3 className="report-section-label" style={{ fontSize: '11px', color: '#46f1c5', fontFamily: 'Roboto Mono', letterSpacing: '0.08em', margin: '0 0 12px 0' }}>TUMOR TISSUE SEGMENTATION</h3>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      {[
                        ['Necrotic Core',   necroticPct,  '#FF6B6B', `${(necrotic).toFixed(0)} mm³`],
                        ['Peritumoral Edema', edemaPct,     '#4A90D9', `${(edema).toFixed(0)} mm³`],
                        ['Enhancing Tumour', enhancingPct, '#6C5CE7', `${(enhancing).toFixed(0)} mm³`],
                      ].map(([label, val, color, size]) => (
                        <div key={label} style={{ flex: 1, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color }} />
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                          </div>
                          <span style={{ fontSize: '20px', fontWeight: 800, color, fontFamily: 'Roboto Mono' }}>{val}%</span>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'Roboto Mono' }}>{size}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '16px 0' }} />

              {/* Recommendations */}
              <div className="report-section" style={{ marginBottom: '20px' }}>
                <h3 className="report-section-label" style={{ fontSize: '11px', color: '#46f1c5', fontFamily: 'Roboto Mono', letterSpacing: '0.08em', margin: '0 0 12px 0' }}>RECOMMENDATIONS</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selected.recommendations ? selected.recommendations.split('\n').map((rec, i) => (
                    <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                      {tumorDetected ? <AlertTriangle size={14} style={{ color: '#FF6B6B', flexShrink: 0, marginTop: 2 }} /> : <CheckCircle size={14} style={{ color: '#2ECC71', flexShrink: 0, marginTop: 2 }} />}
                      <span>{rec}</span>
                    </li>
                  )) : (
                    <li style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>No recommendations formulated.</li>
                  )}
                </ul>
              </div>

              <div className="report-doc-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', marginTop: '24px', textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'Roboto Mono' }}>
                <p>Generated by NeuroTwinAI-Lite Clinical Engine · HIPAA Compliant · For professional use only</p>
              </div>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="report-preview-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
              <FileText size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p>Select a clinical analysis report from the directory list to preview.</p>
            </div>
          </GlassCard>
        )}
      </div>

      {/* ── Generate Report Dialog Modal ── */}
      {isGenModalOpen && (
        <div className="modal-overlay" onClick={() => setIsGenModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Brain size={20} style={{ color: '#46f1c5' }} /> Generate AI Report
              </h2>
              <button className="modal-close" onClick={() => setIsGenModalOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>
                Select a completed MRI scan upload reference below. The AI Clinical Engine will analyze the segmentation volumes and compile a clinical record automatically.
              </p>

              <div className="form-group">
                <label className="data-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>COMPLETED MRI SCANS</label>
                <select
                  value={selectedUploadId}
                  onChange={(e) => setSelectedUploadId(e.target.value)}
                  className="input-field"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', cursor: 'pointer', width: '100%' }}
                >
                  <option value="" disabled style={{ background: '#131318' }}>Select Reference Scan...</option>
                  {completedUploads.map((upload) => {
                    const patientName = getPatientName(upload.patient_id);
                    const scanDate = upload.created_at ? new Date(upload.created_at).toLocaleDateString() : 'Recent';
                    return (
                      <option key={upload.upload_id || upload.id} value={upload.upload_id || upload.id} style={{ background: '#131318' }}>
                        {patientName} ({upload.patient_id}) - {scanDate}
                      </option>
                    );
                  })}
                  {completedUploads.length === 0 && (
                    <option value="" disabled style={{ background: '#131318' }}>No completed scans available</option>
                  )}
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setIsGenModalOpen(false); setSelectedUploadId(''); }}
                disabled={generateMutation.isPending}
                style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !selectedUploadId}
                style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {generateMutation.isPending ? (
                  <><div className="mini-spinner" /> Compiling…</>
                ) : (
                  <><Plus size={14} /> Generate Report</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Hidden print content */}
      {selected && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <PrintReport
            ref={printRef}
            report={selected}
            patient={patients.find(p => p.id === selected.patient_id)}
          />
        </div>
      )}
    </div>
  );
}


