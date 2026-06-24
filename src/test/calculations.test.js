import { describe, expect, it } from 'vitest';
import {
    convertInhalerCanistersToPuffs,
    convertInhalerDisplayToStored,
    convertInhalerUsageInputToStored,
    convertStoredToInhalerDisplay,
    getDailyUsageQuantity,
    getInhalerUsageDisplay,
    getLowStockThresholdQuantity,
    sortBatchesByExpiry
} from '../utils/calculations.js';

describe('calculations', () => {
    it('converts weekly usage to a daily rate', () => {
        expect(getDailyUsageQuantity(14, 'weekly')).toBe(2);
    });

    it('scales inhaler low-stock thresholds by puffs per canister', () => {
        expect(getLowStockThresholdQuantity({
            defaultUnit: 'inhaler',
            lowStockThreshold: 2,
            puffsPerCanister: 200
        })).toBe(400);
    });

    it('uses stored usageBasis instead of guessing from divisibility', () => {
        expect(getInhalerUsageDisplay({
            defaultUnit: 'inhaler',
            usageRate: 400,
            puffsPerCanister: 200,
            usageBasis: 'container'
        })).toEqual({
            usageRate: 2,
            usageBasis: 'container'
        });

        expect(getInhalerUsageDisplay({
            defaultUnit: 'inhaler',
            usageRate: 400,
            puffsPerCanister: 200,
            usageBasis: 'base'
        })).toEqual({
            usageRate: 400,
            usageBasis: 'base'
        });
    });

    it('defaults legacy inhaler records without usageBasis to puffs', () => {
        expect(getInhalerUsageDisplay({
            defaultUnit: 'inhaler',
            usageRate: 400,
            puffsPerCanister: 200
        })).toEqual({
            usageRate: 400,
            usageBasis: 'base'
        });
    });

    it('keeps partial puff usage in base units', () => {
        expect(getInhalerUsageDisplay({
            defaultUnit: 'inhaler',
            usageRate: 2,
            puffsPerCanister: 200
        })).toEqual({
            usageRate: 2,
            usageBasis: 'base'
        });
    });

    it('converts inhaler canisters to stored puffs', () => {
        expect(convertInhalerCanistersToPuffs(2, 200)).toBe(400);
    });

    it('converts inhaler usage input to stored values', () => {
        expect(convertInhalerUsageInputToStored({
            usageRate: 2,
            usageBasis: 'container',
            puffsPerCanister: 200,
            isInhaler: true
        })).toBe(400);
    });

    it('sorts batches by expiry date', () => {
        expect(sortBatchesByExpiry([
            { id: 'b', expiryDate: '2027-01-01' },
            { id: 'a', expiryDate: '2026-06-01' }
        ])).toEqual([
            { id: 'a', expiryDate: '2026-06-01' },
            { id: 'b', expiryDate: '2027-01-01' }
        ]);
    });

    it('converts between stored puffs and display canisters', () => {
        const medication = { defaultUnit: 'inhaler', puffsPerCanister: 200 };
        expect(convertStoredToInhalerDisplay(401, medication)).toBe(3);
        expect(convertInhalerDisplayToStored(3, medication)).toBe(600);
    });
});
