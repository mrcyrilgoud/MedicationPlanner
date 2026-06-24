const EXPIRY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isValidExpiryDate = (value) => {
    if (!EXPIRY_DATE_PATTERN.test(value || '')) return false;

    const [year, month, day] = value.split('-').map((part) => Number(part));
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
};

export const getExpiryDateError = (value) => {
    if (!value?.trim()) {
        return 'Expiration date is required.';
    }

    if (!isValidExpiryDate(value)) {
        return 'Enter a valid expiration date.';
    }

    return null;
};
