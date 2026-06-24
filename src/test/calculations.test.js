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
});
