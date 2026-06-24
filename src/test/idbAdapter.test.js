import { beforeEach, describe, expect, it } from 'vitest';
import { idbAdapter } from '../storage/idbAdapter.js';

describe('idbAdapter applyMutation', () => {
    beforeEach(async () => {
        await idbAdapter.clearAll();
    });

    it('cascades batch deletion when a medication is deleted', async () => {
        await idbAdapter.applyMutation({
            medicationsToPut: [{ id: 'med-1', name: 'Ibuprofen' }],
            batchesToPut: [{
                id: 'batch-1',
                medicationId: 'med-1',
                currentQuantity: 10,
                initialQuantity: 10,
                expiryDate: '2027-01-01'
            }]
        });

        await idbAdapter.applyMutation({
            medicationIdsToDelete: ['med-1']
        });

        expect(await idbAdapter.getMedications()).toEqual([]);
        expect(await idbAdapter.getBatches()).toEqual([]);
    });

    it('clears all stores on replaceAll', async () => {
        await idbAdapter.applyMutation({
            medicationsToPut: [{ id: 'med-1', name: 'Ibuprofen' }],
            batchesToPut: [{
                id: 'batch-1',
                medicationId: 'med-1',
                currentQuantity: 5,
                initialQuantity: 5,
                expiryDate: '2027-01-01'
            }],
            historyToPut: [{ id: 'hist-1', actionType: 'create_medication', timestamp: '2026-01-01T00:00:00.000Z' }]
        });

        await idbAdapter.applyMutation({
            replaceAll: {
                medications: [{ id: 'med-2', name: 'Aspirin' }],
                batches: [],
                history: []
            }
        });

        expect(await idbAdapter.getMedications()).toEqual([{ id: 'med-2', name: 'Aspirin' }]);
        expect(await idbAdapter.getBatches()).toEqual([]);
        expect(await idbAdapter.getHistoryCount()).toBe(0);
    });
});
