import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { useToast } from '../context/ToastContext';
import { Printer, ShoppingCart, Calculator, StickyNote } from 'lucide-react';

const PrescriptionGenerator = () => {
  const { medications, batches } = useInventory();
  const toast = useToast();

  // State 
  const [globalMonths, setGlobalMonths] = useState(1);
  const [selectedMeds, setSelectedMeds] = useState({});
  // { medId: { selected: bool, amount: number, months: number, notes: string, currentStock: number } }

  // Calculation Helper
  const calculateNeed = (med, currentStock, months) => {
    let dailyRate = 1; // Default to 1/day if not set

    if (med.usageRate && Number(med.usageRate) > 0) {
      dailyRate = Number(med.usageRate);
      if (med.usageFrequency === 'weekly') dailyRate /= 7;
      if (med.usageFrequency === 'monthly') dailyRate /= 30;
    }

    // Target Total
    const targetTotal = dailyRate * 30 * months;
    const need = Math.max(0, Math.ceil(targetTotal - currentStock));

    return need;
  };

  // Initialize selection
  useEffect(() => {
    // Better: Compute "diff"
    setSelectedMeds(prev => {
      const next = { ...prev };

      medications.forEach(med => {
        // If already exists, keep it (updates to stock will happen below)
        const existing = next[med.id];

        const totalStock = batches
          .filter(b => b.medicationId === med.id)
          .reduce((sum, b) => sum + b.currentQuantity, 0);

        const isLowStock = totalStock <= med.lowStockThreshold;

        if (!existing) {
          // New Entry
          const months = 1;
          const amount = calculateNeed(med, totalStock, months);

          next[med.id] = {
            selected: isLowStock,
            amount: isLowStock ? Math.max(amount, 1) : amount, // If low, at least suggest 1
            months: 1,
            notes: '',
            currentStock: totalStock,
            name: med.name,
            unit: med.defaultUnit
          };
        } else {
          // Update Stock and Metadata (Name/Unit might have changed)
          next[med.id] = {
            ...existing,
            currentStock: totalStock,
            name: med.name,
            unit: med.defaultUnit
          };
        }
      });
      return next;
    });
  }, [medications, batches]);

  // Handle Global Months Change
  const handleGlobalMonthsChange = (val) => {
    const newMonths = Math.max(0.1, Number(val));
    setGlobalMonths(newMonths);

    // Update all selected items to this new default
    setSelectedMeds(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(key => {
        const med = medications.find(m => m.id === key);
        if (med && next[key].selected) {
          next[key].months = newMonths;
          next[key].amount = calculateNeed(med, next[key].currentStock, newMonths);
        }
      });
      return next;
    });
  };

  const handleToggle = (id) => {
    setSelectedMeds(prev => {
      const item = prev[id];
      const newVal = !item.selected;

      // If turning ON, maybe recalculate amount based on current global months just to be fresh
      let newAmount = item.amount;
      let newMonths = item.months;

      if (newVal) {
        newMonths = globalMonths;
        const med = medications.find(m => m.id === id);
        newAmount = calculateNeed(med, item.currentStock, newMonths);
        // Ensure at least 1 if we are turning it on manually? Optional.
        if (newAmount === 0 && newVal) newAmount = 1;
      }

      return {
        ...prev,
        [id]: { ...item, selected: newVal, months: newMonths, amount: newAmount }
      };
    });
  };

  const handleItemMonthChange = (id, months) => {
    const val = Math.max(0.1, Number(months));
    setSelectedMeds(prev => {
      const med = medications.find(m => m.id === id);
      const amount = calculateNeed(med, prev[id].currentStock, val);
      return {
        ...prev,
        [id]: { ...prev[id], months: val, amount }
      };
    });
  };

  const handleAmountChange = (id, newAmount) => {
    setSelectedMeds(prev => ({
      ...prev,
      [id]: { ...prev[id], amount: Number(newAmount) }
    }));
  };

  const handleNoteChange = (id, note) => {
    setSelectedMeds(prev => ({
      ...prev,
      [id]: { ...prev[id], notes: note }
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const getSelectedCount = () => Object.values(selectedMeds).filter(m => m.selected).length;

  return (
    <div className="prescription-container" style={{ padding: '0 1rem', maxWidth: '800px', margin: '0 auto' }}>

      {/* HEADER */}
      <div className="no-print">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ShoppingCart size={28} /> Shopping List Generator
        </h2>

        <div style={{
          background: 'var(--bg-secondary)',
          padding: '1rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calculator size={20} />
            <span style={{ fontWeight: '500' }}>Target Supply:</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={globalMonths}
              onChange={(e) => handleGlobalMonthsChange(e.target.value)}
              style={{
                width: '70px',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
            />
            <span>Months</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            (Autofills amount based on regular usage. Defaults to 1/day if unknown.)
          </p>
        </div>

        {/* Global Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          {getSelectedCount() === medications.length ? (
            <button
              onClick={() => {
                setSelectedMeds(prev => {
                  const next = { ...prev };
                  Object.keys(next).forEach(key => next[key].selected = false);
                  return next;
                });
              }}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Deselect All
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedMeds(prev => {
                  const next = { ...prev };
                  Object.keys(next).forEach(key => {
                    next[key].selected = true;
                    // Recalculate amount just in case
                    const med = medications.find(m => m.id === key);
                    if (med) {
                      next[key].amount = calculateNeed(med, next[key].currentStock, next[key].months || globalMonths);
                      if (next[key].amount === 0) next[key].amount = 1;
                    }
                  });
                  return next;
                });
              }}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Select All
            </button>
          )}
        </div>
      </div>

      {/* SELECTION LIST */}
      <div className="selection-list no-print" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem',
        marginBottom: '100px' // Space for floating footer
      }}>
        {medications.length === 0 ? (
          <p>No medications found.</p>
        ) : (
          medications
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(med => {
              const item = selectedMeds[med.id];
              if (!item) return null;

              const isExpanded = item.selected;

              return (
                <div key={med.id} style={{
                  padding: '1rem',
                  background: item.selected ? 'rgba(56, 189, 248, 0.05)' : 'var(--bg-card)',
                  border: `1px solid ${item.selected ? 'var(--primary)' : 'var(--border-color)'} `,
                  borderRadius: '12px',
                  transition: 'all 0.2s',
                }}>
                  {/* Top Row: Basic Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => handleToggle(med.id)}
                      style={{ width: '24px', height: '24px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{med.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Stock: {item.currentStock} {med.defaultUnit}
                        {item.currentStock <= med.lowStockThreshold && <span style={{ color: '#ef4444', marginLeft: '0.5rem', fontWeight: 'bold' }}>(Low)</span>}
                      </div>
                    </div>

                    {/* Quick View of Amount if selected (collapsed view) */}
                    {isExpanded && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{item.amount}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{med.defaultUnit}</div>
                      </div>
                    )}
                  </div>

                  {/* Extended Options (Only when selected) */}
                  {isExpanded && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                      {/* Calculation Controls */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Target Supply</label>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={item.months}
                            onChange={(e) => handleItemMonthChange(med.id, e.target.value)}
                            style={{ width: '60px', padding: '6px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
                          />
                          <span style={{ fontSize: '0.9rem' }}>Months</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Exact Amount</label>
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) => handleAmountChange(med.id, e.target.value)}
                          style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
                        />
                      </div>

                      {/* Notes - Full Width */}
                      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <StickyNote size={16} color="var(--text-secondary)" />
                        <input
                          type="text"
                          placeholder="Note for shopping (e.g. 'Brand name only')"
                          value={item.notes}
                          onChange={(e) => handleNoteChange(med.id, e.target.value)}
                          style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'white' }}
                        />
                      </div>

                    </div>
                  )}
                </div>
              );
            })
        )}
      </div>

      {/* FOOTER ACTION */}
      <div className="no-print" style={{
        position: 'fixed',
        bottom: '80px', // Above bottom nav
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '400px',
        background: 'var(--primary)',
        padding: '1rem',
        borderRadius: '50px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100
      }}>
        <button
          onClick={handlePrint}
          disabled={getSelectedCount() === 0}
          style={{
            background: 'transparent',
            color: 'white',
            border: 'none',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            cursor: getSelectedCount() > 0 ? 'pointer' : 'not-allowed',
            opacity: getSelectedCount() > 0 ? 1 : 0.5
          }}
        >
          <Printer size={24} />
          Print List ({getSelectedCount()})
        </button>
      </div>

      {/* PRINT-ONLY VIEW */}
      <div className="print-only">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24pt' }}>Medication List</h1>
            <p style={{ margin: '5px 0 0 0', color: '#666' }}>Generated: {new Date().toLocaleDateString()}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10pt', color: '#888' }}>Target: {globalMonths} Month Supply</div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12pt' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #333' }}>
              <th style={{ textAlign: 'left', padding: '8px', width: '40px' }}>Check</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Medication</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Notes</th>
              <th style={{ textAlign: 'right', padding: '8px', width: '100px' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '8px', width: '80px' }}>Unit</th>
            </tr>
          </thead>
          <tbody>
            {medications
              .filter(med => selectedMeds[med.id]?.selected)
              .map(med => (
                <tr key={med.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ width: '20px', height: '20px', border: '2px solid #000' }}></div>
                  </td>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>
                    {med.name}
                  </td>
                  <td style={{ padding: '12px 8px', fontStyle: 'italic', color: '#444' }}>
                    {selectedMeds[med.id]?.notes}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '1.2em' }}>
                    {selectedMeds[med.id]?.amount}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', color: '#666' }}>
                    {med.defaultUnit}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {getSelectedCount() === 0 && (
          <p style={{ textAlign: 'center', marginTop: '2rem', fontStyle: 'italic' }}>No items selected.</p>
        )}
      </div>

    </div>
  );
};

export default PrescriptionGenerator;
