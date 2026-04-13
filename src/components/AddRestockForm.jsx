import React, { useMemo, useState } from 'react';
import { ArrowRight, PackagePlus, PlusCircle, RotateCcw, Search, Sparkles } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { findBestMatch } from '../utils/drugAliases';
import { getLastBatchLocation, setLastBatchLocation } from '../utils/preferences';

const createEmptyMedicationState = () => ({
    name: '',
    unit: 'pills',
    puffsPerCanister: 200,
    threshold: 10,
    usageRate: '',
    usageFrequency: 'daily',
    usageBasis: 'base',
    notes: '',
    condition: '',
    tags: [],
    tagInput: ''
});

const createEmptyBatchState = () => ({
    quantity: 30,
    expiry: '',
    dosage: '',
    location: getLastBatchLocation(),
    notes: ''
});

const AddRestockForm = ({ initialMode = null, initialMedicationId = null, onComplete, onNavigate }) => {
    const {
        activeMedications,
        batchStatsByMedication,
        createMedicationWithBatch,
        addBatchToMedication
    } = useInventory();
    const toast = useToast();

    const [mode, setMode] = useState(initialMode);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMedicationId, setSelectedMedicationId] = useState(initialMedicationId);
    const [linkedGroup, setLinkedGroup] = useState(null);
    const [medForm, setMedForm] = useState(createEmptyMedicationState);
    const [batchForm, setBatchForm] = useState(createEmptyBatchState);

    const selectedMedication = useMemo(
        () => activeMedications.find((item) => item.id === selectedMedicationId) || null,
        [activeMedications, selectedMedicationId]
    );
    const searchValue = selectedMedication && !searchTerm ? selectedMedication.name : searchTerm;

    const suggestions = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return activeMedications.slice(0, 6);
        return activeMedications
            .filter((medication) => {
                const haystacks = [
                    medication.name,
                    medication.condition,
                    ...(medication.tags || [])
                ].filter(Boolean).map((value) => value.toLowerCase());
                return haystacks.some((value) => value.includes(term));
            })
            .slice(0, 8);
    }, [activeMedications, searchTerm]);

    const aliasMatch = useMemo(() => {
        if (mode !== 'create' || !medForm.name.trim()) return null;
        const best = findBestMatch(medForm.name);
        if (!best) return null;
        const match = activeMedications.find((medication) => medication.name.toLowerCase() === best.canonical.toLowerCase());
        return match ? { medication: match, canonical: best.canonical } : null;
    }, [activeMedications, medForm.name, mode]);

    const currentUnit = selectedMedication?.defaultUnit || medForm.unit;
    const currentStats = selectedMedication ? batchStatsByMedication[selectedMedication.id] : null;

    const updateMedForm = (key, value) => {
        setMedForm((prev) => ({ ...prev, [key]: value }));
    };

    const updateBatchForm = (key, value) => {
        setBatchForm((prev) => ({ ...prev, [key]: value }));
    };

    const resetBatchOnly = () => {
        setBatchForm(createEmptyBatchState());
    };

    const resetForAnother = (nextMode = mode) => {
        setMode(nextMode);
        setSearchTerm('');
        setSelectedMedicationId(null);
        setLinkedGroup(null);
        setMedForm(createEmptyMedicationState());
        setBatchForm(createEmptyBatchState());
    };

    const addTag = () => {
        const value = medForm.tagInput.trim();
        if (!value || medForm.tags.includes(value)) return;
        setMedForm((prev) => ({
            ...prev,
            tags: [...prev.tags, value],
            tagInput: ''
        }));
    };

    const handleSelectMedication = (medication) => {
        setSelectedMedicationId(medication.id);
        setSearchTerm(medication.name);
    };

    const buildQuantityToStore = (medication) => {
        const quantity = Number(batchForm.quantity);
        if (medication?.defaultUnit === 'inhaler') {
            return quantity * (Number(medication.puffsPerCanister) || 200);
        }
        if (!medication && medForm.unit === 'inhaler') {
            return quantity * (Number(medForm.puffsPerCanister) || 200);
        }
        return quantity;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const submitAction = event.nativeEvent?.submitter?.value || 'done';

        if (!batchForm.expiry) {
            toast.error('Add an expiration date before saving.');
            return;
        }
        if (Number(batchForm.quantity) <= 0) {
            toast.error('Quantity must be greater than 0.');
            return;
        }

        try {
            let resultingMedication = selectedMedication;

            if (mode === 'create') {
                if (!medForm.name.trim()) {
                    toast.error('Medication name is required.');
                    return;
                }

                const normalizedUsage = medForm.usageRate ? (
                    medForm.unit === 'inhaler' && medForm.usageBasis === 'container'
                        ? Number(medForm.usageRate) * (Number(medForm.puffsPerCanister) || 200)
                        : Number(medForm.usageRate)
                ) : null;

                const result = await createMedicationWithBatch({
                    medication: {
                        name: medForm.name.trim(),
                        defaultUnit: medForm.unit,
                        lowStockThreshold: Number(medForm.threshold),
                        usageRate: normalizedUsage,
                        usageFrequency: normalizedUsage ? medForm.usageFrequency : null,
                        notes: medForm.notes,
                        condition: medForm.condition,
                        puffsPerCanister: medForm.unit === 'inhaler' ? Number(medForm.puffsPerCanister) : null,
                        tags: medForm.tags,
                        groupId: linkedGroup ? (linkedGroup.groupId || linkedGroup.id) : undefined
                    },
                    batch: {
                        initialQuantity: buildQuantityToStore(null),
                        expiryDate: batchForm.expiry,
                        location: batchForm.location,
                        dosage: batchForm.dosage,
                        notes: batchForm.notes
                    },
                    note: 'Created from add flow'
                });
                resultingMedication = result.medication;
                toast.success(`${resultingMedication.name} created and stocked.`);
            } else if (mode === 'restock') {
                if (!selectedMedication) {
                    toast.error('Choose a medication to restock.');
                    return;
                }

                await addBatchToMedication({
                    medicationId: selectedMedication.id,
                    batch: {
                        initialQuantity: buildQuantityToStore(selectedMedication),
                        expiryDate: batchForm.expiry,
                        location: batchForm.location,
                        dosage: batchForm.dosage,
                        notes: batchForm.notes
                    },
                    note: 'Restocked from add flow'
                });
                toast.success(`Restocked ${selectedMedication.name}.`);
            } else {
                toast.error('Choose a workflow first.');
                return;
            }

            setLastBatchLocation(batchForm.location);

            if (submitAction === 'repeat') {
                if (resultingMedication) {
                    setMode('restock');
                    setSelectedMedicationId(resultingMedication.id);
                    setSearchTerm(resultingMedication.name);
                }
                resetBatchOnly();
                return;
            }

            if (submitAction === 'another') {
                resetForAnother(mode);
                return;
            }

            if (onComplete) {
                onComplete({
                    nextView: 'inventory',
                    params: { filter: 'all' }
                });
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    return (
        <div className="guided-form-shell">
            <div className="guided-form-header">
                <div>
                    <h2>Manage Stock</h2>
                    <p>Choose whether you are restocking something you already track or creating a new medication.</p>
                </div>
                <div className="guided-form-choice-row">
                    <button
                        type="button"
                        className={`guided-choice-card ${mode === 'restock' ? 'active' : ''}`}
                        onClick={() => setMode('restock')}
                    >
                        <PackagePlus size={18} />
                        <span>Restock Existing</span>
                    </button>
                    <button
                        type="button"
                        className={`guided-choice-card ${mode === 'create' ? 'active' : ''}`}
                        onClick={() => setMode('create')}
                    >
                        <PlusCircle size={18} />
                        <span>Create New</span>
                    </button>
                </div>
            </div>

            {!mode && (
                <div className="guided-empty-panel">
                    Choose a workflow to begin. Restock is fastest when you already have the medication in inventory.
                </div>
            )}

            {mode && (
                <form onSubmit={handleSubmit} className="guided-form">
                    <section className="guided-section">
                        <div className="guided-section-title">
                            <Sparkles size={16} />
                            <span>{mode === 'restock' ? 'Find Medication' : 'Medication Details'}</span>
                        </div>

                        {mode === 'restock' ? (
                            <>
                                <div className="guided-search-input">
                                    <Search size={18} />
                                    <input
                                        className="form-input"
                                        value={searchValue}
                                        onChange={(event) => {
                                            setSearchTerm(event.target.value);
                                            setSelectedMedicationId(null);
                                        }}
                                        placeholder="Search by name, tag, or condition..."
                                    />
                                </div>

                                <div className="autocomplete-list">
                                    {suggestions.map((medication) => {
                                        const stats = batchStatsByMedication[medication.id];
                                        return (
                                            <button
                                                key={medication.id}
                                                type="button"
                                                className={`autocomplete-item ${selectedMedicationId === medication.id ? 'active' : ''}`}
                                                onClick={() => handleSelectMedication(medication)}
                                            >
                                                <div>
                                                    <strong>{medication.name}</strong>
                                                    <span>{medication.condition || 'No condition set'}</span>
                                                </div>
                                                <span>{stats?.totalQty || 0} {medication.defaultUnit}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {selectedMedication && (
                                    <div className="guided-summary-card">
                                        <div>
                                            <h3>{selectedMedication.name}</h3>
                                            <p>
                                                Current stock: {currentStats?.totalQty || 0} {selectedMedication.defaultUnit}
                                                {selectedMedication.condition ? ` • ${selectedMedication.condition}` : ''}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn secondary"
                                            style={{ width: 'auto' }}
                                            onClick={() => onNavigate?.('inventory', { filter: 'all' })}
                                        >
                                            Open Inventory
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Medication Name</label>
                                    <input
                                        className="form-input"
                                        value={medForm.name}
                                        onChange={(event) => updateMedForm('name', event.target.value)}
                                        placeholder="e.g. Ibuprofen"
                                    />
                                </div>

                                {aliasMatch && !linkedGroup && (
                                    <div className="guided-summary-card">
                                        <div>
                                            <h3>Possible duplicate</h3>
                                            <p>{aliasMatch.medication.name} already exists for the same generic ingredient.</p>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn secondary"
                                            style={{ width: 'auto' }}
                                            onClick={() => setLinkedGroup(aliasMatch.medication)}
                                        >
                                            Group Them
                                        </button>
                                    </div>
                                )}

                                {linkedGroup && (
                                    <div className="guided-summary-card">
                                        <div>
                                            <h3>Grouped with {linkedGroup.name}</h3>
                                            <p>This new medication will share the same group as the existing record.</p>
                                        </div>
                                        <button type="button" className="btn secondary" style={{ width: 'auto' }} onClick={() => setLinkedGroup(null)}>
                                            Remove Link
                                        </button>
                                    </div>
                                )}

                                <div className="guided-two-column">
                                    <div className="form-group">
                                        <label className="form-label">Unit Type</label>
                                        <select className="form-input" value={medForm.unit} onChange={(event) => updateMedForm('unit', event.target.value)}>
                                            <option value="pills">Pills / Tablets</option>
                                            <option value="ml">Milliliters</option>
                                            <option value="grams">Grams</option>
                                            <option value="inhaler">Inhaler</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Low Stock Alert</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="form-input"
                                            value={medForm.threshold}
                                            onChange={(event) => updateMedForm('threshold', event.target.value)}
                                        />
                                    </div>
                                </div>

                                {medForm.unit === 'inhaler' && (
                                    <div className="form-group">
                                        <label className="form-label">Puffs per Canister</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="form-input"
                                            value={medForm.puffsPerCanister}
                                            onChange={(event) => updateMedForm('puffsPerCanister', event.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="guided-two-column">
                                    <div className="form-group">
                                        <label className="form-label">Usage Estimate</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="form-input"
                                            value={medForm.usageRate}
                                            onChange={(event) => updateMedForm('usageRate', event.target.value)}
                                            placeholder="Optional"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Frequency</label>
                                        <select
                                            className="form-input"
                                            value={medForm.usageFrequency}
                                            onChange={(event) => updateMedForm('usageFrequency', event.target.value)}
                                        >
                                            <option value="daily">Per day</option>
                                            <option value="weekly">Per week</option>
                                            <option value="monthly">Per month</option>
                                        </select>
                                    </div>
                                </div>

                                {medForm.unit === 'inhaler' && (
                                    <div className="form-group">
                                        <label className="form-label">Usage Basis</label>
                                        <select
                                            className="form-input"
                                            value={medForm.usageBasis}
                                            onChange={(event) => updateMedForm('usageBasis', event.target.value)}
                                        >
                                            <option value="base">Puffs</option>
                                            <option value="container">Canisters</option>
                                        </select>
                                    </div>
                                )}

                                <div className="guided-two-column">
                                    <div className="form-group">
                                        <label className="form-label">Condition / Purpose</label>
                                        <input
                                            className="form-input"
                                            value={medForm.condition}
                                            onChange={(event) => updateMedForm('condition', event.target.value)}
                                            placeholder="Optional"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Tags</label>
                                        <div className="tag-entry-row">
                                            <input
                                                className="form-input"
                                                value={medForm.tagInput}
                                                onChange={(event) => updateMedForm('tagInput', event.target.value)}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter') {
                                                        event.preventDefault();
                                                        addTag();
                                                    }
                                                }}
                                                placeholder="Press Enter to add"
                                            />
                                            <button type="button" className="btn secondary" style={{ width: 'auto' }} onClick={addTag}>
                                                Add
                                            </button>
                                        </div>
                                        {medForm.tags.length > 0 && (
                                            <div className="tag-pill-row">
                                                {medForm.tags.map((tag) => (
                                                    <button
                                                        key={tag}
                                                        type="button"
                                                        className="tag-pill"
                                                        onClick={() => updateMedForm('tags', medForm.tags.filter((item) => item !== tag))}
                                                    >
                                                        #{tag}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Medication Notes</label>
                                    <textarea
                                        className="form-input"
                                        rows={2}
                                        value={medForm.notes}
                                        onChange={(event) => updateMedForm('notes', event.target.value)}
                                        placeholder="Optional"
                                    />
                                </div>
                            </>
                        )}
                    </section>

                    <section className="guided-section">
                        <div className="guided-section-title">
                            <PackagePlus size={16} />
                            <span>{mode === 'restock' ? 'Restock Details' : 'Initial Stock'}</span>
                        </div>

                        <div className="guided-two-column">
                            <div className="form-group">
                                <label className="form-label">
                                    {currentUnit === 'inhaler' ? 'Canisters Added' : 'Quantity Added'}
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    className="form-input"
                                    value={batchForm.quantity}
                                    onChange={(event) => updateBatchForm('quantity', event.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Expiration Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={batchForm.expiry}
                                    onChange={(event) => updateBatchForm('expiry', event.target.value)}
                                />
                            </div>
                        </div>

                        <div className="guided-two-column">
                            <div className="form-group">
                                <label className="form-label">Storage Location</label>
                                <input
                                    className="form-input"
                                    value={batchForm.location}
                                    onChange={(event) => updateBatchForm('location', event.target.value)}
                                    placeholder="Cabinet, Pantry, Bag..."
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Dosage</label>
                                <input
                                    className="form-input"
                                    value={batchForm.dosage}
                                    onChange={(event) => updateBatchForm('dosage', event.target.value)}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Batch Notes</label>
                            <textarea
                                className="form-input"
                                rows={2}
                                value={batchForm.notes}
                                onChange={(event) => updateBatchForm('notes', event.target.value)}
                                placeholder="Optional"
                            />
                        </div>
                    </section>

                    <div className="guided-submit-row">
                        <button type="submit" value="done" className="btn primary">
                            Save
                            <ArrowRight size={16} />
                        </button>
                        <button type="submit" value="another" className="btn secondary">
                            Save & Add Another
                        </button>
                        <button type="submit" value="repeat" className="btn secondary">
                            <RotateCcw size={16} />
                            Restock Same Again
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default AddRestockForm;
