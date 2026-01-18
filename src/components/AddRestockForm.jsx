import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ChevronRight, Calendar, Package } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const AddRestockForm = ({ onComplete }) => {
    const { medications, addMedication, addBatch } = useInventory();
    const toast = useToast();
    const [mode, setMode] = useState('medication'); // 'medication' or 'batch'

    // New Medication State
    const [medName, setMedName] = useState('');
    const [unit, setUnit] = useState('pills');
    const [threshold, setThreshold] = useState(10);

    // New Batch State
    const [selectedMedId, setSelectedMedId] = useState('');
    const [quantity, setQuantity] = useState(30);
    const [expiry, setExpiry] = useState('');
    const [location, setLocation] = useState('Cabinet');

    const handleCreateMed = (e) => {
        e.preventDefault();
        if (!medName) return;
        if (Number(threshold) < 0) {
            toast.error('Threshold cannot be negative');
            return;
        }
        const newId = addMedication({ name: medName, defaultUnit: unit, lowStockThreshold: Number(threshold) });
        toast.success(`Created ${medName}`);

        setMedName('');
        // Switch to batch mode for this new med
        // We set the ID, but because 'medications' prop might not have updated in this render cycle yet 
        // (if it comes from context), we need to ensure the select can handle it.
        // Actually, since we updated context state, it should re-render.
        setSelectedMedId(newId);
        setMode('batch');
    };

    const handleAddBatch = (e) => {
        e.preventDefault();
        if (!selectedMedId || !quantity || !expiry) return;

        addBatch({
            medicationId: selectedMedId,
            initialQuantity: Number(quantity),
            expiryDate: expiry,
            location
        });

        // Reset fields
        setQuantity(30);
        setExpiry('');
        setLocation('');
        if (onComplete) onComplete();
    };

    return (
        <div className="add-form-container">
            <div className="tab-switcher" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <button
                    className={`btn ${mode === 'medication' ? 'primary' : 'secondary'}`}
                    onClick={() => setMode('medication')}
                    style={{ flex: 1, marginTop: 0 }}
                >
                    New Drug
                </button>
                <button
                    className={`btn ${mode === 'batch' ? 'primary' : 'secondary'}`}
                    onClick={() => setMode('batch')}
                    disabled={medications.length === 0}
                    style={{ flex: 1, marginTop: 0 }}
                >
                    Restock
                </button>
            </div>

            {mode === 'medication' ? (
                <form onSubmit={handleCreateMed}>
                    <div className="form-group">
                        <label className="form-label">Medication Name</label>
                        <input
                            className="form-input"
                            value={medName}
                            onChange={e => setMedName(e.target.value)}
                            placeholder="e.g. Ibuprofen"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Unit Type</label>
                        <select className="form-input" value={unit} onChange={e => setUnit(e.target.value)}>
                            <option value="pills">Pills/Tablets</option>
                            <option value="ml">Milliliters (ml)</option>
                            <option value="grams">Grams</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Low Stock Alert Level</label>
                        <input
                            type="number"
                            className="form-input"
                            value={threshold}
                            onChange={e => setThreshold(e.target.value)}
                            min="0"
                            required
                        />
                    </div>

                    <button type="submit" className="btn primary">
                        Create & Add Stock
                        <ChevronRight size={16} style={{ marginLeft: 8, verticalAlign: 'middle' }} />
                    </button>
                </form>
            ) : (
                <form onSubmit={handleAddBatch}>
                    <div className="form-group">
                        <label className="form-label">Select Medication</label>
                        <select
                            className="form-input"
                            value={selectedMedId}
                            onChange={e => setSelectedMedId(e.target.value)}
                            required
                        >
                            <option value="">-- Select --</option>
                            {medications.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Quantity Added</label>
                        <div style={{ position: 'relative' }}>
                            <Package size={18} style={{ position: 'absolute', left: 12, top: 14, color: '#8b92a5' }} />
                            <input
                                type="number"
                                className="form-input"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                                style={{ paddingLeft: 40 }}
                                min="1"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Expiration Date</label>
                        <div style={{ position: 'relative' }}>
                            <Calendar size={18} style={{ position: 'absolute', left: 12, top: 14, color: '#8b92a5' }} />
                            <input
                                type="date"
                                className="form-input"
                                value={expiry}
                                onChange={e => setExpiry(e.target.value)}
                                style={{ paddingLeft: 40 }}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Storage Location (Optional)</label>
                        <input
                            className="form-input"
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            placeholder="e.g. Bathroom Cabinet"
                        />
                    </div>

                    <button type="submit" className="btn primary">Submit Restock</button>
                </form>
            )}
        </div>
    );
};

export default AddRestockForm;
