import React from 'react';
import { useDebugStore } from '../store/debugStore';
import './DebugLog.css';

const DebugLog: React.FC = () => {
    const { logs, isVisible, toggleVisibility, clearLogs } = useDebugStore();

    if (!isVisible) {
        return (
            <button className="debug-toggle-btn" onClick={toggleVisibility}>
                🐞 Debug Logs
            </button>
        );
    }

    return (
        <div className="debug-log-panel">
            <div className="debug-log-header">
                <h3>🚀 System Debug Log</h3>
                <div className="debug-actions">
                    <button onClick={clearLogs}>Clear</button>
                    <button onClick={toggleVisibility}>Close</button>
                </div>
            </div>
            <div className="debug-log-content">
                {logs.length === 0 ? (
                    <div className="no-logs">No logs captured yet...</div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className={`log-entry ${log.level}`}>
                            <span className="log-time">[{log.timestamp}]</span>
                            <span className="log-source">[{log.source}]</span>
                            <span className="log-message">{log.message}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DebugLog;
