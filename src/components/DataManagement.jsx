import React, { useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Download, Upload, Database, AlertCircle, Smartphone, Tablet, Monitor, Sun, Moon, Sunrise } from 'lucide-react';
import '../App.css';
import './DataManagement.css';
import { useToast } from '../context/ToastContext';
import IconRadioGroup from './forms/IconRadioGroup';

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

    const viewOptions = [
        { value: 'phone', label: 'Phone View', icon: <Smartphone size={18} /> },
        { value: 'tablet', label: 'Tablet View', icon: <Tablet size={18} /> },
        { value: 'computer', label: 'Computer View', icon: <Monitor size={18} /> }
    ];

    const themeOptions = [
        { value: 'light', label: 'Light Mode', icon: <Sun size={18} /> },
        { value: 'blue', label: 'Twilight Mode', icon: <Sunrise size={18} /> },
        { value: 'dark', label: 'Dark Mode', icon: <Moon size={18} /> }
    ];

    return (
        <div className="data-management-container">
            <h2 className="dm-header">
                <Database /> Data Management
            </h2>

            {/* Appearance Section */}
            <div className="dm-card">
                <h3>App Preferences</h3>
                <p>Customize the look and feel of the application.</p>

                <div className="dm-grid">
                    <IconRadioGroup
                        label="View Layout"
                        options={viewOptions}
                        value={currentMode}
                        onChange={onModeChange}
                    />
                    <IconRadioGroup
                        label="Theme"
                        options={themeOptions}
                        value={currentTheme}
                        onChange={onThemeChange}
                    />
                </div>
            </div>

            <div className="dm-card">
                <h3>Backup Inventory</h3>
                <p>
                    Download a copy of your entire medication inventory and history.
                    Keep this file safe to prevent data loss.
                </p>
                <button className="btn primary btn-icon" onClick={handleExport}>
                    <Download size={18} />
                    Download JSON Backup
                </button>
            </div>

            <div className="dm-card">
                <h3>Restore Backup</h3>
                <p>
                    Import a previously saved backup file. This will merge with your current data.
                </p>

                <div className="restore-warning">
                    <AlertCircle size={20} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
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
                <button className="btn secondary btn-icon" onClick={handleImportClick}>
                    <Upload size={18} />
                    Select & Import File
                </button>
            </div>
        </div >
    );
};

export default DataManagement;
