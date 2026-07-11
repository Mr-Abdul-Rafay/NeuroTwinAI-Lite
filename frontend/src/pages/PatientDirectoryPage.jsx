import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Eye, Edit2, Trash2, UserPlus, FileText } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import { StatusBadge, RiskBadge } from '../components/ui/StatusBadge';
import { usePatient } from '../context/PatientContext';
import usePatientStore from '../store/patientStore';
import { useRecentUploads } from '../hooks/useUpload';
import AddPatientModal from '../components/AddPatientModal';
import DeletePatientDialog from '../components/DeletePatientDialog';

const FILTERS = ['All', 'Active', 'Urgent', 'Completed'];
const PAGE_SIZE = 6;

export default function PatientDirectoryPage({ onNavigate }) {
  const { setSelectedPatientId } = usePatient();
  const { patients, fetchPatients, isLoading } = usePatientStore();
  const { data: recentUploads = [] } = useRecentUploads(50); // Fetch recent uploads to match latest scan info

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [activePatient, setActivePatient] = useState(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  const calculateAge = (dobString) => {
    if (!dobString) return '—';
    try {
      const dob = new Date(dobString);
      const diffMs = Date.now() - dob.getTime();
      const ageDate = new Date(diffMs);
      return Math.abs(ageDate.getUTCFullYear() - 1970);
    } catch {
      return '—';
    }
  };

  // Helper to resolve latest scan details for a patient
  const getPatientScanInfo = (patientId) => {
    const uploads = recentUploads
      .filter((u) => u.patient_id === patientId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (uploads.length === 0) {
      return {
        lastScan: '—',
        status: 'New',
        risk: 'Low',
        condition: '—',
      };
    }

    const latest = uploads[0];
    const createdDate = latest.created_at
      ? new Date(latest.created_at).toLocaleDateString()
      : 'Recent';

    const seg = latest.segmentation || latest.results || {};
    const hasTumor = seg.tumor_detected ?? false;
    const vol = seg.tumor_volume_cm3 ?? 0;
    
    let risk = 'Low';
    let condition = 'Clear Scan';
    if (hasTumor) {
      condition = 'Brain Tumor';
      risk = vol > 3.5 ? 'High' : 'Medium';
    }

    return {
      lastScan: createdDate,
      status: latest.status || 'Completed',
      risk,
      condition,
    };
  };

  // Map directory filters
  const getFilteredPatients = () => {
    return patients.filter((p) => {
      const scanInfo = getPatientScanInfo(p.id);
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
      const matchesSearch =
        fullName.includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        scanInfo.condition.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === 'All' ||
        (filter === 'Active' && scanInfo.status?.toLowerCase() === 'processing') ||
        (filter === 'Urgent' && scanInfo.risk === 'High') ||
        (filter === 'Completed' && scanInfo.status?.toLowerCase() === 'completed');

      return matchesSearch && matchesFilter;
    });
  };

  const filtered = getFilteredPatients();
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Compute counts for filter pills
  const counts = {
    All: patients.length,
    Active: patients.filter((p) => getPatientScanInfo(p.id).status?.toLowerCase() === 'processing').length,
    Urgent: patients.filter((p) => getPatientScanInfo(p.id).risk === 'High').length,
    Completed: patients.filter((p) => getPatientScanInfo(p.id).status?.toLowerCase() === 'completed').length,
  };

  const handleEdit = (p) => {
    setActivePatient(p);
    setIsAddOpen(true);
  };

  const handleDelete = (p) => {
    setActivePatient(p);
    setIsDeleteOpen(true);
  };

  const handleRegisterNew = () => {
    setActivePatient(null);
    setIsAddOpen(true);
  };

  const handleViewPatient = (p) => {
    setSelectedPatientId(p.id);
    if (onNavigate) onNavigate('dashboard');
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title gradient-text">Patient Directory</h1>
          <p className="page-subtitle">
            {patients.length} registered patients · {counts.Urgent} urgent cases under critical review
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={handleRegisterNew}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px' }}
        >
          <UserPlus size={16} /> Register Patient
        </button>
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
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div className="filter-pills">
            {FILTERS.map((f) => (
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

        {/* Table & Loaders */}
        {isLoading ? (
          <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <style>{`
              @keyframes row-pulse {
                0% { opacity: 0.3; }
                50% { opacity: 0.7; }
                100% { opacity: 0.3; }
              }
              .skeleton-row-item {
                animation: row-pulse 1.5s infinite ease-in-out;
                background: rgba(255, 255, 255, 0.03);
                height: 52px;
                border-radius: 8px;
                width: 100%;
              }
            `}</style>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-row-item" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255, 255, 255, 0.25)', marginBottom: '16px' }}>
              <FileText size={24} />
            </div>
            <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: '600', margin: '0 0 6px 0' }}>No patients found</h4>
            <p style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '13px', margin: '0 0 16px 0', maxWidth: '300px' }}>
              Try adjusting your search criteria or register a new patient to populate the database directory.
            </p>
          </div>
        ) : (
          <div className="patient-table-wrap">
            <table className="patient-table">
              <thead>
                <tr>
                  {['Patient Name', 'ID', 'Age', 'Last Scan', 'Status', 'Risk', 'Condition', 'Actions'].map((h) => (
                    <th key={h} className="data-label pt-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((p) => {
                  const info = getPatientScanInfo(p.id);
                  const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown';
                  const initials = `${p.first_name?.[0] || ''}${p.last_name?.[0] || ''}`.toUpperCase().slice(0, 2);

                  return (
                    <tr key={p.id} className="patient-row">
                      <td className="pt-cell">
                        <div className="patient-name-cell">
                          <div className="patient-avatar">
                            {initials || '?'}
                          </div>
                          <span className="patient-name">{fullName}</span>
                        </div>
                      </td>
                      <td className="pt-cell pt-mono">{p.id}</td>
                      <td className="pt-cell pt-mono">{calculateAge(p.dob)}</td>
                      <td className="pt-cell pt-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{info.lastScan}</td>
                      <td className="pt-cell">
                        <StatusBadge status={info.status} />
                      </td>
                      <td className="pt-cell">
                        <RiskBadge risk={info.risk} />
                      </td>
                      <td className="pt-cell" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                        {info.condition}
                      </td>
                      <td className="pt-cell">
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => handleViewPatient(p)}
                            title="Open Patient Profile"
                          >
                            <Eye size={12} /> View
                          </button>
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => handleEdit(p)}
                            title="Edit Patient Details"
                            style={{ padding: '6px 8px' }}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => handleDelete(p)}
                            title="Delete Patient Record"
                            style={{ padding: '6px 8px', color: '#FF6B6B', borderColor: 'rgba(255,107,107,0.15)' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,107,107,0.3)'; e.currentTarget.style.background = 'rgba(255,107,107,0.05)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,107,107,0.15)'; e.currentTarget.style.background = 'transparent'; }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="pagination">
            <span className="pagination-info">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="pagination-controls">
              <button
                className="ctrl-btn"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
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
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Add / Edit Patient Modal */}
      <AddPatientModal
        isOpen={isAddOpen}
        onClose={() => { setIsAddOpen(false); setActivePatient(null); }}
        patient={activePatient}
      />

      {/* Delete Patient Dialog */}
      <DeletePatientDialog
        isOpen={isDeleteOpen}
        onClose={() => { setIsDeleteOpen(false); setActivePatient(null); }}
        patient={activePatient}
      />
    </div>
  );
}
