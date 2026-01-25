import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { findBestMatch, getAllAliases } from '../utils/drugAliases';
import SearchSection from './forms/SearchSection';
import NewMedicationFields from './forms/NewMedicationFields';
import BatchFields from './forms/BatchFields';

const AddRestockForm = ({ onComplete }) => {
    const { addMedication, addBatch, medications } = useInventory();
    const toast = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [matchingMed, setMatchingMed] = useState(null);
    const [potentialMatch, setPotentialMatch] = useState(null);
    const [aliasMatch, setAliasMatch] = useState(null); // { med: object, canonical: string }
    const [linkedGroup, setLinkedGroup] = useState(null); // { id, name, groupId }

    // New Medication State
    const [unit, setUnit] = useState('pills');
    const [puffsPerCanister, setPuffsPerCanister] = useState(200);
    const [threshold, setThreshold] = useState(10);
    const [usageRate, setUsageRate] = useState('');
    const [usageFrequency, setUsageFrequency] = useState('daily');
    const [usageBasis, setUsageBasis] = useState('base'); // 'base' | 'container'
    const [medNotes, setMedNotes] = useState('');
    const [condition, setCondition] = useState('');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');

    // Batch State
    const [quantity, setQuantity] = useState(30);
    const [dosage, setDosage] = useState('');
    const [expiry, setExpiry] = useState('');
    const [location, setLocation] = useState('Cabinet');
    const [batchNotes, setBatchNotes] = useState('');

    // Effect: Search for matches
    useEffect(() => {
        if (!searchTerm) {
            setMatchingMed(null);
            setPotentialMatch(null);
            setAliasMatch(null);
            return;
        }

        const exactMatch = medications.find(m => m.name.toLowerCase() === searchTerm.toLowerCase());
        if (exactMatch) {
            setMatchingMed(exactMatch);
            setPotentialMatch(null);
            setAliasMatch(null);
            // Auto-set unit from existing med
            setUnit(exactMatch.defaultUnit);
            return;
        } else {
            setMatchingMed(null);
        }

        // Potential Matches (Typo or close string)
        const candidates = medications.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (candidates.length > 0) {
            // Simple heuristic: if we have a very close match
            setPotentialMatch(candidates[0]);
        } else {
            setPotentialMatch(null);
        }

        // Alias Logic
        if (!exactMatch && !candidates.length) {
            // Try to find if the input is an alias for an existing drug
            const best = findBestMatch(searchTerm);
            if (best) {
                // Check if we have this generic in our inventory
                const existing = medications.find(m =>
                    m.name.toLowerCase() === best.canonical.toLowerCase() ||
                    m.tags?.includes(best.canonical)
                );

                if (existing) {
                    setAliasMatch({ med: existing, canonical: best.canonical });
                }
            }
        }

    }, [searchTerm, medications]);

    const handleUnifiedSubmit = async (e) => {
        e.preventDefault();

        let targetMedId;

        // 1. Create Med if doesn't exist
        if (!matchingMed) {
            // Validation
            if (Number(threshold) < 0) {
                toast.error('Low stock threshold cannot be negative');
                return;
            }

            const medData = {
                name: searchTerm,
                defaultUnit: unit,
                lowStockThreshold: Number(threshold),
                usageRate: usageRate ? (unit === 'inhaler' && usageBasis === 'container'
                    ? Number(usageRate) * (Number(puffsPerCanister) || 200)
                    : Number(usageRate)) : null,
                usageFrequency: usageRate ? usageFrequency : null,
                notes: medNotes,
                condition: condition,
                puffsPerCanister: unit === 'inhaler' ? Number(puffsPerCanister) : null,
                tags: tags
            };

            // If we have a linked group, assign the groupId
            if (linkedGroup) {
                medData.groupId = linkedGroup.groupId || linkedGroup.id;
            }

            targetMedId = await addMedication(medData);

            let msg = 'Created ' + searchTerm;
            if (linkedGroup) {
                msg = 'Created ' + searchTerm + ' (Grouped with ' + linkedGroup.name + ')';
            }
            toast.success(msg);
            setMedNotes('');
            setCondition('');
            setTags([]);
        } else {
            targetMedId = matchingMed.id;
        }

        // 2. Add Batch
        if (!quantity || !expiry) {
            toast.error('Please fill in quantity and expiration date');
            return;
        }

        if (Number(quantity) <= 0) {
            toast.error('Quantity must be greater than 0');
            return;
        }

        // Calculate actual quantity to store
        // If inhaler, store TOTAL PUFFS (Canisters * PuffsPerCanister)
        let quantityToStore = Number(quantity);
        let finalPuffsPerCanister = puffsPerCanister;

        // If adding to existing med, check its unit/settings
        if (matchingMed && matchingMed.defaultUnit === 'inhaler') {
            // Use the med's setting, or if not present, the default
            finalPuffsPerCanister = matchingMed.puffsPerCanister || 200;
            quantityToStore = quantityToStore * finalPuffsPerCanister;
        } else if (!matchingMed && unit === 'inhaler') {
            finalPuffsPerCanister = Number(puffsPerCanister) || 200; // Default to 200 if invalid
            quantityToStore = quantityToStore * finalPuffsPerCanister;
        }

        await addBatch({
            medicationId: targetMedId,
            initialQuantity: quantityToStore,
            expiryDate: expiry,
            location,
            dosage,
            notes: batchNotes
        }, matchingMed ? matchingMed.name : searchTerm);

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
    };

    const confirmAliasGroup = () => {
        if (!aliasMatch) return;
        const parent = aliasMatch.med;
        setLinkedGroup(parent);
        setUnit(parent.defaultUnit);
        setThreshold(parent.lowStockThreshold);
        if (parent.usageRate) setUsageRate(parent.usageRate);
        if (parent.usageFrequency) setUsageFrequency(parent.usageFrequency);
        setAliasMatch(null);
    };

    return (
        <div className="add-form-container">
            <form onSubmit={handleUnifiedSubmit}>
                <SearchSection
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    matchingMed={matchingMed}
                    potentialMatch={potentialMatch}
                    confirmMatch={confirmMatch}
                    aliasMatch={aliasMatch}
                    confirmAliasGroup={confirmAliasGroup}
                    linkedGroup={linkedGroup}
                    setLinkedGroup={setLinkedGroup}
                />

                <NewMedicationFields
                    isVisible={!matchingMed && !linkedGroup && searchTerm.length > 0}
                    unit={unit}
                    setUnit={setUnit}
                    puffsPerCanister={puffsPerCanister}
                    setPuffsPerCanister={setPuffsPerCanister}
                    threshold={threshold}
                    setThreshold={setThreshold}
                    usageRate={usageRate}
                    setUsageRate={setUsageRate}
                    usageBasis={usageBasis}
                    setUsageBasis={setUsageBasis}
                    usageFrequency={usageFrequency}
                    setUsageFrequency={setUsageFrequency}
                    medNotes={medNotes}
                    setMedNotes={setMedNotes}
                    condition={condition}
                    setCondition={setCondition}
                    tags={tags}
                    setTags={setTags}
                    tagInput={tagInput}
                    setTagInput={setTagInput}
                />

                <BatchFields
                    isVisible={searchTerm.length > 0}
                    matchingMed={matchingMed}
                    unit={unit}
                    quantity={quantity}
                    setQuantity={setQuantity}
                    expiry={expiry}
                    setExpiry={setExpiry}
                    dosage={dosage}
                    setDosage={setDosage}
                    location={location}
                    setLocation={setLocation}
                    batchNotes={batchNotes}
                    setBatchNotes={setBatchNotes}
                />
            </form >
        </div >
    );
};

export default AddRestockForm;
