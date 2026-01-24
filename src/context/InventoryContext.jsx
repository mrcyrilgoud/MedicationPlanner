import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';
import { storage } from '../storage';
import { calculateRunoutDate } from '../utils/calculations';

const InventoryContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useInventory = () => useContext(InventoryContext);

const STORAGE_KEY = 'med_inventory_v1';

export const InventoryProvider = ({ children }) => {
  const [medications, setMedications] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Load from Storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Try to load from configured storage
        let loadedMeds = await storage.getMedications();
        let loadedBatches = await storage.getBatches();

        // 2. Migration Check: If IDB is empty, check legacy LocalStorage
        // Only if we are using IDB (checked via storage.type or just assumption if empty)
        if (storage.type === 'idb' && loadedMeds.length === 0 && loadedBatches.length === 0) {
          const legacyKey = 'med_inventory_v1';
          const legacyData = localStorage.getItem(legacyKey);
          if (legacyData) {
            console.log("Migrating data from LocalStorage to IndexedDB...");
            const { meds, batches: oldBatches } = JSON.parse(legacyData);
            if (meds) {
              for (const m of meds) await storage.saveMedication(m);
              loadedMeds = meds;
            }
            if (oldBatches) {
              await storage.saveBatches(oldBatches);
              loadedBatches = oldBatches;
            }
            // Optional: Allow user to revert? For now, let's keep it safe and NOT delete legacy yet.
            // localStorage.removeItem(legacyKey); 
            toast.success("Database migrated to new system!");
          }
        }

        setMedications(loadedMeds || []);
        setBatches(loadedBatches || []);
      } catch (e) {
        console.error("Failed to load inventory", e);
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [toast]); // Added toast as dependency

  // Removed the auto-save useEffect because we now save on action.
  // This prevents race conditions and excessive writes.

  const logActivity = async (actionType, data) => {
    try {
      const entry = {
        id: crypto.randomUUID(),
        actionType, // 'add_medication', 'add_stock', 'consume', 'edit', 'delete'
        data,       // Buffered object with details
        timestamp: new Date().toISOString(),
        // Fallback for older UI
        details: typeof data === 'string' ? data : ''
      };
      await storage.addHistoryEntry(entry);
    } catch (e) {
      console.error("Failed to log history", e);
    }
  };

  const addMedication = (med) => {
    const newId = crypto.randomUUID();
    const newMed = {
      ...med,
      id: newId,
      groupId: med.groupId || newId
    };

    // Optimistic Update
    setMedications(prev => [...prev, newMed]);

    // Async Save
    storage.saveMedication(newMed).then(() => {
      // Log with ID for revert capability
      logActivity('add_medication', {
        medicationId: newMed.id,
        name: newMed.name,
        unit: newMed.defaultUnit
      });
    }).catch(err => {
      console.error("Save failed", err);
      toast.error("Failed to save medication");
      // Rollback? (Complex for now, just alert)
    });

    return newMed.id;
  };

  const addBatch = (batch, medNameOverride = null) => {
    if (Number(batch.initialQuantity) <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    const newBatch = {
      ...batch,
      id: crypto.randomUUID(),
      dateAdded: new Date().toISOString(),
      currentQuantity: Number(batch.initialQuantity)
    };

    setBatches(prev => [...prev, newBatch]);
    storage.saveBatch(newBatch).then(() => {
      // Use override if provided (fixes race condition in new med creation)
      let name = medNameOverride;
      if (!name) {
        const med = medications.find(m => m.id === batch.medicationId);
        name = med ? med.name : 'Unknown Med';
      }
      logActivity('add_stock', { medicationId: batch.medicationId, name, quantity: batch.initialQuantity });
    }).catch(() => toast.error("Failed to save stock"));
    toast.success('Stock added successfully!');
  };

  const consumeMedication = (medicationId, amount) => {
    if (amount <= 0) {
      toast.warning('Please enter a valid amount.');
      return;
    }

    const totalAvailable = batches
      .filter(b => b.medicationId === medicationId)
      .reduce((sum, b) => sum + b.currentQuantity, 0);

    if (amount > totalAvailable) {
      toast.error(`Not enough stock! Available: ${totalAvailable}`);
      return;
    }

    let amountNeeded = amount;
    // Clone specifically the batches we need to modify? No, easier to clone all or map.
    // Let's do immutability correctly.
    // 1. Get relevant batches sorted
    let sortedIndices = batches
      .map((b, i) => ({ ...b, originalIndex: i }))
      .filter(b => b.medicationId === medicationId && b.currentQuantity > 0)
      .sort((a, b) => {
        const dateA = new Date(a.expiryDate);
        const dateB = new Date(b.expiryDate);
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateA - dateB;
      });

    if (sortedIndices.length === 0) {
      toast.error("No stock available!");
      return;
    }

    const newBatches = [...batches];
    const changedBatches = [];

    for (let batch of sortedIndices) {
      if (amountNeeded <= 0) break;
      const takeAmount = Math.min(batch.currentQuantity, amountNeeded);

      const newBatch = { ...newBatches[batch.originalIndex] };
      newBatch.currentQuantity -= takeAmount;

      newBatches[batch.originalIndex] = newBatch;
      changedBatches.push(newBatch);

      amountNeeded -= takeAmount;
    }

    setBatches(newBatches);

    // Persist changes
    // Since we might update multiple, we can use saveBatches or loop
    // Persist changes
    // Since we might update multiple, we can use saveBatches or loop
    storage.saveBatches(changedBatches).then(() => {
      const med = medications.find(m => m.id === medicationId);
      const name = med ? med.name : 'Unknown';
      logActivity('consume', { medicationId, name, amount });
    }).catch(() => console.error("Batch save failed"));

    toast.success('Medication consumed.');
  };

  const deleteMedication = (id) => {
    setMedications(prev => prev.filter(m => m.id !== id));
    setBatches(prev => prev.filter(b => b.medicationId !== id));

    storage.deleteMedication(id).then(() => {
      // We don't have the name here easily unless we grabbed it before delete.
      // But state update is sync, so 'medications' might still have it in this render cycle?
      // No, setMedications is async-ish. Let's rely on passed args or just say "Deleted medication".
      logActivity('delete', { id });
    }).catch(() => toast.error("Failed to delete"));
    toast.info('Medication record deleted.');
  };

  const editMedication = (id, updates) => {
    // 1. Compute new state purely
    let updatedMed = null;

    setMedications(prev => {
      const next = prev.map(m => {
        if (m.id === id) {
          updatedMed = { ...m, ...updates };
          return updatedMed;
        }
        return m;
      });
      return next;
    });

    // 2. Side effect: Save once
    if (updatedMed) {
      storage.saveMedication(updatedMed).then(() => {
        logActivity('edit', { name: updatedMed.name, updates });
      }).catch(err => {
        console.error("Failed to save edit", err);
        toast.error("Failed to save changes");
      });
      toast.success('Medication updated');
    }
  };

  const linkMedications = (primaryId, secondaryId) => {
    const primary = medications.find(m => m.id === primaryId);
    if (!primary) return;
    editMedication(secondaryId, { groupId: primary.groupId || primary.id });
    toast.success('Medications grouped successfully');
  };

  const importData = async (data) => {
    try {
      if (!data || !Array.isArray(data.medications) || !Array.isArray(data.batches)) {
        throw new Error("Invalid data format");
      }

      setLoading(true);

      // Merge logic: currently just adds/overwrites if ID exists
      for (const m of data.medications) {
        await storage.saveMedication(m);
      }
      await storage.saveBatches(data.batches);

      // Reload state
      setMedications(await storage.getMedications());
      setBatches(await storage.getBatches());

      toast.success(`Imported ${data.medications.length} medications and ${data.batches.length} batches.`);
    } catch (e) {
      console.error("Import failed", e);
      toast.error("Failed to import data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const getStats = () => {
    // Calculate global stats
    const expiringSoon = batches.filter(b => {
      // Use consistent local midnight time for expiry checks to avoid timezone issues
      const expiryDate = new Date(b.expiryDate + 'T00:00');
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Compare to start of today

      const daysUntil = (expiryDate - now) / (1000 * 60 * 60 * 24);
      return daysUntil < 30 && b.currentQuantity > 0;
    });

    const lowStock = medications.filter(med => {
      const totalStock = batches
        .filter(b => b.medicationId === med.id)
        .reduce((sum, b) => sum + b.currentQuantity, 0);
      return totalStock <= med.lowStockThreshold;
    });

    const projectedEmpty = medications.filter(med => {
      const totalStock = batches
        .filter(b => b.medicationId === med.id)
        .reduce((sum, b) => sum + b.currentQuantity, 0);

      const runout = calculateRunoutDate(totalStock, med.usageRate, med.usageFrequency);
      return runout && runout.daysUntilEmpty < 7; // Alert if less than a week
    });

    return {
      expiringSoonCount: expiringSoon.length,
      lowStockCount: lowStock.length,
      projectedEmptyCount: projectedEmpty.length
    };
  };




  const getHistoryLog = async (pagination) => {
    return await storage.getHistory(pagination);
  };

  const getHistoryTotalCount = async () => {
    return await storage.getHistoryCount();
  };

  const revertHistoryAction = async (item) => {
    try {
      if (item.actionType === 'consume') {
        const { medicationId, amount, name } = item.data;
        if (!medicationId || !amount) throw new Error("Missing data for revert");

        // Restore stock by creating a 'Restored' batch or updating existing
        const targetBatch = batches
          .filter(b => b.medicationId === medicationId)
          .sort((a, b) => new Date(b.expiryDate) - new Date(a.expiryDate))[0];

        if (targetBatch) {
          const updatedBatch = { ...targetBatch, currentQuantity: targetBatch.currentQuantity + Number(amount) };
          setBatches(prev => prev.map(b => b.id === targetBatch.id ? updatedBatch : b));
          await storage.saveBatch(updatedBatch);
        } else {
          const newBatch = {
            id: crypto.randomUUID(),
            medicationId,
            initialQuantity: amount,
            currentQuantity: amount,
            expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
            location: 'Restored',
            dateAdded: new Date().toISOString()
          };
          setBatches(prev => [...prev, newBatch]);
          await storage.saveBatch(newBatch);
        }

        await storage.deleteHistoryEntry(item.id);
        toast.success(`Reverted usage of ${amount} ${name}`);

      } else if (item.actionType === 'add_medication') {
        const { medicationId, name } = item.data;

        const created = new Date(item.timestamp);
        const diff = new Date() - created;
        if (diff > 24 * 60 * 60 * 1000) {
          toast.error("Cannot revert: Creation was more than 24h ago.");
          return;
        }

        await deleteMedication(medicationId);
        await storage.deleteHistoryEntry(item.id);
        toast.success(`Reverted creation of ${name}`);
      }
    } catch (e) {
      console.error("Revert failed", e);
      toast.error("Failed to revert action");
    }
  };

  const updateHistoryEntry = async (id, newData) => {
    try {
      await storage.updateHistoryEntry(id, newData);
      toast.success("History record updated");
    } catch (e) {
      console.error("Update failed", e);
      toast.error("Failed to update record");
    }
  };

  return (
    <InventoryContext.Provider value={{
      medications,
      batches,
      loading,
      addMedication,
      addBatch,
      consumeMedication,
      deleteMedication,
      editMedication,
      getStats,
      calculateRunoutDate,
      linkMedications,
      importData,
      getHistoryLog,
      getHistoryTotalCount,
      revertHistoryAction,
      updateHistoryEntry
    }}>
      {children}
    </InventoryContext.Provider>
  );
};
