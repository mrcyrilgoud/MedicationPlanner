import React from 'react';
import { Smartphone, Tablet, Monitor } from 'lucide-react';
import '../App.css';

const ModeSwitcher = ({ currentMode, onModeChange }) => {
    return (
        <div className="mode-switcher glass-panel">
            <button
                className={`mode-btn ${currentMode === 'phone' ? 'active' : ''}`}
                onClick={() => onModeChange('phone')}
                title="Phone View"
            >
                <Smartphone size={18} />
            </button>
            <button
                className={`mode-btn ${currentMode === 'tablet' ? 'active' : ''}`}
                onClick={() => onModeChange('tablet')}
                title="Tablet View"
            >
                <Tablet size={18} />
            </button>
            <button
                className={`mode-btn ${currentMode === 'computer' ? 'active' : ''}`}
                onClick={() => onModeChange('computer')}
                title="Computer View"
            >
                <Monitor size={18} />
            </button>
        </div>
    );
};

export default ModeSwitcher;
