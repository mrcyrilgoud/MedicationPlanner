import { describe, expect, it } from 'vitest';
import { buildRoute, parseRoute } from '../utils/routeState.js';

describe('routeState', () => {
    it('parses routes without a leading slash', () => {
        expect(parseRoute('#inventory?filter=low')).toEqual({
            view: 'inventory',
            params: { filter: 'low' }
        });
    });

    it('parses routes with a leading slash', () => {
        expect(parseRoute('#/add?mode=create')).toEqual({
            view: 'add',
            params: { mode: 'create' }
        });
    });

    it('builds hash routes without a leading slash', () => {
        expect(buildRoute('settings')).toBe('#settings');
        expect(buildRoute('inventory', { filter: 'all', medicationId: 'abc' }))
            .toBe('#inventory?filter=all&medicationId=abc');
    });
});
