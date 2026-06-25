import React, { useState } from 'react';
import {
  Search, Filter, Plus, Printer, Mail, Download,
  Edit, Share2, CheckCircle, FileText
} from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import { reportsData } from '../lib/mockData';
import { StatusBadge } from '../components/ui/StatusBadge';

export default function ReportsPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(reportsData[0]);

  const filtered = reportsData.filter(r =>
    r.patient.toLowerCase().includes(search.toLowerCase()) ||
    r.patientId.toLowerCase().includes(search.toLowerCase()) ||
    r.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title gradient-text">Reports</h1>
          <p className="page-subtitle">Generate and manage AI clinical analysis reports</p>
        </div>
        <button className="btn-primary">
          <Plus size={14} /> New Report
        </button>
      </div>

      <div className="reports-layout">
        {/* ── Report List ── */}
        <GlassCard className="report-list-card">
          {/* Search */}
          <div className="report-search-row">
            <div className="search-wrap" style={{ flex: 1 }}>
              <Search size={14} className="search-icon" />
              <input
                type="text"
                className="input-field search-input"
                placeholder="Search by patient or type..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className="ctrl-btn">
              <Filter size={14} />
            </button>
          </div>

          {/* List */}
          <div className="report-items">
            {filtered.map(r => (
              <div
                key={r.id}
                className={`report-item ${selected?.id === r.id ? 'report-item-active' : ''}`}
                onClick={() => setSelected(r)}
              >
                <div className="report-item-icon">
                  <FileText size={16} style={{ color: '#46f1c5' }} />
                </div>
                <div className="report-item-info">
                  <div className="report-item-top">
                    <span className="report-patient-name">{r.patient}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="report-item-meta">{r.patientId} · {r.date}</p>
                  <p className="report-item-type">{r.type}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* ── Report Preview ── */}
        {selected ? (
          <GlassCard className="report-preview-card">
            {/* Report Actions */}
            <div className="report-preview-actions">
              <button className="ctrl-btn"><Edit size={14} /> Edit</button>
              <button className="ctrl-btn"><Share2 size={14} /> Share</button>
              <button className="ctrl-btn"><Printer size={14} /> Print</button>
              <button className="ctrl-btn"><Download size={14} /> Save</button>
              <button className="btn-primary btn-sm"><Mail size={14} /> Email to Patient</button>
            </div>

            {/* Report Document */}
            <div className="report-document">
              {/* Header */}
              <div className="report-doc-header">
                <div>
                  <h2 className="report-doc-title gradient-text">NeuroTwinAI-Lite</h2>
                  <p className="report-doc-subtitle">AI Clinical Analysis Report</p>
                </div>
                <div className="report-doc-meta">
                  <p>Date: {selected.date}</p>
                  <p>Report ID: {selected.id}</p>
                  <p>Patient: {selected.patientId}</p>
                </div>
              </div>

              <div className="report-doc-divider" />

              {/* Patient info */}
              <div className="report-section">
                <h3 className="report-section-label">PATIENT INFORMATION</h3>
                <div className="report-info-grid">
                  {[
                    ['Patient Name', selected.patient],
                    ['Patient ID',   selected.patientId],
                    ['Scan Type',    selected.type],
                    ['Report Date',  selected.date],
                  ].map(([k, v]) => (
                    <div key={k} className="report-info-item">
                      <span className="data-label" style={{ fontSize: '10px' }}>{k}</span>
                      <span className="report-info-value">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="report-doc-divider" />

              {/* AI Summary */}
              <div className="report-section">
                <h3 className="report-section-label">AI SUMMARY</h3>
                <p className="report-summary-text">{selected.summary}</p>
              </div>

              <div className="report-doc-divider" />

              {/* Tumor Analysis */}
              <div className="report-section">
                <h3 className="report-section-label">TUMOR ANALYSIS</h3>
                <div className="tumor-analysis-grid">
                  {[
                    ['Tumor Type',  selected.tumorType],
                    ['Location',    selected.location],
                    ['Volume',      selected.volume],
                    ['Confidence',  selected.confidence],
                  ].map(([k, v]) => (
                    <div key={k} className="tumor-analysis-item">
                      <span className="data-label" style={{ fontSize: '10px' }}>{k}</span>
                      <span className={`tumor-analysis-value ${k === 'Confidence' ? 'teal-text' : ''}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="report-doc-divider" />

              {/* Segmentation */}
              <div className="report-section">
                <h3 className="report-section-label">TUMOR SEGMENTATION</h3>
                <div className="seg-analysis-row">
                  {[
                    ['Necrotic Core',   selected.segments.necrotic,  '#FF6B6B'],
                    ['Edema',          selected.segments.edema,     '#4A90D9'],
                    ['Enhancing Tumor',selected.segments.enhancing, '#6C5CE7'],
                  ].map(([label, val, color]) => (
                    <div key={label} className="seg-analysis-item" style={{ borderColor: `${color}33` }}>
                      <span className="seg-dot" style={{ background: color }} />
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>{label}</span>
                      <span style={{ fontSize: '18px', fontWeight: '700', color, fontFamily: 'Roboto Mono' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="report-doc-divider" />

              {/* Recommendations */}
              <div className="report-section">
                <h3 className="report-section-label">RECOMMENDATIONS</h3>
                <ul className="recommendations-list">
                  {selected.recommendations.map((rec, i) => (
                    <li key={i} className="recommendation-item">
                      <CheckCircle size={14} style={{ color: '#46f1c5', flexShrink: 0, marginTop: 2 }} />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="report-doc-footer">
                <p>Generated by NeuroTwinAI-Lite Clinical Engine · HIPAA Compliant · For professional use only</p>
              </div>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="report-preview-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.3)' }}>Select a report to preview</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
