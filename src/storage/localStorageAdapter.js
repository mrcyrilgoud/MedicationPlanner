const STORAGE_KEY = 'med_inventory_v1';

export const localStorageAdapter = {
    async getMedications() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        const parsed = JSON.parse(data);
        return parsed.meds || [];
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

        const batches = await this.getBatches();
        this._persist(all, batches);
    },

    async deleteMedication(id) {
        let all = await this.getMedications();
        all = all.filter(m => m.id !== id);

        let batches = await this.getBatches();
        batches = batches.filter(b => b.medicationId !== id);

        this._persist(all, batches);
    },

    async getBatches() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        return JSON.parse(data).batches || [];
    },

    async saveBatch(batch) {
        const batches = await this.getBatches();
        const index = batches.findIndex(b => b.id === batch.id);
        if (index >= 0) batches[index] = batch;
        else batches.push(batch);

        const meds = await this.getMedications();
        this._persist(meds, batches);
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
        const meds = await this.getMedications();
        this._persist(meds, current);
    },

    async deleteBatch(id) {
        let batches = await this.getBatches();
        batches = batches.filter(b => b.id !== id);
        const meds = await this.getMedications();
        this._persist(meds, batches);
    },

    async clearAll() {
        localStorage.removeItem(STORAGE_KEY);
    },

    _persist(meds, batches) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ meds, batches }));
    }
};
