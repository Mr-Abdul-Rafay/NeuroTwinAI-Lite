import React from 'react';
import Sidebar from './ui/Sidebar';
import TopNav from './ui/TopNav';

export default function AppShell({ user, onLogout, currentPage, onNavigate, children }) {
  return (
    <div className="app-shell">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout} />
      <div className="app-body">
        <TopNav user={user} onLogout={onLogout} />
        <main className="app-main">
          {children}
        </main>
      </div>
    </div>
  );
}
