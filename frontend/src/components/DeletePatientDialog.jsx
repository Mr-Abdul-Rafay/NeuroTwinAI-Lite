import React, { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { patientApi } from '../api/patients';
import usePatientStore from '../store/patientStore';
import useUploadStore from '../store/uploadStore';

export default function DeletePatientDialog({ isOpen, onClose, patient }) {
  const { removePatient } = usePatientStore();
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  if (!isOpen || !patient) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await patientApi.delete(patient.id);
      if (res.status === 'success') {
        removePatient(patient.id);
        useUploadStore.getState().removeUploadsForPatient(patient.id);
        queryClient.invalidateQueries({ queryKey: ['recent-uploads'] });
        queryClient.invalidateQueries({ queryKey: ['upload-stats'] });
        toast.success(`Patient record ${patient.id} and associated scan records deleted successfully`);
        onClose();
      } else {
        toast.error(res.detail || 'Failed to delete patient');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const patientName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || patient.id;

  return (
    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
      <div className="glass-card modal-box" style={{ width: '100%', maxWidth: '400px', padding: '24px', background: 'rgba(20, 10, 15, 0.95)', border: '1px solid rgba(255, 107, 107, 0.2)', borderRadius: '12px', position: 'relative', boxShadow: '0 15px 30px rgba(0,0,0,0.6)' }}>
        
        <button className="modal-close" onClick={onClose} style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF6B6B' }}>
            <AlertTriangle size={18} />
          </div>
          <h4 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: '700' }}>Confirm Deletion</h4>
        </div>

        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', margin: '0 0 20px 0', fontFamily: 'Inter, sans-serif' }}>
          Are you sure you want to permanently delete the patient file for <strong>{patientName}</strong> (ID: {patient.id})? This action cannot be undone. All clinical scan counts and diagnostic links will be removed from directory view.
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
            style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '12px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleDelete}
            disabled={loading}
            style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '12px', backgroundColor: 'rgba(255, 107, 107, 0.15)', border: '1px solid rgba(255, 107, 107, 0.3)', color: '#FF6B6B', display: 'flex', alignItems: 'center', gap: '6px' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 107, 107, 0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255, 107, 107, 0.15)'; }}
          >
            {loading ? (
              <><div className="mini-spinner" style={{ borderColor: '#FF6B6B transparent transparent transparent' }} /> Deleting…</>
            ) : (
              <><Trash2 size={12} /> Delete Record</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
