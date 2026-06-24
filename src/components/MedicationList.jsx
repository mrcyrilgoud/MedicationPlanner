import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Search, X } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import MedicationItem from './MedicationItem';
import MedicationEditForm from './MedicationEditForm';
import { calculateRunoutDate, getLowStockThresholdQuantity } from '../utils/calculations';
import { getInhalerUsageDisplay } from '../utils/calculations';
import { useToast } from '../context/ToastContext';

const FILTER_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'low', label: 'Low Stock' },
    { value: 'expiring', label: 'Expiring' },
    { value: 'projected', label: 'Refill Soon' }
];

const MedicationList = ({
    initialFilter = 'all',
    initialCondition = '',
    initialTag = '',
    initialLocation = '',
    initialMedicationId = '',
    onNavigate
}) => {
    const {
        activeMedications,
        batchStatsByMedication,
        consumeMedication,
        archiveMedication,
        editMedication,
        linkMedications,
        updateBatch,
        discardBatch,
        loading
    } = useInventory();
    const toast = useToast();
    const hasScrolledToInitial = useRef(false);

    const [expandedId, setExpandedId] = useState(initialMedicationId || null);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState(initialFilter);
    const [conditionFilter, setConditionFilter] = useState(initialCondition);
    const [tagFilter, setTagFilter] = useState(initialTag);
    const [locationFilter, setLocationFilter] = useState(initialLocation);
    const [sortBy, setSortBy] = useState('name');
    const [modalConfig, setModalConfig] = useState(null);
    const [editForm, setEditForm] = useState({});

    const confirmArchive = useCallback((medication) => {
        setModalConfig({
            title: 'Archive Medication?',
            message: `Archive ${medication.name}? Archived medications disappear from inventory but remain restorable in Settings.`,
            type: 'warning',
            confirmText: 'Archive',
            onConfirm: async () => {
                try {
                    await archiveMedication(medication.id, 'Archived from inventory');
                    toast.success(`${medication.name} archived.`);
                } catch (error) {
                    toast.error(error.message);
                    throw error;
                }
            }
        });
    }, [archiveMedication, toast]);

    const toggleExpand = useCallback((id) => {
        setExpandedId((prev) => (prev === id ? null : id));
    }, []);

    const startEditing = useCallback((event, medication) => {
        event.stopPropagation();
        setEditingId(medication.id);
        const inhalerUsage = getInhalerUsageDisplay(medication);
        setEditForm({
            name: medication.name,
            lowStockThreshold: medication.lowStockThreshold,
            usageRate: inhalerUsage.usageRate,
            usageFrequency: medication.usageFrequency || 'daily',
            usageBasis: inhalerUsage.usageBasis,
            notes: medication.notes || '',
            tags: medication.tags || [],
            images: medication.images || [],
            condition: medication.condition || ''
        });
    }, []);

    const cancelEditing = useCallback((event) => {
        if (event) event.stopPropagation();
        setEditingId(null);
        setEditForm({});
    }, []);

    const saveEditing = useCallback(async () => {
        const medication = activeMedications.find((item) => item.id === editingId);
        if (!medication) return;

        if (!editForm.name?.trim()) {
            toast.error('Medication name is required.');
            return;
        }

        try {
            await editMedication(editingId, {
                name: editForm.name,
                lowStockThreshold: Number(editForm.lowStockThreshold),
                ...(
                    editForm.usageRate
                        ? {
                            usageRate: medication.defaultUnit === 'inhaler' && editForm.usageBasis === 'container'
                                ? Number(editForm.usageRate) * (Number(medication.puffsPerCanister) || 200)
                                : Number(editForm.usageRate),
                            usageFrequency: editForm.usageFrequency
                        }
                        : { usageRate: null, usageFrequency: null }
                ),
                notes: editForm.notes,
                tags: editForm.tags,
                images: editForm.images,
                condition: editForm.condition
            }, 'Edited from inventory');
            toast.success('Medication updated.');
            setEditingId(null);
        } catch (error) {
            toast.error(error.message);
        }
    }, [activeMedications, editForm, editMedication, editingId, toast]);

    const handleLink = useCallback((targetId) => {
        setModalConfig({
            title: 'Group Medications',
            message: "Group this medication into the selected medication's group?",
            type: 'info',
            confirmText: 'Group',
            onConfirm: async () => {
                try {
                    await linkMedications(targetId, editingId);
                    toast.success('Medications grouped.');
                    setEditingId(null);
                } catch (error) {
                    toast.error(error.message);
                    throw error;
                }
            }
        });
    }, [editingId, linkMedications, toast]);

    const handleUngroup = useCallback(() => {
        setModalConfig({
            title: 'Ungroup Medication',
            message: 'Remove this medication from its current group?',
            type: 'warning',
            confirmText: 'Ungroup',
            onConfirm: async () => {
                try {
                    await editMedication(editingId, { groupId: editingId }, 'Ungrouped medication');
                    setEditingId(null);
                    toast.success('Medication ungrouped.');
                } catch (error) {
                    toast.error(error.message);
                    throw error;
                }
            }
        });
    }, [editMedication, editingId, toast]);

    const getMedStats = useCallback((medicationId) => (
        batchStatsByMedication[medicationId] || {
            totalQty: 0,
            availableQty: 0,
            nextExpiry: null,
            medBatches: [],
            locations: []
        }
    ), [batchStatsByMedication]);

    const conditionOptions = useMemo(() => (
        Array.from(new Set(activeMedications.map((medication) => medication.condition).filter(Boolean))).sort()
    ), [activeMedications]);

    const tagOptions = useMemo(() => (
        Array.from(new Set(activeMedications.flatMap((medication) => medication.tags || []))).sort()
    ), [activeMedications]);

    const locationOptions = useMemo(() => (
        Array.from(new Set(Object.values(batchStatsByMedication).flatMap((entry) => entry.locations || []))).sort()
    ), [batchStatsByMedication]);

    const groupedMedications = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        const filtered = activeMedications.filter((medication) => {
            if (normalizedSearch) {
                const values = [
                    medication.name,
                    medication.condition,
                    ...(medication.tags || [])
                ].filter(Boolean).map((value) => value.toLowerCase());
                if (!values.some((value) => value.includes(normalizedSearch))) {
                    return false;
                }
            }

            if (conditionFilter && medication.condition !== conditionFilter) return false;
            if (tagFilter && !(medication.tags || []).includes(tagFilter)) return false;
            if (locationFilter && !(getMedStats(medication.id).locations || []).includes(locationFilter)) return false;

            const { availableQty, nextExpiry } = getMedStats(medication.id);
            const lowThreshold = getLowStockThresholdQuantity(medication);
            if (statusFilter === 'low' && availableQty > lowThreshold) return false;
            if (statusFilter === 'expiring') {
                if (!nextExpiry) return false;
                const days = (nextExpiry - new Date()) / (1000 * 60 * 60 * 24);
                if (days >= 30) return false;
            }
            if (statusFilter === 'projected') {
                const runout = calculateRunoutDate(availableQty, medication.usageRate, medication.usageFrequency, lowThreshold);
                if (!runout || runout.daysUntilEmpty >= 14) return false;
            }
            return true;
        });

        const groups = filtered.reduce((map, medication) => {
            const key = medication.groupId || medication.id;
            if (!map[key]) map[key] = [];
            map[key].push(medication);
            return map;
        }, {});

        return Object.values(groups)
            .map((group) => group.sort((a, b) => a.name.localeCompare(b.name)))
            .sort((groupA, groupB) => {
                const groupStats = (group) => {
                    const totals = group.reduce((sum, medication) => sum + (getMedStats(medication.id).totalQty || 0), 0);
                    const expiryTimes = group
                        .map((medication) => getMedStats(medication.id).nextExpiry?.getTime() || Number.MAX_SAFE_INTEGER);
                    return { totals, earliestExpiry: Math.min(...expiryTimes) };
                };

                if (sortBy === 'stock') {
                    return groupStats(groupA).totals - groupStats(groupB).totals;
                }
                if (sortBy === 'expiry') {
                    return groupStats(groupA).earliestExpiry - groupStats(groupB).earliestExpiry;
                }
                if (sortBy === 'runout') {
                    const runoutA = calculateRunoutDate(
                        groupA.reduce((sum, medication) => sum + (getMedStats(medication.id).totalQty || 0), 0),
                        groupA[0].usageRate,
                        groupA[0].usageFrequency,
                        getLowStockThresholdQuantity(groupA[0])
                    );
                    const runoutB = calculateRunoutDate(
                        groupB.reduce((sum, medication) => sum + (getMedStats(medication.id).totalQty || 0), 0),
                        groupB[0].usageRate,
                        groupB[0].usageFrequency,
                        getLowStockThresholdQuantity(groupB[0])
                    );
                    return (runoutA?.daysUntilEmpty || Number.MAX_SAFE_INTEGER) - (runoutB?.daysUntilEmpty || Number.MAX_SAFE_INTEGER);
                }
                return groupA[0].name.localeCompare(groupB[0].name);
            });
    }, [activeMedications, conditionFilter, getMedStats, locationFilter, searchTerm, sortBy, statusFilter, tagFilter]);

    useEffect(() => {
        if (!initialMedicationId || hasScrolledToInitial.current) return;
        const node = document.getElementById(`med-item-${initialMedicationId}`);
        if (!node) return;
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        hasScrolledToInitial.current = true;
    }, [initialMedicationId, groupedMedications]);

    const handleConsume = async (medicationId, amount) => {
        try {
            await consumeMedication(medicationId, amount, 'Taken from inventory');
            toast.success('Medication consumed.');
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleBatchSave = async (batchId, updates) => {
        await updateBatch(batchId, updates, 'Updated batch from inventory');
    };

    const handleBatchDiscard = (batchId, medicationName) => {
        setModalConfig({
            title: 'Discard Batch?',
            message: `Discard this batch for ${medicationName}? This removes the batch and its remaining quantity from inventory.`,
            type: 'danger',
            confirmText: 'Discard Batch',
            onConfirm: async () => {
                try {
                    await discardBatch(batchId);
                    toast.success('Batch discarded.');
                } catch (error) {
                    toast.error(error.message);
                    throw error;
                }
            }
        });
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem 1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Loading inventory...
            </div>
        );
    }

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

            <div className="inventory-toolbar">
                <div className="inventory-search">
                    <Search size={20} className="inventory-search-icon" />
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search inventory..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                    {searchTerm && (
                        <button className="inventory-search-clear" onClick={() => setSearchTerm('')}>
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="filter-chip-row">
                    {FILTER_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={`filter-chip ${statusFilter === option.value ? 'active' : ''}`}
                            onClick={() => setStatusFilter(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                <div className="inventory-filter-grid">
                    <select className="form-input" value={conditionFilter} onChange={(event) => setConditionFilter(event.target.value)}>
                        <option value="">All conditions</option>
                        {conditionOptions.map((condition) => (
                            <option key={condition} value={condition}>{condition}</option>
                        ))}
                    </select>
                    <select className="form-input" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
                        <option value="">All tags</option>
                        {tagOptions.map((tag) => (
                            <option key={tag} value={tag}>{tag}</option>
                        ))}
                    </select>
                    <select className="form-input" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
                        <option value="">All locations</option>
                        {locationOptions.map((location) => (
                            <option key={location} value={location}>{location}</option>
                        ))}
                    </select>
                    <select className="form-input" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                        <option value="name">Sort: Name</option>
                        <option value="expiry">Sort: Soonest expiry</option>
                        <option value="stock">Sort: Lowest stock</option>
                        <option value="runout">Sort: Soonest runout</option>
                    </select>
                </div>
            </div>

            {groupedMedications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    {searchTerm ? 'No matches found.' : 'No medications match these filters.'}
                </div>
            ) : (
                <div className="medication-groups">
                    {groupedMedications.map((group) => {
                        const isGroup = group.length > 1;
                        const groupTotal = group.reduce((sum, medication) => sum + (getMedStats(medication.id).totalQty || 0), 0);
                        const nextExpiry = group
                            .map((medication) => getMedStats(medication.id).nextExpiry)
                            .filter(Boolean)
                            .sort((a, b) => a - b)[0];

                        return (
                            <div key={group[0].groupId || group[0].id} className={`med-group-container ${isGroup ? 'grouped' : ''}`}>
                                {isGroup && (
                                    <div className="group-summary-row">
                                        <div>
                                            <strong>{group[0].name}</strong>
                                            <span>{group.length} grouped medications</span>
                                        </div>
                                        <div>
                                            <strong>{groupTotal}</strong>
                                            <span>{nextExpiry ? `Next expiry ${nextExpiry.toLocaleDateString()}` : 'No valid expiry'}</span>
                                        </div>
                                    </div>
                                )}

                                {group.map((medication) => (
                                    <MedicationItem
                                        key={medication.id}
                                        itemId={`med-item-${medication.id}`}
                                        med={medication}
                                        isGroup={isGroup}
                                        medStats={getMedStats(medication.id)}
                                        isEditing={editingId === medication.id}
                                        onEditStart={startEditing}
                                        isExpanded={expandedId === medication.id}
                                        onToggleExpand={toggleExpand}
                                        onArchive={confirmArchive}
                                        onConsume={handleConsume}
                                        onQuickRestock={(medicationId) => onNavigate?.('add', { mode: 'restock', medicationId })}
                                        onAddToShopping={(medicationId) => onNavigate?.('shopping-list', { medicationId })}
                                        onBatchSave={handleBatchSave}
                                        onDiscardBatch={(batchId) => handleBatchDiscard(batchId, medication.name)}
                                    >
                                        {editingId === medication.id && (
                                            <MedicationEditForm
                                                med={medication}
                                                editForm={editForm}
                                                setEditForm={setEditForm}
                                                onSave={saveEditing}
                                                onCancel={cancelEditing}
                                                medications={activeMedications}
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
