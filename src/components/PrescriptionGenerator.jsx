import React, { useCallback, useMemo, useState } from 'react';
import {
  Printer,
  ShoppingCart,
  Calculator,
  StickyNote,
  Copy,
  Share2,
  CheckSquare
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import {
    convertInhalerDisplayToStored,
    convertStoredToInhalerDisplay,
    getDailyUsageQuantityForMedication,
    getLowStockThresholdQuantity
} from '../utils/calculations';

const PrescriptionGenerator = ({ initialMedicationId = null }) => {
  const { activeMedications, batches, batchStatsByMedication } = useInventory();
  const toast = useToast();

  const [globalMonths, setGlobalMonths] = useState(1);
  const [selectionOverrides, setSelectionOverrides] = useState({});
  const [checkedItems, setCheckedItems] = useState({});

  const medicationMap = useMemo(() => {
    const map = new Map();
    activeMedications.forEach((medication) => {
      map.set(medication.id, medication);
    });
    return map;
  }, [activeMedications]);

  const getDailyRate = (medication) => getDailyUsageQuantityForMedication(medication);

  const convertDisplayAmount = (quantity, medication) => (
    convertStoredToInhalerDisplay(quantity, medication)
  );

  const convertDisplayAmountToStored = (displayAmount, medication) => (
    convertInhalerDisplayToStored(displayAmount, medication)
  );

  const getDisplayUnit = (medication) => (
    medication.defaultUnit === 'inhaler' ? 'canisters' : medication.defaultUnit
  );

  const calculateNeed = useCallback((medication, months) => {
    const dailyRate = getDailyRate(medication);
    if (!dailyRate) return null;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + Math.ceil(months * 30));

    const medicationBatches = batches.filter((batch) => batch.medicationId === medication.id);
    const expiringWithinWindow = medicationBatches
      .filter((batch) => new Date(`${batch.expiryDate}T00:00:00`) < targetDate)
      .reduce((sum, batch) => sum + Number(batch.currentQuantity || 0), 0);
    const currentStock = batchStatsByMedication[medication.id]?.availableQty
      ?? batchStatsByMedication[medication.id]?.totalQty
      ?? 0;
    const effectiveStock = Math.max(0, currentStock - expiringWithinWindow);
    const targetTotal = dailyRate * 30 * months;

    return {
      amount: Math.max(0, Math.ceil(targetTotal - effectiveStock)),
      currentStock,
      expiringWithinWindow,
      effectiveStock,
      dailyRate
    };
  }, [batchStatsByMedication, batches]);

  const selectedMeds = useMemo(() => {
    const next = {};

    activeMedications.forEach((medication) => {
      const calculation = calculateNeed(medication, 1);
      const currentStock = batchStatsByMedication[medication.id]?.availableQty
      ?? batchStatsByMedication[medication.id]?.totalQty
      ?? 0;
      const isLowStock = currentStock <= getLowStockThresholdQuantity(medication);
      const override = selectionOverrides[medication.id];
      const usageKnown = Boolean(getDailyRate(medication));
      const selectedByDefault = usageKnown && (medication.id === initialMedicationId || isLowStock);

      next[medication.id] = {
        selected: usageKnown ? (override?.selected ?? selectedByDefault) : false,
        amount: override?.amount ?? (calculation ? Math.max(calculation.amount, selectedByDefault ? 1 : 0) : 0),
        months: override?.months ?? 1,
        notes: override?.notes ?? '',
        currentStock,
        usageKnown,
        calculation,
        unit: getDisplayUnit(medication),
        displayCurrentStock: convertDisplayAmount(currentStock, medication),
        displayAmount: convertDisplayAmount(override?.amount ?? calculation?.amount ?? 0, medication)
      };
    });

    return next;
  }, [activeMedications, batchStatsByMedication, calculateNeed, initialMedicationId, selectionOverrides]);

  const sortedMedications = useMemo(() => (
    [...activeMedications].sort((left, right) => {
      const leftItem = selectedMeds[left.id];
      const rightItem = selectedMeds[right.id];
      if (leftItem.selected !== rightItem.selected) {
        return leftItem.selected ? -1 : 1;
      }
      const leftUrgency = leftItem.calculation?.amount || 0;
      const rightUrgency = rightItem.calculation?.amount || 0;
      return rightUrgency - leftUrgency || left.name.localeCompare(right.name);
    })
  ), [activeMedications, selectedMeds]);

  const selectedItems = sortedMedications.filter((medication) => {
    const item = selectedMeds[medication.id];
    return Boolean(item?.selected && item?.usageKnown);
  });
  const unknownUsageItems = sortedMedications.filter((medication) => !selectedMeds[medication.id]?.usageKnown);
  const selectableMedicationCount = activeMedications.filter((medication) => selectedMeds[medication.id]?.usageKnown).length;
  const selectedSelectableCount = activeMedications.filter((medication) => {
    const item = selectedMeds[medication.id];
    return Boolean(item?.usageKnown && item?.selected);
  }).length;
  const allSelectableSelected = selectableMedicationCount > 0 && selectedSelectableCount === selectableMedicationCount;

  const handleGlobalMonthsChange = (value) => {
    const nextMonths = Math.max(0.1, Number(value));
    setGlobalMonths(nextMonths);

    setSelectionOverrides((prev) => {
      const next = { ...prev };
      Object.keys(selectedMeds).forEach((id) => {
        const medication = medicationMap.get(id);
        const item = selectedMeds[id];
        const calculation = calculateNeed(medication, nextMonths);
        if (!item?.selected || !calculation) return;
        next[id] = {
          ...item,
          months: nextMonths,
          amount: calculation.amount
        };
      });
      return next;
    });
  };

  const handleToggle = (id) => {
    const item = selectedMeds[id];
    const medication = medicationMap.get(id);
    const selected = !item.selected;
    const calculation = selected ? calculateNeed(medication, globalMonths) : null;
    setSelectionOverrides((prev) => ({
      ...prev,
      [id]: {
        ...item,
        selected,
        months: selected ? globalMonths : item.months,
        amount: selected
          ? (calculation ? Math.max(calculation.amount, 1) : item.amount)
          : item.amount
      }
    }));
  };

  const handleItemMonthChange = (id, months) => {
    const nextMonths = Math.max(0.1, Number(months));
    const medication = medicationMap.get(id);
    const calculation = calculateNeed(medication, nextMonths);
    setSelectionOverrides((prev) => ({
      ...prev,
      [id]: {
        ...selectedMeds[id],
        months: nextMonths,
        amount: calculation ? calculation.amount : selectedMeds[id].amount
      }
    }));
  };

  const handleAmountChange = (id, medication, amount) => {
    const storedAmount = convertDisplayAmountToStored(amount, medication);
    setSelectionOverrides((prev) => ({
      ...prev,
      [id]: { ...selectedMeds[id], amount: storedAmount }
    }));
  };

  const handleNoteChange = (id, note) => {
    setSelectionOverrides((prev) => ({
      ...prev,
      [id]: { ...selectedMeds[id], notes: note }
    }));
  };

  const handleSelectAll = () => {
    setSelectionOverrides((prev) => {
      const next = { ...prev };
      Object.keys(selectedMeds).forEach((id) => {
        if (!selectedMeds[id].usageKnown) return;
        const medication = medicationMap.get(id);
        const calculation = calculateNeed(medication, globalMonths);
        next[id] = {
          ...selectedMeds[id],
          selected: true,
          months: globalMonths,
          amount: calculation ? Math.max(calculation.amount, 1) : selectedMeds[id].amount
        };
      });
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelectionOverrides((prev) => {
      const next = { ...prev };
      Object.keys(selectedMeds).forEach((id) => {
        next[id] = {
          ...selectedMeds[id],
          selected: false
        };
      });
      return next;
    });
  };

  const buildShareText = () => {
    if (selectedItems.length === 0) return 'No items selected.';

    return selectedItems.map((medication) => {
      const item = selectedMeds[medication.id];
      const displayAmount = convertDisplayAmount(item.amount, medication);
      return `- ${medication.name}: ${displayAmount} ${getDisplayUnit(medication)}${item.notes ? ` (${item.notes})` : ''}`;
    }).join('\n');
  };

  const handleCopy = async () => {
    if (!navigator.clipboard) {
      toast.error('Clipboard is not available in this browser.');
      return;
    }
    try {
      await navigator.clipboard.writeText(buildShareText());
      toast.success('Shopping list copied.');
    } catch {
      toast.error('Clipboard copy failed.');
    }
  };

  const handleShare = async () => {
    const text = buildShareText();
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Medication Shopping List', text });
        return;
      } catch (error) {
        if (error.name !== 'AbortError') {
          toast.error('Sharing failed.');
        }
        return;
      }
    }
    handleCopy();
  };

  const handlePrint = () => window.print();

  return (
    <div className="prescription-container" style={{ padding: '0 1rem', maxWidth: '900px', margin: '0 auto' }}>
      <div className="shopping-header no-print">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <ShoppingCart size={28} /> Shopping List Generator
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Only medications with a usage estimate are auto-calculated. Unknown usage stays visible until you set it manually.
          </p>
        </div>

        <div className="shopping-action-row">
          <button
            className="btn secondary"
            style={{ width: 'auto' }}
            onClick={allSelectableSelected ? handleDeselectAll : handleSelectAll}
            disabled={selectableMedicationCount === 0}
          >
            {allSelectableSelected ? 'Deselect All' : 'Select All'}
          </button>
          <button className="btn secondary" style={{ width: 'auto' }} onClick={handleCopy}>
            <Copy size={16} /> Copy
          </button>
          <button className="btn secondary" style={{ width: 'auto' }} onClick={handleShare}>
            <Share2 size={16} /> Share
          </button>
          <button className="btn primary" style={{ width: 'auto' }} onClick={handlePrint}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      <div className="shopping-config-card no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calculator size={20} />
          <span style={{ fontWeight: 600 }}>Target Supply</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={globalMonths}
            onChange={(event) => handleGlobalMonthsChange(event.target.value)}
            className="form-input"
            style={{ width: '80px' }}
          />
          <span>Months</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          Calculations discount stock that expires before the selected window.
        </p>
      </div>

      {unknownUsageItems.length > 0 && (
        <div className="shopping-warning-card no-print">
          <h3>Needs usage estimate</h3>
          <p>These medications stay out of auto-calculated totals until you set a usage estimate in inventory.</p>
          <div className="shopping-warning-list">
            {unknownUsageItems.map((medication) => (
              <span key={medication.id}>{medication.name}</span>
            ))}
          </div>
        </div>
      )}

      <div className="selection-list no-print">
        {sortedMedications.length === 0 ? (
          <p>No medications found.</p>
        ) : (
          sortedMedications.map((medication) => {
            const item = selectedMeds[medication.id];
            if (!item) return null;

            return (
              <div key={medication.id} className={`shopping-item-card ${item.selected ? 'selected' : ''}`}>
                <div className="shopping-item-header">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    disabled={!item.usageKnown}
                    onChange={() => handleToggle(medication.id)}
                    style={{ width: '24px', height: '24px', accentColor: 'var(--primary)' }}
                  />

                  <div style={{ flex: 1 }}>
                    <div className="shopping-item-title">{medication.name}</div>
                    <div className="shopping-item-meta">
                      Stock: {item.displayCurrentStock} {item.unit}
                      {!item.usageKnown && <span className="shopping-warning-pill">Usage estimate needed</span>}
                      {item.calculation?.expiringWithinWindow > 0 && (
                        <span className="shopping-warning-pill">
                          {convertDisplayAmount(item.calculation.expiringWithinWindow, medication)} {item.unit} expire before target
                        </span>
                      )}
                    </div>
                  </div>

                  {item.selected && item.usageKnown && (
                    <div style={{ textAlign: 'right' }}>
                      <div className="shopping-amount-value">{convertDisplayAmount(item.amount, medication)}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.unit}</div>
                    </div>
                  )}
                </div>

                {item.selected && item.usageKnown && (
                  <div className="shopping-item-body">
                    <div className="shopping-grid">
                      <div>
                        <label className="form-label">Target Supply</label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          className="form-input"
                          value={item.months}
                          onChange={(event) => handleItemMonthChange(medication.id, event.target.value)}
                        />
                      </div>

                      <div>
                        <label className="form-label">Exact Amount</label>
                        <input
                          type="number"
                          className="form-input"
                          value={convertDisplayAmount(item.amount, medication)}
                          onChange={(event) => handleAmountChange(medication.id, medication, event.target.value)}
                        />
                      </div>
                    </div>

                    <div className="shopping-calculation-note">
                      Uses {item.calculation?.dailyRate?.toFixed(2)} per day with {convertDisplayAmount(item.calculation?.effectiveStock || 0, medication)} {item.unit} counted as usable.
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <StickyNote size={16} color="var(--text-secondary)" />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Note for shopping"
                        value={item.notes}
                        onChange={(event) => handleNoteChange(medication.id, event.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedItems.length > 0 && (
        <div className="shopping-checklist no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <CheckSquare size={18} />
            <h3>Store Checklist</h3>
          </div>
          <div className="shopping-checklist-list">
            {selectedItems.map((medication) => {
              const item = selectedMeds[medication.id];
              const checked = checkedItems[medication.id] || false;
              return (
                <label key={medication.id} className={`shopping-checklist-item ${checked ? 'done' : ''}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setCheckedItems((prev) => ({ ...prev, [medication.id]: !checked }))}
                  />
                  <span>{medication.name} • {convertDisplayAmount(item.amount, medication)} {item.unit}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="print-only">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderBottom: '2px solid #000',
          paddingBottom: '1rem',
          marginBottom: '1rem'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24pt' }}>Medication Shopping List</h1>
            <p style={{ margin: '5px 0 0 0', color: '#666' }}>Generated: {new Date().toLocaleDateString()}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10pt', color: '#888' }}>Target: {globalMonths} month supply</div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12pt' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333' }}>
              <th style={{ textAlign: 'left', padding: '8px', width: '40px' }}>Check</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Medication</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Notes</th>
              <th style={{ textAlign: 'right', padding: '8px', width: '100px' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '8px', width: '100px' }}>Unit</th>
            </tr>
          </thead>
          <tbody>
            {selectedItems.map((medication) => {
              const item = selectedMeds[medication.id];
              return (
                <tr key={medication.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ width: '20px', height: '20px', border: '2px solid #000' }}></div>
                  </td>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{medication.name}</td>
                  <td style={{ padding: '12px 8px', fontStyle: 'italic', color: '#444' }}>{item.notes}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.2em' }}>
                    {convertDisplayAmount(item.amount, medication)}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', color: '#666' }}>
                    {item.unit}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PrescriptionGenerator;
