import React from 'react';
import { User, Activity } from 'lucide-react';

export default function PatientCard({ patient, onSelect, isSelected }) {
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

  const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown';
  const age = calculateAge(patient.dob);
  const initials = `${patient.first_name?.[0] || ''}${patient.last_name?.[0] || ''}`.toUpperCase().slice(0, 2);

  return (
    <div
      onClick={onSelect}
      className={`glass-card glowing-card ${isSelected ? 'selected-patient-card' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 20px',
        cursor: 'pointer',
        border: isSelected ? '1.5px solid #46f1c5' : '1px solid rgba(255,255,255,0.06)',
        background: isSelected ? 'rgba(70,241,197,0.06)' : 'rgba(255,255,255,0.02)',
        borderRadius: '12px',
        transition: 'all 0.25s ease',
        boxShadow: isSelected ? '0 0 15px rgba(70,241,197,0.15)' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = 'rgba(70,241,197,0.3)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: isSelected ? 'rgba(70,241,197,0.12)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${isSelected ? 'rgba(70,241,197,0.25)' : 'rgba(255,255,255,0.1)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: '700',
            color: isSelected ? '#46f1c5' : 'rgba(255,255,255,0.7)',
            flexShrink: 0,
          }}
        >
          {initials || <User size={16} />}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h4
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: '600',
              color: '#fff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fullName}
          </h4>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontFamily: 'Roboto Mono' }}>
            {patient.id}
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        <span>
          {age} y/o · {patient.gender || '—'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#46f1c5', fontFamily: 'Roboto Mono', fontSize: '11px', fontWeight: '600' }}>
          <Activity size={10} />
          <span>{patient.scan_count || 0} scan{patient.scan_count !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}
