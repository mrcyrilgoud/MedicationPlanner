import { describe, expect, it } from 'vitest';
import {
    getDailyUsageQuantity,
    getInhalerUsageDisplay,
    getLowStockThresholdQuantity
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

    it('displays whole-canister inhaler usage when divisible', () => {
        expect(getInhalerUsageDisplay({
            defaultUnit: 'inhaler',
            usageRate: 400,
            puffsPerCanister: 200
        })).toEqual({
            usageRate: 2,
            usageBasis: 'container'
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
});
