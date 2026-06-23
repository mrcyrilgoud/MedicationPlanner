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

    // Date Empty
    const daysUntilEmpty = totalQuantity / dailyRate;
    const dateEmpty = new Date();
    dateEmpty.setDate(dateEmpty.getDate() + daysUntilEmpty);

    // Date Low (when quanity hits threshold)
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

export const getInhalerUsageDisplay = (medication) => {
    const usageRate = Number(medication?.usageRate);
    if (!usageRate || medication?.defaultUnit !== 'inhaler') {
        return {
            usageRate: medication?.usageRate || '',
            usageBasis: 'base'
        };
    }

    const puffsPerCanister = Number(medication.puffsPerCanister) || 200;
    if (usageRate >= puffsPerCanister && usageRate % puffsPerCanister === 0) {
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
    if (medication?.defaultUnit === 'inhaler') {
        return threshold * (Number(medication?.puffsPerCanister) || 200);
    }
    return threshold;
};
