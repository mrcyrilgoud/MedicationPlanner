import { describe, expect, it } from 'vitest';
import { isQuotaExceededError, normalizeStorageError } from '../storage/storageErrors.js';

describe('storageErrors', () => {
    it('detects QuotaExceededError by name', () => {
        expect(isQuotaExceededError({ name: 'QuotaExceededError' })).toBe(true);
    });

    it('detects quota errors by legacy code 22', () => {
        expect(isQuotaExceededError({ code: 22 })).toBe(true);
    });

    it('returns a friendly message for quota errors', () => {
        const error = normalizeStorageError({ name: 'QuotaExceededError' });
        expect(error.message).toMatch(/storage is full/i);
    });

    it('preserves existing Error instances', () => {
        const original = new Error('Batch was not found');
        expect(normalizeStorageError(original)).toBe(original);
    });
});
