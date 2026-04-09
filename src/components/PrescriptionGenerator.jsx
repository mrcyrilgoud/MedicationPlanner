import React, { useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Printer, ShoppingCart, Calculator, StickyNote } from 'lucide-react';

const PrescriptionGenerator = () => {
  const { medications, batchStatsByMedication } = useInventory();

  const [globalMonths, setGlobalMonths] = useState(1);
  const [selectionOverrides, setSelectionOverrides] = useState({});

  const medicationMap = useMemo(() => {
    const map = new Map();
    medications.forEach((med) => {
      map.set(med.id, med);
    });
    return map;
  }, [medications]);

  const calculateNeed = (med, currentStock, months) => {
    let dailyRate = 1;

    if (med.usageRate && Number(med.usageRate) > 0) {
      dailyRate = Number(med.usageRate);
      if (med.usageFrequency === 'weekly') dailyRate /= 7;
      if (med.usageFrequency === 'monthly') dailyRate /= 30;
    }

    const targetTotal = dailyRate * 30 * months;
    return Math.max(0, Math.ceil(targetTotal - currentStock));
  };

  const selectedMeds = useMemo(() => {
    const next = {};

    medications.forEach((med) => {
      const currentStock = batchStatsByMedication[med.id]?.totalQty || 0;
      const isLowStock = currentStock <= med.lowStockThreshold;
      const baseAmount = calculateNeed(med, currentStock, 1);
      const override = selectionOverrides[med.id];

      next[med.id] = {
        selected: override?.selected ?? isLowStock,
        amount: override?.amount ?? (isLowStock ? Math.max(baseAmount, 1) : baseAmount),
        months: override?.months ?? 1,
        notes: override?.notes ?? '',
        currentStock,
        name: med.name,
        unit: med.defaultUnit
      };
    });

    return next;
  }, [batchStatsByMedication, medications, selectionOverrides]);

  const sortedMedications = useMemo(
    () => [...medications].sort((a, b) => a.name.localeCompare(b.name)),
    [medications]
  );

  const getSelectedCount = () => Object.values(selectedMeds).filter((med) => med.selected).length;

  const handleGlobalMonthsChange = (val) => {
    const newMonths = Math.max(0.1, Number(val));
    setGlobalMonths(newMonths);

    setSelectionOverrides((prev) => {
      const next = { ...prev };

      Object.keys(selectedMeds).forEach((key) => {
        const med = medicationMap.get(key);
        const item = selectedMeds[key];

        if (med && item?.selected) {
          next[key] = {
            ...item,
            months: newMonths,
            amount: calculateNeed(med, item.currentStock, newMonths)
          };
        }
      });

      return next;
    });
  };

  const handleToggle = (id) => {
    setSelectionOverrides((prev) => {
      const item = selectedMeds[id];
      const selected = !item.selected;
      let amount = item.amount;
      let months = item.months;

      if (selected) {
        months = globalMonths;
        amount = calculateNeed(medicationMap.get(id), item.currentStock, months);
        if (amount === 0) amount = 1;
      }

      return {
        ...prev,
        [id]: { ...item, selected, months, amount }
      };
    });
  };

  const handleItemMonthChange = (id, months) => {
    const nextMonths = Math.max(0.1, Number(months));

    setSelectionOverrides((prev) => {
      const item = selectedMeds[id];
      const med = medicationMap.get(id);

      return {
        ...prev,
        [id]: {
          ...item,
          months: nextMonths,
          amount: calculateNeed(med, item.currentStock, nextMonths)
        }
      };
    });
  };

  const handleAmountChange = (id, newAmount) => {
    setSelectionOverrides((prev) => ({
      ...prev,
      [id]: { ...selectedMeds[id], amount: Number(newAmount) }
    }));
  };

  const handleNoteChange = (id, note) => {
    setSelectionOverrides((prev) => ({
      ...prev,
      [id]: { ...selectedMeds[id], notes: note }
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDeselectAll = () => {
    setSelectionOverrides((prev) => {
      const next = { ...prev };

      Object.keys(selectedMeds).forEach((key) => {
        next[key] = { ...selectedMeds[key], selected: false };
      });

      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectionOverrides((prev) => {
      const next = { ...prev };

      Object.keys(selectedMeds).forEach((key) => {
        const med = medicationMap.get(key);
        const item = selectedMeds[key];
        const amount = calculateNeed(med, item.currentStock, item.months || globalMonths);

        next[key] = {
          ...item,
          selected: true,
          amount: amount === 0 ? 1 : amount
        };
      });

      return next;
    });
  };

  return (
    <div className="prescription-container" style={{ padding: '0 1rem', maxWidth: '800px', margin: '0 auto' }}>
      <div className="no-print">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ShoppingCart size={28} /> Shopping List Generator
        </h2>

        <div
          style={{
            background: 'var(--bg-secondary)',
            padding: '1rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          {getSelectedCount() === medications.length ? (
            <button
              onClick={handleDeselectAll}
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
              onClick={handleSelectAll}
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

      <div
        className="selection-list no-print"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.8rem',
          marginBottom: '100px'
        }}
      >
        {sortedMedications.length === 0 ? (
          <p>No medications found.</p>
        ) : (
          sortedMedications.map((med) => {
            const item = selectedMeds[med.id];
            if (!item) return null;

            const isExpanded = item.selected;

            return (
              <div
                key={med.id}
                style={{
                  padding: '1rem',
                  background: item.selected ? 'rgba(56, 189, 248, 0.05)' : 'var(--bg-card)',
                  border: `1px solid ${item.selected ? 'var(--primary)' : 'var(--border-color)'}`,
                  borderRadius: '12px',
                  transition: 'all 0.2s'
                }}
              >
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
                      {item.currentStock <= med.lowStockThreshold && (
                        <span style={{ color: '#ef4444', marginLeft: '0.5rem', fontWeight: 'bold' }}>(Low)</span>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{item.amount}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{med.defaultUnit}</div>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div
                    style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border-color)',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '1rem'
                    }}
                  >
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

      <div
        className="no-print"
        style={{
          position: 'fixed',
          bottom: '80px',
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
        }}
      >
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

      <div className="print-only">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            borderBottom: '2px solid #000',
            paddingBottom: '1rem',
            marginBottom: '1rem'
          }}
        >
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
            {sortedMedications
              .filter((med) => selectedMeds[med.id]?.selected)
              .map((med) => (
                <tr key={med.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ width: '20px', height: '20px', border: '2px solid #000' }}></div>
                  </td>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{med.name}</td>
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
