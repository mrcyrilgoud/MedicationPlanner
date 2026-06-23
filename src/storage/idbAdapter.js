import { openDB } from 'idb';
import { normalizeStorageError } from './storageErrors';

const DB_NAME = 'MedInventoryDB';
const DB_VERSION = 4;
const MUTATION_STORES = ['medications', 'batches', 'history', 'images'];

const dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
        // Store for medications
        if (!db.objectStoreNames.contains('medications')) {
            const medStore = db.createObjectStore('medications', { keyPath: 'id' });
            medStore.createIndex('groupId', 'groupId', { unique: false });
        }

        // Store for batches
        if (!db.objectStoreNames.contains('batches')) {
            const batchStore = db.createObjectStore('batches', { keyPath: 'id' });
            batchStore.createIndex('medicationId', 'medicationId', { unique: false });
            batchStore.createIndex('expiryDate', 'expiryDate', { unique: false });
        }

        // Legacy store kept for schema compatibility; photos are stored inline on medications.
        if (!db.objectStoreNames.contains('images')) {
            db.createObjectStore('images', { keyPath: 'id' });
        }

        // Store for history logs
        if (!db.objectStoreNames.contains('history')) {
            const historyStore = db.createObjectStore('history', { keyPath: 'id' });
            historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
    },
});

const runMutation = async (callback) => {
    try {
        return await callback();
    } catch (error) {
        throw normalizeStorageError(error);
    }
};

export const idbAdapter = {
    // --- Medications ---
    async getMedications() {
        return (await dbPromise).getAll('medications');
    },

    async saveMedication(med) {
        return runMutation(async () => {
            const db = await dbPromise;
            await db.put('medications', med);
        });
    },

    async deleteMedication(id) {
        return runMutation(async () => {
            const db = await dbPromise;
            const tx = db.transaction(['medications', 'batches'], 'readwrite');
            await tx.objectStore('medications').delete(id);

            const index = tx.objectStore('batches').index('medicationId');
            let cursor = await index.openCursor(IDBKeyRange.only(id));
            while (cursor) {
                await cursor.delete();
                cursor = await cursor.continue();
            }

            await tx.done;
        });
    },

    async getHistoryCount() {
        return (await dbPromise).count('history');
    },

    async getAllHistory() {
        return (await dbPromise).getAll('history');
    },

    // --- Batches ---
    async getBatches() {
        return (await dbPromise).getAll('batches');
    },

    async saveBatch(batch) {
        return runMutation(async () => {
            await (await dbPromise).put('batches', batch);
        });
    },

    async saveBatches(batches) {
        return runMutation(async () => {
            const tx = (await dbPromise).transaction('batches', 'readwrite');
            await Promise.all(batches.map((batch) => tx.store.put(batch)));
            await tx.done;
        });
    },

    async deleteBatch(id) {
        return runMutation(async () => {
            await (await dbPromise).delete('batches', id);
        });
    },

    // --- History ---
    async addHistoryEntry(entry) {
        return runMutation(async () => {
            await (await dbPromise).put('history', entry);
        });
    },

    async getHistory({ limit = 50, offset = 0 } = {}) {
        const db = await dbPromise;
        const tx = db.transaction('history', 'readonly');
        const index = tx.store.index('timestamp');

        const entries = [];
        let cursor = await index.openCursor(null, 'prev');

        if (offset > 0 && cursor) {
            await cursor.advance(offset);
        }

        while (cursor && entries.length < limit) {
            entries.push(cursor.value);
            cursor = await cursor.continue();
        }

        return entries;
    },

    async deleteHistoryEntry(id) {
        return runMutation(async () => {
            await (await dbPromise).delete('history', id);
        });
    },

    async updateHistoryEntry(id, updates) {
        return runMutation(async () => {
            const db = await dbPromise;
            const tx = db.transaction('history', 'readwrite');
            const entry = await tx.store.get(id);
            if (entry) {
                const updated = { ...entry, ...updates };
                if (updates.data) {
                    updated.data = { ...entry.data, ...updates.data };
                }
                await tx.store.put(updated);
            }
            await tx.done;
        });
    },

    async applyMutation(mutation) {
        return runMutation(async () => {
            const db = await dbPromise;
            const tx = db.transaction(MUTATION_STORES, 'readwrite');
            const medicationStore = tx.objectStore('medications');
            const batchStore = tx.objectStore('batches');
            const historyStore = tx.objectStore('history');
            const imageStore = tx.objectStore('images');

            if (mutation.replaceAll) {
                const {
                    medications = [],
                    batches = [],
                    history = []
                } = mutation.replaceAll;

                await Promise.all([
                    medicationStore.clear(),
                    batchStore.clear(),
                    historyStore.clear(),
                    imageStore.clear()
                ]);

                await Promise.all([
                    ...medications.map((medication) => medicationStore.put(medication)),
                    ...batches.map((batch) => batchStore.put(batch)),
                    ...history.map((entry) => historyStore.put(entry))
                ]);
                await tx.done;
                return;
            }

            await Promise.all([
                ...(mutation.medicationsToPut || []).map((medication) => medicationStore.put(medication)),
                ...(mutation.medicationIdsToDelete || []).map((id) => medicationStore.delete(id)),
                ...(mutation.batchesToPut || []).map((batch) => batchStore.put(batch)),
                ...(mutation.batchIdsToDelete || []).map((id) => batchStore.delete(id)),
                ...(mutation.historyToPut || []).map((entry) => historyStore.put(entry)),
                ...(mutation.historyIdsToDelete || []).map((id) => historyStore.delete(id))
            ]);

            await tx.done;
        });
    },

    // --- Migration Helper ---
    async clearAll() {
        return runMutation(async () => {
            const db = await dbPromise;
            await Promise.all(MUTATION_STORES.map((storeName) => db.clear(storeName)));
        });
    }
};
