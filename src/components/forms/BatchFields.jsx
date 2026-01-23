import React from 'react';
import { Package, Calendar, ChevronRight } from 'lucide-react';

const BatchFields = ({
    isVisible,
    matchingMed,
    unit,
    quantity,
    setQuantity,
    expiry,
    setExpiry,
    dosage,
    setDosage,
    location,
    setLocation,
    batchNotes,
    setBatchNotes
}) => {
    if (!isVisible) return null;

    return (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h4 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                {matchingMed ? 'Restock ' + matchingMed.name : 'Initial Stock'}
            </h4>

            <div className="form-group">
                <label className="form-label">
                    {unit === 'inhaler' || (matchingMed && matchingMed.defaultUnit === 'inhaler') ? 'Number of Canisters' : 'Quantity Added'}
                </label>
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
                <label className="form-label">Dosage (Optional)</label>
                <input
                    className="form-input"
                    value={dosage}
                    onChange={e => setDosage(e.target.value)}
                    placeholder="e.g. 500mg"
                />
            </div>

            <div className="form-group">
                <label className="form-label">Location & Batch Notes</label>
                <input
                    className="form-input"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Storage Location (e.g. Cabinet)"
                    style={{ marginBottom: 8 }}
                />
                <textarea
                    className="form-input"
                    value={batchNotes}
                    onChange={e => setBatchNotes(e.target.value)}
                    placeholder="Batch specific notes..."
                    rows={2}
                />
            </div>

            <button type="submit" className="btn primary" style={{ marginTop: '1rem' }}>
                {matchingMed ? 'Add Stock' : 'Create & Add Stock'}
                <ChevronRight size={16} style={{ marginLeft: 8, verticalAlign: 'middle' }} />
            </button>
        </div>
    );
};

export default BatchFields;
