import { isValidExpiryDate } from './expiryDate';

/**
 * Calculates the date when stock will run out based on usage rate.
 *
 * @param {number} totalQuantity - Current total quantity of medication
 * @param {number|string} usageRate - Amount used per frequency period
 * @param {string} usageFrequency - 'daily', 'weekly', or 'monthly'
 * @param {number} lowThreshold - Quantity at which to trigger low stock warning
 * @returns {object|null} - Object containing runout dates or null if invalid inputs
 */
export const calculateRunoutDate = (totalQuantity, usageRate, usageFrequency, lowThreshold = 0) => {
    const dailyRate = getDailyUsageQuantity(usageRate, usageFrequency);
    if (!dailyRate || Number(dailyRate) <= 0) return null;

    const daysUntilEmpty = totalQuantity / dailyRate;
    const dateEmpty = new Date();
    dateEmpty.setDate(dateEmpty.getDate() + daysUntilEmpty);

    let daysUntilLow = null;
    let dateLow = null;
    if (totalQuantity > lowThreshold) {
        daysUntilLow = (totalQuantity - lowThreshold) / dailyRate;
        dateLow = new Date();
        dateLow.setDate(dateLow.getDate() + daysUntilLow);
    }

    return {
        dateEmpty,
        daysUntilEmpty,
        dateLow,
        daysUntilLow
    };
};

export const getPuffsPerCanister = (medicationOrPuffs) => {
    if (typeof medicationOrPuffs === 'object' && medicationOrPuffs !== null) {
        return Number(medicationOrPuffs.puffsPerCanister) || 200;
    }
    return Number(medicationOrPuffs) || 200;
};

export const isInhalerUnit = (unitOrMedication) => {
    if (typeof unitOrMedication === 'string') {
        return unitOrMedication === 'inhaler';
    }
    return unitOrMedication?.defaultUnit === 'inhaler';
};

export const convertInhalerCanistersToPuffs = (canisterCount, puffsPerCanister = 200) => (
    Number(canisterCount) * getPuffsPerCanister(puffsPerCanister)
);

export const convertInhalerUsageInputToStored = ({
    usageRate,
    usageBasis,
    puffsPerCanister,
    isInhaler
}) => {
    if (!usageRate) return null;
    if (!isInhaler) return Number(usageRate);
    return usageBasis === 'container'
        ? convertInhalerCanistersToPuffs(usageRate, puffsPerCanister)
        : Number(usageRate);
};

export const convertInhalerDisplayToStored = (displayAmount, medication) => {
    const parsed = Number(displayAmount);
    if (Number.isNaN(parsed)) return 0;
    if (!isInhalerUnit(medication)) {
        return Math.max(0, parsed);
    }
    return Math.max(0, Math.round(parsed * getPuffsPerCanister(medication)));
};

export const convertStoredToInhalerDisplay = (storedQuantity, medication) => {
    if (!isInhalerUnit(medication)) {
        const normalized = Number(storedQuantity || 0);
        if (Number.isInteger(normalized)) return normalized;
        return Number(normalized.toFixed(2));
    }
    return Math.max(0, Math.ceil(Number(storedQuantity) / getPuffsPerCanister(medication)));
};

export const getBatchExpirySortTime = (expiryDate) => (
    isValidExpiryDate(expiryDate)
        ? new Date(`${expiryDate}T00:00:00`).getTime()
        : new Date('9999-12-31').getTime()
);

export const sortBatchesByExpiry = (batches) => (
    [...batches].sort((a, b) => getBatchExpirySortTime(a.expiryDate) - getBatchExpirySortTime(b.expiryDate))
);

export const getInhalerUsageDisplay = (medication) => {
    const usageRate = Number(medication?.usageRate);
    if (!usageRate || !isInhalerUnit(medication)) {
        return {
            usageRate: medication?.usageRate || '',
            usageBasis: 'base'
        };
    }

    const puffsPerCanister = getPuffsPerCanister(medication);

    if (medication.usageBasis === 'container') {
        return {
            usageRate: usageRate / puffsPerCanister,
            usageBasis: 'container'
        };
    }

    return {
        usageRate,
        usageBasis: 'base'
    };
};

export const getDailyUsageQuantity = (usageRate, usageFrequency) => {
    if (!usageRate || Number(usageRate) <= 0) return null;

    let dailyRate = Number(usageRate);
    if (usageFrequency === 'weekly') dailyRate /= 7;
    if (usageFrequency === 'monthly') dailyRate /= 30;

    return dailyRate > 0 ? dailyRate : null;
};

export const getDailyUsageQuantityForMedication = (medication) => (
    getDailyUsageQuantity(medication?.usageRate, medication?.usageFrequency)
);

export const getLowStockThresholdQuantity = (medication) => {
    const threshold = Number(medication?.lowStockThreshold || 0);
    if (isInhalerUnit(medication)) {
        return threshold * getPuffsPerCanister(medication);
    }
    return threshold;
};
