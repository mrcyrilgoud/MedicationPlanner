export const isQuotaExceededError = (error) => {
    if (!error) return false;
    if (error.name === 'QuotaExceededError') return true;
    if (error.code === 22) return true;
    if (typeof error.message === 'string' && /quota/i.test(error.message)) return true;
    return false;
};

export const normalizeStorageError = (error) => {
    if (isQuotaExceededError(error)) {
        return new Error(
            'Storage is full. Remove medication photos, export a backup, or delete unused records before saving again.'
        );
    }

    if (error instanceof Error) {
        return error;
    }

    return new Error('Failed to save data. Please try again.');
};
