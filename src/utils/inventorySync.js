export const INVENTORY_SYNC_CHANNEL = 'med-inventory-sync';

const TAB_ID = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `tab-${Date.now()}`;

export const broadcastInventorySync = ({ dataVersion } = {}) => {
    if (typeof window === 'undefined') return;
    if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel(INVENTORY_SYNC_CHANNEL);
        channel.postMessage({
            type: 'inventory-updated',
            tabId: TAB_ID,
            dataVersion,
            at: Date.now()
        });
        channel.close();
    }
};

export const subscribeInventorySync = ({ onRemoteUpdate, onVisibilityRefresh }) => {
    if (typeof window === 'undefined') {
        return () => {};
    }

    let channel = null;
    if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel(INVENTORY_SYNC_CHANNEL);
        channel.onmessage = (event) => {
            if (event?.data?.tabId === TAB_ID) return;
            onRemoteUpdate?.(event.data);
        };
    }

    const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
            onVisibilityRefresh?.();
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
