import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import GlassCard from '../components/ui/GlassCard';
import { vitalsData, eegChannels } from '../lib/mockData';
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';

const CHANNEL_COLORS = {
  Fp1: '#46f1c5',
  Fp2: '#4A90D9',
  C3:  '#6C5CE7',
  C4:  '#FF6B6B',
};

// Generate realistic-looking EEG noise
function generateEEGPoint(t, channel, hasAnomaly) {
  const base = Math.sin(t * 2.1 + channel * 1.2) * 40
    + Math.sin(t * 5.3 + channel * 0.7) * 15
    + Math.sin(t * 13 + channel * 2.1) * 8
    + (Math.random() - 0.5) * 12;
  const anomaly = hasAnomaly && t % 8 < 1.5 ? Math.sin(t * 20) * 80 : 0;
  return parseFloat((base + anomaly).toFixed(2));
}

const PATIENTS = ['Patient #TX-7430', 'Patient #TX-8821', 'Patient #TX-2156'];

export default function IoTMonitoringPage() {
  const [selectedPatient, setSelectedPatient] = useState(PATIENTS[0]);
  const [eegData, setEegData] = useState([]);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [alerts] = useState([
    { type: 'critical', msg: 'Abnormal EEG pattern detected in Fp1 channel!' },
    { type: 'warning',  msg: 'Heart rate elevated above baseline (> 100 BPM)' },
    { type: 'success',  msg: 'All other vitals within normal parameters.' },
  ]);

  const tickRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 0.1 * speed;
      const t = tickRef.current;
      const newPoint = {
        t: t.toFixed(1),
        Fp1: generateEEGPoint(t, 0, true),
        Fp2: generateEEGPoint(t, 1, false),
        C3:  generateEEGPoint(t, 2, false),
        C4:  generateEEGPoint(t, 3, false),
      };
      setEegData(prev => [...prev.slice(-80), newPoint]);
      setTime(t);
    }, 60);
    return () => clearInterval(interval);
  }, [speed]);

  return (
    <div className="page-content fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title gradient-text">IoT Monitoring</h1>
          <p className="page-subtitle">
            Real-time patient vitals · Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            className="input-field"
            style={{ width: 'auto', padding: '8px 14px' }}
            value={selectedPatient}
            onChange={e => setSelectedPatient(e.target.value)}
          >
            {PATIENTS.map(p => <option key={p}>{p}</option>)}
          </select>
          <button className="btn-secondary">
            <Download size={14} /> Export Data
          </button>
        </div>
      </div>

      {/* Vitals Grid */}
      <div className="vitals-grid">
        {vitalsData.map(v => (
          <GlassCard key={v.id} className="vital-card">
            <div className="vital-header">
              <span className="vital-emoji">{v.icon}</span>
              <span className={`vital-status-badge`} style={{ color: v.color, background: `${v.color}18`, border: `1px solid ${v.color}44` }}>
                {v.status}
              </span>
            </div>
            <div className="vital-value" style={{ color: v.color }}>
              {v.value}
              <span className="vital-unit">{v.unit}</span>
            </div>
            <div className="vital-label">{v.label}</div>
            {/* Mini pulse bar */}
            <div className="vital-pulse">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="pulse-bar"
                  style={{
                    height: `${10 + Math.sin((i + time * 3) * 0.8) * 8}px`,
                    background: v.color,
                    opacity: 0.5 + 0.4 * Math.sin((i + time * 3) * 0.8),
                  }}
                />
              ))}
            </div>
          </GlassCard>
        ))}
      </div>

      {/* EEG + Alerts */}
      <div className="iot-bottom-grid">
        {/* EEG Chart */}
        <GlassCard className="eeg-card">
          <div className="eeg-header">
            <div>
              <h3 className="section-heading" style={{ margin: 0 }}>Live EEG Waveform</h3>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                4-channel electroencephalography stream
              </p>
            </div>
            <div className="eeg-controls">
              <div className="eeg-control-group">
                <span className="data-label" style={{ fontSize: '10px' }}>SPEED</span>
                <div className="speed-btns">
                  {[0.5, 1, 2].map(s => (
                    <button
                      key={s}
                      className={`speed-btn ${speed === s ? 'speed-btn-active' : ''}`}
                      onClick={() => setSpeed(s)}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
              <button className="ctrl-btn" onClick={() => { setEegData([]); tickRef.current = 0; }}>
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          <div style={{ height: '260px', marginTop: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={eegData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="t" hide />
                <YAxis
                  domain={[-120, 120]}
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'Roboto Mono' }}
                  tickFormatter={v => `${v}µV`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,15,25,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontFamily: 'Roboto Mono',
                    fontSize: '11px',
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', fontFamily: 'Roboto Mono' }}
                />
                {eegChannels.map(ch => (
                  <Line
                    key={ch}
                    type="monotone"
                    dataKey={ch}
                    stroke={CHANNEL_COLORS[ch]}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Alerts */}
        <GlassCard className="alerts-card">
          <h3 className="section-heading">Alert Panel</h3>
          <div className="alerts-list">
            {alerts.map((a, i) => (
              <div key={i} className={`alert-item alert-${a.type}`}>
                <AlertTriangle size={14} />
                <p>{a.msg}</p>
              </div>
            ))}
          </div>

          <div className="alert-history-label">
            <span className="data-label" style={{ fontSize: '10px' }}>RECENT HISTORY</span>
          </div>
          {[
            { time: '14:12', msg: 'SpO₂ dropped to 93%', resolved: true },
            { time: '13:55', msg: 'EEG spike recorded', resolved: true },
            { time: '11:30', msg: 'HR exceeded 100 BPM', resolved: false },
          ].map((h, i) => (
            <div key={i} className="history-item">
              <span className="history-time">{h.time}</span>
              <span className="history-msg">{h.msg}</span>
              <span className={`history-resolved ${h.resolved ? 'resolved-yes' : 'resolved-no'}`}>
                {h.resolved ? '✓ Resolved' : '● Active'}
              </span>
            </div>
          ))}
        </GlassCard>
      </div>
    </div>
  );
}
