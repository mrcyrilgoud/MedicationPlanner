const APP_THEME_KEY = 'app_theme';
const DEVICE_MODE_OVERRIDE_KEY = 'device_mode_override';
const LAST_LOCATION_KEY = 'last_batch_location';
export const PREFERENCES_UPDATED_EVENT = 'preferences:updated';

export const getStoredTheme = () => {
    if (typeof window === 'undefined') return 'dark';
    return localStorage.getItem(APP_THEME_KEY) || 'dark';
};

export const setStoredTheme = (theme) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(APP_THEME_KEY, theme);
};

export const getDeviceModeOverride = () => {
    if (typeof window === 'undefined') return 'auto';
    return localStorage.getItem(DEVICE_MODE_OVERRIDE_KEY) || 'auto';
};

export const setDeviceModeOverride = (value) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DEVICE_MODE_OVERRIDE_KEY, value);
};

export const getLastBatchLocation = () => {
    if (typeof window === 'undefined') return 'Cabinet';
    return localStorage.getItem(LAST_LOCATION_KEY) || 'Cabinet';
};

export const setLastBatchLocation = (location) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LAST_LOCATION_KEY, location || 'Cabinet');
};

export const getStoredPreferences = () => ({
    theme: getStoredTheme(),
    deviceModeOverride: getDeviceModeOverride(),
    lastBatchLocation: getLastBatchLocation()
});

const notifyPreferencesUpdated = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(PREFERENCES_UPDATED_EVENT, {
        detail: getStoredPreferences()
    }));
};

export const applyStoredPreferences = (preferences = {}) => {
    if (preferences.theme) {
        setStoredTheme(preferences.theme);
    }
    if (preferences.deviceModeOverride) {
        setDeviceModeOverride(preferences.deviceModeOverride);
    }
    if (preferences.lastBatchLocation) {
        setLastBatchLocation(preferences.lastBatchLocation);
    }
    notifyPreferencesUpdated();
};
