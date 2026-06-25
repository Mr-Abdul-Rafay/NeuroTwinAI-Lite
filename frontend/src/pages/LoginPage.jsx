import React, { useState } from 'react';
import { Mail, Key, ShieldCheck, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Brain3D from '../components/Brain3D';
import NeuralBackground from '../components/NeuralBackground';

export default function LoginPage({ onNavigate, onLoginSuccess, apiBase }) {
  const [formData, setFormData] = useState({
    email: '',
    secureKey: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSecureKey, setShowSecureKey] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.secureKey) {
      setError('Please provide email and security key.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          secure_key: formData.secureKey
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      // Success
      localStorage.setItem('neuro_token', data.access_token);
      localStorage.setItem('neuro_user', JSON.stringify(data.user));
      onLoginSuccess(data.access_token, data.user);
      onNavigate('dashboard');

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

      {/* Background Gradients */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle at 10% 40%, rgba(0, 99, 169, 0.08) 0%, transparent 60%), radial-gradient(circle at 90% 20%, rgba(70, 241, 197, 0.06) 0%, transparent 60%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Main split content */}
      <div style={{
        display: 'flex',
        flex: 1,
        flexWrap: 'wrap',
        maxWidth: '1100px',
        margin: '0 auto',
        width: '100%',
        padding: '32px 16px',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '64px',
        zIndex: 1
      }}>
        {/* Left Branding Panel */}
        <div style={{
          flex: '1 1 400px',
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

          <p className="body-md" style={{ color: '#bacac2', maxWidth: '380px', lineHeight: '1.6' }}>
            Synthesizing clinical data into actionable digital twins with mathematical precision.
          </p>

          <div style={{ marginTop: '24px' }}>
            <div className="data-label" style={{ letterSpacing: '0.15em', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
              ENTERPRISE GRADE SECURITY
            </div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '600' }}>
              Trusted by 500+ Medical Institutions
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div style={{
          flex: '1 1 450px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div className="glass-layer-2" style={{
            borderRadius: 'var(--rounded-xl)',
            padding: '40px',
            border: '4px solid #005696',
            animation: 'card-glow 4s infinite ease-in-out',
            transition: 'all 0.3s ease'
          }}>
            <h2 className="headline-md" style={{ marginBottom: '6px', color: '#fff', fontSize: '28px' }}>
              Welcome Back, Doctor
            </h2>
            <p className="body-md" style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '32px' }}>
              Secure access to your clinical digital twins.
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
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label className="data-label" style={{ display: 'block', marginBottom: '8px' }}>
                  PROFESSIONAL EMAIL
                </label>
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
                    placeholder="name@hospital.org"
                    className="input-field"
                    style={{ paddingLeft: '44px' }}
                    required
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="data-label">SECURE KEY</label>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.4)',
                      fontSize: '11px',
                      fontFamily: 'Roboto Mono',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                    onClick={() => alert("Contact security administrator to reset your AES key.")}
                  >
                    Forgot Key?
                  </button>
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
                    placeholder="••••••••••••"
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
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  width: '100%',
                  marginTop: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(135deg, #46f1c5 0%, #0063a9 100%)',
                  boxShadow: '0 4px 15px rgba(70, 241, 197, 0.15)'
                }}
              >
                {loading ? 'Verifying Key...' : 'Sign In'}
                <ArrowRight size={16} />
              </button>
            </form>

            {/* "New researcher? Sign Up" moved inside the card */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '32px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              paddingTop: '24px'
            }}>
              <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.4)' }}>
                New researcher?{' '}
                <button
                  onClick={() => onNavigate('register')}
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
                  Sign Up
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
