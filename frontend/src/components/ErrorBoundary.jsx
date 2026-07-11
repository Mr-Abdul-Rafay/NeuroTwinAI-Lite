import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0A0F',
          color: '#e4e1e9',
          fontFamily: "'Inter', sans-serif",
          padding: '24px',
        }}>
          <div className="glass-card" style={{
            maxWidth: '600px',
            width: '100%',
            textAlign: 'center',
            border: '1px solid rgba(255, 107, 107, 0.25)',
            boxShadow: '0 8px 32px rgba(255, 107, 107, 0.1)',
            padding: '40px 32px',
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255, 107, 107, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              border: '1px solid rgba(255, 107, 107, 0.3)',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            
            <h2 className="headline-md" style={{ color: '#FF6B6B', marginBottom: '12px' }}>
              Application Error
            </h2>
            
            <p className="body-md" style={{ marginBottom: '24px', fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
              NeuroTwinAI-Lite encountered an unexpected rendering error. This might be due to outdated components or failed data fetching.
            </p>

            <div className="console-report" style={{
              textAlign: 'left',
              marginBottom: '28px',
              background: '#050508',
              border: '1px solid rgba(255, 107, 107, 0.2)',
              borderRadius: '8px',
              padding: '16px',
              maxHeight: '200px',
              overflowY: 'auto',
            }}>
              <pre style={{
                fontFamily: "'Roboto Mono', monospace",
                fontSize: '12px',
                color: '#FF6B6B',
                whiteSpace: 'pre-wrap',
                margin: 0,
              }}>
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </div>

            <button 
              className="btn-primary" 
              onClick={this.handleReset}
              style={{
                background: 'linear-gradient(135deg, #FF6B6B 0%, #93000a 100%)',
                color: '#ffffff',
                boxShadow: '0 0 20px rgba(255, 107, 107, 0.2)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.72 2.73L21 8"/>
                <polyline points="21 3 21 8 16 8"/>
              </svg>
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
