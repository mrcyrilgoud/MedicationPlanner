import React, { useCallback, useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Search, X } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import MedicationItem from './MedicationItem';
import MedicationEditForm from './MedicationEditForm';
import { calculateRunoutDate } from '../utils/calculations';

const MedicationList = ({ filter }) => {
    const { medications, batchStatsByMedication, consumeMedication, deleteMedication, editMedication, linkMedications } = useInventory();
    const [expandedId, setExpandedId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [modalConfig, setModalConfig] = useState(null);

    // Edit State
    const [editForm, setEditForm] = useState({});

    // --- Actions ---

    const confirmDelete = useCallback((med, totalQty) => {
        setModalConfig({
            title: 'Delete Medication?',
            message: totalQty > 0
                ? `WARNING: This medication has ${totalQty} units remaining. Deleting it will remove all stock history.`
                : `Are you sure you want to delete ${med.name}?`,
            type: 'danger',
            confirmText: 'Delete Forever',
            onConfirm: () => deleteMedication(med.id)
        });
    }, [deleteMedication]);

    const toggleExpand = useCallback((id) => {
        setExpandedId(prev => (prev === id ? null : id));
    }, []);

    const startEditing = useCallback((e, med) => {
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
    }, []);

    const cancelEditing = useCallback((e) => {
        if (e) e.stopPropagation();
        setEditingId(null);
        setEditForm({});
    }, []);

    const saveEditing = useCallback(() => {
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
    }, [editForm, editMedication, editingId, medications]);

    const handleLink = useCallback((targetId) => {
        setModalConfig({
            title: 'Group Medications',
            message: "Group this into the selected medication's group?",
            type: 'info',
            confirmText: 'Group',
            onConfirm: () => {
                linkMedications(targetId, editingId);
                setEditingId(null);
            }
        });
    }, [editingId, linkMedications]);

    const handleUngroup = useCallback(() => {
        setModalConfig({
            title: 'Ungroup Medication',
            message: "Remove this medication from its group?",
            type: 'warning',
            confirmText: 'Ungroup',
            onConfirm: () => {
                editMedication(editingId, { groupId: editingId });
                setEditingId(null);
            }
        });
    }, [editMedication, editingId]);

    const getMedStats = useCallback((medId) => (
        batchStatsByMedication[medId] || { totalQty: 0, nextExpiry: null, medBatches: [] }
    ), [batchStatsByMedication]);

    const groupedMedications = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        const filtered = medications.filter(med => {
            if (normalizedSearch && !med.name.toLowerCase().includes(normalizedSearch)) {
                const hasTag = med.tags && med.tags.some(t => t.toLowerCase().includes(normalizedSearch));
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
    }, [medications, searchTerm, filter, getMedStats]);

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
                <div className="medication-groups">
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
                                        onConsume={consumeMedication}
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
