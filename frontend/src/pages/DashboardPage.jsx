import React, { useState, useEffect } from 'react';
import { 
  Bell, CheckCircle, Activity, AlertTriangle,
  Cpu, Upload, Shield, Server, FileText, X, Users, Brain,
  Heart, Waves, Thermometer, Calendar, ChevronDown, Edit3,
  FolderUp, Radio, UserPlus
} from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import { usePatient } from '../context/PatientContext';
import { useRecentUploads } from '../hooks/useUpload';
import useUploadStore from '../store/uploadStore';
import usePatientStore from '../store/patientStore';
import ActivityRow from '../components/ActivityRow';

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px 0' }}>
      <style>{`
        @keyframes skeleton-pulse {
          0% { opacity: 0.3; }
          50% { opacity: 0.8; }
          100% { opacity: 0.3; }
        }
        .skeleton-row {
          animation: skeleton-pulse 1.5s infinite ease-in-out;
        }
      `}</style>
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-row" style={{ height: '48px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', width: '100%' }} />
      ))}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
      <style>{`
        .empty-icon {
          animation: float-slow 3s infinite ease-in-out;
        }
        @keyframes float-slow {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
      <div className="empty-icon" style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255, 255, 255, 0.25)', marginBottom: '16px' }}>
        <FolderUp size={20} />
      </div>
      <p style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '13px', margin: '0 0 16px 0', fontFamily: 'Inter, sans-serif' }}>{message}</p>
    </div>
  );
}

export default function DashboardPage({ user, onLogout, apiBase, onNavigate }) {
  const { selectedPatientId, setSelectedPatientId, selectedPatient: currentProfile } = usePatient();
  
  // Zustand Stores
  const patients = usePatientStore((state) => state.patients);
  const fetchPatients = usePatientStore((state) => state.fetchPatients);
  const patientsLoading = usePatientStore((state) => state.isLoading);
  
  const uploads = useUploadStore((state) => state.uploads);
  const setUploads = useUploadStore((state) => state.setUploads);

  // States
  const [consoleReport, setConsoleReport] = useState('');
  const [resolvingId, setResolvingId] = useState(null);

  // Fetch recent uploads from backend using React Query hook
  const { data: recentUploads = [], isLoading: uploadsLoading } = useRecentUploads(50);

  // Load and refresh patient lists
  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Sync React Query cache with Zustand upload store safely (compare IDs & statuses to prevent infinite loop)
  useEffect(() => {
    if (recentUploads) {
      const currentHash = uploads.map(u => `${u.id || u.upload_id}-${u.status || ''}`).join(',');
      const newHash = recentUploads.map(u => `${u.id || u.upload_id}-${u.status || ''}`).join(',');
      if (currentHash !== newHash) {
        setUploads(recentUploads);
      }
    }
  }, [recentUploads, uploads, setUploads]);

  const getGreetingName = () => {
    if (!user?.full_name) return 'Dr. Sarah';
    const parts = user.full_name.split(' ');
    return parts.length > 1 ? `${parts[0]} ${parts[1]}` : parts[0];
  };

  const getTimeGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getFormattedDate = () => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  const handleResolveScan = async (patientId) => {
    setResolvingId(patientId);
    try {
      const token = localStorage.getItem('neuro_token');
      const response = await fetch(`${apiBase}/api/scans/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ patient_id: patientId })
      });
      if (!response.ok) throw new Error('Could not synchronize node override');
      fetchPatients();
    } catch (err) {
      alert(err.message);
    } finally {
      setResolvingId(null);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedPatientId) return;
    try {
      const token = localStorage.getItem('neuro_token');
      const response = await fetch(`${apiBase}/api/insights/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ patient_id: selectedPatientId })
      });
      if (!response.ok) throw new Error('Report constructor failed');
      const reportRes = await response.json();
      setConsoleReport(reportRes.report);
    } catch (err) {
      alert(err.message);
    }
  };

  // Filter uploads to only keep those belonging to registered patients
  const registeredPatientIds = new Set(patients.map((p) => p.id));
  const filteredUploads = uploads.filter((u) => registeredPatientIds.has(u.patient_id));

  // Compute live counts for greeting & status cards using filtered list
  const activeScansCount = filteredUploads.filter((u) => u.status?.toLowerCase() === 'processing').length;
  const urgentCasesCount = patients.filter((p) => {
    const pUploads = filteredUploads.filter((u) => u.patient_id === p.id);
    if (pUploads.length === 0) return false;
    const latest = [...pUploads].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    const seg = latest.segmentation || latest.results || {};
    return (seg.tumor_detected ?? false) && (seg.tumor_volume_cm3 ?? 0) > 3.5;
  }).length;

  // Render full-page empty state if directory contains 0 profiles
  const pageLoading = patientsLoading && patients.length === 0;

  if (pageLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="spinner" />
          <span className="loading-text">Synchronizing Neural Interface...</span>
        </div>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="page-content fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '75vh', textAlign: 'center' }}>
        <div className="glass-card glowing-card" style={{ padding: '40px', maxWidth: '460px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,15,25,0.65)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(70,241,197,0.1)', border: '1px solid rgba(70,241,197,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#46f1c5' }}>
            <Users size={32} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', margin: 0 }}>No Patients Registered</h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.6', margin: 0 }}>
            No patients registered. Add a patient in the primary directory to begin volumetric mapping and digital twin analysis.
          </p>
          <button 
            className="btn-primary" 
            onClick={() => onNavigate('patients')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '8px', fontWeight: '600' }}
          >
            <UserPlus size={16} /> Go to Patient Directory
          </button>
        </div>
      </div>
    );
  }

  // Get recent 5 uploads for Dashboard activity listing using filtered list
  const sortedUploads = [...filteredUploads]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const recentUploadsList = sortedUploads.slice(-5).reverse();

  return (
    <div className="page-content fade-in">
      {/* Greetings Block */}
      <div className="glass-card glowing-card" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 32px'
      }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            {getTimeGreeting()}, {getGreetingName()} 👋
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', marginBottom: 0 }}>
            Systems clear. {activeScansCount} active scans and {urgentCasesCount} urgent cases ready for review.
          </p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '8px 16px',
          borderRadius: '8px',
          fontFamily: 'Roboto Mono',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.8)'
        }}>
          <Calendar size={14} style={{ color: '#46f1c5' }} />
          <span>{getFormattedDate()}</span>
        </div>
      </div>

      {/* Patient Tab Banner */}
      <div className="glass-card glowing-card" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#fff', margin: 0 }}>
              {currentProfile?.name || 'Select Patient'}
            </h2>
            {currentProfile?.status && (
              <span style={{
                backgroundColor: 'rgba(70, 241, 197, 0.1)',
                border: '1px solid rgba(70, 241, 197, 0.25)',
                color: '#46f1c5',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: '600',
                fontFamily: 'Roboto Mono'
              }}>
                {currentProfile.status}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: 'Roboto Mono' }}>
            <span style={{ fontWeight: '700', color: '#46f1c5' }}>{currentProfile?.code || '—'}</span>
            <span>{currentProfile?.age || '—'} / {currentProfile?.gender || '—'}</span>
            <span>DOB {currentProfile?.dob || '—'}</span>
            <span>Last scan {currentProfile?.lastScan || '—'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginRight: '8px' }}>Diagnosis</span>
            <span style={{
              backgroundColor: 'rgba(74, 144, 217, 0.1)',
              border: '1px solid rgba(74, 144, 217, 0.25)',
              color: '#4A90D9',
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {currentProfile?.diagnosis || 'Under Observation'}
            </span>
          </div>
        </div>

        {/* Right select selection options */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedPatientId}
              onChange={(e) => { setSelectedPatientId(e.target.value); setConsoleReport(''); }}
              className="btn-secondary"
              style={{
                appearance: 'none',
                paddingRight: '36px',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.02)',
                outline: 'none'
              }}
            >
              {patients.map(p => (
                <option key={p.id} value={p.id} style={{ backgroundColor: '#131318', color: '#fff' }}>
                  {p.first_name} {p.last_name} ({p.id})
                </option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'rgba(255,255,255,0.4)' }} />
          </div>

          <button className="btn-secondary" onClick={() => onNavigate('patients')}>
            <Users size={14} /> Patient Directory
          </button>
        </div>
      </div>

      {/* Vitals Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Heart Rate Card */}
        <div className="glass-card glowing-card" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '20px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <div>
              <span className="data-label" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>HEART RATE</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}>
                <span style={{ fontSize: '38px', fontWeight: '800', color: '#46f1c5', fontFamily: 'Roboto Mono' }}>84</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', fontFamily: 'Roboto Mono' }}>BPM</span>
              </div>
            </div>
            
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FF6B6B',
              boxShadow: '0 0 10px rgba(255, 107, 107, 0.15)'
            }}>
              <Heart size={18} fill="#FF6B6B" style={{ animation: 'pulse-dot 1.2s infinite' }} />
            </div>
          </div>

          <div style={{ 
            height: '45px', 
            width: '100%', 
            overflow: 'hidden', 
            position: 'relative',
            marginTop: '16px'
          }}>
            <svg 
              viewBox="0 0 600 50" 
              preserveAspectRatio="none" 
              className="ekg-scroll-wave"
              style={{ 
                width: '600px', 
                height: '100%',
                position: 'absolute',
                left: 0,
                top: 0
              }}
            >
              <path 
                d="M 0,25 L 60,25 Q 70,18 80,25 L 100,25 L 105,32 L 112,5 L 120,45 L 125,25 L 140,25 Q 155,15 170,25 L 300,25 L 360,25 Q 370,18 380,25 L 400,25 L 405,32 L 412,5 L 420,45 L 425,25 L 440,25 Q 455,15 470,25 L 600,25" 
                fill="none" 
                stroke="#46f1c5" 
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0px 0px 4px rgba(70, 241, 197, 0.6))' }}
              />
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '11px', fontFamily: 'Roboto Mono', color: 'rgba(255,255,255,0.3)' }}>
            <span style={{
              backgroundColor: 'rgba(46, 204, 113, 0.1)',
              color: '#2ECC71',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '10px',
              fontWeight: '700'
            }}>
              Normal
            </span>
            <span>↓ 20:54</span>
          </div>
        </div>

        {/* SpO2 Card */}
        <div className="glass-card glowing-card" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '20px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <div>
              <span className="data-label" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>SPO2</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}>
                <span style={{ fontSize: '38px', fontWeight: '800', color: '#46f1c5', fontFamily: 'Roboto Mono' }}>96</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', fontFamily: 'Roboto Mono' }}>%</span>
              </div>
            </div>
            
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(70, 241, 197, 0.1)',
              border: '1px solid rgba(70, 241, 197, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#46f1c5',
              boxShadow: '0 0 10px rgba(70, 241, 197, 0.15)'
            }}>
              <Waves size={18} />
            </div>
          </div>

          <div style={{ 
            height: '45px', 
            width: '100%', 
            overflow: 'hidden', 
            position: 'relative',
            marginTop: '16px'
          }}>
            <svg 
              viewBox="0 0 600 50" 
              preserveAspectRatio="none" 
              className="sine-scroll-wave"
              style={{ 
                width: '600px', 
                height: '100%',
                position: 'absolute',
                left: 0,
                top: 0
              }}
            >
              <path 
                d="M 0,25 Q 50,5 100,25 T 200,25 T 300,25 T 400,25 T 500,25 T 600,25" 
                fill="none" 
                stroke="#46f1c5" 
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0px 0px 4px rgba(70, 241, 197, 0.6))' }}
              />
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '11px', fontFamily: 'Roboto Mono', color: 'rgba(255,255,255,0.3)' }}>
            <span style={{
              backgroundColor: 'rgba(46, 204, 113, 0.1)',
              color: '#2ECC71',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '10px',
              fontWeight: '700'
            }}>
              Normal
            </span>
            <span>↓ 20:54</span>
          </div>
        </div>

        {/* Temperature Card */}
        <div className="glass-card glowing-card" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '20px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <div>
              <span className="data-label" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>TEMPERATURE</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}>
                <span style={{ fontSize: '38px', fontWeight: '800', color: '#46f1c5', fontFamily: 'Roboto Mono' }}>36.8</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', fontFamily: 'Roboto Mono' }}>°C</span>
              </div>
            </div>
            
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(74, 144, 217, 0.1)',
              border: '1px solid rgba(74, 144, 217, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4A90D9',
              boxShadow: '0 0 10px rgba(74, 144, 217, 0.15)'
            }}>
              <Thermometer size={18} />
            </div>
          </div>

          <div style={{ 
            height: '45px', 
            width: '100%', 
            overflow: 'hidden', 
            position: 'relative',
            marginTop: '16px'
          }}>
            <svg 
              viewBox="0 0 750 50" 
              preserveAspectRatio="none" 
              className="temp-scroll-wave"
              style={{ 
                width: '750px', 
                height: '100%',
                position: 'absolute',
                left: 0,
                top: 0
              }}
            >
              <path 
                d="M 0,25 Q 62.5,12 125,25 T 250,25 T 375,25 T 500,25 T 625,25 T 750,25" 
                fill="none" 
                stroke="#46f1c5" 
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0px 0px 4px rgba(70, 241, 197, 0.6))' }}
              />
            </svg>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '11px', fontFamily: 'Roboto Mono', color: 'rgba(255,255,255,0.3)' }}>
            <span style={{
              backgroundColor: 'rgba(46, 204, 113, 0.1)',
              color: '#2ECC71',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '10px',
              fontWeight: '700'
            }}>
              Normal
            </span>
            <span>↓ 20:54</span>
          </div>
        </div>
      </div>

      {/* Activity Table + Quick Actions */}
      <div className="dashboard-bottom-grid">
        {/* Recent MRI Activity Table */}
        <GlassCard className="glowing-card">
          <div className="section-header-row">
            <h3 className="section-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Activity size={16} style={{ color: '#46f1c5' }} /> Recent MRI Activity
            </h3>
            <button 
              onClick={() => onNavigate('upload-history')}
              style={{
                background: 'none',
                border: 'none',
                color: '#46f1c5',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'none',
                padding: 0
              }}
            >
              View All Uploads →
            </button>
          </div>

          {uploadsLoading ? (
            <LoadingSkeleton />
          ) : !recentUploadsList || recentUploadsList.length === 0 ? (
            <EmptyState message="No uploads yet. Upload an MRI to get started." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="activity-table">
                <thead>
                  <tr>
                    <th className="data-label at-header">PATIENT ID</th>
                    <th className="data-label at-header">SCAN TYPE</th>
                    <th className="data-label at-header">STATUS</th>
                    <th className="data-label at-header" style={{ textAlign: 'right' }}>PROGRESS</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUploadsList.map(upload => (
                    <ActivityRow
                      key={upload.id || upload.upload_id}
                      upload={upload}
                      isSelected={selectedPatientId === upload.patient_id}
                      onClick={() => {
                        setSelectedPatientId(upload.patient_id);
                        setConsoleReport('');
                        if (upload.status?.toLowerCase() === 'completed') {
                          useUploadStore.getState().setUploadDone(
                            upload.upload_id,
                            upload.segmentation,
                            null
                          );
                        }
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        {/* Quick Actions Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 className="section-heading" style={{ margin: '0 0 4px 0' }}>Quick Actions</h3>
          
          {/* Upload MRI Card */}
          <div 
            onClick={() => onNavigate('mri-upload')}
            className="glass-card glowing-card" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px', 
              padding: '16px 20px', 
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(70,241,197,0.5)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(70,241,197,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0, 99, 169, 0.3)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{
              width: '40px', height: '40px', borderRadius: '8px',
              backgroundColor: 'rgba(70,241,197,0.06)', border: '1px solid rgba(70,241,197,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#46f1c5'
            }}>
              <FolderUp size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: '600' }}>Upload MRI</h4>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>DICOM, NIfTI support</p>
            </div>
          </div>

          {/* Generate Report Card */}
          <div 
            onClick={() => onNavigate('reports')}
            className="glass-card glowing-card" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px', 
              padding: '16px 20px', 
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(74,144,217,0.5)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(74,144,217,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0, 99, 169, 0.3)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{
              width: '40px', height: '40px', borderRadius: '8px',
              backgroundColor: 'rgba(74,144,217,0.06)', border: '1px solid rgba(74,144,217,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A90D9'
            }}>
              <FileText size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: '600' }}>Generate Report</h4>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Automated clinical notes</p>
            </div>
          </div>

          {/* Console report display if it exists */}
          {consoleReport && (
            <div className="console-report" style={{ marginTop: '-4px', marginBottom: '8px' }}>
              <pre>{consoleReport}</pre>
            </div>
          )}

          {/* Live IoT Monitoring Card */}
          <div 
            onClick={() => onNavigate('iot-monitoring')}
            className="glass-card glowing-card" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px', 
              padding: '16px 20px', 
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(108,92,231,0.5)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(108,92,231,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0, 99, 169, 0.3)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{
              width: '40px', height: '40px', borderRadius: '8px',
              backgroundColor: 'rgba(108,92,231,0.06)', border: '1px solid rgba(108,92,231,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6C5CE7'
            }}>
              <Radio size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: '600' }}>Live IoT Monitor</h4>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Streaming 4 active sensors</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
