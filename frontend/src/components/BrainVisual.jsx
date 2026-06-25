import React from 'react';

export default function BrainVisual({ animating = true, scale = 1 }) {
  return (
    <div className="brain-container" style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: '260px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            filter: drop-shadow(0 0 10px rgba(70, 241, 197, 0.4)) drop-shadow(0 0 2px rgba(0, 99, 169, 0.6));
            opacity: 0.95;
          }
          50% {
            filter: drop-shadow(0 0 25px rgba(70, 241, 197, 0.85)) drop-shadow(0 0 8px rgba(0, 99, 169, 0.9));
            opacity: 1;
            transform: scale(1.02);
          }
        }
        @keyframes flow-line {
          0% {
            stroke-dashoffset: 60;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes pulse-node {
          0%, 100% {
            r: 3px;
            fill: #46f1c5;
          }
          50% {
            r: 6px;
            fill: #d8d2ff;
          }
        }
        .brain-svg {
          transform: scale(${scale});
          transition: transform 0.3s ease;
          animation: ${animating ? 'pulse-glow 5s infinite ease-in-out' : 'none'};
        }
        .network-line {
          stroke: #166060;
          stroke-width: 1.5;
          stroke-dasharray: 6, 4;
          animation: ${animating ? 'flow-line 8s infinite linear' : 'none'};
        }
        .synapse {
          animation: pulse-node 3s infinite ease-in-out;
        }
        .synapse-1 { animation-delay: 0s; }
        .synapse-2 { animation-delay: 0.7s; }
        .synapse-3 { animation-delay: 1.4s; }
        .synapse-4 { animation-delay: 2.1s; }
      `}</style>
      
      <svg
        width="240px"
        height="240px"
        viewBox="0 0 200 200"
        className="brain-svg"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="brain-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#46f1c5" />
            <stop offset="50%" stopColor="#0063a9" />
            <stop offset="100%" stopColor="#4029ba" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Brain Structure Outline */}
        <path
          d="M 100 30 
             C 140 25, 175 40, 180 80 
             C 183 105, 160 120, 165 140 
             C 170 155, 155 175, 130 170 
             C 115 167, 105 178, 100 178 
             C 95 178, 85 167, 70 170 
             C 45 175, 30 155, 35 140 
             C 40 120, 17 105, 20 80 
             C 25 40, 60 25, 100 30 Z"
          stroke="url(#brain-grad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />

        {/* Inner lobes divisions */}
        <path
          d="M 100 30 C 100 70, 95 100, 110 120 C 120 135, 130 140, 165 140"
          stroke="url(#brain-grad)"
          strokeWidth="2"
          opacity="0.5"
          strokeDasharray="4,4"
        />
        <path
          d="M 100 75 C 75 80, 55 90, 35 95"
          stroke="url(#brain-grad)"
          strokeWidth="1.5"
          opacity="0.4"
        />
        <path
          d="M 100 120 C 80 130, 65 140, 35 140"
          stroke="url(#brain-grad)"
          strokeWidth="1.5"
          opacity="0.4"
        />

        {/* Neural Network Pathways */}
        <line x1="50" y1="65" x2="80" y2="85" className="network-line" />
        <line x1="80" y1="85" x2="110" y2="60" className="network-line" />
        <line x1="110" y1="60" x2="150" y2="70" className="network-line" />
        <line x1="150" y1="70" x2="160" y2="105" className="network-line" />
        <line x1="80" y1="85" x2="95" y2="125" className="network-line" />
        <line x1="95" y1="125" x2="140" y2="120" className="network-line" />
        <line x1="140" y1="120" x2="150" y2="70" className="network-line" />
        <line x1="50" y1="110" x2="80" y2="135" className="network-line" />
        <line x1="80" y1="135" x2="95" y2="125" className="network-line" />
        <line x1="50" y1="65" x2="50" y2="110" className="network-line" />

        {/* Synapse Nodes */}
        <circle cx="50" cy="65" r="4.5" fill="#46f1c5" className="synapse synapse-1" filter="url(#glow)" />
        <circle cx="80" cy="85" r="4.5" fill="#00d4aa" className="synapse synapse-2" filter="url(#glow)" />
        <circle cx="110" cy="60" r="4.5" fill="#a0caff" className="synapse synapse-3" filter="url(#glow)" />
        <circle cx="150" cy="70" r="4.5" fill="#d8d2ff" className="synapse synapse-4" filter="url(#glow)" />
        <circle cx="160" cy="105" r="4.5" fill="#46f1c5" className="synapse synapse-1" filter="url(#glow)" />
        <circle cx="95" cy="125" r="4.5" fill="#00d4aa" className="synapse synapse-3" filter="url(#glow)" />
        <circle cx="140" cy="120" r="4.5" fill="#a0caff" className="synapse synapse-2" filter="url(#glow)" />
        <circle cx="50" cy="110" r="4.5" fill="#d8d2ff" className="synapse synapse-4" filter="url(#glow)" />
        <circle cx="80" cy="135" r="4.5" fill="#46f1c5" className="synapse synapse-1" filter="url(#glow)" />

        {/* Biological pulse arcs */}
        <path d="M 65 45 A 25 25 0 0 1 135 45" stroke="#46f1c5" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
        <path d="M 50 145 A 35 35 0 0 0 150 145" stroke="#d8d2ff" strokeWidth="1" strokeLinecap="round" opacity="0.25" />
      </svg>
    </div>
  );
}
