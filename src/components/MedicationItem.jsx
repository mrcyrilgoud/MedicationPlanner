import React, { useState } from 'react';
import {
    ChevronDown,
    ChevronUp,
    Archive,
    Pill,
    Pencil,
    ImageIcon,
    BookOpen,
    ShoppingCart,
    PackagePlus,
    Save,
    X
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { calculateRunoutDate, getLowStockThresholdQuantity } from '../utils/calculations';
import { getSmartLink } from '../utils/drugApi';
import ImageModal from './ImageModal';

const MedicationItem = React.memo(({
    itemId,
    med,
    isGroup,
    medStats,
    isEditing,
    onEditStart,
    isExpanded,
    onToggleExpand,
    onArchive,
    onConsume,
    onQuickRestock,
    onAddToShopping,
    onBatchSave,
    onDiscardBatch,
    children
}) => {
    const toast = useToast();
    const [consumeAmount, setConsumeAmount] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [editingBatchId, setEditingBatchId] = useState(null);
    const [batchForm, setBatchForm] = useState({});

    const { totalQty, availableQty = totalQty, nextExpiry, medBatches } = medStats || { totalQty: 0, nextExpiry: null, medBatches: [] };
    const stockForAlerts = availableQty ?? totalQty;
    const lowThreshold = getLowStockThresholdQuantity(med);
    const isLow = stockForAlerts <= lowThreshold;
    const runoutInfo = calculateRunoutDate(stockForAlerts, med.usageRate, med.usageFrequency, lowThreshold);
    const isRunningOutSoon = runoutInfo && runoutInfo.daysUntilEmpty < 7;

    const handleInfoClick = async (event) => {
        event.stopPropagation();
        const notify = toast.loading('Finding best info source...');
        try {
            const { url, source } = await getSmartLink(med.name);
            toast.dismiss(notify);
            toast.success(`Opening ${source}...`);
            if (url) window.open(url, '_blank');
        } catch (error) {
            console.error('Link Error:', error);
            toast.dismiss(notify);
            toast.error('Failed to open link');
        }
    };

    const startBatchEdit = (batch) => {
        setEditingBatchId(batch.id);
        setBatchForm({
            currentQuantity: batch.currentQuantity,
            expiryDate: batch.expiryDate,
            dosage: batch.dosage || '',
            location: batch.location || '',
            notes: batch.notes || ''
        });
    };

    const saveBatchEdit = async (batchId) => {
        try {
            await onBatchSave(batchId, {
                currentQuantity: Number(batchForm.currentQuantity),
                expiryDate: batchForm.expiryDate,
                dosage: batchForm.dosage,
                location: batchForm.location,
                notes: batchForm.notes
            });
            toast.success('Batch updated.');
            setEditingBatchId(null);
            setBatchForm({});
        } catch (error) {
            toast.error(error.message);
        }
    };

    return (
        <div id={itemId} className="med-item" style={isGroup ? { border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', borderRadius: 0, margin: 0 } : {}}>
            <ImageModal
                isOpen={!!selectedImage}
                imageUrl={selectedImage}
                onClose={() => setSelectedImage(null)}
            />

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
                            children
                        ) : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <h3 style={{ fontSize: '1.1rem' }}>{med.name}</h3>
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
                                            justifyContent: 'center'
                                        }}
                                        title="View Medication Info"
                                    >
                                        <BookOpen size={14} />
                                    </button>
                                    <button
                                        onClick={(event) => onEditStart(event, med)}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.6 }}
                                        title="Edit settings"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    <span style={{ color: isLow ? 'var(--warning)' : 'inherit' }}>
                                        {med.defaultUnit === 'inhaler'
                                            ? `${(totalQty / (med.puffsPerCanister || 200)).toFixed(1)} canisters`
                                            : `${totalQty} ${med.defaultUnit}`
                                        }
                                    </span>
                                    {med.condition && <span>• {med.condition}</span>}
                                    {nextExpiry && <span>• Exp: {nextExpiry.toLocaleDateString()}</span>}
                                    {runoutInfo?.dateEmpty && (
                                        <span style={{ color: isRunningOutSoon ? 'var(--danger)' : 'var(--warning)' }}>
                                            • Empty: {runoutInfo.dateEmpty.toLocaleDateString()}
                                        </span>
                                    )}
                                </div>

                                {med.tags?.length > 0 && (
                                    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                                        {med.tags.map((tag) => (
                                            <span key={tag} className="tag-pill muted-tag">#{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {!isEditing && med.images?.length > 0 && (
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
                    {!isEditing && (isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />)}
                </div>
            </div>

            {isExpanded && !isEditing && (
                <div className="medication-expanded-panel">
                    <h4 className="section-caption">Current Batches</h4>
                    {medBatches.length > 0 ? (
                        <ul className="batch-list">
                            {medBatches.map((batch) => (
                                <li key={batch.id} className="batch-card">
                                    {editingBatchId === batch.id ? (
                                        <div className="batch-edit-grid">
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={batchForm.currentQuantity}
                                                onChange={(event) => setBatchForm((prev) => ({ ...prev, currentQuantity: event.target.value }))}
                                            />
                                            <input
                                                type="date"
                                                className="form-input"
                                                value={batchForm.expiryDate}
                                                onChange={(event) => setBatchForm((prev) => ({ ...prev, expiryDate: event.target.value }))}
                                            />
                                            <input
                                                className="form-input"
                                                value={batchForm.location}
                                                onChange={(event) => setBatchForm((prev) => ({ ...prev, location: event.target.value }))}
                                                placeholder="Location"
                                            />
                                            <input
                                                className="form-input"
                                                value={batchForm.dosage}
                                                onChange={(event) => setBatchForm((prev) => ({ ...prev, dosage: event.target.value }))}
                                                placeholder="Dosage"
                                            />
                                            <textarea
                                                className="form-input"
                                                rows={2}
                                                value={batchForm.notes}
                                                onChange={(event) => setBatchForm((prev) => ({ ...prev, notes: event.target.value }))}
                                                placeholder="Batch notes"
                                            />
                                            <div className="batch-action-row">
                                                <button type="button" className="btn primary" style={{ width: 'auto' }} onClick={() => saveBatchEdit(batch.id)}>
                                                    <Save size={14} />
                                                    Save
                                                </button>
                                                <button type="button" className="btn secondary" style={{ width: 'auto' }} onClick={() => setEditingBatchId(null)}>
                                                    <X size={14} />
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="batch-row-top">
                                                <div>
                                                    <strong>{batch.currentQuantity}</strong> {med.defaultUnit}
                                                    <span className="batch-meta">
                                                        Exp: {new Date(`${batch.expiryDate}T00:00:00`).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="batch-row-actions">
                                                    <button type="button" className="btn ghost-btn" onClick={() => startBatchEdit(batch)}>
                                                        Edit
                                                    </button>
                                                    <button type="button" className="btn ghost-btn danger-outline" onClick={() => onDiscardBatch(batch.id)}>
                                                        Discard
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="batch-meta-row">
                                                {batch.location && <span>{batch.location}</span>}
                                                {batch.dosage && <span>{batch.dosage}</span>}
                                                {batch.notes && <span>{batch.notes}</span>}
                                            </div>
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>No active stock.</p>
                    )}

                    {med.images?.length > 0 && (
                        <div style={{ marginBottom: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                            <h4 className="section-caption">Photos</h4>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {med.images.map((image, index) => (
                                    <img
                                        key={index}
                                        src={image}
                                        alt={`Medication ${index + 1}`}
                                        style={{
                                            width: 100,
                                            height: 100,
                                            objectFit: 'cover',
                                            borderRadius: 8,
                                            border: '1px solid var(--border-color)',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => setSelectedImage(image)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="inventory-action-bar">
                        <div className="take-dose-row">
                            <input
                                type="number"
                                placeholder={med.defaultUnit === 'inhaler' ? 'Puffs' : 'Qty'}
                                value={consumeAmount}
                                onChange={(event) => setConsumeAmount(event.target.value)}
                                className="form-input"
                                style={{ width: '88px' }}
                            />
                            <button
                                className="btn primary"
                                style={{ width: 'auto' }}
                                onClick={() => {
                                    if (!consumeAmount || Number(consumeAmount) <= 0) {
                                        toast.warning('Enter a valid amount');
                                        return;
                                    }
                                    onConsume(med.id, Number(consumeAmount));
                                    setConsumeAmount('');
                                }}
                            >
                                Take
                            </button>
                        </div>

                        <div className="inventory-secondary-actions">
                            <button type="button" className="btn ghost-btn" onClick={() => onQuickRestock(med.id)}>
                                <PackagePlus size={14} />
                                Restock
                            </button>
                            <button type="button" className="btn ghost-btn" onClick={() => onAddToShopping(med.id)}>
                                <ShoppingCart size={14} />
                                Shop
                            </button>
                            <button type="button" className="btn ghost-btn danger-outline" onClick={() => onArchive(med)}>
                                <Archive size={14} />
                                Archive
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default MedicationItem;
