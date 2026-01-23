import React, { useState } from 'react';
import { Settings, Sun, Moon, Sunrise, Smartphone, Tablet, Monitor, X, Minimize2, Maximize2 } from 'lucide-react';

const ModeSwitcher = ({ currentMode, onModeChange, currentTheme, onThemeChange, onOpenSettings }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    if (isMinimized) {
        return (
            <button
                onClick={() => setIsMinimized(false)}
                className="mode-btn"
                style={{
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '50%',
                    width: 40,
                    height: 40,
                    color: 'var(--text-secondary)'
                }}
            >
                <Maximize2 size={18} />
            </button>
        );
    }

    /* If not open, just show Gear Icon */
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="mode-btn"
                style={{
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '50%',
                    width: 44,
                    height: 44,
                    color: 'var(--primary)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
            >
                <Settings size={22} />
            </button>
        );
    }

    return (
        <div style={{
            background: 'rgba(24, 24, 27, 0.9)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--glass-border)',
            padding: '16px',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minWidth: '200px',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Display</span>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setIsMinimized(true)} className="mode-btn" style={{ padding: 4 }}><Minimize2 size={14} /></button>
                    <button onClick={() => setIsOpen(false)} className="mode-btn" style={{ padding: 4 }}><X size={14} /></button>
                </div>
            </div>

            {/* Mode Toggles */}
            <div className="glass-panel" style={{ display: 'flex', padding: 4, gap: 4, borderRadius: 8 }}>
                <button
                    className={`mode-btn ${currentMode === 'phone' ? 'active' : ''}`}
                    onClick={() => onModeChange('phone')}
                    title="Phone View"
                    style={{ flex: 1 }}
                >
                    <Smartphone size={16} style={{ marginRight: 6 }} />
                    <span style={{ fontSize: '0.8rem' }}>Phone</span>
                </button>
                <button
                    className={`mode-btn ${currentMode === 'tablet' ? 'active' : ''}`}
                    onClick={() => onModeChange('tablet')}
                    title="Tablet View"
                    style={{ flex: 1 }}
                >
                    <Tablet size={16} />
                </button>
                <button
                    className={`mode-btn ${currentMode === 'computer' ? 'active' : ''}`}
                    onClick={() => onModeChange('computer')}
                    title="Computer View"
                    style={{ flex: 1 }}
                >
                    <Monitor size={16} />
                </button>
            </div>

            <div style={{ height: 1, background: 'var(--border-color)' }}></div>

            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Theme</span>

            {/* Theme Toggles */}
            <div className="glass-panel" style={{ display: 'flex', padding: 4, gap: 4, borderRadius: 8 }}>
                <button
                    className={`mode-btn ${currentTheme === 'light' ? 'active' : ''}`}
                    onClick={() => onThemeChange('light')}
                    title="Light"
                    style={{ flex: 1 }}
                >
                    <Sun size={16} style={{ marginRight: 6 }} />
                    <span style={{ fontSize: '0.8rem' }}>Light</span>
                </button>
                <button
                    className={`mode-btn ${currentTheme === 'blue' ? 'active' : ''}`}
                    onClick={() => onThemeChange('blue')}
                    title="Blue"
                    style={{ flex: 1 }}
                >
                    <Sunrise size={16} />
                </button>
                <button
                    className={`mode-btn ${currentTheme === 'dark' ? 'active' : ''}`}
                    onClick={() => onThemeChange('dark')}
                    title="Dark"
                    style={{ flex: 1 }}
                >
                    <Moon size={16} />
                </button>
            </div>

            <div style={{ height: 1, background: 'var(--border-color)' }}></div>

            <button
                className="btn secondary"
                onClick={() => {
                    setIsOpen(false);
                    if (onOpenSettings) onOpenSettings();
                }}
                style={{ marginTop: 0, padding: '10px', fontSize: '0.9rem' }}
            >
                <Settings size={16} style={{ marginRight: 8 }} />
                More Settings
            </button>
        </div>
    );
};

export default ModeSwitcher;
