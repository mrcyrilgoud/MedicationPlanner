import { normalizeStorageError } from './storageErrors';

const STORAGE_KEY = 'med_inventory_v1';

const readState = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
        return { meds: [], batches: [], history: [] };
    }

    const parsed = JSON.parse(data);
    return {
        meds: parsed.meds || [],
        batches: parsed.batches || [],
        history: parsed.history || []
    };
};

export const localStorageAdapter = {
    async getMedications() {
        return readState().meds;
    },

    async saveMedication(med) {
        // LocalStorage "save" usually implies saving the whole state in the React app context.
        // But for this adapter, we might need to read-modify-write if called individually.
        // PRO TIP: The Context usually holds state and just calls 'save' to persist EVERYTHING.
        // But the new API is granular (saveMedication).
        // So we must read, update, write.
        const all = await this.getMedications();
        const index = all.findIndex(m => m.id === med.id);
        if (index >= 0) {
            all[index] = med;
        } else {
            all.push(med);
        }

        const state = readState();
        this._persist(all, state.batches, state.history);
    },

    async deleteMedication(id) {
        let all = await this.getMedications();
        all = all.filter(m => m.id !== id);

        let batches = await this.getBatches();
        batches = batches.filter(b => b.medicationId !== id);

        const state = readState();
        this._persist(all, batches, state.history);
    },

    async getBatches() {
        return readState().batches;
    },

    async saveBatch(batch) {
        const batches = await this.getBatches();
        const index = batches.findIndex(b => b.id === batch.id);
        if (index >= 0) batches[index] = batch;
        else batches.push(batch);

        const state = readState();
        this._persist(state.meds, batches, state.history);
    },

    async saveBatches(newBatches) {
        // Merges or replaces? 
        // Context logic: setBatches(updatedBatches) -> save
        // So this receives the FULL list? 
        // No, the IDB adapter 'saveBatch' takes ONE. 
        // 'saveBatches' helper takes ARRAY.

        // Let's assume input is array of batches to UPSERT.
        const current = await this.getBatches();
        for (let b of newBatches) {
            const idx = current.findIndex(cur => cur.id === b.id);
            if (idx >= 0) current[idx] = b;
            else current.push(b);
        }
        const state = readState();
        this._persist(state.meds, current, state.history);
    },

    async deleteBatch(id) {
        let batches = await this.getBatches();
        batches = batches.filter(b => b.id !== id);
        const state = readState();
        this._persist(state.meds, batches, state.history);
    },

    async clearAll() {
        localStorage.removeItem(STORAGE_KEY);
    },

    async addHistoryEntry(entry) {
        const state = readState();
        state.history.push(entry);
        this._persist(state.meds, state.batches, state.history);
    },

    async getHistory({ limit = 50, offset = 0 } = {}) {
        const state = readState();
        return [...state.history]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(offset, offset + limit);
    },

    async getHistoryCount() {
        return readState().history.length;
    },

    async getAllHistory() {
        return readState().history;
    },

    async deleteHistoryEntry(id) {
        const state = readState();
        state.history = state.history.filter((entry) => entry.id !== id);
        this._persist(state.meds, state.batches, state.history);
    },

    async updateHistoryEntry(id, updates) {
        const state = readState();
        state.history = state.history.map((entry) => {
            if (entry.id !== id) return entry;
            const updated = { ...entry, ...updates };
            if (updates.data) {
                updated.data = { ...entry.data, ...updates.data };
            }
            return updated;
        });
        this._persist(state.meds, state.batches, state.history);
    },

    async applyMutation(mutation) {
        if (mutation.replaceAll) {
            const {
                medications = [],
                batches = [],
                history = []
            } = mutation.replaceAll;
            this._persist(medications, batches, history);
            return;
        }

        const state = readState();

        for (const medication of mutation.medicationsToPut || []) {
            const index = state.meds.findIndex((item) => item.id === medication.id);
            if (index >= 0) {
                state.meds[index] = medication;
            } else {
                state.meds.push(medication);
            }
        }

        if (mutation.medicationIdsToDelete?.length) {
            state.meds = state.meds.filter((item) => !mutation.medicationIdsToDelete.includes(item.id));
        }

        for (const batch of mutation.batchesToPut || []) {
            const index = state.batches.findIndex((item) => item.id === batch.id);
            if (index >= 0) {
                state.batches[index] = batch;
            } else {
                state.batches.push(batch);
            }
        }

        if (mutation.batchIdsToDelete?.length) {
            state.batches = state.batches.filter((item) => !mutation.batchIdsToDelete.includes(item.id));
        }

        for (const entry of mutation.historyToPut || []) {
            const index = state.history.findIndex((item) => item.id === entry.id);
            if (index >= 0) {
                state.history[index] = entry;
            } else {
                state.history.push(entry);
            }
        }

        if (mutation.historyIdsToDelete?.length) {
            state.history = state.history.filter((item) => !mutation.historyIdsToDelete.includes(item.id));
        }

        this._persist(state.meds, state.batches, state.history);
    },

    _persist(meds, batches, history = []) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ meds, batches, history }));
        } catch (error) {
            throw normalizeStorageError(error);
        }
    }
};
