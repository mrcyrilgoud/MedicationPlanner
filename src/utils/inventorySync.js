export const INVENTORY_SYNC_CHANNEL = 'med-inventory-sync';

export const broadcastInventorySync = () => {
    if (typeof window === 'undefined') return;
    if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel(INVENTORY_SYNC_CHANNEL);
        channel.postMessage({ type: 'inventory-updated', at: Date.now() });
        channel.close();
    }
};

export const subscribeInventorySync = (callback) => {
    if (typeof window === 'undefined') {
        return () => {};
    }

    let channel = null;
    if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel(INVENTORY_SYNC_CHANNEL);
        channel.onmessage = callback;
    }

    const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
            callback();
        }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
        document.removeEventListener('visibilitychange', handleVisibility);
        if (channel) {
            channel.close();
        }
    };
};
