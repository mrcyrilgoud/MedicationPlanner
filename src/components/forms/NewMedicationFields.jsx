import React from 'react';
import { X, Tag } from 'lucide-react';

const NewMedicationFields = ({
    isVisible,
    unit,
    setUnit,
    puffsPerCanister,
    setPuffsPerCanister,
    threshold,
    setThreshold,
    usageRate,
    setUsageRate,
    usageBasis,
    setUsageBasis,
    usageFrequency,
    setUsageFrequency,
    medNotes,
    setMedNotes,
    condition,
    setCondition,
    tags,
    setTags,
    tagInput,
    setTagInput
}) => {
    if (!isVisible) return null;

    return (
        <div style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.02)'
        }}>
            <h4 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--primary)' }}>New Medication Details</h4>

            <div className="form-group">
                <label className="form-label">Unit Type</label>
                <select className="form-input" value={unit} onChange={e => setUnit(e.target.value)}>
                    <option value="pills">Pills/Tablets</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="grams">Grams</option>
                    <option value="inhaler">Inhaler</option>
                </select>
            </div>

            {/* Inhaler Specific: Puffs per Canister */}
            {unit === 'inhaler' && (
                <div className="form-group" style={{ animation: 'fadeIn 0.3s ease' }}>
                    <label className="form-label">Actuations/Doses per Canister</label>
                    <input
                        type="number"
                        className="form-input"
                        value={puffsPerCanister}
                        onChange={e => setPuffsPerCanister(e.target.value)}
                        placeholder="e.g. 200"
                        min="1"
                    />
                    <small style={{ color: 'var(--text-secondary)' }}>Usually 200 for standard Albuterol.</small>
                </div>
            )}

            <div className="form-group">
                <label className="form-label">Low Stock Alert Level ({unit === 'inhaler' ? 'Canisters' : 'Units'})</label>
                <input
                    type="number"
                    className="form-input"
                    value={threshold}
                    onChange={e => setThreshold(e.target.value)}
                    min="0"
                    required
                />
            </div>

            <div className="form-group">
                <label className="form-label">Estimated Usage</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>I take</span>
                    <input
                        type="number"
                        className="form-input"
                        value={usageRate}
                        onChange={e => setUsageRate(e.target.value)}
                        placeholder="Qty"
                        min="0"
                        style={{ width: '80px', textAlign: 'center' }}
                    />
                    {unit === 'inhaler' ? (
                        <select
                            className="form-input"
                            value={usageBasis}
                            onChange={e => setUsageBasis(e.target.value)}
                            style={{ width: 'auto' }}
                        >
                            <option value="base">Puffs</option>
                            <option value="container">Canisters</option>
                        </select>
                    ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>
                            {unit === 'pills' ? 'pills' :
                                unit === 'ml' ? 'ml' :
                                    unit === 'grams' ? 'grams' : 'units'}
                        </span>
                    )}
                    <span style={{ color: 'var(--text-secondary)' }}>every</span>
                    <select
                        className="form-input"
                        value={usageFrequency}
                        onChange={e => setUsageFrequency(e.target.value)}
                        style={{ flex: 1, minWidth: '100px' }}
                    >
                        <option value="daily">Day</option>
                        <option value="weekly">Week</option>
                        <option value="monthly">Month</option>
                    </select>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <textarea
                    className="form-input"
                    value={medNotes}
                    onChange={e => setMedNotes(e.target.value)}
                    placeholder="e.g. Take with food"
                    rows={2}
                />
            </div>

            <div className="form-group">
                <label className="form-label">Condition / Purpose (Optional)</label>
                <input
                    className="form-input"
                    value={condition}
                    onChange={e => setCondition(e.target.value)}
                    placeholder="e.g. Headache, Blood Pressure..."
                />
            </div>


            <div className="form-group">
                <label className="form-label">Tags</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    {tags.map(tag => (
                        <span key={tag} style={{
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#60a5fa',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                        }}>
                            {tag}
                            <button
                                type="button"
                                onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex' }}
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
                <div style={{ position: 'relative' }}>
                    <Tag size={16} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-secondary)' }} />
                    <input
                        className="form-input"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                                    setTags([...tags, tagInput.trim()]);
                                    setTagInput('');
                                }
                            }
                        }}
                        placeholder="Add tag (Press Enter)..."
                        style={{ paddingLeft: 34 }}
                    />
                </div>
            </div>
        </div >
    );
};

export default NewMedicationFields;
