import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

const Toast = ({ message, type = 'info', onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  const startExit = React.useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => {
      startExit();
    }, 3000);

    return () => clearTimeout(timer);
  }, [startExit]);

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle size={20} />;
      case 'warning': return <AlertTriangle size={20} />;
      case 'error': return <AlertOctagon size={20} />;
      default: return <Info size={20} />;
    }
  };

  const colors = {
    success: 'var(--success)',
    warning: 'var(--warning)',
    error: 'var(--danger)',
    info: 'var(--primary)'
  };

  return (
    <div
      className={`toast-item ${isExiting ? 'exit' : 'enter'}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px',
        background: 'rgba(24, 26, 32, 0.95)',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${colors[type] || colors.info}`,
        borderLeft: `4px solid ${colors[type] || colors.info}`,
        borderRadius: '8px',
        color: 'white',
        minWidth: '300px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        marginBottom: '10px',
        animation: isExiting ? 'slideOut 0.3s forwards' : 'slideIn 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
        pointerEvents: 'auto'
      }}
    >
      <div style={{ color: colors[type] || colors.info }}>
        {getIcon()}
      </div>
      <span style={{ flex: 1, fontSize: '0.95rem' }}>{message}</span>
      <button
        onClick={startExit}
        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
