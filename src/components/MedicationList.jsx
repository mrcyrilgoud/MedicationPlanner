import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { Search, X } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import MedicationItem from './MedicationItem';
import MedicationEditForm from './MedicationEditForm';
import { resizeImage } from '../utils/imageHelpers';
import { calculateRunoutDate } from '../utils/calculations';

const MedicationList = ({ filter }) => {
    const { medications, batches, deleteMedication, editMedication, linkMedications } = useInventory();
    const toast = useToast();
    const [expandedId, setExpandedId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [modalConfig, setModalConfig] = useState(null);

    // Edit State
    const [editForm, setEditForm] = useState({});

    // --- Actions ---

    const confirmDelete = (med, totalQty) => {
        setModalConfig({
            title: 'Delete Medication?',
            message: totalQty > 0
                ? `WARNING: This medication has ${totalQty} units remaining. Deleting it will remove all stock history.`
                : `Are you sure you want to delete ${med.name}?`,
            type: 'danger',
            confirmText: 'Delete Forever',
            onConfirm: () => deleteMedication(med.id)
        });
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const startEditing = (e, med) => {
        e.stopPropagation();
        setEditingId(med.id);
        setEditForm({
            name: med.name,
            lowStockThreshold: med.lowStockThreshold,
            usageRate: med.usageRate || '',
            usageFrequency: med.usageFrequency || 'daily',
            usageBasis: 'base',
            notes: med.notes || '',
            tags: med.tags || [],
            images: med.images || [],
            condition: med.condition || ''
        });
    };

    const cancelEditing = (e) => {
        if (e) e.stopPropagation();
        setEditingId(null);
        setEditForm({});
    };

    const saveEditing = () => {
        const med = medications.find(m => m.id === editingId);
        if (!med) return;

        editMedication(editingId, {
            name: editForm.name,
            lowStockThreshold: Number(editForm.lowStockThreshold),
            usageRate: editForm.usageRate ? (
                med.defaultUnit === 'inhaler' && editForm.usageBasis === 'container'
                    ? Number(editForm.usageRate) * (Number(med.puffsPerCanister) || 200)
                    : Number(editForm.usageRate)
            ) : null,
            usageFrequency: editForm.usageRate ? editForm.usageFrequency : null,
            notes: editForm.notes,
            tags: editForm.tags,
            images: editForm.images,
            condition: editForm.condition
        });
        setEditingId(null);
    };

    const handleLink = (targetId) => {
        if (window.confirm(`Group into the selected medication's group?`)) {
            linkMedications(targetId, editingId);
            setEditingId(null);
        }
    };

    const handleUngroup = () => {
        if (window.confirm("Ungroup this medication?")) {
            editMedication(editingId, { groupId: editingId });
            setEditingId(null);
        }
    };

    // --- Stats & Grouping ---

    const medStats = useMemo(() => {
        const stats = {};
        medications.forEach(med => {
            stats[med.id] = { totalQty: 0, nextExpiry: null, medBatches: [] };
        });

        batches.forEach(batch => {
            if (stats[batch.medicationId]) {
                const entry = stats[batch.medicationId];
                entry.medBatches.push(batch);
                entry.totalQty += batch.currentQuantity;

                if (batch.currentQuantity > 0) {
                    const expDate = new Date(batch.expiryDate + 'T00:00');
                    if (!entry.nextExpiry || expDate < entry.nextExpiry) {
                        entry.nextExpiry = expDate;
                    }
                }
            }
        });
        return stats;
    }, [medications, batches]);

    const getMedStats = (medId) => medStats[medId] || { totalQty: 0, nextExpiry: null, medBatches: [] };

    const groupedMedications = useMemo(() => {
        const filtered = medications.filter(med => {
            if (searchTerm && !med.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                const hasTag = med.tags && med.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
                if (!hasTag) return false;
            }

            if (!filter) return true;

            const { totalQty, nextExpiry } = getMedStats(med.id);

            if (filter === 'low') return totalQty <= med.lowStockThreshold;
            if (filter === 'expiring') return nextExpiry && ((nextExpiry - new Date()) / (1000 * 60 * 60 * 24) < 30);

            if (filter === 'projected') {
                const runout = calculateRunoutDate(totalQty, med.usageRate, med.usageFrequency, med.lowStockThreshold);
                return runout && runout.daysUntilEmpty < 7;
            }

            return true;
        });

        const groups = {};
        filtered.forEach(med => {
            const gid = med.groupId || med.id;
            if (!groups[gid]) groups[gid] = [];
            groups[gid].push(med);
        });

        const result = [];
        Object.values(groups).forEach(group => {
            if (group.length === 0) return;
            group.sort((a, b) => a.name.localeCompare(b.name));
            result.push(group);
        });

        result.sort((a, b) => a[0].name.localeCompare(b[0].name));
        return result;
    }, [medications, searchTerm, filter, medStats]);

    return (
        <div className="medication-list">
            <ConfirmationModal
                isOpen={!!modalConfig}
                onClose={() => setModalConfig(null)}
                onConfirm={modalConfig?.onConfirm}
                title={modalConfig?.title}
                message={modalConfig?.message}
                type={modalConfig?.type}
                confirmText={modalConfig?.confirmText}
            />

            {/* Search Bar */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <Search size={20} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                    type="text"
                    className="form-input"
                    placeholder="Search inventory..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: 40, width: '100%' }}
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {groupedMedications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    {searchTerm ? 'No matches found.' : 'No medications found. Add some!'}
                </div>
            ) : (
                <div className="medication-groups" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {groupedMedications.map(group => {
                        const isGroup = group.length > 1;
                        return (
                            <div key={group[0].groupId || group[0].id} className={`med-group-container ${isGroup ? 'grouped' : ''}`}>
                                {group.map(med => (
                                    <MedicationItem
                                        key={med.id}
                                        med={med}
                                        isGroup={isGroup}
                                        medStats={getMedStats(med.id)}
                                        isEditing={editingId === med.id}
                                        onEditStart={startEditing}
                                        isExpanded={expandedId === med.id}
                                        onToggleExpand={toggleExpand}
                                        onDelete={confirmDelete}
                                    >
                                        {/* Pass Edit Form as Child */}
                                        {editingId === med.id && (
                                            <MedicationEditForm
                                                med={med}
                                                editForm={editForm}
                                                setEditForm={setEditForm}
                                                onSave={saveEditing}
                                                onCancel={cancelEditing}
                                                medications={medications}
                                                onLink={handleLink}
                                                onUngroup={handleUngroup}
                                            />
                                        )}
                                    </MedicationItem>
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MedicationList;

