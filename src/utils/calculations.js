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
    if (!usageRate || Number(usageRate) <= 0) return null;

    let dailyRate = Number(usageRate);
    if (usageFrequency === 'weekly') dailyRate = dailyRate / 7;
    if (usageFrequency === 'monthly') dailyRate = dailyRate / 30; // Approx

    if (dailyRate === 0) return null;

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
