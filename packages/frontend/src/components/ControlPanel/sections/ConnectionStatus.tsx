import React from 'react';
import { SystemStatus } from '../hooks/useSystemStatus';

interface Props {
  status: SystemStatus;
  wsConnected: boolean;
  onRefresh: () => void;
  isChecking: boolean;
}

export const ConnectionStatus: React.FC<Props> = ({ status, wsConnected, onRefresh, isChecking }) => {
  const services = [
    { 
      name: 'Backend', 
      online: status.backend.status === 'healthy',
      label: status.backend.status === 'healthy' ? 'Online' : 'Offline'
    },
    { 
      name: 'Vision', 
      online: status.vision.status === 'healthy',
      label: status.vision.status === 'healthy' 
        ? (status.vision.tracking ? 'Tracking' : 'Ready') 
        : 'Offline'
    },
    { 
      name: 'Ollama', 
      online: status.ollama.status === 'available',
      label: status.ollama.status === 'available' ? 'Available' : 'Offline'
    },
    { 
      name: 'WebSocket', 
      online: wsConnected,
      label: wsConnected ? 'Connected' : 'Disconnected'
    }
  ];

  return (
    <div className="cp-section">
      <div className="cp-section-header">
        <span className="cp-section-icon">🔌</span>
        <span className="cp-section-title">Connections</span>
      </div>
      <div className="cp-status-grid">
        {services.map(svc => (
          <div key={svc.name} className="cp-status-item">
            <div className="cp-status-row">
              <span className="cp-status-name">{svc.name}</span>
              <span className={`cp-status-dot ${svc.online ? 'online' : 'offline'}`} />
            </div>
            <span className={`cp-status-label ${svc.online ? 'online' : 'offline'}`}>
              {svc.label}
            </span>
          </div>
        ))}
      </div>
      <button className="cp-btn" onClick={onRefresh} disabled={isChecking}>
        {isChecking ? 'Checking...' : 'Refresh Status'}
      </button>
    </div>
  );
};
