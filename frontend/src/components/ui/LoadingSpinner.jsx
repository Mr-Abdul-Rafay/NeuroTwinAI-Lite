import React from 'react';

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="spinner" />
        <span className="loading-text">{message}</span>
      </div>
    </div>
  );
}
