import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useToast } from './ToastContext';
import { storage } from '../storage';
import { calculateRunoutDate, getLowStockThresholdQuantity } from '../utils/calculations';
import { applyStoredPreferences, getStoredPreferences } from '../utils/preferences';

const InventoryContext = createContext();
const HISTORY_SCHEMA_VERSION = 2;
const EXPIRY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const cloneEntity = (entity) => {
  if (!entity) return entity;
  if (typeof structuredClone === 'function') {
    return structuredClone(entity);
  }
  return JSON.parse(JSON.stringify(entity));
};

const cloneList = (items = []) => items.map((item) => cloneEntity(item));

const normalizeSnapshot = (snapshot = {}) => ({
  medications: cloneList(snapshot.medications || []),
  batches: cloneList(snapshot.batches || [])
});

const createHistoryEntry = ({
  actionType,
  medicationId = null,
  medicationName = '',
  batchDeltas = [],
  beforeSnapshot = {},
  afterSnapshot = {},
  metadata = {},
  note = '',
  revertible = true
}) => ({
  id: crypto.randomUUID(),
  schemaVersion: HISTORY_SCHEMA_VERSION,
  actionType,
  medicationId,
  medicationName,
  batchDeltas: cloneList(batchDeltas),
  beforeSnapshot: normalizeSnapshot(beforeSnapshot),
  afterSnapshot: normalizeSnapshot(afterSnapshot),
  metadata: cloneEntity(metadata) || {},
  note,
  revertible,
  timestamp: new Date().toISOString()
});

