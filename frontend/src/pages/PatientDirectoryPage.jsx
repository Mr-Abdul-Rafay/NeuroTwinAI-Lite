import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import { patientsData } from '../lib/mockData';
import { StatusBadge, RiskBadge } from '../components/ui/StatusBadge';
import { usePatient, mapDirectoryIdToContextId } from '../context/PatientContext';

const FILTERS = ['All', 'Active', 'Urgent', 'Completed', 'Archived'];
const PAGE_SIZE = 6;

export default function PatientDirectoryPage({ onNavigate }) {
  const { setSelectedPatientId } = usePatient();
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('All');
  const [page, setPage]         = useState(1);

  const filtered = patientsData.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.condition.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'All' ||
      (filter === 'Active'    && p.status === 'Processing') ||
      (filter === 'Urgent'    && p.status === 'Urgent') ||
      (filter === 'Completed' && p.status === 'Completed') ||
      (filter === 'Archived'  && p.status === 'Archived');
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = {
    All:       patientsData.length,
    Active:    patientsData.filter(p => p.status === 'Processing').length,
    Urgent:    patientsData.filter(p => p.status === 'Urgent').length,
    Completed: patientsData.filter(p => p.status === 'Completed').length,
    Archived:  patientsData.filter(p => p.status === 'Archived').length,
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title gradient-text">Patient Directory</h1>
          <p className="page-subtitle">
            {patientsData.length} registered patients · {counts.Urgent} urgent cases
          </p>
        </div>
      </div>

      <GlassCard>
        {/* Search & Filters */}
        <div className="patient-controls">
          <div className="search-wrap" style={{ flex: 1, maxWidth: '360px' }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="input-field search-input"
              placeholder="Search by name, ID, or condition..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div className="filter-pills">
            {FILTERS.map(f => (
              <button
                key={f}
                className={`filter-pill ${filter === f ? 'filter-pill-active' : ''}`}
                onClick={() => { setFilter(f); setPage(1); }}
              >
                {f}
                <span className="filter-count">{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="patient-table-wrap">
          <table className="patient-table">
            <thead>
              <tr>
                {['#', 'Patient Name', 'ID', 'Age', 'Last Scan', 'Status', 'Risk', 'Condition', 'Actions'].map(h => (
                  <th key={h} className="data-label pt-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => (
                <tr key={p.id} className="patient-row">
                  <td className="pt-cell pt-num">{p.num}</td>
                  <td className="pt-cell">
                    <div className="patient-name-cell">
                      <div className="patient-avatar">
                        {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="patient-name">{p.name}</span>
                    </div>
                  </td>
                  <td className="pt-cell pt-mono">{p.id}</td>
                  <td className="pt-cell pt-mono">{p.age}</td>
                  <td className="pt-cell pt-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{p.lastScan}</td>
                  <td className="pt-cell">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="pt-cell">
                    <RiskBadge risk={p.risk} />
                  </td>
                  <td className="pt-cell" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                    {p.condition}
                  </td>
                  <td className="pt-cell">
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => {
                        const contextId = mapDirectoryIdToContextId(p.id);
                        setSelectedPatientId(contextId);
                        if (onNavigate) onNavigate('dashboard');
                      }}
                    >
                      <Eye size={12} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <span className="pagination-info">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="pagination-controls">
            <button
              className="ctrl-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                className={`page-btn ${page === n ? 'page-btn-active' : ''}`}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              className="ctrl-btn"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
