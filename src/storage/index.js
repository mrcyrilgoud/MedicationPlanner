import { idbAdapter } from './idbAdapter';
import { localStorageAdapter } from './localStorageAdapter';

// Configuration: Change this to explore different backends
// could be 'idb' or 'local'
const CURRENT_ADAPTER_TYPE = 'idb';

const adapter = CURRENT_ADAPTER_TYPE === 'idb' ? idbAdapter : localStorageAdapter;

export const storage = {
    type: CURRENT_ADAPTER_TYPE,

    async getMedications() {
        return adapter.getMedications();
    },

    async saveMedication(med) { // upsert
        return adapter.saveMedication(med);
    },

    async deleteMedication(id) {
        return adapter.deleteMedication(id);
    },

    async getBatches() {
        return adapter.getBatches();
    },

    async saveBatch(batch) { // upsert
        return adapter.saveBatch(batch);
    },

    async saveBatches(batches) { // array upsert
        if (adapter.saveBatches) return adapter.saveBatches(batches);
        // Fallback
        return Promise.all(batches.map(b => adapter.saveBatch(b)));
    },

    async deleteBatch(id) {
        return adapter.deleteBatch(id);
    },

    // --- History ---
    async addHistoryEntry(entry) {
        if (adapter.addHistoryEntry) return adapter.addHistoryEntry(entry);
    },

    async getHistory(pagination) {
        if (adapter.getHistory) return adapter.getHistory(pagination);
        return [];
    },

    async getHistoryCount() {
        if (adapter.getHistoryCount) return adapter.getHistoryCount();
        return 0;
    },

    async deleteHistoryEntry(id) {
        if (adapter.deleteHistoryEntry) return adapter.deleteHistoryEntry(id);
    },

    async updateHistoryEntry(id, data) {
        if (adapter.updateHistoryEntry) return adapter.updateHistoryEntry(id, data);
    },

    // Migration / Debug
    async clear() {
        if (adapter.clearAll) return adapter.clearAll();
    }
};
