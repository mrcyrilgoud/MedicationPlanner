import React, { useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Download, Upload, Database, AlertCircle, Smartphone, Tablet, Monitor, Sun, Moon, Sunrise } from 'lucide-react';
import '../App.css'; // Ensure mode-btn styles are available
import { useToast } from '../context/ToastContext';

const DataManagement = ({ currentMode, onModeChange, currentTheme, onThemeChange }) => {
    const { medications, batches, importData } = useInventory();
    const fileInputRef = useRef(null);
    const toast = useToast();

    const handleExport = () => {
        const data = {
            medications,
            batches,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medication-inventory-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Backup downloaded!');
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                if (window.confirm(`Found ${json.medications?.length || 0} medications in backup. Import and merge?`)) {
                    importData(json);
                }
            } catch (err) {
                console.error(err);
                toast.error('Invalid JSON file');
            }
        };
        reader.readAsText(file);
        // Reset input so same file can be selected again if needed
        e.target.value = '';
    };

    return (
        <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                <Database /> Data Management
            </h2>


            {/* Appearance Section */}
            <div className="card" style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                marginBottom: '1rem'
            }}>
                <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>App Preferences</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Customize the look and feel of the application.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                    {/* View Mode */}
                    <div>
                        <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>View Layout</label>
                        <div className="glass-panel" style={{ display: 'inline-flex', padding: 4, gap: 4 }}>
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
                    </div>

                    {/* Theme */}
                    <div>
                        <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>Theme</label>
                        <div className="glass-panel" style={{ display: 'inline-flex', padding: 4, gap: 4 }}>
                            <button
                                className={`mode-btn ${currentTheme === 'light' ? 'active' : ''}`}
                                onClick={() => onThemeChange('light')}
                                title="Light Mode"
                            >
                                <Sun size={18} />
                            </button>
                            <button
                                className={`mode-btn ${currentTheme === 'blue' ? 'active' : ''}`}
                                onClick={() => onThemeChange('blue')}
                                title="Twilight Mode"
                            >
                                <Sunrise size={18} />
                            </button>
                            <button
                                className={`mode-btn ${currentTheme === 'dark' ? 'active' : ''}`}
                                onClick={() => onThemeChange('dark')}
                                title="Dark Mode"
                            >
                                <Moon size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="card" style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                marginBottom: '1rem'
            }}>
                <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Backup Inventory</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Download a copy of your entire medication inventory and history.
                    Keep this file safe to prevent data loss.
                </p>
                <button className="btn primary" onClick={handleExport} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Download size={18} />
                    Download JSON Backup
                </button>
            </div>

            <div className="card" style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
            }}>
                <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Restore Backup</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    Import a previously saved backup file. This will merge with your current data.
                </p>

                <div style={{
                    padding: '1rem',
                    background: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    borderRadius: '6px',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'start'
                }}>
                    <AlertCircle size={20} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        Existing items with the same ID will be updated. New items will be added.
                    </span>
                </div>

                <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
                <button className="btn secondary" onClick={handleImportClick} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Upload size={18} />
                    Select & Import File
                </button>
            </div>
        </div >
    );
};

export default DataManagement;
