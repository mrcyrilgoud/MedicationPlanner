const DATA_VERSION_KEY = 'med_inventory_data_version';

export const getInventoryDataVersion = () => {
    if (typeof window === 'undefined') return 0;
    return Number(localStorage.getItem(DATA_VERSION_KEY) || 0);
};

export const bumpInventoryDataVersion = () => {
    if (typeof window === 'undefined') return 0;
    const next = getInventoryDataVersion() + 1;
    localStorage.setItem(DATA_VERSION_KEY, String(next));
    return next;
};

export const subscribeInventoryDataVersion = (callback) => {
    if (typeof window === 'undefined') {
        return () => {};
    }

    const handleStorage = (event) => {
        if (event.key !== DATA_VERSION_KEY) return;
        callback(Number(event.newValue || 0));
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
};
