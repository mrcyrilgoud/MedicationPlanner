import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, Pill, Pencil, ImageIcon, BookOpen } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { calculateRunoutDate } from '../utils/calculations';
import { getSmartLink } from '../utils/drugApi';
import ImageModal from './ImageModal';

const MedicationItem = React.memo(({
    med,
    isGroup,
    medStats,
    isEditing,
    onEditStart,
    isExpanded,
    onToggleExpand,
    onDelete,
    children // For edit form
}) => {
    const { consumeMedication } = useInventory();
    const toast = useToast();
    const [consumeAmount, setConsumeAmount] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);

    const { totalQty, nextExpiry, medBatches } = medStats || { totalQty: 0, nextExpiry: null, medBatches: [] };
    const isLow = totalQty <= med.lowStockThreshold;

    const runoutInfo = calculateRunoutDate(totalQty, med.usageRate, med.usageFrequency, med.lowStockThreshold);
    const isRunningOutSoon = runoutInfo && runoutInfo.daysUntilEmpty < 7;

    const handleInfoClick = async (e) => {
        e.stopPropagation();
        const notify = toast.loading("Finding best info source...");
        try {
            const { url, source } = await getSmartLink(med.name);
            toast.dismiss(notify);
            toast.success(`Opening ${source}...`);
            if (url) {
                window.open(url, '_blank');
            } else {
                toast.error("No URL found");
            }
        } catch (err) {
            console.error("Link Error:", err);
            toast.dismiss(notify);
            toast.error("Failed to open link");
        }
    };

    return (
        <div className="med-item" style={isGroup ? { border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', borderRadius: 0, margin: 0 } : {}}>
            <ImageModal
                isOpen={!!selectedImage}
                imageUrl={selectedImage}
                onClose={() => setSelectedImage(null)}
            />

            {/* Header / Summary Row */}
            <div
                onClick={() => !isEditing && onToggleExpand(med.id)}
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
                        background: isGroup ? 'transparent' : 'rgba(59, 130, 246, 0.1)',
                        padding: isGroup ? 0 : 10,
                        borderRadius: '50%',
                        color: 'var(--primary)',
                        opacity: isGroup ? 0.7 : 1
                    }}>
                        <Pill size={isGroup ? 16 : 20} />
                    </div>

                    <div style={{ flex: 1 }}>
                        {isEditing ? (
                            children // The Edit Form
                        ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <h3 style={{ fontSize: '1.1rem' }}>{med.name}</h3>
                                    {/* Info Link Button */}
                                    <button
                                        onClick={handleInfoClick}
                                        style={{
                                            background: 'rgba(59, 130, 246, 0.1)',
                                            border: '1px solid rgba(59, 130, 246, 0.2)',
                                            color: '#60a5fa',
                                            cursor: 'pointer',
                                            padding: '4px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginLeft: 4
                                        }}
                                        title="View Medication Info"
                                    >
                                        <BookOpen size={14} />
                                    </button>

                                    <button
                                        onClick={(e) => onEditStart(e, med)}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.5 }}
                                        title="Edit settings"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    <span style={{ color: isLow ? 'var(--warning)' : 'inherit' }}>
                                        {med.defaultUnit === 'inhaler'
                                            ? `${(totalQty / (med.puffsPerCanister || 200)).toFixed(1)} Canisters (${totalQty} puffs)`
                                            : `${totalQty} ${med.defaultUnit}`
                                        }
                                    </span>
                                    {med.condition && (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            background: 'rgba(16, 185, 129, 0.1)',
                                            color: 'var(--success)',
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            fontSize: '0.8rem',
                                            border: '1px solid rgba(16, 185, 129, 0.2)'
                                        }}>
                                            For: {med.condition}
                                        </span>
                                    )}
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
                                    {med.tags && med.tags.length > 0 && (
                                        <div style={{ display: 'flex', gap: 4, marginTop: 4, width: '100%', flexWrap: 'wrap' }}>
                                            {med.tags.map(tag => (
                                                <span key={tag} style={{
                                                    fontSize: '0.75rem',
                                                    padding: '2px 6px',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    borderRadius: 4,
                                                    color: 'var(--text-secondary)',
                                                    border: '1px solid rgba(255,255,255,0.1)'
                                                }}>
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Thumbnail Preview */}
                        {!isEditing && med.images && med.images.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                <ImageIcon size={14} color="var(--text-secondary)" />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {med.images.length} photo{med.images.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ marginLeft: 16 }}>
                    {!isEditing && (
                        isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />
                    )}
                </div>
            </div>

            {/* Expanded Detail View */}
            {isExpanded && !isEditing && (
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
                                    {batch.notes && (
                                        <li style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0 0 8px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <i>Note: {batch.notes}</i>
                                        </li>
                                    )}
                                </React.Fragment>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No active stock.</p>
                    )}

                    {/* Image Viewer */}
                    {med.images && med.images.length > 0 && (
                        <div style={{ marginBottom: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Photos</h4>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {med.images.map((img, idx) => (
                                    <img
                                        key={idx}
                                        src={img}
                                        alt={`Medication ${idx + 1}`}
                                        style={{
                                            width: 100,
                                            height: 100,
                                            objectFit: 'cover',
                                            borderRadius: 8,
                                            border: '1px solid var(--border-color)',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => setSelectedImage(img)}
                                        title="Click to view full size"
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                                type="number"
                                placeholder={med.defaultUnit === 'inhaler' ? "Puffs" : "Qty"}
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
                                onDelete(med, totalQty);
                            }}
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

export default MedicationItem;

