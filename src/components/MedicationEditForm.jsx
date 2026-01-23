import React, { useState } from 'react';
import { X, Camera, Save } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { resizeImage } from '../utils/imageHelpers';

const MedicationEditForm = ({ med, editForm, setEditForm, onSave, onCancel, medications, onLink, onUngroup }) => {
    const toast = useToast();

    const handleImageUpload = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (!file.type.startsWith('image/')) {
                toast.error('Please upload a valid image file');
                return;
            }
            try {
                const resized = await resizeImage(file);
                setEditForm(prev => ({
                    ...prev,
                    images: [...(prev.images || []), resized]
                }));
            } catch (err) {
                console.error("Image upload failed", err);
                toast.error("Failed to process image");
            }
        }
    };

    const removeImage = (index) => {
        setEditForm(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    return (
        <div style={{ padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Name Input */}
            <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>Name</label>
                <input
                    className="form-input"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Medication Name"
                    style={{ fontSize: '1rem', fontWeight: 500 }}
                />
            </div>

            {/* Condition Input */}
            <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>Condition / Purpose</label>
                <input
                    className="form-input"
                    value={editForm.condition}
                    onChange={e => setEditForm({ ...editForm, condition: e.target.value })}
                    placeholder="e.g. Headache"
                    style={{ fontSize: '0.9rem' }}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {/* Grouping */}
                <div>
                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>Grouping</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                            className="form-input"
                            style={{ fontSize: '0.9rem' }}
                            value=""
                            onChange={(e) => {
                                if (e.target.value) {
                                    onLink(e.target.value);
                                }
                            }}
                        >
                            <option value="">Link to...</option>
                            {medications
                                .filter(m => m.id !== med.id && (m.groupId || m.id) !== (med.groupId || med.id))
                                .map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                        </select>
                        {med.groupId && med.groupId !== med.id && (
                            <button
                                className="btn secondary"
                                style={{ width: 'auto', padding: '0 8px' }}
                                onClick={onUngroup}
                                title="Ungroup"
                            >
                                Ungroup
                            </button>
                        )}
                    </div>
                </div>

                {/* Threshold */}
                <div>
                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>Low Stock Alert</label>
                    <input
                        className="form-input"
                        type="number"
                        value={editForm.lowStockThreshold}
                        onChange={e => setEditForm({ ...editForm, lowStockThreshold: e.target.value })}
                        placeholder="Level"
                        style={{ width: '100%' }}
                    />
                </div>
            </div>

            {/* Usage Input */}
            <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>Estimated Usage</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>I use</span>
                    <input
                        className="form-input"
                        type="number"
                        value={editForm.usageRate}
                        onChange={e => setEditForm({ ...editForm, usageRate: e.target.value })}
                        placeholder="Qty"
                        style={{ width: '70px', textAlign: 'center' }}
                    />
                    {med.defaultUnit === 'inhaler' ? (
                        <select
                            className="form-input"
                            value={editForm.usageBasis || 'base'}
                            onChange={e => setEditForm({ ...editForm, usageBasis: e.target.value })}
                            style={{ width: 'auto' }}
                        >
                            <option value="base">Puffs</option>
                            <option value="container">Canisters</option>
                        </select>
                    ) : (
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {med.defaultUnit === 'pills' ? 'pills' :
                                med.defaultUnit === 'ml' ? 'ml' :
                                    med.defaultUnit === 'grams' ? 'grams' : 'units'}
                        </span>
                    )}
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>every</span>
                    <select
                        className="form-input"
                        value={editForm.usageFrequency}
                        onChange={e => setEditForm({ ...editForm, usageFrequency: e.target.value })}
                        style={{ width: 'auto', flex: 1 }}
                    >
                        <option value="daily">Day</option>
                        <option value="weekly">Week</option>
                        <option value="monthly">Month</option>
                    </select>
                </div>
            </div>

            {/* Notes */}
            <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>Notes</label>
                <textarea
                    className="form-input"
                    value={editForm.notes}
                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Add notes..."
                    rows={2}
                    style={{ fontSize: '0.9rem', resize: 'vertical' }}
                />
            </div>

            {/* Edit Tags */}
            <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' }}>Tags</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                    {editForm.tags?.map(tag => (
                        <span key={tag} style={{
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#60a5fa',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                        }}>
                            {tag}
                            <button
                                type="button"
                                onClick={() => setEditForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }))}
                                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex' }}
                            >
                                <X size={10} />
                            </button>
                        </span>
                    ))}
                </div>
                <input
                    className="form-input"
                    placeholder="+ Tag (Enter)"
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = e.target.value.trim();
                            if (val && !editForm.tags?.includes(val)) {
                                setEditForm(prev => ({ ...prev, tags: [...(prev.tags || []), val] }));
                                e.target.value = '';
                            }
                        }
                    }}
                    style={{ fontSize: '0.9rem' }}
                />
            </div>

            {/* Image Upload Area */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>Photos</label>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {editForm.images?.length || 0} attached
                    </span>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <label
                        className="btn secondary"
                        style={{
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 60,
                            height: 60,
                            borderRadius: 6,
                            border: '1px dashed var(--border-color)',
                            gap: 4
                        }}
                    >
                        <Camera size={20} />
                        <span style={{ fontSize: '0.6rem' }}>Add</span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                        />
                    </label>

                    {editForm.images?.length > 0 && editForm.images.map((img, idx) => (
                        <div key={idx} style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
                            <img
                                src={img}
                                alt="Medication"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: 6,
                                    border: '1px solid var(--border-color)'
                                }}
                            />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeImage(idx);
                                }}
                                style={{
                                    position: 'absolute',
                                    top: -6,
                                    right: -6,
                                    background: 'var(--danger)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: 18,
                                    height: 18,
                                    fontSize: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    zIndex: 10
                                }}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button onClick={onSave} className="btn primary">
                    <Save size={16} style={{ marginRight: 6 }} /> Save
                </button>
                <button onClick={onCancel} className="btn secondary">
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default MedicationEditForm;
