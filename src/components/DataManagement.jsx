import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Download,
    Upload,
    Database,
    AlertCircle,
    Smartphone,
    Tablet,
    Monitor,
    Sun,
    Moon,
    Sunrise,
    RefreshCcw,
    Trash2
} from 'lucide-react';
import '../App.css';
import './DataManagement.css';
import { useToast } from '../context/ToastContext';
import { useInventory } from '../context/InventoryContext';
import IconRadioGroup from './forms/IconRadioGroup';
import ConfirmationModal from './ConfirmationModal';

const DataManagement = ({
    currentMode,
    deviceModeOverride,
    onDeviceModePreferenceChange,
    currentTheme,
    onThemeChange
}) => {
    const {
        archivedMedications,
        getBackupData,
        analyzeBackup,
        importData,
        restoreMedication,
        permanentlyDeleteMedication,
        validateDataHealth
    } = useInventory();
    const fileInputRef = useRef(null);
    const toast = useToast();

    const [importMode, setImportMode] = useState('merge');
    const [pendingImport, setPendingImport] = useState(null);
    const [importPreview, setImportPreview] = useState(null);
    const [dataHealth, setDataHealth] = useState(null);
    const [applyPreferencesFromBackup, setApplyPreferencesFromBackup] = useState(false);
    const [modalConfig, setModalConfig] = useState(null);

    const refreshHealth = async () => {
        const health = await validateDataHealth();
        setDataHealth(health);
    };

    useEffect(() => {
        let active = true;
        (async () => {
            const health = await validateDataHealth();
            if (active) {
                setDataHealth(health);
            }
        })();
        return () => {
            active = false;
        };
    }, [validateDataHealth]);

    useEffect(() => {
        const previewImport = async () => {
            if (!pendingImport) {
                setImportPreview(null);
                return;
            }
            try {
                const preview = await analyzeBackup(pendingImport, importMode);
                setImportPreview(preview);
            } catch (error) {
                toast.error(error.message);
                setImportPreview(null);
            }
        };

        previewImport();
    }, [analyzeBackup, importMode, pendingImport, toast]);

    const handleExport = async () => {
        try {
            const data = await getBackupData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `medication-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
            toast.success('Backup downloaded.');
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (loadEvent) => {
            try {
                const json = JSON.parse(loadEvent.target.result);
                setPendingImport(json);
            } catch (error) {
                console.error(error);
                setPendingImport(null);
                setImportPreview(null);
                toast.error('Invalid JSON file');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleApplyImport = async () => {
        if (!pendingImport) return;

        if (importMode === 'replace') {
            setModalConfig({
                title: 'Replace All Inventory Data?',
                message: 'This permanently clears your current medications, batches, and history, then restores the selected backup. Export a fresh backup first if you need a copy of today\'s data.',
                type: 'danger',
                confirmText: 'Replace Everything',
                onConfirm: async () => {
                    try {
                        await importData({
                            backup: pendingImport,
                            mode: importMode,
                            applyPreferences: applyPreferencesFromBackup
                        });
                        toast.success('Replaced backup successfully.');
                        setPendingImport(null);
                        setImportPreview(null);
                        refreshHealth();
                    } catch (error) {
                        toast.error(error.message);
                        throw error;
                    }
                }
            });
            return;
        }

        try {
            await importData({
                backup: pendingImport,
                mode: importMode,
                applyPreferences: applyPreferencesFromBackup
            });
            toast.success('Merged backup successfully.');
            setPendingImport(null);
            setImportPreview(null);
            refreshHealth();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleRestoreMedication = async (medicationId) => {
        try {
            await restoreMedication(medicationId, 'Restored from settings');
            toast.success('Medication restored.');
            refreshHealth();
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handlePermanentDelete = (medicationId, medicationName) => {
        setModalConfig({
            title: 'Delete Permanently?',
            message: `Permanently delete ${medicationName}? This removes all batches and cannot be undone.`,
            type: 'danger',
            confirmText: 'Delete Forever',
            onConfirm: async () => {
                try {
                    await permanentlyDeleteMedication(medicationId, 'Deleted permanently from settings');
                    toast.success('Medication deleted permanently.');
                    refreshHealth();
                } catch (error) {
                    toast.error(error.message);
                    throw error;
                }
            }
        });
    };

    const viewOptions = [
        { value: 'auto', label: 'Auto Layout', icon: <Monitor size={18} /> },
        { value: 'phone', label: 'Phone Preview', icon: <Smartphone size={18} /> },
        { value: 'tablet', label: 'Tablet Preview', icon: <Tablet size={18} /> },
        { value: 'computer', label: 'Desktop Preview', icon: <Monitor size={18} /> }
    ];

    const themeOptions = [
        { value: 'light', label: 'Light Mode', icon: <Sun size={18} /> },
        { value: 'blue', label: 'Twilight Mode', icon: <Sunrise size={18} /> },
        { value: 'dark', label: 'Dark Mode', icon: <Moon size={18} /> }
    ];

    const healthSummary = useMemo(() => ([
        { label: 'Archived medications', value: dataHealth?.archivedCount || 0 },
        { label: 'Orphaned batches', value: dataHealth?.orphanedBatches?.length || 0 },
        { label: 'Invalid expiry dates', value: dataHealth?.invalidExpiryBatches?.length || 0 },
        { label: 'Missing usage estimates', value: dataHealth?.missingUsageMedications?.length || 0 },
        { label: 'Duplicate medication names', value: dataHealth?.duplicateMedicationNames?.length || 0 }
    ]), [dataHealth]);

    return (
        <div className="data-management-container">
            <ConfirmationModal
                isOpen={!!modalConfig}
                onClose={() => setModalConfig(null)}
                onConfirm={modalConfig?.onConfirm}
                title={modalConfig?.title}
                message={modalConfig?.message}
                type={modalConfig?.type}
                confirmText={modalConfig?.confirmText}
            />

            <h2 className="dm-header">
                <Database /> Data Management
            </h2>

            <div className="dm-card">
                <h3>App Preferences</h3>
                <p>Current layout: <strong>{currentMode}</strong>. Use layout preview only when you want to override automatic sizing.</p>

                <div className="dm-grid">
                    <IconRadioGroup
                        label="Layout Mode"
                        options={viewOptions}
                        value={deviceModeOverride}
                        onChange={onDeviceModePreferenceChange}
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
                <p>Download a full backup of medications, batches, history, and local preferences.</p>
                <button className="btn primary btn-icon" onClick={handleExport}>
                    <Download size={18} />
                    Download Backup
                </button>
            </div>

            <div className="dm-card">
                <h3>Restore Backup</h3>
                <p>Preview the import before committing changes. Merge keeps current records. Replace clears current records first.</p>

                <div className="dm-grid">
                    <label className="import-mode-card">
                        <input type="radio" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} />
                        <span>Merge</span>
                    </label>
                    <label className="import-mode-card">
                        <input type="radio" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} />
                        <span>Replace</span>
                    </label>
                    <label className="import-mode-card">
                        <input type="radio" checked={importMode === 'preview-only'} onChange={() => setImportMode('preview-only')} />
                        <span>Preview Only</span>
                    </label>
                </div>

                <div className="restore-warning">
                    <AlertCircle size={20} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>Duplicate medication names and ID conflicts are skipped in merge mode. Orphaned batches and invalid expiry dates are rejected.</span>
                </div>

                <label className="import-mode-card" style={{ marginTop: '0.75rem' }}>
                    <input
                        type="checkbox"
                        checked={applyPreferencesFromBackup}
                        onChange={(event) => setApplyPreferencesFromBackup(event.target.checked)}
                    />
                    <span>Also apply theme, layout, and location preferences from backup</span>
                </label>

                <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
                <button className="btn secondary btn-icon" onClick={handleImportClick}>
                    <Upload size={18} />
                    Select Backup
                </button>

                {importPreview && (
                    <div className="dm-preview-card">
                        <h4>Import Preview</h4>
                        <div className="dm-preview-grid">
                            <span>Create meds: {importPreview.summary.medicationsToCreate}</span>
                            <span>Update meds: {importPreview.summary.medicationsToUpdate}</span>
                            <span>Import batches: {importPreview.summary.batchesToImport}</span>
                            <span>Import history: {importPreview.summary.historyToImport}</span>
                            <span>Skipped meds: {importPreview.summary.skippedMedications}</span>
                            <span>Skipped batches: {importPreview.summary.skippedBatches}</span>
                            <span>Skipped history: {importPreview.summary.skippedHistory || 0}</span>
                        </div>

                        <div className="dm-issue-list">
                            {importPreview.issues.duplicateNameSkips?.length > 0 && (
                                <p>Duplicate names skipped: {importPreview.issues.duplicateNameSkips.map((item) => item.name).join(', ')}</p>
                            )}
                            {importPreview.issues.idCollisions?.length > 0 && (
                                <p>ID conflicts skipped: {importPreview.issues.idCollisions.map((item) => item.name).join(', ')}</p>
                            )}
                            {importPreview.issues.skippedBatches?.length > 0 && (
                                <p>Skipped batches: {importPreview.issues.skippedBatches.length}</p>
                            )}
                            {importPreview.issues.skippedHistoryEntries?.length > 0 && (
                                <p>Skipped history entries: {importPreview.issues.skippedHistoryEntries.length}</p>
                            )}
                        </div>

                        {importMode !== 'preview-only' && (
                            <button className="btn primary" onClick={handleApplyImport}>
                                Apply {importMode === 'replace' ? 'Replace' : 'Merge'}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="dm-card">
                <div className="dm-card-header-row">
                    <div>
                        <h3>Data Health</h3>
                        <p>Check for malformed inventory records before they surprise you later.</p>
                    </div>
                    <button className="btn secondary btn-icon" style={{ width: 'auto' }} onClick={refreshHealth}>
                        <RefreshCcw size={16} />
                        Refresh
                    </button>
                </div>

                <div className="dm-health-grid">
                    {healthSummary.map((item) => (
                        <div key={item.label} className="dm-health-card">
                            <strong>{item.value}</strong>
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>

                {dataHealth && (
                    <div className="dm-issue-list">
                        {dataHealth.orphanedBatches.length > 0 && <p>Orphaned batches: {dataHealth.orphanedBatches.length}</p>}
                        {dataHealth.invalidExpiryBatches.length > 0 && <p>Invalid expiry dates: {dataHealth.invalidExpiryBatches.length}</p>}
                        {dataHealth.missingUsageMedications.length > 0 && (
                            <p>Missing usage estimates: {dataHealth.missingUsageMedications.map((item) => item.name).join(', ')}</p>
                        )}
                        {dataHealth.duplicateMedicationNames.length > 0 && (
                            <p>Duplicate names: {dataHealth.duplicateMedicationNames.map((item) => item.name).join(', ')}</p>
                        )}
                    </div>
                )}
            </div>

            <div className="dm-card">
                <h3>Archived Medications</h3>
                <p>Archived medications stay out of daily views but can be restored any time.</p>

                {archivedMedications.length === 0 ? (
                    <div className="dm-empty-state">No archived medications.</div>
                ) : (
                    <div className="dm-archive-list">
                        {archivedMedications.map((medication) => (
                            <div key={medication.id} className="dm-archive-item">
                                <div>
                                    <strong>{medication.name}</strong>
                                    <span>{medication.archivedAt ? `Archived ${new Date(medication.archivedAt).toLocaleDateString()}` : 'Archived'}</span>
                                </div>
                                <div className="dm-archive-actions">
                                    <button className="btn secondary" style={{ width: 'auto' }} onClick={() => handleRestoreMedication(medication.id)}>
                                        Restore
                                    </button>
                                    <button className="btn danger" style={{ width: 'auto' }} onClick={() => handlePermanentDelete(medication.id, medication.name)}>
                                        <Trash2 size={14} />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataManagement;
