import { describe, expect, it } from 'vitest';
import { filterBackupMedications } from '../utils/backupAnalysis.js';

const current = [
    { id: 'med-1', name: 'Ibuprofen' },
    { id: 'med-2', name: 'Aspirin' }
];

describe('filterBackupMedications', () => {
    it('skips merge imports when backup IDs collide with different local names', () => {
        const backup = [
            { id: 'med-1', name: 'Advil' },
            { id: 'med-3', name: 'Vitamin D' }
        ];

        const result = filterBackupMedications(backup, { currentMedications: current, mode: 'merge' });

        expect(result.medicationsToImport).toHaveLength(1);
        expect(result.medicationsToImport[0].name).toBe('Vitamin D');
        expect(result.idCollisions).toEqual([
            { id: 'med-1', name: 'Advil', reason: 'id-collision' }
        ]);
    });

    it('skips duplicate names in merge mode', () => {
        const backup = [{ id: 'med-9', name: 'aspirin' }];
        const result = filterBackupMedications(backup, { currentMedications: current, mode: 'merge' });

        expect(result.medicationsToImport).toHaveLength(0);
        expect(result.duplicateNameSkips).toEqual([
            { id: 'med-9', name: 'aspirin', reason: 'duplicate-name' }
        ]);
    });

    it('allows same-id updates when names match', () => {
        const backup = [{ id: 'med-1', name: 'Ibuprofen' }];
        const result = filterBackupMedications(backup, { currentMedications: current, mode: 'merge' });

        expect(result.medicationsToImport).toHaveLength(1);
        expect(result.skippedMedications).toHaveLength(0);
    });

    it('imports all medications in replace mode even when names overlap', () => {
        const backup = [
            { id: 'med-1', name: 'Advil' },
            { id: 'med-9', name: 'Aspirin' }
        ];
        const result = filterBackupMedications(backup, { currentMedications: current, mode: 'replace' });

        expect(result.medicationsToImport).toHaveLength(2);
        expect(result.skippedMedications).toHaveLength(0);
    });
});
