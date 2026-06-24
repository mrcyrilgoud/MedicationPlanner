import { openDB } from 'idb';
import { normalizeStorageError } from './storageErrors';

const DB_NAME = 'MedInventoryDB';
const DB_VERSION = 4;
const MUTATION_STORES = ['medications', 'batches', 'history'];
const ALL_STORES = [...MUTATION_STORES, 'images'];

const dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
        if (!db.objectStoreNames.contains('medications')) {
            const medStore = db.createObjectStore('medications', { keyPath: 'id' });
            medStore.createIndex('groupId', 'groupId', { unique: false });
        }

        if (!db.objectStoreNames.contains('batches')) {
            const batchStore = db.createObjectStore('batches', { keyPath: 'id' });
            batchStore.createIndex('medicationId', 'medicationId', { unique: false });
            batchStore.createIndex('expiryDate', 'expiryDate', { unique: false });
        }

        // Legacy store kept for schema compatibility; photos are stored inline on medications.
        if (!db.objectStoreNames.contains('images')) {
            db.createObjectStore('images', { keyPath: 'id' });
        }

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
    async getMedications() {
        return (await dbPromise).getAll('medications');
    },

    async getHistoryCount() {
        return (await dbPromise).count('history');
    },

    async getAllHistory() {
        return (await dbPromise).getAll('history');
    },

    async getBatches() {
        return (await dbPromise).getAll('batches');
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

            if (mutation.replaceAll) {
                const {
                    medications = [],
                    batches = [],
                    history = []
                } = mutation.replaceAll;

                await Promise.all([
                    medicationStore.clear(),
                    batchStore.clear(),
                    historyStore.clear()
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
                ...(mutation.batchesToPut || []).map((batch) => batchStore.put(batch)),
                ...(mutation.batchIdsToDelete || []).map((id) => batchStore.delete(id)),
                ...(mutation.historyToPut || []).map((entry) => historyStore.put(entry)),
                ...(mutation.historyIdsToDelete || []).map((id) => historyStore.delete(id))
            ]);

            for (const medicationId of mutation.medicationIdsToDelete || []) {
                const batchIndex = batchStore.index('medicationId');
                let batchCursor = await batchIndex.openCursor(IDBKeyRange.only(medicationId));
                while (batchCursor) {
                    await batchCursor.delete();
                    batchCursor = await batchCursor.continue();
                }
                await medicationStore.delete(medicationId);
            }

            await tx.done;
        });
    },

    async clearAll() {
        return runMutation(async () => {
            const db = await dbPromise;
            await Promise.all(ALL_STORES.map((storeName) => db.clear(storeName)));
        });
    }
};
