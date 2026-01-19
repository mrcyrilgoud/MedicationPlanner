import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ChevronRight, Calendar, Package } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { findGenericName } from '../utils/drugApi';

const AddRestockForm = ({ onComplete }) => {
    const { medications, addMedication, addBatch } = useInventory();
    const toast = useToast();

    // Levenshtein distance for fuzzy matching
    const levenshtein = (a, b) => {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [matchingMed, setMatchingMed] = useState(null);
    const [potentialMatch, setPotentialMatch] = useState(null);
    const [aliasMatch, setAliasMatch] = useState(null); // { med: object, canonical: string }
    const [linkedGroup, setLinkedGroup] = useState(null); // { id, name, groupId }

    // New Medication State
    const [unit, setUnit] = useState('pills');
    const [threshold, setThreshold] = useState(10);
    const [usageRate, setUsageRate] = useState('');
    const [usageFrequency, setUsageFrequency] = useState('daily');
    const [medNotes, setMedNotes] = useState('');

    // Batch State
    const [quantity, setQuantity] = useState(30);
    const [dosage, setDosage] = useState('');
    const [expiry, setExpiry] = useState('');
    const [location, setLocation] = useState('Cabinet');
    const [batchNotes, setBatchNotes] = useState('');

    // Check for matches when search term changes
    useEffect(() => {
        if (!searchTerm) {
            setMatchingMed(null);
            setPotentialMatch(null);
            setAliasMatch(null);
            setLinkedGroup(null);
            return;
        }

        // Exact match (case insensitive)
        const exact = medications.find(m => m.name.toLowerCase() === searchTerm.toLowerCase());
        if (exact) {
            setMatchingMed(exact);
            setPotentialMatch(null);
            setAliasMatch(null);
            return;
        } else {
            setMatchingMed(null);
        }

        // Debounced API Search and Fuzzy Match
        const timeoutId = setTimeout(async () => {
            // 1. Fuzzy Match (Sync)
            let foundFuzzy = null;
            if (searchTerm.length > 3) {
                foundFuzzy = medications.find(m => {
                    const dist = levenshtein(searchTerm.toLowerCase(), m.name.toLowerCase());
                    return dist <= 2 && dist > 0;
                });
            }

            // 2. API Alias Search (Async)
            // Only search API if we don't have an exact match and user paused typing
            if (searchTerm.length > 3 && !exact) {
                const genericName = await findGenericName(searchTerm);

                if (genericName) {
                    // Check if we have this generic in our inventory (case insensitive)
                    const sameDrug = medications.find(m =>
                        m.name.toLowerCase() === genericName.toLowerCase() ||
                        // Also check if any med IS the generic name (e.g. we have Acetaminophen)
                        (m.groupId && false) // Future: could check group aliases but simple name match is good start
                    );

                    if (sameDrug) {
                        // found a match via API
                        if (!linkedGroup || linkedGroup.id !== sameDrug.id) {
                            setAliasMatch({ med: sameDrug, canonical: genericName });
                        }
                        // If API finds a match, we might prioritize it over fuzzy, or show both.
                        // Let's hide fuzzy if we have a strong alias match to avoid clutter
                        foundFuzzy = null;
                    }
                }
            }

            setPotentialMatch(foundFuzzy || null);

        }, 500); // 500ms delay

        return () => clearTimeout(timeoutId);

    }, [searchTerm, medications, linkedGroup]);

    const handleUnifiedSubmit = (e) => {
        e.preventDefault();

        let targetMedId;

        // 1. Create Med if doesn't exist
        if (!matchingMed) {
            if (Number(threshold) < 0) {
                toast.error('Threshold cannot be negative');
                return;
            }

            const medData = {
                name: searchTerm, // Use the typed name
                defaultUnit: unit,
                lowStockThreshold: Number(threshold),
                usageRate: usageRate ? Number(usageRate) : null,
                usageFrequency: usageRate ? usageFrequency : null,
                notes: medNotes,
            };

            // If we have a linked group, assign the groupId
            if (linkedGroup) {
                medData.groupId = linkedGroup.groupId || linkedGroup.id;
            }

            targetMedId = addMedication(medData);

            if (linkedGroup) {
                toast.success(`Created ${searchTerm} (Grouped with ${linkedGroup.name})`);
            } else {
                toast.success(`Created ${searchTerm}`);
            }
            setMedNotes('');
        } else {
            targetMedId = matchingMed.id;
        }

        // 2. Add Batch
        if (!quantity || !expiry) {
            // Should be handled by 'required' attributes but double check
            return;
        }

        addBatch({
            medicationId: targetMedId,
            initialQuantity: Number(quantity),
            expiryDate: expiry,
            location,
            dosage,
            notes: batchNotes
        });

        // Reset
        setSearchTerm('');
        setQuantity(30);
        setExpiry('');
        setLocation('');
        setDosage('');
        setBatchNotes('');
        setMatchingMed(null);
        setPotentialMatch(null);
        setAliasMatch(null);
        setLinkedGroup(null);
        if (onComplete) onComplete();
    };

    const confirmMatch = () => {
        setSearchTerm(potentialMatch.name);
        setPotentialMatch(null);
        // Effect will automatically setMatchingMed
    };

    const confirmAliasGroup = () => {
        // Lock in the group link, AND inherit settings
        if (!aliasMatch) return;
        const parent = aliasMatch.med;

        setLinkedGroup(parent);

        // Auto-populate settings from parent
        setUnit(parent.defaultUnit);
        setThreshold(parent.lowStockThreshold);
        if (parent.usageRate) setUsageRate(parent.usageRate);
        if (parent.usageFrequency) setUsageFrequency(parent.usageFrequency);

        setAliasMatch(null);
    };

    return (
        <div className="add-form-container">
            <form onSubmit={handleUnifiedSubmit}>

                {/* 1. Name Input / Search */}
                <div className="form-group">
                    <label className="form-label">Medication Name</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            className="form-input"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Type to search or create..."
                            required
                            autoComplete="off"
                        />
                        {matchingMed && (
                            <div style={{
                                position: 'absolute',
                                right: 10,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--success)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: '0.8rem'
                            }}>
                                <span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--success)', borderRadius: '50%' }}></span>
                                Found
                            </div>
                        )}
                    </div>

                    {/* Typo Warning */}
                    {potentialMatch && (
                        <div style={{
                            marginTop: 8,
                            padding: 10,
                            background: 'rgba(234, 179, 8, 0.15)',
                            border: '1px solid var(--warning)',
                            borderRadius: 6,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ color: 'var(--warning)', fontSize: '0.9rem' }}>
                                Did you mean <b>{potentialMatch.name}</b>?
                            </span>
                            <button
                                type="button"
                                className="btn secondary"
                                style={{ margin: 0, padding: '4px 8px', fontSize: '0.8rem' }}
                                onClick={confirmMatch}
                            >
                                Yes, use {potentialMatch.name}
                            </button>
                        </div>
                    )}

                    {/* Alias Grouping Suggestion */}
                    {aliasMatch && !matchingMed && !linkedGroup && (
                        <div style={{
                            marginTop: 8,
                            padding: 10,
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid var(--primary)',
                            borderRadius: 6,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span style={{ color: 'var(--primary)', fontSize: '0.9rem', flex: 1 }}>
                                    <b>{aliasMatch.med.name}</b> is already in your list (Generic: {aliasMatch.canonical}).
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    type="button"
                                    className="btn primary"
                                    style={{ margin: 0, padding: '6px 12px', fontSize: '0.85rem', flex: 1 }}
                                    onClick={confirmAliasGroup}
                                >
                                    Group with {aliasMatch.med.name}
                                </button>
                                {/* Implicitly: if they ignore this and continue filling form, they create independent */}
                            </div>
                        </div>
                    )}

                    {/* Linked Badge */}
                    {linkedGroup && (
                        <div style={{
                            marginTop: 8,
                            padding: '6px 10px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid var(--success)',
                            borderRadius: 6,
                            color: 'var(--success)',
                            fontSize: '0.85rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span>Adding as variant of <b>{linkedGroup.name}</b></span>
                            <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.2rem', padding: 0, lineHeight: 1 }}
                                onClick={() => setLinkedGroup(null)} // Allow canceling
                                title="Cancel grouping"
                            >
                                ×
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. New Medication Fields - Show if no EXACT match AND NOT LINKED */}
                {!matchingMed && !linkedGroup && searchTerm.length > 0 && (
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

                        <div className="form-group">
                            <label className="form-label">Estimated Usage (Optional)</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={usageRate}
                                    onChange={e => setUsageRate(e.target.value)}
                                    placeholder="Qty"
                                    min="0"
                                    style={{ flex: 1 }}
                                />
                                <select
                                    className="form-input"
                                    value={usageFrequency}
                                    onChange={e => setUsageFrequency(e.target.value)}
                                    style={{ flex: 2 }}
                                >
                                    <option value="daily">Per Day</option>
                                    <option value="weekly">Per Week</option>
                                    <option value="monthly">Per Month</option>
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
                    </div>
                )}


                {/* 3. Restock Details - ALWAYS show if there is a search term */}
                {searchTerm.length > 0 && (
                    <div style={{ animation: 'fadeIn 0.3s ease' }}>
                        <h4 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                            {matchingMed ? `Restock ${matchingMed.name}` : 'Initial Stock'}
                        </h4>

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
                )}
            </form>
        </div>
    );
};

export default AddRestockForm;