const validateExpiryDate = (value) => {
  if (!EXPIRY_DATE_PATTERN.test(value || '')) return false;
  const [year, month, day] = value.split('-').map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const summarizeName = (value = '') => value.trim().toLowerCase();

// eslint-disable-next-line react-refresh/only-export-components
export const useInventory = () => useContext(InventoryContext);

export const InventoryProvider = ({ children }) => {
  const [medications, setMedications] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const refreshInventoryState = useCallback(async () => {
    const [loadedMeds, loadedBatches] = await Promise.all([
      storage.getMedications(),
      storage.getBatches()
    ]);
    setMedications(loadedMeds || []);
    setBatches(loadedBatches || []);
    return {
      medications: loadedMeds || [],
      batches: loadedBatches || []
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        let loadedMeds = await storage.getMedications();
        let loadedBatches = await storage.getBatches();

        if (storage.type === 'idb' && loadedMeds.length === 0 && loadedBatches.length === 0) {
          const legacyKey = 'med_inventory_v1';
          const legacyData = localStorage.getItem(legacyKey);
          if (legacyData) {
            const parsed = JSON.parse(legacyData);
            const meds = parsed.meds || [];
            const legacyBatches = parsed.batches || [];
            const legacyHistory = parsed.history || [];
            await storage.applyMutation({
              replaceAll: {
                medications: meds,
                batches: legacyBatches,
                history: legacyHistory
              }
            });
            loadedMeds = meds;
            loadedBatches = legacyBatches;
            toast.success('Database migrated to new system!');
          }
        }

        setMedications(loadedMeds || []);
        setBatches(loadedBatches || []);
      } catch (error) {
        console.error('Failed to load inventory', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast]);

  const medicationMap = useMemo(() => {
    const map = new Map();
    medications.forEach((medication) => {
      map.set(medication.id, medication);
    });
    return map;
  }, [medications]);

  const activeMedications = useMemo(
    () => medications.filter((medication) => !medication.archivedAt),
    [medications]
  );

  const archivedMedications = useMemo(
    () => medications.filter((medication) => Boolean(medication.archivedAt)),
    [medications]
  );

  const batchStatsByMedication = useMemo(() => {
    const stats = {};

    medications.forEach((medication) => {
      stats[medication.id] = {
        totalQty: 0,
        nextExpiry: null,
        medBatches: [],
        locations: new Set()
      };
    });

    batches.forEach((batch) => {
      const entry = stats[batch.medicationId];
      if (!entry) return;

      entry.medBatches.push(batch);
      entry.totalQty += Number(batch.currentQuantity || 0);
      if (batch.location) {
        entry.locations.add(batch.location);
      }

      if (Number(batch.currentQuantity) <= 0 || !validateExpiryDate(batch.expiryDate)) {
        return;
      }

      const expiry = new Date(`${batch.expiryDate}T00:00:00`);
      if (!entry.nextExpiry || expiry < entry.nextExpiry) {
        entry.nextExpiry = expiry;
      }
    });

    Object.values(stats).forEach((entry) => {
      entry.medBatches.sort((a, b) => {
        const dateA = validateExpiryDate(a.expiryDate) ? new Date(`${a.expiryDate}T00:00:00`) : new Date('9999-12-31');
        const dateB = validateExpiryDate(b.expiryDate) ? new Date(`${b.expiryDate}T00:00:00`) : new Date('9999-12-31');
        return dateA - dateB;
      });
      entry.locations = Array.from(entry.locations);
    });

    return stats;
  }, [batches, medications]);

  const stats = useMemo(() => {
    let expiringSoonCount = 0;
    let lowStockCount = 0;
    let projectedEmptyCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    activeMedications.forEach((medication) => {
      const medStats = batchStatsByMedication[medication.id] || { totalQty: 0, nextExpiry: null };

      if (medStats.nextExpiry) {
        const daysUntilExpiry = (medStats.nextExpiry - today) / (1000 * 60 * 60 * 24);
        if (daysUntilExpiry < 30) {
          expiringSoonCount += 1;
        }
      }

      const lowThreshold = getLowStockThresholdQuantity(medication);
      if (medStats.totalQty <= lowThreshold) {
        lowStockCount += 1;
      }

      const runout = calculateRunoutDate(
        medStats.totalQty,
        medication.usageRate,
        medication.usageFrequency,
        lowThreshold
      );

      if (runout && runout.daysUntilEmpty < 7) {
        projectedEmptyCount += 1;
      }
    });

    return {
      expiringSoonCount,
      lowStockCount,
      projectedEmptyCount
    };
  }, [activeMedications, batchStatsByMedication]);

  const dashboardQueues = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ranked = activeMedications.map((medication) => {
      const medStats = batchStatsByMedication[medication.id] || { totalQty: 0, nextExpiry: null, medBatches: [] };
      const runout = calculateRunoutDate(
        medStats.totalQty,
        medication.usageRate,
        medication.usageFrequency,
        getLowStockThresholdQuantity(medication)
      );
      const nextExpiryDays = medStats.nextExpiry
        ? (medStats.nextExpiry - today) / (1000 * 60 * 60 * 24)
        : null;
      const lowStock = medStats.totalQty <= getLowStockThresholdQuantity(medication);
      const expiringSoon = typeof nextExpiryDays === 'number' && nextExpiryDays < 30;
      const refillSoon = Boolean(runout && runout.daysUntilEmpty < 14);

      const urgencyScore = [
        lowStock ? 40 : 0,
        expiringSoon ? 30 - Math.max(nextExpiryDays || 0, 0) : 0,
        refillSoon ? 20 - Math.max(runout?.daysUntilEmpty || 0, 0) : 0
      ].reduce((sum, value) => sum + value, 0);

      return {
        medication,
        medStats,
        runout,
        lowStock,
        expiringSoon,
        refillSoon,
        nextExpiryDays,
        urgencyScore
      };
    }).sort((a, b) => b.urgencyScore - a.urgencyScore || a.medication.name.localeCompare(b.medication.name));

    return {
      attention: ranked.filter((item) => item.lowStock || item.expiringSoon || item.refillSoon).slice(0, 5),
      expiring: ranked.filter((item) => item.expiringSoon).slice(0, 5),
      refill: ranked.filter((item) => item.refillSoon || item.lowStock).slice(0, 5)
    };
  }, [activeMedications, batchStatsByMedication]);

  const validateDataHealth = useCallback(async (source = null) => {
    const currentMedications = source?.medications || medications;
    const currentBatches = source?.batches || batches;
    const currentHistory = source?.history || await storage.getAllHistory();

    const medicationIds = new Set(currentMedications.map((medication) => medication.id));
    const duplicateNameCounts = currentMedications.reduce((map, medication) => {
      const key = summarizeName(medication.name);
      if (!key) return map;
      map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map());

    const orphanedBatches = currentBatches.filter((batch) => !medicationIds.has(batch.medicationId));
    const invalidExpiryBatches = currentBatches.filter((batch) => !validateExpiryDate(batch.expiryDate));
    const missingUsageMedications = currentMedications.filter((medication) => !medication.archivedAt && !Number(medication.usageRate));
    const duplicateMedicationNames = currentMedications.filter((medication) => duplicateNameCounts.get(summarizeName(medication.name)) > 1);
    const archivedCount = currentMedications.filter((medication) => medication.archivedAt).length;

    return {
      orphanedBatches,
      invalidExpiryBatches,
      missingUsageMedications,
      duplicateMedicationNames,
      archivedCount,
      historyCount: currentHistory.length
    };
  }, [batches, medications]);

  const analyzeBackup = useCallback(async (backup, mode = 'merge') => {
    if (!backup || !Array.isArray(backup.medications) || !Array.isArray(backup.batches)) {
      throw new Error('Invalid backup format');
    }

    const incomingHistory = Array.isArray(backup.history) ? backup.history : [];
    const health = await validateDataHealth({
      medications: backup.medications,
      batches: backup.batches,
      history: incomingHistory
    });

    const currentNameMap = new Map();
    medications.forEach((medication) => {
      currentNameMap.set(summarizeName(medication.name), medication);
    });

    const keptMedicationIds = new Set();
    const skippedMedications = [];
    const medicationsToImport = [];

    backup.medications.forEach((medication) => {
      const normalizedName = summarizeName(medication.name);
      const duplicateByName = normalizedName && currentNameMap.has(normalizedName) && currentNameMap.get(normalizedName).id !== medication.id;

      if (mode === 'merge' && duplicateByName) {
        skippedMedications.push({
          id: medication.id,
          name: medication.name,
          reason: 'duplicate-name'
        });
        return;
      }

      medicationsToImport.push(cloneEntity(medication));
      keptMedicationIds.add(medication.id);
    });

    const batchesToImport = [];
    const skippedBatches = [];

    backup.batches.forEach((batch) => {
      if (!keptMedicationIds.has(batch.medicationId)) {
        skippedBatches.push({
          id: batch.id,
          reason: 'orphaned-medication'
        });
        return;
      }
      if (!validateExpiryDate(batch.expiryDate)) {
        skippedBatches.push({
          id: batch.id,
          reason: 'invalid-expiry'
        });
        return;
      }
      batchesToImport.push(cloneEntity(batch));
    });

    const skippedHistoryEntries = [];
    const shouldDeduplicateHistory = mode === 'merge' || mode === 'preview-only';
    const existingHistoryIds = shouldDeduplicateHistory
      ? new Set((await storage.getAllHistory()).map((entry) => entry.id))
      : new Set();
    const historyToImport = incomingHistory.filter((entry) => {
      if (entry.medicationId && !keptMedicationIds.has(entry.medicationId)) {
        return false;
      }
      if (!entry.id) {
        skippedHistoryEntries.push({ id: null, reason: 'missing-id' });
        return false;
      }
      if (shouldDeduplicateHistory && existingHistoryIds.has(entry.id)) {
        skippedHistoryEntries.push({ id: entry.id, reason: 'duplicate-history-id' });
        return false;
      }
      return true;
    });

    const summary = {
      medicationsToCreate: mode === 'replace' ? medicationsToImport.length : medicationsToImport.filter((medication) => !medicationMap.has(medication.id)).length,
      medicationsToUpdate: mode === 'merge' ? medicationsToImport.filter((medication) => medicationMap.has(medication.id)).length : 0,
      batchesToImport: batchesToImport.length,
      historyToImport: historyToImport.length,
      skippedMedications: skippedMedications.length,
      skippedBatches: skippedBatches.length,
      skippedHistory: skippedHistoryEntries.length
    };

    return {
      mode,
      summary,
      issues: {
        orphanedBatches: health.orphanedBatches,
        invalidExpiryBatches: health.invalidExpiryBatches,
        duplicateMedicationNames: skippedMedications,
        skippedBatches,
        skippedHistoryEntries
      },
      sanitizedBackup: {
        schemaVersion: backup.schemaVersion || HISTORY_SCHEMA_VERSION,
        exportedAt: backup.exportedAt || new Date().toISOString(),
        medications: medicationsToImport,
        batches: batchesToImport,
        history: historyToImport,
        preferences: cloneEntity(backup.preferences) || {}
      }
    };
  }, [medicationMap, medications, validateDataHealth]);

  const getBackupData = useCallback(async () => {
    const [allMedications, allBatches, allHistory] = await Promise.all([
      storage.getMedications(),
      storage.getBatches(),
      storage.getAllHistory()
    ]);

    return {
      schemaVersion: HISTORY_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      medications: cloneList(allMedications),
      batches: cloneList(allBatches),
      history: cloneList(allHistory),
      preferences: getStoredPreferences()
    };
  }, []);

  const applyMutationAndRefresh = useCallback(async (mutation) => {
    await storage.applyMutation(mutation);
    await refreshInventoryState();
  }, [refreshInventoryState]);

  const createMedicationWithBatch = useCallback(async ({ medication, batch, note = '' }) => {
    const name = medication?.name?.trim();
    if (!name) {
      throw new Error('Medication name is required');
    }
    if (!batch?.expiryDate || !validateExpiryDate(batch.expiryDate)) {
      throw new Error('A valid expiration date is required');
    }
    if (Number(batch.initialQuantity) <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    const duplicate = activeMedications.find((item) => summarizeName(item.name) === summarizeName(name));
    if (duplicate) {
      throw new Error(`${name} already exists. Use the restock flow instead.`);
    }

    const medicationId = crypto.randomUUID();
    const newMedication = {
      ...cloneEntity(medication),
      id: medicationId,
      groupId: medication.groupId || medicationId,
      archivedAt: null
    };

    const newBatch = {
      ...cloneEntity(batch),
      id: crypto.randomUUID(),
      medicationId,
      initialQuantity: Number(batch.initialQuantity),
      currentQuantity: Number(batch.initialQuantity),
      dateAdded: new Date().toISOString()
    };

    const historyEntry = createHistoryEntry({
      actionType: 'create_medication',
      medicationId,
      medicationName: newMedication.name,
      note,
      beforeSnapshot: {},
      afterSnapshot: { medications: [newMedication], batches: [newBatch] },
      batchDeltas: [{
        batchId: newBatch.id,
        quantityDelta: Number(newBatch.currentQuantity),
        beforeQuantity: 0,
        afterQuantity: Number(newBatch.currentQuantity),
        expiryDate: newBatch.expiryDate,
        location: newBatch.location
      }]
    });

    await applyMutationAndRefresh({
      medicationsToPut: [newMedication],
      batchesToPut: [newBatch],
      historyToPut: [historyEntry]
    });

    return { medication: newMedication, batch: newBatch };
  }, [activeMedications, applyMutationAndRefresh]);

  const addBatchToMedication = useCallback(async ({ medicationId, batch, note = '' }) => {
    const medication = medicationMap.get(medicationId);
    if (!medication || medication.archivedAt) {
      throw new Error('Medication was not found');
    }
    if (!batch?.expiryDate || !validateExpiryDate(batch.expiryDate)) {
      throw new Error('A valid expiration date is required');
    }
    if (Number(batch.initialQuantity) <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    const newBatch = {
      ...cloneEntity(batch),
      id: crypto.randomUUID(),
      medicationId,
      initialQuantity: Number(batch.initialQuantity),
      currentQuantity: Number(batch.initialQuantity),
      dateAdded: new Date().toISOString()
    };

    const historyEntry = createHistoryEntry({
      actionType: 'add_stock',
      medicationId,
      medicationName: medication.name,
      note,
      beforeSnapshot: {},
      afterSnapshot: { batches: [newBatch] },
      batchDeltas: [{
        batchId: newBatch.id,
        quantityDelta: Number(newBatch.currentQuantity),
        beforeQuantity: 0,
        afterQuantity: Number(newBatch.currentQuantity),
        expiryDate: newBatch.expiryDate,
        location: newBatch.location
      }]
    });

    await applyMutationAndRefresh({
      batchesToPut: [newBatch],
      historyToPut: [historyEntry]
    });

    return { batch: newBatch, medication };
  }, [applyMutationAndRefresh, medicationMap]);

  const editMedication = useCallback(async (id, updates, note = '') => {
    const medication = medicationMap.get(id);
    if (!medication) {
      throw new Error('Medication was not found');
    }

    const updatedMedication = {
      ...cloneEntity(medication),
      ...cloneEntity(updates)
    };

    const historyEntry = createHistoryEntry({
      actionType: 'edit_medication',
      medicationId: id,
      medicationName: updatedMedication.name,
      note,
      beforeSnapshot: { medications: [medication] },
      afterSnapshot: { medications: [updatedMedication] },
      batchDeltas: []
    });

    await applyMutationAndRefresh({
      medicationsToPut: [updatedMedication],
      historyToPut: [historyEntry]
    });

    return updatedMedication;
  }, [applyMutationAndRefresh, medicationMap]);

  const updateBatch = useCallback(async (batchId, updates, note = '') => {
    const batch = batches.find((item) => item.id === batchId);
    if (!batch) {
      throw new Error('Batch was not found');
    }

    const updatedBatch = {
      ...cloneEntity(batch),
      ...cloneEntity(updates)
    };

    if (!validateExpiryDate(updatedBatch.expiryDate)) {
      throw new Error('A valid expiration date is required');
    }
    if (Number(updatedBatch.currentQuantity) < 0) {
      throw new Error('Quantity cannot be negative');
    }

    const medication = medicationMap.get(batch.medicationId);
    const historyEntry = createHistoryEntry({
      actionType: 'edit_batch',
      medicationId: batch.medicationId,
      medicationName: medication?.name || 'Medication',
      note,
      beforeSnapshot: { batches: [batch] },
      afterSnapshot: { batches: [updatedBatch] },
      batchDeltas: [{
        batchId: batch.id,
        quantityDelta: Number(updatedBatch.currentQuantity) - Number(batch.currentQuantity),
        beforeQuantity: Number(batch.currentQuantity),
        afterQuantity: Number(updatedBatch.currentQuantity),
        expiryDate: updatedBatch.expiryDate,
        location: updatedBatch.location
      }]
    });

    await applyMutationAndRefresh({
      batchesToPut: [updatedBatch],
      historyToPut: [historyEntry]
    });

    return updatedBatch;
  }, [applyMutationAndRefresh, batches, medicationMap]);

  const discardBatch = useCallback(async (batchId, note = 'Discarded batch') => {
    const batch = batches.find((item) => item.id === batchId);
    if (!batch) {
      throw new Error('Batch was not found');
    }

    const medication = medicationMap.get(batch.medicationId);
    const historyEntry = createHistoryEntry({
      actionType: 'discard_batch',
      medicationId: batch.medicationId,
      medicationName: medication?.name || 'Medication',
      note,
      beforeSnapshot: { batches: [batch] },
      afterSnapshot: {},
      batchDeltas: [{
        batchId: batch.id,
        quantityDelta: -Number(batch.currentQuantity),
        beforeQuantity: Number(batch.currentQuantity),
        afterQuantity: 0,
        expiryDate: batch.expiryDate,
        location: batch.location
      }]
    });

    await applyMutationAndRefresh({
      batchIdsToDelete: [batch.id],
      historyToPut: [historyEntry]
    });
  }, [applyMutationAndRefresh, batches, medicationMap]);

  const consumeMedication = useCallback(async (medicationId, amount, note = '') => {
    if (Number(amount) <= 0) {
      throw new Error('Please enter a valid amount');
    }

    const medication = medicationMap.get(medicationId);
    if (!medication || medication.archivedAt) {
      throw new Error('Medication was not found');
    }

    const totalAvailable = batchStatsByMedication[medicationId]?.totalQty || 0;
    if (Number(amount) > totalAvailable) {
      throw new Error(`Not enough stock. Available: ${totalAvailable}`);
    }

    let amountNeeded = Number(amount);
    const eligibleBatches = (batchStatsByMedication[medicationId]?.medBatches || [])
      .filter((batch) => Number(batch.currentQuantity) > 0)
      .sort((a, b) => {
        const dateA = validateExpiryDate(a.expiryDate) ? new Date(`${a.expiryDate}T00:00:00`) : new Date('9999-12-31');
        const dateB = validateExpiryDate(b.expiryDate) ? new Date(`${b.expiryDate}T00:00:00`) : new Date('9999-12-31');
        return dateA - dateB;
      });

    const beforeBatches = [];
    const afterBatches = [];
    const batchDeltas = [];

    eligibleBatches.forEach((batch) => {
      if (amountNeeded <= 0) return;
      const takeAmount = Math.min(Number(batch.currentQuantity), amountNeeded);
      if (takeAmount <= 0) return;
      const updatedBatch = {
        ...cloneEntity(batch),
        currentQuantity: Number(batch.currentQuantity) - takeAmount
      };

      beforeBatches.push(cloneEntity(batch));
      afterBatches.push(updatedBatch);
      batchDeltas.push({
        batchId: batch.id,
        quantityDelta: -takeAmount,
        beforeQuantity: Number(batch.currentQuantity),
        afterQuantity: Number(updatedBatch.currentQuantity),
        expiryDate: batch.expiryDate,
        location: batch.location
      });
      amountNeeded -= takeAmount;
    });

    const historyEntry = createHistoryEntry({
      actionType: 'consume',
      medicationId,
      medicationName: medication.name,
      note,
      beforeSnapshot: { batches: beforeBatches },
      afterSnapshot: { batches: afterBatches },
      batchDeltas,
      metadata: { amount: Number(amount) }
    });

    await applyMutationAndRefresh({
      batchesToPut: afterBatches,
      historyToPut: [historyEntry]
    });
  }, [applyMutationAndRefresh, batchStatsByMedication, medicationMap]);

  const archiveMedication = useCallback(async (id, note = '') => {
    const medication = medicationMap.get(id);
    if (!medication || medication.archivedAt) {
      throw new Error('Medication was not found');
    }

    const archivedMedication = {
      ...cloneEntity(medication),
      archivedAt: new Date().toISOString()
    };

    const historyEntry = createHistoryEntry({
      actionType: 'archive',
      medicationId: id,
      medicationName: medication.name,
      note,
      beforeSnapshot: { medications: [medication] },
      afterSnapshot: { medications: [archivedMedication] }
    });

    await applyMutationAndRefresh({
      medicationsToPut: [archivedMedication],
      historyToPut: [historyEntry]
    });
  }, [applyMutationAndRefresh, medicationMap]);

  const restoreMedication = useCallback(async (id, note = '') => {
    const medication = medicationMap.get(id);
    if (!medication || !medication.archivedAt) {
      throw new Error('Medication was not found');
    }

    const normalizedName = summarizeName(medication.name);
    if (normalizedName) {
      const duplicate = activeMedications.find(
        (item) => item.id !== id && summarizeName(item.name) === normalizedName
      );
      if (duplicate) {
        throw new Error(`${medication.name} already exists. Archive or rename the active entry first.`);
      }
    }

    const restoredMedication = {
      ...cloneEntity(medication),
      archivedAt: null
    };

    const historyEntry = createHistoryEntry({
      actionType: 'restore',
      medicationId: id,
      medicationName: medication.name,
      note,
      beforeSnapshot: { medications: [medication] },
      afterSnapshot: { medications: [restoredMedication] }
    });

    await applyMutationAndRefresh({
      medicationsToPut: [restoredMedication],
      historyToPut: [historyEntry]
    });
  }, [activeMedications, applyMutationAndRefresh, medicationMap]);

  const permanentlyDeleteMedication = useCallback(async (id, note = '') => {
    const medication = medicationMap.get(id);
    if (!medication) {
      throw new Error('Medication was not found');
    }

    const relatedBatches = batches.filter((batch) => batch.medicationId === id);
    const historyEntry = createHistoryEntry({
      actionType: 'delete_permanently',
      medicationId: id,
      medicationName: medication.name,
      note,
      beforeSnapshot: { medications: [medication], batches: relatedBatches },
      afterSnapshot: {},
      revertible: false,
      batchDeltas: relatedBatches.map((batch) => ({
        batchId: batch.id,
        quantityDelta: -Number(batch.currentQuantity),
        beforeQuantity: Number(batch.currentQuantity),
        afterQuantity: 0,
        expiryDate: batch.expiryDate,
        location: batch.location
      }))
    });

    await applyMutationAndRefresh({
      medicationIdsToDelete: [id],
      batchIdsToDelete: relatedBatches.map((batch) => batch.id),
      historyToPut: [historyEntry]
    });
  }, [applyMutationAndRefresh, batches, medicationMap]);

  const linkMedications = useCallback(async (primaryId, secondaryId) => {
    const primary = medicationMap.get(primaryId);
    if (!primary) {
      throw new Error('Primary medication was not found');
    }
    await editMedication(secondaryId, { groupId: primary.groupId || primary.id }, `Grouped with ${primary.name}`);
  }, [editMedication, medicationMap]);

  const getHistoryLog = useCallback(async (pagination) => storage.getHistory(pagination), []);

  const getHistoryTotalCount = useCallback(async () => storage.getHistoryCount(), []);

  const updateHistoryEntry = useCallback(async (id, updates) => {
    const note = updates.note || '';
    await storage.updateHistoryEntry(id, {
      note,
      data: { note }
    });
  }, []);

  const revertHistoryAction = useCallback(async (item) => {
    if (!item?.revertible || item?.revertedAt) {
      throw new Error('This entry can no longer be reverted');
    }

    const allHistory = await storage.getAllHistory();
    const newerMutation = allHistory.find((entry) => (
      entry.medicationId === item.medicationId &&
      entry.id !== item.id &&
      entry.actionType !== 'revert' &&
      new Date(entry.timestamp) > new Date(item.timestamp) &&
      !entry.revertedAt
    ));

    if (newerMutation) {
      throw new Error('Revert the newest change for this medication first');
    }

    const beforeSnapshot = normalizeSnapshot(item.beforeSnapshot);
    const afterSnapshot = normalizeSnapshot(item.afterSnapshot);
    const beforeMedicationIds = new Set(beforeSnapshot.medications.map((medication) => medication.id));
    const beforeBatchIds = new Set(beforeSnapshot.batches.map((batch) => batch.id));

    const updatedEntry = {
      ...cloneEntity(item),
      revertible: false,
      revertedAt: new Date().toISOString()
    };

    const revertEntry = createHistoryEntry({
      actionType: 'revert',
      medicationId: item.medicationId,
      medicationName: item.medicationName,
      note: `Reverted ${item.actionType}`,
      revertible: false,
      beforeSnapshot: afterSnapshot,
      afterSnapshot: beforeSnapshot,
      metadata: {
        revertedEntryId: item.id,
        revertedActionType: item.actionType
      }
    });
    updatedEntry.revertedByEntryId = revertEntry.id;

    await applyMutationAndRefresh({
      medicationsToPut: beforeSnapshot.medications,
      medicationIdsToDelete: afterSnapshot.medications
        .filter((medication) => !beforeMedicationIds.has(medication.id))
        .map((medication) => medication.id),
      batchesToPut: beforeSnapshot.batches,
      batchIdsToDelete: afterSnapshot.batches
        .filter((batch) => !beforeBatchIds.has(batch.id))
        .map((batch) => batch.id),
      historyToPut: [updatedEntry, revertEntry]
    });
  }, [applyMutationAndRefresh]);

  const importData = useCallback(async ({ backup, mode = 'merge' }) => {
    const analysis = await analyzeBackup(backup, mode);
    if (mode === 'preview-only') {
      return analysis;
    }

    if (mode === 'replace') {
      await storage.applyMutation({
        replaceAll: {
          medications: analysis.sanitizedBackup.medications,
          batches: analysis.sanitizedBackup.batches,
          history: analysis.sanitizedBackup.history
        }
      });
      applyStoredPreferences(analysis.sanitizedBackup.preferences);
      await refreshInventoryState();
      return analysis;
    }

    const existingHistoryIds = new Set((await storage.getAllHistory()).map((entry) => entry.id));
    const historyToPut = analysis.sanitizedBackup.history.filter(
      (entry) => entry?.id && !existingHistoryIds.has(entry.id)
    );

    await storage.applyMutation({
      medicationsToPut: analysis.sanitizedBackup.medications,
      batchesToPut: analysis.sanitizedBackup.batches,
      historyToPut
    });
    applyStoredPreferences(analysis.sanitizedBackup.preferences);
    await refreshInventoryState();
    return analysis;
  }, [analyzeBackup, refreshInventoryState]);

  const getStats = useCallback(() => stats, [stats]);
  const getDashboardQueues = useCallback(() => dashboardQueues, [dashboardQueues]);

  const value = useMemo(() => ({
    medications,
    activeMedications,
    archivedMedications,
    batches,
    batchStatsByMedication,
    loading,
    createMedicationWithBatch,
    addBatchToMedication,
    consumeMedication,
    editMedication,
    updateBatch,
    discardBatch,
    archiveMedication,
    restoreMedication,
    permanentlyDeleteMedication,
    getStats,
    getDashboardQueues,
    calculateRunoutDate,
    linkMedications,
    getHistoryLog,
    getHistoryTotalCount,
    updateHistoryEntry,
    revertHistoryAction,
    getBackupData,
    analyzeBackup,
    importData,
    validateDataHealth
  }), [
    medications,
    activeMedications,
    archivedMedications,
    batches,
    batchStatsByMedication,
    loading,
    createMedicationWithBatch,
    addBatchToMedication,
    consumeMedication,
    editMedication,
    updateBatch,
    discardBatch,
    archiveMedication,
    restoreMedication,
    permanentlyDeleteMedication,
    getStats,
    getDashboardQueues,
    linkMedications,
    getHistoryLog,
    getHistoryTotalCount,
    updateHistoryEntry,
    revertHistoryAction,
    getBackupData,
    analyzeBackup,
    importData,
    validateDataHealth
  ]);

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};
