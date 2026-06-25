import React from 'react';

const STATUS_MAP = {
  'Completed':   { cls: 'badge-completed', label: '✓ Completed' },
  'COMPLETED':   { cls: 'badge-completed', label: '✓ Completed' },
  'Processing':  { cls: 'badge-processing', label: '● Processing' },
  'PROCESSING':  { cls: 'badge-processing', label: '● Processing' },
  'Urgent':      { cls: 'badge-warning', label: '⚠ Urgent' },
  'ACTION REQUIRED': { cls: 'badge-warning', label: '⚠ Action Required' },
  'Queued':      { cls: 'badge-queued', label: '⏳ Queued' },
  'Archived':    { cls: 'badge-archived', label: '📁 Archived' },
  'New':         { cls: 'badge-new', label: '🆕 New' },
  'Viewed':      { cls: 'badge-completed', label: '✓ Viewed' },
  'Downloaded':  { cls: 'badge-processing', label: '↓ Downloaded' },
};

const RISK_MAP = {
  'High':   { cls: 'risk-high',   label: '🔴 High' },
  'Medium': { cls: 'risk-medium', label: '⚠️ Medium' },
  'Low':    { cls: 'risk-low',    label: '🟢 Low' },
};

export function StatusBadge({ status }) {
  const map = STATUS_MAP[status] || { cls: 'badge-completed', label: status };
  return <span className={map.cls}>{map.label}</span>;
}

export function RiskBadge({ risk }) {
  const map = RISK_MAP[risk] || { cls: 'risk-low', label: risk };
  return <span className={map.cls}>{map.label}</span>;
}
