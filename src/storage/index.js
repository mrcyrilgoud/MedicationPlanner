import { idbAdapter } from './idbAdapter';

export const storage = {
    async getMedications() {
        return idbAdapter.getMedications();
    },

    async getBatches() {
        return idbAdapter.getBatches();
    },

    async getHistory(pagination) {
        return idbAdapter.getHistory(pagination);
    },

    async getHistoryCount() {
        return idbAdapter.getHistoryCount();
    },

    async getAllHistory() {
        return idbAdapter.getAllHistory();
    },

    async updateHistoryEntry(id, data) {
        return idbAdapter.updateHistoryEntry(id, data);
    },

    async applyMutation(mutation) {
        return idbAdapter.applyMutation(mutation);
    },

    async clear() {
        return idbAdapter.clearAll();
    }
};
