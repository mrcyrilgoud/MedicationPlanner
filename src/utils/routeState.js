const DEFAULT_VIEW = 'dashboard';

export const parseRoute = (hash) => {
    const normalized = (hash || '').replace(/^#/, '');
    const [path = DEFAULT_VIEW, query = ''] = normalized.split('?');
    const view = path || DEFAULT_VIEW;
    const searchParams = new URLSearchParams(query);
    const params = {};

    for (const [key, value] of searchParams.entries()) {
        params[key] = value;
    }

    return { view, params };
};

export const buildRoute = (view, params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === null || typeof value === 'undefined' || value === '') return;
        searchParams.set(key, String(value));
    });

    const query = searchParams.toString();
    return `#${view}${query ? `?${query}` : ''}`;
};

export const getCurrentRoute = () => {
    if (typeof window === 'undefined') {
        return { view: DEFAULT_VIEW, params: {} };
    }
    return parseRoute(window.location.hash);
};
