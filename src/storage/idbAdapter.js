import { openDB } from 'idb';

const DB_NAME = 'MedInventoryDB';
const DB_VERSION = 4;

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

        // Store for images
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

export const idbAdapter = {
    // --- Medications ---
    async getMedications() {
        return (await dbPromise).getAll('medications');
    },

    async saveMedication(med) {
        const db = await dbPromise;
        // Store inline for compatibility and simplicity.
        await db.put('medications', med);
    },

    async deleteMedication(id) {
        const db = await dbPromise;
        await db.delete('medications', id);
        // clean up batches
        const tx = db.transaction('batches', 'readwrite');
        const index = tx.store.index('medicationId');
        let cursor = await index.openCursor(IDBKeyRange.only(id));
        while (cursor) {
            await cursor.delete();
            cursor = await cursor.continue();
        }
        await tx.done;
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
        return (await dbPromise).put('batches', batch);
    },

    async saveBatches(batches) {
        const tx = (await dbPromise).transaction('batches', 'readwrite');
        await Promise.all(batches.map(b => tx.store.put(b)));
        await tx.done;
    },

    async deleteBatch(id) {
        return (await dbPromise).delete('batches', id);
    },

    // --- History ---
    async addHistoryEntry(entry) {
        return (await dbPromise).put('history', entry);
    },

    async getHistory({ limit = 50, offset = 0 } = {}) {
        const db = await dbPromise;
        const tx = db.transaction('history', 'readonly');
        const index = tx.store.index('timestamp');

        // We want newest first, so we iterate backwards (prev).
        // Since we want pagination, we can advance the cursor by 'offset'
        // and then take 'limit' items.

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
        return (await dbPromise).delete('history', id);
    },

    async updateHistoryEntry(id, updates) {
        const db = await dbPromise;
        const tx = db.transaction('history', 'readwrite');
        const entry = await tx.store.get(id);
        if (entry) {
            // Merging generic data and 'data' object
            const updated = { ...entry, ...updates };
            // Deep merge 'data' if present in updates
            if (updates.data) {
                updated.data = { ...entry.data, ...updates.data };
            }
            await tx.store.put(updated);
        }
        await tx.done;
    },

    async applyMutation(mutation) {
        const db = await dbPromise;
        const tx = db.transaction(['medications', 'batches', 'history'], 'readwrite');
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
            ...(mutation.medicationIdsToDelete || []).map((id) => medicationStore.delete(id)),
            ...(mutation.batchesToPut || []).map((batch) => batchStore.put(batch)),
            ...(mutation.batchIdsToDelete || []).map((id) => batchStore.delete(id)),
            ...(mutation.historyToPut || []).map((entry) => historyStore.put(entry)),
            ...(mutation.historyIdsToDelete || []).map((id) => historyStore.delete(id))
        ]);

        await tx.done;
    },

    // --- Migration Helper ---
    async clearAll() {
        const db = await dbPromise;
        await db.clear('medications');
        await db.clear('batches');
        await db.clear('history');
    }
};
