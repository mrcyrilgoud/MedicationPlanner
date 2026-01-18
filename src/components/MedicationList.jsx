import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ChevronDown, ChevronUp, Trash2, Pill, Check } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const MedicationList = () => {
    const { medications, batches, consumeMedication, deleteMedication } = useInventory();
    const toast = useToast();
    const [expandedId, setExpandedId] = useState(null);
    const [consumeAmount, setConsumeAmount] = useState('');

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const getMedStats = (medId) => {
        const medBatches = batches.filter(b => b.medicationId === medId);
        const totalQty = medBatches.reduce((sum, b) => sum + b.currentQuantity, 0);
        // Find closest expiry
        const dates = medBatches.filter(b => b.currentQuantity > 0).map(b => new Date(b.expiryDate));
        const nextExpiry = dates.length ? new Date(Math.min(...dates)) : null;

        return { totalQty, nextExpiry, medBatches };
    };

    if (medications.length === 0) {
        return (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>
                <p>No medications found.</p>
                <p>Go to the Add tab to start.</p>
            </div>
        );
    }

    return (
        <div className="medication-list">
            {medications.map(med => {
                const { totalQty, nextExpiry, medBatches } = getMedStats(med.id);
                const isLow = totalQty <= med.lowStockThreshold;
                const isExpiring = nextExpiry && ((nextExpiry - new Date()) / (1000 * 60 * 60 * 24) < 30);

                return (
                    <div key={med.id} className="med-item" style={{
                        background: 'var(--bg-card)',
                        marginBottom: '1rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        overflow: 'hidden'
                    }}>

                        {/* Header / Summary Row */}
                        <div
                            onClick={() => toggleExpand(med.id)}
                            style={{
                                padding: '1rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    padding: 10,
                                    borderRadius: '50%',
                                    color: 'var(--primary)'
                                }}>
                                    <Pill size={20} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem' }}>{med.name}</h3>
                                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        <span style={{ color: isLow ? 'var(--warning)' : 'inherit' }}>
                                            {totalQty} {med.defaultUnit}
                                        </span>
                                        {nextExpiry && (
                                            <span>• Exp: {nextExpiry.toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {expandedId === med.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
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
                                            <li key={batch.id} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                padding: '8px 0',
                                                fontSize: '0.9rem',
                                                borderBottom: '1px solid rgba(255,255,255,0.05)'
                                            }}>
                                                <span>
                                                    Qty: <b>{batch.currentQuantity}</b>
                                                    <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>
                                                        Exp: {new Date(batch.expiryDate).toLocaleDateString()}
                                                    </span>
                                                </span>
                                                <span style={{ color: 'var(--text-secondary)' }}>{batch.location}</span>
                                            </li>
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
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default MedicationList;
