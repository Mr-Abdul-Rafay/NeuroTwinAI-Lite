import React from 'react';

export default function StatsCard({ icon: Icon, title, value, trend, positive, accentColor = '#46f1c5' }) {
  return (
    <div className="stats-card glass-card">
      <div className="stats-card-header">
        <span className="stats-label">{title}</span>
        <div className="stats-icon-wrap" style={{ background: `${accentColor}18` }}>
          <Icon size={18} style={{ color: accentColor }} />
        </div>
      </div>
      <div className="stats-value">{value}</div>
      <div className={`stats-trend ${positive ? 'trend-positive' : 'trend-negative'}`}>
        <span>{positive ? '↑' : '↓'} {trend}</span>
        <span className="trend-label">from last month</span>
      </div>
    </div>
  );
}
