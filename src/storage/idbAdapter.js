import { openDB } from 'idb';

const DB_NAME = 'MedInventoryDB';
const DB_VERSION = 1;

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

        // Store for images (separate store to keep meds light if needed, though usually fine inline if careful. 
        // But separating them allows lazy loading images)
        // Actually, for simplicity in this V1 migration, let's keep images inside the medication object 
        // BUT since we want to avoid 5MB limit, IDB handles large objects fine. 
        // However, if we LIST medications, we don't want to load 100MB of images. 
        // So let's create a separate object store for images.
        if (!db.objectStoreNames.contains('images')) {
            db.createObjectStore('images', { keyPath: 'id' }); // id can be custom generated or link to medId
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

    // --- Migration Helper ---
    async clearAll() {
        const db = await dbPromise;
        await db.clear('medications');
        await db.clear('batches');
    }
};
