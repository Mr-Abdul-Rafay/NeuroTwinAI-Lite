import React, { useState } from 'react';
import { Bell, Settings, LogOut, X } from 'lucide-react';

export default function TopNav({ user, onLogout }) {
  const [showNotifs, setShowNotifs] = useState(false);

  const initials = user?.full_name
    ? user.full_name.replace('Dr. ', '').substring(0, 1).toUpperCase()
    : 'D';

  const notifications = [
    { text: 'Patient #TX-7430 anomaly alert', time: '2m ago', type: 'urgent' },
    { text: 'Cohort Beta 95% complete', time: '1h ago', type: 'info' },
    { text: 'System optimization applied', time: '3h ago', type: 'success' },
  ];

  return (
    <header className="topnav">
      {/* Logo */}
      <span className="topnav-logo gradient-text">NeuroTwinAI-Lite</span>

      {/* Right controls */}
      <div className="topnav-right">
        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            className="topnav-icon-btn"
            onClick={() => setShowNotifs(!showNotifs)}
            title="Notifications"
          >
            <Bell size={18} />
            <span className="notif-dot" />
          </button>

          {showNotifs && (
            <div className="notif-dropdown glass-card">
              <div className="notif-header">
                <span>Notifications</span>
                <button className="notif-close" onClick={() => setShowNotifs(false)}>
                  <X size={14} />
                </button>
              </div>
              {notifications.map((n, i) => (
                <div key={i} className={`notif-item notif-${n.type}`}>
                  <p>{n.text}</p>
                  <span>{n.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="topnav-icon-btn" title="Settings">
          <Settings size={18} />
        </button>

        <div className="topnav-divider" />

        {/* User avatar */}
        <div className="topnav-user">
          <div className="user-avatar">{initials}</div>
          <span className="user-name">{user?.full_name || 'Doctor'}</span>
          <button
            onClick={onLogout}
            className="topnav-icon-btn logout-btn"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
