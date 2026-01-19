import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';
import { saveImage, getImage, deleteImage as deleteImageFromDb } from '../utils/db';

const InventoryContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useInventory = () => useContext(InventoryContext);

const STORAGE_KEY = 'med_inventory_v1';

export const InventoryProvider = ({ children }) => {
  const [medications, setMedications] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const { meds, batches: storedBatches } = JSON.parse(storedData);
        setMedications(meds || []);
        setBatches(storedBatches || []);
      }
    } catch (e) {
      console.error("Failed to load inventory", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save to LocalStorage whenever data changes
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ meds: medications, batches }));
    }
  }, [medications, batches, loading]);

  // Import alias utility (assuming it's in a utils folder, user might need to move it or I can inline if they prefer single file for now)
  // Since I created the file, I can import it. But I need to make sure the import path is correct. 
  // Wait, I cannot edit imports easily with replace_file_content if I am not targeting the top.
  // I will just add the helper logic here using the utils if I can import it, or just inline the functionality via the helper function.
  // Actually, I need to add the import statement at the top first. I'll do that in a separate step or try to do it all if I can see the top.

  const addMedication = (med) => {
    const newId = crypto.randomUUID();
    const newMed = {
      ...med,
      id: newId,
      groupId: med.groupId || newId // Default to own ID if no group provided
    };
    setMedications(prev => [...prev, newMed]);
    return newMed.id;
  };

  const addBatch = (batch) => {
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
    toast.success('Stock added successfully!');
  };

  const consumeMedication = (medicationId, amount) => {
    // 1. Validation: Amount must be positive
    if (amount <= 0) {
      toast.warning('Please enter a valid amount.');
      return;
    }

    // 2. FIFO Logic: Find oldest non-empty batches
    // specific logic: sort by expiryDate ASC

    // Calculate total available first to prevent partial consumption
    const totalAvailable = batches
      .filter(b => b.medicationId === medicationId)
      .reduce((sum, b) => sum + b.currentQuantity, 0);

    if (amount > totalAvailable) {
      toast.error(`Not enough stock! Available: ${totalAvailable}`);
      return;
    }

    let amountNeeded = amount;
    const medicationBatches = batches
      .filter(b => b.medicationId === medicationId && b.currentQuantity > 0)
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    if (medicationBatches.length === 0) {
      toast.error("No stock available!");
      return;
    }

    const updatedBatches = [...batches];

    for (let batch of medicationBatches) {
      if (amountNeeded <= 0) break;

      const batchIndex = updatedBatches.findIndex(b => b.id === batch.id);
      if (batchIndex === -1) continue;

      const takeAmount = Math.min(updatedBatches[batchIndex].currentQuantity, amountNeeded);

      updatedBatches[batchIndex] = {
        ...updatedBatches[batchIndex],
        currentQuantity: updatedBatches[batchIndex].currentQuantity - takeAmount
      };

      amountNeeded -= takeAmount;
    }

    setBatches(updatedBatches);
    toast.success('Medication consumed.');
  };

  const deleteMedication = (id) => {
    setMedications(prev => prev.filter(m => m.id !== id));
    setBatches(prev => prev.filter(b => b.medicationId !== id));
    deleteImageFromDb(id).catch(console.error);
    toast.info('Medication record deleted.');
  };


  const editMedication = (id, updates) => {
    setMedications(prev => prev.map(m =>
      m.id === id ? { ...m, ...updates } : m
    ));
    toast.success('Medication updated');
  };

  const linkMedications = (primaryId, secondaryId) => {
    const primary = medications.find(m => m.id === primaryId);
    if (!primary) return;

    // Set secondary's groupId to primary's groupId
    editMedication(secondaryId, { groupId: primary.groupId || primary.id });
    toast.success('Medications grouped successfully');
  };

  const updateMedicationImage = async (id, file) => {
    try {
      await saveImage(id, file);
      // Trigger update by editing a timestamp or similar if needed, or just let UI fetch.
      // We'll update a 'lastUpdated' field to force re-render if components are listening.
      // Or just simple state update.
      setMedications(prev => prev.map(m => m.id === id ? { ...m, imageUpdated: Date.now() } : m));
      toast.success('Image saved');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save image');
    }
  };

  const getMedicationImage = async (id) => {
    try {
      return await getImage(id);
    } catch (e) {
      console.error("Error fetching image", e);
      return null;
    }
  };


  const getStats = () => {
    // Calculate global stats
    const expiringSoon = batches.filter(b => {
      const daysUntil = (new Date(b.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
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

  const calculateRunoutDate = (totalQuantity, usageRate, usageFrequency, lowThreshold = 0) => {
    if (!usageRate || Number(usageRate) <= 0) return null;

    let dailyRate = Number(usageRate);
    if (usageFrequency === 'weekly') dailyRate = dailyRate / 7;
    if (usageFrequency === 'monthly') dailyRate = dailyRate / 30; // Approx

    if (dailyRate === 0) return null;

    // Date Empty
    const daysUntilEmpty = totalQuantity / dailyRate;
    const dateEmpty = new Date();
    dateEmpty.setDate(dateEmpty.getDate() + daysUntilEmpty);

    // Date Low (when quanity hits threshold)
    let daysUntilLow = null;
    let dateLow = null;
    if (totalQuantity > lowThreshold) {
      daysUntilLow = (totalQuantity - lowThreshold) / dailyRate;
      dateLow = new Date();
      dateLow.setDate(dateLow.getDate() + daysUntilLow);
    }

    return {
      dateEmpty,
      daysUntilEmpty,
      dateLow,
      daysUntilLow
    };
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
      updateMedicationImage,
      getMedicationImage

    }}>
      {children}
    </InventoryContext.Provider>
  );
};
