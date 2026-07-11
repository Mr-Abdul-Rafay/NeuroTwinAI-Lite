import React from 'react';
import { Calendar, FileText, ChevronRight, Brain } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { usePatient } from '../context/PatientContext';
import usePatientStore from '../store/patientStore';
import useUploadStore from '../store/uploadStore';

export default function UploadHistoryPage({ onNavigate }) {
  const uploads = useUploadStore((state) => state.uploads);
  const setUploadDone = useUploadStore((state) => state.setUploadDone);
  const patients = usePatientStore((state) => state.patients);
  const { setSelectedPatientId } = usePatient();

  const getPatientName = (patientId) => {
    const patient = patients.find((p) => p.id === patientId);
    return patient ? `${patient.first_name} ${patient.last_name}` : patientId;
  };

  const handleViewResults = (upload) => {
    setSelectedPatientId(upload.patient_id);
    if (upload.status?.toLowerCase() === 'completed') {
      setUploadDone(
        upload.upload_id || upload.id,
        upload.segmentation || upload.results,
        null
      );
    }
    if (onNavigate) onNavigate('ai-results');
  };

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title gradient-text">Upload History</h1>
          <p className="page-subtitle">Historical archive of all uploaded MRI scans and AI segmentation results</p>
        </div>
      </div>

      <GlassCard>
        {uploads.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255, 255, 255, 0.25)', marginBottom: '16px' }}>
              <Brain size={24} />
            </div>
            <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: '600', margin: '0 0 6px 0' }}>No Uploads Found</h4>
            <p style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '13px', margin: '0 0 16px 0', maxWidth: '300px' }}>
              Upload an MRI scan in the MRI Upload page to run the AI pipeline and create record history.
            </p>
          </div>
        ) : (
          <div className="patient-table-wrap">
            <table className="patient-table">
              <thead>
                <tr>
                  <th className="data-label pt-header">Patient</th>
                  <th className="data-label pt-header">Files</th>
                  <th className="data-label pt-header">Date</th>
                  <th className="data-label pt-header">Status</th>
                  <th className="data-label pt-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((upload, idx) => {
                  const patientName = getPatientName(upload.patient_id);
                  const uploadDate = upload.created_at
                    ? new Date(upload.created_at).toLocaleDateString()
                    : 'Recent';

                  return (
                    <tr key={upload.upload_id || upload.id || idx} className="patient-row">
                      <td className="pt-cell">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '600', color: '#fff' }}>{patientName}</span>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'Roboto Mono' }}>{upload.patient_id}</span>
                        </div>
                      </td>
                      <td className="pt-cell" style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={upload.filename}>
                        {upload.filename}
                      </td>
                      <td className="pt-cell pt-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
                          {uploadDate}
                        </div>
                      </td>
                      <td className="pt-cell">
                        <StatusBadge status={upload.status} />
                      </td>
                      <td className="pt-cell">
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => handleViewResults(upload)}
                          disabled={upload.status?.toLowerCase() !== 'completed'}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          View Results <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
