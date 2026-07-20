import React, { useState } from 'react';
import {
  LayoutDashboard, Brain, Box, Upload, Activity,
  FileText, Users, LogOut, ChevronLeft, ChevronRight, History, Sparkles
} from 'lucide-react';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',         page: 'dashboard' },
  { icon: Upload,          label: 'MRI Upload',        page: 'mri-upload' },
  { icon: History,         label: 'Upload History',    page: 'upload-history' },
  { icon: Brain,           label: 'AI Results',        page: 'ai-results' },
  { icon: Sparkles,        label: 'AI Explainability', page: 'explain' },
  { icon: Box,             label: '3D Twin Viewer',    page: 'twin-viewer' },
  { icon: Activity,        label: 'IoT Monitoring',    page: 'iot-monitoring' },
  { icon: FileText,        label: 'Reports',           page: 'reports' },
  { icon: Users,           label: 'Patient Directory', page: 'patients' },
];

export default function Sidebar({ currentPage, onNavigate, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Top Section wrapper to group logo + nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
        {/* Header */}
        <div className="sidebar-header" style={{ marginBottom: 0 }}>
          {!collapsed && (
            <div>
              <p className="sidebar-section-title">Medical Portal</p>
              <div className="sidebar-status">
                <span className="status-dot" />
                <span className="sidebar-status-text">Precision AI Active</span>
              </div>
            </div>
          )}
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ icon: Icon, label, page }) => {
            const active = currentPage === page;
            return (
              <button
                key={page}
                onClick={() => onNavigate(page)}
                className={`sidebar-nav-item ${active ? 'sidebar-nav-active' : ''}`}
                title={collapsed ? label : undefined}
              >
                <Icon size={18} />
                {!collapsed && <span>{label}</span>}
                {active && !collapsed && <span className="nav-active-dot" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout button at the very bottom */}
      <div className="sidebar-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
        <button
          onClick={onLogout}
          className="sidebar-nav-item logout-btn"
          style={{ color: 'rgba(255,107,107,0.8)' }}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
