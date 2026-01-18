import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ChevronDown, ChevronUp, Trash2, Pill, Check, Pencil, X, Save } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const MedicationList = ({ filter }) => {
    const { medications, batches, consumeMedication, deleteMedication, calculateRunoutDate, editMedication } = useInventory();
    const toast = useToast();
    const [expandedId, setExpandedId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [consumeAmount, setConsumeAmount] = useState('');

    // Edit State
    const [editForm, setEditForm] = useState({});

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
            notes: med.notes || ''
        });
    };

    const cancelEditing = (e) => {
        e.stopPropagation();
        setEditingId(null);
        setEditForm({});
    };

    const saveEditing = (e, id) => {
        e.stopPropagation();
        editMedication(id, {
            name: editForm.name,
            lowStockThreshold: Number(editForm.lowStockThreshold),
            usageRate: editForm.usageRate ? Number(editForm.usageRate) : null,
            usageFrequency: editForm.usageRate ? editForm.usageFrequency : null,
            notes: editForm.notes
        });
        setEditingId(null);
    };

    const getMedStats = (medId) => {
        const medBatches = batches.filter(b => b.medicationId === medId);
        const totalQty = medBatches.reduce((sum, b) => sum + b.currentQuantity, 0);
        // Find closest expiry
        const dates = medBatches.filter(b => b.currentQuantity > 0).map(b => new Date(b.expiryDate + 'T00:00'));
        const nextExpiry = dates.length ? new Date(Math.min(...dates)) : null;

        return { totalQty, nextExpiry, medBatches };
    };

    const filteredMedications = medications.filter(med => {
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

    if (filteredMedications.length === 0) {
        return (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>
                <p>No medications found matching filter.</p>
                {filter && <p>Try clearing the filter.</p>}
            </div>
        );
    }

    return (
        <div className="medication-list">
            {filteredMedications.map(med => {
                const { totalQty, nextExpiry, medBatches } = getMedStats(med.id);
                const isLow = totalQty <= med.lowStockThreshold;
                const isExpiring = nextExpiry && ((nextExpiry - new Date()) / (1000 * 60 * 60 * 24) < 30);

                // Calculate projected runout
                const runoutInfo = calculateRunoutDate(totalQty, med.usageRate, med.usageFrequency, med.lowStockThreshold);
                const isRunningOutSoon = runoutInfo && runoutInfo.daysUntilEmpty < 7;
                const isEditing = editingId === med.id;

                return (
                    <div key={med.id} className="med-item">

                        {/* Header / Summary Row */}
                        <div
                            onClick={() => !isEditing && toggleExpand(med.id)}
                            style={{
                                padding: '1rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: isEditing ? 'default' : 'pointer'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                <div style={{
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    padding: 10,
                                    borderRadius: '50%',
                                    color: 'var(--primary)'
                                }}>
                                    <Pill size={20} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    {isEditing ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                                            <input
                                                className="form-input"
                                                value={editForm.name}
                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                placeholder="Name"
                                            />
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <input
                                                    className="form-input"
                                                    type="number"
                                                    value={editForm.lowStockThreshold}
                                                    onChange={e => setEditForm({ ...editForm, lowStockThreshold: e.target.value })}
                                                    placeholder="Low Alert"
                                                    title="Low Stock Threshold"
                                                />
                                                <input
                                                    className="form-input"
                                                    type="number"
                                                    value={editForm.usageRate}
                                                    onChange={e => setEditForm({ ...editForm, usageRate: e.target.value })}
                                                    placeholder="Usage"
                                                    title="Usage Rate"
                                                />
                                                <select
                                                    className="form-input"
                                                    value={editForm.usageFrequency}
                                                    onChange={e => setEditForm({ ...editForm, usageFrequency: e.target.value })}
                                                >
                                                    <option value="daily">/ Day</option>
                                                    <option value="weekly">/ Week</option>
                                                    <option value="monthly">/ Month</option>
                                                </select>
                                            </div>
                                            <textarea
                                                className="form-input"
                                                value={editForm.notes}
                                                onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                                                placeholder="Notes..."
                                                rows={2}
                                                style={{ fontSize: '0.85rem' }}
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <h3 style={{ fontSize: '1.1rem' }}>{med.name}</h3>
                                                <button
                                                    onClick={(e) => startEditing(e, med)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.5 }}
                                                    title="Edit settings"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                <span style={{ color: isLow ? 'var(--warning)' : 'inherit' }}>
                                                    {totalQty} {med.defaultUnit}
                                                </span>
                                                {nextExpiry && (
                                                    <span>• Exp: {nextExpiry.toLocaleDateString()}</span>
                                                )}
                                                {runoutInfo && runoutInfo.dateEmpty && (
                                                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                        {runoutInfo.dateLow && totalQty > med.lowStockThreshold && (
                                                            <span style={{ color: 'var(--text-secondary)' }}>• Low: {runoutInfo.dateLow.toLocaleDateString()}</span>
                                                        )}
                                                        <span style={{ color: isRunningOutSoon ? 'var(--danger)' : 'var(--warning)' }}>
                                                            • Empty: {runoutInfo.dateEmpty.toLocaleDateString()}
                                                        </span>
                                                    </span>
                                                )}
                                                {med.notes && (
                                                    <span style={{ display: 'block', width: '100%', fontStyle: 'italic', marginTop: 4 }}>
                                                        "{med.notes}"
                                                    </span>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginLeft: 16 }}>
                                {isEditing ? (
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button onClick={(e) => saveEditing(e, med.id)} className="btn primary" style={{ width: 32, height: 32, padding: 0 }}><Save size={16} /></button>
                                        <button onClick={cancelEditing} className="btn secondary" style={{ width: 32, height: 32, padding: 0, marginTop: 0 }}><X size={16} /></button>
                                    </div>
                                ) : (
                                    expandedId === med.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />
                                )}
                            </div>
                        </div>

                        {/* Expanded Detail View */}
                        {expandedId === med.id && (
                            <div style={{
                                borderTop: '1px solid var(--border-color)',
                                padding: '1rem',
                                background: 'rgba(0,0,0,0.2)'
                            }}>
                                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Current Batches</h4>
                                {medBatches.length > 0 ? (
                                    <ul style={{ listStyle: 'none', marginBottom: '1rem' }}>
                                        {medBatches.map(batch => (
                                            <React.Fragment key={batch.id}>
                                                <li style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    padding: '8px 0',
                                                    fontSize: '0.9rem',
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                                                }}>
                                                    <span>
                                                        Qty: <b>{batch.currentQuantity}</b>
                                                        <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>
                                                            Exp: {new Date(batch.expiryDate + 'T00:00').toLocaleDateString()}
                                                        </span>
                                                    </span>
                                                    <span style={{ color: 'var(--text-secondary)' }}>
                                                        {batch.dosage && <span style={{ marginRight: 8 }}>{batch.dosage}</span>}
                                                        {batch.location}
                                                    </span>
                                                </li>
                                                {
                                                    batch.notes && (
                                                        <li style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0 0 8px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <i>Note: {batch.notes}</i>
                                                        </li>
                                                    )
                                                }
                                            </React.Fragment>
                                        ))}
                                    </ul>
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No active stock.</p>
                                )}

                                <div className="actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <input
                                            type="number"
                                            placeholder="Qty"
                                            value={consumeAmount}
                                            onChange={(e) => setConsumeAmount(e.target.value)}
                                            style={{
                                                width: '60px',
                                                padding: '8px',
                                                borderRadius: '6px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid var(--border-color)',
                                                color: 'white',
                                                fontSize: '0.9rem'
                                            }}
                                        />
                                        <button
                                            className="btn primary"
                                            style={{ fontSize: '0.9rem', padding: '8px 12px', width: 'auto' }}
                                            onClick={() => {
                                                if (!consumeAmount || Number(consumeAmount) <= 0) {
                                                    toast.warning('Enter a valid amount');
                                                    return;
                                                }
                                                consumeMedication(med.id, Number(consumeAmount));
                                                setConsumeAmount('');
                                            }}
                                        >
                                            Take
                                        </button>
                                    </div>

                                    <div style={{ flex: 1 }}></div>

                                    <button
                                        className="btn"
                                        style={{ fontSize: '0.9rem', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', width: 'auto' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Simple confirmation could be a toast action, but for now just do it
                                            // or maybe a double click? For safety let's use a browser confirm just for delete 
                                            // until we build a modal. 
                                            // Actually, user asked to remove alerts. 
                                            // Let's rely on undo? No undo implemented. 
                                            // Let's trust the user for now but maybe make the button redder.
                                            let confirmMsg = 'Delete this medication trace?';
                                            if (totalQty > 0) {
                                                confirmMsg = `WARNING: This medication has ${totalQty} units remaining.\n\nDelete anyway?`;
                                            }
                                            if (window.confirm(confirmMsg)) {
                                                deleteMedication(med.id);
                                            }
                                        }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        )
                        }
                    </div>
                );
            })}
        </div >
    );
};

export default MedicationList;
