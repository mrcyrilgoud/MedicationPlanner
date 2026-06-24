import { describe, expect, it } from 'vitest';
import { getExpiryDateError, isValidExpiryDate } from '../utils/expiryDate.js';

describe('expiryDate', () => {
    it('accepts valid ISO dates', () => {
        expect(isValidExpiryDate('2027-06-01')).toBe(true);
        expect(getExpiryDateError('2027-06-01')).toBeNull();
    });

    it('rejects invalid calendar dates', () => {
        expect(isValidExpiryDate('2027-02-30')).toBe(false);
        expect(getExpiryDateError('2027-02-30')).toMatch(/valid expiration date/i);
    });

    it('requires a value', () => {
        expect(getExpiryDateError('')).toMatch(/required/i);
    });
});
