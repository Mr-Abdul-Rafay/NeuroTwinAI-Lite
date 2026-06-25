import React, { useState } from 'react';
import { Shield, Zap, AlertCircle, User, FileText, Building2, Mail, Key, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';
import Brain3D from '../components/Brain3D';
import NeuralBackground from '../components/NeuralBackground';

export default function RegisterPage({ onNavigate, apiBase }) {
  const [formData, setFormData] = useState({
    fullName: '',
    licenseId: '',
    hospitalName: '',
    email: '',
    secureKey: '',
    compliance: false
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSecureKey, setShowSecureKey] = useState(false);

  // Dynamic strength calculation for Neural Entropy meter
  const getEntropyStrength = (pwd) => {
    if (!pwd) return { label: 'LOW', pct: 0, color: '#ffb4ab' };
    let strength = 0;
    if (pwd.length >= 6) strength += 25;
    if (pwd.length >= 10) strength += 25;
    if (/[A-Z]/.test(pwd)) strength += 25;
    if (/[0-9!@#$%^&*]/.test(pwd)) strength += 25;
    
    if (strength <= 25) return { label: 'LOW', pct: 25, color: '#ffb4ab' };
    if (strength <= 50) return { label: 'MEDIUM', pct: 50, color: '#bbb3ff' };
    if (strength <= 75) return { label: 'HIGH', pct: 75, color: '#a0caff' };
    return { label: 'SECURE', pct: 100, color: '#46f1c5' };
  };

  const entropy = getEntropyStrength(formData.secureKey);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.licenseId || !formData.hospitalName || !formData.email || !formData.secureKey) {
      setError('Please fill in all clinical credentials.');
      return;
    }
    if (!formData.compliance) {
      setError('Compliance with HIPAA protocol maintenance is mandatory.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${apiBase}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.fullName,
          license_id: formData.licenseId,
          hospital: formData.hospitalName,
          email: formData.email,
          secure_key: formData.secureKey,
          compliance_confirmed: formData.compliance
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      setSuccess('Account established successfully. Redirecting to access panel...');
      setTimeout(() => {
        onNavigate('login');
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundColor: '#0A0A0F',
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden'
    }}>
      <style>{`
        @keyframes card-glow {
          0%, 100% {
            border-color: #005696;
            box-shadow: 0 0 20px rgba(0, 99, 169, 0.4), inset 0 0 15px rgba(70, 241, 197, 0.15), 0 20px 50px rgba(0, 0, 0, 0.5);
          }
          50% {
            border-color: #46f1c5;
            box-shadow: 0 0 35px rgba(70, 241, 197, 0.7), inset 0 0 25px rgba(0, 99, 169, 0.3), 0 20px 50px rgba(0, 0, 0, 0.5);
          }
        }
      `}</style>
      {/* 3D Animated Constellation Background */}
      <NeuralBackground />

      {/* Grid Background Lines for Layer 0/1 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle at 15% 30%, rgba(70, 241, 197, 0.08) 0%, transparent 60%), radial-gradient(circle at 85% 85%, rgba(0, 99, 169, 0.08) 0%, transparent 60%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Main split display */}
      <div style={{
        display: 'flex',
        flex: 1,
        flexWrap: 'wrap',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        padding: '32px 16px',
        alignItems: 'center',
        gap: '48px',
        zIndex: 1
      }}>
        {/* Left branding pane */}
        <div style={{
          flex: '1 1 450px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '20px'
        }}>
          {/* Interactive 3D Brain Mesh & Network */}
          <Brain3D />
          
          <h1 className="headline-lg" style={{ color: '#fff', fontSize: '36px', fontWeight: '700', lineHeight: '1.2', marginTop: '10px' }}>
            The Future of <br />
            <span style={{ 
              background: 'linear-gradient(135deg, #46f1c5 0%, #0063a9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>Neuro-AI Insight</span>
          </h1>
          
          <p className="body-md" style={{ color: '#bacac2', maxWidth: '420px', lineHeight: '1.6' }}>
            Synthesizing clinical data into actionable digital twins with mathematical precision.
          </p>

          {/* Vitals metrics strip */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '32px',
            marginTop: '24px',
            width: '100%',
            maxWidth: '400px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            paddingTop: '24px'
          }}>
            <div>
              <div className="data-label">PRECISION</div>
              <div className="data-value" style={{ color: '#46f1c5' }}>99.8%</div>
            </div>
            <div>
              <div className="data-label">LATENCY</div>
              <div className="data-value" style={{ color: '#a0caff' }}>12ms</div>
            </div>
            <div>
              <div className="data-label">UPLINK</div>
              <div className="data-value" style={{ color: '#d8d2ff' }}>SECURE</div>
            </div>
          </div>
        </div>

        {/* Right card form panel */}
        <div style={{
          flex: '1 1 500px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div className="glass-layer-2" style={{
            borderRadius: 'var(--rounded-xl)',
            padding: '32px',
            border: '4px solid #005696',
            animation: 'card-glow 4s infinite ease-in-out',
            transition: 'all 0.3s ease'
          }}>
            <h2 className="headline-md" style={{ marginBottom: '4px', color: '#fff' }}>
              Create Clinical Account
            </h2>
            <p className="body-md" style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>
              Join the future of precision neuro-AI.
            </p>

            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(255, 180, 171, 0.1)',
                border: '1px solid rgba(255, 180, 171, 0.2)',
                color: '#ffb4ab',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(70, 241, 197, 0.1)',
                border: '1px solid rgba(70, 241, 197, 0.2)',
                color: '#46f1c5',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '14px'
              }}>
                <Shield size={16} />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label className="data-label" style={{ display: 'block', marginBottom: '8px' }}>FULL NAME</label>
                  <div style={{ position: 'relative' }}>
                    <User style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'rgba(255,255,255,0.3)',
                      width: '18px',
                      height: '18px'
                    }} />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Dr. Sarah Jenkins"
                      className="input-field"
                      style={{ paddingLeft: '44px' }}
                      required
                    />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="data-label" style={{ display: 'block', marginBottom: '8px' }}>MEDICAL LICENSE ID</label>
                  <div style={{ position: 'relative' }}>
                    <FileText style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'rgba(255,255,255,0.3)',
                      width: '18px',
                      height: '18px'
                    }} />
                    <input
                      type="text"
                      name="licenseId"
                      value={formData.licenseId}
                      onChange={handleInputChange}
                      placeholder="MD-8829-00X"
                      className="input-field"
                      style={{ paddingLeft: '44px' }}
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="data-label" style={{ display: 'block', marginBottom: '8px' }}>HOSPITAL / CLINIC NAME</label>
                <div style={{ position: 'relative' }}>
                  <Building2 style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255,255,255,0.3)',
                    width: '18px',
                    height: '18px'
                  }} />
                  <input
                    type="text"
                    name="hospitalName"
                    value={formData.hospitalName}
                    onChange={handleInputChange}
                    placeholder="Central Neuro-Science Institute"
                    className="input-field"
                    style={{ paddingLeft: '44px' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="data-label" style={{ display: 'block', marginBottom: '8px' }}>PROFESSIONAL EMAIL</label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255,255,255,0.3)',
                    width: '18px',
                    height: '18px'
                  }} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="s.jenkins@medical.ai"
                    className="input-field"
                    style={{ paddingLeft: '44px' }}
                    required
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="data-label">CREATE SECURE KEY</label>
                  <span className="data-label" style={{ fontSize: '10px', color: '#46f1c5' }}>AES-256 ENABLED</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <Key style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255,255,255,0.3)',
                    width: '18px',
                    height: '18px'
                  }} />
                  <input
                    type={showSecureKey ? "text" : "password"}
                    name="secureKey"
                    value={formData.secureKey}
                    onChange={handleInputChange}
                    placeholder="••••••••••••••"
                    className="input-field"
                    style={{ paddingLeft: '44px', paddingRight: '44px', letterSpacing: showSecureKey ? 'normal' : '0.1em' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecureKey(!showSecureKey)}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.3)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0
                    }}
                  >
                    {showSecureKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {/* Neural Entropy Indicator */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'Roboto Mono', color: 'rgba(255,255,255,0.4)' }}>
                      Neural Entropy
                    </span>
                    <span style={{ fontSize: '11px', fontFamily: 'Roboto Mono', fontWeight: 'bold', color: entropy.color }}>
                      {entropy.label}
                    </span>
                  </div>
                  <div style={{
                    height: '4px',
                    width: '100%',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderRadius: '2px',
                    marginTop: '4px',
                    overflow: 'hidden',
                    display: 'flex',
                    gap: '4px'
                  }}>
                    <div style={{ width: '25%', height: '100%', backgroundColor: formData.secureKey.length > 0 ? entropy.color : 'transparent' }} />
                    <div style={{ width: '25%', height: '100%', backgroundColor: entropy.pct >= 50 ? entropy.color : 'transparent' }} />
                    <div style={{ width: '25%', height: '100%', backgroundColor: entropy.pct >= 75 ? entropy.color : 'transparent' }} />
                    <div style={{ width: '25%', height: '100%', backgroundColor: entropy.pct >= 100 ? entropy.color : 'transparent' }} />
                  </div>
                </div>
              </div>

              {/* Compliance checklist */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '8px' }}>
                <input
                  type="checkbox"
                  id="compliance"
                  name="compliance"
                  checked={formData.compliance}
                  onChange={handleInputChange}
                  style={{
                    marginTop: '4px',
                    cursor: 'pointer',
                    width: '16px',
                    height: '16px',
                    accentColor: '#46f1c5'
                  }}
                />
                <label htmlFor="compliance" style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: '1.5' }}>
                  I confirm compliance with <span style={{ color: '#46f1c5' }}>HIPAA protocol maintenance</span> and agree to the <span style={{ color: '#46f1c5' }}>Clinical Terms of Service</span> for neural data processing.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ 
                  width: '100%', 
                  marginTop: '8px', 
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, #46f1c5 0%, #0063a9 100%)',
                  boxShadow: '0 4px 15px rgba(70, 241, 197, 0.15)'
                }}
              >
                {loading ? 'Securing Cohort...' : 'Register Entity'}
                <Zap size={16} />
              </button>
            </form>

            {/* "Already part of the neural network? Log In" moved inside card */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '24px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              paddingTop: '20px'
            }}>
              <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.4)' }}>
                Already part of the neural network?{' '}
                <button
                  onClick={() => onNavigate('login')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#46f1c5',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
                    padding: 0,
                    textDecoration: 'underline'
                  }}
                >
                  Log In
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
