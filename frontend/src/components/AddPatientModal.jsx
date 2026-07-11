import React, { useState, useEffect } from 'react';
import { X, Save, UserPlus, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { patientApi } from '../api/patients';
import usePatientStore from '../store/patientStore';

export default function AddPatientModal({ isOpen, onClose, patient = null }) {
  const { addPatient, updatePatientInStore } = usePatientStore();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    dob: '',
    gender: 'Male',
    medical_history: '',
    contact: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (patient) {
      setForm({
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        dob: patient.dob || '',
        gender: patient.gender || 'Male',
        medical_history: patient.medical_history || '',
        contact: patient.contact || '',
        phone: patient.phone || '',
        address: patient.address || '',
      });
    } else {
      setForm({
        first_name: '',
        last_name: '',
        dob: '',
        gender: 'Male',
        medical_history: '',
        contact: '',
        phone: '',
        address: '',
      });
    }
    setErrors({});
  }, [patient, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/[^0-9+\-\s()]/g, '');
    setForm((prev) => ({ ...prev, phone: value }));
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: '' }));
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!form.first_name || !form.first_name.trim()) {
      errs.first_name = 'First Name is required';
    }
    if (!form.last_name || !form.last_name.trim()) {
      errs.last_name = 'Last Name is required';
    }
    if (!form.dob) {
      errs.dob = 'Date of Birth is required';
    } else {
      const dobDate = new Date(form.dob);
      const today = new Date();
      if (dobDate > today) {
        errs.dob = 'Date of Birth cannot be in the future';
      }
    }
    if (form.contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact)) {
      errs.contact = 'Please enter a valid email address';
    }
    if (form.phone && !/^[0-9+\-\s()]{7,15}$/.test(form.phone)) {
      errs.phone = 'Please enter a valid phone number';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('Please correct the validation errors before saving.');
      return;
    }

    setLoading(true);
    try {
      if (patient) {
        // Update operation
        const res = await patientApi.update(patient.id, form);
        if (res.status === 'success') {
          updatePatientInStore(patient.id, res.patient);
          toast.success('Patient record updated successfully');
          onClose();
        } else {
          toast.error(res.detail || 'Failed to update patient');
        }
      } else {
        // Create operation
        const res = await patientApi.create(form);
        if (res.status === 'success') {
          addPatient(res.patient);
          toast.success('New patient registered successfully');
          onClose();
        } else {
          toast.error(res.detail || 'Failed to register patient');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isEdit = !!patient;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            {isEdit ? <Edit2 size={20} style={{ color: '#46f1c5' }} /> : <UserPlus size={20} style={{ color: '#46f1c5' }} />}
            {isEdit ? 'Edit Patient Record' : 'Register New Patient'}
          </h2>
          <button className="modal-close" onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>
        
        <div className="modal-body">
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: '0 0 20px 0' }}>
            {isEdit ? 'Modify clinical details for patient reference.' : 'Add new patient profile to primary medical record repository.'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="data-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>
                FIRST NAME <span style={{ color: '#FF6B6B' }}>*</span>
              </label>
              <input
                type="text"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                className={errors.first_name ? 'input-field error' : 'input-field'}
                placeholder="Enter first name"
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: errors.first_name ? '1px solid #FF6B6B' : '1px solid rgba(255,255,255,0.08)', 
                  borderRadius: '8px', 
                  color: '#fff',
                  width: '100%'
                }}
              />
              {errors.first_name && <span style={{ color: '#FF6B6B', fontSize: '11px', marginTop: '4px', display: 'block' }}>{errors.first_name}</span>}
            </div>
            
            <div className="form-group">
              <label className="data-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>
                LAST NAME <span style={{ color: '#FF6B6B' }}>*</span>
              </label>
              <input
                type="text"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                className={errors.last_name ? 'input-field error' : 'input-field'}
                placeholder="Enter last name"
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: errors.last_name ? '1px solid #FF6B6B' : '1px solid rgba(255,255,255,0.08)', 
                  borderRadius: '8px', 
                  color: '#fff',
                  width: '100%'
                }}
              />
              {errors.last_name && <span style={{ color: '#FF6B6B', fontSize: '11px', marginTop: '4px', display: 'block' }}>{errors.last_name}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="data-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>
                DATE OF BIRTH <span style={{ color: '#FF6B6B' }}>*</span>
              </label>
              <input
                type="date"
                name="dob"
                value={form.dob}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
                className={errors.dob ? 'input-field error' : 'input-field'}
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: errors.dob ? '1px solid #FF6B6B' : '1px solid rgba(255,255,255,0.08)', 
                  borderRadius: '8px', 
                  color: '#fff',
                  width: '100%'
                }}
              />
              {errors.dob && <span style={{ color: '#FF6B6B', fontSize: '11px', marginTop: '4px', display: 'block' }}>{errors.dob}</span>}
            </div>

            <div className="form-group">
              <label className="data-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>
                GENDER <span style={{ color: '#FF6B6B' }}>*</span>
              </label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="input-field"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', cursor: 'pointer', width: '100%' }}
              >
                <option value="Male" style={{ background: '#131318' }}>Male</option>
                <option value="Female" style={{ background: '#131318' }}>Female</option>
                <option value="Other" style={{ background: '#131318' }}>Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="data-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>CONTACT EMAIL</label>
              <input
                type="email"
                name="contact"
                value={form.contact}
                onChange={handleChange}
                placeholder="patient@email.com"
                className={errors.contact ? 'input-field error' : 'input-field'}
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: errors.contact ? '1px solid #FF6B6B' : '1px solid rgba(255,255,255,0.08)', 
                  borderRadius: '8px', 
                  color: '#fff',
                  width: '100%'
                }}
              />
              {errors.contact && <span style={{ color: '#FF6B6B', fontSize: '11px', marginTop: '4px', display: 'block' }}>{errors.contact}</span>}
            </div>

            <div className="form-group">
              <label className="data-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>PHONE NUMBER</label>
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handlePhoneChange}
                placeholder="+1-555-123-4567"
                className={errors.phone ? 'input-field error' : 'input-field'}
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  border: errors.phone ? '1px solid #FF6B6B' : '1px solid rgba(255,255,255,0.08)', 
                  borderRadius: '8px', 
                  color: '#fff',
                  width: '100%'
                }}
              />
              {errors.phone && <span style={{ color: '#FF6B6B', fontSize: '11px', marginTop: '4px', display: 'block' }}>{errors.phone}</span>}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="data-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>ADDRESS</label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="123 Main St, City, State"
              className="input-field"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', width: '100%' }}
            />
          </div>

          <div className="form-group">
            <label className="data-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>MEDICAL HISTORY</label>
            <textarea
              name="medical_history"
              value={form.medical_history}
              onChange={handleChange}
              placeholder="Enter any relevant medical history"
              className="input-field"
              rows={3}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontFamily: 'Inter, sans-serif', resize: 'vertical', width: '100%' }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
            style={{ padding: '10px 20px', borderRadius: '8px' }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{ padding: '10px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {loading ? (
              <><div className="mini-spinner" /> Saving…</>
            ) : (
              <><Save size={14} /> {isEdit ? 'Update Patient' : 'Save Patient Record'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
